import pandas as pd
import numpy as np

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

print("=== COMPREHENSIVE FORMULA TEST ===")
print("")

# Test employees that had matches with offset+7
test_employees = ["A604011714", "A603011234", "A604011850", "A604011872", "A602011047"]

for emp in test_employees:
    # Get HR data
    hr_row = None
    for i in range(10, len(df_lcnt)):
        row = df_lcnt.iloc[i]
        if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
            hr_row = row
            break
    
    if hr_row is None:
        continue
        
    luong = float(hr_row.iloc[304])
    cong_hc = float(hr_row.iloc[297])
    daily_rate = 230769
    
    # Get BCC data
    header_row_bcc = 7
    bcc_row = None
    for idx in range(header_row_bcc + 2, len(df_ot)):
        row = df_ot.iloc[idx]
        if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
            bcc_row = row
            break
    
    if bcc_row is None:
        continue
    
    # Get summary values
    col291 = bcc_row.iloc[291] if pd.notna(bcc_row.iloc[291]) else 0
    col292 = bcc_row.iloc[292] if pd.notna(bcc_row.iloc[292]) else 0
    col293 = bcc_row.iloc[293] if pd.notna(bcc_row.iloc[293]) else 0
    col294 = bcc_row.iloc[294] if pd.notna(bcc_row.iloc[294]) else 0
    col295 = bcc_row.iloc[295] if pd.notna(bcc_row.iloc[295]) else 0
    col296 = bcc_row.iloc[296] if pd.notna(bcc_row.iloc[296]) else 0
    
    print("=== " + emp + " ===")
    print("HR: LUONG=" + str(int(luong)) + " CONG_HC=" + str(cong_hc))
    print("BCC: Col291=" + str(col291) + " Col292=" + str(col292) + " Col293=" + str(col293) + " Col294=" + str(col294) + " Col295=" + str(col295) + " Col296=" + str(col296))
    
    # Try various formulas
    # Formula 1: (CONG_HC + col293 + col294) * daily_rate
    f1 = (cong_hc + col293 + col294) * daily_rate
    print("F1 (CONG_HC + Col293 + Col294) * rate: " + str(int(f1)) + " diff=" + str(int(f1 - luong)))
    
    # Formula 2: CONG_HC * daily_rate + (col293 + col294 * 1.3/2) * 8 * hourly_rate * 1.5
    hourly_rate = daily_rate / 8
    f2 = cong_hc * daily_rate + (col293 + col294 * 1.3/2) * 8 * hourly_rate * 1.5
    print("F2: " + str(int(f2)) + " diff=" + str(int(f2 - luong)))
    
    # Formula 3: CONG_HC * daily_rate + (col291 + col293 * 2/1.5) * 8 * hourly_rate * 1.5
    f3 = cong_hc * daily_rate + (col291 + col293 * 2/1.5) * 8 * hourly_rate * 1.5
    print("F3: " + str(int(f3)) + " diff=" + str(int(f3 - luong)))
    
    # Formula 4: CONG_HC * daily_rate + (col291 + col293 + col294) * 8 * hourly_rate * 1.5
    f4 = cong_hc * daily_rate + (col291 + col293 + col294) * 8 * hourly_rate * 1.5
    print("F4: " + str(int(f4)) + " diff=" + str(int(f4 - luong)))
    
    # Formula 5: Just offset+7 hours * hourly_rate * 1.5
    header = df_ot.iloc[header_row_bcc]
    offset7_sum = 0
    for col_idx, hval in enumerate(header):
        if pd.notna(hval):
            v = str(hval).strip()
            if v.isdigit() and 1 <= int(v) <= 31:
                if col_idx + 7 < len(bcc_row):
                    ov = bcc_row.iloc[col_idx + 7]
                    if pd.notna(ov):
                        try:
                            offset7_sum += float(ov)
                        except:
                            pass
    f5 = cong_hc * daily_rate + offset7_sum * hourly_rate * 1.5
    print("F5 (offset7 sum only): " + str(int(f5)) + " diff=" + str(int(f5 - luong)) + " offset7=" + str(offset7_sum))
    
    # Formula 6: Maybe the daily rate is different - try 200000
    f6 = cong_hc * 200000 + (col291 + col293 + col294) * 200000 * 1.5
    print("F6 (rate=200000): " + str(int(f6)) + " diff=" + str(int(f6 - luong)))
    
    # Formula 7: Maybe col291, col293, col294 are ALREADY in 8h units
    # So col291 = 63 means 63 * 8 = 504 hours
    f7 = cong_hc * daily_rate + (col291 * 8 + col293 * 8 * 2/1.5 + col294 * 8 * 1.3/1.5) * hourly_rate * 1.5
    print("F7 (8h units): " + str(int(f7)) + " diff=" + str(int(f7 - luong)))
    
    # Formula 8: col291 + col293 + col294 as full 8h shifts
    f8 = (cong_hc + col291 + col293 + col294) * daily_rate
    print("F8 (all as shifts): " + str(int(f8)) + " diff=" + str(int(f8 - luong)))
    
    # Formula 9: Check if (col293 + col294) directly equals implied OT hours
    implied_ot = (luong - cong_hc * daily_rate) / (hourly_rate * 1.5)
    print("Implied OT hours: " + str(round(implied_ot, 2)))
    print("col293 + col294 = " + str(col293 + col294))
    print("col291 = " + str(col291))
    
    print("")
