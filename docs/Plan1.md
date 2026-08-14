Dưới đây là **Master Feature List (Danh sách Tính năng Tổng thể)** được cấu trúc chuẩn hóa (dạng PRD - Product Requirements Document). Tài liệu này được thiết kế với các định danh (ID) rõ ràng, phân rã logic chi tiết để bạn có thể copy/paste trực tiếp (hand-over) cho các công cụ AI coding phân tích, sinh ra Database Schema và API Endpoints ngay lập tức.

---

# TÀI LIỆU YÊU CẦU TÍNH NĂNG (MASTER FEATURE LIST) - HỆ THỐNG HRP

**Định hướng kiến trúc:** API-first, Backend tập trung xử lý logic. Frontend chia làm 2 phase (Phase 1: Web Responsive Mobile-first; Phase 2: Đóng gói App WebView/Capacitor).

## 1. Module: Cổng thông tin & App Người lao động / CTV (Worker & CTV Portal)

*Định hướng UI/UX: Mobile-first, siêu tối giản, không dùng mật khẩu, nút bấm lớn.*

* **[WPA-01] Đăng nhập / Đăng ký (Authentication)**
* `WPA-01.1`: Đăng nhập/Đăng ký qua Zalo API (1-click login).
* `WPA-01.2`: Đăng nhập/Đăng ký bằng Số điện thoại + OTP (SMS/Voice call).
* `WPA-01.3`: Tự động nhận diện loại tài khoản (Người tìm việc, Người đang làm việc tại dự án, hoặc CTV) để hiển thị Dashboard phù hợp.


* **[WPA-02] Bảng tin Việc làm (Job Board)**
* `WPA-02.1`: Hiển thị danh sách Job dạng thẻ (Job Card) nổi bật 3 thông tin: Lương, Địa điểm, Vị trí.
* `WPA-02.2`: Bộ lọc trực quan bằng Icon (Khu vực, Ngành nghề, Thời vụ/Chính thức).
* `WPA-02.3`: Nút "Ứng tuyển ngay" (Gửi nhanh SĐT/Thông tin cơ bản cho HR mà không cần điền CV phức tạp).


* **[WPA-03] Chức năng Cộng tác viên (CTV) & Giới thiệu (Referral Program)**
* `WPA-03.1`: Form đăng ký/cập nhật thông tin nhận hoa hồng (Họ tên, CCCD, STK Ngân hàng).
* `WPA-03.2`: Nhập thông tin người được giới thiệu (SĐT, Họ Tên, Dự án muốn ứng tuyển).
* `WPA-03.3`: Dashboard theo dõi trạng thái người được giới thiệu (Chờ phỏng vấn -> Đang làm việc -> Nhận hoa hồng).


* **[WPA-04] Quản lý Thông tin Cán nhân & Công việc (dành cho NLĐ đã vào dự án)**
* `WPA-04.1`: Xem thông tin dự án đang làm việc (Tên nhà máy, Địa điểm, Quản lý phụ trách).
* `WPA-04.2`: Xem lịch sử chấm công cá nhân (được đồng bộ từ máy chấm công tại xưởng).
* `WPA-04.3`: Xem phiếu lương/tạm ứng (Payslip) chi tiết theo kỳ.
* `WPA-04.4`: Nút "Đề nghị tạm ứng lương" (Gửi request về cho Quản lý/Kế toán).
* `WPA-04.5`: Nút "Phản ánh/Khiếu nại" (Sai công, sai lương, vấn đề tại xưởng).



## 2. Module: Quản trị Quan hệ Khách hàng (B2B CRM & Project Management)

*Dành cho Sale, Quản lý dự án (PM), Ban Giám đốc.*

* **[CRM-01] Quản lý Hồ sơ Khách hàng (Company Profiles)**
* `CRM-01.1`: CRUD (Tạo, Đọc, Sửa, Xóa) thông tin Doanh nghiệp thuê lại lao động (Tên pháp nhân, MST, Địa chỉ, File hợp đồng nguyên tắc).
* `CRM-01.2`: Quản lý danh sách Người liên hệ (Contact Persons) tại doanh nghiệp đó.


* **[CRM-02] Quản lý Dự án & Pipeline (Project Kanban)**
* `CRM-02.1`: Khởi tạo dự án trực thuộc 1 Doanh nghiệp (VD: Cung ứng 500 CN cho Samsung).
* `CRM-02.2`: Kanban Board theo dõi trạng thái dự án (Tiếp cận -> Đàm phán -> Ký HĐ -> Thực thi -> Nghiệm thu).
* `CRM-02.3`: Gán nhân sự nội bộ phụ trách dự án (Gán Sales, Gán PM, Gán Kế toán).


* **[CRM-03] Quản lý Thiết bị Chấm công (T&A Device Management)**
* `CRM-03.1`: CRUD thiết bị máy chấm công (Serial Number, Địa chỉ IP, Tên thiết bị, Vị trí đặt).
* `CRM-03.2`: Map (gắn) máy chấm công vào 1 hoặc nhiều Dự án cụ thể để cấu hình luồng đồng bộ vân tay/khuôn mặt.



## 3. Module: Quản trị Kho dữ liệu Người lao động (Talent Pool / ATS)

*Dành cho HR Tuyển dụng, Marketing, Telesales.*

* **[TAL-01] Hồ sơ Người lao động (Worker Master Data)**
* `TAL-01.1`: Lưu trữ toàn bộ thông tin: Basic Info (Tên, SĐT, CCCD), Physical Info (Giới tính, Ngày sinh), Bank Info.
* `TAL-01.2`: Quản lý Vòng đời trạng thái (Lead mới -> Đang làm việc -> Đã nghỉ việc -> Blacklist).


* **[TAL-02] Bộ lọc Nâng cao & Phân khúc (Advanced Filtering)**
* `TAL-02.1`: Lọc động theo độ tuổi (tính toán tự động từ ngày sinh).
* `TAL-02.2`: Lọc theo khu vực, lịch sử dự án đã từng làm, lý do nghỉ việc.
* `TAL-02.3`: Xuất danh sách tệp data ra Excel hoặc chuyển sang chiến dịch Zalo/SMS.


* **[TAL-03] Lịch sử Tương tác (Activity Logs)**
* `TAL-03.1`: Ghi chú lại nội dung các cuộc gọi điện thoại, phỏng vấn.
* `TAL-03.2`: Lịch sử các dự án nhân sự này đã từng tham gia và điểm đánh giá (Rating).



## 4. Module: Quản trị Nhân sự Nội bộ (Internal HRM)

*Dành cho Admin, Trưởng nhóm, HR nội bộ.*

* **[HRM-01] Quản lý Danh sách Nhân sự Nội bộ**
* `HRM-01.1`: CRUD thông tin nhân viên tại chỗ (Mã NV, Họ tên, Ngày vào, Phòng ban, Số TK, Tên đăng nhập).
* `HRM-01.2`: Cấu hình Sơ đồ tổ chức (Cây phòng ban) và Cấp báo cáo (Ai báo cáo cho ai).


* **[HRM-02] Phân quyền Hệ thống (RBAC - Role Based Access Control)**
* `HRM-02.1`: Quản lý Nhóm quyền (Roles: Admin, Kế Toán, Sale, PM, HR).
* `HRM-02.2`: Quản lý Quyền chi tiết (Permissions: View_Project, Edit_Worker, Approve_Payroll...).
* `HRM-02.3`: Phân quyền dữ liệu theo độ sâu (Data-level security): PM chỉ nhìn thấy NLĐ thuộc dự án mình quản lý, Trưởng nhóm thấy data của thành viên trong nhóm.



## 5. Module: Vận hành Thực thi & Kế toán (Operations & Payroll)

*Luồng xử lý cốt lõi liên kết NLĐ và Khách hàng.*

* **[OPS-01] Điều phối & Gán dự án (Onboarding/Offboarding)**
* `OPS-01.1`: Chức năng "Điều động": Gán một tập hợp NLĐ vào một Dự án cụ thể.
* `OPS-01.2`: Tự động kích hoạt API đẩy thông tin (Mã NV) xuống máy chấm công tương ứng của dự án đó.
* `OPS-01.3`: Xử lý luồng Nghỉ việc (Cắt quyền trên máy chấm công, cập nhật trạng thái trong Talent Pool).


* **[OPS-02] Xử lý Công & Lương (Time & Attendance & Payroll)**
* `OPS-02.1`: Webhook/API nhận dữ liệu log quẹt thẻ từ Máy chấm công (Push data).
* `OPS-02.2`: Giao diện Kế toán / BCC (Bảng Chấm Công): Xử lý log thô thành Công chuẩn, đánh dấu Đi muộn/Về sớm/Thiếu công.
* `OPS-02.3`: Xử lý các yêu cầu (Tickets) Phản ánh sai công, Đề nghị ứng lương từ App của NLĐ.
* `OPS-02.4`: Import/Xuất Excel Bảng lương và Tự động tính quỹ hoa hồng cho CTV.



---

Một tình huống nghiệp vụ cực kỳ thực tế và chính xác! Trong ngành cung ứng nhân lực, đây chính là bài toán **Quản lý Thầu phụ (Sub-contracting/Vendor Management)**.

Việc thêm luồng Vendor này sẽ ảnh hưởng sâu sắc đến cách chúng ta lưu trữ dữ liệu (vì người lao động của Vendor sẽ do Vendor trả lương, HRP chỉ đối soát ngày công để thanh toán B2B cho Vendor).

Dưới đây là phần cập nhật bổ sung vào **Master Feature List** để giải quyết triệt để bài toán này, sẵn sàng cho AI coding xử lý:

### Bổ sung Module 6: Quản lý Đối tác cung ứng (Vendor / Sub-contractor Management)

*Dành cho PM, Khối Mua sắm (Procurement) hoặc Ban Giám đốc để quản lý các nguồn cung ngoài.*

* **[VND-01] Quản lý Hồ sơ Vendor (Vendor Profiles)**
* `VND-01.1`: CRUD thông tin pháp nhân Vendor (Tên cty, MST, Người liên hệ, Hợp đồng nguyên tắc B2B).
* `VND-01.2`: Đánh giá năng lực Vendor (Rating/Performance) dựa trên chất lượng nhân sự từng cung cấp.


* **[VND-02] Quản lý Hợp đồng & SLA theo Dự án**
* `VND-02.1`: Chức năng "Tạo yêu cầu thuê ngoài" (Sub-request) bên trong một Dự án chính (VD: Dự án A01 cần 100 người -> Tạo request cấp 40 người cho Vendor X).
* `VND-02.2`: Quản lý đơn giá B2B thỏa thuận với Vendor (Khác với đơn giá trả lương cho NLĐ trực tiếp).


* **[VND-03] Đối soát & Công nợ B2B (Vendor Billing)**
* `VND-03.1`: Tự động tổng hợp tổng số ngày công của tất cả NLĐ thuộc Vendor X tại Dự án A01.
* `VND-03.2`: Xuất biên bản đối soát (Reconciliation) để Kế toán HRP thanh toán tổng tiền cho Vendor (không trả lẻ cho từng NLĐ của Vendor).



---

### Cập nhật các Module hiện tại để tương thích luồng Vendor

**Cập nhật Module 3: Kho dữ liệu Người lao động (Talent Pool)**

* **[TAL-01.3] Phân loại Nguồn gốc Nhân sự (Worker Source):** Thêm trường dữ liệu để phân biệt nhân sự: `HRP_Direct` (Trực tiếp do HRP quản lý) và `Vendor_Supplied` (Gắn kèm ID của Vendor X).

**Cập nhật Module 5: Vận hành Thực thi & Kế toán (Operations)**

* **[OPS-01.4] Điều phối nhân sự Vendor:** Khi PM gán nhân sự vào dự án, hệ thống cho phép import danh sách nhân sự từ Vendor, tự động đẩy mã của họ xuống máy chấm công tại xưởng để dùng chung luồng.
* **[OPS-02.5] Tách bạch Bảng chấm công (BCC):** Giao diện quản lý BCC phải có bộ lọc tách biệt: "Nhân sự HRP" (để chạy bảng lương) và "Nhân sự Vendor" (để xuất báo cáo đối soát B2B).

**Cập nhật Module 1: App Người lao động (Worker App)**

* **[WPA-04.6] Giới hạn tính năng theo Nguồn gốc (Feature Flag):** Nếu App nhận diện user là NLĐ thuộc Vendor (không phải HRP trực tiếp ký HĐ), hệ thống sẽ **ẩn** các nút "Đề nghị tạm ứng lương", "Xem phiếu lương HRP" (vì họ nhận lương từ Vendor). Họ chỉ được sử dụng app để: Xem thông tin dự án, Xem lịch sử chấm công tại xưởng, và báo cáo sai công.

---

Như vậy, hệ thống của bạn giờ đây đã bao phủ toàn trình (End-to-End) từ: Khách hàng cần người -> HRP tuyển dụng trực tiếp -> HRP gọi thêm Vendor hỗ trợ -> Đẩy xuống xưởng chấm công chung 1 máy -> Kế toán tách luồng trả lương (trả NLĐ trực tiếp + trả B2B cho Vendor).

Với bức tranh toàn cảnh này đã hoàn thiện, bạn muốn tôi bắt đầu thiết kế **Cấu trúc Cơ sở dữ liệu (Database Schema) cho hệ thống cốt lõi**, hay chúng ta sẽ phác thảo trước **Luồng màn hình (Screen Flow)** cho phần App để bạn dễ hình dung mặt giao diện?