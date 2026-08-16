-- Migration: s1_rls_project
-- Purpose: STEP-03 / RQ-02 — Project scope RLS.
--   Tables: outsourcing_projects (root), staffing_orders, sites, contracts.
--   DEC-04: s1_rls_project (outsourcing_projects + tables theo project).
--   data-scope-security §5.3 Project visibility.
--   SECURITY DEFINER helpers để tránh infinite recursion giữa các policy.

-- ════════════════════════════════════════════════════════════════════════
-- 1. OUTSOURCING_PROJECTS — root.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hrp_project_visible_for(pid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE')
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = pid AND p.pm_user_id = hrp_session_user_id()))
    OR (hrp_session_role() = 'WORKER' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = pid
      AND (p.is_public = true OR EXISTS (
        SELECT 1 FROM project_assignments a
        WHERE a.project_id = p.id AND a.status = 'ACTIVE'
        AND EXISTS (SELECT 1 FROM workers w WHERE w.id = a.worker_id AND w.account_user_id = hrp_session_user_id())
      ))
    ))
    OR (hrp_session_role() = 'MKT' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = pid AND p.is_public = true))
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND hrp_session_vendor_id() <> '' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = pid
      AND (p.is_public = true OR EXISTS (
        SELECT 1 FROM candidate_submissions s
        WHERE s.project_id = p.id AND s.vendor_id = hrp_session_vendor_id()
      ))
    ))
    OR (hrp_session_role() = 'CTV' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = pid AND p.is_public = true));
$$;

CREATE OR REPLACE FUNCTION hrp_project_writable(pid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE');
$$;

ALTER TABLE outsourcing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outsourcing_projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_project_scope ON outsourcing_projects;
CREATE POLICY hrp_project_scope ON outsourcing_projects
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_project_visible_for(id))
  WITH CHECK (hrp_project_writable(id));

-- ════════════════════════════════════════════════════════════════════════
-- 2. SITES — child of outsourcing_projects (1:N sites).
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_site_scope ON sites;
CREATE POLICY hrp_site_scope ON sites
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_project_visible_for(project_id))
  WITH CHECK (hrp_project_writable(project_id));

-- ════════════════════════════════════════════════════════════════════════
-- 3. STAFFING_ORDERS — child of outsourcing_projects.
-- ════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staffing_orders') THEN
    ALTER TABLE staffing_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE staffing_orders FORCE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS hrp_staffing_order_scope ON staffing_orders';
    EXECUTE $POL$
      CREATE POLICY hrp_staffing_order_scope ON staffing_orders
        AS PERMISSIVE FOR ALL
        TO app_user_writer, app_user
        USING (hrp_project_visible_for(project_id))
        WITH CHECK (hrp_project_writable(project_id));
    $POL$;
  END IF;
END$$;

-- ════════════════════════════════════════════════════════════════════════
-- 4. CONTRACTS — child of outsourcing_projects.
--    HR/ADMIN only by default; project PM có thể đọc nếu cần.
-- ════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
    ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE contracts FORCE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS hrp_contract_scope ON contracts';
    EXECUTE $POL$
      CREATE POLICY hrp_contract_scope ON contracts
        AS PERMISSIVE FOR ALL
        TO app_user_writer, app_user
        USING (
          hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
          OR (hrp_session_role() = 'PM' AND EXISTS (
            SELECT 1 FROM outsourcing_projects p
            WHERE p.id = contracts.project_id AND p.pm_user_id = hrp_session_user_id()
          ))
        )
        WITH CHECK (
          hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
        );
    $POL$;
  END IF;
END$$;