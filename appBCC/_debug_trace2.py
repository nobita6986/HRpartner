# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

import pandas as pd
import re

# Replicate exact core_pipeline logic
file_path = 'C:/CodeApp/HrP/appBCC/docs/Actro/BCCActroT7.xlsx'
df = pd.read_excel(file_path, sheet_name='Overtime', header=None, engine='openpyxl')

header_row_idx = -1
for idx, row in df.iterrows():
    vals = [str(x) for x in row.values if pd.notna(x)]
    if any('mã thẻ' in v.lower() or 'mã nhân viên' in v.lower() or 'mã nv' in v.lower() for v in vals):
        header_row_idx = idx
        break

row7 = df.iloc[header_row_idx].values
row8 = df.iloc[header_row_idx + 1].values

col_map = {}
for i, val in enumerate(row7):
    v = str(val).lower() if pd.notna(val) else ""
    if "mã thẻ" in v or "mã nv" in v: col_map["employee_code"] = i
    elif "họ và tên" in v or "họ tên" in v: col_map["full_name"] = i
    elif "ngày vào" in v: col_map["start_date"] = i
    elif "loại" in v and "công việc" in v: col_map["work_type"] = i
    elif "loại" in v: col_map["work_type"] = i

# Actro hardcoded
if True:  # simulating project_name check
    col_map["ot_kc"] = 288
    col_map["ot_kd"] = 289
    col_map["ot_ke"] = 290
    col_map["ot_kf"] = 291
    col_map["ot_kh"] = 293
    col_map["ot_ki"] = 294
    col_map["ot_kj"] = 295
    col_map["ot_kk"] = 296

print('col_map (Actro part):')
for k in ['ot_kc', 'ot_kd', 'ot_ke', 'ot_kf', 'ot_kh', 'ot_ki', 'ot_kj', 'ot_kk']:
    print(f'  {k} = {col_map.get(k)}')

# Now simulate the trace_map loop from core_pipeline lines 451-481
# The key list that gets written to raw_data
ot_k_keys = ["ot_kc", "ot_kd", "ot_ke", "ot_kf", "ot_kh", "ot_ki", "ot_kj", "ot_kk"]
excluded = ["employee_code", "full_name"]
whitelist = ["total_days", "absent_days", "ot_day", "ot_night",
             "ot_sunday", "normal_hours", "base_salary",
             "phu_cap_nha_o", "tru_ung", "bu_luong", "soi_kinh",
             "ot_130", "ot_150", "ot_180", "ot_200", "ot_210",
             "ot_250", "ot_260", "sunday_200", "sunday_night_240",
             "sunday_night_270", "holiday_300", "holiday_night_390",
             "suat_an"] + ot_k_keys

print()
print('Is "ot_kd" in whitelist?', 'ot_kd' in whitelist)
print('Is "ot_kc" in whitelist?', 'ot_kc' in whitelist)

# Check what col_map contains at line 451 iteration
df_data = df.iloc[header_row_idx + 2:]
for idx, row in df_data.iterrows():
    emp_code = str(row[1]).strip() if pd.notna(row[1]) else ''
    full_name = str(row[2]).strip() if pd.notna(row[2]) else ''
    if not re.search(r'[a-zA-ZÀ-ỹ]', full_name):
        continue

    print(f'\nFirst employee: {emp_code} | {full_name}')
    print(f'  "ot_kd" in col_map: {"ot_kd" in col_map}')
    print(f'  col_map["ot_kd"]: {col_map.get("ot_kd")}')

    # This is what gets written to raw_data at lines 457-470
    written_keys = []
    for key, col_idx in col_map.items():
        if key not in excluded:
            val = row[col_idx]
            if key in whitelist:
                f_val = float(val) if pd.notna(val) else 0
                written_keys.append((key, col_idx, f_val))

    print(f'  Written to raw_data ({len(written_keys)} keys):')
    for k, ci, v in written_keys:
        if 'ot_' in k or k in ['total_days', 'normal_hours']:
            print(f'    {k} (col {ci}) = {v}')

    break
