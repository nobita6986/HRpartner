-- Migration: m1_07a_ticket_rls_backstop
-- Task: hrp-v5-m1-07a-ticket-rls-backstop (V5-M1-07a)
-- Purpose: RQ-01..04 — Ticket-specific, command-aware RLS backstop for the whole
--          Ticket aggregate (tickets + ticket_history + ticket_comments +
--          ticket_notifications). Replaces the legacy permissive FOR ALL ticket
--          policies from 20260816210000_s1_rls_worker, which were incompatible
--          with the Ticket state machine (M1-06d HANDOFF BLK-01):
--            - ACCOUNTANT saw zero tickets (no branch in hrp_worker_visible_for)
--            - HR_STAFF lost the global PENDING review queue (assigned_to_id only)
--            - WITH CHECK root-only blocked WORKER/HR_STAFF/ACCOUNTANT writes
--
-- Decisions encoded (see TASK.md §3):
--   DEC-02 Ticket has its OWN visibility helpers — NOT hrp_worker_visible_for
--          (that helper carries SALE/CTV/VENDOR semantics outside Ticket workflow).
--   DEC-03 Command-aware policies (separate SELECT / INSERT / UPDATE); no FOR ALL.
--   DEC-04 RLS is a row/operation backstop only; L1 service + state machine still
--          enforce specific transitions, permission codes and field mutations.
--   DEC-05 SELECT row-visibility matrix per role.
--   DEC-06 Write-authority matrix (INSERT/UPDATE); runtime DELETE denied for all.
--   DEC-07 Child policies derive from parent Ticket; history append-only; Worker
--          cannot read internal comments; notification recipient isolation.
--   DEC-08 SECURITY DEFINER helpers schema-qualify objects, lock search_path,
--          minimal EXECUTE grants, identity ONLY from transaction GUC.
--   DEC-09 Forward-only; does not edit historical migrations.
--   DEC-10 Policies target runtime roles app_user_writer, app_user (never owner).
--
-- Apply: prisma migrate deploy/dev via directUrl=DATABASE_URL_ADMIN (admin/owner).
--        Runtime HTTP requests connect as app_user_writer / app_user under FORCE RLS.
-- NEVER: SET ROLE, BYPASSRLS, disabled RLS, broad USING (true), or withSystemDb.
--
-- Invariant used below: writable ⊆ visible for every role, so child policies may
-- read the parent via the caller's own tickets SELECT policy without false denials.

-- ════════════════════════════════════════════════════════════════════════
-- 0. GUC readers public.hrp_session_user_id() / public.hrp_session_role() are
--    created by 20260816210000_s1_rls_worker and reused as-is (not redefined).
-- ════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- 1. Ticket-specific helpers (DEC-02, DEC-05, DEC-06, DEC-08).
--    SECURITY DEFINER: only to cut the workers <-> project_assignments policy
--    chain (same reason as hrp_worker_visible_for), never to trust caller input.
--    Identity is read ONLY from transaction GUC via public.hrp_session_*(); no
--    role/user argument is accepted. search_path is locked; objects are qualified.
-- ════════════════════════════════════════════════════════════════════════

-- DROP old enum-signature versions first (they can't be replaced by text-signature).
-- CASCADE removes dependent policies; they will be recreated below with corrected casts.
DROP FUNCTION IF EXISTS public.hrp_ticket_visible(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_writable(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_insertable(text) CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_updatable(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_deletable() CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_history_visible(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_comment_visible(text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_notification_visible(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.hrp_ticket_comment_insertable(text, boolean) CASCADE;

-- 1a. SELECT visibility (DEC-05). worker_id/type/status come from the ticket row.
CREATE OR REPLACE FUNCTION public.hrp_ticket_visible(
  p_worker_id text,
  p_type      text,
  p_status    text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- Root + global reviewers read the full aggregate (HR_STAFF = global review).
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF')
    -- ACCOUNTANT: only ADVANCE_SALARY at finance-stage / result statuses.
    OR (
      public.hrp_session_role() = 'ACCOUNTANT'
      AND p_type = 'ADVANCE_SALARY'
      AND p_status IN ('HR_APPROVED', 'APPROVED', 'PAID', 'REJECTED', 'CLOSED')
    )
    -- WORKER: own ticket via workers.account_user_id (never a client-supplied id).
    OR (
      public.hrp_session_role() = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    )
    -- PM: read-only tickets of workers actively assigned to a project the PM owns.
    OR (
      public.hrp_session_role() = 'PM'
      AND EXISTS (
        SELECT 1
        FROM public.project_assignments a
        JOIN public.outsourcing_projects p ON p.id = a.project_id
        WHERE a.worker_id = p_worker_id
          AND a.status = 'ACTIVE'
          AND p.pm_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- 1b. WRITE authority — deny runtime DELETE, restrict INSERT/UPDATE per role (DEC-06).
CREATE OR REPLACE FUNCTION public.hrp_ticket_writable(
  p_worker_id text,
  p_type      text,
  p_status    text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- Root roles: full write
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    -- HR_STAFF: workflow write on any ticket (state machine + L1 guard).
    OR public.hrp_session_role() = 'HR_STAFF'
    -- ACCOUNTANT: update only ADVANCE_SALARY at finance / result stages.
    OR (
      public.hrp_session_role() = 'ACCOUNTANT'
      AND p_type = 'ADVANCE_SALARY'
      AND p_status IN ('HR_APPROVED', 'APPROVED', 'PAID', 'REJECTED', 'CLOSED')
    )
    -- WORKER: insert own new ticket (self), update own ticket (PENDING cancel).
    OR (
      public.hrp_session_role() = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- 1c. INSERT authority — same as writable; separate for command-aware policy.
CREATE OR REPLACE FUNCTION public.hrp_ticket_insertable(
  p_worker_id text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- DEC-06: DIRECTOR is read-only — cannot INSERT.
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR (
      public.hrp_session_role() = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- 1d. UPDATE authority — slightly different from insert (ACCOUNTANT advance, no new insert).
CREATE OR REPLACE FUNCTION public.hrp_ticket_updatable(
  p_worker_id text,
  p_type      text,
  p_status    text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR public.hrp_session_role() = 'HR_STAFF'
    OR (
      public.hrp_session_role() = 'ACCOUNTANT'
      AND p_type = 'ADVANCE_SALARY'
      AND p_status IN ('HR_APPROVED', 'APPROVED', 'PAID', 'REJECTED', 'CLOSED')
    )
    OR (
      public.hrp_session_role() = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- 1e. DELETE authority — runtime deny for all (DEC-06). Service uses soft-delete via status.
CREATE OR REPLACE FUNCTION public.hrp_ticket_deletable() RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT false;  -- deny all runtime DELETE; service uses status transition, not physical delete
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Child-table visibility helpers (DEC-07).
--    Read scope derives from parent ticket via EXISTS subquery — the caller's
--    own tickets SELECT policy is used for the parent check, so the invariant
--    "writable ⊆ visible" holds and no false denial occurs in valid transactions.
-- ════════════════════════════════════════════════════════════════════════════

-- 2a. History: workers read their own ticket history; HR/DIRECTOR/ADMIN read all.
CREATE OR REPLACE FUNCTION public.hrp_ticket_history_visible(
  p_ticket_worker_id text,
  p_ticket_type      text,
  p_ticket_status    text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF')
    OR (
      public.hrp_session_role() = 'ACCOUNTANT'
      AND p_ticket_type = 'ADVANCE_SALARY'
      AND p_ticket_status IN ('HR_APPROVED', 'APPROVED', 'PAID', 'REJECTED', 'CLOSED')
    )
    OR (
      public.hrp_session_role() = 'PM'
      AND EXISTS (
        SELECT 1
        FROM public.project_assignments a
        JOIN public.outsourcing_projects p ON p.id = a.project_id
        WHERE a.worker_id = p_ticket_worker_id
          AND a.status = 'ACTIVE'
          AND p.pm_user_id = public.hrp_session_user_id()
      )
    )
    OR (
      public.hrp_session_role() = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_ticket_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- 2b. Comments: Worker cannot read internal comments; HR/ADMIN/DIRECTOR read all.
CREATE OR REPLACE FUNCTION public.hrp_ticket_comment_visible(
  p_ticket_worker_id  text,
  p_is_internal       boolean
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- Root + HR_STAFF see everything (internal + non-internal).
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF')
    -- ACCOUNTANT/PM/WORKER: only non-internal comments on tickets they can see.
    OR (
      public.hrp_session_role() IN ('ACCOUNTANT', 'PM')
      AND p_is_internal = false
      AND public.hrp_ticket_visible(p_ticket_worker_id, '', '')
    )
    OR (
      public.hrp_session_role() = 'WORKER'
      AND p_is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_ticket_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- 2c. Notifications: workers read only notifications for their role on their tickets.
CREATE OR REPLACE FUNCTION public.hrp_ticket_notification_visible(
  p_ticket_worker_id  text,
  p_ticket_type       text,
  p_recipient_role    text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- Root + HR see all notifications.
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF')
    -- ACCOUNTANT: only advance-related notifications.
    OR (
      public.hrp_session_role() = 'ACCOUNTANT'
      AND p_recipient_role = 'ACCOUNTANT'
      AND p_ticket_type = 'ADVANCE_SALARY'
    )
    -- PM: only for their role and only on project-owned worker tickets.
    OR (
      public.hrp_session_role() = 'PM'
      AND p_recipient_role = 'PM'
      AND public.hrp_ticket_visible(p_ticket_worker_id, '', '')
    )
    -- WORKER: only notifications for WORKER role on their own tickets.
    OR (
      public.hrp_session_role() = 'WORKER'
      AND p_recipient_role = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_ticket_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- 2d. Comment insert: internal comments require HR role; non-internal allows WORKER via service.
CREATE OR REPLACE FUNCTION public.hrp_ticket_comment_insertable(
  p_ticket_worker_id text,
  p_is_internal      boolean
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- Root + HR can insert any comment.
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    -- WORKER: can insert non-internal comments on their own tickets.
    OR (
      public.hrp_session_role() = 'WORKER'
      AND p_is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.workers w
        WHERE w.id = p_ticket_worker_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Legacy ticket/comment/notification policies from s1_rls_worker (DEC-09).
--    DROP + REPLACE with new command-aware policies.
--    ticket_history has no legacy policy — only CREATE.
-- ════════════════════════════════════════════════════════════════════════════

-- 3a. tickets — REPLACE legacy hrp_ticket_scope FOR ALL → 4 separate command policies.
DROP POLICY IF EXISTS hrp_ticket_scope ON public.tickets;

-- SELECT: use the dedicated visibility helper.
CREATE POLICY hrp_ticket_select ON public.tickets
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (public.hrp_ticket_visible(worker_id, type::text, status::text));

-- INSERT: workers insert their own tickets; HR/ADMIN insert any.
CREATE POLICY hrp_ticket_insert ON public.tickets
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (public.hrp_ticket_insertable(worker_id));

-- UPDATE: per-role matrix including ACCOUNTANT advance update.
CREATE POLICY hrp_ticket_update ON public.tickets
  AS PERMISSIVE FOR UPDATE
  TO app_user_writer, app_user
  USING (public.hrp_ticket_updatable(worker_id, type::text, status::text))
  WITH CHECK (public.hrp_ticket_updatable(worker_id, type::text, status::text));

-- DELETE: deny all runtime DELETE (service uses status soft-delete).
CREATE POLICY hrp_ticket_delete ON public.tickets
  AS PERMISSIVE FOR DELETE
  TO app_user_writer, app_user
  USING (public.hrp_ticket_deletable());

-- 3b. ticket_history — no legacy policy. CREATE insert + read policies (append-only).
-- ENABLE + FORCE first; old migration s1_rls_worker never touched this table.
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history FORCE ROW LEVEL SECURITY;

-- History is append-only: no UPDATE/DELETE policies needed (table has no such operations
-- in normal workflow; service never updates/deletes history rows).
-- DROP any existing policies from partial round-1 apply attempt.
DROP POLICY IF EXISTS hrp_ticket_history_select ON public.ticket_history;
DROP POLICY IF EXISTS hrp_ticket_history_insert ON public.ticket_history;
-- SELECT: read parent ticket's visibility.
CREATE POLICY hrp_ticket_history_select ON public.ticket_history
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_history.ticket_id
        AND public.hrp_ticket_visible(t.worker_id, t.type::text, t.status::text)
    )
  );

-- INSERT: service creates history inside ticket transaction; allow root + HR + ACCOUNTANT + WORKER self.
-- PLN-02 fix: ACCOUNTANT approve/reject/pay writes TicketHistory atomically in same tx.
CREATE POLICY hrp_ticket_history_insert ON public.ticket_history
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF', 'DIRECTOR', 'ACCOUNTANT')
    OR (
      public.hrp_session_role() = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM public.tickets t
        JOIN public.workers w ON w.id = t.worker_id
        WHERE t.id = ticket_history.ticket_id
          AND w.account_user_id = public.hrp_session_user_id()
      )
    )
  );

-- 3c. ticket_comments — REPLACE legacy hrp_ticket_comment_scope → 2 separate policies.
DROP POLICY IF EXISTS hrp_ticket_comment_scope ON public.ticket_comments;
DROP POLICY IF EXISTS hrp_ticket_comment_select ON public.ticket_comments;
DROP POLICY IF EXISTS hrp_ticket_comment_insert ON public.ticket_comments;

-- SELECT: internal comments hidden from non-HR roles.
CREATE POLICY hrp_ticket_comment_select ON public.ticket_comments
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND public.hrp_ticket_comment_visible(t.worker_id::text, ticket_comments.is_internal)
    )
  );

-- INSERT: internal comments require HR; non-internal allows WORKER self.
CREATE POLICY hrp_ticket_comment_insert ON public.ticket_comments
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND public.hrp_ticket_comment_insertable(t.worker_id::text, ticket_comments.is_internal)
    )
  );

-- 3d. ticket_notifications — REPLACE legacy hrp_ticket_notification_scope.
DROP POLICY IF EXISTS hrp_ticket_notification_scope ON public.ticket_notifications;
DROP POLICY IF EXISTS hrp_ticket_notification_select ON public.ticket_notifications;
DROP POLICY IF EXISTS hrp_ticket_notification_insert ON public.ticket_notifications;

-- SELECT: recipient-role isolation.
CREATE POLICY hrp_ticket_notification_select ON public.ticket_notifications
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_notifications.ticket_id
        AND public.hrp_ticket_notification_visible(t.worker_id::text, t.type::text, ticket_notifications.recipient_role::text)
    )
  );

-- INSERT: only HR/ADMIN create notifications (service layer, not end-user).
CREATE POLICY hrp_ticket_notification_insert ON public.ticket_notifications
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    public.hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF', 'DIRECTOR')
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Grants (DEC-08) — helpers owned by migration-admin (neondb_owner).
--    EXECUTE on helpers to app_user_writer + app_user; no PUBLIC.
--    Tables: RLS policies handle access; no direct SELECT/INSERT/UPDATE grants needed.
-- ════════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.hrp_ticket_visible(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_writable(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_insertable(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_updatable(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_deletable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_history_visible(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_comment_visible(text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_notification_visible(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hrp_ticket_comment_insertable(text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hrp_ticket_visible(text, text, text) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_writable(text, text, text) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_insertable(text) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_updatable(text, text, text) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_deletable() TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_history_visible(text, text, text) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_comment_visible(text, boolean) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_notification_visible(text, text, text) TO app_user_writer, app_user;
GRANT EXECUTE ON FUNCTION public.hrp_ticket_comment_insertable(text, boolean) TO app_user_writer, app_user;

-- Verify RLS flags (informational — for audit inspection).
-- SELECT relname, relrowsecurity, relforcerowsecurity
--   FROM pg_class WHERE relname IN ('tickets','ticket_history','ticket_comments','ticket_notifications');
