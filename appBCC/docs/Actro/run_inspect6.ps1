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

# Find employee in BCC
header_row_bcc = 7
for idx in range(header_row_bcc + 2, len(df_ot)):
    row = df_ot.iloc[idx]
    if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp_code:
        print('Found at row ' + str(idx + 1))
        header = df_ot.iloc[header_row_bcc]
        
        # Find day 1 position
        day1_col = None
        for col_idx, val in enumerate(header):
            if pd.notna(val) and str(val).strip() == '1':
                day1_col = col_idx
                break
        
        if day1_col:
            print()
            print('=== Full day 1 block structure (cols ' + str(day1_col) + ' to ' + str(day1_col + 12) + ') ===')
            for offset in range(0, 12):
                col_idx = day1_col + offset
                hdr = header.iloc[col_idx] if col_idx < len(header) else ''
                val = row.iloc[col_idx] if col_idx < len(row) else ''
                print('  +' + str(offset) + ' Col' + str(col_idx) + ': header=' + repr(hdr) + ' value=' + repr(val))
        
        # Now try different extraction methods to find OT that matches HR
        print()
        print('=== Trying different OT extraction patterns ===')
        
        # Pattern 1: Use +3 as OT 150%
        ot_150_v1 = 0
        # Pattern 2: Use +5 as OT 200%
        ot_200_v1 = 0
        # Pattern 3: Use +6 as OT 210%
        ot_210_v1 = 0
        
        for col_idx, val in enumerate(header):
            if pd.notna(val):
                v = str(val).strip()
                if v.isdigit() and 1 <= int(v) <= 31:
                    # Try various offsets
                    for offset_name, offset_val in [('+3', 3), ('+4', 4), ('+5', 5), ('+6', 6), ('+7', 7), ('+8', 8)]:
                        if col_idx + offset_val < len(row):
                            ov = row.iloc[col_idx + offset_val]
                            if pd.notna(ov):
                                try:
                                    fov = float(ov)
                                    key = 'ot_' + offset_name
                                    if key not in dir():
                                        exec(key + ' = {}')
                                    pass
                                except:
                                    pass
        
        # Simpler: try specific combinations
        ot_at_3 = {}
        ot_at_4 = {}
        ot_at_5 = {}
        ot_at_6 = {}
        ot_at_7 = {}
        ot_at_8 = {}
        
        for col_idx, val in enumerate(header):
            if pd.notna(val):
                v = str(val).strip()
                if v.isdigit() and 1 <= int(v) <= 31:
                    for off, d in [(3, ot_at_3), (4, ot_at_4), (5, ot_at_5), (6, ot_at_6), (7, ot_at_7), (8, ot_at_8)]:
                        if col_idx + off < len(row):
                            ov = row.iloc[col_idx + off]
                            if pd.notna(ov):
                                try:
                                    d[int(v)] = float(ov)
                                except:
                                    pass
        
        print('Values at +3 per day: ' + str(ot_at_3))
        print('Values at +4 per day: ' + str(ot_at_4))
        print('Values at +5 per day: ' + str(ot_at_5))
        print('Values at +6 per day: ' + str(ot_at_6))
        print('Values at +7 per day: ' + str(ot_at_7))
        print('Values at +8 per day: ' + str(ot_at_8))
        
        total_3 = sum(ot_at_3.values())
        total_4 = sum(ot_at_4.values())
        total_5 = sum(ot_at_5.values())
        total_6 = sum(ot_at_6.values())
        total_7 = sum(ot_at_7.values())
        total_8 = sum(ot_at_8.values())
        
        print()
        print('Sum at +3: ' + str(total_3) + ' (match: ' + str(abs(total_3 - required_ot) < 0.5) + ')')
        print('Sum at +4: ' + str(total_4) + ' (match: ' + str(abs(total_4 - required_ot) < 0.5) + ')')
        print('Sum at +5: ' + str(total_5) + ' (match: ' + str(abs(total_5 - required_ot) < 0.5) + ')')
        print('Sum at +6: ' + str(total_6) + ' (match: ' + str(abs(total_6 - required_ot) < 0.5) + ')')
        print('Sum at +7: ' + str(total_7) + ' (match: ' + str(abs(total_7 - required_ot) < 0.5) + ')')
        print('Sum at +8: ' + str(total_8) + ' (match: ' + str(abs(total_8 - required_ot) < 0.5) + ')')
        
        # Try combinations
        for combo_name, combo_vals in [
            ('3+5', [total_3, total_5]),
            ('3+6', [total_3, total_6]),
            ('3+7', [total_3, total_7]),
            ('3+8', [total_3, total_8]),
            ('5+6', [total_5, total_6]),
            ('5+7', [total_5, total_7]),
            ('5+8', [total_5, total_8]),
            ('6+7', [total_6, total_7]),
            ('6+8', [total_6, total_8]),
            ('7+8', [total_7, total_8]),
            ('3+5+6', [total_3, total_5, total_6]),
            ('3+5+7', [total_3, total_5, total_7]),
            ('3+5+8', [total_3, total_5, total_8]),
            ('3+6+7', [total_3, total_6, total_7]),
            ('3+6+8', [total_3, total_6, total_8]),
            ('3+7+8', [total_3, total_7, total_8]),
            ('4+5+6', [total_4, total_5, total_6]),
            ('4+5+7', [total_4, total_5, total_7]),
            ('4+6+7', [total_4, total_6, total_7]),
            ('5+6+7', [total_5, total_6, total_7]),
            ('5+6+8', [total_5, total_6, total_8]),
            ('5+7+8', [total_5, total_7, total_8]),
            ('6+7+8', [total_6, total_7, total_8]),
            ('3+4+5+6', [total_3, total_4, total_5, total_6]),
            ('3+5+6+7', [total_3, total_5, total_6, total_7]),
            ('3+5+6+8', [total_3, total_5, total_6, total_8]),
            ('4+5+6+7', [total_4, total_5, total_6, total_7]),
            ('5+6+7+8', [total_5, total_6, total_7, total_8]),
        ]:
            combo_sum = sum(combo_vals)
            match = abs(combo_sum - required_ot) < 0.5
            if match:
                print('MATCH: ' + combo_name + ' = ' + str(round(combo_sum, 2)) + ' (HR: ' + str(round(required_ot, 2)) + ')')
        
        break
"
