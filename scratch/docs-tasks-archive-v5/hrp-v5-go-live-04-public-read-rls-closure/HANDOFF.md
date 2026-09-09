# HANDOFF: hrp-v5-go-live-04-public-read-rls-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-04-public-read-rls-closure` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2 — Engineer` |
| Baseline | `a2c750bc081963301f7ac7917a8ec1dc7a2352fe` — `a2c750b docs(go-live): prepare card truth and launch proof tasks` trên `main`. TASK §0 ghi `776a3c1` kèm điều kiện "nếu go-live-03 đã commit trước round này thì khoá lại bằng `git log -1`"; điều kiện đó đúng nên tôi khoá SHA thật ở trên. Start state: 11 file tracked đã `M` (9 in-scope round này + `public/index.html` và `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md` là WIP của người khác), 0 file staged |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-30 Asia/Bangkok` |

## 1. Outcome Summary

Defect P0 đã đóng ở tầng code và đo được trên HTTP thật: ba call site công khai không còn gọi
`prisma.$transaction` trần, cả ba đi qua đúng MỘT helper `withPublicDb` đặt bốn GUC
transaction-local ở mức `MKT` trong transaction READ-ONLY. Cặp RED/GREEN trên cùng một máy,
cùng một `DATABASE_URL`: `GET /api/jobs` từ `total 0` → `total 2` (`DA-DEMO-001`, `DA-DEMO-002`);
`GET /api/jobs/DA-DEMO-001` từ `404` → `200`; slug bịa vẫn `404 NOT_FOUND`; `GET /job-board`
render HTML có cả hai mã dự án. Không migration, không `CREATE ROLE`, không đổi policy/function,
không seed/publish/unpublish, không sửa `public.service.ts`, không chạm đường RPC.

Bộ test đã thôi hợp thức hoá danh sách rỗng: fixture happy path của
`marketplace-browse.routes.test.ts` có job thật, detector tĩnh mới chốt ba call site, và
`marketplace-inventory.static.test.ts` giữ nguyên ý nghĩa "limiter chạy trước khi chạm DB" với
mốc neo bền refactor. AC-09 đã chứng minh bộ test có răng thật: đột biến `'MKT'` → `'ADMIN'` làm
2 file ĐỎ, hoàn nguyên thì XANH lại và file helper về đúng byte cũ (SHA-256 khớp).

Phần CHƯA hoàn thành, và tôi không được phép ghi PASS cho nó: bốn AC blocking chạy trên DB thật
qua integration lane (`AC-06`, `AC-07`, `AC-08`, `AC-10`) ở trạng thái `ENV_BLOCKED`. Máy này
không có `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`; preflight in đúng `ENV_BLOCKED` và exit
0 — theo `DEC-12` đó KHÔNG phải PASS. Theo `RISK-04` đây cũng KHÔNG phải expiry (branch
`br-misty-cell-az3nx5l3` đã bỏ expiry ngày 30/08, credential không đổi): thiếu là ở phía biến môi
trường của máy chạy. Tôi không tự mint, không tự đọc/echo giá trị secret, và không chạy test LIVE
lên `hrp-live` vì `DEC-06` khoá live ở chế độ chỉ đọc còn test LIVE có seed. Chi tiết ở `BLK-01`.

Tôi không tự audit và không tuyên bố task accepted. Không commit, không push, không stage.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-00` | `RQ-01`, `RQ-02` | worktree + `npm run dev` | `DONE` — baseline `a2c750bc0819…`, `git status --short` đầu round đã chụp; RED đo được: `total 0` và `404` | Baseline SHA khác TASK: đúng theo câu điều kiện ở §0 của TASK |
| `STEP-01` | `RQ-03`, `RQ-04`, `RQ-05` | `src/shared/auth/with-public-db.ts` (mới) — `PUBLIC_READ_PRINCIPAL`, `withPublicDb`, `PUBLIC_READ_ONLY_GUC` | `DONE` — read-only đặt bằng `set_config('transaction_read_only','on',true)` làm câu ĐẦU TIÊN, rồi `applyRlsContext`. Không `try/catch` | None. Chọn `set_config` thay `SET TRANSACTION READ ONLY` đúng nhánh TASK cho phép (tránh bẫy `25001`) |
| `STEP-02` | `RQ-07`, `RQ-04`, `RQ-05` | `src/shared/auth/with-public-db.test.ts` (mới) — 7 test trên `tx` giả | `DONE` — 4 GUC đều `is_local = true`, `app.role` là `'MKT'` và assert KHÔNG phải `'ADMIN'`, có câu read-only, callback nhận đúng `tx`, lỗi set GUC được ném ra | None |
| `STEP-03` | `RQ-01`, `RQ-03` | `app/api/jobs/route.ts` thân `GET` | `DONE` — 5 dòng đổi, tham số `listPublicJobProjection` y nguyên, `enforceRateLimits` vẫn đứng đầu, `POST` 410 không chạm | None |
| `STEP-04` | `RQ-02`, `RQ-03` | `app/api/jobs/[slug]/route.ts` thân `GET` | `DONE` — 5 dòng đổi, nhánh `404 NOT_FOUND` giữ nguyên | None |
| `STEP-05` | `RQ-03` | `app/job-board/page.tsx` (call site thứ ba, server component) | `DONE` — 5 dòng đổi, chỉ đường lấy dữ liệu; markup, empty state, link giữ nguyên | None |
| `STEP-06` | `RQ-03`, `RQ-07` | `src/shared/auth/public-read-guc.static.test.ts` (mới) — 5 test | `DONE` — ba đường dẫn viết cứng; chốt không còn `$transaction` trần, đều tham chiếu helper, helper có `'MKT'`, KHÔNG có `'ADMIN'`, có marker read-only | None |
| `STEP-07` | `RQ-03` | `src/domains/applications/marketplace-inventory.static.test.ts` dòng 119-138 | `DONE` — mốc neo `$transaction` → `getPrisma(` cho cả bốn route; thêm `expect(dbAt).toBeGreaterThan(0)` để mốc mới không thể là `-1` mà vẫn "đúng" | None. Assert vẫn so hai chỉ số THẬT của cùng handler; không xoá, không nới |
| `STEP-08` | `RQ-01`, `RQ-07` | `src/domains/applications/marketplace-browse.routes.test.ts` — 12 test | `DONE` — fixture happy path có job thật thay `{ jobs: [], total: 0 }`; thêm assert handler đi qua helper (mock `withPublicDb`) | None |
| `STEP-09` | `RQ-03` | `src/shared/auth/api-boundary.static.test.ts` header dòng 18-20 — 27 test | `DONE` — chỉ sửa lời văn theo `DEC-08`; logic detector không đổi | None |
| `STEP-10` | `RQ-06`, `RQ-07`, `RQ-08` | `src/shared/auth/live-public-read-rls.go-live-04.test.ts` (mới) + `vitest.integration-files.ts` + `vitest.integration.config.ts` + `vitest.unit.config.ts` | `BLOCKED` — file LIVE viết xong đủ 5 test ((a)(b)(c)(d) của `DEC-05` + `25006`), tự seed rồi dọn trong `finally`, đã đăng ký lane (1 dòng mỗi file, không đổi gì khác). Lane in `ENV_BLOCKED` nên test CHƯA CHẠY | `ENV_BLOCKED` theo đúng stop condition của STEP-10. Không force-pass, xem `BLK-01` |
| `STEP-11` | tất cả | 5 gate | `DONE` — cả 5 exit 0, số thật ở §3 `AC-13` | Gate 5 exit 0 nhưng là `ENV_BLOCKED`, không phải một lượt chạy |
| `STEP-12` | `RQ-01`, `RQ-02` | dev server + HANDOFF này | `DONE` — GREEN đo đúng hai lệnh của `STEP-00`, cùng máy cùng `DATABASE_URL`; cặp RED/GREEN dán cạnh nhau ở `AC-01`/`AC-02`; `git status --short` cuối round ở `AC-12`. Không commit, không push | None |

## 3. Acceptance Evidence

**Ghi đúng lệnh chính xác đã chạy — Tier 3 sẽ chạy lại từng lệnh này.** Shell là PowerShell 5.1
(không có `&&`/`||`). Hai lệnh HTTP cần `npm run dev` đang chạy và phải đo TRƯỚC khi chạy
`npm run build` — build ghi đè `.next` của dev server đang chạy làm nó trả 500 rỗng (xem `LIM-03`).

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-04-public-read-rls-closure\TASK.md` | `RESULT: PASS`, exit 0 | `RESULT: PASS. TASK contract is ready for execution.` | `None` |
| `AC-01` | `$r = Invoke-WebRequest -Uri 'http://localhost:3000/api/jobs' -UseBasicParsing; "STATUS=$($r.StatusCode)"; [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())` — chạy 2 lần: RED ở `STEP-00` (trước `STEP-03`), GREEN ở `STEP-12` | RED: `STATUS=200` với `total` = `0`. GREEN: `STATUS=200` với `total` = `2` | RED: `jobs` rỗng, `"total": 0` — không lỗi, không exception, đúng chế độ hỏng-thành-rỗng-im-lặng. GREEN: `jobs` có `DA-DEMO-001` (`Nhà máy Điện tử Kinh Bắc — Bắc Ninh`, `availableSlots` 10) và `DA-DEMO-002` (`Kho vận Yên Phong`, `availableSlots` 5). Cùng một máy, cùng `DATABASE_URL`, chỉ khác đường đọc | `None` |
| `AC-02` | GREEN/RED: cùng lệnh trên với `/api/jobs/DA-DEMO-001`. Slug bịa: `try { Invoke-WebRequest -Uri 'http://localhost:3000/api/jobs/KHONG-TON-TAI-GL04' -UseBasicParsing } catch { "STATUS=$($_.Exception.Response.StatusCode.value__)"; $_.ErrorDetails.Message }` | RED: `404`. GREEN: `STATUS=200`. Slug bịa: `STATUS=404` | Ba phép đo đúng như AC đòi. GREEN trả `{ job: … }` của `DA-DEMO-001`. Slug bịa trả `{"error":"NOT_FOUND","message":"Job not found"}` ⇒ `404` nay chỉ còn nghĩa "không publish / không tồn tại", không còn là hệ quả thiếu GUC | `None` |
| `AC-03` | `npm run test:unit` (detector `STEP-06` = `src/shared/auth/public-read-guc.static.test.ts`, 5 test) + `git --no-pager diff -- app/api/jobs/route.ts "app/api/jobs/[slug]/route.ts" app/job-board/page.tsx` | exit 0 — `Test Files 93 passed (93)`, `Tests 1420 passed (1420)` | Diff: cả ba file thêm `import { withPublicDb } from '@/src/shared/auth/with-public-db';` và đổi `prisma.$transaction(` → `withPublicDb(prisma, `. `-` chỉ 3 dòng, mỗi file 1 dòng, đúng dòng `$transaction` cũ. Call site thứ ba là server component nên không lộ khi chỉ đo HTTP `/api/jobs` — detector viết cứng cả ba đường dẫn | `None` |
| `AC-04` | `npm run test:unit` + `git --no-pager diff -- src/domains/applications/marketplace-inventory.static.test.ts` | exit 0; file này XANH, diff `11 +++-` | Vòng lặp vẫn đủ bốn route (`CANONICAL_APPLY`, `LEGACY_JOBS`, `TRACKING`, `jobs/[slug]/route.ts`). Assert mới: `limiterAt = handler.indexOf('enforceRateLimits')`, `dbAt = handler.indexOf('getPrisma(')`, rồi `expect(limiterAt).toBeGreaterThanOrEqual(0)`, `expect(dbAt).toBeGreaterThan(0)`, `expect(limiterAt).toBeLessThan(dbAt)` — vẫn là hai chỉ số THẬT của cùng handler, thêm chốt `dbAt > 0` để mốc không tìm thấy (`-1`) không thể lọt thành "đúng" | `None` |
| `AC-05` | `npm run test:unit` (`with-public-db.test.ts` 7 test) + `git grep -n --untracked "ADMIN" -- src/shared/auth/with-public-db.ts app/api/jobs/route.ts "app/api/jobs/[slug]/route.ts" app/job-board/page.tsx` + positive control cùng lệnh với `"MKT"` | grep `ADMIN`: exit 1, KHÔNG dòng nào. Positive control `MKT`: exit 0, có hit trong file helper. test: exit 0 | Helper đặt `app.role = 'MKT'` và `app.user_id = 'system:public-job-board-read'` (hằng dạng `system:`). Bắt buộc dùng `--untracked`: helper là file MỚI nên `git grep` thường BỎ QUA nó và trả exit 1 "sạch" giả — lần chạy đầu tôi bị đúng bẫy này, xem `DEV-01`. Positive control là bằng chứng grep thật sự đọc được file untracked | `None` |
| `AC-06` | `npm run test:integration` → `src/shared/auth/live-public-read-rls.go-live-04.test.ts`, test `AC-06: dự án is_public = false vắng mặt ở mọi đường đọc công khai` | `ENV_BLOCKED` | KHÔNG ĐO ĐƯỢC. Test đã viết: seed hai dự án giống nhau MỌI thứ trừ `is_public`, chứng minh fixture non-public TỒN TẠI qua `DATABASE_URL_ADMIN` trước, rồi qua `withPublicDb` assert vắng mặt ở CẢ hai tầng — service (`list`/`detail`) và RLS (`tx.project.findMany({ where: { id: privId } })` phải 0 dòng) | `ENV_BLOCKED` — thiếu `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST`. Theo `DEC-12` đây KHÔNG phải PASS. Xem `BLK-01` |
| `AC-07` | `npm run test:integration` → test `AC-07: DELETE phát trong transaction của helper bị từ chối SQLSTATE 25006` | `ENV_BLOCKED` | KHÔNG ĐO ĐƯỢC. Test đã viết: `tx.$executeRawUnsafe('DELETE FROM outsourcing_projects WHERE id = $1', NO_MATCH_ID)` trong transaction của helper; đọc SQLSTATE ở `err.meta.code` (Prisma bọc thành `P2010`) và fallback quét `\b25006\b` trong message; `expect(sqlstate).toBe('25006')` nên không ném lỗi ⇒ ĐỎ. `WHERE` trỏ id không tồn tại nên kể cả khi read-only hỏng cũng không xoá được dòng nào; chốt lại bằng `admin.project.count(...) === 2` | `ENV_BLOCKED`. Xem `BLK-01` |
| `AC-08` | `npm run test:integration` → test `AC-08: cùng kết nối, KHÔNG set GUC ⇒ app.role rỗng và 0 dòng` | `ENV_BLOCKED` | KHÔNG ĐO ĐƯỢC trong lane. Test đã viết: `writer.$transaction` TRẦN, cùng kết nối, cùng hai truy vấn ⇒ assert `readRlsContext(tx).role === ''`, `total === 0`, `jobs` rỗng, `detail === null`. Bù một phần bằng bằng chứng gián tiếp ĐÃ đo được: RED của `AC-01`/`AC-02` chính là negative control trên cùng `DATABASE_URL` local (0 dòng khi không GUC) ⇒ role của kết nối này không thể là BYPASSRLS, nên GREEN không phải false green (`RISK-03`) | `ENV_BLOCKED` cho phép đo trên test DB. Bằng chứng gián tiếp là HTTP local, không phải log lane — không được tính là `AC-08` |
| `AC-09` | Chu trình: `Get-FileHash src\shared\auth\with-public-db.ts -Algorithm SHA256` → sửa `'MKT'` thành `'ADMIN'` ở dòng 50 → `npm run test:unit` → hoàn nguyên → `Get-FileHash` lại → `npm run test:unit` | Đột biến: exit 1 — `Test Files 2 failed \| 91 passed (93)`, `Tests 2 failed \| 1418 passed (1420)`. Hoàn nguyên: exit 0 — `1420 passed (1420)` | Hai output ĐỐI NGHỊCH thật. Hai test đỏ: `public-read-guc.static.test.ts:49` (`expected … not to contain 'ADMIN'`) và `with-public-db.test.ts:64` (`Expected: "MKT" / Received: "ADMIN"`) ⇒ có cả răng tĩnh và răng hành vi. Hash trước và sau bằng nhau: `84326E73359F3B5BB35596C63347E3C152265B18876D99570D7892F6BE66755C` | AC đòi `git diff` rỗng trên file helper, nhưng helper là file MỚI/untracked nên `git diff` LUÔN rỗng và không chứng minh gì. Tôi thay bằng cặp SHA-256 và đã chạy lại toàn bộ chu trình SAU khi sửa comment (`DEV-01`) để hash nói về đúng bytes cuối cùng. Xem `LIM-01` |
| `AC-10` | `npm run test:integration` → 5 test của `live-public-read-rls.go-live-04.test.ts`, đặc biệt `AC-10(a)` và `AC-10(c)` | `ENV_BLOCKED` — lane KHÔNG chạy | KHÔNG ĐO ĐƯỢC. Test đã viết đủ ba điều kiện `DEC-05`: (a) `SELECT current_user::text, r.rolbypassrls, r.rolsuper FROM pg_roles r WHERE r.rolname = current_user` ⇒ assert cả `rolbypassrls` và `rolsuper` là `false` (superuser bỏ qua RLS bất chấp cờ nên phải chốt cả hai); (b) negative control ở `AC-08`; (c) qua helper: `total >= 1`, slug chứa fixture public, `current_setting('transaction_read_only') = 'on'`, và một lần `tx.project.findMany` KHÔNG `where` để quét TOÀN BỘ tập dòng nhìn thấy được với `expect(leaked).toEqual([])` | `ENV_BLOCKED`. Đây là AC duy nhất chứng minh được posture RLS của kết nối; thiếu nó thì evidence local chỉ mạnh tới mức `RISK-03`. Xem `BLK-01` |
| `AC-11` | `npm run test:unit` + `git --no-pager diff -- src/domains/applications/marketplace-browse.routes.test.ts` | exit 0; file này 12 test XANH; diff `72 ++++++---` | Fixture happy path không còn `{ jobs: [], total: 0 }`: nay trả job thật và assert handler trả đúng job đó cùng `total` khớp. Thêm assert handler đi qua helper công khai (mock `withPublicDb` và kiểm tra nó ĐƯỢC GỌI) thay vì chỉ mock `$transaction` trần — đây chính là chỗ bộ test cũ hợp thức hoá danh sách rỗng nên gate xanh suốt trong khi production chết | `None` |
| `AC-12` | `git log -1 --format=%H`, `git status --short`, `git status --short -uno`, `git diff --stat`, `git diff --cached --stat` — chụp ở đầu round và cuối round | Cuối round: 11 file `M`, 0 file staged, `11 files changed, 192 insertions(+), 83 deletions(-)` | 9/11 file là in-scope §4.2. 2/11 là WIP người khác và ĐỨNG YÊN: `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md` (`1 +`) và `public/index.html` (`156` dòng). Chứng minh bằng số học: đầu round cặp này là `2 files changed, 98 insertions(+), 59 deletions(-)` = 157 dòng đổi; cuối round `1 + 156 = 157` ⇒ y nguyên. Phần in-scope: 6 file test/lane `82 insertions(+), 21 deletions(-)` cộng 3 call site `+12/-3` = `94/-24`; `94 + 98 = 192` và `24 + 59 = 83` ⇒ khớp tuyệt đối tổng `--stat`, không có dòng nào rơi ra ngoài scope. 4 file untracked của tôi đều trong §4.2. Không `git add`, không `git add -A`, không `restore`, không `reset` | Untracked có thêm file KHÔNG phải của tôi (`scratch/golive03-*`, `scratch/neon-schemadiff-*`, `.neon`, `docs/aff_plan*.md`, `scripts/debug-parser.mjs`). Xem `LIM-02` |
| `AC-13` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `npm run test:integration` — chạy tuần tự trên cây cuối round | `0`; `0`; `0`; `0`; `0` | typecheck: exit 0, không output lỗi. lint: exit 0, `✖ 492 problems (0 errors, 492 warnings)` — 0 error. test:unit: `Test Files 93 passed (93)`, `Tests 1420 passed (1420)`. build: `✓ Compiled successfully in 3.3s`, và `/api/jobs`, `/api/jobs/[slug]`, `/job-board` đều liệt kê `ƒ` (Dynamic) đúng như trước. test:integration: exit 0 nhưng in `ENV_BLOCKED` và `[integration-preflight] Integration lane NOT run — this is a BLOCKED state, not a PASS.` | Điều kiện AC là "năm gate exit 0" và đúng là cả năm exit 0, NHƯNG gate thứ năm exit 0 nghĩa là lane không chạy. Đừng đọc `AC-13` PASS thành "test LIVE đã xanh" |

## 4. Changed Deliverables

- **Source/artifact changed:** 4 file MỚI — `src/shared/auth/with-public-db.ts`, `src/shared/auth/with-public-db.test.ts`, `src/shared/auth/public-read-guc.static.test.ts`, `src/shared/auth/live-public-read-rls.go-live-04.test.ts`; 9 file SỬA — `app/api/jobs/route.ts`, `app/api/jobs/[slug]/route.ts`, `app/job-board/page.tsx`, `src/domains/applications/marketplace-inventory.static.test.ts`, `src/domains/applications/marketplace-browse.routes.test.ts`, `src/shared/auth/api-boundary.static.test.ts`, `vitest.integration-files.ts`, `vitest.integration.config.ts`, `vitest.unit.config.ts`. Tất cả nằm trong §4.2. `src/domains/job-board/public.service.ts` KHÔNG bị chạm một dòng nào; đường RPC nộp đơn/tracking KHÔNG bị chạm.
- **Dependency:** None. Không thêm, không nâng, không xoá package nào; `package.json` và lockfile không đổi.
- **Schema/migration:** None. Không migration, không `CREATE ROLE`, không `GRANT`, không đổi policy, không đổi function RLS (`DEC-04`). Không seed, không publish, không unpublish trên `hrp-live` (`DEC-06`).
- **Environment/config:** Chỉ 3 dòng đăng ký lane — `GOLIVE04_LIVE_PUBLIC_READ: TEST_DB_ADMIN ? '1' : ''` ở integration config, `GOLIVE04_LIVE_PUBLIC_READ: ''` ở unit config, và 1 đường dẫn ở `INTEGRATION_TEST_FILES`. Không tạo/sửa/đọc giá trị biến môi trường thật, không chạm Vercel/Upstash/DNS. `scripts/ci/integration-preflight.mjs` không cần sửa vì nó không liệt kê flag theo suite.
- **Git diff/commit:** Not created — chưa commit, chưa push, chưa stage (`git diff --cached --stat` rỗng). Baseline vẫn là `a2c750bc081963301f7ac7917a8ec1dc7a2352fe`. Deploy production là push `main` và thuộc Owner (`RISK-08`).

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | `Blocker` | `npm run test:integration` exit 0 nhưng in `ENV_BLOCKED` + `Integration lane NOT run — this is a BLOCKED state, not a PASS.` Không file env nào trong cây khai `DATABASE_URL_TEST` hoặc `DATABASE_URL_ADMIN_TEST`; `Test-Path env:DATABASE_URL_TEST` và `Test-Path env:DATABASE_URL_ADMIN_TEST` đều `False`. Theo `RISK-04` đây KHÔNG phải expiry (branch `br-misty-cell-az3nx5l3` đã bỏ expiry 30/08, credential không đổi) | 4 AC blocking (`AC-06`, `AC-07`, `AC-08`, `AC-10`) KHÔNG đo được. Bằng chứng còn thiếu chính là bằng chứng posture: (a) `rolbypassrls`/`rolsuper` = false, (c) mọi dòng nhìn thấy được đều `is_public = true`, và `25006`. Local chỉ đủ tới mức `RISK-03` | Cấp `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` trỏ `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) cho môi trường chạy audit, hoặc Tier 3 chạy lane bằng credential của mình rồi ghi log vào AUDIT. Tôi KHÔNG tự mint credential, KHÔNG chạy test LIVE lên `hrp-live` (test có seed, `DEC-06` khoá live chỉ đọc), và KHÔNG cắt branch test mới từ `hrp-live` (`RISK-04`) |
| `DEV-01` | `Deviation` | `git grep -n --untracked "ADMIN"` lần đầu trả 3 hit trong CHÚ THÍCH của `with-public-db.ts` (dòng 15, 38, 39) | Tôi sửa lời văn hai khối comment để chuỗi `ADMIN` không còn xuất hiện trong file, diễn đạt lại thành "mức quản trị". KHÔNG đổi một dòng logic nào; `npm run test:unit` sau đó vẫn 1420 passed và chu trình `AC-09` đã chạy LẠI trên bytes cuối | Xác nhận cách tôi hiểu `AC-05` là đúng: grep thô, không strip comment ⇒ token cấm không được xuất hiện kể cả trong chú thích. Nếu Planner muốn `AC-05` chỉ tính code thì đây là chỗ nới |
| `LIM-01` | `Limitation` | `git diff -- src/shared/auth/with-public-db.ts` luôn rỗng vì file MỚI/untracked | Evidence "`git diff` rỗng" mà `AC-09` yêu cầu là VÔ NGHĨA với file này — nó rỗng cả khi tôi để nguyên đột biến. Tôi thay bằng cặp `Get-FileHash … SHA256` trước/sau: `84326E73359F3B5BB35596C63347E3C152265B18876D99570D7892F6BE66755C` cả hai lần | Chấp nhận SHA-256 thay `git diff` cho `AC-09` ở round này; hoặc yêu cầu Tier 3 tự hash lại |
| `LIM-02` | `Limitation` | `git status --short` cuối round có untracked KHÔNG phải của tôi: `scratch/golive03-ac-drive.mjs`, `scratch/golive03-ac08-remeasure.mjs`, `scratch/golive03-bigint-probe.mjs`, `scratch/golive03-greps.ps1`, `scratch/neon-schemadiff-live-vs-mp2test.txt`, `scratch/neon-schemadiff-snapshot-vs-live.txt`, cộng `.neon`, `docs/aff_plan*.md`, `scripts/debug-parser.mjs` và các `scratch/*` có từ trước | Tôi tạo ĐÚNG 4 file untracked, tất cả trong `src/shared/auth/` và đều thuộc §4.2. Số file untracked cuối round nhiều hơn đầu round nhưng phần tăng là artifact của go-live-03/Neon topology, không phải của round này | Không cần quyết định. Ghi ra để Tier 3 đừng quy các file đó cho round này; tôi không xoá, không stage, không chạm chúng (`RISK-06`) |
| `LIM-03` | `Limitation` | Lần đo HTTP đầu tiên trả `500` với body rỗng. Nguyên nhân đọc từ log: `Error: Cannot find module './chunks/vendor-chunks/next.js'` tại `.next/server/app/api/jobs/route.js` — `npm run build` đã ghi đè `.next` của dev server đang chạy | KHÔNG phải defect code. Đã dừng dev server, xác nhận cổng 3000 rảnh, chạy lại `npm run dev` (`Ready in 1610ms`), đo lại rồi mới chạy các gate build. Mojibake ở lần đo đầu (`NhÃ  mÃ¡y`) là encoding console, đã đo lại bằng `[System.Text.Encoding]::UTF8.GetString(...)` | Không cần quyết định. Ops note cho Tier 3: đo HTTP TRƯỚC `npm run build`, hoặc restart dev sau build |
| `LIM-04` | `Limitation` | `AC-01`/`AC-02` đo qua `npm run dev` với `DATABASE_URL` của `.env` — branch chứa dữ liệu DEMO thật mà Owner đã publish | Tôi chỉ phát request `GET`; helper còn ép transaction read-only nên không có đường ghi. Không seed, không publish, không unpublish, không migration — `DEC-06` giữ nguyên. Không in giá trị connection string ở bất kỳ đâu | Không cần quyết định |
| `FUP-01` | `Follow-up` | `app/job-board/page.tsx` dòng 33: nút "Xem chi tiết" trỏ thẳng vào JSON API vì repo KHÔNG có trang chi tiết job công khai | Sau task này API detail đã trả `200`, nhưng khách vẫn thấy JSON thô chứ không phải trang. Bước OP "nộp một đơn thật" của Owner vẫn thiếu trang chi tiết để tới form | §4.2 ghi rõ là defect UI riêng, KHÔNG sửa trong task này. Đề nghị Planner mở task cho trang chi tiết job công khai (ứng viên: gộp vào `go-live-05` hoặc task mới) |
| `Q-02` | `Question` | Phương án B của `DEC-01` (tách policy `FOR SELECT` khỏi `FOR ALL`) vẫn mở | Round này đóng defect bằng phương án A nên không cần B. `RISK-02` vẫn còn về mặt thiết kế: policy `FOR ALL` nghĩa là nới `SELECT` là nới cả `DELETE`, và thứ duy nhất chặn là transaction read-only trong helper | Giữ `Q-02` mở chờ Owner uỷ quyền migration, hay đóng luôn vì read-only đã đủ? Tôi không tự quyết vì `DEC-04` cấm migration trong task này |

## 6. Evidence Index

Chỉ liệt kê artifact lớn; output ngắn để ngay ở §3.

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `src/shared/auth/live-public-read-rls.go-live-04.test.ts` | 5 test LIVE đã viết đủ cho `AC-06`, `AC-07`, `AC-08`, `AC-10` — chạy được ngay khi có env test DB (`BLK-01`) |
| `E-02` | — | Không tạo file trong `evidence/`: mọi output đều ngắn và đã dán nguyên văn ở §3 |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | STEP-00..STEP-12 xong. 3 call site đi qua `withPublicDb` (`MKT` + read-only), 4 file mới, 9 file sửa, 0 file ngoài scope. 9 AC đo được: `AC-01`..`AC-05`, `AC-09`, `AC-11`, `AC-12`, `AC-13`. 4 AC blocking `ENV_BLOCKED`: `AC-06`, `AC-07`, `AC-08`, `AC-10` (`BLK-01`). Cặp RED/GREEN thật: `total 0` → `total 2`, detail `404` → `200`. 1 deviation, 4 limitation, 1 follow-up, 1 câu hỏi mở |

> Handoff status: READY_FOR_AUDIT
