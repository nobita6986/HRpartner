# TASK — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Forward-only migration replaces SECURITY DEFINER RPC and backfills existing attribution data at the data-integrity/attribution boundary. |
| Spec version | `v1.4` |
| Status | `ACCEPTED` |
| Planner | `Tier 1B` |
| Execution owner | `Tier 1B` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` — origin/main post ER-002 (CI/Vercel PASS) |
| Approved design input | `076ed531e3f25bddd6c407ba826b5a04cc88bb30` — `AFF05A_RESIDUAL_RECONCILIATION.md` |
| In-scope roots | Exact File Allowlist at §4.2 |
| Forbidden paths | Mọi file ngoài Exact File Allowlist; đặc biệt `PLANNER_HANDOVER.md`, AFF-04/T1B worktree, schema, RLS migration hiện hữu, commission/CRM/ER-003 |
| Required gates | Guarded two-connection DB test; `CI_INTEGRATION_STRICT=1 npm run test:integration`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `node_modules/.bin/prisma validate`; `VERIFY_TASK`; `VERIFY_HANDOFF`; Tier 3 LIGHT audit |
| Current execution round | `11` |
| Current audit round | `R11` — LIGHT PASS on source-snapshot bytes; committed-byte equivalence verified by T0 |
| Next gate | `T0_PUSH_PR_DECISION_AND_CANONICAL_CI` |

> Owner đã cho phép implementation trên DB synthetic cô lập, gồm T0 trực tiếp đóng correction R11. Không cho phép production preflight/migration/deploy từ coding gate; các gate production vẫn riêng và chưa hoàn tất.

## 1. Outcome

### 1.1 User-visible outcome

- Initial affiliate handling bắt đầu từ public intake có deadline đúng 168 giờ tính từ cùng một server timestamp.
- Một submission mới cho LaborProfile đã có source/handler canonical vẫn được ghi nhận nhưng không thay attribution, không thay handler và không consume attribution mới ngoài ý muốn.
- Idempotent replay trả lại kết quả của lần đầu, không tạo thêm submission, attribution mutation hoặc handling assignment.
- Legacy `AFF_INITIAL` thiếu deadline được sửa bằng predicate hẹp từ `starts_at`; assignment quản lý không thời hạn và dữ liệu ngoài predicate không đổi.

### 1.2 Non-goals

- Không sửa UI, manager assignment duration, Company Pool, dispute, AFF-04 placement snapshot, AFF-05B commission, CRM hoặc ER-003.
- Không sửa `prisma/schema.prisma`, migration cũ, RLS policy, role attributes hoặc public route/API response shape. Chỉ exception grant hẹp tại DEC-08 được phép.
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
| `EV-08` | `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql:570-579` | Source privilege evidence: `hrp_public_rpc` có `SELECT,INSERT` LaborProfile, `SELECT,UPDATE` attribution, nhưng chỉ `INSERT` handling; BYPASSRLS không thay table grants. |
| `EV-09` | `scripts/ci/integration-preflight.mjs:1-118` | Existing environment guard: dedicated `DATABASE_URL_TEST`, refuse protected URLs, strict mode biến missing DB thành failure. |
| `EV-10` | `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql` | Implementation evidence: advisory lock, 168h deadline, attribution preservation, exactly SELECT+INSERT on handling table. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Initial deadline là đúng 168 giờ: capture một `transaction_timestamp()` vào biến và dùng cùng giá trị cho `starts_at`; `expires_at = starts_at + interval '168 hours'`. Không nhận client clock. | `CHOSEN` |
| `DEC-02` | Same idempotency key + same payload là replay: trả stored result và không gọi RPC lần hai. Idempotency key mới là submission mới dù match cùng LaborProfile. | `CHOSEN` |
| `DEC-03` | Submission mới cho LaborProfile đã có canonical attribution hoặc active handling không được rebind/consume incoming attribution và không được replace/revoke handler; incoming attribution giữ nguyên trạng thái/binding. | `CHOSEN` |
| `DEC-04` | Sau khi resolve canonical `v_lp_id`, canonical RPC lấy transaction advisory lock `pg_advisory_xact_lock(hashtextextended('AFF05A_R1:' || v_lp_id, 0))`, rồi re-read attribution + active handling trước mọi related mutation. Lock chỉ serialize các canonical public-intake calls dùng cùng protocol; không tuyên bố bảo vệ writer khác. Hash collision chỉ gây false serialization, không làm sai dữ liệu. Unique constraints vẫn là backstop. | `CHOSEN` |
| `DEC-05` | Thứ tự bắt buộc trong canonical RPC: resolve canonical LP → acquire advisory xact lock → re-read attribution + active handling → decide → mutate attribution/handling/submission. Concurrent canonical calls dùng first-lock-holder semantics: đúng một attribution được consumed/bound và tối đa một `AFF_INITIAL`; call còn lại tạo submission mới nhưng để incoming attribution unchanged. | `CHOSEN` |
| `DEC-06` | Legacy backfill chỉ match `source='AFF_INITIAL' AND expires_at IS NULL AND starts_at IS NOT NULL`; set deadline từ `starts_at + interval '168 hours'`, không tính lại từ deploy time. | `CHOSEN_PENDING_T0_DATA_REVIEW` |
| `DEC-07` | Legacy row terminal (`EXPIRED/REVOKED/TRANSFERRED/COMPLETED` nếu có) giữ nguyên status/history và chỉ nhận deadline. Legacy `ACTIVE` có computed deadline <= một migration server snapshot chuyển tại chỗ sang `EXPIRED`; không delete/reinsert, không đổi assignee/source/previous link/reason/starts_at. | `CHOSEN_PENDING_T0_DATA_REVIEW` |
| `DEC-08` | Preserve owner `hrp_public_rpc`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, signature/return shape, PUBLIC revoke, EXECUTE grants, temporary SET-role choreography và final SET/INHERIT cleanup. Add exactly `GRANT SELECT ON labor_profile_handling_assignments TO hrp_public_rpc` because re-read needs table privilege; retain existing INSERT. No UPDATE/DELETE/ALL, no PUBLIC grant, no RLS or role-attribute change. Catalog-test effective privileges, including advisory-lock EXECUTE; BYPASSRLS never substitutes for grants. | `CHOSEN` |
| `DEC-09` | Implementation ordering là quyết định T0 sau contract review; AFF-04 không phải technical dependency mặc định. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Forward-only migration replace latest `hrp_public_intake_submission(jsonb)` body, giữ signature/return/security boundary và không sửa migration cũ. |
| `RQ-02` | New initial handling dùng một server timestamp cho `starts_at` và deadline đúng +168 giờ. |
| `RQ-03` | Same-key replay tại route idempotency boundary không tạo side effect mới. New-key/direct RPC submission cho same LP preserve (a) existing attribution+handler và (b) active handler khi chưa có attribution; incoming attribution không bị consume ngoài ý muốn. |
| `RQ-04` | Canonical public-intake same-profile decision dùng advisory xact lock theo DEC-04/05; two-connection race có deterministic invariants và không dựa vào pre-check. Writers không dùng protocol nằm ngoài guarantee. |
| `RQ-05` | Tại production branch gate sau code+CI và trước merge/apply, T0 chạy read-only aggregate preflight cho `AFF_INITIAL AND expires_at IS NULL`; preflight không phải điều kiện bắt đầu code và count của nó không phải immutable apply snapshot. |
| `RQ-06` | Backfill predicate hẹp theo DEC-06/07; manager-assigned indefinite rows và mọi row ngoài predicate byte-for-byte/logically unchanged ở các field business. |
| `RQ-07` | Nếu preflight có `starts_at IS NULL`, future start ngoài clock-skew được T0 chấp nhận, unknown status, constraint/history inconsistency hoặc cardinality bất thường, dừng trước production apply và báo T0; không tự mở predicate. |
| `RQ-08` | Test chỉ dùng synthetic identities và dedicated PostgreSQL qua environment guard. Missing DB, refused DB hoặc target test all-skipped là `BLOCKED`, không PASS. |

### 4.2 Scope boundaries

**Exact File Allowlist cho implementation:**

1. `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql`
2. `tests/db/aff03-public-intake.integration.test.ts`
3. `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/**`

**Exact File Allowlist cho AC-06/AC-07 CI evidence infrastructure** (T0 round-3 +
round-4 cho phép chỉnh đúng 4 script hiện có; T0 round-6 R6-G4 mở rộng thêm 4
file CI infrastructure: 3 script mới + 1 preflight hiện có):

4. `scripts/ci/prepare-migration-test-db.mjs`  — synthetic-DB reset to AFF-03C predecessor state.
5. `scripts/ci/apply-r1-migration.mjs`          — apply R1 migration to a synthetic target with `--dry-run`.
6. `scripts/ci/verify-ac06-backfill.mjs`        — AC-06 backfill correctness evidence.
7. `scripts/ci/verify-ac07-rollback.mjs`        — AC-07 forced-anomaly rollback evidence (also runs `--lock-timeout` for AC-04 bounded lock_timeout evidence, T0 round-4).
8. `scripts/ci/integration-preflight.mjs`       — pre-suite posture sanity check (writer vs admin connection).
9. `scripts/ci/assert-test-db-posture.mjs`      — pre-suite posture assertion: writer non-super non-bypassrls; admin distinct; same target.
10. `scripts/ci/build-predecessor-staging.mjs`  — single staging-driven predecessor build (Prisma CLI in a per-run tmp dir).
11. `scripts/ci/validate-guards.mjs`            — single non-mutating guard validator (T0 round-7 R7-G2); covers all five helpers including the builder.

12. `scripts/ci/verify-collision-integration.mjs` — R11 Owner-authorized isolated collision proof and failure-cleanup proof; no shared DB cleanup.
13. Task-local `evidence/r11/` capture script, logs and source hashes — R11 reproducibility artifacts, synthetic only.

`prepare-migration-test-db.mjs`, `apply-r1-migration.mjs`, `verify-ac06-backfill.mjs`, `verify-ac07-rollback.mjs`, and `build-predecessor-staging.mjs` each accept `--probe` (T0 round-5 R5-G3 + T0 round-7 R7-G2). The dedicated validator is `scripts/ci/validate-guards.mjs` (single source of truth for guard coverage; T0 round-7 R7-G2 unified path). The previous duplicate `--validate-guards` mode inside `prepare-migration-test-db.mjs` has been REMOVED (T0 R7-G2).

- **In:** one additive migration, existing canonical DB integration test, exact handling-table SELECT exception grant, read-only aggregate preflight query/result under task-local evidence, TASK/HANDOFF/AUDIT, plus the explicitly listed synthetic-only helper scripts under `scripts/ci/` for AC-06/AC-07 evidence (T0 round-3 + round-4 + round-6 explicit allowlist).
- **Out:** mọi file khác; đặc biệt old migrations, `prisma/schema.prisma`, routes/services/UI, RLS policies, role attributes, blanket grants, PLANNER_HANDOVER, AFF-04/T1B worktree, production apply/deploy.
- **Scope rule:** nếu implementation cần sửa route/idempotency helper hoặc test registration ngoài allowlist, dừng và trả Planner/T0; không tự mở scope.

### 4.3 Domain boundaries

- **Data/state:** một canonical attribution và tối đa một persisted active handling per LaborProfile. Repeat submission không phải source-transfer event. Expiry boundary là `expires_at <= server_snapshot`.
- **Permission/security:** function owner/definer/search_path/EXECUTE ACL/membership cleanup giữ nguyên. Effective table privilege delta duy nhất là handling `SELECT`; existing handling `INSERT` giữ nguyên. Cấm UPDATE/DELETE/ALL, PUBLIC grant, RLS/role-attribute change và payload/PII logging.
- **Interface/API:** giữ nguyên RPC signature, return table và public route status/body. `attribution_consumed=false` khi new submission preserves existing canonical source and leaves incoming attribution untouched. Same-key replay chỉ được chứng minh qua route `withIdempotency`; gọi RPC trực tiếp không chứng minh replay.
- **Migration/rollback:** forward-only. Trước production apply: branch revert. Sau apply: không down-migrate hoặc sửa migration; cần compensating migration được review riêng. Row history đã backfill không được xóa để "rollback".

### 4.4 Effective privileges and serialization

Pinned migration evidence cho `hrp_public_rpc`:

| Object | Existing effective table grant needed by RPC | AFF-05A-R1 delta |
|---|---|---|
| `labor_profiles` | `SELECT, INSERT` | None; advisory lock avoids requiring `UPDATE` for row locking. |
| `referral_attributions` | `SELECT, UPDATE` | None. |
| `labor_profile_handling_assignments` | `INSERT` | Add exactly `SELECT` for post-lock canonical-state re-read. |
| `candidate_submissions` | `INSERT` | None. |
| `placement_case` | `SELECT, INSERT` | None. |

Implementation must assert catalog state rather than infer it from `BYPASSRLS`: role exists, expected role attributes match environment contract, exact table privileges above are effective, forbidden handling `UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` are absent, and `has_function_privilege('hrp_public_rpc', 'pg_catalog.pg_advisory_xact_lock(bigint)', 'EXECUTE')` is true. If advisory-lock EXECUTE is absent, stop and return to T0; this contract does not authorize another grant.

Serialization key is `hashtextextended('AFF05A_R1:' || v_lp_id, 0)`. It protects only canonical public-intake calls that resolve the same canonical LP then participate in this protocol. Hash collision may serialize unrelated LPs but cannot permit concurrent mutation. Staff intake, manager tools, old function versions or future writers that do not take this lock are outside the guarantee; constraints remain final backstops.

### 4.5 Production gate, migration transaction and backfill

Production aggregate preflight belongs to T0's production branch gate after coding/CI and before merge/apply. It records:

- total `source='AFF_INITIAL' AND expires_at IS NULL` and breakdown by status;
- computed overdue/not-yet-due counts from `starts_at + 168 hours`;
- NULL/future starts, contradictory active history, min/max timestamps;
- no ID, name, phone, CCCD or payload.

This report is impact evidence, not a frozen apply count. Live intake may change rows after preflight. The migration must therefore use one explicit transaction and current-state revalidation:

1. `BEGIN`; establish temporary membership, `SET ROLE hrp_public_rpc`, replace function while preserving security contract.
2. `RESET ROLE`; revoke temporary CREATE/membership and assert no SET/INHERIT residue.
3. As migration session/admin role, grant only handling `SELECT`, then acquire a table lock that blocks concurrent handling INSERT/UPDATE for the short revalidation/backfill window.
4. Re-run anomaly and safe-predicate queries under that transaction/lock; do not compare equality with stale production-preflight count.
5. If anomalies violate RQ-07, `RAISE EXCEPTION` before UPDATE.
6. Capture one migration timestamp; update only DEC-06 rows from `starts_at`; materialize overdue `ACTIVE → EXPIRED`; preserve terminal status, identity and links.
7. Assert zero safe-predicate NULL deadlines, expected privilege/security posture and outside-predicate controls; any failed assertion raises and rolls back function replacement, grant and row updates together.
8. `COMMIT` only after all assertions pass.

Backfill is executed after `RESET ROLE` by the migration session/admin role, never by `hrp_public_rpc`. Production apply remains a separate T0 gate.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | baseline + dedicated test DB | Re-pin latest main; confirm source/effective privilege assumptions on guarded synthetic DB. No production preflight required to start coding. | `AC-07`, `AC-08` | Stop if baseline/RPC/security posture differs from contract. |
| `STEP-02` | exact migration file | Implement canonical LP → advisory lock → re-read → mutation order, 168h deadline, exact SELECT grant and atomic role choreography. | `AC-02`, `AC-03`, `AC-04`, `AC-07` | Stop if advisory EXECUTE missing or route/schema/RLS/role-attribute change is required. |
| `STEP-03` | same migration backfill | After RESET ROLE, lock/revalidate current rows and apply narrow backfill atomically; assertions roll back all changes. | `AC-05`, `AC-06` | Stop on anomaly; never force stale preflight count equality. |
| `STEP-04` | guarded DB integration | Seed predecessor-state isolated DB, apply R1, cover fresh/replay/preservation/race/clean-chain/upgrade. | `AC-02`–`AC-08` | Missing/refused DB or target test all-skipped is `BLOCKED`, never PASS. |
| `STEP-05` | HANDOFF/AUDIT | Run coding/CI gates, capture executed test counts, request Tier 3 LIGHT and resolve findings. | `AC-08` | No production credentials or data required for this step. |
| `STEP-06` | T0 production branch gate | After code+CI, T0 runs aggregate preflight, reviews current data impact and separately authorizes merge/apply. | `AC-01` | Any anomaly/data decision remains with T0; no automatic production mutation. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | After code+CI, production branch gate records aggregate NULL-deadline AFF_INITIAL groups/anomalies without PII and T0 explicitly approves data impact before merge/apply. This gate is not required to begin coding. | Task-local aggregate SQL/evidence + T0 sign-off; no production mutation. |
| `AC-02` | Fresh valid attribution creates one submission, one consumed/bound attribution and one `AFF_INITIAL ACTIVE`; `starts_at` equals captured server timestamp and `expires_at - starts_at = interval '168 hours'`. | `CI_INTEGRATION_STRICT=1 npm run test:integration`; targeted file must report executed, non-skipped test count > 0. |
| `AC-03` | Route call with same key+payload proves replay returns stored result and unchanged row counts; direct RPC call alone is insufficient. Separate new-key/direct-RPC cases prove preservation for (a) existing attribution+active handler and (b) active handler with no attribution: new submission commits, handler remains, incoming attribution remains unconsumed/unbound. | `CI_INTEGRATION_STRICT=1 npm run test:integration`; exercise real `withIdempotency` boundary plus RPC row assertions; target cases must execute, not skip. |
| `AC-04` | Two canonical public-intake RPC calls on independent DB connections target the same pre-existing LP with different active attributions: both submissions commit; exactly one attribution is consumed/bound, loser remains unchanged, and one active initial assignment exists. No claim is made for non-participating writers. | Barrier-controlled two-client test via `CI_INTEGRATION_STRICT=1 npm run test:integration`. |
| `AC-05` | In an isolated DB, migrate only through R1 predecessor, seed synthetic NULL-deadline AFF_INITIAL rows (overdue ACTIVE, future ACTIVE, terminal history) plus controls, then apply R1 migration: deadlines derive from each starts_at, overdue ACTIVE expires in place, future ACTIVE and terminal history remain correct. | `CI_INTEGRATION_STRICT=1 npm run test:integration`; guarded upgrade case applies predecessor chain → seed → R1 migration with no production clone/data. |
| `AC-06` | Manager assignment with NULL deadline, non-AFF_INITIAL rows and seeded outside-predicate controls remain unchanged; backfill re-run predicate is empty. A forced assertion failure rolls back function replacement, SELECT grant and row updates in the isolated DB. | Guarded upgrade test compares explicit snapshots and validates transactional rollback. |
| `AC-07` | Clean chain proves owner/SECURITY DEFINER/search_path/signature/EXECUTE ACL unchanged; PUBLIC denied; no SET/INHERIT residue; role attributes unchanged; handling privileges exactly SELECT+INSERT with no UPDATE/DELETE/ALL; advisory-lock EXECUTE effective. BYPASSRLS and every table grant are asserted independently. | Ephemeral clean DB catalog assertions via `CI_INTEGRATION_STRICT=1 npm run test:integration`. |
| `AC-08` | Prisma validate, typecheck, lint, unit, build, guarded integration, TASK/HANDOFF verifiers and Tier 3 LIGHT complete; diff stays in allowlist. Missing/refused test DB, ENV_BLOCKED or all target cases skipped is BLOCKED and cannot be reported PASS. | Commands in §6.3, explicit executed/skipped counts, scope check and AUDIT.md. |

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

1. `CI_INTEGRATION_STRICT=1 npm run test:integration` — canonical guarded DB lane; HANDOFF must show target file executed and target skipped count = 0
2. Optional diagnostic filtering may be used only after the guard passes; direct Vitest output alone is not acceptance evidence
3. `node_modules/.bin/prisma validate`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run test:unit`
7. `npm run build`
8. `pwsh .ai-pipeline/scripts/verify-task.ps1 "docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md"`
9. `pwsh .ai-pipeline/scripts/verify-handoff.ps1 "docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/HANDOFF.md"`
10. `git diff --check` và exact allowlist scope check.

Production branch gate/preflight/apply/deploy không thuộc coding/CI commands. T0 runs or authorizes them only after code+CI; absence of production access does not block implementation on the guarded synthetic DB.

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Check-then-insert race consumes two attributions hoặc trả unique error. | Canonical same-LP advisory xact lock before re-read/mutation + constraints + two-connection test; document non-participating-writer limit. |
| `RISK-02` | Backfill vô tình gia hạn legacy ownership. | Compute exclusively from original `starts_at`; overdue ACTIVE expires at migration snapshot. |
| `RISK-03` | Backfill chạm manager indefinite assignment. | Exact source/null predicate and outside-predicate before/after assertions. |
| `RISK-04` | Replacing definer RPC changes privilege posture. | Catalog assertions for owner/prosecdef/search_path/ACL/membership; preserve choreography verbatim; abort on mismatch. |
| `RISK-05` | Concurrent new-profile identity resolution is broader than same-LP handling race. | This slice serializes after canonical `v_lp_id` resolution; any duplicate-profile race outside that boundary is reported and separately scoped. |
| `RISK-06` | Unknown legacy data makes narrow backfill unsafe. | Read-only aggregate preflight and T0 stop gate; no heuristic production repair. |

## 8. Open Questions

| ID | Question | Owner | Required before |
|---|---|---|---|
| `OQ-01` | T0 có chấp thuận DEC-06/07 và current cardinality/status distribution từ production branch-gate preflight để cho phép merge/apply không? | T0 | Sau code+CI, trước merge/apply; không chặn bắt đầu coding |
| `OQ-02` | Thứ tự thực thi so với AFF-04 là gì? Không có technical dependency mặc định. | T0 | Execution scheduling |
| `OQ-03` | Nếu preflight phát hiện future `starts_at`, unknown status hoặc inconsistent history, row/group nào được phép sửa bằng task khác? | T0 sau evidence | Bất kỳ production mutation nào |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | `PROPOSED_ONLY`; chờ T0 contract/data review | Contract documentation-only theo chỉ thị T0; chưa code/migrate/deploy, chưa mở PR. |
| 1 | `PROPOSED_ONLY`; security/serialization/gates revised | T0 accepted business direction but kept execution closed; revision resolves effective privilege, concurrency boundary, test guard and production-gate findings. |
| 2 | `READY_FOR_AUDIT`; implementation on synthetic DB complete | T0 authorized execution on synthetic dedicated DB; migration, integration tests, all gates PASS; HANDOFF to T0 for independent Tier 3 LIGHT audit. |
| 11 | `READY_FOR_AUDIT`; R11 helper lifecycle correction complete, dirty/uncommitted | Owner asked T0 to execute T1B correction directly. LIGHT lane requires READY_FOR_AUDIT in TASK/HANDOFF; T0 freeze review still precedes independent T3 delta. Narrow fixture grammar, pre-builder collision checks, no drop-before-create, outer owned-resource cleanup; no production/migration/application-test changes in this delta. No merge approval. |
| 12 | `ACCEPTED` | PR #33 squash-merged to main (9e527a13e74c8361feea77b8edca522c8c37ec08); production verified with 1 applied migration. |

## 10. Revision Log

T0 freeze resolution: cumulative implementation frozen at `b5e62e6abec401d71578766ca6ded29e13da9137` after R11 LIGHT PASS. The 14 pinned blobs match this commit exactly; audit staged verbatim. No new runtime edits, no push/PR/merge or production action. `.gitignore` scratch/env hygiene from prior rounds is explicitly accepted as delivery housekeeping, not runtime scope. Six historical logs received whitespace-only normalization; original local backups retained. Details in `FREEZE-R11.md`. This docs-only follow-up updates metadata, not the frozen implementation.

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial AFF-05A-R1 contract | T0 approved reconciliation `076ed531` as design input and requested legacy-data/race/security contract. |
| `v1.1` | `2026-09-22` | Effective privileges, advisory-lock boundary, preservation cases, atomic migration and split production gate | T0 review of contract `e5e4073e3d8724e78530fa6052d86f0e8a0d4822`. |
| `v1.1` | `2026-09-22` | Baseline updated to `e4d21807` (origin/main post ER-002); execution owner = Tier 1B; status → `READY_FOR_AUDIT`; round 2 Planner Resolution | T0 authorized implementation on synthetic dedicated DB. |
| `v1.2` | `2026-09-23` | Round 11, explicit collision runner/task-local evidence allowlist, current freeze gate and handoff sync | Owner-authorized T0 execution as T1B; audit artifacts preserved; production gates remain pending. |
| `v1.3` | `2026-09-23` | T0 freeze accepted; implementation SHA and audit binding recorded; next gate push/PR decision and canonical CI | R11 pinned bytes preserved in commit; no automatic production approval. |
| `v1.4` | `2026-09-23` | Closeout documentation | PR #33 squash-merged to main; production verified with 1 applied migration. |
