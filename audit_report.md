# Báo cáo Audit & Kế hoạch Refactor (System Architecture & Tech Debt)

## 🔴 Tình trạng khẩn cấp (High Priority)
- **Thiếu kiểm soát ở Trust Boundary/Bảo mật**: Một số file cấu hình và logic bảo mật (như integration tests, rls config) có dấu hiệu bị hardcode dummy data hoặc lạm dụng URL bypass (mặc dù đã có cơ chế ENV_BLOCKED). Cần rà soát kỹ các endpoint API để đảm bảo không rò rỉ dữ liệu qua các kịch bản test trên môi trường CI/CD.
- **Rủi ro rò rỉ secret**: Quá trình khởi tạo và config đôi khi phụ thuộc vào file `.env` cục bộ cho các kịch bản fallback. 
- **Black boxes trong xử lý phân quyền**: Khá nhiều logic cấp phép và xác thực (authorization scopes, RBAC/matrix-scope) phức tạp và được sinh tự động bởi nhiều session AI. Rất dễ xảy ra lỗ hổng bỏ sót quyền truy cập (missing validation) nếu không có integration tests bao phủ 100% boundary.

## 🟡 Nợ kỹ thuật (Medium Priority - Tech Debt)
- **Lạm dụng kiểu dữ liệu `any`**: Cấu hình ESLint hiện tại ghi nhận hơn 400 cảnh báo (chủ yếu là `@typescript-eslint/no-explicit-any` và biến không được sử dụng `no-unused-vars`). Điều này phá vỡ tính an toàn kiểu (type-safety) của TypeScript và gây khó khăn cho việc bảo trì.
- **Code lặp lại (DRY violations) trong Testing**: Nhiều test file (như `attendance/ticket.service.test.ts`, `auth/matrix-scope.test.ts`, v.v.) bị lặp lại các kịch bản khởi tạo mock data hoặc setup DB connection.
- **Tồn dư scripts "rác" ở thư mục root**: Có quá nhiều file scripts một lần (one-off scripts) nằm rải rác ở gốc (như `fix_m8.py`, `write_m9_task.ps1`, `test_api.cjs`, `check.js`). Chúng làm rối loạn cấu trúc thư mục gốc.

## 🟢 Cải thiện hệ thống (Low Priority)
- **Chuẩn hóa Naming Convention**: Cần quy định rõ cách đặt tên file (hiện tại đang lẫn lộn giữa `kebab-case.ts`, `snake_case.py` và `camelCase.js` ở thư mục root).
- **Bổ sung Documentation & Comments**: Rất nhiều hàm nội bộ ở trong thư mục `src/domains/` thiếu docstrings hoặc TSDoc giải thích đầu vào/đầu ra, khiến cho AI agent sau vào đọc như một "black box".
- **Dọn dẹp thư mục gốc**: Gom nhóm toàn bộ các file scripts `.py`, `.js`, `.cjs`, `.ps1` rời rạc vào một thư mục `scripts/maintenance/` hoặc `scripts/migrations/`.

## 📋 Kế hoạch hành động chi tiết (Step-by-Step Action Plan)
- **Giai đoạn 1 (Phase 1): Dọn dẹp nợ kỹ thuật Type-Safety & Files rác**
  - Quét toàn bộ các lỗi `any` trong `src/shared/auth/` và `src/domains/` để định nghĩa lại Interface/Type cụ thể.
  - Xóa hoặc di chuyển toàn bộ các file `.py`, `.cjs`, `.js` rác (ví dụ: `fix_m1.py`, `check_user.cjs`, `test_db_role.cjs`) vào thư mục `scripts/archive/`.
- **Giai đoạn 2 (Phase 2): Refactor logic Authentication & Phân quyền (Trust Boundary)**
  - Tái cấu trúc (Refactor) các hàm phân quyền phức tạp trong `src/shared/auth/permission-resolver.ts` và `matrix-scope.ts`.
  - Tách bạch rõ logic kiểm tra RLS (Row Level Security) khỏi application logic để tránh "blind spots" bảo mật. Bổ sung error handling tường minh thay vì throw generic error.
- **Giai đoạn 3 (Phase 3): Chuẩn hóa Testing & Cấu trúc mã nguồn**
  - Áp dụng pattern *Test Fixtures* hoặc *Factory* để giảm thiểu lặp code trong các file `*.test.ts` (đặc biệt là các bài test về attendance và staffing).
  - Cập nhật toàn bộ comments/TSDoc cho các Core Services và Utilities, thống nhất Naming Convention cho toàn dự án.
