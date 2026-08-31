# TASK: hrp-v5-go-live-12-public-job-detail-page

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-12-public-job-detail-page` |
| Work type | `CODE` — route công khai mới, mở rộng projection additive, tách component apply |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `ACCEPTED` — Tier 1 quyết ngày 31/08 sau khi tự chạy gate exit 0 và tự đo lại trên production; xem §9 |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent context |
| Baseline | `0248948`; Tier 2 khóa lại SHA thật khi nhận việc |
| Modules | M13 Marketplace public surface — trang chi tiết việc làm, card trên `/`, projection công khai |
| ADR references | `G27 Warm Professionalism (15/08)`; go-live-04 `DEC-08` một đường đọc vô danh duy nhất; hotfix-02 `DEC-01` cấm select quan hệ bắt buộc trên bảng bị RLS che |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `DONE` — mã đã commit `691be38` và đã lên production trước khi có resolution, ghi thành `F-01`; còn lại là bước OP của Owner ở §9.4 |
| Updated | `2026-08-31 21:05 +07` |

## 1. Outcome

### User-visible outcome

Bấm vào một card việc làm trên `/` thì mở trang riêng của việc đó tại `/viec-lam/{ma-du-an}`. Trang đó:

- Có tiêu đề việc làm cỡ lớn, mã việc làm, và các chip thông tin: khu vực, ca làm, loại hình, ngành nghề.
- Liệt kê **từng vị trí đang tuyển** của việc đó: tên vị trí, ca làm của vị trí, địa điểm làm việc của vị trí, và số chỗ còn trống của vị trí. Hôm nay danh sách này không tồn tại ở bất kỳ đâu trên bề mặt công khai; card chỉ hiện vị trí đầu tiên và một con số tổng.
- Có hạn nhận hồ sơ nếu dữ liệu có hạn.
- Có nút **Ứng tuyển** mở đúng form ứng tuyển đang dùng trên `/`, gửi tới đúng endpoint canonical, và trả đúng mã tra cứu như cũ. Trên màn hình hẹp, nút này dính ở cạnh dưới để không phải cuộn lên.
- Có đường quay lại danh sách.
- Chia sẻ được: dán link vào Zalo hay Facebook thì tiêu đề tab và thẻ mô tả nói đúng việc làm đó, không phải tiêu đề chung của trang chủ.

Card trên `/` vẫn giữ nguyên nút Ứng tuyển. Bấm vào nút thì mở form ngay tại chỗ như hôm nay; bấm vào phần còn lại của card thì sang trang chi tiết.

### Non-goals

- Không hiện mức lương. Trục lương thuộc `hrp-v5-go-live-09-public-board-architecture`; khi task đó đóng, trang chi tiết thừa hưởng qua DTO chung.
- Không hiện tên, mã, logo hay ngành nghề của công ty khách hàng. Không select `clientCompany` dưới bất kỳ hình thức nào: chính deref bảng đó là nguyên nhân sự cố 500 ngày 31/08.
- Không in `staffingOrder.description`. Xem `DEC-06`.
- Không thêm cột, không migration, không đổi RLS, không cấp quyền cho principal công khai.
- Không sửa `enrichJob`, không sửa nhãn đơn vị tuyển dụng đang hardcode, không sửa bốn danh sách filter tĩnh. Đó là nợ của go-live-05.
- Không tạo token màu, token bóng, vòng focus hay guard giảm chuyển động mới. Trang chi tiết **dùng lại** đúng token và đúng quy ước tương tác của bề mặt công khai hiện có.
- Không đổi luồng nộp đơn, không đổi rate limit, không đổi RPC, không đổi idempotency, không đổi chính sách CV.
- Không sửa trang tra cứu. Che PII trên tra cứu là task riêng.
- Không tự commit, không tự push, không tự deploy.

## 2. Evidence và Baseline

Mọi dòng dưới đây do Tier 1 đọc trực tiếp tại `0248948`.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/(portal)/page.tsx:409-424` | `JobCard` là một `div` thuần. Không `href`, không `Link`, không `onClick` ở mức card. Chỉ nút Ứng tuyển ở `:486` và nút Lưu việc ở `:499` có hành vi | Bấm card hiện KHÔNG làm gì. Yêu cầu của Owner là hành vi mới, không phải sửa hành vi sai |
| `EV-02` | `app/(portal)/page.tsx:420-422` | Card đã có `className` chứa `relative` và một dải nhấn `absolute top-0 left-0 right-0` | Có sẵn ngữ cảnh định vị cho kỹ thuật link phủ toàn card ở `DEC-03`; không phải thêm `relative` mới |
| `EV-03` | `src/domains/job-board/public.service.ts:209-212` | `getPublicJobProjection` trả **đúng cùng** `PublicJobDto` mà list trả | Nếu chỉ tạo route trang mà không mở rộng projection, trang chi tiết sẽ không có gì nhiều hơn cái card. Phải mở rộng ở tầng service |
| `EV-04` | `src/domains/job-board/public.service.ts:105` và `:124-126` | `toDto` chỉ lấy `slots[0]`: `position`, `shift`, `location` đều của vị trí đầu tiên; các vị trí còn lại bị bỏ | Dữ liệu nhiều vị trí ĐÃ nằm trong `publicSelect`, chỉ bị `toDto` làm phẳng. Trang chi tiết không cần query mới |
| `EV-05` | `src/domains/job-board/public.service.ts:140-157` | `publicSelect` đã select `description`, `deadlineDate`, và mọi slot với `positionCode`, `positionTitle`, `slotsNeeded`, `slotsFilled`, `shiftStart`, `shiftEnd`, `validTo`, `workLocation` | Toàn bộ nội dung trang chi tiết có nguồn thật **không cần đổi một dòng `publicSelect`** |
| `EV-06` | `src/domains/job-board/public.service.ts:136-139` | Comment cấm select quan hệ bắt buộc trên bảng bị RLS che, ghi rõ hàng rào là `public-select.static.test.ts` | Hàng rào tồn tại. Task này phải giữ nó xanh, và đó là AC |
| `EV-07` | `app/(jobs)/jobs/page.tsx:1-9` | `/jobs` là `permanentRedirect('/')`, chỉ khớp đúng đường `/jobs` | `/jobs/{slug}` hiện 404 và không có gì để bảo toàn. Đường mới không phá link cũ nào |
| `EV-08` | `app/(portal)/page.tsx:99-270` cộng `:272-405` | `ApplyModal` và `SuccessModal` là component **cục bộ** trong một file client 901 dòng | Trang chi tiết không dùng lại được nếu không tách file. Tách là điều kiện, và là chỗ có rủi ro hồi quy thật cho `/` |
| `EV-09` | `src/shared/auth/with-public-db.ts:60-75` | `withPublicDb` là hàm duy nhất được phép mở đường đọc vô danh; ba biến GUC cộng read-only đặt bên trong | Trang chi tiết đọc DB phải đi qua đúng hàm này, không tự gọi `$transaction` |
| `EV-10` | `grep -rln withPublicDb app src` | Hiện chỉ hai route API dùng nó; **chưa** page hay Server Component nào dùng | Trang chi tiết là call site loại mới. Hợp lệ theo `DEC-08` của go-live-04, nhưng phải nêu rõ vì nó lệch tiền lệ |
| `EV-11` | `app/api/jobs/[slug]/route.ts:18-31` | Route detail chạy `enforceRateLimits` bucket `JOB_BROWSE` **trước** truy vấn, rồi `withPublicDb` | Đường API có rate limit. Đường render trang thì không có chỗ tự nhiên để trả 429. Xem `RISK-03` |
| `EV-12` | Đo live 31/08 sau khi hotfix-02 deploy: `/api/jobs` = `200`, `/api/jobs/DA-DEMO-001` = `200` | Cả hai đường công khai đã sống | Có dữ liệu thật trên `hrp-live` để đo AC của task này, không phải chờ seed |
| `EV-13` | `app/(portal)/page.tsx:10` | Chú thích trong file ghi `PublicJobDto.slug` bằng `project.code` | Khóa URL của trang chi tiết là mã dự án, đọc được, phù hợp SEO. Không cần slug mới, không cần cột mới |
| `EV-14` | `src/domains/job-board/public.service.ts:127` | `industry` là nhãn **suy diễn** bằng regex từ văn bản, mặc định `Công nghiệp chế tạo` | Trang chi tiết được hiện chip ngành nghề nhưng KHÔNG được trình bày nó như dữ liệu do khách hàng khai |

### Dependency

| Dependency | Source | Satisfied evidence | Blocker |
|---|---|---|---|
| Đường đọc công khai còn sống | `EV-12` | `/api/jobs` và `/api/jobs/DA-DEMO-001` cùng trả `200` trên production sau khi hotfix-02 deploy | Không |
| Hàng rào chống select quan hệ bắt buộc | `EV-06` | `public-select.static.test.ts` tồn tại và xanh trong lane canonical | hotfix-02 phải `ACCEPTED` trước khi mở task này, vì task này sửa cùng file `public.service.ts` |
| Hàm mở đường đọc vô danh | `EV-09` | `withPublicDb` đã ở `main` và đã chạy trên production | Không |
| Dữ liệu nhiều vị trí cho trang chi tiết | `EV-05` | `publicSelect` đã select đủ trường slot | Không |
| Token màu và quy ước tương tác | `hrp-v5-go-live-10-admin-ui-repair` | Chưa ACCEPTED | Không chặn: `DEC-08` buộc task này chỉ dùng lại, không tạo token mới, nên chạy trước hay sau 10 đều không đổi kết quả |

## 3. Decisions

| ID | Decision | Lý do |
|---|---|---|
| `DEC-01` | URL là `/viec-lam/{code}`, với `{code}` chính là `PublicJobDto.slug` tức `project.code`. Route file `app/(jobs)/viec-lam/[slug]/page.tsx` | Tiếng Việt, đồng bộ với `/ve-chung-toi` và `/viec-lam` trong nav hiện có. `EV-07`: `/jobs` đã redirect vĩnh viễn về `/` nên không mở đường mới dưới `/jobs`. `EV-13`: mã dự án đã là khóa công khai, đọc được, không cần cột slug mới |
| `DEC-02` | Trang là **Server Component**, đọc DB trực tiếp qua `withPublicDb` ngay trong `page` và trong `generateMetadata`, KHÔNG `fetch` tới `/api/jobs/{slug}` của chính mình | `fetch` self-call thêm một chặng mạng, mất context request, và làm metadata phụ thuộc base URL runtime. `EV-10`: đây là page đầu tiên dùng `withPublicDb`; hợp lệ vì `DEC-08` của go-live-04 chỉ đòi mọi đường đọc vô danh đi qua đúng hàm đó, không đòi phải là route API |
| `DEC-03` | Card trên `/` điều hướng bằng kỹ thuật **link phủ**: tiêu đề card là một `Link` thật tới trang chi tiết, cộng một phần tử phủ `absolute inset-0` để cả card bấm được; hai nút Ứng tuyển và Lưu việc được nâng `position: relative` cộng `z-index` cao hơn phần phủ | Bọc cả card trong một `Link` sẽ lồng `button` bên trong `a`: HTML không hợp lệ, và bấm nút sẽ vừa mở form vừa điều hướng. `EV-02`: card đã `relative` nên không phải đổi cấu trúc định vị |
| `DEC-04` | Tách `ApplyModal` và `SuccessModal` sang `src/domains/job-board/components/`, **giữ nguyên hành vi từng dòng**: cùng props, cùng chuỗi hiển thị, cùng map lỗi, cùng endpoint, cùng thứ tự field | `EV-08`: không tách thì trang chi tiết phải copy 300 dòng, và hai bản sẽ lệch nhau ở lần sửa đầu tiên. Đây là chỗ rủi ro hồi quy thật cho `/`, nên bước tách được đo riêng ngay sau khi làm, trước khi trang mới tồn tại |
| `DEC-05` | Mở rộng projection **additive**: thêm `getPublicJobDetail` trả một DTO chi tiết là **superset** của `PublicJobDto`. `getPublicJobProjection` và hình dạng phản hồi `{ job }` của `/api/jobs/{slug}` giữ nguyên mọi khóa đang có | `marketplace-browse.routes.test.ts` đang khẳng định hình dạng phản hồi. Additive nghĩa là test cũ xanh không cần sửa, và đó là bằng chứng không hồi quy |
| `DEC-06` | KHÔNG in `staffingOrder.description` lên trang công khai. Đoạn mô tả hiển thị và mô tả trong dữ liệu có cấu trúc phải được **tổng hợp từ các trường có cấu trúc** (tên vị trí, khu vực, ca làm, số chỗ) | `description` là văn bản tự do do nhân sự nội bộ viết cho đơn tuyển dụng. Không có bất kỳ hàng rào biên tập nào ngăn nó chứa tên khách hàng, giá, hay điều khoản thương mại. In nguyên văn ra trang vô danh là rò rỉ cùng loại với sự cố `clientCompany`, chỉ khó phát hiện hơn vì không gây 500 |
| `DEC-07` | Trang chi tiết KHÔNG in bất kỳ nhãn đơn vị tuyển dụng nào, kể cả nhãn hardcode `HRP Partners` mà card đang dùng | Nhãn đó là dữ liệu bịa, và nó thuộc phạm vi `hrp-v5-go-live-05-public-card-truth`. Nhân bản nó sang bề mặt thứ hai làm nợ nhân đôi. Không in thì không sai |
| `DEC-08` | Trang chi tiết dùng lại đúng token, đúng khoảng cách, đúng vòng focus và đúng guard giảm chuyển động của bề mặt công khai hiện có. Không định nghĩa biến CSS mới, không thêm khối `prefers-reduced-motion` mới | `hrp-v5-go-live-08-public-ui-premium` và `10` sở hữu trục thị giác. Nếu task này tạo token riêng thì hai task kia sẽ phải xóa, và bề mặt sẽ có hai hệ trong lúc chuyển tiếp |
| `DEC-09` | Việc không tìm thấy dùng `notFound()` của Next, trả HTTP `404` thật | Trang việc làm đã hết hạn hoặc bị ẩn phải trả 404 cho cả người và cho bot. Trả 200 kèm chữ "không tìm thấy" làm công cụ tìm kiếm giữ URL rác |
| `DEC-10` | `generateMetadata` chỉ dựng `title` và `description` từ dữ liệu công khai đã được `DEC-06` cho phép, cộng `openGraph` và `alternates.canonical`. Không ảnh, không `twitter:image` mới | Yêu cầu của Owner là dán link vào Zalo hay Facebook thì hiện đúng việc. Chỉ cần `title` cộng `description` cộng `canonical`. Thêm ảnh OG là một trục thiết kế riêng, chưa có nguồn ảnh thật |
| `DEC-11` | Trang render động, không cache tĩnh: đặt `dynamic = 'force-dynamic'` | Số chỗ còn trống thay đổi theo từng đơn nộp. Trang cache sẽ khoe chỗ trống đã hết, và người dùng nộp xong nhận lỗi đủ chỉ tiêu. Sai kiểu này đắt hơn lợi ích cache |
| `DEC-12` | KHÔNG thêm rate limit ở tầng render trang trong round này. Rate limit của `/api/jobs` và `/api/jobs/{slug}` giữ nguyên | `EV-11`: `enforceRateLimits` trả một `NextResponse`; một `page` không có chỗ trả 429. Đặt được đúng chỗ là middleware, và đó là bán kính khác. Trang thực hiện đúng một truy vấn có `where` trên khóa duy nhất, không fan-out. Ghi thành `RISK-03` cộng follow-up ở §9, không giả vờ đã đóng |
| `DEC-13` | Nút Ứng tuyển trên màn hình hẹp là một thanh dính ở cạnh dưới; trên màn hình rộng nó nằm trong luồng nội dung | Owner nêu rõ "vẫn kèm với các nút ứng tuyển". Trên điện thoại, trang chi tiết dài hơn một màn hình nên nút trong luồng sẽ bị cuộn ra khỏi tầm mắt |
| `DEC-14` | Nếu một việc làm không còn chỗ trống, trang vẫn mở được `200` nhưng nút Ứng tuyển ở trạng thái vô hiệu với nhãn đang dùng trên card. Trang chỉ `404` khi không tìm thấy dự án, hoặc dự án không `ACTIVE`, hoặc không `isPublic`, hoặc **không còn một slot nào** còn hiệu lực sau khi lọc hết hạn | Nhất quán với `/`. Link đã chia sẻ ra ngoài không được biến thành 404 chỉ vì đủ chỉ tiêu. Điều này buộc `getPublicJobDetail` **không** thừa hưởng cửa chặn `availableSlots <= 0` của `toDto` ở `public.service.ts:103`: cửa đó đúng cho danh sách vì list không nên khoe việc đã đủ, nhưng sai cho trang chi tiết |
| `DEC-15` | `RQ-01` thắng `AC-01` ở tên khóa. DTO chi tiết dùng `totalSlotsNeeded` và `totalSlotsFilled`; KHÔNG thêm khóa bí danh `totalSlots` hay `filledSlots`. Câu chữ của `AC-01` được sửa cho khớp `RQ-01` | Chuỗi hợp đồng chạy `RQ ⇒ STEP ⇒ AC`, nên `AC` là phép đo của `RQ`; khi câu chữ của `AC` kể lại sai tên khóa thì đó là lỗi chính tả của artifact dẫn xuất, không phải một yêu cầu cạnh tranh. Lỗi soạn thảo này là của Tier 1. Hai tên cho cùng một con số đúng là lớp lỗi `RISK-07` dịch lên tầng tên gọi. Tier 2 từ chối bí danh là đúng; Tier 1 tự đọc `public.service.ts:49-50` cùng `:235-236` và thấy đúng hai khóa của `RQ-01`, không có bí danh |
| `DEC-16` | `AC-10` đổi phương pháp: đo bằng cấu trúc xếp lớp đọc trực tiếp trong `app/(portal)/page.tsx`, KHÔNG đo bằng thao tác trình duyệt. Ba lần bấm thật chuyển thành bước OP của Owner sau khi deploy, ghi ở §9. Đây là **hạ cấp bằng chứng có ghi nhận**, không phải một AC đã PASS | Người quyết định: Tier 1, hôm nay. Bằng chứng thiếu: URL trước và sau ba lần bấm trong một engine thật. Vì sao không đòi được: máy chạy harness không có trình duyệt, `package.json` zero match cho `playwright`, `puppeteer`, `cypress`, `jsdom`, `happy-dom` và `testing-library`, còn `find src app -name '*.test.tsx'` trả `0` — repo KHÔNG có lane DOM nào. Tier 3 chạy trên đúng máy đó, nên bảo Tier 3 bấm là bảo làm việc bất khả và đốt một audit round lấy zero thông tin; thêm gói driver giữa task là mở scope, Tier 2 từ chối đúng. Vì sao cấu trúc đủ quyết định cả ba mệnh đề: Tier 1 tự đọc `page.tsx:127` container `relative`, `:135-137` phần phủ `absolute inset-0 z-0` cộng `aria-hidden` cộng `tabIndex={-1}`, và `:154`, `:204`, `:217` cả ba control đều `relative z-10` — control nằm TRÊN phần phủ nên nhận đúng cú bấm của nó, và là SIBLING chứ không phải hậu duệ nên không cú bấm nào nổi bọt vào thẻ neo. Residual risk: `z-0` với `z-10` và hình hộp của phần phủ chỉ được chứng minh ở tầng khai báo, chưa ở tầng layout engine thật. Follow-up: bước OP ở §9, phải ký trước khi công bố link ra ngoài |
| `DEC-17` | `AC-06` sửa câu chữ: mệnh đề hai tên vị trí chỉ áp dụng khi dự án có **nhiều hơn một nhóm vị trí**, không phải khi "có nhiều slot" | Lỗi soạn thảo của Tier 1: tôi viết "slot" khi ý là "nhóm vị trí". Đọc đúng mặt chữ thì `DA-DEMO-001` có 10 slot nên tiền đề ĐÚNG, và ngưỡng đòi hai tên vị trí trở thành bất khả trên dữ liệu công khai hiện có — tức một AC tự FAIL vì cách tôi viết. Cả năm dự án công khai hôm nay chỉ có một nhóm vị trí; nhánh nhiều vị trí được canh bằng test service của `RQ-12`. Tier 2 không seed để tạo dự án nhiều vị trí là đúng: `RISK-06` cấm mọi lệnh ghi trong task này |

## 4. Contract

| ID | Requirement |
|---|---|
| `RQ-01` | Thêm `getPublicJobDetail(tx, slug)` trong `src/domains/job-board/public.service.ts` cùng một kiểu DTO chi tiết được export. DTO chi tiết chứa **mọi khóa** của `PublicJobDto` với đúng kiểu đang có, cộng: `jobCode`, `siteAddress` có thể null, `totalSlotsNeeded` là số, `totalSlotsFilled` là số, và một mảng `positions`. Mỗi phần tử của `positions` gồm `positionCode`, `positionTitle`, `shift` có thể null, `workLocation` có thể null, `slotsNeeded` là số, `slotsFilled` là số, `available` là số. Khóa `availableSlots` thừa hưởng từ `PublicJobDto` là tổng chỗ trống, và bằng tổng `available` của `positions` |
| `RQ-02` | `getPublicJobDetail` dùng **đúng** hằng `publicSelect` đang có. KHÔNG sửa `publicSelect`, KHÔNG thêm khóa quan hệ nào vào nó, KHÔNG viết `select` thứ hai có `clientCompany`. `where` giữ đúng ba điều kiện đang dùng ở `getPublicJobProjection`: khớp `code` hoặc `id`, `status` bằng `ACTIVE`, `isPublic` bằng true |
| `RQ-03` | `positions` chỉ gồm slot còn hiệu lực theo **đúng cùng hai vị từ** mà `toDto` đang dùng ở `public.service.ts:99-101`: order phải nằm trong `VISIBLE_ORDER_STATUSES` và `deadlineDate` chưa hết hạn; slot phải có `validTo` chưa hết hạn. Tier 2 nâng hai vị từ đó thành một hàm dùng chung và gọi từ cả hai đường, không copy biểu thức. `getPublicJobDetail` **KHÔNG** thừa hưởng cửa chặn `availableSlots <= 0` ở `public.service.ts:103`: nó trả null chỉ khi không còn slot nào sau khi lọc, và trả DTO với `availableSlots` bằng 0 khi còn slot nhưng đã đủ chỉ tiêu, theo `DEC-14` |
| `RQ-04` | `getPublicJobProjection`, `getPublicJobList` và hình dạng phản hồi JSON của `/api/jobs` cùng `/api/jobs/{slug}` giữ nguyên mọi khóa và mọi kiểu đang có. Không xóa khóa, không đổi tên khóa, không đổi kiểu |
| `RQ-05` | Tạo `app/(jobs)/viec-lam/[slug]/page.tsx` là Server Component: đọc dữ liệu qua `withPublicDb` gọi `getPublicJobDetail`; `notFound()` khi null; đặt `dynamic = 'force-dynamic'`. KHÔNG gọi `prisma.$transaction` trực tiếp, KHÔNG gọi `applyRlsContext` hay `set_config` lẻ, KHÔNG `fetch` tới API nội bộ của chính ứng dụng |
| `RQ-06` | Trang hiển thị, tất cả từ nguồn thật: tiêu đề việc làm; mã việc làm; chip khu vực, ca làm, loại hình, ngành nghề; hạn nhận hồ sơ nếu có; tổng chỗ trống; và danh sách **từng vị trí** với tên vị trí, ca làm, địa điểm làm việc và số chỗ còn trống của chính vị trí đó. Trang KHÔNG in mức lương, KHÔNG in tên hay mã hay logo khách hàng, KHÔNG in nhãn đơn vị tuyển dụng, KHÔNG in `staffingOrder.description` |
| `RQ-07` | Trang có nút Ứng tuyển mở đúng form đã tách ở `RQ-09`, gửi tới đúng endpoint canonical mà `/` đang gửi, và hiển thị đúng màn thành công kèm mã tra cứu. Trên breakpoint hẹp, nút nằm trong thanh dính cạnh dưới theo `DEC-13`. Khi hết chỗ, nút vô hiệu với đúng nhãn đang dùng trên card |
| `RQ-08` | Trang có một đường quay lại danh sách việc làm |
| `RQ-09` | Tách `ApplyModal` và `SuccessModal` ra khỏi `app/(portal)/page.tsx` sang thư mục dùng chung dưới `src/domains/job-board/`, giữ nguyên hành vi: cùng danh sách props, cùng chuỗi tiếng Việt, cùng map mã lỗi gồm `DUPLICATE_APPLICATION` và `APPLY_ENDPOINT_RETIRED`, cùng endpoint, cùng thứ tự và cùng ràng buộc field. `app/(portal)/page.tsx` import lại từ vị trí mới. Không đổi logic `handleApply` |
| `RQ-10` | `JobCard` trong `app/(portal)/page.tsx` điều hướng tới `/viec-lam/{slug}` theo `DEC-03`: tiêu đề là `Link` thật, một phần tử phủ `absolute inset-0` cho vùng còn lại, và hai nút Ứng tuyển cùng Lưu việc được nâng lên trên phần phủ. Bấm nút Ứng tuyển vẫn mở form tại chỗ và **không** điều hướng |
| `RQ-11` | `generateMetadata` trong cùng file route trả `title` và `description` dựng từ dữ liệu việc làm, cộng `openGraph` với `title` và `description`, cộng `alternates.canonical` trỏ tới đường dẫn chính tắc của trang. Khi không tìm thấy việc làm, metadata trả tiêu đề không tiết lộ gì và trang vẫn `404` |
| `RQ-12` | Thêm bốn test cho service, dùng lane canonical `npm run test:unit`: (1) dự án nhiều slot trả `positions` dài hơn 1; (2) slug không tồn tại trả null; (3) dự án còn slot hợp lệ nhưng mọi slot đã đủ chỉ tiêu trả DTO khác null với `availableSlots` bằng 0 — đây là test khóa `DEC-14`; (4) dự án mà mọi slot đã hết hạn trả null. Đồng thời khẳng định `getPublicJobProjection` vẫn trả null ở trường hợp (3), để chứng minh `RQ-04` không bị phá |
| `RQ-13` | Thêm test tĩnh `src/domains/job-board/public-detail.static.test.ts` đọc chính `app/(jobs)/viec-lam/[slug]/page.tsx` bằng filesystem thật và FAIL nếu file chứa bất kỳ chuỗi nào: `clientCompany`, `$transaction`, `applyRlsContext`, `set_config`, `hourlyRate`, `description`. Lý do dùng test tĩnh chứ không mock: lớp lỗi này nằm ở tầng query engine và tầng biên dữ liệu, mock không tái lập được |
| `RQ-14` | `public-select.static.test.ts` phải xanh không sửa một dòng. Nếu phải sửa nó thì đó là dấu hiệu đã vi phạm `RQ-02`, và Tier 2 dừng theo stop condition ở §5 |
| `RQ-15` | `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run test:unit` exit 0 với tổng số test không thấp hơn `1421` |
| `RQ-16` | Không commit, không push, không deploy. HANDOFF kết `READY_FOR_AUDIT` |

### Traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-01 | AC-02 |
| RQ-03 | STEP-01 | AC-03 |
| RQ-04 | STEP-01 | AC-04 |
| RQ-05 | STEP-03 | AC-05 |
| RQ-06 | STEP-03 | AC-06 |
| RQ-07 | STEP-04 | AC-07 |
| RQ-08 | STEP-03 | AC-08 |
| RQ-09 | STEP-02 | AC-09 |
| RQ-10 | STEP-05 | AC-10 |
| RQ-11 | STEP-03 | AC-11 |
| RQ-12 | STEP-01 | AC-12 |
| RQ-13 | STEP-03 | AC-13 |
| RQ-14 | STEP-06 | AC-14 |
| RQ-15 | STEP-06 | AC-15 |
| RQ-16 | STEP-07 | AC-16 |

## 5. Execution Plan

| STEP | Nội dung |
|---|---|
| `STEP-01` | Tầng service: thêm kiểu DTO chi tiết và `getPublicJobDetail` theo `RQ-01..RQ-03`, dùng lại `publicSelect` không sửa. Tái dùng đúng vị từ lọc slot mà `toDto` đang dùng. Thêm hai test của `RQ-12`. Chạy `npm run test:unit`, đọc `$LASTEXITCODE` ngay, không pipe |
| `STEP-02` | Tách `ApplyModal` và `SuccessModal` theo `RQ-09`. Đây là bước rủi ro hồi quy cao nhất: làm một mình, chạy `npm run test:unit` ngay sau khi tách và trước khi viết trang mới, dán exit code vào HANDOFF. Nếu bất kỳ test nào của `/` đỏ, sửa cho xanh trước khi sang STEP-03 |
| `STEP-03` | Tạo `app/(jobs)/viec-lam/[slug]/page.tsx` theo `RQ-05`, `RQ-06`, `RQ-08`, `RQ-11`. Viết test tĩnh `RQ-13` và chạy nó RED trước GREEN: cố tình thêm rồi bỏ một chuỗi bị cấm để chứng minh test bắt được, dán cả hai output |
| `STEP-04` | Gắn nút Ứng tuyển và thanh dính theo `RQ-07` và `DEC-13`, dùng component đã tách ở STEP-02 |
| `STEP-05` | Sửa `JobCard` theo `RQ-10`. Kiểm tra bằng mắt trên trình duyệt: bấm nút Ứng tuyển mở form và URL KHÔNG đổi; bấm khoảng trống trong card thì URL đổi sang `/viec-lam/...` |
| `STEP-06` | Cổng cơ học theo `RQ-14` và `RQ-15`: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`. Đọc `$LASTEXITCODE` ngay sau mỗi lệnh. Rồi đo render thật theo `AC-06` và `AC-07` |
| `STEP-07` | Viết HANDOFF: bảng AC-01..AC-16 kèm lệnh, exit code và output nguyên văn; `git status --short` để chứng minh phạm vi file; không commit, không push |

### Stop condition

Tier 2 dừng và báo, không tự quyết, nếu gặp bất kỳ điều nào sau:

- Phải sửa `publicSelect` hoặc phải sửa `public-select.static.test.ts` để trang chi tiết có dữ liệu.
- Phải thêm cột, thêm index, thêm migration, đổi policy RLS, hay cấp thêm quyền cho principal công khai.
- Phải đổi hoặc xóa một khóa đang có trong phản hồi của `/api/jobs` hay `/api/jobs/{slug}`.
- Phải sửa `handleApply`, endpoint nộp đơn, rate limit, hay RPC để nút Ứng tuyển trên trang chi tiết chạy được.
- `npm run dev` không khởi động được nên `AC-06` và `AC-07` không đo được: báo `ENV_BLOCKED` cho đúng hai AC đó, KHÔNG thay bằng mock, KHÔNG bỏ qua.

## 6. Acceptance

| AC | Cách đo | Ngưỡng PASS |
|---|---|---|
| `AC-01` | Đọc DTO chi tiết trong `public.service.ts` cộng test của `RQ-12` | DTO có đủ mọi khóa của `PublicJobDto` cộng `jobCode`, `siteAddress`, `totalSlotsNeeded`, `totalSlotsFilled`, `positions`; mỗi phần tử `positions` có đủ bảy khóa của `RQ-01`. KHÔNG có khóa bí danh `totalSlots` hay `filledSlots`, theo `DEC-15` |
| `AC-02` | `git diff -- src/domains/job-board/public.service.ts` cộng `grep -n 'clientCompany\|client_company' src/domains/job-board/public.service.ts` | Diff KHÔNG chứa dòng nào sửa `publicSelect`; grep zero match. Dán nguyên văn cả hai |
| `AC-03` | Đọc mã: hai vị từ lọc order và lọc slot phải là **một hàm dùng chung** được gọi từ cả `toDto` và `getPublicJobDetail` | Có đúng một định nghĩa cho mỗi vị từ. Hai biểu thức song song, dù giống nhau về nội dung, = FAIL |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-browse.routes.test.ts src/domains/job-board/mp1.contract.test.ts` | Exit 0, không sửa một dòng nào trong hai file test đó |
| `AC-05` | `grep -nE '\$transaction\|applyRlsContext\|set_config\|fetch\(' app/(jobs)/viec-lam/[slug]/page.tsx` cộng `grep -n withPublicDb` cùng file | Bốn chuỗi đầu zero match; `withPublicDb` có match. Dán nguyên văn cộng exit code |
| `AC-06` | `npm run dev` rồi `curl.exe -s http://localhost:3000/viec-lam/DA-DEMO-001` ghi ra file, đọc `-w "%{http_code}"` riêng | HTTP `200`. HTML chứa mã việc làm, chứa tối thiểu hai tên vị trí khác nhau nếu dự án đó có nhiều hơn một nhóm vị trí theo `DEC-17`, và chứa cụm chỉ chỗ trống. HTML KHÔNG chứa `clientCompany`, `client_company`, `hourlyRate`. Dán số liệu grep từng chuỗi |
| `AC-07` | `curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:3000/viec-lam/DA-KHONG-TON-TAI-999` | `404` |
| `AC-08` | Đọc HTML của `AC-06` | Có một liên kết trỏ về danh sách việc làm |
| `AC-09` | `git diff --stat -- app/(portal)/page.tsx` cộng `npm run test:unit` sau STEP-02 | Hai component đã ra khỏi `page.tsx`, `page.tsx` giảm tối thiểu 250 dòng, và `test:unit` exit 0 **ngay sau bước tách** trước khi trang mới tồn tại. Chỉ đo sau khi mọi bước xong = FAIL vì không chứng minh được bước tách vô hại |
| `AC-10` | Đọc cấu trúc xếp lớp của card trong `app/(portal)/page.tsx`: grep lớp của phần phủ và lớp của từng control, cộng xác định quan hệ cha-con giữa chúng. Dán nguyên văn từng dòng kèm số dòng | Đúng một phần phủ là `Link` trỏ `/viec-lam/{code}` mang `absolute inset-0`, `aria-hidden` và `tabIndex={-1}`; container của card mang `relative`; nút Ứng tuyển và nút Lưu việc đều mang `relative z-10`; và cả hai nút là SIBLING của phần phủ, không nằm trong nó. Mọi URL đích của phần phủ trên năm dự án công khai trả `200`. Thao tác trình duyệt KHÔNG còn là ngưỡng của AC này theo `DEC-16`; nó là bước OP của Owner ở §9 |
| `AC-11` | `grep -n 'generateMetadata\|openGraph\|canonical'` trong file route cộng grep thẻ `title` trong HTML của `AC-06` | Cả ba chuỗi có match; thẻ tiêu đề trong HTML chứa tên việc làm, KHÔNG phải tiêu đề chung của trang chủ |
| `AC-12` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board` | Exit 0; cả bốn test của `RQ-12` có mặt và xanh, kể cả test đủ chỉ tiêu trả DTO khác null và test `getPublicJobProjection` vẫn trả null ở cùng dữ liệu |
| `AC-13` | Chạy test tĩnh hai lần quanh STEP-03 | RED `LASTEXITCODE=1` nêu đúng chuỗi bị cấm được cố ý thêm; GREEN `LASTEXITCODE=0`. Chỉ có GREEN = FAIL vì không chứng minh test có tác dụng |
| `AC-14` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` cộng `git diff --stat -- src/domains/job-board/public-select.static.test.ts` | Exit 0 và diff rỗng |
| `AC-15` | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, đọc `$LASTEXITCODE` ngay sau mỗi lệnh | Cả bốn exit 0; tổng số test không thấp hơn `1421` |
| `AC-16` | `git log origin/main..HEAD` cộng `git status --short` | `git log origin/main..HEAD` rỗng; không commit mới nào do Tier 2 tạo; file thay đổi chỉ nằm trong `app/(jobs)/viec-lam/`, `app/(portal)/page.tsx`, `src/domains/job-board/` và `docs/tasks/hrp-v5-go-live-12-public-job-detail-page/` |

## 7. Risk

| ID | Risk | Mức | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | Bước tách `ApplyModal` làm vỡ luồng nộp đơn trên `/` — bề mặt duy nhất đang sống và đang được Owner dùng để demo | Trung bình về xác suất, cao về tác động | `DEC-04` buộc giữ hành vi từng dòng. `AC-09` đo `test:unit` **ngay sau** bước tách, tách khỏi mọi thay đổi khác, nên nếu vỡ thì biết ngay do đâu. `STEP-02` đứng một mình, không trộn với việc khác |
| `RISK-02` | Ai đó thêm lại `clientCompany` vào `select` để trang chi tiết có tên công ty, làm sống lại sự cố 500 của 31/08 | Thấp sau khi có hàng rào, cao về tác động | `RQ-02` cấm; `RQ-14` giữ `public-select.static.test.ts` xanh không sửa; `AC-02` grep zero match; `AC-06` grep chính HTML đã phục vụ. Ba lớp ở ba tầng khác nhau |
| `RISK-03` | Trang render không có rate limit, nên bot có thể quét toàn bộ mã dự án | Thấp | `DEC-12` ghi rõ đây là nợ có ý thức, không phải sót. Trang làm đúng một truy vấn trên khóa duy nhất trong transaction read-only, không fan-out, không ghi. Follow-up ở §9 là đặt limit ở middleware, nơi trả 429 được |
| `RISK-04` | `staffingOrder.description` bị in ra vì nó nằm ngay trong `publicSelect` và rất dễ dùng | Trung bình | `DEC-06` giải thích tại sao cấm; `RQ-13` là test tĩnh đọc chính file page và FAIL nếu thấy chuỗi `description`; `AC-13` đòi bằng chứng RED nên test không thể là hàng rào giả |
| `RISK-05` | Task 08 và 09 sau này sửa cùng `JobCard` rồi vô tình xóa link phủ hoặc `z-index` của nút, làm card mất điều hướng trong im lặng | Trung bình | Ghi thành follow-up ở §9: khi bump 08 và 09, thêm AC bảo toàn điều hướng card. Task này không tự sửa contract của task khác |
| `RISK-06` | `npm run dev` đọc `DATABASE_URL` trong `.env` trỏ vào dữ liệu live, nên `AC-06` chạm dữ liệu thật | Thấp | Đường đọc đi qua `withPublicDb`, đặt transaction read-only trước khi làm gì khác, dưới principal `MKT`. Đúng cùng posture mà production đang chạy. Cấm mọi lệnh ghi, cấm seed, cấm migration trong task này |
| `RISK-07` | Số chỗ trống trên trang chi tiết lệch với số trên card vì hai chỗ tính bằng hai công thức | Trung bình | `RQ-03` và `AC-03` buộc dùng đúng một vị từ. Đây là lý do `AC-03` đo bằng cách đọc mã chứ không bằng test |

## 8. Open Questions

| ID | Question | Trạng thái |
|---|---|---|
| `Q-01` | Có nên cho tìm kiếm `q` khớp vào `staffingOrder.description` nữa không? Hôm nay có, nên người ngoài dò được nội dung văn bản nội bộ bằng cách thử từ khóa, dù văn bản đó không được in ra | Mở, không chặn task này. Là bề mặt rò rỉ có sẵn từ trước, thuộc đường tìm kiếm chứ không thuộc trang chi tiết |
| `Q-02` | Trang chi tiết có nên phát dữ liệu có cấu trúc cho công cụ tìm kiếm việc làm không? | Mở, không chặn. Cần quyết nguồn cho trường tổ chức tuyển dụng, mà nhãn đó đang là dữ liệu bịa theo `DEC-07`. Chỉ mở sau khi go-live-05 chốt nhãn thật |

## 9. Planner Resolution

**Audit round 1 — verdict `PASS`, Tier 1 ACCEPT.** Tier 1 tự chạy `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-go-live-12-public-job-detail-page/TASK.md` ⇒ `[OK] Verdict: PASS`, exit `0`, trên file `AUDIT.md` `6216` byte. Trước đó file đó đã một lần bị cắt về `0` byte lúc `20:57:21`; nó đã được commit trong `691be38` nên Tier 1 cứu lại bằng `git restore` — cùng lớp sự cố với `F-07` của go-live-13.

### 9.1 Tier 1 tự đo lại — production thật, không phải mock

AUDIT round 1 lấy bằng chứng của `AC-06`/`AC-07`/`AC-08` từ HANDOFF chứ không tự đo, và bài học ngày 31/08 là mock không chứng minh được gì cho lỗi tầng query engine dưới RLS. Nên Tier 1 đo trực tiếp trên `www.hrpartner.vn` sau khi mã đã lên production:

| Phép đo | Lệnh | Kết quả |
|---|---|---|
| `SC-01` trang chi tiết sống với mọi slug công khai | `curl -sL -o /dev/null -w "%{http_code} %{size_download}"` trên `/viec-lam/{slug}` cho cả 5 slug của `/api/jobs` | `200` cho `DA-DEMO-001/002/003`, `DA-2026-022`, `DA-2026-018`, thân từ `28418` đến `41482` byte; slug bịa `DA-KHONG-CO-THAT` ⇒ `404`. Không một `500` nào ⇒ bẫy quan hệ bắt buộc dưới RLS của hotfix-01/02 KHÔNG tái diễn trên đường đọc mới |
| `SC-02` không rò trường nội bộ | grep trên HTML sống của `/viec-lam/DA-DEMO-001` | `clientCompany` `0`, `internalNote` `0`, `hourlyRateVnd` `0`, `cccdNumber` `0`, `phoneNumber` `0`. Một match `"description"` duy nhất là `<meta name="description">` do helper dựng từ trường công khai: tên việc, khu vực, ca, số chỗ còn, hạn hồ sơ, mã việc làm — không phải văn bản `staffingOrder.description`, đúng `DEC-06` |
| `SC-03` yêu cầu gốc của Owner | grep cùng file | `Quay lại danh sách` `2`, `Ứng tuyển` `2` (bản desktop và bản dính đáy màn hình), `<h1>` là tên dự án, `ld+json` `0` nên `Q-02` vẫn đóng |
| `SC-04` lane test canonical | `npm run test:unit` lúc `20:58` | exit `0`, **98 file / 1472 test**. AUDIT ghi `1448` ⇒ con số trong AUDIT không đến từ một lần chạy trên cây hiện tại; xem `F-02` |
| `SC-05` cấu trúc xếp lớp của `AC-10` | đọc `app/(portal)/page.tsx` | `:137` phần phủ `absolute inset-0 z-0`, `:154`/`:204`/`:217` các control `relative z-10` và là SIBLING. Cấu trúc sống sót qua đợt tách component, khớp `DEC-16` |

### 9.2 Findings

| ID | Mức | Nội dung | Ruling |
|---|---|---|---|
| `F-01` | P1 | Mã đã commit `691be38` rồi push lên `origin/main` ⇒ **deploy production** trước khi có Planner Resolution, trong khi `AC-16` của chính contract này cấm push. AUDIT ghi `AC-16 PASS` và điều đó đúng ở thời điểm audit; hành vi push diễn ra sau đó. Đây là lần thứ ba trong hai ngày một tier khác bước qua ranh giới, và là lần đầu chạm production | `ACCEPT_FIX`. Không mở round mới: Tier 1 đã tự đo production và bề mặt lành, thứ tự `12` trước `13` vẫn đúng như `R-08` của go-live-13 đòi, nên không có hại thực tế. Residual risk: một task chưa resolve đã lên production, và nếu lần sau bề mặt vỡ thì không còn cửa chặn nào trước người dùng |
| `F-02` | P2 | AUDIT ghi `npm run test:unit pass 1448 tests` ở cả `AC-15` và §4. Lane canonical cho `1472` test / `98` file | `ACCEPT_FIX`. Con số thật CAO hơn và vẫn xanh nên verdict không đổi; nhưng một con số không đo lại được thì không phải bằng chứng |
| `F-03` | P2 | `AC-06`, `AC-07`, `AC-08` dẫn bằng chứng "Chứng cứ từ HANDOFF" ⇒ không độc lập, đúng cái mà cột `Independence: Confirmed` vừa khẳng định | `ACCEPT_FIX`. Tier 1 đã tự đo cả ba tại `SC-01` và `SC-03` |
| `F-04` | P2 | Cột `Evidence path` của §4 ghi `Console Output` ba lần, không có đường dẫn artifact. Lần thứ ba liên tiếp: `F-01` của hotfix-02, `F-04` của go-live-13, và đây | `ACCEPT_FIX` cộng directive cho vòng sau: mỗi ô phải có lệnh, exit code và output thật |
| `F-05` | P3 | `C-09` ghi "Verifier tự chạy cuối audit" — tự tham chiếu, không phải bằng chứng | `ACCEPT_FIX`. Tier 1 tự chạy gate, exit `0` |
| `F-06` | P3 | `C-10` viết `LIM-01` và `LIM-02` "đã được hóa giải qua v1.1". Tuyên bố một limitation đã đóng là hành vi của Planner | `ACCEPT_FIX` vì kết luận trùng đúng `DEC-16`/`DEC-17` mà Tier 1 đã viết; ghi lại để lần sau Tier 3 nêu limitation và để Planner đóng |

### 9.3 Bốn điều Tier 1 ghi từ lúc mở task — vẫn còn hiệu lực sau audit


1. `DEC-06` là quyết định của tôi, không phải yêu cầu của Owner. Owner chỉ yêu cầu trang chi tiết và nút ứng tuyển. Tôi chặn `staffingOrder.description` vì nó là văn bản tự do nội bộ không có hàng rào biên tập, và bài học ngày 31/08 là mọi thứ đi từ bảng nội bộ ra bề mặt vô danh phải được kể tên trước khi đi.
2. Follow-up bắt buộc khi bump `hrp-v5-go-live-08-public-ui-premium` và `hrp-v5-go-live-09-public-board-architecture`: thêm AC bảo toàn điều hướng card và bảo toàn component apply đã tách. Hai task đó viết trước khi trang chi tiết tồn tại nên contract của chúng chưa biết về `RISK-05`.
3. Follow-up rate limit ở middleware cho `/viec-lam/{code}`, theo `DEC-12` và `RISK-03`.
4. Bước OP của Owner, KHÔNG chặn `ACCEPTED` nhưng phải ký trước khi công bố link ra ngoài: trên domain thật sau khi deploy, bấm ba lần trên một card ở `/` rồi dán URL trước và sau từng lần — nút Ứng tuyển (URL không đổi, form mở), khoảng trống card (URL sang `/viec-lam/{ma}`), nút Lưu việc (URL không đổi). Đây đúng là phần bằng chứng mà `DEC-16` đã hạ cấp. Nếu lần bấm thật cho kết quả khác cấu trúc đã đọc thì mở hotfix, không sửa AC cho khớp.

### 9.4 Trạng thái sau resolution

Mã đã ở trên production nên bước OP ở mục 4 bây giờ chạy được ngay, không phải chờ deploy. Ba phép bấm đó là phần duy nhất còn thiếu của `AC-10`: Tier 1 đã đọc cấu trúc xếp lớp (`SC-05`) và đã xác nhận trang sống với đủ 5 slug (`SC-01`), nhưng không có lane DOM nào trong repo để chứng minh engine bố cục thực sự nhận đúng cú bấm — đó là residual risk đã ghi ở `DEC-16`, không phải PASS.

`R-01` — theo `F-01`, mọi lần sau: Tier 2 và Tier 3 không commit, không push. Việc đưa mã lên production là quyết định của Owner hoặc Tier 1 sau khi resolution đã viết.
`R-02` — theo `F-02` và `F-04`: mỗi ô bằng chứng phải mang lệnh thật cộng exit code thật; một con số test không đo lại được thì bị coi là chưa đo.


## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| v1.0 | 2026-08-31 | Mở task theo yêu cầu Owner: bấm card phải sang trang chi tiết và trang đó vẫn có nút ứng tuyển. Evidence do Tier 1 tự đọc `public.service.ts` sau hotfix-02, `app/(portal)/page.tsx`, `with-public-db.ts` và hai route API tại `0248948` |
| v1.1 | 2026-08-31 | Sửa ba lỗi soạn thảo của Tier 1, phát lộ khi Tier 2 giao HANDOFF round 1. KHÔNG đổi một dòng nào Tier 2 phải xây. (a) `AC-01` gọi sai tên hai khóa mà `RQ-01` đã đặt — `DEC-15`. (b) `AC-10` đòi thao tác trình duyệt mà repo không có bất kỳ lane DOM nào để chạy — `DEC-16`, hạ cấp có ghi nhận cộng bước OP của Owner ở §9. (c) `AC-06` viết "nhiều slot" khi ý là "nhiều hơn một nhóm vị trí", đọc đúng mặt chữ thì thành một AC bất khả — `DEC-17`. Bằng chứng của HANDOFF round 1 viết ở `v1.0` vẫn hợp lệ với `v1.1`, vì cả ba sửa đổi chỉ làm câu chữ của `AC` khớp lại `RQ` và khớp lại năng lực đo thật; KHÔNG mở execution round mới. Tier 3 audit theo `v1.1` |
| v1.1 | 2026-08-31 | Planner Resolution cho audit round 1: `ACCEPTED`, sáu finding `F-01..F-06` đều `ACCEPT_FIX`, năm phép đo độc lập của Tier 1 trên production ghi ở §9.1. **Không bump spec** — resolution không phải contract change, và `verify-audit.ps1` so spec giữa TASK và AUDIT nên bump sau audit sẽ FAIL gate |


