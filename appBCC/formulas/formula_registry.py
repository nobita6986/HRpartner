import importlib
import pkgutil
import inspect
import formulas
from formulas.base_formula import BaseFormula
import sys
import os

class FormulaRegistry:
    _registry = {}

    @classmethod
    def load_plugins(cls):
        """Tự động quét thư mục formulas và đăng ký tất cả các class kế thừa BaseFormula"""
        if getattr(sys, 'frozen', False):
            # 1. Load các plugin đi kèm bên trong file exe (được compile sẵn)
            try:
                actro = importlib.import_module("formulas.actro_formula")
                for name, obj in inspect.getmembers(actro, inspect.isclass):
                    if issubclass(obj, BaseFormula) and obj != BaseFormula:
                        instance = obj()
                        cls._registry[instance.project_name] = instance
            except Exception as e:
                print("Lỗi load internal plugin actro_formula:", e)
                
            # 2. Load các plugin bên ngoài (nếu user tạo folder 'formulas' nằm cùng thư mục với .exe)
            exe_dir = os.path.dirname(sys.executable)
            external_formulas = os.path.join(exe_dir, "formulas")
            if os.path.exists(external_formulas):
                if exe_dir not in sys.path:
                    sys.path.insert(0, exe_dir)
                for file in os.listdir(external_formulas):
                    if file.endswith(".py") and file not in ["__init__.py", "base_formula.py", "formula_registry.py"]:
                        module_name = file[:-3]
                        try:
                            module = importlib.import_module(f"formulas.{module_name}")
                            for name, obj in inspect.getmembers(module, inspect.isclass):
                                if issubclass(obj, BaseFormula) and obj != BaseFormula:
                                    instance = obj()
                                    cls._registry[instance.project_name] = instance
                        except Exception as e:
                            print(f"Lỗi load external plugin {module_name}: {e}")
        else:
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
