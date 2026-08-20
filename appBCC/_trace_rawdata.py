# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

# Trace exactly what raw_data['total_days'] becomes
# Patch ActroFormula.calculate to print its input
from formulas.actro_formula import ActroFormula
_orig_calc = ActroFormula.calculate

def traced_calc(self, raw_data):
    td = raw_data.get('total_days')
    print(f'  Formula input: total_days={td}, ot_kd={raw_data.get("ot_kd")}')
    return _orig_calc(self, raw_data)

ActroFormula.calculate = traced_calc

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

# Now check rawData of each target
targets = ['A601010731', 'A604011828', 'A604011874', 'A603011234', 'A604011872']
for e in result:
    code = e.get('employeeCode', '')
    if code in targets:
        rd = e.get('rawData', {})
        print(f'{code}: rawData[total_days]={rd.get("total_days")}')
