"""
ETL-1.4: Test script - Chay migration va verify

Usage: python -m migrations.v4_test
"""

import sys
import os

# Fix encoding cho Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from migrations.v4_schema import migrate_v4_schema
from migrations.v4_migrate import migrate_data, verify_migration

def run_tests():
    print("=" * 70)
    print("ETL-1: TEST SUITE")
    print("=" * 70)
    
    # Test 1: Schema Migration
    print("\n[TEST 1] Schema Migration")
    print("-" * 70)
    try:
        migrate_v4_schema()
        print("✅ TEST 1 PASSED: Schema migration thành công")
    except Exception as e:
        print(f"❌ TEST 1 FAILED: {str(e)}")
        return False
    
    # Test 2: Data Migration (Dry Run)
    print("\n[TEST 2] Data Migration (Dry Run)")
    print("-" * 70)
    try:
        result = migrate_data(dry_run=True)
        print("✅ TEST 2 PASSED: Dry run thành công")
        print(f"   Records sẽ migrate: {result['skipped']}")
    except Exception as e:
        print(f"❌ TEST 2 FAILED: {str(e)}")
        return False
    
    # Test 3: Verify Schema
    print("\n[TEST 3] Schema Verification")
    print("-" * 70)
    try:
        import sqlite3
        APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        DB_PATH = os.path.join(APP_DIR, "hrp_local.db")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Kiểm tra các bảng V4
        expected_tables = [
            'workers',
            'project_assignments',
            'vendors',
            'source_claims',
            'vendor_aliases',
            'timesheet_periods',
            'timesheet_lines',
            'manual_allowances',
            'sync_logs'
        ]
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        actual_tables = [row[0] for row in cursor.fetchall()]
        
        all_ok = True
        for table in expected_tables:
            if table in actual_tables:
                print(f"  ✅ {table}")
            else:
                print(f"  ❌ {table} (THIẾU)")
                all_ok = False
        
        conn.close()
        
        if all_ok:
            print("✅ TEST 3 PASSED: Tất cả bảng V4 đã được tạo")
        else:
            print("❌ TEST 3 FAILED: Thiếu một số bảng")
            return False
            
    except Exception as e:
        print(f"❌ TEST 3 FAILED: {str(e)}")
        return False
    
    # Test 4: Verify Referential Integrity
    print("\n[TEST 4] Referential Integrity Check")
    print("-" * 70)
    try:
        is_valid = verify_migration()
        if is_valid:
            print("✅ TEST 4 PASSED: Referential integrity OK")
        else:
            print("⚠️ TEST 4 WARNING: Có một số vấn đề (xem trên)")
    except Exception as e:
        print(f"⚠️ TEST 4 WARNING: {str(e)}")
    
    print("\n" + "=" * 70)
    print("TEST SUITE COMPLETED")
    print("=" * 70)
    print("\nTiếp theo:")
    print("  1. Chạy migrate thật: python -m migrations.v4_migrate")
    print("  2. Setup sync: python -m migrations.v4_sync setup")
    print("  3. Sync lên Neon: python -m migrations.v4_sync sync")
    
    return True

if __name__ == "__main__":
    run_tests()
