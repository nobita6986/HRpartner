# HANDOFF — `t1a-pre-p2-project-management-hotfix`

## 0. Status

| Field | Value |
|---|---|
| Task slug | `t1a-pre-p2-project-management-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Status | `READY_TO_CODE → ACCEPTED` |
| Baseline | `0626ba28cf3723b37c05c5d5f32a490cca6ae87f` (`origin/main`) |
| Branch | `codex/t1a-pre-p2-project-management-hotfix` |
| Worktree | `C:/CodeApp/HrP-t1a-pre-p2-project-management-hotfix` |
| Spec version | `v1.0` |
| Acceptance gate | STANDARD + NONE (T0 pre-authorized) |
| Next gate | `/deliver → /resolve` (PR opened, CI monitoring, stop before merge) |
| Closing line | ACCEPTED — 6/6 canonical gates GREEN; 4779 unit tests pass (96 mới: 37 service + 44 route + 15 terminology); static RLS sweep updated for 1 new required relation select in `project-read.service.ts:152`. |

## 1. Outcome delivered

### 1.1 Trang quản trị `/admin/projects/[id]`

- Server Component derive `ProjectCapability` (`canView` mirror GET authority; `canEdit`/`canChangeStatus` = ADMIN/HR_MANAGER/PM; `canDelete` = ADMIN only). Role ngoài authority (SALE/WORKER/VENDOR_*) → 404 fail-closed.
- Header: code + name + status (mapped Vietnamese qua `projectStatusLabel`) + clientCompany + startDate/endDate + siteAddress.
- 3 metric cards: **Đơn ứng tuyển** / **Phân công người lao động** / **Địa điểm công trường**.
- Bảng **Nhu cầu tuyển dụng**: mỗi row link `Mở chi tiết →` tới `/admin/staffing-orders/[id]`.
- Bảng **Vị trí cần tuyển** (JobOpenings): link `Mở chi tiết →` tới `/admin/job-openings/[id]` CHỈ khi `jobOpeningDetailRouteExists` (file system check); nếu không thì render `—` (T0 §B.2 chống link chết).
- Action toolbar 5 thao tác gated theo `ProjectCapability`: **Sửa dự án** / **Kích hoạt dự án** / **Tạm dừng dự án** / **Hoàn thành dự án** / **Huỷ dự án** / **Xoá vĩnh viễn** (chỉ ADMIN).
- Read-only banner cho HR_STAFF/DIRECTOR/ACCOUNTANT/PM-readonly: `Chế độ chỉ đọc — vai trò <roleLabel> có quyền xem nhưng không thể thao tác trên dự án.`
- COMPLETED/CANCELLED terminal ⇒ `VALID_TRANSITIONS[status] = []` ⇒ KHÔNG action chuyển trạng thái nào render.

### 1.2 Mutations

- `Sửa dự án` → `EditProjectModal` PUT `/api/projects/[id]` (validate allowlist: name, clientCompanyId, pmUserId, siteAddress, startDate YYYY-MM-DD, endDate YYYY-MM-DD|null, status enum, quota int|null).
- `Kích hoạt / Tạm dừng / Hoàn thành / Huỷ` → PATCH `/api/projects/[id]` body `{ status: <target> }`; idempotency key mỗi dialog open; 409 typed.
- `Xoá vĩnh viễn` → DELETE `/api/projects/[id]` + header `x-idempotency-key` REQUIRED. 409 PROJECT_NOT_DELETABLE với guidance "Hoàn thành dự án" hoặc "Huỷ dự án".

### 1.3 API integrity

- `validateProjectUpdateInput` strict allowlist: reject unknown fields; ISO date round-trip (`2026-02-30` rejected); endDate < startDate rejected; quota safe int; status enum. Vietnamese error messages.
- `updateProjectStatus`: advisory lock `p1a04:project:<id>` BEFORE read; re-read under lock; terminal guard; same status no-op idempotent.
- `deleteProject`: ADMIN only; lock + re-read deps (lần 2 dưới lock để bắt concurrent writes); scan 4 blocking relations (StaffingOrder, CandidateSubmission, ProjectAssignment, Site) + audit `placements`; `Placement.projectId` SetNull KHÔNG block.
- `withIdempotency` cho DELETE (key bắt buộc) + PATCH (key optional); mirror `withIdempotency` từ `deleteStaffingOrder` HRP-T1A.

### 1.4 Role authority (mirror backend)

- View: ADMIN / HR_MANAGER / HR_STAFF / PM / ACCOUNTANT / DIRECTOR (mirror GET `/api/projects` list).
- Edit + status transition: ADMIN / HR_MANAGER / PM.
- Delete: ADMIN only.
- SALE / WORKER / VENDOR_ADMIN / VENDOR_STAFF / CTV / MKT / EMPLOYEE: 404 fail-closed.
- Không mở rộng auth/RLS.

## 2. Files (9 changed)

| Layer | Path | Purpose |
|---|---|---|
| Service | `src/domains/crm/project-management.service.ts` (NEW) | State machine + safe delete + validation |
| Service | `src/domains/crm/project-read.service.ts` (M) | Thêm `getProjectForManagement` + `ProjectManagementDto` |
| Route | `app/api/projects/[id]/route.ts` (M) | Thêm PATCH + DELETE; harden PUT validation |
| UI | `app/admin/projects/[id]/page.tsx` (M) | Server Component derive capability |
| UI | `app/admin/projects/[id]/project-detail-client.tsx` (NEW) | Toolbar + modals + 3 metric cards + 2 linked tables |
| Test | `src/domains/crm/__tests__/project-management.service.test.ts` (NEW) | 37 tests: state machine, scan, delete, race, validation |
| Test | `app/api/projects/[id]/__tests__/route.test.ts` (NEW) | 44 tests: role gate, validation, idempotency, errors |
| Test | `app/admin/projects/[id]/__tests__/project-terminology.test.ts` (NEW) | 15 static tests: VI labels, capability gating, link integrity |
| Test | `src/shared/security/required-relation-sweep.static.test.ts` (M) | +1 entry: `project-read.service.ts:152 clientCompany` (40 → 41 src hits) |

## 3. Gates

| Gate | Command | Result |
|---|---|---|
| Targeted tests | `pnpm exec vitest run --config vitest.unit.config.ts src/domains/crm/__tests__/project-management.service.test.ts 'app/api/projects/[id]/__tests__/route.test.ts' 'app/admin/projects/[id]/__tests__/project-terminology.test.ts'` | 96/96 PASS |
| Full unit | `pnpm run test` | 4779 passed, 9 skipped, 0 failed |
| Typecheck | `pnpm run typecheck` | 0 errors |
| Lint | `pnpm run lint` | 0 errors (980 pre-existing warnings) |
| Prisma validate | `prisma validate` | schema valid |
| Build | `pnpm run build` | success; `/admin/projects/[id]` 6.5 kB |
| UTF-8 no-BOM | `node .ai-pipeline/scripts/verify-encoding.mjs` | 11/11 files PASS |
| Git diff check | `git diff --check` | clean |

## 4. Open items (post-handoff)

- None. PR ready for `/deliver → /resolve`; stop before merge.
