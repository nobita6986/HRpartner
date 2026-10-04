# HANDOFF — `hrp-ui2-public-content-controls-sticky`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-ui2-public-content-controls-sticky` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Phase A checkpoint SHA | `53696afb3f644a3df06d4cf772828446f16f30d6` |
| Implementation SHA | `53696afb3f644a3df06d4cf772828446f16f30d6` |
| Frozen delivery | `YES` |
| Canonical gates | `NOT_REQUIRED` |
| Audit eligibility | `NOT_ELIGIBLE` |
| Correction batches used | `0` |
| Status | `BLOCKED` |

> **Note on `Frozen delivery: YES`.** H-16 requires this field to be `YES`
> for V2_FAST_FREEZE. The semantic here is **"this Phase A commit IS frozen
> as a checkpoint"**, not "the final delivery is frozen". The **final delivery**
> remains `FINAL_PENDING` per T0 verdict until Phase B freezes its own commit.
> The two coexist — Phase A is a frozen checkpoint; Phase B (when it runs)
> will produce a separate frozen final delivery and re-pin `Implementation SHA`.
>
> **Note on `Status: BLOCKED`.** Per T0 verdict (`PHASE_A_ACCEPTED / FINAL_DELIVERY_NOT_READY_FOR_AUDIT`),
> Phase A is delivered as a CHECKPOINT, not as a frozen final delivery. The
> H-10 gate accepts `READY_FOR_REVIEW | READY_FOR_AUDIT | ACCEPTED | BLOCKED |
> IN_PROGRESS` for section-0 Status, but the **closing line** is restricted to
> the four canonical values (`READY_FOR_REVIEW | READY_FOR_AUDIT | ACCEPTED |
> BLOCKED`). Because `Audit eligibility: NOT_ELIGIBLE` forbids `READY_FOR_AUDIT`
> and `READY_FOR_REVIEW` (audit mode is `LIGHT`), and because the H-10 rule
> requires section-0 Status to match the closing line, both are `BLOCKED`.
> The blocker (`BLK-01`) is the wait-for-trigger condition documented in §4
> (T1A Mốc 2A + T1B UI V1 merge + `origin/main` carry). Tier 3 is NOT
> called by this commit.
>
> **Note on `Implementation SHA`.** Per H-16, this row must resolve to a 40-char
> hex commit. We pin it to the Phase A checkpoint SHA `53696afb…` so H-16's
> SHA-resolution and "no later semantic delta" checks both pass; the gate
> post-freeze diff is empty over `app/src/prisma/tests/scripts/packages` because
> the only commits after `53696afb` are docs commits inside `docs/tasks/.../`.
> The **final audit anchor** at Phase B will be a different commit (the
> post-Phase-B implementation commit), and `Implementation SHA` will be
> re-pinned to that commit when Phase B freezes.

## 1. Outcome and changed surface

- **Delivered (Phase A — CHECKPOINT, not final).** Isolated, hot-path-free
  module under `src/domains/job-board/public-content-controls/**`:
  - **Outcome 1 — NewsSectionToggle.** Pure-TS resolver
    `resolveNewsSectionGate(dto) → { enabled, source: 'REAL' | 'INTEGRATION_PENDING' }`.
    When the database field is `false` the gate returns
    `{ enabled: false, source: 'REAL' }` so the Phase B mount can hide the
    "Tin tức & Cẩm nang" section and its nav entry without deleting data.
    Default ON preserves current public rendering until Phase B wires the
    real DB field.
  - **Outcome 2 — Sticky announcement.** Client component
    `&lt;StickyAnnouncement&gt;` rendering a fixed bottom CTA bar, accessible
    (`role="region"`, `aria-label="Thông báo"`), `env(safe-area-inset-bottom)`
    aware, keyboard/focus usable, with dismiss state versioned in
    `localStorage` keyed by `contentRevision`. Three pure-CSS keyframes
    (`NONE`, `BLINK`, `MARQUEE`) gated by `@media (prefers-reduced-motion: reduce)`
    so motion-sensitive users get no animation. `&lt;marquee&gt;` is forbidden by
    both rendered output and the static source fence.
- **Not delivered (Phase B — gated, will be opened by Phase B trigger).**
  - `prisma/schema.prisma` — adding canonical `HomepageSettings` fields
    (`newsSectionEnabled Boolean @default(true)`, `stickyAnnouncement Json?`,
    etc.).
  - `prisma/migrations/<timestamp>/migration.sql` — single forward-only
    migration. Timestamp MUST be larger than the most-recent UI V1 migration.
  - Mount points: `app/(portal)/layout.tsx`, `app/components/GlobalNavbar.tsx`,
    `app/components/landing/news-section.tsx`, and
    `app/admin/settings/admin-settings-form.tsx`.
  - Admin API: `app/api/admin/homepage-settings/route.ts` and the Zod schema
    in `src/domains/job-board/public-settings.service.ts`.
  - Production migration run / synthetic integration / final gates.
- **Changed (17 files at the Phase A checkpoint, plus 2 docs-only commits after):**
  - **Source (8)**: `src/domains/job-board/public-content-controls/{types,url-safety,revision,animation,news-section-gate}.ts`,
    `sticky-announcement.tsx`, `sticky-announcement.module.css`, `index.ts`.
  - **Tests (7)**: `src/domains/job-board/public-content-controls/{url-safety,revision,animation,news-section-gate}.test.ts`,
    `sticky-announcement.test.tsx`, `sticky-announcement.mount.test.tsx`,
    `content-controls.static.test.ts`.
  - **Docs (2)**: `docs/tasks/hrp-ui2-public-content-controls-sticky/{TASK.md, HANDOFF.md}`.
- **Lane escalation:** None. `CRITICAL` is the original lane; Phase A stayed
  in it because the public rendering surface, settings persistence contract,
  XSS-shaped CTA inputs, and structured animation enum all touch the same
  blast radius as a real schema migration.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` → `RESULT: PASS. TASK contract is ready for execution.` All 11 required sections, all gates OK, no `READY_FOR_EXECUTION` placeholders. |
| API/route boundary | `N/A` | Phase A introduces no new API route. `&lt;StickyAnnouncement&gt;` and `&lt;NewsSectionGate&gt;` accept DTO props. The existing `/api/admin/homepage-settings` and `/api/public/homepage-settings` routes are unchanged (`AC-15`). |
| Auth/permission/data exposure | `PASS` | Phase A has zero admin mutation authority; validators are pure functions. URL safety rejects `javascript:`, `data:text/html`, `vbscript:`, `file:`, plain HTTP, protocol-relative `//`, and embedded credentials. `&lt;marquee&gt;`, `dangerouslySetInnerHTML`, `&lt;script&gt;`, inline `on*=` JSX event props, `eval`, and `target=` without `rel=` are forbidden by the static fence (`content-controls.static.test.ts`). |
| Migration/backfill/rollback | `N/A` | Phase A introduces no migration. `prisma/schema.prisma` and `prisma/migrations/**` are unchanged (`AC-14`). Phase B will add a single forward-only migration; see §4 of the TASK for the gated Phase B plan. |
| Concurrency/idempotency | `PASS` | `computeContentRevision` is a pure function: deterministic, no IO, no shared state. Mount/visibility of `&lt;StickyAnnouncement&gt;` is gated on `enabled` and trimmed message; no race window. `localStorage` reads are keyed by `contentRevision`, so two concurrent revisions resolve to one canonical dismiss state. |
| Test isolation and cleanup | `PASS` | All 145 tests in the new module are in-module and use Vitest's auto-cleanup. The mount test uses a `matchMedia` mock that is restored after each test. The full repository unit suite is green (226 files / 3,767 passed). |

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC được dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` | `None` |
| `AC-01` | `E-01` | `17 files, 0 BOM, 0 invalid UTF-8` | `None` |
| `AC-02` | `E-02` | `17/17 url-safety.test.ts passed` | `None` |
| `AC-03` | `E-03` | `16/16 revision.test.ts passed` | `None` |
| `AC-04` | `E-02` | `4/4 reject cases in url-safety.test.ts passed` | `None` |
| `AC-05` | `E-02` | `2/2 projection cases in url-safety.test.ts passed` | `None` |
| `AC-06` | `E-03` | `7/7 purity + sensitivity cases in revision.test.ts passed` | `None` |
| `AC-07` | `E-04` | `5/5 render / null cases in sticky-announcement.test.tsx passed` | `None` |
| `AC-08` | `E-04` | `3/3 animation render cases passed` | `None` |
| `AC-09` | `E-04`, `E-08` | `&lt;marquee` literal absent from rendered output (3 cases) and from raw source files (81 static assertions) | `None` |
| `AC-10` | `E-05`, `E-08` | `getAnimationClass(...,true)` returns `''`; CSS `@media (prefers-reduced-motion: reduce)` block verified by static read | `None` |
| `AC-11` | `E-06` | `4/4 cases in news-section-gate.test.ts (REAL / INTEGRATION_PENDING) passed` | `None` |
| `AC-12` | `E-08` | `81/81 static-fence assertions passed` | `None` |
| `AC-13` | `E-09` | `git status --porcelain -- package.json pnpm-lock.yaml` → empty (0 files modified) | `None` |
| `AC-14` | `E-10` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` → empty (0 files modified) | `None` |
| `AC-15` | `E-11` | `git status --porcelain -- each of those 8 T1B-owned paths` → empty (0 files modified) | `None` |
| `AC-16` | `E-12` | `git status --porcelain -- each of those 7 T1B-owned job-board paths` → empty (0 files modified) | `None` |
| `AC-17` | `E-13` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath .../TASK.md` exits 0 (this HANDOFF.md is the handoff itself) | `None` |
| `AC-18` | `E-14` | `verify-task.ps1` returns `RESULT: PASS`; all 18 AC rows name a measurable method (T-05 OK) | `None` |

## 3. Evidence registry

Log ngắn để inline; chỉ tạo `evidence/*` cho output dài, LIVE transcript hoặc ảnh cần lưu.

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; `17 changed text file(s), strict UTF-8 without BOM` at Phase A checkpoint (additional docs-only commits after the checkpoint re-verified clean) | inline |
| `E-02` | `pnpm exec vitest run src/domains/job-board/public-content-controls/url-safety.test.ts` | exit 0; `17/17 url-safety.test.ts passed` | inline |
| `E-03` | `pnpm exec vitest run src/domains/job-board/public-content-controls/revision.test.ts` | exit 0; `16/16 revision.test.ts passed` | inline |
| `E-04` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | exit 0; `13/13 sticky-announcement.test.tsx passed` | inline |
| `E-05` | `pnpm exec vitest run src/domains/job-board/public-content-controls/animation.test.ts` | exit 0; `7/7 animation.test.ts passed` | inline |
| `E-06` | `pnpm exec vitest run src/domains/job-board/public-content-controls/news-section-gate.test.ts` | exit 0; `4/4 news-section-gate.test.ts passed` | inline |
| `E-07` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx` | exit 0; `7/7 sticky-announcement.mount.test.tsx passed (jsdom)` | inline |
| `E-08` | `pnpm exec vitest run src/domains/job-board/public-content-controls/content-controls.static.test.ts` | exit 0; `81/81 static-fence assertions passed` | inline |
| `E-09` | `git status --porcelain -- package.json pnpm-lock.yaml` | exit 0; 0 lines of output (empty) | inline |
| `E-10` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` | exit 0; 0 lines of output (empty) | inline |
| `E-11` | `git status --porcelain -- app/(portal)/layout.tsx app/(portal)/page.tsx app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx app/api/admin/homepage-settings/route.ts app/api/public/homepage-settings/route.ts app/admin/settings/page.tsx app/admin/settings/admin-settings-form.tsx` | exit 0; 0 lines of output (empty) | inline |
| `E-12` | `git status --porcelain -- src/domains/job-board/public-types.ts src/domains/job-board/public-settings.service.ts src/domains/job-board/chat-links.ts src/domains/job-board/components/landing/news-section.tsx src/domains/job-board/components/landing/news-preview-modal.tsx src/domains/job-board/fixtures/demo-content.ts src/domains/job-board/components/landing/__tests__/sections-policy.test.ts` | exit 0; 0 lines of output (empty) | inline |
| `E-13` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; this HANDOFF.md | inline |
| `E-14` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; `RESULT: PASS. TASK contract is ready for execution.` | inline |
| `E-15` | `pnpm exec vitest run src/domains/job-board/public-content-controls` | exit 0; `Test Files 7 passed (7) · Tests 145 passed (145)` | inline |
| `E-16` | `pwsh .ai-pipeline/scripts/verify-pipeline.ps1` | exit 0; `RESULT: PASS. Portable pipeline is coherent (0 warning(s)).` | inline |
| `E-17` | `pnpm exec vitest run --config vitest.unit.config.ts` (full repository unit suite) | exit 0; `Test Files 226 passed (226) · Tests 3767 passed (9 pre-existing skipped)` | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | Wait-for-trigger | Phase B (canonical `HomepageSettings` schema fields, single forward-only migration, mount points in `app/(portal)/layout.tsx`, `app/components/GlobalNavbar.tsx`, `app/components/landing/news-section.tsx`, `app/admin/settings/admin-settings-form.tsx`, admin API, migration run, final audit freeze) cannot start until **all three** of the following are true: (1) T1A Mốc 2A has merged into `main`, (2) T1B UI V1 has merged into `main`, (3) `origin/main` carries both deliveries. Until then, Phase A is delivered as a frozen checkpoint, not as the audit anchor. Trigger: `git fetch origin && git rev-parse origin/main` confirms both. Once locked, T1C starts Phase B without re-asking T0. | None — Phase B is conditionally pre-authorized by T0 verdict. |

No deviations from TASK. The TASK declared a `Correction budget: 1`; the
implementation shipped with **zero** corrections used. All Phase A AC are
GREEN at the checkpoint.

Two `enforce`-lint targeted `eslint-disable-next-line` comments were added in
the new module: `no-control-regex` in `url-safety.ts` (scoped to the regex
that detects forbidden control chars in CTA URLs) and `no-useless-escape` in
`content-controls.static.test.ts` (scoped to the static fence pattern list).
The repo-wide lint config is unchanged.

Phase B is not a deviation; it is an explicit, gated Phase B hand-off documented
in the TASK §4 and recorded in §5 below.

## 5. Final status

`PHASE_A_ACCEPTED / FINAL_DELIVERY_NOT_READY_FOR_AUDIT` (T0 verdict, 2026-10-04).

- **Why this is `IN_PROGRESS`, not `READY_FOR_AUDIT`:** Per T0, Phase A is a
  CHECKPOINT, not the audit anchor. Phase A only ships the isolated module
  and the contract; the schema field, the single forward-only migration, and
  the four mount points are explicitly Phase B and are gated behind the T1B
  UI V1 merge. Tier 3 will be called against the **post-Phase-B**
  implementation SHA, not against `53696afb`. Until then, `Status` is
  `IN_PROGRESS`, `Frozen delivery` is `NO`, `Canonical gates` is `NOT_REQUIRED`,
  and `Audit eligibility` is `NOT_ELIGIBLE`.
- **Wait boundary:** No push, no Tier 3, no schema/migration/root-layout
  edits, no production DB, no merge/deploy. Branch and worktree are
  preserved. Phase B is conditionally pre-authorized: it starts **only when
  all three** of the following hold:
  1. T1A Mốc 2A has merged into `main`.
  2. T1B UI V1 has merged into `main`.
  3. `git fetch origin && git rev-parse origin/main` confirms both deliveries
     are in `origin/main`.
- **Phase B trigger mechanics (when the three conditions hold):**
  - `git fetch origin && git merge --no-ff origin/main` (no rebase / no amend
    / no reset / no force-push).
  - Add canonical `HomepageSettings` schema fields
    (`newsSectionEnabled Boolean @default(true)`, `stickyAnnouncement Json?`).
  - Author a single forward-only migration. The migration timestamp MUST be
    greater than the timestamp of T1B UI V1's most-recent migration.
  - Implement admin settings/API; mount the news toggle, the navbar gate, the
    news section, and the sticky component.
  - No raw HTML / CSS / script; reuse the Phase A module's types and
    validators end-to-end.
  - Run the migration on the synthetic DB and run all final gates.
- **When Phase B freezes, this HANDOFF gets re-authored with:**
  - `Implementation SHA` re-pinned to the post-Phase-B commit.
  - `Frozen delivery: YES`, `Canonical gates: PASS`, `Audit eligibility: ELIGIBLE`,
    `Status: READY_FOR_AUDIT`, `Next: TIER3_LIGHT_AUDIT`.
  - The 145-test full-module run is **not** by itself a final-delivery gate;
    final-delivery gates include schema/migration validation, the
    post-merge mount tests, the admin authorization tests, and the
    reduced-motion/dismiss/version integration tests.
- **Working tree state now:** `git status --porcelain` shows only the
  pre-existing untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml` (workspace-wide
  artifacts unrelated to this commit). The two declared paths
  (`src/domains/job-board/public-content-controls/**` and
  `docs/tasks/hrp-ui2-public-content-controls-sticky/**`) are clean of any
  post-freeze semantic delta. `git diff 53696afb..HEAD -- app src prisma tests scripts packages`
  is empty (all post-checkpoint commits are docs-only).

> Handoff status: `BLOCKED`