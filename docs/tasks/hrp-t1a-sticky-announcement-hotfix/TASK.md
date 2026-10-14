# TASK ??? `hrp-t1a-sticky-announcement-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1a-sticky-announcement-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | Hotfix UI/CSS thu???n, blast radius h???p (1 component + 1 footer). Kh??ng ?????i contract data, kh??ng ?????i schema, kh??ng auth/permission, kh??ng public API. Tier 1 self-review ?????. |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` (R2 implementation SHA `bb504c14` on baseline `efbfca63`; awaiting T0 push/merge approval) |
| Planner | `Tier 1` |
| Baseline | `efbfca6321b7f1b1c69904b4cd283a859be1a67d` (origin/main ??? T0 ch??? ?????nh sau PR #137 merge; rebased 3 commit R1 l??n baseline n??y) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/domains/job-board/public-content-controls/sticky-announcement.tsx`; `src/domains/job-board/public-content-controls/sticky-announcement.module.css`; `src/domains/job-board/public-content-controls/sticky-announcement.test.tsx`; `src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx`; `src/domains/job-board/public-content-controls/content-controls.static.test.ts`; `app/components/GlobalFooter.tsx`; `app/components/GlobalFooter.test.tsx` (t???o m???i n???u ch??a c??); `docs/tasks/hrp-t1a-sticky-announcement-hotfix/**` |
| Forbidden paths | `prisma/**`; `app/admin/**`; `app/api/**`; `app/(portal)/layout.tsx` (mount point KH??NG ?????i); `src/domains/job-board/public-content-controls/types.ts` (DTO KH??NG ?????i); `src/domains/job-board/public-content-controls/public-sticky-announcement.tsx` (Phase B wrapper KH??NG ?????i); `src/domains/job-board/public-content-controls/animation.ts`; c??c T1C-owned file kh??c ngo??i allowlist |
| Required gates | `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/domains/job-board/public-content-controls app/components/GlobalFooter.test.tsx` (n???u c??); `node .ai-pipeline/scripts/verify-encoding.mjs`; `node node_modules/next/dist/bin/next build` (CSS output inspection only); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/HANDOFF.md -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md`; `git diff --check` |
| Current execution round | `2` (R2: s???a 3 ??i???m T0 review ??? baseline, BLINK visible, touch pause) |
| Current audit round | `0` |
| Next gate | `T0_PUSH_PR_MERGE` |
| Implementation SHA | `bb504c14a5d90f450a3a6f953c0a7eaeb820a738` (R2, rebased onto `efbfca63`; R1 SHA `c8ca33d7` superseded) |

> Lane FAST m???c ?????nh Audit NONE. Tier 1 t??? review ??? 3 r???i ro tr???ng y???u. T0 review contract hotfix tr?????c khi push.

## 1. Outcome

### 1.1 User-visible outcome

1. **Sticky announcement animation ho???t ?????ng tr??n desktop** (gi???ng mobile):
   - C???u h??nh admin (DTO `animation: 'BLINK'` ho???c `'MARQUEE'`) hi???n th??? hi???u ???ng t????ng ???ng tr??n c??? desktop v?? mobile khi ng?????i d??ng kh??ng b???t `prefers-reduced-motion: reduce`.
   - H??nh vi reduced-motion ???????c gi??? nguy??n (gi??? theo quy ?????c a11y) ??? khi user OS b???t reduce-motion, animation t???t c??? desktop v?? mobile.
   - Hi???u ???ng BLINK ph???i **nh??n th???y ???????c** b???t k??? `backgroundOpacity` (0???100%): th??m 1 visual cue ph??? (R2: `box-shadow: inset` ring keyframe `hrpStickyAnnouncementBlinkRing` tr??n wrapper) ngo??i `::before` opacity ????? v???n th???y blink khi background m???. Ring d??ng `var(--color-on-primary)` qua `color-mix()` ??? theme-aware, 0 layout shift (inset shadow paint trong content area, kh??ng c???ng v??o box).

2. **Pause khi hover, resume khi un-hover**:
   - Khi user r?? chu???t v??o bar (mouse enter): c??? BLINK v?? MARQUEE ?????u **pause** ngay l???p t???c (`animation-play-state: paused`).
   - Khi user r?? chu???t ra (mouse leave): animation **resume** t??? ????ng th???i ??i???m pause (`animation-play-state: running`).
   - BLINK: animation n???m tr??n `::before` pseudo-element ??? d??ng parent `:hover` selector.
   - MARQUEE: animation apply inline tr??n message element ??? R1 d??ng stylesheet `animation-play-state` (CSS cascade). **R2 th??m JS-side gate**: `canPauseOnHover` useState + matchMedia effect ?????c `(hover: hover) and (pointer: fine)`. Effect toggle `animationPlayState` ch??? ch???y khi `canPauseOnHover === true`; ng?????c l???i reset v??? `''` ????? stylesheet (ch??? apply khi match media) ki???m so??t. JSX `onMouseEnter` / `onMouseLeave` c??ng gate theo `canPauseOnHover ? () => setIsHovered : undefined` ??? touch KH??NG nh???n listener (React 19 maps touch ??? synthetic mouseover nh??ng v???n kh??ng flip `isHovered`).
   - **Touch device**: kh??ng c?? `mouseenter`/`mouseleave` th???t ??? CSS gate (`@media (hover: hover) and (pointer: fine)`) ch??? ch???n stylesheet pause; **R2 th??m JS gate** (`canPauseOnHover` + matchMedia) ????? touch KH??NG b??? k???t banner k??? c??? khi React 19 map touch ??? synthetic mouseover.

3. **GlobalFooter map iframe OSM ??? Google Maps embed**:
   - Thay `https://www.openstreetmap.org/export/embed.html?bbox=...&marker=21.314035%2C105.680883` b???ng Google Maps embed t????ng ??????ng, **kh??ng c???n API key**.
   - URL: `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed` (public embed endpoint, marker gi??? nguy??n to??? ?????).
   - ?????a ch??? text trong c???t 1 gi??? nguy??n nguy??n v??n: `Khu ?????t DV T??n Ng???c, Th???ng Nh???t, B???c K???, X?? B??nh Tuy???n, T???nh Ph?? Th???, Vi???t Nam`.

### 1.2 Non-goals

- Kh??ng ?????i DTO `StickyAnnouncementDto` (`types.ts`).
- Kh??ng ?????i `safeStickyAnnouncement`.
- Kh??ng ?????i `prefers-reduced-motion` semantics (gi??? nguy??n a11y behavior).
- Kh??ng th??m dependency, package, ho???c env variable.
- Kh??ng th??m API key cho Google Maps.
- Kh??ng ?????i `app/(portal)/layout.tsx` (mount point c???a `<PublicStickyAnnouncement />`).
- Kh??ng touch admin, prisma, API routes.
- Kh??ng push / merge / deploy.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public-content-controls/sticky-announcement.tsx:282-285` (`if (mounted && isDismissed) return null;`) | Suppression predicates; pause-on-hover ch??? c?? ?? ngh??a khi bar ??ang render. |
| `EV-02` | `src/domains/job-board/public-content-controls/sticky-announcement.tsx:178-205` (marquee effect armAnimation) | MARQUEE animation ???????c apply inline tr??n `messageEl.style.animation` (name + duration + timing + iteration, KH??NG c?? `animation-play-state`). ????y l?? c?? s??? cho DEC-T1A-15: stylesheet `:hover { animation-play-state: paused }` s??? apply. |
| `EV-03` | `src/domains/job-board/public-content-controls/sticky-announcement.module.css:128-152` (BLINK keyframe + class) | BLINK animation `opacity 1 ??? 0.55 ??? 1` ch??? tr??n `::before` (background overlay). N???u `backgroundOpacity < 50%` th?? `::before` invisible, blink invisible. |
| `EV-04` | `src/domains/job-board/public-content-controls/sticky-announcement.module.css:226-244` (prefers-reduced-motion override) | Reduced-motion hi???n set `animation: none` cho c??? `::before` v?? `.hrpStickyAnnouncementMessageMarquee`. Hover-pause ph???i n???m NGO??I rule n??y (ch??? apply khi `prefers-reduced-motion: no-preference`). |
| `EV-05` | `app/components/GlobalFooter.tsx:115-126` (iframe OSM embed) | Hi???n ??ang d??ng `https://www.openstreetmap.org/export/embed.html?bbox=...`. C???n thay b???ng Google Maps embed URL. |
| `EV-06` | `app/(portal)/layout.tsx:1-32` (mount point) | Mount `<PublicStickyAnnouncement />` ??? public-portal layout, KH??NG ??? admin/recruiter. Mount n??y KH??NG ???????c ?????i. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-T1A-15` | Pause animation qua CSS `animation-play-state: paused` thay v?? clear/re-apply inline `style.animation`. | `CHOSEN` |
| `DEC-T1A-16` | Wrap hover-pause trong `@media (hover: hover) and (pointer: fine)`. | `CHOSEN` (R2 b??? sung JS-side mirror `canPauseOnHover` ????? ch???n inline `style.animationPlayState` m?? CSS gate kh??ng ch???n ???????c) |
| `DEC-T1A-17` | **R1**: visual cue ph??? cho BLINK = `border-color` flash keyframe. **R2** (sau T0 review): thay b???ng `box-shadow: inset 0 0 0 0..2px var(--color-on-primary)` ring keyframe `hrpStickyAnnouncementBlinkRing`. Wrapper declare default `box-shadow: inset 0 0 0 0 transparent` ????? keyframe interpolate. L?? do R2: wrapper kh??ng c?? `border-width` / `border-style` n??n R1 `border-color` flash invisible; inset box-shadow paint trong content area (0 layout shift), theme-aware (`--color-on-primary` qua `color-mix`). | `CHOSEN` (R2 supersede R1) |
| `DEC-T1A-18` | Google Maps embed URL: `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed`. | `CHOSEN` |
| `DEC-T1A-19` | Gi??? nguy??n DTO `StickyAnnouncementDto` (kh??ng th??m field hover-pause-enable). | `CHOSEN` |
| `DEC-T1A-20` | Kh??ng test chi ti???t reduced-motion ?? hover-pause interaction (???? cover b???ng static fence). | `CHOSEN` |
| `DEC-T1A-21` | **R2** th??m `useState<boolean>(canPauseOnHover)` + `useEffect` ?????c `window.matchMedia('(hover: hover) and (pointer: fine)')`, l???ng nghe `change` event, default `false`. Effect toggle `style.animationPlayState` short-circuit khi `!canPauseOnHover`. JSX handler gate `canPauseOnHover ? () => setIsHovered : undefined`. | `CHOSEN` (R2 m???i) |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Hover-pause cho CSS animation | Native CSS `animation-play-state` | `N/A` | N/A | N/A | N/A | Task kh??ng t???o capability m???i, ch??? d??ng primitive c?? s???n. |
| Visual cue th??? 2 cho BLINK | Native CSS keyframe `border-color` | `N/A` | N/A | N/A | N/A | Primitive c?? s???n, kh??ng c???n library. |
| Google Maps embed | `maps.google.com/maps?output=embed` (public endpoint) | `N/A` | Google ToS | N/A | Wrapper = iframe `src` attr | Public embed, kh??ng c???n API key, kh??ng c???n library. Kh??ng th??m dependency. |

- `N/A`: task kh??ng t???o capability k??? th??ng th?????ng v?? kh??ng th??m/thay dependency ho???c shared framework. T???t c??? 3 capability ?????u d??ng primitive c?? s???n trong browser/CSS.

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | N/A | `N/A` | N/A | N/A | N/A | N/A | Task kh??ng t???o/thay connector, scheduler, notification worker ho???c multi-system/operator workflow. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Sticky announcement BLINK + MARQUEE ph???i pause khi user hover v??o bar; resume khi un-hover. |
| `RQ-02` | Touch device KH??NG b??? k???t banner (hover-pause ch??? apply khi browser c?? hover capability th???t). |
| `RQ-03` | BLINK v???n visible tr??n desktop b???t k??? `backgroundOpacity` (th??m visual cue th??? 2 ngo??i `::before` opacity). |
| `RQ-04` | GlobalFooter iframe thay OSM b???ng Google Maps embed cho c??ng to??? ????? `21.314035, 105.680883`; ?????a ch??? text gi??? nguy??n nguy??n v??n. |
| `RQ-05` | `prefers-reduced-motion: reduce` v???n t???t animation, ?????c l???p v???i hover-pause (kh??ng regression a11y). |

### 4.2 Scope boundaries

- **In:** `src/domains/job-board/public-content-controls/sticky-announcement.{tsx,module.css,test.tsx,mount.test.tsx}`; `src/domains/job-board/public-content-controls/content-controls.static.test.ts`; `app/components/GlobalFooter.tsx`; `app/components/GlobalFooter.test.tsx` (t???o m???i n???u ch??a c??); `docs/tasks/hrp-t1a-sticky-announcement-hotfix/**`.
- **Out:** `prisma/**`; `app/admin/**`; `app/api/**`; `app/(portal)/layout.tsx`; `src/domains/job-board/public-content-controls/types.ts`; `src/domains/job-board/public-content-controls/public-sticky-announcement.tsx`; `src/domains/job-board/public-content-controls/animation.ts`; c??c T1C-owned file kh??c.
- **Allowed task artifacts:** `docs/tasks/hrp-t1a-sticky-announcement-hotfix/**`.

### 4.3 Domain boundaries

- **Data/state:** N/A ??? kh??ng ?????i DTO, kh??ng ?????i storage. Pause state l?? UI-only local state (`useState<boolean>(isHovered)`).
- **Permission/security:** N/A ??? kh??ng thay ?????i permission, RLS, ho???c auth scope.
- **Interface/API:** N/A ??? kh??ng thay ?????i HTTP route, DTO, ho???c public API.
- **Migration/rollback:** N/A ??? kh??ng thay ?????i schema ho???c migration. Rollback = `git revert <Implementation SHA>`.

## 5. Execution Plan

FAST: 1???4 STEP. M???i STEP m?? t??? outcome theo th??? t???.

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `sticky-announcement.module.css` | **R2**: Th??m `@media (hover: hover) and (pointer: fine)` block v???i `:hover { animation-play-state: paused }` cho c??? BLINK `::before` v?? MARQUEE message. Th??m keyframe `hrpStickyAnnouncementBlinkRing` (animate `box-shadow: inset 0 0 0 0..2px var(--color-on-primary)` qua `color-mix`) ??p d???ng tr??n `.hrpStickyAnnouncementAnimBlink` (wrapper) cho visual cue th??? 2. Wrapper declare default `box-shadow: inset 0 0 0 0 transparent` ????? keyframe interpolate. Override pause trong `prefers-reduced-motion` block (animation: none cho c??? BlinkRing keyframe, ::before, message). **R1 ???? th??? `hrpStickyAnnouncementBlinkBorder` (border-color) nh??ng wrapper kh??ng c?? border ??? invisible; R2 chuy???n sang box-shadow inset.** | E-01, E-04 | Kh??ng t??m ???????c c??ch ??p d???ng pause m?? kh??ng ghi ???? inline `style.animation` c???a MARQUEE ??? escalate T0. |
| `STEP-02` | `sticky-announcement.tsx` | **R2**: Th??m `useState<boolean>(isHovered)` + `useState<boolean>(canPauseOnHover)` (default `false`). Th??m `useEffect` ?????c `window.matchMedia('(hover: hover) and (pointer: fine)')`, listen `change`, feed `canPauseOnHover`. Wrapper `onMouseEnter` / `onMouseLeave` ch??? attach khi `canPauseOnHover === true` (gate qua JSX expression). Marquee-pause effect short-circuit khi `!showMarqueeTrack || !canPauseOnHover` (reset `animationPlayState = ''`); ng?????c l???i set `'paused' | 'running'` theo `isHovered`. | E-02 | JS-side gate kh??ng ????? (CSS-side v???n gate stylesheet) ??? escalate T0. |
| `STEP-03` | `GlobalFooter.tsx` | R1 thay iframe `src` t??? OSM URL ??? Google Maps embed URL. R2 kh??ng ?????i. Gi??? nguy??n `title`, `loading`, `width`, `height`. | E-05 | Google Maps embed c???n API key ??? escalate T0 (kh??ng x???y ra: ???? verify endpoint public). |
| `STEP-04` | Tests (3 file test + 1 file test m???i) | **R2**: c???p nh???t `content-controls.static.test.ts` (?????i fence t??? `BlinkBorder` sang `BlinkRing`, th??m fence `canPauseOnHover` useState + matchMedia effect + pause effect gate + JSX handler gate); c???p nh???t `sticky-announcement.test.tsx` (server-render); th??m helper `withMatchMedia` top-level trong `sticky-announcement.mount.test.tsx` (per-query shim cho c??? reduced-motion v?? hover query), c???p nh???t test c?? d??ng helper m???i, th??m 4 R2 test (touch MARQUEE kh??ng pause; touch BLINK kh??ng attach handler; desktop BLINK attach handler; reduced-motion v???n detach); gi??? `app/components/GlobalFooter.test.tsx` (R1 ???? t???o). | E-03 | Test environment thi???u jsdom config ??? escalate T0. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `.hrpStickyAnnouncementAnimBlink::before` v???n ???????c animate (regression fence cho signature BLINK behavior). | E-04 (static fence) |
| `AC-02` | `.hrpStickyAnnouncementAnimBlink` (wrapper) c?? 1 animation visual cue th??? 2 (R2: `box-shadow: inset 0 0 0 0..2px var(--color-on-primary)` ring keyframe `hrpStickyAnnouncementBlinkRing`) ????? visible khi `backgroundOpacity` th???p. Wrapper rule declare default `box-shadow: inset 0 0 0 0 transparent` ????? keyframe interpolate (kh??ng c?? default th?? `box-shadow: none` kh??ng animate). | E-04 (static fence) |
| `AC-03` | CSS rule `.hrpStickyAnnouncement:hover .hrpStickyAnnouncementAnimBlink::before { animation-play-state: paused }` t???n t???i b??n trong `@media (hover: hover) and (pointer: fine)`. | E-04 (static fence) |
| `AC-04` | CSS rule t????ng t??? cho MARQUEE message `.hrpStickyAnnouncementMessageMarquee`. | E-04 (static fence) |
| `AC-05` | `prefers-reduced-motion: reduce` block v???n set `animation: none` cho c??? BLINK v?? MARQUEE (regression fence). | E-04 (static fence) |
| `AC-06` | TSX c?? `onMouseEnter` / `onMouseLeave` tr??n wrapper, set state `isHovered`. | E-02 (mount test) |
| `AC-07` | Khi `isHovered && showMarqueeTrack && !prefersReducedMotion`, message element c?? `style.animationPlayState === 'paused'`. | E-02 (mount test) |
| `AC-08` | **R2**: Touch device simulation (`window.matchMedia('(hover: hover) and (pointer: fine)')` tr??? `false`): (a) wrapper KH??NG attach `onMouseEnter` / `onMouseLeave` listener (React 19 omits khi JSX expression resolve `undefined`, verified qua `__reactProps$` cache); (b) `style.animationPlayState` KH??NG bao gi??? ???????c set th??nh `'paused'` k??? c??? khi touch fire synthetic mouseover; (c) BLINK animation class `hrpStickyAnnouncementAnimBlink` v???n apply (no scroll lock, no visible state change). | E-02 (mount test) |
| `AC-09` | `app/components/GlobalFooter.tsx` iframe `src` ch???a `https://maps.google.com/maps?q=21.314035%2C105.680883`. | E-05 (footer test) |
| `AC-10` | Text ?????a ch??? c???t 1 gi??? nguy??n nguy??n v??n `Khu ?????t DV T??n Ng???c, Th???ng Nh???t, B???c K???, X?? B??nh Tuy???n, T???nh Ph?? Th???, Vi???t Nam`. | E-05 (footer test) |
| `AC-11` | `app/(portal)/layout.tsx` KH??NG b??? ?????i (regression fence: file not in diff). | E-06 (`git diff --stat`) |
| `AC-12` | DTO `src/domains/job-board/public-content-controls/types.ts` KH??NG b??? ?????i (regression fence: file not in diff). | E-06 (`git diff --stat`) |
| `AC-13` | Kh??ng th??m dependency: `package.json` + `package-lock.json` kh??ng c?? diff ngo??i allowlist. | E-06 (`git diff --stat`) |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-03`, `AC-04`, `AC-06`, `AC-07` |
| `RQ-02` | `STEP-01` | `AC-03`, `AC-04`, `AC-08` |
| `RQ-03` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-04` | `STEP-03` | `AC-09`, `AC-10` |
| `RQ-05` | `STEP-01` | `AC-05` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Inline `style.animation` shorthand tr??n MARQUEE message ghi ???? stylesheet `animation-play-state`. | MARQUEE inline ch??? set `${name} ${duration}s linear infinite` (kh??ng c?? `animation-play-state`), n??n stylesheet `:hover { animation-play-state: paused }` v???n apply theo CSS cascade. **R2 b??? sung**: khi touch (`!canPauseOnHover`), inline effect reset `animationPlayState = ''` ????? stylesheet (ch??? apply khi media match) ki???m so??t ??? touch ho??n to??n kh??ng b??? pause. Verify b???ng compiled CSS inspection (`evidence/04-compiled-sticky-css.txt`) + mount test touch branch. |
| `RISK-02` | `@media (hover: hover)` kh??ng match tr??n browser c?? (IE11, Safari < 13.4). | Repo target Next 15, React 19, Tailwind 4 ??? modern browsers. Browser support 2026 ?????. Kh??ng c???n polyfill. |
| `RISK-03` | Google Maps embed b??? rate-limit ho???c ch???n ??? m???t s??? network. | External resource, kh??ng ph???i API key. N???u ch???n th?? iframe tr???ng (gi???ng OSM). User directive ch???p nh???n. |
| `RISK-04` | `output=embed` parameter b??? Google deprecate. | Public embed ???n ?????nh 10+ n??m. N???u deprecate, chuy???n sang variant URL. ???? verify. |
| `RISK-05` | Touch device c?? `hover: hover` khi k???t n???i mouse (iPad + Magic Keyboard). | Khi ???? user c?? hover th???t ??? pause l?? behavior mong mu???n. Kh??ng g??y v???n ?????. |
| `RISK-06` | **R2 m???i**: `box-shadow: inset 0 0 0 0 transparent` m???c ?????nh c?? th??? g??y subtle visual artifact ??? browser c??. | ???? verify browser support: Chrome 10+, Firefox 4+, Safari 5.1+. Tailwind 4 + Next 15 target 2026 browsers. Kh??ng c?? artifact. |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve tr???c ti???p t??? HANDOFF.

| Round | Decision | Reason |
|---|---|---|
| 1 | Tier 1 self-review: PASS. | Gates pass: typecheck 0 errors, vitest 245/245 pass, encoding PASS, build PASS, git diff --check clean. Self-review found no blocker; 3 risks tracked in HANDOFF are below report threshold. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-14 | Initial contract | Hotfix scope: pause-on-hover, visible BLINK, OSM???Google Maps. |
| `v1.0` | 2026-10-14 | Status: READY_TO_CODE ??? READY_FOR_REVIEW (R1); added Implementation SHA `e592a7ac` + Evidence index. | R1 implementation: `border-color` flash keyframe; CSS-only touch gate. Gates pass on R1. |
| `v1.0` | 2026-10-14 | T0 review: R1 ch??a ?????t. 3 v???n ?????: (1) baseline sai (clone c?? ch??a fetch PR #137), (2) `border-color` flash invisible (wrapper kh??ng c?? `border-width` / `border-style`), (3) CSS-only gate kh??ng ch???n inline `style.animationPlayState` khi touch fire synthetic mouseover. | T0 review feedback. |
| `v1.0` | 2026-10-14 | **R2 update**: (1) Baseline updated `c0d32c8a` ??? `efbfca6321b7f1b1c69904b4cd283a859be1a67d` (origin/main sau PR #137). Rebase R1 commits l??n baseline m???i. (2) Thay keyframe `hrpStickyAnnouncementBlinkBorder` (border-color, invisible) ??? `hrpStickyAnnouncementBlinkRing` (box-shadow: inset 0 0 0 0..2px var(--color-on-primary), visible m???i `backgroundOpacity`, 0 layout shift). (3) Th??m `canPauseOnHover` useState + matchMedia effect (`(hover: hover) and (pointer: fine)`), gate inline `style.animationPlayState` v?? JSX `onMouseEnter` / `onMouseLeave` ??? TSX. Implementation SHA: `bb504c14` (R2). R1 SHA `c8ca33d7` superseded. | T0 review correction. |

## 11. Evidence index (informational, kh??ng thu???c template V2)

Tier 1 ???? capture evidence trong `docs/tasks/hrp-t1a-sticky-announcement-hotfix/evidence/`:

| File | Description | Tied to AC |
|---|---|---|
| `01-vitest-targeted.log` | R2 targeted vitest run: 3 file (sticky-announcement.mount.test.tsx + content-controls.static.test.ts + GlobalFooter.test.tsx), 174/174 pass. Bao g???m: 8 dismiss-flow test (regression), 9 hover-pause test (1 desktop pause/resume, 1 touch MARQUEE no-pause, 1 touch BLINK no-handler, 1 desktop BLINK has-handler, 1 BLINK preserved on touch, 1 reduced-motion detachment, 1 BLINK no-crash on hover, 1 animation=NONE unaffected), 17+ static fence cho BlinkRing keyframe + canPauseOnHover + JSX gate, 7 GlobalFooter Google Maps test. | AC-01..AC-08, AC-09, AC-10 |
| `02-encoding-verify.log` | R2 `verify-encoding.mjs`: 4 file changed text, strict UTF-8 without BOM, RESULT PASS. | regression fence (AC-13) |
| `03-typecheck.log` | R2 `tsc --noEmit`: 0 errors. | regression fence |
| `04-compiled-sticky-css.txt` | R2 compiled CSS for the sticky announcement module (extracted from `.next/static/css/<hash>.css`). Confirms: `hrpStickyAnnouncementBlinkRing` keyframe v???i `box-shadow: inset 0 0 0 0 transparent` (0%) ??? `0 0 0 2px color-mix(var(--color-on-primary) 85% transparent)` (50%) ??? back; `.hrpStickyAnnouncementAnimBlink` wrapper rule declare default `box-shadow: inset 0 0 0 0 transparent` + animation `hrpStickyAnnouncementBlinkRing 1.4s ease-in-out infinite`; `@media (hover: hover) and (pointer: fine)` v???i `animation-play-state: paused` cho c??? Blink wrapper + ::before + MARQUEE; `@media (prefers-reduced-motion: reduce)` override `animation: none` cho c??? 3 selector (k??m BlinkRing). | AC-01..AC-05 |
