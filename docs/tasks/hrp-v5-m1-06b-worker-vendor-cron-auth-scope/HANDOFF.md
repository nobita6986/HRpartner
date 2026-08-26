# HANDOFF: hrp-v5-m1-06b-worker-vendor-cron-auth-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06b-worker-vendor-cron-auth-scope` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Executor | `Tier 2` |
| Baseline | `4bb4464` (M1-06a accepted). LƯU Ý: một phần code task đã bị commit `86cee4f` gom lẫn (xem BLK-04); baseline đối chiếu diff vẫn là `4bb4464`. |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-25 Asia/Bangkok` |

## 1. Outcome Summary

Đã đưa toàn bộ DB access của 16 route nghiệp vụ dưới `app/api/worker/**`, `workers/**`, `vendor/**`, `vendors/**`, `cron/**` qua boundary canonical M1-06a:

- **Worker portal** (tickets/attendance = READ) qua `withAuthorizedDbReadOnly` (L1 self-scope `{workerId: ctx.workerId}` + L2 GUC); check-in INSERT qua `withSystemDb(SYSTEM_CHECKIN)` (elevated hẹp, server-derived worker id, cùng transaction với invariant reads).
- **Worker master** `/api/workers` list qua `withAuthorizedDbReadOnly` (L1 `buildWorkerScope` theo 13-role matrix + projection PII), create/update qua `withDbContext` (L2-only vì create/update-by-id vỡ L1 theo DEC-03 M1-06a).
- **Vendor** orders/statements/submissions/export (READ) qua `withAuthorizedDbReadOnly`; submission create + statement confirm/dispute (WRITE + audit) qua `withDbContext` cùng transaction; dedup qua repository đặc quyền hẹp trả outcome opaque (DEC-05).
- **Vendors master** `/api/vendors` list qua `withAuthorizedDbReadOnly` (L1 `buildVendorScope`), create/update qua `withDbContext`.
- **Cron** outbox/disputes: auth FAIL-CLOSED qua `verifyCronSecret` (503 khi thiếu secret, 401 khi sai header, hằng thời gian, zero-DB khi deny); disputes chạy trong `withSystemDb(SYSTEM_CRON)`.

Đã thêm scope builder tối thiểu (Ticket/AttendanceEvent/Site) và system principal (SYSTEM_CRON) + `verifyCronSecret`, mở rộng static gate lên 5 route root, và thêm test unit/route + LIVE (gated). Tất cả gate tĩnh PASS; LIVE lane `ENV_BLOCKED` (DEC-14, không có test DB) — KHÔNG phải PASS.

Phát hiện & sửa 1 lỗi correctness thực (StaffingOrder không bao giờ có status `ACTIVE` → mọi vendor submission bị chặn) — xem BLK-01, cần Tier 3 soi kỹ.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01`,`RQ-12` | Inventory 16 route (5 root) + `api-boundary.static.test.ts` phân loại NO_DB/USER_SCOPED_DB/SYSTEM_SCOPED_DB | DONE | None |
| `STEP-02` | `RQ-02`,`RQ-10` | `scopes/index.ts` (+Ticket/AttendanceEvent/Site), `scopes/worker-portal.scope.ts`, `with-system-db.ts` (SYSTEM_CRON) | DONE | None — reuse boundary M1-06a, không tạo wrapper cạnh tranh |
| `STEP-03` | `RQ-03`,`RQ-04` | `worker/{tickets,attendance,checkins}/route.ts`, `workers/route.ts`, `workers/[id]/route.ts` | DONE | check-in INSERT dùng `withSystemDb(SYSTEM_CHECKIN)` (elevated hẹp) — rationale BLK-02 |
| `STEP-04` | `RQ-05..08` | `vendor/{orders,submissions,statements,statements/[id]/{confirm,dispute,export}}/route.ts`, `vendors/route.ts`, `vendors/[id]/route.ts`, `src/shared/vendor/worker-dedup.repository.ts` | DONE | Sửa lỗi `ACTIVE`→`{OPEN,CLOSING_SOON}` (BLK-01) |
| `STEP-05` | `RQ-09` | `cron-auth.ts` (`verifyCronSecret`), `cron/outbox/route.ts`, `cron/disputes/route.ts` | DONE | outbox drain KHÔNG bọc `withSystemDb` — rationale BLK-03 |
| `STEP-06` | `RQ-10` | `api-boundary.static.test.ts` mở rộng 5 root + negative fixtures | DONE | None |
| `STEP-07` | `RQ-11` | `worker-portal.route.test.ts`, `vendors-master.route.test.ts`, `vendor-submissions.route.test.ts`, `cron-routes.route.test.ts`, `cron-auth.test.ts`, `live-vendor-worker-scope.m1-06b.test.ts` (LIVE gated) + đăng ký lane | DONE (LIVE=ENV_BLOCKED) | Test đặt tại `src/shared/auth/**` thay vì `app/**` — BLK-05 |
| `STEP-08` | `RQ-12` | Full gates + HANDOFF | DONE | None |

## 3. Acceptance Evidence

**Lệnh chạy thật trên Windows/PowerShell + Bash; Tier 3 chạy lại từng dòng.**

| AC | Command/check | Exit/result | Evidence summary | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-m1-06b-worker-vendor-cron-auth-scope\TASK.md` | `RESULT: PASS`, exit 0 | Contract hợp lệ | None |
| `AC-01` | `npx vitest run --config vitest.unit.config.ts src/shared/auth/api-boundary.static.test.ts` (trong full unit run) | PASS (part of 758) | Static gate phân loại đủ 16 route + delegate; negative fixtures caught | None |
| `AC-02` | `npx vitest run ... with-authorized-db.test.ts with-auth-scope.test.ts` | 4 + 39 tests PASS | Thứ tự `$extends`→`$transaction`→4 GUC(is_local)→callback; unknown model→`DENY_BY_DEFAULT`; callback throw→rollback | Rollback nguyên tử DB = phần LIVE (AC-11) |
| `AC-03` | Unit `worker-portal.route.test.ts`; LIVE `live-vendor-worker-scope.m1-06b.test.ts` | Unit PASS; LIVE `ENV_BLOCKED` | Worker chỉ đọc ticket/attendance của mình; where thủ công cross-worker → rỗng (IDOR) | 2-worker LIVE matrix chờ test DB (DEC-14) |
| `AC-04` | Unit `workers-projection.contract.test.ts` (4) + `with-auth-scope.test.ts` matrix | PASS | SALE/HR mask CCCD/bank; sensitive chỉ khi có permission; MKT 403; DIRECTOR/HR passthrough | LIVE role matrix chờ test DB |
| `AC-05` | Unit `vendors-master.route.test.ts`, `vendor-submissions.route.test.ts`; LIVE m1-06b | Unit PASS; LIVE `ENV_BLOCKED` | Vendor chỉ thấy object `ctx.vendorId`; cross-vendor where → rỗng/404 | 2-vendor IDOR LIVE chờ test DB |
| `AC-06` | Unit `vendor-submissions.route.test.ts` + LIVE DEC-05 | Unit PASS; LIVE `ENV_BLOCKED` | Dedup trả `{duplicate}` opaque, không lộ worker id/PII; order re-check OPEN/CLOSING_SOON + create atomic | LIVE opaque proof chờ test DB |
| `AC-07` | Unit `src/domains/reconciliation/reconciliation-unit.test.ts` + `cron-routes.route.test.ts` | PASS | State machine confirm/dispute + max round; audit ghi trong CÙNG `withDbContext` (không `.catch` swallow) | "Audit-fail→rollback" toàn phần cần LIVE (ENV_BLOCKED); hiện chứng minh bằng same-tx design + unit |
| `AC-08` | Unit `vendors-master.route.test.ts` | PASS | PM/MKT/vendor/CTV/worker/employee không enumerate Vendor master; role hợp lệ nhận projection | LIVE chờ test DB |
| `AC-09` | Unit `cron-auth.test.ts` (6) + `cron-routes.route.test.ts` | PASS | Thiếu secret→503, sai header→401, hằng thời gian, không log secret, zero-DB khi deny (getPrisma sau gate) | None |
| `AC-10` | `api-boundary.static.test.ts` (normal + negative) | PASS | Gate fail cho raw Prisma user query / hidden service / cron raw DB; allowlist tường minh | None |
| `AC-11` | `node scripts/ci/integration-preflight.mjs` | `ENV_BLOCKED`, exit 0 | Fail-closed: `DATABASE_URL_TEST` chưa set → lane KHÔNG chạy, KHÔNG fallback dev/prod; đây là BLOCKED, KHÔNG phải PASS | Cần test DB riêng + admin URL để chạy LIVE |
| `AC-12` | `npx tsc --noEmit`; `npx eslint .`; `npm run build`; `npx vitest run --config vitest.unit.config.ts` | tsc 0; eslint 0 error (471 warn cũ); build `✓ Compiled successfully in 13.6s` exit 0; unit `59 files / 758 tests` PASS exit 0 | Diff không chạm schema/migration/dependency/secret/appBCC | Xem §4 về file dirty ngoài scope (không do Tier 2 chạm) |

## 4. Changed Deliverables

Diff vs baseline `4bb4464` (scoped): **21 tracked file, +859 / −348** (`git diff --stat 4bb4464 -- app/api src/shared vitest.integration*.ts`) + các file MỚI (untracked) bên dưới.

- **Source sửa (tracked):** 15 route dưới `app/api/{worker,workers,vendor,vendors,cron}/**`; `src/shared/auth/scopes/index.ts`, `scopes/worker-portal.scope.ts`, `with-system-db.ts`; `vitest.integration-files.ts`, `vitest.integration.config.ts`.
- **Source MỚI (untracked):** `src/shared/auth/cron-auth.ts`; `src/shared/vendor/worker-dedup.repository.ts`.
- **Test MỚI/sửa:** `api-boundary.static.test.ts`, `with-auth-scope.test.ts`, `with-authorized-db.test.ts`, `workers-projection.contract.test.ts` (sửa); `cron-auth.test.ts`, `cron-routes.route.test.ts`, `vendor-submissions.route.test.ts`, `vendors-master.route.test.ts`, `worker-portal.route.test.ts`, `live-vendor-worker-scope.m1-06b.test.ts` (mới).
- **Dependency:** None. **Schema/migration:** None. **Secret/env:** None (chỉ map `M1_06B_LIVE_AUTH_SCOPE` trong integration config, không chứa giá trị secret).
- **Git diff/commit:** KHÔNG tạo commit ở round này (Tier 2). LƯU Ý BLK-04: một phần code task đã bị commit trước đó ở `86cee4f` (worker portal routes + `scopes/index.ts` + `scopes/worker-portal.scope.ts` + `with-system-db.ts`), phần còn lại đang ở working tree chưa commit.
- **File dirty NGOÀI scope (Tier 2 KHÔNG chạm, KHÔNG stage):** `appBCC/**` (deletions của sếp), `docs/aff_plan.md`, `docs/aff_plan - Copy.md`, working-tree mod của `docs/PLANNER_HANDOVER.md`. Tôi không dùng `git add -A`/`git add .`.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | Deviation (đã sửa) | `vendor/submissions/route.ts` cũ chặn `order.status !== 'ACTIVE'` nhưng `StaffingOrder.status` chỉ có `OPEN\|CLOSING_SOON\|CLOSED\|CANCELLED` (không có `ACTIVE`) → mọi vendor submission bị 409 sai. Đã đổi thành `OPEN_FOR_SUBMISSION = {OPEN, CLOSING_SOON}` (đồng bộ `publish.service`/`public.service`) + cập nhật test. | Sửa lỗi correctness thực; mở lại luồng submission đúng RQ-05/06/DEC-06. | Tier 3 xác nhận định nghĩa "open" khớp job-board; Tier 1 ghi nhận sửa nằm trong quyền Tier 2. |
| `BLK-02` | Limitation (thiết kế) | `worker/checkins/route.ts` INSERT AttendanceEvent qua `withSystemDb(SYSTEM_CHECKIN)` (elevated hẹp) thay vì `withDbContext(WORKER)`, vì create + dedup/geofence invariant cần role ghi được và cùng transaction; worker id server-derived, không nhận từ client. | Không vỡ self-scope (id server-derived) nhưng dùng principal hệ thống cho write self. | Tier 3 kiểm chứng không có đường rò cross-worker; Tier 1 xác nhận chấp nhận SYSTEM_CHECKIN cho check-in. |
| `BLK-03` | Deviation | `cron/outbox/route.ts` truyền raw client vào `drainOutboxOnce` (service tự quản tx theo từng event) — KHÔNG bọc toàn bộ trong `withSystemDb`. Lý do: `outbox_events` không bật RLS (không cần GUC) và drain là multi-tx + có thể I/O ở handler (Phase 6+), `outbox.ts §4.3` cấm I/O khi giữ tx. DEC-10 đọc theo nghĩa đen yêu cầu "mọi outbox DB work qua system boundary". | Route không chạy raw model-op; nhưng khác literal DEC-10. disputes thì đã bọc `withSystemDb(SYSTEM_CRON)`. | Tier 1/Tier 3 phán quyết: chấp nhận rationale hay yêu cầu adapter system-boundary cho drain. |
| `BLK-04` | Deviation (process) | Commit `86cee4f "chore: remove appBCC from git tracking"` gom LẪN code task (worker routes, scopes, with-system-db) + file không liên quan (`audit_report.md`, `docs/PLANNER_HANDOVER.md`, `docs/V5_READINESS_ASSESSMENT.md`, task khác AUDIT/HANDOFF, `run-test.js`, `scratch/*`) dưới message gây hiểu nhầm. Không do Tier 2 turn này tạo. | Lịch sử commit không sạch; một phần task đã committed trái quy tắc "no commit". Diff đối chiếu vẫn đầy đủ qua `git diff 4bb4464 -- <scope>`. | Tier 1 quyết định có squash/commit lại sạch trước go-live không. |
| `BLK-05` | Limitation | Test đặt tại `src/shared/auth/**` (unit lane include `src/**/*.test.ts`) thay vì cạnh `app/**` để chạy trong lane hiện có; route được import qua alias `@/app/...`. | Không ảnh hưởng coverage; chỉ là vị trí file. | Không cần — thông báo để Tier 3 biết nơi tìm evidence. |
| `BLK-06` | Limitation (ENV) | LIVE `live-vendor-worker-scope.m1-06b.test.ts` + toàn integration lane = `ENV_BLOCKED` vì thiếu `DATABASE_URL_TEST` (+admin). Fail-closed, KHÔNG fallback dev/prod, KHÔNG mock pass giả (DEC-14). | AC-03/AC-05/AC-06/AC-07(rollback)/AC-11 phần LIVE chưa chạy thật. | Tier 3 cấp test DB riêng để chạy LIVE, rồi kết luận AC LIVE. |
| `BLK-07` | Limitation (role matrix) | `worker-portal.scope.ts` PM branch (attendance `{projectId:{not:null}}`) và ACCOUNTANT có builder qua §5.3 (Project passthrough) — cần Tier 3 đối chiếu §7.2 matrix chính xác cho từng model. | Có thể rộng/hẹp hơn matrix mong muốn ở vài ô. | Tier 3 xác minh từng ô role×model; Tier 1 điều chỉnh matrix nếu lệch. |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `src/shared/auth/api-boundary.static.test.ts` | AC-01/AC-10 static gate 5 root + negative |
| `E-02` | `src/shared/auth/live-vendor-worker-scope.m1-06b.test.ts` | AC-03/AC-05/AC-11 (chạy khi có test DB) |
| `E-03` | `src/shared/auth/cron-auth.ts` + `cron-auth.test.ts` + `cron-routes.route.test.ts` | AC-09 fail-closed + zero-DB |
| `E-04` | `git diff 4bb4464 -- app/api src/shared vitest.integration*.ts` | AC-12 scoped diff (21 file, +859/−348) |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | 16 route qua boundary canonical (L1+L2/system); +builder Ticket/AttendanceEvent/Site + SYSTEM_CRON + `verifyCronSecret`; static gate 5 root; unit 758 PASS, tsc/eslint/build 0, integration ENV_BLOCKED. Sửa lỗi StaffingOrder `ACTIVE` (BLK-01). |

> Handoff status: READY_FOR_AUDIT
