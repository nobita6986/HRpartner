# -*- coding: utf-8 -*-
"""Check appBCC result for A602010881"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from core_pipeline import preview_file
from formulas.formula_registry import FormulaRegistry

FormulaRegistry.load_plugins()

result = preview_file(
    r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx',
    'Nhà máy Actro - Vĩnh Phúc',
    7, 2026,
    log_callback=lambda x: None
)

# Find A602010881
emp = None
for e in result:
    if str(e.get('employeeCode', '')).strip() == 'A602010881':
        emp = e
        break

if not emp:
    print("Employee not found!")
    exit(1)

print(f"=== appBCC Data for A602010881 - {emp.get('fullName')} ===\n")

# Daily OT breakdown
daily = emp.get('dailyData', [])
ot_total_days = 0
ot_total_nights = 0
ot_total_sundays = 0

for day in daily:
    if day.get('ot', 0) > 0 or day.get('status') != 'ABSENT':
        date = day.get('date', '')
        day_type = day.get('dayTypeKey', '')
        shift = day.get('shiftTypeKey', '')
        ot_day = day.get('ot_day', 0)
        ot_night = day.get('ot_night', 0)
        ot_sun = day.get('ot_sun', 0)
        status = day.get('status', '')
        total_ot = ot_day + ot_night + ot_sun
        if total_ot > 0 or status == 'OVERTIME':
            print(f"  {date}: {day_type} {shift} - ot_day={ot_day}, ot_night={ot_night}, ot_sun={ot_sun}")

# Raw data
raw = emp.get('rawData', {})
print(f"\n=== Raw Data from BCC summary columns ===")
print(f"  ot_kc: {raw.get('ot_kc')}")
print(f"  ot_kd: {raw.get('ot_kd')}")
print(f"  ot_ke: {raw.get('ot_ke')}")
print(f"  ot_kf: {raw.get('ot_kf')}")
print(f"  ot_kh: {raw.get('ot_kh')}")
print(f"  ot_ki: {raw.get('ot_ki')}")
print(f"  ot_kj: {raw.get('ot_kj')}")
print(f"  ot_kk: {raw.get('ot_kk')}")
print(f"  total_days: {raw.get('total_days')}")
print(f"  absent_days: {raw.get('absent_days')}")

# Payroll
payroll = emp.get('payrollData', {}).get('summary', {})
print(f"\n=== Payroll Summary ===")
print(f"  LƯƠNG (totalSalary): {payroll.get('totalSalary', 0):,.0f}")
print(f"  Chuyên cần: {payroll.get('totalAllowance', 0):,.0f} (need breakdown)")
print(f"  Thực nhận: {payroll.get('netIncome', 0):,.0f}")

# Allowances breakdown
allowances = emp.get('payrollData', {}).get('allowances', [])
print(f"\n=== Allowances Breakdown ===")
for a in allowances:
    print(f"  {a.get('name')}: {a.get('total', 0):,.0f}")

# Compare with HR
print(f"\n=== HR Expected ===")
print(f"  LƯƠNG: 7,246,154")
print(f"  CÔNG HC: 20")
print(f"  Chuyên cần: 0 (có vắng)")
print(f"  Đời sống: 230,769")
print(f"  Thanh toán: 7,476,923")
print(f"  Thực nhận: 7,476,000")

# Find why Chuyên cần = 0
print(f"\n=== Analysis ===")
print(f"  Absent days: {raw.get('absent_days')}")
absent = raw.get('absent_days', 0)
if absent == 0:
    print(f"  → Chuyên cần should be 400,000")
elif absent == 1:
    print(f"  → Chuyên cần should be 200,000")
else:
    print(f"  → Chuyên cần = 0 ✓")