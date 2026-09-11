# TASK — HRP V6 N0 Contract + Read-only Migration Audit

**Ngày:** 11/09/2026
**Tier:** 1
**Lane:** STANDARD
**Audit:** NONE
**Trạng thái:** READ-ONLY ✅ COMPLETE
**Nguồn thực thi:** Tier 1 (11/09/2026 13:45–14:00 Asia/Bangkok)

## Mục tiêu

N0 chỉ đọc và viết tài liệu. Không migration, không backfill, không sửa dữ liệu production. Mục đích: khóa contract trước khi mở schema phase tiếp theo (N1/N2/N3 và AV1/AV4/AV6).

---

## 1. Model/Table Inventory

### 1.1 Đã có — có migration

| Model | Bảng | Migration | Phase | Ghi chú |
|---|---|---|---|---|
| `User` | `users` | `init` | G0 | |
| `Permission` | `permissions` | `g22_security` | G0 | |
| `RolePermission` | `role_permissions` | `g22_security` | G0 | |
| `UserPermissionGrant` | `user_permission_grants` | `g22_security` | G0 | |
| `Worker` | `workers` | `init` | N1 | |
| `Dependent` | `dependents` | `init` | N1 | |
| `LaborProfile` | `labor_profiles` | `v6_phase1a_labor_profile_schema` | N1 | Migration f8bd761 đã applied live |
| `LaborProfileIntake` | `labor_profile_intakes` | `v6_phase1a_labor_profile_schema` | N1 | |
| `EmploymentEpisode` | `employment_episodes` | `v6_phase1a_labor_profile_schema` | N1 | |
| `SourceClaim` | `source_claims` | `init` | N1 | |
| `ClientCompany` | `client_companies` | `init` | N2 | |
| `Project` | `outsourcing_projects` | `init` | N2 | + `client_company_name` từ `20260911001` |
| `StaffingOrder` | `staffing_orders` | `init` | N2 | |
| `StaffingOrderSlot` | `staffing_order_slots` | `init` | N2 | |
| `Site` | `sites` | `init` | N2 | |
| `Vendor` | `vendors` | `init` | N2 | |
| `CandidateSubmission` | `candidate_submissions` | `init` + `mp3_submission_lifecycle` | N2 | |
| `ProjectAssignment` | `project_assignments` | `init` + `mp3c_assignment_placement_links` | N2 | Có `submissionId` + `staffingOrderSlotId` (MP-3C) |
| `JobOpening` | `job_openings` | `job_opening_posting_split` | V6 | |
| `JobPosting` | `job_postings` | `job_opening_posting_split` | V6 | |
| `PortalTimesheet` | `portal_timesheets` | `g0_baseline` | AV1-adjacent | |
| `CommissionPolicy` | `commission_policies` | `p2_commission_schema` | P2 | |
| `CommissionLedger` | `commission_ledger` | `p2_commission_schema` | P2 | |
| `CommissionDebt` | `commission_debts` | `p2_commission_schema` | P2 | |
| `IdempotencyKey` | `idempotency_keys` | `s1_integrity_idem_outbox` | S1 | |
| `OutboxEvent` | `outbox_events` | `s1_integrity_idem_outbox` | S1 | |
| `Ticket` | `tickets` | `init` | N3 | |
| `TicketHistory` | `ticket_history` | `init` | N3 | |
| `TicketComment` | `ticket_comments` | `init` | N3 | |
| `TicketNotification` | `ticket_notifications` | `init` | N3 | |
| `AuditLog` | `audit_logs` | `init` | N3 | |
| `AttendanceImportBatch` | `attendance_import_batches` | `init` | N3 | |
| `AttendanceImportRow` | `attendance_import_rows` | `init` | N3 | |
| `AttendanceEvent` | `attendance_events` | `init` | N3 | |
| `TimesheetPeriod` | `timesheet_periods` | `init` | N3 | |
| `TimesheetLine` | `timesheet_lines` | `init` | N3 | |
| `TimesheetAdjustment` | `timesheet_adjustments` | `init` | N3 | |
| `VendorStatement` | `vendor_statements` | `init` | N3 | |
| `VendorStatementLine` | `vendor_statement_lines` | `init` | N3 | |
| `ClientStatement` | `client_statements` | `init` | N3 | |
| `ClientStatementLine` | `client_statement_lines` | `init` | N3 | |
| `PayrollConfig` | `payroll_config` | `init` | N3 | |
| `TaxBracket` | `tax_brackets` | `init` | N3 | |
| `Holiday` | `holidays` | `init` | N3 | |
| `WorkerDeduction` | `worker_deductions` | `init` | N3 | |
| `Contract` | `contracts` | `init` | N2 | |
| `ContractParty` | `contract_parties` | `init` | N2 | |
| `VendorRateCard` | `vendor_rate_cards` | `init` | N2 | |
| `ClientRateCard` | `client_rate_cards` | `init` | N2 | |
| `ApplicationStatusHistory` | `application_status_history` | `mp2_apply_tracking` | MP-2 | |
| `ImportTemplate` | `import_templates` | `init` | N3 | |
| `PushSubscription` | `push_subscriptions` | `p1_portals_schema` | P1 | |
| `CrmLead` | `crm_leads` | `init` | N2 | |

### 1.2 Đã có schema nhưng chưa có migration

| Model | Bảng | Ghi chú |
|---|---|---|
| `CtvWithdrawalRequest` | `ctv_withdrawal_requests` | Có trong `prisma/schema.prisma` (line ~1269) nhưng **không có migration**. Model tồn tại trong schema nhưng bảng chưa được tạo. |

### 1.3 Chưa có schema

| Model | Phase | Ghi chú |
|---|---|---|
| `HomepageSettings` | AV1 | Chưa có trong `prisma/schema.prisma`. UI hiện dùng fixture. |
| `HomepageSection` | AV6 | Chưa có trong `prisma/schema.prisma`. UI hiện dùng fixture (`demoHrpIntro`, `demoNewsSection`). |
| `Media` | AV4 | Chưa có trong `prisma/schema.prisma`. File upload hiện dùng URL string fields trong model khác. |

### 1.4 Phase sở hữu

| Phase | Models |
|---|---|
| **G0** | User, Permission, RolePermission, UserPermissionGrant, PortalTimesheet |
| **N1** | Worker, Dependent, LaborProfile, LaborProfileIntake, EmploymentEpisode, SourceClaim |
| **N2** | ClientCompany, CrmLead, Project, StaffingOrder, StaffingOrderSlot, Site, Vendor, CandidateSubmission, ProjectAssignment, Contract, ContractParty, VendorRateCard, ClientRateCard |
| **N3** | Ticket, TicketHistory, TicketComment, TicketNotification, AuditLog, AttendanceImportBatch, AttendanceImportRow, AttendanceEvent, TimesheetPeriod, TimesheetLine, TimesheetAdjustment, VendorStatement, VendorStatementLine, ClientStatement, ClientStatementLine, PayrollConfig, TaxBracket, Holiday, WorkerDeduction, ImportTemplate |
| **V6** | JobOpening, JobPosting |
| **P1** | PushSubscription |
| **P2** | CommissionPolicy, CommissionLedger, CommissionDebt, CtvWithdrawalRequest (schema-only) |
| **S1** | IdempotencyKey, OutboxEvent |
| **AV1** | HomepageSettings (chưa có schema) |
| **AV4** | Media (chưa có schema) |
| **AV6** | HomepageSection (chưa có schema) |

---

## 2. Authority Map

### 2.1 ClientCompany
- **Canonical authority:** `ClientCompany.name` (`prisma/schema.prisma:318`)
- **Sở hữu:** N2
- **RLS:** MKT role không có policy trên `client_companies` — không thể đọc
- **Projection:** `Project.clientCompanyName` là denormalized read projection phục vụ MKT role đọc tên công ty mà không cần vượt RLS

### 2.2 Project
- **Sở hữu:** N2
- **`clientCompanyName`:** Denormalized projection từ `ClientCompany.name`. Được thiết lập khi:
  - Migration `20260911001_project_company_name_denorm` backfill
  - `scripts/seed-public-jobs.mjs` khi upsert PRJ-2026-*
  - **Chưa có sync khi đổi ClientCompany.name hoặc đổi clientCompanyId** (xem task 4.D)

### 2.3 StaffingOrder / StaffingOrderSlot
- **Sở hữu:** N2
- **Authority chain:** `StaffingOrder` → `Project` → `ClientCompany`

### 2.4 JobOpening / JobPosting
- **Sở hữu:** V6 (Phase 1)
- **Migration đã applied:** `20260908001_job_opening_posting_split`
- **Chưa tích hợp vào public surface:** Homepage và `/api/jobs` hiện đọc `Project.isPublic=true`, không đọc `JobOpening`/`JobPosting`
- **Admin surface:** Chỉ có `GET /api/admin/job-opening-status` đọc V6 models

### 2.5 LaborProfile
- **Sở hữu:** N1 (Phase 1A)
- **Migration đã applied:** `20260908150000` + `20260908150001` (f8bd761 trên hrp-live)
- **RLS:** Enabled với scope policies
- **Seed:** Chưa có LaborProfile seed trong `prisma/seed.mjs`

### 2.6 PlacementCase / Placement
- **Không có model riêng.** MP-3C dùng `ProjectAssignment` với `submissionId` và `staffingOrderSlotId` để model placement linkage
- **N1 foundation sẽ tạo PlacementCase/Placement model** — đây là phần còn thiếu

### 2.7 HandlingAssignment
- **Không có model** `HandlingAssignment` trong schema
- Khái niệm "handling assignment" chưa được schema hóa

### 2.8 EmploymentEpisode
- **Sở hữu:** N1
- **Migration:** `v6_phase1a_labor_profile_schema`
- **RLS:** Enabled

### 2.9 ProjectAssignment
- **Sở hữu:** N2
- **MP-3C extension:** Có `submissionId` và `staffingOrderSlotId` cho placement linkage

### 2.10 HomepageSettings
- **Sở hữu:** AV1
- **Schema:** CHƯA CÓ — model không tồn tại
- **UI hiện tại:** Dùng fixture static trong component

### 2.11 HomepageSection
- **Sở hữu:** AV6
- **Schema:** CHƯA CÓ — model không tồn tại
- **UI hiện tại:** Dùng fixture `demoHrpIntro`, `demoNewsSection`

### 2.12 Media
- **Sở hữu:** AV4
- **Schema:** CHƯA CÓ — model không tồn tại
- **File upload hiện tại:** Dùng URL string trong các model khác

---

## 3. Compatibility Map

### 3.1 Public Homepage (`app/(portal)/page.tsx`)

| Data Source | Type | Bảng đọc |
|---|---|---|
| `demoHrpIntro` | DEMO fixture | Không đọc DB |
| `demoNewsSection` | DEMO fixture | Không đọc DB |
| `recruitingProjects` | REAL | `outsourcing_projects` + `staffing_orders` + `staffing_order_slots` (filter `isPublic=true`) |
| `bestJobs` | REAL | `outsourcing_projects` + `staffing_orders` + `staffing_order_slots` |

**Không đọc:** `job_openings`, `job_postings`, `client_companies`, `homepage_settings`, `homepage_sections`

### 3.2 `/api/jobs` (Public Job Listing)

- Đọc: `outsourcing_projects` (isPublic=true), `staffing_orders`, `staffing_order_slots`
- **Dùng `clientCompanyName` denormalized** thay vì join `client_companies`
- **Không đọc** `job_openings`, `job_postings`
- **RLS context:** MKT role không thể đọc `client_companies` nên dùng projection

### 3.3 Điểm chuyển authority dự kiến

| Thời điểm | Thay đổi | Phase |
|---|---|---|
| N3 ServiceModel | AFF placement lifecycle chuyển từ `ProjectAssignment` authority cũ sang `Placement`/`PlacementCase` model mới | N3 |
| AV1 | HomepageSettings schema + API → homepage đọc từ DB thay vì fixture | AV1 |
| AV4 | Media schema → homepage sections đọc media từ DB | AV4 |
| AV6 | HomepageSection schema + API → demo fixtures thay bằng CMS published data | AV6 |

### 3.4 Seed data chỉ phục vụ compatibility

| Nguồn | Classification | Mục đích |
|---|---|---|
| `PRJ-2026-001` → `PRJ-2026-005` | DEMO/COMPATIBILITY | Public job demo (seed-public-jobs.mjs) |
| `EXTRA-2026-*` records | DEMO/COMPATIBILITY | Phase seed, UAT, P1 portals |
| `DA-2026-018`, `DA-2026-022`, `PRJ-SV-014`, `PRJ-INTERNAL` | DEMO/COMPATIBILITY | Seed projects cũ (prisma/seed.mjs) |

**Không biến các bản ghi này thành lifecycle truth hoặc Placement thực thể.**

### 3.5 Seed hiện tại chưa tạo

- `JobOpening` / `JobPosting` — V6 models chưa được seed
- `LaborProfile` / `LaborProfileIntake` / `EmploymentEpisode` — N1 models chưa được seed
- `PlacementCase` / `Placement` — KHÔNG TỒN TẠI model
- `HomepageSettings` — KHÔNG TỒN TẠI model
- `HomepageSection` — KHÔNG TỒN TẠI model
- `Media` — KHÔNG TỒN TẠI model

---

## 4. Migration Inventory

### 4.1 Migration trong repo

| Migration | Tóm tắt |
|---|---|
| `init` | Tạo 41 bảng core |
| `g22_security` | SystemRole enum, permissions, role_permissions, user_permission_grants |
| `g0_baseline` | portal_timesheets |
| `g0_rq09_uniq_portal_timesheets` | Unique constraint trên portal_timesheets |
| `s1_integrity_idem_outbox` | idempotency_keys, outbox_events, audit_log extensions |
| `s1_rls_worker` | RLS helpers + policies cho workers, dependents, source_claims, project_assignments, tickets |
| `s1_rls_vendor` | Policies cho outsourcing_projects, vendors, vendor_statements, candidate_submissions |
| `s1_rls_project` | Policies cho outsourcing_projects, staffing_orders |
| `s1_rls_staffing_order_slots` | RLS trên staffing_order_slots |
| `s1_rls_attendance_timesheet` | RLS trên attendance, timesheet tables |
| `s1_rls_client_statements` | RLS trên client_statements, client_statement_lines |
| `p1_portals_schema` | GPS columns trên attendance_events, push_subscriptions |
| `p2_commission_schema` | commission_policies, commission_ledger, commission_debts |
| `p2_commission_rls` | RLS cho commission tables |
| `m13_backend_expansion` | manager_id, sub_pm columns, indexes |
| `m13_restore_rls_matrix` | Full RLS matrix rebuild với sub-PM/manager support |
| `mp2_apply_tracking` | CandidateSubmission extensions, application_status_history, public RPC functions |
| `mp2_public_rpc_schema_usage` | Grant USAGE on public schema |
| `marketplace_search_tracking_profile` | Public tracking projection function |
| `mp3_submission_lifecycle` | CandidateSubmissionStatus enum, status conversion |
| `mp3_conversion_worker_link` | worker_id trên candidate_submissions |
| `g0_portal_timesheet_index_reconcile` | Index reconciliation |
| `mp3c_assignment_placement_links` | submission_id, staffing_order_slot_id trên project_assignments |
| `m1_07a_ticket_rls_backstop` | Ticket RLS rebuild |
| `m1_07b_rls_runtime_posture_closure` | Enable + FORCE RLS trên 29 bảng |
| `m14_rls_matrix_repair` | Restore missing policies |
| `public_rpc_residual_grant_revoke` | Revoke self-grant từ hrp_public_rpc |
| `job_opening_posting_split` | Tạo job_openings, job_postings, RLS |
| `v6_phase1a_labor_profile_schema` | Tạo labor_profiles, labor_profile_intakes, employment_episodes |
| `v6_phase1a_labor_profile_rls` | RLS cho labor profile tables |
| `project_company_name_denorm` | Thêm client_company_name, backfill |

### 4.2 Migration đã xác nhận applied (có evidence)

| Migration | Evidence |
|---|---|
| `v6_phase1a_labor_profile_schema` + `v6_phase1a_labor_profile_rls` | Owner xác nhận đã applied trên hrp-live 08/09; f8bd761 trên origin/main |

### 4.3 Migration chưa thể chạy

| Migration | Credential Issue |
|---|---|
| Tất cả migration | `DATABASE_URL_ADMIN` hiện lỗi xác thực. Không chạy migration hoặc seed ghi DB cho đến khi credential được sửa. |

### 4.4 Rollback/Reconciliation

- **CtvWithdrawalRequest:** Model tồn tại trong schema nhưng không có migration tạo bảng. Cần migration để tạo bảng hoặc xóa model khỏi schema.
- **No rollback needed** cho `client_company_name` — nó là cột thêm (ADD), có thể DROP nếu cần.

---

## 5. Khóa Dependency Tiếp Theo

### 5.1 Có thể bắt đầu ngay

| Task | Lý do |
|---|---|
| **N1 PlacementCase/Placement foundation** | LaborProfile + EmploymentEpisode migrations đã applied; Worker model sẵn; RLS enabled; PlacementCase model CHƯA CÓ trong schema → cần design |
| **V6 JobOpening/JobPosting admin API** | Models và migration đã tồn tại; chưa có admin route quản lý |
| **AV1 HomepageSettings design** | Model CHƯA CÓ; cần thiết kế trước |
| **AV4 Media design** | Model CHƯA CÓ; cần thiết kế trước |
| **clientCompanyName projection consistency** | Xác nhận write path chưa sync — cần fix |

### 5.2 AV1 và AV4 độc lập với N1

- AV1 và AV4 có thể chạy độc lập với N1 nếu không cùng sửa schema trong một working tree
- AV4 là dependency của AV6 (media foundation)
- AV1 KHÔNG phải dependency của AV6 (Tier 0 review v3 chốt)

### 5.3 AV2 editor shell

- AV2 có thể dựng editor shell cho JobPosting nhưng **không được publish trước N3 ServiceModel**

### 5.4 AFF chưa triển khai trên authority cũ

- AFF chưa triển khai trên timing/assignment authority cũ (`ProjectAssignment` MP-3C)
- N3 ServiceModel sẽ chuyển sang `Placement`/`PlacementCase` model mới
- **Không biến seed data PRJ-2026-* / EXTRA-2026-* thành Placement thực thể**

### 5.5 N1/N2/N3 schema work

- **Chỉ mở sau khi N0 hoàn thành** ✅ (task này)

---

## 6. Bằng chứng nguồn

- `prisma/schema.prisma` — toàn bộ model definitions
- `prisma/migrations/` — 34 migration files
- `prisma/seed.mjs` — seed classification evidence
- `scripts/seed-public-jobs.mjs` — PRJ-2026-* seed
- `prisma/seed-extra-jobs.sql` — extra seed
- `app/(portal)/page.tsx` — homepage data sourcing
- `src/domains/job-board/public.service.ts` — public job projection
- `app/api/jobs/route.ts` — public job API

---

## Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 11/09/2026 14:00 | Tier 1 | N0 initial — read-only discovery complete |
