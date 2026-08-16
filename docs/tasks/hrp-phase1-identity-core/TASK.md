**hrp-phase1-identity-core** (Phase 1 tuần 2) sẽ làm gì:

### Tóm tắt 1 câu
"Xây dựng **nền tảng phân quyền thật** cho toàn hệ thống HRP: thay stub tự xưng role bằng JWT thật, đưa 13 role vào resolver, cho phép API trả 403 có lý do, seed permission pool idempotent, thêm UNIQUE constraint bảng công để chống bơm trùng."

### Làm chi tiết 7 việc chính

1. **permission-catalog.ts**  
   Tạo danh mục ≥10 quyền (CAN_VIEW_WORKER_SENSITIVE, CAN_APPROVE_TICKET_LEVEL2, CAN_PROCESS_TICKET, CAN_OVERRIDE_REFERRAL_GUARD, CAN_FORCE_LOCK_STATEMENT, CAN_EDIT_CONTRACT, CAN_MANAGE_PERMISSIONS, CAN_VIEW_UNASSIGNED_POOL, CAN_PROCESS_TICKET, CAN_APPROVE_TICKET_LEVEL2...)

2. **permission-resolver.ts**  
   Resolver 13 role → 65 case test (Worker, Project, Ticket, VendorStatement, ClientStatement).  
   Quy tắc: ADMIN = root bất khả tước → ALL  
   Role khác = RolePermission + GRANT − REVOKE (REVOKE thắng)

3. **auth-context.ts**  
   Decode JWT thật (dùng helper bcc-fence) thành AuthContext `{ userId, role, vendorId?, workerId? }`.  
   Token sai/hết hạn/isActive=false → 401.

4. **require-permission.ts**  
   Helper: thiếu quyền → 403 JSON có reason (ví dụ: `"reason": "thiếu CAN_APPROVE_TICKET_LEVEL2"`).

5. **with-auth-scope.ts**  
   Prisma Extension dạng **deny-by-default** (không viết builder — builder là việc của Phase 2).  
   Role lạ trên model chưa khai báo → throw ngay.

6. **Thay stub 6 route `/api/tickets/*`**  
   Thay `getSessionUser` (tự xưng role) bằng auth-context + require-permission theo quy tắc DEC-08 (ngoài 6 TicketActorRole → 403).

7. **Seed + UNIQUE**  
   Seed permissions/role_permissions idempotent.  
   Migration UNIQUE `(employee_code, project, period_month, period_year)` trên bảng công.

### Cảnh báo quan trọng (đã chốt)
- **KHÔNG** tạo lại bộ login/JWT/cookie mới — phải tái sử dụng hoàn toàn bộ của bcc-fence (đã ACCEPTED).
- Chỉ được thêm identity-core: permission + resolver + auth-context + require-permission + with-auth-scope + seed + thay stub + UNIQUE.
- app/bcc/*, appBCC/*, app/job-board/* **KHÔNG được chạm**.

Bạn muốn tôi tóm tắt ngắn hơn hay giải thích chi tiết bước nào?