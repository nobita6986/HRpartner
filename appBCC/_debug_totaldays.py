# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

import pandas as pd
import openpyxl.utils as OU

df = pd.read_excel('C:/CodeApp/HrP/appBCC/docs/Actro/BCCActroT7.xlsx',
                   sheet_name='Overtime', header=None, engine='openpyxl')

header_row_idx = -1
for idx, row in df.iterrows():
    vals = [str(x) for x in row.values if pd.notna(x)]
    if any('mã thẻ' in v.lower() or 'mã nv' in v.lower() for v in vals):
        header_row_idx = idx
        break

df_data = df.iloc[header_row_idx + 2:]
import re
for idx, row in df_data.iterrows():
    emp_code = str(row[1]).strip() if pd.notna(row[1]) else ''
    full_name = str(row[2]).strip() if pd.notna(row[2]) else ''
    if not re.search(r'[a-zA-ZÀ-ỹ]', full_name):
        continue

    # Find where total_days=27 comes from
    print(f'{emp_code} | {full_name}')
    print('  Looking for value 26 or 27 in row...')
    for i, val in enumerate(row):
        if pd.notna(val):
            try:
                f = float(val)
                if 25.5 <= f <= 27.5:
                    print(f'  col {i} ({OU.get_column_letter(i+1)}): {val} -> {f}')
            except:
                pass
    break
