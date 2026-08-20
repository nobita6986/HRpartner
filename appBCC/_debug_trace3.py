# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

# Inject tracing into core_pipeline
import core_pipeline as cp
_orig_preview = cp.preview_file

def traced_preview(file_path, project_name, period_month, period_year,
                  holiday_config=None, log_callback=print, review_callback=None, sheet_name=None):
    # Monkey-patch col_map assignment to see if Actro branch is reached
    import pandas as pd
    df = pd.read_excel(file_path, sheet_name=sheet_name or 0, header=None, engine='openpyxl')

    header_row_idx = -1
    for idx, row in df.iterrows():
        vals = [str(x) for x in row.values if pd.notna(x)]
        if any('mã thẻ' in v.lower() or 'mã nhân viên' in v.lower() or 'mã nv' in v.lower() for v in vals):
            header_row_idx = idx
            break

    row7 = df.iloc[header_row_idx].values
    col_map = {}
    for i, val in enumerate(row7):
        v = str(val).lower() if pd.notna(val) else ""
        if "mã thẻ" in v or "mã nv" in v: col_map["employee_code"] = i
        elif "họ và tên" in v or "họ tên" in v: col_map["full_name"] = i

    # Test: does project_name match?
    print(f'project_name: {repr(project_name)}')
    print(f'project_name == "Nhà máy Actro - Vĩnh Phúc": {project_name == "Nhà máy Actro - Vĩnh Phúc"}')

    # Set col_map the way preview_file does
    if project_name == "Nhà máy Actro - Vĩnh Phúc":
        col_map["ot_kc"] = 288
        col_map["ot_kd"] = 289
        col_map["ot_ke"] = 290
        col_map["ot_kf"] = 291
        col_map["ot_kh"] = 293
        col_map["ot_ki"] = 294
        col_map["ot_kj"] = 295
        col_map["ot_kk"] = 296
        print('Actro col_map set!')

    print(f'col_map keys: {list(col_map.keys())}')

    # Check first employee data
    df_data = df.iloc[header_row_idx + 2:]
    import re
    for idx, row in df_data.iterrows():
        emp_code = str(row[1]).strip() if pd.notna(row[1]) else ''
        full_name = str(row[2]).strip() if pd.notna(row[2]) else ''
        if not re.search(r'[a-zA-ZÀ-ỹ]', full_name):
            continue
        print(f'First employee: {emp_code} | {full_name}')
        for k in ['ot_kc', 'ot_kd', 'ot_ke', 'ot_kh', 'ot_ki']:
            col_idx = col_map.get(k)
            if col_idx is not None:
                val = row[col_idx]
                print(f'  {k} (col {col_idx}): {val}')
        break

    # Now call actual preview_file
    return _orig_preview(file_path, project_name, period_month, period_year,
                         holiday_config, log_callback, review_callback, sheet_name)

cp.preview_file = traced_preview

from core_pipeline import preview_file

def log(msg): pass

result = preview_file(
    file_path='C:/CodeApp/HrP/appBCC/docs/Actro/BCCActroT7.xlsx',
    project_name='Nha may Actro - Vinh Phuc',
    period_month=7,
    period_year=2026,
    holiday_config=None,
    log_callback=log,
    review_callback=None,
    sheet_name='Overtime'
)

e0 = result[0]
rd = e0.get('rawData', {})
print()
print('rawData ot_kd:', rd.get('ot_kd'))
print('rawData total_days:', rd.get('total_days'))
pd_ = e0.get('payrollData')
if pd_:
    print('salaryNormal:', pd_.get('summary', {}).get('salaryNormal'))
    print('_cong_hc:', pd_.get('summary', {}).get('_cong_hc'))
