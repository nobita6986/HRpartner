import pandas as pd
import numpy as np

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

print("=== Checking BCC for LƯƠNG column ===")
print("")

# Print BCC row 7 headers (cols 285-302)
print("BCC Row 7 headers (cols 285-302):")
for col_idx in range(285, 302):
    val = df_ot.iloc[7].iloc[col_idx] if col_idx < len(df_ot.iloc[7]) else ""
    if pd.notna(val):
        print("  Col" + str(col_idx) + ": " + repr(val))

print("")
print("BCC Row 8 values (cols 285-302):")
for col_idx in range(285, 302):
    val = df_ot.iloc[8].iloc[col_idx] if col_idx < len(df_ot.iloc[8]) else ""
    if pd.notna(val):
        print("  Col" + str(col_idx) + ": " + repr(val))

# Get one employee
emp = "A601010731"
hr_row = None
for i in range(10, len(df_lcnt)):
    row = df_lcnt.iloc[i]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        hr_row = row
        break

luong = float(hr_row.iloc[304])
cong_hc = float(hr_row.iloc[297])

print("")
print("=== Employee " + emp + " ===")
print("HR LUONG: " + str(int(luong)))
print("HR CONG_HC: " + str(cong_hc))

# Find in BCC
bcc_row = None
for idx in range(9, len(df_ot)):
    row = df_ot.iloc[idx]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        bcc_row = row
        break

if bcc_row is not None:
    print("")
    print("BCC all values for cols 285-302:")
    for col_idx in range(285, 302):
        val = bcc_row.iloc[col_idx] if col_idx < len(bcc_row) else ""
        if pd.notna(val):
            print("  Col" + str(col_idx) + ": " + repr(val))

    # Check if BCC has OT breakdown columns that might help
    # Col289 = total day work hours (8:00~17:00)
    # Col290 = some other total
    # Col291 = shift day OT hours (rate 1.5)
    # Col293 = night day OT hours (rate 2)
    # Col294 = something else (rate 1.3)
    
    print("")
    print("=== OT Structure Analysis ===")
    print("Col289 (Day work total): " + str(bcc_row.iloc[289]))
    print("Col290 (Unknown): " + str(bcc_row.iloc[290]))
    print("Col291 (Shift day, rate 1.5): " + str(bcc_row.iloc[291]))
    print("Col293 (Night day, rate 2): " + str(bcc_row.iloc[293]))
    print("Col294 (Unknown, rate 1.3): " + str(bcc_row.iloc[294]))
    print("Col295 (Sunday, rate 2): " + str(bcc_row.iloc[295]))
    print("Col296 (Unknown, rate 2.7): " + str(bcc_row.iloc[296]))
    
    # Calculate what each OT type contributes
    hourly_rate = 230769 / 8
    col291_val = float(bcc_row.iloc[291]) if pd.notna(bcc_row.iloc[291]) else 0
    col293_val = float(bcc_row.iloc[293]) if pd.notna(bcc_row.iloc[293]) else 0
    col294_val = float(bcc_row.iloc[294]) if pd.notna(bcc_row.iloc[294]) else 0
    col295_val = float(bcc_row.iloc[295]) if pd.notna(bcc_row.iloc[295]) else 0
    
    print("")
    print("=== OT monetary contributions ===")
    print("Base (CONG_HC * daily_rate): " + str(int(cong_hc * 230769)))
    print("Col291 OT at 1.5: " + str(int(col291_val * hourly_rate * 1.5)))
    print("Col293 OT at 2.0: " + str(int(col293_val * hourly_rate * 2)))
    print("Col294 OT at 1.3: " + str(int(col294_val * hourly_rate * 1.3)))
    print("Col295 OT at 2.0: " + str(int(col295_val * hourly_rate * 2)))
    
    base = cong_hc * 230769
    ot_total = col291_val * hourly_rate * 1.5 + col293_val * hourly_rate * 2 + col294_val * hourly_rate * 1.3 + col295_val * hourly_rate * 2
    print("Total calculated: " + str(int(base + ot_total)))
    print("HR LUONG: " + str(int(luong)))
    print("Difference: " + str(int(base + ot_total - luong)))
