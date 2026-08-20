# -*- coding: utf-8 -*-
import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

import pandas as pd

# Read LCNT7 and print ALL header row values with their column indices
xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx')
df = pd.read_excel(xl, sheet_name=0, header=None)
print(f'Shape: {df.shape}')

# Print rows 8-11 to see actual structure
for row_idx in [8, 9, 10, 11, 12]:
    print(f'\n--- Row {row_idx} (0-indexed) ---')
    row = df.iloc[row_idx]
    non_null_count = 0
    for i, val in enumerate(row):
        if pd.notna(val) and str(val).strip():
            non_null_count += 1
            if non_null_count <= 50:  # First 50 non-null values
                print(f'  Col {i}: {repr(str(val).strip())}')
    print(f'  ... ({non_null_count} total non-null values in this row)')

# Now check row 14 (Ma Doan Chung) for salary section
print(f'\n--- Row 14 (Ma Doan Chung?) ---')
row = df.iloc[14]
print(f'  Col 0 (STT): {row.iloc[0]}')
print(f'  Col 1 (Mã): {row.iloc[1]}')
print(f'  Col 2 (Tên): {row.iloc[2]}')
print(f'  Col 3: {row.iloc[3]}')
print(f'  Col 4: {row.iloc[4]}')
print(f'  Col 5: {row.iloc[5]}')
print(f'  Col 6: {row.iloc[6]}')

# Find salary section
print(f'\n--- Row 14 salary section (cols 295-314) ---')
for i in range(295, 315):
    val = row.iloc[i] if i < len(row) else 'OUT_OF_BOUNDS'
    print(f'  Col {i}: {repr(val)}')

# Print rows 13-15 with salary cols to find where actual salary data is
print(f'\n--- Rows 13-17, salary cols 295-314 ---')
for ri in range(13, 18):
    row = df.iloc[ri]
    code = str(row.iloc[1]).strip() if 1 < len(row) else ''
    name = str(row.iloc[2]).strip() if 2 < len(row) else ''
    luong = row.iloc[304] if 304 < len(row) else 'N/A'
    base = row.iloc[303] if 303 < len(row) else 'N/A'
    print(f'  Row {ri}: code={code!r}, name={name!r}, LCB={base}, LUONG={luong}')
