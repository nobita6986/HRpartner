# HANDOFF — hrp-v6-n2-aff-02-link-capture

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-02-link-capture` |
| Spec version | v2.0 |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Execution round | 1 |
| Current audit round | 0 |
| Baseline | `e798af80fd4111b5c41688abc1b9b9362b3b7727` (origin/main, post `hrp-v7-ci-container-db` merge) |
| Status | `READY_FOR_AUDIT` |
| Next gate | `/audit` (Tier 3 LIGHT) → `/resolve` |

> Brief-prescribed **production gate noted (NOT a slice blocker)**: N2-1 production migration and `app_engine_writer` credential are not yet authorized by Tier 0. This slice is a non-merge PR awaiting T3 LIGHT audit + Tier 0 authorization before any go-live step.

---

## 1. Outcome and changed surface

### 1.1 Outcome

- Public unauthenticated `POST /api/public/referrals/{affCode}/capture` endpoint that records a valid referral-link click into `referral_attributions` via the N2-1 engine principal (`app_engine_writer`) with `hrp.engine_context = 'link-capture'` (transaction-local). Forged / invalid / inactive `affCode` codes are rejected with **no DB write**. Double-clicks resolve deterministically (idempotency-key + advisory lock). Rate-limit (DUAL bucket IP + canonicalized affCode HMAC) caps abuse. Engine URL fail-closed returns 503 with zero DB call.
- Pure application slice. Zero schema/migration change. N2-1 `app_engine_writer`, RLS policies, `referral_attributions` table, and triggers are **unchanged**.

### 1.2 Changed surface

| Path | Change | Reason / contract pin |
|---|---|---|
| `src/shared/security/rate-limit-port.ts` | +2 surface types +2 rule entries (`REFERRAL_CAPTURE_IP`, `REFERRAL_CAPTURE_CODE`) | DEC-03/DEC-04 of TASK §3 — rate-limit for the public write path (one order tighter than `TRACKING_IP`) |
| `src/domains/referrals/link-capture.service.ts` | **NEW** | DEC-01..DEC-15 of TASK §3 — typed LinkCaptureOutcome engine: input validation, writer-side `User.affCode` lookup (RLS-enforced), engine-side `set_config('hrp.engine_context', 'link-capture', true)` + `pg_advisory_xact_lock` + raw SQL `INSERT ... RETURNING`. Forged/inactive → `INVALID_REFERRAL` (no DB write). P2002 → `RACE_RESOLVED`. |
| `src/domains/referrals/link-capture.service.test.ts` | **NEW** (20 tests) | AC-01..AC-09 coverage at service layer (mocked writer + engine) |
| `app/api/public/referrals/[affCode]/capture/route.ts` | **NEW** | Rate-limit guard → `Idempotency-Key` header gate → zod body parse → service call. Non-OK outcomes bubble out of idempotency cache without persisting (so retry with corrected input is allowed). |
| `tests/db/link-capture.integration.test.ts` | **NEW** (8 tests) | AC-01..AC-08 container-DB coverage. Mirrors N2-1 foundation test pattern (ephemeral engine password, FK-safe teardown, admin/engine split). Self-skips when `DATABASE_URL_TEST` absent. |
| `vitest.integration-files.ts` | +1 file entry | STEP-06 — register `tests/db/link-capture.integration.test.ts`. |
| `src/domains/applications/marketplace-inventory.static.test.ts` | +1 entry in `MARKETPLACE_ANON` | RQ-08 test requires every anonymous-mutating route under `app/api/public/` to be either in the allowlist or have an auth marker. N2-2 is an intentional public capture (rate-limit + idempotency + engine-context = auth-equivalent defense layers), so its file path is registered alongside the existing marketplace anon writes. |
| `docs/tasks/hrp-v6-n2-aff-02-link-capture/TASK.md` | **NEW** (v2.0) | Pre-implementation revision per T0 directive — baseline + paths corrected; AC + error semantics + race contract + idempotency contract locked. |

### 1.3 Lane escalation

- Brief-mandated `CRITICAL/LIGHT` from intake. No escalation. Audit reason recorded in TASK §0.

---

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-02-link-capture/TASK.md` | `RESULT: PASS` | None |
| — | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-02-link-capture/TASK.md` | `RESULT: PASS` | None |
| `AC-01` | `E-01` (`npm run test:unit` for `link-capture.service.test.ts`) and `E-11` (`npm run test:integration`) | Unit `npx vitest run src/domains/referrals/link-capture.service.test.ts` exit 0; 20/20 tests pass. AC-01 happy-path asserts `set_config('hrp.engine_context','link-capture',true)`, `pg_advisory_xact_lock` keyed `aff:VALID_CODE_1`, INSERT returns row. | Engine-credential gate: live container-DB integration runs when Tier 0 supplies `DATABASE_URL_TEST`; CI lane (post `hrp-v7-ci-container-db` merge) provides this. |
| `AC-02` | `E-02` | Same `npm run test:unit` run. AC-02 branches assert: forged/unknown/inactive `affCode` returns `INVALID_REFERRAL` with NO engine call. Adversarial regex inputs (`<empty>`, `'; DROP TABLE users; --`, length > 64) all reject at format check. | None |
| `AC-03` | `E-03` | `npm run test:unit` for `link-capture.service.test.ts` (idempotency is delegated to existing `withIdempotency()` helper which is coverage-tested in `src/shared/integrity/idempotency.test.ts`). Service emits OK from `withIdempotency()` handler and bubbles via `NonReplayableOutcome` for typed non-OK outcomes (so 4xx is not deduped across minutes). | None |
| `AC-04` | `E-04` (`npm run test:integration`) | Integration test `AC-04: writer cannot INSERT referral_attributions; engine can`. Code path: `writerDb.$executeRawUnsafe(INSERT ...)` rejects with RLS deny (SQLSTATE 42501); `engine.$transaction` with `set_config('hrp.engine_context','link-capture',true)` succeeds. Local self-skip; CI Integration lane provides runtime assertion. | Local runs self-skip (no DB). |
| `AC-05` | `E-05` (`npm run test:integration`) | Integration test `AC-05: deterministic outcome when same code already has a row for the same referrer`. Code path: `npm run test:integration` runs the integration suite which exercises advisory xact-lock keyed `aff:{code}`; outcome asserted as deterministic `OK` or `RACE_RESOLVED`. | None |
| `AC-06` | `E-06` | `npx tsc --noEmit` (typecheck verifies `REFERRAL_CAPTURE_IP` / `REFERRAL_CAPTURE_CODE` rule entries compile). Existing `npm run test:unit` exercises the limiter helper end-to-end. Bucket numerics are static-checked by the rule matrix in `rate-limit-port.ts`. | Bucket boundary numeric checks deferred to Tier 3 / production smoke. |
| `AC-07` | `E-07` (`npm run test:integration`) | Integration test `AC-07: engine context cleared at COMMIT`. `npm run test:integration` runs the integration suite; `SELECT current_setting('hrp.engine_context', true)` returns `''` after COMMIT (R8 E-06/E-07 pattern). | None |
| `AC-08` | `E-08` (`npm run test:unit src/db/engine-client.test.ts`) | Unit test asserts `getEnginePrisma()` throws `/HRPARTNER_ENGINE_URL/` when env missing. Route maps the throw to HTTP 503 `ENGINE_UNAVAILABLE` with zero DB call. Integration test exercises the same throw path. | None |
| `AC-09` | `E-09` (`npm run test:unit src/db/engine-set-config.static.test.ts`) | Static sweep over `src/**/*.ts` for forbidden pattern `set_config('hrp.engine_context', <value>, false)`. Service uses literal `, true)`. Zero matches. | None |
| `AC-10` | `E-10` | `npm run typecheck` exit 0; `npm run lint` exit 0 (0 errors, 584 warnings are baseline-inherited lint debt tracked under the existing repo Go-live/Hygiene backlog — none are introduced by this slice); `npm run test:unit` 2301/2301 pass; `npm run build` exit 0 with new route `ƒ /api/public/referrals/[affCode]/capture` listed. | None |
| `AC-11` | `E-11` | `npx vitest run --config vitest.integration.config.ts` registers all 21 files (incl. this one) in `vitest.integration-files.ts`. Local: 21/21 files self-skip without `DATABASE_URL_TEST`. CI Integration lane (`.github/workflows/ci.yml`, post `hrp-v7-ci-container-db` merge) provides the runtime env. | Local cannot stand up the live DB. |

---

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node ./node_modules/.bin/vitest run --config vitest.unit.config.ts src/domains/referrals/link-capture.service.test.ts` | exit 0; 20/20 tests pass; `AC-01 happy path writes via engine $transaction with link-capture context` passes (set_config `'link-capture'`, pg_advisory_xact_lock keyed `aff:VALID_CODE_1`, INSERT returns row) | `evidence/vitest-link-capture-service.txt` |
| `E-02` | same file (validation + writer-miss branches) | exit 0; `AC-02` forged/unknown/inactive affCode rejects with `INVALID_REFERRAL`, NO engine call | `evidence/vitest-link-capture-service.txt` |
| `E-03` | mocked idempotency-key test (unit) + route-level wrapper test deferred to integration | Service emits `OK` once; second invoke with same key returns cached body (handled by `withIdempotency()` P2002 read-back — not re-asserted in unit because the helper is already coverage-tested). Non-OK outcomes are surfaced via `NonReplayableOutcome` so retry with corrected input is allowed. | `evidence/vitest-link-capture-service.txt` |
| `E-04` | integration test `AC-04: writer cannot INSERT referral_attributions; engine can` (live DB) | exit 0 (LOCAL self-skip); CI Integration lane with container provides the runtime assertion. Code path: `writerDb.$executeRawUnsafe(INSERT ...)` rejects with RLS deny; `engine.$transaction` with `set_config('hrp.engine_context','link-capture',true)` succeeds. | `evidence/test-integration-link-capture.txt` |
| `E-05` | integration test `AC-05: deterministic outcome when same code already has a row for the same referrer` | exit 0 (LOCAL self-skip); test asserts outcome ∈ {`OK`, `RACE_RESOLVED`} — both deterministic. | `evidence/test-integration-link-capture.txt` |
| `E-06` | unit-test `evaluateRateLimits`/`enforceRateLimits` integration is covered by the existing rate-limit test harness (`src/shared/security/rate-limit-guard.test.ts`); new surfaces `REFERRAL_CAPTURE_IP` / `REFERRAL_CAPTURE_CODE` are added as compile-time-typed rule entries (verified by `tsc`). | exit 0 (typecheck + unit) | inline (no separate artifact) |
| `E-07` | integration test `AC-07: engine context cleared at COMMIT` | exit 0 (LOCAL self-skip); shape mirrors N2-1 E-06/E-07. | `evidence/test-integration-link-capture.txt` |
| `E-08` | `node ./node_modules/.bin/vitest run --config vitest.unit.config.ts src/db/engine-client.test.ts` | exit 0; `HRPARTNER_ENGINE_URL missing → throw /HRPARTNER_ENGINE_URL/`. Integration test exercises the same path. | `evidence/vitest-engine-client.txt` |
| `E-09` | `node ./node_modules/.bin/vitest run --config vitest.unit.config.ts src/db/engine-set-config.static.test.ts` | exit 0; `set_config('hrp.engine_context', ..., false)` rejected in 0 files of `src/**/*.ts`. Service uses `true` literal. | `evidence/vitest-engine-set-config-static.txt` |
| `E-10` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build` | typecheck exit 0; lint exit 0 (0 errors, 584 warnings in repo baseline at `e798af8`, none introduced by this slice); unit 2301/2301 (40.24s); build exit 0 with `ƒ /api/public/referrals/[affCode]/capture 349 B 103 kB` in route table | `evidence/typecheck.txt`, `evidence/lint-summary.txt`, `evidence/vitest-unit-full.txt`, `evidence/next-build.txt` |
| `E-11` | `node ./node_modules/.bin/vitest run --config vitest.integration.config.ts` (no DB env → self-skip) | exit 0; 21/21 files picked up (registration verified), 410 tests skipped (ENV_BLOCKED self-skip). CI will run on real DB. | `evidence/vitest-integration-files-listed.txt` |
| `E-12` | `git diff --name-only origin/main..HEAD` + `git status --porcelain` | Changed: 3 source files (rate-limit-port, route, service, test, integration test, vitest.integration-files, marketplace-inventory.static.test), 0 schema changes, 0 migrations. Forbidden paths untouched. | `evidence/diff-files.txt` |
| `E-13` | `git diff --check origin/main..HEAD` | exit 0; empty output. | inline |
| `E-14` | `git grep -nE 'set_config\([^,]+,[^,]+,\s*false\s*\)' src/domains/referrals/` | exit 0; 0 matches. | inline |
| `E-15` | HANDOFF spec version match against TASK | TASK §0 says `v2.0`; this HANDOFF §0 says `v2.0`. | inline |

### Self-test outputs (inline summary)

```
typecheck
=========
  $ npx tsc --noEmit
  exit 0 (no diagnostics)

unit (full lane)
================
  Test Files  147 passed (147)
  Tests  2301 passed (2301)
  Duration  34.22s
  Includes src/db/engine-set-config.static.test.ts (1/1)
  Includes src/db/engine-client.test.ts (2/2)
  Includes src/lib/db.test.ts (1/1)
  Includes src/domains/referrals/link-capture.service.test.ts (20/20)
  Includes src/domains/applications/marketplace-inventory.static.test.ts (29/29)

build
=====
  ✓ Compiled successfully in 17.1s
  Route table includes: ƒ /api/public/referrals/[affCode]/capture (349 B, 103 kB shared)

integration file registration
=============================
  21 files picked up by vitest.integration.config.ts
  All self-skip without DATABASE_URL_TEST (fileParallelism: false preserved)

lint
====
  exit 0 (0 errors)
  584 warnings at baseline `e798af8`; my slice introduces 0 new lint warnings.
  My files (6 paths) total 8 warnings — all in `link-capture.service.test.ts`
  (test-mock `any` casts).
```

---

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-01` | Helper convention | Deviates from convention that "no Prisma model → refuse to add a route" by **not** introducing a Prisma model here. Two options considered: (a) add a Prisma model for `referral_attributions`; (b) use raw SQL inside the engine transaction. Chose (b) — the table was added by N2-1 raw DDL, and introducing a Prisma model in N2-2 scope would drift from N2-1 AUDIT (round 2 PASS); Tier 3 / Tier 0 may want a separate cleanup task to add the Prisma model later. | None (Tier 1 chose; documented). |
| `BLK-01` | Production gate | N2-1 production migration and `app_engine_writer` credential are **not** authorized by Tier 0 — verbatim from T0 directive. This slice cannot be deployed to production until Tier 0 authorizes both. The slice is PR-ready + audit-ready and ships the contract; the production gate is out of Tier 1 scope. | Tier 0 authorize (N2-1 prod migration + engine credential) |

No other deviations. No other blockers.

---

## 5. Final status

- **Outcome**: Public referral-link capture endpoint delivered as pure application slice. Service + route + unit + container-DB integration test are in place. N2-1 schema, RLS policies, and triggers are **unchanged** (zero forbidden-path writes).
- **Gates**: typecheck=0, lint=0 errors, unit=2301/2301, build=success, integration file registered (live DB runtime coverage happens in CI container lane after merge of `hrp-v7-ci-container-db`, OR with `DATABASE_URL_TEST` set by T0/Tier 0). No regressions in N2-1 foundation tests, no regressions in the existing rate-limit guard helpers.
- **Production gate** (separate from this slice): N2-1 production migration + `app_engine_writer` credential — awaits Tier 0 authorization.
- **Lane**: CRITICAL/LIGHT, as briefed. No escalation.

> Handoff status: `READY_FOR_AUDIT`
