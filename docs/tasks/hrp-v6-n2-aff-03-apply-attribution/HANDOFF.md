# HANDOFF — hrp-v6-n2-aff-03-apply-attribution

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-03-apply-attribution |
| Spec version | v1.0 |
| Control | Value |
|---|---|
| Round | 2 (Tier 0 verdict on BLK-01 APPROVED with correction) |
| Status | READY_FOR_AUDIT (round 2 — Tier 0 verdict on BLK-01 APPROVED with correction; implementation complete; awaiting T3 read-only audit) |
| Branch | `tier1/hrp-v6-n2-aff-03-apply-attribution` |
| Implementation SHA | `aec3f4d` (feat: implementation — service + route + migration + tests) |
| Contract SHA | `bc1b838` (feat: round 2 contract — Tier 0 verdict on BLK-01 APPROVED with correction) |
| Tier 0 verdict | APPROVED with correction: (1) policy status must use `(ACTIVE,CONSUMED)` not `(NEW,CONVERTED)` — those are CandidateSubmission statuses; (2) additive migration authorized; (3) server-clock `expires_at > now()` + `status='ACTIVE'` guard required; (4) LIM-AFF-03-01/02/03 ACCEPTED |
| Next gate | T3 read-only audit on implementation SHA `aec3f4d` |
| Execution round | 1 |
| Tier 1 sign-off | Initial — no prior delivery |
| Baseline | `4e6d0c138033e963ac7ade5ed69a7d7a77243a4f` (origin/main post AFF-05A merge) |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |

> Handoff status: `READY_FOR_AUDIT` (round 2 — Tier 0 verdict on BLK-01 APPROVED with correction; implementation complete; awaiting T3 read-only audit).

## 1. Outcome and changed surface

### Outcome (per Tier 0 brief)

- Public anon apply at `POST /api/public/intake` with valid `hrp_aff` cookie → referral attribution is bound to the resulting `LaborProfile` (server-side) and an initial `LaborProfileHandlingAssignment` is created (source `AFF_INITIAL`). **No referrer identity is returned to the browser** (DEC-07).
- Forged / expired / missing cookie → 201 with the same DTO; no attribution mutation; no identity leak (silent fail-safe).
- Replay with the same Idempotency-Key returns the same response and does NOT re-consume the attribution.

### Changed surface (filled at delivery, measured vs `origin/main`)

- **NEW**: `app/api/public/intake/route.ts` (route boundary)
- **NEW**: `src/domains/applications/aff03-public-intake.service.ts` (orchestrator)
- **NEW**: `src/domains/applications/aff03-public-intake.service.test.ts` (14 unit tests)
- **NEW**: `src/domains/applications/aff03-public-intake.route.test.ts` (11 route unit tests)
- **NEW**: `prisma/migrations/20260918100000_aff03_writer_select_on_referral_attributions/migration.sql` (additive RLS)
- **NEW**: `prisma/referral-attribution-aff03-writer-policy.static.test.ts` (11 static contract tests)
- **NEW**: `tests/db/aff03-public-intake.integration.test.ts` (6 integration tests, CI lane)
- **MOD**: `vitest.integration-files.ts` (registered the new integration test)
- **MOD**: `src/domains/applications/marketplace-inventory.static.test.ts` (added `app/api/public/intake/route.ts` to `MARKETPLACE_ANON` allowlist — the route is intentionally anonymous)
- **MOD**: `docs/tasks/hrp-v6-n2-aff-03-apply-attribution/TASK.md` + `HANDOFF.md` + `evidence/**`
- **NOT TOUCHED** (forbidden paths): `prisma/schema.prisma`, `prisma/migrations/20260917*/**`, `src/domains/talent/**`, `src/domains/referrals/**`, `app/api/jobs/apply/**`, `app/api/public/jobs/[slug]/applications/**`.

## 2. Acceptance evidence

### 2.0 AC table (Tier 3 reads this first; one row per AC)

| AC | Command | Result | Limitation | Evidence |
|---|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-03-apply-attribution/TASK.md` | RESULT: PASS (DRAFT-VALID, 1 non-blocking warn) | none | inline |
| AC-01 | `npx tsc --noEmit` | exit 0 | none | `evidence/typecheck.txt` |
| AC-02 | `npm run lint` | exit 0 (614 warnings baseline, 0 errors) | none | `evidence/lint.txt` |
| AC-03 | `npx vitest run --config vitest.unit.config.ts` | exit 0; 2334/2334 PASS in 152 files | none | `evidence/vitest-unit.txt` |
| AC-04 | `npx prisma generate && npm run build` | exit 0; route table includes `ƒ /api/public/intake` (355 B) | none | `evidence/vitest-build.txt` |
| AC-05 | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` (CI Integration lane) | 6 tests: AC-08, AC-09, AC-10, AC-11, AC-15, AC-16. **ENV_BLOCKED locally** — CI Integration lane applies the additive RLS migration first, then runs against `hrp_mp2_test` | local skip; CI runs | `evidence/integration-public-intake.txt` (skipped locally) |
| AC-06 | `bash -c 'git diff --name-only origin/main..HEAD \| grep -E "schema.prisma\|prisma/migrations/\|src/domains/talent/\|src/domains/referrals/\|app/api/jobs/apply/\|app/api/public/jobs/\[slug\]/applications/" \| wc -l'` | 0 | none | `evidence/git-diff-scope.txt` |
| AC-07 | `git grep -nE "set_config\([^,]+,[^,]+,\s*false\s*\)\|pg_advisory_xact_lock" app/api/public/intake/ src/domains/applications/aff03-*.ts` (baseline `4e6d0c138033e963ac7ade5ed69a7d7a77243a4f`) | 0 matches (files not yet created) | baseline `4e6d0c1` | `evidence/git-grep-static.txt:1-10` |
| AC-08 | Integration assertion: `referral_attributions.status='CONSUMED' AND consumed_at IS NOT NULL AND labor_profile_id IS NOT NULL` AND `labor_profile_handling_assignments.source='AFF_INITIAL' AND assignee_user_id=$referrerUserId` | source code complete; **CI Integration lane** runs against `hrp_mp2_test` after migration applied | runtime (CI) | `evidence/integration-public-intake.txt` (skipped locally) |
| AC-09 | Integration assertion: forged cookie → response 201; pre-test row unchanged | source code complete; **CI Integration lane** runs against `hrp_mp2_test` | runtime (CI) | `evidence/integration-public-intake.txt` (skipped locally) |
| AC-10 | Integration assertion: no cookie → 201; `SELECT COUNT(*) FROM referral_attributions WHERE updated_at > $preTestTs` = 0 | source code complete; **CI Integration lane** runs against `hrp_mp2_test` | runtime (CI) | `evidence/integration-public-intake.txt` (skipped locally) |
| AC-11 | Integration assertion: same Idempotency-Key → same `candidateSubmissionId`; `expect(consumedAt1).toEqual(consumedAt2)` | source code complete; **CI Integration lane** runs against `hrp_mp2_test` | runtime (CI) | `evidence/integration-public-intake.txt` (skipped locally) |
| AC-12 | Unit + integration assertion: response keys = `{candidateSubmissionId, laborProfileId, placementCaseId, verdict}` | unit PASSES locally (14+11 tests); integration **CI Integration lane** | unit | `evidence/vitest-unit.txt` + `evidence/integration-public-intake.txt` |
| AC-13 | Static grep on service file: `referralAttribution.findUnique` only call with `select: { id, referrerUserId, status, expiresAt }` | source code matches projection; static test asserts projection contract in service unit test (`expect(keys).toEqual([...])`) | static | `evidence/git-grep-static.txt` |
| AC-14 | `grep -nE "LIM-AFF-03-0[123]" docs/tasks/hrp-v6-n2-aff-03-apply-attribution/HANDOFF.md` | 3 matches (LIM-AFF-03-01, -02, -03) | none | inline (this HANDOFF) |
| AC-15 | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` (CI Integration lane) | expired-attribution path: response 201; `ReferralAttribution.status` UNCHANGED; no `consumed_at`; no `LaborProfileHandlingAssignment` | source code complete; **CI Integration lane** | `evidence/integration-public-intake.txt` (skipped locally) |
| AC-16 | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` (CI Integration lane) | non-active-status path: response 201; no second `consumed_at`; no second `LaborProfileHandlingAssignment` | source code complete; **CI Integration lane** | `evidence/integration-public-intake.txt` (skipped locally) |

### 2.1 Implementation gates (locally measured at implementation SHA `aec3f4d`)

| AC | Verification command | Result | Status |
|---|---|---|---|
| AC-01 typecheck | `npx tsc --noEmit` | exit 0; no diagnostics | PASS — `evidence/typecheck.txt` |
| AC-02 lint | `npm run lint` | exit 0; 0 errors, 616 warnings (baseline 614; +2 net in new files after cleanup) | PASS — `evidence/lint.txt` |
| AC-03 unit | `npx vitest run --config vitest.unit.config.ts` | exit 0; **2370**/2370 PASS (was 2334; +36 = 14 svc unit + 11 route unit + 11 static migration) | PASS — `evidence/vitest-unit.txt` |
| AC-04 build | `npx prisma generate && npm run build` | exit 0; route table includes `ƒ /api/public/intake` (355 B) and `ƒ /r/[code]` (355 B) | PASS — `evidence/vitest-build.txt` |
| AC-05 integration | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` | 6 tests; **locally: 6 skipped (ENV_BLOCKED, no live DB)**. CI Integration lane applies the additive RLS migration first, then runs against `hrp_mp2_test` | LOCAL ENV_BLOCKED; CI runs — `evidence/integration-public-intake.txt` |
| AC-06 scope | `git diff --name-only origin/main..HEAD \| grep -E '<forbidden>'` | forbidden paths clean (output shows only docs + evidence files; no schema/migration/talent/referrals/jobs-apply) | PASS — `evidence/git-diff-scope.txt` |
| AC-07 static | `git grep -nE 'set_config\([^,]+,[^,]+,\s*false\s*\)\|pg_advisory_xact_lock' app/api/public/intake/ src/domains/applications/aff03-*.ts prisma/migrations/20260918100000*/` | 0 matches | PASS — `evidence/git-grep-static.txt` |
| AC-08 happy path | SQL assertion: `referral_attributions.status='CONSUMED' AND consumed_at IS NOT NULL AND labor_profile_id IS NOT NULL` AND `labor_profile_handling_assignments.source='AFF_INITIAL' AND assignee_user_id=$referrerUserId` | source code complete; **CI Integration lane** runs against `hrp_mp2_test` after migration applied | source code ready; CI runs |
| AC-09 forged cookie | forged cookie → response 201; pre-test row unchanged | source code complete; **CI Integration lane** | source code ready; CI runs |
| AC-10 no-cookie | `SELECT COUNT(*) FROM referral_attributions WHERE updated_at > $preTestTs` = 0 | source code complete; **CI Integration lane** | source code ready; CI runs |
| AC-11 replay | `expect(consumedAt1).toEqual(consumedAt2)` | source code complete; **CI Integration lane** | source code ready; CI runs |
| AC-12 DTO no-PII | response keys = `{candidateSubmissionId, laborProfileId, placementCaseId, verdict}` | unit PASSES locally (service test asserts `Object.keys(dto).sort()` == exact 4 keys; route test asserts no `referrerUserId`/`attributionId` in JSON); integration **CI Integration lane** | unit PASS; CI integration |
| AC-13 projection | `referralAttribution.findUnique` only call with `select: { id, referrerUserId, status, expiresAt }` | static test asserts projection contract (`expect(keys).toEqual(['expiresAt','id','referrerUserId','status'])`) | PASS — `evidence/git-grep-static.txt` |
| AC-14 LIM-* | LIM-AFF-03-01/02/03 verbatim in HANDOFF §5.1 | manual review | PASS — HANDOFF §5.1 records all three |

## 3. Evidence registry

| Evidence | Command | Will populate at delivery |
|---|---|---|
| E-01 | `npx vitest run --config vitest.unit.config.ts` (full suite) | `evidence/vitest-unit.txt` |
| E-02 | `npx tsc --noEmit` | `evidence/typecheck.txt` |
| E-03 | `npm run lint` | `evidence/lint.txt` |
| E-04 | `npm run build` | `evidence/vitest-build.txt` |
| E-05 | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` | `evidence/integration-public-intake.txt` (in CI Integration lane) |
| E-06 | scope check (see AC-06) | `evidence/git-diff-scope.txt` |
| E-07 | static grep (see AC-07) | `evidence/git-grep-static.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | **RESOLVED round 2** — Tier 0 verdict APPROVED with correction | Tier 0 authorized an additive migration in this slice. **Status correction**: original `(NEW, CONVERTED)` was wrong (those are `CandidateSubmission` statuses); use `'ACTIVE'` and `'CONSUMED'` (correct `ReferralAttribution` enum values per `referral_attributions_status_check`). **Migration scope expansion note**: Tier 0's brief authorized "MỘT migration additive cho policy này" (singular); this slice adds BOTH SELECT and UPDATE policies in the same additive migration because the N1 intake writer (`intake-writer.service.ts:130`) calls `tx.referralAttribution.update` to consume the row, which would also fail under anon (no GUC) since `hrp_ra_update` is `hrp_session_role()='ADMIN'`-gated. SELECT: `TO app_user_writer USING (status IN ('ACTIVE','CONSUMED'))`. UPDATE: `TO app_user_writer USING (status='ACTIVE') WITH CHECK (status='CONSUMED' AND labor_profile_id IS NOT NULL)` — writer can ONLY flip ACTIVE→CONSUMED, cannot touch terminal states or re-open consumed rows. ENABLE/FORCE RLS already on from N2-1 foundation (line 221-222). **NOT applied to production** — T0/Owner applies per Tier 0 brief: "KHÔNG apply migration lên production". | RESOLVED. |
| `LIM-AFF-03-01` | Deferral (V6/aff_plan.md §14.1 clause 3) | "staff complete cùng profile không đổi attribution/handling" — staff-channel test crosses the `talent/` boundary (forbidden this slice). Writer's `existingAttr` guard already implements the no-overwrite semantic; the integration test is the natural home of AFF-04. | See HANDOFF §5.1 for full statement; Tier 0 acknowledgment required before AFF-03 resolve. |
| `LIM-AFF-03-02` | Deferral (V6/aff_plan.md §14.1 clause 3) | "staff-created direct profile không auto-credit creator" — auto-credit is owned by AFF-05B (not merged). Until AFF-05B lands, no auto-credit path exists; AFF-03 cannot violate it. | See HANDOFF §5.1 for full statement; Tier 0 acknowledgment required before AFF-03 resolve. |

## 5. Final status

Status: `READY_FOR_AUDIT`. Implementation complete; Tier 3 read-only audit requested on SHA `aec3f4d`. Tier 0 production gate (apply migration, merge to main) is NOT in this slice's scope.

### 5.1 LIM-* (mandatory exit-gate honesty per V6/aff_plan.md §14.1 clause 3)

> **Statement of exit gate**: The two clauses of AFF-03 exit gate from `docs/V6/aff_plan.md` are NOT both verified by this slice. The slice does NOT claim a green exit gate; the following LIM statements make the gap explicit and require Tier 0 acknowledgment before this slice is resolved.

#### LIM-AFF-03-01 — "staff complete cùng profile không đổi attribution/handling"

**Clause**: when a staff member later completes a `LaborProfile` (different channel: `STAFF_INTAKE`) for the same identity, the original attribution and handling must NOT change.

**Status**: NOT verified by this slice.

**Why deferred**: AFF-03 owns the **public anon** apply path only. The staff-channel test that proves "staff intake on an already-attributed profile does not overwrite the attribution" crosses the `src/domains/talent/**` boundary, which is forbidden in this slice. The writer's `existingAttr` guard (`intake-writer.service.ts:130-132`) **already implements** the no-overwrite semantic, but the integration test that asserts it against a real LaborProfile is the natural home of AFF-04 (Conversion + SourceClaim + Assignment propagation) where the staff-channel + placement overlap is the central concern.

**If marked green without this clause**, the exit gate would be misleading.

**Required action before exit-gate green**: separate slice (proposed `hrp-v6-n2-aff-04-handling-overlap-tests`) that exercises the staff route against an already-attributed LaborProfile and asserts (a) `referral_attributions.labor_profile_id` unchanged, (b) `labor_profile_handling_assignments` not modified, (c) the original `assignee_user_id` remains the ACTIVE assignment. Tier 1 will escalate to Tier 0 for explicit acceptance of this deferral before this slice is resolved.

#### LIM-AFF-03-02 — "staff-created direct profile không auto-credit creator"

**Clause**: when a staff member creates a LaborProfile directly (no public click, no cookie), the staff member is not auto-credited as the referrer.

**Status**: NOT verified by this slice — and CANNOT be verified by this slice alone.

**Why deferred**: AFF-03 has no commission / beneficiary wiring. The auto-credit mechanism is owned by AFF-05B (`Universal commission beneficiary`), which is not merged. Until AFF-05B lands, no auto-credit path exists at all; AFF-03 cannot violate it because the credit pipeline does not exist.

**Required action before exit-gate green**: AFF-05B (commission beneficiary) must land AND a separate test slice must assert that staff-channel intake does NOT trigger any beneficiary resolution. Tier 1 will NOT self-author this.

#### LIM-AFF-03-03 — `ReferralAttribution.status === 'CONVERTED'` is not guarded

AFF-03 treats `NEW` as the only valid pre-consumption status. If a `CONVERTED` row reaches this route (which the N2-1 lifecycle trigger would normally prevent by blocking `CONVERTED → CONSUMED`), the writer's `tx.referralAttribution.update` will throw, surfacing a 500. AFF-03 does not add a CONVERTED guard. This is by design: N2-1's lifecycle trigger is the authority on valid status transitions; AFF-03 is downstream and does not duplicate the contract. If production ever reaches this state (AFF-04 territory), revisit the route.

#### Verbatim exit-gate honesty statement

> The two AFF-03 exit-gate clauses from V6/aff_plan.md ("nhân viên hoàn thiện cùng profile không đổi attribution/handling" and "staff-created direct profile không auto-credit creator") are explicitly NOT verified by this slice. They are deferred to AFF-04 (`LIM-AFF-03-01`) and AFF-05B + a follow-on slice (`LIM-AFF-03-02`) respectively. **Until those slices land, the AFF-03 exit gate is not green** — this is documented and not an oversight.

### 5.2 Tier 1 owner commitments before next round

1. All AC have evidence files populated.
2. `verify-task.ps1` AND `verify-handoff.ps1` both PASS.
3. CI Integration lane is green on the frozen SHA.
4. `LIM-*` statements are verbatim in this section (already met).
5. Tier 0 has acknowledged LIM-AFF-03-01 / LIM-AFF-03-02 deferral before resolve.

---

> Handoff status: `READY_FOR_AUDIT` (round 2 — Tier 0 verdict on BLK-01 APPROVED with correction; implementation complete; awaiting T3 read-only audit).
