$env:PYTHONIOENCODING = "utf-8"
python -c "
import pandas as pd
import numpy as np

xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx')
df_ot = pd.read_excel(xl, sheet_name='Overtime', header=None)

# Read LCNT7
xl2 = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx')
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

# Get detailed info for employees that DID match
print('=== Employees with MATCHING OT (offset+7) ===')
matched_employees = ['A604011714', 'A603011234', 'A604011850', 'A604011872', 'A602011047']

for emp in matched_employees:
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
    hr_ot = (luong - cong_hc * 230769) / (230769 * 1.5)
    
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
    
    print()
    print('=== ' + emp + ' ===')
    print('HR: LUONG=' + str(int(luong)) + ' CONG_HC=' + str(cong_hc) + ' implied_OT=' + str(round(hr_ot, 2)))
    
    # Get offset+7 values per day
    header = df_ot.iloc[header_row_bcc]
    ot_vals = []
    for col_idx, hval in enumerate(header):
        if pd.notna(hval):
            v = str(hval).strip()
            if v.isdigit() and 1 <= int(v) <= 31:
                if col_idx + 7 < len(bcc_row):
                    ov = bcc_row.iloc[col_idx + 7]
                    if pd.notna(ov):
                        try:
                            fov = float(ov)
                            if fov > 0:
                                ot_vals.append((int(v), fov))
                        except:
                            pass
    
    total_offset7 = sum(v for _, v in ot_vals)
    print('offset+7 per day: ' + str(ot_vals))
    print('offset+7 total: ' + str(total_offset7))
    
    # Also get other OT columns
    for off_name, off in [('+3', 3), ('+5', 5), ('+6', 6), ('+7', 7), ('+8', 8)]:
        vals = []
        for col_idx, hval in enumerate(header):
            if pd.notna(hval):
                v = str(hval).strip()
                if v.isdigit() and 1 <= int(v) <= 31:
                    if col_idx + off < len(bcc_row):
                        ov = bcc_row.iloc[col_idx + off]
                        if pd.notna(ov):
                            try:
                                fov = float(ov)
                                if fov > 0:
                                    vals.append((int(v), fov))
                            except:
                                pass
        total = sum(v for _, v in vals)
        if total > 0:
            print(off_name + ' total: ' + str(total))

# Now do the same for the NON-matching employee
print()
print('=== NON-MATCHING Employee: A601010731 ===')

# Get HR data
emp = 'A601010731'
hr_row = None
for i in range(10, len(df_lcnt)):
    row = df_lcnt.iloc[i]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp:
        hr_row = row
        break

luong = float(hr_row.iloc[304])
cong_hc = float(hr_row.iloc[297])
hr_ot = (luong - cong_hc * 230769) / (230769 * 1.5)
print('HR: LUONG=' + str(int(luong)) + ' CONG_HC=' + str(cong_hc) + ' implied_OT=' + str(round(hr_ot, 2)))

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
    
    # Get ALL OT-related offsets per day
    for off_name, off in [('+3', 3), ('+4', 4), ('+5', 5), ('+6', 6), ('+7', 7), ('+8', 8)]:
        vals = []
        for col_idx, hval in enumerate(header):
            if pd.notna(hval):
                v = str(hval).strip()
                if v.isdigit() and 1 <= int(v) <= 31:
                    if col_idx + off < len(bcc_row):
                        ov = bcc_row.iloc[col_idx + off]
                        if pd.notna(ov):
                            try:
                                fov = float(ov)
                                if fov > 0:
                                    vals.append((int(v), fov))
                            except:
                                pass
        total = sum(v for _, v in vals)
        if total > 0:
            print(off_name + ' total: ' + str(total) + ' (' + str(len(vals)) + ' days with values)')
            # print first few days
            if len(vals) > 0:
                print('  First 5: ' + str(vals[:5]))

    # Also check if the total OT 150% hours sum to something that makes sense
    print()
    print('=== Trying to reverse-engineer the OT formula ===')
    # If BCC has OT 150%, 200%, 210%, and the formula is:
    # LƯƠNG = CONG_HC * 230769 + OT_150 * 230769 * 1.5 + OT_200 * 230769 * 2 + OT_210 * 230769 * 2.1 + ...
    # Then: 10950000 - 25.875 * 230769 = base OT
    base_ot_value = luong - cong_hc * 230769
    print('LUONG - CONG_HC * daily_rate = ' + str(int(base_ot_value)) + ' (this is total OT monetary value)')
    # At 230769 per 8h day: 
    daily_rate = 230769
    hourly_rate = daily_rate / 8  # = 28846.125
    print('Daily rate: ' + str(daily_rate) + ', Hourly rate: ' + str(round(hourly_rate, 2)))
    
    # If all OT is at 150%:
    all_150_equiv = base_ot_value / (hourly_rate * 1.5)
    print('If all OT at 150pct, equivalent hours: ' + str(round(all_150_equiv, 2)))
    
    # What if the day-level OT (col +3) is in hours?
    # For employee A601010731, +3 total = 81
    # If those are hours (not days), then monetary value = 81 * hourly_rate * 1.5 = 81 * 28846 * 1.5 = 3,506,949
    all_150_money = 81 * hourly_rate * 1.5
    print('If +3 (81h) is OT hours at 150pct: monetary = ' + str(int(all_150_money)))
    
    # What combinations could give us the remaining?
    remaining_after_150 = base_ot_value - all_150_money
    print('Remaining after 150pct OT: ' + str(int(remaining_after_150)))
    
    # At 200% rate: remaining / (hourly_rate * 2)
    if remaining_after_150 > 0:
        remaining_hours_200 = remaining_after_150 / (hourly_rate * 2)
        print('Remaining at 200pct equivalent: ' + str(round(remaining_hours_200, 2)) + ' hours')
        # +5 total = 35, +6 total = 72, +7 total = 12
        # Total non-150 OT = 35+72+12 = 119
        non_150_total = 35 + 72 + 12
        print('BCC non-150 OT total (+5+6+7): ' + str(non_150_total))
        non_150_money = non_150_total * hourly_rate * 2
        print('At 200pct: ' + str(int(non_150_money)))
"
