import pandas as pd
import numpy as np

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

# Employee A604011714
emp = "A604011714"

# Get HR data
hr_row = None
for i in range(10, len(df_lcnt)):
    row = df_lcnt.iloc[i]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        hr_row = row
        break

luong = float(hr_row.iloc[304])
cong_hc = float(hr_row.iloc[297])
hr_ot = (luong - cong_hc * 230769) / (230769 * 1.5)

print("=== Employee: " + emp + " ===")
print("HR LUONG: " + str(int(luong)))
print("HR CONG_HC: " + str(cong_hc))
print("HR implied OT (150% hours): " + str(round(hr_ot, 2)))
print("")

# Get BCC data
header_row_bcc = 7
bcc_row = None
for idx in range(header_row_bcc + 2, len(df_ot)):
    row = df_ot.iloc[idx]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        bcc_row = row
        break

# BCC Summary values:
# Col291 = 63 (rate 1.5 - Shift day)
# Col293 = 12 (rate 2 - Night day)
# Col294 = 72 (rate 1.3)
# Col295 = 0 (rate 2 - Sunday)
# Col296 = 0 (rate 2.7)

print("BCC Summary values:")
print("  Col291 (rate 1.5): " + str(bcc_row.iloc[291]))
print("  Col293 (rate 2): " + str(bcc_row.iloc[293]))
print("  Col294 (rate 1.3): " + str(bcc_row.iloc[294]))
print("  Col295 (rate 2): " + str(bcc_row.iloc[295]))
print("  Col296 (rate 2.7): " + str(bcc_row.iloc[296]))

# Try formula: LƯƠNG = (CONG_HC + weighted_OT) * 230769
# where weighted_OT = Col293 + Col294 * 1.3/2 + Col295 * 2/2 + Col296 * 2.7/2
# Wait, that is wrong. Let me try again.

# Actually: LƯƠNG = (CONG_HC + OT_units) * 230769
# where OT_units = Col291 * 1.5/2 + Col293 * 2/2 + Col294 * 1.3/2 + Col295 * 2/2 + Col296 * 2.7/2

print("")
print("=== Testing formula: LƯƠNG = (CONG_HC + weighted_OT) * daily_rate ===")

# Option 1: Just Col293 (offset+7, rate 2)
weighted_ot = bcc_row.iloc[293] * 2 / 2  # = 12
calculated = (cong_hc + weighted_ot) * 230769
print("Option 1 (Col293 only, rate 2): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Option 2: Col291 + Col293
weighted_ot = bcc_row.iloc[291] * 1.5 / 2 + bcc_row.iloc[293] * 2 / 2
calculated = (cong_hc + weighted_ot) * 230769
print("Option 2 (Col291 + Col293): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Option 3: Col293 + Col294
weighted_ot = bcc_row.iloc[293] * 2 / 2 + bcc_row.iloc[294] * 1.3 / 2
calculated = (cong_hc + weighted_ot) * 230769
print("Option 3 (Col293 + Col294): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Option 4: Col291 + Col293 + Col294
weighted_ot = bcc_row.iloc[291] * 1.5 / 2 + bcc_row.iloc[293] * 2 / 2 + bcc_row.iloc[294] * 1.3 / 2
calculated = (cong_hc + weighted_ot) * 230769
print("Option 4 (Col291 + Col293 + Col294): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Option 5: Col293 + Col294 + Col295 + Col296
weighted_ot = bcc_row.iloc[293] + bcc_row.iloc[294] * 1.3/2 + bcc_row.iloc[295] * 2/2 + bcc_row.iloc[296] * 2.7/2
calculated = (cong_hc + weighted_ot) * 230769
print("Option 5 (Col293 + weighted others): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Option 6: Col291 + Col293 + Col294 + Col295 + Col296
weighted_ot = bcc_row.iloc[291] * 1.5/2 + bcc_row.iloc[293] + bcc_row.iloc[294] * 1.3/2 + bcc_row.iloc[295] * 2/2 + bcc_row.iloc[296] * 2.7/2
calculated = (cong_hc + weighted_ot) * 230769
print("Option 6 (all weighted): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Option 7: Just use Col293 directly (no rate conversion)
weighted_ot = bcc_row.iloc[293]
calculated = (cong_hc + weighted_ot) * 230769
print("Option 7 (Col293 direct): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Option 8: Col293 * rate
weighted_ot = bcc_row.iloc[293] * 2
calculated = (cong_hc + weighted_ot) * 230769
print("Option 8 (Col293 * rate): " + str(int(calculated)) + " vs " + str(int(luong)) + " diff=" + str(int(calculated - luong)))

# Check: what is 26 + 117.6?
print("")
print("=== Check ===")
print("CONG_HC + (Col293 + Col294) = " + str(cong_hc) + " + (" + str(bcc_row.iloc[293]) + " + " + str(bcc_row.iloc[294]) + ") = " + str(cong_hc + bcc_row.iloc[293] + bcc_row.iloc[294]))
print("(26 + 84) * 230769 = " + str(int((26 + 84) * 230769)))
print("HR LUONG = " + str(int(luong)))

# So the formula is: LƯƠNG = (CONG_HC + Col293 + Col294) * 230769
# This is exactly correct for this employee!

print("")
print("=== CONFIRMED FORMULA ===")
print("LƯƠNG = (CONG_HC + Col293 + Col294) * daily_rate")
weighted_ot = bcc_row.iloc[293] + bcc_row.iloc[294]
calculated = (cong_hc + weighted_ot) * 230769
print("Verification: (" + str(cong_hc) + " + " + str(int(bcc_row.iloc[293])) + " + " + str(int(bcc_row.iloc[294])) + ") * 230769 = " + str(int(calculated)))
print("Matches HR: " + str(calculated == luong))
