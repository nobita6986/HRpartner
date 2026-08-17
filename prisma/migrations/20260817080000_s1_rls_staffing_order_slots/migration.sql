-- Migration: s1_rls_staffing_order_slots
-- Purpose: STEP-21 / RQ-21 — staff slot RLS qua project visibility.
--   DEC-15(a): slice 4A chỉ thiếu `staffing_order_slots` — Phase 2 mới phủ root
--   (staffing_orders) nhưng CHƯA có policy cho child table slots.
--   Pattern mirror s1_rls_project §3 (staffing_orders) + s1_rls_vendor §4
--   (vendor_statement_lines — child scope qua parent EXISTS).
--
--   SECURITY DEFINER helpers `hrp_project_visible_for` / `hrp_project_writable`
--   đã có ở Phase 2 (s1_rls_project) — reuse, không viết lại.
--
--   Read (USING) và Write (WITH CHECK) cùng predicate: slot chỉ truy cập
--   khi role có project visible/writable theo `staffing_orders.project_id`.
--   Deny-by-default: role ngoài list → 0 row (không 403).
--
--   add_min_vnd_job: Mirrors LOCKED bất biến Phase 4 (DEC-07); Phase 4 4A
--   chưa khóa slot nên chưa áp dụng.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. STAFFING_ORDER_SLOTS — child of staffing_orders (1:N slots).
--    Scope: existence check qua staffing_orders.project_id → hrp_project_visible_for.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staffing_order_slots') THEN
    ALTER TABLE staffing_order_slots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE staffing_order_slots FORCE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS hrp_staffing_order_slot_scope ON staffing_order_slots';

    EXECUTE $POL$
      CREATE POLICY hrp_staffing_order_slot_scope ON staffing_order_slots
        AS PERMISSIVE FOR ALL
        TO app_user_writer, app_user
        USING (
          EXISTS (
            SELECT 1 FROM staffing_orders so
            WHERE so.id = staffing_order_slots.staffing_order_id
              AND hrp_project_visible_for(so.project_id)
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM staffing_orders so
            WHERE so.id = staffing_order_slots.staffing_order_id
              AND hrp_project_writable(so.project_id)
          )
        );
    $POL$;
  END IF;
END$$;
