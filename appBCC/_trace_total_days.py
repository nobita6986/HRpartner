# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

# Monkey-patch calculate to see exactly what's passed
import importlib
import formulas.actro_formula
importlib.reload(formulas.actro_formula)
from formulas.actro_formula import ActroFormula

_orig_calc = ActroFormula.calculate
def traced_calc(self, raw_data):
    td = raw_data.get('total_days')
    kd = raw_data.get('ot_kd')
    ke = raw_data.get('ot_ke')
    ki = raw_data.get('ot_ki')
    cong_hc = (kd + ke + ki) / 8 if all(x is not None for x in [kd, ke, ki]) else None
    print(f'    FORMULA: total_days={td} (type={type(td).__name__}), ot_kd={kd}, ot_ke={ke}, ot_ki={ki}, cong_hc={cong_hc}')
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

targets = ['A601010731', 'A604011828', 'A604011874', 'A603011234', 'A604011872']
print()
for e in result:
    code = e.get('employeeCode', '')
    if code in targets:
        pd_ = e.get('payrollData')
        cc = pd_['allowances'][0]['total'] if pd_ else None
        print(f'{code}: rawData[total_days]={e.get("rawData",{}).get("total_days")}')
        print(f'  CC from allowances[0] = {cc}')
