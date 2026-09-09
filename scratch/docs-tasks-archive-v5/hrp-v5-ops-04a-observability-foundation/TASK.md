# TASK: hrp-v5-ops-04a-observability-foundation

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-ops-04a-observability-foundation` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` — Audit round 3 PASS accepted; `PLN-01..03` closed and OPS-04a foundation is complete |
| Planner | Tier 1 |
| Executor | Tier 2-B — separate Git worktree |
| Auditor | Tier 3 independent context |
| Baseline | `3e627e9db2ec8627a3f5be6e58424263510ecbac` — committed source baseline; main worktree's uncommitted M1-07a/M1-06d/AFF changes are excluded |
| Modules | `V5-OPS-04a / correlation ID / structured safe logger / error-reporter port` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.11 `V5-OPS-04`; Living Handoff §8–9; DEC-14 no-secret/PII evidence rule |
| Current execution round | `3` |
| Current audit round | `3` |
| Next gate | `CLOSED` — continue the roadmap through the single Tier 2 stream; provider integration and route/job instrumentation remain OPS-04b |
| Updated | `2026-08-27 Asia/Bangkok` |

### Dependency and parallel-execution gate

| Dependency | Evidence | Status / stop condition |
|---|---|---|
| Marketplace MVP | MP-1..MP-3C task chain is accepted | Satisfied; OPS-04 may proceed independently |
| M1-07b | Separate DRAFT contract and disjoint expected paths | Not a dependency. This task must not edit RLS/auth-context/migration/security-matrix files |
| Stable worktree | Baseline is committed while primary workspace is dirty | Required: create a separate Git worktree/branch from the pinned baseline or the Tier 1 docs commit containing this TASK; never implement in `C:\CodeApp\HrP` |
| External observability account | No Sentry DSN/provider is supplied | Not required for OPS-04a. Provider SDK/hosted dashboard belongs OPS-04b; do not fabricate LIVE provider evidence |

## 1. Outcome

### User-visible outcome

Mọi request đi qua Next middleware tới `/api/**` có một correlation ID hợp lệ và nhận lại chính ID đó trong response, kể cả request public, authenticated, unauthorized hoặc bị rate-limit. Khi hệ thống ghi operational event, log có JSON schema ổn định, một dòng, có request ID để truy vết nhưng không chứa token, cookie, request body, header thô, CCCD, tài khoản ngân hàng, số điện thoại/email hoặc raw error message/stack.

Task tạo một observability foundation dùng chung và test được: correlation utility, safe structured logger và provider-neutral error-reporter port. OPS-04a không tuyên bố Sentry/dashboard/job metrics đã hoàn tất; nó tạo boundary an toàn để OPS-04b kết nối provider và instrument route/job mà không phát tán `console.error` tùy tiện.

### Non-goals

- Không tích hợp Sentry/Datadog hoặc yêu cầu DSN/token/account bên ngoài trong task này.
- Không tạo dashboard latency/error/queue depth, audit viewer hoặc job instrumentation; đó là OPS-04b/04c.
- Không thay toàn bộ `console.*` hiện hữu; chỉ ngăn module mới tạo log thô và ghi inventory follow-up.
- Không sửa behavior auth, domain redirect, waiting room, rate-limit threshold, response body/status hoặc route handler.
- Không sửa `src/shared/auth/**`, `prisma/**`, `app/api/**`, `vitest.integration*`, M1-07b artifacts hoặc AFF artifacts.
- Không thêm dependency NPM nếu platform Web Crypto/Node primitives và dependency hiện hữu đã đủ.
- Không ghi secret/PII thật vào source, fixture, log hoặc HANDOFF.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md:274` | OPS-04 yêu cầu error tracking, structured log, correlation ID, job metrics, audit viewer và PII-safe logs | Chia foundation nhỏ; giữ roadmap item open sau OPS-04a |
| `EV-02` | CodeGraph + `rg` snapshot 2026-08-27 | Không có observability/logger/correlation/Sentry module hoặc package; chỉ có audit custom-logger hook | Đây là greenfield shared foundation, không được tuyên bố provider đã có |
| `EV-03` | `middleware.ts` | Middleware có nhiều early return: next, redirect, JSON 401 và waiting-room 503; matcher chưa phủ toàn bộ `/api/**` | Correlation phải hiện diện nhất quán trên mọi response class mà không đổi behavior |
| `EV-04` | `middleware.ts` | Middleware đang giữ portal auth/domain/rate-limit logic, gồm in-memory state | Chỉ thêm correlation plumbing; không refactor/rip-and-replace logic ngoài scope |
| `EV-05` | `rg console.*` snapshot | Nhiều route ghi raw `console.error`, một số truyền Error object | OPS-04a phải thiết kế logger safe-by-default; mass migration để follow-up |
| `EV-06` | `src/shared/integrity/audit.ts` | Domain audit có injectable custom logger hook nhưng không phải operational logger | Không thay audit ledger; error-reporter port có thể tích hợp sau mà không trộn hai khái niệm |
| `EV-07` | Git status snapshot | Primary worktree chứa accepted/uncommitted security work và AFF docs | Tier 2-B phải dùng separate worktree và exact path staging |

Evidence method: CodeGraph trước, rồi source/package/Git read-only inspection. Không dùng comments như runtime proof.

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Correlation ID canonical header là `x-request-id`. Inbound value chỉ reuse nếu dài 8–128 và match `[A-Za-z0-9._:-]+`; value khác được thay bằng `crypto.randomUUID()`. | Tier 1 | Final |
| `DEC-02` | CHOSEN | Correlation được inject vào downstream request headers và mọi middleware response cho `/api/**`; page matcher hiện hữu giữ behavior cũ. | EV-03 | Final |
| `DEC-03` | CHOSEN | Logger output là một JSON object/một dòng với schema version, ISO timestamp, level, event, requestId và safe metadata allow-list. | Structured logging | Final |
| `DEC-04` | CHOSEN | Không log raw Request/Response/body/query/headers/cookies/authorization; không log raw `Error.message`, cause hoặc stack trong default production sink. | PII/secret safety | Final |
| `DEC-05` | CHOSEN | Typed metadata allow-list gồm operational values như `route`, `method`, `status`, `durationMs`, `actorRole`, `resourceType`, `outcome`, `jobName`, `attempt`, `count`; không nhận arbitrary object. Recursive sanitizer vẫn là defense-in-depth. | Tier 1 | Final |
| `DEC-06` | CHOSEN | Error reporter là provider-neutral interface với injectable implementation. Missing provider phải deterministic no-op/result, không throw và không tự giả là “reported”. | No external account | Final |
| `DEC-07` | CHOSEN | OPS-04a không dùng AsyncLocalStorage trong Edge middleware. Context phải truyền rõ qua header/typed parameter để tương thích Next runtime. | Runtime portability | Final |
| `DEC-08` | CHOSEN | Mở rộng middleware matcher tới `/api/:path*` chỉ để correlation; auth/domain/rate limiting tiếp tục quyết định theo pathname như hiện tại. | EV-03/04 | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Correlation utility validate/reuse/generate ID theo DEC-01, không throw trên malformed/missing input. | Must | DEC-01 | Invalid input → new UUID, không echo attacker-controlled value |
| `RQ-02` | Middleware phủ `/api/**`, truyền canonical ID downstream và trả `x-request-id` trên next/redirect/401/503; giữ nguyên status/body/location/rate-limit/auth behavior. | Must P0 | EV-03/04, DEC-02/08 | Thiếu header hoặc behavior regression → FAIL |
| `RQ-03` | Structured logger tạo deterministic one-line JSON schema, typed safe metadata và injectable sink; không log raw object. | Must | DEC-03/05 | Invalid event/metadata bị reject hoặc sanitize; không fallback raw stringify |
| `RQ-04` | Redaction/safety chặn credential/PII ở key lẫn nested value patterns; raw request/error/header/body không đi vào default sink. | Must P0 | DEC-04/05 | Secret/PII xuất hiện trong captured output → FAIL |
| `RQ-05` | Provider-neutral error reporter nhận safe envelope, liên kết requestId và trả trạng thái truthful (`reported`/`not_configured`/`failed`) mà không làm hỏng request. | Must | DEC-06 | Provider thiếu/lỗi → safe result, không throw, không log payload thô |
| `RQ-06` | Unit/static/middleware regression tests phủ valid/invalid ID, all response classes, concurrency isolation, log schema/redaction và provider failure. | Must P0 | RQ-01..05 | Missing branch/concurrent ID mixing → FAIL |
| `RQ-07` | Diff chỉ gồm declared surfaces; mandatory gates pass; HANDOFF không chứa secret/PII và ghi rõ OPS-04 còn chưa hoàn tất. | Must | Scope/pipeline | Co-mingled diff, false completion hoặc red gate → no audit |

### 4.2 Scope boundaries

**In scope:**

- `middleware.ts` — minimal correlation plumbing and `/api/:path*` matcher coverage.
- New `src/shared/observability/correlation-id.ts`.
- New `src/shared/observability/logger.ts`.
- New `src/shared/observability/error-reporter.ts`.
- Optional `src/shared/observability/index.ts` barrel.
- Co-located unit tests, plus one focused middleware test file.
- Tier 2-owned `docs/tasks/hrp-v5-ops-04a-observability-foundation/HANDOFF.md`.

**Out of scope / protected paths:**

- `src/shared/auth/**`, `prisma/**`, `app/api/**`, integration DB configuration/tests.
- Package manifests/lockfiles unless Tier 2 stops and obtains Tier 1 revision.
- Existing audit ledger semantics and ticket custom audit logger.
- Mass replacement of `console.*`, provider SDK/config, hosted dashboard and production deployment.
- Primary dirty worktree and every unrelated untracked file.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Request ID is opaque operational metadata, never derived from user/email/phone/token. Logger metadata is an allow-listed flat/safely normalized record; arbitrary objects are rejected/sanitized.
- **State:** Correlation has request lifetime only. No global mutable current-request ID; concurrent requests cannot mix IDs. Existing rate-limit map/state remains untouched.
- **Permission/data scope:** Observability foundation does not grant access or expose actor identity. `actorRole` may be logged; `userId`, worker/vendor/CTV IDs and business row IDs are excluded in OPS-04a.
- **Interface:** `x-request-id`; structured schema at least `{schemaVersion,timestamp,level,event,requestId,meta}`; error reporter returns explicit outcome and never exposes provider error to HTTP response.
- **Failure/idempotency/concurrency:** Same valid inbound ID remains stable for one request; retry with same inbound ID may reuse it but creates separate log events. Invalid/missing ID gets new UUID. Sink/provider failure is contained and test-observable, not silently claimed successful.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | RQ-07 | Separate worktree | Create isolated branch/worktree and confirm baseline/protected paths | Git | status/log and no primary WIP copied | Cannot isolate worktree or baseline mismatch |
| `STEP-01` | RQ-01 | correlation utility | Pure validate/reuse/generate API with Web Crypto-compatible UUID | Platform crypto | Unit cases including malicious/oversized input | Requires new package/runtime-incompatible API |
| `STEP-02` | RQ-02 | middleware | Propagate request/response ID across all API response classes, preserve portal behavior | Existing middleware | Focused middleware tests | Auth/rate/domain semantics must be redesigned |
| `STEP-03` | RQ-03/04 | logger | Typed JSON envelope, allow-list, recursive sanitizer and injectable sink | No external provider | Snapshot/schema/redaction tests | API requires arbitrary raw payload/error logging |
| `STEP-04` | RQ-05 | error reporter | Provider port + safe envelope + truthful result/failure containment | Logger types | Fake provider/no-provider/failing-provider tests | Needs DSN/account/provider SDK |
| `STEP-05` | RQ-06 | tests | Concurrency isolation, all middleware returns, redaction attack corpus | Vitest | Focused tests pass with no skipped cases | Any real secret/PII fixture required |
| `STEP-06` | RQ-07 | gates + HANDOFF | Run gates, inventory remaining console/provider/dashboard gaps, write scoped evidence | Pipeline | Commands exit 0 and diff scoped | Security/source overlap or regression |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Valid inbound ID is reused; missing/malformed/short/oversized/control-character ID becomes UUID; no attacker value echoed. | Unit tests | Case matrix and pass count | Yes |
| `AC-02` | RQ-02 | Downstream API request and every next/redirect/401/503 response contain same canonical ID; public/login/portal/auth/rate behavior unchanged. | Focused middleware tests | Before/after contract assertions, response-class matrix | Yes P0 |
| `AC-03` | RQ-03 | Every captured log is parseable one-line JSON with exact required keys/types; sink is injectable and no global request state exists. | Unit/schema tests + source inspection | Representative sanitized events | Yes |
| `AC-04` | RQ-04 | Attack corpus containing authorization/cookie/password/token/CCCD/bank/phone/email/body/header/raw Error never appears verbatim or under alternate case/nesting. | Redaction tests + captured-output scan | Corpus categories and zero-match result | Yes P0 |
| `AC-05` | RQ-05 | No-provider=`not_configured`; fake provider=`reported`; provider throw=`failed`; all preserve request flow and only receive safe envelope/requestId. | Unit tests | Three outcomes and non-throw proof | Yes |
| `AC-06` | RQ-06 | Concurrent requests with distinct IDs never cross-contaminate; malformed inputs and all middleware early returns are covered without skip. | Concurrent/focused test | IDs and test totals | Yes P0 |
| `AC-07` | RQ-07 | Verify-task, typecheck, lint, unit, build and middleware-focused tests pass; diff touches only allowed paths. | Commands + `git diff` | Exit codes, counts and name-status | Yes |
| `AC-08` | RQ-07 | HANDOFF follows template, explicitly says OPS-04b remains, contains no credentials/PII and ends `> Handoff status: READY_FOR_AUDIT`. | Artifact verification | HANDOFF path/check output | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-03`, `STEP-05` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-05` | `AC-06` |
| `RQ-07` | `STEP-00`, `STEP-06` | `AC-07`, `AC-08` |

### Mandatory commands

```powershell
.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs\tasks\hrp-v5-ops-04a-observability-foundation\TASK.md
npx tsc --noEmit
npx eslint .
npx vitest run --config vitest.unit.config.ts
npm run build
git diff --check -- middleware.ts src/shared/observability docs/tasks/hrp-v5-ops-04a-observability-foundation/HANDOFF.md
git diff --name-status 3e627e9db2ec8627a3f5be6e58424263510ecbac
```

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Two Tier 2 sessions corrupt shared WIP | Tier 2-B edits primary workspace | Dedicated worktree + exact staging | Stop, preserve main WIP, recreate branch from baseline |
| `RISK-02` | Expanding matcher changes auth/public behavior | Status/body/redirect differs | Correlation logic before branches + response matrix tests | Revert matcher/middleware commit; shared modules remain isolated |
| `RISK-03` | Log sanitizer creates false safety | Sensitive value appears under nested/case variant | Typed allow-list plus defense-in-depth corpus | Disable sink/use no-op reporter until forward fix |
| `RISK-04` | Error reporting failure breaks request | Provider throws | Catch at adapter boundary, truthful `failed` result | Configure no-op reporter; no route failure |
| `RISK-05` | Request IDs mix under concurrency | Global mutable context introduced | Explicit header/parameter; DEC-07 | Revert global state and add regression test |
| `RISK-06` | Task is mislabeled as full OPS-04 | HANDOFF claims Sentry/dashboard complete | Explicit non-goals and AC-08 | Tier 1 rejects claim; keep OPS-04b on roadmap |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | None. Provider/account choices are intentionally deferred to OPS-04b. | — | — | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `AUD verdict PASS` | `REJECT` | Audit evidence accepted the test helper's fallback to `x-middleware-request-x-request-id` as proof of a client response header and did not inspect unsanitized reporter `meta`; high-risk spot-check contradicts AC-02/04/05 | None; implementation correction under existing RQ/AC | Tier 2-B fixes `PLN-01..03`; Tier 3 independently re-audits round 2 |
| `1` | `PLN-01` | `ACCEPT_FIX — P0` | `NextResponse.next({request:{headers}})` propagates an upstream request header but does not itself set the client response header. Other allowed portal branches set only `resp.headers`, so downstream request context is missing. Test helper `getHeader()` treats either channel as one value and creates a false PASS | None; enforce both channels already required by RQ-02/AC-02 | Every continuing branch must set downstream request `x-request-id` and client response `x-request-id`; tests assert the two channels separately. Terminal 401/redirect/503 asserts response only |
| `1` | `PLN-02` | `ACCEPT_FIX — P0` | `SafeErrorEnvelope.meta?: Record<string, unknown>` and `reportSafe(..., meta)` forward arbitrary unsanitized metadata directly to provider adapter, contradicting the safe-envelope/PII boundary | None; RQ-04/05 already prohibit raw payload | Remove arbitrary `meta` from reporter envelope/API or run it through the same reviewed safe allow-list sanitizer before adapter; adversarial nested secret/PII test must prove provider receives no raw value |
| `1` | `PLN-03` | `ACCEPT_FIX — P1` | Logger public functions accept `meta?: unknown`, and runtime guard permits nested object values for fields typed as strings, contradicting the typed flat allow-list in DEC-03/05 and RQ-03 | None; tighten existing logger contract | Public API accepts `SafeMeta`; runtime rejects non-number/non-string values for their declared keys. Adversarial tests may cast malformed runtime input but production typing must remain strict |
| `2` | `AUD verdict PASS` | `REJECT` | Round-2 spot-check of worktree source contradicts the PASS on the remaining P0. `middleware.ts` continuing/next branches (`/bcc` authed L208, non-portal L217, rate-allowed L241-244, admin L266, correct-domain L273) call `NextResponse.next({request:{headers:withRequestId()}})` but none set the **client response** header `x-request-id`; only Next's internal `x-middleware-request-*` downstream channel is populated (stripped before the client). PLN-02/PLN-03 are genuinely fixed; the P0 is not. | None | Tier 2-B fixes PLN-01 residual; Tier 3 re-audits round 3 by reading the source, not counting green tests |
| `2` | `PLN-01` | `REVISION_REQUIRED — P0 OPEN` | Regression on the client channel: round 1 had some branches call `resp.headers.set('x-request-id')`; round 2 rewrote every continuing branch to downstream-request-only and dropped that. Root cause of the false PASS: `middleware.test.ts` helper `getResponseHeader` (L53-57) still returns `headers.get(name) ?? headers.get('x-middleware-request-'+name)`, so the "response AND downstream" assertions (L131-161) both read the SAME downstream channel — identical mechanism to the round-1 defect. | None; RQ-02/AC-02 already require both channels | Round 3 MUST: (a) every next/continuing branch sets BOTH `next({request:{headers:withRequestId()}})` AND `resp.headers.set('x-request-id', requestId)` on the returned response; (b) fix `getResponseHeader` to read ONLY the real response header (delete the `x-middleware-request-` fallback) and `getDownstreamHeader` to read ONLY `x-middleware-request-x-request-id`; (c) each next-branch test asserts the two channels INDEPENDENTLY so deleting either `set` fails a test. Terminals keep response-only. |
| `2` | `PLN-02` | `ACCEPT_FIX — P0 CLOSED` | Verified `error-reporter.ts` L64-78: `report()` runs `sanitizeObject(envelope.meta)` before `_adapter`; `reportSafe` routes through `report`. `error-reporter.test.ts` L141-252: 5 adversarial tests capture the adapter's envelope and assert `[REDACTED]` for authorization/password/phone/email/ssn and stripping of non-allow-listed keys. | None | Closed |
| `2` | `PLN-03` | `ACCEPT_FIX — P1 CLOSED` | Verified `logger.ts`: public `debug/info/warn/error` now take `meta?: SafeMeta` (L234-258); `toSafeMeta` requires `number` for numeric keys, rejects non-string for string keys, and `detail` is the declared `string\|object` overflow container sanitized upstream by `sanitizeObject`. | None | Closed |
| `3` | `PLN-01` | `ACCEPT_FIX — P0 CLOSED` | Planner source inspection confirms every continuing branch now sets both channels: `NextResponse.next({request:{headers:withRequestId()}})` for downstream and `resp.headers.set('x-request-id', requestId)` for the client. The test readers are strict and independent; deleting either channel breaks the dedicated assertions. | None | Closed by source commit `8aa8968`; 27 middleware tests PASS |
| `3` | `AUD verdict PASS` | `ACCEPT` | Tier 3 inspected the source and verified the strict two-channel boundary. Tier 1 independently reran the focused lane (`142/142`) and full unit lane (`973/973`), normalized one stale HANDOFF count table, and reran `verify-audit.ps1` with `RESULT: PASS`. | None | Task accepted; evidence archived in `16ba507`; Tier 2-B retired |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-27` | Initial READY contract for a provider-neutral, PII-safe observability foundation that can execute parallel to M1-07b. | Owner requested useful work for a second Tier 2; CodeGraph/source survey found no existing foundation. |
| `v1.0` | `2026-08-27` | Audit round 1 PASS rejected; execution round 2 opened for separate request/response correlation proof and strict PII-safe logger/reporter boundaries. Contract semantics unchanged. | Planner findings `PLN-01..03`. |
| `v1.0` | `2026-08-27` | Audit round 2 PASS rejected; execution round 3 opened. PLN-02 (reporter meta sanitize) and PLN-03 (strict SafeMeta typing) verified closed; PLN-01 (P0) still open — continuing branches set only Next's downstream request channel and `middleware.test.ts` `getResponseHeader` still conflates the two channels, reproducing the round-1 false PASS. Contract semantics unchanged. | Planner spot-check of round-2 worktree source; PLN-01 residual + test-helper defect. |
| `v1.0` | `2026-08-27` | Audit round 3 PASS accepted. Closed PLN-01 with independent client/downstream correlation channels and truthful tests; OPS-04a completed without claiming OPS-04b provider/dashboard/instrumentation scope. | Tier 3 `AUDIT.md`; Planner independent test rerun and source inspection. |
