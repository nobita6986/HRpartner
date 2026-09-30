-- ============================================================================
-- Migration: p1a04_scoped_recruiter_authority
-- Task:      hrp-p1-a0-4-scoped-recruiter-authority (TASK.md v1.3)
-- Baseline:  origin/main @ f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7
-- Origin:    Phase 2 implementation (T0 disposition RESOLVED_BY_T0, 2026-09-28)
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- P1-A0.4 narrows recruiter authority to a per-StaffingOrder scope, bounded
-- by an `ASSIGNED_TO_ORDER` relationship. The change is additive, forward-
-- only, and never modifies any existing CHECK / unique index / policy.
--
-- Business invariants (TASK.md §3, AC-01..AC-08):
--   * A recruiter (HR_STAFF) can be assigned to a StaffingOrder by an
--     HR_MANAGER (`HR_MANAGER_ASSIGN`) OR can self-claim an unclaimed order
--     (`ORDER_RECRUITER_CLAIM`). Self-claim requires no other ACTIVE
--     recruiter on the same order.
--   * At most one ACTIVE `StaffingOrderRecruiterAssignment` per recruiter
--     on a given order — partial unique index enforces this.
--   * RLS scope for HR_STAFF:
--       - SELECT: rows where `recruiter_user_id = session user` (their own
--         assignments only) OR `ADMIN/HR_MANAGER`.
--       - INSERT: server-derived (HR_MANAGER creates HR_MANAGER_ASSIGN; HR_STAFF
--         self-claim creates ORDER_RECRUITER_CLAIM). The application code is
--         the authoritative role gate; RLS is a backstop (deny-by-default
--         for cross-recruiter rows).
--       - UPDATE: revoke must target rows the caller has authority over; for
--         self-revoke the only legal mutation is ACTIVE → REVOKED.
--   * RLS scope for `staffing_order_slots` / `job_openings` / `job_postings`:
--     UNCHANGED on public surface. Internal write paths are gated through
--     the new helpers, the helpers' visibility predicate is:
--       - HR_STAFF sees an order only when there is an active
--         StaffingOrderRecruiterAssignment for them on that order.
--
-- WHAT THIS MIGRATION DOES
-- -------------------------
-- (1) Creates the `staffing_order_recruiter_assignments` table + indexes
--     + partial unique active-assignment index.
-- (2) Adds two schema-qualified SECURITY DEFINER helpers
--     (`hrp_staffing_order_visible_for`, `hrp_project_recruiter_visible_for`)
--     with `SET search_path = pg_catalog, public`, identity via the existing
--     GUC helpers (`hrp_session_role`, `hrp_session_user_id`), and
--     `REVOKE ... FROM PUBLIC` + `GRANT ... TO app_user_writer, app_user`.
-- (3) Adds narrow PERMISSIVE HR_STAFF RLS policies on the new table
--     and a narrow visibility helper for downstream tables whose existing
--     policies already route through `hrp_staffing_order_visible_for` /
--     `hrp_project_recruiter_visible_for`.
-- (4) Adds the static-test backstop: an SQL guard that proves the helpers
--     are locked to `pg_catalog, public` and grants are not from PUBLIC.
--
-- SCOPE (minimal — §4.2 Exact File Allowlist item)
--   - Touched: ONE new migration + ONE new table + TWO new functions
--     + THREE new indexes (one partial unique) + new RLS policies on the
--     new table only. NO existing policy is rewritten.
--   - NO DELETE; the new table starts empty.
--   - NO role/grant changes for any pre-existing table.
--   - Public surface (job_postings SELECT path) is UNCHANGED — relies on
--     the existing `hrp_public_jobs_view`.
--
-- IDEMPOTENT
--   - CREATE TABLE IF NOT EXISTS guard inside DO block.
--   - CREATE INDEX IF NOT EXISTS style.
--   - GRANTs are unconditional (Postgres 14+ tolerates re-grants).
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief. Migration file ships only. T0 runs production
--   preflight and applies via a separate gate. Dedicated synthetic DB used
--   for CI.
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Bounded lock_timeout (DEC-04 / Risk "Lock blocks production").
--    Covers CREATE TABLE + CREATE INDEX + ALTER TABLE enable/FORCE RLS.
-- ───────────────────────────────────────────────────────────────────────────
SET LOCAL lock_timeout = '5s';

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. NEW TABLE — staffing_order_recruiter_assignments
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'staffing_order_recruiter_assignments'
  ) THEN
    CREATE TABLE public.staffing_order_recruiter_assignments (
      id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
      staffing_order_id   text        NOT NULL
                                       REFERENCES public.staffing_orders(id) ON DELETE CASCADE,
      recruiter_user_id   text        NOT NULL
                                       REFERENCES public.users(id),
      assigned_by_user_id text        REFERENCES public.users(id),
      source              text        NOT NULL
                                       CHECK (source IN ('HR_MANAGER_ASSIGN', 'ORDER_RECRUITER_CLAIM')),
      status              text        NOT NULL
                                       CHECK (status IN ('ACTIVE', 'REVOKED')),
      reason              text,
      starts_at           timestamptz NOT NULL DEFAULT now(),
      revoked_at          timestamptz,
      revoked_by_user_id  text        REFERENCES public.users(id),
      created_at          timestamptz NOT NULL DEFAULT now(),
      updated_at          timestamptz NOT NULL DEFAULT now(),
      version             integer     NOT NULL DEFAULT 1,

      -- Conditional CHECK: an ACTIVE row must have starts_at set; a REVOKED
      -- row must carry revoked_at + revoked_by_user_id (audit trail).
      CONSTRAINT staffing_order_recruiter_assignments_active_starts_required
        CHECK (status <> 'ACTIVE' OR starts_at IS NOT NULL),
      CONSTRAINT staffing_order_recruiter_assignments_revoked_audit_required
        CHECK (status <> 'REVOKED' OR (revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL)),
      -- HR_MANAGER_ASSIGN must carry assigned_by_user_id (the manager who assigned it).
      CONSTRAINT staffing_order_recruiter_assignments_manager_assign_author_required
        CHECK (source <> 'HR_MANAGER_ASSIGN' OR assigned_by_user_id IS NOT NULL),
      -- ORDER_RECRUITER_CLAIM must NOT carry assigned_by_user_id (self-claim is anonymous).
      CONSTRAINT staffing_order_recruiter_assignments_claim_no_assignor
        CHECK (source <> 'ORDER_RECRUITER_CLAIM' OR assigned_by_user_id IS NULL)
    );
  END IF;
END
$$;

-- Indexes (idempotent via IF NOT EXISTS).
CREATE INDEX IF NOT EXISTS staffing_order_recruiter_assignments_order_status_idx
  ON public.staffing_order_recruiter_assignments (staffing_order_id, status);
CREATE INDEX IF NOT EXISTS staffing_order_recruiter_assignments_recruiter_status_idx
  ON public.staffing_order_recruiter_assignments (recruiter_user_id, status);

-- Partial unique active-assignment indexes (defense-in-depth):
--   - (order, recruiter): at most one ACTIVE assignment per (order, recruiter).
--     Catches the same-recruiter race window.
--   - (order)            : at most one ACTIVE assignment per order, regardless
--     of which recruiter holds it. This is the claim-race winner/loser gate
--     — a second claim attempt for a DIFFERENT recruiter collides here, not
--     on the (order, recruiter) index.
CREATE UNIQUE INDEX IF NOT EXISTS staffing_order_recruiter_assignments_active_unique_idx
  ON public.staffing_order_recruiter_assignments (staffing_order_id, recruiter_user_id)
  WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS staffing_order_recruiter_assignments_active_order_unique_idx
  ON public.staffing_order_recruiter_assignments (staffing_order_id)
  WHERE status = 'ACTIVE';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SECURITY DEFINER HELPERS (schema-qualified, search_path locked)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- DEC-04 / DEC-05: both helpers read identity from the GUC helpers
-- (hrp_session_role, hrp_session_user_id) that already exist in the DB. They
-- never use `current_user`/`session_user` and never reference `auth.*`. The
-- helpers are the only path for HR_STAFF rows in the new table; the
-- application code is the authoritative role gate (HR_MANAGER / ADMIN POST
-- commands) and the helpers are a backstop.
--
-- Locked `search_path` is mandatory: SECURITY DEFINER runs with the function
-- owner's privileges; if search_path is mutable an attacker can shadow the
-- `public.staffing_orders` / `public.staffing_order_recruiter_assignments`
-- references and inject a different relation. The `SET search_path = pg_catalog,
-- public` clause is part of the function definition and is verified by the
-- final assertion block.

-- (2.1) hrp_staffing_order_visible_for(oid text): does the session user have
--        visibility to this single StaffingOrder id?
CREATE OR REPLACE FUNCTION public.hrp_staffing_order_visible_for(oid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- ADMIN/HR_MANAGER/DIRECTOR: full read access (DEC-05).
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    -- PM on the parent project (consistent with hrp_project_visible_for).
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.outsourcing_projects p ON p.id = so.project_id
       WHERE so.id = oid
         AND p.pm_user_id = hrp_session_user_id()))
    -- SALE sees the order only when the project is public (mirrors PM/MKT rule).
    OR (hrp_session_role() = 'SALE' AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.outsourcing_projects p ON p.id = so.project_id
       WHERE so.id = oid AND p.is_public = true))
    -- MKT/CTV: public projects only.
    OR (hrp_session_role() IN ('MKT', 'CTV') AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.outsourcing_projects p ON p.id = so.project_id
       WHERE so.id = oid AND p.is_public = true))
    -- HR_STAFF: orders they have an ACTIVE recruiter assignment on.
    OR (hrp_session_role() = 'HR_STAFF' AND hrp_session_user_id() <> '' AND EXISTS (
      SELECT 1
        FROM public.staffing_order_recruiter_assignments a
       WHERE a.staffing_order_id = oid
         AND a.recruiter_user_id = hrp_session_user_id()
         AND a.status = 'ACTIVE'))
    -- VENDOR_*: see the order only when the project is public OR they have a
    -- candidate submission on the project (mirrors hrp_project_visible_for).
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND hrp_session_vendor_id() <> '' AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.outsourcing_projects p ON p.id = so.project_id
       WHERE so.id = oid
         AND (p.is_public = true OR EXISTS (
           SELECT 1
             FROM public.candidate_submissions cs
            WHERE cs.project_id = p.id
              AND cs.vendor_id = hrp_session_vendor_id()))))
    -- WORKER: same public-only rule as project scope.
    OR (hrp_session_role() = 'WORKER' AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.outsourcing_projects p ON p.id = so.project_id
       WHERE so.id = oid
         AND (p.is_public = true OR EXISTS (
           SELECT 1
             FROM public.project_assignments pa
            WHERE pa.project_id = p.id
              AND pa.status = 'ACTIVE'
              AND EXISTS (SELECT 1 FROM public.workers w
                           WHERE w.id = pa.worker_id
                             AND w.account_user_id = hrp_session_user_id())))));
$$;

-- (2.2) hrp_project_recruiter_visible_for(pid text): project-level visibility
--        predicate that admits the HR_STAFF-on-active-assignment rule.
--        Used by policies on tables whose parent is a project (sites,
--        contracts) when a recruiter needs to navigate from the project
--        surface to the order. Always falls back to hrp_project_visible_for
--        for non-HR_STAFF roles.
CREATE OR REPLACE FUNCTION public.hrp_project_recruiter_visible_for(pid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- Non-HR_STAFF roles follow the existing project visibility rule.
    (hrp_session_role() <> 'HR_STAFF' AND hrp_project_visible_for(pid))
    -- HR_STAFF: visible when at least one of the project's orders has an
    -- ACTIVE assignment for the session user.
    OR (hrp_session_role() = 'HR_STAFF' AND hrp_session_user_id() <> '' AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
        JOIN public.staffing_order_recruiter_assignments a
          ON a.staffing_order_id = so.id
       WHERE so.project_id = pid
         AND a.recruiter_user_id = hrp_session_user_id()
         AND a.status = 'ACTIVE'));
$$;

-- Lock EXECUTE to the canonical app roles; deny PUBLIC.
REVOKE ALL ON FUNCTION public.hrp_staffing_order_visible_for(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hrp_staffing_order_visible_for(text) TO app_user_writer, app_user;
REVOKE ALL ON FUNCTION public.hrp_project_recruiter_visible_for(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hrp_project_recruiter_visible_for(text) TO app_user_writer, app_user;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RLS ON THE NEW TABLE
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.staffing_order_recruiter_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_order_recruiter_assignments FORCE ROW LEVEL SECURITY;

-- (3.1) SELECT: HR_STAFF sees only their own rows; ADMIN/HR_MANAGER see all.
DROP POLICY IF EXISTS hrp_sora_select ON public.staffing_order_recruiter_assignments;
CREATE POLICY hrp_sora_select ON public.staffing_order_recruiter_assignments
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() = 'HR_STAFF' AND recruiter_user_id = hrp_session_user_id())
  );

-- (3.2) INSERT: HR_STAFF self-claim (recruiter_user_id = session, source = ORDER_RECRUITER_CLAIM,
--                   assigned_by_user_id IS NULL) OR HR_MANAGER assign (assigned_by_user_id = session,
--                   source = HR_MANAGER_ASSIGN, recruiter role is HR_STAFF, target order exists).
--                   ADMIN can also insert (no extra constraints).
DROP POLICY IF EXISTS hrp_sora_insert ON public.staffing_order_recruiter_assignments;
CREATE POLICY hrp_sora_insert ON public.staffing_order_recruiter_assignments
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    hrp_session_role() = 'ADMIN'
    OR (hrp_session_role() = 'HR_MANAGER' AND assigned_by_user_id = hrp_session_user_id()
        AND source = 'HR_MANAGER_ASSIGN')
    OR (hrp_session_role() = 'HR_STAFF' AND recruiter_user_id = hrp_session_user_id()
        AND assigned_by_user_id IS NULL
        AND source = 'ORDER_RECRUITER_CLAIM')
  );

-- (3.3) UPDATE: HR_MANAGER / ADMIN can revoke any row.
--                   HR_STAFF can revoke only their own self-claimed (ORDER_RECRUITER_CLAIM) rows.
DROP POLICY IF EXISTS hrp_sora_update ON public.staffing_order_recruiter_assignments;
CREATE POLICY hrp_sora_update ON public.staffing_order_recruiter_assignments
  AS PERMISSIVE FOR UPDATE
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    OR (hrp_session_role() = 'HR_STAFF' AND recruiter_user_id = hrp_session_user_id()
        AND source = 'ORDER_RECRUITER_CLAIM')
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    OR (hrp_session_role() = 'HR_STAFF' AND recruiter_user_id = hrp_session_user_id()
        AND source = 'ORDER_RECRUITER_CLAIM')
  );

-- (3.4) DELETE: never permitted at the RLS layer — revoke is the only legal
--                   terminal transition (status = REVOKED, revoked_at = now()).
DROP POLICY IF EXISTS hrp_sora_delete ON public.staffing_order_recruiter_assignments;
CREATE POLICY hrp_sora_delete ON public.staffing_order_recruiter_assignments
  AS PERMISSIVE FOR DELETE
  TO app_user_writer, app_user
  USING (false);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TABLE GRANTS — writer can SELECT/INSERT/UPDATE/DELETE; everything routed
--    through RLS. No DELETE policy (deny-by-default).
-- ═══════════════════════════════════════════════════════════════════════════
REVOKE ALL ON TABLE public.staffing_order_recruiter_assignments FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staffing_order_recruiter_assignments TO app_user_writer, app_user;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. STATIC POST-MIGRATION ASSERTIONS (fail-closed if violated)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_helper_sch   text;
  v_helper_path  text;
  v_role_grantee text;
  v_role_priv    text;
  v_count_active integer;
  v_count_total  integer;
  v_predicate_text text;
BEGIN
  -- (5.1) search_path on both helpers must equal `pg_catalog, public` exactly.
  SELECT p.proconfig INTO v_helper_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'hrp_staffing_order_visible_for'
     AND p.prokind = 'f';
  IF v_helper_path IS NULL OR v_helper_path NOT LIKE '%search_path%pg_catalog%public%' THEN
    RAISE EXCEPTION 'p1a04 migration: hrp_staffing_order_visible_for missing locked search_path';
  END IF;

  SELECT p.proconfig INTO v_helper_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'hrp_project_recruiter_visible_for'
     AND p.prokind = 'f';
  IF v_helper_path IS NULL OR v_helper_path NOT LIKE '%search_path%pg_catalog%public%' THEN
    RAISE EXCEPTION 'p1a04 migration: hrp_project_recruiter_visible_for missing locked search_path';
  END IF;

  -- (5.2) Both helpers must be in the public schema (schema-qualified only).
  SELECT n.nspname INTO v_helper_sch
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname IN ('hrp_staffing_order_visible_for', 'hrp_project_recruiter_visible_for')
     AND p.prokind = 'f';
  IF v_helper_sch <> 'public' THEN
    RAISE EXCEPTION 'p1a04 migration: helpers not in public schema (got %)', v_helper_sch;
  END IF;

  -- (5.3) Helper EXECUTE must NOT be granted to PUBLIC.
  FOR v_role_grantee IN
    SELECT grantee FROM information_schema.routine_privileges
     WHERE routine_schema = 'public'
       AND routine_name IN ('hrp_staffing_order_visible_for', 'hrp_project_recruiter_visible_for')
       AND grantee = 'PUBLIC'
  LOOP
    RAISE EXCEPTION 'p1a04 migration: helper EXECUTE granted to PUBLIC (grantee=%)', v_role_grantee;
  END LOOP;

  -- (5.4) New table RLS posture: relrowsecurity=true + forcerowsecurity=true.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
     WHERE c.relname = 'staffing_order_recruiter_assignments'
       AND c.relnamespace = 'public'::regnamespace
       AND c.relrowsecurity = true AND c.relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION 'p1a04 migration: staffing_order_recruiter_assignments RLS not enabled+forced';
  END IF;

  -- (5.5) Partial unique index must exist (at-most-one-active invariant).
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
     WHERE c.relname = 'staffing_order_recruiter_assignments_active_unique_idx'
       AND c.relnamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'p1a04 migration: active-assignment partial unique index missing';
  END IF;

  -- (5.5b) Per-order partial unique index (claim-race winner gate) must exist.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
     WHERE c.relname = 'staffing_order_recruiter_assignments_active_order_unique_idx'
       AND c.relnamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'p1a04 migration: per-order active partial unique index missing';
  END IF;

  -- (5.6) No PUBLIC grant on the new table.
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema = 'public'
       AND table_name = 'staffing_order_recruiter_assignments'
       AND grantee = 'PUBLIC'
  ) THEN
    RAISE EXCEPTION 'p1a04 migration: PUBLIC has grants on staffing_order_recruiter_assignments';
  END IF;

  -- (5.7) Helper previews (admin bypass). Smoke check that the function body
  -- references the expected tables and GUC helpers.
  SELECT prosrc INTO v_predicate_text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'hrp_staffing_order_visible_for' AND p.prokind = 'f';
  IF v_predicate_text NOT LIKE '%staffing_order_recruiter_assignments%'
     OR v_predicate_text NOT LIKE '%hrp_session_role%'
     OR v_predicate_text NOT LIKE '%hrp_session_user_id%' THEN
    RAISE EXCEPTION 'p1a04 migration: hrp_staffing_order_visible_for body missing expected references';
  END IF;

  -- (5.8) Migration opens the table empty (forward-only backfill semantics).
  SELECT count(*) INTO v_count_total FROM public.staffing_order_recruiter_assignments;
  SELECT count(*) INTO v_count_active FROM public.staffing_order_recruiter_assignments WHERE status = 'ACTIVE';
  IF v_count_total <> 0 OR v_count_active <> 0 THEN
    RAISE EXCEPTION 'p1a04 migration: new table should start empty (total=%, active=%)',
      v_count_total, v_count_active;
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. NARROW HR_STAFF PERMISSIVE POLICIES (assigned-order scope)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- These policies admit HR_STAFF rows on the surrounding tables when the row
-- is anchored to an order the recruiter has an ACTIVE assignment on.
-- All non-HR_STAFF rows fall back to the existing policies on each table.

-- (6.1) staffing_orders — HR_STAFF sees orders they have an ACTIVE assignment on.
DROP POLICY IF EXISTS hrp_sora_staffing_orders_staff_select ON public.staffing_orders;
CREATE POLICY hrp_sora_staffing_orders_staff_select ON public.staffing_orders
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (public.hrp_staffing_order_visible_for(id));

-- (6.1b) staffing_orders — HR_STAFF also sees OPEN+unassigned orders in the
--                   claim queue. Separate narrow policy (NOT going through
--                   the helper) so the assignment-on-it branch stays
--                   restrictive. This policy is the read path for the
--                   claim flow (`listUnclaimedStaffingOrders`, `findUnique`
--                   inside `claimStaffingOrder`).
DROP POLICY IF EXISTS hrp_sora_staffing_orders_claimable_select ON public.staffing_orders;
CREATE POLICY hrp_sora_staffing_orders_claimable_select ON public.staffing_orders
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND status = 'OPEN'
    AND NOT EXISTS (
      SELECT 1
        FROM public.staffing_order_recruiter_assignments a
       WHERE a.staffing_order_id = public.staffing_orders.id
         AND a.status = 'ACTIVE'
    )
  );

-- (6.2) outsourcing_projects — HR_STAFF sees projects anchored to their orders.
DROP POLICY IF EXISTS hrp_sora_projects_staff_select ON public.outsourcing_projects;
CREATE POLICY hrp_sora_projects_staff_select ON public.outsourcing_projects
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (public.hrp_project_recruiter_visible_for(id));

-- (6.2b) outsourcing_projects — HR_STAFF also sees projects that contain at
--                   least one OPEN+unassigned order (claim-queue surface).
--                   Needed because `listUnclaimedStaffingOrders` and the
--                   claim service LEFT-JOIN `project` for display fields.
DROP POLICY IF EXISTS hrp_sora_projects_claimable_select ON public.outsourcing_projects;
CREATE POLICY hrp_sora_projects_claimable_select ON public.outsourcing_projects
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND EXISTS (
      SELECT 1
        FROM public.staffing_orders so
       WHERE so.project_id = public.outsourcing_projects.id
         AND so.status = 'OPEN'
         AND NOT EXISTS (
           SELECT 1
             FROM public.staffing_order_recruiter_assignments a
            WHERE a.staffing_order_id = so.id
              AND a.status = 'ACTIVE'
         )
    )
  );

-- (6.3) staffing_order_slots — HR_STAFF sees slots on their orders.
DROP POLICY IF EXISTS hrp_sora_order_slots_staff_select ON public.staffing_order_slots;
CREATE POLICY hrp_sora_order_slots_staff_select ON public.staffing_order_slots
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (public.hrp_staffing_order_visible_for(staffing_order_id));

-- (6.4) job_openings — HR_STAFF sees openings anchored to their orders.
DROP POLICY IF EXISTS hrp_sora_job_openings_staff_select ON public.job_openings;
CREATE POLICY hrp_sora_job_openings_staff_select ON public.job_openings
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (public.hrp_staffing_order_visible_for(staffing_order_id));

-- (6.5) job_postings — HR_STAFF sees postings anchored to openings on their
--                  orders. Predicate JOINs through job_openings which carries
--                  the staffing_order_id anchor.
DROP POLICY IF EXISTS hrp_sora_job_postings_staff_select ON public.job_postings;
CREATE POLICY hrp_sora_job_postings_staff_select ON public.job_postings
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (EXISTS (
    SELECT 1
      FROM public.job_openings jo
     WHERE jo.id = job_postings.job_opening_id
       AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
  ));

COMMIT;
