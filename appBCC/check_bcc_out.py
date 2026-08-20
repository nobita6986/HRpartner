# -*- coding: utf-8 -*-
import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
import pandas as pd

xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx')
df = pd.read_excel(xl, sheet_name='OUT', header=None)
print('OUT shape:', df.shape)
h = df.iloc[7]
print('OUT headers (cols 1-10):')
for i in range(1, 10):
    print('  Col', i, ':', repr(str(h.iloc[i]).strip()))
# Find day cols
days = {}
for i,v in enumerate(h):
    sv = str(v).strip()
    if sv.isdigit() and 1<=int(sv)<=31:
        days[int(sv)] = i
print('Day columns found:', list(sorted(days.keys())[:5]))
day_start = days.get(1, '?')
print('Day 1 starts at col', day_start)
# Show first 3 employee rows
for idx in range(9, 12):
    row = df.iloc[idx]
    code = str(row.iloc[1]).strip()
    name = str(row.iloc[2]).strip()
    dc = days.get(1, 0)
    print('Row', idx+1, ': code=', repr(code), ', name=', repr(name))
    if dc != '?':
        print('  Day 1 subcols: +0=', repr(row.iloc[dc]), ', +1=', repr(row.iloc[dc+1]), ', +2=', repr(row.iloc[dc+2]), ', +3=', repr(row.iloc[dc+3]), ', +4=', repr(row.iloc[dc+4]))
