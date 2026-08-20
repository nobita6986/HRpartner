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

# Check work_type for target employees
targets = ['A604011828', 'A604011874', 'A601010731']
print('=== work_type hien tai ===')
for e in result:
    code = e.get('employeeCode', '')
    if code in targets:
        rd = e.get('rawData', {})
        print(f'{code}: work_type={repr(rd.get("work_type"))}')

# Also check the traceMap to see what column work_type came from
print()
for e in result:
    code = e.get('employeeCode', '')
    if code in targets:
        tm = e.get('traceMap', {})
        if 'work_type' in tm:
            print(f'{code}: work_type trace = {tm["work_type"]}')
        else:
            print(f'{code}: work_type NOT in traceMap')
