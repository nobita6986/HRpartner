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
  - Nav: 5 item hiển thị đúng và bảo toàn role visibility. Click không 404.
  - Workers: Filter và render đủ 4 trạng thái DB (tiếng Việt).
  - Ledger: Hiển thị đúng 3 trạng thái tên CTV/Worker, missing ("Chưa có dữ liệu"), và RLS hidden ("Không có quyền xem").
  - Jobs: Đã gỡ bỏ Submissions/Claims.
  - Dashboard: Nhóm lại thành công, href và description giữ nguyên không đổi.

## 3. Risks & Boundaries
- Worker mồ côi hoặc bị che qua RLS có thể lẫn lộn do DB chưa cài Foreign Key (FK), xử lý fallback nhãn ("Chưa có dữ liệu" / "Không có quyền xem") là an toàn và tuân thủ đúng RLS/Data scope.

## 4. Next Steps
- Tier 3 Audit rà soát permission/data-scope cho AD2/AD3.
- Merge PR vào main sau khi hoàn tất Round 1.
