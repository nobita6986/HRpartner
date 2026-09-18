-- CreateTable
CREATE TABLE "labor_profile_handling_assignments" (
    "id" TEXT NOT NULL,
    "labor_profile_id" TEXT NOT NULL,
    "assignee_user_id" TEXT NOT NULL,
    "assigned_by_user_id" TEXT,
    "source" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "previous_assignment_id" TEXT,
    "completed_milestone_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "labor_profile_handling_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "labor_profile_handling_assignments_labor_profile_id_idx" ON "labor_profile_handling_assignments"("labor_profile_id");

-- CreateIndex
CREATE INDEX "labor_profile_handling_assignments_assignee_user_id_idx" ON "labor_profile_handling_assignments"("assignee_user_id");

-- CreateIndex (Partial Unique for At-Most-One-Active)
CREATE UNIQUE INDEX "labor_profile_handling_active_idx" ON "labor_profile_handling_assignments"("labor_profile_id") WHERE status = 'ACTIVE';

-- CreateIndex for ReferralAttributions
CREATE UNIQUE INDEX "referral_attributions_labor_profile_id_key" ON "referral_attributions"("labor_profile_id");

-- AddForeignKey
ALTER TABLE "labor_profile_handling_assignments" ADD CONSTRAINT "labor_profile_handling_assignments_labor_profile_id_fkey" FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_profile_handling_assignments" ADD CONSTRAINT "labor_profile_handling_assignments_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_profile_handling_assignments" ADD CONSTRAINT "labor_profile_handling_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_profile_handling_assignments" ADD CONSTRAINT "labor_profile_handling_assignments_previous_assignment_id_fkey" FOREIGN KEY ("previous_assignment_id") REFERENCES "labor_profile_handling_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- AddForeignKey
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_labor_profile_id_fkey" FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
