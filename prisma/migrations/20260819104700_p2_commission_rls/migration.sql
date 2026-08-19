-- Migration: p2_commission_rls
-- Purpose: AUD-001 fix — RLS cho 3 bảng Commission.
-- Dependencies: cần hrp_session_*() helper functions từ s1_rls_worker.
--   Nếu chưa có trong DB, migration này sẽ tự tạo.
-- Pattern: deny-by-default + internal scope (theo DEC-15b).

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Helper functions — tạo nếu chưa có (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. commission_policies — root-level (no tenant/party filter).
--    READ/WRITE: ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR (internal use).
--    WORKER/CTV/VENDOR/WORKER_MKT: deny all.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_policies') THEN
    ALTER TABLE commission_policies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE commission_policies FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_commission_policy_scope ON commission_policies;

    CREATE POLICY hrp_commission_policy_scope ON commission_policies
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
      )
      WITH CHECK (
        hrp_session_role() IN ('ADMIN', 'DIRECTOR')
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. commission_ledger — row-level theo ctv_id.
--    READ: ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR thấy all; CTV chỉ thấy ctv_id = session user.
--    WRITE: ADMIN/ACCOUNTANT/DIRECTOR (CTV không write).
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_ledger') THEN
    ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;
    ALTER TABLE commission_ledger FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_commission_ledger_scope ON commission_ledger;

    CREATE POLICY hrp_commission_ledger_scope ON commission_ledger
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR')
        OR
        (hrp_session_role() = 'CTV' AND hrp_session_user_id() = ctv_id)
      )
      WITH CHECK (
        hrp_session_role() IN ('ADMIN', 'ACCOUNTANT', 'DIRECTOR')
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. commission_debts — row-level theo ctv_id.
--    READ: ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR thấy all; CTV chỉ thấy nợ của mình.
--    WRITE: ADMIN/ACCOUNTANT/DIRECTOR.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_debts') THEN
    ALTER TABLE commission_debts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE commission_debts FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_commission_debt_scope ON commission_debts;

    CREATE POLICY hrp_commission_debt_scope ON commission_debts
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR')
        OR
        (hrp_session_role() = 'CTV' AND hrp_session_user_id() = ctv_id)
      )
      WITH CHECK (
        hrp_session_role() IN ('ADMIN', 'ACCOUNTANT', 'DIRECTOR')
      );
  END IF;
END$$;
