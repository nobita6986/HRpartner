# TASK — `hrp-t1a-introduce-hrp-and-menu-cleanup`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1a-introduce-hrp-and-menu-cleanup` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | UI copy, route reuse, and admin sidebar consolidation; no public contract expansion, no auth/RLS/lifecycle change. T0 directive explicitly says "Không gọi Tier 3/AUDIT". |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `f74ab92cb0e79d5b7ebaa750cf5f4d5a9b94b22b` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/components/GlobalNavbar.tsx`, `app/(portal)/ve-chung-toi/**`, `app/admin/jobs/page.tsx`, `app/admin/projects/page.tsx`, `src/shared/ui/role-guard/role-guard-layout.tsx`, `src/shared/ui/role-guard/role-guard-layout.test.ts` |
| Forbidden paths | `prisma/**`, `app/api/**`, `src/shared/auth/**`, `src/domains/job-board/publish.service.ts`, `src/domains/projects/**`, `app/admin/layout.tsx`, `app/(portal)/layout.tsx`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| Required gates | `pwsh .ai-pipeline/scripts/verify-task.ps1`, `pwsh .ai-pipeline/scripts/verify-handoff.ps1`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `npx tsc --noEmit`, `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard`, `npx next build` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `READY_FOR_REVIEW` |

> Lane và audit là hai quyết định riêng. FAST mặc định NONE; STANDARD mặc định NONE; CRITICAL mặc định LIGHT. CRITICAL + NONE phải ghi lý do và người chấp nhận rủi ro.

> Chỉ chuyển `READY_FOR_EXECUTION` khi `Contract gate = READY_TO_CODE`, `Decision state = CLOSED`, environment đã `READY/NOT_REQUIRED`, baseline và file ownership đã pin. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- **A. Public "Giới thiệu" page**: Navbar entry flips from disabled "Công ty" to enabled "Giới thiệu" linking to `/ve-chung-toi`. The new page carries T0-supplied copy for "HRP Việt Nam" + "Sàn Việc Làm Miền Bắc". Same portal chrome (GlobalNavbar + GlobalFooter), same max-w-[1080px] container, same palette.
- **B. Admin sidebar consolidation**: Recruitment section becomes `Dự án` → `Nhu cầu tuyển dụng` → `Tin tuyển dụng` (3 items instead of 4). The Slot trống / Trạng thái công bố / Công bố columns now live inside `/admin/projects`. Old `/admin/jobs` URL returns 307 → `/admin/projects` (bookmark-safe).

### 1.2 Non-goals

- No new public route surface beyond re-creating `/ve-chung-toi`.
- No schema, no migration, no new API endpoint, no change to publish service / slot formula / RLS / role matrix.
- No refactor of the existing `/admin/projects` master-data table beyond adding three new columns and merging the publish toggle.
- No UI2, no Admin localization Wave 1, no F6/F8/M2A/F9-B work — all of those are out of scope.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/components/GlobalNavbar.tsx:32-41` — current `navLinks` array contains `{ href: '#', label: 'Công ty', type: 'disabled' }` and a comment that `app/(portal)/ve-chung-toi/page.tsx` was deleted; Next.js returns 404 for `/ve-chung-toi` today. | Confirms the disabled state and the missing route that the new page must re-create. |
| `EV-02` | `app/admin/jobs/page.tsx:1-18` — current admin jobs page (post-replace) is a server component that calls `redirect('/admin/projects')`. The pre-replace version (at baseline `f74ab92c`) hosted the Slot trống column, the publish `StatusBadgeCell`, and the `Công bố dự án` button (calls `POST /api/projects/{id}/publish` with `x-idempotency-key`). | This is the surface that has been ported to `/admin/projects/page.tsx`; the URL `/admin/jobs` now redirects 307 → `/admin/projects`. |
| `EV-03` | `app/admin/projects/page.tsx` — current master-data table with columns Mã / Tên dự án / Trạng thái / Ngày bắt đầu / Ngày tạo / Hành động. The 3 new columns slot between "Tên dự án" and "Hành động". | Confirms the target table. |
| `EV-04` | `src/shared/ui/role-guard/role-guard-layout.tsx:128-132` — current recruitment section has 4 items including `{ href: '/admin/jobs', label: 'Danh sách nhu cầu' }`. | This is the sidebar row to remove. |
| `EV-05` | `src/shared/ui/role-guard/role-guard-layout.test.ts:60-63` — assertion `expect(source).toContain("href: '/admin/jobs'")` pins the old surface. | The test must be updated to match the new surface. |
| `EV-06` | T0 directive 2026-10-05 §A and §B — copy blocks for HRP Việt Nam and Sàn Việc Làm Miền Bắc, plus the explicit "Không gọi Tier 3/AUDIT" instruction. | Source of truth for the page copy and audit selection. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | `/ve-chung-toi` is the URL for the new public Giới thiệu page. The previously deleted route is re-created (T0 answered the round-1 AskQuestion with `ve-chung-toi`). | `CHOSEN` |
| `DEC-02` | Sidebar recruitment section becomes 3 items in the order `Dự án` → `Nhu cầu tuyển dụng` → `Tin tuyển dụng`. The "Danh sách nhu cầu" row is removed. | `CHOSEN` |
| `DEC-03` | The 3 publish-related columns move to `/admin/projects` master-data table. `/admin/jobs` is replaced with a server component that calls `redirect('/admin/projects')` (Next.js 307 default). | `CHOSEN` |
| `DEC-04` | Slot trống formula (`freeSlotsByProject` with `PUBLISHABLE_ORDER_STATUSES = {OPEN, CLOSING_SOON}`, `ORDERS_PAGE_SIZE = 50`, `ORDERS_MAX_PAGES = 10`) is byte-ported from `/admin/jobs/page.tsx` to `/admin/projects/page.tsx`. No refactor. | `CHOSEN` |
| `DEC-05` | Capability of the Công bố button is gated by the existing role list (`ADMIN`, `HR_STAFF`, `HR_MANAGER`, `SALE`) — no new permission, no new endpoint. | `CHOSEN` |
| `DEC-06` | `Audit mode: NONE` per T0 explicit directive. Tier 1 self-reviews per `tier1.md §6` (max 3 critical risks). | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `N/A` | `N/A — task does not create a generic technical capability and does not add or change a dependency or shared framework.` | `N/A` | `N/A` | `N/A` | `N/A` | UI copy + sidebar rearrangement; no new library, no new framework. |

- `ADOPT`: phải pin license, version/source, compatibility và wrapper/test boundary.
- `CUSTOM`: phải có marker `CUSTOM_BUILD_JUSTIFICATION` và evidence cụ thể.
- `N/A`: ghi lý do task không tạo capability phổ thông và không đổi dependency/shared framework.

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A` | `N/A — task does not create or change a connector, scheduler, notification worker, or multi-system/operator workflow.` | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | No workflow change. |

- `ORCHESTRATE`: phải pin platform/source, credential/authority boundary, retry/idempotency, observability/recovery và failure fallback.
- `CUSTOM`: phải có marker `CUSTOM_AUTOMATION_JUSTIFICATION` và evidence cụ thể.
- `N/A`: ghi lý do task không tạo/thay connector, scheduler, notification worker hoặc multi-system/operator workflow.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | GlobalNavbar: entry labeled "Giới thiệu" with `href: '/ve-chung-toi'`, `type: 'route'`. Replaces the disabled "Công ty" entry. Mobile + desktop both honor the change. |
| `RQ-02` | Old URL `/ve-chung-toi` (which was deleted in a commit before the baseline) is now reachable again; the new page lives at `app/(portal)/ve-chung-toi/page.tsx`. No other public URL is broken. |
| `RQ-03` | Page renders two top-level blocks: (1) "HRP Việt Nam – Kết nối doanh nghiệp và người lao động" with the four paragraphs T0 supplied; (2) "Sàn Việc Làm Miền Bắc" with the three paragraphs T0 supplied. No claim is fabricated; the copy in T0 directive is the canonical body. |
| `RQ-04` | Page uses the same public-portal chrome (GlobalNavbar + GlobalFooter) as the rest of `(portal)`; section spacing, max-w-[1080px] container, type scale match the existing portal palette. Mobile and desktop both render readably. |
| `RQ-05` | `/admin/projects/page.tsx` table gains three new columns between the existing "Tên dự án" and "Hành động" columns: `Slot trống` (number or `—`), `Trạng thái` (StatusBadge from `projectPublishColumnLabel/Tone`), `Công bố` (button that calls `POST /api/projects/{id}/publish`). |
| `RQ-06` | Sidebar removes the `Danh sách nhu cầu` (`/admin/jobs`) entry. The recruitment section order becomes: Dự án → Nhu cầu tuyển dụng → Tin tuyển dụng. |
| `RQ-07` | `/admin/staffing` keeps its label "Nhu cầu tuyển dụng" — unchanged. |
| `RQ-08` | `/admin/jobs/job-postings` keeps its label "Tin tuyển dụng" — unchanged. |
| `RQ-09` | `GET /admin/jobs` returns HTTP 307 with `Location: /admin/projects` (preserves old bookmarks). Implemented as a server component that calls `redirect('/admin/projects')`. |
| `RQ-10` | Slot trống formula in `app/admin/projects/page.tsx` is byte-identical to the one previously in `app/admin/jobs/page.tsx` (`freeSlotsByProject`, `PUBLISHABLE_ORDER_STATUSES = {OPEN, CLOSING_SOON}`, `ORDERS_PAGE_SIZE = 50`, `ORDERS_MAX_PAGES = 10`). |
| `RQ-11` | The Công bố button is gated by the same role list that previously saw the page: visible to `ADMIN`, `HR_STAFF`, `HR_MANAGER`, `SALE`. The underlying capability check (the `POST /api/projects/{id}/publish` call) is unchanged; only the front-end presence of the button reflects role. |

### 4.2 Scope boundaries

- **In:** `app/components/GlobalNavbar.tsx`; `app/(portal)/ve-chung-toi/page.tsx` (NEW); `app/admin/jobs/page.tsx` (replace body with redirect); `app/admin/projects/page.tsx` (add 3 columns); `src/shared/ui/role-guard/role-guard-layout.tsx`; `src/shared/ui/role-guard/role-guard-layout.test.ts`; `docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/{TASK.md, HANDOFF.md}`.
- **Out:** All API routes; `prisma/**`; `src/shared/auth/**`; `src/domains/job-board/publish.service.ts`; `src/domains/projects/**` (service layer); other admin sub-routes (`/admin/staffing`, `/admin/jobs/job-postings`, `/admin/projects/[id]`, `/admin/recruiter-workbench`, etc.); Admin localization Wave 1, F6, F8, M2A, UI2 work.
- **Allowed task artifacts:** `docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/**`.

### 4.3 Domain boundaries

- **Data/state:** `N/A — no DB or persistence-layer change.`
- **Permission/security:** `N/A — no new permission, no new role, no new capability. The Công bố button is visible to the same role set that previously saw the column on /admin/jobs.`
- **Interface/API:** `N/A — POST /api/projects/{id}/publish contract is unchanged. Same x-idempotency-key convention, same payload.`
- **Migration/rollback:** `N/A — no schema, no migration. Rollback is `git revert` of the single commit.`

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/(portal)/ve-chung-toi/page.tsx` (NEW) + `app/components/GlobalNavbar.tsx` (modify) | Create the public Giới thiệu page with the T0-supplied copy; flip the Navbar entry from disabled "Công ty" to enabled "Giới thiệu" pointing at `/ve-chung-toi`. | `AC-09`, `AC-12`, `AC-13`, `AC-15` (manual) | If the route renders 404 or the copy is missing a section, return to Planner. |
| `STEP-02` | `app/admin/projects/page.tsx` (extend) | Add the Slot trống / Trạng thái / Công bố columns by carrying over `freeSlotsByProject`, `StatusBadgeCell`, and `handlePublish` from `app/admin/jobs/page.tsx`. Keep the existing master-data columns intact. | `AC-11`, `AC-13` | If the publish call fails or the role gate is wider than the previous page, return to Planner. |
| `STEP-03` | `app/admin/jobs/page.tsx` (replace) | Replace the body with a server component that calls `redirect('/admin/projects')`. | `AC-12` | If the redirect does not produce 307, return to Planner. |
| `STEP-04` | `src/shared/ui/role-guard/role-guard-layout.tsx` + `role-guard-layout.test.ts` (modify) | Drop the `Danh sách nhu cầu` row; update the test to assert against the new surface. | `AC-10`, `AC-11` | If `AC-07` fails after the edit, re-investigate before commit. |
| `STEP-05` | repo | Run typecheck, the affected vitest lane, encoding check, `git diff --check`, contract gates. | `AC-01`..`AC-08` | If any gate fails, fix and re-run; do not amend/force-push. |
| `STEP-06` | repo | One forward-only commit; push; open non-draft PR; wait for 4/4 GREEN CI. | `AC-14`, `AC-15` | If CI fails, do not merge; handback BLOCKED with the failing check. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `node .ai-pipeline/scripts/verify-encoding.mjs` | `RESULT: PASS` |
| `AC-02` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | `DRAFT-VALID` minimum |
| `AC-03` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-t1a-introduce-hrp-and-menu-cleanup/TASK.md` | `PASS WITH WARNINGS` minimum |
| `AC-04` | `git status --porcelain` | clean (only the in-scope and docs/ files appear) |
| `AC-05` | `git diff f74ab92c..HEAD -- prisma app/api scripts packages --stat` | empty |
| `AC-06` | `npx tsc --noEmit` | exit 0 |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard` | exit 0, all tests pass |
| `AC-08` | `npx next build` | exit 0 |
| `AC-09` | `rg "Giới thiệu" app/components/GlobalNavbar.tsx` | 1 hit on the new link; old "Công ty" entry removed |
| `AC-10` | `rg "Danh sách nhu cầu" app/admin/jobs/page.tsx src/shared/ui/role-guard/role-guard-layout.tsx` | 0 hits |
| `AC-11` | `rg "Công bố dự án" app/admin/projects/page.tsx` | ≥ 1 hit (button label preserved) |
| `AC-12` | `rg "redirect\\('/admin/projects'\\)" app/admin/jobs/page.tsx` | 1 hit |
| `AC-13` | `rg "freeSlotsByProject" app/admin/projects/page.tsx` | 1 hit (formula ported) |
| `AC-14` | Manual check: PR opened in non-draft state with `mergeable: MERGEABLE` (verified via `gh pr view <PR> --json state,isDraft,mergeable` in the chat handback) | `gh pr view <PR> --json state,isDraft,mergeable` returns the three expected values |
| `AC-15` | Manual check: 4/4 CI SUCCESS reported in the chat handback (Quality, Integration, Vercel, Vercel Preview Comments) | `gh pr checks <PR>` shows 4 SUCCESS rows |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-09` |
| `RQ-02` | `STEP-01` | `AC-09` |
| `RQ-03` | `STEP-01` | `AC-09` |
| `RQ-04` | `STEP-01` | `AC-08` |
| `RQ-05` | `STEP-02` | `AC-11`, `AC-13` |
| `RQ-06` | `STEP-04` | `AC-10` |
| `RQ-07` | `STEP-04` | `AC-10` |
| `RQ-08` | `STEP-04` | `AC-10` |
| `RQ-09` | `STEP-03` | `AC-12` |
| `RQ-10` | `STEP-02` | `AC-13` |
| `RQ-11` | `STEP-02` | `AC-07` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | The role-guard-layout test fixture hard-pins `href: '/admin/jobs'`. After removing the sidebar row, the assertion must be updated; if forgotten, `AC-07` fails at the test stage. | Update the test in the same STEP-04 commit; rerun `AC-07` before pushing. |
| `RISK-02` | The redirect at `/admin/jobs` uses Next.js `redirect()` which throws `NEXT_REDIRECT`; if the old `redirect` import is wrong or the page is mistakenly marked `'use client'`, the page will throw at runtime. | STEP-03 is a server component (no `'use client'`); manual smoke after `next build` (AC-08). |
| `RISK-03` | T0 copy is static; if a future refactor wants to re-use this content, the copy is hard-coded in the page. | Acceptable for this task; no CMS migration in scope. |
| `RISK-04` | Adding three new columns to `/admin/projects` table changes the table's row density; on a narrow viewport the action column may wrap. | Use responsive grid helpers already present in the project (`overflow-x-auto` is already wrapping the table). |

## 8. Open Questions

- None.

Không được còn câu hỏi cần Owner quyết khi `Contract gate: READY_TO_CODE`.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF; LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-05 | Initial contract. Baseline `f74ab92c` (origin/main HEAD). Status `READY_FOR_EXECUTION`. Lane `STANDARD`. Audit `NONE`. T0 directive A (public Giới thiệu) + B (admin menu cleanup) accepted. | T0 directive 2026-10-05 §A + §B chốt outcome/boundary. |
