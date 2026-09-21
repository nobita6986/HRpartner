# STAGING VERIFICATION SUMMARY — hrp-v6-n2-aff-03b-rls-runtime-fix (round 3)

> Tier 0 directive accepted: option (a) — writable-staging credential from `C:\cre_hrp.txt`. This file is the PASS report from the staging preflight + smoke phase.

## 0. Resolved STOP from earlier round

Earlier STOP at `staging-preflight-STOP-2026-09-21.md` (worktree `.env` pointed to prod `ep-shy-tree-az32as2c`) is **RESOLVED** by Tier 0 issuing option-(a) credential. The earlier evidence file is retained as historical record per Tier 0 directive.

## 1. Identity & gate

- **Branch**: `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix`
- **HEAD SHA**: `1c08ecddd10564e0372f4146cf3527b5b21d4351` (frozen by Tier 0)
- **CI run (round-2)**: `35556876521` (PR #22 CLEAN/MERGEABLE) — Tier 3 FOCUSED delta audit `PASS` at `AUDIT.md` v0.2.

## 2. Tier 0 rules followed

1. ✅ Không chép đè `.env` (verified by SHA256 hash pre/post every operation: `D228B1B1...3DAAB3A`).
2. ✅ Không sửa `.env` đang trỏ production (`.env` content untouched; isolated via temporary rename to `.env.disabled-preflight` during Prisma/Dev operations, then restored).
3. ✅ Credential loaded into process env (single PowerShell process per operation) — never persisted to disk.
4. ✅ Không in URL, password hoặc API key (verifier scripts mask passwords with `***MASKED***`).
5. ✅ Neon expected branch = `hrp_mp2_test`.
6. ✅ Branch gate PASS before every DB command.
7. ✅ Gate proved:
   - admin ep `empty-forest-azlhfyo9` + writer ep `empty-forest-azlhfyo9` → both on branch `hrp_mp2_test` (id `br-misty-cell-az3nx5l3`).
   - Branch is NOT primary (primary is `hrp-live` id `br-icy-dew-azbrgthw`).
   - Branch name matches `hrp_mp2_test`.
   - Endpoint `ep-shy-tree-az32as2c` (prod) is NOT in scope.
8. ✅ Gate exit 0 before each DB step.

## 3. Preflight chain (sequential, all PASS)

| Step | Tool | Result | Evidence file |
|---|---|---|---|
| 1 | `branch-gate-verdict.json` (Neon control-plane) | `gate=PASS`, `same_branch=true`, `branch_is_primary=false`, `branch_name_matches=true` | `branch-gate-verdict-full.json` |
| 2 | Read-only fingerprint (psql admin) | 41 `_prisma_migrations`, 2 AFF-03 policies, `hrp_public_rpc` exists, 0 AFF-03B fns (expected) | `fingerprint.txt` |
| 3 | `prisma migrate status` (admin URL) | 42 migrations found, 1 pending = `20260919100000_aff03b_public_intake_rpc`, NO drift/NO failures | `migrate-status-pre.txt` |
| 4 | `prisma migrate deploy` (admin URL) | Applied exactly 1 migration: `20260919100000_aff03b_public_intake_rpc`. `All migrations have been successfully applied.` | `migrate-deploy.txt` |
| 5 | Post-deploy fingerprint | 42 `_prisma_migrations`, 4 AFF-03B fns (incl. SECURITY DEFINER RPC), 2 AFF-03 policies, 24 hrp_* fns in public | `fingerprint-post.txt` |
| 6 | `prisma migrate status` post-deploy | `Database schema is up to date!` | `migrate-status-post.txt` |

## 4. AFF-03B integration tests (writer URL, runtime role)

- Command: `npx vitest run tests/db/aff03-public-intake.integration.test.ts --config vitest.integration.config.ts --reporter=basic`
- Result: **15 / 15 PASS** (24.41s wall clock)
- Coverage: AC-01..AC-13 runtime role (13 cases) + masked HR_MANAGER regression (2 cases) — full AC matrix.
- Evidence: `integration-aff03b-staging.txt`

### Test detail (full breakdown)

```
✓ AFF-03B public anon intake — RUNTIME ROLE (production mirror)
   ✓ AC-01: valid cookie → CONSUMED, LPHA (source=AFF_INITIAL)
   ✓ AC-02: forged cookie → 201 no mutation, no LPHA, CS created (non-attributed)
   ✓ AC-03: no cookie → non-attributed LP created, no LPHA
   ✓ AC-04: row expiresAt <= now() → status UNCHANGED, no LPHA
   ✓ AC-05: row status=CONSUMED → consumedAt NOT overwritten, no second LPHA
   ✓ AC-06: TOKEN_SIGNING_ERROR → 201 no mutation, no log distinguishes
   ✓ AC-07: guard (a) service-level pre-filter rejects non-ACTIVE → no UPDATE
   ✓ AC-08: guard (b) RPC-body probe rejects row bound to a DIFFERENT LP
   ✓ AC-09: guard (c) RPC-body WHERE predicate — second consume blocked
   ✓ AC-10: scoring parity — phone+name+cccd → EXACT_MATCH, no duplicate row
   ✓ AC-11: phone-only applicant → NEW_PROFILE (not POSSIBLE_MATCH)
   ✓ AC-12: returning applicant (phone+name match) → EXACT_MATCH, NO duplicate LP
   ✓ AC-13: 24-fixture normalization parity corpus — TS and PL/pgSQL must agree
✓ AFF-03B writer policies — MASKED HR_MANAGER regression
   ✓ hrp_ra_select_writer permits the masked writer role to SELECT an ACTIVE row
   ✓ hrp_ra_update_writer permits the masked writer role to UPDATE ACTIVE→CONSUMED with LP bound
```

## 5. Smoke public intake (HTTP, runtime role)

Local Next.js dev server bound to staging DB (`.env` temporarily renamed aside, then restored):

| Test | Cookie | Result |
|---|---|---|
| Smoke 1 | (none) | **201** `verdict=NEW_PROFILE` (LP `987b2d5d...`, PC `e15b5519...`, CS `8e66c2e1...`) |
| Smoke 2 | FORGED JWT (invalid signature) | **201** `verdict=NEW_PROFILE` (LP `90ab4a12...`, PC `3597d53c...`, CS `bd78f345...`) — TOKEN_SIGNING_ERROR caught as silent fail-safe; non-attributed |

## 6. DB verification post-smoke (psql admin)

| Check | Result |
|---|---|
| Smoke 1 LP in staging DB | ✅ `987b2d5d-f746-4d7c-84b2-415abdd7d21b` (phone `0935000001`, name `Smoke Test No Cookie`, PC status `OPEN`, CS created, **LPHA=0**, **RA=0**) |
| Smoke 2 LP in staging DB | ✅ `90ab4a12-8d8e-4dca-8720-80e7460445cd` (phone `0935000002`, name `Smoke Test Forged Cookie`, PC status `OPEN`, CS created, **LPHA=0**, **RA=0**) |
| RA summary | ACTIVE=38, CONSUMED=15, EXPIRED=12, anomalous=0 (no invalid status) |
| LPHA summary | AFF_INITIAL=1 (only the AC-01 integration test's LPHA — smoke did not create new LPHA, as expected) |
| Orphan CONSUMED (no LP) | 12 (pre-existing, not this slice; `oldest=2026-09-17`, before this slice) |
| Final counts | 105 LP / 56 PC / 5 CS / 1 LPHA / 65 RA — internally consistent |
| `42501` / `42883` / out-of-contract mutations | **NONE observed** |

## 7. Production safety

- `.env` content SHA256 hash pre/post entire staging operation: `D228B1B1BB5F6EC2CD3A0A0691DD99C7780471F8D769649FC50BB9E513DAAB3A` (UNCHANGED).
- Production DB `ep-shy-tree-az32as2c` was NEVER targeted by any operation in this round.
- No merge, no deploy, no remote write.

## 8. Tier 0 verifications to run

After T1B commit + push:
1. Squash-merge PR #22 (Tier 0 owned).
2. Verify main CI (Tier 0 owned).
3. Production migration gate (Tier 0 owned, separate from this preflight).
4. Deploy (Tier 0 owned).
5. Smoke production (Tier 0 owned).
6. Close AFF-03B (Tier 0 owned).

T1B does NOT self-merge, self-deploy, or self-smoke production. T1B also does NOT modify source/test/migration in this docs-only commit.
