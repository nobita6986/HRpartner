-- Migration: s1_rls_worker
-- Purpose: STEP-02 / RQ-02 — Worker scope RLS.
--   Tables: workers (root), dependents, source_claims, project_assignments,
--           tickets, ticket_comments, ticket_notifications (theo worker qua FK).
--   DEC-04: s1_rls_worker (workers + child tables theo worker).
--   DEC-02: set_config(..., true) GUC; KHÔNG SET ROLE.
--   DEC-03: FORCE ROW LEVEL SECURITY cho app_user_writer.
--   data-scope-security §5.2 + §6.1: 8+ role matrix.
--
-- Apply: prisma migrate dev (sẽ chạy qua directUrl=DATABASE_URL_ADMIN).
-- Verify: SELECT count(*) FROM workers AS app_user_writer (sau khi GUC set trong transaction)
--         phải trả về subset theo role.

-- ════════════════════════════════════════════════════════════════════════
-- 1. Helper function đọc GUC với fallback '' (an toàn khi GUC chưa set).
--    Phase 2 sẽ dùng set_config(..., true) trong transaction để set giá trị.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hrp_session_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION hrp_session_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.role', true), '')
$$;

CREATE OR REPLACE FUNCTION hrp_session_vendor_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.vendor_id', true), '')
$$;

CREATE OR REPLACE FUNCTION hrp_session_worker_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.worker_id', true), '')
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 2. WORKERS — root table. Policy theo matrix §5.2.
--    Dùng SECURITY DEFINER helper để tránh infinite recursion giữa các
--    policy của workers <-> project_assignments <-> source_claims.
-- ════════════════════════════════════════════════════════════════════════

-- Helper: check theo visibility matrix. SECURITY DEFINER để bypass RLS của các bảng khác.
CREATE OR REPLACE FUNCTION hrp_worker_visible_for(wid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() = 'HR_STAFF' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = wid AND w.assigned_to_id = hrp_session_user_id()))
    OR (hrp_session_role() = 'SALE' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = wid AND (w.owner_id = hrp_session_user_id() OR w.assigned_to_id = hrp_session_user_id())))
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM project_assignments a
      JOIN outsourcing_projects p ON p.id = a.project_id
      WHERE a.worker_id = wid AND a.status = 'ACTIVE' AND p.pm_user_id = hrp_session_user_id()))
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND EXISTS (
      SELECT 1 FROM source_claims s WHERE s.worker_id = wid AND s.accepted = true AND s.vendor_id = hrp_session_vendor_id()))
    OR (hrp_session_role() = 'CTV' AND EXISTS (
      SELECT 1 FROM source_claims s WHERE s.worker_id = wid AND s.accepted = true AND s.ctv_id = hrp_session_user_id()))
    OR (hrp_session_role() = 'WORKER' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = wid AND w.account_user_id = hrp_session_user_id()));
$$;

-- Helper: check write permission theo role
CREATE OR REPLACE FUNCTION hrp_worker_writable(wid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() = 'SALE' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = wid AND w.owner_id = hrp_session_user_id()))
    OR (hrp_session_role() = 'WORKER' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = wid AND w.account_user_id = hrp_session_user_id()));
$$;

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_worker_scope ON workers;
CREATE POLICY hrp_worker_scope ON workers
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_worker_visible_for(id))
  WITH CHECK (hrp_worker_writable(id));

-- ════════════════════════════════════════════════════════════════════════
-- 3. DEPENDENTS — child of worker. Kế thừa scope qua FK worker.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_dependent_scope ON dependents;
CREATE POLICY hrp_dependent_scope ON dependents
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR hrp_worker_visible_for(worker_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );

-- ════════════════════════════════════════════════════════════════════════
-- 4. SOURCE_CLAIMS — Worker ↔ Vendor/CTV. Scope từ worker + riêng VENDOR/CTV.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE source_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_claims FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_source_claim_scope ON source_claims;
CREATE POLICY hrp_source_claim_scope ON source_claims
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
    OR hrp_worker_visible_for(worker_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
  );

-- ════════════════════════════════════════════════════════════════════════
-- 5. PROJECT_ASSIGNMENTS — worker ↔ project. Scope từ worker hoặc project.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_project_assignment_scope ON project_assignments;
CREATE POLICY hrp_project_assignment_scope ON project_assignments
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    -- PM: thấy assignment thuộc dự án mình quản lý (G14: cả ACTIVE + lịch sử)
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = project_assignments.project_id AND p.pm_user_id = hrp_session_user_id()
    ))
    -- Worker thấy assignment của mình
    OR (hrp_session_role() = 'WORKER' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = project_assignments.worker_id
      AND w.account_user_id = hrp_session_user_id()
    ))
    -- HR_STAFF/SALE: qua worker ownership
    OR EXISTS (
      SELECT 1 FROM workers w WHERE w.id = project_assignments.worker_id
      AND (
        (hrp_session_role() = 'HR_STAFF' AND w.assigned_to_id = hrp_session_user_id())
        OR (hrp_session_role() = 'SALE' AND (w.owner_id = hrp_session_user_id() OR w.assigned_to_id = hrp_session_user_id()))
      )
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );

-- ════════════════════════════════════════════════════════════════════════
-- 6. TICKETS — Worker-owned ticket. Scope từ worker (worker's account).
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_ticket_scope ON tickets;
CREATE POLICY hrp_ticket_scope ON tickets
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR hrp_worker_visible_for(worker_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );

-- ════════════════════════════════════════════════════════════════════════
-- 7. TICKET_COMMENTS — child of ticket. Scope từ ticket/worker.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_ticket_comment_scope ON ticket_comments;
CREATE POLICY hrp_ticket_comment_scope ON ticket_comments
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id
      AND hrp_worker_visible_for(t.worker_id)
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );

-- ════════════════════════════════════════════════════════════════════════
-- 8. TICKET_NOTIFICATIONS — child of ticket. Scope từ ticket/worker.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE ticket_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_ticket_notification_scope ON ticket_notifications;
CREATE POLICY hrp_ticket_notification_scope ON ticket_notifications
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_notifications.ticket_id
      AND hrp_worker_visible_for(t.worker_id)
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );

-- ════════════════════════════════════════════════════════════════════════
-- 9. Helper: hrp_worker_visible — alias for application-level check
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hrp_worker_visible(wid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT hrp_worker_visible_for(wid);
$$;