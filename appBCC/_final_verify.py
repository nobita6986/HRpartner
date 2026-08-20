# -*- coding: utf-8 -*-
import sys, io, os, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

def sa(s):
    """Strip accents + spaces for robust comparison."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn' and c != ' '
    )

from formulas import formula_registry
formula_registry.FormulaRegistry._registry = {}
formula_registry.FormulaRegistry._accentless_map = {}

from core_pipeline import preview_file
def log(msg): pass

result = preview_file(
    file_path='C:/CodeApp/HrP/appBCC/docs/Actro/BCCActroT7.xlsx',
    project_name='Nha may Actro - Vinh Phuc',
    period_month=7, period_year=2026, holiday_config=None,
    log_callback=log, review_callback=None, sheet_name='Overtime'
)

# HR expected from LCNT7.xlsx
hr = {
    'A601010731': {'cc': 400000, 'sk': 0,      'ds': 298558, 'lh': 10950000},
    'A604011828': {'cc': 200000, 'sk': 431610,  'ds': 287740, 'lh': 9666346},
    'A604011874': {'cc': 200000, 'sk': 429447,  'ds': 286298, 'lh': 10427884},
    'A603011234': {'cc': 400000, 'sk': 0,        'ds': 299279, 'lh': 10794230},
    'A604011872': {'cc': 200000, 'sk': 0,        'ds': 287740, 'lh': 9796153},
}

def find(allowances, kw):
    kw_n = sa(kw.lower())
    for a in allowances:
        nm_n = sa(a.get('name', '').lower())
        if kw_n in nm_n:
            return a['total']
    return None

all_pass = True
for e in result:
    code = e.get('employeeCode', '')
    if code not in hr:
        continue

    pd_ = e.get('payrollData')
    allowances = pd_.get('allowances', []) if pd_ else []
    name = e.get('fullName')
    exp = hr[code]

    cc = find(allowances, 'Chuyên cần')
    sk = find(allowances, 'Soi kinh')
    ds = find(allowances, 'Đời sống')
    lh = pd_.get('summary', {}).get('salaryNormal', 0)

    checks = [
        ('ChuyenCan', cc, exp['cc']),
        ('SoiKinh',   sk, exp['sk']),
        ('DoiSong',   ds, exp['ds']),
        ('Luong',     lh, exp['lh']),
    ]

    row_ok = True
    for k, got, want in checks:
        if got is None:
            ok = 'N/A'
        elif abs(got - want) < 1:
            ok = 'OK'
        else:
            ok = f'FAIL'
            row_ok = False
        print(f'  {k}: {int(got) if got is not None else "N/A"} [{ok}]')

    if not row_ok:
        all_pass = False
    print(f'{"OK" if row_ok else "FAIL"} {code} | {name}')
    print()

print('ALL PASS:', all_pass)
