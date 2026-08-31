# TASK: hrp-v5-go-live-09-public-board-architecture

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-09-public-board-architecture` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `d4928af` cộng hai task phải đóng trước: `hrp-v5-hotfix-01-public-jobs-500` và `hrp-v5-go-live-08-public-ui-premium` |
| Modules | `M13 Marketplace public surface` |
| ADR references | `G27 Warm Professionalism (15/08)`; kế thừa nguyên khối phần quyết định của contract `hrp-v5-go-live-08-public-ui-premium` về token, vòng focus, ngưỡng chạm, guard giảm chuyển động, và bảng màu bị từ chối |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `verify-task → /code → /audit → /resolve → ACCEPTED` |
| Updated | `2026-08-31 13:05 +07` |

## 1. Outcome

### User-visible outcome

Trang `/` thôi là một danh sách dài phẳng. Nó có: một Hero với tiêu đề lớn và thanh tìm kiếm ba ô ngay đầu trang; một card việc làm nổi bật bên phải Hero; card việc làm có khung logo bên trái, **mức lương in đậm nổi bật**, và badge "Tuyển gấp" dạng pill; các dải nội dung theo trục có thật (mới nhất, lương cao nhất, theo khu vực, theo ngành nghề); và một dải số liệu tin cậy.

Mọi con số và mọi nhãn trên các thành phần mới đều truy được về một field thật trong DB hoặc một phép đếm chạy trên chính projection đang render. Task này KHÔNG thêm một con số trang trí nào.

Bảng màu G27 giữ nguyên. Không một giá trị màu lạnh nào của site tham khảo được đưa vào.

### Non-goals

- Không thêm cột, không migration, không đổi RLS, không cấp quyền cho principal công khai.
- Không hiển thị tên hoặc logo của công ty khách hàng. Bảng `client_companies` không đọc được dưới principal `MKT` và danh tính khách là thông tin thương mại.
- Không quy đổi lương giờ thành lương tháng khi chưa có căn cứ giờ do Owner công bố.
- Không tạo trường phúc lợi có cấu trúc, và không in phúc lợi bằng văn bản bịa.
- Không làm lại phần 08 đã làm: token, vòng focus, ngưỡng chạm, guard giảm chuyển động, bóng và hover của card. Task này **kế thừa** và phải tuân thủ, không được viết lại theo cách riêng.
- Không đổi chế độ tối, không đổi navbar, không đổi trang tra cứu, không đổi luồng ứng tuyển.
- Không tự commit, không tự push, không tự deploy.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:3-16` | `PublicJobDto` gồm `id, slug, title, position, shift, location, industry, shiftType, jobType, availableSlots, deadline, statusLabel`. **Không có lương, không có tên đơn vị, không có logo, không có cờ khẩn** | Ba trong bốn nhóm yêu cầu của Owner cần field mới ở tầng projection, không phải chỉ ở tầng UI |
| `EV-02` | `prisma/schema.prisma` model `StaffingOrderSlot:406` | `hourlyRateVnd BigInt? @map("hourly_rate_vnd")` | Lương CÓ nguồn thật, ở mức slot, nullable |
| `EV-03` | `app/admin/staffing/page.tsx:222` | Nhãn form admin là `Lương giờ (VND)`, placeholder `35000` | Con số này là **lương giờ trả cho người lao động**, đúng thứ một sàn việc làm phải hiện |
| `EV-04` | `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql:144-147` | Giá phía khách hàng nằm ở bảng riêng `client_rate_cards`, được ghi chú là "client-side finance rates", reader duy nhất là `statement.service.ts` | Đóng lo ngại "công bố lương giờ là lộ giá bán". Hai con số ở hai bảng khác nhau; công bố `hourlyRateVnd` không lộ margin |
| `EV-05` | `scratch/seed-hrp-live-demo.sql:50-57` | Hai slot DEMO trên `hrp-live` có `hourly_rate_vnd` = `30000` và `28000` | Có dữ liệu thật để đo AC ngay, không phải chờ dữ liệu mới |
| `EV-06` | `grep -c hourlyRateVnd prisma/seed.mjs` = `0` | Seed dev KHÔNG đặt lương giờ | Nhánh `null` là nhánh thường gặp ở môi trường dev ⇒ empty state phải là thiết kế bậc một, không phải trường hợp biên |
| `EV-07` | `src/domains/job-board/public.service.ts:137-155` | `publicSelect` KHÔNG chọn `hourlyRateVnd` và KHÔNG chọn `createdAt` của order | Cần mở rộng select tối thiểu; đây là thay đổi service, không phải UI |
| `EV-08` | `src/domains/job-board/public.service.ts:24` và `:133` | `VISIBLE_ORDER_STATUSES = ['OPEN','CLOSING_SOON']`; `order.status` ĐƯỢC select nhưng bị bỏ, `statusLabel` là hằng `'Đang tuyển'` | Tín hiệu khẩn THẬT đang bị vứt đi. Badge "Tuyển gấp" hiện dựa trên ngưỡng `availableSlots` nhỏ hơn hoặc bằng 5, một suy diễn không phải trạng thái |
| `EV-09` | `app/(portal)/page.tsx:59-82` | `company: 'HRP Partners'` hardcode; `isUrgent` được tính bằng cách so `availableSlots` với ngưỡng 5 | Nhãn đơn vị là hằng; cờ khẩn là suy diễn. Cả hai phải nối về nguồn thật hoặc bỏ |
| `EV-10` | `prisma/schema.prisma` model `ClientCompany` | Các cột: `id, code, name, taxCode, industry, companySize, status, createdAt`. **Không có cột logo** | "Grid logo công ty" không có nguồn. Khung logo vẫn làm được với icon mặc định |
| `EV-11` | `prisma/migrations/20260827160000_m1_07b_...:56` và `:133-135` | `client_companies` bật `ENABLE` cộng `FORCE` RLS; policy SELECT duy nhất loại `MKT` ra khỏi tập role đọc được | Bề mặt công khai **không thể** đọc bảng khách hàng. "Top công ty hàng đầu" bị chặn ở tầng DB, không chỉ ở tầng chính sách. Chính deref bảng này là nguyên nhân sự cố 500 ngày 31/08 |
| `EV-12` | `prisma/schema.prisma` model `StaffingOrder` và `StaffingOrderSlot` | Không có field phúc lợi, phụ cấp, đưa rước hay chỗ ở. Chỗ duy nhất chứa được là `description String?` dạng văn bản tự do | Danh sách phúc lợi trên card nổi bật không có nguồn có cấu trúc ⇒ chip trên card đó chỉ được lấy từ field thật |
| `EV-13` | `src/domains/job-board/public.service.ts:189-204` | `listPublicJobProjection` đã lọc theo `q`, `area`, `industry`, `shift`, `shiftTypes`, `jobTypes`, phân trang bằng `offset`/`limit`, `orderBy createdAt desc` | Hero search và các dải nội dung phải dùng lại đúng bộ lọc này. Tạo state lọc thứ hai song song là lỗi kiến trúc |
| `EV-14` | `app/(portal)/page.tsx:86-94` | `LOCATIONS`, `INDUSTRIES`, `WORK_TYPES`, `JOB_TYPES` là mảng hằng tĩnh | Tag khu vực kèm số lượng KHÔNG được đếm từ mảng hằng; phải đếm trên projection thật |
| `EV-15` | `docs/tasks/hrp-v5-go-live-08-public-ui-premium/TASK.md`, toàn bộ 23 requirement của contract đó | 08 đã chốt: ba nhóm token mới, bóng card bằng token, hover ba hiệu ứng dưới 250ms, vòng focus mọi control, ngưỡng chạm 44x44px cách nhau 8px, skip link, guard giảm chuyển động, container thẳng mép navbar, icon trang trí bị ẩn khỏi trợ năng, nhãn nhìn thấy cho ô từ khóa | Task 09 kế thừa nguyên khối. Phần tử MỚI của 09 phải đạt cùng ngưỡng, đo bằng cùng phương pháp |
| `EV-16` | Cùng file, mục scope boundary của contract 08 | 08 bị cấm chạm hàm làm giàu dữ liệu, fetch, state bộ lọc, nhãn đơn vị và bốn mảng filter | Trục dữ liệu được để dành đúng cho task 09. Không chồng scope nếu chạy đúng thứ tự 08 trước 09 |
| `EV-17` | `app/(portal)/page.tsx:548-558` | Trang fetch `/api/jobs` một lần với tham số bộ lọc, `cache: 'no-store'` | Các dải nội dung phải dẫn xuất từ cùng một lần fetch, không được mở nhiều request song song cho mỗi dải |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | **Lương công bố là lương giờ thật của người lao động**, lấy từ `StaffingOrderSlot.hourlyRateVnd`, in dưới dạng `"[số] đ/giờ"` với dấu phân cách nghìn theo `vi-VN`. Khi một đơn có nhiều slot nhiều mức thì in khoảng `"[min] – [max] đ/giờ"`. Căn cứ: nhãn admin nói đúng nghĩa (`EV-03`) và giá bán cho khách nằm ở bảng khác (`EV-04`) nên công bố con số này không lộ margin | Tier 1, `EV-02`/`EV-03`/`EV-04` | CHOSEN 2026-08-31 |
| `DEC-02` | `CHOSEN` | **KHÔNG in lương tháng.** Yêu cầu của Owner ghi ví dụ `"10 - 15 Triệu / tháng"`, nhưng quy đổi giờ sang tháng cần số giờ mỗi ngày và số ngày mỗi tháng, cả hai không có trong DB. Bịa `26 ngày x 8 giờ` là tạo một con số không truy được về field nào. Nếu Owner công bố căn cứ giờ thì mở task sau, không tự quyết trong task này | Tier 1, `EV-12` | CHOSEN 2026-08-31, mở lại khi `Q-01` được trả lời |
| `DEC-03` | `CHOSEN` | Khi `hourlyRateVnd` là `null` cho mọi slot thì in đúng chữ `"Lương thương lượng"` ở cùng vị trí, cùng cỡ chữ, KHÔNG in `"0 đ"`, KHÔNG ẩn khối lương làm card lệch. Nhánh `null` là nhánh phổ biến ở dev (`EV-06`) nên nó là thiết kế bậc một | Tier 1, `EV-06` | CHOSEN 2026-08-31 |
| `DEC-04` | `CHOSEN` | Badge khẩn chạy bằng **trạng thái thật** `order.status === 'CLOSING_SOON'`, KHÔNG bằng ngưỡng số chỗ trống. Hai mức: `CLOSING_SOON` in `"Sắp hết hạn"`; `CLOSING_SOON` cộng `deadline` còn dưới 7 ngày in `"Tuyển gấp"`. Đơn `OPEN` không có badge khẩn. Lý do: `EV-08` cho thấy tín hiệu thật đang bị vứt đi trong khi UI đi suy diễn từ số chỗ trống — một đơn 200 chỗ vừa mở cũng không phải "gấp", một đơn 3 chỗ mở từ tháng trước cũng không phải "gấp" | Tier 1, `EV-08`/`EV-09` | CHOSEN 2026-08-31 |
| `DEC-05` | `CHOSEN` | Hai mức badge dùng đúng token ấm đã có: mức nhẹ `--color-primary-soft` làm nền cộng `--color-primary-strong` làm chữ; mức gấp `--color-error-container` làm nền cộng `--color-error` làm chữ. KHÔNG thêm một literal màu nào. Yêu cầu của Owner ghi "nền cam nhạt, chữ cam đậm hoặc đỏ" — đúng bằng hai cặp token này, nên không cần token mới | Tier 1, `EV-15` | CHOSEN 2026-08-31 |
| `DEC-06` | `CHOSEN` | **Khung logo có, ảnh logo không.** Mọi card in một khung vuông bo góc viền nhạt chứa icon toà nhà dạng SVG. Không đọc `client_companies` để lấy tên hay logo: bảng không có cột logo (`EV-10`) và principal `MKT` không đọc được một dòng nào (`EV-11`). Đây cũng chính là bảng đã làm sập production hôm 31/08 — task này không được deref nó lần nữa | Tier 1, `EV-10`/`EV-11` | CHOSEN 2026-08-31 |
| `DEC-07` | `CHOSEN` | **Bỏ dải "Top công ty hàng đầu"** khỏi phạm vi và thay bằng dải **"Việc làm theo ngành nghề"** dựng từ `industry` của chính projection. Lý do là chặn ở ba tầng: không có cột logo, `MKT` không đọc được bảng, và công bố danh tính khách hàng là quyết định thương mại của Owner chứ không phải quyết định UI. Grid logo ghi vào `Q-02`, không im lặng bỏ | Tier 1, `EV-10`/`EV-11` | CHOSEN 2026-08-31 |
| `DEC-08` | `CHOSEN` | Nhãn đơn vị trên card giữ nguyên là **HRPartner** với vai trò ghi rõ là **đơn vị tuyển dụng**, không phải "công ty của việc làm này". Đây là sự thật của mô hình outsourcing: HRP tuyển và trả lương, khách hàng là nơi làm việc. Vì vậy `EV-09` không phải dữ liệu bịa, chỉ là nhãn thiếu vai trò | Tier 1, `EV-09` | CHOSEN 2026-08-31 |
| `DEC-09` | `CHOSEN` | Tên các dải nội dung phải nói đúng trục sắp xếp: `"Việc làm mới nhất"` sắp theo `createdAt` giảm dần, `"Lương cao nhất"` sắp theo `hourlyRateVnd` giảm dần và **chỉ gồm** đơn có lương. **KHÔNG dùng chữ "Việc làm tốt nhất"** như yêu cầu gốc, vì không có field chất lượng, không có điểm xếp hạng, không có lượt xem — "tốt nhất" sẽ là một khẳng định không có nguồn | Tier 1, `EV-01` | CHOSEN 2026-08-31 |
| `DEC-10` | `CHOSEN` | Tag khu vực và tag ngành nghề in số lượng đếm trên **chính mảng projection đang render**, không đếm trên mảng hằng `LOCATIONS`/`INDUSTRIES` (`EV-14`), và không gọi thêm request cho mỗi tag (`EV-17`). Khu vực nào có 0 việc thì KHÔNG in tag, vì tag "Bắc Giang (0)" là mời khách bấm vào một trang trống | Tier 1, `EV-14`/`EV-17` | CHOSEN 2026-08-31 |
| `DEC-11` | `CHOSEN` | Dải số liệu tin cậy chỉ in ba con số **dẫn xuất được từ projection**: số việc làm đang tuyển, số chỗ tuyển còn lại (tổng `availableSlots`), số khu vực đang có việc. **KHÔNG in `"X+ Người lao động"` và `"Y+ Việc làm đã kết nối"`**: bảng `workers` và bảng `client_companies` đều không đọc được dưới `MKT`, và dấu `+` sau một con số không có nguồn là quảng cáo chứ không phải số liệu. Số do Owner công bố kèm ngày chốt ghi vào `Q-03` | Tier 1, `EV-11` | CHOSEN 2026-08-31 |
| `DEC-12` | `CHOSEN` | Ba ô của Hero search là **từ khoá**, **khu vực**, **mức lương tối thiểu**. Ô thứ ba là bộ lọc MỚI ở tầng client trên projection đã tải, KHÔNG thêm tham số truy vấn mới cho `/api/jobs` và KHÔNG sửa `listPublicJobProjection`. Lý do: thêm tham số server là đổi hợp đồng API và cần đo lại phân trang, vượt phạm vi một task UI | Tier 1, `EV-13` | CHOSEN 2026-08-31 |
| `DEC-13` | `CHOSEN` | Hero search phải ghi vào **đúng state bộ lọc đang có** của trang, không tạo state thứ hai. Sau khi bấm tìm, panel bộ lọc bên dưới phải hiện đúng giá trị vừa nhập. Hai nguồn sự thật cho cùng một bộ lọc là lỗi kiến trúc, và nó biểu hiện thành "gõ ở Hero xong kéo xuống thấy ô lọc trống" | Tier 1, `EV-13` | CHOSEN 2026-08-31 |
| `DEC-14` | `CHOSEN` | Card nổi bật bên phải Hero chọn theo quy tắc công bố được: **đơn có lương giờ cao nhất; nếu không đơn nào có lương thì lấy đơn mới nhất**. Chip trên card đó chỉ được lấy từ field thật: ca làm, khu vực, số chỗ trống, hạn nộp. **Không in chip phụ cấp, xe đưa đón, chỗ ở** — `EV-12` cho thấy không có cột nào chứa các thứ đó | Tier 1, `EV-12` | CHOSEN 2026-08-31 |
| `DEC-15` | `ASSUMPTION` | `hotfix-01` và `08` đã ACCEPTED trước khi task này chạy. Cơ sở: 09 sửa cùng file `toDto` mà hotfix đang sửa, và 09 dựng phần tử mới trên đúng bộ token mà 08 tạo. `STEP-01` biến giả định này thành phép đo: thiếu một trong hai thì Tier 2 DỪNG và ghi `BLOCKED`, không tự làm phần việc của task kia | Tier 1, `EV-15`/`EV-16` | ASSUMPTION, hết hiệu lực khi `STEP-01` chạy |
| `DEC-16` | `CHOSEN` | `PublicJobDto` được thêm field, và mọi field thêm đều **nullable hoặc có giá trị mặc định an toàn**, không field nào bắt buộc phải có dữ liệu mới render được. Lý do: sự cố 31/08 xảy ra đúng vì một quan hệ được coi là luôn có mặt. Mọi field mới của task này phải render đúng khi giá trị là `null` | Tier 1, `EV-11` | CHOSEN 2026-08-31 |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `publicSelect` được mở rộng đúng hai chỗ: `slots.select` thêm `hourlyRateVnd`, và `staffingOrders.select` thêm `createdAt`. KHÔNG thêm một quan hệ mới nào, và tuyệt đối không thêm join tới `client_companies` hay bất kỳ bảng nào ngoài nhánh `Project → StaffingOrder → StaffingOrderSlot` đã có. |
| `RQ-02` | `PublicJobDto` thêm bốn field, tên và kiểu chốt cứng: `salaryMinVnd: number \| null`, `salaryMaxVnd: number \| null`, `urgency: 'NONE' \| 'CLOSING' \| 'URGENT'`, `postedAt: string \| null` (ISO). `hourlyRateVnd` là `BigInt` trong Prisma nên phải chuyển sang `number` trước khi ra JSON; trả `BigInt` thẳng sẽ ném `TypeError: Do not know how to serialize a BigInt` lúc `NextResponse.json`. |
| `RQ-03` | `urgency` tính từ trạng thái thật: `'URGENT'` khi `order.status === 'CLOSING_SOON'` và `deadline` cách hiện tại dưới 7 ngày; `'CLOSING'` khi `status === 'CLOSING_SOON'` mà không thoả điều kiện hạn; `'NONE'` trong mọi trường hợp còn lại kể cả khi `deadline` là `null`. Không một nhánh nào của hàm này được đọc `availableSlots`. |
| `RQ-04` | `statusLabel` thôi là hằng: `'Sắp hết hạn'` khi `urgency !== 'NONE'`, `'Đang tuyển'` khi `'NONE'`. Không xoá field `statusLabel` khỏi DTO (UI hiện đang đọc nó). |
| `RQ-05` | Hero Section ở đầu `app/(portal)/page.tsx`, hai nửa trên desktop và một cột trên mobile. Nửa trái: một `h1` là tiêu đề lớn, một dòng phụ, và thanh tìm ba ô cộng một nút `Tìm việc`. Ba ô là từ khoá (input text), khu vực (select), mức lương tối thiểu (select). Mỗi ô có nhãn nhìn thấy được, không dùng placeholder làm nhãn. |
| `RQ-06` | Nút và ba ô của Hero ghi vào **đúng biến state bộ lọc hiện có** của trang; sau khi tìm, panel bộ lọc bên dưới phản chiếu đúng giá trị đó. Không được khai báo một state bộ lọc thứ hai, không được gọi `fetch('/api/jobs')` ở một chỗ mới. |
| `RQ-07` | Ô mức lương tối thiểu lọc ở client trên mảng đã tải theo `salaryMinVnd`; việc làm không có lương KHÔNG bị loại khi ô này để trống, và BỊ loại khi người dùng chọn một mức. Không thêm query param mới vào `/api/jobs`, không sửa `listPublicJobProjection`. |
| `RQ-08` | Nửa phải Hero là một card việc làm nổi bật chọn theo `DEC-14`, có nhãn `Tuyển dụng nổi bật`, và các chip chỉ gồm dữ liệu thật: ca làm, khu vực, số chỗ trống, hạn nộp. Khi projection rỗng thì cả nửa phải không render, và nửa trái vẫn đủ rộng, không để lại ô trắng. |
| `RQ-09` | Card việc làm có khung logo bên trái phần nội dung: hình vuông bo góc, viền nhạt bằng token, cạnh cố định trong khoảng 48px đến 64px, chứa một icon toà nhà SVG có `aria-hidden`. Khung không được co méo trên mobile và không được đẩy tiêu đề xuống dòng riêng ở khổ 375px. |
| `RQ-10` | Khối lương trên card là thành phần nổi bật nhất sau tiêu đề: cỡ chữ lớn hơn chữ thân, `font-weight` từ 600 trở lên, màu bằng token nhấn. Có lương thì in `"[min] đ/giờ"` hoặc `"[min] – [max] đ/giờ"` khi hai số khác nhau, số định dạng `vi-VN`. Không có lương thì in đúng chữ `"Lương thương lượng"` tại cùng vị trí, cùng cỡ. |
| `RQ-11` | Badge khẩn là pill bo tròn hoàn toàn, dùng đúng hai cặp token của `DEC-05`, in `"Tuyển gấp"` khi `urgency === 'URGENT'` và `"Sắp hết hạn"` khi `'CLOSING'`, không render gì khi `'NONE'`. Không được đọc `availableSlots` để quyết định badge này ở bất kỳ file UI nào. |
| `RQ-12` | Dải `"Việc làm mới nhất"` sắp theo `postedAt` giảm dần và dải `"Lương cao nhất"` sắp theo `salaryMaxVnd` giảm dần chỉ gồm việc có lương. Cả hai dẫn xuất từ cùng mảng của một lần fetch. Chuỗi `"tốt nhất"` không xuất hiện trong mã nguồn của trang. |
| `RQ-13` | Dải `"Việc làm theo khu vực"` là các tag card in tên khu vực kèm số việc, đếm trên chính mảng projection. Khu vực có 0 việc không render. Bấm một tag ghi giá trị đó vào state bộ lọc khu vực, và số trên tag phải bằng số card hiện ra sau khi bấm. |
| `RQ-14` | Dải `"Việc làm theo ngành nghề"` dựng cùng cách trên field `industry`, thay cho `"Top công ty hàng đầu"` theo `DEC-07`. Không file nào của task này đọc, select, hay deref `clientCompany`. |
| `RQ-15` | Dải số liệu tin cậy in đúng ba con số của `DEC-11` với nhãn nói rõ nguồn: số việc làm đang tuyển, tổng số chỗ cần tuyển, số khu vực đang có việc. Không dấu `+` sau bất kỳ số nào, không chữ `"Người lao động"`, không chữ `"Doanh nghiệp đồng hành"`. |
| `RQ-16` | Mọi phần tử tương tác MỚI của task này đạt đúng ngưỡng 08 đã chốt: vùng chạm tối thiểu 44x44px và cách nhau tối thiểu 8px, có `:focus-visible` nhìn thấy được, chuyển động dưới 250ms và bị vô hiệu dưới `prefers-reduced-motion: reduce`, icon trang trí có `aria-hidden`, bóng và hover lấy từ token của 08. Không định nghĩa lại token, không viết giá trị bóng hay màu bằng literal. |
| `RQ-17` | Không một literal màu nào (`#rrggbb`, `rgb(`, `hsl(`) được thêm vào các file trong scope; mọi màu đi qua biến token đã có. Không thêm token mới trừ khi 08 đã tạo sẵn. |
| `RQ-18` | Lane unit có test khoá từng bất biến mới, ở mức service: `salaryMinVnd`/`salaryMaxVnd` là `null` khi mọi slot `hourlyRateVnd` là `null`; là `number` khi có; `urgency === 'NONE'` với `status === 'OPEN'` kể cả khi `availableSlots` là 1; `urgency === 'URGENT'` với `CLOSING_SOON` cộng hạn trong 3 ngày; `urgency === 'CLOSING'` với `CLOSING_SOON` mà `deadline` là `null`; và `JSON.stringify(dto)` không ném lỗi (bắt bẫy `BigInt`). Các test này phải FAIL trên mã nguồn baseline trước khi sửa. |
| `RQ-19` | Không SQL, không migration, không đổi RLS, không đổi principal. Diff không chứa `CREATE POLICY`, `GRANT`, `ALTER TABLE`, `set_config`, và không chạm `prisma/schema.prisma` hay `prisma/migrations/`. |
| `RQ-20` | Gate tĩnh sạch với exit code THẬT đo không qua pipe: `npm run typecheck` = 0, `npm run lint` = 0, `npm run test:unit` = 0 với tổng số test không nhỏ hơn con số của baseline. |

### 4.2 Scope boundaries

| Được phép sửa | Cấm chạm |
|---|---|
| `app/(portal)/page.tsx` | `app/(jobs)/track/page.tsx` và mọi thứ thuộc luồng tra cứu |
| `src/domains/job-board/public.service.ts` — `PublicJobDto`, `toDto`, và đúng hai dòng thêm của `publicSelect` theo `RQ-01` | `listPublicJobProjection`, `getPublicJobProjection` (chữ ký, bộ lọc, phân trang, `orderBy`) |
| `app/globals.css` — chỉ khi cần class mới cho phần tử mới; không sửa khối `.pub-*`/`.job-card`/`.filter-panel` từ dòng 140 tới cuối file vì khối đó không được `.tsx` nào dùng | `src/shared/auth/with-public-db.ts`, `rls-context.ts`, `inferIndustry`, `classifyShift`, `classifyJobType` |
| Component mới dưới `app/(portal)/` hoặc `src/domains/job-board/` nếu tách file | `app/api/jobs/route.ts`, `app/api/jobs/[slug]/route.ts` |
| File test thuộc lane unit dưới `src/domains/job-board/` | `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.mjs` |
| — | `vitest.unit.config.ts`, `vitest.config.ts`, `next.config.*`, `tailwind.config.*` |
| — | Mọi file dirty của luồng khác: `public/index.html`, `docs/tasks/hrp-v5-go-live-02-*/AUDIT.md`, `docs/tasks/hrp-v5-go-live-04-*/AUDIT.md`, `.neon`, `rls-probe-*.txt`, `scratch/*`, `scripts/debug-parser.mjs`, `docs/aff_plan*.md` |

### 4.3 Data, State, Permission và Interface Rules

- **Permission:** principal đọc công khai vẫn là `MKT` và chỉ `MKT`. Task này không đổi một bit quyền nào ở tầng app hay tầng DB.
- **Data:** mọi con số hiển thị phải truy được về một field thật hoặc một phép đếm trên projection đang render. `client_companies` vẫn bị che hoàn toàn; không đọc, không select, không deref. Không in tên hay logo khách hàng.
- **State:** một nguồn sự thật duy nhất cho bộ lọc, một lần fetch cho mọi dải nội dung. Không ghi DB, không thêm cookie, không thêm localStorage.
- **Interface:** `GET /api/jobs` giữ nguyên hình dạng `{ jobs, nextOffset, total }` và giữ nguyên tập query param; chỉ mỗi phần tử `jobs[]` được thêm bốn field của `RQ-02`. Field cũ không đổi tên, không đổi kiểu, không bị xoá.
- **Bí mật:** không in connection string, token, password hay PII thật vào log, ảnh chụp hay HANDOFF.

## 5. Execution Plan

| ID | Step |
|---|---|
| `STEP-01` | Kiểm tra điều kiện tiên quyết của `DEC-15`: `git log --oneline -5` cho thấy commit của `hotfix-01` và của `08` đã có mặt; `grep -n "clientCompany" src/domains/job-board/public.service.ts` cho thấy deref đã được guard; và các token của 08 tồn tại trong `app/globals.css`. Thiếu một trong ba thì DỪNG, ghi `BLOCKED` vào HANDOFF kèm output, không tự làm phần việc của task kia. |
| `STEP-02` | Đo baseline để so sánh về sau: chạy `npm run test:unit` không pipe, ghi tổng số test và `$LASTEXITCODE` vào HANDOFF. Con số này là mốc của `RQ-20`. |
| `STEP-03` | Viết test RED trước ở lane unit theo `RQ-18` (sáu bất biến, gồm cả assertion `JSON.stringify` không ném). Chạy `npm run test:unit`, ghi output FAIL kèm exit code thật. Không có bằng chứng RED thì `AC-14` không đạt. |
| `STEP-04` | Sửa `src/domains/job-board/public.service.ts`: thêm hai field vào `publicSelect` theo `RQ-01`; thêm bốn field vào `PublicJobDto` theo `RQ-02`; tính lương nhỏ nhất và lớn nhất từ `slots` với `Number()` trên `BigInt`; tính `urgency` theo `RQ-03`; đổi `statusLabel` theo `RQ-04`. Chạy lại lane unit tới khi sáu bất biến PASS. |
| `STEP-05` | Dựng Hero ở `app/(portal)/page.tsx` theo `RQ-05`, nối ba ô và nút vào state bộ lọc hiện có theo `RQ-06`, thêm lọc lương phía client theo `RQ-07`. Tự kiểm bằng tay: gõ từ khoá ở Hero rồi kéo xuống panel lọc, giá trị phải khớp. |
| `STEP-06` | Dựng card nổi bật nửa phải Hero theo `RQ-08` và `DEC-14`. Kiểm nhánh rỗng bằng cách lọc một từ khoá không khớp gì: nửa phải không render, không để lại ô trắng. |
| `STEP-07` | Nâng cấp card việc làm: khung logo theo `RQ-09`, khối lương theo `RQ-10`, badge pill theo `RQ-11` và `DEC-05`. Đo lại card ở khổ 375px. |
| `STEP-08` | Dựng bốn dải nội dung theo `RQ-12`, `RQ-13`, `RQ-14`, tất cả dẫn xuất từ cùng một mảng projection, không thêm request. |
| `STEP-09` | Dựng dải số liệu tin cậy theo `RQ-15`. Đối chiếu từng con số với `total` và với tổng `availableSlots` của chính mảng đang render; ghi ba con số đó vào HANDOFF kèm cách tính. |
| `STEP-10` | Rà lại toàn bộ phần tử mới theo `RQ-16` và `RQ-17`: liệt kê từng phần tử tương tác mới kèm kích thước vùng chạm và trạng thái focus; chạy grep literal màu trên các file đã sửa và dán kết quả 0 dòng. |
| `STEP-11` | Chạy `npm run typecheck`, `npm run lint`, `npm run test:unit` KHÔNG qua pipe, ghi `$LASTEXITCODE` ngay sau mỗi lệnh. Tổng test phải không nhỏ hơn mốc `STEP-02`. |
| `STEP-12` | Chạy `git status --short` và `git diff --stat`, dán vào HANDOFF. Mọi file phải thuộc allowlist 4.2. Có file lạ thì DỪNG và báo, không tự dọn file của luồng khác. |
| `STEP-13` | Viết HANDOFF.md: từng AC một mục, lệnh thật, exit code thật, output thật. Với AC nhìn thấy được thì ghi rõ đã đo ở khổ nào và bằng cách nào. Không commit, không push, không deploy. |

## 6. Acceptance

| ID | Acceptance criterion | Cách đo |
|---|---|---|
| `AC-01` | Điều kiện tiên quyết đã kiểm, không phải giả định | HANDOFF `STEP-01` có output của `git log` và của grep, chứng minh hotfix và 08 đã có mặt |
| `AC-02` | `publicSelect` mở rộng đúng hai field, không thêm quan hệ | `git diff src/domains/job-board/public.service.ts` cho thấy đúng `hourlyRateVnd` và `createdAt` được thêm; grep `clientCompany` trong diff trả 0 dòng thêm mới |
| `AC-03` | Bốn field mới đúng tên và đúng kiểu | Đọc `PublicJobDto`: có `salaryMinVnd`, `salaryMaxVnd` kiểu `number \| null`, `urgency` kiểu union ba nhãn, `postedAt` kiểu `string \| null` |
| `AC-04` | Không lỗi tuần tự hoá `BigInt` | Test trong `RQ-18` gọi `JSON.stringify` trên DTO của một job có lương và PASS; `GET /api/jobs` local trả 200 với `salaryMinVnd` là số trong JSON |
| `AC-05` | `urgency` không đọc `availableSlots` | `grep -n "availableSlots" src/domains/job-board/public.service.ts` cho thấy không xuất hiện trong hàm tính `urgency`; và test `status === 'OPEN'` với `availableSlots = 1` trả `'NONE'` PASS |
| `AC-06` | Badge UI cũng không suy diễn từ số chỗ | `grep -rnE "availableSlots\s*.=\s*5" app/ src/` trả 0 dòng |
| `AC-07` | Hero có ba ô kèm nhãn nhìn thấy và một nút | Đọc `app/(portal)/page.tsx`: ba control trong Hero, mỗi control có phần tử nhãn nhìn thấy được nối bằng `htmlFor` hoặc bọc trong `label`; không control nào chỉ có `placeholder` |
| `AC-08` | Một nguồn sự thật cho bộ lọc | Đếm số khai báo state bộ lọc trong `app/(portal)/page.tsx`: không tăng so với trước task; và grep `fetch('/api/jobs'` trong `app/(portal)/page.tsx` trả đúng 1 vị trí |
| `AC-09` | Khối lương nổi bật và có empty state thật | Chụp hoặc mô tả hai card ở HANDOFF: một card có lương in `đ/giờ` với cỡ chữ lớn hơn chữ thân, một card không lương in đúng `Lương thương lượng` ở cùng vị trí; grep chuỗi `Lương thương lượng` trong repo trả ít nhất 1 dòng |
| `AC-10` | Không có nhãn không truy được nguồn | `grep -rn "tốt nhất" app/(portal)/` trả 0 dòng; `grep -rn "Top công ty" app/` trả 0 dòng; `grep -rn "Người lao động\|Doanh nghiệp đồng hành" app/(portal)/page.tsx` trả 0 dòng |
| `AC-11` | Số trên tag khu vực bằng số card sau khi bấm | HANDOFF ghi một cặp đo thật: tag hiện số N, bấm vào rồi đếm được đúng N card. Tag của khu vực 0 việc không tồn tại trong DOM |
| `AC-12` | Ba con số tin cậy khớp projection | HANDOFF ghi ba con số kèm phép tính đối chiếu: số việc bằng `total` của response, tổng chỗ bằng tổng `availableSlots`, số khu vực bằng số khu vực khác nhau trong mảng. Không con số nào có dấu `+` |
| `AC-13` | Bề mặt công khai không chạm bảng khách hàng | `grep -rn "clientCompany\|client_companies" app/(portal)/ src/domains/job-board/` cho thấy chỉ còn đúng chỗ đã guard của hotfix, không có vị trí mới |
| `AC-14` | Bằng chứng RED trước GREEN cho sáu bất biến | HANDOFF có hai lần chạy `npm run test:unit` tách biệt: lần trước `STEP-04` FAIL đúng tên test mới kèm exit code khác 0, lần sau PASS kèm exit code 0. Tier 3 tái lập được bằng `git stash` riêng phần service |
| `AC-15` | Phần tử mới đạt ngưỡng của 08 | HANDOFF liệt kê từng phần tử tương tác mới kèm vùng chạm tối thiểu 44x44px, khoảng cách tối thiểu 8px, và trạng thái `:focus-visible` nhìn thấy được; chuyển động mới có nhánh `prefers-reduced-motion: reduce` |
| `AC-16` | Không literal màu mới | `git diff` trên các file trong scope, grep `#[0-9a-fA-F]{3,8}`, `rgb(`, `hsl(` trong các dòng thêm mới trả 0 dòng |
| `AC-17` | Không SQL, không migration, không đổi quyền | `git diff` grep `CREATE POLICY`, `GRANT`, `ALTER TABLE`, `set_config` trả 0 dòng; `git status --short` không có file dưới `prisma/` |
| `AC-18` | Gate tĩnh sạch với exit code thật | `npm run typecheck` = 0, `npm run lint` = 0, `npm run test:unit` = 0, tổng test không nhỏ hơn mốc `STEP-02`. Exit code lấy sau pipe là bằng chứng KHÔNG hợp lệ |
| `AC-19` | Diff đúng phạm vi | `git diff --stat` trong HANDOFF; mọi file thuộc allowlist 4.2; không file nào của luồng khác bị stage hay bị dọn |
| `AC-20` | Không commit, không push, không deploy trong task này | `git log origin/main..HEAD` trả rỗng tại thời điểm viết HANDOFF; HANDOFF ghi rõ deploy là hành động của Owner |

### Traceability

| RQ | Steps | ACs |
|---|---|---|
| `RQ-01` | STEP-04 | AC-02 |
| `RQ-02` | STEP-04 | AC-03, AC-04 |
| `RQ-03` | STEP-03, STEP-04 | AC-05, AC-14 |
| `RQ-04` | STEP-04 | AC-03 |
| `RQ-05` | STEP-05 | AC-07 |
| `RQ-06` | STEP-05 | AC-08 |
| `RQ-07` | STEP-05 | AC-08 |
| `RQ-08` | STEP-06 | AC-09 |
| `RQ-09` | STEP-07 | AC-15 |
| `RQ-10` | STEP-07 | AC-09 |
| `RQ-11` | STEP-07 | AC-06 |
| `RQ-12` | STEP-08 | AC-10 |
| `RQ-13` | STEP-08 | AC-11 |
| `RQ-14` | STEP-08 | AC-10, AC-13 |
| `RQ-15` | STEP-09 | AC-12 |
| `RQ-16` | STEP-10 | AC-15 |
| `RQ-17` | STEP-10 | AC-16 |
| `RQ-18` | STEP-03, STEP-04 | AC-04, AC-14 |
| `RQ-19` | STEP-12 | AC-17 |
| `RQ-20` | STEP-02, STEP-11 | AC-18, AC-19, AC-20 |

## 7. Risk và Rollback

| ID | Risk | Countermeasure |
|---|---|---|
| `RISK-01` | Tier 2 nối lại `client_companies` để lấy tên hoặc logo cho "Top công ty hàng đầu", tái lập đúng sự cố 500 ngày 31/08 | `DEC-06`/`DEC-07` cấm; `RQ-14` và `AC-13` biến thành phép đo bằng grep; bảng này còn `FORCE` RLS nên mọi truy vấn mới trả 0 dòng chứ không báo lỗi lúc build |
| `RISK-02` | Trả `hourlyRateVnd` dạng `BigInt` thẳng ra JSON làm route 500 SAU khi mọi gate xanh — đúng lớp lỗi đã xảy ra ở go-live-03 | `RQ-02` chốt kiểu `number`; `RQ-18` bắt buộc có assertion `JSON.stringify`; `AC-04` đòi thêm một lần gọi `/api/jobs` local trả 200 |
| `RISK-03` | Tier 2 quy đổi lương giờ sang lương tháng cho giống ví dụ của Owner, sinh ra một con số không có nguồn | `DEC-02` cấm; `RQ-10` chốt đơn vị in ra là `đ/giờ`; `Q-01` giữ chỗ cho quyết định của Owner |
| `RISK-04` | Tier 2 in chip phúc lợi kiểu "có xe đưa đón" vì thấy Owner ghi trong yêu cầu, trong khi không cột nào chứa thông tin đó | `DEC-14` giới hạn chip trong bốn field thật; `EV-12` là căn cứ; Tier 3 grep chuỗi phúc lợi trong diff |
| `RISK-05` | Hero search sinh state bộ lọc thứ hai, làm Hero và panel lọc lệch nhau — lỗi khách nhìn thấy ngay nhưng gate không bắt | `RQ-06`/`DEC-13`; `AC-08` đếm số khai báo state và số vị trí `fetch` |
| `RISK-06` | Mỗi dải nội dung tự gọi một request, làm trang chậm và số liệu giữa các dải không nhất quán | `DEC-10`/`RQ-12`; `AC-08` chốt đúng 1 vị trí fetch trong trang |
| `RISK-07` | Tier 2 sửa khối `.pub-*`/`.job-card` ở `app/globals.css` từ dòng 140 tới cuối file và báo đã xong, trong khi 0 pixel đổi trên live vì không `.tsx` nào dùng khối đó | 4.2 cấm đích danh; `AC-09`/`AC-15` đòi bằng chứng nhìn thấy được trên trang thật, không phải bằng chứng "đã sửa CSS" |
| `RISK-08` | Tier 2 định nghĩa lại token, thêm màu literal, hoặc bỏ vòng focus cho phần tử mới, làm hỏng nền tảng của 08 | `RQ-16`/`RQ-17`; `AC-15`/`AC-16` đo bằng grep trên dòng thêm mới |
| `RISK-09` | Chạy `npx vitest run` trần thay vì lane unit: config mặc định đọc `DATABASE_URL` từ `.env` là production và thiếu `esbuild jsx automatic` nên đổ 24 test component oan | `RQ-20`/`AC-18` chốt đúng `npm run test:unit`; 24 fail ở lane mặc định là artifact cấu hình, không phải regression |
| `RISK-10` | Lấy exit code sau pipe nên đọc exit code của lệnh cuối, in `EXIT=0` ngay dưới dòng `failed` | `STEP-11`/`AC-18` bắt buộc đo không pipe và đọc `$LASTEXITCODE` |
| `RISK-11` | Task chạy trước khi `08` đóng, làm hai task cùng sửa `app/(portal)/page.tsx` và cùng bị audit chồng nhau | `DEC-15` là giả định có phép đo; `STEP-01`/`AC-01` buộc dừng nếu tiên quyết chưa đủ |
| `RISK-12` | Tier 2 dọn hộ các file dirty của luồng khác trong lúc kiểm diff | 4.2 liệt kê đích danh; `STEP-12` yêu cầu DỪNG và báo, không tự dọn |

**Rollback:** một commit, hai vùng file (một service, một trang cộng CSS), không migration, không đổi quyền, không đổi tập query param. Hoàn tác bằng `git revert` trên chính commit của task. Field mới của DTO là phần thêm thuần, client cũ bỏ qua field lạ nên revert không phá hợp đồng.

## 8. Open Questions

| ID | Question | Owner | Ảnh hưởng nếu chưa trả lời |
|---|---|---|---|
| `Q-01` | Có công bố căn cứ giờ để quy đổi lương tháng không, ví dụ 8 giờ mỗi ngày và 26 ngày mỗi tháng? Nếu có thì con số quy đổi in kèm ghi chú căn cứ | Owner | Không chặn. Chưa trả lời thì trang in lương giờ thật theo `DEC-01`, đúng và đủ để so sánh giữa các việc |
| `Q-02` | Có muốn hiện danh tính khách hàng trên bề mặt công khai không? Bật được cần ba việc tách rời: thêm cột logo, quyết định phơi tên khách, và một quyết định RLS cho principal công khai. Tier 1 khuyến nghị KHÔNG, vì danh tính khách là thông tin thương mại và mở dòng cho `MKT` là mở luôn mã số thuế cùng quy mô công ty | Owner | Không chặn. Chưa trả lời thì dải ngành nghề thay chỗ theo `DEC-07`, và trang không có grid logo |
| `Q-03` | Có số liệu công bố được cho "số người lao động" và "số việc làm đã kết nối" kèm ngày chốt không? Nếu có, Tier 1 sẽ viết chúng thành hằng có nguồn và có ngày, không phải số tự sinh | Owner | Không chặn. Chưa trả lời thì dải tin cậy in ba con số dẫn xuất được theo `DEC-11` |
| `Q-04` | Ba dải nội dung cộng Hero làm trang dài thêm đáng kể trên mobile. Có muốn thu gọn dải trên mobile thành thanh cuộn ngang không, hay giữ nguyên dạng xếp dọc? | Owner | Không chặn. Chưa trả lời thì Tier 2 làm xếp dọc, dạng an toàn hơn cho vùng chạm và cho trợ năng |

## 9. Planner Resolution

Chưa có. Task vừa lập, chờ `/code` round 1 sau khi `hrp-v5-hotfix-01-public-jobs-500` và `hrp-v5-go-live-08-public-ui-premium` đóng.

Ghi chú thứ tự của Tier 1: task này sửa cùng hàm `toDto` mà hotfix đang sửa, và dựng phần tử mới trên bộ token mà 08 tạo. Chạy sai thứ tự thì sinh xung đột diff và audit chồng nhau, nên `STEP-01` là cửa chặn có phép đo chứ không phải lời nhắc.

Bốn nhóm yêu cầu của Owner được đối chiếu với dữ liệu thật như sau: Hero và thanh tìm ba ô làm đủ; card việc làm làm đủ ba phần (khung logo, lương nổi bật, badge pill) nhưng logo là icon mặc định vì không có cột logo; dải nội dung làm ba trên bốn, riêng grid logo công ty bị chặn ở tầng DB nên thay bằng dải ngành nghề và ghi vào `Q-02`; dải tin cậy in ba con số dẫn xuất được thay cho ba con số không có nguồn, phần Owner công bố ghi vào `Q-03`.

## 10. Revision Log

| Version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-08-31 | Lập contract kiến trúc bề mặt công khai kế thừa `hrp-v5-go-live-08-public-ui-premium`. 17 evidence, 16 decision, 20 requirement, 13 step, 20 acceptance criterion, 12 risk, 4 open question. Bốn quyết định dữ liệu quan trọng nhất: công bố lương giờ thật từ `hourlyRateVnd` và không quy đổi lương tháng; badge khẩn chạy bằng `CLOSING_SOON` thay cho suy diễn từ số chỗ trống; khung logo có nhưng ảnh logo không vì `ClientCompany` không có cột logo; bỏ dải "Top công ty hàng đầu" vì `client_companies` không đọc được dưới principal `MKT` và thay bằng dải ngành nghề | Yêu cầu nâng cấp UI của Owner ngày 31/08 lấy cảm hứng từ các sàn việc làm đại chúng, giữ nguyên bảng màu thương hiệu. Contract chuyển yêu cầu đó thành phần làm được trên dữ liệu thật, và chuyển ba phần không có nguồn thành câu hỏi cho Owner thay vì để Tier 2 tự bịa |
