# HANDOFF: hrp-v5-go-live-08-public-ui-premium

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-08-public-ui-premium` |
| Work type | `CODE` — presentation layer, không chạm dữ liệu |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | Tier 2 — Engineer |
| Baseline | **Baseline mã = `c6256e7`.** `HEAD` lúc bắt đầu **và** lúc kết thúc = `5c9b88fe2c142ad1666ba6a5af5edc0feac71ef7` (docs-only phía trước baseline — đo ở §3.7). Cây làm việc **đã bẩn sẵn** do lane khác trước khi tôi chạm dòng đầu tiên: `docs/tasks/…-02/AUDIT.md`, `…-04/AUDIT.md`, `…-13/AUDIT.md` (mỗi file `1 0`, đúng chữ ký một dòng trắng cuối file — **để nguyên làm dấu vết**), `public/index.html` (`97 59`), cùng `.claude/`, `.neon`, `docs/aff_plan*.md`, `fix.patch`, `patch_test*.ps1`, `temp.diff`, `rls-probe-*.txt`, nhiều `scratch/**`, `scripts/debug-parser.mjs` untracked. Không stage, không reset, không commit, không dọn thứ nào trong đó |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-01 16:40 +07` → `2026-09-01 19:10 +07`. Contract **không** bump giữa lượt: `v1.3` lúc bắt đầu, `v1.3` lúc viết file này (`verify-task.ps1` chạy lại ở §3 dòng đầu) |

## 1. Outcome Summary

`STEP-01`..`STEP-12` **DONE**. **Không commit, không push** (`R-01`) — quyền push của Tier 1 không chuyền xuống. Không deploy, không migration, không chạm DB.

Đã làm:

- **`app/globals.css`** (`263 0` — **thuần dòng thêm, 0 dòng xoá**, `360` → `623` dòng). Hai vùng: (a) **3 token mới** trong khối `@theme` (`--shadow-card-hover`, `--color-focus-ring`, `--t-medium`) — 94 token baseline còn nguyên **từng giá trị**, 0 token bị đổi hoặc mất; (b) một khối lớp trình bày mới, tiêu đề `GO-LIVE-08 — LỚP TRÌNH BÀY CHO BỀ MẶT CÔNG KHAI ĐANG SỐNG`, gồm **23 quy tắc** trên **12 lớp gốc** `.hrp-*` (liệt kê đầy đủ kèm số dòng ở §3.3 và §3.4): `.hrp-card`(+hover), `.hrp-pill`, `.hrp-pill-location`, `.hrp-panel`, `.hrp-focus:focus-visible`, `.hrp-btn-primary`(+hover/active), `.hrp-btn-outline`(+hover/active), `.hrp-btn-ghost`(+hover/active), `.hrp-btn-muted`, `.hrp-btn-done`, `.hrp-field`(+hover/focus-visible), `.hrp-skip`(+`:focus`), và một `@media (hover: none), (pointer: coarse)` huỷ transform trên thiết bị chạm.
- **`app/(portal)/page.tsx`** (`38 53`, `659` → `644` dòng, 12 hunk). Mọi dòng đổi là class hoặc attribute trình bày: 8 chỗ mang `hrp-focus`, 6 chỗ `min-h-11`, card/pill/panel/field/nút chuyển sang class token, `id="hrp-main" tabIndex={-1}` trên vùng nội dung chính, 9/9 icon ligature trang trí được `aria-hidden="true"`. `style={{` giảm `39` → `32`, `transition-colors` `7` → `0`.
- **`app/components/GlobalNavbar.tsx`** (`14 16`, `312` → `310` dòng). Skip link `.hrp-skip` là phần tử nhận tiêu điểm đầu tiên (`:89`, `href="#hrp-main"`), hai cặp nút auth (desktop `:200`/`:206`, mobile `:290`/`:297`) chuyển sang `hrp-btn-outline` / `hrp-btn-primary` kèm `hrp-focus` + `min-h-11`, container `max-w-7xl` → `max-w-[1600px]` cho trùng mép trái với trang.
- **`src/domains/job-board/public-ui-premium.static.test.ts`** — MỚI (untracked), 777 dòng, **19 `describe` / 62 `it`, PASS**. Hàng rào tĩnh cho từng bất biến của task, gồm cả phép tính tương phản **chạy được** và băm vùng CSS chết.

Chưa hoàn thành / không làm được:

- **Nửa AC cần trình duyệt = `ENV_BLOCKED` (`BLK-01`).** Repo có **0** file `*.test.tsx` và **0** match `playwright|puppeteer|cypress|jsdom`, nên `getComputedStyle`, ảnh chụp, đo hộp giới hạn, quan sát bàn phím và click thật **không đo được ở lane này**. Phần đo được của cùng AC đã đo bằng số trên nguồn **và** trên bundle đã minify. Khi Tier 3 chép sang `AUDIT.md`: ô **Verdict** phải là `BLOCKED`, chuỗi `ENV_BLOCKED` chỉ được nằm trong ô evidence — `verify-audit.ps1:97` chỉ nhận `PASS|FAIL|PARTIAL|BLOCKED|N/A` (`DEC-17` của go-live-05).
- **Hai cặp màu kế thừa dưới ngưỡng — không sửa, có số.** `LIM-01`. (Bảng §3.1 có bốn dòng liên quan: hai dòng `Kế thừa` là hai cặp thật, hai dòng còn lại thuộc nhóm `Chẩn đoán`.) Sửa chúng đòi đổi **giá trị token** (§4.2 cấm) hoặc sơn lại CTA thương hiệu. Đo đủ ở §3.1, khoá lại bằng assertion để không trôi.
- **Không tính là thành quả của round này:** khối `:focus-visible` toàn cục và `@media (prefers-reduced-motion: reduce)` là **tài sản có sẵn từ `474f3dc`** (`DEC-19`/`RISK-12`). Ở đây chúng là **phép đo bảo toàn** — bằng chứng bảo toàn ở §3.4, không kể vào phần đã làm.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-12` (chạy **đầu tiên**) | `RQ-24/25/26` | `git rev-parse HEAD`, `git diff --name-only c6256e7..HEAD`, `grep -c 'href={detailHref}'`, `grep -n 'import { ApplyModal }'`, `git diff --numstat -- src/domains/job-board/public.service.ts` | `DONE` | None. Bốn phép đo **trước** khớp bốn phép đo **sau** từng ký tự — §3.7 |
| `STEP-01` | `RQ-15` | `verify-task.ps1`; battery RED trước khi sửa (`counts` baseline `c6256e7`) | `DONE` | None. `RESULT: PASS`, `EXIT=0`. Baseline đọc bằng `git show c6256e7:<path>`, không đọc worktree |
| `STEP-02` | `RQ-01`, `RQ-19` | `app/globals.css` khối `@theme`: `--shadow-card-hover`, `--color-focus-ring`, `--t-medium` | `DONE` | None. `94` → `97` token, `0` token cũ đổi giá trị, `0` khai báo `prefers-color-scheme`, `0` biến thể token tối |
| `STEP-03` | `RQ-02/03/04/05` | `.hrp-card`, `.hrp-card:hover`, `.hrp-pill`, `.hrp-pill-location`; `page.tsx` card `:143`, pill `:200`/`:204`/`:208` | `DONE` | None. Bóng nghỉ = `var(--shadow-card)`, hover đổi **đồng thời** `transform` + `box-shadow` + `border-color` trong `var(--t-medium)` = 220ms ≤ 250ms |
| `STEP-04` | `RQ-06` | `.hrp-panel`; `page.tsx:430` panel bộ lọc | `DONE` | None. Nền panel `--color-surface-container-low` `#f4f3f1` ≠ nền card `--color-surface` `#ffffff` |
| `STEP-05` | `RQ-07/08/17/22` | `.hrp-focus:focus-visible`, `.hrp-field`; `page.tsx:274` select, `:459` ô từ khoá, `:488` nút Tìm kiếm | `DONE` | **`DEV-01`** — không có checkbox nào để "custom bằng `appearance-none`": bề mặt này **không còn checkbox** kể từ go-live-05 (`type="checkbox"` = `0` ở cả trước và sau). `RQ-08` đã được Tier 1 repoint sang `select` (`DEC-18`) và tôi thực thi đúng bản repoint đó |
| `STEP-06` | `RQ-09`, `RQ-17` | `.hrp-btn-primary/-outline/-ghost/-muted/-done`; `page.tsx:219` Ứng tuyển, `:227` Lưu việc, `:535`, `:619` | `DONE` | None. Màu tương tác của ba nút rời khỏi inline style; `style={{` `39` → `32` |
| `STEP-07` | `RQ-10`, `RQ-13` | `@media (prefers-reduced-motion: reduce)` (**bảo toàn**, không thêm mới); bảng tương phản §3.1 | `DONE` | **`DEV-02`** — guard giảm chuyển động **đã tồn tại** từ `474f3dc` nên STEP này không thêm khối thứ hai (`count = 1` trước và sau). Stop condition "cặp nào dưới ngưỡng → chọn token khác" đã áp ở **8 khai báo** (7 viền cộng 1 vòng focus): xem `DEV-03` |
| `STEP-08` | `RQ-11/12/14` | `src/domains/job-board/public-ui-premium.static.test.ts` (19 `describe` / 62 `it`) | `DONE` | None. Vùng CSS chết được khoá bằng **băm nguyên văn**, không bằng số dòng (`AC-12`) |
| `STEP-09` | `RQ-15` | Toàn repo: typecheck, lint, `test:unit`, build, diff-check | `DONE` | **`DEV-04`** — `diff-check` không phải npm script trong repo này; đo bằng `git status --porcelain` + `git diff --numstat` toàn cây theo tiền lệ go-live-05 §6 `#18` |
| `STEP-10` | `RQ-16` | file này | `DONE` | None |
| `STEP-11` | `RQ-18/20/21/23` | `GlobalNavbar.tsx:89` skip link + `:1` container; `page.tsx:424` `id="hrp-main"`; 9 icon `aria-hidden`; kiểm trần chuyển động | `DONE` | None. Thứ tự DOM **không** đổi ngoài việc chèn skip link làm phần tử đầu tiên — điều kiện của chính `RQ-18` |
| `STEP-12` (chạy **cuối cùng**) | `RQ-24/25/26` | như trên | `DONE` | None. `href={detailHref}` = `2`, import `ApplyModal` vẫn ở `page.tsx:7`, numstat `public.service.ts` **rỗng** |

## 3. Acceptance Evidence

**Mọi lệnh dưới đây là lệnh chính xác đã chạy** — Tier 3 chạy lại được từng dòng. Shell: Git Bash trên Windows 11 tại `cd /c/CodeApp/HrP`; `verify-task.ps1` chạy qua `powershell.exe -NoProfile`. Baseline luôn đọc bằng `git show c6256e7:<path>`, **không** đọc worktree. Mọi phép đếm trên CSS chạy trên bản **đã bóc comment** — bài học "đo trên bản biên dịch, không phải nguồn"; phép đo nào cần comment (băm vùng bảo vệ) thì nói rõ.

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — (C-09) | `powershell.exe -NoProfile -Command "& '.ai-pipeline/scripts/verify-task.ps1' -TaskPath 'docs/tasks/hrp-v5-go-live-08-public-ui-premium/TASK.md'"` | `EXIT=0` | `RESULT: PASS. TASK contract is ready for execution.` — chạy **lại** sau lần ghi cuối vào cây | None |
| `AC-01` | `git diff --numstat -- app/globals.css`; cộng script so **từng token** giữa `git show c6256e7:app/globals.css` và bản hiện tại | `263 0`; số dòng `-` (không kể header) = `0` | token baseline `94` → nay `97`; **token bị đổi hoặc mất = `0`**; token mới = `--shadow-card-hover`, `--color-focus-ring`, `--t-medium`. Giá trị: `--shadow-card-hover: 0 2px 6px rgba(26,28,27,0.06), 0 14px 32px rgba(242,101,34,0.14)`; `--color-focus-ring: var(--color-primary-dark)`; `--t-medium: 220ms` | None |
| `AC-02` | Nguồn cộng bundle: `.hrp-card{…box-shadow:var(--shadow-card)…}` (§3.4); assertion `RQ-02` trong test tĩnh | `EXIT=0` (62 test PASS) | Bóng nghỉ là **token của design system** `var(--shadow-card)`, không phải bóng mặc định của framework; bundle chứa nguyên văn quy tắc | `getComputedStyle` **không đo được** — `ENV_BLOCKED` (`BLK-01`) |
| `AC-03` | `grep` khối `.hrp-card:hover` trên nguồn đã bóc comment; bảng §3.3 | `EXIT=0` | Hover đổi **đồng thời** `transform: translateY(-2px)` cộng `box-shadow: var(--shadow-card-hover)` cộng `border-color: var(--color-primary-dark)`; `transition-property: transform, box-shadow, border-color` (đủ **ba**); `transition-duration: var(--t-medium)` = **220ms ≤ 250ms** | Hai bộ computed cộng ảnh nghỉ/hover: `ENV_BLOCKED` (`BLK-01`) |
| `AC-04` | `git show c6256e7:'app/(portal)/page.tsx'` so với bản nay, dòng card; `--spacing-card-padding` trong khối theme | `EXIT=0` | Padding card = `var(--spacing-card-padding)` = **24px** (token có sẵn, không đổi giá trị); cỡ tên việc làm `text-lg` → `text-xl`; tên đơn vị cộng địa điểm dùng `--color-on-surface-variant` `#594138` (xám dịu ấm) | Ba giá trị computed: `ENV_BLOCKED` (`BLK-01`) |
| `AC-05` | `grep -n 'hrp-pill' 'app/(portal)/page.tsx'` = `:200`/`:204`/`:208`; quy tắc `.hrp-pill` so với `.hrp-pill-location` | `EXIT=0` | Pill địa điểm nền `--color-primary-soft` `#fdf1ec` (cam rất nhạt) khác pill ca làm nền `--color-surface-container` `#efeeec`; cả ba pill giữ `rounded-full` và giữ icon (`badge` / `location_on` / `schedule`) | Ảnh cộng computed: `ENV_BLOCKED` (`BLK-01`) |
| `AC-06` | Quy tắc `.hrp-panel` so với `.hrp-card`; `grep -n 'hrp-panel' 'app/(portal)/page.tsx'` = `:430` | `EXIT=0` | Nền panel `--color-surface-container-low` **`#f4f3f1`** khác nền card `--color-surface` **`#ffffff`**; hai giá trị đặt cạnh nhau, khác nhau | Computed: `ENV_BLOCKED` (`BLK-01`) |
| `AC-07` | `grep -c 'outline-none' 'app/(portal)/page.tsx'` **và** trên blob baseline; `grep -c ':focus-visible' app/globals.css`; `grep -c 'focus-visible' .next/static/css/50da1484518ddb02.css`; §3.5 | `0` **và** `0` (bảo toàn, đúng như `AC-07` mô tả); `:focus-visible` `1` → `4`; bundle giữ **cả hai** quy tắc | Bundle: `.hrp-focus:focus-visible{outline:2px solid var(--color-focus-ring);outline-offset:2px}` **và** `:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}`. Quy tắc toàn cục kế thừa nay ở `:604` (baseline `:341`, dịch **đúng +263** = số dòng tôi thêm) và nó **nằm trong** vùng băm của `AC-12` ⇒ việc bảo toàn nó được chứng minh tới từng byte, không phải bằng lời. **12 lần xuất hiện `hrp-focus`** (8 ở `page.tsx`, 4 ở navbar) quy về **9 control logic** — đối chiếu từng dòng ở §3.5 | Đếm vòng focus **quan sát được** cộng ảnh focus: `ENV_BLOCKED` (`BLK-01`) |
| `AC-08` | `grep -c 'type="checkbox"' 'app/(portal)/page.tsx'` trước/sau; `grep -c 'appearance-none'` trước/sau; trích `select` ở §3.6 | `0` → `0`; `1` → `1` | `select` vẫn là element **native** (`<select>` mở ở `:274`), vẫn `appearance-none`; chevron `expand_more` vẫn là `span` riêng, có `aria-hidden="true"` (`:281`) và `pointer-events-none`; hover cho `border-color: var(--color-outline)`, focus cho `border-color: var(--color-primary-dark)` ⇒ **hai giá trị khác nhau**, cộng vòng focus `hrp-focus` | Hai bộ computed cộng bàn phím mở/chọn option: `ENV_BLOCKED` (`BLK-01`) |
| `AC-09` | `git diff -- 'app/(portal)/page.tsx'`; `grep -c 'style={{'` trước/sau; `grep -c 'transition-colors'` trước/sau | `style={{` `39` → `32`; `transition-colors` `7` → `0` | Ba nút có hover **và** active bằng CSS: `.hrp-btn-primary:hover:not(:disabled)` (`background-color: var(--color-primary-dark)`, `transform: scale(1.02)`), `.hrp-btn-primary:active:not(:disabled)` (`transform: none`), `.hrp-btn-outline:hover`, `.hrp-btn-ghost:hover:not(:disabled)`. `currentTarget.style.backgroundColor` ở navbar `8` → `4`, bốn còn lại thuộc nav-item ngoài phạm vi ba nút | Computed ba trạng thái mỗi nút: `ENV_BLOCKED` (`BLK-01`) |
| `AC-10` | `grep -c 'prefers-reduced-motion' app/globals.css`; `git diff -- app/globals.css` đếm dòng `-`; `grep -c 'prefers-reduced-motion' .next/static/css/50da1484518ddb02.css` | `1` → **`1`**; dòng xoá = `0`; bundle = `2` hit | Khối `:346` của `474f3dc` nay ở `:609` (dịch **đúng +263** = số dòng tôi thêm) và **nguyên văn, không đổi một byte** — nó nằm **trong** vùng băm của `AC-12`, nên `sha256` khớp hai phía là bằng chứng bảo toàn mạnh nhất có thể có. Bundle giữ `@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}.nav-item-lift:hover{transform:none!important}}` ⇒ transform bị huỷ, còn `transition-duration` chỉ bị rút về `.01ms` nên **đổi màu vẫn còn** | Computed dưới media query: `ENV_BLOCKED` (`BLK-01`). Đây là phép đo **bảo toàn** (`DEC-19`), không phải thành quả round này |
| `AC-11` | `git diff -- 'app/(portal)/page.tsx' > page.diff`; đếm 19 định danh tầng dữ liệu **chỉ trên dòng đã đổi** của diff | `38 53`, 12 hunk; **cả 19 định danh = `0`** | `enrich`, `useEffect`, `fetch(`, `setJobs`, `EnrichedJob`, `useState`, `clientName`, `unitLabel`, `companyName`, `slug`, `total`, `limit`, `page=`, `AREA`, `SHIFT`, `publicJobDetailPath`, `phoneMasked`, `cccdMasked`, `hourlyRate` — không định danh nào xuất hiện trong dòng đổi. Khoá thêm bằng 3 assertion `RQ-11` (`:337`) cộng RED probe ở §3.2 | Contract viết "bốn danh sách filter"; bề mặt này chỉ còn **hai** nhóm (`facets.areas` `:470`, `facets.shifts` `:479`) kể từ go-live-05 — `DEV-05` |
| `AC-12` | Băm nguyên văn vùng từ `.pub-header {` tới hết khối giảm chuyển động, baseline so với nay | **Hai biên, hai băm, cả hai khớp baseline.** Biên **không** gồm newline cuối: `9261` **ký tự** bằng `9323` **byte** (vùng có 39 ký tự non-ASCII nên hai đơn vị này KHÁC nhau — đừng đọc `9261` là byte), `sha256 = ee75a96491e01fffebe7fbe5fefecdab78bf5817924a3187ca1f736994bc7dc7`. Biên **có** newline cuối: `9262` ký tự bằng `9324` byte, `sha256 = b000fb06f5e752462b1f86233ab4f272577eaaea4cb3fb968c143f9633aebd57` — đúng hằng số `PROTECTED_SHA` ở `:523` của test. Chạy cùng phép trên `git show c6256e7:app/globals.css` cho **cùng `b000fb06…`** ⇒ vùng bảo vệ giống baseline **từng byte**. Và `count(css, slice) = 1`, `vùng baseline là chuỗi con LIỀN MẠCH của file mới = True` | Neo còn đủ và **đúng thứ tự**: `.pub-header {` `:452`, `.filter-panel {` `:505`, `.job-card {` `:543`, `.pub-foot {` `:586`, `@media (prefers-reduced-motion` `:609`. Test đọc tệp qua helper `:30`, nơi có một lệnh chuẩn hoá CRLF về LF trước khi băm; tệp trên đĩa là CRLF, và băm bản CRLF nguyên trạng sẽ ra `6293223e…` với `9496` byte. Ai đo `sha256` trực tiếp bằng `sha256sum` trên một lát cắt CRLF mà không chuẩn hoá sẽ ra con số thứ ba đó — **không phải sai lệch, chỉ là khác đơn vị dòng** | Số dòng tuyệt đối `189`–`360` **đã dịch** thành `452`–`609` vì thêm token vào khối theme — đúng như `AC-12` và `EV-26` tiên đoán, nên phép đo là băm chứ không phải số dòng |
| `AC-13` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-ui-premium.static.test.ts` — khối `RQ-13` **tính** tỉ số WCAG 2.x từ chính mã màu đọc trong `app/globals.css` | `EXIT=0`, `Tests 62 passed (62)` | **Bảng đầy đủ 30 dòng ở §3.1.** 10 cặp chữ mới: thấp nhất **`5.013`** ≥ 4.5. 15 mép giao diện mới (mỗi viền **hai** mép): thấp nhất **`3.153`** ≥ 3 — mép viền thấp nhất là **`4.041`**, còn `3.153` là ranh giới **nền nút chính so nền card**. 5 dòng còn lại là chẩn đoán: **2** cặp dưới ngưỡng và cả hai đều **kế thừa** từ baseline, cộng **3** phép đo là *lý do bằng số* để loại `--color-primary` khỏi mọi đường viền mới | 2 cặp kế thừa dưới ngưỡng, 4 assertion khoá hai đầu chặn: `LIM-01`. Pill và panel **không** phải interactive component cũng không phải graphical object ⇒ 3:1 không áp cho nền của chúng, lý do ở §3.1 |
| `AC-14` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-ui-premium.static.test.ts` | `EXIT=0`, `Test Files 1 passed (1)`, `Tests 62 passed (62)`, `16ms` | **19 `describe` / 62 `it`**, bản đồ đầy đủ ở §3.8. Phủ `RQ-01` `:102`, `RQ-02/03/04` `:136`, `RQ-05/06` `:182`, `RQ-07` `:209`, `RQ-08` `:241`, `RQ-09` `:264`, `RQ-11` `:337`, `RQ-13` `:438`, vệ sinh phép đo `:493`, `RQ-12`/`RQ-10`/`RQ-19` `:535`, `RQ-23` `:563`, `RQ-17` `:617`, `RQ-18` `:643`, `RQ-20` `:667`, `RQ-21` `:678`, `RQ-22` `:693`, `RQ-24` `:715`, `RQ-25` `:748`, `RQ-26` `:756`. Hai RED probe ở §3.2 chứng minh hàng rào **cắn** | `RQ-14/15/16` là yêu cầu quy trình, không có assertion trong file — chúng được đo bằng chính file này, bằng gate, và bằng HANDOFF |
| `AC-15` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; diff-check = `git status --porcelain` cộng `git diff --numstat` | `0`; `0`; `0`; `0`; `0` | `tsc --noEmit` không in gì. Lint `✖ 494 problems (0 errors, 494 warnings)` = **đúng mức nền repo** (go-live-05 §6 `#5` cũng `494`) ⇒ **không tăng lỗi lint**. `Test Files 101 passed (101)` / `Tests 1567 passed (1567)` / `20.54s` — nền trước round này là `1505`, cộng `62` test mới = `1567`. Build `✓ Compiled successfully in 3.6s`, `✓ Generating static pages (29/29)` | `diff-check` **không phải** npm script trong repo (`DEV-04`); dùng tiền lệ go-live-05 §6 `#18`. Cảnh báo `@import rules must precede all rules` của CSS optimizer là **tiền tồn**: nó chỉ vào `@import url("…Material+Symbols…")` ở đầu file, không thuộc 263 dòng thêm — quy thuộc ở §3.7 |
| `AC-16` | Chính file này | — | Mọi ô ở §3 có **lệnh cộng số**; các số đo lớn nằm ở §3.1 (bảng tương phản 29 dòng), §3.2 (RED probe), §3.3 (kế toán chuyển động), §3.4 (bundle), §3.5 (đối chiếu 9 control), §3.6 (trước/sau từng phép đếm), §3.7 (`STEP-12` cộng quy thuộc cảnh báo), §3.8 (bản đồ test) | None |
| `AC-17` | `git show c6256e7:'app/(portal)/page.tsx'` so với bản nay cho nút Lưu việc và nút Ứng tuyển; `grep -c 'min-h-11'` trước/sau; trích `select` ở §3.6 | `min-h-11` `0` → **`6`** ở `page.tsx`, `0` → **`4`** ở navbar | **Hai giá trị baseline đã đổi đúng như AC đòi:** nút Lưu việc `w-9 h-9` (36px) → **`w-11 h-11`** (44px); nút Ứng tuyển `py-2` (không đạt ngưỡng) → **`min-h-11`**. `select`: `py-2.5` **trước** và `py-2.5` **sau**, cộng thêm `min-h-11` ⇒ chỉ tăng, **không** bị hạ xuống dưới ngưỡng. `cursor-pointer` có trên select và trên nút Lưu việc; `.hrp-btn-primary` mang `cursor:pointer`, `.hrp-btn-muted` mang `cursor:not-allowed` (đúng ngữ nghĩa disabled) | Đo hộp giới hạn thật cộng khoảng cách 8px giữa hai phần tử liền kề: `ENV_BLOCKED` (`BLK-01`). `min-h-11` = `min-height: 2.75rem` = 44px là **giá trị khai báo**, không phải giá trị computed |
| `AC-18` | `grep -n 'hrp-skip' app/components/GlobalNavbar.tsx app/globals.css`; `grep -n 'id="hrp-main"' 'app/(portal)/page.tsx'` | navbar `:89`, CSS 2 quy tắc; `page.tsx:424` | `.hrp-skip{position:absolute;top:0;left:-9999px}` ⇒ **không chiếm chỗ** trong bố cục khi chưa có tiêu điểm; `.hrp-skip:focus{top:16px;left:16px}` ⇒ hiện ra khi nhận tiêu điểm. Nó là phần tử đầu tiên trong `<header>` nên là đích tab đầu tiên; `href="#hrp-main"` trỏ đúng `id="hrp-main" tabIndex={-1}` ⇒ đích nhận được tiêu điểm theo lập trình. Tương phản chữ `#a63b00` trên `#ffffff` = **6.47** | Nhấn tab thật cộng ảnh trạng thái hiện cộng vị trí tiêu điểm sau khi kích hoạt: `ENV_BLOCKED` (`BLK-01`) |
| `AC-19` | `grep -c 'prefers-color-scheme'` và `grep -c 'dark:'` trên baseline blob so với bản nay (fixed-string) | `prefers-color-scheme` `0` → **`0`**; `data-theme` `0` → **`0`**; `.dark` trong `app/globals.css` `0` → **`0`**; `dark:` `3` → **`3`** | Ba token mới (`--shadow-card-hover`, `--color-focus-ring`, `--t-medium`) đều **không** có biến thể tối ⇒ **0** biến thể token tối mới | **Bẫy đo đã tự bắt:** ba hit `dark:` của `app/globals.css` **không** phải biến thể Tailwind mà là tên token kết thúc bằng `-dark:` — `:11` `--color-primary-dark`, `:79` `--color-brand-dark`, `:150` `--primary-dark` — giống hệt baseline. Một lần đo sớm hơn của tôi viết mẫu `.dark` dưới dạng regex nên dấu chấm khớp mọi ký tự và đếm ra `8` → `26`; đó thực ra là số lần **dùng** token có sẵn `--color-primary-dark` (`-dark` = `9` → `27`), không phải biến thể tối. Số đúng: fixed-string `.dark` trong nguồn = `0` → `0`, khoá bằng assertion `:535`. Bundle có `13` utility `.dark\:` nhưng chúng sinh từ `app/admin/**` (ví dụ `dark:bg-gray-700`), không từ ba file của round này — cả ba đều có `dark:` biến thể = `0` |
| `AC-20` | `grep -n 'max-w-' app/components/GlobalNavbar.tsx 'app/(portal)/page.tsx'` | navbar `max-w-7xl` → **`max-w-[1600px]`** (`1` → `0` / `0` → `1`); trang `max-w-[1600px]` `:424` | Hai container nay **cùng** `max-w-[1600px]` và **cùng** `px-6 md:px-[5%]`, `mx-auto` ⇒ mép trái trùng nhau **theo cấu trúc** ở mọi breakpoint, không chỉ ở bốn giá trị được nêu. Khoá bằng assertion `RQ-20` `:667` so **chuỗi container** của hai file | Tám số đo toạ độ thật cộng ảnh ở 1440: `ENV_BLOCKED` (`BLK-01`) |
| `AC-21` | `grep -c 'material-symbols-outlined'` trước/sau; đếm `span` có `aria-hidden` **cùng dòng**; đọc baseline `aria-hidden` | icon trang trí `9` → **`9`**; `span` mang `aria-hidden` `0` → **`9`**; `aria-hidden` tổng `1` → `10` | Baseline có đúng **9** icon ligature trang trí và **0** icon nào được ẩn; `aria-hidden` duy nhất của baseline là `:151` — **overlay link**, không phải icon. Nay **9/9** icon trang trí có `aria-hidden="true"`: `:161`, `:201`, `:205`, `:209`, `:230`, `:266`, `:281`, `:448`, `:571` ⇒ số icon trang trí có `aria-hidden` **bằng đúng** số icon trang trí đếm được ở baseline | Kiểm cây tiếp cận thật cộng ảnh: `ENV_BLOCKED` (`BLK-01`) |
| `AC-22` | `grep -n '<label\|type="search"\|hrp-panel' 'app/(portal)/page.tsx'`; cộng chín phép đếm fixed-string cho mọi cơ chế gập | nhãn `:443`, input `:453`, `type="search"` `:455`; cả chín phép đếm = **`0`** | Nhãn là **văn bản nhìn thấy được** — `htmlFor="hrp-keyword"` khớp `id="hrp-keyword"`, class là `text-sm font-semibold mb-2 flex items-center gap-2` (**không** `sr-only`, **không** `hidden`) ⇒ nó vừa là nhãn tiếp cận vừa là nhãn thị giác. Kiểu là `type="search"` chứ không phải `text` ⇒ ngữ nghĩa đúng. **Ô từ khóa là control đầu tiên**: trong `<form>` `:428`, mọi thứ trước `:453` là `h2` cộng `p` (không tương tác); `<FacetSelect>` render ở `:465` và `:474`, nút submit ở `:485` ⇒ thứ tự DOM là từ khóa → vị trí → ca → tìm kiếm. **Không có cơ chế gập nào tồn tại**: `<details` `0`, `<summary` `0`, `aria-expanded` `0`, `lg:hidden` `0`, `hidden lg:` `0`, `max-h-0` `0`, `className="hidden` `0`, `collapse` `0`, `accordion` `0` ⇒ panel hiện đầy đủ ở **mọi** bề rộng, không riêng 1024 và 1440. Bố cục: container `:424` là `flex flex-col lg:flex-row`, `<aside>` `:427` là `w-full lg:w-80 flex-shrink-0` ⇒ ≥1024px thành cột 20rem cạnh danh sách, <1024px xếp trên, **luôn** được render | Ảnh panel ở hai breakpoint: `ENV_BLOCKED` (`BLK-01`). Phép đo là **cấu trúc**: chứng minh không tồn tại đường nào để panel bị ẩn, mạnh hơn hai lần chụp ảnh ở hai bề rộng |
| `AC-23` | `grep -n 'transition\|transform\|!important' app/globals.css` giới hạn vào dải khối mới `:203`–`:451`; cộng khối assertion `RQ-23` `:563` | `transition-property` = **`5`**; `transform` khác `none` = **`2`**; chạm `width`/`height`/`top`/`left`/`all` = **`0`**; `!important` trong **khai báo** = **`0`** | **Hai nhóm động, đúng trần:** `.hrp-card:hover` `translateY(-2px)` `:273` và `.hrp-btn-primary:hover:not(:disabled)` `scale(1.02)` `:318`. Panel, pill, field, skip link **không** có transform. Hợp của bốn tập thuộc tính: `{transform, box-shadow, background-color, border-color}` — `:257`, `:312`, `:335`, `:354`, `:397` — **toàn bộ đều thuộc danh sách được phép**, không một thuộc tính gây reflow nào. Thời lượng: chiều **vào** khai trong `:hover` = `var(--t-medium)` = `220ms` (`:276`, `:320`, `:342`, `:361`, `:403`); chiều **ra** khai ở quy tắc gốc = `var(--t-fast)` = `150ms` (`:258`, `:313`, `:336`, `:355`, `:398`) ⇒ `150/220` = **`68.2%`** ≤ `70%`. Easing `var(--ease-out)` = `cubic-bezier(0.22, 1, 0.36, 1)`. `transform: none` xuất hiện 3 lần và cả 3 đều là **guard huỷ chuyển động**, không phải chuyển động mới: `:326` trong `.hrp-btn-primary:active:not(:disabled)` (huỷ cú phóng khi nhấn xuống), `:442` trong `@media (hover: none), (pointer: coarse)` (`RISK-05` — thiết bị cảm ứng giữ `:hover` dính sau khi chạm; đây **không** phải guard giảm chuyển động thứ hai, at-rule khác hẳn nên phép đếm của `AC-10` vẫn bằng `1`), và `:621` `transform: none !important` thuộc khối `prefers-reduced-motion` **kế thừa** `DEC-19` | 10 lần `!important` trong khối mới đều nằm trong **lời văn comment** (`:212`, `:226`, `:246`, `:247`, `:301`) — số khai báo thật là `0`. Giá trị computed thật cộng đo thời lượng bằng đồng hồ: `ENV_BLOCKED` (`BLK-01`); mọi số ở đây là **giá trị khai báo** đọc từ nguồn |
| `AC-24` | `grep -c -F 'href={detailHref}'` trên `git show c6256e7:'app/(portal)/page.tsx'` và trên bản nay; cộng `grep -n 'detailHref\|publicJobDetailPath'` | baseline = **`2`**, nay = **`2`** | Hai điểm dùng: overlay phủ toàn card `:150` và tiêu đề `:169`. Nguồn duy nhất dựng nó là `const detailHref = publicJobDetailPath(job.slug);` `:139`, và `publicJobDetailPath` import từ `@/src/domains/job-board/public-detail.meta` `:10` — **không** có chuỗi `/viec-lam/` viết tay nào trong file. Khoá bằng assertion `RQ-24` `:715`. Cùng phép đếm này cũng là một trong bốn phép của `STEP-12`, đo **trước** khi sửa dòng đầu tiên và **sau** khi xong, cả hai lần đều `2` — chi tiết §3.7 | Một lần bấm thật cộng URL quan sát được: `ENV_BLOCKED` (`BLK-01`). Điều chứng minh được không-cần-trình-duyệt là **đường dẫn không đổi**: cùng số điểm dùng, cùng hàm dựng, cùng slug |
| `AC-25` | `grep -n 'ApplyModal' 'app/(portal)/page.tsx'`; `git diff --numstat -- src/domains/job-board/components/apply-modal.tsx` | import ở **`:7`**; render ở `:631`; numstat **rỗng** (`EXIT=0`, không một dòng output) | Dòng import nguyên văn: `import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';` — đúng đường dẫn contract nêu. File modal **không bị chạm một dòng nào**, nên nhánh "nếu khác 0 thì chỉ chạm trình bày" không cần viện đến. Điểm render `:631` nằm trong cùng nhánh điều kiện của baseline; nút Ứng tuyển vẫn là thứ mở nó. Đây cũng là phép thứ hai của `STEP-12`: dòng import ở `:7` **trước** và `:7` **sau** | Ảnh modal đang mở: `ENV_BLOCKED` (`BLK-01`). numstat rỗng là bằng chứng mạnh hơn ảnh cho nửa "vẫn render được": không có mã nào đổi thì không có hành vi nào đổi |
| `AC-26` | `git diff --numstat -- src/domains/job-board/public.service.ts`; cộng bốn phép đếm chạy **chỉ trên 91 dòng đã đổi** của `git diff -- 'app/(portal)/page.tsx'` | numstat **rỗng**; bốn phép đếm = **`0`**, **`0`**, **`0`**, **`0`** | `public.service.ts` không bị chạm một dòng nào — nó cũng là phép thứ tư của `STEP-12`, rỗng **trước** và rỗng **sau**. Bốn phép trên dòng đổi: DTO (`PublicJobDto`, `PublicJobFacets`, `phoneMasked`, `cccdMasked`, `hourlyRate`, `clientName`, `companyName`) = `0`; facet (`facets`, `EMPTY_FACETS`, `setFacets`) = `0`; phân trang (`offset`, `limit`, `hasMore`, `loadMore`, `total`, `page=`) = `0`; nhãn đơn vị (`summaryLabel`, `unitLabel`) = `0`. Bộ máy phân trang vẫn nguyên ở `:111`–`:113`, `:322`–`:338`, `:370`–`:390`, `:532`–`:533`, `:618` và **không dòng nào trong số đó** có mặt trong diff | **Bẫy đo thứ hai đã tự bắt:** lần chạy đầu, phép đếm phân trang ra `4` chứ không phải `0`. Cả bốn hit là chuỗi `offset` **nằm trong** utility Tailwind `outline-offset-2`, và cả bốn đều ở dòng **bị xoá** (`-`) — chính là các utility focus nội tuyến mà `RQ-10` thay bằng `.hrp-focus`. Biên giới từ **không** phân biệt được (dấu `-` là ký tự không-từ), nên phép đo đúng là trừ `outline-offset` ra: `grep -v -F 'outline-offset'` rồi đếm ⇒ `0`. Ghi lại cả hai con số để Tier 3 chạy lại thấy cùng hiện tượng thay vì nghi tôi chọn mẫu cho vừa kết quả |

### 3.1 Bảng tương phản — 30 dòng, mọi số do máy tính ra

Lệnh: `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-ui-premium.static.test.ts` (khối `RQ-13` ở `:438`). Tỉ số **không** được chép tay vào văn bản: hàm `luminance` cộng `ratio` trong file test đọc mã màu bằng `hexOf()` — lần theo cả `var(--x)` gián tiếp — **trực tiếp từ `app/globals.css`**, nên đổi một token là test đỏ. Bảng dưới đây tái tạo cùng phép tính để Tier 3 đọc được từng con số mà không phải chạy test.

Vì sao mỗi đường viền có **hai** dòng: hai mép của một viền kề hai màu khác nhau — nền của chính phần tử ở trong, nền của phần tử cha ở ngoài. Đo một mép rồi kết luận là đo thiếu một nửa.

| # | Nhóm | Cặp | Màu trước | Màu sau | Tỉ số | Ngưỡng | Phán |
|---|---|---|---|---|---|---|---|
| 1 | Chữ | `.hrp-pill-location` | `--color-on-surface-variant` `#594138` | `--color-primary-soft` `#fdf1ec` | **8.476** | 4.5 | PASS |
| 2 | Chữ | `.hrp-panel` chữ chính | `--color-on-surface` `#1a1c1b` | `--color-surface-container-low` `#f4f3f1` | **15.448** | 4.5 | PASS |
| 3 | Chữ | `.hrp-panel` chữ phụ | `--color-on-surface-variant` `#594138` | `--color-surface-container-low` `#f4f3f1` | **8.462** | 4.5 | PASS |
| 4 | Chữ | `.hrp-btn-primary:hover` | `--color-on-primary` `#ffffff` | `--color-primary-dark` `#a63b00` | **6.468** | 4.5 | PASS |
| 5 | Chữ | `.hrp-btn-outline` nghỉ | `--color-primary-dark` `#a63b00` | `--color-surface` `#ffffff` | **6.468** | 4.5 | PASS |
| 6 | Chữ | `.hrp-btn-outline:hover` | `--color-primary-dark` `#a63b00` | `--color-primary-soft` `#fdf1ec` | **5.842** | 4.5 | PASS |
| 7 | Chữ | `.hrp-btn-outline:active` | `--color-primary-dark` `#a63b00` | `--color-primary-fixed` `#ffdbce` | **5.013** | 4.5 | PASS |
| 8 | Chữ | `.hrp-btn-ghost:hover` | `--color-primary-dark` `#a63b00` | `--color-primary-soft` `#fdf1ec` | **5.842** | 4.5 | PASS |
| 9 | Chữ | `.hrp-btn-muted` | `--color-on-surface-variant` `#594138` | `--color-surface-container` `#efeeec` | **8.093** | 4.5 | PASS |
| 10 | Chữ | `.hrp-skip` | `--color-primary-dark` `#a63b00` | `--color-surface` `#ffffff` | **6.468** | 4.5 | PASS |
| 11 | Giao diện | vòng focus / nền surface | `--color-focus-ring` `#a63b00` | `--color-surface` `#ffffff` | **6.468** | 3.0 | PASS |
| 12 | Giao diện | vòng focus / nền body | `--color-focus-ring` `#a63b00` | `--color-background` `#faf9f7` | **6.147** | 3.0 | PASS |
| 13 | Giao diện | vòng focus / nền panel | `--color-focus-ring` `#a63b00` | `--color-surface-container-low` `#f4f3f1` | **5.832** | 3.0 | PASS |
| 14 | Giao diện | vòng focus / nền primary-soft | `--color-focus-ring` `#a63b00` | `--color-primary-soft` `#fdf1ec` | **5.842** | 3.0 | PASS |
| 15 | Giao diện | viền `.hrp-card:hover` mép **trong** | `--color-primary-dark` `#a63b00` | `--color-surface` `#ffffff` | **6.468** | 3.0 | PASS |
| 16 | Giao diện | viền `.hrp-card:hover` mép **ngoài** | `--color-primary-dark` `#a63b00` | `--color-background` `#faf9f7` | **6.147** | 3.0 | PASS |
| 17 | Giao diện | viền `.hrp-field:hover` mép **trong** | `--color-outline` `#8d7166` | `--color-surface` `#ffffff` | **4.481** | 3.0 | PASS |
| 18 | Giao diện | viền `.hrp-field:hover` mép **ngoài** | `--color-outline` `#8d7166` | `--color-surface-container-low` `#f4f3f1` | **4.041** | 3.0 | PASS |
| 19 | Giao diện | viền `.hrp-field:focus` mép **trong** | `--color-primary-dark` `#a63b00` | `--color-surface` `#ffffff` | **6.468** | 3.0 | PASS |
| 20 | Giao diện | viền `.hrp-field:focus` mép **ngoài** | `--color-primary-dark` `#a63b00` | `--color-surface-container-low` `#f4f3f1` | **5.832** | 3.0 | PASS |
| 21 | Giao diện | viền `.hrp-btn-outline:hover` **trong** | `--color-primary-dark` `#a63b00` | `--color-primary-soft` `#fdf1ec` | **5.842** | 3.0 | PASS |
| 22 | Giao diện | viền `.hrp-btn-outline:hover` **ngoài** | `--color-primary-dark` `#a63b00` | `--color-surface` `#ffffff` | **6.468** | 3.0 | PASS |
| 23 | Giao diện | viền `.hrp-btn-outline:active` **trong** | `--color-primary-dark` `#a63b00` | `--color-primary-fixed` `#ffdbce` | **5.013** | 3.0 | PASS |
| 24 | Giao diện | viền `.hrp-skip` mép **trong** | `--color-primary-dark` `#a63b00` | `--color-surface` `#ffffff` | **6.468** | 3.0 | PASS |
| 25 | Giao diện | nền `.hrp-btn-primary` / nền card | `--color-primary` `#f26522` | `--color-surface` `#ffffff` | **3.153** | 3.0 | PASS |
| 26 | Kế thừa | nút chính **nghỉ**: chữ trên nền | `--color-on-primary` `#ffffff` | `--color-primary` `#f26522` | **3.153** | 4.5 | **DƯỚI** — `LIM-01` |
| 27 | Kế thừa | nút Ứng tuyển **đã nộp**: chữ trên nền | `--color-success` `#16803a` | `--color-success-soft` `#e7f4ec` | **4.435** | 4.5 | **DƯỚI** — `LIM-01` |
| 28 | Chẩn đoán | `--color-primary` trên nền body | `--color-primary` `#f26522` | `--color-background` `#faf9f7` | **2.997** | 3.0 | dưới ⇒ **bị loại** khỏi viền |
| 29 | Chẩn đoán | `--color-primary` trên nền panel | `--color-primary` `#f26522` | `--color-surface-container-low` `#f4f3f1` | **2.843** | 3.0 | dưới ⇒ **bị loại** khỏi viền |
| 30 | Chẩn đoán | `--color-primary` trên nền primary-soft | `--color-primary` `#f26522` | `--color-primary-soft` `#fdf1ec` | **2.848** | 3.0 | dưới ⇒ **bị loại** khỏi viền |

**Đọc bảng này thế nào.**

*Dòng 1–25 là thành quả của round này và tất cả đều PASS.* Thấp nhất trong nhóm chữ là **5.013** (dòng 7), cao hơn ngưỡng 4.5 một khoảng rộng. Thấp nhất trong nhóm giao diện là **3.153** (dòng 25); thấp nhất trong riêng các **đường viền** là **4.041** (dòng 18).

*Dòng 28–30 là lý do bằng số cho một quyết định thiết kế, không phải khuyết điểm.* `--color-primary` `#f26522` đạt 3.153 trên nền trắng nhưng chỉ **2.997** trên nền body — thiếu ngưỡng 3:1 đúng **0.003**. Nếu lấy nó làm màu viền hover thì viền đạt ở mép trong và **hỏng** ở mép ngoài, mà mép ngoài là mép người ta nhìn thấy trước. `STEP-07` ra lệnh rõ: *"Cặp nào dưới ngưỡng thì chọn token khác, không hạ ngưỡng"* — nên **bảy** khai báo viền mới dùng `--color-primary-dark` `#a63b00` — `:275` `.hrp-card:hover`, `:341` và `:346` `.hrp-btn-outline` hover cùng active, `:360` và `:365` `.hrp-btn-ghost` hover cùng active, `:406` `.hrp-field:focus-visible`, `:422` `.hrp-skip` — cộng vòng focus ở `:303` đi qua token trung gian `--color-focus-ring` (`:122`, giá trị là `var(--color-primary-dark)`, nên `hexOf` lần ra cùng `#a63b00`). Token đó cùng họ cam (hue 21) và đo trên **cả sáu** bề mặt có mặt trên trang: 6.468 nền trắng, 6.147 nền body, 5.832 nền panel, 5.842 nền primary-soft, 5.578 nền surface-container, 5.013 nền primary-fixed — **thấp nhất 5.013**, tức mọi mép của bảy đường viền đó dư ngưỡng 3:1 với biên rộng. Mười lăm dòng `Giao diện` của bảng liệt kê **mép theo từng quy tắc** cho năm quy tắc mà nền riêng của phần tử khác nền trang; hai đường viền của `.hrp-btn-ghost` không có dòng riêng vì cặp màu của chúng **đã** nằm trong bảng — nền hover của ghost là `--color-primary-soft` (dòng 8 nhóm chữ) và nền nghỉ là `--color-surface` (dòng 24). Sắc cam chủ đạo không mất: nó vẫn hiện trong bóng hover `rgba(242,101,34,0.14)` và trong nền nút chính. Ba con số này được khoá bằng assertion, nên nếu một ngày token đổi và chúng vượt 3:1 thì test **đỏ** và việc chọn lại token trở thành quyết định có căn cứ chứ không phải quán tính.

*Dòng 26–27 là hai cặp DƯỚI ngưỡng và cả hai đều KẾ THỪA.* Bằng chứng là kế thừa, không phải hồi quy: baseline `c6256e7` đã sơn đúng hai cặp này bằng inline style; `RQ-09` yêu cầu **chuyển** chúng từ inline sang class, không yêu cầu đổi giá trị, và đổi giá trị token thương hiệu nằm ngoài scope §4.2. Test khoá lại bằng **mã màu chính xác** (`#f26522`, `#ffffff`, `#16803a`, `#e7f4ec`) cộng hai đầu chặn cho mỗi cặp, nên chúng không thể trôi xuống thấp hơn mà không ai biết. Chi tiết và đường xử lý ở `LIM-01` §5. Dòng 26 và dòng 25 là **cùng một cặp màu đọc theo hai vai**: xét như *ranh giới đồ hoạ* (nền nút so nền card) nó cần 3:1 và đạt 3.153; xét như *chữ* (nhãn trắng trên nền cam) nó cần 4.5:1 và thiếu. Cùng một con số, hai ngưỡng khác nhau — đó là lý do nó xuất hiện hai lần thay vì bị giấu một lần.

**Vì sao 3:1 không áp cho nền của pill và panel.** WCAG 1.4.11 áp cho *thành phần giao diện* (ranh giới của control) và *đối tượng đồ hoạ* (hình cần thấy để hiểu nội dung). Nền của pill và nền của panel không phải cả hai: chúng là bề mặt trang trí, thông tin nằm ở **chữ** trên chúng, và chữ đó đã đo ở dòng 1–3 với 8.476 / 15.448 / 8.462. Đo nền-so-nền ở đây sẽ ra những con số vô nghĩa về mặt tiêu chuẩn — pill-location so nền card = 1.107, pill so nền card = 1.160, panel so nền body = **1.054**, panel so nền card = 1.109 — và không một ngưỡng WCAG nào áp cho chúng. Cái phải phân biệt được là *panel khác card*, và `RQ-06` đo điều đó bằng **giá trị token khác nhau** (`#f4f3f1` ≠ `#ffffff`) cộng viền cộng bóng, không bằng tỉ số tương phản.

### 3.2 Hai phép thử RED — chứng minh hàng rào CẮN, rồi trả về nguyên trạng từng byte

`RQ-14` đòi test đi kèm; nhưng một test luôn xanh không chứng minh gì. Nên với hai bất biến quan trọng nhất, tôi **cố ý phá đúng một dòng thật**, quan sát test đỏ ở đâu, rồi phục hồi và chứng minh phục hồi là **từng byte** bằng `sha256sum` cộng `git diff --numstat`. Cả hai probe đều chạy trên cây cuối cùng, sau khi mọi mã đã xong — không phải trên một bản nháp nào.

**Probe 1 — token màu viền (`RQ-13`).** Đổi `app/globals.css:275` từ `border-color: var(--color-primary-dark);` sang `border-color: var(--color-primary);` — tức là chọn đúng cái token mà bảng §3.1 dòng 28 nói là dưới ngưỡng.

| Giai đoạn | `sha256sum app/globals.css` | numstat | Test | EXIT |
|---|---|---|---|---|
| trước | `e6c0ef6c7d9e4cf4a93e58769927f4bf8acba24aa2a86682280ef2b525623b07` | `263 0` | `62 passed (62)` | `0` |
| RED | `e956ba683f174bf077d00eeeb3f344564685e2475f69c23d0d0751df3609e875` | `263 0` | **`2 failed`** cộng `60 passed (62)` | `1` |
| sau | `e6c0ef6c7d9e4cf4a93e58769927f4bf8acba24aa2a86682280ef2b525623b07` | `263 0` | `62 passed (62)` | `0` |

Hai test đỏ, ở **hai** describe khác nhau, nguyên văn:

```
× go-live-08 / RQ-02, RQ-03, RQ-04 — card việc làm > hover có ĐỒNG THỜI ba hiệu ứng trong CÙNG một quy tắc
  → expected '.hrp-card:hover {\n  transform: trans…' to contain 'border-color: var(--color-primary-dar…'
  ❯ src/domains/job-board/public-ui-premium.static.test.ts:162:19
× go-live-08 / RQ-13 — tương phản của mọi cặp màu MỚI > --color-primary bị loại khỏi mọi đường viền mới, có lý do bằng số
  → expected 2 to be 1 // Object.is equality
  ❯ src/domains/job-board/public-ui-premium.static.test.ts:459:55
```

Phép đếm ở `:459` là thứ đáng chú ý: nó nói *trong toàn dải CSS mới, `var(--color-primary)` chỉ được dùng **đúng một** lần và lần đó là **nền** nút chính, không phải một đường biên*. Một lần dùng thứ hai — bất kể ai thêm, ở selector nào — làm nó đỏ. Đó là hàng rào ở mức bất biến, không ở mức chuỗi.

**Probe 2 — neo trục dữ liệu (`RQ-11`, `RQ-26`).** Đổi `app/(portal)/page.tsx:470` từ `options={facets.areas}` sang `options={AREA_OPTIONS}` — mô phỏng đúng cách một round trình bày làm hỏng sự thật dữ liệu của go-live-05: lặng lẽ thay facet do máy chủ tính bằng một mảng gắn cứng.

| Giai đoạn | `sha256sum 'app/(portal)/page.tsx'` | numstat | Test | EXIT |
|---|---|---|---|---|
| trước | `29f0348cba31c87e013619d73470d8f89e0f1e41096b9827414774c3031c8d68` | `38 53` | `62 passed (62)` | `0` |
| RED | `efc93b237d4316f47b0484fcdc7b793382b458409cbf5e0877f04efd76a8a658` | `38 53` | **`2 failed`** cộng `60 passed (62)` | `1` |
| sau | `29f0348cba31c87e013619d73470d8f89e0f1e41096b9827414774c3031c8d68` | `38 53` | `62 passed (62)` | `0` |

```
× go-live-08 / RQ-11 — tầng dữ liệu của trang công khai còn nguyên > nguồn lựa chọn của bộ lọc vẫn là facets từ API, không phải mảng gắn cứng
  → expected '\'use client\';\n\nimport { useState,…' to contain 'options={facets.areas}'
× go-live-08 / RQ-26 — sự thật dữ liệu của GO-LIVE-05 còn nguyên > trục dữ liệu của trang landing không bị round trình bày chạm tới
  → mất neo trục dữ liệu: facets.areas: expected '\'use client\';\n\nimport { useState,…' to contain 'facets.areas'
```

Hai describe **độc lập** cùng bắt được một dòng bị đổi, và một trong hai in ra thông điệp có nghĩa (`mất neo trục dữ liệu: facets.areas`) chứ không chỉ "expected to contain". Đó là điều tôi muốn Tier 3 kiểm: `AC-11` cộng `AC-26` không dựa vào việc tôi *nói* rằng tầng dữ liệu còn nguyên, mà dựa vào một phép thử **đã được chứng minh là đỏ khi lời nói đó sai**.

### 3.3 Kế toán chuyển động — `RQ-23` đo bằng liệt kê đầy đủ, không bằng mẫu

Lệnh: `grep -n 'transition\|transform\|!important' app/globals.css` rồi giới hạn vào dải khối mới `:203`–`:451` (dải khối chết bắt đầu ở `:452`). **Bảng dưới là toàn bộ**, không phải một mẫu đại diện — `RQ-23` nói "mọi khai báo transition mới", nên liệt kê thiếu một dòng là đo sai.

| Selector | Dòng | `transition-property` | Chiều **ra** (quy tắc gốc) | Chiều **vào** (`:hover`) |
|---|---|---|---|---|
| `.hrp-card` | `:253` | `transform, box-shadow, border-color` | `--t-fast` `:258` | `--t-medium` `:276` (`.hrp-card:hover` `:272`) |
| `.hrp-btn-primary` | `:308` | `transform, box-shadow, background-color, border-color` | `--t-fast` `:313` | `--t-medium` `:320` (`:hover:not(:disabled)` `:316`) |
| `.hrp-btn-outline` | `:330` | `background-color, border-color` | `--t-fast` `:336` | `--t-medium` `:342` (`:hover` `:339`) |
| `.hrp-btn-ghost` | `:349` | `background-color, border-color` | `--t-fast` `:355` | `--t-medium` `:361` (`:hover:not(:disabled)` `:358`) |
| `.hrp-field` | `:393` | `border-color, background-color` | `--t-fast` `:398` | `--t-medium` `:403` (`:hover` `:401`) |

**Năm khai báo, hợp của các tập thuộc tính = `{transform, box-shadow, background-color, border-color}`.** Cả bốn đều nằm trong danh sách `RQ-23` cho phép. Phép đếm thuộc tính gây reflow — `width`, `height`, `top`, `left`, cộng cả `all` — trên toàn dải: **`0`**. Skip link đổi vị trí bằng `top`/`left` nhưng **không khai transition** (`:409`–`:433`), nên nó không nằm trong lệnh cấm; đó là một lựa chọn có chủ ý, ghi ngay trong comment `:411`–`:412`.

**Trần "tối đa hai nhóm phần tử động mỗi khung nhìn": đúng hai.** `transform` khác `none` xuất hiện **đúng 2 lần** trong toàn dải mới: `.hrp-card:hover` `translateY(-2px)` `:273` và `.hrp-btn-primary:hover:not(:disabled)` `scale(1.02)` `:318`. Panel, pill, field, skip link **không** có transform. Ba lần `transform: none` còn lại đều là guard huỷ chuyển động, quy thuộc ở ô `AC-23` §3.

**Thời lượng vào và ra:**

| | Token | Giá trị | Khai ở |
|---|---|---|---|
| Chiều **vào** | `--t-medium` | `220ms` | quy tắc `:hover` — 5 lần |
| Chiều **ra** | `--t-fast` | `150ms` | quy tắc gốc — 5 lần |
| Tỉ lệ | | `150 / 220` = **`68.2%`** | ≤ `70%` theo `RQ-23` |

Easing dùng chung `var(--ease-out)` = `cubic-bezier(0.22, 1, 0.36, 1)` (`:107`, token kế thừa, không đổi). Cách xếp này khai thác đúng cơ chế CSS: `transition` khai trên quy tắc gốc chi phối lúc **rời** hover, khai trong `:hover` chi phối lúc **vào** — nên chỉ cần một dòng `transition-duration` trong mỗi khối `:hover` là có hai thời lượng khác nhau cho hai chiều, không cần nhân đôi khai báo.

**`!important`:** `grep -c '!important'` trên dải mới ra `10`, nhưng cả `10` đều nằm trong **lời văn comment** — `:212`, `:226`, `:246`, `:247`, `:301`. Số **khai báo** `!important` mới = **`0`**. Đây đúng là loại chênh mà bài học "đo trên bản biên dịch, không phải nguồn" cảnh báo, nên tôi ghi cả hai con số thay vì chỉ con số có lợi.

### 3.4 Bằng chứng ở mức BUNDLE — không chỉ ở mức nguồn

Đây là mục tôi coi là quan trọng nhất của cả HANDOFF, vì bài học đắt nhất của lane này là *một khối CSS bị dán vào giữa comment thì mọi gate vẫn xanh trong khi bundle rỗng*. Nên mọi khẳng định "lớp này sống" đều được đo lại **trên tệp CSS đã biên dịch**, nơi minifier đã bóc hết comment: chuỗi có mặt ở đó ⇒ nó thật sự sống.

```
$ ls -l .next/static/css/
-rw-r--r-- 1 Admin 197121  4295 Sep  1 19:02 2fd9a055e5480bd0.css
-rw-r--r-- 1 Admin 197121 93870 Sep  1 19:02 50da1484518ddb02.css
```

| Phép đo | Số |
|---|---|
| Lớp `.hrp-*` **riêng biệt** trong `50da1484518ddb02.css` | **`12`** — khớp đúng 12 lớp gốc của nguồn |
| Quy tắc `.hrp-*` trích được từ bundle | **`23`** — khớp đúng 23 khối quy tắc của nguồn `:203`–`:451` |
| Hit `.hrp-` trong `2fd9a055e5480bd0.css` | **`0`** (tệp CSS còn lại không mang lớp nào của round này) |

Trích nguyên văn từ bundle — mỗi dòng dưới đây là bằng chứng một quy tắc **đã qua biên dịch**, không phải một dòng tôi viết trong nguồn:

```css
.hrp-card{padding:var(--spacing-card-padding);background-color:var(--color-surface);box-shadow:var(--shadow-card);transition-property:transform,box-shadow,border-color;transition-duration:var(--t-fast);transition-timing-function:var(--ease-out)}
.hrp-card:hover{box-shadow:var(--shadow-card-hover);border-color:var(--color-primary-dark);transition-duration:var(--t-medium);transform:translateY(-2px)}
.hrp-pill{background-color:var(--color-surface-container)}
.hrp-pill,.hrp-pill-location{color:var(--color-on-surface-variant)}
.hrp-pill-location{background-color:var(--color-primary-soft)}
.hrp-panel{background-color:var(--color-surface-container-low)}
.hrp-focus:focus-visible{outline:2px solid var(--color-focus-ring);outline-offset:2px}
.hrp-btn-primary{background-color:var(--color-primary);color:var(--color-on-primary);cursor:pointer;transition-property:transform,box-shadow,background-color,border-color;transition-duration:var(--t-fast);transition-timing-function:var(--ease-out)}
.hrp-btn-primary:hover:not(:disabled){background-color:var(--color-primary-dark);box-shadow:var(--shadow-card);transition-duration:var(--t-medium);transform:scale(1.02)}
.hrp-btn-primary:active:not(:disabled){background-color:var(--color-primary-dark);box-shadow:none;transform:none}
.hrp-btn-outline{color:var(--color-primary-dark);border-color:var(--color-outline-variant);cursor:pointer;transition-property:background-color,border-color;transition-duration:var(--t-fast);transition-timing-function:var(--ease-out);background-color:#0000}
.hrp-btn-outline:hover{background-color:var(--color-primary-soft);border-color:var(--color-primary-dark);transition-duration:var(--t-medium)}
.hrp-btn-outline:active{background-color:var(--color-primary-fixed);border-color:var(--color-primary-dark)}
.hrp-btn-ghost{background-color:var(--color-surface);color:var(--color-primary-dark);border-color:var(--color-outline-variant);cursor:pointer;transition-property:background-color,border-color;transition-duration:var(--t-fast);transition-timing-function:var(--ease-out)}
.hrp-btn-ghost:hover:not(:disabled){background-color:var(--color-primary-soft);border-color:var(--color-primary-dark);transition-duration:var(--t-medium)}
.hrp-btn-ghost:active:not(:disabled){background-color:var(--color-primary-fixed);border-color:var(--color-primary-dark)}
.hrp-btn-muted{background-color:var(--color-surface-container);color:var(--color-on-surface-variant);cursor:not-allowed}
.hrp-btn-done{background-color:var(--color-success-soft);color:var(--color-success);cursor:default}
.hrp-field{background-color:var(--color-surface);color:var(--color-on-surface);border-color:var(--color-outline-variant);transition-property:border-color,background-color;transition-duration:var(--t-fast);transition-timing-function:var(--ease-out)}
.hrp-field:hover{border-color:var(--color-outline);transition-duration:var(--t-medium)}
.hrp-field:focus-visible{border-color:var(--color-primary-dark)}
.hrp-skip{z-index:100;background-color:var(--color-surface);color:var(--color-primary-dark);border:1px solid var(--color-primary-dark);border-radius:var(--radius-DEFAULT);box-shadow:var(--shadow-card);font-family:var(--font-label);padding:12px 20px;font-size:14px;font-weight:600;line-height:20px;position:absolute;top:0;left:-9999px}
.hrp-skip:focus{top:16px;left:16px}
```

**Guard thiết bị cảm ứng (`RISK-05`) sống trong bundle,** minifier gộp hai selector thành một danh sách:

```css
@media (hover:none),(pointer:coarse){.hrp-btn-primary:hover:not(:disabled),.hrp-card:hover{transform:none}}
```

**Hai tài sản `DEC-19` cũng sống trong bundle, nguyên văn, không bị lớp mới của tôi lấn:**

```css
:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}.nav-item-lift:hover{transform:none!important}}
```

**Ghi chú về độ đặc hiệu — vì sao lớp mới không cần `!important` và không phá quy tắc kế thừa.** `.hrp-focus:focus-visible` có độ đặc hiệu `(0,2,0)`; quy tắc toàn cục `:focus-visible` có `(0,1,0)`. `(0,2,0)` > `(0,1,0)` và cả hai đều **không** dùng id, nên phần tử mang `.hrp-focus` lấy vòng focus `var(--color-focus-ring)` còn **mọi phần tử khác trên toàn site vẫn lấy vòng focus toàn cục** — không có phần tử nào mất vòng focus, và không cần một `!important` nào. Đó là lý do `AC-07` là phép đo **bảo toàn cộng bổ sung**, chứ không phải thay thế. Ngược chiều: khối `prefers-reduced-motion` kế thừa dùng `!important`, nên nó thắng mọi khai báo thường trong lớp mới của tôi bất kể thứ tự trong tệp — `transform` bị huỷ khi người dùng yêu cầu giảm chuyển động, còn `transition-duration` chỉ bị rút về `.01ms` nên **phản hồi màu vẫn còn**, không biến bề mặt thành trơ.

### 3.5 Đối chiếu `hrp-focus`: 12 lần xuất hiện so với số control thật

Lệnh: `grep -n -F 'hrp-focus' 'app/(portal)/page.tsx' app/components/GlobalNavbar.tsx` — `8` cộng `4` = **`12`**. Nhưng 12 **không** phải số control, và tôi muốn nói rõ vì sao thay vì để hai con số lệch nhau mà không giải thích.

| # | Tệp:dòng | Control | Ghi chú |
|---|---|---|---|
| 1 | `page.tsx:170` | Liên kết tiêu đề việc làm (`<Link>` mở ở `:168`) | Trong `JobCard`, render một lần cho mỗi card |
| 2 | `page.tsx:219` | Nút **Ứng tuyển** (`<button>` `:215`) | Trong `JobCard` |
| 3 | `page.tsx:227` | Nút **Lưu việc** (`<button>` `:225`) | Trong `JobCard`, `w-11 h-11` |
| 4 | `page.tsx:274` | `<select>` của `FacetSelect` (`:270`) | **Một** lần xuất hiện, render **hai** `<select>` — `:465` Vị trí, `:474` Ca làm việc |
| 5 | `page.tsx:459` | Ô **Từ khóa** (`<input type="search">` `:453`) | |
| 6 | `page.tsx:488` | Nút **Tìm kiếm** (`<button type="submit">` `:484`) | |
| 7 | `page.tsx:535` | Nút **thử lại** khi lỗi tải (`<button>` `:530`) | Chỉ render trong nhánh lỗi |
| 8 | `page.tsx:619` | Nút **tải thêm** (`<button>` `:616`) | Chỉ render khi còn trang |
| 9 | `navbar:200` | `<Link>` **Đăng nhập** — bộ desktop | |
| 10 | `navbar:206` | `<Link>` **Đăng ký** — bộ desktop | |
| 11 | `navbar:290` | `<Link>` **Đăng nhập** — bộ mobile | Cùng một hành động logic với #9, khai lại cho container mobile |
| 12 | `navbar:297` | `<Link>` **Đăng ký** — bộ mobile | Cùng một hành động logic với #10 |

**Kiểm điều thật đáng kiểm: có control nào của bề mặt công khai bị BỎ SÓT không?** `grep -n -E '<button|<select|<input|<textarea|<a |<Link' 'app/(portal)/page.tsx'` ra **đúng 9** phần tử: `:149`, `:168`, `:215`, `:225`, `:270`, `:453`, `:484`, `:530`, `:616`. Tám trong số đó nằm ở bảng trên. Phần tử thứ chín là `<Link>` **overlay phủ toàn card** `:149`, và nó **không phải điểm dừng tab**:

```jsx
<Link
  href={detailHref}
  aria-hidden="true"
  tabIndex={-1}
  className="absolute inset-0 z-0 rounded-xl"
/>
```

`tabIndex={-1}` đưa nó ra khỏi luồng bàn phím và `aria-hidden="true"` đưa nó ra khỏi cây tiếp cận — nó là tiện ích **chỉ cho chuột**, để bấm chỗ nào trong card cũng tới trang chi tiết. Người dùng bàn phím tới trang chi tiết bằng liên kết tiêu đề #1, thứ **có** vòng focus. Cho overlay một vòng focus sẽ vẽ một đường viền 2px quanh **toàn bộ** card mỗi lần tab — đó là hồi quy thị giác, không phải cải thiện. Nên `8/8` phần tử **có thể nhận tiêu điểm** của trang đều có `hrp-focus`, và phần tử thứ chín cố ý không nhận tiêu điểm.

**Phạm vi của `hrp-focus` trong navbar.** Navbar có 13 phần tử tương tác nhưng chỉ 4 mang `hrp-focus` — đó là **có chủ ý**, không phải sót. Bốn phần tử đó là hai CTA công khai (Đăng nhập, Đăng ký) khai hai lần cho desktop và mobile; chúng thuộc bề mặt công khai mà `RQ-07` chi phối. Chín phần tử còn lại là mục điều hướng của người **đã đăng nhập** cùng nút mở menu mobile — ngoài phạm vi §4.2. Và chúng **không** mất vòng focus: quy tắc toàn cục `:focus-visible` `:604` vẫn áp cho chúng, với `outline: 2px solid var(--color-primary)` (tương phản `3.153` trên nền trắng, ≥ 3). `.hrp-focus` **nâng cấp** token vòng focus cho bề mặt công khai chứ không thay thế cơ chế toàn cục — ghi chú độ đặc hiệu ở §3.4.

**Skip link không nằm trong 12 con số này.** Nó dùng lớp riêng `.hrp-skip` (navbar `:89`) với `:focus` chứ không phải `:focus-visible`, vì nó phải hiện ra khi nhận tiêu điểm **bằng mọi cách**, kể cả cách mà `:focus-visible` không kích hoạt. Đó là `AC-18`, đo riêng.

### 3.6 Bảng đếm TRƯỚC/SAU — mọi con số lấy từ `git show c6256e7:<đường>` so với cây làm việc

Cách đo, chạy lại được nguyên văn: `git show c6256e7:app/(portal)/page.tsx | grep -c -F '<chuỗi>'` cho cột TRƯỚC và `grep -c -F '<chuỗi>' app/(portal)/page.tsx` cho cột SAU. Dùng `-F` (chuỗi cố định) chứ không phải regex — đó là bài học của `AC-19` ở §3 và nó áp cho **cả bảng này**.

**Kiểm tra số học trước tiên.** Ba tệp phải khớp `numstat` tới từng dòng, nếu không thì có thứ gì đó ngoài diff đã chạm vào chúng:

| Tệp | Dòng TRƯỚC | numstat | Dòng SAU | Phép cộng |
| --- | --- | --- | --- | --- |
| `app/(portal)/page.tsx` | 659 | `38 53` | 644 | 659 cộng 38 trừ 53 bằng 644 ✓ |
| `app/components/GlobalNavbar.tsx` | 312 | `14 16` | 310 | 312 cộng 14 trừ 16 bằng 310 ✓ |
| `app/globals.css` | 360 | `263 0` | 623 | 360 cộng 263 trừ 0 bằng 623 ✓ |

#### `app/(portal)/page.tsx`

| Chuỗi đếm | TRƯỚC | SAU | Nó nói gì |
| --- | --- | --- | --- |
| `style={{` | 39 | 32 | 7 khối inline bị rút; phần còn lại là màu chữ/nền tĩnh không biểu đạt trạng thái nên `RQ-09` không đòi chuyển |
| `transition-colors` | 7 | 0 | utility Tailwind chỉ chuyển màu bị thay bằng `transition-property` khai đủ trục ở CSS |
| `focus-visible:outline` | 12 | 0 | 4 phần tử × 3 utility (`outline`, `outline-2`, `outline-offset-2`) rút về một lớp `.hrp-focus` |
| `outline-offset` | 4 | 0 | **chính 4 lần này** là dương tính giả của `AC-26`; xem ô `AC-26` ở §3 |
| `hrp-focus` | 0 | 8 | 8 trên 8 phần tử nhận-tiêu-điểm; đối chiếu ở §3.5 |
| `min-h-11` | 0 | 6 | 6 đích chạm đạt 44px trên trang |
| `w-9 h-9` cộng `w-11 h-11` | 1 và 0 | 0 và 1 | nút lưu 36px lên 44px — đích chạm nhỏ nhất của baseline |
| `aria-hidden` | 1 | 10 | 9 icon trang trí bị ẩn khỏi cây tiếp cận; xem `AC-17` |
| `hrp-card` cộng `hrp-panel` cộng `hrp-pill` cộng `hrp-field` cộng `hrp-btn-` | 0 mọi lớp | 1, 1, 3, 2, 6 | 13 lần dùng lớp mới trên trang |
| `cursor-pointer` | 1 | 2 | nút lưu được thêm; select giữ nguyên |
| `py-2.5` | 2 | 1 | select giữ `py-2.5` và **thêm** `min-h-11`; nút "Xem thêm việc làm" bỏ nó vì `.hrp-btn-ghost` tự cấp padding |
| `material-symbols-outlined` | 9 | 9 | **bất biến kế thừa** — `STEP-12` không cho phép đổi bộ icon |
| `type="checkbox"` | 0 | 0 | `DEC-18` — checkbox không tồn tại trên bề mặt này ở cả hai đầu |
| `outline-none` | 0 | 0 | không có ai xoá vòng focus trước, và round này cũng không thêm |
| `href={detailHref}` | 2 | 2 | `AC-24`, bất biến kế thừa |

Một dịch chuyển đáng ghi vì Tier 3 sẽ thấy nó trong diff: nút "Xem thêm việc làm" đi từ dòng className `:633` xuống `:619`. Nó là chỗ **duy nhất** trong round này mà một phần tử vừa đổi lớp vừa mất inline style cùng lúc:

```jsx
// TRƯỚC (:633-634)
className="px-5 py-2.5 rounded-lg font-semibold border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
style={{ borderColor: 'var(--color-outline-variant)', color: 'var(--color-primary)' }}
// SAU (:619) — không còn dòng style
className="hrp-btn-ghost hrp-focus px-5 min-h-11 rounded-lg font-semibold border"
```

#### `app/components/GlobalNavbar.tsx`

| Chuỗi đếm | TRƯỚC | SAU | Nó nói gì |
| --- | --- | --- | --- |
| `style={{` | 25 | 21 | 4 khối rút, đúng 4 phần tử trong phạm vi §4.2 |
| `currentTarget.style.backgroundColor` | 8 | 4 | 4 cặp `onMouseEnter`/`onMouseLeave` sơn hover bằng JavaScript bị thay bằng `:hover` thật của CSS |
| `transition-colors` | 6 | 4 | 4 còn lại thuộc mục điều hướng của người đã đăng nhập, ngoài phạm vi |
| `hrp-focus` | 0 | 4 | hai CTA công khai, mỗi cái khai hai lần cho desktop và mobile |
| `hrp-btn-` | 0 | 4 | cùng bốn phần tử đó |
| `min-h-11` | 0 | 4 | cùng bốn phần tử đó |
| `hrp-skip` | 0 | 1 | skip link mới, `:89` |
| `nav-item-lift` | 0 | 2 | xem đoạn ngay dưới đây |
| `max-w-7xl` cộng `max-w-[1600px]` | 1 và 0 | 0 và 1 | `RQ-20` — chiều rộng container navbar khớp trang, hết lệch mép |

**`nav-item-lift` là chỗ tôi TIÊU THỤ một tài sản kế thừa, không phải tạo ra nó.** Lớp này đã được `474f3dc` khai trong khối `prefers-reduced-motion` (`.nav-item-lift:hover { transform: none !important; }`, nay `:620-622`) nhưng baseline `c6256e7` **không có một phần tử nào mang lớp đó** — nó là một cái móc treo lơ lửng. Hai CTA mới của navbar dùng `.hrp-btn-primary`, và `.hrp-btn-primary:hover:not(:disabled)` `:316` có `transform: translateY(-1px)`; gắn thêm `nav-item-lift` cho chúng là cách để cú nhấc đó bị **huỷ đúng bằng cơ chế kế thừa** khi người dùng khai `prefers-reduced-motion: reduce`, thay vì tôi viết một khối media thứ hai làm cùng việc. `RISK-12` cấm kể khối kế thừa như thành quả — tôi không kể; điều mới ở đây là **hai người tiêu thụ**, và chúng nằm ở phía `.tsx`.

#### `app/globals.css`

| Chuỗi đếm | TRƯỚC | SAU | Nó nói gì |
| --- | --- | --- | --- |
| `:focus-visible` | 1 | 4 | 1 toàn cục kế thừa `:604` cộng 3 lần mới của `.hrp-focus` và `.hrp-field`; `AC-07` là phép đo BẢO TOÀN nên số 1 kia phải còn |
| `prefers-reduced-motion` | 1 | 1 | `AC-10` — đúng một khối, không nhân bản; guard cảm ứng của `RISK-05` là at-rule KHÁC (`hover: none`) |
| `hover: none` | 0 | 1 | guard cảm ứng mới `:441` |
| `!important` | 5 | 10 | **5 khai báo thật không đổi** (`:611-614` và `:621`, đều kế thừa); 5 lần mới ở `:212`, `:226`, `:246`, `:247`, `:301` đều là **lời văn trong comment** giải thích vì sao không cần `!important` |
| `@media` | 2 | 4 | 2 kế thừa cộng guard cảm ứng cộng một truy vấn của `.hrp-panel` |
| `--color-focus-ring` | 0 | 2 | token vòng focus mới, khai một lần dùng một lần |
| `--shadow-card-hover` | 0 | 2 | như trên |
| `--t-medium` | 0 | 7 | thời lượng vào 220ms, dùng ở 7 chỗ; xem kế toán §3.3 |
| `dark:` | 3 | 3 | ba lần này là **tên token** (`--color-primary-dark`, `--color-brand-dark`, `--primary-dark`), không phải utility dark mode |
| `.dark` (chuỗi cố định) | 0 | 0 | `AC-19` — bề mặt công khai không có nhánh dark mode ở cả hai đầu |

Dòng `!important` xứng đáng đọc kỹ vì nó là cái bẫy dễ nhất trong bảng này: `grep -c '!important'` trả về 10 và nếu dừng ở đó thì kết luận sẽ là "round này thêm 5 khai báo `!important`" — sai hoàn toàn. Phép đo phân biệt được là `grep -n '!important' app/globals.css` rồi đọc từng dòng: năm dòng đầu bắt đầu bằng văn xuôi tiếng Việt trong khối `/* */`, năm dòng sau kết thúc bằng dấu chấm phẩy. **Số khai báo `!important` thật do round này thêm là 0.**

### 3.7 `STEP-12` đo hai lần — cặp TRƯỚC/SAU, cộng bốn đường mà `grep` trên nguồn fail-OPEN

`STEP-12` chạy **trước khi sửa dòng đầu tiên** và chạy **lại sau khi xong**, đúng như lệnh yêu cầu. Bốn phép, tám con số:

| Phép đo | TRƯỚC (trước khi sửa) | SAU (lúc viết HANDOFF) | Kết luận |
| --- | --- | --- | --- |
| `git rev-parse HEAD` | `5c9b88fe2c142ad1666ba6a5af5edc0feac71ef7` | `5c9b88fe2c142ad1666ba6a5af5edc0feac71ef7` | không đổi — và đó chính là bằng chứng `R-01`: không có commit nào |
| `git diff --name-only c6256e7..HEAD` | 2 đường, cả hai dưới `docs/` — số đường NGOÀI `docs/` bằng `0` | 2 đường, số đường NGOÀI `docs/` bằng `0` | `DEC-20` giữ: mọi commit từ baseline tới HEAD là docs-only, nên số đo của contract còn hiệu lực |
| `grep -c -F 'href={detailHref}' app/(portal)/page.tsx` | `2` | `2` | `AC-24` — bất biến điều hướng card không bị round này chạm |
| `grep -n -F 'ApplyModal' app/(portal)/page.tsx` | import ở `:7` | import ở `:7` | `AC-25` — dòng import không dịch; điểm render dịch `:646` xuống `:631` do 15 dòng ròng bị rút phía trên |
| `git diff --numstat -- src/domains/job-board/public.service.ts` | rỗng (`wc -c` bằng `0`) | rỗng (`wc -c` bằng `0`) | `AC-26` — tầng dữ liệu không bị chạm một byte |

Hai đường của phép thứ hai, nguyên văn: `docs/PLANNER_HANDOVER.md` và `docs/tasks/hrp-v5-go-live-08-public-ui-premium/TASK.md`. Đường thứ hai là **chính contract này** — đó là lý do `DEC-20` thay phép so SHA bằng bất biến docs-only, vì commit mang contract lên cây làm cho mọi phép "HEAD phải bằng `c6256e7`" sai ngay khi vừa viết.

**`R-01` đo được, không phải lời hứa.** `git rev-parse HEAD` và `git rev-parse origin/main` cùng trả `5c9b88fe2c14…` — local **không** đi trước remote một commit nào, nên không có gì để push và cũng không có gì đã push. `git diff --cached --numstat` trả về 0 dòng: không có gì được stage.

**Cây làm việc bẩn của lane khác — tôi không chạm.** `git diff --numstat` toàn cây (không giới hạn path, theo đúng luật của lane) trả về 7 dòng: ba dòng của tôi (`38 53`, `14 16`, `263 0`), `public/index.html` `97 59` **đã bẩn từ lúc phiên bắt đầu** (nó có trong ảnh `git status` đầu phiên), và ba `AUDIT.md` của go-live-02, go-live-04, go-live-13 mang chữ ký `1 0` — thêm đúng một dòng trắng cuối tệp. Chữ ký `1 0` đó **không phải** chữ ký cắt-về-0-byte (`0 N`), tôi không tạo ra nó, và theo luật của lane thì **không được dọn** vì nó là dấu vết. Tôi ghi ra đây để Tier 3 không quy nó cho round này. Tổng số mục untracked là 56, phần lớn là `scratch/**` của các lane khác; đúng **hai** mục trong đó là của round này: `src/domains/job-board/public-ui-premium.static.test.ts` và chính tệp `HANDOFF.md` này (cả hai đều untracked vì `R-01` cấm commit — `git ls-files --error-unmatch` trên cả hai đều báo không biết đường dẫn).

**Một cảnh báo CSS trong `npm run build`, và nó KHÔNG phải của tôi.** Bản build in `Found 1 warning while optimizing generated CSS:` trỏ vào `@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined…")` với thông điệp `@import rules must precede all rules aside from @charset and @layer statements`. Phép quy trách nhiệm rẻ nhất và chạy lại được trong hai giây:

```
git show c6256e7:app/globals.css | grep -n '@import'   →  1:@import "tailwindcss";
                                                          2:@import url("https://fonts.googleapis.com/…Material+Symbols…");
grep -n '@import' app/globals.css                      →  1:@import "tailwindcss";
                                                          2:@import url("https://fonts.googleapis.com/…Material+Symbols…");
```

Hai dòng `@import` nằm ở **đúng dòng 1 và 2 ở cả hai đầu**, và 263 dòng của tôi bắt đầu ở `:203` — không có cách nào chúng thay đổi thứ gì đứng **trước** một `@import` ở dòng 2. Nguyên nhân thật là `@import "tailwindcss"` (Tailwind v4) nở ra thành quy tắc trước khi bộ tối ưu đọc tới dòng 2; đó là tính chất của baseline. Bằng chứng phụ: một lần build thứ hai với `app/globals.css` trả về bản `c6256e7` in **cùng một cảnh báo, ở cùng dòng 9 của log, cùng `Generating static pages (29/29)`** — khác duy nhất thời gian biên dịch (`4.1s` so với `3.6s`).

**Phát hiện có giá trị vượt ra ngoài round này: `grep` trên NGUỒN fail-OPEN theo bốn đường khác nhau, và tôi đã đi vào cả bốn.** Lane này có sẵn bài học "đo trên bản biên dịch, không phải nguồn"; round này cho thấy bài học đó có ít nhất bốn hình dạng cụ thể:

| Đường fail-OPEN | Số SAI tôi đã ghi | Số ĐÚNG | Phép sửa |
| --- | --- | --- | --- |
| Dấu `.` trong pattern là **ký tự đại diện**, không phải dấu chấm | `.dark` 8 lên 26 | `.dark` 0 lên 0 (thứ tăng là `-dark`, 9 lên 27) | `grep -c -F` (chuỗi cố định) |
| Chuỗi con nằm **bên trong** một token dài hơn | `offset` 4 lần "phân trang" | `0` | `grep -v -F 'outline-offset'` trước khi đếm; **ranh giới từ không cứu được** vì `-` là ký tự không-từ |
| Quét **tràn** qua vùng bảo vệ | 2 khai báo `transition:` "mới" | `0` | chặn trên bằng `.pub-header {` `:452`, quét đúng `[203, 451]` |
| Mã CSS **nằm trong comment** đọc y như mã thật | `!important` "thêm 5" | thêm `0` khai báo thật | đọc từng dòng `grep -n`, phân biệt dòng kết thúc bằng dấu chấm phẩy với dòng văn xuôi |

Câu hỏi sàng lọc mà tôi khuyến nghị Tier 3 dùng cho **mọi ô số** trong HANDOFF này: *"nếu thứ tôi đang đếm bị comment out, bị đổi tên thành một token dài hơn, hoặc nằm ngoài vùng đáng lẽ phải quét — thì con số này có đổi không?"* Ba trong bốn dòng bảng trên là do tôi tự bắt được khi hỏi đúng câu đó **sau khi** đã viết con số sai vào ô; cả bốn ô đã được sửa tại chỗ và giữ lại **cả hai** con số để phép đo tái lập được, chứ không xoá dấu vết.

### 3.8 Bản đồ hàng rào — 19 `describe`, 62 `it`, phủ 24 trên 26 `RQ`

Tệp: `src/domains/job-board/public-ui-premium.static.test.ts`, 777 dòng, **mới và chưa được track**. Lane chạy: `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-ui-premium.static.test.ts` — `Test Files 1 passed (1)`, `Tests 62 passed (62)`, `16ms`, **EXIT 0**. Không dùng `npx vitest run` trần: lane đó đọc `DATABASE_URL` từ `.env` là PRODUCTION và làm đỏ oan 24 test component.

| `describe` tại | Số `it` | RQ phủ | Nó khoá điều gì |
| --- | --- | --- | --- |
| `:102` | 3 | `RQ-01` | token mới có mặt **và** token cũ còn nguyên |
| `:136` | 5 | `RQ-02`, `RQ-03`, `RQ-04` | bóng bằng token, ba hiệu ứng hover của card |
| `:182` | 3 | `RQ-05`, `RQ-06` | phân hoá nền panel so với card bằng **giá trị token khác nhau** |
| `:209` | 4 | `RQ-07` | vòng focus phủ đủ control, và quy tắc toàn cục kế thừa còn sống |
| `:241` | 3 | `RQ-08` | `select` bộ lọc — `DEC-18`, không đi tìm checkbox |
| `:264` | 5 | `RQ-09` | bốn trạng thái nút: nghỉ, hover, active, disabled |
| `:337` | 3 | `RQ-11` | tầng dữ liệu công khai còn nguyên (`facets.areas`, `facets.shifts`) |
| `:438` | 4 | `RQ-13` | 30 cặp tương phản, tính bằng số ngay trong test |
| `:493` | 3 | — (tự bảo vệ) | **phép đo tự kiểm**: số `/*` bằng số `*/`, hai dải đã bóc comment không còn mảnh comment, dải mới chứa khai báo chứ không chứa văn xuôi tiêu đề |
| `:535` | 5 | `RQ-12`, `RQ-10`, `RQ-19` | băm nguyên văn vùng bảo vệ, tính liền mạch, và 0 `prefers-color-scheme` cộng 0 `.dark` |
| `:563` | 5 | `RQ-23` | trần chuyển động, danh sách thuộc tính được phép, tỉ lệ ra trên vào |
| `:617` | 4 | `RQ-17` | vùng chạm 44px |
| `:643` | 3 | `RQ-18` | skip link dùng `:focus` chứ không phải `:focus-visible` |
| `:667` | 1 | `RQ-20` | container trang và container navbar cho cùng mép trái |
| `:678` | 2 | `RQ-21` | icon ligature trang trí bị ẩn khỏi công nghệ trợ giúp |
| `:693` | 3 | `RQ-22` | ô từ khoá: nhãn thấy được, `type="search"`, thứ tự đầu tiên |
| `:715` | 3 | `RQ-24` | bất biến kế thừa của go-live-12: điều hướng card |
| `:748` | 1 | `RQ-25` | bất biến kế thừa: `ApplyModal` vẫn là component đã tách |
| `:756` | 2 | `RQ-26` | bất biến kế thừa của go-live-05: sự thật dữ liệu |

**Hai `RQ` không có test trong tệp, và đó là đúng chỗ của chúng.** `RQ-15` **là** việc chạy gates — một test khẳng định "gates đã xanh" chỉ khẳng định chính nó, nên bằng chứng của nó là bốn lần chạy thật ở ô `AC-15`. `RQ-16` là chất lượng của **tài liệu này**; nó không thể tự kiểm bằng một `it`, nên bằng chứng của nó là mọi ô số trong §3 cộng bảy tiểu mục bằng chứng. Hai điều đó không phải lỗ hổng phủ — chúng là hai `RQ` mà cơ chế đúng nằm ngoài vitest.

**Cụm `describe` ở `:493` là thứ tôi thêm SAU khi tự bắt được lỗi đo, không phải thứ contract đòi.** Nó tồn tại vì `RQ-13` và `RQ-23` đọc CSS bằng cách **bóc comment rồi mới đếm**, và toàn bộ giá trị của phép bóc đó phụ thuộc vào một giả định không ai kiểm: rằng comment trong tệp cân bằng. Nếu một ngày ai đó viết `/*` mà quên `*/` thì phép bóc sẽ ăn mất phần CSS thật phía sau, mọi assertion "không chứa X" sẽ **xanh vì rỗng** — fail-OPEN, đúng loại bẫy mà lane này đã ăn một lần với khối alias bị dán lệch vào giữa comment. Ba `it` ở `:493` khoá cả ba mặt: cân bằng dấu, dải sau khi bóc không còn mảnh comment, và dải mới thật sự chứa `.hrp-card {`.

## 4. Changed Deliverables

- **Source/artifact changed:** bốn tệp, không hơn. Ba tệp tracked cộng một tệp mới:

| Tệp | Trạng thái | numstat | Dòng | Bytes | `sha256` |
| --- | --- | --- | --- | --- | --- |
| `app/globals.css` | tracked, sửa | `263 0` (chỉ thêm) | 360 lên 623 | 29873 | `e6c0ef6c7d9e4cf4a93e58769927f4bf8acba24aa2a86682280ef2b525623b07` |
| `app/(portal)/page.tsx` | tracked, sửa | `38 53` | 659 xuống 644 | 28513 | `29f0348cba31c87e013619d73470d8f89e0f1e41096b9827414774c3031c8d68` |
| `app/components/GlobalNavbar.tsx` | tracked, sửa | `14 16` | 312 xuống 310 | 12672 | `8b7186c4fc2def416d583cbbb18adbf8a931b881005c2b3ddc0bd16fcf01ea36` |
| `src/domains/job-board/public-ui-premium.static.test.ts` | **mới, untracked** | — | 777 | 42707 | `7639a0aebe06b4fb09ba0d92bd4097bab4ad6b8033ceacc9c07b6519130b547d` |

  `app/globals.css` là `263 0` — **thuần thêm**, không một dòng nào của baseline bị xoá hay sửa. Đó là dạng diff mạnh nhất cho `RQ-12` và `DEC-19`: vùng bảo vệ không thể bị chạm bởi một diff chỉ có dấu cộng, và băm nguyên văn ở `AC-12` xác nhận độc lập.

- **Dependency:** None. `git diff --numstat -- package.json package-lock.json` trả về 0 dòng. Không có thư viện nào được thêm; toàn bộ round này là CSS thuần cộng lớp trong `className` — không dùng CSS-in-JS, không dùng thư viện animation.
- **Schema/migration:** None. `git diff --numstat -- prisma/` và `git status --porcelain -- prisma/` đều 0 dòng. Round này không chạm DB, không có SQL nào cần Owner dán, không có bước OP nào cho DB.
- **Environment/config:** None. `vitest.unit.config.ts`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` đều 0 dòng thay đổi. Tệp test mới nằm dưới `src/domains/**` nên lane `test:unit` bắt nó **mà không cần đăng ký** — và điều đó được đo bằng phép **giữ-lại (hold-out)** chứ không suy ra bằng phép trừ: đổi tên tệp mới ra ngoài cây rồi chạy lại `npm run test:unit` cho `Test Files 100 passed (100)`, `Tests 1505 passed (1505)`, `20.37s`, EXIT 0; trả tệp về chỗ rồi chạy lại cho `101 passed (101)`, `1567 passed (1567)`, `20.54s`, EXIT 0. Đúng cộng 1 tệp, cộng 62 test, và `sha256` của tệp sau khi trả về vẫn là `7639a0ae…` — phép đo không để lại dấu. Đây là lý do không cần chạm `vitest.unit.config.ts`; bẫy "test untracked không được lane bắt" của lane này không áp cho vị trí tệp.
- **Git diff/commit:** **Not created.** `R-01` cấm commit và cấm push, và điều đó đo được: `git rev-parse HEAD` bằng `git rev-parse origin/main` bằng `5c9b88fe2c142ad1666ba6a5af5edc0feac71ef7`, `git diff --cached --numstat` rỗng. Toàn bộ công việc nằm trong cây làm việc, chờ Tier 3 và chờ quyết định của Tier 1.
- **Tệp KHÔNG được chạm dù nằm gần:** `src/domains/job-board/public.service.ts` (`AC-26`, numstat rỗng), `app/api/jobs/route.ts`, `src/domains/job-board/components/apply-modal.tsx` (`AC-25`, chỉ được tham chiếu qua dòng import `:7` không đổi), và vùng CSS `:452` tới `:609` của `app/globals.css` (`AC-12`, băm khớp).

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
| --- | --- | --- | --- | --- |
| `DEV-01` | Deviation | `grep -c -F 'type="checkbox"'` trả `0` ở **cả** `c6256e7` và cây hiện tại. Bề mặt này không còn checkbox kể từ go-live-05 | `RQ-08` được thoả trên phần tử `select` `:270` cùng `:274` — đúng bản repoint `DEC-18` mà Tier 1 đã viết, không phải tôi tự đổi đích | Không cần quyết định mới; chỉ cần xác nhận rằng `DEC-18` là bản đang có hiệu lực khi Tier 3 đọc `AC-08` |
| `DEV-02` | Deviation | `grep -c -F 'prefers-reduced-motion'` bằng `1` ở cả hai đầu; khối nằm `:609-623`, trong vùng băm `AC-12` khớp `sha256 ee75a964…` | `STEP-07` **không** thêm khối thứ hai. `AC-10` là phép đo **bảo toàn**: đường PASS là "vẫn còn đúng 1 và nội dung không đổi", không phải "trước bằng 0" | Không cần quyết định; lệnh giao việc đã chốt cách đọc này (`DEC-19`, `RISK-12`) |
| `DEV-03` | Deviation | `--color-primary` đo `2.997` nền body, `2.843` nền panel, `2.848` nền primary-soft — cả ba **dưới** 3:1. Ba số bị khoá bằng assertion `:87-89` của khối `RQ-13` | Stop condition của `STEP-07` buộc chọn token khác, nên **8 khai báo** (7 viền cộng vòng focus qua `--color-focus-ring`) dùng `--color-primary-dark` `#a63b00`, thấp nhất `5.013` trên sáu bề mặt. Sắc cam thương hiệu **không** mất: vẫn ở nền nút chính và bóng hover `rgba(242,101,34,0.14)` | Xác nhận rằng viền cùng vòng focus của bề mặt công khai dùng `--color-primary-dark`. Nếu Tier 1 muốn viền đúng `#f26522` thì phải **đổi giá trị token** — nằm ngoài scope §4.2 và sẽ làm đỏ ba assertion trên |
| `DEV-04` | Deviation | `npm run diff-check` không tồn tại trong `package.json` của repo này | `RQ-15` đòi "diff-check exit 0"; tôi đo bằng `git status --porcelain` cộng `git diff --numstat` **toàn cây** (không giới hạn path) theo đúng tiền lệ go-live-05 §6 `#18`, cộng `git diff --cached --numstat` rỗng | Xác nhận cách đo thay thế, hoặc đặt tên script thật cho các round sau |
| `DEV-05` | Deviation | `nav-item-lift` trong `GlobalNavbar.tsx`: `0` lên `2` (`:206`, `:297`). Quy tắc tiêu thụ nó là `.nav-item-lift:hover { transform: none !important; }` `:620-622`, **kế thừa** từ `474f3dc`, và baseline có **0** phần tử mang lớp này | Hai CTA mới dùng `.hrp-btn-primary` có `transform: translateY(-1px)`; gắn `nav-item-lift` khiến cú nhấc bị huỷ bằng **cơ chế kế thừa** dưới `prefers-reduced-motion` thay vì tôi viết khối media thứ hai — giữ `AC-10` ở đúng con số `1`. `RISK-12` không bị vi phạm: tôi không kể khối đó là thành quả, chỉ kể hai người tiêu thụ | Xác nhận rằng tiêu thụ móc kế thừa là lựa chọn được ưu tiên hơn việc thêm khối `@media` mới |
| `LIM-01` | Limitation | Hai cặp **kế thừa** dưới ngưỡng chữ 4.5:1 — `--color-on-primary` trên `--color-primary` bằng `3.153` (nút chính lúc nghỉ) và `--color-success` trên `--color-success-soft` bằng `4.435` (nút Ứng tuyển đã nộp). Baseline `c6256e7` đã sơn đúng hai cặp này bằng inline style; bốn assertion khoá **mã màu chính xác** `#f26522`, `#ffffff`, `#16803a`, `#e7f4ec` cộng hai đầu chặn mỗi cặp | Sửa được thì phải đổi **giá trị token** hoặc sơn lại CTA thương hiệu — cả hai ngoài scope §4.2. Không sửa thì hai cặp này vẫn dưới AA cho chữ, nhưng **không** tệ hơn baseline và **không thể trôi** thêm mà không làm đỏ test | Quyết định của Tier 1: (a) chấp nhận như nợ kế thừa có khoá, hoặc (b) mở task riêng đổi `--color-primary` cho đủ 4.5:1 với chữ trắng — việc đó chạm toàn bộ hệ token, không riêng bề mặt công khai |
| `LIM-02` | Limitation | `hrp-focus` phủ `4` trên `13` phần tử tương tác của navbar; 8 trên 8 phần tử nhận-tiêu-điểm của trang công khai | Chín phần tử navbar còn lại là điều hướng của người **đã đăng nhập**, ngoài scope §4.2, và **không** mất vòng focus: quy tắc toàn cục `:604` vẫn áp với `outline: 2px solid var(--color-primary)` (`3.153` trên trắng, đạt ngưỡng 3:1 cho thành phần giao diện) | Không cần quyết định cho round này; nếu Tier 1 muốn nâng cả 13 thì đó là mở rộng scope sang bề mặt sau đăng nhập |
| `LIM-03` | Limitation | Bằng chứng mức bundle ở §3.4 đọc từ `.next/static/css/50da1484518ddb02.css` do `npm run build` **cục bộ** sinh ra | Nó chứng minh 23 quy tắc **tồn tại sau khi minify** (bài học "đo trên bản biên dịch" của lane), nhưng **không** chứng minh production đang phục vụ chúng — round này không có quyền deploy (`R-01`) | Không cần quyết định; phép đo trên production chỉ thực hiện được sau khi Tier 1 quyết định push |
| `BLK-01` | Blocker (`ENV_BLOCKED`) | Repo có `0` file `*.test.tsx` và `0` match `playwright`, `puppeteer`, `cypress`, `jsdom`. Không có runner trình duyệt nào để lấy `getComputedStyle`, ảnh chụp, hộp giới hạn, hoặc quan sát tab và click thật | Nửa **trực quan** của các AC hover/focus/48px/1024 cùng 1440 không đo được ở lane này. Nửa **cấu trúc** của cùng những AC đó đã đo bằng số trên nguồn **và** trên bundle đã minify, cộng chín phép đếm cơ chế thu gọn bằng `0` cho `AC-22` | **Cách ghi vào `AUDIT.md`**: ô **Verdict** phải là `BLOCKED`; chuỗi `ENV_BLOCKED` chỉ được nằm trong ô evidence, vì `verify-audit.ps1:97` chỉ nhận `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, `N/A` (`DEC-17` của go-live-05). Tier 1 quyết: (a) waiver bốn trường cho phần trình duyệt và đẩy thành bước OP của Owner, hoặc (b) uỷ quyền thêm runner trình duyệt — việc đó là task hạ tầng riêng, không phải một hunk của round này |

**Không có deviation nào chạm dữ liệu, schema, quyền, hay bề mặt API.** Đây là round trình bày: `git diff --numstat` cho `src/domains/job-board/public.service.ts`, `prisma/`, `package.json` đều rỗng, và `AC-24` cùng `AC-25` cùng `AC-26` chứng minh ba bất biến kế thừa của go-live-12, go-live-05 và tầng dữ liệu không dịch một byte.

## 6. Evidence Index

Đây là danh sách **chạy lại được**, không phải danh sách tệp log. Mọi hàng là một lệnh Tier 3 dán được vào cây này và phải cho lại đúng con số ở cột kết quả. Bản lưu log lúc chạy nằm dưới `/tmp/gl08/**` (trên Windows là `%TEMP%\gl08`); chúng là thứ **phù du**, có thể đã bị dọn khi Tier 3 đọc file này, nên **lệnh** mới là bằng chứng bền, không phải đường dẫn log. Không hàng nào dưới đây cần tới một artifact tạm để tái lập.

| Evidence | Lệnh chạy lại được | Kết quả đã ghi | Chứng minh |
| --- | --- | --- | --- |
| `E-01` | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-08-public-ui-premium\TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` EXIT `0` | dòng mở bắt buộc của §3 |
| `E-02` | `git rev-parse HEAD` và `git rev-parse origin/main` | cả hai đều `5c9b88fe2c142ad1666ba6a5af5edc0feac71ef7` | `R-01` — không commit, không push, và không có commit lạ giữa hai đầu |
| `E-03` | `git diff --name-only c6256e7..HEAD` rồi đếm phần không mở đầu bằng `docs/` | 2 đường, cả hai dưới `docs/`; số đường ngoài `docs/` bằng `0` | `DEC-20`, `STEP-12` — số đo baseline của contract còn hiệu lực |
| `E-04` | `git diff --numstat` **không giới hạn path** | 7 dòng: `38 53` page.tsx, `14 16` GlobalNavbar.tsx, `263 0` globals.css, ba `AUDIT.md` mang `1 0`, `97 59` public/index.html | `AC-15` diff-check, `DEV-04` — bốn dòng cuối là cây bẩn kế thừa, round này không chạm |
| `E-05` | `git diff --cached --numstat` | rỗng, EXIT `0` | không một byte nào được stage |
| `E-06` | `npm run typecheck` | `> tsc --noEmit`, không dòng lỗi nào, EXIT `0` | `AC-15` |
| `E-07` | `npm run lint` | `✖ 494 problems (0 errors, 494 warnings)`, EXIT `0` | `AC-15` — `0` error, và số cảnh báo bằng đúng baseline |
| `E-08` | `npm run test:unit` | `Test Files 101 passed (101)`, `Tests 1567 passed (1567)`, `Duration 20.54s`, EXIT `0` | `AC-14`, `AC-15` |
| `E-09` | đổi tên tệp test ra ngoài cây, chạy lại `E-08`, rồi trả tệp về | `Test Files 100 passed (100)`, `Tests 1505 passed (1505)`, `20.37s`, EXIT `0`; `sha256` sau khi trả về vẫn `7639a0ae…` | lane tự bắt tệp mới: đúng `+1` tệp và `+62` test, không cần chạm config nào |
| `E-10` | `npm run build` | `✓ Compiled successfully in 3.6s`, `✓ Generating static pages (29/29)`, EXIT `0`, kèm **một** cảnh báo CSS đã quy về baseline ở §3.7 | `AC-15`, và là điều kiện sinh bundle cho `E-16` |
| `E-11` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-ui-premium.static.test.ts` | `Tests 62 passed (62)`, `16ms`, EXIT `0` | `AC-14`, bản đồ §3.8 |
| `E-12` | phép thử RED 1 (§3.2): đổi `--color-primary-dark` thành `--color-primary` ở `app/globals.css:275`, chạy `E-11`, trả về | **`2 failed`** cộng `60 passed (62)`, EXIT `1`; `sha256` `e6c0ef6c…` sang `e956ba68…` rồi về `e6c0ef6c…`, numstat trở lại `263 0` | hàng rào tương phản CẮN thật |
| `E-13` | phép thử RED 2 (§3.2): đổi `options={facets.areas}` thành hằng tĩnh ở `app/(portal)/page.tsx`, chạy `E-11`, trả về | **`2 failed`** cộng `60 passed (62)`, EXIT `1`; `sha256` `29f0348c…` sang `efc93b23…` rồi về `29f0348c…`, numstat trở lại `38 53` | bất biến dữ liệu thật của go-live-05 được canh thật |
| `E-14` | script tính lại `luminance`, `hexOf`, `ratio` đọc trực tiếp token trong `app/globals.css` | 30 dòng §3.1: 10 cặp chữ, nhỏ nhất `5.013`; 15 mép giao diện, nhỏ nhất `3.153`; 2 cặp kế thừa `3.153` và `4.435`; ba số loại `--color-primary` là `2.997`, `2.843`, `2.848` | `AC-13`, `DEV-03`, `LIM-01` |
| `E-15` | băm vùng bảo vệ trên cây hiện tại **và** trên `git show c6256e7:app/globals.css` | cùng một `sha256 b000fb06…` (biên gồm newline cuối, `9262` ký tự bằng `9324` byte); biên không gồm newline cuối cho `ee75a964…`; số lần vùng này xuất hiện bằng `1` | `AC-12`, `RQ-12`, `DEC-19` — byte-identical với baseline |
| `E-16` | `ls -l .next/static/css/*.css` rồi đếm các quy tắc `.hrp-` trong bundle lớn | `50da1484518ddb02.css` `93870` byte mang đủ 23 quy tắc cộng guard cảm ứng cộng hai tài sản `DEC-19`; `2fd9a055e5480bd0.css` `4295` byte có `0` hit `.hrp-` | §3.4 — quy tắc SỐNG sau minify, không phải chữ nằm trong comment |
| `E-17` | `sha256sum` bốn deliverable của §4 | `e6c0ef6c…`, `29f0348c…`, `8b7186c4…`, `7639a0ae…` | §4, và mốc để phát hiện mọi thay đổi xảy ra sau khi nộp |
| `E-18` | `python scratch/md-table-check.py docs/tasks/hrp-v5-go-live-08-public-ui-premium/HANDOFF.md` | `MALFORMED ROWS: 0`, `AC rows=26 max=26 gaps=none`, `STEP rows=11 max=11 gaps=none` | `AC-16` — không ô nào lệch cột, không mã AC nào thiếu |
| `E-19` | quét TRƯỚC/SAU: đếm cùng một chuỗi cố định trên `git show c6256e7:<đường>` rồi trên bản hiện tại, luôn dùng `grep -F` | toàn bộ ba bảng §3.6, khớp số học `659+38-53=644`, `312+14-16=310`, `360+263=623` | `AC-17` tới `AC-21`, `AC-23`, `AC-26`, `RQ-09` |
| `E-20` | đếm dòng `@import` trên `git show c6256e7:app/globals.css` rồi trên bản hiện tại | `:1` và `:2` ở **cả hai** đầu, không thêm không bớt | quy cảnh báo CSS của `E-10` về baseline chứ không về round này |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
| --- | --- | --- | --- |
| `1` | `v1.3` | `READY_FOR_AUDIT` | `STEP-01` tới `STEP-12` xong trong một lượt. Ba tệp nguồn đổi (`263 0` cho `app/globals.css`, `38 53` cho `app/(portal)/page.tsx`, `14 16` cho `app/components/GlobalNavbar.tsx`) cộng một tệp hàng rào mới `777` dòng với `62` test. `AC-01` tới `AC-21` cùng `AC-23` tới `AC-26` PASS bằng số; chỉ `AC-22` là `BLOCKED` vì hai nửa cần trình duyệt (xem `BLK-01`, và `DEC-17` cho ô verdict của AUDIT). `STEP-12` đo lại đủ bốn bất biến kế thừa, trước và sau đều khớp. Không commit, không push. |

**Điều Tier 3 nên nhắm trước.** Ba chỗ mỏng nhất của round này, xếp theo mức đáng nghi:

1. **`AC-22`** là chỗ duy nhất tôi không đóng được bằng số chạy được — chín phép đếm cơ chế thu gọn đều `0` là bằng chứng *cấu trúc*, không phải bằng chứng *hành vi*. Nếu Tier 3 có cách mở được trình duyệt trong môi trường này thì kết luận của tôi phải bị thay bằng phép đo thật, không phải được xác nhận lại bằng lời văn.
2. **`AC-12`** phụ thuộc vào việc vùng bảo vệ được cắt đúng biên. `E-15` cho ba băm và một phép đếm để Tier 3 cắt lại độc lập; cắt lệch một newline sẽ ra `ee75a964…` chứ không phải `b000fb06…`, và đó là dấu hiệu cắt lệch, không phải dấu hiệu tôi sửa vùng chết.
3. **§3.7 liệt kê bốn cách `grep` trên NGUỒN cho số fail-OPEN** — regex `.dark`, chuỗi `offset` nằm trong `outline-offset-2`, phạm vi `awk` chạm vùng chết, và CSS nằm trong comment tiếng Việt. Mỗi cách kèm số sai và số đúng. Nếu Tier 3 tự đếm mà lệch so với §3.6, hãy đối chiếu với bảng đó **trước khi** ghi finding: rất có thể hai bên đang đếm hai thứ khác nhau.

> Handoff status: `READY_FOR_AUDIT`
