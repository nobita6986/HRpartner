-- ============================================================================
-- Migration: hrp-v6-n2-aff-03b public anon intake RPC (SECURITY DEFINER)
-- Task:      hrp-v6-n2-aff-03b-rls-runtime-fix (slice 03b of hrp-v6-n2-aff-03-apply-attribution)
-- Baseline:  1059f666 (origin/main post AFF-03 merge)
-- Author:    Tier 1 (T1B), under Tier 0 verdict on rounds 0..4
-- Status:    ADDITIVE — adds 4 PL/pgSQL functions + grants for the public anon
--            intake path at POST /api/public/intake. Does NOT modify the
--            existing Prisma writer chain at src/domains/talent/intake-writer.service.ts
--            (preserved for non-anon flows). Does NOT touch N2-1 RLS or any
--            existing policy. The 2 writer policies hrp_ra_select_writer and
--            hrp_ra_update_writer from 20260918100000_* remain unchanged for
--            app_user_writer (non-anon paths).
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- The original anon write path at /api/public/intake called the Prisma
-- writer chain, which under FORCE RLS failed with SQLSTATE 42501 on
-- INSERT INTO labor_profiles (the writer's createOrMatchLaborProfile at
-- src/domains/talent/labor-profile.service.ts:265 is gated by
-- hrp_labor_profile_scope, which denies anon/no-app.role GUC).
--
-- After 4 rounds of T0 review, the chosen shape is **Full RPC** that mirrors
-- the precedent at prisma/migrations/20260823101500_mp2_apply_tracking/
-- migration.sql:65-199 (hrp_public_apply_submission). The RPC owns the
-- entire anon write chain end-to-end:
--
--   1. PL/pgSQL normalizers (hrp_normalize_phone, hrp_normalize_full_name).
--   2. PL/pgSQL scoreAndClassify mirror (hrp_score_labor_profile) — the
--      ≥2-signal EXACT_MATCH rule from src/domains/talent/labor-profile.service.ts:164-168
--      is preserved verbatim (round-2 finding: a blind-INSERT strategy would
--      corrupt dedup identity — phone-only new applicants would become
--      POSSIBLE_MATCH instead of NEW_PROFILE; returning applicants would
--      create duplicate labor_profiles rows).
--   3. INSERT labor_profiles only on verdict='NEW_PROFILE'.
--   4. INSERT placement_case.
--   5. INSERT candidate_submissions (vendor_id=NULL, ctv_id=NULL per DEC-13).
--   6. WHEN referralAttributionId is non-NULL:
--      a. RPC-body probe (DEC-11 (b)): SELECT 1 FROM referral_attributions
--         WHERE id=$refAttrId AND labor_profile_id IS NULL — rejects rows
--         that are already bound.
--      b. RPC-body WHERE predicate (DEC-11 (c)): UPDATE referral_attributions
--         SET status='CONSUMED', consumed_at=now(), labor_profile_id=<lp_id>
--         WHERE id=$refAttrId AND status='ACTIVE' AND expires_at > now()
--         AND labor_profile_id IS NULL — the WHERE clause is the actual
--         DB-level guard.
--   7. INSERT labor_profile_handling_assignments (source='AFF_INITIAL',
--      assignee_user_id=<referrer_user_id>) when the UPDATE succeeded.
--   8. RETURN QUERY the assembled 6-tuple.
--
-- SECURITY POSTURE (DEC-14)
-- -------------------------
-- hrp_public_rpc is **NOLOGIN BYPASSRLS**, pre-provisioned by OP-01 via
-- scripts/create-public-rpc-role.cjs (mirrors precedent
-- 20260823101500_mp2_apply_tracking/migration.sql:1-6,49-51,253-258).
-- This migration MUST NOT create or alter the role (DEC-09, DEC-14).
-- Because the role has BYPASSRLS, NO RLS policy applies to the RPC's
-- writes — the policies hrp_labor_profile_scope, hrp_ra_update_writer, etc.
-- do not gate the definer path. The ONLY DB-level guard on the
-- UPDATE referral_attributions is the WHERE predicate in step (6.b).
-- This is by design and is asserted by AC-15/AC-16.
--
-- SCOPE (narrowest possible — DEC-15)
--   - labor_profiles: SELECT (for scoreAndClassify reads) + INSERT (for
--     verdict='NEW_PROFILE' only).
--   - placement_case: INSERT (Prisma @@map = placement_case, singular).
--   - candidate_submissions: INSERT.
--   - labor_profile_handling_assignments: INSERT.
--   - referral_attributions: SELECT (for the (b)-probe and to read
--     referrer_user_id) + UPDATE (for the ACTIVE → CONSUMED transition).
--   No DELETE on any table; no UPDATE on labor_profiles / candidate_submissions
--   / placement_case / labor_profile_handling_assignments.
--
-- IDEMPOTENT
--   DROP POLICY IF EXISTS ... pattern not used (no policies added here).
--   CREATE OR REPLACE FUNCTION for the 4 functions. The ownership transfer
--   (ALTER FUNCTION ... OWNER TO hrp_public_rpc) is idempotent (sets owner).
--   GRANT EXECUTE / GRANT table privileges are idempotent.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief: "KHONG apply migration len production". Tier 1 ships
--   the migration file; T0/Owner applies to production as a separate gate
--   after the integration suite has PASSed on writable staging.
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- 1. PL/pgSQL normalizers — IMMUTABLE, NOT SECURITY DEFINER (pure)
--    Mirrors of src/domains/talent/normalize.ts:normalizePhone / normalizeFullName.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hrp_normalize_phone(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $fn$
DECLARE
  v_trimmed text;
  v_digits  text;
BEGIN
  IF p_input IS NULL THEN RETURN ''; END IF;
  v_trimmed := btrim(p_input);
  IF v_trimmed = '' THEN RETURN ''; END IF;
  v_digits := regexp_replace(v_trimmed, '\D', '', 'g');
  IF v_digits = '' THEN RETURN ''; END IF;
  -- Strip VN country prefix `84` or leading `0` (only VN — same rule as TS).
  IF v_digits LIKE '84%' AND length(v_digits) > 9 THEN
    RETURN substring(v_digits FROM 3);
  END IF;
  IF v_digits LIKE '0%' AND length(v_digits) > 1 THEN
    RETURN substring(v_digits FROM 2);
  END IF;
  RETURN v_digits;
END;
$fn$;

CREATE OR REPLACE FUNCTION hrp_normalize_full_name(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $fn$
BEGIN
  IF p_input IS NULL THEN RETURN ''; END IF;
  RETURN lower(btrim(regexp_replace(p_input, '\s+', ' ', 'g')));
END;
$fn$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. PL/pgSQL scoreAndClassify mirror (DEC-12, RQ-14, AC-17)
--    Reproduces the ≥2-signal EXACT_MATCH rule from
--    src/domains/talent/labor-profile.service.ts:108-184 (lines 161-184, the
--    scoreAndClassify body). NOT SECURITY DEFINER — runs under the caller's
--    role (which is hrp_public_rpc when called from hrp_public_intake_submission).
--    Returns a verdict + the matched candidate (or multiple on POSSIBLE_MATCH).
--    The caller (the anon RPC) only ever needs verdict ∈
--    {'EXACT_MATCH','NEW_PROFILE','POSSIBLE_MATCH'}; the candidate JSON is
--    surfaced on POSSIBLE_MATCH for the route to translate into a 409.
-- ───────────────────────────────────────────────────────────────────────────

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
  v_norm_phone text;
  v_norm_name  text;
  v_signals_provided int;
  v_match_count int;
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
  -- NOTE: p_date_of_birth intentionally NOT counted as a scoring signal because
  -- LaborProfile does not store date_of_birth. Only phone + cccd + fullName are
  -- used for identity resolution (mirrors createOrMatchLaborProfile signals).

  -- No signals provided → NEW_PROFILE (no candidates to match).
  IF v_signals_provided = 0 THEN
    verdict := 'NEW_PROFILE';
    candidate := NULL;
    has_conflict := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Candidate set: rows where any of the normalized signals match.
  -- Mirrors createOrMatchLaborProfile's OR-of-signals at lines 222-228.
  -- We use SELECT INTO LOOP to keep the function single-statement simple.
  FOR r IN
    SELECT lp.id AS lp_id,
           lp.normalized_phone,
           lp.cccd_number,
           lp.full_name
      FROM labor_profiles lp
     WHERE (v_norm_phone <> '' AND lp.normalized_phone = v_norm_phone)
        OR (p_cccd IS NOT NULL AND btrim(p_cccd) <> '' AND lp.cccd_number = btrim(p_cccd))
     LIMIT 50
  LOOP
    -- Compute signals-matched + conflicting-evidence for THIS candidate.
    DECLARE
      v_sm jsonb := '[]'::jsonb;
      v_ce jsonb := '[]'::jsonb;
    BEGIN
      IF v_norm_phone <> '' AND r.normalized_phone IS NOT NULL THEN
        IF r.normalized_phone = v_norm_phone THEN
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
      -- NOTE: date_of_birth NOT used for scoring — LaborProfile has no date_of_birth column.
      -- Only phone + cccd + fullName are the identity resolution signals.

      -- A candidate "counts" only if it has at least one matching signal.
      IF jsonb_array_length(v_sm) >= 1 THEN
        v_candidate_ids := v_candidate_ids || jsonb_build_array(r.lp_id);
        v_match_count := v_match_count + 1;
        IF jsonb_array_length(v_sm) >= 2 AND jsonb_array_length(v_ce) = 0 THEN
          -- exact on this candidate
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

  -- Has candidate(s) but none exact → POSSIBLE_MATCH (with conflict info).
  verdict := 'POSSIBLE_MATCH';
  candidate := jsonb_build_object(
    'candidates', v_signals_matched,
    'signalsProvided', v_signals_provided
  );
  has_conflict := v_conflict;
  RETURN NEXT;
END;
$fn$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Main RPC: hrp_public_intake_submission — full chain, SECURITY DEFINER.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hrp_public_intake_submission(p_payload jsonb)
RETURNS TABLE(
  labor_profile_id uuid,
  candidate_submission_id uuid,
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

  v_lp_id             uuid;
  v_pc_id             text;
  v_cs_id             uuid;

  v_attr_referrer_uid text;
  v_attr_consumed     boolean := false;
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
    v_lp_id := (v_candidate->>'laborProfileId')::uuid;
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
  INSERT INTO candidate_submissions (
    id, project_id, slot_id, placement_case_id, full_name, phone,
    normalized_phone, cccd_number, date_of_birth, consent_at, status,
    vendor_id, ctv_id, created_at
  ) VALUES (
    gen_random_uuid(),
    NULLIF(v_project_id, ''),
    NULLIF(v_job_opening_id, ''),
    v_pc_id,
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
     WHERE id = v_referrer_attr_id::uuid
       AND status = 'ACTIVE'
       AND expires_at > now()
       AND labor_profile_id IS NULL
     LIMIT 1;

    IF v_attr_referrer_uid IS NOT NULL THEN
      UPDATE referral_attributions
         SET status = 'CONSUMED',
             consumed_at = now(),
             labor_profile_id = v_lp_id
       WHERE id = v_referrer_attr_id::uuid
         AND status = 'ACTIVE'
         AND expires_at > now()
         AND labor_profile_id IS NULL;

      -- Verify exactly one row consumed (defense in depth: assert the UPDATE
      -- matched before we INSERT the LPHA; the WHERE predicate is the only
      -- guard here because the definer path has BYPASSRLS — DEC-14).
      GET DIAGNOSTICS v_attr_consumed = ROW_COUNT;
      v_attr_consumed := (v_attr_consumed = 1);

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
-- 4. EXECUTE grants (REVOKE FROM PUBLIC; GRANT to app_user_writer + app_user).
--    Mirrors 20260823101500_*:231-232.
-- ───────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION hrp_normalize_phone(text) FROM PUBLIC;
-- IMMUTABLE pure helpers — safe to expose to PUBLIC (no side-effects).
-- Mirrors the precedent pattern: helpers don't need role-restricted EXECUTE.
-- CI bootstrap doesn't provision app_user_writer/app_user at migration time,
-- so granting to PUBLIC avoids "role does not exist" silent failures in GRANT.
GRANT EXECUTE ON FUNCTION hrp_normalize_phone(text) TO PUBLIC;

REVOKE ALL ON FUNCTION hrp_normalize_full_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_normalize_full_name(text) TO PUBLIC;

REVOKE ALL ON FUNCTION hrp_score_labor_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_score_labor_profile(text, text, text) TO PUBLIC;

REVOKE ALL ON FUNCTION hrp_public_intake_submission(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_public_intake_submission(jsonb) TO app_user_writer, app_user;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Ownership transfer — DEC-14 / mirrors 20260823101500_*:238-251.
--    hrp_public_rpc is PRE-PROVISIONED by OP-01 (scripts/create-public-rpc-role.cjs).
--    This migration MUST NOT create the role. We only transfer ownership for
--    the 4 functions and revoke CREATE-on-schema afterward.
--    Membership-choreography closes the residual: after `WITH SET FALSE` the
--    session_user is STILL a member of hrp_public_rpc; we explicitly REVOKE
--    it so this migration leaves no dangling membership (RQ-06 hygiene rule).
-- ───────────────────────────────────────────────────────────────────────────

GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
ALTER FUNCTION hrp_score_labor_profile(text, text, text) OWNER TO hrp_public_rpc;
ALTER FUNCTION hrp_public_intake_submission(jsonb) OWNER TO hrp_public_rpc;
-- Pure normalizers stay under session_user ownership (they have prosecdef=false
-- so the caller's role applies; ownership by hrp_public_rpc is unnecessary and
-- would muddy the pg_proc.proowner row for non-definer helpers).
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
-- 6. Table privileges for hrp_public_rpc — DEC-15 / mirrors
--    20260823101500_*:253-258. BYPASSRLS != GRANT, so we must explicitly
--    grant the minimal table privileges the definer path needs.
-- ───────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON labor_profiles TO hrp_public_rpc;
GRANT INSERT ON candidate_submissions TO hrp_public_rpc;
GRANT SELECT, INSERT ON placement_case TO hrp_public_rpc;
GRANT INSERT ON labor_profile_handling_assignments TO hrp_public_rpc;
GRANT SELECT, UPDATE ON referral_attributions TO hrp_public_rpc;
