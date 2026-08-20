# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

from formulas import formula_registry
formula_registry.FormulaRegistry._registry = {}
formula_registry.FormulaRegistry._accentless_map = {}

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

hr_expected = {
    'A601010731': {'cc': 400000, 'luong': 10950000, 'thuc_nhan': 8846000},
    'A604011828': {'cc': 200000, 'luong': 9666346, 'thuc_nhan': 10777000},
    'A604011874': {'cc': 200000, 'luong': 10427884, 'thuc_nhan': 11343000},
    'A603011234': {'cc': 400000, 'luong': 10794230, 'thuc_nhan': 11693000},
    'A604011872': {'cc': 200000, 'luong': 9796153, 'thuc_nhan': 10283000},
}

targets = ['A601010731', 'A604011828', 'A604011874', 'A603011234', 'A604011872']
all_pass = True

for e in result:
    code = e.get('employeeCode', '')
    if code not in targets:
        continue

    pd_ = e.get('payrollData')
    name = e.get('fullName')
    exp = hr_expected[code]

    # Direct lookup by index (ChuyenCan is always index 0)
    cc_actual = pd_['allowances'][0]['total'] if pd_ else None
    luong_actual = pd_['summary']['salaryNormal'] if pd_ else None

    ok_cc = 'OK' if cc_actual == exp['cc'] else 'FAIL'
    ok_luong = 'OK' if luong_actual and abs(luong_actual - exp['luong']) < 1 else 'FAIL'

    if ok_cc == 'FAIL' or ok_luong == 'FAIL':
        all_pass = False

    print(f'{ok_cc}/{ok_luong} {code} | {name}')
    print(f'  ChuyenCan: {cc_actual} vs HR {exp["cc"]} [{ok_cc}]')
    print(f'  Luong gio: {luong_actual:.0f} vs HR {exp["luong"]} [{ok_luong}]')

print()
print('ALL PASS:', all_pass)
