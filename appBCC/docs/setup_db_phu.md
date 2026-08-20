# Hướng dẫn Setup DB Phụ (Neon Branch `dev`) để Thử Nghiệm V4

> **Phiên bản:** 1.0
> **Ngày:** 2026-08-19
> **Mục tiêu:** Tạo DB phụ trên Neon Branch `dev` để thử nghiệm V4 schema, an toàn không ảnh hưởng DB production.

---

## 1. TỔNG QUAN

| Mục | Giá trị |
|-----|---------|
| Branch sử dụng | `dev` (đã có sẵn, clone từ `production`) |
| Compute hiện tại | 0.25 CU (Active) |
| Khu vực | ap-southeast-1 (AWS) |
| Host hiện tại của `dev` | `ep-crimson-dawn-a156xcx3.c-3.ap-southeast-1.aws.neon.tech` (kiểm tra lại trong Neon Console) |
| DB phụ này dùng cho | ETL V4 + `app/bcc` (dev env) |
| DB production (KHÔNG động vào) | `production` branch (Neon Main) |

### Tại sao dùng branch `dev` có sẵn?
- Neon đã tạo sẵn branch `dev` (xem hình ảnh Neon Console).
- **Repository size**: 30 MB (clone từ production) — copy-on-write, chỉ trả tiền phần thay đổi.
- 0.25 CU free tier đủ cho dev/staging.

### Giới hạn cần biết
- Branch `dev` đang share **data snapshot** với production (khi vừa clone) → cần **xoá data portal_timesheets cũ** hoặc **rename schema** để tránh hiểu nhầm.
- Compute 0.25 CU sleep khi không dùng (sau 5 phút idle) → cold start ~2-3s.

---

## 2. CÁC BƯỚC SETUP

### BƯỚC 1: Lấy Connection String của Branch `dev`

#### 1.1. Vào Neon Console
- Mở https://console.neon.tech
- Chọn project hiện tại (đang thấy ở hình)
- Click branch **`dev`** (không phải `production`)

#### 1.2. Copy connection string
- Tab **Connection Details** → chọn:
  - **Branch:** `dev`
  - **Database:** `neondb` (mặc định)
  - **Role:** `neondb_owner`
  - **Pooling:** No (cho ETL)
- Nhấn nút **Copy** 💠 hoặc copy thủ công dạng:

```
postgresql://neondb_owner:<PASSWORD>@ep-crimson-dawn-a156xcxc3.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> ⚠️ **LƯU Ý:** Host name có thể khác với ví dụ trên — copy đúng từ Neon Console.

#### 1.3. Test connection bằng psql (hoặc Neon SQL Editor)
- Tab **SQL Editor** trong Neon Console → chạy:
```sql
SELECT version();
-- → PostgreSQL 16.x (Neon)
```

Nếu thấy version → DB phụ đã sẵn sàng.

---

### BƯỚC 2: Tạo file `.env.dev` cho ETL

#### 2.1. Tạo file mới: `c:\CodeApp\HrP\appBCC\.env.dev`

```dotenv
# ============================================================================
# APP ENVIRONMENT - DEV
# ============================================================================
APP_ENV=dev

# ============================================================================
# DATABASE - Neon Branch `dev` (DB phụ cho V4)
# ============================================================================
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-crimson-dawn-a156xcxc3.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
APPBCC_DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-crimson-dawn-a156xcxc3.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# ============================================================================
# DEEPSEEK AI
# ============================================================================
DEEPSEEK_API_KEY=sk-73ee4f05be3b44ec916a83caa4f44b19

# ============================================================================
# LOG
# ============================================================================
LOG_LEVEL=DEBUG
```

#### 2.2. Lưu và gitignore
- File `.env.dev` đã có **PASSWORD** thật → đảm bảo `.env.dev` được gitignore nếu chưa có.

Kiểm tra `.gitignore`:
```bash
cat .gitignore | grep -i env
```

Nếu chưa có, thêm vào:
```
.env
.env.dev
.env.staging
.env.prod
```

---

### BƯỚC 3: Kiểm tra Schema hiện tại trong Branch `dev`

Branch `dev` clone từ `production`, nên **có sẵn schema cũ** (`portal_timesheets` + các bảng Prisma của HrP web).

#### 3.1. Kiểm tra schema hiện tại
- Neon Console → Branch `dev` → SQL Editor → chạy:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

#### 3.2. **QUAN TRỌNG: Tạo schema riêng `v4` để tránh xung đột**

Thay vì CREATE TABLE trong `public`, ta sẽ tạo schema `v4` riêng:

```sql
-- Tạo schema v4
CREATE SCHEMA IF NOT EXISTS v4;

-- Set search_path
SET search_path TO v4, public;
```

> **Lý do:** Schema `public` chứa bảng Prisma của HrP web (rolling_payment, sites, …). Nếu tạo bảng V4 trùng tên trong `public` → xung đột. Schema `v4` riêng → an toàn.

---

### BƯỚC 4: Tạo bảng V4 trong Schema `v4`

Chạy toàn bộ file SQL bên dưới trong **Neon SQL Editor** (chọn branch `dev`):

```sql
-- ============================================================================
-- V4 SCHEMA - Migration từ SQLite (migrations/v4_schema.py) sang PostgreSQL
-- Ngày: 2026-08-19
-- ============================================================================

SET search_path TO v4, public;

-- ============================================================================
-- 1. WORKERS - định danh NGƯỜI (vĩnh viễn)
-- ============================================================================
CREATE TABLE IF NOT EXISTS v4.workers (
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
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. PROJECT_ASSIGNMENTS - mã NV theo DỰ ÁN
-- ============================================================================
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

-- ============================================================================
-- 3. VENDORS - đơn vị tuyển dụng
-- ============================================================================
CREATE TABLE IF NOT EXISTS v4.vendors (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. SOURCE_CLAIMS - map recruiter
-- ============================================================================
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

-- ============================================================================
-- 5. VENDOR_ALIASES - từ điển người tuyển
-- ============================================================================
CREATE TABLE IF NOT EXISTS v4.vendor_aliases (
    id TEXT PRIMARY KEY,
    raw_name TEXT NOT NULL UNIQUE,
    vendor_type TEXT NOT NULL,
    target_vendor_id TEXT REFERENCES v4.vendors(id),
    target_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. TIMESHEET_PERIODS - kỳ lương
-- ============================================================================
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

-- ============================================================================
-- 7. TIMESHEET_LINES - dòng chấm công hàng ngày
-- ============================================================================
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

-- ============================================================================
-- 8. MANUAL_ALLOWANCES - phụ cấp thủ công
-- ============================================================================
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

-- ============================================================================
-- 9. SYNC_LOGS - log đồng bộ ETL
-- ============================================================================
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

-- ============================================================================
-- 10. RECONCILIATION REPORTS (cho Giai đoạn 5+6 AI Reconciliation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS v4.reconciliation_reports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    phase TEXT NOT NULL,  -- 'A' (auto-flag) hoặc 'B' (manual-vs-auto)
    total_rows INTEGER,
    clean_rows INTEGER,
    flagged_rows INTEGER,
    major_diff_count INTEGER,
    report_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS v4.reconciliation_diff_rows (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES v4.reconciliation_reports(id),
    emp_code TEXT,
    worker_id TEXT REFERENCES v4.workers(id),
    manual_value NUMERIC,
    auto_value NUMERIC,
    diff NUMERIC,
    diff_type TEXT,  -- 'MINOR' | 'MAJOR' | 'OUTLIER' | 'DUPLICATE'
    likely_cause TEXT,
    confidence NUMERIC,
    action TEXT,  -- 'AUTO_ACCEPT' | 'FLAG' | 'BLOCKED'
    suggested_value NUMERIC,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recon_report 
    ON v4.reconciliation_diff_rows(report_id);

-- ============================================================================
-- Verify: Liệt kê các bảng vừa tạo
-- ============================================================================
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'v4' 
ORDER BY table_name;
```

#### Kết quả mong đợi (11 bảng):

| # | Bảng | Mục đích |
|---|------|----------|
| 1 | `workers` | Định danh người |
| 2 | `project_assignments` | Mã NV theo dự án |
| 3 | `vendors` | Đơn vị tuyển dụng |
| 4 | `source_claims` | Map recruiter |
| 5 | `vendor_aliases` | Từ điển người tuyển |
| 6 | `timesheet_periods` | Kỳ lương |
| 7 | `timesheet_lines` | Chấm công hàng ngày |
| 8 | `manual_allowances` | Phụ cấp thủ công |
| 9 | `sync_logs` | Log ETL sync |
| 10 | `reconciliation_reports` | Report đối soát (Phase A/B) |
| 11 | `reconciliation_diff_rows` | Diff rows chi tiết |

---

### BƯỚC 5: Verify Schema & Test Connection

#### 5.1. Verify schema từ SQL Editor
```sql
SET search_path TO v4, public;

SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'v4'
ORDER BY table_name;
```

Kỳ vọng: 11 bảng, mỗi bảng có số cột như schema SQLite version.

#### 5.2. Test connection từ Python (ETL)

Tạo file `c:\CodeApp\HrP\appBCC\test_db_phu.py`:

```python
"""Test kết nối Neon Branch `dev` và liệt kê các bảng V4"""
import os
import psycopg2
from dotenv import load_dotenv

# Load file .env.dev
load_dotenv('.env.dev')

DATABASE_URL = os.getenv('DATABASE_URL')
print(f"APP_ENV: {os.getenv('APP_ENV')}")
print(f"DATABASE_URL: {DATABASE_URL[:50]}...")

# Connect
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Query schema v4
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'v4' 
    ORDER BY table_name
""")

tables = cur.fetchall()
print(f"\nSchema v4 có {len(tables)} bảng:")
for (table,) in tables:
    print(f"  ✓ {table}")

cur.close()
conn.close()
print("\n✅ Test connection thành công!")
```

Chạy:
```bash
cd c:\CodeApp\HrP\appBCC
python test_db_phu.py
```

Kỳ vọng output:
```
APP_ENV: dev
DATABASE_URL: postgresql://neondb_owner:***@ep-crimson-dawn...
Schema v4 có 11 bảng:
  ✓ manual_allowances
  ✓ project_assignments
  ✓ reconciliation_diff_rows
  ✓ reconciliation_reports
  ✓ source_claims
  ✓ sync_logs
  ✓ timesheet_lines
  ✓ timesheet_periods
  ✓ vendor_aliases
  ✓ vendors
  ✓ workers
✅ Test connection thành công!
```

#### 5.3. Cài psycopg2 (nếu chưa có)
```bash
pip install psycopg2-binary python-dotenv
```

---

### BƯỚC 6: Cập nhật ETL để ghi V4 vào DB phụ

#### 6.1. Switch APP_ENV khi chạy ETL

Tạo wrapper script `c:\CodeApp\HrP\appBCC\run_dev.bat`:

```bat
@echo off
REM Run ETL with DEV environment (DB phụ neon branch dev)
set APP_ENV=dev
REM Load env from .env.dev (thay vì .env)
set ENV_FILE=.env.dev
python app.py
```

Hoặc PowerShell `run_dev.ps1`:
```powershell
$env:APP_ENV = "dev"
$env:ENV_FILE = ".env.dev"
python app.py
```

#### 6.2. Trong `app.py`, đã có logic load env

Kiểm tra `app.py` có đoạn:
```python
from dotenv import load_dotenv
env_file = os.getenv('ENV_FILE', '.env')
load_dotenv(env_file)
```

Nếu chưa có, sửa nhỏ:
```python
# Top of app.py
import os
from dotenv import load_dotenv
env_file = os.getenv('ENV_FILE', '.env')
load_dotenv(env_file)
```

#### 6.3. Validate APP_ENV chống nhầm production

Thêm vào đầu `app.py`:
```python
# Anti-mistake: chặn ghi V4 vào DB production
APP_ENV = os.getenv('APP_ENV', 'prod')
DATABASE_URL = os.getenv('DATABASE_URL', '')

if APP_ENV != 'prod' and 'production' in DATABASE_URL.lower():
    raise RuntimeError(
        f"❌ APP_ENV={APP_ENV} nhưng DATABASE_URL chứa 'production'!\n"
        f"   Vui lòng kiểm tra .env.dev — chỉ dùng branch `dev`."
    )
if APP_ENV == 'prod' and 'dev' in DATABASE_URL.lower():
    raise RuntimeError(
        f"❌ APP_ENV=prod nhưng DATABASE_URL chứa 'dev'!\n"
        f"   Đây là DB phụ, không dùng cho production."
    )

# Log connected DB
print(f"[INIT] APP_ENV={APP_ENV}")
print(f"[INIT] DATABASE_URL host: {DATABASE_URL.split('@')[-1].split('/')[0]}")
```

Khi chạy `run_dev.bat` → log:
```
[INIT] APP_ENV=dev
[INIT] DATABASE_URL host: ep-crimson-dawn-...neon.tech
```

---

### BƯỚC 7: Cập nhật `app/bcc` (Next.js) tham chiếu DB phụ

#### 7.1. Trong thư mục `c:\CodeApp\HrP\` (web app Next.js)

Tạo `.env.dev`:
```dotenv
APP_ENV=dev
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-crimson-dawn-a156xcxc3.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-crimson-dawn-a156xcxc3.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

#### 7.2. Verify web app/bcc query được V4 schema

Tạo route debug `app/bcc/debug-v4/page.tsx`:
```typescript
import { Pool } from 'pg';

export default async function DebugV4Page() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'v4' 
    ORDER BY table_name
  `);
  await pool.end();

  return (
    <div>
      <h1>V4 Schema (Neon Branch `dev`)</h1>
      <p>Có {result.rowCount} bảng:</p>
      <ul>
        {result.rows.map((r: any) => (
          <li key={r.table_name}>{r.table_name}</li>
        ))}
      </ul>
    </div>
  );
}
```

Mở `http://localhost:3000/bcc/debug-v4` → thấy 11 bảng V4.

---

### BƯỚC 8: Pilot Test ETL ghi V4 vào DB phụ

#### 8.1. Chạy ETL với 1 dự án Actro
- Mở app ETL
- Chọn file Excel chấm công Actro (test file có sẵn)
- Chọn kỳ lương: tháng gần nhất
- Bấm **Tính lương**
- Verify output ở tab "Preview"

#### 8.2. Verify dữ liệu đã ghi vào `v4.timesheet_lines`
- Neon Console → branch `dev` → SQL Editor:
```sql
SET search_path TO v4, public;

SELECT 
    COUNT(*) as total_lines,
    COUNT(DISTINCT worker_id) as unique_workers,
    MIN(work_date) as earliest_date,
    MAX(work_date) as latest_date
FROM v4.timesheet_lines;
```

Kỳ vọng: có records, worker_id liên kết với `v4.workers`.

#### 8.3. Verify `app/bcc` đọc được
- Mở `http://localhost:3000/bcc`
- Kiểm tra có hiển thị data mới ETL đẩy lên không

---

## 3. CHECKLIST HOÀN THÀNH

| # | Task | Trạng thái |
|---|------|-----------|
| 1 | Lấy connection string branch `dev` | ⬜ |
| 2 | Tạo `.env.dev` cho ETL | ⬜ |
| 3 | Tạo schema `v4` trong Neon Console | ⬜ |
| 4 | Chạy SQL migration (11 bảng) | ⬜ |
| 5 | Test connection bằng `test_db_phu.py` | ⬜ |
| 6 | Cập nhật `run_dev.bat` + validate APP_ENV | ⬜ |
| 7 | Tạo `.env.dev` cho web app | ⬜ |
| 8 | Pilot 1 dự án (Actro) end-to-end | ⬜ |
| 9 | Verify `app/bcc` đọc đúng data V4 | ⬜ |

---

## 4. RỦI RO & MITIGATION

| # | Rủi ro | Cách phòng |
|---|--------|-----------|
| R1 | Lỡ tay chạy ETL với `.env` (production) → ghi V4 vào prod | Anti-mistake validation ở Bước 6.3 |
| R2 | Schema `v4` đụng bảng Prisma web app | Dùng schema riêng `v4`, không touch `public` |
| R3 | Branch `dev` hết quota (Neon free 0.5 GB) | Monitor ở Neon Dashboard; reset định kỳ |
| R4 | Không rollback nếu V4 schema lỗi | Giữ SQL DDL riêng → DROP SCHEMA v4 CASCADE |
| R5 | Web app đọc nhầm prod khi mở dev | Web app cũng validate `APP_ENV` ở startup |

---

## 5. CÂU HỎI THƯỜNG GẶP

**Q1: Tại sao không dùng schema `public`?**
A: `public` đang chứa bảng Prisma của web (rolling_payment, sites, users...). Schema `v4` riêng giúp tách biệt, an toàn khi xoá.

**Q2: Database của branch `dev` lúc đầu có giống production không?**
A: Có — Neon branch clone copy-on-write. Data sẽ giống production **tại thời điểm clone**. Sau đó, mọi thay đổi trên `dev` không ảnh hưởng `production` và ngược lại.

**Q3: Có cần xoá data portal_timesheets cũ trong branch `dev`?**
A: Không cần. Vì V4 schema tách riêng (`v4.timesheet_lines`), không liên quan `public.portal_timesheets`. Để nguyên data cũ để debug.

**Q4: Khi nào migrate V4 sang production?**
A: Sau khi V4 ổn định ở `dev` (sau Giai đoạn 4-5-6 trong plan-80.md). Có 3 lựa chọn: Restore-overwrite, Cross-DB ETL, Promote branch (đề xuất).

**Q5: Có tốn thêm phí Neon không?**
A: Branch `dev` 0.25 CU free tier mỗi tháng cho đến 191.9 giờ Active. Hết → tự động sleep, không tính phí. Đủ cho dev/test.

---

## 6. LIÊN KẾT

- **Plan tổng:** `c:\CodeApp\HrP\appBCC\docs\plan-80.md`
- **Schema V4 (SQLite gốc):** `c:\CodeApp\HrP\appBCC\migrations\v4_schema.py`
- **ETL sync Neon:** `c:\CodeApp\HrP\appBCC\migrations\v4_sync.py`
- **Web app BCC:** `c:\CodeApp\HrP\app\`
- **Neon Console:** https://console.neon.tech

---

**Trạng thái:** Chờ sếp duyệt và thực hiện theo checklist.
**Ngày tạo:** 2026-08-19
**Phiên bản:** 1.0 — Initial
