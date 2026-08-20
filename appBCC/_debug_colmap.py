# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

import pandas as pd
import re

file_path = 'C:/CodeApp/HrP/appBCC/docs/Actro/BCCActroT7.xlsx'
df = pd.read_excel(file_path, sheet_name='Overtime', header=None, engine='openpyxl')

header_row_idx = -1
for idx, row in df.iterrows():
    vals = [str(x) for x in row.values if pd.notna(x)]
    if any('mã thẻ' in v.lower() or 'mã nhân viên' in v.lower() or 'mã nv' in v.lower() for v in vals):
        header_row_idx = idx
        break

print('header_row_idx:', header_row_idx)

col_map = {}
# Fixed columns
for i, val in enumerate(df.iloc[header_row_idx].values):
    v = str(val).lower() if pd.notna(val) else ""
    if "mã thẻ" in v or "mã nv" in v: col_map["employee_code"] = i
    elif "họ và tên" in v or "họ tên" in v: col_map["full_name"] = i
    elif "ngày vào" in v: col_map["start_date"] = i
    elif "loại" in v and "công việc" in v: col_map["work_type"] = i
    elif "loại" in v: col_map["work_type"] = i

# Actro hardcoded
col_map["ot_kc"] = 288
col_map["ot_kd"] = 289
col_map["ot_ke"] = 290
col_map["ot_kf"] = 291
col_map["ot_kh"] = 293
col_map["ot_ki"] = 294
col_map["ot_kj"] = 295
col_map["ot_kk"] = 296

print('col_map (actro part):')
for k in ['ot_kc', 'ot_kd', 'ot_ke', 'ot_kf', 'ot_kh', 'ot_ki', 'ot_kj', 'ot_kk']:
    print(f'  {k} = {col_map.get(k)}')

# Now simulate employee extraction
df_data = df.iloc[header_row_idx + 2:]
for idx, row in df_data.iterrows():
    emp_code = str(row[1]).strip() if pd.notna(row[1]) else ''
    full_name = str(row[2]).strip() if pd.notna(row[2]) else ''
    if not re.search(r'[a-zA-ZÀ-ỹ]', full_name):
        continue

    print()
    print(f'Employee: {emp_code} | {full_name}')
    for k in ['ot_kc', 'ot_kd', 'ot_ke', 'ot_kf', 'ot_kh', 'ot_ki', 'ot_kj', 'ot_kk']:
        col_idx = col_map.get(k)
        if col_idx is not None:
            val = row[col_idx]
            print(f'  {k} (col {col_idx}): {val}')

    break  # just first employee
