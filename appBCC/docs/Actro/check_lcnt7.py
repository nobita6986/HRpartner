import pandas as pd
import numpy as np

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

xl2 = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx")
df_lcnt = pd.read_excel(xl2, sheet_name=0, header=None)

# Print LCNT7 headers
print("=== LCNT7 Headers (row 9) ===")
header_row = 9
lcnt_header = df_lcnt.iloc[header_row]
for col_idx in range(0, min(320, len(lcnt_header))):
    val = lcnt_header.iloc[col_idx]
    if pd.notna(val) and str(val).strip():
        print("  Col" + str(col_idx) + ": " + repr(val))

print("")
print("=== LCNT7 Sample Employee Data (first 5 employees) ===")
for i in range(header_row + 1, header_row + 6):
    row = df_lcnt.iloc[i]
    emp = row.iloc[1] if pd.notna(row.iloc[1]) else ""
    luong = row.iloc[304] if 304 < len(row) else ""
    cong_hc = row.iloc[297] if 297 < len(row) else ""
    if emp:
        print("Row " + str(i) + ": " + str(emp) + " LUONG=" + str(luong) + " CONG_HC=" + str(cong_hc))

# Now let's check what columns 297 and 304 are in LCNT7
print("")
print("=== LCNT7 Col 297 and 304 Headers ===")
print("Col 297: " + repr(lcnt_header.iloc[297]))
print("Col 304: " + repr(lcnt_header.iloc[304]))

# Let me also check if there is any OT column in LCNT7
print("")
print("=== LCNT7 Searching for OT-related columns ===")
for col_idx in range(0, min(320, len(lcnt_header))):
    val = lcnt_header.iloc[col_idx]
    if pd.notna(val):
        v = str(val).lower()
        if any(k in v for k in ["ot", "tang", "đêm", "đem", "dem", "ca", "sum", "tong", "200", "150"]):
            print("  Col" + str(col_idx) + ": " + repr(val))
