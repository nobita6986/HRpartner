# -*- coding: utf-8 -*-
"""Kiem tra xem col_map loai co duoc set khong"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import sys
sys.path.insert(0, '.')

from core_pipeline import preview_file

def main():
    bcc_path = r"C:\CodeApp\HrP\appBCC\docs\Actro\BCCActroT7.xlsx"
    project_name = "Nhà máy Actro - Vĩnh Phúc"

    debug_logs = []
    def log(msg):
        debug_logs.append(msg)

    print("Dang parse file...")

    # Parse file
    data = preview_file(bcc_path, project_name, 7, 2026, log_callback=log)

    print(f"\nSo nhan vien: {len(data)}")

    # Kiem tra loai cua 5 nhan vien dau tien
    print("\n=== LOAI CUA 5 NHAN VIEN DAU TIEN ===")
    for i, emp in enumerate(data[:5]):
        raw = emp.get('rawData', {})
        payroll = emp.get('payrollData', {}) or {}

        print(f"\n{i+1}. {emp.get('employeeCode')}: {emp.get('fullName')}")
        print(f"   Loai: '{raw.get('loai', 'N/A')}'")
        print(f"   Is Soi Kinh: {raw.get('is_soi_kinh', 'N/A')}")

        allowances = payroll.get('allowances', [])
        for a in allowances:
            print(f"   - {a.get('name')}: {a.get('total')}")

if __name__ == '__main__':
    main()
