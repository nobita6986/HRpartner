-- ============================================================================
-- Migration: hrp-v6-n2-aff-05a-r1-canonical-initial-handling
-- Task:      hrp-v6-n2-aff-05a-r1-canonical-initial-handling
-- Baseline:  e4d21807f0d972de447e710066b40c77a661fb17 (origin/main post ER-002)
-- Origin:    TASK v1.1 at commit 2aaf38eff33a6f578737935404279211717c86c8
--
-- WHAT THIS MIGRATION DOES
-- -------------------------
-- 1. Replace the SECURITY DEFINER RPC `hrp_public_intake_submission(jsonb)` body
--    to add advisory transaction lock + 168-hour initial handling window, per
--    DEC-04 / DEC-05 / DEC-01 / DEC-03. The new body:
--
--    a. Captures one `transaction_timestamp()` for deterministic `starts_at` and
--       deadline computation (DEC-01: one server snapshot, no client clock).
--    b. Resolves canonical LP (existing or new — same logic as AFF-03C).
--    c. Acquires `pg_advisory_xact_lock(hashtextextended('AFF05A_R1:' || v_lp_id, 0))`
--       immediately after canonical LP resolution (DEC-04).
--    d. Re-reads canonical attribution and active handling assignment under the
--       lock (DEC-05).
--    e. On attribution+active-handling already present: preserves both, creates
--       submission, does NOT consume or rebind (DEC-03).
--    f. Otherwise: consumes attribution if present, creates exactly one
--       `AFF_INITIAL ACTIVE` LPHA with `starts_at = v_txn_ts` and
--       `expires_at = v_txn_ts + interval '168 hours'`.
--
-- 2. Grants exactly `SELECT` on `labor_profile_handling_assignments` to
--    `hrp_public_rpc` — needed for post-lock re-read in step (1.d).
--    The existing `INSERT` on this table is preserved; no UPDATE/DELETE/ALL.
--
-- 3. Runs atomic backfill under migration admin (after RESET ROLE):
--    grants SELECT, acquires advisory table lock, re-validates predicate,
--    applies DEC-06 / DEC-07, asserts zero violations, and rolls back
--    everything on any anomaly.
--
-- TRANSACTION BOUNDARY (TASK §4.5)
-- ---------------------------------
-- The entire migration body runs inside one explicit transaction (BEGIN ...
-- COMMIT). Any RAISE EXCEPTION in any step (function replacement, GRANT,
-- backfill UPDATE, anomaly check, final assertion) rolls back function
-- replacement, grant and row updates together. The wrapper `psql -1` is
-- NOT relied upon for atomicity; the file's own BEGIN/COMMIT is.
--
-- SCOPE (minimal — §4.2 Exact File Allowlist item 1)
--   - Exactly one forward-only migration; no schema change.
--   - One new RPC body; signature/owner/definer/search_path unchanged.
--   - Exactly one ADDITIVE privilege: handling-table SELECT for hrp_public_rpc.
--   - No DELETE; the backfill only UPDATE + INSERT.
--
-- IDEMPOTENT
--   - CREATE OR REPLACE FUNCTION: idempotent.
--   - GRANT SELECT: idempotent.
--   - Backfill UPDATE: matches zero rows after first apply.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief. Migration file ships only. T0 runs production preflight
--   and applies via a separate gate. Dedicated synthetic DB used for CI.
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Acquire the definer role before replacing the function.
-- ───────────────────────────────────────────────────────────────────────────

GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
SET ROLE hrp_public_rpc;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Replace the SECURITY DEFINER RPC — AFF-05A-R1 body.
--
--    Changes from AFF-03C:
--    + One `transaction_timestamp()` captured before any branching.
--    + Advisory transaction lock after canonical LP resolution (DEC-04).
--    + Re-read of canonical attribution + active LPHA under lock (DEC-05).
--    + Preservation logic when attribution+handler already present (DEC-03).
--    + LPHA INSERT with `starts_at = v_txn_ts` and
--      `expires_at = v_txn_ts + interval '168 hours'` (DEC-01).
--
--    Preserved verbatim from AFF-03C:
--    - Function signature, LANGUAGE, SECURITY DEFINER, SET search_path.
--    - Input parsing, scoring, POSSIBLE_MATCH short-circuit.
--    - LP resolution (EXACT_MATCH / NEW_PROFILE).
--    - placement_case INSERT / reuse (unique-violation catch).
--    - candidate_submissions INSERT (includes labor_profile_id per AFF-03C).
--    - Attribution triad (DEC-11 (a)/(b)/(c)) pre-lock probe + UPDATE.
--    - RETURN QUERY, RETURN TABLE shape, attribution_consumed semantics.
--    - Security boundary, grants, search_path, ownership.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hrp_public_intake_submission(p_payload jsonb)
RETURNS TABLE(
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

  v_attr_referrer_uid  text;
  v_attr_consumed     boolean := false;
  v_attr_row_count    integer := 0;
  v_lpha_assignee     text;

  -- AFF-05A-R1: capture server timestamp once for all timing decisions.
  v_txn_ts            timestamptz;

  -- AFF-05A-R1: post-lock re-read state.
  v_existing_attr     text;
  v_existing_lpha     text;
  v_has_active_lpha   boolean := false;
BEGIN
  -- 1. Capture transaction timestamp (DEC-01: one server snapshot).
  v_txn_ts := transaction_timestamp();

  -- 2. Read inputs from the JSONB payload.
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

  -- Required-field guard.
  IF v_full_name IS NULL OR v_phone IS NULL OR v_phone = '' OR v_referrer_attr_id = 'invalid' THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Score against existing labor_profiles.
  SELECT s.verdict, s.candidate, s.has_conflict
    INTO v_verdict, v_candidate, v_has_conflict
    FROM hrp_score_labor_profile(v_full_name, v_phone, v_cccd) AS s
   LIMIT 1;

  v_norm_phone     := hrp_normalize_phone(v_phone);
  v_norm_full_name := hrp_normalize_full_name(v_full_name);

  -- 4. POSSIBLE_MATCH short-circuit: no INSERT, no UPDATE, no LPHA.
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

  -- 5. Resolve / create LaborProfile (same logic as AFF-03C).
  IF v_verdict = 'EXACT_MATCH' THEN
    v_lp_id := (v_candidate->>'laborProfileId');
  ELSE
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

  -- ─────────────────────────────────────────────────────────────────────────
  -- 6. DEC-04: Advisory transaction lock immediately after canonical LP
  --    resolution. Serializes all canonical public-intake calls that resolve
  --    the same `v_lp_id`. Only true-positive participants in this protocol
  --    take this lock; other writers are outside the guarantee.
  --
  --    DEC-04 chose `pg_advisory_xact_lock` (blocking mode, no NOWAIT).
  --    It waits for the lock holder to release. The function does NOT fail
  --    fast; under contention on the same LP, callers wait until the holding
  --    transaction commits or rolls back (or the holding session terminates).
  --    This is the documented PostgreSQL default behavior. The lock cannot be
  --    starved by hash collision (only other canonical public-intake calls
  --    on the same LP collide), but extreme contention or a crashed holder
  --    can leave the lock held until session cleanup.
  --
  --    Hash collision: only causes false-positive serialization between
  --    unrelated LPs; cannot permit concurrent mutation of the same LP.
  -- ─────────────────────────────────────────────────────────────────────────
  PERFORM pg_advisory_xact_lock(hashtextextended('AFF05A_R1:' || v_lp_id, 0));

  -- ─────────────────────────────────────────────────────────────────────────
  -- 7. DEC-05: Re-read canonical attribution + active handling under lock.
  --    This is the authoritative state for the decision in step (8).
  --
  --    DEC-03 (preservation) invariants:
  --      - "already-bound" attribution = any row whose labor_profile_id
  --        equals v_lp_id regardless of status (CONSUMED is the post-consume
  --        state; ACTIVE-then-bound becomes CONSUMED). They all count as
  --        "this LP already has canonical attribution bound".
  --      - "active handler" = any LPHA on this LP with status='ACTIVE'
  --        and a future (or indefinite) deadline. Source is not constrained
  --        to AFF_INITIAL — manager-assigned rows also count (RQ-04: the
  --        public-intake must not stomp on a manager's active handling).
  -- ─────────────────────────────────────────────────────────────────────────

  -- Canonical attribution: any attribution already bound to this LP.
  -- Includes CONSUMED (post-consume binding) and ACTIVE (still active).
  -- The LP-bound uniqueness is the structural backstop (UNIQUE(labor_profile_id)).
  SELECT id INTO v_existing_attr
    FROM referral_attributions
   WHERE labor_profile_id = v_lp_id
   LIMIT 1;

  -- Active handling on this LP, any source (AFF_INITIAL OR MANAGER).
  -- accepts both `expires_at IS NULL` (indefinite manager assignment) and
  -- `expires_at > v_txn_ts` (active future-deadline).
  SELECT id INTO v_existing_lpha
    FROM labor_profile_handling_assignments
   WHERE labor_profile_id = v_lp_id
     AND status = 'ACTIVE'
     AND (expires_at IS NULL OR expires_at > v_txn_ts)
   LIMIT 1;

  v_has_active_lpha := (v_existing_lpha IS NOT NULL);

  -- 8. INSERT placement_case (same as AFF-03C).
  BEGIN
    INSERT INTO placement_case (
      id, labor_profile_id, status, opened_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, v_lp_id, 'OPEN', now(), now(), now()
    )
    RETURNING id INTO v_pc_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_pc_id
      FROM placement_case
     WHERE labor_profile_id = v_lp_id
       AND status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')
     ORDER BY opened_at DESC
     LIMIT 1;
  END;

  -- 9. INSERT candidate_submissions (same as AFF-03C, includes labor_profile_id).
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
    v_lp_id,
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

  -- ─────────────────────────────────────────────────────────────────────────
  -- 10. DEC-05 decision logic under lock.
  --
  --     The advisory lock protects concurrent canonical public-intake calls
  --     that resolve the same `v_lp_id`. Two semantics must hold:
  --       (a) At most ONE `AFF_INITIAL ACTIVE` LPHA per LP (partial unique
  --           index `labor_profile_handling_active_idx` is final backstop).
  --       (b) At most ONE attribution consumed per LP (the LP-bound uniqueness
  --           is final backstop via `referral_attributions_labor_profile_id_key`).
  --
  --     Case A — Repeat intake: LP already has bound attribution OR active LPHA.
  --       The incoming attribution (v_referrer_attr_id, if any) stays
  --       unchanged (DEC-03). No LPHA created. attribution_consumed = false.
  --
  --     Case B — Fresh intake with valid inbound attribution:
  --       v_referrer_attr_id is ACTIVE + not expired + unbound. Consume it
  --       (UPDATE referral_attributions), bind to v_lp_id, and create LPHA
  --       with 168h deadline (DEC-01).
  --
  --     Case C — Fresh intake without attribution:
  --       No LPHA created. attribution_consumed = false. Matches AFF-03B/C
  --       behavior where LPHA is only persisted on attribution consumption.
  -- ─────────────────────────────────────────────────────────────────────────

  IF v_existing_attr IS NOT NULL OR v_has_active_lpha THEN
    -- Case A: LP already has bound attribution or active LPHA → preserve.
    -- Incoming attribution (v_referrer_attr_id) is NOT consumed.
    v_attr_consumed := false;

  ELSIF v_referrer_attr_id IS NOT NULL THEN
    -- Case B: LP is fresh (no bound attr, no LPHA) and inbound attribution
    -- was provided. Consume + bind + create LPHA.
    -- DEC-11 (a)/(b)/(c) probe + UPDATE.
    SELECT referrer_user_id INTO v_attr_referrer_uid
      FROM referral_attributions
     WHERE id = v_referrer_attr_id
       AND status = 'ACTIVE'
       AND expires_at > v_txn_ts
       AND labor_profile_id IS NULL
     LIMIT 1;

    IF v_attr_referrer_uid IS NOT NULL THEN
      UPDATE referral_attributions
         SET status = 'CONSUMED',
             consumed_at = v_txn_ts,
             labor_profile_id = v_lp_id
       WHERE id = v_referrer_attr_id
         AND status = 'ACTIVE'
         AND expires_at > v_txn_ts
         AND labor_profile_id IS NULL;

      GET DIAGNOSTICS v_attr_row_count = ROW_COUNT;
      v_attr_consumed := (v_attr_row_count = 1);

      IF v_attr_consumed THEN
        v_lpha_assignee := v_attr_referrer_uid;
        INSERT INTO labor_profile_handling_assignments (
          id, labor_profile_id, assignee_user_id, assigned_by_user_id,
          source, starts_at, expires_at, status, created_at, updated_at, version
        ) VALUES (
          gen_random_uuid(),
          v_lp_id,
          v_lpha_assignee,
          NULL,
          'AFF_INITIAL',
          v_txn_ts,
          v_txn_ts + interval '168 hours',
          'ACTIVE',
          now(),
          now(),
          1
        );
      END IF;
    END IF;

  ELSE
    -- Case C: LP is fresh, no inbound attribution.
    -- No LPHA created. submission is committed without a handling assignment.
    v_attr_consumed := false;
  END IF;

  -- 11. RETURN QUERY (same as AFF-03C).
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
-- 3. EXECUTE grants — mirror AFF-03C §3 verbatim (signature unchanged).
-- ───────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION hrp_public_intake_submission(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_public_intake_submission(jsonb) TO app_user_writer, app_user;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Restore the migration administrator and close temporary privileges.
--    CREATE OR REPLACE ran as hrp_public_rpc; ownership never changes.
-- ───────────────────────────────────────────────────────────────────────────

RESET ROLE;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET FALSE', session_user);
END
$$;
REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('REVOKE hrp_public_rpc FROM %I', session_user);
END
$$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_auth_members am
     WHERE am.roleid = 'hrp_public_rpc'::regrole
       AND am.member = session_user::regrole
       AND (am.set_option OR am.inherit_option)
  ) THEN
    RAISE EXCEPTION 'AFF-05A-R1 privilege cleanup failed: % retains SET or INHERIT on hrp_public_rpc',
      session_user
      USING ERRCODE = '42501';
  END IF;
END
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. DEC-08: Add exactly `SELECT` on labor_profile_handling_assignments
--    to hrp_public_rpc. The existing `INSERT` on this table is preserved.
--    No UPDATE / DELETE / ALL / PUBLIC grant / RLS / role-attribute change.
--    After this grant, hrp_public_rpc effective privileges are:
--      labor_profiles:              SELECT, INSERT
--      candidate_submissions:        INSERT
--      placement_case:              SELECT, INSERT
--      referral_attributions:       SELECT, UPDATE
--      labor_profile_handling_assignments: SELECT, INSERT  ← delta
-- ───────────────────────────────────────────────────────────────────────────

GRANT SELECT ON labor_profile_handling_assignments TO hrp_public_rpc;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Atomic backfill — run after RESET ROLE as migration admin/superuser.
--    Step numbering mirrors §4.5 / DEC-06 / DEC-07 / RQ-06 / RQ-07.
--
--    Lock strategy (TASK §4.5): acquire a real table lock on
--    labor_profile_handling_assignments that blocks concurrent handling
--    INSERT/UPDATE during the short revalidation window. We use
--    LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE which:
--      - conflicts with INSERT, UPDATE, DELETE, SHARE ROW EXCLUSIVE,
--        EXCLUSIVE, ACCESS EXCLUSIVE (i.e. blocks all writers),
--      - is held until transaction end (matches DEC: backfill must run
--        as one atomic unit),
--      - does NOT require any additional table privilege beyond
--        migration admin (BYERRPASSRLS / superuser) — no UPDATE handling
--        grant needed.
--
--    Anomaly threshold note (RQ-07): TASK says "future start ngoài clock-skew
--    được T0 chấp nhận" but does NOT pin a numeric threshold. We compute
--    "future start" relative to the captured `v_txn_ts` snapshot and block
--    only on positive `starts_at > v_txn_ts` (i.e. any clock-skew beyond
--    the migration transaction timestamp itself). A small explicit tolerance
--    is intentionally NOT applied here — T0 owns the threshold via the
--    production branch gate (RQ-05). If T0 later pins a tolerance, this
--    block is the single point of change.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_txn_ts             timestamptz;
  v_affected           integer := 0;
  v_outside_unchanged  bigint := 0;
  v_future_start       bigint := 0;
  v_null_start         bigint := 0;
  v_overdue_active     bigint := 0;
  v_unknown_status     bigint := 0;
BEGIN
  -- 6.1 Acquire real table lock on labor_profile_handling_assignments.
  --     SHARE ROW EXCLUSIVE conflicts with INSERT/UPDATE/DELETE/EXCLUSIVE,
  --     so any concurrent handling writer waits. The lock is released
  --     automatically at COMMIT or ROLLBACK of this transaction.
  --     NOTE: must come BEFORE any SELECT against the table to ensure
  --     the revalidation snapshot is consistent with the post-lock state.
  LOCK TABLE labor_profile_handling_assignments IN SHARE ROW EXCLUSIVE MODE;

  -- 6.2 Capture migration snapshot timestamp (DEC-06: compute from starts_at,
  --     NOT from deploy/migration time).
  v_txn_ts := transaction_timestamp();

  -- 6.3 Re-validate anomaly predicates (RQ-07 / AC-06).
  --     If any anomaly is detected, roll back the entire migration.

  -- Future starts (RQ-07: outside clock-skew requires T0 sign-off; we block
  -- on positive `starts_at > v_txn_ts` and let T0 pin a tolerance if needed).
  SELECT count(*) INTO v_future_start
    FROM labor_profile_handling_assignments h
    JOIN labor_profiles lp ON lp.id = h.labor_profile_id
   WHERE h.source = 'AFF_INITIAL'
     AND h.expires_at IS NULL
     AND h.starts_at IS NOT NULL
     AND h.starts_at > v_txn_ts;

  IF v_future_start > 0 THEN
    RAISE EXCEPTION 'AFF-05A-R1 anomaly: % rows have future starts_at (> migration snapshot). Stopping before backfill. T0 review required.',
      v_future_start;
  END IF;

  -- NULL starts on AFF_INITIAL with NULL deadline (RQ-07: predicate anomaly).
  SELECT count(*) INTO v_null_start
    FROM labor_profile_handling_assignments
   WHERE source = 'AFF_INITIAL'
     AND expires_at IS NULL
     AND starts_at IS NULL;

  IF v_null_start > 0 THEN
    RAISE EXCEPTION 'AFF-05A-R1 anomaly: % rows have source=AFF_INITIAL with both starts_at IS NULL and expires_at IS NULL. Stopping. T0 review required.',
      v_null_start;
  END IF;

  -- History inconsistency (RQ-07): any AFF_INITIAL row with NULL deadline
  -- whose status is outside the documented set is treated as anomaly. The
  -- documented set is 'ACTIVE','EXPIRED','REVOKED','TRANSFERRED','COMPLETED'.
  SELECT count(*) INTO v_unknown_status
    FROM labor_profile_handling_assignments
   WHERE source = 'AFF_INITIAL'
     AND expires_at IS NULL
     AND starts_at IS NOT NULL
     AND status NOT IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'TRANSFERRED', 'COMPLETED');

  IF v_unknown_status > 0 THEN
    RAISE EXCEPTION 'AFF-05A-R1 anomaly: % AFF_INITIAL rows have NULL deadline and an unrecognized status. Stopping. T0 review required.',
      v_unknown_status;
  END IF;

  -- Overdue ACTIVE (DEC-07: overdue ACTIVE expires in place at migration snapshot).
  SELECT count(*) INTO v_overdue_active
    FROM labor_profile_handling_assignments
   WHERE source = 'AFF_INITIAL'
     AND expires_at IS NULL
     AND status = 'ACTIVE'
     AND starts_at IS NOT NULL
     AND starts_at <= v_txn_ts - interval '168 hours';

  -- 6.4 Count rows outside the backfill predicate (RQ-06 / AC-06 control).
  --     These must be byte-for-byte/logically unchanged: manager-assigned
  --     indefinite rows (source != 'AFF_INITIAL') and rows with starts_at NOT NULL.
  SELECT count(*) INTO v_outside_unchanged
    FROM labor_profile_handling_assignments
   WHERE (source != 'AFF_INITIAL' OR starts_at IS NOT NULL)
     AND expires_at IS NULL;

  -- 6.5 Apply DEC-06 + DEC-07: set expires_at from starts_at for ALL rows matching
  --     the predicate (DEC-06), and expire overdue ACTIVE rows in place (DEC-07).
  --     DEC-07 invariant: terminal status (EXPIRED/REVOKED/TRANSFERRED/COMPLETED)
  --     is preserved — only ACTIVE rows whose computed deadline has passed
  --     transition to EXPIRED. No delete/reinsert; assignee/source/previous
  --     link/reason/starts_at/identity all preserved.
  UPDATE labor_profile_handling_assignments
     SET status    = CASE
                      WHEN status = 'ACTIVE'
                           AND starts_at <= v_txn_ts - interval '168 hours'
                      THEN 'EXPIRED'
                      ELSE status
                    END,
         expires_at = starts_at + interval '168 hours',
         updated_at = v_txn_ts
   WHERE source = 'AFF_INITIAL'
     AND expires_at IS NULL
     AND starts_at IS NOT NULL;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RAISE NOTICE 'AFF-05A-R1 backfill complete: % AFF_INITIAL rows received deadline from starts_at; % overdue ACTIVE rows expired in place; % indefinite rows outside predicate unchanged; % future-start anomalies blocked.',
    v_affected, v_overdue_active, v_outside_unchanged, v_future_start;

  -- 6.6 Final assertion: after backfill, no AFF_INITIAL row matching the
  --     DEC-06 safe predicate (source=AFF_INITIAL, expires_at IS NULL,
  --     starts_at IS NOT NULL) may remain. We re-count here (not use the
  --     pre-UPDATE v_remaining_indefinite) to verify the actual post-state.
  --     RLS note: this assertion runs under migration admin (after RESET ROLE),
  --     which bypasses RLS, so all rows are visible.
  IF EXISTS (
    SELECT 1
      FROM labor_profile_handling_assignments
     WHERE source = 'AFF_INITIAL'
       AND expires_at IS NULL
       AND starts_at IS NOT NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'AFF-05A-R1 assertion failed: AFF_INITIAL rows still have expires_at IS NULL after backfill. Migration rolled back.';
  END IF;

END
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. COMMIT (TASK §4.5).
--    All steps above ran inside the outer BEGIN at the top of this file.
--    Any RAISE EXCEPTION in any step rolled back function replacement,
--    SELECT grant, and row updates together. Committing now that every
--    assertion has passed.
-- ───────────────────────────────────────────────────────────────────────────

COMMIT;
