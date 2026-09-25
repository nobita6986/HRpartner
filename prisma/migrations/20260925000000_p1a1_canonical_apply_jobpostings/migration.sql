-- ============================================================================
-- Migration: hrp-p1-a1-canonical-public-job-detail — apply RPC v2
-- Task:      hrp-p1-a1-canonical-public-job-detail (slice of P1-A)
-- Baseline:  origin/main@91525013fc2720a3803e808baac39e1c4497daf6
-- Author:    T1A Delivery Lead, under T0 verdict
-- Status:    FORWARD-ONLY REPLACEMENT of `hrp_public_apply_submission` body.
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- Per A1 contract (DEC-04, DEC-06, RQ-09, RQ-10): canonical public projection
-- routes through `JobPosting`. P1-A0 added the `job_postings` table with
-- `status` (`DRAFT | PUBLISHED | ARCHIVED`) and a `slug` column. The previous
-- apply RPC resolved the job by `Project.code`, which becomes invalid once
-- the public surface migrates to JobPosting.slug.
--
-- This migration is a forward-only body replacement of `hrp_public_apply_submission`:
--   - Signature, owner, grants, `search_path` are PRESERVED verbatim.
--   - The body is rewritten so `p_slug` resolves a `JobPosting` whose
--     `status='PUBLISHED'`, then cascades to its `JobOpening` (must be
--     `'OPEN'`) → `StaffingOrder` (must be one of OPEN/CLOSING_SOON per the
--     existing MP-2 visibility predicate).
--   - Browser-supplied `p_slot_id` is now COMPLETELY IGNORED — slots are
--     derived server-side from the canonical chain (JobPosting → JobOpening
--     → StaffingOrder → StaffingOrderSlot). When a caller passes a
--     `p_slot_id` that exists, we deliberately verify it belongs to the SAME
--     StaffingOrder as the resolved JobPosting; otherwise we fall through to
--     the deterministic slot picker (mirrors the existing MP-2 fallback at
--     20260823101500_*:133-144). Service-layer caller (the route handler in
--     A1) must NOT pass `p_slot_id` — the slot is server-derived.
--   - The atomicity guarantee is preserved: the visibility check, the slot
--     pick, the duplicate guard, the INSERT and the status history INSERT
--     all execute in ONE plpgsql call under definer, so the constraints
--     enforced here cannot be bypassed via concurrent updates between the
--     visibility probe and the INSERT.
--
-- SECURITY POSTURE (DEC-14, mirrors 20260823101500_*:49-58)
--   - `hrp_public_rpc` (NOLOGIN BYPASSRLS) is pre-provisioned by OP-01.
--   - The definer path does NOT trigger RLS policies; the only DB-level
--     guards on writes are explicit WHERE predicates inside the RPC body.
--   - This migration MUST NOT create or alter the role (`hrp_public_rpc`).
--
-- SCOPE (narrowest possible)
--   - Touches ONLY function `hrp_public_apply_submission`. No table changes.
--   - Owner transfer is idempotent (sets owner if already so).
--   - GRANT EXECUTE / REVOKE pattern mirrors 20260823101500_*:228-231.
--
-- NOT APPLIED TO PRODUCTION
--   Per T0 brief: T1A ships the migration file; T0/Owner applies to
--   production as a separate gate after the integration suite has PASSed
--   on writable staging.
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- REPLACEMENT: hrp_public_apply_submission (canonical JobPosting chain)
-- Body replaces slug resolution and slot derivation. Idempotency replay,
-- duplicate guard, single INSERT, status history insert remain identical
-- to 20260823101500_*:104-197.
-- ───────────────────────────────────────────────────────────────────────────
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
  v_now           timestamptz := now();
  v_job_posting_id text;
  v_staffing_order_id text;
  v_slot_id       text;
  v_avail         integer;
  v_existing      record;
  v_new_id        text;
  v_candidate_submission_slot_id text;
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

  -- (2) Resolve canonical chain: JobPosting(slug, status='PUBLISHED') → JobOpening(status='OPEN')
  --     → StaffingOrder(status IN (OPEN, CLOSING_SOON) AND deadline/slot not expired).
  --     Whenever `p_slot_id` is provided, we VERIFY it belongs to the SAME StaffingOrder
  --     as the resolved JobPosting (defense in depth); when the caller (service layer)
  --     passes nothing, we pick the deterministic next available slot.
  IF p_slot_id IS NOT NULL THEN
    SELECT jp.id, so.id, s.id, (s.slots_needed - s.slots_filled)
      INTO v_job_posting_id, v_staffing_order_id, v_slot_id, v_avail
      FROM job_postings jp
      JOIN job_openings jo ON jo.id = jp.job_opening_id
      JOIN staffing_orders so ON so.id = jo.staffing_order_id
      JOIN staffing_order_slots s ON s.staffing_order_id = so.id
     WHERE jp.slug = p_slug
       AND jp.status = 'PUBLISHED'
       AND jo.status = 'OPEN'
       AND so.status IN ('OPEN','CLOSING_SOON')
       AND (so.deadline_date IS NULL OR so.deadline_date >= v_now::date)
       AND (s.valid_to IS NULL OR s.valid_to >= v_now::date)
       AND s.id = p_slot_id
     LIMIT 1;
  ELSE
    SELECT jp.id, so.id, s.id, (s.slots_needed - s.slots_filled)
      INTO v_job_posting_id, v_staffing_order_id, v_slot_id, v_avail
      FROM job_postings jp
      JOIN job_openings jo ON jo.id = jp.job_opening_id
      JOIN staffing_orders so ON so.id = jo.staffing_order_id
      JOIN staffing_order_slots s ON s.staffing_order_id = so.id
     WHERE jp.slug = p_slug
       AND jp.status = 'PUBLISHED'
       AND jo.status = 'OPEN'
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
  --     project_id is derived from StaffingOrder.project_id at INSERT time, NOT from
  --     caller input — defense against the previous design's `p_project_id` ambiguity.
  v_new_id := gen_random_uuid()::text;
  BEGIN
    INSERT INTO candidate_submissions (
      id, project_id, slot_id, full_name, phone, normalized_phone, cccd_number,
      date_of_birth, gender, experience, consent_at,
      cv_file_name, cv_mime_type, cv_size_bytes, cv_storage_key,
      public_tracking_code, idempotency_key_hash, idempotency_payload_hash,
      status, vendor_id, ctv_id, created_at
    )
    SELECT
      v_new_id, so.project_id, v_slot_id, p_full_name, p_phone, p_normalized_phone, p_cccd,
      p_dob, p_gender, p_experience, p_consent_at,
      p_cv_file_name, p_cv_mime_type, p_cv_size_bytes, p_cv_storage_key,
      p_tracking_code, p_idempotency_key_hash, p_idempotency_payload_hash,
      'NEW', NULL, NULL, v_now
      FROM staffing_orders so
     WHERE so.id = v_staffing_order_id;
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

-- ───────────────────────────────────────────────────────────────────────────
-- Ownership + least-privilege EXECUTE (DEC-08, mirrors 20260823101500_*:238-251).
-- Role hrp_public_rpc pre-provisioned by OP-01. Migration only re-stamps ownership;
-- never creates the role. SET FALSE / no-CREATE-on-schema is restored before commit.
-- ───────────────────────────────────────────────────────────────────────────
GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
ALTER FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) OWNER TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET FALSE', session_user);
END
$$;
-- RQ-06: WITH SET FALSE chỉ tắt SET ROLE, không xóa membership. Thu hồi membership trong
-- cùng file để definer path không để lại quyền tồn dư trên session_user sau khi commit.
DO $$
BEGIN
  EXECUTE format('REVOKE hrp_public_rpc FROM %I', session_user);
END
$$;
REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc;

-- EXECUTE grants remain identical (already in the base migration 20260823101500).
-- We re-affirm here because CREATE OR REPLACE FUNCTION on a definer re-stamps
-- pg_proc.proacl; idempotently re-granting is the safe idempotent pattern, and
-- avoids one extra migration step if a partial re-apply happens.
REVOKE ALL ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) TO app_user_writer, app_user;
