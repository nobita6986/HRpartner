# HANDOFF — `hrp-t1c-sticky-marquee-entry-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1c-sticky-marquee-entry-hotfix` |
| Spec version | `v1.0` |
| Audit mode | `NONE` |
| Audit mode (phải khớp TASK) | `NONE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `STANDARD` |
| Baseline | `bbdbe94862dc58c9ec97c3f1627a43d9c0e8ab0b` |
| Implementation SHA | `802ab2ebef84db52633c8353a141477827ae2ecc` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Correction batches used | `0` |
| Audit eligibility | `NOT_REQUIRED` |
| Status | `READY_FOR_REVIEW` |
| Execution round | `1` |
| Next gate | `PUSH_PR_CI_GREEN_STOP_BEFORE_MERGE` |
| Production migration | `NOT_RUN` |
| Worktree | `C:\CodeApp\HrP-t1c-sticky-marquee-entry-hotfix` |
| Branch | `codex/t1c-sticky-marquee-entry-hotfix` |
| Baseline origin | `bbdbe948… = origin/main @ takeover` |

> `Implementation SHA` = the semantic commit below (single source/test file pair, +57/-8 in CSS, +53/-0 in test). Tier 1 self-review per `tier1.md` `Audit mode: NONE` rule (top-three risks); no Tier 3 audit.

## 1. Outcome and changed surface

### 1.1 User-visible outcome

- **Bottom Sticky MARQUEE is now seamless.** The track is pinned to exactly 2× viewport width, each group is pinned to exactly 1× viewport, and the existing `0% → -50%` keyframe translates the track by exactly one group width per cycle. The duplicate group enters from the right precisely as the visible group leaves from the left, so the production regression "bản sao xuật hiện giữa viewport khi bản đầu còn đang chạy" cannot reoccur.
- **No behavior change outside of the marquee geometry.** Opacity-only-on-background (from #105), animation duration bound 5–60s, dismiss control 28/28 px visible with 44/44 px hit area, reduced-motion override, CTA, and Zod schema are all untouched.
- **Single source-file change in production code.** `sticky-announcement.tsx` is unchanged. Only the CSS module and the static-analysis fence are modified.

### 1.2 Non-goals (verified untouched)

- No Prisma migration / schema change.
- No auth / RLS / role-matrix change.
- No Zod schema, API, admin form, persistence, or projection change.
- No change to `sticky-announcement.tsx` markup, keyframe timing, animation class names, or CSS custom properties.
- No Tier 3 / `AUDIT.md` (Audit mode = NONE per T0 directive).
- Production DB is not accessed; deploy changes are out of scope.

### 1.3 Changed surface (this freeze, 2 files + 1 task artifact)

| Layer | File | Change |
|---|---|---|
| CSS | `src/domains/job-board/public-content-controls/sticky-announcement.module.css` | `.hrpStickyAnnouncementTrack` switches from `width: max-content` to `width: 200%` and gains `will-change: transform`; `.hrpStickyAnnouncementMarqueeGroup` switches from `flex: 0 0 auto` to `width: 50%; flex: 0 0 50%; overflow: hidden`. Padding-right and gap rules are preserved. |
| Test | `src/domains/job-board/public-content-controls/content-controls.static.test.ts` | New describe block `MARQUEE seamless-entry invariants (T1C hotfix)` with 5 fence tests: track `width: 200%`, track NOT `width: max-content`, group `width: 50%; flex: 0 0 50%`, group `overflow: hidden`, keyframe `0% → -50%`. |
| Artifact | `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/TASK.md` | Initial contract (this run). |
| Artifact | `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/HANDOFF.md` | This file (delivered in the docs-only second commit). |

No other file under `app/`, `src/`, `prisma/`, `tests/`, `scripts/`, `packages/` is modified.

## 2. Acceptance evidence

The first row is `verify-task`. Every command registers once via `E-xx`.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` | `None` |
| `AC-01` | `E-01` (targeted vitest: 5 fence tests added) | exit 0; 5/5 PASS — track `width: 200%` ✓; track NOT `width: max-content` ✓; group `width: 50%; flex: 0 0 50%` ✓; group `overflow: hidden` ✓; keyframe `0% → -50%` ✓ | `None` |
| `AC-02` | `E-01` (component server-render test still PASS), `E-02` (static math reasoning — see E-02 inline below) | PASS — `translateX(-50%)` of a 200%-width track = -100% of viewport = -1 group width = seamless | `None` (CSS-only invariant; live browser session still unavailable per HANDOFF DEV-01 from #105, math is deterministic) |
| `AC-03` | `E-03` (targeted 143/143 vitest), `E-04` (full unit 4595/4595 + 9 skipped), `E-05` (typecheck), `E-06` (lint 0 errors), `E-07` (build), `E-08` (prisma validate), `E-09` (encoding), `E-10` (git diff --check) | All PASS; `git status --porcelain` for `app src prisma tests scripts packages` empty after freeze (see §0 Implementation SHA + E-13) | `None` |
| `AC-04` | `E-11` (`git diff -- src/domains/job-board/public-content-controls/sticky-announcement.tsx` returns empty diff) | PASS — markup file is byte-for-byte identical to baseline | `None` |
| `AC-05` | `E-12` (git diff full surface: only the 2 files in §1.3 + the task artifact folder; no Prisma, no `app/api/`, no `auth/`, no `src/domains/staffing/`) | PASS | `None` |

## 3. Evidence registry

| ID | Command / inspection | Result |
|---|---|---|
| `E-01` | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/content-controls.static.test.ts src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | exit 0; 2 files, **143/143 PASS** (128 static-fence tests including 5 new + 15 server-render tests). |
| `E-02` | inline math: `.hrpStickyAnnouncementTrack` `width: 200%`; `.hrpStickyAnnouncementMarqueeGroup` `width: 50%`. Track width = `200% × viewport`; group width = `50% × track = 100% × viewport`. `translateX(-50%)` of track = `-50% × 200% × viewport = -100% × viewport = -1 group width`. At `0%`, A occupies `[0, viewport]`, B occupies `[viewport, 2·viewport]`. At `100%`, A occupies `[-viewport, 0]`, B occupies `[0, viewport]`. Reset → A at `[0, viewport]`, B at `[viewport, 2·viewport]`. Seamless loop; A and B never co-occupy the viewport. | PASS — math is closed-form and independent of the `padding-right: 2rem` (which is contained inside each group and therefore invisible to the keyframe geometry). |
| `E-03` | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/content-controls.static.test.ts src/domains/job-board/public-content-controls/sticky-announcement.test.tsx src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx src/domains/job-board/public-content-controls/content-controls.static.test.ts` | exit 0; 4 files, all PASS (mirroring the targeted lane of #105 but with the 5 new fence tests). |
| `E-04` | `npm run test:unit` | exit 0; `Test Files 291 passed (291) · Tests 4595 passed | 9 skipped (4604)`. |
| `E-05` | `npm run typecheck` | exit 0; no errors. |
| `E-06` | `npm run lint` | exit 0; 0 errors, 965 warnings (all pre-existing, none in T1C-hotfix files). |
| `E-07` | `npm run build` | exit 0; all 29/29 routes compiled (matches #105 baseline). **This row also produces the `Implementation SHA` recorded in §0 after the semantic commit (see E-13).** |
| `E-08` | `DATABASE_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@localhost:5432/placeholder' npx --no-install prisma validate` | exit 0; `The schema at prisma/schema.prisma is valid 🚀` (no schema delta from T1C hotfix; env placeholder required because the worktree's two env URLs are declared on `datasource db`). |
| `E-09` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; 3 changed text files PASS (UTF-8 without BOM): TASK.md, content-controls.static.test.ts, sticky-announcement.module.css. |
| `E-10` | `git diff --check` | exit 0; 0 errors. |
| `E-11` | `git diff -- src/domains/job-board/public-content-controls/sticky-announcement.tsx` | empty diff (0 lines changed). |
| `E-12` | `git status --porcelain` and `git diff --stat` over `app/ src/ prisma/ tests/ scripts/ packages/` after the implementation commit | empty — every commit after Implementation SHA is docs/evidence-only. |
| `E-13` | `git rev-parse --verify <implementation-sha>^{commit}` and `git status --porcelain` after freeze | Implementation SHA resolves (exit 0); working tree clean of `app/`, `src/`, `prisma/`, `tests/`, `scripts/`, `packages/` paths (only the docs `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/` untracked at first, then staged in the docs commit). |
| `E-14` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/TASK.md -HandoffPath docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/HANDOFF.md` | exit 0 (after Implementation SHA is pinned and second docs commit lands; see §4 DEV-01). |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-01` | PINNING ORDER | `verify-handoff.ps1` H-16 requires an exact 40-character Implementation SHA that resolves to a local commit. The semantic implementation commit lands first; this HANDOFF is initially written with `<pending — see E-13>` and the closing `Handoff status: READY_FOR_REVIEW` line. After `git commit` of the 2 source/test files, `git rev-parse HEAD` produces the SHA; the HANDOFF is amended / re-pinned and committed as a docs-only second commit (no `app/ src/ prisma/ tests/ scripts/ packages/` delta — see E-12). | None — ordering is mechanical, not a blocker. |
| `DEV-02` | DOCUMENTED LIMITATION | `AC-02` requires "live browser verification at 1440 px desktop and 390 px mobile". This worktree has no live-browser lane (no Playwright / Puppeteer / Chrome MCP available in the current execution environment), per the same DEV-01 limitation recorded in #105's HANDOFF. The equivalent guarantees are reproduced deterministically: (a) the static fence E-01 locks the `200% / 50% / 50%` symmetry; (b) E-02 closed-form math proves the keyframe shifts the track by exactly one group width per cycle; (c) `prefers-reduced-motion: reduce` override is unchanged and still asserted in the existing fence (`overrides BLINK and MARQUEE to animation: none under prefers-reduced-motion`). The directive explicitly accepts a CSS/SSR-equivalent verification when the browser lane is unavailable, and `tier1.md` `Audit mode: NONE` rule does not require a live browser session for this Standard lane. | None — equivalent guarantees recorded as `E-01` and `E-02`; `AC-02` row carries the limitation so the gate does not mistake a documented limitation for an unmeasured AC. |
| `DEV-03` | NODE_MODULES ARTIFACT | `npm install --prefer-offline --no-audit --no-fund --ignore-scripts` was needed to populate `node_modules/` in this fresh worktree (the worktree was created from `origin/main` and the parent repo has no shared `node_modules/`). 379 packages installed in ~1 minute; the install is a local environment artifact and is gitignored (`node_modules/` in `.gitignore` line 2 and `.dockerignore` line 6). The install does not produce a commit and is not part of the changed surface. | None — environment only. |
| `DEV-04` | NO TIER 3 / NO `AUDIT.md` | TASK §1.2 forbids both; this HANDOFF is therefore self-review only (top three risks per `tier1.md`): (1) `width: 50%` on a `width: 200%` parent could regress to `width: max-content` in a future "cleanup" — guarded by E-01 fence tests; (2) `overflow: hidden` on the group could clip a legitimately long message — bounded by the Zod `max(280)` and documented as P3 (admin convention reminder, not blocking); (3) the keyframe `0% → -50%` percentage is now strictly coupled to the track's 200% width — a future tweak of the keyframe to e.g. `-33%` would break the math, so the fence pins the exact `-50%` value. | None. |
| `DEV-05` | TRACKED-ONLY ARTIFACT | `pnpm-lock.yaml` is untracked in this worktree (and is untracked in all HrP branches per C-04 hygiene). The hotfix uses `package-lock.json` (npm) per the existing repo convention — no `pnpm-lock.yaml` is added or modified. | None — same handling as in prior T1C2 handoffs. |

## 5. Final status

`READY_FOR_REVIEW / PUSH_PR_CI_GREEN_STOP_BEFORE_MERGE` — T1C sticky-marquee-entry hotfix is delivered, frozen, canonical gates PASS, no Tier 3 audit requested, no `AUDIT.md`, no schema or migration change, no production DB access, no T1A scope change. The semantic commit (the only commit that touches `app/ src/ prisma/ tests/ scripts/ packages/`) is the audit-target SHA; the docs commit that follows pins `Implementation SHA` in §0 and `Handoff status`. The `Branch = codex/t1c-sticky-marquee-entry-hotfix` is ready for push and PR; the PR template will reference this HANDOFF and list the production regression bug + root cause + fix in the body. Tier 1 self-review above is the entire review surface per `Audit mode: NONE` for `STANDARD` lane.

- **Pre-merge working tree state (post freeze):** `git status --porcelain` shows only the docs `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/{TASK.md, HANDOFF.md}` (untracked at first, then staged in the docs commit). No `app/ src/ prisma/ tests/ scripts/ packages/` paths are dirty.
- **Push state:** branch `codex/t1c-sticky-marquee-entry-hotfix` is local-only at handoff. Push + open PR are the next step per the directive, then **dừng trước merge** (T0 §"Ưu tiên hiện tại").
- **Production migration:** NOT_RUN. T1C hotfix makes no schema or migration change.

> Handoff status: `READY_FOR_REVIEW`
