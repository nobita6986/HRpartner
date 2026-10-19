-- Android remaining contract: feedback, referral policy/referrals, and phone OTP state.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified_at" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackStatus') THEN
    CREATE TYPE "FeedbackStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'RECEIVED',
  "admin_response" TEXT,
  "responded_by_id" TEXT,
  "responded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "feedbacks_user_id_created_at_idx" ON "feedbacks"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "feedbacks_status_created_at_idx" ON "feedbacks"("status", "created_at");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feedbacks_user_id_fkey') THEN
    ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feedbacks_responded_by_id_fkey') THEN
    ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "referral_program_policies" (
  "id" TEXT NOT NULL,
  "policy_version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "eligibility_criteria" TEXT NOT NULL,
  "success_event_description" TEXT NOT NULL,
  "reward_policy_description" TEXT NOT NULL,
  "terms_and_conditions" TEXT NOT NULL,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "published_by_id" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_program_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "referral_program_policies_policy_version_key" ON "referral_program_policies"("policy_version");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='referral_program_policies_published_by_id_fkey') THEN
    ALTER TABLE "referral_program_policies" ADD CONSTRAINT "referral_program_policies_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkerReferralStatus') THEN
    CREATE TYPE "WorkerReferralStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'QUALIFIED', 'REWARD_APPROVED', 'PAID', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferralBenefitStatus') THEN
    CREATE TYPE "ReferralBenefitStatus" AS ENUM ('NONE', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED');
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "worker_referrals" (
  "id" TEXT NOT NULL,
  "referrer_user_id" TEXT NOT NULL,
  "referred_name_ciphertext" TEXT NOT NULL,
  "referred_phone_ciphertext" TEXT NOT NULL,
  "referred_phone_lookup_hash" TEXT NOT NULL,
  "job_interest" TEXT,
  "consent_to_contact" BOOLEAN NOT NULL,
  "consented_at" TIMESTAMP(3) NOT NULL,
  "policy_version_id" TEXT NOT NULL,
  "status" "WorkerReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
  "candidate_submission_id" TEXT,
  "benefit_status" "ReferralBenefitStatus" NOT NULL DEFAULT 'NONE',
  "benefit_amount_vnd" BIGINT,
  "reconciliation_note" TEXT,
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "worker_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "worker_referrals_candidate_submission_id_key" ON "worker_referrals"("candidate_submission_id");
CREATE INDEX IF NOT EXISTS "worker_referrals_referrer_user_id_created_at_idx" ON "worker_referrals"("referrer_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "worker_referrals_referred_phone_lookup_hash_idx" ON "worker_referrals"("referred_phone_lookup_hash");
CREATE INDEX IF NOT EXISTS "worker_referrals_status_created_at_idx" ON "worker_referrals"("status", "created_at");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='worker_referrals_referrer_user_id_fkey') THEN
    ALTER TABLE "worker_referrals" ADD CONSTRAINT "worker_referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='worker_referrals_policy_version_id_fkey') THEN
    ALTER TABLE "worker_referrals" ADD CONSTRAINT "worker_referrals_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "referral_program_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='worker_referrals_candidate_submission_id_fkey') THEN
    ALTER TABLE "worker_referrals" ADD CONSTRAINT "worker_referrals_candidate_submission_id_fkey" FOREIGN KEY ("candidate_submission_id") REFERENCES "candidate_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='worker_referrals_reviewed_by_id_fkey') THEN
    ALTER TABLE "worker_referrals" ADD CONSTRAINT "worker_referrals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedbacks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hrp_feedback_select" ON "feedbacks";
CREATE POLICY "hrp_feedback_select" ON "feedbacks" FOR SELECT USING (
  hrp_session_role() IN ('ADMIN','DIRECTOR','HR_MANAGER') OR
  (hrp_session_role() = 'WORKER' AND "user_id" = hrp_session_user_id())
);
DROP POLICY IF EXISTS "hrp_feedback_insert" ON "feedbacks";
CREATE POLICY "hrp_feedback_insert" ON "feedbacks" FOR INSERT WITH CHECK (
  hrp_session_role() = 'WORKER' AND "user_id" = hrp_session_user_id()
);
DROP POLICY IF EXISTS "hrp_feedback_admin_update" ON "feedbacks";
CREATE POLICY "hrp_feedback_admin_update" ON "feedbacks" FOR UPDATE USING (
  hrp_session_role() IN ('ADMIN','DIRECTOR','HR_MANAGER')
) WITH CHECK (hrp_session_role() IN ('ADMIN','DIRECTOR','HR_MANAGER'));

ALTER TABLE "referral_program_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_program_policies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hrp_referral_policy_read" ON "referral_program_policies";
CREATE POLICY "hrp_referral_policy_read" ON "referral_program_policies" FOR SELECT USING (
  ("is_enabled" = true AND "published_at" IS NOT NULL) OR hrp_session_role() IN ('ADMIN','DIRECTOR','HR_MANAGER')
);
DROP POLICY IF EXISTS "hrp_referral_policy_admin_write" ON "referral_program_policies";
CREATE POLICY "hrp_referral_policy_admin_write" ON "referral_program_policies" FOR ALL USING (
  hrp_session_role() IN ('ADMIN','DIRECTOR')
) WITH CHECK (hrp_session_role() IN ('ADMIN','DIRECTOR'));

ALTER TABLE "worker_referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "worker_referrals" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hrp_worker_referral_select" ON "worker_referrals";
CREATE POLICY "hrp_worker_referral_select" ON "worker_referrals" FOR SELECT USING (
  hrp_session_role() IN ('ADMIN','DIRECTOR','HR_MANAGER') OR
  (hrp_session_role() = 'WORKER' AND "referrer_user_id" = hrp_session_user_id())
);
DROP POLICY IF EXISTS "hrp_worker_referral_insert" ON "worker_referrals";
CREATE POLICY "hrp_worker_referral_insert" ON "worker_referrals" FOR INSERT WITH CHECK (
  hrp_session_role() = 'WORKER' AND "referrer_user_id" = hrp_session_user_id()
);
DROP POLICY IF EXISTS "hrp_worker_referral_admin_update" ON "worker_referrals";
CREATE POLICY "hrp_worker_referral_admin_update" ON "worker_referrals" FOR UPDATE USING (
  hrp_session_role() IN ('ADMIN','DIRECTOR','HR_MANAGER')
) WITH CHECK (hrp_session_role() IN ('ADMIN','DIRECTOR','HR_MANAGER'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='users' AND column_name='phone_verified')
    OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='feedbacks')
    OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='referral_program_policies')
    OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='worker_referrals')
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='feedbacks' AND relrowsecurity AND relforcerowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='worker_referrals' AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE EXCEPTION 'mobile feedback/referral migration assertion failed';
  END IF;
END $$;
