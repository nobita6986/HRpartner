# -*- coding: utf-8 -*-
"""Correct OT extraction from BCC: Side A = day shift, Side B = night shift.
Each day has 10 sub-cols. Side A (in/out/giờ/OT_1.5/8~17/20~22/giờ_đêm/OT_200/OT_210/tổng),
Side B same structure.
LCNT columns: p291=Day OT, p293=Night OT, p295=Sunday OT."""
import sys, codecs, re
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

import pandas as pd
from datetime import datetime, date

def sf(v):
    if pd.isna(v): return 0.0
    try: return float(v)
    except: return 0.0

BCC = r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx"
LCNT = r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx"
HR = 28846.153846153848
BASE = 6_000_000

# ─── LCNT7 ───────────────────────────────────────────────────────────────────
xl_l = pd.ExcelFile(LCNT)
df_l = pd.read_excel(xl_l, sheet_name=0, header=None)
employees = {}
for idx in range(10, len(df_l)):
    row = df_l.iloc[idx]
    code = str(row.iloc[1]).strip()
    name = str(row.iloc[2]).strip()
    if not code or code in ('nan','None','') or len(code) < 5: continue
    if not re.search(r'[a-zA-ZÀ-ỹ]', name): continue
    nv = row.iloc[3]
    ngay_vao = None
    if pd.notna(nv):
        try:
            if isinstance(nv, datetime): ngay_vao = nv.date()
            elif isinstance(nv, date): ngay_vao = nv
            else:
                for fmt in ("%Y-%m-%d","%d/%m/%Y","%m/%d/%Y"):
                    try: ngay_vao = datetime.strptime(str(nv).strip(),fmt).date(); break
                    except: pass
        except: pass
    employees[code] = {
        "code": code, "name": name, "ngay_vao": ngay_vao,
        "luong": sf(row.iloc[304]),
        "cong_hc": sf(row.iloc[297]),
        "p291": sf(row.iloc[291]),
        "p293": sf(row.iloc[293]),
        "p295": sf(row.iloc[295]),
        "cc": sf(row.iloc[305]),
        "doi_song": sf(row.iloc[307]),
        "tham_nien": sf(row.iloc[309]),
        "soi_kinh": sf(row.iloc[306]),
        "nha_o": sf(row.iloc[308]),
        "thanh_toan": sf(row.iloc[310]),
        "tru_ung": sf(row.iloc[311]),
        "thuc_nhan": sf(row.iloc[312]),
    }

# ─── BCC Overtime sheet ──────────────────────────────────────────────────────
xl_b = pd.ExcelFile(BCC)
df_b = pd.read_excel(xl_b, sheet_name="Overtime", header=None)

h_row = None
for idx, row in df_b.iterrows():
    vals = " ".join(str(v).lower() for v in row.values if pd.notna(v))
    if "mã thẻ" in vals:
        h_row = idx; break
if h_row is None: h_row = 8

# BCC structure per day:
# Each day = 10 sub-cols: +0=In, +1=Out, +2=giờ, +3=OT_1.5, +4=8~17, +5=20~22, +6=giờ_đêm, +7=OT_200, +8=OT_210, +9=Tổng
# BUT the sheet has Side A (cols 51-60) and Side B (cols 61-70) per day
# Side A = "day shift" pattern
# Side B = "night shift" pattern
# Side A: +3=OT_150, +4=8h~17h, +5=20h~22h(?), +6=giờ_đêm, +7=OT_200, +8=OT_210, +9=Tổng
# Side B: same pattern but for the second shift

# From header inspection:
# col 51 = "In" (day 1 Side A)
# col 57 = "Số giờ làm đêm" 
# col 58 = "200% ca dem" (OT at 2×)
# col 59 = "210% 야간 잔업" (OT at 2.1×)
# col 60 = "Tổng" (total night hours)
# col 61 = "In" (day 1 Side B)

# ACTUAL offsets verified from employee data:
# Side A (day shift): +3=OT_1.5, +4=8h~17h, +5=20h~22h, +6=giờ_đêm(night hrs worked), +7=OT_200(night OT), +8=OT_210(night OT extra), +9=Tổng
# Side B (night shift): same offsets

# CORRECT EXTRACTION:
# OT_day from Side A: +3
# OT_night from Side A: +7 (night OT at 2×)
# HC_day from Side A: +4 (hours 8h~17h)
# HC_night from Side A: +6 (night hours worked)
# Total night hours (for OT base): +6 + +7 (regular night + OT)

# But LCNT p291 = Day OT, p293 = Night OT (BCC_night_210 matches!)
# BCC_night_210 was extracted as col+8, but LCNT says it matches p293
# So: col+8 = night OT at 2× (NOT 2.1×)
# And col+7 = night OT at 2.1× (NOT 2×)

# WAIT - from my earlier extract_bcc_ot.py:
# I found: BCC_night_210 (col+8) matched p293 (LCNT Night OT)
# Let me re-verify with CORRECT offsets

# From inspect_bcc_subcols.py output for A601010731:
# +3=2.0 (OT_1.5), +4=nan (8h~17h), +5=2 (20h~22h), +6=6 (giờ_đêm), +7=1 (OT_200?), +8=nan (OT_210?)
# Wait: col+7=1 for A601010731 but p293=12. So +8 should be the main night OT?
# col+8=nan, but p293=12. So my offsets are wrong!

# NEW DISCOVERY from inspect_bcc_subcols.py:
# Row 9 (sub-header): col 48="200% ca dem", col 49="210%", col 50="Tổng"
# This means cols 48-50 are the NIGHT section for the PREVIOUS days block (before day 1)
# Col 51 onwards is Day 1 structure
# But wait - col 48 = "200% ca dem" appears BEFORE col 51 "In"!

# Let me re-examine. The headers are:
# Row 8: col 51="1", col 61="2", col 71="3" (day numbers)
# Row 9: col 51="In", col 52="Out", col 53="giờ", col 54="1.5", col 55="8h~17h", col 56="20h~22h", col 57="Số giờ làm đêm", col 58="200%", col 59="210%", col 60="Tổng"
# Col 61="In" (day 2 starts)

# From employee data:
# A601010731 day 1 (col 51+):
# +3=2.0 (OT_1.5), +5=2 (20h~22h?), +6=6 (giờ_đêm), +7=1 (200% OT?)
# A605011899 day 1 (col 51+):
# +3=3.0 (OT_1.5), +4=8 (8h~17h), +5=nan, +6=nan, +7=nan
# So +4=8h~17h, +5=20h~22h? or is +5 night hours?

# A601010731: +5=2, +6=6, +7=1
# If +4=8h~17h (0 for night worker), +5=20h~22h (2 hours?), +6=giờ_đêm (6 hours?), +7=OT_200 (1 hour?)
# But total 2+6=8 hours for night shift ✓ and OT=1 hour

# NEW INTERPRETATION:
# +3 = OT_1.5 (hours at 1.5×)
# +4 = 8h~17h (day hours worked)  
# +5 = 20h~22h (evening hours worked)
# +6 = giờ_đêm (night hours worked)
# +7 = OT_200 (night OT hours at 2×)
# +8 = OT_210 (night OT hours at 2.1×)
# +9 = Tổng (total night shift hours)

# For A601010731 day 1: +3=2, +4=0, +5=2, +6=6, +7=1, +8=0, +9=9
# Total = 2+0+2+6+1 = 11 hours. OT = 1 hour at 2×. This makes sense!

# For A605011899 day 1: +3=3, +4=8, +5=0, +6=0, +7=0, +8=0, +9=3
# Day shift: 8 regular + 3 OT at 1.5×. Total = 11. ✓

# Now what about the LCNT matching?
# BCC_night_210 (col+8) matched p293 (LCNT Night OT = 12 for A601010731)
# But BCC col+8 for day 1 = 0! So p293 is NOT col+8.

# Let me reconsider. In my extract_bcc_ot.py, I extracted:
# ot_night_210 at col+8 = 32 for A601010731
# But in inspect_bcc_subcols.py, col+8 = nan for day 1!

# The difference: extract_bcc_ot.py summed across ALL days (using col+8), 
# but inspect_bcc_subcols.py showed only day 1 (col 51+8 = 59)

# Wait, col+8 for day 1 = col 59. But col 59 in the header is... 
# Row 9: col 57="Số giờ làm đêm", col 58="200%", col 59="210%", col 60="Tổng"
# So col 59 in header = "210%" (OT rate 2.1×)
# And the data value at col 59 for A601010731 day 1... was it 0?

# From the inspect output for A601010731 day 1:
# +7 (col 58) = 1 (OT_200), +8 (col 59) = nan, +9 (col 60) = 3
# Wait: +9 = 3? But Tổng = 3? That doesn't match 2+6+1=10?

# I'm confused. Let me re-read the inspect output carefully:
# A601010731 day 1:
# +0=20:00 (In), +1=08:00 (Out), +2=8 (giờ), +3=2.0 (OT_1.5), +4=nan (8h~17h), +5=2 (20h~22h), +6=6 (giờ_đêm), +7=1 (200%), +8=nan (210%), +9=3 (Tổng)
# Total: 8 regular + 2 OT1.5 + 6 night regular + 1 night OT = 17 hours. Shift is 12 hours (20:00 to 08:00).
# 6 night regular + 1 OT + 2 OT_1.5 = 9 hours. Total = 8+9=17? No...

# Wait, if In=20:00 and Out=08:00, the shift is 12 hours.
# Hours worked: 20:00-22:00 (2h), 22:00-04:00 (6h), 04:00-08:00 (4h) = 12 hours total.
# But col+2=8 (giờ)? This might be hours within normal range (8h~17h = 0, 20h~22h = 2?)
# Actually: giờ (col+2) = 8, means total REGULAR hours = 8
# +4=8h~17h = 0 (no day shift hours), +5=20h~22h = 2 (evening), +6=giờ_đêm = 6 (night)
# 0+2+6 = 8. ✓
# +7=OT_200 = 1 (night OT at 2×)
# +8=OT_210 = 0
# +9=Tổng = 3? Shouldn't this be total night hours = 6+1 = 7?

# Hmm, +9 might be something else. Let me check: total hours at night rate?
# Or: +9 is the total of some specific subset?

# OK let me just sum ALL of cols +3 through +8 for each day and compare to LCNT
# And separately check which column matches which LCNT column

bcc_ot = {}
for idx in range(h_row + 2, len(df_b)):
    row = df_b.iloc[idx]
    code = str(row.iloc[1]).strip()
    if not code or code in ('nan','None','') or code not in employees: continue
    
    # For each day, extract:
    # +3 = OT_1.5 (day OT)
    # +4 = 8h~17h (day regular hours)
    # +5 = 20h~22h (evening hours)
    # +6 = night regular hours
    # +7 = OT_200
    # +8 = OT_210
    # +9 = Tổng
    
    # CORRECT offsets from header analysis:
    # Side A: day 1 starts at col 51, day 2 at col 61, day 3 at col 71
    # Each day has 10 subcols
    
    # I need to find the actual offsets for each day
    # From header: row 8 has day numbers at col 51="1", 61="2", 71="3"
    # Each day = 10 cols
    
    ot_day = 0.0    # OT at 1.5× (col+3)
    ot_night_200 = 0.0  # OT at 2× (col+7)
    ot_night_210 = 0.0  # OT at 2.1× (col+8)
    
    # Find day start columns
    header = df_b.iloc[h_row]
    day_starts = {}
    for i, v in enumerate(header):
        sv = str(v).strip()
        if sv.isdigit() and 1 <= int(sv) <= 31:
            day_starts[int(sv)] = i
    
    for day, dc in sorted(day_starts.items()):
        # Side A sub-cols (cols dc through dc+9)
        # +3 = OT_1.5, +7 = OT_200, +8 = OT_210
        ot_day += sf(row.iloc[dc+3]) if (dc+3) < len(row) else 0
        ot_night_200 += sf(row.iloc[dc+7]) if (dc+7) < len(row) else 0
        ot_night_210 += sf(row.iloc[dc+8]) if (dc+8) < len(row) else 0
    
    bcc_ot[code] = {
        "ot_day": ot_day,
        "ot_night_200": ot_night_200,
        "ot_night_210": ot_night_210,
    }

# ─── VERIFY MATCHING ──────────────────────────────────────────────────────────────
print(f"{'='*130}")
print("Verify BCC extraction vs LCNT OT columns")
print(f"{'='*130}")
print(f"{'Code':<15} | {'BCC_day':>8} {'BCC_n200':>9} {'BCC_n210':>9} | {'p291':>7} {'p293':>7} {'p295':>7} | {'Diff_day':>9} {'Diff_n200':>10} {'Diff_n210':>10}")
for code in list(employees.keys())[:20]:
    e = employees[code]
    ot = bcc_ot.get(code, {})
    print(f"{code:<15} | "
          f"{ot.get('ot_day',0):>8.1f} {ot.get('ot_night_200',0):>9.1f} {ot.get('ot_night_210',0):>9.1f} | "
          f"{e['p291']:>7.1f} {e['p293']:>7.1f} {e['p295']:>7.1f} | "
          f"{ot.get('ot_day',0)-e['p291']:>+9.1f} {ot.get('ot_night_200',0)-e['p293']:>+10.1f} {ot.get('ot_night_210',0)-e['p295']:>+10.1f}")

# ─── Find correct formula ─────────────────────────────────────────────────────────
print(f"\n{'='*130}")
print("Testing FINAL formula combinations")
print(f"{'='*130}")
formulas = [
    # CORRECT: using p291 as Day OT, p293 as Night OT (not BCC extraction)
    ("BASE + p291*HR*1.5 + p293*HR*2",             lambda e,ot: BASE+e["p291"]*HR*1.5+e["p293"]*HR*2),
    ("BASE + p291*HR*1.5 + p295*HR*2",             lambda e,ot: BASE+e["p291"]*HR*1.5+e["p295"]*HR*2),
    ("BASE + p293*HR*1.5 + p295*HR*2",             lambda e,ot: BASE+e["p293"]*HR*1.5+e["p295"]*HR*2),
    ("BASE + (p291+p293)*HR*1.5 + p295*HR*2",      lambda e,ot: BASE+(e["p291"]+e["p293"])*HR*1.5+e["p295"]*HR*2),
    ("BASE + (p291+p295)*HR*1.5 + p293*HR*2",      lambda e,ot: BASE+(e["p291"]+e["p295"])*HR*1.5+e["p293"]*HR*2),
    # NEW: what's the formula if p293 = Day OT at 1.5×?
    ("BASE + p293*HR*1.5 + p295*HR*2",             lambda e,ot: BASE+e["p293"]*HR*1.5+e["p295"]*HR*2),
    # MIXED
    ("BASE + p291*HR*1.5 + p293*HR*1.5 + p295*HR*2", lambda e,ot: BASE+e["p291"]*HR*1.5+e["p293"]*HR*1.5+e["p295"]*HR*2),
    # What about including Sunday OT at 2.7×?
    ("BASE + p291*HR*1.5 + p293*HR*2 + p295*HR*2.7", lambda e,ot: BASE+e["p291"]*HR*1.5+e["p293"]*HR*2+e["p295"]*HR*2.7),
    ("BASE + p293*HR*1.5 + p295*HR*2.7",           lambda e,ot: BASE+e["p293"]*HR*1.5+e["p295"]*HR*2.7),
]

for name, formula in formulas:
    errs = 0; max_diff = 0
    for code in employees:
        e = employees[code]; ot = bcc_ot.get(code, {})
        diff = abs(formula(e, ot) - e["luong"])
        if diff > 100: errs += 1
        if diff > max_diff: max_diff = diff
    print(f"  {name:<55}: errors={errs:>3}/{len(employees)}, max_diff={max_diff:>12,.0f}")

# ─── KEY TEST: Try formula using BCC OT extraction (cols +3, +7, +8) ──────────────
print(f"\n{'='*130}")
print("Testing formula using BCC daily OT extraction (not LCNT cols)")
print(f"{'='*130}")
formulas2 = [
    ("BASE + BCC_day*HR*1.5 + BCC_n200*HR*2 + BCC_n210*HR*2.1", lambda e,ot: BASE+ot.get("ot_day",0)*HR*1.5+ot.get("ot_night_200",0)*HR*2+ot.get("ot_night_210",0)*HR*2.1),
    ("BASE + BCC_day*HR*1.5 + (BCC_n200+BCC_n210)*HR*2", lambda e,ot: BASE+ot.get("ot_day",0)*HR*1.5+(ot.get("ot_night_200",0)+ot.get("ot_night_210",0))*HR*2),
    ("BASE + BCC_day*HR*1.5 + BCC_n200*HR*2", lambda e,ot: BASE+ot.get("ot_day",0)*HR*1.5+ot.get("ot_night_200",0)*HR*2),
    ("BASE + BCC_day*HR*1.5 + BCC_n210*HR*2", lambda e,ot: BASE+ot.get("ot_day",0)*HR*1.5+ot.get("ot_night_210",0)*HR*2),
    ("BASE + BCC_day*HR*1.5 + BCC_n210*HR*2.1", lambda e,ot: BASE+ot.get("ot_day",0)*HR*1.5+ot.get("ot_night_210",0)*HR*2.1),
    ("BASE + BCC_day*HR*1.5 + BCC_n200*HR*1.5 + BCC_n210*HR*2", lambda e,ot: BASE+ot.get("ot_day",0)*HR*1.5+ot.get("ot_night_200",0)*HR*1.5+ot.get("ot_night_210",0)*HR*2),
    ("BASE + BCC_day*HR*1.5 + BCC_n200*HR*2 + BCC_n210*HR*2", lambda e,ot: BASE+ot.get("ot_day",0)*HR*1.5+ot.get("ot_night_200",0)*HR*2+ot.get("ot_night_210",0)*HR*2),
]
for name, formula in formulas2:
    errs = 0; max_diff = 0
    for code in employees:
        e = employees[code]; ot = bcc_ot.get(code, {})
        diff = abs(formula(e, ot) - e["luong"])
        if diff > 100: errs += 1
        if diff > max_diff: max_diff = diff
    print(f"  {name:<65}: errors={errs:>3}/{len(employees)}, max_diff={max_diff:>12,.0f}")
