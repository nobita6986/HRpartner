-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM', 'ACCOUNTANT', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "SystemRole" NOT NULL;

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "account_user_id" TEXT;

-- CreateTable
CREATE TABLE "permissions" (
    "code" TEXT NOT NULL,
    "perm_group" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "SystemRole" NOT NULL,
    "permission_code" TEXT NOT NULL,
    "granted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","permission_code")
);

-- CreateTable
CREATE TABLE "user_permission_grants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_code" TEXT NOT NULL,
    "grant_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_permission_grants_user_id_idx" ON "user_permission_grants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_grants_user_id_permission_code_grant_type_key" ON "user_permission_grants"("user_id", "permission_code", "grant_type");

-- CreateIndex
CREATE INDEX "outsourcing_projects_pm_user_id_status_idx" ON "outsourcing_projects"("pm_user_id", "status");

-- CreateIndex
CREATE INDEX "project_assignments_project_id_status_idx" ON "project_assignments"("project_id", "status");

-- CreateIndex
CREATE INDEX "source_claims_vendor_id_accepted_idx" ON "source_claims"("vendor_id", "accepted");

-- CreateIndex
CREATE INDEX "source_claims_ctv_id_accepted_idx" ON "source_claims"("ctv_id", "accepted");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "workers_account_user_id_key" ON "workers"("account_user_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_grants" ADD CONSTRAINT "user_permission_grants_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_grants" ADD CONSTRAINT "user_permission_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outsourcing_projects" ADD CONSTRAINT "outsourcing_projects_pm_user_id_fkey" FOREIGN KEY ("pm_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════════
-- Partial unique indexes (V4.14 G22 — không biểu diễn được trong Prisma schema):
--   1. Referral Guard: DUY NHẤT 1 claim accepted=true / worker
--   2. G14: DUY NHẤT 1 assignment ACTIVE / worker (chuyển dự án bắt buộc qua TRANSFER)
-- ═══════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX one_accepted_source ON source_claims(worker_id) WHERE accepted = true;

CREATE UNIQUE INDEX one_active_assignment ON project_assignments(worker_id) WHERE status = 'ACTIVE';
