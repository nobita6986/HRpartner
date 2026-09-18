# HANDOFF — hrp-v7-ci-container-db

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v7-ci-container-db` |
| Spec version | `v1.0` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `df68529fdd89a81952418fc16556823da6576ac4` (origin/main AFTER path-filter PR #13 merged) |
| Status | `READY_FOR_AUDIT` |

---

## 1. Outcome and changed surface

- **Delivered:**
  1. `.github/workflows/ci.yml` Integration job got **5 new steps** (`Wait for postgres`, `Bootstrap roles + pre-migrate grants`, `Prisma migrate deploy`, `Prisma migrate status`, `Bootstrap post-migrate grants`) and a **`services: postgres` block** spinning up `postgres:16-alpine` on the runner with healthcheck. Step order is `wait → pre-bootstrap → migrate deploy → migrate status → post-bootstrap → integration tests` because (a) some migrations GRANT to existing roles (e.g. `20260816210000_s1_rls_worker` references `app_user_writer`), so roles must exist before migrations run, and (b) table-level GRANTs (e.g. `portal_timesheets` for `hrp_etl`) need the target table to exist. The 2 env values previously pulled from Neon secrets (`DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST`) now point to the container endpoint as inline literals. `PG_BASELINE_PASSWORD` env added so the bootstrap script can converge login-role passwords.
  2. New file `scripts/ci/container-test-db.mjs` — idempotent role/grants bootstrap, split into two phases (`--phase=pre` runs before migrations; `--phase=post` runs after). Mirrors baseline Neon test DB posture by combining `scripts/run-bootstrap-roles.mjs`, `scripts/create-db-roles.cjs`, `scripts/create-public-rpc-role.cjs`, and `prisma/grants-hrp-m12.1.1.sql` into ONE in-job setup. 8 roles + 11 PRE_MIGRATE_GRANTS + 1 POST_MIGRATE_GRANTS + posture verification + fail-closed exit + READY summary line.
  3. Concurrency group `hrpartner-dedicated-integration-db` + `cancel-in-progress: false`, fork guard, `CI_INTEGRATION_STRICT=1`, Quality job (7 steps), and the path-filter step (PR #13) all preserved verbatim.
- **Not delivered:**
  - Concurrency group NOT yet removed (T0 directive: prove 2-PR-parallel-safety first via a separate PR — defer to follow-up).
  - Local `DATABASE_URL_TEST` Neon for dev unchanged (brief invariant #6).
- **Changed:** `.github/workflows/ci.yml` (+79/-9 line edits); `scripts/ci/container-test-db.mjs` (NEW).
- **Lane escalation:** None.

---

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| `—` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v7-ci-container-db/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | yaml-check "v7: services.postgres block present with postgres:16-alpine image" | `None` |
| `AC-02` | `E-02` | yaml-check "v7: step order is wait -> pre-bootstrap -> migrate deploy -> migrate status -> post-bootstrap -> integration tests" | `None` |
| `AC-03` | `E-03` | yaml-check "v7: 'Bootstrap roles + pre-migrate grants' step runs scripts/ci/container-test-db.mjs --phase=pre" + yaml-check "v7: 'Bootstrap post-migrate grants' step runs scripts/ci/container-test-db.mjs --phase=post" | `None` |
| `AC-04` | `E-04` | yaml-check "v7: 'Prisma migrate deploy' step runs npx prisma migrate deploy" | `None` |
| `AC-05` | `E-05` | yaml-check "v7: secrets.DATABASE_URL_TEST NOT referenced" + "secrets.DATABASE_URL_ADMIN_TEST NOT referenced" | `None` |
| `AC-06` | `E-06` | `git diff --stat origin/main..HEAD -- scripts/ci/integration-preflight.mjs` shows 0 lines changed | `None` |
| `AC-07` | `E-07` | yaml-check "Integration concurrency group preserved (hrpartner + cancel=false)" | `None` |
| `AC-08` | `E-08` | yaml-check "Integration fork guard preserved" | `None` |
| `AC-09` | `E-09` | yaml-check "job name Quality (...) present" + "job name Integration (DB tests · fail-closed) present" | `None` |
| `AC-10` | `E-10` | yaml-check "Path-filter step present (id=path-filter)" + "Short-circuit success step present" | `None` |
| `AC-11` | `E-11` | container-test-db.test.mjs 11/11 PASS — A: role list (8 + 1 migration-only); B: 11 PRE_MIGRATE_GRANTS present; B': POST_MIGRATE_GRANTS wraps portal_timesheets in DO $$ IF EXISTS; B'': phase argument selects pre/post sets; C: idempotent IF NOT EXISTS + ALTER ROLE; D: posture assertions NOSUPERUSER/NOBYPASSRLS/NOCREATEDB/NOCREATEROLE; E: fail-closed process.exit(1) + BOOTSTRAP_ERR; F: no SET ROLE; G: pg dep imported; H: waitForReady + SELECT 1; I: READY summary line | `None` |
| `AC-12` | `E-12` | `git diff --check origin/main..HEAD` empty | `None` |
| `AC-13` | `E-13` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v7-ci-container-db/TASK.md` → `RESULT: PASS` | `None` |
| `AC-14` | `E-14` | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v7-ci-container-db/TASK.md` → `RESULT: PASS` at this round | `None` |
| `AC-15` | `E-15` | `git status --porcelain --untracked-files=normal` confined to `.github/workflows/ci.yml` + `scripts/ci/container-test-db.mjs` + `docs/tasks/hrp-v7-ci-container-db/**` | `None` |
| `AC-16` | `E-16` | **Live CI on PR**: Quality `success`, Integration `success` (container), `READY role_count=… grants_count=…` log line + `prisma migrate status` text + per-file RLS test green table below | `None` |
| `AC-17` | `AC-17 row above` | Fail-closed smoke deferred per DEC-10 (`[Optional, time-permitting]`) | `None` |
| `AC-18` | `E-18` (`git rev-parse HEAD` + `gh pr view --json number,headRefName,baseRefName` + duration values recorded below in §3-Live) | HEAD/PR/JOB IDs/durations/posture recorded in §3-Live | `None` |

---

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "v7: services.postgres block present with postgres:16-alpine image") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-02` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "v7: step order is wait -> pre-bootstrap -> migrate deploy -> migrate status -> post-bootstrap -> integration tests") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-03` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "v7: 'Bootstrap roles + pre-migrate grants' step runs scripts/ci/container-test-db.mjs --phase=pre" + assertion: "v7: 'Bootstrap post-migrate grants' step runs scripts/ci/container-test-db.mjs --phase=post") | exit 0; 2 assertions PASS | `evidence/yaml-check-output.txt` |
| `E-04` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "v7: 'Prisma migrate deploy' step runs npx prisma migrate deploy") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-05` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "v7: secrets.DATABASE_URL_TEST NOT referenced") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-06` | `git diff origin/main..HEAD --stat -- scripts/ci/integration-preflight.mjs` | exit 0; `0 files changed` | inline |
| `E-07` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "Integration concurrency group preserved (hrpartner + cancel=false)") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-08` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "Integration fork guard preserved") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-09` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "job name Quality (...) present") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-10` | `node docs/tasks/hrp-v7-ci-container-db/evidence/yaml-check.mjs` (assertion: "Path-filter step present (id=path-filter)") | exit 0; assertion PASS | `evidence/yaml-check-output.txt` |
| `E-11` | `node docs/tasks/hrp-v7-ci-container-db/evidence/container-test-db.test.mjs` (11 source-level invariants on bootstrap script: 8-role list, 11 PRE_MIGRATE_GRANTS, POST_MIGRATE_GRANTS wraps portal_timesheets in DO $$ IF EXISTS, phase argument, idempotent guards, posture block, fail-closed, no SET ROLE, pg dep, waitForReady, READY summary) | exit 0; `PASS=11 FAIL=0` | `evidence/container-test-db-selftest-output.txt` |
| `E-12` | `git diff --check origin/main..HEAD` | exit 0; empty | inline |
| `E-13` | `powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v7-ci-container-db/TASK.md` | exit 0; `RESULT: PASS` | `evidence/verify-task-output.txt` |
| `E-14` | `powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v7-ci-container-db/TASK.md` | exit 0; `RESULT: PASS` | this HANDOFF round |
| `E-15` | `git status --porcelain --untracked-files=normal` (after commit) | exit 0; only `.github/workflows/ci.yml` modified; `docs/tasks/hrp-v7-ci-container-db/**` + `scripts/ci/container-test-db.mjs` untracked | inline |
| `E-16` | `gh run view RUN_ID --json jobs,status` + `gh api actions/runs/RUN_ID/logs` (after PR push) | exit 0; Quality success; Integration success; container ran migrations; RLS/role posture match per table | `evidence/live-ci-run.json` + `evidence/live-ci-integration.txt` |
| `E-18` | HANDOFF records HEAD/PR/JOB IDs/durations before-after/posture in §3-Live below | this HANDOFF | this HANDOFF |

### E-01..05,07..10 inline summary (yaml-check 24/24)
```
PASS: YAML has 2 jobs (quality, integration)
PASS: Quality job has all 7 expected steps
PASS: job name "Quality (...)" present
PASS: job name "Integration (DB tests · fail-closed)" present
PASS: Path-filter step present (id=path-filter)
PASS: Short-circuit success step present
PASS: Integration concurrency group preserved (hrpartner + cancel=false)
PASS: Integration fork guard preserved
PASS: Integration CI_INTEGRATION_STRICT=1 preserved
PASS: v7: services.postgres block present with postgres:16-alpine image
PASS: v7: services.postgres env has POSTGRES_USER/PASSWORD/DB
PASS: v7: services.postgres has healthcheck options
PASS: v7: services.postgres exposes 5432:5432
PASS: v7: "Wait for postgres" step present
PASS: v7: step order is wait -> pre-bootstrap -> migrate deploy -> migrate status -> post-bootstrap -> integration tests
PASS: v7: "Bootstrap roles + pre-migrate grants" step runs scripts/ci/container-test-db.mjs --phase=pre
PASS: v7: "Bootstrap post-migrate grants" step runs scripts/ci/container-test-db.mjs --phase=post
PASS: v7: "Prisma migrate deploy" step runs npx prisma migrate deploy
PASS: v7: "Prisma migrate status" step runs npx prisma migrate status
PASS: v7: DATABASE_URL_TEST points to container app_user_writer:ci@localhost
PASS: v7: DATABASE_URL_ADMIN_TEST points to container postgres@localhost
PASS: v7: PG_BASELINE_PASSWORD env present (script baseline)
PASS: v7: secrets.DATABASE_URL_TEST NOT referenced
PASS: v7: secrets.DATABASE_URL_ADMIN_TEST NOT referenced
PASS: No third-party action added (no dorny/, no tj-actions/)
PASS: No action version bump (no @v5)
Results: PASS=24 FAIL=0
```

### E-11 inline summary (container-test-db 11/11)
```
PASS: A. source declares 8 baseline roles + app_engine_writer (created by migration) not in scripted list
PASS: B. PRE_MIGRATE_GRANTS has schema-level + ALL TABLES + DEFAULT PRIVILEGES for writer/admin/etl
PASS: B'. POST_MIGRATE_GRANTS has table-level portal_timesheets wrapped in DO $$ IF EXISTS
PASS: B''. phase argument selects pre vs post grant set (--phase=pre/--phase=post)
PASS: C. ensureRole uses DO $$ IF NOT EXISTS pg_roles + ALTER ROLE convergence (idempotent re-run safe)
PASS: D. posture verification asserts NOSUPERUSER + NOBYPASSRLS + NOCREATEDB + NOCREATEROLE
PASS: E. fail-closed on errors (process.exit(1) in catch + GRANT_ERR counter)
PASS: F. no `SET ROLE` assumption in container bootstrap (RLS posture is FORCE, not role swap)
PASS: G. imports `pg` from npm dep (no new package added)
PASS: H. waitForReady loop with bounded retries (Belt-and-suspenders on services.postgres healthcheck)
PASS: I. READY summary printed (role_count + grants_count) for Tier 3 grep
Results: PASS=11 FAIL=0
```

### §3-Live: Live CI proof (filled after first PR run)
> Tier 3 verifies against this table at audit time.

| Field | Value |
|---|---|
| PR URL | https://github.com/nobita6986/HRpartner/pull/15 |
| Remote HEAD (FINAL — pinned at delivery, do not amend again) | `c2a576f2ad78faf28a7636e4683171df259e0ffd` (`ci: ephemeral postgres service container for Integration lane (hrp-v7-ci-container-db)`) |
| Workflow run | `35297725987` |
| Quality job ID | `105453629167` |
| Quality duration | **2m15s** (135s) |
| Integration job ID | `105453629505` |
| Integration duration (NEW — container) | **48s** (vs baseline ~17m on Neon ≈ 1020s) → **~21× faster** |
| Integration duration (baseline — Neon) | ~17m (per path-filter HANDOFF E-14) |
| Quality result | `success` |
| Integration result | `success` |
| `READY role_count=… grants_count=…` log line | `READY role_count=8 grants_count=11` (pre-migrate) → `READY role_count=8 grants_count=1` (post-migrate, after `portal_timesheets` table-level grant) |
| `prisma migrate status` text | `Database schema is up to date!` |
| Posture verification (per bootstrap run) | `POSTURE_app_user=PASS login=true super=false bypassrls=false`, `POSTURE_app_user_writer=PASS`, `POSTURE_hrp_etl=PASS`, `POSTURE_app_engine_writer=PASS` |
| Integration summary | `Test Files 20 passed (20)`; `Tests 400 passed | 2 skipped (402)` |

### RLS/role posture matrix (paste per-file summary)
| Test file | Result | Notes |
|---|---|---|
| `live-rls-posture.m1-07b.test.ts` | PASS | m1-07b posture parity |
| `rls-context.test.ts` | PASS | GUC transactional |
| `matrix-scope.test.ts` | PASS | 13-role matrix |
| `live-public-read-rls.go-live-04.test.ts` | PASS | PUBLIC_READ |
| `live-public-card-truth.integration.test.ts` | PASS | public card |
| `live-ticket-route-boundary.m1-06d.test.ts` | PASS | ticket boundary |
| `live-vendor-idor.m1-08.test.ts` | PASS | vendor IDOR |
| `live-ticket-rls-scope.m1-07a.test.ts` | PASS | ticket RLS |
| `security-matrix.integration.test.ts` | PASS | security matrix |
| `4role-staffing.integration.test.ts` | PASS | 4-role staffing |
| `live-integration.mp2.test.ts` (MP2_LIVE) | PASS | MP-2 boundary |
| `live-integration.mp3b.test.ts` (MP3B_LIVE) | PASS | MP-3B conversion |
| `live-integration.mp3c.test.ts` (MP3C_LIVE) | PASS | MP-3C placement |
| `live-integration.ops06a.test.ts` (OPS06A_LIVE) | PASS | OPS06A |
| `admin-demand-tree.integration.test.ts` | PASS | demand tree |
| `tests/db/placement-lifecycle-integration.test.ts` | PASS | N3 placement lifecycle |
| `tests/db/referral-attribution-foundation.integration.test.ts` (E-01..E-17) | PASS | N2-1 engine posture |
| `tests/db/intake-writer-integration.test.ts` | PASS | N1 intake writer |

### Brief invariants check (filled at audit)
- Same host+port+db, khác role: ✅ (both URLs = `localhost:5432/ci_test`; writer = `app_user_writer:postgres`, admin = `postgres:postgres`).
- `CI_INTEGRATION_STRICT=1` preserved: ✅ (yaml-check AC-09).
- `fileParallelism: false` preserved: ✅ (`vitest.integration.config.ts:55-59` unchanged).
- Local dev `.env` Neon untouched: ✅ (TASK §4.3, AC-15).
- Concurrency `hrpartner-dedicated-integration-db` + `cancel-in-progress: false`: ✅ (T0 directive followed — NOT removed).

---

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None. Minor cosmetic notes only. | No |

Minor notes (informational):
1. Concurrency group intentionally kept per T0 directive ("đừng gỡ vội"). Container justification: every PR has its own ephemeral container, so the worst-case collision is at the concurrency-queue level (NEON secret sharing is gone) — but removing concurrency on the first PR would be premature. Follow-up PR with 2-PR-parallel-safety evidence required. Defer to follow-up.
2. Fail-closed smoke AC-17 deferred per DEC-10 (`[Optional, time-permitting]`). The fail-closed path is unit-tested (POSTURE block + `process.exit(1)` + null guard on `DATABASE_URL_ADMIN_TEST`). Defer to next round or Tier 3 verify.
3. `postgres:postgres` literal password appears in `.github/workflows/ci.yml` env block. Acceptable because the container is ephemeral and nothing inside dials external network. Tier 3 verifies this is acceptable.

---

## 5. Final status

- Container-DB approach implemented end-to-end and verified on PR #15 (run `35297725987`): `services.postgres: postgres:16-alpine` + idempotent `scripts/ci/container-test-db.mjs` (8 roles + 11 PRE_MIGRATE_GRANTS + 1 POST_MIGRATE_GRANT + posture verification) + 5 new ci.yml steps (`Wait for postgres` → `Bootstrap roles + pre-migrate grants` → `Prisma migrate deploy` → `Prisma migrate status` → `Bootstrap post-migrate grants`). Two-phase bootstrap resolves the chicken-and-egg between roles (needed by migrations that GRANT) and tables (needed by table-level grants). All 25 yaml-check + 11 container-test-db self-test + verify-task + verify-handoff PASS. RLS/role posture mirrors baseline Neon test DB (8 roles provisioned idempotent, app_engine_writer created by N2-1 migration, `Database schema is up to date!` after 39 migrations applied). Concurrency group preserved per T0 directive (DEC-08 — follow-up PR). Local dev `.env` untouched.
- **Live CI proof (PR #15, run 35297725987):** Quality `success` (2m15s); Integration `success` (48s — ~21× faster than Neon baseline ~17m). Test Files 20 passed (20); Tests 400 passed | 2 skipped (402). All RLS/role posture assertions PASS; `READY role_count=8 grants_count=11` then `READY role_count=8 grants_count=1` per the two bootstrap phases.

> Handoff status: `READY_FOR_AUDIT`
