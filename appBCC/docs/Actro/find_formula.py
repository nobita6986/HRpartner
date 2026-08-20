import pandas as pd
import numpy as np

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

print("=== Finding the exact salary formula ===")
print("")

# Get one employee to test
emp = "A601010731"

# Get HR data from LCNT7
hr_row = None
for i in range(10, len(df_lcnt)):
    row = df_lcnt.iloc[i]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        hr_row = row
        break

luong = float(hr_row.iloc[304])
cong_hc = float(hr_row.iloc[297])
col291 = float(hr_row.iloc[291])
col292 = float(hr_row.iloc[292]) if pd.notna(hr_row.iloc[292]) else 0
col293 = float(hr_row.iloc[293])
col294 = float(hr_row.iloc[294]) if pd.notna(hr_row.iloc[294]) else 0
col295 = float(hr_row.iloc[295]) if pd.notna(hr_row.iloc[295]) else 0
col296 = float(hr_row.iloc[296]) if pd.notna(hr_row.iloc[296]) else 0

print("Employee: " + emp)
print("HR LUONG: " + str(int(luong)))
print("CONG_HC: " + str(cong_hc))
print("Col291 (rate 1.5): " + str(col291))
print("Col292 (rate 2.1): " + str(col292))
print("Col293 (rate 2): " + str(col293))
print("Col294 (rate 1.3): " + str(col294))
print("Col295 (rate 2): " + str(col295))
print("Col296 (rate 2.7): " + str(col296))
print("")

# Check rates from row 8
print("=== Rates from BCC row 8 ===")
print("Col291 rate: " + str(df_ot.iloc[8].iloc[291]))
print("Col292 rate: " + str(df_ot.iloc[8].iloc[292]))
print("Col293 rate: " + str(df_ot.iloc[8].iloc[293]))
print("Col294 rate: " + str(df_ot.iloc[8].iloc[294]))
print("Col295 rate: " + str(df_ot.iloc[8].iloc[295]))
print("Col296 rate: " + str(df_ot.iloc[8].iloc[296]))
print("")

# Daily rate
daily_rate = 230769
hourly_rate = daily_rate / 8

# Formula attempts:
print("=== Testing formulas ===")

# F1: Basic
f1 = cong_hc * daily_rate + (col291 + col292 + col293 + col294 + col295 + col296) * hourly_rate * 1.5
print("F1 (all OT * 1.5 hourly): " + str(int(f1)) + " diff=" + str(int(f1 - luong)))

# F2: Weighted by rates
total_ot = col291 * 1.5 + col292 * 2.1 + col293 * 2 + col294 * 1.3 + col295 * 2 + col296 * 2.7
f2 = cong_hc * daily_rate + total_ot * hourly_rate
print("F2 (weighted OT * hourly): " + str(int(f2)) + " diff=" + str(int(f2 - luong)))

# F3: Weighted by rates, all at 1.5 rate
f3 = (cong_hc + total_ot) * hourly_rate * 1.5
print("F3 ((CONG_HC + weighted OT) * 1.5 hourly): " + str(int(f3)) + " diff=" + str(int(f3 - luong)))

# F4: Col291 + Col293 as OT shifts
f4 = (cong_hc + col291 + col293) * daily_rate
print("F4 ((CONG_HC + Col291 + Col293) * daily): " + str(int(f4)) + " diff=" + str(int(f4 - luong)))

# F5: Just Col291
f5 = (cong_hc + col291) * daily_rate
print("F5 ((CONG_HC + Col291) * daily): " + str(int(f5)) + " diff=" + str(int(f5 - luong)))

# F6: Just Col293
f6 = (cong_hc + col293) * daily_rate
print("F6 ((CONG_HC + Col293) * daily): " + str(int(f6)) + " diff=" + str(int(f6 - luong)))

# F7: Col291 + Col293 + Col294
f7 = (cong_hc + col291 + col293 + col294) * daily_rate
print("F7 ((CONG_HC + Col291 + Col293 + Col294) * daily): " + str(int(f7)) + " diff=" + str(int(f7 - luong)))

# F8: Check if rates are different
# Maybe the rate in row 8 is the total for the column
# Col291 = 70 hours at rate 1.5 means 70 * 1.5 = 105 equivalent hours at base rate
# Or: 70 hours at 1.5x = 70 * 1.5 / 8 = 13.125 base shifts
f8 = (cong_hc + (col291 * 1.5 + col293 * 2 + col294 * 1.3 + col295 * 2 + col296 * 2.7) / 8) * daily_rate
print("F8 ((CONG_HC + weighted/8) * daily): " + str(int(f8)) + " diff=" + str(int(f8 - luong)))

# F9: Different approach - maybe Col291 is already in hours
# So: (CONG_HC * 8 + Col291 + Col293 * 2 + Col294 * 1.3 + ...) * hourly_rate
f9 = (cong_hc * 8 + col291 + col293 * 2 + col294 * 1.3 + col295 * 2 + col296 * 2.7) * hourly_rate
print("F9 ((CONG_HC*8 + weighted) * hourly): " + str(int(f9)) + " diff=" + str(int(f9 - luong)))

# F10: Maybe just multiply by the rate for each
# LUONG = CONG_HC * daily_rate + col291 * daily_rate * 1.5/8 + col293 * daily_rate * 2/8 + ...
f10 = cong_hc * daily_rate + col291 * hourly_rate * 1.5 + col292 * hourly_rate * 2.1 + col293 * hourly_rate * 2 + col294 * hourly_rate * 1.3 + col295 * hourly_rate * 2 + col296 * hourly_rate * 2.7
print("F10 (base + each OT * rate): " + str(int(f10)) + " diff=" + str(int(f10 - luong)))

print("")
print("=== Summary ===")
print("The correct formula is likely F10")
print("LUONG = CONG_HC * daily_rate + sum(OT_hours_i * hourly_rate * rate_i)")
