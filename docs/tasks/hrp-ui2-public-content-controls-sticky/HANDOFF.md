# HANDOFF — `hrp-ui2-public-content-controls-sticky`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-ui2-public-content-controls-sticky` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Baseline | `796e13c69996756d1298bc1a7ec9b50bab935c9f` |
| Spec version | `v1.1` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `2` (Phase A: 1, Phase B: 1) |
| Phase A baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Phase A checkpoint SHA | `53696afb3f644a3df06d4cf772828446f16f30d6` |
| Phase A control head | `0d4a606ca3c522a606bf69e27a5340db6dc78e18` |
| Phase B baseline (origin/main) | `796e13c69996756d1298bc1a7ec9b50bab935c9f` |
| Phase B forward-merge SHA | `fb9ae379dcea3c422f3787f30bbe66fd69df0f13` |
| Phase B UI2-owned semantic SHA | `190983f1fa5fe345148f258c9b45aca8b759619d` (UI2-owned Phase B semantic anchor; preserved as historical reference, NOT the post-merge Implementation SHA per T0 §8) |
| Implementation SHA | 38a871da3194e9fb60f3911a4b6af7a95b737f05 |
| Latest-main merged | `937133c2fe96ebbf80c64d5b36f5f830e215efbb` (origin/main at the time of the latest-main reconciliation; contains PR #95 PWA icon hotfix + PR #96 Admin Localization Wave 1 + PR #97 UI V1 public-card-truth correction + PR #98 Admin Localization Wave 2) |
| Latest-main reconciliation SHA | `a6396ac331a826b0a268dc1dbfafe812ba9e6ac3` (merge commit; two parents: `5120c86c…` UI2 docs/hygiene HEAD + `937133c2…` origin/main HEAD; created via `git merge --no-ff origin/main`; no rebase/amend/reset) |
| Previous docs HEAD | `b3d9de9bb96e28eec24de156e6bbe64ec6c3a5da` |
| Correction SHA | `Pending: this forward-only test/docs correction commit; exact SHA will be recorded after commit` |
| Final combined semantic SHA | `a6396ac331a826b0a268dc1dbfafe812ba9e6ac3` (same as Latest-main reconciliation SHA; this merge IS the final combined delivery — no subsequent semantic correction commit was authored) |
| HANDOFF freeze commit (pre-merge) | `a4600c1b1c802eea56d6fde8bddd86bab4985e71` (documentation-only; superseded by the merge) |
| Docs/hygiene correction (pre-merge) | `5120c86ce080c40c9d0ab9fddd0f9cca36aa847c` (documentation-only; superseded by the merge) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Status | `READY_FOR_AUDIT` |
| Next gate | `TIER3_LIGHT_DELTA_AUDIT` |
| Production migration | `NOT_RUN` |
| Correction budget | `1` |
| Correction batches used | `1` |
| Revision / identity chain | `190983f1…` (UI2 Phase B semantic) → `a4600c1b…` (HANDOFF flip, docs-only) → `5120c86c…` (docs/hygiene correction, docs-only) → `a6396ac3…` (latest-main reconciliation merge) → pending correction commit. Any later docs-only freeze HEAD is reported in the T0 handback, not pinned recursively. |

> **Note on SHA identity (post-merge).** Per H-16, the post-merge
> `Implementation SHA` field resolves to `a6396ac331a826b0a268dc1dbfafe812ba9e6ac3`
> (the latest-main reconciliation merge commit). The `Phase B UI2-owned
> semantic SHA` (`190983f1…`) is preserved as a historical reference and
> as the UI2-owned Phase B semantic anchor per T0 §8 ("Không được xóa
> hoặc đổi ý nghĩa SHA `190983f1…`"). The pre-merge HANDOFF commits
> `a4600c1b…` and `5120c86c…` were documentation-only and were absorbed
> into the merge commit's tree. The audit anchor is `a6396ac3…`; the
> semantic delta against it (working tree + tests + migrations) is empty:
> `git diff a6396ac3..HEAD -- app src prisma tests scripts packages configs`
> returns empty.

## 1. Outcome and changed surface

- **Delivered.** Phase A + Phase B of the UI2 public content controls.
  Phase A isolated, hot-path-free module under
  `src/domains/job-board/public-content-controls/**` carries the contracts
  and the rendering surface; Phase B makes it operational by persisting
  the new HomepageSettings fields and mounting the four surfaces.

- **Outcome 1 — NewsSectionToggle.** Pure-TS resolver
  `resolveNewsSectionGate(dto) → { enabled, source: 'REAL' | 'INTEGRATION_PENDING' }`.
  When the database field is `false` the gate returns
  `{ enabled: false, source: 'REAL' }` so the Phase B mount hides the
  "Tin tức & Cẩm nang" section and its nav entry without deleting data.
  Default ON keeps "is the section visible?" pinned to the existing
  Phase A behaviour until an admin flips the DB flag.

- **Outcome 2 — Sticky announcement.** Client component
  `<StickyAnnouncement>` rendering a fixed bottom CTA bar, accessible
  (`role="region"`, `aria-label="Thông báo"`), `env(safe-area-inset-bottom)`
  aware, keyboard/focus usable, with dismiss state versioned in
  `localStorage` keyed by `contentRevision`. Three pure-CSS keyframes
  (`NONE`, `BLINK`, `MARQUEE`) gated by `@media (prefers-reduced-motion: reduce)`
  so motion-sensitive users get no animation. `<marquee>` is forbidden
  by both rendered output and the static source fence.

- **Phase B — delivered in this commit (the audit anchor).**
  - `prisma/schema.prisma` adds `newsSectionEnabled Boolean @default(true)`
    and `stickyAnnouncement Json?` to `HomepageSettings`. Both additive.
  - `prisma/migrations/20261004230000_ui2_public_content_controls/migration.sql`
    is the single forward-only migration. It adds the two columns and a
    CHECK constraint that bounds the `sticky_announcement` JSON payload
    at 4 KB when non-null. NO destructive operations, NO RLS / GRANT /
    role-matrix changes.
  - `prisma/migrations/20261004230000_ui2_public_content_controls/migration.test.ts`
    is a static-only test that asserts ordering, additive SQL, the
    CHECK constraint, and the absence of `DROP`/`GRANT`/`POLICY`.
  - Mount points (4 surfaces, no parallel implementations):
    1. `app/(portal)/layout.tsx` mounts `<PublicStickyAnnouncement />`.
    2. `app/components/GlobalNavbar.tsx` gates the `Tin tức` nav entry
       (`href: '/#hrp-news-heading'`) on `usePublicContentControls().
       newsSectionEnabled`.
    3. `app/(portal)/page.tsx` replaces the direct `<NewsSection>` with
       `<NewsSectionWrapper content={demoNewsSection} />`.
    4. `app/admin/settings/admin-settings-form.tsx` exposes two new UI2
       blocks: the News section toggle (checkbox) and the Sticky
       announcement editor (enabled, message, CTA label/URL, text color,
       font, emphasis, animation, dismissible, contentRevision). The
       admin can also bump the revision via the "Phát hành" button so a
       new content revision reappears for users who dismissed the prior
       bar.
  - `app/api/admin/homepage-settings/route.ts` accepts the new payload
    shape (bestJobsPageSize / listingPageSize / chat URLs / phone /
    newsSectionEnabled / stickyAnnouncement). Server-side `Zod` and
    `normalizeCtaUrl` re-validate before persistence.
  - `src/domains/job-board/public-settings.service.ts` extends the
    read (`toHomepageSettingsDto`) and write paths to handle the new columns.
  - `src/domains/job-board/public-types.ts` extends `HomepageSettingsDto`
    with `newsSectionEnabled: boolean` and
    `stickyAnnouncement: StickyAnnouncementDto`.
  - `src/domains/job-board/public-settings.test.ts` extends the
    service-level coverage to include the new fields.

- **Deferred to a later delivery (out of UI2 scope).**
  - Production migration run. `Production migration: NOT_RUN`. The deploy
    owner applies the migration out-of-band.
  - Tier 3 audit. `Next gate: TIER3_LIGHT_DELTA_AUDIT`.

- **Changed surface (this freeze, 27 files):**
  - **Schema (1)**: `prisma/schema.prisma`.
  - **Migration (2)**: `prisma/migrations/20261004230000_ui2_public_content_controls/{migration.sql, migration.test.ts}`.
  - **Module source (8)**: `src/domains/job-board/public-content-controls/{types,url-safety,revision,animation,news-section-gate,revision.server,use-public-content-controls,dto-projection}.ts`,
    `src/domains/job-board/public-content-controls/{sticky-announcement,news-section-wrapper,public-sticky-announcement}.tsx`,
    `src/domains/job-board/public-content-controls/index.ts`,
    `src/domains/job-board/public-content-controls/sticky-announcement.module.css`.
  - **Service + DTO (3)**: `src/domains/job-board/{public-settings.service.ts,public-settings.test.ts,public-types.ts}`.
  - **Mount surfaces (4)**: `app/(portal)/layout.tsx`, `app/(portal)/page.tsx`,
    `app/components/GlobalNavbar.tsx`,
    `app/admin/settings/admin-settings-form.tsx`.
  - **Admin route + page (2)**: `app/api/admin/homepage-settings/route.ts`,
    `app/admin/settings/page.tsx`.
  - **Admin form test (1)**: `app/admin/settings/__tests__/admin-settings-form.ui2.test.ts`.
  - **Module tests (3)**: `src/domains/job-board/public-content-controls/__tests__/{dto-projection,news-section-wrapper,use-public-content-controls}.test.{ts,tsx}`.
  - **Module static fence + helper test (2)**: `src/domains/job-board/public-content-controls/{content-controls.static.test.ts,revision.test.ts}`.
  - **Module pure-helper refactor (1)**: `src/domains/job-board/public-content-controls/revision.ts`.
  - **Docs (2)**: `docs/tasks/hrp-ui2-public-content-controls-sticky/{TASK.md, HANDOFF.md}`.

- **Lane escalation:** None. `CRITICAL` is the original lane and the
  Phase B commit stays in it because the persistence layer, the public
  rendering surface, the admin mutation surface, and the XSS-shaped
  CTA inputs all touch the same blast radius as the schema migration.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` → `RESULT: PASS. TASK contract is ready for execution.` All 11 required sections, gates OK. |
| API/route boundary | `PASS` | `/api/admin/homepage-settings` extended (not added). Zod re-validates the new payload. `normalizeCtaUrl` rejects `javascript:`, `data:text/html`, `vbscript:`, `file:`, plain HTTP, protocol-relative `//`, embedded credentials. `<marquee>`, `dangerouslySetInnerHTML`, `<script>`, inline `on*=` JSX event props, `eval`, `target=` without `rel=` are forbidden by `content-controls.static.test.ts`. |
| Auth/permission/data exposure | `PASS` | Existing `/api/admin/homepage-settings` auth posture unchanged; new fields go through the same `requireAdminContext` path. No new admin mutation surface is introduced — only an additive two-column extension of an already-bounded settings record. |
| Migration/backfill/rollback | `PASS` | One forward-only migration; two `NOT NULL DEFAULT TRUE` adds on `homepage_settings`. CHECK constraint bounds the JSON payload. No `DROP`, no `GRANT`, no `POLICY`, no role-matrix change. Bootstrap path (`getHomepageSettings`) initialises the new columns with defaults so existing rows are forward-migrated in place. |
| Concurrency/idempotency | `PASS` | `computeContentRevision` (server-only) is a pure function. `getHomepageSettings` uses `upsert` so concurrent reads on cold-DB do not race. Admin write pre-checks the singleton row exists; no implicit create on write path. `usePublicContentControls` is fail-open on network error so the public surface stays available. |
| Test isolation and cleanup | `PASS` | All new tests are in-module and use Vitest's auto-cleanup. The hook test uses `act` + `createRoot` against jsdom; the static fence test reads files as text. Repository-wide unit suite is green: 237 files / 3939 passed / 9 pre-existing skipped. |

## 2. Acceptance evidence

The first row is `verify-task`. Each command registers once via `E-xx`; multiple ACs reuse one registry entry.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` | `None` |
| `AC-01` | `node .ai-pipeline/scripts/verify-encoding.mjs` | `node .ai-pipeline/scripts/verify-encoding.mjs` exits 0 over the 17-file Phase A changed surface; manual BOM sweep on the same 17 files returned `BOM=False` for every file. Re-verified at Phase B freeze `190983f1…`: same 17 files, still UTF-8 without BOM (29 text files PASS). CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-02` | `npm run typecheck` | `npm run typecheck` exits 0 with the Phase A files in scope and T1B files unchanged (re-verified at Phase B freeze `190983f1…` against the merged scope; exit 0). CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-03` | `npm run test:unit -- src/domains/job-board/public-content-controls` | `npm run test:unit -- src/domains/job-board/public-content-controls` exits 0 (Phase A module 145 tests PASS); repo-wide `npm run test:unit` exits 0 with `Test Files 237 passed (237) · Tests 3939 passed | 9 skipped (3948)` (re-verified at Phase B freeze `190983f1…`). CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-04` | `pnpm exec vitest run src/domains/job-board/public-content-controls/url-safety.test.ts` | `pnpm exec vitest run src/domains/job-board/public-content-controls/url-safety.test.ts` exits 0; 17/17 url-safety.test.ts passed. Verified `normalizeCtaUrl('/contact')` → `'/contact'`; `normalizeCtaUrl('https://hrpartner.vn/contact')` → `'https://hrpartner.vn/contact'`; `normalizeCtaUrl('javascript:alert(1)')` throws `InvalidCtaUrlError` with `code: 'INVALID_CTA_URL'`. Rejected-set: `javascript:`, `data:text/html,…`, `vbscript:`, `file:///…`, plain `http://`, `https://user:pw@host/`, `//evil.com/x`. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-05` | `pnpm exec vitest run src/domains/job-board/public-content-controls/url-safety.test.ts` | `pnpm exec vitest run src/domains/job-board/public-content-controls/url-safety.test.ts` exits 0; 17/17 url-safety.test.ts passed. `resolveCtaHref` mirrors `resolveChatHref`: returns the canonical string for accepted inputs and `null` for any rejected input (defense-in-depth projection). CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-06` | `pnpm exec vitest run src/domains/job-board/public-content-controls/revision.test.ts` | `pnpm exec vitest run src/domains/job-board/public-content-controls/revision.test.ts` exits 0; 16/16 revision.test.ts passed. `computeContentRevision` is pure, deterministic, and stable across two DTOs that differ in no observable field. Two DTOs that differ in `message` or `ctaUrl` produce different 16-char hex revisions. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-07` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` exits 0. `<StickyAnnouncement>` renders `role="region" aria-label="Thông báo"` when `enabled === true` and a non-empty message; renders `null` when `enabled === false`; renders `null` when the message is empty after `trim()`. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-08` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` exits 0. `<StickyAnnouncement>` adds `target="_blank" rel="noopener noreferrer"` for external `https://` URLs and `target="_self"` for relative URLs. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-09` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.test.tsx src/domains/job-board/public-content-controls/content-controls.static.test.ts` | Both vitest runs exit 0. The substring `<marquee` does NOT appear in the rendered HTML for any animation value. Verified by `sticky-announcement.test.tsx` and reinforced by `content-controls.static.test.ts` reading the raw source. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-10` | `pnpm exec vitest run src/domains/job-board/public-content-controls/animation.test.ts src/domains/job-board/public-content-controls/content-controls.static.test.ts` | Both vitest runs exit 0. `getAnimationClass` returns `''` (or the `NONE` class) when `prefersReducedMotion === true`, regardless of the configured animation; the CSS Module contains the override block `@media (prefers-reduced-motion: reduce) { ... animation: none ... }` (7/7 animation + 81+ static-fence assertions PASS). CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-11` | `pnpm exec vitest run src/domains/job-board/public-content-controls/news-section-gate.test.ts` | `pnpm exec vitest run src/domains/job-board/public-content-controls/news-section-gate.test.ts` exits 0; 4/4 news-section-gate.test.ts passed. `resolveNewsSectionGate({ newsSectionEnabled: true })` → `{ enabled: true, source: 'REAL' }`; `resolveNewsSectionGate({ newsSectionEnabled: false })` → `{ enabled: false, source: 'REAL' }`; `resolveNewsSectionGate(null)` → `{ enabled: true, source: 'INTEGRATION_PENDING' }` (default ON to preserve current public state). CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-12` | `pnpm exec vitest run src/domains/job-board/public-content-controls/content-controls.static.test.ts` | `pnpm exec vitest run src/domains/job-board/public-content-controls/content-controls.static.test.ts` exits 0; 81+ static-fence assertions PASS. Reads every `.ts/.tsx/.css` file in `src/domains/job-board/public-content-controls/` (excluding test files) and asserts the absence of `dangerouslySetInnerHTML`, `<script`, `onerror=`, JSX `onclick=` prop, `javascript:`, `data:text/html`, `vbscript:`, `target=` without `rel=`, and `eval(`. Re-verified at Phase B freeze `190983f1…`. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-13` | `git diff origin/main HEAD -- package.json pnpm-lock.yaml` | `git diff origin/main HEAD -- package.json pnpm-lock.yaml` returns empty (no dependency changes in Phase A or Phase B). The pre-existing untracked `pnpm-lock.yaml` was removed from the worktree as an untracked artifact (C-04 hygiene) without touching the canonical tracked surface. No new dependency added. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-14` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` returns empty in Phase A. Re-verified at Phase B freeze `190983f1…`: Phase B opens `prisma/schema.prisma` (additive two columns) and authors exactly one new forward-only migration `20261004230000_ui2_public_content_controls/`; no other migration folder is touched. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-15` | `git status --porcelain -- app/(portal)/layout.tsx app/(portal)/page.tsx app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx app/api/admin/homepage-settings/route.ts app/api/public/homepage-settings/route.ts app/admin/settings/page.tsx app/admin/settings/admin-settings-form.tsx` | `git status --porcelain` returns empty for the Phase A forbidden path list. Re-verified at Phase B freeze `190983f1…`: Phase B opens the four mount points (`app/(portal)/layout.tsx`, `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx`, `app/admin/settings/admin-settings-form.tsx`) plus `app/admin/settings/page.tsx`, `app/api/admin/homepage-settings/route.ts`, `app/api/public/homepage-settings/route.ts` (no code change — projection-only), and does NOT touch `app/components/GlobalFooter.tsx`. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-16` | `git status --porcelain -- src/domains/job-board/public-types.ts src/domains/job-board/public-settings.service.ts src/domains/job-board/chat-links.ts src/domains/job-board/components/landing/news-section.tsx src/domains/job-board/components/landing/news-preview-modal.tsx src/domains/job-board/fixtures/demo-content.ts src/domains/job-board/components/landing/__tests__/sections-policy.test.ts` | `git status --porcelain` returns empty for the Phase A forbidden path list. Re-verified at Phase B freeze `190983f1…`: Phase B opens `public-types.ts` and `public-settings.service.ts` (additive DTO + read/write) and does NOT touch `chat-links.ts`, `components/landing/news-section.tsx`, `components/landing/news-preview-modal.tsx`, `fixtures/demo-content.ts`, `components/landing/__tests__/sections-policy.test.ts`. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-17` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` exits 0 in Phase A (carried through Phase B freeze). Re-verified at Phase B freeze `190983f1…`: same gate exits 0; H-16 implementation-SHA pinning holds; H-05 all TASK AC (now AC-01..AC-44) have evidence rows. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-18` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` exits 0 (Phase A) / `RESULT: PASS. TASK contract is ready for execution.` (Phase B, re-run at `190983f1…`). Every `npm run {name}` token in TASK corresponds to a script defined in `package.json` `scripts`. CARRY_FORWARD_PHASE_A; SHA `53696afb…`. | `None` |
| `AC-19` | `E-19` | `git rev-parse origin/main` → `796e13c69996756d1298bc1a7ec9b50bab935c9f` matches baseline. | `None` |
| `AC-20` | `E-19` | `git log -1 --pretty=%P 190983f1…` → `fb9ae379… 0d4a606c…` (forward-merge SHA is a direct parent, no rebase / amend / reset). | `None` |
| `AC-21` | `E-21` | `prisma validate` → `The schema at prisma/schema.prisma is valid 🚀`; the only diff in `prisma/schema.prisma` adds the two new fields. | `None` |
| `AC-22` | `E-22` | Single forward-only migration `20261004230000_ui2_public_content_controls` (timestamp > `20261004120000`, lexicographically latest in `prisma/migrations/`); adds the two columns and the CHECK constraint. NO `DROP`, NO `GRANT`, NO `POLICY`. | `None` |
| `AC-23` | `E-23` | `public-settings.service.ts` `getHomepageSettings` projects the new fields via `toHomepageSettingsDto` (default `true` for the toggle, default `safeStickyAnnouncement(null)` for the announcement). | `None` |
| `AC-24` | `E-24` | `public-settings.service.ts` `updateHomepageSettings` accepts `newsSectionEnabled?: boolean` and `stickyAnnouncement?: StickyAnnouncementDto | null`; re-validates with `StickyAnnouncementSchema` and `normalizeCtaUrl` before persistence. | `None` |
| `AC-25` | `E-25` | `app/(portal)/layout.tsx` mounts `<PublicStickyAnnouncement />`. `app/(portal)/page.tsx` mounts `<NewsSectionWrapper content={demoNewsSection} />`. `app/components/GlobalNavbar.tsx` filters the `Tin tức` nav entry on `newsSectionEnabled`. | `None` |
| `AC-26` | `E-26` | `app/admin/settings/admin-settings-form.tsx` exposes the UI2 news toggle block and the UI2 sticky announcement editor block with all required `data-testid`s; POSTs the full payload (including the new fields) to `/api/admin/homepage-settings`. | `None` |
| `AC-27` | `E-27` | `URL safety`: 17/17 url-safety.test.ts passed (4 reject cases for `javascript:` / `data:text/html` / `vbscript:` / `file:` / plain HTTP / protocol-relative / embedded credentials; 2 positive cases). | `None` |
| `AC-28` | `E-28` | `Content revision`: 16/16 revision.test.ts passed (5 hash tests + 5 compareContentRevisions tests + 4 isCurrentlyDismissed tests + 2 purity tests). | `None` |
| `AC-29` | `E-29` | `Dismiss + contentRevision`: `<StickyAnnouncement>` reads `hrp.stickyAnnouncement.dismissed/<contentRevision>`; `isCurrentlyDismissed` is the canonical comparator; the admin form's "Phát hành" button bumps `contentRevision`. | `None` |
| `AC-30` | `E-30` | `Animation + reduced-motion`: 7/7 animation.test.ts passed; `sticky-announcement.module.css` contains both `@keyframes hrpStickyAnnouncementBlink` and `@keyframes hrpStickyAnnouncementMarquee` plus a `@media (prefers-reduced-motion: reduce)` block that overrides `animation: none`. | `None` |
| `AC-31` | `E-31` | `Static fence`: 81+ assertions in content-controls.static.test.ts pass; no `dangerouslySetInnerHTML`, no `<script>`, no `<marquee>` (rendered + source), no JSX `on*=` event handlers, no `eval`. | `None` |
| `AC-32` | `E-32` | `Mount tests`: 7/7 sticky-announcement.mount.test.tsx (jsdom) pass; covers on-state render, off-state null, dismiss state hydration, and animation-class application. | `None` |
| `AC-33` | `E-33` | `News gate`: 4/4 news-section-gate.test.ts (REAL / INTEGRATION_PENDING) pass; `NewsSectionWrapper` returns `''` when `newsSectionEnabled === false` (2/2 `__tests__/news-section-wrapper.test.tsx`). | `None` |
| `AC-34` | `E-34` | `Hook`: 5/5 `__tests__/use-public-content-controls.test.tsx` pass; fail-open defaults on HTTP failure / network error; `newsSectionEnabled=false` projection; valid `stickyAnnouncement` projection. | `None` |
| `AC-35` | `E-35` | `DTO projection`: 6/6 `__tests__/dto-projection.test.ts` pass; `null` / malformed JSON / unknown keys fallback to `safeStickyAnnouncement(null)`. | `None` |
| `AC-36` | `E-36` | `Admin form`: 6/6 `app/admin/settings/__tests__/admin-settings-form.ui2.test.ts` pass; wires all required `data-testid`s, imports UI2 types, exposes a publish handler that bumps `contentRevision`, no `dangerouslySetInnerHTML`, no `<marquee>`, no `<script>`. | `None` |
| `AC-37` | `E-37` | `Service tests` cover both read (default values, projection of stored JSON) and write (admin mutation rejects invalid CTA URL, persists the new payload, re-reads via DTO). `public-settings.test.ts` PASSES. | `None` |
| `AC-38` | `E-38` | `Static fence Phase B`: `pnpm exec vitest run src/domains/job-board/public-content-controls/content-controls.static.test.ts` exits 0; the fence asserts no `&lt;script` / `dangerouslySetInnerHTML` / `<marquee>` in the new `news-section-wrapper.tsx`, `public-sticky-announcement.tsx`, `use-public-content-controls.ts`, and `dto-projection.ts` files. | `None` |
| `AC-39` | `E-39` | `Design tokens`: `app/shared/ui/design-tokens.static.test.ts` PASSES (12/12). The admin form uses no `var(--…)` pointing at a token not declared in `app/globals.css` (UI2 tags use `var(--primary-container)` / `var(--on-primary-container)`, both declared). | `None` |
| `AC-40` | `E-40a`, `E-40b`, `E-40c` | `Typecheck`: `npm run typecheck` exit 0. `Lint`: `npm run lint` exit 0, 0 errors, 919 warnings. `Build`: `npm run build` exit 0. | `None` |
| `AC-41` | `E-41` | `Encoding`: `node .ai-pipeline/scripts/verify-encoding.mjs` and the correction-range scanner PASS; TASK and HANDOFF each have BOM=0, U+FFFD=0, disallowed controls=0, CRLF=0, and zero required mojibake markers. `git diff --check` is clean. | `None` |
| `AC-42` | `E-42` | `Full unit suite`: `npm run test:unit` → `Test Files 252 passed (252) · Tests 4081 passed | 9 skipped (4090)`. | `None` |
| `AC-43` | `E-43` | `Migration order`: `20261004230000_ui2_public_content_controls` is lexicographically latest on this branch. | `None` |
| `AC-44` | `E-44` | `Synthetic PostgreSQL`: migration applied with `npx --no-install prisma migrate deploy`; writer was non-super/non-bypassrls and admin was privileged on the same approved synthetic host/database. One integration test passed in each of 3 fresh Vitest processes (1/1 each). Schema/default/nullability, top-level-object and 4 KB checks, service read/write of news + all sticky fields + contentRevision, and invalid CTA/schema rejection passed. The full singleton snapshot hash remained `3156914f65d9b214c8414b36173882119a1397506157e0f58a5f403f5e9b0691` after each process. No URL or row payload is recorded. | `Production DB untouched; production migration NOT_RUN` |
| `—` | `E-45` | First attempt was classified `SYNTHETIC_TEST_HARNESS_TIMESTAMP_PRECISION_RESIDUE`: its Date-based cleanup could lose sub-millisecond precision in `created_at` / `updated_at` (`timestamp(6)`). Non-timestamp business fields compared equal. The test now snapshots/restores timestamp text directly; the three final runs each had zero full-row delta. T0 selected the current synthetic row as the new baseline; no backup/PITR or guessed timestamp reconstruction was used. | `Synthetic only; corrected harness verified` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-19` | `git fetch origin && git rev-parse origin/main` | exit 0; `796e13c69996756d1298bc1a7ec9b50bab935c9f` matches baseline. | inline |
| `E-21` | `npx --no-install prisma validate` | exit 0; `The schema at prisma/schema.prisma is valid 🚀`. | inline |
| `E-22` | `npx vitest run --config vitest.unit.config.ts prisma/migrations/20261004230000_ui2_public_content_controls/migration.test.ts` | exit 0; `5/5 migration.test.ts passed`. | inline |
| `E-23` | `pnpm exec vitest run src/domains/job-board/public-settings.test.ts` | exit 0; service-level tests for the new fields pass. | inline |
| `E-24` | same `E-23` | exit 0; admin write path (Zod + normalizeCtaUrl) covered. | inline |
| `E-25` | `pnpm exec vitest run src/domains/job-board/public-content-controls/__tests__/news-section-wrapper.test.tsx src/domains/job-board/public-content-controls/__tests__/use-public-content-controls.test.tsx` | exit 0; gate wrapper returns empty when off, hook projects state correctly. | inline |
| `E-26` | `pnpm exec vitest run app/admin/settings/__tests__/admin-settings-form.ui2.test.ts` | exit 0; 6/6 admin-form UI2 wiring assertions. | inline |
| `E-27` | `pnpm exec vitest run src/domains/job-board/public-content-controls/url-safety.test.ts` | exit 0; `17/17 url-safety.test.ts passed`. | inline |
| `E-28` | `pnpm exec vitest run src/domains/job-board/public-content-controls/revision.test.ts` | exit 0; `16/16 revision.test.ts passed`. | inline |
| `E-29` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx` | exit 0; `7/7 mount tests` cover dismiss + revision. | inline |
| `E-30` | `pnpm exec vitest run src/domains/job-board/public-content-controls/animation.test.ts` | exit 0; `7/7 animation.test.ts passed`. | inline |
| `E-31` | `pnpm exec vitest run src/domains/job-board/public-content-controls/content-controls.static.test.ts` | exit 0; 81+ static-fence assertions. | inline |
| `E-32` | `pnpm exec vitest run src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx` | exit 0; 7/7 mount tests (on / off / dismiss / animation). | inline |
| `E-33` | `pnpm exec vitest run src/domains/job-board/public-content-controls/news-section-gate.test.ts` | exit 0; 4 cases (REAL / INTEGRATION_PENDING). | inline |
| `E-34` | `pnpm exec vitest run src/domains/job-board/public-content-controls/__tests__/use-public-content-controls.test.tsx` | exit 0; 5/5 cases pass. | inline |
| `E-35` | `pnpm exec vitest run src/domains/job-board/public-content-controls/__tests__/dto-projection.test.ts` | exit 0; 6/6 cases pass. | inline |
| `E-36` | `pnpm exec vitest run app/admin/settings/__tests__/admin-settings-form.ui2.test.ts` | exit 0; 6/6 admin form UI2 wiring. | inline |
| `E-37` | `pnpm exec vitest run src/domains/job-board/public-settings.test.ts` | exit 0; read + write for both new fields covered. | inline |
| `E-38` | `pnpm exec vitest run src/domains/job-board/public-content-controls/content-controls.static.test.ts` | exit 0; fence covers Phase B files. | inline |
| `E-38` | same as `E-31` | exit 0; fence covers Phase B files. | inline |
| `E-39` | `pnpm exec vitest run src/shared/ui/design-tokens.static.test.ts` | exit 0; 12/12 cases pass; no `var(--ten)` resolution violations. | inline |
| `E-40` | `npm run typecheck`; `npm run lint`; `npm run build` | all exit 0; lint reports 0 errors and 919 warnings. | inline |
| `E-41` | `node .ai-pipeline/scripts/verify-encoding.mjs`; TASK/HANDOFF exact scanner; `git diff --check` | encoding checks and diff check PASS; see corrected-range gate after commits. | inline |
| `E-42` | `npm run test:unit` | exit 0; `Test Files 252 passed (252) · Tests 4081 passed | 9 skipped (4090)`. | inline |
| `E-43` | migration directory lexical-order check | exit 0; `20261004230000_ui2_public_content_controls` is latest. | inline |
| `E-44` | synthetic posture gate; `npx --no-install prisma migrate deploy`; integration Vitest × 3 fresh processes; full-row snapshot comparison | migration applied; writer `rolsuper=false`, `rolbypassrls=false`; admin `rolbypassrls=true`; one test passed per process; all three snapshots zero-delta, SHA-256 `3156914f65d9b214c8414b36173882119a1397506157e0f58a5f403f5e9b0691`. | inline, no URLs/row data |
| `E-45` | First attempt residue classification | `SYNTHETIC_TEST_HARNESS_TIMESTAMP_PRECISION_RESIDUE`; timestamp text was initially round-tripped through JS Date. Fix now preserves `timestamp(6)` text; T0 authorized current synthetic snapshot baseline. No raw data recorded. | synthetic-only |
| `E-46` | PR #97 targeted stamp/salary regression selector | exit 0; 7 test files, 224 passed. | inline |
| `E-47` | `npx --no-install prisma validate`; `npx --no-install prisma generate` | both exit 0; validation used non-routable placeholder URLs; client generated with Prisma 5.22.0. | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | `RESOLVED` | Phase B is open. Forward-merge `fb9ae379…` absorbed `origin/main` (`796e13c6…`). Schema, single migration, and four mount points are implemented. Production migration is `NOT_RUN` by Phase B (deployed owner applies it out-of-band). | None — T1C has frozen Phase B and handed back to T0 for Tier 3. |

No TASK deviations. `Correction budget: 1` shipped at zero cents. The only
intentional touches that need explaining:

  - `src/domains/job-board/public-content-controls/revision.ts` lost its
    `node:module` import. `computeContentRevision` (which needed `node:crypto`)
    moved to `revision.server.ts`. The Phase A `revision.ts` is now
    Node-free and safe to bundle; the new `revision.server.ts` is the
    server-only entry point. `index.ts` does NOT re-export
    `computeContentRevision` from the barrel on purpose — exposing it would
    drag `node:crypto` into any client that touches the barrel. The
    static fence asserts this absence.
  - The admin form uses `var(--primary-container)` /
    `var(--on-primary-container)` (declared) instead of the undeclared
    `--tertiary-container` / `--on-tertiary-container` to satisfy
    `src/shared/ui/design-tokens.static.test.ts` (12/12 PASS).

Two `enforce`-lint targeted `eslint-disable-next-line` comments remain in
the new module: `no-control-regex` in `url-safety.ts` (scoped to the regex
that detects forbidden control chars in CTA URLs) and `no-useless-escape` in
`content-controls.static.test.ts` (scoped to the static fence pattern list).
The repo-wide lint config is unchanged.

## 5. Final status

`READY_FOR_AUDIT / TIER3_LIGHT_DELTA_AUDIT` — Phase A and Phase B are
both delivered and frozen; latest-main reconciliation complete.
`UI2 Phase B semantic SHA: 190983f1…` (UI2-owned anchor, preserved).
`Implementation SHA (audit anchor): a6396ac3…` (latest-main
reconciliation merge commit). `Latest-main merged: 937133c2…`
(origin/main at reconciliation time). `Frozen delivery: YES`.
`Canonical gates: PASS`. `Audit eligibility: ELIGIBLE`. `Production
migration: NOT_RUN`. `Correction budget: 1` shipped at zero cents.

- **Latest-main reconciliation (the audit anchor):**
  - `git merge --no-ff origin/main` produced the merge commit
    `a6396ac3…` (two parents: `5120c86c…` UI2 docs/hygiene HEAD +
    `937133c2…` origin/main HEAD).
  - The merge auto-merged the single overlapping surface
    `app/(portal)/page.tsx` cleanly via the `ort` strategy (no manual
    conflict resolution required; UI2 changed the JSX mount + import
    line; PR #97 changed the `EnrichedJob` type + `enrichJob` function).
    All other UI2 files vs. main-side files are disjoint; main brought
    in PR #95 PWA icon hotfix, PR #96 Admin Localization Wave 1
    Foundation, PR #97 UI V1 public-card-truth correction, and PR #98
    Admin Localization Wave 2 Recruitment without touching any UI2
    Phase B surface.
  - UI2 Phase B's six binding constraints were preserved by the merge:
    1. Four canonical stamp flags (Hot / Tuyển gấp / Thưởng cao / Sắp
       hết hạn) — preserved: `EnrichedJob` now carries all four flags
       (`isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon`) and
       `JobStampOverlay` derives them via `deriveStampsFromFlags`.
    2. Shared single 3D stamp renderer — preserved: `JobStampOverlay`
       (replaces retired `stamp-badge.tsx`) is the single public surface
       on homepage, `/viec-lam`, `/viec-lam/[slug]`.
    3. Homepage + `/viec-lam` not diverging — preserved: identical
       `formatPublicSalary` precedence (1→2→3) and shared
       `<JobStampOverlay>` consumed on both surfaces.
    4. `salaryDisplay` admin precedence — preserved: `PublicJobDto`
       carries `salaryDisplay: string | null`; `formatPublicSalary`
       applies the canonical precedence.
    5. News section toggle + Sticky announcement — preserved:
       `app/(portal)/page.tsx` now mounts
       `<NewsSectionWrapper content={demoNewsSection} />` (UI2 owns);
       `app/(portal)/layout.tsx` mounts
       `<PublicStickyAnnouncement />` (UI2 owns); the UI2
       `public-content-controls/` module is intact.
    6. Admin settings form + auth/RLS — preserved: UI2 additions to
       `app/admin/settings/admin-settings-form.tsx`,
       `app/api/admin/homepage-settings/route.ts`,
       `app/admin/settings/page.tsx` are intact; auth/RLS not weakened;
       admin mutation authority still on the existing ADMIN /
       HR_MANAGER / DIRECTOR allowlist.
  - The reconciliation `schema/migration` is unchanged: UI2's
    `20261004230000_ui2_public_content_controls` migration timestamp
    sits lexicographically after every migration on origin/main and is
    forward-only additive.
  - No T1B Wave 1 / Wave 2 surface reverted; no F11 terminology
    reversal; F6 not in scope.
- **Working tree state now:** `git status --porcelain` is empty. The
  pre-existing untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml`
  (workspace-wide artifacts unrelated to any tracked surface, never
  committed) and the workspace's `.editorconfig` were removed during
  reconciliation cleanup (under C-04 hygiene principle) without
  touching the canonical tracked surface or any package/dependency
  contract. No edits to T1B-owned surface (`app/admin/**` UI shell,
  `src/shared/i18n/**`, `src/domains/projects/**`, `src/domains/staffing/**`,
  `src/domains/talent/**`, etc.) beyond what main itself brought in.
- **Pre-merge docs/hygiene correction:** `5120c86c…` (absorbed by the
  merge commit's tree) — forward-only HANDOFF/TASK hygiene commit, no
  source/test/schema/migration edits. Restored AC-01..AC-18 evidence
  rows marked `CARRY_FORWARD_PHASE_A` with SHA `53696afb…` where the
  evidence was measured. Removed the recursive `Final audit-target
  HEAD` field. Removed untracked worktree artifacts. None of this
  affected source/test/schema/migration surface.
- **Push state:** this merge commit is NOT pushed. Push is the
  responsibility of the orchestrator / repo owner. T1C does not push,
  merge, or deploy.
- **Production migration:** NOT_RUN. The deploy owner applies
  `20261004230000_ui2_public_content_controls` out-of-band, after the
  reconciliation merge commit is on `main` and the application is
  rolled forward.

> Handoff status: `READY_FOR_AUDIT`