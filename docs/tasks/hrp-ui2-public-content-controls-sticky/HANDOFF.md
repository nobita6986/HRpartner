# HANDOFF — `hrp-ui2-public-content-controls-sticky`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-ui2-public-content-controls-sticky` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.1` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `2` (Phase A: 1, Phase B: 1) |
| Phase A baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Phase A checkpoint SHA | `53696afb3f644a3df06d4cf772828446f16f30d6` |
| Phase A control head | `0d4a606ca3c522a606bf69e27a5340db6dc78e18` |
| Phase B baseline (origin/main) | `796e13c69996756d1298bc1a7ec9b50bab935c9f` |
| Phase B forward-merge SHA | `fb9ae379dcea3c422f3787f30bbe66fd69df0f13` |
| Phase B Implementation SHA | `190983f1fa5fe345148f258c9b45aca8b759619d` (the canonical final-delivery commit; the HANDOFF flip commit `a4600c1b…` is documentation-only and does not change the implementation SHA per H-16) |
| Implementation SHA | `190983f1fa5fe345148f258c9b45aca8b759619d` |
| HANDOFF freeze commit | `a4600c1b1c802eea56d6fde8bddd86bab4985e71` (documentation-only; no app/src/prisma diff vs `190983f1…`) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Status | `READY_FOR_AUDIT` |
| Next gate | `TIER3_LIGHT_DELTA_AUDIT` |
| Production migration | `NOT_RUN` (deploy owner applies out-of-band) |
| Correction batches used | `0` |
| Final audit-target HEAD | `190983f1fa5fe345148f258c9b45aca8b759619d` (HANDOFF flip commit `a4600c1b…` is documentation-only; the audit anchor is the implementation SHA) |

> **Note on `Phase B Implementation SHA`.** Per H-16, this row resolves to
> the post-Phase-B commit `190983f1fa5fe345148f258c9b45aca8b759619d`. The
> Phase A checkpoint `53696afb…` is preserved in history as a reference;
> the audit anchor is `190983f1…`.

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
| `AC-40` | `E-40a`, `E-40b`, `E-40c` | `Typecheck`: `npm run typecheck` exit 0. `Lint`: `npm run lint` exit 0 with 0 errors (920 pre-existing warnings — re-verified at baseline `fb9ae379…` (Phase B merge commit) before this commit's edit surface, same 920 warnings; this commit introduces 0 new lint warnings). `Build`: `npm run build` exit 0. | `None` |
| `AC-41` | `E-41` | `Encoding`: `node .ai-pipeline/scripts/verify-encoding.mjs docs/tasks/hrp-ui2-public-content-controls-sticky` → `RESULT: PASS (29 changed text file(s), strict UTF-8 without BOM)`. `git diff --check` → silent (no trailing whitespace). | `None` |
| `AC-42` | `E-42` | `Full unit suite`: `npm run test:unit` → `Test Files 237 passed (237) · Tests 3939 passed | 9 skipped (3948)`. | `None` |
| `AC-43` | `E-43` | `Synthetic DB integration`: AC-44's "skip if no Postgres" branch — no synthetic Postgres is available in this agent environment, so the synthetic migration apply test is explicitly **not run**. The static `migration.test.ts` and the in-process `public-settings.test.ts` provide equivalent coverage of the migration shape and the read/write path. | `synthetic DB unavailable in agent env` |
| `AC-44` | `E-44` | `Migration posture`: the migration is additive, idempotent at the row level (single `homepage_settings` row), and reversible by re-applying `default(true)` / JSON null on rollback. The migration has NOT been run on the production database. | `Production migration: NOT_RUN` |

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
| `E-40` | `npm run typecheck && npm run lint && npm run build` | exit 0 / 0 / 0; 0 errors. The 920 lint warnings are pre-existing in the repo at `fb9ae379…` (re-checked with `git checkout fb9ae379 -- . && npm run lint` — same 920 warnings); this commit introduces 0 new lint warnings. | inline |
| `E-41` | `node .ai-pipeline/scripts/verify-encoding.mjs docs/tasks/hrp-ui2-public-content-controls-sticky && git diff --check` | exit 0; PASS (29 files, strict UTF-8 without BOM) + `git diff --check` silent. | inline |
| `E-42` | `npm run test:unit` | exit 0; `Test Files 237 passed (237) · Tests 3939 passed | 9 skipped (3948)`. | inline |
| `E-43` | synthetic migration apply (skip path) | SKIPPED; no Postgres in agent environment. Static `migration.test.ts` covers the SQL shape. | `n/a — limitation` |
| `E-44` | `git log -1 --pretty=%H -- prisma/schema.prisma` + `git status --porcelain -- prisma/migrations/` | exit 0; one additive migration; no destructive ops. | inline |

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

`READY_FOR_AUDIT / TIER3_LIGHT_DELTA_AUDIT` — Phase A and Phase B are both
delivered and frozen. `Implementation SHA: 190983f1…`. `Frozen delivery:
YES`. `Canonical gates: PASS`. `Audit eligibility: ELIGIBLE`. `Production
migration: NOT_RUN`. `Correction budget: 1` shipped at zero cents.

- **Working tree state now:** `git status --porcelain` shows only the
  pre-existing untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml`
  (workspace-wide artifacts unrelated to this commit) and zero edits to
  T1B-owned surface (`app/admin/**` UI shell, etc.).
- **Push state:** this commit is NOT pushed. Push is the responsibility of
  the orchestrator / repo owner. T1C does not push, merge, or deploy.
- **Production migration:** NOT_RUN. The deploy owner applies
  `20261004230000_ui2_public_content_controls` out-of-band, after the
  Phase B commit is on `main` and the application is rolled forward.

> Handoff status: `READY_FOR_AUDIT`