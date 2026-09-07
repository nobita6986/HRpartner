# TASK: hrp-v5-go-live-21-credential-hygiene-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-21-credential-hygiene-closure` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.0` |
| Status | `DRAFT` — đã viết đủ contract nhưng chưa giao `/code` khi TEST-01 còn sở hữu `.gitignore` trong index |
| Planner | `Tier 1 / Codex` |
| Executor | `Tier 2` cho repo hygiene; `Owner/OP` cho Neon và Vercel |
| Auditor | `Tier 3 independent context` |
| Baseline | `7dd576e` |
| Modules | `Go-live security hygiene; Prisma seed; Vercel; Neon; repository artifacts` |
| ADR references | `PLANNER_HANDOVER.md §13`; fail-closed LIVE DB convention; one Tier 2 stream |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | TEST-01 phải `ACCEPTED` và commit scoped trước. Sau đó Tier 1 rebase evidence, bump sang `READY_FOR_EXECUTION`, giao `/code hrp-v5-go-live-21-credential-hygiene-closure`; Owner chỉ mở OP window sau khi Tier 2 bàn giao dry-run và rollback |
| Updated | `2026-09-07 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

HRPartner tiếp tục đăng nhập, đọc việc làm, ứng tuyển và quản trị bình thường sau một lượt thay toàn bộ credential có nguy cơ lộ. Repository không còn track tệp môi trường chứa giá trị thật, seed không còn mật khẩu cố định, Vercel không còn biến chẩn đoán thừa, nhánh Neon cứu hộ hết hạn được xoá đúng tên, dữ liệu DEMO được dọn bằng manifest chính xác và mọi phép xác nhận cuối đều không in secret hoặc PII.

> **Cửa vận hành có khả năng làm gián đoạn production.** Tier 2 chỉ chuẩn bị code, inventory, dry-run và runbook. Chỉ Owner/OP được rotate role, sửa Vercel, xoá Neon branch hoặc xoá dữ liệu production. Thiếu approval ở từng OP step là `OWNER_BLOCKED`, không phải PASS và không được lách bằng credential cũ.

### Non-goals

- Không đổi mô hình RLS, policy, role membership hoặc schema nghiệp vụ.
- Không triển khai Affiliate, payroll, attendance hay V6 Admin Rebuild.
- Không xoá `hrp_mp2_test` hoặc rotate TEST Upstash token chỉ vì nó dùng cho test.
- Không rewrite lịch sử Git để xoá secret. Nếu scan thấy secret trong history, dừng và lập kế hoạch riêng trước khi force-push.
- Không dùng `git clean`, glob xoá rộng, prefix-only delete hoặc reset/stash worktree dùng chung.
- Không biến `.env.example` thành tệp chứa giá trị dùng được.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/PLANNER_HANDOVER.md §13` | Sổ nợ có 11 mục: rotate ba DB role, cập nhật Vercel, bỏ `DB_DIAG_TOKEN`, xử lý seed password, local env, scratch, một Neon branch và DEMO data | Contract gom thành một cửa duy nhất, nhưng tách rõ Tier 2 với Owner/OP |
| `EV-02` | `git ls-files '.env*'`, đo 2026-09-07 | Bốn tệp env đang tracked: `.env.dev`, `.env.example`, `.env.preview`, `.env.prod.test` | Chỉ `.env.example` được phép tiếp tục tracked; ba tệp còn lại phải được untrack sau khi có mẫu thay thế cần thiết |
| `EV-03` | Key-only scan 2026-09-07, không in value | `.env.dev` có các khóa DB/JWT/account ở trạng thái SET; `.env.preview` và `.env.prod.test` có Vercel/OIDC-shaped values SET | Coi toàn bộ là secret cho đến khi Owner chứng minh không còn hiệu lực; add/delete file không thay thế rotation |
| `EV-04` | `Get-ChildItem -Force -Filter '.env*.local'`, đo 2026-09-07 | Có `.env.local`, `.env.ops06a-test.local`, `.env.production.local`; không còn `.env.test.local` | Không lặp yêu cầu xoá file đã vắng. Ba file hiện hữu phải được Owner phân loại KEEP/DELETE; Tier 2 không đọc hoặc chép value vào evidence |
| `EV-05` | `prisma/seed.mjs:28-62,383-389` | Hai account đầu đã đọc phone/password từ env và skip khi thiếu; một worker demo vẫn hash một password literal | Chỉ sửa residual literal; không viết lại logic seed đã fail-closed |
| `EV-06` | `rg DB_DIAG_TOKEN` ngoài scratch, đo 2026-09-07 | Chỉ còn ghi chú trong Planner handover; không thấy production source reference | Công việc là xoá biến trên Vercel và chứng minh app không phụ thuộc, không phát minh code mới |
| `EV-07` | `docs/PLANNER_HANDOVER.md §13` | Nhánh cần xoá là chính xác `pre-mp2-remediation-2026-08-28`; `hrp_mp2_test` phải giữ | Runbook bắt buộc allowlist exact-name và post-check nhánh test vẫn tồn tại |
| `EV-08` | `docs/PLANNER_HANDOVER.md §13` | Có job public DEMO không mang tiền tố `DEMO` | Dọn bằng exact primary keys/slugs và FK-aware plan; cấm `LIKE '%DEMO%'` làm tiêu chí duy nhất |
| `EV-09` | Worktree snapshot 2026-09-07 | `scratch/` có nhiều artifact của nhiều task/agent, còn `.gitignore` đang thuộc TEST-01 chưa ACCEPTED | Không giao task này trước TEST-01; cleanup phải có attribution manifest, không blanket delete |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Tách hai lane trong cùng contract: Tier 2 chuẩn bị repo/runbook; Owner thực thi OP. Tier 3 chỉ audit sau khi cả hai lane có evidence | Tier 1 | Final |
| `DEC-02` | CHOSEN | Chỉ `.env.example` được tracked. `.env.dev`, `.env.preview`, `.env.prod.test` phải rời index và được ignore; nếu cần mẫu thì chuyển thành khóa rỗng trong `.env.example` | EV-02/03 | Final |
| `DEC-03` | CHOSEN | Xóa file không thu hồi secret. Mọi credential có khả năng đã track/chat/log phải rotate; bằng chứng chỉ ghi role, target đã mask, timestamp và kết quả, không ghi value | Security invariant | Final |
| `DEC-04` | CHOSEN | Rotation order: tạo/xác minh credential mới → cập nhật Vercel atomically → redeploy/smoke → revoke credential cũ. `DATABASE_URL` và `DATABASE_URL_ADMIN` phải đúng role, không tráo runtime writer với owner | Owner + RLS posture | Final |
| `DEC-05` | CHOSEN | Không rotate hoặc xoá TEST assets không nằm trong incident: giữ `hrp_mp2_test`; TEST Upstash token được giữ theo quyết định Owner. Tệp local chứa chúng vẫn phải được quản lý như secret | Owner | Final |
| `DEC-06` | CHOSEN | Dữ liệu DEMO chỉ được xoá bằng manifest exact-ID có preview counts, FK order, transaction và post-check. Mismatch count hoặc ID ngoài allowlist thì rollback/dừng | EV-08 | Final |
| `DEC-07` | CHOSEN | Không rewrite Git history trong task này. Tier 3 scan HEAD/index/worktree; phát hiện secret còn hiệu lực trong history là finding riêng và Owner quyết định history rewrite | Risk containment | Final |
| `DEC-08` | ASSUMPTION | Vercel project đích duy nhất là project đang phục vụ `hrpartner.vn` | Owner phải xác nhận trong OP preflight | Hết hạn trước `OP-02` |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Sinh manifest key-only/path-only cho tracked env, local env và credential-shaped artifact; tuyệt đối không in value, connection string, phone, password hoặc token | Must P0 | EV-02/03/04 | Có raw value trong log/evidence là FAIL và phải rotate thêm |
| `RQ-02` | Untrack `.env.dev`, `.env.preview`, `.env.prod.test`; giữ `.env.example` chỉ với empty/placeholder; thêm ignore exact paths mà không làm mất hai dòng Browser Lane | Must P0 | DEC-02, EV-09 | Còn tracked file hoặc làm hỏng TEST-01 ignore là FAIL |
| `RQ-03` | Bỏ residual fixed password ở `prisma/seed.mjs`; account demo chỉ tạo khi explicit env có mặt và không reset passwordHash của user đã tồn tại; không log secret/PII | Must P0 | EV-05 | Literal credential hoặc implicit default là FAIL |
| `RQ-04` | Chuẩn bị runbook rotation atomic cho `neondb_owner`, `cloud_admin`, `app_user_writer`, với masked preflight, rollback và post-check role posture | Must P0 | EV-01, DEC-03/04 | Không có rollback hoặc role bị tráo là STOP |
| `RQ-05` | Owner cập nhật đúng Vercel project cho `hrpartner.vn`, redeploy, smoke; xoá `DB_DIAG_TOKEN`; credential cũ bị revoke sau khi deployment mới xanh | Must P0 | EV-06, DEC-04/08 | Sai project/failed smoke thì rollback deployment, không revoke tiếp |
| `RQ-06` | Phân loại từng `.env*.local` hiện hữu thành KEEP/DELETE bằng tên file và purpose; xoá chỉ file Owner đánh DELETE, không đọc value vào evidence | Must | EV-04, DEC-05 | Không có Owner disposition là `OWNER_BLOCKED` |
| `RQ-07` | Lập attribution manifest cho `scratch/*` và root one-shot artifacts; chỉ dọn path được xác nhận obsolete, dùng path literal, giữ mọi artifact còn là evidence/task WIP | Must | EV-09 | Unknown ownership thì giữ và báo, không blanket delete |
| `RQ-08` | Owner xoá exact Neon branch `pre-mp2-remediation-2026-08-28` sau masked identity check; chứng minh `hrp_mp2_test` vẫn tồn tại và không đổi | Must | EV-07, DEC-05 | Target mismatch là STOP; test branch bị chạm là FAIL |
| `RQ-09` | Tạo DEMO cleanup manifest exact-ID, dry-run counts và FK-aware transactional executor; Owner duyệt manifest trước apply; post-check không còn bản ghi allowlisted và không mất non-DEMO | Must P0 | EV-08, DEC-06 | Count drift, extra IDs hoặc FK surprise thì rollback |
| `RQ-10` | Tier 3 độc lập chạy final secret scan, seed tests, unit/typecheck/build phù hợp, production auth/job/apply/tracking smoke và xác nhận old DB credentials fail | Must P0 | DEC-01/03 | Bất kỳ old credential còn dùng được hoặc smoke đỏ là FAIL |

### 4.2 Scope boundaries

**In scope:**

- `.gitignore`, `.env.dev`, `.env.preview`, `.env.prod.test`, `.env.example` sau khi TEST-01 đã commit.
- `prisma/seed.mjs` và test seed chuyên biệt.
- Một runbook mới dưới `docs/runbooks/` và script dry-run/apply DEMO cleanup mới dưới `scripts/ops/` nếu cần.
- Manifest path-only cho local env, scratch/root artifacts và DEMO exact IDs dưới thư mục task này.
- Vercel environment của project phục vụ `hrpartner.vn`; ba Neon roles nêu ở `RQ-04`; một Neon branch exact-name ở `RQ-08`.

**Out of scope:**

- `hrp_mp2_test`, Upstash TEST credentials, migrations, Prisma schema và RLS policies.
- Xoá toàn bộ `scratch/`, toàn bộ `.env*.local`, toàn bộ project có chữ DEMO hoặc mọi Neon branch theo pattern.
- Git history rewrite, GitHub secret rotation, domain/DNS redesign và V6 feature work.
- Source/deliverable đang thuộc TEST-01 cho đến khi task đó `ACCEPTED`.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** manifest DEMO phải ghi exact stable ID/slug, table, expected count và dependency order; không chứa PII. Secret evidence chỉ có hash/fingerprint không đảo ngược hoặc trạng thái SET/EMPTY.
- **State:** mỗi credential đi qua `NEW_CREATED → NEW_VERIFIED → DEPLOYED → SMOKE_GREEN → OLD_REVOKED`; cấm nhảy thẳng từ created sang revoked. Mỗi local/scratch path đi qua `DISCOVERED → OWNER_KEEP/OWNER_DELETE → VERIFIED`.
- **Permission/data scope:** Tier 2 không có quyền mutate Neon/Vercel/production. Owner chỉ thao tác exact project/role/branch đã preflight. Tier 3 read-only ngoại trừ fixture được contract cho phép trên TEST DB.
- **Interface:** URL người dùng giữ nguyên `https://hrpartner.vn`; login/admin/public job/apply/tracking response contract không đổi.
- **Failure/idempotency/concurrency:** repo cleanup và script phải chạy lại an toàn. DEMO apply dùng transaction/advisory lock hoặc equivalent single-run guard; mismatch trước commit gây rollback. Vercel/DB rotation thực hiện trong một cửa không có agent song song sửa env.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | `RQ-01` | Repo snapshot | Ghi HEAD, staged attribution và manifest key/path-only; không đọc value vào artifact | TEST-01 ACCEPTED | Secret-safe review | Phát hiện raw secret đã lọt output thì dừng/rotate scope |
| `STEP-01` | `RQ-02` | Env files + `.gitignore` | Untrack ba env file, giữ empty `.env.example`, thêm ignore exact paths | `STEP-00` | `git ls-files '.env*'` | Kết quả khác đúng `.env.example` thì dừng |
| `STEP-02` | `RQ-03` | `prisma/seed.mjs` + tests | Thay worker demo password literal bằng explicit env/fail-closed behavior | `STEP-00` | Focused mutation test | Seed có thể tạo user với password mặc định thì dừng |
| `STEP-03` | `RQ-04` | `docs/runbooks/credential-hygiene-cutover.md` | Viết preflight/rotation/order/rollback và masked evidence template | Owner input | Tabletop walkthrough | Thiếu credential recovery path thì chưa mở OP |
| `STEP-04` | `RQ-07` | Path attribution manifest | Phân nhóm KEEP/DELETE/UNKNOWN cho scratch và one-shot root artifacts | Shared worktree status | Exact path count | UNKNOWN bị đưa vào delete là dừng |
| `STEP-05` | `RQ-09` | DEMO manifest + ops script | Read-only inventory, exact allowlist, dry-run counts, transaction và post-check | Safe DB read target | Dry-run twice same counts | Drift hoặc query vượt allowlist thì dừng |
| `STEP-06` | `RQ-01..09` | `HANDOFF.md` | Tier 2 bàn giao repo gates, runbook, dry-run và Owner action list; không tự chạy OP | All prior steps | verify-handoff | Không có rollback/expected counts thì BLOCKED |
| `STEP-07` | `RQ-04` | Neon roles — Owner/OP | Owner tạo và verify ba credential mới bằng masked identity/posture | Approved maintenance window | role/user/posture checks | Sai role, BYPASSRLS hoặc owner posture thì rollback |
| `STEP-08` | `RQ-05` | Vercel production — Owner/OP | Owner cập nhật vars, xoá `DB_DIAG_TOKEN`, redeploy và smoke trước revoke | `STEP-07`, DEC-08 confirmed | deployment + smoke | Bất kỳ route P0 đỏ thì rollback deployment |
| `STEP-09` | `RQ-04` | Old credentials — Owner/OP | Owner revoke ba credential cũ, xác nhận chúng fail và credential mới vẫn xanh | `STEP-08` green | masked negative login | Old credential còn dùng được thì FAIL |
| `STEP-10` | `RQ-06..08` | Local files, artifacts, Neon branch — Owner/OP | Owner áp exact KEEP/DELETE decisions và xoá exact backup branch | Tier 2 manifests | existence checks | Target khác allowlist thì dừng |
| `STEP-11` | `RQ-09` | Production DEMO rows — Owner/OP | Owner duyệt manifest, chạy apply transaction rồi post-check | `STEP-05` stable | before/after counts | Count drift thì rollback |
| `STEP-12` | `RQ-10` | Full closure | Tier 3 tự đo repository, credentials, deployment and user journeys | All Owner/OP steps | Independent audit | Không có LIVE evidence thì `OWNER_BLOCKED`, không PASS |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Manifest liệt kê đủ tracked/local/scratch classes và không chứa raw value/PII | Chạy scanner key/path-only; manual review output và chạy secret canary | Counts, path classes, redaction self-test | Yes |
| `AC-02` | `RQ-02` | `git ls-files '.env*'` trả đúng một path `.env.example`; file đó không có usable secret; ignore vẫn chứa Browser output + local env rules | Exact commands and file review | Raw command outputs đã mask | Yes |
| `AC-03` | `RQ-03` | Không password literal/default trong seed; thiếu env không tạo/reset account; có env test tạo account với hash và không log secret | Focused tests + RED/GREEN mutation | Test names/counts và mutation record | Yes |
| `AC-04` | `RQ-04` | Ba credential mới đúng identity/posture; ba credential cũ đều đăng nhập thất bại sau cutover | Chạy masked DB identity/posture probe và manual review result matrix | Role names, host fingerprint, timestamps, results | Yes |
| `AC-05` | `RQ-05` | Production deployment mới dùng vars mới, `DB_DIAG_TOKEN` vắng, login/admin/jobs/apply/tracking smoke xanh trước và sau revoke | Vercel env name-only check + browser/API smoke | Deployment ID, route matrix, no values | Yes |
| `AC-06` | `RQ-06` | Mỗi `.env*.local` có Owner KEEP/DELETE; mọi DELETE path vắng và KEEP path vẫn ignored/untracked | Chạy `Test-Path` từng literal path và `git check-ignore` từng KEEP path | Disposition table | Yes |
| `AC-07` | `RQ-07` | Không artifact DELETE còn tồn tại; không path KEEP/UNKNOWN bị mất; không dùng glob/clean command | Before/after exact path set | Manifest diff | Yes |
| `AC-08` | `RQ-08` | Backup branch exact-name vắng; `hrp_mp2_test` còn nguyên identity và kết nối test hợp lệ | Neon branch list/name-only + safe test query | Masked branch IDs/results | Yes |
| `AC-09` | `RQ-09` | Dry-run lặp lại cùng counts; apply chỉ xóa exact allowlist; post-check DEMO allowlist = 0 và non-DEMO sentinel không đổi | Chạy ops script hai lần ở dry-run, một lần apply và một lần post-check; manual review transaction log | Manifest hash, before/after counts | Yes |
| `AC-10` | `RQ-10` | Unit, typecheck và production smoke đều xanh trên final tree/deployment | Canonical commands/runbook | Exit codes, test counts, deployment ID | Yes |
| `AC-11` | `RQ-10` | Tier 3 scan HEAD/index/worktree không thấy active credential/connection string; known-secret fingerprint set có zero match, không in fingerprint source | Chạy independent secret scanner với RED canary rồi GREEN; manual review zero-match summary | Canary results + zero-match summary | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-00`, `STEP-06` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-03`, `STEP-07`, `STEP-09` | `AC-04` |
| `RQ-05` | `STEP-08` | `AC-05` |
| `RQ-06` | `STEP-10` | `AC-06` |
| `RQ-07` | `STEP-04`, `STEP-10` | `AC-07` |
| `RQ-08` | `STEP-10` | `AC-08` |
| `RQ-09` | `STEP-05`, `STEP-11` | `AC-09` |
| `RQ-10` | `STEP-12` | `AC-10`, `AC-11` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Production mất DB connection giữa rotation | Revoke cũ trước deployment/smoke mới | DEC-04 state order | Restore previous Vercel deployment while old credential còn active; chỉ revoke sau smoke |
| `RISK-02` | Runtime dùng owner hoặc BYPASSRLS | Identity/posture probe lệch | AC-04 bắt role posture trước deploy | Không deploy; bỏ credential mới và sửa grant/URL |
| `RISK-03` | Xoá nhầm env/scratch WIP của agent khác | Glob, unknown attribution | Exact paths + KEEP/DELETE/UNKNOWN | Giữ UNKNOWN; phục hồi tracked file từ commit, untracked chỉ xoá sau Owner disposition |
| `RISK-04` | Xoá nhầm dữ liệu thật vì tên chứa DEMO hoặc không chứa DEMO | Prefix/pattern delete | Exact manifest + counts + transaction | Rollback transaction; restore branch/PITR nếu lỗi chỉ phát hiện sau commit |
| `RISK-05` | Secret đã ở Git history dù HEAD sạch | Historical scan/fingerprint hit | Task không rewrite history | Revoke ngay, mở incident/history-rewrite plan riêng, phối hợp mọi clone/remote |
| `RISK-06` | TEST lane mất vì xoá nhầm branch | Pattern-based branch cleanup | Exact branch allowlist, negative guard cho `hrp_mp2_test` | Dừng trước delete; nếu đã mất, restore từ protected parent/PITR và reapply test migrations |
| `RISK-07` | Contract xung đột `.gitignore` với TEST-01 | Chạy trước Browser acceptance | Status DRAFT + hard dependency | Không giao `/code`; rebase sau TEST-01 scoped commit |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Xác nhận Vercel project duy nhất phục vụ `hrpartner.vn` và môi trường Production đích | Owner | Trước OP-02 | Yes |
| `Q-02` | Owner disposition KEEP/DELETE cho `.env.local`, `.env.ops06a-test.local`, `.env.production.local` | Owner | Trước OP-04 | Yes cho AC-06, không chặn Tier 2 prep |
| `Q-03` | Secret trong tracked `.env.dev`/Vercel-generated files còn hiệu lực ở hệ thống nào ngoài Neon/Vercel không? | Owner | Trước OP-01 | Yes nếu có thêm provider cần rotate |
| `Q-04` | Maintenance window và restore point/PITR cho DEMO cleanup là khi nào? | Owner | Trước OP-05 | Yes |

## 9. Planner Resolution

Chưa audit. Tier 1 giữ task ở `DRAFT` vì TEST-01 hiện còn sở hữu `.gitignore` và các Browser artifacts trong shared index. Việc duy nhất được phép trước khi dependency đóng là review contract và trả lời `Q-01..Q-04`; không executor nào được tự chạy OP steps từ tài liệu này.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| N/A | N/A | N/A | Chưa giao execution | None | Tier 1 mở sau TEST-01 ACCEPTED |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-09-07 | Tạo contract một cửa cho repo hygiene, atomic DB/Vercel rotation, exact branch/artifact cleanup, DEMO cleanup và independent closure. Cập nhật evidence hiện tại: `.env.test.local` đã vắng; ba tracked env ngoài `.env.example` và một residual seed password literal mới là điểm phải xử lý. | Owner yêu cầu thực thi danh sách việc trước mắt; `PLANNER_HANDOVER.md §13`; scan key/path-only 2026-09-07 |
