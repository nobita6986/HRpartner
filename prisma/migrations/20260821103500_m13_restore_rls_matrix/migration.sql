-- M13 round 2: restore RLS matrix after drifted database state.
CREATE OR REPLACE FUNCTION hrp_session_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;
CREATE OR REPLACE FUNCTION hrp_session_role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.role', true), '') $$;
CREATE OR REPLACE FUNCTION hrp_session_vendor_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.vendor_id', true), '') $$;
CREATE OR REPLACE FUNCTION hrp_session_worker_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.worker_id', true), '') $$;
CREATE OR REPLACE FUNCTION hrp_project_visible_for(pid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
 SELECT hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE')
 OR (hrp_session_role()='PM' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND (p.pm_user_id=hrp_session_user_id() OR p.sub_pm_user_id_1=hrp_session_user_id() OR p.sub_pm_user_id_2=hrp_session_user_id())))
 OR (hrp_session_role()='WORKER' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND (p.is_public OR EXISTS (SELECT 1 FROM project_assignments a JOIN workers w ON w.id=a.worker_id WHERE a.project_id=p.id AND a.status='ACTIVE' AND w.account_user_id=hrp_session_user_id()))))
 OR (hrp_session_role()='MKT' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND p.is_public))
 OR (hrp_session_role() IN ('VENDOR_ADMIN','VENDOR_STAFF') AND hrp_session_vendor_id()<>'' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND (p.is_public OR EXISTS (SELECT 1 FROM candidate_submissions s WHERE s.project_id=p.id AND s.vendor_id=hrp_session_vendor_id()))))
 OR (hrp_session_role()='CTV' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND p.is_public));
$$;
CREATE OR REPLACE FUNCTION hrp_project_writable(pid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE') $$;
CREATE OR REPLACE FUNCTION hrp_worker_visible_for(wid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
 SELECT hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR')
 OR (hrp_session_role()='HR_STAFF' AND EXISTS (SELECT 1 FROM workers w WHERE w.id=wid AND w.assigned_to_id=hrp_session_user_id()))
 OR (hrp_session_role()='SALE' AND EXISTS (SELECT 1 FROM workers w WHERE w.id=wid AND (w.owner_id=hrp_session_user_id() OR w.assigned_to_id=hrp_session_user_id())))
 OR (hrp_session_role()='PM' AND EXISTS (SELECT 1 FROM project_assignments a JOIN outsourcing_projects p ON p.id=a.project_id WHERE a.worker_id=wid AND a.status='ACTIVE' AND (p.pm_user_id=hrp_session_user_id() OR p.sub_pm_user_id_1=hrp_session_user_id() OR p.sub_pm_user_id_2=hrp_session_user_id())))
 OR (hrp_session_role() IN ('VENDOR_ADMIN','VENDOR_STAFF') AND EXISTS (SELECT 1 FROM source_claims s WHERE s.worker_id=wid AND s.accepted AND s.vendor_id=hrp_session_vendor_id()))
 OR (hrp_session_role()='CTV' AND EXISTS (SELECT 1 FROM source_claims s WHERE s.worker_id=wid AND s.accepted AND s.ctv_id=hrp_session_user_id()))
 OR (hrp_session_role()='WORKER' AND EXISTS (SELECT 1 FROM workers w WHERE w.id=wid AND w.account_user_id=hrp_session_user_id()));
$$;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='workers') THEN
  ALTER TABLE workers ENABLE ROW LEVEL SECURITY; ALTER TABLE workers FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_worker_scope ON workers;
  CREATE POLICY hrp_worker_scope ON workers AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_worker_visible_for(id)) WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR') OR (hrp_session_role()='SALE' AND owner_id=hrp_session_user_id()) OR (hrp_session_role()='WORKER' AND account_user_id=hrp_session_user_id()));
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='outsourcing_projects') THEN
  ALTER TABLE outsourcing_projects ENABLE ROW LEVEL SECURITY; ALTER TABLE outsourcing_projects FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_project_scope ON outsourcing_projects;
  CREATE POLICY hrp_project_scope ON outsourcing_projects AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_project_visible_for(id)) WITH CHECK (hrp_project_writable(id));
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='staffing_orders') THEN
  ALTER TABLE staffing_orders ENABLE ROW LEVEL SECURITY; ALTER TABLE staffing_orders FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_staffing_order_scope ON staffing_orders;
  CREATE POLICY hrp_staffing_order_scope ON staffing_orders AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_project_visible_for(project_id)) WITH CHECK (hrp_project_writable(project_id));
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vendors') THEN
  ALTER TABLE vendors ENABLE ROW LEVEL SECURITY; ALTER TABLE vendors FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_vendor_scope ON vendors;
  CREATE POLICY hrp_vendor_scope ON vendors AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT','SALE') OR (hrp_session_role() IN ('VENDOR_ADMIN','VENDOR_STAFF') AND id=hrp_session_vendor_id())) WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT','SALE'));
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vendor_statements') THEN
  ALTER TABLE vendor_statements ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor_statements FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_vendor_statement_scope ON vendor_statements;
  CREATE POLICY hrp_vendor_statement_scope ON vendor_statements AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT') OR (hrp_session_role() IN ('VENDOR_ADMIN','VENDOR_STAFF') AND vendor_id=hrp_session_vendor_id())) WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT') OR (hrp_session_role() IN ('VENDOR_ADMIN','VENDOR_STAFF') AND vendor_id=hrp_session_vendor_id()));
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='attendance_events') THEN
  ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY; ALTER TABLE attendance_events FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_attendance_event_scope ON attendance_events;
  CREATE POLICY hrp_attendance_event_scope ON attendance_events AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF') OR (hrp_session_role()='PM' AND project_id IS NOT NULL AND hrp_project_visible_for(project_id)) OR (hrp_session_role()='WORKER' AND worker_id IS NOT NULL AND hrp_worker_visible_for(worker_id))) WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF'));
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='timesheet_periods') THEN
  ALTER TABLE timesheet_periods ENABLE ROW LEVEL SECURITY; ALTER TABLE timesheet_periods FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_timesheet_period_scope ON timesheet_periods;
  CREATE POLICY hrp_timesheet_period_scope ON timesheet_periods AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTANT','DIRECTOR') OR (hrp_session_role()='PM' AND project_id IS NOT NULL AND hrp_project_visible_for(project_id))) WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF') OR (hrp_session_role()='PM' AND project_id IS NOT NULL AND hrp_project_visible_for(project_id)));
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='client_statements') THEN
  ALTER TABLE client_statements ENABLE ROW LEVEL SECURITY; ALTER TABLE client_statements FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS hrp_client_statement_scope ON client_statements;
  CREATE POLICY hrp_client_statement_scope ON client_statements AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT','SALE')) WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT','SALE'));
 END IF;
END $$;
