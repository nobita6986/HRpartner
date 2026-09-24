# HANDOFF — hrp-p0-a04-er003-evidence-record-metadata

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a04-er003-evidence-record-metadata` |
| Spec version | `v1.3` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Execution round | `1` |
| Current audit round | `2` |
| Status | `ACCEPTED` |
| Baseline | `1e1895d16500b273575599cf88853e0d48f08e23` (`origin/main`, post-AFF-04 production-verified #36) |
| Authority | TASK v1.1 blob `4ec7160732a4c106d991f596d570708c1b6717a8` @ `5852e14ae1b89f347ab8912a9b28a56445755fe7` |
| Implementation SHA | see git log `codex/t1b-er003-evidence-record-metadata` HEAD at HANDOFF freeze |
| Executor | `Tier 1B` |
| Next gate | `NONE — MERGED_AND_PRODUCTION_VERIFIED` |

## 1. Outcome and changed surface

ER-003 ships an additive Neon `evidence_records` metadata boundary for one
canonical owner kind in this first slice: `LABOR_PROFILE`. The table holds
METADATA ONLY — never file bytes, public URLs, absolute filesystem paths,
provider roots, credentials, request payloads, or `bytea`. Application
authorization is intentionally NOT introduced in this slice: the table ships
fail-closed with RLS enabled and forced, and explicit `REVOKE` from PUBLIC,
`app_user`, `app_user_writer`. No policy, no grant, no `SECURITY DEFINER`
change, no role change, no default-privilege change.

### Changed surface (only Exact File Allowlist §4.5)

| Path | Change |
|---|---|
| `prisma/schema.prisma` | Add `EvidenceRecord` model + `User.evidenceRecordsCreated` / `LaborProfile.evidenceRecords` back-relations. |
| `prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql` | New forward-only migration: table + 3 indexes + 1 FK to `labor_profiles` (RESTRICT) + 1 FK to `users` (RESTRICT, nullable) + 7 CHECK constraints + ENABLE+FORCE RLS + REVOKE from PUBLIC / app_user / app_user_writer. NO policy, NO grant. |
| `tests/db/er003-evidence-record-metadata.integration.test.ts` | New 19-assertion container-DB integration test (fail-closed when env absent; covers AC-01..AC-06). Authoritative execution against T0's local PostgreSQL 18 synthetic dedicated DB: 19/19 it() cases PASS, 0 skip, 0 fail. |
| `vitest.integration-files.ts` | Register the new test file in the canonical guarded integration lane. |
| `docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/TASK.md` | Materialize v1.1 byte-exact → v1.2 metadata-only bump (control fields, round 3 entry). |
| `docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/HANDOFF.md` | This document. |
| `docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/AUDIT.md` | Tier-3 placeholder; not populated by Tier 1. |

All diff is local to the four allowlisted categories. No file under
`src/domains/evidence/**`, `app/**`, `docs/PLANNER_HANDOVER.md`,
`package.json/package-lock.json`, env/config, AFF/CRM code, or existing
migrations is touched.

## 2. Acceptance evidence

| AC | Evidence | Limitation |
|---|---|---|
| `AC-01` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — "Prisma client materializes evidenceRecord with both declared relations" + "persists a synthetic valid EvidenceRecord"; `npx prisma validate` (exit 0); `npx prisma generate` produces `prisma-client-js` with the `evidenceRecord` model. | Local `npx prisma validate` PASS; canonical CI Integration lane also asserts the same. |
| `AC-02` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — see "evidence_records has ENABLE+FORCE RLS and no policy for any role" + "source_claims partial unique indexes are preserved verbatim (confirmed by AC-02 last-row assertion)". Authoritative run on T0's local PostgreSQL 18 synthetic dedicated DB: clean chain bootstrap pre PASS; `prisma migrate deploy` applied 47/47 migrations; `prisma migrate status` reports "database schema up to date"; bootstrap post PASS. | **PASS** (RESOLVED_BY_T0_SYNTHETIC_DB_RUN — not Neon staging, not production). See E-11. |
| `AC-03` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — 12 distinct rejection cases: valid insert + duplicate `storage_key` + invalid `owner_type` (CHECK) + invalid `evidence_type` (CHECK) + invalid `status` (CHECK) + invalid `checksum` (uppercase / length) (CHECK) + negative `size_bytes` (CHECK) + non-basename `original_filename` (CHECK) + URL-shaped / absolute-path-shaped / blank `storage_key` (CHECK) + `deleted_at` ↔ `status` invariant (CHECK) + orphan FK on `owner_id` + orphan FK on `created_by_user_id` + BigInt `size_bytes` round-trip. Authoritative run on T0's local PostgreSQL 18 synthetic dedicated DB: 1 file, 19/19 it() cases PASS, 0 skip, 0 fail. | **PASS** (RESOLVED_BY_T0_SYNTHETIC_DB_RUN — not Neon staging, not production). See E-11. |
| `AC-04` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — "evidence_records columns are free of bytea / public_url / root_path / token / bytes / blob" introspects `information_schema.columns` and asserts no banned column names. Plus the `rg` 3-hit classification documented in §3 E-04 confirms no banned column on `evidence_records`. | both runnables emitted explicitly in §3 E-04. |
| `AC-05` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — "evidence_records has ENABLE+FORCE RLS and no policy for any role" asserts `relrowsecurity=true`, `relforcerowsecurity=true`, `count(pg_policies)=0`, and 0 rows in `information_schema.role_table_grants` for PUBLIC / app_user / app_user_writer. Plus the writer-session "SELECT rejected SQLSTATE 42501 regardless of ADMIN GUC" assertion. Authoritative run on T0's local PostgreSQL 18 synthetic dedicated DB: posture check confirms `app_user_writer` has `rolsuper=false`, `rolbypassrls=false`; postgres admin has `rolsuper=true`, `rolbypassrls=true`; writer and admin share the same host/port and synthetic DB. POSTURE_OK. | **PASS** (RESOLVED_BY_T0_SYNTHETIC_DB_RUN — not Neon staging, not production). See E-11. |
| `AC-06` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — `describeIf` is `describe.skip` when env absent (CI Integration preflight prints the self-skip token, never `PASS`). Synthetic user/labor-profile IDs are derived from `randomUUID()`; no PII. Authoritative full canonical integration run on T0's local PostgreSQL 18 synthetic dedicated DB (second clean DB): 26/26 test files PASS, 481 passed, 2 intentional skip, 0 failed; ER-003 within the full run is 19/19 PASS. | **PASS** (RESOLVED_BY_T0_SYNTHETIC_DB_RUN — not Neon staging, not production). See E-11. |
| `AC-07` | this row covers all of: Prisma validate (`npx prisma validate` exit 0), Prisma generate (`npx prisma generate` exit 0), typecheck (`npm run typecheck` exit 0), lint (`npm run lint` exit 0 with 0 new warnings from the slice — see §3 E-03), unit (`npm run test:unit` → 2532 passed, 9 skipped, 0 failed), build (`npm run build` exit 0), `pwsh .ai-pipeline/scripts/verify-task.ps1` (`RESULT: PASS`), `pwsh .ai-pipeline/scripts/verify-handoff.ps1` (this very row). | all runnable commands documented in §3 registry; baselined scope check `git diff --check <baseline>..HEAD` (E-08). |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `npx prisma validate` (with placeholder envs) | exit `0` — "The schema at prisma/schema.prisma is valid 🚀" |
| `E-02` | `npx prisma generate` | exit `0` — "Generated Prisma Client (v5.22.0) to ...node_modules@prisma/client in 430ms" |
| `E-03` | `npm run lint` | exit `0`. `node_modules.bin eslint.cmd tests/db/er003-evidence-record-metadata.integration.test.ts` reports 0 findings on the new file. Repo-wide 696 warnings, 0 errors; no new warnings introduced by this slice. |
| `E-04` | `rg --no-heading --line-number 'publicUrl|public_url|rootPath|root_path|token|bytea' prisma/schema.prisma prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql` | 3 hits.  Hit 1 `migration.sql:16`: inline comment header of this migration (word `bytea` is in the design rationale, not a column).  Hit 2 `schema.prisma:1776`: inline comment in LaborProfile model (same wording, documentation).  Hit 3 `schema.prisma:1686`: pre-existing Media.publicUrl field (`@default('') @map('public_url')`) from commit a5de2c4d 2026-09-12.  Zero of the 3 hits is a column on `evidence_records`.  AC-04 integration test asserts `information_schema.columns WHERE table_name='evidence_records'` contains no banned column name; E-04 is the git-layer re-run of the same intent. |
| `E-05` | `npm run typecheck` | exit `0` — `tsc --noEmit` PASS, 0 errors |
| `E-06` | `npm run test:unit` | exit `0` — `Test Files  161 passed (161)` / `Tests  2532 passed | 9 skipped (2541)` |
| `E-07` | `npm run build` | exit `0` — Next.js production build success; First Load JS shared by all = 102 kB |
| `E-08` | `git diff --check 1e1895d16500b273575599cf88853e0d48f08e23..HEAD` and `git diff --name-only 1e1895d16500b273575599cf88853e0d48f08e23..HEAD` | `git diff --check` exit `0` (no whitespace errors); `git diff --name-only` lists only files inside the Exact File Allowlist §4.5 |
| `E-09` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/TASK.md"` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` |
| `E-10` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/TASK.md" -HandoffPath "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/HANDOFF.md"` | exit `0` — `RESULT: PASS.` |
| `E-11` | `container-test-db --phase=pre` → `prisma migrate deploy` → `prisma migrate status` → `container-test-db --phase=post` → `CI_INTEGRATION_STRICT=1 npm run test:integration tests/db/er003-evidence-record-metadata.integration.test.ts` → recreate clean DB → `CI_INTEGRATION_STRICT=1 npm run test:integration` (full) | Local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential). Sequence and exact results:
1. `container-test-db --phase=pre` — exit 0, PASS
2. `prisma migrate deploy` — 47/47 migrations applied
3. `prisma migrate status` — exit 0, "database schema up to date"
4. `container-test-db --phase=post` — exit 0, PASS
5. Posture: `app_user_writer` `rolsuper=false` `rolbypassrls=false`; postgres admin `rolsuper=true` `rolbypassrls=true`; same host/port/synthetic DB. POSTURE_OK
6. Targeted ER-003: 1 file PASS, 19/19 it() cases PASS, 0 skip, 0 fail
7. Recreate clean DB (second pass) and full canonical integration: 26/26 test files PASS, 481 passed, 2 intentional skip, 0 failed; ER-003 within the full run is 19/19 PASS. |
| `E-12` | `git diff --name-only 1e1895d16500b273575599cf88853e0d48f08e23..HEAD` | 0 lines match pg_hba.conf or any forbidden path; scope is clean. |

## 4. Deviations and blockers

| ID | Item | Mitigation / owner |
|---|---|---|
| `DEV-01` | No new migration rolled out to any production DB. Implementation ships code + CI evidence only. Production apply remains a T0 gate. | Tier 0/Owner (per T0 brief 2026-09-24). |
| `DEV-04` | Backslash CHECK was non-conforming under `standard_conforming_strings` (PostgreSQL default since 9.1): the unprefixed literal needed two consecutive backslashes to match a single one, so filenames like `a\b.jpg` slipped through. Final fixed form: `position(E'\\' in "original_filename") = 0` — PostgreSQL `E'\\'` is an escape-string literal whose byte length is exactly 1 (T0 verified `length(E'\\')=1`, `length(E'\\\\')=2`). Fix is in the forward migration only. | Tier 1 |
| `DEV-03` | The integration test uses 15 `$executeRawUnsafe` calls with positional `$1..$N` placeholders. No identifier or value is concatenated dynamically into SQL. The surface is intentional: it exercises CHECK/FK/UNIQUE constraint names directly from PostgreSQL, confirming rejections come from the DB and not from Prisma client validation. No test or runtime code path is affected by this technique. (AUD-003 P3 finding: no action required in this slice.) | Tier 1 |
| `DEV-02` | The ER-003 integration test uses `$executeRawUnsafe` for DB-side rejections (CHECK / FK / UNIQUE) so the test can confirm the rejection comes from PostgreSQL, not Prisma client-side validation. This is internal to the test — no runtime code path is touched. | accepted; §4.5 allowlist explicitly permits the new test file. |
| `BLK-01` | **RESOLVED_BY_T0_SYNTHETIC_DB_RUN** (2026-09-24). Original blocker: local sandbox had no `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`; Integration lane self-skipped per `vitest.integration-files.ts` and printed `ENV_BLOCKED`. Resolution: T0 provisioned a local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential). Authoritative results on that DB: clean-chain bootstrap pre PASS; 47/47 migrations applied; `prisma migrate status` "database schema up to date"; bootstrap post PASS; posture check POSTURE_OK; targeted ER-003 19/19 PASS; full canonical integration 26/26 files PASS, 481 passed, 2 intentional skip, 0 failed. The DB-touching AC rows are now PASS per §2 (see those rows for the exact evidence). | Tier 0/Owner (synthetic DB provision + run). |

## 5. Final status

ER-003 v1.2.2 delivery candidate, including the round-3 migration/test fixes
and round-4 evidence sync, is frozen for T0 merge decision. Code, migration,
integration test, Task delegation copy, and HANDOFF are aligned. The gates listed in
AC-07 have been re-runnable against the rebased baseline
`1e1895d16500b273575599cf88853e0d48f08e23`:

- `npx prisma validate` → exit 0 (E-01)
- `npx prisma generate` → exit 0 (E-02)
- `npm run typecheck` → exit 0 (E-05)
- `npm run lint` → exit 0 (E-03)
- `npm run test:unit` → exit 0; 2532 unit tests pass (E-06)
- `npm run build` → exit 0 (E-07)
- `pwsh .ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS` (E-09)
- `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → `RESULT: PASS` (E-10)
- `git diff --check <baseline>..HEAD` and `git diff --name-only` (E-08)

The DB-touching acceptance criteria (AC-02 / AC-03 / AC-05 / AC-06) have been
authoritatively executed against T0's local PostgreSQL 18 synthetic dedicated DB
(NOT Neon staging, NOT production, no production credential). Sequence and results
are documented in §3 E-11; BLK-01 is now RESOLVED_BY_T0_SYNTHETIC_DB_RUN.

No push, no PR, no merge, no production migration occurred during Tier 1
execution. Tier 3 LIGHT/DELTA round 2 returned `PASS`; the next gate is
`T0_MERGE_DECISION`.

Post-audit T0 freeze (2026-09-24): closed non-blocking `AUD-006` by replacing
the stale "v1.2 implementation is FROZEN" slogan with the exact v1.2.2 + R3 +
R4 delivery state. Control metadata now records audit round 2 and
`T0_MERGE_DECISION`; `READY_FOR_AUDIT` is retained because the LIGHT verifier
does not accept a post-audit review status. No code, migration, schema, test, runtime, registration,
or environment change was made in this post-audit sync.

Round 3 correction (2026-09-24):
- ER003-R3-F1: backslash CHECK corrected to `position(E'\\' in "original_filename") = 0` — escape-string literal with byte length exactly 1 (verified by T0: `length(E'\\')=1`, `length(E'\\\\')=2`).
- ER003-R3-F1 follow-up: CHECK expression corrected from `E'\\\\'` (4-char source, 2-byte literal) back to `E'\\'` (2-char source, 1-byte literal).
- ER003-R3-F2: AC-05 writer test now uses `$transaction` with `set_config` inside the same transaction as the SELECT (required because `is_local=true` expires at statement end and Prisma does not guarantee same connection for subsequent queries). The SELECT is expected to throw; the error must carry SQLSTATE 42501 ("permission denied" / PrismaClientUnknownRequestError). No reliance on Prisma error code P2025 (P2025 = RecordNotFound, unrelated to RLS denial).

Round 4 evidence-sync (2026-09-24): documentation-only. BLK-01 closed as RESOLVED_BY_T0_SYNTHETIC_DB_RUN after T0 provisioned a local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential). AC-02..AC-06 promoted to PASS per §3 E-11 exact sequence (clean chain 47/47; posture POSTURE_OK; targeted 19/19; full integration 26/26 files, 481 passed, 2 intentional skip, 0 failed; ER-003 within full run 19/19 PASS). Spec stays v1.2.2 (no semantic contract change). Status stays READY_FOR_AUDIT. Tier 3 verdict not pre-judged. No code/test/migration/schema/registration/runtime/env change; AUDIT.md Tier 3 untouched.

Round 2 correction (2026-09-24): AUD-001 (E-04 truthful 3-hit classification),
AUD-002 (19-assertion / 19 it() cases), AUD-003 (15 $executeRawUnsafe surface acknowledged).

Handoff status: ACCEPTED

## 6. Closeout

**T1A closeout (2026-09-24):**
- T0 verification PASS: PR #37 squash-merged at `2fb4dee919ccb045121a01fb8b87897b90e57f93`; final PR head `bae89fab1200de94b2358d9caa55f7ba04f9ea40`; CI run `35979076741` PASS.
- Production read-only verification: migration `20260924120000_er003_evidence_record_metadata` is finished and not rolled back; `evidence_records` exists with 13 columns, RLS + FORCE RLS, 0 policies, 0 forbidden grants to `PUBLIC` / `app_user` / `app_user_writer`, and 0 rows. The verification performed no mutation.
- Contract closed out as metadata-only slice. Không runtime upload/read/delete wiring.
