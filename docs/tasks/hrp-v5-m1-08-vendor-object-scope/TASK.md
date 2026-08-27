# TASK: hrp-v5-m1-08-vendor-object-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-08-vendor-object-scope` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 |
| Executor | Tier 2 — single execution stream |
| Auditor | Tier 3 independent context |
| Baseline | `713d77bd21e1e7b491390fc43eea04332148a167` — M1-07b accepted and archived; canonical M1 L2 posture complete |
| Modules | `V5-M1-08 / vendor object scope / order-submission-statement IDOR` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.3 M1-08, §7.2, RF-13; accepted M1-06b DEC-03/05/06/07/11/12; M1-07b L2 posture |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/code hrp-v5-m1-08-vendor-object-scope` → HANDOFF → `/audit` |
| Updated | `2026-08-27 Asia/Bangkok` |

### Dependency and sequencing gate

| Dependency | Source | Satisfied evidence | Status / stop condition |
|---|---|---|---|
| M1-06b vendor route boundary | `docs/tasks/hrp-v5-m1-06b-worker-vendor-cron-auth-scope/TASK.md` | `ACCEPTED`; server-derived `ctx.vendorId`, opaque dedup and dedicated vendor statement routes exist | Satisfied; preserve accepted decisions and public interfaces |
| M1-07 canonical PostgreSQL L2 | M1-07a + M1-07b TASK/AUDIT | Both `ACCEPTED`; runtime writer, FORCE RLS and vendor policies have independent LIVE evidence | Satisfied; if this task discovers a real policy/posture regression, stop for Planner instead of silently expanding migration scope |
| Canonical role matrix | `UNIFIED_PLAN_v5.md` §7.2 | `VENDOR_ADMIN` owns operational vendor actions; `VENDOR_STAFF` has narrower operational scope and statement read-only access | Satisfied; role split is locked in DEC-05 |
| Isolated TEST database | Explicit `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` through integration preflight | Existing lane is fail-closed and maps only validated TEST credentials | Required for final LIVE evidence; missing or unsafe target is `ENV_BLOCKED`, never PASS and never fallback to dev/prod |
| M1-09 projection | Roadmap M1-09 | Not yet executed | Not a dependency; field-level redesign is explicitly excluded from M1-08 |

## 1. Outcome

### User-visible outcome

Sau task này, tài khoản của vendor chỉ nhìn thấy và thao tác dữ liệu thuộc đúng `vendorId` đã được xác minh từ phiên đăng nhập. Vendor A không thể đọc submission/statement, xuất CSV, xác nhận hoặc phản đối statement của Vendor B bằng cách đổi ID. Danh sách order chỉ trả các order đang nhận hồ sơ và thực sự thuộc phạm vi vendor: order của project công khai là cơ hội chung; order của project riêng chỉ hiện khi project đã có quan hệ submission với chính vendor hiện tại.

`VENDOR_ADMIN` được thực hiện các nghiệp vụ vendor có tác động tài chính đã chốt; `VENDOR_STAFF` vẫn làm nghiệp vụ tuyển dụng trong phạm vi vendor nhưng chỉ đọc statement. Các API reconciliation nội bộ không còn là đường vòng để vendor SEND/LOCK/CONFIRM/DISPUTE statement. Mọi mutation statement kiểm tra owner, trạng thái và giới hạn số vòng một cách atomic, nên request đồng thời không thể tạo hai transition hoặc audit trùng.

### Non-goals

- Không triển khai field-level DTO/projection toàn hệ thống của M1-09; không đổi cách tính tiền, rate, margin hoặc nội dung CSV ngoài yêu cầu chống IDOR.
- Không đổi schema, enum, migration, package/dependency hoặc RLS policy đã được M1-07b chấp nhận. Nếu cần một thay đổi như vậy, Tier 2 phải dừng và trả Planner.
- Không thiết kế lại Vendor Portal, dashboard, navigation hoặc state management phía client. Server-side authorization là nguồn sự thật; cải tiến UX quyền hạn chỉ được phép nếu additive, tối thiểu và không làm rộng scope.
- Không đổi state machine M8 tương lai (`ISSUED/REVISED`); M1-08 dùng vocabulary hiện tại của schema: order `OPEN/CLOSING_SOON/CLOSED/CANCELLED`, statement `DRAFT/SENT/DISPUTED/CONFIRMED/LOCKED/PAID`.
- Không thay đổi public job board/apply funnel, Worker conversion/placement, AFF, commission, payroll hoặc cron.
- Không apply/seed dev hay production; không log/commit credential, connection string, PII thật hoặc fixture lâu dài.
- Không commit/push/merge artifact ngoài exact task scope; không chạm `docs/aff_plan*`, `scratch/*` hay `scripts/debug-parser.mjs`.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md:175` | M1-08 yêu cầu order/submission/statement đúng vendor context và đúng status; exit test là vendor A không đọc/submit/order/dispute của B | Contract phải kiểm chứng cả read và mutation, không chỉ thêm filter list |
| `EV-02` | `docs/UNIFIED_PLAN_v5.md:539-557` | `VENDOR_ADMIN` có own submissions/workers/statements; `VENDOR_STAFF` hẹp hơn và statement read-only; exit matrix gồm admin↔staff↔vendor khác | Khóa role-action matrix tại DEC-05 và test đủ hai role vendor |
| `EV-03` | `docs/UNIFIED_PLAN_v5.md:944`; `V5_READINESS_ASSESSMENT.md:117` | RF-13 yêu cầu suite IDOR riêng cho orders/submissions/statements/dispute | LIVE suite hai vendor là acceptance bắt buộc, không dùng unit mock thay thế |
| `EV-04` | `app/api/vendor/orders/route.ts:35-37`; `prisma/schema.prisma` model `StaffingOrder` | Route đang lọc `status: 'ACTIVE'`, trong khi status hợp lệ là `OPEN/CLOSING_SOON/CLOSED/CANCELLED` | Sửa regression về canonical open status và chứng minh list không trả closed/cancelled |
| `EV-05` | `src/shared/auth/scopes/project.scope.ts`; `staffing.scope.ts`; accepted M1-06b DEC-06 | Vendor order scope hiện là project public hoặc project đã có submission của chính vendor; `StaffingOrder` không có `vendorId` trực tiếp | Không bịa ownership column; phân biệt public opportunity với private vendor-linked order |
| `EV-06` | `app/api/vendor/submissions/route.ts` | Owner create lấy từ `ctx.vendorId`; order được re-check trong cùng DB context; accepted statuses đã là `OPEN/CLOSING_SOON`; dedup trả opaque outcome | Giữ cấu trúc tốt, đóng role/status/IDOR và regression bằng test đầy đủ |
| `EV-07` | `app/api/vendor/statements/**` | List/export đã parent-scope; confirm/dispute đang cho cả hai vendor role và thực hiện read rồi update | Giữ own-scope, thu hẹp mutation về admin và làm transition atomic |
| `EV-08` | `app/api/statements/route.ts:17,45-70` | API list nội bộ vẫn nhận vendor; cùng `where.vendorId` được dùng cho cả vendor và client statement query | Vendor phải bị chặn trước DB; dedicated `/api/vendor/statements` là surface canonical |
| `EV-09` | `app/api/disputes/route.ts`; `src/domains/reconciliation/dispute.service.ts` | API generic nhận mọi authenticated role và dispatch SEND/DISPUTE/CONFIRM/LOCK; service không có role-action gate tương ứng | Khóa API generic cho internal reconciliation roles, ngăn vendor dùng đường vòng |
| `EV-10` | `dispute.service.ts`; dedicated confirm/dispute routes | State được đọc trước, sau đó update theo ID; hai request đồng thời có thể cùng qua precondition | Mutation phải có guarded write/optimistic condition và exactly-once audit/outbox semantics |
| `EV-11` | `app/vendor/**` call inventory | Vendor UI chỉ gọi dedicated `/api/vendor/orders`, `/submissions`, `/statements` và statement child routes; admin reconciliation gọi `/api/statements` | Đóng generic aliases với vendor không phá canonical portal call path |
| `EV-12` | Existing route/unit/LIVE tests and `vitest.integration-files.ts` | M1-06b LIVE chỉ chứng minh CandidateSubmission/VendorStatement row isolation; chưa phủ order status, generic aliases, route mutations, staff split hoặc concurrency | Thêm focused M1-08 test matrix và đăng ký đúng fail-closed integration lane |

Evidence method: CodeGraph được dùng trước để lần scope builder và call path; sau đó đối chiếu trực tiếp roadmap, schema, route, service, UI call sites và test inventory tại baseline. Đây là planning evidence, không thay HANDOFF của Tier 2 hoặc audit độc lập của Tier 3.

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | M1-08 là task hardening có sửa code thật và suite IDOR riêng; không giữ kết luận readiness cũ rằng đây luôn là test-only vì survey baseline đã tìm thấy route defects. | EV-04/08/09/10, Tier 1 | Final |
| `DEC-02` | CHOSEN | Vendor owner chỉ lấy từ verified `ctx.vendorId`; mọi `vendorId`, project ownership hoặc statement ownership do body/query/path gợi ý đều không đáng tin. | Accepted M1-06b DEC-03 | Final |
| `DEC-03` | CHOSEN | Order không “thuộc vendor” bằng một cột trực tiếp. Public project order là cơ hội chung cho A/B; private project order chỉ visible khi chính vendor đã có submission trên project. Submission/statement mới là object có `vendorId` trực tiếp. | EV-05 | Final |
| `DEC-04` | CHOSEN | “Đúng status” của order list và submit là chính xác `OPEN` hoặc `CLOSING_SOON`; `CLOSED` và `CANCELLED` không list và không nhận submission. Dùng một canonical predicate/constant để list và mutation không drift. | EV-04/06 | Final |
| `DEC-05` | CHOSEN | `VENDOR_ADMIN`: list order/submission/statement, create submission, export/confirm/dispute own statement. `VENDOR_STAFF`: list order/submission/statement, create submission trong own scope, export own statement; confirm/dispute statement bị 403 trước DB. | Master §7.2 + operational portal intent | Final |
| `DEC-06` | CHOSEN | `/api/vendor/**` là surface canonical của vendor. Generic `/api/statements` và `/api/disputes` là internal reconciliation surface; mọi vendor role bị 403 trước DB/service. Generic mutation roles là `ADMIN`, `HR_MANAGER`, `ACCOUNTANT`; `DIRECTOR` giữ read-only và role khác deny. `FORCE_LOCK` vẫn cần permission hiện hữu ngoài role gate. | EV-08/09/11 + master matrix | Final |
| `DEC-07` | CHOSEN | Cross-vendor object ID tại dedicated read/export/mutation trả 404 giống object không tồn tại và tạo zero write/audit/outbox. Role/action denial đã biết trước khi lookup trả 403. | Accepted M1-06b DEC-07 | Final |
| `DEC-08` | CHOSEN | Statement transition phải ràng buộc owner + current state + dispute count/version tại lúc write. Một race chỉ có tối đa một canonical winner; loser trả 409 cho state conflict, không phát sinh audit/outbox phụ. | EV-10 | Final |
| `DEC-09` | CHOSEN | L1 route/scope và L2 writer RLS đều phải được chứng minh. L1 không được dựa vào RLS như authorization duy nhất; test L2 trực tiếp không được dùng DB owner làm actor. | M1-06/M1-07 architecture | Final |
| `DEC-10` | CHOSEN | Giữ success response, method, idempotency và error vocabulary hiện hữu khi không xung đột DEC-04..08. Không lộ Worker identity/PII trong duplicate result. | Accepted M1-06b DEC-05/11 | Final |
| `DEC-11` | CHOSEN | Không schema/migration/dependency. Nếu LIVE cho thấy accepted M1-07b policy sai, hoặc atomicity cần constraint/model mới, Tier 2 ghi blocker và dừng để Tier 1 tách/revise contract. | Baseline discipline | Final |
| `DEC-12` | CHOSEN | LIVE chỉ chạy qua `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` và integration preflight. Thiếu env là `ENV_BLOCKED`; URL trùng protected dev/prod bị từ chối; không tái sử dụng số liệu cũ sau khi code đổi. | DEC-14 safety convention | Final |
| `DEC-13` | CHOSEN | M1-09 sở hữu field projection. M1-08 chỉ cấm toàn bộ cross-vendor row/object và giữ các redaction đã chấp nhận; không mở rộng response để “tiện test”. | Roadmap separation | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Có inventory executable cho toàn bộ vendor entry points trong scope; role ngoài matrix, session thiếu và vendor context thiếu bị chặn trước business DB call. | Must P0 | EV-01/02, DEC-05/06 | 401 cho session thiếu; 403 cho role/context/action không hợp lệ; zero business DB call |
| `RQ-02` | Order list chỉ trả `OPEN/CLOSING_SOON` trong public-or-own-linked project scope; private order của vendor khác và mọi `CLOSED/CANCELLED` bị loại. | Must P0 | EV-04/05, DEC-03/04 | List không chứa ID; không fallback broad query/post-filter |
| `RQ-03` | Submission list/create dùng server-derived vendor owner; create chỉ vào order visible + open trong cùng transaction; public order cho phép nhiều vendor riêng biệt, private cross-vendor bị 404; dedup không lộ PII. | Must P0 | EV-06, DEC-02..05/10 | 404 invisible order; 409 closed/dedup; zero orphan/cross-vendor row |
| `RQ-04` | Vendor statement list/export chỉ trả own parent và own lines; cross-vendor ID không phân biệt với absent; không truy vấn line trước khi parent scope được chứng minh. | Must P0 | EV-07, DEC-02/07/13 | Empty list hoặc 404; zero CSV/body data từ vendor khác |
| `RQ-05` | Chỉ `VENDOR_ADMIN` confirm/dispute own statement; `VENDOR_STAFF` read/export-only. SENT, max-two-disputes và accepted transitions được giữ, audit cùng transaction. | Must P0 | EV-02/07, DEC-05/07/08 | 403 staff; 404 cross-owner; 409 invalid state/max/race; zero partial audit/state |
| `RQ-06` | Generic `/api/statements` và `/api/disputes` không còn là vendor alias; internal role/action gate chạy trước DB/service và giữ `FORCE_LOCK` permission gate. | Must P0 | EV-08/09/11, DEC-06 | Vendor/other role 403 with zero delegate call; internal allowed paths không regress |
| `RQ-07` | Statement mutation chống race bằng guarded/optimistic write: owner/state/count tại write-time, exactly one transition and audit/outbox for one logical success. | Must P0 | EV-10, DEC-08 | Loser 409/404 theo nguyên nhân; no duplicate transition/audit/outbox |
| `RQ-08` | Focused IDOR suite chứng minh L1 route behavior và L2 runtime-writer behavior với Vendor A admin, Vendor A staff, Vendor B admin, missing/invalid context trên orders/submissions/statements/dispute. | Must P0 | EV-03/12, DEC-09/12 | Missing safe env=`ENV_BLOCKED`; swallowed SQL/connect error, skip hoặc owner evidence=FAIL |
| `RQ-09` | Typecheck, lint, unit, integration, build và pipeline verifiers PASS; diff chỉ có exact M1-08 code/test/config/HANDOFF, không schema/migration/dependency/secret/unrelated artifact. | Must | DEC-11/12 | HANDOFF không được `READY_FOR_AUDIT` |
| `RQ-10` | HANDOFF ghi exact commands/counts, route-role-state matrix, masked DB identity, fixture cleanup, deviations và residual gaps; không tuyên bố M1-09 hoàn tất. | Must | Pipeline rules, DEC-13 | Thiếu evidence hoặc lộ secret → không audit |

### 4.2 Scope boundaries

**In scope — route surfaces:**

- `app/api/vendor/orders/route.ts`.
- `app/api/vendor/submissions/route.ts`.
- `app/api/vendor/statements/route.ts`.
- `app/api/vendor/statements/[id]/export/route.ts`.
- `app/api/vendor/statements/[id]/confirm/route.ts`.
- `app/api/vendor/statements/[id]/dispute/route.ts`.
- `app/api/statements/route.ts` — generic list closure for vendor roles.
- `app/api/disputes/route.ts` — generic mutation role/action closure.

**In scope — supporting code/tests when needed:**

- `src/domains/reconciliation/dispute.service.ts` or one existing reconciliation repository for atomic guarded transition; no competing service layer.
- Existing canonical scope builders under `src/shared/auth/scopes/**` only if a proven mismatch must be fixed without changing the ownership model.
- Existing route/unit tests plus a focused M1-08 route/IDOR suite.
- One focused LIVE test such as `src/shared/auth/live-vendor-idor.m1-08.test.ts`.
- `vitest.integration-files.ts`, `vitest.integration.config.ts` and narrowly relevant preflight/test comments to register the new LIVE file/flag.
- Tier 2-owned `docs/tasks/hrp-v5-m1-08-vendor-object-scope/HANDOFF.md`.

**Out of scope:**

- Prisma schema, migrations, RLS redesign, new DB roles/grants, package files and dependency lockfiles.
- Routes outside the eight named surfaces except a directly invoked existing helper/test needed for atomicity.
- New endpoints, public job-board behavior, portal redesign, statement calculation/lineage/payment workflow.
- Full DTO/field projection; frontend permission system; AFF artifacts; production deploy/push.
- Editing Tier 1 `TASK.md` or Tier 3 `AUDIT.md` by the executor.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** `ctx.vendorId` is the only vendor identity. `CandidateSubmission.vendorId` and `VendorStatement.vendorId` are direct ownership. Order scope is derived from its project: `isPublic=true` or that project has a submission with the current vendor. Child statement lines inherit parent ownership.
- **State:** Order list/submit accepts exactly `OPEN|CLOSING_SOON`; rejects `CLOSED|CANCELLED`. Vendor confirm accepts own `SENT`; dispute accepts existing canonical states and max two rounds exactly as accepted behavior. Generic internal transitions keep current state machine.
- **Permission/data scope:** `VENDOR_ADMIN` has own operational write; `VENDOR_STAFF` may submit candidates but statement mutation is denied. Both may read/export only own rows. Internal reconciliation mutation is limited to ADMIN/HR_MANAGER/ACCOUNTANT; DIRECTOR is read-only; all other roles deny-by-default.
- **Interface:** Preserve existing methods, success payloads, CSV shape, validation and error codes where DEC-04..08 do not require a denial change. Do not accept a caller-supplied owner. Cross-owner lookup uses 404; known role/action denial uses 403.
- **Failure/idempotency/concurrency:** All invariant reads, guarded mutation and audit/outbox are one transaction. An audit failure rolls back state. Concurrent transitions have at most one success and one audit/outbox effect. Tests must not convert exceptions into zero rows or PASS.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | RQ-09 | Git/task baseline | Confirm pinned SHA, dirty protected artifacts and exact diff boundary before edits | Git read-only checks | `git status --short --branch`; `git diff --stat` | Baseline lacks accepted M1-07b or overlaps another active source task |
| `STEP-01` | RQ-01 | Eight route surfaces | Build route×method×role×context inventory; add pre-DB gates and negative delegate assertions | Master §7.2, existing auth context | Focused route unit tests | Required role policy differs from DEC-05/06 |
| `STEP-02` | RQ-02 | Vendor order list | Replace invalid `ACTIVE` predicate with shared canonical open statuses while retaining scoped query inside L1+L2 transaction | Existing staffing/project scope | Unit cases for public/private A/private B/all four statuses | Correctness would require adding order vendor ownership column |
| `STEP-03` | RQ-03 | Submission list/create | Preserve server ownership, atomic visible/open re-check and opaque dedup; close staff/cross-vendor/status gaps | Existing dedup repository + DB context | Route unit + two-vendor LIVE counts | Needs schema/constraint or broad privileged query beyond accepted narrow dedup |
| `STEP-04` | RQ-04/05 | Dedicated statement routes | Enforce own parent/child scope, staff read-only and stable 403/404/409; no data leak | Existing statement scope/RLS | Unit IDOR/role/state matrix | Fix requires field projection redesign or RLS migration |
| `STEP-05` | RQ-05/07 | Statement transition implementation | Make owner/state/count write conditional and audit/outbox exactly once in same tx | Existing reconciliation/audit primitives | Unit race simulation + LIVE concurrent attempt | Atomicity requires new DB constraint/model |
| `STEP-06` | RQ-06 | Generic statement/dispute APIs | Remove vendor roles from generic surfaces; explicit internal role/action gate before delegate, retain permission check | Existing reconciliation service/permissions | Route matrix with zero-call denials and allowed regression | An existing production vendor UI/client is proven to require generic route |
| `STEP-07` | RQ-08 | Focused LIVE M1-08 suite | Create unique A-admin/A-staff/B-admin fixtures; prove list/detail/export/mutation/L2 isolation, status and race; exact cleanup in `finally` | Isolated TEST DB | Targeted `vitest` through integration config | Env absent/unsafe=`ENV_BLOCKED`; fixture cannot be isolated |
| `STEP-08` | RQ-08/09 | Integration registry/config | Register focused test and forwarded flag without weakening preflight or unit DB sentinel | Existing integration SSOT | Preflight blocked case + enabled TEST run | Any fallback to `.env`, dev or prod URL |
| `STEP-09` | RQ-09 | Full quality gates | Run task verifier, Prisma validate, typecheck, scoped lint, unit, full integration and build; inspect diff/secrets | Repo scripts | All commands exit 0; `git diff --check` | Baseline regression or unrelated diff cannot be isolated |
| `STEP-10` | RQ-10 | `HANDOFF.md` | Record truthful matrix/results, masked target, deviations and exact remaining risks; finish canonical handoff status | Pipeline template | `verify-handoff.ps1` if present; manual terminal line check | Any blocking AC, skipped required LIVE case or secret in evidence |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Every named route/method has an explicit allowed/denied role and missing-context case; denial happens before business DB/service call. | Route unit matrix + mock call counts | Case table and test output | Yes |
| `AC-02` | `RQ-02` | A and B both see a public OPEN/CLOSING_SOON order; only the linked vendor sees each private order; nobody sees CLOSED/CANCELLED. No query uses `ACTIVE`. | Unit + LIVE exact fixture IDs | Returned ID sets by actor/status; source search | Yes |
| `AC-03` | `RQ-03` | A/B submissions are created with server owner only; private cross-vendor submit is 404, closed/cancelled is 409, and duplicate response contains no Worker identity/PII. | Route + LIVE before/after rows | HTTP status/body and exact row ownership/counts | Yes |
| `AC-04` | `RQ-04` | Vendor A list/export cannot include B statement or lines; B ID and unknown ID are externally indistinguishable 404 with zero data. | Route + LIVE IDOR cases | IDs/CSV assertions and DB counts | Yes |
| `AC-05` | `RQ-05` | A admin can confirm/dispute only A statement in valid state; A staff gets 403 before DB; B object gives 404; invalid/max state gives 409; audit failure rolls back. | Role/state unit matrix + LIVE | Status, call counts, state/audit before-after | Yes |
| `AC-06` | `RQ-06` | Both vendor roles receive 403 with zero DB/service calls from generic statement/dispute APIs; allowed internal role/action cases remain green and FORCE_LOCK still checks permission. | Route unit matrix | Delegate/capability assertions | Yes |
| `AC-07` | `RQ-07` | Two concurrent attempts against one eligible statement yield at most one success, one final transition and one matching audit/outbox effect. | Deterministic unit race + LIVE concurrency | Settled results and exact DB counts | Yes |
| `AC-08` | `RQ-08` | Focused LIVE suite runs through writer/admin TEST lane and proves A-admin/A-staff/B-admin plus empty/invalid context across all four resource families; no exception is swallowed. | `npm run test:integration` or equivalent config-scoped command after preflight | Exit 0, per-suite count, masked DB identity and cleanup evidence | Yes |
| `AC-09` | `RQ-09` | Task verifier, Prisma validate, typecheck, lint with zero errors, unit, full integration, build and diff checks pass; no schema/migration/dependency/unrelated/secret diff. | Exact commands in HANDOFF | Exit codes/counts + scoped diff inventory | Yes |
| `AC-10` | `RQ-10` | HANDOFF is truthful, contains no secret/PII, distinguishes LIVE PASS from ENV_BLOCKED and does not claim M1-09; terminal status matches actual gates. | Handoff verifier/manual review | HANDOFF path and final status line | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-04, STEP-05` | `AC-05` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-07` |
| `RQ-08` | `STEP-07, STEP-08` | `AC-08` |
| `RQ-09` | `STEP-00, STEP-09` | `AC-09` |
| `RQ-10` | `STEP-10` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Nhầm public order là object riêng của vendor và chặn marketplace hợp lệ | B không thấy public OPEN order hoặc không thể submit | Fixture tách public/shared và private/linked; giữ DEC-03 | Revert order predicate/scope change, giữ tests để sửa contract implementation |
| `RISK-02` | Thu hẹp VENDOR_STAFF làm gián đoạn tuyển dụng | Staff không thể list/create own submission | Cho staff operational submission theo DEC-05; chỉ financial mutation read-only | Revert riêng role gate sai; không nới statement write |
| `RISK-03` | Vendor dùng generic reconciliation route để bypass dedicated gate | Vendor SEND/LOCK/CONFIRM thành công qua `/api/disputes` | Deny vendor before delegate; negative zero-call tests | Revert unrelated service refactor, giữ explicit route gate |
| `RISK-04` | Read-then-write race tạo audit hoặc transition trùng | Hai request cùng qua state precheck | Conditional write/version/current-state predicate; same transaction | Roll back mutation refactor; restore prior route then reopen with DB design review |
| `RISK-05` | LIVE fixture làm bẩn DB test hoặc chạm protected target | Cleanup fail, target matches protected URL | Unique run prefix, exact IDs, `finally`, preflight fail-closed | Admin cleanup exact fixture IDs on TEST only; never broad delete |
| `RISK-06` | M1-08 kéo sang M1-09/M8 hoặc migration | Diff xuất hiện DTO redesign, enum/schema/migration | Enforce scope and stop condition | Remove out-of-scope change from task branch without touching user artifacts; Planner opens later contract |
| `RISK-07` | Generic internal reconciliation regression | ADMIN/HR_MANAGER/ACCOUNTANT action changes unexpectedly | Preserve allowed action unit matrix and service contract | Revert generic-route changes, reapply minimal role gate with regression tests |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. Ownership, public/private order semantics, role-action split, status vocabulary, error behavior and test lane are locked above. | Tier 1 | `2026-08-27` | No |

## 9. Planner Resolution

Chưa có audit. Tier 1 chỉ append quyết định tại đây sau khi Tier 3 bàn giao `AUDIT.md` hợp lệ.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `0` | `NONE` | `PENDING_AUDIT` | Task mới sẵn sàng thực thi | None | Tier 2 → Tier 3 → Tier 1 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-27` | Initial READY contract for vendor order/submission/statement/dispute object scope, role split, generic-alias closure, atomic transitions and focused LIVE IDOR suite. | M1-07b accepted; survey found EV-04/08/09/10 implementation gaps behind RF-13. |
