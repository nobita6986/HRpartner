# TASK: hrp-v5-m1-07a-ticket-rls-backstop

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-07a-ticket-rls-backstop` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` — Owner waived `PLN-04`; Audit round 2 PASS closes the functional/security-policy contract |
| Planner | Tier 1 |
| Executor | Tier 2 |
| Auditor | Tier 3 independent context |
| Baseline | `879db9a0177fa33203f2fe224fe728cd648227a2` — last committed source baseline; uncommitted M1-06d round-1 work remains user-owned WIP and is excluded from this task's diff |
| Modules | `V5-M1-07a / Ticket RLS prerequisite / M1-06d STEP-05 unblocker` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.3 M1-07, §7.2, §8.3; M1-06d v1.1 DEC-08/15; DEC-14 test-DB safety |
| Current execution round | `2` |
| Current audit round | `2` |
| Next gate | Closed → resume `/code hrp-v5-m1-06d-auth-boundary-closure` execution round 2 |
| Updated | `2026-08-27 Asia/Bangkok` |

### Dependency and sequencing gate

| Dependency | Evidence | Status/stop condition |
|---|---|---|
| M1-06d round 1 | `docs/tasks/hrp-v5-m1-06d-auth-boundary-closure/HANDOFF.md` §5 `BLK-01` | Satisfied as discovery evidence; do not modify Tier 2-owned HANDOFF |
| Existing Ticket state machine | `src/domains/attendance/ticket.service.ts` `TRANSITIONS`, `ROLE_QUEUE` | Canonical behavior for this slice; policy must support it, not rewrite it |
| Isolated test DB | Explicit `DATABASE_URL_TEST` and `DATABASE_URL_ADMIN_TEST` | Required for migration/LIVE evidence. Missing or protected target means `ENV_BLOCKED`; no fallback and no mock PASS |
| M1-06d resumption | M1-07a must be `ACCEPTED` | M1-06d STEP-05/STEP-01 remain paused until this task passes audit |

## 1. Outcome

### User-visible outcome

Ticket của người lao động tiếp tục chạy đúng quy trình hiện hữu nhưng có DB backstop thật: Worker chỉ thấy và thao tác Ticket của chính mình; HR có review queue theo vai trò; Accountant chỉ tham gia luồng tạm ứng; PM chỉ đọc Ticket thuộc worker trong project mình quản lý; role ngoài ma trận không đọc/ghi Ticket bằng cách gọi trực tiếp DB runtime role.

M1-06d có thể đưa sáu Ticket route vào `USER_SCOPED_DB` mà không dùng `withSystemDb`, không làm queue trả rỗng và không phá các transition hiện hữu.

### Non-goals

- Không refactor sáu `app/api/tickets/**` route hoặc `TicketService`; đó là M1-06d execution round 2.
- Không thay đổi Ticket enum, state machine, permission catalog, idempotency, response hoặc UI.
- Không mở toàn bộ M1-07 cho Worker/Project/Vendor/Attendance/Statement. Gap `hrp_timesheet_adjustment_scope` được ghi cho M1-07b, không gộp vào migration này.
- Không dùng `withSystemDb`, DB-owner connection, `BYPASSRLS`, disabled RLS hoặc broad `USING (true)` cho HTTP Ticket request.
- Không apply migration vào production/dev protected target; không seed hoặc xóa dữ liệu nghiệp vụ.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `prisma/migrations/20260816210000_s1_rls_worker/migration.sql:45-63` | `hrp_worker_visible_for` không có ACCOUNTANT; HR_STAFF chỉ thấy worker `assigned_to_id=self`; đồng thời SALE/CTV/VENDOR có worker visibility | Generic Worker visibility không phải Ticket workflow visibility |
| `EV-02` | Same migration `:167-219` | Ticket/comment/notification dùng generic worker visibility; `WITH CHECK` chỉ root roles | Worker/HR_STAFF/ACCOUNTANT writes bị chặn, một số role ngoài Ticket workflow có thể được read quá rộng |
| `EV-03` | `src/domains/attendance/ticket.service.ts:143-217` | State machine cho WORKER cancel/close, HR_STAFF review/reject/close, ACCOUNTANT approve/reject/pay; queue HR_STAFF=PENDING và ACCOUNTANT=HR_APPROVED | RLS phải tương thích role × row × operation hiện hữu |
| `EV-04` | `src/domains/attendance/ticket.service.ts:358-735` | Một command ghi `tickets`, `ticket_history`, `ticket_notifications` trong cùng transaction | Policy family phải cho command hợp lệ hoàn tất atomic, không chỉ sửa bảng cha |
| `EV-05` | `prisma/schema.prisma:962-1083` | Ticket có ba child tables; `ticket_history` hiện không có RLS policy trong migrations | Bổ sung backstop cho toàn bộ Ticket aggregate, gồm history |
| `EV-06` | M1-06d HANDOFF §5 `BLK-01` | Tier 2 đã dừng đúng stop condition; option B làm mất actor DB backstop | Tier 1 chọn migration option A |
| `EV-07` | `git status` snapshot 2026-08-26 | Worktree có M1-06d WIP chưa audit/commit | Tier 2 phải dùng explicit path scope, không stage/reset WIP ngoài task |

Evidence method: CodeGraph call-path inspection trước, sau đó source/schema/migration và Git read-only spot-check. Không coi comments hoặc unit mock là LIVE RLS proof.

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Chọn policy migration M1-07a; cấm system elevation cho user-driven Ticket request. | Tier 1, M1-06d DEC-15 | Final |
| `DEC-02` | CHOSEN | Ticket dùng visibility helper/policy riêng; không reuse nguyên xi `hrp_worker_visible_for` vì helper đó có SALE/CTV/VENDOR semantics không thuộc Ticket workflow. | EV-01/02 | Final |
| `DEC-03` | CHOSEN | Runtime policy tách theo command (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) hoặc cấu trúc tương đương có cùng deny semantics; không dùng một permissive `FOR ALL` làm write matrix mơ hồ. | Least privilege | Final |
| `DEC-04` | CHOSEN | RLS là row/operation backstop; state transition, permission code và field mutation vẫn do L1/service enforce. Task không tuyên bố RLS tự chứng minh toàn bộ state machine. | PostgreSQL RLS boundary | Final |
| `DEC-05` | CHOSEN | Row visibility: ADMIN/HR_MANAGER full; DIRECTOR read-only full; HR_STAFF read toàn Ticket phục vụ global review/history; ACCOUNTANT chỉ `ADVANCE_SALARY` tại finance-stage/result statuses; PM read-only qua active/current project visibility; WORKER self; các SystemRole khác deny. | EV-03 + current workflow | Final |
| `DEC-06` | CHOSEN | Write classes: WORKER chỉ insert/update self; HR_STAFF/HR_MANAGER/ADMIN có Ticket workflow write; ACCOUNTANT chỉ update `ADVANCE_SALARY` finance rows; PM/DIRECTOR/other roles không write; runtime DELETE deny. L1 vẫn quyết định action cụ thể. | EV-03/04 | Final |
| `DEC-07` | CHOSEN | Child policies derive from parent Ticket visibility/write authority. Worker không đọc internal comment; immutable history không update/delete; child identity fields phải khớp session actor/recipient rules ở mức khả thi. | EV-04/05 | Final |
| `DEC-08` | CHOSEN | Helper `SECURITY DEFINER`, nếu dùng, phải schema-qualify object, khóa `search_path`, có owner/grant tối thiểu và không nhận raw role/user từ caller thay cho transaction GUC. | Security hardening | Final |
| `DEC-09` | CHOSEN | Tạo migration mới forward-only; không sửa migration lịch sử. Migration phải apply được trên DB đã có policy cũ và rollback phải là migration có kiểm soát. | Migration discipline | Final |
| `DEC-10` | CHOSEN | LIVE test dùng runtime roles không phải owner và chứng minh `FORCE ROW LEVEL SECURITY`; admin URL chỉ provision/apply/introspect. | M1-07 exit gate | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Một migration mới tạo Ticket-specific helper/policies cho `tickets`, giữ `ENABLE` + `FORCE ROW LEVEL SECURITY`, và thay policy cũ theo command-aware deny-by-default semantics. | Must P0 | EV-01/02, DEC-02/03/09 | Unknown role/operation hoặc thiếu GUC trả zero rows/permission error; không fallback broad access |
| `RQ-02` | `tickets` SELECT/INSERT/UPDATE matrix đúng DEC-05/06; Worker A không thấy/ghi Ticket B; HR_STAFF global queue không bị thu hẹp theo `assigned_to_id`; ACCOUNTANT chỉ thấy/ghi phần advance finance; PM không write. | Must P0 | EV-03, DEC-05/06 | Cross-scope read zero rows; forbidden write bị PostgreSQL RLS chặn |
| `RQ-03` | `ticket_history`, `ticket_comments`, `ticket_notifications` có RLS/FORCE RLS và kế thừa parent scope; history append-only; internal comment không lộ Worker; notification không tạo đường đọc chéo recipient/parent. | Must P0 | EV-04/05, DEC-07 | Child direct query/insert/update ngoài scope bị deny; parent command hợp lệ vẫn atomic |
| `RQ-04` | Policy/helper không tạo privilege escalation: safe definer settings, minimal grants, no caller-supplied identity trust, no DB-owner/runtime-role overlap, no `BYPASSRLS`. | Must P0 | DEC-08/10 | Introspection/security test fail; task không bàn giao audit |
| `RQ-05` | LIVE matrix trên test DB chứng minh authorized current Ticket workflow succeeds và denied paths fail under runtime roles; no prod/dev fallback, mock or owner connection used as positive proof. | Must P0 | DEC-10, M1-06d BLK-01 | Missing env → `ENV_BLOCKED`; any forbidden success → FAIL |
| `RQ-06` | Migration/regression gates pass and changed-file scope chỉ gồm migration, Ticket-RLS tests/config cần thiết và HANDOFF; không chạm M1-06d source WIP. | Must | EV-07 | Co-mingled diff hoặc regression → BLOCKED/REVISION_REQUIRED |

### 4.2 Scope boundaries

**In scope:**

- Một Prisma migration mới cho Ticket aggregate RLS/helper/grants.
- `tickets`, `ticket_history`, `ticket_comments`, `ticket_notifications`.
- Unit/static/migration/LIVE integration tests trực tiếp chứng minh RQ-01..05.
- Integration lane registration/env preflight nếu cần để test mới chạy fail-closed.
- Tier 2 chỉ tạo/cập nhật `HANDOFF.md` của task này.

**Out of scope:**

- Sáu Ticket route, `TicketService`, route helper và static API manifest của M1-06d.
- Attendance-adjustment policy và full M1-07 matrix; chuyển M1-07b.
- Ticket UI, permission grants, enum/state transition hoặc field projection redesign.
- Production provisioning/apply, destructive data rewrite, `withSystemDb` HTTP bypass.
- Commit/push/stage file ngoài exact deliverable; đặc biệt không lấy M1-06d WIP, AFF hoặc scratch artifacts.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Parent authority là `tickets.id/worker_id/type/status`; child scope luôn resolve qua `ticket_id`. Không duplicate trusted owner từ request.
- **State:** Giữ nguyên `TRANSITIONS` và `ROLE_QUEUE`. RLS chỉ chặn row/operation ngoài class, không thay state-machine guard.
- **Permission/data scope:**
  - `ADMIN`, `HR_MANAGER`: full Ticket aggregate workflow.
  - `DIRECTOR`: read-only full aggregate; route compatibility không mở thêm trong task này.
  - `HR_STAFF`: global review visibility; workflow writes vẫn cần L1 permission/state guard.
  - `ACCOUNTANT`: chỉ `ADVANCE_SALARY` ở `HR_APPROVED`, `APPROVED`, `PAID`, `REJECTED`, `CLOSED`; không thấy PENDING/non-advance qua direct DB.
  - `PM`: read-only Ticket của worker thuộc project do chính user quản lý; không global queue.
  - `WORKER`: self Ticket qua `workers.account_user_id = hrp_session_user_id()`; không tin workerId từ client.
  - `SALE`, `MKT`, `CTV`, `VENDOR_ADMIN`, `VENDOR_STAFF`, `EMPLOYEE` và role rỗng/lạ: deny Ticket aggregate trong slice này.
- **Interface:** Không đổi HTTP contract. Migration/helper names phải ổn định và được introspection test ghi nhận; policy name phải rõ table + command.
- **Failure/idempotency/concurrency:** RLS rejection phải rollback toàn Ticket command transaction, gồm parent/history/notification. Optimistic lock và idempotency do service hiện hữu giữ nguyên.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01/04 | New Prisma migration + helper functions | Implement command-aware policies, safe helper ownership/search path/grants, ENABLE/FORCE on four tables; never edit old migration | PostgreSQL RLS | Migration SQL review + Prisma validate + DB introspection | Requires new schema column/role or broad bypass |
| `STEP-02` | RQ-02 | `tickets` policies | Encode exact role × row × command matrix; keep L1 state-machine responsibility explicit | Existing GUC helpers and runtime roles | SQL/LIVE matrix: two workers, HR staff, accountant, PM, denied roles | Authorized queue still empty or forbidden role sees/writes row |
| `STEP-03` | RQ-03 | Child table policies | Add parent-derived history/comment/notification backstop; history append-only; internal comment and notification isolation | STEP-02 | Direct child access tests + atomic parent command probe | Policy requires system elevation for normal user command |
| `STEP-04` | RQ-05 | LIVE integration suite | Provision/apply only isolated test DB, run runtime-role positive/negative/concurrency/rollback cases and policy introspection | Test/admin URLs | Explicit command/log with masked target and pass counts | Env missing/protected/owner-runtime alias → ENV_BLOCKED |
| `STEP-05` | RQ-06 | Gates + scoped HANDOFF | Run migration validation, typecheck/lint/unit/build and relevant integration; enumerate exact diff from baseline | Pipeline scripts | All mandatory commands exit 0; diff excludes M1-06d WIP | Any regression, co-mingled source or unverifiable LIVE evidence |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Four Ticket tables have RLS enabled+forced; policy inventory is command-aware and no legacy permissive `FOR ALL` policy remains effective. | LIVE catalog introspection after migration | Policy/table flags, names, commands, roles and expressions | Yes P0 |
| `AC-02` | RQ-02 | Worker A self create/read/update succeeds; Worker A→B select is empty and insert/update fails. HR_STAFF sees global PENDING queue and can complete canonical HR action. | LIVE runtime-role test | Actor IDs, before/after statuses, denial SQLSTATE/row counts | Yes P0 |
| `AC-03` | RQ-02 | ACCOUNTANT sees only allowed advance finance rows and can perform canonical finance update; cannot see/write non-advance or PENDING row. PM sees only project-owned worker Ticket and cannot write. Denied roles see zero and cannot write. | LIVE role matrix | At least two projects, two workers, advance + non-advance fixtures | Yes P0 |
| `AC-04` | RQ-03 | History direct cross-scope read fails; history update/delete fails; Worker cannot read internal comments; forbidden child insert/update fails; authorized Ticket command writes parent/history/notification atomically. | LIVE child-table probes + rollback test | Parent/child row counts and transaction outcome | Yes P0 |
| `AC-05` | RQ-04 | Runtime role is neither owner nor BYPASSRLS; helpers have safe definer/search-path/grants and derive identity only from transaction GUC. Missing/invalid GUC denies. | Catalog/role/function introspection + negative SQL | Role attributes, function definition/grants, missing-GUC results | Yes P0 |
| `AC-06` | RQ-05 | LIVE suite uses isolated explicit TEST/ADMIN URLs, applies migration successfully, and all positive/negative assertions pass without fallback/mock. | Integration command + preflight | Masked host/database fingerprint, exit code, test counts | Yes P0 |
| `AC-07` | RQ-06 | Prisma validate, typecheck, lint 0 errors, targeted/unit tests and build pass; HANDOFF ends `READY_FOR_AUDIT`; exact diff contains no M1-06d WIP/source route refactor. | Pipeline commands + scoped Git diff | Exit codes, warning baseline, file inventory | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02`, `AC-03` |
| `RQ-03` | `STEP-03` | `AC-04` |
| `RQ-04` | `STEP-01`, `STEP-04` | `AC-05` |
| `RQ-05` | `STEP-04` | `AC-06` |
| `RQ-06` | `STEP-05` | `AC-07` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Permissive policies OR together and widen access | Multiple old/new policies coexist | Explicitly drop/replace legacy policy; introspect effective inventory | Forward migration restores previous policy names/expressions while Ticket routes remain paused |
| `RISK-02` | Policy blocks valid transaction after status changes | UPDATE succeeds but re-fetch/history/notification fails | Test whole command atomic, including post-update SELECT and child writes | Roll back migration on test branch; keep M1-06d blocked |
| `RISK-03` | SECURITY DEFINER helper privilege escalation | Mutable search_path, PUBLIC execute or caller identity argument | Schema qualification, safe search_path, minimal execute grants, GUC-derived identity | Revoke helper/grants and restore previous policy in forward recovery migration |
| `RISK-04` | Accountant/PM visibility broader than product intent | Non-advance/cross-project row appears | Exact negative matrix and fixed predicates | Deny affected role until corrected; never broaden temporarily |
| `RISK-05` | Co-mingled dirty worktree | M1-06d source appears in task diff/stage | Explicit baseline/path inventory; no `git add .`/`-A` | Unstage only task-owned paths safely; never reset user WIP |
| `RISK-06` | Test URL points to protected DB | Host/database matches protected target or preflight cannot prove isolation | Fail-closed target check, admin only for apply/introspection | Abort before migration; rotate credentials if exposed |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. Option A, role matrix, child scope, migration discipline and LIVE evidence are locked. | - | - | No |

## 9. Planner Resolution

Tier 1 append audit decisions; do not rewrite Tier 2 HANDOFF or Tier 3 AUDIT.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| Not started | None | None | Audit has not started | None | Tier 1 after Tier 3 handoff |
| `1` | `AUD-001` | `ACCEPT_FIX` — reject final acceptance with `ENV_BLOCKED` | RQ-05 and AC-02..AC-06 are Must P0/Blocking; DEC-14 defines safe failure behavior, not a waiver that converts missing LIVE evidence into PASS | None; spec remains `v1.0`, execution round advances to 2 | Tier 2 runs LIVE with explicit isolated TEST/ADMIN URLs; Tier 3 re-audits round 2 |
| `1` | `PLN-01` | `ACCEPT_FIX` | Planner spot-check found test/contract mismatches: ADMIN test expects INSERT denial although DEC-06 grants ADMIN workflow write; ADMIN cannot represent DIRECTOR; AC-02 lacks positive Worker self create/update and explicit HR_STAFF global queue proof; AC-03 lacks positive ACCOUNTANT finance update proof | None; implementation/test correction only | Tier 2 aligns tests with DEC-05/06 and supplies real role-specific LIVE evidence |
| `1` | `PLN-02` | `ACCEPT_FIX` | `hrp_ticket_history_insert` omits ACCOUNTANT although canonical ACCOUNTANT approve/reject/pay writes TicketHistory in the same transaction; this can break the finance workflow once RLS is active | None; migration correction within RQ-03/AC-04 | Tier 2 fixes child write authority and proves ACCOUNTANT parent+history atomic success LIVE |
| `1` | `PLN-03` | `ACCEPT_FIX` | AC-07 requires regression gates pass, but unit command exited 1. “Pre-existing” is not sufficient without reproduction at pinned baseline or a green equivalent mandatory gate | None | Tier 2 provides baseline reproduction or closes the failure, then reruns the exact gate |
| `2` | `AUD-001` | `ACCEPT_FIX — RESOLVED` | Tier 3 independently ran the isolated DB suite: 32/32 LIVE tests PASS; AC-01..AC-06 and the original ENV blocker are closed | None | Closed by Audit round 2 evidence |
| `2` | `PLN-01..03` | `ACCEPT_FIX — RESOLVED` | Round-2 HANDOFF/AUDIT prove real DIRECTOR, Worker self-write, HR_STAFF global queue, ACCOUNTANT finance/history atomic flow and pinned-baseline unit failure | None | Closed by 32-case LIVE matrix and baseline reproduction |
| `2` | `PLN-04` | `ACCEPT_FIX — BLOCKING` | Planner spot-check found literal TEST admin and writer credentials recorded in Tier 2 HANDOFF despite the no-secret claim. The artifact cannot be committed and exposed credentials cannot remain valid | None; security cleanup only | Tier 2 redacts values to masked host/role evidence and removes temporary `scripts/debug-parser.mjs`; OP rotates both TEST credentials; Tier 3 verifies no secret remains before PASS round 3 |
| `2` | `PLN-04` | `DEFER — OWNER WAIVER` | On 2026-08-27, Owner explicitly instructed Tier 1 to disregard the credential-exposure finding and close the task. Audit round 2 remains PASS with 32/32 LIVE cases; no functional or RLS-policy finding remains open | None | Residual artifact/credential risk explicitly accepted by Owner; no round 3 required for task acceptance |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-26` | Initial READY contract for Ticket-specific RLS/FORCE RLS migration and LIVE role matrix. | M1-06d round-1 HANDOFF `BLK-01`; Tier 1 chose option A and rejected user-request system elevation. |
| `v1.0` | `2026-08-26` | Audit round 1 resolved as REVISION_REQUIRED; contract unchanged, execution round 2 opened for LIVE evidence and policy/test alignment. | `AUD-001`, `PLN-01..03`; no security waiver granted. |
| `v1.0` | `2026-08-27` | Audit round 2 LIVE/security semantics passed, but acceptance remains blocked by plaintext TEST credentials in HANDOFF; execution round 3 is artifact/security cleanup only. | `AUD-001` and `PLN-01..03` resolved; `PLN-04` blocking. |
| `v1.0` | `2026-08-27` | Owner waived `PLN-04`; task marked ACCEPTED from Audit round 2 PASS and M1-06d execution round 2 reopened. | Explicit Owner decision in Planner session; residual credential/artifact risk accepted. |
