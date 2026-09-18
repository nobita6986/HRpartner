# TASK — hrp-v6-n2-aff-02-link-capture

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-02-link-capture` |
| Work type | CODE |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | Public-facing unauthenticated capture route; requires forged-code defense, race/double-click deterministic handling, role boundary (writer vs engine), and fail-closed posture against misconfigured engine URL. |
| Spec version | v2.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 |
| Baseline | `e798af80fd4111b5c41688abc1b9b9362b3b7727` (origin/main, post `hrp-v7-ci-container-db` merge) |
| In-scope roots | `app/api/public/referrals/**`, `src/domains/referrals/**`, `tests/db/link-capture.integration.test.ts`, `vitest.integration-files.ts` |
| Forbidden paths | `docs/TIER0_SHIFT_HANDOVER.md`, `prisma/schema.prisma`, `prisma/migrations/**`, `src/domains/talent/**`, `src/db/engine-client.ts` (reuse only), any N2-1 policy/trigger source |
| Required gates | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `npm run test:integration` (DB env must be present, else `ENV_BLOCKED`) |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | `/deliver` → `/audit` → `/resolve` |

> **v1.0 → v2.0 revisions (executed this round):** baseline updated to current `origin/main`; in-scope paths corrected to actual Next.js App Router layout (`app/api/public/referrals/**`, `src/domains/referrals/**`); API request/response contract locked; idempotency key requirement + replay contract locked; error semantics per outcome locked; AC set expanded (race deterministic, abuse boundary, engine-context isolation, static `set_config(..., false)` rejection); `audit_reason` sharpened.

---

## 1. Outcome

### 1.1 User-visible outcome

- A **public, unauthenticated** `POST /api/public/referrals/{affCode}/capture` endpoint that records the first valid click on a referral link into `referral_attributions`, behind the existing rate-limit guard, idempotency helper, and the N2-1 `app_engine_writer` engine principal with `hrp.engine_context = 'link-capture'`.
- Forged, invalid, or inactive affiliate codes are rejected with **no DB write** and a generic error envelope (no existence signal).
- Double-click / concurrent requests resolve to a single row (idempotent on `(referrer_user_id, affiliate_code_snapshot)` business key) and replay returns the original response payload.

### 1.2 Non-goals

- No DB schema changes or migrations (pure app slice). N2-1 `referral_attributions` table and engine principal are unchanged.
- No N2-3 (apply-attribution), N2-4 (handling-assignment), or N2-5 (beneficiary-decision) work.
- No modifications to N2-1 policies or triggers.
- No UI components; service-layer + route-layer only.
- No new third-party dependency. Reuse `pg` (transitive via `@prisma/client`), `@upstash/ratelimit` (already a dep), and existing helpers.

---

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | `docs/tasks/hrp-v6-n2-aff-policy-contract-discovery/DISCOVERY.md` | Locked boundary / policies (RLS, engine role, set_config semantics, link-capture context allow-list) |
| EV-02 | `docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/AUDIT.md` (round 2 PASS) | N2-1 dependency verified; `app_engine_writer` + `hrp.engine_context` GUC + `set_config(..., true)` + `INSERT ... RETURNING` (E-17) all in place |
| EV-03 | `prisma/migrations/20260917000000_referral_attribution_foundation/migration.sql` (in baseline) | Table columns, engine INSERT/UPDATE/SELECT policies, lifecycle trigger semantics |
| EV-04 | `src/db/engine-client.ts` | Engine client fail-closed on missing `HRPARTNER_ENGINE_URL`; direct LOGIN as `app_engine_writer` (no SET ROLE) |
| EV-05 | `src/shared/integrity/idempotency.ts` | UNIQUE-scope `(actorId, route, key)` + P2002 race replay + 24h TTL default; reuse only |
| EV-06 | `src/shared/security/rate-limit-guard.ts` + `rate-limit-port.ts` + `rate-limit-identity.ts` | DUAL bucket (IP + tracking-code HMAC) + fail-closed 503 pattern; reuse only |
| EV-07 | `src/shared/auth/rls-context.ts` | Confirms `set_config(..., true)` is the only allowed GUC mechanism; `set_config(..., false)` rejected by static lint (`src/db/engine-set-config.static.test.ts`) |
| EV-08 | `vitest.integration-files.ts` | Single source of truth for DB-touching lane; my new integration file must be registered here |
| EV-09 | `tests/db/referral-attribution-foundation.integration.test.ts` | Existing N2-1 integration pattern: ephemeral password mutation for `app_engine_writer`, admin/engine split, FK-safe teardown, READY-style assertions; reuse pattern |

---

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Pure application slice with zero DB migration risk. Reuse `app_engine_writer` engine client, N2-1 `referral_attributions` table, and `set_config('hrp.engine_context', 'link-capture', true)` (transaction-local). | CHOSEN |
| DEC-02 | Endpoint: `POST /api/public/referrals/{affCode}/capture` (path-param encodes the affiliate code). `affCode` is canonicalized via `User.affCode` lookup against `app_user_writer` connection (read-only). Engine write happens in a **separate** engine transaction that does not assume any human role. | CHOSEN |
| DEC-03 | Rate-limit: DUAL bucket on existing rule matrix — add new surface `REFERRAL_CAPTURE_IP` (subject=`ip`, conservative limit, see DEC-04) using `RATE_LIMIT_RULES` pattern. Reuse `enforceRateLimits()`; no new rule-engine code. | CHOSEN |
| DEC-04 | Rate-limit values: `REFERRAL_CAPTURE_IP` = `{surface:'REFERRAL_CAPTURE_IP', subject:'ip', limit:10, windowSec:60}` (one order tighter than `TRACKING_IP` because the public write path is anonymous — abuse vector is higher than a self-service read). Tighten 4× on unknown-client bucket via existing `tightenForUnknownSubject` (no change needed). | CHOSEN |
| DEC-05 | Idempotency: **REQUIRED** `Idempotency-Key` header (UUID). Reuse `withIdempotency()` from `src/shared/integrity/idempotency.ts`. `actorId` for the scope UNIQUE is a synthetic public-anonymous identifier derived deterministically from `(affCode, clientIpUnknownBucket, correlationId)` — see DEC-09. | CHOSEN |
| DEC-06 | Idempotency replay semantics: a successful capture returns `201` on first call; a duplicate `Idempotency-Key` returns the **same response body** and `201` (replay). The `withIdempotency()` helper already enforces P2002 read-back; no change. | CHOSEN |
| DEC-07 | Race / double-click semantics: deterministic via the idempotency key (DEC-05). **In addition**, the engine write is wrapped in a transaction-local advisory lock keyed by `('aff:' || affCode)` so that two **distinct idempotency keys** for the same affiliate code cannot produce two attribution rows in the same window — verified by `ON CONFLICT` partial unique index test (E-22). The combination of (idempotency-key + advisory lock + partial unique index) gives deterministic behavior under any concurrency. | CHOSEN |
| DEC-08 | Forged / invalid / inactive affiliate code → `400 INVALID_REFERRAL` with a **generic** message (`"Mã giới thiệu không hợp lệ hoặc đã hết hạn"`), no existence signal, **no DB write**. Lookup goes through `app_user_writer` connection (RLS-enforced) so an `inactive` user (`User.isActive = false`) is filtered by the human-side policy. | CHOSEN |
| DEC-09 | Synthetic `actorId` for idempotency-key scope: NOT a real user id (public-anonymous). Use a stable hash of `(affCode, ip, userAgent)` salted with `RATE_LIMIT_HASH_SECRET` so the same browser+code+UA combination reuses the row, but two different browsers get independent scopes. Hash truncated to 32 chars (matches the existing HMAC convention). | CHOSEN |
| DEC-10 | Engine write transaction body (raw SQL, because no Prisma model exists for `referral_attributions`): inside `engineDb.$transaction(async (tx) => { await tx.$executeRaw`SELECT set_config('hrp.engine_context','link-capture',true)`; ... INSERT ... RETURNING id, referrer_user_id, status, created_at; })`. The transaction **always** calls `set_config` before any read or write; engine-context absent is fail-closed at the DB layer (E-09 from N2-1). | CHOSEN |
| DEC-11 | Validation: `affCode` must match the same regex as `User.affCode` (UUID-like, length 1..64) per `User.affCode` Prisma schema (`@unique` `String`). Reject empty / oversized / non-printable with `400 INVALID_REFERRAL` (generic). | CHOSEN |
| DEC-12 | Logging: log via `info()` / `warn()` with the typed allow-list meta only — route class, status, outcome, surface, retryAfter. **NEVER** log `affCode`, idempotency key, raw client IP, user-agent, full response body, or any PII. Reuse `logger.ts`. | CHOSEN |
| DEC-13 | Abuse control: per-IP rate-limit (DEC-04) + per-`affCode` rate-limit using existing `TRACKING_CODE` rule on the canonicalized `affCode`. A forged-code burst from one IP hits IP limit; a single valid-code burst from many IPs hits the `affCode` limit (10/60s). The combination throttles both vectors. | CHOSEN |
| DEC-14 | `first_clicked_at` is the DB-side `NOW()` (server clock) — never trust client-supplied timestamps. `expires_at` is computed server-side (`first_clicked_at + 30 calendar days`, exclusive next-day boundary per DISCOVERY §2.1 Q2c). N2-1 does NOT own the helper for the **public** boundary because N2-1's window is a different one (placement lifecycle). I will inline a 30-day constant here and document that N2-1 is the authority for the **placement** boundary helper. | CHOSEN |
| DEC-15 | Response body on success: `{ captured: true, attributionId, referrerUserId, status: 'ACTIVE', createdAt }`. **Never** echo back `affiliate_code_snapshot`, `expires_at`, or any internal-only field. | CHOSEN |
| DEC-16 | Failure modes and status codes — locked: | CHOSEN |

| Outcome | HTTP | `error` code | DB write | Note |
|---|---|---|---|---|
| Success (first call) | 201 | — | yes | engine insert; response per DEC-15 |
| Idempotent replay | 201 | — | no (P2002 read-back) | `Idempotency-Key` already used with same body; returns stored body |
| Missing / malformed `Idempotency-Key` | 400 | `IDEMPOTENCY_KEY_REQUIRED` | no | header required to dedupe |
| Forged / invalid / inactive `affCode` | 400 | `INVALID_REFERRAL` | no | generic message; no existence signal |
| Body parse / schema fail | 400 | `INVALID_INPUT` | no | zod failure path |
| Rate-limited (IP or affCode bucket) | 429 | `RATE_LIMITED` | no | via `enforceRateLimits()` |
| Limiter unavailable (fail-closed) | 503 | `RATE_LIMIT_UNAVAILABLE` | no | via `enforceRateLimits()` |
| Engine URL missing (`HRPARTNER_ENGINE_URL`) | 503 | `ENGINE_UNAVAILABLE` | no | fail-closed at engine client |
| Engine DB error (migrate drift, role drift, transient) | 503 | `CAPTURE_FAILED` | rolled back | never 500 with raw SQLSTATE in body |
| Internal unexpected | 500 | `INTERNAL` | rolled back | generic message; logged with route class only |

---

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | `affCode` validated against an active `User.affCode` (`User.isActive = true`) before any engine write. Forged / inactive / unknown codes reject without insert and without existence signal. |
| RQ-02 | Concurrent requests for the same `(affCode, browser)` combination resolve to a single `referral_attributions` row (idempotent on `Idempotency-Key`). Distinct idempotency keys for the same `affCode` cannot create duplicate rows in the same window (advisory lock + partial unique test). |
| RQ-03 | Insertion executes under `app_engine_writer` with `hrp.engine_context = 'link-capture'` set transaction-locally via `set_config(..., true)`. `set_config(..., false)` is rejected by static lint (`src/db/engine-set-config.static.test.ts`). |
| RQ-04 | All public-surface writes are rate-limited via existing `enforceRateLimits()` helper — DUAL bucket (IP + canonicalized affCode). Limiter-unavailable is fail-closed 503. |
| RQ-05 | Service-layer test (unit) + integration test (container-DB) cover: success, forged code, missing context, role boundary (writer cannot insert; engine can), concurrency (race), abuse control (rate-limit threshold respected). |
| RQ-06 | Reuse `withIdempotency()`, `enforceRateLimits()`, `getEnginePrisma()`, `evaluateRateLimits()` — **no new third-party dependency**. |
| RQ-07 | `referral_attributions` schema, RLS policies, and triggers are unchanged. N2-1 is the authority for the table; this slice is app-only. |

### 4.2 Scope boundaries

- **In:** New route handler at `app/api/public/referrals/[affCode]/capture/route.ts`; new service at `src/domains/referrals/link-capture.service.ts`; new unit test at `src/domains/referrals/link-capture.service.test.ts`; new integration test at `tests/db/link-capture.integration.test.ts`; new rule entry in `src/shared/security/rate-limit-port.ts` (`REFERRAL_CAPTURE_IP`); 1-line addition to `vitest.integration-files.ts`.
- **Out:** Any `prisma/schema.prisma` change, any migration, any N2-1 policy/trigger source, any UI component, any new npm dependency.
- **Allowed task artifacts:** `docs/tasks/hrp-v6-n2-aff-02-link-capture/**`.

### 4.3 Domain boundaries

- **Data/state:** Reads from `users` (via `app_user_writer`, RLS-enforced) to validate `affCode`. Writes to `referral_attributions` (via `app_engine_writer`, engine context `'link-capture'`). No new tables; no new columns.
- **Permission/security:** Public unauthenticated route. Two layers of abuse defense: rate-limit + idempotency. Engine context gate is the third layer (DB-authority). Strict separation between read-side (`app_user_writer`) and write-side (`app_engine_writer`) — **never** in the same transaction.
- **Interface/API:** REST POST endpoint with path-param `{affCode}` and JSON body (optional metadata, see RQ contract below). Standard error envelope: `{ error: string, message: string }`.
- **Migration/rollback:** None. App rollback is a standard deploy rollback.

### 4.4 API contract — locked

**Request:**

```http
POST /api/public/referrals/{affCode}/capture HTTP/1.1
Host: HOST
Content-Type: application/json
Idempotency-Key: UUIDV4                  # required, UUID format
User-Agent: UA                           # optional; folded into synthetic actor scope
X-Request-Id: CORRELATION_ID             # optional; forwarded to logger

{                                         # body — currently empty allowed
  "source": "qr"                          # optional, free string length-lte-64 (UI hint)
}
```

**Success response (201):**

```json
{
  "captured": true,
  "attributionId": "ATTRIBUTION_ID",
  "referrerUserId": "USER_ID",
  "status": "ACTIVE",
  "createdAt": "ISO_8601"
}
```

**Idempotent replay response (201, identical body to first call):** same shape as success — `withIdempotency()` re-emits the stored body.

**Error envelope (4xx / 5xx):**

```json
{ "error": "INVALID_REFERRAL", "message": "Mã giới thiệu không hợp lệ hoặc đã hết hạn." }
```

Error code mapping: see DEC-16.

### 4.5 Race / double-click contract — locked

| Scenario | Behavior | Evidence |
|---|---|---|
| Same browser, same `affCode`, same `Idempotency-Key` → 2 clicks within TTL | 1 row, 1 response, second call returns stored body (replay) | unit + integration |
| Same browser, same `affCode`, **different** `Idempotency-Key` → 2 clicks within window | 1 row (advisory lock + partial-unique test), second call returns 409 `RACE_RESOLVED` | integration |
| Two different browsers, same `affCode`, no `Idempotency-Key` overlap | 2 rows (different actor scopes) | integration (allowed per DISCOVERY §2.4.1 — `referrer_user_id` is fixed, but `affiliate_code_snapshot` is fixed too; the second click from another browser is a separate `attribution_id`) |
| Two different `affCode` values, same browser | 2 rows (one per code) | integration |

> The "1 row per (referrer, code)" invariant is owned by N2-1 (immutable columns + lifecycle). My slice enforces "at most one engine-context-gated insert per request" via the combination above.

---

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | `src/shared/security/rate-limit-port.ts` | Add `REFERRAL_CAPTURE_IP` rule (DEC-04). No new provider code. | `npm run typecheck`; `npm run test:unit` (`rate-limit-config.test.ts` etc.) | type error |
| STEP-02 | `src/domains/referrals/link-capture.service.ts` | Service-layer: validate input, lookup `affCode` via `app_user_writer`, prepare engine `set_config + INSERT ... RETURNING` (raw SQL — no Prisma model). Synthetic actor id (DEC-09). All branches return typed errors per DEC-16. | `npm run test:unit` | service logic error |
| STEP-03 | `src/domains/referrals/link-capture.service.test.ts` | Unit tests: forged code, missing context (no engine URL), invalid input, idempotency replay, rate-limit interaction, log redaction. Mocks via `vi.mock` of `@/src/db/engine-client`, `@/src/lib/db`, `@/src/shared/integrity/idempotency`. | `npm run test:unit` | test fail |
| STEP-04 | `app/api/public/referrals/[affCode]/capture/route.ts` | Route handler: `enforceRateLimits` (DUAL bucket IP + canonicalized affCode) → zod body parse → `Idempotency-Key` header gate → service call → response. Force-dynamic, nodejs runtime. | `npm run typecheck`; `npm run lint`; `npm run build` | route wiring error |
| STEP-05 | `tests/db/link-capture.integration.test.ts` | Container-DB integration: success + forged (no insert) + missing context (denied) + role boundary (writer cannot insert; engine can) + concurrent double-click (1 row, replay) + engine-context isolation (no leak across COMMIT). Reuse N2-1 integration test pattern (EV-09). | `npm run test:integration` | DB error |
| STEP-06 | `vitest.integration-files.ts` | Register `tests/db/link-capture.integration.test.ts`. | `npm run test:integration` (config picks it up) | file not registered |

---

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | Valid `affCode` (active `User.affCode`) creates a single `referral_attributions` row via `app_engine_writer` with `hrp.engine_context = 'link-capture'`. | `npm run test:integration` (E-17-equivalent + new E-22) |
| AC-02 | Forged / unknown / inactive `affCode` returns `400 INVALID_REFERRAL` with NO DB write (assert `count = 0`). | `npm run test:unit` + `npm run test:integration` |
| AC-03 | Two identical requests (same `Idempotency-Key`, same body, same `affCode`) within TTL resolve to one DB row and return the same response body twice. | `npm run test:unit` + `npm run test:integration` |
| AC-04 | `app_user_writer` cannot insert a `referral_attributions` row (RLS deny). `app_engine_writer` with `link-capture` context can. | `npm run test:integration` (writer denies / engine allows) |
| AC-05 | Concurrent double-click from one browser with distinct `Idempotency-Key`s resolves to one row (advisory lock + partial-unique test E-22) — second call returns `409 RACE_RESOLVED`. | `npm run test:integration` |
| AC-06 | Rate-limit: 11th call from one IP within 60s returns `429 RATE_LIMITED`. Limiter-unavailable returns `503 RATE_LIMIT_UNAVAILABLE` (no DB call). | `npm run test:unit` (with injected memory provider) + `npm run test:integration` |
| AC-07 | Engine-context isolation: after COMMIT, `current_setting('hrp.engine_context', true)` returns `''` on a new transaction (no leak). After ROLLBACK, same. | `npm run test:integration` (reuses N2-1 E-06/E-07 pattern) |
| AC-08 | Missing `HRPARTNER_ENGINE_URL` returns `503 ENGINE_UNAVAILABLE` without DB call. | `npm run test:unit` (mocked engine client) |
| AC-09 | Static check: `set_config('hrp.engine_context', ..., false)` does not appear anywhere in `src/`. Existing `engine-set-config.static.test.ts` enforces this. | `npm run test:unit` |
| AC-10 | Full Quality gates pass (`typecheck`, `lint`, `test:unit`, `build`). | `npm run typecheck; npm run lint; npm run test:unit; npm run build` |
| AC-11 | Integration gate runs end-to-end against the container DB (`npm run test:integration`) with all new + existing integration tests green, OR `ENV_BLOCKED` if Tier 0 has not provided test DB secrets. | `npm run test:integration` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02, STEP-03, STEP-05 | AC-02 |
| RQ-02 | STEP-02, STEP-04, STEP-05 | AC-03, AC-05 |
| RQ-03 | STEP-02, STEP-05, STEP-06 | AC-01, AC-04, AC-07, AC-09 |
| RQ-04 | STEP-01, STEP-04, STEP-06 | AC-06 |
| RQ-05 | STEP-03, STEP-05, STEP-06 | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09 |
| RQ-06 | STEP-02, STEP-04 | AC-08 |
| RQ-07 | STEP-06 | AC-11 (covered by N2-1 AUDIT round 2 PASS, referenced in EV-02) |

---

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | Forged-code spam creates many rejected requests. | Rate-limit per IP (DEC-04) + per `affCode` (existing `TRACKING_CODE` bucket). 503 if limiter unavailable (fail-closed, no DB pressure). |
| RISK-02 | Race / double-click creates duplicate attributions for the same `(referrer, code)` window. | Idempotency-Key (DEC-05) + advisory lock + partial unique index test (DEC-07, AC-05). |
| RISK-03 | Engine URL misconfigured in production → request silently uses writer (privilege escalation). | `getEnginePrisma()` already throws if `HRPARTNER_ENGINE_URL` is missing. New AC-08 enforces 503 with no DB call. Static check `engine-set-config.static.test.ts` rejects `set_config(..., false)`. N2-1 AUDIT already covers role posture. |
| RISK-04 | Logging leaks affiliate code / IP / UA. | DEC-12: logger meta is typed allow-list (route, status, outcome, surface, retryAfter, requestId). Service never logs the affCode value. |
| RISK-05 | N2-1 schema / RLS drift between this slice's merge and N2-1's existing tests. | N2-1 integration test is already in `vitest.integration-files.ts` and runs in CI. AC-11 confirms container-DB green. |
| RISK-06 | `referral_attributions` table doesn't exist in production yet → first capture fails. | N2-1 migration is in baseline (committed). N2-1's own AUDIT round 2 PASS covers the migration; my slice only writes to it. |
| RISK-07 | Tier 0 has not authorized the N2-1 production migration / engine credential — this slice still ships but cannot be deployed to production. | T0 directive: "Production gate: N2-1 production migration and credential app_engine_writer still unauthorized." — explicitly noted; delivery is non-merge PR with HANDOFF audit. |

---

## 8. Open Questions

- None blocking. The remaining "production gate" is owned by Tier 0 (per directive); this slice is a non-merge PR awaiting T3 LIGHT audit + Tier 0 authorization.

---

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | READY_FOR_EXECUTION (v1.0) | Stale baseline + paths. Superseded by v2.0. |
| 1 | READY_FOR_EXECUTION (v2.0) | Baseline corrected to `e798af8`; paths corrected to App Router layout; API contract, idempotency/race contract, error semantics, AC set expanded. No DB migration risk. |

---

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-17 | Initial contract | Extracted from N2 DISCOVERY.md |
| v2.0 | 2026-09-18 | Baseline corrected; in-scope paths corrected to actual Next.js App Router layout (`app/api/public/referrals/**`, `src/domains/referrals/**`); API request/response contract locked; idempotency key requirement + replay contract locked; race/double-click contract locked; error semantics per outcome locked (DEC-16); AC set expanded (race, abuse boundary, engine-context isolation, static `set_config(..., false)` rejection); `audit_reason` sharpened; `audit_mode` confirmed LIGHT. | Pre-implementation revision requested by Tier 0 directive; ensure Tier 3 can reproduce ACs end-to-end without guessing paths. |
