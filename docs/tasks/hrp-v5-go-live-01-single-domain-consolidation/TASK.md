# TASK: hrp-v5-go-live-01-single-domain-consolidation

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-01-single-domain-consolidation` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1 / Codex` |
| Executor | `Tier 2` — một luồng duy nhất, bắt đầu sau M1-08 |
| Auditor | `Tier 3 independent context` |
| Baseline | `2cd8a5594479c50c2a165ca41012402a6e549546` — M1-08 source/evidence/resolution đã commit và `ACCEPTED` |
| Modules | `Marketplace go-live / portal shell / authentication routing` |
| ADR references | `UNIFIED_PLAN_v5.md §7.9 Marketplace-first`; task này thay thế phần domain-routing cũ của Portal DEC-01/02/03/13 bằng quyết định owner ngày 2026-08-28 |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/code hrp-v5-go-live-01-single-domain-consolidation` → HANDOFF → `/audit` → `/resolve` |
| Updated | `2026-08-28 00:00 Asia/Bangkok` |

### Dependency and sequencing gate

Dependency gate đã được Tier 1 mở ngày 2026-08-28. Evidence kích hoạt:

1. `docs/tasks/hrp-v5-m1-08-vendor-object-scope/TASK.md` đã có audit round 1 PASS, Planner Resolution `ACCEPT` và `Status = ACCEPTED`.
2. M1-08 đã được tách thành source `62d42bd`, evidence `fb183f4`, resolution `2cd8a55`; baseline task này pin full SHA resolution.
3. Task này đã chuyển sang `READY_FOR_EXECUTION`, execution round `1`; `verify-task.ps1` phải PASS trước khi giao `/code`.
4. Tier 2 vẫn phải chạy preflight working tree. Nếu xuất hiện overlapping WIP ngoài allowlist, dừng và báo `BLOCKED`; không stash/reset/delete/chèn commit của agent khác.

**Vị trí roadmap đã chốt:** chạy ngay sau M1-08 và trước M1-09/configuration go-live production. Task này không thay thế M1-09.

## 1. Outcome

### User-visible outcome

HRP dùng một canonical origin duy nhất là `https://hrpartner.vn`. Sau đăng nhập:

| Actor | Landing path canonical |
|---|---|
| `VENDOR_ADMIN`, `VENDOR_STAFF` | `/vendor` |
| `WORKER` | `/worker` |
| `CTV` | `/ctv` |
| Các role nội bộ còn lại | callback nội bộ hợp lệ; nếu không có thì `/bcc` |

Người dùng không còn bị điều hướng sang `vendor.hrpartner.vn`, `worker.hrpartner.vn` hoặc `ctv.hrpartner.vn`. Cookie đăng nhập trở thành host-only cho `hrpartner.vn`; login/logout xử lý được cookie domain-scoped cũ trong giai đoạn chuyển tiếp. Các portal vẫn giữ nguyên path, quyền, RLS và API hiện hữu.

Ba hostname cũ chỉ đóng vai trò legacy redirect trong thời gian OP chuyển đổi DNS/Vercel:

| Legacy URL | Canonical result |
|---|---|
| `https://vendor.hrpartner.vn/` | `https://hrpartner.vn/vendor` |
| `https://worker.hrpartner.vn/` | `https://hrpartner.vn/worker` |
| `https://ctv.hrpartner.vn/` | `https://hrpartner.vn/ctv` |
| Legacy host đã có path/query | Đổi origin sang `https://hrpartner.vn`, giữ path và query; nếu path `/` thì dùng landing path trong bảng trên |

### Non-goals

- Không thay đổi RBAC, permission builder, RLS policy, Prisma schema hoặc migration.
- Không sửa logic nghiệp vụ của Vendor/Worker/CTV; không chạm M1-08 object-scope implementation.
- Không thiết kế lại UI portal, job board hoặc login page ngoài copy phụ đề bắt buộc do bỏ hostname.
- Không triển khai AFF, attendance, billing, commission hay payroll.
- Không tự sửa DNS, Vercel domain, production environment variables, deploy hoặc push production; các thao tác đó thuộc OP sau audit.
- Không tạo một hệ thống tenant/domain động mới.
- Không đổi tên các path `/vendor`, `/worker`, `/ctv` hoặc API tương ứng.
- Không dùng task này để xử lý distributed rate limit, Cron auth header hoặc observability follow-up.
- Không đọc, ghi, stage hoặc đưa secret từ `docs/VERCEL_ENV_PRODUCTION.local.md` vào evidence/HANDOFF/AUDIT.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/api/auth/login/route.ts:34-44` | `ROLE_REDIRECT` trả ba absolute subdomain theo role. | Phải đổi thành same-origin landing path, không còn cross-origin role redirect. |
| `EV-02` | `app/api/auth/login/route.ts:80-98` | Login trả `redirectTo`; cookie production có `Domain=.hrpartner.vn`. | Cần contract redirect tương đối và migration cookie host-only. |
| `EV-03` | `app/api/auth/logout/route.ts:12-19` | Logout chỉ xóa domain-scoped cookie production. | Logout mới phải xóa cả host-only và legacy domain cookie. |
| `EV-04` | `middleware.ts:115-143` | Middleware chứa `PORTAL_DOMAINS`, host parser và expected-domain mapping. | Bỏ hostname role-routing; thay bằng canonical legacy-host redirect có allowlist cố định. |
| `EV-05` | `middleware.ts:229-299` | Portal auth, worker rate-limit, request-id và role-domain redirect đang cùng middleware. | Chỉ thay nhánh domain; không làm suy giảm auth, rate-limit hay correlation ID. |
| `EV-06` | `app/login/page.tsx:14-25` | Subtitle login phụ thuộc ba hostname cũ. | Dùng generic subtitle hoặc callback-path-derived copy; không nhận host tùy ý. |
| `EV-07` | `app/login/login-form.tsx:41-50` | Client ưu tiên `data.redirectTo`, sau đó mới dùng callback đã kiểm tra relative-path. | Giữ fail-closed open-redirect guard và hỗ trợ `redirectTo` relative path. |
| `EV-08` | `src/domains/security/portal-domains.integration.test.ts` | Test hiện tại tự sao chép mapping subdomain thay vì kiểm thử canonical behavior. | Viết lại test để chứng minh single-origin và legacy redirect, không duy trì assertion lỗi thời. |
| `EV-09` | `src/domains/security/security-matrix-portals.test.ts:114-129` | Security matrix còn kỳ vọng domain theo role. | Cập nhật matrix sang role → path; không giảm coverage role. |
| `EV-10` | Owner decision 2026-08-28 | Chỉ giữ `hrpartner.vn`; ba subdomain bị loại khỏi kiến trúc đích. | Quyết định này thay thế multi-domain portal routing cũ. |
| `EV-11` | `.gitignore` + `docs/VERCEL_ENV_PRODUCTION.local.md` | File env production local chứa secret thật và đã bị Git ignore. | File này là forbidden scope; mọi test/evidence phải dùng placeholder. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Canonical production origin duy nhất là `https://hrpartner.vn`. | Owner, 2026-08-28 | Final |
| `DEC-02` | `CHOSEN` | Role landing dùng relative path `/vendor`, `/worker`, `/ctv`; không trả absolute subdomain URL. | Owner + Tier 1 | Final |
| `DEC-03` | `CHOSEN` | Cookie auth đích là host-only: production login không set thuộc tính `Domain`. `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, TTL giữ nguyên. | Tier 1 security decision | Final |
| `DEC-04` | `CHOSEN` | Giai đoạn chuyển tiếp phải expire cookie cũ có `Domain=.hrpartner.vn`; logout expire cả hai variant. Không log token/cookie. | Tier 1 | Final |
| `DEC-05` | `CHOSEN` | Legacy redirect chỉ chấp nhận đúng ba hostname allowlist. Header `Host`/`x-forwarded-host` lạ không được dùng làm redirect target. | Tier 1 security boundary | Final |
| `DEC-06` | `CHOSEN` | Callback chỉ hợp lệ khi là same-origin relative path bắt đầu bằng đúng một `/`; `//`, scheme URL, backslash ambiguity và malformed input phải fallback an toàn. | Existing behavior + hardening | Final |
| `DEC-07` | `CHOSEN` | Task đổi routing, không đổi authorization. Portal/API tiếp tục dùng auth/RBAC/RLS hiện có; không suy quyền từ hostname. | Tier 1 | Final |
| `DEC-08` | `CHOSEN` | `x-request-id`, worker waiting-room/rate-limit, `/bcc` fence và API 401 behavior phải được giữ nguyên qua refactor middleware. | OPS-04a/M1 accepted baseline | Final |
| `DEC-09` | `CHOSEN` | Tier 2 không thao tác Vercel/DNS. HANDOFF cung cấp runbook; OP chỉ chuyển domain sau Tier 3 PASS và Tier 1 ACCEPTED. | Owner/Tier 1 | Final |
| `DEC-10` | `CHOSEN` | Các portal canonical đã tồn tại tại `/vendor`, `/worker`, `/ctv`; task không tạo page mới. | Current route tree, rechecked at activation | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Login API map `VENDOR_* → /vendor`, `WORKER → /worker`, `CTV → /ctv`; không trả URL chứa ba subdomain cũ. | Must | `EV-01`, `DEC-02` | Test fail; task không READY_FOR_AUDIT. |
| `RQ-02` | Login client chỉ điều hướng tới relative `redirectTo`/callback an toàn; input absolute, protocol-relative hoặc malformed phải fallback `/bcc` hoặc landing an toàn. | Must | `EV-07`, `DEC-06` | Fail closed; không navigation đến external origin. |
| `RQ-03` | Middleware bỏ role→hostname redirect nhưng giữ auth cho portal paths, API 401, `/bcc` fence, worker rate-limit và correlation-id ở mọi branch. | Must | `EV-04`, `EV-05`, `DEC-08` | Không được merge nếu bất kỳ regression nào. |
| `RQ-04` | Request tới đúng ba legacy hostname được redirect permanent/canonical về `https://hrpartner.vn`; root legacy path map tới landing tương ứng, path/query khác được bảo toàn. | Must | `DEC-01`, `DEC-05` | Host lạ không được tạo redirect; test fail. |
| `RQ-05` | Login tạo host-only auth cookie và expire legacy domain cookie; logout xóa host-only lẫn domain-scoped legacy cookie với attributes tương thích. | Must | `EV-02`, `EV-03`, `DEC-03/04` | Không để stale token gây loop hoặc logout giả. |
| `RQ-06` | Login page không còn phụ thuộc hostname phụ; hiển thị generic subtitle hoặc subtitle suy từ callback path đã normalize. | Should | `EV-06` | Không được đọc host để quyết định tenant/role. |
| `RQ-07` | Tests phải chứng minh đủ role landing, safe callback, legacy redirects, cookie transition và preserved middleware controls; không dùng test tự sao chép production mapping mà không import/exercise behavior thật. | Must | `EV-08`, `EV-09` | Coverage thiếu → audit fail. |
| `RQ-08` | Không còn runtime navigation tới subdomain. Literal legacy host chỉ được tồn tại trong allowlist redirect chuyển tiếp, tests của allowlist và tài liệu/runbook. | Must | `DEC-01/05` | Static inventory có literal ngoài allowlist → fail. |
| `RQ-09` | HANDOFF ghi runbook OP: deploy preview/root smoke, attach root canonical, giữ legacy aliases để redirect, theo dõi, rồi mới tháo DNS/domain phụ. Không chứa secret. | Must | `DEC-09` | Handoff thiếu/secret leak → BLOCKED. |
| `RQ-10` | Không thay đổi response auth failure, JWT signing/TTL, password validation, authorization scope hoặc database transaction behavior của login. | Must | M1 accepted baseline | Regression/security expansion → fail. |

### 4.2 Scope boundaries

**In scope (expected targets; Tier 2 phải kê exact diff trong HANDOFF):**

- `middleware.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/login/login-form.tsx`
- `app/login/page.tsx`
- `src/domains/security/portal-domains.integration.test.ts` (rewrite/rename hợp lý được phép)
- `src/domains/security/security-matrix-portals.test.ts`
- Test mới dưới `src/domains/security/` hoặc cạnh auth component nếu cần exercise production behavior thật
- `HANDOFF.md` của chính task

**In scope có điều kiện:**

- Một helper thuần mới dưới `src/shared/auth/` hoặc `src/shared/routing/` chỉ khi cần tránh sao chép mapping giữa login/middleware/tests. Nếu tạo helper, phải có unit test và không import server-only secret/database code.
- `vercel.json` chỉ được đọc để viết runbook; không sửa cron/domain/deploy configuration trong task này nếu Tier 1 chưa revise contract.

**Out of scope / forbidden:**

- Toàn bộ file M1-08 đang/đã sửa: vendor order/submission/statement/dispute routes, staffing types, reconciliation service/tests; task này không “dọn hộ” diff M1-08.
- `prisma/**`, migration, seed data và database roles.
- `.env*`, `C:\CodeApp\new1.txt`, `docs/VERCEL_ENV_PRODUCTION.local.md`, `.vercel/**`.
- `docs/aff_plan*`, `scratch/**`, `scripts/debug-parser.mjs` và artifact của agent/user khác.
- `AUDIT.md` — Tier 2 không tạo/sửa.
- DNS records, Vercel dashboard/domain/env, production deployment, git push/merge.
- Các HTML tầm nhìn cũ (`ve-hrp.html`...) không phải runtime; không mở rộng task để biên tập tài liệu marketing.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Không đổi schema/data. Không được đưa credential/token vào source, test fixture, HANDOFF hoặc terminal evidence.
- **State:** Auth session vẫn là JWT stateless 8 giờ. Chuyển cookie phải tránh trạng thái có hai cookie cùng tên nhưng khác domain gây token không xác định.
- **Permission/data scope:** Hostname không phải security boundary. Quyền tiếp tục do verified JWT + route guard + L1/L2 hiện hữu quyết định. Task không cấp role mới vào portal/action.
- **Interface:** `POST /api/auth/login` vẫn nhận `{ phone, password }` và trả `{ ok: true, redirectTo? }`; `redirectTo`, nếu có, là relative path canonical. Failure response/status/message không đổi.
- **Redirect:** Canonical origin luôn HTTPS production. Legacy redirect không được phản chiếu arbitrary host/scheme. Path và query được encode/preserve đúng; fragment không có trong HTTP request.
- **Cookie:** Live cookie host-only; legacy deletion cookie dùng cùng name/path và explicit `.hrpartner.vn`, `Max-Age=0`. Login/logout phải nhất quán về `Secure`, `HttpOnly`, `SameSite`, `Path`.
- **Failure/idempotency/concurrency:** Login/logout giữ behavior hiện tại. Redirect pure/deterministic; request lặp không tạo loop giữa root và subdomain.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | all | dependency/baseline | Xác nhận M1-08 ACCEPTED, baseline SHA đã pin, working tree không còn WIP M1-08. Ghi preflight vào HANDOFF. | Tier 1 activation | `git status --short`; đọc M1-08 resolution | Dừng `BLOCKED` nếu dependency chưa mở hoặc có overlapping WIP. |
| `STEP-01` | `RQ-01,07,08` | shared mapping/login route | Tạo một source-of-truth role→landing path và đổi login API sang relative path. Không đổi password/JWT/preauth logic. | Existing login contract | Targeted unit/contract tests | Dừng nếu phải đổi auth payload/schema ngoài `redirectTo`. |
| `STEP-02` | `RQ-02,06` | login form/page | Validate navigation target same-origin; bỏ hostname subtitle dependency; giữ generic auth error. | STEP-01 | Tests cho callback/redirect targets; static scan | Dừng nếu giải pháp cần lưu token/password client-side. |
| `STEP-03` | `RQ-03,04,08` | `middleware.ts` | Bỏ expected-domain role redirect. Thêm exact legacy-host canonical redirect; bảo toàn auth/rate-limit/request-id/fence. | Shared routing helper nếu có | Middleware behavior tests | Dừng nếu regression 401/rate-limit/request-id hoặc redirect host lạ. |
| `STEP-04` | `RQ-05` | login/logout cookies | Set host-only live cookie; expire legacy domain cookie trên login/logout; attributes đồng nhất. | NextResponse cookie API | Header/cookie contract tests | Dừng và báo Tier 1 nếu framework không thể phát cả host-only + domain deletion cookie một cách xác minh được. |
| `STEP-05` | `RQ-07,08,10` | security tests | Rewrite test lỗi thời, test đủ 13 SystemRole landing/default, legacy host allowlist, query preservation, hostile host/callback, no loop, cookie variants. Tests phải exercise production helper/route, không chỉ copy constant. | STEP-01..04 | Targeted Vitest | Dừng nếu phải giảm assertion baseline. |
| `STEP-06` | all | static/full gates | Chạy verify-task, diff check, typecheck, lint, targeted tests, full unit suite, build. Inventory literal subdomain và giải trình từng occurrence. | Completed code | Commands §6 | Bất kỳ blocking gate fail → không READY_FOR_AUDIT. |
| `STEP-07` | `RQ-09` | `HANDOFF.md` | Ghi diff, decisions, test output, legacy redirect inventory, cookie evidence và OP runbook. Không deploy/commit/push. | Template HANDOFF | verify-handoff nếu repo có script; manual secret scan | Secret/production mutation → dừng và báo. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Vendor roles nhận `/vendor`, Worker `/worker`, CTV `/ctv`; các role khác không nhận subdomain URL. | Automated table-driven tests trên production mapping/login response. | Test names + output. | Yes |
| `AC-02` | `RQ-02` | Relative callback hợp lệ hoạt động; `https://evil`, `//evil`, backslash/malformed không thể điều hướng external. | Unit/component/contract tests. | Case matrix và PASS output. | Yes |
| `AC-03` | `RQ-03` | Portal unauthenticated behavior, API 401, `/bcc` fence, worker rate limit và `x-request-id` vẫn pass. | Existing + updated middleware tests. | Before/after inventory; targeted PASS. | Yes |
| `AC-04` | `RQ-04` | Ba legacy root URL map đúng landing; legacy URL có path/query map về root canonical; unknown host không thành redirect target; không loop. | Table-driven redirect tests exercise shared/production helper. | Exact input→expected matrix. | Yes |
| `AC-05` | `RQ-05` | Login response có host-only live cookie và legacy expiry cookie; logout expiry cả hai variants; không lộ token. | Header-level cookie tests. | Masked header/assertion evidence, không chép token. | Yes |
| `AC-06` | `RQ-06` | Login page không còn điều kiện dựa trên subdomain; generic/callback subtitle không gây hydration/build lỗi. | Static scan + component/build. | Diff + build PASS. | No |
| `AC-07` | `RQ-07` | Test mới không tự định nghĩa lại toàn bộ mapping để tự pass; imports/exercises source-of-truth. Role/cookie/redirect coverage được assertion. | Auditor reads tests + mutation-style reasoning. | Coverage table. | Yes |
| `AC-08` | `RQ-08` | `rg` không thấy runtime navigation/role mapping đến subdomain; mọi literal còn lại thuộc allowlist legacy/test/doc đã kê. | Scoped `rg` inventory. | Danh sách occurrence và classification. | Yes |
| `AC-09` | `RQ-09` | HANDOFF có runbook OP theo thứ tự preview → root smoke → legacy redirect → monitoring → tháo domain; không chứa secret. | HANDOFF review + secret-name/value scan. | Runbook section. | Yes |
| `AC-10` | `RQ-10` | Invalid login vẫn 401 chung; JWT TTL/signing/preauth transaction không đổi; full unit suite không regression. | Diff review + tests. | Test output/diff evidence. | Yes |
| `AC-11` | all | Typecheck, lint scoped/full theo repo convention, full Vitest và Next build exit 0; `git diff --check` pass. | Mandatory commands. | Command, exit code, test counts. | Yes |
| `AC-12` | scope | Diff chỉ gồm allowlist; không có M1-08 WIP, env/secret, AUDIT hoặc artifact của agent khác. | `git status`, `git diff --name-only`, secret scan. | Exact file list. | Yes |

### Mandatory verification commands

Tier 2 ghi command thật + exit code vào HANDOFF; Tier 3 chạy độc lập tối thiểu các gate blocking:

```powershell
powershell -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-01-single-domain-consolidation/TASK.md
npx tsc --noEmit
npx eslint middleware.ts app/api/auth/login/route.ts app/api/auth/logout/route.ts app/login/login-form.tsx app/login/page.tsx src/domains/security/portal-domains.integration.test.ts src/domains/security/security-matrix-portals.test.ts
npx vitest run src/domains/security/portal-domains.integration.test.ts src/domains/security/security-matrix-portals.test.ts src/shared/observability/middleware.test.ts
npx vitest run
npm run build
git diff --check
git status --short
rg -n --glob '!docs/**' --glob '!node_modules/**' "vendor\.hrpartner\.vn|worker\.hrpartner\.vn|ctv\.hrpartner\.vn" app src middleware.ts
```

Nếu Tier 2 rename test hoặc thêm test mới, command targeted phải được cập nhật trong HANDOFF và bao gồm file mới. Không được bỏ full suite/build chỉ vì targeted tests pass.

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01, STEP-05` | `AC-01, AC-07, AC-08` |
| `RQ-02` | `STEP-02, STEP-05` | `AC-02, AC-07` |
| `RQ-03` | `STEP-03, STEP-05` | `AC-03, AC-10` |
| `RQ-04` | `STEP-03, STEP-05` | `AC-04, AC-08` |
| `RQ-05` | `STEP-04, STEP-05` | `AC-05` |
| `RQ-06` | `STEP-02` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-01..05, AC-07` |
| `RQ-08` | `STEP-01..05` | `AC-08` |
| `RQ-09` | `STEP-07` | `AC-09` |
| `RQ-10` | `STEP-01..06` | `AC-10, AC-11` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Infinite redirect giữa root và subdomain. | Browser/network thấy chuỗi 30x hoặc `ERR_TOO_MANY_REDIRECTS`. | Một canonical origin; exact legacy allowlist; no role→host redirect; loop tests. | Revert task commit; giữ domain aliases hiện tại. |
| `RISK-02` | Cookie domain cũ và host-only cùng tên làm login/logout không ổn định. | Cookie header có hai token, logout xong vẫn authenticated. | Expire legacy variant trên login/logout; header-level tests; preview smoke với cookie jar sạch và cũ. | Roll back host-only switch; xóa cookie thủ công/runbook rồi redeploy fixed build. |
| `RISK-03` | Open redirect qua callback/forwarded host. | External URL xuất hiện trong `Location`/client navigation. | Relative-path validator + fixed target origin + hostile input tests. | Disable callback usage; fallback role landing `/bcc`. |
| `RISK-04` | Refactor middleware làm mất auth/rate-limit/request-id. | Existing middleware/observability tests fail hoặc header biến mất. | Chỉnh branch tối thiểu; mandatory regression suite. | Revert middleware portion; không đổi canonical DNS. |
| `RISK-05` | Xóa domain Vercel/DNS quá sớm làm link cũ chết. | 404/DNS error từ bookmark/QR/link cũ. | OP giữ alias redirect 2–4 tuần và theo dõi traffic trước khi tháo. | Reattach alias/DNS và redeploy redirect build. |
| `RISK-06` | Task vô tình kéo diff M1-08 hoặc secret local. | `git diff --name-only` ngoài allowlist. | Dependency gate, explicit forbidden scope, no stash/reset/stage-all. | Dừng, tách commit theo ownership; không xóa file người khác. |
| `RISK-07` | Internal role landing behavior đổi ngoài ý muốn. | ADMIN/HR login không về callback hoặc `/bcc`. | Table test đủ 13 roles; giữ fallback hiện tại. | Restore prior fallback, chỉ đổi portal roles. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Resolved: baseline M1-08 ACCEPTED là `2cd8a5594479c50c2a165ca41012402a6e549546`. | Tier 1 | `2026-08-28` | No |
| `Q-02` | Thời điểm OP tháo hẳn ba legacy domain sau redirect là ngày nào? | Owner/OP | Sau production monitoring | No — HANDOFF đề xuất 2–4 tuần |

Không có câu hỏi thiết kế nào khác được phép giao ngược cho Tier 2; các quyết định routing/cookie đã chốt trong §3.

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| — | — | Chưa audit | Task đang chờ M1-08 ACCEPTED | None | Tier 1 activation |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-28` | Tạo hợp đồng single-domain đầy đủ; canonical `hrpartner.vn`, role landing paths, cookie migration, legacy redirect, regression/audit gates. | Owner yêu cầu bỏ subdomain và chuẩn bị task chạy ngay sau M1-08. |
| `v1.0` | `2026-08-28` | Mở dependency gate, pin baseline M1-08 ACCEPTED và chuyển sang `READY_FOR_EXECUTION` round 1. | M1-08 audit round 1 PASS; Planner acceptance `2cd8a55`. |
