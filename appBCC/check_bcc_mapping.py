# -*- coding: utf-8 -*-
"""Kiem tra AI mapping - xem cot nao dang duoc map lam normal_hours"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pandas as pd

def main():
    # Doc file BCC
    df_bcc = pd.read_excel(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx', header=None)

    # Tim dong header
    header_row = None
    for i in range(20):
        vals = [str(x).lower() for x in df_bcc.iloc[i].values if pd.notna(x)]
        if any("mã thẻ" in v or "mã nhân viên" in v for v in vals):
            header_row = i
            break

    print(f"Header row: {header_row}")

    # In header row
    row7 = df_bcc.iloc[header_row]
    row8 = df_bcc.iloc[header_row + 1] if header_row + 1 < len(df_bcc) else None

    print("\n=== CAC COT TU DONG 250 TRO DI ===")
    for i in range(250, min(300, len(row7))):
        v7 = row7.iloc[i] if pd.notna(row7.iloc[i]) else ''
        v8 = row8.iloc[i] if row8 is not None and pd.notna(row8.iloc[i]) else ''
        if v7 or v8:
            print(f"  Col {i}: '{v7}' | '{v8}'")

    # Lay 1 nhan vien
    print("\n=== DU LIEU NHAN VIEN DAU TIEN ===")
    data_row = df_bcc.iloc[header_row + 2]  # Dong dau tien cua du lieu

    for i in range(250, min(300, len(data_row))):
        val = data_row.iloc[i]
        v7 = row7.iloc[i] if pd.notna(row7.iloc[i]) else ''
        v8 = row8.iloc[i] if row8 is not None and pd.notna(row8.iloc[i]) else ''
        if val and val != 0:
            print(f"  Col {i}: Header='{v7}' | Value={val}")

if __name__ == '__main__':
    main()
