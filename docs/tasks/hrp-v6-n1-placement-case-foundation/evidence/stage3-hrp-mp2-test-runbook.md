# N1 stage_3 — Operator Runbook (hrp_mp2_test branch run)

> **What this runbook is NOT:** it is NOT a green light to run on `hrp_mp2_test`.
> It is the gate procedure Tier 1 / Operator MUST follow **after** Owner/OP
> has injected `TEST_DATABASE_URL_ADMIN` + `TEST_DATABASE_URL_WRITER` via
> the secure channel. If Tier 0 also supplied `NEON_API_KEY` +
> `NEON_PROJECT_ID`, set those too so the probe's control-plane check
> runs.
>
> **28/28 PASS on the embedded PG 18.4 self-test (most recent audit-fix
> commit, 2026-09-12 21:00) is a SELF-TEST, not a Stage 3 PASS.** It
> proves the probe + migration combination is correct. Stage 3 PASS
> happens only when the same probe produces 28/28 against
> `hrp_mp2_test` AND Tier 0 signs off.
>
> **Cleanup contract caveat**: the probe only cleans up its fixtures on the
> success path. On abnormal exit (connect failure, unhandled exception,
> `process.exit(...)` early), the seeded rows of THIS run remain
> (carried in the `cleanup-needed` NDJSON row, with exact IDs). Operator
> must clean them up via the exact-IN-list SQL in STEP 4. Do not
> claim "DB returns to start state" without post-run verification.

## STEP 0 — read the rules before doing anything

| Rule | Source |
|---|---|
| Tier 1 NEVER auto-runs against `hrp-live`. | PLANNER §v2.13; DEC-N1-06 |
| Owner/OP injects URLs via the secure channel (not chat). | DEC credential hygiene |
| Fingerprint block: probe REFUSES the prod endpoint-id ANY DB NAME. The old rule tied this to `db=neondb` and let misconfigured URLs slip through; that gate is removed. | `probe.mjs` boot guard (audit fix 21:00) |
| Branch-membership check: probe REFUSES URLs whose endpoint-ids are not both mapped by Neon control plane to the SAME branch of `NEON_PROJECT_ID` AND whose branch name is not exactly `hrp_mp2_test` (case-insensitive). A non-primary branch with a different name (e.g. someone's scratch branch) would silently slip through; the name match is mandatory. Override via `NEON_EXPECTED_BRANCH_NAME` only when Tier 0 authorises running against a differently-named test branch. | `probe.mjs` boot guard (audit fix 21:00) |
| N1 must not auto-touch anything outside its 2 source migrations. | DEC-N1-05 (ADD-only) |
| Forward-only fix migration is the ONLY allowed fix tool, and only when STEP 3's migration actually failed. | DEC-02 history preservation |
| Probe-only failures (after successful migration) DO NOT use `migrate resolve` — the migration is fine, only the probe needs investigation. | New: audit fix 21:00 (this runbook section) |
| Tier 3 LIGHT delta re-audit required after any forward-only fix. | DEC-Tier-3 |
| Tier 0 must sign-off Stage 3 → Stage 4 (prod migration deploy). | PLANNER §v2.15 |
| hrp-live deployment and AV6 are STILL locked until Stage 4 sign-off. | PLANNER §v2.15 |

---

## STEP 1 — Endpoint fingerprint + endpoint-identity check (operator)

**Tier 1 / Operator**: BEFORE running any `psql`, `migrate`, or `probe` — verify both URLs in the secret channel resolve to a Neon endpoint that is NOT `hrp-live`.

> **CORRECTED 21:00** — the previous rule "refuse if endpoint-id AND
> db=`neondb`" is WRONG. The db-name is **NOT** part of the refuse
> predicate any more. Production is blocked based on endpoint-id alone.
>
> Neon gives you **two routing modes** for the SAME branch endpoint:
> - **Direct**:    `ep-<endpoint-id>.<region>.aws.neon.tech`  (port 5432)
> - **Pooled**:    `ep-<endpoint-id>-pooler.<region>.aws.neon.tech`  (port 5432)
>
> The endpoint-ID (`shy-tree-az32as2c`) is identical across modes. But the FULL hostnames differ (`ep-shy-tree-az32as2c...` vs `ep-shy-tree-az32as2c-pooler...`).
> Neon's default database name is `neondb` and stays `neondb` on clones — so DB name alone is NOT branch evidence either.
>
> The CORRECT checks are (in order):
> 1. **URL-side fingerprint**: refuse any URL whose hostname contains
>    the documented prod endpoint-id — regardless of db name.
> 2. **DB-side identity**: admin connection and writer connection
>    must report the same `current_database()` AND the same
>    `inet_server_addr()`.
> 3. **Neon control-plane branch membership** (only when
>    `NEON_API_KEY` and `NEON_PROJECT_ID` are set): probe calls
>    `GET /projects/{id}/branches` and `GET .../branches/{branch_id}/endpoints`,
>    refuses if BOTH endpoint-ids don't map to the SAME branch of the
>    test project AND that branch's name is not exactly `hrp_mp2_test`
>    (case-insensitive). This is the second-line defense that catches
>    URL misconfiguration that the URL-side rule missed (e.g. pointing
>    at a different Neon project entirely). A non-primary branch with
>    a DIFFERENT name (e.g. someone's scratch branch) would silently
>    slip through if we only checked "non-primary"; the name match is
>    mandatory. Override via `NEON_EXPECTED_BRANCH_NAME` only when Tier
>    0 authorises running against a differently-named test branch.

```powershell
$adminUrl  = $env:TEST_DATABASE_URL_ADMIN
$writerUrl = $env:TEST_DATABASE_URL_WRITER

# --- (a) Refuse any URL whose hostname contains the prod endpoint-id.
#    Audit fix 21:00: db=neondb is NOT part of this predicate any more.
#    The OLD regex '^ep-([^.-]+)' was broken on pooler hosts because
#    the [^.-]+ character class stopped at the first '-', returning
#    only 'shy' for 'ep-shy-tree-az32as2c-pooler...'. We now split on
#    '.', take the first segment, strip the 'ep-' prefix and the
#    optional '-pooler' suffix so both direct and pooler routes yield
#    the same endpoint-id (e.g. 'shy-tree-az32as2c').
$PROD_ENDPOINT_ID = 'shy-tree-az32as2c'
function fingerprint($u) { 'fp:' + ([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($u))[0..5] | %{ $_.ToString('x2') }) -join '' }
function hostOf($u) { ([Uri]$u).Host }
function dbOf($u)   { ([Uri]$u).AbsolutePath.TrimStart('/') }
function endpointIdOf($u) {
  $h = hostOf $u
  $firstSeg = ($h.Split('.'))[0]
  if (-not $firstSeg.StartsWith('ep-')) { return '' }
  $id = $firstSeg.Substring(3)
  if ($id.EndsWith('-pooler')) { $id = $id.Substring(0, $id.Length - 7) }
  return $id
}

Write-Host "admin  fp=$(fingerprint $adminUrl)  host=$(hostOf $adminUrl)  ep=$(endpointIdOf $adminUrl)"
Write-Host "writer fp=$(fingerprint $writerUrl) host=$(hostOf $writerUrl) ep=$(endpointIdOf $writerUrl)"

if ((hostOf $adminUrl) -match $PROD_ENDPOINT_ID -or (hostOf $writerUrl) -match $PROD_ENDPOINT_ID) {
  throw 'REFUSED: one or both URLs contain the documented hrp-live endpoint-id. Refusing regardless of db name. Use the hrp_mp2_test branch endpoint instead.'
}

# --- (b) Cross-check DB-side identity. This is necessary but not
#    sufficient on its own (same server IP can host multiple branches
#    when the project has multiple branch families). ---
$adminDbInfo  = psql $adminUrl  -At -c "SELECT current_database() || '|' || coalesce(host(inet_server_addr()),'?') || '|' || current_user"
$writerDbInfo = psql $writerUrl -At -c "SELECT current_database() || '|' || coalesce(host(inet_server_addr()),'?') || '|' || current_user"
Write-Host "admin  identity: $adminDbInfo"
Write-Host "writer identity: $writerDbInfo"

$adminParts  = $adminDbInfo  -split '\|'
$writerParts = $writerDbInfo -split '\|'

if ($adminParts[0] -ne $writerParts[0]) {
  throw "REFUSED: admin and writer point at DIFFERENT databases: admin=$($adminParts[0]), writer=$($writerParts[0]). Split-DB is not a supported probe state."
}
if ($adminParts[1] -ne $writerParts[1]) {
  throw "REFUSED: admin and writer point at DIFFERENT server IPs: admin=$($adminParts[1]), writer=$($writerParts[1]). They do not reach the same Neon compute. STOP."
}
if ($adminParts[2] -ne 'neondb_owner') {
  Write-Warning "admin role is '$($adminParts[2])', not 'neondb_owner'. The N1 migrations expect neondb_owner as DDL role. Investigate before continuing."
}
if ($writerParts[2] -ne 'app_user_writer') {
  throw "REFUSED: writer role is '$($writerParts[2])', not 'app_user_writer'. The probe's RLS-enforced queries will not bind to the right role. STOP."
}

Write-Host "OK: both URLs resolve to the same Neon compute AND no URL contains the prod endpoint-id."
```

**If any check fails → STOP. Do NOT run migrate or probe. Escalate to Tier 0.**

This step is the operator-side analog of the probe's boot guard. The probe
will additionally (when `NEON_API_KEY` and `NEON_PROJECT_ID` are set) call
Neon control plane to map both endpoint-ids to the SAME branch of the test
project AND verify that branch's NAME is `hrp_mp2_test` (NOT just "any
non-primary branch" — a non-primary branch with a different name, e.g.
someone's scratch branch, would silently slip through). That third check is
the most authoritative but requires the credentials above; set them in the
secure channel alongside the two URLs. Override `NEON_EXPECTED_BRANCH_NAME`
only when Tier 0 authorises running against a differently-named test branch.

---

## STEP 1.5 — Neon control-plane branch gate (operator, mandatory on real `hrp_mp2_test` runs)

> **Audit fix 2026-09-12 22:30 (Tier-0-block round 3)** — the URL/DB-side
> checks above catch most misconfigurations, but a URL misconfigured to
> point at a DIFFERENT Neon project entirely (e.g. another team's
> sandbox project) would slip through. STEP 1.5 calls Neon's control
> plane API directly to confirm BOTH endpoint-ids resolve to the SAME
> branch of `NEON_PROJECT_ID` AND that branch's name is `hrp_mp2_test`.
> This runs **BEFORE STEP 2 / STEP 3** and FAIL-CLOSED — any non-zero
> exit code stops the run.

The gate script lives at
`docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/neon_branch_gate.ps1`
(Git-tracked; review it before use). It exits:

- `0` → both endpoint-ids map to the SAME non-primary branch of
  `NEON_PROJECT_ID` whose `name` equals `NEON_EXPECTED_BRANCH_NAME`
  (default `hrp_mp2_test`). Proceed to STEP 2.
- `10` → `NEON_API_KEY` or `NEON_PROJECT_ID` not set. On a real
  `hrp_mp2_test` run this is HARD STOP. Request Tier 0 to supply
  credentials via the secure channel and re-run STEP 1.5.
- `11` → HTTP error against Neon API.
- `12` → endpoint-id not found in any branch of `NEON_PROJECT_ID`
  (URL points at a different Neon project entirely).
- `13` → endpoint-ids map to DIFFERENT branches.
- `14` → branch is the project's primary branch (PROD guard).
- `15` → branch name ≠ `NEON_EXPECTED_BRANCH_NAME`.

```powershell
$env:TEST_DATABASE_URL_ADMIN  = $env:TEST_DATABASE_URL_ADMIN
$env:TEST_DATABASE_URL_WRITER = $env:TEST_DATABASE_URL_WRITER
$env:NEON_API_KEY             = $env:NEON_API_KEY    # set in secure channel
$env:NEON_PROJECT_ID          = $env:NEON_PROJECT_ID # id of the test project (not prod)

& 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/neon_branch_gate.ps1'
if ($LASTEXITCODE -ne 0) {
  throw "Neon control-plane branch gate FAILED (exit $LASTEXITCODE). STOP — DO NOT proceed to STEP 2 (migrate status) or STEP 3 (migrate deploy). Escalate to Tier 0 with the gate verdict JSON."
}
Write-Host "STEP 1.5 PASS — branch membership confirmed before migrate status/deploy."
```

> **Why this is mandatory**: the probe.mjs control-plane check at STEP 4
> is a belt-and-braces check, NOT the primary gate. Without STEP 1.5,
> the only thing guarding the operator from running `prisma migrate
> deploy` on a misconfigured URL is the probe's row emission, which is
> AFTER `migrate deploy`. STEP 1.5 is the gate that must close BEFORE
> any DB write to the test branch. The probe's row in NDJSON is then
> double-evidence (it should match what STEP 1.5 already confirmed).

---

## STEP 2 — `migrate status` + raw `_prisma_migrations` audit (operator, READ-ONLY)

```powershell
$env:DATABASE_URL_ADMIN = $env:TEST_DATABASE_URL_ADMIN
$env:DATABASE_URL       = $env:TEST_DATABASE_URL_WRITER  # app_user_writer (Prisma runtime)
npx prisma migrate status
```

**Important**: Prisma's `_prisma_migrations` table does NOT have a `failed_at` column.
The columns are `id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count`.
A "failed/stuck" migration is detected by `finished_at IS NULL AND rolled_back_at IS NULL`,
and the SQL error lives in `logs` (a string column).

After `migrate status`, run the raw audit to confirm:

```powershell
psql $env:TEST_DATABASE_URL_ADMIN -At -c "
  SELECT migration_name
       || '|' || (finished_at IS NULL)::text
       || '|' || (rolled_back_at IS NULL)::text
       || '|' || substring(coalesce(logs,'') from 1 for 120)
    FROM _prisma_migrations
   ORDER BY started_at NULLS FIRST, migration_name
"
```

Decision matrix (combine `migrate status` + raw audit):

| Combined output | Action |
|---|---|
| Both N1 migrations already applied; no other pending; no `finished_at IS NULL AND rolled_back_at IS NULL` rows | Go to STEP 4 (run probe directly) |
| **Only** `20260912140411_n1_placement_case_foundation` and `20260912140412_n1_placement_case_rls` are pending AND no row is stuck/failed | Go to STEP 3 (apply these two) |
| Any other migration is also pending (e.g. `…_m14_rls_matrix_repair`, `…_marketplace_search_tracking_profile`) | **STOP**. Tier 1 was told N1 is ADD-only against the current state. If other migrations show as pending, the cutover state on `hrp_mp2_test` does NOT match what Tier 1 designed for. Escalate to Tier 0 — do NOT deploy. |
| ANY row with `finished_at IS NULL AND rolled_back_at IS NULL` (regardless of `migration_name`) | **STOP**. That is a failed/stuck migration. Capture the `logs` substring (which usually contains `ERROR: ...` + SQLSTATE). The DB is in an inconsistent Prisma state. Escalate to Tier 0 with: stuck migration name, error message, SQLSTATE. **DO NOT issue `prisma migrate resolve --rolled-back` or `prisma migrate resolve --applied`** — Prisma refuses to start a new migration until the stuck one is resolved, but the resolution itself requires Tier 0 authorization. |
| `_prisma_migrations` table is missing or empty | **STOP**. The test branch isn't a real Prisma-managed DB. Escalate. |

---

## STEP 3 — `migrate deploy` for the two N1 migrations ONLY

**Only after STEP 2 confirmed ONLY the two N1 migrations are pending AND no row is stuck/failed.**

```powershell
npx prisma migrate deploy
```

Decision matrix:

| Exit | Action |
|---|---|
| `0` (clean) | Continue to STEP 4 |
| `non-zero` | **DO NOT auto-rollback. DO NOT add a forward-only fix migration in this state.** Prisma will refuse to start a new migration because the failed one is still in `_prisma_migrations` with `finished_at IS NULL`. Capture: the last `ERROR:` line in `logs`, the SQLSTATE, and the `started_at` timestamp from `_prisma_migrations`. Run `npx prisma migrate status` to confirm the failed migration is still marked unfinished. Save the FULL migration state (`SELECT * FROM _prisma_migrations WHERE migration_name IN (...)`) to evidence dir. **STOP. Escalate to Tier 0 with the captured state.** Recovery options (which one Tier 0 authorises): (a) `prisma migrate resolve --rolled-back` to roll the failed row back, then a forward-only FIX migration, then re-run the original; (b) `prisma migrate resolve --applied` if the row was actually committed (verify via `\d` of the new tables first); (c) manual repair of the partial DDL via raw SQL, then `--applied`. Tier 1 NEVER picks a recovery option — that's a Tier 0 decision with full context. |
| `non-zero` AND the error is `42501` mid-migration | This means a GRANT inside the N1 migration is failing. Capture the missing privilege via `psql -c "SELECT has_table_privilege('app_user_writer', '<table>', '<privilege>');"` for each table listed in the error. **DO NOT add a forward-only fix migration yet** — Prisma is still in a failed state. **STOP and escalate to Tier 0** with the captured privilege gap. The recovery path will be `prisma migrate resolve --rolled-back` first, then the forward-only GRANT fix, then re-run. The fix itself, when Tier 0 authorises it, will grant **only** the missing privilege (no broad `GRANT DELETE TO app_user`; in production the runtime DML needs are SELECT/INSERT/UPDATE; DELETE is not granted to `app_user_writer` because the runtime never deletes rows). Tier 3 LIGHT re-audit delta is mandatory before the retry. |
| `non-zero` AND the error is a migration SQL error (NOT 42501) | Capture `ERROR:` + SQLSTATE + the offending migration's `logs` row. The original 2 N1 source migrations are FORWARD-ONLY — DO NOT modify them. **STOP and escalate to Tier 0.** Recovery path will be `prisma migrate resolve --rolled-back`, then a forward-only DDL fix, then re-run. Tier 3 LIGHT re-audit delta is mandatory before the retry. |

The user's rule "không mặc định 'ADD-only nên tự rollback'" applies here. A failed
migration is data evidence; auto-rolling-back would erase the forensic trail.
Equally: **"Prisma blocks next migration until the failed one is resolved"** means
we cannot assume a forward-only fix migration is the next step. The fix is gated
on Tier 0 authorising the resolution path.

---

## STEP 4 — run the probe

```powershell
# Ensure the credentials are loaded (Tier 1 has them in the secure channel
# already; this is just re-asserting the env so operator can't accidentally
# run with stale shell state).
$env:TEST_DATABASE_URL_ADMIN  = $env:TEST_DATABASE_URL_ADMIN
$env:TEST_DATABASE_URL_WRITER = $env:TEST_DATABASE_URL_WRITER
# Control-plane evidence (set by Tier 0 via the secure channel on every
# real hrp_mp2_test run). STEP 1.5 already verified branch membership;
# these same values feed the probe-side belt-and-braces check.
$env:NEON_API_KEY    = $env:NEON_API_KEY    # set in secure channel
$env:NEON_PROJECT_ID = $env:NEON_PROJECT_ID # id of the test project (not prod)
# Real-run flag — probe refuses with exit 71 if NEON_API_KEY/PROJECT_ID
# are missing on a real hrp_mp2_test run. On the local self-test this is
# unset (and the probe reports `stage3_real_pass=false` in summary,
# signalling it's a self-test, NOT a real Stage 3 PASS).
$env:N1_STAGE3_REAL = 'true'

# Run via the Node wrapper that captures stdout AND stderr to two
# SEPARATE files via raw bytes (no PowerShell `>` wrap; no `2>` loss).
# `node docs/.../probe.mjs > run.ndjson` ALONE WOULD DROP the
# `n1-trace: created/deleted` lines and risk long-line wrapping.
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
node "docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/probe.mjs" `
     1> "run-$stamp.ndjson" `
     2> "run-$stamp-stderr.log"
$probeExit = $LASTEXITCODE
```

> **Audit fix 2026-09-12 22:30** — when running via PowerShell `1>` /
> `2>` redirection, PowerShell does not wrap lines on Console Host as
> long as the host width is large enough; however, on older hosts it
> may. **NEVER pipe NDJSON through `Out-File` or any cmdlet that takes
> `-Encoding utf8`** (those wrap at host width and break per-line
> parse). The STEP 5b helper below uses `[System.IO.File]::ReadAllText`
> + `ConvertFrom-Json` line-by-line and refuses to commit if any line
> is unparseable.

Expected: NDJSON rows including a `boot db-identity-same-branch` PASS,
`boot neon-control-plane-branch-membership` PASS (or `skipped=true` with
`NEON_API_KEY` unset AND `N1_STAGE3_REAL` ≠ `true`), T1 PASS with
`c2_blocked_while_a_open: true` (the test is **truly concurrent** — B
starts INSERT while A is still OPEN; the partial unique index blocks B on
A's row lock until A commits, then B resolves 23505), T2 PASS, T3 PASS,
T4 PASS, `cleanup-needed` PASS (n_ids=0 on the success path), and a
`summary` row with `passed=28, failed=0`, `stage3_real_pass` reflecting
the run mode (see below).

> **Gate values on real `hrp_mp2_test` runs vs the local self-test**
> (audit fix 2026-09-12 22:30):
>
> | Run mode      | `N1_STAGE3_REAL` | control-plane row | `summary.stage3_real_pass` | probe exit |
> | ------------- | ---------------- | ----------------- | -------------------------- | ---------- |
> | Local self-test (no Neon creds) | unset / `local` | `pass:true, skipped:true, stage3_real_pass:false` | **`false`** (by design — this is a self-test, not a Stage 3 PASS) | 1 (gate fail — operator reads NDJSON; for the local embedded-PG self-test run, exit 1 is the EXPECTED outcome signalling "you cannot claim Stage 3 PASS from this run"). |
> | Real `hrp_mp2_test` with NEON creds | `true` | `pass:true, skipped:false, stage3_real_pass:true` | **`true`** | 0 |
> | Real `hrp_mp2_test` WITHOUT NEON creds (operator forgot) | `true` | probe refuses exit 71 BEFORE any DB write | n/a — probe never emits rows | 71 |
>
> **A `passed=28, failed=0` summary with `stage3_real_pass=false` is
> expected on the local self-test. It is NOT a real Stage 3 PASS. The
> operator MUST consume both NDJSON evidence AND step-1.5 gate verdict
> before claiming Stage 3 PASS.**

> Test counts: prior self-test (audit-fix commits) shipped 26 rows; the
> most recent self-test ships **28 rows** because the `cleanup-needed`
> row and the `neon-control-plane-branch-membership` boot row added 2
> new tests on top of the 26 pre-existing ones. **All gate checks refer
> to 28/28, not 25/25 or 26/26** — earlier references in earlier runs
> are obsolete.

**Important about cleanup**: the probe does NOT promise to leave the test DB in its starting state.
The cleanup blocks at T3 and T4 only run on the success path. If the probe aborts mid-script
(e.g. a thrown exception, `process.exit(70)` on connect failure, an unhandled rejection),
the seeded `labor_profiles`/`placement_case`/`candidate_submissions` rows from any completed
step will remain. Operator MUST clean those up **using exact IDs**, NOT LIKE patterns:

```sql
-- DO NOT use LIKE 'n1lp-%' / 'n1c%' / 'n1sub-%'. The test branch may
-- legitimately have rows whose IDs start with 'n1' (left over from a
-- previous probe run or from test data). The probe emits a
-- `cleanup-needed` row with the exact list of IDs it created in this
-- run; use ONLY those.

-- Example (replace ... with the contents of the `ids` array from the
-- `cleanup-needed` row):
DELETE FROM candidate_submissions WHERE id IN (...);   -- n1sub-* IDs from `ids`
DELETE FROM placement_case       WHERE id IN (...);   -- n1cA-* / n1cB-* / n1c-* IDs from `ids`
DELETE FROM labor_profiles       WHERE id IN (...);   -- n1lp-* IDs from `ids`
```

This is an UNVERIFIED-cleanup contract (we have not tested every abnormal-exit path). The
self-test on embedded PG 18.4 was a **28/28 PASS** with `cleanup-needed: pass=true, n_ids=0`,
but it never hit an abnormal exit path. Do not claim "DB returns to start state" without
operator's post-run `psql` verification.

**How operator finds exact IDs after abnormal exit**: the probe pushes each row it creates
into `idsCreatedThisRun` BEFORE attempting the INSERT (and pops it only after a successful
`DELETE ... RETURNING id` confirms the row was actually removed — audit fix 2026-09-12 22:00).
It then emits a `cleanup-needed` NDJSON row with the exact remaining list in the `ids` array
— and that row is emitted in a `finally{}` block AND in a `catch{}` block, so it is written
even if the probe aborts mid-script (uncaught exception, `process.exit(...)` between T1 and
the success-path cleanup). The `summary` row records `abnormal_exit: true` and
`abnormal_reason: <reason>` when the probe exited abnormally; in that state the operator
MUST consult the `cleanup-needed.ids` array (NOT LIKE patterns) and run the IN-list DELETEs
above.

**As a belt-and-braces measure against NDJSON loss**: the probe ALSO emits every ID it
creates (and every ID it successfully deletes) to **stderr** as one-line records of the form
`n1-trace: created <id>` and `n1-trace: deleted <id>`. The stderr stream is interleaved
with the stdout NDJSON by the shell, so even if the NDJSON file is truncated or the disk
fills up, the operator can recover the exact list of uncleaned IDs by diffing the stderr
`created` records against the `deleted` records. **No LIKE patterns, no time ranges, no
prefix matches anywhere.** This is the LAST-RESORT recovery path when both NDJSON and
operator memory are unavailable.

Decision matrix:

| Outcome | Action |
|---|---|
| `$probeExit = 0` AND summary line shows `passed=28, failed=0` AND `cleanup-needed` row says `n_ids=0` | Continue to STEP 5 (sanitize + commit evidence). **Stage 3 PASS** on this branch. |
| `$probeExit = 0` AND `passed=28` AND `cleanup-needed n_ids=0` BUT `boot neon-control-plane-branch-membership.skipped=true` (i.e. NEON_API_KEY or NEON_PROJECT_ID was not set on this `hrp_mp2_test` run) | **NOT a real Stage 3 PASS.** The control-plane branch-membership check was SKIPPED, not performed. On `hrp_mp2_test` (Neon real compute) Tier 0 MUST have supplied `NEON_API_KEY` + `NEON_PROJECT_ID` via the secure channel; if the check is skipped it means credentials were not set. STOP. Request Tier 0 to supply the credentials, then re-run STEP 4. Only the local self-test (embedded PG) is allowed to have `skipped=true` on the control-plane row. |
| `$probeExit != 0` OR summary line shows `failed>0` | **STOP — Stage 3 NOT PASS.** Inspect the row(s) that failed. The migration may have applied cleanly (verify by checking `_prisma_migrations`); if so, this is a **probe-only** failure (see "Probe-only failures" section below) and `migrate resolve` is NOT the recovery path. |
| … failure cause is `sqlstate=42501` on a SELECT inside T4 (RLS isolation) | The `t4-app_user_writer-grant-on-placement_case` row should ALREADY show what privilege is missing (the probe runs `has_table_privilege` as a separate row, per FIX 6). **DO NOT add a forward-only fix migration in this state** — Prisma is not the source of the failure; the existing GRANTs are. Escalate to Tier 0 with the captured `has_table_privilege` row. Tier 0 authorises a raw-SQL `GRANT` to `app_user_writer` (NOT `app_user`) plus a forward-only FIX migration so Prisma's history reflects the GRANT. Re-run STEP 4. Tier 3 LIGHT re-audit delta. |
| … failure cause is migration-DDL-related (a `42Pxx` or `23xxx` in a row that wasn't about concurrency or RESTRICT) AND `_prisma_migrations` shows `finished_at IS NULL` for one of the N1 migrations | This is a real migration failure. **Escalate to Tier 0 with the captured row + `_prisma_migrations` state.** Recovery path: `--resolve --rolled-back` then forward-only DDL fix then re-run. Tier 3 LIGHT re-audit delta. |
| … failure cause is migration-DDL-related BUT `_prisma_migrations` shows BOTH N1 migrations are `finished_at IS NOT NULL` (i.e. the migration was successful and the probe is wrong) | This is a **probe-only** failure — see "Probe-only failures" below. Do NOT issue `migrate resolve`. |
| … failure cause is T1 concurrency (c2 not blocked / c2 not 23505) | Means the partial unique index is NOT atomic. Verify by re-reading the row's `c2_blocked_while_a_open` and `sqlstate_c2`. If `c2_blocked: false` but `sqlstate_c2: 23505`, the test still proves "unique index works" but the contention path is unverified. STOP. Escalate to Tier 0/Owner immediately. |
| … failure cause is T3 FK RESTRICT missing | The N1 source migration must have failed silently. STOP. Escalate to Tier 0. |
| … failure cause is T4 RLS denies returning `>0` rows for PUBLIC/WORKER/SALE/CTV/ANON | Policy expression regressed. STOP. Escalate to Tier 0. |
| probe refuses to start with `REFUSED:` | One of the boot guards (URL-side endpoint-id, DB-side identity, or Neon control-plane branch membership) caught it. Verify STEP 1. If both URLs are correct, escalate — the probe's rules may need updating (rare). |

---

## STEP 5 — gate, then sanitize + commit evidence

### 5a — gate on probe exit code AND summary line BEFORE touching the file

> **Audit fix 2026-09-12 22:30 (Tier-0-block round 3)** — the gate now
> enforces `stage3_real_pass=true` semantics. A local self-test run
> (where `NEON_API_KEY` is unset) MUST show `stage3_real_pass=false` —
> that is the EXPECTED outcome, signalling the run is a self-test, NOT
> a real Stage 3 PASS. This gate is therefore TWO-MODE:
>
>   1. **Real `hrp_mp2_test` run**: `N1_STAGE3_REAL=true` (set in STEP 4).
>      Probe MUST emit `summary.stage3_real_pass=true`. Exit code MUST be 0.
>      If either is false → STOP, escalate to Tier 0.
>   2. **Local self-test run** (embedded PG, no `NEON_API_KEY`):
>      `N1_STAGE3_REAL` is unset. Probe emits `summary.stage3_real_pass=false`
>      by design (check was skipped). Exit code is 1.
>      The operator RUNS this gate in self-test mode to confirm the
>      28-row contract holds, sanity-checks DB cleanliness, and saves
>      the NDJSON. This is NOT a Stage 3 PASS — the claim requires the
>      real run mode above.

```powershell
$runMode = if ($env:N1_STAGE3_REAL -eq 'true') { 'real' } else { 'self-test' }
Write-Host "STEP 5a gate run-mode: $runMode (N1_STAGE3_REAL='$env:N1_STAGE3_REAL')"

if ($runMode -eq 'real') {
  # Real run — require probe exit 0 AND stage3_real_pass=true AND summary 28/28.
  if ($probeExit -ne 0) {
    throw "REAL RUN: probe exited $probeExit (expected 0). DO NOT commit. Stage 3 NOT PASS."
  }
  $jsonLines = Get-Content run-YYYYMMDD-HHMMSS.ndjson | Where-Object { $_ -match '^\{' }
  $summaryLine = $jsonLines | Where-Object { $_ -match '"kind":"summary"' } | Select-Object -First 1
  if (-not $summaryLine) { throw "REAL RUN: no summary line found. DO NOT commit." }
  $summary = $summaryLine | ConvertFrom-Json
  if ($summary.total -ne 28 -or $summary.passed -ne 28 -or $summary.failed -ne 0) {
    throw "REAL RUN: summary not 28/28 (total=$($summary.total) passed=$($summary.passed) failed=$($summary.failed)). DO NOT commit."
  }
  if (-not ($summary.PSObject.Properties.Name -contains 'stage3_real_pass')) {
    throw "REAL RUN: summary missing stage3_real_pass field. DO NOT commit. Probe contract drift; investigate."
  }
  # Audit fix 2026-09-12 23:30 (Tier-0-block round 7): the previous
  # guard was `-or $summary.stage3_real_pass`, which threw when the
  # value was TRUE — i.e. it REJECTED the real-pass case and silently
  # let the false-case through. The correct semantics for a real run
  # is "accept only when the field exists AND equals exactly the
  # boolean true". A naive `$x -eq $true` is NOT strict enough — in
  # PowerShell the string "true" compares equal to the boolean $true
  # (verified empirically with `probe-bool.ps1`). The robust check is
  # to require the value to be the boolean TYPE first, then verify
  # equality with $true. Anything else (missing, $null, $false, the
  # string "true", a number 1) refuses.
  $srp = $summary.stage3_real_pass
  if (($srp -isnot [bool]) -or (-not $srp)) {
    throw "REAL RUN: summary.stage3_real_pass is not the boolean true (got type=$($srp.GetType().Name) value='$srp'). DO NOT commit. Escalate to Tier 0."
  }
  Write-Host "REAL RUN gate OK: exit 0, summary 28/28, stage3_real_pass=true."
} else {
  # Self-test — require probe emit 28 NON-SUMMARY rows AND the summary
  # show stage3_real_pass=false (by design on local embedded PG with no
  # Neon creds). Exit code will be 1; that is EXPECTED.
  #
  # Audit fix 2026-09-12 22:45 (Tier-0-block round 5): the previous
  # formula `$lines.Count -ne 28` was wrong. The NDJSON file actually
  # carries **30 JSON lines**:
  #   - 1 URL-side boot log (no `test` field, has `kind:'boot'` only)
  #   - 28 row() outputs (test rows + db-identity + control-plane +
  #     cleanup-needed)
  #   - 1 summary row (`kind:'summary'`)
  # The summary's own `total` field is the AUTHORITATIVE row count.
  # We therefore:
  #   (a) parse the summary row and require `summary.total == 28`
  #   (b) require 29 non-summary JSON lines (URL-side boot + 28 rows)
  #   (c) require the summary to show stage3_real_pass=false
  $jsonLines = Get-Content run-YYYYMMDD-HHMMSS.ndjson | Where-Object { $_ -match '^\{' }
  $summaryLine = $jsonLines | Where-Object { $_ -match '"kind":"summary"' } | Select-Object -First 1
  if (-not $summaryLine) {
    throw "SELF-TEST gate FAILED: no summary row in NDJSON. DO NOT commit. Probe may have crashed before summary."
  }
  $summary = $summaryLine | ConvertFrom-Json
  # (a) summary.total must be 28 — this is the AUTHORITATIVE count from
  # the probe itself. Anything else means the probe emitted a different
  # number of row() calls, which means probe-side contract changed.
  if ($summary.total -ne 28) {
    throw "SELF-TEST gate FAILED: summary.total=$($summary.total), expected 28. DO NOT commit. Probe contract drift; investigate."
  }
  # (b) file must contain 29 non-summary JSON lines (URL-side boot + 28 rows).
  # Anything else means either a boot log was dropped or extra rows leaked.
  $nonSummary = $jsonLines | Where-Object { $_ -notmatch '"kind":"summary"' }
  $urlSideBoots = $nonSummary | Where-Object { ($_ -match '"kind":"boot"') -and ($_ -notmatch '"test":') }
  $dataRows     = $nonSummary | Where-Object { $_ -notmatch ('"kind":"boot"\s*\}\s*$|"kind":"boot"\s*,\s*"ts":') -or ($_ -match '"test":') }
  $expectedUrlSideBoots = 1
  $expectedDataRows     = 28
  if ($urlSideBoots.Count -ne $expectedUrlSideBoots) {
    throw "SELF-TEST gate FAILED: expected $expectedUrlSideBoots URL-side boot log(s), got $($urlSideBoots.Count). DO NOT commit. Probe boot log may have been dropped or duplicated."
  }
  # Verify URL-side boot has the expected shape (kind:'boot' with no test,
  # and contains `admin_fp` field).
  $firstBoot = $urlSideBoots[0] | ConvertFrom-Json
  if (-not $firstBoot.PSObject.Properties.Name -contains 'admin_fp') {
    throw "SELF-TEST gate FAILED: URL-side boot log is malformed (no admin_fp field). DO NOT commit."
  }
  $dataRowCount = ($nonSummary | Where-Object { $urlSideBoots -notcontains $_ }).Count
  if ($dataRowCount -ne $expectedDataRows) {
    throw "SELF-TEST gate FAILED: expected $expectedDataRows data rows, got $dataRowCount. DO NOT commit."
  }
  # (c) summary must show stage3_real_pass=false on self-test (by design).
  if (-not ($summary.PSObject.Properties.Name -contains 'stage3_real_pass')) {
    throw "SELF-TEST gate FAILED: summary missing stage3_real_pass field. DO NOT commit. Probe contract drift."
  }
  if ($summary.stage3_real_pass) {
    throw "SELF-TEST gate FAILED: expected summary.stage3_real_pass=false on self-test (it's a self-test, NOT a real Stage 3 PASS). DO NOT commit. The probe must report false whenever the control-plane check is skipped."
  }
  if ($summary.passed -ne 28 -or $summary.failed -ne 0) {
    throw "SELF-TEST gate FAILED: not 28/28 PASS (passed=$($summary.passed) failed=$($summary.failed)). DO NOT commit."
  }
  Write-Host "SELF-TEST gate OK: summary.total=28, 28 data rows + 1 URL-side boot + 1 summary = 30 JSON lines, summary.stage3_real_pass=false. (This is a self-test, NOT a Stage 3 PASS — the real run above is what counts.)"
}

# Common to both modes: cleanup-needed must show n_ids=0.
$lines = Get-Content run-YYYYMMDD-HHMMSS.ndjson
$cleanupLine = $lines | Where-Object { $_ -match '"kind":"cleanup-needed"' } | Select-Object -First 1
if (-not $cleanupLine) {
  throw "cleanup-needed row missing. DO NOT commit. Verify via the `run-*-stderr.log` trace (n1-trace: created vs deleted)."
}
$cleanup = $cleanupLine | ConvertFrom-Json
if ($cleanup.n_ids -ne 0) {
  throw "cleanup-needed has uncleaned IDs (n_ids=$($cleanup.n_ids), ids=[$($cleanup.ids -join ',')]). DO NOT commit. Operator must run the IN-list DELETEs from the cleanup comment BEFORE re-running."
}

Write-Host "Gate OK. Proceeding to sanitise."
```

### 5b — sanitise + commit evidence (raw bytes, no PowerShell line-wrapping)

> **Audit fix 2026-09-12 22:45 (Tier-0-block round 4)** — the previous
> STEP 5b reused the NDJSON helper for both stdout and stderr. The
> NDJSON helper filtered with `if ($l[0] -eq '{')`, which silently
> DROPS every `n1-trace:` line on stderr — Tier-0 caught the resulting
> empty trace evidence file. The two channels are now separated:
>
> - `write_ndjson_evidence.ps1` (NDJSON helper): writes JSON-shaped
>   records only, refuses if any `{`-line is unparseable, refuses if the
>   file contains `n1-trace:` lines (channel-mix safety).
> - `copy_stderr_trace.ps1` (stderr helper): writes `n1-trace:` lines
>   only, refuses if zero trace lines are present (empty-trace safety),
>   refuses if the file contains `{`-lines (channel-mix safety).
>
> Both helpers read the source via `[System.IO.File]::ReadAllText`
> (UTF-8 no BOM, no console transformation), parse line-by-line with
> try/catch, refuse on broken content, and write via
> `[System.IO.File]::WriteAllText` (raw bytes, LF only). PowerShell
> `Out-File` is NOT used anywhere in the evidence path.

```powershell
# 5b.1 — NDJSON evidence (stdout).
& 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/write_ndjson_evidence.ps1' `
    -Src 'run-YYYYMMDD-HHMMSS.ndjson' `
    -Dst 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/embedded-pg18-ndjson-rerun-YYYY-MM-DD-HH-MM.txt'
if ($LASTEXITCODE -ne 0) {
  throw "NDJSON evidence write FAILED (exit $LASTEXITCODE). The NDJSON is broken OR the source contains trace lines — DO NOT commit. Inspect the helper output."
}

# 5b.2 — stderr trace evidence (n1-trace).
& 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/copy_stderr_trace.ps1' `
    -Src 'run-YYYYMMDD-HHMMSS-stderr.log' `
    -Dst 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/embedded-pg18-stderr-rerun-YYYY-MM-DD-HH-MM.txt'
if ($LASTEXITCODE -ne 0) {
  throw "Stderr trace evidence write FAILED (exit $LASTEXITCODE). The stderr channel has no n1-trace lines OR the source contains JSON lines — DO NOT commit. Inspect the helper output."
}

# Sanity: confirm no credential-like string in NDJSON (regex semantics
# required — do NOT add `-SimpleMatch`).
$hits = Select-String -Path 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/embedded-pg18-ndjson-rerun-YYYY-MM-DD-HH-MM.txt' -Pattern '(?i)(password|secret|token|postgresql://[^"]+@)'
if ($hits) { throw "Credential-like string leaked: $($hits | Out-String). DO NOT commit." }

# Sanity: stderr trace must contain BOTH `created` and `deleted`
# records. On the success path these are equal in count (parity). On
# the failure path the difference is exactly the uncleaned set.
$traceContent = Get-Content 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/embedded-pg18-stderr-rerun-YYYY-MM-DD-HH-MM.txt'
$createdTrace = ($traceContent | Select-String -SimpleMatch 'n1-trace: created ').Count
$deletedTrace = ($traceContent | Select-String -SimpleMatch 'n1-trace: deleted ').Count
if ($createdTrace -eq 0 -or $deletedTrace -eq 0) {
  throw "Stderr trace looks incomplete: created=$createdTrace deleted=$deletedTrace. Both should be >= 1 on any probe run that inserted + cleaned at least one row. DO NOT commit."
}

Write-Host "Sanitise OK: NDJSON parseable, stderr trace has created=$createdTrace / deleted=$deletedTrace (parity check), no credentials. Proceeding to commit."
```

Commit (Tier 1 author):

```
docs(tasks/hrp-v6-n1-placement-case-foundation): stage_3 PASS evidence (hrp_mp2_test)

- 28/28 PASS, exit 0
- url-side endpoint-id check OK
- db-identity-same-branch OK (admin/writer on same compute, role matches)
- neon-control-plane-branch-membership OK (both endpoint-ids map to the SAME branch of NEON_PROJECT_ID AND branch name = `hrp_mp2_test`), or skipped (local self-test where NEON_API_KEY / NEON_PROJECT_ID are not set)
- migrate status pre-check OK
- migrate deploy OK (ADD-only)
- probe OK (T1 with c2_blocked_while_a_open=true, T2, T3, T4 all green)
- cleanup-needed n_ids=0 (all run-scoped rows deleted on success path)
- forward-only fix migration: NOT NEEDED (or, if needed: describe what was added)

date: YYYY-MM-DD HH:MM
```

---

## STEP 6 — Tier 0 sign-off (NOT Tier 1's call)

After the evidence is committed, Tier 1 notifies Tier 0:

> Stage 3 (N1 DB proof) **PASS** on `hrp_mp2_test`. Evidence:
> `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-{ndjson-clean.txt,README.md}`.
> Forward-only fix migration: **NOT NEEDED** / **REQUIRED, see `<file>`**.

Tier 0 reviews the evidence. **Only Tier 0 may sign off stage_3 → stage_4.**
Stage 4 = prod migration deploy on `hrp-live` (different task, different role).

Tier 1 MUST NOT:
- self-deploy on `hrp-live` (DEC-N1-06).
- open AV6 (cùng schema luồng).
- skip the Tier 0 sign-off even if the test run was perfectly clean.

---

## Probe-only failures — recovery WITHOUT `migrate resolve`

> **Audit fix 21:00.** A probe-only failure is one where the migration
> applied cleanly (`_prisma_migrations` shows BOTH N1 rows with
> `finished_at IS NOT NULL`) but the probe reported `failed>0`. In this
> state **`migrate resolve` is the WRONG action** — the migration is fine.
> Issuing `--resolve --rolled-back` would re-mark a completed migration as
> rolled back, requiring a forward-only fix migration that adds nothing,
> and would silently invalidate downstream checks. The correct recovery
> is to fix the probe (or its environment), NOT the migration.

How to recognise a probe-only failure:

```sql
-- If both N1 rows have finished_at set, the migrations are good. The
-- failure is on the probe side.
SELECT migration_name, finished_at IS NOT NULL AS completed
  FROM _prisma_migrations
 WHERE migration_name LIKE '%n1%';
-- Expected:
--   20260912140411_n1_placement_case_foundation  | t
--   20260912140412_n1_placement_case_rls        | t
```

Decision matrix for probe-only failures:

| Failed test row | Probable cause | Recovery |
|---|---|---|
| `boot neon-control-plane-branch-membership` (rare — only when the key is set) | Operator set `NEON_PROJECT_ID` to a wrong project, or the API token's project scope doesn't match. | Re-check the credentials in the secure channel. Re-run STEP 4 only. |
| `boot db-identity-same-branch` | DB-side identity mismatch; URL misconfiguration. | Re-run STEP 1; if it's still wrong, escalate to Tier 0. |
| `who admin-connection-identity` / `writer-connection-identity` | URL parsed a different role than expected. | Re-run STEP 1; URL/role mapping is wrong. |
| `schema migration-…_foundation-applied` / `_rls-applied` | `_prisma_migrations` table doesn't carry the migration name. (Different from "migration failed".) | Check if a manual `prisma migrate resolve --applied` was issued against a different Prisma deployment. NO automatic recovery — escalate to Tier 0. |
| `schema placement_case-exists` / `policies` | DDL state wrong. **Could be a silent migration failure** — verify `_prisma_migrations` state. If migration is incomplete, this is NOT probe-only; escalate. |
| `t1 concurrent-insert-…-23505` (with `c2_blocked_while_a_open: false`) | The 800ms probe window was too short OR the partial unique index never blocked. | First re-run to rule out timing noise. If reproducible, this is a hard regression — escalate to Tier 0. Do NOT `migrate resolve`. |
| `t1` with `c2_blocked_while_a_open: true` but `sqlstate_c2 != 23505` | The partial unique index blocked c2 (proving contention) but didn't reject with 23505 after c1 commit. | Verify PG version (some versions emit 40001 in serializable mode). Escalate to Tier 0. |
| `t2-…` (single-tx same-active → 23505) | Partial unique index behaviour changed. Escalate. |
| `t3-…` FK RESTRICT | Migration may have been applied without the FK action. **Possibly migration-side** — verify `_prisma_migrations`. |
| `t4-…` RLS | Policy expression regressed. Escalate. |
| `cleanup-needed n_ids > 0` | Probe did not finish — partial cleanup state. Operator runs the IN-list cleanup SQL from STEP 4 (NOT `LIKE`). Then re-run STEP 4. |

**Cardinal rule for probe-only failures:** the migration is good; do
NOT issue `prisma migrate resolve`. Re-run STEP 4 (probe) only after
capturing the failed row's `sqlstate`, `message`, and `c2_blocked_*`
fields, plus an `pg_stat_activity` snapshot if relevant. If the failure
reproduces across two consecutive runs, escalate to Tier 0 with the
captured evidence — Tier 0 decides whether to:
- patch the probe (test logic bug),
- patch the source migration (DDL drift — Tier 3 LIGHT re-audit required),
- declare a real production bug (Path A — different task).

`migrate resolve` is reserved for **migration-side** failures
(`finished_at IS NULL AND rolled_back_at IS NULL` in
`_prisma_migrations` after STEP 3 `migrate deploy`). Probe-only
failures are not migration-side.

---

## Failure-recovery: how forward-only fix migrations work (Tier 0 authorised)

> **Pre-condition: ONLY when `_prisma_migrations` shows
> `finished_at IS NULL AND rolled_back_at IS NULL` on one of the N1
> rows after STEP 3 `migrate deploy` exited non-zero.** NOT for
> probe-only failures (see the section above).

If Tier 0 authorises the recovery path that uses a new migration, the fix is a NEW Prisma
migration (filename starts with a NEW timestamp > `20260912140412_n1_placement_case_rls`).
The two N1 source migrations are NEVER edited (DEC-02, append-only history).

**Important preconditions before adding a forward-only fix migration:**
1. Tier 0 has authorised the recovery path AND the fix SQL.
2. The failed migration has been `prisma migrate resolve --rolled-back` first (Prisma blocks
   new migrations until the failed one is resolved; this is the trigger that lets
   the fix migration apply).
3. Tier 3 LIGHT delta re-audit has signed off the fix SQL.

Pattern for a GRANT fix:

```sql
-- migration.sql: forward-only fix; idempotent; targets exactly the missing privilege.
DO $$
BEGIN
  IF NOT (SELECT has_table_privilege('app_user_writer', 'placement_case', 'INSERT')) THEN
    GRANT INSERT ON placement_case TO app_user_writer;
  END IF;
END $$;
```

Pattern for an RLS-related DDL fix:

```sql
-- forward-only; do NOT recreate the existing policy; add a new GRANT or DO block.
```

Tier 3 LIGHT delta re-audit scans the new migration's SQL for the same blast-radius questions as the original N1 review (FORCE RLS, partial unique, FK RESTRICT, role grant scope). After delta sign-off, re-run STEP 4 from the top (STEP 1 + STEP 2 + STEP 3 + STEP 4 + STEP 5).

---

## Anti-patterns explicitly forbidden

1. ❌ `prisma migrate resolve --rolled-back` (or `--applied`) WITHOUT Tier 0 authorisation. AND ❌ adding a new forward-only migration BEFORE the failed one has been `--resolve`'d. Prisma blocks the new migration in that state; trying to force it via `prisma db push` destroys migration history.
2. ❌ `prisma db push` (overwrites migration history — kills the forensic trail).
3. ❌ `psql -c "DROP POLICY ..."` to "unblock" a probe row. The policy is correct; the GRANT may be wrong.
4. ❌ `GRANT DELETE ON … TO app_user`. The runtime never needs DELETE; granting it widens blast radius.
5. ❌ Running `prisma migrate deploy` against `hrp-live` from this work session. `hrp-live` is locked.
6. ❌ Posting the URLs (or any string containing them) in chat, PR descriptions, or git commit messages.
7. ❌ Editing the two N1 source migration files. ADD-only, forward-only.
8. ❌ `Select-String -SimpleMatch` on a regex pattern. `-SimpleMatch` makes the pattern a literal string and never matches `(password|secret|token|postgresql://[^"]+@)`. Always omit `-SimpleMatch` when using a regex pattern for credential scanning.
9. ❌ Claiming "DB returns to start state" after the probe without operator verification. The probe's cleanup is best-effort on the success path only.
10. ❌ Relying on URL hostname or DB name alone as branch evidence. Neon direct/pooler routing differs in hostname; `neondb` is the default name on every clone. Cross-check via DB-side identity (`current_database()`, `inet_server_addr()`).
