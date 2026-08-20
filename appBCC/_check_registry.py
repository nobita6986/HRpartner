# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

from formulas import formula_registry
formula_registry.FormulaRegistry._registry = {}
formula_registry.FormulaRegistry._accentless_map = {}

# Clear cache before import
import core_pipeline as cp
import importlib
importlib.reload(cp)

# Check what get_formula returns
fe = formula_registry.FormulaRegistry.get_formula('Nha may Actro - Vinh Phuc')
print('Formula engine:', fe)
print('Type:', type(fe))
