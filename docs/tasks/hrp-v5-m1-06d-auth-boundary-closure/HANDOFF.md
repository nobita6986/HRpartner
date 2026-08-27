# HANDOFF: hrp-v5-m1-06d-auth-boundary-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06d-auth-boundary-closure` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `3` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `1036f2c64be7402f2fbd2508d6d66b12d06252a7` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-27 Asia/Bangkok` |

## 1. Outcome Summary

Đã đóng 8/10 STEP nghiệp vụ: STEP-01 (recursive gate + manifest + negative fixtures cho 7 root M1-06d), STEP-02 (payslip P0), STEP-03 (attendance adjustment), STEP-04 (staffing talent-pool + bulk transfer), STEP-05 (Ticket routes qua `withDbContext`), STEP-06 (debug/me/disputes), STEP-07 (payroll/margin/projects/clients), STEP-08 (login PREAUTH_DB).

**Round 3 fix:** Bổ sung `$transaction` mock cho `e2e-staffing-narrative.integration.test.ts` — `withDbContext(prisma, ctx, cb)` gọi `prisma.$transaction(cb)` nên mock cần method này. Wrap `cb(tx)` để forward chính mock làm transaction client (không recursive loop). Thêm branch `SELECT set_config` để `applyRlsContext` không trả về raw result. **0 assertion bị giảm/bỏ** (5/5 nguyên bản).

**Gates PASS:**
- verify-task: PASS (1 warn non-blocking)
- tsc strict: 0 error
- eslint (M1-06d files): 0 error, 8 warning (acceptable per HANDOFF precedent)
- unit: **971/971** (round 2 baseline fail `e2e-staffing-narrative.integration.test.ts` đã fix → green)
- next build: PASS
- LIVE M1-06d: **5/5** (intact, không bị ảnh hưởng)

**AC coverage:** AC-01 ✅ · AC-02 ✅ · AC-03 ✅ · AC-04 ✅ · AC-05 ✅ · AC-06 ✅ · AC-07 ✅ · AC-08 ✅ · AC-09 ✅ · AC-10 ✅

Tôi KHÔNG tự audit, KHÔNG commit/push/stage.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | RQ-01/06 | `src/shared/auth/api-boundary.static.test.ts` | `DONE` | Recursive scan 22 root (thêm 7 root M1-06d: attendance/debug/disputes/me/staffing/tickets/webhook); manifest 20 file theo §2 EV-01; negative fixtures cho ticket/staffing/attendance/webhook; positive fixtures cho `withDbContext + Tx`. 27 tests (M1-06a/b/c 18 + M1-06d 9). |
| `STEP-02` | RQ-02 | `src/shared/auth/internal-webhook-auth.ts`(+test), `app/api/webhook/payslip/route.ts`(+test) | `DONE` | None. Round 1. 27 tests. |
| `STEP-03` | RQ-03 | `app/api/attendance/adjustments/route.ts`(+test) | `DONE` | Round 1. None. 25 tests. |
| `STEP-04` | RQ-04 | `src/domains/staffing/talent-pool.repo.ts`(+test), `transfer.service.ts` | `DONE` | Round 1. None. 11 tests. |
| `STEP-05` | RQ-05 | `src/domains/attendance/ticket.service.ts`, `app/api/tickets/**` (6 route), `src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts` | `DONE (round 2)` | Service methods giờ nhận `tx?: PrismaClient \| Prisma.TransactionClient` (mặc định wrap `$transaction` nếu thiếu — backward-compat cho system/cron); route layer dùng `withDbContext(getPrisma(), ctx, tx => svc.X(input, sessionUser, tx))` cho cả 6 route (POST/GET/list/detail + 4 action). RQ-05 DB backstop chứng minh qua LIVE 5/5. |
| `STEP-06` | RQ-06 | `debug.route.test.ts`, `me.route.test.ts`, `disputes.route.test.ts` | `DONE` | Round 1. 13 tests. |
| `STEP-07` | RQ-07 | `src/shared/auth/scopes/finance.scope.ts`(+test), `app/api/payroll/route.ts`(+test), `app/api/statements/margin/route.ts`(+test) | `DONE` | Round 1. 86 tests. |
| `STEP-08` | RQ-08 | `src/shared/auth/preauth-db.ts`(+test), `app/api/auth/login/route.ts` | `DONE` | Round 1. 2 tests. |
| `STEP-09` | RQ-09 | `src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts` | `DONE` | LIVE 5/5 chạy trên test DB isolated (DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST — không fallback prod/dev, không mock). |
| `STEP-10` | RQ-10 | gates + HANDOFF | `DONE (round 3)` | Round 3: fix mock $transaction → unit 971/971 + targeted 5/5 + LIVE 5/5 đều exit 0. HANDOFF = READY_FOR_AUDIT. |

## 3. Acceptance Evidence

| # | Gate / AC | Lệnh | Exit | Kết quả |
|---|---|---|---|---|
| E-01 | verify-task (mandatory) | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-m1-06d-auth-boundary-closure\TASK.md` | `0` | `RESULT: DRAFT-VALID (1 warning(s))` |
| E-02 | tsc strict (AC-10) | `npx tsc --noEmit` | `0` | 0 error |
| E-03 | eslint (AC-10) | `npx eslint <M1-06d files>` | `0` | `0 errors, 8 warnings` (no-explicit-any trong route params; acceptable) |
| E-04 | unit (AC-02..08) | `npx vitest run --config vitest.unit.config.ts` | `0` | `Test Files 73 passed`; `Tests 971 passed (971)` — round 3 fix mock $transaction → green |
| E-05 | next build (AC-10) | `npx next build` | `0` | All routes compile |
| E-06 | static gate (AC-01) | `npx vitest run --config vitest.unit.config.ts src/shared/auth/api-boundary.static.test.ts` | `0` | `Test Files 1 passed`; `Tests 27 passed (27)` |
| E-07 | LIVE M1-06d (AC-05/09) | `npx vitest run --config vitest.integration.config.ts src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts` | `0` | `Test Files 1 passed`; `Tests 5 passed (5)` — DB backstop verified |

**E-04 unit breakdown:** M1-06d deliverable tests (~290 unit) + M1-06a/b/c baseline (~680) = 971 (round 3 fix $transaction mock, nguyên trạng assertion).

**E-07 LIVE coverage:** 5/5 = `withDbContext` sets GUC inside Tx + Worker A cannot read Worker B (NotFoundError fail-closed) + HR_STAFF global queue + `cancelTicket` qua Tx + ADMIN create via Tx.

**AC coverage:** AC-01 ✅ (27 tests recursive + manifest + negative) · AC-02 ✅ · AC-03 ✅ · AC-04 ✅ · AC-05 ✅ (5 LIVE + service Tx refactor + 6 route refactor) · AC-06 ✅ · AC-07 ✅ · AC-08 ✅ · AC-09 ✅ (5/5 LIVE) · AC-10 ✅ (gates tĩnh PASS, LIVE PASS).

## 4. Changed Deliverables

> Scope diff M1-06d round 2 vs baseline `1036f2c`. KHÔNG liệt kê M1-06b/06c co-mingled, KHÔNG file appBCC/app/bcc/scratch/aff_plan/PLANNER_HANDOVER/TASK. KHÔNG schema/migration. KHÔNG thêm dependency. KHÔNG commit/push/stage.

**Modified (tracked, round 2):**
- `app/api/tickets/route.ts` — POST + GET dùng `withDbContext` + `service.X(input, sessionUser, tx)` (RQ-05).
- `app/api/tickets/[id]/route.ts` — GET dùng `withDbContext` + `service.getTicket(id, sessionUser, tx)`.
- `app/api/tickets/[id]/approve/route.ts` — POST dùng `withDbContext` + `service.approveTicket(input, sessionUser, tx)`.
- `app/api/tickets/[id]/cancel/route.ts` — POST dùng `withDbContext` + `service.cancelTicket(input, sessionUser, tx)`.
- `app/api/tickets/[id]/reject/route.ts` — POST dùng `withDbContext` + `service.rejectTicket(input, sessionUser, tx)`.
- `app/api/tickets/[id]/pay/route.ts` — POST dùng `withDbContext` + `service.payAdvance(input, sessionUser, tx)`.
- `src/domains/attendance/ticket.service.ts` — `createTicket/approveTicket/rejectTicket/cancelTicket/payAdvance/listTickets/getTicket` giờ nhận `tx?: PrismaClient | Prisma.TransactionClient`; `private runInTx<T>(tx, cb)` chọn path: có tx → dùng trực tiếp, không → wrap `this.prisma.$transaction(cb)`. Backward-compat cho system/cron.
- `vitest.integration-files.ts` — thêm `live-ticket-route-boundary.m1-06d.test.ts` vào lane integration.
- `vitest.integration.config.ts` — thêm `M1_06D_LIVE_TICKET_BOUNDARY` env flag.
- `src/shared/auth/api-boundary.static.test.ts` — thêm 7 root M1-06d vào `SCOPE_DIRS` (recursive), thêm method manifest 20 file theo §2 EV-01, thêm 9 negative/positive fixtures cho ticket/staffing/attendance/webhook.

**New (untracked, round 2):**
- `src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts` — 5 LIVE test cases proving RQ-05/AC-05.

**Modified (round 1, pre-existing):**
- `app/api/attendance/adjustments/route.ts`, `app/api/auth/login/route.ts`, `app/api/payroll/route.ts`, `app/api/statements/margin/route.ts`, `app/api/webhook/payslip/route.ts`, `src/domains/staffing/talent-pool.repo.ts`, `src/domains/staffing/transfer.service.ts`, `src/shared/auth/scopes/index.ts`.

**New (round 1, pre-existing):**
- `src/shared/auth/internal-webhook-auth.ts`(+test), `preauth-db.ts`(+test), `scopes/finance.scope.ts`.
- `src/shared/auth/attendance-adjustments.route.test.ts`, `debug.route.test.ts`, `disputes.route.test.ts`, `finance-scope.test.ts`, `me.route.test.ts`, `payroll.route.test.ts`, `projects-clients-master.route.test.ts`, `statements-margin.route.test.ts`, `webhook-payslip.route.test.ts`.

**Modified (tracked, round 3):**
- `src/domains/staffing/e2e-staffing-narrative.integration.test.ts` — bổ sung `$transaction: vi.fn(async (cb) => cb(tx))` vào mock tx (`withDbContext` cần gọi method này). Bổ sung branch `SELECT set_config` để `applyRlsContext` không trả về raw SQL result (nhưng vẫn không lỗi). Forward `cb(tx)` để tránh recursive loop. **0 assertion bị giảm/bỏ** (5 test nguyên trạng).

**KHÔNG đụng (không phải deliverable):** `docs/PLANNER_HANDOVER.md`, `docs/TIER1_CONTRACT_AUTHORING_PLAYBOOK.md`, `docs/tasks/**/TASK.md`, `docs/aff_plan*`, `scratch/*`, `appBCC/*`, `app/bcc/*`, `prisma/migrations/**` (RLS đã đóng ở M1-07a).

## 5. Deviations / Limitations / Blockers

### DEV-01 — RESOLVED (round 3)

Round 2 baseline fail `src/domains/staffing/e2e-staffing-narrative.integration.test.ts` đã fix:
- Thêm `$transaction: vi.fn(async (cb) => cb(tx))` (forward chính mock làm transaction client)
- Thêm branch `SELECT set_config` cho `applyRlsContext` (RLS GUC setter)
- Unit 971/971 PASS, targeted test 5/5 PASS, exit 0

**Round 2 root cause:** `withDbContext(prisma, ctx, cb)` gọi `prisma.$transaction(cb)` bên trong (`src/shared/auth/with-db-context.ts:39`); test pass `tx as any` làm `prisma` cho `queryTalentPool` / `transferWorker` (cả hai đều nhận `prisma` arg), nhưng mock `tx` chỉ có `$queryRawUnsafe`/`$executeRawUnsafe` + model stubs, KHÔNG có `$transaction` → fail `TypeError: prisma.$transaction is not a function`. Pre-existing từ baseline `1036f2c` (cùng tồn tại ở M1-07a HANDOFF PLN-03, nhưng M1-07a test setup có wrapper `$transaction` riêng trong `transfer.service.test.ts:198-200`).

### DEV-02 — eslint 8 warnings (no-explicit-any)

8 warnings do `as any` casts trong:
- `app/api/tickets/route.ts` (3× — `statusParam.split(',') as any`, filter `type`/`orderBy` cast)
- `src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts` (5× — `tx: any` callback param trong test)

Acceptable per HANDOFF precedent (round 1 đã có 8 warnings tương tự, không block READY_FOR_AUDIT). Có thể refactor về proper types nếu Tier 3 audit yêu cầu.

### Note RISK-07 — baseline co-mingled

Working tree chứa file M1-06b/06c chưa commit (giữ nguyên từ round 1). §4 chỉ khai báo diff M1-06d. KHÔNG reset/khôi phục file của sếp, KHÔNG stage.

### Note LIM-03 → RESOLVED — STEP-09 LIVE chạy được

Round 1 ENV_BLOCKED vì thiếu `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST`. Round 2 cả hai đều có (từ M1-07a setup), STEP-09 chạy 5/5 PASS.

### Note BLK-01 → RESOLVED — STEP-05 unblocked bởi M1-07a

M1-07a Ticket RLS policy ACCEPTED (32/32 LIVE PASS) → RLS không còn block WORKER/HR_STAFF/ACCOUNTANT operations → STEP-05 có thể đặt Ticket trong `withDbContext` boundary mà không phá state machine.

## 6. Evidence Index

Toàn bộ output gate ngắn, trích trực tiếp §3 (E-01..E-07). Không có log file đính kèm. Không có secret/PII/connection-string trong HANDOFF.

## 7. Execution Round History

| Round | Kết quả | Ghi chú |
|---|---|---|
| 1 | `BLOCKED` | 6/10 STEP nghiệp vụ DONE + gates tĩnh PASS; STEP-05 BLOCKED (BLK-01, cần Tier 1/M1-07); STEP-01 hoãn (LIM-02); STEP-09 ENV_BLOCKED (LIM-03). Chờ Planner quyết (A)/(B) cho ticket RLS. |
| 2 | `READY_FOR_AUDIT` | 8/10 STEP nghiệp vụ DONE; M1-07a ACCEPTED unblock STEP-05/01/09; 27 static tests + 5 LIVE tests + 970 unit (1 pre-existing baseline) đều PASS. AC-01..10 đều đạt. |
| 3 | `READY_FOR_AUDIT` | Fix mock `$transaction` trong `e2e-staffing-narrative.integration.test.ts` → unit 971/971 + targeted 5/5 + LIVE 5/5 đều exit 0. AC-01..10 đều đạt, 0 assertion bị giảm/bỏ, security/LIVE intact. |

> Handoff status: READY_FOR_AUDIT
