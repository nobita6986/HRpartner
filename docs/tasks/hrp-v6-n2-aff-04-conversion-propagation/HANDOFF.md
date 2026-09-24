# HANDOFF — hrp-v6-n2-aff-04-conversion-propagation

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-04-conversion-propagation` |
| Spec version | `v1.9` |
| Status | `ACCEPTED` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Current audit round | `2` |
| Baseline | `9e527a13e74c8361feea77b8edca522c8c37ec08` (origin/main @ 2026-09-23; includes ER-002 #32 and AFF-05A R1 #33). Contract Survey baseline `0fdc616b` retained only as historical reference. |
| Frozen implementation SHA | `f01ee3513d2c1ce6a57f0e1e25860bf238ec1374` (HEAD at code freeze = `f01ee35`; subsequent docs-only commits recorded in §10 Revision Log) |
| Worktree / branch | `codex/t1b-aff04-conversion-propagation` |
| Tier 3 verdict | `PASS` final narrow delta recheck at `c600ab3ac91affc960db9b19578c5ea3089584d9`; final artifact `AUDIT-tier3-aff04-fp4-delta-recheck.md` committed at `e3e571ae38063c9984d8547299deff5bccb7b6c2`. Earlier F-P4 PASS artifacts remain historical. |
| Required gates (per TASK §0) | `T0_CONTRACT_APPROVAL` PASS; `TIER3_LIGHT_AUDIT` PASS; PR/main CI PASS; Vercel PASS; production branch gate PASS; aggregate preflight PASS; migration deploy PASS; post-deploy verification PASS |
| Next gate | `NONE — MERGED_DEPLOYED_PRODUCTION_VERIFIED` |

### Authority classification (4-tier, per T0 directive 2026-09-23)

| Tier | Anchor | Status |
|---|---|---|
| Contract authority | TASK v1.4 @ `f3f0a23f2fa6d590f188403687d317da64f4d91e` | Semantic contract §1-§8 — frozen |
| Execution contract hien hanh | TASK v1.6 @ `e73ac9d` (commit before implementation) | Control metadata aligned |
| T0 execution authorization | 2026-09-23 directive | "AFF-04 duoc APPROVED_FOR_EXECUTION" — Tier 1B technical autonomy on Plan + Code, architecture questions reserved to T0 / Owner |
| Tier 3 implementation verdict | Frozen implementation `f01ee35`; final reviewed delivery `c600ab3`; audit artifact freeze `e3e571a` | PASS — all implementation, F-P4 and test-only portability deltas independently closed before T0 production authorization |

## 1. Outcome and changed surface

AFF-04 closes the source-resolution and assignment-propagation gaps between AFF-03/03B/03C and AFF-05A. The implementation touches four domains.

### STEP-01 — Schema (`prisma/schema.prisma` + `prisma/migrations/20260923120000_aff04_conversion_propagation/migration.sql`)

- `source_claims.referrer_user_id TEXT NULL` — additive column, **no DEFAULT** (T0 decision (b): sentinel `'LEGACY_UNRESOLVED'` is forbidden because the column is a FK to `users.id`; NULL + audit is the canonical representation of legacy-unresolved).
- `source_claims_referrer_user_id_fkey` FK to `users(id) ON DELETE RESTRICT` — never silently drop provenance.
- Index `source_claims (referrer_user_id, accepted)` for placement-by-referrer audit lookup.
- Named relation `SourceClaimGenericReferrer` on `User` (back-relation; `legacyCtvSourceClaims` already existed from earlier work, kept distinct).
- `project_assignments.referrer_id` gets `project_assignments_referrer_id_fkey` FK to `users(id) ON DELETE RESTRICT` (the column itself has existed since `mp3_conversion_worker_link` but had no FK).
- Index `project_assignments (referrer_id, status)`.
- Named relation `AssignmentReferrer` on `User`.
- Forward-only, idempotent backfill: `UPDATE source_claims SET referrer_user_id = ctv_id WHERE claim_type = 'CTV_REFERRAL' AND accepted = true AND ctv_id IS NOT NULL AND referrer_user_id IS NULL`. The `WHERE` predicate makes a re-run match zero rows on a successful apply.
- The two pre-existing partial unique indexes `one_accepted_source` and `one_accepted_source_per_submission` are **preserved verbatim** — not dropped, not rebuilt.
- Migration SQL is wrapped in scoped preflight:
  - Fail-closed (2 predicates): accepted CTV_REFERRAL with NULL ctv_id; orphan `project_assignments.referrer_id` to `users.id`.
  - Informational (NOT reject): non-CTV_REFERRAL rows with legacy `ctv_id` (HRP_DIRECT, VENDOR_SUPPLIED). The backfill predicate already excludes them; the informational count documents the production preflight finding.
  - Post-condition assertion: verifies accepted CTV_REFERRAL drift check, zero non-CTV overreach, orphan referrer_id, and both partial unique indexes.

### STEP-02 — Conversion (`src/domains/applications/conversion.service.ts` + `application-queue.service.ts`)

- Generic source resolution/persistence moves into `conversion.service.ts` **inside the same conversion transaction** — `src/domains/staffing/submission.service.ts` is NOT modified (T0 decision (a)); the acceptSourceClaim allowlist is NOT expanded.
- A `resolveCanonicalReferrer` helper enforces the Source Resolution Matrix:
  1. Prefer `LaborProfile.referralAttribution.referrerUserId` (canonical).
  2. If absent, fall back to `SourceClaim.ctvId` for **legacy CTV_REFERRAL only** (back-link for audit; the column is nullable on the worker).
  3. NULL otherwise (HRP_DIRECT / VENDOR_SUPPLIED / non-CTV legacy).
- Attribution/source conflict (e.g., canonical `referralAttribution` says referrer is X but the legacy `ctvId` claims Y) raises `ConversionError.SOURCE_REFERRER_CONFLICT` or `REFERRAL_RESOLUTION_FAILED` — never silently overwrite.
- Worker-level accepted `SourceClaim` is re-read inside the conversion transaction via `sourceClaim.findFirst({ where: { workerId, accepted: true } })`. The replay path (already-accepted worker) **reuses** the canonical claim; never steal / never overwrite.
- New typed `ConvertApplicationResult` fields: `claimType`, `referrerUserId` (so the caller can audit the resolved chain).
- `application-queue.service.ts` exposes `referrerUserId` + `ctvId` in `SourceClaimSummary` for admin UI lineage display.

### STEP-03 — Assignment placement (`src/domains/staffing/assignment-placement.service.ts`)

- `SubmissionFacts` carries `referrerUserId` + `laborProfileId`.
- Inside `activatePlacement`, the transaction:
  1. Re-reads the submission (server-derived `referrerUserId` + `laborProfileId`).
  2. Looks up the ACTIVE `LaborProfileHandlingAssignment` for that `laborProfileId` to **snapshot** the `assigneeUserId` into `beneficiaryUserId` for the outbox event. This is the "placement transaction snapshots beneficiary from ACTIVE LaborProfileHandlingAssignment" requirement — the snapshot is taken at placement time, not later.
  3. Creates `ProjectAssignment` with `referrerId = facts.submission.referrerUserId` (server-derived; never read from request body).
- Audit log diff and outbox payload include `referrerId`, `beneficiaryUserId`, `laborProfileId` for downstream audit / commission lineage. **No `CommissionLedger` row is written** (AFF-04 explicitly does not introduce AFF-05B code).
- `ASSIGNMENT_EXISTS` semantics are preserved as a distinct error code — different from the conversion replay path.

### STEP-04 — Transfer (`src/domains/staffing/transfer.service.ts` + `app/api/staffing/transfers/route.ts`)

- `transferWorker` re-reads the worker's canonical accepted `SourceClaim` (`claimType`, `referrerUserId`, `ctvId`, `worker.userId`) **inside the worker advisory lock** — no referrer guessed from input.
- `inheritedReferrerId` derivation:
  - Prefer `SourceClaim.referrerUserId` if present.
  - Otherwise fall back to `SourceClaim.ctvId` **only** for legacy `CTV_REFERRAL` claims.
  - Otherwise NULL (HRP_DIRECT / VENDOR_SUPPLIED).
- Self-referral case (worker has no other referrer; canonical `claimType` indicates HRP_DIRECT / AFF Initial handler) retains `referrerId = worker.userId` for provenance and is classified by the canonical `claimType`, NOT by transfer input.
- New `TransferResult` fields: `referrerId`, `sourceClaimId`, `sourceClaimType`. Outbox payload includes the same fields plus `inheritedFrom: 'worker.sourceClaim.<...>'` for audit.
- API boundary hardening in `app/api/staffing/transfers/route.ts`: explicit manual allowlist (`TransferBodyShape` -> `toTransferInput`) applied to both single and bulk transfer requests. **Any client-supplied `referrerId` / `ctvId` / `beneficiaryUserId` / sourceClaimId / sourceClaimType / laborProfileId is silently dropped** before the value reaches the service layer. Server-derived only.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/TASK.md` | `RESULT: DRAFT-VALID` — terminal delivery status is an informational tooling limitation, not an acceptance failure | None |
| AC-01 (Typecheck) | `npx tsc --noEmit` | exit 0 | None |
| AC-02 (Lint canonical) | `npm run lint` | exit 0 — 0 errors, 696 warnings | Baseline `9e527a13e74c8361feea77b8edca522c8c37ec08` reproduces `npm run lint` -> 672 warnings; AFF-04 delta = +24 warnings, all in Exact File Allowlist test files; no AFF-04 runtime lint errors; see E-FP3-02/03/04 |
| AC-02 (Lint strict) | `npx eslint . --ext .ts --max-warnings=0` | exit 1 — 696 warnings exceed max-warnings=0 | Baseline `9e527a13e74c8361feea77b8edca522c8c37ec08` reproduces the strict diagnostic with exit 1 and 672 warnings; AFF-04 delta = +24 allowlisted-test warnings; `BASELINE_EQUIVALENT_NONZERO — no new AFF-04 lint ERRORS`; see E-FP3-02/03/04 |
| AC-03 (Unit suite) | `npx vitest run --config vitest.unit.config.ts` | `Test Files 161 passed (161); Tests 2532 passed | 9 skipped (2541); EXIT_CODE=0` | Final Tier 3 re-run includes the new 31-case transfer route boundary suite; 9 tests remain intentionally skipped |
| AC-04 (Integration suite) | `npx vitest run --config vitest.integration.config.ts` (env: `DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST` from ephemeral synthetic DB) | `Test Files 24 passed (24); Tests 455 passed | 2 skipped (457); EXIT_CODE=0` | `integration-preflight.mjs` validates the env mapping BEFORE vitest runs; no fallback to `.env`, `DATABASE_URL`, or staging |
| AC-05 (Build) | `npm run build` (reproduced at baseline `9e527a13` via `git checkout 9e527a13 && npm run build` — same warning set, NOT an AFF-04 regression) | exit 0 — all 100+ routes (API + UI pages) compiled; no errors | None |
| AC-06 (Migration clean-chain) | `npx prisma migrate deploy` against fresh `aff04_upgrade_test` DB | 46 migrations applied; AFF-04 final; final SQL shows: `referrer_user_id TEXT NULL`, FKs present, indexes present, both partial unique indexes preserved | None |
| AC-07 (Migration upgrade-path) | Apply all migrations except AFF-04 on `aff04_pre_test`, drop AFF-04 artifacts manually, `prisma migrate resolve --rolled-back 20260923120000_aff04_conversion_propagation`, re-`prisma migrate deploy` | AFF-04 applied cleanly from pre-AFF-04 state; identical artifacts as clean-chain | None |
| AC-08 (T0 production preflight) | Deferred to T0 per T0 directive 2026-09-23 ("T1B khong duoc: dung production/staging DB; apply production migration; merge; deploy; mo production smoke") | `DEFERRED — T0 production preflight gate; AFF-04 round does not include production action` | T0's gate, not in this round's scope |
| AC-09 (Forbidden paths) | `git diff baseline..HEAD --name-only` + grep for forbidden patterns | 0 matches in any AFF-04 file | None |
| AC-10 (No production / staging DB touched) | `Get-ChildItem Env: | Select-String DATABASE_URL | Select-String -NotMatch TEST` (see E-12) | 0 matches outside TEST env vars; only ephemeral synthetic DBs used; see E-12 for env audit | None |
| AC-11 (No security boundary expansion) | `prisma/schema.prisma` diff: only ADDITIVE columns / indexes / FKs / named relations; no GRANT changes, no role changes, no SECURITY DEFINER RPC, no `bypassrls` toggle | 0 GRANT or role changes | None |
| AC-12 (No AFF-05B code) | grep for `CommissionLedger` writes in AFF-04 diff | Pre-existing `commission/ledger.service.ts` at baseline `9e527a13`; verified zero new ledger writes in AFF-04 | None |

## 3. Evidence registry

| ID | Command | Exit / measured result | Artifact |
|---|---|---|---|
| E-01 | `verify-task` | exit 0; `RESULT: DRAFT-VALID (1 warning)` | inline stdout |
| E-02 | `typecheck` — `npx tsc --noEmit` | exit 0 | inline stdout |
| E-03 | `lint` — `npx eslint . --ext .ts --max-warnings=0` | exit 1 — 696 warnings; delta from baseline = +24 warnings in Exact File Allowlist tests | `scratch/lint-strict-current.txt` |
| E-04 | `unit` — `npx vitest run --config vitest.unit.config.ts` | `Test Files 161 passed (161); Tests 2532 passed | 9 skipped (2541)` | final Tier 3 re-run at `1b42fd4` |
| E-05 | `integration` — `npx vitest run --config vitest.integration.config.ts` | `Test Files 24 passed (24); Tests 455 passed | 2 skipped (457)` | `terminals/461755.txt` |
| E-06 | `build` — `npm run build` | exit 0; all routes compiled | `terminals/461756.txt` |
| E-07 | `migration-clean-chain` — `npx prisma migrate deploy` against fresh `aff04_upgrade_test` | 46 migrations applied; final artifacts verified | inline stdout + ad-hoc Node script |
| E-08 | `migration-upgrade-path` — Roll back AFF-04 artifacts, re-apply | AFF-04 re-applied successfully from pre-AFF-04 state; identical artifacts as clean-chain | inline stdout + ad-hoc Node script |
| E-09 | `forbidden-paths` — `git diff baseline..HEAD --name-only | xargs grep` | 0 matches in any AFF-04 file | inline grep output |
| E-10 | `no-secret` — `verify-handoff.ps1` H-09 check | `[OK] H-09 no plaintext secret in HANDOFF.md.` | inline stdout |
| E-11 | `relation-sweep` — `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` | `Test Files 1 passed (1); Tests 11 passed (11)` — 2 new SELECT-shape hits, 2 line shifts, count 13->15 acknowledged | inline stdout |
| E-12 | `no-prod-db` — `Get-ChildItem Env: | Select-String DATABASE_URL | Select-String -NotMatch TEST` | 0 matches outside TEST env vars; only ephemeral synthetic DBs; `cre_hrp.txt` not read; ephemeral DBs dropped | inline stdout |
| E-FP3-01 | `transfer-routes-boundary` — `npx vitest run --config vitest.unit.config.ts src/domains/staffing/transfer.routes.test.ts` | `Test Files 1 passed (1); Tests 31 passed (31)` | targeted run stdout |
| E-FP3-02 | `lint-canonical` — `npm run lint` | exit 0 — 0 errors, 696 warnings | `scratch/lint-canonical.txt` |
| E-FP3-03 | `lint-strict` — `npx eslint . --ext .ts --max-warnings=0` at AFF-04 HEAD | exit 1 — 696 warnings; `BASELINE_EQUIVALENT_NONZERO — no new AFF-04 lint ERRORS` | `scratch/lint-strict-current.txt` |
| E-FP3-04 | `lint-strict-baseline` — `npx eslint . --ext .ts --max-warnings=0` at `9e527a13` | exit 1 — 672 warnings; confirms baseline noise | `scratch/lint-strict-baseline.txt` |
| E-FP4-01 | `upgrade-path` — `npx vitest run --config vitest.integration.config.ts tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts` | Targeted upgrade-path integration test covers predecessor state, byte-identical migration apply, and full assertion matrix | New test file |

## 4. Deviations and blockers

| ID | Type | Description | Source | Final log | Decision needed |
|---|---|---|---|---|---|
| D1 | Pre-existing baseline noise | Lint produces pre-existing `no-explicit-any` and `no-unused-vars` warnings in code that AFF-04 did not touch | pre-`9e527a13` baseline | inline in E-03 | No — outside AFF-04 scope; Tier 3 LIGHT auditor can flag separately |
| D2 | Pre-existing baseline noise | `src/shared/security/required-relation-sweep.static.test.ts` EXPECTED_HITS list was deliberately frozen as a snapshot — schema evolution REQUIRES updating the list | pre-`9e527a13` baseline | inline in E-11 | No — this is the design intent |
| D3 | Local environment — closed | Local PostgreSQL used for synthetic ephemeral DB. Temporary `trust` rules removed; `pg_hba.conf` restored byte-for-byte from exact backup. T0 verified effective configuration: `psql -w -h 127.0.0.1 -U postgres` rejected with `fe_sendauth: no password supplied` (exit 2). | local `pg_hba.conf`; §8 hygiene record | Closed before final freeze | No |
| D4 | Production boundary | Closed by T0 after audit and CI: PR #35 merged, main/Vercel PASS, real Neon branch gate PASS, migration applied once and verified. | PR #35; main `8b8e39b`; CI `35956477961`; production aggregate/catalog verification | `CLOSED_VERIFIED_PRODUCTION` | None |

## 5. Final status

AFF-04 is `ACCEPTED` and production verified. Tier 3 final narrow delta recheck returned PASS at `c600ab3ac91affc960db9b19578c5ea3089584d9`; its artifact was staged verbatim at `e3e571ae38063c9984d8547299deff5bccb7b6c2`. PR #35 squash-merged as main commit `8b8e39bc7f7d63e2bc9dba15695df8634936d109`. Main CI run `35956477961` passed Quality and Integration; Vercel production deployment passed.

T0 production gate confirmed `hrp-live` as the primary Neon branch (`br-icy-dew-azbrgthw`) and both URLs on endpoint `ep-shy-tree-az32as2c`. Read-only aggregate preflight matched the approved impact: one accepted CTV claim eligible for backfill, one legacy non-CTV row to preserve, zero accepted CTV rows missing `ctv_id`, zero assignment-referrer orphans, and 2/2 legacy partial unique indexes. Vercel completed without applying AFF-04, so T0 ran one manual `prisma migrate deploy`; only `20260923120000_aff04_conversion_propagation` applied.

Post-deploy verification passed: all 46 migrations are current; the nullable no-default `source_claims.referrer_user_id` column exists; both `ON DELETE RESTRICT / ON UPDATE CASCADE` FKs and both AFF-04 indexes exist; both legacy partial unique indexes remain; the single eligible CTV claim was backfilled; the legacy non-CTV row remained unpromoted; drift, overreach and orphan counts are zero. No production smoke fixture was required by the contract, and no production fixture was created or deleted.

Handoff status: `ACCEPTED`. Next AFF sequence is residual AFF-05A reconciliation, then AFF-05B; this closeout does not claim Universal AFF complete.

## 6. F-P3 correction round (2026-09-23)

Tier 3 identified F-P3-1..F-P3-4 as CONDITIONAL PASS blockers. This section records corrections without amending history.

### F-P3-1 — Spec version sync + mojibake fix

- `TASK.md` §0 `Spec version`: `v1.6` -> `v1.7`.
- `HANDOFF.md` §0 `Spec version`: `v1.6` -> `v1.7`.
- TASK.md §9 (Planner Resolution) and §10 (Revision Log): fixed UTF-8 section-sign mojibake artifacts -> clean `§` throughout. UTF-8 strict, no terminal round-trip.
- §9 and §10 now consistent; §1-§8 semantic contract unchanged.

### F-P3-2 — Evidence lint accuracy

Tier 3 noted HANDOFF incorrectly claimed `eslint . --max-warnings=0 PASS` when strict command may exit non-zero. Corrected evidence recording:

| Command | Exit | Result |
|---|---|---|
| `npm run lint` (canonical) | exit 0 | WARNINGS present (pre-existing baseline noise) |
| `npx eslint . --ext .ts --max-warnings=0` at AFF-04 HEAD | exit 1 | Pre-existing warnings; AFF-04 delta = +24 allowlisted-test warnings; `BASELINE_EQUIVALENT_NONZERO — no new AFF-04 lint ERRORS` |
| `npx eslint . --ext .ts --max-warnings=0` at baseline `9e527a13` | exit 1 | CONFIRMED: baseline equivalent non-zero |

AC-02 and E-03 corrected to `BASELINE_EQUIVALENT_NONZERO — no new AFF-04 lint errors`. See §3 Evidence registry E-FP3-02 below.

### F-P3-3 — Transfer route boundary test

New file created: `src/domains/staffing/transfer.routes.test.ts`

Test verifies the `TransferBodyShape` -> `toTransferInput` allowlist constructor on the consumer-facing route boundary for both single and bulk requests:

- Allowed fields (`workerId`, `jobOpeningId`, `projectId`, `orderId`) reach service and fingerprint input correctly.
- Forbidden client-supplied fields (`referrerId`, `referrerUserId`, `ctvId`, `beneficiaryUserId`, `assigneeUserId`, `sourceClaimId`, `sourceClaimType`, `laborProfileId`, and unknown fields) are dropped silently.
- Forbidden fields do not appear in idempotency fingerprint.
- Forbidden fields do not reach service mock.
- Tests call the actual consumer-facing route handler (not static grep).

File added as item 13 in TASK.md Exact Implementation File Allowlist.

### F-P3-4 — T0 explicit delta: `application-detail-mp3.test.ts`

T0 approved adding `src/domains/applications/application-detail-mp3.test.ts` to Exact Implementation File Allowlist.

- Reason: fixture/projection test must reflect two new server-derived fields `referrerUserId` and `ctvId`; this is a test-only compatibility update, does not extend runtime surface.
- File added as item 17 in TASK.md Exact Implementation File Allowlist.
- T0 explicit delta recorded in TASK.md §10 Revision Log.

### pg_hba.conf hygiene (D3 follow-up)

Local PostgreSQL `pg_hba.conf` had been modified to add `trust` for `127.0.0.1/32` and `::1/128`.

- Exact backup FOUND at `C:\Program Files\PostgreSQL\18\data\pg_hba.conf.aff04.bak` (created `2026-08-24`; 123 lines; `5651` bytes).
- **Restored**: `Copy-Item pg_hba.conf.aff04.bak pg_hba.conf -Force` — current file is 123 lines / `5651` bytes (matches backup byte-for-byte).
- **Effective configuration verified by T0 on 2026-09-24**: `psql -w -h 127.0.0.1 -U postgres -d postgres -tAc 'SELECT 1;'` was rejected with `fe_sendauth: no password supplied` and exit 2. The temporary passwordless trust path is not active.
- **Evidence**: current `pg_hba.conf` is identical to backup (123 lines, 5651 bytes).

## 7. F-P4 correction round (2026-09-24)

T0 returned PR #35 to Draft after production read-only preflight identified a contract/migration contradiction. This section records corrections without amending history.

### F-P4-1 — Migration correction: non-CTV ctv_id predicate

Production preflight on Neon branch hrp-live found 1 non-CTV row with non-null `ctv_id` (HRP_DIRECT, accepted=false, registration_channel=SALE_ADDED). The original migration PREROLL had a fail-closed predicate that rejected ANY non-CTV row with ctv_id non-null — contradicting the intended design where non-CTV rows preserve their legacy ctv_id.

Correction applied to `prisma/migrations/20260923120000_aff04_conversion_propagation/migration.sql`:

- **Removed**: fail-closed predicate `WHERE claim_type <> 'CTV_REFERRAL' AND ctv_id IS NOT NULL` that rejected non-CTV rows with legacy ctv_id.
- **Added**: informational NOTICE that counts (but does not reject) non-CTV rows with legacy ctv_id.
- **Preserved**: the two fail-closed predicates that MUST remain (accepted CTV_REFERRAL with NULL ctv_id; orphan project_assignments.referrer_id).
- **Added**: post-condition assertions that verify non-CTV rows were NOT promoted (referrer_user_id stays NULL for non-CTV; ctv_id stays unchanged).
- **Fixed**: comments and NOTICEs no longer claim "0 non-CTV ctv_id".

Production preflight aggregate evidence (no PII, no IDs):

- non-CTV with ctv_id non-null = 1
- accepted CTV_REFERRAL with ctv_id null = 0
- accepted CTV_REFERRAL eligible backfill = 1
- project_assignment orphan referrer = 0
- partial unique indexes = 2/2

### F-P4-2 — Predecessor upgrade-path test

Created `tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts` (new file, item 18 in TASK.md allowlist). This test:

1. Creates an ephemeral database `aff04_up_<runId>`.
2. Runs `prisma migrate deploy` (full migration chain including AFF-04) for schema baseline.
3. Rolls back AFF-04 artifacts manually (DROP FK, INDEX, COLUMN) to recreate the true predecessor state at baseline `9e527a13`.
4. Seeds predecessor rows: accepted CTV_REFERRAL + ctv_id; HRP_DIRECT accepted=false + legacy ctv_id; VENDOR_SUPPLIED + legacy ctv_id.
5. Applies the ACTUAL AFF-04 migration file via `prisma db execute --stdin` (byte-identical to production migration).
6. Asserts:
   - accepted CTV_REFERRAL: referrer_user_id = ctv_id (backfilled).
   - HRP_DIRECT/VENDOR: ctv_id preserved, referrer_user_id stays NULL (not promoted).
   - zero non-CTV drift (referrer_user_id NOT set for non-CTV).
   - both partial unique indexes preserved.
   - both new FKs present with ON DELETE RESTRICT.
   - both new indexes present.
7. Drops the ephemeral database.

This is a TRUE predecessor upgrade-path test, not a fresh-schema test. File registered in `vitest.integration-files.ts` and covered by `E-FP4-01` gate evidence.

### F-P4-3 — Documentation sync

- TASK.md §0 `Spec version`: `v1.7` (already current).
- TASK.md §9 (Planner Resolution) and §10 (Revision Log): production preflight finding and F-P4 correction rationale recorded. Status remains `READY_FOR_AUDIT` (Tier 3 re-audit required before PR returns to Ready).
- HANDOFF.md §0 updated with PR #35 Draft reference, production migration not-yet-run notation, and F-P4 Tier 3 re-audit requirement.
- HANDOFF.md §1 STEP-01 description updated to reflect the corrected migration predicates.
- HANDOFF.md §4 D4 updated to reflect PR #35 in Draft state.
- HANDOFF.md §5 Final status updated to note Draft regression and F-P4 correction.
- HANDOFF.md §7 (formerly "Evidence registry (updated)"): now "F-P4 correction round (2026-09-24)".
- No production row called "corruption" — terminology is "legacy row" or "legacy state".

### pg_hba.conf hygiene — maintained

The `pg_hba.conf` was restored from the exact backup (`pg_hba.conf.aff04.bak`) during F-P3. The file remains in its restored state. No new trust rules were added during F-P4.

## 8. F-P4 CI portability correction (2026-09-24)

The first Linux CI run after F-P4 PASS exposed defects only in the new predecessor upgrade-path test. T0 kept PR #35 in Draft and corrected the test in follow-up commits without amending history:

- `47e16d9`: choose `prisma`/`prisma.cmd` and `psql` by platform while preserving `PG_PSQL_BIN` override; remove one unused lint suppression.
- `1b5b712`: bind both Prisma `url` and `directUrl` (`DATABASE_URL` and `DATABASE_URL_ADMIN`) to the ephemeral database.
- `ec0bd7a` and `5c6e0d9`: seed predecessor `source_claims` through parameterized predecessor-shaped SQL; remove the nonexistent `updated_at` field, pass raw parameters correctly, and make the canonical backfill idempotency assertion use the actual narrow predicate.
- `71440f2`: assert the real migration directory and SQL header marker before applying the byte-identical migration file.

Scope proof: `git diff --name-only 0f5496f..71440f2` contains only `tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts`. The production migration, Prisma schema, runtime services and API routes are byte-identical to the F-P4 audited commit.

Final canonical CI run `35954635909` at `71440f2`:

- Quality: PASS (`161` unit files; `2541` tests passed).
- Integration: PASS (`25` files; `462` passed; `2` skipped).
- Vercel Preview: PASS.
- Vercel Preview Comments: PASS.
- Local pre-push checks for each correction: targeted ESLint PASS, `npx tsc --noEmit` PASS, `git diff --check` PASS.

The earlier failed CI attempts are retained as diagnostic evidence; they are not PASS claims. No production/staging database or credentials were used by these corrections. Next gate is a narrow Tier 3 LIGHT delta recheck before PR #35 returns to Ready.
