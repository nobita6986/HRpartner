# -*- coding: utf-8 -*-
"""Kiem tra cot Loai trong BCC"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pandas as pd

def main():
    df_bcc = pd.read_excel(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx', header=None)

    # Tim dong header
    header_row = 7
    row7 = df_bcc.iloc[header_row]
    row8 = df_bcc.iloc[header_row + 1]

    # Tim cac cot sau cot ngay
    last_day_col = 249  # Cot cuoi cung cua ngay 30
    print(f"=== CAC COT SAU NGAY (tu {last_day_col+1} tro di) ===")
    for i in range(last_day_col + 1, min(last_day_col + 60, len(row7))):
        v7 = str(row7.iloc[i]).strip() if pd.notna(row7.iloc[i]) else ''
        v8 = str(row8.iloc[i]).strip() if pd.notna(row8.iloc[i]) else ''
        if v7 or v8:
            print(f"  Col {i}: '{v7}' | '{v8}'")

    # Lay 5 nhan vien de kiem tra gia tri
    print("\n=== GIA TRI 5 NHAN VIEN ===")
    for i in range(header_row + 2, header_row + 7):
        row = df_bcc.iloc[i]
        ma_nv = row.iloc[1]
        ten = row.iloc[2]

        print(f"\n{ma_nv}: {ten}")
        for col in range(last_day_col + 1, min(last_day_col + 60, len(row))):
            val = row.iloc[col]
            v7 = str(row7.iloc[col]).strip() if pd.notna(row7.iloc[col]) else ''
            v8 = str(row8.iloc[col]).strip() if pd.notna(row8.iloc[col]) else ''
            if pd.notna(val) and str(val).strip():
                print(f"  Col {col}: '{v7} | {v8}' = {val}")

if __name__ == '__main__':
    main()
