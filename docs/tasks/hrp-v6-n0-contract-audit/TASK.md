# TASK — HRP V6 N0 Contract + Read-only Migration Audit

**Ngày:** 11/09/2026 (v1.0) → 12/09/2026 (v1.1 re-audit)
**Tier:** 1
**Lane:** STANDARD
**Audit:** NONE
**Trạng thái:** READ-ONLY ✅ COMPLETE (v1.1)
**Nguồn thực thi:** Tier 1
**HEAD tại audit:** `3133db3`

> **v1.1 scope:** re-audit sau AV1 (HomepageSettings), AV4 (Media + MediaAssignment) và
> `Project.clientCompanyName` consistency đã được triển khai và merge vào `main`. Mục tiêu:
> cập nhật inventory, authority map và compatibility map theo evidence mới; re-lock next
> dependencies. Không migration, không backfill, không sửa dữ liệu production.

---

## Mục tiêu

N0 chỉ đọc và viết tài liệu. Không migration, không backfill, không sửa dữ liệu production. Mục đích: khóa contract trước khi mở schema phase tiếp theo (N1/N2/N3 và AV2/AV6).

---

## 1. Model/Table Inventory

### 1.1 Đã có — có migration (re-audit v1.1)

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
| `Project` | `outsourcing_projects` | `init` | N2 | + `client_company_name` (consistency sync từ `20260911001`; y10.4 ownership locked) |
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
| **`HomepageSettings`** | **`homepage_settings`** | **`20260911002_av1_homepage_settings`** | **AV1** | **Singleton (`id='default'`) + CHECK constraint; migration đã applied live (Owner confirmation). Owner = AV1.** |
| **`Media`** | **`media`** | **`20260912001_av4_media_library`** | **AV4** | **Vercel Blob-backed; `media_status` enum (`PUBLIC`/`INTERNAL`); created_by_id FK nullable. Owner = AV4.** |
| **`MediaAssignment`** | **`media_assignment`** | **`20260912001_av4_media_library`** | **AV4** | **Polymorphic junction: `owner_type` allowlist (`JobPosting`/`HomepageSection`/`Article`/`Partner`). Owner = AV4. AV2/AV6 sẽ consume sau.** |

### 1.2 Đã có schema nhưng chưa có migration

| Model | Bảng | Ghi chú |
|---|---|---|
| `CtvWithdrawalRequest` | `ctv_withdrawal_requests` | Có trong `prisma/schema.prisma` nhưng **không có migration**. Model tồn tại trong schema nhưng bảng chưa được tạo. |

### 1.3 Chưa có schema

| Model | Phase | Ghi chú |
|---|---|---|
| `HomepageSection` | AV6 | Chưa có trong `prisma/schema.prisma`. Homepage hiện render HrpIntro/News từ `demoHrpIntro`/`demoNewsSection` fixtures; gallery skeleton còn `INTEGRATION_PENDING` (sẽ switch sang `REAL` qua `/api/public/media` sau khi AV6 schema + media assignment tồn tại). |

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
| **AV1** | **HomepageSettings** |
| **AV4** | **Media, MediaAssignment** |
| **AV6** | HomepageSection (chưa có schema) |

---

## 2. Authority Map

### 2.1 ClientCompany
- **Canonical authority:** `ClientCompany.name` (`prisma/schema.prisma`)
- **Sở hữu:** N2
- **RLS:** MKT role không có policy trên `client_companies` — không thể đọc
- **Projection:** `Project.clientCompanyName` là denormalized read projection phục vụ MKT role đọc tên công ty mà không cần vượt RLS

### 2.2 Project
- **Sở hữu:** N2
- **`clientCompanyName`** (consistency locked — y10.4):
  - **POST /api/projects** (`app/api/projects/route.ts:122-145`): derive bằng `tx.clientCompany.findUnique` rồi truyền vào `tx.project.create` — cả hai cùng `withDbContext` callback (atomic, RLS-scoped).
  - **PUT /api/projects/[id]** (`app/api/projects/[id]/route.ts:53-80`): khi `clientCompanyId !== undefined`, lookup tên mới + spread vào `tx.project.update` — cùng `withDbContext` callback.
  - **PUT /api/clients/[id]** (`app/api/clients/[id]/route.ts:51-79`): khi `name !== undefined`, propagate qua `tx.project.updateMany` cho toàn bộ project có `clientCompanyId = id` — cùng `withDbContext` callback.
  - **Seed (`prisma/seed.mjs`)**: `clientCompanyName: client.name` được set trong `project.upsert`.
  - **No raw-client `prisma.clientCompany.findUnique` outside `withDbContext`** (api-boundary AC-08 satisfied).
  - Backfill legacy rows: migration `20260911001_project_company_name_denorm` đã chạy live.
- **Không nhận `clientCompanyName` từ request body** (chỉ derive).

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

### 2.10 HomepageSettings (v1.1 — AV1 closed)
- **Sở hữu:** AV1
- **Schema:** Singleton, `id = 'default'`, CHECK constraint trên DB.
- **Migration:** `20260911002_av1_homepage_settings` (applied live — Owner confirmation).
- **Public read:** `GET /api/public/homepage-settings` (no auth, `unstable_cache`).
- **Admin write:** `POST /api/admin/homepage-settings` (auth: ADMIN + `CAN_EDIT_HOMEPAGE_SETTINGS`).
- **UI integration (đã consume):**
  - `app/(portal)/page.tsx` dùng `bestJobsPageSize` cho featured jobs (`URGENT` urgency filter).
  - `app/(jobs)/viec-lam/page.tsx` dùng `listingPageSize` cho danh sách việc làm.
  - `app/admin/settings/page.tsx` (Server Component) + `admin-settings-form.tsx` (Client) cho phép ADMIN edit.
- **Không còn "UI dùng fixture"** (v1.0 ghi nhầm).

### 2.11 HomepageSection
- **Sở hữu:** AV6
- **Schema:** CHƯA CÓ — model không tồn tại
- **UI hiện tại:** Dùng fixture `demoHrpIntro`, `demoNewsSection` cho homepage render; gallery section còn `INTEGRATION_PENDING` skeleton trên `/viec-lam/[slug]`.

### 2.12 Media (v1.1 — AV4 closed)
- **Sở hữu:** AV4
- **Schema:** `Media` model + `MediaStatus` enum + 4 indexes + 2 CHECK constraints (`size > 0`, `mimeType non-empty`) + nullable FK `created_by_id` SET NULL.
- **Migration:** `20260912001_av4_media_library` (chưa chạy production — đợi Owner confirm `BLOB_READ_WRITE_TOKEN`).
- **Storage:** Vercel Blob (upload server-side qua `POST /api/admin/media/upload-url` → `head()` verify qua `/confirm` → tạo Media row).
- **Auth:** `CAN_MANAGE_MEDIA` (group `MEDIA`) — ADMIN/HR_MANAGER/HR_STAFF (theo seed).
- **Public read:** `GET /api/public/media?ownerType=…&ownerId=…` (no auth, filter `status='PUBLIC'`).
- **API surface:**
  - `app/api/admin/media/route.ts` — list (admin).
  - `app/api/admin/media/upload-url/route.ts` — multipart upload to Vercel Blob.
  - `app/api/admin/media/confirm/route.ts` — verify blob + tạo Media row.
  - `app/api/admin/media/[id]/route.ts` — PATCH/DELETE metadata + blob cleanup.
  - `app/api/admin/media/[id]/assignments/route.ts` — list assignments.
  - `app/api/admin/media/assign/route.ts` — create assignment (polymorphic owner).
  - `app/api/admin/media/[id]/assignments/[assignmentId]/route.ts` — delete assignment.
  - `app/api/public/media/route.ts` — public read assigned media.
- **UI:** `app/admin/media/page.tsx` (Server) + `media-library-client.tsx` (Client) — folder sidebar, search, upload/edit/delete modal.

### 2.13 MediaAssignment (v1.1 — AV4 closed)
- **Sở hữu:** AV4
- **Schema:** Polymorphic junction (`ownerType` allowlist + `ownerId`), unique `(mediaId, ownerType, ownerId)`, FK ON DELETE CASCADE.
- **Migration:** cùng `20260912001_av4_media_library`.
- **Owner type allowlist:** `('JobPosting', 'HomepageSection', 'Article', 'Partner')` — enforced bằng CHECK constraint.
- **Consumers:** AV2 (JobPosting editor — chưa build), AV6 (HomepageSection CMS — chưa build). Hiện không có UI consumer nào gọi assignment write paths.

---

## 3. Compatibility Map

### 3.1 Public Homepage (`app/(portal)/page.tsx`)

| Data Source | Type | Bảng/API đọc | Ghi chú |
|---|---|---|---|
| `getHomepageSettings` | **REAL** | `homepage_settings` (singleton) | Mới — qua `/api/public/homepage-settings` (`unstable_cache`, tag `homepage-settings`). |
| `demoHrpIntro` | DEMO fixture | Không đọc DB | Sẽ switch sang AV6 `HomepageSection` sau. |
| `demoNewsSection` | DEMO fixture | Không đọc DB | Sẽ switch sang AV6 `HomepageSection` sau. |
| `recruitingProjects` | REAL | `outsourcing_projects` + `staffing_orders` + `staffing_order_slots` (filter `isPublic=true`) | |
| `bestJobs` | REAL | `outsourcing_projects` + `staffing_orders` + `staffing_order_slots` | Filter `urgency='URGENT'` + `take: bestJobsPageSize` từ settings. |

**Không đọc:** `job_openings`, `job_postings`, `homepage_sections`, `media`.

### 3.2 `/api/jobs` (Public Job Listing)

- Đọc: `outsourcing_projects` (isPublic=true), `staffing_orders`, `staffing_order_slots`
- **Dùng `clientCompanyName` denormalized** thay vì join `client_companies` (RLS-safe cho MKT)
- `take: listingPageSize` từ `HomepageSettings` (clamp [6, 50])
- **Không đọc** `job_openings`, `job_postings`

### 3.3 Detail page `/viec-lam/[slug]`

- Sections: `INTEGRATION_PENDING` cho gallery (đợi AV6 + media assignment từ `JobPosting`); phần còn lại render DEMO fixtures theo scope hiện tại.
- Section rendering authority: `JobPosting`-gated khi AV2 ship + AV6 publish.

### 3.4 Điểm chuyển authority dự kiến

| Thời điểm | Thay đổi | Phase |
|---|---|---|
| N3 ServiceModel | AFF placement lifecycle chuyển từ `ProjectAssignment` authority cũ sang `Placement`/`PlacementCase` model mới | N3 |
| ~~AV1~~ (done) | ~~HomepageSettings schema + API → homepage đọc từ DB thay vì fixture~~ | ~~AV1~~ ✅ |
| AV4 (done) | Media schema + Vercel Blob + polymorphic assignment → homepage gallery skeleton có thể switch sang `REAL` khi AV6 publish sections | AV4 |
| AV6 | HomepageSection schema + API → demo fixtures thay bằng CMS published data; gallery `/viec-lam/[slug]` switch sang `REAL` qua `/api/public/media?ownerType=HomepageSection` | AV6 |
| AV2 | JobPosting editor shell — publish chỉ được khi N3 ServiceModel sẵn sàng | AV2 (gated by N3) |

### 3.5 Seed data chỉ phục vụ compatibility

| Nguồn | Classification | Mục đích |
|---|---|---|
| `PRJ-2026-001` → `PRJ-2026-005` | DEMO/COMPATIBILITY | Public job demo (seed-public-jobs.mjs) |
| `EXTRA-2026-*` records | DEMO/COMPATIBILITY | Phase seed, UAT, P1 portals |
| `DA-2026-018`, `DA-2026-022`, `PRJ-SV-014`, `PRJ-INTERNAL` | DEMO/COMPATIBILITY | Seed projects cũ (prisma/seed.mjs) |

**Không biến các bản ghi này thành lifecycle truth hoặc Placement thực thể.**

### 3.6 Seed hiện tại chưa tạo

- `JobOpening` / `JobPosting` — V6 models chưa được seed
- `LaborProfile` / `LaborProfileIntake` / `EmploymentEpisode` — N1 models chưa được seed
- `PlacementCase` / `Placement` — KHÔNG TỒN TẠI model
- `HomepageSection` — KHÔNG TỒN TẠI model (AV6)
- `HomepageSettings` — có model, migration đã chạy, nhưng row singleton được bootstrap tự động bởi `getHomepageSettings` (upsert, idempotent) — không cần seed thủ công.
- `Media` — KHÔNG seed; UI admin cho phép upload từng item.

---

## 4. Migration Inventory

### 4.1 Migration trong repo (re-audit v1.1: 36 files = 35 SQL + migration_lock.toml)

Tổng cộng **35 migration SQL** trong `prisma/migrations/` (lock file không tính).

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
| `20260908001_job_opening_posting_split` | Tạo job_openings, job_postings, RLS |
| `20260908150000_v6_phase1a_labor_profile_schema` | Tạo labor_profiles, labor_profile_intakes, employment_episodes |
| `20260908150001_v6_phase1a_labor_profile_rls` | RLS cho labor profile tables |
| `20260911001_project_company_name_denorm` | Thêm client_company_name, backfill |
| **`20260911002_av1_homepage_settings`** (NEW v1.1) | Tạo `homepage_settings` singleton với CHECK + insert default row |
| **`20260912001_av4_media_library`** (NEW v1.1) | Tạo `media` + `media_assignment` + `MediaStatus` enum + FK/CHECK constraints |

### 4.2 Migration đã xác nhận applied (có evidence)

| Migration | Evidence |
|---|---|
| `20260908150000_v6_phase1a_labor_profile_schema` + `20260908150001_v6_phase1a_labor_profile_rls` | Owner xác nhận đã applied trên hrp-live 08/09; f8bd761 trên origin/main |
| `20260911001_project_company_name_denorm` | Service exposed live + consistency lock đã ship |
| `20260911002_av1_homepage_settings` (NEW v1.1) | Owner xác nhận đã applied production (theo task brief) |

### 4.3 Migration chưa thể chạy / chưa chạy

| Migration | Credential/Operational Issue |
|---|---|
| `20260912001_av4_media_library` (NEW v1.1) | Migration file trong repo và idempotent, nhưng **chưa apply production** — chờ Owner confirm `BLOB_READ_WRITE_TOKEN` đã set trên Vercel. Nếu chưa có token thì runtime confirm/upload trả `BLOB_TOKEN_MISSING` (503). |
| Tất cả migration | `DATABASE_URL_ADMIN` hiện lỗi xác thực từ máy Tier 1. Không chạy migration hoặc seed ghi DB từ Tier 1 cho đến khi credential được sửa (theo task contract). |

### 4.4 Rollback/Reconciliation

- **CtvWithdrawalRequest:** Model tồn tại trong schema nhưng không có migration tạo bảng. Cần migration để tạo bảng hoặc xóa model khỏi schema.
- **HomepageSettings** (NEW v1.1): ADD-only, có thể DROP nếu cần. Row singleton được bootstrap idempotent — rollback chỉ cần DROP TABLE.
- **Media + MediaAssignment** (NEW v1.1): ADD-only, có thể DROP. Lưu ý: trước khi DROP, cần cleanup `media_assignment` trước (FK CASCADE sẽ lo, nhưng Vercel Blob storage sẽ giữ orphan blobs cần dọn riêng).
- **No rollback needed** cho `client_company_name` — nó là cột thêm (ADD), có thể DROP nếu cần.

---

## 5. Khóa Dependency Tiếp Theo (re-audit v1.1)

### 5.1 Đã xong trong `main` (HEAD `3133db3`)

| Task | Trạng thái | Evidence |
|---|---|---|
| **AV1 HomepageSettings** | ACCEPTED v1.0 | Migration `20260911002` applied live; `/api/public/homepage-settings` + `/api/admin/homepage-settings` + Admin form; UI `(portal)/page.tsx` + `(jobs)/viec-lam/page.tsx` consume settings. |
| **AV4 Media Library** | ACCEPTED v1.0 | Migration `20260912001` trong repo (chưa apply production); full admin UI + public API; safe-render utility; DEC-01..06 self-resolved. |
| **`Project.clientCompanyName` consistency** | ACCEPTED v1.0 | POST/PUT projects + PUT clients đều derive/propagate projection trong `withDbContext`; seed aligned. |
| **UI04d Detail UI** | ACCEPTED v1.0 | `165408f` (richer sections) + `423e399` (correction P2028); smoke test `/viec-lam/EXTRA-2026-010` HTTP 200. |

### 5.2 Có thể bắt đầu ngay (next candidates)

| Task | Lý do | Lock |
|---|---|---|
| **N1 PlacementCase/Placement foundation** | LaborProfile + EmploymentEpisode migrations đã applied; Worker model sẵn; RLS enabled; PlacementCase model CHƯA CÓ → cần design. **Đây là next domain task** theo TIER0_HANDOVER.md §N0. | Mở sau khi N0 v1.1 ACCEPTED. |
| **AV6 HomepageSection CMS** | Media foundation (AV4) đã sẵn; HomepageSettings (AV1) đã sẵn; chỉ thiếu `HomepageSection` model + API + admin editor. **Lock**: tận dụng `MediaAssignment` (polymorphic) để gán media vào section. | Mở song song với N1 nếu dùng worktree tách (không cùng sửa schema). |
| **AV2 JobPosting editor shell** | JobPosting model + RLS đã tồn tại; có thể dựng editor UI cho `description`/`requirements`/salary range. **Lock KHÔNG ĐƯỢC**: publish chỉ được sau N3 ServiceModel (y10.3 / DEC-08). | Dựng shell + draft state; publish flow chờ N3. |
| **clientCompanyName reconciliation script** | Migration backfill đã chạy 11/09, nhưng không có script để verify post-rename consistency. Có thể chuẩn bị (không chạy production). | Tier 1 có thể chuẩn bị script idempotent, đợi Owner chạy maintenance window. |

### 5.3 AV2 editor shell — dependency lock rõ

- AV2 có thể dựng editor shell cho JobPosting nhưng **không được publish trước N3 ServiceModel**
- Editor lưu vào `JobPosting.draftState` (JSON) hoặc cột riêng — không touch lifecycle state.
- Publish chỉ chuyển draft → published khi `Placement`/`PlacementCase` model đã sẵn sàng và invariant concurrency-safe.

### 5.4 AFF chưa triển khai trên authority cũ

- AFF chưa triển khai trên timing/assignment authority cũ (`ProjectAssignment` MP-3C)
- N3 ServiceModel sẽ chuyển sang `Placement`/`PlacementCase` model mới
- **Không biến seed data PRJ-2026-* / EXTRA-2026-* thành Placement thực thể**

### 5.5 N1/N2/N3 schema work

- **Mở sau khi N0 v1.1 ACCEPTED** ✅
- N1 (PlacementCase) là natural next; cần Owner review schema trước khi viết migration.

---

## 6. Bằng chứng nguồn

- `prisma/schema.prisma` — 56 models + 10 enums (verified bằng grep)
- `prisma/migrations/` — 35 SQL migration files
- `prisma/seed.mjs` — seed classification evidence
- `scripts/seed-public-jobs.mjs` — PRJ-2026-* seed
- `prisma/seed-extra-jobs.sql` — extra seed
- `app/(portal)/page.tsx` — homepage data sourcing (bestJobsPageSize)
- `app/(jobs)/viec-lam/page.tsx` — listing page (listingPageSize)
- `app/admin/settings/page.tsx` + `admin-settings-form.tsx` — admin settings UI
- `app/api/projects/route.ts` (POST) — Project create với derive projection
- `app/api/projects/[id]/route.ts` (PUT) — Project update với derive projection
- `app/api/clients/[id]/route.ts` (PUT) — ClientCompany update propagate projection
- `app/api/public/homepage-settings/route.ts` — public read
- `app/api/admin/homepage-settings/route.ts` — admin write
- `app/api/admin/media/*.ts` (7 files) — Media CRUD + assignment API
- `app/api/public/media/route.ts` — public read assigned media
- `src/domains/media/media.service.ts` — Media service
- `src/domains/media/safe-render.ts` — HTML sanitizer
- `app/admin/media/page.tsx` + `media-library-client.tsx` — admin media UI
- `src/shared/auth/with-db-context.ts` — RLS transaction helper (boundary guarantee)

---

## Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 11/09/2026 14:00 | Tier 1 | N0 initial — read-only discovery complete |
| v1.1 | 12/09/2026 12:05 | Tier 1 | Re-audit sau AV1 + AV4 + projection consistency đã ship; cập nhật §1.1, §1.4, §2.2, §2.10, §2.12, §2.13, §3.1, §3.3, §3.4, §4.1, §4.2, §4.3, §4.4, §5. |
