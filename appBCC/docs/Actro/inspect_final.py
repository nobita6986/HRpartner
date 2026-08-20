import pandas as pd
import numpy as np

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

# Analyze MATCHING employee: A604011714
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
print("HR implied OT (150pct hours): " + str(round(hr_ot, 2)))
print("")

# Get BCC data
header_row_bcc = 7
bcc_row = None
for idx in range(header_row_bcc + 2, len(df_ot)):
    row = df_ot.iloc[idx]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        bcc_row = row
        break

header = df_ot.iloc[header_row_bcc]

# Print ALL headers to understand structure
print("=== ALL HEADERS (row 7, cols 50-75) ===")
for col_idx in range(50, min(75, len(header))):
    val = header.iloc[col_idx]
    print("  Col" + str(col_idx) + ": " + repr(val))

# Print the day 1 block with full headers and values
print("")
print("=== Day 1 block (col 51 onwards) with headers ===")
for col_idx in range(51, min(70, len(header))):
    hval = header.iloc[col_idx]
    bval = bcc_row.iloc[col_idx]
    hstr = repr(hval) if pd.notna(hval) else "N/A"
    bstr = repr(bval) if pd.notna(bval) else "N/A"
    print("  +" + str(col_idx - 51) + " Col" + str(col_idx) + ": header=" + hstr + " value=" + bstr)

# Print summary columns with headers
print("")
print("=== Summary area with headers ===")
for col_idx in range(285, 302):
    h7 = df_ot.iloc[7].iloc[col_idx] if col_idx < len(df_ot.iloc[7]) else ""
    h8 = df_ot.iloc[8].iloc[col_idx] if col_idx < len(df_ot.iloc[8]) else ""
    bval = bcc_row.iloc[col_idx] if col_idx < len(bcc_row) else ""
    h7str = repr(h7) if pd.notna(h7) else "N/A"
    h8str = repr(h8) if pd.notna(h8) else "N/A"
    bstr = repr(bval) if pd.notna(bval) else "N/A"
    print("  Col" + str(col_idx) + ": row7=" + h7str + " row8=" + h8str + " value=" + bstr)

# Now trace: the formula expects 11.68 hours, but we see 12 in Col293
print("")
print("=== Checking summary vs day-by-day ===")
# Col291 = 63 (150% OT, but this is the 8h shift? Let us check)
# Col293 = 12 (matches offset+7 total)

# Let me verify: Col293 = offset+7 sum?
off7_sum = 0
for col_idx, hval in enumerate(header):
    if pd.notna(hval):
        v = str(hval).strip()
        if v.isdigit() and 1 <= int(v) <= 31:
            if col_idx + 7 < len(bcc_row):
                ov = bcc_row.iloc[col_idx + 7]
                if pd.notna(ov):
                    try:
                        off7_sum += float(ov)
                    except:
                        pass

print("offset+7 sum: " + str(off7_sum))
print("Col293 value: " + str(bcc_row.iloc[293]))

# Check if Col291 = offset+3 sum?
off3_sum = 0
for col_idx, hval in enumerate(header):
    if pd.notna(hval):
        v = str(hval).strip()
        if v.isdigit() and 1 <= int(v) <= 31:
            if col_idx + 3 < len(bcc_row):
                ov = bcc_row.iloc[col_idx + 3]
                if pd.notna(ov):
                    try:
                        off3_sum += float(ov)
                    except:
                        pass

print("offset+3 sum: " + str(off3_sum))
print("Col291 value: " + str(bcc_row.iloc[291]))

# Check Col289
print("Col289 value: " + str(bcc_row.iloc[289]))
print("Col290 value: " + str(bcc_row.iloc[290]))

# Now verify the formula with Col293
print("")
print("=== OT RATES in row 8 for summary cols ===")
for col_idx in range(285, 302):
    val = df_ot.iloc[8].iloc[col_idx] if col_idx < len(df_ot.iloc[8]) else ""
    if pd.notna(val):
        print("  Col" + str(col_idx) + ": rate=" + str(val))

# Hmm, Col293 has rate 2, not 1.5
# So Col293 = OT at 200% rate?
# Let me re-verify
# If OT hours at 200% rate = Col293 = 12, then equivalent 150% OT hours = 12 * 2 / 1.5 = 16
# That does not match 11.68

# Maybe the formula is different
# What if: LUONG = CONG_HC * 230769 + OT_hours * 230769 * (rate from row 8)
# where the OT_hours comes from summing the actual hours at each rate

# Let me verify: 26 * 230769 = 6000000
# 10041346 - 6000000 = 4041346
# 4041346 / 230769 = 21.45 (this is the number of days to multiply)
# Or: 4041346 / (230769 * 1.5) = 11.68 hours at 150%

# Actually wait - the matching employee has 12 in Col293 and HR implies 11.68
# The difference is 0.32 which is 2.7% error - this is close but not exact

# Let me search for exact match
print("")
print("=== Searching for exact match in summary columns ===")
target = round(hr_ot, 2)
for col_idx in range(0, 302):
    val = bcc_row.iloc[col_idx] if col_idx < len(bcc_row) else ""
    if pd.notna(val):
        try:
            fval = round(float(val), 2)
            if abs(fval - target) < 0.05:
                print("MATCH Col" + str(col_idx) + ": " + str(fval))
        except:
            pass
