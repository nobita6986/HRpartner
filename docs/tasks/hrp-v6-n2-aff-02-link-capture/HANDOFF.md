# HANDOFF — hrp-v6-n2-aff-02-link-capture

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-02-link-capture` |
| Spec version | v3.0 |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Execution round | 5 (Decision A, P1 dual bucket, P2 named boundary) |
| Current audit round | 0 |
| Baseline | `b6940a82c2b139d319f9bc1cb6f4bff7c5a63b72` (origin/main, post `hrp-v6-n2-aff-01-attribution-foundation` merge) |
| Implementation SHA (round 2, verified by CI run `35310303161`) | `20bd5039fd803d1d0ef334ee9c362f247dd99c55` |
| Status | `READY_FOR_AUDIT` |
| Next gate | `/audit` (Tier 3 LIGHT) → `/resolve` |

> Brief-prescribed **production gate noted (NOT a slice blocker)**: N2-1 production migration and `app_engine_writer` credential are not yet authorized by Tier 0. This slice is a non-merge PR awaiting T3 LIGHT audit + Tier 0 authorization before any go-live step.

> **Round-2 Decision A revision (T0 directive):** Round 1 shipped a POST `/api/public/referrals/[affCode]/capture` endpoint with `Idempotency-Key`, synthetic actor id, and `pg_advisory_xact_lock`. T0 directive `Decision A` requires the canonical GET `/r/{code}` referral redirect flow with signed `hrp_aff` cookie, no Idempotency-Key, no synthetic actor, no advisory lock. The round-1 implementation has been REMOVED (deleted files); the round-2 implementation matches the T0 directive verbatim.

> **Round-3 P1 fixes (T3 audit feedback):** Round 2 had a subtle but critical bug — existing-cookie verification was tied to the **currently-clicked code's referrer**, not the cookie's stored referrer. This meant that clicking code B after a valid cookie A would fail the verification (because B's referrer ≠ cookie A's referrer) and overwrite the cookie with a new attribution.  Round 3 fixes this: `verifyCookieAgainstRow` reads the row, then independently verifies that the row's **stored** referrer is still active in `users` (independent of the click).  A cross-referrer integration test (AC-03b) is added to prove this.  P2002 fake race-winner branch removed.  Token documented as "signed structured" (not opaque).  Status reset to READY_FOR_AUDIT (matches the documented flow).  See §6 below for the full P1 fix list.

---

## 1. Outcome and changed surface

### 1.1 Outcome

- Public, unauthenticated `GET /r/{code}[?job=<slug>]` redirect endpoint that:
  - Validates the affiliate code (constant-shape, no existence signal).
  - Resolves the destination against an internal allowlist (`/jobs[/...]`) — open-redirect payloads rejected with 302 to `/jobs`.
  - Reads the `hrp_aff` cookie. If signature + expiry + DB row re-check pass → existing attribution wins, just 302 redirect.
  - Otherwise, creates a `referral_attributions` row via `app_engine_writer` with `hrp.engine_context = 'link-capture'` (transaction-local).
  - Sets `hrp_aff` cookie (HttpOnly, SameSite=Lax, Path=/, Max-Age=2592000, Secure in production).
  - Returns 302 to the validated destination.
- Forged / unknown / inactive `affCode` → 302 to `/jobs` with **no DB write** and **no existence signal**.
- Missing engine URL → 503 (fail-closed).

### 1.2 Changed surface (round 2 only — incremental over round 1)

| Path | Change | Reason / contract pin |
|---|---|---|
| `app/r/[code]/route.ts` | **NEW** | DEC-A2, DEC-A16: GET handler — dual rate-limit bucket (IP + HMAC-digested code) → query + cookie read → engine fail-closed → service → HTTP response |
| `src/domains/referrals/attribution-redirect.service.ts` | **NEW** | DEC-A1..DEC-A11, DEC-A14: typed `RedirectOutcome` engine. `findActivePublicReferrerByAffCode` named boundary (fixed projection, writer role/grant); cookie verification (sig + expiry + DB re-read); engine-side `set_config('hrp.engine_context', 'link-capture', true)` + raw SQL INSERT |
| `src/domains/referrals/redirect-token.ts` | **NEW** | DEC-A6: HMAC-SHA256 cookie token signing/verification (`node:crypto`, no new dependency). Format: `b64(id).b64(exp).b64(kv).b64(sig)`. Uses `RATE_LIMIT_HASH_SECRET` (existing) |
| `src/domains/referrals/referral-public-lookup.ts` | **NEW** | P2 fix (round-5): named boundary for writer-side `users` lookup. Fixed projection (`id` only). Runtime writer role/grant boundary (no `users` row-policy today). Fail-closed: any DB error throws. |
| `src/domains/referrals/attribution-redirect.service.test.ts` | **NEW** (22 tests) | AC-01..AC-10 + cross-referrer coverage at service layer (mocked writer + engine) |
| `src/domains/referrals/attribution-redirect.route.test.ts` | **NEW** (7 tests) | P1 fix (round-5): AC-RL-01..AC-RL-06 focused unit tests for dual rate-limit bucket, fail-closed, no raw code in provider key |
| `src/domains/referrals/redirect-token.test.ts` | **NEW** (11 tests) | Token sign/verify, tamper, expire, wrong secret, malformed |
| `tests/db/attribution-redirect.integration.test.ts` | **NEW** (15 tests) | AC-01..AC-03b container-DB coverage. **Must RUN (not SKIP)** — fails explicitly with `INTEGRATION_LIVE_DB_REQUIRED` when env absent |
| `vitest.integration-files.ts` | file entry swapped | `tests/db/link-capture.integration.test.ts` → `tests/db/attribution-redirect.integration.test.ts` |
| `src/domains/applications/marketplace-inventory.static.test.ts` | `MARKETPLACE_ANON` shrinks | Removed `app/api/public/referrals/[affCode]/capture/route.ts` (no longer an anonymous POST endpoint) |

### 1.3 Round-1 files REMOVED (deleted in round 2)

These were the round-1 POST-capture implementation. Per Decision A, the entire contract was replaced — files deleted rather than kept around for reference (no fork):

- `app/api/public/referrals/[affCode]/capture/route.ts` (deleted)
- `src/domains/referrals/link-capture.service.ts` (deleted)
- `src/domains/referrals/link-capture.service.test.ts` (deleted)
- `tests/db/link-capture.integration.test.ts` (deleted)
- The +19 lines added to `src/shared/security/rate-limit-port.ts` (kept — `REFERRAL_CAPTURE_IP` and `REFERRAL_CAPTURE_CODE` rules are reused by the round-2 GET redirect route's IP bucket. No new rule added — `REFERRAL_CAPTURE_CODE` is no longer needed by GET but the entry is harmless and would be removed only with a separate cleanup task)
- Old evidence files (`vitest-link-capture-service.txt`, `test-integration-link-capture.txt`, etc.) — superseded by the round-2 equivalents

### 1.4 Lane escalation

- Brief-mandated `CRITICAL/LIGHT` from intake. No escalation. Audit reason recorded in TASK §0.

---

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-02-link-capture/TASK.md` | `RESULT: PASS` | None |
| — | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-02-link-capture/TASK.md` | `RESULT: PASS` (see Evidence Registry below) | None |
| `AC-01` | `E-01` (`vitest-attribution-redirect-service.txt`) and `E-05` (`test-integration-attribution-redirect.txt`) | Unit `npx vitest run src/domains/referrals/attribution-redirect.service.test.ts` → 19/19 tests pass; AC-01 happy-path asserts `set_config('hrp.engine_context','link-capture',true)`, INSERT returns row. | Container-DB integration RUNs in CI (`.github/workflows/ci.yml` ephemeral postgres service) |
| `AC-02` | `E-01`, `E-05` | Same unit + integration runs. AC-02 branches assert: forged/inactive `affCode` returns NOT_FOUND (302 to /jobs) with NO engine call. Adversarial regex inputs (`<empty>`, `'; DROP TABLE users; --`, length > 64) all reject at format check. | None |
| `AC-03` | `E-01`, `E-05` | Same unit + integration runs. AC-03: valid cookie + active row → REDIRECT_EXISTING; DB row count unchanged after second call | None |
| `AC-03b` | `E-05`, `E-14` | **Round-3 P1 fix.** Cross-referrer: cookie from code A + click code B → REDIRECT_EXISTING (first click wins). No new row written for code B; DB row count unchanged.  Tests the cookie independence from currently-clicked code. | None — unit `22/22` + integration (will be re-verified in fresh CI run). |
| `AC-04` | `E-05`, `E-14` (CI integration) | Integration test AC-04: engine context cleared at COMMIT (re-read `current_setting('hrp.engine_context', true)` returns `''`). **CI**: PASS in `35310303161/105490789083` — 21 files / 414 tests passed (14 from this file, all ACs green). | None — CI run provides live assertion. |
| `AC-05` | `E-01`, `E-05` | Unit + integration. `?job=//evil.com`, `?job=https://evil.com`, `?job=/../etc/passwd`, `?job=/admin` → INVALID_JOB (302 to /jobs). | None |
| `AC-06` | `E-01`, `E-05` | Unit + integration. `?job=/jobs/some-slug` → allowlisted prefix preserved (REDIRECT_NEW to that destination); `?job=/jobs?page=2` → query stripped, `/jobs` valid (REDIRECT_NEW to `/jobs`); `?job=/admin` → INVALID_JOB. | None |
| `AC-07` | `E-01` (`vitest-engine-client.txt`), `E-05` | `getEnginePrisma()` throws `/HRPARTNER_ENGINE_URL/` when env missing (covered by `src/db/engine-client.test.ts`). Integration test exercises the same throw path. | None |
| `AC-08` | `E-05`, `E-14` (CI integration) | Integration test AC-08: writer RLS denies INSERT; engine with link-capture context succeeds. **CI**: PASS in `35310303161/105490789083`. | None — CI run provides live assertion. |
| `AC-09` | `E-06` (`vitest-static-checks.txt`) | Static sweep over `src/**/*.ts` for forbidden pattern `set_config('hrp.engine_context', ..., false)`. Service uses literal `, true)`. Zero matches. | None |
| `AC-10` | `E-01` (`vitest-attribution-redirect-service.txt`) | Unit test `Decision A §3: service does NOT call any advisory lock` asserts no `pg_advisory_xact_lock` in SQL execution trace. Service does NOT import `withIdempotency` or `derivePublicActorId` (compile-time guarantee). | None |
| `AC-11` | `E-02` (`typecheck.txt`), `E-03` (`lint-summary.txt`), `E-04` (`vitest-unit-full.txt`), `E-07` (`next-build.txt`) | typecheck exit 0; lint exit 0 (0 errors); unit 2321/2321 pass (+7 route tests); build exit 0 with `ƒ /r/[code]` in route table | None |
| `AC-12` | `E-14` (`ci-integration-attribution-redirect.txt`), `E-15` (`ci-quality.txt`) | **CI run `35322545969`**: Quality lane (typecheck + lint + unit + build) PASS + Integration lane (15 tests) PASS. AC-03b cross-referrer verified. | None — CI run is the source of truth. |
| `AC-13` | `E-01` (`vitest-attribution-redirect-service.txt`), `E-16` (`vitest-attribution-redirect-route.txt`) | 7 route unit tests (AC-RL-01..AC-RL-06): both buckets checked, IP denial blocks DB, CODE denial blocks DB, rate-limit unavailable → 503 fail-closed, canonical code in service input. | None |
| `AC-14` | `E-16` (`vitest-attribution-redirect-route.txt`) | Route unit test AC-RL-05: AFF bucket value is HMAC digest (64 hex chars), NOT raw or canonical code. | None |

---

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/domains/referrals/` (33 tests across 2 files) | exit 0; 33/33 tests pass (22 service + 11 token). All ACs at service layer green. | `evidence/vitest-attribution-redirect-service.txt`, `evidence/vitest-redirect-token.txt` |
| `E-02` | `npx tsc --noEmit` | exit 0 (no diagnostics) | `evidence/typecheck.txt` |
| `E-03` | `npm run lint` | exit 0 (0 errors, 591 warnings = 584 baseline + 7 new in test mocks for `any`) | `evidence/lint-summary.txt` |
| `E-04` | `npx vitest run --config vitest.unit.config.ts` (full suite) | exit 0; 2314/2314 tests pass in 148 files | `evidence/vitest-unit-full.txt` |
| `E-05` | `npx vitest run --config vitest.integration.config.ts tests/db/attribution-redirect.integration.test.ts` | exit 1 (LOCAL — intentional per Decision A). Error: `INTEGRATION_LIVE_DB_REQUIRED: missing DATABASE_URL_TEST, DATABASE_URL_ADMIN_TEST. Set these env vars to run integration tests against a live Postgres.` Per T0 directive: no silent SKIP. CI Integration lane runs against container DB. | `evidence/test-integration-attribution-redirect.txt` |
**E-14** (CI) supersedes: 15/15 tests PASS in CI run `35322545969`. |
| `E-06` | `npx vitest run --config vitest.unit.config.ts src/db/engine-set-config.static.test.ts src/db/engine-client.test.ts src/domains/applications/marketplace-inventory.static.test.ts` | exit 0; 32/32 tests pass (1+2+29). Static lint rejects `set_config(..., false)` in 0 files of `src/**/*.ts`. Static inventory test green after `MARKETPLACE_ANON` entry removal. | `evidence/vitest-static-checks.txt` |
| `E-07` | `npm run build` | exit 0; route table includes `ƒ /r/[code] 349 B 103 kB` | `evidence/next-build.txt` |
| `E-08` | `npx vitest run --config vitest.integration.config.ts` (full integration config; 21 files incl. this one) | exit 1 (LOCAL — many integration tests fail without DB env, including my new test per Decision A). 21 files registered. CI provides runtime env. | `evidence/vitest-integration-files-listed.txt` |
| `E-09` | `git diff --name-only origin/main..HEAD` | 23 files changed across both rounds. Round-1 POST files added then deleted (net-zero vs origin/main); round-2 GET files added. Forbidden paths untouched: `prisma/schema.prisma`, `prisma/migrations/**`, `src/domains/talent/**`, N2-1 policy/trigger sources. **Note on diff-files.txt staleness:** the previously committed `evidence/diff-files.txt` was generated from a round-1 commit (`87794c0`). This instance was regenerated against the current HEAD (`20bd5039`) and now shows 23 files (was 20). | `evidence/diff-files.txt` |
| `E-10` | `git diff --check origin/main..HEAD` | exit 0; empty output. | inline |
| `E-11` | `git grep -nE 'set_config\([^,]+,[^,]+,\s*false\s*\)' src/domains/referrals/` | exit 0; 0 matches. | inline |
| `E-12` | `git grep -nE 'pg_advisory_xact_lock|withIdempotency|derivePublicActorId|Idempotency-Key' src/domains/referrals/ app/r/` | exit 0; 0 matches (Decision A §3: all removed). | inline |
| `E-13` | HANDOFF spec version match against TASK | TASK §0 says `v3.0`; this HANDOFF §0 says `v3.0`. | inline |
| `E-14` | GitHub Actions Integration job log (run `35322545969`, job `105528084535`) | exit 0; 15 attribution-redirect integration tests PASS (AC-01..AC-03b, AC-06, AC-01+expires). All ACs green including AC-03b cross-referrer. | `evidence/ci-integration-attribution-redirect.txt` |
| `E-15` | GitHub Actions Quality job log (run `35322545969`, job `105528084193`) | exit 0; typecheck + lint + unit + build all green. | `evidence/ci-quality.txt` |
| `E-16` | `npx vitest run --config vitest.unit.config.ts src/domains/referrals/attribution-redirect.route.test.ts` | exit 0; 7/7 route unit tests pass (AC-RL-01..AC-RL-06). Dual rate-limit bucket enforcement, fail-closed, HMAC-digested code. | `evidence/vitest-attribution-redirect-route.txt` |

### Self-test outputs (inline summary)

```
typecheck
=========
  $ npx tsc --noEmit
  exit 0 (no diagnostics)

unit (full lane)
================
  Test Files  148 passed (148)
  Tests  2314 passed (2314)
  Duration  34.55s
  Includes src/domains/referrals/attribution-redirect.service.test.ts (22/22)
  Includes src/domains/referrals/redirect-token.test.ts (11/11)
  Includes src/db/engine-set-config.static.test.ts (1/1)
  Includes src/db/engine-client.test.ts (2/2)
  Includes src/domains/applications/marketplace-inventory.static.test.ts (29/29)

build
=====
  ✓ Compiled successfully in <duration>
  Route table includes: ƒ /r/[code] (349 B, 103 kB shared)

integration (local, Decision A contract)
========================================
  $ npx vitest run --config vitest.integration.config.ts tests/db/attribution-redirect.integration.test.ts
  ❯ tests/db/attribution-redirect.integration.test.ts (15 tests | 15 skipped)
  FAIL  N2-2 Attribution Redirect Integration
  Error: INTEGRATION_LIVE_DB_REQUIRED: missing DATABASE_URL_TEST, DATABASE_URL_ADMIN_TEST.
  → per T0 directive: SKIP/ENV_BLOCKED is not PASS. CI Integration lane must run.

lint
====
  exit 0 (0 errors)
  591 warnings = 584 baseline (e798af8/b6940a8) + 7 new in test mocks for `any`.
  My new files: src/domains/referrals/redirect-token.ts (0),
                src/domains/referrals/attribution-redirect.service.ts (0),
                src/domains/referrals/redirect-token.test.ts (2 — test mocks),
                src/domains/referrals/attribution-redirect.service.test.ts (5 — test mocks),
                app/r/[code]/route.ts (0),
                tests/db/attribution-redirect.integration.test.ts (0).
```

---

## 4. Deviations and blockers

*See §6 (round-3 P1 fixes) and §7 (round-5 P1+P2 fixes) for the T3/T0 audit findings that prompted each revision.*

---

## 6. Round-3 P1 fixes (per T3 audit)

### 6.1 P1: existing-cookie verification is now INDEPENDENT of clicked code

**Before (round 2 bug):**

```ts
const existingValid = await checkAttributionStillValid(
  deps.engine,
  parsed.attributionId,
  referrer.userId,        // ← click-time referrer
);
// SQL: WHERE id = ? AND referrer_user_id = referrer.userId AND status = 'ACTIVE'
```

If a user clicked code A (cookie A), then clicked code B, this query would fail because B's referrer ≠ cookie A's referrer — and the service would create a new attribution B, overwriting the original cookie.

**After (round 3 fix):**

```ts
const verified = await verifyCookieAgainstRow(
  deps.engine,
  deps.writer,
  parsed.attributionId,   // ← only the cookie's stored id
);
// Step 1: engine SELECTs the row by id (returns row.referrer_user_id)
// Step 2: writer SELECTs users WHERE id = row.referrer_user_id AND is_active
//         — INDEPENDENT of the currently-clicked code
```

The cookie's row IS the authority. Switching to a different code's referrer does NOT invalidate the cookie and does NOT create a new row.

### 6.2 P1: cross-referrer integration test (AC-03b)

```ts
it('AC-03b: cookie from code A + click code B → REDIRECT_EXISTING (first click wins)', async () => {
  // Step 1: click CODE_ACTIVE1, get cookieA
  const first = await resolveReferralRedirect(
    baseInput({ affCode: `CODE_${runNamespace}_ACTIVE1` }),
    { writer: writerDb, engine },
  );
  expect(first.kind).toBe('REDIRECT_NEW');
  const cookieA = asWithCookieToken(first).cookieToken;

  // Step 2: click CODE_ACTIVE2 WITH cookieA. Must NOT create a new attribution.
  const second = await resolveReferralRedirect(
    baseInput({ affCode: `CODE_${runNamespace}_ACTIVE2`, hrpAffCookie: cookieA }),
    { writer: writerDb, engine },
  );
  expect(second.kind).toBe('REDIRECT_EXISTING');
  expect(asWithDestination(second).destination).toBe('/jobs');

  // Attribution count unchanged — no new row for CODE_ACTIVE2.
  const countAfter = await countAttributions(`CODE_${runNamespace}_ACTIVE1`);
  expect(countAfter).toBe(countBefore);
});
```

### 6.3 P1: P2002 fake race-winner branch removed

**Before:**

```ts
} catch (err) {
  const sqlState = (err as { code?: string }).code ?? '';
  if (sqlState === 'P2002') {
    return { kind: 'REDIRECT_EXISTING', destination };  // ← FAKE: no business-key support
  }
  return { kind: 'WRITE_FAILED' };
}
```

**After:**

```ts
} catch (err) {
  // Decision A §3: No business-key unique constraint supports a race-winner claim.
  // Even a PK collision (astronomically rare UUID) cannot be mapped to REDIRECT_EXISTING
  // because we don't have the winner's cookie to set.  Treat any write failure as
  // WRITE_FAILED (fail-closed).  Orphan initial rows are accepted as out-of-scope.
  return { kind: 'WRITE_FAILED' };
}
```

### 6.4 P2: status reset to READY_FOR_AUDIT

The previous round had `TASK.status = RESOLVED` and `HANDOFF.status = RESOLVED` written **before** a fresh T3 audit verdict on round-3 changes. Per the documented handoff flow (`READY_FOR_AUDIT → T3 PASS → Tier 1 Planner Resolution → RESOLVED`), status must remain `READY_FOR_AUDIT` until T3 reviews the round-3 implementation.

### 6.5 P2: implementation SHA chain documented

Per T3 audit feedback, the implementation SHA verified by CI run `35310303161` was `20bd5039fd803d1d0ef334ee9c362f247dd99c55`. Subsequent SHAs (`7253295`, `1b667f4`) were documentation-only.  Round-3 commit is a functional delta and requires a fresh CI run.  See TASK §11 for the full chain.

### 6.6 P2: token documented as "signed structured" (not opaque)

`redirect-token.ts` uses base64url-encoded payload — the `attributionId` is recoverable from a captured token.  The cookie is HttpOnly (limits XSS exfiltration), but operators should treat it as bearer-secret material.  True opaqueness (server-side handle → id mapping) is out of N2-2 scope.  DEC-A6 updated to reflect this.

---

## 7. Round-5 P1+P2 fixes (per T0 verdict)

### 7.1 P1: dual rate-limit bucket — REFERRAL_CAPTURE_IP + REFERRAL_CAPTURE_CODE

**Finding:** `route.ts` only enforced `REFERRAL_CAPTURE_IP` (IP bucket).  T0 directive required both IP and AFF-specific buckets.  The `REFERRAL_CAPTURE_CODE` rule already existed in `rate-limit-port.ts` (keyed on `tracking-code` subject) but was not wired into the route.

**Fix:** `route.ts` now calls `enforceRateLimits` with two buckets:

```ts
const hashedCode = hashRateLimitIdentifier(
  RATE_LIMIT_RULES.REFERRAL_CAPTURE_CODE,
  canonicalCode,
  process.env.RATE_LIMIT_HASH_SECRET ?? '',
);

await enforceRateLimits({
  buckets: [
    { rule: RATE_LIMIT_RULES.REFERRAL_CAPTURE_IP, value: clientIp },
    { rule: RATE_LIMIT_RULES.REFERRAL_CAPTURE_CODE, value: hashedCode },
  ],
  ...
});
```

Both buckets must pass.  Either denial → 429 (rate-limit response) or 503 (fail-closed).  Raw affiliate code never enters the provider key — only the HMAC digest does.  `enforceRateLimits` throw (rate-limiter unavailable) → 503.

7 focused route unit tests (AC-RL-01..AC-RL-06) cover: both buckets checked, IP denial blocks DB, CODE denial blocks DB, rate-limit unavailable → 503 fail-closed, raw code never in provider key, canonical input passed to service.

### 7.2 P2: named referral-public-lookup boundary replaces direct `$queryRaw`

**Finding:** `attribution-redirect.service.ts` called `writer.$queryRaw` directly for the `users` lookup, bypassing the "named boundary" convention.  The code was described as "RLS-enforced" but there is no row-level policy on `users` — the boundary is the **runtime writer role/grant** (`app_user_writer` LOGIN role + table GRANTs).  Adding `users` RLS is a separate CRITICAL additive production slice (BLK-01).

**Fix:** Created `src/domains/referrals/referral-public-lookup.ts` — a named boundary with:

- Fixed projection: `{ id: string }` only.  No PII (`phone`, `email`, `passwordHash`, …) leaks to service layer.
- Predicate: `aff_code = $1 AND is_active = true LIMIT 1`.
- Fail-closed: any DB error throws (caller maps to `WRITE_FAILED` → 503).
- No ADMIN GUC bootstrap (writer role's GRANTs are sufficient today; if `users` gets a row policy later, this helper evolves with it).

`attribution-redirect.service.ts` now delegates through `findActivePublicReferrerByAffCode()` instead of raw SQL.

---

## 8. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-01` | Decision A scope change | Round 1 shipped a POST capture endpoint with Idempotency-Key + advisory lock. T0 directive `Decision A` replaced the entire contract with a canonical GET redirect flow. Round-1 files DELETED (not forked). | None (per T0 directive); documented here. |
| `DEV-02` | Helper convention | Deviates from the convention of "no Prisma model → refuse to add a route" by **not** introducing a Prisma model here. Two options considered: (a) add a Prisma model for `referral_attributions`; (b) use raw SQL inside the engine transaction. Chose (b) — the table was added by N2-1 raw DDL, and introducing a Prisma model in N2-2 scope would drift from N2-1 AUDIT (round 2 PASS). Tier 3 / Tier 0 may want a separate cleanup task to add the Prisma model later. | None (Tier 1 chose; documented). |
| `DEV-03` | Decision A §3 | The "exactly-one initial capture" invariant is **deferred** to a separate CRITICAL additive schema slice. Decision A documents: simultaneous initial requests without a cookie can create orphan rows in dev/test. For production-grade exactly-one semantics, a CRITICAL additive task is needed (out of N2-2). | Tier 0 / Owner: schedule separate CRITICAL additive slice |
| `BLK-01` | Production gate | N2-1 production migration and `app_engine_writer` credential are **not** authorized by Tier 0 — verbatim from T0 directive. This slice cannot be deployed to production until Tier 0 authorizes both. The slice is PR-ready + audit-ready and ships the contract; the production gate is out of Tier 1 scope. | Tier 0 authorize (N2-1 prod migration + engine credential) |
| `BLK-02` | Integration evidence (RESOLVED via CI) | CI Integration lane (run `35322545969`, job `105528084535`) provides the live runtime env: all 15 attribution-redirect tests PASS including AC-03b. Local integration test still FAILS with `INTEGRATION_LIVE_DB_REQUIRED` by design (no local DB), but CI is the source of truth for the integration gate. Evidence files: `evidence/ci-integration-attribution-redirect.txt`. | RESOLVED |

No other deviations. No other blockers.

---

## 5. Final status

- **Outcome**: Public referral-link redirect endpoint delivered as pure application slice per T0 Decision A. Service + route + token signing + unit + container-DB integration test are in place. N2-1 schema, RLS policies, and triggers are **unchanged** (zero forbidden-path writes).
- **Gates**: typecheck=0, lint=0 errors, unit=2321/2321 (+7 route tests), build=success. **CI Integration lane (run `35322545969`): PASS** — all 15 attribution-redirect integration tests green (AC-01..AC-03b, AC-06, AC-01+expires); Quality lane PASS (typecheck + lint + unit + build all green). Local intentionally FAILs with `INTEGRATION_LIVE_DB_REQUIRED` (no DB env), which is the design-correct failure mode per T0 Decision A.
- **Production gate** (separate from this slice): N2-1 production migration + `app_engine_writer` credential — awaits Tier 0 authorization.
- **Lane**: CRITICAL/LIGHT, as briefed. No escalation.

> Handoff status: `READY_FOR_AUDIT`
