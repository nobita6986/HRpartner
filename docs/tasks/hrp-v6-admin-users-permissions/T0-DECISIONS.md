# T0 Decisions — `hrp-v6-admin-users-permissions`

> File này là phụ lục của `TASK.md` §11. Tier 1 đã dừng ở thiết kế/contract và cần T0 chốt 4 câu hỏi nghiệp vụ trước khi code. Vui lòng trả lời theo dạng chọn 1 option mỗi mục (hoặc "Other" kèm lý do).
>
> T0 xem xét: triển khai theo khuyến nghị Tier 1 (RECOMMENDED), hoặc lệch hướng (chỉ rõ lý do + rủi ro chấp nhận).

## Trạng thái

| ID | Câu hỏi | Recommendation | Owner |
|---|---|---|---|
| `DEC-01` | Multi-role? | **A1: GIỮ single-role** | T0 |
| `DEC-02` | Onboarding password flow? | **B1: Admin tạo, hệ thống sinh random pass hiển thị 1 lần** | T0 |
| `DEC-03` | UI quản lý `UserPermissionGrant`? | **C1: KHÔNG expose grant UI trong task này** | T0 |
| `DEC-04` | Last-admin guard semantics? | **D1: full guard (self + last)** | T0 |

---

## §A — Multi-role (DEC-01)

### Bối cảnh

Hiện tại `prisma/schema.prisma:143`:
```prisma
role SystemRole // single role per user
```

Nếu multi-role, cần:
1. Thêm relation `model UserRole { userId, role } @@id([userId, role])` (mới).
2. Migration + backfill: `User.role` → `UserRole[]` (mỗi user hiện tại có 1 row trùng role cũ).
3. RLS GUC `app.role` phải đổi từ enum sang `text[]` (hoặc giữ enum primary + `grantedRoles[]`).
4. `resolveEffectivePermissions` (đã có admin short-circuit) phải resolve per-role.
5. `AuthContext.role` (auth-context.ts) phải đổi sang `roles: SystemRole[]` — ảnh hưởng 29+ callers theo codegraph blast-radius.
6. JWT `signJwt(user.id, user.role)` (jwt.ts) phải đổi sang `roles[]` — vùng cấm Iron Rule.
7. Cookie/session format đổi → backward compat cũ vỡ.

### Lựa chọn

#### **A1 (RECOMMENDED): GIỮ single-role**

- **Pro:** Không migration, không phá backward compat, blast radius hẹp, code path chính là `User.role` đã có.
- **Pro:** `RolePermission` (đã có) cho phép map role → permission set rất gọn; nếu cần thêm quyền cho 1 user → dùng `UserPermissionGrant.GRANT` (đã có).
- **Con:** Nếu sau này thực sự cần 1 user kiêm nhiều role → phải tạo 2 user riêng (operational overhead) hoặc mở task migration sau.
- **Con:** Không match nếu T0 đã chốt multi-role trong roadmap.

#### A2: Multi-role ngay

- **Pro:** Đáp ứng nhu cầu nghiệp vụ nếu đã chốt trong roadmap.
- **Con:** Cần migration + rewrite lớn (auth, RLS, JWT). Task này vượt scope; phải tách task migration riêng (≥ 1 tuần).
- **Con:** Phá vỡ Iron Rule (jwt.ts là vùng cấm).

#### A3: Multi-role giả lập bằng cách tạo "composite role" mới trong enum

- **Pro:** Không migration.
- **Con:** Enum phình, khó audit, không match use case linh hoạt.
- **Con:** Phải thêm permission mapping mới cho composite.

### Tier 1 khuyến nghị

**A1.** Task này implement trên `User.role` đơn lẻ; để dành multi-role cho task riêng nếu T0 thực sự cần.

---

## §B — Onboarding password flow (DEC-02)

### Ràng buộc cứng từ T0 (2026-10-07)

> "Không tự tạo luồng mật khẩu tạm hoặc lưu mật khẩu không an toàn."

Điều này loại bất kỳ option nào plaintext-hash không an toàn hoặc lưu DB reversible.

### Hiện trạng

- `User.passwordHash` (bcrypt, 10 rounds) — đã có.
- `hashPassword(plain)` → bcrypt hash → ghi `passwordHash` — sẵn sàng dùng.
- `verifyPassword` + login flow dùng `passwordHash` — Iron Rule không sửa.
- `passwordHash=null` → login fail-closed (đã thấy ở `app/api/auth/login/route.ts:63`).

### Lựa chọn

#### **B1 (RECOMMENDED): Admin tạo user, hệ thống sinh random password 16 char, hiển thị 1 lần**

- **Flow:**
  1. Admin điền form tạo user (name, phone, role).
  2. Backend `POST /api/admin/users`:
     - Generate `randomPassword = crypto.randomBytes(12).toString('base64url')` (16 chars).
     - `passwordHash = await hashPassword(randomPassword)`.
     - Lưu User với `passwordHash`.
     - Trả response: `{ user, temporaryPassword: randomPassword, expiresIn: 'first_login' }` — chỉ trong response này, không lưu plaintext.
  3. UI hiển thị password 1 lần + nút "Sao chép" + cảnh báo "Không hiển thị lại".
  4. Admin copy → gửi user qua kênh riêng (Zalo/SMS).
  5. User đăng nhập lần đầu với password → có thể đổi pass ở form `/profile` (nếu có) hoặc bị force-rotate (cần thêm).
- **Pro:** Đơn giản, không cần thêm table, không cần vendor OTP.
- **Pro:** Không lưu plaintext, không log password.
- **Con:** Admin có plaintext trong tab/network — phụ thuộc admin discipline. Mitigate: hiển thị 1 lần, không lưu vào history.
- **Con:** "Force change on first login" cần mở rộng login flow (Iron Rule). Tier 1 đề xuất: KHÔNG enforce force-rotate trong task này; admin có thể cấp pass mới bất kỳ lúc nào qua luồng "reset password" (cũng dùng random pass, B1) — bỏ qua force-rotate.
- **Rủi ro chấp nhận:** Admin lộ pass qua screenshot/email = trách nhiệm admin. Log lại `temporaryPasswordIssued` trong AuditLog (không log password).

#### B2: Invite link (signed token, expires 24h)

- **Flow:** Admin tạo user → backend generate JWT invite token (`sub=userId, exp=24h, scope='set_password'`) → gửi link `/set-password?token=...` qua email/Zalo. User click → đặt password.
- **Pro:** Không admin thấy plaintext.
- **Pro:** Có thể expire.
- **Con:** Cần thêm table `UserInviteToken` (audit + revoke) HOẶC dùng JWT stateless (revoke khó).
- **Con:** Cần thêm route `/set-password` (UI + API) — vượt scope nếu chỉ làm B1.
- **Con:** Phụ thuộc email/Zalo delivery (vendor hoặc in-house — cần DEC-05 automation).

#### B3: Phone OTP

- **Flow:** Admin tạo user → hệ thống gửi OTP qua SMS/Zalo → user nhập OTP → đặt pass.
- **Pro:** Standard practice.
- **Con:** Cần vendor OTP (Twilio/Zalo/ZNS) — vendor lock-in + cost.
- **Con:** Vendor cụ thể chưa được Tier 0/Owner chốt.
- **Con:** Phá scope task này.

#### B4: Không cho phép tạo user từ admin UI

- **Pro:** Tránh rủi ro password.
- **Con:** Không đáp ứng yêu cầu T0 ("admin có thể tạo tài khoản").

### Tier 1 khuyến nghị

**B1.** Đơn giản, không cần thêm dep/table, đáp ứng "admin tạo tài khoản" mà không vi phạm "không lưu plaintext". Force-rotate first-login không enforce trong task này (admin cấp pass mới bất kỳ lúc nào qua cùng flow B1).

**Nếu T0 chọn B2/B3:** cần tách task riêng; task này vẫn có thể ship B1 cho MVP và nâng cấp sau.

---

## §C — UI quản lý `UserPermissionGrant` (DEC-03)

### Hiện trạng

- `permission-resolver.ts::writeGrant`/`writeRevoke` đã có, đã chặn G22 target ADMIN.
- **Không có UI nào** gọi 2 hàm này — chỉ có service/test, chưa có endpoint public.
- `RolePermission` (đã seed) đã map role → permission set; đa số use case đủ.

### Lựa chọn

#### **C1 (RECOMMENDED): KHÔNG expose grant UI trong task này**

- **Pro:** Blast radius hẹp — task chỉ cần CRUD user + role change.
- **Pro:** Không confuse role vs grant (2 concept khác nhau).
- **Pro:** `RolePermission` đã đủ cho đa số use case; nếu cần per-user exception → admin dùng SQL/admin tool nội bộ.
- **Pro:** Có thể làm task `/admin/permissions` riêng sau (UI cho phép manage `RolePermission` + per-user grant).
- **Con:** Nếu cần per-user grant ngay → phải dùng CLI/admin tool (operational overhead).

#### C2: CÓ expose grant/revoke drawer per-user

- **Pro:** Admin có thể grant ngay trong user detail.
- **Con:** Blast radius UI lớn — phải liệt kê ~vài chụm permission code + cho phép toggle.
- **Con:** Dễ nhầm role vs grant → audit risk (admin grant nhầm → bypass role boundary).
- **Con:** Phải thêm `GET /api/permissions` (list catalog) — thêm route.

### Tier 1 khuyến nghị

**C1.** Task này tập trung CRUD + role change. Per-user grant để task `/admin/permissions` riêng.

**Lưu ý:** Service layer vẫn viết `grantPermission`/`revokePermission` (dùng `writeGrant`/`writeRevoke` từ resolver) — chỉ là KHÔNG mount UI/expose endpoint. Vẫn có thể test qua unit test. Nếu T0 chọn C2, Tier 1 chỉ cần thêm UI drawer + 1 endpoint POST `/api/admin/users/[id]/permissions` (đã có sẵn trong STEP-04).

---

## §D — Last-admin guard semantics (DEC-04)

### Bối cảnh

Schema `User.role` + `User.isActive`. Last-admin = `count(User where role=ADMIN AND isActive=true)`.

### Lựa chọn

#### **D1 (RECOMMENDED): Full guard (self + last)**

- **Các quy tắc:**
  - `count_active_admin` đếm trong transaction `Serializable` (hoặc `SELECT ... FOR UPDATE`).
  - `deactivateUser(target)`:
    - Nếu `target.userId === actor.userId` → `409 SELF_DEACTIVATION_BLOCKED`.
    - Nếu `target.role === 'ADMIN' && count_active_admin <= 1` → `409 LAST_ADMIN_PROTECTED`.
  - `updateUser(target, { role })`:
    - Nếu `target.userId === actor.userId` → `409 SELF_DEMOTION_BLOCKED`.
    - Nếu `target.role === 'ADMIN' && newRole !== 'ADMIN' && count_active_admin <= 1` → `409 LAST_ADMIN_PROTECTED`.
  - Vô hiệu hoá admin khác khi còn ≥ 2 admin → OK.
  - Đổi role admin khác (khi còn ≥ 2) → OK.
  - Tạo admin mới (khi còn ≥ 1) → OK (không cần guard tạo).
- **Pro:** Bảo vệ toàn diện — chống cả vô tình (admin click nhầm) và cố ý (compromised admin).
- **Pro:** Audit trail rõ (mỗi block đều có code lỗi khác nhau).
- **Con:** Cần transaction isolation cẩn thận (race giữa 2 admin concurrent).
- **Mitigation:** `Serializable` isolation + `count` + `update` trong cùng tx; hoặc `SELECT ... FOR UPDATE` trên tất cả admin rows.

#### D2: Không guard

- **Pro:** Đơn giản.
- **Con:** Rủi ro cực cao — 1 click nhầm = toàn bộ admin mất quyền = lock-out.

#### D3: Chỉ guard tự hạ, không guard admin khác

- **Pro:** Tránh admin tự sabotage.
- **Con:** 2 admin → 1 click đồng lõa → vẫn lock-out.

### Tier 1 khuyến nghị

**D1.** Error codes chuẩn:
- `409 LAST_ADMIN_PROTECTED` — thao tác sẽ làm 0 admin còn active.
- `409 SELF_DEACTIVATION_BLOCKED` — admin tự deactivate.
- `409 SELF_DEMOTION_BLOCKED` — admin tự đổi role của mình.
- `409 SELF_MODIFICATION_BLOCKED` (alias tổng quát) — dùng cho tất cả self-modification trong tương lai.

---

## Yêu cầu với T0

Vui lòng xác nhận từng mục bằng 1 trong các format:

```text
DEC-01: A1    # hoặc A2 / A3
DEC-02: B1    # hoặc B2 / B3 / B4
DEC-03: C1    # hoặc C2
DEC-04: D1    # hoặc D2 / D3
```

Nếu khác recommendation, vui lòng ghi rõ lý do và risk acceptance.

Sau khi T0 phản hồi, Tier 1 sẽ:
1. Cập nhật `TASK.md` §3 (DEC-01..04 → CHOSEN), §4 contract, §6 AC.
2. Đổi `Status: READY_FOR_EXECUTION`, `Contract gate: READY_TO_CODE`, `Decision state: CLOSED`.
3. Chạy `verify-task.ps1` → PASS.
4. Bắt đầu `STEP-02` → ... → `STEP-09`.
5. Push PR, CI 4/4 GREEN, dừng trước merge.
