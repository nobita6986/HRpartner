"""
ETL-1.3: Sync SQLite Local len PostgreSQL (DATABASE_URL)

Chay: python -m migrations.v4_sync

Nguyen tac:
- 1:1 UPSERT - khong transform
- SQLite Local SCHEMA = PostgreSQL SCHEMA
- ON CONFLICT DO UPDATE de handle re-sync

NOTE: Chua sync gi len Neon trong phien nay
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import Optional, Callable, List, Dict, Any

# Fix encoding cho Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Database path
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_DB_PATH = os.path.join(APP_DIR, "hrp_local.db")

# Các bảng cần sync (theo thứ tự dependency)
SYNC_ORDER = [
    'portal_timesheets',
]

def get_local_connection():
    """Tạo connection tới SQLite local"""
    conn = sqlite3.connect(LOCAL_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_neon_engine(neon_url: str):
    """Tạo SQLAlchemy engine cho Neon"""
    from sqlalchemy import create_engine
    return create_engine(neon_url)

def get_table_data(cursor, table_name: str) -> List[Dict]:
    """Lấy tất cả data từ 1 bảng SQLite"""
    cursor.execute(f"SELECT * FROM {table_name}")
    return [dict(row) for row in cursor.fetchall()]

def get_conflict_key(table_name: str) -> Optional[str]:
    """Lấy conflict key (primary key hoặc unique) cho từng bảng"""
    conflict_keys = {
        'portal_timesheets': 'employee_code, project, period_month, period_year',
    }
    return conflict_keys.get(table_name)

def build_upsert_sql(table_name: str, columns: List[str], conflict_key: str) -> str:
    """
    Build UPSERT SQL statement
    
    Ví dụ:
        INSERT INTO workers (id, full_name, ...) VALUES (:id, :full_name, ...)
        ON CONFLICT(id) DO UPDATE SET
            full_name = EXCLUDED.full_name, ...
    """
    # Loại bỏ các cột auto-generated nếu có
    excluded_cols = ['id', 'created_at']
    
    set_clauses = []
    for col in columns:
        if col not in excluded_cols:
            set_clauses.append(f"{col} = EXCLUDED.{col}")
    
    cols_placeholder = ', '.join([f":{c}" for c in columns])
    cols_list = ', '.join(columns)
    set_clause = ', '.join(set_clauses)
    
    sql = f"""
        INSERT INTO {table_name} ({cols_list})
        VALUES ({cols_placeholder})
        ON CONFLICT({conflict_key}) DO UPDATE SET
            {set_clause}
    """
    return sql.strip()

def sync_table(
    neon_conn,
    table_name: str,
    records: List[Dict],
    log: Callable = print,
    batch_size: int = 100
) -> Dict[str, int]:
    """
    Sync 1 bảng từ SQLite lên Neon
    
    Returns: {'inserted': n, 'updated': n, 'errors': n}
    """
    if not records:
        log(f"  ⏭️  Bỏ qua {table_name} (không có dữ liệu)")
        return {'inserted': 0, 'updated': 0, 'errors': 0}
    
    conn = get_local_connection()
    cursor = conn.cursor()
    
    # Lấy schema của bảng
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row['name'] for row in cursor.fetchall()]
    
    conflict_key = get_conflict_key(table_name)
    if not conflict_key:
        log(f"  ❌ Không tìm thấy conflict key cho {table_name}")
        return {'inserted': 0, 'updated': 0, 'errors': len(records)}
    
    # Build SQL
    upsert_sql = build_upsert_sql(table_name, columns, conflict_key)
    
    # Stats
    stats = {'inserted': 0, 'updated': 0, 'errors': 0}
    
    # Execute batch
    log(f"  📤 Sync {len(records)} records...")
    
    try:
        cursor_batch = neon_conn.cursor()
        
        for i, record in enumerate(records):
            try:
                # Filter columns that don't exist in target
                filtered_record = {k: v for k, v in record.items() if k in columns}
                
                cursor_batch.execute(upsert_sql, filtered_record)
                
                # Check if inserted or updated
                # (sqlite doesn't return this easily, so we count by exception)
                stats['inserted'] += 1
                
                if (i + 1) % batch_size == 0:
                    log(f"    Đã sync {i + 1}/{len(records)}...")
                    
            except Exception as e:
                stats['errors'] += 1
                if stats['errors'] <= 5:  # Log first 5 errors
                    log(f"    ❌ Lỗi: {record.get('id', 'unknown')}: {str(e)}")
        
        conn.close()
        
        log(f"  ✅ {table_name}: {stats['inserted']} synced, {stats['errors']} errors")
        return stats
        
    except Exception as e:
        log(f"  ❌ Lỗi nghiêm trọng sync {table_name}: {str(e)}")
        return {'inserted': 0, 'updated': 0, 'errors': len(records)}

def sync_to_neon(
    neon_url: str,
    log: Callable = print,
    tables: Optional[List[str]] = None,
    since: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Sync tất cả data từ SQLite lên Neon
    
    Args:
        neon_url: PostgreSQL connection string (postgresql://user:pass@host/db)
        log: Logger callback
        tables: List bảng cần sync (None = tất cả)
        since: Chỉ sync records được tạo/sửa sau thời điểm này
    
    Returns:
        Dict với thống kê sync
    """
    from sqlalchemy import create_engine, text
    
    log("=" * 60)
    log("ETL-1.3: SYNC SQLite → Neon")
    log(f"Target: {neon_url.split('@')[-1] if '@' in neon_url else neon_url}")
    log("=" * 60)
    
    # Tables để sync
    sync_tables = tables or SYNC_ORDER
    
    # Connection
    conn = get_local_connection()
    cursor = conn.cursor()
    
    # Neon engine
    try:
        engine = create_engine(neon_url)
        neon_conn = engine.connect()
        neon_conn.execute(text("SELECT 1"))  # Test connection
        log("✅ Kết nối Neon thành công")
    except Exception as e:
        log(f"❌ Không kết nối được Neon: {str(e)}")
        conn.close()
        return {'success': False, 'error': str(e)}
    
    # Stats tổng
    total_stats = {
        'tables': 0,
        'records': 0,
        'errors': 0,
        'details': {}
    }
    
    # Sync từng bảng
    for table_name in sync_tables:
        if table_name not in SYNC_ORDER:
            continue
            
        log(f"\n[{len(total_stats['details']) + 1}/{len(sync_tables)}] Sync table: {table_name}")
        
        # Get data from SQLite
        if since:
            cursor.execute(f"SELECT * FROM {table_name} WHERE updated_at >= ?", (since.isoformat(),))
        else:
            cursor.execute(f"SELECT * FROM {table_name}")
        
        records = [dict(row) for row in cursor.fetchall()]
        
        # Sync lên Neon
        stats = sync_table(neon_conn, table_name, records, log)
        
        total_stats['tables'] += 1
        total_stats['records'] += stats['inserted']
        total_stats['errors'] += stats['errors']
        total_stats['details'][table_name] = stats
    
    # Commit & close
    try:
        neon_conn.commit()
        log("\n✅ Commit thành công!")
    except Exception as e:
        log(f"\n⚠️ Commit lỗi: {str(e)}")
    
    neon_conn.close()
    engine.dispose()
    conn.close()
    
    # Summary
    log("\n" + "=" * 60)
    log("SYNC SUMMARY")
    log("=" * 60)
    log(f"  Tables synced: {total_stats['tables']}")
    log(f"  Total records: {total_stats['records']}")
    log(f"  Errors: {total_stats['errors']}")
    
    for table, stats in total_stats['details'].items():
        log(f"    - {table}: {stats['inserted']} synced, {stats['errors']} errors")
    
    total_stats['success'] = total_stats['errors'] == 0
    return total_stats

def sync_incremental(
    neon_url: str,
    log: Callable = print,
    batch_size: int = 50
) -> Dict[str, Any]:
    """
    Sync chỉ các thay đổi (incremental sync)
    Dựa trên bảng sync_logs
    """
    from sqlalchemy import create_engine, text
    
    conn = get_local_connection()
    cursor = conn.cursor()
    
    # Lấy các records cần sync từ sync_logs
    cursor.execute("""
        SELECT * FROM sync_logs 
        WHERE sync_status = 'PENDING'
        ORDER BY created_at
        LIMIT ?
    """, (batch_size,))
    
    pending = [dict(row) for row in cursor.fetchall()]
    
    if not pending:
        log("⏭️ Không có thay đổi nào cần sync")
        conn.close()
        return {'success': True, 'synced': 0}
    
    # Group by table
    by_table = {}
    for record in pending:
        table = record['table_name']
        if table not in by_table:
            by_table[table] = []
        by_table[table].append(record['record_id'])
    
    # Sync
    engine = create_engine(neon_url)
    neon_conn = engine.connect()
    
    total_synced = 0
    for table_name, record_ids in by_table.items():
        placeholders = ','.join(['?' for _ in record_ids])
        cursor.execute(f"SELECT * FROM {table_name} WHERE id IN ({placeholders})", record_ids)
        records = [dict(row) for row in cursor.fetchall()]
        
        stats = sync_table(neon_conn, table_name, records, log)
        total_synced += stats['inserted']
        
        # Update sync_logs
        for record_id in record_ids:
            cursor.execute("""
                UPDATE sync_logs 
                SET sync_status = 'SYNCED', synced_at = CURRENT_TIMESTAMP
                WHERE table_name = ? AND record_id = ?
            """, (table_name, record_id))
    
    conn.commit()
    neon_conn.commit()
    neon_conn.close()
    engine.dispose()
    conn.close()
    
    log(f"✅ Incremental sync: {total_synced} records")
    return {'success': True, 'synced': total_synced}

def setup_neon_schema(neon_url: str, log: Callable = print):
    """
    Tạo schema trên Neon (chạy 1 lần khi setup)
    """
    from sqlalchemy import create_engine, text
    
    log("=" * 60)
    log("SETUP: Tạo Schema V4 trên Neon")
    log("=" * 60)
    
    engine = create_engine(neon_url)
    neon_conn = engine.connect()
    
    # Đọc và execute migration SQL
    # (Prisma sẽ tự động tạo, nhưng đây là backup)
    migrations = [
        # Workers
        """
        CREATE TABLE IF NOT EXISTS workers (
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
        )
        """,
        # ... thêm các bảng khác tương tự
    ]
    
    for i, sql in enumerate(migrations):
        try:
            neon_conn.execute(text(sql))
            log(f"  ✅ Migration {i + 1} thành công")
        except Exception as e:
            log(f"  ⚠️ Migration {i + 1}: {str(e)}")
    
    neon_conn.commit()
    neon_conn.close()
    engine.dispose()
    
    log("\n✅ Setup schema hoàn tất!")

if __name__ == "__main__":
    import sys
    
    # Load env tu thu muc HrP (parent cua appBCC)
    from dotenv import load_dotenv
    hrp_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(hrp_root, '.env')
    load_dotenv(env_path)
    
    action = sys.argv[1] if len(sys.argv) > 1 else 'sync'
    db_url = os.environ.get('DATABASE_URL')
    
    if not db_url:
        print("❌ Chua cau hinh DATABASE_URL trong .env")
        print(f"   Kiem tra file: {env_path}")
        sys.exit(1)
    
    if action == 'sync':
        result = sync_to_neon(db_url)
        sys.exit(0 if result['success'] else 1)
    elif action == 'incremental':
        result = sync_incremental(db_url)
        sys.exit(0 if result['success'] else 1)
    elif action == 'setup':
        setup_neon_schema(db_url)
    else:
        print(f"Unknown action: {action}")
        print("Usage: python -m migrations.v4_sync [sync|incremental|setup]")
        sys.exit(1)
