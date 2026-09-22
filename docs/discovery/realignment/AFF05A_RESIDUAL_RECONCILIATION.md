# AFF-05A Residual Reconciliation (W5 to AFF-05A)

## 1. Mục tiêu và Context
Văn bản này đánh giá những gì đã được hiện thực hóa qua quá trình triển khai `W5` so với thiết kế gốc của `AFF-05A` trong `aff_plan.md`. Từ đó, xác định những capability còn thiếu và đề xuất một thin slice tiếp theo.

**Nguồn đối chiếu:**
- `docs/V6/aff_plan.md` (AFF-05A)
- Các task artifacts: `hrp-v6-n2-aff-05a-handling-assignment`, `hrp-v6-w5-handling-assignment-safety`, `hrp-v6-w5-handling-assignment-ui`.
- Source code tại nhánh `origin/main` (SHA: `0fdc616b61de731ded8b9fa7337002dc0bb00721`).

## 2. Bảng Coverage AFF-05A

| Requirement | Hiện trạng | Path/Symbol/Line tham chiếu | Evidence Level | Gap | Owner/Dependency |
|---|---|---|---|---|---|
| Auto-assignment 7 ngày và bảo toàn attribution khi intake lặp | Đã có | `src/domains/talent/handling-assignment.service.ts:35` (`createInitialAffiliateAssignment`) | W5 Integration Tests | None | N/A |
| Expiry theo server clock; hành vi Company Pool | Đã có | `handling-assignment.service.ts:168` (`getActiveHandlingAssignment`) & `labor-profile.read-service.ts` | W5 UI & Safety, Unit/Integration | None | N/A |
| Manager assign/reassign/release, giới hạn thời hạn, history | Đã có | `handling-assignment.service.ts` (`managerAssign`, `releaseHandlingAssignment`, `getHistory`) | W5 UI & Safety Tests | None | N/A |
| Concurrent manager assignment | Đã có | `handling-assignment.service.ts:63` (`try/catch P2002`) | Unit Tests & Prisma schema | None | N/A |
| Route authorization và client không tự gán assignee | Đã có | Force RLS (W5 Safety migration); Route policy. `handling-assignment.service.ts:116` | Integration DB, Manual UI | None | N/A |
| Company Pool UI và hành động phân phối | Đã có | `app/admin/labor-profiles/**` | Manual UI, Admin portal | None | N/A |
| Dispute Ticket/Case, quyền resolver, resolution/history | **Thiếu** | `prisma/schema.prisma` (Ticket chỉ có TIMESHEET_DISPUTE, chưa có Assignment) | None | Hoàn toàn chưa có model / logic giải quyết tranh chấp Referral / Handling Assignment | Độc lập, Owner duyệt business rule |
| Phần giao nhau với beneficiary snapshot trong AFF-04 | Đang thiết kế | `docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/TASK.md` | Contract V1.4 | Chờ AFF-04 code | AFF-04 |

## 3. Đề xuất Thin Slice Tiếp Theo: Handling Assignment Dispute Case (AFF-05A-DISPUTE)

Từ bảng đối chiếu, GAP lớn nhất và độc lập nhất là cơ chế khiếu nại/tranh chấp quyền phụ trách (Dispute Ticket/Case cho Handling Assignment). 

### Outcome dự kiến
- **User-visible:** HR Staff có thể mở Ticket (hoặc Case) để khiếu nại quyền quản lý một ứng viên khi họ tin rằng nguồn/handling thuộc về họ, đặc biệt quanh ranh giới 7 ngày.
- HR Manager / Resolver có thể duyệt/từ chối khiếu nại này, dẫn đến một `managerAssign` override (immutable resolution).

### Exact file scope dự kiến
- `prisma/schema.prisma` (Thêm `ASSIGNMENT_DISPUTE` vào enum `TicketType` hoặc tạo `DisputeCase` model độc lập tùy thuộc hạ tầng Ticket hiện hành).
- `src/domains/talent/assignment-dispute.service.ts` (Tạo/duyệt dispute).
- Tests: Unit tests & DB integration cho resolution RBAC.
- (Không code UI trong slice này, chỉ focus Service/Domain).

### Điều gì tái sử dụng
- Infrastructure Ticket/Case đã có trong `prisma/schema.prisma` (Model `Ticket`, `TicketHistory`).
- Re-use `managerAssign` service (đã có ở `handling-assignment.service.ts`) để thực thi kết quả của Dispute.

### AC và Phương pháp kiểm chứng khả thi
- **AC-01:** Mở dispute thành công, ngăn chặn mở dispute lặp khi đang có tranh chấp (Unit Test).
- **AC-02:** Resolver (HR_MANAGER) duyệt dispute → gọi `managerAssign` với source `CASE_RESOLUTION` và thay đổi người phụ trách (Integration Test).
- **AC-03:** Immutable history: resolution không thể bị revert, chỉ có thể tạo case mới (Unit Test).

### Dependencies thật
- Hoàn toàn độc lập với AFF-05B, CRM, và ER-003.
- (Lựa chọn kỹ thuật T1): Đề xuất tái sử dụng enum `TicketType` hiện hữu, mở rộng `TicketType.ASSIGNMENT_DISPUTE` và dùng `aggregateId` liên kết với `laborProfileId` để giữ cho DB schema gọn gàng, thay vì lập bảng `HandlingAssignmentCase` mới.

### Câu hỏi nghiệp vụ thực sự cần Owner quyết
1. **Dispute window:** Tranh chấp có được phép mở sau khi handling đã `EXPIRED` hay chỉ khi đang `ACTIVE`?
2. **Resolution rules:** Tranh chấp giải quyết bằng tay hoàn toàn (Admin chốt hạ) hay có các rule auto-resolve? 

## 4. Bàn giao
Văn bản này hiện ở trạng thái **PROPOSED_ONLY**. Không có sửa đổi về runtime, migration, schema, và worktree T1B/AFF-04 hoàn toàn không bị chạm tới. Sẽ chỉ thực thi tiếp AFF-05A-DISPUTE hoặc các slice khác khi T0 mở gate sau ER-002 và AFF-04 implementation.
