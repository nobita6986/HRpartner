-- ============================================================================
-- M1-07b — RLS runtime-posture closure for the 29 NON-Ticket canonical tables.
--
-- Task: docs/tasks/hrp-v5-m1-07b-rls-runtime-posture-closure/TASK.md (v1.0).
-- Baseline: ca5382bc8354d916a2a08b337c886309cad476bf. Branch point: b0d54fc.
--
-- WHAT THIS MIGRATION DOES (RQ-01..RQ-10, DEC-02..DEC-09):
--   Section 1 — Re-assert ENABLE + FORCE ROW LEVEL SECURITY on ALL 29 in-scope
--               tables. EV-04 observed only 23 forced (grep found 24); re-asserting
--               on all 29 is idempotent and makes AC-02 deterministic regardless of
--               which historical migration set the flag (RQ-02, DEC-02, STEP-01).
--   Section 2 — Command-aware PERMISSIVE policies for the 5 previously-uncovered
--               "gap" tables (worker_deductions, client_companies, client_rate_cards,
--               vendor_rate_cards, ctv_withdrawal_requests). Matrices are grounded in
--               the §4.3 permission/data scope table AND the concrete route/service
--               evidence surveyed for STEP-03/04 (RQ-05, RQ-06, RQ-07, DEC-08, DEC-09).
--   Section 3 — Uniform RESTRICTIVE FOR DELETE USING(false) delete-deny backstop on
--               ALL 29 tables. Runtime survey (STEP-05) found ZERO physical DELETE
--               paths on any of the 29 models, so a uniform deny regresses nothing and
--               needs no DEC-07 exception (RQ-08, DEC-07).
--
-- SCOPE GUARDRAILS:
--   * Ticket family (tickets/ticket_history/ticket_comments/ticket_notifications) is
--     OWNED by M1-07a and is NOT touched here (regression-only per TASK §4.2).
--   * No NEW SECURITY DEFINER function is introduced: every gap-table predicate is an
--     inline check over the existing LANGUAGE-sql STABLE GUC readers
--     (hrp_session_role / hrp_session_user_id / hrp_session_worker_id), which run as
--     the CALLER and touch no tables — so RISK-09 (definer search_path escalation)
--     has no new surface. The pre-existing m13 visibility helpers
--     (hrp_project_visible_for / hrp_worker_visible_for / hrp_project_writable) are
--     SECURITY DEFINER WITHOUT a pinned search_path; that pre-existing posture gap is
--     reported in HANDOFF as an observation, NOT altered here (avoids re-writing
--     accepted M13 objects with repo-wide blast radius).
--   * Every statement is idempotent (ENABLE/FORCE are no-ops when already set;
--     policies use DROP POLICY IF EXISTS before CREATE) so the upgrade drill over the
--     raw-applied M1-07a DB and a clean install both converge (DEC-03, DEC-12).
--   * All policies target TO app_user_writer, app_user — matching the accepted
--     m13 / p2 / s1 idiom. The owner/admin role is exercised for fixtures &
--     introspection only (rule 7) and is expected to hold BYPASSRLS on the test DB.
-- ============================================================================

-- --------------------------------------------------------------------------
-- SECTION 1 — ENABLE + FORCE ROW LEVEL SECURITY on all 29 in-scope tables.
-- --------------------------------------------------------------------------

-- Worker / referral family
ALTER TABLE workers                    ENABLE ROW LEVEL SECURITY; ALTER TABLE workers                    FORCE ROW LEVEL SECURITY;
ALTER TABLE dependents                 ENABLE ROW LEVEL SECURITY; ALTER TABLE dependents                 FORCE ROW LEVEL SECURITY;
ALTER TABLE source_claims              ENABLE ROW LEVEL SECURITY; ALTER TABLE source_claims              FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_deductions          ENABLE ROW LEVEL SECURITY; ALTER TABLE worker_deductions          FORCE ROW LEVEL SECURITY;

-- Project / client family
ALTER TABLE outsourcing_projects       ENABLE ROW LEVEL SECURITY; ALTER TABLE outsourcing_projects       FORCE ROW LEVEL SECURITY;
ALTER TABLE sites                      ENABLE ROW LEVEL SECURITY; ALTER TABLE sites                      FORCE ROW LEVEL SECURITY;
ALTER TABLE contracts                  ENABLE ROW LEVEL SECURITY; ALTER TABLE contracts                  FORCE ROW LEVEL SECURITY;
ALTER TABLE client_companies           ENABLE ROW LEVEL SECURITY; ALTER TABLE client_companies           FORCE ROW LEVEL SECURITY;
ALTER TABLE client_rate_cards          ENABLE ROW LEVEL SECURITY; ALTER TABLE client_rate_cards          FORCE ROW LEVEL SECURITY;

-- Vendor / submission family
ALTER TABLE vendors                    ENABLE ROW LEVEL SECURITY; ALTER TABLE vendors                    FORCE ROW LEVEL SECURITY;
ALTER TABLE candidate_submissions      ENABLE ROW LEVEL SECURITY; ALTER TABLE candidate_submissions      FORCE ROW LEVEL SECURITY;
ALTER TABLE vendor_rate_cards          ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor_rate_cards          FORCE ROW LEVEL SECURITY;

-- Staffing family
ALTER TABLE staffing_orders            ENABLE ROW LEVEL SECURITY; ALTER TABLE staffing_orders            FORCE ROW LEVEL SECURITY;
ALTER TABLE staffing_order_slots       ENABLE ROW LEVEL SECURITY; ALTER TABLE staffing_order_slots       FORCE ROW LEVEL SECURITY;
ALTER TABLE project_assignments        ENABLE ROW LEVEL SECURITY; ALTER TABLE project_assignments        FORCE ROW LEVEL SECURITY;

-- Attendance family
ALTER TABLE attendance_import_batches  ENABLE ROW LEVEL SECURITY; ALTER TABLE attendance_import_batches  FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_import_rows     ENABLE ROW LEVEL SECURITY; ALTER TABLE attendance_import_rows     FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_events          ENABLE ROW LEVEL SECURITY; ALTER TABLE attendance_events          FORCE ROW LEVEL SECURITY;

-- Timesheet family
ALTER TABLE timesheet_periods          ENABLE ROW LEVEL SECURITY; ALTER TABLE timesheet_periods          FORCE ROW LEVEL SECURITY;
ALTER TABLE timesheet_lines            ENABLE ROW LEVEL SECURITY; ALTER TABLE timesheet_lines            FORCE ROW LEVEL SECURITY;
ALTER TABLE timesheet_adjustments      ENABLE ROW LEVEL SECURITY; ALTER TABLE timesheet_adjustments      FORCE ROW LEVEL SECURITY;

-- Statements family
ALTER TABLE vendor_statements          ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor_statements          FORCE ROW LEVEL SECURITY;
ALTER TABLE vendor_statement_lines     ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor_statement_lines     FORCE ROW LEVEL SECURITY;
ALTER TABLE client_statements          ENABLE ROW LEVEL SECURITY; ALTER TABLE client_statements          FORCE ROW LEVEL SECURITY;
ALTER TABLE client_statement_lines     ENABLE ROW LEVEL SECURITY; ALTER TABLE client_statement_lines     FORCE ROW LEVEL SECURITY;

-- Commission family
ALTER TABLE commission_policies        ENABLE ROW LEVEL SECURITY; ALTER TABLE commission_policies        FORCE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger          ENABLE ROW LEVEL SECURITY; ALTER TABLE commission_ledger          FORCE ROW LEVEL SECURITY;
ALTER TABLE commission_debts           ENABLE ROW LEVEL SECURITY; ALTER TABLE commission_debts           FORCE ROW LEVEL SECURITY;
ALTER TABLE ctv_withdrawal_requests    ENABLE ROW LEVEL SECURITY; ALTER TABLE ctv_withdrawal_requests    FORCE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- SECTION 2 — Command-aware PERMISSIVE policies for the 5 gap tables.
--
-- Predicate legend (all read transaction-local GUCs, never the JWT claim):
--   hrp_session_role()       = current_setting('app.role')       (verified in auth-context)
--   hrp_session_user_id()    = current_setting('app.user_id')    (verified sub)
--   hrp_session_worker_id()  = current_setting('app.worker_id')  (WORKER self bootstrap)
-- --------------------------------------------------------------------------

-- 2.1 worker_deductions — payroll-sensitive child of Worker.
--   §4.3: HR_STAFF has NO automatic finance; deductions are NOT broad-read (RQ-07);
--   CTV/VENDOR get no Worker PII (DEC-09). Read = payroll/HR-manager oversight OR the
--   WORKER's own rows (§4.2 "self"); write = ADMIN/HR_MANAGER/ACCOUNTANT (payroll ops).
--   No runtime read/write path exists yet (STEP-04 survey); policy encodes the §4.3
--   intended posture so the row/command backstop is correct the moment a route lands.
DROP POLICY IF EXISTS hrp_worker_deduction_select    ON worker_deductions;
DROP POLICY IF EXISTS hrp_worker_deduction_insert    ON worker_deductions;
DROP POLICY IF EXISTS hrp_worker_deduction_update    ON worker_deductions;
CREATE POLICY hrp_worker_deduction_select ON worker_deductions
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT')
    OR (hrp_session_role() = 'WORKER' AND worker_id = hrp_session_worker_id())
  );
CREATE POLICY hrp_worker_deduction_insert ON worker_deductions
  AS PERMISSIVE FOR INSERT TO app_user_writer, app_user
  WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','ACCOUNTANT'));
CREATE POLICY hrp_worker_deduction_update ON worker_deductions
  AS PERMISSIVE FOR UPDATE TO app_user_writer, app_user
  USING      (hrp_session_role() IN ('ADMIN','HR_MANAGER','ACCOUNTANT'))
  WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','ACCOUNTANT'));

-- 2.2 client_companies — client master data.
--   Read union of the two real routes: GET /api/clients (ADMIN,HR_MANAGER,DIRECTOR) +
--   the clientCompany join on GET /api/projects (adds HR_STAFF,PM,ACCOUNTANT) — an
--   over-tight SELECT would NULL the client on the projects list. SALE is added to match
--   the accepted client_statements sibling and §4.3 SALE "project/client scope".
--   Write = ADMIN/HR_MANAGER/DIRECTOR (POST /api/clients, PUT /api/clients/[id]).
--   Not a rates/margin/deduction table, so a 7-role read is not a broad-read violation.
DROP POLICY IF EXISTS hrp_client_company_select ON client_companies;
DROP POLICY IF EXISTS hrp_client_company_insert ON client_companies;
DROP POLICY IF EXISTS hrp_client_company_update ON client_companies;
CREATE POLICY hrp_client_company_select ON client_companies
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT','SALE','HR_STAFF','PM'));
CREATE POLICY hrp_client_company_insert ON client_companies
  AS PERMISSIVE FOR INSERT TO app_user_writer, app_user
  WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR'));
CREATE POLICY hrp_client_company_update ON client_companies
  AS PERMISSIVE FOR UPDATE TO app_user_writer, app_user
  USING      (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR'))
  WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR'));

-- 2.3 client_rate_cards — client-side finance rates (RQ-07: rates NOT broad-read).
--   Sole runtime reader is statement.service.ts resolveRate (raw SQL, L2-only) reached
--   by POST /api/statements/generate (ADMIN,HR_MANAGER,ACCOUNTANT,DIRECTOR). No runtime
--   write path — seeds run as the owner/bypass role, so writes stay denied under FORCE.
--   SALE is intentionally excluded (finance-sensitive).
DROP POLICY IF EXISTS hrp_client_rate_card_select ON client_rate_cards;
CREATE POLICY hrp_client_rate_card_select ON client_rate_cards
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','ACCOUNTANT','DIRECTOR'));

-- 2.4 vendor_rate_cards — vendor-side finance rates (RQ-07: rates NOT broad-read).
--   Runtime readers: statement.service.ts (ADMIN,HR_MANAGER,ACCOUNTANT,DIRECTOR) and
--   referral-guard.service.ts checkR3 on placement preview/activate (ADMIN,HR_MANAGER) —
--   both L2-only. Union = the 4 finance roles. No runtime write path.
DROP POLICY IF EXISTS hrp_vendor_rate_card_select ON vendor_rate_cards;
CREATE POLICY hrp_vendor_rate_card_select ON vendor_rate_cards
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','ACCOUNTANT','DIRECTOR'));

-- 2.5 ctv_withdrawal_requests — CTV self-service, mirrors the accepted commission_ledger
--   CTV self-scope idiom. Read = finance/root oversight OR the CTV's own rows; INSERT =
--   CTV self only (server derives ctv_id; the sole create route is POST /api/ctv/withdrawals).
--   No UPDATE path exists at runtime — finance approve/reject is unimplemented, so UPDATE
--   stays denied under FORCE (deny-by-default; §8 forbids inventing an approval policy).
DROP POLICY IF EXISTS hrp_ctv_withdrawal_select ON ctv_withdrawal_requests;
DROP POLICY IF EXISTS hrp_ctv_withdrawal_insert ON ctv_withdrawal_requests;
CREATE POLICY hrp_ctv_withdrawal_select ON ctv_withdrawal_requests
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT')
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
  );
CREATE POLICY hrp_ctv_withdrawal_insert ON ctv_withdrawal_requests
  AS PERMISSIVE FOR INSERT TO app_user_writer, app_user
  WITH CHECK (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id());

-- --------------------------------------------------------------------------
-- SECTION 3 — Uniform RESTRICTIVE delete-deny backstop on all 29 tables.
--
-- RESTRICTIVE policies AND-combine with the permissive set, so a FOR DELETE
-- USING(false) guarantees deny for app_user_writer / app_user ORTHOGONALLY to
-- whatever FOR ALL / command-aware permissive policy already governs the row —
-- minimal churn, no need to rewrite the accepted m13/p2/s1 FOR ALL policies
-- (DEC-06, DEC-07). The STEP-05 survey found ZERO runtime physical DELETEs on
-- any of these 29 models, so this regresses no authorized path and requires no
-- DEC-07 exception. Ticket tables are excluded (owned by M1-07a). Applied via a
-- loop over the canonical list so the set is auditable and transcription-safe.
-- --------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    -- Worker / referral
    'workers','dependents','source_claims','worker_deductions',
    -- Project / client
    'outsourcing_projects','sites','contracts','client_companies','client_rate_cards',
    -- Vendor / submission
    'vendors','candidate_submissions','vendor_rate_cards',
    -- Staffing
    'staffing_orders','staffing_order_slots','project_assignments',
    -- Attendance
    'attendance_import_batches','attendance_import_rows','attendance_events',
    -- Timesheet
    'timesheet_periods','timesheet_lines','timesheet_adjustments',
    -- Statements
    'vendor_statements','vendor_statement_lines','client_statements','client_statement_lines',
    -- Commission
    'commission_policies','commission_ledger','commission_debts','ctv_withdrawal_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'hrp_' || t || '_no_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR DELETE TO app_user_writer, app_user USING (false)',
      'hrp_' || t || '_no_delete', t
    );
  END LOOP;
END $$;
