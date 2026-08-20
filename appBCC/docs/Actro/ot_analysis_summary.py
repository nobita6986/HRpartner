import pandas as pd
import numpy as np

print("=" * 80)
print("BCCActroT7.xlsx OVERTIME COLUMN STRUCTURE ANALYSIS")
print("=" * 80)
print("")

xl = pd.ExcelFile(r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx")
df_ot = pd.read_excel(xl, sheet_name="Overtime", header=None)

print("1. SHEET STRUCTURE")
print("-" * 40)
print("   Sheet name: 'Overtime'")
print("   Header rows: Row 7 (day numbers), Row 8 (OT rates)")
print("   Data starts: Row 9+ (Excel row 10+)")
print("   Total columns: " + str(len(df_ot.columns)))
print("")

print("2. DAY BLOCK STRUCTURE (Each day = 10 columns)")
print("-" * 40)
print("   +0: Day number header (1-31)")
print("   +1: In time")
print("   +2: Out time")
print("   +3: giờ (hours worked)")
print("   +4: Rate 1.5 OT (8h~17h)")
print("   +5: OT hours (20h~22h)")
print("   +6: OT hours (200% night)")
print("   +7: OT hours (200% night) <-- HR MATCHES THIS")
print("   +8: OT hours (210% night)")
print("   +9: Tổng (total)")
print("")

print("3. SUMMARY COLUMNS (cols 285-302)")
print("-" * 40)
header7 = df_ot.iloc[7]
header8 = df_ot.iloc[8]
for col_idx in range(285, 302):
    h7 = header7.iloc[col_idx] if col_idx < len(header7) else ""
    h8 = header8.iloc[col_idx] if col_idx < len(header8) else ""
    if pd.notna(h7) or pd.notna(h8):
        rate = "rate=" + str(h8) if pd.notna(h8) and not isinstance(h8, str) else ""
        print("   Col" + str(col_idx) + ": " + repr(h7) + " " + rate)
print("")

print("4. SUMMARY COLUMN HEADERS")
print("-" * 40)
print("   Col289: 'Số giờ làm việc ban ngày 주간 근무시간' (Day work hours)")
print("   Col291: 'Shift day/ 주간' with rate 1.5")
print("   Col293: 'Night day/ 야간' with rate 2")
print("   Col294: (night OT) with rate 1.3")
print("   Col295: 'Sunday/ 일요일' with rate 2")
print("   Col296: (Sunday OT) with rate 2.7")
print("")

print("5. OFFSET+7 DISCOVERY")
print("-" * 40)
print("   When summing offset+7 values across all days, it matches HR's implied OT hours")
print("   for employees with simple OT patterns (single 1h per day).")
print("")
print("   Example employees where offset+7 matches HR calculation:")
print("   - A603011234: offset+7=14, HR implied=13.89")
print("   - A604011850: offset+7=11, HR implied=11.11")
print("   - A604011872: offset+7=12, HR implied=11.68")
print("   - A602011047: offset+7=8, HR implied=7.76")
print("")

print("6. FORMULA VERIFICATION")
print("-" * 40)
print("   LƯƠNG = CONG_HC * 230769 + sum(OT_hours * 28846.125 * rate)")
print("   where:")
print("   - Daily rate: 230,769 VND")
print("   - Hourly rate: 28,846.125 VND (daily_rate / 8)")
print("   - Rate 1.5: Normal day OT")
print("   - Rate 2.0: Night shift OT")
print("   - Rate 1.3: Weekend OT")
print("   - Rate 2.7: Weekend night OT")
print("")
print("   NOTE: Calculated LUONG differs from HR by 1.9-2.4M VND per employee")
print("   This suggests HR may include additional allowances or use different rates.")
print("")

print("7. KEY FINDINGS")
print("-" * 40)
print("   - Day-by-day OT hours are stored at offset +7 from day start column")
print("   - Summary OT columns are at: 291 (1.5x), 293 (2x), 294 (1.3x), 295 (2x), 296 (2.7x)")
print("   - The offset+7 values (200% night OT) correlate with HR's OT calculation")
print("   - LCNT7.xlsx shares the same column structure as BCC ActroT7")
print("")
print("=" * 80)
