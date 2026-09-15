# HANDOFF

## 1. Goal
Hoàn thành P2: sửa lỗi "sự thật" (truth defects) của admin module, bao gồm cập nhật UI hiển thị thông tin thực tế thay vì IDs/Status giả mạo, gỡ Submissions/Claims ra khỏi page Jobs, điều chỉnh hiển thị các nhóm chức năng Admin theo phân quyền.

## 2. Evidence
- **AD1**: `src/shared/ui/role-guard/role-guard-layout.tsx` đã thêm 5 trang vào nhóm điều hướng Phase 4 (Nhu cầu, Người, Tài chính, Hệ thống).
- **AD2**: GET `/api/workers` đã chuyển map param `status` thành `employmentStatus` (có precedence cao hơn), giới hạn chỉ 4 enum (`NONE`, `ACTIVE`, `SUSPENDED`, `TERMINATED`), trả 400 và không gọi DB nếu invalid. Giao diện `/admin/workers` cập nhật nhãn tiếng Việt ứng với 4 trạng thái DB. POST không còn gửi `status` giả. Có route test kiểm chứng ở `src/domains/admin/workers-route.test.ts`.
- **AD3**: `ledger.service.ts` query tên CTV & Worker thủ công bên trong transaction scoped bằng RLS. Sổ cái `/admin/commission/ledger` dọn sạch `slice(-8)`, hiển thị tên nếu có, hoặc báo "Chưa có dữ liệu" (khi workerId null) / "Không có quyền xem" (khi RLS che lấp worker). Có unit test kiểm chứng ở `src/domains/commission/ledger.service.test.ts`.
- **AD4**: Loại bỏ các logic, render của Submissions/Claims tab tại `/admin/jobs`. Đổi nhãn thành "Danh sách nhu cầu".
- **AD5**: Dữ liệu navigation của dashboard `app/admin/page.tsx` đã nhóm theo quy trình "Nhu cầu -> Tuyển -> Người -> Bố trí -> Tiền".

## 3. Risks & Boundaries
- Sự cố `vitest` failed do môi trường node_modules missing config (`vitest/config`), đây là lỗi của baseline repository (đã được ghi nhận).
- File test ngoài lề (ví dụ: `intake-writer-integration.test.ts`) bị lỗi `tsc`, nhưng nằm ngoài phạm vi In-Scope nên không chạm vào.
- Worker mồ côi hoặc bị che qua RLS có thể lẫn lộn do DB chưa cài Foreign Key (FK), xử lý fallback nhãn là an toàn.

## 4. Next Steps
- Tier 3 Audit rà soát permission/data-scope cho AD2/AD3.
- Merge PR vào main sau khi hoàn tất Round 1.
