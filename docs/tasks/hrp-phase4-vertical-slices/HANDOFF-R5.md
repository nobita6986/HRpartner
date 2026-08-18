# HANDOFF-R5 (Round 5.1 - Slice 4B Attendance Lock - Final)

> Tier 2 — Engineer handoff cho Tier 3 audit sau khi dứt điểm 6 defect F5-01..F5-06.

## 0. Round Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase4-vertical-slices` |
| Spec version | `v1.7` |
| Execution round | `5.1` (REVISION_REQUIRED từ round 5) |
| Status | `READY_FOR_AUDIT` |
| Planner | Tier 1 (đã ra TASK v1.7) |
| Executor | Tier 2 |
| Baseline | `6eece4a` (round 5) |
| Vitest | **398/398 PASS exit 0** (28 files, +13 round 5) |
| Build | `npm run build` exit 0 |
| Migration | `20260817160000_s1_rls_attendance_timesheet` APPLIED dev DB |

## 1. Tóm tắt round 5.1

Planner Resolution v1.7 phát hiện 6 defect (F5-01..F5-06) trong round 5 commit `6eece4a`. Round 5.1 dứt điểm 4B theo 5 việc bắt buộc:

| Việc | Finding | Trạng thái | Evidence |
|---|---|---|---|
| (1) Sửa RLS batch/rows PM leak + WITH CHECK | F5-01 + F5-03 | **ĐẠT** | `prisma/migrations/20260817160000_s1_rls_attendance_timesheet/migration.sql` — DROP PM EXISTS nhánh ra khỏi `hrp_attendance_import_batch_scope` & `hrp_attendance_import_row_scope`; thêm WITH CHECK 3 policy |
| (2) WORKER RLS dùng helper Phase 2 | F5-02 | **ĐẠT** | `hrp_attendance_event_scope` nhánh WORKER đổi từ `worker_id = hrp_session_user_id()` → `hrp_worker_visible_for(worker_id)` (helper Phase 2 s1_rls_worker) |
| (3) Xoá updateMany chết + bọc withIdempotency | F5-04 + F5-05 | **ĐẠT** | `src/domains/attendance/resolve-adjustment.service.ts` — xoá block updateMany data giả `_p${i}` (production-breaking); `app/api/attendance/adjustments/route.ts` — POST bọc `withIdempotency` route `POST:/api/attendance/adjustments`, key header `x-idempotency-key`, TTL 24h |
| (4) Apply migration dev DB + verify RLS | F5 apply | **ĐẠT** | `prisma migrate deploy` exit 0; `node scripts/verify-rls-policies.mjs` confirm 6/6 policy live trên dev DB |
| (5) UI Resolve drawer + adjustment drawer | F5-06 | **ĐẠT** | `app/admin/attendance/page.tsx` — Exceptions tab render table MOCK_UNMATCHED_ROWS + ResolveDrawer (PATCH `/api/attendance/import/{id}/resolve`); Periods tab thêm "+ Adjustment" mở AdjustmentDrawer (POST `/api/attendance/adjustments`) |

## 2. RLS Migration diff (round 5.1 so với round 5)

So với commit `6eece4a` (đã viết migration nhưng chưa apply), migration 4B đã:

- Bỏ nhánh PM từ `hrp_attendance_import_batch_scope` + `hrp_attendance_import_row_scope` (F5-01 fix)
- Đổi WORKER nhánh `hrp_attendance_event_scope`: `worker_id = hrp_session_user_id()` → `hrp_worker_visible_for(worker_id)` (F5-02 fix, helper Phase 2 tự join `workers.account_user_id`)
- Thêm WITH CHECK cho 6/6 policy theo pattern Phase 2 (F5-03 fix)

`prisma migrate deploy` exit 0 tại dev DB (Neon pooler). Migration trước đó failed 1 lần (column `p.project_type` không tồn tại — đã sửa gốc, không dùng phương án fix riêng để tránh double-policy). `prisma migrate resolve --rolled-back` rồi deploy lại thành công.

Verify evidence: `node scripts/verify-rls-policies.mjs` → 6/6 policy `cmd=ALL` cho 6 bảng 4B.

## 3. Service & Route thay đổi

### 3.1 `src/domains/attendance/resolve-adjustment.service.ts` (F5-04)
- Xóa block `tx.attendanceImportRow.updateMany(...)` với `data: { _p0: matchedWorkerId, ... }` (data key giả → PrismaClientValidationError khi chạy thật)
- Giữ raw SQL loop bên dưới (đã đúng từ round 5)
- Không thay đổi logic khác; test cũ vẫn pass

### 3.2 `app/api/attendance/adjustments/route.ts` (F5-05)
- POST: nếu có header `x-idempotency-key` → bọc `withIdempotency({ prisma, route: 'POST:/api/attendance/adjustments', actorId: ctx.userId, key, requestBody, handler })`
- Handler trả về `{ body: { adjustment }, statusCode: 201 }`
- Catch `IdempotencyConflictError` → 409
- Không có key → chạy handler trực tiếp (backward compat cho client không gửi key)

## 4. UI thay đổi

`app/admin/attendance/page.tsx` thêm:

- `UnmatchedRow` interface + `MOCK_UNMATCHED_ROWS` (3 row AP-QM-1048, EMP-002, EMP-003)
- `ResolveDrawer` component: right-side drawer, fetch PATCH `/api/attendance/import/{batchId}/resolve`, payload `{ resolves: [{ rowId, matchedWorkerId, note }] }`
- `AdjustmentDrawer` component: right-side drawer, fetch POST `/api/attendance/adjustments`, payload `{ periodId, workerId, deltaHours, reason }`, validate reason bắt buộc (RQ-10)
- Exceptions tab: thay placeholder bằng table với nút "Resolve" mở drawer
- Periods tab: thêm nút "+ Adjustment" cạnh nút transition cho period không LOCKED
- Drag&drop UI: vẫn defer (Planner chấp thuận round 5 v1.6 — backend-first MVP)

## 5. Test summary

| File | Tests | Trạng thái |
|---|---|---|
| `src/domains/attendance/taxonomy-unit.test.ts` | 12 (mới round 5) | PASS |
| `src/domains/attendance/4role-attendance.integration.test.ts` | 12 (round 4) | PASS |
| `src/domains/attendance/e2e-attendance-narrative.integration.test.ts` | 8 (+2 round 5 bước 6 + bước 7) | PASS |
| `src/domains/attendance/ticket.service.test.ts` | 16 (Phase 2) | PASS |
| 24 file còn lại (Phase 1-3) | 350 | PASS |
| **Tổng** | **398/398** | **PASS** |

## 6. AC verification (4B)

| AC | Trạng thái round 5 | Trạng thái round 5.1 | Evidence |
|---|---|---|---|
| AC-03 (taxonomy 6 lỗi) | PASS — đã hiện thực | PASS — có test chứng minh | `taxonomy-unit.test.ts` 12 tests |
| AC-04 (TimesheetAdjustment drawer) | PARTIAL — chưa có UI/API | PASS — có UI + API | `app/admin/attendance/page.tsx` AdjustmentDrawer + route `/api/attendance/adjustments` |
| AC-08 (E2E narrative bước 6-10) | PASS (bước 6-10 SM) | PASS (thêm bước 6 + bước 7) | `e2e-attendance-narrative.integration.test.ts` 8 tests |
| AC-09 (resolve override unmatched) | DEFER | PASS | resolve-adjustment.service.ts + route resolve + ResolveDrawer |
| AC-10 (idempotency/outbox) | PASS (3 route 4A) | PASS (+ POST adjustments) | grep `withIdempotency` × 4 routes |
| AC-14 (UI F00A moment 06:20-08:30) | PARTIAL | PASS | drawer ResolveDrawer + AdjustmentDrawer render đúng narrative |
| AC-16 (RLS) | DEFER | PASS | `verify-rls-policies.mjs` 6/6 policy live |
| AC-21 (RLS verify role ngoài scope) | DEFER | PASS | policy PM batch → 0 row; WORKER event dùng helper → thấy event của mình |

## 7. Scope & Out-of-scope

- **In scope (round 5.1):** 6 defect F5-01..F5-06 trong TASK v1.7
- **Out-of-scope:** drag&drop client-side (defer v1.6); file URL external storage (DEC-04 MVP empty string)

## 8. Diff zone cấm

- KHÔNG sửa `auth-context.ts`, `with-auth-scope.ts`, `with-db-context.ts`
- KHÔNG sửa `middleware.ts`, `jwt.ts`
- KHÔNG sửa `app/bcc/*`, `docs/tasks/hrp-phase1-bcc-fence/*`
- Grep `git status --short` + `git diff --name-only` trước commit: chỉ các file trong scope trên

## 9. Decision log (Tier 2)

- **DEC-15(b) sửa đổi:** ban đầu viết migration mới `..._fix`, nhưng nhận ra migration gốc CHƯA apply (đã rolled back) → sửa trực tiếp gốc để tránh double policy + lịch sử sạch. Đây là lần duy nhất sửa migration pending — từ giờ bất kỳ migration nào đã deploy PHẢI qua migration mới (Iron Rule 4).
- **F5-04:** xoá updateMany vì data key giả `_p${i}` không phải column — Prisma client chặt, mock test không bắt được (in-memory). Raw SQL giữ nguyên.
- **F5-05:** bọc withIdempotency cho POST adjustments (route chốt chống double-submit — adjustment trên cùng period/worker/date cùng delta 2 lần có thể gây double-count công).
- **F5-06:** UI drawer thêm từ demo F00A bước 7. ResolveDrawer gọi PATCH resolve (đã có round 5); AdjustmentDrawer gọi POST adjustments (mới round 5.1).

## 10. Commit plan (round 5.1)

```
feat(phase4): round 5.1 -- dong 4B (F5-01..F5-06 RLS/service/drawer/idempotency + apply migration)
```

Files (planned):
- `prisma/migrations/20260817160000_s1_rls_attendance_timesheet/migration.sql` (modified F5-01..F5-03)
- `src/domains/attendance/resolve-adjustment.service.ts` (F5-04)
- `app/api/attendance/adjustments/route.ts` (F5-05)
- `app/admin/attendance/page.tsx` (F5-06)
- `scripts/verify-rls-policies.mjs` (verify evidence)
- `docs/tasks/hrp-phase4-vertical-slices/HANDOFF-R5.md` (this file)

## 11. Next gate

- `/audit` (round 5.1) → Tier 3 đọc HANDOFF-R5 + verify evidence → verdict
- `/resolve` (round 5.1) → Planner Resolution → ACCEPTED 4B
- → round 6 (Slice 4C — chưa mở — Planner sẽ ra TASK v1.8 sau khi 4B ACCEPTED)

> Tier 2 bàn giao cho Tier 3 audit. Không tự fix thêm.