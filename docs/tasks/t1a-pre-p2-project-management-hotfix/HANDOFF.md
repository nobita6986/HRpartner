# HANDOFF — `t1a-pre-p2-project-management-hotfix`

## 0. Status

| Field | Value |
|---|---|
| Task | `t1a-pre-p2-project-management-hotfix` (Việt hoá + quản trị Dự án) |
| Spec version | `v1.0` |
| Audit mode | `NONE` · Lane `STANDARD` · Protocol `V2_FAST_FREEZE` |
| Correction budget | `0` |
| Baseline (task start) | `0626ba28cf3723b37c05c5d5f32a490cca6ae87f` |
| Forward-merge target | `d6f119735e0b4fc3a7e0ba001c66d1be49639027` (origin/main @ PR #112 sidebar) |
| Implementation checkpoint | `7f30e6ebf20d943d60b041a3c970577f16b6ab00` |
| Forward-merge commit | `8de73f8f` (auto-merge, 0 conflict) |
| Branch | `codex/t1a-pre-p2-project-management-hotfix` |
| Worktree | `C:\CodeApp\HrP-t1a-pre-p2-project-management-hotfix` |
| Status | `READY_FOR_REVIEW` (CI pending) · Dừng trước merge |

## 1. Outcome

`/admin/projects/[id]` (Server Component + client toolbar): việt hoá toàn bộ copy + raw enum (`projectStatusLabel`); 3 metric cards (Đơn ứng tuyển / Phân công / Địa điểm); bảng Nhu cầu tuyển dụng mỗi row link `/admin/staffing-orders/{id}`; bảng Vị trí cần tuyển link `/admin/job-openings/{id}` chỉ khi route detail tồn tại; toolbar 5 thao tác gated theo `ProjectCapability` (server-derived): Sửa / Kích hoạt / Tạm dừng / Hoàn thành / Huỷ (ADMIN/HR_MANAGER/PM) + Xoá vĩnh viễn (ADMIN only). COMPLETED/CANCELLED = terminal ⇒ KHÔNG action chuyển trạng thái. Role ngoài authority → 404 fail-closed. **API**: PUT (allowlist + ISO date round-trip + quota safe int + status enum + P2025→404), PATCH (state machine + terminal guard + idempotency optional), DELETE (ADMIN only + idempotency key REQUIRED + 4 blocking relations scan + typed 409 `PROJECT_NOT_DELETABLE` + advisory lock + re-read deps dưới lock chống race; `Placement.projectId` SetNull KHÔNG block, KHÔNG cascade).

## 2. Files (11 in T1A + 2 in T1C forward-merge)

| Layer | Path | Note |
|---|---|---|
| Service | `src/domains/crm/project-management.service.ts` (NEW) | State machine + safe delete + validation + error class |
| Service | `src/domains/crm/project-read.service.ts` (M) | `getProjectForManagement` + `ProjectManagementDto` |
| Route | `app/api/projects/[id]/route.ts` (M) | PATCH + DELETE; harden PUT |
| UI | `app/admin/projects/[id]/page.tsx` (M) | Server Component derive capability |
| UI | `app/admin/projects/[id]/project-detail-client.tsx` (NEW) | Toolbar + modals + 3 cards + 2 tables |
| Test | `src/domains/crm/__tests__/project-management.service.test.ts` (NEW, 37 tests) | state machine, scan, delete, race, validation |
| Test | `app/api/projects/[id]/__tests__/route.test.ts` (NEW, 44 tests) | role gate, validation, idempotency, errors |
| Test | `app/admin/projects/[id]/__tests__/project-terminology.test.ts` (NEW, 15 tests) | VI labels, capability gating, link integrity |
| Test | `src/shared/security/required-relation-sweep.static.test.ts` (M) | +1 entry for `project-read.service.ts:152` |
| From PR #112 | `src/shared/ui/role-guard/active-nav-helper.{ts,test.ts}` (forward-merge) | T1C pre-p2 sidebar hotfix (preserved) |

Forbidden paths: zero changes under `prisma/`, `src/shared/auth/scopes/`, `app/api/auth/`, `middleware.ts`, `workers/`, `app/admin/projects/page.tsx` (list), `app/admin/projects/projects-table-client.tsx`. **No schema/migration; no audit trail mới; no Project↔StaffingOrder mutation; no Kanban; no auth/RLS expansion.**

## 3. Gates (post forward-merge)

| Gate | Result |
|---|---|
| Targeted (role-guard + T1A) | 6 files / 181 tests PASS |
| Full unit | 298 files / 4800 tests PASS (0 failed; +96 T1A, +18 T1C vs baseline 295/4704) |
| Typecheck | exit 0 |
| Lint | exit 0 (982 baseline warnings, **0 new T1A warnings**) |
| Prisma validate | schema valid (env: `DATABASE_URL`, `DATABASE_URL_ADMIN`) |
| Build | exit 0, "Compiled successfully in 36.9s" |
| Verify-encoding | PASS, 0 changed tracked files (everything committed) |
| `git diff --check` | clean |
| Forward-only | 0 rebase / 0 amend / 0 force-push |

## 4. Self-review (Tier 1, T0 directive)

WIP was carried in unmodified (per user directive "không xóa hoặc ghi đè WIP"). Each WIP file audited against the T1A prompt:

- Việt hoá copy + raw enum — covered via `projectStatusLabel` + Vietnamese error messages + zero raw enum strings in client. ✓
- 5 thao tác quản trị tại trang chi tiết — `EditProjectModal` + 4 status transition actions + Delete. ✓
- Xoá chỉ ADMIN, orphan-only, typed 409 `PROJECT_NOT_DELETABLE`, không cascade — `PROJECT_DELETE_ROLES = ['ADMIN']` only; `tx.project.delete` (no cascade); 4-relation scan > 0 ⇒ 409. ✓
- Link StaffingOrder đã liên kết tới `/admin/staffing-orders/{id}` — table of staffing orders with row links. ✓
- UI capability ↔ backend authority — `ProjectCapability` derived from role; backend uses same `PROJECT_UPDATE_ROLES`/`PROJECT_DELETE_ROLES`. ✓
- Regression tests — 96 unit tests. ✓
- **NO**: audit trail / Project↔StaffingOrder mutation / Kanban / schema/migration / auth-RLS expansion — verified via `git diff --name-only` against forbidden paths. ✓

## 5. Open items (post-handoff)

None for T1A. PR ready for `/deliver → /resolve`; awaiting CI 4/4 GREEN; dừng trước merge per T0. T1B (Hoàn thiện quản trị Người lao động) is a separate worktree (`HrP-t1b-pre-p2-worker-management-hotfix`), separate prompt from user, separate delivery.
