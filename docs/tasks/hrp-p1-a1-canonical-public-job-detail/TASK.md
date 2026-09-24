# TASK — hrp-p1-a1-canonical-public-job-detail

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a1-canonical-public-job-detail` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Audit reason | `Ensures public-facing data leaks are prevented and routes correctly bind to canonical source.` |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `b34cdddd5c9bbfbda2cc276abf47f328e42af40c` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/domains/job-board/public.service.ts, app/(jobs)/viec-lam/**, src/domains/job-board/*.test.ts, src/domains/job-board/components/**` |
| Forbidden paths | `None` |
| Required gates | `npm run test:unit src/domains/job-board; npm run typecheck; npm run lint` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `LIGHT: /deliver → /audit → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

- Bề mặt public (`/viec-lam` và `/viec-lam/[slug]`) đọc dữ liệu từ nguồn thật `JobPosting` (bản có status PUBLISHED). Gỡ bỏ hoàn toàn fixture nội dung. Tối ưu SEO metadata. Bắt buộc Apply liên kết tới đúng Posting/Opening.

### 1.2 Non-goals

- Không sửa frontend thiết kế (CSS/HTML cấu trúc tổng thể).
- Không đụng chạm tới schema hay backend publish (P1-A0).
- Không thêm chức năng marketplace phức tạp (Kanban, chia sẻ QR).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:400` | Liệt kê public list hiện đọc sai nguồn `Project`, cần đổi sang `JobPosting`. |
| `EV-02` | `app/(jobs)/viec-lam/[slug]/page.tsx` | Trang chi tiết hiện phụ thuộc fixture do thiếu backend. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | DRAFT và ARCHIVED không lộ ra ở public routes (trả về 404). | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Danh sách `/viec-lam` hiển thị `JobPosting` (PUBLISHED). |
| `RQ-02` | Chi tiết `/viec-lam/[slug]` render nội dung thật từ `JobPosting`. |
| `RQ-03` | DRAFT và ARCHIVED trả về 404. |
| `RQ-04` | Apply form liên kết tới đúng `JobPosting` và `JobOpening` ID. |
| `RQ-05` | SEO metadata sử dụng nội dung thật từ `JobPosting`. |
| `RQ-06` | Filter của danh sách vẫn hoạt động đúng trên nguồn dữ liệu mới. |

### 4.2 Scope boundaries

- **In:** Public UI components, public.service.ts, job-board unit tests.
- **Out:** Admin UI, schema migration.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**`

### 4.3 Domain boundaries

- **Data/state:** Read-only access to JobPosting.
- **Permission/security:** Only PUBLISHED JobPostings are accessible.
- **Interface/API:** Server Actions and UI projections.
- **Migration/rollback:** N/A

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/job-board/public.service.ts` | Refactor query lấy `JobPosting` làm root. | `AC-01` | Query fail |
| `STEP-02` | `app/(jobs)/viec-lam/**` | Xóa fixture, bind real data. | `AC-02` | UI lỗi hiển thị |
| `STEP-03` | `app/(jobs)/viec-lam/**` | Fix filter và SEO metadata. | `AC-03` | Filter sai |
| `STEP-04` | `app/(jobs)/viec-lam/**` | Sửa luồng Apply truyền đúng IDs. | `AC-01` | Unit test rớt |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Unit tests của public routes và UI chạy thành công. | `npm run test:unit src/domains/job-board` |
| `AC-02` | Không còn fixture hardcode trong trang chi tiết. | `grep -rFi "fixture" app/(jobs)/viec-lam` không tìm thấy |
| `AC-03` | Front-end compile typecheck linter không lỗi. | `npm run typecheck && npm run lint` |
| `AC-04` | Truy cập thử một slug không publish sẽ nhận 404. | `AC-01` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-03` |
| `RQ-02` | `STEP-01`, `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-01` | `AC-04` |
| `RQ-04` | `STEP-04` | `AC-01` |
| `RQ-05` | `STEP-03` | `AC-01` |
| `RQ-06` | `STEP-03` | `AC-01` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Phá vỡ UI do mismatch DTO mới. | Chạy regression static tests. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-24` | Initial contract | Initial |
