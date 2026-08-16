-- Migration: g0_rq09_uniq_portal_timesheets
-- Purpose: STEP-08 / RQ-09 — chống bơm trùng công.
--   Constraint: UNIQUE (employee_code, project, period_month, period_year)
--   Trước khi apply: STEP-01 (dev) + STEP-07 (production) đã verify 0 dupes.
--   Nếu fail do có dupes tại thời điểm CI/prod, xử lý theo §10 CONTRACT_BCC.md.
ALTER TABLE "portal_timesheets"
ADD CONSTRAINT "uq_portal_timesheets_period"
UNIQUE ("employee_code", "project", "period_month", "period_year");
