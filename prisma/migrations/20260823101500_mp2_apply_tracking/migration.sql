-- MP-2 Apply + Tracking + HR Queue (task hrp-mp2-apply-tracking, Spec v1.1)
-- ADDITIVE migration. Adds columns + application_status_history + the SECURITY
-- DEFINER public RPC boundary (DEC-08). Assumes role `hrp_public_rpc`
-- (NOLOGIN BYPASSRLS) is PRE-PROVISIONED by OP-01 (scripts/create-public-rpc-role.cjs).
-- This migration MUST NOT create the role (DEC-09). Prod apply = SQL-direct via
-- DATABASE_URL_ADMIN + `prisma migrate resolve --applied` (DEC-NEW-04/05).

-- 1. Additive columns on candidate_submissions (all nullable / backfill-safe) --------
ALTER TABLE "candidate_submissions"
  ADD COLUMN "slot_id" TEXT,
  ADD COLUMN "public_tracking_code" TEXT,
  ADD COLUMN "normalized_phone" TEXT,
  ADD COLUMN "idempotency_key_hash" TEXT,
  ADD COLUMN "idempotency_payload_hash" TEXT,
  ADD COLUMN "consent_at" TIMESTAMP(3),
  ADD COLUMN "cv_storage_key" TEXT,
  ADD COLUMN "cv_file_name" TEXT,
  ADD COLUMN "cv_mime_type" TEXT,
  ADD COLUMN "cv_size_bytes" INTEGER;

-- 2. Append-only application status history ------------------------------------------
CREATE TABLE "application_status_history" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes + FKs (names mirror Prisma to minimise migrate-diff drift) --------------
CREATE UNIQUE INDEX "candidate_submissions_public_tracking_code_key" ON "candidate_submissions"("public_tracking_code");
CREATE UNIQUE INDEX "candidate_submissions_idempotency_key_hash_key" ON "candidate_submissions"("idempotency_key_hash");
CREATE INDEX "candidate_submissions_slot_id_normalized_phone_idx" ON "candidate_submissions"("slot_id", "normalized_phone");
CREATE INDEX "application_status_history_submission_id_created_at_idx" ON "application_status_history"("submission_id", "created_at");
-- Duplicate-guard backstop (DEC-04) — partial-unique, not modelled in schema.prisma.
CREATE UNIQUE INDEX "uq_candidate_active_slot_phone" ON "candidate_submissions"("slot_id", "normalized_phone")
  WHERE "status" NOT IN ('REJECTED','WITHDRAWN') AND "slot_id" IS NOT NULL AND "normalized_phone" IS NOT NULL;

ALTER TABLE "candidate_submissions"
  ADD CONSTRAINT "candidate_submissions_slot_id_fkey" FOREIGN KEY ("slot_id")
  REFERENCES "staffing_order_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_status_history"
  ADD CONSTRAINT "application_status_history_submission_id_fkey" FOREIGN KEY ("submission_id")
  REFERENCES "candidate_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. RLS on application_status_history — DEC-06 queue roles only; predicate inlined
--    (no dependency on hrp_session_role()). Definer-owner (BYPASSRLS) writes the
--    initial PUBLIC_APPLY history; authenticated ADMIN/HR_MANAGER/DIRECTOR/SALE may
--    read history and append the constrained NEEDS_INFO transition (STEP-03).
ALTER TABLE "application_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_status_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY "hrp_app_status_history_scope" ON "application_status_history"
  AS PERMISSIVE FOR ALL TO app_user_writer, app_user
  USING (NULLIF(current_setting('app.role', true), '') IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE'))
  WITH CHECK (NULLIF(current_setting('app.role', true), '') IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE'));

-- App-role table privileges on the NEW table (RLS still enforced above).
GRANT SELECT, INSERT, UPDATE ON "application_status_history" TO app_user_writer;
GRANT SELECT ON "application_status_history" TO app_user;

-- 5. Public apply function (SECURITY DEFINER; the ONLY anonymous write path) ---------
CREATE OR REPLACE FUNCTION hrp_public_apply_submission(
  p_slug                     text,
  p_slot_id                  text,
  p_full_name                text,
  p_phone                    text,
  p_normalized_phone         text,
  p_cccd                     text,
  p_dob                      date,
  p_gender                   text,
  p_experience               text,
  p_consent_at               timestamptz,
  p_cv_file_name             text,
  p_cv_mime_type             text,
  p_cv_size_bytes            integer,
  p_cv_storage_key           text,
  p_idempotency_key_hash     text,
  p_idempotency_payload_hash text,
  p_tracking_code            text
) RETURNS TABLE(tracking_code text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
#variable_conflict use_column
DECLARE
  v_now        timestamptz := now();
  v_project_id text;
  v_slot_id    text;
  v_avail      integer;
  v_existing   record;
  v_new_id     text;
BEGIN
  IF p_full_name IS NULL OR length(btrim(p_full_name)) = 0
     OR p_normalized_phone IS NULL OR length(p_normalized_phone) = 0
     OR p_idempotency_key_hash IS NULL OR p_idempotency_payload_hash IS NULL
     OR p_tracking_code IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = 'P0002';
  END IF;

  -- (1) Idempotency replay: same key hash returns the stored result (payload must match)
  SELECT cs.public_tracking_code, cs.status, cs.idempotency_payload_hash
    INTO v_existing FROM candidate_submissions cs
    WHERE cs.idempotency_key_hash = p_idempotency_key_hash LIMIT 1;
  IF FOUND THEN
    IF v_existing.idempotency_payload_hash IS DISTINCT FROM p_idempotency_payload_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH' USING ERRCODE = 'P0010';
    END IF;
    tracking_code := v_existing.public_tracking_code; status := v_existing.status;
    RETURN NEXT; RETURN;
  END IF;

  -- (2) Resolve + validate the job (mirrors the MP-1 public visibility predicate) and
  --     bind the slot. Explicit p_slot_id is validated against the slug; when omitted
  --     the first available slot of the slug is chosen deterministically.
  IF p_slot_id IS NOT NULL THEN
    SELECT s.id, so.project_id, (s.slots_needed - s.slots_filled)
      INTO v_slot_id, v_project_id, v_avail
      FROM staffing_order_slots s
      JOIN staffing_orders so ON so.id = s.staffing_order_id
      JOIN outsourcing_projects p ON p.id = so.project_id
     WHERE s.id = p_slot_id
       AND p.is_public = true AND p.status = 'ACTIVE'
       AND (p.code = p_slug OR p.id = p_slug)
       AND so.status IN ('OPEN','CLOSING_SOON')
       AND (so.deadline_date IS NULL OR so.deadline_date >= v_now::date)
       AND (s.valid_to IS NULL OR s.valid_to >= v_now::date)
     LIMIT 1;
  ELSE
    SELECT s.id, so.project_id, (s.slots_needed - s.slots_filled)
      INTO v_slot_id, v_project_id, v_avail
      FROM staffing_order_slots s
      JOIN staffing_orders so ON so.id = s.staffing_order_id
      JOIN outsourcing_projects p ON p.id = so.project_id
     WHERE p.is_public = true AND p.status = 'ACTIVE'
       AND (p.code = p_slug OR p.id = p_slug)
       AND so.status IN ('OPEN','CLOSING_SOON')
       AND (so.deadline_date IS NULL OR so.deadline_date >= v_now::date)
       AND (s.valid_to IS NULL OR s.valid_to >= v_now::date)
       AND (s.slots_needed - s.slots_filled) > 0
     ORDER BY s.valid_from ASC, s.id ASC LIMIT 1;
  END IF;

  IF v_slot_id IS NULL OR v_avail IS NULL OR v_avail <= 0 THEN
    RAISE EXCEPTION 'JOB_NOT_AVAILABLE' USING ERRCODE = 'P0011';
  END IF;

  -- (3) Duplicate guard: active application for the same slot + normalized phone
  PERFORM 1 FROM candidate_submissions cs
    WHERE cs.slot_id = v_slot_id AND cs.normalized_phone = p_normalized_phone
      AND cs.status NOT IN ('REJECTED','WITHDRAWN') LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'DUPLICATE_APPLICATION' USING ERRCODE = 'P0012';
  END IF;

  -- (4) Insert exactly one submission (status NEW; vendor/ctv NULL). NEVER a Worker
  --     or SourceClaim. The unique-violation handler makes concurrent retries safe.
  v_new_id := gen_random_uuid()::text;
  BEGIN
    INSERT INTO candidate_submissions (
      id, project_id, slot_id, full_name, phone, normalized_phone, cccd_number,
      date_of_birth, gender, experience, consent_at,
      cv_file_name, cv_mime_type, cv_size_bytes, cv_storage_key,
      public_tracking_code, idempotency_key_hash, idempotency_payload_hash,
      status, vendor_id, ctv_id, created_at
    ) VALUES (
      v_new_id, v_project_id, v_slot_id, p_full_name, p_phone, p_normalized_phone, p_cccd,
      p_dob, p_gender, p_experience, p_consent_at,
      p_cv_file_name, p_cv_mime_type, p_cv_size_bytes, p_cv_storage_key,
      p_tracking_code, p_idempotency_key_hash, p_idempotency_payload_hash,
      'NEW', NULL, NULL, v_now
    );
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent tx won the same idempotency key → replay its stored result.
    SELECT cs.public_tracking_code, cs.status, cs.idempotency_payload_hash
      INTO v_existing FROM candidate_submissions cs
      WHERE cs.idempotency_key_hash = p_idempotency_key_hash LIMIT 1;
    IF FOUND THEN
      IF v_existing.idempotency_payload_hash IS DISTINCT FROM p_idempotency_payload_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH' USING ERRCODE = 'P0010';
      END IF;
      tracking_code := v_existing.public_tracking_code; status := v_existing.status;
      RETURN NEXT; RETURN;
    END IF;
    -- Otherwise it was the slot+phone partial-unique guard → genuine duplicate.
    RAISE EXCEPTION 'DUPLICATE_APPLICATION' USING ERRCODE = 'P0012';
  END;

  -- (5) Append-only initial status history in the SAME transaction.
  INSERT INTO application_status_history (id, submission_id, from_status, to_status, actor_user_id, reason, created_at)
    VALUES (gen_random_uuid()::text, v_new_id, NULL, 'NEW', NULL, 'PUBLIC_APPLY', v_now);

  tracking_code := p_tracking_code; status := 'NEW';
  RETURN NEXT;
END;
$fn$;

-- 6. Public tracking projection (SECURITY DEFINER; DEC-02 allow-list ONLY) -----------
--    No phone/cccd/note/vendor/ctv/actor columns. Unknown code -> 0 rows -> route 404.
CREATE OR REPLACE FUNCTION hrp_public_tracking_projection(p_tracking_code text)
RETURNS TABLE(
  tracking_code  text,
  status         text,
  submitted_at   timestamp,
  job_title      text,
  job_code       text,
  position_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT cs.public_tracking_code, cs.status, cs.created_at,
         p.name, p.code, s.position_title
    FROM candidate_submissions cs
    LEFT JOIN staffing_order_slots s ON s.id = cs.slot_id
    LEFT JOIN outsourcing_projects p ON p.id = cs.project_id
   WHERE cs.public_tracking_code = p_tracking_code
   LIMIT 1;
$fn$;

-- 7. Ownership + least-privilege EXECUTE (DEC-08). Role pre-provisioned by OP-01 -----
ALTER FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) OWNER TO hrp_public_rpc;
ALTER FUNCTION hrp_public_tracking_projection(text) OWNER TO hrp_public_rpc;

REVOKE ALL ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION hrp_public_tracking_projection(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION hrp_public_tracking_projection(text) TO app_user_writer, app_user;

-- Minimal table privileges the NOLOGIN definer-owner needs (RLS bypass != grant).
GRANT SELECT, INSERT ON "candidate_submissions" TO hrp_public_rpc;
GRANT SELECT, INSERT ON "application_status_history" TO hrp_public_rpc;
GRANT SELECT ON "staffing_order_slots" TO hrp_public_rpc;
GRANT SELECT ON "staffing_orders" TO hrp_public_rpc;
GRANT SELECT ON "outsourcing_projects" TO hrp_public_rpc;





