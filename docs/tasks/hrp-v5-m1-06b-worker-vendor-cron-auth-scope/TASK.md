# TASK: hrp-v5-m1-06b-worker-vendor-cron-auth-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06b-worker-vendor-cron-auth-scope` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — primary agent |
| Executor | Tier 2 — Coding agent |
| Auditor | Tier 3 — independent Audit agent |
| Baseline | `4bb4464` — M1-06a accepted and committed; unrelated worktree changes excluded |
| Modules | `V5-M1-06 / RF-10b / Hardening-1` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.3 M1-06, §4.13, §7.2; `V5_READINESS_ASSESSMENT.md` RF-10; M1-06a canonical boundary at `4bb4464` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `verify-task` → `/code` → Tier 2 HANDOFF → Tier 3 audit → Tier 1 resolve |
| Updated | `2026-08-25 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Worker chỉ đọc/ghi dữ liệu của chính mình; Vendor chỉ đọc/ghi object thuộc vendor context và không suy ra Worker PII ngoài scope; các API master-data Worker/Vendor tuân thủ visibility matrix. Hai cron endpoint chỉ chạy khi secret được cấu hình đúng và mọi DB operation nằm trong system boundary transaction-local có audit identity rõ ràng. API thành công hiện hữu không bị vỡ ngoài các denial bắt buộc để đóng lỗ hổng scope.

### Non-goals

- Không xử lý route admin/CTV đã đóng ở M1-06a hoặc attendance/statements/staffing/public routes ngoài năm route root của task.
- Không tuyên bố hoàn tất M1-08 vendor IDOR hoặc M1-09 field projection toàn hệ thống; task chỉ đóng route/boundary trong scope và tạo regression nền.
- Không xây dựng Vendor Portal/Worker PWA mới, offline sync mới, GPS engine mới, statement calculator hay outbox channel handler.
- Không thay session/JWT/OTP, schema, migration, dependency hoặc production RLS policy.
- Không deploy/push và không sửa `appBCC/**`, scratch hoặc artifact ngoài task.

## 2. Evidence và Baseline

Phương pháp evidence: CodeGraph được gọi trước nhưng trả inventory thiếu/lẫn route; Planner đối chiếu lại bằng `rg --files`, source inspection và git tại baseline `4bb4464`.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md:173,300-309`; guide §3.1 | M1-06 yêu cầu mọi route nghiệp vụ qua auth scope; Hardening-1 đứng trước M7/M8. | Tiếp tục M1-06 theo lát domain, không mở phase khác. |
| `EV-02` | `docs/V5_READINESS_ASSESSMENT.md:110-117` | RF-10 chia route wiring thành admin/CTV, worker/vendor/cron và phần còn lại. | Đây là lát M1-06b canonical. |
| `EV-03` | inventory read-only ngày 2026-08-25 | Có đúng 16 route: 6 dưới `worker/workers`, 8 dưới `vendor/vendors`, 2 dưới `cron`; không route nào dùng `withAuthorizedDb`, 14 route có raw business path, `workers/me` mới có L2. | Static inventory/gate phải phủ 100% cả alias singular/plural và delegate. |
| `EV-04` | `src/shared/auth/with-authorized-db.ts` tại `4bb4464` | M1-06a đã tạo canonical L1+L2 boundary trong cùng transaction. | Reuse boundary; không tạo wrapper cạnh tranh cho user routes. |
| `EV-05` | `app/api/worker/{tickets,attendance,checkins}/route.ts`; `app/api/workers/me/route.ts` | Self routes dùng `ctx.workerId` nhưng query/create còn raw hoặc L2-only; check-in geofence đọc toàn bộ Site. | Worker ownership và site visibility phải được khóa server-side trong boundary. |
| `EV-06` | `app/api/workers/route.ts`; `app/api/workers/[id]/route.ts`; plan §7.2 | Internal Worker CRUD query raw Prisma; visibility matrix yêu cầu DIRECTOR all projection, HR_STAFF/PM scoped, SALE/ACCOUNTANT minimum PII, MKT deny. | L1 row scope và projection hiện hữu phải cùng pass; không nới role. |
| `EV-07` | `app/api/vendor/**`, `app/api/vendors/**`; plan §4.3 M1-08/§7.2 | Vendor route tự filter sau `findUnique`; submission dedup query Worker toàn cục và trả tên; statement mutations/audit không cùng transaction; `/api/vendors` cho PM dù matrix nói deny. | Boundary phải chống IDOR/PII leak và giữ mutation atomic; full M1-08 vẫn là task sau. |
| `EV-08` | `src/shared/auth/scopes/{worker,vendor,project,staffing}.scope.ts` | Worker/Vendor/Project/Order builders đã tồn tại nhưng registry chưa phủ Ticket, AttendanceEvent, Site, statement child/audit/outbox paths. | Chỉ thêm scope/repository tối thiểu, unknown action vẫn deny-by-default. |
| `EV-09` | `app/api/cron/{outbox,disputes}/route.ts` | `CRON_SECRET` rỗng làm auth fail-open; DB work dùng raw Prisma và cron không có user AuthContext. | Cron phải fail-closed và dùng system boundary riêng, không giả user. |
| `EV-10` | `src/shared/integrity/outbox.ts` | Drain helper nhận PrismaClient và tự query/update ngoài request transaction. | Cron system boundary có thể cần adapter/repository; không bọc giả nếu làm mất transaction-local context. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Scope cố định ở 16 route dưới `app/api/worker/**`, `workers/**`, `vendor/**`, `vendors/**`, `cron/**` và shared service trực tiếp phục vụ chúng. | EV-02/03 | Final |
| `DEC-02` | CHOSEN | User route dùng verified AuthContext → role/action gate → `withAuthorizedDb` hoặc operation-aware scoped repository → L2 RLS. Raw client chỉ được lấy để truyền ngay vào boundary. | M1-06a | Final |
| `DEC-03` | CHOSEN | Worker self ownership luôn lấy từ `ctx.workerId`; vendor ownership luôn lấy từ `ctx.vendorId`. Body/query/params không được override owner. | Visibility matrix | Final |
| `DEC-04` | CHOSEN | Worker check-in geofence chỉ xét Site thuộc ACTIVE assignment/project của worker; không scan mọi Site. AttendanceEvent create dùng server-derived worker ID và cùng scoped transaction với invariant reads/write. | EV-05 | Final |
| `DEC-05` | CHOSEN | Vendor dedup được thực hiện trong privileged narrow repository và chỉ trả opaque outcome (`duplicate`/active conflict); không trả Worker ID, tên, CCCD, phone hoặc internal employment facts. | EV-07/security | Final |
| `DEC-06` | CHOSEN | Vendor order query chỉ thấy order trên project public hoặc đã có vendor submission theo scope builder; POST submission phải re-check visible/open order trong transaction. | Existing project/order scope | Final |
| `DEC-07` | CHOSEN | Cross-vendor lookup trả 404; statement confirm/dispute và audit cùng transaction. Không swallow audit error bằng `.catch(() => null)`. | Anti-IDOR/audit invariant | Final |
| `DEC-08` | CHOSEN | Route role matrix theo plan §7.2 là authority. PM không được xem Vendor master; SALE/ACCOUNTANT Worker response chỉ minimum projection; MKT/CTV/EMPLOYEE bị deny. Không mở role mới. | EV-06/07 | Final |
| `DEC-09` | CHOSEN | Cron khi thiếu `CRON_SECRET` trả fail-closed `503 CRON_NOT_CONFIGURED`; secret sai/thiếu header trả 401. So sánh không log secret và chống timing leak ở mức hợp lý. | EV-09 | Final |
| `DEC-10` | CHOSEN | Cron dùng specialized system DB boundary với stable `SYSTEM_CRON` audit identity và transaction-local RLS/system scope; không gọi `getAuthContext`, không giả mạo user từ request và không để raw business op ở route. | EV-09/10 | Final |
| `DEC-11` | CHOSEN | Existing success routes/methods, money/time serialization, idempotency và outbox retry semantics giữ nguyên trừ denial/projection bắt buộc bởi DEC-04..10. | Compatibility | Final |
| `DEC-12` | CHOSEN | Không migration/schema/dependency. Nếu scope đúng cần model relation/constraint mới, Tier 2 dừng và trả Planner. | Task boundary | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Inventory machine-readable đủ 16 route và shared handler; mỗi path là `NO_DB`, `USER_SCOPED_DB` hoặc `SYSTEM_SCOPED_DB`, không wildcard allowlist. | Must | EV-03 | Static gate fail; HANDOFF không READY_FOR_AUDIT. |
| `RQ-02` | Mọi user business query trong scope đi qua AuthContext + canonical L1/L2 boundary hoặc scoped repository; unknown model/action fail closed. | Must | DEC-02 | 401/403/404 ổn định; zero raw fallback. |
| `RQ-03` | Worker portal routes chỉ trả self tickets/attendance/profile và chỉ tạo self check-in; geofence/site reads giới hạn theo ACTIVE assignment/project. | Must | DEC-03/04 | 403/404 hoặc validation; zero cross-worker read/write. |
| `RQ-04` | Internal `/api/workers` list/update/create giữ allowed action nhưng áp row scope và role projection theo 13-role matrix; sensitive fields không xuất hiện nếu thiếu permission. | Must | EV-06/DEC-08 | 403/404; no PII response or partial write. |
| `RQ-05` | Vendor order/submission/statement/export/confirm/dispute chỉ truy cập object trong `ctx.vendorId`; cross-vendor object indistinguishable from absent. | Must | EV-07/DEC-06/07 | 404 and zero write/audit. |
| `RQ-06` | Vendor submission dedup không lộ Worker identity/PII; owner and order/project IDs derive/re-check server-side; create and related invariant checks are atomic. | Must | DEC-05/06 | Stable 404/409; zero orphan/partial submission. |
| `RQ-07` | Statement confirm/dispute enforce state/count under scoped transaction; successful dispute writes audit exactly once; audit failure rolls back state. | Must | DEC-07 | 409 invalid state/max rounds; transaction rollback. |
| `RQ-08` | `/api/vendors` master routes enforce plan role matrix and projections through boundary; PM/MKT/vendor/CTV/worker/employee cannot enumerate Vendor master unless separately allowed by canonical vendor-self route. | Must | DEC-08 | 403/404; no vendor enumeration. |
| `RQ-09` | Cron endpoints fail closed on missing/invalid secret and run all outbox/dispute DB work through explicit system boundary with stable audit identity and transaction-local context. | Must | EV-09/10 | 503 missing config; 401 bad secret; zero DB call. |
| `RQ-10` | Extend M1-06 static architecture gate to all five route roots and delegate/service targets; negative fixtures prove direct Prisma and unscoped cron work are caught. | Must | M1-06a/EV-03 | CI/unit gate fail on new bypass. |
| `RQ-11` | Unit/route/LIVE security tests prove two-worker self isolation, two-vendor IDOR isolation, role projections, cron auth no-DB-on-deny, and system boundary rollback/idempotency. | Must | Launch hardening | Missing safe DB = `ENV_BLOCKED`, never PASS. |
| `RQ-12` | Full unit/integration/typecheck/scoped lint/build and TASK/HANDOFF verifiers pass; diff has no schema/migration/dependency/secret/unrelated files. | Must | Quality gate | HANDOFF not READY_FOR_AUDIT. |

### 4.2 Scope boundaries

**In scope:**

- The 16 baseline routes under `app/api/worker/**`, `workers/**`, `vendor/**`, `vendors/**`, `cron/**`.
- Direct shared services/repositories used by those routes, `src/shared/auth/**`, `src/shared/integrity/outbox.ts` only as needed for a scoped system adapter.
- Focused static/unit/route/LIVE tests and minimal Vitest lane registration.
- `HANDOFF.md` created only by Tier 2.

**Out of scope:**

- Other `app/api/**` roots, full M1-08 IDOR suite across all resources, full M1-09 projection migration, portal redesign and new notification handlers.
- Schema/migration/dependency/session changes, production secret provisioning, deploy/push.
- User-owned `appBCC/**`, scratch, `.env*` and unrelated docs.

### 4.3 Data, State, Permission và Interface Rules

- **Worker:** self key = `ctx.workerId`; account lookup in auth bootstrap remains documented exception. Site/geofence facts are internal projection and never enumerate all Site.
- **Vendor:** self key = `ctx.vendorId`; VENDOR_STAFF never gains a broader row scope than VENDOR_ADMIN. Vendor statement line export remains statement-parent scoped.
- **Master data:** list/read projection follows plan §7.2. Root role does not imply sensitive-field permission; projection remains explicit.
- **Cron:** secret never logged/stored in response. Missing config and invalid header perform zero DB calls. System actor cannot be supplied by caller.
- **State:** check-in idempotency, statement state/max dispute and outbox retry state remain canonical. Scoped denial causes no side effect.
- **Failure:** auth 401, role/action 403, cross-scope object 404, validation 400, conflict/state 409, cron config 503. Internal response does not reveal predicate/SQL/secret.
- **Concurrency:** check/transition/audit writes share one transaction where invariant depends on prior read. No network I/O while DB lock/transaction is held.
- **Raw SQL:** only reviewed RLS/system context helper may set transaction-local GUC; route/service cannot use raw SQL to bypass scope.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-12` | five route roots + inventory gate | Freeze 16-route inventory/call paths at `4bb4464`; classify models/actions/delegates. | M1-06a static gate | Inventory test + git scope review | Count/path drift unexplained or overlap with unrelated work. |
| `STEP-02` | `RQ-02`, `RQ-10` | `src/shared/auth/**` + architecture gate | Reuse/extend operation-aware scoped boundary/repositories and deny-by-default coverage. | `withAuthorizedDb` | Focused auth/static tests | Parallel wrapper weakens M1-06a or create owner can come from client. |
| `STEP-03` | `RQ-03`, `RQ-04` | Worker route roots + needed scopes/repos | Wire self portal and internal Worker master routes; constrain site reads and preserve projections. | STEP-02 | route/unit + two-worker LIVE | Cross-worker row/PII visible or check-in partial write. |
| `STEP-04` | `RQ-05`..`RQ-08` | Vendor route roots + needed scopes/repos | Wire vendor self/master routes, opaque dedup, scoped statements and atomic audit. | STEP-02 | route/unit + two-vendor LIVE | Cross-vendor object/PII visible, audit swallowed or role widened. |
| `STEP-05` | `RQ-09` | cron auth + system DB adapter/outbox boundary | Fail-closed secret guard and stable SYSTEM_CRON transaction boundary; preserve retry semantics. | Existing outbox/dispute services | cron unit/integration | Secret missing still runs DB, user impersonation, or transaction-local scope lost. |
| `STEP-06` | `RQ-10` | static architecture test | Extend gate to 16 routes and service targets; add direct-query/unscoped-cron negative fixtures. | STEP-03..05 | normal PASS + mutations caught | Wildcard allowlist or delegate/service escape. |
| `STEP-07` | `RQ-11` | guarded safe test DB suites | Two-worker, two-vendor, role/projection and cron no-DB/rollback/idempotency evidence; clean fixtures. | `DATABASE_URL_TEST` + admin test URL | integration lane real PASS | Target equals dev/prod, missing role/fixture, skip or ENV treated as PASS. |
| `STEP-08` | `RQ-12` | regression/quality/HANDOFF | Run full gates and record real evidence; no self-audit. | All steps | unit, integration, typecheck, lint, build, verifiers, diff | Any failure, secret, schema/dependency or unrelated file. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Exactly the baseline 16 routes plus intentional additions are inventoried; every DB path has explicit user/system classification and target handler. | Static inventory test | Path/count/classification table | Yes |
| `AC-02` | `RQ-02` | User query call order applies verified context, L1/scoped repo and L2 same transaction; unknown model/action denies and callback failure rolls back. | Auth unit + integration | Call-order/rollback assertions | Yes |
| `AC-03` | `RQ-03` | Worker A cannot read/write Worker B ticket/attendance/check-in; Site lookup is limited to A active assignment/project; replay does not duplicate event. | Route + LIVE two-worker matrix | HTTP/row counts and site assertions | Yes |
| `AC-04` | `RQ-04` | 13-role Worker matrix matches plan; DIRECTOR/HR/PM/SALE/ACCOUNTANT projections and scopes are correct; MKT/CTV/EMPLOYEE/vendor forbidden unless own worker rule explicitly applies. | Contract + LIVE role matrix | Fields/row counts per role | Yes |
| `AC-05` | `RQ-05` | Vendor A cannot list/read/export/confirm/dispute Vendor B submissions/statements; cross-ID returns 404 with zero side effects. | Route + LIVE two-vendor IDOR matrix | HTTP/row/audit counts | Yes |
| `AC-06` | `RQ-06` | Submission uses visible/open order, derives vendor/project server-side, creates atomically and returns no Worker identity/PII in duplicate outcome. | Unit/route/LIVE cases | Response contract + before/after counts | Yes |
| `AC-07` | `RQ-07` | Valid confirm/dispute transitions once; invalid/max-round conflicts; audit exactly once and audit failure rolls back statement. | Unit + LIVE transaction assertions | State/audit count matrix | Yes |
| `AC-08` | `RQ-08` | Vendor master route role matrix matches plan; PM/MKT/vendor/CTV/WORKER/EMPLOYEE cannot enumerate; allowed roles receive safe projection. | Route/contract tests | 13-role response matrix | Yes |
| `AC-09` | `RQ-09` | Missing cron config=503 and wrong/missing header=401 with zero DB calls; valid secret uses SYSTEM_CRON boundary, rollback/idempotency/retry remain correct and secret never appears in output/log. | Unit + integration | Status/call-order/log/state evidence | Yes |
| `AC-10` | `RQ-10` | Static gate has zero offenders and fails for direct Prisma user query, hidden service bypass and cron raw DB fixture; allowlist is explicit. | Negative architecture tests | Expected mutation failures + normal PASS | Yes |
| `AC-11` | `RQ-11` | Guarded LIVE lane runs on dedicated test DB and proves Worker/Vendor isolation plus cron system context; missing env reports `ENV_BLOCKED`, not PASS. | Integration preflight + suites | Masked target/role, exits, counts | Yes |
| `AC-12` | `RQ-12` | Unit/integration/typecheck/scoped lint/build and TASK/HANDOFF verifiers exit 0; scoped diff has no schema/migration/dependency/secret/appBCC/unrelated file. | Repository commands + git review | Command/exit summary and file list | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-04` | `AC-06` |
| `RQ-07` | `STEP-04` | `AC-07` |
| `RQ-08` | `STEP-04` | `AC-08` |
| `RQ-09` | `STEP-05` | `AC-09` |
| `RQ-10` | `STEP-06` | `AC-10` |
| `RQ-11` | `STEP-07` | `AC-03`, `AC-05`, `AC-11` |
| `RQ-12` | `STEP-01`, `STEP-08` | `AC-12` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | L1 write extension injects invalid `where` into create. | Generic boundary used blindly for mutation. | Operation-aware scoped repository + server-derived owner; unit tests. | Revert route slice; no migration/data rollback. |
| `RISK-02` | Vendor dedup loses effectiveness or leaks Worker identity. | L1 hides global match or route returns existing Worker facts. | Narrow privileged repository with opaque outcome and tests. | Disable submit route temporarily; revert slice. |
| `RISK-03` | Check-in reads all Sites or writes outside self scope. | Geofence helper keeps raw Prisma/global Site scan. | Assignment-scoped repository and two-worker/site LIVE test. | Disable check-in route; no delete-based rollback. |
| `RISK-04` | Cron endpoint runs publicly when env missing. | Empty secret accepted. | DEC-09 fail-closed + zero-DB tests. | Disable cron route/config until secret restored. |
| `RISK-05` | Cron system boundary impersonates root user or loses GUC across helper transactions. | Fake user context/raw Prisma drain. | Dedicated system identity/context and real integration call-order. | Disable cron; retry pending outbox after forward fix. |
| `RISK-06` | Statement state updates but audit fails. | Separate writes or swallowed error. | Same transaction, no catch-swallow; rollback test. | Retry request after fix; immutable state remains unchanged. |
| `RISK-07` | Static gate misses service-level escape. | Route delegates to raw shared service. | Call-path inventory + negative hidden-service fixture. | Extend gate and re-audit affected slice. |
| `RISK-08` | Unrelated dirty worktree enters commit. | Broad add/commit. | Exact path staging; appBCC/scratch explicit out-of-scope. | Stop before commit; do not reset user files. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. Actor, scope, cron failure and system-context decisions are locked above. | — | — | No |

## 9. Planner Resolution

No audit exists. Expected sequence:

1. Tier 2: `/code hrp-v5-m1-06b-worker-vendor-cron-auth-scope` → source/tests and only `HANDOFF.md`.
2. Tier 3: `/audit hrp-v5-m1-06b-worker-vendor-cron-auth-scope round 1` → independent evidence and only `AUDIT.md`.
3. Tier 1: `/resolve hrp-v5-m1-06b-worker-vendor-cron-auth-scope` → resolve findings or accept.

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-25` | Initial M1-06b Worker/Vendor/Cron auth-scope hardening contract. | M1-06a accepted and committed at `4bb4464`; RF-10 next domain slice. |
