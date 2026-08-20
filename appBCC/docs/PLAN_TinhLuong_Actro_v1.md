# PLAN: Hoàn thiện App Tính Lương Actro

**Ngày tạo:** 2026-08-18
**Người tạo:** AI Assistant
**Trạng thái:** Draft - Cần review
**Phiên bản:** 1.6 - ETL vs BCC Phases

---

## MỤC LỤC

1. [PHẦN 1: Tổng quan](#phần-1-tổng-quan)
2. [PHẦN 2: Các vấn đề định hướng](#phần-2-các-vấn-đề-và-định-hướng-xử-lý)
3. [PHẦN 3: Roadmap chi tiết ETL vs BCC](#phần-3-roadmap-thực-hiện)
4. [PHẦN 4: Cấu trúc Database](#phần-4-cấu-trúc-database-đề-xuất)
5. [PHẦN 13: Mapping Nhân viên & Người tuyển](#phần-13-mapping-nhân-viên-và-người-tuyển-recruiter)
6. [PHẦN 14: Đồng bộ Neon DB](#phần-14-đồng-bộ-dữ-liệu-với-neon-db-v4-compatible)
7. [PHẦN 15: Worker Identity (V4)](#phần-15-worker-identity---theo-thiết-kế-v4)
8. [PHẦN 17: Worker Portal (V4-Native)](#phần-17-worker-portal-v4-native)
9. [PHẦN 18: Review Log](#phần-18-ghi-chép-tiếp-nhận-review-2026-08-18)

---

## PHẦN 1: TỔNG QUAN

### 1.1 Mục tiêu

Xây dựng ứng dụng ETL cho HRP với các yêu cầu:

1. **Giai đoạn đầu:** Làm sạch và xây dựng CSDL nhân viên, lương cho các dự án
2. **Về sau:** Đẩy dữ liệu sạch lên DB Neon của SaaS HRP
3. **Tương thích 100%:** SQLite local phải mirror chính xác schema Neon (V4)

### 1.2 Nguyên tắc vàng

```
┌─────────────────────────────────────────────────────────────┐
│  NGUYÊN TẮC: 1-1 MAPPING                               │
├─────────────────────────────────────────────────────────────┤
│  SQLite Local SCHEMA = PostgreSQL Neon SCHEMA              │
│  Sync lên Neon = chuẩn 100%, không transform            │
└─────────────────────────────────────────────────────────────┘
```

---

## PHẦN 2: CÁC VẤN ĐỀ VÀ ĐỊNH HƯỚNG XỬ LÝ

### 2.1 Vấn đề: PHỤ CẤP KHÔNG ĐỀU

**Mô tả:** Một số phụ cấp không theo quy tắc cố định, thay đổi theo tháng.

**Giải pháp:** Bảng `manual_allowances` trong SQLite

### 2.2 Vấn đề: TRỪ ỨNG TIỀN

**Giải pháp:** Bảng `advance_salary` trong SQLite

### 2.3 Vấn đề: KẾT NỐI DATABASE NHÂN VIÊN

**Giải pháp:** Bảng `employees` + đọc `base_salary` từ DB

### 2.4 Vấn đề: BHXH, THUẾ TNCN

**Giải pháp:** Tính theo biểu thuế lũy tiến VN

### 2.5 Vấn đề: NHÂN VIÊN THỬ VIỆC / NGHỈ VIỆC

**Giải pháp:** Tính theo `(base_salary / 26 / 8) * tong_gio_cong_hc`

---

## PHẦN 3: ROADMAP THỰC HIỆN

### 3.1 Tổng quan 2 nhánh

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HỆ THỐNG HRP HOÀN CHỈNH                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐         ┌─────────────────────────┐         │
│  │    NHÁNH ETL PYTHON     │         │      NHÁNH BCC          │         │
│  │   (Desktop App)        │         │    (HRP Web)           │         │
│  ├─────────────────────────┤         ├─────────────────────────┤         │
│  │ • Đọc file Excel BCC   │         │ • Worker Portal        │         │
│  │ • Tính lương          │         │ • Vendor Portal        │         │
│  │ • Human-in-the-Loop    │         │ • Admin Dashboard      │         │
│  │ • Đối soát            │         │ • API cho ETL          │         │
│  │ • Sync lên Neon       │         │ • Timesheet CRUD       │         │
│  └───────────┬─────────────┘         └───────────┬─────────────┘         │
│              │                                     │                       │
│              │ 1:1 UPSERT                         │ Query                 │
│              ▼                                     ▼                       │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    NEON POSTGRESQL (V4 Schema)                 │       │
│  │  workers | project_assignments | timesheet_lines | vendors ...  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Bảng Phase chi tiết

| Phase | Tên | Nhánh | Trạng thái | Ưu tiên | Mô tả |
|-------|------|-------|------------|----------|--------|
| **ETL-1** | Schema V4 + Sync | ETL Python | ⏳ Chờ | **P0** | SQLite mirror schema.prisma + sync 1:1 |
| **ETL-2** | Vendor Aliases | ETL Python | ✅ Hoàn thành | P1 | Bảng từ điển vendor + UI map |
| **ETL-3** | Worker Identity | ETL Python | ✅ Hoàn thành | P1 | UUID worker + assignment |
| **ETL-4** | Đối soát | ETL Python | ✅ Hoàn thành | **P0** | Reconciliation UI |
| **BCC-1** | Worker Portal API | BCC | ✅ Migrated V4 + ETL tắt portal_timesheets | **P0** | `app/bcc/actions.ts` đọc V4; `core_pipeline.py` no-op INSERT/UPDATE/DELETE trên `portal_timesheets` |
| **BCC-2** | Worker Portal UI | BCC | ⏳ Chờ | P1 | Trang xem công/lương cho NLD |
| **BCC-3** | Vendor Portal | BCC | ⏳ Chờ | P2 | Trang xem hoa hồng cho vendor |
| **BCC-4** | Admin Dashboard | BCC | ⏳ Chờ | P2 | Dashboard tổng hợp |
| **SYNC-1** | Push to Neon | ETL Python | ⏳ Chờ | P2 | 1:1 UPSERT lên Neon |

---

### 3.3 Chi tiết từng Phase

#### ETL-1: Schema V4 + Sync (ETL Python) ⭐ P0

```
MỤC TIÊU: SQLite local = mirror chính xác schema.prisma

CÔNG VIỆC:
├── Tạo bảng mới trong SQLite:
│   ├── workers (định danh NGƯỜI)
│   ├── project_assignments (mã NV theo dự án)
│   ├── vendors
│   ├── source_claims
│   ├── timesheet_periods
│   ├── timesheet_lines
│   └── vendor_aliases
├── Migrate dữ liệu từ portal_timesheets cũ
├── Viết hàm sync_to_neon() - 1:1 UPSERT
└── Test sync với Neon

OUTPUT: SQLite schema đồng nhất với Neon
```

#### ETL-2: Vendor Aliases (ETL Python) ⭐ P1

```
MỤC TIÊU: Parse vendor từ file BCC (không có prefix "VD" cố định)

CÔNG VIỆC:
├── Tạo bảng vendor_aliases
├── UI để map raw_name → vendor_type + target_id
├── Logic parse_vendor() với fallback UNMAPPED
└── Import danh sách vendor có sẵn

OUTPUT: Mỗi nhân viên được gán đúng vendor
```

#### ETL-3: Worker Identity (ETL Python) ⭐ P1

```
MỤC TIÊU: Định danh worker bằng UUID, không phụ thuộc mã NV

CÔNG VIỆC:
├── Sinh UUID cho mỗi worker (CCCD làm định danh)
├── Tạo project_assignment khi worker vào dự án mới
├── Lookup worker theo CCCD hoặc full_name + project
└── Giữ workers.id cố định khi chuyển dự án

OUTPUT: 1 người = 1 UUID, nhiều assignment
```

#### ETL-4: Đối soát (ETL Python) ⭐ P0

```
MỤC TIÊU: Verify kết quả tính lương = đúng với LCNT

CÔNG VIỆC:
├── So sánh từng salary item với LCNT
├── Tính diff: app tính vs LCNT
├── Ngưỡng chấp nhận (ví dụ: >100k = warning)
├── UI highlight diff
└── Nút "Xuất báo cáo đối soát"

OUTPUT: Trust cao vào kết quả app
```

#### BCC-1: Worker Portal API (BCC) ⭐ P0

```
MỤC TIÊU: API để worker xem công/lương của mình

CÔNG VIỆC:
├── GET /api/worker/:workerId/timesheet
├── GET /api/worker/:workerId/payslip
├── JOIN từ workers → assignments → timesheet_lines
├── Không cần bảng tạm, query trực tiếp V4 tables
└── Authentication + Authorization

OUTPUT: JSON API cho Worker Portal
```

#### BCC-2: Worker Portal UI (BCC) ⭐ P1

```
MỤC TIÊU: Trang web cho NLD xem công/lương

CÔNG VIỆC:
├── Trang đăng nhập worker
├── Trang xem bảng công (daily lines)
├── Trang xem phiếu lương (payslip)
├── Responsive mobile-first
└── Nút tải PDF

OUTPUT: https://hrp.vn/worker
```

#### BCC-3: Vendor Portal (BCC) ⭐ P2

```
MỤC TIÊU: Trang web cho vendor xem hoa hồng

CÔNG VIỆC:
├── Trang đăng nhập vendor
├── Dashboard hoa hồng theo tháng
├── Lịch sử thanh toán
└── Export Excel

OUTPUT: https://hrp.vn/vendor
```

#### BCC-4: Admin Dashboard (BCC) ⭐ P2

```
MỤC TIÊU: Dashboard cho HR Admin

CÔNG VIỆC:
├── Tổng hợp lương theo dự án
├── Biểu đồ so sánh
├── Export tổng hợp
└── Phê duyệt timesheet

OUTPUT: https://hrp.vn/admin
```

#### SYNC-1: Push to Neon (ETL Python) ⭐ P2

```
MỤC TIÊU: Đẩy dữ liệu từ SQLite lên Neon

CÔNG VIỆC:
├── Batch sync: workers, assignments, source_claims
├── Real-time sync: timesheet_lines
├── Conflict resolution (ON CONFLICT DO UPDATE)
├── Retry mechanism
└── Log/success notification

OUTPUT: Neon DB đồng bộ với SQLite
```

---

### 3.4 Thứ tự thực hiện đề xuất

```
Tuần 1-2: ETL-1 (Schema V4) → ETL-4 (Đối soát)
Tuần 3-4: ETL-2 (Vendor Aliases) → ETL-3 (Worker Identity)
Tuần 5-6: BCC-1 (Worker Portal API)
Tuần 7-8: BCC-2 (Worker Portal UI)
Tuần 9+:  BCC-3 → BCC-4 → SYNC-1
```

---

### 3.5 Trạng thái hiện tại

| Phase | Nhánh | Trạng thái |
|-------|-------|------------|
| ETL-1 | ETL Python | ✅ **Hoàn thành** (Schema mới) |
| ETL-4 | ETL Python | ✅ **Hoàn thành** (Đối soát HC) |
| BCC-1 | BCC | ✅ **Migrated V4** (Worker Portal đọc từ workers + assignments + timesheet_lines) |
| BCC-2 | BCC | ⏳ Chờ BCC-1 |
| ETL-2 | ETL Python | ✅ **Hoàn thành** (Vendor Aliases) |
| ETL-3 | ETL Python | ✅ **Hoàn thành** (Worker Identity) |
| SYNC-1 | ETL Python | ⏳ Chờ xử lý |
| BCC-3 | BCC | ⏳ Chờ xử lý |
| BCC-4 | BCC | ⏳ Chờ xử lý |

---

## PHẦN 4: CẤU TRÚC DATABASE ĐỀ XUẤT (V4-COMPATIBLE)

### 4.1 Schema SQLite Local MỚI (Mirror của schema.prisma)

```sql
-- ══════════════════════════════════════════════════════════════════════
-- WORKERS (định danh NGƯỜI - vĩnh viễn)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE workers (
    id TEXT PRIMARY KEY,                    -- UUID, định danh vĩnh viễn
    user_id TEXT UNIQUE,                   -- USR-001 (tài khoản login)
    full_name TEXT NOT NULL,
    phone TEXT,
    cccd_number TEXT UNIQUE,              -- CCCD/CMND (định danh)
    
    -- VN compliance
    gender TEXT,                           -- MALE | FEMALE | OTHER
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
);

-- ══════════════════════════════════════════════════════════════════════
-- PROJECT_ASSIGNMENTS (mã NV theo DỰ ÁN)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE project_assignments (
    id TEXT PRIMARY KEY,                    -- UUID
    worker_id TEXT NOT NULL,               -- FK → workers.id
    project_id TEXT NOT NULL,              -- actro_vp, beepro
    employee_code TEXT NOT NULL,           -- Mã NV tại dự án
    employment_type TEXT NOT NULL,         -- HRP_EMPLOYED | OUTSOURCED
    work_setting TEXT,                    -- PHOTHONG | VANPHONG | CONGXUONG
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    status TEXT DEFAULT 'PLANNED',
    salary_per_day_vnd INTEGER DEFAULT 0,
    salary_type TEXT DEFAULT 'DAILY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, employee_code)
);

-- ══════════════════════════════════════════════════════════════════════
-- VENDORS (đơn vị tuyển dụng)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE vendors (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,            -- VD-001
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════════════════════
-- SOURCE_CLAIMS (map recruiter - ai tuyển người này)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE source_claims (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    claim_type TEXT NOT NULL,            -- HRP_DIRECT | VENDOR_SUPPLIED | CTV_REFERRAL
    vendor_id TEXT,
    ctv_id TEXT,
    accepted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, claim_type)
);

-- ══════════════════════════════════════════════════════════════════════
-- VENDOR_ALIASES (từ điển người tuyển)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE vendor_aliases (
    id TEXT PRIMARY KEY,
    raw_name TEXT NOT NULL UNIQUE,      -- Giá trị gốc từ file BCC
    vendor_type TEXT NOT NULL,           -- VD | HRP_DIRECT | CTV_REFERRAL
    target_vendor_id TEXT,
    target_user_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════════════════════
-- TIMESHEET_PERIODS (kỳ lương)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE timesheet_periods (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING',     -- PENDING|REVIEWED|APPROVED|LOCKED
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, month, year, version)
);

-- ══════════════════════════════════════════════════════════════════════
-- TIMESHEET_LINES (dòng chấm công hàng ngày)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE timesheet_lines (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    work_date DATE NOT NULL,
    regular_hours DECIMAL(5,2) DEFAULT 0,
    ot15_hours DECIMAL(5,2) DEFAULT 0,
    ot20_hours DECIMAL(5,2) DEFAULT 0,
    ot30_hours DECIMAL(5,2) DEFAULT 0,
    allowance TEXT,                      -- JSON
    source TEXT DEFAULT 'MANUAL',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period_id, worker_id, work_date)
);

-- ══════════════════════════════════════════════════════════════════════
-- MANUAL_ALLOWANCES (phụ cấp thủ công)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE manual_allowances (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    allowance_type TEXT NOT NULL,       -- thuong | ho_tro_xang | phu_cap_vi_tri...
    amount INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, period_month, period_year, allowance_type)
);

-- ══════════════════════════════════════════════════════════════════════
-- PORTALTIMESHEET (BẢNG TẠM - cho UI Desktop)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE portal_timesheets (
    id TEXT PRIMARY KEY,
    employee_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    project TEXT NOT NULL,
    period_month INTEGER,
    period_year INTEGER,
    total_work_days REAL,
    ot_hours REAL,
    absent_days REAL,
    daily_data TEXT,
    payroll_data TEXT,
    total_income REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_code, project, period_month, period_year)
);
```

---

## PHẦN 13: MAPPING NHÂN VIÊN VÀ NGƯỜI TUYỂN (RECRUITER)

### 13.1 Bối cảnh

- Trong file BCC có cột "Vendor" với các giá trị: "Trường VP", "Ninh", "Hiệp Nguyễn", "Phương"
- Mỗi nhân viên được tuyển bởi 1 người/đơn vị cụ thể
- Người tuyển sẽ hưởng hoa hồng (commission)
- **Không phải ai cũng có prefix "VD"** - cần bảng từ điển

### 13.2 Giải pháp: Vendor Aliases

```sql
-- Bảng vendor_aliases
INSERT INTO vendor_aliases (id, raw_name, vendor_type, target_vendor_id)
VALUES 
    (gen_uuid(), 'Trường VP', 'VD', 'VD-001'),
    (gen_uuid(), 'Ninh', 'HRP_DIRECT', NULL),
    (gen_uuid(), 'Hiệp Nguyễn', 'VD', 'VD-002'),
    (gen_uuid(), 'Phương', 'HRP_DIRECT', NULL);
```

### 13.3 Logic xử lý

```python
def parse_vendor(raw_vendor_name, db):
    """
    Parse vendor từ text thô
    """
    # 1. Tra bảng alias
    alias = db.get_vendor_alias(raw_vendor_name.strip())
    if alias:
        return alias
    
    # 2. Chưa có → trả về để UI prompt
    return {
        "raw_name": raw_vendor_name,
        "vendor_type": None,
        "status": "UNMAPPED"
    }

def map_vendor_manually(raw_name, vendor_type, target_id):
    """
    Kế toán map vendor thủ công - ghi nhớ cho tháng sau
    """
    db.save_vendor_alias(raw_name, vendor_type, target_id)
```

---

## PHẦN 14: ĐỒNG BỘ DỮ LIỆU VỚI NEON DB (V4-COMPATIBLE)

### 14.1 Nguyên tắc

```
┌─────────────────────────────────────────────────────────────┐
│  SQLite Local SCHEMA = PostgreSQL Neon SCHEMA              │
│  Sync = 1:1 UPSERT, không transform                     │
│  PortalTimesheet = BẢNG TẠM (không sync)              │
└─────────────────────────────────────────────────────────────┘
```

### 14.2 Logic Sync

```python
def sync_to_neon(local_db_path, neon_db_url, log_callback=print):
    """
    Sync tất cả dữ liệu từ SQLite local lên Neon
    = 1:1 UPSERT, không transform
    """
    local_conn = sqlite3.connect(local_db_path)
    local_conn.row_factory = sqlite3.Row
    neon_engine = create_engine(neon_db_url)
    
    # 1. SYNC VENDORS
    vendors = local_conn.execute("SELECT * FROM vendors").fetchall()
    for v in vendors:
        upsert = text('''
            INSERT INTO vendors (id, code, name, status, created_at)
            VALUES (:id, :code, :name, :status, :created_at)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name
        ''')
        with neon_engine.begin() as conn:
            conn.execute(upsert, dict(v))
    log_callback(f"✓ Sync {len(vendors)} vendors")
    
    # 2. SYNC WORKERS
    workers = local_conn.execute("SELECT * FROM workers").fetchall()
    for w in workers:
        upsert = text('''
            INSERT INTO workers (id, full_name, phone, cccd_number, 
                              profile_status, employment_status, created_at, updated_at)
            VALUES (:id, :full_name, :phone, :cccd_number,
                   :profile_status, :employment_status, :created_at, :updated_at)
            ON CONFLICT (cccd_number) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone,
                updated_at = NOW()
        ''')
        with neon_engine.begin() as conn:
            conn.execute(upsert, dict(w))
    log_callback(f"✓ Sync {len(workers)} workers")
    
    # 3. SYNC PROJECT_ASSIGNMENTS
    # 4. SYNC SOURCE_CLAIMS
    # 5. SYNC TIMESHEET_PERIODS
    # 6. SYNC TIMESHEET_LINES
    
    local_conn.close()
    log_callback("✅ SYNC HOÀN TẤT!")
```

---

## PHẦN 15: WORKER IDENTITY - THEO THIẾT KẾ V4

### 15.1 Vấn đề

> Cùng 1 người, khi ở Actro có mã "A601010731", khi sang dự án khác sẽ có mã khác. Làm sao định danh được khi không gán vào dự án nào?

### 15.2 Giải pháp từ UNIFIED_PLAN_v4.md (F16)

```
┌─────────────────────────────────────────────────────────────┐
│  THIẾT KẾ V4 (F16)                                   │
├─────────────────────────────────────────────────────────────┤
│  1. WORKER = Định danh NGƯỜI (vĩnh viễn)          │
│     ├── id (UUID) ───→ Cố định, không đổi theo dự án  │
│     └── cccd_number ───→ Định danh phụ                 │
│                                                             │
│  2. ASSIGNMENT = Định danh MÃ NV tại DỰ ÁN CỤ THỂ    │
│     ├── employee_code "A601010731" (Actro)               │
│     └── employee_code "BP-0056" (BeePro)                 │
└─────────────────────────────────────────────────────────────┘
```

### 15.3 Ví dụ thực tế

```
SCENARIO: Người lao động "Nguyễn Văn A"

THÁNG 07/2026 - ACTRO:
  workers.id = "w-uuid-001"
  project_assignments.employee_code = "A601010731"
  project_assignments.project_id = "actro_vp"

THÁNG 10/2026 - CHUYỂN SANG BEEPRO:
  → Tạo assignment MỚI:
  project_assignments.employee_code = "BP-0056"
  project_assignments.project_id = "beepro"
  
  → workers.id VẪN LÀ "w-uuid-001" (không đổi)
```

---

## PHẦN 16: CHECKLIST TRƯỚC KHI IMPLEMENT

### 16.1 Thông tin cần thu thập

- [x] File BCC có cột "Vendor" - giá trị: "Trường VP", "Ninh", "Hiệp Nguyễn", "Phương"
- [x] Không có prefix "VD" cố định - cần bảng vendor_aliases
- [ ] Mã nhân viên trong file BCC có duy nhất không?
- [ ] Công thức tính hoa hồng recruiter?

### 16.2 Quyết định kiến trúc

- [x] Dùng SQLite Local làm staging trước khi sync lên Neon
- [x] Sync = 1:1 UPSERT, không transform
- [x] PortalTimesheet = bảng tạm cho UI, không sync

---

## PHẦN 17: WORKER PORTAL (V4-NATIVE)

### 17.1 Nguyên tắc

```
┌─────────────────────────────────────────────────────────────┐
│  WORKER PORTAL = QUERY TRỰC TIẾP TỪ V4 TABLES       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  KHÔNG cần bảng tạm trên Neon                         │
│  KHÔNG cần DB riêng cho Worker Portal                  │
│                                                             │
│  Worker Portal chỉ việc query từ:                       │
│  ├── workers                                             │
│  ├── project_assignments                                  │
│  └── timesheet_lines                                      │
│                                                             │
│  → Đơn giản, sạch sẽ, không duplicate data          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 API Worker Portal

```typescript
// GET /api/worker/:workerId/timesheet?month=7&year=2026

interface WorkerTimesheetResponse {
  worker: {
    id: string;
    full_name: string;
    cccd_number: string;
  };
  assignment: {
    employee_code: string;
    project_name: string;
    employment_type: string;
  };
  period: {
    month: number;
    year: number;
    status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'LOCKED';
  };
  daily_lines: Array<{
    work_date: string;
    regular_hours: number;
    ot15_hours: number;
    ot20_hours: number;
    ot30_hours: number;
    allowance: Record<string, number>;  // JSON parsed
  }>;
  summary: {
    total_work_days: number;
    total_ot_hours: number;
    gross_salary: number;
    deductions: number;
    net_salary: number;
  };
}
```

### 17.3 SQL Query cho Worker Portal

```sql
-- Lấy timesheet của worker trong kỳ
SELECT
    w.id as worker_id,
    w.full_name,
    pa.employee_code,
    p.name as project_name,
    tp.month,
    tp.year,
    tp.status as period_status,
    tl.work_date,
    tl.regular_hours,
    tl.ot15_hours,
    tl.ot20_hours,
    tl.ot30_hours,
    tl.allowance
FROM workers w
JOIN project_assignments pa ON pa.worker_id = w.id
JOIN projects p ON p.id = pa.project_id
JOIN timesheet_periods tp ON tp.project_id = pa.project_id
    AND tp.month = :month AND tp.year = :year
JOIN timesheet_lines tl ON tl.period_id = tp.id
    AND tl.worker_id = w.id
WHERE w.id = :worker_id
    AND pa.status = 'ACTIVE'
ORDER BY tl.work_date;
```

### 17.4 So sánh các hướng đi

| Hướng | Ưu điểm | Nhược điểm |
|-------|----------|------------|
| **V4-Native** (✅ Chọn) | Đơn giản, không duplicate, dễ maintain | Cần API layer tốt |
| Tách DB riêng | Isolation rõ ràng | Sync phức tạp, duplicate data |
| Hybrid (PortalTimesheet) | Tương thích ngược | Denormalized, cần transform |

### 17.5 Khi nào cần tạo bảng tạm?

```
┌─────────────────────────────────────────────────────────────┐
│  BẢNG TẠM = CHỈ KHI CẦN PERFORMANCE QUERY PHỨC TẠP     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ví dụ: Dashboard tổng hợp 1000+ workers               │
│  → Có thể tạo MATERIALIZED VIEW                          │
│  → Nhưng đây là optimization, không phải design flaw    │
│                                                             │
│  Worker Portal = 1 worker × 1 kỳ = ĐƠN GIẢN             │
│  → Không cần bảng tạm                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## PHẦN 18: GHI CHÉP TIẾP NHẬN REVIEW (2026-08-18)

### 18.1 Các ý kiến đã tiếp nhận

| # | Ý kiến | Phản hồi |
|---|---------|-----------|
| A1 | Đọc "Loại" từ DB | ✅ Thêm trường `loai_cong_viec` vào bảng workers |
| A2 | Công thức nghỉ giữa tháng | ✅ `(base/26/8) * tong_gio_cong_hc` |
| B1 | Vendor không có prefix "VD" | ✅ Bảng vendor_aliases + UI map |
| C1 | Idempotency source_claims | ✅ UNIQUE(worker_id, claim_type) |
| C2 | Ghi đè Timesheet | ✅ ON CONFLICT DO UPDATE |
| D1 | Worker Portal architecture | ✅ V4-Native - query trực tiếp từ V4 tables |

---

**Trạng thái:** Đã cập nhật theo review + kiến trúc V4
**Ngày cập nhật:** 2026-08-18
**Phiên bản:** 1.6 - ETL vs BCC Phases

---

## PHẦN 19: BCC MIGRATION ROADMAP (2026-08-18)

### 19.1 Context
Sau khi `app/bcc/actions.ts` đã được migrate đọc trực tiếp V4 tables (BCC-1 xong),
các bước còn lại để **đồng bộ hoàn toàn** giữa app Python ETL ↔ Neon Postgres ↔ BCC Portal:

### 19.2 Bước 2 — Generate `user_id` cho Workers (F16)

**Vấn đề:**
- `Worker.userId` (Prisma): Primary UserID — "USR-001", KHÔNG đổi (F16).
- Hiện tại `worker_identity.py` chỉ generate `id` (UUID từ CCCD), **không generate `user_id`**.
- Neon Postgres sẽ **từ chối INSERT** nếu `user_id` NULL (vì có `@unique`).

**Plan thực hiện:**

| Task | File | Chi tiết |
|------|------|----------|
| 2.1 | `formulas/worker_identity.py` | Thêm `generate_user_id(worker_id, full_name) -> str` trả về `USR-{NNNNNN}` (zero-padded 6 số) |
| 2.2 | `formulas/worker_identity.py` | Lúc `INSERT INTO workers`: gọi `generate_user_id()` để set `user_id` |
| 2.3 | `formulas/worker_identity.py` | Counter dùng `SELECT COUNT(*) FROM workers` + 1, wrap trong transaction |
| 2.4 | `migrations/v4_sync.py` | Đảm bảo cột `user_id` được sync lên Neon (conflict_key = `user_id` thay vì `id` cho bảng `workers`) |
| 2.5 | Test | Verify 1 worker CCCD có cùng `id` qua nhiều lần sync (idempotent) |

**Sequence:**
```python
# worker_identity.py — pseudocode
def generate_user_id(conn) -> str:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM workers")
    count = cursor.fetchone()[0] + 1
    return f"USR-{count:06d}"

def get_or_create_worker(cccd, full_name, ...):
    # ... lookup ...
    if is_new:
        user_id = generate_user_id(conn)
        cursor.execute(
            "INSERT INTO workers (id, user_id, full_name, ...) VALUES (?, ?, ?, ...)",
            (worker_id, user_id, full_name, ...)
        )
```

**Acceptance:**
- [ ] Mỗi worker có 1 `user_id` duy nhất dạng `USR-NNNNNN`
- [ ] Re-import cùng CCCD → cùng `user_id` (idempotent qua `id`)
- [ ] Sync Neon: `worker.user_id` không null, không trùng

---

### 19.3 Bước 3 — Hoàn thiện `setup_neon_schema`

**Vấn đề:**
- `migrations/v4_sync.py:setup_neon_schema()` chỉ có 1 SQL tạo bảng `workers` (line 350-385).
- Cần tạo **8 bảng** theo `SYNC_ORDER`: `workers`, `vendors`, `project_assignments`, `source_claims`, `vendor_aliases`, `timesheet_periods`, `timesheet_lines`, `manual_allowances`.
- Tốt nhất: **dùng `prisma db push` thay vì tự viết SQL**, vì schema đã có sẵn ở `prisma/schema.prisma`.

**Plan thực hiện:**

| Task | Cách làm | Ưu tiên |
|------|----------|---------|
| 3.1 | **Recommended**: Xóa `setup_neon_schema()` trong `v4_sync.py`. Dùng `npx prisma db push` để Neon tự đồng bộ schema từ `schema.prisma`. | P0 |
| 3.2 | Nếu giữ `setup_neon_schema()`: generate SQL từ `prisma migrate diff` rồi paste vào file | P1 |
| 3.3 | Verify schema Neon khớp Prisma: `npx prisma studio` mở DB lên xem | P0 |

**Sequence (Recommended):**
```bash
# 1. Lần đầu: tạo schema trên Neon
cd c:\CodeApp\HrP
npx prisma db push --skip-generate

# 2. Sau mỗi lần sửa schema.prisma
npx prisma db push

# 3. Generate Prisma Client
npx prisma generate
```

**Acceptance:**
- [ ] `prisma studio` mở Neon lên thấy đủ 8 bảng V4 (workers, vendors, project_assignments, source_claims, vendor_aliases, timesheet_periods, timesheet_lines, manual_allowances)
- [ ] `v4_sync.py sync` chạy không lỗi "relation does not exist"

---

### 19.4 Bước 4 — Link `accountUserId` cho Worker login (F16 + V4.14 G22)

**Vấn đề:**
- `Worker.accountUserId` (Prisma schema:244): link tới `User` (role=WORKER) để đăng nhập.
- Worker hiện tại trong DB **chưa có `account_user_id`** → NLD chưa đăng nhập được `app/worker`.
- Auth flow: Worker đăng nhập → JWT chứa `userId` (User.id) → query Worker qua `accountUserId`.

**Plan thực hiện:**

| Task | File | Chi tiết |
|------|------|----------|
| 4.1 | `prisma/seed.mjs` (hoặc script mới) | Tạo `User` row (role=WORKER) cho mỗi Worker: `id = "usr-" + worker.user_id.toLowerCase()` |
| 4.2 | `appBCC/formulas/worker_identity.py` | Lúc tạo Worker mới: đồng thời tạo `User` row (no password, dùng OTP/QR login) |
| 4.3 | `appBCC/migrations/v4_schema.py` | Thêm bảng `users` (id, role, phone, created_at) — minimal schema |
| 4.4 | `app/bcc/actions.ts` (read) | Optional: filter chỉ NLD có `accountUserId != null` mới tra cứu được |
| 4.5 | `app/api/auth/login` (verify) | Check User.role=WORKER + Worker.accountUserId=User.id → JWT issue |

**Sequence (Auth Flow V4):**
```
Worker (NLD) mở app/worker
  ↓
Login: phone + OTP  (User table, role=WORKER)
  ↓
getAuthUser() trả về User record
  ↓
Worker table WHERE accountUserId = User.id
  ↓
JWT { sub: User.id, role: 'WORKER' }
  ↓
API: /api/worker/attendance trả về data của chính NLD đó
```

**Acceptance:**
- [ ] Mỗi Worker có 1 `User` row (role=WORKER)
- [ ] `Worker.accountUserId` = `User.id`
- [ ] NLD login bằng phone + OTP → tra cứu được chấm công/lương của mình
- [ ] Scope WORKER: NLD chỉ thấy data của mình (Fence — V4.14 G22)

---

### 19.5 Tổng kết — Sequence đồng bộ hoàn chỉnh

```bash
# === One-time setup ===
cd c:\CodeApp\HrP
npx prisma db push                  # 3.3: tạo schema Neon

# === ETL Python (hàng ngày) ===
cd c:\CodeApp\HrP\appBCC
python -m migrations.v4_sync sync   # đẩy SQLite → Neon
# (Bước 2.1 sẽ tự động tạo user_id khi import worker mới)

# === Verify BCC Portal ===
# Mở https://hrp.vercel.app/bcc → nhập mã NV → tra cứu
```

| Phase | Trạng thái | Owner |
|-------|-----------|-------|
| **BCC-1**: Migrate `app/bcc/actions.ts` đọc V4 | ✅ Done | AI (2026-08-18) |
| **BCC-1b**: Disable `portal_timesheets` writes in ETL | ✅ Done | AI (2026-08-18) |
| **Step 2**: Generate `user_id` cho Workers | ⏳ Pending | Engineer |
| **Step 3**: Hoàn thiện `setup_neon_schema` (dùng `prisma db push`) | ⏳ Pending | Engineer |
| **Step 4**: Link `accountUserId` cho Worker login | ⏳ Pending | Engineer |

**Ngày cập nhật:** 2026-08-18
**Phiên bản:** 1.7 - BCC Migration Roadmap (Steps 2-3-4)
