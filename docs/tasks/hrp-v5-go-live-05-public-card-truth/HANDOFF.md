# HANDOFF: hrp-v5-go-live-05-public-card-truth

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-05-public-card-truth` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `2` |
| Current audit round | `0` |
| Executor | Tier 2 — Engineer |
| Baseline | `fb993a7`. Cây làm việc **đã bẩn sẵn** lúc bắt đầu vì các lane khác: `docs/tasks/…-02/AUDIT.md`, `…-04/AUDIT.md`, `…-13/AUDIT.md`, `public/index.html`, `vitest.unit.config.ts` (` M`), cùng nhiều `scratch/**`, `.claude/`, `.neon`, `fix.patch`, `patch_test*.ps1`, `temp.diff`, `rls-probe-*.txt` untracked. Không stage, không reset, không commit thứ nào trong đó |
| Status | `READY_FOR_AUDIT` |
| Started/updated | Round 1 bắt đầu khi contract còn `v1.0`; Tier 1 bump `v1.1` giữa lượt và §2.1 đã được đọc lại **trước khi** viết HANDOFF này. Round 2 chạy trên `v1.2` §11, phạm vi `STEP-11`..`STEP-16`. Cập nhật round 1 `2026-09-01 04:11 +07`, round 2 `2026-09-01 13:45 +07` |

## 1. Outcome Summary

`STEP-01`..`STEP-10` DONE. **Không commit, không push** (`R-01`). Không deploy, không launch drill.

Đã làm:

- `src/domains/job-board/public.service.ts` — projection card tính lại trên **toàn bộ** slot còn hiệu lực: ba mảng summary `positionTitles`/`locations`/`shifts` (unique, bỏ rỗng, sort ổn định), và ba field đơn cũ trở thành **phần tử đầu của chính ba mảng đó** thay vì chữ của `slots[0]` theo thứ tự DB. Thêm `facets` derive trên toàn tập hợp lệ **trước** filter người dùng (`DEC-08`); `total`/page slice/`nextOffset` đọc cùng một mảng sau lifecycle + filter (`DEC-06`, `:475-477`); một `now` duy nhất cho cả request (`:433`, §4.3).
- `app/(portal)/page.tsx` — bốn bộ lọc thật (`q`/`area`/`industry`/`shift`) đi vào `URLSearchParams` (`:114-119`), nút Tìm kiếm refetch thật, `nextOffset` thật cho Tải thêm kèm dedupe theo `job.id` (`:364`), `AbortController` + generation guard (`:349`/`:362`), refetch lỗi **không** còn thay danh sách đang xem bằng skeleton (`:437`, `:610`), nút Thử lại lặp lại đúng lần gọi vừa thất bại (`:557`). Card đọc summary thật, nhãn recruiter thay tên công ty bịa (`:93`), hai nhóm checkbox không có backing canonical bị loại.
  **↳ Cập nhật round 2 (`STEP-11`):** nay là **ba** bộ lọc, không phải bốn — dropdown ngành nghề cùng state, entry `EMPTY_FILTERS` và `params.set` của nó đã bị loại theo `DEC-13`. Bộ lọc còn lại: `q`, `area`, `shift`. Đo ở §8.4.
- Bốn lane test: `public-card-truth.test.ts` (mới — 6 `describe` / 23 `it`), `public-card-truth.integration.test.ts` (mới — 10 `it` LIVE), `marketplace-inventory.static.test.ts` (thêm invariant chống dữ liệu bịa + phân trang), `marketplace-browse.routes.test.ts` (fixture additive `facets`, bỏ `xoay_ca` khỏi từ vựng).
- `app/api/jobs/route.ts`: **0 dòng đổi**, byte-identical với baseline (`md5 21a806650d57daa15f0139ea8c934328` cả hai phía) — biên GO-LIVE-04 và thứ tự limiter nguyên vẹn.
  **↳ Cập nhật round 2 (`STEP-13`):** câu trên đúng cho round 1 và **không còn đúng sau round 2** — route mất một tham số nên numstat thành `0 / 1` và md5 đổi. Theo cảnh báo 1 của §11 đó **không** phải hồi quy `AC-09`; số trước/sau ở §8.3.

Chưa hoàn thành / không làm:

- `AC-12` = **`ENV_BLOCKED`**. Lane LIVE không chạy được vì `DATABASE_URL_TEST` không có trong môi trường này. Đúng `RQ-13`: không fallback `hrp-live`, không mock-pass, không đổi `ENV_BLOCKED` thành PASS. File test đã viết đủ và đã đăng ký lane; Tier 3 chạy được ngay khi có credential `hrp_mp2_test`. Chi tiết ở `BLK-01`.
- Quick Apply phone-only: **không làm** (`DEC-11`, non-goal của task này). Xem `LIM-01`.
- Ngân sách facet scan: đã **đo** thành số và đề nghị chuyển OPS-07 (`DEC-12`/`RISK-03`). Xem `LIM-02`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-10/13` | `verify-task.ps1`; RED probe trên blob `fb993a7` | `DONE` | Baseline do Tier 1 khoá ở `v1.1`; Tier 2 không ghi `TASK.md`. RED probe cho thấy **một phần** trạng thái "trước" đã đạt sẵn — liệt kê ở §3.1 thay vì tính thành việc đã làm (`AC-16`) |
| `STEP-02` | `RQ-02..05` | `public.service.ts`: `summarize`, `compareLabel`, `sortSlots`, `summarizeSlots`, `classifyOneShift`, `keywordHaystack` (`:408`), `areaHaystack` (`:420`), `PublicJobFacets` (`:48`) | `DONE` | Tên mảng vị trí là `positionTitles`, không phải `positions` — `DEV-01` |
| `STEP-03` | `RQ-01/03/10` | `PublicJobDto` (`:12-38`, đúng 15 khóa allow-list), `publicSelect` | `DONE` | None |
| `STEP-04` | `RQ-06/07` | `page.tsx:112-120` `buildQuery`, `:485/494/503` `options={facets.*}`; `app/api/jobs/route.ts` **không đổi một dòng** | `DONE` | None. Route đã parse đủ tham số từ baseline (`EV-05`) nên không cần sửa — cũng chính là bằng chứng `RISK-05` |
| `STEP-05` | `RQ-08/09` | `page.tsx:107` `dedupeById`, `:344-386` `runQuery` + generation/abort, `:437-438` `showSkeleton`/`showEmptyState`, `:557` retry | `DONE` | None |
| `STEP-06` | `RQ-11` | `page.tsx:7-8` import `ApplyModal`/`SuccessModal`, `:658`/`:667` render; payload apply không nằm trong diff | `DONE` | None |
| `STEP-07` | `RQ-12/17` | `public-card-truth.test.ts` (mới), `marketplace-inventory.static.test.ts`, `marketplace-browse.routes.test.ts` | `DONE` | None |
| `STEP-08` | `RQ-13` | `public-card-truth.integration.test.ts` (mới) + `vitest.integration-files.ts` | `DONE` (mã) / lane `ENV_BLOCKED` | Phải thêm cờ vào **hai** file vitest config ngoài danh sách §4.2 — `DEV-02` |
| `STEP-09` | `RQ-13` | Toàn repo: gate `AC-13` + grep `AC-15`/`AC-17` | `DONE` | None |
| `STEP-10` | `RQ-14` | file này | `DONE` | None |

## 3. Acceptance Evidence

**Mọi lệnh dưới đây là lệnh chính xác đã chạy** — Tier 3 chạy lại được từng dòng. Shell: Git Bash trên Windows 11 tại `cd /c/CodeApp/HrP`, trừ `verify-task.ps1` chạy qua `powershell -NoProfile`.

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — (C-09) | `powershell -NoProfile -Command "& .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-05-public-card-truth/TASK.md; exit $LASTEXITCODE"` | `EXIT=0` | `RESULT: PASS. TASK contract is ready for execution.` | None |
| `AC-01` | `node scratch/gl05-stripped-grep.mjs` — quét 13 mẫu cấm (`availableSlots \* 1.5`, `7 - 12`, `Triệu`, `hourlyRateVnd`, `/salary/i`, `clientCompanyId`, `internalNotes`, `budgetVnd`, `marginPercent`, `HRP Partners`, `Miền Bắc Việt Nam`, `Toàn thời gian`, `xoay_ca`) trên `page.tsx` + `public.service.ts` + `app/api/jobs/route.ts` **sau khi bóc comment**; `sed -n '12,38p' src/domains/job-board/public.service.ts \| grep -cE "^  [a-zA-Z]"` | `EXIT=0`, `TOTAL HITS (mã sau khi bóc comment) = 0`; key count `15` | Grep thô trên nguồn có **1** hit duy nhất: `public.service.ts:6`, là doc-comment liệt kê chính các khóa bị cấm ⇒ đo trên mã đã bóc comment mới đúng (bài học "đo trên bản biên dịch, không phải nguồn"). `PublicJobDto` `:12-38` đúng 15 khóa: `id slug title position shift location industry shiftType jobType availableSlots deadline statusLabel positionTitles locations shifts` — không có `hourlyRateVnd` | Phần "xóa phép tính lương bịa" **ĐÃ ĐẠT SẴN** tại baseline — §3.1 |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts src/domains/applications/marketplace-browse.routes.test.ts src/domains/applications/marketplace-inventory.static.test.ts` | `EXIT=0`, `Test Files 3 passed (3)`, `Tests 60 passed (60)` | Khối `AC-02/RQ-04` (`public-card-truth.test.ts:96`) đo input/output exact: nhiều slot ⇒ ba mảng unique + sort ổn định; slot `validTo` quá hạn không lọt summary và không cộng chỗ trống; slot đã đủ chỉ tiêu không lọt; đơn `CLOSED`/quá deadline bị loại khỏi mọi phép tính; mọi slot chết ⇒ việc bị loại hẳn khỏi card | Fixture dùng mock `findMany` — hành vi engine/DB thật do `AC-12` gánh (`BLK-01`) |
| `AC-03` | lệnh `AC-02` + `grep -nE "recruiter" 'app/(portal)/page.tsx'` | `EXIT=0` | `page.tsx:93` `recruiter: 'Tuyển dụng qua HRPartner'`, `:46` khai field, `'HRP Partners'` = 0 hit (baseline có ở `:79`). `it('không có field thương mại/nội bộ nào, kể cả khi dòng thô mang chúng')` bơm `clientCompanyId`/`hourlyRateVnd`/`internalNotes`/`budgetVnd` vào dòng thô rồi khẳng định DTO vẫn đúng 15 khóa và `JSON.stringify` không throw (`RISK-07`) | None |
| `AC-04` | lệnh `AC-02` (khối `AC-04/RQ-05` tại `:296`) | `EXIT=0` | Trang đầu ⇒ `nextOffset` trỏ dòng kế; trang cuối vừa khít ⇒ `null`; offset vượt tập ⇒ trang rỗng nhưng `total` vẫn thật và `nextOffset` `null`; `total` đếm **sau** filter; `limit` kẹp `[1,50]` (`:429`), `offset` âm về 0 (`:428`). Mã: `:475-477` — `page`, `nextOffset`, `total` đều đọc cùng mảng `jobs` | None |
| `AC-05` | lệnh `AC-02` (khối `AC-05/RQ-06` tại `:351`) + ``grep -nE "params\.set\(\|new URLSearchParams\|fetch\(`/api/jobs" 'app/(portal)/page.tsx'`` | `EXIT=0` | URL captured: `:114` `new URLSearchParams({limit, offset})`, `:116-119` `params.set('q'\|'area'\|'industry'\|'shift', …)`, `:355` ``fetch(`/api/jobs?${buildQuery(filters, offset)}`, {cache:'no-store', signal})``. Service: `q` bỏ dấu khớp tên dự án **và** tên vị trí của slot còn hiệu lực; `q` **không** khớp `order.description`; `area` khớp `siteAddress` hoặc `workLocation` và slot hết hạn không mở đường khớp; `shift` khớp trên **cả** mảng `shifts`, không chỉ nhãn đứng đầu | Repo có **0** file `*.test.tsx` và zero match playwright/puppeteer/cypress/jsdom ⇒ "submit refetch" đo bằng cấu trúc mã + route test, không bằng cú bấm |
| `AC-06` | lệnh `AC-02` + `git show 'fb993a7:app/(portal)/page.tsx' \| grep -n "Toàn thời gian\|type=\"checkbox\"\|params.append('shiftType'\|params.append('jobType'\|xoay_ca\|const LOCATIONS\|const INDUSTRIES\|const WORK_TYPES\|const JOB_TYPES"` rồi lặp lại trên file hiện tại | `EXIT=0`; baseline 9 hit, hiện tại **0 hit** | Before: `:92` `const LOCATIONS`, `:93` `const INDUSTRIES`, `:94` `const WORK_TYPES`, `:97` `{id:'xoay_ca'}`, `:99` `const JOB_TYPES`, `:100` `{id:'toan_thoi_gian', label:'Toàn thời gian'}`, `:261-262` `params.append('shiftType'…)`/`('jobType'…)`, `:431`/`:455` `type="checkbox"`. After: cả 9 mẫu = 0 hit; ba dropdown còn lại lấy `options={facets.areas\|industries\|shifts}` (`:485/494/503`). Static test khóa lại: `not.toMatch(/params\.append\('(?:shiftType\|jobType)'/)`, `not.toContain('xoay_ca')`, `not.toMatch(/type="checkbox"/)`, `not.toMatch(/const\s+(?:LOCATIONS\|INDUSTRIES\|WORK_TYPES\|JOB_TYPES)\s*=/)`. Service: `shiftType` chỉ còn `'ca_ngay'\|'ca_dem'\|null` | Việc xóa nhãn `'Toàn thời gian'` là hệ quả của `RQ-07`/`DEC-07`/`DEC-08` và **không** được tính là sửa `EV-02` — `DEV-03` |
| `AC-07` | lệnh `AC-02` + static test ``phân trang của trang việc làm đọc `nextOffset` thật, không có spinner hẹn giờ`` | `EXIT=0` | `:364` `setJobs((prev) => (mode === 'append' ? dedupeById([...prev, ...incoming]) : incoming))`; `:367` `setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : null)`; `:388` chặn khi `nextOffset === null \|\| loadingMore \|\| loading`; `:398` `IntersectionObserver` phát đúng một request thật; `:637` nhánh kết thúc đọc `nextOffset === null`. Static test khóa `not.toMatch(/setTimeout\(\(\)\s*=>\s*setLoadingMore/)` — baseline `:294` có đúng dòng `setTimeout(() => setLoadingMore(false), 800)` | Không có lane DOM ⇒ request sequence đo bằng cấu trúc + ma trận unit của service |
| `AC-08` | `sed -n '344,386p' 'app/(portal)/page.tsx'`; `git show 'fb993a7:app/(portal)/page.tsx' \| sed -n '248,300p'`; `sed -n '430,445p;565,615p' 'app/(portal)/page.tsx'` | đọc mã + so diff | `:358-359` giữ nguyên cặp thông điệp 429/503; `:362` bỏ qua response cũ; `:372` bỏ qua abort/stale trong `catch`; `:374` chỉ `setFetchError`, **không** `setJobs` ⇒ dữ liệu đang xem còn nguyên; `:437` `showSkeleton = loading && jobs.length === 0 && !fetchError` + `:610` grid render khi `jobs.length > 0` — baseline render skeleton cho **mọi** lần `loading` và chỉ render grid khi `!loading`, nên refetch xóa sạch danh sách đang xem; `:557` Thử lại đọc `lastAttemptRef.current` `{filters, offset, mode}` (đúng lần gọi vừa thất bại, kể cả load-more) thay vì gọi lại filter state đang gõ với offset 0 | Đo bằng đọc mã + so blob baseline; không có lane DOM. Cặp thông điệp 429/503 **ĐÃ ĐẠT SẴN** — §3.1 |
| `AC-09` | `git diff --numstat fb993a7 -- app/api/jobs/route.ts`; `git show 'fb993a7:app/api/jobs/route.ts' \| md5sum; md5sum app/api/jobs/route.ts`; `grep -nE "enforceRateLimits\|getPrisma\(\|withPublicDb" app/api/jobs/route.ts`; static test `cả bốn route public đều gọi guard trước khi chạm DB` | numstat **rỗng**; md5 **khớp**; `EXIT=0` | `route.ts` byte-identical với baseline: `21a806650d57daa15f0139ea8c934328` cả hai phía. Thứ tự: `:17` `enforceRateLimits` → `:25` `getPrisma()` → `:28` `withPublicDb(prisma, (tx) => listPublicJobProjection(tx, …))`. Ba call site `withPublicDb` giữ nguyên; 0 `$transaction` trần mới | **ĐÃ ĐẠT SẴN** — §3.1 |
| `AC-10` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-apply.routes.test.ts src/domains/applications/tracking-mask.routes.test.ts src/domains/job-board/mp1.contract.test.ts src/domains/job-board/public-select.static.test.ts src/domains/job-board/public-detail.service.test.ts src/domains/job-board/public-detail.static.test.ts` | `EXIT=0`, `Test Files 6 passed (6)`, `Tests 71 passed (71)` | Apply/tracking/detail contract không hồi quy. `page.tsx:7-8` vẫn import `ApplyModal`/`SuccessModal` từ `src/domains/job-board/components/*`, `:658`/`:667` render; payload apply không nằm trong diff | **ĐÃ ĐẠT SẴN** (go-live-12) — §3.1 |
| `AC-11` | `npm run test:unit` | `EXIT=0`, `Test Files 100 passed (100)`, `Tests 1504 passed (1504)`, `Duration 32.49s` | File mới `src/domains/job-board/public-card-truth.test.ts`: **6 `describe` / 23 `it`** — `AC-02/RQ-04` (`:96`), `AC-06/RQ-07 DEC-07` (`:199`), `DEC-08` facet trước filter (`:253`, gồm `it` khẳng định `where` gửi xuống Prisma chỉ mang cửa public + lifecycle), `AC-04/RQ-05` (`:296`), `AC-05/RQ-06` (`:351`), `AC-01/AC-03 DEC-10/RISK-01/RISK-07` (`:403`) | Lane canonical là `npm run test:unit`; `npx vitest run` trần đọc `DATABASE_URL` từ `.env` (= PRODUCTION) và fail oan — không dùng |
| `AC-12` | `npm run test:integration` | `EXIT=0` nhưng **`ENV_BLOCKED`** | `ENV_BLOCKED` / `[integration-preflight] DATABASE_URL_TEST is not set. A dedicated test database is required for the integration lane.` / `[integration-preflight] Integration lane NOT run — this is a BLOCKED state, not a PASS.` | **`ENV_BLOCKED`, KHÔNG phải PASS** (`RQ-13`). Nội dung 10 `it` LIVE + cách chạy: `BLK-01` |
| `AC-13` | `npx prisma validate`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `git status --porcelain` + `git diff --numstat fb993a7` | `0 / 0 / 0 / 0 / 0 / 0` | `The schema at prisma\schema.prisma is valid 🚀`; `tsc --noEmit` im lặng; `✖ 494 problems (0 errors, 494 warnings)`; `1504 passed`; `✓ Compiled successfully in 6.3s` + `Generating static pages (21/29)`; diff-check: 7 file `M` + 2 file mới, tất cả nằm trong §4.2 **trừ** hai file vitest config đã khai ở `DEV-02` | `lint` 494 warning là mức nền của repo (0 error). `npx eslint` riêng 4 file trọng tâm (2 test mới + `public.service.ts` + `page.tsx`) cũng `EXIT=0` |
| `AC-14` | đọc §5 của chính file này | `LIM-01`, `LIM-02` | `LIM-01` Quick Apply chưa làm và vì sao không được giả; `LIM-02` số đo ngân sách facet scan + ngưỡng đề nghị OPS-07 | None |
| `AC-15` | ba lượt grep + khẳng định diff — xem §3.2 | `EXIT=0` | Hai `<Link>` (`:151`, `:170`) với `href={detailHref}` (`:152`, `:171`), `publicJobDetailPath` (`:10`, `:141`), `ApplyModal` (`:7`, `:658`) còn nguyên; `git diff fb993a7 -- 'app/(portal)/page.tsx' \| grep '^-' \| grep -i 'link\|router'` → `EXIT=1`, **không một dòng nào** | Câu chữ `EV-14`/`AC-15` đòi cả `router.push` — ở baseline đó là **comment**, không phải lệnh gọi. `DEV-04` |
| `AC-16` | §3.1 dưới đây | 6 mục `ĐÃ ĐẠT SẴN` | Bảng liệt kê từng AC/EV đã đạt sẵn tại `fb993a7` kèm phép đo, bao gồm bắt buộc `EV-01` | None |
| `AC-17` | `grep -n "API doesn't support pagination\|setHasMore(false)\|hasMore" 'app/(portal)/page.tsx'`; lặp lại trên blob baseline | hiện tại `EXIT=1` (0 hit); baseline 2 hit | Baseline `:273` `setHasMore(false); // API doesn't support pagination yet`. Hiện tại cả ba mẫu = 0 hit; state `hasMore` bị bỏ hẳn, thay bằng `:331` `nextOffset` + `:367` `setNextOffset(...)` + `:637` nhánh kết thúc. Static test khóa `not.toMatch(/API doesn't support pagination/i)` và `not.toMatch(/setHasMore\(false\)/)` | None |

**↳ Cập nhật round 2 cho hai hàng `AC-05` và `AC-06` ở trên.** Cả hai mô tả đúng trạng thái **round 1** và đã bị round 2 làm hết đúng ở một chi tiết: `params.set` nay chỉ còn **ba** khóa (`q`, `area`, `shift`), và bề mặt còn **hai** dropdown lấy `options` từ `facets.areas` cùng `facets.shifts` — không còn dropdown thứ ba. Quan trọng hơn, **câu chữ của `AC-06` đã đổi ở spec `v1.2`**: nó không còn chỉ hỏi "filter có tác dụng" mà đòi chỉ ra **cột nguồn canonical** cho từng facet và grep chứng minh không facet nào dựng từ hàm suy diễn. Bằng chứng cho câu chữ mới ở **§8.5**; hàng `AC-06` ở bảng trên **không** còn là bằng chứng đủ cho `v1.2`.

### 3.1 `RQ-16`/`AC-16` — ĐÃ ĐẠT SẴN tại baseline `fb993a7` (không tính thành việc đã làm)

| AC/EV | Đã đạt sẵn ở baseline | Phép đo trên baseline | Việc THẬT của round này |
|---|---|---|---|
| `EV-01` → `AC-01` | **ĐÃ LỖI / ĐÃ ĐẠT SẴN.** Không có phép tính lương bịa nào trên card | `git show 'fb993a7:app/(portal)/page.tsx' \| grep -n "availableSlots \* 1.5\|7 - 12\|Triệu\|salary"` → **0 hit**. Hit duy nhất của lượt grep là `:79 company: 'HRP Partners'` (thuộc `EV-02`). Contract §2.1 `v1.1` cũng tự ghi `EV-01` **ĐÃ LỖI** | Giữ nguyên trạng đó + dựng hàng rào: allow-list 15 khóa, test bơm `hourlyRateVnd` BigInt vào dòng thô, grep bóc-comment 13 mẫu |
| `AC-09`/`RISK-05` | Biên GO-LIVE-04 và thứ tự limiter đã đúng | `git show 'fb993a7:app/api/jobs/route.ts' \| md5sum` = `md5sum app/api/jobs/route.ts` = `21a806650d57daa15f0139ea8c934328`; `git diff --numstat fb993a7 -- app/api/jobs/route.ts` **rỗng** | **Không sửa một dòng nào.** Toàn bộ thay đổi nằm ở client + service ⇒ `AC-09` đạt bằng cách không phá |
| `EV-05` → `AC-05`/`AC-06` | Route đã parse **đủ** tham số | `git show 'fb993a7:app/api/jobs/route.ts' \| sed -n '29,36p'` → `q`, `area`, `industry`, `shift`, `getAll('shiftType')`, `getAll('jobType')`, `offset`, `limit` | Cái sai ở baseline là **UI không gửi**, không phải route không nhận ⇒ việc thật là `buildQuery` + facet-driven dropdown, không phải sửa route |
| `AC-08` (phần thông điệp) | Cặp 429/503 + `setFetchError` đã có | `git show 'fb993a7:app/(portal)/page.tsx' \| sed -n '248,300p'` → hai `throw new Error` cho 429/503 và `setFetchError` trong `catch` | Việc thật: bỏ skeleton xóa danh sách đang xem (`:437`/`:610`) + Thử lại đúng lần gọi vừa thất bại (`:557`) |
| `AC-15` (navigation) | Hai `<Link href={detailHref}>` + `publicJobDetailPath` đã có từ go-live-12 | `git show 'fb993a7:app/(portal)/page.tsx' \| grep -n "href={detailHref}"` → `:134`, `:153` | Việc thật: **không phá** trong lúc viết lại 283/229 dòng. `git diff \| grep '^-' \| grep -i 'link\|router'` = rỗng |
| `AC-10` (apply payload) | `ApplyModal`/`SuccessModal` đã tách sang `src/domains/job-board/components/` và contract apply đã đúng (go-live-12) | `git show 'fb993a7:app/(portal)/page.tsx' \| sed -n '1,12p'` → hai import đã ở đó; `git diff --numstat fb993a7 -- src/domains/job-board/components/` **rỗng** | Việc thật: giữ import + render, và chạy lại 6 file test apply/tracking/detail (71 test) để chứng minh không hồi quy |

### 3.2 `AC-15` — ba lượt grep, nguyên văn

```
$ grep -n "publicJobDetailPath\|href={detailHref}" 'app/(portal)/page.tsx'
10:import { publicJobDetailPath } from '@/src/domains/job-board/public-detail.meta';
141:  const detailHref = publicJobDetailPath(job.slug);
152:        href={detailHref}
171:                href={detailHref}
→ exit 0

$ grep -n "apply-modal\|success-modal\|ApplyModal\|SuccessModal" 'app/(portal)/page.tsx'
7:import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';
8:import { SuccessModal } from '@/src/domains/job-board/components/success-modal';
658:        <ApplyModal
667:        <SuccessModal code={successCode} onClose={() => setSuccessCode('')} />
→ exit 0

$ git diff fb993a7 -- 'app/(portal)/page.tsx' | grep '^-' | grep -i 'link\|router'
→ exit 1, không một dòng nào bị xóa

$ git show 'fb993a7:app/(portal)/page.tsx' | grep -n "href={detailHref}"
134:        href={detailHref}
153:                href={detailHref}
```

Hai thẻ `<Link>` (`:151`, `:170`) là **cơ chế điều hướng thật** và còn nguyên: 2 ở baseline → 2 hiện tại, không dòng nào bị xóa.

## 4. Changed Deliverables

`git diff --numstat fb993a7` (chỉ các path của task này) + `git status --porcelain`:

| Path | +/- | Trạng thái | Trong §4.2? |
|---|---|---|---|
| `src/domains/job-board/public.service.ts` | ~~`495 / 329`~~ → `228 / 59` ⁽¹⁾ | ` M` | ✅ |
| `app/(portal)/page.tsx` | `283 / 229` | ` M` | ✅ |
| `src/domains/applications/marketplace-inventory.static.test.ts` | `46 / 7` | ` M` | ✅ |
| `src/domains/applications/marketplace-browse.routes.test.ts` | `22 / 3` | ` M` | ✅ |
| `vitest.integration-files.ts` | `2 / 0` | ` M` | ✅ |
| `vitest.integration.config.ts` | `1 / 0` | ` M` | ⚠️ **ngoài** §4.2 — `DEV-02` |
| `vitest.unit.config.ts` | `1 / 0` | ` M` | ⚠️ **ngoài** §4.2, và file **đã bẩn sẵn** từ lane go-live-11 — `DEV-02` |
| `src/domains/job-board/public-card-truth.test.ts` | mới | `??` | ✅ |
| `src/domains/job-board/public-card-truth.integration.test.ts` | mới | `??` | ✅ |
| `app/api/jobs/route.ts` | ~~**`0 / 0`**~~ → `0 / 1` ⁽²⁾ | ` M` | ✅ |
| `docs/tasks/hrp-v5-go-live-05-public-card-truth/HANDOFF.md` | mới | `??` | ✅ (`STEP-10`) |

⁽¹⁾ **Sửa số của chính round 1, không phải hệ quả của round 2.** `495 / 329` là **phép đo sai** — nó là diff toàn-file (file 499 dòng), không phải delta thật. Con số đúng, đo lại bằng `git diff --numstat fb993a7` và đối chiếu với `--ignore-cr-at-eol` (hai bên bằng nhau vì file có **0** byte CR), là `228 / 59` **sau cả round 2**. Cách đo CR đáng tin là `tr -cd `\r` rồi `wc -c`; `grep -c` với mẫu CR **báo sai** trong shell này — xem §8.10.

⁽²⁾ **Round 2 đã thay đổi hàng này.** `STEP-13` bỏ tham số `industry` khỏi query parsing nên route **không còn** byte-identical: `0 / 1` và md5 đổi. Theo cảnh báo 1 của §11 đây **không** phải hồi quy `AC-09` — `AC-09` đo thứ tự limiter, RLS context và read-only transaction, không đo byte identity. Số md5 trước/sau ở §8.3.

**Bảng trên là ảnh chụp round 1.** Bốn hàng khác cũng đã thay đổi thật ở round 2 (`page.tsx`, hai file test marketplace, cộng một file mới bị typecheck buộc sửa). **Bảng đầy đủ, đo lại toàn bộ mười path, ở §8.2** — dùng bảng đó khi đối chiếu.

**Không chạm:** `prisma/schema.prisma`, `prisma/migrations/**`, toàn bộ `app/api/**` (0 dòng), `src/domains/applications/application.service.ts`, route apply/tracking, `src/domains/job-board/components/**` (numstat rỗng), `src/shared/security/**`, `.env*`.

**Scratch helper (untracked, KHÔNG phải deliverable, không nằm trong contract — Tier 3 chạy lại được):**

| File | Sinh ra bằng | Dùng cho |
|---|---|---|
| `scratch/gl05-stripped-grep.mjs` | viết tay | `AC-01` — quét 13 mẫu cấm trên mã **đã bóc comment** |
| `scratch/gl05-industry-check.ts` → `.cjs` | `npx esbuild scratch/gl05-industry-check.ts --bundle --platform=node --format=cjs --outfile=scratch/gl05-industry-check.cjs` | `BLK-01` — chứng minh fixture LIVE không tự lật `inferIndustry` |
| `scratch/gl05-facet-perf.ts` → `.cjs` | `npx esbuild scratch/gl05-facet-perf.ts --bundle --platform=node --format=cjs --external:@prisma/client --outfile=scratch/gl05-facet-perf.cjs` | `LIM-02` — ngân sách `DEC-12`/`RISK-03` |

**Phần bẩn KHÔNG thuộc task này, giữ nguyên, không stage:** `docs/tasks/…-02/AUDIT.md`, `…-04/AUDIT.md`, `…-13/AUDIT.md`, `public/index.html` (` M`); `.claude/`, `.neon`, `docs/aff_plan*.md`, `fix.patch`, `patch_test*.ps1`, `temp.diff`, `rls-probe-*.txt`, `scripts/debug-parser.mjs`, và các `scratch/**` của lane khác (`golive03-*`, `golive11-*`, `seed-*`, `test-*`, `neon-schemadiff-*`, `mock-upstash.js`, `check-rpc-schema-usage.mjs`, `db-state-check.mjs`, `run_m1_06*.ps1`) — `??`.

## 5. Deviations / Limitations / Blockers

### Deviations

**`DEV-01` — `DEC-03` gọi mảng vị trí là `positions`; mã dùng `positionTitles`.**
`PublicJobDetailDto extends PublicJobDto` (go-live-12) đã có `positions: PublicJobPositionDto[]` — một mảng **object**. Đặt `positions: string[]` vào `PublicJobDto` là xung đột kiểu trên cùng một khóa; sửa phía detail thì vi phạm `RQ-15` (không chạm mã go-live-12). Chọn `positionTitles` và ghi lý do vào doc comment của `PublicJobDto`. Ba khóa còn lại (`locations`, `shifts`) đúng tên `DEC-03`. Kiểu và ngữ nghĩa không đổi một chữ so với contract.

**`DEV-02` — hai file vitest config nằm ngoài danh sách §4.2.**
§4.2 chỉ liệt kê `vitest.integration-files.ts`. Nhưng cờ `GOLIVE05_LIVE_CARD_TRUTH` phải được **định nghĩa ở cả hai lane** để `describe.skipIf(!enabled)` có nghĩa: `vitest.integration.config.ts` đặt `GOLIVE05_LIVE_CARD_TRUTH: TEST_DB_ADMIN ? '1' : ''` (`+1/-0`), `vitest.unit.config.ts` đặt `GOLIVE05_LIVE_CARD_TRUTH: ''` (`+1/-0`) để lane unit không bao giờ chạm DB. Không có cách nào đăng ký lane LIVE mà chỉ sửa một file.
⚠️ **Cảnh báo quy trách cho Tier 3:** `vitest.unit.config.ts` **đã ` M` trước khi Tier 2 bắt đầu** (lane go-live-11). `git diff fb993a7 -- vitest.unit.config.ts` cho thấy `+1/-0` — dòng của task này; nếu diff còn dòng khác thì đó là của lane khác, không phải của round này.

**`DEV-03` — nhãn `'Toàn thời gian'` bị xóa, nhưng KHÔNG được tính là sửa `EV-02`.**
§2.1 `v1.1` cấm đúng điều đó. `EV-02` đóng bằng **một** thay đổi: `company: 'HRP Partners'` (baseline `:79`) → `recruiter: 'Tuyển dụng qua HRPartner'` (`:93`). Việc `'Toàn thời gian'` cùng cả hai nhóm checkbox biến mất là hệ quả của `RQ-07`/`DEC-07`/`DEC-08`: `jobType` là giá trị **suy diễn** từ độ dài ca, `'xoay_ca'` là giá trị public DTO **không còn sinh ra được** ⇒ hai nhóm control đó không có dữ liệu canonical chống lưng. Hai lý do độc lập, ghi riêng, không trộn.

**`DEV-04` — `EV-14`/`AC-15` nói `router.push` tại `:118`; ở baseline đó là COMMENT.**
`git show 'fb993a7:app/(portal)/page.tsx' | grep -n "router"` trả **đúng một** dòng, và nó là chú thích:

```
118:  // `onClick` + `router.push`: giữ được middle-click, ctrl-click, "mở tab mới" và crawler đọc được.
```

Đó là chú thích của go-live-12 giải thích **vì sao họ cố ý KHÔNG dùng** `router.push`. Không có lệnh gọi nào để bảo toàn. Dòng đó vẫn còn, nay ở `:136`. Cơ chế thật là hai thẻ `<Link>`; §3.2 đo đúng chúng. Grep máy móc `router.push` mà không đọc mã sẽ kết luận sai là "đã mất".

**`DEV-05` — khớp `q`/`area` chuyển từ SQL sang bộ nhớ, và bỏ dấu hai phía.**
`DEC-08` buộc facet derive trên **toàn tập hợp lệ trước filter**, nên tập hợp lệ phải nằm trong bộ nhớ trước khi lọc ⇒ `q`/`area` không còn dùng `contains … mode:'insensitive'` của Prisma mà đi qua `keywordHaystack` (`:408`)/`areaHaystack` (`:420`) với `foldVietnamese` (`:96`) **ở cả hai phía**. Đây là **thay đổi hành vi có chủ đích**: "Bac Ninh" nay khớp "Bắc Ninh" — baseline thì không. `where` gửi xuống Prisma chỉ còn `status: 'ACTIVE'` + `isPublic: true` + `staffingOrders.some(...)`, và có `it` riêng khóa điều đó.

**`DEV-06` — `industry` và `jobType` là giá trị SUY DIỄN, không phải cột canonical.**
`inferIndustry` (`:157`) là chuỗi regex **có thứ tự** trên văn bản đã bỏ dấu; nhánh đầu là `/kho|van tai|logistic|warehouse/`. Hệ quả thật: một câu tiếng Việt tự nhiên chứa "không" gập thành "khong" ⊃ "kho" ⇒ việc bị xếp `'Kho vận'`. `jobType` suy từ độ dài ca. Cả hai chỉ là **nhãn hiển thị/nhóm facet**, không phải sự thật thương mại; ghi ra đây để Tier 3 biết giới hạn thay vì phát hiện lại như một defect.
**Trạng thái sau round 2: chuyển task tiếp nối theo `DEC-13`.** Tier 1 đã nhận `DEV-06` thành `EV-16` + `DEC-13` ở spec `v1.2`: round 2 **loại control** ngành nghề khỏi bề mặt browse (dropdown, facet `industries`, `opts.industry`, tham số route), còn `inferIndustry` cùng hai khóa DTO `industry`/`jobType` **giữ nguyên** theo ranh giới cứng `RQ-18` vì xoá chúng vỡ compile ở hai file go-live-12 mà `RQ-15` bảo vệ. Nhãn suy diễn vì thế **vẫn in trên trang chi tiết đang chạy production** — đó là phạm vi của task tiếp nối, không phải của round này. Bằng chứng: §8.4 (`AC-18`), §8.5 (`AC-06`).

**`DEV-07` — `workLocation` chỉ có khoảng trắng thì rơi về fallback.**
Baseline coi chuỗi rỗng-sau-trim là giá trị hợp lệ nên card có thể in ô địa điểm trắng. `summarize` bỏ mọi phần tử rỗng-sau-trim; rỗng hết thì UI in nhãn trung tính (`summaryLabel(job.locations, 'Địa điểm đang cập nhật')`), **không** bịa một giá trị.

**`DEV-08` — card và trang chi tiết CỐ Ý không cùng tập slot.**
`toDto` lọc `slotAvailable > 0`; `toDetailDto` **không** lọc (go-live-12 `DEC-14`: việc đã đủ người vẫn trả 200 với `available: 0`). Round này giữ nguyên sự khác biệt đó và có một `it` LIVE khẳng định nó (`:277`) để không ai "sửa" thành giống nhau.

**`DEV-09` — `src/domains/job-board/mp1.contract.test.ts` phải sửa dù không có trong danh sách §4.2.**
`STEP-12` bỏ `opts.industry` khỏi kiểu, và file này truyền đúng khóa đó ở `:102` ⇒ `npm run typecheck` **EXIT=2**. Ba lối đi khả dĩ đều vi phạm một AC trừ lối sửa file: đã xoá một khóa `opts`, thay bằng hai dòng chú thích, `2 / 1`; ba nhóm assertion DTO không sửa một ký tự. Chi tiết và nguyên văn lỗi TS ở §8.11.
### Limitations

**`LIM-01` — Quick Apply phone-only: KHÔNG làm (`DEC-11`, `RISK-08`).**
Trang chỉ có đường ứng tuyển đầy đủ qua `ApplyModal`. Không có nút "ứng tuyển 1 chạm". Lý do không được giả: `CandidateSubmission.fullName` là `NOT NULL`, nên "1 chạm" chỉ chạy được nếu (a) điền một placeholder kiểu `'Ứng viên'` vào cột tên — sinh ra dữ liệu bịa đúng chỗ HR đọc để gọi điện, hoặc (b) nới cột thành nullable — một migration ngoài scope và làm mọi consumer downstream phải xử lý `null`. Cả hai `DEC-11`/`RISK-08` đều cấm. Đề nghị: nếu Owner muốn, mở task riêng có contract cho *tên tối thiểu* thay vì lách schema.

**`LIM-02` — ngân sách facet scan: ĐO ĐƯỢC, chưa tối ưu, đề nghị chuyển OPS-07 (`DEC-12`/`RISK-03`).**
`DEC-08` buộc quét toàn tập public hợp lệ trong bộ nhớ mỗi request. Đo bằng `node scratch/gl05-facet-perf.cjs` (20 vòng warmup, median của 9 mẫu, mỗi project 6 slot):

| N project public | median | min / max |
|---|---|---|
| 5 (quy mô live hôm nay) | **0.23 ms** | 0.21 / 0.64 |
| 50 | 2.17 ms | 2.08 / 2.79 |
| 200 | 7.80 ms | 7.54 / 8.62 |
| 500 | 20.46 ms | 19.46 / 21.58 |
| 1000 | 38.85 ms | 37.09 / 40.77 |
| 2000 | 77.31 ms | 75.50 / 79.72 |

Đường cong tuyến tính theo N (~0.039 ms/project ở mẫu này). Một mẫu chạy trước đó trên **cùng cây mã** cho số cao hơn ~1.4× (0.53 / 3.25 / 15.05 / 31.64 / 53.96 / 118.10 ms) — chênh do tải máy, nên hãy đọc ngưỡng là **một dải, không phải một điểm**: mốc ~50 ms CPU/request nằm khoảng **900–1300 project public**. Quy mô live hôm nay là **5** project ⇒ dư ~200×.
**Không** kích `DEC-12` stop condition ở quy mô MVP. Khi số project public tiến tới ~900, cần cache facet hoặc đẩy facet xuống SQL — ghi nhận cho OPS-07, không làm trong task này.

**`LIM-03` — không có lane DOM trong repo.**
0 file `*.test.tsx`, zero match `playwright|puppeteer|cypress|jsdom`. Nên `AC-05`/`AC-07`/`AC-08` đo bằng **cấu trúc mã + ma trận unit của service + route test**, không bằng cú bấm. Ba hành vi cần mắt người xác nhận: (1) bấm Tìm kiếm phát đúng một request có bốn tham số; (2) Tải thêm nối trang chứ không thay trang; (3) refetch lỗi giữ nguyên danh sách đang xem và Thử lại lặp lại đúng lần gọi đó. Đây là bước OP, không phải AC của Tier 2.

### Blockers

**`BLK-01` — `AC-12` = `ENV_BLOCKED`. Lane LIVE chưa từng chạy trong môi trường này.**

```
$ npm run test:integration
ENV_BLOCKED
[integration-preflight] DATABASE_URL_TEST is not set. A dedicated test database is required for the integration lane.
[integration-preflight] Integration lane NOT run — this is a BLOCKED state, not a PASS.
→ exit 0
```

Exit code 0 là của **preflight**, không phải của test. Đúng `RQ-13`: **không** fallback `hrp-live`, **không** mock-pass, **không** đọc `ENV_BLOCKED` thành PASS.

Cách Tier 3 chạy: đặt `DATABASE_URL_TEST` (+ `TEST_DB_ADMIN`) trỏ `hrp_mp2_test` (`br-misty-cell-az3nx5l3`, `Expires At = never`) rồi `npm run test:integration`. `vitest.integration.config.ts` sẽ đặt `GOLIVE05_LIVE_CARD_TRUTH='1'` và `describe.skipIf(!enabled)` mở. **Chạm `hrp-live` thì dừng.**

`src/domains/job-board/public-card-truth.integration.test.ts` — 10 `it` LIVE, mỗi cái ghi rõ AC nó gánh:

| Dòng | `it` |
|---|---|
| `:183` | `AC-12` — `publicSelect` chạy dưới principal MKT, đúng hai dự án public lọt qua |
| `:200` | `AC-02/RQ-04` — ba mảng summary và `availableSlots` đúng trên dòng thật |
| `:221` | `DEC-05` — slot hết hạn, slot đủ chỉ tiêu và đơn `CLOSED` đều không lên card |
| `:236` | `AC-01/RISK-01/RISK-07` — `hourlyRateVnd` là BigInt THẬT nhưng DTO chỉ có 15 khóa allow-list |
| `:258` | `AC-07/DEC-08` — facet dựng từ toàn tập public hợp lệ và KHÔNG co lại theo filter |
| `:277` | `AC-12`/go-live-12 `DEC-14` — trang chi tiết kể MỌI vị trí còn hiệu lực, card chỉ kể vị trí còn tuyển |
| `:301` | `AC-12` — dự án nội bộ không có card, không facet, và trang chi tiết trả `null` |
| `:307` | `AC-05` — `q` fold dấu, không khớp `description`; `area` đọc tập slot SAU lifecycle |
| `:330` | `AC-05/AC-06` — `industry` fold dấu, `shift` khớp cả nhãn KHÔNG đứng đầu |
| `:345` | `AC-04` — `total`/`nextOffset` và hai trang thật khớp nhau, `limit` bị kẹp `[1,50]` |

**↳ Cập nhật round 2 cho bảng anchor ở trên.** `STEP-15` sửa file LIVE nên năm anchor dịch chỗ: `:277` → `:278`, `:301` → `:302`, `:307` → `:308`, `:330` → `:331`, `:345` → `:343`. Một test **đổi cả nội dung**: hàng `:330` cũ đo `industry` fold dấu; nay là `:331` `AC-06 — shift khớp cả nhãn KHÔNG đứng đầu, nhãn của slot đã đủ chỉ tiêu thì không`, tức nửa `industry` đã bị bỏ theo `DEC-13` chứ không chuyển sang chỗ khác. Hàng `:258` (`AC-07/DEC-08`) vẫn đo facet không co lại theo filter, nhưng filter dùng để đo nay là `area` thay vì `industry`, và có thêm khẳng định `Object.keys(facets).sort()` bằng đúng `[areas, shifts]`. Số `it` không đổi: **10**.

Fixture tự dọn: mọi tên mang hậu tố `RUN = gl05-${Date.now()}-${Math.floor(Math.random()*1e9)}` (**chỉ chữ số**, để không chuỗi ngẫu nhiên nào lật được `inferIndustry`); `afterAll` chạy lại `cleanup()`, in `[gl05 cleanup] projects còn lại=… slots còn lại=…` và **assert `left + leftSlots === 0`** ⇒ rác không im lặng tồn tại.
Một defect fixture do chính Tier 2 tạo **đã sửa trước khi giao**: mô tả đơn từng là `mota${RUN} nội dung nội bộ không in trên card`; "không" gập thành "khong" ⊃ "kho" và `/kho|…/` là nhánh **đầu tiên** của `inferIndustry` ⇒ dự án điện tử sẽ ra `'Kho vận'` và ba khẳng định vỡ vì FIXTURE chứ không vì mã — trong một lane đang `ENV_BLOCKED`, tức là vỡ trong im lặng. Đã đổi thành `mota${RUN} chi tiet noi bo cho HR` (không có chữ `k` nào) và chứng minh bằng **chính hai hàm của mã thật**, `sed` ra chứ không gõ lại:

```
$ npx esbuild scratch/gl05-industry-check.ts --bundle --platform=node --format=cjs --outfile=scratch/gl05-industry-check.cjs && node scratch/gl05-industry-check.cjs
ELEC industry = "Điện tử"
WARE industry = "Kho vận"
ELEC folded chua "kho"?  false
→ exit 0
```

## 6. Evidence Index

Chạy lại theo đúng thứ tự này từ `c:\CodeApp\HrP`. Dòng đầu là `verify-task.ps1` (C-09).

| # | Command | Exit | Kết quả then chốt |
|---|---|---|---|
| 1 | `powershell -NoProfile -Command "& .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-05-public-card-truth/TASK.md; exit $LASTEXITCODE"` | `0` | `RESULT: PASS. TASK contract is ready for execution.` |
| 2 | `npx prisma validate` | `0` | `The schema at prisma\schema.prisma is valid 🚀` |
| 3 | `npm run typecheck` | `0` | `tsc --noEmit` không in gì |
| 4 | `npx eslint "app/(portal)/page.tsx" src/domains/job-board/public.service.ts src/domains/job-board/public-card-truth.test.ts src/domains/job-board/public-card-truth.integration.test.ts` | `0` | 4 file trọng tâm sạch |
| 5 | `npm run lint` | `0` | `✖ 494 problems (0 errors, 494 warnings)` — mức nền repo |
| 6 | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts src/domains/applications/marketplace-browse.routes.test.ts src/domains/applications/marketplace-inventory.static.test.ts` | `0` | `Test Files 3 passed (3)` / `Tests 60 passed (60)` |
| 7 | `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-apply.routes.test.ts src/domains/applications/tracking-mask.routes.test.ts src/domains/job-board/mp1.contract.test.ts src/domains/job-board/public-select.static.test.ts src/domains/job-board/public-detail.service.test.ts src/domains/job-board/public-detail.static.test.ts` | `0` | `Test Files 6 passed (6)` / `Tests 71 passed (71)` — không hồi quy apply/tracking/detail |
| 8 | `npm run test:unit` | `0` | `Test Files 100 passed (100)` / `Tests 1504 passed (1504)` / `32.49s` |
| 9 | `npm run build` | `0` | `✓ Compiled successfully in 6.3s`, `Generating static pages (21/29)` |
| 10 | `npm run test:integration` | `0` | **`ENV_BLOCKED`** — `BLK-01`. Không phải PASS |
| 11 | `node scratch/gl05-stripped-grep.mjs` | `0` | `TOTAL HITS (mã sau khi bóc comment) = 0` |
| 12 | `node scratch/gl05-industry-check.cjs` | `0` | `ELEC "Điện tử"` / `WARE "Kho vận"` / `ELEC folded chua "kho"? false` |
| 13 | `node scratch/gl05-facet-perf.cjs` | `0` | bảng `LIM-02` |
| 14 | `git show 'fb993a7:app/api/jobs/route.ts' \| md5sum; md5sum app/api/jobs/route.ts` | `0` | `21a806650d57daa15f0139ea8c934328` hai phía ⇒ route **byte-identical** |
| 15 | `git diff --numstat fb993a7 -- <9 path của §4>` | `0` | bảng §4 |
| 16 | `git diff fb993a7 -- 'app/(portal)/page.tsx' \| grep '^-' \| grep -i 'link\|router'` | `1` | không dòng navigation nào bị xóa (`AC-15`) |
| 17 | `grep -n "API doesn't support pagination\|setHasMore(false)\|hasMore" 'app/(portal)/page.tsx'` | `1` | 0 hit (`AC-17`); baseline có 2 hit |
| 18 | `git status --porcelain` | `0` | 9 path của task + phần bẩn của lane khác, **không có gì được stage/commit** |

**Lưu ý lane test:** lane canonical là `npm run test:unit` (config `vitest.unit.config.ts`, `DATABASE_URL` sentinel không tới được). `npx vitest run` **trần** sẽ đọc `DATABASE_URL` từ `.env` — tức PRODUCTION — và fail oan hàng chục test; đừng dùng nó làm bằng chứng.
**Lưu ý đo:** `AC-01` phải đo trên mã **đã bóc comment** (`#11`), vì grep thô trúng đúng một doc-comment ở `public.service.ts:6` liệt kê chính các khóa bị cấm.

**Bằng chứng của round 2 KHÔNG nằm trong bảng trên.** Bảng `#1`..`#18` là index của round 1 và giữ nguyên. Round 2 có index riêng: `AC-18` ở §8.4, `AC-06` ở §8.5, `AC-15` ở §8.6, `AC-19` ở §8.7, RED→GREEN ở §8.8, gate battery đo lại trên cây cuối ở §8.12. Hai số ở `#14` và `#15` đã bị round 2 làm hết đúng — xem hai chú thích của §4.
## 7. Execution Round History

| Round | Ngày | Kết quả | Ghi chú |
|---|---|---|---|
| 1 | 2026-08-31 → 2026-09-01 | `READY_FOR_AUDIT` | `STEP-01`..`STEP-10` DONE. Contract bump `v1.0` → `v1.1` **giữa lượt**; §2.1 đã đọc lại trước khi viết HANDOFF ⇒ `EV-01` được ghi **ĐÃ ĐẠT SẴN** thay vì tính thành việc đã làm, và `EV-02` không bị quy cho việc xóa nhãn `'Toàn thời gian'`. Bằng chứng của phần đã làm trước lúc bump vẫn hợp lệ, không mở round mới. `AC-12` `ENV_BLOCKED`. Không commit, không push, không deploy |
| 2 | 2026-09-01 | `READY_FOR_AUDIT` | Spec `v1.2` §11, `STEP-11`..`STEP-16` DONE. Phạm vi hẹp: loại **control** ngành nghề khỏi bề mặt browse theo `DEC-13`, giữ nguyên `inferIndustry` cùng hai khóa DTO và mọi file go-live-12 theo ranh giới cứng `RQ-18`. Bằng chứng round 1 **không làm lại**; hai chỗ round 2 làm câu chữ round 1 hết đúng đã được đánh dấu tại chỗ (§1, §4). Thêm `DEV-09`. `AC-12` vẫn `ENV_BLOCKED`. Không commit, không push, không deploy — `HEAD` = `f599dd3`. Chi tiết ở §8 |

## 8. Execution Round 2 — `DEC-13`: loại control ngành nghề khỏi bề mặt browse

Phạm vi round 2 là §11 của spec `v1.2`, đúng sáu bước `STEP-11`..`STEP-16`, cộng hợp thức hoá hai file config lane. **Bằng chứng round 1 không được làm lại và vẫn hợp lệ**; mục này chỉ ghi phần round 2 làm thêm, cộng hai chỗ round 2 làm cho câu chữ round 1 hết đúng (đã đánh dấu tại chỗ ở §1 và §4). **Không commit, không push** (`R-01`) — `HEAD` vẫn là `f599dd3`, `git status` không có gì được stage.

### 8.1 Round 2 execution trace

| Step | Việc | File | Trạng thái | Ghi chú |
|---|---|---|---|---|
| `STEP-11` | Bỏ dropdown ngành cùng state, entry trong `EMPTY_FILTERS` và `params.set` của nó | `app/(portal)/page.tsx` | `DONE` | Bộ lọc còn `keyword` / `area` / `shift`; `EMPTY_FACETS` còn hai khóa; còn đúng hai `FacetSelect` |
| `STEP-12` | Bỏ facet `industries` khỏi payload và `opts.industry` khỏi nhánh lọc | `src/domains/job-board/public.service.ts` | `DONE` | `inferIndustry` và hai khóa DTO giữ nguyên từng ký tự — `AC-18` §8.4 |
| `STEP-13` | Bỏ tham số `industry` khỏi query parsing | `app/api/jobs/route.ts` | `DONE` | `0 / 1`; thứ tự limiter → guard → `getPrisma` → `withPublicDb` không đổi. md5 ở §8.3 |
| `STEP-14` | Giữ nguyên hai dòng cờ lane của round 1, chỉ đo lại | `vitest.integration.config.ts`, `vitest.unit.config.ts` | `DONE` (đo lại, 0 dòng sửa thêm) | `AC-19` §8.7 |
| `STEP-15` | Cập nhật test đang khoá facet/param ngành, thêm assertion âm cấm facet suy diễn quay lại | 4 file test + 1 file bị typecheck buộc | `DONE` | RED→GREEN ở §8.8; file thứ năm ở `DEV-09` §8.11 |
| `STEP-16` | Viết mục round 2 này | `HANDOFF.md` | `DONE` | `DEV-06` đã đổi trạng thái thành "chuyển task tiếp nối theo `DEC-13`" (§5) |

### 8.2 Changed deliverables — đo lại toàn bộ ở cuối round 2

Bảng này **thay thế** bảng ảnh chụp round 1 ở §4 khi đối chiếu.

```
$ git diff --numstat fb993a7 -- <9 path tracked>
272     230     app/(portal)/page.tsx
0       1       app/api/jobs/route.ts
29      5       src/domains/applications/marketplace-browse.routes.test.ts
80      8       src/domains/applications/marketplace-inventory.static.test.ts
2       1       src/domains/job-board/mp1.contract.test.ts
228     59      src/domains/job-board/public.service.ts
2       0       vitest.integration-files.ts
1       0       vitest.integration.config.ts
1       0       vitest.unit.config.ts
EXIT=0
```

`git diff --numstat --ignore-cr-at-eol` trên sáu file mã trả **đúng cùng sáu cặp số** ⇒ không một dòng nào bị tính vì lý do line-ending. Hai file untracked: `src/domains/job-board/public-card-truth.test.ts` (456 dòng), `src/domains/job-board/public-card-truth.integration.test.ts` (370 dòng).

```
$ git status --porcelain -- <path của task>
 M app/(portal)/page.tsx
 M app/api/jobs/route.ts
 M src/domains/applications/marketplace-browse.routes.test.ts
 M src/domains/applications/marketplace-inventory.static.test.ts
 M src/domains/job-board/mp1.contract.test.ts
 M src/domains/job-board/public.service.ts
 M vitest.integration-files.ts
 M vitest.integration.config.ts
 M vitest.unit.config.ts
?? docs/tasks/hrp-v5-go-live-05-public-card-truth/HANDOFF.md
?? src/domains/job-board/public-card-truth.integration.test.ts
?? src/domains/job-board/public-card-truth.test.ts
```

Cột đầu của mọi hàng ` M` là **khoảng trắng** ⇒ không có gì trong index. `git rev-parse --short HEAD` = `f599dd3`.

### 8.3 md5 của `app/api/jobs/route.ts` trước và sau

| Thời điểm | md5 |
|---|---|
| baseline `fb993a7` (và suốt round 1) | `21a806650d57daa15f0139ea8c934328` |
| sau `STEP-13` | `de65d677d4e51fb933c6f469ef001bdf` |

Đổi md5 là **hệ quả bắt buộc** của `STEP-13`: file mất đúng một dòng đọc tham số `industry` (`0 / 1`). Theo cảnh báo 1 của §11, đây **không** phải hồi quy `AC-09` — `AC-09` đo thứ tự limiter, RLS context và read-only transaction, **không** đo byte identity. Ba thứ nó thật sự đo còn nguyên, theo đúng thứ tự trong file: `enforceRateLimits({` → `if (denied) return denied;` → `getPrisma()` → `withPublicDb(prisma, (tx) => listPublicJobProjection(tx, {...}))`. `public.service.ts` cũng đổi md5 (`81642b64d685c951c4c71c28c88b165f` → `ba7742158b357840f0a590bb1a7e6cb1`), phần vì `STEP-12`, phần vì bản sửa ở §8.9.

### 8.4 `AC-18` — tám dòng lệnh, exit code và output

Bốn phép grep phải **rỗng** (exit `1` = không match = PASS):

```
$ grep -n -i 'industry|industries|ngành' 'app/(portal)/page.tsx'          # mẫu dùng -i và alternation
    (không dòng nào)  EXIT=1
$ grep -n 'industries' src/domains/job-board/public.service.ts
    (không dòng nào)  EXIT=1
$ grep -n 'opts.industry' src/domains/job-board/public.service.ts
    (không dòng nào)  EXIT=1
$ grep -n -i 'industry|ngành' app/api/jobs/route.ts
    (không dòng nào)  EXIT=1
```

Phép grep trên `page.tsx` cố ý **rộng hơn** câu chữ `AC-18`: nó bắt cả nhãn tiếng Việt, không chỉ identifier. Lần chạy đầu nó trả **một** match — một chú thích round 2 của chính tôi trích lại tên hai nhóm control vừa bị loại. Chú thích đó đã được viết lại để không còn trích nhãn: một chú thích chứa token là đủ để biến "phép đo phải rỗng" của Tier 3 thành FAIL giả. `page.tsx` sau khi sửa vẫn `272 / 230` và **0** byte CR.

Bốn phép đo phải **còn match, không đổi so với baseline** (exit `0`):

```
$ grep -n 'function inferIndustry(|inferIndustry(searchableText' src/domains/job-board/public.service.ts
162:function inferIndustry(text: string, fallback: string | null): string {
308:    industry: inferIndustry(searchableText, null),
363:    industry: inferIndustry(searchableText, null),
    EXIT=0
$ grep -n '^  industry: string;|^  jobType: (union)' src/domains/job-board/public.service.ts
19:  industry: string;
21:  jobType: 'toan_thoi_gian' | 'ban_thoi_gian' | 'thoi_vu';
    EXIT=0
$ git diff --numstat fb993a7 -- 'app/(jobs)/viec-lam/[slug]/page.tsx' src/domains/job-board/public-detail.static.test.ts
    (không dòng nào — RỖNG)  EXIT=0
$ git status --porcelain -- 'app/(jobs)/viec-lam/[slug]/page.tsx' src/domains/job-board/public-detail.static.test.ts
    (không dòng nào — clean)  EXIT=0
```

Hai phép cuối là **cùng một khẳng định đo hai chiều**: hai file go-live-12 mà §4.2 Out of scope ghim vừa không có diff so với baseline, vừa không bẩn trong worktree.

**Ranh giới cứng `RQ-18` đã giữ:** không xoá `inferIndustry` (`:162`, còn hai call site `:308`/`:363`), không xoá hai khóa DTO (`:19`, `:21`), không chạm file nào của go-live-12. Hệ quả có ý thức: nhãn ngành suy diễn **vẫn in trên trang chi tiết đang chạy production** — `DEC-13` xếp nó vào task tiếp nối, không phải round này.

### 8.5 `AC-06` phiên bản `v1.2` — mỗi facet truy nguyên về một cột canonical

`v1.2` đòi **chỉ tên cột nguồn** cho từng facet còn lại, và grep chứng minh không facet nào lấy nguồn từ hàm suy diễn văn bản tự do.

| Facet còn lại | Dòng dựng | Nguồn trung gian | Cột canonical thật | Có suy diễn? |
|---|---|---|---|---|
| `areas` | `public.service.ts:460` | `job.locations` (`:252`) | `StaffingSlot.workLocation`, fallback `StaffingProject.siteAddress` — cả hai đều nằm trong `select` (`:395`, `:386`) | Không |
| `shifts` | `public.service.ts:461` | `job.shifts` (`:253`) | `StaffingSlot.shiftStart` + `StaffingSlot.shiftEnd` qua `slotShiftLabel` (`:204`) — hàm chỉ nối hai cột thành nhãn, không đọc văn bản tự do | Không |

```
$ sed -n '458,463p' src/domains/job-board/public.service.ts
  // DEC-08 — facet tính TRƯỚC filter, trên toàn tập hợp lệ.
  const facets: PublicJobFacets = {
    areas: summarize(eligible.flatMap(({ job }) => job.locations)),
    shifts: summarize(eligible.flatMap(({ job }) => job.shifts)),
  };
$ sed -n '458,463p' src/domains/job-board/public.service.ts | grep -c -i 'infer'
0
```

Facet thứ ba (`industries`) đã bị loại chứ **không** bị đổi tên hay chuyển sang cột khác: `RQ-07` `v1.2` cấm facet suy diễn, và `client_companies` — nguồn canonical duy nhất cho ngành nghề — bị FORCE RLS và principal công khai `MKT` không có policy đọc (`EV-09`), nên không có đường nào dựng facet đó cho đúng trong round này. `summarize` xuất hiện **đúng hai** lần trong khối facets, và static test khoá con số hai đó lại (§8.8).

### 8.6 `AC-15` — điều hướng go-live-12, đo lại sau round 2

```
$ grep -n 'href={detailHref}' 'app/(portal)/page.tsx'
150:        href={detailHref}
169:                href={detailHref}
    COUNT=2  EXIT=0
$ grep -n "from 'next/link'" 'app/(portal)/page.tsx'
4:import Link from 'next/link';
$ grep -n 'components/apply-modal' 'app/(portal)/page.tsx'
7:import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';
$ git diff fb993a7 -- 'app/(portal)/page.tsx' | grep -c '^-.*detailHref'
0
```

Hai `Link` của Next mang `href={detailHref}` còn nguyên, `ApplyModal` vẫn import từ `src/domains/job-board/components/apply-modal` chứ không bị nhúng lại, và diff **không xoá** dòng `detailHref` nào.

`router.push`: baseline `fb993a7` có **1** hit, working copy có **1** hit — cùng một chú thích, nay ở `:134`. **Không thêm lệnh gọi mới nào**, đúng câu `v1.2` "sự có mặt của một `router.push` mới là FAIL". `DEV-04` (§5) là lỗi câu chữ của contract ở `v1.1` và `v1.2` đã tự sửa; round 2 không làm gì về nó.

### 8.7 `AC-19` — cờ lane LIVE khai ở cả hai config

```
$ grep -n 'GOLIVE05_LIVE_CARD_TRUTH' vitest.integration.config.ts
51:      GOLIVE05_LIVE_CARD_TRUTH: TEST_DB_ADMIN ? '1' : '',        COUNT=1
$ grep -n 'GOLIVE05_LIVE_CARD_TRUTH' vitest.unit.config.ts
44:      GOLIVE05_LIVE_CARD_TRUTH: '',                              COUNT=1
```

Đúng **một** dòng mỗi file: lane integration lấy giá trị theo `TEST_DB_ADMIN`, lane unit ghim chuỗi rỗng nên không bao giờ mở kết nối DB. Bên nhận là `public-card-truth.integration.test.ts:37` (`enabled`) và `:40` (`describe.skipIf(!enabled)`); file được đăng ký lane ở `vitest.integration-files.ts:43`. Lane unit chạy `1505` test **PASS** exit `0` với file LIVE bị **skip**, không fail (§8.12).

### 8.8 Bằng chứng RED → GREEN: hàng rào mới **thật sự** cắn

`STEP-15` đòi "test phải FAIL nếu ai đó nối lại một facet suy diễn". Lời văn không chứng minh được điều đó, nên tôi nối lại facet ngành **hai lần** trên bản sao có backup, chạy lane, rồi khôi phục và đối chiếu md5.

**RED-A — dựng lại facet `industries` trong service** (thêm một khóa `industries: summarize(...)` vào khối `const facets`):

```
$ npx vitest run --config vitest.unit.config.ts (3 file test)
EXIT=1  —  3 test FAILED:
  marketplace-inventory.static.test.ts  › expect(service).not.toMatch(/industries/)
  public-card-truth.test.ts             › expect(result.facets).toEqual({ areas: [], shifts: [] })
  public-card-truth.test.ts             › DEC-08 — expect(unfiltered.facets).toEqual({...}) hai khóa
```

**RED-B — dựng lại tham số `industry` trong route** (thêm lại một dòng đọc `searchParams` và truyền xuống service):

```
$ npx vitest run --config vitest.unit.config.ts (3 file test)
EXIT=1  —  2 test FAILED:
  marketplace-inventory.static.test.ts  › expect(route).not.toMatch(/industry/i)
  marketplace-browse.routes.test.ts     › toHaveBeenCalledWith(...) khớp CHÍNH XÁC 7 khóa opts
```

**GREEN sau khi khôi phục** — cả hai file về đúng md5 đã ghi ở §8.3 (`ba7742158b357840f0a590bb1a7e6cb1`, `de65d677d4e51fb933c6f469ef001bdf`), và lane chạy lại trên cây cuối:

```
$ npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts src/domains/applications/marketplace-browse.routes.test.ts src/domains/applications/marketplace-inventory.static.test.ts src/domains/job-board/mp1.contract.test.ts
EXIT=0   Test Files 4 passed (4)   Tests 67 passed (67)
```

Ba cơ chế khoá, cố ý chồng nhau để một mình không đủ phá:

1. **Khoá cấu trúc** — static test khớp nguyên văn `export interface PublicJobFacets { areas: string[]; shifts: string[]; }`, đếm `summarize(` trong khối facets phải bằng **2**, và `expect(facetsObject).not.toMatch(/infer/i)`. Một facet suy diễn mới sẽ hoặc làm số 2 sai, hoặc trúng `/infer/i`.
2. **Khoá hình dạng dữ liệu** — `expect(Object.keys(facets).sort()).toEqual(['areas', 'shifts'])` ở cả lane unit và lane LIVE. Facet thứ ba **mang tên gì cũng** fail, kể cả tên không chứa chữ `industry`.
3. **Khoá kiểu** — `type ListOpts = NonNullable<Parameters<typeof listPublicJobProjection>[1]>` ở `public-card-truth.integration.test.ts:169`: nối lại một `opts.industry` là **lỗi compile**, không cần chờ test chạy.

`marketplace-browse.routes.test.ts` cố ý **vẫn gửi** `industry=%C4%90i%E1%BB%87n+t%E1%BB%AD` trong URL rồi khẳng định `Object.keys(...)` của lần gọi service **không chứa** `industry` — chứng minh route **bỏ qua** tham số cũ thay vì chỉ chứng minh nó không được gửi. `PUBLISHED_JOB.industry: 'Điện tử'` trong fixture giữ nguyên vì đó là **khóa DTO** thuộc ranh giới cứng, không phải facet.

### 8.9 Defect tự gây ở round 1: một byte NUL nằm trong `public.service.ts`

Trong lúc đo round 2 tôi phát hiện **một byte NUL thật** (`0x00`) ở offset `11782`, tức trong dòng `:241`, do chính bản ghi round 1 của tôi sinh ra: chỗ đó cần chuỗi bốn ký tự làm separator nhưng lại ghi thẳng ký tự NUL vào file. Baseline `fb993a7` **không** có byte đó.

Hệ quả đo lường nghiêm trọng hơn hệ quả chạy: `git`, `vitest` và `tsc` vẫn xử lý bình thường, nhưng **mọi lệnh `grep` thô trên file đó in `Binary file … matches` thay vì in dòng khớp** — nghĩa là mọi phép grep của `AC-01`, `AC-06`, `AC-18` chạy trên file này sẽ trả ra một câu không đọc được thành evidence, và người đọc nhanh có thể ghi nhận "có match" hoặc "không match" tuỳ ý. Đã sửa: NUL thay bằng đúng bốn ký tự cần thiết, `25616` → `25621` byte, grep trở lại chế độ text, numstat vẫn `228 / 59`, md5 thành `ba7742158b357840f0a590bb1a7e6cb1`.

Lần sửa **thứ nhất** thất bại im lặng: một `node -e` inline dùng chuỗi escape đã bị harness bóc một lớp gạch chéo, nên JS thay NUL bằng chính NUL — `25616` → `25616` byte, md5 không đổi. Nếu không đo lại byte count thì tôi đã báo "đã sửa" trên một no-op. Bản sửa thật viết trong file `.mjs` qua heredoc trích dẫn, dựng chuỗi bằng `Buffer.from([0x5c, 0x75, 0x30, 0x30, 0x30, 0x30])`, tức không nhờ một escape nào.

### 8.10 Ba bẫy đo, ghi lại để Tier 3 không lặp

1. **Đếm CR bằng `grep -c` cho kết quả sai trong shell này.** Nó báo "mọi dòng có CR" trên những file mà cách đo khác chứng minh có **0** byte CR — kể cả blob của `fb993a7`. Cách đáng tin: `tr -cd` với ký tự CR rồi `wc -c`. Giả thuyết CRLF đã bị bỏ; đối chiếu `--ignore-cr-at-eol` ở §8.2 xác nhận không dòng nào bị tính vì line-ending.
2. **Harness bóc một lớp gạch chéo khỏi lệnh inline.** `node -e` hay `perl -pe` viết trực tiếp trên dòng lệnh có thể chạy với escape khác cái mình gõ, và thất bại **im lặng**. Script phải nằm trong file, tạo bằng heredoc trích dẫn.
3. **Một byte NUL biến `grep` sang chế độ binary** (§8.9) ⇒ mọi phép grep evidence trên file đó vô giá trị mà không báo lỗi.

Bài học chung của cả ba: **phép đo phải tự chứng minh nó đã chạy đúng** — đếm byte trước/sau, md5, đối chiếu hai cách đo — vì cả ba bẫy đều fail theo hướng "trông như đã đo".

### 8.11 `DEV-09` — `mp1.contract.test.ts` không nằm trong danh sách §4.2, nhưng typecheck buộc phải sửa

`src/domains/job-board/mp1.contract.test.ts:102` truyền `industry: 'Kho vận'` vào `opts` của `listPublicJobProjection`. `STEP-12` bỏ khóa đó khỏi kiểu `opts` ⇒ `npm run typecheck` **EXIT=2**:

```
src/domains/job-board/mp1.contract.test.ts(102,7): error TS2353: Object literal may only specify known
properties, and 'industry' does not exist in type '{ q?: string | undefined; area?: string | undefined; ... }'.
```

Không có cách nào đóng `STEP-12` mà để file này nguyên: hoặc sửa nó, hoặc giữ lại `opts.industry` (vi phạm `RQ-18`), hoặc để typecheck đỏ (vi phạm `AC-13`). Đã chọn sửa **tối thiểu**: một khóa `opts` bị xoá, thay bằng hai dòng chú thích ghi lý do `DEC-13`; numstat `2 / 1`. **Ba nhóm assertion về DTO ở `:109`, `:126-127`, `:139-140` không sửa một ký tự** và vẫn PASS, vì nhãn `'Kho vận'` ở đó do văn bản của fixture suy ra, không do bộ lọc mang lại. Đây là cùng loại với `DEV-02`: danh sách §4.2 thiếu một file mà việc bắt buộc phải chạm.

### 8.12 Gate battery — đo trên **cây cuối**, sau tất cả bản sửa của round 2

| # | Lệnh | Exit | Output cốt lõi |
|---|---|---|---|
| 1 | `npx prisma validate` | `0` | `The schema at prisma/schema.prisma is valid` |
| 2 | `npm run typecheck` | `0` | `tsc --noEmit` im lặng |
| 3 | `npm run lint` | `0` | `✖ 494 problems (0 errors, 494 warnings)` — bằng mức nền round 1 |
| 4 | `npm run test:unit` | `0` | `Test Files 100 passed (100)` / `Tests 1505 passed (1505)` / `35.63s` |
| 5 | `npm run build` | `0` | `✓ Compiled successfully in 7.3s` cộng `✓ Generating static pages (29/29)` |
| 6 | 4 file test trọng tâm (§8.8) | `0` | `Tests 67 passed (67)` |
| 7 | `npm run test:integration` | `0` | **`ENV_BLOCKED`** — thiếu `DATABASE_URL_TEST`; `Integration lane NOT run — this is a BLOCKED state, not a PASS.` |
| 8 | `git status --porcelain` cộng `git rev-parse --short HEAD` | `0` | 12 path của task, không có gì staged; `HEAD` = `f599dd3` |

`1505` = `1504` của round 1 **cộng một** `it` mới ở `marketplace-inventory.static.test.ts` (khoá cấu trúc, §8.8). Ba cảnh báo `Unused eslint-disable` trong `npm run lint` **không** thuộc round này: cả mười file round 2 đã chạm đều có **0** chỉ thị `eslint-disable`.

`AC-12` tiếp tục là **`ENV_BLOCKED`** theo `BLK-01`, không đổi so với round 1. Tier 3 mở nó bằng cách trỏ `DATABASE_URL_TEST` và `TEST_DB_ADMIN` vào branch test `hrp_mp2_test`, **tuyệt đối không** vào `hrp-live`.

### 8.13 Trạng thái sau round 2

`STEP-11`..`STEP-16` `DONE`. `AC-18`, `AC-19`, `AC-06` bản `v1.2` và `AC-15` đo lại đều PASS; `AC-09` không hồi quy (§8.3); `AC-12` `ENV_BLOCKED`. **Không commit, không push, không deploy** — `HEAD` vẫn `f599dd3`, đúng `R-01` và cảnh báo 4 của §11.

Ba thứ round này **cố ý không chạm**, thuộc task tiếp nối theo `DEC-13`: hàm `inferIndustry`, hai khóa DTO `industry`/`jobType`, và hai chip ngành mà trang chi tiết của go-live-12 **đang in trên production** từ một giá trị suy diễn.

> Handoff status: READY_FOR_AUDIT

