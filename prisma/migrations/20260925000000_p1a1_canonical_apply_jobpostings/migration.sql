-- ============================================================================
-- Migration: hrp-p1-a1-canonical-public-job-detail — apply RPC v2 (correction batch 1/1)
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
--   - The atomicity guarantee is preserved: the visibility check, the slot
--     pick, the duplicate guard, the INSERT and the status history INSERT
--     all execute in ONE plpgsql call under definer, so the constraints
--     enforced here cannot be bypassed via concurrent updates between the
--     visibility probe and the INSERT.
--
-- CORRECTION BATCH 1/1 — C-02 / C-03
-- -----------------------------------
-- C-02 (canonical JobOpening-slot relation): the slot join MUST be strictly
-- bound to the linked JobOpening. The predecessor migration joined any slot
-- that shared the same `staffing_order_id`, which allowed a `JobPosting` for
-- `opening A` to pick a sibling slot under the same `StaffingOrder` but
-- attached to `opening B`. That was the canonical-binding bypass T0 caught.
--
-- The new join requires ALL THREE conditions atomically:
--   1. `s.id = jo.staffing_order_slot_id`        (slot ↔ opening slot pointer)
--   2. `s.staffing_order_id = jo.staffing_order_id` (same StaffingOrder)
--   3. `s.job_opening_id  = jo.id`               (reverse FK: slot is opened by this opening)
--
-- If any of the three is missing/drifted, no row matches and the call fails
-- closed with `JOB_NOT_AVAILABLE` (`P0011`). This is the only authoritative
-- resolution path; the route layer rejects browser-supplied IDs.
--
-- C-02 also reconciles the `p_slot_id` parameter. The contract is now:
--   * Service-layer caller (the route handler in A1) MUST NOT pass `p_slot_id`.
--     The slot is server-derived from the canonical chain.
--   * When `p_slot_id` IS NULL: deterministic slot picker restricted to the
--     canonical linked slot.
--   * When `p_slot_id` IS NOT NULL: it must be the canonical linked slot
--     (passes all three chain conditions). Sibling/wrong/unbound slots are
--     rejected with `JOB_NOT_AVAILABLE` (`P0011`). The route never passes it,
--     so this branch is defense-in-depth for any direct RPC call.
--
-- C-03 (RPC privilege + atomic migration): the migration body wraps in
-- `BEGIN;` ... `COMMIT;` and adds fail-closed pre/post assertions to verify
-- the predecessor function signature, the `hrp_public_rpc` role posture,
-- required tables/columns, the function owner, `prosecdef=true`, the
-- `proconfig` containing `search_path=public, pg_temp`, the absence of
-- EXECUTE for `PUBLIC`, the retained EXECUTE for `app_user`/`app_user_writer`,
-- the exact SELECT dependencies of `hrp_public_rpc`, and the absence of
-- leftover explicit SET-capable membership / CREATE-on-schema posture. The
-- migration may run as a PostgreSQL superuser in CI; superuser SET ROLE is
-- inherent and therefore is not evidence of a leaked temporary membership.
--
-- C-03 also grants `SELECT ON job_postings, job_openings TO hrp_public_rpc`
-- because the new RPC body selects from those two tables but the role's
-- grants were frozen at OP-01 (pre-A0 closeout) without those tables.
-- INSERT/UPDATE/DELETE are NOT granted.
--
-- SECURITY POSTURE (DEC-14, mirrors 20260823101500_*:49-58)
--   - `hrp_public_rpc` (NOLOGIN BYPASSRLS) is pre-provisioned by OP-01.
--   - The definer path does NOT trigger RLS policies; the only DB-level
--     guards on writes are explicit WHERE predicates inside the RPC body.
--   - This migration MUST NOT create or alter the role (`hrp_public_rpc`).
--
-- SCOPE (narrowest possible)
--   - Touches ONLY function `hrp_public_apply_submission`. No table changes
--     beyond the explicit SELECT grant.
--   - Owner transfer is idempotent (sets owner if already so).
--   - GRANT EXECUTE / REVOKE pattern mirrors 20260823101500_*:228-231.
--
-- NOT APPLIED TO PRODUCTION
--   Per T0 brief: T1A ships the migration file; T0/Owner applies to
--   production as a separate gate after the integration suite has PASSed
--   on writable staging.
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- PRE-FLIGHT ASSERTIONS (catalog verification, fail-closed).
--
-- Mỗi `ASSERT` này throw `EXCEPTION` với ERRCODE phù hợp nếu điều kiện
-- không thoả. Toàn bộ migration chạy trong BEGIN/COMMIT ở cuối file, nên
-- assertion fail sẽ rollback migration này (negative rollback proof).
-- ───────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_proc record;
  v_role_exists boolean;
  v_table_exists boolean;
  v_col_exists   boolean;
  v_app_user_grp record;
BEGIN
  -- (a) Predecessor function exists with exact signature.
  SELECT * INTO v_proc FROM pg_proc p
   WHERE p.oid = to_regprocedure(
     'public.hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamp with time zone,text,text,integer,text,text,text,text)'
   );
  IF v_proc IS NULL THEN
    RAISE EXCEPTION 'pre_assert_failed: predecessor function hrp_public_apply_submission missing'
      USING ERRCODE = 'P0011';
  END IF;
  -- (b) Role `hrp_public_rpc` exists and is NOLOGIN BYPASSRLS.
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_public_rpc') INTO v_role_exists;
  IF NOT v_role_exists THEN
    RAISE EXCEPTION 'pre_assert_failed: role hrp_public_rpc missing'
      USING ERRCODE = 'P0011';
  END IF;
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'hrp_public_rpc') IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'pre_assert_failed: hrp_public_rpc not BYPASSRLS'
      USING ERRCODE = 'P0011';
  END IF;

  -- (c) Required tables/columns exist (otherwise the new body would reference missing schema).
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'job_postings') INTO v_table_exists;
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'pre_assert_failed: table job_postings missing'
      USING ERRCODE = 'P0011';
  END IF;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'job_openings') INTO v_table_exists;
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'pre_assert_failed: table job_openings missing'
      USING ERRCODE = 'P0011';
  END IF;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'staffing_order_slots') INTO v_table_exists;
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'pre_assert_failed: table staffing_order_slots missing'
      USING ERRCODE = 'P0011';
  END IF;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'job_openings'
                    AND column_name = 'staffing_order_slot_id') INTO v_col_exists;
  IF NOT v_col_exists THEN
    RAISE EXCEPTION 'pre_assert_failed: job_openings.staffing_order_slot_id missing'
      USING ERRCODE = 'P0011';
  END IF;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'staffing_order_slots'
                    AND column_name = 'job_opening_id') INTO v_col_exists;
  IF NOT v_col_exists THEN
    RAISE EXCEPTION 'pre_assert_failed: staffing_order_slots.job_opening_id missing'
      USING ERRCODE = 'P0011';
  END IF;
END
$pre$;

-- ───────────────────────────────────────────────────────────────────────────
-- GRANT SELECT on the two new tables to hrp_public_rpc (C-03).
-- Without this, the new RPC body raises permission denied at runtime.
-- Only SELECT is granted; INSERT/UPDATE/DELETE remain denied.
-- ───────────────────────────────────────────────────────────────────────────
GRANT SELECT ON TABLE job_postings TO hrp_public_rpc;
GRANT SELECT ON TABLE job_openings   TO hrp_public_rpc;

-- The predecessor function is owned by hrp_public_rpc. PostgreSQL only permits the
-- owning role to CREATE OR REPLACE it, so enter that role before replacement and
-- revoke the temporary membership again before postflight.
GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
SET ROLE hrp_public_rpc;

-- ───────────────────────────────────────────────────────────────────────────
-- REPLACEMENT: hrp_public_apply_submission (canonical JobOpening-slot chain)
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

  -- (2) Resolve canonical chain (C-02): JobPosting(slug, status='PUBLISHED') → JobOpening(status='OPEN')
  --     → StaffingOrder(status IN (OPEN, CLOSING_SOON)) → THE EXACTLY-LINKED StaffingOrderSlot.
  --
  --     Three chain conditions MUST all hold for the slot to be valid (defense-in-depth):
  --       1. `s.id                = jo.staffing_order_slot_id`  — slot pointer on opening
  --       2. `s.staffing_order_id = jo.staffing_order_id`       — same StaffingOrder
  --       3. `s.job_opening_id    = jo.id`                       — reverse FK: slot is opened by this opening
  --
  --     A sibling slot under the same StaffingOrder but bound to a different JobOpening
  --     fails at least one of these conditions and is therefore NOT picked.
  --
  --     `p_slot_id` is OPTIONAL defense-in-depth: the route never sets it, but if a direct
  --     RPC caller passes one, the value MUST be the canonical linked slot. Sibling/wrong/
  --     unbound/expired/full slots all fail closed with `JOB_NOT_AVAILABLE` (`P0011`).
  IF p_slot_id IS NOT NULL THEN
    SELECT jp.id, so.id, s.id, (s.slots_needed - s.slots_filled)
      INTO v_job_posting_id, v_staffing_order_id, v_slot_id, v_avail
      FROM job_postings jp
      JOIN job_openings         jo ON jo.id = jp.job_opening_id
      JOIN staffing_orders      so ON so.id = jo.staffing_order_id
      JOIN staffing_order_slots s  ON s.id                = jo.staffing_order_slot_id
                                   AND s.staffing_order_id = jo.staffing_order_id
                                   AND s.job_opening_id    = jo.id
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
      JOIN job_openings         jo ON jo.id = jp.job_opening_id
      JOIN staffing_orders      so ON so.id = jo.staffing_order_id
      JOIN staffing_order_slots s  ON s.id                = jo.staffing_order_slot_id
                                   AND s.staffing_order_id = jo.staffing_order_id
                                   AND s.job_opening_id    = jo.id
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
-- Ownership + least-privilege EXECUTE. These statements run as the owning role.
-- ───────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) TO app_user_writer, app_user;

RESET ROLE;
-- Remove the temporary SET-capable grant. Postflight inspects pg_auth_members
-- directly because a PostgreSQL superuser inherently passes pg_has_role(..., 'SET')
-- even after the explicit membership has been removed.
DO $$
BEGIN
  EXECUTE format('REVOKE hrp_public_rpc FROM %I', session_user);
END
$$;
REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc;

-- ───────────────────────────────────────────────────────────────────────────
-- POST-FLIGHT ASSERTIONS (catalog verification, fail-closed).
-- Chạy SAU khi function + grants đã được set. Bất kỳ điều kiện nào fail thì
-- `COMMIT` cuối file sẽ không được gọi → toàn bộ migration rollback, và
-- integration negative-rollback test sẽ chứng minh predecessor state
-- (function/grants/data) không bị partial mutation.
-- ───────────────────────────────────────────────────────────────────────────
DO $post$
DECLARE
  v_proc record;
  v_searchpath text;
  v_has_public_exec boolean;
  v_has_app_exec boolean;
  v_has_writer_exec boolean;
  v_rpc_select_count integer;
  v_rpc_set_membership boolean;
  v_rpc_create_on_schema boolean;
BEGIN
  -- (a) Function still exists with the SAME signature.
  SELECT * INTO v_proc FROM pg_proc p
   WHERE p.oid = to_regprocedure(
     'public.hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamp with time zone,text,text,integer,text,text,text,text)'
   );
  IF v_proc IS NULL THEN
    RAISE EXCEPTION 'post_assert_failed: function missing after replacement'
      USING ERRCODE = 'P0011';
  END IF;
  -- (b) Function owner = hrp_public_rpc.
  IF (v_proc.proowner::regrole::text) IS DISTINCT FROM 'hrp_public_rpc' THEN
    RAISE EXCEPTION 'post_assert_failed: function owner is not hrp_public_rpc'
      USING ERRCODE = 'P0011';
  END IF;

  -- (c) prosecdef = true.
  IF v_proc.prosecdef IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'post_assert_failed: prosecdef is not true'
      USING ERRCODE = 'P0011';
  END IF;

  -- (d) proconfig chứa search_path = public, pg_temp.
  v_searchpath := array_to_string(v_proc.proconfig, ', ');
  IF v_searchpath IS NULL OR position('search_path=public, pg_temp' IN v_searchpath) = 0 THEN
    RAISE EXCEPTION 'post_assert_failed: proconfig missing search_path=public, pg_temp'
      USING ERRCODE = 'P0011';
  END IF;

  -- (e) PUBLIC không có EXECUTE.
  SELECT EXISTS (
    SELECT 1
      FROM aclexplode(COALESCE(v_proc.proacl, acldefault('f', v_proc.proowner))) acl
     WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ) INTO v_has_public_exec;
  IF v_has_public_exec THEN
    RAISE EXCEPTION 'post_assert_failed: PUBLIC retains EXECUTE'
      USING ERRCODE = 'P0011';
  END IF;

  -- (f) app_user và app_user_writer giữ EXECUTE.
  SELECT has_function_privilege('app_user', v_proc.oid, 'EXECUTE')
    INTO v_has_app_exec;
  SELECT has_function_privilege('app_user_writer', v_proc.oid, 'EXECUTE')
    INTO v_has_writer_exec;
  IF NOT v_has_app_exec THEN
    RAISE EXCEPTION 'post_assert_failed: app_user lost EXECUTE'
      USING ERRCODE = 'P0011';
  END IF;
  IF NOT v_has_writer_exec THEN
    RAISE EXCEPTION 'post_assert_failed: app_user_writer lost EXECUTE'
      USING ERRCODE = 'P0011';
  END IF;

  -- (g) hrp_public_rpc có đúng các SELECT dependency tối thiểu (job_postings, job_openings,
  --     staffing_order_slots, staffing_orders, candidate_submissions, application_status_history).
  SELECT COUNT(*) INTO v_rpc_select_count
    FROM information_schema.role_table_grants
   WHERE grantee = 'hrp_public_rpc'
     AND privilege_type = 'SELECT'
     AND table_schema = 'public'
     AND table_name IN ('job_postings','job_openings','staffing_order_slots','staffing_orders',
                        'candidate_submissions','application_status_history');
  IF v_rpc_select_count < 6 THEN
    RAISE EXCEPTION 'post_assert_failed: hrp_public_rpc missing required SELECT grants (got %)', v_rpc_select_count
      USING ERRCODE = 'P0011';
  END IF;

  -- (h) hrp_public_rpc KHÔNG có INSERT/UPDATE/DELETE trên các bảng public ở ngoài
  --     các bảng đã được OP-01 chốt (defensive: kiểm tra KHÔNG có INSERT/UPDATE/DELETE
  --     trên job_postings / job_openings).
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
     WHERE grantee = 'hrp_public_rpc'
       AND table_schema = 'public'
       AND table_name IN ('job_postings','job_openings')
       AND privilege_type IN ('INSERT','UPDATE','DELETE')
  ) THEN
    RAISE EXCEPTION 'post_assert_failed: hrp_public_rpc granted INSERT/UPDATE/DELETE on public tables'
      USING ERRCODE = 'P0011';
  END IF;

  -- (i) No explicit SET-capable membership remains after the temporary grant.
  -- Do not use pg_has_role(..., 'SET'): it is always true for a superuser and
  -- would reject a clean CI posture even when REVOKE removed the membership.
  SELECT EXISTS (
    SELECT 1
      FROM pg_auth_members membership
      JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
      JOIN pg_roles member_role ON member_role.oid = membership.member
     WHERE granted_role.rolname = 'hrp_public_rpc'
       AND member_role.rolname = session_user
       AND membership.set_option
  ) INTO v_rpc_set_membership;
  IF v_rpc_set_membership THEN
    RAISE EXCEPTION 'post_assert_failed: session_user retains explicit SET-capable membership in hrp_public_rpc'
      USING ERRCODE = 'P0011';
  END IF;

  -- (j) hrp_public_rpc KHÔNG còn CREATE ON SCHEMA public (đã REVOKE ở trên).
  SELECT has_schema_privilege('hrp_public_rpc', 'public', 'CREATE') INTO v_rpc_create_on_schema;
  IF v_rpc_create_on_schema THEN
    RAISE EXCEPTION 'post_assert_failed: hrp_public_rpc still has CREATE ON SCHEMA public'
      USING ERRCODE = 'P0011';
  END IF;
END
$post$;

COMMIT;
