# -*- coding: utf-8 -*-
import sys
import codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

import pandas as pd
xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx')
df = pd.read_excel(xl, sheet_name=0, header=None)
h = df.iloc[9]

# Find Ma Doan Chung
for idx in range(10, 40):
    row = df.iloc[idx]
    code = str(row.iloc[1]).strip()
    if code == 'A601010731':
        print(f'Found A601010731 at row idx={idx}')
        print('Row values 285-298:')
        for i in range(285, 299):
            v = row.iloc[i]
            print(f'  Col {i}: header={str(h.iloc[i]).strip()!r}, value={v!r}')
        break

# Also print full salary row
print('\nFull salary row (cols 297-314):')
for i in range(297, 315):
    v = df.iloc[10].iloc[i]
    print(f'  Col {i}: header={str(h.iloc[i]).strip()!r}, value={v!r}')
