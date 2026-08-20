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

# HR expected values from LCNT7
hr_expected = {
    'A601010731': {'cong_hc': 25.875, 'cc': 400000, 'luong': 10950000, 'thuc_nhan': 8846000},
    'A604011828': {'cong_hc': 24.938, 'cc': 200000, 'luong': 9666346, 'thuc_nhan': 10777000},
    'A604011874': {'cong_hc': 24.813, 'cc': 200000, 'luong': 10427884, 'thuc_nhan': 11343000},
    'A603011234': {'cong_hc': 25.938, 'cc': 400000, 'luong': 10794230, 'thuc_nhan': 11693000},
    'A604011872': {'cong_hc': 24.938, 'cc': 200000, 'luong': 9796153, 'thuc_nhan': 10283000},
}

targets = ['A601010731', 'A604011828', 'A604011874', 'A603011234', 'A604011872']

print('=== VERIFICATION: Pipeline vs HR (LCNT7) ===')
print()

all_pass = True
for e in result:
    code = e.get('employeeCode', '')
    if code not in targets:
        continue

    pd_ = e.get('payrollData')
    rd = e.get('rawData', {})
    name = e.get('fullName')
    exp = hr_expected[code]

    row_ok = True

    # Find ChuyenCan
    cc_actual = None
    if pd_:
        for a in pd_.get('allowances', []):
            nm = a.get('name', '')
            # Match if 'chuyen' and ('can' or 'cần') in name
            nm_lower = nm.lower()
            if 'chuyen' in nm_lower and ('can' in nm_lower or 'cần' in nm_lower or 'cẩn' in nm_lower):
                cc_actual = a['total']
                break

    luong_actual = pd_.get('summary', {}).get('salaryNormal', 0) if pd_ else None
    cong_hc_actual = pd_.get('summary', {}).get('_cong_hc', 0) if pd_ else None

    ok_cc = 'OK' if cc_actual == exp['cc'] else 'FAIL'
    ok_luong = 'OK' if luong_actual and abs(luong_actual - exp['luong']) < 1 else 'FAIL'
    ok_cong = 'OK' if cong_hc_actual and abs(cong_hc_actual - exp['cong_hc']) < 0.01 else 'FAIL'

    if ok_cc == 'FAIL' or ok_luong == 'FAIL' or ok_cong == 'FAIL':
        row_ok = False
        all_pass = False

    print(f'{"OK" if row_ok else "FAIL"} {code} | {name}')
    print(f'  CONG_HC: {cong_hc_actual:.3f} vs HR {exp["cong_hc"]:.3f} [{ok_cong}]')
    print(f'  ChuyenCan: {cc_actual} vs HR {exp["cc"]} [{ok_cc}]')
    print(f'  Luong gio: {luong_actual:.0f} vs HR {exp["luong"]} [{ok_luong}]')
    print()

print('=== SUMMARY ===')
print('All OK:', all_pass)
