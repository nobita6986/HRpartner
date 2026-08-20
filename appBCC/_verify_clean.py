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
    # CONG_HC, ChuyenCan
    'A601010731': (25.875, 400000),
    'A604011828': (24.9375, 200000),
    'A604011874': (24.8125, 200000),
    'A603011234': (25.9375, 400000),
    'A604011872': (24.9375, 200000),
}

targets = list(hr_expected.keys())
all_pass = True

for e in result:
    code = e.get('employeeCode', '')
    if code not in targets:
        continue

    pd_ = e.get('payrollData')
    if not pd_:
        print(f'FAIL {code}: payrollData=None')
        all_pass = False
        continue

    allowances = pd_.get('allowances', [])
    cc = allowances[0]['total'] if allowances else None
    cong_hc = pd_.get('summary', {}).get('_cong_hc', 0)

    exp_cong_hc, exp_cc = hr_expected[code]

    ok_cc = cc == exp_cc
    ok_cong = abs(cong_hc - exp_cong_hc) < 0.0001
    ok_luong = abs(pd_.get('summary', {}).get('salaryNormal', 0) -
                   {'A601010731': 10950000, 'A604011828': 9666346,
                    'A604011874': 10427884, 'A603011234': 10794230,
                    'A604011872': 9796153}.get(code, 0)) < 1

    if not (ok_cc and ok_cong and ok_luong):
        all_pass = False

    status = 'OK' if (ok_cc and ok_cong and ok_luong) else 'FAIL'
    print(f'{status} {code} | {e.get("fullName")}')
    print(f'  CONG_HC={cong_hc:.4f} vs HR={exp_cong_hc:.4f} [{ok_cong}]')
    print(f'  ChuyenCan={int(cc)} vs HR={exp_cc} [{ok_cc}]')
    print(f'  Luong={pd_.get("summary",{}).get("salaryNormal",0):.0f} [{ok_luong}]')
    print()

print('ALL PASS:', all_pass)
