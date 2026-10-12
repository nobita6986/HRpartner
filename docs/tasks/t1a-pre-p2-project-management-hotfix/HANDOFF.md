# HANDOFF — `t1a-pre-p2-project-management-hotfix`

## 0. Status

| Field | Value |
|---|---|
| Task | `t1a-pre-p2-project-management-hotfix` (Việt hoá + quản trị Dự án) |
| Spec | `v1.1` (CORR1: placement-blocking) |
| Audit `NONE` · Lane `STANDARD` · Protocol `V2_FAST_FREEZE` |
| Baseline | `0626ba28cf3723b37c05c5d5f32a490cca6ae87f` |
| Branch | `codex/t1a-pre-p2-project-management-hotfix` |
| Worktree | `C:\CodeApp\HrP-t1a-pre-p2-project-management-hotfix` |
| Status | `ACCEPTED` · PR #114 CLEAN/MERGEABLE · CI 4/4 GREEN · dừng trước merge |

## 1. Outcome

`/admin/projects/[id]`: việt hoá toàn bộ copy + raw enum (qua `projectStatusLabel`); 3 metric cards; bảng Nhu cầu tuyển dụng mỗi row link `/admin/staffing-orders/{id}`; bảng Vị trí cần tuyển link `/admin/job-openings/{id}` chỉ khi route detail tồn tại; toolbar 5 thao tác gated theo `ProjectCapability`. API PATCH (state machine + terminal guard + idempotency optional), DELETE (ADMIN + idempotency key REQUIRED + **5 blocking relations** scan + advisory lock + re-read deps dưới lock chống race).

**CORR1 (T0 directive, 2026-10-06)**: `placementsCount > 0` ⇒ 409 `PROJECT_NOT_DELETABLE` + VI `"bố trí việc làm"` (canonical `glossary.ts`); service chặn trước DB cascade, giữ nguyên `Placement.projectId`.

## 2. Files (T1A 9 + forward-merge 2)

Service: `project-management.service.ts` (M, CORR1 — `DELETION_BLOCKING_RELATIONS` + `placements`; `ProjectDependencyReport.placementsCount`; VI label `"bố trí việc làm"`), `project-read.service.ts` (M). Route: `app/api/projects/[id]/route.ts` (M). UI: `app/admin/projects/[id]/page.tsx` (M), `project-detail-client.tsx` (NEW). Tests (103 unit, T1A): service 44 (37 + 7 CORR1), route 44, terminology 15, sweep +1 entry. Forward-merge from PR #112: `src/shared/ui/role-guard/active-nav-helper.{ts,test.ts}` (preserved, orthogonal).

Forbidden: zero changes under `prisma/`, `src/shared/auth/scopes/`, `app/api/auth/`, `middleware.ts`, `workers/`, list page, sidebar. No schema/migration; no auth/RLS expansion.

## 3. Gates (post CORR1)

| Gate | Result |
|---|---|
| Targeted | 6 files / **188** tests PASS |
| Full unit | 298 files / **4807** tests PASS |
| Typecheck | exit 0 |
| Lint | exit 0 (0 new T1A warnings) |
| Prisma validate | schema valid |
| Build | exit 0 |
| Verify-encoding | PASS (UTF-8 no-BOM) |
| `git diff --check` | clean |
| PR #114 | CLEAN/MERGEABLE · CI 4/4 GREEN (Quality · Integration · Vercel · Vercel Preview Comments) |
| Forward-only | 0 rebase / 0 amend / 0 force-push |

## 4. Open items

None. Dừng trước merge per T0. T1B separate worktree/prompt/delivery; burn-in not initiated.
