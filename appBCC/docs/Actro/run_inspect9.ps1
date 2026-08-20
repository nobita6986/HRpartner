$env:PYTHONIOENCODING = "utf-8"
python -c "
import pandas as pd
import numpy as np

xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx')
df_ot = pd.read_excel(xl, sheet_name='Overtime', header=None)

xl2 = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx')
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

# Analyze MATCHING employee: A604011714
emp = 'A604011714'

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

print('=== MATCHING Employee: ' + emp + ' ===')
print('HR LUONG: ' + str(int(luong)))
print('HR CONG_HC: ' + str(cong_hc))
print('HR implied OT (150pct hours): ' + str(round(hr_ot, 2)))
print()

# Get BCC data
header_row_bcc = 7
bcc_row = None
for idx in range(header_row_bcc + 2, len(df_ot)):
    row = df_ot.iloc[idx]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        bcc_row = row
        break

if bcc_row is not None:
    header = df_ot.iloc[header_row_bcc]
    
    # Get all OT offsets per day
    results = {}
    for off in range(0, 15):
        vals = []
        for col_idx, hval in enumerate(header):
            if pd.notna(hval):
                v = str(hval).strip()
                if v.isdigit() and 1 <= int(v) <= 31:
                    if col_idx + off < len(bcc_row):
                        ov = bcc_row.iloc[col_idx + off]
                        if pd.notna(ov):
                            try:
                                vals.append(float(ov))
                            except:
                                pass
        total = sum(vals)
        if len(vals) > 0:
            results[off] = (total, len(vals))
    
    print('All offsets (offset: [total, day_count]):')
    for off, (total, count) in sorted(results.items()):
        print('  +' + str(off) + ': total=' + str(total) + ' days=' + str(count))

    print()
    # The match is +7 = 12. So HR uses offset+7 as the OT hours
    # Verify: 12 * 230769 * 1.5 / 8 = 12 * 28846.125 = ?
    hourly_rate = 230769 / 8  # 28846.125
    match_hours = results.get(7, (0, 0))[0]
    print('Verification:')
    print('BCC +7 hours: ' + str(match_hours))
    print('Hourly OT rate at 150pct: ' + str(round(hourly_rate * 1.5, 2)))
    print('OT monetary value: ' + str(int(match_hours * hourly_rate * 1.5)))
    print('Expected LUONG: ' + str(int(cong_hc * 230769 + match_hours * hourly_rate * 1.5)))
    print('Actual LUONG: ' + str(int(luong)))
    print()

    # Now try to understand what other offsets mean
    # If +7 = 12 hours, and +6 = 72, and the rate for +6 is 210%?
    # 72 hours at 210% hourly rate = 72 * hourly_rate * 2.1
    # But that's way more than the LUONG
    
    # Actually, let me check if the formula is different
    # Maybe: LƯƠNG = CÔNG_HC * 230769 + (sum of some offsets) * 230769 * some_factor
    
    # Try: +3 hours
    h3 = results.get(3, (0, 0))[0]
    h5 = results.get(5, (0, 0))[0]
    h6 = results.get(6, (0, 0))[0]
    h7 = results.get(7, (0, 0))[0]
    
    print('Offset breakdown:')
    print('  +3 total: ' + str(h3))
    print('  +5 total: ' + str(h5))
    print('  +6 total: ' + str(h6))
    print('  +7 total: ' + str(h7))
    
    # Check if +7 / (h5 + h6 + h7) makes sense
    if h7 > 0:
        print('  h7/h5 ratio: ' + str(round(h7 / h5, 2)) + ' (expected: hours at 200pct vs 150pct)')
        print('  h7/h6 ratio: ' + str(round(h7 / h6, 2)) + ' (expected: hours at 210pct vs 150pct)')

# Now look at the summary columns (285-302) for this employee
print()
print('=== Summary columns for ' + emp + ' ===')
for col_idx in range(285, min(302, len(bcc_row))):
    val = bcc_row.iloc[col_idx]
    if pd.notna(val) and str(val).strip():
        try:
            fval = float(val)
            print('  Col' + str(col_idx) + ': ' + str(fval))
        except:
            print('  Col' + str(col_idx) + ': ' + repr(val))

# Check headers at row 7, 8, 9 for summary columns
print()
print('=== Summary column headers (rows 7-9) ===')
for row_idx in [7, 8, 9]:
    row = df_ot.iloc[row_idx]
    for col_idx in range(285, min(302, len(row))):
        val = row.iloc[col_idx]
        if pd.notna(val) and str(val).strip():
            print('  Row' + str(row_idx) + ' Col' + str(col_idx) + ': ' + repr(val))
"
