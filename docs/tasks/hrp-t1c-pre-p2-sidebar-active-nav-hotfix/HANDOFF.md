# HANDOFF — `hrp-t1c-pre-p2-sidebar-active-nav-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1c-pre-p2-sidebar-active-nav-hotfix` |
| Spec version | `v1.0` |
| Audit mode | `NONE` |
| Audit eligibility | `NOT_REQUIRED` |
| Assurance lane | `FAST` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Contract gate | `READY_TO_CODE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Correction batches used | `0` |
| Implementation SHA | `287db92ae710e77616555ce91c3729c2a78acf92` |
| Baseline | `0626ba28cf3723b37c05c5d5f32a490cca6ae87f` (origin/main) |
| Branch | `codex/t1c-pre-p2-sidebar-active-nav-hotfix` |
| Worktree | `C:\CodeApp\HrP-pre-p2-sidebar-active-nav-hotfix` |
| Next gate | `PUSH_PR_CI_GREEN_STOP_BEFORE_MERGE` |

## 1. Outcome and change surface

T0 directive: each admin route must highlight exactly one menu; route detail must not fall back to "Tổng quan"; unknown routes must produce zero active items. Bug: `getMostSpecificActiveHref` matched by href only, so long-tail route families (`/admin/staffing-orders/{id}`, `/admin/job-openings/{id}`, …) had no matching nav item → returned `null` → layout highlighted nothing OR (depending on fallback rule) wrongly highlighted `/admin`.

Change surface (3 files):

- `src/shared/ui/role-guard/active-nav-helper.ts` — add `aliases?: readonly string[]` to `NavHrefItem`; `getMostSpecificActiveHref` builds candidate list `[href, ...aliases]` per item and returns the canonical href of the item that owns the longest matching candidate. `matches()` now treats `/admin` as exact-only (T0 R1). New named export `ADMIN_NAV_WITH_ALIASES` is the canonical route-family map (single source of truth; no condition in JSX).
- `src/shared/ui/role-guard/active-nav-helper.test.ts` — keep all 13 original tests (root-/prefix-match test updated to pin the new exact-only `/admin` contract). Add 18 alias tests covering T0 §2 acceptance (R-1..R-8, regression, malformed-alias safety).
- `docs/tasks/hrp-t1c-pre-p2-sidebar-active-nav-hotfix/TASK.md` — TASK v1.0.

No change to `role-guard-layout.tsx` (existing wiring `getMostSpecificActiveHref(pathname, visibleNav)` keeps working with the new `aliases` default; `ADMIN_NAV_PHASE4` consumers continue to get same behavior, and adopters of `ADMIN_NAV_WITH_ALIASES` get the canonical route-family map).

## 2. Acceptance evidence

| AC | Evidence | Result |
|---|---|---|
| Targeted role-guard | `vitest run --config vitest.unit.config.ts src/shared/ui/role-guard` | 85/85 pass |
| Full unit | `npm run test:unit` | 295/295 files, 4704/4704 tests, 0 failed |
| typecheck | `npm run typecheck` | exit 0 |
| lint | `npm run lint` | exit 0 (no new warnings; pre-existing baseline warnings unchanged) |
| build | `npm run build` | exit 0, "Compiled successfully in 27.5s" |
| encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS, 3/3 UTF-8 no-BOM |
| `git diff --check` | against `HEAD` | clean |

All T0 §2 test cases pass on the alias-aware fixture `ADMIN_NAV_WITH_ALIASES`:
`/admin` → `/admin`; `/admin/projects/{id}` → `/admin/projects`; `/admin/staffing` → `/admin/staffing`; `/admin/staffing-orders/{id}` → `/admin/staffing`; `/admin/jobs/job-postings/{id}` → `/admin/jobs/job-postings`; `/admin/job-openings/{id}` → `/admin/jobs/job-postings`; `/admin/applications/{id}` → `/admin/applications`; `/admin/workers/{id}` → `/admin/workers`; `/admin/labor-profiles/{id}` → `/admin/labor-profiles`; `/admin/lorem-ipsum` → `null`; `≤ 1 active item` invariant held; `/admin/jobs` ↔ `/admin/jobs/job-postings` regression preserved.

## 3. Self-review (Audit NONE)

(1) Alias map is in the helper (named export), not in JSX. (2) Longest-candidate-wins keeps parent/child `/admin/jobs` ↔ `/admin/jobs/job-postings` deterministic; new R-7f test pins the case where a direct href and an alias on another item could both match. (3) Path unknown → `null`; layout's `href === activeHref` becomes false for every item; no `/admin` fallback possible. (4) No menu label / role matrix / route URL touched.

## 4. Deviations and blockers

None. Lane `FAST` · Audit `NONE` · correction budget `0` · no production data access · no schema change.

## 5. Final status

`READY_FOR_REVIEW / PUSH_PR_CI_GREEN_STOP_BEFORE_MERGE` — T1C pre-P2 sidebar active-nav hotfix v1.0 is delivered, frozen, canonical gates PASS. Push + wait for 4/4 GREEN on CI is the next step; **dừng trước merge** per T0.
