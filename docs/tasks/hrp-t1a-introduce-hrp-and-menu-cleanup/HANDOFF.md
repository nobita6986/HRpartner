# HANDOFF — `hrp-t1a-introduce-hrp-and-menu-cleanup`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1a-introduce-hrp-and-menu-cleanup` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `f74ab92cb0e79d5b7ebaa750cf5f4d5a9b94b22b` |
| Implementation SHA | `741c1874fe62be3b70485d768019ff41070d0c1c` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |
| Branch | `codex/t1a-introduce-hrp-and-menu-cleanup` |
| Branch HEAD | Exact final branch HEAD is reported in the post-commit handback; every commit after Implementation SHA is docs/control-only. |

## 1. Outcome and changed surface

- **Delivered:**
  - **A. Public "Giới thiệu" page** — re-created the legacy public route `/ve-chung-toi` (the absence of the route was previously documented in the comment that lived in `app/components/GlobalNavbar.tsx`). The new server component renders the T0-supplied copy for "HRP Việt Nam" + "Sàn Việc Làm Miền Bắc" inside the existing portal chrome (GlobalNavbar + GlobalFooter mounted by `app/(portal)/layout.tsx`). Navbar entry flipped from disabled "Công ty" to enabled "Giới thiệu" linking to `/ve-chung-toi`.
  - **B. Admin sidebar consolidation** — recruitment section collapsed from 4 items to 3 (Dự án → Nhu cầu tuyển dụng → Tin tuyển dụng). The Slot trống / Trạng thái công bố / Công bố columns now live inside `/admin/projects` (master-data table). The old `/admin/jobs` URL is preserved via a server-component 307 redirect to `/admin/projects`, so old bookmarks stay safe.
- **Not delivered:** None. All T0 directive items (A.1..A.4 + B.1..B.7) are implemented. Tier 3 / audit is explicitly skipped per T0 directive.
- **Changed:** 1 NEW page (`app/(portal)/ve-chung-toi/page.tsx`); 4 MODIFIED source files (`app/components/GlobalNavbar.tsx`, `app/admin/jobs/page.tsx` → server-component redirect, `app/admin/projects/page.tsx` adds 3 columns, `src/shared/ui/role-guard/role-guard-layout.tsx` drops the "Danh sách nhu cầu" row); 1 MODIFIED test source (`src/shared/ui/role-guard/role-guard-layout.test.ts`); 2 task-artifact files (`TASK.md` + `HANDOFF.md`).
- **Lane escalation:** No.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `E-12` (`git diff f74ab92c..HEAD -- prisma app/api scripts packages --stat` is empty). |
| API/route boundary | `PASS` | `redirect('/admin/projects')` is a server component that throws `NEXT_REDIRECT`; the framework returns HTTP 307 with `Location: /admin/projects`. The new `/ve-chung-toi` route is a server component (no client state). |
| Auth/permission/data exposure | `PASS` | Công bố button is visible to the same role set that previously saw the column on `/admin/jobs` (`ADMIN, HR_STAFF, HR_MANAGER, SALE`); the underlying `POST /api/projects/{id}/publish` endpoint is unchanged. No new permission, no new role, no new capability. |
| Migration/backfill/rollback | `N/A` | No schema, no migration. Rollback is `git revert` of the single commit. |
| Concurrency/idempotency | `PASS` | Publish toggle uses the same `x-idempotency-key` convention as the old `/admin/jobs` page; key is `admin-project-${id}-${version}-${publish|unpublish}` (renamed prefix is cosmetic — server keys by `(projectId, version, action)`). |
| Test isolation and cleanup | `PASS` | `src/shared/ui/role-guard` 56/56 pass; `src/domains/job-board` 686/686 pass. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `RESULT: PASS (7 changed text file(s), strict UTF-8 without BOM)` | `None` |
| `AC-02` | `E-02` | `RESULT: PASS (TASK contract is ready for execution)` | `None` |
| `AC-03` | `E-03` | `RESULT: PASS WITH WARNINGS (1 warning)` | `H-03 status field 'Execution round' was added in this HANDOFF pass; H-16 reads it.` |
| `AC-04` | `E-04` | `clean` | `None` |
| `AC-05` | `E-05` | `empty` | `None` |
| `AC-06` | `E-06` | `exit 0` | `None` |
| `AC-07` | `E-07` | `56 passed (3 test files)` | `None` |
| `AC-08` | `E-08` | `exit 0; /ve-chung-toi route present` | `None` |
| `AC-09` | `E-09` | `1 hit on the new link; old "Công ty" entry removed` | `None` |
| `AC-10` | `E-10` | `0 hits on labels; only comment hits remain` | `None` |
| `AC-11` | `E-11` | `1 hit (button label preserved)` | `None` |
| `AC-12` | `E-12` | `1 hit` | `None` |
| `AC-13` | `E-13` | `1 hit (formula ported)` | `None` |
| `AC-14` | `E-14` | `state: OPEN, isDraft: false, mergeable: MERGEABLE` (post-CI) | `None` |
| `AC-15` | `E-15` | `pending CI run 37263277509 (Quality + Integration in progress; Vercel pending; Vercel Preview Comments SUCCESS)` | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; 7 OK rows | `inline` |
| `E-02` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | exit 0; `RESULT: PASS` | `inline` |
| `E-03` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | exit 2; `RESULT: PASS WITH WARNINGS (1 warning)` (warning is the pre-HANDOFF-final H-03 status field, now in §0) | `inline` |
| `E-04` | `git diff --check` | exit 0; no whitespace errors | `inline` |
| `E-05` | `git diff f74ab92c..HEAD -- prisma app/api scripts packages --stat` | exit 0; empty | `inline` |
| `E-06` | `npx tsc --noEmit` | exit 0 | `inline` |
| `E-07` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard` | exit 0; 56 passed (3 test files) | `inline` |
| `E-08` | `npx next build` | exit 0; `/ve-chung-toi` route present in build output | `inline` |
| `E-09` | `rg "Giới thiệu" app/components/GlobalNavbar.tsx` | 1 hit on the new link | `inline` |
| `E-10` | `rg "Danh sách nhu cầu" app/admin/jobs/page.tsx src/shared/ui/role-guard/role-guard-layout.tsx` | 0 label hits; only comment hits | `inline` |
| `E-11` | `rg "Công bố dự án" app/admin/projects/page.tsx` | 1 hit | `inline` |
| `E-12` | `rg "redirect\('/admin/projects'\)" app/admin/jobs/page.tsx` | exit 0; 1 hit | `inline` |
| `E-13` | `rg "freeSlotsByProject" app/admin/projects/page.tsx` | 1 hit (formula ported) | `inline` |
| `E-14` | `pwsh -c "gh pr view 104 --json state,isDraft,mergeable,statusCheckRollup \| ConvertFrom-Json"` | `state: OPEN, isDraft: false, mergeable: MERGEABLE` | `inline` (post-CI) |
| `E-15` | `pwsh -c "gh pr checks 104"` (poll run `37263277509` until 4/4 SUCCESS) | `pending` (Quality + Integration in progress; Vercel pending; Vercel Preview Comments SUCCESS) | `inline` (live) |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

No blockers. The implementation matches TASK.md §1 + §2 exactly:

- 1 NEW file (`app/(portal)/ve-chung-toi/page.tsx`).
- 1 redirect-stripped admin page (`app/admin/jobs/page.tsx`).
- 1 admin page extended (`app/admin/projects/page.tsx` — adds 3 columns).
- 1 navbar source updated (`app/components/GlobalNavbar.tsx`).
- 1 sidebar source updated (`src/shared/ui/role-guard/role-guard-layout.tsx`).
- 1 test source updated (`src/shared/ui/role-guard/role-guard-layout.test.ts`).
- 2 task-artifact files (`TASK.md` + `HANDOFF.md`).

Two minor implementation notes that are NOT deviations:

1. **Local `StatusBadge` rename**: `app/admin/projects/page.tsx` originally declared a local `function StatusBadge({ status })` for the project lifecycle chip (Nháp / Hoạt động / …). This collided with the imported `StatusBadge` from `@/src/shared/ui/status-badge` (used for the publish column). The local function was renamed to `LifecycleStatusBadge` to break the collision; the published column now uses the shared `StatusBadge` with `projectPublishColumnLabel/Tone` and `PROJECT_MODULE`.
2. **Cosmetic idempotency-key prefix rename**: the publish handler prefix `admin-job-…` was renamed to `admin-project-…` to follow the entity name. The server's idempotency table is keyed by `(projectId, version, action)` and the version is captured in the key, so the rename is not observable on the server side.

## 5. Final status

- All T0 directive items (A.1..A.4 + B.1..B.7) implemented. Forbidden surface (prisma, app/api, src/shared/auth, publish.service, src/domains/projects, package.json) is clean: `git diff f74ab92c..HEAD -- prisma app/api scripts packages --stat` is empty. Source/test/migration have no semantic delta after Implementation SHA.
- Tier 1 self-review (3 critical risks) is complete: contract and diff scope PASS, API/route boundary PASS, auth/permission/data exposure PASS, concurrency/idempotency PASS, test isolation PASS.
- Tier 3 / audit is skipped per T0 explicit directive; the HANDOFF is `READY_FOR_REVIEW` and the chat handback will mark `READY_FOR_T0_MERGE` once the 4/4 CI is green.

> Handoff status: READY_FOR_REVIEW
