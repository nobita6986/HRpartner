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
    'A601010731': {'cc': 400000, 'luong': 10950000},
    'A604011828': {'cc': 200000, 'luong': 9666346},
    'A604011874': {'cc': 200000, 'luong': 10427884},
    'A603011234': {'cc': 400000, 'luong': 10794230},
    'A604011872': {'cc': 200000, 'luong': 9796153},
}

targets = ['A601010731', 'A604011828', 'A604011874', 'A603011234', 'A604011872']
all_pass = True

for e in result:
    code = e.get('employeeCode', '')
    if code not in targets:
        continue

    pd_ = e.get('payrollData')
    allowances = pd_.get('allowances', [])

    # Print all allowances
    print(f'{code} allowances:')
    for i, a in enumerate(allowances):
        print(f'  [{i}] {a}')
    print()

    # Find ChuyenCan by name
    cc_actual = None
    for a in allowances:
        nm = a.get('name', '')
        if 'chuyen' in nm.lower() and ('can' in nm.lower() or 'cần' in nm or 'cẩn' in nm):
            cc_actual = a['total']
            break

    exp = hr_expected[code]
    ok_cc = 'OK' if cc_actual == exp['cc'] else f'FAIL (got {cc_actual})'
    if cc_actual != exp['cc']:
        all_pass = False

    print(f'{ok_cc} {code}: ChuyenCan={cc_actual} (HR={exp["cc"]})')

print()
print('ALL PASS:', all_pass)
