# TASK: hrp-v5-go-live-20-public-job-listing-index

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-20-public-job-listing-index` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.5` |
| Status | `ACCEPTED` — Tier 3 audit round 1 verdict `PASS`; 21/21 AC đạt, C-01..C-10 `DONE`, không có P0/P1/P2 mở |
| Planner | Tier 1, phiên 05/09/2026 |
| Executor | Tier 2 |
| Auditor | Tier 3, ngữ cảnh độc lập |
| Baseline | `b68d25b` — cùng mốc với `hrp-v5-ui-01-new-ui-home-integration`. Hai hợp đồng KHÔNG giao nhau một path nào (đo ở `EV-11` và mục 4.2), nên baseline này đo đúng cho mọi path của task này. Nếu ui-01 đã được Tier 1 commit scoped trước lúc giao, Tier 1 bump ô này sang commit đó và ghi lý do ở mục 10 |
| Modules | `app/(jobs)/viec-lam/page.tsx` tạo mới, `src/domains/job-board/public-listing.params.ts` và `src/domains/job-board/public-listing.labels.ts` tạo mới, hai tệp test mới dưới `src/domains/job-board/`, `app/components/GlobalNavbar.tsx`, và `app/(jobs)/viec-lam/[slug]/page.tsx` chỉ đích của hai link quay lại |
| ADR references | None |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Đã đóng. Theo dõi R-06/Q-02 parity nhãn lương sau các thay đổi public UI tiếp theo |
| Updated | `2026-09-05 23:55 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Đường `/viec-lam` — hôm nay trả 404 vì nhóm route chỉ có `layout.tsx` và `[slug]/page.tsx` — trở thành trang danh sách việc làm THẬT: render phía server, có bộ lọc chạy bằng URL, có phân trang bằng liên kết, và mỗi trạng thái lọc là một địa chỉ chia sẻ được, đánh dấu trang được, quay-lại-được. Đây là thứ trang chủ `/` không làm được: nó là một đảo `'use client'` không mang một byte trạng thái nào trên URL, nên kết quả tìm kiếm ở đó không chia sẻ được và không có gì để index.

Thanh điều hướng công khai tách hai việc: `/` là trang chủ, `/viec-lam` là danh sách việc làm. Hai link "Quay lại danh sách việc làm" của trang chi tiết trỏ đúng vào danh sách thật thay vì trỏ về trang chủ.

### Non-goals

- KHÔNG dời tìm kiếm hay phân trang ra khỏi `app/(portal)/page.tsx`. Trang chủ giữ nguyên đảo client của nó — lý do là phép đo `EV-11`, không phải sự e dè. Việc dời là `Q-01`, của sếp.
- KHÔNG chạm `app/globals.css`, KHÔNG thêm token, KHÔNG thêm khối CSS. Trang mới style bằng token đang sống và Tailwind, đúng lối trang chi tiết.
- KHÔNG chạm `src/domains/job-board/public.service.ts`, `app/api/jobs/route.ts` hay bất kỳ tệp nào dưới `app/api/`. Không truy vấn mới, không cột mới, không facet mới.
- KHÔNG tạo `app/sitemap.ts` hay `app/robots.ts`. Hôm nay repo không có tệp nào trong hai tệp đó (`EV-19`) và dựng chúng là một quyết định riêng, `Q-03`.
- KHÔNG mở rộng `matcher` của `middleware.ts`. Trang mới nằm ngoài matcher đúng như trang chi tiết hôm nay (`EV-17`).
- KHÔNG thêm bộ lọc lương. `salary` của mockup không có vị từ nào chống lưng ở cả route lẫn service (`EV-08`), xem `DEC-03`.
- KHÔNG dựng dữ liệu công ty, logo hay con số thu nhập. Không cột nào của `PublicJobDto` mang tên công ty.
- KHÔNG commit, KHÔNG push, KHÔNG deploy (`R-01`).

## 2. Evidence

Mọi phép đo dưới đây chạy trên baseline `b68d25b`. Cách đọc một tệp ở baseline là `git show b68d25b:PATH`, đếm dòng bằng `Measure-Object -Line`.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | `git ls-files -- "app/(jobs)/viec-lam"` | Trả đúng hai đường: `layout.tsx` và `[slug]/page.tsx`. Không có `page.tsx` index nào | `/viec-lam` hôm nay 404. Task này TẠO MỚI một tệp trang, không refactor trang có sẵn |
| EV-02 | `app/(jobs)/viec-lam/layout.tsx:24`, toàn tệp 24 dòng, đọc bằng `Get-Content` | Layout gắn `GlobalNavbar` và `GlobalFooter` trong khung `flex flex-col min-h-screen bg-background`; phạm vi cố ý dừng ở `viec-lam` vì `/track` dùng layout trong suốt (go-live-12 `DEC-08`) | Trang mới thừa hưởng khung công khai với 0 dòng layout. CẤM gắn lại navbar hay footer trong `page.tsx` |
| EV-03 | `app/(jobs)/viec-lam/[slug]/page.tsx:62` và `:63`, đọc bằng `Get-Content` | `export const dynamic = 'force-dynamic'` rồi `export const runtime = 'nodejs'` | Cặp cờ render-server đã được chứng minh ở go-live-12. Trang mới sao đúng cặp này, `AC-06` |
| EV-04 | `app/(jobs)/viec-lam/[slug]/page.tsx:90`, đọc bằng `Get-Content` | Loader bọc bởi `cache` của react: gọi `evaluateRateLimits` với bucket `RATE_LIMIT_RULES.JOB_BROWSE` TRƯỚC, và chỉ khi `outcome.kind` bằng `allowed` mới vào `withPublicDb` | Thứ tự rate-limit-trước-DB và fail-closed là bắt buộc với trang mới, `AC-07` |
| EV-05 | `src/shared/security/rate-limit-port.ts:35`, comment ở `:31`, đọc bằng `Get-Content` | `JOB_BROWSE` là `limit: 120`, `windowSec: 60`, `subject: 'ip'`; comment nói rõ bucket này DÙNG CHUNG cho danh sách và chi tiết, "một bucket, không phải 2 lần 120" | Trang mới dùng lại đúng bucket đó nên ngân sách duyệt vẫn là 120/60s/IP. CẤM thêm rule mới, `DEC-05` |
| EV-06 | `src/domains/job-board/public.service.ts:574`, đọc bằng `Get-Content` | `listPublicJobProjection(tx, opts)` nhận `q`, `area`, `shift`, `shiftTypes`, `jobTypes`, `offset`, `limit`; kẹp `offset` không âm và `limit` vào khoảng 1..50 | Không cần truy vấn mới. `limit` là hằng của server, không đọc từ URL, `DEC-04` |
| EV-07 | `src/domains/job-board/public.service.ts:127` và `:90`, đọc bằng `Get-Content` | `PublicJobListResult` mang `jobs`, `nextOffset`, `total`, `facets`, `overview`. `PublicJobFacets` chỉ có hai trường `areas` và `shifts` | Phân trang lấy từ `nextOffset` và `total`; option của hai select lấy từ `facets`, CẤM hard-code danh sách, `AC-05` và `AC-09` |
| EV-08 | `app/api/jobs/route.ts:16` cộng `src/domains/job-board/public.service.ts:574`, đọc bằng `Get-Content` | Route đọc `q`, `area`, `shift`, `getAll('shiftType')`, `getAll('jobType')`, `offset`, `limit`. Không tệp nào có tham số tên `salary` | Bộ lọc lương không có vị từ nào chống lưng ở cả hai tầng nên nó là Non-goal, `DEC-03` |
| EV-09 | `src/domains/job-board/public.service.ts:119`, đọc bằng `Get-Content` | `PublicJobOverview` gồm `totals`, `areaCounts`, `shiftCounts`, `newest`, `topPaid`, và được tính TRƯỚC khi lọc, TRƯỚC khi phân trang | CẤM dùng con số của `overview` làm nhãn cho tập đã lọc; nhãn kết quả phải đọc `total`, `AC-11` |
| EV-10 | `src/domains/job-board/public-detail.meta.ts:34` và `:39`, toàn tệp 82 dòng, đọc bằng `Get-Content` | `publicJobDetailPath(slug)` trả đường `/viec-lam/` cộng `encodeURIComponent(slug)`; `formatDeadlineDate(iso)` trả dd/MM/yyyy theo UTC. Cả hai đã `export` | Trang mới IMPORT hai hàm này. Sao lại chúng là vi phạm, `AC-13` |
| EV-11 | `app/(portal)/page.tsx:1`, `:85`, `:101`, toàn tệp 1120 dòng, đọc bằng `Get-Content` | Tệp mở bằng `'use client'`. `summaryLabel` ở `:85` và `salaryLabel` ở `:101` là hàm PRIVATE trong chính tệp đó, không `export` | Server Component KHÔNG import được hai hàm này. Phải tách bản dùng chung sang tệp mới, `DEC-06` và `AC-12` |
| EV-12 | `app/(portal)/page.tsx:631`, đọc bằng `Get-Content` | Trang chủ nạp dữ liệu bằng `fetch` vào `/api/jobs` với `cache: 'no-store'` bên trong `useEffect` | Trạng thái lọc của trang chủ không nằm trên URL nên không chia sẻ được, không index được. Đây là lý do tồn tại của trang mới |
| EV-13 | `src/domains/applications/marketplace-inventory.static.test.ts:266`, toàn tệp 400 dòng, chạy bằng `npm run test:unit` | Hàng rào ĐANG XANH ghim UI tìm kiếm của trang chủ: `params.set('q', q)`, `params.set('area', ...)`, `params.set('shift', ...)`, và hai select nhận `options` từ `facets.areas` cùng `facets.shifts`. `:331` ghim phân trang trang chủ đọc `nextOffset` thật | DỜI tìm kiếm khỏi `/` sẽ làm một hàng rào xanh thành ĐỎ. Nên task này THÊM bề mặt, không DỜI, `DEC-01` và `Q-01` |
| EV-14 | `src/domains/job-board/public-ui-premium.static.test.ts:227`, `:249`, `:302`, `:303`, `:307`, `:702`, `:721`, `:748`, toàn tệp 855 dòng, chạy bằng `npm run test:unit` | Hàng rào navbar đếm literal NGUỒN nằm bên trong một thân `navLinks.map` duy nhất: `outline-none` bằng 0, `hrp-focus` bằng 4, `onMouseEnter` bằng 3, `currentTarget.style.backgroundColor` bằng 4, `transition-colors` bằng 4, `min-h-11` bằng 4, `hrp-skip` bằng 1, `max-w-7xl` bằng 0. Tám số, không bảy: `v1.1` bỏ sót số ở `:303` dù nó nằm cùng khối `it(` với `:302` | Thêm một phần tử vào mảng `navLinks` KHÔNG đổi bất kỳ số nào trong tám số trên vì literal chỉ xuất hiện một lần trong thân map. `AC-16` phải chứng minh lại điều này bằng lane test, không suy luận |
| EV-15 | `app/components/GlobalNavbar.tsx:20`, toàn tệp 359 dòng, đọc bằng `Get-Content` | `navLinks` có bốn phần tử; phần tử đầu là href `/` với nhãn `Việc làm`. `activeNavHref(pathname)` dùng `navLinks.find` và `/` chỉ khớp khi khớp CHÍNH XÁC, tài liệu go-live-15 RQ-09 ghi "bốn href không lồng nhau, trả về nhiều nhất một href" | Thêm href `/viec-lam` là an toàn cho hàm active vì không lồng vào `/`. Nhãn `/` phải đổi sang `Trang chủ`, nếu không hai mục cùng tên. Số bốn trong comment phải cập nhật theo, `AC-14` |
| EV-16 | `src/domains/job-board/public-detail.static.test.ts:148` tới `:151`, toàn tệp 232 dòng với 23 khối `it(`, chạy bằng `npm run test:unit` | Khối `it(` ấy có HAI khẳng định, không một. Khẳng định thứ nhất ở `:149` đòi chuỗi `Quay lại danh sách việc làm` có mặt. Khẳng định thứ hai ở `:150` là `expect(page).toMatch(...)` với mẫu regex khớp đúng năm ký tự `href`, dấu bằng, ngoặc kép, gạch chéo, ngoặc kép — tức nó GHIM ĐÍCH của link về `/`. Đo `grep -n` mẫu đó trên trang chi tiết trả đúng hai dòng, `:154` và `:191`, cả hai đều là dòng mà `STEP-06` phải đổi | Đổi đích hai link làm hàng rào này ĐỎ, không giữ nó xanh. `v1.1` kết luận ngược vì đọc `:149` rồi dừng một dòng trước chỗ quyết định. `RQ-15` và `RQ-17` do đó xung đột dưới mục 4.2 của `v1.1`; `v1.2` mở đúng khối `it(` ấy cho `STEP-06` và SIẾT khẳng định thay vì nới, xem `AC-17` |
| EV-17 | `app/(jobs)/viec-lam/[slug]/page.tsx:154` và `:191` cộng `:156` và `:193`, đo bằng `grep -n` với mẫu href gốc | Đúng HAI chỗ có href trỏ `/`, cả hai là link quay lại, và cả hai đã tô chữ bằng `var(--color-primary-dark)` | Chỉ hai dòng href phải đổi. Màu đã đúng nên KHÔNG chạm style, `AC-16` |
| EV-18 | `middleware.ts:134`, toàn tệp 273 dòng, đọc bằng `Get-Content` | `config.matcher` liệt kê `/`, `/vendor`, `/worker`, `/ctv`, và bốn nhánh `/api`. Không có `/viec-lam` | Trang mới nằm NGOÀI matcher, đúng như trang chi tiết hôm nay. Non-goal cấm mở rộng matcher, `AC-17` |
| EV-19 | `Test-Path app/sitemap.ts` và `Test-Path app/robots.ts` | Cả hai trả `False`; repo hôm nay không có tệp nào trong hai tệp đó | Chỉ thị `robots` phải phát ở cấp trang bằng `metadata`. Dựng sitemap là quyết định riêng, `Q-03` |
| EV-20 | `app/(portal)/page.tsx:187` là comment nguồn, cộng `grep -rn "color-primary-dark"` cho ra 4 chỗ trong `app/(jobs)/viec-lam/[slug]/page.tsx` | Comment ghi thẳng: chọn `--color-primary-dark` vì `--color-primary` được ĐO là dưới 3:1 trên nền này. Bề mặt công khai đã theo đúng lối đó | Chữ và link của trang mới CẤM dùng `color: var(--color-primary)`; dùng `--color-primary-dark`, `AC-18` |
| EV-21 | `src/shared/auth/with-public-db.ts:61`, đọc bằng `Get-Content` | `withPublicDb` mở transaction CHỈ ĐỌC dưới principal `MKT` và không nhận principal từ bên ngoài | Trang mới không có cách nào leo quyền qua đường này; nó chỉ được gọi đúng chữ ký đó, `AC-07` |
| EV-22 | `src/shared/routing/portal-landing.ts:20`, toàn tệp 108 dòng, đọc bằng `Get-Content` | `CANONICAL_ORIGIN` bằng `https://hrpartner.vn` | Canonical của trang mới ghép từ hằng này, không hard-code origin, `AC-10` |
| EV-23 | `src/shared/security/public-surface-limiter.static.test.ts:96-126`, đọc toàn tệp 187 dòng; rồi CHẠY LẠI logic của `collectSources` cộng `consumerEntries` bằng một script `node -e` trong worktree sau khi `STEP-03` đã giao | Hàng rào của go-live-18 có BỐN khẳng định, và khẳng định ở `:121` ghim số phần tử tập consumer của `withPublicDb` bằng 3. Script trả `SCANNED=215`, `REFERENCING=5`, `DEFINITIONS=1`, `CONSUMERS=4`, `MISSING_LIMITER` rỗng; bốn consumer theo thứ tự `sort()` là `app/(jobs)/viec-lam/[slug]/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `app/api/jobs/[slug]/route.ts`, `app/api/jobs/route.ts` | Đây là hàng rào THỨ TƯ mà round này làm đỏ, và `v1.3` không biết nó. Trang mới là consumer thứ tư HỢP LỆ: khẳng định bất biến thật ở `:125` vẫn xanh, chỉ số điều tra dân số ở `:121` đỏ. `RQ-17` đòi lane xanh nên hàng rào phải được SIẾT trong cùng round, xem mục 4.2 và `AC-21` |

## 3. Decisions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | THÊM một bề mặt duyệt việc ở `/viec-lam`, KHÔNG dời tìm kiếm khỏi `/`. Trang chủ giữ đảo client của nó nguyên vẹn | `EV-13`, Tier 1 | Chốt cho `v1.0`. Nếu sếp muốn dời, mở task riêng qua `Q-01` |
| DEC-02 | CHOSEN | Trang mới nhận đúng bốn tham số URL: `q`, `area`, `shift`, `offset`. Tham số lạ bị BỎ QUA trong im lặng, không trả 400, không redirect, và không bao giờ vào canonical | Tier 1 | Chốt cho `v1.0` |
| DEC-03 | CHOSEN | KHÔNG có bộ lọc lương. Lọc lương sau khi service đã phân trang sẽ làm `total` nói dối, và service không có vị từ lương nào | `EV-08`, `EV-06` | Chốt cho `v1.0` |
| DEC-04 | CHOSEN | `PAGE_SIZE` bằng 20 là HẰNG của server. `limit` trên URL bị bỏ qua hoàn toàn, kể cả giá trị hợp lệ | `EV-06`, Tier 1 | Chốt cho `v1.0` |
| DEC-05 | CHOSEN | Dùng lại đúng bucket `RATE_LIMIT_RULES.JOB_BROWSE`, không khai rule mới, để ngân sách duyệt của một IP vẫn là 120 lượt mỗi 60 giây trên cả danh sách và chi tiết | `EV-05` | Chốt cho `v1.0` |
| DEC-06 | CHOSEN | `salaryLabel` và `summaryLabel` được VIẾT LẠI trong `src/domains/job-board/public-listing.labels.ts`, không export từ trang chủ. Hai lý do đo được: trang chủ là `'use client'` nên Server Component không import được, và `app/(portal)/page.tsx` đang thuộc phạm vi ui-01 | `EV-11`, mục 4.2 | Chốt cho `v1.0`. Dedup sau khi ui-01 ACCEPTED là `Q-02` |
| DEC-07 | CHOSEN | `shiftType` và `jobType` KHÔNG lên URL ở `v1.0`. `PublicJobFacets` chỉ trả `areas` và `shifts` nên form render-server không có nguồn option nào cho hai trường đó, và hàng rào trang chủ cấm hard-code danh sách hằng | `EV-07`, `EV-13` | Chốt cho `v1.0` |
| DEC-08 | CHOSEN | `robots` cho phép `index` CHỈ khi không có tham số lọc hay phân trang nào; mọi trạng thái lọc phát `noindex, follow`. `canonical` luôn là `/viec-lam` sạch trong cả hai trường hợp | Tier 1 | Chốt cho `v1.0` |
| DEC-09 | CHOSEN | Bộ lọc là một form `method="get"` render phía server, option của hai select lấy từ `facets` của chính kết quả. Trang mới KHÔNG có `'use client'`, không state, không effect | `EV-07`, `EV-03` | Chốt cho `v1.0` |
| DEC-10 | CHOSEN | Phân trang là hai liên kết Trước và Sau, tính từ `offset`, `nextOffset` và `total`. Không nút JS, không cuộn vô hạn | `EV-07` | Chốt cho `v1.0` |
| DEC-11 | ASSUMPTION | Một việc làm phải đọc GIỐNG NHAU ở hai bề mặt, nên chuỗi nhãn tiền tệ và chuỗi rút gọn phải trùng khít chuỗi trang chủ đang dùng, gồm `Lương thương lượng` và hậu tố đơn giá theo giờ | `EV-11`, Tier 1 | Kiểm bằng hàng rào đối chiếu chuỗi ở `AC-12`. Hết hiệu lực nếu ui-01 đổi chuỗi, lúc đó `Q-02` xử |
| DEC-12 | CHOSEN | Tiếp cận được là điều kiện giao hàng, không phải tuỳ chọn: mỗi input có label hiện gắn bằng `htmlFor`, mọi target bấm cao tối thiểu 44px, và trạng thái focus thấy được | `EV-14`, Tier 1 | Chốt cho `v1.0` |

## 4. Contract

### 4.1 Path được phép chạm

| Path | Trạng thái | Vai trò |
|---|---|---|
| `app/(jobs)/viec-lam/page.tsx` | TẠO MỚI | Server Component danh sách. Không `'use client'` |
| `src/domains/job-board/public-listing.params.ts` | TẠO MỚI | Hợp đồng URL: `PAGE_SIZE`, `LISTING_PATH`, `parseListingSearchParams`, `buildListingHref`, `listingIsIndexable` |
| `src/domains/job-board/public-listing.labels.ts` | TẠO MỚI | `salaryLabel` và `summaryLabel` cho phía server |
| `src/domains/job-board/public-listing.params.test.ts` | TẠO MỚI | Unit test hợp đồng URL, mốc RED trước GREEN |
| `src/domains/job-board/public-listing.static.test.ts` | TẠO MỚI | Hàng rào tĩnh cho trang mới và cho hai chỗ vừa đổi đích link |
| `app/components/GlobalNavbar.tsx` | SỬA | Thêm mục `/viec-lam`, đổi nhãn của `/` |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | SỬA HAI DÒNG | Đổi đích hai link quay lại ở `:154` và `:191`. CẤM chạm dòng khác |
| `src/domains/job-board/public-detail.static.test.ts` | SỬA MỘT KHỐI | CHỈ khối `it(` ở `:148` tới `:151`: dòng tiêu đề của khối, vì nó đang nói đích là `/`, cộng khẳng định thứ hai. Khẳng định mới phải MẠNH HƠN bản cũ, xem `AC-17`. CẤM chạm 22 khối `it(` còn lại |
| `src/shared/security/public-surface-limiter.static.test.ts` | SỬA MỘT KHỐI | CHỈ khối `it(` ở `:120` tới `:122`, tức chỉ số điều tra dân số consumer. Khẳng định mới phải MẠNH HƠN bản cũ, xem `AC-21`. CẤM chạm docblock, `MIN_SCANNED_FILES`, `SKIP_DIRS`, `isTestFile`, `collectSources`, `stripComments`, `isDefinition`, `consumerEntries`, `consumersMissingLimiter`, ba khối `it(` còn lại của cùng `describe`, và toàn bộ fixture âm |
| `docs/tasks/hrp-v5-go-live-20-public-job-listing-index/` | GHI | `HANDOFF.md` và `evidence/` |

### 4.2 Path CẤM chạm

`app/(portal)/page.tsx`, `app/globals.css`, `src/domains/job-board/components/`, và mọi tệp hàng rào của trang chủ — bốn vùng này thuộc `hrp-v5-ui-01-new-ui-home-integration` đang chạy song song; chạm vào là làm hỏng phép đo baseline của cả hai hợp đồng (`PLN-64`).

Ngoài ra: `src/domains/job-board/public.service.ts`, `src/domains/job-board/public-detail.meta.ts`, mọi tệp dưới `app/api/`, `middleware.ts`, `src/shared/security/rate-limit-port.ts`, `src/shared/auth/with-public-db.ts`, `app/(jobs)/viec-lam/layout.tsx`, `app/(jobs)/jobs/page.tsx`, `app/job-board/page.tsx`, `src/domains/applications/marketplace-inventory.static.test.ts`, `src/domains/job-board/public-ui-premium.static.test.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.unit.config.ts`, `.gitignore`, thư mục untracked `new-ui/`, `.ai-pipeline/`, và `TASK.md` cùng `AUDIT.md` của mọi slug khác.

`src/domains/job-board/public-detail.static.test.ts` đã RA khỏi danh sách cấm ở `v1.2`, nhưng chỉ MỘT khối `it(` của nó được mở, đúng phạm vi ghi ở mục 4.1. Đây là hệ quả của `EV-16` đo lại: khối đó ghim đích link về `/` nên nó ĐỎ ngay khi `STEP-06` chạy, và một hợp đồng vừa cấm sửa hàng rào vừa đòi lane xanh là hợp đồng không thi hành được. Luật của lần mở này: khẳng định mới phải cấm được nhiều trường hợp hơn bản cũ, không ít hơn. Cách làm xanh bằng cách THÊM một href trỏ `/` ở chỗ khác trên trang chi tiết bị cấm đích danh — nó giữ hàng rào xanh trong khi biến khẳng định thành vô nghĩa, phá luôn `AC-17` và numstat `2 2` của `STEP-06`.

`src/shared/security/public-surface-limiter.static.test.ts` được mở ở `v1.4` theo CÙNG luật đó, và cũng chỉ MỘT khối. `v1.3` không nhắc tệp này ở cả hai danh sách, tức nó rơi vào một vùng KHÔNG TÊN — mà một vùng không tên trên đúng tệp mà round này chắc chắn làm đỏ là lỗ hợp đồng, không phải quyền tự do của Tier 2. `EV-23` đo: khẳng định ở `:121` ghim số consumer của `withPublicDb` bằng 3, còn trang mới là consumer thứ TƯ hợp lệ, nên `RQ-01` và `RQ-17` của `v1.3` không cùng đúng được.

Năm cách làm xanh bị CẤM đích danh ở lần mở này. Một, xoá khối `:120` tới `:122`. Hai, hạ khẳng định xuống `toBeGreaterThanOrEqual`, `toBeTruthy`, hay bỏ hẳn con số. Ba, chỉ đổi `3` thành `4` rồi dừng — nó cấm ĐÚNG BẰNG bản cũ chứ không nhiều hơn, nên vi phạm chính luật siết. Bốn, làm trang mới TRÁNH detector bằng cách gọi DB qua một lớp bọc trung gian để tệp trang không còn chứa chuỗi `withPublicDb`: census giữ được 3 nhưng `RQ-08` và `AC-10` bị phá, và bề mặt đọc mới trở nên vô hình đúng như docblock của hàng rào lo. Năm, thêm tên vào `SKIP_DIRS` hoặc nới `isTestFile` để loại `app/(jobs)/` khỏi phép quét.

Docblock của hàng rào ở `:5` tới `:7` nói tập consumer phải TỰ SUY, "KHÔNG phải một mảng ba đường dẫn dán tay". Khẳng định mới KHÔNG vi phạm câu đó, vì câu đó nói về NGUỒN của tập, còn danh sách bốn đường dẫn là KẾT QUẢ bị ghim: `collectSources` vẫn quét cả hai cây, `consumerEntries` vẫn tự lọc, và `consumersMissingLimiter` vẫn tự chấm mọi tệp nó tìm được, gồm cả tệp không có tên trong khẳng định. Đó cũng là lý do bản mới cấm nhiều hơn: một con số trần vẫn xanh khi một consumer bị đổi tên, bị dời, hay bị thay bằng tệp khác mà tổng số giữ nguyên; một tập đường dẫn đã sắp thì đỏ ở cả ba ca đó.

### 4.3 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | `/viec-lam` trả một trang danh sách render phía server, không có chỉ thị `'use client'` trong tệp trang, và mang đúng cặp cờ `dynamic` cùng `runtime` của go-live-12 | P0 | `EV-01`, `EV-03` | Không có trang thì route vẫn 404 và cả task vô nghĩa |
| RQ-02 | Trang đọc `q`, `area`, `shift`, `offset` từ searchParams của Next.js, kẹp `offset` về 0 khi âm, không phải số, hoặc vượt `total` | P0 | `EV-06`, `DEC-02` | Tham số rác gây lỗi render hoặc trang trắng |
| RQ-03 | Mọi tham số ngoài bốn tên trên bị bỏ qua trong im lặng, gồm `salary`, `limit`, `shiftType`, `jobType`, và không tham số nào trong số đó vào canonical | P0 | `DEC-02`, `DEC-03`, `DEC-04`, `DEC-07` | Hứa một bộ lọc không có vị từ chống lưng là nói dối người dùng |
| RQ-04 | Bộ lọc là form `method="get"`; option của select vùng và select ca lấy từ `facets` của kết quả, không từ mảng hằng nào | P0 | `EV-07`, `DEC-09` | Danh sách hằng sẽ trôi khỏi dữ liệu và lặp lại chính lỗi mà hàng rào trang chủ đang cấm |
| RQ-05 | Phân trang bằng hai liên kết Trước và Sau, tính từ `offset`, `nextOffset`, `total`, và GIỮ nguyên mọi tham số lọc đang có | P0 | `EV-07`, `DEC-10` | Mất bộ lọc khi sang trang là hỏng chính giá trị của trang này |
| RQ-06 | Mỗi trạng thái lọc và mỗi trang là một URL riêng, chia sẻ được, đánh dấu trang được, và nút quay lại của trình duyệt hoạt động không cần JS | P0 | `EV-12` | Đây là điểm khác biệt duy nhất so với trang chủ; mất nó thì task này không giao gì cả |
| RQ-07 | Trước khi chạm DB, trang gọi `evaluateRateLimits` với bucket `JOB_BROWSE`; mọi `outcome.kind` khác `allowed` đều fail-closed và KHÔNG mở transaction. Nhánh chặn không được in lại một giá trị nào từ request | P0 | `EV-04`, `EV-05`, `EV-21` | Bỏ cổng này là mở một đường duyệt DB không giới hạn cho mọi IP |
| RQ-08 | Đường đọc DB duy nhất là `withPublicDb(getPrisma(), ...)` gọi `listPublicJobProjection`. Không truy vấn Prisma trực tiếp, không gọi `/api/jobs` | P0 | `EV-06`, `EV-21` | Đọc ngoài `withPublicDb` là đọc ngoài principal MKT và ngoài RLS |
| RQ-09 | `generateMetadata` phát `title`, `description`, `alternates.canonical` ghép từ `CANONICAL_ORIGIN`, và `robots` theo `DEC-08` | P1 | `EV-22`, `DEC-08` | Không có canonical thì mọi tổ hợp lọc thành nội dung trùng lặp |
| RQ-10 | Nhãn số kết quả đọc `total` của kết quả đã lọc. CẤM lấy số từ `overview` | P1 | `EV-09` | `overview` tính trước khi lọc nên sẽ hiện một con số đúng-mặt-chữ mà sai nghĩa |
| RQ-11 | Trạng thái rỗng nói đúng phạm vi đang rỗng là bộ lọc hiện tại, và có một liên kết xoá lọc trỏ về `/viec-lam` sạch | P1 | `DEC-09` | Trạng thái rỗng chung chung khiến người dùng tưởng cả sàn không có việc |
| RQ-12 | Chuỗi nhãn tiền tệ và chuỗi rút gọn của thẻ việc trùng khít chuỗi trang chủ đang dùng; hai hàm sống ở `public-listing.labels.ts` | P1 | `EV-11`, `DEC-06`, `DEC-11` | Hai bề mặt nói hai giá đọc khác nhau cho cùng một việc |
| RQ-13 | Đường tới trang chi tiết dùng `publicJobDetailPath`, ngày hạn dùng `formatDeadlineDate`, cả hai import từ `public-detail.meta.ts` | P1 | `EV-10` | Sao lại hàm là mở một nguồn sai thứ hai cho cùng một định dạng |
| RQ-14 | `GlobalNavbar` có mục `/viec-lam` nhãn `Việc làm`, và mục `/` đổi nhãn thành `Trang chủ`; comment nói số lượng href phải cập nhật theo | P1 | `EV-15` | Hai mục cùng nhãn `Việc làm` trỏ hai đích là bẫy điều hướng |
| RQ-15 | Hai link quay lại ở `app/(jobs)/viec-lam/[slug]/page.tsx:154` và `:191` trỏ `/viec-lam`; chuỗi nhãn giữ nguyên từng byte; và hàng rào cũ đang ghim đích về `/` được SIẾT lại theo sự thật mới trong CÙNG round, không để lại một hàng rào đỏ nào | P1 | `EV-16`, `EV-17` | Link tên là "quay lại danh sách" mà trỏ trang chủ là sai sự thật, còn đổi đích mà bỏ hàng rào đỏ lại là mua tính năng bằng hồi quy |
| RQ-16 | Trang đạt các mốc tiếp cận của `DEC-12`: label hiện gắn `htmlFor`, target bấm tối thiểu 44px, focus thấy được, thứ tự heading không nhảy bậc, và không truyền tin chỉ bằng màu | P0 | `DEC-12`, `EV-14` | Đây là bề mặt công khai; lỗi tiếp cận ở đây là lỗi sản phẩm |
| RQ-17 | Hai tệp test mới XANH, và toàn bộ lane `npm run test:unit` cộng `npm run typecheck`, `npm run lint`, `npm run build` đều xanh, gồm cả BỐN hàng rào tĩnh đang canh trang chủ, navbar, trang chi tiết, và điều tra dân số consumer của `withPublicDb` | P0 | `EV-13`, `EV-14`, `EV-16`, `EV-23` | Một hàng rào xanh chuyển đỏ là hồi quy, và task này không được phép mua tính năng bằng hồi quy |

### 4.4 Hợp đồng module mới

`src/domains/job-board/public-listing.params.ts` export đúng năm thứ, không hơn:

- `PAGE_SIZE` bằng 20, hằng số. Đây là nguồn duy nhất của kích thước trang.
- `LISTING_PATH` bằng chuỗi `/viec-lam`.
- `parseListingSearchParams` nhận đối tượng searchParams đã await và trả về bộ bốn trường đã làm sạch: `q` cắt khoảng trắng hai đầu rồi bỏ nếu rỗng, `area` và `shift` giữ nguyên chuỗi nếu có, `offset` là số nguyên không âm chia hết cho `PAGE_SIZE`, mặc định 0. Giá trị mảng lấy phần tử đầu. Mọi khoá khác bị loại bỏ.
- `buildListingHref` nhận bộ bốn trường đó cộng một `offset` ghi đè tuỳ chọn, trả về đường tương đối. Quy tắc bắt buộc: chỉ ghi tham số có giá trị, và KHÔNG ghi `offset` khi nó bằng 0, để trang một luôn là đúng một URL.
- `listingIsIndexable` trả true chỉ khi cả bốn trường đều ở giá trị mặc định.

`src/domains/job-board/public-listing.labels.ts` export `salaryLabel` và `summaryLabel`, hành vi trùng khít bản trang chủ ở `app/(portal)/page.tsx:85` và `:101`, gồm cả chuỗi `Lương thương lượng` và mốc rút gọn ba giá trị.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-02, RQ-03, RQ-05 | `src/domains/job-board/public-listing.params.ts` cộng `public-listing.params.test.ts` | Viết TEST TRƯỚC cho năm export của mục 4.4, chạy để thấy ĐỎ, lưu output, rồi mới viết module cho tới XANH | TypeScript, vitest | `npm run test:unit` hai lượt: lượt RED lưu ở `evidence/`, lượt GREEN lưu riêng | Không có bản ghi ĐỎ trước GREEN thì STEP này chưa xong |
| STEP-02 | RQ-12 | `src/domains/job-board/public-listing.labels.ts` | Viết hai hàm nhãn cho phía server, chuỗi lấy đúng từ trang chủ ở baseline | `git show b68d25b:"app/(portal)/page.tsx"` để lấy chuỗi gốc | `npm run test:unit` | Chuỗi lệch một byte so với bản baseline là chưa xong |
| STEP-03 | RQ-01, RQ-04, RQ-07, RQ-08, RQ-10, RQ-11, RQ-16 | `app/(jobs)/viec-lam/page.tsx` | Server Component: cờ `dynamic` và `runtime`; loader bọc `cache` gọi `evaluateRateLimits` rồi mới `withPublicDb`; form GET với option từ `facets`; lưới thẻ việc; nhãn số đọc `total`; trạng thái rỗng có link xoá lọc; hai link phân trang | Mẫu ở `app/(jobs)/viec-lam/[slug]/page.tsx:62`, `:90`, `:178` | `npm run typecheck` rồi `npm run build` | Còn `'use client'` trong tệp, hoặc DB được gọi trước cổng rate-limit, là chưa xong |
| STEP-04 | RQ-06, RQ-09 | `app/(jobs)/viec-lam/page.tsx` | `generateMetadata` với canonical ghép từ `CANONICAL_ORIGIN` và `robots` theo `DEC-08` | `src/shared/routing/portal-landing.ts:20` | `npm run build` cộng `grep -n "canonical" "app/(jobs)/viec-lam/page.tsx"` | Canonical mang tham số lọc là chưa xong |
| STEP-05 | RQ-14 | `app/components/GlobalNavbar.tsx` | Thêm một phần tử `navLinks` cho `/viec-lam`, đổi nhãn phần tử `/` sang `Trang chủ`, cập nhật comment đếm href | `EV-15` | `npm run test:unit` chạy riêng `public-ui-premium.static.test.ts` rồi chạy toàn lane | Bất kỳ số nào trong TÁM số của `EV-14` đổi giá trị là chưa xong |
| STEP-06 | RQ-15 | `app/(jobs)/viec-lam/[slug]/page.tsx` cộng `src/domains/job-board/public-detail.static.test.ts` | Đổi đúng hai dòng href ở `:154` và `:191` sang `/viec-lam`, không chạm dòng nào khác. Rồi SIẾT khối `it(` ở `:148` của hàng rào cũ: giữ khẳng định chuỗi nhãn, thay khẳng định ghim đích bằng HAI khẳng định mạnh hơn — đếm đúng hai lần mẫu href tới `/viec-lam`, và phủ định mẫu href tới `/` | `EV-16`, `EV-17` | `git diff --cached --numstat -- "app/(jobs)/viec-lam/[slug]/page.tsx"` phải ra `2 2`, và `git diff --cached --numstat -- src/domains/job-board/public-detail.static.test.ts` phải ra `3 2` | Numstat khác hai cặp số trên là chưa xong. Hàng rào mới cấm ÍT trường hợp hơn bản cũ cũng là chưa xong |
| STEP-06B | RQ-17 | `src/shared/security/public-surface-limiter.static.test.ts` | SIẾT khối điều tra dân số ở `:120`: giữ ĐÚNG MỘT khối `it(`, đổi tiêu đề theo sự thật mới, và thay khẳng định số trần bằng HAI khẳng định — tập đường dẫn consumer đã `sort()` bằng đúng bốn đường của `EV-23`, cộng số phần tử bằng 4. CẤM chạm phần còn lại của tệp | `EV-23`, mục 4.2 | `npm run test:unit -- src/shared/security/public-surface-limiter.static.test.ts` hai lượt, ĐỎ trước khi siết và XANH sau; rồi `git diff --cached -U0 -- src/shared/security/public-surface-limiter.static.test.ts` sau khi đã `git add` tệp ấy | Hàng rào cấm ít trường hợp hơn bản cũ, hoặc runner báo khác 9 test cho tệp, hoặc diff có hơn MỘT hunk, là chưa xong |
| STEP-07 | RQ-01, RQ-04, RQ-12, RQ-15, RQ-16 | `src/domains/job-board/public-listing.static.test.ts` | Hàng rào tĩnh: trang mới không chứa `'use client'`, có cặp cờ, có `evaluateRateLimits` đứng TRƯỚC `withPublicDb` theo chỉ số ký tự, option select đọc `facets`, không có mảng hằng danh sách, có `htmlFor` và `min-h-11`, không có `color: var(--color-primary)` trần; và hai href quay lại đã trỏ `/viec-lam` | Lối viết của `public-detail.static.test.ts` | `npm run test:unit` | Hàng rào chỉ đếm mà không khẳng định THỨ TỰ cổng rate-limit là chưa xong |
| STEP-08 | RQ-17 | `docs/tasks/hrp-v5-go-live-20-public-job-listing-index/` | Chạy bốn lane, lưu output kèm mã thoát vào `evidence/`, viết `HANDOFF.md` theo `.ai-pipeline/templates/HANDOFF.template.md` | `EV-13`, `EV-14`, `EV-16` | `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run build`, mỗi lệnh ghi lại mã thoát | Thiếu một mã thoát, hoặc một lane đỏ, là chưa xong |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01 | `app/(jobs)/viec-lam/page.tsx` tồn tại và KHÔNG chứa chỉ thị client. Số lần khớp bằng 0 | `Test-Path` cho tệp, rồi `Select-String -SimpleMatch` đếm chỉ thị client trong chính tệp đó | `evidence/ac01-server-only.txt` với lệnh, output, mã thoát | Yes |
| AC-02 | RQ-01 | Tệp trang khai `dynamic` bằng `force-dynamic` và `runtime` bằng `nodejs`, mỗi thứ đúng một lần | `Select-String` trên tệp trang, đối chiếu với `app/(jobs)/viec-lam/[slug]/page.tsx:62` và `:63` | `evidence/ac02-render-flags.txt` | Yes |
| AC-03 | RQ-02 | Unit test của `parseListingSearchParams` xanh cho các ca: rỗng, `q` chỉ có khoảng trắng, `offset` âm, `offset` không phải số, `offset` không chia hết `PAGE_SIZE`, và giá trị dạng mảng | `npm run test:unit` trên `src/domains/job-board/public-listing.params.test.ts`, kèm bản ghi lượt ĐỎ trước đó | `evidence/ac03-params-red.txt` và `evidence/ac03-params-green.txt` | Yes |
| AC-04 | RQ-03 | Test khẳng định `buildListingHref` không bao giờ phát ra bốn tên `salary`, `limit`, `shiftType`, `jobType`, kể cả khi bốn tên đó có trong input | `npm run test:unit`, cộng `Select-String` xác nhận tệp trang không đọc bốn tên đó | `evidence/ac04-param-allowlist.txt` | Yes |
| AC-05 | RQ-04 | Option của hai select đọc từ `facets` của kết quả; tệp trang KHÔNG khai mảng hằng nào cho vùng, ca, ngành hay loại việc | `npm run test:unit` chạy hàng rào mới, cộng `grep -n "facets" "app/(jobs)/viec-lam/page.tsx"` | `evidence/ac05-facets-source.txt` | Yes |
| AC-06 | RQ-05 | Hai liên kết phân trang giữ đủ tham số lọc đang có; trang đầu không có link Trước; trang cuối không có link Sau. Kiểm bằng test trên `buildListingHref` với ba mốc `offset` là 0, giữa, và trang cuối | `npm run test:unit` | `evidence/ac06-pagination.txt` | Yes |
| AC-07 | RQ-06 | `buildListingHref` KHÔNG ghi `offset` khi giá trị bằng 0, nên trang một của một bộ lọc là đúng một URL | `npm run test:unit` khẳng định chuỗi trả về không chứa tên tham số offset khi offset bằng 0 | `evidence/ac07-canonical-url.txt` | Yes |
| AC-08 | RQ-07 | Trong tệp trang, chỉ số ký tự của `evaluateRateLimits` NHỎ HƠN chỉ số ký tự của `withPublicDb`, và có một nhánh trả về sớm khi `outcome.kind` khác `allowed` | Hàng rào tĩnh mới so hai `IndexOf` rồi chạy bằng `npm run test:unit` | `evidence/ac08-ratelimit-order.txt` | Yes |
| AC-09 | RQ-07 | Thành phần render nhánh bị chặn không nhận tham số nào và không nội suy giá trị nào từ request; đếm số lần nội suy trong thân nhánh đó bằng 0 | `Select-String` trên tệp trang theo lối `app/(jobs)/viec-lam/[slug]/page.tsx:145`, cộng `npm run test:unit` | `evidence/ac09-throttled-no-leak.txt` | Yes |
| AC-10 | RQ-08 | Tệp trang có đúng một lần gọi `withPublicDb`, đúng một lần `listPublicJobProjection`, và 0 lần `getPrisma().` dùng trực tiếp ngoài đối số của `withPublicDb`, 0 lần chuỗi `/api/jobs` | `Select-String` đếm từng mẫu trong tệp trang | `evidence/ac10-db-path.txt` | Yes |
| AC-11 | RQ-09 | `generateMetadata` phát `alternates.canonical` luôn là đường sạch `/viec-lam`, và `robots` cho phép index CHỈ khi `listingIsIndexable` trả true | `npm run test:unit` cho hàng rào, cộng `npm run build` để chứng minh metadata biên dịch | `evidence/ac11-metadata.txt` | Yes |
| AC-12 | RQ-10 | Tệp trang KHÔNG đọc trường `overview` cho nhãn số kết quả; số lần khớp `overview` trong tệp bằng 0 | `Select-String -SimpleMatch` đếm `overview` trong tệp trang | `evidence/ac12-total-not-overview.txt` | Yes |
| AC-13 | RQ-11 | Trạng thái rỗng chứa một liên kết trỏ đúng `/viec-lam` sạch, và chuỗi thông báo nói tới bộ lọc hiện tại | `npm run test:unit` cho hàng rào mới | `evidence/ac13-empty-state.txt` | Yes |
| AC-14 | RQ-12 | Hàng rào đối chiếu chuỗi: mọi chuỗi nhãn trong `public-listing.labels.ts` có mặt y hệt trong bản baseline của trang chủ, gồm `Lương thương lượng` | `npm run test:unit`, trong đó test đọc cả hai tệp bằng `readFileSync` và so chuỗi | `evidence/ac14-label-parity.txt` | Yes |
| AC-15 | RQ-13 | Tệp trang import `publicJobDetailPath` và `formatDeadlineDate` từ `public-detail.meta`, và KHÔNG định nghĩa lại hàm định dạng ngày nào | `Select-String` đếm import, cộng `npm run typecheck` | `evidence/ac15-helper-reuse.txt` | Yes |
| AC-16 | RQ-14 | `navLinks` có 5 phần tử, gồm `/viec-lam` nhãn `Việc làm` và `/` nhãn `Trang chủ`; và TÁM số của `EV-14` giữ đúng giá trị cũ, theo thứ tự `EV-14` liệt kê là 0, 4, 3, 4, 4, 4, 1, 0 | `npm run test:unit` chạy toàn lane để `public-ui-premium.static.test.ts` tự phán, cộng `Select-String` đếm phần tử `navLinks` | `evidence/ac16-navbar.txt` | Yes |
| AC-17 | RQ-15 | `app/(jobs)/viec-lam/[slug]/page.tsx` có 0 href trỏ `/` và 2 href trỏ `/viec-lam`; numstat của riêng tệp đó là `2 2`. Và hàng rào cũ ĐỎ trước, XANH sau: khối `it(` mới của `public-detail.static.test.ts` đếm đúng 2 lần mẫu href tới `/viec-lam` cộng một khẳng định phủ định mẫu href tới `/`, numstat của riêng tệp hàng rào là `3 2`, tổng số khối `it(` của tệp vẫn là 23 | `Select-String` đếm hai mẫu href, `git diff --cached --numstat` cho riêng từng path, và `npm run test:unit -- src/domains/job-board/public-detail.static.test.ts` chạy hai lần: một lần SAU khi đổi href mà TRƯỚC khi siết hàng rào để lưu cửa sổ ĐỎ, một lần sau khi siết | `evidence/ac17-back-links.txt`, `evidence/ac17-barrier-red.txt`, `evidence/ac17-barrier-green.txt` | Yes |
| AC-18 | RQ-16 | Mỗi input hoặc select của form có một label gắn bằng `htmlFor`; mọi target bấm mang `min-h-11`; có lớp focus thấy được; và tệp trang có 0 lần chuỗi `var(--color-primary)` đứng sau `color:` | `npm run test:unit` cho hàng rào mới, các phép đếm khớp cặp label và input | `evidence/ac18-a11y.txt` | Yes |
| AC-19 | RQ-17 | Bốn lane xanh với mã thoát 0: `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run build`. Tổng số test của lane unit KHÔNG giảm so với baseline. Bốn lane này là phép đo TOÀN CỤC nên chỉ có giá trị khi đo trên một cây không có luồng nào khác đang dở: trước khi đo phải chốt `git status --porcelain` và nếu còn path của ui-01 đang bẩn thì HOÃN ô này, ghi một hàng `LIM-` nói rõ đang chờ luồng nào, tuyệt đối không khai xanh trên cây có việc dở của luồng khác. Riêng cửa sổ ĐỎ của `STEP-01` được đo cô lập bằng `npm run test:unit -- src/domains/job-board/public-listing.params.test.ts`, vẫn là lane canonical vì nó đi qua `vitest.unit.config.ts` | Chạy từng lệnh, in mã thoát ngay sau, và dẫn dòng tổng của runner chứ không đếm chuỗi `it(` | `evidence/ac19-lane-unit.txt`, `ac19-typecheck.txt`, `ac19-lint.txt`, `ac19-build.txt` | Yes |
| AC-20 | RQ-17 | Tập path do round này gây ra là TẬP CON của mục 4.1 cộng `docs/tasks/hrp-v5-go-live-20-public-job-listing-index/`. Tập đó đo bằng `git diff --cached --name-only`, tức những gì round này tự stage, vì đó là tập DUY NHẤT round này điều khiển được. Ba path của ui-01 là `app/(portal)/page.tsx`, `app/globals.css`, `src/domains/job-board/components/` phải VẮNG trong tập vừa nói. Path bẩn hoặc untracked do luồng khác gây ra KHÔNG tính vào phép đo, kể cả ba path vừa kể khi chúng bẩn vì ui-01 đang chạy song song; `git status --porcelain` chỉ dùng để LIỆT KÊ phần bị loại trừ kèm lý do, không dùng để kết luận PASS hay FAIL. Vùng của chính Tier 1 gồm `docs/` ngoài slug này và `.ai-pipeline/` cũng được LOẠI TRỪ | `git diff --cached --name-only` cho tập kết luận, rồi `git status --porcelain` cho danh sách loại trừ | `evidence/ac20-scope.txt` | Yes |
| AC-21 | RQ-17 | Khối điều tra dân số của `src/shared/security/public-surface-limiter.static.test.ts` XANH sau khi siết, và bản mới cấm NHIỀU HƠN bản cũ: nó so tập đường dẫn consumer đã `sort()` với đúng bốn đường `app/(jobs)/viec-lam/[slug]/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `app/api/jobs/[slug]/route.ts`, `app/api/jobs/route.ts`, cộng một khẳng định số phần tử bằng 4. Ràng buộc phạm vi: tệp vẫn còn ĐÚNG MỘT khối `it(` ở vị trí đó và runner vẫn báo 9 test cho tệp; khẳng định `consumersMissingLimiter(scanned)` bằng mảng rỗng giữ nguyên từng byte; `git diff --cached -U0` cho riêng tệp đó có ĐÚNG MỘT hunk và phía cũ của hunk đó bắt đầu trong khoảng dòng 119 tới 123 | `npm run test:unit -- ` cộng đường dẫn tệp hàng rào, chạy HAI lần: một lần TRƯỚC khi siết để lưu cửa sổ ĐỎ, phải có mã thoát 1 và dòng runner nói độ dài 3 nhận được 4; một lần sau khi siết, mã thoát 0 và 9 test xanh. Rồi `git diff --cached -U0 -- src/shared/security/public-surface-limiter.static.test.ts` để đếm hunk và đọc số dòng ở đầu hunk. Phải là dạng `--cached` vì `STEP-08` đã `git add` tệp ấy, nên dạng không `--cached` trả về RỖNG và một phép đo rỗng không đếm được hunk nào | `evidence/ac21-census-red.txt`, `evidence/ac21-census-green.txt`, `evidence/ac21-single-hunk.txt` | Yes |

### 6.1 Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-03 | AC-01, AC-02 |
| RQ-02 | STEP-01 | AC-03 |
| RQ-03 | STEP-01, STEP-03 | AC-04 |
| RQ-04 | STEP-03, STEP-07 | AC-05 |
| RQ-05 | STEP-01, STEP-03 | AC-06 |
| RQ-06 | STEP-01, STEP-04 | AC-07 |
| RQ-07 | STEP-03, STEP-07 | AC-08, AC-09 |
| RQ-08 | STEP-03 | AC-10 |
| RQ-09 | STEP-04 | AC-11 |
| RQ-10 | STEP-03 | AC-12 |
| RQ-11 | STEP-03 | AC-13 |
| RQ-12 | STEP-02 | AC-14 |
| RQ-13 | STEP-03 | AC-15 |
| RQ-14 | STEP-05 | AC-16 |
| RQ-15 | STEP-06 | AC-17 |
| RQ-16 | STEP-03, STEP-07 | AC-18 |
| RQ-17 | STEP-08 (kèm STEP-06B) | AC-19, AC-20, AC-21 |

`RQ-17` chở HAI bước thi hành, nhưng ô Execution chỉ để `STEP-08` trần rồi ghi `STEP-06B` vào ghi chú trong ngoặc. Đó là một HẠN CHẾ CỦA DỤNG CỤ, không phải một mối liên kết bị bỏ: `.ai-pipeline/scripts/verify-task.ps1:115` định nghĩa `$stepToken` bằng `STEP-` cộng chữ số, nên mọi mã bước có hậu tố CHỮ nằm ngoài văn phạm của nó, và một ô ghi `STEP-06B, STEP-08` làm `A-05` đỏ cho `RQ-17` dù hàng ấy đúng nghĩa. Ghi chú trong ngoặc thì `.ai-pipeline/scripts/verify-task.ps1:117` chấp nhận. Đừng xoá ghi chú ấy để hàng gọn hơn — xoá là làm mất đúng liên kết mà `AC-21` đo. Và đừng đổi tên `STEP-06B` thành một mã toàn chữ số: các tệp trong `evidence/` đã sinh ra dưới tên cũ, đổi tên sẽ làm chúng nói sai về bước đã tạo ra chúng.

## 7. Risk

| ID | Risk | Impact | Mitigation | Owner |
|---|---|---|---|---|
| R-01 | Tier 2 commit, push hay deploy. Đã xảy ra ba lần trong dự án này | Ship mã chưa audit lên production | CẤM tuyệt đối `git commit`, `git push`, và mọi lệnh deploy. Chỉ `git add` path trong mục 4.1. Cấm `git add -A` và `git add .` | Tier 2 |
| R-02 | Chạm `app/(portal)/page.tsx` để export lại hai hàm nhãn cho gọn. Tệp đó đang là Module của ui-01 | Baseline của cả hai hợp đồng nói dối, và ui-01 phải làm lại phép đo | `DEC-06` khoá lời giải là VIẾT LẠI trong module mới; `AC-20` đo lại bằng danh sách file | Tier 2 |
| R-03 | Thêm bộ lọc lương hoặc `shiftType` cho giống mockup | Bộ lọc không có vị từ chống lưng, hoặc `total` nói dối sau khi lọc hậu phân trang | `DEC-03`, `DEC-07`, và `AC-04` đếm bằng 0 cho bốn tên tham số | Tier 2 |
| R-04 | Gọi DB trước cổng rate-limit, hoặc bắt lỗi rate-limit rồi vẫn đi tiếp | Mở đường duyệt DB không giới hạn cho mọi IP trên một trang công khai | `AC-08` so chỉ số ký tự nên nó đo THỨ TỰ, không chỉ đo sự có mặt | Tier 2 |
| R-05 | Đếm hàng rào navbar bằng mắt rồi kết luận không đổi | Tám số của `EV-14` đổi trong im lặng, hàng rào đỏ ở lần chạy sau | `AC-16` bắt buộc chạy toàn lane `npm run test:unit`, không cho suy luận | Tier 2 |
| R-06 | Trang mới thành bề mặt duyệt THỨ HAI nói một sự thật khác với `/` | Người dùng thấy hai kết quả khác nhau cho cùng một truy vấn | `DEC-11` cộng `AC-14` khoá chuỗi nhãn về một nguồn; `Q-01` là đường thoát thật, do sếp quyết | Tier 1 |
| R-07 | `v1.2` mở một tệp hàng rào cho round này, và một tệp hàng rào đã mở là chỗ dễ làm xanh nhất bằng cách NỚI khẳng định — xoá dòng ghim đích, hạ `toMatch` thành `toContain`, hay đổi mẫu thành thứ khớp cả hai đích | Task mua tính năng bằng cách hạ chính hàng rào canh nó, đúng lớp lỗi mà bảng `TEXT_PAIRS` của go-live-08 đã gây một lần | `AC-17` đòi hai khẳng định mới cụ thể, đòi numstat `3 2` cho riêng tệp hàng rào, đòi tổng khối `it(` vẫn là 23, và đòi lưu CẢ cửa sổ đỏ trước khi siết. Mục 4.2 cấm đích danh mẹo thêm một href trỏ `/` ở chỗ khác | Tier 2 |
| R-08 | Hàng rào điều tra dân số consumer bị làm xanh bằng cách NỚI thay vì SIẾT, hoặc bằng cách cho trang mới tránh detector: gọi DB qua một lớp bọc để tệp trang không còn chứa chuỗi `withPublicDb` | Bề mặt đọc DB công khai thứ tư trở nên VÔ HÌNH với hàng rào duy nhất canh nó, đúng điểm mù mà docblock của chính hàng rào đó mô tả | Mục 4.2 cấm đích danh năm cách; `AC-21` đòi tập đường dẫn đã sắp chứ không chỉ một con số, đòi runner vẫn báo 9 test, đòi diff ĐÚNG MỘT hunk trong khoảng dòng đã ghi, và đòi lưu cửa sổ ĐỎ trước khi siết; `AC-10` cộng `RQ-08` khoá đường đọc DB về đúng một lời gọi `withPublicDb` trong tệp trang | Tier 2 |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| Q-01 | Có DỜI hẳn tìm kiếm và phân trang khỏi `/` sang `/viec-lam` không, để chỉ còn MỘT bề mặt duyệt việc? Dời sẽ làm hàng rào ở `src/domains/applications/marketplace-inventory.static.test.ts:266` chuyển đỏ nên phải là một task riêng, và nó đụng đúng tệp mà ui-01 đang giữ | Sếp | Sau khi ui-01 ACCEPTED | No. `v1.0` chọn THÊM bề mặt, `DEC-01` |
| Q-02 | Sau khi ui-01 ACCEPTED, có gộp `salaryLabel` và `summaryLabel` về một nguồn dùng chung cho cả trang chủ và trang danh sách không? | Tier 1 | Sau khi ui-01 ACCEPTED | No. `AC-14` giữ hai bản trùng khít chuỗi trong lúc chờ |
| Q-03 | Có dựng `app/sitemap.ts` và `app/robots.ts` không? Hôm nay repo không có tệp nào trong hai tệp đó | Tier 1 đề xuất, sếp chốt | Trước khi mở public rộng | No. `DEC-08` phát `robots` ở cấp trang, đủ cho `v1.0` |

## 9. Planner Resolution

Chưa có audit round nào. Hợp đồng `v1.0` sinh từ ruling `PLN-66` phiên 05/09/2026: trang danh sách công khai là một hợp đồng RIÊNG, NGOÀI phase new-ui, vì bốn phép đo cho thấy nó không giao một path nào với `hrp-v5-ui-01-new-ui-home-integration` (mục 4.2 và `EV-11`), nên không cần Tier 1 chèn commit scoped giữa hai task theo `PLN-64`.

Ruling này cũng chốt hình thái: THÊM bề mặt chứ không DỜI. Lý do là phép đo `EV-13`, không phải sự e dè. Hàng rào ở `src/domains/applications/marketplace-inventory.static.test.ts:266` đang XANH và nó ghim đúng khối tìm kiếm của trang chủ; một hợp đồng mua tính năng bằng cách làm hàng rào xanh chuyển đỏ là hợp đồng sai. Việc dời được giữ nguyên dạng câu hỏi `Q-01`, chủ sở hữu là sếp.

Ruling `PLN-67` phiên 05/09/2026 sinh ra `v1.1`, khi sếp hỏi chạy hợp đồng này SONG SONG với ui-01 đang code. Đo lại thì tập ghi file rời hẳn nhau đúng như `PLN-66` nói, nhưng `v1.0` bỏ sót một hạng xung đột KHÁC: ba phép đo `npm run test:unit`, `npm run typecheck`, `npm run build` là TOÀN CỤC, không thuộc riêng hợp đồng nào. Lúc đo, ui-01 đang ở giữa `STEP-04` với `app/globals.css` bẩn `14` dòng thêm, và nó vừa mở cửa sổ ĐỎ của chính nó lúc `22:20`. Nên `v1.0` sai ở hai ô. `AC-20` cũ kết luận PASS hay FAIL từ `git status --porcelain`, một lệnh trả về cả việc của luồng khác, nên nó tự FAIL vì `app/globals.css` bẩn do Tier 2 chứ không do round này; `v1.1` chuyển tập kết luận sang `git diff --cached --name-only`, tức tập round này tự stage, là tập duy nhất nó điều khiển. `AC-19` cũ khai xanh bốn lane mà không nói xanh TRÊN CÂY NÀO; `v1.1` buộc chốt trạng thái cây trước khi đo, cho phép HOÃN kèm hàng `LIM-`, và chỉ ra cửa sổ ĐỎ của `STEP-01` đo cô lập được bằng `npm run test:unit -- ` cộng đường dẫn tệp test, vẫn là lane canonical vì vẫn qua `vitest.unit.config.ts`.

Đối xứng: `AC-16` của ui-01 đã tự viết mệnh đề loại trừ luồng khác từ đầu, còn `AC-20` bên này thì thiếu. Một hợp đồng ràng buộc tập path phải luôn nói rõ nó kết luận trên tập NÀO, vì trong một cây làm việc chung thì `git status` là tài sản chung chứ không phải biên lai của một round. Rủi ro thứ ba, chỉ lộ SAU khi cả hai merge, giữ nguyên ở `R-06` và `Q-02`: `AC-14` ghim chuỗi nhãn theo baseline `b68d25b` trong khi ui-01 đang viết lại phần trình bày trang chủ, nên nếu ui-01 đổi một chuỗi nhãn thì hai bề mặt sẽ nói hai sự thật mà không phép đo nào của HAI hợp đồng bắt được, vì mỗi cái chỉ đo chính nó. Đường đóng là một phép đối chiếu chạy SAU khi ui-01 `ACCEPTED`.

Ruling `PLN-68` phiên 05/09/2026 sinh ra `v1.2`, và nó là một ruling TỰ BÁC. `v1.1` khẳng định ở `EV-16` rằng đổi đích hai link quay lại "giữ hàng rào này XANH". Đọc lại chính khối `it(` ấy thì nó có HAI khẳng định chứ không một: dòng dưới ghim đích của link về `/` bằng một mẫu regex. `v1.1` đọc dòng trên rồi dừng đúng một dòng trước chỗ quyết định. Hệ quả không phải một lỗi lời văn: `RQ-15` đòi đổi đích, `RQ-17` đòi cả lane xanh gồm chính hàng rào đó, còn mục 4.2 của `v1.1` lại CẤM chạm tệp hàng rào — ba câu ấy không cùng đúng được, nên `v1.1` là hợp đồng không thi hành được. Đây là lớp lỗi mà `AUD`-lane đã ghi ba lần: một AC bất khả thi do chính Tier 1 viết thì bump spec, KHÔNG mở execution round và KHÔNG để Tier 2 tự xoay.

Cách sửa chọn hướng SIẾT. Mở đúng một khối `it(` cho `STEP-06`, và khẳng định thay thế phải cấm được nhiều hơn bản cũ: bản cũ chỉ đòi CÓ một href trỏ `/` nên nó vẫn xanh nếu một trong hai link bị đổi sang đích thứ ba, còn bản mới đếm đúng hai href tới `/viec-lam` và phủ định mọi href tới `/`. Hai đích bị ghim bằng số, không bằng sự có mặt. Hướng còn lại — bỏ `RQ-15`, để hai link tiếp tục trỏ trang chủ — bị loại vì nó thu hẹp phạm vi mà sếp đã chuẩn thuận, và vì sau round này `/viec-lam` mới đúng là "danh sách việc làm" mà nhãn link đang hứa. Mẹo thứ ba, thêm một href trỏ `/` ở chỗ khác cho hàng rào cũ xanh, bị cấm đích danh ở mục 4.2: nó giữ màu xanh bằng cách làm khẳng định mất nghĩa, đúng cái bẫy `TEXT_PAIRS` của go-live-08.

Cùng ruling này sửa một chỗ đếm thiếu: `EV-14` của `v1.1` liệt kê bảy số hàng rào navbar nhưng tệp hàng rào ghim TÁM, số thứ tám ở `:303` nằm ngay dưới số ở `:302` trong cùng khối `it(`. Lane test vẫn bắt được nó nên đây không phải defect, nhưng một EV liệt kê thiếu thì `AC-16` cũng đo thiếu, và bằng chứng của round sẽ mỏng hơn hàng rào thật. `v1.2` đưa số ở `:303` vào `EV-14` cùng `AC-16`, và sửa hai chỗ trích dòng lệch một đơn vị.

Ruling `PLN-69` phiên 05/09/2026 sinh ra `v1.4`, và nó là ruling TỰ BÁC thứ hai của cùng hợp đồng. `v1.3` chỉ sửa lời văn của `STEP-05` nên không có ruling riêng. `v1.4` thì đóng một lỗ THẬT: sau khi `STEP-03` giao xong tệp trang, lane unit trả `1 failed | 107 passed` trên 108 tệp, và tệp đỏ là `src/shared/security/public-surface-limiter.static.test.ts` ở `:121` với thông điệp độ dài 3 nhận được 4. Tệp đó không có tên ở CẢ mục 4.1 lẫn mục 4.2 của `v1.3`.

Chỗ tự bác nằm ở `PLN-68`. Ruling ấy đã nhận đúng lớp lỗi — một hợp đồng vừa cấm sửa hàng rào vừa đòi lane xanh là hợp đồng không thi hành được — nhưng nó chỉ đóng ĐÚNG MỘT thể hiện, cái nó đang cầm trong tay vì `EV-16` tình cờ trích chính khối `it(` đó. Câu hỏi tổng quát thì nó không hỏi: hàng rào NÀO đang ghim một CON SỐ mà round này làm đổi? Một hợp đồng thêm bề mặt đọc DB công khai thì đổi một cuộc điều tra dân số, và hàng rào điều tra dân số ấy đã tồn tại từ go-live-18, đo được ngay trên baseline. Nói cách khác `PLN-68` đóng một ca thay vì quét cả lớp, mà phép quét thì rẻ: chạy toàn lane sau `STEP-03` là ra ngay, và nó ra ĐÚNG MỘT tệp đỏ trên 108, tức lớp này chỉ có thêm một thành viên chứ không phải một dãy.

Hướng sửa vẫn là SIẾT, cùng luật với `v1.2`. Chỉ đổi `3` thành `4` bị loại vì nó cấm đúng bằng bản cũ. Bản mới ghim TẬP đường dẫn đã sắp, nên nó còn đỏ ở ba ca mà con số trần bỏ lọt: một consumer bị đổi tên, một consumer bị dời, và một consumer bị thay bằng tệp khác trong khi tổng số giữ nguyên. Đối chiếu với docblock của hàng rào ở `:5` tới `:7`: câu "KHÔNG phải một mảng ba đường dẫn dán tay" nói về NGUỒN của tập, và nguồn vẫn là phép quét tự động — `collectSources`, `consumerEntries` và `consumersMissingLimiter` không đọc một byte nào của khẳng định mới. Danh sách bốn đường là kết quả bị ghim, không phải đầu vào của detector, nên bất biến thật ở `:125` vẫn tự chấm mọi tệp nó tìm được, gồm tệp không có tên trong khẳng định.

Hai hướng khác bị loại. Xoá khẳng định điều tra dân số cho gọn thì lane xanh vĩnh viễn, và go-live-18 mất đúng cái chốt buộc người thêm bề mặt thứ năm phải quay lại đọc lại bằng chứng của nó — đây là một tripwire CÓ CHỦ Ý, mỗi bề mặt đọc công khai mới phải tự trả giá hiệu chỉnh nó trong round của chính mình. Miễn cho trang mới khỏi phép quét, bằng `SKIP_DIRS` hay bằng một lớp bọc để tệp trang không còn chứa chuỗi `withPublicDb`, thì tệ hơn nữa: nó mua màu xanh bằng cách làm bề mặt thứ tư vô hình, đúng điểm mù mà docblock ấy viết ra để chống.

Bump ở thời điểm này là MIỄN PHÍ và đó là lý do làm ngay: `Current audit round` vẫn là `0`, chưa có bản audit nào để một bump làm lệch phép đo của nó. Cửa sổ cấm bump là lúc ghi resolution cho một audit đã có, không phải lúc này.

Ruling `PLN-70` phiên 05/09/2026 sinh ra `v1.5`, và nó là ruling TỰ BÁC thứ ba của cùng hợp đồng. Nó bắt đầu bằng một vết đỏ máy móc: cổng hợp đồng chạy CUỐI CÙNG trên `v1.4` trả `RESULT: FAIL (2 error(s), 0 warning(s))` với mã thoát `2`, ghi ở `evidence/ac00-task-gate-v14.txt`. Hai lỗi là `A-05` nói `RQ-17` không có hàng truy vết trực tiếp, và `T-03` nói `AC-21` chứng minh phạm vi bằng một `git diff` trần.

Cách đọc SAI hai lỗi ấy là coi cả hai là chuyện văn phạm của dụng cụ rồi sửa cho cổng xanh. Đúng một nửa, và nửa đúng KHÔNG phải nửa tôi tưởng lúc đầu. Nửa `A-05` thật sự là hạn chế dụng cụ, đã ghi ngay dưới bảng 6.1: `.ai-pipeline/scripts/verify-task.ps1:115` không nhận mã bước có hậu tố chữ, nên `STEP-06B` nằm ngoài văn phạm và hàng truy vết đúng nghĩa vẫn bị đánh đỏ. Sửa bằng cách dời `STEP-06B` vào ghi chú trong ngoặc, thứ `.ai-pipeline/scripts/verify-task.ps1:117` chấp nhận, và KHÔNG đổi một liên kết nào.

Nửa `T-03` thì khác hẳn, và đây là chỗ tự bác. Thông điệp của nó nói về PHẠM VI, nên phản xạ đầu của tôi là đọc nó như một quy ước hình thức rồi ghi rằng lý do thật nặng hơn thứ cổng tố. Đọc mã kiểm thì phản xạ ấy sai: bình luận ở `.ai-pipeline/scripts/verify-task.ps1:185` viết đúng cái tôi vừa gặp — một `git diff` trần in ra rỗng một khi Tier 2 đã stage — và dẫn tiền lệ `go-live-15 AC-10`. Phần mở đầu tệp ở `.ai-pipeline/scripts/verify-task.ps1:14` nhắc lại cùng ca ấy. Nghĩa là `T-03` nhắm CHÍNH lỗi này ngay từ khi được viết; thông điệp chỉ nói vắn hơn nguyên nhân. Lỗi thật của `v1.4`: `STEP-08` đã `git add` tệp hàng rào, nên tại đúng thời điểm Tier 2 chạy lệnh trong ô phương pháp, dạng không `--cached` trả về RỖNG. Một phép đo rỗng không đếm được hunk nào và không đọc được số dòng nào, tức `AC-21` là một AC BẤT KHẢ ĐO do chính Tier 1 viết — cùng lớp lỗi mà go-live-03 đã ghi một lần. Nét sửa là đổi sang `git diff --cached -U0` kèm đường dẫn tệp, và nói rõ trong ô vì sao phải là dạng ấy.

Bài học nằm ở chỗ tôi vừa suýt ghi sai: khi một mã kiểm bắt đúng nhưng thông điệp của nó nói vắn, đừng suy ra là nó bắt VÌ LÝ DO KHÁC. Đọc mã kiểm trước khi phán về ý định của nó — cùng luật với lần cổng bàn giao của rf-06 mã hoá một tiền đề mà bản giao vừa vi phạm.

Điều đáng ghi nhất là THỨ TỰ phát hiện. Phép đo thật bắt được cái bẫy này TRƯỚC cổng: khi chạy `STEP-08` tôi thấy dạng không `--cached` trả rỗng sau khi stage, nên đã phụ lục dạng `--cached` vào `evidence/ac21-single-hunk.txt` cùng cả hai lần chạy. Nghĩa là bằng chứng đã ĐÚNG trong khi lời văn hợp đồng còn lạc hậu so với nó. Cổng không dạy tôi điều tôi chưa biết; nó buộc tôi ghi vào contract điều mà evidence đã biết. Bài học cho các hợp đồng sau: một ô phương pháp phải viết lệnh chạy được ở ĐÚNG thời điểm trong round mà nó được gọi, không phải lệnh chạy được lúc Tier 1 ngồi viết nó.

Một hướng sửa bị loại thẳng: sửa `.ai-pipeline/scripts/verify-task.ps1` để nới `$stepToken`. Mục 4.2 của chính hợp đồng này cấm chạm bộ cổng, bộ cổng là tài sản của luồng khác, và nới văn phạm của dụng cụ để hợp đồng của mình xanh là mua màu xanh bằng cách hạ thứ đang canh mình — đúng lớp lỗi mà `R-07` cộng `R-08` viết ra để chống, chỉ khác cấp độ.

## 9.1 Planner Resolution — Audit round 1

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | AUD-001 | `ACCEPT_FIX` — ghi nhận `ACCEPTED_RISK` | Tier 3 đo độc lập parity `Lương thương lượng` trên staged blobs; ui-01 đã ACCEPTED và phép đối chiếu hiện tại khớp. Tái-neo parity giữ ở R-06/Q-02 cho thay đổi public UI sau này. Evidence: AUDIT round 1 §1, §5 | Không đổi spec/RQ/STEP/AC | Planner — closed |
| 1 | AUD-002 | `ACCEPT_FIX` — ghi nhận uỷ quyền tác giả contract | Owner đã uỷ quyền Tier 1 kiêm Tier 2 trong phiên riêng; Tier 3 kiểm tra độc lập 21/21 AC và C-01..C-10 đều DONE. Evidence: AUDIT round 1 §1, §2, §6 | Không đổi spec/RQ/STEP/AC | Planner — closed |
| 1 | — | `ACCEPT_FIX` — nghiệm thu task | Verdict `PASS`, không có P0/P1/P2 mở; verify-audit exit `0`, warning S-16 đã được giải trình trong audit §3 | Status chuyển `ACCEPTED`; không mở execution round mới | Tổng công trình sư — accepted |

## 10. Revision Log

| Version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-05 | Tạo hợp đồng: 22 hàng EV, 12 DEC, 17 RQ, 8 STEP, 20 AC, 6 RISK, 3 Open Question | Sếp chuẩn thuận dựng trang danh sách thật ở `/viec-lam` như một hợp đồng riêng ngoài phase new-ui |
| v1.1 | 2026-09-05 | Sửa `AC-20` chuyển tập kết luận sang `git diff --cached --name-only` và loại trừ tường minh path của luồng khác; sửa `AC-19` buộc chốt trạng thái cây trước khi khai bốn lane, cho phép HOÃN kèm hàng `LIM-`, và ghi cách đo cô lập cửa sổ ĐỎ của `STEP-01`. Số AC không đổi | Ruling `PLN-67`: sếp hỏi chạy song song với ui-01 đang code, đo lại thấy `v1.0` tự FAIL `AC-20` vì `app/globals.css` bẩn do Tier 2, và `AC-19` không nói xanh trên cây nào |
| v1.2 | 2026-09-05 | Sửa `EV-16` sau khi đo lại chính khối `it(` nó trích: hàng rào cũ GHIM đích link về `/` nên `STEP-06` làm nó đỏ. Mở đúng một khối `it(` của `src/domains/job-board/public-detail.static.test.ts` ở mục 4.1 và bỏ tệp đó khỏi mục 4.2 kèm luật siết-không-nới; mở rộng `RQ-15`, `STEP-06` cộng numstat `3 2`, và `AC-17` cộng hai tệp evidence mới cho cửa sổ đỏ và xanh của hàng rào; thêm `R-07`. Sửa `EV-14` từ bảy số thành tám và `AC-16` theo cùng. Số AC không đổi | Ruling `PLN-68` tự bác `v1.1`: `RQ-15`, `RQ-17` và mục 4.2 của `v1.1` không cùng đúng được, nên đó là hợp đồng không thi hành được — bump spec trước khi chạy `STEP-01`, không để Tier 2 gặp bế tắc giữa round |
| v1.3 | 2026-09-05 | Sửa điều kiện dừng của `STEP-05` từ "bảy số của `EV-14`" thành TÁM số. Không đổi một phép đo nào khác | `v1.2` sửa `EV-14`, `AC-16` và `R-05` sang tám số nhưng bỏ sót đúng ô này, nên `STEP-05` trỏ vào một tập không tồn tại. Sửa lời văn TRƯỚC khi chạy `STEP-01` vì lúc chưa có bản audit nào thì bump là miễn phí, còn để lại thì `STEP-05` cho Tier 2 một chỉ tiêu thấp hơn hàng rào thật |
| v1.5 | 2026-09-05 | Đổi ô phương pháp của `AC-21` và ô kiểm chứng của `STEP-06B` từ `git diff -U0` sang `git diff --cached -U0` kèm đường dẫn tệp, cộng câu nói vì sao phải là dạng ấy. Dời `STEP-06B` trong hàng truy vết của `RQ-17` vào ghi chú trong ngoặc và ghi hạn chế dụng cụ ngay dưới bảng 6.1. Không thêm, không bớt, không đổi một AC nào — tổng vẫn 21 | Ruling `PLN-70`: cổng hợp đồng chạy cuối cùng trên `v1.4` trả FAIL mã thoát `2` với `A-05` cộng `T-03`. `A-05` là hạn chế văn phạm của `.ai-pipeline/scripts/verify-task.ps1:115`; `T-03` thì nhắm ĐÚNG lỗi này ngay từ khi được viết — bình luận ở `.ai-pipeline/scripts/verify-task.ps1:185` dẫn tiền lệ `go-live-15 AC-10` và nói thẳng một `git diff` trần in ra rỗng sau khi Tier 2 đã stage. Sau khi `STEP-08` stage tệp hàng rào thì dạng không `--cached` trả RỖNG, nên `AC-21` bất khả đo tại đúng thời điểm nó được gọi. Phép đo thật đã bắt bẫy này trước cổng và phụ lục vào `evidence/ac21-single-hunk.txt`, nên bump chỉ là kéo lời văn theo bằng chứng |
