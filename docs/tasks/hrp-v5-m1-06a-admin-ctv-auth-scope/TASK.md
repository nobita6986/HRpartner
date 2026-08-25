# TASK: hrp-v5-m1-06a-admin-ctv-auth-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06a-admin-ctv-auth-scope` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — primary agent |
| Executor | Tier 2 — Coding agent |
| Auditor | Tier 3 — independent Audit agent |
| Baseline | `299614a` — MP-3C accepted and committed; unrelated worktree changes excluded |
| Modules | `V5-M1-06 / RF-10a / Hardening-1` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.3 `V5-M1-06`, §4.13, §7.2; `V5_3_TIER_EXECUTION_GUIDE.md` §3.1; deny-by-default và L1+L2 hiện hữu |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `verify-task` → `/code` → Tier 2 HANDOFF → Tier 3 audit → Tier 1 resolve |
| Updated | `2026-08-25 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Toàn bộ API nghiệp vụ dưới `app/api/admin/**` và `app/api/ctv/**` chỉ truy cập database qua boundary có AuthContext, authorization và scope dữ liệu. ADMIN tiếp tục dùng được các màn hình hiện hữu; CTV chỉ đọc/ghi dữ liệu của chính mình. Request thiếu phiên, sai role hoặc cố truy cập chéo scope bị từ chối ổn định mà không lộ sự tồn tại hay dữ liệu của object khác.

### Non-goals

- Không xử lý các route `worker`, `vendor`, `cron` hoặc domain khác; chúng thuộc các lát M1-06 tiếp theo.
- Không triển khai session/refresh rotation, OTP hay viết lại identity-core.
- Không hoàn tất toàn bộ `FORCE RLS` của V5-M1-07, vendor IDOR của V5-M1-08 hoặc field projection của V5-M1-09.
- Không thay đổi workflow, state machine, response thành công hoặc nghiệp vụ MP-1/MP-2/MP-3.
- Không thêm dependency, schema hoặc migration.
- Không deploy production, không chạy security test trên dev/prod DB và không sửa `HANDOFF.md`/`AUDIT.md` ngoài đúng owner của từng tier.

## 2. Evidence và Baseline

Phương pháp evidence: CodeGraph đã được gọi trước nhưng không chạy được do ACL của môi trường; Planner dùng `rg`, source inspection và `git status` read-only.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md:173`, `:300-309` | V5-M1-06 bắt buộc route nghiệp vụ đi qua auth scope; hardening diễn ra sau một vòng Marketplace. | Đây là task đầu tiên sau MP-3C, trước M7/M8. |
| `EV-02` | `docs/V5_3_TIER_EXECUTION_GUIDE.md:56-66` | Hardening-1 gồm M1-06..09 và OPS-02/04/06; launch gate yêu cầu kiểm tra IDOR và projection. | Task phải có route/security test thật, không chỉ grep. |
| `EV-03` | `docs/V5_READINESS_ASSESSMENT.md:110-117` | RF-10 yêu cầu chia M1-06 theo domain, lát đầu là admin/CTV và ưu tiên route PII/tiền. | Scope cố định ở hai route tree, không quét toàn repo. |
| `EV-04` | inventory read-only ngày 2026-08-25 của `app/api/admin/**`, `app/api/ctv/**` | Có 18 `route.ts`; 3 action route là thin delegate. Không route nào dùng `withAuthScope`; `admin/users`, `ctv/claims`, `ctv/withdrawals` còn query trực tiếp ngoài `withDbContext`. | Phải inventory lại sau MP-3C, rồi đóng mọi business DB path trong scope. |
| `EV-05` | `src/shared/auth/with-auth-scope.ts:18-23`, `:49-78`; `src/shared/auth/with-db-context.ts:1-57` | L1 inject scope/deny-by-default; L2 đặt GUC transaction-local. Tài liệu helper yêu cầu L1+L2 cùng pass nhưng hai lớp chưa có boundary phối hợp canonical cho route. | Cần một cách gọi canonical và test chứng minh cả hai lớp được áp dụng. |
| `EV-06` | `src/shared/auth/scopes/index.ts`; `src/shared/auth/scopes/ctv.scope.ts` | Registry đã có CandidateSubmission/SourceClaim nhưng chưa phủ mọi model mà admin/CTV route đang dùng. | Chỉ bổ sung builder/repository tối thiểu cho route trong scope; model không rõ quyền phải fail closed. |
| `EV-07` | `app/api/ctv/claims/route.ts:22-27`; `app/api/ctv/withdrawals/route.ts:54-55,106-107`; `app/api/admin/users/route.ts:28-56` | Ba handler thực hiện business query trực tiếp trên raw Prisma. | Đây là các điểm P0 của lát hardening. |
| `EV-08` | `app/api/admin/applications/route.ts:57-59` và MP-3 route WIP | Marketplace admin routes đã dùng L2 nhưng đang thay đổi trong MP-3C. | Không sửa chồng khi MP-3C chưa ACCEPTED; execution inventory lấy từ commit sau MP-3C. |
| `EV-09` | `src/shared/auth/auth-context.ts` | Auth bootstrap phải tra User/Worker trước khi có AuthContext. | Bootstrap identity là ngoại lệ có tài liệu, không được tính là business-query bypass của task này. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | M1-06 được chia theo domain; task này chỉ chịu trách nhiệm `admin/**` và `ctv/**`. | EV-03 | Final |
| `DEC-02` | CHOSEN | Boundary chuẩn của request nghiệp vụ là: verified `AuthContext` → role/permission gate → L1 scope hoặc scoped repository → L2 transaction-local RLS context → query. Authentication đơn thuần không đủ. | EV-01/05 | Final |
| `DEC-03` | CHOSEN | Read query dùng cả L1 `withAuthScope` và L2 `withDbContext`. Mutation mà Prisma extension không thể scope an toàn phải dùng scoped repository/server-derived ownership trong L2; cấm tạo `where` giả cho operation `create`. | Existing extension semantics | Final |
| `DEC-04` | CHOSEN | Route chỉ được lấy raw client để truyền ngay vào boundary canonical; không được gọi model query/raw SQL trên client đó ngoài boundary. | M1-06 | Final |
| `DEC-05` | CHOSEN | Thin route không query DB được coi là compliant khi delegate duy nhất tới handler đã scoped và có contract test chứng minh. | EV-04 | Final |
| `DEC-06` | CHOSEN | CTV ownership luôn suy ra từ `ctx.userId`; không tin `ctvId`, vendor ID hoặc owner ID từ query/body. | Visibility matrix | Final |
| `DEC-07` | CHOSEN | Cross-scope object lookup trả `404 NOT_FOUND` khi việc trả `403` có thể xác nhận object tồn tại; sai role/action trước object lookup trả `403 FORBIDDEN`. | Anti-enumeration rule | Final |
| `DEC-08` | CHOSEN | Auth bootstrap trong `getAuthContext`, RLS `set_config` trong helper đã duyệt và public SECURITY DEFINER RPC là ngoại lệ được allowlist; route business không được tự tạo ngoại lệ mới. | EV-09/security baseline | Final |
| `DEC-09` | CHOSEN | Không thay đổi successful response contract, pagination, money serialization, idempotency, audit/outbox hoặc MP-3 state behavior trong task hardening này. | Regression boundary | Final |
| `DEC-10` | CHOSEN | Task chỉ được chuyển `READY_FOR_EXECUTION` sau khi MP-3C ACCEPTED, worktree không còn thay đổi MP-3C ngoài commit, và baseline SHA/inventory được cập nhật trong TASK. | Tier separation | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Lập inventory machine-readable của mọi `route.ts`/shared handler dưới `app/api/admin/**` và `app/api/ctv/**`, phân loại `NO_DB`, `SCOPED_DB` hoặc allowlisted bootstrap; không bỏ sót handler delegate. | Must | EV-04/DEC-05 | Static gate fail và HANDOFF không được READY_FOR_AUDIT. |
| `RQ-02` | Cung cấp boundary canonical để route thực thi query trong cùng request qua verified AuthContext, L1 scope/scoped repository và L2 transaction-local RLS context; lỗi callback phải rollback. | Must | EV-05/DEC-02 | Fail closed; không chạy query trên raw client. |
| `RQ-03` | Loại mọi business query trực tiếp ngoài boundary khỏi các handler admin/CTV, ưu tiên `admin/users`, `ctv/claims`, `ctv/withdrawals`; thin delegates phải trỏ tới handler compliant. | Must | EV-07 | 401/403/500 ổn định; không fallback raw Prisma. |
| `RQ-04` | Bổ sung scope builder hoặc scoped repository tối thiểu cho model được hai route tree sử dụng. Non-root model/action chưa khai báo phải `DENY_BY_DEFAULT`; create/update không được nhận ownership từ client. | Must | EV-06/DEC-03/06 | `DENY_BY_DEFAULT`/403 hoặc validation; zero write. |
| `RQ-05` | Giữ role/action hiện hữu: route ADMIN không mở thêm role; Marketplace queue/read và mutation giữ đúng contract MP-2/MP-3; CTV endpoint chỉ role CTV và self-scope. | Must | DEC-09 | 401 thiếu/sai session; 403 sai role; 404 cross-scope object khi áp dụng. |
| `RQ-06` | Response vẫn dùng projection hiện hữu; không log token, phone, bank account, payload nhạy cảm hoặc raw DB error. `amountVnd` tiếp tục serialize dạng decimal string. | Must | Global security rules | Contract/log test fail; redact và trả stable error. |
| `RQ-07` | Có static regression gate phát hiện business DB operation mới dưới hai route tree nếu không đi qua boundary/handler compliant; allowlist phải hữu hạn, có lý do và test. | Must | M1-06 | CI/test fail khi thêm bypass fixture. |
| `RQ-08` | Có unit/route/security integration chứng minh anonymous/sai role/cross-CTV bị deny, CTV A không đọc/ghi dữ liệu CTV B, ADMIN behavior hợp lệ không đổi và L1+L2 đều thực sự được gọi. | Must | Launch gate | Không có test DB an toàn → `ENV_BLOCKED`, không được ghi PASS. |
| `RQ-09` | Full unit, integration security lane, typecheck, scoped lint và production build pass; diff không chứa schema/migration/dependency/secret hoặc source ngoài scope. | Must | Quality gate | Handoff không được READY_FOR_AUDIT. |

### 4.2 Scope boundaries

**In scope:**

- `app/api/admin/**/route.ts`, `app/api/ctv/**/route.ts` và shared handler chỉ phục vụ các route này.
- Boundary composition trong `src/shared/auth/**`, scope registry/builder hoặc scoped repository tối thiểu cần cho hai route tree.
- Focused unit/route/static/security integration tests và cấu hình test tối thiểu nếu cần đăng ký file test.
- `HANDOFF.md` do Tier 2 tạo sau khi implementation và evidence hoàn tất.

**Out of scope:**

- `app/api/public/**`, `worker/**`, `vendor/**`, `cron/**`, attendance/statements/staffing routes ngoài hai tree.
- Thay đổi schema/migration/dependency, RLS policy production, session token format hoặc UI.
- Refactor business service, đổi endpoint payload/status thành công, sửa finding MP-3C chưa được Planner resolve.
- Sửa/xóa `appBCC/**`, file scratch của sếp hoặc push/deploy.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** CTV self-scope khóa bằng `ctx.userId` ở cả filter và write data. CTV không nhận bank/ledger/source claim của actor khác. Admin user projection giữ đúng field hiện hữu; task không tự nới PII.
- **State:** Không đổi state machine. Withdrawal tạo mới vẫn `PENDING`; commission/application/assignment transition vẫn do service hiện hữu quyết định.
- **Permission/data scope:** Authentication 401 → role/action 403 → scoped object lookup 404. L1 và L2 là defense-in-depth; một lớp pass không được dùng để bỏ lớp còn lại.
- **Interface:** Giữ route, method, successful HTTP status, response keys, pagination và BigInt-as-string hiện hữu. Error được chuẩn hóa nhưng không được lộ SQL/model/internal scope predicate.
- **Failure/idempotency/concurrency:** Boundary throw phải rollback L2. Không retry mutation tự động. Existing idempotency/audit/outbox semantics phải giữ nguyên; hardening không được nhân đôi side effect.
- **Raw query:** `$queryRaw`/`$executeRaw` chỉ được dùng trong helper RLS/migration đã allowlist; route và service trong scope không được dùng để né Prisma scope.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-09` | TASK control + admin/CTV route inventory | Sau MP-3C ACCEPTED, ghi baseline SHA và inventory handler/query/model; xác nhận diff MP-3C sạch trước khi sửa. | MP-3C accepted commit | `git status`, `rg --files`, inventory test/script | MP-3C chưa ACCEPTED, file overlap chưa commit hoặc inventory mâu thuẫn EV-04. |
| `STEP-02` | `RQ-02`, `RQ-04` | `src/shared/auth/**` | Tạo/hoàn thiện boundary composition và operation-aware scope path; giữ deny-by-default, transaction-local GUC và rollback. | Existing L1/L2 helpers | Focused auth unit tests | Cần đổi schema/RLS policy hoặc create scope có thể ghi owner từ client. |
| `STEP-03` | `RQ-03`, `RQ-04`, `RQ-05` | `app/api/ctv/**` + required scopes/repos | Wire self-scoped read/write cho claims, withdrawals, summary/commission; không raw business query. | STEP-02 | CTV route/service tests | Bất kỳ CTV A nào thấy/ghi row CTV B hoặc response drift. |
| `STEP-04` | `RQ-03`, `RQ-05` | `app/api/admin/**` + shared handlers | Wire canonical boundary cho admin users, commission và Marketplace admin routes; preserve role matrix và MP-3 semantics. | STEP-02 + MP-3C baseline | Admin/Marketplace route regression | Tier 2 phải sửa nghiệp vụ MP-3 hoặc nới role để làm test pass. |
| `STEP-05` | `RQ-06` | DTO/error/log paths trong scope | Giữ projection/BigInt serialization; chuẩn hóa error không lộ PII/internal. | STEP-03/04 | Contract + log spy tests | Successful API contract đổi ngoài hardening. |
| `STEP-06` | `RQ-01`, `RQ-07` | Focused static architecture test | Gate toàn bộ two-tree inventory, delegate và allowlist; negative fixture chứng minh bypass bị bắt. | Completed wiring | Static test exit 0 and mutation fixture fails gate | Allowlist glob/broad exception hoặc gate chỉ grep import mà bỏ query trong service. |
| `STEP-07` | `RQ-08` | Safe `DATABASE_URL_TEST` security suite | Role/self/cross-scope matrix và L1+L2 evidence trên DB test riêng; cleanup fixture. | Provisioned safe test DB | Guarded LIVE integration command | URL là dev/prod, role/fixture thiếu hoặc test skip/ENV bị ghi thành PASS. |
| `STEP-08` | `RQ-08`, `RQ-09` | Regression/quality/HANDOFF | Chạy focused + full gates; Tier 2 ghi outputs thật vào HANDOFF, không tự audit. | All steps | unit, integration, typecheck, lint, build, task/handoff verifier | Bất kỳ gate fail, secret/unrelated diff hoặc evidence thiếu. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | 100% route/shared handler trong `admin/**` và `ctv/**` được inventory; mọi item là `NO_DB`, `SCOPED_DB` hoặc ngoại lệ định danh có lý do. | Static inventory test + file list | Bảng count/path và test output | Yes |
| `AC-02` | `RQ-02` | Test chứng minh một request compliant áp AuthContext, L1 predicate/scoped repo và L2 GUC trong đúng transaction; callback throw rollback. | Auth helper unit/integration | Call-order + rollback assertions | Yes |
| `AC-03` | `RQ-03` | Không còn business model operation trên raw client ngoài boundary ở hai route tree; three P0 handlers EV-07 đã được đóng. | Architecture test + source review | Zero-bypass report | Yes |
| `AC-04` | `RQ-04` | Model/action được route dùng có explicit scope path; unknown non-root model/action fail closed; create/update không thể ghi owner khác `ctx`. | Scope/repository unit tests | Model/action matrix | Yes |
| `AC-05` | `RQ-05`, `RQ-08` | Anonymous=401, disallowed role=403; CTV A đọc/ghi self thành công nhưng không đọc/ghi CTV B; cross-scope lookup không xác nhận object tồn tại. | Route + LIVE security integration | HTTP/row-count matrix | Yes |
| `AC-06` | `RQ-05`, `RQ-09` | ADMIN, Marketplace queue/read/mutate và MP-3 assignment flows giữ nguyên role/action behavior sau hardening. | Existing + focused regression | PASS list, gồm MP-3 route suites | Yes |
| `AC-07` | `RQ-06` | Không response/log nào lộ token, bank data của actor khác, raw SQL/error hoặc field ngoài projection; money vẫn là string. | Contract tests + log spy | PASS assertions | Yes |
| `AC-08` | `RQ-07` | Static gate fail khi fixture thêm direct Prisma business query hoặc delegate tới handler không scoped; allowlist không dùng wildcard che route. | Mutation/negative architecture test | Expected failing fixture output + normal PASS | Yes |
| `AC-09` | `RQ-08` | LIVE lane chạy trên DB test riêng và chứng minh L2/RLS backstop; thiếu env được báo `ENV_BLOCKED`, không masquerade PASS. | Guarded integration preflight + suite | Masked host/role, exit code, test counts | Yes |
| `AC-10` | `RQ-09` | Unit, required integration, typecheck, scoped lint, build, TASK/HANDOFF verifier đều exit 0; diff không có schema/migration/dependency/secret/appBCC/unrelated file. | Repository commands + `git diff --stat` | Command/exit summary và scoped file list | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-06` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03`, `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-02`, `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-03`, `STEP-04` | `AC-05`, `AC-06` |
| `RQ-06` | `STEP-05` | `AC-07` |
| `RQ-07` | `STEP-06` | `AC-08` |
| `RQ-08` | `STEP-07`, `STEP-08` | `AC-05`, `AC-09` |
| `RQ-09` | `STEP-01`, `STEP-08` | `AC-06`, `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Scope extension inject sai shape cho Prisma mutation và làm hỏng create. | Dùng read-style `where` cho `create`. | DEC-03; operation-aware tests; scoped repository cho write. | Revert boundary wiring theo domain; giữ route cũ sau feature-off, không có migration. |
| `RISK-02` | Double wrapping transaction tạo GUC sai connection hoặc transaction lồng. | L1/L2 composition không giữ cùng client/tx. | Call-order + real RLS integration; một canonical boundary. | Revert helper and route commits; no data rollback required. |
| `RISK-03` | ADMIN/MP-3 regression do hardening làm đổi service contract. | Existing route test/build fail. | Preserve DTO/business services; stop condition STEP-04. | Revert admin slice độc lập; CTV slice có thể giữ nếu audit scope tách rõ. |
| `RISK-04` | CTV cross-tenant leak qua owner ID client gửi hoặc aggregate không scoped. | CTV A thấy row/count/balance B. | Server-derived `ctx.userId`, explicit builder/repo, LIVE two-actor test. | Disable affected route, revert slice, investigate before re-open. |
| `RISK-05` | Static gate tạo false confidence vì chỉ grep import. | Query chuyển sang shared service ngoài scan. | Inventory call path/delegate + negative fixture; audit reads service targets. | Mở rộng gate target, rerun Tier 3 audit. |
| `RISK-06` | Tier 2 ghi đè thay đổi MP-3C đang dở. | Execution bắt đầu trước accepted baseline. | DEC-10/STEP-01 hard stop. | Dừng, không reset; trả BLOCKED cho Planner. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. MP-3C dependency đã đóng tại `299614a`; contract đủ điều kiện thực thi. | — | — | No |

## 9. Planner Resolution

Chưa có audit. Dependency MP-3C đã `ACCEPTED` và được commit scoped tại `299614a`; inventory/control được refresh, không còn quyết định mở chặn implementation.

1. Tier 2 chạy `/code hrp-v5-m1-06a-admin-ctv-auth-scope`, chỉ sửa source/test trong scope và tạo `HANDOFF.md`.
2. Tier 3 chạy `/audit hrp-v5-m1-06a-admin-ctv-auth-scope round 1`, chỉ sửa `AUDIT.md`.
3. Tier 1 chạy `/resolve hrp-v5-m1-06a-admin-ctv-auth-scope` và không tự re-audit đại trà.

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-25` | Initial M1-06a admin/CTV auth-scope hardening contract. | MP-3C is active; contract prepared in advance per founder request. |
| `v1.0` | `2026-08-25` | Promoted to `READY_FOR_EXECUTION`; execution baseline set to `299614a`. | MP-3C accepted, audited and committed; dependency closed. |
