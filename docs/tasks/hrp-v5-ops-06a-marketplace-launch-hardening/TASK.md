# TASK: hrp-v5-ops-06a-marketplace-launch-hardening

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-ops-06a-marketplace-launch-hardening` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | `Tier 1 / Codex` |
| Executor | `Tier 2` — một luồng duy nhất |
| Auditor | `Tier 3 independent context` |
| Baseline | `d9a1067` — M1-09A đã ACCEPTED/push; Tier 1 launch review + runbook đã commit |
| Modules | `V5-OPS-06A / V5-OPS-02 marketplace subset / §7.9.7 criteria 1, 2, 8` |
| ADR references | `UNIFIED_PLAN_v5.md §4.11 OPS-02/OPS-06, §7.9.2, §7.9.4, §7.9.7`; Owner decision 2026-08-28: CV không cần cho tuyển công nhân, raw upload tắt |
| Current execution round | `4` — complete |
| Current audit round | `5` — verdict `PASS` |
| Next gate | `PHASE_REVIEW`: atomic scoped commit/push → production env + Owner runbook drill/smoke → publish one real job |
| Updated | `2026-08-29 Asia/Bangkok` |

### Dependency và sequencing gate

1. `hrp-v5-m1-09a-current-field-projection` đã `ACCEPTED`; commit `a49870e` có trên `origin/main`.
2. Marketplace MP-1/2/3A/3B/3C, M1-06/07/08/09A và single-domain đã audit/ACCEPTED; prod DB đã ngang migration `main`.
3. Đây là **slice launch-specific**, không được tuyên bố hoàn thành toàn bộ OPS-02 hoặc OPS-06. Session invalidation, OTP limiter, CSRF, security headers toàn site, signed URL, backup và bulk-export hardening vẫn là backlog riêng.
4. Owner phải cấp một Upstash Redis test target và env TEST trước LIVE audit. Thiếu env được ghi `ENV_BLOCKED`, không dùng production credential, không mock PASS.
5. Working tree là shared tree. Executor phải giữ nguyên các file layout/metadata, `.neon`, `docs/aff_plan*`, `scratch/**`, `scripts/debug-parser.mjs` và mọi WIP ngoài allowlist; không reset/stash/delete.

## 1. Outcome

### User-visible outcome

Marketplace có thể mở public mà không phụ thuộc counter RAM của từng Vercel instance:

- Người tìm việc vẫn xem danh sách/detail job, gửi form ứng tuyển và tra cứu tracking code; khi vượt ngưỡng nhận `429` rõ ràng cùng thời gian thử lại.
- Public job read, canonical apply và tracking cùng dùng distributed rate-limit trên Upstash Redis; nhiều function instance nhìn thấy cùng counter.
- Chỉ còn một đường ghi application công khai: `POST /api/public/jobs/:slug/applications`. Hai POST legacy không còn tạo dữ liệu.
- Form ứng tuyển production không hiển thị CV và API không chấp nhận raw file/CV metadata object. Ứng viên vẫn gửi họ tên, số điện thoại, CCCD tùy chọn và consent; tracking code giữ nguyên contract MP-2.
- Payload quá lớn, multipart/binary, CV object và spam bị chặn **trước transaction ghi DB**; response không lộ PII, limiter key hay provider detail.

### Product decision về CV và Quick Apply

- CV/raw upload **không được triển khai** trong task này. Vì không nhận file, yêu cầu magic-byte/size của §7.9.7(2) được đóng bằng “upload surface disabled + rejection tests”, không bằng MIME metadata do client tự khai.
- Phone-only “Ứng tuyển nhanh” là UX slice tiếp theo. Task này không được tạo placeholder name, làm nullable `fullName`, thêm table lead hoặc sửa state machine để lách yêu cầu. Form đầy đủ hiện tại vẫn thu được số điện thoại và đủ để go-live có kiểm soát.

### Non-goals

- Không xây R2/presign/upload/download/delete CV; không giữ bytes, base64, object key hoặc metadata CV mới.
- Không tạo phone-only CandidateSubmission, `CandidateLead`, nullable `fullName`, placeholder name hoặc UI Quick Apply.
- Không thay schema, migration, RLS, SECURITY DEFINER function, duplicate guard, tracking projection, screening/conversion/assignment state machine.
- Không harden auth/login/OTP/worker middleware, session invalidation hoặc mọi API ngoài Marketplace public inventory khai báo.
- Không hoàn thành toàn bộ OPS-02/OPS-06; không thêm CSRF framework, CSP/header toàn site, Swagger policy, signed URL hay pagination toàn repo.
- Không deploy production, tạo/xóa Upstash resource, sửa Vercel env, publish job thật, commit/push/merge nếu chưa có chỉ thị riêng.

## 2. Evidence và Baseline

Evidence method: CodeGraph trước, sau đó source/package/Git/Vercel env-name inspection read-only ngày 2026-08-28. Không dùng comments làm runtime proof.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `UNIFIED_PLAN_v5.md §7.9.7(1,2,8)` | Launch gate bắt buộc rate limit public projection/apply/tracking, anti-spam và Tier 3 spam test. | Đây là blocking launch slice. |
| `EV-02` | `app/api/public/jobs/[slug]/applications/route.ts:12-83` | Canonical apply chưa có rate-limit/body cap; chấp nhận `cv` metadata do client khai rồi vào transaction. | Chặn abuse/CV trước DB transaction. |
| `EV-03` | `app/api/public/applications/[trackingCode]/route.ts:14-29`, `src/domains/applications/rate-limit.ts:39-83` | Tracking dùng module-level `Map`, 20/min/instance; Vercel multi-instance không chia counter. | Thay bằng distributed port; không fallback RAM ở production. |
| `EV-04` | `middleware.ts:24-71` | Worker portal có một limiter RAM khác, không áp vào public Marketplace. | Không sửa middleware trong slice này; ghi nợ OPS-02 còn lại. |
| `EV-05` | `app/api/jobs/route.ts:24-64`, `app/api/jobs/apply/route.ts:13-52` | Hai POST legacy vẫn ghi application qua compatibility wrapper dù master plan yêu cầu một public apply path. | Retire cả hai POST bằng `410`, zero DB call. GET `/api/jobs` giữ nguyên. |
| `EV-06` | `app/(portal)/page.tsx` ApplyModal | Landing marketplace vẫn POST `/api/jobs` legacy, không gửi idempotency key/consent theo canonical contract. | Chuyển UI này sang canonical trước khi đóng legacy. |
| `EV-07` | `app/(jobs)/jobs/page.tsx:111-221` | `/jobs` dùng canonical POST nhưng vẫn render file input và gửi `cv` metadata. | Bỏ CV state/control/payload; giữ full form + tracking UX. |
| `EV-08` | `src/domains/applications/application.service.ts`, MP-2 LIVE tests | Idempotency, duplicate slot+phone guard và SECURITY DEFINER write boundary đã được audit. | Không viết lại; limiter đứng trước boundary, regression LIVE bắt buộc. |
| `EV-09` | `package.json` + lockfile | Chưa có Redis/Upstash dependency. | Cho phép thêm đúng dependency serverless REST cần thiết, không thêm framework khác. |
| `EV-10` | `.env.example`; `vercel env ls` chỉ kiểm tên | Chưa khai báo `UPSTASH_REDIS_REST_URL/TOKEN` hoặc limiter hash secret ở project. | Tier 2 thêm names-only docs; Owner provision ngoài repo trước LIVE/prod. |
| `EV-11` | Vercel official request-header docs | Vercel ghi `x-forwarded-for` là public client IP và overwrite header để chống spoof trên platform. | Chỉ trust first hop ở Vercel production; test malformed/missing header. |
| `EV-12` | Upstash official Ratelimit TS docs | SDK hỗ trợ serverless distributed counter; timeout có thể trả success với reason `timeout`. | Adapter phải nhận diện timeout/provider failure và fail closed, không chấp nhận SDK fail-open mặc định. |
| `EV-13` | `docs/runbooks/marketplace-launch-operations.md §7` | Owner đã chọn CV optional/disabled; raw object storage không tồn tại. | Reject upload surface là truthful closure. |

Official references used for implementation compatibility:

- `https://vercel.com/docs/headers/request-headers#x-forwarded-for`
- `https://upstash.com/docs/redis/sdks/ratelimit-ts/overview`
- `https://upstash.com/docs/redis/sdks/ratelimit-ts/features#timeout`

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Dùng provider port + Upstash Redis REST/`@upstash/ratelimit` adapter cho slice Marketplace. Instance/module cache chỉ tối ưu local; Redis là counter source-of-truth. | OPS-02 + Vercel runtime | Final |
| `DEC-02` | `CHOSEN` | Production không có in-memory fallback. Missing/malformed env, provider throw hoặc SDK result `reason=timeout` → `503 RATE_LIMIT_UNAVAILABLE`, `Retry-After: 5`, zero DB call. | Security fail-closed | Final |
| `DEC-03` | `CHOSEN` | Test/unit có injectable deterministic fake/memory adapter. Adapter này không được activate khi `VERCEL_ENV=production`/`NODE_ENV=production`. | Testability | Final |
| `DEC-04` | `CHOSEN` | Default limits: browse list+detail `120/60s/IP`; tracking `20/60s/IP` và `10/60s/tracking-code-HMAC`; apply `10/10min/IP` và `5/60min/normalized-phone-HMAC`. | Tier 1 launch baseline | Final; tune only by spec revision or documented env values |
| `DEC-05` | `CHOSEN` | Limiter identifiers dùng HMAC-SHA256 với `RATE_LIMIT_HASH_SECRET` riêng (≥32 chars) + route namespace; không gửi raw phone, tracking code hoặc IP vào Redis/log/analytics. | Privacy-by-design | Final |
| `DEC-06` | `CHOSEN` | Analytics/protection nhận raw IP của SDK tắt trong slice này. Chỉ lưu opaque identifier + TTL. | Least data | Final |
| `DEC-07` | `CHOSEN` | `x-forwarded-for` first value chỉ được trust ở Vercel production. Missing/malformed client IP được gom vào opaque `unknown` bucket giới hạn chặt, không tạo random key để bypass. | EV-11 | Final |
| `DEC-08` | `CHOSEN` | `429` luôn trả `{error:'RATE_LIMITED', message}` chung, `Retry-After`, `Cache-Control:no-store` và remaining/reset headers không chứa identifier. | Stable public API | Final |
| `DEC-09` | `CHOSEN` | Apply chỉ nhận JSON tối đa 16 KiB; multipart/octet-stream/oversize bị `413/415` trước DB. `cv` object/non-null bị `422 CV_UPLOAD_DISABLED`; `cv:null` có thể chấp nhận tạm để tương thích nhưng không lưu metadata. | Owner CV decision | Final |
| `DEC-10` | `CHOSEN` | Hai legacy writes `POST /api/jobs` và `POST /api/jobs/apply` trả `410 APPLY_ENDPOINT_RETIRED`, nêu canonical path template, không redirect POST và không gọi Prisma. | One-write-boundary invariant | Final |
| `DEC-11` | `CHOSEN` | Full application UI giữ yêu cầu `fullName + phone + consent`; CV control bị loại. Phone-only Quick Apply không được giả lập trong security task. | Owner + data integrity | Final |
| `DEC-12` | `CHOSEN` | Không log request body, phone, tracking code, IP, HMAC input/output, Upstash URL/token hoặc raw provider error. Structured event chỉ chứa route class, outcome, status, retryAfter và requestId. | OPS-04a | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Có provider-neutral async rate-limit interface và Upstash adapter dùng distributed counter, namespaced theo environment/route, lazy-configured để build không cần secret. | Must | `DEC-01..03` | Production thiếu/unavailable provider → 503; không fallback RAM. |
| `RQ-02` | Client identifier được canonicalize và HMAC theo `DEC-05/07`; raw IP/phone/tracking code không vào Redis/log/HTTP. | Must P0 | `DEC-05..07/12` | Raw identifier xuất hiện → audit FAIL. |
| `RQ-03` | Public job list và detail đều áp browse limit trước query; over-limit trả 429 contract, provider unavailable trả 503, cả hai zero DB call. | Must | §7.9.7(1), `DEC-04/08` | Query chạy sau deny/unavailable → FAIL. |
| `RQ-04` | Tracking áp đồng thời IP bucket và tracking-code HMAC bucket trước DB; bỏ production `Map`; unknown/known code vẫn giữ response projection/generic 404 không phân biệt tồn tại. | Must P0 | `EV-03`, `DEC-04` | Enumeration bypass hoặc existence signal → FAIL. |
| `RQ-05` | Canonical apply áp IP bucket trước parse/write và normalized-phone bucket trước transaction; blocked/unavailable request không gọi Prisma/SECURITY DEFINER và không tạo history/idempotency row. | Must P0 | `EV-02/08`, `DEC-04` | Có durable write sau deny → FAIL. |
| `RQ-06` | Public apply dùng capped JSON reader ≤16 KiB, content-type gate và strict accepted shape; reject oversized, multipart/binary và CV object theo `DEC-09`. | Must | §7.9.7(2), Owner decision | 413/415/422; zero DB write. |
| `RQ-07` | `/jobs` và landing marketplace gửi canonical apply với idempotency key + consent, không gửi `cv`; UI hiển thị friendly 429/503/retry state và tracking code chỉ sau 201. | Must | `EV-06/07`, `DEC-08/11` | Không silent success; không retry storm. |
| `RQ-08` | Legacy POST `/api/jobs` và `/api/jobs/apply` bị retire 410, zero DB; GET `/api/jobs` và canonical behavior giữ tương thích. Static inventory chứng minh không còn anonymous application write path thứ hai. | Must P0 | `EV-05`, `DEC-10` | Legacy write/DB import còn reachable → FAIL. |
| `RQ-09` | Idempotency replay, payload mismatch, duplicate application, closed/unpublished job, tracking safe projection và MP-2 SECURITY DEFINER boundary không regression. | Must P0 | `EV-08` | Thay state/error/duplicate semantics → FAIL. |
| `RQ-10` | `.env.example` chỉ thêm tên biến + mô tả; package/lock chỉ thêm dependency cần thiết. Không secret, PII hoặc provider response lọt diff/HANDOFF/test. | Must | Global rules | Secret/PII or dependency sprawl → stop. |
| `RQ-11` | Unit/route/static tests chứng minh limit matrix, failure matrix, two-instance shared counter, no-DB-on-deny, CV disabled và one-write-route inventory; LIVE lane dùng TEST DB + TEST Redis thật. | Must | §7.9.7(8) | Mock-only distributed claim hoặc ENV fallback → FAIL/ENV_BLOCKED. |
| `RQ-12` | Mandatory gates pass và HANDOFF nói thật đây chỉ là OPS-06A/OPS-02 Marketplace subset; ghi residual Quick Apply, worker limiter RAM và full OPS-02/06. | Must | Pipeline | False completion/out-of-scope diff → no audit. |

### 4.2 Scope boundaries

**In scope — expected runtime targets:**

- `src/domains/applications/rate-limit.ts` — replace/route through async provider port; production `Map` removed from tracking path.
- New focused module under `src/shared/security/` or `src/domains/applications/` for limiter provider/config/identifier hashing.
- `app/api/jobs/route.ts` — GET browse limit; POST 410 only.
- `app/api/jobs/[slug]/route.ts` — browse limit.
- `app/api/jobs/apply/route.ts` — 410 only.
- `app/api/public/jobs/[slug]/applications/route.ts` — capped JSON, CV-disabled contract, IP+phone limits before DB.
- `app/api/public/applications/[trackingCode]/route.ts` — distributed dual limit.
- `app/(jobs)/jobs/page.tsx` — remove CV and render rate-limit/unavailable UX.
- `app/(portal)/page.tsx` — leave legacy POST and use canonical apply contract, or route its CTA to the canonical `/jobs` flow without duplicate submit implementation.
- `.env.example`, `package.json`, lockfile for Upstash names/dependencies only.
- Focused unit/route/static/LIVE integration tests and this task's `HANDOFF.md`.

**Conditional scope:**

- `src/domains/applications/application.service.ts` / `apply-helpers.ts` only for strict CV-disabled/capped input boundary compatibility; do not change SQL, hashing, duplicate or tracking semantics.
- `src/shared/observability/**` import/reuse only; no OPS-04b provider/dashboard work.
- Existing security inventory tests may be updated where they currently assert legacy delegation rather than 410.

**Out of scope / protected paths:**

- `middleware.ts` and worker portal limiter; full OPS-02 handles remaining in-memory security counters.
- `prisma/**`, migrations, schema, grants, roles, seed and DB data.
- `src/shared/auth/**`, login/logout, RLS/projection files, vendor/worker/CTV/admin business routes.
- Quick Apply schema/UI, Affiliate attribution, CAPTCHA vendor, SMS/OTP, WAF/bot management.
- Production Vercel/Upstash provisioning, deployment, DNS and real-job publication.
- `app/**/layout.tsx` metadata WIP; `.neon/**`; `docs/aff_plan*`; `docs/HRP_REMAINING_ROADMAP.md`; `docs/reports/**`; `docs/runbooks/**`; `scratch/**`; `scripts/debug-parser.mjs`.
- `TASK.md` ownership beyond Planner resolution and `AUDIT.md` ownership.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Redis key contains only versioned namespace + HMAC digest; TTL bounded by limiter window. No application payload or raw identifiers. CandidateSubmission rows created after this task have CV metadata `null` from public apply.
- **State:** Rate-limit denial is ephemeral and never changes application state. Existing application idempotency/duplicate/status state machine remains canonical.
- **Permission/data scope:** Routes remain anonymous public with least-data projections. Limiter is not authentication and must not add a fake `AuthContext`/DB role.
- **Interface:** Success contracts unchanged. New errors: `429 RATE_LIMITED`, `503 RATE_LIMIT_UNAVAILABLE`, `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 CV_UPLOAD_DISABLED`, legacy `410 APPLY_ENDPOINT_RETIRED`.
- **Failure/idempotency/concurrency:** Limiter executes before any write. Same request may consume a token even if later validation fails; idempotency still controls durable replay. Concurrent Vercel instances must share Redis counter. Provider timeout is unavailable, not allowed.
- **Configuration:** names only: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_HASH_SECRET`; TEST lane uses explicit `*_TEST` inputs or a harness that maps TEST credentials without printing them. Production setup is Owner OP after audit.

### 4.4 Default rate matrix

| Surface | Identifier | Limit/window | On exceed | DB allowed? |
|---|---|---|---|---|
| `GET /api/jobs` + detail | client-IP HMAC | 120 / 60 seconds | 429 | No |
| Tracking | client-IP HMAC | 20 / 60 seconds | 429 | No |
| Tracking | tracking-code HMAC | 10 / 60 seconds | 429 | No |
| Apply | client-IP HMAC | 10 / 10 minutes | 429 | No |
| Apply | normalized-phone HMAC | 5 / 60 minutes | 429 | No |
| Any protected surface | provider missing/error/timeout | N/A | 503 + Retry-After 5 | No |

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | RQ-10/12 | Git preflight | Pin baseline, inventory dirty/protected files, work only in one Tier 2 session | Git | status + diff name-status | Baseline mismatch or overlap with another active writer |
| `STEP-01` | RQ-01/02 | limiter port/config | Implement async provider port, Upstash adapter, strict prod config, HMAC identifier and deterministic fake | Upstash REST SDK | unit configuration/failure/privacy matrix | Requires raw identifiers/analytics or production fallback |
| `STEP-02` | RQ-03/04 | job read + tracking routes | Apply browse/dual-tracking limits before DB and remove tracking Map from production call path | STEP-01 | route tests with DB spies | Any deny path reaches DB or alters projection |
| `STEP-03` | RQ-05/06 | canonical apply route | Capped JSON/media/CV gate, IP then phone limit, zero-write failures, preserve SECURITY DEFINER call | STEP-01 | route tests + existing MP-2 tests | Requires schema/RPC change or weak body cap |
| `STEP-04` | RQ-07/08 | UI + legacy routes | Remove CV UI/payload, migrate landing flow to canonical, 410 legacy writes and static single-write inventory | STEP-03 | component/route/static tests | A caller still depends on legacy POST or reports false success |
| `STEP-05` | RQ-09/11 | regression + LIVE test | Test idempotency/duplicate/closed job/tracking; prove two adapter instances share TEST Redis and blocked apply creates no row | TEST DB + TEST Redis | focused LIVE lane, exact before/after counts | Missing TEST targets → ENV_BLOCKED; never use prod/dev fallback |
| `STEP-06` | RQ-10/12 | gates + HANDOFF | Run all gates, document Owner env runbook names and residual backlog truthfully | Pipeline | commands exit 0; diff scoped; HANDOFF template | Secret/PII, out-of-scope diff or red gate |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01/02 | Production config selects Upstash only; missing/error/timeout maps 503; two adapter instances with same namespace see one shared TEST counter; no raw identifier in Redis key/log/output. | Unit + TEST Redis integration | Config matrix, shared-counter sequence, captured key/log negative scan | Yes P0 |
| `AC-02` | RQ-03 | Request `N` within browse limit succeeds; `N+1` returns 429 with Retry-After/no-store; denied/unavailable path calls neither Prisma transaction nor job service. | Route tests | Exact 200/429/503 matrix + DB spy zero | Yes |
| `AC-03` | RQ-04 | Tracking enforces both IP and code buckets across instances, keeps generic 404 and safe DTO, and no longer imports/calls production Map limiter. | Route/static/TEST Redis tests | Enumeration matrix + source inventory | Yes P0 |
| `AC-04` | RQ-05 | Apply IP/phone thresholds are exact; blocked/unavailable request returns before transaction and CandidateSubmission/history/idempotency counts stay unchanged. | Route + LIVE TEST DB | Before/after counts and 429/503 response | Yes P0 |
| `AC-05` | RQ-06 | >16 KiB JSON=413; multipart/octet-stream=415; CV object=422; all zero DB write. Normal JSON without CV reaches canonical validation. | Route/LIVE tests | Payload/content-type matrix | Yes |
| `AC-06` | RQ-07 | Both public marketplace surfaces submit only canonical URL with idempotency+consent, contain no file input/CV payload, show 429/503/retry and only show success after 201 tracking code. | Component/contract tests | DOM/payload/success-failure assertions | Yes |
| `AC-07` | RQ-08 | `POST /api/jobs` and `/api/jobs/apply` return deterministic 410 and have zero Prisma/service call; static inventory finds exactly one anonymous write boundary. GET `/api/jobs` remains compatible. | Route/static tests | Method matrix + import/call inventory | Yes P0 |
| `AC-08` | RQ-09 | Existing MP-2 idempotency replay/mismatch, duplicate guard, closed/unpublished job, tracking projection and security-boundary tests pass unchanged in semantics. | Existing unit + LIVE TEST DB | Test names/counts and SQLSTATE/error assertions | Yes P0 |
| `AC-09` | RQ-10 | Env docs contain names only; diff/HANDOFF/log scan has no credential/PII; dependencies limited to reviewed Upstash packages. | Source/diff scan | Name-status, package diff, zero-match secret scan | Yes |
| `AC-10` | RQ-11 | Tier 3 independently runs LIVE spam/distributed/no-write matrix on TEST DB+Redis; no skipped/catch-to-zero/fallback-prod behavior. | Independent audit | Commands, target classification masked, exact pass counts | Yes P0 |
| `AC-11` | RQ-12 | verify-task, Prisma validate, typecheck, lint, full unit, build, focused tests and diff check pass; HANDOFF ends READY_FOR_AUDIT and lists residuals without claiming full OPS-02/06. | Mandatory commands | Exit codes/counts/diff | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-01`, `AC-09` |
| `RQ-03` | `STEP-02` | `AC-02` |
| `RQ-04` | `STEP-02`, `STEP-05` | `AC-03`, `AC-10` |
| `RQ-05` | `STEP-03`, `STEP-05` | `AC-04`, `AC-10` |
| `RQ-06` | `STEP-03` | `AC-05` |
| `RQ-07` | `STEP-04` | `AC-06` |
| `RQ-08` | `STEP-04` | `AC-07` |
| `RQ-09` | `STEP-05` | `AC-08`, `AC-10` |
| `RQ-10` | `STEP-00`, `STEP-06` | `AC-09` |
| `RQ-11` | `STEP-01..05` | `AC-01..10` |
| `RQ-12` | `STEP-00`, `STEP-06` | `AC-11` |

### Mandatory commands

```powershell
.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs\tasks\hrp-v5-ops-06a-marketplace-launch-hardening\TASK.md
npx prisma validate
npx tsc --noEmit
npx eslint .
npm run test:unit
npm run build
# Tier 2 chạy focused unit/route tests do implementation tạo và ghi exact paths/counts trong HANDOFF.
# LIVE lane chỉ với DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST + Upstash TEST credentials + explicit opt-in do test khai báo.
git diff --check -- package.json package-lock.json .env.example app/api/jobs app/api/public app/\(jobs\)/jobs/page.tsx app/\(portal\)/page.tsx src/domains/applications src/shared/security docs/tasks/hrp-v5-ops-06a-marketplace-launch-hardening/HANDOFF.md
git diff --name-status d9a1067
```

Tier 2 không được đưa giá trị env vào command output/HANDOFF. Nếu shell cần map `*_TEST` sang tên SDK, dùng harness ngoài log và chỉ ghi tên biến.

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Upstash outage làm public flow 503 | Provider error/timeout spike | Fail closed, structured metric, `Retry-After`; Owner unpublish job nếu kéo dài | Không bật bypass; giữ job ẩn, rollback deployment về bản trước chỉ khi Owner chấp nhận gate chưa đạt |
| `RISK-02` | Shared/mobile-carrier IP chặn nhầm nhiều ứng viên | 429 hợp lệ tăng cao | Dual bucket thresholds vừa phải, metric không PII, review trước tune | Spec revision điều chỉnh limit; không hot-edit code/env không evidence |
| `RISK-03` | SDK timeout mặc định tạo fail-open | `reason=timeout` nhưng `success=true` | Adapter kiểm reason và map unavailable | Disable public apply/tracking hoặc unpublish jobs cho đến khi provider ổn định |
| `RISK-04` | Raw phone/IP/tracking code lọt Redis/log | Captured key/output chứa sentinel | HMAC secret riêng, analytics off, negative corpus | Rotate hash secret, flush task namespace, treat as privacy incident |
| `RISK-05` | Đóng legacy route làm landing form hỏng | Caller vẫn POST `/api/jobs` | Migrate/redirect landing UI trước 410; static caller scan | Route landing CTA về `/jobs`; không re-enable legacy write |
| `RISK-06` | CV UI biến mất nhưng API vẫn lưu metadata | New row có cv metadata khác null | Reject at route + service defense + LIVE row assertion | Unpublish jobs, forward-fix; không xóa DB trực tiếp |
| `RISK-07` | Body cap chỉ tin Content-Length và bị bypass chunked | Oversized chunked request reaches JSON/DB | Capped stream/text reader plus post-read byte check | Disable apply route until forward fix |
| `RISK-08` | Task bị báo là full OPS-02/06 | HANDOFF/roadmap claims all rate limits/security closed | Explicit slice label + AC-11 residual list | Tier 1 rejects claim; keep parent backlog open |
| `RISK-09` | TEST Redis/DB absent leads false green | LIVE tests skipped or catch-to-zero | ENV_BLOCKED and Tier 3 independent lane | Owner provisions isolated targets; rerun audit, never use prod |

Rollback business rule: nếu forward fix/rate provider chưa an toàn, **unpublish job bằng runbook** và giữ canonical apply fail closed. Không rollback bằng cách mở lại legacy POST, bật in-memory production fallback hoặc cho phép CV metadata.

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | None. Provider, limits, CV policy, legacy closure và fail behavior đã được Tier 1/Owner chốt. TEST credentials là execution environment prerequisite, không phải product question. | — | — | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `BLOCKED / ENV_BLOCKED` | `DEFER — WAIT_FOR_ENV; không force resolve` | Gate cơ học `verify-audit.ps1` PASS nhưng AC-01/03/04/08/10 là P0 và chưa có runtime evidence: Tier 2 lẫn Tier 3 đều thiếu TEST Redis/DB, integration lane skip đúng fail-closed. Unit/build/static PASS không chứng minh distributed counter hoặc zero-write LIVE. | None; spec v1.0 giữ nguyên, không yêu cầu sửa code trước khi rerun | Owner provision `UPSTASH_REDIS_REST_URL_TEST`, `UPSTASH_REDIS_REST_TOKEN_TEST`, `RATE_LIMIT_HASH_SECRET_TEST` và safe `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST`; Tier 3 re-audit round 2. Tuyệt đối không dùng prod/dev fallback hoặc in secret vào artifact. |
| `2` | `FAIL / TEST_REDIS_TOKEN_NOPERM` | `DEFER — ROUND_3_WITH_TEST_TOKEN; không ACCEPT` | Round 2 đã chạy LIVE: DB cases AC-04/05/08 PASS, nhưng Upstash trả `NOPERM` cho `EVALSHA` (và test cleanup `KEYS`), làm AC-01/03/10 FAIL. Đây là credential capability failure trên TEST target; chưa có distributed-counter evidence nên không được force-close. | None; spec v1.0 và implementation giữ nguyên cho lần thử kế tiếp. Nếu Round 3 vẫn fail với token đúng quyền, Tier 1 sẽ phân loại lại thành code/provider defect trước khi cho `/code`. | Owner thay **chỉ** `UPSTASH_REDIS_REST_TOKEN_TEST` bằng token của Redis TEST cô lập có quyền scripting/cleanup cần cho test; không tái sử dụng token production, không ghi/in token. Tier 3 chạy audit round 3 độc lập. |
| `3` | `FAIL / PROVIDER_CONFIG_DEFECT` | `REVISION_REQUIRED — không ACCEPT, không force-pass` | Round 3 tiếp tục nhận `NOPERM EVALSHA/KEYS`; DB AC-04/05/08 vẫn PASS. Đây là lỗi quyền hoặc cặp URL/token của Redis TEST, chưa phải bằng chứng cho code defect. Đồng thời commit `7ed57a5` thêm cả `AUDIT.md` và `live-integration.ops06a.test.ts`, trong khi AUDIT nói Tier 3 đã sửa bug test; vì vậy tuyên bố `Independence: Confirmed` không thể dùng để khép task. | Spec/product semantics giữ `v1.0`. Mở execution round 4 chỉ để phục hồi ownership và evidence: Tier 2 phải review/adopt hoặc sửa LIVE test, không dùng `KEYS` cho cleanup; dùng namespace duy nhất + exact known keys/TTL, rồi cập nhật HANDOFF. Không yêu cầu viết lại production code nếu review không phát hiện defect. | Tier 2 chạy `/code ...` round 4 và sở hữu toàn bộ thay đổi test/code; Owner ghép **Standard REST token** với REST URL của cùng Redis TEST cô lập, không dùng token production; sau đó một Tier 3 context khác chạy audit round 4, chỉ đọc source/HANDOFF và viết AUDIT. |
| `pre-audit 4` | `PLN-04 / P0_PII_DEBUG_LOG` | `RETURN_TO_TIER_2 — chưa mở audit` | Working tree có `application.service.ts:145` ghi `fullName`, `phone` và `trackingCode` qua `console.log` trên public apply path. Dòng này không có trong baseline `d9a1067` hoặc HEAD `25b9928`, nhưng nó vi phạm trực tiếp RQ-10/AC-09 và thuộc security boundary của task; không được chuyển thành residual ngoài scope. | Spec v1.0 không đổi. Cùng execution round 4: xóa debug log, thêm/siết regression evidence để public apply service không ghi raw họ tên/số điện thoại/tracking code vào `console.*`, chạy focused + full unit + diff/secret-PII scan, rồi cập nhật HANDOFF. | Tier 2 hiện tại đóng `PLN-04`; giữ nguyên các WIP layout/aff/scratch khác. Chỉ khi HANDOFF mới kết `READY_FOR_AUDIT` và không còn log PII mới giao Tier 3 audit round 4. |
| `4` | `PLN-04 / P0_PII_DEBUG_LOG` | `EXECUTION_CLOSED — ROUND_5_RECONFIRM` | Source hiện không còn debug log trong `application.service.ts`; HANDOFF round 4 ghi 7 regression tests, mutation check và full unit `1408/1408`. AUDIT round 4 cho AC-09 PASS nhưng vẫn ghi test count cũ `1291`, nên không dùng con số cũ để close cuối. | Không đổi code/contract. Audit round 5 phải chạy lại current focused/full unit lane và xác nhận static/runtime PII guards còn hiệu lực. | Tier 3 round 5; không trả về Tier 2 trừ khi fresh evidence phát hiện regression. |
| `4` | `FAIL / PROVIDER_CONFIG_DEFECT` | `DEFER — BLOCKED_OWNER; không ACCEPT, không /code` | Capability preflight thật trả `NOPERM EVAL/EVALSHA`; AC-01/03/10 chưa có distributed Redis evidence. AC-04/05/08 LIVE DB và các gate còn lại PASS. Round 4 đã loại `KEYS/SCAN`, nên blocker còn lại chỉ là scripting capability bắt buộc của limiter. | Spec v1.0 và implementation giữ nguyên; không có code revision. Owner phải thay TEST credential/config, không nới production policy và không mock PASS. | Owner copy **Standard REST token** và REST URL từ cùng một Redis TEST cô lập; Tier 3 context độc lập chạy audit round 5. Token không được ghi vào command/artifact. |
| `5` | `PASS / AC-01..11` | `ACCEPT` | Tier 3 chạy độc lập bằng Redis TEST có scripting và DB TEST cô lập: 6/6 LIVE PASS, distributed sliding-window counter chia sẻ giữa hai instance, digest/TTL/cleanup không `KEYS`, blocked apply zero-write, idempotency giữ nguyên. Full lane hiện tại `1408/1408`, build/type/static/PII checks PASS; không còn coverage gap. | None. Spec v1.0 hoàn thành; task chỉ ACCEPT marketplace launch subset, không tuyên bố full OPS-02/OPS-06. | Tier 1 đóng task, thực hiện `PROCESS-02` atomic scoped commit/push; Owner sau đó provision production Redis env, drill/smoke và publish job theo runbook. |
| `post-PASS` | `PROCESS-02 / ATOMIC_COMMIT` | `MANDATORY` | Production OPS-06A đang modified trong khi `src/shared/security/**` và ba `marketplace-*.test.ts` còn untracked. Commit thiếu test sẽ làm mất chốt chặn PLN-04 và distributed-limiter regression. | Không đổi contract. Sau audit PASS, commit scoped phải chứa cùng lúc production routes/helpers, dependency/config, LIVE/unit/static tests và process docs OPS-06A; loại trừ layout/aff/scratch WIP không thuộc task. | Tier 1 thực hiện name-status allowlist review trước commit; không partial-stage production mà bỏ test lane. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-28` | Initial launch-hardening contract: distributed public limits, fail-closed provider, canonical apply only, CV surface disabled and LIVE spam/no-write evidence. | Owner “let go”; §7.9.7 launch gate; CodeGraph/source survey. |
| `v1.0` | `2026-08-28` | Audit round 1 giữ `BLOCKED_OWNER`; không force-resolve vì năm AC P0 còn `ENV_BLOCKED`. Contract/code semantics không đổi. | Tier 3 AUDIT round 1; Planner resolve protocol. |
| `v1.0` | `2026-08-28` | Audit round 2 không ACCEPT: LIVE DB đã PASS nhưng TEST Redis token bị `NOPERM EVALSHA/KEYS`; mở audit round 3 bằng token đúng quyền trên target TEST cô lập. Không đổi contract/code. | Tier 3 AUDIT round 2; `TEST_REDIS_TOKEN_NOPERM`. |
| `v1.0` | `2026-08-28` | Resolve round 3 thành `REVISION_REQUIRED`: phân loại Redis `NOPERM` là provider/config defect; trả test về Tier 2 do auditor đã commit test cùng AUDIT; loại bỏ nhu cầu `KEYS` khỏi cleanup và yêu cầu audit round 4 độc lập. | Tier 3 AUDIT round 3; commit-scope evidence `7ed57a5`. |
| `v1.0` | `2026-08-28` | Pre-audit round 4 trả về Tier 2 để xóa debug log lộ PII trên public apply path và bổ sung regression evidence; không mở task mới, không đổi product contract. | Planner finding `PLN-04`; working-tree provenance against `d9a1067` và `25b9928`. |
| `v1.0` | `2026-08-28` | Resolve audit round 4 thành `BLOCKED_OWNER`: code revision đã xong, PLN-04 đã đóng ở execution; Redis TEST token vẫn thiếu `EVAL`, nên mở audit round 5 sau khi sửa config. Ghi thêm atomic-commit gate để test lane không bị bỏ sót. | Tier 3 AUDIT round 4; HANDOFF round 4; Planner `PROCESS-02`. |
| `v1.0` | `2026-08-29` | Audit round 5 PASS toàn bộ AC-01..11 và LIVE Redis/DB; task chuyển `ACCEPTED`, sang production launch review. | Tier 3 AUDIT round 5; 6/6 LIVE + 1408/1408 full lane. |
