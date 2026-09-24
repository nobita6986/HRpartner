# TASK — hrp-p1-a0-jobposting-authoring-publish

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a0-jobposting-authoring-publish` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | `Critical path for JobPosting marketplace data integrity, schema and permission.` |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `b34cdddd5c9bbfbda2cc276abf47f328e42af40c` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `prisma/schema.prisma, src/domains/job-board/job-posting-authoring.service.ts, app/api/admin/jobs/job-postings/**, tests/db/job-posting-authoring.integration.test.ts, app/admin/jobs/job-postings/**` |
| Forbidden paths | `None` |
| Required gates | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts; npm run typecheck; npm run lint` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `LIGHT: /deliver → /audit → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

- Admin có khả năng tạo bản nháp (DRAFT), chỉnh sửa nội dung, xem trước, xuất bản (PUBLISHED), và lưu trữ (ARCHIVED) tin tuyển dụng công khai, với `JobPosting` là the canonical source of truth. Schema `JobPosting` được cập nhật với các field nội dung thực tế.

### 1.2 Non-goals

- Không mở full CMS (Media Library, drag & drop page builder).
- Không tự động migrate dữ liệu cũ từ `Project.isPublic` (sẽ do Owner quyết định riêng).
- Không chạm tới public pages `/viec-lam` (sẽ do P1-A1 thực hiện).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:400` | Chứng minh listing hiện đọc sai nguồn `Project`, cần source of truth mới. |
| `EV-02` | `app/admin/jobs/job-postings/[id]/page.tsx` | Chứng minh editor UI mới chỉ là READ_ONLY_SHELL. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Schema `JobPosting` tối thiểu có title, description, salaryDisplay | `CHOSEN` |
| `DEC-02` | State transition: DRAFT <-> PUBLISHED -> ARCHIVED | `CHOSEN` |
| `DEC-03` | BUILD_VS_ADOPT: Sử dụng Tiptap OSS (MIT) cho rich-text thay vì tự build contentEditable. Persist canonical JSON có `schemaVersion`. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Mở rộng schema `JobPosting` (title, description, benefits, requirements, salaryDisplay). Các field rich-text lưu dạng canonical JSON kèm `schemaVersion`. |
| `RQ-02` | API tạo DRAFT JobPosting từ một canonical JobOpening. |
| `RQ-03` | API lưu DRAFT có optimistic concurrency (revision check). |
| `RQ-04` | Hỗ trợ generate slug duy nhất cho JobPosting. |
| `RQ-05` | API publish/archive với RLS authorization (Admin/Sale/PM). |
| `RQ-06` | Sửa Editor Shell thành Real Editor gọi API backend. |

### 4.2 Scope boundaries

- **In:** Schema changes, Backend service, API routes, Integration Tests, Admin UI. Package `tiptap` version đề xuất `~2.2.0`, tác động lockfile. Shared editor wrapper tại `src/shared/ui/editor/**`.
- **Out:** Public pages, evidence migration. Không cài plugin hình ảnh, video, HTML.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**`

### 4.3 Domain boundaries

- **Data/state:** `JobPosting` status state machine, revision checks.
- **Permission/security:** `JobPosting` mutations restricted to authoring roles. Node allowlist cho rich-text payload.
- **Interface/API:** Backend API for Admin JobPosting. Client HTML không được tin tưởng.
- **Migration/rollback:** Schema migration must be forward-only additive.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `prisma/schema.prisma` | Khai báo schema mới và tạo migration. | `AC-01` | Schema không validate |
| `STEP-02` | `src/domains/job-board/job-posting-authoring.service.ts` | Backend core logic. | `AC-02` | Logic sai rls |
| `STEP-03` | `tests/db/job-posting-authoring.integration.test.ts` | Integration tests. | `AC-02` | Test fail |
| `STEP-04` | `app/api/admin/jobs/job-postings/**` | Restful APIs có validate JSON schemaVersion. | `AC-02`, `AC-05` | Test fail |
| `STEP-05` | `src/shared/ui/editor/**` | Dựng shared wrapper cho Tiptap với profile JobPosting. | `AC-03`, `AC-06` | UI error |
| `STEP-06` | `app/admin/jobs/job-postings/**` | Frontend bindings gọi API, tích hợp editor. | `AC-03`, `AC-04` | UI error |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Schema Prisma chuẩn xác, gen và compile thành công. | `npx prisma validate` |
| `AC-02` | Test chạy pass, cover transition matrix, RLS, negative path. | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts` |
| `AC-03` | Front-end typecheck và lint không có lỗi phát sinh. | `npm run typecheck && npm run lint` |
| `AC-04` | API chặn thao tác nếu mismatch revision. | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts` |
| `AC-05` | Backend reject JSON payload chứa node trái phép (ảnh, video). | `npm run test:integration tests/db/job-posting-authoring.integration.test.ts` |
| `AC-06` | Bundle UI/editor wrapper lockfile update hợp lệ. | `npm list @tiptap/react @tiptap/starter-kit` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-02`, `AC-04` |
| `RQ-04` | `STEP-02` | `AC-02` |
| `RQ-05` | `STEP-02` | `AC-02` |
| `RQ-06` | `STEP-05`, `STEP-06` | `AC-03`, `AC-06` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Lỗi conflict mutation `JobPosting` | Optimistic concurrency (revision) và state machine guard |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-24` | Initial contract | Initial |
