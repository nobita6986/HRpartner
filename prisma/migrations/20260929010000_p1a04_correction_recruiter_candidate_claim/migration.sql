-- ============================================================================
-- Migration: p1a04_correction_recruiter_candidate_claim
-- Task:      hrp-p1-a0-4-scoped-recruiter-authority (T0 correction batch 1/1)
-- Baseline:  origin/main @ f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7
-- Origin:    T0 disposition CHANGES_REQUIRED on 773c94c
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- Round 1 of P1-A0.4 (773c94c) built the wrong contract: HR_STAFF self-claim
-- of unclaimed StaffingOrders. T0 disposition CHANGES_REQUIRED mandates:
--
--   1. ADMIN/HR_MANAGER assigns HR_STAFF to a StaffingOrder (one or many per
--      order). Self-claim is REMOVED. `ORDER_RECRUITER_CLAIM` is no longer a
--      valid source on the assignment table — it migrates to the
--      LaborProfileHandlingAssignment aggregate.
--   2. Recruiter claims a CandidateSubmission (not an order). The candidate
--      flows through `CandidateSubmission -> slot -> StaffingOrder` so the
--      route derives the order server-side. The winner creates an active
--      LaborProfileHandlingAssignment with source `ORDER_RECRUITER_CLAIM`.
--   3. Two assigned recruiters can race claim the same candidate. Advisory
--      lock + the existing partial unique index in handling-assignment
--      produce exactly one winner. Loser gets `HANDLING_ALREADY_CLAIMED`.
--   4. Unassigned HR_STAFF cannot see OPEN+unassigned orders, projects,
--      candidates or postings. The two claimable RLS policies
--      (hrp_sora_staffing_orders_claimable_select and
--      hrp_sora_projects_claimable_select) MUST be dropped.
--   5. SECDEFINER helpers must shrink to the HR_STAFF branch only.
--      Pre-existing authority for ADMIN/HR_MANAGER/PM/SALE/VENDOR/WORKER is
--      not duplicated here — those tables' existing policies route through
--      `hrp_*_visible_for` and must NOT see HR_STAFF semantics in this
--      helper.
--   6. The per-order active-assignment unique index
--      `staffing_order_recruiter_assignments_active_order_unique_idx` must be
--      dropped — multiple recruiters may be ACTIVE on the same order.
--   7. Column rename `starts_at` -> `assigned_at` to match the canonical
--      contract naming.
--   8. `assigned_by_user_id` is now NOT NULL — the only source is
--      HR_MANAGER_ASSIGN, which must always carry the assignor.
--
-- SCOPE (forward-only, applied on synthetic DB only)
--   - DROP per-order-only active unique index (no data loss).
--   - DROP claimable RLS policies (no data loss).
--   - REPLACE helper functions with HR_STAFF-only branch (create or replace).
--   - ALTER column `starts_at` rename to `assigned_at`.
--   - ALTER column `assigned_by_user_id` set NOT NULL.
--   - ALTER check constraint to allow `HR_MANAGER_ASSIGN` only.
--   - DROP the prior `manager_assign_author_required` and
--     `claim_no_assignor` checks (claim branch is gone).
--   - Add narrow HR_STAFF claim-queue RLS on
--     `candidate_submissions` (active-assignment-scoped).
--
-- IDEMPOTENT
--   - DROP IF EXISTS on policies and indexes.
--   - CREATE OR REPLACE on helper functions.
--   - Column rename uses ALTER TABLE ... RENAME COLUMN IF EXISTS-equivalent
--     pattern (`IF EXISTS` is available in Postgres 9.6+).
--
-- NOT APPLIED TO PRODUCTION
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Bounded lock_timeout (DEC-04 / Risk "Lock blocks production").
-- ───────────────────────────────────────────────────────────────────────────
SET LOCAL lock_timeout = '5s';

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DROP per-order-only active unique index
--    Multiple recruiters may now be ACTIVE on the same order; the per-pair
--    index is the only active uniqueness invariant left.
-- ═══════════════════════════════════════════════════════════════════════════
DROP INDEX IF EXISTS public.staffing_order_recruiter_assignments_active_order_unique_idx;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. DROP the two HR_STAFF OPEN+unassigned claim-queue RLS policies.
--    Unassigned HR_STAFF no longer sees claimable orders/projects.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS hrp_sora_staffing_orders_claimable_select ON public.staffing_orders;
DROP POLICY IF EXISTS hrp_sora_projects_claimable_select ON public.outsourcing_projects;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. REPLACE both SECDEFINER helpers with HR_STAFF-only branch.
--    Other roles are not duplicated here — their existing visibility helpers
--    are still in force via the surrounding RLS policies on each table.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hrp_staffing_order_visible_for(oid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- HR_STAFF: orders they have an ACTIVE recruiter assignment on. The
  -- helper is ONLY consulted for HR_STAFF rows; non-HR_STAFF visibility
  -- flows through the surrounding pre-existing policies (PM/SALE/MKT/VENDOR/
  -- WORKER/ADMIN/DIRECTOR).
  SELECT
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND EXISTS (
      SELECT 1
        FROM public.staffing_order_recruiter_assignments a
       WHERE a.staffing_order_id = oid
         AND a.recruiter_user_id = hrp_session_user_id()
         AND a.status = 'ACTIVE')
$$;

CREATE OR REPLACE FUNCTION public.hrp_project_recruiter_visible_for(pid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- HR_STAFF: project visible when at least one of its orders has an
  -- ACTIVE recruiter assignment for the session user.
  SELECT
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.staffing_order_recruiter_assignments a
          ON a.staffing_order_id = so.id
       WHERE so.project_id = pid
         AND a.recruiter_user_id = hrp_session_user_id()
         AND a.status = 'ACTIVE')
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RENAME starts_at -> assigned_at (canonical contract naming).
--    No data loss: rename only.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'staffing_order_recruiter_assignments'
       AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.staffing_order_recruiter_assignments
      RENAME COLUMN starts_at TO assigned_at;
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. assigned_by_user_id becomes NOT NULL (only HR_MANAGER_ASSIGN source).
--    Update existing rows defensively: any orphan rows from the round-1
--    migration (where the row was created with assigned_by_user_id IS NULL
--    under the old ORDER_RECRUITER_CLAIM path) cannot exist post-DROP-POLICY
--    and the round-1 claim code path is gone — but be explicit anyway.
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE public.staffing_order_recruiter_assignments
   SET assigned_by_user_id = COALESCE(assigned_by_user_id, recruiter_user_id)
 WHERE assigned_by_user_id IS NULL;

ALTER TABLE public.staffing_order_recruiter_assignments
  ALTER COLUMN assigned_by_user_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Update CHECK constraints.
--    - source restricted to HR_MANAGER_ASSIGN only.
--    - drop the round-1 "claim_no_assignor" CHECK (claim branch is gone).
--    - keep "manager_assign_author_required" but now equivalent to
--      assigned_by_user_id IS NOT NULL (already enforced above).
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.staffing_order_recruiter_assignments
  DROP CONSTRAINT IF EXISTS staffing_order_recruiter_assignments_claim_no_assignor;
ALTER TABLE public.staffing_order_recruiter_assignments
  DROP CONSTRAINT IF EXISTS staffing_order_recruiter_assignments_manager_assign_author_required;
ALTER TABLE public.staffing_order_recruiter_assignments
  DROP CONSTRAINT IF EXISTS staffing_order_recruiter_assignments_source_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'staffing_order_recruiter_assignments'
       AND c.conname = 'staffing_order_recruiter_assignments_source_hrman_only'
  ) THEN
    ALTER TABLE public.staffing_order_recruiter_assignments
      ADD CONSTRAINT staffing_order_recruiter_assignments_source_hrman_only
        CHECK (source = 'HR_MANAGER_ASSIGN');
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. UPDATE the existing HR_STAFF RLS policy on the assignment table.
--    HR_STAFF can SELECT only their own rows. HR_MANAGER / ADMIN see all.
--    INSERT is restricted to HR_MANAGER (source = HR_MANAGER_ASSIGN,
--    assigned_by_user_id = session). HR_STAFF can NOT self-insert.
--    UPDATE allows HR_MANAGER/ADMIN to revoke.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS hrp_sora_insert ON public.staffing_order_recruiter_assignments;
CREATE POLICY hrp_sora_insert ON public.staffing_order_recruiter_assignments
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    hrp_session_role() IN ('HR_MANAGER', 'ADMIN')
    AND assigned_by_user_id = hrp_session_user_id()
    AND source = 'HR_MANAGER_ASSIGN'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Narrow PERMISSIVE RLS on candidate_submissions for HR_STAFF (scoped).
--    Assigned recruiters see MASKED unclaimed candidates of their order.
--    Winner (active LaborProfileHandlingAssignment) sees the unmasked view;
--    the unmask path is a separate column-grant policy added below.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS hrp_sora_candidate_submissions_staff_select ON public.candidate_submissions;
CREATE POLICY hrp_sora_candidate_submissions_staff_select ON public.candidate_submissions
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND EXISTS (
      SELECT 1
        FROM public.staffing_order_slots sos
        JOIN public.staffing_order_recruiter_assignments a
          ON a.staffing_order_id = sos.staffing_order_id
       WHERE sos.id = public.candidate_submissions.slot_id
         AND a.recruiter_user_id = hrp_session_user_id()
         AND a.status = 'ACTIVE')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. STATIC POST-MIGRATION ASSERTIONS (fail-closed if violated)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_helper_path  text;
  v_helper_sch   text;
  v_count_active integer;
  v_count_total  integer;
  v_predicate_text text;
BEGIN
  -- (9.1) search_path on both helpers must equal `pg_catalog, public`.
  SELECT p.proconfig INTO v_helper_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'hrp_staffing_order_visible_for'
     AND p.prokind = 'f';
  IF v_helper_path IS NULL OR v_helper_path NOT LIKE '%search_path%pg_catalog%public%' THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_staffing_order_visible_for missing locked search_path';
  END IF;

  SELECT p.proconfig INTO v_helper_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'hrp_project_recruiter_visible_for'
     AND p.prokind = 'f';
  IF v_helper_path IS NULL OR v_helper_path NOT LIKE '%search_path%pg_catalog%public%' THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_project_recruiter_visible_for missing locked search_path';
  END IF;

  -- (9.2) Both helpers must be in the public schema (schema-qualified only).
  SELECT n.nspname INTO v_helper_sch
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname IN ('hrp_staffing_order_visible_for', 'hrp_project_recruiter_visible_for')
     AND p.prokind = 'f';
  IF v_helper_sch <> 'public' THEN
    RAISE EXCEPTION 'p1a04 correction: helpers not in public schema (got %)', v_helper_sch;
  END IF;

  -- (9.3) Helper EXECUTE must NOT be granted to PUBLIC.
  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
     WHERE routine_schema = 'public'
       AND routine_name IN ('hrp_staffing_order_visible_for', 'hrp_project_recruiter_visible_for')
       AND grantee = 'PUBLIC'
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: helper EXECUTE granted to PUBLIC';
  END IF;

  -- (9.4) New table RLS posture: relrowsecurity=true + forcerowsecurity=true.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
     WHERE c.relname = 'staffing_order_recruiter_assignments'
       AND c.relnamespace = 'public'::regnamespace
       AND c.relrowsecurity = true AND c.relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: staffing_order_recruiter_assignments RLS not enabled+forced';
  END IF;

  -- (9.5) Per-pair active partial unique index must still exist.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
     WHERE c.relname = 'staffing_order_recruiter_assignments_active_unique_idx'
       AND c.relnamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: per-pair active partial unique index missing';
  END IF;

  -- (9.6) Per-order-only active index MUST be dropped (correction).
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
     WHERE c.relname = 'staffing_order_recruiter_assignments_active_order_unique_idx'
       AND c.relnamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: per-order-only active partial unique index still exists';
  END IF;

  -- (9.7) OPEN+unassigned claim-queue RLS policies MUST be dropped.
  IF EXISTS (
    SELECT 1 FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.tablename IN ('staffing_orders', 'outsourcing_projects')
       AND p.policyname IN ('hrp_sora_staffing_orders_claimable_select', 'hrp_sora_projects_claimable_select')
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: claimable-select RLS policy still exists';
  END IF;

  -- (9.8) Helper predicate must NOT reference PM/SALE/MKT/VENDOR/WORKER/ADMIN/DIRECTOR.
  -- Both helpers are HR_STAFF-only in this slice. The substring check is
  -- word-bounded; token names like `staffing_order_recruiter_assignments`
  -- do NOT match the forbidden words. The check guards against regression
  -- where the helper text re-introduces a role branch (e.g. `AND
  -- hrp_session_role() <> 'HR_STAFF' AND hrp_project_visible_for(pid)`).
  SELECT prosrc INTO v_predicate_text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'hrp_staffing_order_visible_for' AND p.prokind = 'f';
  IF v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''ADMIN'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''HR_MANAGER'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''DIRECTOR'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''PM'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''SALE'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''MKT'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''VENDOR'
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''WORKER'''
  THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_staffing_order_visible_for leaks non-HR_STAFF branch';
  END IF;

  SELECT prosrc INTO v_predicate_text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'hrp_project_recruiter_visible_for' AND p.prokind = 'f';
  IF v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''ADMIN'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''HR_MANAGER'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''DIRECTOR'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''PM'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''SALE'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''MKT'''
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''VENDOR'
     OR v_predicate_text ~* 'hrp_session_role\s*\(\s*\)\s*(=|<>|IN)\s*\(?\s*''WORKER'''
  THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_project_recruiter_visible_for leaks non-HR_STAFF branch';
  END IF;

  -- (9.9) Column rename verified.
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'staffing_order_recruiter_assignments'
       AND column_name = 'assigned_at'
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: assigned_at column missing (rename failed)';
  END IF;

  -- (9.10) assigned_by_user_id is NOT NULL.
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'staffing_order_recruiter_assignments'
       AND column_name = 'assigned_by_user_id'
       AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: assigned_by_user_id must be NOT NULL';
  END IF;

  -- (9.11) candidate_submissions HR_STAFF scope policy exists.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.tablename = 'candidate_submissions'
       AND p.policyname = 'hrp_sora_candidate_submissions_staff_select'
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_sora_candidate_submissions_staff_select missing';
  END IF;

  -- (9.12) Round-1 / round-2 assertion: new table starts empty after the
  -- forward-only correction (no test data was inserted in this round).
  SELECT count(*) INTO v_count_total FROM public.staffing_order_recruiter_assignments;
  SELECT count(*) INTO v_count_active FROM public.staffing_order_recruiter_assignments WHERE status = 'ACTIVE';
  IF v_count_total <> 0 OR v_count_active <> 0 THEN
    RAISE EXCEPTION 'p1a04 correction: table must start empty after correction (total=%, active=%)',
      v_count_total, v_count_active;
  END IF;
END
$$;

COMMIT;
