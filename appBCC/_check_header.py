# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

import pandas as pd

df = pd.read_excel('C:/CodeApp/HrP/appBCC/docs/Actro/BCCActroT7.xlsx',
                   sheet_name='Overtime', header=None, engine='openpyxl')

# Find header row
header_row_idx = -1
for idx, row in df.iterrows():
    vals = [str(x) for x in row.values if pd.notna(x)]
    if any('mã thẻ' in v.lower() or 'mã nv' in v.lower() for v in vals):
        header_row_idx = idx
        break

print(f'Header row: {header_row_idx} (Excel row {header_row_idx+1})')
row7 = df.iloc[header_row_idx].values

print()
print('=== Row 7 (BCC header row) - looking for work_type ===')
for i, val in enumerate(row7):
    if pd.notna(val):
        sv = str(val).replace('\n', ' ').strip()
        if len(sv) < 50:  # skip long merged headers
            print(f'  col {i} ({chr(65+i) if i < 26 else "AA+"+str(i)}): {sv}')

# Check what the loop finds
col_map = {}
for i, val in enumerate(row7):
    v = str(val).lower() if pd.notna(val) else ""
    if "mã thẻ" in v or "mã nv" in v: col_map["employee_code"] = i
    elif "họ và tên" in v or "họ tên" in v: col_map["full_name"] = i
    elif "ngày vào" in v: col_map["start_date"] = i
    elif "loại" in v and "công việc" in v: col_map["work_type"] = i
    elif "loại" in v: col_map["work_type"] = i

print()
print('col_map:', col_map)
