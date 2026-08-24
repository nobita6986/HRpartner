-- G0-01: normalize the portal-timesheet unique index after the legacy
-- out-of-order rename migration. Safe for both clean and upgraded databases.
DO $$
BEGIN
  IF to_regclass('public.uq_portal_timesheets_period') IS NOT NULL
     AND to_regclass('public.portal_timesheets_employee_code_project_period_month_period_key') IS NULL THEN
    ALTER INDEX "uq_portal_timesheets_period"
      RENAME TO "portal_timesheets_employee_code_project_period_month_period_key";
  END IF;
END
$$;