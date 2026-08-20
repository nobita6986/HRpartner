-- hrp-m12.1.1-db-grants.sql
-- Mục tiêu: cấp quyền cho role app_user_writer (RLS-on runtime) trên schema public
-- để fix DEV-02/03 (42501 permission denied) sau khi M11.1 db push reset grants.
--
-- Tham chiếu: TASK hrp-m12.1.1-db-grants §4 RQ-01.
--
-- Lưu ý: app_user_writer có RLS ON, không BYPASSRLS. RLS policies vẫn là
-- điểm kiểm soát truy cập dòng (row-level); GRANT ở đây chỉ là quyền
-- schema-level (bảng/sequence) để Prisma client có thể execute query.

-- Schema usage (cần thiết để SET search_path = public hoạt động)
GRANT USAGE ON SCHEMA public TO app_user_writer;

-- Quyền trên tất cả bảng hiện tại
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_writer;

-- Quyền trên tất cả sequence hiện tại (cho serial/id autoincrement)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user_writer;

-- Default privileges cho bảng/sequence tạo trong tương lai
-- (sau khi ALTER TABLE … ADD COLUMN … DEFAULT nextval(…) vẫn cần grant này)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer;
