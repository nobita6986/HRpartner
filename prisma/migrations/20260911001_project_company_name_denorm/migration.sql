-- Migration: project_company_name_denorm
-- Y10.4/UI04g: denormalize client_company_name into outsourcing_projects
-- so MKT role (no RLS on client_companies) can render company name on cards.
ALTER TABLE outsourcing_projects ADD COLUMN IF NOT EXISTS client_company_name TEXT;

-- Backfill existing rows
UPDATE outsourcing_projects p
SET client_company_name = cc.name
FROM client_companies cc
WHERE p.client_company_id = cc.id AND p.client_company_name IS NULL;
