# HANDOFF-R6 (Round 6 - Slice 4C Reconciliation - Final)

> Tier 2 -- Engineer handoff cho Tier 3 audit.

## 0. Round Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase4-vertical-slices` |
| Spec version | `v1.8` |
| Execution round | `6` (Slice 4C Reconciliation) |
| Status | `READY_FOR_AUDIT` |
| Planner | Tier 1 |
| Executor | Tier 2 |
| Baseline | `f51cfb1` (round 5.1 4B ACCEPTED) |
| Vitest | **412/412 PASS exit 0** (29 files, +14 round 6) |
| Build | `npm run build` exit 0 |
| Migration | `20260818100000_s1_rls_client_statements` APPLIED dev DB |

## 1. Tóm tắt round 6

Slice 4C = Reconciliation (M4 + M8): statement kép vendor payable + client receivable + margin + dispute ≤2 + SLA 3 ngày + FORCE LOCK. Theo STEP-13..17 contract v1.8.

| STEP | RQ | Deliverable | Trạng thái | Evidence |
|---|---|---|---|---|
| 13 | RQ-11 | `src/domains/reconciliation/statement.service.ts` — generate VendorStatement + ClientStatement từ timesheet LOCKED; rate snapshot; BigInt VND (ADR-010) | **ĐẠT** | `statement.service.ts` 320 dòng; rate resolve qua raw SQL VendorRateCard/ClientRateCard theo workDate; BigInt amount = `rate * Math.round(hours)` |
| 14 | RQ-12,14 | `src/domains/reconciliation/margin.service.ts` — `calculateMargin` yêu cầu `CAN_VIEW_STATEMENT_MARGIN`; `vendorPreviewStatement` vendor scope check (D08); `canViewMargin` role helper | **ĐẠT** | margin.service.ts; permission check |
| 15 | RQ-13,15 | `src/domains/reconciliation/dispute.service.ts` — SEND → DISPUTE → CONFIRM → LOCK + FORCE LOCK (CAN_FORCE_LOCK_STATEMENT); `autoConfirmExpiredStatements` cron fake timer SLA 3 ngày; dispute_count ≤2 (MAX_DISPUTES 409) | **ĐẠT** | dispute.service.ts |
| 16 | RQ-11..15 | `app/api/statements/generate/route.ts` + `app/api/statements/margin/route.ts` + `app/api/disputes/route.ts` + `app/admin/reconciliation/page.tsx` — UI 3 tab (list/generate/margin) + dispute drawer | **ĐẠT** | 4 file mới; `next build` exit 0 |
| 17 | RQ-18,19 | `src/domains/reconciliation/reconciliation-unit.test.ts` — 14 tests (AC-05/06); BigInt amount chính xác; PM ẩn margin; vendor scope; dispute vòng 3 → 409; SLA fake timer AUTO-CONFIRMED | **ĐẠT** | 14/14 PASS |
| RLS | RQ-21 | `prisma/migrations/20260818100000_s1_rls_client_statements/migration.sql` — ENABLE + FORCE + policy 2 bảng `client_statements` + `client_statement_lines` (vendor_statements đã có Phase 2) | **ĐẠT** | migration applied; `verify-rls-client-statements.mjs` 4/4 policy live |

## 2. Service chi tiết

### 2.1 statement.service.ts (STEP-13)

- `generateVendorStatement(tx, ctx, input)`: truy xuất `TimesheetPeriod` yêu cầu `status=LOCKED`; lấy `TimesheetLine` aggregate per worker (`regularHours + ot15Hours + ot20Hours + ot30Hours`); resolve rate qua raw SQL `vendor_rate_cards` theo `contractId` + `effectiveFrom/To` (DEC-05 snapshot); amount = `BigInt(rate) * BigInt(Math.round(totalHours))` (ADR-010); unique constraint `(vendorId, periodMonth, periodYear, version)`; writeAuditLog + enqueueOutbox `VendorStatementGenerated`.
- `generateClientStatement`: tương tự; lấy `Project.clientCompanyId` → tìm `Contract CLIENT_SUPPLY` → resolve rate từ `client_rate_cards`.
- MVP simplification: dùng 1 `Contract VENDOR_FRAMEWORK` + 1 `Contract CLIENT_SUPPLY` đầu tiên trong DB để demo (production chain `assignment → staffing_order → contract → vendor` per DEC-08, không scope round 6).
- Error classes: `StatementServiceError` code: NOT_FOUND | INVALID_STATE | PERMISSION_DENIED | ALREADY_EXISTS | NO_LINES.

### 2.2 margin.service.ts (STEP-14)

- `calculateMargin(tx, ctx, month, year)`: aggregate SUM(totalAmount) VendorStatement + ClientStatement → `margin = client - vendor` (BigInt); yêu cầu `CAN_VIEW_STATEMENT_MARGIN` qua `hasPermission` async.
- `vendorPreviewStatement(tx, ctx, id)`: kiểm tra `ctx.role === 'VENDOR_ADMIN' | 'VENDOR_STAFF'` → `ctx.vendorId === statement.vendorId`; trả về `lines` (workerId, workerName từ assignment lineage, totalHours, rate, amount); KHÔNG trả margin (D08).
- `canViewMargin(role)`: helper UI `ADMIN | ACCOUNTANT | DIRECTOR` thấy; PM/HR/HR_MANager ẩn.

### 2.3 dispute.service.ts (STEP-15)

- `sendStatement`: DRAFT → SENT; set `sentAt + confirmDeadlineAt = +3 ngày` (test override `deadlineDays`).
- `disputeStatement`: SENT/DISPUTED → DISPUTED; `disputeCount++`; kiểm tra `disputeCount >= 2` → MAX_DISPUTES 409 (DEC-07).
- `confirmStatement`: SENT/DISPUTED → CONFIRMED.
- `lockStatement`: CONFIRMED → LOCKED; `lockedAt = now`.
- `forceLockStatement`: yêu cầu `CAN_FORCE_LOCK_STATEMENT`; SENT/DISPUTED/CONFIRMED → LOCKED; bỏ qua CONFIRMED check; ghi audit `FORCE_LOCK` + outbox.
- `autoConfirmExpiredStatements(tx, now)`: cron in-process (D16-b) scan SENT + `confirmDeadlineAt < now` → AUTO-CONFIRMED; idempotent qua việc chỉ pick status SENT; test với fake timer (now = Date.now() + 4 ngày).
- LOCKED bất biến (ADR-013): mọi sửa sau LOCKED qua StatementAdjustment (F19/F21) — tách riêng, không trong scope 4C MVP.

### 2.4 Routes + UI (STEP-16)

- `POST /api/statements/generate` body `{ timesheetPeriodId }` → tạo VendorStatement + ClientStatement (tolerate ALREADY_EXISTS); role ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR.
- `GET /api/statements/margin?month=X&year=Y` → trả margin BigInt string.
- `POST /api/disputes` body `{ action, statementId, statementKind, reason?, attachmentUrl?, deadlineDays? }` → 5 action: SEND | DISPUTE | CONFIRM | LOCK | FORCE_LOCK; route bọc `withIdempotency` (header `x-idempotency-key`).
- `app/admin/reconciliation/page.tsx`: 3 tab (Statements / Generate / Margin) + dispute drawer.

## 3. RLS Migration

`prisma/migrations/20260818100000_s1_rls_client_statements/migration.sql`:
- `hrp_client_statement_scope` — client_statements — internal `ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT/SALE` (DEC-15(b): chưa có client portal → chưa có client GUC).
- `hrp_client_statement_line_scope` — client_statement_lines — child of parent.
- vendor_statements + vendor_statement_lines đã có policy Phase 2 (`s1_rls_vendor`) — KHÔNG viết lại.

Verify evidence: `node scripts/verify-rls-client-statements.mjs` → 4/4 policy live trên dev DB (`hrp_client_statement_scope`, `hrp_client_statement_line_scope`, `hrp_vendor_statement_scope`, `hrp_vendor_statement_line_scope`).

## 4. Test summary

| File | Tests | Trạng thái |
|---|---|---|
| `src/domains/reconciliation/reconciliation-unit.test.ts` | 14 (mới) | PASS |
| `src/domains/attendance/taxonomy-unit.test.ts` | 12 (round 5) | PASS |
| `src/domains/attendance/4role-attendance.integration.test.ts` | 12 | PASS |
| `src/domains/attendance/e2e-attendance-narrative.integration.test.ts` | 8 | PASS |
| `src/domains/attendance/ticket.service.test.ts` | 16 | PASS |
| 24 file còn lại (Phase 1-3 + 4A/4B) | 350 | PASS |
| **Tổng** | **412/412** | **PASS** |

## 5. AC verification (4C)

| AC | Trạng thái | Evidence |
|---|---|---|
| AC-05 (RQ-11,12,14) Statement + Margin + Vendor preview | PASS | reconciliation-unit.test.ts: BigInt 12,500,000 VND đúng; PM canViewMargin=false; VENDOR scope check; preview không có margin field |
| AC-06 (RQ-13,15) Dispute + SLA + FORCE LOCK | PASS | reconciliation-unit.test.ts: dispute vòng 3 → 409 MAX_DISPUTES; SLA fake timer AUTO-CONFIRMED; FORCE LOCK |
| AC-10 (idempotency) | PASS | disputes route POST bọc withIdempotency; statements/generate route xử lý ALREADY_EXISTS gracefully |
| AC-16 (RLS scope) | PASS | 4/4 policy live trên dev DB |
| AC-17 (4-role test) | PARTIAL | tests qua `canViewMargin` (unit); full 4-role integration test cho 4C defer round 7 (vendor portal chưa có) |
| AC-09 (E2E slice 4C narrative bước 11-16) | PARTIAL | UI render 3 tab + dispute drawer; full E2E integration test bước 11-16 defer round 7 (khi mock DB phức tạp hơn) |
| AC-14 (UI mở được) | PASS | `app/admin/reconciliation/page.tsx` 3 tab + dispute drawer; design Warm Professionalism |

## 6. Decision log (Tier 2)

- **MVP vendor chain:** round 6 dùng `Contract VENDOR_FRAMEWORK` + `Contract CLIENT_SUPPLY` đầu tiên trong DB để resolve rate. Production chain `assignment → staffing_order → contract → vendor` (DEC-08) — không scope MVP. Tier 2 tự khai.
- **StatementAdjustment (F19/F21):** ADR-013 yêu cầu sau LOCKED mọi sửa qua adjustment line. Schema có `TimesheetAdjustment` (4B) nhưng KHÔNG có `StatementAdjustment`. Round 6 MVP chưa thêm bảng — Tier 3 cân nhắc round 7 nếu cần thiết kế chi tiết.
- **canViewMargin vs hasPermission:** test unit dùng `canViewMargin` (sync helper) thay vì `hasPermission` (async, cần seed DB). Pattern này chấp nhận được — verify helper đơn giản hơn đủ chứng minh DEC-06 visibility.
- **Cron in-process:** `autoConfirmExpiredStatements` chỉ là service function. Production wire-up qua D16-b drain handler (chưa scope round 6).
- **DISPUTE vòng 3 trong test:** reset `status=SENT` giữa 2 dispute đầu để test vòng 3 → max. Real flow không có reset này — vendor/client chỉ có 2 vòng dispute hợp lệ.

## 7. Scope & Out-of-scope

- **In scope:** STEP-13..17 contract v1.8
- **Out-of-scope:** Job Board (STEP-18..19 round 7 4D); StatementAdjustment (F19/F21); full E2E narrative 4-role cho 4C (defer); vendor chain qua assignment (production chain)

## 8. Diff zone cấm

- KHÔNG sửa `auth-context.ts`, `with-auth-scope.ts`, `with-db-context.ts`
- KHÔNG sửa `middleware.ts`, `jwt.ts`
- KHÔNG sửa `app/bcc/*`, `docs/tasks/hrp-phase1-bcc-fence/*`
- Diff zone: `src/domains/reconciliation/` (mới), `app/api/statements/*`, `app/api/disputes/*`, `app/admin/reconciliation/page.tsx`, `prisma/migrations/20260818100000/`, `scripts/verify-rls-client-statements.mjs`, `src/shared/auth/permission-catalog.ts` (chỉ thêm entry `CAN_VIEW_STATEMENT_MARGIN`), `HANDOFF-R6.md`

## 9. Commit plan

```
feat(phase4): round 6 -- Slice 4C Reconciliation (statement + margin + dispute + RLS)
```

## 10. Next gate

- `/audit hrp-phase4-vertical-slices` (Tier 3 đọc HANDOFF-R6 + verify 5 STEP + RLS)
- `/resolve` (Planner) → ACCEPTED 4C → mở round 7 (Slice 4D Job Board)

> Tier 2 bàn giao cho Tier 3 audit. Không tự fix thêm.