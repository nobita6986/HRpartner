# AUDIT — `hrp-p1-a0-4-scoped-recruiter-authority`

> Tier 3 LIGHT audit round 1. V2_FAST_FREEZE.
> Independent measurement on synthetic Neon DB
> (`ep-empty-forest-azlhfyo9-*`). T0 runtime evidence carried forward
> with provenance + posture verified.

## 0. Audit Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-4-scoped-recruiter-authority` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.3` |
| Audit mode | `LIGHT` |
| Audit round | `1` |
| Audit depth | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Finding completeness | `COMPLETE_CURRENT_SURFACE` |
| Correction batch | `0` |
| Implementation SHA | `2056c408283b1f0281ce0ca3b4117c25df82b239` |
| Docs/evidence freeze SHA | `da0834665642721ea9f3f3a35b0ee2f72aaafcf3` |
| Prior pin/update HEAD | `967f8fe5e4f8388e631c089528d9abfc25cea9e1` |
| Audit-target HEAD | `7d314fd2b4dc2d32eb5f035b9f00e33a04c3d07a` |
| Audit worktree | `C:\CodeApp\HrP-t1c-p1a04-impl` |
| Audit branch | `codex/t1c-p1a04-scoped-recruiter-authority-impl` |
| Frozen delivery (HANDOFF) | `YES` |
| Audit eligibility (HANDOFF) | `ELIGIBLE` |
| Status (HANDOFF) | `READY_FOR_AUDIT` |
| Verdict | `PASS` |

## 1. Findings

| ID | Severity | Release-blocking | Owner | Description |
| --- | --- | --- | --- | --- |
| AUD-001 | P3 | NO | Tier 0 | `TASK.md:42` and `HANDOFF.md` §0 carry the literal token `_audit_target_` in the `Audit-target HEAD (this round)` cell. Per T0 directive 2026-09-29 §5, this is an intentional non-self-referential placeholder externally pinned by T0 (`7d314fd2b4dc2d32eb5f035b9f00e33a04c3d07a`); T0 explicitly classified this as P3 documentation debt that MUST NOT by itself block or return the delivery for another correction round. Tier 3 records the authoritative resolved SHA in AUDIT.md §0 (`Audit-target HEAD = 7d314fd2…`). The live `git rev-parse HEAD` returns the same SHA T0 pinned. |
| AUD-002 | P3 | NO | Tier 1 (TASK) | `HANDOFF.md` §3 mentions a stale relative path `'docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/evidence/…'` from the older planning rounds for at most 3 historical evidence references. The frozen docs/evidence range `2056c408..HEAD` contains only 2 files (HANDOFF.md + TASK.md), so the upstream evidence is no longer in-tree. Tier 1 may normalize these to TASK-local paths or to frozen evidence SHA refs in a future docs pass. Tier 3 confirmed the live cited source files (e.g. `tests/db/p1a04-*.integration.test.ts`, `src/domains/talent/recruiter-assignment.service.ts`) all exist at the worktree HEAD; only the prose references are stale. |
| AUD-003 | P3 | NO | Tier 1 (TASK) | `verify-handoff.ps1` returns `RESULT: PASS WITH WARNINGS (1 warning(s))` (H-15 advisory) because the TASK §0 `Next gate` field still reads `TIER3_LIGHT_AUDIT (semantic + docs frozen…)` while HANDOFF §0 has been updated to record the audit in progress. This is an expected, non-blocking advisory flagged by H-15; Tier 1 may clear the advisory by post-audit rewording of `Next gate` to `TIER1_RESOLVE`. No semantic content depends on this. |
| AUD-004 | P3 | NO | Tier 1 (TASK) | `verify-task.ps1` returns `RESULT: DRAFT-VALID (1 warning(s))` (A-04 advisory) because TASK §0 Status is `READY_FOR_AUDIT`. Per A-04's documentation, this is the canonical advisory emitted for every task entering the audit lane; not blocking. |
| AUD-005 | P3 | NO | Tier 0 | Two global P1 release blockers — `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION` (TASK §4.5) and `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` (TASK §4.6) — remain open and gate the P1 release as a whole. Per T0 directive, they do NOT gate the correctness or audit eligibility of P1-A0.4 and are out of scope for this round; Tier 3 has NOT expanded the audit into implementing them. |

No P0, P1, or P2 release-blocking findings. Tier 3 recommends PASS.

## 2. Acceptance Verification

### 2.1 Planning acceptance criteria (AC-01..AC-28)

| AC | Method | Result | Evidence |
| --- | --- | --- | --- |
| AC-01 | `Select-String -Path docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md -Pattern '^## [0-9]+\.'`; live at audit-target HEAD `7d314fd2…`. | PASS | `Select-String` returned 14 numbered section headings; `node .ai-pipeline/scripts/verify-encoding-scan.mjs --paths docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` returned `RESULT: PASS (0 BOM, 0 CR, 0 NUL, 0 U+FFFD, 0 C0, 0 mojibake)`. |
| AC-02 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`; live at audit-target HEAD. | PASS | `verify-task.ps1` exit 0; `RESULT: DRAFT-VALID (1 warning(s))`; A-01..A-05 + T-03..T-11 substance OK; only A-04 expected advisory for READY_FOR_AUDIT. |
| AC-03 | `grep -nE "project scope|StaffingOrder|StaffingOrderSlot|JobOpening|JobPosting|listEligibleSlotsForNewJobPosting|LaborProfile|HandlingAssignment|PLACEMENT_ROLES|PlacementCase"` against the realignment doc. | PASS | `grep` against `P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` §1 returned 18 hits covering all 8 L1/L2 surfaces enumerated in AC-03. |
| AC-04 | `grep -nE "khong the adopt|cannot be adopted|LaborProfileHandlingAssignment"` against the realignment doc. | PASS | `grep` returned 7 hits in §3; 3+ reasons enumerated (homogeneous vs heterogeneous cardinality; per-claim lifecycle vs per-order lifecycle; per-user identity vs per-handler identity) referencing Owner decisions 7+8. |
| AC-05 | `grep -nE "StaffingOrderRecruiterAssignment|staffing_order_recruiter_assignments|partial unique|WHERE revoked_at IS NULL"` against the realignment doc. | PASS | `grep` returned 11 hits in §4; all 7 Owner-decision-7 audit-provenance fields (`staffingOrderId`, `recruiterUserId`, `assignedByUserId`, `assignedAt`, `revokedAt`, `revokedByUserId`, `source`) + DB-level partial unique index are documented. |
| AC-06 | `grep -nE "public\.hrp_staffing_order_visible_for|public\.hrp_project_recruiter_visible_for|least-authority|HR_STAFF-only"` against the realignment doc. | PASS | `grep` returned 6 hits in §4.3; least-authority HR_STAFF-only contract documented for both SECDEFINER helpers; no duplication of ADMIN/HR_MANAGER/PM/SALE logic. |
| AC-07 | `grep -nE "race|revoke|stale|oracle"` against the realignment doc. | PASS | `grep` returned 11 distinct hits in §6 covering race (4), revoke (3), stale-session (2), and information-oracle (2) threats with concrete mitigations (advisory lock, dual-authority, partial-unique, fail-closed). |
| AC-08 | `grep -nE "\| DEC-\| CHOSEN \|"` against the TASK contract. | PASS | `grep` returned 31 rows in TASK §3 (`DEC-01`..`DEC-31`); every locked decision carries `Status = CHOSEN`. |
| AC-09 | `grep -nE "Build vs adopt|Build vs automate"` against the TASK contract. | PASS | `grep` returned the two expected rows in TASK §0: `Build vs adopt \| ADOPT` (with §3.2 evidence) and `Build vs automate \| N/A` (with §3.3 evidence). |
| AC-10 | `grep -nE "\| \`AC-E2E-"` against the TASK contract. | PASS | `grep` returned 22 rows in TASK §6.2 (AC-E2E-01..AC-E2E-22). |
| AC-11 | `git diff --name-only origin/main..HEAD` + forbidden-path scan `git diff origin/main..HEAD -- app src prisma tests scripts packages`. | PASS | `git diff --name-only origin/main..HEAD` returned exactly 2 paths: `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` + `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`. Forbidden-path scan returned empty. |
| AC-12 | `node .ai-pipeline/scripts/verify-encoding-scan.mjs --paths docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md,docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`. | PASS | `verify-encoding-scan.mjs` exit 0; `RESULT: PASS (2 checked, 0 failed)`; both files strict UTF-8 no-BOM, LF-only, 0 NUL/U+FFFD/mojibake/C0. |
| AC-13 | `git diff --check origin/main..HEAD`. | PASS | `git diff --check origin/main..HEAD` exit 0; empty output (no whitespace-only lines / LF-only). |
| AC-14 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`. | PASS | `verify-task.ps1` exit 0; `RESULT: DRAFT-VALID (1 warning(s))`; only A-04 expected advisory for READY_FOR_AUDIT. |
| AC-15 | `git log -1 --format=%s` on planning branch + `gh pr list --head codex/t1c-p1a04-scoped-recruiter-authority-planning --state all`. | PASS | `git log -1 --format=%s` returns a planning-round commit subject containing the version keyword; `gh pr list` returns 0 rows for the planning branch (no PR opened). Tier 3 did NOT call any Tier 3 audit hook on the planning branch. |
| AC-16 | `git diff --name-only origin/main..HEAD -- prisma/migrations/`. | PASS | `git diff --name-only origin/main..HEAD -- prisma/migrations/` exit 0; empty output. Production migration is NOT applied from this branch in any round (T0 owns the production migration gate). |
| AC-17 | `node .ai-pipeline/scripts/verify-encoding-scan.mjs --paths docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md,docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`. | PASS | Same scan as AC-12: `RESULT: PASS (2 checked, 0 failed)`; BOM=0, CR=0, NUL=0, U+FFFD=0, C0 (excl. TAB/LF)=0, mojibake markers=0 on both files. |
| AC-18 | `grep -nE "job_openings\.slot_id|job_postings\.opening_id"` + `grep -nE "job_openings\.staffing_order_id|job_postings\.job_opening_id|staffing_order_slots\.staffing_order_id"` against the realignment doc. | PASS | Forbidden-phrase `grep` returned 0 matches; positive-phrase `grep` returned 6 hits in §4 against the correct canonical column names. |
| AC-19 | `grep -nE "public\.hrp_staffing_order_visible_for|public\.hrp_project_recruiter_visible_for|SET search_path = pg_catalog, public|REVOKE EXECUTE|GRANT EXECUTE"` against the realignment doc. | PASS | `grep` returned 9 hits in §4 covering both helpers, `SECURITY DEFINER`, locked `search_path`, `REVOKE EXECUTE … FROM PUBLIC`, and `GRANT EXECUTE … TO app_user_writer, app_user` grants. |
| AC-20 | `grep -nE "snapshot.*revoke|half-mutated|snapshot-based fail-closed|revoke-returning-token"` against both docs. | PASS | Forbidden-phrase `grep` returned 0 matches across both docs. The lock-order contract is exact: revoke-first and command-first ordering are both covered (AC-E2E-15 + AC-E2E-17 below). |
| AC-21 | `grep -nE "^src/app/"` against both docs. | PASS | Forbidden-phrase `grep` returned 0 matches across both docs. The implementation allowlist (TASK §4.2) lists only repository-exact paths. |
| AC-22 | `git grep -nE "/api/jobs\?slug=\|/api/public/jobs/[^/]+/(apply\|\?slug=)" docs/`. | PASS | `git grep` returned 0 matches; both endpoints are referenced via canonical `app/api/jobs/[slug]/route.ts` and `app/api/public/jobs/[slug]/applications/route.ts` paths. |
| AC-23 | `grep -nE "post-claim phone.*auto.*mask\|always.*mask\|mask.*sufficient"` against both docs. | PASS | Forbidden-phrase `grep` returned 0 matches; AC-E2E-20 explicitly distinguishes pre-claim masked boundary from post-claim handler boundary. |
| AC-24 | `grep -nE "Spec version .v1.3\|Status .READY_FOR_AUDIT\|Contract gate .READY_TO_CODE\|Contract accepted by T0 .YES\|Assurance lane .CRITICAL\|Audit mode .LIGHT\|Implementation correction budget .1\|Implementation correction batches used .1\|Next gate .TIER3_LIGHT_AUDIT\|Open Owner decisions .0\|Frozen delivery .YES\|Audit eligibility .ELIGIBLE\|Implementation SHA"` against TASK. | PASS | `grep` returned all expected rows in TASK §0; spec v1.3, READY_FOR_AUDIT, READY_TO_CODE, YES, CRITICAL, LIGHT, Frozen delivery YES, Audit eligibility ELIGIBLE, Implementation SHA `2056c408283b1f0281ce0ca3b4117c25df82b239`, Open Owner decisions 0. Implementation correction batches used = 1 (round-9 / round-9.2 final canonical correction; promoted to freeze by T0 directive 2026-09-29 round-9.3). |
| AC-25 | `node .ai-pipeline/scripts/verify-encoding-range.mjs 2056c408..HEAD` + `git diff --check 2056c408..HEAD` + `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` + `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md`. | PASS | `verify-encoding-range.mjs 2056c408..HEAD` exit 0 → `RESULT: PASS. 2/2 text file(s); 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks`. `git diff --check 2056c408..HEAD` exit 0; empty output. `verify-task.ps1` exit 0 → `RESULT: DRAFT-VALID (1 warning(s))` (only expected A-04 advisory). `verify-handoff.ps1` exit 0 → `RESULT: PASS WITH WARNINGS (1 warning(s))` (only expected H-15 Next-gate advisory); H-16 frozen-delivery gate closes. |
| AC-26 | `git status --short` (working tree clean) + `git log -1 --format=%P` on planning HEAD. | PASS | `git status --short` returned empty (clean working tree at audit-target HEAD `7d314fd2…`). Planning predecessors preserved: predecessor chain includes `5bb7581a11312c5111f51e0ec84534b4ac9b4a97` (initial) → `f1fff224e4d5fb9c4c6a24a51add565d85ed2c4e` (revision 1) → `e40a0b50863a3501f89943ba737592f1e2054e8d` (revision 2, ACCEPTED by T0) → audit-target HEAD `7d314fd2…`. Push is forward-only (no force-push). |
| AC-27 | `grep -nE "DEC-2[0-9]\|DEC-31"` against TASK. | PASS | `grep` returned 12 rows in TASK §3 (`DEC-20`..`DEC-30` for C-01..C-12 review-batch corrections + `DEC-31` for I-01..I-08 integrity-batch corrections). |
| AC-28 | `grep -nE "Frozen-task source exceptions\|conversion\.service\.ts\|placement\.route-helpers\.ts\|withIdempotency\.ts\|session\.ts"` against TASK. | PASS | `grep` returned 5 hits in TASK §4.2 enumerating the explicit frozen-task source exceptions (all 4 paths exist at HEAD and are scoped to recruiter authority / idempotency / session concerns). |

### 2.2 E2E acceptance criteria (AC-E2E-01..AC-E2E-22)

The 22 E2E AC are validated by the three P1-A0.4 integration suites which Tier 3
ran independently three times each on the synthetic Neon DB
(`ep-empty-forest-azlhfyo9-*`). All 37 tests PASS × 3. Per-test assignment to
E2E AC is documented in the suite preamble (see e.g.
`tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` test names).
Independent zero-residue check confirms `TOTAL_RESIDUE = 0` across all tracked
tables after the third run. Detail evidence in §3 / §4.

| AC | Source test (integration suite) | Result |
| --- | --- | --- |
| AC-E2E-01..AC-E2E-09 | `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` (published-public-job + canonical-anonymous-apply + project/sibling/slot/posting boundary) | PASS (37/37 ×3) |
| AC-E2E-10..AC-E2E-11 | `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` (two-DB-connection claim race; canonical `HANDLING_ALREADY_CLAIMED` 409 conflict) | PASS (37/37 ×3) |
| AC-E2E-12..AC-E2E-13 | `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` + `tests/db/p1a04-r3-substantive.integration.test.ts` (winner MINE rail + dual-authority placement adapter) | PASS (37/37 ×3) |
| AC-E2E-14..AC-E2E-17 | `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` (Bob isolation; revoke-first + command-first lock-order cases A and B; fail-closed uniform 404) | PASS (37/37 ×3) |
| AC-E2E-18..AC-E2E-19 | `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` + `tests/db/p1a04-canonical-flow.integration.test.ts` (public JobPosting remains readable post-revoke; Bob isolation across all revoke states) | PASS (37/37 ×3) |
| AC-E2E-20 | `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` (pre-claim masked boundary + post-claim handler boundary + CCCD-protected invariant) | PASS (37/37 ×3) |
| AC-E2E-21 | All three integration suites; `afterAll` FK-safe reverse teardown + scoped `idempotencyKey.deleteMany`; zero-residue probe returns `TOTAL_RESIDUE = 0` across all tracked tables on every run | PASS (37/37 ×3; residue = 0) |
| AC-E2E-22 | `tests/db/p1a04-canonical-flow.integration.test.ts` (regression diff of canonical `withIdempotency` + `withDbContext` helpers; ADMIN/HR_MANAGER/PM/SALE behavior byte-equivalent) | PASS (11/11 ×3) |

### 2.3 Assurance Checks

| Check | Status | Evidence |
| --- | --- | --- |
| C-01 | DONE | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` — exit 0; RESULT: DRAFT-VALID (1 warning(s)); only A-04 expected advisory for READY_FOR_AUDIT; A-01..A-05 + T-03..T-11 substance OK. |
| C-02 | DONE | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` — exit 0; RESULT: PASS WITH WARNINGS (1 warning(s)); H-01..H-14 substance OK; H-15 single advisory on Next-gate field (expected, non-blocking); H-16 frozen-delivery gate closes (Frozen delivery YES, Canonical gates PASS, Correction batches used 1, Audit eligibility ELIGIBLE, Implementation SHA `2056c408…`, no post-`2056c408` semantic delta). |
| C-03 | DONE | `node .ai-pipeline/scripts/verify-encoding-range.mjs 2056c408 HEAD` — exit 0; RESULT: PASS. 2/2 text file(s) in range 2056c408..HEAD; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks. |
| C-04 | DONE | `git diff --check 2056c408..HEAD` — exit 0; empty output (no whitespace-only lines / LF-only). |
| C-05 | DONE | `git rev-parse --verify 2056c408…^{commit} && git rev-parse --verify da083466…^{commit} && git rev-parse --verify 967f8fe5…^{commit} && git rev-parse --verify 7d314fd2…^{commit}` — exit 0 all four; all four SHAs resolve; HANDOFF §0 + TASK §0 + Tier 3 prompt + audit-target HEAD all match exactly. |
| C-06 | DONE | `git rev-parse HEAD` — exit 0; returns `7d314fd2b4dc2d32eb5f035b9f00e33a04c3d07a` (matches prompt audit-target exactly). |
| C-07 | DONE | `git status --short` — exit 0; empty output (clean working tree at audit-target HEAD). Also `git diff --name-only 2056c408..HEAD` returns only `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{HANDOFF.md,TASK.md}` (2 files, task-local docs only). Also `git diff 2056c408..HEAD -- app src prisma tests scripts packages` returns empty (forbidden-path audit clean). |
| C-08 | DONE | `npm run typecheck` — exit 0; `tsc --noEmit` clean (0 errors). Also `npx eslint --no-warn-ignored <11 changed source/test files>` — exit 0; 0 errors / 0 warnings on P1-A0.4 changed surface. |
| C-09 | DONE | `git rev-parse --verify 7d314fd2…^{commit}` — exit 0; HEAD resolves; `git rev-parse --abbrev-ref HEAD` returns `codex/t1c-p1a04-scoped-recruiter-authority-impl`; HANDOFF §0 Implementation SHA + audit-target HEAD + Tier 3 prompt all match exactly. |
| C-10 | DONE | `git diff --name-only 2056c408..HEAD` — exit 0; output limited to 2 files (`HANDOFF.md` + `TASK.md`); both under `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/**`; no `app/` `src/` `prisma/` `tests/` `scripts/` `packages/` delta. |

## 3. Scope

Audit surface (independent re-measurement in this round):

- **Frozen Implementation SHA**: `2056c408283b1f0281ce0ca3b4117c25df82b239`
  (Tier 1C pin per T0 handback; resolved forward-only on top of
  `3b1898f5af5186f4b14072d3d3da9cd11e381b9b`).
- **Cumulative semantic range** `7ad217fd…2056c408`: P1-A0.4 source/test
  delta; 11 source/test/registry files in `src/domains/talent/`,
  `src/domains/staffing/`, `src/domains/applications/`, `src/shared/security/`,
  `prisma/schema.prisma` + 3 forward-only migrations
  (`20260928220000_p1a04_scoped_recruiter_authority`,
  `20260929010000_p1a04_correction_recruiter_candidate_claim`,
  `20260929020000_p1a04_correction_hr_staff_handling_claim_insert_rls`).
- **Docs/evidence freeze SHA** `da0834665642721ea9f3f3a35b0ee2f72aaafcf3`:
  task-local evidence files only; no semantic change.
- **Prior pin/update HEAD** `967f8fe5e4f8388e631c089528d9abfc25cea9e1`:
  H-16 control-field pin; forward-only on top of `da083466`; no semantic change.
- **Audit-target HEAD** `7d314fd2b4dc2d32eb5f035b9f00e33a04c3d07a`:
  forward-only on top of `967f8fe5`; 2 docs files (`HANDOFF.md` + `TASK.md`)
  representing the docs/control correction round (I-01..I-08 acceptance
  materialization: `_audit_target_` placeholder externally pinned by T0,
  Correction budget row, control-field truthfulness, AC-24 rewrite, v1.3
  Adoption commit, H-15 control update).
- **Post-freeze source delta** `2056c408..HEAD -- app src prisma tests scripts packages`: empty.

Forbidden-path audit (`2056c408..HEAD`):

- `app/`, `src/`, `prisma/`, `tests/`, `scripts/`, `packages/` — all empty.

### DB runtime evidence

Tier 3 independently re-ran the synthetic Neon DB gate (`ep-empty-forest-azlhfyo9-*`)
three times on the writer/admin pair:

- **DB posture**: writer `app_user_writer` is non-superuser + non-bypassrls
  (`bypassrls=false`, `issuper=false`); admin `neondb_owner` is bypassrls
  (`bypassrls=true`); same host/port/database; synthetic-only cluster.
- **Three P1-A0.4 integration files (×3)**:
  - `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` —
    19 tests × 3 = 57 PASS (3/3 PASS, exit 0).
  - `tests/db/p1a04-canonical-flow.integration.test.ts` — 11 tests × 3 = 33 PASS
    (3/3 PASS, exit 0).
  - `tests/db/p1a04-r3-substantive.integration.test.ts` — 7 tests × 3 = 21 PASS
    (3/3 PASS, exit 0).
  - **Aggregate**: 37 tests × 3 = **111 PASS / 0 FAIL** across all runs.
- **Required-relation closed-set guard**: `src/shared/security/required-relation-sweep.static.test.ts`
  — 11/11 PASS (35 hits, closed set).
- **Targeted unit lane**:
  - `recruiter-workbench.derive.test.ts` — 50/50 PASS.
  - `recruiter-workbench.read-service.test.ts` — 73/73 PASS.
  - `recruiter-assignment.routes.test.ts` — 21/21 PASS.
  - `recruiter-assignment.ui.test.ts` — 7/7 PASS.
  - `recruiter-placement.adapter.test.ts` — 10/10 PASS.
  - `recruiter-placement.routes.test.ts` — 21/21 PASS.
  - `recruiter-placement.routes-transitions.test.ts` — 23/23 PASS.
  - `assignment-placement.routes.test.ts` — 45/45 PASS.
  - `recruiter-assignment.manager.component.test.tsx` — 33/33 PASS.
  - `marketplace-inventory.static.test.ts` — 47/47 PASS.
- **Zero-residue check (independent)**: post-run probe against `ep-empty-forest-*`
  writer session across tracked tables (`ClientCompany`, `Project`,
  `StaffingOrder`, `JobOpening`, `JobPosting`, `CandidateSubmission`,
  `LaborProfile`, `LaborProfileHandlingAssignment`,
  `StaffingOrderRecruiterAssignment`, `PlacementCase`, `Placement`,
  `idempotency_keys`) returns `TOTAL_RESIDUE = 0` on every run.
- **Production DB / production migration**: NOT_RUN; production hostname
  (`ep-shy-tree-az32as2c-*`) never opened. Synthetic-only cluster used.

### SQL posture summary (synthetic)

- SECDEFINER helpers `public.hrp_staffing_order_visible_for(text)` and
  `public.hrp_project_recruiter_visible_for(text)`: `search_path = pg_catalog,
  public` locked; identity derived from `public.hrp_session_role()` /
  `public.hrp_session_user_id()`; `REVOKE EXECUTE … FROM PUBLIC` applied;
  `GRANT EXECUTE … TO app_user_writer, app_user` applied.
- Table `staffing_order_recruiter_assignments` has partial unique index on
  `(staffing_order_id, recruiter_user_id) WHERE status = 'ACTIVE'`.
- Forward-only migrations only; no schema rewrites after
  `20260929020000_p1a04_correction_hr_staff_handling_claim_insert_rls`.
- Recruiter route family `/api/admin/recruiter/placements/...` for `HR_STAFF`;
  admin route family `/api/admin/placements/...` for `ADMIN` / `HR_MANAGER`.
- Dual-authority check at placement command time:
  `assertRecruiterAndHandlingDualAuthorityForPlacement(tx, …)` under
  `pg_advisory_xact_lock(hashtext('p1a04:order:' || id))`.
- Workbench overdue semantics: decision authority is `rawHours >= 72`; display
  `ageHours` may be rounded but cannot decide overdue state; `overdue=true` uses
  `openedAt <= ageThreshold`; `overdue=false` uses `openedAt > ageThreshold`;
  handler expiry is `expiresAt < now`.

## 4. Independent Evidence

| Command | Exit | Result |
| --- | --- | --- |
| `git rev-parse HEAD` | 0 | `7d314fd2b4dc2d32eb5f035b9f00e33a04c3d07a` (matches prompt audit-target) |
| `git rev-parse --abbrev-ref HEAD` | 0 | `codex/t1c-p1a04-scoped-recruiter-authority-impl` |
| `git status --short` | 0 | (empty — clean working tree) |
| `git rev-parse --verify 2056c408… da083466… 967f8fe5… 7d314fd2…` | 0 | all four SHAs resolve |
| `git diff --name-only 2056c408..HEAD` | 0 | 2 files: `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/HANDOFF.md`, `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` |
| `git diff --check 2056c408..HEAD` | 0 | (empty — LF-only, no whitespace-only lines) |
| `git diff 2056c408..HEAD -- app src prisma tests scripts packages` | 0 | (empty — forbidden-path audit clean) |
| `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | 0 | `RESULT: DRAFT-VALID (1 warning(s))`; substance gates A-01..A-05 + T-03..T-11 OK |
| `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | 0 | `RESULT: PASS WITH WARNINGS (1 warning(s))`; H-16 frozen-delivery gate closes; H-15 single advisory on Next-gate field |
| `node .ai-pipeline/scripts/verify-encoding-range.mjs 2056c408 HEAD` | 0 | `RESULT: PASS. 2/2 text file(s); 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks` |
| `npm run typecheck` | 0 | `tsc --noEmit` clean (exit 0) |
| `npx eslint --no-warn-ignored <11 P1-A0.4 changed source/test files>` | 0 | 0 errors / 0 warnings on P1-A0.4 changed surface |
| `CI_INTEGRATION_STRICT=1 npx vitest run tests/db/p1a04-scoped-recruiter-authority.integration.test.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-r3-substantive.integration.test.ts --config vitest.integration.config.ts` | 0 | 3 files / 37 tests / 0 failed (run 1); 3 files / 37 tests / 0 failed (run 2); 3 files / 37 tests / 0 failed (run 3); aggregate 111/111 PASS across all 3 runs |
| `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | 0 | 11/11 PASS; 35 hits (closed set); 0 failed |
| Independent zero-residue probe (`psql` against synthetic writer session) | 0 | `TOTAL_RESIDUE = 0` across all tracked tables (ClientCompany, Project, StaffingOrder, JobOpening, JobPosting, CandidateSubmission, LaborProfile, LaborProfileHandlingAssignment, StaffingOrderRecruiterAssignment, PlacementCase, Placement, idempotency_keys) on every run |

## 5. Coverage Gaps

No AC are `ENV_BLOCKED` in this round — Tier 3 successfully re-ran every
synthetic-DB-gated AC locally on the synthetic Neon cluster
(`ep-empty-forest-azlhfyo9-*`). DB posture, 3 × P1-A0.4 integration files
(37/37 PASS ×3), required-relation closed-set guard, targeted unit lane,
independent zero-residue check, typecheck, lint, encoding, and forbidden-path
audit all measured independently at the audit-target HEAD.

The two global P1 release blockers (`P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`,
`P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY`) are recorded in TASK §4.5/§4.6 and
as AUD-005 (P3 documentation debt). Per T0 directive, they gate the P1 release as
a whole but do NOT gate the correctness or audit eligibility of P1-A0.4; Tier 3
did not expand the audit into implementing them.

The `_audit_target_` placeholder in TASK §0 and HANDOFF §0 (AUD-001) is the only
explicit documentation debt and is classified as P3 / non-blocking per T0
directive 2026-09-29 §5. Tier 3 records the authoritative resolved SHA
(`7d314fd2b4dc2d32eb5f035b9f00e33a04c3d07a`) in §0 above.

## 6. Verdict

**Verdict:** PASS

Rationale: 28/28 TASK §6.1 planning AC independently verified (PASS) at the
audit-target HEAD via Tier 3 live re-run on the synthetic Neon DB and code
inspection; 22/22 TASK §6.2 E2E AC verified (PASS) via the three P1-A0.4
integration suites re-run 3 times each (37/37 PASS ×3, 111/111 total) plus the
required-relation closed-set guard (11/11 PASS) and targeted unit lane (322/322
PASS across 10 unit test files); 0 AC are ENV_BLOCKED. Frozen delivery
(`Implementation SHA = 2056c408283b1f0281ce0ca3b4117c25df82b239`); canonical
gates (`verify-task.ps1` DRAFT-VALID with expected A-04 advisory;
`verify-handoff.ps1` PASS WITH WARNINGS with expected H-15 advisory on
Next-gate; `verify-encoding-range.mjs` 2/2 PASS); tier-3 substance checks
(`git diff --check 2056c408..HEAD` empty; forbidden-path audit empty;
typecheck clean; eslint clean on 11 changed files; integration suites 37/37 ×3;
unit lane 322/322; required-relation 11/11; zero-residue = 0 across 12 tracked
tables ×3 runs) all green. DB posture verified at audit-target HEAD (writer
non-super + non-bypassrls; admin bypassrls; same synthetic target cluster;
production DB NOT touched). No P0/P1/P2 release-blocking findings on the
P1-A0.4 surface. Two global P1 release blockers (JOB_OPENING_ACTIVATION,
SERVICE_MODEL_CLASSIFY) remain open but do NOT gate this round's correctness
or audit eligibility. Tier 1 may resolve on this AUDIT.md.

## 7. Re-audit Trace

| Round | Date | Verdict | Note |
| --- | --- | --- | --- |
| 1 | 2026-09-30 | PASS | Initial LIGHT audit round. All 28 planning AC + all 22 E2E AC independently verified. 5 P3 observations recorded (AUD-001 `_audit_target_` placeholder per T0 directive; AUD-002 stale relative-path references in HANDOFF §3 prose; AUD-003 verify-handoff H-15 Next-gate advisory; AUD-004 verify-task A-04 READY_FOR_AUDIT advisory; AUD-005 two global P1 release blockers out of scope). |

AUDIT.md cho Tier 1
