# TASK: hrp-phase4-vertical-slices

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase4-vertical-slices` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.7` |
| Status | `REVISION_REQUIRED` |
| Planner | Tier 1 — Planner (Product & Architecture Decision Owner) |
| Executor | Tier 2 (agent ngoài — sếp giao qua Cursor) |
| Auditor | Tier 3 (independent context) |
| Baseline | `5488516` — Phase 3 Integrity ACCEPTED (16/08, PASS 8/8 AC, vitest 325/325) |
| Modules | M2 (Job Board), M3 (CRM/Staffing), M4 (Đối soát), M5 (Vận hành lao động), M7 (Chấm công), M8 (Statement) |
| ADR references | ADR-010 (BigInt VND nguyên), ADR-011 (5 state machine), ADR-013 (LOCKED bất biến → adjustment), ADR-014 (Ticket SM — pattern tái dùng) |
| Current execution round | 1 (đã đóng — STEP-21/AC-17) → 2 (đã đóng — STEP-01..06) → 3 (đã đóng — STEP-07, `e3a7977`) → 4 (đã đóng — core 4B STEP-08..12, `a8f77e3`) → 5 (đã đóng — REVISION_REQUIRED: xem §9 F5-01..F5-06) → 5.1 (chờ /code: dứt điểm 4B) |
| Current audit round | 5 (không có Tier 3 audit round 5 — đóng theo lệnh sếp + Planner tự verify Iron Rule 4; Tier 3 sẽ audit round 5.1) |
| Next gate | `/code` (round 5.1 REVISION: fix RLS + service + idempotency + drawer UI) → `/audit` → `/resolve` → `ACCEPTED` (4B) → round 6 (Slice 4C) |
| Updated | 2026-08-17 17:35 ICT |

## 1. Outcome

### User-visible outcome

Sau Phase 4 (6 tuần, 4 slice × 1.5 tuần — PHASE_KHOAHOC §4), nội bộ HRP chạy được **1 vòng nghiệp vụ khép kín đúng kịch bản mockup F00A (16 bước, 00:00–13:00)**, với 3 mandatory demo moments:

- **4A Staffing Fill** — HR tạo Staffing Order → Guided Transfer điền nhân sự, Referral Guard chặn + override theo SOP S1/S2/S3 → worker có assignment ACTIVE duy nhất, quota 2 project cập nhật cùng transaction. *Moment 1: Guided Transfer 02:10–03:10.*
- **4B Attendance Lock** — import chấm công → phân loại 6 lỗi taxonomy (G29) đúng chủ xử lý → resolve ngoại lệ → maker-checker Review → Approve → Lock kỳ. *Moment 2: Exception → Lock 06:20–08:30.*
- **4C Dual Reconciliation** — sinh statement kép vendor payable / client receivable + margin → vendor preview (rate+qty+amount, margin ẩn) → dispute ≤ 2 vòng + SLA 3 ngày → FORCE LOCK. *Moment 3: Dual Reconciliation 09:30–13:00.*
- **4D Job Board polish** — worker nộp đơn từ link public → CandidateSubmission + SourceClaim accepted duy nhất 1/worker (skeleton từ Phase 0 → S05).

**Exit criteria (PHASE_KHOAHOC §4):** HR + PM + Accountant tạo được 1 statement cuối kỳ và **khóa** được nó, đi qua đủ cả 4 slice.

### Non-goals

- Không deploy production (apply migration/RLS/cron production theo runbook DEC-05/DEC-08 là việc ops riêng, không thuộc task này).
- Không sinh PDF statement, không link statement online cho khách (Q#25 → P2, sau demo).
- Không payroll tính lương/thuế đầy đủ (M9 Phase sau), không eKYC NFC, không mobile CTV.
- Không deploy domain public cho Job Board (chạy nội bộ + route public sẵn sàng; domain là P2).
- Không sửa logic Phase 0–3 đã ACCEPT trừ nơi contract này chỉ định **extend**; không đụng `appBCC/*` (khu vực sếp), không đụng file vùng cấm auth (`jwt.ts`, `password.ts`, `user.ts`, `auth-context.ts`, `require-permission.ts`).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | docs/PHASE_KHOAHOC_V1.md:165-227 | Phase 4 = 4 slice × 1.5 tuần; mỗi slice 4.1 migration → 4.2 service+repo+permission → 4.3 route+UI mount → 4.4 integration test 4-role → 4.5 E2E mockup click-path → 4.6 demo sếp; DoD + exit criteria rõ | Cấu trúc STEP + AC theo đúng 6 bước/slice |
| `EV-02` | docs/tasks/hrp-v4-bod-mockup/mockup/F00A_DemoNarrative.html | 16 bước click-path 00:00–13:00; 3 mandatory moments: Guided Transfer 02:10–03:10, Exception→Lock 06:20–08:30, Dual Reconciliation 09:30–13:00 | E2E test phải bám đúng narrative này |
| `EV-03` | docs/tasks/hrp-v4-bod-mockup/DECISION_LOG.md | D01–D16 (D05 override maker-checker, D07 3 blockers, D08 vendor preview ẩn margin, D10 margin Director+Accountant, D16-b outbox in-process + cron) | DEC-06/07/11/12/13 khớp D-log |
| `EV-04` | docs/UNIFIED_PLAN_v4.md v4.22 (§7.2, §8.2, §9.3.1, §9.9, §11.3, §12.1-12.3) | Referral Guard R1/R2/R3 + SOP S1/S2/S3; assignment 1-ACTIVE G14 + bulk G15; statement workflow dispute ≤2 + SLA 3 ngày + FORCE LOCK G17-B1; chấm công 3 tầng + import taxonomy G29 + blockers D07 | Nội dung nghiệp vụ các RQ |
| `EV-05` | prisma/schema.prisma | Đủ model: StaffingOrder:357, StaffingOrderSlot:375, Site:400, Vendor:420, CandidateSubmission:437, SourceClaim:470, ProjectAssignment:499, AttendanceImportBatch:534, AttendanceImportRow:558, AttendanceEvent:615, TimesheetPeriod:638, TimesheetLine:655, TimesheetAdjustment:680, Contract:697, VendorRateCard:732, ClientRateCard:748, VendorStatement:768, VendorStatementLine:788, ClientStatement:802, ClientStatementLine:822 | Không cần tạo bảng mới; chỉ migration additive nếu cần index/permission/RLS |
| `EV-06` | src/shared/integrity/{audit,idempotency,outbox,state-machine}.ts (+ .test.ts) | 4 generic helper Phase 3 đã ACCEPT, có test | DEC-03: 5 SM tái dùng state-machine.ts |
| `EV-07` | src/shared/auth/permission-catalog.ts:37-90, scopes/{worker,project,vendor,ctv}.scope.ts, with-auth-scope.ts, with-db-context.ts, worker-projection.ts | 8 permission CAN_* (CAN_VIEW_WORKER_SENSITIVE, CAN_FORCE_LOCK_STATEMENT:62, CAN_OVERRIDE_REFERRAL_GUARD:67, CAN_APPROVE_PAYROLL:57, CAN_VIEW_UNASSIGNED_POOL:47…), scope 4 role sẵn | Permission/scope mới chỉ thêm entry, không viết lại |
| `EV-08` | src/shared/ui/{data-table,entity-card,role-guard,sheet,view-toggle}/ | 5 shared UI component Phase 0 sẵn | DEC-02: UI tái dùng, không dựng lại |
| `EV-09` | app/api/{auth,me,tickets,workers}/; không có app/admin; package.json | API hiện có 4 nhánh; app/admin chưa tồn tại (V4 §4.2 yêu cầu); KHÔNG có framework E2E (chỉ vitest) | UI mount app/admin/*; E2E click-path = integration test gọi route handler trực tiếp trong vitest |
| `EV-10` | prisma/migrations/2026081621*_s1_rls_{worker,project,vendor}/migration.sql | RLS ĐÃ phủ 15 bảng: workers + dependents/source_claims/project_assignments/tickets/ticket_comments/ticket_notifications; outsourcing_projects + sites/**staffing_orders**/contracts; vendors + **candidate_submissions**/vendor_statements/vendor_statement_lines. THIẾU: `staffing_order_slots`; attendance_import_batches/rows, attendance_events, timesheet_periods/lines/adjustments, client_statements/lines | 4A chỉ thiếu `staffing_order_slots` (DEC-15, STEP-21); 4B/4C tự mang policy theo slice |
| `EV-11` | Planner tự chạy 17/08 08:28 | Baseline sanity GREEN: `npx vitest run` → 19 files, 325/325 PASS exit 0 (26.5s); `npm run build` → exit 0 | Trả lời Q4.1 TIER2-REPORT: KHÔNG cần Tier 2 chạy lại sanity — evidence đã có trong contract |
| `EV-12` | prisma/seed.mjs:1-80 + src/domains/attendance/ticket.service.test.ts:1-30 | Seed Phase 0 dùng mock data chuẩn (An Phat/Yen Phong/Sao Viet, phone masked `09x****xxx`, không PII thật) + mode `--check`; test Phase 3 dùng **Prisma mock in-memory** — không cần DB thật | DEC-16: unit/integration test dùng mock; seed dev DB chỉ cho demo tay |
| `EV-13` | docs/tasks/hrp-v4-bod-mockup/mockup/F00A_DemoNarrative.html + stitch/warm_professionalism/DESIGN.md | Cả 2 file ĐỀU tồn tại (Tier 2 khảo sát thiếu — đã verify bằng `ls` 17/08) | Trả lời Q3.1/Q3.2 TIER2-REPORT: Tier 2 dùng đúng 2 path này |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Slice tuần tự 4A→4B→4C→4D; mỗi slice khép kín đủ 4.1→4.6 (code + test + demo script) trước khi sang slice sau; commit riêng từng slice | PHASE_KHOAHOC §4 / Planner | Hiệu lực cả task |
| `DEC-02` | CHOSEN | UI nội bộ mount `app/admin/*` (V4 §4.2), tái dùng src/shared/ui; design "Warm Professionalism" (G27, stitch/warm_professionalism/DESIGN.md) | UNIFIED_PLAN §4.2 / Planner | Hiệu lực cả task |
| `DEC-03` | CHOSEN | 5 state machine (profile/submission/employment/assignment/risk + timesheet + statement) xây TRÊN `src/shared/integrity/state-machine.ts` (Phase 3 generic) — cấm viết lại SM mới | ADR-011 + EV-06 / Planner | Hiệu lực cả task |
| `DEC-04` | ASSUMPTION | Import MVP upload trực tiếp KHÔNG qua R2 (repo không có mã storage; D16-b: drain in-process + cron). Giới hạn file ≤ 4.5MB (Vercel body limit); `fileHash` SHA-256 vẫn ghi; `fileUrl` để null MVP | D16-b + EV-09 / Planner | Sếp xác nhận tại demo 4B |
| `DEC-05` | CHOSEN | Rate theo VendorRateCard/ClientRateCard (contract + effectiveFrom); statement line chốt **rate snapshot tại thời điểm công** (cột `rate`) | §10.2 + schema:788-799 / Planner | Hiệu lực cả task |
| `DEC-06` | CHOSEN | Margin visibility D10: thêm permission `CAN_VIEW_STATEMENT_MARGIN` vào permission-catalog.ts (mặc định ADMIN + ACCOUNTANT, PM ẩn); UI dùng role-guard | D10 / Planner | Hiệu lực cả task |
| `DEC-07` | CHOSEN | Statement theo §11.3 + schema: DRAFT→SENT→DISPUTED→CONFIRMED→LOCKED→PAID; `dispute_count` ≤ 2; `confirm_deadline_at` = sentAt + 3 ngày → cron AUTO-CONFIRMED; FORCE LOCK = `CAN_FORCE_LOCK_STATEMENT`; sau LOCKED bất biến → mọi sửa đổi qua adjustment line (ADR-013) | §11.3 + G17-B1 / Planner | Hiệu lực cả task |
| `DEC-08` | CHOSEN | Guided Transfer §9.9: `pg_advisory_xact_lock(hashtext(workerId))`, bất biến 1-ACTIVE (G14), đóng assignment cũ TRANSFERRED + validTo + mở mới + quota `filled` 2 project trong **1 transaction**; bulk G15 = savepoint/người | §9.9 / Planner | Hiệu lực cả task |
| `DEC-09` | CHOSEN | Referral Guard: R1 IN_7D_WINDOW (7 ngày, config `REFERRAL_GUARD_DAYS`), R2 COMMISSION_ACTIVE, R3 VENDOR_PAYROLL_ACTIVE → `blockCode`; override SOP S1/S2/S3 cần `CAN_OVERRIDE_REFERRAL_GUARD` + lý do + bằng chứng + audit | §9.3.1 / Planner | Hiệu lực cả task |
| `DEC-10` | CHOSEN | SourceClaim `accepted` duy nhất 1/worker: enforce ở service + partial unique index (migration additive) | schema:470-497 / Planner | Hiệu lực cả task |
| `DEC-11` | CHOSEN | Import taxonomy 6 lỗi (V4.21 G29 §12.3): LỖI ĐỊNH DẠNG/MÃ LẠ/THIẾU CHECK-IN-OUT → KT; TRÙNG CCCD → HR; NGOÀI CA/TRÙNG SCAN → PM. 3 blockers D07 (UNMATCHED_EMPLOYEE, SOURCE_CONFLICT, WRONG_PROJECT) chặn COMMIT — không chặn upload/preview | G29 + D07 / Planner | Hiệu lực cả task |
| `DEC-12` | CHOSEN | TimesheetPeriod SM PENDING→REVIEWED→APPROVED→LOCKED, maker-checker D06 (maker ≠ checker); mở lại sau LOCKED → version+1 (F21); re-import idempotent nhờ UNIQUE(source, external_event_id) + payload_hash | §12.1-12.3 + D06 / Planner | Hiệu lực cả task |
| `DEC-13` | CHOSEN | Test 4-role = ADMIN, HR_STAFF, VENDOR, WORKER — tái dùng scopes/ + matrix-scope pattern Phase 2 | EV-07 / Planner | Hiệu lực cả task |
| `DEC-14` | CHOSEN | Fixture giả hoàn toàn — CẤM dữ liệu thật (PII/CCCD/lương thật); nhân vật mockup (Mai, AP-QM-1048, kỳ 08/2026) dùng làm fixture để tái hiện 3 moment | Iron Rule 4 + EV-02 / Planner | Hiệu lực cả task |
| `DEC-15` | CHOSEN | RLS spec (trả lời Q1.1–Q1.3 TIER2-REPORT): (a) Round 1 CHỈ thiếu `staffing_order_slots` — STEP-21 migration additive: ENABLE + FORCE RLS, policy `hrp_staffing_order_slot_scope` TO `app_user_writer, app_user`, USING/WITH CHECK qua EXISTS (`staffing_orders.project_id` → `hrp_project_visible_for`/`hrp_project_writable`) — mirror pattern `vendor_statement_lines` (s1_rls_vendor §4). `staffing_orders`, `candidate_submissions`, `source_claims` ĐÃ có policy Phase 2 — cấm viết lại. (b) 4B/4C: mỗi slice mang migration RLS cho bảng mình dùng, cùng pattern + deny-by-default: attendance_*/timesheet_* scope theo project (`hrp_project_visible_for`) + ADMIN/HR/ACCOUNTANT; client_statements/lines chỉ nội bộ ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT/SALE (chưa có client portal → chưa có client GUC). (c) Production apply vẫn defer theo runbook DEC-05/DEC-08 — KHÔNG thuộc task này | EV-10 + data-scope-security §5 / Planner | Hiệu lực cả task |
| `DEC-16` | CHOSEN | Fixture spec (trả lời Q2.1): unit + integration test dùng **Prisma mock in-memory** (pattern `ticket.service.test.ts`) — KHÔNG cần DB thật; ID cố định `seed-mai-001`, `seed-prj-ap-qm-1048`… khai báo trong fixture module `src/domains/{staffing,attendance,reconciliation}/fixtures.ts`. Demo tay trên dev DB dùng `scripts/seed-phase4-fixture.cjs` extend convention seed.mjs (phone masked, không PII thật, idempotent upsert) | EV-12 / Planner | Hiệu lực cả task |
| `DEC-17` | CHOSEN | UI spec (trả lời Q3.2): bám narrative F00A_DemoNarrative.html (16 bước) + tokens Warm Professionalism (stitch/warm_professionalism/DESIGN.md — đã có sẵn); round 1 UI = skeleton đủ render narrative (shared/ui + text/button/table), design polish để round sau — chấp nhận khuyến nghị Tier 2 | EV-13 / Planner | Hiệu lực cả task |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Staffing Order: CRUD StaffingOrder (code unique), trạng thái OPEN\|CLOSING_SOON\|CLOSED\|CANCELLED; slot có shiftStart/End; `slotsFilled` (denormalized O9) cập nhật cùng transaction với fill | Must | EV-05:357-398 | 409 khi code trùng; không thể fill quá slot còn trống |
| `RQ-02` | Guided Transfer: chuyển worker giữa project theo §9.9 — advisory lock, đóng assignment cũ TRANSFERRED + validTo, mở mới ACTIVE + validFrom (half-open), `Project.filled` 2 project +1/-1 trong 1 transaction | Must | EV-04 §9.9 / DEC-08 | Bất biến 1-ACTIVE: nếu có 2 ACTIVE cùng worker → rollback toàn bộ, 409 |
| `RQ-03` | Referral Guard: khi tạo submission/assignment qua vendor/CTV kiểm tra R1/R2/R3 → `blockCode` + `overrideCase` S1\|S2\|S3; override cần `CAN_OVERRIDE_REFERRAL_GUARD` + lý do + bằng chứng + audit | Must | EV-04 §9.3.1 / DEC-09 | Không override → 409 + blockCode rõ; override thiếu quyền → 403 |
| `RQ-04` | Bulk transfer (G15): N worker 1 lệnh, savepoint từng người, báo cáo chi tiết thành công/thất bại mỗi người | Should | EV-04 §9.9 G15 | Người lỗi không làm hỏng cả lô |
| `RQ-05` | Talent Pool: danh sách worker chưa assign (`CAN_VIEW_UNASSIGNED_POOL`), lọc theo kỹ năng/vị trí | Must | D03 + EV-07:47 | Không có quyền → 403 |
| `RQ-06` | Import chấm công: upload CSV/XLSX (≤4.5MB) → AttendanceImportBatch PENDING→PREVIEWED; phân loại 6 lỗi taxonomy G29 đúng chủ xử lý (KT/HR/PM); thống kê totalRows/matched/unmatched/anomaly | Must | G29 §12.3 / DEC-11 | File quá hạn mức/không parse được → 400 + thông báo rõ, batch FAILED |
| `RQ-07` | Blockers: 3 blockers D07 (UNMATCHED_EMPLOYEE, SOURCE_CONFLICT, WRONG_PROJECT) — khi còn blocker chưa resolve, KHÔNG thể chuyển batch sang COMMITTED | Must | D07 / DEC-11 | COMMIT bị chặn → 409 kèm danh sách blocker |
| `RQ-08` | Events append-only: AttendanceEvent UNIQUE(source, external_event_id) + payload_hash → import lại cùng file không tạo event trùng; receivedAt − capturedAt > 15' → risk flag | Must | EV-05:615-636 / DEC-12 | Re-import idempotent tuyệt đối (schema unique) |
| `RQ-09` | Timesheet maker-checker: period PENDING→REVIEWED→APPROVED→LOCKED; maker ≠ checker; mở lại sau LOCKED → version+1 (F21), dữ liệu cũ giữ nguyên | Must | §12.2 + D06 / DEC-12 | Transition sai → IllegalTransitionError → 409 (pattern Phase 3) |
| `RQ-10` | Resolve drawer: exception → TimesheetAdjustment (deltaHours, reason, createdBy) + audit; ngoài ca/trùng scan resolve theo chủ xử lý PM | Must | EV-05:680-691 + D06 | Không có reason → 400 |
| `RQ-11` | Statement generate: từ timesheet LOCKED → 2 luồng độc lập VendorStatement (payable, rate VendorRateCard) + ClientStatement (receivable, rate ClientRateCard); line lưu rate snapshot + hours + amount BigInt VND (ADR-010) | Must | EV-05:768-834 / DEC-05 | Timesheet chưa LOCKED → 409, không sinh được |
| `RQ-12` | Margin = Σ client − Σ vendor; hiển thị theo DEC-06 (`CAN_VIEW_STATEMENT_MARGIN`: ADMIN + ACCOUNTANT; PM ẩn) | Must | D10 / DEC-06 | Không có quyền → cột margin không render (role-guard) |
| `RQ-13` | Statement workflow §11.3: dispute ≤ 2 vòng, confirm_deadline_at = sentAt + 3 ngày, cron auto-confirm quá hạn; FORCE LOCK = `CAN_FORCE_LOCK_STATEMENT` | Must | §11.3 + G17-B1 / DEC-07 | Dispute vòng 3 → 409; quá hạn không auto-confirm → tìm được lý do ở cron test |
| `RQ-14` | Vendor preview: vendor xem statement của mình — rate + qty + amount, **margin ẩn** (D08); lineage drawer truy vết line ← timesheet ← event | Must | D08 / DEC-06 | Vendor thấy margin → FAIL AC |
| `RQ-15` | LOCKED bất biến: sau LOCKED, mọi sửa đổi qua adjustment line mới (ADR-013), cấm UPDATE line cũ | Must | ADR-013 / DEC-07 | UPDATE trực tiếp line đã lock → 409 |
| `RQ-16` | Job Board: route public listing Project `isPublic`, chi tiết slot, form apply → CandidateSubmission (guard R1/R2/R3 vẫn áp dụng); blockCode/overrideCase lưu đúng | Must | EV-05:327-355,437-469 / DEC-09 | Apply khi guard chặn → blockCode ghi nhận, không tạo assignment |
| `RQ-17` | SourceClaim: `accepted` duy nhất 1/worker (partial unique index); claimType HRP_DIRECT\|VENDOR_SUPPLIED\|CTV_REFERRAL; dedup gợi ý theo phone/cccd | Must | EV-05:470-497 / DEC-10 | Claim thứ 2 accepted cùng worker → 409 |
| `RQ-18` | Permission/4-role: mọi route mới qua require-permission + RLS context (with-auth-scope/with-db-context); test 4 role ADMIN/HR_STAFF/VENDOR/WORKER mỗi slice | Must | EV-07 / DEC-13 | Thiếu quyền → 403; scope sai → không thấy dữ liệu |
| `RQ-19` | Integrity: mọi POST/PATCH mới bọc withIdempotency + audit (reason/ip_address/user_agent) + outbox cho notification; IllegalTransitionError → 409 | Must | EV-06 (pattern Phase 3) | Gọi lại idempotent → 1 hiệu ứng; thiếu audit → FAIL AC |
| `RQ-20` | Regression: vitest toàn bộ green (baseline 325 + mới), `npm run build` exit 0, `npx prisma validate` exit 0, vùng cấm sạch | Must | EV-11 / Iron Rule 4 | Bất kỳ test đỏ → BLOCKED handoff |
| `RQ-21` | RLS cho bảng slice dùng: `staffing_order_slots` (4A, STEP-21) + attendance/timesheet/client statements (4B/4C, mỗi slice tự mang) — migration additive, ENABLE+FORCE, policy TO app_user_writer, app_user, reuse helper Phase 2, deny-by-default ngoài scope | Must | EV-10 / DEC-15 | Role ngoài scope → 0 row (không leak, không 403 giả) |

### 4.2 Scope boundaries

**In scope:**

- `prisma/migrations/` — migration additive (index partial SourceClaim, permission `CAN_VIEW_STATEMENT_MARGIN` seed, RLS policy thiếu cho bảng slice dùng — kế pattern Phase 2).
- `src/domains/staffing/` (mới), `src/domains/attendance/` (extend — import/timesheet/statement), `src/domains/reconciliation/` (mới: statement + margin).
- `src/shared/auth/permission-catalog.ts` — thêm entry `CAN_VIEW_STATEMENT_MARGIN` (không đổi permission cũ).
- `app/api/*` — route mới: staffing-orders, transfers, talent-pool, attendance-import, timesheets, statements (vendor/client), disputes, job-board apply.
- `app/admin/*` — UI nội bộ (Control Tower → Staffing → Chấm công → Đối soát theo narrative), tái dùng src/shared/ui.
- `app/` route public Job Board (isPublic).
- Test + fixture giả + demo script 3 moment (HANDOFF §runbook).

**Out of scope:**

- `appBCC/*` (khu vực sếp) — CẤM đụng.
- Vùng cấm auth: `src/shared/auth/{jwt,password,user,auth-context,require-permission}.ts` — CẤM sửa.
- `.env`, deploy production, cron production, R2/storage, PDF statement, payroll M9, eKYC, mobile CTV.
- Dữ liệu thật (xlsx/CCCD/lương) — CẤM commit.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Tiền BigInt VND nguyên (ADR-010); giờ Decimal(5,2)/(8,2) theo schema; mọi `rate` ở statement line là snapshot; khoảng thời gian half-open `[validFrom, validTo)`; fixture CẤM PII thật.
- **State:** SM qua `state-machine.ts` — assignment (PLANNED|ACTIVE|PAUSED|ENDED|TRANSFERRED|CANCELLED, bất biến 1-ACTIVE), timesheet period (PENDING|REVIEWED|APPROVED|LOCKED + version), statement (DRAFT→SENT→DISPUTED→CONFIRMED→LOCKED→PAID, dispute ≤2), batch import (PENDING|PREVIEWED|COMMITTED|FAILED); LOCKED → bất biến (ADR-013); IllegalTransitionError → 409.
- **Permission/data scope:** role qua permission-catalog + scopes/ (worker/project/vendor/ctv); margin chỉ ADMIN/ACCOUNTANT (DEC-06); vendor chỉ thấy statement của mình (scope vendor); worker thấy data của mình (worker-projection).
- **Interface:** route mới theo pattern Phase 2/3 (require-permission + withIdempotency + withAuthScope); UI dùng shared/ui + design Warm Professionalism; Job Board là page public không cần login.
- **Failure/idempotency/concurrency:** advisory lock §9.9 — cấm await ngoài DB trong khóa; re-import idempotent (unique constraint); POST/PATCH bọc idempotency; outbox drain in-process + cron (D16-b).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-18,19 | app/admin/layout + nav | Khung UI nội bộ + mount 4 nhóm trang (Staffing/Chấm công/Đối soát/Job Board) + role-guard | EV-08, EV-09 | `npm run build` exit 0 | Build đỏ |
| `STEP-21` | RQ-21 | prisma/migrations/2026xxxx_s1_rls_phase4/migration.sql | **[Chạy ngay sau STEP-01, trước STEP-02]** Migration RLS `staffing_order_slots` theo DEC-15(a): ENABLE + FORCE + policy `hrp_staffing_order_slot_scope` EXISTS qua staffing_orders.project_id (reuse `hrp_project_visible_for`/`hrp_project_writable`) | EV-10, pattern s1_rls_vendor §4 | `npx prisma migrate dev` trên DATABASE_URL_DEV + query verify: VENDOR/PM ngoài scope → 0 slot; SQL additive-only | Policy thiếu hoặc leak row ngoài scope |
| `STEP-02` | RQ-01 | src/domains/staffing/order.service.ts + prisma/migrations | Service StaffingOrder + slot + `slotsFilled` cùng transaction (O9); migration nếu thiếu index | EV-05:357-398 | `npx vitest run src/domains/staffing` exit 0 | Quota/fill lệch |
| `STEP-03` | RQ-02 | src/domains/staffing/transfer.service.ts | Guided Transfer §9.9: advisory lock + 1-ACTIVE + quota 2 project 1 tx | DEC-08, state-machine.ts | vitest chứng minh 1-ACTIVE + rollback | Không atomic |
| `STEP-04` | RQ-03 | src/domains/staffing/referral-guard.service.ts | R1/R2/R3 + override S1/S2/S3 + audit + REFERRAL_GUARD_DAYS config | DEC-09 | vitest 3 rule + 3 override case | Guard bỏ sót case |
| `STEP-05` | RQ-04,05 | src/domains/staffing/bulk-transfer.service.ts + talent-pool.repo.ts | Bulk savepoint/người + pool query `CAN_VIEW_UNASSIGNED_POOL` | RQ-02,03 | vitest bulk (1 người lỗi → người khác vẫn ok) | Lô hỏng toàn bộ |
| `STEP-06` | RQ-01..05 | app/api/{staffing-orders,transfers,talent-pool} + app/admin/staffing | Route + UI S01→S02→S02A→S02B (Control Tower → Staffing → Guided Transfer drawer → Referral Guard timeline + override) | EV-02 bước 1-5 | build + vitest route; UI mở tay theo narrative | UI không khớp mockup |
| `STEP-07` | RQ-18,19 | tests 4-role + E2E slice 4A | 4-role test + integration test narrative bước 1-5 (moment 02:10–03:10) | DEC-13 | `npx vitest run` slice 4A exit 0 | 4-role thiếu role |
| `STEP-08` | RQ-06 | src/domains/attendance/import.service.ts | Upload ≤4.5MB (DEC-04) → parse CSV/XLSX → batch PENDING→PREVIEWED + taxonomy 6 lỗi G29 + chủ xử lý | DEC-11, EV-05:534-577 | vitest 6 loại lỗi đúng chủ | Phân loại sai chủ |
| `STEP-09` | RQ-07,08 | src/domains/attendance/import-commit.service.ts | 3 blockers chặn COMMIT; commit → AttendanceEvent append-only idempotent + payload_hash + risk flag 15' | DEC-11,12 | vitest blocker chặn + re-import 2 lần → 1 bộ events | Import trùng event |
| `STEP-10` | RQ-09,10 | src/domains/attendance/timesheet.service.ts | TimesheetPeriod maker-checker SM + lock + version; resolve drawer → TimesheetAdjustment + audit | DEC-12, D06 | vitest transition 409 + version+1 | Maker=checker pass |
| `STEP-11` | RQ-06..10 | app/api/{attendance-import,timesheets} + app/admin/attendance | Route + UI S03→S03B→S03_Resolve (Workbench 7 exceptions → Resolve drawer map AP-QM-1048→Mai → maker/checker → Lock) | EV-02 bước 6-10 | build + vitest route; UI theo narrative | UI thiếu bước lock |
| `STEP-12` | RQ-18,19 | tests 4-role + E2E slice 4B | 4-role test + integration test narrative bước 6-10 (moment 06:20–08:30) | DEC-13 | vitest slice 4B exit 0 | Moment không tái hiện được |
| `STEP-13` | RQ-11 | src/domains/reconciliation/statement.service.ts | Generate 2 luồng từ timesheet LOCKED + rate snapshot + BigInt amount; chặn khi chưa LOCKED | DEC-05, ADR-010 | vitest amount đúng từ fixture rate | Rate sai snapshot |
| `STEP-14` | RQ-12,14 | src/domains/reconciliation/margin.service.ts + vendor-preview | Margin = Σ client − Σ vendor; visibility `CAN_VIEW_STATEMENT_MARGIN` (thêm entry catalog + seed); vendor preview ẩn margin + lineage drawer | DEC-06, D08 | vitest VENDOR không thấy margin | Vendor lọt margin |
| `STEP-15` | RQ-13,15 | src/domains/reconciliation/dispute.service.ts + cron | Dispute ≤2 + confirm_deadline_at 3 ngày + cron AUTO-CONFIRMED (fake timer); FORCE LOCK; LOCKED → adjustment line (ADR-013) | DEC-07, D16-b | vitest dispute 3 → 409 + SLA auto-confirm + force lock | SLA không tự chạy |
| `STEP-16` | RQ-11..15 | app/api/{statements,disputes} + app/admin/reconciliation | Route + UI S04→S04A→S04B (split vendor payable/client receivable + margin → lineage → dispute form reason+attachment) | EV-02 bước 11-16 | build + vitest route; UI theo narrative | Thiếu lineage/dispute |
| `STEP-17` | RQ-18,19 | tests 4-role + E2E slice 4C | 4-role test + integration test narrative bước 11-16 (moment 09:30–13:00) | DEC-13 | vitest slice 4C exit 0 | Moment không tái hiện được |
| `STEP-18` | RQ-16,17 | app/(jobs) + src/domains/staffing/submission.service.ts | Job Board public (Project isPublic + slot + apply) → CandidateSubmission + SourceClaim accepted unique (partial index) + dedup gợi ý | DEC-10, EV-05:437-497 | vitest apply + claim 2 accepted → 409 | Claim đúp accepted |
| `STEP-19` | RQ-16,17 | app/admin/jobs + polish S05 | UI admin job board + polish (skeleton Phase 0 → S05) + 4-role test slice 4D | EV-02 S05 | build + vitest slice 4D exit 0 | UI không tái dùng shared |
| `STEP-20` | RQ-20 | toàn repo | Regression: vitest all + build + prisma validate + rà vùng cấm + HANDOFF.md (runbook demo 3 moment, seed fixture, rollback, cron) | Iron Rule 4 | `npx vitest run` exit 0; `npm run build` exit 0; `npx prisma validate` exit 0; `git diff --name-only` sạch vùng cấm | Bất kỳ đỏ → BLOCKED |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01,02 | Service staffing: 1-ACTIVE bất biến, quota 2 project atomic, advisory lock có hiệu lực (test 2 lệnh song song) | `npx vitest run src/domains/staffing` | Output exit 0 + test names | Yes |
| `AC-02` | RQ-03,04 | Referral Guard 3 rule + 3 override case + bulk savepoint (1 người lỗi, lô còn lại thành công) | vitest | Output exit 0 | Yes |
| `AC-03` | RQ-06,08 | Taxonomy 6 lỗi đúng chủ xử lý; re-import cùng file 2 lần → 1 bộ events; 3 blockers chặn COMMIT | `npx vitest run src/domains/attendance` | Output exit 0 | Yes |
| `AC-04` | RQ-09,10 | Maker-checker (maker≠checker), transition sai → 409, mở lại → version+1, adjustment có reason+audit | vitest | Output exit 0 | Yes |
| `AC-05` | RQ-11,12,14 | Statement đúng từ LOCKED; margin đúng công thức; role VENDOR không thấy margin | `npx vitest run src/domains/reconciliation` | Output exit 0 | Yes |
| `AC-06` | RQ-13,15 | Dispute ≤2 (vòng 3 → 409), SLA 3 ngày auto-confirm (fake timer), FORCE LOCK, LOCKED bất biến → adjustment line | vitest | Output exit 0 | Yes |
| `AC-07` | RQ-16,17 | Apply public tạo submission; SourceClaim 2 accepted cùng worker → 409 | vitest | Output exit 0 | Yes |
| `AC-08` | RQ-18 | Mỗi slice có test 4-role ADMIN/HR_STAFF/VENDOR/WORKER (quyền + scope) và đều pass | `npx vitest run` theo slice | Output exit 0 + file test 4-role | Yes |
| `AC-09` | RQ-18,19 | E2E click-path: 3 integration test file tái hiện đúng 3 moment (4A 02:10–03:10; 4B 06:20–08:30; 4C 09:30–13:00) theo F00A | `npx vitest run` | Output exit 0 + test mô tả từng bước narrative | Yes |
| `AC-10` | RQ-19 | Mọi route POST/PATCH mới bọc idempotency + audit + outbox (grep source) | Grep + vitest | Danh sách route + helper đã bọc | Yes |
| `AC-11` | RQ-20 | `npx vitest run` toàn bộ exit 0 (≥ 325 + mới); `npm run build` exit 0; `npx prisma validate` exit 0 | Chạy lại từng lệnh | Output + exit code | Yes |
| `AC-12` | RQ-20 | Migration additive-only (không DROP/RENAME/TRUNCATE), `npx prisma migrate status` up-to-date trên DATABASE_URL_DEV | Đọc diff + lệnh | diff SQL + output | Yes |
| `AC-13` | RQ-20 | Vùng cấm sạch: `git diff --name-only` không chứa appBCC/, .env, auth core files, dữ liệu thật (xlsx/txt) | Git + grep | Output rỗng với filter | Yes |
| `AC-14` | RQ-01..17 | UI app/admin mở được 4 nhóm trang, role-guard chặn đúng, khớp narrative F00A (visual check) | Mở tay local | Screenshot/đường dẫn | Yes |
| `AC-15` | RQ-01..17 | HANDOFF.md đủ: runbook demo 3 moment, seed fixture giả, rollback, cron chạy nội bộ, quyết định implementation | Đọc HANDOFF | File đầy đủ theo template | Yes |
| `AC-16` | — | Không đụng production: không chạy migrate deploy/dev vào DATABASE_URL, không đổi RLS đã ACCEPT trừ khi thêm policy additive mới | Hỏi + log | Khai báo trong HANDOFF | Yes |
| `AC-17` | RQ-21 | Policy `hrp_staffing_order_slot_scope` tồn tại trên dev DB; migration additive-only (không DROP/ALTER phá); test role ngoài scope (vd VENDOR) SELECT slots → 0 row | Query dev DB + vitest | Output query + diff SQL additive | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02`,`STEP-06` | `AC-01`,`AC-14` |
| `RQ-02` | `STEP-03`,`STEP-06` | `AC-01`,`AC-09` |
| `RQ-03` | `STEP-04`,`STEP-06` | `AC-02`,`AC-09` |
| `RQ-04` | `STEP-05`,`STEP-06` | `AC-02` |
| `RQ-05` | `STEP-05`,`STEP-06` | `AC-08`,`AC-14` |
| `RQ-06` | `STEP-08`,`STEP-11` | `AC-03`,`AC-09` |
| `RQ-07` | `STEP-09`,`STEP-11` | `AC-03`,`AC-09` |
| `RQ-08` | `STEP-09` | `AC-03` |
| `RQ-09` | `STEP-10`,`STEP-11` | `AC-04`,`AC-09` |
| `RQ-10` | `STEP-10`,`STEP-11` | `AC-04`,`AC-09` |
| `RQ-11` | `STEP-13`,`STEP-16` | `AC-05`,`AC-09` |
| `RQ-12` | `STEP-14`,`STEP-16` | `AC-05`,`AC-09` |
| `RQ-13` | `STEP-15`,`STEP-16` | `AC-06`,`AC-09` |
| `RQ-14` | `STEP-14`,`STEP-16` | `AC-05`,`AC-09` |
| `RQ-15` | `STEP-15` | `AC-06` |
| `RQ-16` | `STEP-18`,`STEP-19` | `AC-07`,`AC-14` |
| `RQ-17` | `STEP-18` | `AC-07` |
| `RQ-18` | `STEP-01`,`STEP-07`,`STEP-12`,`STEP-17` | `AC-08`,`AC-09` |
| `RQ-19` | `STEP-06`,`STEP-11`,`STEP-16`,`STEP-18` | `AC-10` |
| `RQ-20` | `STEP-20` | `AC-11`,`AC-12`,`AC-13` |
| `RQ-21` | `STEP-21` | `AC-17` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Migration chạy nhầm vào DATABASE_URL production (Neon — dữ liệu thật) | Gõ nhầm lệnh migrate | CẤM `prisma migrate dev/deploy` vào prod; chỉ `prisma validate` + `migrate diff`; dùng DATABASE_URL_DEV | Neon branch/point-in-time restore; báo sếp ngay |
| `RISK-02` | RLS thiếu policy cho bảng slice dùng → route 403/scope sai. Đã verify 17/08 (EV-10): 4A chỉ thiếu `staffing_order_slots` (15 bảng khác đã phủ từ Phase 2); 4B/4C (attendance_*/timesheet_*/client_statements*) chưa có policy | Test 4-role đỏ | DEC-15: STEP-21 migration policy slots cho 4A; 4B/4C mỗi slice tự mang migration RLS (additive, pattern Phase 2) | Revert migration + reapply |
| `RISK-03` | File import > 4.5MB (Vercel body limit) | Khách hàng gửi file lớn | Chặn sớm ở route với thông báo rõ (400 + hướng dẫn tách file); giới hạn ghi vào HANDOFF | Sếp xác nhận giới hạn MVP (DEC-04) |
| `RISK-04` | Advisory lock gây deadlock/timeout khi transaction dài | Await ngoài DB trong khóa | Cấm await ngoài DB trong khóa (§9.9); test song song AC-01 | Timeout transaction tự rollback, thử lại idempotent |
| `RISK-05` | Cron SLA auto-confirm xung đột outbox cron | 2 cron chạy trùng giờ | 1 cron handler in-process xử lý cả 2 (D16-b), idempotent | Rerun cron bằng tay (runbook) |
| `RISK-06` | Lộ PII thật trong fixture/commit | Data thật bị seed | DEC-14: CẤM dữ liệu thật; AC-13 rà vùng cấm | Reset branch, báo sếp, xóa lịch sử nếu lỡ commit |
| `RISK-07` | Scope creep: UI không khớp mockup hoặc làm quá narrative | Slice kéo dài | Bám đúng 16 bước F00A + DoD PHASE_KHOAHOC; mọi lệch → hỏi Planner (Tier 1) | Quay về trạng thái slice trước (commit từng slice) |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Dữ liệu mẫu thật (Q#9 V4) — khi nào có để seed production? | Sếp | Trước Sprint 1 | Không — fixture giả (DEC-14) |
| `Q-02` | Apply production RLS + migration/cron (DEC-05/DEC-08) trước hay sau demo Phase 4? | Sếp | Trước demo | Không — không thuộc task này |
| `Q-03` | Giới hạn 4.5MB direct upload (DEC-04) chấp nhận cho MVP? | Sếp | Tại demo 4B | Không — assumption rõ |
| `Q-04` | Domain/URL Job Board public khi nào? | Sếp | P2 | Không |
| `Q-05` | Phạm vi polish S05 (4D) — chốt sau demo 4C | Sếp | Sau 4C | Không — contract định sẵn tối thiểu |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| — | — | — | Chưa có audit round 1 | — | — |
| 1 | — (không có finding mở) | **Verdict CONDITIONAL chấp thuận — tiếp tục round 2.** Tier 3 xác nhận STEP-21/AC-17 PASS (7/7 matrix); STEP-01..07 + AC-01/02/08/09/10/14/15 chưa đạt → round 2. Planner tự chạy lại evidence (Iron Rule 4) 17/08 09:11–09:15: `node scripts/_phase4-verify-slots-rls-strong.cjs` exit 0 (7/7); `node scripts/_phase4-verify-phase3-intact.cjs` exit 0; `npx prisma migrate status` up-to-date (10 migrations); migration SQL additive-only (ENABLE/FORCE/CREATE POLICY, mirror s1_rls_vendor §4); diff vùng cấm sạch (appBCC dirty có từ TRƯỚC round 1 — của sếp); `npx vitest run` 325/325 exit 0. **Duyệt DEC-NEW-04/05** (apply SQL trực tiếp + `prisma migrate resolve --applied` — sếp đã chấp thuận 17/08 08:35, lý do shadow DB + `portal_timesheets` raw của appBCC). **Duyệt DEC-NEW-06** (chia round 2 thành 2a/2b/2c theo budget) với điều kiện: mỗi sub-round giữ vitest + build green; round 2 chỉ đóng khi STEP-01..07 + AC-01/02/08/09/10/14/15 đạt | v1.2 (không đổi RQ/STEP/AC) | Tier 2 — round 2 (sếp giao /code) |
| 2a | — (không có finding mở) | **Verdict CONDITIONAL chấp thuận — tiếp tục round 2b.** Tier 3: STEP-01..03 đạt (admin layout + order.service + transfer.service), AC-17 PASS kế thừa round 1, AC-01..15 defer 2b/2c. Planner tự chạy lại evidence 17/08 11:06–11:12: `npx vitest run` **343/343 exit 0** (+18); `npm run build` exit 0; diff vùng cấm sạch. **Duyệt DEC-NEW-07/08/09/10** (tách `server-session.ts` read-only thay vì sửa `auth-context.ts`; advisory lock `hashtext($1::text)`; `buildStaffingOrderScope` reuse `buildProjectScope`; mở rộng Role type DIRECTOR/SALE trong role-guard — không đụng vùng cấm). **Vi phạm quy trình đã Planner khắc phục trước push:** Tier 2 stage nhầm `appBCC/agent_mapper.py` + `appBCC/app.py` (việc sếp, CẤM stage) + `docs/tasks/hrp-phase1-bcc-fence/AUDIT.md` (stray, sếp quyết) vào commit round 2a `fdebbf7`; Tier 3 bỏ sót khi chấm AC-16 PASS. Planner đã gỡ 3 file khỏi commit (nội dung nguyên vẹn trong working tree) → commit sạch `8c7fb91` + `67f5ba0`; `fdebbf7`/`760683f` bỏ (local-only, chưa push — origin/main = `cd5c2c9`, không cần force). Nhắc Tier 2: chỉ `git add` đúng file theo contract, CẤM `git add -A`/`git add .` | v1.3 (không đổi RQ/STEP/AC) | Tier 2 — round 2b (sếp giao /code) |
| 2 | — (không có finding mở) | **Verdict CONDITIONAL chấp thuận — tiếp tục round 3 (dứt điểm STEP-07).** Tier 3: STEP-01..06 đạt (referral-guard R1/R2/R3 + override S1/S2/S3 bitmask; talent-pool repo; 4 route API + UI staffing list), AC-17 PASS kế thừa, AC-01/02/14 PARTIAL, AC-08/09/10 DEFERRED (thiếu E2E), AC-16 PASS. Planner tự chạy lại 17/08 13:13: `npx vitest run` **351/351 exit 0** (+8); `npm run build` exit 0; diff vùng cấm sạch; commit `9be315d` + `abab8f6` sạch (không lặp vi phạm appBCC). **Planner phát hiện thêm (Tier 3 chưa chỉ rõ): AC-10 chưa đạt** — route POST/PATCH mới CHƯA bọc `withIdempotency`/`enqueueOutbox` (helpers Phase 3 có sẵn `src/shared/integrity/*`; pattern tham chiếu `app/api/tickets/*`). **Round 3 giao Tier 2 đúng 3 việc:** (1) STEP-07 — integration test 4-role + E2E narrative slice 4A bước 1-5 (moment 02:10–03:10) theo F00A/DEC-13; (2) bọc idempotency + outbox cho POST `/api/staffing/orders`, PATCH `/api/staffing/orders/[id]`, POST `/api/staffing/transfers` (grep source làm evidence AC-10); (3) cập nhật HANDOFF đủ 2b/2c + round 3 (Tier 3 ghi nhận thiếu). Slice 4A chỉ ACCEPT khi AC-01/02/08/09/10/14 phần 4A đạt | v1.4 (không đổi RQ/STEP/AC) | Tier 2 — round 3 (sếp giao /code) |
| 3 | — (không có finding mở) | **Verdict PASS chấp thuận — Slice 4A được nghiệm thu.** Tier 3 xác nhận STEP-07 hoàn tất (`4role-staffing.integration.test.ts` 11 tests + `e2e-staffing-narrative.integration.test.ts` 5 tests F00A bước 1-5 moment 02:10–03:10) + AC-10 hoàn tất (3 route POST/PATCH bọc `withIdempotency` header `x-idempotency-key` TTL 24h; `enqueueOutbox` StaffingOrderCreated/StatusChanged/WorkerTransferred) — 8 AC mục tiêu 4A PASS, không lậu quyền/rò rỉ dữ liệu/vi phạm vùng cấm. Planner tự chạy lại 17/08 14:17: `npx vitest run` **367/367 exit 0** (+16, 25 files); `npm run build` exit 0; diff vùng cấm sạch (commit `e3a7977` 10 files đúng scope); grep xác nhận `withIdempotency` ở 3 route + `enqueueOutbox` ở order/transfer service; E2E narrative khớp F00A bước 1-5. **Duyệt DEC-NEW-11:** bulk transfer không bọc idempotency — per-item savepoint (G15) là cơ chế fail-safe thay thế, HANDOFF-R3 đã ghi lý do; single transfer vẫn bọc đủ. **Ghi nhận:** commit `0bcf23d` (AUDIT round 3 + bcc-fence AUDIT) + `898faaa` feat(bcc) là khu vực của sếp — sếp tự commit/push, Planner không đụng. **Round 4 = Slice 4B** (STEP-08..12: import ≤4.5MB DEC-04 → taxonomy 6 lỗi G29 → 3 blockers D07 → timesheet maker-checker D06 + lock → route/UI S03→S03B→S03_Resolve → E2E 4-role moment 06:20–08:30) theo contract §5 | v1.5 (không đổi RQ/STEP/AC) | Tier 2 — round 4 (sếp giao /code) |
| 4 | — (không có finding mở) | **Verdict CONDITIONAL chấp thuận — tiếp tục round 5 để đóng 4B trước khi sang 4C.** Tier 3: core 4B đạt (import parse + taxonomy G29 trong service + 3 blockers + SM maker≠checker + 4 route API + UI attendance 3 tab + 18 test mới), AC-03/10/16 PASS, AC-04 PARTIAL; DEFER: Resolve drawer + TimesheetAdjustment (RQ-10), RLS cụm attendance/timesheet, drag&drop. Planner tự chạy lại 17/08 15:25: `npx vitest run` **385/385 exit 0** (+18, 27 files); `npm run build` exit 0; diff vùng cấm sạch; commit `a8f77e3` 11 files đúng scope (lưu ý nhỏ: subject commit bị trôi thành trailer `Co-authored-by:` — không ảnh hưởng nội dung, đã push, không sửa lịch sử). **Planner kiểm tra thêm 2 điểm Tier 3 chưa chỉ rõ:** (a) taxonomy 6 lỗi G29 đã hiện thực trong `import.service.ts` (FORMAT_ERROR/UNKNOWN_CODE/MISSING_PUNCH→KT; DUPLICATE_CCCD→HR; OUTSIDE_SHIFT/DUPLICATE_SCAN→PM) NHƯNG **chưa có test nào chứng minh** → STEP-08 verify "vitest 6 loại lỗi đúng chủ" thiếu evidence; (b) E2E narrative thiếu **bước 7** (Resolve drawer map AP-QM-1048→Mai). **Round 5 giao Tier 2 đúng 4 việc:** (1) Resolve override UI/API (nhân sự chưa khớp) + `TimesheetAdjustment` drawer reason+audit (ADR-013 LOCKED bất biến) — đóng AC-04; (2) migration RLS additive 6 bảng 4B (`attendance_import_batches/rows`, `attendance_events`, `timesheet_periods/lines/adjustments` — RQ-21/RISK-02, pattern Phase 2, apply theo DEC-NEW-04/05) + verify role ngoài scope → 0 row; (3) unit test taxonomy 6 lỗi đúng chủ + E2E bước 7 — đóng AC-03/AC-09; (4) drag&drop client-side: **KHÔNG bắt buộc đóng 4B** — Tier 3 đánh giá hợp lý MVP backend-first, Planner chấp thuận defer polish. **4B chỉ ACCEPT khi** AC-03/04/08/09/10/14 phần 4B + RLS verify đạt | v1.6 (không đổi RQ/STEP/AC) | Tier 2 — round 5 (sếp giao /code) |
| 5 | F5-01..F5-06 (Planner tự verify) | **Verdict REVISION_REQUIRED — round 5 chưa đạt, mở round 5.1 dứt điểm 4B.** Đóng round 5 theo lệnh sếp 17/08 ("398/398 Tests Passed… cho Planner đóng Round 5"); Tier 2 chưa viết HANDOFF-R5.md, chưa có Tier 3 audit round 5 → evidence = Planner tự chạy lại (Iron Rule 4) 17/08 17:12: `npx vitest run` **398/398 exit 0** (+13, 28 files); `npm run build` exit 0 — khớp xác nhận của sếp. **ĐẠT:** (1) taxonomy-unit.test.ts 12 tests đúng chủ G29 (6 lỗi → KT/HR/PM + 3 blockers) — đóng gap (a) round 4; (2) E2E bước 7 (Resolve drawer AP-QM-1048→Mai) đã thêm (+63 dòng, mở rộng mock store); (3) resolve-adjustment.service.ts — ADR-013 (LOCKED → INVALID_STATUS yêu cầu reopen F21) + reason bắt buộc (RQ-10) + writeAuditLog + enqueueOutbox đủ; (4) 2 route mới có guard role + map lỗi 401/403/404/409. **KHÔNG ĐẠT (Planner phát hiện, bắt buộc sửa trước khi apply/ACCEPT):** **F5-01** (HIGH, bảo mật) — policy `hrp_attendance_import_batch_scope`/`hrp_attendance_import_row_scope` nhánh PM: `EXISTS(SELECT 1 FROM outsourcing_projects…)` không tham chiếu row → PM nào quản bất kỳ project outsourcing nào cũng thấy/ghi TOÀN BỘ batch+rows (raw_employee_code, file_url, errors — PII), ngược với intent comment "batch không có project_id → PM không thấy"; **F5-02** (MED) — policy `hrp_attendance_event_scope` nhánh WORKER so `worker_id = hrp_session_user_id()` (uuid workers.id vs uuid app_user.id → không bao giờ khớp) → WORKER thấy 0 event; phải dùng helper Phase 2 (hrp_worker_visible_for / join workers.user_id); **F5-03** (LOW) — thiếu WITH CHECK (Phase 2 pattern có; PG fallback USING khiến PM ghi được batch — hệ quả F5-01), header migration ghi nhầm STEP-14; **F5-04** (HIGH, production-breaking) — `resolveUnmatchedRows` dòng updateMany chết với data key giả `_p0..` (không phải cột) → PrismaClientValidationError → API resolve luôn 500 khi chạy thật; test mock in-memory (DEC-14) không bắt được — xoá block thừa, giữ raw SQL bên dưới; **F5-05** (MED, AC-10) — 2 route mới chưa bọc `withIdempotency` (POST adjustments không chốt chống double-submit; PATCH resolve châm chước DEC-NEW-11 nếu muốn); **F5-06** (MED, contract) — UI Resolve drawer CHƯA có (`app/admin/attendance/page.tsx` chỉ 2 dòng comment) → AC-04/AC-14 phần 4B chưa đủ; bước 7 là mandatory demo moment 06:20–08:30 → KHÔNG defer. Ghi nhận: migration CHƯA apply lên dev DB (`prisma migrate status`: pending) — SQL lỗi chưa live ở đâu; apply-changes.mjs + write_script.py ở repo root là script tạm Tier 2 (KHÔNG commit, sếp quyết). **Round 5.1 giao Tier 2 đúng 5 việc:** (1) sửa policy batch/rows (bỏ nhánh PM hoặc ràng buộc project) + WITH CHECK theo pattern Phase 2; (2) sửa nhánh WORKER dùng helper Phase 2; (3) xoá updateMany chết + bọc `withIdempotency` POST adjustments; (4) apply migration dev DB theo DEC-NEW-04/05 + script verify RLS (PM → 0 batch; WORKER → thấy event của mình; role ngoài scope → 0 row); (5) UI Resolve drawer + adjustment drawer (S03→S03_Resolve) + HANDOFF-R5.md bắt buộc nêu evidence từng việc. **4B chỉ ACCEPT khi** 5 việc trên đạt + Tier 3 audit round 5.1 | v1.7 (không đổi RQ/STEP/AC) | Tier 2 — round 5.1 (sếp giao /code) |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-17 | Initial contract — 4 slice 4A–4D, 20 RQ, 20 STEP, 16 AC, 7 DEC đã chốt + 7 assumption/decision mới, 5 open question | Sếp giao "làm 1" (soạn TASK Phase 4); sources: PHASE_KHOAHOC §4, F00A, DECISION_LOG D01–D16, UNIFIED_PLAN v4.22 |
| `v1.1` | 2026-08-17 | Planner trả lời TIER2-REPORT.md (pre-round 1): **Vấn đề 1** — staffing_orders/candidate_submissions/source_claims ĐÃ có RLS Phase 2 (sửa EV-10); chỉ thiếu staffing_order_slots → thêm DEC-15, STEP-21, RQ-21, AC-17. **Vấn đề 2** — DEC-16 fixture spec (mock in-memory + seed cjs). **Vấn đề 3** — F00A + DESIGN.md tồn tại (EV-13) + DEC-17 UI skeleton round 1. **Vấn đề 4** — Planner tự chạy sanity (EV-11: vitest 325/325 + build exit 0), Tier 2 khỏi chạy lại. Không sửa RQ/STEP/AC cũ — chỉ bổ sung | TIER2-REPORT.md 4 vấn đề + Planner verify 17/08 |
| `v1.2` | 2026-08-17 | Planner Resolution cho audit round 1 (verdict CONDITIONAL — PARTIAL PASS): nghiệm thu STEP-21/AC-17, duyệt DEC-NEW-04/05/06, mở round 2 cho STEP-01..07. Không đổi RQ/STEP/AC | AUDIT.md round 1 (Tier 3, 17/08 09:00) + Planner tự verify evidence 17/08 |
| `v1.3` | 2026-08-17 | Planner Resolution cho audit round 2a (verdict CONDITIONAL — PARTIAL PASS): nghiệm thu STEP-01..03, duyệt DEC-NEW-07/08/09/10, mở round 2b (STEP-04..05 API routes + guards). Ghi nhận + khắc phục vi phạm stage appBCC/bcc-fence của Tier 2 trong commit round 2a — commit sạch `8c7fb91` + `67f5ba0` thay `fdebbf7` + `760683f` (chưa push nên không cần force). Không đổi RQ/STEP/AC | AUDIT.md round 2a (Tier 3, 17/08 11:05) + Planner tự verify evidence 17/08 |
| `v1.4` | 2026-08-17 | Planner Resolution cho audit round 2 (verdict CONDITIONAL — PARTIAL PASS): nghiệm thu STEP-01..06, mở round 3 giao Tier 2 dứt điểm STEP-07 (integration test 4-role + E2E narrative slice 4A) + bọc AC-10 (idempotency/outbox cho route POST/PATCH mới — Planner phát hiện thiếu) + cập nhật HANDOFF 2b/2c. Không đổi RQ/STEP/AC | AUDIT.md round 2 (Tier 3, 17/08 13:12) + Planner tự verify evidence 17/08 13:13 |
| `v1.5` | 2026-08-17 | Planner Resolution cho audit round 3 (verdict **PASS — Slice 4A nghiệm thu**): STEP-07 E2E 4-role + narrative + AC-10 idempotency/outbox hoàn tất; duyệt DEC-NEW-11 (bulk skip idempotency — savepoint fail-safe); mở round 4 = Slice 4B (STEP-08..12). Không đổi RQ/STEP/AC | AUDIT.md round 3 (Tier 3, 17/08 14:15) + Planner tự verify evidence 17/08 14:17 |
| `v1.6` | 2026-08-17 | Planner Resolution cho audit round 4 (verdict CONDITIONAL — PARTIAL PASS): nghiệm thu core 4B (STEP-08..12), mở round 5 giao Tier 2 đóng 4B đúng 4 việc — (1) Resolve drawer + TimesheetAdjustment; (2) RLS 6 bảng 4B (RQ-21); (3) test taxonomy G29 + E2E bước 7 (Planner phát hiện thiếu evidence); (4) drag&drop defer (chấp thuận). Không đổi RQ/STEP/AC | AUDIT.md round 4 (Tier 3, 17/08 15:20) + Planner tự verify evidence 17/08 15:25 |
| `v1.7` | 2026-08-17 | Planner Resolution round 5 (không có Tier 3 audit — đóng theo lệnh sếp + Planner tự verify): verdict **REVISION_REQUIRED** — ghi nhận 4 việc ĐẠT (taxonomy test, E2E bước 7, ADR-013 + reason + audit/outbox, 2 route guard) nhưng phát hiện 6 defect F5-01..F5-06 (PM leak batch RLS, WORKER sai helper, thiếu WITH CHECK, updateMany chết production-breaking, thiếu withIdempotency, UI drawer chưa có) → mở **round 5.1** giao Tier 2 dứt điểm 4B. Không đổi RQ/STEP/AC | Planner tự verify 17/08 (vitest 398/398 exit 0, build 0, migrate status: migration 4B pending — chưa apply) |
