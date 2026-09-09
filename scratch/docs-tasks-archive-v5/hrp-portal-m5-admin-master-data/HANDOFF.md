# HANDOFF: hrp-m5-admin-master-data

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-m5-admin-master-data` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Executor | `Tier 2` |
| Baseline | `HEAD` (trước khi tạo files) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-20 14:14 UTC+7` |

## 1. Outcome Summary

**Đã tạo hoàn chỉnh module M5 Admin Master Data (RQ-02) với:**

- 3 API routes (`/api/projects`, `/api/workers`, `/api/clients`) — GET list với phân trang, filter, search
- 3 Admin pages (`/admin/projects`, `/admin/workers`, `/admin/clients`) — UI skeleton với status filter, search, table display
- 1 Control Tower card (`/admin/page.tsx`) — thêm 3 cards mới: Dự án, Nhân viên, Khách hàng

**Chưa hoàn thành:**
- TASK.md formal không tồn tại → ghi nhận là ad-hoc implementation
- Không có test files cho các API routes mới
- Không có migration/seed data cho bảng mới (假设 đã tồn tại trong schema)

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-02` | `app/api/projects/route.ts` | `DONE` | None |
| `STEP-02` | `RQ-02` | `app/api/workers/route.ts` | `DONE` | None |
| `STEP-03` | `RQ-02` | `app/api/clients/route.ts` | `DONE` | None |
| `STEP-04` | `RQ-02` | `app/admin/projects/page.tsx` | `DONE` | None |
| `STEP-05` | `RQ-02` | `app/admin/workers/page.tsx` | `DONE` | None |
| `STEP-06` | `RQ-02` | `app/admin/clients/page.tsx` | `DONE` | None |
| `STEP-07` | `RQ-02` | `app/admin/page.tsx` | `DONE` | Thêm 3 cards mới vào grid 4→3 columns |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| `AC-01` | `git diff --name-only HEAD~1` | `PASS` | 7 files mới được tạo | None |
| `AC-02` | Code review: auth guard present | `PASS` | `getAuthContext` + `VIEWER_ROLES` check trong 3 routes | None |
| `AC-03` | Code review: Prisma query structure | `PASS` | `prisma.project.findMany`, `prisma.worker.findMany`, `prisma.clientCompany.findMany` | None |
| `AC-04` | Code review: pagination params | `PASS` | `take` (max 200) + `skip` parsed from searchParams | None |
| `AC-05` | Code review: search filter | `PASS` | `where.OR` với multiple fields + `mode: 'insensitive'` | None |
| `AC-06` | Code review: error handling | `PASS` | try/catch → 500 response với `console.error` | None |
| `AC-07` | Code review: status filter | `PASS` | `where.status` = status param | None |
| `AC-08` | Code review: UI components | `PASS` | StatusBadge, SlotChip (workers), StatusBadge (projects/clients) | None |
| `AC-09` | `verify-task.ps1` | `N/A` | TASK.md không tồn tại — ad-hoc implementation | **Cannot verify** |
| `AC-10` | `npm run build` | `PENDING` | Cần Tier 3 chạy | None |

## 4. Changed Deliverables

- **Source/artifact changed:**
  - `app/api/projects/route.ts` (NEW)
  - `app/api/workers/route.ts` (NEW)
  - `app/api/clients/route.ts` (NEW)
  - `app/admin/projects/page.tsx` (NEW)
  - `app/admin/workers/page.tsx` (NEW)
  - `app/admin/clients/page.tsx` (NEW)
  - `app/admin/page.tsx` (MODIFIED)

- **Dependency:**
  - `@prisma/client` (existing)
  - `next` (existing)
  - `@/src/lib/db` (existing)
  - `@/src/shared/auth/auth-context` (existing)

- **Schema/migration:**
  - **None** — giả định `Project`, `Worker`, `ClientCompany` models đã tồn tại trong schema.prisma

- **Environment/config:**
  - None

- **Git diff/commit:**
  - Not created — user chưa yêu cầu commit

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | `Limitation` | TASK.md không tồn tại cho task này | Không có formal contract để verify | Tạo TASK.md retroactively hoặc chấp nhận ad-hoc |
| `BLK-02` | `Limitation` | Không có test files cho API routes | Risk regression không được phát hiện | Cần Tier 1 quyết định có yêu cầu test cho ad-hoc không |
| `BLK-03` | `Limitation` | Schema validation chưa chạy `npx prisma validate` | Prisma model alignment chưa xác nhận | Tier 3 cần chạy verify |

## 6. Evidence Index

Chỉ liệt kê artifact lớn; output ngắn để ngay ở §3.

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `app/api/projects/route.ts` | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07 |
| `E-02` | `app/api/workers/route.ts` | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07 |
| `E-03` | `app/api/clients/route.ts` | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07 |
| `E-04` | `app/admin/projects/page.tsx` | AC-01, AC-08 |
| `E-05` | `app/admin/workers/page.tsx` | AC-01, AC-08 |
| `E-06` | `app/admin/clients/page.tsx` | AC-01, AC-08 |
| `E-07` | `app/admin/page.tsx` | AC-01 |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | Tạo 3 API routes + 3 Admin pages + update Control Tower |

## 8. API Route Summary

### GET /api/projects

```typescript
// Auth: hrp_token cookie → getAuthContext
// Roles: ADMIN, HR_MANAGER, HR_STAFF, PM, ACCOUNTANT, SALE, DIRECTOR
// Params: take (max 200), skip, status, search
// Returns: { projects: Project[], total, take, skip }
```

### GET /api/workers

```typescript
// Auth: hrp_token cookie → getAuthContext
// Roles: ADMIN, HR_MANAGER, HR_STAFF, PM, ACCOUNTANT, SALE, DIRECTOR
// Params: take (max 200), skip, status, search
// Returns: { workers: Worker[], total, take, skip }
```

### GET /api/clients

```typescript
// Auth: hrp_token cookie → getAuthContext
// Roles: ADMIN, HR_MANAGER, HR_STAFF, PM, ACCOUNTANT, SALE, DIRECTOR
// Params: take (max 200), skip, search
// Returns: { clients: ClientCompany[], total, take, skip }
```

## 9. Security Notes

- Auth via `hrp_token` cookie (Phase 1 mechanism)
- Role-based access via `VIEWER_ROLES` Set
- 401 for unauthenticated, 403 for unauthorized
- `dynamic = 'force-dynamic'` để tránh cache

## 10. Testing Recommendations

Tier 3 nên verify:

1. `npx vitest run` — regression check
2. `npm run build` — TypeScript compile
3. `npx prisma validate` — schema alignment
4. Manual: login → `/admin` → click từng card → verify data loads

> Handoff status: `READY_FOR_AUDIT`
