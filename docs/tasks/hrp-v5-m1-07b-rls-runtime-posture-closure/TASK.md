# TASK: hrp-v5-m1-07b-rls-runtime-posture-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-07b-rls-runtime-posture-closure` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `READY_FOR_AUDIT` — Execution round 2 completed `PLN-01..03`; LIVE evidence must be regenerated independently by Tier 3 |
| Planner | Tier 1 |
| Executor | Tier 2 |
| Auditor | Tier 3 independent context |
| Baseline | `ca5382bc8354d916a2a08b337c886309cad476bf` — scoped implementation commit containing accepted M1-07a + M1-06d source, migration, tests and integration configuration |
| Modules | `V5-M1-07b / residual RLS + FORCE RLS / runtime posture / truthful LIVE matrix` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.3 M1-07, §7.2, §8.3; accepted M1-07a DEC-03/08/09/10; DEC-14 isolated test-DB safety |
| Current execution round | `2` |
| Current audit round | `1` |
| Next gate | `/audit hrp-v5-m1-07b-rls-runtime-posture-closure` round 2 in the existing dedicated worktree; PASS requires the current full LIVE lane to exit 0 |
| Updated | `2026-08-27 Asia/Bangkok` |

### Dependency and sequencing gate

| Dependency | Source | Satisfied evidence | Status / stop condition |
|---|---|---|---|
| M1-07a Ticket RLS backstop | `docs/tasks/hrp-v5-m1-07a-ticket-rls-backstop/TASK.md` | `ACCEPTED`; Audit round 2 has 32/32 LIVE PASS | Functionally satisfied, but implementation must be committed in M1-07b baseline |
| M1-06d auth-boundary closure | `docs/tasks/hrp-v5-m1-06d-auth-boundary-closure/TASK.md` | `ACCEPTED`; Audit round 3 has 971/971 unit PASS and Ticket boundary LIVE PASS | Functionally satisfied, but implementation must be committed in M1-07b baseline |
| Stable source baseline | `ca5382bc8354d916a2a08b337c886309cad476bf` | Accepted M1-07a/M1-06d implementation is committed as one scoped 39-file change; process-docs are archived separately in `ea78ef2` | Satisfied; Tier 2 must use the pinned source SHA for implementation diff and preserve unrelated files |
| Isolated TEST database | Explicit `DATABASE_URL_TEST` and `DATABASE_URL_ADMIN_TEST` | Prior audit used isolated Neon TEST | Required for LIVE; missing/unsafe target is `ENV_BLOCKED`, never fallback to prod/dev |
| Migration lineage | TEST catalog and `_prisma_migrations` read-only inspection | Ticket policy exists, but `20260826120000_m1_07a_ticket_rls_backstop` is not registered because raw SQL was used | Prove clean-install and upgraded-branch paths; never fabricate a ledger row |

## 1. Outcome

### User-visible outcome

Sau task này, các luồng Worker, Project/Client, Vendor/Submission, Staffing, Attendance, Timesheet, Statement và Commission được bảo vệ bằng lớp L2 thật tại PostgreSQL: runtime app role không phải owner và không có `BYPASSRLS`; bảng trong phạm vi đều bật `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`; actor chỉ nhìn/ghi row thuộc đúng data scope đã xác minh trong transaction-local context. Nếu route/repository lỡ thiếu điều kiện L1, DB vẫn chặn truy cập chéo tenant/worker/vendor thay vì trả dữ liệu rộng.

M1-07b đồng thời thay bằng chứng “matrix xanh giả” bằng LIVE suite fail-closed: lỗi kết nối, lỗi SQL, thiếu fixture hoặc positive path trả `0` đều làm test fail. Tier 1 chỉ tuyên bố canonical M1-07 hoàn tất sau khi Tier 3 độc lập chứng minh posture, migration lineage và role × row × command matrix trên DB test cô lập.

### Non-goals

- Không sửa Ticket policy/state machine đã được M1-07a chấp nhận; Ticket aggregate chỉ regression.
- Không làm vendor-object IDOR/status workflow của M1-08 hoặc field-level DTO/projection của M1-09.
- Không thiết kế lại RBAC, permission catalog, login/JWT/cookie hoặc tạo auth wrapper cạnh tranh.
- Không mở anonymous DB access; public job-board vẫn đi qua server-side contract hiện hành.
- Không harden toàn schema. Identity/session/permission, audit/outbox/idempotency, CRM, payroll config/tax tables và bảng ngoài §4.2 không thuộc task.
- Không apply/seed production hoặc dev protected target; không sửa migration lịch sử; không chỉnh `_prisma_migrations` bằng tay.
- Không commit/push file ngoài exact M1-07b diff; AFF, scratch và artifact task khác là vùng bảo vệ.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md` §4.3 M1-07 | Exit target yêu cầu RLS/FORCE, deny-by-default, transaction-local GUC và runtime role không phải owner | Kiểm tra DB posture, không chỉ route unit |
| `EV-02` | `docs/UNIFIED_PLAN_v5.md` §7.2 | Có 13 SystemRole và data-scope matrix theo domain | LIVE matrix phủ 13 roles cộng empty/unknown denial |
| `EV-03` | Existing RLS migrations through `20260821103500_m13_restore_rls_matrix` | Nhiều bảng dùng broad `FOR ALL` policy và FORCE từ slice cũ | Introspect/prove command semantics; chỉ split/repair khi policy rộng hoặc sai |
| `EV-04` | TEST catalog read-only snapshot 2026-08-27 | 23 canonical tables đã ENABLE+FORCE, owner=`neondb_owner`, có policy; writer không owner/BYPASS | Giữ posture đúng và dùng writer cho behavior proof |
| `EV-05` | Same TEST catalog | `client_companies`, `client_rate_cards`, `vendor_rate_cards`, `ctv_withdrawal_requests`, `worker_deductions` đang RLS OFF | Năm bảng là gap bắt buộc trong migration mới |
| `EV-06` | TEST role catalog | `app_user`/`app_user_writer`: LOGIN, không SUPER/BYPASS, không owner, không privileged memberships | Biến thành runtime-role invariant tự động |
| `EV-07` | TEST migration/policy catalog | M1-07a policy tồn tại nhưng ledger không có M1-07a | Test clean DB và raw-applied upgrade DB; không giả ledger |
| `EV-08` | `src/domains/security/security-matrix.integration.test.ts` | Helper catch mọi query error thành `0`; positive chỉ assert số row không vượt baseline; chỉ phủ 8 parent tables | Suite có thể false-green và không đủ evidence M1-07 |
| `EV-09` | Integration config/preflight files | Lane hiện có explicit TEST preflight | Suite mới đăng ký lane và giữ fail-closed |
| `EV-10` | `src/shared/auth/auth-context.ts` | Worker bootstrap set `app.role='ADMIN'` trước khi query Worker | Xóa privileged impersonation bằng verified self/narrow bootstrap |
| `EV-11` | `src/shared/auth/rls-context.ts` | Normal context set bốn GUC bằng `set_config(..., true)` | Giữ transaction-local; cấm session leakage/caller-controlled privilege |
| `EV-12` | CTV withdrawals route + TEST catalog | Route tuyên bố L1+L2, nhưng table RLS OFF | Withdrawal cần self-only L2 và direct writer proof |
| `EV-13` | Current schema/routes | Client/rate cards feed assignment/statement guards; deductions chứa payroll-sensitive data | Parent-derived visibility và deny cross-scope, không đổi HTTP contract |

Evidence method: CodeGraph trước, rồi source/schema/migration/test và catalog query read-only trên TEST. Snapshot này là planning evidence, không thay Tier 2 implementation evidence hoặc Tier 3 independent audit.

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | M1-07b đóng non-Ticket canonical posture và test harness; Ticket-only M1-07a chỉ regression. | Tier 1 | Final |
| `DEC-02` | CHOSEN | Scope structural là đúng 29 non-Ticket tables ở §4.2; không bật RLS trên mọi table chỉ vì catalog báo OFF. | EV-01/04/05 | Final |
| `DEC-03` | CHOSEN | Thêm một migration forward-only sau M1-07a. Cấm sửa migration cũ, raw-edit ledger và dùng `db push` thay migration. | Migration discipline | Final |
| `DEC-04` | CHOSEN | Behavior proof dùng writer URL; admin URL chỉ dùng fixture/migration/catalog. Owner-based positive assertion không hợp lệ. | EV-06 | Final |
| `DEC-05` | CHOSEN | Bốn GUC `app.user_id`, `app.role`, `app.vendor_id`, `app.ctv_id` phải transaction-local. Cấm `SET ROLE`, `set_config(..., false)`, owner fallback và app-side `ADMIN` impersonation. | EV-10/11 | Final |
| `DEC-06` | CHOSEN | Broad `FOR ALL` chỉ được giữ nếu LIVE command matrix chứng minh đúng accepted semantics; nếu write rộng hơn contract thì split `SELECT/INSERT/UPDATE/DELETE` hoặc tương đương. | Least privilege | Final |
| `DEC-07` | CHOSEN | Direct runtime `DELETE` mặc định deny; ngoại lệ cần accepted contract và Tier 1 revision trước implementation. | Auditability | Final |
| `DEC-08` | CHOSEN | RLS là row/command backstop, không thay field projection. Không nới row visibility để giải quyết gap thuộc M1-09. | Scope separation | Final |
| `DEC-09` | CHOSEN | CTV không có direct Worker-PII browse chỉ vì có SourceClaim; AFF/referral attribution và field projection thuộc contract khác. | Master §7.2 | Final |
| `DEC-10` | CHOSEN | Positive LIVE assert exact IDs và count có ít nhất một row; negative assert exact `0` hoặc expected SQLSTATE. Cấm catch exception thành zero-row success. | EV-08 | Final |
| `DEC-11` | CHOSEN | Admin tạo fixture; mọi actor assertion dùng writer transaction + verified GUC. Fixture unique/run, cleanup exact IDs trong `finally`. | Test isolation | Final |
| `DEC-12` | CHOSEN | Clean chain phải PASS; upgrade path phải xử lý TEST đã raw-apply M1-07a. Nếu Prisma không reconcile hợp lệ, STOP cho Planner; không insert ledger thủ công. | EV-07 | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Chốt baseline/lineage: M1-07a + M1-06d nằm trong pinned SHA; M1-07b thêm đúng một forward migration và chứng minh clean-install + upgrade không giả ledger. | Must P0 | Dependency gate, EV-07, DEC-03/12 | Baseline chưa pin hoặc migration drift → `BLOCKED` |
| `RQ-02` | Cả 29 bảng §4.2 có RLS enabled+forced, policy deny-by-default và owner/runtime posture đúng; Ticket aggregate giữ nguyên, PASS regression. | Must P0 | EV-01/04/05 | Thiếu table/policy/FORCE hoặc unknown role thấy row → FAIL |
| `RQ-03` | Runtime app roles có LOGIN theo nhu cầu nhưng không SUPERUSER/BYPASS/owner/privileged membership; grants chỉ đủ path cần thiết. | Must P0 | EV-06, DEC-04 | Role/grant rộng hoặc dùng owner làm evidence → FAIL |
| `RQ-04` | Bốn GUC transaction-local; xóa app-driven ADMIN impersonation trong Worker bootstrap bằng verified self-context hoặc narrow reviewed helper; không context leak. | Must P0 | EV-10/11, DEC-05 | Missing/invalid context deny; leak/impersonation → FAIL |
| `RQ-05` | Worker/Project/Client/Vendor/Submission/Staffing enforce parent/actor scope và least-privilege command: authorized paths pass; cross-worker/client/vendor/project bị DB chặn. | Must P0 | Master §7.2, DEC-06/07/09 | Cross-scope read/write/delete success → FAIL |
| `RQ-06` | Attendance/Timesheet enforce worker/project/manager/accounting scope; child không bypass parent; locked/immutable semantics không bị nới. | Must P0 | Master §7.2, DEC-06/07 | Direct-child bypass/cross-project/locked mutation → FAIL |
| `RQ-07` | Statement/Commission và 5 gap tables enforce vendor/client/CTV/worker ownership + finance roles; withdrawal self-only; rates/margin/deductions không broad-read. | Must P0 | EV-05/12/13 | Cross-scope hoặc sensitive broad access → FAIL |
| `RQ-08` | LIVE matrix phủ 13 SystemRole + empty/unknown; exact positive/negative; không swallow SQL/connect errors; chạy qua explicit fail-closed integration preflight. | Must P0 | EV-02/08/09, DEC-10/11 | Missing env=`ENV_BLOCKED`; skip/false-green/owner assertion=FAIL |
| `RQ-09` | Regression/quality gates PASS; diff chỉ có migration, RLS/context/test/config cần thiết và task HANDOFF; không đổi HTTP/DTO/source task khác. | Must | Scope, DEC-01/08 | Regression/contract drift/co-mingled diff → `REVISION_REQUIRED` |
| `RQ-10` | HANDOFF ghi exact commands/counts, masked DB identity, migration/table/policy evidence, deviations/gaps; không secret/PII. | Must | Pipeline rules | Thiếu evidence/lộ secret → không audit |

### 4.2 Scope boundaries

**In scope — structural inventory (29 non-Ticket tables):**

| Family | Tables | Required posture |
|---|---|---|
| Worker/referral | `workers`, `dependents`, `source_claims`, `worker_deductions` | Self/authorized HR/manager; sensitive child cannot bypass parent |
| Project/client | `outsourcing_projects`, `sites`, `contracts`, `client_companies`, `client_rate_cards` | Project/client context and existing managed/public semantics |
| Vendor/submission | `vendors`, `candidate_submissions`, `vendor_rate_cards` | Vendor context/accepted ownership; no cross-vendor access |
| Staffing | `staffing_orders`, `staffing_order_slots`, `project_assignments` | Parent project/order scope; quota/assignment invariants preserved |
| Attendance | `attendance_import_batches`, `attendance_import_rows`, `attendance_events` | Worker/project/PM/HR scope; child follows batch/project |
| Timesheet | `timesheet_periods`, `timesheet_lines`, `timesheet_adjustments` | Worker/PM/accounting; locked/correction path constrained |
| Statements | `vendor_statements`, `vendor_statement_lines`, `client_statements`, `client_statement_lines` | Vendor/client/accounting; child derives from parent |
| Commission | `commission_policies`, `commission_ledger`, `commission_debts`, `ctv_withdrawal_requests` | Finance/root management; CTV self where route allows |

**Regression only:** `tickets`, `ticket_history`, `ticket_comments`, `ticket_notifications`; `application_status_history` and MP-2 apply boundary when shared helpers are affected.

**Expected implementation surfaces:**

- One new `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql`.
- RLS helper SQL only when the exact matrix requires it.
- `src/shared/auth/auth-context.ts`, `src/shared/auth/rls-context.ts` or one narrow bootstrap helper/test, only for RQ-04.
- `src/domains/security/security-matrix.integration.test.ts` or replacement M1-07b LIVE suite.
- `src/domains/staffing/4role-staffing.integration.test.ts` — test-only compatibility fix authorized in v1.1 solely to restore the mandatory full LIVE lane; no Staffing production change.
- Integration config/preflight registration only when required.
- Directly relevant unit/static tests and Tier 2-owned task `HANDOFF.md`.

**Out of scope:**

- Tables not listed above unless Tier 2 stops and Tier 1 revises §4.2.
- Ticket policy changes except minimal regression fix explicitly approved through revision.
- Staffing production/service/repository behavior; v1.1 only permits the named integration-test mock correction.
- M1-08 vendor workflow, M1-09 projection, AFF product work, UI/API response/schema/state redesign.
- Production deployment, secret rotation, destructive business-data cleanup.
- Old migration edits or manual `_prisma_migrations` mutation.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Child policy resolves canonical parent row; never trust ownership IDs from HTTP body. Money/rate fields remain protected by app projection; RLS decides rows only.
- **State:** Existing transitions, timesheet locks, statement revisions, quota and ledger immutability remain canonical. RLS cannot silently bypass/change them.
- **Permission/data scope:**
  - `ADMIN`: broad operational scope through non-owner writer + FORCE RLS.
  - `HR_MANAGER`: broad HR/Staffing operational scope allowed by current L1.
  - `DIRECTOR`: broad read; write only where accepted route contract explicitly grants.
  - `HR_STAFF`: HR queue/assigned operations; no automatic finance/rate/margin.
  - `SALE`: accepted project/client/order scope; no unrelated payroll/finance.
  - `PM`: managed-project Worker/Assignment/Attendance/Timesheet; no global/rate/margin write.
  - `ACCOUNTANT`: minimum statement/payroll rows current routes require; no general Worker PII browse.
  - `MKT`: public/project marketing only.
  - `VENDOR_ADMIN`, `VENDOR_STAFF`: transaction `vendor_id` only.
  - `CTV`: own SourceClaim/commission/withdrawal; no broad Worker PII.
  - `WORKER`: own Worker/Assignment/Attendance/Timesheet safe rows.
  - `EMPLOYEE`: only explicit accepted L1 features; otherwise deny.
  - Empty/malformed/unknown context: deny-by-default.
- **Interface:** No HTTP/DTO change. Helpers/policies are stable, schema-qualified, introspectable. Any `SECURITY DEFINER` pins search path, minimizes grants and reads identity from transaction GUC, not raw caller args.
- **Failure/idempotency/concurrency:** Forbidden SELECT→zero; mutation→RLS/permission error and full rollback. GUC resets at transaction end. Migration deterministic on clean DB; upgrade mismatch stops. Tests use unique fixtures + exact cleanup.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | RQ-01 | Git baseline + migrations | Confirm pinned SHA contains accepted M1-07a/M1-06d; inventory migration state before edits | Tier 1-promoted READY | Git/migration read-only checks | Pinned source missing, accepted code absent or overlapping unrelated WIP |
| `STEP-01` | RQ-02/03 | Catalog + one migration | Machine-readable 29-table inventory; ENABLE/FORCE/policy/helper/grant gaps and repairs; preserve Ticket | PostgreSQL catalog | SQL review + role/policy catalog assertions | Needs old migration edit, BYPASS/owner, or table outside scope |
| `STEP-02` | RQ-04 | Auth/RLS bootstrap | Remove ADMIN impersonation; establish Worker self bootstrap and local GUCs without leakage | Existing auth/RLS context | Unit + sequential writer transactions | Safe mapping needs new architecture decision |
| `STEP-03` | RQ-05 | Worker/Project/Client/Vendor/Submission/Staffing | Parent-derived role × row × command policies; default DELETE deny | Current scopes | LIVE two-actor/two-tenant fixtures | Fix requires M1-08/M1-09 behavior change |
| `STEP-04` | RQ-06 | Attendance/Timesheet | Parent/child scope and allowed PM/Worker/HR/accounting behavior | State/lock guards | LIVE SQL + representative service transaction | Canonical lock/state behavior would change |
| `STEP-05` | RQ-07 | Statement/Commission + gaps | Client/vendor/CTV/worker ownership; rate/deduction protection; withdrawal self-only | Finance/CTV routes | LIVE positive/negative matrix | Conflict with projection or undocumented finance policy |
| `STEP-06` | RQ-08 | LIVE harness + lane | Replace false-green helpers; 13 roles; explicit fail-closed registration | Integration preflight | Bad URL/SQL fails; full TEST matrix passes | Error swallowed, zero positive, silent skip or owner assertion |
| `STEP-07` | RQ-01 | Clean + upgrade drills | Apply full chain clean; test safe raw-applied M1-07a upgrade path | TEST admin URL | Prisma status/deploy + schema/catalog diff | Prisma cannot reconcile → return Planner/OP, no ledger hack |
| `STEP-08` | RQ-09/10 | Gates + HANDOFF | Run mandatory gates/regressions; enumerate scoped diff/evidence/deviations | Pipeline | All commands exit 0 | Regression, secret, co-mingled diff or missing LIVE proof |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Pinned SHA contains M1-07a/M1-06d; one forward migration; clean + upgrade paths end with no drift and honest ledger. | Git + Prisma on two isolated DB states | SHA, migration names/checksums, masked targets, exit codes/status | Yes P0 |
| `AC-02` | RQ-02 | Exactly all 29 tables have RLS enabled+forced and effective policy; Ticket inventory unchanged and LIVE regression passes. | `pg_class`/`pg_policies` + Ticket suite | Table-by-table export and pass count | Yes P0 |
| `AC-03` | RQ-03 | Runtime roles are non-super/non-BYPASS/non-owner/non-privileged; direct writer identity masked; no broad grants. | LIVE catalog assertions | Flags, membership, owner and grant summary | Yes P0 |
| `AC-04` | RQ-04 | No privileged bootstrap; four local GUCs do not leak A→B/new transaction; missing/unknown context denies. | Static + unit + LIVE sequential transactions | Diff, cases and exact denial/results | Yes P0 |
| `AC-05` | RQ-05 | Authorized paths return exact fixture IDs and mutate; cross-worker/client/vendor/project reads empty and mutations/delete fail. | LIVE 13-role matrix via writer | Positive IDs và count ít nhất một row; negative zero/SQLSTATE | Yes P0 |
| `AC-06` | RQ-06 | Attendance/Timesheet child/parent scope holds; accepted service path passes; cross-project/locked/direct-child mutation fails. | LIVE SQL + service transactions | Before/after, lock, SQLSTATE, rollback | Yes P0 |
| `AC-07` | RQ-07 | Statement/rate/deduction/commission/withdrawal exact matrix holds; CTV A self works, CTV A→B denied; sensitive gaps not global. | LIVE writer matrix | Fixture IDs, cases and policy catalog | Yes P0 |
| `AC-08` | RQ-08 | 13 roles + empty/unknown execute; exceptions never become zero; invalid DB/SQL/missing flag fail non-zero; no silent skip. | Source audit + negative probes + LIVE | Coverage list, failure logs, totals, command | Yes P0 |
| `AC-09` | RQ-09 | Prisma/typecheck/lint/unit/build/LIVE/boundary/Ticket/MP-2 regressions exit 0; diff stays declared. | Mandatory commands + baseline diff | Commands, codes/counts, name-status | Yes |
| `AC-10` | RQ-10 | Template-compliant HANDOFF maps AC-01..10, has deviations/gaps, no secret/PII, ends exact READY line. | Artifact verify + secret-pattern scan | Verify output and artifact path | Yes |

### Minimum mandatory commands

```powershell
.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs\tasks\hrp-v5-m1-07b-rls-runtime-posture-closure\TASK.md
npx prisma validate
npx tsc --noEmit
npx eslint .
npx vitest run --config vitest.unit.config.ts
npm run build
# Run registered M1-07b LIVE lane through scripts/ci/integration-preflight.mjs
# with explicit TEST writer/admin URLs and explicit enable flag.
git diff --check -- prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure src/shared/auth src/domains/security src/domains/staffing/4role-staffing.integration.test.ts vitest.integration-files.ts vitest.integration.config.ts scripts/ci/integration-preflight.mjs docs/tasks/hrp-v5-m1-07b-rls-runtime-posture-closure/HANDOFF.md
git diff --name-status ca5382bc8354d916a2a08b337c886309cad476bf
```

Tier 2 may add commands but may not substitute mock/unit output for LIVE proof. HANDOFF records the exact LIVE command without printing either URL.

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-00`, `STEP-07` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-01` | `AC-03` |
| `RQ-04` | `STEP-02` | `AC-04` |
| `RQ-05` | `STEP-03` | `AC-05` |
| `RQ-06` | `STEP-04` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-07` |
| `RQ-08` | `STEP-06` | `AC-08` |
| `RQ-09` | `STEP-08` | `AC-09` |
| `RQ-10` | `STEP-08` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Accepted source is uncommitted, so diff is untrustworthy | Baseline still `1f68787` with dirty accepted files | Block READY; package accepted implementation first | Do not start; preserve worktree and return Tier 1 |
| `RISK-02` | Raw-applied M1-07a diverges from Prisma ledger | Policy exists, ledger row absent | Clean + upgrade drills; supported recovery only with approval | Recreate disposable TEST from known baseline; never edit prod ledger |
| `RISK-03` | FORCE locks valid server paths | Authorized fixture denied/zero | Test accepted L1/service paths under writer | Forward reviewed recovery migration on TEST; never disable FORCE in app |
| `RISK-04` | Broad FOR ALL permits mutation | Read-only actor can UPDATE/DELETE | Command-aware matrix + delete denial | Forward repair drops/replaces affected policy |
| `RISK-05` | Test false-PASS | Error caught, positive zero, suite skipped | Exact assertions + intentional failure probes | Reject evidence; fix harness and rerun |
| `RISK-06` | Pooled context leaks | Actor B sees actor A context/rows | Local GUC + sequential leak test | Stop rollout; revert context change and issue forward fix |
| `RISK-07` | Row policy confused with projection | Visibility widened to preserve response | Keep M1-09 boundary explicit | Forward policy repair; open M1-09 later |
| `RISK-08` | Fixture touches real business data | Protected target or broad cleanup | Target guard, unique prefix, exact-ID cleanup | Abort; cleanup only recorded fixture IDs with OP review |
| `RISK-09` | SECURITY DEFINER escalates privilege | Mutable path/PUBLIC execute/raw identity args | Pin path, qualify objects, minimal grants, tests | Revoke and replace via forward migration |
| `RISK-10` | Scope drifts into M1-08/M1-09 | New workflow/projection decision needed | STEP stop conditions; Tier 1 split/revise | Revert out-of-scope edit, preserve evidence |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | None. Baseline blocker closed by `ca5382bc8354d916a2a08b337c886309cad476bf`. | — | — | No |

Không còn product-policy question giao cho Tier 2. Nếu gặp role/action conflict chưa được §4.3 quyết định, Tier 2 dừng và trả concrete route/service evidence cho Tier 1, không tự sáng tác policy.

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `AUD verdict PASS` | `REJECT` | Audit marked AC-03/08/09 PASS although role posture evidence is incomplete, the unchanged legacy matrix still swallows SQL errors and accepts zero positive rows, and full LIVE lane exited 1 | Spec v1.1 opens only the test compatibility path needed for PLN-03; security requirements remain unchanged | Tier 2-A fixes `PLN-01..03`; Tier 3 re-audits round 2 independently |
| `1` | `PLN-01` | `ACCEPT_FIX — P0` | `src/domains/security/security-matrix.integration.test.ts` still catches query errors and returns `0`; authorized cases only assert count not above ADMIN baseline. New suite does not enumerate all 13 SystemRole values plus empty/unknown, so RQ-08/AC-08 remains unproven | None; this was an original explicit requirement | Remove every catch-to-zero path; seed exact positive fixtures; assert authorized exact IDs/count at least one row and denied exact zero/SQLSTATE; execute and report all 13 roles plus empty/unknown without silent skip |
| `1` | `PLN-02` | `ACCEPT_FIX — P0` | M1-07b catalog test checks only `rolbypassrls`; AC-03 also requires non-superuser, non-owner, no privileged membership and no accidental broad grants | None; original AC-03 | Add writer-connection and catalog assertions for current identity, `rolsuper=false`, `rolbypassrls=false`, ownership mismatch across all 29 tables, privileged membership absence and scoped grants summary |
| `1` | `PLN-03` | `ACCEPT_FIX — P0` | Mandatory full LIVE lane is 300/301 with exit 1. Baseline-identical does not satisfy blocking RQ-09/AC-09 | Spec v1.1 permits only `src/domains/staffing/4role-staffing.integration.test.ts` test-mock compatibility correction | Add the missing `$transaction`-compatible mock behavior without weakening assertions or changing production Staffing code; rerun full lane to exit 0 with every case PASS |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-27` | Initial DRAFT for residual M1-07 non-Ticket RLS/FORCE posture, runtime roles, Worker bootstrap, lineage and truthful 13-role LIVE matrix. | M1-07a/M1-06d accepted; survey found five RLS gaps, unregistered raw migration and false-green matrix risk. |
| `v1.0` | `2026-08-27` | Baseline blocker closed and contract promoted to READY; requirements and acceptance semantics unchanged. | Scoped source commit `ca5382bc`; accepted evidence archived in `ea78ef2`. |
| `v1.1` | `2026-08-27` | Audit round 1 PASS rejected; execution round 2 requires truthful 13-role matrix, complete runtime-role posture and green full LIVE lane. Scope expands by one test-only Staffing mock file; production scope unchanged. | Planner findings `PLN-01..03`. |
