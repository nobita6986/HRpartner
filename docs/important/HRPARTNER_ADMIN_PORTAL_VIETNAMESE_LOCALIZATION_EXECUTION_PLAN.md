# HRPartner — Admin Portal Vietnamese Localization Execution Plan (T1B)

> Document status: PROPOSED EXECUTION PLAN (awaiting T0/Owner sign-off)
> Companion audit: `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md`
> Companion task: `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/TASK.md`
> Baseline: `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (`origin/main`, post-merge PR #93)
> Branch: `codex/t1b-admin-portal-vietnamese-localization-audit`
> Date: 2026-10-04
> Owner: T0 (glossary + plan approval) / T1B (rollout, wave-by-wave)
> Supersedes: none
> Conflict rule: this is a proposed plan, not a normative contract. V7/V8/V9 authority, `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`, the maintainability reference, M2A `RESOLVED` boundaries (F11), and current source override any claim made here. T0/Owner must explicitly approve the glossary in §3 and the wave ordering in §5 before any wave starts.

## 0. Purpose

This plan answers T0's T1B directive: "đề xuất kế hoạch Việt hóa nhất quán, dễ hiểu." It is a doc-only deliverable in this round; no source/test/schema/migration is touched. After T0/Owner signs off the glossary (§3) and wave ordering (§5), a future T1A/T1B/T1C batch will implement the plan as a follow-up contract.

## 1. Authority order

| Concern | Authority |
| --- | --- |
| Glossary sign-off | T0 (this document, §3) |
| Wave execution sign-off | T0 (this document, §5) |
| Domain / architecture | `docs/V7/V7_ARCHITECTURE.md`, `docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md` |
| Execution / go-live gates | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` |
| M2A F11 boundary | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` §8.11; frozen by `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` |
| Coding rules | `docs/V7/AI_CODING_GUARDRAILS.md`, `.ai-pipeline/`, current TASK/HANDOFF |
| Audit method | `.ai-pipeline/README.md`, `tier1.md` (Tier 1 = Delivery Lead), companion audit §3 |

This plan must NOT be used as a second source of truth for V7 invariants, P0/P1/P2/P3 priority order, or production verification. Wave contracts MUST verify scope against the audit and the current source before opening.

## 2. Pre-binding (T0 §I)

Per T0 §I:

- This survey can run in parallel with UI2 / F6 (the audit confirms: no overlap on file ownership, no canonical enum/API change, no production smoke impact).
- **No implementation in this round.** The execution plan IS the deliverable; the implementation follows in a future T1 contract that opens after T0 sign-off.
- P2.1 cannot begin until:
  1. T0/Owner signs off the glossary (§3) and execution plan (§5);
  2. all 5 waves are merged into `main`;
  3. production walkthrough PASSES;
  4. no raw English/status on priority Admin routes;
  5. remaining debt is listed and Owner has accepted it in writing.

## 3. Recommended glossary (Owner sign-off required)

The glossary below consolidates T0 §E, the audit findings §5, the existing dictionaries (`placement-ui.ts`, `job-posting-error-map.ts`), and the M2A F11 frozen contract. **Cells marked `[OWNER]` require explicit Owner sign-off before any wave ships.**

### 3.1 Domain terms

| # | English / canonical | Vietnamese primary | Vietnamese with technical hint (when shown in tooltips/parens) | Notes |
| ---: | --- | --- | --- | --- |
| 1 | `Project` | `Dự án` | — | M2A F11 — `Publish` button renamed to `Công bố dự án` (frozen) |
| 2 | `Staffing` (sidebar) | `Danh sách đơn tuyển` | — | `[OWNER]` Q3 — recommend `Danh sách đơn tuyển` to keep `Order` canonical in tooltips |
| 3 | `Staffing Order` (page H1) | `Đơn tuyển dụng` | `Đơn tuyển dụng (StaffingOrder)` | `[OWNER]` Q3 |
| 4 | `Staffing Order Slot` | `Vị trí cần tuyển` | `Vị trí cần tuyển (Slot)` | `[OWNER]` Q4 |
| 5 | `Job Opening` | `Đợt tuyển dụng` | `Đợt tuyển dụng (JobOpening)` | `[OWNER]` Q5 |
| 6 | `JobPosting` | `Tin tuyển dụng` | `Tin tuyển dụng (JobPosting)` | `[OWNER]` Q5 — canonical enum preserved in tooltips/aria |
| 7 | `Candidate Submission` | `Đơn ứng tuyển` | — | `[OWNER]` Q6 — current `placement-ui.ts:STATUS_LABELS` uses `Mới` etc. for status but no canonical label for the entity. Recommend `Đơn ứng tuyển`. |
| 8 | `Project Assignment` | `Phân công dự án` | `Phân công dự án (Project Assignment)` | `[OWNER]` Q6 |
| 9 | `Placement` | `Bố trí việc làm` | `Bố trí việc làm (Placement)` | `[OWNER]` Q6 |
| 10 | `Labor Profile` | `Hồ sơ người lao động` | `Hồ sơ NLD (LaborProfile)` | `[OWNER]` Q6 — current sidebar uses `Hồ sơ NLD`; keep both forms |
| 11 | `Worker` | `Người lao động` | `Người lao động (Worker)` | `[OWNER]` Q6 |
| 12 | `Recruiter Workbench` | `Bảng công việc của Recruiter` | — | `[OWNER]` Q7 — page is frozen by TASK.md §4.4; the H1 + breadcrumb + metadata change requires a new contract un-freezing the surface |
| 13 | `Homepage Settings` | `Cài đặt trang chủ` | — | (translation) |
| 14 | `Media Library` | `Thư viện Media` | — | Already used in metadata title (L28 of `app/admin/media/page.tsx`) — keep |
| 15 | `Slug` | — | `Đường dẫn tin (slug)` | `VIETNAMESE_WITH_TECHNICAL_HINT` |
| 16 | `Revision` | — | `Phiên bản chỉnh sửa (revision)` | `VIETNAMESE_WITH_TECHNICAL_HINT` |
| 17 | `contentSchemaVersion` | — | `Phiên bản schema nội dung (contentSchemaVersion)` | `VIETNAMESE_WITH_TECHNICAL_HINT` — admin-only, optional |

### 3.2 Status enum terms (per module)

The following tables translate enum VALUES to operator-facing labels. The canonical enum values themselves are NEVER renamed.

#### 3.2.1 Project status (`app/admin/jobs` Project-level, M2A F11)

| Canonical enum | Vietnamese label | Notes |
| --- | --- | --- |
| `DRAFT` | `Nháp` | (already in `projects/page.tsx:131`) |
| `ACTIVE` | `Hoạt động` | (already in `projects/page.tsx:132`) |
| `PAUSED` | `Tạm dừng` | (already in `projects/page.tsx:133`) |
| `COMPLETED` | `Hoàn thành` | (already in `projects/page.tsx:134`) |
| `CANCELLED` | `Đã hủy` | (already in `projects/page.tsx:135`) |
| `Published` (column-derived) | `Đã công bố` | (NEW — replace L351 hardcoded literal) |
| `Unpublished` (column-derived) | `Chưa công bố` | (NEW — replace L351 hardcoded literal) |
| `Closed` (column-derived) | `Đã đóng` | (NEW — replace L351 hardcoded literal) |

#### 3.2.2 JobOpening status

| Canonical enum | Vietnamese label |
| --- | --- |
| `DRAFT` | `Bản nháp` |
| `OPEN` | `Đang mở` |
| `CLOSING_SOON` | `Sắp đóng` |
| `CLOSED` | `Đã đóng` |
| `FILLED` | `Đã đủ chỉ tiêu` |
| `CANCELLED` | `Đã hủy` |

#### 3.2.3 JobPosting status (M2A F11 frozen contract — labels not frozen, can translate)

| Canonical enum | Vietnamese label |
| --- | --- |
| `DRAFT` | `Bản nháp` |
| `PUBLISHED` | `Đã đăng` |
| `ARCHIVED` | `Đã lưu trữ` |

#### 3.2.4 Application status (existing in `placement-ui.ts:21-28`, ratified)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `NEW` | `Mới` | `placement-ui.ts:21` |
| `NEEDS_INFO` | `Cần bổ sung` | `placement-ui.ts:22` |
| `SCREENING` | `Đang xét` | `placement-ui.ts:23` |
| `QUALIFIED` | `Đạt` | `placement-ui.ts:24` |
| `REJECTED` | `Từ chối` | `placement-ui.ts:25` |
| `WITHDRAWN` | `Đã rút` | `placement-ui.ts:26` |
| `CONVERTED` | `Đã nhận` | `placement-ui.ts:27` |
| `MERGED` | `Đã gộp` | `placement-ui.ts:28` |

#### 3.2.5 Application source (existing in `placement-ui.ts:30-32`, ratified)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `PUBLIC` | `Công khai` | `placement-ui.ts:30` |
| `VENDOR` | `NCC` | `placement-ui.ts:31` |
| `CTV` | `CTV` | `placement-ui.ts:32` |

#### 3.2.6 Worker status (`app/admin/workers/page.tsx`)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `NONE` | `Chưa rõ` | `workers/page.tsx:25` |
| `ACTIVE` | `Đang làm` | `workers/page.tsx:26` |
| `SUSPENDED` | `Tạm ngưng` | `workers/page.tsx:27` |
| `TERMINATED` | `Đã nghỉ` | `workers/page.tsx:28` |

#### 3.2.7 Recruiter assignment status (`app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx:326-330`)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `ACTIVE` | `Đang phụ trách` | `recruiter-assignment-manager.tsx:326` |
| `REVOKED` | `Đã thu hồi` | `recruiter-assignment-manager.tsx:327` |
| `SUPERSEDED` | `Đã thay thế` | `recruiter-assignment-manager.tsx:328` |

#### 3.2.8 Next-action (frozen by 7-value exhaustive map, `NextActionBadge.tsx:24-33`)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `OPEN_INTAKE` | `Mở hồ sơ intake` | `NextActionBadge.tsx:26` |
| `REQUEST_DOCS` | `Yêu cầu giấy tờ` | `NextActionBadge.tsx:27` |
| `SCREEN_SUBMISSION` | `Sàng lọc hồ sơ` | `NextActionBadge.tsx:28` |
| `SCHEDULE_SCREEN` | `Sắp lịch sàng lọc` | `NextActionBadge.tsx:29` |
| `AWAITING_RESULT` | `Chờ kết quả` | `NextActionBadge.tsx:30` |
| `REVIEW_PLACEMENT` | `Xem placement` | `NextActionBadge.tsx:31` |
| `NONE` | `—` | `NextActionBadge.tsx:32` (em-dash preserved per F11 freeze) |

#### 3.2.9 Media status (`app/admin/media/media-library-client.tsx`)

| Canonical enum | Vietnamese label |
| --- | --- |
| `PUBLIC` | `Công khai` |
| `INTERNAL` | `Nội bộ` |

#### 3.2.10 Identity verification (`app/admin/labor-profiles/[id]/page.tsx:82`)

| Canonical enum | Vietnamese label | Notes |
| --- | --- | --- |
| `VERIFIED` | `Đã xác minh` | `[OWNER]` Q4 — recommend |
| `PENDING` | `Đang chờ xác minh` | `[OWNER]` Q4 — recommend |
| `REJECTED` | `Bị từ chối` | `[OWNER]` Q4 — recommend |
| (other values) | fall back to canonical | `KEEP_CANONICAL_IDENTIFIER` |

### 3.3 Action terms

| # | English / canonical | Vietnamese primary | Frozen? |
| ---: | --- | --- | --- |
| 1 | `Công bố dự án` (Project publish) | (already Vietnamese) | M2A F11 — DO NOT change |
| 2 | `Bỏ công bố dự án` (Project unpublish) | (already Vietnamese) | M2A F11 — DO NOT change |
| 3 | `Publish` (JobPosting) | `Đăng tin` | F11 frozen — keep `Publish` literal on editor shell + tooltip `Đăng tin` |
| 4 | `Unpublish` (JobPosting) | `Gỡ đăng tin` | F11 frozen — keep `Unpublish` literal + tooltip |
| 5 | `Archive` (JobPosting) | `Lưu trữ` | F11 frozen — keep `Archive` literal + tooltip |
| 6 | `Open` (JobOpening) | `Mở đợt tuyển` | (translation) |
| 7 | `Close` (JobOpening) | `Đóng đợt tuyển` | (translation) |
| 8 | `Cancel` (StaffingOrder / JobOpening) | `Hủy` | (translation) |
| 9 | `Save` | `Lưu` | (translation) |
| 10 | `Create` | `Tạo` | (translation) |
| 11 | `Update` | `Cập nhật` | (translation) |
| 12 | `Claim` (assignment) | `Nhận phụ trách` | (translation) |
| 13 | `Assign` (recruiter) | `Phân công` | (translation) |
| 14 | `Resolve` (attendance) | `Xử lý` | (translation) |
| 15 | `Approve` (attendance) | `Duyệt` | (translation) |
| 16 | `Adjustment` (attendance) | `Điều chỉnh` | (translation) |
| 17 | `Dispute` (reconciliation) | `Tranh chấp` | (translation) |
| 18 | `Submit dispute` (reconciliation) | `Gửi tranh chấp` | (translation) |
| 19 | `Add Adjustment` (attendance) | `+ Tạo điều chỉnh` | (translation) |

### 3.4 Role terms (`app/admin/users/page.tsx:23-37` + `app/admin/admin-shell.tsx:455`)

| Canonical enum | Vietnamese label | Notes |
| --- | --- | --- |
| `ADMIN` | `Quản trị viên` | (today: `Admin`) |
| `HR_MANAGER` | `Quản lý nhân sự` | (today: `HR Manager`) |
| `HR_STAFF` | `Chuyên viên nhân sự` | (today: `HR Staff`) |
| `ACCOUNTANT` | `Kế toán` | (today: `Kế toán` ✓) |
| `PM` | `PM` | (canonical, keep) |
| `SALE` | `Sale` | (canonical, keep) |
| `DIRECTOR` | `Giám đốc` | (today: `Giám đốc` ✓) |
| `WORKER` | `Người lao động` | (today: `Worker`) |
| `MKT` | `Marketing` | (today: `Marketing` ✓) |
| `VENDOR_ADMIN` | `Quản trị NCC` | (today: `Vendor Admin`) |
| `VENDOR_STAFF` | `Nhân viên NCC` | (today: `Vendor Staff`) |
| `CTV` | `Cộng tác viên` | (today: `Cộng tác viên` ✓) |
| `EMPLOYEE` | `Nhân viên` | (today: `Employee`) |

### 3.5 Form / table / presentation terms

| # | English | Vietnamese | Where |
| ---: | --- | --- | --- |
| 1 | `Slug` | `Đường dẫn tin (slug)` | JobPosting list/detail |
| 2 | `Revision` | `Phiên bản chỉnh sửa (revision)` | JobPosting list/detail |
| 3 | `Created` | `Ngày tạo` | JobPosting detail fact |
| 4 | `Updated` | `Ngày cập nhật` | JobPosting detail fact |
| 5 | `Published at` | `Ngày đăng` | JobPosting detail fact |
| 6 | `Archived at` | `Ngày lưu trữ` | JobPosting detail fact |
| 7 | `Project` | `Dự án` | column header on `/admin/jobs` |
| 8 | `Code` | `Mã dự án` | column header on `/admin/jobs` |
| 9 | `Status` | `Trạng thái` | column headers (3 surfaces) |
| 10 | `Slot trống` | `Slot trống` (already VN) | column header on `/admin/jobs` |
| 11 | `Source` | `Nguồn` | attendance column |
| 12 | `Rows` | `Số dòng` | attendance column |
| 13 | `Matched` | `Đã khớp` | attendance column |
| 14 | `Unmatched` | `Chưa khớp` | attendance column |
| 15 | `Anomaly` | `Bất thường` | attendance column |
| 16 | `Action` | `Thao tác` | attendance column |
| 17 | `ID` | `Mã` | attendance column |
| 18 | `Employee code` | `Mã nhân viên` | attendance column |
| 19 | `Date` | `Ngày` | attendance column |
| 20 | `Time` | `Giờ` | attendance column |
| 21 | `Delta hours (positive = +, negative = -)` | `Số giờ chênh (dương = +, âm = -)` | attendance form |
| 22 | `Reason (required)` | `Lý do (bắt buộc)` | attendance form |
| 23 | `Worker ID (matched)` | `Mã nhân viên (đã khớp)` | attendance form |
| 24 | `Kind` | `Loại` | reconciliation column |
| 25 | `Party` | `Đối tác` | reconciliation column |
| 26 | `Period` | `Kỳ` | reconciliation column |
| 27 | `Amount (VND)` | `Số tiền (VNĐ)` | reconciliation column |
| 28 | `Dispute` | `Tranh chấp` | reconciliation column |
| 29 | `SLA Deadline` | `Hạn SLA` | reconciliation column |
| 30 | `Actions` | `Thao tác` | reconciliation column |
| 31 | `Margin Breakdown` | `Phân tích lợi nhuận` | reconciliation tab |
| 32 | `Vendor payable` | `Phải trả NCC` | reconciliation metric |
| 33 | `Client receivable` | `Phải thu khách hàng` | reconciliation metric |
| 34 | `Margin` | `Lợi nhuận` | reconciliation metric |
| 35 | `Ly do (required)` | `Lý do (bắt buộc)` | reconciliation form (encoding fix) |
| 36 | `Attachment URL (optional)` | `URL tài liệu đính kèm (tuỳ chọn)` | reconciliation form |
| 37 | `Submit dispute` | `Gửi tranh chấp` | reconciliation form |
| 38 | `Folder` | `Thư mục` | media sidebar |
| 39 | `Alt text` | `Alt text (văn bản thay thế)` | media form |
| 40 | `Caption (optional)` | `Chú thích (tuỳ chọn)` | media form |
| 41 | `Homepage Settings` | `Cài đặt trang chủ` | settings H2 |
| 42 | `User ID` | `Mã người dùng` | users / workers column |
| 43 | `Vendor ID` | `Mã nhà cung cấp` | users column |
| 44 | `Role` (subtle) | `Quyền` / per-row label | sidebar footer |
| 45 | `Job Opening: <id8>` | `Đợt tuyển dụng: <id8>` | breadcrumb |
| 46 | `JobPosting viewer` | `Tin tuyển dụng — trang xem` | breadcrumb |
| 47 | `JobPosting authoring & publish` | `Tin tuyển dụng — soạn & đăng` | breadcrumb + H1 |
| 48 | `Quay lại Admin Jobs` | `Quay lại Danh sách nhu cầu` | back button |
| 49 | `Chưa có job public nào` | `Chưa có dự án công khai` | jobs empty state |
| 50 | `Vi du: di muon 30 phut do tac duong` | `Ví dụ: đi muộn 30 phút do tắc đường` | attendance placeholder (encoding fix) |
| 51 | `Huy` (button) | `Hủy` | attendance / reconciliation (encoding fix, 3 sites) |
| 52 | `Dang generate...` | `Đang tạo...` | reconciliation (encoding fix) |
| 53 | `Dang tai...` | `Đang tải...` | reconciliation (encoding fix) |
| 54 | `Generate tu Timesheet` | `Tạo từ Timesheet` | reconciliation button (encoding + translate) |
| 55 | `Generate tu Timesheet LOCKED` | `Tạo bảng đối soát từ Timesheet (đã khóa)` | reconciliation H2 (encoding + translate) |
| 56 | `Tao VendorStatement + ClientStatement tu TimesheetPeriod da LOCKED` | `Tạo Bảng đối soát NCC + Bảng đối soát Khách hàng từ Kỳ Timesheet đã khóa` | reconciliation description (encoding + translate) |
| 57 | `Doi soat (Reconciliation)` | `Đối soát (Reconciliation)` | reconciliation H1 (encoding fix) |
| 58 | `Module M4 + M8 -- slice 4C · F00A moment 09:30-13:00 · Statement 2 luong + Margin + Dispute` | `Module M4 + M8 — slice 4C · F00A 09:30–13:00 · Bảng lương 2 kỳ + Lợi nhuận + Tranh chấp` | reconciliation sub (encoding + translate) |
| 59 | `Chua co statement nao. Generate tu tab Generate.` | `Chưa có bảng đối soát nào. Tạo từ tab Tạo từ Timesheet.` | reconciliation empty (encoding + translate) |
| 60 | `Dispute count hien tai: {n}/2` | `Số tranh chấp hiện tại: {n}/2` | reconciliation form (encoding + translate) |
| 61 | `Vi du: So gio khong khop voi check-in thuc te` | `Ví dụ: Số giờ không khớp với check-in thực tế` | reconciliation placeholder (encoding fix) |

### 3.6 KEEP_CANONICAL_IDENTIFIER (do not translate)

The following MUST remain in their canonical form, ever:

- Database enum values (e.g. `DRAFT`, `PUBLISHED`, `OPEN`, `CLOSING_SOON`, `ACTIVE`, `SUSPENDED`, `TERMINATED`).
- API field names (`slug`, `revision`, `jobOpeningId`, `staffingOrderCode`, `identityVerification`, `contentSchemaVersion`).
- URL slug values (e.g. `/admin/jobs/job-postings/[id]`).
- IDs (UUIDs, CUIDs), codes (e.g. `USR-001`, `CC-001`).
- Log lines, migration files, idempotency keys.
- Symbol names in error code constants (e.g. `JOB_OPENING_NOT_OPEN`).
- Frozen M2A F11 labels (`Công bố dự án`, `Bỏ công bố dự án` on the Project page; `Publish` / `Unpublish` / `Archive` on the JobPosting editor).

The display label can be Vietnamese, but the enum VALUE never changes.

### 3.7 Owner decisions to confirm

| # | Decision | Default if no answer | Recommended |
| ---: | --- | --- | --- |
| Q1 | `Publish` column header on `/admin/jobs` Project list | Keep English `Publish` (M2A F11) with Vietnamese tooltip `Trạng thái công khai của dự án` | Keep English (F11) |
| Q2 | Role display in sidebar footer | Show canonical enum (e.g. `ADMIN`) | Show Vietnamese (recommend §3.4) |
| Q3 | `Staffing` (sidebar) / `Staffing Order` (H1) | `Danh sách đơn tuyển` / `Đơn tuyển dụng` | (recommended) |
| Q4 | `StaffingOrderSlot` | `Vị trí cần tuyển` | (recommended) |
| Q5 | `JobOpening` / `JobPosting` labels | `Đợt tuyển dụng` / `Tin tuyển dụng` (canonical in tooltip) | (recommended) |
| Q6 | `Candidate Submission` / `Project Assignment` / `Placement` / `LaborProfile` labels | per §3.1 | (recommended) |
| Q7 | `Recruiter Workbench` H1 (page is frozen) | `Bảng công việc của Recruiter` | (recommended) — requires a new contract un-freezing the page |
| Q8 | `Worker ID` column header | `Mã người dùng` | (recommended) |
| Q9 | `AgeCell` format (`<1h`, `Xh`, `Xd Yh`) | Keep abbreviations (F11 frozen) | (recommended) — keep |
| Q10 | `identityVerification` labels | `Đã xác minh` / `Đang chờ xác minh` / `Bị từ chối` | (recommended) |
| Q11 | `serviceModel` (JobOpening chip) | `Tại công trường` / `Từ xa` | (recommended) — but audit defers to Owner |
| Q12 | Encoding-loss batch scope | All 15 occurrences in 1 PR | (recommended) |

## 4. Architecture (proposed)

### 4.1 Decision: NO i18n library

The audit (§6) found 5 typed dictionaries already in place; introducing `next-intl` / `react-intl` adds 0 benefit and 1 migration cost. **Recommendation: stay with the typed dictionary pattern.** If Owner later wants multi-language, the dictionaries become a thin translation table and the rest of the architecture is preserved.

### 4.2 Decision: consolidated shared dictionary

A future T1 batch creates:

- `src/shared/i18n/glossary.ts` — canonical cross-module Vietnamese terms (Project, StaffingOrder, JobOpening, JobPosting, etc.).
- `src/shared/i18n/status-dictionary.ts` — `{ statusBadge(state) }` for canonical enum → label+color+bg mapping; supports `Project`, `JobOpening`, `JobPosting`, `Worker`, `RecruiterAssignment`, `Application`, `Media`, `IdentityVerification`.
- `src/shared/i18n/action-dictionary.ts` — `{ actionLabel(action) }` for canonical action → Vietnamese label.
- `src/shared/i18n/role-labels.ts` — `{ roleLabel(role) }` for `SystemRole` → Vietnamese label.
- `src/shared/i18n/form-dictionary.ts` — common form/table headers (`Status`, `Action`, `Created`, `Updated`, `Name`, `Code`, `Description`).
- `src/shared/ui/status-badge/` — `<StatusBadge module="project" status="DRAFT" />` reads from the consolidated dictionary; **single source of truth** for status rendering.

The existing module-level dictionaries (`placement-ui.ts`, `job-posting-error-map.ts`, inline `STATUS_CONFIG` in `projects/page.tsx`, `workers/page.tsx`, `recruiter-assignment-manager.tsx`, `NextActionBadge.tsx`) are **re-exported** from the consolidated location to preserve existing imports. No consumer-side import rewrite is required in the same PR.

### 4.3 Module ownership

| Module | File | Owner |
| --- | --- | --- |
| Project status dictionary | `src/domains/projects/project-ui.ts` (NEW) | T1B |
| JobOpening status dictionary | `src/domains/staffing/job-opening-ui.ts` (NEW) | T1B |
| JobPosting status dictionary | `src/domains/staffing/job-posting-ui.ts` (NEW) | T1B |
| Worker status dictionary | `src/domains/workforce/worker-ui.ts` (NEW) | T1C |
| Recruiter assignment dictionary | `src/domains/staffing/recruiter-assignment-ui.ts` (NEW) | T1B |
| Application dictionary (existing) | `src/domains/applications/placement-ui.ts` | (no change) |
| Application errors (existing) | `src/domains/staffing/job-posting-error-map.ts` | (no change) |
| Role labels | `src/shared/auth/role-labels.ts` (NEW) | T1B |
| Next-action (frozen) | `app/admin/recruiter-workbench/_components/NextActionBadge.tsx` | (no change) |
| Status badge UI | `src/shared/ui/status-badge/` (NEW) | T1A |

### 4.4 Forbidden-English allowlist

The static-fence tests (§6.3) will assert that the following English literals **must** appear at the listed sites (M2A F11 + frozen contracts) and **must not** appear elsewhere:

| Literal | Must appear in | Must not appear in |
| --- | --- | --- |
| `Công bố dự án` | `app/admin/jobs/page.tsx:371` (button) + breadcrumb/helper around it | any other Admin surface |
| `Bỏ công bố dự án` | `app/admin/jobs/page.tsx:371` (button) | any other Admin surface |
| `Publish` (label) | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` + `app/admin/jobs/page.tsx:323` (column header per F11) | any non-F11 site |
| `Unpublish` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | any other site |
| `Archive` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | any other site |
| `Recruiter Workbench` | `app/admin/recruiter-workbench/page.tsx:151,53` (frozen by §4.4) | (allow until Q7 sign-off) |
| `Slug` (raw token) | JobPosting code, API field | never in operator-visible label (always wrapped in Vietnamese parens) |
| `Revision` (raw token) | JobPosting code, API field | never in operator-visible label |
| `IdentityVerification` enum | Prisma schema, route response | never in operator-visible chip |
| `SystemRole` enum | Prisma schema, server session | never in operator-visible role chip (always go through `roleLabel()`) |

### 4.5 Raw enum / error leakage guard

Wave 4 §3 introduces:

- A `<StatusBadge module="..." status="..." />` component that ALWAYS reads from the shared dictionary; any direct `{status}` interpolation in a `<span>` or `<td>` triggers a lint rule (`no-raw-enum-render`).
- A new error mapper `src/shared/i18n/error-dictionary.ts` that re-exports `JOB_POSTING_ERROR_LABELS` + `CONFLICT_LABELS` and provides a generic `errorLabel({ module, code, fallback })` for future use.
- ESLint rule `no-raw-enum-render` — bans `<span>{status}</span>` in `app/admin/**` and `app/admin/_components/**`; suggests `<StatusBadge module="..." status={status} />` instead.
- ESLint rule `no-vietnamese-without-diacritics` — detects the encoding-loss pattern (e.g. `Huy` literal that should be `Hủy`) against an allowlist of canonical tokens (`null`, `undefined`, etc.). Pattern: `Huy` (3 letters) flagged unless it is in the allowlist; `Hủy` (3 letters with diacritics) passes.

## 5. Implementation waves

### 5.1 Wave 1 — Shared glossary + status/action formatter + nav/common shell

**Goal**: establish the consolidated dictionary infrastructure + fix the most visible sidebar/shell English leak.

**Owner**: T1A leads (architecture); T1B supports (glossary content); T1C validates (frozen F11 surface).

**File ownership** (no overlap with M2A F11 or UI2 / F6):

- NEW: `src/shared/i18n/glossary.ts`
- NEW: `src/shared/i18n/status-dictionary.ts`
- NEW: `src/shared/i18n/action-dictionary.ts`
- NEW: `src/shared/i18n/role-labels.ts`
- NEW: `src/shared/i18n/form-dictionary.ts`
- NEW: `src/shared/ui/status-badge/` (component + tests)
- NEW: `src/shared/i18n/error-dictionary.ts`
- MODIFY: `src/shared/ui/role-guard/role-guard-layout.tsx` (sidebar L-001 `Staffing` → `Danh sách đơn tuyển`; L-003 role chip; L-004 default `User` → `Người dùng`; L-009 `STATUS_CONFIG` lift to `recruiter-assignment-ui.ts`)
- MODIFY: `app/admin/admin-shell.tsx` (no string changes; verifies the dictionary exports)
- MODIFY: `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (L-006 `(no name)` → `(chưa có tên)`; L-009 dictionary lift)
- MODIFY: `app/admin/labor-profiles/[id]/page.tsx` (L-007 `identityVerification` dictionary)
- MODIFY: `app/admin/applications/page.tsx` (L-047 `CCCD` → `Số CCCD`; L-048 OK)
- MODIFY: `app/admin/projects/page.tsx` (L-018 dictionary lift; remove `STATUS_COLORS` for application statuses; keep `STATUS_CONFIG` for projects)
- MODIFY: `app/admin/workers/page.tsx` (dictionary lift)
- NEW TEST: `src/shared/i18n/__tests__/glossary.static.test.ts` (verifies every entry has a Vietnamese label; no missing keys; no orphan keys)
- NEW TEST: `src/shared/i18n/__tests__/status-dictionary.static.test.ts`
- NEW TEST: `src/shared/ui/status-badge/__tests__/status-badge.test.tsx`

**Acceptance criteria**:

- All shared dictionaries ship and are unit-tested.
- StatusBadge component reads from the shared dictionary.
- Sidebar L-001, L-003, L-004, L-006, L-007 are fixed.
- Static-fence test passes for the 8 forbidden-English literals (§4.4).
- No canonical enum/API change.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: T1A leads, T1B reviews glossary content, T1C validates F11 surface. T1A/T1B/T1C do NOT touch the same file. T1A owns the `src/shared/**` files; T1B owns the `app/admin/**` files; T1C owns the F11 frozen contract tests.

### 5.2 Wave 2 — Recruitment high-traffic

**Goal**: fix the most visible English on the high-traffic recruitment flows (Project, JobPosting, JobOpening, Staffing, Applications).

**Owner**: T1A owns `app/admin/jobs/**`, `app/admin/job-openings/**`, `app/admin/staffing/**`; T1B owns the dictionary exports.

**File ownership**:

- MODIFY: `app/admin/jobs/page.tsx` (L-010..L-018)
- MODIFY: `app/admin/jobs/job-postings/page.tsx` (L-019..L-025)
- MODIFY: `app/admin/jobs/job-postings/[id]/page.tsx` (L-026..L-035)
- MODIFY: `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (NO CHANGE — F11 frozen; verify static fence passes)
- MODIFY: `app/admin/job-openings/[id]/page.tsx` (L-036..L-043)
- MODIFY: `app/admin/staffing/staffing-list-client.tsx` (L-044..L-046)
- MODIFY: `app/admin/staffing/page.tsx` (verify H1 inheritance; no new code expected)
- NEW: `src/domains/projects/project-ui.ts` (L-018)
- NEW: `src/domains/staffing/job-opening-ui.ts` (L-035, L-037, L-038)
- NEW: `src/domains/staffing/job-posting-ui.ts` (L-023, L-025, L-034, L-035)
- NEW: `src/domains/staffing/staffing-order-ui.ts` (L-044, L-045)
- NEW TEST: `app/admin/jobs/__tests__/jobs-terminology.static.test.ts` (extends F11 fence; adds L-010..L-018)
- NEW TEST: `app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts`
- NEW TEST: `app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts`
- NEW TEST: `app/admin/staffing/__tests__/staffing-terminology.static.test.ts`

**Acceptance criteria**:

- All P0/P1/P2 findings on the 4 surfaces are fixed.
- No raw enum leakage on `/admin/jobs` (L-014, L-015, L-018).
- F11 frozen contract preserved (static fence `admin-jobs-terminology.static.test.ts` passes; new fence for `Publish` column header respects F11).
- `app/admin/jobs/job-postings/page.tsx:230-233` raw enum options translated via dictionary.
- All `<option>` values remain canonical enum; only the displayed text changes.
- `<StatusBadge module="project" status="..." />` used everywhere a status is rendered.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: T1A owns `app/admin/jobs/**`; T1B owns `app/admin/job-openings/**` and `app/admin/staffing/**`. T1A and T1B do NOT touch the same file. T1C owns the F11 frozen contract tests.

### 5.3 Wave 3 — Workforce / partner / system

**Goal**: fix the remaining user/worker/labor-profile/media/settings/users surfaces.

**Owner**: T1A owns `app/admin/users/**` + `app/admin/workers/**`; T1B owns `app/admin/labor-profiles/**` + `app/admin/clients/**` + `app/admin/vendors/**`; T1C owns `app/admin/media/**` + `app/admin/settings/**`.

**File ownership**:

- MODIFY: `app/admin/users/page.tsx` (L-086..L-089)
- MODIFY: `app/admin/workers/page.tsx` (L-107)
- MODIFY: `app/admin/labor-profiles/page.tsx` (already good; verify)
- MODIFY: `app/admin/labor-profiles/[id]/page.tsx` (L-118)
- MODIFY: `app/admin/labor-profiles/new/page.tsx` (verify)
- MODIFY: `app/admin/clients/page.tsx` (already good; verify)
- MODIFY: `app/admin/vendors/page.tsx` (verify)
- MODIFY: `app/admin/media/page.tsx` (verify)
- MODIFY: `app/admin/media/media-library-client.tsx` (L-090..L-095)
- MODIFY: `app/admin/settings/admin-settings-form.tsx` (L-096, L-097)
- NEW: `src/domains/workforce/worker-ui.ts` (L-107)
- NEW: `src/domains/labor-profile/labor-profile-ui.ts` (L-118)
- NEW: `src/domains/media/media-ui.ts` (L-091)
- NEW TEST: `app/admin/users/__tests__/users-terminology.static.test.ts`
- NEW TEST: `app/admin/workers/__tests__/workers-terminology.static.test.ts`
- NEW TEST: `app/admin/labor-profiles/__tests__/labor-profiles-terminology.static.test.ts`
- NEW TEST: `app/admin/media/__tests__/media-terminology.static.test.ts`
- NEW TEST: `app/admin/settings/__tests__/settings-terminology.static.test.ts`

**Acceptance criteria**:

- All P0/P1/P2 findings on the 6 surfaces are fixed.
- ROLE_LABELS consolidated to `src/shared/auth/role-labels.ts`.
- No raw `IdentityVerification` or `serviceModel` enum leakage.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: T1A owns `users`, `workers`; T1B owns `labor-profiles`, `clients`, `vendors`; T1C owns `media`, `settings`. No file overlap.

### 5.4 Wave 4 — Error/validation/accessibility copy + static fences

**Goal**: fix the heaviest-leakage surfaces (`/admin/attendance`, `/admin/reconciliation`) and add the encoding-loss lint + static fences.

**Owner**: T1A owns the lint rule infrastructure; T1B owns the dictionary additions; T1C owns the reconciliation page (most severe encoding defects).

**File ownership**:

- MODIFY: `app/admin/attendance/page.tsx` (L-049..L-060, 12 findings)
- MODIFY: `app/admin/reconciliation/page.tsx` (L-061..L-085, 25 findings)
- MODIFY: `app/admin/tickets/page.tsx` (L-103)
- MODIFY: `app/admin/payroll/page.tsx` (verify)
- MODIFY: `app/admin/commission/policies/page.tsx` (verify)
- MODIFY: `app/admin/commission/ledger/page.tsx` (verify)
- NEW: `src/shared/i18n/attendance-labels.ts` (L-049..L-060)
- NEW: `src/shared/i18n/reconciliation-labels.ts` (L-061..L-085)
- NEW: `eslint-plugin-no-raw-enum-render` (custom rule)
- NEW: `eslint-plugin-no-vietnamese-without-diacritics` (custom rule)
- MODIFY: `eslint.config.mjs` (register new rules)
- NEW TEST: `app/admin/attendance/__tests__/attendance-terminology.static.test.ts`
- NEW TEST: `app/admin/reconciliation/__tests__/reconciliation-terminology.static.test.ts`
- NEW TEST: `__tests__/encoding-loss.scan.test.ts` (scans the changed surface for diacritic-loss patterns)

**Acceptance criteria**:

- All 37 P0+P1 findings on `/admin/attendance` and `/admin/reconciliation` are fixed.
- All 15 encoding-loss occurrences are fixed.
- ESLint rules active; existing CI blocks on violations.
- `app/admin/tickets/page.tsx:205` `Tổng: {total} tickets` → `Tổng: {total} phiếu`.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: T1A owns the lint infrastructure; T1B owns the dictionary additions; T1C owns the reconciliation page. T1A's lint work can land first as a standalone PR (no surface change), then T1B + T1C land in separate PRs.

### 5.5 Wave 5 — Production visual walkthrough

**Goal**: Owner-driven visual smoke on the production Admin Portal across desktop + mobile, confirming the Vietnamese-first UX and capturing any final debt.

**Owner**: T0/Owner executes. NOT a code-touching wave.

**Acceptance criteria**:

- All P0/P1/P2 findings resolved on desktop.
- All P0/P1/P2 findings resolved on mobile (`/m/...` is out of scope but cross-portal access via the same browser session is verified).
- No raw English/status on the priority Admin routes.
- A short handback note is added to `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_WALKTHROUGH.md` (NEW) listing remaining debt + Owner acceptance.

## 6. Test strategy

### 6.1 Source/static fence

Per-route static tests assert the operator-visible Vietnamese labels AND the F11 frozen literals. Pattern (mirrors `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts`):

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('<surface> terminology', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/admin/<surface>/page.tsx'),
    'utf8',
  );

  it('renders Vietnamese label for <term>', () => {
    expect(source).toContain('<vietnamese label>');
  });

  it('does NOT contain raw English <term>', () => {
    expect(source).not.toMatch(/<english literal>/);
  });

  it('respects F11 frozen contract', () => {
    if (surface === '/admin/jobs') {
      expect(source).toContain('Công bố dự án');
      expect(source).toContain('Bỏ công bố dự án');
    }
  });
});
```

### 6.2 Component render test

`<StatusBadge>` and the dictionary exports get unit tests that assert every enum value has a Vietnamese label and the badge renders the correct label + tone.

### 6.3 Route/page smoke

Each wave ships with a smoke that fetches the route (with the same role-gate the production page enforces) and asserts:

- The H1 matches the Vietnamese label from the glossary.
- The dictionary-fed `<select>` renders the Vietnamese label, not the raw enum.
- The status badge renders the Vietnamese label.

### 6.4 Glossary consistency

`src/shared/i18n/__tests__/glossary.static.test.ts` walks every dictionary in the repo and asserts:

- Every entry has a non-empty `label` (Vietnamese) and a non-empty `code` (canonical).
- No two entries share the same `code` within a single module.
- Every code referenced by a `<StatusBadge module="X" status="Y" />` has a corresponding entry in the module's dictionary.

### 6.5 Forbidden-English allowlist

A new test `__tests__/forbidden-english.scan.test.ts` walks `app/admin/**` (excluding the F11-allowed sites) and asserts that none of the §4.4 forbidden literals appear at non-allowed sites.

### 6.6 Vietnamese-first pass

`__tests__/vietnamese-first.scan.test.ts` walks each priority Admin route and asserts that the ratio of Vietnamese characters in operator-visible strings is ≥ 95% (configurable per surface; default 95%). This catches accidental English regression in future PRs.

### 6.7 Encoding-loss lint

The new ESLint rule `no-vietnamese-without-diacritics` (Wave 4 §1) blocks any Vietnamese string that has lost its diacritics. An allowlist covers canonical tokens (`null`, `undefined`, `false`, `true`, etc.) and frozen F11 contracts.

## 7. Acceptance criteria (overall, post-wave 5)

- All 119 audit findings (98 actionable + 21 templates) are addressed.
- All 15 encoding-loss occurrences are fixed.
- No raw English/status on the priority Admin routes (verified by `forbidden-english.scan.test.ts` + `vietnamese-first.scan.test.ts`).
- Production walkthrough PASSES (T0/Owner-driven).
- Remaining debt is listed in `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_WALKTHROUGH.md` and Owner has accepted in writing.
- No canonical DB enum/API field changed.
- No F11 frozen contract violated.
- All static-fence tests + glossary tests + lint rules active in CI; CI 4/4 GREEN on `main`.

## 8. Rollback boundary

Each wave is a standalone PR. If a wave breaks the F11 frozen contract, the static fence (`admin-jobs-terminology.static.test.ts` + new fences) will fail in CI before merge, so the wave cannot land.

If a wave lands and an issue is found in production:

- Revert the wave PR (`git revert <merge-sha>`).
- The dictionary exports are additive (no destructive change), so the revert is safe.
- The new lint rules can be temporarily disabled in `eslint.config.mjs` if they fire false positives, with a TODO to fix the underlying issue.

## 9. Production verification

After Wave 5 (Owner visual walkthrough), the audit's handback closes. Production verification is a non-engineering step (Owner logins, navigates the routes, captures screenshots). The audit does NOT prescribe automated Playwright/Cypress tests in this round — they are a separate T1 contract (P2.1 candidate).

## 10. Dependency with UI2, Mốc 3-5, and P2.1

- **UI2**: runs in parallel; no file ownership overlap (UI2 is `app/viec-lam/**` + public surface; this plan is `app/admin/**` + `src/domains/**` dictionaries).
- **F6**: F6 is now closed by PR #93 (post-merge `f570db06`). No overlap.
- **Mốc 3-5** (Tickets / Attendance / Reconciliation / Payroll / Commission): Wave 4 of this plan covers `/admin/attendance` and `/admin/reconciliation` (the two most-leaky modules); Mốc 3-5 deliverable work is a separate stream. The dictionaries produced here (especially the reconciliation dictionary in Wave 4) feed into the Mốc 3-5 stream so that future Mốc work reuses the consolidated labels.
- **P2.1**: cannot begin until this plan is fully implemented and Wave 5 walkthrough PASSES.

## 11. Open Owner decisions (rolled up from §3.7)

The plan ships when Owner signs off:

- Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12.

If Owner does not sign off before the future T1 contract opens, the contract's default is the "recommended" column in §3.7.

## 12. Handback

This execution plan is delivered alongside:

- `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md` — audit ledger.
- `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/TASK.md` — task contract.

T0/Owner handback inputs:

1. baseline/latest-main reconciliation: `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (post-merge PR #93)
2. route/file coverage: 38 routes + 6 dictionaries + 1 shared status badge (per audit §4 + plan §4.3)
3. total findings: 119 (98 actionable + 21 templates)
4. top 20 terms to lock: see plan §3
5. recommended glossary: plan §3
6. implementation waves: 5 (Wave 1 dictionary + nav, Wave 2 recruitment, Wave 3 workforce/partner/system, Wave 4 a11y + static fences, Wave 5 production walkthrough)
7. parallelization T1A/B/C: see §5 wave-by-wave
8. file ownership: no overlap across T1A/B/C within a wave
9. exact changed files (this round): 3 (audit, plan, TASK.md)
10. commit/PR/CI: pending; non-draft PR; CI 4/4 GREEN required
11. remaining Owner decisions: 12 (see §3.7 + §11)