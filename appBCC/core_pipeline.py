import os
import pandas as pd
import json
import uuid
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
        data_rows = df.iloc[header_row_idx + 2:]
        formula_engine = FormulaRegistry.get_formula(project_name)
        
        for idx, row in data_rows.iterrows():
            emp_code = str(row[col_map.get("employee_code", 1)]).strip() if "employee_code" in col_map and pd.notna(row[col_map["employee_code"]]) else ""
            if not emp_code or emp_code.lower() == 'nan' or len(emp_code) < 3:
                continue
                
            full_name = str(row[col_map.get("full_name", 2)]).strip() if "full_name" in col_map and pd.notna(row[col_map["full_name"]]) else ""
            
            # Daily Data
            daily_data = []
            
            # Tính toán việc vắt tháng
            days_list = [int(d) for d in daily_cols.keys()]
            crosses_month = False
            for i in range(1, len(days_list)):
                if days_list[i] < days_list[i-1]:
                    crosses_month = True
                    break
            
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
                
            # Raw Data cho Formula Engine + Trace Map
            raw_data = {"base_salary": 6000000} # Mock base_salary nếu file ko có
            trace_map = {}
            for key, col_idx in col_map.items():
                if key not in ["employee_code", "full_name"]:
                    val = row[col_idx]
                    try:
                        f_val = float(val) if pd.notna(val) else 0
                    except:
                        f_val = 0
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
            
            # Tổng hợp (ưu tiên lấy từ raw_data tức là Cột Tổng Hợp của Excel)
            calc_total_days = sum(1 for d in daily_data if d["status"] != "ABSENT")
            calc_total_ot = sum(d["ot"] for d in daily_data)
            calc_absent_days = sum(1 for d in daily_data if d["status"] == "ABSENT")
            
            # Lưu lại toàn bộ dòng để support tra cứu nhanh theo cột (A, B, C...)
            raw_row_list = [val if pd.notna(val) else "" for val in row.values]
            
            preview_data.append({
                "id": str(uuid.uuid4()),
                "employeeCode": emp_code,
                "fullName": full_name,
                "project": project_name,
                "totalWorkDays": raw_data.get("total_days", calc_total_days),
                "otHours": sum([raw_data.get(k, 0) for k in ["ot_130", "ot_150", "ot_180", "ot_200", "ot_210", "ot_250", "ot_260", "sunday_200", "holiday_300"]]) or calc_total_ot,
                "absentDays": raw_data.get("absent_days", calc_absent_days), 
                "dailyData": daily_data,
                "payrollData": payroll_data,
                "totalIncome": payroll_data["summary"]["netIncome"] if payroll_data else 0,
                "traceMap": trace_map,
                "rawRow": raw_row_list,
                "excelRow": idx + 1
            })
            
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
            (id, employee_code, full_name, project, total_work_days, ot_hours, absent_days, daily_data, payroll_data, total_income, created_at) 
            VALUES (:id, :emp, :name, :proj, :wd, :ot, :absent, :daily, :payroll, :total_income, :created)
        ''')
        
        with engine.begin() as conn:
            for item in data_list:
                conn.execute(insert_query, {
                    "id": str(uuid.uuid4()),
                    "emp": item["employeeCode"],
                    "name": item["fullName"],
                    "proj": item["project"],
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
