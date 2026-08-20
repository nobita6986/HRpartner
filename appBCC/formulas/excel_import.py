import pandas as pd

def parse_adjustments_excel(file_path):
    """
    Đọc file Excel gồm các khoản phụ cấp/khấu trừ.
    Yêu cầu 4 cột: Mã NV, Loại (Cộng/Trừ), Tên Khoản, Số Tiền.
    Trả về danh sách các adjustment.
    """
    try:
        df = pd.read_excel(file_path)
        # Chuẩn hóa tên cột
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        # Tìm cột cần thiết
        col_emp = None
        col_type = None
        col_name = None
        col_amount = None
        
        for c in df.columns:
            if "MÃ" in c and ("NV" in c or "NHÂN VIÊN" in c or "THẺ" in c):
                col_emp = c
            elif "LOẠI" in c or "TYPE" in c:
                col_type = c
            elif "TÊN" in c or "KHOẢN" in c or "LÝ DO" in c:
                col_name = c
            elif "TIỀN" in c or "SỐ TIỀN" in c or "AMOUNT" in c:
                col_amount = c
                
        if not col_emp or not col_name or not col_amount:
            return {"success": False, "error": f"Không tìm đủ các cột bắt buộc: Mã NV, Tên Khoản, Số Tiền. Đã tìm thấy: {list(df.columns)}"}
            
        adjustments = []
        for idx, row in df.iterrows():
            emp_code = str(row[col_emp]).strip().upper()
            if emp_code == 'NAN' or not emp_code:
                continue
                
            name = str(row[col_name]).strip()
            if name == 'NAN' or not name:
                continue
                
            try:
                amount = float(row[col_amount])
            except (ValueError, TypeError):
                continue
                
            if pd.isna(amount) or amount == 0:
                continue
                
            # Xác định loại: CỘNG hay TRỪ
            adj_type = "TRỪ" # Mặc định là Khấu Trừ nếu không có cột Loại
            if col_type:
                t = str(row[col_type]).strip().upper()
                if "CỘNG" in t or "THƯỞNG" in t or "PHỤ CẤP" in t or "+" in t:
                    adj_type = "CỘNG"
                    
            if amount < 0:
                adj_type = "TRỪ"
                amount = abs(amount)
                
            adjustments.append({
                "emp_code": emp_code,
                "type": adj_type,
                "name": name,
                "amount": amount
            })
            
        return {"success": True, "data": adjustments}
    except Exception as e:
        return {"success": False, "error": f"Lỗi đọc file Excel: {str(e)}"}
