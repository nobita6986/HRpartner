-- ============================================================================
-- Migration: 20261112110000_bi_worker_sync_v1
-- Task:      hrp-bi-worker-sync-v1 (RQ-01)
-- Purpose:   Additive schema for Mini-BI -> HRP Project/GPS Catalog & Worker
--            Episodes synchronization, CCCD login first-password rotation,
--            initial credentials vault, and worker self-edit field tracking.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — Additive columns on existing tables
-- ---------------------------------------------------------------------------
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "workers"
  ADD COLUMN IF NOT EXISTS "self_edited_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "sites"
  ADD COLUMN IF NOT EXISTS "source_system" TEXT,
  ADD COLUMN IF NOT EXISTS "external_ref" TEXT;

ALTER TABLE "project_assignments"
  ADD COLUMN IF NOT EXISTS "source_system" TEXT,
  ADD COLUMN IF NOT EXISTS "external_ref" TEXT,
  ADD COLUMN IF NOT EXISTS "recruiter_external_id" TEXT,
  ADD COLUMN IF NOT EXISTS "recruiter_name" TEXT,
  ADD COLUMN IF NOT EXISTS "recruiter_code" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sites_source_system_external_ref_key'
      AND conrelid = 'sites'::regclass
  ) THEN
    ALTER TABLE "sites"
      ADD CONSTRAINT "sites_source_system_external_ref_key"
      UNIQUE ("source_system", "external_ref");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_assignments_source_system_external_ref_key'
      AND conrelid = 'project_assignments'::regclass
  ) THEN
    ALTER TABLE "project_assignments"
      ADD CONSTRAINT "project_assignments_source_system_external_ref_key"
      UNIQUE ("source_system", "external_ref");
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — Create BI sync & credential tables (idempotent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "external_entity_links" (
  "id" TEXT NOT NULL,
  "source_system" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "hrp_id" TEXT,
  "last_sync_version" BIGINT NOT NULL DEFAULT 0,
  "is_tombstoned" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_entity_links_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_entity_links_source_system_entity_type_external_id_key'
      AND conrelid = 'external_entity_links'::regclass
  ) THEN
    ALTER TABLE "external_entity_links"
      ADD CONSTRAINT "external_entity_links_source_system_entity_type_external_id_key"
      UNIQUE ("source_system", "entity_type", "external_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "external_entity_links_entity_type_hrp_id_idx"
  ON "external_entity_links"("entity_type", "hrp_id");

CREATE TABLE IF NOT EXISTS "bi_sync_runs" (
  "id" TEXT NOT NULL,
  "trigger_source" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'INCREMENTAL',
  "status" TEXT NOT NULL,
  "checkpoint_before" TEXT,
  "checkpoint_after" TEXT,
  "catalog_projects_synced" INTEGER NOT NULL DEFAULT 0,
  "episodes_fetched" INTEGER NOT NULL DEFAULT 0,
  "episodes_applied" INTEGER NOT NULL DEFAULT 0,
  "episodes_skipped" INTEGER NOT NULL DEFAULT 0,
  "tombstones_processed" INTEGER NOT NULL DEFAULT 0,
  "exceptions_opened" INTEGER NOT NULL DEFAULT 0,
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "bi_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "bi_sync_runs_started_at_idx"
  ON "bi_sync_runs"("started_at");

CREATE TABLE IF NOT EXISTS "bi_sync_exceptions" (
  "id" TEXT NOT NULL,
  "exception_type" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "project_external_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "last_sync_version" BIGINT NOT NULL DEFAULT 0,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bi_sync_exceptions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bi_sync_exceptions_exception_type_external_id_key'
      AND conrelid = 'bi_sync_exceptions'::regclass
  ) THEN
    ALTER TABLE "bi_sync_exceptions"
      ADD CONSTRAINT "bi_sync_exceptions_exception_type_external_id_key"
      UNIQUE ("exception_type", "external_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "bi_sync_exceptions_status_exception_type_idx"
  ON "bi_sync_exceptions"("status", "exception_type");

CREATE TABLE IF NOT EXISTS "bi_sync_credentials" (
  "id" TEXT NOT NULL DEFAULT 'primary' CHECK ("id" = 'primary'),
  "base_url" TEXT NOT NULL,
  "api_key_ciphertext" TEXT NOT NULL,
  "worker_sync_checkpoint" TEXT,
  "updated_by_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bi_sync_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "worker_initial_credentials" (
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "worker_id" TEXT NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "project_id" TEXT REFERENCES "outsourcing_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "ciphertext" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_initial_credentials_pkey" PRIMARY KEY ("user_id")
);

CREATE INDEX IF NOT EXISTS "worker_initial_credentials_project_id_idx"
  ON "worker_initial_credentials"("project_id");

CREATE INDEX IF NOT EXISTS "worker_initial_credentials_worker_id_idx"
  ON "worker_initial_credentials"("worker_id");

-- ---------------------------------------------------------------------------
-- SECTION 3 — Enable & Force RLS + Policies + Grants
-- ---------------------------------------------------------------------------
ALTER TABLE "external_entity_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "external_entity_links" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hrp_external_entity_link_scope" ON "external_entity_links";
CREATE POLICY "hrp_external_entity_link_scope" ON "external_entity_links"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR'))
  WITH CHECK (hrp_session_role() IN ('ADMIN', 'HR_MANAGER'));

GRANT SELECT, INSERT, UPDATE, DELETE ON "external_entity_links" TO app_user_writer, app_user;

ALTER TABLE "bi_sync_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bi_sync_runs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hrp_bi_sync_run_scope" ON "bi_sync_runs";
CREATE POLICY "hrp_bi_sync_run_scope" ON "bi_sync_runs"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR'))
  WITH CHECK (hrp_session_role() IN ('ADMIN', 'HR_MANAGER'));

GRANT SELECT, INSERT, UPDATE, DELETE ON "bi_sync_runs" TO app_user_writer, app_user;

ALTER TABLE "bi_sync_exceptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bi_sync_exceptions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hrp_bi_sync_exception_scope" ON "bi_sync_exceptions";
CREATE POLICY "hrp_bi_sync_exception_scope" ON "bi_sync_exceptions"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR'))
  WITH CHECK (hrp_session_role() IN ('ADMIN', 'HR_MANAGER'));

GRANT SELECT, INSERT, UPDATE, DELETE ON "bi_sync_exceptions" TO app_user_writer, app_user;

ALTER TABLE "bi_sync_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bi_sync_credentials" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hrp_bi_sync_credential_scope" ON "bi_sync_credentials";
CREATE POLICY "hrp_bi_sync_credential_scope" ON "bi_sync_credentials"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() = 'ADMIN')
  WITH CHECK (hrp_session_role() = 'ADMIN');

GRANT SELECT, INSERT, UPDATE, DELETE ON "bi_sync_credentials" TO app_user_writer, app_user;

ALTER TABLE "worker_initial_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "worker_initial_credentials" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hrp_worker_initial_credential_scope" ON "worker_initial_credentials";
CREATE POLICY "hrp_worker_initial_credential_scope" ON "worker_initial_credentials"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    OR (hrp_session_role() = 'PM' AND "project_id" IS NOT NULL AND hrp_project_visible_for("project_id"))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON "worker_initial_credentials" TO app_user_writer, app_user;

-- ---------------------------------------------------------------------------
-- SECTION 4 — Final assertion block
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t text;
  v_force boolean;
  v_col int;
BEGIN
  FOREACH v_t IN ARRAY ARRAY[
    'external_entity_links',
    'bi_sync_runs',
    'bi_sync_exceptions',
    'bi_sync_credentials',
    'worker_initial_credentials'
  ]
  LOOP
    SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema() AND c.relname = v_t;
    IF v_force IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Table % must have ENABLE and FORCE ROW LEVEL SECURITY', v_t;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_col
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND (
      (table_name = 'users' AND column_name = 'must_change_password')
      OR (table_name = 'workers' AND column_name = 'self_edited_fields')
      OR (table_name = 'sites' AND column_name IN ('source_system', 'external_ref'))
      OR (table_name = 'project_assignments' AND column_name IN ('source_system', 'external_ref', 'recruiter_external_id', 'recruiter_name', 'recruiter_code'))
    );
  IF v_col <> 9 THEN
    RAISE EXCEPTION 'bi_worker_sync_v1 additive columns missing (found % of 9)', v_col;
  END IF;
END $$;
