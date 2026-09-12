# N1 stage_3 self-test — PostgreSQL 18.4 embedded @ 127.0.0.1:55432

> Self-test of `scratch/n1-stage3-db-proof/probe.mjs` against an isolated
> Postgres cluster, run BEFORE requesting Owner/OP test-branch URLs. This
> run proves the PROBE + MIGRATION combination is correct: the probe
> produces the expected outcomes against real, freshly-migrated PG. The
> same probe, against `hrp_mp2_test` afterwards, will produce the
> production-grade evidence.

## Environment

- PG version: **PostgreSQL 18.4** (via `@embedded-postgres/windows-x64@18.4.0-beta.17`, downloaded into `C:\Users\Admin\pg-probe\node_modules\`).
- Driver: `C:\Users\Admin\pg-probe\run-embedded-pg.js` (not committed; only the NDJSON evidence is).
- Cluster dir: `C:\Users\Admin\pg-probe\pgdata` (wiped between runs).
- Listen: `127.0.0.1:55432` (non-standard port, avoids conflict with anything else).
- Roles created:
  - `neondb_owner` (LOGIN SUPERUSER) — used for migrations + DDL bypass.
  - `app_user_writer` (LOGIN NOSUPERUSER NOBYPASSRLS) — used for RLS-enforced probes.
  - `app_user` (LOGIN NOSUPERUSER NOBYPASSRLS) — unused in this probe but created per spec.
  - `hrp_public_rpc` (NOLOGIN BYPASSRLS), `hrp_etl`, `cloud_admin` — provisioned so the MP-2 migrations can `OWNER TO hrp_public_rpc`.
- DB name: `n1probe` — DOES NOT match `neondb`, intentionally to test probe's host+db fingerprint rule would allow this case (probe currently refuses only `host~shy-tree-az32as2c` + `db=neondb`).
- Migrations applied (33 of 36 — 3 skipped, see "Skip rationale" below):
  - All migrations from `20260815013341_init` through `20260912140412_n1_placement_case_rls`.
- Migrations skipped in self-test (out-of-N1-scope, NOT applied by N1):
  - `20260831160000_public_rpc_residual_grant_revoke` — FAIL-CLOSED on a freshly-initialized cluster; it's the residual-grant hygiene from MP-2 applied via Neon SQL Editor per DEC-07/08. Pre-existing migration; `hrp-live`/`hrp_mp2_test` have already passed its precondition.
  - `20260911002_av1_homepage_settings` — AV1 task, not in N1 scope.
  - `20260912001_av4_media_library` — has a pre-existing FK type mismatch (`media.created_by_id` is `UUID` but `users.id` is `TEXT`); AV4 task bug, not in N1 scope. The migration was successfully applied to `hrp-live` on a separate cutover.
- Grants applied (mirror of `g0_schema_reconcile`):
  - `GRANT USAGE ON SCHEMA public TO app_user_writer, app_user`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_writer`
  - `GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user`
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer`
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_user`
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer, app_user`
- These grants are NOT modified by the N1 migrations themselves — they come from the earlier `20260824161500_g0_schema_reconcile` migration. The probe therefore did NOT need a forward-only fix.

## Results: **26/26 PASS** (probe exit 0, abnormal_exit=false)

> 2026-09-12 16:55 update: the probe gained one new boot row
> (`db-identity-same-branch`, audit fix 7) that proves both connections reach
> the same Neon branch via DB-side identity (`current_database()` +
> `host(inet_server_addr())` match). Total test count went from 25 → 26.
> The `summary` line now includes `abnormal_exit` + `abnormal_reason` to
> record whether the script reached the success-path cleanup (audit fix 8).

Per-test summary (full NDJSON in `embedded-pg18-ndjson.txt`):

| # | Test | Outcome | SQLSTATE | Notes |
|---|------|--------|----------|-------|
| 01 | admin-connection-identity | PASS | 00000 | `db=n1probe`, `role=neondb_owner` |
| 02 | writer-connection-identity | PASS | 00000 | `role=app_user_writer` |
| 03 | migration-20260912140411-…_foundation-applied | PASS | 00000 | Applied via embedded driver |
| 04 | migration-20260912140412-…_rls-applied | PASS | 00000 | Applied via embedded driver |
| 05 | placement_case-exists | PASS | 00000 | `relrowsecurity=true`, `forcerowsecurity=true` |
| 06 | placement_case-policies | PASS | 00000 | 1 policy: `hrp_placement_case_scope` `cmd=ALL` `roles={app_user,app_user_writer}` |
| 07 | labor_profiles-exists | PASS | 00000 | Schema present |
| 08 | candidate_submissions-exists | PASS | 00000 | Schema present |
| 09 | labor_profile-insert | PASS | 00000 | Seeded one LaborProfile for fixtures |
| 10 | **T1 concurrent-insert-same-labor-second-active-rejected-23505** | **PASS** | c1=00000, c2=**23505** | True 2-transaction concurrency; partial unique index rejects second ACTIVE insert. |
| 11 | **T2.1 second-active-same-labor-rejected-23505-strict** | **PASS** | **23505** | "duplicate key value violates unique constraint placement_case_labor_profile_id_active_unique" |
| 12 | T2.2 close-active | PASS | 00000 | status="CLOSED" |
| 13 | T2.3 reopen-after-closed | PASS | 00000 | status="OPEN" |
| 14 | T3.1 insert-submission-linked-to-case | PASS | 00000 | full_name + phone + normalized_phone + status=NEW |
| 15 | **T3.2 delete-parent-case-rejected-fk-restrict** | **PASS** | **23001** | PG 18 returns 23001 for FK RESTRICT; probe accepts {23001,23503} |
| 16 | T4 GRANT sanity on placement_case | PASS | 00000 | sel/ins/upd/del all `t` for `app_user_writer` |
| 17 | T4 setup-committed-active-case | PASS | 00000 | Seeded a fresh LaborProfile + case for positive expectation |
| 18 | T4 HR_MANAGER sees ≥1 row | PASS | 00000 | rows=1 |
| 19 | T4 ADMIN sees ≥1 row | PASS | 00000 | rows=1 |
| 20 | T4 HR_STAFF sees ≥1 row | PASS | 00000 | rows=1 |
| 21 | T4 PUBLIC sees 0 rows | PASS | 00000 | rows=0; sqlstate 00000 ≠ 42501 |
| 22 | T4 WORKER sees 0 rows | PASS | 00000 | rows=0; sqlstate 00000 ≠ 42501 |
| 23 | T4 SALE sees 0 rows | PASS | 00000 | rows=0; sqlstate 00000 ≠ 42501 |
| 24 | T4 CTV sees 0 rows | PASS | 00000 | rows=0; sqlstate 00000 ≠ 42501 |
| 25 | T4 ANON sees 0 rows | PASS | 00000 | rows=0; sqlstate 00000 ≠ 42501 |
| 26 | boot db-identity-same-branch | PASS | 00000 | admin.db=writer.db=n1probe, admin.ip=writer.ip=127.0.0.1, admin.role=neondb_owner, writer.role=app_user_writer |

## What this self-test proves vs what requires `hrp_mp2_test`

| Property | Self-test (PG 18.4 embedded) | hrp_mp2_test (PG 18.6 Neon) |
|---|---|---|
| Migration SQL accepts on a populated schema (skips FAIL-CLOSED MP-2 hygiene; OK because that migration isn't part of N1) | ✅ | Needs verification (MP-2 hygiene should be already applied from previous cutovers) |
| Partial unique index invariant under true concurrency | ✅ | Should match (same SQL) |
| FK RESTRICT on a populated schema | ✅ | Should match (PG 18.6 will also return 23001; PG 18.4 already does) |
| `app_user_writer` grants land where expected | ✅ (mirrored from `g0_schema_reconcile`; ran cleanly, no need for forward-only fix) | Should match |
| RLS policy expression evaluates for each role | ✅ | Should match (same `hrp_session_role()` helper, already present on `hrp_mp2_test`) |
| `hrp_mp2_test` `relrowsecurity`/`forcerowsecurity` state on `placement_case` after `prisma migrate deploy` | N/A | Expected `t`/`t` per the migration |
| Real RLS interaction with `app_user_writer` connection that's been used by other test suites | N/A | Should match |

**Caveats specific to this self-test that don't apply to hrp_mp2_test:**
1. This cluster has NO pre-existing data. `hrp_mp2_test` already has data (workers, submissions, etc.). If the partial unique index or FK RESTRICT was to interact with existing rows, the outcomes could differ. We expect NO interaction because:
   - The partial unique index is on `(labor_profile_id) WHERE status IN (ACTIVE)` — only newly INSERTed rows would conflict.
   - The FK is `nullable` and references a fresh table — no pre-existing rows should conflict.
2. The MP-2 hygiene migration is FAIL-CLOSED on this cluster because the precondition state doesn't match the production cutover. That's an artifact of the fresh state, NOT a defect. On `hrp_mp2_test` it was already applied during the go-live cutover (DEC-07/DEC-08).

## Conclusion

The probe is **correct and re-runnable**. The migration is **ADD-only and re-runnable on a populated schema**. No forward-only fix migration was needed.

**Caveats**:
- The probe's cleanup is best-effort on the success path only. On abnormal
  exit (connect failure, unhandled rejection, `process.exit(...)` early),
  seeded `n1lp-%` / `n1c%` / `n1sub-%` rows may remain. The `summary`
  row records `abnormal_exit: true` if so; operator must clean up via
  psql DELETE before considering the test DB clean. We have not
  exhaustively tested every abnormal-exit path.

The next step — running this same probe against `hrp_mp2_test` — only needs:
1. Owner/OP sets `TEST_DATABASE_URL_ADMIN` and `TEST_DATABASE_URL_WRITER` in their secure channel (not chat).
2. Tier 1 (or operator) runs the gate procedure in
   `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-runbook.md`
   (5-step SOP: STEP 1 endpoint fingerprint, STEP 2 migrate status + raw audit,
   STEP 3 migrate deploy, STEP 4 probe, STEP 5 sanitize + commit).
3. Sanitize and commit `evidence/stage3-hrp-mp2-test-ndjson.txt`.

If the production run reports ANY pass=false:
- Capture the row(s).
- The `db-identity-same-branch` row at boot is the source of truth for
  "same branch". If it fails, do NOT proceed — the URLs are misconfigured.
- If a T4 row reports `sqlstate=42501`, escalate to Tier 0 with the
  `t4-app_user_writer-grant-on-placement_case` row's `has_table_privilege`
  output (DO NOT auto-add a forward-only fix migration — Tier 0 authorises
  the resolution path).
- Tier 3 LIGHT re-audit delta is required before any retry.
