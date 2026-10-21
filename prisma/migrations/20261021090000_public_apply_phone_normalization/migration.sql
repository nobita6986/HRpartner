-- Forward-only hotfix: align LaborProfile phone normalization across
-- `hrp_public_apply_submission`, `hrp_score_labor_profile` and existing
-- `labor_profiles.normalized_phone` rows so the same applicant can apply to
-- multiple distinct JobPostings (receiving `EXACT_MATCH` on subsequent jobs)
-- without triggering a false `POSSIBLE_MATCH_NOT_RESOLVED` (SQLSTATE P0014).

BEGIN;

DO $pre$
DECLARE
  v_apply record;
  v_score record;
  v_norm  record;
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

  SELECT * INTO v_norm
    FROM pg_proc
   WHERE oid = to_regprocedure('public.hrp_normalize_phone(text)');
  IF v_norm IS NULL THEN
    RAISE EXCEPTION 'pre_assert_failed: canonical phone normalizer missing' USING ERRCODE = 'P0011';
  END IF;
END
$pre$;

-- Backfill any existing `labor_profiles.normalized_phone` values that still
-- carry a leading '0' or '84' prefix into the canonical `hrp_normalize_phone`
-- form expected by `hrp_score_labor_profile` and `src/domains/talent/normalize.ts`.
UPDATE public.labor_profiles
   SET normalized_phone = NULLIF(hrp_normalize_phone(COALESCE(NULLIF(btrim(phone), ''), normalized_phone)), '')
 WHERE normalized_phone IS NOT NULL
   AND normalized_phone IS DISTINCT FROM NULLIF(hrp_normalize_phone(COALESCE(NULLIF(btrim(phone), ''), normalized_phone)), '');

GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
SET ROLE hrp_public_rpc;

CREATE OR REPLACE FUNCTION hrp_score_labor_profile(
  p_full_name text,
  p_phone text,
  p_cccd text
)
RETURNS TABLE(
  verdict text,
  candidate jsonb,
  has_conflict boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_norm_phone text := '';
  v_norm_name  text := '';
  v_signals_provided int := 0;
  v_match_count int := 0;
  v_conflict bool := false;
  v_candidate_ids jsonb := '[]'::jsonb;
  v_signals_matched jsonb := '[]'::jsonb;
  v_conflicting_evidence jsonb := '[]'::jsonb;
  r record;
BEGIN
  v_norm_phone := hrp_normalize_phone(p_phone);
  v_norm_name  := hrp_normalize_full_name(p_full_name);
  v_signals_provided := 0;
  IF v_norm_phone <> '' THEN v_signals_provided := v_signals_provided + 1; END IF;
  IF p_cccd IS NOT NULL AND btrim(p_cccd) <> '' THEN v_signals_provided := v_signals_provided + 1; END IF;
  IF v_norm_name <> '' THEN v_signals_provided := v_signals_provided + 1; END IF;

  IF v_signals_provided = 0 THEN
    verdict := 'NEW_PROFILE';
    candidate := NULL;
    has_conflict := false;
    RETURN NEXT;
    RETURN;
  END IF;

  FOR r IN
    SELECT lp.id AS lp_id,
           lp.normalized_phone,
           lp.cccd_number,
           lp.full_name
      FROM labor_profiles lp
     WHERE (v_norm_phone <> '' AND (lp.normalized_phone = v_norm_phone OR hrp_normalize_phone(lp.normalized_phone) = v_norm_phone))
        OR (p_cccd IS NOT NULL AND btrim(p_cccd) <> '' AND lp.cccd_number = btrim(p_cccd))
        OR (v_norm_name <> '' AND lp.full_name IS NOT NULL
            AND hrp_normalize_full_name(lp.full_name) = v_norm_name)
     LIMIT 50
  LOOP
    DECLARE
      v_sm jsonb := '[]'::jsonb;
      v_ce jsonb := '[]'::jsonb;
    BEGIN
      IF v_norm_phone <> '' AND r.normalized_phone IS NOT NULL THEN
        IF hrp_normalize_phone(r.normalized_phone) = v_norm_phone THEN
          v_sm := v_sm || jsonb_build_array('phone');
        ELSE
          v_ce := v_ce || jsonb_build_object('signal', 'phone', 'existing', r.normalized_phone);
        END IF;
      END IF;
      IF p_cccd IS NOT NULL AND btrim(p_cccd) <> '' AND r.cccd_number IS NOT NULL THEN
        IF r.cccd_number = btrim(p_cccd) THEN
          v_sm := v_sm || jsonb_build_array('cccd');
        ELSE
          v_ce := v_ce || jsonb_build_object('signal', 'cccd', 'existing', r.cccd_number);
        END IF;
      END IF;
      IF v_norm_name <> '' AND r.full_name IS NOT NULL THEN
        IF hrp_normalize_full_name(r.full_name) = v_norm_name THEN
          v_sm := v_sm || jsonb_build_array('full_name');
        ELSE
          v_ce := v_ce || jsonb_build_object('signal', 'full_name', 'existing', r.full_name);
        END IF;
      END IF;

      IF jsonb_array_length(v_sm) >= 1 THEN
        v_candidate_ids := v_candidate_ids || jsonb_build_array(r.lp_id);
        v_match_count := v_match_count + 1;
        IF jsonb_array_length(v_sm) >= 2 AND jsonb_array_length(v_ce) = 0 THEN
          verdict := 'EXACT_MATCH';
          candidate := jsonb_build_object(
            'laborProfileId', r.lp_id,
            'signalsMatched', v_sm,
            'conflictingEvidence', '[]'::jsonb
          );
          has_conflict := false;
          RETURN NEXT;
          RETURN;
        END IF;
        IF jsonb_array_length(v_ce) > 0 THEN
          v_conflict := true;
          v_conflicting_evidence := v_conflicting_evidence || v_ce;
        END IF;
        v_signals_matched := v_signals_matched || jsonb_build_array(jsonb_build_object(
          'laborProfileId', r.lp_id,
          'signalsMatched', v_sm,
          'conflictingEvidence', v_ce
        ));
      END IF;
    END;
  END LOOP;

  IF v_match_count = 0 THEN
    verdict := 'NEW_PROFILE';
    candidate := NULL;
    has_conflict := false;
    RETURN NEXT;
    RETURN;
  END IF;

  verdict := 'POSSIBLE_MATCH';
  candidate := jsonb_build_object(
    'candidates', v_signals_matched,
    'signalsProvided', v_signals_provided
  );
  has_conflict := v_conflict;
  RETURN NEXT;
END;
$fn$;

REVOKE ALL ON FUNCTION hrp_score_labor_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_score_labor_profile(text, text, text) TO PUBLIC;

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
        gen_random_uuid()::text,
        btrim(p_full_name),
        NULLIF(hrp_normalize_phone(COALESCE(NULLIF(btrim(p_phone), ''), p_normalized_phone)), ''),
        p_phone,
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
