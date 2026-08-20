# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '.')

from formulas.formula_registry import FormulaRegistry

FormulaRegistry.load_plugins()

registry = FormulaRegistry._registry
for k in registry.keys():
    if 'Actro' in k:
        with open('exact_project_name.txt', 'w', encoding='utf-8') as f:
            f.write(k)
        print("Done")
