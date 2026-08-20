# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/CodeApp/HrP/appBCC')
os.chdir('C:/CodeApp/HrP/appBCC')

# Only import from core_pipeline (which imports ActroFormula)
from core_pipeline import FormulaRegistry
import formulas.actro_formula
import inspect

# Get the actual ActroFormula class that core_pipeline uses
fe = FormulaRegistry.get_formula('Nha may Actro - Vinh Phuc')
af_cls = fe.__class__

print('ActroFormula class from core_pipeline:', af_cls)
print('Source file:', af_cls.__module__)
src = inspect.getsource(af_cls._chuyen_can)
print()
print('Actual _chuyen_can source:')
print(src)
