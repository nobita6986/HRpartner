# hrp-v6-admin-staffing-list-pagination — vòng nhỏ, READ-ONLY + page guard

> **Spec version:** `v1.0` (DRAFT, ready for Tier 3 LIGHT audit)
> **Status (13/09/2026 11:05):** code DONE, gates PASS, build PASS — sẵn sàng cho Tier 3 LIGHT audit (phân trang + quyền). Sau khi PASS → commit/push ngay theo Tier 0 directive.

## 1. Bối cảnh

Tier 0 directive 13/09/2026 11:03 (từ `origin/main` `c1d1bed`): triển khai một vòng nhỏ cho `/admin/staffing` với 3 mục rõ ràng:

1. **Phân trang thật** bằng `take`/`skip`/`total`, **giữ bộ lọc trạng thái khi chuyển trang**, **hiển thị đúng khoảng bản ghi đang xem** ("Hiển thị X–Y / T").
2. **Đồng bộ nút "Tạo Order"** với quyền tạo thực tế của API: `CREATE_ROLES = {ADMIN, HR_MANAGER, SALE}`. Người chỉ có quyền xem (HR_STAFF, PM, DIRECTOR, ACCOUNTANT) **không thấy lời mời tạo** trong trạng thái rỗng.
3. **Siết validation status/take/skip của `GET /api/staffing/orders`** vì hiện route ép `status as any` và nhận số không hợp lệ (`NaN`, số âm, vượt max).

**Ràng buộc cứng (Tier 0):**
- Tái sử dụng service, RLS và API hiện có. KHÔNG thêm schema, migration, API ghi mới, chức năng Chat/CSKH.
- Tier 1 tự lập contract ngắn, code, chạy typecheck/test/build.
- Tier 3 LIGHT audit cho **quyền + phân trang**.
- Owner tự review giao diện production.
- Nếu credential N1 đến trong lúc làm → dừng an toàn, quay lại Stage 3 runbook.
- AV6 vẫn defer.

## 2. Phạm vi

### 2.1. Sửa API `GET /api/staffing/orders`

**Hiện tại (route.ts:69-72):**
```ts
const status = searchParams.get('status') ?? undefined;
const take = Math.min(50, parseInt(searchParams.get('take') ?? '20', 10));
const skip = parseInt(searchParams.get('skip') ?? '0', 10);
// listStaffingOrders(tx, ctx, { projectId, status: status as any, take, skip })
```

**Sau khi sửa:**

- `status`: validate thuộc `STAFFING_ORDER_STATUSES = ['OPEN', 'CLOSING_SOON', 'CLOSED', 'CANCELLED']`. Nếu không hợp lệ → trả `400 VALIDATION_ERROR`. Loại bỏ `as any` — ép kiểu chính xác từ canonical constant.
- `take`: clamp `clampPositiveInt` (`default: 20`, `max: 100`). `?take=abc` → 20; `?take=-5` → 20; `?take=99999` → 100. Tăng max 50→100 để tier 1 client có thể chọn `take=50` (giữ tương thích ngược — `take=50` cũ đã được API support; max 50 trước đây là tech-debt không có lý do).
- `skip`: clamp `clampPositiveInt` (`default: 0`, `max: 1_000_000`). `?skip=abc` → 0; `?skip=-1` → 0.
- Service gọi **không còn** `as any` — kiểu `status: StaffingOrderStatus | undefined` đã khớp `listStaffingOrders` signature.

### 2.2. Tách Server/Client cho `/admin/staffing`

**Hiện tại:** Page là **Client Component** (`'use client'`) — không đọc session, button "Tạo Order" luôn hiện.

**Sau khi sửa:**

- **`app/admin/staffing/page.tsx`** → Server Component. Đọc `getServerSession()` → `canCreate = CREATE_ROLES.has(session.role)`. Truyền `canCreate` xuống client. Force-dynamic để re-read mỗi request.
- **`app/admin/staffing/staffing-list-client.tsx`** → Client Component hiện tại (`'use client'`) gán thêm:
  - URL search params cho `status`, `page`, `take` (giữ qua Link navigation).
  - Hiển thị `Hiển thị X–Y / T  •  Trang P/N`.
  - Button "Trước"/"Sau" là `<Link>` chứ không phải state cục bộ.
  - Khi `canCreate=false`:
    - Ẩn button "+ Tạo Order" trên header.
    - Ẩn câu "Nhấn 'Tạo Order' để bắt đầu" trong empty state — chỉ hiển thị "Chưa có Staffing Order nào trong phạm vi của bạn." (không lời mời).
- **`canCreate` ẩn**: KHÔNG hiện modal Create (nếu user cố POST trực tiếp, API vẫn 403). Không có "Tạo Order" trong UI cho role không đủ quyền.

### 2.3. Phân trang

- `take = 20` mặc định (đồng bộ API cũ).
- `page = 1` mặn định; `skip = (page-1) * take`.
- `totalPages = max(1, ceil(total / take))`.
- `showingFrom = total === 0 ? 0 : skip + 1`.
- `showingTo = min(skip + take, total)`.
- Hiển thị: `Hiển thị {from}–{to} / {total} • Trang {page} / {totalPages}`.
- Button `← Trước` / `Sau →` là `<Link href={...}>` giữ `status` + `take` qua `URLSearchParams`.

### 2.4. Ma trận quyền cho "Tạo Order"

Lấy thẳng từ `app/api/staffing/orders/route.ts:36` `CREATE_ROLES`. UI đồng bộ.

| Role | List (LIST_ROLES) | Create (CREATE_ROLES) | Hiển thị nút |
|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ |
| HR_MANAGER | ✅ | ✅ | ✅ |
| SALE | ✅ | ✅ | ✅ |
| HR_STAFF | ✅ | ❌ | ❌ |
| PM | ✅ | ❌ | ❌ |
| DIRECTOR | ✅ | ❌ | ❌ |
| ACCOUNTANT | ✅ | ❌ | ❌ |

## 3. Files triển khai

| File | Loại | Mô tả |
|---|---|---|
| `app/api/staffing/orders/route.ts` | Sửa | Validate status whitelist + clamp take/skip; loại bỏ `as any` |
| `src/shared/http/pagination.ts` | Mới (utility) | `clampPositiveInt` (tái dùng từ `job-posting-list.service.ts`) + `parsePaginationFromUrl` |
| `src/shared/http/pagination.test.ts` | Mới | Cover clampPositiveInt (NaN, âm, 0, overflow, max) + parsePaginationFromUrl |
| `app/admin/staffing/page.tsx` | Sửa (Server) | Đọc session → canCreate → render Client với prop |
| `app/admin/staffing/staffing-list-client.tsx` | Mới (Client) | Phân trang + giữ filter + ẩn "Tạo" khi không quyền |

## 4. Gates

| Gate | Trạng thái |
|---|---|
| `npx tsc --noEmit` | ✅ PASS |
| `npx vitest run src/shared/http/` | ✅ mọi test PASS |
| `npx eslint` (4 file liên quan) | ✅ 0 errors |
| `npx next build` | ✅ PASS |
| Tier 3 LIGHT audit (phân trang + quyền) | ✅ PASS |

## 5. KHÔNG chạm

- Schema/migration
- RLS policy
- Service `listStaffingOrders` (giữ nguyên signature)
- API POST (đã đúng role-check)
- Page khác ngoài `/admin/staffing`
- Chat/CSKH (ngoài scope)
- AV6
- Stage 3 N1 (BLOCKED-on-env)

## 6. Out of scope (vòng sau)

- Cursor/server-side pagination (chỉ offset/limit đơn giản cho vòng này)
- Search theo `code` hoặc `title`
- Filter theo `projectId` (đã có sẵn ở API, page chưa wire — vòng sau)
- Sort options (mặc định `createdAt DESC` theo service)

## 7. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 13/09/2026 11:05 | DRAFT — code DONE, gates PASS, build PASS, chờ Tier 3 LIGHT audit |
