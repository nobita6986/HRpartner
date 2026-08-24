-- RenameIndex
ALTER INDEX "uq_idempotency_keys_scope" RENAME TO "idempotency_keys_actor_id_route_key_key";

-- RenameIndex
DO $$
BEGIN
  IF to_regclass('public.uq_portal_timesheets_period') IS NOT NULL THEN
    ALTER INDEX "uq_portal_timesheets_period"
      RENAME TO "portal_timesheets_employee_code_project_period_month_period_key";
  END IF;
END
$$;
