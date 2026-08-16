-- Migration: s1_rls_vendor
-- Purpose: STEP-04 / RQ-02 — Vendor scope RLS.
--   Tables: vendors (root), candidate_submissions, vendor_statements,
--           vendor_statement_lines.
--   DEC-04: s1_rls_vendor (vendors, candidate_submissions, vendor_statements + lines).
--   data-scope-security §5.3 Vendor / CandidateSubmission scope.

-- ════════════════════════════════════════════════════════════════════════
-- 1. VENDORS — root.
--    ADMIN/HR_*/SALE/ACCOUNTANT: all. VENDOR_*: chỉ vendor của mình. CTV/MKT/WORKER: deny.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_vendor_scope ON vendors;
CREATE POLICY hrp_vendor_scope ON vendors
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND id = hrp_session_vendor_id())
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
  );

-- ════════════════════════════════════════════════════════════════════════
-- 2. CANDIDATE_SUBMISSIONS — vendor nộp ứng viên cho project.
--    VENDOR_*: chỉ submissions của vendor mình. CTV: chỉ submissions của mình.
--    ADMIN/HR/SALE: all.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE candidate_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_submissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_candidate_submission_scope ON candidate_submissions;
CREATE POLICY hrp_candidate_submission_scope ON candidate_submissions
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
    -- PM: submissions cho project mình quản lý
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = candidate_submissions.project_id AND p.pm_user_id = hrp_session_user_id()
    ))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
  );

-- ════════════════════════════════════════════════════════════════════════
-- 3. VENDOR_STATEMENTS — root cho statement tree.
--    VENDOR_*: chỉ statements của vendor mình. ADMIN/HR/ACCOUNTANT: all.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE vendor_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_statements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_vendor_statement_scope ON vendor_statements;
CREATE POLICY hrp_vendor_statement_scope ON vendor_statements
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
  );

-- ════════════════════════════════════════════════════════════════════════
-- 4. VENDOR_STATEMENT_LINES — child of vendor_statements.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE vendor_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_statement_lines FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_vendor_statement_line_scope ON vendor_statement_lines;
CREATE POLICY hrp_vendor_statement_line_scope ON vendor_statement_lines
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND EXISTS (
      SELECT 1 FROM vendor_statements s
      WHERE s.id = vendor_statement_lines.statement_id AND s.vendor_id = hrp_session_vendor_id()
    ))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND EXISTS (
      SELECT 1 FROM vendor_statements s
      WHERE s.id = vendor_statement_lines.statement_id AND s.vendor_id = hrp_session_vendor_id()
    ))
  );