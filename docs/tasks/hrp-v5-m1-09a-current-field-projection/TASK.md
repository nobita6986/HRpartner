# TASK: hrp-v5-m1-09a-current-field-projection

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-09a-current-field-projection` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `DRAFT` — contract hoàn chỉnh, chờ single-domain task được ACCEPTED và pin baseline |
| Planner | `Tier 1 / Codex` |
| Executor | `Tier 2` — một luồng duy nhất |
| Auditor | `Tier 3 independent context` |
| Baseline | `TO_BE_PINNED` — commit Planner Resolution ACCEPTED của `hrp-v5-go-live-01-single-domain-consolidation` |
| Modules | `V5-M1-09A / current Worker + statement + payment-like + payroll-config response projection` |
| ADR references | `UNIFIED_PLAN_v5.md §4.3 V5-M1-05/M1-09`; accepted RF-02 Worker projection; accepted M1-06 auth boundary; accepted M1-08 vendor object scope |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `single-domain ACCEPTED → Tier 1 pin baseline + READY_FOR_EXECUTION → verify-task → /code → /audit → /resolve` |
| Updated | `2026-08-28 Asia/Bangkok` |

### Dependency and sequencing gate

Task được chuẩn bị trước nhưng **không được giao `/code`** cho đến khi:

1. `hrp-v5-go-live-01-single-domain-consolidation` có audit hợp lệ, Planner Resolution `ACCEPT` và `Status = ACCEPTED`.
2. Source/evidence/resolution của single-domain đã commit; full acceptance SHA được pin vào `Baseline` ở trên.
3. Tier 1 recheck route inventory sau single-domain, đổi task thành `READY_FOR_EXECUTION`, execution round `1`, rồi chạy `verify-task.ps1` PASS.
4. Working tree không còn WIP của task trước. Nếu có overlap, Tier 2 dừng `BLOCKED`; không stash/reset/delete/chèn commit của agent khác.

**Vị trí roadmap:** đây là bước ngay sau single-domain. M1-09A phải ACCEPTED trước khi mở security hardening tiếp theo hoặc marketplace production launch gate. M1-09B cho model `Payment/PaymentAllocation` chỉ mở khi M8-06 tạo schema/API thật.

## 1. Outcome

### User-visible outcome

Mọi response hiện hữu có dữ liệu Worker, statement, payslip/withdrawal và payroll config đều đi qua DTO/projection có field allowlist, theo **role + action + effective permission**, không trả nguyên Prisma/cache object.

Người dùng quan sát được:

- Nhân sự không có `CAN_VIEW_WORKER_SENSITIVE` không nhận giá trị thật của CCCD/eKYC/bank trong list, create/update response hoặc detail.
- Worker đăng nhập chỉ xem hồ sơ của chính mình; được xem các field xác minh cá nhân cần thiết của bản thân nhưng không nhận raw `cccdChipData`.
- Vendor chỉ nhận số liệu statement phía vendor của chính mình; không nhận client rate, client receivable hoặc margin.
- Internal user chỉ nhận client commercial fields/margin-derived fields khi có effective permission `CAN_VIEW_STATEMENT_MARGIN`.
- Payslip chỉ trả đúng schema lương cho Worker self hoặc nhóm payroll-reader hiện hành; extra field nhúng trong cache/webhook không thể “đi ké” ra response.
- CTV chỉ xem thông tin rút tiền của chính mình; DTO không trả owner/audit field không cần thiết.
- Payroll config trả stable DTO, không spread raw row hoặc quan hệ/audit metadata ngoài hợp đồng.

### M1-09 split declaration

| Slice | Nội dung | Trạng thái sau task này |
|---|---|---|
| `M1-09A` | Projection cho toàn bộ surface hiện có trong schema/API ngày 2026-08-28 | Task này đóng |
| `M1-09B` | Projection cho canonical `Payment` + `PaymentAllocation` | Chờ M8-06 tạo model/API; không được tuyên bố đã test trong M1-09A |

### Non-goals

- Không tạo model `Payment`, `PaymentAllocation`, PayRun/Payslip DB hoặc migration; thuộc M8-06/PAY.
- Không đổi row-level visibility, RBAC, RLS, auth/session, permission assignment hoặc domain routing.
- Không cấp mặc định `CAN_VIEW_WORKER_SENSITIVE` hay `CAN_VIEW_STATEMENT_MARGIN` cho role nào.
- Không thay đổi công thức statement, rate resolution, margin, payroll/tax hoặc số tiền.
- Không thiết kế lại UI, CSV format ngoài việc loại field bị cấm, hay schema public apply.
- Không xử lý CV/public apply decision; marketplace form là task launch riêng.
- Không refactor service nghiệp vụ rộng hoặc thêm generic serializer framework.
- Không deploy, sửa Vercel/DNS/env, commit/push/merge ngoài chỉ thị riêng.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `UNIFIED_PLAN_v5.md §4.3 V5-M1-09` | Worker/statement/payment/config phải có DTO theo role; CCCD, bank, margin, client rate không trả mặc định. | Canonical outcome và test matrix. |
| `EV-02` | `docs/tasks/hrp-v5-rf-02-worker-projection/TASK.md` + AUDIT | RF-02 ACCEPTED masking 7 Worker fields qua `CAN_VIEW_WORKER_SENSITIVE`. | Phải kế thừa, không làm regression hoặc kể lại là Worker projection chưa tồn tại. |
| `EV-03` | `src/shared/auth/worker-projection.ts:27-74` | Helper copy toàn row rồi thay 7 field bằng `***`; vẫn phụ thuộc raw Prisma shape. | Nâng lên DTO allowlist/action-aware projection; giữ tương thích redaction ở route hiện hữu. |
| `EV-04` | `app/api/workers/route.ts` + `[id]/route.ts` | GET/POST/PUT query/return raw Worker rồi mới gọi projection; effective permission đã resolve. | Giữ row scope/write behavior; thay projection/DB select, không đổi auth. |
| `EV-05` | `app/api/workers/me/route.ts` | Worker self hiện bị mask như role thường; comment hoãn self visibility sang phase sau. | M1-09A chốt action `SELF_PROFILE`; cấm raw chip data. |
| `EV-06` | `app/api/statements/generate/route.ts:48-64` | POST trả trực tiếp object từ `generateVendorStatement`/`generateClientStatement`, gồm relation lines/rate. | P0 projection gap: route phải trả stable command-result DTO, không raw statements/lines. |
| `EV-07` | `app/api/statements/route.ts` | Internal list tự map summary nhưng trả cả vendor + client total cho mọi allowed role. | Hai tổng có thể suy ra margin; client commercial fields phải phụ thuộc permission. |
| `EV-08` | `app/api/vendor/statements/route.ts` + export | Vendor list/CSV select own statement; CSV chứa vendor line rate/amount, không client data. | Giữ vendor-own financial visibility, khóa absence client/margin fields. |
| `EV-09` | `app/api/statements/margin/route.ts` + `margin.service.ts` | Margin đã gate bằng `CAN_VIEW_STATEMENT_MARGIN`. | Reuse effective permission; không tạo role shortcut mới. |
| `EV-10` | `app/api/webhook/payslip/route.ts:20-35,147-154` | TypeScript interface không runtime-validate extra keys; GET trả object cache nguyên trạng. | Thêm strict runtime schema + explicit payslip DTO. |
| `EV-11` | `app/api/ctv/withdrawals/route.ts` | CTV self-only nhưng response spread selected DB record, gồm `ctvId` và bank fields. | Stable self DTO; bank value chỉ self action, không leak owner field thừa. |
| `EV-12` | `app/api/payroll/route.ts:61-76` | `payrollConfig.findMany` raw rows được trả thẳng. | Explicit select + DTO, không raw/audit relation ride-along. |
| `EV-13` | `prisma/schema.prisma` | Không có `Payment`/`PaymentAllocation`; payment-like current surfaces là payslip cache + CTV withdrawal. | Tách M1-09B theo M8-06; M1-09A không tạo schema giả. |
| `EV-14` | `SystemRole` canonical | 13 role: ADMIN, HR_MANAGER, DIRECTOR, HR_STAFF, SALE, PM, ACCOUNTANT, MKT, VENDOR_ADMIN, VENDOR_STAFF, CTV, WORKER, EMPLOYEE. | Contract test phải enumerate đủ, không dùng subset kể chuyện. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Projection là allowlist DTO, không blacklist/spread raw Prisma/cache object rồi xóa field. | Tier 1 security decision | Final |
| `DEC-02` | `CHOSEN` | Row visibility giữ nguyên accepted M1-06/M1-08; task chỉ quyết field visibility sau khi row đã được authorize. | Tier 1 | Final |
| `DEC-03` | `CHOSEN` | Effective permission là source-of-truth cho sensitive field, không suy chỉ từ role label. | M1 permission model | Final |
| `DEC-04` | `CHOSEN` | Existing Worker endpoints giữ response envelope và redaction compatibility: không-permission nhận `***`/null cho 7 accepted RF-02 fields; raw value không xuất hiện. DTO không mang field Prisma ngoài allowlist. | RF-02 compatibility | Final |
| `DEC-05` | `CHOSEN` | `WORKER` self-profile được xem own CCCD image/number và bank fields cần xác minh; `cccdChipData` luôn omitted khỏi HTTP response, kể cả self/privileged, vì eKYC chip là post-go-live raw artifact. | Tier 1 privacy-by-action | Final |
| `DEC-06` | `CHOSEN` | Client total/rate và field cho phép suy ra margin thuộc group `CLIENT_COMMERCIAL`; chỉ response action có effective `CAN_VIEW_STATEMENT_MARGIN` được chứa. | M1-09 + existing permission | Final |
| `DEC-07` | `CHOSEN` | Vendor own statement được thấy vendor rate/amount/hours của mình; tuyệt đối không client commercial/margin. | Marketplace/vendor contract | Final |
| `DEC-08` | `CHOSEN` | Statement generation response là command result tối thiểu (id/kind/status/period/version/created flag nếu có), không trả line/rate/amount raw. Người có permission xem tài chính qua read endpoint canonical. | Tier 1 least-data | Final |
| `DEC-09` | `CHOSEN` | Payslip webhook input dùng runtime strict schema; cache chỉ lưu normalized allowlisted payload; GET project lại trước response. | Tier 1 | Final |
| `DEC-10` | `CHOSEN` | PayrollConfig DTO giữ giá trị cấu hình cần nghiệp vụ (`key`, normalized `value`, type, version/effective/legal/status) cho existing finance readers; omit `createdBy` và raw relation/audit fields. | Tier 1 | Final |
| `DEC-11` | `CHOSEN` | CTV withdrawal bank details chỉ visible ở CTV self action hiện hữu; DTO omit `ctvId`. Không mở admin payment surface trong task này. | Tier 1 | Final |
| `DEC-12` | `CHOSEN` | Payment canonical chưa tồn tại được ghi `SCHEMA_NOT_AVAILABLE`, không mock PASS. M1-09B là dependency child của M8-06. | `EV-13` | Final |
| `DEC-13` | `CHOSEN` | JSON date/money/decimal phải serialize string/ISO deterministic; không để BigInt/Decimal/Date raw vào `NextResponse.json`. | API boundary correctness | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Có projection manifest/source-of-truth khai báo surface, action, allowed fields, sensitive group và required permission/self rule. | Must | `DEC-01..03` | Manifest thiếu surface → static/contract test fail. |
| `RQ-02` | Worker list/create/update/detail không trả raw CCCD/eKYC/bank khi thiếu permission; không spread raw row; envelope/status giữ tương thích RF-02. | Must | `EV-02..04` | Raw sentinel xuất hiện → fail P0. |
| `RQ-03` | Worker self chỉ đọc `ctx.workerId`; own profile DTO cho phép own human-readable identity/bank fields nhưng luôn omit `cccdChipData`. | Must | `EV-05`, `DEC-05` | Cross-worker/raw chip → fail P0. |
| `RQ-04` | Internal statement list không trả `CLIENT_COMMERCIAL` cho caller thiếu `CAN_VIEW_STATEMENT_MARGIN`; field absence không được thay bằng giá trị có thể suy ra tương đương. | Must | `EV-07`, `DEC-06` | Client total/rate/margin sentinel leak → fail P0. |
| `RQ-05` | Statement generate trả command-result DTO tối thiểu; không trả lines, rate, amount, margin, raw relation hoặc Prisma scalar ngoài allowlist. | Must | `EV-06`, `DEC-08` | Raw result/line leak → fail P0. |
| `RQ-06` | Vendor statement list/export chỉ own vendor financial data và không chứa client rate/receivable/margin; M1-08 404/403/atomic behavior giữ nguyên. | Must | `EV-08`, `DEC-07` | Cross-side/cross-vendor leak hoặc behavior regression → fail. |
| `RQ-07` | Margin endpoint tiếp tục gate bằng effective `CAN_VIEW_STATEMENT_MARGIN`; denied roles 403 trước aggregate và response không có financial fields. | Must | `EV-09` | Role shortcut/DB call on deny → fail. |
| `RQ-08` | Payslip POST strict-normalize allowlisted fields; GET trả explicit DTO cho WORKER self hoặc existing privileged reader, cross-worker 404 và denied role 403. | Must | `EV-10`, `DEC-09` | Extra cache sentinel/cross-worker field leak → fail P0. |
| `RQ-09` | CTV withdrawal POST/GET trả stable self DTO, amount string + ISO date, bank details self-only, omit `ctvId`/raw row; other roles 403 trước DB. | Must | `EV-11`, `DEC-11/13` | Owner/bank cross-context leak → fail. |
| `RQ-10` | PayrollConfig uses explicit DB select + stable DTO; no raw row/spread/createdBy; existing 13-role access matrix unchanged. | Must | `EV-12`, `DEC-10` | Extra sentinel/role regression → fail. |
| `RQ-11` | Contract tests enumerate all 13 SystemRole values plus permission on/off and action variants; exact forbidden sentinel absence, not snapshot-only. | Must | `EV-14` | Missing role/context or weak truthy assertion → fail. |
| `RQ-12` | Static boundary prevents future `NextResponse.json(rawModel/cacheObject)` or raw spread in declared sensitive routes, with reviewed minimal allowlist for DTO calls. | Must | `DEC-01` | Negative fixture not caught → fail. |
| `RQ-13` | Payment schema gap is documented truthfully as `SCHEMA_NOT_AVAILABLE`; no schema/mock endpoint; HANDOFF creates M1-09B activation note tied to M8-06. | Must | `EV-13`, `DEC-12` | False PASS/payment mock/schema expansion → BLOCKED/FAIL. |
| `RQ-14` | Typecheck, lint, full unit and build pass; no change to auth/RLS/financial formula; diff stays within allowlist. | Must | accepted baseline | Regression/out-of-scope diff → fail. |

### 4.2 Scope boundaries

**In scope — expected runtime targets:**

- `src/shared/auth/worker-projection.ts` and its tests
- A small projection module/manifest under `src/shared/projection/` or domain-local equivalent for statements, payslip, withdrawal and payroll config
- `app/api/workers/route.ts`
- `app/api/workers/[id]/route.ts`
- `app/api/workers/me/route.ts`
- `app/api/statements/route.ts`
- `app/api/statements/generate/route.ts`
- `app/api/statements/margin/route.ts` only if necessary to use shared projection/negative evidence; permission semantics unchanged
- `app/api/vendor/statements/route.ts`
- `app/api/vendor/statements/[id]/export/route.ts`
- `app/api/webhook/payslip/route.ts`
- `app/api/ctv/withdrawals/route.ts`
- `app/api/payroll/route.ts`
- Existing relevant tests plus focused M1-09A contract/static tests under `src/domains/security/` or `src/shared/auth/`
- `HANDOFF.md` của task này

**Conditional scope:**

- `src/domains/reconciliation/statement.service.ts` chỉ được thay return type/adapter nếu route không thể tạo safe command DTO mà không đụng công thức/query. Không đổi calculation, transaction, audit hoặc outbox.
- Permission resolver/catalog chỉ được import/reuse; không thêm permission code hoặc seed grant.

**Out of scope / forbidden:**

- `middleware.ts`, login/logout/single-domain files khi task trước chưa commit sạch.
- `prisma/**`, migrations, schema, grants, seeds.
- Statement formula/rate resolver/margin arithmetic, RLS/auth scope, M1-08 transitions.
- Public apply/tracking, admin application queue, vendor submission data contract.
- Commission policy/ledger, attendance/ticket/staffing business code.
- `.env*`, `.vercel/**`, `docs/VERCEL_ENV_PRODUCTION.local.md`, `C:\CodeApp\new1.txt`.
- `docs/aff_plan*`, `docs/HRP_REMAINING_ROADMAP.md`, `scratch/**`, `scripts/debug-parser.mjs` và artifact user/agent khác.
- `AUDIT.md` — Tier 2 không tạo/sửa.

### 4.3 Field groups và action matrix

| Group | Fields / meaning | Default | Explicit visibility |
|---|---|---|---|
| `WORKER_CORE` | id, userId/employee code, fullName, profile/employment/risk status, assignment ownership metadata cần UI, safe timestamps | Allowed sau row auth | Existing authorized Worker readers |
| `WORKER_CONTACT` | phone, DOB, gender, addresses, tax/insurance identifiers | Action-aware | Current operational readers theo DTO; không mở role mới |
| `WORKER_SENSITIVE` | CCCD number/images/issued fields, selfie, bank account/name/branch | Redacted/omitted | Effective `CAN_VIEW_WORKER_SENSITIVE` hoặc `WORKER_SELF` per DEC-05 |
| `WORKER_CHIP_RAW` | `cccdChipData` | Always omitted | None in HTTP M1-09A |
| `STATEMENT_CORE` | id, kind/party, period, status, version, dispute/SLA dates | Allowed sau row auth | Existing statement readers/vendor own |
| `VENDOR_FINANCIAL` | vendor payable, vendor line rate/hours/amount | Not public | Vendor own; existing internal statement reader |
| `CLIENT_COMMERCIAL` | client receivable, client line rate/amount, any margin-derived pair | Omitted | Effective `CAN_VIEW_STATEMENT_MARGIN` only |
| `PAYSLIP_SELF_FINANCIAL` | gross/net, earned, deductions, period, computedAt | Omitted | WORKER self; existing privileged payslip roles |
| `WITHDRAWAL_SELF_BANK` | bank account/name + amount/status | Omitted | CTV self action only |
| `PAYROLL_CONFIG_OPERATIONAL` | key, normalized value, type, description/legal ref, version/effective/status | Omitted | Existing payroll config viewer roles |

### 4.4 Data, State, Permission và Interface Rules

- **Data:** Projection must build new plain objects from explicit fields. No raw object spread. Synthetic forbidden sentinel values in tests must not appear anywhere in serialized JSON/CSV.
- **State:** No state transition changes. Generation remains idempotency/error-compatible; projection happens after transaction result.
- **Permission/data scope:** First row authorization, then field projection. Projection cannot upgrade missing row permission. Permission resolution failure fails closed; it must not default to sensitive access.
- **Interface:** Preserve endpoint envelopes/status codes unless §3 explicitly changes inner DTO. Breaking field removals are recorded in HANDOFF and affected UI compile/build must pass.
- **Serialization:** BigInt/Decimal → base-10 string; Date → ISO string; JSON config → normalized JSON-compatible value; no `any` escape to serialize ORM object.
- **Failure/idempotency/concurrency:** No change. Projection is pure/deterministic and must not introduce DB writes or second unscoped reads.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | all | dependency/baseline | Confirm single-domain ACCEPTED, pin SHA, clean previous WIP; produce route/field inventory against current baseline. | Tier 1 activation | Task/control + `git status` | Stop if baseline not pinned or overlap exists. |
| `STEP-01` | `RQ-01,11,12` | projection manifest/tests | Define action/field groups and write failing table/static tests first, enumerating 13 roles + permission variants. | Existing permission resolver | Focused red tests demonstrate gaps | Stop if a required policy decision is missing; do not let Tier 2 invent visibility. |
| `STEP-02` | `RQ-02,03` | Worker projection/routes | Replace raw-row projection with allowlist DTO/action context; keep RF-02 redaction; implement self rule and chip omission. | RF-02 accepted | Worker unit/route contract tests | Stop if row scope/RLS must change. |
| `STEP-03` | `RQ-04,05,07` | internal statement routes | Add internal list/generate/margin DTOs; enforce effective permission for client commercial group; minimal command result. | Existing margin permission | Role × permission tests | Stop if formula/service query change becomes necessary. |
| `STEP-04` | `RQ-06` | vendor statement list/export | Use explicit vendor-own DTO/CSV columns; assert client/margin sentinel absence; preserve M1-08 IDOR. | M1-08 accepted | Vendor route + CSV tests | Stop if M1-08 ownership/transition semantics would change. |
| `STEP-05` | `RQ-08` | payslip webhook/cache | Strict runtime schema, normalized cache payload, explicit GET DTO, self/privileged/deny matrix. | Existing internal webhook auth | Payslip route tests | Stop if cache adapter contract requires unrelated infrastructure change. |
| `STEP-06` | `RQ-09` | CTV withdrawals | Stable self DTO; omit `ctvId`, deterministic money/date; bank remains self-only. | M1-06a boundary | Withdrawal tests | Stop if admin payment workflow is requested; defer M8-06. |
| `STEP-07` | `RQ-10` | payroll config | Explicit select and DTO; omit raw/audit fields; preserve access matrix. | Finance scope | Payroll route tests | Stop if new permission/seed change is needed. |
| `STEP-08` | `RQ-11,12,13` | security/static coverage | Close all matrices, static negative fixtures and truthful Payment gap manifest. | STEP-01..07 | Targeted suites | Missing Payment remains documented, never mock-pass. |
| `STEP-09` | `RQ-14` | full gates | verify-task, typecheck, scoped lint, targeted/full unit, build, diff/secret/scope checks. | All implementation | Commands §6 | Any blocking gate fail → no READY_FOR_AUDIT. |
| `STEP-10` | all | `HANDOFF.md` | Record exact before/after response matrices, field inventory, counts, deviations, M1-09B note; no commit/push/AUDIT. | HANDOFF template | Manual + verifier if present | Secret or unsupported PASS claim → BLOCKED. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Every declared surface/action maps to an explicit projection and field group; no sensitive route lacks manifest coverage. | Manifest coverage assertion against route inventory. | Exact route/action list. | Yes |
| `AC-02` | `RQ-02` | Worker unauthorized-sensitive responses contain no raw CCCD/eKYC/bank sentinel; RF-02 envelope/redaction remains compatible; no raw spread. | Route tests for list/POST/PUT + projection unit. | JSON key/value assertions. | Yes |
| `AC-03` | `RQ-03` | Worker self resolves server `ctx.workerId`, returns allowed own identity/bank values, omits `cccdChipData`, rejects/ignores cross-worker input. | Self route tests. | Exact allowed/forbidden field set. | Yes |
| `AC-04` | `RQ-04,07` | Caller without effective margin permission receives no client total/rate/margin-derived values and denial path performs zero aggregate; permitted caller receives correct string fields. | Role × permission statement/margin tests. | DB mock zero-call + sentinel assertions. | Yes |
| `AC-05` | `RQ-05` | Generate response contains only command-result DTO; no `lines`, `rate`, `amount`, client/vendor raw object or BigInt serialization failure. | Route contract test with hostile extra fields. | Exact output keys. | Yes |
| `AC-06` | `RQ-06` | Vendor A own list/CSV works; Vendor B remains 404/zero; output contains vendor financial columns only and no client/margin sentinel. | Existing M1-08 + new projection/CSV tests. | IDOR + column inventory. | Yes |
| `AC-07` | `RQ-08` | Payslip strict POST drops/rejects unknown fields; normalized cache and GET DTO cannot replay hostile extra field; self/privileged allowed, cross/denied fail correctly. | Webhook route tests. | Cache input + response key assertions. | Yes |
| `AC-08` | `RQ-09` | CTV withdrawal output omits `ctvId`, serializes amount/date, returns bank only to same CTV; every non-CTV role denied before DB. | 13-role/self route matrix. | Zero-call denial + exact DTO. | Yes |
| `AC-09` | `RQ-10` | Payroll config query uses explicit select; DTO omits `createdBy`/hostile extra fields and retains required operational values for allowed roles only. | Payroll route matrix/DTO test. | Select shape + JSON keys. | Yes |
| `AC-10` | `RQ-11` | Tests enumerate exactly all 13 current `SystemRole` values and fail if enum gains a role without expected projection/access entry. | Enum coverage assertion. | Expected/actual role set. | Yes |
| `AC-11` | `RQ-12` | Static negative fixtures catch raw `NextResponse.json(row)`, `{...row}`, cache replay and unprojected sensitive select on declared routes; production files pass. | Static contract tests. | Negative mutation cases. | Yes |
| `AC-12` | `RQ-13` | HANDOFF states canonical Payment projection is not run because schema/API absent, names M8-06→M1-09B dependency and provides no fabricated test result. | Artifact review/schema grep. | `SCHEMA_NOT_AVAILABLE` evidence. | Yes |
| `AC-13` | `RQ-14` | verify-task, typecheck, scoped lint, targeted tests, full unit, build and `git diff --check` exit 0. | Mandatory commands. | Commands, exits, test counts. | Yes |
| `AC-14` | `RQ-14` | Diff only allowlisted files; no schema/auth/RLS/formula/single-domain/user artifact/secret changes. | `git diff --name-only`, diff review, secret scan. | Exact file list. | Yes |

### Mandatory verification commands

Tier 2 records exact command + exit code; Tier 3 reruns independently:

```powershell
powershell -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-m1-09a-current-field-projection/TASK.md
npx tsc --noEmit
npx eslint app/api/workers app/api/statements app/api/vendor/statements app/api/webhook/payslip/route.ts app/api/ctv/withdrawals/route.ts app/api/payroll/route.ts src/shared/auth/worker-projection.ts src/shared/projection src/domains/security
npx vitest run src/shared/auth/worker-projection.test.ts src/domains/security/workers-projection.contract.test.ts src/shared/auth/webhook-payslip.route.test.ts src/shared/auth/payroll.route.test.ts src/shared/auth/statements-margin.route.test.ts
npx vitest run
npm run build
git diff --check
git status --short
rg -n "NextResponse\.json\((row|rows|worker|statement|config|payslip)|\.\.\.(row|worker|statement|config|payslip)" app/api/workers app/api/statements app/api/vendor/statements app/api/webhook/payslip app/api/ctv/withdrawals app/api/payroll
rg -n "model (Payment|PaymentAllocation)\b" prisma/schema.prisma
```

Tier 2 cập nhật targeted command nếu file test/module mới có tên khác; không được bỏ full unit/build. Lệnh schema cuối dự kiến không match và phải được ghi `SCHEMA_NOT_AVAILABLE`, không diễn giải thành test PASS của Payment.

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01, STEP-08` | `AC-01, AC-10, AC-11` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-03` | `AC-05` |
| `RQ-06` | `STEP-04` | `AC-06` |
| `RQ-07` | `STEP-03` | `AC-04` |
| `RQ-08` | `STEP-05` | `AC-07` |
| `RQ-09` | `STEP-06` | `AC-08` |
| `RQ-10` | `STEP-07` | `AC-09` |
| `RQ-11` | `STEP-01, STEP-08` | `AC-10` |
| `RQ-12` | `STEP-01, STEP-08` | `AC-11` |
| `RQ-13` | `STEP-08, STEP-10` | `AC-12` |
| `RQ-14` | `STEP-09` | `AC-13, AC-14` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | UI phụ thuộc raw Prisma field bị vỡ. | Typecheck/build/client runtime thiếu field. | Stable DTO + compile/build; document intentional removal. | Revert route projection commit; reintroduce only reviewed safe field, không raw spread. |
| `RISK-02` | Hai tổng statement cho phép suy margin dù không có key `margin`. | Denied role vẫn nhận vendor + client totals. | Classify `CLIENT_COMMERCIAL` and test derived-data absence. | Hide client monetary group until permission policy fixed. |
| `RISK-03` | Worker self exception bị dùng để đọc worker khác. | Query/body id thay được `ctx.workerId`. | Server-derived self action and cross-input tests. | Disable self sensitive values, return redacted DTO. |
| `RISK-04` | Strict payslip schema làm webhook producer fail. | Unknown/legacy payload gets 400 in preview. | Allow only documented required/optional fields, versioned error evidence; no silent raw retention. | Temporarily accept unknown input but strip before cache/response; never replay extras. |
| `RISK-05` | CSV injection/formula cell hoặc field drift. | Value begins `=,+,-,@` or unexpected column. | Fixed columns and safe CSV escaping; synthetic tests. | Disable export route temporarily or revert to safe fixed subset. |
| `RISK-06` | Projection mistaken for authorization. | Route starts returning rows outside L1/L2 scope. | DEC-02 and preserve accepted auth wrappers; no scope file changes. | Revert row-query change; keep pure projector only. |
| `RISK-07` | Task expands into missing Payment/schema. | Diff contains Prisma/migration/payment endpoint. | M1-09 split + forbidden scope. | Remove out-of-scope diff; open M1-09B after M8-06. |
| `RISK-08` | Sensitive value appears in tests/HANDOFF/log. | Real-looking PII/secret copied to artifact. | Synthetic sentinels only; secret scan; masked evidence. | Rotate if real secret, purge artifact before commit, report owner. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Full acceptance SHA của single-domain task là gì? | Tier 1 | Khi resolve single-domain | Yes — chỉ block activation |
| `Q-02` | Canonical Payment model/API khi nào tồn tại? | M8-06 Planner | Khi mở M8-06 | No — deferred M1-09B, không block M1-09A |

Không có policy question nào giao cho Tier 2; field/action decisions đã chốt trong §3–4.

## 9. Planner Resolution

Tier 1 append audit decision; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `0` | `NONE` | `PENDING_DEPENDENCY` | Contract prewritten; single-domain chưa ACCEPTED và baseline chưa pin. | None | Tier 1 activates after dependency gate. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-28` | Initial M1-09A contract: action-aware DTOs for current Worker, statement, payslip/withdrawal and payroll-config surfaces; explicit M1-09B defer for absent Payment schema. | Owner requested next task prewritten after single-domain; technical survey EV-01..14. |
