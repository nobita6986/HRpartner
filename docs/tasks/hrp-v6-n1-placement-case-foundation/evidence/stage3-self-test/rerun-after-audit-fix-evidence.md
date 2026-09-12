# N1 stage_3 — re-run evidence after audit fix (commit 551f303)

> **Purpose:** bind the user's request "sửa các điểm trên, chạy lại self-test và
> gửi diff cùng bằng chứng" to a single evidence artifact. This file documents:
> (a) what was changed, (b) the re-run command + outcome, (c) the diff vs the
> prior self-test evidence, (d) the full NDJSON for the re-run.

## What was changed (commit 551f303, parent 3662099)

4 audit fixes to `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-runbook.md`
and `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/probe.mjs`:

1. STEP 2/3 migration-failed detection now uses `finished_at IS NULL AND rolled_back_at IS NULL`
   (Prisma's `_prisma_migrations` does NOT have a `failed_at` column).
2. STEP 1 endpoint check rewritten: dropped "same hostname + db=neondb" rule
   (Neon direct vs pooler have different hostnames; `neondb` is the default
   name on every clone). Replaced with DB-side identity check
   (`current_database()` + `host(inet_server_addr())` must match on both URLs).
3. STEP 5 sanitise: removed `-SimpleMatch` flag (it made the credential regex
   a literal string and never matched). Added STEP 5a exit-code + summary-line
   gate before sanitising.
4. STEP 3/4 + "Failure-recovery" sections now require Tier-0 authorisation
   before any `prisma migrate resolve --{rolled-back,applied}` AND before any
   new migration can run (Prisma blocks new migrations while a prior one is
   stuck). Forward-only fix is no longer auto-prescribed.

Plus probe.mjs:
- Added `db-identity-same-branch` boot row (audit fix 7).
- Added `abnormal_exit` + `abnormal_reason` to summary (audit fix 8).
- `process.exit(70|77|78|79)` paths now `.end()` clients first (no leaked conns).
- Dropped the implicit "DB returns to start state" claim.

## Re-run command

```powershell
Remove-Item -Recurse -Force C:\Users\Admin\pg-probe\pgdata           # wipe data dir
cd C:\Users\Admin\pg-probe
$env:N1P3_PORT = '55433'                                              # 55432 held by stale SYSTEM-owned postgres
$env:TEST_DATABASE_URL_ADMIN  = 'postgres://neondb_owner:neondb_owner@127.0.0.1:55433/n1probe?sslmode=disable'
$env:TEST_DATABASE_URL_WRITER = 'postgres://app_user_writer:app_user_writer@127.0.0.1:55433/n1probe?sslmode=disable'
node run-embedded-pg.js
```

`run-embedded-pg.js` does: init cluster → start server on 55433 → bootstrap
roles + db → apply 33 of 36 migrations (skipping 3 out-of-N1-scope ones, same
rationale as the prior self-test) → grant runtime → spawn probe.mjs.

## Re-run outcome

```
probe exit 0
{"kind":"summary","total":26,"passed":26,"failed":0,"abnormal_exit":false,"abnormal_reason":null,...}
```

**26/26 PASS**, exit 0, `abnormal_exit: false` (success-path cleanup ran,
seeded `n1lp-%` / `n1c%` / `n1sub-%` rows were deleted).

Full NDJSON: see `stage3-self-test/embedded-pg18-ndjson-rerun-after-audit-fix.txt`
(next to this file). Boot fingerprint differs from prior run (random per
session); all 26 test rows are byte-identical (deterministic probe).

## Diff vs prior self-test NDJSON (embedded-pg18-ndjson.txt)

Only **2 lines differ** out of 27 NDJSON lines. Both are the `boot` rows
(timestamp + fingerprint hash); none of the 26 test rows changed.

```
=> {"kind":"boot","ts":"2026-09-12T11:43:13.098Z","admin_fp":"fp:1f38382ddbcc","writer_fp":"fp:f186ce5fb5a2","admin_host_tail":"0.0.1","writer_host_tail":"0.0.1","note":"URL-side fingerprint check passed; DB-side identity check follows after connect"}
=> {"kind":"boot","test":"db-identity-same-branch","pass":true,"admin_db":"n1probe","admin_ip":"127.0.0.1","admin_role":"neondb_owner","writer_db":"n1probe","writer_ip":"127.0.0.1","writer_role":"app_user_writer","comment":"DB-side proof that both URLs reach the same Neon branch compute"}
```

(`Compare-Object` summary: 27 input lines on each side; 25 common; 2 unique
to the new file — the boot rows above. All 25 common lines are byte-identical.)

## What this proves

The audit fixes did not regress the probe: same 26/26 PASS, same SQLSTATEs,
same row counts, same RLS outcomes. The new `db-identity-same-branch` row
demonstrates the DB-side check works correctly on the embedded PG (admin +
writer land on the same compute).

## What this does NOT prove

- This is still a SELF-TEST, not Stage 3 PASS. Stage 3 PASS is gated on
  running the same probe against `hrp_mp2_test` (real Neon), which requires
  Owner/OP to inject `TEST_DATABASE_URL_ADMIN` + `TEST_DATABASE_URL_WRITER`
  via the secure channel.
- The cleanup contract caveat from commit 551f303 still applies: cleanup is
  best-effort on the success path only. We have not exhaustively tested every
  abnormal-exit path; this re-run hit the success path (hence
  `abnormal_exit: false`).
- We have NOT opened Stage 3 on `hrp_mp2_test`. We have NOT run any
  production migration. We have NOT opened AV6. Tier 1 still holds.

## Operator next steps (unchanged)

1. Owner/OP sets the two URLs in the secure channel.
2. Operator runs the gate procedure in `stage3-hrp-mp2-test-runbook.md`
   (5 steps; STEP 5a exit-code + summary-line gate is now mandatory).
3. On 26/26 PASS + Tier 0 sign-off, Tier 0 authorises Stage 4 (prod migration
   deploy on `hrp-live`). That deploy is a DIFFERENT task with DIFFERENT role.
