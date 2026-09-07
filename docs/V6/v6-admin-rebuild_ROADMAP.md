# HRP V6 Admin Rebuild — Lộ trình Triển khai (Phases)

Tài liệu này chia nhỏ kế hoạch `v6-admin-rebuild.md` thành các Phase thực thi có tính khả thi cao, ưu tiên xây dựng nền tảng dữ liệu trước để mở đường cho các tính năng nghiệp vụ và phân hệ Affiliate (AFF) chạy song song.

---

## 🚩 ĐIỂM CHIA NHÁNH (PARALLEL POINT)
**Phase 1** là nút thắt cổ chai (bottleneck) của toàn bộ hệ thống. 
Ngay sau khi **Phase 1** hoàn tất và được merge vào nhánh chính (Database đã có schema mới), hai phân hệ **V6 Admin** và **AFF Plan** có thể tiến hành **LÀM SONG SONG** hoàn toàn độc lập.

---

## Phase 1: Móng dữ liệu & Cấu trúc Core (Foundation Schema)
*Mục tiêu: Đập đi xây lại cấu trúc database cốt lõi, chuyển từ `CandidateSubmission` sang `LaborProfile`, tách bạch `JobOpening` và `JobPosting`.*

**Công việc chính:**
- Thêm model `LaborProfile` (Hồ sơ gốc của NLD), thiết lập quan hệ 0..1 với `Worker`.
- Thêm model `LaborProfileIntake` (Lịch sử tiếp nhận NLD).
- Thêm/Tách model `JobOpening` (Vận hành nội bộ) và `JobPosting` (Hiển thị public).
- Thêm model `EmploymentEpisode` (Đợt làm việc) để theo dõi vòng đời làm - nghỉ - quay lại.
- Viết script migration an toàn: Giữ nguyên dữ liệu `CandidateSubmission` hiện tại hoặc backfill một phần dữ liệu cơ bản sang `LaborProfile`.
- Không làm UI ở phase này.

> **Trạng thái:** Bắt buộc làm đầu tiên.
> **Tiếp nối:** Sau phase này, **AFF Track (Từ AFF-01)** bắt đầu có thể code song song.

---

## Phase 2: Workbench Tiếp nhận & Quản lý LaborProfile
*Mục tiêu: Xây dựng bề mặt UI cho nhân viên HRP tiếp nhận và hoàn thiện thông tin ứng viên, không phụ thuộc vào Job.*

**Công việc chính:**
- Dựng trang Danh sách Hồ sơ NLD (`/admin/labor-profiles`) với các filter: của tôi, kho chung, chờ hoàn thiện.
- Form "Tiếp nhận NLD" chia 2 chế độ:
  - Tiếp nhận nhanh (từ điện thoại/chat/mối quan hệ).
  - Hoàn thiện hồ sơ (update thêm CCCD, địa chỉ).
- Tích hợp hàm kiểm tra trùng lặp (Dedup) bằng Số điện thoại/CCCD ngay trong form.
- Trang chi tiết `LaborProfile` (mới có tab thông tin cá nhân và lịch sử Intake).

---

## Phase 3: Quản trị Nhu cầu (Project & Job Management)
*Mục tiêu: Tổ chức lại UI quản lý Khách hàng, Dự án và Tin tuyển dụng.*

**Công việc chính:**
- Cấu trúc lại trang `/admin/projects` và trang chi tiết Dự án.
- UI tạo/sửa `JobOpening` (nhu cầu thực tế: số lượng, đãi ngộ, ca làm).
- UI tạo/sửa/publish `JobPosting` (bề mặt public).
- Xây dựng quan hệ: Từ Dự án -> nhìn thấy các Job Openings -> nhìn thấy các Job Postings tương ứng.

---

## Phase 4: Vòng đời ghép việc (Placement & Employment Lifecycle)
*Mục tiêu: Kết nối LaborProfile với JobOpening thông qua các lần bố trí việc làm.*

**Công việc chính:**
- Trang chi tiết `JobOpening` (Tab hiển thị ai đang quan tâm, ai đang làm, ai đã nghỉ).
- Luồng Xử lý nghiệp vụ trên LaborProfile: 
  - Tạo `Application` / `General Interest`.
  - Luồng Convert NLD thành Worker (chỉ thực hiện 1 lần duy nhất).
- Tính năng **Ghép việc (Placement)**: Gán Assignment mới vào JobOpening.
- Tính năng **Di biến động**: Nút xử lý Worker nghỉ việc, chuyển dự án, hoặc tái tuyển (tạo Assignment / Episode mới).

---

## Phase 5: Giao diện Public Marketplace & Clean up
*Mục tiêu: Cập nhật giao diện bên ngoài của NLD để khớp với cấu trúc JobPosting mới.*

**Công việc chính:**
- Chỉnh sửa trang Danh sách việc làm public để đọc từ `JobPosting` thay vì Project.
- NLD bấm Ứng tuyển -> gọi API ghi nhận vào `LaborProfile` (và `Application`).
- Clean up: Xóa bỏ/ẩn bớt các UI cũ rườm rà (Staffing Order cũ không còn dùng).
- Cập nhật các bảng Dashboard/Tổng quan điều hành.