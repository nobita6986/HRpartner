# TASK — hrp-v6-n2-aff-02-link-capture

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-02-link-capture` |
| Work type | CODE |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | Public anonymous redirect with persisted DB side-effect + signed cookie state + open-redirect attack surface; needs forged-code defense, exactly-one invariant semantics, role boundary (writer vs engine), fail-closed posture, container-DB evidence. |
| Spec version | v3.0 |
| Status | RESOLVED |
| Planner | Tier 1 |
| Baseline | `b6940a82c2b139d319f9bc1cb6f4bff7c5a63b72` (origin/main, post `hrp-v6-n2-aff-01-attribution-foundation` merge) |
| In-scope roots | `app/r/**`, `src/domains/referrals/**`, `tests/db/attribution-redirect.integration.test.ts`, `vitest.integration-files.ts` |
| Forbidden paths | `docs/TIER0_SHIFT_HANDOVER.md`, `prisma/schema.prisma`, `prisma/migrations/**`, `src/domains/talent/**`, `src/db/engine-client.ts` (reuse only), any N2-1 policy/trigger source |
| Required gates | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `npm run test:integration` (DB env must be present — INTEGRATION_LIVE_DB_REQUIRED, NOT a self-skip) |
| Current execution round | 2 |
| Current audit round | 1 |
| Next gate | `/deliver` → `/audit` → `/resolve` → `/merge` (T3 PASS, P3 drifts resolved in this commit; production gate BLK-01 outstanding) |

> **v1.0 → v2.0 → v3.0 revisions:**
> - v1.0 (initial, 2026-09-17): extracted from N2 DISCOVERY.md, stale paths.
> - v2.0 (2026-09-18 round 1): corrected baseline + App Router paths; locked POST contract; idempotency key + advisory lock + partial unique test.
> - **v3.0 (2026-09-18 round 2, Decision A — T0 directive)**: replaced POST contract with canonical GET /r/{code} redirect flow; removed Idempotency-Key, synthetic actor, advisory lock; added signed `hrp_aff` cookie with server-side attribution row re-verification; locked destination allowlist (open-redirect defense); integration tests must RUN not SKIP.

---

## 1. Outcome

### 1.1 User-visible outcome

- A **public, unauthenticated** `GET /r/{code}` (with optional `?job=<slug>`) redirect endpoint that:
  - Validates the affiliate code (constant-shape, no existence signal).
  - Resolves the destination against an internal allowlist (`/jobs[/...]`) — open-redirect payloads are rejected with a 302 to `/jobs`.
  - Reads the `hrp_aff` cookie. If signature + expiry are valid AND the referenced attribution row is still ACTIVE and the referrer is still active → existing attribution wins, just redirect.
  - Otherwise, creates a `referral_attributions` row via the N2-1 `app_engine_writer` engine principal with `hrp.engine_context = 'link-capture'` (transaction-local).
  - Sets `hrp_aff` cookie (HttpOnly, SameSite=Lax, Path=/, Max-Age=2592000, Secure in production).
  - Returns 302 to the validated destination.
- Forged / unknown / inactive affiliate codes → 302 to `/jobs` with **no DB write** and **no existence signal**.
- Invalid / open-redirect `job` query param → 302 to `/jobs`.
- Missing engine URL → 503 (fail-closed).

### 1.2 Non-goals

- No DB schema changes or migrations (pure app slice). N2-1 `referral_attributions` table and engine principal are unchanged.
- No "exactly-one initial capture" — that is a CRITICAL additive schema slice (out of N2-2 scope, per Decision A §3).
- No N2-3 (apply-attribution), N2-4 (handling-assignment), or N2-5 (beneficiary-decision) work.
- No modifications to N2-1 policies or triggers.
- No UI components; service-layer + route-layer only.
- No new third-party dependency. Reuse `node:crypto` (built-in), `@prisma/client`, `@upstash/ratelimit` (already a dep), and existing helpers.

---

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | `docs/tasks/hrp-v6-n2-aff-policy-contract-discovery/DISCOVERY.md` | Locked boundary / policies (RLS, engine role, set_config semantics, link-capture context allow-list) |
| EV-02 | `docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/AUDIT.md` (round 2 PASS) | N2-1 dependency verified; `app_engine_writer` + `hrp.engine_context` GUC + `set_config(..., true)` + `INSERT ... RETURNING` (E-17) all in place |
| EV-03 | `prisma/migrations/20260917000000_referral_attribution_foundation/migration.sql` (in baseline) | Table columns, engine INSERT/UPDATE/SELECT policies, lifecycle trigger semantics |
| EV-04 | `src/db/engine-client.ts` | Engine client fail-closed on missing `HRPARTNER_ENGINE_URL`; direct LOGIN as `app_engine_writer` (no SET ROLE) |
| EV-05 | `src/shared/security/rate-limit-guard.ts` + `rate-limit-port.ts` + `rate-limit-identity.ts` | IP bucket rate-limiting + fail-closed 503 pattern; reuse only |
| EV-06 | `src/db/engine-set-config.static.test.ts` | Static lint rejecting `set_config('hrp.engine_context', ..., false)` |
| EV-07 | `vitest.integration-files.ts` | Single source of truth for DB-touching lane; my new integration file must be registered here |
| EV-08 | `tests/db/referral-attribution-foundation.integration.test.ts` | Existing N2-1 integration pattern: ephemeral password mutation for `app_engine_writer`, admin/engine split, FK-safe teardown |
| EV-09 | `node:crypto` (built-in `createHmac`, `timingSafeEqual`) | Cookie token signing primitive — no new dependency |

---

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-A1 | Pure application slice with zero DB migration risk. Reuse `app_engine_writer` engine client and N2-1 `referral_attributions` table. | CHOSEN |
| DEC-A2 | Endpoint: `GET /r/{code}` with optional `?job=<slug>` query param. Path-param is the canonical affiliate code; `job` query param controls destination. | CHOSEN |
| DEC-A3 | Rate-limit: IP bucket only (reuse `REFERRAL_CAPTURE_IP` rule; existing 10/60s limit). No affCode bucket on GET redirect (GETs are inherently cheap and idempotent at the user level; the sign-cookie-with-HMAC step prevents abuse at the cookie layer). | CHOSEN |
| DEC-A4 | Destination allowlist: paths MUST start with `/jobs` (and may have sub-paths). All other paths → 302 to `/jobs`. Query and hash fragments are stripped before prefix check, so `?job=/jobs?redirect=https://evil.com` becomes `/jobs` (safe: dangerous query was discarded). | CHOSEN |
| DEC-A5 | Open-redirect defense: deny `//evil.com`, `https://evil.com`, `/../etc/passwd`, `/admin`, any non-`/jobs` prefix. Denied payloads redirect to `/jobs`. | CHOSEN |
| DEC-A6 | Cookie `hrp_aff` content: opaque HMAC-SHA256 token = `base64url(attributionId) . base64url(expiresAtMs) . base64url(keyVersion) . base64url(sig)`. Key derived from `RATE_LIMIT_HASH_SECRET` (existing). | CHOSEN |
| DEC-A7 | Cookie verification is a TWO-step gate: (1) signature + expiry + key version; (2) DB re-read of the row (must exist, status='ACTIVE', expires_at > NOW(), referrer active). Either failing → treated as no cookie. | CHOSEN |
| DEC-A8 | Existing valid attribution WINS — a subsequent click with a valid cookie does NOT overwrite. The first-write-wins invariant is owned by the `referral_attributions` table + the cookie-recheck. | CHOSEN |
| DEC-A9 | No Idempotency-Key, no synthetic actor id, no advisory lock. Decision A §3 explicitly removes these (they were causing orphan rows + false invariants in dev/test). The exactly-one initial capture invariant is a CRITICAL additive schema slice, out of N2-2. | CHOSEN |
| DEC-A10 | Engine write transaction body: `set_config('hrp.engine_context', 'link-capture', true)` then INSERT raw SQL (no Prisma model for `referral_attributions`). No advisory lock. No P2002 / exactly-one claim. | CHOSEN |
| DEC-A11 | Validation: `affCode` must match `/^[A-Za-z0-9_-]{1,64}$/` (consistent with `User.affCode` Prisma schema). Empty / oversized / non-printable / SQL-injection-shaped → INVALID_CODE. | CHOSEN |
| DEC-A12 | Logging: log via `info()` / `warn()` with typed allow-list meta only — route class, outcome. **NEVER** log `affCode`, cookie value, IP, user-agent, or any PII. Reuse `logger.ts`. | CHOSEN |
| DEC-A13 | Fail-closed: missing `HRPARTNER_ENGINE_URL` → 503 ENGINE_UNAVAILABLE. Limiter unavailable → 503 RATE_LIMIT_UNAVAILABLE. Writer / engine DB error → 503 WRITE_FAILED (no internal SQLSTATE leakage). | CHOSEN |
| DEC-A14 | Constant-shape response: forged / unknown / inactive code → 302 to `/jobs` (same as a successful default-destination response, no existence signal). | CHOSEN |
| DEC-A15 | Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=2592000` (30 days), `Secure=true` in production (NODE_ENV==='production'). | CHOSEN |
| DEC-A16 | Outcome → HTTP mapping: REDIRECT_EXISTING → 302 to destination (no Set-Cookie); REDIRECT_NEW → 302 to destination + Set-Cookie; NOT_FOUND / INVALID_JOB → 302 to /jobs; INVALID_CODE → 404 (no body); RATE_LIMITED → 429; ENGINE_UNAVAILABLE / WRITE_FAILED → 503. | CHOSEN |

---

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | `affCode` validated against an active `User.affCode` (`User.isActive = true`) before any engine write. Forged / inactive / unknown codes return NOT_FOUND (302 to /jobs) with NO DB write and NO existence signal. |
| RQ-02 | Cookie verification is two-step: (1) signature + expiry + key version; (2) DB re-read of the row. Either failing → cookie treated as absent. |
| RQ-03 | Existing valid attribution WINS — a subsequent click with a valid cookie does NOT overwrite. |
| RQ-04 | `job` query param is allowlisted to `/jobs[/...]` paths only. Open-redirect payloads (`//evil.com`, `https://evil.com`, `/../etc/passwd`, `/admin`) are rejected with 302 to /jobs. Query/hash fragments are stripped before prefix check. |
| RQ-05 | Insertion executes under `app_engine_writer` with `hrp.engine_context = 'link-capture'` set transaction-locally via `set_config(..., true)`. `set_config(..., false)` is rejected by static lint. |
| RQ-06 | Public-surface reads are rate-limited via existing `enforceRateLimits()` helper — IP bucket only on GET redirect. Limiter-unavailable is fail-closed 503. |
| RQ-07 | Service-layer unit test + container-DB integration test cover: success, forged code, existing cookie wins, RLS (writer cannot insert; engine can), engine-context isolation (cleared at COMMIT), open-redirect payloads, destination allowlist, missing engine URL fail-closed. |
| RQ-08 | Reuse `getEnginePrisma()`, `getPrisma()`, `enforceRateLimits()`, `clientIpFromHeaders()`, `canonicalTrackingCode()`, `getCorrelationId()`, `info()`/`warn()` from logger — **no new third-party dependency**. |
| RQ-09 | `referral_attributions` schema, RLS policies, and triggers are unchanged. N2-1 is the authority for the table; this slice is app-only. |
| RQ-10 | Integration test must RUN against the live container DB (not self-skip). If env vars are missing → FAIL with `INTEGRATION_LIVE_DB_REQUIRED` error, NOT a silent PASS. |

### 4.2 Scope boundaries

- **In:** New route handler at `app/r/[code]/route.ts`; new service at `src/domains/referrals/attribution-redirect.service.ts`; new token helper at `src/domains/referrals/redirect-token.ts`; new unit tests at `src/domains/referrals/attribution-redirect.service.test.ts` and `redirect-token.test.ts`; new integration test at `tests/db/attribution-redirect.integration.test.ts`; 1-line addition to `vitest.integration-files.ts`; removal of `MARKETPLACE_ANON` entry for `app/api/public/referrals/[affCode]/capture/route.ts`.
- **Out:** Any `prisma/schema.prisma` change, any migration, any N2-1 policy/trigger source, any UI component, any new npm dependency.
- **Allowed task artifacts:** `docs/tasks/hrp-v6-n2-aff-02-link-capture/**`.

### 4.3 Domain boundaries

- **Data/state:** Reads from `users` (via `app_user_writer`, RLS-enforced) to validate `affCode`. Writes to `referral_attributions` (via `app_engine_writer`, engine context `'link-capture'`). No new tables; no new columns.
- **Permission/security:** Public unauthenticated route. Two layers of abuse defense: rate-limit (IP bucket) + HMAC-signed cookie. Engine context gate is the third layer (DB-authority). Strict separation between read-side (`app_user_writer`) and write-side (`app_engine_writer`) — never in the same transaction.
- **Interface/API:** REST GET endpoint with path-param `{code}` and optional `?job=<slug>` query param. Reads `hrp_aff` cookie. Writes `hrp_aff` cookie on new attribution.
- **Migration/rollback:** None. App rollback is a standard deploy rollback.

### 4.4 API contract — locked

**Request:**

```
GET /r/{code}?job={slug} HTTP/1.1
Host: HOST
User-Agent: UA
Cookie: hrp_aff=TOKEN      # optional
```

- `{code}` — path param, the affiliate code (`[A-Za-z0-9_-]{1,64}`).
- `?job=<slug>` — optional. Must start with `/jobs` after query/hash stripping. Defaults to `/jobs`.

**Success response (302):**

```
HTTP/1.1 302 Found
Location: /jobs
Set-Cookie: hrp_aff=TOKEN; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000; Secure
Cache-Control: no-store, no-cache, must-revalidate, private
X-Request-Id: CORRELATION_ID
```

(For existing valid cookie: same Location, but no Set-Cookie.)

**Forged / unknown / inactive code → 302 to /jobs (constant shape):**

```
HTTP/1.1 302 Found
Location: /jobs
```

**Invalid `code` (format fail) → 404:**

```
HTTP/1.1 404 Not Found
```

**Missing engine URL → 503:**

```
HTTP/1.1 503 Service Unavailable
```

### 4.5 Cookie contract — locked

| Attribute | Value |
|---|---|
| Name | `hrp_aff` |
| Value | opaque HMAC-SHA256 token (see DEC-A6) |
| HttpOnly | yes |
| SameSite | `Lax` |
| Path | `/` |
| Max-Age | 2592000 seconds (30 days) |
| Secure | yes (production only — `NODE_ENV === 'production'`) |

---

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | `src/domains/referrals/redirect-token.ts` | HMAC token signing/verification. Pure `node:crypto` — no DB. | `npm run test:unit` | type / test fail |
| STEP-02 | `src/domains/referrals/attribution-redirect.service.ts` | Service-layer: validate affCode, validate job, lookup referrer, verify cookie + re-check DB row, engine write with link-capture context. Typed `RedirectOutcome`. | `npm run test:unit` | service logic error |
| STEP-03 | `src/domains/referrals/attribution-redirect.service.test.ts` | Unit tests: invalid code, invalid job (open-redirect payloads), NOT_FOUND, no cookie (REDIRECT_NEW), invalid cookie (treated as no cookie), P2002 → REDIRECT_EXISTING, engine RLS deny → WRITE_FAILED, no advisory lock. | `npm run test:unit` | test fail |
| STEP-04 | `src/domains/referrals/redirect-token.test.ts` | Token unit tests: create, verify, tamper, expire, malformed, wrong secret. | `npm run test:unit` | test fail |
| STEP-05 | `app/r/[code]/route.ts` | Route handler: rate-limit (IP) → query param + cookie read → engine client fail-closed → service → HTTP response. Force-dynamic, nodejs runtime. | `npm run typecheck`; `npm run build` | route wiring error |
| STEP-06 | `tests/db/attribution-redirect.integration.test.ts` | Container-DB integration: success, forged/inactive → NOT_FOUND, existing cookie wins, open-redirect payloads, job allowlist, RLS deny, engine context isolation, missing engine URL. **Must RUN (not SKIP) — fail explicitly when env missing.** | `npm run test:integration` | DB error |
| STEP-07 | `vitest.integration-files.ts` | Register `tests/db/attribution-redirect.integration.test.ts`. Remove old `tests/db/link-capture.integration.test.ts` entry. | `npm run test:integration` (config picks it up) | file not registered |
| STEP-08 | `src/domains/applications/marketplace-inventory.static.test.ts` | Remove `app/api/public/referrals/[affCode]/capture/route.ts` from `MARKETPLACE_ANON` (no longer an anonymous POST). | `npm run test:unit` | static test fail |
| STEP-09 | Delete old files | Remove `app/api/public/referrals/[affCode]/capture/route.ts`, `src/domains/referrals/link-capture.service.ts`, `src/domains/referrals/link-capture.service.test.ts`, `tests/db/link-capture.integration.test.ts`. | `git status` | file still exists |
| STEP-10 | Full gates | typecheck + lint + unit + build + integration (container DB) | all green | gate fail |

---

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | Valid code → REDIRECT_NEW with Set-Cookie + 302 to allowlisted destination; engine write succeeds. | `npm run test:integration` |
| AC-02 | Forged / unknown / inactive `affCode` → NOT_FOUND (302 to /jobs) with NO DB write (assert count unchanged). | `npm run test:integration` |
| AC-03 | Existing valid cookie + active row → REDIRECT_EXISTING (302 to destination, no Set-Cookie, no new row). | `npm run test:integration` |
| AC-04 | Engine context `link-capture` set transaction-locally; cleared at COMMIT (no leak across pooled reuse). | `npm run test:integration` |
| AC-05 | Open-redirect payloads (`//evil.com`, `https://evil.com`, `/../etc/passwd`, `/admin`) → INVALID_JOB / NOT_FOUND / 302 to /jobs. | `npm run test:unit` + `npm run test:integration` |
| AC-06 | Destination allowlist: `/jobs[/...]` preserved (query/hash stripped before prefix check); `/admin` and other prefixes → INVALID_JOB. | `npm run test:unit` + `npm run test:integration` |
| AC-07 | Missing `HRPARTNER_ENGINE_URL` → 503 ENGINE_UNAVAILABLE without DB call. | `npm run test:unit` + `npm run test:integration` |
| AC-08 | `app_user_writer` cannot INSERT `referral_attributions` (RLS deny). `app_engine_writer` with `link-capture` context can. | `npm run test:integration` |
| AC-09 | Static check: `set_config('hrp.engine_context', ..., false)` does not appear in `src/`. | `npm run test:unit` (engine-set-config.static.test.ts) |
| AC-10 | Service does NOT call any advisory lock, does NOT derive a synthetic actor id, does NOT use `Idempotency-Key`. Decision A §3. | `npm run test:unit` |
| AC-11 | Full Quality gates pass (`typecheck`, `lint`, `test:unit`, `build`). | `npm run typecheck; npm run lint; npm run test:unit; npm run build` |
| AC-12 | Integration gate RUNs end-to-end against the live container DB (`npm run test:integration`) — no ENV_BLOCKED self-skip. Missing env vars cause `INTEGRATION_LIVE_DB_REQUIRED` failure (NOT a silent PASS). | `npm run test:integration` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02, STEP-03, STEP-06 | AC-02 |
| RQ-02 | STEP-01, STEP-02, STEP-04, STEP-06 | AC-03 |
| RQ-03 | STEP-02, STEP-06 | AC-03 |
| RQ-04 | STEP-02, STEP-03, STEP-06 | AC-05, AC-06 |
| RQ-05 | STEP-02, STEP-06, STEP-09 | AC-01, AC-04, AC-08, AC-09 |
| RQ-06 | STEP-05, STEP-06 | AC-05 (rate-limit subset) |
| RQ-07 | STEP-03, STEP-04, STEP-06 | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10 |
| RQ-08 | STEP-05 | AC-11 |
| RQ-09 | STEP-09 | AC-11 (no schema/migration change) |
| RQ-10 | STEP-06, STEP-07 | AC-12 |

---

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | Forged-code spam creates many 302 redirects. | Rate-limit per IP (DEC-A3). 503 if limiter unavailable (fail-closed). Constant-shape response prevents existence signal. |
| RISK-02 | Open-redirect via `?job` query param (e.g. `https://evil.com`). | Destination allowlist (DEC-A4) — only `/jobs[/...]` paths pass; others → 302 to `/jobs`. |
| RISK-03 | Engine URL misconfigured in production → request silently uses writer (privilege escalation). | `getEnginePrisma()` throws if `HRPARTNER_ENGINE_URL` missing. Route maps to 503. Static check `engine-set-config.static.test.ts` rejects `set_config(..., false)`. N2-1 AUDIT covers role posture. |
| RISK-04 | Logging leaks affiliate code / IP / UA. | DEC-A12: logger meta is typed allow-list (route, outcome, requestId). Service never logs the affCode value or cookie. |
| RISK-05 | N2-1 schema / RLS drift between this slice's merge and N2-1's existing tests. | N2-1 integration test runs in CI (already registered in `vitest.integration-files.ts`). AC-08 confirms container-DB green. |
| RISK-06 | Orphan rows under concurrent initial clicks (no advisory lock per Decision A). | Decision A §3 documents this as known limitation; exactly-one initial capture is a CRITICAL additive schema slice (out of N2-2 scope). For now: the existing-valid-cookie wins path (RQ-03) prevents duplicate from a single browser; multiple browsers can each create a row (acceptable per DISCOVERY §2.4.1). |
| RISK-07 | Tier 0 has not authorized N2-1 production migration / engine credential — this slice still ships but cannot be deployed. | T0 directive verbatim: "Production gate: N2-1 production migration and credential app_engine_writer still unauthorized." — explicitly noted; delivery is non-merge PR with HANDOFF audit. |

---

## 8. Open Questions

- None blocking. The remaining "production gate" is owned by Tier 0 (per directive); this slice is a non-merge PR awaiting T3 LIGHT audit + Tier 0 authorization.
- The "exactly-one initial capture" invariant is deferred to a separate CRITICAL additive schema slice (Decision A §3).

---

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | READY_FOR_EXECUTION (v1.0) | Stale baseline + paths. Superseded by v2.0. |
| 1 | READY_FOR_EXECUTION (v2.0) | Baseline corrected; paths corrected to App Router; POST API contract, idempotency/race contract locked. NO schema migration risk. Superseded by v3.0. |
| 2 | READY_FOR_EXECUTION (v3.0 — Decision A) | T0 directive: replace POST /api/public/referrals/{affCode}/capture with canonical GET /r/{code}[?job=...]. Signed `hrp_aff` cookie, existing-valid-wins, destination allowlist, no Idempotency-Key / synthetic actor / advisory lock. Integration tests must RUN not SKIP. |

---

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-17 | Initial contract | Extracted from N2 DISCOVERY.md |
| v2.0 | 2026-09-18 | Baseline corrected; in-scope paths corrected; POST API request/response contract locked; idempotency key requirement + replay contract locked; race/double-click contract locked; error semantics locked; AC set expanded. | Pre-implementation revision; ensure Tier 3 can reproduce ACs end-to-end without guessing paths. |
| v3.0 | 2026-09-18 | **Round 2 — Decision A per T0 directive.** Replaced POST endpoint with canonical GET /r/{code}[?job=<slug>] redirect flow. Added signed `hrp_aff` cookie with server-side row re-verification. Existing-valid-wins replaces double-click lock contract. Destination allowlist replaces `returnTo`-style param. Removed Idempotency-Key, synthetic actor id, advisory lock, P2002-exactly-one claims. Documented orphan-row behavior (separate CRITICAL slice out of scope). Integration test must RUN not SKIP. Updated required gates. Removed `app/api/public/referrals/[affCode]/capture` from `MARKETPLACE_ANON`. | T0 directive `Decision A`: ship canonical referral redirect flow, not POST capture. |
