# DATA-SCOPE SECURITY — Kiến trúc phân quyền dữ liệu HRP

> **Trạng thái:** Thiết kế kiến trúc (Principal Architect) — chưa cài đặt.
> **Canonical code:** `src/shared/auth/` (tương lai) · **Schema:** `prisma/schema.prisma` (delta bên dưới)
> **Ngày:** 15/08/2026 · Plan v4.13

---

## 1. Triết lý thiết kế: 2 lớp phòng thủ + Deny-by-Default

### 1.1. Hai trục quyền độc lập

Mọi thao tác phải qua **CẢ HAI** kiểm tra — thiếu một trục là lỗ hổng:

| Trục | Câu hỏi | Cơ chế |
|------|---------|--------|
| **Feature Permission** | Người này *được làm hành động X* không? (duyệt lương, sửa hợp đồng...) | **Permission Pool** (§4) |
| **Data Scope** | Người này *được thấy bản ghi nào*? (ma trận hiển thị §2) | **`withAuthScope`** (§5) + **Postgres RLS** (§6) |

### 1.2. Hai lớp phòng thủ cho trục Data Scope

- **L1 — Prisma Client Extension `withAuthScope`** (lớp chính): mọi `findMany/findUnique/update/delete/count/aggregate` tự động được tiêm `where` theo ma trận. Chặn lỗi quên-scope của developer — mặc định là AN TOÀN.
- **L2 — PostgreSQL Row-Level Security** (lớp backstop): policy SQL ngay trong DB. Bắt được mọi đường đi vòng L1 (`$queryRaw`, tool DB trực tiếp, migration script, nhân viên DB).

### 1.3. Deny-by-Default

- Mọi model **không có builder scope tường minh** → chỉ `ADMIN`/`HR_MANAGER` truy cập được; role khác **throw ngay lập tức** (không phải trả danh sách rỗng — vì danh sách rỗng che giấu bug cấu hình).
- Mọi hàm đọc scope **bắt buộc có `AuthContext`** — thiếu session → throw. Không có đường "unauthenticated read".

---

## 2. Ánh xạ Visibility Matrix → Schema hiện tại

Ma trận yêu cầu đã được kiểm chứng với `prisma/schema.prisma` hiện tại:

| Yêu cầu | Field hiện tại | Trạng thái |
|---------|---------------|------------|
| `Worker.owner_id` (Sale/HR tạo) | `Worker.ownerId` (`owner_id`) + `@@index([ownerId, assignedToId])` | ✅ đã có |
| `Worker.assigned_to_id` (HR xử lý) | `Worker.assignedToId` (`assigned_to_id`) | ✅ đã có |
| `Project.manager_id` | `Project.pmUserId` (`pm_user_id`) | ✅ đã có |
| PM thấy worker có ACTIVE assignment thuộc dự án mình quản lý | `ProjectAssignment.status='ACTIVE'` + `Project.pmUserId` + index `[workerId, status]` | ✅ đã có |
| VENDOR thấy worker theo SourceClaim `accepted=true` | `SourceClaim.accepted` + `vendorId` + partial unique `WHERE accepted` | ✅ đã có |
| CTV thấy worker theo SourceClaim `accepted=true` | `SourceClaim.ctvId` | ✅ đã có |
| Chỉ 1 claim `accepted=true` / worker | partial unique index (migration — đã ghi chú trong schema) | ✅ đã có |
| WORKER thấy chính mình | ❌ thiếu link tài khoản ↔ hồ sơ lao động | ⚠️ **cần thêm** `Worker.accountUserId` |
| FK ràng buộc owner/assignedTo/pmUser | ❌ chỉ lưu String, chưa có relation | ⚠️ **cần thêm** (toàn vẹn tham chiếu) |
| Role là enum thay vì String tự do | ❌ `User.role String` (11 giá trị comment) | ⚠️ **cần thêm** `enum SystemRole` |
| Permission Pool | ❌ chưa tồn tại | 🆕 **thiết kế mới** §4 |

**Lưu ý về số role:** ma trận liệt kê 8 role; schema hiện tại có 11 giá trị (thêm `ACCOUNTANT`, tách `VENDOR_ADMIN/VENDOR_STAFF`, `EMPLOYEE`). Thiết kế này giữ đủ 11 — 8 role của ma trận ánh xạ 1-1, `VENDOR` = `VENDOR_ADMIN` ∪ `VENDOR_STAFF` (cùng scope, cùng `User.vendorId`).

---

## 3. Prisma Schema — delta cần thêm

### 3.1. Enum role + link tài khoản Worker

```prisma
// ═══ DELTA 1: enum thay String ═══
enum SystemRole {
  ADMIN
  HR_MANAGER
  HR_STAFF
  SALE
  PM
  ACCOUNTANT
  VENDOR_ADMIN
  VENDOR_STAFF
  CTV
  WORKER
  EMPLOYEE
}

// User: đổi `role String` → `role SystemRole`
// Migration: cast chuỗi hợp lệ, giá trị lạ → default EMPLOYEE + log.

// ═══ DELTA 2: Worker — link tài khoản đăng nhập + FK chủ sở hữu ═══
// Trong model Worker THÊM:
model Worker {
  // ... giữ nguyên các field hiện tại ...

  // Link tài khoản đăng nhập (role WORKER) ↔ hồ sơ lao động
  // G9: 1 CCCD = 1 account; tier LOW_ASSURANCE. Scope WORKER dùng field này.
  accountUserId String? @unique @map("account_user_id")

  // FK thay vì String thô (giữ nguyên tên cột hiện tại owner_id/assigned_to_id)
  owner      User? @relation("WorkerOwner",     fields: [ownerId],      references: [id])
  assignedTo User? @relation("WorkerAssignee",  fields: [assignedToId], references: [id])
  account    User? @relation("WorkerAccount",   fields: [accountUserId], references: [id])
}

// Trong model User THÊM back-relations:
model User {
  // ...
  ownedWorkers    Worker[] @relation("WorkerOwner")
  assignedWorkers Worker[] @relation("WorkerAssignee")
  workerAccount   Worker?  @relation("WorkerAccount")
}

// ═══ DELTA 3: Project — FK cho PM ═══
// Trong model Project THÊM (giữ tên cột pm_user_id):
  pmUser User? @relation("ProjectPm", fields: [pmUserId], references: [id])
// User THÊM: managedProjects Project[] @relation("ProjectPm")
```

### 3.2. Index bổ sung cho relation filter (chống seq-scan khi scope)

```prisma
// SourceClaim — scope VENDOR/CTV dùng relation filter `sourceClaims: { some: {...} }`
@@index([vendorId, accepted])
@@index([ctvId, accepted])
//  (đã có: @@index([workerId, accepted]))

// Project — scope PM
@@index([pmUserId, status])

// ProjectAssignment — scope PM (`assignments: { some: { status, project: { pmUserId } } }`)
@@index([projectId, status])
//  (đã có: @@index([workerId, status]) + partial unique G14 WHERE status='ACTIVE')
```

---

## 4. Permission Pool — Role ↔ Feature Permission động

### 4.0. Nguyên tắc ROOT (quyết định founder — G22)

- **ROOT = role `ADMIN`** — nắm **toàn bộ quyền**, kể cả mọi permission tạo **sau này**: resolve luôn short-circuit `role = ADMIN → ALL` (quyền root là tiên đề, KHÔNG phụ thuộc hàng dữ liệu nào → không row REVOKE nào tước được).
- **Bất khả tước, 2 tầng:** (1) service chặn ghi `UserPermissionGrant(REVOKE)` nhắm vào user có role ADMIN; (2) kể cả nếu row lọt vào DB, short-circuit vẫn trả ALL.
- **Account nghiệp vụ dưới root** (Ban giám đốc `DIRECTOR`, `ACCOUNTANT`, `MKT`, `SALE`...) — toàn bộ quyền do root cấp qua `RolePermission`/`UserPermissionGrant`.
- **Ủy quyền phân quyền:** root cấp `CAN_MANAGE_PERMISSIONS` cho giám đốc → người đó cấp/thu quyền cho người khác, NHƯNG:
  1. chỉ cấp/thu được các permission **mình đang có** (chống leo thang đặc quyền);
  2. **không** cấp được `CAN_MANAGE_PERMISSIONS` cho người khác (chỉ root làm được);
  3. **không bao giờ** chạm được quyền của root.
- Mọi grant/revoke: `reason` bắt buộc + `grantedBy` + audit (thống kê hàng tuần chống thiên vị — cùng tinh thần SOP S1/S2/S3 §9.3.1 plan).

### 4.1. Schema

```prisma
// ═══ Pool: danh mục permission — KHÔNG hardcode trong code ═══
model Permission {
  code            String             @id // 'CAN_APPROVE_PAYROLL', 'CAN_EDIT_CONTRACT', ...
  group           String                  // 'PAYROLL' | 'CONTRACT' | 'TICKET' | 'REFERRAL' | 'STATEMENT' | 'WORKER'
  description     String?
  rolePermissions RolePermission[]
  userGrants      UserPermissionGrant[]

  @@map("permissions")
}

// ═══ Pool: role → permission (nhiều-nhiều) ═══
model RolePermission {
  role           SystemRole
  permissionCode String   @map("permission_code")
  grantedBy      String?
  createdAt      DateTime @default(now()) @map("created_at")

  permission Permission @relation(fields: [permissionCode], references: [code])

  @@id([role, permissionCode])
  @@map("role_permissions")
}

// ═══ Pool: override theo TỪNG NGƯỜI (cấp thêm / thu hồi) — có lý do bắt buộc ═══
model UserPermissionGrant {
  id             String    @id @default(uuid())
  userId         String    @map("user_id")
  permissionCode String    @map("permission_code")
  grantType      String    @map("grant_type") // GRANT | REVOKE
  // ⚠️ G22 (root bất khả tước): service CHẶN tạo row REVOKE/GRANT nhắm user role ADMIN
  // (short-circuit §4.2 vẫn là chốt chặn cuối — DB không phải nguồn sự thật của quyền root)
  reason         String                    // BẮT BUỘC — audit (vì sao cấp/thu)
  grantedBy      String    @map("granted_by")
  expiresAt      DateTime? @map("expires_at") // null = vô hạn; hết hạn tự bỏ qua khi resolve
  createdAt      DateTime  @default(now()) @map("created_at")

  permission Permission @relation(fields: [permissionCode], references: [code])
  user       User       @relation(fields: [userId], references: [id])

  @@unique([userId, permissionCode, grantType]) // mỗi cặp chỉ 1 row GRANT + 1 row REVOKE
  @@index([userId])
  @@map("user_permission_grants")
}
```

### 4.2. Thuật toán resolve

```
effectivePermissions(user) =
    role = ADMIN          → ALL (SHORT-CIRCUIT — root bất khả tước, kể cả permission tạo sau)
    role ≠ ADMIN          → RolePermission[user.role]      // nền từ role
                          ∪ UserPermissionGrant[user, GRANT]   // cấp thêm
                          − UserPermissionGrant[user, REVOKE]  // thu hồi (thắng GRANT)
                          (bỏ các grant hết expiresAt)
```

- **Cache:** Upstash Redis key `perm:{userId}` TTL 60s; mọi thay đổi RolePermission/UserPermissionGrant → `DEL perm:{userId}` trong cùng transaction.
- **Check:** `requirePermission(ctx, 'CAN_APPROVE_PAYROLL')` → thiếu thì throw `PermissionDeniedError` (403), có audit.
- **Quy tắc ghi grant/revoke (G22):** chỉ user có `CAN_MANAGE_PERMISSIONS` được ghi; người được ủy quyền chỉ ghi được permission mình đang có; `CAN_MANAGE_PERMISSIONS` chỉ root cấp; target role ADMIN → chặn (root bất khả tước).
- **Seed mẫu (Sprint 1):**

| Permission | Pool cho |
|---|---|
| `CAN_MANAGE_PERMISSIONS` | ADMIN (chỉ root cấp thêm cho giám đốc — ủy quyền phân quyền) |
| `CAN_CREATE_WORKER` | ADMIN, HR_MANAGER, HR_STAFF, SALE |
| `CAN_VIEW_UNASSIGNED_POOL` | ADMIN, HR_MANAGER (xem §5.4) |
| `CAN_APPROVE_PAYROLL` | ADMIN, HR_MANAGER, ACCOUNTANT |
| `CAN_FORCE_LOCK_STATEMENT` | ADMIN, HR_MANAGER |
| `CAN_OVERRIDE_REFERRAL_GUARD` | ADMIN, HR_MANAGER (SOP S1/S2/S3 — §9.3.1 plan) |
| `CAN_APPROVE_TICKET_LEVEL2` | ADMIN, HR_MANAGER (duyệt 2 chữ ký) |
| `CAN_EDIT_CONTRACT` | ADMIN, HR_MANAGER |

**Nguyên tắc:** feature permission **không thay thế** data scope. `CAN_APPROVE_PAYROLL` cho phép bấm nút duyệt — nhưng danh sách pay run họ thấy vẫn bị cắt theo §2. Hai trục, kiểm tra cả hai.

---

## 5. `withAuthScope` — Prisma Client Extension (TypeScript)

### 5.1. AuthContext

```ts
// src/shared/auth/authContext.ts
export type SystemRole =
  | 'ADMIN' | 'HR_MANAGER' | 'DIRECTOR' | 'HR_STAFF' | 'SALE' | 'PM'
  | 'ACCOUNTANT' | 'MKT'
  | 'VENDOR_ADMIN' | 'VENDOR_STAFF' | 'CTV' | 'WORKER' | 'EMPLOYEE';
// G22: + DIRECTOR (Ban giám đốc), MKT — account nghiệp vụ dưới root, quyền do root cấp qua Permission Pool

export interface AuthContext {
  userId: string;        // User.id từ session (JWT) — bắt buộc
  role: SystemRole;
  workerId?: string;     // Worker.id khi role = WORKER (lookup theo accountUserId)
  vendorId?: string;     // Vendor.id khi role = VENDOR_*
}
```

### 5.2. Builder scope theo ma trận

```ts
// src/shared/auth/workerScope.ts
import type { Prisma } from '@prisma/client';
import type { AuthContext } from './authContext';

export class AuthScopeError extends Error {}

/** Ghép nhiều điều kiện where an toàn (bỏ undefined). */
function and<T extends object>(...conds: Array<T | undefined>): T {
  const cs = conds.filter((c): c is T => Boolean(c));
  if (cs.length === 0) return {} as T;
  if (cs.length === 1) return cs[0];
  return { AND: cs } as T;
}

/**
 * Visibility Matrix (§2) — mọi rule đọc Worker phải đi qua hàm này.
 * Admin/HR_MANAGER: {} ghi TƯỜNG MINH (không bỏ qua scope — tránh bug sau này vô tình drop).
 */
export function buildWorkerScope(ctx: AuthContext): Prisma.WorkerWhereInput {
  switch (ctx.role) {
    case 'ADMIN':      // root — bất khả tước (G22 §4.0)
    case 'HR_MANAGER':
    case 'DIRECTOR':   // Ban giám đốc — đọc toàn bộ (ghi vẫn qua Permission Pool)
      return {};

    case 'MKT':
      // MKT là account nghiệp vụ CRM — không đọc Worker (chỉ Lead/Client/Project isPublic)
      throw new AuthScopeError('MKT không có scope đọc Worker');

    case 'HR_STAFF':
      return { assignedToId: ctx.userId };

    case 'SALE':
      // owner HOẶC assigned — OR chứ không phải AND
      return { OR: [{ ownerId: ctx.userId }, { assignedToId: ctx.userId }] };

    case 'PM':
      // Chỉ worker đang ACTIVE ở dự án mình quản lý (G14: tối đa 1 ACTIVE)
      return {
        assignments: {
          some: {
            status: 'ACTIVE',
            project: { pmUserId: ctx.userId },
          },
        },
      };

    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF':
      // Bắt buộc có vendorId trong session — user thuộc vendor nào
      if (!ctx.vendorId) throw new AuthScopeError('VENDOR role thiếu vendorId trong session');
      return { sourceClaims: { some: { accepted: true, vendorId: ctx.vendorId } } };

    case 'CTV':
      return { sourceClaims: { some: { accepted: true, ctvId: ctx.userId } } };

    case 'WORKER':
      // Chỉ bản thân — qua tài khoản đăng nhập (DELTA 2), KHÔNG qua SĐT
      return { accountUserId: ctx.userId };

    default:
      // Deny-by-default: role không khai báo scope → throw, không trả rỗng
      throw new AuthScopeError(`Role ${ctx.role} không có scope đọc Worker`);
  }
}
```

### 5.3. Scope cho các model khác — tái dùng cùng builder

Pattern chủ đạo: **model con của Worker nhúng nguyên `buildWorkerScope` qua relation filter** — rule thay đổi 1 nơi, toàn hệ thống theo:

| Model | Scope đọc |
|-------|-----------|
| `Worker` | `buildWorkerScope(ctx)` |
| `SourceClaim` | `{ worker: buildWorkerScope(ctx) }` ∪ (VENDOR: `{ vendorId: ctx.vendorId }`; CTV: `{ ctvId: ctx.userId }`) |
| `ProjectAssignment` | `{ worker: buildWorkerScope(ctx) }` (PM cũng qua đây — relation worker đã chứa điều kiện assignment ACTIVE) |
| `Ticket`, `TimesheetLine`, `PayResult`, `WorkerDeduction`, `Dependent` | `{ worker: buildWorkerScope(ctx) }` |
| `Project` | PM: `{ pmUserId: ctx.userId }`; VENDOR: `{ isPublic: true }` ∪ có submission của vendor; MKT: `{ isPublic: true }` ∪ CRM owned; WORKER: `{ isPublic: true }` ∪ có assignment ACTIVE; còn lại ADMIN/HR_*/DIRECTOR/SALE: `{}` |
| `Vendor` | VENDOR_*: `{ id: ctx.vendorId }`; còn lại ADMIN/HR_*/SALE: `{}` |
| `CandidateSubmission` | VENDOR: `{ vendorId: ctx.vendorId }`; CTV: `{ ctvId: ctx.userId }`; còn lại `{}` |
| `User` (nội bộ) | **PRIVATE** — chỉ ADMIN/HR_MANAGER; role khác throw |
| `PayrollConfig`, `TaxBracket` | `{}` đọc toàn bộ (không nhạy cảm) — nhưng ghi = permission `CAN_EDIT_CONFIG` |

### 5.4. Ngoại lệ có chủ đích: "Pool chưa phân công"

Worker `assignedToId = null` không ai thấy (kể cả HR_STAFF). Đây là **pool chờ phân công** — mở bằng permission `CAN_VIEW_UNASSIGNED_POOL`:

```ts
export function buildUnassignedPoolScope(ctx: AuthContext): Prisma.WorkerWhereInput {
  requirePermission(ctx, 'CAN_VIEW_UNASSIGNED_POOL'); // ném 403 nếu không có
  return { assignedToId: null };
}
// Route /workers/pool dùng scope này + builder chuẩn theo OR:
// where = { OR: [buildWorkerScope(ctx), buildUnassignedPoolScope(ctx)] }
```

### 5.5. Client Extension — tiêm tự động + chặn ghi sai scope

```ts
// src/shared/auth/withAuthScope.ts
import { Prisma } from '@prisma/client';
import type { AuthContext } from './authContext';
import { buildWorkerScope } from './workerScope';

const READ_OPS = ['findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate'] as const;
const WRITE_OPS = ['update', 'updateMany', 'delete', 'deleteMany'] as const;

export function withAuthScope(ctx: AuthContext) {
  return Prisma.defineExtension({
    name: 'withAuthScope',
    query: {
      worker: {
        // ── Đọc: tiêm where scope vào MỌI lệnh đọc ──
        findMany({ args, query })   { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },
        findFirst({ args, query })  { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },
        count({ args, query })      { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },
        aggregate({ args, query })  { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },

        // findUnique: Prisma cho phép điều kiện phụ trong where — nhưng để đồng bộ
        // ngữ nghĩa "không tìm thấy = không được phép thấy" (không rò rỉ sự tồn tại),
        // chuyển qua findFirst để bản ghi ngoài scope trả null y hệt bản ghi không tồn tại.
        findUnique({ args, query }) {
          const { where, ...rest } = args;
          return query.findFirst({ ...rest, where: and(where, buildWorkerScope(ctx)) });
        },
        findUniqueOrThrow({ args, query }) {
          const { where, ...rest } = args;
          return query.findFirstOrThrow({ ...rest, where: and(where, buildWorkerScope(ctx)) });
        },

        // ── Ghi: bắt buộc scope + ép chủ sở hữu ──
        update({ args, query })     { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },
        updateMany({ args, query }) { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },
        delete({ args, query })     { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },
        deleteMany({ args, query }) { return query({ ...args, where: and(args.where, buildWorkerScope(ctx)) }); },

        create({ args, query }) {
          const data = { ...args.data } as Prisma.WorkerCreateInput;
          // KHÔNG tin client: ai tạo thì người đó làm chủ
          if (ctx.role === 'SALE')  data.ownerId = ctx.userId;
          if (ctx.role === 'HR_STAFF') { data.ownerId ??= ctx.userId; data.assignedToId ??= ctx.userId; }
          if (ctx.role === 'CTV' || ctx.role.startsWith('VENDOR'))
            throw new AuthScopeError('CTV/VENDOR không tạo Worker trực tiếp — đi qua CandidateSubmission');
          return query({ ...args, data });
        },
      },

      // ── Model con: cùng pattern, scope lồng qua relation `worker` ──
      sourceClaim: scopeVia('worker', buildWorkerScope(ctx), (sc, ctx2) =>
        ctx2.role.startsWith('VENDOR') ? { OR: [sc, { vendorId: ctx2.vendorId }] } : sc),
      projectAssignment: scopeVia('worker', buildWorkerScope(ctx)),
      ticket:            scopeVia('worker', buildWorkerScope(ctx)),
      // ... lặp cho timesheetLine, payResult, workerDeduction, dependent ...

      // ── PRIVATE models: deny-by-default ──
      user: {
        findMany()   { throw new AuthScopeError('Model User là PRIVATE'); },
        findUnique() { throw new AuthScopeError('Model User là PRIVATE'); },
      },
    },
  });
}

/** Factory: tái dùng builder cho model có quan hệ `worker`. */
function scopeVia<T extends keyof Prisma.TypeMap['model']>(
  _rel: 'worker',
  workerScope: Prisma.WorkerWhereInput,
  _post?: (base: object, ctx: AuthContext) => object,
) {
  // (Trong bản cài đặt đầy đủ: generic theo model + post-transform theo role.)
  // Nguyên tắc: { worker: workerScope } nhúng nguyên builder — rule sửa 1 chỗ.
  return {};
}
```

> ⚠️ Đoạn `scopeVia` trên là khung mẫu — bản cài đặt Sprint 1 sẽ viết tường minh từng model (không dùng generic lỏng để tránh mất type-safety của Prisma).

### 5.6. Cách dùng trong Route Handlers + transaction

```ts
// app/api/workers/route.ts
import { prisma } from '@/lib/prisma';
import { withAuthScope } from '@/shared/auth/withAuthScope';
import { getSession } from '@/shared/auth/session';

export async function GET() {
  const ctx = await getSession();           // throw nếu chưa đăng nhập
  const db = prisma.$extends(withAuthScope(ctx));

  const workers = await db.worker.findMany({
    where: { employmentStatus: 'ACTIVE' },  // điều kiện nghiệp vụ — scope TỰ ĐỘNG AND thêm
    include: { assignments: true },
  });
  // ✅ SALE chỉ nhận worker của mình; PM chỉ nhận worker ở dự án mình quản lý...

  // Transaction: extension ÁP DỤNG CẢ BÊN TRONG tx
  await db.$transaction(async (tx) => {
    await tx.worker.update({ where: { id: workerId }, data: { ... } }); // đã scope
  });
  return Response.json(workers);
}
```

### 5.7. Chống rò rỉ — checklist bắt buộc

1. ✅ `findUnique` ngoài scope → trả `null`/P2025 **y hệt** "không tồn tại" — không phân biệt được 404/403 (chống rò rỉ sự tồn tại).
2. ✅ `count`/`aggregate` cũng bị scope — không rò tổng số qua endpoint đếm.
3. ✅ `updateMany/deleteMany` không có scope → chạy đúng 0 row (where không khớp), không phải lỗi toàn bảng.
4. ✅ `create` ép `ownerId` từ session — client không thể tự nhận worker của người khác.
5. ✅ `$queryRaw` KHÔNG đi qua extension → **cấm dùng** trong code có ctx; mọi raw SQL phải qua helper `withRlsSession` (§6) để RLS chặn.
6. ✅ Relation nested write (create/connect) trong include — phải có unit test chuyên kiểm tra.
7. ✅ Endpoint export CSV/Excel đi qua **cùng** layer scope (query DB bằng `db` đã extend).
8. ✅ `getSession()` bắt buộc trả đủ `role` + `vendorId` (với VENDOR) — thiếu thì scope throw chứ không nới lỏng.

---

## 6. Lớp backstop: PostgreSQL Row-Level Security

### 6.1. Policy theo đúng ma trận

```sql
-- Session qua GUC (set_config trong transaction — xem §6.2)
-- app.user_id  : User.id của session
-- app.role     : role của session
-- app.vendor_id: vendorId (VENDOR roles)

CREATE FUNCTION hrp_worker_visible(uid text, role text, vid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    role IN ('ADMIN', 'HR_MANAGER')
    OR (role = 'HR_STAFF' AND assigned_to_id = uid)
    OR (role = 'SALE'    AND (owner_id = uid OR assigned_to_id = uid))
    OR (role = 'PM'      AND EXISTS (
          SELECT 1 FROM project_assignments a
          JOIN outsourcing_projects p ON p.id = a.project_id
          WHERE a.worker_id = workers.id AND a.status = 'ACTIVE' AND p.pm_user_id = uid))
    OR (role IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND EXISTS (
          SELECT 1 FROM source_claims s
          WHERE s.worker_id = workers.id AND s.accepted AND s.vendor_id = vid))
    OR (role = 'CTV' AND EXISTS (
          SELECT 1 FROM source_claims s
          WHERE s.worker_id = workers.id AND s.accepted AND s.ctv_id = uid))
    OR (role = 'WORKER' AND account_user_id = uid);
$$;

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_scope ON workers FOR ALL
  USING (hrp_worker_visible(current_setting('app.user_id', true),
                            current_setting('app.role', true),
                            current_setting('app.vendor_id', true)));
```

> Lặp lại policy cho các bảng con (`source_claims`, `project_assignments`, `tickets`...) với điều kiện `worker_id IN (SELECT id FROM workers)` — RLS tự kế thừa scope qua subquery, KHÔNG cần copy logic.
> **Note:** role ADMIN/HR_MANAGER trong policy → `BYPASSRLS` attribute thay vì check role — nhanh hơn và tường minh.

### 6.2. Transaction helper thiết lập session

```ts
// src/shared/auth/rls.ts
import { prisma } from '@/lib/prisma';
import type { AuthContext } from './authContext';

/**
 * Mọi raw SQL / migration script / endpoint đặc biệt PHẢI chạy qua đây.
 * set_config(..., true) = SET LOCAL — chỉ sống trong transaction này,
 * tương thích pooler transaction-mode (Neon) và connection_limit=1 (plan §14.3).
 */
export function withRlsSession<T>(ctx: AuthContext, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.role', ${ctx.role}, true)`;
    if (ctx.vendorId) await tx.$executeRaw`SELECT set_config('app.vendor_id', ${ctx.vendorId}, true)`;
    return fn(tx);
  });
}
```

**Phân công trách nhiệm rõ ràng:**

| Lỗ hổng | L1 Extension | L2 RLS |
|---------|:---:|:---:|
| Route handler quên scope | ✅ chặn | ✅ chặn |
| `$queryRaw` ngoài luồng | ❌ không thấy | ✅ chặn |
| Tool/console DB trực tiếp | ❌ | ✅ chặn |
| Policy SQL sai → extension vẫn đúng | ✅ | ❌ |
| Kiểm thử: L1 = unit test vitest; L2 = integration test với 2 session khác role |

---

## 7. Migration & rollout (Sprint 1 — đã có trong lộ trình plan v4.13)

1. Migration `SystemRole` enum + `Worker.accountUserId` + 3 FK relation (owner/assignedTo/account) + index bổ sung (§3.2).
2. Backfill `accountUserId` từ dữ liệu đăng ký hiện có (match theo CCCD/userId — đối chiếu tay từng row đầu).
3. Seed `Permission` + `RolePermission` (§4.1) — chưa mở `UserPermissionGrant` nào.
4. Cài `withAuthScope` + `withRlsSession`; thay toàn bộ `prisma.worker.*` bằng `db.worker.*` trong Route Handlers.
5. Test bắt buộc (đã nằm trong Sprint 1 "RBAC + data-scope test"):
   - 8 role × ma trận: mỗi role query worker → đúng tập dự kiến (seed scenario thật).
   - `findUnique` ngoài scope → `null`; `count` bị cắt; `updateMany` ngoài scope → `count: 0`.
   - Test RLS: mở 2 transaction với 2 role khác nhau → row đọc được khác nhau.
6. Bật `FORCE` chế độ: bỏ mọi usage `prisma` thô trong code (lint rule — plan đã có "boundary lint").

---

*Tài liệu đi kèm plan v4.14 §15.1 (BẢO MẬT) — canonical schema là `prisma/schema.prisma`.*
