# HANDOFF — hrp-p0-a04-er003-evidence-record-metadata

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a04-er003-evidence-record-metadata` |
| Spec version | `v1.2` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Execution round | `1` |
| Current audit round | `0` |
| Status | `READY_FOR_AUDIT` |
| Baseline | `1e1895d16500b273575599cf88853e0d48f08e23` (`origin/main`, post-AFF-04 production-verified #36) |
| Authority | TASK v1.1 blob `4ec7160732a4c106d991f596d570708c1b6717a8` @ `5852e14ae1b89f347ab8912a9b28a56445755fe7` |
| Implementation SHA | see git log `codex/t1b-er003-evidence-record-metadata` HEAD at HANDOFF freeze |
| Executor | `Tier 1B` |
| Next gate | `TIER3_LIGHT_AUDIT` |

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
| `tests/db/er003-evidence-record-metadata.integration.test.ts` | New 14-test container-DB integration test (fail-closed; ENV_BLOCKED unless `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` set). Covers AC-01..AC-06. |
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
| `AC-02` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — see "evidence_records has ENABLE+FORCE RLS and no policy for any role" + "source_claims partial unique indexes are preserved verbatim (confirmed by AC-02 last-row assertion)"; clean chain is gated by CI Integration lane `CI_INTEGRATION_STRICT=1 npm run test:integration`. | CI-only authoritative execution in CI Integration lane proves clean-chain + RLS posture + scope preservation. See E-11. |
| `AC-03` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — 12 distinct rejection cases: valid insert + duplicate `storage_key` + invalid `owner_type` (CHECK) + invalid `evidence_type` (CHECK) + invalid `status` (CHECK) + invalid `checksum` (uppercase / length) (CHECK) + negative `size_bytes` (CHECK) + non-basename `original_filename` (CHECK) + URL-shaped / absolute-path-shaped / blank `storage_key` (CHECK) + `deleted_at` ↔ `status` invariant (CHECK) + orphan FK on `owner_id` + orphan FK on `created_by_user_id` + BigInt `size_bytes` round-trip. | CI-only authoritative execution in CI Integration lane proves clean-chain + RLS posture + scope preservation. See E-11. |
| `AC-04` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — "evidence_records columns are free of bytea / public_url / root_path / token / bytes / blob" introspects `information_schema.columns` and asserts no banned column names. Plus `rg -n "publicUrl|public_url|rootPath|root_path|token|bytea" prisma/schema.prisma prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql` returns 0 hits. | both runnables emitted explicitly in §3 E-04. |
| `AC-05` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — "evidence_records has ENABLE+FORCE RLS and no policy for any role" asserts `relrowsecurity=true`, `relforcerowsecurity=true`, `count(pg_policies)=0`, and 0 rows in `information_schema.role_table_grants` for PUBLIC / app_user / app_user_writer. Plus the writer-session "sees 0 rows even as ADMIN GUC" assertion. | CI-only authoritative execution in CI Integration lane proves clean-chain + RLS posture + scope preservation. See E-11. |
| `AC-06` | `tests/db/er003-evidence-record-metadata.integration.test.ts` — `describeIf` is `describe.skip` when env absent (CI Integration preflight prints `ENV_BLOCKED`, never `PASS`). Synthetic user/labor-profile IDs are derived from `randomUUID()`; no PII. | CI-only authoritative execution in CI Integration lane. See E-11. |
| `AC-07` | this row covers all of: Prisma validate (`npx prisma validate` exit 0), Prisma generate (`npx prisma generate` exit 0), typecheck (`npm run typecheck` exit 0), lint (`npm run lint` exit 0 with 0 new warnings from the slice — see §3 E-03), unit (`npm run test:unit` → 2532 passed, 9 skipped, 0 failed), build (`npm run build` exit 0), `pwsh .ai-pipeline/scripts/verify-task.ps1` (`RESULT: PASS`), `pwsh .ai-pipeline/scripts/verify-handoff.ps1` (this very row). | all runnable commands documented in §3 registry; baselined scope check `git diff --check <baseline>..HEAD` (E-08). |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `npx prisma validate` (with placeholder envs) | exit `0` — "The schema at prisma/schema.prisma is valid 🚀" |
| `E-02` | `npx prisma generate` | exit `0` — "Generated Prisma Client (v5.22.0) to ...node_modules@prisma/client in 430ms" |
| `E-03` | `npm run lint` | exit `0`. `node_modules.bin eslint.cmd tests/db/er003-evidence-record-metadata.integration.test.ts` reports 0 findings on the new file. Repo-wide 696 warnings, 0 errors; no new warnings introduced by this slice. |
| `E-04` | `rg -n "publicUrl public_url rootPath root_path token bytea" prisma/schema.prisma prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql` | exit `1` (zero matches) |
| `E-05` | `npm run typecheck` | exit `0` — `tsc --noEmit` PASS, 0 errors |
| `E-06` | `npm run test:unit` | exit `0` — `Test Files  161 passed (161)` / `Tests  2532 passed | 9 skipped (2541)` |
| `E-07` | `npm run build` | exit `0` — Next.js production build success; First Load JS shared by all = 102 kB |
| `E-08` | `git diff --check 1e1895d16500b273575599cf88853e0d48f08e23..HEAD` and `git diff --name-only 1e1895d16500b273575599cf88853e0d48f08e23..HEAD` | `git diff --check` exit `0` (no whitespace errors); `git diff --name-only` lists only files inside the Exact File Allowlist §4.5 |
| `E-09` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/TASK.md"` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` |
| `E-10` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/TASK.md" -HandoffPath "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/HANDOFF.md"` | exit `0` — `RESULT: PASS.` |
| `E-11` | `CI_INTEGRATION_STRICT=1 npm run test:integration` | CI-only runnable (canonical Integration lane). `ENV_BLOCKED` in this sandbox because `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` not provisioned here; the lane refuses with exit 0 + `ENV_BLOCKED` report (NOT a PASS). Authoritative run is in CI with the container DB. |
| `E-12` | `git diff --name-only 1e1895d16500b273575599cf88853e0d48f08e23..HEAD` | 0 lines match pg_hba.conf or any forbidden path; scope is clean. |

## 4. Deviations and blockers

| ID | Item | Mitigation / owner |
|---|---|---|
| `DEV-01` | No new migration rolled out to any production DB. Implementation ships code + CI evidence only. Production apply remains a T0 gate. | Tier 0/Owner (per T0 brief 2026-09-24). |
| `DEV-02` | The ER-003 integration test uses `$executeRawUnsafe` for DB-side rejections (CHECK / FK / UNIQUE) so the test can confirm the rejection comes from PostgreSQL, not Prisma client-side validation. This is internal to the test — no runtime code path is touched. | accepted; §4.5 allowlist explicitly permits the new test file. |
| `BLK-01` | Local sandbox has no `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`. The Integration lane self-skips per `vitest.integration-files.ts` and prints `ENV_BLOCKED` instead of `PASS` (fail-closed, never fake PASS). CI Integration lane is the authoritative runnable. | Tier 0/Owner supplies CI DB secrets; CI Integration run proves AC-02..AC-06 against a real Postgres. |

## 5. Final status

ER-003 v1.2 implementation is FROZEN. Code, migration, integration test,
Task delegation copy, and HANDOFF are all aligned. The six gates listed in
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

The CI Integration lane (AC-02 / AC-03 / AC-05 / AC-06) is the only
authoritative runnable for the DB-touching acceptance criteria; this
sandbox reports `ENV_BLOCKED` because no `DATABASE_URL_TEST` is provisioned.

No push, no PR, no merge, no production migration. Tier 3 LIGHT audit is
the next gate per `TIER3_LIGHT_AUDIT`.

Tier 1 does not pre-judge the Tier 3 verdict.

Handoff status: READY_FOR_AUDIT
