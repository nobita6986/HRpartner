-- ============================================================================
-- Migration: mobile_device_token_with_rls
-- Task:      hrp-t1a-android-backend-mobile-contract (TASK.md v1.0)
-- Baseline:  51195c3bb3410b49f49531f6cc841a2a2832ada1 (origin/main)
-- Origin:    T0 directive T1A — backend contract cho HRP Android: FCM device token.
--
-- SEMANTIC (T0 directive §scope 1):
--   - Bảng mới `mobile_device_tokens` — ADDITIVE ONLY, KHÔNG đổi bảng hiện có.
--   - Unique (user_id, fcm_token) — idempotent re-register từ
--     POST /api/push/register-device; userId suy ra từ AuthContext (server).
--   - FK users(id) ON DELETE CASCADE theo yêu cầu T0 (xóa User => token dọn).
--     Phạm vi CASCADE CHỈ bảng này — không đụng delete posture bảng khác
--     (t1b_pre_p2_worker_delete_rls giữ nguyên).
--   - FORCE ROW LEVEL SECURITY; policy chỉ cho CHỦ SỠ HỮU token (user_id =
--     app.user_id) hoặc role hệ thống theo pattern hiện hành
--     {ADMIN, HR_MANAGER, DIRECTOR}. WORKER chỉ đọc/ghi token CỦA MÌNH qua GUC
--     self (withDbContext app.user_id = verified sub — không app-driven).
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- (1) FORWARD-ONLY: exactly one new migration; never edits prior migrations.
-- (2) IDEMPOTENT: CREATE TABLE IF NOT EXISTS + guard constraint/index/DO-block
--     guards xanh cả khi đã áp (clean install hoặc legacy state).
-- (3) FORCE RLS idempotent re-assert (pattern 20261008000000_t1b_pre_p2...).
-- (4) Final assertion: introspection pg_class/pg_attribute/pg_policy + conctime
--     xac nhan: bảng có unique constraint + FK cascade + FORCE RLS + policy
--     đúng. FAIL => RAISE EXCEPTION để rollback transaction.
--
-- NOT APPLIED TO PRODUCTION
--   Ship-only. T0/operator preflight + apply qua gate riêng (psql). KHÔNG chạy
--   lệnh print, KHÔNG seed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — CREATE TABLE idempotent (Prisma-matching DDL, TEXT id kiểu init).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mobile_device_tokens'
  ) THEN
    CREATE TABLE mobile_device_tokens (
      id           TEXT NOT NULL PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      fcm_token    TEXT NOT NULL,
      device_type  TEXT NOT NULL DEFAULT 'ANDROID',
      model        TEXT,
      created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — Constraint idempotent: unique (user_id, fcm_token) + index user.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'mobile_device_tokens'
      AND c.conname = 'mobile_device_tokens_user_id_fcm_token_key'
      AND c.contype = 'u'
  ) THEN
    ALTER TABLE mobile_device_tokens
      ADD CONSTRAINT mobile_device_tokens_user_id_fcm_token_key UNIQUE (user_id, fcm_token);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'mobile_device_tokens'
      AND indexname = 'mobile_device_tokens_user_id_idx'
  ) THEN
    CREATE INDEX mobile_device_tokens_user_id_idx ON mobile_device_tokens(user_id);
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 3 — Re-assert GUC helper idempotent (CREATE OR REPLACE, cùng pattern
-- s1_rls_worker). An toàn khi chạy lại; không đổi semantic helper hiện hành.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hrp_session_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION hrp_session_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.role', true), '')
$$;

-- ---------------------------------------------------------------------------
-- SECTION 4 — ENABLE + FORCE RLS idempotent re-assert (covers clean install
-- và DB legacy). Pattern 20261008000000_t1b_pre_p2_worker_delete_rls Section 1.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF (
    SELECT c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'mobile_device_tokens'
  ) IS DISTINCT FROM true THEN
    ALTER TABLE mobile_device_tokens ENABLE ROW LEVEL SECURITY;
  END IF;

  IF (
    SELECT c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'mobile_device_tokens'
  ) IS DISTINCT FROM true THEN
    ALTER TABLE mobile_device_tokens FORCE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 5 — Policy idempotent: DROP legacy + CREATE tường minh. Scope:
--   USING / WITH CHECK =
--     role hệ thống pattern hiện hành {ADMIN, HR_MANAGER, DIRECTOR}
--     OR user_id = hrp_session_user_id() (chủ sở hữu token — GUC self).
--
--  * TO app_user_writer, app_user: 2 role runtime của repo (pattern s1_rls_*).
--  * FORCE RLS => table owner cũng bị policy này trói; ghi hệ thống chỉ qua
--    GUC đúng pattern (withDbContext/withSystemDb đang dùng).
--  * Không SECURITY DEFINER cần thiết: predicate không tham chiếu bảng khác
--    => không recursion. GUC-null (guc='' => NULLIF ... IS NULL) => predicate
--    NULL => deny-by-default fail-closed.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Drop legacy/manual policy cùng mục đích để CREATE idempotent + convergent.
  DROP POLICY IF EXISTS hrp_mobile_device_token_scope ON mobile_device_tokens;

  CREATE POLICY hrp_mobile_device_token_scope ON mobile_device_tokens
    AS PERMISSIVE FOR ALL
    TO app_user_writer, app_user
    USING (
      hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
      OR (hrp_session_user_id() IS NOT NULL AND user_id = hrp_session_user_id())
    )
    WITH CHECK (
      hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
      OR (hrp_session_user_id() IS NOT NULL AND user_id = hrp_session_user_id())
    );
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 6 — timesheet_lines: policy bổ sung nhánh READ-ONLY WORKER (T1A
-- TASK DEC-06 / RQ-06). Canonical cũ là m14 (20260830214139 RLS matrix repair,
-- policy: USING = period-scope qua {ADMIN,HR_MANAGER,HR_STAFF,...}/PM).
-- Mới: giữ nguyên thành phần cũ + OR (role WORKER AND worker_id IS NOT NULL AND
-- hrp_worker_visible_for(worker_id)) => WORKER chỉ đọc line của CHÍNH MÌNH.
-- WITH CHECK GIỮ NGUYÊN (admin/PM — WORKER KHÔNG ghi được line).
-- Idempotent: DROP legacy/m14 + CREATE đúng semantics mới.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_lines') THEN
    ALTER TABLE timesheet_lines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE timesheet_lines FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_timesheet_line_scope ON timesheet_lines;

    CREATE POLICY hrp_timesheet_line_scope ON timesheet_lines
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        EXISTS (
          SELECT 1 FROM timesheet_periods p
          WHERE p.id = timesheet_lines.period_id
            AND (
              hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'DIRECTOR')
              OR (hrp_session_role() = 'PM' AND p.project_id IS NOT NULL AND hrp_project_visible_for(p.project_id))
            )
        )
        -- T1A: WORKER read-only self (L1 builder buildTimesheetLineScope mirrors).
        OR (hrp_session_role() = 'WORKER'
            AND timesheet_lines.worker_id IS NOT NULL
            AND hrp_worker_visible_for(timesheet_lines.worker_id))
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM timesheet_periods p
          WHERE p.id = timesheet_lines.period_id
            AND (
              hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
              OR (hrp_session_role() = 'PM' AND p.project_id IS NOT NULL AND hrp_project_visible_for(p.project_id))
            )
        )
      );
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- SECTION 7 — Final assertion (pattern t1b_pre_p2): introspection xac nhan
-- trang thai mong muon; fail => RAISE EXCEPTION => rollback migration.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table        int := 0;
  v_unique_key   int := 0;
  v_fk_cascade   int := 0;
  v_force        bool := false;
  v_ts_policy    int := 0;
  v_policy       int := 0;
BEGIN
  SELECT count(*) INTO v_table
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mobile_device_tokens';
  IF v_table <> 1 THEN
    RAISE EXCEPTION 'mobile_device_token_with_rls assertion failed: table public.mobile_device_tokens missing (count=%). Migration rolled back.', v_table;
  END IF;

  SELECT count(*) INTO v_unique_key
    FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'mobile_device_tokens'
      AND c.conname = 'mobile_device_tokens_user_id_fcm_token_key'
      AND c.contype = 'u';
  IF v_unique_key <> 1 THEN
    RAISE EXCEPTION 'mobile_device_token_with_rls assertion failed: unique (user_id, fcm_token) missing (count=%). Migration rolled back.', v_unique_key;
  END IF;

  SELECT count(*) INTO v_fk_cascade
    FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'mobile_device_tokens'
      AND c.contype = 'f'
      AND c.confrelid = 'users'::regclass
      AND ('(' || pg_get_constraintdef(c.oid, true) || ')') LIKE '%ON DELETE CASCADE%';
  IF v_fk_cascade <> 1 THEN
    RAISE EXCEPTION 'mobile_device_token_with_rls assertion failed: FK referencing public.users with ON DELETE CASCADE missing (count=%). Migration rolled back.', v_fk_cascade;
  END IF;

  SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
    FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'mobile_device_tokens';
  IF v_force IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'mobile_device_token_with_rls assertion failed: mobile_device_tokens must have ENABLE + FORCE ROW LEVEL SECURITY. Migration rolled back.';
  END IF;

  SELECT count(*) INTO v_policy
    FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'mobile_device_tokens'
      AND p.polname = 'hrp_mobile_device_token_scope';
  IF v_policy <> 1 THEN
    RAISE EXCEPTION 'mobile_device_token_with_rls assertion failed: hrp_mobile_device_token_scope policy missing or duplicated (count=%). Migration rolled back.', v_policy;
  END IF;

  -- T1A DEC-06: timesheet_lines policy phải chứa nhánh WORKER
  -- (hrp_worker_visible_for) ở USING (polqual) khi bảng tồn tại.
  SELECT count(*) INTO v_ts_policy
    FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'timesheet_lines'
      AND p.polname = 'hrp_timesheet_line_scope'
      AND p.polqual::text LIKE '%hrp_worker_visible_for%';
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_lines')
     AND v_ts_policy <> 1 THEN
    RAISE EXCEPTION 'mobile_device_token_with_rls assertion failed: timesheet_lines policy must include WORKER self-read branch (hrp_worker_visible_for in USING). Migration rolled back.', v_ts_policy;
  END IF;
END
$$;
