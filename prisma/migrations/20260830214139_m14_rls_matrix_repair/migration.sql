-- ═══════════════════════════════════════════════════════════════════════════
-- m14_rls_matrix_repair — task hrp-v5-go-live-06-live-rls-matrix-restore.
--
-- Vá đúng phần posture RLS mà `hrp-live` đang thiếu, forward-only (DEC-01).
-- Trên `hrp-live`, 15 bảng dưới đây đã bật cả hai cờ `relrowsecurity` và
-- `relforcerowsecurity`
-- nhưng policy permissive của chúng chưa bao giờ tồn tại (6 migration thời s1/p2
-- không có hiệu lực trên branch đó — EV-04), nên với `app_user` / `app_user_writer`
-- chúng deny 100%. Ba bảng ticket thì ngược lại: có policy (m1_07a) mà chưa bật RLS.
--
-- Nội dung đúng 18 đối tượng (DEC-03): 15 policy permissive cộng 3 bảng ticket bật
-- `ENABLE` cộng `FORCE`. Không đối tượng nào khác.
--
-- BẤT BIẾN QUAN TRỌNG NHẤT (DEC-02 / EV-07): file này KHÔNG chứa một câu lệnh hàm
-- nào. `hrp_project_visible_for` và `hrp_worker_visible_for` trên live đang là bản
-- m13 có `sub_pm_user_id_1` / `sub_pm_user_id_2`; chạy lại migration s1 cũ sẽ thay
-- chúng về bản chỉ có `pm_user_id`, cắt quyền PM phụ mà không phát ra lỗi nào.
-- Vì vậy ở đây chỉ có policy, và policy tham chiếu tới hàm sẵn có, không định nghĩa lại.
--
-- Thân mỗi policy sao y bản chính từ migration sở hữu nó (DEC-04); comment ngay trên
-- mỗi policy ghi file gốc và số dòng để đối chiếu từng ký tự (RQ-01). Mỗi policy có
-- một câu drop idempotent cùng tên ngay trước, nên chạy sạch trên cả branch đã đủ đối
-- tượng (`hrp_mp2_test`) và branch đang thiếu (DEC-05, DEC-06).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- A. Nguồn: 20260816210000_s1_rls_worker
-- ───────────────────────────────────────────────────────────────────────────

-- dependents — 20260816210000_s1_rls_worker, dòng 92-102
DROP POLICY IF EXISTS hrp_dependent_scope ON dependents;
CREATE POLICY hrp_dependent_scope ON dependents
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR hrp_worker_visible_for(worker_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );

-- source_claims — 20260816210000_s1_rls_worker, dòng 110-124
DROP POLICY IF EXISTS hrp_source_claim_scope ON source_claims;
CREATE POLICY hrp_source_claim_scope ON source_claims
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
    OR hrp_worker_visible_for(worker_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
  );

-- project_assignments — 20260816210000_s1_rls_worker, dòng 132-159
DROP POLICY IF EXISTS hrp_project_assignment_scope ON project_assignments;
CREATE POLICY hrp_project_assignment_scope ON project_assignments
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    -- PM: thấy assignment thuộc dự án mình quản lý (G14: cả ACTIVE + lịch sử)
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = project_assignments.project_id AND p.pm_user_id = hrp_session_user_id()
    ))
    -- Worker thấy assignment của mình
    OR (hrp_session_role() = 'WORKER' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = project_assignments.worker_id
      AND w.account_user_id = hrp_session_user_id()
    ))
    -- HR_STAFF/SALE: qua worker ownership
    OR EXISTS (
      SELECT 1 FROM workers w WHERE w.id = project_assignments.worker_id
      AND (
        (hrp_session_role() = 'HR_STAFF' AND w.assigned_to_id = hrp_session_user_id())
        OR (hrp_session_role() = 'SALE' AND (w.owner_id = hrp_session_user_id() OR w.assigned_to_id = hrp_session_user_id()))
      )
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );

-- ───────────────────────────────────────────────────────────────────────────
-- B. Nguồn: 20260816211000_s1_rls_project
-- ───────────────────────────────────────────────────────────────────────────

-- sites — 20260816211000_s1_rls_project, dòng 64-69
DROP POLICY IF EXISTS hrp_site_scope ON sites;
CREATE POLICY hrp_site_scope ON sites
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_project_visible_for(project_id))
  WITH CHECK (hrp_project_writable(project_id));

-- contracts — 20260816211000_s1_rls_project, dòng 99-113 (bản gốc nằm trong khối
-- `DO $$ ... EXECUTE $POL$ ... $POL$`; ở đây là câu lệnh phẳng, thân giữ nguyên văn,
-- chỉ bỏ 6 khoảng trắng thụt đầu dòng của chuỗi dollar-quoted)
DROP POLICY IF EXISTS hrp_contract_scope ON contracts;
CREATE POLICY hrp_contract_scope ON contracts
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = contracts.project_id AND p.pm_user_id = hrp_session_user_id()
    ))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
  );

-- ───────────────────────────────────────────────────────────────────────────
-- C. Nguồn: 20260816212000_s1_rls_vendor
-- ───────────────────────────────────────────────────────────────────────────

-- candidate_submissions — 20260816212000_s1_rls_vendor, dòng 35-53
DROP POLICY IF EXISTS hrp_candidate_submission_scope ON candidate_submissions;
CREATE POLICY hrp_candidate_submission_scope ON candidate_submissions
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
    -- PM: submissions cho project mình quản lý
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = candidate_submissions.project_id AND p.pm_user_id = hrp_session_user_id()
    ))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
  );

-- vendor_statement_lines — 20260816212000_s1_rls_vendor, dòng 81-98
DROP POLICY IF EXISTS hrp_vendor_statement_line_scope ON vendor_statement_lines;
CREATE POLICY hrp_vendor_statement_line_scope ON vendor_statement_lines
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND EXISTS (
      SELECT 1 FROM vendor_statements s
      WHERE s.id = vendor_statement_lines.statement_id AND s.vendor_id = hrp_session_vendor_id()
    ))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND EXISTS (
      SELECT 1 FROM vendor_statements s
      WHERE s.id = vendor_statement_lines.statement_id AND s.vendor_id = hrp_session_vendor_id()
    ))
  );

-- ───────────────────────────────────────────────────────────────────────────
-- D. Nguồn: 20260817160000_s1_rls_attendance_timesheet
--    Bản gốc nằm trong khối `DO $$ ... IF EXISTS (...) THEN`; ở đây là câu lệnh
--    phẳng, thân giữ nguyên văn, chỉ bỏ 4 khoảng trắng thụt đầu dòng.
-- ───────────────────────────────────────────────────────────────────────────

-- attendance_import_batches — 20260817160000_s1_rls_attendance_timesheet, dòng 30-38
DROP POLICY IF EXISTS hrp_attendance_import_batch_scope ON attendance_import_batches;
CREATE POLICY hrp_attendance_import_batch_scope ON attendance_import_batches
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    -- PM: deny — batch là root nội bộ HR, có PII (raw_employee_code, errors)
  );

-- attendance_import_rows — 20260817160000_s1_rls_attendance_timesheet, dòng 52-66
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
          -- PM: deny — batch policy chặn rồi
        )
    )
  );

-- timesheet_lines — 20260817160000_s1_rls_attendance_timesheet, dòng 139-163
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

-- timesheet_adjustments — 20260817160000_s1_rls_attendance_timesheet, dòng 178-202
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
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM timesheet_periods p
      WHERE p.id = timesheet_adjustments.period_id
        AND p.project_id IS NOT NULL
        AND hrp_project_visible_for(p.project_id)
    ))
  );

-- ───────────────────────────────────────────────────────────────────────────
-- E. Nguồn: 20260818100000_s1_rls_client_statements
--    Bản gốc trong khối `DO $$`; câu lệnh phẳng, bỏ 4 khoảng trắng thụt đầu dòng.
-- ───────────────────────────────────────────────────────────────────────────

-- client_statement_lines — 20260818100000_s1_rls_client_statements, dòng 50-68
DROP POLICY IF EXISTS hrp_client_statement_line_scope ON client_statement_lines;
CREATE POLICY hrp_client_statement_line_scope ON client_statement_lines
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1 FROM client_statements s
      WHERE s.id = client_statement_lines.statement_id
        AND hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_statements s
      WHERE s.id = client_statement_lines.statement_id
        AND hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- F. Nguồn: 20260819104700_p2_commission_rls
--    Bản gốc trong khối `DO $$`; câu lệnh phẳng, bỏ 4 khoảng trắng thụt đầu dòng.
-- ───────────────────────────────────────────────────────────────────────────

-- commission_policies — 20260819104700_p2_commission_rls, dòng 41-51
DROP POLICY IF EXISTS hrp_commission_policy_scope ON commission_policies;
CREATE POLICY hrp_commission_policy_scope ON commission_policies
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT')
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'DIRECTOR')
  );

-- commission_ledger — 20260819104700_p2_commission_rls, dòng 66-78
DROP POLICY IF EXISTS hrp_commission_ledger_scope ON commission_ledger;
CREATE POLICY hrp_commission_ledger_scope ON commission_ledger
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR')
    OR
    (hrp_session_role() = 'CTV' AND hrp_session_user_id() = ctv_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'ACCOUNTANT', 'DIRECTOR')
  );

-- commission_debts — 20260819104700_p2_commission_rls, dòng 93-105
DROP POLICY IF EXISTS hrp_commission_debt_scope ON commission_debts;
CREATE POLICY hrp_commission_debt_scope ON commission_debts
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR')
    OR
    (hrp_session_role() = 'CTV' AND hrp_session_user_id() = ctv_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'ACCOUNTANT', 'DIRECTOR')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- G. Ticket family (RQ-02 / DEC-10) — 3 bảng đã có policy từ
--    20260826120000_m1_07a_ticket_rls_backstop nhưng chưa bật RLS trên `hrp-live`,
--    nên policy đang trơ: mọi app role đọc và ghi được tất cả ticket. `ENABLE` cộng
--    `FORCE` ở đây làm chúng có hiệu lực. Không tạo, không sửa policy nào của ticket.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE ticket_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notifications FORCE ROW LEVEL SECURITY;
