# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

# Instrument ActroFormula to see what it receives and computes
from formulas.actro_formula import ActroFormula
_orig_calc = ActroFormula.calculate

def traced_calc(self, raw_data):
    td_in = raw_data.get('total_days')
    ot_kd = raw_data.get('ot_kd')
    # Manually compute cong_hc
    kd = float(raw_data.get('ot_kd', 0) or 0)
    ke = float(raw_data.get('ot_ke', 0) or 0)
    ki = float(raw_data.get('ot_ki', 0) or 0)
    cong_hc = (kd + ke + ki) / 8
    # _chuyen_can with the formula's logic
    if cong_hc > 25:
        cc = 400000.0
    elif cong_hc > 24:
        cc = 200000.0
    else:
        cc = 0.0
    print(f'  IN: total_days={td_in}, ot_kd={ot_kd}, cong_hc={(kd+ke+ki)/8:.4f} -> CC={int(cc)}')
    result = _orig_calc(self, raw_data)
    print(f'  OUT: allowances[0]={result["allowances"][0]}')
    return result

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

targets = ['A601010731', 'A604011828']
for e in result:
    if e.get('employeeCode') in targets:
        print(f'Result: {e.get("employeeCode")} CC={e.get("payrollData",{}).get("allowances",[{}])[0].get("total")}')
