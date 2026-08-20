$env:PYTHONIOENCODING = "utf-8"
python -c "
import pandas as pd

xl = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx')

# Check Overtime sheet
df_ot = pd.read_excel(xl, sheet_name='Overtime', header=None)

# Print rows 7-9 (header area) for columns 285-302
print('=== Overtime Sheet: Header rows for last columns ===')
for row_idx in [7, 8, 9]:
    row = df_ot.iloc[row_idx]
    for col_idx in range(285, min(302, len(row))):
        val = row.iloc[col_idx] if col_idx < len(row) else ''
        if pd.notna(val) and str(val).strip():
            print(f'  Row{row_idx} Col{col_idx}: {repr(val)}')

# Check row 8 for OT headers
print()
print('=== Row 8 (OT rates) - searching for OT-related headers ===')
row8 = df_ot.iloc[8]
for col_idx, val in enumerate(row8):
    if pd.notna(val):
        v = str(val).strip().lower()
        if any(k in v for k in ['200', 'ot', 'tang', 'dem', 'ca dem', 'sum', 'tong']):
            print(f'  Col{col_idx}: {repr(val)}')

# Find the actual OT summary columns by looking at row 10 (first data row after header)
print()
print('=== Row 10 values for columns 285-302 ===')
row10 = df_ot.iloc[10]
for col_idx in range(285, min(302, len(row10))):
    val = row10.iloc[col_idx] if col_idx < len(row10) else ''
    print(f'  Col{col_idx}: {repr(val)}')

# Check OUT sheet too
df_out = pd.read_excel(xl, sheet_name='OUT', header=None)
print()
print(f'=== OUT Sheet: Shape = {df_out.shape} ===')
print('=== OUT Row 8 (OT rates) ===')
row8_out = df_out.iloc[8]
for col_idx, val in enumerate(row8_out):
    if pd.notna(val):
        v = str(val).strip().lower()
        if any(k in v for k in ['200', 'ot', 'tang', 'dem', 'sum', 'tong']):
            print(f'  Col{col_idx}: {repr(val)}')

# Most importantly: try to match HR's LCN formula
print()
print('=== Checking if any single column in BCC matches HRs OT calculation ===')
# Read LCNT7
xl2 = pd.ExcelFile(r'C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx')
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)
header_row = 9

# Find first non-NaN employee
lcnt_data = None
for i in range(header_row + 1, len(df_lcnt)):
    row = df_lcnt.iloc[i]
    emp_code = row.iloc[1]
    luong = row.iloc[304]
    cong_hc = row.iloc[297]
    if pd.notna(emp_code) and str(emp_code).strip() and pd.notna(luong) and pd.notna(cong_hc):
        lcnt_data = row
        break

if lcnt_data is None:
    print('No valid employee found in LCNT7')
else:
    emp_code = str(lcnt_data.iloc[1]).strip()
    luong_hr = lcnt_data.iloc[304]
    cong_hc_hr = lcnt_data.iloc[297]
    print(f'LCNT7 first employee: {emp_code}, LUONG={luong_hr}, CONG_HC={cong_hc_hr}')
    if pd.notna(luong_hr) and pd.notna(cong_hc_hr):
        daily_rate = 230769
        required_ot = (float(luong_hr) - float(cong_hc_hr) * daily_rate) / (daily_rate * 1.5)
        print(f'HRs implied OT hours: {required_ot}')

    # Find same employee in BCC Overtime sheet
    df_ot2 = pd.read_excel(xl, sheet_name='Overtime', header=None)
    header_row_bcc = 7
    print()
    print(f'Searching for {emp_code} in BCC Overtime sheet...')
    for idx in range(header_row_bcc + 2, len(df_ot2)):
        row = df_ot2.iloc[idx]
        if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp_code:
            excel_row = idx + 1
            print(f'Found at Excel row {excel_row}')
            # Print ALL non-empty values for this row, cols 285-302
            print('BCC values for cols 285-302:')
            for col_idx in range(285, min(302, len(row))):
                val = row.iloc[col_idx] if col_idx < len(row) else ''
                if pd.notna(val) and str(val).strip():
                    print(f'  Col{col_idx}: {val}')
            break
    else:
        print(f'Employee {emp_code} not found in BCC Overtime')

    # Also print the day-by-day OT extraction for this employee
    print()
    print('=== Day-by-day OT extraction for this employee ===')
    for idx in range(header_row_bcc + 2, len(df_ot2)):
        row = df_ot2.iloc[idx]
        if pd.notna(row.iloc[1]) and str(row.iloc[1]).strip() == emp_code:
            # Find day columns - look for numeric headers
            header = df_ot2.iloc[header_row_bcc]
            total_ot_150 = 0
            total_ot_200 = 0
            total_ot_210 = 0
            for col_idx, val in enumerate(header):
                if pd.notna(val):
                    v = str(val).strip()
                    if v.isdigit() and 1 <= int(v) <= 31:
                        day = int(v)
                        # OT at col +3 (OT 150%)
                        ot_val = row.iloc[col_idx + 3] if (col_idx + 3) < len(row) else 0
                        ot_val = float(ot_val) if pd.notna(ot_val) else 0
                        total_ot_150 += ot_val
                        # OT 200% at col +7
                        ot200 = row.iloc[col_idx + 7] if (col_idx + 7) < len(row) else 0
                        ot200 = float(ot200) if pd.notna(ot200) else 0
                        total_ot_200 += ot200
                        # OT 210% at col +8
                        ot210 = row.iloc[col_idx + 8] if (col_idx + 8) < len(row) else 0
                        ot210 = float(ot210) if pd.notna(ot210) else 0
                        total_ot_210 += ot210
            print(f'Total OT 150%: {total_ot_150}')
            print(f'Total OT 200%: {total_ot_200}')
            print(f'Total OT 210%: {total_ot_210}')
            print(f'Total all OT: {total_ot_150 + total_ot_200 + total_ot_210}')

            # Check if OT values are actually in columns 7, 8 relative to day start
            print()
            print('=== Debugging day column structure ===')
            for col_idx, val in enumerate(header):
                if pd.notna(val):
                    v = str(val).strip()
                    if v.isdigit() and int(v) == 1:  # Day 1
                        print(f'Day 1 starts at col {col_idx}')
                        for offset in range(0, 15):
                            cell_val = row.iloc[col_idx + offset] if (col_idx + offset) < len(row) else ''
                            cell_val = float(cell_val) if pd.notna(cell_val) else ''
                            header_val = header.iloc[col_idx + offset] if (col_idx + offset) < len(header) else ''
                            print(f'  +{offset}: header={repr(header_val)}, value={cell_val}')
                        break
            break
"
