-- CreateTable
CREATE TABLE "referral_attributions" (
    "id" TEXT NOT NULL,
    "referrer_user_id" TEXT NOT NULL,
    "affiliate_code_snapshot" TEXT NOT NULL,
    "first_clicked_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "labor_profile_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_attributions_referrer_user_id_idx" ON "referral_attributions"("referrer_user_id");
CREATE INDEX "referral_attributions_status_idx" ON "referral_attributions"("status");

-- AddForeignKey
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_labor_profile_id_fkey" FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- CHECK constraint for status
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_status_check" CHECK (status IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED'));

-- Triggers for constraints

-- Layer 1 immutable update
CREATE OR REPLACE FUNCTION hrp_ra_immutable_update_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.referrer_user_id <> OLD.referrer_user_id OR NEW.affiliate_code_snapshot <> OLD.affiliate_code_snapshot OR NEW.first_clicked_at <> OLD.first_clicked_at OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'Immutable fields cannot be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_attributions_immutable_update_trg
BEFORE UPDATE ON referral_attributions
FOR EACH ROW
EXECUTE FUNCTION hrp_ra_immutable_update_fn();

-- Layer 1b write-once labor_profile_id
CREATE OR REPLACE FUNCTION hrp_ra_labor_profile_id_write_once_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.labor_profile_id IS NOT NULL AND NEW.labor_profile_id IS DISTINCT FROM OLD.labor_profile_id THEN
    RAISE EXCEPTION 'labor_profile_id is write-once';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_attributions_labor_profile_id_write_once_trg
BEFORE UPDATE ON referral_attributions
FOR EACH ROW
EXECUTE FUNCTION hrp_ra_labor_profile_id_write_once_fn();

-- Layer 1c lifecycle transition matrix
CREATE OR REPLACE FUNCTION hrp_ra_lifecycle_transition_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Terminal states cannot transition to anything else
  IF OLD.status IN ('CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot transition from terminal state %', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_attributions_lifecycle_transition_trg
BEFORE UPDATE ON referral_attributions
FOR EACH ROW
EXECUTE FUNCTION hrp_ra_lifecycle_transition_fn();


-- Privileges and RLS
GRANT USAGE ON SCHEMA public TO app_engine_writer, app_user_writer;
GRANT SELECT, INSERT, UPDATE ON "referral_attributions" TO app_engine_writer;
GRANT SELECT, INSERT, UPDATE ON "referral_attributions" TO app_user_writer;

ALTER TABLE "referral_attributions" ENABLE ROW LEVEL SECURITY;

-- Engine RLS Policies (requires hrp.engine_context = 'true')
CREATE POLICY "hrp_ra_insert_engine" ON "referral_attributions"
FOR INSERT TO app_engine_writer
WITH CHECK (COALESCE(current_setting('hrp.engine_context', true), '') IN ('link-capture', 'consume', 'milestone'));

CREATE POLICY "hrp_ra_update_engine" ON "referral_attributions"
FOR UPDATE TO app_engine_writer
USING (COALESCE(current_setting('hrp.engine_context', true), '') IN ('consume', 'milestone'))
WITH CHECK (COALESCE(current_setting('hrp.engine_context', true), '') IN ('consume', 'milestone'));

CREATE POLICY "hrp_ra_select_engine" ON "referral_attributions"
FOR SELECT TO app_engine_writer
USING (COALESCE(current_setting('hrp.engine_context', true), '') IN ('link-capture', 'consume', 'milestone'));

-- User RLS Policies
CREATE POLICY "hrp_ra_select" ON "referral_attributions"
FOR SELECT TO app_user_writer
USING (referrer_user_id = COALESCE(current_setting('request.jwt.claim.sub', true), ''));

CREATE POLICY "hrp_ra_update" ON "referral_attributions"
FOR UPDATE TO app_user_writer
USING (referrer_user_id = COALESCE(current_setting('request.jwt.claim.sub', true), ''));
