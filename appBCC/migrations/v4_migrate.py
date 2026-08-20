"""
ETL-1.2: Migrate du lieu tu portal_timesheets cu sang schema V4

Chay: python -m migrations.v4_migrate

Logic:
1. Doc du lieu tu portal_timesheets
2. Tao worker moi (hoac link voi worker co san)
3. Tao project_assignment
4. Tao timesheet_period
5. Tao timesheet_lines tu daily_data JSON
"""

import sqlite3
import json
import uuid
import os
import sys
from datetime import datetime, date

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

def get_project_id(project_name):
    """Map project_name sang project_id chuẩn"""
    project_map = {
        'actro_vp': 'PRJ-ACTVP',
        'actro': 'PRJ-ACTVP',
        'beepro': 'PRJ-BP',
        'beepro_vp': 'PRJ-BP',
    }
    return project_map.get(project_name.lower(), f"PRJ-{project_name.upper()}")

def get_worker_id_by_cccd(cursor, cccd):
    """Tìm worker_id từ CCCD"""
    if not cccd:
        return None
    cursor.execute("SELECT id FROM workers WHERE cccd_number = ?", (cccd,))
    row = cursor.fetchone()
    return row['id'] if row else None

def get_worker_id_by_name(cursor, full_name, project_id):
    """Tìm worker_id từ tên + project (fallback)"""
    if not full_name:
        return None
    cursor.execute("""
        SELECT w.id FROM workers w
        JOIN project_assignments pa ON pa.worker_id = w.id
        WHERE w.full_name = ? AND pa.project_id = ?
        LIMIT 1
    """, (full_name, project_id))
    row = cursor.fetchone()
    return row['id'] if row else None

def migrate_data(log=print, dry_run=False):
    """
    Migrate dữ liệu từ portal_timesheets sang V4 schema
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    log("=" * 60)
    log("ETL-1.2: Migrate Data sang Schema V4")
    log(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    log("=" * 60)
    
    # =========================================================================
    # 1. Kiểm tra bảng nguồn
    # =========================================================================
    cursor.execute("SELECT COUNT(*) as cnt FROM portal_timesheets")
    total_rows = cursor.fetchone()['cnt']
    log(f"\n[1/5] Tìm thấy {total_rows} dòng trong portal_timesheets")
    
    if total_rows == 0:
        log("⚠️ Không có dữ liệu để migrate")
        conn.close()
        return
    
    # =========================================================================
    # 2. Lấy danh sách các record cần migrate
    # =========================================================================
    cursor.execute("""
        SELECT * FROM portal_timesheets 
        ORDER BY project, period_year, period_month, employee_code
    """)
    records = cursor.fetchall()
    
    stats = {
        'workers_created': 0,
        'assignments_created': 0,
        'periods_created': 0,
        'lines_created': 0,
        'skipped': 0,
        'errors': 0
    }
    
    existing_workers = {}  # Cache worker_id đã tạo
    
    # =========================================================================
    # 3. Process tung record
    # =========================================================================
    log(f"\n[2/5] Bat dau migrate {total_rows} records...")
    
    for idx, row in enumerate(records):
        try:
            # Convert sqlite3.Row to dict
            row = dict(row)
            
            employee_code = row['employee_code']
            full_name = row['full_name']
            project_name = row['project']
            period_month = row['period_month']
            period_year = row['period_year']
            
            project_id = get_project_id(project_name)
            
            # ----- 3.1: Worker -----
            worker_key = f"{employee_code}|{project_id}"
            
            if worker_key not in existing_workers:
                # Kiểm tra worker đã tồn tại chưa
                cursor.execute("""
                    SELECT pa.worker_id FROM project_assignments pa
                    WHERE pa.employee_code = ? AND pa.project_id = ?
                """, (employee_code, project_id))
                existing = cursor.fetchone()
                
                if existing:
                    worker_id = existing['worker_id']
                    log(f"  [Worker] Đã tồn tại: {employee_code} → {worker_id}")
                else:
                    # Tạo worker mới
                    worker_id = str(uuid.uuid4())
                    
                    cursor.execute("""
                        INSERT INTO workers (id, full_name, profile_status, employment_status)
                        VALUES (?, ?, 'VERIFIED', 'ACTIVE')
                    """, (worker_id, full_name))
                    
                    stats['workers_created'] += 1
                    log(f"  [Worker] Tạo mới: {full_name} → {worker_id[:8]}...")
                
                existing_workers[worker_key] = worker_id
            else:
                worker_id = existing_workers[worker_key]
            
            # ----- 3.2: Assignment -----
            cursor.execute("""
                SELECT id FROM project_assignments 
                WHERE worker_id = ? AND project_id = ?
            """, (worker_id, project_id))
            assignment = cursor.fetchone()
            
            if not assignment:
                assignment_id = str(uuid.uuid4())
                
                # Lấy valid_from từ period
                valid_from = f"{period_year}-{period_month:02d}-01"
                
                cursor.execute("""
                    INSERT INTO project_assignments 
                    (id, worker_id, project_id, employee_code, employment_type, 
                     valid_from, status, is_primary)
                    VALUES (?, ?, ?, ?, 'OUTSOURCED', ?, 'ACTIVE', 1)
                """, (assignment_id, worker_id, project_id, employee_code, valid_from))
                
                stats['assignments_created'] += 1
            else:
                assignment_id = assignment['id']
            
            # ----- 3.3: Period -----
            cursor.execute("""
                SELECT id FROM timesheet_periods
                WHERE project_id = ? AND month = ? AND year = ?
                ORDER BY version DESC LIMIT 1
            """, (project_id, period_month, period_year))
            period = cursor.fetchone()
            
            if not period:
                period_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO timesheet_periods 
                    (id, project_id, month, year, status)
                    VALUES (?, ?, ?, ?, 'PENDING')
                """, (period_id, project_id, period_month, period_year))
                
                stats['periods_created'] += 1
            else:
                period_id = period['id']
            
            # ----- 3.4: Timesheet Lines -----
            daily_data = row['daily_data']
            
            if daily_data and not dry_run:
                if isinstance(daily_data, str):
                    daily_list = json.loads(daily_data)
                else:
                    daily_list = daily_data
                
                for day_info in daily_list:
                    work_date = day_info.get('date')
                    regular_hours = float(day_info.get('regular_hours', 0))
                    ot15 = float(day_info.get('ot15', 0))
                    ot20 = float(day_info.get('ot20', 0))
                    ot30 = float(day_info.get('ot30', 0))
                    
                    # Upsert timesheet_line
                    cursor.execute("""
                        INSERT INTO timesheet_lines 
                        (id, period_id, worker_id, project_id, assignment_id,
                         work_date, regular_hours, ot15_hours, ot20_hours, ot30_hours, source)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MIGRATED')
                        ON CONFLICT(period_id, worker_id, work_date) 
                        DO UPDATE SET
                            regular_hours = EXCLUDED.regular_hours,
                            ot15_hours = EXCLUDED.ot15_hours,
                            ot20_hours = EXCLUDED.ot20_hours,
                            ot30_hours = EXCLUDED.ot30_hours
                    """, (str(uuid.uuid4()), period_id, worker_id, project_id, 
                          assignment_id, work_date, regular_hours, ot15, ot20, ot30))
                    
                    stats['lines_created'] += 1
            
            # Commit sau mỗi 100 records
            if not dry_run and (idx + 1) % 100 == 0:
                conn.commit()
                log(f"  Đã migrate {idx + 1}/{total_rows} records...")
            
            stats['skipped'] += 1
            
        except Exception as e:
            stats['errors'] += 1
            log(f"  ❌ Lỗi row {idx}: {str(e)}")
            if not dry_run:
                conn.rollback()
            continue
    
    # =========================================================================
    # 4. Commit và đóng
    # =========================================================================
    if not dry_run:
        conn.commit()
        log(f"\n[3/5] Commit thành công!")
    
    # =========================================================================
    # 5. In thống kê
    # =========================================================================
    log(f"\n[4/5] THỐNG KÊ MIGRATION:")
    log(f"  - Workers mới tạo: {stats['workers_created']}")
    log(f"  - Assignments mới tạo: {stats['assignments_created']}")
    log(f"  - Periods mới tạo: {stats['periods_created']}")
    log(f"  - Timesheet lines: {stats['lines_created']}")
    log(f"  - Records đã xử lý: {stats['skipped']}")
    log(f"  - Lỗi: {stats['errors']}")
    
    # =========================================================================
    # 6. Verify
    # =========================================================================
    log(f"\n[5/5] VERIFY - Kiểm tra dữ liệu sau migration:")
    
    cursor.execute("SELECT COUNT(*) as cnt FROM workers")
    log(f"  - workers: {cursor.fetchone()['cnt']} rows")
    
    cursor.execute("SELECT COUNT(*) as cnt FROM project_assignments")
    log(f"  - project_assignments: {cursor.fetchone()['cnt']} rows")
    
    cursor.execute("SELECT COUNT(*) as cnt FROM timesheet_periods")
    log(f"  - timesheet_periods: {cursor.fetchone()['cnt']} rows")
    
    cursor.execute("SELECT COUNT(*) as cnt FROM timesheet_lines")
    log(f"  - timesheet_lines: {cursor.fetchone()['cnt']} rows")
    
    conn.close()
    
    log("\n" + "=" * 60)
    if dry_run:
        log("✅ DRY RUN HOÀN TẤT - Không có thay đổi thực sự")
    else:
        log("✅ ETL-1.2 HOÀN TẤT: Dữ liệu đã migrate sang V4")
    log("=" * 60)
    
    return stats

def verify_migration(log=print):
    """
    Verify dữ liệu migrate - kiểm tra referential integrity
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    log("=" * 60)
    log("VERIFY: Kiểm tra Referential Integrity")
    log("=" * 60)
    
    issues = []
    
    # 1. Orphan assignments (worker_id không tồn tại)
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM project_assignments pa
        LEFT JOIN workers w ON w.id = pa.worker_id
        WHERE w.id IS NULL
    """)
    orphan_assignments = cursor.fetchone()['cnt']
    if orphan_assignments > 0:
        issues.append(f"⚠️ {orphan_assignments} assignments không có worker")
    
    # 2. Orphan timesheet_lines (worker_id không tồn tại)
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM timesheet_lines tl
        LEFT JOIN workers w ON w.id = tl.worker_id
        WHERE w.id IS NULL
    """)
    orphan_lines_worker = cursor.fetchone()['cnt']
    if orphan_lines_worker > 0:
        issues.append(f"⚠️ {orphan_lines_worker} lines không có worker")
    
    # 3. Orphan timesheet_lines (period_id không tồn tại)
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM timesheet_lines tl
        LEFT JOIN timesheet_periods tp ON tp.id = tl.period_id
        WHERE tp.id IS NULL
    """)
    orphan_lines_period = cursor.fetchone()['cnt']
    if orphan_lines_period > 0:
        issues.append(f"⚠️ {orphan_lines_period} lines không có period")
    
    # 4. Duplicate assignments
    cursor.execute("""
        SELECT worker_id, project_id, COUNT(*) as cnt 
        FROM project_assignments 
        GROUP BY worker_id, project_id 
        HAVING COUNT(*) > 1
    """)
    dup_assignments = cursor.fetchall()
    if dup_assignments:
        issues.append(f"⚠️ {len(dup_assignments)} worker có >1 assignment cùng project")
    
    # 5. Workers không có assignment
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM workers w
        LEFT JOIN project_assignments pa ON pa.worker_id = w.id
        WHERE pa.id IS NULL
    """)
    orphan_workers = cursor.fetchone()['cnt']
    if orphan_workers > 0:
        issues.append(f"⚠️ {orphan_workers} workers không có assignment")
    
    conn.close()
    
    if issues:
        log("\nCác vấn đề phát hiện:")
        for issue in issues:
            log(f"  {issue}")
        return False
    else:
        log("\n✅ Tất cả referential integrity OK!")
        return True

if __name__ == "__main__":
    import sys
    
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("Mode: DRY RUN (không thay đổi dữ liệu)")
    
    # Chạy migration
    migrate_data(dry_run=dry_run)
    
    if not dry_run:
        # Verify sau migration
        verify_migration()
