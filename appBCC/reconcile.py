#!/usr/bin/env python3
"""
Script đối soát kết quả tính lương giữa:
1. File BCCActroT7.xlsx (dữ liệu chấm công gốc)
2. LCNT7.xlsx (bảng lương kế toán - ground truth)

Usage:
    python reconcile.py --bcc "path/to/BCCActroT7.xlsx" --lcnt "path/to/LCNT7.xlsx" --output "ket_qua_doi_soat.xlsx"
"""

import argparse
import pandas as pd
import sys
from pathlib import Path

def load_bcc_file(bcc_path):
    """Đọc file BCC (Bảng Chấm Công) và trích xuất dữ liệu cần thiết"""
    print(f"[1] Đang đọc file BCC: {bcc_path}")

    df = pd.read_excel(bcc_path, header=None)

    # Tìm dòng header
    header_row_idx = -1
    for idx, row in df.iterrows():
        vals = [str(x).lower() for x in row.values if pd.notna(x)]
        if any("mã thẻ" in v or "mã nhân viên" in v or "mã nv" in v for v in vals):
            header_row_idx = idx
            break

    if header_row_idx == -1:
        print("LỖI: Không tìm thấy dòng Header")
        return None

    print(f"    Header row: {header_row_idx}")
    return df, header_row_idx

def load_lcnt_file(lcnt_path):
    """Đọc file LCNT (Lương Cần Nhận Tiền)"""
    print(f"[2] Đang đọc file LCNT: {lcnt_path}")

    # Đọc tất cả sheets
    xl = pd.ExcelFile(lcnt_path)
    print(f"    Các sheet: {xl.sheet_names}")

    # Đọc sheet đầu tiên hoặc sheet có tên chứa "Lương"
    for sheet in xl.sheet_names:
        if "lương" in sheet.lower() or "luong" in sheet.lower():
            df = pd.read_excel(lcnt_path, sheet_name=sheet)
            print(f"    Đọc sheet: {sheet}")
            return df

    # Đọc active sheet
    df = pd.read_excel(lcnt_path)
    print(f"    Đọc sheet mặc định")
    return df

def reconcile(bcc_data, lcnt_data):
    """
    Đối soát dữ liệu giữa BCC và LCNT
    Trả về DataFrame chứa các chênh lệch
    """
    print("[3] Đang đối soát...")

    results = []

    for _, lcnt_row in lcnt_data.iterrows():
        # Tìm mã NV trong LCNT (các cột có thể: Mã NV, Mã, Code, Employee Code...)
        emp_code = None
        for col in lcnt_data.columns:
            col_str = str(col).lower()
            if any(x in col_str for x in ['mã nv', 'mã', 'code', 'employee']):
                emp_code = lcnt_row[col]
                break

        if emp_code is None:
            continue

        # Tìm dòng tương ứng trong BCC
        bcc_row = bcc_data[bcc_data['employee_code'] == emp_code]

        result = {
            'Mã NV': emp_code,
            'Tên (LCNT)': lcnt_row.get('Họ và tên', lcnt_row.get('Tên', 'N/A')),
            'Công HC (LCNT)': lcnt_row.get('Công HC', 0),
            'Thực nhận (LCNT)': lcnt_row.get('Thực nhận', 0),
            'Công HC (BCC/App)': 'N/A',
            'Thực nhận (BCC/App)': 'N/A',
            'Chênh lệch Công HC': 'N/A',
            'Chênh lệch Thực nhận': 'N/A',
            'Trạng thái': 'OK' if bcc_row.empty else 'CẦN KIỂM TRA'
        }

        if not bcc_row.empty:
            result['Công HC (BCC/App)'] = bcc_row.iloc[0].get('cong_hc', 'N/A')
            result['Thực nhận (BCC/App)'] = bcc_row.iloc[0].get('thuc_nhan', 'N/A')

            try:
                cong_hc_lcnt = float(lcnt_row.get('Công HC', 0))
                cong_hc_bcc = float(bcc_row.iloc[0].get('cong_hc', 0))
                result['Chênh lệch Công HC'] = cong_hc_lcnt - cong_hc_bcc

                thuc_nhan_lcnt = float(lcnt_row.get('Thực nhận', 0))
                thuc_nhan_bcc = float(bcc_row.iloc[0].get('thuc_nhan', 0))
                result['Chênh lệch Thực nhận'] = thuc_nhan_lcnt - thuc_nhan_bcc

                if abs(result['Chênh lệch Thực nhận']) > 1000:
                    result['Trạng thái'] = ' SAI LỆCH LỚN'
                elif abs(result['Chênh lệch Thực nhận']) > 0:
                    result['Trạng thái'] = 'CHÊNH LỆCH NHỎ'
            except:
                result['Trạng thái'] = 'LỖI CHUYỂN ĐỔI'

        results.append(result)

    return pd.DataFrame(results)

def main():
    parser = argparse.ArgumentParser(description='Đối soát lương Actro')
    parser.add_argument('--bcc', required=True, help='Đường dẫn file BCCActroT7.xlsx')
    parser.add_argument('--lcnt', required=True, help='Đường dẫn file LCNT7.xlsx')
    parser.add_argument('--output', default='ket_qua_doi_soat.xlsx', help='File kết quả đối soát')

    args = parser.parse_args()

    # Kiểm tra file tồn tại
    if not Path(args.bcc).exists():
        print(f"LỖI: File BCC không tồn tại: {args.bcc}")
        return 1

    if not Path(args.lcnt).exists():
        print(f"LỖI: File LCNT không tồn tại: {args.lcnt}")
        return 1

    # Đọc file
    bcc_result = load_bcc_file(args.bcc)
    lcnt_data = load_lcnt_file(args.lcnt)

    if bcc_result is None:
        return 1

    # TODO: Sau khi fix code, đọc kết quả từ app đã tính
    # Hiện tại chỉ so sánh cấu trúc

    print("\n" + "="*60)
    print("KẾT QUẢ ĐỐI SOÁT SƠ BỘ")
    print("="*60)

    print(f"\nFile LCNT có {len(lcnt_data)} dòng dữ liệu")
    print(f"Các cột trong LCNT: {list(lcnt_data.columns)}")

    # Lưu kết quả
    lcnt_data.to_excel(args.output, index=False)
    print(f"\nĐã lưu cấu trúc LCNT vào: {args.output}")

    return 0

if __name__ == '__main__':
    sys.exit(main())
