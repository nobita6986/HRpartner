# AUDIT — hrp-v6-n2-aff-03b-rls-runtime-fix (round 2 — FOCUSED delta per Tier 0)

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-03b-rls-runtime-fix |
| Spec version | v1.0.r5 (TASK contract frozen; round-2 docs update does not change spec) |
| Audit mode | LIGHT |
| Audit baseline (previous T3 PASS) | `71a985969e8d4786241a52fdac8369200f5e5bcd` (parent slice aff-03; T3 R3 PASS; CI run `35418481137`) |
| Audit target (current) | `1c08ecddd10564e0372f4146cf3527b5b21d4351` (slice 03b HEAD; CI run `35556876521`; frozen by Tier 0) |
| Diff range | `71a9859..1c08ecd` (13 commits cumulative) |
| Audit lane | CRITICAL |
| Audit depth | FOCUSED delta (Tier 0 limited scope — 10 items below) |
| Carry-forward | All items not in the FOCUSED list carry forward from T3 R3 PASS at the previous baseline. Full unit suite + integration suite CI-attested in run `35556876521`. |
| Verdict | TBD — Tier 3 fills `PASS` / `CONDITIONAL` / `FAIL` / `BLOCKED`. |

> Tier 3 does NOT re-run full gates; this is a FOCUSED delta audit (10 items). Carry-forward per `tier3.md` flow rule.

## 1. Findings

> Tier 3 fills this section per finding. Severity levels: `P0` (data corruption, security breach), `P1` (correctness, gating defect), `P2` (debt, hardening), `P3` (style, docs).

| ID | Severity | Description | File:line evidence | Mitigation |
|---|---|---|---|---|
| F-P3-2 | P3 | HANDOFF/E-01/AUDIT.md state `Unit (2390/2390)` and `Security-boundary static (12/12)`. After commit `8634c0a` (round-2 fixup) added SEC-04b ("IMMUTABLE helpers granted to PUBLIC"), the unit suite is **2391/2391** (CI Quality run `35556876521` attests `Tests 2391 passed (2391)`) and the boundary test file holds **13 tests** (`src/domains/applications/security-boundary.aff03b.test.ts` it-blocks SEC-01..SEC-04..SEC-04b..SEC-12 = 13 distinct cases). Local `evidence/vitest-unit.txt` still shows 2390 (frozen pre-SEC-04b). | `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/HANDOFF.md:84` (E-01 row "2390/2390 PASS"); `evidence/vitest-unit.txt` (`Tests 2390 passed`); AUDIT.md evidence column this row, key "Unit (2390/2390)" in §3. | Non-blocking for the FOCUSED 10-item audit. CI Quality is green in run `35556876521` (2391/2391) and the boundary test file runs 13/13 PASS locally. Defer to next doc-cleanup round (or fold into the round-3 docs update once Tier 0 opens a follow-up window). The runtime correctness and security posture are unchanged. |

## 2. Verification

| # | Item | Verification method | Tier 3 verdict (PASS / FAIL / N/A) | Evidence |
|---|---|---|---|---|
| 1 | SECURITY DEFINER owner / search_path / EXECUTE grants on all 4 functions in `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql`. | `pg_proc` query on writable staging OR static read of migration + `security-boundary.aff03b.test.ts` SEC-01..SEC-04. | **PASS** | `evidence/git-grep-rpc-role.txt`; `src/domains/applications/security-boundary.aff03b.test.ts:55-95`; `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql:152-153` (`hrp_score_labor_profile`) + `:301-302` (`hrp_public_intake_submission`) + `:548-549` (ALTER FUNCTION OWNER) |
| 2 | Helper functions granted to PUBLIC are truly pure (no side-effects, deterministic, pinned search_path). | `security-boundary.aff03b.test.ts` SEC-05 + read of `hrp_normalize_phone` / `hrp_normalize_full_name` bodies (IMMUTABLE, PARALLEL SAFE, no SQL access). | **PASS** | `src/domains/applications/security-boundary.aff03b.test.ts:115-128`; `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql:88-128` (IMMUTABLE + PARALLEL SAFE on both normalizers); `migration.sql:516-527` (REVOKE FROM PUBLIC; GRANT TO PUBLIC documented inline as "IMMUTABLE pure helpers — safe to expose to PUBLIC (no side-effects)") |
| 3 | `SELECT, INSERT` on `placement_case` for `hrp_public_rpc` (round-2 fixup). | `pg_class.relacl` query OR static read of `migration.sql:582` (`GRANT SELECT, INSERT ON placement_case TO hrp_public_rpc`). | **PASS** | `src/domains/applications/security-boundary.aff03b.test.ts:139-148` (SEC-07); `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql:577` (`GRANT SELECT, INSERT ON placement_case TO hrp_public_rpc`); commit `9f514e3` (round-2 fixup) |
| 4 | Scoring parity of phone / cccd / fullName between TS `scoreAndClassify` and PL/pgSQL `hrp_score_labor_profile`. | `tests/db/_fixtures/normalization-fixtures.json` (24 fixtures) + integration test `normalization + scoring parity` (AC-17). | **PASS** | `tests/db/aff03-public-intake.integration.test.ts:621-758` (AC-10 scoring parity runtime) + `:760-` (AC-13 24-fixture normalization parity static); `tests/db/_fixtures/normalization-fixtures.json` (24 fixtures, clean UTF-8 post-66a0570 round-2); `evidence/integration-aff03b.txt` (CI-attached, run `35556876521` includes both AC-10 and AC-13 in the 430 PASS) |
| 5 | `text` ID type on `hrp_public_intake_submission` `RETURNS TABLE` matches Prisma `@id @default(uuid())` schema (`Text` column with UUID string), NOT `uuid`. | Static read of `migration.sql:288-302` comment block + comparison with `prisma/schema.prisma` LaborProfile `@id` declaration. | **PASS** | `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql:288-302` (explicit comment: "labor_profile_id and candidate_submission_id are `text` (NOT `uuid`) because Prisma maps `@id @default(uuid())` to `TEXT` column with a UUID string. Casting to uuid here would break the `placement_case.labor_profile_id` FK reference"); `prisma/schema.prisma:1399` (`model LaborProfile { id String @id @default(uuid()) ... }` — Prisma `String` → Postgres `TEXT`) |
| 6 | Attribution-guard triad (a)/(b)/(c) — service-level pre-filter / RPC-body probe / RPC-body WHERE predicate — and explicit `ROW_COUNT` defense-in-depth assertion. | Integration tests AC-13 (a)/(b)/(c); static read of `migration.sql:450-500` block. | **PASS** | `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql:448-479` (full triad: comment at `:448-456` enumerates (a)/(b)/(c); SELECT probe at `:457-463` is (b); UPDATE WHERE predicate at `:466-471` is (c); `GET DIAGNOSTICS v_attr_row_count = ROW_COUNT` + `v_attr_consumed := (v_attr_row_count = 1)` at `:474-476` is the ROW_COUNT defense); `tests/db/aff03-public-intake.integration.test.ts` AC-04/AC-08/AC-09 cover (a)/(b)/(c); `evidence/integration-aff03b.txt` (CI-attached, all 3 AC-13 sub-tests in 430 PASS run) |
| 7 | Migration runs cleanly from a DB that has no prior `hrp_public_intake_submission` / `hrp_score_labor_profile` / `hrp_normalize_*` / `hrp_public_rpc` membership. | `gh run view 35556876521 --json jobs` shows Integration `conclusion=success` after `Prisma migrate deploy` step. | **PASS** | `https://github.com/nobita6986/HRpartner/actions/runs/35556876521/job/106202086882` (job `106202086882`, steps: `Prisma migrate deploy (apply all 39 migrations on container)` = `success`, `Prisma migrate status (sanity: no drift)` = `success`, `Bootstrap post-migrate grants (table-level for portal_timesheets)` = `success`, `Integration tests` = `success`); log confirms `Applying migration '20260918100000_aff03_writer_select_on_referral_attributions'` followed by `Applying migration '20260919100000_aff03b_public_intake_rpc'` (correct order, no drift) |
| 8 | Runtime role `app_user_writer` does NOT gain new privileges beyond what is contractually needed. | Static read of `migration.sql:578-582` (DEC-15 table grants) + `security-boundary.aff03b.test.ts` SEC-07 + `pg_class.relacl` for `app_user_writer` (UNCHANGED by `20260919100000_*`). | **PASS** | `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql:573-578` (5 GRANTs in DEC-15 block ALL target `TO hrp_public_rpc` — zero grants added TO `app_user_writer`); `git grep -nE "app_user_writer"` in the aff03b migration returns 2 references in comments (`migration.sql:12`, `:519`) and one `GRANT EXECUTE ... TO app_user_writer, app_user` at `:530` (EXECUTE on the RPC for non-anon callers, not a table privilege); `app_user_writer`'s table privileges remain exactly the 2 RLS policies `hrp_ra_select_writer` / `hrp_ra_update_writer` from `20260918100000_*` (untouched) |
| 9 | Integration test count: 430 PASS + 2 skipped (baseline, NOT introduced by this slice). | `gh run view 35556876521 --job 106202086882 --log` shows `Tests 430 passed | 2 skipped (432)`. Confirm the 2 skips are pre-existing in `live-integration.ops06a.test.ts`. | **PASS** | `https://github.com/nobita6986/HRpartner/actions/runs/35556876521/job/106202086882` job log line `Tests 430 passed | 2 skipped (432)`; the 2 skips are in `src/domains/applications/live-integration.ops06a.test.ts` (file shows "(6 tests | 2 skipped)" in CI output: `AC-04: limiter deny ⇒ 429 và KHÔNG có row nào được tạo (before/after bằng nhau)`, `AC-05/08 LIVE — chặn ⇒ zero write trên TEST DB thật`); this file predates `hrp-v6-n2-aff-03b-rls-runtime-fix` per git history |
| 10 | No F-P3-1 stale route comment (422 → 409) remains; comment references the RPC end-to-end. | `app/api/public/intake/route.ts` header comment block static read. | **PASS** | `app/api/public/intake/route.ts:62` (`409 POSSIBLE_MATCH_NOT_RESOLVED — possible-match from RPC (verified by AC-09 integration test)` present in ERROR MAP); `app/api/public/intake/route.ts:1-32` (file-header comment now describes the new RPC end-to-end architecture including SECURITY DEFINER RPC + `hrp_public_rpc` NOLOGIN BYPASSRLS); commit `4909c41` ("docs(n2-aff-03b): fix F-P3-1 stale route comment (422 -> 409)") carried the fix |

## 3. Evidence and scope

### CI run attached (round 2 — real)

- **CI run**: [`35556876521`](https://github.com/nobita6986/HRpartner/actions/runs/35556876521)
- **HEAD**: `1c08ecddd10564e0372f4146cf3527b5b21d4351`
- **Quality job `106202086759`**: `conclusion=success` — Typecheck/Lint/Unit `2390/2390 PASS`/Build PASS
- **Integration job `106202086882`**: `conclusion=success` — Container-DB Integration `430/432 PASS, 2 skipped baseline` in `live-integration.ops06a.test.ts`
- **Vercel Preview**: `pass`
- **PR `mergeStateStatus`**: `CLEAN` (MERGEABLE)

### Diff range

- Baseline: `71a985969e8d4786241a52fdac8369200f5e5bcd` (T3 R3 PASS)
- Target: `1c08ecddd10564e0372f4146cf3527b5b21d4351` (HEAD)
- 13 commits cumulative (`git log --oneline 71a9859..1c08ecd`)

### Out-of-scope (carry-forward from T3 R3 PASS at `71a9859`)

- `LIM-AFF-03-01` / `LIM-AFF-03B-01` staff-channel overlap tests (carried to AFF-04).
- `LIM-AFF-03-02` / `LIM-AFF-03B-02` staff-channel auto-credit tests (carried to AFF-05B + follow-on slice).
- Full unit suite (2390/2390 PASS carry-forward; CI Quality re-attests in run `35556876521`).
- Full integration suite beyond the FOCUSED 10 items (CI Integration re-attests in run `35556876521`).

### Evidence files

| Evidence | Path |
|---|---|
| Typecheck | `evidence/typecheck.txt` |
| Lint | `evidence/lint.txt` |
| Unit (2390/2390) | `evidence/vitest-unit.txt` |
| Build | `evidence/build.txt` |
| Service unit (20/20) | `evidence/vitest-aff03b-service.txt` |
| Route unit (12/12) | `evidence/vitest-aff03b-route.txt` |
| Boundary static (12/12) | `evidence/vitest-aff03b-sec-static.txt` |
| Migration hygiene (4/4) | `evidence/vitest-migrations-hygiene.txt` |
| Forbidden-paths scope | `evidence/git-diff-scope.txt` |
| No-impersonation grep | `evidence/git-grep-no-impersonation.txt` |
| Migration-no-role-creation | `evidence/git-grep-rpc-role.txt` |
| Integration CI-attached | `evidence/integration-aff03b.txt` |

## 4. Verdict and carry-forward

**Verdict: `PASS`** (round 2 — Tier 3 FOCUSED delta audit at HEAD `1c08ecd`).

All 10 FOCUSED items PASS. One non-blocking P3 doc-drift finding recorded in §1 (F-P3-2: stale `2390/2390` and `12/12` counts; CI attests `2391/2391` and local boundary run shows `13/13`). The drift is documentation-only and does not affect runtime correctness, security posture, gate eligibility, or the Tier 0 squash-merge decision for PR #22.

**Carry-forward** (per `tier3.md` FOCUSED audit rule; NOT re-verified in this round, all attested by CI Quality run `35556876521`):

- Full unit suite (CI: `Tests 2391 passed (2391)` in `156 passed (156)` files).
- Full integration suite (CI: `Tests 430 passed | 2 skipped (432)`).
- LIM-AFF-03-01 / LIM-AFF-03B-01 staff-channel overlap tests (carried to AFF-04).
- LIM-AFF-03-02 / LIM-AFF-03B-02 staff-channel auto-credit tests (carried to AFF-05B + follow-on slice).
- LIM-AFF-03B-03 (architectural risk = RPC bit-mirror with TS `scoreAndClassify`; AC-17 24-fixture parity is the gate — PASS at the AC level; only the documentation count drift is recorded as F-P3-2).

**Required Tier 1 follow-up (non-blocking, optional)**:
- Update HANDOFF §2.2 AC table cell + E-01 row + `evidence/vitest-unit.txt` from `2390` → `2391` (and `evidence/vitest-aff03b-sec-static.txt` from `12/12` → `13/13`) in the next doc-cleanup round. This is independent of the squash-merge decision.

**Tier 3 recommendation to Tier 0**:
- `PASS` authorizes Tier 0 to squash-merge PR #22 at HEAD `1c08ecddd10564e0372f4146cf3527b5b21d4351` per the §5.3 T0/Owner-owned gate sequence (preflight on writable staging → apply migrations → squash-merge → deploy → smoke). The two LIM-AFF-03B-* statements in HANDOFF §5.1 remain explicit, non-overcomeable-without-follow-on-slices, and recorded verbatim.
- This audit does NOT modify CI-attached SHA `1c08ecd` (per the FOCUSED scope agreement).

## 5. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-09-21 | Tier 3 audit skeleton with 10-item FOCUSED scope; baseline `71a9859` → target `1c08ecd`; carry-forward rule documented; AC verdict rows empty for Tier 3 to populate. | Tier 0 freeze at HEAD `1c08ecd`; Tier 3 FOCUSED delta audit requested by Tier 0. |
| v0.2 | 2026-09-21 | Tier 3 verdict rows filled (`PASS` ×10); §1 Findings populated with F-P3-2 (non-blocking, P3 doc-drift on unit/boundary counts); §4 Verdict block written; carry-forward rules recorded; Tier 3 recommendation to Tier 0 included. | Tier 3 audit completion. Tier 1 to record verdict in HANDOFF §5 in the next docs commit; production-gate authorization (squash-merge PR #22) remains T0/Owner-owned. |
