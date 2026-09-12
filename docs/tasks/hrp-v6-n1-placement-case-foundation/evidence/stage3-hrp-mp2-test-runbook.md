# N1 stage_3 — Operator Runbook (hrp_mp2_test branch run)

> Pre-flight self-test (offline PG 18.4 embedded) is **25/25 PASS**.
> This file is the gate procedure Tier 1/Operator MUST follow before
> stage_3 is marked PASS on `hrp_mp2_test`.

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

## STEP 1 — Endpoint fingerprint check (operator)

**Tier 1 / Operator**: BEFORE running any `psql`, `migrate`, or `probe` — verify both URLs in the secret channel resolve to a Neon endpoint that is NOT `hrp-live`.

```powershell
$adminUrl  = $env:TEST_DATABASE_URL_ADMIN
$writerUrl = $env:TEST_DATABASE_URL_WRITER

function fingerprint($u) { 'fp:' + ([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($u))[0..5] | %{ $_.ToString('x2') }) -join '' }
function hostOf($u) { ([Uri]$u).Host }
function dbOf($u)   { ([Uri]$u).AbsolutePath.TrimStart('/') }

$prodHost = 'shy-tree-az32as2c'
Write-Host "admin  fp=$(fingerprint $adminUrl)  host=$(hostOf $adminUrl)  db=$(dbOf $adminUrl)"
Write-Host "writer fp=$(fingerprint $writerUrl) host=$(hostOf $writerUrl) db=$(dbOf $writerUrl)"

if ((hostOf $adminUrl)  -match $prodHost -and (dbOf $adminUrl)  -eq 'neondb') { throw 'REFUSED: admin URL fingerprints hrp-live' }
if ((hostOf $writerUrl) -match $prodHost -and (dbOf $writerUrl) -eq 'neondb') { throw 'REFUSED: writer URL fingerprints hrp-live' }

# BOTH URLs MUST resolve to the SAME endpoint (same hostname). Different hostnames = wrong config; STOP.
if ((hostOf $adminUrl) -ne (hostOf $writerUrl)) {
  throw "REFUSED: admin and writer point at DIFFERENT hosts: admin=$($(hostOf $adminUrl)), writer=$($(hostOf $writerUrl)). Tier 1 will not run on a split-config test DB."
}

# Both URLs MUST target the SAME database on the same branch.
if ((dbOf $adminUrl) -ne (dbOf $writerUrl)) {
  throw "REFUSED: admin and writer point at DIFFERENT databases: admin=$($(dbOf $adminUrl)), writer=$($(dbOf $writerUrl)). Split-DB is not a supported probe state."
}

Write-Host "OK: both URLs resolve to the same test-branch endpoint AND that endpoint is not hrp-live."
```

**If any check fails → STOP. Do NOT run migrate or probe. Escalate to Tier 0.**

This step is the FIRST defense against accidentally hitting `hrp-live`.
The probe's built-in guard (FP rule) is the SECOND defense.

---

## STEP 2 — `migrate status` (operator, READ-ONLY)

```powershell
$env:DATABASE_URL_ADMIN = $env:TEST_DATABASE_URL_ADMIN
$env:DATABASE_URL       = $env:TEST_DATABASE_URL_WRITER  # app_user_writer (Prisma runtime)
npx prisma migrate status
```

Decision matrix:

| Status output | Action |
|---|---|
| Both N1 migrations already applied; no other pending | Go to STEP 4 (run probe directly) |
| **Only** `20260912140411_n1_placement_case_foundation` and `20260912140412_n1_placement_case_rls` are pending | Go to STEP 3 (apply these two) |
| Any other migration is also pending (e.g. `…_m14_rls_matrix_repair`, `…_marketplace_search_tracking_profile`) | **STOP**. Tier 1 was told N1 is ADD-only against the current state. If other migrations show as pending, the cutover state on `hrp_mp2_test` does NOT match what Tier 1 designed for. Escalate to Tier 0 — do NOT deploy. |
| Any migration shows `failed_at IS NOT NULL` | **STOP**. Capture the `ERROR:` line + SQLSTATE. Escalate to Tier 0. Do NOT issue `prisma migrate resolve --rolled-back` until Tier 0 authorises. |
| `_prisma_migrations` table is missing or empty | **STOP**. The test branch isn't a real Prisma-managed DB. Escalate. |

---

## STEP 3 — `migrate deploy` for the two N1 migrations ONLY

**Only after STEP 2 confirmed ONLY the two N1 migrations are pending.**

```powershell
npx prisma migrate deploy
```

Decision matrix:

| Exit | Action |
|---|---|
| `0` (clean) | Continue to STEP 4 |
| `non-zero` | **DO NOT auto-rollback.** Capture the last `ERROR:` line + SQLSTATE. Run `npx prisma migrate status` to see whether Prisma marked the failed migration as `failed_at = now()`. Report state to Tier 0. Do NOT issue `--resolve` until Tier 0 authorises. |
| `non-zero` AND the error is `42501` mid-migration | This means a GRANT inside the N1 migration is failing. Capture the missing privilege via `psql -c "SELECT has_table_privilege('app_user_writer', '<table>', '<privilege>');"` for each table listed in the error. Write a forward-only FIX migration granting **only** the missing privilege (no broad `GRANT DELETE TO app_user`; in production the runtime DML needs are SELECT/INSERT/UPDATE; DELETE is not granted to `app_user_writer` because the runtime never deletes rows). Tier 3 LIGHT re-audit delta before retrying. |
| `non-zero` AND the error is a migration SQL error (NOT 42501) | Capture `ERROR:` + SQLSTATE. The original 2 N1 source migrations are FORWARD-ONLY — DO NOT modify them. Write a forward-only FIX migration that adds the missing DDL. Tier 3 LIGHT re-audit delta before retrying. |

The user's rule "không mặc định 'ADD-only nên tự rollback'" applies here. A failed
migration is data evidence; auto-rolling-back would erase the forensic trail.

---

## STEP 4 — run the probe

```powershell
node scratch/n1-stage3-db-proof/probe.mjs > run-$(Get-Date -Format 'yyyyMMdd-HHmmss').ndjson
```

Expected: 25 NDJSON rows ending with `{"kind":"summary","total":25,"passed":25,"failed":0}`.

Decision matrix:

| Outcome | Action |
|---|---|
| `passed=25`, `failed=0` | Continue to STEP 5 (sanitize + commit evidence). **Stage 3 PASS**. |
| `passed=24`, any single row `pass=false` | **STOP — Stage 3 NOT PASS.** Inspect the row that failed. |
| … failure cause is `sqlstate=42501` on a SELECT inside T4 (RLS isolation) | The `t4-app_user_writer-grant-on-placement_case` row should ALREADY show what privilege is missing (the probe runs `has_table_privilege` as a separate row, per FIX 6). Write a forward-only GRANT migration granting exactly that privilege to `app_user_writer` (NOT `app_user`). Re-run STEP 4. Tier 3 LIGHT re-audit delta. |
| … failure cause is migration-DDL-related (a `42Pxx` or `23xxx` in a row that wasn't about concurrency or RESTRICT) | The `g0_schema_reconcile` migration is from a DIFFERENT task — its grants are a given, not a guarantee. The probe's `has_table_privilege` row IS the source of truth for what is actually granted. Write a forward-only FIX migration matching what `has_table_privilege` reports as missing. Re-run STEP 4. Tier 3 LIGHT re-audit delta. |
| … failure cause is T1 concurrency | Means the partial unique index is NOT atomic. This is a hard block — escalate to Tier 0/Owner immediately. Do NOT retry. |
| … failure cause is T3 FK RESTRICT missing | The N1 source migration must have failed silently. STOP. Escalate to Tier 0. |
| … failure cause is T4 RLS denies returning `>0` rows for PUBLIC/WORKER/SALE/CTV/ANON | Policy expression regressed. STOP. Escalate to Tier 0. |
| probe refuses to start with `REFUSED:` | The fingerprint guard caught it. Verify STEP 1. If both URLs are correct, escalate — the probe's fingerprint rule may need updating (rare). |

**Important**: the probe clears its own fixtures on completion (admin connection, bypasses FORCE RLS). The test DB ends in the same state it started in.

---

## STEP 5 — sanitize + commit evidence

The probe NEVER prints cleartext credentials. It prints only SHA-256 fingerprints (12 hex chars) and host tails. Still, before committing:

```powershell
Select-String -Path run-YYYYMMDD-HHMMSS.ndjson -Pattern '^\{'
  | ForEach-Object { $_.Line }
  | Out-File docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-ndjson-clean.txt -Encoding utf8

# Sanity: confirm no credential-like string in the file.
Select-String -Path docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-ndjson-clean.txt -Pattern '(password|secret|token|postgresql://[^"]+@)' -SimpleMatch
```

If `Select-String` matches anything → STOP, redact, retry. (The probe does not print credentials, but operator-side commands that wrap it could.)

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

## Failure-recovery: how forward-only fix migrations work

If a probe row fails, the fix is a NEW Prisma migration (filename starts with a NEW timestamp > `20260912140412_n1_placement_case_rls`). The two N1 source migrations are NEVER edited (DEC-02, append-only history).

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

Tier 3 LIGHT delta re-audit scans the new migration's SQL for the same blast-radius questions as the original N1 review (FORCE RLS, partial unique, FK RESTRICT, role grant scope). After delta sign-off, re-run STEP 4.

---

## Anti-patterns explicitly forbidden

1. ❌ `prisma migrate resolve --rolled-back` without Tier 0 authorisation.
2. ❌ `prisma db push` (overwrites migration history — kills the forensic trail).
3. ❌ `psql -c "DROP POLICY ..."` to "unblock" a probe row. The policy is correct; the GRANT may be wrong.
4. ❌ `GRANT DELETE ON … TO app_user`. The runtime never needs DELETE; granting it widens blast radius.
5. ❌ Running `prisma migrate deploy` against `hrp-live` from this work session. `hrp-live` is locked.
6. ❌ Posting the URLs (or any string containing them) in chat, PR descriptions, or git commit messages.
7. ❌ Editing the two N1 source migration files. ADD-only, forward-only.
