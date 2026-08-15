import os
import pandas as pd
import json
import uuid
import re
from sqlalchemy import create_engine, text
from datetime import datetime
from formulas.formula_registry import FormulaRegistry
from agent_mapper import get_mapping_from_ai

OUTPUT_DIR = "BCC_Output"

def index_to_excel_col(col_idx):
    """Chuyển đổi index 0, 1, 2... thành toạ độ cột Excel A, B, C... AA..."""
    res = ""
    while col_idx >= 0:
        res = chr(col_idx % 26 + 65) + res
        col_idx = col_idx // 26 - 1
    return res

def setup_directories():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def preview_file(file_path, project_name, period_month, period_year, log_callback=print):
    """
    Xử lý file và trả về danh sách dữ liệu đã chuẩn hóa (dạng dict) để Preview trên UI.
    """
    setup_directories()
    
    log_callback(f"[1/3] Đang đọc file: {os.path.basename(file_path)}...")
    try:
        df = pd.read_excel(file_path, header=None)
        
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
            
        # Tìm cột ngày và Summary
        last_day_col = -1
        for i in range(len(row7)):
            val7 = str(row7[i]).strip() if pd.notna(row7[i]) else ""
            if val7.isdigit() and 1 <= int(val7) <= 31:
                # Đây là cột bắt đầu của 1 ngày
                day_str = f"{int(val7):02d}"
                # In thường ở i, Out ở i+1, OT ở i+3
                daily_cols[day_str] = {"in": i, "out": i+1, "ot": i+3}
                last_day_col = i + 9 # Mỗi ngày có ~10 sub-columns
        
        # Lấy các cột summary cuối cùng để gửi AI
        for i in range(last_day_col + 1, len(row7)):
            v7 = str(row7[i]).strip().replace('\n', ' ') if pd.notna(row7[i]) else ""
            v8 = str(row8[i]).strip().replace('\n', ' ') if pd.notna(row8[i]) else ""
            if v7 or v8:
                header_text = f"{v7} - {v8}".strip(" -")
                summary_headers_to_map[i] = header_text
                
        # 3. Ánh xạ AI cho các cột Summary
        log_callback(f"[1/3] Đang phân tích {len(summary_headers_to_map)} cột tổng hợp bằng AI/Từ điển...")
        ai_result = get_mapping_from_ai(list(summary_headers_to_map.values()))
        
        for i, header_text in summary_headers_to_map.items():
            mapped_key = ai_result.get(header_text)
            if mapped_key:
                col_map[mapped_key] = i
                
        # 4. Trích xuất dữ liệu
        preview_data = []
        log_callback(f"[2/3] Bắt đầu đọc dữ liệu nhân viên từ dòng {header_row_idx + 3}...")
        
        # Bắt đầu đọc từ sau dòng header 2 dòng
        df = df.iloc[header_row_idx + 2:]
        formula_engine = FormulaRegistry.get_formula(project_name)
        
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
                for day, idxs in daily_cols.items():
                    day_val = int(day)
                    
                    # Xác định tháng/năm chuẩn cho từng ngày dựa vào việc có vắt tháng hay không
                    if crosses_month:
                        if day_val > 15: 
                            # Nửa đầu chu kỳ (Tháng trước)
                            calc_month = period_month - 1
                            calc_year = period_year
                            if calc_month == 0:
                                calc_month = 12
                                calc_year -= 1
                        else:
                            # Nửa sau chu kỳ (Tháng này)
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
                    ot_150 = safe_float(row[idxs["ot"]])
                    ot_200 = safe_float(row[idxs["in"] + 7]) if (idxs["in"] + 7) < len(row) else 0
                    ot_210 = safe_float(row[idxs["in"] + 8]) if (idxs["in"] + 8) < len(row) else 0
                    ot_val = ot_150 + ot_200 + ot_210
                    
                    status = "WORKING"
                    if not in_time and not out_time:
                        status = "ABSENT"
                    elif ot_val > 0:
                        status = "OVERTIME"
                        
                    daily_data.append({
                        "date": f"{calc_year}-{calc_month:02d}-{day_val:02d}",
                        "status": status,
                        "in": in_time if in_time and in_time != 'nan' else "",
                        "out": out_time if out_time and out_time != 'nan' else "",
                        "ot": ot_val
                    })
                    
                # Tính tổng hợp từ daily_data làm dữ liệu fallback
                calc_total_days = sum(1 for d in daily_data if d["status"] != "ABSENT")
                calc_total_ot = sum(d["ot"] for d in daily_data)
                calc_absent_days = sum(1 for d in daily_data if d["status"] == "ABSENT")
                
                # Raw Data cho Formula Engine + Trace Map
                raw_data = {
                    "base_salary": 6000000, # Mock base_salary nếu file ko có
                    "total_days": calc_total_days,
                    "normal_hours": calc_total_days * 8,
                    "ot_150": calc_total_ot,
                    "absent_days": calc_absent_days
                }
                
                trace_map = {}
                for key, col_idx in col_map.items():
                    if key not in ["employee_code", "full_name"]:
                        val = row[col_idx]
                        try:
                            f_val = float(val) if pd.notna(val) else 0
                        except:
                            f_val = 0
                        
                        # Ghi đè fallback bằng dữ liệu thực tế từ cột Tổng Hợp của Excel (nếu có)
                        raw_data[key] = f_val
                        
                        # Lưu toạ độ vào Trace Map
                        excel_col = index_to_excel_col(col_idx)
                        excel_row = idx + 1 # idx trong pandas là 0-based, cộng 1 ra số dòng Excel
                        trace_map[key] = {
                            "cell": f"{excel_col}{excel_row}",
                            "value": f_val
                        }
                
                # Gọi Formula
                payroll_data = formula_engine.calculate(raw_data) if formula_engine else None
                
                final_total_days = raw_data.get("total_days", calc_total_days)
                final_ot_hours = sum([raw_data.get(k, 0) for k in ["ot_130", "ot_150", "ot_180", "ot_200", "ot_210", "ot_250", "ot_260", "sunday_200", "holiday_300"]]) or calc_total_ot
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

