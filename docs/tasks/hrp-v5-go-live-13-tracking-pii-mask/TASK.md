# TASK: hrp-v5-go-live-13-tracking-pii-mask

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-13-tracking-pii-mask` |
| Work type | `CODE` — đổi projection công khai, thêm một module mask dùng chung, sửa ba comment ghi quyết định cũ |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent context |
| Baseline | `0248948`; Tier 2 khóa lại SHA thật khi nhận việc |
| Modules | M13 Marketplace public surface — trang tra cứu hồ sơ, projection tra cứu công khai |
| ADR references | MP-2 `RQ-04` tra cứu bằng mã bearer; go-live-04 `DEC-08` đường đọc vô danh; `Owner decision 2026-08-31 (b)` thay thế `Owner decision 2026-08-31 (a)` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `verify-task ⇒ /code ⇒ /audit ⇒ /resolve ⇒ ACCEPTED` |
| Updated | `2026-08-31 16:10 +07` |

## 1. Outcome

### Owner decision thay thế

Ngày 31/08 Owner đã ra hai quyết định trái nhau về cùng một bề mặt, và quyết định thứ hai thắng:

- Quyết định (a), sáng 31/08, hiện đang nằm trong ba comment của mã nguồn: người giữ mã tra cứu được đọc lại nguyên văn họ tên, số điện thoại và CCCD đã nộp, để đối chiếu.
- **Quyết định (b), chiều 31/08, là quyết định hiện hành:** số điện thoại và CCCD phải bị che một phần ở giữa, và phải che **an toàn** — an toàn ở đây được Owner định nghĩa bằng chính phép thử: người dùng KHÔNG được mở ngược ra giá trị gốc bằng công cụ của trình duyệt.

Task này thi hành (b). Họ tên vẫn hiện nguyên văn: Owner chỉ yêu cầu che điện thoại và CCCD. Xem `DEC-07` về rủi ro còn lại của việc đó.

### User-visible outcome

Trên `/track`, sau khi nhập đúng mã tra cứu:

- Số điện thoại hiện dạng còn ba số đầu và ba số cuối, phần giữa là dấu sao. Ví dụ với một số mười chữ số: ba số đầu, bốn dấu sao, ba số cuối.
- Số CCCD hiện dạng chỉ còn bốn số cuối, phần còn lại là dấu sao.
- CCCD không được cung cấp thì vẫn hiện `Không cung cấp` như hôm nay, KHÔNG hiện dãy dấu sao.
- Họ tên, mã tra cứu, trạng thái, việc làm và ngày nộp không đổi.

Mở tab Network của trình duyệt, xem phản hồi JSON của `/api/public/applications/{ma}` thì **không có** chuỗi số gốc ở bất kỳ khóa nào, không có bản băm của nó, và không có bản mã hoá của nó. Xem HTML và DOM cũng không có. Đó là toàn bộ nội dung của chữ "an toàn" trong yêu cầu.

### Non-goals

- Không che họ tên. Xem `DEC-07`.
- Không đổi hình dạng URL, không đổi mã lỗi, không đổi thông điệp 404, không đổi rate limit của đường tra cứu.
- Không đổi luồng nộp đơn, không đổi dữ liệu đã lưu, không đổi cột, không migration, không sửa thân hàm SQL.
- Không đổi cách nhân sự nội bộ xem hồ sơ. Đường quản trị có phân quyền riêng và không thuộc task này.
- Không đổi `src/shared/auth/worker-projection.ts` và không đổi nhóm sáu trường nhạy cảm của Worker. Xem `DEC-04`.
- Không đổi logger, không đổi error reporter. Hai chỗ đó đã redact PII và có test riêng.
- Không tự commit, không tự push, không tự deploy.

## 2. Evidence và Baseline

Mọi dòng dưới đây do Tier 1 đọc trực tiếp tại `0248948`.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `src/domains/applications/application.service.ts:227-229` | `getPublicTracking` gán thẳng `fullName: row.full_name`, `phone: row.phone`, `cccdNumber: row.cccd_number` vào DTO | Đây là điểm sửa duy nhất ở tầng dữ liệu. Che ở đây thì giá trị gốc không bao giờ ra khỏi process |
| `EV-02` | `app/api/public/applications/[trackingCode]/route.ts:40` | Route trả `NextResponse.json({ application: dto })` — nguyên khối DTO, không lọc thêm | Không có tầng lọc thứ hai. Bất cứ khóa nào có trong DTO là có trong phản hồi HTTP |
| `EV-03` | `grep 'NextResponse.json\|fullName\|phone\|cccd' app/api/public` | Trong toàn bộ `app/api/public`, chỉ `[trackingCode]/route.ts:40` phát ba trường này ra ngoài. Đường nộp đơn ở `jobs/[slug]/applications/route.ts:157` chỉ trả `result` gồm `trackingCode` và `status` | Bề mặt rò rỉ công khai là **một** điểm. Không phải quét toàn hệ |
| `EV-04` | `app/(jobs)/track/page.tsx:12-24` | `TrackingDto` phía client khai `fullName: string`, `phone: string`, `cccdNumber: string \| null` | Đổi tên trường ở service làm file này lỗi biên dịch ngay. Đó là hàng rào mạnh nhất và miễn phí |
| `EV-05` | `app/(jobs)/track/page.tsx:116` và `:120` | Hai `dd` in `{result.phone}` và `{result.cccdNumber || 'Không cung cấp'}` | Hai chỗ render duy nhất. Hành vi `Không cung cấp` phải bảo toàn |
| `EV-06` | `app/(jobs)/track/page.tsx:1` cộng `:54` | Trang là Client Component, lấy dữ liệu bằng `fetch` với `cache: 'no-store'` | Không có payload RSC nào chứa giá trị gốc. Vector rò rỉ đúng là thân JSON, không phải flight payload |
| `EV-07` | `app/(jobs)/track/page.tsx:5-6`; `src/domains/applications/application.service.ts:48-50`; `app/api/public/applications/[trackingCode]/route.ts:14-17` | Ba comment độc lập cùng ghi quyết định (a): người giữ mã được đọc lại name/phone/CCCD | Nếu chỉ sửa mã mà để ba comment, người sau sẽ đọc comment rồi "khôi phục" hành vi cũ. Sửa comment là RQ, không phải việc phụ |
| `EV-08` | `prisma/migrations/20260831103000_marketplace_search_tracking_profile/migration.sql` | Hàm `hrp_public_tracking_profile` trả `full_name, phone, cccd_number` nguyên văn từ `candidate_submissions` | Che trong SQL là phòng ngự nhiều lớp nhưng cần thêm một migration. Ngoài phạm vi round này; ghi thành follow-up ở §9 |
| `EV-09` | `src/shared/auth/worker-projection.ts:23` và `:88-90` | Repo đã có quy ước che: `MASKED = '***'`, và `maskSensitive` trả `null` khi giá trị trống, `'***'` khi có giá trị | Che **toàn phần** theo permission cho nhân sự. Owner yêu cầu che **một phần** cho ứng viên. Hai bài toán khác nhau, nên không dùng lại hàm đó, nhưng phải giữ đúng quy tắc null-thì-null |
| `EV-10` | `src/domains/job-board/mp1.contract.test.ts:111-113` | Repo đã có tiền lệ khẳng định vắng khóa: `not.toHaveProperty('clientCompanyId')` và hai khóa khác | Kiểu assertion cần dùng đã có mẫu trong repo |
| `EV-11` | `src/domains/security/response-projection.static.test.ts:40-43` | `BARE_RE` và `SPREAD_RE` chỉ bắt danh từ thô như `workers`, `rows`, `raw`; `dto` không nằm trong danh sách | Hàng rào tĩnh hiện có KHÔNG bắt được `EV-02`. Đừng trông vào nó; task này cần phép đo riêng |
| `EV-12` | `src/shared/observability/logger.test.ts:217` cộng `:265-276` | Logger đã redact khóa `phone` và `cccd`, có test cho cả `+84` và `0` prefix | Đường log đã kín. Không mở lại chủ đề đó trong task này |
| `EV-13` | `src/domains/applications/application.service.ts:52-64` cộng `grep getPublicTracking` | Chỉ ba nơi tiêu thụ: route tra cứu, `application.service.test.ts`, `marketplace-apply.routes.test.ts` | Bán kính đổi tên trường nhỏ và đếm được. Không có consumer ẩn |
| `EV-14` | `app/api/public/applications/[trackingCode]/route.ts:36` | Route gọi `prisma.$transaction` trực tiếp, KHÔNG qua `withPublicDb` | Hợp lệ vì hàm là SECURITY DEFINER nên không cần GUC. Ghi lại để Tier 3 không báo sai lệch; task này KHÔNG sửa vì đường này đang chạy đúng |

### Dependency

| Dependency | Source | Satisfied evidence | Blocker |
|---|---|---|---|
| Đường tra cứu công khai còn sống | Đo live 31/08: `/api/public/applications/HRP-KHONG-TON-TAI-000` trả `404` chứ không `500` | Không có `try/catch` nào trên đường này, nên `404` chứng minh truy vấn DB chạy được | Không |
| Hàm `hrp_public_tracking_profile` đã có trên `hrp-live` | Cùng phép đo trên | `404` là mã do `getPublicTracking` trả khi hàm chạy và không có dòng nào | Không |
| Quyết định (b) của Owner | Lượt Owner 31/08 chiều | Ghi ở §1 | Không. Đây là input, không phải điểm chờ |
| Không phụ thuộc go-live-11 | Task 11 chỉ chạm `prisma/` cộng một test tĩnh | Hai task không chung file nào | Không |
| Không phụ thuộc go-live-12 | Task 12 chạm `app/(jobs)/viec-lam/`, `app/(portal)/page.tsx`, `src/domains/job-board/` | Task này chạm `app/(jobs)/track/`, `app/api/public/applications/`, `src/domains/applications/`, `src/shared/privacy/` | Không. Hai task chạy song song được về mặt file, nhưng quy tắc một Tier 2 tại một thời điểm vẫn buộc tuần tự |

## 3. Decisions

| ID | Decision | Lý do |
|---|---|---|
| `DEC-01` | Che ở **server**, bên trong `getPublicTracking`, tại đúng chỗ dựng DTO. KHÔNG che ở client, KHÔNG che ở route | Yêu cầu của Owner là "không mở ngược được bằng công cụ trình duyệt". Devtools đọc được thân phản hồi HTTP, nên điều kiện đủ duy nhất là chữ số gốc không bao giờ nằm trong thân đó. Che ở client thì giá trị gốc đã đi qua mạng và nằm trong tab Network — thất bại ngay ở phép thử của Owner |
| `DEC-02` | **Xoá** hai khóa `phone` và `cccdNumber` khỏi `PublicTrackingDto`, **thêm** `phoneMasked: string` và `cccdMasked: string \| null`. Không giữ khóa cũ, không giữ khóa cũ dạng optional | Giữ tên cũ thì một lần gán sai sẽ phát nguyên văn ra ngoài mà `tsc` im lặng. Đổi tên biến mọi consumer còn sót thành lỗi biên dịch. `EV-04` cho biết hàng rào này miễn phí vì client khai kiểu riêng |
| `DEC-03` | Hàm che nằm ở module mới `src/shared/privacy/mask.ts`, thuần hàm, không import Prisma, không import Next | Cần dùng được từ service, từ test, và sau này từ chỗ khác. Đặt trong `src/domains/applications` thì chỗ khác phải import xuyên domain |
| `DEC-04` | KHÔNG dùng lại `maskSensitive` của `src/shared/auth/worker-projection.ts` | `EV-09`: hàm đó che **toàn phần** thành `'***'` theo permission của nhân sự đã đăng nhập. Ở đây là che **một phần** cho khách vô danh, và phải giữ được số cuối để ứng viên tự đối chiếu. Cùng chữ "mask" nhưng khác bài toán; nhồi hai hành vi vào một hàm sẽ làm cả hai chỗ khó đọc. Điểm phải giữ giống: giá trị trống trả `null`, không trả dấu sao |
| `DEC-05` | Điện thoại giữ **ba số đầu và ba số cuối**. CCCD giữ **bốn số cuối**, không giữ số đầu | Ba số đầu của điện thoại chỉ là đầu số nhà mạng, thông tin gần bằng không, nhưng giúp ứng viên nhận ra số nào của mình khi có nhiều số. Ngược lại, các số đầu của CCCD mã hoá tỉnh cấp, giới tính cùng thế kỷ sinh, và năm sinh — đó là thông tin định danh thật, nên không được hiện |
| `DEC-06` | Số dấu sao bằng đúng số ký tự bị che, tức độ dài chuỗi hiển thị bằng độ dài giá trị gốc | Độ dài số điện thoại và CCCD Việt Nam là hằng số công khai, nên bảo toàn độ dài không tiết lộ gì thêm, mà lại giữ hình dạng tự nhiên để người đọc nhận ra đây là số của mình |
| `DEC-07` | Họ tên vẫn hiện nguyên văn | Owner chỉ yêu cầu che điện thoại và CCCD. Họ tên cũng là thứ giúp ứng viên biết đúng hồ sơ của mình. Rủi ro còn lại, ghi rõ chứ không im lặng: ai có mã tra cứu vẫn đọc được họ tên gắn với một việc làm cụ thể. Mã tra cứu là bearer 120-bit nên không đoán được, nhưng nếu bị chia sẻ lại thì họ tên rò theo. Muốn đóng nốt thì cần một quyết định mới của Owner, không phải một sửa đổi lặng lẽ của tôi |
| `DEC-08` | Cấm mọi hình thức che chỉ ở lớp trình bày: `-webkit-text-security`, `filter: blur`, thay phông, phủ khối màu, và cấm dùng ô nhập kiểu mật khẩu để hiển thị | Tất cả các cách đó đều giữ giá trị gốc trong DOM hoặc trong thân phản hồi. Người dùng bỏ một dòng CSS trong Elements là đọc được. Đây đúng là kịch bản Owner nêu tên |
| `DEC-09` | Cấm gửi kèm bản băm, bản mã hoá, bản encode, hay bất kỳ dẫn xuất khả nghịch nào của giá trị gốc trong phản hồi | Không gian số điện thoại di động Việt Nam nhỏ hơn mười tỷ và CCCD nhỏ hơn nghìn tỷ; dò ngược một băm không muối trên máy cá nhân là chuyện vài giây. "Đã băm" không phải "đã che" |
| `DEC-10` | Cấm để giá trị gốc trong bất kỳ thuộc tính hay khóa phụ nào: `title`, `aria-label`, `data-*`, `value`, `alt`, ô nhập ẩn, hay khóa JSON thứ hai | Đây là danh sách các chỗ người ta thường vô tình bỏ giá trị gốc vào để "phục vụ trợ năng" hoặc "để copy cho tiện". Mọi chỗ đó devtools đọc được |
| `DEC-11` | Giá trị ngắn hơn cửa sổ hiển thị thì che **toàn bộ**, không hiện phần nào | Dữ liệu bẩn tồn tại. Nếu số chỉ có năm ký tự mà vẫn giữ ba đầu ba cuối thì hiện gần hết. Quy tắc phải fail-closed theo hướng che nhiều hơn, không bao giờ ít hơn |
| `DEC-12` | Chuẩn hoá đầu vào trước khi đếm: bỏ khoảng trắng, dấu chấm, dấu gạch, dấu ngoặc; giữ nguyên dấu cộng nếu là ký tự đầu | Dữ liệu nhập tay có `0912 345 678` và `+84912345678`. Đếm trên chuỗi thô sẽ che lệch vị trí, làm lộ nhiều hơn dự kiến với chuỗi có dấu cách |
| `DEC-13` | Bằng chứng của task này được phép dùng **mock hàng DB** ở tầng route, và đó là bằng chứng THẬT cho lớp lỗi này | Doctrine của repo cấm mock evidence vì bài học `hotfix-01`: mock `findMany` không tái lập nổi invariant của query engine. Ở đây lớp lỗi khác hẳn — đó là lỗi **projection thuần JS**. Test tầng route vẫn chạy mapper thật, `NextResponse.json` thật, và đo trên **thân phản hồi đã tuần tự hoá thật**. Cái duy nhất bị mock là hàng dữ liệu đầu vào, và mock nó là cách duy nhất đưa được chữ số tổng hợp vào mà không dùng PII thật. Không được viện `DEC-13` để mock cho lỗi tầng DB ở task khác |
| `DEC-14` | Phép đo cuối cùng là: **tuần tự hoá thân phản hồi thành chuỗi rồi khẳng định chuỗi số gốc không xuất hiện** — không phải khẳng định từng khóa một | `EV-02` cho thấy route spread nguyên DTO. Kiểm từng khóa thì một khóa mới thêm sau này sẽ lọt. Kiểm trên chuỗi thì bất kỳ khóa nào chứa giá trị gốc cũng đỏ, kể cả khóa chưa tồn tại lúc viết test. Đây là bài học của `hotfix-02`: đo ở đúng biên đã vỡ |
| `DEC-15` | Ba comment ở `EV-07` phải được sửa thành quyết định (b), nêu rõ (b) thay thế (a) và ghi ngày | Ba comment đó hiện là chỉ dẫn ngược. Để nguyên thì lần refactor sau sẽ có người "sửa cho khớp comment" và mở lại lỗ. Sửa comment ở đây là hàng rào chống tái diễn rẻ nhất |
| `DEC-16` | KHÔNG che trong thân hàm SQL ở round này | Cần thêm một migration, và stop condition của repo đang khoá số migration chờ. `DEC-01` đã đủ cho phép thử của Owner vì Node là nơi duy nhất đọc hàm đó. Ghi thành follow-up ở §9 |

## 4. Contract

| ID | Requirement |
|---|---|
| `RQ-01` | Tạo module mới `src/shared/privacy/mask.ts`, thuần hàm, KHÔNG import Prisma, KHÔNG import Next, KHÔNG đọc biến môi trường. Export đúng hai hàm chính sách: một hàm che điện thoại và một hàm che CCCD. Cả hai nhận vào một chuỗi có thể trống hoặc thiếu, và trả về chuỗi đã che hoặc `null` |
| `RQ-02` | Quy tắc che, khoá tới từng ký tự: chuẩn hoá đầu vào theo `DEC-12` trước khi đếm; điện thoại giữ ba ký tự đầu và ba ký tự cuối; CCCD giữ bốn ký tự cuối và không giữ ký tự đầu nào; phần bị che thay bằng dấu sao, số dấu sao bằng đúng số ký tự bị che theo `DEC-06`; nếu độ dài sau chuẩn hoá nhỏ hơn hoặc bằng tổng số ký tự định giữ thì che toàn bộ theo `DEC-11`; đầu vào trống, chỉ khoảng trắng, `null` hoặc thiếu thì trả `null` theo `DEC-04` |
| `RQ-03` | Trong `PublicTrackingDto` tại `src/domains/applications/application.service.ts`: **xoá** khóa `phone` và khóa `cccdNumber`; **thêm** khóa `phoneMasked` và khóa `cccdMasked`, cả hai kiểu chuỗi hoặc `null`. Không đổi, không xoá, không thêm khóa nào khác của DTO này |
| `RQ-04` | `getPublicTracking` gán `phoneMasked` và `cccdMasked` bằng chính hai hàm của `RQ-01`. Sau khi sửa, trong toàn bộ thân hàm không còn phép gán nào đưa `row.phone` hay `row.cccd_number` vào giá trị trả về, và không có biến trung gian nào mang giá trị gốc ra ngoài phạm vi hàm. Kiểu hàng thô và câu `SELECT` KHÔNG đổi vì hàm SQL không đổi |
| `RQ-05` | `app/api/public/applications/[trackingCode]/route.ts` chỉ đổi comment theo `RQ-11`. Không thêm khóa vào phản hồi, không thêm header, không đổi mã trạng thái, không đổi thứ tự hai bucket rate limit, không đổi `Cache-Control` |
| `RQ-06` | `app/(jobs)/track/page.tsx`: kiểu dữ liệu phía client bỏ hai khóa cũ và khai hai khóa mới của `RQ-03`; hai chỗ render hiện giá trị đã che; cả hai trường hợp giá trị `null` đều hiện đúng chuỗi `Không cung cấp` đang dùng hôm nay; nhãn của hai dòng, thứ tự các dòng và mọi phần còn lại của trang không đổi |
| `RQ-07` | Toàn bộ diff của task này KHÔNG được chứa: `-webkit-text-security`, `text-security`, `filter: blur`, `type='password'`, `type="password"`, thuộc tính `title` hay `aria-label` hay `data-` nào mang giá trị điện thoại hoặc CCCD, ô nhập ẩn mang hai giá trị đó, khóa JSON thứ hai mang hai giá trị đó, và bất kỳ lệnh gọi băm hay mã hoá nào trên hai giá trị đó. Đây là `DEC-08`, `DEC-09`, `DEC-10` viết thành điều kiện đo được |
| `RQ-08` | Thêm test đơn vị cho module `RQ-01`, tối thiểu bảy trường hợp: điện thoại mười chữ số; điện thoại có khoảng trắng giữa các nhóm; điện thoại dạng cộng tám bốn; CCCD mười hai chữ số; CCCD `null`; giá trị ngắn hơn cửa sổ hiển thị phải bị che toàn bộ; chuỗi chỉ gồm khoảng trắng phải trả `null`. Thêm một khẳng định bất biến: bỏ phần đầu và phần cuối được giữ ra khỏi kết quả thì phần còn lại chỉ gồm dấu sao |
| `RQ-09` | Thêm test tầng route cho `GET /api/public/applications/{ma}` theo `DEC-13` và `DEC-14`: dựng một hàng dữ liệu tổng hợp, gọi route thật, đọc thân phản hồi, **tuần tự hoá thành chuỗi**, rồi khẳng định chuỗi đó không chứa chuỗi số điện thoại gốc và không chứa chuỗi CCCD gốc. Cùng test khẳng định khối `application` không có khóa `phone` và không có khóa `cccdNumber`, theo mẫu `EV-10` |
| `RQ-10` | Cập nhật hai test hiện có ở `EV-13` sang tên khóa mới. Chỉ được đổi tên khóa và giá trị mong đợi tương ứng; KHÔNG được xoá, nới lỏng, hay đánh dấu bỏ qua bất kỳ khẳng định nào đang có trong hai file đó |
| `RQ-11` | Sửa ba comment ở `EV-07` thành quyết định (b): ghi rõ điện thoại và CCCD được che một phần ở server, ghi rõ (b) ngày 31/08 thay thế (a) cùng ngày, và ghi rõ lý do là để giá trị gốc không nằm trong phản hồi HTTP. Không để lại câu nào nói người giữ mã đọc được nguyên văn hai trường đó |
| `RQ-12` | Mọi số dùng trong test và trong HANDOFF là số tổng hợp. KHÔNG dùng, KHÔNG in, KHÔNG dán bất kỳ số điện thoại thật, CCCD thật, họ tên thật hay mã tra cứu thật nào của ứng viên vào bất cứ đâu, kể cả HANDOFF |
| `RQ-13` | `npm run typecheck`, `npm run lint`, `npm run test:unit` đều exit 0. Tổng số test của lane canonical KHÔNG thấp hơn 1421 và phải tăng thêm ít nhất tám test mới của `RQ-08` cộng `RQ-09` |
| `RQ-14` | Không tự commit, không tự push, không tự deploy. Task này không có uỷ quyền deploy |

### Traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-01 | AC-02 |
| RQ-03 | STEP-02 | AC-03 |
| RQ-04 | STEP-02 | AC-04 |
| RQ-05 | STEP-03 | AC-05 |
| RQ-06 | STEP-03 | AC-06 |
| RQ-07 | STEP-05 | AC-07 |
| RQ-08 | STEP-01 | AC-08 |
| RQ-09 | STEP-04 | AC-09 |
| RQ-10 | STEP-02 | AC-10 |
| RQ-11 | STEP-05 | AC-11 |
| RQ-12 | STEP-06 | AC-12 |
| RQ-13 | STEP-06 | AC-13 |
| RQ-14 | STEP-06 | AC-14 |

## 5. Execution Plan

| STEP | Nội dung |
|---|---|
| `STEP-01` | Viết `src/shared/privacy/mask.ts` theo `RQ-01` và `RQ-02`, cùng test đơn vị `RQ-08`. Chạy test module này trước khi chạm bất cứ file nào khác: quy tắc che phải đúng trước khi đem đi dùng |
| `STEP-02` | Đổi `PublicTrackingDto` và `getPublicTracking` theo `RQ-03` và `RQ-04`. Chạy `npm run typecheck` ngay tại đây và **dán nguyên văn danh sách lỗi**: mỗi lỗi là một consumer còn phát giá trị gốc. Sửa hết theo `RQ-10`, không đi tiếp khi typecheck còn đỏ |
| `STEP-03` | Sửa `app/(jobs)/track/page.tsx` theo `RQ-06` và giữ route đúng như `RQ-05` |
| `STEP-04` | Viết test tầng route `RQ-09`. Chạy RED trước GREEN theo cách trung thực: tạm khôi phục phép gán nguyên văn trong `getPublicTracking` trên bản làm việc, chạy test để nó ĐỎ, dán output, rồi bỏ phần khôi phục đó và chạy lại để nó XANH, dán output. Nếu chỉ có XANH thì không chứng minh được test đang đo đúng thứ cần đo |
| `STEP-05` | Sửa ba comment theo `RQ-11`. Rồi tự chạy các grep của `RQ-07` trên diff và dán kết quả rỗng cộng exit code |
| `STEP-06` | Chạy `npm run typecheck`, `npm run lint`, `npm run test:unit` — đọc `$LASTEXITCODE` ngay sau mỗi lệnh, KHÔNG pipe sang lệnh khác. Viết HANDOFF gồm bảng AC-01..AC-14 kèm lệnh, exit code và output nguyên văn, cộng `git status --short` để chứng minh bán kính file. Không commit, không push |

### Stop condition

Tier 2 DỪNG và báo, không tự quyết, nếu gặp bất kỳ điều nào sau đây:

- Cần sửa thân hàm SQL, cần thêm migration, cần đổi cột, hoặc cần đổi dữ liệu đã lưu.
- Cần đổi hoặc bỏ một khóa nào khác của `PublicTrackingDto` ngoài hai khóa ở `RQ-03`.
- Cần đổi rate limit, mã trạng thái, hoặc thông điệp lỗi của đường tra cứu.
- Phát hiện thêm một đường công khai thứ hai phát điện thoại hoặc CCCD ra ngoài, tức `EV-03` sai. Báo ngay kèm đường dẫn và số dòng; đừng tự mở rộng phạm vi.
- Yêu cầu che họ tên xuất hiện từ bất cứ nguồn nào không phải Owner. `DEC-07` là quyết định đã ghi, đổi nó cần Owner.

## 6. Acceptance

| AC | Cách đo | Ngưỡng PASS |
|---|---|---|
| `AC-01` | Đọc `src/shared/privacy/mask.ts` cộng `grep -nE "from '@?prisma\|next/\|process\.env" src/shared/privacy/mask.ts` | File tồn tại, export đúng hai hàm chính sách, và grep zero match. Dán kết quả rỗng cộng exit code |
| `AC-02` | Bảng đối chiếu trong HANDOFF: với sáu đầu vào tổng hợp, ghi giá trị vào và giá trị ra | Điện thoại mười chữ số ra dạng ba ký tự, bốn dấu sao, ba ký tự — tổng độ dài mười. CCCD mười hai chữ số ra dạng tám dấu sao cộng bốn ký tự cuối — tổng độ dài mười hai. Giá trị ngắn ra toàn dấu sao. `null` và chuỗi trắng ra `null` |
| `AC-03` | `grep -nE "phone\|cccdNumber\|phoneMasked\|cccdMasked" src/domains/applications/application.service.ts` | Trong khối khai báo `PublicTrackingDto` KHÔNG còn khóa `phone` và KHÔNG còn khóa `cccdNumber`; có đúng hai khóa mới. Dán nguyên văn output |
| `AC-04` | Đọc thân `getPublicTracking` sau khi sửa | Giá trị trả về lấy từ hai hàm che; không còn phép gán nào đưa `row.phone` hay `row.cccd_number` vào DTO. Câu `SELECT` không đổi một ký tự — chứng minh bằng `git diff` của đúng hàm đó |
| `AC-05` | `git diff -- app/api/public/applications/` | Diff chỉ chứa thay đổi comment. Bất kỳ dòng mã thực thi nào bị đổi trong file route = FAIL |
| `AC-06` | `git diff -- app/(jobs)/track/page.tsx` cộng chạy `npm run dev` rồi tra một mã tổng hợp | Diff chỉ gồm kiểu dữ liệu và hai chỗ render. Trang hiện giá trị đã che; CCCD `null` hiện `Không cung cấp`. Nếu `npm run dev` không lên được thì AC này `ENV_BLOCKED` kèm nguyên văn lỗi, và AC-09 vẫn phải xanh — KHÔNG được thay bằng phỏng đoán |
| `AC-07` | `git diff` toàn bộ rồi `grep -nE "text-security\|filter: ?blur\|type=.password.\|createHash\|createHmac\|btoa\|toString\('hex'\)"` trên diff | Zero match. Dán kết quả rỗng cộng exit code. Thêm một dòng khẳng định bằng lời rằng không có thuộc tính `title`, `aria-label`, `data-` nào mang hai giá trị đó, kèm đường dẫn đã kiểm |
| `AC-08` | Chạy file test của `RQ-08` | Exit 0, có tối thiểu bảy trường hợp, và có khẳng định bất biến "phần giữa chỉ gồm dấu sao". Dán danh sách tên test |
| `AC-09` | Chạy file test của `RQ-09` hai lần theo `STEP-04` | RED: exit code 1 kèm thông điệp chỉ ra chuỗi số gốc bị tìm thấy trong thân phản hồi. GREEN: exit 0. Chỉ dán GREEN = FAIL |
| `AC-10` | `git diff -- src/domains/applications/application.service.test.ts src/domains/applications/marketplace-apply.routes.test.ts` | Chỉ có dòng đổi tên khóa và giá trị mong đợi. Không có test nào bị đánh dấu bỏ qua hay hoãn, không có khẳng định nào bị xoá. Số khẳng định trong hai file không giảm |
| `AC-11` | Đọc ba vị trí của `EV-07` sau khi sửa | Cả ba đều ghi quyết định (b) và nêu (b) thay thế (a) kèm ngày. `grep -rn "đọc lại nguyên văn\|re-read" ` trên ba file đó zero match với nghĩa cũ. Dán nguyên văn ba đoạn comment mới |
| `AC-12` | Đọc toàn bộ test mới và toàn bộ HANDOFF | Không có số điện thoại thật, CCCD thật, họ tên thật, mã tra cứu thật. Bất kỳ giá trị nào trông như PII thật = FAIL cả task |
| `AC-13` | `npm run typecheck`; `npm run lint`; `npm run test:unit` — mỗi lệnh đọc `$LASTEXITCODE` ngay sau đó | Cả ba exit 0. Tổng test không thấp hơn 1421 và tăng ít nhất tám. Dán ba dòng exit code cộng dòng tổng kết của vitest |
| `AC-14` | `git log origin/main..HEAD` cộng `git status --short` | `git log origin/main..HEAD` rỗng, không có commit mới nào do Tier 2 tạo. Danh sách file đổi nằm trọn trong: `src/shared/privacy/`, `src/domains/applications/`, `app/(jobs)/track/page.tsx`, `app/api/public/applications/[trackingCode]/route.ts`. Tự commit là FAIL |

## 7. Risk

| ID | Risk | Mức | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | Che ở client hoặc che bằng CSS vì nó nhanh hơn, rồi báo PASS | Cao về tác động, đây là cách thất bại tự nhiên nhất | `DEC-01`, `DEC-08`, `DEC-10` cấm đích danh. `AC-07` grep trên diff. `AC-09` đo trên thân phản hồi đã tuần tự hoá, nơi mà mọi cách che phía client đều đỏ |
| `RISK-02` | Giữ khóa cũ cho "tương thích" rồi phát cả hai bản | Trung bình | `DEC-02` bắt xoá khóa cũ. `AC-03` grep khối khai báo. `AC-09` khẳng định vắng hai khóa cũ |
| `RISK-03` | Đổi tên khóa làm vỡ hai test cũ, rồi Tier 2 nới lỏng khẳng định cho nhanh xanh | Trung bình | `RQ-10` cấm nới lỏng. `AC-10` đọc diff và đếm số khẳng định |
| `RISK-04` | Che lệch vị trí với chuỗi có khoảng trắng hoặc tiền tố cộng tám bốn, làm lộ nhiều hơn dự kiến | Trung bình | `DEC-12` chuẩn hoá trước khi đếm. `RQ-08` có đúng hai trường hợp đó. `AC-02` in bảng vào ra |
| `RISK-05` | Số dấu sao cố định làm chuỗi ngắn hơn giá trị gốc, người dùng tưởng nhập sai số | Thấp | `DEC-06` bảo toàn độ dài. `AC-02` kiểm tổng độ dài bằng mười và mười hai |
| `RISK-06` | Hàm SQL vẫn trả nguyên văn, nên một consumer mới trong tương lai lại phát ra ngoài | Trung bình về xác suất, cao về tác động | Round này đóng bằng `DEC-02`: khóa gốc không còn tồn tại trong DTO nên consumer mới phải tự viết SQL riêng mới rò được. Đóng nốt bằng follow-up ở §9 |
| `RISK-07` | Tier 3 từ chối bằng chứng vì repo có doctrine cấm mock | Trung bình | `DEC-13` viết sẵn lý do vì sao mock hàng dữ liệu là hợp lệ cho lớp lỗi projection, và nêu rõ nó không phải tiền lệ cho lỗi tầng DB |
| `RISK-08` | Ai đó dùng mã tra cứu thật để "đo cho chắc" rồi dán vào HANDOFF | Thấp về xác suất, cao về tác động | `RQ-12` và `AC-12` cấm đích danh, và AC-12 đặt mức FAIL cả task |

## 8. Open Questions

| ID | Question | Trạng thái |
|---|---|---|
| `Q-01` | Có che họ tên không? | Mở, KHÔNG chặn task. `DEC-07` giữ nguyên văn theo đúng phạm vi Owner nêu. Cần Owner quyết nếu muốn đổi |
| `Q-02` | Có che luôn trong hàm SQL để phòng ngự nhiều lớp không? | Mở, không chặn. Cần một migration nên phải chờ trần migration của repo mở lại |

## 9. Planner Resolution

Chưa có. Task vừa mở.

Hai điều thuộc trách nhiệm Tier 1 cần ghi ngay, để không ai phải suy đoán về sau:

1. Hành vi hiện tại KHÔNG phải defect. Nó là quyết định (a) của Owner, ghi rõ trong ba comment tại `EV-07`. Task này tồn tại vì Owner đổi ý trong cùng ngày, và quyết định (b) thắng. Ai đọc lịch sử Git sau này đừng kết luận có ai đó đã làm sai.
2. Follow-up bắt buộc, không được để rơi: che ngay trong `hrp_public_tracking_profile` bằng một migration forward-only, để phòng ngự nhiều lớp theo `RISK-06`. Tier 1 mở task riêng sau khi trần migration được Owner mở lại; `DEC-16` là lý do nó không nằm trong round này.

## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| v1.0 | 2026-08-31 | Mở task. Nguồn: yêu cầu của Owner chiều 31/08 về `/track`. Evidence do Tier 1 tự đọc bốn file thật cộng bốn lượt grep tại `0248948`; xác nhận bề mặt rò rỉ công khai là đúng một dòng |
