"""
ETL-2: Vendor Aliases - Parse và Map Vendor

Hỗ trợ:
- Vendor type: INTERNAL, CTV, FRESHER, UNMAPPED
- Fallback: UNMAPPED khi không match được
- Auto-import từ danh sách có sẵn
"""

import sqlite3
import os
from typing import Optional, Tuple
from datetime import datetime

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(APP_DIR, "hrp_local.db")


def get_connection():
    """Tạo connection tới SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_vendor_type(raw_name: str) -> str:
    """
    Xác định vendor_type từ raw_name.
    
    Vendor types:
    - INTERNAL: nhân viên công ty
    - CTV: cộng tác viên
    - FRESHER: thực tập sinh
    - UNMAPPED: chưa map được (cần xử lý thủ công)
    """
    if not raw_name:
        return "UNMAPPED"
    
    name_upper = raw_name.upper().strip()
    
    # Pattern mapping
    patterns = {
        "INTERNAL": [
            r"^\s*(NV|CTC|CTY|CÔNG TY)\s*",  # Bắt đầu bằng NV/CTY
            r"\bCÔNG TY\b",
            r"\bNHÂN VIÊN\b",
            r"\bFTE\b",
            r"\bINTERNAL\b",
        ],
        "CTV": [
            r"\bCTV\b",
            r"\bCỘNG TÁC VIÊN\b",
            r"\bPART TIME\b",
            r"\bPT\b",
        ],
        "FRESHER": [
            r"\bFRESHER\b",
            r"\bTHỰC TẬP SINH\b",
            r"\bINTERN\b",
            r"\bTTS\b",
        ],
    }
    
    for vendor_type, pattern_list in patterns.items():
        import re
        for pattern in pattern_list:
            if re.search(pattern, name_upper):
                return vendor_type
    
    return "UNMAPPED"


def lookup_vendor_alias(raw_name: str, conn: sqlite3.Connection = None) -> Optional[dict]:
    """
    Tra cứu vendor_alias đã được map.
    
    Returns:
        dict với keys: id, raw_name, vendor_type, target_vendor_id, target_user_id
        None nếu chưa map
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM vendor_aliases WHERE raw_name = ?",
            (raw_name.strip(),)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        if should_close:
            conn.close()


def parse_vendor(raw_name: str, conn: sqlite3.Connection = None) -> Tuple[str, str, Optional[dict]]:
    """
    Parse vendor từ raw_name trong file BCC.
    
    Logic:
    1. Lookup trong bảng vendor_aliases
    2. Nếu chưa có, tự động detect vendor_type
    3. Nếu UNMAPPED, tạo alias record để user map sau
    
    Returns:
        (vendor_type, status, alias_record)
        - vendor_type: INTERNAL|CTV|FRESHER|UNMAPPED
        - status: FOUND|AUTO_DETECTED|CREATED
        - alias_record: dict hoặc None
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        # 1. Check đã map chưa
        existing = lookup_vendor_alias(raw_name, conn)
        if existing:
            return existing['vendor_type'], "FOUND", existing
        
        # 2. Auto detect vendor_type
        vendor_type = get_vendor_type(raw_name)
        
        # 3. Nếu UNMAPPED, tạo record để user map
        if vendor_type == "UNMAPPED":
            import uuid
            alias_id = str(uuid.uuid4())
            now = datetime.now().isoformat()
            
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO vendor_aliases (id, raw_name, vendor_type, created_at)
                    VALUES (?, ?, ?, ?)
                """, (alias_id, raw_name.strip(), vendor_type, now))
                conn.commit()
                
                # Fetch lại record vừa tạo
                cursor.execute("SELECT * FROM vendor_aliases WHERE id = ?", (alias_id,))
                row = cursor.fetchone()
                alias_record = dict(row) if row else None
                return vendor_type, "CREATED", alias_record
            except sqlite3.IntegrityError:
                # Race condition - đã có record khác
                return vendor_type, "FOUND", lookup_vendor_alias(raw_name, conn)
        
        return vendor_type, "AUTO_DETECTED", None
        
    finally:
        if should_close:
            conn.close()


def map_vendor_alias(raw_name: str, vendor_type: str, target_vendor_id: str = None, 
                     target_user_id: str = None, conn: sqlite3.Connection = None) -> dict:
    """
    Map một raw_name tới vendor cụ thể.
    
    Args:
        raw_name: Tên gốc từ file BCC
        vendor_type: INTERNAL|CTV|FRESHER|UNMAPPED
        target_vendor_id: ID vendor (nếu có)
        target_user_id: User ID (nếu là CTV cá nhân)
        conn: Database connection
        
    Returns:
        dict với alias record đã tạo/cập nhật
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        import uuid
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        # Check exists
        existing = lookup_vendor_alias(raw_name, conn)
        
        if existing:
            # Update
            cursor.execute("""
                UPDATE vendor_aliases 
                SET vendor_type = ?, target_vendor_id = ?, target_user_id = ?
                WHERE id = ?
            """, (vendor_type, target_vendor_id, target_user_id, existing['id']))
            alias_id = existing['id']
        else:
            # Insert
            alias_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO vendor_aliases (id, raw_name, vendor_type, target_vendor_id, target_user_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (alias_id, raw_name.strip(), vendor_type, target_vendor_id, target_user_id, now))
        
        conn.commit()
        
        # Return updated record
        cursor.execute("SELECT * FROM vendor_aliases WHERE id = ?", (alias_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
        
    finally:
        if should_close:
            conn.close()


def get_unmapped_aliases(conn: sqlite3.Connection = None) -> list:
    """Lấy danh sách aliases chưa được map (UNMAPPED)"""
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM vendor_aliases 
            WHERE vendor_type = 'UNMAPPED' 
            ORDER BY created_at DESC
        """)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        if should_close:
            conn.close()


def get_all_aliases(conn: sqlite3.Connection = None) -> list:
    """Lấy tất cả aliases"""
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT va.*, v.name as vendor_name 
            FROM vendor_aliases va
            LEFT JOIN vendors v ON va.target_vendor_id = v.id
            ORDER BY va.vendor_type, va.raw_name
        """)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        if should_close:
            conn.close()


def import_vendor_aliases(aliases: list, conn: sqlite3.Connection = None) -> dict:
    """
    Import nhiều aliases cùng lúc.
    
    Args:
        aliases: list of dict với keys: raw_name, vendor_type, target_vendor_id, target_user_id
        
    Returns:
        dict với counts: imported, skipped, errors
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        imported = 0
        skipped = 0
        errors = []
        
        for alias in aliases:
            try:
                raw_name = alias.get('raw_name')
                vendor_type = alias.get('vendor_type', 'UNMAPPED')
                target_vendor_id = alias.get('target_vendor_id')
                target_user_id = alias.get('target_user_id')
                
                if not raw_name:
                    errors.append("Missing raw_name")
                    continue
                
                result = map_vendor_alias(raw_name, vendor_type, target_vendor_id, target_user_id, conn)
                if result:
                    imported += 1
                else:
                    skipped += 1
                    
            except Exception as e:
                errors.append(f"{alias.get('raw_name', '?')}: {str(e)}")
        
        return {
            'imported': imported,
            'skipped': skipped,
            'errors': errors
        }
        
    finally:
        if should_close:
            conn.close()


if __name__ == "__main__":
    # Test
    print("=" * 60)
    print("ETL-2: Vendor Aliases - Test")
    print("=" * 60)
    
    test_names = [
        "Công Ty TNHH ABC",
        "CTV Nguyễn Văn A",
        "Fresher Trần Thị B",
        "Nhà phân phối XYZ",
        "NV Trần Văn C",
    ]
    
    conn = get_connection()
    
    print("\nParse results:")
    for name in test_names:
        vendor_type, status, record = parse_vendor(name, conn)
        print(f"  {name!r:30} -> {vendor_type:10} [{status}]")
    
    print("\nUnmapped aliases:")
    unmapped = get_unmapped_aliases(conn)
    print(f"  Total: {len(unmapped)}")
    for a in unmapped[:5]:
        print(f"  - {a['raw_name']}")
    
    conn.close()
