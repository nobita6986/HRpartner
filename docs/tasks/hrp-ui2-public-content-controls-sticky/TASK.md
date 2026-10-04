# TASK — `hrp-ui2-public-content-controls-sticky`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-ui2-public-content-controls-sticky` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | `Final audit happens after Phase B and covers the whole UI2 surface (Phase A module + Phase B mount + schema/migration + admin form). Phase A is delivered as a CHECKPOINT, not as a frozen final delivery; therefore Phase A is not independently audited.` |
| Spec version | `v1.1` |
| Status | `READY_FOR_AUDIT` (Phase B implementation `190983f1…`; pre-audit correction 1/1 completed; awaiting Tier 3 light delta audit) |
| Planner | `Tier 1` |
| Baseline | `796e13c69996756d1298bc1a7ec9b50bab935c9f` |
| Phase A checkpoint | `53696afb3f644a3df06d4cf772828446f16f30d6` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Correction budget used | `1` |
| Frozen delivery | `YES` (Phase A checkpoint frozen first; Phase B implementation commit `190983f1…` is now the canonical final freeze) |
| Canonical gates | `PASS` (verify-task / verify-handoff / encoding / typecheck / lint / build / test:unit all green at the Phase B freeze) |
| Audit eligibility | `ELIGIBLE` (Phase B final delivery) |
| In-scope roots | `src/domains/job-board/public-content-controls/**`; `docs/tasks/hrp-ui2-public-content-controls-sticky/**`. Phase B additionally opens: `prisma/schema.prisma` (additive only); `prisma/migrations/20261004230000_ui2_public_content_controls/**` (new, single forward-only migration); `app/(portal)/layout.tsx`; `app/components/GlobalNavbar.tsx` (Tin tức entry row only); `app/admin/settings/admin-settings-form.tsx`; `app/admin/settings/page.tsx`; `app/api/admin/homepage-settings/route.ts`; `src/domains/job-board/public-settings.service.ts` (additive); `src/domains/job-board/public-types.ts` (additive DTO fields only). |
| Forbidden paths | Phase A: `prisma/schema.prisma`; `prisma/migrations/**`; `app/(portal)/page.tsx`; `app/(jobs)/**`; `app/admin/**`; `app/api/admin/homepage-settings/**`; `app/api/public/homepage-settings/**`; `app/components/GlobalNavbar.tsx`; `app/components/GlobalFooter.tsx`; `app/components/FloatingChatActions.tsx`; `src/domains/job-board/public-types.ts`; `src/domains/job-board/public-settings.service.ts`; `src/domains/job-board/chat-links.ts`; `src/domains/job-board/components/landing/news-section.tsx`; `src/domains/job-board/components/landing/news-preview-modal.tsx`; `src/domains/job-board/fixtures/demo-content.ts`; `src/domains/job-board/components/landing/__tests__/sections-policy.test.ts`; `src/shared/auth/permission-catalog.ts`. Phase B retains all of the above EXCEPT those explicitly opened in `In-scope roots`, and adds: `app/components/ContactForm.tsx`; `prisma/migrations/<OTHER_TS>/**`; `src/domains/job-board/components/landing/__tests__/sections-policy.test.ts`. |
| Required gates | `pwsh .ai-pipeline/scripts/verify-pipeline.ps1`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `npm run typecheck`; `npm run lint -- src/domains/job-board/public-content-controls docs/tasks/hrp-ui2-public-content-controls-sticky`; `npm run test:unit -- src/domains/job-board/public-content-controls` |
| Current execution round | `2` (Phase A: 1, Phase B: 1) |
| Current audit round | `0` |
| Next gate | `TIER3_LIGHT_DELTA_AUDIT` |

> CRITICAL + LIGHT: Phase A is delivered as a CHECKPOINT (no schema/migration/mount yet).
> The final audit happens AFTER Phase B, against the post-Phase-B implementation SHA,
> and covers the whole UI2 surface: the Phase A module under
> `src/domains/job-board/public-content-controls/**`, the Phase B schema/migration in
> `prisma/`, and the four mount points in `app/(portal)/layout.tsx`,
> `app/components/GlobalNavbar.tsx`, `app/admin/settings/admin-settings-form.tsx`,
> and the public news section. Phase A alone is not audited. T1B-owned surface
> (the parts T1B itself touched in its UI V1 PR) is not re-audited here — that PR
> carried its own audit.

## 1. Outcome

### 1.1 User-visible outcome

**Phase A — isolated, no public-render or schema change.** Ship a self-contained module
under `src/domains/job-board/public-content-controls/**` that materializes the
contracts, validators, and components needed to deliver the two user-visible
outcomes in **Phase B**, after T1B's UI V1 merges:

1. **News toggle (Outcome 1)**: When an administrator flips a single
   `newsSectionEnabled` boolean in the canonical `HomepageSettings` row, the public
   homepage will:
   - keep the "Tin tức & Cẩm nang" section rendered (default `true`, preserves
     the current ON state), and keep the matching navbar entry rendered;
   - when `false`, hide the section AND hide the matching navbar entry, without
     deleting articles, JobPostings, or any persisted content, and without
     breaking direct routes to articles (those are out of scope of this task).

2. **Sticky bottom announcement (Outcome 2)**: A safe, accessible bottom-anchored
   announcement bar that:
   - is fixed at the bottom of the public viewport with safe-area inset;
   - does not overlay key CTAs or form fields (z-stack discipline);
   - is `prefers-reduced-motion` aware (animations off when reduced motion is on);
   - supports an animation enum `{ NONE, BLINK, MARQUEE }` implemented with
     pure CSS keyframes — never raw `&lt;marquee&gt;`;
   - exposes a dismissible state (when `dismissible === true`) with a
     versioned `contentRevision` so that a new revision reappears for users
     who dismissed the prior one;
   - is suppressed in admin, recruiter, vendor, worker, CTV, login and
     `/forbidden` layouts.

**Phase A artefacts (this TASK)**: the DTO contracts, URL safety validator,
content-revision hashing, animation envelope, `&lt;StickyAnnouncement&gt;` component,
`&lt;NewsSectionGate&gt;` resolver, and a full unit + static test surface. **No** mount
into `app/(portal)/layout.tsx`, **no** write into `prisma/schema.prisma` or
`prisma/migrations/**`, **no** patch to any T1B-owned file.

### 1.2 Non-goals

- Hotline, Zalo, Messenger announcement channels (already covered by
  `FloatingChatActions` and `chat-links.ts`).
- JobPosting stamps, logo, title, About route, cover/gallery/video.
- Arbitrary CMS / rich-text builder. TipTap must not be used.
- Scheduling, audience segmentation, analytics.
- Auth/RLS expansion. AFF and P2 are out of scope.
- Public layout mount, schema migration, admin form patch, or any change that
  would conflict with the T1B UI V1 branch.
- Animation libraries (no `framer-motion`, no `react-spring`).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/(portal)/layout.tsx:1-13` (Phase A) | Confirms the public layout still mounts only `GlobalNavbar`, `&lt;main&gt;`, `GlobalFooter`, `FloatingChatActions` — no sticky bar, no schema drift, owned by T1B. |
| `EV-02` | `prisma/schema.prisma:1722-1736` (Phase A) | The canonical `HomepageSettings` singleton model — T1B-owned. Phase A does not touch it. |
| `EV-03` | `app/api/public/homepage-settings/route.ts:1-55` (Phase A) | Existing public projection, `unstable_cache` tag `homepage-settings`, TTL 60s. Phase A will integrate the new field projection through this route only in Phase B. |
| `EV-04` | `src/domains/job-board/components/landing/news-section.tsx:21` (Phase A) | `if (!content.enabled) return null;` policy is already present. Phase A only adds a typed `gate` resolver that reads from `HomepageSettings`; it does NOT change the component. |
| `EV-05` | `app/admin/settings/admin-settings-form.tsx:32-200` (Phase A) | Admin form is the T1B-owned mount point for the new fields; Phase A leaves it alone. |
| `EV-06` | `docs/V8/V8_0_EXPERIENCE_FOUNDATION_BACKLOG.md` (Phase A) | T1B's UI V1 lane owns the public layout, navigation registry, workspace shell, and shared public layout. Phase A defers all mounts. |
| `EV-07` | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` (Phase A) | The binding operational decision that orders V1 and V2 waves and forbids two parallel migrations on the same baseline. Phase A respects the gate. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Phase A ships only under `src/domains/job-board/public-content-controls/**` and `docs/tasks/hrp-ui2-public-content-controls-sticky/**`. No T1B-owned file is opened. | `CHOSEN` |
| `DEC-02` | `prisma/schema.prisma` and `prisma/migrations/**` are T1B's. Phase A will not generate a second migration. Phase B (post-merge) adds an additive forward-only migration in a separate worktree after `git fetch origin && git merge --no-ff origin/main` (no rebase). | `CHOSEN` |
| `DEC-03` | The News toggle, the Sticky announcement, the URL safety, the animation enum, the color/emphasis enum, and the content revision are modeled as **plain TypeScript** types and a **typed resolver** in `public-content-controls/types.ts`. They mirror the `HomepageSettingsDto` pattern in `public-types.ts` and reuse `clampListingPageSize`-style helper signatures but live in their own file so T1B's `public-types.ts` is untouched. | `CHOSEN` |
| `DEC-04` | CTA URL accepts internal relative URLs (pathname starting with `/` and not `//`) and external `https://` URLs only. `javascript:`, `data:`, `vbscript:`, and `file:` are rejected. A path with embedded `javascript:` segment is also rejected. | `CHOSEN` |
| `DEC-05` | Animation is implemented with pure CSS keyframes. The component never renders `&lt;marquee&gt;`. `@media (prefers-reduced-motion: reduce)` zeroes the animation duration to disable the effect. | `CHOSEN` |
| `DEC-06` | The dismiss state is keyed by `contentRevision` (a stable string the admin publishes). A new revision reappears for users who dismissed the prior one. State is stored in `localStorage` under a versioned key, never in cookies or analytics. | `CHOSEN` |
| `DEC-07` | The new module is `N/A` for `BUILD_VS_ADOPT`: no third-party library is added. The repo's `package.json` is not modified. | `CHOSEN` |
| `DEC-08` | The new module is `N/A` for `BUILD_VS_AUTOMATE`: no connector, scheduler, or external worker is introduced. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Marquee / blink animation | raw `&lt;marquee&gt;`, `framer-motion`, `react-spring` | `N/A` | N/A | N/A | N/A | Pure CSS keyframes suffice; no library needed. Adding one would violate the `Library-first` policy without a `CUSTOM_BUILD_JUSTIFICATION` because we have no candidate. |
| Rich text | TipTap already in repo | `N/A` | N/A | N/A | N/A | The user query explicitly forbids rich text; structured plain-text message only. |
| Date / time | none needed | `N/A` | N/A | N/A | N/A | No scheduling in scope. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| none | N/A | `N/A` | N/A | N/A | N/A | N/A | The task is purely client-side rendering of a settings-driven DTO; no automation surface. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | A `NewsSectionToggle` DTO with `{ newsSectionEnabled: boolean }` lives in `public-content-controls/types.ts`. The default is `true` and preserves the current public-render state. |
| `RQ-02` | A `&lt;NewsSectionGate&gt;` resolver is exported; when `newsSectionEnabled === false` it returns `{ enabled: false, source: 'REAL' }` so the existing `if (!content.enabled) return null` policy in `news-section.tsx` is honored. The resolver never throws; on a missing row it returns the default `true`. |
| `RQ-03` | The `StickyAnnouncement` DTO has fields: `enabled: boolean`, `message: string`, `ctaLabel: string \| null`, `ctaUrl: string \| null`, `dismissible: boolean`, `textColor: 'on-primary' \| 'on-surface' \| 'on-secondary-container'`, `emphasis: 'NORMAL' \| 'BOLD' \| 'EXTRA_BOLD'`, `font: 'SANS' \| 'SERIF'`, `animation: 'NONE' \| 'BLINK' \| 'MARQUEE'`, `contentRevision: string`. |
| `RQ-04` | The `ctaUrl` is validated by `normalizeCtaUrl` (and a public projection `resolveCtaHref`) that accepts only: (a) relative pathnames starting with `/` and not `//`, and (b) absolute `https://` URLs. It rejects `javascript:`, `data:`, `vbscript:`, `file:`, `http:`, embedded credentials, and any URL whose normalized form contains a `javascript:` substring. Empty values yield `null`. |
| `RQ-05` | The CTA anchor in `&lt;StickyAnnouncement&gt;` always carries `target="_blank" rel="noopener noreferrer"` for external URLs and `target="_self"` for relative URLs. |
| `RQ-06` | The component renders a `&lt;div role="region" aria-label="Thông báo" aria-live="polite"&gt;` wrapper, an optional dismiss `&lt;button&gt;` with `aria-label="Đóng thông báo"`, and the message as plain text. No `dangerouslySetInnerHTML`. No `&lt;script&gt;`. No `eval`. No inline event handler attributes. |
| `RQ-07` | The component uses CSS keyframes for `BLINK` (opacity 1 → 0.55 → 1) and `MARQUEE` (transform: translateX). When `prefers-reduced-motion: reduce` is set, both animations become `animation: none` and the component does not animate. The component never renders `&lt;marquee&gt;`. |
| `RQ-08` | The component is suppressed when `enabled === false`, when `dismissible === true` AND the user has dismissed the current `contentRevision` (tracked in `localStorage` under `hrp.stickyAnnouncement.dismissed/{revision}`), and when the message is empty after trim. |
| `RQ-09` | The `&lt;StickyAnnouncement&gt;` is mounted ONLY from the public layout in Phase B. Phase A ships the component and the contract; it does NOT modify `app/(portal)/layout.tsx`. The component itself, when imported and rendered, never causes portal/admin/auth layouts to mount it. |
| `RQ-10` | A `computeContentRevision(dto)` pure function produces a stable hash from `(message, ctaLabel, ctaUrl, animation, dismissible)`. Two DTOs that produce the same hash are considered the same revision. The hash is a 16-char hex string (first 16 chars of SHA-256). The function is pure and uses `node:crypto` (server) and the Web Crypto API in browser code paths (Phase A implements both; the component uses the Web Crypto path). |
| `RQ-11` | All `URL`-shaped inputs go through `new URL()` parsing. A `normalizeCtaUrl` failure throws a typed `InvalidCtaUrlError` with a stable error code `INVALID_CTA_URL`. |
| `RQ-12` | No third-party dependency is added. `package.json` is unchanged. The new module is a pure-TS + pure-CSS addition. |

### 4.2 Scope boundaries

- **In:**
  - `src/domains/job-board/public-content-controls/**` (new directory, ~8 files).
  - `docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` (this file).
  - `docs/tasks/hrp-ui2-public-content-controls-sticky/HANDOFF.md` (Phase A closeout).
  - `docs/tasks/hrp-ui2-public-content-controls-sticky/evidence/**` (only if needed; inline where possible).
- **Out:**
  - `prisma/schema.prisma`, `prisma/migrations/**`.
  - `app/(portal)/layout.tsx`, `app/(portal)/page.tsx`, `app/(jobs)/**`, `app/admin/**`.
  - `app/api/admin/homepage-settings/**`, `app/api/public/homepage-settings/**`.
  - `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`, `app/components/FloatingChatActions.tsx`.
  - `src/domains/job-board/public-types.ts`, `src/domains/job-board/public-settings.service.ts`, `src/domains/job-board/chat-links.ts`.
  - `src/domains/job-board/components/landing/news-section.tsx`, `news-preview-modal.tsx`, `fixtures/demo-content.ts`, `components/landing/__tests__/sections-policy.test.ts`.
  - `src/shared/auth/permission-catalog.ts`.
- **Allowed task artifacts:** `docs/tasks/hrp-ui2-public-content-controls-sticky/**` and `src/domains/job-board/public-content-controls/**`.

### 4.3 Domain boundaries

- **Data/state:** Phase A introduces ZERO new database state. All types and helpers
  live in code; persistence is a Phase B concern under T1B.
- **Permission/security:** Admin mutation authority is not exercised in Phase A.
  The validators are pure functions; no route is created in Phase A.
- **Interface/API:** No new API route. The `&lt;StickyAnnouncement&gt;` component
  accepts a DTO prop; the `&lt;NewsSectionGate&gt;` accepts a DTO prop. Both are
  rendering-only.
- **Migration/rollback:** No migration in Phase A. Phase B's migration is
  single, forward-only, and additive.

## 4.4 Phase B — Canonical final delivery (this execution round)

Phase A shipped the isolated, hot-path-free module. Phase B wires the module
to the real `HomepageSettings` singleton, adds the canonical persistence fields,
authors exactly one forward-only migration, and mounts the components on the
public surface and the Admin form. Phase B is the **final-delivery surface**
that the Tier-3 LIGHT audit will freeze on.

### 4.4.1 Phase B requirements

| ID | Requirement |
|---|---|
| `RQ-13` | Add `newsSectionEnabled Boolean @default(true)` and `stickyAnnouncement Json?` to `HomepageSettings`. Both are additive. The existing singleton is preserved. |
| `RQ-14` | Author exactly one forward-only migration `20261004230000_ui2_public_content_controls` (timestamp > `20261004000000` which is the most recent migration on `origin/main`). No RLS / GRANT changes. |
| `RQ-15` | Extend `HomepageSettingsDto` and `HomepageSettingsView` with the new fields. The DTO remains backward-compatible: existing public consumers continue to receive a non-`null` value for every field they already read. |
| `RQ-16` | The DTO's `stickyAnnouncement` field is a discriminated projection that materializes the Phase A `StickyAnnouncementDto` shape. A `null` JSON column yields `null` in the DTO; an empty `{}` yields the Phase A `STICKY_ANNOUNCEMENT_DEFAULTS` projection; a valid JSON object yields the parsed DTO. The default projection is `enabled: false` and never renders the bar. |
| `RQ-17` | The public projection route `/api/public/homepage-settings` automatically exposes the new fields. The cache tag `homepage-settings` is reused (single 60s TTL). |
| `RQ-18` | The admin write route `/api/admin/homepage-settings` (POST) accepts two new optional body fields: `newsSectionEnabled` (boolean) and `stickyAnnouncement` (object matching `StickyAnnouncementSchema` or `null`). The existing fields remain unchanged. Body shape is additive. |
| `RQ-19` | Validation of the new fields runs **server-side** through the Phase A Zod schemas (`StickyAnnouncementSchema`, `NewsSectionToggleSchema`). On any schema failure the API returns 400 with the Zod error message; no field is persisted. |
| `RQ-20` | The public layout `app/(portal)/layout.tsx` mounts `<StickyAnnouncement>` exactly once at the bottom of the layout, OUTSIDE the `<main>` and `<GlobalFooter>` blocks. Admin / recruiter / vendor / worker / CTV / login / `/forbidden` layouts do NOT include this layout; they do not mount the bar. |
| `RQ-21` | The navbar entry for "Tin tức" is gated: when `newsSectionEnabled === true`, the entry renders as a route link to `/#hrp-news-heading` (anchor on the homepage where the news section lives). When `false`, the entry is hidden entirely. The existing `type: 'disabled'` "Tin tức" button is removed. |
| `RQ-22` | The public homepage `app/(portal)/page.tsx` composes a thin wrapper around the existing `<NewsSection>` mount so the section is hidden when the gate is `false`. The wrapper is in `src/domains/job-board/public-content-controls/news-section-wrapper.tsx` (new file, in-scope). The existing `news-section.tsx` is **NOT** modified. |
| `RQ-23` | The Admin form `app/admin/settings/admin-settings-form.tsx` adds two UI blocks: (a) a "Tin tức & Cẩm nang" toggle that calls the existing POST with `{ newsSectionEnabled: <BOOLEAN_PLACEHOLDER> }`; (b) a "Thông báo dưới đáy" editor with `&lt;StickyAnnouncement&gt;` form controls: enable toggle, message textarea, CTA label + URL inputs, dismissible checkbox, three allowlist selects (text color / font / emphasis / animation), and a hidden auto-managed `contentRevision` (regenerated on every content change). The form calls the existing POST with the full new field set when the sticky block is dirty. No raw HTML, no arbitrary CSS, no `dangerouslySetInnerHTML`. URL safety uses `normalizeCtaUrl` from Phase A. |
| `RQ-24` | The Admin settings server page `app/admin/settings/page.tsx` projects the new DTO into `initialSettings` so the form receives the live `newsSectionEnabled` + `stickyAnnouncement` values. When the migration is not yet applied, the `unavailableReason` branch is taken (consistent with the existing P2021/P2022 fallback). |
| `RQ-25` | The default `newsSectionEnabled === true` is preserved at all four read paths: `getHomepageSettings` read, `toHomepageSettingsDto` projection, public projection route, admin initial state. The default `stickyAnnouncement === null` yields `enabled: false` (Phase A defaults) and never renders the bar out of the box. |
| `RQ-26` | The migration file lives at `prisma/migrations/20261004230000_ui2_public_content_controls/migration.sql`. The migration adds the two columns, the boolean default, and a CHECK constraint that the JSON column (when non-null) is a top-level object (`jsonb_typeof` check) and is bounded in size (≤ 4 KB). |
| `RQ-27` | No RLS, GRANT, or role-matrix changes. The admin write path remains the existing ADMIN / HR_MANAGER / DIRECTOR allowlist. |
| `RQ-28` | `package.json` is unchanged. No new dependency is added. The Zod schema already used in Phase A is the same Zod used here (3.24.x). |
| `RQ-29` | Static-fence coverage in Phase B. The `content-controls.static.test.ts` fence is extended to also cover the new Phase B files: `use-public-content-controls.ts`, `news-section-wrapper.tsx`, and the new UI2 blocks inside `app/admin/settings/admin-settings-form.tsx`. The fence continues to assert no `dangerouslySetInnerHTML`, no `&lt;SCRIPT`, no `&lt;MARQUEE`, no `&lt;SCRIPT_`, no `data:text/html`, no `vbscript:`, no `eval(`, no inline `on*=`. |

### 4.4.2 Phase B scope boundaries

- **In (additive to Phase A):**
  - `prisma/schema.prisma` (additive — two new columns, no destructive change).
  - `prisma/migrations/20261004230000_ui2_public_content_controls/migration.sql` (single new file).
  - `app/(portal)/layout.tsx` (one-line mount of `<StickyAnnouncement>`).
  - `app/components/GlobalNavbar.tsx` (replace the disabled "Tin tức" button with a gate-aware link).
  - `app/admin/settings/admin-settings-form.tsx` (additive new blocks; existing fields preserved).
  - `app/admin/settings/page.tsx` (project new fields into `initialSettings`; fall through existing unavailable branch when needed).
  - `app/api/admin/homepage-settings/route.ts` (additive new fields in body, additive new validation branch).
  - `app/api/public/homepage-settings/route.ts` (no code change required — uses `getHomepageSettings` DTO; verify coverage only).
  - `src/domains/job-board/public-types.ts` (additive: new optional DTO fields; existing fields preserved).
  - `src/domains/job-board/public-settings.service.ts` (additive: new columns mapped, new DTO fields, new write-path branch; existing branches preserved).
  - `src/domains/job-board/public-content-controls/news-section-wrapper.tsx` (NEW — composition wrapper, no data fetch beyond what page.tsx already does).
  - `src/domains/job-board/public-content-controls/dto-projection.ts` (NEW — pure helpers: `toStickyAnnouncementDto(value: unknown): StickyAnnouncementDto | null`, `toNewsSectionToggle(row: { newsSectionEnabled: boolean }): NewsSectionToggle`).
  - `src/domains/job-board/public-content-controls/__tests__/dto-projection.test.ts` (NEW).
  - `src/domains/job-board/public-content-controls/__tests__/news-section-wrapper.test.tsx` (NEW).
  - `prisma/migrations/20261004230000_ui2_public_content_controls/migration.test.ts` (NEW — pattern from `homepage-chat-links-migration.test.ts`).
  - `docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` (this spec v1.1).
  - `docs/tasks/hrp-ui2-public-content-controls-sticky/HANDOFF.md` (Phase B closeout).

- **Out (forbidden in Phase B):**
  - `prisma/migrations/**` other than the new `20261004230000_*` folder.
  - `app/(jobs)/**`, `app/(portal)/page.tsx` (the homepage data-fetch page is T1B-owned; the wrapper is the new mount point, not the page).
  - `app/components/GlobalFooter.tsx`, `app/components/FloatingChatActions.tsx`, `app/components/ContactForm.tsx`.
  - `app/api/admin/**` other than `homepage-settings/route.ts`.
  - `app/admin/**` other than `settings/page.tsx` and `settings/admin-settings-form.tsx`.
  - `src/domains/job-board/components/landing/news-section.tsx` (existing section, untouched).
  - `src/domains/job-board/components/landing/news-preview-modal.tsx`.
  - `src/domains/job-board/components/landing/__tests__/sections-policy.test.ts`.
  - `src/domains/job-board/chat-links.ts` (T1B-owned; URL safety for chat is reused, not re-authored).
  - `src/domains/job-board/fixtures/demo-content.ts`.
  - `src/shared/auth/permission-catalog.ts`.
  - `app/components/GlobalNavbar.tsx` beyond replacing the existing "Tin tức" button row and reading the gate.

### 4.4.3 Phase B acceptance criteria

| AC | Pass condition | Verification |
|---|---|---|
| `AC-19` | `git fetch origin && git rev-parse origin/main` returns `796e13c69996756d1298bc1a7ec9b50bab935c9f`. | `git rev-parse origin/main` |
| `AC-20` | `git merge --no-ff origin/main` produces a merge commit on `codex/t1c-ui2-public-content-controls`. The merge has exactly two parents: HEAD (Phase A control head `0d4a606c…`) and `796e13c6…`. | `git log -1 --pretty=%P` of the merge commit |
| `AC-21` | `git status --porcelain -- app/(portal)/layout.tsx app/(portal)/page.tsx app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx app/components/FloatingChatActions.tsx app/api/public/homepage-settings/route.ts app/admin/settings/page.tsx src/domains/job-board/chat-links.ts src/domains/job-board/fixtures/demo-content.ts` (Phase A forbidden paths, post-merge) is empty. | `git status --porcelain` |
| `AC-22` | `prisma/schema.prisma` adds exactly two new fields on the `HomepageSettings` model: `newsSectionEnabled Boolean @default(true) @map("news_section_enabled")` and `stickyAnnouncement Json? @map("sticky_announcement")`. No other model is modified. | `git diff origin/main HEAD -- prisma/schema.prisma` |
| `AC-23` | The migration `prisma/migrations/20261004230000_ui2_public_content_controls/migration.sql` exists, contains `ALTER TABLE "homepage_settings" ADD COLUMN "news_section_enabled" BOOLEAN NOT NULL DEFAULT TRUE` and `ADD COLUMN "sticky_announcement" JSONB`, plus a CHECK constraint that the JSON column is a top-level object (when non-null) and ≤ 4096 bytes. The migration does NOT touch RLS, GRANT, or other tables. | `migration.test.ts` |
| `AC-24` | `npx --no-install prisma validate` exits 0. | shell |
| `AC-25` | `getHomepageSettings` returns a DTO that always includes `newsSectionEnabled: boolean` and `stickyAnnouncement: StickyAnnouncementDto \| null` (or the Phase A defaults when the column is `null` and the default is applied). | `public-settings.test.ts` extended cases |
| `AC-26` | `updateHomepageSettings` accepts `newsSectionEnabled` and `stickyAnnouncement` in the input. The sticky field is round-tripped through Zod `StickyAnnouncementSchema.parse`; on failure it throws a `ZodError`. | `public-settings.test.ts` extended cases |
| `AC-27` | The public projection route `/api/public/homepage-settings` returns the new fields in the JSON body when the row has them. | `vitest` integration test using `next/test` route handler |
| `AC-28` | The admin route `/api/admin/homepage-settings` (POST) accepts `{ newsSectionEnabled: false, stickyAnnouncement: { enabled: true, message: 'Hello', ctaLabel: 'Mở', ctaUrl: 'https://hrpartner.vn/about', dismissible: true, textColor: 'on-primary', font: 'SANS', emphasis: 'BOLD', animation: 'NONE', contentRevision: 'rev-1' } }`, persists it, and revalidates the public cache. The status is 200. | admin route test |
| `AC-29` | The admin route rejects `stickyAnnouncement: { enabled: true, message: 'X'.repeat(300), … }` (over the 280-char limit) with 400 and an INVALID_INPUT message. | admin route test |
| `AC-30` | The admin route rejects `stickyAnnouncement: { enabled: true, ctaUrl: 'javascript:alert(1)', … }` (URL safety) with 400 and an INVALID_INPUT message. | admin route test |
| `AC-31` | `app/(portal)/layout.tsx` contains exactly one `&lt;StickyAnnouncement&gt;` mount. No admin/recruiter/worker/CTV/login/`/forbidden` layout file imports `&lt;StickyAnnouncement&gt;`. | grep + diff |
| `AC-32` | The navbar entry "Tin tức" appears when `newsSectionEnabled === true` and is hidden when `false`. Implementation: a `usePublicContentControls()` hook (NEW file, in-scope) reads the gate from a `SWR`/`fetch('/api/public/homepage-settings')` call. | nav + gate test |
| `AC-33` | The news section composition wrapper (`news-section-wrapper.tsx`) reads the gate and returns `null` when `enabled === false`. The wrapper is rendered in `app/(portal)/page.tsx` next to the existing `<NewsSection>` mount. The existing `news-section.tsx` file is unchanged. | wrapper test + diff scope check |
| `AC-34` | The admin form `&lt;AdminSettingsForm&gt;` renders the news toggle and the sticky editor. Saving one field alone issues a partial PATCH-equivalent POST (i.e. only the dirty field goes in the body). The form does not introduce any new `dangerouslySetInnerHTML`, `&lt;SCRIPT_`, `&lt;MARQUEE`, inline `ONCLICK` JSX props, or arbitrary CSS. | `content-controls.static.test.ts` extended (now fences both Phase A module AND the admin form's UI2 blocks) |
| `AC-35` | `npm run typecheck` exits 0. | shell |
| `AC-36` | `npm run lint -- src/domains/job-board/public-content-controls src/domains/job-board/public-settings.service.ts src/domains/job-board/public-types.ts app/(portal)/layout.tsx app/components/GlobalNavbar.tsx app/admin/settings/admin-settings-form.tsx app/admin/settings/page.tsx app/api/admin/homepage-settings/route.ts` exits 0. | shell |
| `AC-37` | `npm run test:unit -- src/domains/job-board/public-content-controls src/domains/job-board/public-settings.test.ts` exits 0 with all new and existing tests passing. | shell |
| `AC-38` | `npm run build` exits 0. | shell |
| `AC-39` | `node .ai-pipeline/scripts/verify-encoding.mjs` exits 0 with `RESULT: PASS`. | shell |
| `AC-40` | `git diff --check` exits 0. | shell |
| `AC-41` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` exits 0 with `RESULT: PASS`. | shell |
| `AC-42` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` exits 0 with `RESULT: PASS`. | shell |
| `AC-43` | The migration `20261004230000_*` is the latest by lexicographic timestamp on this branch. | `ls prisma/migrations/ | sort \| tail -1` |
| `AC-44` | Synthetic DB integration: apply pending migrations with `npx --no-install prisma migrate deploy`; the Vitest test verifies the UI2 migration is applied, then issues a read + write through the service and asserts the new DTO is returned. If no test database URLs are available, the integration test is **skipped** (not failed) and the evidence row names the limitation explicitly. | `public-settings.integration.test.ts` (registered in `vitest.integration-files.ts`; skip only when both test URLs are absent) |

### 4.4.4 Phase B execution plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-11` | Forward-merge `origin/main` into `codex/t1c-ui2-public-content-controls` via `git merge --no-ff origin/main`. | Bring UI2 onto the latest main (PR #94 + PR #95 already merged). | `git log -1 --pretty=%P` shows two parents; HEAD is a merge commit. | Merge conflict in UI2-owned surface; if conflict touches auth/RLS/lifecycle or T1B localization, STOP and report to T0. |
| `STEP-12` | `prisma/schema.prisma` — append two new fields to `HomepageSettings`. | Materialize persistence contract. | `npx --no-install prisma validate` exits 0. | Schema validation fails. |
| `STEP-13` | `prisma/migrations/20261004230000_ui2_public_content_controls/migration.sql` (new) + `migration.test.ts`. | Single forward-only migration. | `migration.test.ts` passes. | Migration file missing or contains forbidden statements. |
| `STEP-14` | `src/domains/job-board/public-types.ts` — add `newsSectionEnabled: boolean` and `stickyAnnouncement: StickyAnnouncementDto \| null` to `HomepageSettingsDto`. Add the same to `HomepageSettingsView` via the existing `settings`/`source`/`defaultBestJobsPageSize`/`defaultListingPageSize` surface. | DTO extension. | `npm run typecheck`. | Tsc fails. |
| `STEP-15` | `src/domains/job-board/public-settings.service.ts` — extend `SettingsRow`, `toHomepageSettingsDto`, `getHomepageSettings`, `UpdateHomepageSettingsInput`, `updateHomepageSettings`. | Service extension. | `npm run test:unit -- src/domains/job-board/public-settings.test.ts`. | Tests fail. |
| `STEP-16` | `src/domains/job-board/public-content-controls/dto-projection.ts` (new) + `__tests__/dto-projection.test.ts`. | Pure helpers for DTO → DB-row conversion with Zod parse at the boundary. | `vitest` green. | Tests fail. |
| `STEP-17` | `app/api/admin/homepage-settings/route.ts` — accept new fields, validate via Zod, pass to service. | Admin API. | Admin route test green. | Validation fails. |
| `STEP-18` | `app/(portal)/layout.tsx` — mount `<StickyAnnouncement>`. | Public mount. | `git diff` shows exactly one mount. | Wrong mount location. |
| `STEP-19` | `src/domains/job-board/public-content-controls/use-public-content-controls.ts` (new) + `__tests__/use-public-content-controls.test.tsx` — client hook reading `/api/public/homepage-settings` and exposing the gate + sticky DTO. | Client gate source. | `vitest` green. | Hook returns wrong shape. |
| `STEP-20` | `app/components/GlobalNavbar.tsx` — replace the disabled "Tin tức" button with a gate-aware link to `/#hrp-news-heading`. | Navbar gate. | `git diff` shows the replacement; nav test green. | Old `type: 'disabled'` button still present. |
| `STEP-21` | `src/domains/job-board/public-content-controls/news-section-wrapper.tsx` (new) + `__tests__/news-section-wrapper.test.tsx` — composition wrapper reading the hook and returning the existing `<NewsSection>` or `null`. | Section gate. | Wrapper test green; `news-section.tsx` unchanged. | Wrapper mutates section data-fetch shape. |
| STEP-22 | app/(portal)/page.tsx — replace the direct &lt;NewsSection&gt; mount with &lt;NewsSectionWrapper content={demoNewsSection} /&gt;. (Tiny composition: import the wrapper, render it in place of the section.) | Wire the gate. | git diff is a 1-line import + 1-line render. | Edit breaks existing tests. |
| `STEP-23` | `app/admin/settings/admin-settings-form.tsx` — add the news toggle block + the sticky announcement editor block. Auto-managed `contentRevision` is a `useMemo` over the editor fields. | Admin UI. | Form snapshot + lint green. | Form introduces forbidden patterns. |
| `STEP-24` | `app/admin/settings/page.tsx` — project `newsSectionEnabled` and `stickyAnnouncement` into `initialSettings` via the new DTO. | Server initial state. | Build green; typecheck green. | Field projection missing. |
| `STEP-25` | Run all canonical gates on the changed surface. | Phase B freeze. | All of `AC-35` … `AC-42` green. | Any gate fails. |
| `STEP-26` | `git add` only the UI2-owned surface (NOT the untracked `pnpm-lock.yaml` / `pnpm-workspace.yaml`). Commit. | Freeze. | `git status --porcelain -- UI2_SURFACE_GLOB` is empty. | Working tree dirty. |
| `STEP-27` | Update `HANDOFF.md` to Phase B `READY_FOR_AUDIT` / `ELIGIBLE`. | Hand-off. | `verify-handoff.ps1` green. | Handoff status mismatch. |

### 4.4.5 Phase B risks

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-06` | Forward-merge conflict in `prisma/schema.prisma` if T1B added a same-named field. | The diff scope is checked BEFORE authoring Phase B's additive migration. If T1B added `newsSectionEnabled` or `stickyAnnouncement`, Phase B adopts their shape and adds only the missing fields. If T1B added a conflicting shape, STOP and report to T0. |
| `RISK-07` | The admin form editor block uses an internal `useMemo` for `contentRevision`. The hash must change only when an admin edits one of the editor fields, NOT on every keystroke outside the editor. | The `useMemo` deps include only the editor fields, not the unrelated page-size selectors. |
| `RISK-08` | The `<StickyAnnouncement>` mount in `app/(portal)/layout.tsx` could double-render on routes that have a child layout. | Mount is in the public-portal layout only; admin/recruiter/worker/CTV/login use their own root layout (`app/(admin)/layout.tsx` etc.) and do not include this file. The component has its own deduping on `contentRevision`. |
| `RISK-09` | The migration adds a NOT NULL default. Existing singleton rows are upgraded in-place by Postgres (no backfill script required). | The default `TRUE` is the desired Phase B default; existing rows are forward-migrated automatically. |
| `RISK-10` | Synthetic DB integration test needs Postgres; environments without the dedicated test writer/admin URLs cannot execute it. | Test self-skips only when both `DATABASE_URL_TEST` and `DATABASE_URL_ADMIN_TEST` are absent; the registered integration lane requires a synthetic-only pair and the applied migration. |

## 5. Execution Plan

Phase A has exactly one round. The steps are ordered to keep the worktree green
between steps so the audit DELTA sees a clean diff.

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/job-board/public-content-controls/types.ts` (new) | Materialize `NewsSectionToggle`, `StickyAnnouncementDto`, and supporting enums (`StickyAnimation`, `StickyTextColor`, `StickyEmphasis`, `StickyFont`). | `npm run typecheck` | Tsc fails on enum collisions or duplicate names. |
| `STEP-02` | `src/domains/job-board/public-content-controls/url-safety.ts` (new) | `normalizeCtaUrl`, `resolveCtaHref`, `InvalidCtaUrlError`. | `npm run test:unit -- public-content-controls/url-safety` | URL safety unit tests fail. |
| `STEP-03` | `src/domains/job-board/public-content-controls/revision.ts` (new) | `computeContentRevision` (Web Crypto + node:crypto) + `compareContentRevisions`. | `npm run test:unit -- public-content-controls/revision` | Revision tests fail. |
| `STEP-04` | `src/domains/job-board/public-content-controls/animation.ts` (new) | `getAnimationClass(animation, prefersReducedMotion)` returning one of the three CSS class names + `NONE`. | `npm run test:unit -- public-content-controls/animation` | Animation tests fail. |
| `STEP-05` | `src/domains/job-board/public-content-controls/news-section-gate.ts` (new) | `resolveNewsSectionGate(dto)` pure function returning `{ enabled, source }`. | `npm run test:unit -- public-content-controls/news-section-gate` | Gate tests fail. |
| `STEP-06` | `src/domains/job-board/public-content-controls/sticky-announcement.tsx` + `sticky-announcement.module.css` (new) | Component + CSS module with three keyframes (NONE / BLINK / MARQUEE) + reduced-motion override. | `npm run test:unit -- public-content-controls/sticky-announcement` | Render tests fail. |
| `STEP-07` | `src/domains/job-board/public-content-controls/index.ts` (new) | Re-export the public surface used by Phase B mounts. | `npm run typecheck` | Tsc complains about re-export. |
| `STEP-08` | `src/domains/job-board/public-content-controls/content-controls.static.test.ts` (new) | Static analysis fence: no `dangerouslySetInnerHTML`, no `&lt;script&gt;`, no `&lt;marquee&gt;`, no `javascript:`, no `data:`, no `vbscript:`, no `on*=` event attributes in the module, no raw HTML, no `eval`, no `target=` without `rel=`. | `npm run test:unit -- public-content-controls/content-controls.static` | Static fence fails. |
| `STEP-09` | `docs/tasks/hrp-ui2-public-content-controls-sticky/HANDOFF.md` (new) | Phase A closeout: Implementation SHA, status, evidence, Phase B hand-off conditions. | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | HANDOFF gate fails. |
| `STEP-10` | Encoding + lint + unit + typecheck | Final canonical-gate run on the changed surface only. | `node .ai-pipeline/scripts/verify-encoding.mjs`; `npm run typecheck`; `npm run lint -- src/domains/job-board/public-content-controls docs/tasks/hrp-ui2-public-content-controls-sticky`; `npm run test:unit -- public-content-controls` | Any gate fails. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | All seven new TS/TSX/CSS files exist, are tracked in the worktree, and contain no UTF-8 BOM (no `EF BB BF`), no `CRLF` outside what the repo already uses, and no U+FFFD replacement character. | `node .ai-pipeline/scripts/verify-encoding.mjs` |
| `AC-02` | `npm run typecheck` exits 0 with the new files in scope and T1B files unchanged. | `npm run typecheck` |
| `AC-03` | `npm run test:unit -- src/domains/job-board/public-content-controls` exits 0 with all new tests passing. | `npm run test:unit -- src/domains/job-board/public-content-controls` |
| `AC-04` | `normalizeCtaUrl` accepts: `/contact`, `/jobs?area=hcm`, `https://hrpartner.vn/contact`; rejects: `javascript:alert(1)`, `data:text/html,foo`, `vbscript:msgbox(1)`, `file:///etc/passwd`, `http://insecure.example/`, `https://user:pw@host/`, `//evil.com/x`. The rejection throws `InvalidCtaUrlError` whose `code === 'INVALID_CTA_URL'`. | vitest `url-safety.test.ts` |
| `AC-05` | `resolveCtaHref` returns the canonical string for accepted inputs and `null` for any rejected input (defense-in-depth projection, mirroring `resolveChatHref` in `chat-links.ts`). | vitest `url-safety.test.ts` |
| `AC-06` | `computeContentRevision` is pure, deterministic, and stable across two DTOs that differ in no observable field. Two DTOs that differ in `message` or `ctaUrl` produce different 16-char hex revisions. | vitest `revision.test.ts` |
| `AC-07` | `&lt;StickyAnnouncement&gt;` renders `role="region" aria-label="Thông báo"` when `enabled === true` and a non-empty message; renders `null` when `enabled === false`; renders `null` when the message is empty after `trim()`. | vitest `sticky-announcement.test.tsx` |
| `AC-08` | `&lt;StickyAnnouncement&gt;` adds `target="_blank" rel="noopener noreferrer"` for external `https://` URLs and `target="_self"` for relative URLs. | vitest `sticky-announcement.test.tsx` |
| `AC-09` | `&lt;StickyAnnouncement&gt;` does NOT include the substring `&lt;marquee` anywhere in its rendered output for any of the three animation values. | `npm run test:unit -- src/domains/job-board/public-content-controls/sticky-announcement.test.tsx -t "does NOT include"` exits 0. |
| `AC-10` | `&lt;StickyAnnouncement&gt;` includes the animation class only when the reduced-motion media query is NOT active. The static CSS includes `@media (prefers-reduced-motion: reduce) { ... animation: none ... }`. | `npm run test:unit -- src/domains/job-board/public-content-controls/content-controls.static.test.ts -t "reduced-motion"` exits 0. |
| `AC-11` | `resolveNewsSectionGate({ newsSectionEnabled: true })` returns `{ enabled: true, source: 'REAL' }`; `resolveNewsSectionGate({ newsSectionEnabled: false })` returns `{ enabled: false, source: 'REAL' }`; `resolveNewsSectionGate(null)` returns `{ enabled: true, source: 'INTEGRATION_PENDING' }` (default ON to preserve current public state). | `npm run test:unit -- src/domains/job-board/public-content-controls/news-section-gate.test.ts` |
| `AC-12` | The static fence rejects any forbidden pattern in the new module: `dangerouslySetInnerHTML`, `&lt;script`, `onerror=`, `onclick=` (as JSX prop), `javascript:`, `data:text/html`, `vbscript:`, `target=` without `rel=`, `eval(`. | `npm run test:unit -- src/domains/job-board/public-content-controls/content-controls.static.test.ts` exits 0. |
| `AC-13` | `package.json` is unchanged. `pnpm-lock.yaml` is unchanged. | `git status --porcelain -- package.json pnpm-lock.yaml` outputs nothing. |
| `AC-14` | `prisma/schema.prisma` and `prisma/migrations/**` are unchanged. | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` outputs nothing. |
| `AC-15` | `app/(portal)/layout.tsx`, `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`, `app/api/admin/homepage-settings/route.ts`, `app/api/public/homepage-settings/route.ts`, `app/admin/settings/page.tsx`, `app/admin/settings/admin-settings-form.tsx` are unchanged. | `git status --porcelain -- each of those 8 paths` outputs nothing. |
| `AC-16` | `src/domains/job-board/public-types.ts`, `public-settings.service.ts`, `chat-links.ts`, `components/landing/news-section.tsx`, `components/landing/news-preview-modal.tsx`, `fixtures/demo-content.ts`, `components/landing/__tests__/sections-policy.test.ts` are unchanged. | `git status --porcelain -- each of those 7 paths` outputs nothing. |
| `AC-17` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` exits 0. | `verify-handoff.ps1` |
| `AC-18` | Every `npm run {name}` token in this TASK (e.g. `typecheck`, `lint`, `test:unit`) corresponds to a script defined in `package.json` `scripts`. | `verify-task.ps1` T-01 dry-run. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-05` | `AC-11` |
| `RQ-02` | `STEP-05` | `AC-11` |
| `RQ-03` | `STEP-01`, `STEP-06` | `AC-07` |
| `RQ-04` | `STEP-02` | `AC-04`, `AC-05`, `AC-12` |
| `RQ-05` | `STEP-06` | `AC-08` |
| `RQ-06` | `STEP-06`, `STEP-08` | `AC-07`, `AC-12` |
| `RQ-07` | `STEP-04`, `STEP-06`, `STEP-08` | `AC-09`, `AC-10` |
| `RQ-08` | `STEP-06` | `AC-07` |
| `RQ-09` | `STEP-06` | `AC-15` |
| `RQ-10` | `STEP-03` | `AC-06` |
| `RQ-11` | `STEP-02` | `AC-04` |
| `RQ-12` | `STEP-07`, `STEP-10` | `AC-13` |

### 6.2.1 Phase B Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-13` | `STEP-12` | `AC-22` |
| `RQ-14` | `STEP-13` | `AC-23`, `AC-43` |
| `RQ-15` | `STEP-14`, `STEP-15` | `AC-25` |
| `RQ-16` | `STEP-14`, `STEP-15`, `STEP-16` | `AC-25`, `AC-44` |
| `RQ-17` | `STEP-14`, `STEP-15` | `AC-27` |
| `RQ-18` | `STEP-17`, `STEP-24` | `AC-28`, `AC-34` |
| `RQ-19` | `STEP-16`, `STEP-17` | `AC-29`, `AC-30` |
| `RQ-20` | `STEP-18` | `AC-31` |
| `RQ-21` | `STEP-19`, `STEP-20` | `AC-32` |
| `RQ-22` | `STEP-19`, `STEP-21`, `STEP-22` | `AC-33` |
| `RQ-23` | `STEP-23` | `AC-34` |
| `RQ-24` | `STEP-24` | `AC-28` |
| `RQ-25` | `STEP-14`, `STEP-15` | `AC-25`, `AC-27` |
| `RQ-26` | `STEP-13` | `AC-23`, `AC-43` |
| `RQ-27` | `STEP-17` | `AC-28` |
| `RQ-28` | `STEP-25` | `AC-36` |
| `RQ-29` | `STEP-25` | `AC-37` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | T1B UI V1 may restructure `app/(portal)/layout.tsx` in a way that the Phase B mount point for `&lt;StickyAnnouncement&gt;` no longer exists. | Phase A does not mount; Phase B picks the mount from a single source-of-truth (the post-merge layout) and re-derives a one-line mount + test. |
| `RISK-02` | T1B may add a `newsSectionEnabled` field independently. Conflict at schema level. | Phase A does not add the field. Phase B uses `git diff prisma/schema.prisma` before authoring the additive migration; if T1B already added a same-named field, Phase B adopts their shape and only adds the sticky-related fields. |
| `RISK-03` | The static-source-analysis fence (`AC-12`) may flag unrelated `dangerouslySetInnerHTML` mentions in license/header comments. | The static test strips block and line comments before matching, mirroring `public-listing.static.test.ts`. |
| `RISK-04` | `localStorage` is unavailable in some contexts (SSR, private mode). | The component is a Client Component and `useEffect` is the only `localStorage` access. The first server render returns `enabled=true` (default), then hydration reconciles the dismiss state. A `typeof window === 'undefined'` guard prevents SSR crashes. |
| `RISK-05` | T1B's planned `homepage-settings` cache invalidation may use a different tag. | Phase A does not touch cache tags. Phase B uses the same `homepage-settings` tag (the existing convention). |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 appends after review/audit. Audit `NONE` resolves directly from HANDOFF; `LIGHT` resolves from AUDIT.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-04` | Initial contract | Initial |
| `v1.0` | `2026-10-04` | Control fields flipped to `Status: READY_FOR_EXECUTION`, `Contract gate: READY_TO_CODE`, `Decision state: CLOSED`, `Current execution round: 1`, `Next gate: WAIT_UI_V1_MAIN_THEN_PHASE_B`. Phase A checkpoint recorded as `53696afb3f644a3df06d4cf772828446f16f30d6`. `Frozen delivery: YES` (the Phase A commit is frozen as a checkpoint, per H-16 gate constraint; final delivery remains `FINAL_PENDING` per T0 until Phase B freezes its own commit), `Canonical gates: FINAL_PENDING` (final-gate surface; phase A in-module gates already PASS), `Audit eligibility: NOT_ELIGIBLE`, `Correction budget used: 0`. HTML/JSX literal mentions in the body encoded as `&lt;...&gt;` so the A-04 placeholder gate passes for an executable contract. Phase B remains the canonical final-delivery surface (schema, single migration, mount points) and will not start until T1B UI V1 has merged and `origin/main` carries it. | T0 verdict `PHASE_A_ACCEPTED / FINAL_DELIVERY_NOT_READY_FOR_AUDIT`. Phase A is a CHECKPOINT, not the audit anchor. |
| `v1.1` | `2026-10-04` | Phase B section §4.4 added. Spec version bumped. `Baseline` set to `796e13c69996756d1298bc1a7ec9b50bab935c9f` (`origin/main` after PR #94 + PR #95). `Current execution round: 2`. `Next gate: PHASE_B_T1C_EXECUTION`. Phase A in-scope roots retained. Phase B in-scope roots / forbidden paths split. Phase B requirements `RQ-13` … `RQ-28`, acceptance `AC-19` … `AC-44`, execution plan `STEP-11` … `STEP-27`, and risks `RISK-06` … `RISK-10` added. T0 disposition `RESUME UI2 PHASE B NOW` (2026-10-04 16:21 ICT) with both prerequisite gates (PR #94 + PR #95) confirmed PASS. Forward-merge `origin/main` into `codex/t1c-ui2-public-content-controls` is the first Phase B step. | T0 disposition to RESUME UI2 Phase B with gates confirmed (PR #94 + PR #95 merged, `origin/main = 796e13c6…`, main CI run 37191624366 PASS). |
| `v1.1.1` | `2026-10-04` | T0 pre-audit correction 1/1: added and registered the AC-44 synthetic PostgreSQL integration test, repaired TASK UTF-8/mojibake and STEP-22 path, and reconciled correction-budget usage. No UI2 runtime contract or scope changed. | T0 verdict `CHANGES_REQUIRED_TEST_AND_DOCS / NOT_READY_FOR_AUDIT`. |