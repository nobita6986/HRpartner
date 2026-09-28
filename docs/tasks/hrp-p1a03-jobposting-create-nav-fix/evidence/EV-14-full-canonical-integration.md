# EV-14 — Full canonical integration (CI_INTEGRATION_STRICT=1) on synthetic DB

**Date captured:** 2026-09-28 (UTC+7)
**Task slug:** `hrp-p1a03-jobposting-create-nav-fix`
**Bundle:** P1-A0.3 + P1-NAV-01 pre-audit freeze
**T0 verdict at capture time:** CHANGES_REQUIRED (C-01: full canonical integration gate)

## Command (sanitized)

```bash
CI_INTEGRATION_STRICT=1 npm run test:integration
```

The preflight script (`scripts/ci/integration-preflight.mjs`) is the entry point.
It guards (in order):

1. `DATABASE_URL_TEST` must be set; otherwise ENV_BLOCKED. With
   `CI_INTEGRATION_STRICT=1`, an absent test DB exits 1 (fail-closed).
2. `DATABASE_URL_TEST` must NOT equal any protected URL
   (`DATABASE_URL`, `DATABASE_URL_ADMIN`, `DATABASE_URL_DEV`,
   `DATABASE_URL_ADMIN_DEV`, `DATABASE_URL_PROD`, or `repo .env DATABASE_URL`).
3. If `DATABASE_URL_ADMIN_TEST` is given, it must target the same
   host+port+database as `DATABASE_URL_TEST`.
4. Writer/admin posture must satisfy `assert-test-db-posture.mjs`:
   writer non-super + non-bypassrls; admin = bypassrls; same target.
5. Only after all four guards pass is `vitest run --config vitest.integration.config.ts` spawned.

Credentials are sourced from the T0-provisioned synthetic writer/admin pair
(approved secure channel); no production cluster credential was read, set,
or applied.

## Preflight posture (this run)

```
WRITER_POSTURE user=app_user_writer session=app_user_writer super=false bypassrls=false
ADMIN_POSTURE  user=neondb_owner  session=neondb_owner  super=false  bypassrls=true
POSTURE_OK writer_is_writer admin_is_admin same_target
```

Writer non-superuser ✓ · Writer non-bypass-RLS ✓ · Admin suitable for
fixture/cleanup ✓ · Same host/port/database ✓ · Definitely not production ✓.

## Integration-preflight result (this run)

```
[integration-preflight] Test DB accepted (guards passed).
[integration-preflight]   writer: postgresql://****@ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb  fp=7a9347ab8cd3
[integration-preflight]   admin : postgresql://****@ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb  fp=69c2a1fed8cc
```

URLs masked by the preflight itself (host only; no credentials); connection
strings are NEVER printed by the gate.

## Final vitest output

```
 Test Files  36 passed (36)
      Tests  605 passed | 2 skipped (607)
   Start at  14:49:52
   Duration  894.11s (transform 1.35s, setup 0ms, collect 3.30s, tests 882.37s, environment 7ms, prepare 2.69s)

=== EXIT CODE: 0 ===
```

- Test files: **36** (every file registered in `vitest.integration-files.ts`)
- Tests passed: **605**
- Tests skipped: **2** (both in `src/domains/applications/live-integration.ops06a.test.ts`, gated by `describe.skipIf(!REDIS_READY)` where `REDIS_READY = LIVE && UPSTASH_REDIS_REST_URL_TEST && UPSTASH_REDIS_REST_TOKEN_TEST` — V5-OPS-06A optional Redis secret, not part of this bundle; already-identified pre-existing skip reason).
- Tests failed: **0**
- Exit code: **0**

## File-by-file result

Every file in `vitest.integration-files.ts` ran and passed:

| # | File | Tests |
|---|---|---:|
| 1 | src/shared/auth/rls-context.test.ts | 9 |
| 2 | src/shared/auth/matrix-scope.test.ts | 59 |
| 3 | src/domains/security/security-matrix.integration.test.ts | 124 |
| 4 | src/domains/staffing/4role-staffing.integration.test.ts | 11 |
| 5 | src/domains/applications/live-integration.mp2.test.ts | 11 |
| 6 | src/domains/applications/security-boundary.mp2.test.ts | 13 |
| 7 | src/domains/applications/live-integration.mp3b.test.ts | 1 |
| 8 | src/domains/applications/live-integration.mp3c.test.ts | 7 |
| 9 | src/domains/applications/live-integration.ops06a.test.ts | 6 (2 skipped) |
| 10 | src/shared/auth/live-auth-scope.m1-06a.test.ts | 6 |
| 11 | src/shared/auth/live-vendor-worker-scope.m1-06b.test.ts | 10 |
| 12 | src/shared/auth/live-ticket-rls-scope.m1-07a.test.ts | 32 |
| 13 | src/shared/auth/live-rls-posture.m1-07b.test.ts | 32 |
| 14 | src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts | 5 |
| 15 | src/shared/auth/live-vendor-idor.m1-08.test.ts | 13 |
| 16 | src/shared/auth/live-public-read-rls.go-live-04.test.ts | 5 |
| 17 | tests/db/job-posting-create-bundle.repro.test.ts | 4 |
| 18 | src/domains/job-board/public-card-truth.integration.test.ts | 10 |
| 19 | tests/db/placement-lifecycle-integration.test.ts | 16 |
| 20 | tests/db/er003-evidence-record-metadata.integration.test.ts | 19 |
| 21 | src/domains/admin-demand-tree.integration.test.ts | 17 |
| 22 | tests/db/referral-attribution-foundation.integration.test.ts | 15 |
| 23 | tests/db/attribution-redirect.integration.test.ts | 15 |
| 24 | tests/db/aff03-public-intake.integration.test.ts | 26 |
| 25 | tests/db/handling-assignment.integration.test.ts | 4 |
| 26 | tests/db/aff04-conversion-propagation.integration.test.ts | 10 |
| 27 | tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts | 7 |
| 28 | tests/db/job-posting-authoring.integration.test.ts | 13 |
| 29 | tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts | 6 |
| 30 | tests/db/p1a1-jobposting-public-apply.integration.test.ts | 20 |
| 31 | tests/db/p1a1-migration-chain-proof.integration.test.ts | 11 |
| 32 | tests/db/p1b-public-apply-slug-bound.integration.test.ts | 10 |
| 33 | tests/db/p1f0-placement-command-api.integration.test.ts | 20 |
| 34 | tests/db/job-posting-stamps.integration.test.ts | 10 |
| 35 | tests/db/recruiter-workbench.integration.test.ts | 20 |
| 36 | tests/db/p1f1-placement-action-ui.integration.test.ts | 10 |
| **Total** |  | **605 + 2 skipped** |

## Skip reasons (already-identified)

- `src/domains/applications/live-integration.ops06a.test.ts` — 2 tests gated
  on `REDIS_READY` (requires `UPSTASH_REDIS_REST_URL_TEST` and
  `UPSTASH_REDIS_REST_TOKEN_TEST`). T0-controlled optional secret for
  V5-OPS-06A; out of scope for the P1-A0.3 bundle; pre-existing skip
  condition unchanged from prior T1C runs.

## Current-run residue / cleanup outcome

The 36 integration test files use disposable fixtures (per-test `runId` prefix
or `afterAll` cleanup) on the synthetic DB cluster. No test reported a
non-zero exit; no test surfaced an unhandled exception indicating un-cleaned
state. Spot checks for synthetic-prefix residue markers
(`p1a03repro-*`, `p1a01repro-*`, `p1e0-*`, `p1e1-*`, `p1f0-*`, `p1f1-*`)
across `JobPosting.createdById`, `StaffingOrderSlot.id`, `PlacementCase.id`,
`Application.id`, `LaborProfile.id` are part of the prior accepted P1-F1
closeout evidence (`docs/tasks/hrp-p1-f1-placement-action-ui/evidence/t0-predecessor-p1f0-x3.txt`,
`t0-zero-residue-current.txt`, `t0-pre-existing-shared-db-residue.txt`) and
not re-asserted here (no P1-A0.3 evidence file changed in this round).

## Production DB contact

**None.** No production host, URL, or credential was read, set, or applied.
The integration lane ran exclusively against the T0-provisioned synthetic
writer/admin pair. `grep -i "ep-shy-tree\|npg_fI6\|hrp_wr_NWrDks" <full log>`
returns 0 matches; the only host in the run log is
`ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb` which is
the synthetic cluster (masked by the preflight, only the host substring is
visible after the `****`).

## Reproduction

To reproduce on a future T0 round:

```powershell
# Load synthetic writer/admin into env through the approved secure channel.
$env:DATABASE_URL_TEST = '<writer>'
$env:DATABASE_URL_ADMIN_TEST = '<admin>'
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL_ADMIN -ErrorAction SilentlyContinue
$env:CI_INTEGRATION_STRICT = '1'
CI_INTEGRATION_STRICT=1 npm run test:integration
```

Expected: 36 test files / 605 passed / 2 skipped (Redis-gated) / 0 failed / exit 0.
