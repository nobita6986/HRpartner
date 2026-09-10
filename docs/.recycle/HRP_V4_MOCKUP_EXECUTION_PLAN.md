# HRP V4 — UI/Mockup Execution Plan & BoD Demo Strategy

> Loại tài liệu: Product Design Document cho Figma và đội thuyết trình  
> Đối tượng: Ban Giám đốc, Product Owner, UI/UX Designer, BA, Tech Lead  
> Phạm vi: B2O và B2B theo hướng operations-first  
> Trạng thái: Mockup trước coding; không phải đặc tả implementation  
> Tài liệu nguồn: `UNIFIED_PLAN_v4.md`, `data-scope-security.md`, `HRP_V4_HOLISTIC_REVIEW.md`

---

## 0. Mục tiêu và nguyên tắc

### 0.1. Mục tiêu buổi demo

Sau 12–15 phút, BoD phải nhìn thấy được bốn giá trị:

1. HRP cho biết **dự án nào đang thiếu người và cần hành động gì ngay hôm nay**.
2. HRP ngăn sai nghiệp vụ ngay tại điểm thao tác: **một người không ACTIVE ở hai dự án**, nguồn tuyển đang được bảo vệ không bị ghi đè.
3. HRP chuyển việc dò Excel thành **exception-first reconciliation**: chỉ xử lý dòng lỗi rồi khóa kỳ.
4. Một kỳ công đã khóa tạo ra **hai nghĩa vụ tài chính độc lập**: tiền trả vendor, tiền thu khách hàng và biên lợi nhuận có thể truy nguyên.

### 0.2. Không phải mục tiêu

- Không mock toàn bộ M0–M10.
- Không demo payroll TNCN/BHXH hoặc công thức luật định.
- Không demo cấu hình hệ thống, quản trị permission chi tiết, eKYC hoặc máy chấm công.
- Không trình diễn một dashboard nhiều biểu đồ chỉ để tạo cảm giác “nhiều tính năng”.
- Không dùng mockup như cam kết rằng mọi nút đã được code.

### 0.3. Design thesis

**Quiet operational confidence:** giao diện sáng, yên tĩnh, mật độ cao vừa đủ, ưu tiên quét dữ liệu và xử lý ngoại lệ. HRP không phải landing page và không dùng bố cục hero, glassmorphism, gradient trang trí hoặc các khối KPI quá lớn.

Baseline thiết kế:

| Thuộc tính | Quyết định |
|---|---|
| Phong cách | Enterprise operational SaaS, flat/minimal, high-density |
| Font | IBM Plex Sans hoặc font sans hiện có của HRP; số tiền dùng tabular figures |
| Motion | Rất nhẹ, 150–250 ms; chỉ biểu đạt chuyển trạng thái hoặc mở drawer |
| Theme demo | Light mode; dark mode không thuộc vòng BoD đầu tiên |
| Primary viewport | 1440 × 900; phải kiểm tra thêm 1366 × 768 |
| Grid | Sidebar 232 px; top bar 56 px; content gutter 24 px; spacing hệ 4/8 px |
| Radius | 6 px cho card, drawer, dialog; không dùng card lồng card |
| Icon | Một bộ Lucide outline thống nhất; không dùng emoji làm icon giao diện |
| Accessibility | Contrast AA; focus rõ; trạng thái luôn có icon + text, không chỉ dùng màu |

> Ghi chú từ UX review: bộ gợi ý thiết kế tự động đề xuất IBM Plex Sans, mật độ 8/10 và motion 2/10 — ba điểm này được giữ. Đề xuất dark/exaggerated minimalism bị loại vì không phù hợp công cụ vận hành lặp lại.

---

## 1. Core Demo User Flow — các “Aha!” moment

### 1.1. Bốn màn hình được chọn

| # | Màn hình | Module | Aha moment |
|---:|---|---|---|
| 1 | **Operations Control Tower** | M3, M5, M7, M8 | “Tôi biết ngay dự án nào thiếu người, kỳ công nào đang kẹt và tiền nào sắp được chốt.” |
| 2 | **Project Staffing + Talent Pool** | M3, M5 | “Hệ thống không chỉ lưu hồ sơ; nó giúp lấp nhu cầu và chặn điều phối/nguồn tuyển sai.” |
| 3 | **Attendance Reconciliation Workbench** | M7 | “Kế toán không dò cả file; chỉ xử lý 7 ngoại lệ rồi khóa nguồn sự thật.” |
| 4 | **Dual Reconciliation Hub + Vendor Preview** | M8, M4 | “Cùng một kỳ công tạo payable, receivable và margin; vendor xác nhận trên dữ liệu có audit.” |

Không chọn Worker Portal, Payroll hoặc CRM pipeline làm màn chính của demo đầu vì chúng làm loãng thông điệp operations-first.

### 1.2. Câu chuyện dữ liệu xuyên suốt

Buổi demo dùng một scenario duy nhất:

> Dự án **Nhà máy Điện tử An Phát — KCN Quang Minh** cần 50 lao động cho kỳ tháng 08/2026, hiện ACTIVE 47 và thiếu 3. HR cần bổ sung người, nhưng một ứng viên đã ACTIVE ở dự án khác và một ứng viên khác đang có nguồn CTV được bảo vệ. Cuối kỳ có 7 ngoại lệ chấm công. Sau khi xử lý và khóa kỳ, HRP sinh đối soát vendor `728.460.000 ₫`, đối soát khách hàng `914.820.000 ₫`, margin `186.360.000 ₫`.

Mọi màn hình phải dùng đúng scenario này. Không để số KPI, worker, project hoặc kỳ thời gian thay đổi vô cớ giữa các frame.

### 1.3. Click-path chính xác cho presenter

| Thời gian | Frame/State | Presenter thao tác | Nội dung cần nói |
|---:|---|---|---|
| 00:00 | Control Tower | Mở bộ lọc “Tháng 08/2026 · Miền Bắc” | “Đây không phải dashboard báo cáo cuối tháng; đây là hàng đợi điều hành hôm nay.” |
| 00:40 | Control Tower | Click dòng cảnh báo dự án “Thiếu 3 người” | “Từ KPI đi thẳng tới vấn đề cần xử lý, không phải mở nhiều module.” |
| 01:20 | Staffing/Talent | Mở Talent Pool đã lọc `Sẵn sàng · Bắc Ninh/Hà Nội · Ca D1` | “Card giúp HR quét nhanh con người, nguồn, kỹ năng và availability.” |
| 02:10 | Staffing/Talent | Chọn **Nguyễn Văn Nam** → `Bố trí vào dự án` | Hệ thống mở guided drawer: người này đang ACTIVE ở dự án Yên Phong; chỉ có `Xem assignment` hoặc `Chuyển dự án`. |
| 03:10 | Assignment drawer | Click `Chuyển dự án` → xem preview đóng cũ/mở mới | “Rule 1-ACTIVE không hiện thành lỗi kỹ thuật; hệ thống dẫn người dùng qua đúng quy trình.” Không submit thật trong demo. |
| 04:10 | Staffing/Talent | Đóng drawer, mở **Phạm Quốc Huy** → tab `Nguồn tuyển` | Timeline cho thấy CTV Nguyễn Hoàng Duy tạo claim 4 ngày trước; vendor mới nộp hôm nay. |
| 04:50 | Referral Guard | Click `Xem lý do bảo vệ` | “HRP giữ lịch sử nguồn, không overwrite. Override là ngoại lệ có permission, lý do và bằng chứng.” |
| 05:40 | Staffing/Talent | Click breadcrumb dự án → badge `7 ngoại lệ công` | Chuyển sang Attendance Workbench với filter dự án/kỳ đã giữ nguyên. |
| 06:20 | Attendance | Click exception `Mã NV không khớp` → mở right drawer | Map `AP-QM-1048` vào worker Trần Thị Mai; preview dòng trước/sau, không sửa raw event. |
| 07:30 | Attendance | Chọn các exception đã resolved → `Duyệt kỳ` | Thanh readiness đổi từ `7 ngoại lệ` thành `Sẵn sàng khóa`; hiển thị maker/checker. |
| 08:30 | Attendance | Click `Khóa kỳ` → confirmation summary | “Khóa là bất biến. Sai sau khóa đi bằng adjustment/version mới.” Chọn `Khóa và tạo đối soát` trong prototype. |
| 09:30 | Reconciliation | Mở tab split `Vendor payable / Client receivable` | Chỉ ra cùng source period nhưng hai rate, hai workflow và margin riêng. |
| 10:30 | Reconciliation | Click một worker line → lineage drawer | Timesheet version, quantity, vendor rate, client rate và số tiền đều truy nguyên được. |
| 11:30 | Reconciliation | Click `Xem như Vendor` | Chuyển sang portal preview với dữ liệu vendor được phép thấy; salary/margin bị ẩn. |
| 12:10 | Vendor Preview | Click `Phản đối` → reason + attachment panel | “Phản đối có cấu trúc, deadline và audit; không quay về chat rời rạc.” Không submit. |
| 13:00 | Reconciliation | Quay về Internal view, kết thúc ở margin summary | “Một chuỗi dữ liệu, bốn quyết định: tuyển, bố trí, chốt công, đối soát.” |

### 1.4. Ba khoảnh khắc bắt buộc không được cắt

Nếu thời gian demo bị rút xuống 7 phút, vẫn phải giữ:

1. Guided Transfer cho rule 1-ACTIVE.
2. Exception → Lock trong Attendance.
3. Vendor payable vs client receivable + lineage.

Referral Guard có thể được presenter nói nhanh bằng một frame tĩnh, nhưng không loại khỏi bộ mockup.

---

## 2. Global UX Specification

### 2.1. App shell

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Top bar: Organization · Period · Global search · Notifications · User   │
├───────────────┬──────────────────────────────────────────────────────────┤
│ Sidebar       │ Breadcrumb                                               │
│ Tổng quan     │ Page title                              Primary action    │
│ Dự án         │ Context/filter bar                                        │
│ Nhân lực      │                                                           │
│ Chấm công     │ Main work surface                                         │
│ Đối soát      │                                                           │
│ Báo cáo       │                                                           │
└───────────────┴──────────────────────────────────────────────────────────┘
```

- Sidebar không đổi vị trí giữa bốn màn hình.
- Mỗi màn hình có đúng một primary action.
- Context kỳ/dự án được giữ khi chuyển màn hình; presenter không chọn lại filter.
- Breadcrumb dùng cho đường sâu: `Dự án / DA-2026-018 / Chấm công / 08-2026`.
- Không dùng modal cho primary navigation; detail dùng right drawer rộng 440–520 px.

### 2.2. Visual tokens tạm thời cho Figma

Nếu HRP đã có brand palette chính thức, thay token chứ không thay semantics:

| Token | Màu tham chiếu | Sử dụng |
|---|---|---|
| Brand/Primary | HRP Orange, tạm `#E85D24` | Primary CTA, active nav, selected state |
| Ink | `#17202A` | Heading, primary text |
| Surface | `#FFFFFF` | Main surfaces |
| Canvas | `#F5F7F9` | App background |
| Border | `#D8DEE6` | Divider, input, table |
| Info | `#2563EB` | Thông tin, linked status |
| Success | `#16803A` | Đã duyệt, đã khớp, confirmed |
| Warning | `#B45309` | Review, protected source, nearing SLA |
| Danger | `#C2413B` | Blocked, failed, destructive action |
| Neutral | `#5B6673` | Secondary text |

Không dùng gradient. Không để toàn bộ UI thành các sắc cam. Orange là màu hành động/brand; blue, green, amber, red giữ vai trò semantic riêng.

### 2.3. Typography và density

| Loại | Cỡ/weight tham chiếu | Quy tắc |
|---|---|---|
| Page title | 24/32, 600 | Không dùng hero-scale |
| Section title | 16/24, 600 | Gần nội dung liên quan |
| Body/table | 14/20, 400–500 | Desktop operations default |
| Label/caption | 12/16, 500 | Không nhỏ hơn 12 px |
| Money/KPI | 18–24, 600, tabular | Luôn có đơn vị; không viết `1.2B` trong màn tài chính |
| Table row | 44 px compact / 52 px comfortable | Đưa hai variant để BoD chọn density |

### 2.4. Status language

Badge luôn có text + icon/shape, không chỉ màu:

| Nghiệp vụ | Label hiển thị |
|---|---|
| Profile | Chưa đủ hồ sơ · Chờ xác minh · Đã xác minh · Bị từ chối |
| Assignment | Dự kiến · Đang làm · Tạm dừng · Đã kết thúc · Đã chuyển |
| Risk | Bình thường · Cần xem xét · Bị chặn |
| Attendance | Đã khớp · Chưa khớp · Bất thường · Đã duyệt · Đã khóa |
| Statement | Nháp · Đã gửi · Bị phản đối · Đã xác nhận · Đã khóa · Đã thanh toán |

---

## 3. Screen 1 — Operations Control Tower

### 3.1. Mục tiêu

Giúp lãnh đạo và quản lý vận hành trả lời trong 10 giây:

- Dự án nào thiếu người?
- Kỳ công nào chưa thể khóa?
- Đối soát nào gần deadline?
- Doanh thu/margin nào là tạm tính, số nào đã khóa?

### 3.2. Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Tổng quan vận hành              [Miền Bắc] [08/2026] [Tải lại]           │
│ Dữ liệu cập nhật 08:42 · DỮ LIỆU MINH HỌA                               │
├──────────────────────────────────────────────────────────────────────────┤
│ ACTIVE 1.842 │ Thiếu 126 │ Công hoàn chỉnh 97,8% │ ĐS sẵn sàng 12/15    │
├──────────────────────────────────────┬───────────────────────────────────┤
│ HÀNG ĐỢI CẦN XỬ LÝ                  │ XU HƯỚNG 8 TUẦN                   │
│ ! An Phát · thiếu 3 người       >   │ Line: Active workers             │
│ ! An Phát · 7 ngoại lệ công     >   │ Bar: Fill rate vs target         │
│ ! Bắc Việt · phản hồi còn 18h   >   │ Visible values + legend          │
│ i 2 hồ sơ nguồn cần review      >   │                                   │
├──────────────────────────────────────┴───────────────────────────────────┤
│ DANH MỤC DỰ ÁN ƯU TIÊN                                                  │
│ Project | PM | Nhu cầu/ACTIVE | Công | Statement | Margin dự kiến | CTA │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3. Thành phần và thứ tự thông tin

1. **Context header:** vùng, kỳ, thời điểm dữ liệu.
2. **KPI strip:** bốn số phẳng trên một band, không tạo bốn card nổi.
3. **Action queue:** ưu tiên exception theo tác động và deadline, không theo module.
4. **Hai chart nhỏ:** line active workforce 8 tuần và bullet/bar fill rate. Không dùng donut/gauge.
5. **Project table:** là cửa vào luồng demo; dòng An Phát nằm đầu, highlight nhẹ.

### 3.4. Interaction prototype

- Click KPI chỉ áp filter cho table, không mở màn mới.
- Click action queue mở đúng destination đã giữ context.
- Hover/tap chart hiện con số chính xác; mọi insight có text summary.
- Click `Thiếu 3 người` trên dòng An Phát chuyển sang Screen 2.

### 3.5. Trạng thái cần vẽ

- Default có dữ liệu.
- Loading skeleton giữ nguyên kích thước.
- Empty action queue: “Không có việc khẩn cấp” + thời điểm kiểm tra gần nhất.
- Stale data >15 phút: banner thông tin, không dùng màu đỏ nếu chưa phải lỗi.

### 3.6. Không làm

- Không đưa 10–15 KPI lên đầu trang.
- Không dùng bản đồ Việt Nam nếu vị trí không phải insight chính.
- Không trộn số tạm tính với số locked mà không gắn nhãn.

---

## 4. Screen 2 — Project Staffing + Talent Pool

### 4.1. Mục tiêu

Biến một nhu cầu tuyển thành hành động bố trí người, đồng thời làm rõ ba lớp:

- Người này có phù hợp không?
- Người này có đang rảnh không?
- Nguồn tuyển và assignment có cho phép thao tác không?

### 4.2. Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ DA-2026-018 · Nhà máy Điện tử An Phát      [47/50 ACTIVE] [Thiếu 3]     │
│ KCN Quang Minh · 01/08–31/12/2026          [Xem bảng công]              │
├──────────────────────────────────────────────────────────────────────────┤
│ Search [Tên, mã, SĐT...]  [Sẵn sàng] [Khu vực] [Ca] [Nguồn] [Bộ lọc]   │
│ 128 kết quả                                         Grid / Compact toggle │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌ Worker card ┐  ┌ Worker card ┐  ┌ Worker card ┐                       │
│ │ Avatar/name │  │             │  │             │                       │
│ │ ID · area   │  │             │  │             │                       │
│ │ skill/shift │  │             │  │             │                       │
│ │ availability│  │             │  │             │                       │
│ │ source      │  │             │  │             │                       │
│ │ [Xem] [Bố trí]│ │             │  │             │                       │
│ └─────────────┘  └─────────────┘  └─────────────┘                       │
└──────────────────────────────────────────────────────────────────────────┘
```

Desktop dùng grid 3 cột ở 1440 px, card cao cố định khoảng 190–208 px. Card không chứa card con; dùng divider và dòng metadata.

### 4.3. Cấu trúc Worker card

| Vị trí | Nội dung |
|---|---|
| Header | Avatar/initial, họ tên, mã HRP, badge profile/risk |
| Body 1 | Khu vực, nhóm kỹ năng, ca có thể làm |
| Body 2 | Availability rõ bằng text: `Sẵn sàng từ 15/08` hoặc `Đang làm DA-...` |
| Source | `CTV Nguyễn Hoàng Duy` / `Vendor Bắc Việt` / `HRP trực tiếp` |
| Footer | `Xem hồ sơ` secondary; `Bố trí` primary hoặc disabled có lý do |

Không hiển thị CCCD đầy đủ, tài khoản ngân hàng hoặc thông tin lương trên card.

### 4.4. Visual hóa rule 1-ACTIVE

Không dùng toast “Worker already active”. Khi click `Bố trí` với Nguyễn Văn Nam:

```text
Right drawer: Bố trí Nguyễn Văn Nam
────────────────────────────────────
Trạng thái: ĐANG LÀM
Dự án hiện tại: Kho vận Yên Phong
Hiệu lực từ: 10/06/2026

Không thể tạo assignment ACTIVE thứ hai.
Bạn có thể chuyển người này sang An Phát.

[Xem assignment hiện tại]
[Chuyển dự án]  ← primary
[Hủy]
```

Click `Chuyển dự án` mở step preview trong cùng drawer:

- Assignment cũ: ACTIVE → TRANSFERRED, kết thúc 15/08/2026 06:00.
- Assignment mới: PLANNED → ACTIVE, bắt đầu 15/08/2026 06:00.
- Quota dự án cũ −1, dự án mới +1.
- Trường bắt buộc: lý do chuyển.

Đây là **guided resolution**, không phải lỗi chặn cụt.

### 4.5. Visual hóa Referral Guard

Trên card Phạm Quốc Huy hiển thị badge amber:

`Nguồn đang được bảo vệ · còn 3 ngày`

Drawer `Nguồn tuyển`:

```text
12/08  CTV Nguyễn Hoàng Duy tạo submission
12/08  HR xác nhận nhận hồ sơ
16/08  Vendor Bắc Việt nộp lại hồ sơ

Kết luận: Chặn nhận nguồn mới đến hết 18/08
Lý do: Claim CTV đang trong cửa sổ bảo vệ 7 ngày

[Giữ nguồn hiện tại]  ← default
[Yêu cầu override]    ← chỉ hiện nếu có permission
```

- Amber thể hiện “được bảo vệ/cần review”, không dùng red trừ khi risk `BLOCKED`.
- Override không nằm cạnh CTA chính. Nó nằm trong overflow hoặc secondary action và luôn mở form reason/evidence.
- Timeline làm rõ quy tắc thay vì hiển thị mã `IN_7D_WINDOW` cho người dùng.

### 4.6. Trạng thái cần vẽ

- Default grid.
- Selected card.
- No result sau filter.
- One-active guided transfer drawer.
- Referral Guard drawer: protected, expired, override requested.
- Card risk BLOCKED: CTA disabled + lý do + đường tới review.

---

## 5. Screen 3 — Attendance Reconciliation Workbench

### 5.1. Mục tiêu

Giúp kế toán/HR hoàn thành kỳ công bằng cách xử lý ngoại lệ, không phải đọc lại toàn bộ file.

### 5.2. Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Chấm công · An Phát · 08/2026       [PREVIEWED]                          │
│ File: AP_QM_T08_2026.xlsx · 1.222 dòng · nhập 08:14 bởi Lê Thu Hà       │
├──────────────────────────────────────────────────────────────────────────┤
│ Đã khớp 1.215 │ Ngoại lệ 7 │ Chưa map 2 │ Giờ thường 9.624 │ OT 490,5  │
├──────────────────────────────────────────────────────────────────────────┤
│ [Tất cả] [Ngoại lệ 7] [Chưa map 2]  Search  Filters   [Export review]   │
├──────────────────────────────────────────────────────────────────────────┤
│ □ | Mã NV | Worker | Ngày | Ca | Vào | Ra | Regular | OT | Trạng thái │
│ □ | ... frozen columns ...                         | [Xem]              │
│ □ | AP-QM-1048 | — | 12/08 | D1 | 06:02 | 14:07 | 8,0 | 0 | Chưa map│
│ □ | AP-QM-1021 | Nam | 14/08 | N1 | 21:58 | 06:04 | 2+6 | 0 | Tách ca│
├──────────────────────────────────────────────────────────────────────────┤
│ Bulk action bar: 2 selected  [Gán worker] [Đánh dấu đã xử lý]           │
├──────────────────────────────────────────────────────────────────────────┤
│ Readiness: 5/7 resolved · Còn 2 blocker             [Duyệt kỳ] disabled │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3. Table behavior

- Header và ba cột đầu sticky.
- Mặc định sort blocker trước, sau đó theo ngày/mã NV.
- Row height 44 px; expansion chỉ cho detail ngắn, correction phức tạp dùng drawer.
- Số giờ căn phải; tiền không xuất hiện ở màn này.
- Pagination hoặc virtualization từ 100 rows; mockup hiển thị 12 rows đủ các trạng thái.
- Bulk action bar chỉ xuất hiện khi có selection, không làm table nhảy chiều cao.

### 5.4. Exception taxonomy hiển thị

| Code nội bộ | Label người dùng | Cách xử lý trong demo |
|---|---|---|
| `UNMATCHED_EMPLOYEE` | Chưa tìm thấy mã nhân viên | Gán vào Trần Thị Mai |
| `DUPLICATE_EVENT` | Có bản ghi trùng | So hash/source, giữ một raw event |
| `MISSING_CHECKOUT` | Thiếu giờ ra | Nhập correction kèm lý do |
| `WRONG_PROJECT` | Người không thuộc dự án ngày này | Chọn đúng assignment hoặc đưa review |
| `CROSS_DAY_SHIFT` | Ca vắt ngày cần tách | Preview hai dòng normalized |
| `INACTIVE_ASSIGNMENT` | Assignment chưa ACTIVE | Không tự sửa; điều hướng tới assignment |
| `SOURCE_CONFLICT` | Hai nguồn điểm danh mâu thuẫn | So evidence, chọn resolution có audit |

### 5.5. Drawer resolve exception

Drawer chia ba band, không dùng card lồng:

1. **Raw source:** giá trị file, row number, hash, thời điểm nhận.
2. **Suggested match:** worker/assignment gợi ý cùng confidence và lý do.
3. **Result preview:** normalized line sẽ được tạo; actor phải nhập reason nếu sửa tay.

CTA: `Áp dụng mapping`. Sau click, row chuyển sang `Đã khớp` và counter giảm ngay trong prototype.

### 5.6. Lock confirmation

Dialog khóa kỳ phải cho thấy hệ quả:

```text
Khóa kỳ công tháng 08/2026?

1.222 raw rows · 1.222 normalized rows
47 workers · 0 blocker · 7 exception đã xử lý
9.624 giờ thường · 490,5 giờ OT

Sau khi khóa, không sửa trực tiếp. Sai lệch tạo adjustment/version mới.

[Quay lại kiểm tra] [Khóa và tạo đối soát]
```

`Khóa và tạo đối soát` là primary nhưng không dùng màu success; đây là hành động quan trọng, cần confirmation rõ.

### 5.7. Trạng thái cần vẽ

- Import parsing progress.
- Preview có exception.
- Resolve drawer.
- Ready to approve.
- Approved, ready to lock.
- Locked read-only.
- Failed import với đường retry/download error report.

---

## 6. Screen 4 — Dual Reconciliation Hub + Vendor Preview

### 6.1. Mục tiêu

Chứng minh rằng HRP không gộp “tiền công” thành một con số mơ hồ. Mỗi line có source, rate và nghĩa vụ tài chính riêng.

### 6.2. Wireframe internal view

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Đối soát · An Phát · 08/2026        Source: Timesheet LOCKED v1         │
│ [Internal view] [Xem như Vendor]                         [Tạo bản gửi]   │
├──────────────────────────────────────────────────────────────────────────┤
│ Vendor payable      Client receivable      Gross margin                 │
│ 728.460.000 ₫       914.820.000 ₫          186.360.000 ₫ · 20,37%       │
├──────────────────────────────────────────────────────────────────────────┤
│ [Vendor payable] [Client receivable] [Margin comparison]                │
│ Vendor: Nhân lực Bắc Việt · Statement V1 · DRAFT                        │
├──────────────────────────────────────────────────────────────────────────┤
│ Worker | Assignment | Reg h | OT h | Rate snapshot | Amount | Lineage   │
│ Nam    | AP-QM-1021 | 208   | 12   | 58.000/87.000 | 13.108.000 | >    │
│ ...                                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ 47 workers · 9.624 regular hours · 490,5 OT       Total 728.460.000 ₫   │
└──────────────────────────────────────────────────────────────────────────┘
```

Ba con số đầu là **summary band**, không phải ba floating cards. Vendor/client tabs dùng cùng cấu trúc cột nhưng rate và amount độc lập.

### 6.3. Margin comparison

Không dùng pie chart. Dùng table hoặc horizontal bars cho tối đa 10 project/vendor:

| Project | Client bill | Vendor pay | Other direct cost | Margin | Margin % |
|---|---:|---:|---:|---:|---:|

- Luôn hiển thị con số; chart chỉ bổ trợ.
- Margin âm dùng icon + text `Âm`, không chỉ thanh đỏ.
- Số tạm tính phải có label/watermark; số trong demo này lấy từ statement draft sinh từ timesheet locked.

### 6.4. Lineage drawer

Khi click dòng Nguyễn Văn Nam:

```text
Lineage · Nguyễn Văn Nam · 08/2026
────────────────────────────────────
Timesheet period: TS-2026-08-AP · LOCKED v1
Assignment: ASG-004821 · ACTIVE
Regular: 208 h × 58.000 ₫ = 12.064.000 ₫
OT1.5:    12 h × 87.000 ₫ =  1.044.000 ₫
Vendor line total:              13.108.000 ₫

Client regular rate: 72.000 ₫/h
Client OT1.5 rate: 108.000 ₫/h
Client line total: 16.272.000 ₫
Line margin:        3.164.000 ₫

[Mở bảng công nguồn] [Mở rate card]
```

Không để user tự sửa rate/amount trong drawer. Nếu sai, mở đúng rate card hoặc tạo revision.

### 6.5. Vendor Preview

`Xem như Vendor` đổi shell nhẹ để thể hiện context nhưng không mở một sản phẩm khác:

- Header có logo HRP + tên Vendor + badge `Chế độ xem đối tác`.
- Chỉ có statement của chính vendor.
- Ẩn client rate, client amount, margin, salary và nguồn khác.
- Table giữ Worker, mã tại dự án, giờ, vendor rate và amount.
- Primary CTA theo status: `Xác nhận`.
- Secondary CTA: `Phản đối`.

Form phản đối:

| Field | Quy tắc |
|---|---|
| Phạm vi | Toàn statement hoặc chọn line cụ thể |
| Lý do | Danh mục: sai giờ, sai rate, thiếu worker, khác |
| Mô tả | Bắt buộc, tối thiểu đủ để xử lý |
| Bằng chứng | Attachment; hiển thị file name/size |
| Deadline | Hiện rõ thời gian phản hồi còn lại |

Không submit trong buổi demo; dừng ở confirmation preview để tránh tranh luận vào chi tiết workflow chưa chốt.

### 6.6. Trạng thái cần vẽ

- Internal DRAFT.
- Vendor SENT/chờ phản hồi.
- Vendor DISPUTED với 2 line bị đánh dấu.
- CONFIRMED/LOCKED read-only.
- Revision V2 với link `Thay thế V1`.
- Empty payment state; không giả lập PAID nếu chưa có payment allocation design.

---

## 7. Realistic Dummy Data Strategy — bối cảnh Việt Nam

### 7.1. Quy tắc dữ liệu mock

1. Tất cả frame dùng cùng một data dictionary và ID ổn định.
2. Hiển thị watermark nhỏ `DỮ LIỆU MINH HỌA` trên top bar.
3. Tên công ty/dự án là hư cấu nhưng có bối cảnh quen thuộc; nếu dùng tên khách hàng thật phải được BoD phê duyệt.
4. CCCD, SĐT, tài khoản ngân hàng luôn mask; không dùng dữ liệu nhân sự thật.
5. Ngày nằm trong 08/2026 và khớp thứ tự timeline.
6. Tiền hiển thị theo `vi-VN`, nguyên đồng; data dictionary lưu số nguyên tương đương BigInt.
7. Tỷ lệ, tổng giờ và tổng tiền phải cộng được; không dùng số “đẹp” nhưng sai nhau giữa các màn.

### 7.2. Client, project và vendor

| ID | Tên hiển thị | Loại/địa điểm | Dữ liệu chính |
|---|---|---|---|
| CL-0018 | Công ty TNHH Điện tử An Phát | KCN Quang Minh, Hà Nội | Client chính của demo |
| CL-0021 | Công ty CP Kho vận Đông Dương | KCN Yên Phong, Bắc Ninh | Dự án assignment đang ACTIVE của Nam |
| CL-0027 | Công ty TNHH Linh kiện Sao Việt | KCN Quang Châu, Bắc Giang | Dòng so sánh dashboard |
| DA-2026-018 | Nhà máy Điện tử An Phát | Quang Minh · PM Nguyễn Thùy Linh | Nhu cầu 50, ACTIVE 47, thiếu 3 |
| DA-2026-022 | Kho vận Yên Phong | Bắc Ninh · PM Trần Quốc Bảo | Assignment cũ của Nguyễn Văn Nam |
| VND-004 | Công ty CP Nhân lực Bắc Việt | Vendor chính | 31/47 worker của An Phát |
| VND-007 | Công ty TNHH Cung ứng Minh Tâm | Vendor phụ | 9/47 worker của An Phát |

### 7.3. Worker records

| Worker ID | Họ tên | Năm sinh | Khu vực | Ca/kỹ năng | Trạng thái/nguồn |
|---|---|---:|---|---|---|
| HRP-02418 | Nguyễn Văn Nam | 1995 | Bắc Ninh | D1/N1 · Lắp ráp SMT | ACTIVE tại Yên Phong · HRP direct |
| HRP-02431 | Trần Thị Mai | 1997 | Bắc Giang | D1 · QA ngoại quan | VERIFIED · Vendor Bắc Việt |
| HRP-02444 | Phạm Quốc Huy | 1993 | Sóc Sơn | D1/D2 · Đóng gói | AVAILABLE · CTV claim protected |
| HRP-02452 | Lê Thị Thu Trang | 1999 | Mê Linh | D1 · Kiểm hàng | AVAILABLE · HRP direct |
| HRP-02465 | Đỗ Văn Cường | 1991 | Đông Anh | N1 · Vận hành máy | REVIEW · Vendor Minh Tâm |
| HRP-02479 | Hoàng Thị Ngọc Anh | 2000 | Bắc Giang | D2 · QA | AVAILABLE · Vendor Bắc Việt |
| HRP-02483 | Bùi Đức Long | 1996 | Bắc Ninh | D1/N1 · Kho | ACTIVE tại An Phát |
| HRP-02497 | Vũ Thị Hương | 1998 | Vĩnh Phúc | HC/D1 · Admin xưởng | PLANNED 20/08 |
| HRP-02504 | Nguyễn Minh Tuấn | 1994 | Hà Nội | D2 · Lắp ráp | BLOCKED · hồ sơ cần review |
| HRP-02516 | Hà Thị Lan | 2001 | Bắc Giang | D1 · Đóng gói | AVAILABLE · CTV |
| HRP-02522 | Phan Văn Khánh | 1992 | Bắc Ninh | N1 · Xe nâng | ACTIVE tại An Phát |
| HRP-02537 | Đặng Thu Phương | 1998 | Mê Linh | D1/D2 · QC | AVAILABLE · Vendor Bắc Việt |

Presenter chỉ tương tác sâu với Nam, Mai và Huy. Các worker còn lại tạo cảm giác danh mục thật và hỗ trợ filter.

### 7.4. Shift codes

| Code | Khung giờ | Label UI | Ghi chú |
|---|---|---|---|
| HC | 08:00–17:00 | Hành chính | Nghỉ trưa theo site |
| D1 | 06:00–14:00 | Ca ngày 1 | Ca chính của demo |
| D2 | 14:00–22:00 | Ca ngày 2 | Bàn giao 14:00 |
| N1 | 22:00–06:00 | Ca đêm | Vắt ngày, normalized tách theo lịch |
| T1 | 07:30–16:30 | Ca kho vận | Dùng ở Yên Phong |

### 7.5. Attendance dataset

| Metric | Giá trị |
|---|---:|
| File | `AP_QM_T08_2026.xlsx` |
| Raw rows | 1.222 |
| Matched | 1.215 |
| Exceptions | 7 |
| Workers | 47 |
| Regular hours | 9.624,0 |
| OT1.5 | 426,5 |
| OT2.0 | 48,0 |
| OT3.0 | 16,0 |
| Total OT | 490,5 |

Bảy exception phải xuất hiện đúng một lần theo taxonomy ở §5.4. Hai exception là blocker trước lock: unmatched employee và source conflict.

### 7.6. Financial dataset và BigInt representation

| Metric | UI hiển thị | Giá trị dữ liệu |
|---|---:|---:|
| Vendor payable | `728.460.000 ₫` | `728460000n` |
| Client receivable | `914.820.000 ₫` | `914820000n` |
| Gross margin | `186.360.000 ₫` | `186360000n` |
| Margin rate | `20,37%` | Derived, không lưu bằng float tiền |
| Nam — vendor line | `13.108.000 ₫` | `13108000n` |
| Nam — client line | `16.272.000 ₫` | `16272000n` |
| Nam — line margin | `3.164.000 ₫` | `3164000n` |
| Vendor regular rate | `58.000 ₫/giờ` | `58000n` |
| Vendor OT1.5 rate | `87.000 ₫/giờ` | `87000n` |
| Client regular rate | `72.000 ₫/giờ` | `72000n` |
| Client OT1.5 rate | `108.000 ₫/giờ` | `108000n` |

Phép tính line của Nam:

- Vendor: `208 × 58.000 + 12 × 87.000 = 13.108.000 ₫`.
- Client: `208 × 72.000 + 12 × 108.000 = 16.272.000 ₫`.
- Margin line: `16.272.000 − 13.108.000 = 3.164.000 ₫`.

### 7.7. Vietnamese formatting

- Ngày: `15/08/2026`; thời điểm: `15/08/2026 · 08:42`.
- Tiền: `914.820.000 ₫`, không dùng `VND 914,820,000`.
- Phần trăm: `20,37%`.
- Giờ: `490,5 giờ`; table có thể dùng `490,50` nếu cần đối soát chính xác.
- SĐT: `09•• ••• 482`; CCCD: `001•••••418`.
- Tên file và mã nghiệp vụ không dấu để tương thích export; label UI dùng tiếng Việt có dấu.

---

## 8. Figma Execution Plan

### 8.1. Cấu trúc file Figma

```text
00 — Cover & Demo Narrative
01 — Foundations
02 — Components
10 — Control Tower
20 — Staffing & Talent Pool
30 — Attendance Workbench
40 — Reconciliation & Vendor Preview
50 — Prototype Flow
60 — BoD Decision Variants
90 — Archive
```

Frame naming:

```text
S01_ControlTower_Default_1440
S02_Staffing_Default_1440
S02A_AssignmentConflict_Drawer
S02B_ReferralGuard_Drawer
S03_Attendance_Exceptions
S03A_Attendance_Resolved
S03B_LockConfirmation
S04_Reconciliation_Internal
S04A_Lineage_Drawer
S04B_VendorPreview_Dispute
```

### 8.2. Component set tối thiểu

- AppShell, SidebarItem, Breadcrumb.
- Button: primary/secondary/ghost/destructive; loading/disabled.
- StatusBadge có icon/text.
- FilterChip, SegmentedControl, SearchField.
- WorkerCard compact/default/selected/blocked/protected.
- DataTable header/row/selected/exception/locked.
- SummaryBandMetric.
- RightDrawer, ConfirmationDialog, EmptyState, Skeleton.
- TimelineEvent, EvidenceAttachment, AuditMeta.

Component phải dùng Auto Layout, variants và semantic naming. Designer không detach component để chỉnh từng frame.

### 8.3. Prototype hotspots bắt buộc

| From | Hotspot | To |
|---|---|---|
| Control Tower | `Thiếu 3 người` | Staffing default |
| Staffing | `Bố trí` Nguyễn Văn Nam | Assignment conflict drawer |
| Assignment drawer | `Chuyển dự án` | Transfer preview state |
| Staffing | Phạm Quốc Huy / `Nguồn tuyển` | Referral Guard drawer |
| Staffing header | `7 ngoại lệ công` | Attendance exceptions |
| Attendance row | `AP-QM-1048` | Resolve drawer |
| Attendance resolved | `Khóa kỳ` | Lock confirmation |
| Lock dialog | `Khóa và tạo đối soát` | Reconciliation internal |
| Reconciliation line | Nguyễn Văn Nam | Lineage drawer |
| Reconciliation | `Xem như Vendor` | Vendor preview |
| Vendor preview | `Phản đối` | Dispute form state |

Mỗi hotspot có vùng click đủ lớn. Prototype không phụ thuộc hover để đi tiếp.

### 8.4. Responsive scope

Vòng BoD đầu chỉ cần desktop high-fidelity. Tuy nhiên designer phải kiểm tra:

- 1366 × 768: không che CTA/table totals.
- 1440 × 900: frame trình chiếu chính.
- 1024 × 768: sidebar compact, Talent Pool 2 cột.

Mobile/PWA chỉ làm low-fidelity sau khi BoD chốt core flow. Không cố ép financial table thành card trong mockup desktop.

---

## 9. Presentation Strategy

### 9.1. Cấu trúc buổi họp 45 phút

| Phần | Thời lượng | Nội dung |
|---|---:|---|
| Context | 3 phút | Bài toán hiện tại và mục tiêu operations-first |
| Guided demo | 12–15 phút | Click-path §1.3, không ngắt để bàn chi tiết |
| Replay theo quyết định | 5 phút | Nhắc lại 4 aha moments bằng frame tĩnh |
| Decision workshop | 17 phút | 6–8 câu hỏi ưu tiên ở §10 |
| Chốt | 5 phút | Quyết định, owner, deadline, vòng mockup tiếp theo |

### 9.2. Presenter rules

- Bắt đầu bằng vấn đề `Thiếu 3 người`, không bắt đầu bằng menu/module.
- Không đọc toàn bộ số trên màn hình; mỗi màn chỉ nói một insight và một action.
- Không gọi mockup là “hệ thống đã làm”. Dùng “prototype luồng dự kiến”.
- Khi có câu hỏi ngoài scope, ghi parking lot rồi tiếp tục click-path.
- Không tranh luận màu sắc trước khi chốt workflow và information hierarchy.
- Có PDF/frame export dự phòng nếu Figma prototype hoặc mạng lỗi.

### 9.3. Demo safety

- Prototype bắt đầu từ một URL/frame duy nhất.
- Presenter có checklist hotspot và bản đồ back-path.
- Dùng cursor spotlight nhẹ; không dùng animation trang trí.
- Zoom trình duyệt 100%, 1440 × 900, notification hệ điều hành tắt.
- Dữ liệu minh họa có watermark; không dùng logo khách hàng thật nếu chưa được phép.

---

## 10. Stakeholder Feedback Integration Plan

### 10.1. Nguyên tắc hỏi

Không hỏi “Anh/chị có thích giao diện này không?”. Hỏi theo quyết định và tình huống:

- “Nếu là người duyệt, thông tin nào còn thiếu để anh/chị ra quyết định?”
- “Ai phải chịu trách nhiệm cho exception này?”
- “Hành động nào cần hai người duyệt?”
- “Con số nào được phép gọi là chính thức?”

### 10.2. Decision points cố ý để mở

| ID | Quyết định cần BoD phản hồi | Variant trong Figma | Khuyến nghị PM |
|---|---|---|---|
| D01 | Bốn KPI nào thuộc Control Tower? | A: workforce/fill/attendance/statement; B: thêm revenue/margin | A cho vận hành; tài chính nằm project table |
| D02 | Density table 44 hay 52 px? | Compact vs comfortable | 44 px cho kế toán; lưu preference sau này |
| D03 | Talent Pool mặc định card hay compact list? | 3-column cards vs dense list | Card cho scan/select; list cho export/bulk |
| D04 | Khi vi phạm 1-ACTIVE, block hay guided transfer? | Error modal vs guided drawer | Guided transfer như §4.4 |
| D05 | Ai được yêu cầu/duyệt Referral Guard override? | HR_MANAGER only vs maker-checker | Người yêu cầu và người duyệt không trùng |
| D06 | Attendance cần mấy bước trước LOCK? | Review → Lock; Review → Approve → Lock | Tối thiểu maker-checker cho kỳ tài chính |
| D07 | Exception nào là blocker tuyệt đối? | Danh sách 5 vs 7 code | Unmatched/source conflict/wrong assignment là blocker |
| D08 | Vendor có thấy rate line hay chỉ amount? | Rate+quantity+amount vs amount only | Hiện đủ basis để giảm dispute |
| D09 | Thời hạn vendor confirm/dispute? | 2, 3 hoặc 5 ngày làm việc | 3 ngày là default thử nghiệm |
| D10 | Ai được thấy margin? | Director+Accountant; thêm PM | Director/Accountant mặc định, PM theo permission |
| D11 | Risk vocabulary | “Review/Blocked” vs wording mềm hơn | Dùng `Cần xem xét/Bị chặn`, không màu-only |
| D12 | Dùng tên/brand khách hàng thật trong demo sau? | Anonymized vs approved real client | Anonymized cho vòng đầu |

Chỉ D01–D08 cần chốt để chuyển sang wireframe vòng 2. D09–D12 có thể có owner và deadline sau buổi họp.

### 10.3. Cách thu phản hồi

Mỗi quyết định ghi vào một Decision Log:

| Field | Nội dung |
|---|---|
| Decision ID | D01–D12 |
| Screen/frame | Link Figma trực tiếp |
| Question | Một câu hỏi duy nhất |
| Options | Tối đa 2–3 phương án |
| Decision | Chosen / Deferred / Need evidence |
| Decision owner | Một người có quyền chốt |
| Due date | Ngày cụ thể |
| Product impact | Module, workflow, permission, data field liên quan |
| Follow-up | Ai sửa mockup/spec |

Trong buổi họp:

1. Người điều phối đọc scenario.
2. Mỗi thành viên chọn option trước khi thảo luận để tránh người nói đầu tiên chi phối.
3. Chỉ thảo luận các phiếu khác nhau.
4. PM đọc lại quyết định bằng câu “Hệ thống sẽ...” trước khi ghi Chosen.

### 10.4. Phân loại feedback

| Loại | Ví dụ | Xử lý |
|---|---|---|
| Workflow blocker | Thiếu bước phê duyệt trước LOCK | Sửa flow ngay vòng kế tiếp |
| Information gap | Thiếu PM/vendor trên queue | Sửa hierarchy/data field |
| Policy decision | Ai được force lock | Ghi Decision Log, owner chốt |
| Visual preference | Muốn row cao hơn | A/B test, không đổi domain model |
| New feature | Muốn app chấm công native | Parking lot/post-go-live |
| Implementation concern | QStash/Prisma | Chuyển architecture backlog, không làm lệch phiên UX |

---

## 11. Mockup Roadmap

### 11.1. Kế hoạch 10 ngày làm việc

| Ngày | Công việc | Deliverable |
|---:|---|---|
| 1 | Kickoff, xác nhận scenario và Decision Log | Story map + data dictionary v1 |
| 2 | Information architecture + low-fi Control Tower/Staffing | Wireframe v1 |
| 3 | Low-fi Attendance/Reconciliation | Wireframe v1 đủ 4 màn |
| 4 | Internal critique với PM/BA/Architect | Issue list, flow v2 |
| 5 | Chốt components/tokens và content | Foundations + component inventory |
| 6 | High-fi Control Tower/Staffing | Frames S01–S02B |
| 7 | High-fi Attendance/Reconciliation | Frames S03–S04B |
| 8 | Prototype hotspots, loading/error/empty states | Clickable prototype v1 |
| 9 | Dry-run với presenter; sửa narrative và số liệu | Prototype v2 + demo script |
| 10 | BoD review package | Figma link, PDF backup, Decision Log |

Sau BoD:

- 24 giờ: gửi biên bản quyết định.
- 2 ngày: cập nhật frame đã chốt.
- 3 ngày: UX sign-off và freeze `Mockup Baseline v1`.
- Backend/frontend chỉ được dùng baseline sau khi PM đánh dấu Approved; các variant không chọn chuyển vào Archive.

### 11.2. Vai trò

| Vai trò | Trách nhiệm |
|---|---|
| Sếp / Figma Owner | Dựng Figma, chạy prototype, trình bày BoD, cung cấp phản hồi nghiệp vụ và nghiệm thu baseline |
| Tier 1 — Planner AI | Sở hữu `TASK.md`: scenario, decisions, contract, execution plan, acceptance và Planner Resolution; không sửa Figma/source |
| Tier 3 — Audit context | Hậu kiểm frame export so với `TASK.md`, kiểm tra flow, số liệu, states, accessibility; chỉ ghi `AUDIT.md` |
| Tier 2 — Coding context | Chưa tham gia trước sign-off; sau Mockup Baseline mới implement task CODE và ghi `HANDOFF.md` |
| BoD | Chốt các Decision ID thuộc thẩm quyền thông qua sếp; không giao yêu cầu miệng trực tiếp cho Tier 2 |

Vì chỉ có một Coding AI, Tier 2 và Tier 3 được vận hành bằng **hai task/context riêng**. Có thể dùng cùng model và workspace, nhưng phiên audit không tiếp tục conversation vừa code. Mỗi task chỉ dùng `TASK.md`, `HANDOFF.md`, `AUDIT.md`; artifact trên filesystem là kênh bàn giao duy nhất.

### 11.3. Phân việc thực tế trong 10 ngày

| Ngày | Tier 1 — Planner AI | Sếp / Figma Owner | Tier 3 — Audit context | Tier 2 |
|---:|---|---|---|---|
| 1 | Tạo `docs/tasks/hrp-v4-bod-mockup/TASK.md` và chốt prototype assumptions | Setup file/page/frame/app shell | Không hoạt động | Không hoạt động |
| 2–3 | Giải đáp decision trong TASK, kiểm soát scope | Dựng low-fi 4 màn theo STEP/RQ/AC | Không hoạt động | Không hoạt động |
| 4 | Tiếp nhận findings, ghi Planner Resolution trong TASK | Export low-fi và cập nhật `HANDOFF.md` round 1 | Append `AUDIT.md` round 1: flow, hierarchy, nghiệp vụ, số liệu | Không hoạt động |
| 5 | Freeze component/content decision | Tạo foundations/components | Không hoạt động | Không hoạt động |
| 6–8 | Giải đáp decision, kiểm soát scope | Dựng high-fi, states và prototype | Không hoạt động | Không hoạt động |
| 9 | Tiếp nhận audit round 2; ghi resolution/remediation trong TASK | Cập nhật `HANDOFF.md` round 2 và export prototype v1 | Append `AUDIT.md` round 2: viewport, accessibility, totals, timing | Không hoạt động |
| 10 | Đề xuất TASK status `ACCEPTED` sau quyết định BoD | Dry-run, trình BoD và freeze frame được duyệt | Re-audit finding còn mở nếu artifact đổi | Không hoạt động |
| Sau sign-off | Tạo một TASK CODE cho từng micro-phase | Nghiệm thu UI so với Figma | Audit độc lập sau mỗi HANDOFF | Implement và self-check theo TASK contract |

Không để Tier 3 gửi yêu cầu sửa trực tiếp cho sếp hoặc Tier 2. Mọi finding đi qua Tier 1 để tránh thay đổi Figma/code mà chưa có quyết định sản phẩm.

---

## 12. Acceptance Criteria trước khi trình BoD

### Product narrative

- [ ] Bốn màn hình kể được một scenario liên tục, không phải bốn demo rời.
- [ ] Mỗi màn hình có một aha moment và một primary action.
- [ ] Không có TNCN/BHXH hoặc tính năng ngoài operations-first chen vào flow.

### Data integrity

- [ ] Worker/project/vendor ID không đổi giữa frame.
- [ ] Attendance totals và financial totals cộng đúng.
- [ ] Mọi số tiền dùng định dạng Việt Nam và nguyên đồng.
- [ ] Có watermark `DỮ LIỆU MINH HỌA`; không có dữ liệu cá nhân thật.

### UX quality

- [ ] Card dùng cho Talent Pool; table dùng cho attendance/reconciliation.
- [ ] Rule 1-ACTIVE có guided resolution, không chỉ error message.
- [ ] Referral Guard có timeline, lý do, remaining window và override path.
- [ ] Status không truyền đạt bằng màu đơn độc.
- [ ] Button/hotspot tối thiểu 44 × 44 px; focus/keyboard path có thể mô tả.
- [ ] Không có nested card, decorative gradient, emoji icon hoặc oversized heading.
- [ ] 1366 × 768 không che primary CTA, totals hoặc table action bar.

### Prototype readiness

- [ ] Tất cả hotspot ở §8.3 chạy đúng và có back-path.
- [ ] Presenter hoàn thành flow trong tối đa 15 phút qua hai lần dry-run.
- [ ] Có PDF/frame export dự phòng theo đúng thứ tự demo.
- [ ] Decision Log D01–D12 đã tạo trước cuộc họp.

### Sign-off

- [ ] PM xác nhận scope và narrative.
- [ ] Operations xác nhận wording/trạng thái.
- [ ] Finance xác nhận số và lineage.
- [ ] UX xác nhận information hierarchy/accessibility.
- [ ] Presenter xác nhận kịch bản và timing.

---

## 13. Kết luận

Bộ mockup đầu tiên không cần chứng minh HRP có nhiều module. Nó phải chứng minh một điều khó hơn: **HRP nối được nhu cầu nhân lực, con người, công và tiền trong một chuỗi quyết định có kiểm soát**. Bốn màn hình trên là phạm vi nhỏ nhất đủ để BoD nhìn thấy giá trị đó và đưa ra quyết định sản phẩm có thể hành động được trước khi team bắt đầu backend/frontend.
