from formulas.base_formula import BaseFormula

class ActroFormula(BaseFormula):
    
    @property
    def project_name(self) -> str:
        return "Nhà máy Actro - Vĩnh Phúc"
        
    def get_check_columns(self) -> dict:
        return {
            "Tổng ngày công (Ngày)": "total_days",
            "Giờ làm ngày thường (Giờ)": "normal_hours",
            "Giờ OT 150% (Giờ)": "ot_150",
            "Giờ OT 200% (Giờ)": "ot_200",
            "Giờ OT 210% (Giờ)": "ot_210",
            "Ngày vắng (Ngày)": "absent_days"
        }

    def calculate(self, raw_data: dict) -> dict:
        """
        Logic tính lương giả lập cho Nhà máy Actro.
        Thực tế: Lấy từ `raw_data` do Agent Mapper đẩy vào.
        """
        # Giả lập tham số lương cơ bản
        base_salary_per_month = raw_data.get("base_salary", 5200000)
        hourly_rate = base_salary_per_month / 26 / 8 # Lương 1 giờ
        
        # Lấy giờ công (thực tế lấy từ raw_data)
        normal_hours = raw_data.get("normal_hours", 208)
        ot_130 = raw_data.get("ot_130", 0)
        ot_150 = raw_data.get("ot_150", 0)
        ot_180 = raw_data.get("ot_180", 0)
        ot_200 = raw_data.get("ot_200", 0)
        ot_210 = raw_data.get("ot_210", 0)
        ot_250 = raw_data.get("ot_250", 0)
        ot_260 = raw_data.get("ot_260", 0)
        sunday_200 = raw_data.get("sunday_200", 0)
        sunday_night_240 = raw_data.get("sunday_night_240", 0)
        sunday_night_270 = raw_data.get("sunday_night_270", 0)
        holiday_300 = raw_data.get("holiday_300", 0)
        holiday_night_390 = raw_data.get("holiday_night_390", 0)
        
        # Lấy phụ cấp
        chuyen_can = 300000 if raw_data.get("absent_days", 0) == 0 else 0
        suat_an_rate = 25000
        suat_an_qty = raw_data.get("total_days", 26)
        
        # Tính phần A
        salary_items = [
            self.create_payroll_item("Tổng giờ làm việc ngày thường 100%", normal_hours, hourly_rate),
            self.create_payroll_item("Tổng giờ tăng ca ngày thường 150%", ot_150, hourly_rate * 1.5),
            self.create_payroll_item("Tổng giờ hành chính đêm 130%", ot_130, hourly_rate * 1.3),
            self.create_payroll_item("Tổng giờ tăng ca đêm 180%", ot_180, hourly_rate * 1.8),
            self.create_payroll_item("Tổng giờ tăng ca đêm 200%", ot_200, hourly_rate * 2.0),
            self.create_payroll_item("Tổng giờ tăng ca 210%", ot_210, hourly_rate * 2.1),
            self.create_payroll_item("Tổng giờ chủ nhật 200%", sunday_200, hourly_rate * 2.0),
            self.create_payroll_item("Tổng giờ chủ nhật đêm 270%", sunday_night_270, hourly_rate * 2.7),
            self.create_payroll_item("Tổng giờ chủ nhật đêm 240%", sunday_night_240, hourly_rate * 2.4),
            self.create_payroll_item("Tổng giờ tăng ca 250%", ot_250, hourly_rate * 2.5),
            self.create_payroll_item("Tổng giờ tăng ca 260%", ot_260, hourly_rate * 2.6),
            self.create_payroll_item("Làm thêm ngày lễ 300%", holiday_300, hourly_rate * 3.0),
            self.create_payroll_item("Tổng giờ 390% lễ đêm", holiday_night_390, hourly_rate * 3.9),
            self.create_payroll_item("Trợ cấp làm đêm ngày thường 30%", 0, hourly_rate * 0.3),
            self.create_payroll_item("Trợ cấp ca đêm ngày thường 50%", 0, hourly_rate * 0.5),
            self.create_payroll_item("Trợ cấp làm đêm chủ nhật 70%", 0, hourly_rate * 0.7),
            self.create_payroll_item("Trợ cấp ca đêm ngày lễ 90%", 0, hourly_rate * 0.9),
        ]
        
        # Phần B
        allowances = [
            {"name": "Thưởng chuyên cần", "qty": None, "rate": None, "total": chuyen_can},
            {"name": "Phụ cấp đời sống", "qty": None, "rate": None, "total": 500000},
            {"name": "Phụ cấp thâm niên", "qty": None, "rate": None, "total": 200000},
            {"name": "Phụ cấp suất ăn", "qty": suat_an_qty, "rate": suat_an_rate, "total": suat_an_qty * suat_an_rate},
            {"name": "Phụ cấp công đoạn/ phòng sạch", "qty": None, "rate": None, "total": 0},
            {"name": "Phụ cấp soi kính", "qty": None, "rate": None, "total": 0},
            {"name": "Thưởng sản lượng/KPI", "qty": None, "rate": None, "total": 1000000},
            {"name": "Các khoản phụ cấp/ thưởng khác", "qty": None, "rate": None, "total": 0},
            {"name": "Bù lương", "qty": None, "rate": None, "total": 0},
        ]
        
        # Phần D
        deductions = [
            {"name": "Bảo hiểm", "qty": None, "rate": None, "total": base_salary_per_month * 0.105}, # 10.5%
            {"name": "Ứng lương", "qty": None, "rate": None, "total": 0},
            {"name": "Khấu trừ đồng phục", "qty": None, "rate": None, "total": 0},
            {"name": "Khấu trừ tiền ăn", "qty": None, "rate": None, "total": 0},
            {"name": "Khấu trừ khác", "qty": None, "rate": None, "total": 0},
        ]
        
        # Tổng hợp
        total_salary = sum(item["total"] for item in salary_items)
        total_allowance = sum(item["total"] for item in allowances)
        gross_income = total_salary + total_allowance
        total_deduction = sum(item["total"] for item in deductions)
        net_income = gross_income - total_deduction
        
        return {
            "salaryItems": salary_items,
            "allowances": allowances,
            "deductions": deductions,
            "summary": {
                "totalSalary": total_salary,
                "totalAllowance": total_allowance,
                "grossIncome": gross_income,
                "totalDeduction": total_deduction,
                "netIncome": net_income
            }
        }
