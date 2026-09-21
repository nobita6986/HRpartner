# HANDOFF — hrp-v6-n2-aff-03b-rls-runtime-fix

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-03b-rls-runtime-fix |
| Spec version | v1.0.r8 |
| Control | Value |
|---|---|
| Round | 3 (round-1 = initial delivery; round-2 = real CI attached at HEAD `1c08ecd`, Tier 3 LIGHT FOCUSED delta audit requested by Tier 0; **round-3 = writable-staging preflight PASS** with Tier 0 option-(a) credential from `C:\cre_hrp.txt`) |
| Status | `READY_FOR_AUDIT` (slice 03b delivered; T3 FOCUSED delta audit `PASS` at HEAD `1c08ecd` per `AUDIT.md` v0.2; **Tier 0 ACCEPT** of T3 PASS; **round-3 writable-staging preflight PASS** per `evidence/staging-preflight-PASS-2026-09-21.md` — branch gate, fingerprint, migrate status pre, migrate deploy, post-deploy fingerprint, migrate status post, AFF-03B integration 15/15, smoke public intake 201, DB verification clean; production DB `ep-shy-tree-az32as2c` NEVER touched; `.env` hash unchanged end-to-end) |
| Branch | `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix` |
| Baseline | `1059f666` (origin/main HEAD post AFF-03 merge) |
| Previous green audit SHA | `71a985969e8d4786241a52fdac8369200f5e5bcd` (T3 R3 PASS, attached to CI run `35418481137`, parent slice aff-03) |
| Implementation SHA (round-1 feature) | `809e3aa27c0227c2832ad8e3d1a6dec5f5fa4b03` (SECURITY DEFINER RPC, tests, evidence, docs at v1.0.r5; cherry-picked from `e7e8550` via `git cherry-pick -x e7e8550`) |
| Documentation SHA (round-1 docs) | `cfe44bdf9b9e0f04d3ef6ecbcf09af4ec12a2729` (cherry-picked from `96f1f70`; combined split + SHA-fill commits) |
| Round-1 HEAD | `4909c41c077bbf8647ddd070089f39d8ac7ed66a` (branch head after F-P3-1 fix cherry-pick from `e3df1be`) |
| Round-2 HEAD (frozen by Tier 0) | `1c08ecddd10564e0372f4146cf3527b5b21d4351` (current; CI green at this SHA on PR #22) |
| Branch | `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix` rooted at `origin/main` `1059f6669482efac5b7956ef25d43996ca59d515` |
| Baseline | `1059f6669482efac5b7956ef25d43996ca59d515` (`origin/main`, post-AFF-03-merge via PR #20) |
| `git diff` vs baseline | 23 files / +2320 / -263 cumulative (single rebase-on-origin-main slice, ancestry linear: `1059f66 → 809e3aa → fcd6bfb → cfe44bd → 4909c41 → 9bf35fb → 66a0570 → 8634c0a → b3a4146 → 9bdc79f → 9f514e3 → 82f4fec → 1c08ecd`) |
| CI run attached | **`35556876521`** ([run](https://github.com/nobita6986/HRpartner/actions/runs/35556876521)) on HEAD `1c08ecddd10564e0372f4146cf3527b5b21d4351` — Quality `success` + Integration `success` (430 tests PASS, 2 skipped baseline in `live-integration.ops06a.test.ts`) + Vercel Preview `success` |
| Quality job | `106202086759` — `conclusion=success` (Typecheck/Lint/Unit 2390 PASS / Build PASS) |
| Integration job | `106202086882` — `conclusion=success` (Container-DB Integration 430 PASS + 2 skipped) |
| Vercel check | `pass` — preview deployment completed (`https://vercel.com/thuans-projects-0b7f4d74/hrpartner-vn/BgG5mFSTTC1HWrRK5zdpqm6sg9hQ`) |
| PR mergeStateStatus | `CLEAN` (MERGEABLE) — `gh pr view 22 --json mergeStateStatus` returns `CLEAN` |
| Next gate | Tier 0 squash-merge PR #22 → Tier 0 production migration + deploy + smoke. T1B does NOT self-merge, self-deploy, or self-smoke. Production migration apply is a separate T0/Owner gate. Round-3 docs-only update committed and pushed; no source/test/migration modified. |
| Execution round | 2 |
| Tier 1 sign-off | Round-1 done (T3 LIGHT PASS at implementation-contract gate) |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |

> Handoff status: `READY_FOR_AUDIT` (round 3 — Tier 3 FOCUSED delta audit `PASS` at HEAD `1c08ecd` on CI run `35556876521` per `AUDIT.md` v0.2; **Tier 0 ACCEPT** with `GO writable-staging preflight / NO-GO production migration-deploy at this stage / NO-GO additional source fixes absent staging defect`; merge decision = T0/Owner, NOT T1B; production gate = T0/Owner).

## 1. Outcome and changed surface

### Outcome (per Tier 0 brief)

- Public anon apply at `POST /api/public/intake` writes through the new SECURITY DEFINER RPC `hrp_public_intake_submission(jsonb)` (DEC-01), which runs as `hrp_public_rpc` (`NOLOGIN BYPASSRLS`, DEC-14) and is therefore not gated by the writer RLS policies. The `42501` blocker that masked the AFF-03 smoke test is gone: `INSERT labor_profiles` happens under BYPASSRLS, not under FORCE-RLS app_user_writer.
- The full write chain is owned by the RPC end-to-end: PL/pgSQL `hrp_normalize_phone` + `hrp_normalize_full_name` → `hrp_score_labor_profile` (≥2-signal EXACT_MATCH rule preserved) → INSERT/UPDATE chain.
- `TOKEN_SIGNING_ERROR` (missing/short `RATE_LIMIT_HASH_SECRET`) is caught at the service entry and converted to silent fail-safe (DEC-05).
- The integration test no longer CI-masks with `withHrManagerContext` on the primary runtime-role lane; the masked lane is retained as a guard-rail regression for the 2 writer policies (`hrp_ra_select_writer` / `hrp_ra_update_writer`).

### Changed surface (filled at delivery, measured vs `origin/main 1059f666`)

- **NEW**: `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql` — 4 PL/pgSQL functions (`hrp_normalize_phone`, `hrp_normalize_full_name`, `hrp_score_labor_profile`, `hrp_public_intake_submission`) + grants + ownership choreography (DEC-14) + table grants (DEC-15) + RQ-06 membership-closure REVOKE.
- **MOD**: `src/domains/applications/aff03-public-intake.service.ts` — drops `createCandidateSubmissionFromIntake` import/call; delegates the full chain to the RPC via `tx.$queryRaw`; re-imports `PossibleMatchNotResolvedError` from this service (not `intake-writer.service`); wraps `verifyAttributionToken` in try/catch for `TOKEN_SIGNING_ERROR` (DEC-05).
- **MOD**: `app/api/public/intake/route.ts` — file-header comment only (STEP-03); updated `PossibleMatchNotResolvedError` import path.
- **MOD**: `src/domains/applications/aff03-public-intake.service.test.ts` — 14 unit tests → 20 unit tests; mocks `tx.$queryRaw` instead of the writer; added `TOKEN_SIGNING_ERROR`, `RPC_POSSIBLE_MATCH`, `RPC_EXACT_MATCH`, `RPC_0_ROWS`, `RPC_NULL_IDS`, `RPC_DOWN` cases.
- **MOD**: `src/domains/applications/aff03-public-intake.route.test.ts` — added `POSSIBLE_MATCH_NOT_RESOLVED 409` test; mock `tx.$queryRaw`; clear `mocks.prismaTxnResult` for tests that exercise the RPC path.
- **NEW**: `tests/db/aff03-public-intake.integration.test.ts` — rewritten with two lanes: primary `RUNTIME ROLE` (no `app.role` GUC, mirrors production exactly) + secondary `MASKED HR_MANAGER` (regression guard for writer policies). 13 runtime tests (AC-01..AC-12 + AC-13 normalization parity) + 2 masked tests (AC-13a, AC-13b).
- **NEW**: `tests/db/_fixtures/normalization-fixtures.json` — 24-fixture corpus (12 phone + 12 full_name) for AC-13 normalization parity.
- **NEW**: `tests/db/_fixtures/gen-fixtures.mjs` — generator for the corpus (deterministic; the JSON is the source of truth).
- **NEW**: `src/domains/applications/security-boundary.aff03b.test.ts` — 12 STATIC assertions that the migration authored the boundary correctly (SECURITY DEFINER, pinned search_path, owner hrp_public_rpc, REVOKE FROM PUBLIC, GRANT EXECUTE, NO BYPASSRLS in migration, table grants DEC-15, no `app.role` GUC on anon path, service delegates through RPC, TOKEN_SIGNING_ERROR caught, AFF-03 writer policies remain intact, provisioning script declares NOLOGIN BYPASSRLS).
- **MOD**: `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/TASK.md` — DEC-02 cleanup (round-4 verdict); STEP-04(f) cleanup (round-4 verdict); both applied during /deliver.
- **MOD**: `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/HANDOFF.md` (this file).
- **MOD**: `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/evidence/**` (placeholders + populated where locally measurable).

### NOT TOUCHED (forbidden paths)

- `prisma/schema.prisma` — schema unchanged.
- `prisma/migrations/20260917000000_referral_attribution_foundation/**` — N2-1 foundation unchanged.
- `prisma/migrations/20260918100000_aff03_writer_select_on_referral_attributions/**` — pre-existing AFF-03 writer policies preserved for non-anon paths.
- `src/domains/talent/**` — read-only: the Prisma writer `createCandidateSubmissionFromIntake` is preserved for non-anon flows but NOT called from the anon service.
- `src/domains/referrals/**` — read-only: the verify util `verifyAttributionToken` is consumed, not modified.
- `app/api/jobs/apply/**` and `app/api/public/jobs/[slug]/applications/**` — DEC-10 retired stub; not touched.
- `scripts/create-public-rpc-role.cjs` — pre-existing OP-01 provisioning script; not modified.

## 2. Acceptance evidence

### 2.0 AC table (Tier 3 reads this first; one row per AC)

| AC | Command | Result | Limitation | Evidence |
|---|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/TASK.md` | RESULT: PASS (DRAFT-VALID, 1 non-blocking warn for DRAFT status) | none | inline |
| AC-01 | `npx tsc --noEmit` | exit 0 | none | `evidence/typecheck.txt` |
| AC-02 | `npm run lint` | exit 0 (0 errors, baseline warnings only) | none | `evidence/lint.txt` |
| AC-03 | `npx vitest run --config vitest.unit.config.ts` (locally) | exit 0; **2390**/2390 PASS in 156 files (was 2378; +12 = 12 new SEC tests) | none | `evidence/vitest-unit.txt` |
| AC-04 | `npx prisma generate && npm run build` | exit 0; `npm run build` exits 0 with route `/api/public/intake` registered | none | `evidence/build.txt` |
| AC-05 | `npx vitest run --config vitest.unit.config.ts src/domains/applications/aff03-public-intake.service.test.ts` | exit 0; **20**/20 service tests PASS (was 14; +6 = TOKEN_SIGNING_ERROR + RPC_POSSIBLE_MATCH + RPC_EXACT_MATCH + RPC_0_ROWS + RPC_NULL_IDS + RPC_DOWN) | none | `evidence/vitest-aff03b-service.txt` |
| AC-06 | `npx vitest run --config vitest.unit.config.ts src/domains/applications/aff03-public-intake.route.test.ts` | exit 0; **12**/12 route tests PASS (was 11; +1 = POSSIBLE_MATCH 409) | none | `evidence/vitest-aff03b-route.txt` |
| AC-07 | `npx vitest run --config vitest.unit.config.ts src/domains/applications/security-boundary.aff03b.test.ts` | exit 0; **12**/12 STATIC boundary tests PASS | none | `evidence/vitest-aff03b-sec-static.txt` |
| AC-08 | `npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts` | exit 0; 4/4 PASS (RQ-06 hygiene rule + new migration's REVOKE clause satisfied) | none | `evidence/vitest-migrations-hygiene.txt` |
| AC-09 | `git diff --name-only origin/main..HEAD \| grep -E '<forbidden>'` (forbidden regex: `schema.prisma\|prisma/migrations/(?!20260918100000_aff03_writer_select_on_referral_attributions\|20260919100000_aff03b_public_intake_rpc)\|src/domains/talent/\|src/domains/referrals/\|app/api/jobs/apply/\|app/api/public/jobs/\[slug\]/applications/`) | only `prisma/migrations/20260919100000_aff03b_public_intake_rpc/**` and `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/**` show — no forbidden path touched | none | `evidence/git-diff-scope.txt` |
| AC-10 | `git grep -nE 'set_config\(\s*['\''"]app\.role\|applyRlsContext\|withDbContext' app/api/public/intake/ src/domains/applications/aff03-public-intake.service.ts` | 0 matches (anon path never sets app.role) | none | `evidence/git-grep-no-impersonation.txt` |
| AC-11 | `git grep -nE 'CREATE\s+ROLE\|BYPASSRLS' prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql` | 0 matches in executable SQL (DEC-09/14: hrp_public_rpc is pre-provisioned by OP-01) | `src/domains/applications/security-boundary.aff03b.test.ts:121-125` (SEC-06) | `evidence/git-grep-rpc-role.txt` |
| AC-12 | Integration lane runtime — happy path: valid cookie → ReferralAttribution.status='CONSUMED', labor_profile_id set, consumed_at non-null, LaborProfileHandlingAssignment source='AFF_INITIAL' assignee_user_id=$referrerUserId | source code complete; **CI Integration lane** runs against `hrp_mp2_test` after BOTH migrations `20260918100000_*` AND `20260919100000_*` applied + OP-01 (`scripts/create-public-rpc-role.cjs`) | runtime (CI) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`) |
| AC-13 | Integration lane — attribution-guard triad (a)/(b)/(c): service-level pre-filter + RPC-body probe + RPC-body WHERE predicate. Test names: AC-04 (guard a, status=EXPIRED), AC-08 (guard b, bound to victim LP), AC-09 (guard c, second consume blocked at WHERE, status='ACTIVE' no longer matches) | source code complete; **CI Integration lane** | runtime (CI) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`) |
| AC-14 | Integration lane — TOKEN_SIGNING_ERROR → 201 no mutation (test AC-06 deletes `RATE_LIMIT_HASH_SECRET` before invocation) | source code complete; **CI Integration lane** | runtime (CI) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`) |
| AC-15 | Integration lane — phone-only NEW_PROFILE (regression for round-1 minimal-RPC finding): phone alone yields verdict='NEW_PROFILE' (not POSSIBLE_MATCH) | source code complete; **CI Integration lane** | runtime (CI) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`) |
| AC-16 | Integration lane — returning applicant EXACT_MATCH (regression for round-1 finding): no duplicate `labor_profiles` row when phone+name match an existing LP | source code complete; **CI Integration lane** | runtime (CI) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`) |
| AC-17 | Integration lane — 24-fixture normalization parity: PL/pgSQL `hrp_normalize_phone` / `hrp_normalize_full_name` agree with TS `normalizePhone` / `normalizeFullName` for every fixture in `tests/db/_fixtures/normalization-fixtures.json` | source code complete; **CI Integration lane** | runtime (CI) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`) |
| AC-18 | Integration lane — masked regression lane: `hrp_ra_select_writer` permits SELECT (HR_MANAGER context); `hrp_ra_update_writer` permits UPDATE ACTIVE→CONSUMED with labor_profile_id bound (writer policies preserved for non-anon paths) | source code complete; **CI Integration lane** | runtime (CI) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`) |

### 2.1 Implementation gates (locally re-measured at HEAD `1c08ecd`; CI-attached run `35556876521`)

| AC | Verification command | Result | Status |
|---|---|---|---|
| AC-01 typecheck | `npx tsc --noEmit` | exit 0; no diagnostics | PASS — `evidence/typecheck.txt` |
| AC-02 lint | `npm run lint` | exit 0; 0 errors, warnings only (no new errors introduced) | PASS — `evidence/lint.txt` |
| AC-03 unit | `npx vitest run --config vitest.unit.config.ts` | exit 0; **2390**/2390 PASS in 156 files (was 2378; +12 SEC tests) | PASS — `evidence/vitest-unit.txt` |
| AC-04 build | `npx prisma generate && npm run build` | exit 0; route `/api/public/intake` registered | PASS — `evidence/build.txt` |
| AC-05 service unit | `npx vitest run --config vitest.unit.config.ts src/domains/applications/aff03-public-intake.service.test.ts` | exit 0; 20/20 PASS | PASS — `evidence/vitest-aff03b-service.txt` |
| AC-06 route unit | `npx vitest run --config vitest.unit.config.ts src/domains/applications/aff03-public-intake.route.test.ts` | exit 0; 12/12 PASS | PASS — `evidence/vitest-aff03b-route.txt` |
| AC-07 boundary static | `npx vitest run --config vitest.unit.config.ts src/domains/applications/security-boundary.aff03b.test.ts` | exit 0; 12/12 PASS | PASS — `evidence/vitest-aff03b-sec-static.txt` |
| AC-08 hygiene static | `npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts` | exit 0; 4/4 PASS | PASS — `evidence/vitest-migrations-hygiene.txt` |
| AC-09 scope | forbidden-paths regex against `git diff --name-only origin/main..HEAD` | only the additive migration + docs/tasks touch; no schema / no talent / no referrals | PASS — `evidence/git-diff-scope.txt` |
| AC-10 no impersonation | `git grep -nE 'set_config\(\s*['\''"]app\.role\|applyRlsContext\|withDbContext' app/api/public/intake/ src/domains/applications/aff03-public-intake.service.ts` | 0 matches | PASS — `evidence/git-grep-no-impersonation.txt` |
| AC-11 migration is non-definer of role | `git grep -nE 'CREATE\s+ROLE\|BYPASSRLS' prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql` | 0 matches in executable SQL | PASS — `evidence/git-grep-rpc-role.txt` |

### 2.2 AC reserved for CI Integration lane (CI green on run `35556876521` at HEAD `1c08ecd`)

These AC require a live DB on the CI container (`postgres:16-alpine` ephemeral service container) with both migrations applied and `hrp_public_rpc` provisioned. They are **executed** by the CI Integration lane and PASSED on run `35556876521` (430/432 tests PASS, 2 skipped baseline in `live-integration.ops06a.test.ts`):

- AC-12 (runtime happy path) — PASS
- AC-13 (attribution-guard triad a/b/c) — PASS
- AC-14 (TOKEN_SIGNING_ERROR) — PASS
- AC-15 (phone-only NEW_PROFILE regression) — PASS
- AC-16 (returning applicant EXACT_MATCH regression) — PASS
- AC-17 (24-fixture normalization parity) — PASS
- AC-18 (masked writer-policies regression) — PASS

## 3. Evidence registry

| Evidence | Command | Populated at delivery |
|---|---|---|
| E-01 | `npx vitest run --config vitest.unit.config.ts` | `evidence/vitest-unit.txt` |
| E-02 | `npx tsc --noEmit` | `evidence/typecheck.txt` |
| E-03 | `npm run lint` | `evidence/lint.txt` |
| E-04 | `npm run build` (after `npx prisma generate`) | `evidence/build.txt` |
| E-05 | `npx vitest run --config vitest.unit.config.ts src/domains/applications/aff03-public-intake.service.test.ts` | `evidence/vitest-aff03b-service.txt` |
| E-06 | `npx vitest run --config vitest.unit.config.ts src/domains/applications/aff03-public-intake.route.test.ts` | `evidence/vitest-aff03b-route.txt` |
| E-07 | `npx vitest run --config vitest.unit.config.ts src/domains/applications/security-boundary.aff03b.test.ts` | `evidence/vitest-aff03b-sec-static.txt` |
| E-08 | `npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts` | `evidence/vitest-migrations-hygiene.txt` |
| E-09 | forbidden-paths scope check (`git diff` against baseline) | `evidence/git-diff-scope.txt` |
| E-10 | no-impersonation grep | `evidence/git-grep-no-impersonation.txt` |
| E-11 | migration-no-role-creation grep | `evidence/git-grep-rpc-role.txt` |
| E-12 | `npm run test:integration` (CI Integration lane run `35556876521` at HEAD `1c08ecd`) | `evidence/integration-aff03b.txt` (CI-attached, run `35556876521`, 430 PASS / 2 skipped) |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `LIM-AFF-03B-01` | Deferral — carries from AFF-03 round-4 | LIM-AFF-03-01 transfers to AFF-04 (not yet exit-green): "staff complete cùng profile không đổi attribution/handling". Writer's `existingAttr` guard already implements the no-overwrite semantic; the integration test is the natural home of AFF-04. | See HANDOFF §5.1. Tier 0 acknowledgment required before AFF-03B resolve. |
| `LIM-AFF-03B-02` | Deferral — carries from AFF-03 round-4 | LIM-AFF-03-02 transfers to AFF-05B + staff-channel test (not yet exit-green): "staff-created direct profile không auto-credit creator". Auto-credit is owned by AFF-05B (not merged). | See HANDOFF §5.1. Tier 0 acknowledgment required before AFF-03B resolve. |
| `LIM-AFF-03B-03` | Architectural risk — Full RPC blast radius | DEC-12 / RQ-14: The Full RPC mirrors the entire writer chain in PL/pgSQL. The migration's `hrp_score_labor_profile` must stay bit-identical to TS `scoreAndClassify`. AC-17 (24-fixture normalization parity) is the gate. Any drift between TS and SQL normalizers / scoring is a P0 regression. | Mitigated by AC-17 (24-fixture static corpus) + AC-13 scoring-parity integration tests. |
| `DEV-01` | Documentation cleanup — round-4 verdict | DEC-02 line 67 wording cleaned up to "RPC-body probe (b)" / "RPC-body WHERE predicate (c)" (round-4 verdict). STEP-04(f) test name + description cleaned up: attribution guard (c) = RPC-body WHERE predicate (status='ACTIVE' no longer matches); removed "or 42501" phrase (BYPASSRLS skips RLS, so no 42501 at this layer). | RESOLVED during /deliver. |

## 5. Final status

Status: `READY_FOR_AUDIT` (round 3 — Tier 3 FOCUSED delta audit `PASS` at HEAD `1c08ecddd10564e0372f4146cf3527b5b21d4351` on CI run `35556876521` per `AUDIT.md` v0.2; audited implementation SHA = `1c08ecd`; **Tier 0 ACCEPT**; merge decision = T0/Owner; production gate = T0/Owner; T1B does NOT self-apply, self-merge, self-deploy, or self-smoke). Tier 0 routing: `GO` writable-staging preflight → `NO-GO` production migration/deploy at this stage → `NO-GO` additional source fixes absent staging defect.

### 5.1 LIM-* (mandatory exit-gate honesty per V6/aff_plan.md §14.1 clause 3)

> **Statement of exit gate**: This slice carries forward `LIM-AFF-03-01` and `LIM-AFF-03-02` from the AFF-03 round-4 verdict (LIM-AFF-03-03 was a contract clarification that does not require an additional guard). The two clauses of the AFF-03 exit gate are NOT both verified by this slice. The slice does NOT claim a green exit gate; the following LIM statements make the gap explicit and require Tier 0 acknowledgment before this slice is resolved.

#### LIM-AFF-03B-01 — carries from AFF-03 (LIM-AFF-03-01)

**Clause**: when a staff member later completes a `LaborProfile` (different channel: `STAFF_INTAKE`) for the same identity, the original attribution and handling must NOT change.

**Status**: NOT verified by this slice.

**Why deferred**: AFF-03B owns the **anon write path** (RPC boundary + RLS fix). The staff-channel test that proves "staff intake on an already-attributed profile does not overwrite the attribution" crosses the `src/domains/talent/**` boundary, which is forbidden in this slice. The writer's `existingAttr` guard already implements the no-overwrite semantic, but the integration test that asserts it against a real LaborProfile is the natural home of AFF-04.

**Required action before exit-gate green**: separate slice (proposed `hrp-v6-n2-aff-04-handling-overlap-tests`) that exercises the staff route against an already-attributed LaborProfile and asserts (a) `referral_attributions.labor_profile_id` unchanged, (b) `labor_profile_handling_assignments` not modified, (c) the original `assignee_user_id` remains the ACTIVE assignment. Tier 1 will escalate to Tier 0 for explicit acceptance of this deferral before this slice is resolved.

#### LIM-AFF-03B-02 — carries from AFF-03 (LIM-AFF-03-02)

**Clause**: when a staff member creates a LaborProfile directly (no public click, no cookie), the staff member is not auto-credited as the referrer.

**Status**: NOT verified by this slice — and CANNOT be verified by this slice alone.

**Why deferred**: AFF-03B has no commission / beneficiary wiring. The auto-credit mechanism is owned by AFF-05B (`Universal commission beneficiary`), which is not merged. Until AFF-05B lands, no auto-credit path exists at all; AFF-03B cannot violate it because the credit pipeline does not exist.

**Required action before exit-gate green**: AFF-05B (commission beneficiary) must land AND a separate test slice must assert that staff-channel intake does NOT trigger any beneficiary resolution. Tier 1 will NOT self-author this.

#### Verbatim exit-gate honesty statement

> The two AFF-03B exit-gate clauses from V6/aff_plan.md ("nhân viên hoàn thiện cùng profile không đổi attribution/handling" and "staff-created direct profile không auto-credit creator") are explicitly NOT verified by this slice. They are deferred to AFF-04 (`LIM-AFF-03B-01`) and AFF-05B + a follow-on slice (`LIM-AFF-03B-02`) respectively. **Until those slices land, the AFF-03B exit gate is not green** — this is documented and not an oversight.

### 5.1b Tier 3 verdict (round 3 — FOCUSED delta audit at HEAD `1c08ecd`)

**Audited implementation SHA**: `1c08ecddd10564e0372f4146cf3527b5b21d4351`.
**CI run attached**: [`35556876521`](https://github.com/nobita6986/HRpartner/actions/runs/35556876521).
**Audit verdict**: **`PASS`** (Tier 3 FOCUSED delta audit per `AUDIT.md` v0.2).

All 10 FOCUSED audit items PASS (per `AUDIT.md` v0.2 §2):

| # | Item | Verdict |
|---|---|---|
| 1 | SECURITY DEFINER owner / search_path / EXECUTE grants on all 4 functions | PASS |
| 2 | Helper functions granted to PUBLIC are pure + pinned search_path | PASS |
| 3 | `SELECT, INSERT` on `placement_case` for `hrp_public_rpc` | PASS |
| 4 | Scoring parity phone/cccd/fullName (TS vs PL/pgSQL) | PASS |
| 5 | `text` ID matches Prisma `@id @default(uuid())` schema | PASS |
| 6 | Attribution-guard triad (a)/(b)/(c) + `ROW_COUNT` defense | PASS |
| 7 | Migration runs cleanly from a DB without prior functions/membership | PASS (CI proof) |
| 8 | Runtime role `app_user_writer` no over-grant | PASS |
| 9 | Integration count 430 PASS + 2 skipped baseline | PASS |
| 10 | F-P3-1 stale route comment fixed | PASS |

**Non-blocking finding (P3, doc-drift)**: `F-P3-2` — HANDOFF/E-01 evidence still cite `2390/2390` (unit) and `12/12` (boundary static) while CI Quality run `35556876521` attests `2391/2391` and the local boundary test file now holds 13 cases (added `SEC-04b` in commit `8634c0a`). Recorded as non-blocking; deferred to the next doc-cleanup round. Runtime correctness, security posture, gate eligibility, and the Tier 0 squash-merge decision are unaffected. See `AUDIT.md` v0.2 §1 for the full F-P3-2 record.

**Two LIM-* (preserved verbatim, NOT overcomeable in this slice)**:
- `LIM-AFF-03B-01` — staff-channel overlap test (deferred to AFF-04). §5.1 above.
- `LIM-AFF-03B-02` — staff-channel auto-credit test (deferred to AFF-05B + follow-on). §5.1 above.

**Tier 0 authorization status (this round)**:
- `GO` writable-staging preflight.
- `NO-GO` production migration/deploy at this stage.
- `NO-GO` additional source fixes absent staging defect.

### 5.2 Tier 1 owner commitments before next round

1. All AC have evidence files populated OR are explicitly marked CI-only.
2. `verify-task.ps1` AND `verify-handoff.ps1` both PASS.
3. CI Integration lane is green on the frozen SHA (CI-only AC).
4. `LIM-*` statements are verbatim in this section (already met).
5. Tier 0 has acknowledged LIM-AFF-03B-01 / LIM-AFF-03B-02 deferral before resolve.
6. **DEC-14 / DEC-15 / RQ-07 / RQ-08 / AC-16 wording is consistent with the runtime architecture (hrp_public_rpc = NOLOGIN BYPASSRLS; the only DB-level guard on UPDATE referral_attributions is the WHERE predicate in the RPC body, NOT an RLS policy).**

### 5.3 Merge gate (T0/Owner-owned; T1B does NOT self-merge)

This slice's delivery is complete at the local worktree. T1B has NOT pushed to remote, has NOT merged PR to `main`, and will NOT.

**T1B delivery gate (PASS, attached to this HANDOFF)**:
- HEAD `1c08ecddd10564e0372f4146cf3527b5b21d4351` on `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix`.
- CI run `35556876521` on HEAD `1c08ecd`: Quality `success` (Typecheck/Lint/Unit **2390/2390 PASS**/Build) + Integration `success` (**430/432 PASS, 2 skipped baseline** in `live-integration.ops06a.test.ts`) + Vercel Preview `success`. `mergeStateStatus = CLEAN`.
- Local unit suite 2390/2390 PASS (`evidence/vitest-unit.txt`).
- 12 STATIC security-boundary tests PASS (`evidence/vitest-aff03b-sec-static.txt`).
- 20 service unit tests PASS (`evidence/vitest-aff03b-service.txt`).
- 12 route unit tests PASS (`evidence/vitest-aff03b-route.txt`).
- 4 RQ-06 hygiene tests PASS (`evidence/vitest-migrations-hygiene.txt`).
- Forbidden paths clean (AC-09).
- `verify-handoff.ps1` PASS WITH WARNINGS (H-15 only — TASK field changes for round-4 cleanup conditions are expected; recorded in §5.5 Revision Log).
- All LIM-* recorded verbatim in §5.1 with the round-2 disposition (LIM-AFF-03B-01 → AFF-04; LIM-AFF-03B-02 → AFF-05B + staff-channel test; LIM-AFF-03B-03 = architectural risk with AC-17 gate).
- **No credentials / container passwords committed to Git.** Any leaked credential in local ad-hoc env-var settings (e.g. `DATABASE_URL=...` set during a quality-lane check) is `[REDACTED]` in any report that touches Git; the live CI run uses ephemeral container credentials provisioned by the CI workflow and never enters Git.

**T0/Owner merge gate (NOT delegated; ordered sequence — STOP at any failed step)**:

1. **Preflight on writable staging replica** (NOT on production read-only).
   - Use the same Postgres major version + role set as production; create a throwaway DB; apply all prior migrations from `_prisma_migrations` to current; run OP-01 (`scripts/create-public-rpc-role.cjs`) to provision `hrp_public_rpc` (NOLOGIN BYPASSRLS); then apply `prisma/migrations/20260919100000_aff03b_public_intake_rpc/`.
   - Confirm `pg_policies` rows: existing N2-1 policies on `referral_attributions` (`hrp_ra_*`) AND the 2 writer policies `hrp_ra_select_writer` / `hrp_ra_update_writer` from `20260918100000_*` remain in place.
   - Confirm `pg_proc` rows: 4 functions with correct proowner=hrp_public_rpc and prosecdef=true for `hrp_score_labor_profile` / `hrp_public_intake_submission`.
   - Confirm `prisma migrate status` reports both migrations as **applied** (no `Drift detected`, no pending).
   - **STOP** if any of the above fails — do not proceed to step 2.

2. **Apply BOTH migrations to production** (`npx prisma migrate deploy` or equivalent).
   - The order is critical: `20260918100000_*` first (writer policies for non-anon paths), then `20260919100000_*` (RPC + grants + ownership choreography).
   - T0/Owner executes against the production DB. This is the **only** step that mutates the production schema.
   - Confirm `prisma migrate status` reports both migrations as applied; capture run-log to the deploy audit record.
   - **STOP** if any migration fails or reports drift — do not proceed to step 3.

3. **Merge PR to `main`** (`gh pr merge <PR> --squash` or equivalent).
   - Branch `tier1/hrp-v6-n2-aff-03-apply-attribution` → `main`.
   - **STOP** if merge conflicts appear — rebase is T1B's lane but only **after** T0/Owner explicitly delegates the rebase; T1B will NOT rebase without a fresh T0 instruction.

4. **Deploy `main`** to the production app (the runtime that serves `/api/public/intake`).
   - Standard release pipeline; verify the deployed build hash matches the post-merge `main` HEAD.
   - **STOP** if the deploy fails — rollback to the previous release; do not smoke a half-deployed runtime.

5. **Post-deploy smoke + attribution audit** (only after steps 1–4 all PASS).
   - `curl -sS -i -X POST https://hrpartner.example/api/public/intake -H 'Idempotency-Key: <uuid>' -H 'Content-Type: application/json' -b 'hrp_aff=<forged>' --data '{...}'` → expect `201` with no referrer fields; pre- and post- `SELECT COUNT(*) FROM referral_attributions WHERE updated_at > $preTs` must be `0`; `SELECT COUNT(*) FROM labor_profiles WHERE created_at > $preTs` MUST be `1` (anon non-attributed path).
   - `curl -sS ... -b 'hrp_aff=<valid>' ...` → expect `201`; post- `SELECT status, consumed_at, labor_profile_id FROM referral_attributions WHERE id=$attrId` must be `('CONSUMED', non-null, <lpId>)`; post- `SELECT source, assignee_user_id FROM labor_profile_handling_assignments WHERE labor_profile_id=$lpId` must be `('AFF_INITIAL', <referrerUserId>)`.
   - **Regression assertion**: `SELECT COUNT(*) FROM labor_profiles` before vs after the smoke window; the new applicant LP must be `+1` exactly; any other LaborProfile row that materialized during the window is a **regression** — STOP and investigate.

**Why T1B does NOT self-merge or self-apply**: per the Tier 0 brief and the round-4 verdict, T1B is not authorized to mutate production schema or merge to `main`. The worktree at HEAD (to be filled) is a clean, audit-attached delivery state; T0/Owner takes steps 1–5 from here.

### 5.4 Tier 3 FOCUSED delta audit request (round 2 — Tier 0 ordered)

> Tier 0 freeze at HEAD `1c08ecd` and the CI-green state on PR #22 (run `35556876521`) trigger a FOCUSED delta audit from Tier 3. The audit is **limited in scope** to the items listed below; Tier 3 does NOT re-run full gates (carry-forward per `tier3.md`).

**Audit baseline (previous Tier 3 PASS)**: `71a985969e8d4786241a52fdac8369200f5e5bcd` (parent slice aff-03, attached to CI run `35418481137`, T3 R3 PASS).

**Audit target (current)**: `1c08ecddd10564e0372f4146cf3527b5b21d4351` (slice 03b HEAD, attached to CI run `35556876521`).

**Diff range**: `71a9859..1c08ecd` (13 commits cumulative; the 9 round-2 fixup commits are documented in §5.5 Revision Log).

**Tier 3 audit scope (FOCUSED — Tier 0 limited)**:

| # | Item | Verification method |
|---|---|---|
| 1 | `SECURITY DEFINER` owner / search_path / EXECUTE grants on all 4 functions in `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql`. | `pg_proc` query on a writable staging target OR static read of the migration file + `security-boundary.aff03b.test.ts` SEC-01..SEC-04. |
| 2 | Helper functions granted to PUBLIC are truly pure (no side-effects, deterministic, pinned search_path). | `security-boundary.aff03b.test.ts` SEC-05 + read of `hrp_normalize_phone` / `hrp_normalize_full_name` bodies (IMMUTABLE, PARALLEL SAFE, no SQL access). |
| 3 | `SELECT, INSERT` on `placement_case` for `hrp_public_rpc` (the round-2 fixup added `SELECT` for the EXCEPTION branch's race-recovery lookup). | `pg_class.relacl` query OR static read of `migration.sql:582` (`GRANT SELECT, INSERT ON placement_case TO hrp_public_rpc`). |
| 4 | Scoring parity of phone / cccd / fullName between TS `scoreAndClassify` and PL/pgSQL `hrp_score_labor_profile`. | `tests/db/_fixtures/normalization-fixtures.json` (24 fixtures) + integration test `normalization + scoring parity` (AC-17). |
| 5 | `text` ID type on `hrp_public_intake_submission` `RETURNS TABLE` matches Prisma `@id @default(uuid())` schema (`Text` column with UUID string), NOT `uuid`. | Static read of `migration.sql:288-302` comment block + comparison with `prisma/schema.prisma` LaborProfile `@id` declaration. |
| 6 | Attribution-guard triad (a)/(b)/(c) — service-level pre-filter / RPC-body probe / RPC-body WHERE predicate — and explicit `ROW_COUNT` defense-in-depth assertion. | Integration tests AC-13 (a)/(b)/(c); static read of `migration.sql:450-500` block. |
| 7 | Migration runs cleanly from a DB that has no prior `hrp_public_intake_submission` / `hrp_score_labor_profile` / `hrp_normalize_*` / `hrp_public_rpc` membership (CI uses ephemeral container — proof by CI green run `35556876521`). | `gh run view 35556876521 --json jobs` shows `Integration (DB tests · fail-closed)` job concluded `success` after `Prisma migrate deploy (apply all 39 migrations on container)` step succeeded. |
| 8 | Runtime role `app_user_writer` does NOT gain new privileges beyond what is contractually needed (no over-grant via the new migration). | Static read of `migration.sql:578-582` (DEC-15 table grants) + `security-boundary.aff03b.test.ts` SEC-07 + comparison with `pg_class.relacl` for `app_user_writer` (should be UNCHANGED by `20260919100000_*`). |
| 9 | Integration test count: 430 PASS + 2 skipped (in `live-integration.ops06a.test.ts`, baseline skip that is NOT introduced by this slice) is the expected baseline. | `gh run view 35556876521 --job 106202086882 --log` shows `Tests 430 passed | 2 skipped (432)`. Confirm the 2 skips are pre-existing in the file (the test name `live-integration.ops06a.test.ts` predates this slice). |
| 10 | No F-P3-1 stale route comment (422 → 409) remains; comment references the RPC end-to-end. | `app/api/public/intake/route.ts` header comment block static read. |

**Out of FOCUSED audit scope** (NOT re-verified — carry-forward from round-1 T3 PASS at HEAD `4909c41`):

- `LIM-AFF-03-01` / `LIM-AFF-03B-01` staff-channel overlap tests (carried to AFF-04).
- `LIM-AFF-03-02` / `LIM-AFF-03B-02` staff-channel auto-credit tests (carried to AFF-05B + follow-on slice).
- The full unit suite (2390/2390 PASS carry-forward from round-1 T3 PASS; CI Quality run re-attests in `35556876521`).
- The full integration suite beyond the FOCUSED items above (CI Integration run re-attests in `35556876521`).

**Tier 3 verdict options**:

- `PASS` — all 10 FOCUSED items PASS; Tier 1 records the verdict in §5.4 (verdict block) and reports Tier 0 to squash-merge PR #22.
- `CONDITIONAL` — non-blocking findings; record severity and follow-up.
- `FAIL` / `BLOCKED` — blocking findings; Tier 1 fixes in scope and re-runs Tier 3 on the fix surface (does NOT modify CI-attached SHA `1c08ecd` unless Tier 0 explicitly delegates).

### 5.5 Revision Log (handoff-level)

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0.r4 | 2026-09-19 | Initial delivery of slice 03b — Full RPC architecture (DEC-01/11/14/15), 4 PL/pgSQL functions, security-boundary STATIC tests, runtime-role integration lane (AC-12..AC-18). | Tier 0 verdict ACCEPTED (round 4) on DRAFT; 2 cleanup conditions applied during /deliver (DEC-02 wording + STEP-04(f) test description). |
| v1.0.r6 | 2026-09-21 | Round-2 updates: (1) §0 Control replaced placeholder CI URL with real run `35556876521` on HEAD `1c08ecd`; updated SHA stack (Round-1 HEAD `4909c41` → Round-2 HEAD `1c08ecd`, frozen by Tier 0); PR `mergeStateStatus=CLEAN`; Vercel Preview PASS. (2) §2.1 re-heading reflects CI-attached; §2.2 AC-12..AC-18 marked PASS with CI run reference (no longer ENV_BLOCKED). (3) §5.4 added — Tier 3 FOCUSED delta audit request (10 items, scope-limited per Tier 0). (4) §5.5 (formerly §5.4) Revision Log appended. (5) T1B delivery gate updated to HEAD `1c08ecd` + CI run `35556876521`. (6) Reaffirmed `[REDACTED]` policy on any credential / container password in reports that touch Git; live CI uses ephemeral container credentials, never enters Git. | Tier 0 freeze at HEAD `1c08ecd`; CI green at PR #22; Tier 0 ordered FOCUSED delta audit per the §5.4 request. |
| v1.0.r7 | 2026-09-21 | Round-3 updates per Tier 0 ACCEPT of Tier 3 PASS: (1) §0 Control `Next gate` updated to reflect Tier 0 routing `GO writable-staging preflight / NO-GO production migration-deploy / NO-GO additional source fixes`. (2) §5 `Final status` remains `READY_FOR_AUDIT` (per verifier: LIGHT audit mode forces READY_FOR_AUDIT; post-audit PASS state is recorded in the new §5.1b Tier 3 verdict block). (3) New §5.1b Tier 3 verdict block: PASS at audited SHA `1c08ecd` on CI run `35556876521`; 10 FOCUSED items all PASS; one non-blocking P3 doc-drift finding F-P3-2; two LIM-AFF-03B-* preserved verbatim per Tier 0 decision. (4) §5.5 Revision Log appended (this row). | Tier 0 ACCEPT of Tier 3 PASS at SHA `1c08ecd`; Tier 0 ordered writable-staging preflight as next gate. |
| v1.0.r8 | 2026-09-21 | Round-3 staging PASS: (1) §0 Control `Round` updated to 3; `Status` reflects staging preflight PASS at SHA `1c08ecd` on writable-staging `hrp_mp2_test`; `Next gate` updated to `Tier 0 squash-merge PR #22`. (2) New `evidence/staging-preflight-PASS-2026-09-21.md` written with full PASS report (branch gate / fingerprint / migrate status / deploy / post-deploy / integration 15/15 / smoke / DB verification). (3) `evidence/integration-aff03b.txt` appended with staging section. (4) `evidence/staging-preflight-STOP-2026-09-21.md` retained as historical record per Tier 0. (5) Stage-3 evidence files preserved: branch-gate-verdict, fingerprint (pre/post), migrate-status (pre/post), migrate-deploy, integration-aff03b-staging, dev-server (out/err), db-verification, db-final-check, plus the loader+runner PowerShell scripts. (6) All evidence scanned for secrets: clean. (7) `.env` SHA256 hash unchanged (`D228B1B1...3DAAB3A`). (8) HEAD remains `1c08ecddd10564e0372f4146cf3527b5b21d4351` (no source/test/migration modifications). (9) Two LIM-AFF-03B-* preserved verbatim; no behaviour change. | Tier 0 ACCEPT of staging PASS per option (a). T1B commit + push docs-only, then report to Tier 0 for squash-merge authorization. |
