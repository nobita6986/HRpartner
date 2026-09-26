-- P1-B Public Apply lifecycle (forward-only).
--
-- Replaces only the body of the canonical slug-bound apply RPC. The exact
-- signature, owner, EXECUTE ACL and search_path remain unchanged. Classification
-- is delegated to the existing canonical DB helper; this file deliberately does
-- not copy the classifier implementation.

BEGIN;

DO $pre$
DECLARE
  v_apply record;
  v_score record;
  v_searchpath text;
BEGIN
  SELECT * INTO v_apply
    FROM pg_proc
   WHERE oid = to_regprocedure(
     'public.hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamp with time zone,text,text,integer,text,text,text,text)'
   );
  IF v_apply IS NULL THEN
    RAISE EXCEPTION 'pre_assert_failed: canonical apply function missing' USING ERRCODE = 'P0011';
  END IF;
  IF v_apply.proowner::regrole::text IS DISTINCT FROM 'hrp_public_rpc'
     OR v_apply.prosecdef IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'pre_assert_failed: canonical apply owner/security drift' USING ERRCODE = 'P0011';
  END IF;

  SELECT * INTO v_score
    FROM pg_proc
   WHERE oid = to_regprocedure('public.hrp_score_labor_profile(text,text,text)');
  IF v_score IS NULL THEN
    RAISE EXCEPTION 'pre_assert_failed: canonical score helper missing' USING ERRCODE = 'P0011';
  END IF;
  v_searchpath := array_to_string(v_score.proconfig, ', ');
  IF v_score.proowner::regrole::text IS DISTINCT FROM 'hrp_public_rpc'
     OR v_score.prosecdef IS DISTINCT FROM TRUE
     OR v_searchpath IS NULL
     OR position('search_path=public, pg_temp' IN v_searchpath) = 0 THEN
    RAISE EXCEPTION 'pre_assert_failed: score helper owner/security/search_path drift'
      USING ERRCODE = 'P0011';
  END IF;

  IF to_regclass('public.placement_case_labor_profile_id_active_unique') IS NULL THEN
    RAISE EXCEPTION 'pre_assert_failed: active placement-case unique index missing'
      USING ERRCODE = 'P0011';
  END IF;

  IF NOT has_table_privilege('hrp_public_rpc', 'public.labor_profiles', 'SELECT')
     OR NOT has_table_privilege('hrp_public_rpc', 'public.labor_profiles', 'INSERT')
     OR NOT has_table_privilege('hrp_public_rpc', 'public.placement_case', 'SELECT')
     OR NOT has_table_privilege('hrp_public_rpc', 'public.placement_case', 'INSERT')
     OR NOT has_table_privilege('hrp_public_rpc', 'public.candidate_submissions', 'SELECT')
     OR NOT has_table_privilege('hrp_public_rpc', 'public.candidate_submissions', 'INSERT')
     OR NOT has_table_privilege('hrp_public_rpc', 'public.application_status_history', 'SELECT')
     OR NOT has_table_privilege('hrp_public_rpc', 'public.application_status_history', 'INSERT') THEN
    RAISE EXCEPTION 'pre_assert_failed: hrp_public_rpc lacks lifecycle table privileges'
      USING ERRCODE = 'P0011';
  END IF;
END
$pre$;

-- CREATE OR REPLACE must execute as the function owner. Grant only temporary
-- SET capability and remove it again before postflight.
GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
SET ROLE hrp_public_rpc;

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
  v_now               timestamptz := now();
  v_job_posting_id    text;
  v_staffing_order_id text;
  v_slot_id           text;
  v_avail             integer;
  v_existing          record;
  v_verdict           text;
  v_candidate         jsonb;
  v_has_conflict      boolean;
  v_labor_profile_id  text;
  v_placement_case_id text;
  v_submission_id     text;
BEGIN
  IF p_full_name IS NULL OR length(btrim(p_full_name)) = 0
     OR p_normalized_phone IS NULL OR length(p_normalized_phone) = 0
     OR p_idempotency_key_hash IS NULL OR p_idempotency_payload_hash IS NULL
     OR p_tracking_code IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = 'P0002';
  END IF;

  -- One DB-level idempotency authority. Replays return only the stored public
  -- result and never re-run classification or lifecycle writes.
  SELECT cs.public_tracking_code, cs.status, cs.idempotency_payload_hash
    INTO v_existing
    FROM candidate_submissions cs
   WHERE cs.idempotency_key_hash = p_idempotency_key_hash
   LIMIT 1;
  IF FOUND THEN
    IF v_existing.idempotency_payload_hash IS DISTINCT FROM p_idempotency_payload_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH' USING ERRCODE = 'P0010';
    END IF;
    tracking_code := v_existing.public_tracking_code;
    status := v_existing.status;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Preserve the A1 canonical JobPosting -> JobOpening -> StaffingOrder ->
  -- exactly-linked slot guard. A caller-supplied slot, if any, must equal the
  -- canonical linked slot; the browser route never supplies it.
  IF p_slot_id IS NOT NULL THEN
    SELECT jp.id, so.id, s.id, (s.slots_needed - s.slots_filled)
      INTO v_job_posting_id, v_staffing_order_id, v_slot_id, v_avail
      FROM job_postings jp
      JOIN job_openings jo ON jo.id = jp.job_opening_id
      JOIN staffing_orders so ON so.id = jo.staffing_order_id
      JOIN staffing_order_slots s ON s.id = jo.staffing_order_slot_id
                                  AND s.staffing_order_id = jo.staffing_order_id
                                  AND s.job_opening_id = jo.id
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
      JOIN staffing_order_slots s ON s.id = jo.staffing_order_slot_id
                                  AND s.staffing_order_id = jo.staffing_order_id
                                  AND s.job_opening_id = jo.id
     WHERE jp.slug = p_slug
       AND jp.status = 'PUBLISHED'
       AND jo.status = 'OPEN'
       AND so.status IN ('OPEN','CLOSING_SOON')
       AND (so.deadline_date IS NULL OR so.deadline_date >= v_now::date)
       AND (s.valid_to IS NULL OR s.valid_to >= v_now::date)
       AND (s.slots_needed - s.slots_filled) > 0
     ORDER BY s.valid_from ASC, s.id ASC
     LIMIT 1;
  END IF;

  IF v_slot_id IS NULL OR v_avail IS NULL OR v_avail <= 0 THEN
    RAISE EXCEPTION 'JOB_NOT_AVAILABLE' USING ERRCODE = 'P0011';
  END IF;

  PERFORM 1
    FROM candidate_submissions cs
   WHERE cs.slot_id = v_slot_id
     AND cs.normalized_phone = p_normalized_phone
     AND cs.status NOT IN ('REJECTED','WITHDRAWN')
   LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'DUPLICATE_APPLICATION' USING ERRCODE = 'P0012';
  END IF;

  -- The entire mutating lifecycle is one PL/pgSQL exception-block
  -- subtransaction. If the candidate-submission uniqueness backstop loses a
  -- race, any profile/case writes made by this attempt are rolled back before
  -- the stored winner is read. No explicit SAVEPOINT statement is issued.
  BEGIN
    SELECT s.verdict, s.candidate, s.has_conflict
      INTO v_verdict, v_candidate, v_has_conflict
      FROM hrp_score_labor_profile(p_full_name, p_phone, p_cccd) AS s
     LIMIT 1;

    IF v_verdict = 'POSSIBLE_MATCH' THEN
      RAISE EXCEPTION 'POSSIBLE_MATCH_NOT_RESOLVED' USING ERRCODE = 'P0014';
    ELSIF v_verdict = 'EXACT_MATCH' THEN
      v_labor_profile_id := NULLIF(v_candidate->>'laborProfileId', '');
      IF v_labor_profile_id IS NULL THEN
        RAISE EXCEPTION 'classifier returned EXACT_MATCH without laborProfileId';
      END IF;
    ELSIF v_verdict = 'NEW_PROFILE' THEN
      INSERT INTO labor_profiles (
        id, full_name, normalized_phone, phone, cccd_number,
        consent_at, identity_verification, completeness, created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, btrim(p_full_name), NULLIF(p_normalized_phone, ''), p_phone,
        NULLIF(btrim(p_cccd), ''), p_consent_at, 'UNVERIFIED', 'MINIMAL', v_now, v_now
      )
      RETURNING id INTO v_labor_profile_id;
    ELSE
      RAISE EXCEPTION 'classifier returned unsupported verdict';
    END IF;

    BEGIN
      INSERT INTO placement_case (
        id, labor_profile_id, status, opened_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, v_labor_profile_id, 'OPEN', v_now, v_now, v_now
      )
      RETURNING id INTO v_placement_case_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT pc.id
        INTO v_placement_case_id
        FROM placement_case pc
       WHERE pc.labor_profile_id = v_labor_profile_id
         AND pc.status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')
       ORDER BY pc.opened_at DESC
       LIMIT 1;
      IF v_placement_case_id IS NULL THEN
        RAISE;
      END IF;
    END;

    v_submission_id := gen_random_uuid()::text;
    INSERT INTO candidate_submissions (
      id, project_id, slot_id, placement_case_id, labor_profile_id,
      full_name, phone, normalized_phone, cccd_number,
      date_of_birth, gender, experience, consent_at,
      cv_file_name, cv_mime_type, cv_size_bytes, cv_storage_key,
      public_tracking_code, idempotency_key_hash, idempotency_payload_hash,
      status, vendor_id, ctv_id, created_at
    )
    SELECT
      v_submission_id, so.project_id, v_slot_id, v_placement_case_id, v_labor_profile_id,
      btrim(p_full_name), p_phone, p_normalized_phone, NULLIF(btrim(p_cccd), ''),
      p_dob, p_gender, p_experience, p_consent_at,
      p_cv_file_name, p_cv_mime_type, p_cv_size_bytes, p_cv_storage_key,
      p_tracking_code, p_idempotency_key_hash, p_idempotency_payload_hash,
      'NEW', NULL, NULL, v_now
      FROM staffing_orders so
     WHERE so.id = v_staffing_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'canonical staffing order disappeared' USING ERRCODE = 'P0011';
    END IF;

    INSERT INTO application_status_history (
      id, submission_id, from_status, to_status, actor_user_id, reason, created_at
    ) VALUES (
      gen_random_uuid()::text, v_submission_id, NULL, 'NEW', NULL, 'PUBLIC_APPLY', v_now
    );
  EXCEPTION WHEN unique_violation THEN
    -- The block rollback happens before this query. Thus losing concurrent
    -- attempts cannot leave orphan LaborProfile or PlacementCase rows.
    SELECT cs.public_tracking_code, cs.status, cs.idempotency_payload_hash
      INTO v_existing
      FROM candidate_submissions cs
     WHERE cs.idempotency_key_hash = p_idempotency_key_hash
     LIMIT 1;
    IF FOUND THEN
      IF v_existing.idempotency_payload_hash IS DISTINCT FROM p_idempotency_payload_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH' USING ERRCODE = 'P0010';
      END IF;
      tracking_code := v_existing.public_tracking_code;
      status := v_existing.status;
      RETURN NEXT;
      RETURN;
    END IF;
    RAISE EXCEPTION 'DUPLICATE_APPLICATION' USING ERRCODE = 'P0012';
  END;

  tracking_code := p_tracking_code;
  status := 'NEW';
  RETURN NEXT;
END;
$fn$;

REVOKE ALL ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) TO app_user_writer, app_user;

RESET ROLE;
DO $$
BEGIN
  EXECUTE format('REVOKE hrp_public_rpc FROM %I', session_user);
END
$$;
REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc;

DO $post$
DECLARE
  v_apply record;
  v_score record;
  v_searchpath text;
  v_apply_def text;
  v_set_membership boolean;
BEGIN
  SELECT * INTO v_apply
    FROM pg_proc
   WHERE oid = to_regprocedure(
     'public.hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamp with time zone,text,text,integer,text,text,text,text)'
   );
  SELECT * INTO v_score
    FROM pg_proc
   WHERE oid = to_regprocedure('public.hrp_score_labor_profile(text,text,text)');
  IF v_apply IS NULL OR v_score IS NULL THEN
    RAISE EXCEPTION 'post_assert_failed: required function missing' USING ERRCODE = 'P0011';
  END IF;
  v_searchpath := array_to_string(v_apply.proconfig, ', ');
  IF v_apply.proowner::regrole::text IS DISTINCT FROM 'hrp_public_rpc'
     OR v_apply.prosecdef IS DISTINCT FROM TRUE
     OR v_searchpath IS NULL
     OR position('search_path=public, pg_temp' IN v_searchpath) = 0 THEN
    RAISE EXCEPTION 'post_assert_failed: apply owner/security/search_path drift'
      USING ERRCODE = 'P0011';
  END IF;
  IF EXISTS (
       SELECT 1
         FROM aclexplode(COALESCE(v_apply.proacl, acldefault('f', v_apply.proowner))) acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
     )
     OR NOT has_function_privilege('app_user', v_apply.oid, 'EXECUTE')
     OR NOT has_function_privilege('app_user_writer', v_apply.oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'post_assert_failed: apply EXECUTE ACL drift' USING ERRCODE = 'P0011';
  END IF;

  v_apply_def := pg_get_functiondef(v_apply.oid);
  IF position('hrp_score_labor_profile' IN v_apply_def) = 0
     OR position('v_signals_provided' IN v_apply_def) > 0
     OR v_apply_def ~ E'\\n[[:space:]]*SAVEPOINT[[:space:]]' THEN
    RAISE EXCEPTION 'post_assert_failed: helper call missing or classifier/savepoint copied'
      USING ERRCODE = 'P0011';
  END IF;

  IF has_table_privilege('hrp_public_rpc', 'public.job_postings', 'INSERT')
     OR has_table_privilege('hrp_public_rpc', 'public.job_postings', 'UPDATE')
     OR has_table_privilege('hrp_public_rpc', 'public.job_postings', 'DELETE')
     OR has_table_privilege('hrp_public_rpc', 'public.job_openings', 'INSERT')
     OR has_table_privilege('hrp_public_rpc', 'public.job_openings', 'UPDATE')
     OR has_table_privilege('hrp_public_rpc', 'public.job_openings', 'DELETE') THEN
    RAISE EXCEPTION 'post_assert_failed: browse authority gained mutation privilege'
      USING ERRCODE = 'P0011';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_auth_members m
      JOIN pg_roles granted_role ON granted_role.oid = m.roleid
      JOIN pg_roles member_role ON member_role.oid = m.member
     WHERE granted_role.rolname = 'hrp_public_rpc'
       AND member_role.rolname = session_user
       AND m.set_option
  ) INTO v_set_membership;
  IF v_set_membership OR has_schema_privilege('hrp_public_rpc', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'post_assert_failed: temporary privilege cleanup failed'
      USING ERRCODE = 'P0011';
  END IF;
END
$post$;

COMMIT;
