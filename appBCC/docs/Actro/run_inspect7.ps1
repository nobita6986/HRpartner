$env:PYTHONIOENCODING = "utf-8"
python -c "
import pandas as pd
import numpy as np

xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx')
df_ot = pd.read_excel(xl, sheet_name='Overtime', header=None)

# Find first valid employee from LCNT7
xl2 = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx')
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

lcnt_data = None
for i in range(10, len(df_lcnt)):
    row = df_lcnt.iloc[i]
    emp_code = row.iloc[1]
    luong = row.iloc[304]
    cong_hc = row.iloc[297]
    if pd.notna(emp_code) and str(emp_code).strip() and pd.notna(luong) and pd.notna(cong_hc):
        lcnt_data = row
        break

emp_code = str(lcnt_data.iloc[1]).strip()
luong_hr = float(lcnt_data.iloc[304])
cong_hc_hr = float(lcnt_data.iloc[297])
daily_rate = 230769
required_ot = (luong_hr - cong_hc_hr * daily_rate) / (daily_rate * 1.5)

print('=== Employee: ' + emp_code + ' ===')
print('HR LUONG: ' + str(int(luong_hr)))
print('HR CONG_HC: ' + str(cong_hc_hr))
print('HR implied OT hours (150pct): ' + str(round(required_ot, 2)))
print('Row width: ' + str(len(df_ot.columns)))

# Find employee in BCC
header_row_bcc = 7
for idx in range(header_row_bcc + 2, len(df_ot)):
    row = df_ot.iloc[idx]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp_code:
        print('Found at row ' + str(idx + 1))
        
        # Print ALL non-empty values for this row with their column indices
        print()
        print('=== ALL non-empty values for this employee ===')
        for col_idx in range(len(row)):
            val = row.iloc[col_idx]
            if pd.notna(val) and str(val).strip():
                try:
                    fval = float(val)
                    # Check if this could be OT
                    match = abs(fval - required_ot) < 0.5
                    print('Col' + str(col_idx) + ': ' + str(fval) + (' <-- MATCH OT' if match else ''))
                except:
                    print('Col' + str(col_idx) + ': ' + repr(val))
        break

# Also search across all employees in BCC to find any that have OT matching HR calculation
print()
print('=== Searching all employees for OT match ===')
xl3 = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx')
df_lcnt2 = pd.read_excel(xl3, sheet_name=0, header=None)

matches = []
for i in range(10, len(df_lcnt2)):
    lcnt_row = df_lcnt2.iloc[i]
    emp = str(lcnt_row.iloc[1]).strip() if pd.notna(lcnt_row.iloc[1]) else ''
    if not emp:
        continue
    luong = lcnt_row.iloc[304]
    cong_hc = lcnt_row.iloc[297]
    if pd.isna(luong) or pd.isna(cong_hc):
        continue
    
    hr_ot = (float(luong) - float(cong_hc) * 230769) / (230769 * 1.5)
    
    # Find in BCC
    for idx in range(header_row_bcc + 2, len(df_ot)):
        bcc_row = df_ot.iloc[idx]
        if pd.notna(bcc_row.iloc[1]) and str(bcc_row.iloc[1]).strip() == emp:
            header = df_ot.iloc[header_row_bcc]
            
            # Try all offsets
            for off in range(0, 15):
                total = 0
                for col_idx, hval in enumerate(header):
                    if pd.notna(hval):
                        v = str(hval).strip()
                        if v.isdigit() and 1 <= int(v) <= 31:
                            if col_idx + off < len(bcc_row):
                                ov = bcc_row.iloc[col_idx + off]
                                if pd.notna(ov):
                                    try:
                                        total += float(ov)
                                    except:
                                        pass
                if total > 0 and abs(total - hr_ot) < 0.5:
                    matches.append((emp, off, total, round(hr_ot, 2)))
            break

print('Found ' + str(len(matches)) + ' matches:')
for m in matches[:20]:
    print('  ' + m[0] + ' offset+' + str(m[1]) + ': ' + str(m[2]) + ' (HR: ' + str(m[3]) + ')')
"
