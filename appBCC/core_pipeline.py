import os
import pandas as pd
import json
import uuid
import re
import calendar
import unicodedata
from sqlalchemy import create_engine, text
from datetime import datetime
from formulas.formula_registry import FormulaRegistry
from agent_mapper import get_mapping_from_ai
from formulas.actro_config import is_sunday_or_holiday, get_ot_multiplier, get_holidays_for_period


def _strip_accents(s: str) -> str:
    """Bỏ dấu tiếng Việt để so sánh không phân biệt dấu."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )

OUTPUT_DIR = "BCC_Output"


def list_visible_sheets(file_path):
    """
    Trả về (visible_sheet_names, hidden_count) của file Excel.
    - visible_sheet_names: list tên các sheet có sheet_state == 'visible'
    - hidden_count: số sheet bị ẩn (hidden hoặc veryHidden)
    Dùng openpyxl; với file .xlsx chuẩn thì đáng tin cậy.
    """
    import openpyxl
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    try:
        visible = []
        hidden = 0
        for name in wb.sheetnames:
            state = wb[name].sheet_state  # 'visible' | 'hidden' | 'veryHidden'
            if state == "visible":
                visible.append(name)
            else:
                hidden += 1
        return visible, hidden
    finally:
        wb.close()


def last_day_in_month(month: int, year: int) -> int:
    return calendar.monthrange(year, month)[1]

def index_to_excel_col(col_idx):
    """Chuyển đổi index 0, 1, 2... thành toạ độ cột Excel A, B, C... AA..."""
    res = ""
    while col_idx >= 0:
        res = chr(col_idx % 26 + 65) + res
        col_idx = col_idx // 26 - 1
    return res

def setup_directories():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

ACTRO_AI_FIELDS_LOCAL = ("ot_kc", "ot_kd", "ot_ke", "ot_kf", "ot_kh", "ot_ki", "ot_kj", "ot_kk", "work_type")


def _normalize_label_loc(label: str) -> str:
    from unicodedata import normalize as _normalize
    return _normalize("NFKD", label).encode("ascii", "ignore").decode("ascii").lower().strip()


def _is_valid_actro_indices(positions: dict, total_columns: int) -> bool:
    if not positions:
        return False
    if not all(field in positions for field in ACTRO_AI_FIELDS_LOCAL):
        return False
    values = list(positions.values())
    if any(not isinstance(idx, int) or idx < 0 or idx >= total_columns for idx in values):
        return False
    if positions["ot_kc"] >= positions["ot_kd"] or positions["ot_kd"] >= positions["ot_kf"]:
        return False
    return positions["work_type"] > positions["ot_kk"]


def _ask_ai_for_actro_positions(df: "pd.DataFrame", header_row_idx: int) -> dict | None:
    """Gửi các hàng liên quan tới DeepSeek để AI gợi ý vị trí cột tổng hợp Actro.

    Trả về dict với khoá là tên field chuẩn, value là chỉ số cột 0-based.
    """
    import os
    import json

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
    except ImportError:
        return None

    rows_slice = []
    for r in range(max(0, header_row_idx - 2), min(len(df), header_row_idx + 6)):
        cells = [
            {
                "col": i + 1,
                "value": ("" if pd.isna(v) else str(v).replace("\n", " ")[:60]),
            }
            for i, v in enumerate(df.iloc[r].tolist())
            if pd.notna(v) and i >= max(0, len(df.columns) - 80)
        ]
        rows_slice.append({"row": r + 1, "cells": cells})

    sample = (
        ["" if pd.isna(v) else str(v) for v in df.iloc[header_row_idx + 3].tolist()[-80:]]
        if header_row_idx + 3 < len(df)
        else []
    )

    prompt = (
        "Bạn là AI phân tích bảng chấm công BCC của nhà máy Actro.\n"
        "Dựa trên các hàng header được cung cấp, hãy trả về JSON duy nhất với các khoá:\n"
        f"{list(ACTRO_AI_FIELDS_LOCAL)}\nMỗi value là chỉ số cột 0-based (đếm từ cột A=0).\n"
        "Khoảng cách offset chuẩn: ot_kc..ot_kk liên tiếp, work_type nằm ngay sau ot_kk.\n"
        "Chỉ trả JSON, không giải thích."
    )

    try:
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com/v1")
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a data mapping assistant. Only output raw JSON."},
                {
                    "role": "user",
                    "content": prompt
                    + "\n\n[HEADER ROWS]\n"
                    + json.dumps(rows_slice, ensure_ascii=False)
                    + "\n\n[SAMPLE DATA]\n"
                    + json.dumps(sample, ensure_ascii=False),
                },
            ],
            temperature=0.0,
            timeout=15.0,
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text)
        result = {}
        for field in ACTRO_AI_FIELDS_LOCAL:
            value = parsed.get(field)
            if isinstance(value, int):
                result[field] = value
        return result or None
    except Exception:
        return None



def preview_file(
    file_path,
    project_name,
    period_month,
    period_year,
    log_callback=print,
    review_callback=None,
    holiday_config=None,
    sheet_name=None,
    calculate_payroll=True,
):
    """
    Xử lý file và trả về danh sách dữ liệu đã chuẩn hóa (dạng dict) để Preview trên UI.

    Parameters
    ----------
    sheet_name : str | None
        Tên sheet muốn parse. Nếu None thì đọc sheet đầu tiên theo pd.read_excel
        mặc định (giữ behavior cũ, backward-compatible).
    """
    setup_directories()

    log_callback(f"[1/3] Đang đọc file: {os.path.basename(file_path)}...")
    try:
        if sheet_name:
            log_callback(f"      Sheet được chọn: '{sheet_name}'")
        # Khi sheet_name=None, pd.read_excel trả về dict {sheet_name: DataFrame}.
        # Ta ép về 1 sheet đầu tiên để giữ behavior cũ (backward-compatible).
        read_result = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        if isinstance(read_result, dict):
            # sheet_name=None → dict; lấy sheet đầu tiên
            first_sheet_name = next(iter(read_result.keys()))
            df = read_result[first_sheet_name]
            log_callback(f"      (Mặc định đọc sheet đầu tiên: '{first_sheet_name}')")
        else:
            df = read_result
        
        # 1. Định vị dòng Header
        header_row_idx = -1
        for idx, row in df.iterrows():
            vals = [str(x).lower() for x in row.values if pd.notna(x)]
            if any("mã thẻ" in v or "mã nhân viên" in v or "mã nv" in v for v in vals):
                header_row_idx = idx
                break
                
        if header_row_idx == -1:
            log_callback("Lỗi: Không tìm thấy dòng Header chứa 'Mã thẻ' hoặc 'Mã nhân viên'")
            return []
            
        row7 = df.iloc[header_row_idx].values
        row8 = df.iloc[header_row_idx + 1].values
        
        # 2. Phân tích cấu trúc cột
        col_map = {} # Tên chuẩn -> Index
        daily_cols = {} # Ngày -> {in: idx, out: idx, ot: idx}
        summary_headers_to_map = {} # index -> "Header 7 - Header 8"
        
        # Cột cố định
        for i, val in enumerate(row7):
            v = str(val).lower() if pd.notna(val) else ""
            if "mã thẻ" in v or "mã nv" in v: col_map["employee_code"] = i
            elif "họ và tên" in v or "họ tên" in v: col_map["full_name"] = i
            elif "ngày vào" in v: col_map["start_date"] = i
            elif "loại" in v and "công việc" in v: col_map["work_type"] = i
            elif "loại" in v: col_map["work_type"] = i
            
        # Tìm cột ngày và Summary
        last_day_col = -1
        for i in range(len(row7)):
            val7 = str(row7[i]).strip() if pd.notna(row7[i]) else ""
            if val7.isdigit() and 1 <= int(val7) <= 31:
                # Day number column = In column (merged cell).
                day_str = f"{int(val7):02d}"
                day_start = i  # ← day number IS the In column (BCC Overtime sheet)
                daily_cols[day_str] = {
                    "in": day_start,                 # In time
                    "out": day_start + 1,            # Out time
                    "ot": day_start + 3,            # OT at 1.5× (ngày thường)
                    "ot_night": day_start + 7,       # OT at 2.0× (đêm)
                    "ot_sun": day_start + 8,        # OT at 2.1× (chủ nhật)
                }
                last_day_col = i + 9
        
        # Lấy các cột summary cuối cùng để gửi AI
        for i in range(last_day_col + 1, len(row7)):
            v7 = str(row7[i]).strip().replace('\n', ' ') if pd.notna(row7[i]) else ""
            v8 = str(row8[i]).strip().replace('\n', ' ') if pd.notna(row8[i]) else ""
            if v7 or v8:
                header_text = f"{v7} - {v8}".strip(" -")
                summary_headers_to_map[i] = header_text
                
        # 3. Ánh xạ AI cho các cột Summary
        log_callback(f"[1/3] Đang phân tích {len(summary_headers_to_map)} cột tổng hợp bằng AI/Từ điển...")
        ai_result = get_mapping_from_ai(list(summary_headers_to_map.values()), review_callback=review_callback)
        ai_result_inv = {v: k for k, v in ai_result.items()}

        for i, header_text in summary_headers_to_map.items():
            mapped_key = ai_result.get(header_text)
            if mapped_key and mapped_key not in col_map:
                # Chỉ ghi đè nếu chưa có (giữ lại cột cố định như Ngày vào, Loại)
                col_map[mapped_key] = i
        
        # ── Actro: nhận diện khối tổng hợp theo cụm header bền vững ───────────
        # Khối tổng hợp BCC Actro có thể dịch vị trí giữa các tháng. Vì vậy neo
        # bằng cụm 4 header đặc trưng (Shift day / Night day / Sunday + "Số giờ
        # làm việc ban ngày"), kèm dự phòng các marker "26-25", "25-25",
        # "24-25", "23-25", "27-26", "26-26". Nếu không tìm được neo, parser
        # dừng và trả về danh sách trống để workflow kiểm chứng lỗi mapping.
        if _strip_accents(project_name) == _strip_accents("Nhà máy Actro - Vĩnh Phúc"):
            def _normalize(value):
                if not pd.notna(value):
                    return ""
                return _strip_accents(str(value).strip()).casefold()

            def _find_marker(start_idx: int = 0):
                candidates = ("26-25", "25-25", "24-25", "23-25", "27-26", "26-26", "26-24")
                for r in range(max(0, header_row_idx - 2), header_row_idx + 3):
                    row = df.iloc[r].tolist() if r < len(df) else []
                    for idx in range(start_idx, len(row)):
                        text = _normalize(row[idx]).replace(" ", "")
                        if text in candidates:
                            return idx, text
                return None, None

            marker_idx, marker_text = _find_marker()

            summary_idx = None
            for r in range(max(0, header_row_idx - 2), header_row_idx + 3):
                row = df.iloc[r].tolist() if r < len(df) else []
                summary_idx = next(
                    (
                        idx
                        for idx, value in enumerate(row)
                        if _normalize(value).startswith("so gio lam viec ban ngay")
                    ),
                    None,
                )
                if summary_idx is not None:
                    break

            shift_idx = night_idx = sunday_idx = None
            for r in range(max(0, header_row_idx - 2), header_row_idx + 3):
                row = df.iloc[r].tolist() if r < len(df) else []
                normalized_row = [
                    (_normalize(value), idx)
                    for idx, value in enumerate(row)
                    if pd.notna(value)
                ]
                labels = {label: idx for value, idx in normalized_row for label in ["shift day"] if value.startswith(label)}
                for value, idx in normalized_row:
                    if value.startswith("night day") and night_idx is None:
                        night_idx = idx
                    if value.startswith("sunday") and sunday_idx is None:
                        sunday_idx = idx
                if labels and labels["shift day"] < night_idx < sunday_idx:
                    summary_idx = summary_idx or labels["shift day"] - 2
                    break

            if (
                summary_idx is not None
                and shift_idx is not None
                and night_idx is not None
                and sunday_idx is not None
            ):
                actro_summary_start = summary_idx
            elif marker_idx is not None:
                actro_summary_start = marker_idx - 1
            else:
                # ── AI fallback: nhờ AI đoán toạ độ cột Actro khi thuật toán thất bại
                log_callback(
                    "[ACTRO MAPPING] Không nhận diện được khối tổng hợp bằng marker/header. "
                    "Đang chuyển sang AI để gợi ý vị trí cột."
                )
                ai_positions = _ask_ai_for_actro_positions(df, header_row_idx)
                if ai_positions and review_callback:
                    confirmed = review_callback(
                        list(ai_positions.keys()),
                        {field: _normalize_label(field) for field in ai_positions},
                    )
                    if confirmed:
                        normalized = {
                            _normalize_label(field): value
                            for field, value in confirmed.items()
                            if value
                        }
                        for field, value in normalized.items():
                            ai_positions[field] = value
                if ai_positions and _is_valid_actro_indices(ai_positions, len(row7)):
                    actro_summary_start = ai_positions["ot_kc"]
                    log_callback(
                        "[ACTRO MAPPING] AI đã gợi ý và được xác nhận: "
                        + ", ".join(f"{k}={v + 1}" for k, v in ai_positions.items())
                    )
                else:
                    log_callback(
                        "[ACTRO MAPPING] Không nhận diện được khối tổng hợp. "
                        "Cần đối chiếu marker (26-25/25-25/24-25/23-25/27-26/26-26) "
                        "hoặc cụm header (Shift day/Night day/Sunday). "
                        "Dữ liệu sẽ trả về 0 bản ghi để tránh tính toán sai."
                    )
                    return []

            work_type_idx = None
            for r in range(max(0, header_row_idx - 2), header_row_idx + 3):
                row = df.iloc[r].tolist() if r < len(df) else []
                work_type_idx = next(
                    (
                        idx
                        for idx, value in enumerate(row)
                        if pd.notna(value) and _strip_accents(str(value)).strip().casefold().startswith("loai")
                    ),
                    None,
                )
                if work_type_idx is not None and work_type_idx > actro_summary_start:
                    break

            col_map.update({
                "ot_kc": actro_summary_start,
                "ot_kd": actro_summary_start + 1,
                "ot_ke": actro_summary_start + 2,
                "ot_kf": actro_summary_start + 3,
                "ot_kh": actro_summary_start + 5,
                "ot_ki": actro_summary_start + 6,
                "ot_kj": actro_summary_start + 7,
                "ot_kk": actro_summary_start + 8,
            })
            if work_type_idx is not None:
                col_map["work_type"] = work_type_idx
            elif actro_summary_start + 9 < len(row7):
                col_map["work_type"] = actro_summary_start + 9

            if "work_type" not in col_map:
                log_callback(
                    "[ACTRO MAPPING] Không tìm thấy cột Loại công việc. "
                    "Phụ cấp soi kính sẽ về 0 cho tất cả nhân viên."
                )
            log_callback(
                f"[ACTRO MAPPING] marker={marker_text} summary_start={actro_summary_start + 1}"
            )
    
        # 4. Trích xuất dữ liệu
        preview_data = []
        log_callback(f"[2/3] Bắt đầu đọc dữ liệu nhân viên từ dòng {header_row_idx + 3}...")
        
        # Bắt đầu đọc từ sau dòng header 2 dòng
        df = df.iloc[header_row_idx + 2:]
        formula_engine = (
            FormulaRegistry.get_formula(project_name) if calculate_payroll else None
        )

        # ── Lấy holidays cho kỳ này (Actro) ──────────────────────
        period_holidays = []
        holiday_multiplier_map = {}  # date -> multiplier
        holiday_affects_chuyencan = True
        holiday_counts_working = True
        
        if _strip_accents(project_name) == _strip_accents("Nhà máy Actro - Vĩnh Phúc"):
            if holiday_config and holiday_config.get("holidays"):
                # Dùng holiday_config từ UI
                for h in holiday_config["holidays"]:
                    date_str = h.get("date", "")
                    mult = h.get("multiplier", 3.0)
                    period_holidays.append(date_str)
                    holiday_multiplier_map[date_str] = mult
                holiday_affects_chuyencan = holiday_config.get("holiday_affects_chuyencan", True)
                holiday_counts_working = holiday_config.get("holiday_counts_working", True)
                log_callback(f"[HOLIDAY CONFIG] Đã load {len(period_holidays)} ngày lễ từ cấu hình user")
            else:
                # Fallback: dùng holidays mặc định
                from formulas.actro_config import get_holidays_for_period
                period_holidays = get_holidays_for_period(period_year, period_month)
                for h in period_holidays:
                    holiday_multiplier_map[h] = 3.0  # Default 300%
                log_callback(f"[HOLIDAY CONFIG] Dùng {len(period_holidays)} ngày lễ mặc định")
        
        for idx, row in df.iterrows():
            try:
                emp_code = str(row[col_map["employee_code"]]).strip()
                full_name = str(row[col_map["full_name"]]).strip()
                if not emp_code or emp_code.lower() == 'nan':
                    continue # Bỏ qua dòng trống
                
                # Bỏ qua các dòng là Tiêu đề hoặc dòng Đánh số thứ tự cột (VD: tên = '2', '3')
                # Tên thật phải chứa ít nhất 1 chữ cái alphabet
                if not re.search(r'[a-zA-ZÀ-ỹ]', full_name):
                    continue
                
                # Tính toán việc vắt tháng
                days_list = [int(d) for d in daily_cols.keys()]
                crosses_month = False
                for i in range(1, len(days_list)):
                    if days_list[i] < days_list[i-1]:
                        crosses_month = True
                        break
                
                daily_data = []
                passed_drop = False
                prev_day = -1
                
                for day, idxs in daily_cols.items():
                    day_val = int(day)
                    
                    if prev_day != -1 and day_val < prev_day:
                        passed_drop = True
                    prev_day = day_val
                    
                    # Xác định tháng/năm chuẩn cho từng ngày dựa vào việc có vắt tháng hay không
                    if crosses_month:
                        if not passed_drop: 
                            # Nửa đầu chu kỳ (Tháng trước, trước khi rớt qua ngày 1)
                            calc_month = period_month - 1
                            calc_year = period_year
                            if calc_month == 0:
                                calc_month = 12
                                calc_year -= 1
                        else:
                            # Nửa sau chu kỳ (Tháng này, sau khi đã qua ngày 1)
                            calc_month = period_month
                            calc_year = period_year
                    else:
                        # Không vắt tháng (Ví dụ 1->30)
                        calc_month = period_month
                        calc_year = period_year
                    
                    in_time = str(row[idxs["in"]]).split(' ')[-1] if pd.notna(row[idxs["in"]]) else ""
                    out_time = str(row[idxs["out"]]).split(' ')[-1] if pd.notna(row[idxs["out"]]) else ""
                    
                    # Hàm chuyển đổi an toàn
                    def safe_float(val):
                        if not pd.notna(val): return 0
                        try:
                            return float(val)
                        except:
                            return 0
                            
                    # Tính tổng giờ OT trong ngày (Cột 150%, 200%, 210%)
                    ot_day   = safe_float(row[idxs["ot"]])         # OT at 1.5× (ban ngày)
                    ot_night = safe_float(row[idxs["ot_night"]])   # OT at 2.0× (đêm)
                    ot_sun   = safe_float(row[idxs["ot_sun"]])     # OT at 2.1× hoặc chủ nhật
                    ot_val   = ot_day + ot_night + ot_sun
                    
                    status = "WORKING"
                    if not in_time and not out_time:
                        status = "ABSENT"
                    elif ot_val > 0:
                        status = "OVERTIME"

                    # Phân tích Ca làm việc & Loại Ngày (Fallback chung)
                    shift_type = "Ca 1 (Sáng)"
                    if in_time and in_time != 'nan':
                        try:
                            h = int(in_time.split(':')[0])
                            if 12 <= h < 20: shift_type = "Ca 2 (Chiều)"
                            elif h >= 20 or h < 4: shift_type = "Ca 3 (Đêm)"
                        except: pass
                    
                    # Xác định loại ngày: weekday, sunday, holiday, sunday_holiday
                    day_type_key = "weekday"
                    day_multiplier = 1.0  # Default multiplier
                    if _strip_accents(project_name) == _strip_accents("Nhà máy Actro - Vĩnh Phúc"):
                        date_iso = f"{calc_year}-{calc_month:02d}-{day_val:02d}"
                        is_weekend, is_holiday, day_type_str = is_sunday_or_holiday(
                            date_iso, 
                            period_holidays
                        )
                        if day_type_str == "sunday":
                            day_type_key = "sunday"
                            day_multiplier = holiday_multiplier_map.get(date_iso, 2.0)  # CN default 200%
                        elif day_type_str == "holiday":
                            day_type_key = "holiday"
                            day_multiplier = holiday_multiplier_map.get(date_iso, 3.0)  # Lễ default 300%
                        elif day_type_str == "sunday_holiday":
                            day_type_key = "sunday_holiday"
                            day_multiplier = holiday_multiplier_map.get(date_iso, 3.0)  # CN+Lễ default 300%
                    
                    # Parse shift type key
                    shift_type_key = "day"
                    if "Đêm" in shift_type:
                        shift_type_key = "night"
                    
                    # Tính OT multiplier dựa trên loại ngày + ca
                    ot_mult = get_ot_multiplier(day_type_key, shift_type_key)
                    
                    # Map day_type cho hiển thị
                    day_type_display = {
                        "weekday": "Ngày thường",
                        "sunday": "Chủ nhật",
                        "holiday": "Ngày lễ",
                        "sunday_holiday": "CN & Lễ",
                    }.get(day_type_key, "Ngày thường")
                        
                    # Tạo Breakdown chi tiết
                    breakdown = []
                    
                    if _strip_accents(project_name) == _strip_accents("Nhà máy Actro - Vĩnh Phúc"):
                        normal_h = safe_float(row[idxs["in"] + 2]) if (idxs["in"] + 2) < len(row) else 0
                        h_8_17 = safe_float(row[idxs["in"] + 4]) if (idxs["in"] + 4) < len(row) else 0
                        h_20_22 = safe_float(row[idxs["in"] + 5]) if (idxs["in"] + 5) < len(row) else 0
                        night_h = safe_float(row[idxs["in"] + 6]) if (idxs["in"] + 6) < len(row) else 0
                        
                        # Tính rate hiển thị dựa trên day_type
                        rate_display = 100
                        if day_type_key == "sunday":
                            rate_display = 200 if shift_type_key == "day" else 270
                        elif day_type_key == "holiday":
                            rate_display = 300
                        elif day_type_key == "sunday_holiday":
                            rate_display = 300
                        elif shift_type_key == "night":
                            rate_display = 130
                        
                        if normal_h > 0:
                            breakdown.append({"name": f"Hành chính ({shift_type})", "hours": normal_h, "rate": rate_display})
                            
                        if ot_day > 0: breakdown.append({"name": "Tăng ca 150%", "hours": ot_day, "rate": 150})
                        if ot_night > 0: breakdown.append({"name": "Tăng ca 200% đêm", "hours": ot_night, "rate": 200})
                        if ot_sun > 0: 
                            rate_sun = 210 if day_type_key == "sunday" else 300
                            breakdown.append({"name": f"Tăng ca {rate_sun}% chủ nhật/lễ", "hours": ot_sun, "rate": rate_sun})
                        if night_h > 0: breakdown.append({"name": "Giờ làm đêm", "hours": night_h, "rate": 130})
                        if h_8_17 > 0: breakdown.append({"name": "Giờ 8h~17h", "hours": h_8_17, "rate": None})
                        if h_20_22 > 0: breakdown.append({"name": "Giờ 20h~22h", "hours": h_20_22, "rate": None})
                    else:
                        # Dự án khác
                        if in_time and out_time:
                            breakdown.append({"name": f"Hành chính ({shift_type})", "hours": 8, "rate": 100})
                        if ot_val > 0:
                            breakdown.append({"name": "Tăng ca", "hours": ot_val, "rate": 150})
                        
                    daily_data.append({
                        "date": f"{calc_year}-{calc_month:02d}-{day_val:02d}",
                        "status": status,
                        "in": in_time if in_time and in_time != 'nan' else "",
                        "out": out_time if out_time and out_time != 'nan' else "",
                        "ot": ot_val,
                        "ot_day": ot_day,
                        "ot_night": ot_night,
                        "ot_sun": ot_sun,
                        "shiftType": shift_type,
                        "dayType": day_type_display,
                        "dayTypeKey": day_type_key,  # weekday, sunday, holiday, sunday_holiday
                        "shiftTypeKey": shift_type_key,  # day, night
                        "otMultiplier": day_multiplier,  # Custom multiplier from holiday config
                        "isHoliday": day_type_key in ("holiday", "sunday_holiday"),
                        "breakdown": breakdown
                    })
                    
                # Tính tổng hợp từ daily_data làm dữ liệu fallback
                calc_total_days = sum(1 for d in daily_data if d["status"] != "ABSENT")
                calc_absent_days = sum(1 for d in daily_data if d["status"] == "ABSENT")
                
                # ── Actro: Dùng summary columns thay vì tính lại từ daily ──
                # HR dùng công thức SUMIFS để tính sẵn các cột KC, KD, KE, KF, KH, KI, KJ, KK
                # LƯƠNG = LCB/giờ × (KD×1 + KE×1 + KF×1.5 + KH×2 + KI×1.3 + KJ×2 + KK×2.7)
                # CÔNG HC = (KD + KE + KI) / 8
                if _strip_accents(project_name) == _strip_accents("Nhà máy Actro - Vĩnh Phúc") and "ot_kf" in col_map:
                    # Đọc trực tiếp từ summary columns
                    ot_kc = safe_float(row[col_map.get("ot_kc", 289)])
                    ot_kd = safe_float(row[col_map.get("ot_kd", 290)])
                    ot_ke = safe_float(row[col_map.get("ot_ke", 291)])
                    ot_kf = safe_float(row[col_map.get("ot_kf", 292)])  # OT ngày (×1.5)
                    ot_kh = safe_float(row[col_map.get("ot_kh", 294)])  # OT đêm (×2.0)
                    ot_ki = safe_float(row[col_map.get("ot_ki", 295)])   # OT ngày (×1.3)
                    ot_kj = safe_float(row[col_map.get("ot_kj", 296)])  # OT CN (×2.0)
                    ot_kk = safe_float(row[col_map.get("ot_kk", 297)])
                    
                    # Map sang format ActroFormula expects
                    # KF = OT ngày (hệ số 1.5 trong công thức)
                    # KH = OT đêm (hệ số 2.0)
                    # KJ = OT CN (hệ số 2.0)
                    calc_ot_day = ot_kf   # OT ngày (từ KF)
                    calc_ot_night = ot_kh  # OT đêm (từ KH)
                    calc_ot_sun = ot_kj    # OT CN (từ KJ)
                    calc_ot_ki = ot_ki     # OT ngày × 1.3 (từ KI) - dùng trong CÔNG HC
                    calc_cong_hc = (ot_kd + ot_ke + ot_ki) / 8  # CÔNG HC = (KD + KE + KI) / 8
                    
                    # Override total_days bằng CÔNG HC × 8 (số giờ hành chính)
                    # CÔNG HC là số ngày công quy đổi theo hệ số
                    calc_total_days = calc_cong_hc
                else:
                    calc_ot_day = sum(d["ot_day"] for d in daily_data if "ot_day" in d) or sum(
                        safe_float(row[idxs["ot"]]) for idxs in daily_cols.values()
                    )
                    calc_ot_night = sum(d.get("ot_night", 0) for d in daily_data)
                    calc_ot_sun = sum(d.get("ot_sun", 0) for d in daily_data)
                
                # ── Parse start_date (Ngày vào) ─────────────────────────────────
                start_date = ""
                if "start_date" in col_map:
                    sd_val = row[col_map["start_date"]]
                    if pd.notna(sd_val):
                        try:
                            import datetime as dt
                            if isinstance(sd_val, (dt.datetime, dt.date)):
                                start_date = sd_val.strftime("%Y-%m-%d") if hasattr(sd_val, 'strftime') else str(sd_val)
                            else:
                                sd_str = str(sd_val).strip()
                                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
                                    try:
                                        start_date = dt.datetime.strptime(sd_str, fmt).strftime("%Y-%m-%d")
                                        break
                                    except: pass
                                if not start_date:
                                    start_date = sd_str
                        except: pass

                # ── Parse work_type (Loại) ────────────────────────────────────
                work_type = ""
                if "work_type" in col_map:
                    wt_val = row[col_map["work_type"]]
                    if pd.notna(wt_val):
                        work_type = str(wt_val).strip()

                # ── Calculate period boundaries ────────────────────────────────
                period_start = f"{period_year}-{period_month:02d}-01"
                period_end = f"{period_year}-{period_month:02d}-{last_day_in_month(period_month, period_year)}"
                
                # ── Raw Data cho Formula Engine + Trace Map ──────────────
                raw_data = {
                    "base_salary": 6000000,
                    "total_days": calc_total_days,
                    "normal_hours": calc_total_days * 8,
                    "ot_day": calc_ot_day,
                    "ot_night": calc_ot_night,
                    "ot_sunday": calc_ot_sun,
                    "ot_holiday": 0,
                    "absent_days": calc_absent_days,
                    "start_date": start_date,
                    "work_type": work_type,
                    "period_start": period_start,
                    "period_end": period_end,
                    "holidays": period_holidays,
                }
                
                trace_map = {}
                for key, col_idx in col_map.items():
                    if key not in ["employee_code", "full_name"]:
                        val = row[col_idx]

                        # Chỉ ghi đè bằng số cho các cột OT/timekeeping thực sự
                        # Giữ lại start_date, work_type, period_end đã parse đúng ở trên
                        # NOTE: total_days bị LOẠI TRỪ cho Actro vì Actro đã tính
                        #       calc_total_days = calc_cong_hc từ cột KC:KK ở trên.
                        #       Nếu để vào whitelist, cột Excel thường ghi đè sai giá trị này.
                        if key in ("absent_days", "ot_day", "ot_night",
                                   "ot_sunday", "normal_hours", "base_salary",
                                   "phu_cap_nha_o", "tru_ung", "bu_luong", "soi_kinh",
                                   "ot_130", "ot_150", "ot_180", "ot_200", "ot_210",
                                   "ot_250", "ot_260", "sunday_200", "sunday_night_240",
                                   "sunday_night_270", "holiday_300", "holiday_night_390",
                                   "suat_an",
                                   # Actro summary columns (KC, KD, KE, KF, KH, KI, KJ, KK)
                                   "ot_kc", "ot_kd", "ot_ke", "ot_kf", "ot_kh", "ot_ki", "ot_kj", "ot_kk"):
                            try:
                                f_val = float(val) if pd.notna(val) else 0
                            except:
                                f_val = 0
                            raw_data[key] = f_val
                        else:
                            # Giữ nguyên giá trị đã parse (start_date, work_type, period_end, ...)
                            f_val = val

                        # Lưu toạ độ vào Trace Map
                        excel_col = index_to_excel_col(col_idx)
                        excel_row = idx + 1
                        trace_map[key] = {
                            "cell": f"{excel_col}{excel_row}",
                            "value": f_val
                        }
                
                # Gọi Formula khi đây là luồng tính lương; clean parse chỉ giữ raw_data.
                payroll_data = formula_engine.calculate(raw_data) if formula_engine else None
                
                final_total_days = raw_data.get("total_days", calc_total_days)
                final_ot_hours = raw_data.get("ot_day", 0) + raw_data.get("ot_night", 0) + raw_data.get("ot_sunday", 0)
                final_absent_days = raw_data.get("absent_days", calc_absent_days)
                
                # Ràng buộc DB: Decimal(5,2) tối đa là 999.99
                if final_total_days > 999:
                    raise ValueError(f"Tổng ngày công ({final_total_days}) vượt mức giới hạn hệ thống (999).")
                if final_ot_hours > 999:
                    raise ValueError(f"Tổng giờ OT ({final_ot_hours}) vượt mức giới hạn hệ thống (999 giờ).")
                if final_absent_days > 999:
                    raise ValueError(f"Tổng ngày nghỉ ({final_absent_days}) vượt mức giới hạn hệ thống (999).")
                
                # Lưu lại toàn bộ dòng để support tra cứu nhanh theo cột (A, B, C...)
                raw_row_list = [val if pd.notna(val) else "" for val in row.values]
                
                preview_data.append({
                    "id": str(uuid.uuid4()),
                    "employeeCode": emp_code,
                    "fullName": full_name,
                    "project": project_name,
                    "periodMonth": period_month,
                    "periodYear": period_year,
                    "totalWorkDays": final_total_days,
                    "otHours": final_ot_hours,
                    "absentDays": final_absent_days, 
                    "dailyData": daily_data,
                    "payrollData": payroll_data,
                    "totalIncome": payroll_data["summary"]["netIncome"] if payroll_data else 0,
                    "traceMap": trace_map,
                    "rawRow": raw_row_list,
                    "excelRow": idx + 1,
                    "rawData": raw_data,
                    "hasError": False,
                    "errorMsg": ""
                })
            except Exception as e:
                err_msg = str(e)
                if isinstance(e, IndexError):
                    user_msg = "[Lỗi Cấu Trúc] Thiếu cột trên file Excel. File không khớp với định dạng chuẩn."
                elif isinstance(e, KeyError):
                    user_msg = f"[Lỗi Cấu Trúc] Không tìm thấy cột bắt buộc: {err_msg}."
                elif isinstance(e, ValueError):
                    user_msg = "[Lỗi Định Dạng] Có ký tự lạ (chữ thay vì số/ngày) trong một số ô dữ liệu."
                elif isinstance(e, ZeroDivisionError):
                    user_msg = "[Lỗi Chia 0] Lỗi khi tính lương do chia cho 0 (VD: Tổng ngày chuẩn bị thiếu)."
                else:
                    user_msg = f"[Lỗi Hệ Thống] {err_msg}"
                
                # Vẫn lưu dòng bị lỗi nhưng reset giá trị về 0
                emp_code_fallback = str(row.get(col_map.get("employee_code", 0), "")) if "employee_code" in col_map else f"Dòng {idx+1}"
                full_name_fallback = str(row.get(col_map.get("full_name", 1), "")) if "full_name" in col_map else "Không rõ tên"
                raw_row_list = [val if pd.notna(val) else "" for val in row.values]
                
                preview_data.append({
                    "id": str(uuid.uuid4()),
                    "employeeCode": emp_code_fallback.strip(),
                    "fullName": full_name_fallback.strip(),
                    "project": project_name,
                    "periodMonth": period_month,
                    "periodYear": period_year,
                    "totalWorkDays": 0,
                    "otHours": 0,
                    "absentDays": 0,
                    "dailyData": [],
                    "payrollData": None,
                    "totalIncome": 0,
                    "traceMap": {},
                    "rawRow": raw_row_list,
                    "excelRow": idx + 1,
                    "rawData": {},
                    "hasError": True,
                    "errorMsg": user_msg
                })
                log_callback(f"[CẢNH BÁO] Lỗi dòng {idx+1} ({full_name_fallback}): {user_msg}")
            
        log_callback(f"[3/3] Xử lý hoàn tất! Đã trích xuất {len(preview_data)} nhân viên.")
        return preview_data
        
    except Exception as e:
        log_callback(f"Lỗi hệ thống: {str(e)}")
        return []

def push_to_db(data_list, db_url, log_callback=print):
    """
    Đẩy danh sách dữ liệu đã preview lên Neon DB thông qua SQLAlchemy.
    """
    if not data_list:
        log_callback("Không có dữ liệu để push.")
        return False
        
    log_callback("Đang kết nối đến Database Neon...")
    
    # Thay đổi format url psycopg2
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(db_url)
        
        # Insert bulk manually using text to match the Prisma table exactly
        insert_query = text('''
            INSERT INTO portal_timesheets 
            (id, employee_code, full_name, project, period_month, period_year, total_work_days, ot_hours, absent_days, daily_data, payroll_data, total_income, created_at) 
            VALUES (:id, :emp, :name, :proj, :pmonth, :pyear, :wd, :ot, :absent, :daily, :payroll, :total_income, :created)
        ''')
        
        with engine.begin() as conn:
            for item in data_list:
                # Xoá dữ liệu cũ nếu nhân viên này đã có dữ liệu trong cùng kỳ và dự án (Cơ chế Ghi đè / Upsert)
                delete_query = text('''
                    DELETE FROM portal_timesheets 
                    WHERE employee_code = :emp AND project = :proj 
                      AND period_month = :pmonth AND period_year = :pyear
                ''')
                conn.execute(delete_query, {
                    "emp": item["employeeCode"],
                    "proj": item["project"],
                    "pmonth": item.get("periodMonth"),
                    "pyear": item.get("periodYear")
                })
                
                # Chèn dữ liệu mới
                conn.execute(insert_query, {
                    "id": str(uuid.uuid4()),
                    "emp": item["employeeCode"],
                    "name": item["fullName"],
                    "proj": item["project"],
                    "pmonth": item.get("periodMonth"),
                    "pyear": item.get("periodYear"),
                    "wd": item["totalWorkDays"],
                    "ot": item["otHours"],
                    "absent": item["absentDays"],
                    "daily": json.dumps(item["dailyData"]),
                    "payroll": json.dumps(item["payrollData"]) if item.get("payrollData") else None,
                    "total_income": item.get("totalIncome", 0),
                    "created": datetime.now()
                })
                
        log_callback(f"PUSH THÀNH CÔNG {len(data_list)} bản ghi lên DB!")
        return True
    except Exception as e:
        log_callback(f"LỖI DATABASE: {str(e)}")
        return False

def clear_db_period(project, period_month, period_year, db_url, log_callback=print):
    """
    Xoá sạch dữ liệu của một dự án trong một kỳ lương cụ thể.
    """
    log_callback(f"Đang kết nối Database để xoá dữ liệu {project} tháng {period_month}/{period_year}...")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(db_url)
        delete_query = text('''
            DELETE FROM portal_timesheets 
            WHERE project = :proj AND period_month = :pmonth AND period_year = :pyear
        ''')
        with engine.begin() as conn:
            result = conn.execute(delete_query, {
                "proj": project,
                "pmonth": period_month,
                "pyear": period_year
            })
            log_callback(f"ĐÃ XOÁ THÀNH CÔNG {result.rowcount} bản ghi cũ khỏi hệ thống.")
        return True
    except Exception as e:
        log_callback(f"LỖI DATABASE: {str(e)}")
        return False

def fetch_employee_timesheet(project, period_month, period_year, emp_code, db_url, log_callback=print):
    """
    Lấy dữ liệu của 1 nhân viên từ Database để đối soát/chỉnh sửa.
    """
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(db_url)
        query = text('''
            SELECT * FROM portal_timesheets 
            WHERE project = :proj 
              AND period_month = :pmonth 
              AND period_year = :pyear 
              AND employee_code = :emp
            LIMIT 1
        ''')
        with engine.connect() as conn:
            result = conn.execute(query, {
                "proj": project,
                "pmonth": period_month,
                "pyear": period_year,
                "emp": emp_code
            }).fetchone()
            
            if not result:
                return None
                
            daily_data = result.daily_data
            if daily_data and isinstance(daily_data, str):
                daily_data = json.loads(daily_data)
                
            payroll_data = result.payroll_data
            if payroll_data and isinstance(payroll_data, str):
                payroll_data = json.loads(payroll_data)
                
            # Parse result into dict similar to preview_data
            return {
                "id": str(result.id),
                "employeeCode": result.employee_code,
                "fullName": result.full_name,
                "project": result.project,
                "periodMonth": result.period_month,
                "periodYear": result.period_year,
                "totalWorkDays": float(result.total_work_days),
                "otHours": float(result.ot_hours),
                "absentDays": float(result.absent_days),
                "dailyData": daily_data if daily_data else [],
                "payrollData": payroll_data if payroll_data else None,
                "totalIncome": float(result.total_income) if result.total_income else 0,
                "rawData": {"total_days": float(result.total_work_days), "absent_days": float(result.absent_days)}, 
                "hasError": False,
                "errorMsg": ""
            }
    except Exception as e:
        log_callback(f"Lỗi truy vấn: {str(e)}")
        return None

def update_employee_timesheet(item, db_url, log_callback=print):
    """
    Cập nhật trực tiếp 1 bản ghi vào database
    """
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(db_url)
        update_query = text('''
            UPDATE portal_timesheets 
            SET total_work_days = :wd,
                ot_hours = :ot,
                absent_days = :absent,
                daily_data = :daily,
                payroll_data = :payroll,
                total_income = :total_income
            WHERE id = :id
        ''')
        with engine.begin() as conn:
            conn.execute(update_query, {
                "id": item["id"],
                "wd": item["totalWorkDays"],
                "ot": item["otHours"],
                "absent": item["absentDays"],
                "daily": json.dumps(item["dailyData"]),
                "payroll": json.dumps(item["payrollData"]) if item.get("payrollData") else None,
                "total_income": item.get("totalIncome", 0)
            })
        log_callback("Lưu thành công!")
        return True
    except Exception as e:
        log_callback(f"LỖI DATABASE: {str(e)}")
        return False

def export_employee_history(emp_code, db_url, save_path, log_callback=print):
    """
    Xuất lịch sử bảng công của một nhân viên (tất cả các tháng/dự án) ra file Excel.
    """
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(db_url)
        query = text('''
            SELECT 
                project AS "Dự án",
                period_month AS "Tháng",
                period_year AS "Năm",
                total_work_days AS "Tổng ngày công",
                ot_hours AS "Tổng giờ OT",
                absent_days AS "Ngày nghỉ",
                total_income AS "Tổng Thu Nhập"
            FROM portal_timesheets
            WHERE employee_code = :emp
            ORDER BY period_year DESC, period_month DESC
        ''')
        
        df = pd.read_sql_query(query, engine, params={"emp": emp_code})
        if df.empty:
            log_callback(f"Không có dữ liệu lịch sử cho mã NV {emp_code}.")
            return False
            
        df.to_excel(save_path, index=False)
        log_callback(f"Đã xuất thành công {len(df)} dòng lịch sử ra file Excel.")
        return True
    except Exception as e:
        log_callback(f"Lỗi xuất file: {str(e)}")
        return False

def export_project_payroll(project, period_month, period_year, db_url, save_path, log_callback=print):
    """
    Xuất bảng lương tổng hợp của một dự án trong một tháng ra file Excel.
    """
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(db_url)
        query = text('''
            SELECT 
                employee_code AS "Mã Nhân Viên",
                full_name AS "Họ Tên",
                total_work_days AS "Tổng ngày công",
                ot_hours AS "Tổng giờ OT",
                absent_days AS "Ngày nghỉ",
                total_income AS "Tổng Thu Nhập"
            FROM portal_timesheets
            WHERE project = :proj AND period_month = :pmonth AND period_year = :pyear
            ORDER BY full_name ASC
        ''')
        
        df = pd.read_sql_query(query, engine, params={
            "proj": project,
            "pmonth": period_month,
            "pyear": period_year
        })
        
        if df.empty:
            log_callback(f"Dự án {project} chưa có dữ liệu trong tháng {period_month}/{period_year}.")
            return False
            
        df.to_excel(save_path, index=False)
        log_callback(f"Đã xuất thành công {len(df)} nhân sự của dự án ra file Excel.")
        return True
    except Exception as e:
        log_callback(f"Lỗi xuất file: {str(e)}")
        return False

