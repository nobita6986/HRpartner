# HRPartner — Admin Portal Vietnamese Localization Execution Plan (T1B)

> Document status: BINDING EXECUTION PLAN (T0 sign-off applied; corrections in this round)
> Companion audit: `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md`
> Companion task: `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/TASK.md`
> Baseline: `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (`origin/main`, post-merge PR #93)
> Branch: `codex/t1b-admin-portal-vietnamese-localization-audit`
> Date: 2026-10-04
> Owner: T0 (binding decisions applied; see §3) / T1B (rollout, wave-by-wave)
> Supersedes: previous (proposed) draft of this same file on the same branch — the `[OWNER]` markers in §3 and the Open-questions matrix in §3.7/§11 are removed.
> Conflict rule: this plan binds wave ownership and wave ordering; V7/V8/V9 authority, `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`, the maintainability reference, M2A `Bỏ công bố dự án` business-button literal, the canonical lifecycle operation names (`Publish`/`Unpublish`/`Archive`) — never the display labels — and current source override any claim made here. T0/Owner retains the right to amend one decision in a future revision cycle.

## 0. Purpose

This plan answers T0's T1B directive: "đề xuất kế hoạch Việt hóa nhất quán, dễ hiểu." It is a doc-only deliverable in this round; no source/test/schema/migration is touched. After T0/Owner signs off the glossary (§3) and wave ordering (§5), a future T1A/T1B/T1C batch will implement the plan as a follow-up contract.

## 1. Authority order

| Concern | Authority |
| --- | --- |
| Glossary binding (display labels) | T0 — already signed off; see §3 |
| Wave execution ownership | T0 (T1B sole owner of Wave 1–3; T1C sole owner of Wave 4; see §5) |
| Domain / architecture | `docs/V7/V7_ARCHITECTURE.md`, `docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md` |
| Execution / go-live gates | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` |
| F11 freeze scope (clarified) | `Công bố dự án` / `Bỏ công bố dự án` Project-level buttons (frozen business literals); `Đăng tin` / `Gỡ tin` / `Lưu trữ` JobPosting-level actions (frozen business distinction; canonical lifecycle operation names unchanged). See §9 of the companion audit. |
| Coding rules | `docs/V7/AI_CODING_GUARDRAILS.md`, `.ai-pipeline/`, current TASK/HANDOFF |
| Audit method | `.ai-pipeline/README.md`, `tier1.md` (Tier 1 = Delivery Lead), companion audit §3 |

This plan must NOT be used as a second source of truth for V7 invariants, P0/P1/P2/P3 priority order, or production verification. Wave contracts MUST verify scope against the audit and the current source before opening.

## 2. Pre-binding (T0 §I, T0 §5)

Per T0 §I and T0 §5:

- This survey runs in parallel with UI2 / F6 / Mốc 3-5 (no overlap on file ownership, no canonical enum/API change, no production smoke impact).
- **No implementation in this round.** The execution plan IS the deliverable; the implementation follows in future T1 contracts that open after T0 sign-off.
- P2.1 cannot begin until **ALL** of the following hold in order:
  1. UI V1 closeout lands;
  2. UI2 production PASS;
  3. Mốc 2 / F6 production PASS;
  4. Mốc 3 production PASS;
  5. Mốc 4 YouTube production PASS;
  6. Mốc 5 burn-in PASS;
  7. all 5 localization waves merged into `main`;
  8. Admin production walkthrough (Wave 5) PASSES;
  9. remaining debt is listed and Owner has accepted it in writing;
  10. `PRE_P2_CLOSEOUT` is recorded.

The wave ownership in §5 reflects T0 §4: Wave 1–3 are T1B sole, Wave 4 is T1C sole (with T1B glossary review only), Wave 5 is Owner-executed.

## 3. Recommended glossary (BINDING — T0 sign-off applied)

The glossary below is **binding** (T0 §2 applied in full). The previous `[OWNER]` markers in the proposed draft are removed. Cells marked `[T0 #N]` cite the corresponding T0 directive item. The companion audit §8 carries the same matrix in audit form.

### 3.1 Domain terms

| # | English / canonical | Vietnamese primary | Vietnamese with technical hint (when shown in tooltips/parens) | Owner source |
| ---: | --- | --- | --- | --- |
| 1 | `Project` (`Publish` column header on `/admin/jobs`) | `Công bố` | — | [T0 #1] |
| 2 | `Staffing` (sidebar) | `Nhu cầu tuyển dụng` | — | [T0 #4] |
| 3 | `Staffing Order` (page H1) | `Nhu cầu tuyển dụng` | — | [T0 #4] |
| 4 | `StaffingOrderSlot` | `Vị trí cần tuyển` | `Vị trí cần tuyển (Slot)` | [T0 #5] |
| 5 | `JobOpening` | `Đợt tuyển dụng` | `Đợt tuyển dụng (JobOpening)` | [T0 #6] |
| 6 | `JobPosting` (label) | `Tin tuyển dụng` | `Tin tuyển dụng (JobPosting)` (canonical in tooltip/aria) | [T0 #7] |
| 7 | `Candidate Submission` | `Đơn ứng tuyển` | — | [T0 #8] |
| 8 | `Project Assignment` | `Phân công dự án` | `Phân công dự án (Project Assignment)` | [T0 #9] |
| 9 | `Placement` | `Bố trí việc làm` | `Bố trí việc làm (Placement)` | [T0 #10] |
| 10 | `LaborProfile` (long) | `Hồ sơ người lao động` | `Hồ sơ người lao động (LaborProfile)` | [T0 #11] |
| 11 | `LaborProfile` (short) | `Hồ sơ NLĐ` | — | [T0 #11] |
| 12 | `Worker` | `Người lao động` | `Người lao động (Worker)` | [T0 #12] |
| 13 | `Recruiter Workbench` | `Bàn làm việc tuyển dụng` | — | [T0 #13] |
| 14 | `Worker ID` (column header) | `Mã người lao động` | — | [T0 #14] |
| 15 | `Slug` | — | `Đường dẫn tin (slug)` | (translation) |
| 16 | `Revision` | — | `Phiên bản chỉnh sửa (revision)` | (translation) |
| 17 | `contentSchemaVersion` | — | `Phiên bản schema nội dung (contentSchemaVersion)` | (translation, admin-only) |

### 3.2 Status enum terms (per module — BINDING)

The following tables translate enum VALUES to operator-facing labels. The canonical enum values themselves are NEVER renamed.

#### 3.2.1 Project status (`app/admin/jobs` Project-level, F11 buttons frozen)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `DRAFT` | `Nháp` | `projects/page.tsx:131` |
| `ACTIVE` | `Hoạt động` | `projects/page.tsx:132` |
| `PAUSED` | `Tạm dừng` | `projects/page.tsx:133` |
| `COMPLETED` | `Hoàn thành` | `projects/page.tsx:134` |
| `CANCELLED` | `Đã hủy` | `projects/page.tsx:135` |
| `Published` (column-derived) | `Đã công bố` | replace L351 hardcoded literal |
| `Unpublished` (column-derived) | `Chưa công bố` | replace L351 hardcoded literal |
| `Closed` (column-derived) | `Đã đóng` | replace L351 hardcoded literal |

The Project-level **business buttons** (`Publish` / `Unpublish` on the Project page) remain `Công bố dự án` / `Bỏ công bố dự án` (F11 frozen business-literal). The Project-level **column header** `Publish` becomes `Công bố` (T0 #1) — distinct from the button.

#### 3.2.2 JobOpening status

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `DRAFT` | `Bản nháp` | binding |
| `OPEN` | `Đang mở` | binding |
| `CLOSING_SOON` | `Sắp đóng` | binding |
| `CLOSED` | `Đã đóng` | binding |
| `FILLED` | `Đã đủ chỉ tiêu` | binding |
| `CANCELLED` | `Đã hủy` | binding |

#### 3.2.3 JobPosting status (canonical lifecycle unchanged)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `DRAFT` | `Bản nháp` | binding |
| `PUBLISHED` | `Đã đăng` | binding |
| `ARCHIVED` | `Đã lưu trữ` | binding |

The canonical lifecycle operation names `Publish` / `Unpublish` / `Archive` (the action keys that drive the lifecycle) are NEVER renamed — they remain canonical enum values on the API and Prisma. The **Vietnamese display** in §3.3 is what changes.

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

#### 3.2.7 Recruiter assignment status (`recruiter-assignment-manager.tsx:326-330`)

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
| `NONE` | `—` | `NextActionBadge.tsx:32` (em-dash preserved) |

#### 3.2.9 Media status (`app/admin/media/media-library-client.tsx`)

| Canonical enum | Vietnamese label |
| --- | --- |
| `PUBLIC` | `Công khai` |
| `INTERNAL` | `Nội bộ` |

#### 3.2.10 Identity verification (`app/admin/labor-profiles/[id]/page.tsx:82`)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `VERIFIED` | `Đã xác minh` | [T0 #16] |
| `PENDING` | `Đang chờ xác minh` | [T0 #16] |
| `REJECTED` | `Bị từ chối` | [T0 #16] |
| (other values) | fall back to canonical | `KEEP_CANONICAL_IDENTIFIER` |

#### 3.2.11 Service model (`JobOpening`)

| Canonical enum | Vietnamese label | Source |
| --- | --- | --- |
| `onsite` | `Tại nơi làm việc` | [T0 #17] |
| `remote` | `Từ xa` | [T0 #17] |

#### 3.2.12 AgeCell duration format

| Canonical format | Vietnamese label | Source |
| --- | --- | --- |
| `<1h` | `<1 giờ` | [T0 #15] |
| `Xh` | `X giờ` | [T0 #15] |
| `Xd Yh` | `X ngày Y giờ` | [T0 #15] |

### 3.3 Action terms (BINDING)

| # | English / canonical | Vietnamese primary | Frozen / source |
| ---: | --- | --- | --- |
| 1 | Project-level `Publish` business-button | `Công bố dự án` | F11 frozen business-literal |
| 2 | Project-level `Unpublish` business-button | `Bỏ công bố dự án` | F11 frozen business-literal |
| 3 | JobPosting `Publish` lifecycle operation (display) | `Đăng tin` | [T0 #2]; canonical lifecycle operation name `Publish` unchanged |
| 4 | JobPosting `Unpublish` lifecycle operation (display) | `Gỡ tin` | [T0 #2]; canonical lifecycle operation name `Unpublish` unchanged |
| 5 | JobPosting `Archive` lifecycle operation (display) | `Lưu trữ` | [T0 #2]; canonical lifecycle operation name `Archive` unchanged |
| 6 | JobOpening `Open` | `Mở đợt tuyển` | binding |
| 7 | JobOpening `Close` | `Đóng đợt tuyển` | binding |
| 8 | `Cancel` (StaffingOrder / JobOpening) | `Hủy` | binding |
| 9 | `Save` | `Lưu` | binding |
| 10 | `Create` | `Tạo` | binding |
| 11 | `Update` | `Cập nhật` | binding |
| 12 | `Claim` (assignment) | `Nhận phụ trách` | binding |
| 13 | `Assign` (recruiter) | `Phân công` | binding |
| 14 | `Resolve` (attendance) | `Xử lý` | binding |
| 15 | `Approve` (attendance) | `Duyệt` | binding |
| 16 | `Adjustment` (attendance) | `Điều chỉnh` | binding |
| 17 | `Dispute` (reconciliation) | `Tranh chấp` | binding |
| 18 | `Submit dispute` (reconciliation) | `Gửi tranh chấp` | binding |
| 19 | `Add Adjustment` (attendance) | `+ Tạo điều chỉnh` | binding |

**Note on F11 scope (T0 §2 closing paragraph)**: the editor shell's previous "preserve `Publish` / `Unpublish` / `Archive` verbatim" rule is removed. The Vietnamese display in rows #3-#5 applies on the editor shell and on every other surface. The static fence `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` is updated to assert the new labels while still asserting the F11 business-button literals on the Project-level buttons.

### 3.4 Role terms (BINDING — T0 §2 #3)

System roles are displayed in Vietnamese. The canonical `SystemRole` enum stays in `aria-label` / technical hint only (T0 §2 #3). Source: `app/admin/users/page.tsx:23-37` + `app/admin/admin-shell.tsx:455`.

| Canonical enum | Vietnamese label | Notes |
| --- | --- | --- |
| `ADMIN` | `Quản trị viên` | today: `Admin` |
| `HR_MANAGER` | `Quản lý nhân sự` | today: `HR Manager` |
| `HR_STAFF` | `Chuyên viên nhân sự` | today: `HR Staff` |
| `ACCOUNTANT` | `Kế toán` | (already Vietnamese) |
| `PM` | `PM` | canonical — keep |
| `SALE` | `Sale` | canonical — keep |
| `DIRECTOR` | `Giám đốc` | (already Vietnamese) |
| `WORKER` | `Người lao động` | [T0 #12] |
| `MKT` | `Marketing` | (already Vietnamese) |
| `VENDOR_ADMIN` | `Quản trị NCC` | today: `Vendor Admin` |
| `VENDOR_STAFF` | `Nhân viên NCC` | today: `Vendor Staff` |
| `CTV` | `Cộng tác viên` | (already Vietnamese) |
| `EMPLOYEE` | `Nhân viên` | today: `Employee` |

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
| 23 | `Worker ID (matched)` | `Mã người lao động (đã khớp)` | attendance form — T0 #14 binding |
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

### 3.7 Open Owner decisions

All 27 binding decisions in §3.1 / §3.2 / §3.3 / §3.4 / §3.5 are CLOSED (T0 §2). No `[OWNER]` markers remain.

The following items are **explicitly NOT bound by T0** in this round and remain advisory for a future revision:

- `Homepage Settings` (admin/settings H2): existing translation `Cài đặt trang chủ` retained (low-risk, not contested).
- `Media Library` (admin/media metadata title): existing translation `Thư viện Media` retained.
- `Employee code` (admin/attendance adjustment column) — distinct concept from `Worker ID`; not in T0 binding list, left as `Mã nhân viên`.
- `HRP Admin` brand title (admin/admin-shell.tsx brand subtitle); T0 bound only the role, not the brand. Left as-is unless Owner surfaces a brand-level revision.
- `Admin Portal` (sidebar subtitle) — `Cổng quản trị` retained from the audit draft; not in T0 binding list.

These advisories are NOT blockers for any wave.

## 4. Architecture (proposed, T0 §3.C applied)

### 4.1 Decision: NO i18n library

The audit (§6) found 5 typed dictionaries already in place; introducing `next-intl` / `react-intl` adds 0 benefit and 1 migration cost. **Decision: stay with the typed dictionary pattern.** If Owner later wants multi-language, the dictionaries become a thin translation table and the rest of the architecture is preserved.

### 4.2 Decision: domain-owned typed dictionaries + shared cross-module glossary (T0 §3.C)

A future T1 batch creates:

- `src/shared/i18n/glossary.ts` — canonical **cross-module** Vietnamese terms only (Project, StaffingOrder, JobOpening, JobPosting, LaborProfile, Worker, etc.). Module-owned dictionaries import the entries they reuse. **No global status dictionary that owns all domains.**
- `src/shared/i18n/role-labels.ts` — `{ roleLabel(role) }` for `SystemRole` → Vietnamese label (T0 §2 #3 binding).
- `src/shared/i18n/form-dictionary.ts` — common form/table headers (`Status`, `Action`, `Created`, `Updated`, `Name`, `Code`, `Description`, `Reason (required)`, etc.).
- `src/shared/i18n/action-dictionary.ts` — `{ actionLabel(action) }` for canonical action → Vietnamese label.
- `src/shared/ui/status-badge/` — `<StatusBadge module="<module-name>" status="<status>" />` presentation primitive. **Reads from the domain-owned dictionary** the consumer passes via `module`. `<StatusBadge>` does NOT own dictionary data itself; it only takes `(module, status)` and renders the matching label/tone from the dictionary the consumer imported.

**Module-owned typed dictionaries** (NOT owned by any global module):

- `src/domains/projects/project-ui.ts` — Project status + Project publish-button labels + F11 business-button literals.
- `src/domains/staffing/job-opening-ui.ts` — JobOpening status + serviceModel labels.
- `src/domains/staffing/job-posting-ui.ts` — JobPosting status + display action labels (`Đăng tin` / `Gỡ tin` / `Lưu trữ`) keyed off the canonical `Publish`/`Unpublish`/`Archive` operation names.
- `src/domains/staffing/staffing-order-ui.ts` — StaffingOrder + Slot labels.
- `src/domains/staffing/recruiter-assignment-ui.ts` — Recruiter assignment status dictionary.
- `src/domains/workforce/worker-ui.ts` — Worker status + Worker ID label.
- `src/domains/labor-profile/labor-profile-ui.ts` — LaborProfile + IdentityVerification labels.
- `src/domains/media/media-ui.ts` — Media status + caption/alt labels.
- (already in place, no change) `src/domains/applications/placement-ui.ts` — Application status + source + lifecycle actions.
- (already in place, no change) `src/domains/staffing/job-posting-error-map.ts` — JobPosting error codes.
- (already in place, no change) `app/admin/recruiter-workbench/_components/NextActionBadge.tsx` — 7-value exhaustive map.

**Boundary rule**: a module-owned dictionary imports its cross-module terms from `glossary.ts` and does NOT re-export its own dictionary into any global aggregator. Consumers in `app/admin/<route>/page.tsx` import the dictionary for their module directly. The shared `<StatusBadge>` component is the only UI element any module is required to use, and it accepts the dictionary via props or via the consumer's import graph.

**No rewrite of consumer imports** is required for the existing dictionaries (`placement-ui.ts`, `job-posting-error-map.ts`, inline `STATUS_CONFIG` in `projects/page.tsx`, `workers/page.tsx`, `recruiter-assignment-manager.tsx`, `NextActionBadge.tsx`); they remain importable. Wave 1 does NOT require touching every consumer.

### 4.3 Module ownership (BINDING — T0 §4)

| Module | File | Owner (binding) |
| --- | --- | --- |
| Cross-module glossary | `src/shared/i18n/glossary.ts` (NEW) | T1B (Wave 1) |
| Common form/table labels | `src/shared/i18n/form-dictionary.ts` (NEW) | T1B (Wave 1) |
| Action labels | `src/shared/i18n/action-dictionary.ts` (NEW) | T1B (Wave 1) |
| Role labels | `src/shared/i18n/role-labels.ts` (NEW) | T1B (Wave 1) |
| Status badge UI | `src/shared/ui/status-badge/` (NEW) | T1B (Wave 1) |
| Project status dictionary | `src/domains/projects/project-ui.ts` (NEW) | T1B (Wave 2) |
| JobOpening status dictionary | `src/domains/staffing/job-opening-ui.ts` (NEW) | T1B (Wave 2) |
| JobPosting status dictionary | `src/domains/staffing/job-posting-ui.ts` (NEW) | T1B (Wave 2) |
| Staffing Order dictionary | `src/domains/staffing/staffing-order-ui.ts` (NEW) | T1B (Wave 2) |
| Recruiter assignment dictionary | `src/domains/staffing/recruiter-assignment-ui.ts` (NEW) | T1B (Wave 2) |
| Worker status dictionary | `src/domains/workforce/worker-ui.ts` (NEW) | T1B (Wave 3) |
| LaborProfile dictionary | `src/domains/labor-profile/labor-profile-ui.ts` (NEW) | T1B (Wave 3) |
| Media dictionary | `src/domains/media/media-ui.ts` (NEW) | T1B or T1C depending on Media/Settings timing (see §5.3) |
| Application dictionary (existing) | `src/domains/applications/placement-ui.ts` | T1B (Wave 2 — touch-up only) |
| Application errors (existing) | `src/domains/staffing/job-posting-error-map.ts` | (no change) |
| Next-action (frozen) | `app/admin/recruiter-workbench/_components/NextActionBadge.tsx` | T1B (Wave 3 — H1 + breadcrumb + metadata + AgeCell binding only; underlying map unchanged) |

The Application dictionary and error map already exist with Vietnamese labels; Wave 2 adds `JobOpening` / `JobPosting` / `Staffing Order` / `Recruiter assignment` dictionaries and updates the inline `STATUS_CONFIG` in `projects/page.tsx` / `workers/page.tsx` to import from their domain-owned dictionary. Wave 3 adds the workforce dictionaries and the LaborProfile dictionary.

### 4.4 Forbidden-English allowlist (T0 §3.D + F11 clarified)

The static-fence tests (§6) assert that the following English / canonical literals **must** appear at the listed sites and **must not** appear elsewhere (T0 §3.D uses per-route forbidden-literal lists; allowlists cover canonical identifiers).

| Literal | Must appear in | Must not appear in |
| --- | --- | --- |
| `Công bố dự án` (Project publish button — F11) | `app/admin/jobs/page.tsx` Project-level action | any non-F11 surface |
| `Bỏ công bố dự án` (Project unpublish button — F11) | `app/admin/jobs/page.tsx` Project-level action | any non-F11 surface |
| `Publish` (canonical lifecycle operation — API + route key) | API request bodies, server lifecycle handler, `app/admin/jobs/job-postings/[id]/editor-shell.tsx` action key | any operator-visible display label (UI shows `Đăng tin`; canonical name only in `value`/aria) |
| `Unpublish` (canonical lifecycle operation) | API request bodies, server lifecycle handler | any operator-visible display label |
| `Archive` (canonical lifecycle operation) | API request bodies, server lifecycle handler | any operator-visible display label |
| `Slug` (raw token) | JobPosting code, API field | never in operator-visible label (always wrapped in Vietnamese parens) |
| `Revision` (raw token) | JobPosting code, API field | never in operator-visible label |
| `IdentityVerification` enum | Prisma schema, route response | never in operator-visible chip (always go through `identityVerificationLabel()`) |
| `SystemRole` enum | Prisma schema, server session | never in operator-visible role chip (always go through `roleLabel()`; canonical enum preserved in aria/tooltip per T0 §2 #3) |
| `<1h` / `Xh` / `Xd Yh` (canonical duration format on API) | API payload | `<StatusBadge>` rendering (UI shows `<1 giờ` / `X giờ` / `X ngày Y giờ` per T0 §2 #15) |

The static fence `admin-jobs-terminology.static.test.ts` is updated to assert the new Vietnamese labels while still asserting the F11 business-button literals.

### 4.5 Raw enum / error leakage guard (T0 §3.D)

Per T0 §3.D, **no ESLint plugin is added** (no `eslint-plugin-no-raw-enum-render`, no `eslint-plugin-no-vietnamese-without-diacritics`). Detection is done by **targeted Vitest / static source tests**:

- `<StatusBadge module="..." status="..." />` is the only sanctioned presentation primitive for status rendering. Static tests (§6) assert that no `<span>{status}</span>` interpolation appears in the changed Admin surface unless the status is rendered through `<StatusBadge>` or a domain dictionary lookup. The check is per-route, not via heuristic regex.
- `<StatusBadge>` reads from the consumer's domain-owned dictionary; **never** from a global aggregator. This is enforced by static test, not by lint.
- **Diacritic-missing detection** is done by **explicit forbidden-literal lists per route**, e.g. `forbid(['Huy', 'Dang', 'tao'])` in `attendance-terminology.static.test.ts`, combined with an **allowlist** for canonical tokens (`null`, `undefined`, `false`, `true`, `M4`, `M8`, etc.) and proper-name exceptions. No regex heuristic is used (would false-positive on Vietnamese proper names, user-entered data, canonical identifiers — see audit §2.4 #4).
- A new error mapper `src/shared/i18n/error-dictionary.ts` re-exports `JOB_POSTING_ERROR_LABELS` + `CONFLICT_LABELS` and provides `errorLabel({ module, code, fallback })` for future use. Existing consumers continue to import from the original modules.

## 5. Implementation waves (BINDING — T0 §4)

### 5.1 Wave 1 — Shared localization foundation (T1B sole owner)

**Goal**: establish the cross-module glossary, the shared presentation primitive, the role labels, the action labels, the form-dictionary, the admin shell / nav terminology, and the F11-aware static-fence update. **T1B is the sole owner** of this wave. No T1A / T1C / shared mutation. The shared localization foundation MUST land as the very first deliverable so every downstream wave has a single source of truth.

**File ownership** (no overlap with M2A F11 or UI2 / F6):

- NEW: `src/shared/i18n/glossary.ts` (cross-module Vietnamese terms only)
- NEW: `src/shared/i18n/form-dictionary.ts` (common form/table headers)
- NEW: `src/shared/i18n/action-dictionary.ts` (canonical action → Vietnamese label)
- NEW: `src/shared/i18n/role-labels.ts` (T0 §2 #3 binding)
- NEW: `src/shared/i18n/error-dictionary.ts` (re-export of existing error mappers)
- NEW: `src/shared/ui/status-badge/` (presentation primitive; module-aware)
- MODIFY: `src/shared/ui/role-guard/role-guard-layout.tsx` (L-001 sidebar `Staffing` → `Nhu cầu tuyển dụng`; L-003 role chip Vietnamese; L-004 default `User` → `Người dùng`)
- MODIFY: `app/admin/admin-shell.tsx` (role display update only; no string changes beyond the role chip)
- MODIFY: `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (L-006 `(no name)` → `(chưa có tên)`)
- MODIFY: `app/admin/labor-profiles/[id]/page.tsx` (L-007 `identityVerification` dictionary → `Đã xác minh` / `Đang chờ xác minh` / `Bị từ chối`)
- MODIFY: `app/admin/applications/page.tsx` (L-047 `CCCD` → `Số CCCD`)
- MODIFY: `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (update assertions to reflect F11 scope clarification §9; new column header `Công bố`; new editor-shell display labels `Đăng tin` / `Gỡ tin` / `Lưu trữ`)
- NEW TEST: `src/shared/i18n/__tests__/glossary.static.test.ts` (verifies every cross-module entry has a Vietnamese label; no missing keys; no orphan keys)
- NEW TEST: `src/shared/i18n/__tests__/form-dictionary.static.test.ts`
- NEW TEST: `src/shared/i18n/__tests__/action-dictionary.static.test.ts`
- NEW TEST: `src/shared/i18n/__tests__/role-labels.static.test.ts`
- NEW TEST: `src/shared/ui/status-badge/__tests__/status-badge.test.tsx` (renders Vietnamese labels from consumer-supplied dictionary; no global dictionary; passes for the 5+ canonical enum values per module)

**Acceptance criteria**:

- All shared dictionaries ship and are unit-tested.
- `<StatusBadge>` reads from consumer-supplied module dictionary.
- Sidebar L-001, L-003, L-004, L-006, L-007 are fixed.
- Static-fence test `admin-jobs-terminology.static.test.ts` is updated to assert the new Vietnamese labels while still asserting the F11 business-button literals.
- No canonical enum/API change.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: NONE. T1B is sole owner of Wave 1. No file is shared with T1A or T1C in this wave.

### 5.2 Wave 2 — Recruitment high-traffic (T1B sole owner)

**Goal**: fix the most visible English on the high-traffic recruitment flows (Project, JobPosting, JobOpening, Staffing, Applications). **T1B is the sole owner**. **Wave 2 MUST merge before T1A opens Mốc 3 source on the JobPosting editor.**

**File ownership**:

- MODIFY: `app/admin/jobs/page.tsx` (L-010..L-018 — Project list)
- MODIFY: `app/admin/jobs/job-postings/page.tsx` (L-019..L-025 — JobPosting list)
- MODIFY: `app/admin/jobs/job-postings/[id]/page.tsx` (L-026..L-035 — JobPosting detail; F11 buttons preserved)
- MODIFY: `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (display labels `Đăng tin` / `Gỡ tin` / `Lưu trữ` per T0 §2 #2; canonical lifecycle operation names unchanged)
- MODIFY: `app/admin/job-openings/[id]/page.tsx` (L-036..L-043)
- MODIFY: `app/admin/staffing/staffing-list-client.tsx` (L-044..L-046)
- MODIFY: `app/admin/staffing/page.tsx` (verify H1 inheritance)
- NEW: `src/domains/projects/project-ui.ts` (L-014/L-015/L-018)
- NEW: `src/domains/staffing/job-opening-ui.ts` (L-035, L-037, L-038)
- NEW: `src/domains/staffing/job-posting-ui.ts` (L-023, L-025, L-034, L-035)
- NEW: `src/domains/staffing/staffing-order-ui.ts` (L-044, L-045)
- NEW: `src/domains/staffing/recruiter-assignment-ui.ts` (L-009)
- NEW TEST: `app/admin/jobs/__tests__/jobs-terminology.static.test.ts` (extends F11 fence; adds L-010..L-018)
- NEW TEST: `app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts`
- NEW TEST: `app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts`
- NEW TEST: `app/admin/staffing/__tests__/staffing-terminology.static.test.ts`

**Acceptance criteria**:

- All P0 / P1 / P2 findings on the 4 surfaces are fixed.
- No raw enum leakage on `/admin/jobs` (L-014, L-015, L-018).
- F11 business-button literals preserved (Project-level `Công bố dự án` / `Bỏ công bố dự án`); editor-shell display adopts `Đăng tin` / `Gỡ tin` / `Lưu trữ`; canonical lifecycle operation names unchanged.
- All `<option>` values remain canonical enum; only the displayed text changes.
- `<StatusBadge module="..." status="..." />` used everywhere a status is rendered.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: NONE. T1B is sole owner of Wave 2. No file is shared with T1A or T1C in this wave.

### 5.3 Wave 3 — Workforce / partner / system (T1B sole owner)

**Goal**: fix the remaining user/worker/labor-profile/clients/vendors surfaces and (gated) media/settings. **T1B is the sole owner** of:

- `app/admin/users/**`
- `app/admin/workers/**`
- `app/admin/labor-profiles/**`
- `app/admin/clients/**`
- `app/admin/vendors/**`

Media / Settings ownership is **gated**:

- If UI2 has merged into `main` AND the Mốc 3 work on the Media Library has NOT yet started: T1B owns Media / Settings in this wave.
- If Mốc 3 has started work on the Media Library: T1B defers Media / Settings to a future wave AFTER Mốc 3 lands, with explicit file ownership recorded in the next wave contract.

**File ownership (T1B)**:

- MODIFY: `app/admin/users/page.tsx` (L-086..L-089)
- MODIFY: `app/admin/workers/page.tsx` (L-107, dictionary lift)
- MODIFY: `app/admin/labor-profiles/page.tsx` (verify; already-good)
- MODIFY: `app/admin/labor-profiles/[id]/page.tsx` (L-118)
- MODIFY: `app/admin/labor-profiles/new/page.tsx` (verify)
- MODIFY: `app/admin/clients/page.tsx` (verify; already-good)
- MODIFY: `app/admin/vendors/page.tsx` (verify)
- NEW: `src/domains/workforce/worker-ui.ts` (L-107)
- NEW: `src/domains/labor-profile/labor-profile-ui.ts` (L-118 + IdentityVerification)
- NEW TEST: `app/admin/users/__tests__/users-terminology.static.test.ts`
- NEW TEST: `app/admin/workers/__tests__/workers-terminology.static.test.ts`
- NEW TEST: `app/admin/labor-profiles/__tests__/labor-profiles-terminology.static.test.ts`

**Acceptance criteria**:

- All P0 / P1 / P2 findings on the 3 main T1B surfaces are fixed.
- `ROLE_LABELS` consolidated to `src/shared/auth/role-labels.ts` (lift from `app/admin/users/page.tsx`).
- No raw `IdentityVerification` or `serviceModel` enum leakage.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: NONE in this wave. T1B is sole owner. Media / Settings ownership is deferred or included based on the gating rule above.

### 5.4 Wave 4 — Attendance, Reconciliation, Tickets, Payroll/Commission copy (T1C sole owner)

**Goal**: fix the heaviest-leakage surfaces (`/admin/attendance`, `/admin/reconciliation`) and add the diacritic-missing forbidden-literal tests + dictionary exhaustiveness tests. **T1C is the sole owner** of this wave. **T1B does NOT edit any file in this wave.** T1B only reviews the glossary additions for cross-module consistency; if T1C needs a glossary entry changed, T1C files a separate correction batch on the glossary (T1B-curated) and T1B merges it.

**File ownership**:

- MODIFY: `app/admin/attendance/page.tsx` (L-049..L-060, 12 findings)
- MODIFY: `app/admin/reconciliation/page.tsx` (L-061..L-085, 25 findings; 12 diacritic-missing)
- MODIFY: `app/admin/tickets/page.tsx` (L-103)
- MODIFY: `app/admin/payroll/page.tsx` (verify)
- MODIFY: `app/admin/commission/policies/page.tsx` (verify)
- MODIFY: `app/admin/commission/ledger/page.tsx` (verify)
- NEW: `src/shared/i18n/attendance-labels.ts` (L-049..L-060) — owned by T1C; imports cross-module terms from `glossary.ts`
- NEW: `src/shared/i18n/reconciliation-labels.ts` (L-061..L-085) — owned by T1C; imports cross-module terms from `glossary.ts`
- NEW TEST: `app/admin/attendance/__tests__/attendance-terminology.static.test.ts` (forbidden-literal list `[..., 'Huy', 'Dang', 'tao']`; allowlist for canonical tokens)
- NEW TEST: `app/admin/reconciliation/__tests__/reconciliation-terminology.static.test.ts`
- NEW TEST: `app/admin/tickets/__tests__/tickets-terminology.static.test.ts`
- NEW TEST: `app/admin/payroll/__tests__/payroll-terminology.static.test.ts`
- NEW TEST: `app/admin/commission/__tests__/commission-terminology.static.test.ts`

**Acceptance criteria**:

- All P0+P1 findings on `/admin/attendance` and `/admin/reconciliation` are fixed.
- All 12 diacritic-missing occurrences on `/admin/reconciliation` are fixed; 3 on `/admin/attendance` are fixed.
- Forbidden-literal static tests pass for each route.
- No canonical enum/API change.
- `git diff --check` clean.
- UTF-8 no BOM, LF-only.
- CI 4/4 GREEN.

**Parallelization**: NONE between T1B and T1C in this wave. T1C owns all files. T1B reviews the glossary additions only (read-only).

### 5.5 Wave 5 — Production visual walkthrough (T0/Owner)

**Goal**: Owner-driven visual smoke on the production Admin Portal across desktop + mobile viewport of the Admin Portal, confirming the Vietnamese-first UX and capturing any final debt. **This wave does NOT extend to Worker Portal `app/m/**` per T0 §4.**

**Owner**: T0/Owner executes. NOT a code-touching wave.

**Acceptance criteria**:

- All P0 / P1 / P2 findings resolved on desktop.
- All P0 / P1 / P2 findings resolved on mobile viewport of the Admin Portal (`/admin/**` rendered at mobile breakpoint).
- No raw English/status on the priority Admin routes.
- A short handback note is added to `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_WALKTHROUGH.md` (NEW) listing remaining debt + Owner acceptance.

## 6. Test strategy (T0 §3.D applied)

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

  it('respects F11 business-button literal', () => {
    if (surface === '/admin/jobs') {
      expect(source).toContain('Công bố dự án');
      expect(source).toContain('Bỏ công bố dự án');
    }
  });

  it('forbids diacritic-missing literals (per-route allowlisted list)', () => {
    const forbidden = ['Huy', 'Dang', 'tao']; // extend per route; allowlist covers canonical tokens
    for (const literal of forbidden) {
      expect(source).not.toContain(literal);
    }
  });
});
```

### 6.2 Component render test

`<StatusBadge>` and the dictionary exports get unit tests that assert every enum value has a Vietnamese label and the badge renders the correct label + tone. The `<StatusBadge>` test verifies it reads from the consumer-supplied module dictionary, NOT from a global aggregator.

### 6.3 Route/page smoke

Each wave ships with a smoke that fetches the route (with the same role-gate the production page enforces) and asserts:

- The H1 matches the Vietnamese label from the glossary.
- The dictionary-fed `<select>` renders the Vietnamese label, not the raw enum.
- The status badge renders the Vietnamese label.

### 6.4 Glossary consistency

`src/shared/i18n/__tests__/glossary.static.test.ts` walks every entry in the cross-module glossary and asserts:

- Every entry has a non-empty `label` (Vietnamese) and a non-empty `code` (canonical).
- No two entries share the same `code`.

### 6.5 Forbidden-English allowlist

A new test `__tests__/forbidden-english.scan.test.ts` walks `app/admin/**` and asserts that none of the §4.4 forbidden literals appear at non-allowed sites.

### 6.6 Vietnamese-first pass

`__tests__/vietnamese-first.scan.test.ts` walks each priority Admin route and asserts that the ratio of Vietnamese characters in operator-visible strings is ≥ 95% (configurable per surface; default 95%). This catches accidental English regression in future PRs.

### 6.7 Diacritic-missing detection (T0 §3.D)

Diacritic-missing detection uses **explicit forbidden-literal lists per route** (per §4.5), combined with an **allowlist** for canonical tokens (`null`, `undefined`, `false`, `true`, `M4`, `M8`, etc.) and proper-name exceptions. No regex heuristic, no ESLint plugin.

## 7. Acceptance criteria (overall, post-wave 5)

- All 119 audit findings (98 actionable + 21 templates) are addressed.
- All 15 diacritic-missing occurrences are fixed (no longer labeled `ENCODING_LOSS_LEGACY`).
- No raw English/status on the priority Admin routes (verified by per-route forbidden-literal tests + `vietnamese-first.scan.test.ts`).
- Production walkthrough PASSES (T0/Owner-driven, desktop + mobile Admin viewport, NOT Worker Portal).
- Remaining debt is listed in `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_WALKTHROUGH.md` and Owner has accepted in writing.
- No canonical DB enum/API field changed.
- No F11 business-button literal violated (`Công bố dự án` / `Bỏ công bố dự án` on Project-level actions).
- All static-fence tests + glossary tests + forbidden-literal tests + dictionary exhaustiveness tests active in CI; CI 4/4 GREEN on `main`.

## 8. Rollback boundary

Each wave is a standalone PR. If a wave breaks an F11 business-button literal (`Công bố dự án` / `Bỏ công bố dự án`) or a static-fence test, the test will fail in CI before merge, so the wave cannot land.

If a wave lands and an issue is found in production:

- Revert the wave PR (`git revert <merge-sha>`).
- The dictionary exports are additive (no destructive change), so the revert is safe.
- If a per-route forbidden-literal test fires a false positive, the test can be temporarily relaxed with a TODO to fix the underlying issue; this does NOT require touching the dictionary or the route file.

## 9. Production verification

After Wave 5 (Owner visual walkthrough), the audit's handback closes. Production verification is a non-engineering step (Owner logins, navigates the routes, captures screenshots). The audit does NOT prescribe automated Playwright/Cypress tests in this round — they are a separate T1 contract (P2.1 candidate).

## 10. Dependency with UI2, Mốc 3-5, and P2.1 (T0 §5 binding)

P2.1 only opens after ALL of the following hold (T0 §5, in order):

1. UI V1 closeout lands;
2. UI2 production PASS;
3. Mốc 2 / F6 production PASS;
4. Mốc 3 production PASS;
5. Mốc 4 YouTube production PASS;
6. Mốc 5 burn-in PASS;
7. all 5 localization waves merged into `main`;
8. Admin production walkthrough (Wave 5) PASSES;
9. remaining debt listed and Owner has accepted it in writing;
10. `PRE_P2_CLOSEOUT` recorded.

Other dependencies (non-blocking for P2.1 but tracked):

- **UI2**: runs in parallel; no file ownership overlap (UI2 is `app/viec-lam/**` + public surface; this plan is `app/admin/**` + `src/domains/**` dictionaries).
- **F6**: F6 is now closed by PR #93 (post-merge `f570db06`). No overlap.
- **Mốc 3-5** (Tickets / Attendance / Reconciliation / Payroll / Commission): Wave 4 of this plan covers `/admin/attendance` and `/admin/reconciliation` (the two most-leaky modules); Mốc 3-5 deliverable work is a separate stream. The dictionaries produced in Wave 4 (T1C-owned) feed into the Mốc 3-5 stream so that future Mốc work reuses the consolidated labels. Wave 4 ownership is T1C sole — T1B does NOT co-edit Wave 4 files.
- **Mốc 3 on JobPosting editor**: Wave 2 (T1B-owned) MUST merge BEFORE T1A opens Mốc 3 source on the JobPosting editor.

## 11. Open Owner decisions (rolled up from §3.7)

All 27 binding decisions in §3.1 / §3.2 / §3.3 / §3.4 / §3.5 are CLOSED (T0 §2). The previous 12-row `[OWNER]` matrix is removed.

The advisory items in §3.7 (`Homepage Settings`, `Media Library`, `Employee code` on attendance, `HRP Admin` brand title, `Admin Portal` sidebar subtitle) are NOT T0-bound in this round and do NOT block any wave. They can be revisited in a future revision cycle if Owner surfaces a concern.

## 12. Handback

This execution plan is delivered alongside:

- `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md` — audit ledger.
- `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/TASK.md` — task contract.

T0/Owner handback inputs:

1. baseline/latest-main reconciliation: `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (post-merge PR #93)
2. route/file coverage: 38 routes + 6 dictionaries + 1 shared status badge primitive (per audit §4 + plan §4.3)
3. total findings: 119 (98 actionable + 21 templates)
4. revised severity counts: **0 P0 / 44 P1 / 36 P2 / 3 P3 / 15 diacritic-missing** (per T0 §3.A; the original `7 P0 / 37 P1` is reconciled)
5. binding glossary: plan §3 (T0 §2 applied; 27 binding entries; `[OWNER]` markers removed)
6. implementation waves (T0 §4 binding):
   - Wave 1 — shared localization foundation (T1B sole)
   - Wave 2 — recruitment (T1B sole; must merge before Mốc 3 on JobPosting editor)
   - Wave 3 — workforce / partner / system (T1B sole for Users / Workers / LaborProfiles / Clients / Vendors; Media/Settings gated on UI2 vs Mốc 3)
   - Wave 4 — attendance / reconciliation / tickets / payroll / commission (T1C sole; T1B review only)
   - Wave 5 — production walkthrough (T0/Owner; desktop + mobile Admin viewport, NOT Worker Portal)
7. parallelization: T1A / T1B / T1C do NOT touch the same file in any wave; no file overlap across waves
8. file ownership: see §5 wave-by-wave
9. exact changed files (this round): 3 (audit, plan, TASK.md) — forward-only corrections per T0 §6
10. commit/PR/CI: forward-only commit on `codex/t1b-admin-portal-vietnamese-localization-audit`; same PR #94; CI 4/4 GREEN required; MERGEABLE/CLEAN; **STOP before merge**
11. remaining Owner decisions: 0 (all binding per §3.7 / §11); 5 advisory items noted
12. P2.1 dependency list: see §2 / §10 (10 ordered gates)