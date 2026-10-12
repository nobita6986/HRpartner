# HANDOFF — `hrp-t2-public-paging-tone-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t2-public-paging-tone-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `ffef0c4628fccd383cb7148349f53e771e3a8d9d` |
| Implementation SHA | `9639171d89037e13e5f80d4db277fd4d0c08fe1b` |
| Branch | `codex/t2-public-paging-tone-hotfix` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Correction batches used | `0` |
| Audit eligibility | `NOT_REQUIRED` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

Fixed the public `/viec-lam` page-2 regression and applied the three requested public UI tone/size adjustments. Root cause: `cleanOffset` rounded using fixed `PAGE_SIZE = 20`, while the page links and database query use `HomepageSettings.listingPageSize` (default 12, bounded 6–50); an offset of 12 was therefore normalized back to 0. The parser now accepts the runtime page size, and both page rendering and metadata pass the same cached setting.

Changed files in implementation commit:

- `src/domains/job-board/public-listing.params.ts` — runtime page-size offset normalization; retains default 20 for existing callers.
- `app/(jobs)/viec-lam/page.tsx` — loads/caches page size before parsing in both page render and `generateMetadata`; makes the Apply button use the title’s dark brand tone by default and a brand-orange hover.
- `src/domains/job-board/components/landing/hero.tsx` — reduces the hero gradient from three stops to two HRP brand stops.
- `app/components/GlobalNavbar.tsx` — reduces Signup button height and horizontal padding on desktop/mobile without changing its font size or label.
- `app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts` — regression and URL/filter round-trip coverage.
- `src/domains/job-board/public-listing.static.test.ts` — updates source fences for the dynamic page-size parser and cached settings lookup.
- `docs/tasks/hrp-t2-public-paging-tone-hotfix/TASK.md` — frozen contract.

No schema, migration, API, service-layer, or dependency changes.

## 2. Acceptance evidence

| AC | Evidence | Result / limitation |
|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t2-public-paging-tone-hotfix/TASK.md` | `RESULT: PASS` |
| AC-01 | E-02 | PASS — page-size 12 preserves offset 12 |
| AC-02 | E-02 | PASS — page 2 URL round-trips through parser |
| AC-03 | E-02 | PASS — q/salary/area retained on page 3 |
| AC-04 | E-02 | Automated direct-URL parse passes; browser new-tab check not performed |
| AC-05 | E-03 | PASS — apply CTA uses `bg-primary-dark`, hover uses brand `bg-primary` |
| AC-06 | E-03 | PASS — assertion checks CTA classes; no black/gray class introduced |
| AC-07 | E-04 | PASS — Hero now has the two-tone HRP gradient |
| AC-08 | `visual/contrast check deferred` | Not visually reviewed in a browser; colors use existing tokens, live appearance awaits Owner preview review |
| AC-09 | E-05 | PASS — desktop Signup uses `px-3 min-h-9` |
| AC-10 | E-05 | PASS — mobile Signup uses `px-3 min-h-9` |
| AC-11 | E-05 | PASS — `font-semibold` and “Đăng ký” retained |
| AC-12 | E-06, E-07, E-08 | PASS — all listed local gates exited 0; lint reported 1,008 warnings and 0 errors |
| AC-13 | E-02 | PASS — 16 pagination integration tests |
| AC-14 | E-02 | PASS — 56 existing parser/static tests |

## 3. Evidence registry

| ID | Command / artifact | Result |
|---|---|---|
| E-02 | `pnpm exec vitest run --config vitest.unit.config.ts 'app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts' src/domains/job-board/public-listing.static.test.ts src/domains/job-board/public-listing.params.test.ts` | PASS — 3 files, 72 tests |
| E-03 | `rg -n 'bg-primary-dark.*hover:bg-primary' 'app/(jobs)/viec-lam/page.tsx'; rg -n -C 3 'Ứng tuyển' 'app/(jobs)/viec-lam/page.tsx'` | PASS — CTA defaults to dark primary and hovers to primary |
| E-04 | `rg -n 'from-primary-container to-primary-fixed' src/domains/job-board/components/landing/hero.tsx` | PASS — one matching two-tone gradient |
| E-05 | `rg -n 'px-3 min-h-9|font-semibold|Đăng ký' app/components/GlobalNavbar.tsx` | PASS — both desktop/mobile size classes and label/weight present |
| E-06 | `pnpm test:unit` | PASS — 327 files, 5,190 passed, 9 skipped, 0 failed |
| E-07 | `pnpm typecheck; pnpm lint` | PASS — both exit 0; lint has 1,008 warnings, 0 errors |
| E-08 | `pnpm build; node .ai-pipeline/scripts/verify-encoding.mjs; git diff --check` | PASS — build succeeded; encoding passed 8 files; whitespace clean |

## 3. Evidence registry

| Evidence | Command / artifact | Measured result |
|---|---|---|
| Contract gate | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t2-public-paging-tone-hotfix/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` |
| Targeted tests | `pnpm exec vitest run --config vitest.unit.config.ts 'app/(jobs)/viec-lam/__tests__/pagination-integration.test.ts' src/domains/job-board/public-listing.static.test.ts src/domains/job-board/public-listing.params.test.ts` | 3 files, 72 tests passed |
| Full unit suite | `pnpm test:unit` | 327 files passed; 5,190 passed; 9 skipped; 0 failed |
| Typecheck | `pnpm typecheck` | Exit 0 |
| Lint | `pnpm lint` | Exit 0; 1,008 warnings, 0 errors (outside changed hotfix files) |
| Production build | `pnpm build` | PASS; Next build completed with existing dependency/CSS warnings |
| Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS — 8 changed text files, UTF-8 no-BOM |
| Whitespace | `git diff --check` and `git diff --cached --check` | PASS |
| Commit | `9639171d89037e13e5f80d4db277fd4d0c08fe1b` | Implementation + TASK, 7 files; no unrelated helper staged |

## 4. Deviations and blockers

- Live browser interaction and visual review were not performed. Pagination has automated URL/parser coverage; Owner should review the PR preview for the visual tone and responsive button sizing.
- Full unit output includes existing warning/error-path logs; suite completed green.
- `find-placeholders.ps1` was present as an untracked root-level file before packaging. It has been preserved and excluded from the commit; the worktree is therefore not fully clean.
- No merge, production deployment, or VPS action was performed.

## 5. Final status

Implementation and contract are frozen at the SHA in section 0. Push and PR creation remain the next handoff step; stop before merge/deploy and wait for Owner review. The untracked `find-placeholders.ps1` remains untouched.

Handoff status: READY_FOR_REVIEW
