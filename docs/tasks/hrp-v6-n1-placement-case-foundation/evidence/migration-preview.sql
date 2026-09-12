-- CreateEnum
CREATE TYPE "PlacementCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE', 'CLOSED');

-- AlterTable
ALTER TABLE "candidate_submissions" ADD COLUMN     "placement_case_id" TEXT;

-- CreateTable
CREATE TABLE "placement_case" (
    "id" TEXT NOT NULL,
    "labor_profile_id" TEXT NOT NULL,
    "status" "PlacementCaseStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "close_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "placement_case_labor_profile_id_idx" ON "placement_case"("labor_profile_id");

-- CreateIndex
CREATE INDEX "placement_case_status_opened_at_idx" ON "placement_case"("status", "opened_at");

-- AddForeignKey
ALTER TABLE "candidate_submissions" ADD CONSTRAINT "candidate_submissions_placement_case_id_fkey" FOREIGN KEY ("placement_case_id") REFERENCES "placement_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_case" ADD CONSTRAINT "placement_case_labor_profile_id_fkey" FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

