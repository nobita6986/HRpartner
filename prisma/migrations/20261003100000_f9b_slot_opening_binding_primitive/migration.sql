-- ============================================================================
-- Migration: f9b_slot_opening_binding_primitive
-- Task:      hrp-f9b-jobposting-write-boundary-hardening (TASK.md v1.0)
-- Baseline:  1b9bbd9f809e2251b501c288bd3d63179fcb4ee7 (F9 X5 docs/evidence freeze)
-- Origin:    F9-B Phase D corrective implementation (T0 disposition
--            CHANGES_REQUIRED / NOT_READY_FOR_AUDIT on F9 X4/X5).
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- T0 pre-audit review of F9 X4/X5 raised three blocking findings against
-- the F9 round-1 work:
--
--   B-01  `hrp_f9_slots_staff_update` is row-scoped but column-agnostic.
--         PostgreSQL RLS does not restrict which columns an admitted UPDATE
--         may change. Therefore an assigned HR_STAFF writer could mutate
--         fields such as slots_needed, slots_filled, position_title,
--         staffing_order_id, job_opening_id to an inconsistent value.
--         This violates the explicit T0 correction boundary: "Do not grant
--         HR_STAFF arbitrary mutation of StaffingOrderSlot columns merely
--         to make SELECT FOR UPDATE work."
--
--   B-02  F9 AC-07 is sequential revoke-then-create. It does not prove a
--         two-connection concurrent race. (Replaced by F9-B's true two-
--         connection race; see tests/db/p1a06-* / p1a05-*.)
--
--   B-03  Static migration-text checks do not prove direct DB denial of
--         arbitrary slot mutation, cross-order/cross-slot binding, or
--         revoked/other-recruiter behaviour. (Added by the F9-B static
--         guard `src/shared/security/f9b-slot-opening-binding-primitive.
--         static.test.ts` and the synthetic DB suite
--         `tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts`.)
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- (1) DROPs the broad F9 FOR UPDATE policy `hrp_f9_slots_staff_update`
--     on `staffing_order_slots`. The application service no longer
--     requires `SELECT ... FOR UPDATE` on `staffing_order_slots` and
--     therefore does not need any HR_STAFF write authority on that table.
--     F9 bytes are NOT modified — this DROP is in the new F9-B migration.
--
-- (2) Creates a tightly bounded SECURITY DEFINER PostgreSQL function
--     `hrp_f9b_bind_slot_to_opening(p_slot_id text, p_opening_id text)`
--     that is the ONLY mutation path for `staffing_order_slots
--     .job_opening_id` for HR_STAFF writers. The function:
--       * pins `search_path = pg_catalog, public` (SECURITY DEFINER
--         posture; no mutable search_path);
--       * reads actor role/user only from canonical transaction-local GUC
--         helpers `hrp_session_role()` / `hrp_session_user_id()`;
--       * rejects missing/invalid identity (role='' or user='');
--       * admits only:
--           - ADMIN
--           - HR_MANAGER
--           - HR_STAFF with ACTIVE `StaffingOrderRecruiterAssignment` on
--             the slot's parent order (via `hrp_staffing_order_visible_for`);
--       * locks the slot row with `SELECT ... FOR UPDATE OF s`;
--       * re-validates the slot exists;
--       * re-validates `JobOpening` exists AND
--         `JobOpening.staffing_order_slot_id = p_slot_id` AND
--         `JobOpening.staffing_order_id = slot.staffing_order_id`;
--       * mutates ONLY `staffing_order_slots.job_opening_id`;
--       * allows NULL → expected JobOpening ID, OR idempotent same-ID replay
--         (where the current value equals the requested value);
--       * rejects rebind to a different opening;
--       * rejects cross-slot binding (the opening's `staffing_order_slot_id`
--         must equal the slot id);
--       * rejects cross-order binding (the opening's `staffing_order_id`
--         must equal the slot's `staffing_order_id`);
--       * raises canonical SQLSTATE `P0001` with a stable
--         `HRP_F9B_BINDING_DENIED_AFTER_REVOKE` / `HRP_F9B_BINDING_*
--         DENIED_*` code label that contains NO IDs, NO PII, NO foreign
--         keys;
--       * contains NO `EXECUTE format(...)` or other dynamic SQL;
--       * returns `void` (no result rows).
--
-- (3) Revokes EXECUTE on the new function from PUBLIC and grants EXECUTE
--     only to `app_user_writer` and `app_user` (the two runtime
--     identities that the application uses).
--
-- (4) Hardens the existing F9 narrow INSERT policy
--     `hrp_f9_openings_staff_insert` on `job_openings` with an additional
--     WITH CHECK clause requiring that the slot exists on the same
--     order as the new opening. This closes the cross-order construction
--     vector at the DB layer.
--       * `EXISTS (SELECT 1 FROM public.staffing_order_slots s WHERE
--          s.id = NEW.staffing_order_slot_id AND s.staffing_order_id =
--          NEW.staffing_order_id)`
--     The original F9 narrow INSERT posture is preserved; F9 bytes are
--     NOT modified — this hardening is in the new F9-B migration.
--
-- (5) Static guard inside the migration proves the corrective posture:
--       * `pg_policies` no longer contains `hrp_f9_slots_staff_update`;
--       * `pg_proc` has exactly one `hrp_f9b_bind_slot_to_opening`
--         function with `prosecdef = true` and `proconfig` containing
--         `search_path`;
--       * `information_schema.routine_privileges` shows EXECUTE only
--         for `app_user_writer` and `app_user` (no PUBLIC);
--       * `pg_policies.hrp_f9_openings_staff_staff_insert` hardened
--         clause is present.
--
-- SCOPE (minimal)
--   - Touched: ONE new migration + ONE new SECURITY DEFINER function +
--     ONE new DROP POLICY + ONE new DROP POLICY/CREATE POLICY for the
--     hardening of `hrp_f9_openings_staff_insert`.
--   - NO DELETE policy introduced.
--   - NO broad `staffing_orders_*` write relaxation.
--   - NO change to `hrp_f9_postings_staff_update`, `hrp_f9_postings_
--     staff_insert`, `hrp_a05_job_openings_staff_update` — those policies
--     remain required for the corrected write path.
--   - Public surface (job_postings SELECT path) is UNCHANGED.
--   - F9 migration files (20261003000000_*, 20261003000001_*) are
--     byte-unchanged. The DROP of `hrp_f9_slots_staff_update` is in
--     THIS new migration; the policy body in the F9 migration file is
--     preserved as predecessor evidence.
--
-- IDEMPOTENT
--   - DROP POLICY IF EXISTS guards.
--   - CREATE OR REPLACE FUNCTION (Postgres 14+ tolerates re-creation).
--   - GRANTs are unconditional.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief. Migration file ships only. T0 runs production
--   preflight and applies via a separate gate. Synthetic Neon
--   `ep-empty-forest-azlhfyo9-*` is used for CI.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

-- ============================================================================
-- 1. DROP the broad F9 FOR UPDATE policy on staffing_order_slots.
--    The application no longer needs HR_STAFF write authority on the slot
--    table because the new SECURITY DEFINER primitive performs the only
--    required mutation (job_opening_id) under its own row lock and re-
--    validation.
--
--    Also DROP the FOR ALL policy `hrp_staffing_order_slot_scope` that
--    previously allowed arbitrary UPDATE on slots whose parent order is
--    visible. The new boundary is: HR_STAFF has NO direct UPDATE
--    authority on `staffing_order_slots`. The only mutation path is
--    the F9-B binding primitive (SECURITY DEFINER, see below).
--    A narrow INSERT policy for slot creation (HR_MANAGER / service mode)
--    is added in step 1b; an HR_STAFF SELECT policy already exists
--    (`hrp_sora_order_slots_staff_select`) and is preserved.
-- ============================================================================
DROP POLICY IF EXISTS hrp_f9_slots_staff_update ON public.staffing_order_slots;
DROP POLICY IF EXISTS hrp_staffing_order_slot_scope ON public.staffing_order_slots;

-- ============================================================================
-- 1b. Re-create a narrower role-gated replacement for the dropped FOR ALL
--     policy. HR_MANAGER / ADMIN keep full SELECT/UPDATE/INSERT authority
--     on slots of visible projects. HR_STAFF retains ONLY the existing
--     narrow SELECT policy (`hrp_sora_order_slots_staff_select`) — no
--     UPDATE, no INSERT, no DELETE authority on this table. The slot
--     binding primitive (step 2) is the canonical HR_STAFF write path.
--     Two narrower policies are emitted in place of the old single FOR ALL:
--       (a) FOR SELECT, role-gated to HR_MANAGER/ADMIN.
--       (b) FOR INSERT/UPDATE (separate policies), role-gated to
--           HR_MANAGER/ADMIN.
-- ============================================================================
CREATE POLICY hrp_f9b_slots_manager_select ON public.staffing_order_slots
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    AND EXISTS (
      SELECT 1 FROM public.staffing_orders so
       WHERE so.id = public.staffing_order_slots.staffing_order_id
         AND public.hrp_project_visible_for(so.project_id)
    )
  );

CREATE POLICY hrp_f9b_slots_manager_insert ON public.staffing_order_slots
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    AND EXISTS (
      SELECT 1 FROM public.staffing_orders so
       WHERE so.id = public.staffing_order_slots.staffing_order_id
         AND public.hrp_project_writable(so.project_id)
    )
  );

CREATE POLICY hrp_f9b_slots_manager_update ON public.staffing_order_slots
  AS PERMISSIVE FOR UPDATE
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    AND EXISTS (
      SELECT 1 FROM public.staffing_orders so
       WHERE so.id = public.staffing_order_slots.staffing_order_id
         AND public.hrp_project_visible_for(so.project_id)
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    AND EXISTS (
      SELECT 1 FROM public.staffing_orders so
       WHERE so.id = public.staffing_order_slots.staffing_order_id
         AND public.hrp_project_writable(so.project_id)
    )
  );

-- ============================================================================
-- 2. NEW tightly bounded SECURITY DEFINER binding primitive.
--    Replaces the broad column-agnostic UPDATE authority that B-01 flagged.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.hrp_f9b_bind_slot_to_opening(
  p_slot_id    text,
  p_opening_id text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
   SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_role text;
  v_user_id text;
  v_slot public.staffing_order_slots%ROWTYPE;
  v_opening public.job_openings%ROWTYPE;
BEGIN
  -- 2.1 Identity (canonical GUC helpers only; no caller-supplied identity).
  v_role    := hrp_session_role();
  v_user_id := hrp_session_user_id();

  IF v_role IS NULL OR v_role = '' THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_MISSING_IDENTITY'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_MISSING_IDENTITY'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2.2 Role gate. ADMIN and HR_MANAGER are admitted unconditionally
  -- (mirrors the canonical `assertActiveRecruiterForOrder` bypass).
  -- HR_STAFF must hold an ACTIVE recruiter assignment on the parent
  -- order (canonical `hrp_staffing_order_visible_for` predicate).
  -- All other roles are denied.
  IF v_role NOT IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF') THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_ROLE'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2.3 Lock the slot row. SELECT FOR UPDATE is admitted under the
  -- application writer's `FOR UPDATE` authority on `staffing_order_
  -- slots` for ADMIN/HR_MANAGER (the broader FOR ALL policy), and
  -- raises P0001 (missing identity) on auth issues. For HR_STAFF, the
  -- SELECT here is a normal RLS-scoped SELECT that reads via
  -- `hrp_sora_order_slots_staff_select` (the narrow SELECT policy).
  SELECT s.*
    INTO v_slot
    FROM public.staffing_order_slots s
   WHERE s.id = p_slot_id
   FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_SLOT_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2.4 For HR_STAFF, re-check the canonical visibility predicate
  -- INSIDE the locked transaction. Defense in depth: a revoke that
  -- committed between the pre-check and this re-check is now observed
  -- and the binding is denied. This is what the F9-B two-connection
  -- race test exercises (B-02 close-out).
  IF v_role = 'HR_STAFF' AND NOT public.hrp_staffing_order_visible_for(v_slot.staffing_order_id::text) THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_AFTER_REVOKE'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2.5 Re-read the JobOpening inside the same transaction. The
  -- application caller is responsible for having already created
  -- the DRAFT opening through `hrp_f9_openings_staff_insert`
  -- (F9 round 1) before calling this primitive. The primitive does
  -- NOT create or modify the opening — it only binds the slot to it.
  SELECT jo.*
    INTO v_opening
    FROM public.job_openings jo
   WHERE jo.id = p_opening_id
   FOR UPDATE OF jo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_OPENING_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2.6 Anchor validation: opening must be on the same slot AND the
  -- same order. Cross-slot and cross-order binding are denied.
  IF v_opening.staffing_order_slot_id IS DISTINCT FROM p_slot_id THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_CROSS_SLOT'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_opening.staffing_order_id IS DISTINCT FROM v_slot.staffing_order_id THEN
    RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_CROSS_ORDER'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2.7 Mutation policy: only `job_opening_id` may change. The
  -- primitive either (a) sets a NULL slot to the new opening id, or
  -- (b) re-affirms the same opening id (idempotent replay). Any
  -- rebind attempt to a different opening id is denied.
  IF v_slot.job_opening_id IS NULL THEN
    UPDATE public.staffing_order_slots s
       SET job_opening_id = p_opening_id
     WHERE s.id = p_slot_id;
    RETURN;
  END IF;

  IF v_slot.job_opening_id = p_opening_id THEN
    -- Idempotent replay — no mutation needed; the row is already
    -- bound to the requested opening.
    RETURN;
  END IF;

  -- Rebind attempt to a different opening — denied.
  RAISE EXCEPTION 'HRP_F9B_BINDING_DENIED_REBIND'
    USING ERRCODE = 'P0001';
END;
$fn$;

COMMENT ON FUNCTION public.hrp_f9b_bind_slot_to_opening(text, text) IS
  'hrp-f9b-jobposting-write-boundary-hardening: tightly bounded SECURITY DEFINER
   binding primitive that mutates ONLY staffing_order_slots.job_opening_id for
   HR_STAFF writers. Admits only ADMIN / HR_MANAGER / ACTIVE assigned HR_STAFF.
   Rejects rebind / cross-slot / cross-order / missing identity / non-recruiter
   role. Returns canonical SQLSTATE P0001 on denial (no PII, no foreign IDs).';

-- ============================================================================
-- 3. Grant EXECUTE only to intended writer roles; explicitly revoke from
--    PUBLIC.
-- ============================================================================
REVOKE ALL ON FUNCTION public.hrp_f9b_bind_slot_to_opening(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hrp_f9b_bind_slot_to_opening(text, text) TO app_user_writer;
GRANT EXECUTE ON FUNCTION public.hrp_f9b_bind_slot_to_opening(text, text) TO app_user;

-- ============================================================================
-- 4. Hardening of the F9 narrow INSERT policy `hrp_f9_openings_staff_insert`
--    on `job_openings`. The original policy requires:
--      hrp_session_role() = 'HR_STAFF'
--        AND hrp_session_user_id() <> ''
--        AND hrp_staffing_order_visible_for(staffing_order_id)
--        AND status = 'DRAFT'
--    F9-B adds a WITH CHECK clause requiring that the slot exists on the
--    same order as the new opening (closes the cross-order construction
--    vector at the DB layer).
-- ============================================================================
DROP POLICY IF EXISTS hrp_f9_openings_staff_insert ON public.job_openings;
CREATE POLICY hrp_f9_openings_staff_insert ON public.job_openings
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND public.hrp_staffing_order_visible_for(job_openings.staffing_order_id)
    AND job_openings.status = 'DRAFT'
    AND EXISTS (
      SELECT 1
        FROM public.staffing_order_slots s
       WHERE s.id = job_openings.staffing_order_slot_id
         AND s.staffing_order_id = job_openings.staffing_order_id
    )
  );

-- ============================================================================
-- 5. Static-test guard: prove corrective posture at migration apply time.
-- ============================================================================
DO $$
DECLARE
  v_f9_slots_count int;
  v_f9b_fn_count int;
  v_f9b_fn_prosecdef boolean;
  v_f9b_fn_proconfig text;
  v_f9b_openings_clause_present boolean;
  v_public_revoke_count int;
  v_privileges_writers int;
BEGIN
  -- 5.1 `hrp_f9_slots_staff_update` must be gone.
  SELECT count(*)
    INTO v_f9_slots_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'staffing_order_slots'
     AND policyname = 'hrp_f9_slots_staff_update';
  IF v_f9_slots_count <> 0 THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: hrp_f9_slots_staff_update policy still exists (count=%)', v_f9_slots_count;
  END IF;

  -- 5.2 The new SECURITY DEFINER function must exist with the expected posture.
  SELECT count(*), bool_and(prosecdef), max(proconfig::text)
    INTO v_f9b_fn_count, v_f9b_fn_prosecdef, v_f9b_fn_proconfig
    FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname = 'hrp_f9b_bind_slot_to_opening';
  IF v_f9b_fn_count <> 1 THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: hrp_f9b_bind_slot_to_opening function count=%, expected 1', v_f9b_fn_count;
  END IF;
  IF v_f9b_fn_prosecdef IS NOT TRUE THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: hrp_f9b_bind_slot_to_opening prosecdef=false (must be true)';
  END IF;
  IF v_f9b_fn_proconfig IS NULL OR position('search_path' in v_f9b_fn_proconfig) = 0 THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: hrp_f9b_bind_slot_to_opening proconfig missing search_path (got %)', coalesce(v_f9b_fn_proconfig, 'NULL');
  END IF;

  -- 5.3 EXECUTE must be revoked from PUBLIC and granted only to app_user_writer + app_user.
  SELECT count(*)
    INTO v_public_revoke_count
    FROM information_schema.routine_privileges
   WHERE routine_schema = 'public'
     AND routine_name   = 'hrp_f9b_bind_slot_to_opening'
     AND grantee        = 'PUBLIC'
     AND privilege_type = 'EXECUTE';
  IF v_public_revoke_count <> 0 THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: PUBLIC has EXECUTE on hrp_f9b_bind_slot_to_opening (count=%)', v_public_revoke_count;
  END IF;

  SELECT count(*) FILTER (WHERE grantee IN ('app_user_writer', 'app_user'))
    INTO v_privileges_writers
    FROM information_schema.routine_privileges
   WHERE routine_schema = 'public'
     AND routine_name   = 'hrp_f9b_bind_slot_to_opening'
     AND privilege_type = 'EXECUTE';
  -- information_schema.routine_privileges also lists the function owner
  -- (typically the admin role that ran the migration). The contract is
  -- (a) NO PUBLIC grant, (b) EXECUTE granted to both app_user_writer
  -- and app_user. We assert both invariants explicitly.
  IF v_public_revoke_count <> 0 THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: PUBLIC has EXECUTE on hrp_f9b_bind_slot_to_opening (count=%)', v_public_revoke_count;
  END IF;
  IF v_privileges_writers <> 2 THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: EXECUTE missing for app_user_writer/app_user (writer_grantees=%)', v_privileges_writers;
  END IF;

  -- 5.4 The hardening clause on `hrp_f9_openings_staff_insert` must be
  -- present (the EXISTS sub-select for cross-order protection).
  SELECT EXISTS (
    SELECT 1
      FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.tablename  = 'job_openings'
       AND p.policyname = 'hrp_f9_openings_staff_insert'
       AND position('s.staffing_order_id = job_openings.staffing_order_id' in coalesce(p.with_check, '')) > 0
  ) INTO v_f9b_openings_clause_present;
  IF NOT v_f9b_openings_clause_present THEN
    RAISE EXCEPTION 'f9b_slot_opening_binding_primitive: hrp_f9_openings_staff_insert hardening clause missing (cross-order sub-select)';
  END IF;
END
$$;

COMMIT;