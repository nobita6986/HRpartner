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
| Implementation SHA | `f3e2aa16c280d15aa31342095d507d8e0c96a975` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `1` |
| Status | `READY_FOR_REVIEW` |
| Branch | `codex/t1a-introduce-hrp-and-menu-cleanup` |
| Branch HEAD | `f3e2aa16` — final semantic commit (correction 1/1 source + test changes). The follow-up docs-only commit `5f3fe56a` carries the same content for SHA pinning. Both commits are forward-only on top of `5bfeb258`. Exact final branch HEAD = `5f3fe56a` (reported in the post-commit handback). |

## 1. Outcome and changed surface

- **Correction 1/1** (T0 PR #104 forward-only, SHA `f3e2aa16`, on top of `5bfeb258`):
  - **`/admin/projects` role-aware UI** — page split into `app/admin/projects/page.tsx` (server, derives `ProjectsCapability` from `AuthContext.role` via `getServerSession()`) and `app/admin/projects/projects-table-client.tsx` (client, gates Thêm / Sửa / Công bố theo capability). Capability projection mirrors backend authority byte-exact:
    - `canView` ⇔ `VIEWER_ROLES` của `app/api/projects/route.ts` (`ADMIN, HR_MANAGER, HR_STAFF, PM, DIRECTOR` — SALE cố ý loại, `incompatibility có sẵn`).
    - `canCreate` / `canEdit` ⇔ `ADMIN_ROLES` của `POST/PUT /api/projects` (`ADMIN, PM, HR_MANAGER`).
    - `canPublish` ⇔ `PUBLISH_SCOPE_ROLES` của `app/api/projects/[id]/publish/route.ts` (`ADMIN, HR_MANAGER, SALE, DIRECTOR`).
    - Backend `prisma / app/api / src/shared/auth / publish.service` KHÔNG bị sửa — capability chỉ là projection từ role đã có.
  - **Sidebar recruitment flow reordered** — `ADMIN_NAV_PHASE4` nhóm recruitment đổi từ `Dự án / Tin tuyển dụng / Đơn ứng tuyển / Nhu cầu tuyển dụng` thành `Dự án / Nhu cầu tuyển dụng / Tin tuyển dụng / Đơn ứng tuyển`. HR_STAFF được thêm vào mục Dự án (sidebar) để khớp quyền xem `GET /api/projects` đã có — không mở rộng API.
  - **`/ve-chung-toi` nested-`<main>` fix** — root đổi từ `<main id="hrp-main" tabIndex={-1}>` sang `<div id="hrp-main" tabIndex={-1}>` vì `app/(portal)/layout.tsx` đã bọc `{children}` bằng `<main className="flex-1">`. HTML5 cấm `<main>` lồng nhau; skip-link `href="#hrp-main"` vẫn resolve. Comment Navbar "Route `app/(portal)/ve-chung-toi/page.tsx` cũng bị xoá — Next.js App Router trả 404 tự động" bị xoá vì route đã được tái tạo.
  - **Empty-state copy `/admin/projects`** — `Chưa có dự án công khai.` → `Chưa có dự án nào.` (T0 correction §B.4).

- **Round 1** (Implementation SHA `741c1874`, superseded by correction 1/1):
  - **A. Public "Giới thiệu" page** — re-created the legacy public route `/ve-chung-toi` (server component, T0-supplied copy).
  - **B. Admin sidebar consolidation** — Slot trống / Trạng thái công bố / Công bố columns ported to `/admin/projects`; `/admin/jobs` → 307 redirect to `/admin/projects`; "Danh sách nhu cầu" removed from sidebar.

### Self-review checklist

| Surface | Result | Evidence |
|---|---|---|
| Contract and diff scope | `PASS` | `E-05` (`git diff f74ab92c..f3e2aa16 -- prisma app/api scripts packages --stat` is empty). |
| API/route boundary | `PASS` | Server page gate session + derive capability; client component gates buttons. Backend authority unchanged. |
| Auth/permission/data exposure | `PASS` | Capability mirrors backend role sets byte-exact (verified by `projects-role-visibility.static.test.ts`). No new role, no new permission, no API expansion. Correction 1/1 xoá tuyên bố sai của round 1 ("Công bố visible to ADMIN, HR_STAFF, HR_MANAGER, SALE") — sau correction: Công bố chỉ cho ADMIN/HR_MANAGER; PM và HR_STAFF xem bảng nhưng không có nút Công bố; SALE hiển thị panel `incompatibility có sẵn`. |
| Migration/backfill/rollback | `N/A` | No schema, no migration. Rollback là `git revert f3e2aa16`. |
| Concurrency/idempotency | `PASS` | Publish toggle vẫn dùng `x-idempotency-key` convention; capability check là client-side gate, không can thiệp server. |
| Test isolation and cleanup | `PASS` | Targeted: `app/admin/jobs/__tests__` 15/15, `app/admin/projects/__tests__` 15/15, `src/shared/ui/role-guard` 42/42, `public-ui-premium.static.test.ts` 68/68. Full suite: 275 files / 4255 passed / 9 pre-existing skipped. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `RESULT: PASS (8 changed text file(s), strict UTF-8 without BOM)` | `None` |
| `AC-02` | `E-02` | `RESULT: PASS (TASK contract is ready for execution)` | `None` |
| `AC-03` | `E-03` | `RESULT: PASS WITH WARNINGS (1 warning)` | `None` |
| `AC-04` | `E-04` | `clean` | `None` |
| `AC-05` | `E-05` | `empty` (`git diff f74ab92c..f3e2aa16 -- prisma app/api scripts packages --stat`) | `None` |
| `AC-06` | `E-06` | `exit 0` | `None` |
| `AC-07` | `E-07` | `275 test files / 4255 passed / 9 skipped` | `None` |
| `AC-08` | `E-08` | `exit 0; /ve-chung-toi route present; /admin/projects dynamic route present` | `None` |
| `AC-09` | `E-09` | `1 hit on the new link; old "Công ty" entry removed` | `None` |
| `AC-10` | `E-10` | `0 hits on labels; only comment hits remain` | `None` |
| `AC-11` | `E-11` | `1 hit (button label preserved)` | `None` |
| `AC-12` | `E-12` | `1 hit` | `None` |
| `AC-13` | `E-13` | `1 hit (formula ported)` | `None` |
| `AC-14` | `E-14` | `state: OPEN, isDraft: false, mergeable: MERGEABLE` | `None` |
| `AC-15` | `E-15` | `4/4 GREEN (run 37264092924: Integration 1m32s, Quality 3m9s, Vercel, Vercel Preview Comments)` | `None` |
| `AC-16` (corr 1/1) | `E-16` | `15/15 pass (`projects-role-visibility.static.test.ts`); capability matrix mirrors backend authority byte-exact.` | `None` |
| `AC-17` (corr 1/1) | `E-17` | `git diff f74ab92c..f3e2aa16 -- prisma app/api scripts packages --stat` empty → no auth/RLS/API expansion. | `None` |
| `AC-18` (corr 1/1) | `E-18` | Recruitment flow = Dự án → Nhu cầu tuyển dụng → Tin tuyển dụng → Đơn ứng tuyển; HR_STAFF in Dự án roles. | `None` |
| `AC-19` (corr 1/1) | `E-19` | `/ve-chung-toi` root is `<div id="hrp-main" tabIndex={-1}>`; navbar 404 comment removed; `public-ui-premium.static.test.ts` 68/68 pass. | `None` |
| `AC-20` (corr 1/1) | `E-20` | Empty-state copy `Chưa có dự án nào.` present; old copy absent. | `None` |
| `AC-21` (corr 1/1) | `E-21` | `npx next build` exit 0; `/admin/projects` dynamic, `/ve-chung-toi` static. | `None` |

## 3. Evidence registry

| Evidence | Command | Exit / measured result |
|---|---|---|
| `E-01` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; 8 OK rows |
| `E-02` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | exit 0; `RESULT: PASS` |
| `E-03` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | exit 2; `RESULT: PASS WITH WARNINGS` |
| `E-04` | `git diff --check` | exit 0 |
| `E-05` | `git diff f74ab92c..f3e2aa16 -- prisma app/api scripts packages --stat` | exit 0; empty |
| `E-06` | `npx tsc --noEmit` | exit 0 |
| `E-07` | `npx vitest run --config vitest.unit.config.ts` | exit 0; 275 files / 4255 passed / 9 skipped |
| `E-08` | `npx next build` | exit 0; `/ve-chung-toi`, `/admin/projects` routes present |
| `E-09` | `rg "Giới thiệu" app/components/GlobalNavbar.tsx` | 1 hit on new link |
| `E-10` | `rg "Danh sách nhu cầu" app/admin/jobs/page.tsx src/shared/ui/role-guard/role-guard-layout.tsx` | 0 label hits |
| `E-11` | `rg "Công bố dự án" app/admin/projects/projects-table-client.tsx` | 1 hit |
| `E-12` | `rg "redirect\('/admin/projects'\)" app/admin/jobs/page.tsx` | exit 0; 1 hit |
| `E-13` | `rg "freeSlotsByProject" app/admin/projects/projects-table-client.tsx` | 1 hit |
| `E-14` | `pwsh -NoProfile -Command "gh pr view 104 --json state,isDraft,mergeable"` | state OPEN, isDraft false, mergeable MERGEABLE |
| `E-15` | `pwsh -NoProfile -Command "gh pr checks 104"` (poll CI run 37264092924) | 4/4 GREEN |
| `E-16` | `npx vitest run --config vitest.unit.config.ts app/admin/projects/__tests__` | exit 0; 15 passed |
| `E-17` | `git diff f74ab92c..f3e2aa16 -- prisma app/api scripts packages --stat` | exit 0; 0 rows |
| `E-18` | `rg "href: '/admin/projects'\|href: '/admin/staffing'" src/shared/ui/role-guard/role-guard-layout.tsx` | exit 0; recruitment order = Dự án → Nhu cầu tuyển dụng → Tin tuyển dụng → Đơn ứng tuyển; 1 hit confirming HR_STAFF present |
| `E-19` | `rg "id=\"hrp-main\"" app/\(portal\)/ve-chung-toi/page.tsx` | exit 0; 1 hit (root is `<div id="hrp-main" tabIndex={-1}>`) |
| `E-20` | `rg "Chưa có dự án nào\." app/admin/projects/projects-table-client.tsx` | exit 0; 1 hit on new copy; old copy absent (0 hits) |
| `E-21` | `npx next build` | exit 0; 0 errors |

## 4. Deviations and blockers

| ID | Type | Description | Decision needed |
|---|---|---|---|
| — | — | None | No |

### Implementation notes

1. **Local `StatusBadge` rename** — collision between local `StatusBadge` and `@/src/shared/ui/status-badge` resolved by renaming to `LifecycleStatusBadge`.
2. **Idempotency-key prefix rename** — `admin-job-…` → `admin-project-…`; server keys by `(projectId, version, action)` — not observable server-side.
3. **Server ↔ client split** — server page reads `AuthContext.role` via `getServerSession()`, derives 4 capability flags; client gates buttons. `handlePublish` has defense-in-depth `if (!capability.canPublish)` guard before POST. Capability sets are MIRROR of backend role sets (verified by `projects-role-visibility.static.test.ts` RQ-10 suite).
4. **SALE incompatibility** — `GET /api/projects` does not include SALE in `VIEWER_ROLES` (pre-existing backend authority). Correction 1/1 does NOT expand this; SALE sees an incompatibility panel instead of the table. Sidebar already excludes SALE from the Dự án item.

## 5. Final status

- All T0 directive items implemented + correction 1/1 applied. CI run 37264092924 was 4/4 GREEN before correction 1/1.
- Correction 1/1 source committed at `f3e2aa16`. Forbidden surface (`prisma / app/api / src/shared/auth / publish.service`) clean: `E-05` + `E-17` are empty. Capability mirrors backend authority byte-exact.
- Tier 1 self-review complete. Tier 3 / audit skipped per T0 directive.

> Handoff status: READY_FOR_REVIEW
