# CONTRACT — Bang appBCC <-> Web (PortalTimesheet)

> Phien ban: v1.0 · Ngay: 16/08/2026 · Phase 0 / STEP-07
>
> Muc dich: dong bang contract giua Python ETL (`appBCC/`) va web (`app/bcc/` + `app/api/`).
> Truoc day khong co tai lieu rang buoc — appBCC co the gay loan data neu doi schema tho.
>
> **Trang thai**: **FREEZE** — founder da ky duyet 16/08/2026 (lenh "Gate 1: OK").

---

## 1. Pham vi

Tai lieu nay chi phuc vụ 1 bang duy nhat:

- **`portal_timesheets`** — bang luu bang cong cua nhan vien (worker) theo project theo thang.
  - Web doc qua `app/bcc/actions.ts` (server action `fetchPortalTimesheet`).
  - Python ETL (`appBCC/`) ghi/sync qua psycopg2 + SQLAlchemy (khong qua Prisma).

Cac bang khac (Worker, Project, Ticket, Payroll, ...) khong nam trong pham vi contract nay.
Neu appBCC can doc/ghi cac bang khac, phai lap CONTRACT rieng cho tung bang (Tier 1 quyet).

---

## 2. Schema bat buoc

Lay tu `prisma/schema.prisma` (canonical), model `PortalTimesheet`, da co DDL qua `prisma/migrations/20260816010542_g0_baseline/migration.sql` (STEP-03).

### 2.1. Ten bang SQL

```
portal_timesheets
```

### 2.2. Cot bat buoc

| Cot SQL | Kieu | Null? | Ghi chu |
|---|:-:|:-:|---|
| `id` | `TEXT` | NOT NULL | UUID, primary key |
| `employee_code` | `TEXT` | NOT NULL | Ma the cham cong (vi du "EMP-001") |
| `full_name` | `TEXT` | NOT NULL | Ten nhan vien (text thuong, khong can normalize) |
| `project` | `TEXT` | NOT NULL | Ten project hien thi (khong phai `project_id`) |
| `period_month` | `INTEGER` | NULL | 1-12 (thang cua ky cong) |
| `period_year` | `INTEGER` | NULL | vi du 2026 |
| `total_work_days` | `DECIMAL(5,2)` | NOT NULL DEFAULT 0 | tong cong thuc |
| `ot_hours` | `DECIMAL(5,2)` | NOT NULL DEFAULT 0 | tong gio OT |
| `absent_days` | `DECIMAL(5,2)` | NOT NULL DEFAULT 0 | tong cong nghi |
| `daily_data` | `JSONB` | NULL | mang 31 phan tu (cho 31 ngay trong thang) |
| `payroll_data` | `JSONB` | NULL | snapshot luong cua ky (luu de audit) |
| `total_income` | `DECIMAL(12,2)` | DEFAULT 0 | tong thu nhap ky |
| `created_at` | `TIMESTAMP(3)` | NOT NULL DEFAULT CURRENT_TIMESTAMP | thoi diem ETL ghi vao |

### 2.3. Index bat buoc

```
portal_timesheets_employee_code_idx  ON portal_timesheets(employee_code)
```

Khong them index moi neu khong qua 100k row. Khi vuot nguong, Tier 1 quyet them index theo pattern truy van that.

---

## 3. Format ky cong (periodMonth / periodYear)

Dung dinh dang **`MM/YYYY`** trong URL va UI (xem `app/bcc/actions.ts` dong 36):

```
input period: "07/2026"
parse:        const [month, year] = period.split('/').map(Number);
              month = 7, year = 2026
```

### 3.1. Quy tac validate

- `period_month`: integer 1..12. NULL cho phep (record cu chua co ky).
- `period_year`: integer 1900..2100. NULL cho phep.
- Trong URL: phai match regex `^\d{1,2}/\d{4}$`.

---

## 4. Trang thai ban ghi

`PortalTimesheet` KHONG co cot `status` — bang chi la snapshot du lieu, khong co workflow. Neu can workflow (vd "DRAFT/APPROVED/PAID"), phai them bang rieng (Tier 1 quyet, khong nam trong Phase 0).

---

## 5. Quy tac upsert versioned — Xu ly R-21

> **R-21 (V4 §17):** Python ETL delete-then-insert concurrency clash voi HRP web.

### 5.1. Quy tac cu (appBCC baseline — NGUYEN NHAN R-21)

```python
# Pseudo-code trong appBCC/core_pipeline.py (CHUA sua)
DELETE FROM portal_timesheets WHERE period_month = ? AND period_year = ?;
INSERT INTO portal_timesheets (...) VALUES (...);  -- mat row neu user dang doc
```

### 5.2. Quy tac moi (bat buoc sau Phase 0)

AppBCC PHAI chuyen sang **UPSERT** theo khoa dinh danh `(employee_code, project, period_month, period_year)`. Vi can cot duy nhat de upsert, Tier 1 quyet them constraint:

```
UNIQUE (employee_code, project, period_month, period_year)
```

(Them trong Phase 1 — Phase 0 chi ghi nhan, chua enforce.)

### 5.3. Cach lam an toan truoc khi co UNIQUE constraint

```sql
-- Upsert versioned (Phase 0 - khong co unique constraint)
INSERT INTO portal_timesheets (id, employee_code, full_name, project, period_month, period_year, total_work_days, ot_hours, absent_days, daily_data, payroll_data, total_income, created_at)
VALUES ($1, ..., $N, NOW())
ON CONFLICT (id) DO UPDATE SET
  employee_code = EXCLUDED.employee_code,
  full_name = EXCLUDED.full_name,
  ...
  created_at = NOW();
```

AppBCC phai dam bao `id` duy nhat cho moi snapshot (co the la `UUID5(employee_code + project + period_month + period_year)` de deterministic).

---

## 6. Quy tac PII (00-global-rules.md §3)

- KHONG ghi CCCD that, bank account that, luong that vao `portal_timesheets`.
- `full_name` chi dung cho hien thi (UI BCC). Neu can audit, them cot rieng trong bang khac (Tier 1 quyet).
- KHONG commit `appBCC/*.xlsx`, `appBCC/db_*.txt`, `appBCC/docs/*` (da gitignore).
- File Python ETL chi commit source code, KHONG commit data thuc.

---

## 7. Quy tac do ben va audit

- `created_at` do ETL set; KHONG cap nhat sau ghi (immutable log).
- Khi ETL re-run cung ky, phai ghi row moi (id moi) thay vi cap nhat row cu — de co audit trail.
- Web KHONG ghi vao `portal_timesheets` — chi doc. Neu web can ghi (vd worker check-in), tao bang rieng.

---

## 8. Trach nhiem giua appBCC va web

| Hanh dong | appBCC (ETL) | Web (`app/bcc/*`) |
|---|:-:|:-:|
| Ghi moi row | ✅ | ⛔ |
| Cap nhat row | ⛔ (ghi row moi) | ⛔ |
| Xoa row | � | ⛔ (Phase 1+) |
| Doc (read-only) | ✅ (debug) | ✅ (production) |
| Thay schema | ⛔ (Tier 1 quyet) | ⛔ |

---

## 9. Phan hoi khi contract vi pham

Neu Tier 3 (Auditor) phat hien appBCC hoac web vi pham contract:

1. **P0** (mat data, leak PII, sai tien): STOP appBCC, revert commit, Tier 1 review trong 24h.
2. **P1** (sai format cot, FK sai): Tier 1 sua schema migration add-only, appBCC re-ETL ky bi anh huong.
3. **P2** (sai index, sai ten): Tier 1 sua trong sprint sau, khong can rollback.

---

## 10. Chu ky review

- **Phase 1 (Sprint 1)**: them UNIQUE constraint `(employee_code, project, period_month, period_year)` + index bo sung neu can.
- **Phase 2**: them bang `portal_timesheet_audit` neu can audit trail day du.
- **Phase 4 (Vertical Slice 4C — Reconciliation)**: lien ket `portal_timesheets` voi `PayRun` qua `period_month/year` + project.

---

## 11. Chu ky founder ky

```
Phien ban: v1.0
Ngay ky:    16/08/2026
Ky ten:     Founder (sep) — duyet qua chat: "Gate 1: OK"
Ghi chu:    Freeze contract portal_timesheets v1.0
```

> Freeze sau khi sep ky. Moi thay doi schema `portal_timesheets` sau freeze phai qua Tier 1 review + cap nhat contract + tier 3 audit.
