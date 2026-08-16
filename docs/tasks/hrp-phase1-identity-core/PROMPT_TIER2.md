# PROMPT_TIER2 — hrp-phase1-identity-core

Sếp copy nguyên khối dưới đây sang Cursor/Tier 2:

```text
/code hrp-phase1-identity-core

Bạn là Tier 2 — Implementation Engineer trong pipeline 3 tầng HRP. Nhiệm vụ: thực thi đúng TASK `docs/tasks/hrp-phase1-identity-core/TASK.md` spec v1.0, status READY_FOR_EXECUTION, baseline `4a3a0fe`.

BẮT BUỘC đọc trước khi code:
1. `.ai-pipeline/tier2.md`
2. `.ai-pipeline/rules/00-global-rules.md` và `01-planner-rules.md` (nếu có)
3. `docs/tasks/hrp-phase1-identity-core/TASK.md`
4. `docs/tasks/hrp-phase1-bcc-fence/TASK.md`, `HANDOFF.md`, `AUDIT.md` để hiểu bộ auth đã ACCEPTED
5. `docs/PHASE_KHOAHOC_V1.md` §4 Phase 1
6. `docs/data-scope-security.md` §4-§5.1
7. `docs/CONTRACT_BCC.md` §10

CẢNH BÁO QUAN TRỌNG — VI PHẠM LÀ AUDIT BLOCK:
- KHÔNG tạo lại bộ login/JWT/register/cookie mới.
- KHÔNG tạo endpoint auth mới ngoài những endpoint đã có từ bcc-fence.
- PHẢI tái sử dụng bộ đã ACCEPTED: `src/shared/auth/jwt.ts`, `password.ts`, `user.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/me/route.ts`, `middleware.ts`, cookie `hrp_token`.
- Chỉ được thêm identity-core: permission catalog, resolver, auth-context, require-permission, with-auth-scope deny-by-default, seed permissions, thay stub tickets, UNIQUE portal_timesheets.

Phạm vi cần làm theo TASK:
1. `permission-catalog.ts` ≥10 codes đúng DEC-02.
2. `permission-resolver.ts` đúng G22: ADMIN => ALL, RolePermission ∪ GRANT − REVOKE, REVOKE thắng, expiresAt hết hạn bị bỏ qua, chặn grant/revoke nhắm ADMIN.
3. Test 65 case = 13 role × 5 bảng (Worker, Project, Ticket, VendorStatement, ClientStatement) + precedence cases.
4. `auth-context.ts`: decode JWT bằng helper bcc-fence, trả AuthContext `{ userId, role, vendorId?, workerId? }`; token thiếu/sai/hết hạn/isActive=false => 401.
5. `require-permission.ts`: thiếu quyền => 403 JSON có reason.
6. `with-auth-scope.ts`: deny-by-default, KHÔNG viết scope builders; builders thuộc Phase 2.
7. Thay stub `getSessionUser` trong 6 route `app/api/tickets/*` bằng auth-context + require-permission theo TASK DEC-08. Giữ logic service/response cũ.
8. Mở rộng `prisma/seed.mjs` seed permissions/role_permissions idempotent; không reset user password, không xóa grant manual.
9. Migration UNIQUE `portal_timesheets(employee_code, project, period_month, period_year)` theo CONTRACT_BCC §10. Trước migration phải duplicate-check; nếu có duplicate => DỪNG, ghi BLOCKED vào HANDOFF, KHÔNG tự xóa dữ liệu.

Vùng CẤM sửa:
- `app/bcc/*`
- `appBCC/*`
- `app/job-board/*`
- `app/login/*`
- `middleware.ts`
- `app/api/auth/*`
- `app/api/me/*`
- `src/shared/auth/{jwt,password,user}.ts` — chỉ đọc/gọi, không rewrite
- `prisma/schema.prisma` — không đổi model

Quy tắc bảo mật/git:
- KHÔNG commit `.env`, token, password, JWT_SECRET, DATABASE_URL.
- KHÔNG in secret/URL/password trong HANDOFF; mask phone/token.
- CẤM `git add -A` / `git add .`; chỉ add đúng file đã đổi.
- appBCC và app/bcc là khu vực sếp phát triển song song: không stage, không stash, không touch.
- Production DATABASE_URL có dữ liệu thật: không chạy destructive (`reset`, `drop`, `truncate`, xóa row). Duplicate portal_timesheets thì dừng, không tự sửa dữ liệu.

Verification bắt buộc trước HANDOFF:
- `npm run build` exit 0.
- `npm run test` pass toàn bộ, không `.only`/skip sót.
- 65/65 matrix pass.
- curl `/api/me`: 401 không token, 200 với token — giữ nguyên hành vi bcc-fence.
- curl tickets matrix: không JWT => 401; GET role yếu => 200; approve thiếu quyền => 403 có reason; DIRECTOR hoặc role ngoài 6 TicketActorRole => 403.
- Seed permissions chạy 2 lần không trùng, grant manual còn nguyên, password user không đổi.
- UNIQUE portal_timesheets apply đúng hoặc nếu duplicate thì BLOCKED đúng quy trình.
- `git diff -- app/bcc appBCC app/job-board app/login middleware.ts app/api/auth app/api/me` phải rỗng.
- grep không còn import `getSessionUser` trong `app/`.

Kết quả cuối cùng:
- Cập nhật `docs/tasks/hrp-phase1-identity-core/HANDOFF.md` với evidence thật (command + exit code + output đã mask).
- HANDOFF kết thúc đúng 1 dòng:
  `Handoff status: READY_FOR_AUDIT`
  hoặc nếu bị duplicate/blocker:
  `Handoff status: BLOCKED — <lý do cụ thể>`
```
