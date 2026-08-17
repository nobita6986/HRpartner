-- Migration: s1_rls_attendance_timesheet
-- Purpose: STEP-14 / RQ-21 — RLS 6 bảng slice 4B attendance/timesheet.
--   DEC-15(b): 4B/4C mỗi slice mang migration RLS cho bảng mình dùng.
--   Pattern: deny-by-default + project scope (reuse hrp_project_visible_for).
--
--   6 bảng:
--     1. attendance_import_batches  — root: ADMIN/HR_MANAGER/HR_STAFF
--     2. attendance_import_rows   — child of batch: same scope as batch
--     3. attendance_events         — root: ADMIN/HR_MANAGER/HR_STAFF + PM (via project)
--     4. timesheet_periods         — root: ADMIN/HR_MANAGER/HR_STAFF/PM
--     5. timesheet_lines           — child of period: same scope as period
--     6. timesheet_adjustments     — root: ADMIN/HR_MANAGER/HR_STAFF
--
--   Additive-only: ENABLE + FORCE + CREATE POLICY.
--   Helper functions hrp_project_visible_for / hrp_project_writable
--   đã có từ Phase 2 (s1_rls_project) — reuse.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ATTENDANCE_IMPORT_BATCHES — root.
--    ADMIN/HR_MANAGER/HR_STAFF: all batches.
--    PM: batches gắn project của mình.
--    Khác: deny.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_import_batches') THEN
    ALTER TABLE attendance_import_batches ENABLE ROW LEVEL SECURITY;
    ALTER TABLE attendance_import_batches FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_attendance_import_batch_scope ON attendance_import_batches;

    CREATE POLICY hrp_attendance_import_batch_scope ON attendance_import_batches
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
        -- PM: chỉ thấy batch có gắn project mình quản lý (batch không có project_id → PM không thấy)
        OR (hrp_session_role() = 'PM' AND EXISTS (
          SELECT 1 FROM outsourcing_projects p
          WHERE p.pm_user_id = hrp_session_user_id()
            AND p.project_type IN ('OUTSOURCING', 'HRP_EMPLOYED')
        ))
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ATTENDANCE_IMPORT_ROWS — child of batch.
--    Scope qua parent batch: nếu batch visible thì rows visible.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_import_rows') THEN
    ALTER TABLE attendance_import_rows ENABLE ROW LEVEL SECURITY;
    ALTER TABLE attendance_import_rows FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_attendance_import_row_scope ON attendance_import_rows;

    CREATE POLICY hrp_attendance_import_row_scope ON attendance_import_rows
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        EXISTS (
          SELECT 1 FROM attendance_import_batches b
          WHERE b.id = attendance_import_rows.batch_id
            AND (
              hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
              OR (hrp_session_role() = 'PM' AND EXISTS (
                SELECT 1 FROM outsourcing_projects p
                WHERE p.pm_user_id = hrp_session_user_id()
                  AND p.project_type IN ('OUTSOURCING', 'HRP_EMPLOYED')
              ))
            )
        )
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ATTENDANCE_EVENTS — root.
--    ADMIN/HR_MANAGER/HR_STAFF: all events.
--    PM: events gắn project của mình.
--    WORKER: chỉ events của mình.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_events') THEN
    ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE attendance_events FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_attendance_event_scope ON attendance_events;

    CREATE POLICY hrp_attendance_event_scope ON attendance_events
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        -- ADMIN/HR: all
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
        -- PM: events thuộc project mình quản lý
        OR (hrp_session_role() = 'PM' AND project_id IS NOT NULL AND hrp_project_visible_for(project_id))
        -- WORKER: chỉ events của chính mình
        OR (hrp_session_role() = 'WORKER' AND worker_id = hrp_session_user_id())
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TIMESHEET_PERIODS — root.
--    ADMIN/HR_MANAGER/HR_STAFF/PM: all hoặc theo project.
--    ACCOUNTANT: thấy periods để tạo statement.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_periods') THEN
    ALTER TABLE timesheet_periods ENABLE ROW LEVEL SECURITY;
    ALTER TABLE timesheet_periods FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_timesheet_period_scope ON timesheet_periods;

    CREATE POLICY hrp_timesheet_period_scope ON timesheet_periods
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        -- ADMIN/HR/ACCOUNTANT: all
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'DIRECTOR')
        -- PM: periods gắn project mình quản lý
        OR (hrp_session_role() = 'PM' AND project_id IS NOT NULL AND hrp_project_visible_for(project_id))
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TIMESHEET_LINES — child of period.
--    Scope qua parent period.
-- ═══════════════════════════════════════════════════════════════════════════
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
      );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. TIMESHEET_ADJUSTMENTS — root.
--    ADMIN/HR_MANAGER/HR_STAFF: all adjustments.
--    PM: adjustments của period mình quản lý.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_adjustments') THEN
    ALTER TABLE timesheet_adjustments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE timesheet_adjustments FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hrp_timesheet_adjustment_scope ON timesheet_adjustments;

    CREATE POLICY hrp_timesheet_adjustment_scope ON timesheet_adjustments
      AS PERMISSIVE FOR ALL
      TO app_user_writer, app_user
      USING (
        -- ADMIN/HR: all
        hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
        -- PM: adjustments thuộc period của project mình quản lý
        OR (hrp_session_role() = 'PM' AND EXISTS (
          SELECT 1 FROM timesheet_periods p
          WHERE p.id = timesheet_adjustments.period_id
            AND p.project_id IS NOT NULL
            AND hrp_project_visible_for(p.project_id)
        ))
      );
  END IF;
END$$;
