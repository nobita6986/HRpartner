# -*- coding: utf-8 -*-
import sys, io, os, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')

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
    'A601010731': {'cong_hc': 25.875, 'cc': 400000, 'luong': 10950000},
    'A604011828': {'cong_hc': 24.938, 'cc': 200000, 'luong': 9666346},
    'A604011874': {'cong_hc': 24.813, 'cc': 200000, 'luong': 10427884},
    'A603011234': {'cong_hc': 25.938, 'cc': 400000, 'luong': 10794230},
    'A604011872': {'cong_hc': 24.938, 'cc': 200000, 'luong': 9796153},
}

targets = ['A601010731', 'A604011828', 'A604011874', 'A603011234', 'A604011872']
all_pass = True

for e in result:
    code = e.get('employeeCode', '')
    if code not in targets:
        continue

    pd_ = e.get('payrollData')
    allowances = pd_.get('allowances', [])

    cc_actual = None
    for a in allowances:
        nm = a.get('name', '')
        nm_stripped = strip_accents(nm.lower())
        if 'chuyen' in nm_stripped and 'can' in nm_stripped:
            cc_actual = a['total']
            break

    exp = hr_expected[code]
    cong_hc = pd_.get('summary', {}).get('_cong_hc', 0)
    luong = pd_.get('summary', {}).get('salaryNormal', 0)

    ok_cc = 'OK' if cc_actual == exp['cc'] else 'FAIL'
    ok_cong = 'OK' if abs(cong_hc - exp['cong_hc']) < 0.01 else 'FAIL'
    ok_luong = 'OK' if abs(luong - exp['luong']) < 1 else 'FAIL'

    if ok_cc == 'FAIL' or ok_cong == 'FAIL' or ok_luong == 'FAIL':
        all_pass = False

    print(f'{code} | {e.get("fullName")}')
    print(f'  {"OK" if ok_cong == "OK" else "FAIL"} CONG_HC={cong_hc:.3f} (HR={exp["cong_hc"]:.3f})')
    print(f'  {ok_cc} ChuyenCan={cc_actual} (HR={exp["cc"]})')
    print(f'  {ok_luong} Luong gio={luong:.0f} (HR={exp["luong"]})')
    print()

print('=== TONG KET ===')
print('ALL PASS:', all_pass)
