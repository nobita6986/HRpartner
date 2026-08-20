-- Migration: m13_backend_expansion
-- Purpose: M13 — mở rộng schema hỗ trợ multi-tier quản lý.
--   Project: thêm 2 phó PM (subPmUserId1, subPmUserId2) — quan hệ tới users.id (nullable).
--   Worker : thêm managerId — quan hệ tới users.id (nullable).
-- Tham chiếu: TASK hrp-m13-backend-expansion §4 RQ-01/RQ-02, §5 STEP-02.
--
-- Lưu ý:
--   - Tất cả cột mới đều nullable + FK ON DELETE SET NULL → không phá dữ liệu cũ (DA-2026-018, …).
--   - Không cần sửa RLS policies hiện hành (hrp_project_scope, hrp_worker_scope) vì
--     các policy đó không tham chiếu các cột mới. Khi RLS được cập nhật để bao gồm
--     sub-PM/manager scope, sẽ là migration M13.x tiếp theo.
--   - Cột mới được tạo trong schema public sẽ tự động thừa hưởng GRANT default privileges
--     (đã set ở prisma/grants-hrp-m12.1.1.sql) cho app_user_writer.

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "manager_id" TEXT;

ALTER TABLE "outsourcing_projects" ADD COLUMN     "sub_pm_user_id_1" TEXT,
ADD COLUMN     "sub_pm_user_id_2" TEXT;

-- CreateIndex
CREATE INDEX "workers_manager_id_idx" ON "workers"("manager_id");

CREATE INDEX "outsourcing_projects_sub_pm_user_id_1_idx" ON "outsourcing_projects"("sub_pm_user_id_1");

CREATE INDEX "outsourcing_projects_sub_pm_user_id_2_idx" ON "outsourcing_projects"("sub_pm_user_id_2");

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "outsourcing_projects" ADD CONSTRAINT "outsourcing_projects_sub_pm_user_id_1_fkey" FOREIGN KEY ("sub_pm_user_id_1") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "outsourcing_projects" ADD CONSTRAINT "outsourcing_projects_sub_pm_user_id_2_fkey" FOREIGN KEY ("sub_pm_user_id_2") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
