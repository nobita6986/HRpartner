-- Migration: s1_rls_client_statements
-- Purpose: STEP-14b / RQ-21 -- RLS 2 bang slice 4C client_statements.
--   DEC-15(b): 4C mang migration RLS cho bang minh dung.
--   Pattern: deny-by-default + internal scope.
--
--   2 bang:
--     1. client_statements         -- root: ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT
--     2. client_statement_lines    -- child of statement
--
--   DEC-15(b) ghi chu: "client_statements/lines chi noi bo
--   ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT/SALE (chua co client portal -> chua co client GUC)".
--   vendor_statements + vendor_statement_lines DA CO policy Phase 2 (s1_rls_vendor)
--   -- KHONG viet lai.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CLIENT_STATEMENTS -- root.
--    ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT/SALE: all (noi bo).
--    VENDOR/PM/WORKER: deny (chua co client portal).
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_statements') THEN
    ALTER TABLE client_statements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE client_statements FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_client_statement_scope ON client_statements;

    CREATE POLICY hrp_client_statement_scope ON client_statements
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
      )
      WITH CHECK (
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CLIENT_STATEMENT_LINES -- child of statement.
--    Scope qua parent statement (cung policy internal).
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_statement_lines') THEN
    ALTER TABLE client_statement_lines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE client_statement_lines FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_client_statement_line_scope ON client_statement_lines;

    CREATE POLICY hrp_client_statement_line_scope ON client_statement_lines
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        EXISTS (
          SELECT 1 FROM client_statements s
          WHERE s.id = client_statement_lines.statement_id
            AND hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM client_statements s
          WHERE s.id = client_statement_lines.statement_id
            AND hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
        )
      );
  END IF;
END$$;