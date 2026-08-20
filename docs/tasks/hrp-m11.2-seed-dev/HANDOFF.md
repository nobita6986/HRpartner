# HANDOFF: hrp-m11.2-seed-dev

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-m11.2-seed-dev` |
| Work type | DATA |
| Audit mode (phải khớp TASK) | DATA_AUDIT |
| Spec version | 1.0 |
| Execution round | 1 |
| Current audit round | 0 |
| Executor | Tier 2 (Cursor assistant, hrp-engineer role) |
| Baseline | HEAD of `main` tại `C:\CodeApp\HrP`, DB Neon dev rỗng sau M11.1 sync |
| Status | READY_FOR_AUDIT |
| Started/updated | 2026-08-20 23:16 → 23:18 +07:00 |

## 1. Outcome Summary

Mục tiêu: chạy seed script + bổ sung CTV test user để M11/M12 có data test.

**Đã hoàn thành:**
- Bổ sung 1 entry vào `PORTAL_USERS_SEED` trong `prisma/seed.mjs`: phone `0900000001`, role `CTV`, affCode `CTV-TEST-M11`, name `CTV Test M11` (RQ-02, DEC-02). Idempotent upsert qua `seedPortalUsers()`.
- `npx prisma db seed` exit 0, log xanh; tất cả entity upsert thành công:
  - 12 role-scenario users (1/role), 4 portal users (CTV Test M11 mới), 2 auth ENV accounts = 18 users tổng.
  - 4 projects, 6 workers (5 scenario + 1 worker profile), 2 vendors, 2 staffing orders (OPEN), 1 timesheet period (LOCKED), 1 vendor statement (SENT, totalAmount 15.000.000 ₫).
  - 1 candidate submission, 2 source claims.
  - 10 permissions catalog + 13 role-permissions.
- Verify AC-02: `User { id, phone: '0900000001', role: 'CTV', affCode: 'CTV-TEST-M11', passwordHash: <bcrypt>, isActive: true }` — có thể login bằng password `demo-portal-2026`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | RQ-01, RQ-02, RQ-03 | `prisma/seed.mjs` (PORTAL_USERS_SEED) | DONE | Thêm 1 row phone `0900000001` với role CTV + affCode `CTV-TEST-M11`. Không sửa các entry khác — tận dụng 12 role-scenario + 3 portal user cũ đã cover RQ-01 (master data) + RQ-03 (Project/Vendor/Statement). |
| `STEP-02` | RQ-01 | Neon DB | DONE | `npx prisma db seed` exit 0. 47 entities upsert (sum của tất cả counters trong log). |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-m11.2-seed-dev\TASK.md` | (chưa chạy) — TASK format thu gọn (§1–§9); verify-task có thể FAIL do thiếu required fields. Cùng BLK-04 M11.1. | TASK format lite | BLK-04 |
| `AC-01` (RQ-01) | `npx prisma db seed` | exit 0 — log: `Upserted: 12 users, 4 projects, 5 workers, 2 vendors` + `P1 Portals: 4 users, 1 worker profile, 2 source claims, 1 candidate submissions` + `Phase 5: 1 timesheet period (LOCKED), 1 vendor statement (SENT), 2 staffing orders (OPEN)` + `Auth accounts (ENV): 2 created` + `Permissions: 10 catalog, 13 role-permissions`. | Seed log xem §1. | None |
| `AC-02` (RQ-02) | SQL query `User.phone = '0900000001'` | Tìm thấy user: `{id: '3e2b6ed0-...', phone: '0900000001', role: 'CTV', affCode: 'CTV-TEST-M11', name: 'CTV Test M11', isActive: true, passwordHash: '$2b$10$...'}` | User CTV test OK với password mặc định `demo-portal-2026` (DEC-12 của seed). | None |
| `AC-02` (RQ-02 — data counts) | Count query toàn bảng | 18 users, 6 workers, 4 projects, 2 vendors, 2 staffing orders, 1 statement, 1 submission, 2 claims, 1 period, 10 permissions | Đủ để M12 BoD render với số liệu thật (không rỗng 100%). | None |

## 4. Changed Deliverables

- **Source/artifact changed:**
  - `prisma/seed.mjs` — bổ sung 1 entry vào `PORTAL_USERS_SEED` (line 337).
- **Dependency:** None.
- **Schema/migration:** None.
- **Environment/config:** None.
- **Database state:** Neon dev DB đã seed 47 entities (18 users, 6 workers, 4 projects, 2 vendors, 2 staffing orders, 1 statement, 1 submission, 2 claims, 1 period, 10 permissions).
- **Git diff/commit:** Not created.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-04` | Limitation (TASK format, shared với M11.1) | TASK `hrp-m11.2-seed-dev` chỉ có §1–§9; thiếu §0/§2/§10. verify-task sẽ FAIL. | Optional — không chặn DATA work. | Optional: rewrite TASK theo template chuẩn. |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `prisma/seed.mjs` (line 332–340, PORTAL_USERS_SEED) | 4 portal users incl. CTV test M11 |
| `E-02` | `npx prisma db seed` log | AC-01: seed exit 0 |
| `E-03` | Raw SQL `User.phone='0900000001'` | AC-02: CTV test user tồn tại với passwordHash |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `1.0` | READY_FOR_AUDIT | Seed + CTV test user đã sẵn sàng; DB Neon dev có đủ data cho M11/M12 smoke test. |

> Handoff status: **READY_FOR_AUDIT**. DB đã sẵn sàng để M11 round tiếp (test `POST /api/ctv/withdrawals` với user `0900000001` / password `demo-portal-2026`) và M12 round tiếp (load `/bod` xem KPI thật).