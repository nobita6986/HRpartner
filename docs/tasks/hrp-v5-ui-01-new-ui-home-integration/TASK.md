# TASK: hrp-v5-ui-01-new-ui-home-integration

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-ui-01-new-ui-home-integration` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | HEAD `b68d25b` (bump tu `31625c4`: commit xen giua chi cham .ai-pipeline + docs, diffstat RONG cho moi Module file nen khong phep do EV nao doi). `new-ui/` là thư mục UNTRACKED của luồng khác và trong task này nó là NGUỒN ĐỌC, không phải path bàn giao |
| Modules | `app/globals.css` chỉ khối `@theme`, `app/(portal)/page.tsx`, `src/domains/job-board/components/`, một tệp hàng rào mới dưới `src/domains/job-board/`, và `src/shared/ui/internal-contrast.static.test.ts` (CHỈ assertion ASM-01, xem `DEC-14`) |
| ADR references | go-live-08 `RQ-12` khoá lát CSS, go-live-09 `DEC-14` và `DEC-18` nguồn dải nội dung, go-live-05 `DEC-03` chuỗi lương, go-live-15 ngưỡng WCAG AA |
| Current execution round | `2` |
| Current audit round | `1` |
| Next gate | ĐÓNG ở mức pipeline: ACCEPTED v1.1, audit round 1 CONDITIONAL. Việc còn lại là commit scoped bằng pathspec tường minh rồi push, GIỮ chờ Owner cho phép vì push main tương đương deploy production |
| Updated | `2026-09-06 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Trang chủ `/` mang hình thức của `new-ui`: cỡ chữ có bậc thật, nhịp khoảng trắng rộng hơn, thẻ việc và dải khu vực trông như bản thiết kế. Đổi lại, trang KHÔNG mọc thêm một dải trùng nào, luồng ứng tuyển không hụt một bước nào, và không một con số nào xuất hiện mà không có nguồn trong hệ thống.

### Non-goals

- Không port `TopCompaniesSection` và `CompanyCard`. Bề mặt công khai KHÔNG có cột tên công ty, xem `EV-04`. Không dựng chúng bằng dữ liệu bịa.
- Không port `Navbar`, `Footer`, `MainLayout`. Repo đã có `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx` và `app/(portal)/layout.tsx`.
- Không dựng dải THỨ HAI cho hero, việc nổi bật, khu vực hay thẻ việc. Bốn dải ấy đang sống và đang chạy bằng dữ liệu thật, xem `EV-01`.
- Không sửa một byte nào của lát `app/globals.css` từ dòng `462` tới dòng `633`.
- Không mở chế độ tối, không thêm khối `prefers-reduced-motion` thứ hai.
- Không sửa `app/(portal)/home/page.tsx`. Đó là trang dịch vụ doanh nghiệp, không phải trang chủ, xem `EV-14`.
- Không di chuyển, không xoá, không stage `new-ui/`.
- Không đổi endpoint, không đổi hình dạng DTO, không chạm DB, không chạy migration.
- Không commit, không push. Bàn giao ở trạng thái staged.

## 2. Evidence và Baseline

| ID | Evidence | Source | Note |
|---|---|---|---|
| `EV-01` | Bốn dải mà new-ui tưởng là mới thì ĐANG SỐNG: `JobCard` dòng `217`, `FeaturedJobCard` dòng `423` chạy bằng `overview.topPaid[0]` dự phòng `overview.newest[0]` dòng `744`, `TagStrip` dòng `484` với `heading="Việc làm theo khu vực"` dòng `863` đọc `overview.areaCounts` nguyên văn, `MiniJobList` dòng `522` với hai dải `"Việc làm mới nhất"` và `"Lương cao nhất"` dòng `1091` | `app/(portal)/page.tsx` | Nên đây là task ĐỔI HÌNH THỨC, không phải task ghép dữ liệu. Dòng `43` của chính tệp khai "mảng rỗng, KHÔNG phải số bịa" |
| `EV-02` | Khối `@theme` nằm ở dòng `8` tới `128` và khai `75` token. Trong đó `--text-*` đếm `0`, còn `--font-*` chỉ có `--font-body`, `--font-head`, `--font-label`, `--font-mono` | `grep -cE '^\s*--text-' app/globals.css` trả `0`, `awk 'NR>=9 && NR<=127'` rồi `grep -oE '^\s*--[a-z0-9-]+:'` trả `75` token riêng biệt | Token font tên là `font-head`, KHÔNG phải `font-headline`. Lệch một chữ là lý do `7` class font của new-ui rỗng |
| `EV-03` | `16` class Tailwind của new-ui KHÔNG sinh một byte CSS, kèm số lần xuất hiện: `text-body-md` `18`, `font-body-md` `18`, `text-label-md` `12`, `font-label-md` `12`, `text-headline-md` `10`, `font-headline-md` `10`, `text-headline-lg` `4`, `font-headline-lg` `4`, `text-body-lg` `4`, `font-body-lg` `4`, `text-headline-xl` `2`, `font-headline-xl` `2`, `text-label-sm` `1`, `font-label-sm` `1`, `text-on-background` `3`, `bg-surface-warm` `3` | `grep -ohE '\b(text or font)-(headline or body or label)-(xl or lg or md or sm)\b' new-ui/components/*.tsx` rồi `sort` và `uniq -c` | `228` class riêng biệt trong `new-ui/components/`. Không một cổng nào thấy `16` class rỗng này vì hàng rào đo `globals.css`, không đo tính hợp lệ của class |
| `EV-04` | `CompanyCardProps.name` là bắt buộc, mà `PublicJobDto` không có một field tên công ty nào, và `PublicJobOverview` cũng không | `new-ui/components/CompanyCard.tsx` và `src/domains/job-board/public.service.ts` | Cùng lớp với nhãn ngành của go-live-14: principal công khai không có policy đọc, nên đây là KHÔNG CÓ CỘT, không phải "để trống có chủ ý" |
| `EV-05` | Lát `globals.css` từ `.pub-header {` dòng `462` tới hết khối `.nav-item-lift:hover` dòng `630` và dấu đóng ở dòng `633` bị băm sha256 và đóng băng. Bốn neo `.pub-header {` `462`, `.filter-panel {` `515`, `.job-card {` `553`, `.pub-foot {` `596` phải đủ và đúng thứ tự | `src/domains/job-board/public-ui-premium.static.test.ts` dòng `595` tới `609` | Khối `@theme` ở dòng `8` nằm NGOÀI lát, nên THÊM token là nước đi hợp pháp duy nhất trong tệp này |
| `EV-06` | Ba phép đếm toàn tệp mà hàng rào đòi: `prefers-color-scheme` bằng `0`, `.dark` bằng `0`, `prefers-reduced-motion` bằng đúng `1` | `src/domains/job-board/public-ui-premium.static.test.ts` dòng `623` tới `629` | Thêm CSS mới thì đặt TRƯỚC dòng `462`, đừng nối vào cuối tệp: `R2-02` của `src/shared/ui/design-tokens.static.test.ts` cắt từ khối reduced-motion tới hết tệp |
| `EV-07` | Mốc hàng rào trước round: `npm run test:unit` trên ba tệp canh trang chủ ra `Test Files 3 passed`, `Tests 111 passed`, exit `0`. Chia ra `public-ui-premium.static.test.ts` `63`, `marketplace-inventory.static.test.ts` `25`, `public-detail.static.test.ts` `23` | `npm run test:unit -- src/domains/job-board/public-ui-premium.static.test.ts src/domains/job-board/public-detail.static.test.ts src/domains/applications/marketplace-inventory.static.test.ts` | Số này lấy từ RUNNER. Đếm bằng `grep -c 'it('` cho `117`, và đó là con số SAI |
| `EV-08` | Chuỗi lương canonical là `'Lương thương lượng'`, đặt ở nhánh `min === null` | `app/(portal)/page.tsx` dòng `102` | Bản kế hoạch `new-ui.md` ghi "Thoả thuận". Đổi mặt chữ này là đổi một quyết định có contract của go-live-05 `DEC-03`, không phải tự do dịch thuật |
| `EV-09` | `new-ui` cắm cứng `4` URL `lh3.googleusercontent.com`: `HeroSection` dòng `10`, `Navbar` dòng `14`, `ReferralSection` dòng `13` và dòng `48`. Trang chủ hiện tại có `0` URL ngoài. Hai tệp import `next/image` mà không dùng, và repo không có `next.config.*` | `grep -c 'lh3.googleusercontent.com' new-ui/components/*.tsx` và `ls next.config.*` trả không có tệp | Tất cả là `img` thuần nên KHÔNG 500. Rủi ro thật là rò IP cùng referrer của khách sang Google mỗi lần mở trang, và asset sinh bởi AI sẽ mục |
| `EV-10` | `ReferralSection` in `+10.000.000 VNĐ` dòng `51` và `+50.000.000 VNĐ` dòng `54` trên hai badge `bg-green-500`, với `text-white` đo khoảng `2.3:1`. Không một bảng hoa hồng nào trong hệ thống sinh ra hai con số ấy | `new-ui/components/ReferralSection.tsx` | `/ctv-portal` CÓ THẬT và `app/components/GlobalNavbar.tsx` dòng `22` đã link tới. Văn xuôi "không giới hạn thu nhập" thì `app/(portal)/ctv-portal/page.tsx` dòng `51` đã công bố sẵn; hai con số tiền thì không |
| `EV-11` | `bg-primary-container` là `#a63b00` cộng `text-white` đo khoảng `6.4:1`, tức ĐẠT WCAG AA | `app/globals.css` dòng `34` khai `--color-primary-container` | Ghi vào đây để Tier 2 KHÔNG "sửa" thứ đang đúng. Chỉ `bg-green-500` và `text-green-300` là màu palette thô cần đi |
| `EV-12` | `new-ui/` ở trạng thái `?? new-ui/`, gồm `11` tệp `.tsx` tổng `478` dòng, không tệp nào có `'use client'` | `git status --porcelain -- new-ui` và `wc -l new-ui/components/*.tsx` | Thư mục của luồng khác. Đọc được, sao nội dung được, nhưng không stage và không xoá |
| `EV-13` | `eslint.config.mjs` KHÔNG nạp plugin `@next/next`, nên quy tắc `next/no-img-element` không có hiệu lực trong repo này. `no-unused-vars` ở mức `warn` nên `eslint .` vẫn exit `0` khi còn import không dùng | `eslint.config.mjs` | Ghi vào đây để không ai viết một AC dựa trên một quy tắc lint không tồn tại. Cấm dùng import không dùng vẫn là yêu cầu, nhưng đo bằng `grep`, không bằng lint |
| `EV-14` | `app/(portal)/home/page.tsx` là `257` dòng trang DỊCH VỤ doanh nghiệp với ba khối `SERVICES`, không phải trang chủ | `app/(portal)/home/page.tsx` | Trang chủ là `/` tức `app/(portal)/page.tsx`, `1120` dòng, dòng `1` là `'use client'` |

## 3. Decisions và Assumptions

| ID | Decision/Assumption | Rationale | Impact if wrong |
|---|---|---|---|
| `DEC-01` | Task này ĐỔI HÌNH THỨC của dải đang sống, sửa TẠI CHỖ. Không thêm một dải nội dung mới nào | Bốn dải mà new-ui tưởng là mới thì `EV-01` cho thấy đã sống bằng dữ liệu thật từ go-live-09 | Ghép nguyên new-ui vào thì trang có hai bản của cùng một dải, và bản mới rỗng dữ liệu nên tự ẩn, tức người dùng thấy một trang lỗ chỗ |
| `DEC-02` | Bù `7` bậc cỡ chữ bằng cách THÊM token `--text-*` vào khối `@theme`, không viết lại `7` class `text-*` | Cỡ chữ là bậc thang thiết kế và dùng lại được ở nhiều dải. Khối `@theme` nằm ngoài lát đóng băng theo `EV-05` nên thêm token là hợp pháp | Viết lại thành `text-2xl` kiểu Tailwind mặc định thì bậc chữ của new-ui bị san phẳng và lần sau lại lệch |
| `DEC-03` | `7` class `font-headline-*`, `font-body-*`, `font-label-*` thì NGƯỢC LẠI: viết lại về `font-head`, `font-body`, `font-label`. KHÔNG thêm token `--font-headline-md` | Tailwind phân giải `font-*` thành HỌ CHỮ, nên một token họ chữ tên `--font-headline-md` là vô nghĩa. new-ui viết cặp `text-headline-md` cộng `font-headline-md` chỉ vì nhân bản tiền tố | Thêm token họ chữ theo bậc thì `@theme` phình ra `7` token vô nghĩa và người sau tưởng repo có `11` họ chữ |
| `DEC-04` | `text-on-background` viết lại thành `text-on-surface`, `bg-surface-warm` viết lại thành `bg-surface-container-low` | Hai token gốc không tồn tại theo `EV-02`, và hai token thay thế đã có sẵn trong hệ ấm | Thêm token mới cho hai cái này là dựng hệ màu thứ hai cạnh hệ ấm G27 |
| `DEC-05` | `ReferralSection` được ghép, nhưng chỉ ở dạng dải TRỎ RA `/ctv-portal`, và hai con số tiền ở `EV-10` bị XOÁ khỏi bản ghép | Câu văn xuôi về hoa hồng thì `/ctv-portal` dòng `51` đã công bố; hai con số tiền thì không có bảng nào trong hệ thống sinh ra, và với doanh nghiệp tuyển dụng thì con số thu nhập là phát ngôn có hệ quả pháp lý | In hai con số ấy là bịa số trên bề mặt công khai, đúng lớp lỗi card truth của go-live-05 |
| `DEC-06` | Lát `globals.css` từ dòng `462` tới `633` bất động, và phép đo là CHÍNH `PROTECTED_SHA` chứ không phải mắt người | Hàng rào đã băm sha256 lát ấy; một khoảng trắng lệch cũng làm đỏ | Sửa lát ấy thì `0` pixel đổi trên site vì không tệp `.tsx` nào dùng các class đó, mà hàng rào lại ĐỎ |
| `DEC-07` | CSS mới, nếu round này cần, đặt TRƯỚC dòng `462`. Cấm nối vào cuối tệp | `R2-02` của `src/shared/ui/design-tokens.static.test.ts` cắt lát từ `@media (prefers-reduced-motion: reduce)` tới hết tệp và soi mọi rule bên trong | Nối vào cuối tệp thì CSS mới rơi vào trong lát reduced-motion và làm đỏ một hàng rào khác hẳn, rất khó truy |
| `DEC-08` | Hàng rào MỚI cho tương ứng token với class phải ĐỎ trước khi vá và XANH sau khi vá, và cả hai output được ghi vào evidence | Doctrine RED trước GREEN: một hàng rào chưa từng đỏ thì không chứng minh được nó đo cái gì | Hàng rào viết sau khi vá có thể chỉ khẳng định hiện trạng và sẽ không bắt được lần tái phát |
| `DEC-09` | `0` URL ngoài mới. Ảnh minh hoạ của new-ui thay bằng nền token hoặc SVG cục bộ trong repo | Trang chủ hiện có `0` URL ngoài theo `EV-09`. Bốn URL của new-ui rò IP cùng referrer của khách sang Google và là asset sinh bởi AI nên sẽ mục | Bề mặt công khai gọi ra một host thứ ba mỗi lần mở trang, và ảnh sẽ chết trong im lặng |
| `DEC-10` | Chuỗi `'Lương thương lượng'` giữ nguyên mặt chữ. Không đổi sang "Thoả thuận" | go-live-05 `DEC-03` chốt chuỗi này và cấm in `"0 đ"`. `grep` toàn repo cho `0` test khẳng định chuỗi, nên nó đổi được trong im lặng mà không cổng nào đỏ | Đổi chuỗi là đảo một quyết định có contract trong im lặng |
| `DEC-11` | Tier 2 chỉ được thêm token cho đúng `7` bậc cỡ chữ mà `EV-03` liệt kê. Cần một token ngoài danh sách ấy thì ghi một hàng `LIM` trong HANDOFF và dừng ở đó | Ranh giới sửa phải đóng, nếu không thì `@theme` thành nơi ai cũng thêm được | Khối token phình ra không kiểm soát và go-live-08 mất quyền chốt hệ token |
| `DEC-12` | Không dùng `next/image`. Giữ thẻ `img` thuần và mỗi thẻ có `alt`. Import không dùng bị xoá | Repo không có `next.config.*` nên `next/image` với host lạ là thứ ném lỗi, còn `img` thuần thì không. `EV-13` cho thấy lint không bắt được import không dùng | Đổi sang `next/image` là mở một mặt lỗi 500 mới đúng lúc bàn giao |
| `DEC-13` | Bảy bậc `--text-*` chốt sẵn tại đây để Tier 2 không phải bịa số: `--text-headline-xl` `32px` với `line-height` `1.2`, `--text-headline-lg` `24px` với `1.25`, `--text-headline-md` `20px` với `1.3`, `--text-body-lg` `18px` với `1.6`, `--text-body-md` `16px` với `1.6`, `--text-label-md` `14px` với `1.4`, `--text-label-sm` `12px` với `1.4` | Bậc chữ là quyết định thiết kế nên thuộc Tier 1. Thân chữ `16px` giữ đúng ngưỡng chống tự phóng của iOS, `12px` là sàn nhãn, và `line-height` thân chữ nằm trong khoảng `1.5` tới `1.75` mà chuẩn UX đòi | Để Tier 2 tự chọn thì bậc chữ thành số ngẫu nhiên và lần sau không ai biết vì sao |
| `DEC-14` | go-live-16 ASM-01 (`src/shared/ui/internal-contrast.static.test.ts` dòng ~575) đổi từ "không có khoá `--text-*`" sang "đúng `14` khoá `--text-*` của DEC-13". ui-01 mang `--text-*` vào `@theme` là hợp pháp theo DEC-02, nên ASM-01 chuyển từ "cấm mọi token cỡ chữ" thành tripwire ghim đúng bộ token đã duyệt. Cú pháp cỡ-chữ-kèm-line-height của Tailwind v4 sinh mỗi bậc thành HAI custom property (`--text-x` và `--text-x--line-height`), nên `7` bậc DEC-13 thành `14` khoá trong map `@theme` | Phép đo tương phản của go-live-16 tính trên CẶP MÀU fg trên bg (hex), không đọc cỡ chữ; cỡ chữ chỉ đổi NGƯỠNG lớn-hay-thường (3:1 với chữ lớn, 4.5:1 với chữ thường), mà ui-01 không đổi một token màu nào nên không có hồi quy tương phản. Ghim đúng 14 khoá còn CHẶT hơn "phải bằng 0" | Nếu sai: một cỡ chữ mới lọt vào ngoài DEC-13, hoặc một cặp màu tụt ngưỡng, nhưng cả hai đã có token-parity hangar và ba tệp tương phản canh riêng |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Type | Priority |
|---|---|---|---|
| `RQ-01` | Khối `@theme` có đúng `7` token `--text-*` cho bảy bậc mà `EV-03` liệt kê, và mọi token khác trong khối giữ nguyên | Functional | P0 |
| `RQ-02` | `0` class thuộc bảy tên `font-headline-xl`, `font-headline-lg`, `font-headline-md`, `font-body-lg`, `font-body-md`, `font-label-md`, `font-label-sm` còn sót trong mã đã ghép | Functional | P0 |
| `RQ-03` | `0` class `text-on-background` và `0` class `bg-surface-warm` còn sót trong mã đã ghép | Functional | P0 |
| `RQ-04` | Lát `app/globals.css` từ dòng `462` tới hết tệp bất động theo byte | Safety | P0 |
| `RQ-05` | Ba phép đếm toàn tệp giữ nguyên: `prefers-color-scheme` `0`, `.dark` `0`, `prefers-reduced-motion` đúng `1` | Safety | P0 |
| `RQ-06` | Ba tệp hàng rào canh trang chủ vẫn ra `111` test PASS và exit `0` | Quality | P0 |
| `RQ-07` | `0` URL trỏ host ngoài repo trong mọi tệp mà round này sửa hoặc thêm | Safety | P0 |
| `RQ-08` | `0` class màu palette thô trong mọi tệp mà round này sửa hoặc thêm | Quality | P0 |
| `RQ-09` | Chuỗi `'Lương thương lượng'` còn nguyên mặt chữ, và `0` lần xuất hiện của "Thoả thuận" hay `"0 đ"` trên đường lương | Functional | P0 |
| `RQ-10` | `0` lần xuất hiện của hai con số tiền `10.000.000` và `50.000.000` trong mã đã ghép, và dải giới thiệu có link tới `/ctv-portal` | Functional | P0 |
| `RQ-11` | Luồng ứng tuyển còn sống: `ApplyModal`, `SuccessModal` và lời gọi `/api/jobs` vẫn còn trong trang chủ | Functional | P0 |
| `RQ-12` | Có một tệp hàng rào MỚI khẳng định mọi class `text-*` và `font-*` dùng trong dải trang chủ đều có token tương ứng trong `@theme`, và nó đã từng ĐỎ trước khi vá | Quality | P0 |
| `RQ-13` | Toàn lane `npm run test:unit` exit `0` và số test không giảm so với mốc đo ở `STEP-02` | Quality | P0 |
| `RQ-14` | `npm run typecheck` exit `0` và `npm run lint` exit `0` | Quality | P0 |
| `RQ-15` | `new-ui/` vẫn ở trạng thái untracked, không tệp nào của nó bị stage, sửa hay xoá | Scope | P0 |
| `RQ-16` | Không tệp nào ngoài `Modules` và thư mục task này bị Tier 2 thay đổi | Scope | P0 |
| `RQ-17` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG đều ra `RESULT: PASS` với exit `0` | Process | P0 |
| `RQ-18` | go-live-16 ASM-01 tại `src/shared/ui/internal-contrast.static.test.ts` khẳng định ĐÚNG `14` khoá `--text-*` của DEC-13 (7 bậc cỡ chữ cộng 7 bạn `--line-height`), thay cho `toEqual([])`, và mọi `it()` khác trong tệp giữ nguyên | Safety | P0 |

### 4.2 Scope boundaries

| In scope | Out of scope |
|---|---|
| `app/globals.css` chỉ khối `@theme` từ dòng `8` tới `128` | `app/globals.css` từ dòng `462` tới hết tệp, và mọi dòng giữa `129` và `461` |
| `app/(portal)/page.tsx` phần trình bày của các dải đang sống | `app/(portal)/page.tsx` phần state, `useEffect`, `buildQuery`, `ApplyModal` và `SuccessModal` |
| Tệp mới dưới `src/domains/job-board/components/` cho component trình bày tách ra | `src/domains/job-board/public.service.ts` và mọi tệp API dưới `app/api/` |
| Một tệp hàng rào mới dưới `src/domains/job-board/` | Ba tệp hàng rào sẵn có canh trang chủ, và `src/shared/ui/design-tokens.static.test.ts` |
| `docs/tasks/hrp-v5-ui-01-new-ui-home-integration/**` | `new-ui/`, `new-ui.md`, `app/(portal)/home/page.tsx`, `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`, `app/(portal)/layout.tsx` |
| Không có | `prisma/`, `.ai-pipeline/`, `package.json`, `vitest.config.ts`, `eslint.config.mjs`, `AUDIT.md` và `TASK.md` của mọi slug khác |

### 4.3 Data, State, Permission và Interface Rules

| Rule ID | Rule |
|---|---|
| `R-01` | Tier 2 KHÔNG commit và KHÔNG push. Chỉ `git add` path trong scope; cấm `git add -A` và `git add .` |
| `R-02` | Không chạm DB: không migration, không seed, không đổi truy vấn, không đổi hình dạng DTO |
| `R-03` | Không in một con số nào lên bề mặt công khai mà không có nguồn trong `PublicJobDto` hoặc `PublicJobOverview`. Dải rỗng thì tự ẩn, không điền số mẫu |
| `R-04` | Gọi script cổng bằng `powershell -NoProfile -File`; cờ hạ execution policy không được phép trong phiên này |
| `R-05` | Thay đổi của luồng khác trong cây làm việc, gồm cả `new-ui/`: không reset, không restore, không overwrite, không stage, không commit, không xoá |
| `R-06` | Lane test canonical là `npm run test:unit`. Không dùng lane trần để lấy số bàn giao |
| `R-07` | Mọi thẻ ảnh có `alt`, mọi nút chỉ có icon có `aria-label`, và đích chạm không nhỏ hơn `44` nhân `44` pixel |
| `R-08` | Cổng `verify-task.ps1` và `verify-handoff.ps1` chạy CUỐI CÙNG, sau khi mọi thay đổi đã staged |

## 5. Execution Plan

| STEP ID | Step | Output |
|---|---|---|
| `STEP-01` | Đọc lại `TASK.md` này rồi chốt dấu tay hai tệp sẽ sửa bằng `git hash-object app/globals.css "app/(portal)/page.tsx"`, và chốt `git status --porcelain -- new-ui` để có bản gốc của `RQ-15` | `evidence/step01-baseline.txt` |
| `STEP-02` | Chạy `npm run test:unit` toàn lane rồi chạy riêng ba tệp hàng rào canh trang chủ, ghi cả hai con số mốc TRƯỚC khi sửa | `evidence/step02-tests-before.txt` |
| `STEP-03` | Viết tệp hàng rào MỚI cho tương ứng token với class rồi chạy nó để nó ĐỎ, theo `DEC-08`. Ghi output đỏ | `evidence/step03-hangar-red.txt` |
| `STEP-04` | Thêm `7` token `--text-*` vào khối `@theme` theo `DEC-02`, chỉ trong khoảng dòng `8` tới `128` | `evidence/step04-theme-diff.txt` |
| `STEP-05` | Sao phần trình bày của new-ui vào các dải ĐANG SỐNG của `app/(portal)/page.tsx` và các component tách ra, sửa `7` class `font-*-*` theo `DEC-03` và hai class token thiếu theo `DEC-04`, bỏ màu palette thô, bỏ URL ngoài | `evidence/step05-restyle-diff.txt` |
| `STEP-06` | Ghép dải giới thiệu cộng tác viên theo `DEC-05`: xoá hai con số tiền, giữ link tới `/ctv-portal` | `evidence/step06-referral-diff.txt` |
| `STEP-11` | (Chạy sau `STEP-04`, trước `STEP-08`) Sửa assertion ASM-01 trong `src/shared/ui/internal-contrast.static.test.ts` (dòng ~575): từ `.toEqual([])` sang khẳng định tập khoá `--text-*` bằng ĐÚNG `14` tên DEC-13 (7 bậc cộng 7 bạn `--line-height`), theo `DEC-14`. KHÔNG chạm `it()` nào khác trong tệp. Chạy lại chính tệp này cho XANH và ghi output | `evidence/step11-asm01.txt` |
| `STEP-07` | Chạy lại tệp hàng rào mới để nó XANH, rồi chạy ba tệp hàng rào canh trang chủ và đối chiếu với mốc `EV-07` | `evidence/step07-hangar-green.txt` |
| `STEP-08` | Chạy `npm run test:unit` toàn lane, `npm run typecheck`, `npm run lint`, ghi ba mã thoát | `evidence/step08-lane-typecheck-lint.txt` |
| `STEP-09` | Đo bảy phép đếm của `RQ-02`, `RQ-03`, `RQ-07`, `RQ-08`, `RQ-09`, `RQ-10`, `RQ-11` trên tập tệp đã sửa | `evidence/step09-counts.txt` |
| `STEP-10` | Đo lại dấu tay và scope, xác nhận `new-ui/` còn untracked, `git add` path trong scope, rồi chạy `verify-task.ps1` và `verify-handoff.ps1` CUỐI CÙNG | `evidence/step10-scope-gates.txt` |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Số dòng khai token `--text-` trong `app/globals.css` bằng `7`, và tổng token riêng biệt trong khối `@theme` bằng `82`, tức `75` cũ cộng `7` mới | `grep -cE '^\s*--text-' app/globals.css` rồi `sed -n '/^@theme {/,/^}/p' app/globals.css` rồi `grep -coE '^\s*--[a-z0-9-]+:'` | `evidence/step04-theme-diff.txt` | Yes |
| `AC-02` | `RQ-02` | Với từng tên trong bảy tên liệt kê ở `RQ-02`, phép đếm trên tập tệp mà round này sửa hoặc thêm trả `0`. Tổng bảy phép đếm bằng `0` | `grep -rc` từng tên trên tập tệp đã sửa, đọc bảy con số | `evidence/step09-counts.txt` | Yes |
| `AC-03` | `RQ-03` | `grep -rc 'text-on-background'` trả `0` và `grep -rc 'bg-surface-warm'` trả `0` trên tập tệp đã sửa | `grep -rc` hai chuỗi đó | `evidence/step09-counts.txt` | Yes |
| `AC-04` | `RQ-04` | Hàng rào lát đóng băng PASS `63` test với exit `0`, VÀ mọi hunk của diff `app/globals.css` có số dòng đích nhỏ hơn `462` | `npm run test:unit -- src/domains/job-board/public-ui-premium.static.test.ts` rồi `git diff --cached -U0 -- app/globals.css` và đọc từng dòng `@@` | `evidence/step07-hangar-green.txt` | Yes |
| `AC-05` | `RQ-05` | `grep -c 'prefers-color-scheme' app/globals.css` trả `0`, `grep -c '\.dark' app/globals.css` trả `0`, `grep -c 'prefers-reduced-motion' app/globals.css` trả đúng `1` | `grep -c` ba chuỗi đó trên chính tệp | `evidence/step09-counts.txt` | Yes |
| `AC-06` | `RQ-06` | Ba tệp hàng rào canh trang chủ ra `Test Files 3 passed` và `Tests 111 passed` với exit `0`, khớp mốc `EV-07` | `npm run test:unit -- src/domains/job-board/public-ui-premium.static.test.ts src/domains/job-board/public-detail.static.test.ts src/domains/applications/marketplace-inventory.static.test.ts` | `evidence/step07-hangar-green.txt` | Yes |
| `AC-07` | `RQ-07` | Số URL host-ngoài do round này THÊM bằng `0`, đo theo HIỆU worktree trừ baseline: với tệp đã có ở baseline, số dòng khớp mẫu URL ở worktree bằng số ở `git show b68d25b:` cùng tệp (hiệu `0`); với tệp MỚI, baseline coi như `0`. Tổng hiệu bằng `0`. Dòng `@import` fonts sẵn có ở `app/globals.css` dòng `2` KHÔNG tính vì baseline đã có | `grep -cE 'https?://'` trên worktree đối chiếu `git show b68d25b:` cùng tệp, đọc hiệu từng tệp | `evidence/step09-counts.txt` | Yes |
| `AC-08` | `RQ-08` | Bảy phép đếm họ màu thô trên tập tệp đã sửa đều trả `0`, mỗi họ neo bằng "ký-tự-trước-không-phải-chữ-cái cộng chữ số bậc": `[^a-zA-Z]green-[0-9]`, `[^a-zA-Z]blue-[0-9]`, `[^a-zA-Z]slate-[0-9]`, `[^a-zA-Z]gray-[0-9]`, `[^a-zA-Z]zinc-[0-9]`, `[^a-zA-Z]amber-[0-9]`, `[^a-zA-Z]yellow-[0-9]`. Neo này loại dương-tính `slate-` nằm trong `-translate-y-1/2` (trước `s` là `n`, và sau `slate-` là `y` không phải chữ số) | `grep -roE` từng mẫu bảy họ trên tập tệp đã sửa, đọc bảy con số | `evidence/step09-counts.txt` | Yes |
| `AC-09` | `RQ-09` | `grep -c 'Lương thương lượng'` trên trang chủ trả ít nhất `1` (giữ nguyên). Với hai chuỗi cấm ở `RQ-09`, số đếm ở worktree KHÔNG lớn hơn số đếm ở `git show b68d25b:` cùng tệp, tức round này THÊM `0` lần. Mọi lần khớp còn lại nằm trong comment tài liệu go-live-09/DEC-03 ở `app/(portal)/page.tsx` dòng ~100, không trên đường render lương; nhánh canonical ở dòng ~107 | `grep -c` chuỗi canonical, và đối chiếu `grep -rc` hai chuỗi cấm giữa worktree và `git show b68d25b:` cùng tệp | `evidence/step09-counts.txt` | Yes |
| `AC-10` | `RQ-10` | `grep -rc '10.000.000'` trả `0` và `grep -rc '50.000.000'` trả `0` trên tập tệp đã sửa, còn `grep -rc '/ctv-portal'` trả ít nhất `1` | `grep -rc` ba chuỗi đó | `evidence/step06-referral-diff.txt` | Yes |
| `AC-11` | `RQ-11` | Trên `app/(portal)/page.tsx` sau round, `grep -c 'ApplyModal'` và `grep -c 'SuccessModal'` và `grep -c '/api/jobs'` đều trả ít nhất `1`, VÀ hàng rào tồn kho ra `25 passed` exit `0` | `grep -c` ba chuỗi đó rồi `npm run test:unit -- src/domains/applications/marketplace-inventory.static.test.ts` | `evidence/step09-counts.txt` | Yes |
| `AC-12` | `RQ-12` | Tệp `src/domains/job-board/public-ui-token-parity.static.test.ts` tồn tại; lần chạy ở `STEP-03` có ít nhất `1` test failed và exit khác `0`; lần chạy ở `STEP-07` ra `0` failed và exit `0` | `npm run test:unit -- src/domains/job-board/public-ui-token-parity.static.test.ts` chạy hai lần, đọc dòng `Tests` và mã thoát của mỗi lần | `evidence/step03-hangar-red.txt` và `evidence/step07-hangar-green.txt` | Yes |
| `AC-13` | `RQ-13` | Toàn lane ra exit `0`, và số test không nhỏ hơn mốc do `STEP-02` đo cộng số test của tệp hàng rào mới | `npm run test:unit` rồi đọc dòng `Tests` và mã thoát, đối chiếu `evidence/step02-tests-before.txt` | `evidence/step08-lane-typecheck-lint.txt` | Yes |
| `AC-14` | `RQ-14` | `npm run typecheck` exit `0`; và lint bề mặt nguồn ui-01 exit `0`: `npx eslint app src` ra `0 error` exit `0`. `.claude/worktrees/**` (worktree KHOÁ của luồng song song) KHÔNG thuộc bề mặt ui-01 nên loại khỏi phép đo — `npm run lint` chạy `eslint .` quét vào đó chỉ vì `eslint.config.mjs` chưa ignore `.claude/**` (nợ toolchain, xem Revision Log) | `npm run typecheck` rồi `npx eslint app src`, ghi hai mã thoát | `evidence/step08-lane-typecheck-lint.txt` | Yes |
| `AC-15` | `RQ-15` | `git status --porcelain -- new-ui` vẫn trả đúng một dòng bắt đầu bằng hai dấu hỏi, và `git diff --cached --name-only -- new-ui` trả `0` dòng | `git status --porcelain -- new-ui` rồi `git diff --cached --name-only -- new-ui` | `evidence/step10-scope-gates.txt` | Yes |
| `AC-16` | `RQ-16` | Hợp của `git status --porcelain` và `git diff --cached --name-only` do Tier 2 gây ra chỉ gồm path trong `Modules` và path dưới `docs/tasks/hrp-v5-ui-01-new-ui-home-integration/`. Path của Tier 1 và của luồng khác không tính vào AC này | `git status --porcelain` và `git diff --cached --name-only`, đối chiếu dấu tay ở `STEP-01` | `evidence/step10-scope-gates.txt` | Yes |
| `AC-17` | `RQ-17` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG đều ra `RESULT: PASS` với exit `0` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-ui-01-new-ui-home-integration/TASK.md` rồi `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v5-ui-01-new-ui-home-integration/TASK.md` | `evidence/step10-scope-gates.txt` | Yes |
| `AC-18` | `RQ-18` | `src/shared/ui/internal-contrast.static.test.ts` chạy ra `0 failed` exit `0`; test ASM-01 khẳng định tập khoá `--text-*` bằng đúng `14` tên của DEC-13; số `it()` của tệp KHÔNG đổi so với baseline (chỉ đổi assertion, không thêm hay bớt test) | `npm run test:unit -- src/shared/ui/internal-contrast.static.test.ts` đọc dòng `Tests` và mã thoát; `git diff HEAD -U0 -- src/shared/ui/internal-contrast.static.test.ts` chỉ chạm vùng ASM-01 | `evidence/step11-asm01.txt` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-04` | `AC-01` |
| `RQ-02` | `STEP-05` | `AC-02` |
| `RQ-03` | `STEP-05` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-07` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-07` |
| `RQ-08` | `STEP-05` | `AC-08` |
| `RQ-09` | `STEP-05` | `AC-09` |
| `RQ-10` | `STEP-06` | `AC-10` |
| `RQ-11` | `STEP-05` | `AC-11` |
| `RQ-12` | `STEP-03` | `AC-12` |
| `RQ-13` | `STEP-08` | `AC-13` |
| `RQ-14` | `STEP-08` | `AC-14` |
| `RQ-15` | `STEP-10` | `AC-15` |
| `RQ-16` | `STEP-10` | `AC-16` |
| `RQ-17` | `STEP-10` | `AC-17` |
| `RQ-18` | `STEP-11` | `AC-18` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Tier 2 đọc "ghép new-ui" theo mặt chữ rồi dựng dải THỨ HAI cho hero, việc nổi bật, khu vực hay thẻ việc, và bản mới rỗng dữ liệu nên tự ẩn | Trang chủ sau round có hai dải cùng nội dung, hoặc một dải mới không đọc `overview` | `DEC-01` buộc sửa tại chỗ, `EV-01` chỉ đúng số dòng của bốn dải đang sống, và `AC-11` giữ luồng ứng tuyển | Bác bàn giao, mở execution round mới. Không tự gỡ dải trong lúc audit |
| `RISK-02` | Lát `globals.css` từ dòng `462` bị sửa, kể cả chỉ một khoảng trắng | `AC-04` đỏ ở phần hàng rào lát đóng băng | `DEC-06` cấm, và phép đo là chính `PROTECTED_SHA` chứ không phải mắt người | `git checkout` riêng vùng đó thì không làm được vì cùng tệp; cách đúng là hoàn nguyên tệp rồi áp lại chỉ phần `@theme` |
| `RISK-03` | CSS mới bị nối vào cuối tệp nên rơi vào trong lát reduced-motion của `R2-02` | `npm run test:unit` trên `src/shared/ui/design-tokens.static.test.ts` đỏ | `DEC-07` chỉ rõ chèn TRƯỚC dòng `462` | Di chuyển khối CSS mới lên trước dòng `462` rồi chạy lại hai hàng rào |
| `RISK-04` | Thêm token họ chữ theo bậc, kiểu `--font-headline-md`, làm khối `@theme` phình token vô nghĩa | Tổng token ở `AC-01` khác `82` | `DEC-03` cấm, và `AC-01` ghim đúng hai con số `7` và `82` | Xoá token họ chữ vừa thêm, sửa class về `font-head` hoặc `font-body` hoặc `font-label` |
| `RISK-05` | Luồng khác dịch `new-ui/` hoặc `app/globals.css` giữa round | Dấu tay ở `STEP-10` lệch dấu tay ở `STEP-01`, hoặc `git status -- new-ui` đổi hình | `STEP-01` chốt dấu tay, `STEP-10` đo lại | Không reset và không restore tệp của luồng khác. Ghi một hàng `LIM` rồi bàn giao `BLOCKED` cho Tier 1 phân xử |
| `RISK-06` | Hàng rào tương ứng token với class được viết SAU khi vá nên chưa từng đỏ, và sẽ không bắt được lần tái phát | `evidence/step03-hangar-red.txt` vắng, hoặc nó có `0` failed | `DEC-08` và `AC-12` đòi cả hai lần chạy với hai kết cục ngược nhau | Xoá token vừa thêm, chạy lại hàng rào để lấy output đỏ thật, rồi vá lại |
| `RISK-07` | Bốn URL ảnh ngoài được giữ lại vì "chỉ là ảnh tạm" | `AC-07` đếm khác `0` | `DEC-09` và `AC-07` | Thay bằng nền token hoặc SVG cục bộ. Không thay bằng một host ngoài khác |
| `RISK-08` | Hai con số tiền của dải cộng tác viên đi theo bản sao vào trang chủ | `AC-10` đếm khác `0` | `DEC-05`, `R-03` và `AC-10` | Xoá hai badge. Nếu cần một lời hứa thu nhập thì trỏ về văn đã công bố ở `/ctv-portal`, không in số mới |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Bảy bậc chữ ở `DEC-13` có nên vào `stitch/warm_professionalism/DESIGN.md` để thành chuẩn thiết kế, hay giữ ở mức token của repo? | Tier 1 | Sau task này | No |
| `Q-02` | `app/(portal)/page.tsx` đang `1120` dòng và chở cả luồng ứng tuyển. Có nên tách thành nhiều component trong một contract riêng? Round này KHÔNG tách | Tier 1 | Sau task này | No |
| `Q-03` | Sau khi round đóng, `new-ui/` xoá hay giữ làm bản tham chiếu thiết kế? Thư mục thuộc luồng khác nên chỉ sếp quyết | Sếp | Sau khi task ACCEPTED | No |
| `Q-04` | `TopCompaniesSection` cần một cột tên công ty trên bề mặt công khai. Mở cột ấy là một quyết định dữ liệu cộng RLS, không phải việc UI. Có mở một contract riêng không? | Tier 1 | Sau task này | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | Verdict | ADOPT CONDITIONAL rồi ACCEPTED | 17/18 AC PASS đo độc lập, 0 FAIL, 0 finding P0/P1; AC-13 PARTIAL đã waive ở AUD-001. Tier 1 tự đọc AUDIT.md và tự chạy lại ba cổng trước khi chốt | Không bump (audit khớp v1.1) | Task ACCEPTED v1.1 |
| `1` | `AUD-001` (P2) | WAIVE nửa mã thoát AC-13 theo phép đo | Hai test đỏ ở src/shared/toolchain/tsc-program-boundary.static.test.ts của luồng rf-05: không có ở baseline b68d25b (git cat-file -e exit 128), chưa từng commit (git log --oneline rỗng), đang stage bởi luồng khác (git status --porcelain trả A). Nửa ĐẾM đạt 1683 bằng 1669 cộng 14; năm Module ui-01 thêm 0 test đỏ. Neo AC-13 theo ĐỒNG NHẤT TẬP test đỏ sau khi loại tệp luồng khác | Không (waive, giữ v1.1) | Closed-accept; evidence/audit-round1-ac13-attribution.txt |
| `1` | `AUD-004` (P2) | ACK giao thức commit | Index đang chở nhiều path hơn thư mục task, phần lớn nằm ngoài phạm vi ui-01 (số đo chính xác ở AUDIT.md AC-16 và §4, evidence/audit-round1-counts.txt). Commit phải truyền pathspec tường minh cho các path ui-01 và đọc diffstat trước khi push; tuyệt đối không git add tất cả | Không | Áp lúc commit; đang giữ chờ Owner cho phép push |
| `1` | `AUD-005` (P3) | FIX đồng bộ index | TASK.md trong index còn v1.0. Tier 1 stage lại TASK.md sau khi ghi §9 và §10 để index mang v1.1 kèm resolution | Không (chỉ đồng bộ index) | Stage trong bước resolve này |
| `1` | `AUD-002` (P3) | DEFER nợ từ vựng | Worktree phụ không có dòng locked, nhưng R-05 vẫn cấm chạm tệp luồng khác nên loại trừ của AC-14 và LIM-01 đứng trên cơ sở R-05 chứ không trên trạng thái khoá. Sửa lời văn ở lượt vệ sinh contract sau | Không (defer, không bump giữa resolution) | Hàng đợi vệ sinh contract |
| `1` | `AUD-003` (P3) | DEFER nợ từ vựng | AC-01 gọi 82 là token riêng biệt trong khi đó là số dòng khai (89 tên riêng biệt). AC-01 vẫn PASS vì lệnh đo trả đúng 82. Sửa lời văn lượt sau | Không (defer) | Hàng đợi vệ sinh contract |
| `1` | `AUD-006` (P3) | ROUTE task mới | Một ký tự U+FFFD ở app/(portal)/ctv-portal/page.tsx dòng 21, ngoài Modules ui-01 nên Tier 2 đúng khi không sửa. Mở task sửa ký tự hỏng riêng | Không (ngoài phạm vi) | Định tuyến sang task ctv-portal |
| `1` | `AUD-007` (P2) | ROUTE nợ hệ thống | Điểm mù .claude của hàng rào toolchain và lint toàn cục còn đỏ lại mọi vòng sau khi còn worktree phụ; cùng gốc với AC-13. Mở nợ toolchain: dạy hàng rào phân loại .claude/worktrees hoặc dọn worktree phụ | Không (nợ hệ thống) | PLANNER_HANDOVER nợ toolchain, cùng PLN-57 và PLN-58 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-05` | Contract đầu tiên: đổi hình thức cho dải trang chủ ĐANG SỐNG, thêm `7` token `--text-*`, viết lại `9` class không có token, giữ lát CSS đóng băng bất động, xoá hai con số tiền không nguồn, và một hàng rào mới cho tương ứng token với class | Sáu bẫy đo được trước khi viết contract, xem `EV-01` tới `EV-14`; nợ hàng đợi `ui-01` |
| `v1.1` | `2026-09-06` | Round 1 giao BLOCKED 12/17 (hai cổng RESULT PASS exit 0). Tier 1 tự đo lại năm mục chặn: CẢ NĂM là defect phía Tier 1 (hợp đồng, phép đo, toolchain), 0 defect thực thi Tier 2 nên KHÔNG mở execution round cho round 1, chỉ bump spec cộng một round 2 hẹp cho BLK-01. BLK-01 (xung đột hợp đồng cứng): AC-01 đòi 7 token `--text-*` mà go-live-16 ASM-01 đóng băng ở 0; cú pháp Tailwind v4 biến 7 bậc thành 14 khoá `@theme`, và ASM-01 nằm NGOÀI Modules nên Tier 2 đúng khi không tự sửa. Xử: đưa `internal-contrast.static.test.ts` vào Modules (chỉ assertion ASM-01), thêm RQ-18, STEP-11, AC-18, DEC-14 nâng tripwire lên "ghim đúng 14 khoá DEC-13". BLK-02 (ô nhiễm worktree lạ): 63 lint error đều nằm trong `.claude/worktrees/gl20` (worktree KHOÁ luồng khác); `npx eslint app src` cây chính đo lại exit 0 với 0 error, nên AC-14 thu phạm vi lint về bề mặt nguồn ui-01. AC-07 sửa sang HIỆU worktree trừ baseline b68d25b (bỏ dòng `@import` fonts sẵn có ở globals.css dòng 2). AC-08 neo mẫu ký-tự-trước-không-phải-chữ-cái cộng chữ số bậc (loại dương-tính `slate-` trong `-translate-y-1/2`). AC-09 đo theo DELTA vs baseline (mọi khớp còn lại là comment DEC-03) | Nguồn: handoff BLOCKED round 1 cộng RISK-05 giao quyền phân xử cho Tier 1 (KHÔNG có AUDIT.md, Current audit round vẫn 0 nên §9 để trống). Tier 1 tự đo crux thay vì tin số Tier 2: assertion `toEqual([])` tại internal-contrast dòng ~575 cộng 14 khoá `--text-` đếm bằng grep; `git worktree list` xác nhận gl20 khoá; `npx eslint app src` exit 0; `slate-` chỉ khớp `-translate-y-1/2` dòng 410; chuỗi cấm nằm ở comment dòng ~100, nhánh canonical `'Lương thương lượng'` dòng ~107. Doctrine bump-không-mở-round: PLN-55..59, hrp-recovery-round-thresholds, hrp-golive03-contract-traps |
| `v1.1` | `2026-09-06` | Resolve sau audit round 1 (verdict CONDITIONAL: 17/18 AC PASS đo độc lập, 0 FAIL, 0 finding P0/P1). KHÔNG bump phiên bản — audit khớp v1.1 nên chỉ ghi resolution, giữ control row v1.1 (doctrine golive05: cấm bump khi ghi resolution trên audit đã khớp phiên bản, tránh làm đỏ A-02 trên artifact vừa xanh). AC-13 PARTIAL được WAIVE theo phép đo (AUD-001): hai test đỏ thuộc tệp tsc-program-boundary của luồng rf-05, ngoài baseline b68d25b, chưa từng commit, ui-01 thêm 0 test đỏ trong năm Module. AUD-004 và AUD-005 áp lúc commit: truyền pathspec tường minh, đọc diffstat trước push, stage lại TASK.md để index mang v1.1. AUD-002, AUD-003, AUD-006, AUD-007 defer hoặc route sang task khác, không bump. Status chuyển ACCEPTED, Current audit round lên 1 | AUDIT.md round 1; Tier 1 tự đọc AUDIT.md và tự chạy verify-task, verify-handoff, verify-audit; doctrine hrp-golive05-card-truth-status, hrp-a02-permanently-red-after-demanded-bump, hrp-golive16-forced-fail-verdict, hrp-resolve-requires-real-audit |
