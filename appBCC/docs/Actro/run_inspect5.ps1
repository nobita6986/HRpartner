$env:PYTHONIOENCODING = "utf-8"
python -c "
import pandas as pd
import numpy as np

xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx')
df_ot = pd.read_excel(xl, sheet_name='Overtime', header=None)

print('=== Overtime Sheet Header Analysis (cols 51-70 for day 1 area) ===')
header = df_ot.iloc[7]
for col_idx in range(51, min(75, len(header))):
    val = header.iloc[col_idx]
    if pd.notna(val) and str(val).strip():
        print('  Col' + str(col_idx) + ': ' + repr(val))

print()
print('=== Row 8 - OT rate multipliers (cols 51-70) ===')
row8 = df_ot.iloc[8]
for col_idx in range(51, min(75, len(row8))):
    val = row8.iloc[col_idx]
    if pd.notna(val):
        print('  Col' + str(col_idx) + ': ' + repr(val))

# Find first valid employee
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

print()
print('=== Employee: ' + emp_code + ' ===')
print('HR LUONG: ' + str(int(luong_hr)))
print('HR CONG_HC: ' + str(cong_hc_hr))
print('HR implied OT hours (150 pct): ' + str(round(required_ot, 2)))

# Find employee in BCC and extract OT
header_row_bcc = 7
for idx in range(header_row_bcc + 2, len(df_ot)):
    row = df_ot.iloc[idx]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp_code:
        print('Found at row ' + str(idx + 1))
        
        # Extract day-by-day OT using correct offsets (+3=150%, +5=200%, +6=210%)
        header = df_ot.iloc[header_row_bcc]
        ot_150 = 0
        ot_200 = 0
        ot_210 = 0
        
        for col_idx, val in enumerate(header):
            if pd.notna(val):
                v = str(val).strip()
                if v.isdigit() and 1 <= int(v) <= 31:
                    # OT 150%: +3
                    v3 = row.iloc[col_idx + 3] if col_idx + 3 < len(row) else 0
                    try: ot_150 += float(v3) if pd.notna(v3) else 0
                    except: pass
                    # OT 200%: +5
                    v5 = row.iloc[col_idx + 5] if col_idx + 5 < len(row) else 0
                    try: ot_200 += float(v5) if pd.notna(v5) else 0
                    except: pass
                    # OT 210%: +6
                    v6 = row.iloc[col_idx + 6] if col_idx + 6 < len(row) else 0
                    try: ot_210 += float(v6) if pd.notna(v6) else 0
                    except: pass
        
        print()
        print('Day-by-day extraction (using +3=150pct, +5=200pct, +6=210pct):')
        print('  OT 150 pct: ' + str(ot_150))
        print('  OT 200 pct: ' + str(ot_200))
        print('  OT 210 pct: ' + str(ot_210))
        print('  Total OT hours: ' + str(ot_150 + ot_200 + ot_210))
        
        # Try different OT combinations to match HR
        print()
        print('=== Matching against HR calculation ===')
        # Only 150%
        if ot_150 > 0:
            match_150 = abs(ot_150 - required_ot) < 0.5
            print('OT 150pct only (' + str(round(ot_150, 2)) + ') vs HR (' + str(round(required_ot, 2)) + '): match=' + str(match_150))
        
        # 150% + 200%
        if ot_150 + ot_200 > 0:
            match_150_200 = abs((ot_150 + ot_200) - required_ot) < 0.5
            print('OT 150pct+200pct (' + str(round(ot_150 + ot_200, 2)) + ') vs HR (' + str(round(required_ot, 2)) + '): match=' + str(match_150_200))
        
        # All combined
        total_bcc = ot_150 + ot_200 + ot_210
        if total_bcc > 0:
            match_all = abs(total_bcc - required_ot) < 0.5
            print('All OT combined (' + str(round(total_bcc, 2)) + ') vs HR (' + str(round(required_ot, 2)) + '): match=' + str(match_all))
        
        # Also check if any single column in the summary area matches
        print()
        print('=== Checking summary columns for this employee ===')
        for col_idx in range(285, min(302, len(row))):
            val = row.iloc[col_idx]
            if pd.notna(val):
                try:
                    fval = float(val)
                    if fval > 0:
                        match = abs(fval - required_ot) < 0.5
                        print('Col ' + str(col_idx) + ': ' + str(fval) + ' -> match HR OT: ' + str(match))
                except:
                    pass
        break
"
