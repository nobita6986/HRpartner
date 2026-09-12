# N1 stage_3 — Operator Runbook (hrp_mp2_test branch run)

> **What this runbook is NOT:** it is NOT a green light to run on `hrp_mp2_test`.
> It is the gate procedure Tier 1 / Operator MUST follow **after** Owner/OP
> has injected `TEST_DATABASE_URL_ADMIN` + `TEST_DATABASE_URL_WRITER` via
> the secure channel.
>
> **25/25 PASS on the embedded PG 18.4 self-test (commit ee1a5ef) is a
> SELF-TEST, not a Stage 3 PASS.** It proves the probe + migration
> combination is correct. Stage 3 PASS happens only when the same probe
> produces 25/25 against `hrp_mp2_test` AND Tier 0 signs off.
>
> **Cleanup contract caveat**: the probe only cleans up its fixtures on the
> success path. On abnormal exit (connect failure, unhandled exception,
> `process.exit(...)` early), the seeded `n1lp-%` / `n1c%` / `n1sub-%`
> rows remain. Operator must clean them up via the SQL in STEP 4. Do not
> claim "DB returns to start state" without post-run verification.

## STEP 0 — read the rules before doing anything

| Rule | Source |
|---|---|
| Tier 1 NEVER auto-runs against `hrp-live`. | PLANNER §v2.13; DEC-N1-06 |
| Owner/OP injects URLs via the secure channel (not chat). | DEC credential hygiene |
| Fingerprint block: probe REFUSES host=`ep-shy-tree-az32as2c...` + db=`neondb`. | `probe.mjs` boot guard |
| N1 must not auto-touch anything outside its 2 source migrations. | DEC-N1-05 (ADD-only) |
| Forward-only fix migration is the ONLY allowed fix tool. | DEC-02 history preservation |
| Tier 3 LIGHT delta re-audit required after any forward-only fix. | DEC-Tier-3 |
| Tier 0 must sign-off Stage 3 → Stage 4 (prod migration deploy). | PLANNER §v2.15 |
| hrp-live deployment and AV6 are STILL locked until Stage 4 sign-off. | PLANNER §v2.15 |

---

## STEP 1 — Endpoint fingerprint + endpoint-identity check (operator)

**Tier 1 / Operator**: BEFORE running any `psql`, `migrate`, or `probe` — verify both URLs in the secret channel resolve to a Neon endpoint that is NOT `hrp-live`.

> **CORRECTED** — the old rule "same hostname + same DB" is WRONG.
>
> Neon gives you **two routing modes** for the SAME branch endpoint:
> - **Direct**:    `ep-<endpoint-id>.<region>.aws.neon.tech`  (port 5432)
> - **Pooled**:    `ep-<endpoint-id>-pooler.<region>.aws.neon.tech`  (port 5432)
>
> The endpoint-ID (`shy-tree-az32as2c`) is identical across modes. But the FULL hostnames differ (`ep-shy-tree-az32as2c...` vs `ep-shy-tree-az32as2c-pooler...`).
> Neon's default database name is `neondb` and stays `neondb` on clones — so DB name alone is NOT branch evidence either.
>
> The CORRECT check is on **DB-side identity**: the admin connection and the writer connection must report the same `current_database()` AND the same `inet_server_addr()` AND a Neon control-plane identifier that does NOT match the prod project. We get that identifier by running `psql` against each URL.

```powershell
$adminUrl  = $env:TEST_DATABASE_URL_ADMIN
$writerUrl = $env:TEST_DATABASE_URL_WRITER

# --- (a) Refuse any URL that points at the prod Neon endpoint AND default DB. ---
$PROD_ENDPOINT_ID = 'shy-tree-az32as2c'  # unique fragment of the prod Neon endpoint host
$PROD_DB          = 'neondb'             # prod default DB; matches by name on every clone too
function fingerprint($u) { 'fp:' + ([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($u))[0..5] | %{ $_.ToString('x2') }) -join '' }
function hostOf($u) { ([Uri]$u).Host }
function dbOf($u)   { ([Uri]$u).AbsolutePath.TrimStart('/') }

Write-Host "admin  fp=$(fingerprint $adminUrl)  host=$(hostOf $adminUrl)  db=$(dbOf $adminUrl)"
Write-Host "writer fp=$(fingerprint $writerUrl) host=$(hostOf $writerUrl) db=$(dbOf $writerUrl)"

# Refuse ONLY if BOTH the endpoint-id and the DB name match the prod combo.
if ((hostOf($adminUrl))  -match $PROD_ENDPOINT_ID -and (dbOf($adminUrl))  -eq $PROD_DB) {
  throw 'REFUSED: admin URL fingerprints hrp-live (endpoint-id + db name match prod). Use the hrp_mp2_test branch endpoint instead.'
}
if ((hostOf($writerUrl)) -match $PROD_ENDPOINT_ID -and (dbOf($writerUrl)) -eq $PROD_DB) {
  throw 'REFUSED: writer URL fingerprints hrp-live (endpoint-id + db name match prod). Use the hrp_mp2_test branch endpoint instead.'
}

# --- (b) Cross-check DB-side identity. This is what actually proves "same branch". ---
$adminDbInfo  = psql $adminUrl  -At -c "SELECT current_database() || '|' || coalesce(host(inet_server_addr()),'?') || '|' || current_user"
$writerDbInfo = psql $writerUrl -At -c "SELECT current_database() || '|' || coalesce(host(inet_server_addr()),'?') || '|' || current_user"
Write-Host "admin  identity: $adminDbInfo"
Write-Host "writer identity: $writerDbInfo"

# admin identity:  db | server-IP | role   (role will be 'neondb_owner' on Neon, role of the URL)
# writer identity: db | server-IP | role   (role will be 'app_user_writer')
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

Write-Host "OK: both URLs resolve to the same Neon compute AND that compute is not hrp-live."
```

**If any check fails → STOP. Do NOT run migrate or probe. Escalate to Tier 0.**

This step is the FIRST defense against accidentally hitting `hrp-live`.
The probe's built-in guard (boot block, see STEP 4) is the SECOND defense.
Both use the same `PROD_ENDPOINT_ID + PROD_DB` rule and will agree.

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
node scratch/n1-stage3-db-proof/probe.mjs > run-$(Get-Date -Format 'yyyyMMdd-HHmmss').ndjson
$probeExit = $LASTEXITCODE
```

Expected: 25 NDJSON rows ending with `{"kind":"summary","total":25,"passed":25,"failed":0}` and `$probeExit = 0`.

**Important about cleanup**: the probe does NOT promise to leave the test DB in its starting state.
The cleanup blocks at T3 and T4 only run on the success path. If the probe aborts mid-script
(e.g. a thrown exception, `process.exit(70)` on connect failure, an unhandled rejection),
the seeded `labor_profiles`/`placement_case`/`candidate_submissions` rows from any completed
step will remain. Operator must clean those up via:

```sql
DELETE FROM candidate_submissions WHERE id LIKE 'n1sub-%';
DELETE FROM placement_case      WHERE id LIKE 'n1c%';
DELETE FROM labor_profiles      WHERE id LIKE 'n1lp-%';
```

This is an UNVERIFIED-cleanup contract (we have not tested every abnormal-exit path). The
self-test on embedded PG 18.4 was a 25/25 PASS, but it never hit an abnormal exit path. Do not
claim "DB returns to start state" without operator's post-run `psql` verification.

Decision matrix:

| Outcome | Action |
|---|---|
| `$probeExit = 0` AND summary line shows `passed=25, failed=0` | Continue to STEP 5 (sanitize + commit evidence). **Stage 3 PASS** on this branch. |
| `$probeExit != 0` OR summary line shows `failed>0` | **STOP — Stage 3 NOT PASS.** Inspect the row(s) that failed. |
| … failure cause is `sqlstate=42501` on a SELECT inside T4 (RLS isolation) | The `t4-app_user_writer-grant-on-placement_case` row should ALREADY show what privilege is missing (the probe runs `has_table_privilege` as a separate row, per FIX 6). **DO NOT add a forward-only fix migration in this state** — Prisma is not the source of the failure; the existing GRANTs are. Escalate to Tier 0 with the captured `has_table_privilege` row. Tier 0 authorises a raw-SQL `GRANT` to `app_user_writer` (NOT `app_user`) plus a forward-only FIX migration so Prisma's history reflects the GRANT. Re-run STEP 4. Tier 3 LIGHT re-audit delta. |
| … failure cause is migration-DDL-related (a `42Pxx` or `23xxx` in a row that wasn't about concurrency or RESTRICT) | The `g0_schema_reconcile` migration is from a DIFFERENT task — its grants are a given, not a guarantee. The probe's `has_table_privilege` row IS the source of truth for what is actually granted. Escalate to Tier 0 with the captured row. The recovery path is `--resolve --rolled-back` then forward-only DDL fix then re-run. Tier 3 LIGHT re-audit delta. |
| … failure cause is T1 concurrency | Means the partial unique index is NOT atomic. This is a hard block — escalate to Tier 0/Owner immediately. Do NOT retry. |
| … failure cause is T3 FK RESTRICT missing | The N1 source migration must have failed silently. STOP. Escalate to Tier 0. |
| … failure cause is T4 RLS denies returning `>0` rows for PUBLIC/WORKER/SALE/CTV/ANON | Policy expression regressed. STOP. Escalate to Tier 0. |
| probe refuses to start with `REFUSED:` | The fingerprint guard caught it. Verify STEP 1. If both URLs are correct, escalate — the probe's fingerprint rule may need updating (rare). |

---

## STEP 5 — gate, then sanitize + commit evidence

### 5a — gate on probe exit code AND summary line BEFORE touching the file

```powershell
if ($probeExit -ne 0) {
  throw "Probe exited non-zero ($probeExit). Do NOT commit. Escalate to Tier 0 (Stage 3 NOT PASS)."
}

# Require the summary line to be exactly {"kind":"summary","total":25,"passed":25,"failed":0}.
$summaryLine = Select-String -Path run-YYYYMMDD-HHMMSS.ndjson -Pattern '"kind"\s*:\s*"summary"' -List
if (-not $summaryLine) {
  throw "No summary line found in NDJSON. Probe may have crashed before summary. Do NOT commit."
}
if ($summaryLine.Line -notmatch '"total":\s*25' -or
    $summaryLine.Line -notmatch '"passed":\s*25' -or
    $summaryLine.Line -notmatch '"failed":\s*0') {
  throw "Summary line does not match 25/25 PASS. Line was: $($summaryLine.Line). Do NOT commit."
}

Write-Host "Gate OK: probe exit 0 + summary 25/25 PASS. Proceeding to sanitise."
```

### 5b — sanitise (probe never prints cleartext credentials, but operator wrapper commands could)

> **CORRECTED** — the old `Select-String -SimpleMatch …` made the regex literal-string
> match, so `(password|secret|token|postgresql://...)` was searched as ONE literal string
> and never matched anything. Drop `-SimpleMatch` so regex semantics apply.

```powershell
# Keep only the JSON lines (probe sometimes prints console.error REFUSED lines we want to skip).
Select-String -Path run-YYYYMMDD-HHMMSS.ndjson -Pattern '^\{'
  | ForEach-Object { $_.Line }
  | Out-File docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-ndjson-clean.txt -Encoding utf8

# Sanity: confirm no credential-like string in the cleaned file.
# -SimpleMatch is INTENTIONALLY OMITTED: regex semantics are required.
$hits = Select-String -Path docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-ndjson-clean.txt -Pattern '(?i)(password|secret|token|postgresql://[^"]+@)'
if ($hits) {
  throw "Credential-like string leaked into evidence file: $($hits | Out-String). Stop. Redact manually before retrying."
}

Write-Host "Sanitise OK: no credential-like strings in the cleaned NDJSON."
```

If `Select-String` returns any hits → STOP, redact, retry. (The probe does not print
credentials, but operator-side commands that wrap it could.)

Commit (Tier 1 author):

```
docs(tasks/hrp-v6-n1-placement-case-foundation): stage_3 PASS evidence (hrp_mp2_test)

- 25/25 PASS, exit 0
- fingerprint rule pre-check OK
- migrate status pre-check OK
- migrate deploy OK (ADD-only)
- probe OK (T1, T2, T3, T4 all green)
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

## Failure-recovery: how forward-only fix migrations work (Tier 0 authorised)

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
