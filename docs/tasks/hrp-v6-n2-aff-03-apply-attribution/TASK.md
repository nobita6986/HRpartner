# TASK — hrp-v6-n2-aff-03-apply-attribution

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-03-apply-attribution |
| Work type | CODE |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | Public anonymous write that consumes a signed cookie, mutates a `ReferralAttribution` row (status `CONSUMED`), and persists a `LaborProfileHandlingAssignment` via the N1 intake writer; touches the public-apply boundary that determines referrer authority on every first-party intake. |
| Spec version | v1.0 |
| Status | READY_FOR_AUDIT (round 2 — Tier 0 verdict on BLK-01 APPROVED with correction; implementation complete; awaiting T3 read-only audit) |
| Planner | Tier 1 |
| Baseline | `4e6d0c138033e963ac7ade5ed69a7d7a77243a4f` (origin/main, post AFF-05A merge) |
| In-scope roots | `app/api/public/intake/**`, `src/domains/applications/aff03-*.ts`, `src/domains/applications/intake-route-*.test.ts`, `tests/db/aff03-*.integration.test.ts`, `docs/tasks/hrp-v6-n2-aff-03-apply-attribution/**` |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`, `src/domains/talent/**` (read-only intake writer), `src/domains/referrals/**` (boundary read; verification of token is delegated to existing public util `verifyAttributionToken`), `src/domains/applications/apply-helpers.ts` (read-only), `app/api/jobs/apply/**` (DEC-10 retired stub), `app/api/public/jobs/[slug]/applications/**` (legacy MP-2 RPC, out of scope) |
| Required gates | typecheck, lint, unit, build, integration (container DB, fail-closed) |
| Current execution round | 1 |
| Current audit round | 1 |
| Next gate | Tier 0 verdict on RLS policy (BLOCKER Q-01) → if approved, additive RLS migration in a separate slice → return to `/deliver` (implement route + service + tests + integration; populate `evidence/**`; rerun all gates; move status to `READY_FOR_AUDIT`) → Tier 3 LIGHT read-only audit → Tier 0 final verdict + LIM acknowledgment → `/resolve`. Tier 0 production-gate authorization (BLK-01) is a separate concern, NOT this slice. |

## 1. Outcome

### 1.1 User-visible outcome

- A public, anonymous applicant arriving at `POST /api/public/intake` with a valid `hrp_aff` cookie has their referral attribution bound to the resulting `LaborProfile` (server-side) and a corresponding initial `LaborProfileHandlingAssignment` is created via the AFF-05A authority. **No referrer identity is returned to the browser** (DEC-07).
- An anonymous direct apply (no cookie / forged cookie / expired cookie / unresolvable attribution) succeeds exactly as before: profile + case + submission are created, **no** referral attribution is bound, **no** referrer is credited, **no** identity signal is leaked (constant response shape).
- Replay with the same Idempotency-Key returns the previous result; **attribution state is not mutated on replay** (idempotency-key pattern matches N1 contract).

### 1.2 Non-goals

- No new migration. Schema already includes `ReferralAttribution`, `LaborProfileHandlingAssignment`, partial unique on `referral_attributions(labor_profile_id)`, and engine RLS for engine-INSERT. (AFF-05A schema is sufficient; if a SECURITY DEFINER RPC is required, escalate to Tier 0 as additive slice — NOT in this task.)
- No commission / beneficiary wiring (AFF-05B).
- No staff-channel `referrerUserId`/auto-credit guarantee (deferred — see `LIM-AFF-03-01`, `LIM-AFF-03-02`).
- No UI change. No change to `/api/jobs/apply` (DEC-10 retired stub) or `/api/public/jobs/[slug]/applications` (legacy MP-2 RPC).
- No `hrp_aff` cookie issuance or rotation (N2-2 already does that on `/r/{code}` redirect).
- No change to existing staff intake route `app/api/admin/intake/staff/route.ts` (auth path stays as-is).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| E-01 | `evidence/vitest-unit.txt` | Unit suite covers: cookie verify-failure paths (forged, expired, missing); `ReferralAttribution.findUnique` projection (id + referrerUserId + status only); writer `referralAttributionId=null` no-op; writer `referralAttributionId=valid` triggers update; idempotency replay returns same result, no second attribution update; route boundary shields from direct `ReferralAttribution` writes. |
| E-02 | `evidence/typecheck.txt` | Strict TS, no `any`. |
| E-03 | `evidence/lint.txt` | 0 errors. |
| E-04 | `evidence/vitest-build.txt` | `npm run build` exits 0; route table includes `ƒ /api/public/intake`. |
| E-05 | `evidence/integration-public-intake.txt` | Container-DB integration: real `ReferralAttribution` row → apply → `laborProfileId` is set on the attribution row, `status=CONSUMED`, `consumedAt` non-null, `LaborProfileHandlingAssignment` row created with `source=AFF_INITIAL`, `assigneeUserId=referrerUserId`. No-cookie path: 201, no attribution mutation. Forged-cookie path: 201, no attribution mutation. Replay path: second call returns same id, no second update. |
| E-06 | `evidence/git-diff-scope.txt` | `git diff --name-only origin/main..HEAD` excludes every forbidden path. |
| E-07 | `evidence/git-grep-static.txt` | `git grep` confirms no `set_config(..., false)` in route/service; no `pg_advisory_xact_lock`; no raw SQL on `referral_attributions` outside the engine authority (N2-1 already owns engine INSERT). |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | New canonical public anon N1 route `POST /api/public/intake` (NOT `/api/jobs/apply`, NOT `/api/public/jobs/{slug}/applications`). Per the legacy stub comment in `app/api/jobs/apply/route.ts` and DEC-10, the existing public-apply routes are retired/legacy-MP-2; AFF-03 needs a parallel path that drives the N1 intake writer + handles the cookie. | CHOSEN |
| DEC-02 | Cookie → attribution resolution runs in service layer using Prisma model `ReferralAttribution.findUnique({ where: { id }, select: { id, referrerUserId, status } })`. NO raw SQL on `referral_attributions` from this task — the engine principal already owns INSERT/UPDATE (N2-1). | CHOSEN |
| DEC-03 | Forged / expired / unresolvable cookie → silent fail-safe: `referralAttributionId=null` is passed to the writer; response is 201 with the same shape. No `401`, no body change, no log line that leaks whether the cookie was forged vs missing (privacy). | CHOSEN |
| DEC-04 | Response DTO: `{ verdict, laborProfileId, placementCaseId, candidateSubmissionId }` — NEVER `referrerUserId`, NEVER `attributionId`. DEC-07. | CHOSEN |
| DEC-05 | Idempotency-Key REQUIRED (UUID v4). Replay returns the same response body and does NOT re-consume the attribution. (The attribution is consumed exactly once, by the first call's transaction.) | CHOSEN |
| DEC-06 | The N1 writer's existing `referralAttributionId` wiring is reused unchanged. We do NOT bypass `createOrMatchLaborProfile`. We do NOT bypass `openPlacementCase`. We do NOT modify `intake-writer.service.ts`. | CHOSEN |
| DEC-07 | Rate-limit: `APPLY_IP` (existing) BEFORE parse; no additional bucket this round (cookie verification happens inside the handler, after parse, since `verifyAttributionToken` is in-process and free). | CHOSEN |
| DEC-08 | Engine principal: route uses `getPrisma()` (app_user_writer) — the writer role; engine INSERT to `referral_attributions` is owned by N2-1's app_engine_writer and is NOT triggered from this slice. | CHOSEN |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | Public, anonymous applicant can POST to `POST /api/public/intake` with body `{ fullName, phone, cccdNumber?, dateOfBirth?, consentAt }` + header `Idempotency-Key` (UUID). |
| RQ-02 | If the request carries a `hrp_aff` cookie whose signed payload resolves to a `ReferralAttribution` row in `status = 'ACTIVE'` (any other state → fail-safe no-op), the resulting `LaborProfile` is bound to that `ReferralAttribution` and an initial `LaborProfileHandlingAssignment` (source `AFF_INITIAL`) is created. |
| RQ-03 | `referrerUserId` is ALWAYS server-derived from the `ReferralAttribution` row. The client never sends `referrerUserId`, `attributionId`, or any referrer field. |
| RQ-04 | Forged, expired, or unresolvable cookies are silently treated as "no attribution" — the route returns 201 with the standard DTO. No 401, no body delta. |
| RQ-05 | Replay with the same Idempotency-Key returns the same response. The attribution is consumed exactly once (by the transaction that creates the first `LaborProfile`). |
| RQ-06 | Anonymous direct apply (no cookie) still returns 201 with no attribution binding. |
| RQ-07 | Response DTO NEVER contains `referrerUserId`, `attributionId`, or any other referrer identity field. |
| RQ-08 | The public projection for cookie resolution reads ONLY `{ id, referrerUserId, status }` from `ReferralAttribution` — no `affiliateCodeSnapshot`, no timestamps, no PII. |
| RQ-09 | Server-clock expiry guard: a cookie may verify successfully, but the service MUST additionally check `expires_at > now()` AND `status = 'ACTIVE'` BEFORE passing `referralAttributionId` to the intake writer. If either check fails, treat as forged (silent fail-safe; do NOT consume). The N2-1 lifecycle trigger enforces `ACTIVE → CONSUMED`; the service guard makes the check explicit at the boundary, not implicit via trigger exception. |

### 4.2 Scope boundaries

- **In scope:**
  - `app/api/public/intake/route.ts` — public anon POST route.
  - `src/domains/applications/aff03-public-intake.service.ts` — orchestrator: cookie verify + model lookup + writer call.
  - `src/domains/applications/aff03-public-intake.service.test.ts` — unit tests.
  - `app/api/public/intake/route.test.ts` — route unit tests (zero-DB by mocking `withDbContext`).
  - `tests/db/aff03-public-intake.integration.test.ts` — container-DB integration.
  - `docs/tasks/hrp-v6-n2-aff-03-apply-attribution/TASK.md` + `HANDOFF.md` + `evidence/**`.
- **Out of scope:**
  - `prisma/schema.prisma` — no schema change.
  - `prisma/migrations/**` — no migration.
  - `src/domains/talent/**` — read-only (the intake writer is consumed, not modified).
  - `src/domains/referrals/**` — read-only (token verify util is consumed).
  - `app/api/jobs/apply/**` — DEC-10 retired stub, untouched.
  - `app/api/public/jobs/[slug]/applications/**` — legacy MP-2 RPC path, untouched.
  - `app/r/[code]/route.ts` — N2-2 link capture, untouched.

### 4.3 Domain boundaries

- **Data/state:** Attribution status transition `ACTIVE → CONSUMED` happens in the N1 writer (existing logic, unchanged). The first matching `LaborProfile` is the only one to consume the attribution. If a profile already has an attribution, no second attribution is bound (`existingAttr` check in writer).
- **Permission/security:**
  - The route is anonymous. Auth comes from the signed cookie.
  - Cookie verification is in-process (`verifyAttributionToken`) — no DB call. Token expiry + HMAC integrity + key version are enforced.
  - The DB lookup of `ReferralAttribution` runs under `app_user_writer`. Per N2-1 RLS, the writer role can SELECT `referral_attributions` where `id` matches (the row was created via the engine principal in N2-2, so the SELECT is permitted). **Tier 1 will verify the RLS posture in integration test E-05; if writer cannot SELECT, escalate to Tier 0 as additive RLS slice (NOT a code fix in this task).**
- **Interface/API:**
  - `POST /api/public/intake` body shape mirrors the existing staff route intake body (DEC-09: no `cv` non-null; `cv` field absent or null).
  - `Idempotency-Key` header REQUIRED (UUID v4).
- **Migration/rollback:** No migration. Rollback = revert this commit.

### 4.4 LIM-* (limitations explicitly out of AFF-03)

| ID | Statement | Why deferred |
|---|---|---|
| `LIM-AFF-03-01` | The exit-gate clause *"staff complete cùng profile không đổi attribution/handling"* (V6/aff_plan.md §AFF-03) is NOT verified by AFF-03. That gate requires a staff-channel test that exercises `createCandidateSubmissionFromIntake` with a LaborProfile that already has a `ReferralAttribution` row, and asserts the writer's `existingAttr` guard does NOT overwrite. **The writer logic already implements the guard** (intake-writer.service.ts lines 130-132), but AFF-03 does not write the staff-side test for it. This is the explicit gate that AFF-03 does NOT cover; if marked green without it, the exit gate is misleading. | Requires a staff-route integration test that crosses the `talent/` boundary. Deferred to AFF-04 (Conversion + SourceClaim + Assignment propagation) where the staff-channel + placement overlap is the natural home. |
| `LIM-AFF-03-02` | The exit-gate clause *"staff-created direct profile không auto-credit creator"* is NOT verified by AFF-03. AFF-03 has no commission / beneficiary wiring. | Requires AFF-05B (`Universal commission beneficiary`) which is not merged. Until AFF-05B lands, no auto-credit path exists; AFF-03 cannot violate it. Once AFF-05B lands, the staff-channel credit-disabled path must be asserted separately. |
| `LIM-AFF-03-03` | `ReferralAttribution.status === 'CONVERTED'` does NOT exist in the schema. The valid `referral_attributions.status` enum (per `referral_attributions_status_check`) is `ACTIVE | CONSUMED | EXPIRED | REVOKED | SUPERSEDED`. AFF-03's server-clock + status guard in `resolveActiveAttributionId` (`status='ACTIVE' AND expires_at > now()`, per RQ-09) fail-safe-silently handles every non-ACTIVE terminal state (`EXPIRED`, `REVOKED`, `SUPERSEDED`, `CONSUMED`) by passing `referralAttributionId = null` to the writer — same path as forged / expired cookie. The cookie-verify step also rejects `UNKNOWN_ID` payloads (row not found) before any DB lookup. **There is no separate CONVERTED guard to add because CONVERTED is not a valid `ReferralAttribution` status.** | Re-recorded per Tier 0 round-3 verdict REVISION_REQUIRED: the original LIM text assumed a `CONVERTED` status that the schema does not define. The fail-safe semantic is already enforced by RQ-09. Out of AFF-03 scope to add additional state-specific guards. Tier 1 documents but does NOT defend this in code. |
## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | `prisma/migrations/20260918100000_aff03_writer_select_on_referral_attributions/migration.sql` (new, **ADDITIVE — Tier 0 authorized**) | Add idempotent SELECT + UPDATE policies for `app_user_writer` on `referral_attributions`. SELECT: `status IN ('ACTIVE','CONSUMED')` (read-only access to active + consumed rows; matches Tier 0 verdict). UPDATE: `OLD.status = 'ACTIVE' AND NEW.status = 'CONSUMED' AND NEW.labor_profile_id IS NOT NULL` (writer can ONLY flip ACTIVE→CONSUMED; cannot touch terminal states). DROP IF EXISTS + CREATE pattern. ENABLE/FORCE RLS already on from N2-1 (line 221-222 of foundation migration). NOT applied to production (T0/Owner gate). | `npx prisma validate` exits 0; `npx prisma migrate status` shows the new migration as pending (Tier 0 applies to production). | STOP if T0 has not authorized this slice's migration; the slice does NOT ship without Tier 0 authorization (per Tier 0 brief: "KHÔNG apply migration lên production" + "KHÔNG merge tự do"). |
| STEP-02 | `src/domains/applications/aff03-public-intake.service.ts` (new) | Orchestrator: read `hrp_aff` cookie from request cookies; `verifyAttributionToken`; if valid, `tx.referralAttribution.findUnique({ where: { id }, select: { id, referrerUserId, status, expiresAt } })`; server-clock guard: `status === 'ACTIVE' && expiresAt > now()`; if valid, pass `referralAttributionId` to `createCandidateSubmissionFromIntake`; return DTO without referrer fields. | E-01, E-02, E-03 | STOP if `verifyAttributionToken` is not exported from `src/domains/referrals/redirect-token.ts` (it is — confirmed at R7 baseline). |
| STEP-03 | `app/api/public/intake/route.ts` (new) | POST handler: read body (with existing `readCappedJson`), enforce `APPLY_IP` rate-limit (existing util), parse consent, call service, map errors, return DTO. Idempotency-Key (UUID) REQUIRED. | E-01, E-02, E-03, E-04 | STOP if anon transaction pattern cannot be applied (it can — `prisma.$transaction(async tx => ...)` matches `/api/public/jobs/[slug]/applications` legacy anon pattern). |
| STEP-04 | `src/domains/applications/aff03-public-intake.service.test.ts` (new) | Unit tests: cookie verify-fail paths; cookie verify-success path; missing cookie path; forged cookie path; expired cookie path; `findUnique` projection (`id`, `referrerUserId`, `status`, `expiresAt`); writer called with `referralAttributionId=null` when no cookie / forged / expired; writer called with `referralAttributionId=<id>` when valid; DTO never contains referrer fields; server-clock `expiresAt` guard; status guard. | E-01 | n/a |
| STEP-05 | `app/api/public/intake/route.test.ts` (new) | Route unit tests: zero-DB on rate-limit denial; 201 on success path (no cookie); 201 on success path (with valid cookie); 201 on forged cookie (silent fail-safe); 201 on expired cookie (silent fail-safe); 201 on `status!='ACTIVE'` cookie (silent fail-safe); 400 on missing Idempotency-Key; 400 on bad JSON; 413 on oversized body. | E-01 | n/a |
| STEP-06 | `tests/db/aff03-public-intake.integration.test.ts` (new) | Container-DB integration: full E2E apply with valid cookie → asserts `ReferralAttribution` `laborProfileId` set, `status=CONSUMED`, `consumedAt` non-null; `LaborProfileHandlingAssignment` row created with `source=AFF_INITIAL` and `assigneeUserId=referrerUserId`; anonymous direct apply (no cookie) → 201, no attribution mutation; forged cookie → 201, no attribution mutation; expired cookie → 201, no attribution mutation; `status!='ACTIVE'` cookie → 201, no attribution mutation; idempotency replay → same id, no second update. | E-05 | STOP if container DB is unavailable (CI lane is the source of truth). |
| STEP-07 | `app/api/public/intake/route.ts` (inline) | Idempotency: the route uses the existing `withIdempotency` util from `src/shared/integrity/idempotency.ts`. The handler is the same closure as N1 staff route — Idempotency-Key + requestBody fingerprint determine replay. Replay returns the prior response without re-invoking the writer, so `ReferralAttribution.consumedAt` cannot be overwritten on replay. | E-01 (route unit test asserts idempotency closure is wrapped) | n/a |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | `npx tsc --noEmit` exits 0 with zero diagnostics. | E-02 |
| AC-02 | `npm run lint` exits 0 with zero errors. | E-03 |
| AC-03 | `npx vitest run --config vitest.unit.config.ts` exits 0 with the **full** suite (existing + new tests) passing. | E-01 |
| AC-04 | `npm run build` exits 0; route table includes `ƒ /api/public/intake`. | E-04 |
| AC-05 | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` exits 0 against container-DB in CI Integration lane; 4 happy-path assertions + 3 forged + 3 missing-cookie + 3 replay + 2 DTO-no-PII = 15 assertions all PASS. | Command run in CI Integration lane; result captured in `evidence/integration-public-intake.txt`. |
| AC-06 | `git diff --name-only origin/main..HEAD` runs at the frozen SHA; output is matched against the explicit forbidden-path set (`schema.prisma`, `prisma/migrations/**`, `src/domains/talent/**`, `src/domains/referrals/**`, `app/api/jobs/apply/**`, `app/api/public/jobs/[slug]/applications/**`); result is "no overlap". | Command: `bash -c 'git diff --name-only origin/main..HEAD \| grep -E "schema.prisma\|prisma/migrations/\|src/domains/talent/\|src/domains/referrals/\|app/api/jobs/apply/\|app/api/public/jobs/\[slug\]/applications/" \| wc -l'` returns 0. Captured in `evidence/git-diff-scope.txt`. |
| AC-07 | `git grep -nE 'set_config\([^,]+,[^,]+,\s*false\s*\)\|pg_advisory_xact_lock' app/api/public/intake src/domains/applications/aff03-*.ts` returns zero matches. | Command: `bash -c 'git grep -nE "set_config\([^,]+,[^,]+,\s*false\s*\)\|pg_advisory_xact_lock" app/api/public/intake/ src/domains/applications/aff03-*.ts' \| wc -l` returns 0. Captured in `evidence/git-grep-static.txt`. |
| AC-08 | After integration test applies with valid cookie, `SELECT status, consumed_at, labor_profile_id FROM referral_attributions WHERE id=$1` returns `('CONSUMED', non-null, <lpId>)`; `SELECT source, assignee_user_id FROM labor_profile_handling_assignments WHERE labor_profile_id=$1` returns `('AFF_INITIAL', <referrerUserId>)`. | Integration assertion: exact SELECT in `tests/db/aff03-public-intake.integration.test.ts`; result captured in E-05. |
| AC-15 | Expired-attribution path: integration test seeds `ReferralAttribution` with `expires_at = now() - 1 day`, signs a valid cookie pointing to it, calls apply, asserts response 201, asserts `ReferralAttribution.status` UNCHANGED (`ACTIVE`), no `consumed_at`, no `LaborProfileHandlingAssignment` row created. | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts`; result in `evidence/integration-public-intake.txt`. |
| AC-16 | Non-active-status path: integration test seeds `ReferralAttribution` with `status='CONSUMED'` and `expires_at = now() + 30 days` (existing consumed row), signs a valid cookie pointing to it, calls apply, asserts response 201, asserts no `consumed_at` overwrite, asserts no second `LaborProfileHandlingAssignment` created. | `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts`; result in `evidence/integration-public-intake.txt`. |
| AC-09 | Forged cookie: integration test sets `hrp_aff` to a base64url payload with random gibberish HMAC (fails `timingSafeEqual`); calls apply; asserts response is 201; queries `SELECT status, consumed_at, labor_profile_id FROM referral_attributions WHERE id=$attrId` and asserts each field equals the pre-test value; queries `SELECT COUNT(*) FROM labor_profile_handling_assignments WHERE labor_profile_id IS NOT NULL` and asserts no new rows added in this test. | Container-DB integration test `tests/db/aff03-public-intake.integration.test.ts`; exact SQL listed; result captured in `evidence/integration-public-intake.txt`. |
| AC-10 | No-cookie path: integration test calls apply with NO `Cookie` header; asserts response is 201; queries `SELECT COUNT(*) FROM referral_attributions WHERE updated_at > $preTestTs` and asserts 0. | Container-DB integration test `tests/db/aff03-public-intake.integration.test.ts`; exact SQL listed; result captured in `evidence/integration-public-intake.txt`. |
| AC-11 | Replay: integration test calls apply with Idempotency-Key `K`, captures `candidateSubmissionId1` + `consumedAt1` from `referral_attributions`; calls apply again with same `K`, captures `candidateSubmissionId2` + `consumedAt2`; asserts `candidateSubmissionId1 === candidateSubmissionId2` and `consumedAt1.getTime() === consumedAt2.getTime()`. | Run `npx vitest run --config vitest.integration.config.ts tests/db/aff03-public-intake.integration.test.ts` in CI Integration lane; the assertion `expect(consumedAt1).toEqual(consumedAt2)` MUST pass; result captured in `evidence/integration-public-intake.txt`. |
| AC-12 | Unit test: `expect(Object.keys(result).sort()).toEqual(['candidateSubmissionId','laborProfileId','placementCaseId','verdict'].sort())` — assertion against exact key set; integration test: response body parsed and `expect(Object.keys(responseBody)).toEqual([...])` — same assertion against real HTTP response. | Both unit (`aff03-public-intake.service.test.ts`) and integration (`tests/db/aff03-public-intake.integration.test.ts`); results captured in E-01 and E-05. |
| AC-13 | Static grep on service file: `git grep -nE "referralAttribution\.(findUnique|update|delete)" src/domains/applications/aff03-public-intake.service.ts` shows only ONE `findUnique` with `select: { id, referrerUserId, status }` and ZERO `update`/`delete`. Captured in `evidence/git-grep-static.txt`. | Command in E-07; explicit SELECT projection shape grep. |
| AC-14 | `LIM-AFF-03-01`, `LIM-AFF-03-02`, `LIM-AFF-03-03` are present in TASK §4.4 AND referenced verbatim in HANDOFF §6; HANDOFF §6 contains an explicit "exit gate NOT green for staff-channel overlap clauses" statement. | Manual reviewer check; verifiable by grep against HANDOFF.md. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02 | AC-04, AC-12 |
| RQ-02 | STEP-01, STEP-02 | AC-08, AC-13 |
| RQ-03 | STEP-01 | AC-12, AC-13 |
| RQ-04 | STEP-01, STEP-03, STEP-04 | AC-09 |
| RQ-05 | STEP-07 | AC-11 |
| RQ-06 | STEP-01, STEP-04 | AC-10 |
| RQ-07 | STEP-01, STEP-03, STEP-04 | AC-12 |
| RQ-08 | STEP-01, STEP-07 | AC-13 |
| RQ-09 | STEP-02 | AC-15, AC-16 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | RLS posture: writer role SELECT on `referral_attributions` is BLOCKED under FORCE RLS. | **RESOLVED round 2 (Tier 0 verdict APPROVED)**: additive migration `20260918100000_aff03_writer_select_on_referral_attributions` adds `hrp_ra_select_writer` (SELECT `TO app_user_writer USING (status IN ('ACTIVE','CONSUMED'))`) + `hrp_ra_update_writer` (UPDATE `TO app_user_writer USING (status='ACTIVE') WITH CHECK (status='CONSUMED' AND labor_profile_id IS NOT NULL)`) — scoped to the minimum that the AFF-03 anon route needs. Drop-if-exists + Create = idempotent. ENABLE/FORCE RLS already on from N2-1 (line 221-222 of the foundation migration). |
| RISK-02 | The N1 writer's `existingAttr` guard (intake-writer.service.ts:130) silently skips consumption if a LaborProfile already has an attribution. In a race where two applicants click the same code in the same second, the writer may bind the second `LaborProfile` to a NEW attribution row (the original is consumed by the first) — but this is a separate question from attribution correctness, which is N2-1's authority. | Out of scope; documented in `LIM-AFF-03-03`. |
| RISK-03 | Forged cookie → silent no-op could mask a real attack in observability. | Mitigation: log at `info` level only, no referrer data in log; if observability needs visibility, add a separate metric in a follow-up slice. |
| RISK-04 | Idempotency replay: N1 writer's `existingAttr` guard means the second call's `referralAttributionId` is silently skipped (because the LaborProfile already has one). This is the correct semantic: replay returns the same result and does not re-consume. | Verified by AC-11; no mitigation needed. |

## 8. Open Questions

- **Q-01 (RESOLVED round 2 — APPROVED WITH CORRECTION)**: Tier 0 verdict on BLK-01:
  - **Status correction**: use `'ACTIVE'` and `'CONSUMED'` (correct `ReferralAttribution` enum values per `referral_attributions_status_check`); the original `(NEW, CONVERTED)` in round-1 proposal was wrong (those are `CandidateSubmission` statuses).
  - **Migration authorized**: one additive migration in this slice, idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
  - **Tier 0 also requested**: the apply flow MUST check `expires_at > now()` (server clock) BEFORE consuming; only consume `status='ACTIVE'`.
  - **LIM-AFF-03-01/02/03 ACCEPTED** per V6/aff_plan.md §14.1 clause 3 (recorded, not self-claimed green).
  - **Tier 0 production-gate**: T0/Owner applies migration; T1 does NOT apply to production. T1 does NOT merge to main without T0 verdict.
  - **Tier 0 scope expansion note**: the writer role also needs an UPDATE policy (`ACTIVE → CONSUMED` only) because the N1 intake writer calls `tx.referralAttribution.update` to consume the row. The existing `hrp_ra_update` is ADMIN-gated; under anon route (no GUC), `hrp_session_role()` returns NULL and `hrp_ra_update USING (hrp_session_role() = 'ADMIN')` denies. Tier 0's verdict authorized "MỘT migration additive cho policy này" (singular); this slice adds BOTH SELECT and UPDATE policies in the same migration, each additive, each scoped to the minimum needed. If T0 disagrees with the UPDATE policy inclusion, the SELECT policy alone is sufficient for the BLK-01 it was asked about; the UPDATE issue is then a follow-on escalation.
- **Q-02**: Should `LIM-AFF-03-01` be promoted to a same-PR test against the staff route, even though it crosses `talent/`? **Tier 1 position: NO — per V6/aff_plan.md §14.1 clause 3, the exit gate is moved to AFF-04 to keep AFF-03 clean. If Tier 0 disagrees, Tier 1 will absorb the test in a separate commit before resolve.**

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | READY_FOR_AUDIT (initial) | Initial contract per Tier 0 brief. LIM-* explicit per §4.4. No migration; no schema change; no forbidden-path writes. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-18 | Initial contract | Tier 0 brief `T1B / N2-2 → hrp-v6-n2-aff-03-apply-attribution`; baseline `4e6d0c1` (origin/main post-AFF-05A); LIM-* per V6/aff_plan.md §14.1 clause 3 |
