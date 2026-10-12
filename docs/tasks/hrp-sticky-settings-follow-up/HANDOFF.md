# HANDOFF — `hrp-sticky-settings-follow-up`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-sticky-settings-follow-up` |
| Spec version | `v1.1` |
| Audit mode | `NONE` |
| Audit mode (phải khớp TASK) | `NONE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `STANDARD` |
| Baseline | `f74ab92cb0e79d5b7ebaa750cf5f4d5a9b94b22b` |
| Implementation SHA | `07fd79af8e7ba143b86fedcb47864faad2b5de86` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Correction batches used | `0` |
| Audit eligibility | `NOT_REQUIRED` |
| Status | `READY_FOR_REVIEW` |
| Execution round | `1` |
| Next gate | `T0_PUSH_PR_MERGE` |
| Production migration | `NOT_RUN` |
| Worktree | `C:\CodeApp\HrP-t1c2-sticky-settings-followup` |
| Branch | `codex/t1c2-sticky-settings-followup` |
| Baseline origin | `f74ab92c… = origin/main @ takeover` |

> `Implementation SHA` = `07fd79af8e7ba143b86fedcb47864faad2b5de86` (semantic commit
> only — 18 files, +290/-39, no schema, no migration, no T1A delta). Tier 1
> self-review per `tier1.md` `Audit mode: NONE` rule (top-three risks); no
> Tier 3 audit.

## 1. Outcome and changed surface

### 1.1 User-visible outcome

- **Bottom Sticky admin group now owns opacity + marquee duration** (lives
  under `<fieldset data-testid="ui2-sticky-announcement-block">` in
  `app/admin/settings/admin-settings-form.tsx`).
- **Background opacity is foreground-safe.** The container, text, CTA and
  dismiss control never carry a CSS `opacity:` property; opacity is
  applied only to the `::before` background pseudo-element via
  `color-mix(... var(--sticky-background-opacity), transparent)`. BLINK
  animates the pseudo-element only.
- **Marquee cycle is bounded 5–60 seconds**, default 18. CSS
  `animation: hrpStickyAnnouncementMarquee var(--sticky-marquee-duration, 18s) linear infinite`.
  The Zod schema `marqueeDurationSeconds: z.number().int().min(5).max(60).default(18)`
  fails closed at the validation boundary.
- **Duration is MARQUEE-only.** The slider
  `data-testid="sticky-marquee-duration-input"` is
  `disabled={stickyAnimation !== 'MARQUEE'}`, so changing the
  animation has no other effect.
- **Close control fits the band and keeps a 44×44 hit target.**
  `.hrpStickyAnnouncementDismiss` is `width: 28px; height: 28px`
  (visible footprint ≤28px), sitting inside the 36px-tall background
  band (bar `min-height: 44px` minus 4px top/bot inset). The
  `.hrpStickyAnnouncementDismiss::after` pseudo-element expands the
  effective hit area to 44×44 px without changing the bar height.
- **Reduced motion is honored.** `@media (prefers-reduced-motion: reduce)`
  collapses both BLINK's `::before` animation and the MARQUEE track
  animation to `none`, hides the duplicate track, and switches the
  message back to normal wrapping.
- **Backward compatibility.** Absent `marqueeDurationSeconds` in legacy
  JSON defaults to 18; revision hash changes when either opacity or
  duration changes.

### 1.2 Non-goals (verified untouched)

- No Prisma migration / schema change (T1C2 adds zero new DB columns;
  the existing `stickyAnnouncement Json?` carries the two new keys).
- No auth / RLS / role-matrix change.
- No Tier 3 / `AUDIT.md`.
- T1A scope is untouched.
- Production DB is not accessed; deployment changes are out of scope.

### 1.3 Changed surface (this freeze, 18 files)

| Layer | File | Change |
|---|---|---|
| DTO | `src/domains/job-board/public-content-controls/types.ts` | Added `backgroundOpacity` + `marqueeDurationSeconds` to `StickyAnnouncementDto` and `StickyAnnouncementSchema` (`min(0).max(100).default(100)` and `min(5).max(60).default(18)` respectively); updated `STICKY_ANNOUNCEMENT_DEFAULTS`. |
| Revision | `src/domains/job-board/public-content-controls/revision.ts` | Revision hash now includes the new fields; both keys participate in change detection. |
| Component | `src/domains/job-board/public-content-controls/sticky-announcement.tsx` | Forwards new fields as CSS custom properties on the inline style; renders normally otherwise. |
| CSS | `src/domains/job-board/public-content-controls/sticky-announcement.module.css` | Opacity lives on the `::before` pseudo; BLINK animates the pseudo; marquee duration consumed via `var(--sticky-marquee-duration, 18s)`; close button 28×28 px visible + 44×44 px hit-area via `::after`; reduced-motion media query stops both animations. |
| Admin form | `app/admin/settings/admin-settings-form.tsx` | Groups the new controls under `ui2-sticky-announcement-block`; duration slider disabled when animation is not MARQUEE; client-side validation mirrors the server Zod (5–60 integer). |
| Patch helper | `app/admin/settings/homepage-settings-patch.ts` | Pass-through for the two new fields so dirty-tracking and payload assembly remain correct. |
| Page wrapper | `app/admin/settings/page.tsx` | No behavioral change; kept for surface consistency. |
| Admin route test | `app/api/admin/homepage-settings/route.test.ts` | Coverage for opacity + duration round-trip. |
| Public route test | `app/api/public/homepage-settings/route.test.ts` | Asserts the public DTO surfaces both new fields. |
| DTO projection test | `src/domains/job-board/public-content-controls/__tests__/dto-projection.test.ts` | `safeStickyAnnouncement` defaults the new fields when absent. |
| News wrapper test | `src/domains/job-board/public-content-controls/__tests__/news-section-wrapper.test.tsx` | Untouched logic; preserved test surface. |
| Static fence | `src/domains/job-board/public-content-controls/content-controls.static.test.ts` | Two new invariants: BLINK opacity is on the pseudo, not the container; visible close ≤28 px with hit-area ≥44 px and bar height unchanged. |
| Revision test | `src/domains/job-board/public-content-controls/revision.test.ts` | Asserts revision hash input includes the new fields. |
| Component test | `src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | Server-render coverage for the new fields and CSS custom properties. |
| Admin form test | `app/admin/settings/__tests__/admin-settings-form.ui2.test.ts` | New controls grouped under the Bottom Sticky fieldset, MARQUEE-only enforcement, client-side validation messages. |
| Patch test | `app/admin/settings/homepage-settings-patch.test.ts` | Dirty-payload coverage for the new fields. |
| Public settings test | `src/domains/job-board/public-settings.test.ts` | Service-level coverage for round-trip of new fields. |
| Integration test | `tests/db/public-settings.integration.test.ts` | Smoke for round-trip read/write of new fields. |

No other surface under `app/` or `src/` is modified. No Prisma schema or
migration folder is touched. `pnpm-lock.yaml` remains an untracked
workspace artifact (C-04 hygiene) and is **not** part of the commit.

## 2. Acceptance evidence

The first row is `verify-task`. Every command registers once via `E-xx`; multiple ACs reuse one registry entry.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-sticky-settings-follow-up/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` | `None` |
| `AC-01` | `E-01` (DTO defaults + Zod), `E-02` (revision hash), `E-03` (admin route), `E-04` (public route), `E-05` (service), `E-06` (admin form dirty tracking) | 234/234 targeted tests PASS; 4253/4253 full unit tests PASS | `None` |
| `AC-02` | `npx --no-install vitest run --config vitest.unit.config.ts app/admin/settings/__tests__/admin-settings-form.ui2.test.ts` | exit 0; 8/8 PASS — both controls are descendants of `[data-testid="ui2-sticky-announcement-block"]`; duration slider is `disabled` when `stickyAnimation !== 'MARQUEE'`; help text contains "5–60 giây" and "giá trị nhỏ hơn chạy nhanh hơn". See also `E-07`. | `None` |
| `AC-03` | `E-08` (CSS static: opacity only on `::before`; no `opacity:` on container/CTA/dismiss/message), `E-09` (CSS static: 28/28 + 44/44 + band-fit invariants), `E-10` (component server-render: `--sticky-background-opacity` + `--sticky-marquee-duration` are CSS custom properties only; no `opacity:` on the rendered HTML) | PASS | `None` |
| `AC-04` | `E-11` (responsive CSS analysis: fluid flex, `max-width: 100vw`, `overflow-x: hidden`, no width-based media queries), `E-12` (reduced-motion media query covers BLINK `::before` and MARQUEE track with `animation: none`) | PASS (desktop + mobile layout + reduced motion — see §4 DEV-01 about the in-process verification lane) | `reduced-motion + responsive verified at the CSS/SSR layer; no live browser session available in the CI lane, see §4 DEV-01` |
| `AC-05` | `E-13` (targeted 234/234), `E-14` (full 4253/4253 + 9 skipped), `E-15` (typecheck), `E-16` (lint 0 errors), `E-17` (build), `E-18` (prisma validate), `E-19` (encoding), `E-20` (git diff --check) | All PASS; `git status --porcelain` for `app src prisma tests scripts packages` empty after freeze (see §0 Implementation SHA + E-21) | `None` |
| `AC-06` | `E-09` (CSS static: button ≤28 px, hit area ≥44 px, button fits inside the 4-px inset band, bar height unchanged at 44 px, focus-visible retains `outline: 2px solid currentColor`) | PASS | `None` |

## 3. Evidence registry

| ID | Command / inspection | Result |
|---|---|---|
| `E-01` | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/__tests__/dto-projection.test.ts` | exit 0; 13/13 PASS — `safeStickyAnnouncement` defaults `backgroundOpacity=100`, `marqueeDurationSeconds=18`. |
| `E-02` | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/revision.test.ts` | exit 0; 18/18 PASS — revision hash input enumerates the new fields. |
| `E-03` | `npx --no-install vitest run --config vitest.unit.config.ts app/api/admin/homepage-settings/route.test.ts` | exit 0; 5/5 PASS — admin route accepts and clamps the new fields. |
| `E-04` | `npx --no-install vitest run --config vitest.unit.config.ts app/api/public/homepage-settings/route.test.ts` | exit 0; 1/1 PASS — public DTO carries the new fields. |
| `E-05` | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-settings.test.ts` | exit 0; 41/41 PASS — service-level round-trip. |
| `E-06` | `npx --no-install vitest run --config vitest.unit.config.ts app/admin/settings/__tests__/admin-settings-form.ui2.test.ts app/admin/settings/homepage-settings-patch.test.ts` | exit 0; 8/8 + 8/8 PASS — admin form regression + patch helper. |
| `E-07` | `node -e "const fs=require('fs');const s=fs.readFileSync('app/admin/settings/admin-settings-form.tsx','utf8');if(!/data-testid="ui2-sticky-announcement-block"/.test(s))process.exit(1);if(!/stickyMarqueeDurationSeconds/.test(s))process.exit(1);if(!/disabled={stickyAnimation !== 'MARQUEE'}/.test(s))process.exit(1);if(!/Một vòng mất 5–60 giây/.test(s))process.exit(1);console.log('ADMIN_FORM_GROUPING:PASS')"` | exits 0 with `ADMIN_FORM_GROUPING:PASS` — both controls are descendants of `[data-testid="ui2-sticky-announcement-block"]`; the duration slider is `disabled` when `stickyAnimation !== 'MARQUEE'`; the help text reads "5–60 giây" + "giá trị nhỏ hơn chạy nhanh hơn". |
| `E-08` | `node -e "const fs=require('fs');const css=fs.readFileSync('src/domains/job-board/public-content-controls/sticky-announcement.module.css','utf8');for(const sel of ['.hrpStickyAnnouncement','.hrpStickyAnnouncementCta','.hrpStickyAnnouncementDismiss','.hrpStickyAnnouncementMessage']){const m=css.match(new RegExp(sel.replace('.','\\\\.')+'\\\\s*\\\\{([^}]*)\\\\}','g'));if(!m){console.error('missing',sel);process.exit(1)}if(m.some(rule=>/\\bopacity\\s*:/.test(rule))){console.error('opacity on',sel);process.exit(1)}}console.log('NO_OPACITY_ON_FOREGROUND:PASS')"` | exits 0 with `NO_OPACITY_ON_FOREGROUND:PASS`. |
| `E-09` | `node -e "const fs=require('fs');const css=fs.readFileSync('src/domains/job-board/public-content-controls/sticky-announcement.module.css','utf8');const bar=css.match(/\\.hrpStickyAnnouncement\\s*\\{([^}]*)\\}/)[1];const bg=css.match(/\\.hrpStickyAnnouncement::before\\s*\\{([^}]*)\\}/)[1];const btn=css.match(/\\.hrpStickyAnnouncementDismiss\\s*\\{([^}]*)\\}/)[1];const hit=css.match(/\\.hrpStickyAnnouncementDismiss::after\\s*\\{([^}]*)\\}/)[1];const barH=Number(bar.match(/min-height:\\s*(\\d+)px/)[1]);const insets=bg.match(/inset:\\s*(\\d+)px/)[1];const bw=Number(btn.match(/width:\\s*(\\d+)px/)[1]);const bh=Number(btn.match(/height:\\s*(\\d+)px/)[1]);const tw=Number(hit.match(/width:\\s*(\\d+)px/)[1]);const th=Number(hit.match(/height:\\s*(\\d+)px/)[1]);if(bw>28||bh>28)process.exit(1);if(tw<44||th<44)process.exit(1);if(bh>barH-2*Number(insets))process.exit(1);if(/min-(?:width\|height)/.test(btn))process.exit(1);console.log('HIT_AREA_OK')"` | exits 0 with `HIT_AREA_OK` (button 28×28, hit 44×44, band 36 px). |
| `E-10` | React-SSR via `react-dom/server.renderToStaticMarkup(<StickyAnnouncement dto={safeStickyAnnouncement({enabled:true,message:'x',animation:'MARQUEE',backgroundOpacity:0,marqueeDurationSeconds:9})} />)`; assert HTML contains `--sticky-background-opacity:0%` and `--sticky-marquee-duration:9s`; assert HTML does NOT match `/(?:^\|;)\\s*opacity:/`. | inline (sticky-announcement.test.tsx): `applies background opacity without reducing foreground opacity` + `passes marquee duration to the track without applying opacity to the wrapper` PASS. |
| `E-11` | `node -e "const fs=require('fs');const css=fs.readFileSync('src/domains/job-board/public-content-controls/sticky-announcement.module.css','utf8');const m=css.match(/@media[^{]+/g)||[];if(m.find(x=>/max-width\|min-width/.test(x)))process.exit(1);const w=css.match(/max-width:\\s*([^;]+);/)[1];const o=css.match(/overflow-x:\\s*([^;]+);/)[1];console.log('fluid-flex:'+w+':'+o)"` | exits 0 — `max-width: 100vw` + `overflow-x: hidden`; no width-breakpoint media queries. |
| `E-12` | `node -e "const fs=require('fs');const css=fs.readFileSync('src/domains/job-board/public-content-controls/sticky-announcement.module.css','utf8').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'');const m=css.match(/@media\\s*\\(prefers-reduced-motion:\\s*reduce\\)\\s*\\{([\\s\\S]*?)\\n\\}/);const body=m[1];const ruleRe=/([^{}]+?)\\s*\\{\\s*([^{}]+?)\\s*\\}/g;let mm;let covered=false;while((mm=ruleRe.exec(body))){const sels=mm[1].split(',').map(s=>s.trim());if(/animation:\\s*none/.test(mm[2].trim())&&sels.includes('.hrpStickyAnnouncementAnimBlink::before')&&sels.includes('.hrpStickyAnnouncementAnimMarquee .hrpStickyAnnouncementTrack')){covered=true;break}}if(!covered)process.exit(1);console.log('REDUCED_MOTION_OK')"` | exits 0 with `REDUCED_MOTION_OK`. |
| `E-13` | `npx --no-install vitest run --config vitest.unit.config.ts app/admin/settings/__tests__/admin-settings-form.ui2.test.ts app/admin/settings/homepage-settings-patch.test.ts app/api/admin/homepage-settings/route.test.ts app/api/public/homepage-settings/route.test.ts src/domains/job-board/public-content-controls/__tests__/dto-projection.test.ts src/domains/job-board/public-content-controls/__tests__/news-section-wrapper.test.tsx src/domains/job-board/public-content-controls/content-controls.static.test.ts src/domains/job-board/public-content-controls/revision.test.ts src/domains/job-board/public-content-controls/sticky-announcement.test.tsx src/domains/job-board/public-settings.test.ts` | exit 0; 10 files, **234/234 PASS** (matches directive "Targeted tests 234/234 PASS"). |
| `E-14` | `npm run test:unit` | exit 0; `Test Files 274 passed (274) · Tests 4253 passed | 9 skipped (4262)`. |
| `E-15` | `npm run typecheck` | exit 0; no errors. |
| `E-16` | `npm run lint` | exit 0; 0 errors, 919 warnings (all pre-existing, none in T1C2 files). |
| `E-17` | `npm run build` | exit 0; all 29/29 routes compiled. **This row also produces the `Implementation SHA` recorded in §0 after the semantic commit (see E-21).** |
| `E-18` | `DATABASE_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder' DATABASE_URL_ADMIN='postgresql://placeholder:placeholder@localhost:5432/placeholder' npx --no-install prisma validate` | exit 0; `The schema at prisma/schema.prisma is valid 🚀` (no schema delta from T1C2; env placeholder required because the worktree's two env URLs are declared on `datasource db`). |
| `E-19` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; 20 changed text files PASS (UTF-8 without BOM). |
| `E-20` | `git diff --check` | exit 0; 0 errors. |
| `E-21` | `git -C . rev-parse --verify 07fd79af8e7ba143b86fedcb47864faad2b5de86^{commit}` and `git status --porcelain` after freeze | Implementation SHA resolves (exit 0); working tree clean of `app/`, `src/`, `prisma/`, `tests/`, `scripts/`, `packages/` paths (only `docs/tasks/hrp-sticky-settings-follow-up/` and `pnpm-lock.yaml` untracked, both non-source). |
| `E-22` | `git diff 07fd79af8e7ba143b86fedcb47864faad2b5de86..HEAD -- app src prisma tests scripts packages` (post-freeze delta check) | empty — every commit after Implementation SHA is docs/evidence-only. |
| `E-23` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-sticky-settings-follow-up/TASK.md -HandoffPath docs/tasks/hrp-sticky-settings-follow-up/HANDOFF.md` | exit 0 (after Implementation SHA is pinned and second docs commit lands; see §4 DEV-02). |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-01` | DOCUMENTED LIMITATION | `AC-04` requires "Browser verification at 1440 px desktop and 390 px mobile". This worktree has no live-browser lane (no Playwright / Puppeteer / Chrome MCP available in the current execution environment). The equivalent guarantees are reproduced deterministically: (a) CSS analysis confirms `flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; max-width: 100vw; overflow-x: hidden` on the bar, with no width-based `@media` rules; (b) React SSR for `<StickyAnnouncement>` produces identical markup at any viewport because the bar uses a fluid flex layout; (c) `prefers-reduced-motion: reduce` is asserted via parsed `@media` body. The directive explicitly accepts a CSS/SSR-equivalent verification when the browser lane is unavailable, and `tier1.md` `Audit mode: NONE` rule does not require a live browser session for this Standard lane. | None — equivalent guarantees recorded as `E-11` and `E-12`; `AC-04` row carries the limitation so the gate does not mistake a documented limitation for an unmeasured AC. |
| `DEV-02` | PINNING ORDER | `verify-handoff.ps1` H-16 requires an exact 40-character Implementation SHA that resolves to a local commit. The semantic implementation commit must therefore land first; this HANDOFF is initially written with `<pending — see E-17>` and the closing `Handoff status: READY_FOR_REVIEW` line. After `git commit` of the 18 source/test files, `git rev-parse HEAD` produces the SHA; the HANDOFF is amended / re-pinned and committed as a docs-only second commit (no `app/ src/ prisma/ tests/ scripts/ packages/` delta — see E-22). | None — ordering is mechanical, not a blocker. |
| `DEV-03` | UNTRACKED ARTIFACT | `pnpm-lock.yaml` is untracked in this worktree and pre-exists `codex/t1c2-sticky-settings-follow-up`. Per the C-04 hygiene rule the lockfile is NOT part of T1C2's commit. The encoding gate counts it as a changed text file (PASS, no BOM) but it stays untracked on disk. | None — same handling as in prior T1C2 handoffs. |
| `DEV-04` | NO TIER 3 / NO `AUDIT.md` | TASK §1.2 forbids both; this HANDOFF is therefore self-review only (top three risks per `tier1.md`): (1) opacity bleeding onto the foreground — guarded by `E-08` static fence and `E-10` rendered-HTML guard; (2) marquee duration escaping the 5–60 s bound — guarded by Zod schema and client-side validator plus E-13 tests; (3) close control over- or under-sized — guarded by E-09 band-fit invariant. | None. |

## 5. Final status

`READY_FOR_REVIEW / T0_PUSH_PR_MERGE` — T1C2 follow-up is delivered, frozen,
canonical gates PASS, no Tier 3 audit requested, no `AUDIT.md`, no schema
or migration change, no production DB access, no T1A scope change. The
semantic commit (see E-17) is the audit-target SHA; the docs commit
that follows pins `Implementation SHA` in §0 and `Handoff status`. The
`Branch = codex/t1c2-sticky-settings-follow-up` is ready for push and
PR; the PR template will reference this HANDOFF. Tier 1 self-review
above is the entire review surface per `Audit mode: NONE` for
`STANDARD` lane.

- **Pre-merge working tree state (post freeze):** `git status --porcelain` shows only the docs `docs/tasks/hrp-sticky-settings-follow-up/{TASK.md, HANDOFF.md}` (untracked at first, then staged in the docs commit) and the untracked workspace `pnpm-lock.yaml` (C-04 hygiene, never part of any commit). No `app/ src/ prisma/ tests/ scripts/ packages/` paths are dirty.
- **Push state:** branch `codex/t1c2-sticky-settings-follow-up` is local-only at handoff. Push and PR open are the next step per the directive.
- **Production migration:** NOT_RUN. T1C2 makes no schema or migration change.

> Handoff status: `READY_FOR_REVIEW`
