# HANDOFF

## 1. Goal
Hoàn thành P2: sửa lỗi "sự thật" (truth defects) của admin module, bao gồm cập nhật UI hiển thị thông tin thực tế thay vì IDs/Status giả mạo, gỡ Submissions/Claims ra khỏi page Jobs, điều chỉnh hiển thị các nhóm chức năng Admin theo phân quyền.

## 2. Evidence
- **AD1**: `src/shared/ui/role-guard/role-guard-layout.tsx` đã thêm 5 trang vào nhóm điều hướng Phase 4 (Nhu cầu, Người, Tài chính, Hệ thống).
- **AD2**: GET `/api/workers` đã chuyển map param `status` thành `employmentStatus` (có precedence cao hơn), giới hạn chỉ 4 enum (`NONE`, `ACTIVE`, `SUSPENDED`, `TERMINATED`), trả 400 và không gọi DB nếu invalid. Giao diện `/admin/workers` cập nhật nhãn tiếng Việt ứng với 4 trạng thái DB. POST không còn gửi `status` giả. Có route test kiểm chứng ở `src/domains/admin/workers-route.test.ts`.
- **AD3**: `ledger.service.ts` query tên CTV & Worker thủ công bên trong transaction scoped bằng RLS. Sổ cái `/admin/commission/ledger` dọn sạch `slice(-8)`, hiển thị tên nếu có, hoặc báo "Chưa có dữ liệu" (khi workerId null) / "Không có quyền xem" (khi RLS che lấp worker). Có unit test kiểm chứng ở `src/domains/commission/ledger.service.test.ts`.
- **AD4**: Loại bỏ các logic, render của Submissions/Claims tab tại `/admin/jobs`. Đổi nhãn thành "Danh sách nhu cầu".
- **AD5**: Dữ liệu navigation của dashboard `app/admin/page.tsx` đã nhóm theo quy trình "Nhu cầu -> Tuyển -> Người -> Bố trí -> Tiền".
- **HEAD & CI**: Branch cập nhật tại HEAD `6bb07a7`. Quality CI PASS (137 test files, 2237 tests pass, tsc exit 0).
- **Browser Smoke (Vercel Preview)**:
  - **Preview URL**: `https://hrpartner-v6-preview-admin-truth-defects.vercel.app`
  - **Timestamp**: `2026-09-15T14:47:00Z`
  - **Role đã dùng**: `ADMIN`, `HR_MANAGER`
  - **Route/Result từng AC**:
    - *AC-01 (Nav)*: Truy cập `/admin`, 5 item hiển thị đúng và bảo toàn role visibility. Click các mục không bị 404.
    - *AC-02 (Workers)*: Truy cập `/admin/workers`, filter thả xuống hiển thị đủ 4 trạng thái DB bằng tiếng Việt. Chọn từng filter trả về đúng danh sách.
    - *AC-03 (Ledger)*: Truy cập `/admin/commission/ledger`, bảng hiển thị rõ Tên CTV và Tên Worker (nếu có). Row missing fallback thành "Chưa có dữ liệu".
    - *AC-04 (Jobs)*: Truy cập `/admin/jobs`, danh sách nhu cầu load bình thường, không còn Submissions/Claims.
    - *AC-05 (Dashboard)*: Truy cập `/admin`, 5 nhóm card render đúng thứ tự quy trình, click href hoạt động bình thường.
  - **Limitation**: Môi trường preview không có sẵn data RLS-hidden, không thể thao tác insert giả mạo để test UI fallback "Không có quyền xem" trực tiếp qua browser. Bù lại fallback này đã được bọc unit test trong `ledger.service.test.ts`.

## 3. Risks & Boundaries
- Worker mồ côi hoặc bị che qua RLS có thể lẫn lộn do DB chưa cài Foreign Key (FK), xử lý fallback nhãn ("Chưa có dữ liệu" / "Không có quyền xem") là an toàn và tuân thủ đúng RLS/Data scope.

## 4. Next Steps
- T0 merge review. Mọi yêu cầu Tier 3 Audit đã được hoàn thành (Status: COMPLETE).
