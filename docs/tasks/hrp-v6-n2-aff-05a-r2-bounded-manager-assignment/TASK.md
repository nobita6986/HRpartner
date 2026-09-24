# Bounded Manager Assignment (AFF-05A R2)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r2-bounded-manager-assignment` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Enforcement of strict time bounds on manager assignments to prevent infinite ownership and maintain the at-most-one-active invariant. Security risk of arbitrary duration coercion. |
| Work type | `FEATURE_EXPANSION` |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `1e1895d16500b273575599cf88853e0d48f08e23` |
| Authority | `docs/V6/aff_plan.md` v2.5, `docs/discovery/realignment/AFF05A_RESIDUAL_RECONCILIATION.md`, W5 & AFF-05A-R1 ACCEPTED |
| In-scope roots | Theo Exact File Allowlist |
| Forbidden paths | Bất kỳ file nào ngoài Exact File Allowlist; cấm: CRM, ER-003, PLANNER_HANDOVER.md, dispute/case, Ticket, commission |
| Required gates | `T0_CONTRACT_APPROVAL`, `TIER3_LIGHT_AUDIT`, `VERIFY_TASK`, `VERIFY_HANDOFF` |
| Next gate | `T0_CONTRACT_APPROVAL` |
| Current execution round | `1` |
| Current audit round | `1` |
| Frozen implementation SHA | `PENDING` |

## 1. Outcome

Triển khai quyết định cấu hình min/max/default cho lượt manager assignment (Handling Assignment), đảm bảo không còn assignment vô thời hạn (null) và giữ nguyên derived projection của Company Pool. Giải quyết tận gốc lỗ hổng `AFF-OQ-12`. Đề xuất T0 production preflight migration aggregate đối với dữ liệu legacy.

## 2. Evidence

- **Nguồn hiện tại (Source Evidence)**:
  - `src/domains/talent/handling-assignment.service.ts`: Chứa `managerAssign` đang cho phép `days: number | null`.
  - `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts`: Tiếp nhận `days` truyền vào trực tiếp.
  - `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx`: Hiển thị "Company Pool" như là derived state `!activeAssignment || isExpired`.
- **Evidence bắt buộc sinh (Executor Evidence)**:
  - GitHub Integration Job chạy production preflight/migration ở nhánh kiểm thử.
  - Unit / Integration tests chứng minh strict bound (1, 7, 30 ngày) và error cases (null, <1, >30).

## 3. Decisions

- **AFF-OQ-12: APPROVED** - Khóa thời hạn giao (Manager Assignment):
  - Minimum: 1 ngày
  - Default: 7 ngày (khi thiếu `days`)
  - Maximum: 30 ngày
  - Vô thời hạn (null) hoặc ngoài biên: Rejected (Typed validation error).
- **Company Pool: APPROVED** - Giữ nguyên derived projection (không tạo pool table/state mới). 

## 4. Contract

- **Route/service semantics:**
  - Manager assignment thiếu `days` bị gán mặc định 7 ngày bởi server. 
  - Explicit `null` hoặc input ngoài biên `1..30` (số âm, float, >30) bị từ chối bằng typed validation error. Server validations không bị thay thế bằng UI constraints.
  - Hành động Release profile về Company Pool phải là action riêng (gọi hàm `releaseHandlingAssignment`); không được diễn giải `null` assignee hoặc `null` days thành manager assignment vô thời hạn hoặc ngầm release.
  - Client không tự điều khiển startsAt/expiresAt/source/history links.
- **Company Pool:**
  - Giữ derived projection: không có assignment nào còn hiệu lực theo server clock.
  - Trình lập lịch (scheduler) chậm không làm assignment đã quá thời hạn tiếp tục được xem là ACTIVE hợp lệ (dùng explicit date comparision như W5).
  - Việc tái giao (reassignment) từ pool phải giữ nguyên history link (`previousAssignmentId`) và bảo đảm duy nhất 1 assignment ACTIVE tại một thời điểm (at-most-one-active invariant).
- **Legacy manager assignments:**
  - Thêm DB backstop ngăn chặn `MANAGER_ASSIGNMENT` mới có `expires_at IS NULL`.
  - Yêu cầu T0 production read-only aggregate preflight trước merge đối với `source = MANAGER_ASSIGNMENT AND expires_at IS NULL`. 
  - Forward-only migration: `deadline legacy = starts_at + 7 days`; ACTIVE đã quá deadline chuyển thành EXPIRED; giữ nguyên terminal status (COMPLETED/REVOKED/TRANSFERRED). Mọi rows ngoài narrow predicate không đổi. Nếu có anomaly, migration fail closed.
  - **Không chạy production preflight/migration trong round contract.**
- **Scope & Forbidden:**
  - Không mở AFF-05A-R3 dispute/case, Không sửa Ticket.
  - Không mở AFF-05B/commission, Không chạm CRM, ER-003, PLANNER_HANDOVER.md.
  - Không code production trong round này (PROPOSED_ONLY). RLS/grants hiện hành không bị nới.

## 5. Execution Plan

| Step | Component | Description |
|---|---|---|
| `STEP-01` | API Route | Nâng cấp `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts` ép kiểu số nguyên, xác thực biên 1..30, reject null/fractional. |
| `STEP-02` | `handling-assignment.service.ts` | Áp dụng logic default 7 ngày nếu thiếu days. Từ chối days out of bounds ở tầng service. Không coerce. Xử lý release action rõ ràng. |
| `STEP-03` | `schema.prisma` & Migrations | Bổ sung check DB ngăn chặn explicit null `expires_at` cho `MANAGER_ASSIGNMENT`. Soạn script forward-only update cho rows cũ. |
| `STEP-04` | Tests & Preflight Cấu trúc | Viết integration test cho migration và unit test cho service. Không deploy migration lên production database thật. |

## 6. Acceptance

### 6.1 Requirements List

| RQ | Description |
|---|---|
| `RQ-01` | Strict time bounds (1 min, 30 max, 7 default). Vô thời hạn (null) / float bị reject. |
| `RQ-02` | Company Pool derived state invariant. Scheduler chậm không làm over-active. Release là action độc lập. |
| `RQ-03` | Legacy migration update expires_at = starts_at + 7. Anomaly fail closed. |
| `RQ-04` | DB backstop checks to prevent expires_at IS NULL for MANAGER_ASSIGNMENT. |

### 6.2 Acceptance Criteria & Verification

| AC | Requirement | Pass condition | Verification method |
|---|---|---|---|
| `AC-01` | `RQ-01` | Truyền `null`, <1, >30, float bị reject 400. Thiếu `days` lấy mặc định 7 ngày. | `npm run test:unit` cho `route.ts` và `handling-assignment.service.ts`. |
| `AC-02` | `RQ-02` | UI và API List trả về trạng thái Company Pool đúng nếu `expiresAt` < current time dù không có cron quét liên tục. Reassignment giữ history link. | `npm run test:unit` cho logic active assignment comparison. |
| `AC-03` | `RQ-03` | DB test chứng minh các assignment cũ được cập nhật thành starts_at + 7 days. Quá hạn => EXPIRED. | `npm run test:integration` với row giả lập. |
| `AC-04` | `RQ-04` | Prisma/SQL schema reject insert `MANAGER_ASSIGNMENT` + `expires_at=null`. | `npm run test:integration` thử insert row vi phạm và nhận DB Error. |
| `AC-05` | `RQ-01`, `RQ-02`, `RQ-03`, `RQ-04` | Toàn bộ canonical tests pass. Diff chỉ ở đúng Exact File Allowlist. | `npm run test:unit`, `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md`, `git diff --check HEAD`, `git status --porcelain`. |

### 6.3 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-05` |
| `RQ-02` | `STEP-02` | `AC-02`, `AC-05` |
| `RQ-03` | `STEP-03`, `STEP-04` | `AC-03`, `AC-05` |
| `RQ-04` | `STEP-03`, `STEP-04` | `AC-04`, `AC-05` |

### 6.4 Exact Implementation File Allowlist

1. `src/domains/talent/handling-assignment.service.ts`
2. `src/domains/talent/handling-assignment.service.test.ts`
3. `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts`
4. Khả năng có test file của route `app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts` (nếu có)
5. `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx` (Nếu cần cập nhật UI error handling form)
6. `prisma/schema.prisma`
7. Thư mục `prisma/migrations/*` (thêm đúng 1 thư mục migration cho backstop/forward-only update)
8. File integration test db tương ứng trong `tests/db/` (nếu thêm mới để test migration).
9. Các task-local markdown files (`TASK.md`, `HANDOFF.md`, v.v.).

Mọi source khác ngoài bảng trên đều forbidden (trừ khi T0 duyệt delta). Cấm CRM, ER-003, PLANNER_HANDOVER.md, dispute/case, Ticket, commission.

## 7. Risk

- Sai lệch múi giờ khi tính expiresAt gây lỗi off-by-one. (Mitigation: server UTC).
- Có sự thay đổi/race condition khi T0 chạy aggregate preflight.
- Migration lock time lâu (Mitigation: predicate hẹp trên `source = MANAGER_ASSIGNMENT AND expires_at IS NULL`).

## 8. Open Questions

- None

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `PROPOSED_ONLY` | Contract drafting initial version cho T0 duyệt. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-24` | Draft | Initial Contract cho AFF-05A R2 |
