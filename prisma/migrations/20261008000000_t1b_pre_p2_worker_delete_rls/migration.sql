-- ============================================================================
-- Migration: t1b_pre_p2_worker_delete_rls
-- Task:      hrp-t1b-pre-p2-worker-delete-rls-hotfix (TASK.md v1.0)
-- Baseline:  7f5704123cbe0ae52c897b38c8afdd3f14358c78 (origin/main post-#115)
-- Origin:    T0 directive T1B Pre-P2 worker delete RLS hotfix (forward-only).
--
-- ROOT CAUSE (T0 verified on VPS log + production DB introspection):
--   - Production DELETE /api/workers/[id] by ADMIN on a 'orphan' Worker trả
--     PrismaClientKnownRequestError P2025 + console.error (route catch-all
--     500 message tieng Viet tu PR #115).
--   - SELECT qua policy `hrp_worker_scope` (PERMISSIVE FOR ALL USING
--     hrp_worker_visible_for(id)) van thay row.
--   - DELETE bi policy `hrp_workers_no_delete` (RESTRICTIVE FOR DELETE USING
--     false) chan tuyet doi, te su.
--   - Prisma thay (2) => 0 row affected => P2025 => 500.
--   - Policy `hrp_workers_no_delete` duoc tao o migration
--     `20260827160000_m1_07b_rls_runtime_posture_closure` Section 3 (loop
--     29 tables), re-asserted moi lan deploy chay lai migration chain.
--
-- SEMANTIC BAC BUOC (T0 directive §2):
--   - ADMIN + row visible qua policy permissive hien huu => duoc DELETE.
--   - HR_MANAGER / DIRECTOR / moi role khac => KHONG duoc DELETE o RLS.
--   - Giu ENABLE ROW LEVEL SECURITY va FORCE ROW LEVEL SECURITY.
--   - KHONG dung BYPASSRLS, withSystemDb, admin DB URL hoac raw connection
--     de ne RLS.
--   - KHONG mo DELETE cho HR_MANAGER/DIRECTOR vi hrp_worker_scope cho ho doc.
--   - KHONG sua du lieu production thu cong.
--   - KHONG cascade hoac set-null them.
--   - KHONG thay doi dependency sweep 15 bang, advisory lock, audit reason,
--     audit log, outbox hay ADMIN-only route guard.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- (1) FORWARD-ONLY: exactly one new migration; never edits prior migrations.
-- (2) CONVERGENT: clean install + legacy DB (seed hrp_workers_no_delete
--     USING false thu cong) => cung trang thai cuoi.
-- (3) DROP + CREATE ROWN: thay policy chan xoa tuyet doi bang RESTRICTIVE
--     DELETE cho phep ADMIN. Predicates doc voi nghin (AS RESTRICTIVE
--     FOR DELETE TO app_user_writer, app_user USING hrp_session_role() = 'ADMIN').
-- (4) KHONG thay policy `hrp_worker_scope` (PERMISSIVE FOR ALL USING
--     hrp_worker_visible_for(id) WITH CHECK hrp_worker_writable(id)) —
--     SELECT/INSERT/UPDATE scope giu nguyen.
-- (5) Idempotent FORCE: ALTER TABLE workers ENABLE/FORCE ROW LEVEL SECURITY
--     duoc re-assert (no-op if already enabled/forced).
-- (6) Final assertion: pg_policy introspection xac nhan:
--     - hrp_workers_no_delete KHONG con tren public.workers.
--     - hrp_workers_delete_admin ton tai RESTRICTIVE FOR DELETE.
--     - workers table FORCE RLS.
--     Assertion fail => RAISE EXCEPTION de rollback migration.
--
-- SCOPE (minimal — T0 §2 + §3):
--   - Touched object: exactly one new migration. No existing table altered.
--   - No DELETE; chi DROP + CREATE policy.
--   - No schema change (prisma/schema.prisma KHONG bi sua).
--   - No GRANT thay doi (app_user_writer/app_user giu nguyen).
--
-- IDEMPOTENT
--   - DROP POLICY IF EXISTS xanh ca khi chua ton tai.
--   - CREATE POLICY trong DO block guard EXISTS condition.
--   - ASSERTION trong DO block RAISE EXCEPTION neu thieu.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief. Migration file ships only. T0 chay production preflight
--   va apply qua mot gate rieng.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — ENABLE + FORCE ROW LEVEL SECURITY idempotent guard.
-- Re-assert tren public.workers (covers clean install va DB co legacy state).
-- No-op neu da enable/forced (PG documentation).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'workers'
       AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'workers'
       AND c.relforcerowsecurity = true
  ) THEN
    ALTER TABLE workers FORCE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — DROP legacy / idempotent guard.
-- Convergent: xanh ca khi policy chua ton tai (DROP IF EXISTS).
-- hrp_workers_delete_admin (legacy neu DBA da dat tay) cung drop de CREATE
-- recreate co semantic moi nhat.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS hrp_workers_no_delete ON workers;
DROP POLICY IF EXISTS hrp_workers_delete_admin ON workers;

-- ---------------------------------------------------------------------------
-- SECTION 3 — CREATE restrictive DELETE policy.
-- AS RESTRICTIVE: AND-combines voi PERMISSIVE `hrp_worker_scope` (select
--   van di qua, nhung DELETE them bi chan).
-- FOR DELETE: chi apply cho DELETE command, KHONG anh huong SELECT/INSERT/UPDATE.
-- TO app_user_writer, app_user: 2 roles runtime writer va read-only.
-- USING (hrp_session_role() = 'ADMIN'): chi ADMIN moi DELETE fiet co row
--   visible qua hrp_worker_scope.
-- Predicate la PURE function call (giến STABLE SECURITY INVOKER — chay nhu
--   CALLER, khong can BYPASSRLS). hrp_session_role() da co o migration
--   `20260816210000_s1_rls_worker/migration.sql` line 33 (idempotent CREATE
--   OR REPLACE).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'workers'
       AND p.polname = 'hrp_workers_delete_admin'
  ) THEN
    CREATE POLICY hrp_workers_delete_admin ON workers
      AS RESTRICTIVE FOR DELETE
      TO app_user_writer, app_user
      USING (hrp_session_role() = 'ADMIN');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 4 — Final assertion: pg_policy introspection xac nhan trang thai
-- mong muon. Assertion fail => RAISE EXCEPTION de rollback toan bo transaction.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_legacy_count int := 0;
  v_new_count    int := 0;
  v_force        bool := false;
BEGIN
  -- (a) hrp_workers_no_delete KHONG con tren public.workers.
  SELECT count(*) INTO v_legacy_count
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'workers'
     AND p.polname = 'hrp_workers_no_delete';
  IF v_legacy_count <> 0 THEN
    RAISE EXCEPTION 't1b-pre-p2-worker-delete-rls assertion failed: hrp_workers_no_delete policy still present on public.workers (count=%). Migration rolled back.', v_legacy_count;
  END IF;

  -- (b) hrp_workers_delete_admin ton tai RESTRICTIVE FOR DELETE.
  SELECT count(*) INTO v_new_count
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'workers'
     AND p.polname = 'hrp_workers_delete_admin'
     AND p.permissive = false
     AND p.cmd = 'd';
  IF v_new_count <> 1 THEN
    RAISE EXCEPTION 't1b-pre-p2-worker-delete-rls assertion failed: hrp_workers_delete_admin must be exactly one RESTRICTIVE DELETE policy on public.workers (count=%). Migration rolled back.', v_new_count;
  END IF;

  -- (c) workers FORCE RLS.
  SELECT c.relforcerowsecurity INTO v_force
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'workers';
  IF v_force IS DISTINCT FROM true THEN
    RAISE EXCEPTION 't1b-pre-p2-worker-delete-rls assertion failed: workers table must have FORCE ROW LEVEL SECURITY. Migration rolled back.';
  END IF;
END
$$;