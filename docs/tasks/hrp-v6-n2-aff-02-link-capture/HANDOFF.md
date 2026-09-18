# HANDOFF — hrp-v6-n2-aff-02-link-capture

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-02-link-capture` |
| Spec version | v3.0 |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Execution round | 2 (round 2 = Decision A revision per T0 directive) |
| Current audit round | 0 |
| Baseline | `b6940a82c2b139d319f9bc1cb6f4bff7c5a63b72` (origin/main, post `hrp-v6-n2-aff-01-attribution-foundation` merge) |
| Status | `RESOLVED` |
| Next gate | `/audit` (Tier 3 LIGHT) → `/resolve` |

> Brief-prescribed **production gate noted (NOT a slice blocker)**: N2-1 production migration and `app_engine_writer` credential are not yet authorized by Tier 0. This slice is a non-merge PR awaiting T3 LIGHT audit + Tier 0 authorization before any go-live step.

> **Round-2 Decision A revision (T0 directive):** Round 1 shipped a POST `/api/public/referrals/[affCode]/capture` endpoint with `Idempotency-Key`, synthetic actor id, and `pg_advisory_xact_lock`. T0 directive `Decision A` requires the canonical GET `/r/{code}` referral redirect flow with signed `hrp_aff` cookie, no Idempotency-Key, no synthetic actor, no advisory lock. The round-1 implementation has been REMOVED (deleted files); the round-2 implementation matches the T0 directive verbatim.

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
| `app/r/[code]/route.ts` | **NEW** | DEC-A2, DEC-A16: GET handler — rate-limit (IP bucket only) → query + cookie read → engine fail-closed → service → HTTP response |
| `src/domains/referrals/attribution-redirect.service.ts` | **NEW** | DEC-A1..DEC-A11, DEC-A14: typed `RedirectOutcome` engine. Writer-side RLS-enforced `User.affCode` lookup; cookie verification (sig + expiry + DB re-read); engine-side `set_config('hrp.engine_context', 'link-capture', true)` + raw SQL INSERT |
| `src/domains/referrals/redirect-token.ts` | **NEW** | DEC-A6: HMAC-SHA256 cookie token signing/verification (`node:crypto`, no new dependency). Format: `b64(id).b64(exp).b64(kv).b64(sig)`. Uses `RATE_LIMIT_HASH_SECRET` (existing) |
| `src/domains/referrals/attribution-redirect.service.test.ts` | **NEW** (19 tests) | AC-01..AC-10 coverage at service layer (mocked writer + engine) |
| `src/domains/referrals/redirect-token.test.ts` | **NEW** (11 tests) | Token sign/verify, tamper, expire, wrong secret, malformed |
| `tests/db/attribution-redirect.integration.test.ts` | **NEW** (14 tests) | AC-01..AC-08 container-DB coverage. **Must RUN (not SKIP)** — fails explicitly with `INTEGRATION_LIVE_DB_REQUIRED` when env absent |
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
| `AC-04` | `E-05`, `E-14` (CI integration) | Integration test AC-04: engine context cleared at COMMIT (re-read `current_setting('hrp.engine_context', true)` returns `''`). **CI**: PASS in `35310303161/105490789083` — 21 files / 414 tests passed (14 from this file, all ACs green). | None — CI run provides live assertion. |
| `AC-05` | `E-01`, `E-05` | Unit + integration. `?job=//evil.com`, `?job=https://evil.com`, `?job=/../etc/passwd`, `?job=/admin` → INVALID_JOB (302 to /jobs). | None |
| `AC-06` | `E-01`, `E-05` | Unit + integration. `?job=/jobs/some-slug` → allowlisted prefix preserved (REDIRECT_NEW to that destination); `?job=/jobs?page=2` → query stripped, `/jobs` valid (REDIRECT_NEW to `/jobs`); `?job=/admin` → INVALID_JOB. | None |
| `AC-07` | `E-01` (`vitest-engine-client.txt`), `E-05` | `getEnginePrisma()` throws `/HRPARTNER_ENGINE_URL/` when env missing (covered by `src/db/engine-client.test.ts`). Integration test exercises the same throw path. | None |
| `AC-08` | `E-05`, `E-14` (CI integration) | Integration test AC-08: writer RLS denies INSERT; engine with link-capture context succeeds. **CI**: PASS in `35310303161/105490789083`. | None — CI run provides live assertion. |
| `AC-09` | `E-06` (`vitest-static-checks.txt`) | Static sweep over `src/**/*.ts` for forbidden pattern `set_config('hrp.engine_context', ..., false)`. Service uses literal `, true)`. Zero matches. | None |
| `AC-10` | `E-01` (`vitest-attribution-redirect-service.txt`) | Unit test `Decision A §3: service does NOT call any advisory lock` asserts no `pg_advisory_xact_lock` in SQL execution trace. Service does NOT import `withIdempotency` or `derivePublicActorId` (compile-time guarantee). | None |
| `AC-11` | `E-02` (`typecheck.txt`), `E-03` (`lint-summary.txt`), `E-04` (`vitest-unit-full.txt`), `E-07` (`next-build.txt`) | typecheck exit 0; lint exit 0 (0 errors, 591 warnings = 584 baseline + 7 new in test mocks for `any`); unit 2311/2311 pass (up from 2301: +30 = +19 service + +11 token + adjustment); build exit 0 with `ƒ /r/[code] 349 B 103 kB` in route table | None |
| `AC-12` | `E-14` (`ci-integration-attribution-redirect.txt`), `E-15` (`ci-quality.txt`) | **CI**: PASS in run `35310303161` — Quality lane (typecheck + lint + unit + build) ✓ + Integration lane (DB tests · fail-closed) ✓. Test Files: 21 passed (21); Tests: 414 passed + 2 skipped (416). All 14 attribution-redirect integration tests pass (AC-01..AC-08, AC-04 + expires, AC-07, plus the two extra `invalid job` cases). Vercel deployment ✓. Local intentionally FAILs with `INTEGRATION_LIVE_DB_REQUIRED` (no DB env). | None — CI run is the source of truth. |

---

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/domains/referrals/` (30 tests across 2 files) | exit 0; 30/30 tests pass (19 service + 11 token). All ACs at service layer green. | `evidence/vitest-attribution-redirect-service.txt`, `evidence/vitest-redirect-token.txt` |
| `E-02` | `npx tsc --noEmit` | exit 0 (no diagnostics) | `evidence/typecheck.txt` |
| `E-03` | `npm run lint` | exit 0 (0 errors, 591 warnings = 584 baseline + 7 new in test mocks for `any`) | `evidence/lint-summary.txt` |
| `E-04` | `npx vitest run --config vitest.unit.config.ts` (full suite) | exit 0; 2311/2311 tests pass in 148 files (62.47s) | `evidence/vitest-unit-full.txt` |
| `E-05` | `npx vitest run --config vitest.integration.config.ts tests/db/attribution-redirect.integration.test.ts` | exit 1 (LOCAL — intentional per Decision A). Error: `INTEGRATION_LIVE_DB_REQUIRED: missing DATABASE_URL_TEST, DATABASE_URL_ADMIN_TEST. Set these env vars to run integration tests against a live Postgres.` Per T0 directive: no silent SKIP. CI Integration lane runs against container DB. | `evidence/test-integration-attribution-redirect.txt` |
| `E-06` | `npx vitest run --config vitest.unit.config.ts src/db/engine-set-config.static.test.ts src/db/engine-client.test.ts src/domains/applications/marketplace-inventory.static.test.ts` | exit 0; 32/32 tests pass (1+2+29). Static lint rejects `set_config(..., false)` in 0 files of `src/**/*.ts`. Static inventory test green after `MARKETPLACE_ANON` entry removal. | `evidence/vitest-static-checks.txt` |
| `E-07` | `npm run build` | exit 0; route table includes `ƒ /r/[code] 349 B 103 kB` | `evidence/next-build.txt` |
| `E-08` | `npx vitest run --config vitest.integration.config.ts` (full integration config; 21 files incl. this one) | exit 1 (LOCAL — many integration tests fail without DB env, including my new test per Decision A). 21 files registered. CI provides runtime env. | `evidence/vitest-integration-files-listed.txt` |
| `E-09` | `git diff --name-only origin/main..HEAD` | 23 files changed across both rounds. Round-1 POST files added then deleted (net-zero vs origin/main); round-2 GET files added. Forbidden paths untouched: `prisma/schema.prisma`, `prisma/migrations/**`, `src/domains/talent/**`, N2-1 policy/trigger sources. **Note on diff-files.txt staleness:** the previously committed `evidence/diff-files.txt` was generated from a round-1 commit (`87794c0`). This instance was regenerated against the current HEAD (`20bd5039`) and now shows 23 files (was 20). | `evidence/diff-files.txt` |
| `E-10` | `git diff --check origin/main..HEAD` | exit 0; empty output. | inline |
| `E-11` | `git grep -nE 'set_config\([^,]+,[^,]+,\s*false\s*\)' src/domains/referrals/` | exit 0; 0 matches. | inline |
| `E-12` | `git grep -nE 'pg_advisory_xact_lock|withIdempotency|derivePublicActorId|Idempotency-Key' src/domains/referrals/ app/r/` | exit 0; 0 matches (Decision A §3: all removed). | inline |
| `E-13` | HANDOFF spec version match against TASK | TASK §0 says `v3.0`; this HANDOFF §0 says `v3.0`. | inline |
| `E-14` | GitHub Actions Integration job log (run `35310303161`, job `105490789083`) | exit 0; 21 integration test files passed (414 tests + 2 skipped). All 14 attribution-redirect tests green (AC-01..AC-08 + AC-04 + expires + AC-07 + 2 invalid-job variants). | `evidence/ci-integration-attribution-redirect.txt` |
| `E-15` | GitHub Actions Quality job log (run `35310303161`, job `105490788848`) | exit 0; typecheck + lint + unit + build all green. Quality lane verifies the same gates as local CI. | `evidence/ci-quality.txt` |

### Self-test outputs (inline summary)

```
typecheck
=========
  $ npx tsc --noEmit
  exit 0 (no diagnostics)

unit (full lane)
================
  Test Files  148 passed (148)
  Tests  2311 passed (2311)
  Duration  62.47s
  Includes src/domains/referrals/attribution-redirect.service.test.ts (19/19)
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
  ❯ tests/db/attribution-redirect.integration.test.ts (14 tests | 14 skipped)
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

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-01` | Decision A scope change | Round 1 shipped a POST capture endpoint with Idempotency-Key + advisory lock. T0 directive `Decision A` replaced the entire contract with a canonical GET redirect flow. Round-1 files DELETED (not forked). | None (per T0 directive); documented here. |
| `DEV-02` | Helper convention | Deviates from the convention of "no Prisma model → refuse to add a route" by **not** introducing a Prisma model here. Two options considered: (a) add a Prisma model for `referral_attributions`; (b) use raw SQL inside the engine transaction. Chose (b) — the table was added by N2-1 raw DDL, and introducing a Prisma model in N2-2 scope would drift from N2-1 AUDIT (round 2 PASS). Tier 3 / Tier 0 may want a separate cleanup task to add the Prisma model later. | None (Tier 1 chose; documented). |
| `DEV-03` | Decision A §3 | The "exactly-one initial capture" invariant is **deferred** to a separate CRITICAL additive schema slice. Decision A documents: simultaneous initial requests without a cookie can create orphan rows in dev/test. For production-grade exactly-one semantics, a CRITICAL additive task is needed (out of N2-2). | Tier 0 / Owner: schedule separate CRITICAL additive slice |
| `BLK-01` | Production gate | N2-1 production migration and `app_engine_writer` credential are **not** authorized by Tier 0 — verbatim from T0 directive. This slice cannot be deployed to production until Tier 0 authorizes both. The slice is PR-ready + audit-ready and ships the contract; the production gate is out of Tier 1 scope. | Tier 0 authorize (N2-1 prod migration + engine credential) |
| `BLK-02` | Integration evidence (RESOLVED via CI) | CI Integration lane (run `35310303161`, job `105490789083`) provides the live runtime env: all 14 attribution-redirect tests PASS. Local integration test still FAILS with `INTEGRATION_LIVE_DB_REQUIRED` by design (no local DB), but CI is the source of truth for the integration gate. Evidence files: `evidence/ci-integration-attribution-redirect.txt`. | RESOLVED |

No other deviations. No other blockers.

---

## 5. Final status

- **Outcome**: Public referral-link redirect endpoint delivered as pure application slice per T0 Decision A. Service + route + token signing + unit + container-DB integration test are in place. N2-1 schema, RLS policies, and triggers are **unchanged** (zero forbidden-path writes).
- **Gates**: typecheck=0, lint=0 errors, unit=2311/2311, build=success. **CI Integration lane (run `35310303161`): PASS** — 21 files / 414 tests passed (all 14 attribution-redirect integration tests green); Quality lane PASS (typecheck + lint + unit + build all green). Local intentionally FAILs with `INTEGRATION_LIVE_DB_REQUIRED` (no DB env), which is the design-correct failure mode per T0 Decision A.
- **Production gate** (separate from this slice): N2-1 production migration + `app_engine_writer` credential — awaits Tier 0 authorization.
- **Lane**: CRITICAL/LIGHT, as briefed. No escalation.

> Handoff status: `READY_FOR_AUDIT`
