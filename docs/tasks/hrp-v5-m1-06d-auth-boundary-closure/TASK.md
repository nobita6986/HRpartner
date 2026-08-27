# TASK: hrp-v5-m1-06d-auth-boundary-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06d-auth-boundary-closure` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `REVISION_REQUIRED` — Audit round 2 PASS rejected because mandatory unit gate exits 1 |
| Planner | Tier 1 |
| Executor | Tier 2 |
| Auditor | Tier 3 independent context |
| Baseline | `1036f2c64be7402f2fbd2508d6d66b12d06252a7` — scoped accepted M1-06b/M1-06c baseline; unrelated AFF/scratch/handover files excluded |
| Modules | `V5-M1-06 / RF-10 / Hardening-1 closure` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.3 M1-06, §7.2, §8.3; M1-06c Planner Resolution `PLN-01..02`; DEC-14 test DB safety |
| Current execution round | `3` |
| Current audit round | `2` |
| Next gate | `/code hrp-v5-m1-06d-auth-boundary-closure` round 3 → repair the narrative-test transaction harness, rerun full unit gate, update HANDOFF → re-audit round 3 |
| Updated | `2026-08-27 Asia/Bangkok` |

### Dependency gate

| Dependency | Source | Satisfied evidence | Status/stop condition |
|---|---|---|---|
| M1-06a | Accepted TASK/AUDIT | Existing static gate roots `admin`, `ctv` | Satisfied functionally; baseline commit must retain it |
| M1-06b | `docs/tasks/hrp-v5-m1-06b-worker-vendor-cron-auth-scope` | AUDIT PASS + Planner resolution in worktree | Functionally satisfied; must be included in clean baseline SHA |
| M1-06c | `docs/tasks/hrp-v5-m1-06c-remaining-routes-auth-scope` | AUDIT PASS; TASK status ACCEPTED for enumerated eight-root slice | Satisfied functionally; must be included in clean baseline SHA |
| `BLK-BASELINE` | Git | Scoped accepted baseline commit `1036f2c64be7402f2fbd2508d6d66b12d06252a7` contains M1-06b/M1-06c deliverables; unrelated AFF/scratch/handover files remain outside commit | **SATISFIED** — Tier 2 must diff and implement from this exact SHA |
| M1-07a Ticket RLS | `docs/tasks/hrp-v5-m1-07a-ticket-rls-backstop/TASK.md` | Audit round 2 PASS: 32/32 LIVE cases; Tier 1 resolution ACCEPTED on 2026-08-27 | **SATISFIED** — execution round 2 may complete STEP-05/STEP-01 against the accepted Ticket RLS boundary |

## 1. Outcome

### User-visible outcome

Mọi HTTP route trong `app/api/**` được inventory và phân loại fail-closed. Không route nghiệp vụ, cache dữ liệu nhạy cảm, webhook hoặc service/repository phía sau route được phép dùng raw data client ngoài boundary đã khai báo. Worker chỉ đọc phiếu lương và Ticket của chính mình; actor nội bộ chỉ đọc/ghi object theo role + project/resource scope; system webhook thiếu hoặc sai secret bị từ chối trước mọi side effect.

Sau task này, Tier 1/Tier 3 có thể tái tạo bằng tool rằng toàn bộ API inventory được static gate phủ. Đây là exit gate còn thiếu của M1-06; không đồng nghĩa M1-07 RLS/FORCE RLS hoặc M1-09 field projection đã hoàn tất.

### Non-goals

- Không viết lại JWT/login/session hoặc permission resolver.
- Không mở rộng CRM/UI cho SALE/MKT; public project access tiếp tục qua public job projection.
- Không triển khai M1-07 policy/FORCE RLS mới; nếu LIVE audit chứng minh thiếu policy thì trả `BLOCKED` cho M1-07.
- Không triển khai toàn bộ M1-09 field-level projection; chỉ khóa DTO tối thiểu cần ngăn leak trong route thuộc scope.
- Không đổi Ticket/Attendance/Staffing business state machine, quota, money hoặc idempotency semantics ngoài phần bắt buộc để đưa DB operation vào đúng boundary.
- Không schema/migration/dependency mới nếu chưa có Planner revision.
- Không deploy/push/seed/migrate production.
- Không sửa artifact ngoài task hoặc thay đổi đang thuộc luồng khác.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | Inventory `rg --files app/api -g route.ts`, 26/08/2026 | Repo có `72` route files trong `22` top-level roots. Static gate M1-06a/b/c phủ `52` files trong `15` roots. | M1-06d phải phủ chính xác 20 files/7 roots còn lại và chuyển gate thành recursive/fail-on-unknown. |
| `EV-02` | M1-06c TASK Resolution `PLN-01..02` | 06c ACCEPTED cho enumerated slice; tuyên bố 100% coverage/Hardening closure bị Tier 1 bác. | M1-06d là mandatory follow-up, chặn M1-06 exit gate. |
| `EV-03` | `src/shared/auth/api-boundary.static.test.ts` `SCOPE_DIRS` | Gate đang duy trì manual root list và không quét `attendance`, `debug`, `disputes`, `me`, `staffing`, `tickets`, `webhook`. | Gate phải quét toàn bộ `app/api` và có manifest/classification cho mọi route. |
| `EV-04` | `app/api/webhook/payslip/route.ts` | POST fallback `INTERNAL_API_KEY` sang literal dev key; GET không auth và đọc cache bằng `workerId` do caller truyền. | P0: bỏ fallback, fail closed, constant-time secret check; GET phải user-scoped và worker self. |
| `EV-05` | `app/worker/page.tsx` payslip fetch | UI gọi `workerId=self`, nhưng route không resolve `self` từ AuthContext. | Route phải lấy worker identity từ server context, không tin query param cho WORKER. |
| `EV-06` | `app/api/attendance/adjustments/route.ts` GET | GET không gọi `getAuthContext`, truyền raw Prisma client vào `listTimesheetAdjustments`. | Bắt buộc auth + role/project scope + transaction context; cross-project phải 404/zero row. |
| `EV-07` | Năm route attendance còn lại | Đã dùng `getAuthContext` + `withDbContext`. | Đưa vào manifest/static gate; không refactor nếu gate và role/LIVE evidence chứng minh đúng. |
| `EV-08` | `src/domains/staffing/talent-pool.repo.ts` | `queryTalentPool` chạy `$queryRawUnsafe` và Worker query trên raw Prisma; tự merge scope builder nhưng không đặt L2 GUC. | Chuyển thành scoped repository/transaction; raw query chỉ được chạy trong RLS context. |
| `EV-09` | `src/domains/staffing/transfer.service.ts:247-270` | Single transfer dùng `withDbContext`; bulk dùng raw `prisma.$transaction` từng item nên không apply actor GUC. | Bulk phải dùng context boundary từng item, giữ semantics partial success và advisory lock. |
| `EV-10` | `app/api/tickets/**`, `TicketService` | Sáu route tạo module-scope `new TicketService(getPrisma())`; service tự chạy raw Prisma/transactions, list/detail raw model query ngoài request DB context. | Refactor service/repository seam nhận scoped transaction/context; giữ permission/state/idempotency contract. |
| `EV-11` | `src/shared/auth/ticket-route-helpers.ts` | Ticket routes đã verify AuthContext/permission rồi convert sang SessionUser, nhưng AuthContext không được truyền tới DB boundary. | Adapter phải trả/giữ full AuthContext và route/service compose DB boundary trong cùng request flow. |
| `EV-12` | `app/api/debug/route.ts`, `app/api/me/route.ts` | Không có business DB query trong handler; debug production 404 + ADMIN only ngoài production; `/me` trả JWT projection tối thiểu. | Classify explicit `NO_BUSINESS_DB`; static gate vẫn phải inventory chúng. |
| `EV-13` | `app/api/disputes`, `app/api/staffing/orders/**` | Business operations đã đi qua `withDbContext`; idempotency wrapper dùng raw client để compose. | Add to gate/manifest; chỉ sửa khi negative/static/LIVE check tìm bypass thật. |
| `EV-14` | M1-06c `DEV-01..05` + Planner Resolution | Margin thiếu ClientStatement L1 builder; role decisions cần canonical explanation; login pre-auth dùng raw transaction GUC. | M1-06d chuẩn hóa scope/boundary taxonomy mà không mở quyền mù quáng. |
| `EV-15` | `UNIFIED_PLAN_v5.md` §4.3/§7.2/RF-10 | M1-06 yêu cầu audit toàn `app/api/**`; no business route bypass. Role matrix cho HR_MANAGER/ACCOUNTANT payroll và public/CRM access tách khỏi PII. | Exit gate dựa exact inventory + role/resource/action, không dựa tên root hoặc số ước lượng. |
| `EV-16` | M1-06c Tier 3 audit | Full quality suite PASS; Tier 3 chạy 238 integration tests trên Neon test DB. | Giữ regression baseline; M1-06d phải thêm targeted LIVE cases cho gaps, không reimplement slice đã PASS. |

### Exact 20-route inventory

| # | Route file | Method | Current classification | Gap/required disposition |
|---:|---|---|---|---|
| 1 | `attendance/adjustments/route.ts` | GET, POST | POST user-scoped; GET raw/unauth | Fix GET; manifest cả hai methods |
| 2 | `attendance/import/[id]/commit/route.ts` | POST | `USER_SCOPED_DB` | Verify + manifest |
| 3 | `attendance/import/[id]/resolve/route.ts` | PATCH | `USER_SCOPED_DB` | Verify + manifest |
| 4 | `attendance/import/route.ts` | GET, POST | `USER_SCOPED_DB` | Verify + manifest |
| 5 | `attendance/timesheets/[id]/route.ts` | GET, POST | `USER_SCOPED_DB` | Verify + manifest |
| 6 | `attendance/timesheets/route.ts` | GET, POST | `USER_SCOPED_DB` | Verify + manifest |
| 7 | `debug/route.ts` | GET | `NO_BUSINESS_DB` | Explicit production/admin behavior test |
| 8 | `disputes/route.ts` | POST | `USER_SCOPED_DB` | Verify + manifest; preserve idempotency |
| 9 | `me/route.ts` | GET | `NO_BUSINESS_DB` | Explicit minimal projection test |
| 10 | `staffing/orders/[id]/route.ts` | GET, PATCH | `USER_SCOPED_DB` | Verify + manifest |
| 11 | `staffing/orders/route.ts` | GET, POST | `USER_SCOPED_DB` | Verify + manifest |
| 12 | `staffing/talent-pool/route.ts` | GET | raw/scoped-manual | Move raw/repository query into L1+L2 context |
| 13 | `staffing/transfers/route.ts` | POST | single scoped; bulk raw tx | Fix bulk context; preserve partial-success contract |
| 14 | `tickets/[id]/approve/route.ts` | POST | auth + raw service | Scoped service/repository boundary |
| 15 | `tickets/[id]/cancel/route.ts` | POST | auth + raw service | Scoped service/repository boundary |
| 16 | `tickets/[id]/pay/route.ts` | POST | auth + raw service | Scoped service/repository boundary |
| 17 | `tickets/[id]/reject/route.ts` | POST | auth + raw service | Scoped service/repository boundary |
| 18 | `tickets/[id]/route.ts` | GET | auth + raw service | Worker self/role scope + L2 |
| 19 | `tickets/route.ts` | GET, POST | auth + raw service | List/create scope + L2; preserve idempotency |
| 20 | `webhook/payslip/route.ts` | GET, POST | sensitive cache without proper boundary | P0 system write + user-scoped read fix |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Static inventory source là recursive `app/api/**/route.ts`, không manual root list. Mỗi route method có classification manifest; unknown/new route làm gate fail. | EV-01/03/15, Tier 1 | Final |
| `DEC-02` | CHOSEN | Data intent classes: `NO_BUSINESS_DB`, `PREAUTH_DB`, `PUBLIC_RPC`, `USER_SCOPED_DB`, `SYSTEM_SCOPED_DB`, `USER_SCOPED_DATA`, `SYSTEM_SCOPED_DATA`. Transaction đơn thuần không phải boundary. | M1-06c lesson, Tier 1 | Final |
| `DEC-03` | CHOSEN | Payslip POST là `SYSTEM_SCOPED_DATA`: thiếu `INTERNAL_API_KEY` → 503 trước parse/cache; sai key → 401; bỏ default key; compare constant-time; không log secret/payslip. | EV-04, Tier 1 | Final |
| `DEC-04` | CHOSEN | Payslip GET là `USER_SCOPED_DATA`: WORKER chỉ self qua `ctx.workerId`; query `workerId` không thể override self. ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT được đọc explicit worker theo canonical payroll visibility; role khác 403; cross-worker WORKER trả 404. EMPLOYEE self defer tới canonical Employee↔Payslip mapping. | EV-04/05/15, Tier 1 | Final |
| `DEC-05` | CHOSEN | Attendance adjustment GET cho ADMIN/HR_MANAGER/HR_STAFF/PM/ACCOUNTANT/DIRECTOR, nhưng PM/HR_STAFF phải project-scoped; object ngoài scope 404/zero rows. POST role/state/idempotency giữ nguyên trừ khi audit chứng minh gap. | EV-06/07, Tier 1 | Final |
| `DEC-06` | CHOSEN | Talent Pool raw SQL chỉ được chạy trong transaction đã set actor GUC; Worker query dùng canonical scope builder/repository. Không có raw Prisma client ở route/repo call path. | EV-08, M1-06 rule | Final |
| `DEC-07` | CHOSEN | Bulk transfer vẫn cho partial success theo từng worker, nhưng mỗi per-item transaction phải qua `withDbContext` hoặc equivalent actor-scoped helper. Không đổi advisory lock/quota/outbox invariant. | EV-09, Tier 1 | Final |
| `DEC-08` | CHOSEN | Ticket route helper phải giữ `AuthContext`; Ticket business query chạy trong scoped request transaction/repository. Không giữ module-scope service gắn raw Prisma. Worker A không list/read/mutate Ticket B; transition permission và idempotency response giữ nguyên. | EV-10/11, Tier 1 | Final |
| `DEC-09` | CHOSEN | `debug` và `me` là explicit `NO_BUSINESS_DB`; auth helper internal lookup không biến handler thành business DB route. Production debug vẫn 404. | EV-12, Tier 1 | Final |
| `DEC-10` | CHOSEN | `projects/clients` master endpoints giữ conservative privileged/assigned access trong M1-06d; SALE/MKT dùng public job projection. CRM-specific projection/access thuộc M1-09/CRM task, không mở raw master response ở đây. | M1-06c resolution + §7.2 | Final until M1-09 |
| `DEC-11` | CHOSEN | Payroll config read phải khớp canonical matrix: ADMIN, HR_MANAGER, DIRECTOR, ACCOUNTANT. Vì PayrollConfig là global config và ACCOUNTANT không có builder, implement explicit global-read scoped repository/helper + role gate; không nới mutation. | EV-14/15, Tier 1 | Final |
| `DEC-12` | CHOSEN | Margin aggregate phải có explicit ClientStatement/ClientStatementLine L1 capability hoặc scoped repository deny-by-default; không kể role gate + L2-only là L1+L2. | EV-14, Tier 1 | Final |
| `DEC-13` | CHOSEN | Login pre-auth DB access phải đi qua named `PREAUTH_DB` helper/repository với fixed User projection và transaction-local bootstrap context; route-level arbitrary raw transaction/GUC không nằm allowlist. | EV-14, Tier 1 | Final |
| `DEC-14` | ASSUMPTION | Accepted 06b/06c code behavior giữ nguyên sau scoped commit. | Tier 1/OP | Expires when baseline SHA pinned; mismatch → revise TASK |
| `DEC-15` | CHOSEN | Resolve execution-round-1 `BLK-01` bằng phương án A: create the scoped M1-07a migration/policy task. Reject phương án B for user-driven Ticket routes: `withSystemDb` would remove the actor-specific DB backstop required by RQ-05/AC-05. | Tier 1 resolution 2026-08-26; HANDOFF round 1 §5 `BLK-01` | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Static gate recursively phủ 100% `app/api/**/route.ts`; exact manifest map từng route method sang data-intent class + allowed boundary; unknown route/method hoặc forbidden raw client/transaction pattern làm test fail. | Must | EV-01/03, DEC-01/02 | Gate đỏ; HANDOFF không READY_FOR_AUDIT. |
| `RQ-02` | Payslip POST fail closed khi secret thiếu/sai, không default/log secret; GET xác thực và enforce WORKER self cùng internal payroll-reader roles; cache key/response không bị caller dùng để đọc worker khác. | Must P0 | EV-04/05, DEC-03/04 | 503/401/403/404 trước data leak hoặc side effect. |
| `RQ-03` | Sáu attendance route được manifest; adjustment GET đi qua verified AuthContext + scoped transaction/repository, role/project isolation đúng DEC-05; route khác không regression. | Must | EV-06/07 | Unauth 401; role deny 403; cross-scope 404/zero rows. |
| `RQ-04` | Staffing orders, talent-pool, transfers được manifest; talent-pool raw query chạy trong L2 context + L1 worker scope; bulk transfer apply actor context cho từng item và giữ partial-success/quota/advisory-lock/outbox invariant. | Must | EV-08/09, DEC-06/07 | Raw query ngoài context hoặc cross-project row leak → fail; item failure không rollback item khác. |
| `RQ-05` | Sáu Ticket routes không khởi tạo/call raw Prisma service ngoài request boundary; helper giữ AuthContext; list/detail/mutation enforce role/worker scope + DB backstop; idempotency/state/error contract không đổi. | Must | EV-10/11, DEC-08 | Worker cross-ticket 404; unauthorized 403; raw service pattern bị static gate bắt. |
| `RQ-06` | `debug`, `me`, `disputes` và staffing orders có explicit manifest/tests; `debug` production 404, `/me` chỉ `{userId, role}`, disputes/orders giữ user-scoped transaction và idempotency semantics. | Must | EV-12/13 | Unknown classification, extra PII hoặc DB bypass → fail. |
| `RQ-07` | Residual 06c được đóng: PayrollConfig read role matrix gồm ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT; margin có explicit L1/scoped repository; projects/clients master access được document/test theo DEC-10, không mở raw master DTO cho SALE/MKT. | Must | EV-14/15, DEC-10..12 | Role matrix mismatch hoặc claim L1 giả → fail. |
| `RQ-08` | Login DB bootstrap dùng named `PREAUTH_DB` helper/repository với fixed projection, transaction-local context, no arbitrary model operation; static negative fixture bắt route raw user query/GUC. | Must | EV-14, DEC-13 | Auth flow regression hoặc arbitrary pre-auth DB access → fail. |
| `RQ-09` | LIVE test trên DB test riêng chứng minh Worker/Ticket/Payslip self isolation, attendance/staffing cross-project isolation, bulk transfer context + concurrency/rollback và relevant RLS backstop; thiếu env là `ENV_BLOCKED`, không fallback. | Must | DEC-14 test strategy | Không có LIVE evidence → HANDOFF BLOCKED/ENV_BLOCKED, không PASS giả. |
| `RQ-10` | Full quality gate + scoped HANDOFF: verify-task, typecheck, lint 0 errors, unit, integration LIVE, Prisma validate, build, static inventory exact count và diff scope đều PASS. | Must | Pipeline | Bất kỳ mandatory gate fail → không READY_FOR_AUDIT. |

### 4.2 Scope boundaries

**In scope:**

- 20 route files trong Exact inventory §2.
- `src/shared/auth/api-boundary.static.test.ts` và manifest/helper test liên quan.
- `src/shared/auth/ticket-route-helpers.ts`.
- Named pre-auth/system/data boundary helper tối thiểu trong `src/shared/auth/**` nếu cần.
- `src/shared/auth/scopes/**` cho ClientStatement/Payroll explicit capability nếu được implementation chọn theo DEC-11/12.
- `src/domains/attendance/ticket.service.ts` hoặc scoped ticket repository seam.
- `src/domains/attendance/resolve-adjustment.service.ts`.
- `src/domains/staffing/talent-pool.repo.ts`, `transfer.service.ts`.
- M1-06c residual routes: `auth/login`, `statements/margin`, `payroll`, và role tests/documented matrix cho `projects/clients`.
- Targeted static/unit/route/LIVE tests và integration lane registration.
- `HANDOFF.md` do Tier 2 tạo.

**Out of scope:**

- Prisma schema/migration/RLS policy creation (M1-07 owner); discovery of missing policy is stop condition.
- Full field-projection redesign (M1-09 owner), ngoài minimal payslip/`me` projection bắt buộc chống leak.
- CRM route/UI mới cho SALE/MKT.
- Ticket/Attendance/Staffing business feature hoặc state transition mới.
- Employee payroll identity mapping.
- Cache provider replacement, queue/storage/observability expansion.
- Deployment, secret provisioning, production migration/seed.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Payslip là dữ liệu nhạy cảm; cache key lấy worker identity từ server cho WORKER. Ticket/attendance/staffing DTO không trả PII ngoài projection hiện hành. Không log payload/secret/PII.
- **State:** Giữ Ticket state machine, Timesheet lock/adjustment status và Staffing assignment/quota invariants. Boundary refactor không được đổi allowed transition.
- **Permission/data scope:** Dùng 13 `SystemRole` chính xác. Role deny trả 403; object ngoài scope trả 404/zero rows. WORKER chỉ self; PM/HR_STAFF chỉ assigned project khi resource có project relation.
- **Interface:** Giữ route paths và response shape trừ security error mới cho webhook (`503` missing secret) và corrected payroll role access. UI `workerId=self` tiếp tục hoạt động nhưng server tự resolve identity.
- **Failure/idempotency/concurrency:** Secret/auth failure xảy ra trước parse/write. Ticket/staffing/attendance idempotency key semantics giữ nguyên. Bulk transfer partial success per item; mỗi item transaction-local context + advisory lock. Callback throw rollback item hiện tại.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01/06 | Static gate + classification manifest | Recursive inventory toàn `app/api`; method-aware classification; negative fixtures cho raw model, raw transaction/GUC và unknown route. | Clean baseline | Static tests prove exact files scanned + synthetic unknown failure | Gate design cần wildcard bypass hoặc bỏ qua service call path. |
| `STEP-02` | RQ-02 | `webhook/payslip` + tests | Fail-closed system POST; authenticated scoped GET; fixed projection and worker self resolution. | Auth/cache adapter | Route tests: missing/sai/đúng key; self/cross-role matrix; no cache access on deny | Cần đổi cache provider/schema hoặc Employee mapping. |
| `STEP-03` | RQ-03 | Attendance routes/adjustment service | Fix adjustment GET and register all attendance routes; preserve existing mutation behavior. | Existing M7 services | Route + LIVE cross-project/worker tests | LIVE reveals missing RLS policy → BLK-M1-07. |
| `STEP-04` | RQ-04 | Staffing talent pool/transfer/orders | Move raw operations into actor context; bulk per-item scoped transaction; keep invariants. | Existing staffing integration tests | Targeted unit + LIVE 2-project/2-worker + concurrency | Requires business algorithm/quota/state change. |
| `STEP-05` | RQ-05 | Ticket helpers/routes/service | Carry AuthContext into scoped service/repository; remove module raw client service; preserve errors/idempotency/state. | Ticket builder + existing state tests | Six route tests + Worker A/B LIVE + transition regression | Requires Ticket schema/policy/migration or changes public state machine. |
| `STEP-06` | RQ-06 | debug/me/disputes | Add explicit classification and contract tests; avoid unnecessary refactor. | Existing debug test | Production/non-prod debug; `/me` projection; disputes boundary negative test | Behavior mismatch with accepted owner task. |
| `STEP-07` | RQ-07 | payroll/margin/projects/clients | Correct payroll reader roles; add explicit margin L1/repository capability; lock conservative master endpoint matrix. | Master matrix §7.2 | 13-role route matrix + field assertions + LIVE relevant models | Broader CRM/projection needed → defer M1-09, do not expose raw fields. |
| `STEP-08` | RQ-08 | login + named PREAUTH helper | Encapsulate fixed User lookup/bootstrap; prohibit arbitrary route raw transaction/GUC. | Existing login flow | Login success/failure regression + static negative fixtures | Requires JWT/session rewrite (out of scope). |
| `STEP-09` | RQ-09 | LIVE lane | Run guarded DB-test matrix and record masked evidence; no prod/dev fallback. | Safe test DB + admin test URL if introspection needed | Integration command exit 0 with named cases | Missing env/role/migration → ENV_BLOCKED; do not mock pass. |
| `STEP-10` | RQ-10 | Full gates + HANDOFF | Run repository gates, inspect exact diff, create evidence mapping. | STEP-01..09 | Validator/type/lint/unit/integration/prisma/build/diff | Any mandatory failure, out-of-scope diff or untracked secret. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Gate scans all route files under `app/api` at baseline (`72`) and derives future count recursively; all method entries classified; synthetic new/unknown route and forbidden raw access fail. | Static tests + inventory command | Exact count/root summary, manifest diff, negative outputs | Yes |
| `AC-02` | RQ-02 | Payslip POST: missing secret 503, wrong 401, valid processes only valid capped payload without leaking secret. GET: no token 401; WORKER self 200; Worker A→B 404; allowed internal readers work; other roles 403. | Route tests + cache spy; LIVE/auth integration where applicable | HTTP matrix, no-side-effect assertions, projection fields | Yes P0 |
| `AC-03` | RQ-03 | All six attendance files classified; adjustment GET unauth 401, deny role 403, same-project rows visible, cross-project invisible; existing import/timesheet suites stay green. | Route + existing integration + targeted LIVE | Actor/project fixtures, row counts/status | Yes |
| `AC-04` | RQ-04 | Talent pool raw query executes with tx-local actor context and PM cannot see other project data; bulk transfer gives each item scoped context, preserves partial success, 1-ACTIVE/quota/outbox rollback under race. | Static call-path assertion + staffing unit/LIVE concurrency | 2-project/2-worker outputs; success/failed arrays; DB state | Yes |
| `AC-05` | RQ-05 | No Ticket route/module-scope raw service client; Worker A only list/read/create self and cannot read/mutate B; authorized HR transitions retain expected status/errors; replay/mismatch idempotency unchanged. | Static + six route suites + Ticket unit + LIVE Worker A/B | HTTP/row/state/idempotency evidence | Yes |
| `AC-06` | RQ-06 | debug/me/disputes/orders explicitly classified; debug production 404 and non-prod non-admin 403; `/me` only returns userId/role; disputes/orders have no forbidden raw business op. | Contract/static/route tests | Response keys/status + gate results | Yes |
| `AC-07` | RQ-07 | Payroll read permits exactly ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT; margin ACCOUNTANT path passes explicit L1/scoped capability; projects/clients tests explain internal master vs public projection and deny unprojected SALE/MKT access. | 13-role route matrix + static registry/repo inspection + LIVE | Role/action table, response field assertions, scope evidence | Yes |
| `AC-08` | RQ-08 | Login route contains no arbitrary raw model query/GUC; named pre-auth helper selects fixed User fields; valid/invalid/inactive login behavior and cookie/JWT interface do not regress; synthetic arbitrary pre-auth model access fails gate. | Login tests + static negative fixtures | Status/body/cookie assertions; forbidden fixture output | Yes |
| `AC-09` | RQ-09 | Guarded LIVE lane runs on isolated test DB and proves AC-02..05/07 DB isolation/backstop; missing env produces `ENV_BLOCKED`; target guard prevents protected URL. | Integration preflight + test run | Masked target proof, exit code, file/test count, named cases | Yes |
| `AC-10` | RQ-10 | `verify-task`, typecheck, lint (0 errors), unit, targeted routes, integration LIVE, Prisma validate, build and `git diff --check` all pass; HANDOFF has exact scoped file list/deviations. | Repository commands + artifact review | Commands/exits/summaries + HANDOFF final status | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-05` | `AC-05` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-07` | `AC-07` |
| `RQ-08` | `STEP-08` | `AC-08` |
| `RQ-09` | `STEP-09` | `AC-09` |
| `RQ-10` | `STEP-10` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Payslip data exposure/cache poisoning | Unauth/cross-worker read hoặc default webhook key | P0 first step; fail before cache access; server-derived worker identity; fixed DTO | Disable route/cache feature flag if available; invalidate affected cache keys; rotate secret; incident review |
| `RISK-02` | Boundary refactor đổi Ticket state/idempotency | Transition/error/replay tests đổi | Preserve service contract; scoped tx adapter only; run full Ticket suite | Revert scoped adapter callsite, keep route blocked; open integrity revision if atomicity requires redesign |
| `RISK-03` | Bulk transfer partial-success semantics bị đổi | Một item fail làm rollback toàn batch hoặc context mất | Per-item actor-scoped transaction, existing advisory-lock tests + LIVE | Revert bulk seam only; keep route unavailable until safe fix |
| `RISK-04` | Static gate false-green | Manual list/count or wildcard transaction allow | Recursive inventory + explicit method manifest + negative synthetic route | Gate failure blocks handoff; no waiver without Tier 1 decision |
| `RISK-05` | Missing DB policy discovered | LIVE cross-scope succeeds or policy introspection missing | Stop and return M1-07 blocker; do not simulate RLS in app | Keep app-level deny, do not claim L2 PASS; create/activate M1-07 revision |
| `RISK-06` | Canonical role access exposes fields before M1-09 | Restoring role returns master/raw DTO | Fixed minimal projection or keep conservative deny with documented M1-09 follow-up | Revert role opening, preserve deny; do not weaken projection |
| `RISK-07` | Dirty baseline causes co-mingled diff | Tier 2 stages files outside the M1-06d contract | Baseline pinned at `1036f2c64be7402f2fbd2508d6d66b12d06252a7`; explicit scoped diff only | Do not reset user files; leave unrelated AFF/scratch/docs untouched |
| `RISK-08` | Test DB points protected environment | Env fallback or same protected host | Existing fail-closed preflight, masked target checks | Abort before DB access; rotate secret if exposed |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. Implementation decisions are locked and `BLK-BASELINE` is satisfied by the pinned accepted SHA. | - | - | No |

## 9. Planner Resolution

Tier 1 append audit decisions; do not rewrite Tier 2 HANDOFF or Tier 3 AUDIT.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| Not started | None | None | Audit round has not started | None | Tier 1 after Tier 3 handoff |
| Execution round 1 | `BLK-01` | `ACCEPT_FIX` — choose option A | Current `hrp_ticket_scope` family is incompatible with WORKER/HR_STAFF/ACCOUNTANT state-machine operations; system elevation would contradict RQ-05 | Spec `v1.1`: add DEC-15 and blocking dependency M1-07a; retain RQ-05/AC-05 unchanged | Tier 2 pauses Ticket/static-gate work; resume round 2 only after M1-07a ACCEPTED |
| Execution round 2 | `BLK-01` | `ACCEPT_FIX — RESOLVED` | M1-07a Audit round 2 passed 32/32 LIVE cases and Tier 1 marked the prerequisite ACCEPTED | None | Tier 2 resumes STEP-05 and STEP-01, then completes the remaining M1-06d evidence |
| Audit round 2 | `PLN-01` | `REJECT PASS — ACCEPT_FIX` | RQ-10/AC-10 explicitly require the full unit gate to PASS, but both HANDOFF and AUDIT record exit 1. Baseline diff proves M1-06d changed `queryTalentPool` to call `withDbContext`/`$transaction`, while the unchanged narrative test still supplies a transaction-client mock without `$transaction`; therefore the failure is an in-scope regression, not pre-existing debt | No product/security contract change. Round 3 may modify only the affected narrative test/harness in addition to existing declared scope | Tier 2 adds a faithful transaction-capable mock or moves the test to its correct configured lane without weakening assertions; targeted test and full unit command must exit 0; Tier 3 re-audits round 3 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-26` | Initial DRAFT: exact 20-route closure, payslip P0, attendance/staffing/ticket boundaries, recursive API manifest, 06c role/helper/pre-auth residuals và mandatory LIVE evidence. | M1-06c Planner Resolution `PLN-01..02`; Tier 1 technical inventory. |
| `v1.0` | `2026-08-26` | Promoted to READY_FOR_EXECUTION and closed `BLK-BASELINE` with pinned scoped accepted SHA `1036f2c64be7402f2fbd2508d6d66b12d06252a7`. | M1-06b/M1-06c baseline commit; unrelated AFF/scratch/docs excluded. |
| `v1.1` | `2026-08-26` | Round-1 resolution chooses M1-07a Ticket RLS policy alignment and rejects `withSystemDb` elevation; M1-06d becomes REVISION_REQUIRED until prerequisite acceptance. | HANDOFF round 1 `BLK-01`, `LIM-02`; RQ-05/AC-05 security invariant retained. |
| `v1.1` | `2026-08-27` | M1-07a prerequisite accepted; execution round 2 reopened without changing the M1-06d contract. | M1-07a Audit round 2 PASS and Tier 1 resolution. |
| `v1.1` | `2026-08-27` | Audit round 2 verdict PASS rejected; execution round 3 opened for the in-scope narrative-test transaction regression and a green full unit gate. | `PLN-01`; RQ-10/AC-10 mandatory gate remains unchanged. |
