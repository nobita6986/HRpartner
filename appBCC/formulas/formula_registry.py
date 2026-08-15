import importlib
import pkgutil
import inspect
import formulas
from formulas.base_formula import BaseFormula

class FormulaRegistry:
    _registry = {}

    @classmethod
    def load_plugins(cls):
        """Tự động quét thư mục formulas và đăng ký tất cả các class kế thừa BaseFormula"""
        for _, module_name, _ in pkgutil.iter_modules(formulas.__path__):
            # Bỏ qua các file base
            if module_name in ["base_formula", "formula_registry"]:
                continue
                
            module = importlib.import_module(f"formulas.{module_name}")
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if issubclass(obj, BaseFormula) and obj != BaseFormula:
                    instance = obj()
                    cls._registry[instance.project_name] = instance

    @classmethod
    def get_all_projects(cls) -> list:
        if not cls._registry:
            cls.load_plugins()
        return list(cls._registry.keys())

    @classmethod
    def get_formula(cls, project_name: str) -> BaseFormula:
        if not cls._registry:
            cls.load_plugins()
        return cls._registry.get(project_name)
