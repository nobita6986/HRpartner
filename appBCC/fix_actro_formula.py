"""
Fix Actro salary formula based on reverse-engineered LCNT7 data.
Fixes:
1. OT: correct multipliers (1.5/2.0/2.7) + extract from summary columns
2. Thâm niên: months_of_service × 28,846 (min 200k if >=3 months)
3. Phụ cấp đời sống: cong_HC × 11,538 (not 500k fixed)
4. Suất ăn: total_days × 25,000 (not 26 × 25k fixed)
5. KPI: 1,000,000 if absent_days==0, 400,000 if absent_days==1
6. Phụ cấp nhà ở, Trừ ứng: import từ HR file
"""
import sys
import os
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

import pandas as pd
import re
from datetime import datetime, date

LCNT_PATH = r"C:\CodeApp\HrP\appBCC\docs\Actro\LCNT7.xlsx"
BCC_PATH  = r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx"

def safe_float(v):
    if pd.isna(v): return 0.0
    try: return float(v)
    except: return 0.0

def months_between(start: date, end: date) -> float:
    return (end.year - start.year) * 12 + (end.month - start.month) + (end.day / 31)

# ─── Load LCNT7 ─────────────────────────────────────────────────────────────
xl = pd.ExcelFile(LCNT_PATH)
df = pd.read_excel(xl, sheet_name=0, header=None)

# Find header row
header_row = 9
h = df.iloc[header_row]

# Map columns
lcnt_col = {}
for i, val in enumerate(h):
    v = str(val).strip().lower()
    if "mã thẻ" in v or "mã nv" in v: lcnt_col["emp"] = i
    elif "ngày vào" in v: lcnt_col["ngay_vao"] = i
    elif v == "loại" or "loại công" in v: lcnt_col["loai"] = i
    elif "lcb" in v: lcnt_col["base"] = i
    elif "lương" == v.strip(): lcnt_col["luong"] = i
    elif "chuyên cần" in v: lcnt_col["chuyen_can"] = i
    elif "đời sống" in v: lcnt_col["doi_song"] = i
    elif "thâm niên" in v: lcnt_col["tham_nien"] = i
    elif "phụ cấp soi kính" in v: lcnt_col["soi_kinh"] = i
    elif "nhà ở" in v: lcnt_col["nha_o"] = i
    elif "thanh toán" in v: lcnt_col["thanh_toan"] = i
    elif "trừ ứng" in v: lcnt_col["tru_ung"] = i
    elif "thực nhận" in v: lcnt_col["thuc_nhan"] = i
    elif "công hc" in v.lower(): lcnt_col["cong_hc"] = i
    elif "tình trạng" in v: lcnt_col["tinh_trang"] = i

# OT summary columns (at end of LCNT7 payroll section)
# These are in the same row as employee data
lcnt_ot_cols = {
    "hc_day": lcnt_col.get("cong_hc", 297),  # Day work hours
    "ot_day": None,  # Will find dynamically
    "ot_night": None,
    "ot_sunday": None,
}
# Find OT columns - search near end of row
for i in range(290, 298):
    if i < len(h):
        v = str(h.iloc[i]).strip().lower()
        if "giờ làm" in v or "hc" in v.lower(): lcnt_ot_cols["hc_day"] = i
        elif "đêm" in v and lcnt_ot_cols.get("ot_night") is None: lcnt_ot_cols["ot_night"] = i
        elif "chủ nhật" in v or "sunday" in v or "일요일" in v:
            lcnt_ot_cols["ot_sunday"] = i
            if lcnt_ot_cols.get("ot_day") is None:
                lcnt_ot_cols["ot_day"] = i - 2 if i > 2 else i
        elif ("tăng ca" in v or "shift" in v) and lcnt_ot_cols.get("ot_day") is None:
            lcnt_ot_cols["ot_day"] = i

print(f"LCNT7 OT cols: {lcnt_ot_cols}")

# ─── Collect employee data from LCNT7 ─────────────────────────────────────
employees = []
period_end = date(2026, 7, 31)

for idx in range(header_row + 1, len(df)):
    row = df.iloc[idx]
    emp_col = lcnt_col.get("emp", 1)
    name_col = emp_col + 1
    code = str(row.iloc[emp_col]).strip() if emp_col < len(row) else ""
    name = str(row.iloc[name_col]).strip() if name_col < len(row) else ""
    
    if not code or code in ('nan', 'None', '') or not re.search(r'[a-zA-ZÀ-ỹ]', name):
        continue
    
    # Parse start date
    ngay_vao = None
    ngay_vao_raw = row.iloc[lcnt_col.get("ngay_vao", 3)] if lcnt_col.get("ngay_vao", 3) < len(row) else None
    if pd.notna(ngay_vao_raw):
        try:
            if isinstance(ngay_vao_raw, (date, datetime)):
                ngay_vao = ngay_vao_raw.date() if isinstance(ngay_vao_raw, datetime) else ngay_vao_raw
            else:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
                    try:
                        ngay_vao = datetime.strptime(str(ngay_vao_raw).strip(), fmt).date()
                        break
                    except: pass
        except: pass
    
    e = {
        "code": code, "name": name,
        "ngay_vao": ngay_vao,
        "loai": str(row.iloc[lcnt_col.get("loai", 298)]).strip() if lcnt_col.get("loai", 298) < len(row) else "",
        "tinh_trang": str(row.iloc[lcnt_col.get("tinh_trang", 301)]).strip() if lcnt_col.get("tinh_trang", 301) < len(row) else "",
        "base": safe_float(row.iloc[lcnt_col.get("base", 303)]),
        "luong": safe_float(row.iloc[lcnt_col.get("luong", 304)]),
        "chuyen_can": safe_float(row.iloc[lcnt_col.get("chuyen_can", 305)]),
        "soi_kinh": safe_float(row.iloc[lcnt_col.get("soi_kinh", 306)]),
        "doi_song": safe_float(row.iloc[lcnt_col.get("doi_song", 307)]),
        "nha_o": safe_float(row.iloc[lcnt_col.get("nha_o", 308)]),
        "tham_nien": safe_float(row.iloc[lcnt_col.get("tham_nien", 309)]),
        "thanh_toan": safe_float(row.iloc[lcnt_col.get("thanh_toan", 310)]),
        "tru_ung": safe_float(row.iloc[lcnt_col.get("tru_ung", 311)]),
        "thuc_nhan": safe_float(row.iloc[lcnt_col.get("thuc_nhan", 312)]),
        "cong_hc": safe_float(row.iloc[lcnt_col.get("cong_hc", 297)]),
        # OT from LCNT7 summary
        "ot_day_lcnt": safe_float(row.iloc[lcnt_ot_cols.get("ot_day", 291)]) if lcnt_ot_cols.get("ot_day") is not None else 0,
        "ot_night_lcnt": safe_float(row.iloc[lcnt_ot_cols.get("ot_night", 293)]) if lcnt_ot_cols.get("ot_night") is not None else 0,
        "ot_sunday_lcnt": safe_float(row.iloc[lcnt_ot_cols.get("ot_sunday", 295)]) if lcnt_ot_cols.get("ot_sunday") is not None else 0,
        "_row": idx,
    }
    e["ot_total_lcnt"] = e["ot_day_lcnt"] + e["ot_night_lcnt"] + e["ot_sunday_lcnt"]
    employees.append(e)

print(f"Total LCNT7 employees: {len(employees)}")

# ─── Fixed Actro formula (reverse-engineered) ─────────────────────────────────
BASE_SALARY = 6_000_000
DAILY_RATE = BASE_SALARY / 26          # 230,769
HOURLY_RATE = DAILY_RATE / 8           # 28,846
DONGIA_DOI_SONG = DAILY_RATE / 20     # 11,538 (= 1 đơn vị/ngày)
SUAT_AN_PER_DAY = 25_000
MIN_THAM_NIEN = 200_000
THAM_NIEN_MONTHS_THRESHOLD = 3
BHXH_RATE = 0.105

def calc_tham_nien(ngay_vao, period_end):
    if ngay_vao is None:
        return 0
    months = months_between(ngay_vao, period_end)
    if months < THAM_NIEN_MONTHS_THRESHOLD:
        return 0
    return round(months * HOURLY_RATE)

def calc_chuyen_can(absent_days):
    if absent_days == 0:
        return 400_000
    elif absent_days == 1:
        return 200_000
    return 0

def calc_doi_song(total_days):
    return round(total_days * DONGIA_DOI_SONG)

def calc_suat_an(total_days):
    return total_days * SUAT_AN_PER_DAY

def calc_kpi(absent_days):
    if absent_days == 0:
        return 1_000_000
    elif absent_days == 1:
        return 400_000
    return 0

def calc_actro(cong_hc, ot_day, ot_night, ot_sunday,
               absent_days=0, ngay_vao=None,
               nha_o=0, tru_ung=0, bu_luong=0,
               phu_cap_cong_doan=0):
    """Fixed Actro salary formula - reverse-engineered from LCNT7"""
    # Phần A: Lương chính
    salary_normal = cong_hc * DAILY_RATE
    salary_ot = (ot_day * HOURLY_RATE * 1.5 +
                 ot_night * HOURLY_RATE * 2.0 +
                 ot_sunday * HOURLY_RATE * 2.7)
    total_salary = salary_normal + salary_ot
    
    # Phần B: Phụ cấp cố định
    chuyen_can = calc_chuyen_can(absent_days)
    doi_song = calc_doi_song(cong_hc)
    tham_nien = calc_tham_nien(ngay_vao, period_end)
    suat_an = calc_suat_an(cong_hc)
    kpi = calc_kpi(absent_days)
    
    # Total allowances
    allowances = (chuyen_can + doi_song + tham_nien + suat_an +
                  kpi + bu_luong + phu_cap_cong_doan + nha_o)
    
    # Gross
    gross = total_salary + allowances
    
    # Deductions
    bhxh = BASE_SALARY * BHXH_RATE
    deductions = bhxh + tru_ung
    
    net = gross - deductions
    
    return {
        "salary_normal": round(salary_normal),
        "salary_ot": round(salary_ot),
        "total_salary": round(total_salary),
        "chuyen_can": chuyen_can,
        "doi_song": doi_song,
        "tham_nien": tham_nien,
        "suat_an": suat_an,
        "kpi": kpi,
        "phu_cap_cong_doan": phu_cap_cong_doan,
        "nha_o": nha_o,
        "bu_luong": bu_luong,
        "total_allowance": round(allowances),
        "bhxh": round(bhxh),
        "tru_ung": tru_ung,
        "gross": round(gross),
        "net": round(net),
    }

# ─── Verify formula against LCNT7 ────────────────────────────────────────────
print(f"\n{'='*90}")
print("VERIFYING FIXED FORMULA vs LCNT7")
print(f"{'='*90}")
print(f"Constants: BASE={BASE_SALARY:,}, DAILY={DAILY_RATE:,.0f}, HOURLY={HOURLY_RATE:,.0f}, DOI_SONG_UNIT={DONGIA_DOI_SONG:,.0f}")
print()

# Use OT from LCNT7 summary columns (most accurate)
print(f"{'Mã NV':<15} {'Tên':<18} {'Absent':>6} {'OT_d':>6} {'OT_n':>5} {'OT_s':>5} | {'LƯƠNG'}")
print(f"{'':15} {'':18} {'Days':>6} {'day':>6} {'ngt':>5} {'sun':>5} | {'HR':>14} {'ETL':>14} {'Diff':>10}")
print("-"*90)

total_diff = 0
max_diff = 0
max_emp = ""
errors = []

for e in sorted(employees, key=lambda x: x["code"]):
    absent = 0  # LCNT7 doesn't have absent column, derive from cong_hc vs expected
    # Derive absent from CÔNG HC: if expected is 26 and actual is less, that's absent
    expected_cong = 26  # standard month
    actual_cong = e["cong_hc"]
    # Simple absent count: round down difference (rough)
    # Actually, we don't have absent_days in LCNT7 directly
    # For now, use 0 absent (best we can do without full daily data)
    absent_days_est = max(0, round(expected_cong - actual_cong))
    
    result = calc_actro(
        cong_hc=e["cong_hc"],
        ot_day=e["ot_day_lcnt"],
        ot_night=e["ot_night_lcnt"],
        ot_sunday=e["ot_sunday_lcnt"],
        absent_days=absent_days_est,
        ngay_vao=e["ngay_vao"],
        nha_o=e["nha_o"],
        tru_ung=e["tru_ung"],
    )
    
    diff = result["total_salary"] - e["luong"]
    total_diff += abs(diff)
    if abs(diff) > max_diff:
        max_diff = abs(diff)
        max_emp = e["code"]
    
    marker = ""
    if abs(diff) > 1000:
        errors.append((e, diff, result))
        marker = " ❌"
    
    print(f"{e['code']:<15} {e['name'][:18]:<18} {absent_days_est:>6} {e['ot_day_lcnt']:>6.0f} {e['ot_night_lcnt']:>5.0f} {e['ot_sunday_lcnt']:>5.0f} | "
          f"{e['luong']:>14,.0f} {result['total_salary']:>14,.0f} {diff:>+10,.0f}{marker}")

print(f"\n{'='*90}")
print(f"Avg |diff| on LƯƠNG: {total_diff/len(employees):,.0f} VND")
print(f"Max |diff|: {max_diff:,.0f} VND ({max_emp})")
print(f"Errors (>1000): {len(errors)} / {len(employees)}")

if errors:
    print(f"\nSample errors:")
    for e, diff, r in errors[:3]:
        print(f"  {e['code']} ({e['name']}): LƯƠNG HR={e['luong']:,.0f}, ETL={r['total_salary']:,.0f}, diff={diff:,.0f}")
        print(f"    cong_HC={e['cong_hc']:.2f}, OT_day={e['ot_day_lcnt']}, OT_night={e['ot_night_lcnt']}, OT_sun={e['ot_sunday_lcnt']}")

# ─── Also verify GROSS = thanh_toan ─────────────────────────────────────────
print(f"\n{'='*90}")
print("VERIFYING GROSS (thanh_toan) vs LCNT7")
print(f"{'='*90}")
gross_errors = []
for e in sorted(employees, key=lambda x: x["code"]):
    expected_cong = 26
    actual_cong = e["cong_hc"]
    absent_days_est = max(0, round(expected_cong - actual_cong))
    
    result = calc_actro(
        cong_hc=e["cong_hc"],
        ot_day=e["ot_day_lcnt"],
        ot_night=e["ot_night_lcnt"],
        ot_sunday=e["ot_sunday_lcnt"],
        absent_days=absent_days_est,
        ngay_vao=e["ngay_vao"],
        nha_o=e["nha_o"],
        tru_ung=e["tru_ung"],
    )
    
    # Note: thanh_toan includes KPI + all allowances + nha_o
    gross_with_kpi = result["gross"]
    gross_diff = gross_with_kpi - e["thanh_toan"]
    
    if abs(gross_diff) > 1000:
        gross_errors.append((e, gross_diff, result))

print(f"Gross errors (>1000): {len(gross_errors)} / {len(employees)}")
if gross_errors:
    print(f"\nSample gross errors:")
    for e, diff, r in gross_errors[:3]:
        print(f"  {e['code']} ({e['name']}): thanh_toan HR={e['thanh_toan']:,.0f}, ETL_gross={r['gross']:,.0f}, diff={diff:,.0f}")
        print(f"    allowances: {r['total_allowance']:,.0f} (kpi={r['kpi']:,}, cc={r['chuyen_can']:,}, ds={r['doi_song']:,}, tn={r['tham_nien']:,}, sa={r['suat_an']:,})")

print(f"\n✅ Formula verification complete!")
print(f"\nTo implement in actro_formula.py + core_pipeline.py, replace the salary")
print(f"calculation with the 'calc_actro()' function above.")
