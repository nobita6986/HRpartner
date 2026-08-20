import pandas as pd

def run_reconciliation(parsed_data, lcnt_file_path):
    """
    So sánh parsed_data (từ RAM) với file LCNT7.xlsx.
    Trả về danh sách kết quả đối soát.
    """
    try:
        # 1. Đọc file LCNT và tìm Header
        df1 = pd.read_excel(lcnt_file_path, header=None)
        
        # Tìm header row (Dòng chứa "Mã thẻ" hoặc "Mã nhân viên")
        header_row = -1
        for idx, row in df1.iterrows():
            vals = [str(x).lower() for x in row.values if pd.notna(x)]
            if any("mã thẻ" in v or "mã nhân viên" in v or "mã nv" in v for v in vals):
                header_row = idx
                break
                
        if header_row == -1:
            return {"success": False, "error": "Không tìm thấy dòng Header chứa 'Mã thẻ' hoặc 'Mã nhân viên' trong file LCNT."}
            
        # Đọc lại với đúng header
        df_lcnt = pd.read_excel(lcnt_file_path, skiprows=header_row)
        df_lcnt.columns = [str(c).strip().replace('\n', ' ') for c in df_lcnt.columns]
        
        # 2. Tìm cột Mã Nhân Viên và Thực Nhận
        emp_col_lcnt = None
        for c in df_lcnt.columns:
            c_upper = c.upper()
            if 'MÃ THẺ' in c_upper or 'MÃ NHÂN VIÊN' in c_upper or 'MÃ NV' in c_upper:
                emp_col_lcnt = c
                break
                
        if not emp_col_lcnt:
            return {"success": False, "error": "Không tìm thấy cột Mã thẻ trong file LCNT."}
            
        net_col_lcnt = None
        net_cols = [c for c in df_lcnt.columns if 'THỰC NHẬN' in c.upper() or 'THANH TOÁN' in c.upper()]
        if net_cols:
            net_col_lcnt = net_cols[-1] # Thường cột Thực nhận cuối cùng là chuẩn nhất
        else:
            return {"success": False, "error": "Không tìm thấy cột Thực nhận trong file LCNT."}
            
        # 3. Chuẩn hoá dữ liệu LCNT
        df_lcnt_clean = df_lcnt.dropna(subset=[emp_col_lcnt]).copy()
        df_lcnt_clean['JoinCode'] = df_lcnt_clean[emp_col_lcnt].astype(str).str.strip().str.upper()
        df_lcnt_clean['NetIncome'] = pd.to_numeric(df_lcnt_clean[net_col_lcnt], errors='coerce').fillna(0)
        
        # Tạo Dict tra cứu nhanh cho LCNT
        lcnt_dict = {}
        for _, row in df_lcnt_clean.iterrows():
            code = row['JoinCode']
            lcnt_dict[code] = {
                "net": row['NetIncome'],
                "raw_row": row.to_dict()
            }
            
        # 4. Đối chiếu với App Data (parsed_data)
        results = []
        matched_count = 0
        mismatch_count = 0
        missing_count = 0
        
        for emp in parsed_data:
            code = str(emp.get("employeeCode", "")).strip().upper()
            full_name = emp.get("fullName", "")
            app_net = emp.get("totalIncome", 0)
            
            if code in lcnt_dict:
                lcnt_net = lcnt_dict[code]["net"]
                diff = app_net - lcnt_net
                
                # Tolerate < 100 VND (do làm tròn)
                is_match = abs(diff) < 100
                
                if is_match:
                    matched_count += 1
                else:
                    mismatch_count += 1
                    
                results.append({
                    "status": "KHỚP" if is_match else "LỆCH",
                    "employeeCode": emp.get("employeeCode", code),
                    "fullName": full_name,
                    "lcnt_net": lcnt_net,
                    "app_net": app_net,
                    "diff": diff,
                    "app_data_ref": emp # Giữ tham chiếu để double-click mở edit
                })
            else:
                missing_count += 1
                results.append({
                    "status": "KHÔNG TÌM THẤY",
                    "employeeCode": emp.get("employeeCode", code),
                    "fullName": full_name,
                    "lcnt_net": 0,
                    "app_net": app_net,
                    "diff": app_net,
                    "app_data_ref": emp
                })
                
        # Sắp xếp Lệch lên đầu
        results.sort(key=lambda x: 0 if x["status"] == "LỆCH" else (1 if x["status"] == "KHÔNG TÌM THẤY" else 2))
        
        return {
            "success": True,
            "results": results,
            "stats": {
                "total": len(parsed_data),
                "matched": matched_count,
                "mismatched": mismatch_count,
                "missing": missing_count
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Lỗi xử lý file LCNT: {str(e)}"}
