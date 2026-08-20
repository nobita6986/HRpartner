# -*- coding: utf-8 -*-
"""Run core_pipeline.py on BCCActroT7.xlsx to see actual ETL output."""
import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
sys.path.insert(0, r"C:\CodeApp\HrP\appBCC")

from core_pipeline import preview_file

BCC = r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx"

results = preview_file(
    file_path=BCC,
    project_name="Nhà máy Actro - Vĩnh Phúc",
    period_month=7,
    period_year=2026,
    log_callback=print,
    review_callback=None
)

print(f"\nTotal employees processed: {len(results)}")
print(f"\nFirst 5 employees:")
for r in results[:5]:
    pd_ = r.get("payrollData", {})
    s = pd_.get("summary", {}) if pd_ else {}
    rd = r.get("rawData", {})
    print(f"\n{r['employeeCode']}: {r['fullName']}")
    print(f"  total_days={r['totalWorkDays']}, otHours={r['otHours']}, absent={r['absentDays']}")
    print(f"  rawData OT: ot_day={rd.get('ot_day','?')}, ot_night={rd.get('ot_night','?')}, ot_sunday={rd.get('ot_sunday','?')}")
    if s:
        print(f"  Salary: {s.get('totalSalary', 'N/A')}")
        print(f"  Gross: {s.get('grossIncome', 'N/A')}")
        print(f"  Net: {s.get('netIncome', 'N/A')}")
        if '_debug' in s:
            print(f"  Debug: {s['_debug']}")
    else:
        print(f"  payrollData: {pd_}")
