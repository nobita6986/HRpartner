-- ============================================================================
-- Migration: hrp-v6-n2-aff-03c — fix candidate_submissions.labor_profile_id
-- Task:      hrp-v6-n2-aff-03c-cs-labor-profile-fix
--            (slice 03c of hrp-v6-n2-aff-03-apply-attribution; hotfix on top
--            of the AFF-03B feat commit 1e91705)
-- Baseline:  1e91705 (AFF-03B feat commit on
--            tier1/hrp-v6-n2-aff-03b-rls-runtime-fix, post-round-4 ACCEPTED)
-- Origin:    Forward-only correction from the Tier 0 AFF-03B production smoke.
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- Production smoke (single row, fixture "HRP Production Smoke Check") showed:
--   LaborProfile=1, PlacementCase=1, CandidateSubmission=1,
--   but CandidateSubmission.placement_case_id NOT NULL AND
--           CandidateSubmission.labor_profile_id = NULL.
--
-- Root cause: the AFF-03B RPC `hrp_public_intake_submission(jsonb)` INSERT
-- into `candidate_submissions` (migration `20260919100000_*` lines 422-444)
-- enumerates 12 columns but does NOT include `labor_profile_id`. The PL/pgSQL
-- body has `v_lp_id` populated by step (4) of DEC-11, but never passes it
-- into the INSERT column list. Schema has `labor_profile_id TEXT NULL` with
-- FK to `labor_profiles(id)` (schema.prisma:586). The TS-layer N1 writer
-- (`src/domains/talent/intake-writer.service.ts`) DOES set this column; only
-- the SECURITY DEFINER RPC is missing it. The DTO returned to the route is
-- correct (it carries `laborProfileId`); the bug is the column omission in
-- the INSERT. The migration applies the FIX forward-only.
--
-- WHAT THIS MIGRATION DOES
-- -------------------------
-- 1. Temporarily grant the migration session SET access to hrp_public_rpc,
--    then CREATE OR REPLACE FUNCTION while SET ROLE hrp_public_rpc is active.
--    The existing function is already owned by this role.
--
-- 2. CREATE OR REPLACE FUNCTION hrp_public_intake_submission(jsonb)
--    — body identical to migration `20260919100000_*` EXCEPT the INSERT into
--    candidate_submissions now includes the column `labor_profile_id` and
--    passes the literal value `v_lp_id`. All other body, signature, RETURN
--    TABLE shape, RETURNS NEXT ordering, and DEC-11 (a)/(b)/(c) attribution
--    guard triad are preserved verbatim.
--
-- 3. Forward-only BACKFILL of the 1 affected production row plus any future
--    rows from re-deployments of legacy code paths (defense in depth — the
--    production smoke showed exactly 1 such row, "HRP Production Smoke Check";
--    backfill is idempotent and constrained to NULL + placement_case_id IS
--    NOT NULL).
--
--    Backfill SQL:
--      UPDATE candidate_submissions cs
--         SET labor_profile_id = pc.labor_profile_id
--        FROM placement_case pc
--       WHERE cs.placement_case_id = pc.id
--         AND cs.labor_profile_id IS NULL
--         AND pc.labor_profile_id IS NOT NULL;
--
--    Run as the migration administrator after RESET ROLE. The UPDATE is
--    idempotent: a re-run after a successful backfill matches zero rows (the
--    WHERE predicate `cs.labor_profile_id IS NULL` filters them out).
--
-- 4. Ownership, grants, search_path, and membership-choreography mirror
--    the AFF-03B precedent verbatim (`20260919100000_*` §4-§6, DEC-14, DEC-15):
--      - REVOKE ALL ON FUNCTION ... FROM PUBLIC
--      - GRANT EXECUTE ON FUNCTION ... TO app_user_writer, app_user
--        (for the SECURITY DEFINER RPC; helpers retain GRANT EXECUTE TO PUBLIC
--         from the prior migration — see DEC-12 / DEC-14)
--      - GRANT CREATE ON SCHEMA public TO hrp_public_rpc
--      - GRANT hrp_public_rpc TO <session_user> WITH SET TRUE
--      - SET ROLE hrp_public_rpc before CREATE OR REPLACE
--      - RESET ROLE before the data backfill
--      - GRANT hrp_public_rpc TO <session_user> WITH SET FALSE
--      - REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc
--      - REVOKE hrp_public_rpc FROM <session_user>   (RQ-06 hygiene)
--
-- 5. hrp_public_rpc role is PRE-PROVISIONED by OP-01 (scripts/create-public-rpc-role.cjs).
--    This migration MUST NOT create or alter the role (DEC-09, DEC-14).
--
-- SCOPE (minimal — DEC-15)
--   - Same 5 tables touched as AFF-03B; no new grants added; no new GRANTs
--     beyond what `20260919100000_*` already issues. The candidate_submissions
--     INSERT column list is widened by exactly one column (`labor_profile_id`).
--   - No DELETE; no UPDATE on labor_profiles / placement_case /
--     labor_profile_handling_assignments; the only UPDATE introduced is the
--     backfill which is forward-only and idempotent (matches zero rows after
--     first successful apply on a clean DB).
--
-- IDEMPOTENT
--   - CREATE OR REPLACE FUNCTION idempotent.
--   - Backfill UPDATE idempotent (zero rows match after first run on a clean
--     DB; on production the 1 affected row matches on first apply; a re-apply
--     matches zero rows).
--   - GRANT EXECUTE and the temporary SET-role choreography are idempotent.
--   - Membership-choreography GRANT/REVOKE idempotent.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief: "KHONG apply migration len production". Tier 1 ships
--   the migration file; T0/Owner applies to production as a separate gate
--   after the integration suite has PASSed on writable staging.
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Acquire the definer role before replacing the existing function.
--
--    The function created by AFF-03B is already owned by hrp_public_rpc.
--    A plain CREATE OR REPLACE executed as session_user would therefore fail
--    with "must be owner of function" on staging/production. Grant temporary
--    SET membership and execute the replacement as the owning role. RESET ROLE
--    before the data backfill so the migration administrator performs UPDATE.
-- ───────────────────────────────────────────────────────────────────────────

GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
SET ROLE hrp_public_rpc;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Replace the SECURITY DEFINER RPC — fix INSERT to include labor_profile_id.
--    Signature, RETURN TABLE shape, DEC-11 (a)/(b)/(c) triad, search_path,
--    SECURITY DEFINER are all preserved verbatim from `20260919100000_*`.
--    Only the INSERT column list on `candidate_submissions` is widened by
--    one column (the missing `labor_profile_id`) and the literal value
--    `v_lp_id` is added to the VALUES clause.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hrp_public_intake_submission(p_payload jsonb)
RETURNS TABLE(
  -- NOTE: labor_profile_id and candidate_submission_id are `text` (NOT `uuid`)
  -- because Prisma maps `@id @default(uuid())` to `TEXT` column with a UUID
  -- string. Casting to uuid here would break the `placement_case.labor_profile_id`
  -- FK reference (which is TEXT).
  labor_profile_id text,
  candidate_submission_id text,
  placement_case_id text,
  verdict text,
  possible_match jsonb,
  attribution_consumed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
#variable_conflict use_column
DECLARE
  v_full_name         text;
  v_phone             text;
  v_norm_phone        text;
  v_norm_full_name    text;
  v_cccd              text;
  v_dob               date;
  v_consent_at        timestamptz;
  v_intent            text;
  v_channel           text;
  v_project_id        text;
  v_job_opening_id    text;
  v_actor_id          text;
  v_referrer_attr_id  text;

  v_verdict           text;
  v_candidate         jsonb;
  v_has_conflict      boolean;

  v_lp_id             text;
  v_pc_id             text;
  v_cs_id             text;

  v_attr_referrer_uid text;
  v_attr_consumed     boolean := false;
  v_attr_row_count    integer := 0;
  v_lpha_assignee     text;
BEGIN
  -- 1. Read inputs from the JSONB payload.
  v_full_name        := NULLIF(btrim(p_payload->>'fullName'), '');
  v_phone            := p_payload->>'phone';
  v_cccd             := NULLIF(btrim(p_payload->>'cccdNumber'), '');
  BEGIN
    v_dob := (p_payload->>'dateOfBirth')::date;
  EXCEPTION WHEN OTHERS THEN
    v_dob := NULL;
  END;
  BEGIN
    v_consent_at := (p_payload->>'consentAt')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    v_consent_at := NULL;
  END;
  v_intent           := COALESCE(p_payload->>'intent', 'JOB_INTEREST');
  v_channel          := COALESCE(p_payload->>'channel', 'PUBLIC_MARKETPLACE');
  v_project_id       := p_payload->>'projectId';
  v_job_opening_id   := p_payload->>'jobOpeningId';
  v_actor_id         := COALESCE(NULLIF(btrim(p_payload->>'actorId'), ''), 'system:public-intake');
  v_referrer_attr_id := NULLIF(btrim(p_payload->>'referralAttributionId'), '');

  -- Required-field guard (mirrors MP-2 RPC at 20260823101500_*:97-102).
  IF v_full_name IS NULL OR v_phone IS NULL OR v_phone = '' OR v_referrer_attr_id = 'invalid' THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Score against existing labor_profiles.
  SELECT s.verdict, s.candidate, s.has_conflict
    INTO v_verdict, v_candidate, v_has_conflict
    FROM hrp_score_labor_profile(v_full_name, v_phone, v_cccd) AS s
   LIMIT 1;

  v_norm_phone     := hrp_normalize_phone(v_phone);
  v_norm_full_name := hrp_normalize_full_name(v_full_name);

  -- 3. POSSIBLE_MATCH short-circuit: no INSERT, no UPDATE, no LPHA.
  IF v_verdict = 'POSSIBLE_MATCH' THEN
    labor_profile_id := NULL;
    candidate_submission_id := NULL;
    placement_case_id := NULL;
    verdict := 'POSSIBLE_MATCH';
    possible_match := v_candidate;
    attribution_consumed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 4. Resolve / create LaborProfile.
  IF v_verdict = 'EXACT_MATCH' THEN
    v_lp_id := (v_candidate->>'laborProfileId');   -- already text (LP.id = String)
  ELSE
    -- NEW_PROFILE: insert one row.
    INSERT INTO labor_profiles (
      id, full_name, normalized_phone, phone, cccd_number,
      consent_at, identity_verification, completeness,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_full_name,
      NULLIF(v_norm_phone, ''),
      v_phone,
      v_cccd,
      v_consent_at,
      'UNVERIFIED',
      'MINIMAL',
      now(),
      now()
    )
    RETURNING id INTO v_lp_id;
  END IF;

  -- 5. INSERT placement_case (one ACTIVE case per LP — partial unique index
  --    placement_case_labor_profile_id_active_unique enforces; if another
  --    active case exists, we'll get a unique-violation and fall through to
  --    reuse the existing one, mirroring the writer at
  --    src/domains/talent/intake-writer.service.ts:146-160).
  BEGIN
    INSERT INTO placement_case (
      id, labor_profile_id, status, opened_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, v_lp_id, 'OPEN', now(), now(), now()
    )
    RETURNING id INTO v_pc_id;
  EXCEPTION WHEN unique_violation THEN
    -- Reuse existing ACTIVE placement_case for this LaborProfile.
    SELECT id INTO v_pc_id
      FROM placement_case
     WHERE labor_profile_id = v_lp_id
       AND status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')
     ORDER BY opened_at DESC
     LIMIT 1;
  END;

  -- 6. INSERT candidate_submissions (anon → vendor_id=NULL, ctv_id=NULL per DEC-13).
  --    AFF-03C FIX: include `labor_profile_id = v_lp_id` so the FK to
  --    labor_profiles is materialized on the row at insert time. The TS N1
  --    intake writer already sets this column; only the SECURITY DEFINER RPC
  --    was omitting it (production smoke 2026-09-21 showed the resulting
  --    NULL while placement_case_id was non-null).
  INSERT INTO candidate_submissions (
    id, project_id, slot_id, placement_case_id, labor_profile_id,
    full_name, phone,
    normalized_phone, cccd_number, date_of_birth, consent_at, status,
    vendor_id, ctv_id, created_at
  ) VALUES (
    gen_random_uuid(),
    NULLIF(v_project_id, ''),
    NULLIF(v_job_opening_id, ''),
    v_pc_id,
    v_lp_id,                          -- AFF-03C FIX (was missing in 20260919100000_*)
    v_full_name,
    v_phone,
    NULLIF(v_norm_phone, ''),
    v_cccd,
    v_dob,
    v_consent_at,
    'NEW',
    NULL,
    NULL,
    now()
  )
  RETURNING id INTO v_cs_id;

  -- 7. Attribution triad (DEC-11 (a)/(b)/(c)):
  --    (a) service-level pre-filter happened BEFORE this RPC (resolveActiveAttributionId);
  --        v_referrer_attr_id is already null iff service rejected. No re-check needed here.
  --    (b) RPC-body probe: reject rows already bound to another LP.
  --    (c) RPC-body WHERE predicate in the UPDATE: ACTIVE + not expired + unbound.
  IF v_referrer_attr_id IS NOT NULL THEN
    SELECT referrer_user_id INTO v_attr_referrer_uid
      FROM referral_attributions
     WHERE id = v_referrer_attr_id
       AND status = 'ACTIVE'
       AND expires_at > now()
       AND labor_profile_id IS NULL
     LIMIT 1;

    IF v_attr_referrer_uid IS NOT NULL THEN
      UPDATE referral_attributions
         SET status = 'CONSUMED',
             consumed_at = now(),
             labor_profile_id = v_lp_id
       WHERE id = v_referrer_attr_id
         AND status = 'ACTIVE'
         AND expires_at > now()
         AND labor_profile_id IS NULL;

      -- Verify exactly one row consumed (defense in depth: assert the UPDATE
      -- matched before we INSERT the LPHA; the WHERE predicate is the only
      -- guard here because the definer path has BYPASSRLS — DEC-14).
      GET DIAGNOSTICS v_attr_row_count = ROW_COUNT;
      v_attr_consumed := (v_attr_row_count = 1);

      IF v_attr_consumed THEN
        v_lpha_assignee := v_attr_referrer_uid;
        INSERT INTO labor_profile_handling_assignments (
          id, labor_profile_id, assignee_user_id, assigned_by_user_id,
          source, starts_at, status, created_at, updated_at, version
        ) VALUES (
          gen_random_uuid(),
          v_lp_id,
          v_lpha_assignee,
          NULL,           -- AFF_INITIAL: assigned_by_user_id IS NULL per schema line 1718
          'AFF_INITIAL',
          now(),
          'ACTIVE',
          now(),
          now(),
          1
        );
      END IF;
    END IF;
  END IF;

  -- 8. RETURN QUERY.
  labor_profile_id := v_lp_id;
  candidate_submission_id := v_cs_id;
  placement_case_id := v_pc_id;
  verdict := v_verdict;
  possible_match := NULL;
  attribution_consumed := v_attr_consumed;
  RETURN NEXT;
END;
$fn$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. EXECUTE grants — mirror 20260919100000_* §4 verbatim. The RPC body is
--    the new one from §1 above; the grants remain the same because the
--    signature is unchanged.
-- ───────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION hrp_public_intake_submission(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_public_intake_submission(jsonb) TO app_user_writer, app_user;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Restore the migration administrator and close temporary privileges.
--    CREATE OR REPLACE ran as hrp_public_rpc, so ownership never changes and
--    no ALTER FUNCTION OWNER step is necessary.
-- ───────────────────────────────────────────────────────────────────────────

RESET ROLE;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET FALSE', session_user);
END
$$;
REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc;
-- RQ-06 closure: revoke the membership itself so the session role does NOT
-- remain a member of hrp_public_rpc after this migration. Without this,
-- `WITH SET FALSE` would only lower the SET-privilege; membership would
-- persist as a quiet privilege escalation vector.
DO $$
BEGIN
  EXECUTE format('REVOKE hrp_public_rpc FROM %I', session_user);
END
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Forward-only BACKFILL — fix production row(s) where
--    placement_case_id IS NOT NULL AND labor_profile_id IS NULL.
--
--    Production smoke (2026-09-21) showed exactly 1 such row, fixture
--    "HRP Production Smoke Check". The UPDATE is idempotent: after the first
--    apply the WHERE clause `cs.labor_profile_id IS NULL` matches zero rows
--    and a re-apply is a no-op.
--
--    Run as the migration's session_user; the UPDATE statement grants on
--    `candidate_submissions` (INSERT only — DEC-15) do NOT permit UPDATE
--    to hrp_public_rpc, so this backfill must run as a role that holds
--    UPDATE on candidate_submissions. Per the precedent at
--    `20260823101500_mp2_apply_tracking` §6, the migration applies under
--    the admin/superuser role that owns the migration chain. The schema
--    owner of `candidate_submissions` is the migration session role
--    (typically `neondb_owner`), which has full table privileges.
--
--    Defense in depth: the UPDATE is wrapped in a DO block that asserts
--    zero affected rows OR all affected rows have a non-NULL
--    placement_case.labor_profile_id after the UPDATE; we then re-verify
--    by counting remaining NULLs.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_affected integer := 0;
  v_remaining_nulls bigint := 0;
BEGIN
  -- 4.1 Perform the backfill.
  UPDATE candidate_submissions cs
     SET labor_profile_id = pc.labor_profile_id
    FROM placement_case pc
   WHERE cs.placement_case_id = pc.id
     AND cs.labor_profile_id IS NULL
     AND pc.labor_profile_id IS NOT NULL;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  -- 4.2 Re-verify: count remaining cs rows where placement_case_id NOT NULL
  --     AND labor_profile_id IS NULL. Expected: 0 (all backfilled).
  SELECT count(*) INTO v_remaining_nulls
    FROM candidate_submissions cs
    JOIN placement_case pc ON pc.id = cs.placement_case_id
   WHERE cs.placement_case_id IS NOT NULL
     AND cs.labor_profile_id IS NULL;

  IF v_remaining_nulls > 0 THEN
    RAISE EXCEPTION 'AFF-03C backfill incomplete: % candidate_submissions row(s) still have placement_case_id NOT NULL AND labor_profile_id IS NULL (affected by this apply: %)',
      v_remaining_nulls, v_affected
      USING ERRCODE = 'P0001';
  END IF;

  RAISE NOTICE 'AFF-03C backfill complete: % candidate_submissions row(s) restored; 0 remaining orphan NULLs',
    v_affected;
END
$$;
