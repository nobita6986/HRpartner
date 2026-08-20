import pandas as pd
import numpy as np

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

print("=== Comparing LCNT7 vs BCC for same employees ===")
print("")

# Get first 10 employees from LCNT7 that have data
test_employees = []
for i in range(10, 30):
    row = df_lcnt.iloc[i]
    emp = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
    luong = row.iloc[304]
    cong_hc = row.iloc[297]
    col291 = row.iloc[291]
    col293 = row.iloc[293]
    if emp and pd.notna(luong) and pd.notna(cong_hc):
        test_employees.append((emp, luong, cong_hc, col291, col293))

header = df_ot.iloc[7]  # BCC header row

for emp, luong, cong_hc, lcnt291, lcnt293 in test_employees:
    # Find in BCC
    bcc_row = None
    for idx in range(9, len(df_ot)):
        row = df_ot.iloc[idx]
        if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
            bcc_row = row
            break
    
    if bcc_row is None:
        continue
    
    bcc291 = bcc_row.iloc[291] if pd.notna(bcc_row.iloc[291]) else 0
    bcc293 = bcc_row.iloc[293] if pd.notna(bcc_row.iloc[293]) else 0
    bcc294 = bcc_row.iloc[294] if pd.notna(bcc_row.iloc[294]) else 0
    bcc295 = bcc_row.iloc[295] if pd.notna(bcc_row.iloc[295]) else 0
    
    # Calculate HR implied OT
    daily_rate = 230769
    hourly_rate = daily_rate / 8
    implied_ot_hours = (float(luong) - float(cong_hc) * daily_rate) / (hourly_rate * 1.5)
    
    # Check if LCNT7 matches BCC
    lcnt291_match = "SAME" if (pd.isna(lcnt291) and pd.isna(bcc291)) or lcnt291 == bcc291 else "DIFF"
    lcnt293_match = "SAME" if (pd.isna(lcnt293) and pd.isna(bcc293)) or lcnt293 == bcc293 else "DIFF"
    
    print("Employee: " + emp)
    print("  LCNT7: LUONG=" + str(int(luong)) + " CONG_HC=" + str(cong_hc) + " Col291=" + str(lcnt291) + " Col293=" + str(lcnt293))
    print("  BCC:    Col291=" + str(bcc291) + " Col293=" + str(bcc293) + " Col294=" + str(bcc294) + " Col295=" + str(bcc295))
    print("  Match: Col291=" + lcnt291_match + " Col293=" + lcnt293_match)
    print("  Implied OT hours: " + str(round(implied_ot_hours, 2)))
    print("")
