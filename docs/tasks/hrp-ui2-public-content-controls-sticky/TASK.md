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
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Phase A checkpoint | `53696afb3f644a3df06d4cf772828446f16f30d6` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Correction budget used | `0` |
| Frozen delivery | `YES` |
| Canonical gates | `FINAL_PENDING` |
| Audit eligibility | `NOT_ELIGIBLE` |
| In-scope roots | `src/domains/job-board/public-content-controls/**`; `docs/tasks/hrp-ui2-public-content-controls-sticky/**` |
| Forbidden paths | `prisma/schema.prisma`; `prisma/migrations/**`; `app/(portal)/layout.tsx`; `app/(portal)/page.tsx`; `app/(jobs)/**`; `app/admin/**`; `app/api/admin/homepage-settings/**`; `app/api/public/homepage-settings/**`; `app/components/GlobalNavbar.tsx`; `app/components/GlobalFooter.tsx`; `app/components/FloatingChatActions.tsx`; `src/domains/job-board/public-types.ts`; `src/domains/job-board/public-settings.service.ts`; `src/domains/job-board/chat-links.ts`; `src/domains/job-board/components/landing/news-section.tsx`; `src/domains/job-board/components/landing/news-preview-modal.tsx`; `src/domains/job-board/fixtures/demo-content.ts`; `src/domains/job-board/components/landing/__tests__/sections-policy.test.ts`; `src/shared/auth/permission-catalog.ts` |
| Required gates | `pwsh .ai-pipeline/scripts/verify-pipeline.ps1`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `npm run typecheck`; `npm run lint -- src/domains/job-board/public-content-controls docs/tasks/hrp-ui2-public-content-controls-sticky`; `npm run test:unit -- src/domains/job-board/public-content-controls` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `WAIT_UI_V1_MAIN_THEN_PHASE_B` |

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
