# -*- coding: utf-8 -*-
"""Check BCC Overtime sheet for employee A601010731 day-by-day."""
import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
import pandas as pd

BCC = r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx"
xl = pd.ExcelFile(BCC)
df = xl.parse("Overtime", header=None)

# Find header
h_row = None
for idx, row in df.iterrows():
    vals = " ".join(str(v).lower() for v in row.values if pd.notna(v))
    if "mã thẻ" in vals:
        h_row = idx; break
if h_row is None: h_row = 8
header = df.iloc[h_row]

# Find A601010731
for idx in range(h_row + 2, len(df)):
    row = df.iloc[idx]
    code = str(row.iloc[1]).strip()
    if code != "A601010731": continue
    
    print(f"A601010731: Day-by-day OT extraction")
    print(f"{'Day':>4} {'In':>8} {'Out':>8} {'giờ':>5} {'OT1.5':>6} {'8~17':>6} {'20~22':>6} {'đêm':>5} {'OT2×':>6} {'OT2.1×':>7} {'Tổng':>6}")
    print("-" * 80)
    
    day_starts = {}
    for i, v in enumerate(header):
        sv = str(v).strip()
        if sv.isdigit() and 1 <= int(sv) <= 31:
            day_starts[int(sv)] = i
    
    total_ot_150 = 0; total_ot_2 = 0; total_ot_21 = 0; total_days = 0
    for day in sorted(day_starts.keys()):
        dc = day_starts[day]
        in_v = row.iloc[dc]
        out_v = row.iloc[dc+1]
        gio = row.iloc[dc+2]
        ot_150 = row.iloc[dc+3]
        h8_17 = row.iloc[dc+4]
        h20_22 = row.iloc[dc+5]
        hem = row.iloc[dc+6]
        ot2 = row.iloc[dc+7]
        ot21 = row.iloc[dc+8]
        tong = row.iloc[dc+9]
        
        # Only print days with OT or significant hours
        has_data = (pd.notna(in_v) or pd.notna(out_v))
        has_ot = (pd.notna(ot_150) and ot_150 > 0) or (pd.notna(ot2) and ot2 > 0)
        if not (has_data or has_ot): continue
        
        total_days += 1
        if pd.notna(ot_150): total_ot_150 += float(ot_150)
        if pd.notna(ot2): total_ot_2 += float(ot2)
        if pd.notna(ot21): total_ot_21 += float(ot21)
        
        in_s = str(in_v)[:8] if pd.notna(in_v) else "-"
        out_s = str(out_v)[:8] if pd.notna(out_v) else "-"
        gio_s = f"{float(gio):.1f}" if pd.notna(gio) else "-"
        ot150_s = f"{float(ot_150):.1f}" if pd.notna(ot_150) else "-"
        h8_s = f"{float(h8_17):.1f}" if pd.notna(h8_17) else "-"
        h20_s = f"{float(h20_22):.1f}" if pd.notna(h20_22) else "-"
        hem_s = f"{float(hem):.1f}" if pd.notna(hem) else "-"
        ot2_s = f"{float(ot2):.1f}" if pd.notna(ot2) else "-"
        ot21_s = f"{float(ot21):.1f}" if pd.notna(ot21) else "-"
        tong_s = f"{float(tong):.1f}" if pd.notna(tong) else "-"
        print(f"  {day:>3}: {in_s:>8} {out_s:>8} {gio_s:>5} {ot150_s:>6} {h8_s:>6} {h20_s:>6} {hem_s:>5} {ot2_s:>6} {ot21_s:>7} {tong_s:>6}")
    
    print(f"\nTotal days with data: {total_days}")
    print(f"Total OT 1.5×: {total_ot_150:.1f}")
    print(f"Total OT 2×: {total_ot_2:.1f}")
    print(f"Total OT 2.1×: {total_ot_21:.1f}")
    print(f"Sum OT: {total_ot_150 + total_ot_2 + total_ot_21:.1f}")
    print(f"\nFor comparison, LCNT7 has: p291={70}, p293={12}, p295={11}")
    print(f"LCNT7 sum OT: {70+12+11} = 93")
    break
