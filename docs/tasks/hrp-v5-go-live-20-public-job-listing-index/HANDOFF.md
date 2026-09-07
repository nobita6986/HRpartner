# HANDOFF: hrp-v5-go-live-20-public-job-listing-index

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-20-public-job-listing-index` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.5` |
| Execution round | `1` |
| Status | `READY_FOR_AUDIT` |
| Executor | Tier 1 kiêm Tier 2, sếp uỷ quyền phiên 05/09/2026 vì Tier 1 chính đang viết plan V6 |
| Worktree | `C:\CodeApp\HrP\.claude\worktrees\gl20`, tách khỏi cây chính để không giành index với `hrp-v5-ui-01-new-ui-home-integration` |
| Baseline | `b68d25b` |
| Commit/push/deploy | KHÔNG. `R-01` giữ nguyên: round này chỉ `git add`, không commit, không push, không deploy |
| Evidence dir | `docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/` |
| Updated | `2026-09-06 01:30 Asia/Bangkok` |

## 1. Outcome Summary

Đường `/viec-lam` trước round này trả 404: nhóm route `app/(jobs)/` chỉ có `layout.tsx` và `[slug]/page.tsx`, không có `page.tsx` mức danh sách. Round này thêm trang danh sách là Server Component, đọc `searchParams` qua đúng một bộ phân giải, gọi rate-limit TRƯỚC khi mở đường DB, và phát `generateMetadata` với canonical sạch `/viec-lam`.

Bốn lane xanh với mã thoát 0: `npm run test:unit` (109 tệp, 1694 test), `npm run typecheck`, `npm run lint` (0 error, 483 warning), `npm run build` (route `/viec-lam` xuất hiện trong bảng route dưới dạng dynamic). Lane unit KHÔNG giảm test so với ảnh chụp giữa round: 107 tệp/1642 test lên 109 tệp/1694 test, cộng 2 tệp và cộng 52 test.

Tập path do round này gây ra là 56 path staged: 9 path mã cộng 47 path tài liệu trong slug. Một phép đo dẫn xuất (`step08-scope-subset.js`) rút allowlist từ chính bảng mục 4.1 của TASK rồi khẳng định TẬP CON, không path nào ngoài mục 4.1, và ba tiền tố bị cấm của `ui-01` đều đếm 0.

Hai hàng rào tĩnh được SIẾT chứ không nới: `public-detail.static.test.ts` mở đúng một khối `it(` cho hai dòng href, và khối điều tra dân số của `public-surface-limiter.static.test.ts` chuyển từ so số sang so TẬP, nên bản mới cấm nhiều hơn bản cũ. Cả hai đều có cửa sổ ĐỎ trước cửa sổ XANH trong `evidence/`.

Điểm cần Tier 3 đọc trước tiên: hợp đồng đã bump `v1.2` lên `v1.5` GIỮA round, do chính cổng `verify-task.ps1` bắt hai lỗi ở `v1.4` (`A-05` và `T-03`). Cửa sổ ĐỎ ấy được giữ nguyên ở `evidence/ac00-task-gate-v14.txt` cạnh cửa sổ XANH `ac00-task-gate-v15.txt`. Mục 5 khai đủ mười bảy `LIM-*`, trong đó đúng sáu cái là lời tự bác các mệnh đề của chính tôi. Cổng bàn giao `verify-handoff.ps1` chạy CUỐI CÙNG và trả `RESULT: PASS` exit 0 với 13 mã kiểm OK, không warning, lưu ở `evidence/ac00-handoff-gate.txt`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| STEP-01 | RQ-02, RQ-03, RQ-05, RQ-06 | `src/domains/job-board/public-listing.params.ts` 113 dòng thêm, `public-listing.params.test.ts` 259 dòng thêm | Test viết TRƯỚC: cửa sổ ĐỎ `ac03-params-red.txt` exit 1 vì `Failed to load url ./public-listing.params`, rồi XANH 23 test `ac03-params-green.txt` exit 0 | None |
| STEP-02 | RQ-12 | `src/domains/job-board/public-listing.labels.ts` 47 dòng thêm | Hai hàm nhãn phía server, chuỗi lấy y hệt baseline trang chủ, gồm `Lương thương lượng` | None |
| STEP-03 | RQ-01, RQ-04, RQ-07, RQ-08, RQ-10, RQ-11, RQ-16 | `app/(jobs)/viec-lam/page.tsx` 419 dòng thêm, tệp mới | Server Component, cặp cờ render mỗi thứ đúng một lần, `evaluateRateLimits` đứng trước `withPublicDb`, đúng một lần `listPublicJobProjection`, 0 lần `getPrisma()` trực tiếp | None |
| STEP-04 | RQ-06, RQ-09 | `app/(jobs)/viec-lam/page.tsx` hàm `generateMetadata` | `alternates.canonical` là đường sạch `/viec-lam` đúng 1 lần, `index: true` đúng 1 lần và chỉ khi `listingIsIndexable` | None |
| STEP-05 | RQ-14 | `app/components/GlobalNavbar.tsx` numstat `3 2` | `navLinks` 5 phần tử, thêm `/viec-lam` nhãn `Việc làm`, đổi nhãn `/` sang `Trang chủ`, tám số của `EV-14` giữ nguyên giá trị cũ | None |
| STEP-06 | RQ-15 | `app/(jobs)/viec-lam/[slug]/page.tsx` numstat `2 2`, `src/domains/job-board/public-detail.static.test.ts` numstat `3 2` | Hai dòng href đổi sang `/viec-lam`, 0 href trỏ `/`. Hàng rào ĐỎ trước ở `ac17-barrier-red.txt` exit 1 với `AssertionError: expected ... to match /href="\/"/`, XANH sau 23 test exit 0 | None |
| STEP-06B | RQ-17 | `src/shared/security/public-surface-limiter.static.test.ts` numstat `21 2` | Khối điều tra dân số chuyển từ so SỐ sang so TẬP. ĐỎ trước `ac21-census-red.txt` exit 1 với `expected [ Array(4) ] to have a length of 3 but got 4`, XANH sau 9 test exit 0. Đúng 1 hunk trong `git diff --cached -U0` | LIM-05: ô Execution của `RQ-17` ở mục 6.1 chỉ ghi `STEP-08` trần, `STEP-06B` nằm trong ghi chú ngoặc vì văn phạm cổng không nhận step có hậu tố chữ |
| STEP-07 | RQ-01, RQ-04, RQ-12, RQ-15, RQ-16 | `src/domains/job-board/public-listing.static.test.ts` 260 dòng thêm | Hàng rào tĩnh cho trang mới, chạy trong lane canonical. Mỗi AC-01 tới AC-18 có ít nhất một `it(` mang đúng mã AC, thu bằng `step07-verbose-both.txt` | LIM-01: tôi thay `Select-String` bằng `grep` cho các phép đếm, kèm đối chứng 12/12 |
| STEP-08 | RQ-17 | `docs/tasks/hrp-v5-go-live-20-public-job-listing-index/` 47 path staged | Bốn lane chạy đủ, output kèm mã thoát vào `evidence/`, `HANDOFF.md` này. Cổng hợp đồng chạy CUỐI, `RESULT: PASS` exit 0 | LIM-11: hợp đồng bump `v1.2` lên `v1.5` giữa round do chính cổng bắt lỗi |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-20-public-job-listing-index/TASK.md -RepoRoot .` | `RESULT: PASS`, exit 0, 9 trên 9 mã kiểm OK | `evidence/ac00-task-gate-v15.txt`. Cửa sổ ĐỎ của `v1.4` giữ nguyên ở `evidence/ac00-task-gate-v14.txt` exit 2 | None |
| — | `powershell -NoProfile -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v5-go-live-20-public-job-listing-index/TASK.md -RepoRoot .` | `RESULT: PASS`, exit 0, 13 mã kiểm OK, 0 warning, 0 error | `evidence/ac00-handoff-gate.txt`. Tệp giữ BA lần chạy nối tiếp, output NỐI chứ không ghi đè để không mất phụ lục: lần một trước khi tôi thêm chính hàng này, lần hai và lần ba trên đúng bản byte được giao. Lần ba truyền đường dẫn TUYỆT ĐỐI nên `H-01` đọc được cả `staged=True`, và nó là lần Tier 3 nên tin. Verdict `PASS` cùng 13 mã kiểm OK giống nhau ở cả ba dạng gọi | LIM-15: mã kiểm `H-15` tự bỏ qua vì TASK.md chưa có trong HEAD. LIM-16: một dòng phép đo trong chính tệp evidence này sai vì cwd, đã sửa ngay dưới nó. LIM-17: dòng CMD của lần một không phải chuỗi đã chạy, và `-RepoRoot` dạng dấu chấm khiến `H-01` không thấy được index |
| AC-01 | `grep -c 'use client' "app/(jobs)/viec-lam/page.tsx"` rồi đối chứng `grep -c 'use client' 'app/(portal)/page.tsx'` | 0 tại exit 1, đối chứng 1 tại exit 0 | `evidence/ac01-server-only.txt` | None |
| AC-02 | `grep -c "export const dynamic = 'force-dynamic'" "app/(jobs)/viec-lam/page.tsx"` và cùng dạng cho `runtime` | 1 và 1, cả hai exit 0 | `evidence/ac02-render-flags.txt` dòng 62 và 63 của tệp trang | None |
| AC-03 | `npm run test:unit src/domains/job-board/public-listing.params.test.ts` | ĐỎ trước exit 1, XANH sau 23 test exit 0 | `evidence/ac03-params-red.txt` và `evidence/ac03-params-green.txt` | None |
| AC-04 | `grep -cE` với alternation ba tên `salary`, `shiftType`, `jobType` trên `app/(jobs)/viec-lam/page.tsx`, nguyên văn lệnh ở dòng CMD thứ hai của tệp evidence, cộng lane unit cho `BANNED_PARAMS` | 0 tại exit 1, lane exit 0 | `evidence/ac04-param-allowlist.txt` | None |
| AC-05 | `grep -cE 'const [A-Za-z_$][A-Za-z0-9_$]* *(:[^=]+)? *= *\[' "app/(jobs)/viec-lam/page.tsx"` | 0 mảng hằng tại exit 1, destructure `facets` ở dòng 312 | `evidence/ac05-facets-source.txt` | None |
| AC-06 | `npm run test:unit` với 4 test `RQ-05/AC-06` trên `buildListingHref` | 4 dòng test XANH, exit 0 | `evidence/ac06-pagination.txt` | None |
| AC-07 | `npm run test:unit` với 3 test `RQ-06/AC-07`, cộng `grep -n 'offset' src/domains/job-board/public-listing.params.ts` | 3 dòng test XANH, exit 0 | `evidence/ac07-canonical-url.txt` | None |
| AC-08 | `grep -n` ba ký hiệu trên tệp trang, đọc số dòng, cộng lane unit cho `RQ-07/AC-08` | `evaluateRateLimits` ở dòng 94, nhánh trả sớm ở 101, `withPublicDb` ở 105, nên 94 nhỏ hơn 105, exit 0 | `evidence/ac08-ratelimit-order.txt` | LIM-12: AC viết "chỉ số ký tự", tôi đo bằng SỐ DÒNG. Hai đại lượng cùng thứ tự trong một tệp, nhưng khác đơn vị |
| AC-09 | `grep -n 'function ThrottledNotice' "app/(jobs)/viec-lam/page.tsx"` cộng lane unit cho `RQ-07/AC-09` | Dòng 135 khai `function ThrottledNotice()` không tham số, exit 0 | `evidence/ac09-throttled-no-leak.txt` | None |
| AC-10 | `grep -c 'withPublicDb('`, `grep -c 'listPublicJobProjection('`, `grep -c 'getPrisma()'`, `grep -c 'fetch('` trên tệp trang | 1, 1, 1, 0. Lần `getPrisma()` duy nhất nằm trong `withPublicDb(getPrisma()` ở dòng 105 nên là ĐỐI SỐ, không phải dùng trực tiếp. `/api/jobs` đếm 0 tại exit 1, đối chứng trên trang chủ đếm 1 tại exit 0 | `evidence/ac10-db-path.txt` | None |
| AC-11 | `grep -c 'canonical:'` và `grep -cE 'index: true'` trên tệp trang, cộng lane unit cho `RQ-09/AC-11` | 1 và 1, cả hai exit 0 | `evidence/ac11-metadata.txt` | None |
| AC-12 | `grep -c 'overview' "app/(jobs)/viec-lam/page.tsx"` rồi đối chứng trên `src/domains/job-board/public.service.ts` | 0 tại exit 1, đối chứng 9 tại exit 0 nên phép đếm không bị mù | `evidence/ac12-total-not-overview.txt` | None |
| AC-13 | `grep -n 'resetHref'` cùng `grep -n "LISTING_PATH = "` trên `src/domains/job-board/public-listing.params.ts`, cộng lane unit cho `RQ-11/AC-13` | Cả hai exit 0, lane XANH | `evidence/ac13-empty-state.txt` | None |
| AC-14 | `node "docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step07-label-parity.js"` | 7 chuỗi nhãn, sàn hàng rào là 6, `missing= []`, exit 0 | `evidence/ac14-label-parity.txt` | LIM-06: script so với `app/(portal)/page.tsx` ở WORKTREE, không ở baseline. Trang chủ đang bị `ui-01` viết lại nên phép so này sẽ lệch sau khi ui-01 vào, `R-06` và `Q-02` giữ dây nổ đó |
| AC-15 | `grep -c 'formatDeadlineDate('` và `grep -c 'toLocaleDateString'` cộng `Intl.DateTimeFormat` trên tệp trang | 1 tại exit 0, và 0 tại exit 1 nên không có hàm định dạng ngày nào bị định nghĩa lại | `evidence/ac15-helper-reuse.txt` | None |
| AC-16 | `npm run test:unit src/domains/job-board/public-ui-premium.static.test.ts` rồi `grep -n` bảng `navLinks` | 63 test XANH exit 0. `navLinks` 5 phần tử ở dòng 21 tới 25, có `/viec-lam` nhãn `Việc làm` và `/` nhãn `Trang chủ`. Tám số của `EV-14` là 0, 4, 3, 4, 4, 4, 1, 0 và chính 63 test ấy ghim chúng | `evidence/ac16-navbar.txt` | LIM-13: tôi KHÔNG đếm tay tám số đó. Bằng chứng là hàng rào XANH, tức nếu một số đổi thì lane phải đỏ. Đây là bằng chứng gián tiếp, và `R-05` cấm đúng cái đếm bằng mắt mà tôi tránh |
| AC-17 | `grep -c "href=\"/viec-lam\""` cùng `grep -c "href=\"/\""` trên `app/(jobs)/viec-lam/[slug]/page.tsx`, rồi `git diff --cached --numstat` cho riêng tệp đó | 2 tại exit 0, 0 tại exit 1, numstat `2 2`. Hàng rào cũ ĐỎ trước exit 1, XANH sau 23 test exit 0 | `evidence/ac17-back-links.txt`, `evidence/ac17-barrier-red.txt`, `evidence/ac17-barrier-green.txt` | None |
| AC-18 | `grep -cE` trên số target bấm, `grep -c 'min-h-11'`, `grep -c 'hrp-focus'`, cộng `grep -n 'htmlFor'` trên tệp trang | 9, 9, 9, cả ba exit 0, nên mỗi target bấm đều có chiều cao tối thiểu và lớp focus | `evidence/ac18-a11y.txt` | LIM-09: đây là phép đo TĨNH trên nguồn. Không có lane trình duyệt trong repo nên chiều cao 44px thực và thứ tự tab thực chưa được đo bằng máy, đợi `hrp-v5-test-01-browser-lane` |
| AC-19 | `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run build`, mỗi lệnh ghi lại mã thoát | Cả bốn exit 0. Lane unit 109 tệp 1694 test. Lint 0 error 483 warning. Build in route `/viec-lam` 168 B trong bảng route. Ảnh chụp giữa round là 107 tệp 1642 test nên delta là cộng 2 tệp cộng 52 test, KHÔNG giảm | `evidence/ac19-lane-unit.txt`, `evidence/ac19-typecheck.txt`, `evidence/ac19-lint.txt`, `evidence/ac19-build.txt`, `evidence/ac19-baseline-lane.raw.txt` | LIM-03: `ac19-baseline-lane.raw.txt` là ảnh chụp GIỮA round, không phải bản baseline nguyên vẹn. Hai lint warning ở `app/components/GlobalNavbar.tsx:59` đã đỏ tại baseline `b68d25b`, kiểm bằng `git show b68d25b:app/components/GlobalNavbar.tsx` |
| AC-20 | `git diff --cached --name-only` cho tập kết luận, rồi `node "docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-scope-subset.js"` rút allowlist từ chính bảng mục 4.1 | 56 path staged, gồm 9 path mã và 47 path tài liệu. `OUTSIDE_ALLOWED= []`, `VERDICT= TAP CON`, exit 0. Ba tiền tố của `ui-01` đều 0 | `evidence/ac20-scope.txt` | LIM-08: chính tệp evidence này là một tệp bị stage, nên lúc nó tự đo thì nó đang ở trạng thái `AM`. Số cuối cùng đo lại ở mục 4 của bàn giao này |
| AC-21 | `npm run test:unit src/shared/security/public-surface-limiter.static.test.ts` cho cửa sổ ĐỎ và XANH, rồi `git diff --cached -U0` cho riêng tệp ấy và đếm dòng mở hunk | ĐỎ exit 1 với `expected [ Array(4) ] to have a length of 3 but got 4`, XANH 9 test exit 0. Đúng 1 hunk, numstat `21 2` | `evidence/ac21-census-red.txt`, `evidence/ac21-census-green.txt`, `evidence/ac21-single-hunk.txt` | LIM-04: dạng KHÔNG có `--cached` trả về RỖNG vì `STEP-08` đã `git add` tệp ấy. Cả hai dạng giữ trong tệp evidence để thấy vì sao |

## 4. Changed Deliverables

Đo bằng `git diff --cached --numstat` cộng `git status --porcelain`, cả hai giới hạn vào `app` và `src`.

| Path | Trạng thái index | numstat | Vai trò |
|---|---|---|---|
| `app/(jobs)/viec-lam/page.tsx` | A | `419 0` | Trang danh sách, Server Component, tệp mới |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | M | `2 2` | Hai dòng href quay lại đổi sang `/viec-lam` |
| `app/components/GlobalNavbar.tsx` | M | `3 2` | Thêm phần tử `navLinks` cho `/viec-lam`, đổi nhãn `/` |
| `src/domains/job-board/public-listing.params.ts` | A | `113 0` | Bộ phân giải và ghép URL cho danh sách |
| `src/domains/job-board/public-listing.labels.ts` | A | `47 0` | Hai hàm nhãn phía server |
| `src/domains/job-board/public-listing.params.test.ts` | A | `259 0` | Test viết trước cho bộ phân giải, 23 test |
| `src/domains/job-board/public-listing.static.test.ts` | A | `260 0` | Hàng rào tĩnh cho trang mới |
| `src/domains/job-board/public-detail.static.test.ts` | M | `3 2` | Mở đúng một khối `it(`, siết chứ không nới |
| `src/shared/security/public-surface-limiter.static.test.ts` | M | `21 2` | Điều tra dân số chuyển từ so số sang so tập |

Tài liệu: 47 path dưới `docs/tasks/hrp-v5-go-live-20-public-job-listing-index/` tại thời điểm chụp `AC-20`. Đọc con số ấy cho đúng: nó là `TASK.md` cộng 46 tệp trong `evidence/`, và KHÔNG gồm `HANDOFF.md` này vì lúc đó bản bàn giao còn untracked. Không có path nào ngoài mục 4.1, đo bằng `node "docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-scope-subset.js"` với `OUTSIDE_ALLOWED= []` tại exit 0.

Số staged ĐỔI trong chính round này theo đúng thứ tự thao tác, và cả bốn con số đều thật: 44 lúc chụp `npm run build`, 56 lúc chụp `AC-20`, 62 sau lần `git add` chốt, rồi 63 sau khi stage evidence của chính cổng bàn giao. Con số 63 là 9 path mã cộng 54 path tài liệu. Chuỗi này DỪNG ở 63 vì mọi lần sửa tiếp chỉ đổi BLOB của path đã có, không sinh path mới. Lệnh dùng là `git add -- docs/tasks/hrp-v5-go-live-20-public-job-listing-index` chứ KHÔNG phải `git add -A`. Phép đo ở `evidence/step08-final-scope.txt` cho mốc 62 và phần phụ lục của `evidence/ac00-handoff-gate.txt` cho mốc 63. Cả hai mốc đều chạy lại chính phép đo dẫn xuất của `AC-20` và đều ra `OUTSIDE_ALLOWED= []` cùng `VERDICT= TAP CON` tại exit 0, ba tiền tố của `ui-01` vẫn đếm 0, `HANDOFF.md` ở trạng thái `A` nên không một buffer editor rỗng nào xoá được nó, và trong slug còn 0 tệp untracked.

## 5. Deviations

Không có `BLK-*` và không có `DEV-*`: mọi STEP chạy đúng như TASK viết, không lệch thứ tự, không bỏ bước. Phần dưới là các `LIM-*`, tức giới hạn của PHÉP ĐO chứ không phải lệch của việc làm. Đúng sáu hàng mang loại `Tự bác`, là `LIM-02`, `LIM-06`, `LIM-10`, `LIM-14`, `LIM-16` và `LIM-17`, mỗi hàng bác một mệnh đề do chính tôi viết ra trước đó trong round này.

| ID | Loại | Nội dung | Ảnh hưởng tới audit |
|---|---|---|---|
| LIM-01 | Dụng cụ | TASK viết phép đếm bằng `Select-String`, tôi chạy `grep -c`. Lý do: `Select-String` không trả mã thoát tiến trình nên không ghi được `EXIT=` vào evidence, còn `grep -c` trả 1 khi đếm ra 0 và đó là tín hiệu đọc được. Đối chứng 12 trên 12 phép đếm cho cùng con số ở cả hai dụng cụ | Tier 3 chạy lại bằng `grep` sẽ khớp. Nếu Tier 3 chạy bằng `Select-String` thì con số vẫn khớp nhưng mã thoát sẽ luôn 0, đừng đọc đó là mâu thuẫn |
| LIM-02 | Tự bác | Docblock ở đầu `src/shared/security/public-surface-limiter.static.test.ts:10` vẫn ghi ý cũ "con số 3", trong khi thân test đã chuyển sang so TẬP và tập ấy có 4 phần tử. Comment lạc hậu, mã thì đúng | Không lệch hành vi, nhưng người đọc comment sẽ hiểu sai. Tôi KHÔNG sửa trong round này vì `AC-21` khoá đúng 1 hunk cho tệp đó, thêm hunk thứ hai là làm đỏ chính AC của mình. Đề nghị Tier 1 đưa vào task sau |
| LIM-03 | Phép đo | `evidence/ac19-baseline-lane.raw.txt` là ảnh chụp lane GIỮA round (107 tệp, 1642 test), không phải lane tại `b68d25b` nguyên vẹn. Hai lint warning ở `app/components/GlobalNavbar.tsx:59` đã đỏ tại `b68d25b`, kiểm bằng `git show b68d25b:app/components/GlobalNavbar.tsx` | Delta lane vẫn đọc được theo hướng CỘNG. Nếu Tier 3 cần sàn thật tại baseline thì phải checkout `b68d25b` ra cây riêng rồi chạy lại, việc đó ngoài phạm vi round này |
| LIM-04 | Dụng cụ | `AC-21` viết `git diff -U0`. Dạng KHÔNG có `--cached` trả về RỖNG vì `STEP-08` đã `git add` tệp ấy trước khi phép đo chạy. Tôi giữ cả hai dạng trong `evidence/ac21-single-hunk.txt` | Con số 1 hunk lấy từ dạng `--cached`. Tier 3 chạy dạng trần sẽ thấy rỗng, đó là ĐÚNG, không phải bằng chứng mất hunk |
| LIM-05 | Văn phạm cổng | Tôi đặt tên bước `STEP-06B`. Cổng bàn giao thu token `STEP-\d{2,}` nên `STEP-06B` bị đọc thành `STEP-06`, và ô Execution của `RQ-17` ở mục 6.1 TASK chỉ ghi `STEP-08` trần với `STEP-06B` trong ngoặc | Không có STEP nào của TASK bị thiếu hàng trong mục 2. Nhưng nếu Tier 3 đếm bước theo tên riêng thì sẽ thấy 9 hàng cho 8 token, đó là do hậu tố chữ |
| LIM-06 | Tự bác | `evidence/step07-label-parity.js` so nhãn với `app/(portal)/page.tsx` ở WORKTREE, KHÔNG ở `b68d25b`. Tôi từng viết trong TASK rằng đây là phép so với baseline; phép so thật không phải vậy | Trang chủ đang bị `ui-01` viết lại, nên phép so này sẽ lệch ngay khi ui-01 vào. `R-06` và `Q-02` giữ dây nổ đó. Tier 3 đừng nhận `AC-14` làm bằng chứng bền |
| LIM-07 | Phép đo | Các phép thử đột biến (sửa một ký tự để xem hàng rào có đỏ không) được hoàn nguyên bằng cách ghi lại nguyên văn rồi kiểm `git diff --numstat` RỖNG. Dưới `core.autocrlf` thì so `wc -c` giữa cây và blob là VÔ HIỆU nên tôi không dùng số byte làm bằng chứng hoàn nguyên | Bằng chứng hoàn nguyên là numstat rỗng, không phải số byte. Tier 3 kiểm lại bằng `git diff` chứ đừng bằng `wc -c` |
| LIM-08 | Tự quy chiếu | `evidence/ac20-scope.txt` nói về TẬP STAGED lại chính là một tệp bị stage, nên lúc nó tự đo thì nó đang ở trạng thái `AM`. Dòng `AM` duy nhất trong phép đo ấy là CHÍNH NÓ, không phải một path lạ | Con số kết luận của phạm vi là 56 tại thời điểm `AC-20`, và con số cuối ở `evidence/step08-final-scope.txt`. Tier 3 đọc hai con số theo thứ tự thời gian, đừng đọc là mâu thuẫn |
| LIM-09 | Vùng không đo được | `AC-18` là phép đo TĨNH trên nguồn: 9 target bấm, 9 lần `min-h-11`, 9 lần `hrp-focus`. Repo không có lane trình duyệt nên chiều cao 44px thực tế và thứ tự tab thực tế chưa được máy nào đo | Tier 3 KHÔNG nên nhận `AC-18` là bằng chứng a11y hành vi. Món đó thuộc `hrp-v5-test-01-browser-lane` |
| LIM-10 | Tự bác | Tôi đếm test bằng chuỗi con và ra 21 cho `public-listing.params.test.ts`. Runner trả 23. Con số đúng là 23 vì `grep` bắt cả những lần `(` không mở một khối test | Mọi con số test trong bàn giao này lấy từ dòng tổng kết của runner. Nếu Tier 3 đếm `it(` bằng grep sẽ ra số khác, và số của grep là số sai |
| LIM-11 | Hợp đồng dịch giữa round | Spec bump `v1.2` lên `v1.5` GIỮA round, do chính `verify-task.ps1` bắt hai lỗi ở `v1.4`. Cửa sổ ĐỎ giữ ở `evidence/ac00-task-gate-v14.txt` exit 2 cạnh `evidence/ac00-task-gate-v15.txt` exit 0 | Bàn giao này khai `v1.5` để khớp TASK hiện hành. Tier 3 audit theo `v1.5`. Mọi evidence sinh trước lúc bump vẫn hợp lệ vì `v1.3` tới `v1.5` chỉ sửa văn phạm AC, không đổi hành vi nào của mã |
| LIM-12 | Đơn vị đo | `AC-08` viết "chỉ số ký tự", tôi đo bằng SỐ DÒNG: `evaluateRateLimits` dòng 94, nhánh trả sớm 101, `withPublicDb` 105. Hai đại lượng cùng thứ tự trong một tệp nhưng khác đơn vị | Kết luận thứ tự vẫn đúng. Nếu Tier 3 muốn đúng đơn vị của AC thì phải đo `Select-String` với offset ký tự, và kết quả sẽ cùng chiều |
| LIM-13 | Bằng chứng gián tiếp | Tám số của `EV-14` được ghim bởi 63 test XANH của `public-ui-premium.static.test.ts`, tôi KHÔNG đếm tay tám số đó. `R-05` cấm đúng cái đếm bằng mắt mà tôi tránh | Đây là bằng chứng gián tiếp: nếu một số đổi thì lane phải đỏ. Tier 3 muốn trực tiếp thì chạy chính tệp test ấy với `--reporter=verbose` |
| LIM-14 | Tự bác | Ghi chú 3 trong `evidence/ac00-task-gate-v15.txt` do tôi viết đoán hai điều, và cả hai bị phép đo bác: `T-02` không phải "chỉ nhận tham chieu có đường dẫn" mà là chỉ nhận path bắt đầu bằng một trong mười tiền tố, và số đếm KHÔNG tăng sau khi tôi qualify mọi tham chiếu, nó vẫn là 23. Phụ lục 1 của chính tệp ấy giữ nguyên cả lời đoán sai lẫn phép đo bác nó | Hệ quả phải khai: mọi tham chiếu dạng `.ai-pipeline/**:NNN` trong TASK.md nằm NGOÀI vùng `T-02` quét, nên chúng không được cổng xác nhận. Mục 3 của tệp evidence ấy tự trích ba dòng ra để Tier 3 không phải tin lời tôi |
| LIM-15 | Cổng không kiểm | Cổng bàn giao có một mã kiểm so TASK.md với bản trong HEAD để bắt việc Tier 2 ghi vào field của Tier 1. Round này TASK.md ở trạng thái `A`, tức chỉ có trong index và chưa có trong HEAD, nên mã kiểm ấy tự bỏ qua trong im lặng | Tôi có sửa field của Tier 1 trong TASK.md, và tôi khai ra ở đây thay vì để cổng bắt: đúng ba field `Spec version`, `Status` và changelog. Việc đó hợp lệ vì phiên này sếp uỷ quyền tôi kiêm cả Tier 1, nhưng Tier 3 phải biết cổng KHÔNG kiểm hộ chỗ này |
| LIM-16 | Tự bác | Trong phụ lục của `evidence/ac00-handoff-gate.txt` tôi chạy phép đếm path mã từ TRONG thư mục `evidence/` và nó trả 0, còn lời ghi chú tôi viết cạnh nó lại đoán "vẫn đúng 9". Ghi chú ấy sai. Lý do thật: pathspec của git giải TƯƠNG ĐỐI theo cwd, nên `-- app src` từ `evidence/` không khớp path nào. Tôi giữ nguyên dòng sai làm dấu vết rồi đo lại từ gốc worktree, ra 9 kèm danh sách đủ chín path | Con số 9 đúng, nhưng bài học quan trọng hơn con số: mọi phép đo phạm vi phải chạy từ GỐC worktree. Nếu Tier 3 thấy một phép đếm phạm vi trả 0 thì kiểm cwd trước khi kết luận có path biến mất |
| LIM-17 | Tự bác | Dòng `=== CMD:` mà tôi viết tay dưới lần chạy THỨ NHẤT của cổng bàn giao KHÔNG phải chuỗi ký tự đã sinh ra output đó. Bằng chứng nằm trong chính tệp: dòng `subject:` của lần một in đường dẫn TUYỆT ĐỐI, còn dòng CMD tôi ghi lại dùng dạng tương đối. Lần một cũng vì thế mà đọc được `staged=True`, còn lần hai chạy đúng dạng tương đối thì trả `staged=False` trên cùng một tệp đã stage. Nguyên nhân đọc thẳng từ mã kiểm `gate-lib.ps1:82-92`: hàm dựng path tương đối chỉ cắt tiền tố khi `RepoRoot` là đường dẫn tuyệt đối; với `RepoRoot` là dấu chấm nó trả nguyên đường dẫn tuyệt đối, không bao giờ khớp danh sách của `git diff --cached --name-only` | Trạng thái thật của bản bàn giao là ĐÃ STAGE, đo độc lập bằng `git status --porcelain -- docs/tasks/hrp-v5-go-live-20-public-job-listing-index/HANDOFF.md` trả `A ` với cột thứ hai là dấu cách. `staged=False` của lần hai là hiện tượng của dụng cụ, không phải trạng thái. Lần chạy THỨ BA trong cùng tệp evidence dùng đường dẫn tuyệt đối, có dòng CMD đúng nguyên văn, và là lần Tier 3 nên tin. Tôi KHÔNG sửa `gate-lib.ps1` vì bộ cổng là tài sản luồng khác và mục 4.2 cấm chạm |


## 6. Evidence Index

`evidence/` có 52 tệp sau khi cổng bàn giao chạy xong. Bảng dưới gom theo nhóm chứ không dán lại từng tên, vì mục 3 đã trỏ từng tệp theo từng AC.

| Nhóm | Tệp | Nội dung |
|---|---|---|
| Hai cổng | `evidence/ac00-task-gate-v12.txt`, `evidence/ac00-task-gate-v14.txt`, `evidence/ac00-task-gate-v15.txt`, `evidence/ac00-handoff-gate.txt` | Ba lần chạy `verify-task.ps1` theo ba phiên bản spec, `v1.4` là cửa sổ ĐỎ exit 2 và `v1.5` là XANH exit 0 kèm phụ lục tự bác Ghi chú 3. Tệp thứ tư là cổng bàn giao, 13 mã kiểm OK exit 0, kèm phụ lục mốc phạm vi 63, một phép đo của tôi bị tự sửa (`LIM-16`), và ba lần chạy nối tiếp mà lần ba là lần nên tin (`LIM-17`) |
| Một AC một tệp | `evidence/ac01-server-only.txt` tới `evidence/ac18-a11y.txt` | Mỗi tệp mở bằng dòng `--- CMD:` nguyên văn và đóng bằng `=== EXIT=`. Các cặp ĐỎ trước XANH sau nằm ở `ac03-params-*`, `ac17-barrier-*` và `ac21-census-*` |
| Bốn lane | `evidence/ac19-lane-unit.txt`, `evidence/ac19-typecheck.txt`, `evidence/ac19-lint.txt`, `evidence/ac19-build.txt` | Bốn lane với mã thoát 0. `ac19-baseline-lane.raw.txt` là ảnh chụp GIỮA round, xem `LIM-03` |
| Phạm vi | `evidence/ac20-scope.txt`, `evidence/ac20-scope.stage1.txt`, `evidence/step08-status-porcelain.txt`, `evidence/step08-final-scope.txt` | Tập kết luận, tập loại trừ và phép đo phạm vi cuối cùng sau lần `git add` chốt. Ba con số 44, 56 và 62 nằm ở ba chỗ khác nhau theo ba thời điểm khác nhau |
| Script sinh evidence | `step07-emit-evidence.sh`, `step07-label-parity.js`, `step08-emit-scope.sh`, `step08-scope-subset.js`, `step08-final-scope.sh`, và bốn `step08-append-*.sh` | Tệp nguồn của các phép đo dẫn xuất. Chạy lại được từ gốc worktree, nên Tier 3 tái lập không cần tin lời tôi. Lưu ý `step08-scope-subset.js` RÚT allowlist từ chính bảng mục 4.1 của TASK, không dán tay |
| Hàng rào và đột biến | `evidence/step07-barrier-green.txt`, `evidence/step07-barrier-mutation-red.txt`, `evidence/step07-mutation-revert.txt`, `evidence/step07-verbose-both.txt`, `evidence/step07-select-string-crosscheck.txt`, `evidence/step02-03-unit-lane.txt` | Phép thử đột biến cho hàng rào tĩnh, bằng chứng hoàn nguyên bằng numstat rỗng (`LIM-07`), bản verbose để soi từng `it(`, và đối chứng 12 trên 12 giữa `grep` và `Select-String` (`LIM-01`) |

## 7. Execution Round History

| Round | Spec khi chạy | Kết cục | Ghi chú |
|---|---|---|---|
| 1 | `v1.2` khi bắt đầu, `v1.5` khi kết thúc | `READY_FOR_AUDIT` | Round duy nhất. Spec dịch giữa round vì chính `verify-task.ps1` bắt `A-05` và `T-03` ở `v1.4`, xem `LIM-11`. Bốn lane xanh, 21 AC đều có phép đo, không có `BLK-*` và không có `DEV-*`. Hai cổng chạy CUỐI: hợp đồng `RESULT: PASS` exit 0 với 9 mã kiểm OK, bàn giao `RESULT: PASS` exit 0 với 13 mã kiểm OK và 0 warning |

> Handoff status: READY_FOR_AUDIT




