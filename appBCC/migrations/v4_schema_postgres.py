"""
Migration V4 schema từ SQLite → PostgreSQL (Neon Branch `dev`)
Chạy: python -m migrations.v4_schema_postgres

Tạo schema `v4` riêng (không động vào `public`) + 11 bảng V4
"""
import os
import sys

# Fix encoding cho Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load .env.dev
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(APP_DIR, '.env.dev')
load_dotenv(ENV_FILE)

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('APPBCC_DATABASE_URL')
APP_ENV = os.getenv('APP_ENV', 'dev')

# Anti-mistake
if APP_ENV == 'prod' and 'dev' in DATABASE_URL.lower():
    print(f"❌ APP_ENV=prod nhưng URL chứa 'dev' → không chạy migration")
    sys.exit(1)
if 'production' in DATABASE_URL.lower():
    print(f"❌ DATABASE_URL chứa 'production' → NGUY HIỂM, đang trỏ nhầm prod!")
    sys.exit(1)

print("=" * 70)
print(f"V4 SCHEMA MIGRATION → Neon Branch `dev`")
print("=" * 70)
print(f"APP_ENV        : {APP_ENV}")
print(f"DB host        : {DATABASE_URL.split('@')[-1].split('/')[0]}")
print()

# SQL migration
MIGRATION_SQL = """
-- ============================================================================
-- V4 SCHEMA - PostgreSQL version
-- Schema riêng `v4` để không xung đột với Prisma public
-- ============================================================================

-- 1. Tạo schema (idempotent)
CREATE SCHEMA IF NOT EXISTS v4;

-- 2. WORKERS
CREATE TABLE IF NOT EXISTS v4.workers (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    cccd_number TEXT UNIQUE,
    gender TEXT,
    date_of_birth DATE,
    tax_code TEXT UNIQUE,
    insurance_code TEXT UNIQUE,
    bank_account TEXT,
    profile_status TEXT DEFAULT 'INCOMPLETE',
    employment_status TEXT DEFAULT 'NONE',
    risk_status TEXT DEFAULT 'NORMAL',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROJECT_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS v4.project_assignments (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL REFERENCES v4.workers(id),
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_project_emp
    ON v4.project_assignments(project_id, employee_code);

-- 4. VENDORS
CREATE TABLE IF NOT EXISTS v4.vendors (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. SOURCE_CLAIMS
CREATE TABLE IF NOT EXISTS v4.source_claims (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL REFERENCES v4.workers(id),
    claim_type TEXT NOT NULL,
    vendor_id TEXT REFERENCES v4.vendors(id),
    ctv_id TEXT,
    accepted INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, claim_type)
);

-- 6. VENDOR_ALIASES
CREATE TABLE IF NOT EXISTS v4.vendor_aliases (
    id TEXT PRIMARY KEY,
    raw_name TEXT NOT NULL UNIQUE,
    vendor_type TEXT NOT NULL,
    target_vendor_id TEXT REFERENCES v4.vendors(id),
    target_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. TIMESHEET_PERIODS
CREATE TABLE IF NOT EXISTS v4.timesheet_periods (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, month, year, version)
);

-- 8. TIMESHEET_LINES
CREATE TABLE IF NOT EXISTS v4.timesheet_lines (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL REFERENCES v4.timesheet_periods(id),
    worker_id TEXT NOT NULL REFERENCES v4.workers(id),
    project_id TEXT NOT NULL,
    assignment_id TEXT REFERENCES v4.project_assignments(id),
    work_date DATE NOT NULL,
    regular_hours DECIMAL(5,2) DEFAULT 0,
    ot15_hours DECIMAL(5,2) DEFAULT 0,
    ot20_hours DECIMAL(5,2) DEFAULT 0,
    ot30_hours DECIMAL(5,2) DEFAULT 0,
    allowance TEXT,
    source TEXT DEFAULT 'MANUAL',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period_id, worker_id, work_date)
);
CREATE INDEX IF NOT EXISTS idx_timesheet_lines_worker_date
    ON v4.timesheet_lines(worker_id, work_date);

-- 9. MANUAL_ALLOWANCES
CREATE TABLE IF NOT EXISTS v4.manual_allowances (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL REFERENCES v4.workers(id),
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    allowance_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, period_month, period_year, allowance_type)
);

-- 10. SYNC_LOGS
CREATE TABLE IF NOT EXISTS v4.sync_logs (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'PENDING',
    error_message TEXT,
    UNIQUE(table_name, record_id)
);

-- 11. RECONCILIATION_REPORTS
CREATE TABLE IF NOT EXISTS v4.reconciliation_reports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    phase TEXT NOT NULL,
    total_rows INTEGER,
    clean_rows INTEGER,
    flagged_rows INTEGER,
    major_diff_count INTEGER,
    report_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. RECONCILIATION_DIFF_ROWS
CREATE TABLE IF NOT EXISTS v4.reconciliation_diff_rows (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES v4.reconciliation_reports(id),
    emp_code TEXT,
    worker_id TEXT REFERENCES v4.workers(id),
    manual_value NUMERIC,
    auto_value NUMERIC,
    diff NUMERIC,
    diff_type TEXT,
    likely_cause TEXT,
    confidence NUMERIC,
    action TEXT,
    suggested_value NUMERIC,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recon_report
    ON v4.reconciliation_diff_rows(report_id);
"""

VERIFY_SQL = """
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'v4' 
ORDER BY table_name;
"""


def run_migration(log=print):
    """Tạo schema v4 + 11 bảng V4 trong Neon Branch dev"""
    log("Đang kết nối Neon...")
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        log("Đang chạy migration SQL...")
        cur.execute(MIGRATION_SQL)
        conn.commit()
        log("✅ Migration SQL thành công")

        log("\nĐang verify schema 'v4'...")
        cur.execute(VERIFY_SQL)
        tables = cur.fetchall()
        log(f"\nSchema 'v4' có {len(tables)} bảng:")
        for (t,) in tables:
            log(f"   ✓ v4.{t}")

        if len(tables) != 11:
            log(f"\n⚠️  Cảnh báo: kỳ vọng 11 bảng, thực tế có {len(tables)} bảng")

        cur.close()
        conn.close()
        log("\n" + "=" * 70)
        log("✅ V4 MIGRATION HOÀN TẤT")
        log("=" * 70)

    except Exception as e:
        conn.rollback()
        log(f"\n❌ LỖI: {type(e).__name__}: {e}")
        cur.close()
        conn.close()
        sys.exit(1)


def rollback_migration(log=print):
    """Xóa schema v4 (DANGER - chỉ dùng khi test)"""
    log("⚠️  Rollback: DROP SCHEMA v4 CASCADE")
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    conn.autocommit = False
    cur = conn.cursor()
    try:
        cur.execute("DROP SCHEMA IF EXISTS v4 CASCADE;")
        conn.commit()
        log("✅ Đã xóa schema v4")
    except Exception as e:
        conn.rollback()
        log(f"❌ LỖI: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    if '--rollback' in sys.argv:
        confirm = input("Bạn có CHẮC muốn xóa schema 'v4'? (yes/no): ")
        if confirm.lower() == 'yes':
            rollback_migration()
        else:
            print("Hủy rollback.")
    else:
        run_migration()