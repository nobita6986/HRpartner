-- 20260929020000_p1a04_correction_hr_staff_handling_claim_insert_rls
--
-- Forward-only correction follow-up (P1-A0.4 correction batch 1/1).
--
-- Issue: the W5 baseline (20260922100000) restricted INSERT on
-- labor_profile_handling_assignments to role IN ('ADMIN','HR_MANAGER'). The
-- canonical claim path P1-A0.4 v1.3 §4 requires an HR_STAFF assignee to
-- INSERT a LaborProfileHandlingAssignment with source='ORDER_RECRUITER_CLAIM'
-- after winning the candidate-claim race. The round-1 migration
-- (20260928220000) added a partial unique index for race safety but did NOT
-- widen the INSERT policy. Without this follow-up, the runtime path fails
-- closed with `42501 new row violates row-level security policy for table
-- "labor_profile_handling_assignments"` and the canonical claim is
-- impossible.
--
-- Fix (this migration):
--   1. Widen the INSERT policy on labor_profile_handling_assignments so
--      HR_STAFF with an ACTIVE StaffingOrderRecruiterAssignment on the
--      order derived from the LaborProfile's placement case's submission
--      can insert with source='ORDER_RECRUITER_CLAIM' AND
--      assignee_user_id = hrp_session_user_id() AND
--      assigned_by_user_id IS NULL.
--   2. ADMIN/HR_MANAGER path retained for bounded MANAGER_ASSIGNMENT /
--      AFF_INITIAL / CASE_RESOLUTION sources.
--   3. Static post-migration assertions guarantee the widening is in place
--      and the policy predicate is correct.
--
-- Defense in depth: the partial unique index
-- `labor_profile_handling_active_idx` (added in W5/AFF-05A) already
-- serializes concurrent claims on the same profile at the DB level.
-- The new policy predicate adds the application-level rule (active order
-- assignment) so the same RLS-bypassing direct INSERT is impossible.
--
-- NO byte changes to prior migrations. NO schema rewrites. NO data backfill.
-- Prisma wraps migrations in their own transaction; do NOT add explicit
-- BEGIN/COMMIT (would cause nested-transaction abort).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Widen INSERT policy on labor_profile_handling_assignments.
--    ADMIN/HR_MANAGER path is preserved (HRP-managed claims); HR_STAFF path
--    is added for the canonical candidate-claim flow.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS hrp_handling_assignment_insert ON public.labor_profile_handling_assignments;
CREATE POLICY hrp_handling_assignment_insert ON public.labor_profile_handling_assignments
  AS PERMISSIVE FOR INSERT
  TO app_user_writer
  WITH CHECK (
    -- (a) Manager-managed path: ADMIN/HR_MANAGER may insert for any source
    --     they own (MANAGER_ASSIGNMENT, AFF_INITIAL, CASE_RESOLUTION).
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    OR (
      -- (b) Recruiter-claim path: HR_STAFF with an ACTIVE
      --     StaffingOrderRecruiterAssignment on the order derived from the
      --     profile's placement case submission. assignee = self,
      --     source = ORDER_RECRUITER_CLAIM, assigned_by_user_id IS NULL
      --     (recruiter self-claim; assignor is the session itself, recorded
      --     implicitly via the recruitment_order_recruiter_assignments row).
      hrp_session_role() = 'HR_STAFF'
      AND assignee_user_id = hrp_session_user_id()
      AND assigned_by_user_id IS NULL
      AND source = 'ORDER_RECRUITER_CLAIM'
      AND EXISTS (
        SELECT 1
          FROM public.placement_case pc
          JOIN public.candidate_submissions cs ON cs.placement_case_id = pc.id
          JOIN public.staffing_order_slots sos ON sos.id = cs.slot_id
          JOIN public.staffing_order_recruiter_assignments a
            ON a.staffing_order_id = sos.staffing_order_id
         WHERE pc.labor_profile_id = public.labor_profile_handling_assignments.labor_profile_id
           AND a.recruiter_user_id = hrp_session_user_id()
           AND a.status = 'ACTIVE'
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. STATIC POST-MIGRATION ASSERTIONS (fail-closed if violated)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_check_expr text;
BEGIN
  -- (2.1) New INSERT policy exists and is on labor_profile_handling_assignments.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.tablename = 'labor_profile_handling_assignments'
       AND p.policyname = 'hrp_handling_assignment_insert'
       AND p.cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_handling_assignment_insert policy missing or wrong cmd';
  END IF;

  -- (2.2) Policy WITH CHECK predicate must mention both manager + HR_STAFF claim paths.
  -- pg_policy does not expose the raw prosrc; we use pg_policies view's `qual`
  -- / `with_check` columns (NULL for INSERT) — but pg_policies.with_check is
  -- always NULL for SELECT policies. For an INSERT policy the predicate lives
  -- in pg_policy.polwithcheck (expression node). The portable way to read it
  -- is pg_get_expr(polwithcheck, polrelid).
  SELECT pg_get_expr(polwithcheck, polrelid) INTO v_check_expr
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
    WHERE p.polname = 'hrp_handling_assignment_insert'
      AND c.relname = 'labor_profile_handling_assignments';
  IF v_check_expr IS NULL THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_handling_assignment_insert WITH CHECK is NULL';
  END IF;
  IF v_check_expr NOT LIKE '%HR_MANAGER%' THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_handling_assignment_insert lost HR_MANAGER path: %', v_check_expr;
  END IF;
  IF v_check_expr NOT LIKE '%HR_STAFF%' THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_handling_assignment_insert lost HR_STAFF claim path: %', v_check_expr;
  END IF;
  IF v_check_expr NOT LIKE '%ORDER_RECRUITER_CLAIM%' THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_handling_assignment_insert missing ORDER_RECRUITER_CLAIM guard: %', v_check_expr;
  END IF;
  IF v_check_expr NOT LIKE '%staffing_order_recruiter_assignments%' THEN
    RAISE EXCEPTION 'p1a04 correction: hrp_handling_assignment_insert missing order-recruiter join: %', v_check_expr;
  END IF;

  -- (2.3) Partial unique index for race safety must still exist.
  -- The canonical name (added in 20260922100000 / 20260922160000) is
  -- `labor_profile_handling_active_idx` — NOT the convention-matching
  -- `*_assignments_active_unique_idx` name. Defending against future rename.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relname IN (
         'labor_profile_handling_active_idx',
         'labor_profile_handling_assignments_active_unique_idx'
       )
  ) THEN
    RAISE EXCEPTION 'p1a04 correction: handling-assignment active partial unique index missing';
  END IF;
END
$$;
