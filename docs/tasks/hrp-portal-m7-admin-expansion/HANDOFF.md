# HANDOFF: hrp-portal-m7-admin-expansion

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m7-admin-expansion` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Executor | `Tier 2` |
| Baseline | `HEAD of main` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-20 16:15 UTC+7` |

## 1. Outcome Summary

**Hoàn thành M7 Admin Expansion:**

### Master Data CRUD (RQ-01)
- **Workers**: Form Thêm/Sửa + API POST/PUT
- **Projects**: Form Thêm/Sửa với client dropdown + API POST/PUT
- **Clients**: Form Thêm/Sửa + API POST/PUT

### Vendors & Users (RQ-02)
- **Vendors**: Trang list + Form CRUD + API GET/POST/PUT tại `/api/vendors`
- **Users**: Trang list (read-only) + API GET tại `/api/admin/users`

### Settings (RQ-03)
- **Settings**: Trang UI placeholder với 5 nhóm settings groups

### Control Tower Update
- Thêm nav items trong `ADMIN_NAV_PHASE4` (đã tồn tại)

## 2. Execution Trace

| STEP | RQ | File/artifact | Result | Deviation |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | Workers/Projects/Clients CRUD | `DONE` | Loại bỏ project relation (Worker không có direct project field) |
| `STEP-02` | `RQ-02` | Vendors & Users pages + APIs | `DONE` | None |
| `STEP-03` | `RQ-03` | Settings page | `DONE` | None |
| `STEP-04` | `RQ-04` | Build verification | `DONE` | `npm run build` exit 0 |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence | Limitation |
|---|---|---|---|---|
| `AC-01` | Code review: UI forms hoạt động | `PASS` | Modal components cho 4 pages | None |
| `AC-02` | Code review: 3 pages mới | `PASS` | `/admin/vendors`, `/admin/users`, `/admin/settings` tạo | None |
| `AC-03` | `npm run build` | `exit 0` | Build success | None |

## 4. Changed Deliverables

### API Routes (NEW + MODIFIED)
- `app/api/workers/route.ts` — Thêm POST handler
- `app/api/workers/[id]/route.ts` — Thêm PUT handler (NEW)
- `app/api/projects/route.ts` — Thêm POST handler
- `app/api/projects/[id]/route.ts` — Thêm PUT handler (NEW)
- `app/api/clients/route.ts` — Thêm POST handler
- `app/api/clients/[id]/route.ts` — Thêm PUT handler (NEW)
- `app/api/vendors/route.ts` — GET + POST (NEW)
- `app/api/vendors/[id]/route.ts` — PUT handler (NEW)
- `app/api/admin/users/route.ts` — GET handler (NEW)

### Admin Pages (NEW + MODIFIED)
- `app/admin/workers/page.tsx` — Thêm Modal + nút Thêm/Sửa
- `app/admin/projects/page.tsx` — Thêm Modal + nút Thêm/Sửa
- `app/admin/clients/page.tsx` — Thêm Modal + nút Thêm/Sửa
- `app/admin/vendors/page.tsx` — List + Modal (NEW)
- `app/admin/users/page.tsx` — List read-only (NEW)
- `app/admin/settings/page.tsx` — UI placeholder (NEW)

### Schema
- **None** — giả định models đã tồn tại

### Environment/Config
- **None**

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed |
|---|---|---|---|---|
| `BLK-01` | `Deviation` | Worker model không có direct `project` relation hoặc `empCode` field | Bỏ qua project info trong workers list | Planner accept? |
| `BLK-02` | `Deviation` | Worker model không có `status` field | Không có status filter cho workers | Planner accept? |

## 6. API Summary

### GET /api/workers
- Roles: ADMIN, HR_MANAGER, HR_STAFF, PM, ACCOUNTANT, SALE, DIRECTOR
- Returns: workers list

### POST /api/workers
- Roles: ADMIN, HR_MANAGER
- Creates new worker (userId + fullName required)

### PUT /api/workers/[id]
- Roles: ADMIN, HR_MANAGER
- Updates worker (fullName, phone, cccdNumber, dateOfBirth, gender)

### GET/POST /api/projects
- Roles: VIEWER → ADMIN (POST)
- CRUD cho projects

### GET/POST /api/clients
- Roles: VIEWER → ADMIN (POST)
- CRUD cho clients

### GET /api/admin/users
- Roles: ADMIN only
- Returns system users list (read-only)

### GET/POST/PUT /api/vendors
- Roles: VIEWER → ADMIN (POST/PUT)
- Full CRUD cho vendors

## 7. Security Notes

- Auth via `hrp_token` cookie
- Role-based access cho từng operation
- 401/403 responses cho unauthorized
- `dynamic = 'force-dynamic'`

## 8. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | Full CRUD implementation for M7 |

> Handoff status: `READY_FOR_AUDIT`
