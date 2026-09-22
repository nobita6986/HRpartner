# TASK — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Work type | `CODE` (contract authoring round hiện tại là documentation-only) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Forward-only migration thay SECURITY DEFINER RPC và backfill assignment hiện hữu tại data-integrity/attribution boundary. |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `origin/main@0fdc616b61de731ded8b9fa7337002dc0bb00721` |
| Approved design input | `076ed531e3f25bddd6c407ba826b5a04cc88bb30` — `AFF05A_RESIDUAL_RECONCILIATION.md` |
| In-scope roots | Exact File Allowlist tại §4.2 |
| Forbidden paths | Mọi file ngoài Exact File Allowlist; đặc biệt `PLANNER_HANDOVER.md`, AFF-04/T1B worktree, schema, RLS migration hiện hữu, commission/CRM/ER-003 |
| Required gates | Targeted two-connection DB test; `npm run test:integration`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `node_modules/.bin/prisma validate`; `VERIFY_TASK`; `VERIFY_HANDOFF`; Tier 3 LIGHT audit |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `T0_CONTRACT_AND_LEGACY_DATA_REVIEW`; T0 quyết định thứ tự thực thi, không mặc định phụ thuộc AFF-04 |

> Contract này chưa cho phép code, migrate, deploy hoặc production preflight có credential. Chỉ T0 mới chuyển sang `READY_FOR_EXECUTION` sau khi chốt open decision và baseline mới.

## 1. Outcome

### 1.1 User-visible outcome

- Initial affiliate handling bắt đầu từ public intake có deadline đúng 168 giờ tính từ cùng một server timestamp.
- Một submission mới cho LaborProfile đã có source/handler canonical vẫn được ghi nhận nhưng không thay attribution, không thay handler và không consume attribution mới ngoài ý muốn.
- Idempotent replay trả lại kết quả của lần đầu, không tạo thêm submission, attribution mutation hoặc handling assignment.
- Legacy `AFF_INITIAL` thiếu deadline được sửa bằng predicate hẹp từ `starts_at`; assignment quản lý không thời hạn và dữ liệu ngoài predicate không đổi.

### 1.2 Non-goals

- Không sửa UI, manager assignment duration, Company Pool, dispute, AFF-04 placement snapshot, AFF-05B commission, CRM hoặc ER-003.
- Không sửa `prisma/schema.prisma`, migration cũ, RLS policy hoặc public route/API response shape.
- Không dùng CCCD/PII thật, Evidence Gateway readiness hoặc production deployment làm blocker cho synthetic-data coding/testing.
- Không tự xử lý production anomaly ngoài predicate; phải dừng và báo T0.

## 2. Evidence

| ID | Evidence | Evidence level / why it matters |
|---|---|---|
| `EV-01` | `docs/discovery/realignment/AFF05A_RESIDUAL_RECONCILIATION.md:1-117` tại commit `076ed531e3f25bddd6c407ba826b5a04cc88bb30` | T0-approved design input; phân biệt delivered foundation và residual. |
| `EV-02` | `src/domains/talent/handling-assignment.service.ts:createInitialAffiliateAssignment:30-60` | Source evidence: TypeScript semantic hiện hữu là server now + 7 x 24 giờ; không chứng minh public RPC. |
| `EV-03` | `prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill/migration.sql:130-348` | Source evidence: latest canonical RPC; LPHA INSERT chưa ghi `expires_at`, và attribution mutation hiện xảy ra trước khi có same-LP serialization. |
| `EV-04` | `app/api/public/intake/route.ts:245-272` | Source evidence: route bọc invocation bằng `withIdempotency`; replay và new submission là hai contract khác nhau. |
| `EV-05` | `tests/db/aff03-public-intake.integration.test.ts:1-730` | Test exists: runtime-role/RPC integration hiện hữu; planning round này không chạy lại test. |
| `EV-06` | `docs/tasks/hrp-v6-w5-handling-assignment-safety/HANDOFF.md:48-61,126-136` và `AUDIT.md` | Historical executed evidence: W5 targeted tests/Tier 3 PASS và production migration/lifecycle smoke. Không chứng minh AFF-05A-R1 behavior. |
| `EV-07` | Pinned baseline không chứa artifact production preflight cho `AFF_INITIAL AND expires_at IS NULL` | Evidence gap: cardinality/status/anomaly distribution chưa biết; không được suy diễn production state. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Initial deadline là đúng 168 giờ: capture một `transaction_timestamp()` vào biến và dùng cùng giá trị cho `starts_at`; `expires_at = starts_at + interval '168 hours'`. Không nhận client clock. | `CHOSEN` |
| `DEC-02` | Same idempotency key + same payload là replay: trả stored result và không gọi RPC lần hai. Idempotency key mới là submission mới dù match cùng LaborProfile. | `CHOSEN` |
| `DEC-03` | Submission mới cho LaborProfile đã có canonical attribution hoặc active handling không được rebind/consume incoming attribution và không được replace/revoke handler; incoming attribution giữ nguyên trạng thái/binding. | `CHOSEN` |
| `DEC-04` | Serialize same-profile source/handling decision bằng row lock `SELECT ... FROM labor_profiles WHERE id = v_lp_id FOR UPDATE` trước attribution UPDATE/LPHA INSERT, rồi re-read canonical state trong cùng transaction. Unique constraints/partial unique index chỉ là backstop; check-before-insert đơn thuần không đủ. | `CHOSEN` |
| `DEC-05` | Concurrent first attribution trên cùng LaborProfile dùng first-committer-after-lock semantics: đúng một attribution được consumed/bound và tạo đúng một `AFF_INITIAL`; transaction còn lại tạo submission mới nhưng để attribution của nó unchanged. Không hứa winner theo client timestamp. | `CHOSEN` |
| `DEC-06` | Legacy backfill chỉ match `source='AFF_INITIAL' AND expires_at IS NULL AND starts_at IS NOT NULL`; set deadline từ `starts_at + interval '168 hours'`, không tính lại từ deploy time. | `CHOSEN_PENDING_T0_DATA_REVIEW` |
| `DEC-07` | Legacy row terminal (`EXPIRED/REVOKED/TRANSFERRED/COMPLETED` nếu có) giữ nguyên status/history và chỉ nhận deadline. Legacy `ACTIVE` có computed deadline <= một migration server snapshot chuyển tại chỗ sang `EXPIRED`; không delete/reinsert, không đổi assignee/source/previous link/reason/starts_at. | `CHOSEN_PENDING_T0_DATA_REVIEW` |
| `DEC-08` | Preserve exact RPC security posture: owner `hrp_public_rpc`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, signature/return shape, PUBLIC revoke, EXECUTE grants, temporary SET-role choreography và final SET/INHERIT cleanup. Không nới RLS/table grants. | `CHOSEN` |
| `DEC-09` | Implementation ordering là quyết định T0 sau contract review; AFF-04 không phải technical dependency mặc định. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Forward-only migration replace latest `hrp_public_intake_submission(jsonb)` body, giữ signature/return/security boundary và không sửa migration cũ. |
| `RQ-02` | New initial handling dùng một server timestamp cho `starts_at` và deadline đúng +168 giờ. |
| `RQ-03` | Replay không tạo side effect mới; new idempotency key tạo submission mới nhưng preserve canonical attribution/handler trên same LaborProfile. |
| `RQ-04` | Same-profile decision được serialize bằng DB row lock trước mutation; two-connection race có deterministic invariants và không dựa vào pre-check. |
| `RQ-05` | Trước apply, chạy read-only aggregate preflight cho toàn bộ `AFF_INITIAL AND expires_at IS NULL`: count theo status, overdue/not-yet-due theo `starts_at + 168h`, min/max starts_at và anomaly count; output không chứa PII. |
| `RQ-06` | Backfill predicate hẹp theo DEC-06/07; manager-assigned indefinite rows và mọi row ngoài predicate byte-for-byte/logically unchanged ở các field business. |
| `RQ-07` | Nếu preflight có `starts_at IS NULL`, future start ngoài clock-skew được T0 chấp nhận, unknown status, constraint/history inconsistency hoặc cardinality bất thường, dừng trước production apply và báo T0; không tự mở predicate. |
| `RQ-08` | Test chỉ dùng synthetic identities và dedicated PostgreSQL; không kết nối dev/prod fallback. |

### 4.2 Scope boundaries

**Exact File Allowlist cho implementation tương lai:**

1. `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql`
2. `tests/db/aff03-public-intake.integration.test.ts`
3. `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/**`

- **In:** one additive migration, existing canonical DB integration test, read-only aggregate preflight query/result under task-local evidence, TASK/HANDOFF/AUDIT.
- **Out:** mọi file khác; đặc biệt old migrations, `prisma/schema.prisma`, routes/services/UI, RLS policies, PLANNER_HANDOVER, AFF-04/T1B worktree, production apply/deploy.
- **Scope rule:** nếu implementation cần sửa route/idempotency helper hoặc test registration ngoài allowlist, dừng và trả Planner/T0; không tự mở scope.

### 4.3 Domain boundaries

- **Data/state:** một canonical attribution và tối đa một persisted active handling per LaborProfile. Repeat submission không phải source-transfer event. Expiry boundary là `expires_at <= server_snapshot`.
- **Permission/security:** function owner/definer/search_path/grants/membership cleanup phải giống latest RPC. Không grant PUBLIC mới, không nới table privilege hoặc RLS, không log payload/PII.
- **Interface/API:** giữ nguyên RPC signature, return table và public route status/body. `attribution_consumed=false` khi new submission preserves existing canonical source and leaves incoming attribution untouched.
- **Migration/rollback:** forward-only. Trước production apply: branch revert. Sau apply: không down-migrate hoặc sửa migration; cần compensating migration được review riêng. Row history đã backfill không được xóa để “rollback”.

### 4.4 Legacy data preflight and backfill

Read-only preflight phải chạy bằng role chỉ đọc trước apply và ghi aggregate evidence:

- tổng số row match `source='AFF_INITIAL' AND expires_at IS NULL`;
- breakdown theo status;
- count computed deadline `<= transaction_timestamp()` và `> transaction_timestamp()`;
- count `starts_at IS NULL`, future `starts_at`, duplicate/contradictory active history;
- min/max `starts_at` và computed deadline; không xuất ID, tên, phone, CCCD hoặc payload.

Backfill proposal:

1. Capture một migration timestamp.
2. Update deadline cho đúng predicate DEC-06 từ `starts_at`, không từ deploy time.
3. Trong cùng transaction, materialize `ACTIVE → EXPIRED` khi computed deadline <= migration timestamp.
4. Giữ nguyên terminal statuses và toàn bộ row identity/history links; không tạo replacement assignment.
5. Assert zero remaining safe-predicate NULL deadlines và assert control rows ngoài predicate không đổi.
6. Nếu preflight hoặc assertions không khớp assumptions, abort transaction và report T0.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | task evidence | Re-pin latest main, run aggregate read-only preflight, record source/test/historical production evidence separately. | `AC-01` | Stop nếu baseline/RPC đã đổi hoặc anomaly thuộc RQ-07 xuất hiện; báo T0. |
| `STEP-02` | exact migration file | Replace RPC with same-LP lock, same-timestamp 168h behavior, preserve-source branch; retain exact security choreography. | `AC-02`, `AC-03`, `AC-04` | Stop nếu cần route/schema/RLS change hoặc cannot preserve owner/grants. |
| `STEP-03` | same migration backfill | Apply narrow idempotent backfill and materialize overdue ACTIVE rows without history loss. | `AC-05`, `AC-06` | Stop nếu affected row count differs from approved preflight or outside-predicate row changes. |
| `STEP-04` | DB integration test | Cover fresh, replay, repeat, two-connection race, clean-chain and upgrade/backfill with synthetic data. | `AC-02`–`AC-07` | `ENV_BLOCKED` if dedicated PostgreSQL absent; never use dev/prod. |
| `STEP-05` | HANDOFF/AUDIT | Run gates, capture exact evidence, request Tier 3 LIGHT and resolve findings. | `AC-08` | No merge/deploy until LIGHT PASS and T0 go-live decision. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Read-only aggregate preflight identifies all legacy NULL-deadline AFF_INITIAL groups and anomalies without PII; T0 reviews data impact before apply. | Task-local SQL/evidence + reviewer sign-off; no migration execution required for contract review. |
| `AC-02` | Fresh valid attribution creates one submission, one consumed/bound attribution and one `AFF_INITIAL ACTIVE`; `starts_at` equals captured server timestamp and `expires_at - starts_at = interval '168 hours'`. | `node_modules/.bin/vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` with dedicated PostgreSQL. |
| `AC-03` | Same idempotency key/payload replay returns original result with unchanged submission/attribution/assignment counts; a new key creates a new submission for same LP while original attribution/handler remain unchanged and incoming attribution is not consumed. | `node_modules/.bin/vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts`; assert route/idempotency and RPC row counts. |
| `AC-04` | Two independent DB connections concurrently submit different active attributions for the same pre-existing LP: both submissions commit; exactly one attribution is consumed/bound, loser attribution remains unchanged, and exactly one active initial assignment exists. No uncaught unique error. | Barrier-controlled two-client PostgreSQL integration test with before/after row assertions. |
| `AC-05` | Upgrade fixture with NULL-deadline AFF_INITIAL rows receives deadlines from each `starts_at`; overdue ACTIVE becomes EXPIRED in place; non-overdue ACTIVE stays ACTIVE; terminal status/history IDs/links remain unchanged. | Upgrade/backfill integration fixture against migration SQL. |
| `AC-06` | Manager assignment with `expires_at IS NULL`, non-AFF_INITIAL rows and all seeded outside-predicate controls remain unchanged; backfill re-run predicate is empty/idempotent. | `node_modules/.bin/vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts`; compare explicit before/after field snapshots and zero remaining predicate. |
| `AC-07` | Clean migration chain installs function with owner `hrp_public_rpc`, SECURITY DEFINER, exact `public, pg_temp` search_path, unchanged signature/return/grants, PUBLIC denied, and no retained SET/INHERIT membership. Existing AFF-03/W5 integration remains green. | Ephemeral clean DB + catalog assertions + `npm run test:integration`. |
| `AC-08` | Prisma validate, typecheck, lint, unit, build, full integration, TASK/HANDOFF verifiers and Tier 3 LIGHT complete; diff stays in allowlist. | Commands in §6.3, scope check and AUDIT.md. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-07` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02`, `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-02`, `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-01` | `AC-01` |
| `RQ-06` | `STEP-03`, `STEP-04` | `AC-05`, `AC-06` |
| `RQ-07` | `STEP-01` | `AC-01` |
| `RQ-08` | `STEP-04`, `STEP-05` | `AC-08` |

### 6.3 Canonical verification commands

Implementation HANDOFF phải ghi exit code/output cho:

1. `node_modules/.bin/vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts`
2. `npm run test:integration`
3. `node_modules/.bin/prisma validate`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run test:unit`
7. `npm run build`
8. `pwsh .ai-pipeline/scripts/verify-task.ps1 "docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md"`
9. `pwsh .ai-pipeline/scripts/verify-handoff.ps1 "docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/HANDOFF.md"`
10. `git diff --check` và exact allowlist scope check.

Production preflight/apply/deploy không thuộc các command implementation mặc định; chỉ chạy khi T0 cấp gate và đúng environment.

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Check-then-insert race consumes two attributions hoặc trả unique error. | Same-LP row lock before mutation + re-read + unique constraints as backstop + two-connection test. |
| `RISK-02` | Backfill vô tình gia hạn legacy ownership. | Compute exclusively from original `starts_at`; overdue ACTIVE expires at migration snapshot. |
| `RISK-03` | Backfill chạm manager indefinite assignment. | Exact source/null predicate and outside-predicate before/after assertions. |
| `RISK-04` | Replacing definer RPC changes privilege posture. | Catalog assertions for owner/prosecdef/search_path/ACL/membership; preserve choreography verbatim; abort on mismatch. |
| `RISK-05` | Concurrent new-profile identity resolution is broader than same-LP handling race. | This slice serializes after canonical `v_lp_id` resolution; any duplicate-profile race outside that boundary is reported and separately scoped. |
| `RISK-06` | Unknown legacy data makes narrow backfill unsafe. | Read-only aggregate preflight and T0 stop gate; no heuristic production repair. |

## 8. Open Questions

| ID | Question | Owner | Required before |
|---|---|---|---|
| `OQ-01` | T0 có chấp thuận DEC-06/07 và cardinality/status distribution từ read-only preflight để cho phép backfill không? | T0 | `READY_FOR_EXECUTION` hoặc trước production apply, tùy gate T0 chọn |
| `OQ-02` | Thứ tự thực thi so với AFF-04 là gì? Không có technical dependency mặc định. | T0 | Execution scheduling |
| `OQ-03` | Nếu preflight phát hiện future `starts_at`, unknown status hoặc inconsistent history, row/group nào được phép sửa bằng task khác? | T0 sau evidence | Bất kỳ production mutation nào |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | `PROPOSED_ONLY`; chờ T0 contract/data review | Contract documentation-only theo chỉ thị T0; chưa code/migrate/deploy, chưa mở PR. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial AFF-05A-R1 contract | T0 approved reconciliation `076ed531` as design input and requested legacy-data/race/security contract. |
