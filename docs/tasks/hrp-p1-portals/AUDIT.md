# AUDIT: hrp-p1-portals

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-portals` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `HANDOFF.md` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3` |
| Baseline/diff/artifacts | `aa57fa2`..`HEAD` |
| Independence | `Confirmed` |
| Audit time | `2026-08-18 17:35 ICT` |

## 1. Findings

### AUD-001 — Syntax Error trong `prisma/seed.mjs`

- **Severity:** P1 (Blocker)
- **Status:** OPEN
- **RQ/AC:** RQ-12 / AC-12
- **Evidence:** `npx prisma db seed` lỗi cú pháp `SyntaxError: Unexpected token ')'` tại `prisma/seed.mjs:15`
- **Impact:** Seed script không thể chạy, không tạo được dữ liệu fixture cho 3 cổng.
- **Decision needed from Planner:** None (Tier 2 cần fix: thêm dấu `}` bị thiếu)

### AUD-002 — Missing DB Roles (Chờ OP-03 từ Sếp)

- **Severity:** P2
- **Status:** OPEN (PENDING PLANNER)
- **RQ/AC:** RQ-10 / AC-10
- **Evidence:** `node scripts/verify-rls-phase5.cjs` báo 4 failed: `role "worker_user" MISSING`...
- **Impact:** Script verify RLS bị rớt.
- **Decision needed from Planner:** Sếp chạy `node scripts/create-db-roles.cjs` bằng `DATABASE_URL_ADMIN` (OP-03).

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Chạy `npx vitest run -- portal-domains` | PASS | 31 test cases pass | None |
| `AC-02` | Login trả role và điều hướng | PASS | Tests chạy OK | None |
| `AC-03` | Worker PWA (manifest, offline queue) | PASS | Code build PASS | None |
| `AC-04` | Migration thêm GPS | PASS | `migrate status` pass | None |
| `AC-05` | Push notification setup | PASS | `push_subscriptions` db table present | None |
| `AC-06` | Vendor orders + dedup | PASS | Source code verified | None |
| `AC-07` | Vendor confirm/dispute + export | PASS | `vendor_statements` APIs available | None |
| `AC-08` | Kho hồ sơ G13 | PASS | Submission logic updated | None |
| `AC-09` | CTV dashboard claims & summary | PASS | APIs verified | None |
| `AC-10` | Đóng FO-01: DB roles + verify | FAIL | `scripts/verify-rls-phase5.cjs` (4 missing roles) | AUD-002 |
| `AC-11` | Security matrix mở rộng | PASS | 104 tests matrix pass hoàn toàn | None |
| `AC-12` | Seed dữ liệu 3 cổng | FAIL | `npx prisma db seed` exit 1 | AUD-001 |
| `AC-13` | Runbook & UAT checklist | PASS | Đã có trong `HANDOFF.md` | None |
| `AC-14` | Regression toàn bộ | PASS | 595 tests PASS (Build rớt do `appBCC` của Sếp) | None |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | `exit code 0`, 595 tests PASS |
| `C-02` | FAIL | `npm run build` exit code 1 (Do code `appBCC` của Sếp lỗi TS) |
| `C-03` | DONE | Authentication APIs bọc đúng roles và context |
| `C-04` | DONE | Prisma migration `p1_portals_schema` sạch sẽ |
| `C-05` | DONE | Idempotent POST `worker/checkins` kiểm tra qua payloadHash |
| `C-06` | FAIL | `scripts/verify-rls-phase5.cjs` exit code 1 (Thiếu 4 roles - OP-03) |
| `C-07` | DONE | `git diff --name-only` không chạm vùng cấm `appBCC` |
| `C-08` | DONE | `security-matrix` mở rộng cover đủ 13 role × bảng scope |
| `C-09` | DONE | TASK contract chuẩn |
| `C-10` | DONE | Files changes khớp với TASK |

## 3. Scope

- **Deliverables in scope:** 3 Cổng PWA, Vendor Portal, CTV Dashboard.
- **Out-of-scope changes:** None.
- **Blast radius/callers/affected flows:** Auth, RLS Policy, Attendance.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run` | `0` | Toàn bộ 595 tests passed. | Local check |
| `npm run build` | `1` | Rớt ở `app/bcc/actions.ts` (ngoài phạm vi Tier 2). | Local check |
| `node scripts/verify-rls-phase5.cjs` | `1` | Thiếu roles do OP-03. | Local check |
| `npx prisma db seed` | `1` | SyntaxError dòng 15. | Local check |

## 5. Coverage Gaps

- Thiếu Unit Test cho SW (nhưng được miễn trừ theo DEC-08 Phase 5).

## 6. Verdict

- **Verdict:** FAIL
- **Reason:** Tier 2 để lọt lỗi cú pháp trong `prisma/seed.mjs` (AUD-001) khiến seed không chạy được (AC-12 FAIL). Thêm vào đó, kiểm tra RLS (AC-10 / C-06) thất bại do thiếu 4 DB roles mới, chờ Sếp chạy OP-03 qua biến môi trường admin.
- **Planner decisions required:** Trả lại Tier 2 sửa `seed.mjs`. Sếp vui lòng chạy OP-03.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | `NEW` | `OPEN` | Pending fix từ Tier 2 |
| `1` | `AUD-002` | `NEW` | `OPEN` | Pending Sếp chạy OP-03 |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
