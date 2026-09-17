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
CREATE OR REPLACE FUNCTION referral_attributions_immutable_update()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id <> OLD.id THEN RAISE EXCEPTION 'id is immutable'; END IF;
  IF NEW.referrer_user_id       IS DISTINCT FROM OLD.referrer_user_id       THEN RAISE EXCEPTION 'referrer_user_id is immutable';       END IF;
  IF NEW.affiliate_code_snapshot IS DISTINCT FROM OLD.affiliate_code_snapshot THEN RAISE EXCEPTION 'affiliate_code_snapshot is immutable'; END IF;
  IF NEW.first_clicked_at       IS DISTINCT FROM OLD.first_clicked_at       THEN RAISE EXCEPTION 'first_clicked_at is immutable';       END IF;
  IF NEW.expires_at             IS DISTINCT FROM OLD.expires_at             THEN RAISE EXCEPTION 'expires_at is immutable';             END IF;
  IF NEW.created_at             IS DISTINCT FROM OLD.created_at             THEN RAISE EXCEPTION 'created_at is immutable';             END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER referral_attributions_immutable_update_trg
  BEFORE UPDATE ON referral_attributions
  FOR EACH ROW EXECUTE FUNCTION referral_attributions_immutable_update();

-- Layer 1b write-once labor_profile_id
CREATE OR REPLACE FUNCTION referral_attributions_labor_profile_id_write_once()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.labor_profile_id IS NOT NULL AND length(NEW.labor_profile_id) = 0 THEN
      RAISE EXCEPTION 'labor_profile_id empty';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.labor_profile_id IS NULL AND NEW.labor_profile_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    IF OLD.labor_profile_id IS NOT NULL AND NEW.labor_profile_id IS DISTINCT FROM OLD.labor_profile_id THEN
      RAISE EXCEPTION 'labor_profile_id is write-once (NULL -> value only)';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER referral_attributions_labor_profile_id_write_once_trg
  BEFORE INSERT OR UPDATE ON referral_attributions
  FOR EACH ROW EXECUTE FUNCTION referral_attributions_labor_profile_id_write_once();

-- Layer 1c lifecycle transition matrix
CREATE OR REPLACE FUNCTION referral_attributions_lifecycle_transition()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  terminal_statuses CONSTANT TEXT[] := ARRAY['CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED'];
  allowed_next CONSTANT TEXT[] := ARRAY['CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED'];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = ANY(terminal_statuses) THEN
      RAISE EXCEPTION 'referral_attributions: terminal status % cannot transition to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'ACTIVE' AND NOT (NEW.status = ANY(allowed_next)) THEN
      RAISE EXCEPTION 'referral_attributions: status % can only transition to CONSUMED|EXPIRED|REVOKED|SUPERSEDED, got %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER referral_attributions_lifecycle_transition_trg
  BEFORE UPDATE ON referral_attributions
  FOR EACH ROW EXECUTE FUNCTION referral_attributions_lifecycle_transition();

-- Layer 5: Block delete
CREATE OR REPLACE FUNCTION referral_attributions_block_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'referral_attributions rows are never deleted'; END $$;

CREATE TRIGGER referral_attributions_block_delete_trg
  BEFORE DELETE ON referral_attributions FOR EACH ROW EXECUTE FUNCTION referral_attributions_block_delete();


-- Engine Provisioning
DO $$
DECLARE
  r pg_roles%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_engine_writer') THEN
    CREATE ROLE app_engine_writer LOGIN NOINHERIT;
  END IF;
END
$$;

REVOKE ALL PRIVILEGES ON referral_attributions FROM app_engine_writer;

DO $$
DECLARE
  membership_role_text TEXT;
  membership_cur CURSOR FOR
    SELECT gr.rolname::TEXT AS granted_role_name
    FROM pg_auth_members m
    JOIN pg_roles gr ON gr.oid = m.roleid
    WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
      AND gr.rolname != 'app_engine_writer';
BEGIN
  OPEN membership_cur;
  LOOP
    FETCH membership_cur INTO membership_role_text;
    EXIT WHEN NOT FOUND;
    EXECUTE format('REVOKE %I FROM app_engine_writer', membership_role_text);
  END LOOP;
  CLOSE membership_cur;
END
$$;

ALTER ROLE app_engine_writer NOINHERIT NOREPLICATION;

DO $$
DECLARE
  r pg_roles%ROWTYPE;
  unexpected_members TEXT;
  unexpected_owned_schemas TEXT;
  unexpected_owned_objects TEXT;
BEGIN
  SELECT * INTO r FROM pg_roles WHERE rolname = 'app_engine_writer';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer role missing after provisioning';
  END IF;

  IF r.rolcanlogin = false THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must be LOGIN (found NOLOGIN)';
  END IF;
  IF r.rolsuper = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT be SUPERUSER';
  END IF;
  IF r.rolbypassrls = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT be BYPASSRLS';
  END IF;
  IF r.rolinherit = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT INHERIT';
  END IF;
  IF r.rolreplication = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT be REPLICATION';
  END IF;

  SELECT string_agg(gr.rolname::TEXT, ', ' ORDER BY gr.rolname)
  INTO unexpected_members
  FROM pg_auth_members m
  JOIN pg_roles gr ON gr.oid = m.roleid
  WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
    AND gr.rolname != 'app_engine_writer';
  IF unexpected_members IS NOT NULL THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer has unexpected memberships: %', unexpected_members;
  END IF;

  SELECT string_agg(nspname, ', ' ORDER BY nspname)
  INTO unexpected_owned_schemas
  FROM pg_namespace
  WHERE nspowner = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
    AND nspname <> 'information_schema'
    AND nspname NOT LIKE 'pg_%';
  IF unexpected_owned_schemas IS NOT NULL THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must not own application schemas: %', unexpected_owned_schemas;
  END IF;

  SELECT string_agg(nspname || '.' || relname, ', ' ORDER BY nspname, relname)
  INTO unexpected_owned_objects
  FROM (
    SELECT c.relnamespace::regnamespace::text AS nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relowner = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
      AND n.nspname <> 'information_schema'
      AND n.nspname NOT LIKE 'pg_%'
  ) t;
  IF unexpected_owned_objects IS NOT NULL THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must not own any application objects: %', unexpected_owned_objects;
  END IF;
END
$$;

-- Privileges
GRANT USAGE ON SCHEMA public TO app_engine_writer;
GRANT SELECT, INSERT, UPDATE ON referral_attributions TO app_engine_writer;
REVOKE DELETE ON referral_attributions FROM app_engine_writer;

GRANT USAGE ON SCHEMA public TO app_user_writer;
-- For human users, grant SELECT and UPDATE, NO INSERT (explicitly denied in DISCOVERY)
GRANT SELECT ON referral_attributions TO app_user;
GRANT SELECT, UPDATE ON referral_attributions TO app_user_writer;
REVOKE DELETE ON referral_attributions FROM app_user_writer;
REVOKE INSERT ON referral_attributions FROM app_user_writer;

-- Row Level Security
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_ra_select ON referral_attributions
  AS PERMISSIVE FOR SELECT TO app_user
  USING (
    hrp_session_role() = 'ADMIN'
    OR referrer_user_id = hrp_session_user_id()
  );



CREATE POLICY hrp_ra_update ON referral_attributions
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    hrp_session_role() = 'ADMIN'
  )
  WITH CHECK (
    hrp_session_role() = 'ADMIN'
  );

CREATE POLICY hrp_ra_select_engine ON referral_attributions
  AS PERMISSIVE FOR SELECT TO app_engine_writer
  USING (
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('link-capture', 'consume', 'milestone')
  );

CREATE POLICY hrp_ra_insert_engine ON referral_attributions
  AS PERMISSIVE FOR INSERT TO app_engine_writer
  WITH CHECK (
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('link-capture', 'consume', 'milestone')
  );

CREATE POLICY hrp_ra_update_engine ON referral_attributions
  AS PERMISSIVE FOR UPDATE TO app_engine_writer
  USING (
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('consume', 'milestone')
  )
  WITH CHECK (
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('consume', 'milestone')
  );
