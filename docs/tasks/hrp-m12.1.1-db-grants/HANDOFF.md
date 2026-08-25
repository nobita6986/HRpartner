# HANDOFF: hrp-m12.1.1-db-grants

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-m12.1.1-db-grants` |
| Work type | INFRA |
| Audit mode (phải khớp TASK) | INFRA_AUDIT |
| Spec version | v1.0 |
| Execution round | 1 |
| Current audit round | 0 |
| Executor | Tier 2 |
| Baseline | HEAD of `main` sau M12.1 fix (commit chưa tạo) |
| Status | READY_FOR_AUDIT |
| Started/updated | 2026-08-21 00:16 → 00:25 +07:00 |

## 1. Outcome Summary

Mục tiêu: cấp quyền cho role `app_user_writer` (RLS-on runtime connection) trên schema `public` để Prisma client hết bị lỗi `42501 permission denied` sau M11.1 `db push`.

**Đã hoàn thành:**
- **STEP-01 / RQ-01:** Viết SQL grant (`prisma/grants-hrp-m12.1.1.sql`) + Node executor (`scripts/apply-grants-hrp-m12.1.1.mjs` + `scripts/load-env.cjs`) chạy qua admin connection `DATABASE_URL_ADMIN` (user `neondb_owner`). Đã chạy thành công 5 statements:
  1. `GRANT USAGE ON SCHEMA public TO app_user_writer`
  2. `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_writer`
  3. `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user_writer`
  4. `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer`
  5. `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer`
- **Verify bằng app_user_writer:** `SELECT 1` trả về `1` (connection OK).
- **Verify runtime `/bod`:** HTTP 200, body 97 KB (tăng từ 69 KB khi chưa có grants), có data thật từ bảng `Project` (tên: "Kho van Yen Phong", "Nha may Dien tu An Phat", "Nha may Sao Viet"; project code `DA-2026-018` …). Không còn `permission denied` trong server log.
- **Verify runtime `/api/jobs`:** HTTP 200 (trước grants: 500).

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Note |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `prisma/grants-hrp-m12.1.1.sql` | DONE | 5 GRANT/ALTER statements (chỉ giữ SQL gốc làm documentation; executor chạy statements rõ ràng để tránh parser issue với comments) |
| `STEP-01` | `RQ-01` | `scripts/load-env.cjs` | DONE | Helper parse `.env` (không cần thêm `dotenv`) → truyền vào `process.env` cho executor |
| `STEP-01` | `RQ-01` | `scripts/apply-grants-hrp-m12.1.1.mjs` | DONE | Dùng `pg.Client`, connect `DATABASE_URL_ADMIN` (user `neondb_owner`), chạy 5 statements idempotent, verify `SELECT 1` bằng `DATABASE_URL` (user `app_user_writer`) |
| Verify runtime | `AC-01` | HTTP GET `/bod`, `/api/jobs` | DONE | Cả 2 trả HTTP 200, log không còn `42501` |

## 3. Acceptance Evidence

| AC | Pass condition | Result | Evidence |
|---|---|---|---|
| `AC-01` | Các query (vd `getBodSnapshot()`) chạy không còn `42501` | PASS | `/bod` → HTTP 200, body 97 KB; `/api/jobs` → HTTP 200 (trước grants cả hai đều trả 500). Server log: không còn `Error [PrismaClientUnknownRequestError]: Invalid prisma.*` cho schema public. Body chứa tên project thật (`Kho van Yen Phong`, …) và `DA-2026-018` code — chứng t� SELECT qua `Project` bảng đã hoạt động. |

## 4. Changed Deliverables

| Path | Loại | Mô tả |
|---|---|---|
| `prisma/grants-hrp-m12.1.1.sql` | New | Tài liệu hóa các GRANT statements (idempotent) |
| `scripts/apply-grants-hrp-m12.1.1.mjs` | New | Node executor — chạy SQL grant qua admin connection |
| `scripts/load-env.cjs` | New | Parser `.env` đơn giản (helper) |
| Database (Neon `neondb`) | Schema-level grants | `app_user_writer` đã có USAGE/SELECT/INSERT/UPDATE/DELETE trên `public` + default privileges |

**Schema/migration:** Không thay đổi schema.
**Git commit:** Chưa tạo (ch� Tier 3 audit hoặc yêu cầu của sếp).

## 5. Deviations, Limitations

| ID | Note |
|---|---|
| `LIMIT-01` | GRANT `ALL` theo RQ-01 (chỉ SELECT/INSERT/UPDATE/DELETE — không bao gồm TRUNCATE/REFERENCES/TRIGGER). Đủ cho Prisma client runtime app_user_writer. |
| `LIMIT-02` | Script hiện hard-code role `app_user_writer`. Nếu sau này thêm role khác (vd `app_user_reader`), cần update SQL + executor. |
| `LIMIT-03` | `pg` SSL warning (alias `require` → `verify-full`): cosmetic, không block; production Neon yêu cầu SSL nên connection vẫn encrypted. |
| `SEC-01` | `adminUrl` được load trực tiếp từ `.env` — file `.env` đã bị .gitignore từ trước (xác nhận qua repo structure); không leak vào git. |

## 6. Evidence Index

| Evidence | Path / command | Proves |
|---|---|---|
| `E-01` | `node scripts/apply-grants-hrp-m12.1.1.mjs` (output đầy đủ trong transcript) — 5 OK, 0 FAIL; `[verify] SELECT 1 = 1` | Grants đã được áp dụng; app_user_writer đã kết nối được. |
| `E-02` | Server log: `GET /bod 200 in 4545ms`, `GET /bod 200 in 624ms`, `GET /api/jobs 200 in 1274ms` (không có `permission denied` log) | AC-01 runtime: cả `/bod` và `/api/jobs` đều 200, không còn 42501. |
| `E-03` | Node body inspection: `Kho van Yen Phong`, `DA-2026-018`, `8.000.000.000 ₫` xuất hiện trong HTML | Prisma SELECT từ `Project` thực sự trả data. |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | READY_FOR_AUDIT | 5 GRANT statements OK; SELECT 1 verify OK; `/bod` + `/api/jobs` đều 200. |

> Handoff status: **READY_FOR_AUDIT**. Tier 3 có thể verify: (1) chạy lại `node scripts/apply-grants-hrp-m12.1.1.mjs` để confirm idempotent; (2) `GET /bod` không crash + có data thật; (3) `GET /api/jobs` không crash.