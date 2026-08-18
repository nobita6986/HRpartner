# AUDIT: hrp-phase5-uat-cutover

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase5-uat-cutover` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `HANDOFF.md` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3` |
| Baseline/diff/artifacts | `614dca5`..`HEAD` |
| Independence | `Confirmed` |
| Audit time | `2026-08-18 15:08 ICT` |

## 1. Findings

### AUD-001 — `scripts/verify-rls-phase5.cjs` lỗi cú pháp Prisma

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-04 / AC-04
- **Evidence:** `node scripts/verify-rls-phase5.cjs` → `ERROR: operator does not exist: name = text[]`
- **Impact:** Lỗi cú pháp mảng tham số của Prisma khiến kịch bản kiểm tra chính bị gãy, fail C-06. RLS chưa thể được Audit an toàn.
- **Decision needed from Planner:** Cần Tier 2 sửa mảng parameter Prisma (`[table, policy]` → `... table, policy`) rồi đẩy lại lên nhánh.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Đọc code & `grep MOCK_` cho jobs UI | PASS | `0 MOCK_JOBS` | None |
| `AC-02` | Đọc code & `grep MOCK_` cho admin UI | PASS | `0 MOCK_STATEMENTS` | None |
| `AC-03` | UI staffing đã wire (EV-07) | PASS | `2 fetch calls` | None |
| `AC-04` | RLS Verify Script | FAIL | `node scripts/verify-rls-phase5.cjs` exit code 1 | AUD-001 |
| `AC-05` | Cron outbox + dispute hoạt động | PASS | Bọc `CRON_SECRET` fail-closed (401) | None |
| `AC-06` | Security matrix 104/104 | PASS | `npx vitest run` 104/104 | None |
| `AC-07` | Seed script mở rộng đủ F00A | PASS | `npx prisma db seed` code đủ | None |
| `AC-08` | Runbook | PASS | 5 required sections present | None |
| `AC-09` | Regression test & build | PASS | `548/548 tests PASS`, `next build` exit 0 | None |
| `AC-10` | Defectfix check | PASS | workerId check logic được giữ nguyên | None |
| `AC-11` | Load test scripts k6 | PASS | k6 scripts có đủ file | None |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | `exit code 0`, 548 tests (+111) PASS |
| `C-02` | DONE | `exit code 0`, Compiled successfully |
| `C-03` | DONE | `app/api/cron/outbox/route.ts` & `disputes` bọc `CRON_SECRET` fail-closed (401). |
| `C-04` | SKIP | Phase 5 không thay đổi schema/query mới. |
| `C-05` | SKIP | Chỉ có route cron (GET), gọi hàm service idempotent. |
| `C-06` | FAIL | `node scripts/verify-rls-phase5.cjs` exit code 1. |
| `C-07` | DONE | `git status` clean ở vùng cấm `appBCC/*`. |
| `C-08` | DONE | `548 tests` cover hết Security Matrix 13 role × 8 table. |
| `C-09` | DONE | `verify-task.ps1` exit code 0 `RESULT: PASS`. |
| `C-10` | DONE | `git diff --name-only e3b5ed5~1..e3b5ed5` chuẩn 18 files. |

## 3. Scope

- **Deliverables in scope:** Cập nhật 4 trang giao diện Admin UI, 1 Public UI. Thêm Security Matrix 111 tests. Thêm k6 scripts. Thêm cron outbox & dispute.
- **Out-of-scope changes:** None.
- **Blast radius/callers/affected flows:** Các Route cron mới, RLS.
- **Data/security/migration/operations:** Migration chưa chạy thành công do script gãy.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run` | `0` | Toàn bộ **548/548 tests passed**. | Local check |
| `npx next build` | `0` | Biên dịch Next.js thành công 100%. | Local check |
| `node scripts/verify-rls-phase5.cjs` | `1` | FAIL do lỗi cú pháp Prisma (ARRAY Binding). | Local check |
| `verify-task.ps1` | `0` | Pass: TASK contract chuẩn xác. | Local check |
| `git diff --name-only` | `0` | Clean scope. | Local check |
| `git status` | `0` | Vùng cấm không bị ảnh hưởng. | Local check |

## 5. Coverage Gaps

- Phần RLS Verification chưa thể hoàn thiện do Script từ Tier 2 bị gãy, cản trở verify tự động trên các Table như `attendance_import_batches`...

## 6. Verdict

- **Verdict:** FAIL
- **Reason:** Mandatory Check `C-06` FAIL. Lỗi cú pháp (Syntax) từ Prisma binding của file verify-rls-phase5.cjs cản trở nghiệm thu toàn bộ 7 bảng RLS. P1 bug AUD-001.
- **Planner decisions required:** Yêu cầu Tier 2 sửa ngay lỗi AUD-001 (Syntax script) sau đó Handoff lại (Round 2).

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | `NEW` | `OPEN` | Đang đợi Tier 2 sửa |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
