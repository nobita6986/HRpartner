# TASK: hrp-v5-m1-06c-remaining-routes-auth-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06c-remaining-routes-auth-scope` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | `HEAD` (`15ca9d9`) — M1-06b chưa ACCEPTED; diff 06b có trong worktree nhưng chưa audit. Tier 2 cần verify 06b đã chạy trước khi code 06c. |
| BLK-SYNC | Tier 2: nếu M1-06b chưa ACCEPTED khi bắt đầu 06c, báo Tier 1 trước khi code. |
| Modules | `V5-M1-06 / RF-10c / Hardening-2` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.3 M1-06, §4.13, §7.2; `V5_READINESS_ASSESSMENT.md` RF-10 |
| Current execution round | `2` |
| Current audit round | `1` |
| Next gate | `ACCEPTED as enumerated M1-06c slice` → mandatory follow-up `M1-06d` → M1-06 exit review |
| Updated | `2026-08-26 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Toàn bộ route còn lại trong `app/api` (ngoài `admin`, `ctv`, `worker`, `workers`, `vendor`, `vendors`, `cron` đã đóng ở M1-06a/06b) được đưa qua auth boundary. Các route public (jobs, public apply) dùng `NO_DB` hoặc transaction-local context đúng. Mọi mutation đi qua `withAuthorizedDb`/`withDbContext` hoặc scoped repository. Static gate mở rộng phủ 100% route còn lại.

### Non-goals

- Không sửa `admin/ctv/worker/workers/vendor/vendors/cron` — đã đóng ở M1-06a/06b.
- Không viết lại auth/login/JWT (M1-01..03).
- Không schema/migration/dependency.
- Không deploy/push.
- Không sửa scratch hoặc artifact ngoài task.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/api/auth/login/route.ts` | Login dùng raw `prisma.user.findFirst` — không qua boundary. Có auth layer riêng (password verify). | Cần bọc trong `withDbContext` hoặc service-boundary; không phá auth flow. |
| `EV-02` | `app/api/statements/margin/route.ts` | `getAuthContext` nhưng dùng raw `prisma` cho `calculateMargin()` — không qua boundary. | Bọc trong `withAuthorizedDbReadOnly` với L1 scope. |
| `EV-03` | `app/api/projects/route.ts` + `[id]/route.ts` | Raw `prisma.project.findMany/create/update` — không scope, không boundary. | Cần L1 builder (project scope) + L2. |
| `EV-04` | `app/api/clients/route.ts` + `[id]/route.ts` | Raw `prisma.clientCompany.findMany/create/update` — không scope. | Cần L1 builder (client scope) + L2. |
| `EV-05` | `app/api/payroll/route.ts` | Raw `prisma.payrollConfig.findMany` — không scope. | Bọc trong `withAuthorizedDbReadOnly` với role filter. |
| `EV-06` | `app/api/jobs/route.ts`, `[slug]/route.ts` | Public route, raw `prisma.$transaction` — intent là NO_DB hoặc public context. | Giữ nguyên public intent; nếu dùng Prisma phải qua system/transaction context rõ ràng. |
| `EV-07` | `app/api/public/jobs/[slug]/applications/route.ts` | Public POST, raw `prisma.$transaction` — intent là SYSTEM (SECURITY DEFINER RPC). | Giữ nguyên SECURITY DEFINER; thêm boundary nếu dùng Prisma trực tiếp. |
| `EV-08` | `app/api/push/subscribe/route.ts` | `getAuthContext` nhưng raw `prisma.pushSubscription.upsert` — không scope. | Bọc trong `withDbContext`. |
| `EV-09` | `src/shared/auth/api-boundary.static.test.ts` | Static gate hiện chỉ quét 7 dir: `admin, ctv, worker, workers, vendor, vendors, cron`. | Phải mở rộng SCOPE_DIRS thêm: `auth, statements, projects, clients, payroll, jobs, public, push`. |
| `EV-10` | M1-06a/06b HANDOFF/AUDIT | 16 route đã đóng ở M1-06a (admin/ctv) và M1-06b (worker/workers/vendor/vendors/cron). Còn ~15 route cần boundary. | Scope M1-06c là phần còn lại. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | M1-06c scope = route dir còn lại: `auth`, `statements` (margin), `projects`, `clients`, `payroll`, `jobs`, `public`, `push`. Static gate mở rộng SCOPE_DIRS. | EV-09 | Final |
| `DEC-02` | CHOSEN | Auth routes: login/logout không qua business boundary (chúng là auth entry-point); logout chỉ clear cookie → NO_DB. Login có thể dùng `withDbContext` cho read transaction. | EV-01 | Final |
| `DEC-03` | CHOSEN | Public routes (jobs, public) giữ nguyên NO_DB hoặc SECURITY DEFINER context. Không đòi auth cho chúng. Nếu dùng Prisma trong route phải qua transaction rõ ràng. | EV-06/07 | Final |
| `DEC-04` | CHOSEN | `statements/margin` dùng `withAuthorizedDbReadOnly` với L1 role scope (ACCOUNTANT/ADMIN/DIRECTOR được đọc). | EV-02 | Final |
| `DEC-05` | CHOSEN | `projects` và `clients` dùng L1 builder (project/client scope) + L2 RLS. PM/HR/DIRECTOR có quyền tùy role matrix. | EV-03/04 | Final |
| `DEC-06` | CHOSEN | `payroll` route chỉ dùng cho ADMIN/DIRECTOR; bọc `withAuthorizedDbReadOnly` với role gate. | EV-05 | Final |
| `DEC-07` | CHOSEN | `push/subscribe` dùng `withDbContext` (upsert) với user scope. | EV-08 | Final |
| `DEC-08` | CHOSEN | Không tạo scope builder mới cho push subscription — dùng generic user scope hoặc inline narrow scope. | DEC-07 | Final |
| `DEC-09` | CHOSEN | Static gate mở rộng, negative fixtures thêm cho new bypass patterns. | EV-09 | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Static gate quét đủ 15 route còn lại và phân loại: `NO_DB`, `USER_SCOPED_DB`, `SYSTEM_SCOPED_DB` — không wildcard allowlist. | Must | EV-09 | Gate fail; HANDOFF không READY_FOR_AUDIT. |
| `RQ-02` | `statements/margin` dùng `withAuthorizedDbReadOnly` với L1 scope cho role phù hợp. Không raw Prisma trong route. | Must | EV-02 | PII/scope leak |
| `RQ-03` | `projects` list/create/update dùng L1 project scope builder + L2. PM/HR/DIRECTOR được phép tùy role matrix. | Must | EV-03 | Cross-project read/write |
| `RQ-04` | `clients` list/create/update dùng L1 client scope builder + L2. ADMIN/DIRECTOR được phép. | Must | EV-04 | Cross-client leak |
| `RQ-05` | `payroll` route dùng `withAuthorizedDbReadOnly` với role gate ADMIN/DIRECTOR. | Must | EV-05 | Unauthorized payroll config read |
| `RQ-06` | `push/subscribe` dùng `withDbContext` với user scope, upsert trên tx. | Must | EV-08 | No DB outside transaction |
| `RQ-07` | Public routes (jobs, public apply) giữ intent: NO_DB hoặc SECURITY DEFINER. Nếu dùng Prisma → transaction context rõ ràng. Không raw client ở route level. | Must | EV-06/07 | Public data leak |
| `RQ-08` | Static gate negative fixtures prove raw Prisma bypass bị bắt ở new scopes. | Must | DEC-09 | Gate có răng |
| `RQ-09` | Full quality gate: tsc 0, lint 0, build pass, unit tests pass, HANDOFF.md. | Must | Quality | No regression |

### 4.2 Scope boundaries

**In scope:**
- `app/api/auth/**` (login/logout — auth-layer boundary)
- `app/api/statements/margin/route.ts`
- `app/api/projects/**`
- `app/api/clients/**`
- `app/api/payroll/route.ts`
- `app/api/jobs/**` (public routes)
- `app/api/public/**`
- `app/api/push/subscribe/route.ts`
- `src/shared/auth/api-boundary.static.test.ts` (mở rộng SCOPE_DIRS)
- Unit tests mới

**Out of scope:**
- `app/api/admin/**`, `ctv/**`, `worker/**`, `workers/**`, `vendor/**`, `vendors/**`, `cron/**` — đã đóng
- Schema/migration/dependency/secret
- Scratch và artifact ngoài task

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Verify |
|---|---|---|---|---|
| `STEP-01` | `RQ-01, RQ-08` | `src/shared/auth/api-boundary.static.test.ts` | Mở rộng SCOPE_DIRS thêm 8 dir; thêm negative fixtures cho new bypass patterns. | Gate pass + negative caught |
| `STEP-02` | `RQ-02` | `app/api/statements/margin/route.ts` | Bọc trong `withAuthorizedDbReadOnly` với role scope. | Route test |
| `STEP-03` | `RQ-03` | `app/api/projects/route.ts`, `[id]/route.ts` | L1 project scope + L2. PM/HR/DIRECTOR passthrough; SALE/MKT deny. | Role matrix test |
| `STEP-04` | `RQ-04` | `app/api/clients/route.ts`, `[id]/route.ts` | L1 client scope + L2. ADMIN/DIRECTOR passthrough. | Role matrix test |
| `STEP-05` | `RQ-05` | `app/api/payroll/route.ts` | `withAuthorizedDbReadOnly` + ADMIN/DIRECTOR gate. | Route test |
| `STEP-06` | `RQ-06` | `app/api/push/subscribe/route.ts` | `withDbContext` với user scope. | Route test |
| `STEP-07` | `RQ-07` | `app/api/jobs/**`, `app/api/public/**` | Audit từng route: giữ NO_DB hoặc bọc transaction rõ ràng. Login/logout: auth-layer boundary. | Static gate pass |
| `STEP-08` | `RQ-09` | Regression + HANDOFF | tsc + lint + build + unit tests; tạo HANDOFF.md | Full quality gate |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Static gate phủ đủ 15 route + phân loại đúng; allowlist tường minh. | Static test | Path/count/classification | Yes |
| `AC-02` | `RQ-02` | statements/margin đi qua boundary; ACCOUNTANT/ADMIN/DIRECTOR nhận dữ liệu; unauthorized → 403. | Route test + role matrix | HTTP/field assertions | Yes |
| `AC-03` | `RQ-03` | projects L1+L2 đúng; PM/HR/DIRECTOR passthrough; SALE/MKT deny; cross-project → 404. | Role matrix test | HTTP/row counts | Yes |
| `AC-04` | `RQ-04` | clients L1+L2 đúng; ADMIN/DIRECTOR passthrough; cross-client → 404. | Role matrix test | HTTP/row counts | Yes |
| `AC-05` | `RQ-05` | payroll chỉ ADMIN/DIRECTOR; unauthorized → 403. | Route test | HTTP status | Yes |
| `AC-06` | `RQ-06` | push/subscribe đi qua `withDbContext`; user isolation. | Route test | HTTP status | Yes |
| `AC-07` | `RQ-07` | Public routes giữ intent; no raw Prisma at route level. | Static gate + audit | Gate pass | Yes |
| `AC-08` | `RQ-08` | Negative fixtures bắt bypass ở new scopes. | Static test | Expected mutation failures | Yes |
| `AC-09` | `RQ-09` | tsc 0, lint 0, build pass, unit pass, HANDOFF.md exists. | Repository commands | exit 0 + file | Yes |

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
| `RQ-08` | `STEP-01` | `AC-08` |
| `RQ-09` | `STEP-08` | `AC-09` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback |
|---|---|---|---|---|
| `RISK-01` | Project/client scope builder chưa tồn tại → Tier 2 phải tạo mới | Scope builder mới cần | Inline narrow scope tạm; Planner quyết định có tạo builder mới không | Inline scope |
| `RISK-02` | Login route auth flow bị phá khi bọc boundary | Prisma transaction blocking | Login dùng `withDbContext` (L2-only) giữ nguyên password verify | Revert route |
| `RISK-03` | Public routes mất PUBLIC intent khi bọc boundary | Forced auth on public | Explicit NO_DB classification; SYSTEM for SECURITY DEFINER | Revert |
| `RISK-04` | Scope dir mới trong static gate làm gate fail false-positive | Overly broad classification | Negative fixtures + whitelist tường minh | Adjust SCOPE_DIRS |

## 8. Open Questions

| ID | Question | Owner | Blocks execution? |
|---|---|---|---|
| `OQ-01` | Cần tạo `ProjectScopeBuilder` / `ClientScopeBuilder` mới hay dùng inline narrow scope? | Tier 1 | Yes — dùng inline narrow scope tạm, builder mới là task sau |
| `OQ-02` | `statements/margin` L1 scope cần những role nào được đọc? | Tier 1 | Yes — ACCOUNTANT, ADMIN, DIRECTOR theo matrix §7.2 |
| `OQ-03` | `payroll` route chỉ ADMIN/DIRECTOR hay thêm role nào? | Tier 1 | Yes — ADMIN, DIRECTOR theo §7.2 |

## 9. Planner Resolution

**Resolver:** Tier 1 Agent
**Date:** `2026-08-25 16:29 +07:00`

| OQ | Decision | Rationale |
|---|---|---|
| `OQ-01` (Scope builder) | **Inline narrow scope** | Không tạo builder mới ở M1-06c — dùng inline narrow scope cho projects/clients. Builder chuẩn là task riêng nếu cần reuse. |
| `OQ-02` (statements/margin roles) | **ACCOUNTANT, ADMIN, DIRECTOR** | Theo visibility matrix §7.2 — chỉ 3 role được đọc payroll/statement config. |
| `OQ-03` (payroll roles) | **ADMIN, DIRECTOR** | Không mở cho ACCOUNTANT (read-only không phải role payroll). |

> **Status after resolution:** `READY_FOR_EXECUTION`

### Audit round 1 — Tier 1 Resolution (2026-08-26)

`verify-audit.ps1` trả `RESULT: PASS`. Tier 1 chấp nhận implementation của execution round 2 trong phạm vi tám route root được TASK liệt kê, nhưng không chấp nhận các tuyên bố rộng hơn evidence về việc toàn bộ `app/api` hoặc toàn M1-06 đã được đóng.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `AUD-001 / DEV-01` | `ACCEPT_FIX_WITH_FOLLOWUP` | `statements/margin` đã bỏ raw route query và chạy trong L2 transaction; role gate + domain permission check giữ slice an toàn. Tuy nhiên `ACCOUNTANT` không có L1 builder cho `ClientStatement`, nên không được kể là L1+L2 hoàn chỉnh. | Không sửa ngược contract v1.0. M1-06d phải quyết định builder/repository hoặc document invariant L2-only cho margin aggregate. | Tier 1 đóng deviation tại 06c; M1-06d chịu residual defense-in-depth gap. |
| `1` | `AUD-002 / DEV-02..04` | `ACCEPT_CONSERVATIVE_IMPLEMENTATION_WITH_FOLLOWUP` | Các route gate thu hẹp quyền nên không mở rộng data exposure và test của slice PASS. Tier 1 **không đồng ý** với nhận định audit rằng mọi role gate này đã khớp hoàn toàn §7.2: canonical matrix còn `SALE/MKT` cho CRM/public project, `HR_MANAGER` read payroll và `ACCOUNTANT` payroll; quyền theo method/action chưa được khóa đầy đủ. | Giữ code slice để tránh nới quyền trong round đã audit. M1-06d phải reconcile role × resource × action với §7.2 và owner decision trước khi mở lại quyền. | Tier 1 + owner trong M1-06d. |
| `1` | `AUD-003 / DEV-05` | `ACCEPT_FIX_WITH_FOLLOWUP` | Login là pre-auth nên không thể dùng user-scoped helper yêu cầu `AuthContext`. Transaction-local GUC và projection hẹp được audit PASS. Tuy nhiên raw `$transaction` không tự là security taxonomy/boundary chuẩn. | M1-06d phải phân loại `PREAUTH_DB`, khóa helper/allowlist và negative test fail-closed cho bootstrap login. | Tier 1 đóng deviation tại 06c; M1-06d chuẩn hóa boundary. |
| `1` | `PLN-01` | `ACCEPT_SLICE_ONLY` | Spot-check inventory ngày 26/08/2026: repo có `72` route files; static gate hiện phủ `52` files trong `15` roots; tám root thêm bởi 06c chứa `18` files, không phải `15`. Còn `20` files ở `attendance(6), debug(1), disputes(1), me(1), staffing(4), tickets(6), webhook(1)` chưa nằm trong static gate. | Outcome 06c được nghiệm thu theo enumerated roots, không phải “100% route còn lại”. Mở mandatory follow-up `hrp-v5-m1-06d-auth-boundary-closure`. | Tier 1 tạo contract M1-06d; chặn M1-06 exit gate. |
| `1` | `PLN-02` | `REJECT_CLOSURE_CLAIM` | Audit PASS chứng minh implementation của slice và full regression/LIVE lane, nhưng không chứng minh 20 route files ngoài gate hoặc canonical role reconciliation. | Không công nhận câu “mảnh ghép cuối cùng Hardening 1” và “Coverage Gaps: không có”. M1-06/Hardening-1 vẫn mở tới khi M1-06d ACCEPTED. | Tier 1 roadmap gate. |
| `1` | `FOUNDER-DIRECTION-01` | `ACCEPTED_WITH_MANDATORY_FOLLOWUP` | Sếp đã chỉ đạo không làm lại phần Tier 2 vừa hoàn thành; nghiệm thu 06c rồi tạo task riêng xử lý tồn đọng contract cũ. `AUDIT.md` PASS và không có P0/P1 implementation finding trong enumerated slice. | Status M1-06c → `ACCEPTED`; follow-up là bắt buộc, không phải optional tech debt. | Sếp/Tier 1; closure cuối tại M1-06d audit. |

> **Final Planner status:** `ACCEPTED` cho enumerated M1-06c slice. **M1-06 và Hardening-1 chưa đóng**; next gate là contract/audit của `hrp-v5-m1-06d-auth-boundary-closure`.

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-08-25` | Initial M1-06c: remaining routes boundary scope — auth, projects, clients, payroll, statements/margin, push, jobs/public | M1-06a/06b done; RF-10c slice 3 |
| `v1.0` | `2026-08-26` | Resolve audit round 1: ACCEPTED implementation cho tám root được liệt kê; chấp nhận DEV-01..05 có follow-up; bác tuyên bố 100% coverage/Hardening closure và bắt buộc mở M1-06d cho 20 route ngoài gate + role/helper reconciliation. | Audit PASS + Tier 1 inventory spot-check + founder direction. |
