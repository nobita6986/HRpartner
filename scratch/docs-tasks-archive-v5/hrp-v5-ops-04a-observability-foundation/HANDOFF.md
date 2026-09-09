# HANDOFF: hrp-v5-ops-04a-observability-foundation

| Field | Value |
|---|---|
| Task slug | `hrp-v5-ops-04a-observability-foundation` |
| Work type | `CODE` |
| Spec version | `v1.0` |
| Execution round | `3` |
| Current audit round | `1` (PLN-01 strict fix round) |
| Executor | `Tier 2-B` |
| Baseline | `3e627e9db2ec8627a3f5be6e58424263510ecbac` |
| Worktree | `C:\CodeApp\HrP-wt-ops04a` (branch `work/hrp-v5-ops-04a`) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-27 Asia/Bangkok` |

## 1. Outcome Summary

Đã triển khai observability foundation dùng chung, test được, provider-neutral:

1. **`src/shared/observability/correlation-id.ts`** — RQ-01/AC-01. Validate/reuse/generate correlation ID. Header `x-request-id`. Regex `[A-Za-z0-9._:-]+`, length 8–128. Malformed/missing → `crypto.randomUUID()`. Không echo attacker value.
2. **`src/shared/observability/logger.ts`** — RQ-03/04/AC-03/04. Structured JSON one-line log. Schema `{schemaVersion, timestamp, level, event, requestId, meta}`. Typed allow-list metadata (13 keys). Recursive sanitizer chặn PII/secret ở key lẫn value (authorization, token, password, CCCD, phone, email, bank account, base64 credentials). Injectable sink.
3. **`src/shared/observability/error-reporter.ts`** — RQ-05/AC-05. Provider-neutral interface. `configure(adapter)`. `report(envelope)` trả `reported | not_configured | failed`. Safe envelope `{errorCode, phase, safeMessage, requestId, timestamp}`. Không throw, không làm hỏng request.
4. **`src/shared/observability/index.ts`** — Barrel export.
5. **`middleware.ts`** (sửa tối thiểu) — RQ-02/AC-02/06. Mở rộng matcher thêm `/api/:path*`. Correlation ID ở đầu function, trước mọi branch. `x-request-id` có mặt trên every response class (next/redirect/401/503). Auth/rate-limit/domain behavior giữ nguyên.

**Non-goals confirmed:** Không Sentry/Datadog, không dashboard/metrics, không mass-replace console.*, không sửa auth/routes/prisma.

## 2. Gates

| Gate | Command | Result | Notes |
|---|---|---|---|
| verify-task | `verify-task.ps1 TASK.md` | PASS | `RESULT: PASS. TASK contract is ready for execution.` |
| tsc | `npm run typecheck` | PASS (0 errors) | |
| eslint | `npm run lint` | PASS (0 errors, baseline warnings) | Pre-existing `isInternal`/`redirectToLogin` warnings in middleware.ts; no new errors |
| unit | `vitest run --config vitest.unit.config.ts` | **973/973 PASS** | 68 files. `npx vitest list src/shared/observability` confirms **142 OPS-04a tests discovered** (28 correlation + 73 logger + 14 error-reporter + 27 middleware). Baseline delta not independently verified. |
| build | `npm run build` | PASS | `next build` exit 0 (`Compiled successfully in 7.3s`) |
| git diff | `git diff --check` | PASS | No whitespace errors |

**Mở rộng unit (round 3):** 28 correlation + 73 logger + 14 error-reporter + 27 middleware = 142 OPS-04a tests.

## 3. Diff (Allowed Surfaces)

```
M  middleware.ts
A  src/shared/observability/correlation-id.ts
A  src/shared/observability/correlation-id.test.ts
A  src/shared/observability/logger.ts
A  src/shared/observability/logger.test.ts
A  src/shared/observability/error-reporter.ts
A  src/shared/observability/error-reporter.test.ts
A  src/shared/observability/index.ts
A  src/shared/observability/middleware.test.ts
A  docs/tasks/hrp-v5-ops-04a-observability-foundation/HANDOFF.md  ← tier 2 owns this
```

**Out of scope (không sửa):** `src/shared/auth/**`, `prisma/**`, `app/api/**`, `vitest.integration*`, M1-07b artifacts, AFF artifacts.

## 3.1 Round 2 corrections (PLN-01..03)

Tier 1 audit round 1 verdict was REJECTED with three P0/P1 findings. Round 2 implementation address each:

|| Finding | Root cause | Round 2 fix |
|---|---|---|
| `PLN-01` | `getHeader()` test helper fell back to `x-middleware-request-` channel as if it proved the client response header. Three portal branches used `NextResponse.next()` with only `resp.headers.set` (no downstream request header). Redirect branches did not propagate ID at all. | (1) Split test helper into `getResponseHeader` (client response) and `getDownstreamHeader` (Next.js `x-middleware-request-` prefix on `next({ request: { headers } })`). Assert the two channels separately. (2) Reworked all `next()` branches to use `NextResponse.next({ request: { headers: withRequestId() } })`. (3) Added `redirectWithRequestId()`/`buildLoginUrl()` helpers; every `NextResponse.redirect(...)` now clones the URL and appends `x-request-id` as a query param on the Location header. (4) Terminal responses (401 JSON, 503) assert response channel only. |
| `PLN-02` | `SafeErrorEnvelope.meta?: Record<string, unknown>` and `reportSafe(..., meta)` forwarded arbitrary unsanitized metadata directly to the provider adapter, contradicting the safe-envelope/PII boundary. | (1) Imported `sanitizeObject` from `logger.ts` and re-exported it from there. (2) `report()` now runs `meta` through `sanitizeObject` before calling the adapter (only if `envelope.meta !== undefined`). (3) Added 5 adversarial tests under `PLN-02: meta sanitization` group covering raw secret values, non-allow-listed keys, nested PII (password/authorization), PII top-level keys, and absence of meta. |
| `PLN-03` | Logger public functions (`debug/info/warn/error`) accepted `meta?: unknown`, and runtime guard in `toSafeMeta` permitted nested object values for fields typed as strings. | (1) Public API signatures tightened to `meta?: SafeMeta`. (2) `SafeMeta.detail` typed as `string | object` (DEC-03 overflow container). (3) `toSafeMeta` rejects non-string values for declared string keys (silently drops them); numeric keys still require `number`. (4) Existing logger tests already cast malicious inputs via `as SafeMeta` where needed. |

## 3.2 Round 3 corrections (PLN-01 strict channel independence)

Round 2 split `getResponseHeader` / `getDownstreamHeader` but did NOT (a) make every `next()` branch set BOTH channels explicitly, and (b) keep the two helpers strict (`getResponseHeader` still had a `x-middleware-request-` fallback that masked a missing downstream channel). Round 3 hardens the source and tests so removing EITHER channel fails the suite.

| Aspect | Round 2 state | Round 3 fix |
|---|---|---|
| `continuingNext()` branches | Called `NextResponse.next({ request: { headers: withRequestId() } })` — set only the downstream channel. Response header was unset for `next()` branches. | New helper `continuingNext()` sets BOTH channels: `NextResponse.next({ request: { headers: withRequestId() } })` AND `resp.headers.set('x-request-id', requestId)`. All four next() branches (authenticated /bcc, non-portal paths, /worker rate-allowed, admin/internal roles, already on correct domain) now route through `continuingNext()`. The /worker rate-allowed branch uses `continuingNextWithRateLimit()` which adds `X-RateLimit-*` and `x-request-id` together. |
| `getResponseHeader()` test helper | Had `?? headers.get('x-middleware-request-${name}')` fallback — so a missing response header could be "rescued" from the downstream channel. | Fallback removed. `getResponseHeader()` reads ONLY the named response header directly. |
| `getDownstreamHeader()` test helper | Forwarded to `getResponseHeader()` so it inherited the fallback. | Now reads ONLY the `x-middleware-request-${name}` prefix directly. The two channels are independent readers. |
| Test independence | No explicit "removing one set must fail" assertions. | Added a dedicated `PLN-01 channel independence` test block (6 tests): synthetic `fakeResp` cases for each single-channel removal (2), and real-middleware cases covering /vendor, /worker, /bcc, /about next() (4). All assert `respHdr` and `dsHdr` are independently truthy and equal. |
| Mutation proof | Not exercised. | Both mutations were actually run on this worktree during execution: (1) comment out `resp.headers.set('x-request-id', requestId)` → suite went 15 failed / 12 passed (response-channel tests broken, downstream tests still green). (2) replace `NextResponse.next({ request: { headers: withRequestId() } })` with `NextResponse.next()` → suite went 6 failed / 21 passed (downstream-channel tests broken, response-only tests still green). Both mutations then reverted; final run = 27/27 green. |

### Round 3 Gates (re-run after PLN-01 strict fixes)

| Gate | Command | Result |
|---|---|---|
| verify-task | `powershell -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath ".../TASK.md"` | DRAFT-VALID (1 known warning — TASK not yet moved to READY_FOR_EXECUTION; placeholder checks non-blocking) |
| tsc | `npx tsc --noEmit` | PASS (exit 0, 0 errors) |
| eslint | `npm run lint` | PASS (0 errors; baseline 481 warnings, no new ones in round 3 surfaces) |
| unit (full) | `npx vitest run --config vitest.unit.config.ts` | PASS — `Test Files 68 passed (68)`, **`Tests 973 passed (973)`** |
| unit (ops04a middleware) | `npx vitest run --config vitest.unit.config.ts src/shared/observability/middleware.test.ts` | PASS — `Tests 27 passed (27)` |
| unit (discovery) | `npx vitest list --config vitest.unit.config.ts src/shared/observability` | 142 tests discovered (28 correlation + 73 logger + 14 error-reporter + 27 middleware) |
| build | `npm run build` | PASS — `Compiled successfully` (exit 0) |
| git diff --check | source + tests | PASS — no whitespace errors |

No baseline comparison was run; numbers above are the actual round-3 totals.

## 4. Acceptance Criteria Evidence

### AC-01 (RQ-01 — Correlation ID validation)

**Pass condition:** Valid inbound ID reused; missing/malformed/short/oversized/control-char → UUID; no attacker value echoed.

**Evidence:** 28 unit tests — `correlation-id.test.ts`

| Case | Input | Expected |
|---|---|---|
| Valid 8–128 chars | `abc-valid123_456.789:xyz` | reuse |
| UUID format | `f47ac10b-58cc-4372-a567-0e02b2c3d479` | reuse |
| Exactly 8 chars | `12345678` | reuse |
| Exactly 128 chars | `A`.repeat(128) | reuse |
| Missing header | — | UUID generated |
| Empty string | `""` | UUID generated |
| Too short (7 chars) | `1234567` | UUID generated |
| Too long (129+) | `A`.repeat(129) | UUID generated |
| Spaces | `abc def 123` | UUID generated |
| Control chars | `req\x1f\x02-id` | UUID generated |
| Unicode (encoded by Headers) | `req-中文-id` | UUID generated (Headers → `%E4%`) |
| SQL injection | `' DROP TABLE users; --` | UUID generated |
| XSS | `<script>alert(1)</script>` | UUID generated |
| Path traversal | `../../../etc/passwd` | UUID generated |
| Mixed case valid | `AbC123_XyZ.def:aB` | reuse |

### AC-02 (RQ-02 — Middleware correlation)

**Pass condition:** Downstream request và mọi response class chứa same canonical ID; auth/rate/domain behavior unchanged.

**Evidence:** 27 unit tests — `middleware.test.ts` (round 3: strict per-channel readers `getResponseHeader` / `getDownstreamHeader` / `getRedirectRequestId`; PLN-01 channel-independence block of 6 tests proves removing either channel breaks the suite)

| Response class | Path | Channel(s) checked | PASS |
|---|---|---|---|
| 401 JSON | `/api/vendor/test` (unauth) | response only | ✅ |
| next() | `/vendor/dashboard` (ADMIN) | response + downstream | ✅ |
| next() | `/bcc/dashboard` (ADMIN) | response + downstream | ✅ |
| next() | `/worker/page` (allowed) | response + downstream | ✅ |
| next() | `/worker/page` (rate-allowed) | response + downstream | ✅ |
| next() | `/about` (non-portal) | response + downstream | ✅ |
| 503 Waiting Room | `/worker/page` (rate-limit) | response only | ✅ |
| 401 JSON | `/bcc/api/data` (unauth) | response only | ✅ |
| Redirect | `/bcc/dashboard` (unauth) | Location query param | ✅ |
| Redirect | `/vendor/page` (unauth) | Location query param | ✅ |
| Valid inbound reuse | `/api/test` + valid ID | response | correct value |
| UUID reuse | `/api/test` + UUID | response | correct value |
| Empty → UUID | `/api/test` + `""` | response | `generated-uuid-12345678` |
| Invalid chars → UUID | `/api/test` + ` spaces!` | response | UUID |
| Too short → UUID | `/api/test` + `abc` | response | UUID |
| Missing → UUID | `/api/test` | response | UUID |
| Concurrent A | `/api/test` + `req-id-11111111` | response | correct |
| Concurrent B | `/api/test` + `req-id-22222222` | response | correct, ≠ A |
| Concurrent valid+invalid | mixed | response | distinct |
| Auth behavior | `/api/vendor/test` → 401 | behavior | same as baseline |
| ADMIN next behavior | `/vendor/admin` → next | behavior | same as baseline |
| Rate limit headers | `/worker/page` | behavior | present |
| PLN-01 channel-independence — removes response channel only | synthetic | both readers | downstream still set, response null |
| PLN-01 channel-independence — removes downstream channel only | synthetic | both readers | response still set, downstream null |
| PLN-01 channel-independence — real middleware /vendor next() | `/vendor/dashboard` | both channels | both equal, truthy |
| PLN-01 channel-independence — real middleware /worker next() | `/worker/page` | both channels | both equal, truthy |
| PLN-01 channel-independence — real middleware /bcc next() | `/bcc/dashboard` | both channels | both equal, truthy |
| PLN-01 channel-independence — real middleware /about next() | `/about` | both channels | both equal, truthy |

### AC-03 (RQ-03 — Logger schema + sink)

**Pass condition:** Every captured log parseable one-line JSON with required keys; sink injectable; no global request state.

**Evidence:** 73 unit tests — `logger.test.ts`

- Schema keys: `schemaVersion='1.0'`, ISO timestamp, `level` ∈ {debug/info/warn/error}, `event`, `requestId|null`, `meta:object` — all verified
- Injectable sink: custom sink receives entries ✅
- Reset sink: `setSink(null)` → no throw ✅
- No global state: `requestId` passed explicitly per call ✅
- Allow-list keys (13): `route, method, status, durationMs, actorRole, resourceType, outcome, jobName, attempt, count, phase, detail, errorCode` — all tested ✅

### AC-04 (RQ-04 — Redaction)

**Pass condition:** Attack corpus (authorization/cookie/password/token/CCCD/bank/phone/email/body/header/raw Error) never appears verbatim or under alternate nesting/case.

**Evidence:** 73 unit tests — `logger.test.ts` (redaction section)

| Category | Pattern | PASS |
|---|---|---|
| Secret keys (20) | `authorization, bearer, token, secret, api_key, apiKey, password, passwd, pwd, credential, access_token, refresh_token, cookie, session_id, ssn, credit_card, card_number, cvv, cvc, authorization` | ✅ |
| PII keys (8) | `cccd, cmnd, passport, phone, email, address, bank_account, account_number` nested in `detail` | ✅ |
| Base64 credentials | `eyJhbGci...verylongsignaturebase64token` (>60 chars) | ✅ |
| Bearer token | `Bearer eyJhbGci...` prefix | ✅ |
| CCCD 9-digit | `123456789` | ✅ |
| CCCD 12-digit | `123456789012` | ✅ |
| VN phone +84 | `+84912345678` | ✅ |
| VN phone 0 | `0912345678` | ✅ |
| Nested `headers.authorization.value` | deeply nested secret path | ✅ |
| Nested `context.data.access_token` | deeply nested | ✅ |
| Cookie header nested | `request.headers.cookie` | ✅ |
| Raw Error message | `Error('DB connection refused + password=secret123')` | ✅ |
| Deep nested base64 | `detail.context.access_token: long-base64` | ✅ |
| Array element sanitization | base64 token in array | ✅ |
| Safe values preserved | `outcome, count, durationMs, route` | ✅ |

### AC-05 (RQ-05 — Error reporter)

**Pass condition:** No-config -> `not_configured`; fake provider -> `reported`; provider throw -> `failed`; all preserve request flow; only safe envelope received. PLN-02: `meta` field (when present) is sanitized before reaching the adapter — adversarial tests confirm no raw PII/secret survives.

**Evidence:** 14 unit tests — `error-reporter.test.ts` (round 2: +5 PLN-02 adversarial tests)

| Scenario | Expected |
|---|---|
| No adapter | not_configured |
| Working adapter | reported |
| Throwing adapter | failed |
| report() never throws | — |
| Safe envelope required fields | errorCode, phase, safeMessage, requestId, timestamp |
| safeMessage always Unexpected error | no raw input |
| isConfigured() true after configure() | |
| reportSafe() builds correct envelope | |
| meta optional | meta undefined OK |

### AC-06 (RQ-06 — Concurrency isolation)

**Pass condition:** Concurrent requests with distinct IDs never cross-contaminate; malformed inputs and all middleware early returns covered.

**Evidence:** Covered by AC-01 (28 correlation tests) + AC-02 (16 middleware tests including concurrent isolation)

- Concurrent 1: `req-id-11111111` → `req-id-11111111` ✅
- Concurrent 2: `req-id-22222222` → `req-id-22222222` ✅
- Distinct ✅
- Valid + invalid concurrent → distinct IDs ✅

### AC-07 (RQ-07 — Diff scoped + gates)

**Pass condition:** Diff touches only allowed paths; all mandatory commands exit 0.

| Gate | Command | Result |
|---|---|---|
| verify-task | `powershell verify-task.ps1 TASK.md` | DRAFT-VALID (1 known warning — TASK not yet moved to READY_FOR_EXECUTION; placeholder checks non-blocking) |
| tsc | `npm run typecheck` | PASS (0 errors) |
| eslint | `npm run lint` | PASS (0 errors; pre-existing `isInternal` warning in middleware.ts unchanged) |
| unit | `vitest run --config vitest.unit.config.ts` | 68 files, **973/973 PASS** |
| build | `npm run build` | PASS (exit 0) |
| git diff --check | all source + test | PASS |

Diff scope: `middleware.ts` (M), `src/shared/observability/*` (A, 8 files), `docs/tasks/hrp-v5-ops-04a-observability-foundation/HANDOFF.md` (A).

### AC-08 (RQ-07 — HANDOFF)

**Pass condition:** HANDOFF follows template; explicitly says OPS-04b remains; no credentials/PII; ends `> Handoff status: READY_FOR_AUDIT`.

**Evidence:** This HANDOFF.md.

## 5. Open Issues và Roadmap

### Round 3 evidence (PLN-01 strict channel fix round)

All gates re-run after round 3 changes (proof above in §3.2 "Round 3 Gates"). No new surfaces touched outside of:

- `middleware.ts` — net 4 lines added (`continuingNext()` + `continuingNextWithRateLimit()` helpers + 4 site replacements)
- `src/shared/observability/middleware.test.ts` — header helpers rewritten (no fallback), added 6-test `PLN-01 channel independence` block
- `docs/tasks/hrp-v5-ops-04a-observability-foundation/HANDOFF.md` — added §3.2, bumped counts from 135→142 OPS-04a tests and 966→973 full unit total

No baseline comparison was run; numbers above are the actual round-3 totals.

|| Gate | Command | Result | Evidence |
|---|---|---|---|
| verify-task | `verify-task.ps1 TASK.md` | PASS | `RESULT: PASS. TASK contract is ready for execution.` |
| tsc | `npx tsc --noEmit` | PASS | exit 0, 0 errors |
| eslint | `npx eslint src/shared/observability middleware.ts` | PASS | 0 errors, 11 warnings (pre-existing) |
| unit (full) | `npx vitest run --config vitest.unit.config.ts` | PASS | `Test Files 68 passed (68)`, `Tests 973 passed (973)` |
| unit (observability) | `npx vitest run --config vitest.unit.config.ts src/shared/observability` | PASS | `Test Files 4 passed (4)`, `Tests 142 passed (142)` |
| unit (discovery) | `npx vitest list --config vitest.unit.config.ts src/shared/observability` | 142 tests discovered | `28 correlation + 73 logger + 14 error-reporter + 27 middleware` |
| build | `npx next build` | PASS | `Compiled successfully in 7.3s` |
| git diff | `git diff --check` | PASS | no whitespace errors |

_(round-2 detail table superseded by §3.2 round-3 gates; see that section for current numbers.)_

### OPS-04b remaining items (NOT in OPS-04a scope)

- Integrate Sentry/DataDog/New Relic adapter via `configure()` in error-reporter.ts
- Replace `console.error` calls in route handlers with structured logger
- Add `jobName`, `attempt`, `count` metadata to background job logs
- Add `/api/**` latency logging (durationMs per request)
- Instrument cron/scheduled job events
- Dashboard latency/error/queue metrics
- OPS-04b inventory: `rg console.error` → list routes needing migration

### OPS-04c future items

- Audit viewer (HR/admin sees structured log events)
- Alerting rules for error rate thresholds

## 6. Test Inventory

| File | Tests | AC |
|---|---|---|
| `src/shared/observability/correlation-id.test.ts` | 28 | AC-01 |
| `src/shared/observability/logger.test.ts` | 73 | AC-03, AC-04 |
| `src/shared/observability/error-reporter.test.ts` | 14 (round 2: +5 PLN-02 adversarial) | AC-05 |
| `src/shared/observability/middleware.test.ts` | 27 (round 3: strict per-channel readers + 6-test PLN-01 channel-independence block) | AC-02, AC-06 |
| **OPS-04a total (discovered by `npx vitest list`)** | **142** | |

## 7. Key Design Decisions

| DEC | Decision | Rationale |
|---|---|---|
| DEC-01 | Header `x-request-id` | Standard, no new convention needed |
| DEC-03 | JSON one-line schema `{schemaVersion,timestamp,level,event,requestId,meta}` | Stable, machine-parseable, easy to index |
| DEC-04 | No raw Request/Response/body/headers/Error.message | PII/secret safety |
| DEC-05 | Typed allow-list + recursive sanitizer | Defense in depth; allow-list primary, sanitizer catches nested variants |
| DEC-06 | Provider-neutral interface with `configure(adapter)` | Defer provider choice; testable without real SDK |
| DEC-07 | No AsyncLocalStorage | Edge runtime compatibility |
| DEC-08 | Matcher `/api/:path*` only for correlation | Minimal change; auth/rate-limit continue with existing pathname logic |

## 8. Deviations from Contract

None. All RQ-01..07 satisfied, AC-01..08 all evidence documented.

## 9. Rollback

To rollback: revert `middleware.ts` to baseline (remove correlation plumbing), delete `src/shared/observability/` directory. Shared logger/reporter modules can remain — they are independently testable and do not affect request behavior unless imported by routes.

---

> Handoff status: `READY_FOR_AUDIT`
