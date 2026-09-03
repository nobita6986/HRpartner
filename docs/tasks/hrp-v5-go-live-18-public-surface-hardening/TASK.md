# TASK: hrp-v5-go-live-18-public-surface-hardening

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-18-public-surface-hardening` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `80f6933` |
| Modules | `src/shared/security/rate-limit-guard.ts`, `app/(jobs)/viec-lam/[slug]/page.tsx`, `app/api/public/applications/[trackingCode]/route.ts`, `src/domains/applications/marketplace-inventory.static.test.ts`, `src/shared/security/public-surface-limiter.static.test.ts`, `src/domains/applications/tracking-pii-containment.static.test.ts` |
| ADR references | `hrp-v5-go-live-07-marketplace-launch-proof` `DEC-18` — nhánh `404` của tracking thiếu `no-store`, dư nợ mà task này nhận; `hrp-v5-go-live-13-tracking-pii-mask` `F-06` — assertion phủ định chống hồi quy, chuyển sang task này kèm lý do ở `DEC-07`; `hrp-v5-ops-06a-launch-hardening` — nguồn của limiter phân tán và của bài học limiter theo instance |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/code` giao được ngay. Không phụ thuộc DB, không migration, không cần Owner quyết gì |
| Updated | `2026-09-03 18:05 Asia/Bangkok` |

Task này bịt bốn lỗ trên bề mặt công khai, cả bốn đã được đo chứ không phỏng đoán:

1. Trang chi tiết việc `app/(jobs)/viec-lam/[slug]/page.tsx` là Server Component `force-dynamic` đọc DB TRỰC TIẾP và **không đi qua limiter nào**. Nó là consumer duy nhất của `withPublicDb` không có limiter, trong khi ba consumer còn lại đều có (`EV-02`).
2. Nhánh `404` của route tracking thiếu `Cache-Control: no-store`, trong khi nhánh `200` ngay dưới nó có (`EV-07`). Đây là `DEC-18` của contract 07.
3. Hai literal ở `marketplace-inventory.static.test.ts` chỉ khẳng định KHẲNG ĐỊNH rằng khoá đã che được in, không có một assertion PHỦ ĐỊNH nào chặn ai đó in lại khoá thô (`EV-08`). Đây là `F-06` của task 13.
4. Quy ước "đường tra cứu công khai không được để giá trị thô ra khỏi service" hiện KHÔNG có hàng rào nào. Nó đúng ở đúng một tệp và đúng nhờ hai lệnh gọi che viết tay, không nhờ một phép kiểm (`EV-12` tới `EV-14`). Đây là phương án `Q-03` của `hrp-v5-go-live-19-tracking-pii-db-mask`, Owner chọn ngày `03/09` thay cho việc che ở tầng SQL ngay lượt này.

Và task này **bác bỏ** một món trong hàng đợi. Câu hỏi `Q-01` cũ ghi *"probe tìm kiếm đang phơi `staffingOrder.description`"*. Đo lại trên baseline: **sai**. `go-live-05` đã cố ý loại `order.description` khỏi chuỗi khớp `q` và ghi rõ lý do trong chính mã. Chi tiết ở `EV-09` và `EV-10`. Không có gì để sửa ở đó, và task này không sửa.

## 1. Outcome

### User-visible outcome

1. Một máy quét ẩn danh không còn kéo được vô hạn truy vấn DB qua trang chi tiết việc. Vượt ngân sách thì trang trả về một thông báo và **không chạm DB một lần nào**.
2. Ngân sách của trang chi tiết là ngân sách `JOB_BROWSE` DÙNG CHUNG với API danh sách, nên một máy quét không thể lấy `120` lượt danh sách rồi thêm vô hạn lượt chi tiết.
3. Một mã tra cứu sai không còn để lại bản cache ở bất kỳ tầng trung gian nào.
4. Một hàng rào tĩnh mới khẳng định: **mọi** consumer của `withPublicDb` đều tham chiếu limiter. Thêm một bề mặt công khai đọc DB mà quên limiter thì test ĐỎ ngay, không cần ai nhớ.
5. Hai assertion phủ định chặn việc in lại số điện thoại thô và CCCD thô lên trang tra cứu.
6. Một hàng rào tĩnh thứ hai khẳng định giá trị THÔ của số điện thoại và CCCD không ra khỏi service trên đường tra cứu công khai. Một caller tương lai quên gọi phép che thì test ĐỎ ngay, không cần chờ ai nhìn thấy.

### Non-goals

- Không đổi `order.description`, không đổi `keywordHaystack`, không đổi `searchableTextOf`, không đổi `classifyJobType`. Lý do ở `EV-09` và `EV-10`: món đó đã đóng từ `go-live-05` và sửa thêm là đổi nhãn đang in đúng.
- Không đưa limiter vào `middleware.ts`. Lý do cơ học ở `EV-05`: HMAC của limiter dùng `node:crypto`, không chạy được trên Edge runtime.
- Không thay limiter theo instance đang có trong `middleware.ts` cho đường `/worker`. Đó là dư nợ riêng, ghi ở `Q-02`, không thuộc task này.
- Không đổi hành vi của bốn route đang gọi limiter. Không đổi giá trị của năm rule trong `RATE_LIMIT_RULES`.
- Không migration, không seed, không chạm `prisma/`.
- Không chạm `app/globals.css`, không chạm phạm vi contract 16, không chạm tám tệp thuộc phạm vi contract 17.

## 2. Evidence và Baseline

Mọi phép đo dưới đây chạy trên baseline ghi ở `0. Control` bằng `git show`, không trên worktree.

| ID | Nguồn | Điều đã đo | Vì sao nó quyết định thiết kế |
|---|---|---|---|
| `EV-01` | `app/(jobs)/viec-lam/[slug]/page.tsx:35`, `:36`, `:47`, `:57` | Server Component. `import` `withPublicDb` ở `:35` và `getPublicJobDetail` ở `:36`, `export const dynamic = 'force-dynamic'` ở `:47`, và truy vấn thật ở `:57`. Docblock ở `:8` ghi rõ nó đọc DB qua ĐÚNG `withPublicDb`, tức cố tình KHÔNG gọi API nội bộ của chính app | `force-dynamic` cộng không limiter nghĩa là MỖI request ẩn danh là một vòng DB thật, không cache chặn. Đây là bề mặt đắt nhất trên toàn public surface |
| `EV-02` | `grep -rl withPublicDb` trên `src` và `app`, bỏ tệp test | Đúng **bốn** tệp, một trong đó là chính định nghĩa `src/shared/auth/with-public-db.ts`. Ba consumer: `app/api/jobs/route.ts`, `app/api/jobs/[slug]/route.ts` — cả hai CÓ limiter — và `app/(jobs)/viec-lam/[slug]/page.tsx`, KHÔNG có | Con số ba làm bất biến của hàng rào trở nên chặt và rẻ: mọi consumer của `withPublicDb` phải tham chiếu limiter. Một tệp lệch là một dòng đỏ |
| `EV-03` | `src/shared/security/rate-limit-port.ts:35` | `JOB_BROWSE` là `subject: 'ip'`, `limit: 120`, `windowSec: 60`. Đây là rule mà cả `GET /api/jobs` và `GET /api/jobs/[slug]` đang dùng | Trang chi tiết phải dùng ĐÚNG rule này, không phải rule mới. Dùng chung ngân sách là điều làm bản sửa có giá trị: nếu cấp rule riêng thì máy quét được cộng thêm ngân sách chứ không bị chặn |
| `EV-04` | `app/api/jobs/route.ts:17`, `app/api/jobs/[slug]/route.ts:18`, `app/api/public/applications/[trackingCode]/route.ts:29`, `app/api/public/jobs/[slug]/applications/route.ts:103` và `:128` | `enforceRateLimits` được gọi ở đúng bốn tệp route, năm vị trí. Không tệp nào dưới `app/(jobs)/` hay `app/(portal)/` gọi nó | Bốn tệp này KHÔNG được đổi hành vi. Chúng là phép thử hồi quy sống cho bản refactor của `RQ-01` |
| `EV-05` | `src/shared/security/rate-limit-identity.ts:8` và `:53` | `import { createHmac } from 'node:crypto'`, và `createHmac('sha256', ...)` là lõi của phép băm identifier | `node:crypto` KHÔNG chạy trên Edge runtime, và middleware của Next `15.1` chạy Edge. Vì vậy phương án "đưa limiter vào middleware" bị ĐÓNG bằng một dữ kiện cơ học, không phải bằng sở thích |
| `EV-06` | `middleware.ts:31` và `:134` | `middleware.ts` có một limiter riêng bằng `Map` trong bộ nhớ tiến trình cho đường `/worker`. Matcher ở `:134` KHÔNG chứa `/viec-lam` | Limiter theo instance là đúng khuyết điểm mà `ops-06a` đã thay cho bề mặt công khai. Mở rộng nó sang trang chi tiết là đi ngược một task đã ACCEPTED |
| `EV-07` | `app/api/public/applications/[trackingCode]/route.ts:42` và `:44` | Nhánh `404` ở `:42` trả `NextResponse.json` **không có** khoá `headers`. Nhánh `200` ở `:44` có `headers: { 'Cache-Control': 'no-store' }` | Hai dòng liền nhau, một có một không. Đây là `DEC-18` của contract 07 và nó là bản sửa một dòng |
| `EV-08` | `src/domains/applications/marketplace-inventory.static.test.ts:353` và `:354` | Hai assertion KHẲNG ĐỊNH rằng `result.phoneMasked` và `result.cccdMasked` được in. Không có assertion PHỦ ĐỊNH nào trên khoá thô. Assertion phủ định duy nhất trong tệp, ở `:384`, chỉ soi các lệnh `console` | Một hàng rào chỉ khẳng định cái ĐÚNG đang có mặt thì không chặn ai đó THÊM cái sai bên cạnh. Cả hai dòng vẫn xanh nếu ai đó in thêm `result.phone` ngay dưới |
| `EV-09` | `src/domains/job-board/public.service.ts:550` và `:558` | Hàm `keywordHaystack` ở `:558` là chuỗi khớp `q`. Comment ở `:550` ghi nguyên văn rằng nó **cố ý KHÔNG gộp** `order.description`. Tập field của nó là tiêu đề việc, slug, `siteAddress`, tiêu đề đơn còn hiệu lực, tên vị trí và địa điểm slot | `Q-01` cũ nói probe tìm kiếm phơi `description`. Sai. `go-live-05` đã đóng nó, và có comment giải thích tại chỗ. Không sửa gì ở đây |
| `EV-10` | `src/domains/job-board/public.service.ts:326`, `:331`, `:445`, `:502` | Consumer còn lại DUY NHẤT của `order.description` là `searchableTextOf` ở `:326`, và output của nó chỉ chảy vào `classifyJobType` ở `:445` và `:502`. Hàm đó trả một enum ĐÓNG ba giá trị | Kênh còn lại là một nhãn ba giá trị, không phải một oracle tra cứu: khách ẩn danh không nhập được đầu vào để hỏi "description có chứa X không". Cắt kênh này sẽ đổi nhãn của bản ghi đang in đúng — chính lớp lỗi của `go-live-14` — nên đây là dư nợ ĐƯỢC CHẤP NHẬN, không phải một bản sửa |
| `EV-11` | `grep -rn hrp_public_tracking_profile` trên `src` và `app`, bỏ tệp test | Đúng **một** tệp không phải test tham chiếu hàm đó: `src/domains/applications/application.service.ts`, một lần trong docblock ở `:7` và một lần trong truy vấn ở `:219` | Con số một làm bất biến của hàng rào chặt và rẻ: đúng một tệp được phép đọc hàm ấy, và tệp đó phải che cả hai trường. Một tệp thứ hai xuất hiện là một dòng đỏ |
| `EV-12` | `src/domains/applications/application.service.ts:233` và `:234` | `row.phone` xuất hiện ĐÚNG một lần trong cả tệp, và nó nằm trong `maskPhone(...)`. `row.cccd_number` xuất hiện ĐÚNG một lần, nằm trong `maskCccd(...)` | Bất biến đo được mà không cần chạy gì: mỗi lần đọc cột thô đều bị bọc bởi phép che. Hai con số một là điều làm assertion không cần biết trước hình dạng mã, chỉ cần đếm |
| `EV-13` | `src/domains/applications/application.service.ts:57` tới `:69` | `PublicTrackingDto` khai đúng `11` khoá. Hai khoá liên quan PII là `phoneMasked` và `cccdMasked`, cả hai `string` hoặc `null`. KHÔNG có khoá `phone`, `cccdNumber`, `cccd_number` hay `normalizedPhone` | Kiểu là nơi rẻ nhất để chặn hồi quy: thêm một khoá thô vào DTO là một dòng, và không test nào hiện nay bắt được. `tsc` cũng không, vì consumer tự khai interface cục bộ — bài học đã ghi của repo này |
| `EV-14` | Cùng tệp, `:126`, `:146`, `:166` | `normalizedPhone` tồn tại thật trong tệp nhưng thuộc đường NỘP HỒ SƠ, không thuộc đường tra cứu | Đây là bẫy của hàng rào: một assertion phủ định viết rộng thành "không có `normalizedPhone` trong tệp này" sẽ ĐỎ trên mã đúng. Bất biến phải neo vào `row.phone` và `row.cccd_number`, tức vào kết quả của chính hàm tra cứu |
| `EV-15` | `hrp-v5-go-live-19-tracking-pii-db-mask` §8 | Owner quyết ngày `03/09`: chọn phương án `Q-03` cho lượt này, tức giữ phép che ở Node cộng một hàng rào tĩnh, và dịch việc che ở tầng SQL sang SAU RA MẮT với điều kiện `DATABASE_URL_TEST` phải tồn tại trước | Đây là nguồn của `RQ-11` và `RQ-12`. Ghi ra để không ai đọc thành `R-02` của task 13 bị bỏ: nó vẫn mở, ở contract 19, chỉ đổi thứ tự |

## 3. Decisions và Assumptions

| ID | Quyết định | Lý do |
|---|---|---|
| `DEC-01` | Tách một điểm vào CHỈ TRẢ QUYẾT ĐỊNH ra khỏi `enforceRateLimits` trong `src/shared/security/rate-limit-guard.ts`. Hàm mới nhận cùng input, trả một giá trị mô tả kết quả — cho phép đi tiếp, vượt limit, hoặc limiter không khả dụng — mà KHÔNG dựng `NextResponse`. `enforceRateLimits` giữ nguyên chữ ký, nguyên hành vi, và trở thành lớp bọc mỏng quanh hàm mới | Server Component không dùng được `NextResponse` làm giá trị trả. Bọc lại thay vì nhân bản logic là cách duy nhất giữ MỘT nguồn sự thật cho canonicalize, HMAC, fail-closed và log. Bốn route ở `EV-04` không đổi một dòng gọi nào |
| `DEC-02` | Trang chi tiết gọi điểm vào mới TRƯỚC mọi truy vấn, dùng ĐÚNG rule `JOB_BROWSE` và IP lấy bằng `clientIpFromHeaders` như bốn route đang làm. Khi bị từ chối, trang render một khối thông báo và **return trước** khi gọi `withPublicDb` | `EV-03`: dùng chung ngân sách là điều làm bản sửa có giá trị. Return trước truy vấn là điều làm nó bảo vệ DB thật, không chỉ bảo vệ giao diện |
| `DEC-03` | **Giới hạn CÓ TÊN:** trang trả HTTP `200` kể cả khi bị từ chối, vì Server Component của Next `15.1` không đặt được status code. Điều được bảo đảm là ZERO truy vấn DB, không phải một mã `429`. Giới hạn này phải ghi nguyên văn vào `HANDOFF.md` | Mối nguy thật là vòng DB, không phải con số trong header. Ghi giới hạn ra là cách duy nhất để một round sau không đọc `200` thành "limiter không chạy". Cửa mã `429` chỉ mở khi middleware chạy được Node runtime, xem `Q-01` |
| `DEC-04` | KHÔNG dùng `middleware.ts`. KHÔNG mở rộng limiter `Map` trong bộ nhớ | `EV-05` đóng cửa Edge bằng `node:crypto`. `EV-06`: limiter theo instance là khuyết điểm `ops-06a` đã thay |
| `DEC-05` | Hàng rào mới `src/shared/security/public-surface-limiter.static.test.ts` **tự suy** tập consumer: quét `src/` và `app/` tìm mọi tệp không phải test có tham chiếu `withPublicDb`, bỏ chính tệp định nghĩa, rồi khẳng định MỖI tệp còn lại cũng tham chiếu limiter. CẤM ghim cứng danh sách ba tệp | Đây là bài học `TEXT_PAIRS` của `go-live-08` áp đúng chỗ: một hàng rào phải liệt kê cái nó BẢO VỆ. Bất biến "consumer của `withPublicDb` phải có limiter" tự sinh, nên bề mặt thứ tư trong tương lai bị bắt mà không ai phải nhớ |
| `DEC-06` | Cùng hàng rào mang một FIXTURE ÂM: một chuỗi nguồn giả có `withPublicDb` mà không có limiter, và test khẳng định detector BẮT được nó | Không có fixture âm thì một detector luôn trả rỗng cũng xanh |
| `DEC-07` | `F-06` của task 13 nằm trong task NÀY, không nằm trong task che PII ở tầng SQL. Lý do: `F-06` là ba assertion tĩnh, không cần migration, và nó canh một lỗ PII trên bề mặt công khai TRƯỚC lúc ra mắt. Ghép nó vào một task đang chờ Owner mở trần migration là khoá một hàng rào rẻ sau một cổng đắt | Task 13 §9 ghi `F-06` mở "cùng lượt" với `R-02`. Đó là hướng dẫn về thứ tự, không phải một ràng buộc kỹ thuật, và giữ nguyên nó ở đây sẽ để một lỗ PII mở lâu hơn cần thiết. Quyết định này ghi rõ để không ai đọc thành `F-06` bị rơi |
| `DEC-08` | Assertion phủ định của `F-06` khẳng định trên NGUỒN của trang tra cứu: không xuất hiện `result.phone` ngoài dạng `result.phoneMasked`, và không xuất hiện `result.cccdNumber` dưới mọi dạng. Hai literal khẳng định ở `:353` và `:354` giữ nguyên | Phủ định trên khoá THÔ là thứ chặn một dòng thêm vào bên cạnh. Xoá hai literal khẳng định sẽ mất phần bảo vệ hiện có, nên cộng chứ không thay |
| `DEC-09` | Nhánh `404` của route tracking nhận CÙNG khoá `headers` với nhánh `200`, không nhận thêm header nào khác, và thân response `404` không đổi một byte | `DEC-18` của contract 07 chỉ nói về cache. Thêm bất cứ gì khác vào thân `404` là mở lại kênh báo tồn tại của bản ghi, đúng thứ route này được viết ra để đóng |
| `DEC-10` | Hàng rào giữ PII là một tệp THỨ BA, mới: `src/domains/applications/tracking-pii-containment.static.test.ts`. Nó **không** nhập vào `marketplace-inventory.static.test.ts` | Hai bất biến khác nhau: tệp inventory canh những gì trang IN RA, tệp mới canh những gì service ĐỌC RA. Tách ra còn để contract 19 sau này mở rộng đúng một tệp khi phép che chuyển xuống SQL, không phải sửa một tệp dùng chung |
| `DEC-11` | Bất biến của hàng rào mới gồm ba mệnh đề, cả ba đếm được: một, tập tệp không phải test tham chiếu `hrp_public_tracking_profile` có đúng `1` phần tử; hai, trong tệp đó `row.phone` xuất hiện đúng `1` lần và nằm trong `maskPhone(`, `row.cccd_number` xuất hiện đúng `1` lần và nằm trong `maskCccd(`; ba, thân `PublicTrackingDto` không có khoá nào khớp `phone` hay `cccd` ngoài `phoneMasked` và `cccdMasked` | Ba mệnh đề đếm được thì không cần biết trước hình dạng mã, và cả ba đỏ ngay khi ai đó thêm một đường đọc thô. Mệnh đề ba chặn đúng lớp mà `tsc` mù, vì consumer của repo này tự khai interface cục bộ rồi cast |
| `DEC-12` | Assertion phủ định của hàng rào mới neo vào `row.phone` và `row.cccd_number`, KHÔNG neo vào chuỗi `phone` hay `normalizedPhone` trần | `EV-14`: `normalizedPhone` tồn tại thật ở đường nộp hồ sơ trong cùng tệp. Một assertion rộng sẽ ĐỎ trên mã đúng, và đó là cách nhanh nhất để một hàng rào bị ai đó tắt đi |
| `DEC-13` | Hàng rào mới mang một FIXTURE ÂM: một chuỗi nguồn giả trong đó `row.phone` được dùng TRẦN không qua `maskPhone`, và test khẳng định detector BẮT được nó | Không có fixture âm thì một detector luôn trả rỗng cũng xanh. Đây là cùng một bài học với `TEXT_PAIRS` của `go-live-08` |

## 4. Contract

### 4.1 Requirements

| ID | Yêu cầu | Mức | Nguồn | Dấu hiệu FAIL |
|---|---|---|---|---|
| `RQ-01` | Trong `src/shared/security/rate-limit-guard.ts`, tách một điểm vào chỉ-trả-quyết-định theo `DEC-01`. `enforceRateLimits` giữ nguyên tên, nguyên chữ ký, nguyên hành vi và gọi vào điểm vào mới | Must | `DEC-01`, `EV-04` | Chữ ký của `enforceRateLimits` đổi; hoặc logic canonicalize, HMAC, fail-closed hay log bị nhân bản thành hai bản; hoặc bốn tệp route ở `EV-04` phải sửa |
| `RQ-02` | `app/(jobs)/viec-lam/[slug]/page.tsx` gọi điểm vào mới với rule `JOB_BROWSE` và IP lấy bằng `clientIpFromHeaders`, TRƯỚC mọi lệnh gọi `withPublicDb` | Must | `DEC-02`, `EV-01`, `EV-03` | Limiter được gọi sau truy vấn; hoặc dùng một rule khác `JOB_BROWSE`; hoặc thêm một rule mới vào `RATE_LIMIT_RULES` |
| `RQ-03` | Khi bị từ chối, trang `return` một khối thông báo và KHÔNG gọi `withPublicDb`, KHÔNG gọi `getPublicJobDetail`. Khối thông báo không in slug, không in IP, không in bất kỳ giá trị nào của request | Must | `DEC-02`, `DEC-03` | Truy vấn vẫn chạy rồi mới kiểm; hoặc thông báo in lại giá trị request; hoặc nhánh từ chối gọi `notFound()`, thứ nói sai sự thật rằng việc không tồn tại |
| `RQ-04` | Giới hạn của `DEC-03` — trang trả `200` khi bị từ chối vì Server Component không đặt được status — ghi nguyên văn vào `HANDOFF.md` như một giới hạn CÓ TÊN | Must | `DEC-03` | `HANDOFF` không có dòng nào nói về status code; hoặc `HANDOFF` khẳng định trang trả `429` |
| `RQ-05` | Tạo `src/shared/security/public-surface-limiter.static.test.ts`. Nó tự suy tập consumer của `withPublicDb` theo `DEC-05`, khẳng định tập đó có đúng `3` phần tử sau khi bỏ tệp định nghĩa, và khẳng định MỖI phần tử tham chiếu limiter | Must | `DEC-05`, `EV-02` | Danh sách ba tệp bị ghim cứng thành mảng literal; hoặc chỉ khẳng định trên một tệp; hoặc phép quét bỏ `app/` |
| `RQ-06` | Cùng hàng rào mang fixture ÂM theo `DEC-06` | Must | `DEC-06` | Không có fixture âm |
| `RQ-07` | `app/api/public/applications/[trackingCode]/route.ts` nhánh `404` nhận `Cache-Control: no-store`, giống nhánh `200`. Thân response `404` không đổi | Must | `DEC-09`, `EV-07` | Nhánh `404` vẫn thiếu header; hoặc thân `404` nhận thêm khoá; hoặc nhánh `200` bị đổi |
| `RQ-08` | Thêm hai assertion PHỦ ĐỊNH vào `src/domains/applications/marketplace-inventory.static.test.ts` theo `DEC-08`. Hai assertion khẳng định ở `:353` và `:354` giữ nguyên | Must | `DEC-08`, `EV-08` | Không có assertion phủ định; hoặc hai literal cũ bị xoá hay bị sửa; hoặc assertion phủ định viết rộng tới mức bắt luôn `phoneMasked` và làm lane đỏ |
| `RQ-09` | Không đổi `keywordHaystack`, `searchableTextOf`, `classifyJobType`, `order.description`, và không đổi giá trị nào trong `RATE_LIMIT_RULES` | Must | `EV-09`, `EV-10`, `DEC-02` | Bất kỳ dòng nào trong bốn thứ đó đổi; hoặc một rule đổi `limit` hay `windowSec` |
| `RQ-10` | `npm run test:unit` và `npm run typecheck` đều exit `0`. Số test PASS không nhỏ hơn mốc mà `STEP-01` ghi | Must | `EV-04` | Một lane exit khác `0`; hoặc số test PASS tụt mà `HANDOFF` không phân loại từng dòng đỏ thành hồi quy hay test cũ chưa đảo |
| `RQ-11` | Tạo `src/domains/applications/tracking-pii-containment.static.test.ts` thoả cả ba mệnh đề của `DEC-11`. Tập tệp tham chiếu hàm phải do mã TỰ SUY bằng cách quét `src/` và `app/`, không ghim cứng | Must | `DEC-10`, `DEC-11`, `EV-11`, `EV-12`, `EV-13` | Thiếu một trong ba mệnh đề; hoặc đường dẫn service bị ghim thành một hằng rồi so với chính nó; hoặc phép quét bỏ `app/`; hoặc assertion nhập vào `marketplace-inventory.static.test.ts` thay vì tệp mới |
| `RQ-12` | Cùng hàng rào neo assertion phủ định vào `row.phone` và `row.cccd_number` theo `DEC-12`, và mang fixture ÂM theo `DEC-13` | Must | `DEC-12`, `DEC-13`, `EV-14` | Assertion neo vào chuỗi `phone` trần nên đỏ trên mã đúng; hoặc không có fixture âm |

### 4.2 Scope boundaries

Được chạm, và chỉ ba nhóm sau:

1. Bốn tệp mã liệt kê ở `Modules` không phải tệp hàng rào mới.
2. Hai tệp hàng rào mới: `src/shared/security/public-surface-limiter.static.test.ts` và `src/domains/applications/tracking-pii-containment.static.test.ts`.
3. Artifact của chính task: `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/HANDOFF.md` cộng mọi tệp dưới `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/evidence/`.

Cấm chạm: `middleware.ts`, `src/shared/security/rate-limit-port.ts`, `src/shared/security/rate-limit-identity.ts`, `src/shared/security/rate-limit-provider.ts`, `src/domains/applications/application.service.ts`, `src/shared/privacy/mask.ts`, bốn tệp route ở `EV-04` trừ đúng tệp tracking, `src/domains/job-board/public.service.ts`, `prisma/`, `app/globals.css`, `package.json`, mọi cấu hình vitest. Xuất hiện một nhóm thứ tư là FAIL.

### 4.3 Data, State, Permission và Interface Rules

- **Không nới ngân sách.** Năm rule trong `RATE_LIMIT_RULES` giữ nguyên `limit` và `windowSec`. Trang chi tiết KHÔNG được cấp rule riêng: nó dùng chung `JOB_BROWSE` với API danh sách.
- **Fail-closed giữ nguyên.** Khi limiter không khả dụng, trang chi tiết phải xử như bốn route đang xử: KHÔNG chạm DB. Mở cửa khi limiter chết là biến một sự cố hạ tầng thành một cửa quét không giới hạn.
- **Không identifier ra khỏi tiến trình.** Trang không log IP, không log slug kèm IP, không log giá trị bucket. Nếu cần log thì chỉ route class tĩnh cộng outcome, đúng như limiter đang làm.
- **Không đổi hình dạng response công khai.** Thân `404` của tracking không nhận khoá mới. Thân `200` không đổi.
- **Không migration, không seed, không lệnh DDL, không kết nối DB.** Mọi phép đo của task này là tĩnh hoặc chạy trong process.
- **Bí mật:** không in connection string, token, password, PII thật vào log hay artifact. Không dùng mã tra cứu THẬT để thử nghiệm, theo đúng lệnh cấm của task 13.

## 5. Execution Plan

| ID | Việc | Ra cái gì |
|---|---|---|
| `STEP-01` | Chạy `pwsh -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-18-public-surface-hardening/TASK.md`, rồi `npm run test:unit` và `npm run typecheck` trên cây CHƯA sửa | Ba output kèm mã thoát ở đầu `HANDOFF.md`. Mốc số tệp test và số test PASS |
| `STEP-02` | Đo lại `EV-02` bằng `grep -rl withPublicDb` trên `src` và `app` bỏ tệp test, và đo lại `EV-04` bằng `grep -rn enforceRateLimits` trên `src` và `app` | Hai danh sách thật. Lệch với `4` tệp và `5` vị trí thì ghi thành finding, không im lặng |
| `STEP-03` | Tách điểm vào chỉ-trả-quyết-định trong `src/shared/security/rate-limit-guard.ts` theo `RQ-01` | Diff của đúng một tệp. `enforceRateLimits` nguyên chữ ký |
| `STEP-04` | Chạy `npm run test:unit` ngay sau `STEP-03`, trước khi sửa trang | Output kèm mã thoát. Đây là phép thử hồi quy cho bản refactor: mọi test của bốn route phải còn xanh mà không sửa một tệp route nào |
| `STEP-05` | Sửa `app/(jobs)/viec-lam/[slug]/page.tsx` theo `RQ-02` và `RQ-03` | Diff của đúng một tệp. Lệnh gọi limiter đứng TRƯỚC `withPublicDb`, nhánh từ chối `return` sớm |
| `STEP-06` | Sửa nhánh `404` của `app/api/public/applications/[trackingCode]/route.ts` theo `RQ-07` | Diff một dòng, cộng output `git diff --cached --numstat` trên đúng tệp đó |
| `STEP-07` | Viết `src/shared/security/public-surface-limiter.static.test.ts` theo `RQ-05` và `RQ-06`, rồi chạy `npx vitest run --config vitest.unit.config.ts src/shared/security/public-surface-limiter.static.test.ts` | Tệp hàng rào cộng output kèm mã thoát. Hàng rào phải XANH sau `STEP-05`, và phải ĐỎ nếu chạy trên cây trước `STEP-05` — Tier 2 chứng minh điều thứ hai bằng cách chạy hàng rào một lần trên bản `git stash` hoặc trên nội dung baseline của trang |
| `STEP-08` | Thêm hai assertion phủ định vào `src/domains/applications/marketplace-inventory.static.test.ts` theo `RQ-08`, rồi chạy `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-inventory.static.test.ts` | Diff cộng output kèm mã thoát |
| `STEP-09` | Kiểm `RQ-09`: `git status --porcelain src/domains/job-board/public.service.ts src/shared/security/rate-limit-port.ts middleware.ts` | Output RỖNG cho cả ba đường dẫn |
| `STEP-11` | Đo lại `EV-11` tới `EV-14` bằng `grep -rn hrp_public_tracking_profile` trên `src` và `app` bỏ test, cộng `grep -c "row.phone"` và `grep -c "row.cccd_number"` trên `src/domains/applications/application.service.ts`, cộng đọc thân `PublicTrackingDto` | Bốn con số thật: `1` tệp, `1` lần `row.phone`, `1` lần `row.cccd_number`, `11` khoá DTO không có khoá thô. Lệch thì ghi thành finding, không im lặng |
| `STEP-12` | Viết `src/domains/applications/tracking-pii-containment.static.test.ts` theo `RQ-11` và `RQ-12`, rồi chạy `npx vitest run --config vitest.unit.config.ts src/domains/applications/tracking-pii-containment.static.test.ts` | Tệp hàng rào mới cộng output kèm mã thoát. Hàng rào XANH trên cây hiện tại, và fixture âm chứng minh nó bắt được vi phạm |
| `STEP-10` | Chạy lại `npm run test:unit` và `npm run typecheck`, so số test PASS với mốc của `STEP-01`. Kiểm phạm vi bằng `git status --porcelain` cộng `git diff --cached --numstat`. Ghi `HANDOFF.md` cộng `evidence/`, trong đó có dòng giới hạn CÓ TÊN của `RQ-04`, rồi `git add` NGAY. **KHÔNG commit, KHÔNG push, KHÔNG deploy** | Hai output kèm mã thoát, danh sách path đầy đủ phân đúng ba nhóm của `4.2`, và `HANDOFF.md` với mọi lệnh, mã thoát, output thật |

## 6. Acceptance Criteria

| ID | Cách kiểm | Ngưỡng đạt |
|---|---|---|
| `AC-01` | Đọc `src/shared/security/rate-limit-guard.ts` cộng `git diff --cached -- src/shared/security/rate-limit-guard.ts` | Có một điểm vào mới trả quyết định chứ không trả `NextResponse`. `enforceRateLimits` còn nguyên tên và nguyên danh sách tham số. Logic canonicalize, HMAC, fail-closed và log tồn tại ĐÚNG một bản trong tệp |
| `AC-02` | `git status --porcelain app/api/jobs/route.ts app/api/jobs/[slug]/route.ts app/api/public/jobs/[slug]/applications/route.ts` | Output RỖNG. Ba route đó không đổi một byte, tức bản refactor của `AC-01` tương thích ngược |
| `AC-03` | Đọc output của `STEP-04` | Lane exit `0` ngay sau bước refactor, TRƯỚC khi trang được sửa. Đây là chân đo độc lập của tính tương thích ngược |
| `AC-04` | Đọc `app/(jobs)/viec-lam/[slug]/page.tsx` và so THỨ TỰ dòng: vị trí gọi limiter phải có số dòng NHỎ HƠN mọi vị trí gọi `withPublicDb` và `getPublicJobDetail` trong cùng hàm | Limiter đứng trước. Nhánh từ chối có một `return` riêng, và giữa `return` đó với đầu hàm không có lệnh gọi `withPublicDb` nào |
| `AC-05` | `grep -n "JOB_BROWSE" app/(jobs)/viec-lam/[slug]/page.tsx` cộng `git status --porcelain src/shared/security/rate-limit-port.ts` | Trang dùng đúng `JOB_BROWSE`. `rate-limit-port.ts` không đổi một byte, tức không rule mới nào được thêm và không ngân sách nào bị nới |
| `AC-06` | Đọc nhánh từ chối trong trang | Không in slug, không in IP, không in giá trị nào của request. Không gọi `notFound()` ở nhánh từ chối |
| `AC-07` | Đọc `HANDOFF.md` mục giới hạn | Có một dòng ghi rõ trang trả `200` khi bị từ chối vì Server Component của Next không đặt được status, và điều được bảo đảm là ZERO truy vấn DB. Không có dòng nào khẳng định trang trả `429` |
| `AC-08` | `ls src/shared/security/public-surface-limiter.static.test.ts` cộng `npx vitest run --config vitest.unit.config.ts src/shared/security/public-surface-limiter.static.test.ts` | Tệp tồn tại, lane con exit `0` |
| `AC-09` | Đọc mã hàng rào cộng `grep -c "viec-lam" src/shared/security/public-surface-limiter.static.test.ts` | Tập consumer do mã TỰ SUY bằng cách quét cây, không phải một mảng literal. Đường dẫn trang chi tiết xuất hiện nhiều nhất `1` lần và nếu có thì chỉ trong comment hoặc trong fixture âm. Phép quét phủ cả `src/` và `app/` |
| `AC-10` | Đọc mã hàng rào tìm fixture âm, cộng đọc bằng chứng của `STEP-07` về lần chạy trên nội dung baseline | Có ít nhất một `it(` chạy detector trên chuỗi nguồn giả có `withPublicDb` mà không có limiter, và khẳng định detector BẮT được nó. Bằng chứng cho thấy hàng rào ĐỎ trên nội dung trang trước bản sửa |
| `AC-11` | `git diff --cached -- app/api/public/applications/[trackingCode]/route.ts` cộng `git diff --cached --numstat -- app/api/public/applications/[trackingCode]/route.ts` | Nhánh `404` có `Cache-Control: no-store`. Diff không thêm khoá nào vào thân `404`, không sửa nhánh `200`, và tổng số dòng đổi không vượt `4` |
| `AC-12` | `git diff --cached -- src/domains/applications/marketplace-inventory.static.test.ts` cộng output của `STEP-08` | Có ít nhất hai assertion phủ định mới theo `DEC-08`. Hai dòng `:353` và `:354` còn nguyên trong bản mới. Lane con exit `0`, tức assertion phủ định không viết rộng tới mức bắt luôn khoá đã che |
| `AC-13` | `git status --porcelain src/domains/job-board/public.service.ts middleware.ts src/shared/security/rate-limit-identity.ts` cộng `git diff --cached --name-only -- prisma/` | Cả bốn RỖNG. Một dòng thuộc `public.service.ts`, `middleware.ts` hay `prisma/` là FAIL toàn task |
| `AC-14` | `npm run test:unit` rồi `npm run typecheck`, lấy mã thoát bằng redirect chứ không sau ống | Cả hai exit `0`. Số test PASS không nhỏ hơn mốc của `STEP-01`. Mọi dòng đỏ, nếu có, được phân loại từng dòng thành hồi quy hay test cũ chưa đảo |
| `AC-15` | `git status --porcelain` cộng `git diff --cached --name-only`, hợp hai danh sách rồi phân nhóm | Mọi path thuộc đúng một trong ba nhóm của `4.2`: bốn tệp mã ở `Modules`, hai tệp hàng rào mới, và `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/**`. Xuất hiện nhóm thứ tư là FAIL. Không có commit mới nào so với baseline |
| `AC-16` | `ls src/domains/applications/tracking-pii-containment.static.test.ts` cộng `npx vitest run --config vitest.unit.config.ts src/domains/applications/tracking-pii-containment.static.test.ts` | Tệp tồn tại, lane con exit `0` |
| `AC-17` | Đọc mã hàng rào mới, cộng `grep -c "application.service" src/domains/applications/tracking-pii-containment.static.test.ts` | Cả ba mệnh đề của `DEC-11` có mặt: đếm tệp tham chiếu bằng `1`, đếm `row.phone` bằng `1` và bị bọc bởi `maskPhone(`, đếm `row.cccd_number` bằng `1` và bị bọc bởi `maskCccd(`, và thân `PublicTrackingDto` không có khoá thô. Tập tệp do mã TỰ SUY bằng cách quét cây; đường dẫn service xuất hiện dưới dạng literal nhiều nhất `1` lần và chỉ để đối chiếu kết quả quét, không thay cho phép quét. Phép quét phủ cả `src/` và `app/` |
| `AC-18` | Đọc mã hàng rào mới tìm assertion phủ định và fixture âm, cộng output của `STEP-12` | Assertion phủ định neo vào `row.phone` và `row.cccd_number`, KHÔNG neo vào chuỗi `phone` hay `normalizedPhone` trần. Có ít nhất một `it(` chạy detector trên chuỗi nguồn giả dùng `row.phone` TRẦN và khẳng định detector BẮT được nó. Lane con exit `0`, tức assertion không viết rộng tới mức đỏ trên đường nộp hồ sơ |

### 6.1 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-03`, `STEP-04` | `AC-01`, `AC-02`, `AC-03` |
| `RQ-02` | `STEP-05` | `AC-04`, `AC-05` |
| `RQ-03` | `STEP-05` | `AC-04`, `AC-06` |
| `RQ-04` | `STEP-10` | `AC-07` |
| `RQ-05` | `STEP-02`, `STEP-07` | `AC-08`, `AC-09` |
| `RQ-06` | `STEP-07` | `AC-10` |
| `RQ-07` | `STEP-06` | `AC-11` |
| `RQ-08` | `STEP-08` | `AC-12` |
| `RQ-09` | `STEP-09` | `AC-05`, `AC-13` |
| `RQ-10` | `STEP-01`, `STEP-10` | `AC-14`, `AC-15` |
| `RQ-11` | `STEP-11`, `STEP-12` | `AC-16`, `AC-17` |
| `RQ-12` | `STEP-12` | `AC-18` |

## 7. Risk và Rollback

| ID | Rủi ro | Xác suất | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | **Bản refactor làm đổi hành vi bốn route đang chạy.** `enforceRateLimits` là điểm vào duy nhất của mọi bề mặt công khai; một thay đổi chữ ký hay một nhánh fail-closed bị đổi làm rò cả bốn route cùng lúc | Cao | `AC-02` đòi ba route không đổi một byte. `AC-03` đòi lane xanh NGAY sau bước refactor, trước khi trang được sửa. `STEP-03` và `STEP-05` là hai bước riêng đúng để có được chân đo đó |
| `RISK-02` | **Limiter được gọi sau truy vấn.** Cách viết tự nhiên nhất trong một Server Component là lấy dữ liệu trước rồi kiểm sau; như vậy DB vẫn bị chạm mỗi lượt và bản sửa thành đồ trang trí | Cao | `AC-04` đo THỨ TỰ SỐ DÒNG, không đọc lời tự thuật. `RQ-03` đòi một `return` riêng ở nhánh từ chối |
| `RISK-03` | **`200` bị đọc thành limiter không chạy.** Một round sau, hoặc chính contract 07, thử trang này và thấy `200` rồi kết luận không có limiter | Trung bình | `DEC-03` và `AC-07` buộc ghi giới hạn thành một dòng CÓ TÊN trong `HANDOFF`. `Q-01` giữ cửa mã `429` mở cho sau này |
| `RISK-04` | **Hàng rào ghim danh sách tay.** Cách nhanh nhất làm `AC-08` xanh là dán ba đường dẫn vào một mảng rồi so với chính nó, và bề mặt thứ tư trong tương lai vẫn vô hình | Cao | `AC-09` đếm số lần đường dẫn xuất hiện dưới dạng literal. `AC-10` đòi fixture âm cộng một lần chạy ĐỎ trên nội dung baseline — một detector giả không vượt được cả hai |
| `RISK-05` | **Assertion phủ định viết quá rộng.** Một regex bắt `phone` sẽ bắt luôn `phoneMasked` và làm lane đỏ ngay trên mã ĐÚNG | Trung bình | `RQ-08` và `AC-12` đòi lane con exit `0` sau khi thêm, tức chính phép chạy là hàng rào cho độ rộng của regex. `DEC-08` viết rõ bất biến: `result.phone` ngoài dạng `result.phoneMasked` |
| `RISK-06` | **Fail-open khi limiter chết.** Server Component dễ bị viết theo lối "lỗi limiter thì cứ render", biến một sự cố Upstash thành cửa quét không giới hạn | Trung bình | `4.3` ghi rõ fail-closed. Nhánh limiter không khả dụng phải xử như bốn route đang xử, và `AC-04` đòi không có đường nào tới `withPublicDb` mà không qua limiter |
| `RISK-07` | **Chạy `npx vitest run` trần.** Lệnh đó đọc `DATABASE_URL` từ `.env`, tức PRODUCTION, và fail oan `24` test component | Trung bình | Mọi lệnh vitest trong `5.` bắt buộc mang `--config vitest.unit.config.ts`. Lane canonical là `npm run test:unit` |
| `RISK-08` | **Tier 2 đi sửa `Q-01` cũ.** Hàng đợi cũ có một dòng nói probe tìm kiếm phơi `description`; ai đọc hàng đợi mà không đọc `EV-09` sẽ đi cắt `order.description` và đổi nhãn `jobType` của bản ghi đang in đúng | Trung bình | `EV-09`, `EV-10` và `RQ-09` nói thẳng điều đó là SAI và cấm chạm. `AC-13` đo `public.service.ts` không đổi một byte |
| `RISK-09` | **Hàng rào PII viết quá rộng.** Cách tự nhiên nhất để chặn khoá thô là một regex trên chuỗi `phone`, và nó sẽ bắt luôn `normalizedPhone` ở đường nộp hồ sơ cùng `phoneMasked` ở DTO, tức ĐỎ trên mã đúng. Người tiếp theo sẽ tắt hàng rào thay vì sửa nó | Cao | `EV-14` gọi tên trước ba chuỗi dễ bắt oan. `DEC-12` buộc neo vào `row.phone` và `row.cccd_number`. `AC-18` đòi lane con exit `0`, tức chính phép chạy là hàng rào cho độ rộng của assertion |
| `RISK-10` | **Hàng rào PII ghim đường dẫn service rồi so với chính nó.** Khi đó `AC-16` xanh mà bất biến rỗng, và một tệp thứ hai đọc hàm tra cứu trong tương lai vẫn vô hình — đúng điểm mù của `TEXT_PAIRS` ở `go-live-08` | Cao | `AC-17` đếm số lần đường dẫn xuất hiện dưới dạng literal và đòi phép quét thật phủ cả `src/` và `app/`. `AC-18` đòi fixture âm, thứ một detector giả không vượt được |
| `RISK-11` | **`R-02` của task 13 bị đọc thành đã đóng.** Task này chỉ làm phương án `Q-03`; việc che ở tầng SQL vẫn còn nợ | Trung bình | `EV-15` ghi rõ quyết định của Owner và ghi rõ `R-02` vẫn mở ở contract 19. `Q-04` của task này giữ con nợ đó nhìn thấy được |

Rollback: bản giao gồm bốn tệp mã cộng một tệp test mới. Không migration, không đổi schema, không đổi cấu hình, không đổi biến môi trường. Hoàn tác bằng `git restore` trên đúng tập path ở `AC-15`, hoặc `git rm` tệp hàng rào nếu chưa commit. Không có trạng thái DB hay trạng thái Upstash nào cần hoàn: limiter chỉ ĐỌC ngân sách theo IP, và mọi bucket tự hết hạn sau `60` giây.

## 8. Open Questions

| ID | Câu hỏi | Ảnh hưởng | Ai trả lời |
|---|---|---|---|
| `Q-01` | Có nên nâng nhánh từ chối của trang chi tiết lên mã `429` thật? Cửa duy nhất là middleware chạy Node runtime, thứ Next `15.1` chưa có ổn định (`EV-05`) | Không chặn thi hành. `DEC-03` đã ghi giới hạn thành một dòng có tên, và điều quan trọng — zero truy vấn DB — đã đạt | Tier 1, khi repo nâng Next lên bản có middleware Node runtime |
| `Q-02` | Limiter `Map` trong bộ nhớ ở `middleware.ts:31` cho đường `/worker` vẫn là limiter theo instance, đúng khuyết điểm mà `ops-06a` đã thay cho bề mặt công khai. Có chuyển nó sang limiter phân tán không? | Không chặn thi hành và KHÔNG thuộc task này: `/worker` là bề mặt sau đăng nhập, không phải bề mặt ẩn danh. Ghi thành dư nợ | Tier 1, ở một contract hardening nội bộ sau ra mắt |
| `Q-03` | Kênh còn lại của `order.description` là một nhãn enum ba giá trị (`EV-10`). Có cắt hẳn không? | Không chặn. `EV-10` giải thích vì sao cắt là có hại: nó đổi nhãn của bản ghi đang in đúng, đúng lớp lỗi `go-live-14`. Đây là dư nợ ĐƯỢC CHẤP NHẬN, ghi ra để không ai mở lại bằng phản xạ | Tier 1, chỉ nếu về sau có yêu cầu privacy đòi cắt |
| `Q-04` | Việc che PII ngay trong `hrp_public_tracking_profile` vẫn còn nợ. Task này chỉ dựng hàng rào ở tầng Node theo quyết định `03/09` của Owner (`EV-15`) | Không chặn task này. Con nợ nằm ở `hrp-v5-go-live-19-tracking-pii-db-mask`, giữ `DRAFT`, và điều kiện thi hành là `DATABASE_URL_TEST` phải tồn tại trước để phép chứng minh tương đương chạy được trên Postgres thật | Owner, cùng lúc quyết credential cho lane integration |

## 9. Planner Resolution

Chưa có. Task chưa được thi hành.

## 10. Revision Log

| Version | Ngày | Đổi gì |
|---|---|---|
| `v1.0` | 2026-09-03 | Bản đầu. Gộp ba món đã đo: limiter cho trang chi tiết SSR (`EV-01`, `EV-02`), `no-store` cho nhánh `404` của tracking tức `DEC-18` của contract 07 (`EV-07`), và `F-06` của task 13 chuyển sang đây kèm lý do ở `DEC-07` (`EV-08`). Bác bỏ `Q-01` cũ của hàng đợi bằng `EV-09` và `EV-10`: `go-live-05` đã loại `order.description` khỏi chuỗi khớp `q` và có comment giải thích tại chỗ, nên không có gì để sửa. Đóng cửa phương án middleware bằng một dữ kiện cơ học ở `EV-05` |
| `v1.1` | 2026-09-03 | **Cộng món thứ tư theo quyết định `03/09` của Owner** (`EV-15`): phương án `Q-03` của contract 19 — giữ phép che ở Node cộng một hàng rào tĩnh giữ PII — vào task này, thay cho việc che ở tầng SQL ngay lượt này. Thêm `EV-11` tới `EV-15`, `DEC-10` tới `DEC-13`, `RQ-11` và `RQ-12`, `STEP-11` và `STEP-12`, `AC-16` tới `AC-18`, `RISK-09` tới `RISK-11`, và `Q-04`. Thêm một tệp hàng rào mới vào `Modules` và vào nhóm hai của `§4.2`, cộng `application.service.ts` và `mask.ts` vào cột Cấm chạm vì hàng rào ĐỌC chúng chứ không sửa. KHÔNG đổi phạm vi của mười yêu cầu cũ. Cửa sổ bump còn mở vì cả hai round đếm bằng `0` |
