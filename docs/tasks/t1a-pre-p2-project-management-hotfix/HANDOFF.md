# HANDOFF — `t1a-pre-p2-project-management-hotfix`

## 0. Status

| Field | Value |
|---|---|
| Task | `t1a-pre-p2-project-management-hotfix` (Việt hoá + quản trị Dự án) |
| Spec version | `v1.1` (CORR1: placement-blocking) |
| Audit mode | `NONE` · Lane `STANDARD` · Protocol `V2_FAST_FREEZE` |
| Correction budget | `0/1` used |
| Baseline (task start) | `0626ba28cf3723b37c05c5d5f32a490cca6ae87f` |
| Forward-merge target | `d6f119735e0b4fc3a7e0ba001c66d1be49639027` (origin/main @ PR #112) |
| Branch | `codex/t1a-pre-p2-project-management-hotfix` |
| Worktree | `C:\CodeApp\HrP-t1a-pre-p2-project-management-hotfix` |
| Status | `READY_FOR_REVIEW` (CI pending) · Dừng trước merge |

## 1. Outcome

`/admin/projects/[id]`: việt hoá toàn bộ copy + raw enum (`projectStatusLabel`); 3 metric cards; bảng Nhu cầu tuyển dụng mỗi row link `/admin/staffing-orders/{id}`; bảng Vị trí cần tuyển link `/admin/job-openings/{id}` chỉ khi route detail tồn tại; toolbar 5 thao tác gated theo `ProjectCapability`. **API** PATCH (state machine + terminal guard + idempotency optional), DELETE (ADMIN only + idempotency key REQUIRED + 5 blocking relations scan + advisory lock + re-read deps dưới lock chống race).

**CORR1 (T0 directive, 2026-10-06)**: `placementsCount > 0` ⇒ 409 `PROJECT_NOT_DELETABLE` + VI "bố trí việc làm" (canonical theo `glossary.ts`). Giữ nguyên liên kết `Placement.projectId` — KHÔNG SetNull ngầm qua DB cascade (service chặn trước). Lock/re-read sequence giữ nguyên (`p1a04:project:<id>` + re-read cả 5 count DƯỚI lock).

## 2. Files (11 in T1A + 2 in T1C forward-merge)

| Layer | Path | Note |
|---|---|---|
| Service | `src/domains/crm/project-management.service.ts` (M, CORR1) | `DELETION_BLOCKING_RELATIONS` + `placements`; `ProjectDependencyReport.placementsCount`; VI label `"bố trí việc làm"` |
| Service | `src/domains/crm/project-read.service.ts` (M) | `getProjectForManagement` + `ProjectManagementDto` |
| Route | `app/api/projects/[id]/route.ts` (M) | PATCH + DELETE; harden PUT |
| UI | `app/admin/projects/[id]/page.tsx` (M) | Server Component derive capability |
| UI | `app/admin/projects/[id]/project-detail-client.tsx` (NEW) | Toolbar + modals + 3 cards + 2 tables |
| Test | `src/domains/crm/__tests__/project-management.service.test.ts` (M, CORR1) | 44 tests (was 37, +7: 2 blocking describe + 5 placement regression) |
| Test | `app/api/projects/[id]/__tests__/route.test.ts` (NEW, 44 tests) | role gate, validation, idempotency, errors |
| Test | `app/admin/projects/[id]/__tests__/project-terminology.test.ts` (NEW, 15 tests) | VI labels, capability gating, link integrity |
| Test | `src/shared/security/required-relation-sweep.static.test.ts` (M) | +1 entry for `project-read.service.ts:152` |
| From PR #112 | `src/shared/ui/role-guard/active-nav-helper.{ts,test.ts}` (forward-merge) | T1C pre-p2 sidebar hotfix (preserved) |

Forbidden paths: zero changes under `prisma/`, `src/shared/auth/scopes/`, `app/api/auth/`, `middleware.ts`, `workers/`, `app/admin/projects/page.tsx` (list), `app/admin/projects/projects-table-client.tsx`. **No schema/migration; no audit trail mới; no Project↔StaffingOrder mutation; no Kanban; no auth/RLS expansion.**

## 3. Gates (post CORR1)

| Gate | Result |
|---|---|
| Targeted (role-guard + T1A service) | 6 files / **188** tests PASS (was 181, +7 CORR1) |
| Full unit | 298 files / **4807** tests PASS (was 4800, +7 CORR1) |
| Typecheck | exit 0 |
| Lint | exit 0 (**0 new T1A warnings**) |
| Prisma validate | schema valid |
| Build | exit 0, "Compiled successfully in 16.9s" |
| Verify-encoding | PASS (2 changed tracked files, UTF-8 no BOM) |
| `git diff --check` | clean |
| Forward-only | 0 rebase / 0 amend / 0 force-push |

## 4. CORR1 changes (diff scope)

- `project-management.service.ts` — `DELETION_BLOCKING_RELATIONS` thêm `'placements'`; `ProjectDependencyReport.placementsCount` chính thức thuộc interface (không còn `& { placementsCount }`); `DEPENDENCY_LABEL_VI.placementsCount = 'bố trí việc làm'` (canonical từ `glossary.ts`); comment Phase 3 update.
- `__tests__/project-management.service.test.ts` — `describeBlockingDependencies` "zero mọi thứ" thêm `placementsCount: 0`; "mỗi relation > 0" thêm `placementsCount: 0`; **mới**: `placementsCount > 0 ⇒ "bố trí việc làm"`, `mixed (nhiều relation > 0)`, **`CORR1: placementsCount > 0 ⇒ 409`**, **`CORR1: placement-alone blocks`**, **`CORR1: orphan (placement=0) PASS`**, **`CORR1: RACE placement`**, **`CORR1: placement count DƯỚI lock`**.
- ZERO changes under `prisma/`, `src/shared/auth/`, `middleware.ts`. ZERO schema/migration.

## 5. Open items (post-handoff)

None for T1A. PR ready for `/deliver → /resolve`; awaiting CI 4/4 GREEN; dừng trước merge per T0. T1B is separate worktree, separate prompt, separate delivery; burn-in not initiated.