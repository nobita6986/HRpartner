"""
ETL-1.1: Migration Script - Thêm schema V4 vào SQLite

Chạy: python -m migrations.v4_schema

Schema V4 mirror tu prisma/schema.prisma (F16-F23)
"""

import sqlite3
import os
import sys
from datetime import datetime

# Fix encoding cho Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Đường dẫn DB
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(APP_DIR, "hrp_local.db")

def get_connection():
    """Tạo connection tới SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def migrate_v4_schema(log=print):
    """
    Tạo các bảng V4 mới trong SQLite
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    log("=" * 60)
    log("ETL-1.1: Migration Schema V4")
    log("=" * 60)
    
    # =========================================================================
    # 1. WORKERS - định danh NGƯỜI (vĩnh viễn)
    # =========================================================================
    log("\n[1/8] Tạo bảng workers...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workers (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE,
            full_name TEXT NOT NULL,
            phone TEXT,
            cccd_number TEXT UNIQUE,
            
            -- VN compliance
            gender TEXT,
            date_of_birth DATE,
            tax_code TEXT UNIQUE,
            insurance_code TEXT UNIQUE,
            bank_account TEXT,
            
            -- State machine (5 trạng thái)
            profile_status TEXT DEFAULT 'INCOMPLETE',
            employment_status TEXT DEFAULT 'NONE',
            risk_status TEXT DEFAULT 'NORMAL',
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    log("  ✓ Bảng workers đã tạo")
    
    # =========================================================================
    # 2. PROJECT_ASSIGNMENTS - ma NV theo DU AN
    # =========================================================================
    log("\n[2/8] Tao bang project_assignments...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_assignments (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            employee_code TEXT NOT NULL,
            employment_type TEXT NOT NULL,
            work_setting TEXT,
            valid_from TIMESTAMPTZ NOT NULL,
            valid_to TIMESTAMPTZ,
            status TEXT DEFAULT 'PLANNED',
            is_primary INTEGER DEFAULT 1,
            salary_per_day_vnd INTEGER DEFAULT 0,
            salary_type TEXT DEFAULT 'DAILY',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (worker_id) REFERENCES workers(id)
        )
    """)
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_project_emp 
        ON project_assignments(project_id, employee_code)
    """)
    log("  ✓ Bảng project_assignments đã tạo")
    
    # =========================================================================
    # 3. VENDORS - đơn vị tuyển dụng
    # =========================================================================
    log("\n[3/8] Tạo bảng vendors...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendors (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    log("  ✓ Bảng vendors đã tạo")
    
    # =========================================================================
    # 4. SOURCE_CLAIMS - map recruiter
    # =========================================================================
    log("\n[4/8] Tạo bảng source_claims...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS source_claims (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            claim_type TEXT NOT NULL,
            vendor_id TEXT,
            ctv_id TEXT,
            accepted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (worker_id) REFERENCES workers(id),
            FOREIGN KEY (vendor_id) REFERENCES vendors(id),
            UNIQUE(worker_id, claim_type)
        )
    """)
    log("  ✓ Bảng source_claims đã tạo")
    
    # =========================================================================
    # 5. VENDOR_ALIASES - từ điển người tuyển
    # =========================================================================
    log("\n[5/8] Tạo bảng vendor_aliases...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendor_aliases (
            id TEXT PRIMARY KEY,
            raw_name TEXT NOT NULL UNIQUE,
            vendor_type TEXT NOT NULL,
            target_vendor_id TEXT,
            target_user_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (target_vendor_id) REFERENCES vendors(id)
        )
    """)
    log("  ✓ Bảng vendor_aliases đã tạo")
    
    # =========================================================================
    # 6. TIMESHEET_PERIODS - kỳ lương
    # =========================================================================
    log("\n[6/8] Tạo bảng timesheet_periods...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timesheet_periods (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            status TEXT DEFAULT 'PENDING',
            version INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, month, year, version)
        )
    """)
    log("  ✓ Bảng timesheet_periods đã tạo")
    
    # =========================================================================
    # 7. TIMESHEET_LINES - dòng chấm công hàng ngày
    # =========================================================================
    log("\n[7/8] Tạo bảng timesheet_lines...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timesheet_lines (
            id TEXT PRIMARY KEY,
            period_id TEXT NOT NULL,
            worker_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            assignment_id TEXT,
            work_date DATE NOT NULL,
            regular_hours DECIMAL(5,2) DEFAULT 0,
            ot15_hours DECIMAL(5,2) DEFAULT 0,
            ot20_hours DECIMAL(5,2) DEFAULT 0,
            ot30_hours DECIMAL(5,2) DEFAULT 0,
            allowance TEXT,
            source TEXT DEFAULT 'MANUAL',
            version INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (period_id) REFERENCES timesheet_periods(id),
            FOREIGN KEY (worker_id) REFERENCES workers(id),
            UNIQUE(period_id, worker_id, work_date)
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timesheet_lines_worker_date 
        ON timesheet_lines(worker_id, work_date)
    """)
    log("  ✓ Bảng timesheet_lines đã tạo")
    
    # =========================================================================
    # 8. MANUAL_ALLOWANCES - phụ cấp thủ công
    # =========================================================================
    log("\n[8/8] Tạo bảng manual_allowances...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS manual_allowances (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            period_month INTEGER NOT NULL,
            period_year INTEGER NOT NULL,
            allowance_type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (worker_id) REFERENCES workers(id),
            UNIQUE(worker_id, period_month, period_year, allowance_type)
        )
    """)
    log("  ✓ Bảng manual_allowances đã tạo")
    
    # =========================================================================
    # 9. MIGRATE bảng portal_timesheets cũ
    # =========================================================================
    log("\n[9/8] Kiểm tra bảng portal_timesheets cũ...")
    
    # Thêm các cột mới vào portal_timesheets (nếu chưa có)
    try:
        cursor.execute("""
            ALTER TABLE portal_timesheets 
            ADD COLUMN worker_id TEXT
        """)
        log("  + Thêm cột worker_id")
    except sqlite3.OperationalError:
        log("  - Cột worker_id đã tồn tại")
    
    try:
        cursor.execute("""
            ALTER TABLE portal_timesheets 
            ADD COLUMN period_id TEXT
        """)
        log("  + Thêm cột period_id")
    except sqlite3.OperationalError:
        log("  - Cột period_id đã tồn tại")
    
    try:
        cursor.execute("""
            ALTER TABLE portal_timesheets 
            ADD COLUMN vendor_id TEXT
        """)
        log("  + Thêm cột vendor_id")
    except sqlite3.OperationalError:
        log("  - Cột vendor_id đã tồn tại")
    
    # =========================================================================
    # 10. TABLES cho SYNC LOG
    # =========================================================================
    log("\n[TÍNH NĂNG] Tạo bảng sync_logs...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_logs (
            id TEXT PRIMARY KEY,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            action TEXT NOT NULL,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'PENDING',
            error_message TEXT,
            UNIQUE(table_name, record_id)
        )
    """)
    log("  ✓ Bảng sync_logs đã tạo")
    
    # Commit và đóng
    conn.commit()
    conn.close()
    
    log("\n" + "=" * 60)
    log("✅ ETL-1.1 HOÀN TẤT: Schema V4 đã được thêm vào SQLite")
    log("=" * 60)

def rollback_v4_schema(log=print):
    """
    Rollback: Xóa các bảng V4 (DANGER - chỉ dùng khi cần test)
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    tables_to_drop = [
        'sync_logs',
        'manual_allowances',
        'timesheet_lines',
        'timesheet_periods',
        'vendor_aliases',
        'source_claims',
        'vendors',
        'project_assignments',
        'workers'
    ]
    
    for table in tables_to_drop:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
            log(f"✓ Đã xóa bảng {table}")
        except Exception as e:
            log(f"  Lỗi xóa {table}: {e}")
    
    conn.commit()
    conn.close()
    log("✅ Rollback hoàn tất")

if __name__ == "__main__":
    print(f"Database path: {DB_PATH}")
    print(f"Database exists: {os.path.exists(DB_PATH)}")
    
    migrate_v4_schema()
    
    # In ra schema summary
    print("\n" + "=" * 60)
    print("SCHEMA SUMMARY")
    print("=" * 60)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
    """)
    
    print("\nCác bảng trong database:")
    for row in cursor.fetchall():
        print(f"  - {row['name']}")
    
    conn.close()
