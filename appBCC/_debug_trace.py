# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

# Monkey-patch to trace what gets assigned
from formulas import formula_registry
formula_registry.FormulaRegistry._registry = {}
formula_registry.FormulaRegistry._accentless_map = {}

original_load = formula_registry.FormulaRegistry.load_plugins
def traced_load(cls):
    result = original_load()
    print('Registry after load_plugins:', list(cls._registry.keys()))
    print('Accentless map:', list(cls._accentless_map.keys()))
    return result
formula_registry.FormulaRegistry.load_plugins = classmethod(lambda cls: traced_load(cls))

original_calc = None

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

# Check rawData of first employee
e0 = result[0]
rd = e0.get('rawData', {})
print()
print('rawData ot_k* entries:')
for k, v in rd.items():
    if 'ot' in k.lower():
        print(f'  {k} = {v}')
