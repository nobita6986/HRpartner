import pandas as pd
import numpy as np

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

print("=== VERIFYING FORMULA: LUONG = CONG_HC * daily_rate + sum(OT_hours * hourly_rate * rate) ===")
print("")

daily_rate = 230769
hourly_rate = daily_rate / 8

# Get 10 employees to test
test_count = 0
for i in range(10, 50):
    if test_count >= 10:
        break
    
    row = df_lcnt.iloc[i]
    emp = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
    luong = row.iloc[304]
    cong_hc = row.iloc[297]
    col291 = float(row.iloc[291]) if pd.notna(row.iloc[291]) else 0
    col292 = float(row.iloc[292]) if pd.notna(row.iloc[292]) else 0
    col293 = float(row.iloc[293]) if pd.notna(row.iloc[293]) else 0
    col294 = float(row.iloc[294]) if pd.notna(row.iloc[294]) else 0
    col295 = float(row.iloc[295]) if pd.notna(row.iloc[295]) else 0
    col296 = float(row.iloc[296]) if pd.notna(row.iloc[296]) else 0
    
    if not emp or pd.isna(luong) or pd.isna(cong_hc):
        continue
    
    # Calculate
    base = float(cong_hc) * daily_rate
    ot = (col291 * 1.5 + col292 * 2.1 + col293 * 2 + col294 * 1.3 + col295 * 2 + col296 * 2.7) * hourly_rate
    calculated = int(base + ot)
    actual = int(float(luong))
    diff = calculated - actual
    
    match = "OK" if abs(diff) < 100 else "DIFF"
    print(emp + ": calculated=" + str(calculated) + " actual=" + str(actual) + " diff=" + str(diff) + " [" + match + "]")
    print("  CONG_HC=" + str(cong_hc) + " Col291=" + str(int(col291)) + " Col293=" + str(int(col293)) + " Col294=" + str(int(col294)) + " Col295=" + str(int(col295)))
    
    test_count += 1
