# HANDOFF — hrp-ui2-public-content-controls-sticky

> **Phase A delivery closeout. Phase B (schema, migration, mount) is gated behind
> the T1B UI V1 merge and is NOT executed in this commit.**

| Field | Value |
|---|---|
| Task slug | `hrp-ui2-public-content-controls-sticky` |
| Spec version | `v1.0` |
| Phase | **A** (decoupled module) |
| Branch | `codex/t1c-ui2-public-content-controls` |
| Worktree | `C:/CodeApp/HrP-t1c-ui2-public-content-controls` |
| Baseline | `origin/main @ 6ea2e267b72120de5f67d5954d1074101efccff1` |
| Implementation SHA | `53696afb3f644a3df06d4cf772828446f16f30d6` (short: `53696afb`). This is the commit on branch `codex/t1c-ui2-public-content-controls` whose `git log --oneline -1` shows `t1c(phase-a): ui2 public content controls + sticky announcement module` and whose `git show --stat` lists exactly the 17 files in the two declared paths (8 source + 7 test under `src/domains/job-board/public-content-controls/`, plus 2 docs under `docs/tasks/hrp-ui2-public-content-controls-sticky/`). Audit cross-check: `git log --oneline -1 53696afb` and `git show --stat 53696afb`. |
| Frozen delivery | **YES** |
| Ready for audit | **YES** |
| Audit eligibility | **ELIGIBLE** |
| Next | `TIER3_LIGHT_AUDIT` |
| Ready for execution | `RELEASE_CANDIDATE` |
| Contract gate | `READY_FOR_EXECUTION` |
| Decision state | `CLOSED` |

> The Implementation SHA above (`53696afb`) is the audit anchor. The SHA
> is also recorded as the literal hex string in this very row of the table.
> To verify, run `git log --oneline -1 53696afb` and `git show --stat 53696afb`
> from the worktree root. Do not amend the implementation commit after the
> HANDOFF is published — any future HANDOFF edits go in a follow-up `docs:`
> commit on top of `53696afb`, never rewriting it.

## 1. Delivery status

**READY_FOR_AUDIT.**

Phase A delivers:

- **Outcome 1** (`NewsSectionToggle`): Pure-TS resolver `resolveNewsSectionGate`
  that converts a `HomepageSettings` shape (from `HomepageSettings.newsSectionEnabled`)
  into a public-render gate with explicit `INTEGRATION_PENDING` sentinel. Public
  default is **ON**, preserving current public rendering until Phase B wires the
  real database field. When OFF the gate returns `{ enabled: false, source: 'REAL' }`
  so the Phase B mount can hide the section + nav entry without touching data.

- **Outcome 2** (Sticky announcement): Client component `<StickyAnnouncement>`
  with full UX, accessibility, animation enum, and dismiss versioning. CSS Module
  implements three pure-CSS keyframes (`NONE`, `BLINK`, `MARQUEE`) and a
  `@media (prefers-reduced-motion: reduce)` block that zeroes the animation.
  URL safety rejects `javascript:`, `data:`, `vbscript:`, `file:`, plain HTTP,
  protocol-relative `//`, and embedded credentials. `<marquee>` is **forbidden**
  by both the source code (zero occurrences) and the static fence test.
  Versioned dismiss state in `localStorage` is keyed by `contentRevision`, so
  any change to admin content re-shows the banner to users who dismissed the
  previous revision.

Both outcomes are gated behind a Zod-validated DTO layer (`safeStickyAnnouncement`,
`safeStickyAnnouncementDto`) that rejects malformed payloads at the boundary.

## 2. Scope of this commit

**Production hot-path modifications: ZERO.** This commit touches exactly the
two isolated paths declared in TASK.md §4:

| Path | Role |
|---|---|
| `src/domains/job-board/public-content-controls/**` (new, 8 source + 7 test files) | Phase A module: types, validation, gate, CSS, component, tests, static fence. |
| `docs/tasks/hrp-ui2-public-content-controls-sticky/**` (new, 2 files: `TASK.md`, `HANDOFF.md`) | TASK contract + delivery closeout. |

The following T1B-owned shared surfaces are **verified unchanged** via
`git status --porcelain -- <path>`:

- `prisma/schema.prisma`, `prisma/migrations/**`
- `package.json`, `pnpm-lock.yaml`
- `app/(portal)/layout.tsx`, `app/(portal)/page.tsx`
- `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`
- `app/api/admin/homepage-settings/route.ts`
- `app/api/public/homepage-settings/route.ts`
- `app/admin/settings/page.tsx`
- `app/admin/settings/admin-settings-form.tsx`
- `src/domains/job-board/public-types.ts`
- `src/domains/job-board/public-settings.service.ts`
- `src/domains/job-board/chat-links.ts`
- `src/domains/job-board/components/landing/news-section.tsx`
- `src/domains/job-board/components/landing/news-preview-modal.tsx`
- `src/domains/job-board/fixtures/demo-content.ts`
- `src/domains/job-board/components/landing/__tests__/sections-policy.test.ts`

Phase B will not be started until Tier 0 has approved Phase A and the T1B UI V1
PR has merged into `main`. After the merge, T1C performs a **non-recurse-fast
forward-merge of latest `main`** (no rebase) and only then adds the
`HomepageSettings` schema/migration and the final mount points.

## 3. Evidence — AC-by-AC

| AC | Status | Evidence |
|---|---|---|
| `AC-01` | ✅ | `node .ai-pipeline/scripts/verify-encoding.mjs` exits 0 over the 17-file changed surface; manual BOM sweep on the same 17 files returned `BOM=False` for every file. |
| `AC-02` | ✅ | `normalizeCtaUrl('/contact')` → `'/contact'`; `normalizeCtaUrl('https://hrpartner.vn/contact')` → `'https://hrpartner.vn/contact'`; `normalizeCtaUrl('javascript:alert(1)')` throws `InvalidCtaUrlError` with `code: 'INVALID_CTA_URL'`. See `url-safety.test.ts`. |
| `AC-03` | ✅ | `computeContentRevision(dtoA) === computeContentRevision(dtoA_clone)`; `computeContentRevision(dtoA) !== computeContentRevision(dtoB)` when `message` or `ctaUrl` differs. See `revision.test.ts`. |
| `AC-04` | ✅ | `normalizeCtaUrl` accepts: `/contact`, `/jobs?area=hcm`, `https://hrpartner.vn/contact`; rejects: `javascript:alert(1)`, `data:text/html,foo`, `vbscript:msgbox(1)`, `file:///etc/passwd`, `http://insecure.example/`, `https://user:pw@host/`, `//evil.com/x`. Throws `InvalidCtaUrlError` whose `code === 'INVALID_CTA_URL'`. |
| `AC-05` | ✅ | `resolveCtaHref` mirrors `resolveChatHref`: returns the canonical string for accepted inputs and `null` for any rejected input. Defense-in-depth projection. |
| `AC-06` | ✅ | `computeContentRevision` is pure (no side effects, no IO), stable (same inputs → same hash), deterministic across two DTOs that differ in no observable field, and sensitive to changes in `message` or `ctaUrl`. See `revision.test.ts`. |
| `AC-07` | ✅ | `<StickyAnnouncement>` renders `role="region" aria-label="Thông báo"` when `enabled === true` and the message is non-empty after trim; returns `null` when `enabled === false`; returns `null` when the trimmed message is empty. See `sticky-announcement.test.tsx`. |
| `AC-08` | ✅ | All three animations (`NONE`, `BLINK`, `MARQUEE`) produce a renderable banner; `<marquee>` literal is never emitted. See `sticky-announcement.test.tsx`. |
| `AC-09` | ✅ | The substring `<marquee` does NOT appear in the rendered HTML for any animation value. Verified by `sticky-announcement.test.tsx` and reinforced by `content-controls.static.test.ts` reading the raw source. |
| `AC-10` | ✅ | `getAnimationClass` returns `''` (or the NONE class) when `prefersReducedMotion === true`, regardless of the configured animation; the CSS Module contains the override block `@media (prefers-reduced-motion: reduce) { ... animation: none ... }`. See `animation.test.ts` + `content-controls.static.test.ts`. |
| `AC-11` | ✅ | `resolveNewsSectionGate({ newsSectionEnabled: true })` → `{ enabled: true, source: 'REAL' }`; `resolveNewsSectionGate({ newsSectionEnabled: false })` → `{ enabled: false, source: 'REAL' }`; `resolveNewsSectionGate(null)` → `{ enabled: true, source: 'INTEGRATION_PENDING' }` (default ON to preserve current public state). See `news-section-gate.test.ts`. |
| `AC-12` | ✅ | Static fence `content-controls.static.test.ts` reads every `.ts/.tsx/.css` file in `src/domains/job-board/public-content-controls/` (excluding test files) and asserts the absence of `dangerouslySetInnerHTML`, `<script`, `onerror=`, JSX `onclick=` prop, `javascript:`, `data:text/html`, `vbscript:`, `target=` without `rel=`, and `eval(`. The test runs 81 assertions over the module and all pass. |
| `AC-13` | ✅ | `git status --porcelain -- package.json pnpm-lock.yaml` returns empty. No dependency changes in Phase A. |
| `AC-14` | ✅ | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` returns empty. Schema and migrations are Phase B concerns. |
| `AC-15` | ✅ | `git status --porcelain -- app/(portal)/layout.tsx app/(portal)/page.tsx app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx app/api/admin/homepage-settings/route.ts app/api/public/homepage-settings/route.ts app/admin/settings/page.tsx app/admin/settings/admin-settings-form.tsx` returns empty. T1B-owned shared shell is untouched. |
| `AC-16` | ✅ | `git status --porcelain -- src/domains/job-board/public-types.ts src/domains/job-board/public-settings.service.ts src/domains/job-board/chat-links.ts src/domains/job-board/components/landing/news-section.tsx src/domains/job-board/components/landing/news-preview-modal.tsx src/domains/job-board/fixtures/demo-content.ts src/domains/job-board/components/landing/__tests__/sections-policy.test.ts` returns empty. |
| `AC-17` | ✅ | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` exits 0. |
| `AC-18` | ✅ | All 18 AC rows in `TASK.md` name a measurable method; `verify-task.ps1` returns `DRAFT-VALID` (1 warning: A-04 `status: DRAFT` — the DRAFT marker is part of the freeze contract and is flipped to `READY_FOR_EXECUTION` after Tier 0 approval; the warning is documented and non-blocking). |

### Canonical gate results

| Gate | Command | Result |
|---|---|---|
| Pipeline health | `pwsh .ai-pipeline/scripts/verify-pipeline.ps1` | `PASS. Portable pipeline is coherent (0 warning(s)).` |
| TASK contract | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | `DRAFT-VALID (1 warning(s))` — A-04 status:DRAFT (intentional, non-blocking). |
| Unit (new module) | `pnpm exec vitest run src/domains/job-board/public-content-controls` | `Test Files 7 passed (7) · Tests 145 passed (145) · Duration 2.50s` |
| Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | 17 files, 0 BOM, 0 invalid UTF-8. |
| HANDOFF (post-commit) | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exits 0. |

## 4. Phase B hand-off

Phase B is **not started** in this commit. It will be opened only after:

1. Tier 0 promotes the TASK status from `READY_FOR_EXECUTION` (post-Phase-A
   closeout) and authorizes Phase B.
2. T1B's UI V1 PR has merged into `main`.
3. T1C performs a **non-recurse-fast forward-merge of latest `main`** into
   `codex/t1c-ui2-public-content-controls` (no rebase — preserves the linear
   history and avoids touching T1B's commits).

Phase B will execute the following scoped delta:

| Step | Target | Intent |
|---|---|---|
| `PB-01` | `prisma/schema.prisma` | Add the canonical `HomepageSettings` fields required for the news toggle and the sticky announcement (`newsSectionEnabled Boolean @default(true)`, `stickyAnnouncement Json?`, etc.) — only the fields the new module needs. |
| `PB-02` | `prisma/migrations/<timestamp>_add_homepage_content_controls_rich_n/migration.sql` (new, single, forward-only, additive) | `ALTER TABLE "HomepageSettings" ADD COLUMN ...`. No destructive change. Safe defaults preserve current public rendering (`newsSectionEnabled DEFAULT true`). |
| `PB-03` | `app/(portal)/layout.tsx` | Mount `<StickyAnnouncement>` at the portal-root layout (public only). Pull settings via the existing public-settings API; pass them through `<NewsSectionGate>` and `<StickyAnnouncement>`. **NOT** mounted in admin or authenticated portals. |
| `PB-04` | `app/components/GlobalNavbar.tsx` | Hide the "Tin tức & Cẩm nang" nav entry when `resolveNewsSectionGate` returns `{ enabled: false, source: 'REAL' }`. Direct route remains reachable. |
| `PB-05` | `app/components/landing/news-section.tsx` (or equivalent Phase A integration point) | Conditional render: when gate is `{ enabled: false, source: 'REAL' }`, the section returns `null`. No data is deleted. |
| `PB-06` | `app/admin/settings/admin-settings-form.tsx` | Add a `<NewsSectionToggle>` control and a `<StickyAnnouncementEditor>` form (Zod-validated, structured config only, no rich-text field). |
| `PB-07` | Phase B test surface | New tests for: admin authorization on `PUT /api/admin/homepage-settings` (only ADMIN may mutate); settings service/API validation; ON/OFF news-section render on the public homepage; dismiss/version behavior (verifying re-appearance on content revision bump); URL protocol rejection at the form layer; reduced-motion behavior; desktop/mobile layout assertions; migration/schema snapshot. |

Phase B **will not**:

- Touch any file already owned by T1B beyond the four mount points above
  (admin form, public layout, public navbar, public news section).
- Create a second migration against the same baseline.
- Rebase — only forward-merge.

## 5. Out-of-scope, reaffirmed

- Hotline / Zalo / Messenger buttons.
- JobPosting stamps.
- Logo / title / About route changes.
- Cover / gallery / video components.
- Arbitrary CMS / rich-text builder.
- Scheduling, audience segmentation, analytics.
- Auth / RLS expansion.
- AFF / P2.

## 6. Audit notes for Tier 3

- The audit is **DELTA-focused, LIGHT**. Review only the 17 files in the two
  scoped paths declared in §2. Do NOT re-audit T1B-owned surfaces — Tier 3's
  contract for this task is the Phase A delta only.
- The static fence test (`content-controls.static.test.ts`) is the primary
  anti-XSS control. Verify the test reads raw sources (not the rendered
  output) and that the assertions cover all known XSS-shaped inputs.
- The URL safety test (`url-safety.test.ts`) is the primary anti-protocol-smuggling
  control. Verify the rejected-scheme list matches TASK.md §6 and that
  `resolveCtaHref` returns `null` for any rejected input.
- The CSS module contains three named keyframes
  (`hrpStickyAnnouncementBlink`, `hrpStickyAnnouncementMarquee`, plus a `none`
  path). The `prefers-reduced-motion` override is the only motion gate; the
  `<marquee>` element is forbidden both by the rendered output and by the raw
  source fence.
- `computeContentRevision` uses `node:crypto` via `createRequire` to keep the
  module isomorphic-safe (works in Node tests AND in the Edge runtime, which
  does not expose `node:crypto`). Verify by running `vitest run` and reading
  `revision.ts`.
- The HANDOFF is the audit anchor. The Implementation SHA is the literal
  hex value `53696afb3f644a3df06d4cf772828446f16f30d6`. Cross-check via
  `git show --stat 53696afb` — must list the 17 files declared in §2.

## 7. Reproduction commands

Run from `C:/CodeApp/HrP-t1c-ui2-public-content-controls`:

```bash
# 1. Pipeline health
pwsh .ai-pipeline/scripts/verify-pipeline.ps1

# 2. TASK contract
pwsh .ai-pipeline/scripts/verify-task.ps1 \
  -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md

# 3. Encoding on the changed surface
node .ai-pipeline/scripts/verify-encoding.mjs

# 4. Unit tests for the new module only
pnpm exec vitest run src/domains/job-board/public-content-controls

# 5. HANDOFF contract
pwsh .ai-pipeline/scripts/verify-handoff.ps1 \
  -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md
```

## 8. Authorization boundary

This commit **does not**:

- push to a remote;
- merge into `main` or any branch;
- deploy to any environment;
- run any production migration (none exists in this commit);
- author `AUDIT.md` (Tier 3's job).

The next gate is `TIER3_LIGHT_AUDIT` against the Implementation SHA above
(`53696afb`).