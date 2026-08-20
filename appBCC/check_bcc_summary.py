# -*- coding: utf-8 -*-
"""Tim cac cot tong hop cuoi cung trong BCC"""

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

    print("=== CAC COT TU DONG 297 TRO DI ===")
    for i in range(297, min(320, len(row7))):
        v7 = str(row7.iloc[i]).strip() if pd.notna(row7.iloc[i]) else ''
        v8 = str(row8.iloc[i]).strip() if pd.notna(row8.iloc[i]) else ''
        if v7 or v8:
            print(f"  Col {i}: '{v7}' | '{v8}'")

    # Lay 1 nhan vien
    print("\n=== DU LIEU NHAN VIEN 1 (A601010731) ===")
    # Tim dong cua nhan vien nay
    for i in range(header_row + 2, min(header_row + 20, len(df_bcc))):
        row = df_bcc.iloc[i]
        if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == 'A601010731':
            print(f"Dong {i}:")
            for col in range(297, min(315, len(row))):
                val = row.iloc[col]
                v7 = str(row7.iloc[col]).strip() if pd.notna(row7.iloc[col]) else ''
                v8 = str(row8.iloc[col]).strip() if pd.notna(row8.iloc[col]) else ''
                if pd.notna(val) and val != 0:
                    print(f"  Col {col}: Header='{v7} | {v8}' | Value={val}")
            break

if __name__ == '__main__':
    main()
