"""
ETL-3: Worker Identity - Định danh Worker bằng UUID

Nguyên tắc:
- 1 người = 1 UUID (CCCD làm định danh chính)
- Khi chuyển dự án, giữ nguyên workers.id
- Tạo project_assignment mới khi vào dự án mới

Logic:
1. Lookup worker: check CCCD -> check (full_name + project) -> check (phone + project)
2. Nếu không tìm thấy: tạo worker mới + assignment đầu tiên
3. Nếu tìm thấy nhưng chưa có assignment cho dự án này: tạo assignment mới
"""

import sqlite3
import os
import uuid
import hashlib
from datetime import datetime
from typing import Optional, Tuple, List
from dataclasses import dataclass

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(APP_DIR, "hrp_local.db")


@dataclass
class Worker:
    id: str
    user_id: str
    full_name: str
    cccd_number: str
    phone: str
    employment_status: str
    created_at: str


@dataclass
class Assignment:
    id: str
    worker_id: str
    project_id: str
    employee_code: str
    employment_type: str
    valid_from: str
    status: str


def get_connection():
    """Tạo connection tới SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_cccd(cccd: str) -> str:
    """Tạo deterministic UUID từ CCCD để đồng bộ across systems"""
    if not cccd:
        return str(uuid.uuid4())
    # Dùng hash để tạo UUID deterministic (cùng CCCD = cùng UUID)
    hash_val = hashlib.sha256(cccd.encode()).hexdigest()[:32]
    return str(uuid.UUID(hash_val))


def get_or_create_worker(
    cccd_number: str = None,
    full_name: str = None,
    phone: str = None,
    project_id: str = None,
    employee_code: str = None,
    employment_type: str = "FULLTIME",
    conn: sqlite3.Connection = None
) -> Tuple[Worker, bool]:
    """
    Lấy hoặc tạo worker mới.
    
    Lookup order:
    1. CCCD number (chính xác)
    2. full_name + project_id (fuzzy)
    3. phone + project_id
    
    Args:
        cccd_number: Số CCCD/CMND
        full_name: Họ tên đầy đủ
        phone: Số điện thoại
        project_id: Mã dự án muốn assign
        employee_code: Mã nhân viên trong dự án
        employment_type: FULLTIME | PARTIME | CTV | FRESHER
        conn: Database connection
        
    Returns:
        (Worker, is_new): Worker record và flag cho biết có phải tạo mới không
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        
        # 1. Lookup by CCCD (ưu tiên cao nhất)
        if cccd_number:
            cccd_clean = cccd_number.strip().replace(' ', '').replace('-', '')
            cursor.execute(
                "SELECT * FROM workers WHERE REPLACE(REPLACE(cccd_number, ' ', ''), '-', '') = ?",
                (cccd_clean,)
            )
            row = cursor.fetchone()
            if row:
                return Worker(**dict(row)), False
        
        # 2. Lookup by full_name + phone (fallback)
        if full_name and phone:
            cursor.execute(
                "SELECT * FROM workers WHERE full_name = ? AND phone = ?",
                (full_name.strip(), phone.strip())
            )
            row = cursor.fetchone()
            if row:
                return Worker(**dict(row)), False
        
        # 3. Lookup by full_name only (ít chính xác hơn)
        if full_name:
            cursor.execute(
                "SELECT * FROM workers WHERE LOWER(full_name) = LOWER(?)",
                (full_name.strip(),)
            )
            row = cursor.fetchone()
            if row:
                return Worker(**dict(row)), False
        
        # 4. Tạo worker mới
        worker_id = hash_cccd(cccd_number) if cccd_number else str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        cursor.execute("""
            INSERT INTO workers (id, full_name, phone, cccd_number, 
                                profile_status, employment_status, risk_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'INCOMPLETE', 'NONE', 'NORMAL', ?, ?)
        """, (worker_id, full_name, phone, cccd_number, now, now))
        
        conn.commit()
        
        # Fetch lại worker vừa tạo
        cursor.execute("SELECT * FROM workers WHERE id = ?", (worker_id,))
        row = cursor.fetchone()
        return Worker(**dict(row)), True
        
    finally:
        if should_close:
            conn.close()


def get_or_create_assignment(
    worker_id: str,
    project_id: str,
    employee_code: str,
    employment_type: str = "FULLTIME",
    work_setting: str = None,
    salary_per_day: int = 0,
    valid_from: str = None,
    conn: sqlite3.Connection = None
) -> Tuple[Assignment, bool]:
    """
    Lấy hoặc tạo assignment mới cho worker vào dự án.
    
    Args:
        worker_id: Worker ID
        project_id: Dự án muốn assign
        employee_code: Mã NV trong dự án
        employment_type: FULLTIME | PARTIME | CTV | FRESHER
        work_setting: ONSITE | REMOTE | HYBRID
        salary_per_day: Lương theo ngày (VND)
        valid_from: Ngày bắt đầu (ISO format)
        conn: Database connection
        
    Returns:
        (Assignment, is_new): Assignment record và flag
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        
        # 1. Check đã có assignment chưa
        cursor.execute("""
            SELECT * FROM project_assignments 
            WHERE worker_id = ? AND project_id = ?
            ORDER BY is_primary DESC, created_at DESC
            LIMIT 1
        """, (worker_id, project_id))
        row = cursor.fetchone()
        
        if row:
            return Assignment(**dict(row)), False
        
        # 2. Tạo assignment mới
        assignment_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        valid_from = valid_from or now
        
        # Set is_primary = 1 nếu đây là assignment đầu tiên
        cursor.execute(
            "SELECT COUNT(*) FROM project_assignments WHERE worker_id = ?",
            (worker_id,)
        )
        is_first = cursor.fetchone()[0] == 0
        
        cursor.execute("""
            INSERT INTO project_assignments 
            (id, worker_id, project_id, employee_code, employment_type, work_setting,
             salary_per_day_vnd, salary_type, valid_from, status, is_primary, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'DAILY', ?, 'ACTIVE', ?, ?)
        """, (
            assignment_id, worker_id, project_id, employee_code,
            employment_type, work_setting, salary_per_day, valid_from,
            1 if is_first else 0, now
        ))
        
        conn.commit()
        
        # Fetch lại
        cursor.execute("SELECT * FROM project_assignments WHERE id = ?", (assignment_id,))
        row = cursor.fetchone()
        return Assignment(**dict(row)), True
        
    finally:
        if should_close:
            conn.close()


def lookup_worker(
    cccd_number: str = None,
    full_name: str = None,
    phone: str = None,
    project_id: str = None,
    conn: sqlite3.Connection = None
) -> Optional[Worker]:
    """
    Tra cứu worker mà không tạo mới.
    
    Returns:
        Worker record hoặc None
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        
        # By CCCD
        if cccd_number:
            cccd_clean = cccd_number.strip().replace(' ', '').replace('-', '')
            cursor.execute(
                "SELECT * FROM workers WHERE REPLACE(REPLACE(cccd_number, ' ', ''), '-', '') = ?",
                (cccd_clean,)
            )
            row = cursor.fetchone()
            if row:
                return Worker(**dict(row))
        
        # By full_name + project
        if full_name and project_id:
            # Check qua assignment
            cursor.execute("""
                SELECT w.* FROM workers w
                JOIN project_assignments pa ON w.id = pa.worker_id
                WHERE LOWER(w.full_name) = LOWER(?) AND pa.project_id = ?
                LIMIT 1
            """, (full_name.strip(), project_id))
            row = cursor.fetchone()
            if row:
                return Worker(**dict(row))
        
        # By phone
        if phone:
            cursor.execute("SELECT * FROM workers WHERE phone = ?", (phone.strip(),))
            row = cursor.fetchone()
            if row:
                return Worker(**dict(row))
        
        return None
        
    finally:
        if should_close:
            conn.close()


def get_worker_assignments(worker_id: str, conn: sqlite3.Connection = None) -> List[Assignment]:
    """Lấy tất cả assignments của một worker"""
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM project_assignments 
            WHERE worker_id = ?
            ORDER BY is_primary DESC, valid_from DESC
        """, (worker_id,))
        return [Assignment(**dict(row)) for row in cursor.fetchall()]
    finally:
        if should_close:
            conn.close()


def get_all_workers(conn: sqlite3.Connection = None, with_assignments: bool = False) -> List[dict]:
    """
    Lấy danh sách tất cả workers.
    
    Args:
        conn: Database connection
        with_assignments: Nếu True, include assignments vào kết quả
        
    Returns:
        List of worker dicts
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT w.*, 
                   COUNT(pa.id) as assignment_count,
                   GROUP_CONCAT(DISTINCT pa.project_id) as projects
            FROM workers w
            LEFT JOIN project_assignments pa ON w.id = pa.worker_id
            GROUP BY w.id
            ORDER BY w.created_at DESC
        """)
        
        workers = []
        for row in cursor.fetchall():
            w = dict(row)
            if with_assignments and w['assignment_count'] > 0:
                w['assignments'] = get_worker_assignments(w['id'], conn)
            workers.append(w)
        
        return workers
    finally:
        if should_close:
            conn.close()


def import_workers_batch(
    workers_data: List[dict],
    default_project_id: str = None,
    conn: sqlite3.Connection = None
) -> dict:
    """
    Import nhiều workers cùng lúc.
    
    Args:
        workers_data: List of dict với keys:
            - cccd_number, full_name, phone (required for identity)
            - employee_code, employment_type, salary_per_day (optional)
        default_project_id: Project ID mặc định để assign
        
    Returns:
        dict với counts: created, found, errors
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    try:
        created = 0
        found = 0
        errors = []
        
        for data in workers_data:
            try:
                worker, is_new = get_or_create_worker(
                    cccd_number=data.get('cccd_number'),
                    full_name=data.get('full_name'),
                    phone=data.get('phone'),
                    project_id=default_project_id,
                    employee_code=data.get('employee_code'),
                    employment_type=data.get('employment_type', 'FULLTIME'),
                    conn=conn
                )
                
                if is_new:
                    created += 1
                else:
                    found += 1
                    
                # Tạo assignment nếu có project_id
                if default_project_id and data.get('employee_code'):
                    assignment, _ = get_or_create_assignment(
                        worker_id=worker.id,
                        project_id=default_project_id,
                        employee_code=data.get('employee_code'),
                        employment_type=data.get('employment_type', 'FULLTIME'),
                        salary_per_day=data.get('salary_per_day', 0),
                        conn=conn
                    )
                    
            except Exception as e:
                errors.append(f"{data.get('full_name', '?')}: {str(e)}")
        
        return {
            'created': created,
            'found': found,
            'total': created + found,
            'errors': errors
        }
        
    finally:
        if should_close:
            conn.close()


if __name__ == "__main__":
    # Test
    print("=" * 60)
    print("ETL-3: Worker Identity - Test")
    print("=" * 60)
    
    conn = get_connection()
    
    # Test create worker
    worker1, is_new1 = get_or_create_worker(
        cccd_number="001234567890",
        full_name="Nguyễn Văn Test",
        phone="0909123456",
        employee_code="NV001",
        employment_type="FULLTIME"
    )
    print(f"\n1. Create worker: {worker1.id[:8]}... (is_new={is_new1})")
    
    # Test lookup same worker
    worker2, is_new2 = get_or_create_worker(
        cccd_number="001234567890"
    )
    print(f"2. Lookup same: {worker2.id[:8]}... (is_new={is_new2})")
    print(f"   Same person? {worker1.id == worker2.id}")
    
    # Test create assignment
    assignment, is_new3 = get_or_create_assignment(
        worker_id=worker1.id,
        project_id="PROJECT_ABC",
        employee_code="NV001",
        employment_type="FULLTIME",
        salary_per_day=350000
    )
    print(f"3. Create assignment: {assignment.id[:8]}... (is_new={is_new3})")
    
    # Test lookup assignment
    assignment2, is_new4 = get_or_create_assignment(
        worker_id=worker1.id,
        project_id="PROJECT_ABC",
        employee_code="NV001"
    )
    print(f"4. Lookup same assignment: (is_new={is_new4})")
    
    # List all workers
    print("\n5. All workers:")
    workers = get_all_workers(conn, with_assignments=True)
    for w in workers[:5]:
        print(f"   - {w['full_name']} ({w['cccd_number']}) | {w['assignment_count']} assignments")
    
    conn.close()
    print("\n✅ Test hoàn tất")
