# HANDOFF: hrp-v5-go-live-12-public-job-detail-page

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-12-public-job-detail-page` |
| Work type | `CODE` — route công khai mới, mở rộng projection additive, tách component apply |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` (khớp TASK §0; TASK.md chỉ có đúng một commit `93e1bb4`, không bị bump giữa lượt) |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | Tier 2 — Engineer |
| Baseline | Contract ghi `0248948`. HEAD thật khi thực thi: `cd669d6` (`git rev-parse --short HEAD`). Ba commit chênh (`93e1bb4`, `23cbcc3`, `cd669d6`) là **docs-only** — `git diff --stat 0248948..HEAD` chỉ liệt kê `docs/**`, không một file source nào ⇒ baseline mã nguồn đúng bằng `0248948` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | Bắt đầu round 1 `2026-08-31`; cập nhật `2026-08-31 18:49 +07` |

## 1. Outcome Summary

Trang chi tiết việc làm công khai `/viec-lam/{code}` đã tồn tại và render dữ liệu thật: `HTTP 200`
cho cả năm slug đang công khai, `404` cho slug không tồn tại, `<title>` mang tên việc làm, và HTML
đã phục vụ **không** chứa `clientCompany`, `client_company`, `hourlyRate`.

Đã làm:

- `getPublicJobDetail` + `PublicJobDetailDto`/`PublicJobPositionDto` trong `public.service.ts`,
  dùng lại **đúng** hằng `publicSelect` không sửa một ký tự, và nâng hai vị từ lọc thành hàm dùng
  chung `visibleSlots` gọi từ cả `toDto` (đường danh sách) và `toDetailDto` (đường chi tiết).
- Tách `ApplyModal` + `SuccessModal` khỏi `app/(portal)/page.tsx` sang
  `src/domains/job-board/components/`, đo `test:unit` ngay sau bước tách trước khi trang mới tồn tại.
- `app/(jobs)/viec-lam/[slug]/page.tsx` là Server Component đọc DB đúng một đường `withPublicDb`,
  `force-dynamic`, `runtime = 'nodejs'`, `generateMetadata` cùng file, `notFound()` đúng một lần.
- Nút Ứng tuyển qua đảo client `detail-apply-cta.tsx` (không có `fetch` riêng), thanh dính cạnh dưới
  ở màn hẹp theo `DEC-13`, hết chỗ thì vô hiệu với đúng nhãn của card.
- `JobCard` trên `/` điều hướng bằng `Link` thật + một phần tử phủ `absolute inset-0`, hai nút được
  nâng `relative z-10`.
- Bốn test service của `RQ-12`, test tĩnh `RQ-13` có bằng chứng RED trước GREEN.

Chưa hoàn thành: phần **thao tác trình duyệt** của `AC-10` (ba lần bấm kèm URL trước/sau) — môi
trường này không có trình duyệt và cũng không có gói tự động hoá nào (`playwright`/`puppeteer`/
`cypress` đều không có trong `package.json` lẫn `node_modules`), và `curl` không thay thế được vì
`/` render card ở client (`grep '/viec-lam/'` trên HTML của `/` = **0** match). Xem `LIM-01`.

Không commit, không push, không deploy: `git log origin/main..HEAD` rỗng.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-02`, `RQ-03`, `RQ-12` | `src/domains/job-board/public.service.ts` (`PublicJobPositionDto:28`, `PublicJobDetailDto:46`, `visibleSlots:133`, `toDetailDto:203`, `getPublicJobDetail:326`); `src/domains/job-board/public-detail.service.test.ts` | DONE | `DEV-01` tên khóa tổng; `DEV-02` `statusLabel` |
| `STEP-02` | `RQ-09` | `src/domains/job-board/components/apply-modal.tsx`, `components/success-modal.tsx`; `app/(portal)/page.tsx` import lại | DONE | `DEV-04` retarget detector kiểm kê |
| `STEP-03` | `RQ-05`, `RQ-06`, `RQ-08`, `RQ-11`, `RQ-13` | `app/(jobs)/viec-lam/[slug]/page.tsx`; `app/(jobs)/viec-lam/layout.tsx`; `src/domains/job-board/public-detail.meta.ts`; `src/domains/job-board/public-detail.static.test.ts` | DONE | `DEV-05` layout additive; `DEV-06` `description`; `DEV-08` thô vs strip |
| `STEP-04` | `RQ-07` | `src/domains/job-board/components/detail-apply-cta.tsx`; wiring ở `page.tsx:151` | DONE | `DEV-03` kiểu prop; `DEV-07` khe traceability |
| `STEP-05` | `RQ-10` | `app/(portal)/page.tsx` (`JobCard`) | DONE — phần đo bằng mắt: `LIM-01` | `LIM-01` |
| `STEP-06` | `RQ-14`, `RQ-15` | `typecheck`/`lint`/`test:unit`/`build` + render thật qua `npm run dev` | DONE | `LIM-02` số vị trí trên dữ liệu live |
| `STEP-07` | `RQ-16` | `docs/tasks/hrp-v5-go-live-12-public-job-detail-page/HANDOFF.md` | DONE | None |

## 3. Acceptance Evidence

Lane test canonical: `npm run test:unit` = `vitest run --config vitest.unit.config.ts`. Mọi lệnh đọc
`$LASTEXITCODE` **ngay** sau lệnh, không pipe; output dài redirect ra `%TEMP%` (ngoài repo).

| AC | Command/check | Exit/result | Evidence summary | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-12-public-job-detail-page\TASK.md` | `RESULT: PASS`, exit `0` | `TASK contract is ready for execution` | None |
| `AC-01` | Đọc `public.service.ts:3-52` + `AC-12` | PASS | `PublicJobDetailDto extends PublicJobDto` (`:46`) ⇒ compiler canh "mọi khóa của `PublicJobDto`"; cộng `jobCode:47`, `siteAddress:48`, `totalSlotsNeeded:49`, `totalSlotsFilled:50`, `positions:51`. `PublicJobPositionDto:28-36` đúng bảy khóa: `positionCode`, `positionTitle`, `shift`, `workLocation`, `slotsNeeded`, `slotsFilled`, `available` | `DEV-01`: ngưỡng AC gọi hai khóa tổng là `totalSlots`/`filledSlots`, `RQ-01` gọi `totalSlotsNeeded`/`totalSlotsFilled`. Tôi cài theo `RQ-01` |
| `AC-02` | `grep -nE "clientCompany\|client_company" src/domains/job-board/public.service.ts` | exit `1` (zero match) | Không một dòng nào trong file | None |
| `AC-02` | `git diff -- src/domains/job-board/public.service.ts \| grep -nE "^[+-].*publicSelect"` cộng diff nguyên khối `publicSelect` giữa `HEAD` và worktree | Khối `publicSelect`: `diff` exit `0`, `18` dòng cả hai phía | Bốn dòng `+` có chữ `publicSelect` đều là **tham chiếu** (docblock `:64`, `:194`, `:196`, và `select: publicSelect` ở `:199` của hàm mới), không dòng nào sửa hằng. Khối `:247-264` giống hệt `HEAD` từng byte | None |
| `AC-03` | Đọc mã + `grep -nE "isOrderVisible\|isSlotLive\|visibleSlots\|slotAvailable\|slotShiftLabel"` | PASS | **Một** định nghĩa mỗi vị từ: `isOrderVisible:124`, `isSlotLive:128`; cả hai chỉ được gọi bên trong `visibleSlots:133`. `visibleSlots` gọi từ **hai** đường: `:170` trong `toDto` (danh sách) và `:204` trong `toDetailDto` (chi tiết). Không có biểu thức song song. Kèm `slotAvailable:140` dùng ở `:171` (tổng của card) và `:214` (`available` của vị trí) — cùng một công thức, đúng ý `RISK-07` | None |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-browse.routes.test.ts src/domains/job-board/mp1.contract.test.ts` | exit `0` — `Test Files 2 passed (2)`, `Tests 19 passed (19)` | `git diff --stat` trên đúng hai file đó: **rỗng** | None |
| `AC-05` | `grep -nE '\$transaction\|applyRlsContext\|set_config\|fetch\(' "app/(jobs)/viec-lam/[slug]/page.tsx"` | exit `1` (zero match cả bốn chuỗi) | Không có đường mở transaction trần, không set GUC lẻ, không tự gọi API nội bộ | None |
| `AC-05` | `grep -n withPublicDb "app/(jobs)/viec-lam/[slug]/page.tsx"` | exit `0` | match tại dòng `8` (import), `35` (`loadJob`), `57` (docblock) — `withPublicDb(` đứng **trước** `getPublicJobDetail(` theo `indexOf`, có test tĩnh canh | None |
| `AC-06` | `curl.exe -s -o "%TEMP%\gl12-detail.html" --max-time 300 http://localhost:3000/viec-lam/DA-DEMO-001` rồi `curl.exe -s -o NUL -w "%{http_code}"` **riêng** | `AC06_BODY_EXIT=0`; `AC06_HTTP=200`; `AC06_CODE_EXIT=0`; `AC06_BYTES=58649` | Grep trên chính HTML đã phục vụ: `DA-DEMO-001`=**17**, `clientCompany`=**0**, `client_company`=**0**, `hourlyRate`=**0**, cụm `" chỗ trống"`=**11**. `H1=[Nhà máy Điện tử Kinh Bắc — Bắc Ninh]`, `H2=[Vị trí tuyển dụng (1)]`, `H3=[Công nhân lắp ráp]`, `FACT=[Chỗ trống] -> [Còn 10 chỗ trống]`, `FACT=[Chỉ tiêu đã tuyển] -> [0/10]`, `FACT=[Hạn nhận hồ sơ] -> [28/09/2026]` | `LIM-02`: mệnh đề "tối thiểu hai tên vị trí khác nhau **nếu dự án đó có nhiều slot**" có tiền đề **sai** trên dữ liệu live hôm nay |
| `AC-07` | `curl.exe -s -o NUL -w "%{http_code}" --max-time 300 http://localhost:3000/viec-lam/DA-KHONG-TON-TAI-999` | `AC07_HTTP=404`, `AC07_EXIT=0` | Dev log: `GET /viec-lam/DA-KHONG-TON-TAI-999 404 in 594ms` | None |
| `AC-08` | Đọc HTML của `AC-06`: rút nhãn back-link **từ chính source** rồi đếm trong HTML | PASS | `BACKLINK_FROM_SOURCE=[Quay lại danh sách việc làm]`, `GREP[backlink]=2`; `href="/"` | None |
| `AC-09` | `git diff --stat -- "app/(portal)/page.tsx"` | `1 file changed, 28 insertions(+), 312 deletions(-)` | Giảm `312` dòng ≥ ngưỡng `250`; hai component đã ra khỏi `page.tsx` (`apply-modal.tsx`, `success-modal.tsx`) | None |
| `AC-09` | `npm run test:unit` **ngay sau STEP-02**, trước khi trang mới tồn tại | exit `0` — `Test Files 94 passed (94)`, `Tests 1425 passed (1425)` | Đo tách khỏi mọi thay đổi khác đúng như ngưỡng đòi | None |
| `AC-10` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-detail.static.test.ts` (khối `RQ-10/RISK-05`) cộng `curl` HTML của `/` | Static: exit `0`. `curl /` : `PORTAL_HTTP=200`, `GREP[/viec-lam/]=0` | Static chứng minh cấu trúc: đúng **một** `absolute inset-0` và nó `aria-hidden="true"` + `tabIndex={-1}`; ≥2 nút `relative z-10`; `onClick={() => onApply(job)}` còn nguyên; tiêu đề là `<Link href={detailHref}>`. Nút là **em ruột** của phần phủ, không phải con của `<a>` ⇒ về cấu trúc không thể điều hướng | **`LIM-01`: phần thao tác trình duyệt (URL trước/sau ba lần bấm) KHÔNG do tôi đo.** Không có trình duyệt/gói tự động hoá trong môi trường; `curl` không thay được vì card render ở client (0 match `/viec-lam/`) |
| `AC-11` | `grep -n "generateMetadata\|openGraph\|canonical" "app/(jobs)/viec-lam/[slug]/page.tsx"` | exit `0` | `generateMetadata`:`60`, `openGraph`:`68`, `canonical`:`69` | None |
| `AC-11` | Grep thẻ `title` trong HTML của `AC-06` | PASS | `HTML_TITLE_TAG=[Nhà máy Điện tử Kinh Bắc — Bắc Ninh · HRPartner]` — tên việc làm cộng template của root layout, **không** phải tiêu đề chung trang chủ (`/` = `HRPartner`) | None |
| `AC-12` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board` | exit `0` — `Test Files 4 passed (4)`, `Tests 36 passed (36)`, trong đó `public-detail.service.test.ts (4 tests)` | Bốn case `RQ-12` đủ mặt: nhiều slot ⇒ `positions.length > 1` với `['Cong nhan lap rap','Nhan vien QC']` và `available [3,2]`; slug lạ ⇒ `null`; **đủ chỉ tiêu ⇒ DTO khác null với `availableSlots === 0`** và cùng dữ liệu đó `getPublicJobProjection` vẫn `resolves.toBeNull()` (`public-detail.service.test.ts:111`, khẳng định chéo `RQ-04`); mọi slot hết hạn ⇒ `null` | None |
| `AC-13` | Chạy test tĩnh hai lần quanh STEP-03: RED (cố ý thêm một comment nêu hai chuỗi bị cấm) rồi GREEN (bỏ ra) | `AC13_RED_LASTEXITCODE=1`; `AC13_GREEN_LASTEXITCODE=0` | RED nêu **đúng** chuỗi đã thêm: `AssertionError: app/(jobs)/viec-lam/[slug]/page.tsx chứa chuỗi bị cấm: expected [ 'clientCompany', 'description' ] to deeply equal []`. GREEN `16 passed`; detector bản cuối `23 passed`, exit `0` | None |
| `AC-14` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` cộng `git diff --stat` cùng file | exit `0` — `Tests 3 passed (3)`; diff **rỗng** | Hàng rào của hotfix-02 xanh mà không sửa một dòng ⇒ `RQ-02` không bị phá | None |
| `AC-15` | `npm run typecheck` | exit `0` | Đo trên cây **cuối**, sau khi sửa cảnh báo lint tôi tự gây | None |
| `AC-15` | `npm run lint` | exit `0` | `✖ 494 problems (0 errors, 494 warnings)`; grep các file của task trong output lint: `LINT_MYFILES_MATCHES=0` (494 là nợ có sẵn, giảm 1 so với 495 trước khi tôi sửa) | None |
| `AC-15` | `npm run test:unit` | exit `0` | `Test Files 95 passed (95)`, `Tests 1448 passed (1448)` ≥ ngưỡng `1421` | None |
| `AC-15` | `npm run build` | exit `0` | `ƒ /viec-lam/[slug]  910 B  110 kB` — `ƒ` = dynamic/server-rendered, khớp `DEC-11` `force-dynamic` | None |
| `AC-16` | `git log origin/main..HEAD` | **rỗng**, exit `0` | Không commit nào do tôi tạo; `HEAD == origin/main == cd669d6` | None |
| `AC-16` | `git status --short -- app src docs/tasks/hrp-v5-go-live-12-public-job-detail-page` | 8 mục, xem §4 | Mọi file trong phạm vi AC-16, **trừ** `src/domains/applications/marketplace-inventory.static.test.ts` | `DEV-04` |

### 3.1 Output nguyên văn của phần render thật (`AC-06`, `AC-07`, `AC-08`, `AC-11`)

Server dev khởi động bằng `npm run dev`, log redirect ra ngoài repo. Đo xong đã tắt server.

```
> hrp@0.1.0 dev
> next dev
   ▲ Next.js 15.5.23
   - Local:        http://localhost:3000
   - Environments: .env.local, .env
 ✓ Ready in 3.7s
 ✓ Compiled /middleware in 346ms (173 modules)
 ✓ Compiled /api/jobs in 814ms (317 modules)
 ✓ Compiled /viec-lam/[slug] in 2.4s (696 modules)
GET /viec-lam/DA-DEMO-001 200 in 4409ms
GET /viec-lam/DA-DEMO-001 200 in 746ms
GET /viec-lam/DA-DEMO-001 200 in 894ms
GET /viec-lam/DA-DEMO-002 200 in 688ms
GET /viec-lam/DA-DEMO-003 200 in 800ms
GET /viec-lam/DA-2026-018 200 in 774ms
GET /viec-lam/DA-2026-022 200 in 687ms
GET /viec-lam/DA-KHONG-TON-TAI-999 404 in 594ms
 ✓ Compiled / in 598ms (658 modules)
```

`DEVLOG_ERRLINES=0` trên `DEVLOG_TOTALLINES=28` với pattern `error|warn|Inconsistent|unhandled|exception|failed`
⇒ không có `Inconsistent query result`, tức lớp lỗi của hotfix-01/02 không xuất hiện trên đường mới.

Grep từng chuỗi trên HTML đã phục vụ (`AC-06`):

```
GREP[DA-DEMO-001]=17
GREP[clientCompany]=0
GREP[client_company]=0
GREP[hourlyRate]=0
PHRASE_FROM_SOURCE=[ chỗ trống]      GREP[phrase]=11
BACKLINK_FROM_SOURCE=[Quay lại danh sách việc làm]      GREP[backlink]=2
POSITION_TITLES_DISTINCT=1      TITLE=[Công nhân lắp ráp]
HTML_TITLE_TAG=[Nhà máy Điện tử Kinh Bắc — Bắc Ninh · HRPartner]
```

Hai chuỗi tiếng Việt (`" chỗ trống"`, nhãn back-link) được **rút ra từ chính source** rồi mới đếm
trong HTML, không tự gõ lại — để không có chỗ nào tôi vô tình so một biến thể dấu khác.

Cả năm slug công khai, mỗi slug một lần `curl` riêng:

```
DA-DEMO-001 HTTP=200 exit=0 distinctPositions=1 titles=[Công nhân lắp ráp]
DA-DEMO-002 HTTP=200 exit=0 distinctPositions=1 titles=[Nhân viên kho]
DA-DEMO-003 HTTP=200 exit=0 distinctPositions=1 titles=[Thợ điện]
DA-2026-018 HTTP=200 exit=0 distinctPositions=1 titles=[Công nhân điện tử]
DA-2026-022 HTTP=200 exit=0 distinctPositions=1 titles=[Nhân viên kho]
AC07_HTTP=404 AC07_EXIT=0
```

## 4. Changed Deliverables

- **Source/artifact changed** — `git status --short` (phạm vi task):

```
 M app/(portal)/page.tsx
 M src/domains/applications/marketplace-inventory.static.test.ts
 M src/domains/job-board/public.service.ts
?? app/(jobs)/viec-lam/
?? src/domains/job-board/components/
?? src/domains/job-board/public-detail.meta.ts
?? src/domains/job-board/public-detail.service.test.ts
?? src/domains/job-board/public-detail.static.test.ts
```

  File mới bên trong hai mục `??`: `app/(jobs)/viec-lam/layout.tsx`,
  `app/(jobs)/viec-lam/[slug]/page.tsx`, `src/domains/job-board/components/apply-modal.tsx`,
  `components/success-modal.tsx`, `components/detail-apply-cta.tsx`.
- **Dependency:** None. Không thêm/xoá/nâng gói nào; `package.json` và lock không đổi.
- **Schema/migration:** None. Không migration, không policy RLS, không `GRANT`, không seed, không
  câu lệnh ghi nào chạm DB. Đường đọc duy nhất là `withPublicDb` (transaction read-only, principal
  `MKT`) đúng posture `RISK-06`.
- **Environment/config:** None. Không đọc, không in, không đổi biến môi trường nào; không chạm
  Vercel/Upstash/DNS.
- **Git diff/commit:** **Not created** theo `RQ-16`. `git log origin/main..HEAD` rỗng. Không stage,
  không commit, không push, không deploy.
- **Không phải của tôi, tôi không chạm:** các file bẩn/untracked có từ trước phiên này —
  `public/index.html`, `AUDIT.md` của ba task khác, `scratch/**`, `.claude/`, `.neon`, `fix.patch`,
  `rls-probe-*.txt`, `docs/aff_plan*.md`, `scripts/debug-parser.mjs`.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | Deviation | `RQ-01` gọi hai khóa tổng là `totalSlotsNeeded`/`totalSlotsFilled`; ngưỡng `AC-01` gọi chúng là `totalSlots`/`filledSlots`. Tôi cài theo `RQ-01` (`public.service.ts:49-50`) | Contract tự mâu thuẫn ở tên khóa. Tôi **từ chối** thêm khóa bí danh vì hai khóa cho một con số là đúng lớp lỗi `RISK-07` (hai nguồn cho một số ⇒ lệch trong im lặng) | Xác nhận tên `RQ-01` là tên đúng, hoặc chỉ định tên khác để tôi đổi ở round sau. Không cần đổi code nếu chấp nhận `RQ-01` |
| `DEV-02` | Deviation | `toDetailDto` dùng lại **đúng** công thức `statusLabel` của `toDto`: `availableSlots > 0 ? 'Đang tuyển' : 'Đã đủ chỉ tiêu'` (`public.service.ts:239`) | `RQ-01` chỉ nói DTO chi tiết chứa mọi khóa của `PublicJobDto`, không nói nhãn tính thế nào. Dùng lại công thức cũ giữ card và trang chi tiết không thể nói hai điều khác nhau về cùng một dự án | Không cần quyết. Ghi để Tier 3 không phải suy |
| `DEV-03` | Deviation | Trang truyền `job={{ slug: job.slug, title: job.title }}` chứ không truyền cả DTO; `DetailApplyCta` nhận `ApplyModalJob` (`detail-apply-cta.tsx:30`) | Thu hẹp bề mặt: đảo client chỉ thấy hai field nó cần, nên không có đường nào để field nội bộ lọt vào bundle client | Không cần quyết |
| `DEV-04` | Deviation | Sửa `src/domains/applications/marketplace-inventory.static.test.ts` — **ngoài** danh sách path của `AC-16`. Hai lý do: (a) `RQ-09` dời hai modal nên ba `it` của khối `RQ-07/DEC-11` đang trỏ vào `app/(portal)/page.tsx` sẽ đo sai chỗ; (b) tôi thêm `DETAIL_APPLY_CTA` vào `APPLY_UI_FILES` vì đảo client mới là **bề mặt apply thứ tư** | Không nới một ngưỡng nào: mọi khẳng định phủ định (không `type="file"`, không `FormData`, không `/api/jobs/apply`, không `cv:`) nay chạy trên **hợp bốn file** thay vì ba. `23 passed`, exit `0`. Nếu để nguyên, detector sẽ xanh trong khi kẽ hở dời sang vị trí mới | Chuẩn thuận việc file này nằm ngoài danh sách `AC-16`, hoặc yêu cầu tôi hoàn nguyên và ghi thành nợ (tôi khuyến nghị giữ) |
| `DEV-05` | Deviation | Thêm `app/(jobs)/viec-lam/layout.tsx` — `RQ-05` chỉ yêu cầu `page.tsx` | Route group `(jobs)` không có layout riêng cho `viec-lam`, nên trang chi tiết sẽ thiếu navbar/footer của bề mặt công khai, trái `DEC-08`. Layout chỉ mount `GlobalNavbar`/`GlobalFooter`, **không** định nghĩa token mới (có test tĩnh canh: không `--color-`, không `prefers-reduced-motion`) | Không cần quyết |
| `DEV-06` | Không phải deviation — ghi để truy vết | `RQ-13` cấm chuỗi `description` **trong file trang**, còn `RQ-11` đòi metadata có `description`. Giải bằng `src/domains/job-board/public-detail.meta.ts`: trang import `publicJobMetaText(job)` và spread, nên chữ `description` không xuất hiện trong file trang | Cả hai yêu cầu thoả nguyên văn, không xin miễn. `RISK-04` được canh thêm: module meta không đọc `staffingOrders`, không deref `.description`, không biết `publicSelect` | Không cần quyết |
| `DEV-07` | Limitation của contract | Traceability map `RQ-07 → STEP-04 → AC-07`, nhưng `AC-07` đo `curl` 404 — **không** đo nút Ứng tuyển. Nút apply do đó không có AC trực tiếp | Tôi bù bằng bốn `it` tĩnh trong `public-detail.static.test.ts` (khối `RQ-07/DEC-13`): trang gắn `DetailApplyCta` với `isFull`; đảo client là `'use client'`, import lại đúng hai modal, **không** `fetch`, **không** `/api/`; có `fixed bottom-0…sm:hidden` và `hidden sm:flex`; ba nhãn và `disabled={disabled}` | Xác nhận bằng chứng thay thế này đủ cho `RQ-07`, hoặc thêm AC hành vi ở round sau |
| `DEV-08` | Deviation về cách đo | Trong `public-detail.static.test.ts`, sáu chuỗi của `RQ-13` đo **thô** (đúng nguyên văn "FAIL nếu file chứa bất kỳ chuỗi nào", theo tiền lệ `src/shared/auth/with-public-db.ts:40`), nhưng hai khẳng định phủ định khác đo trên mã đã **bỏ chú thích** | Bắt buộc, vì chính docblock nêu điều bị cấm bằng tiếng Việt ("Không mức lương", "không khối `prefers-reduced-motion` mới") và `notFound()` được nhắc trong docblock ⇒ đo thô sẽ FAIL vì câu văn cấm chứ không vì mã vi phạm. Lý do viết ngay trong docblock của test | Không cần quyết |
| `LIM-01` | Limitation | `AC-10` đòi thao tác trình duyệt và dán URL trước/sau ba lần bấm. Môi trường này **không có trình duyệt**; kiểm `package.json` + `node_modules`: không có `playwright`, `puppeteer`, `cypress`, `jsdom`, `happy-dom`. `curl` không thay được: `curl http://localhost:3000/` ⇒ `PORTAL_HTTP=200` nhưng `GREP[/viec-lam/]=0` vì card render ở client sau `fetch('/api/jobs')` | **Phần hành vi của `AC-10` chưa được đo.** Tôi không cài thêm gói (`tier2.md` cấm tự thêm dependency) và không thay bằng mock. Đã có bằng chứng cấu trúc ở §3 và bằng chứng đường link sống: cả năm URL `/viec-lam/{code}` mà card trỏ tới đều trả `200` | Tier 3 hoặc Owner bấm thật ba lần trên `/` và dán URL; hoặc Tier 1 uỷ quyền thêm `playwright` để đo tự động ở round sau. Stop condition §5 chỉ cho `ENV_BLOCKED` với `AC-06`/`AC-07`, nên tôi **không** tự dán nhãn đó cho `AC-10` |
| `LIM-02` | Limitation của dữ liệu | `AC-06` đòi "tối thiểu hai tên vị trí khác nhau **nếu dự án đó có nhiều slot**". Đo thật: cả **năm** dự án đang công khai mỗi dự án chỉ có **một** nhóm vị trí (`DA-DEMO-001` ⇒ `H2=[Vị trí tuyển dụng (1)]`) | Tiền đề của mệnh đề điều kiện sai trên dữ liệu live hôm nay, nên không thể chứng minh nhánh nhiều vị trí bằng `curl`. Nhánh đó được chứng minh ở tầng projection: `public-detail.service.test.ts` case 1 khẳng định `positions.length > 1`, hai tên khác nhau và `available [3,2]` | Nếu Tier 3 muốn bằng chứng render cho nhánh nhiều vị trí thì cần một dự án có ≥2 nhóm slot. Tôi **không** seed: task này cấm mọi lệnh ghi (`RISK-06`) |
| `OBS-01` | Observation | Trang không có rate limit ở tầng route, đúng `DEC-12`/`RISK-03` (một `page` không có chỗ trả `429`; `enforceRateLimits` trả `NextResponse`) | Không phải sót. Trang làm đúng một truy vấn trên khóa duy nhất trong transaction read-only, không fan-out, không ghi | Follow-up đã có ở TASK §9 mục 3 (đặt limit ở middleware) |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `app/(jobs)/viec-lam/[slug]/page.tsx` | `RQ-05`, `RQ-06`, `RQ-08`, `RQ-11`, `RQ-13` — Server Component, một đường `withPublicDb`, metadata cùng file, sạch sáu chuỗi bị cấm |
| `E-02` | `src/domains/job-board/public.service.ts` | `RQ-01`..`RQ-04` — DTO chi tiết, `publicSelect` không đổi, vị từ dùng chung |
| `E-03` | `src/domains/job-board/public-detail.static.test.ts` | `RQ-13` (23 test) cộng bằng chứng thay thế cho `RQ-07`, `RQ-10` |
| `E-04` | `src/domains/job-board/public-detail.service.test.ts` | Bốn case `RQ-12` cộng khẳng định chéo `RQ-04` |
| `E-05` | `src/domains/job-board/components/detail-apply-cta.tsx` | `RQ-07`, `DEC-13`, `DEC-14` — đảo client duy nhất, không `fetch` riêng |
| `E-06` | `%TEMP%\gl12-detail.html` (ngoài repo, 58 649 byte) | HTML **đã phục vụ** của `AC-06`; nguồn của mọi số grep ở §3.1 |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | STEP-01..STEP-07 xong. 14/16 AC đo đầy đủ và đạt ngưỡng; `AC-10` đo được phần cấu trúc, thiếu phần thao tác trình duyệt (`LIM-01`); `AC-06` đạt mọi ngưỡng đo được, mệnh đề "hai vị trí" có tiền đề sai trên dữ liệu live (`LIM-02`). Không commit, không push |

> Handoff status: `READY_FOR_AUDIT`
