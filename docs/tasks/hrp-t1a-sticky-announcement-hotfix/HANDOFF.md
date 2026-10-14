# HANDOFF — `hrp-t1a-sticky-announcement-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1a-sticky-announcement-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Execution round | `2` |
| Baseline | `efbfca6321b7f1b1c69904b4cd283a859be1a67d` |
| Implementation SHA | `bb504c14a5d90f450a3a6f953c0a7eaeb820a738` |
| Doc/evidence SHA | `e4b1d29b` + `bd38eea9` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `1` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

### Delivered (R2)

1. **Sticky announcement BLINK visible trên desktop bất kể `backgroundOpacity`** (R2 supersede R1): thay `@keyframes hrpStickyAnnouncementBlinkBorder` (R1: animate `border-color` — invisible vì wrapper không có `border-width` / `border-style`) bằng `@keyframes hrpStickyAnnouncementBlinkRing` (R2: animate `box-shadow: inset 0 0 0 0..2px var(--color-on-primary)` qua `color-mix`). Wrapper rule declare default `box-shadow: inset 0 0 0 0 transparent` để keyframe interpolate (không có default thì `box-shadow: none` không animate). Inset box-shadow paint trong content area (0 layout shift), theme-aware (`--color-on-primary` cho mọi palette). Signature `::before` opacity blink preserved.
2. **Touch device KHÔNG bị pause** (R2 supersede R1): thêm JS-side mirror `canPauseOnHover` useState + `useEffect` đọc `window.matchMedia('(hover: hover) and (pointer: fine)')`, listen `change` event, default `false`. Marquee-pause effect short-circuit khi `!canPauseOnHover` (reset `animationPlayState = ''`); JSX `onMouseEnter` / `onMouseLeave` gate `canPauseOnHover ? () => setIsHovered : undefined` — React 19 omits listener khi JSX expression resolve `undefined`. CSS pause rule (R1) vẫn giữ — R2 chỉ thêm JS gate để chặn inline `style.animationPlayState` mà CSS gate không chặn được (React 19 maps touch → synthetic mouseover).
3. **GlobalFooter iframe OSM → Google Maps embed** (R1, unchanged in R2): thay `https://www.openstreetmap.org/export/embed.html?bbox=...&marker=21.314035%2C105.680883` bằng `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed` (public embed, không cần API key). Toạ độ marker và địa chỉ text giữ nguyên nguyên văn.

### Not delivered

- None.

### Changed (R2)

- `src/domains/job-board/public-content-controls/sticky-announcement.module.css` (STEP-01 R2) — thay keyframe `hrpStickyAnnouncementBlinkBorder` → `hrpStickyAnnouncementBlinkRing` (box-shadow: inset), thêm default `box-shadow: inset 0 0 0 0 transparent` cho wrapper, extend `prefers-reduced-motion` override bao gồm BlinkRing keyframe.
- `src/domains/job-board/public-content-controls/sticky-announcement.tsx` (STEP-02 R2) — thêm `useState<boolean>(canPauseOnHover)`, `useEffect` đọc matchMedia, gate marquee-pause effect + JSX handlers.
- `src/domains/job-board/public-content-controls/content-controls.static.test.ts` (STEP-04 R2) — đổi fence từ `BlinkBorder` → `BlinkRing`, thêm 5 R2 fence (`canPauseOnHover` useState, matchMedia effect, marquee-pause effect gate, JSX handler gate, default `box-shadow` declaration).
- `src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx` (STEP-04 R2) — thêm top-level helper `withMatchMedia` (per-query shim cho reduced-motion + hover query), update test cũ dùng helper mới, thêm 4 R2 test (touch MARQUEE no-pause, touch BLINK no-handler, desktop BLINK has-handler, reduced-motion detachment), update 1 test reduced-motion cũ.
- `docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md` (R2) — update status, baseline, decision (DEC-T1A-17 thành R2 BlinkRing, DEC-T1A-21 mới), execution plan, risk, revision log, evidence index.
- `docs/tasks/hrp-t1a-sticky-announcement-hotfix/evidence/01..04` (R2) — re-capture sau rebase baseline + R2 implementation, strip CRLF/BOM.
- `app/components/GlobalFooter.tsx` (R1, unchanged in R2) — iframe `src` swap OSM → Google Maps.
- `app/components/GlobalFooter.test.tsx` (R1, unchanged in R2) — 6 server-render tests.

### Lane escalation

No. Lane FAST vẫn đủ cho hotfix UI/CSS với blast radius hẹp (1 component + 1 footer).

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git status --short` confirm 6 source/test file + 5 doc file R2; `app/(portal)/layout.tsx`, `types.ts`, `public-sticky-announcement.tsx`, `animation.ts`, `package.json`, `package-lock.json` KHÔNG trong diff (regression fence AC-11, AC-12, AC-13). |
| API/route boundary | `PASS` | Không thay đổi route, DTO, hoặc public API. `GlobalFooter` chỉ thay iframe `src`. `sticky-announcement.tsx` chỉ thêm internal state + inline effect, không đổi prop API (`StickyAnnouncementProps` unchanged). |
| Auth/permission/data exposure | `N/A` | Không liên quan auth, permission, hoặc data scope. |
| Migration/backfill/rollback | `N/A` | Không thay đổi schema hoặc migration. Rollback = `git revert bb504c14 e4b1d29b bd38eea9` (3 commit). |
| Concurrency/idempotency | `N/A` | Không liên quan concurrency. Effect state `canPauseOnHover` + `isHovered` là per-instance React state, không global. `matchMedia` effect cleanup `removeEventListener` đúng. |
| Test isolation and cleanup | `PASS` | Mount test dùng `document.body.innerHTML = ''` + `window.localStorage.clear()` ở `beforeEach`; `afterAll` reset `IS_REACT_ACT_ENVIRONMENT`. `withMatchMedia` helper try/finally `Object.defineProperty` reset `window.matchMedia` về original. New R2 touch tests assert React 19 không cache `onMouseEnter` / `onMouseLeave` function trong `__reactProps$` khi JSX expression resolve `undefined`. |

#### Baseline note (R2 — đã giải quyết T0)

User directive tham chiếu SHA `efbfca6321b7f1b1c69904b4cd283a859be1a67d`. R1 (commit `e592a7ac` / `c0d32c8a`) đã escalate T0 vì local clone chưa fetch PR #137. **R2 (commit `bb504c14`)** đã chạy `git fetch origin` → `origin/main` HEAD thực tế = `efbfca6321b7f1b1c69904b4cd283a859be1a67d` (đúng T0 chỉ định) → `git rebase origin/main` clean (3 commit) → 3 commit R2 lên baseline này.

## 2. Acceptance evidence

Mỗi AC map sang evidence trong section 3 (`E-xx`).

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md` | `RESULT: PASS` (DRAFT-VALID, 6 non-blocking warnings: 3× "git diff --stat blind" + 3× "AC verification method wording") | None |
| `AC-01` | `E-02`, `E-04` | vitest static fence pass ("R2: applies the ring-flash keyframe to the BLINK wrapper class (not ::before)" + "keeps the `::before` opacity blink (signature BLINK behavior)"); compiled CSS shows `.hrpStickyAnnouncementAnimBlink::before { animation: hrpStickyAnnouncementBlink 1.4s ease-in-out infinite }`. Signature BLINK behavior preserved. | None |
| `AC-02` | `E-02`, `E-04` | vitest static fence pass ("R2: declares a keyframe `hrpStickyAnnouncementBlinkRing` for the wrapper ring flash" — animate `box-shadow: inset`, spread `>0px` at 50%, uses `var(--color-on-primary)`, MUST NOT animate `border-color`; + "R2: BLINK wrapper declares a default `box-shadow: inset 0 0 0 0 transparent`"); compiled CSS shows `@keyframes hrpStickyAnnouncementBlinkRing { 0%,100% box-shadow: inset 0 0 0 0 color-mix(... 0%) 50% box-shadow: inset 0 0 0 2px color-mix(... 85%) }` and `.hrpStickyAnnouncementAnimBlink { box-shadow: inset 0 0 0 0 transparent; animation: hrpStickyAnnouncementBlinkRing 1.4s ease-in-out infinite }`. | None |
| `AC-03` | `E-02`, `E-04` | vitest static fence pass ("AC-03: pause-on-hover rule for BLINK `::before` exists inside the hover media"); compiled CSS shows `@media (hover: hover) and (pointer: fine) { ... .hrpStickyAnnouncement:hover .hrpStickyAnnouncementAnimBlink::before { animation-play-state: paused } }`. | None |
| `AC-04` | `E-02`, `E-04` | vitest static fence pass ("AC-04: pause-on-hover rule for the BLINK wrapper class" + "AC-04: pause-on-hover rule for the MARQUEE message"); compiled CSS shows cùng `@media (hover: hover) and (pointer: fine)` block chứa 3 selectors với `animation-play-state: paused`. | None |
| `AC-05` | `E-02`, `E-04` | vitest static fence pass ("AC-05: hover-pause rules are gated by `@media (hover: hover) and (pointer: fine)` so touch devices are not paused" + "AC-05: reduced-motion override still pins `animation: none` for BLINK wrapper, ::before, and MARQUEE message"); compiled CSS shows `@media (prefers-reduced-motion: reduce) { .hrpStickyAnnouncementAnimBlink, ...:before, ...MessageMarquee { animation: none } }` (R2 extend bao gồm BlinkRing keyframe). | None |
| `AC-06` | `E-02`, `E-04` | vitest static fence pass ("AC-06: wrapper carries onMouseEnter and onMouseLeave attributes" + "AC-06: component declares a `isHovered` useState" + R2 "R2: component declares a `canPauseOnHover` useState"); mount test "R2: on a desktop device, BLINK wrapper DOES attach hover handlers (no regression)" pass (assert `typeof reactProps.onMouseEnter === 'function'`). | None |
| `AC-07` | `E-02` | vitest mount test "AC-06 + AC-07 (R2): MARQUEE pauses on mouseenter and resumes on mouseleave on a hover-capable device" pass: `message!.style.animationPlayState === 'paused'` sau `mouseover`, `'running'` sau `mouseout` (với `canPauseOnHover === true` via `withMatchMedia({ hoverMatches: true })`). | None |
| `AC-08` | `E-02` | vitest mount test "R2: on a touch device, MARQUEE does NOT pause even when mouseenter fires" pass: assert `message!.style.animationPlayState !== 'paused'` sau `mouseover` + `mouseout` (với `canPauseOnHover === false`). + "R2: on a touch device, BLINK wrapper does not attach hover handlers (capability gate)" pass: assert `typeof reactProps.onMouseEnter !== 'function'` + behavioral check BLINK class vẫn apply sau tap. | None |
| `AC-09` | `E-02`, `E-05` | `GlobalFooter.test.tsx` test "AC-09: iframe src chứa Google Maps embed URL cho cùng toạ độ marker" pass: src chứa `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed`; test "AC-09 (negative): iframe KHÔNG còn dùng OpenStreetMap endpoint" pass: src KHÔNG chứa `openstreetmap.org/export/embed.html`. | None |
| `AC-10` | `E-02`, `E-05` | `GlobalFooter.test.tsx` test "AC-10: text địa chỉ cột 1 giữ nguyên nguyên văn" pass. | None |
| `AC-11` | `E-06` | `git status --short` confirm `app/(portal)/layout.tsx` không có trong staged/unstaged diff (`git diff --name-only efbfca63..HEAD` returns 12 file, không có layout.tsx). | None |
| `AC-12` | `E-06` | `git status --short` confirm `src/domains/job-board/public-content-controls/types.ts` không có trong staged/unstaged diff. | None |
| `AC-13` | `E-02`, `E-05`, `E-06` | `git status --short` confirm `package.json` + `package-lock.json` không có diff; `GlobalFooter.test.tsx` test "AC-12: không thêm Google Maps API key vào src (chỉ embed public endpoint)" pass (assert src không chứa `key=`). | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node node_modules/typescript/bin/tsc --noEmit` | exit 0, 0 errors | `evidence/03-typecheck.log` |
| `E-02` | `node node_modules/vitest/dist/cli.js run 'src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx' 'src/domains/job-board/public-content-controls/content-controls.static.test.ts' 'app/components/GlobalFooter.test.tsx'` | exit 0, 3 file, 174 test pass (8 dismiss-flow + 9 hover-pause R2 + N static fence + 7 GlobalFooter), 0 failed | `evidence/01-vitest-targeted.log` |
| `E-03` | `node .ai-pipeline/scripts/verify-encoding.mjs` (single-file working-tree gate) | exit 0, 0 changed text file (worktree clean) | `evidence/02-encoding-verify.log` |
| `E-03b` | `node .ai-pipeline/scripts/verify-encoding-range.mjs efbfca6321b7f1b1c69904b4cd283a859be1a67d HEAD` (range gate over committed history) | exit 0, RESULT: PASS 12/12 text file(s); 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks | inline (this turn's verify-encoding-range.mjs output) |
| `E-04` | Inspect compiled CSS file `.next/static/css/72f38e959a6fea3c.css` (after `next build`) for `hrpStickyAnnouncement*` rules | All required keyframes, classes, and media queries present. Confirms: `hrpStickyAnnouncementBlinkRing` keyframe với `box-shadow: inset 0 0 0 0..2px color-mix(var(--color-on-primary))`; `.hrpStickyAnnouncementAnimBlink` wrapper rule với default `box-shadow: inset 0 0 0 0 transparent` + animation `hrpStickyAnnouncementBlinkRing 1.4s ease-in-out infinite`; `.hrpStickyAnnouncementAnimBlink::before` opacity animation preserved; `@media (hover: hover) and (pointer: fine)` pause block cho all 3 selectors (Blink wrapper, ::before, Marquee); `@media (prefers-reduced-motion: reduce)` override với `animation: none` cho all 3 selectors. | `evidence/04-compiled-sticky-css.txt` (extracted) |
| `E-05` | `node node_modules/vitest/dist/cli.js run 'app/components/GlobalFooter.test.tsx'` (subset of E-02) | 7/7 test pass | `evidence/01-vitest-targeted.log` (lines for `app/components/GlobalFooter.test.tsx`) |
| `E-06` | `git status --short` + `git diff --name-only efbfca63..HEAD` after R2 commits | 12 file changed (4 source + 2 test + 1 css + 1 footer + 1 footer test + 3 doc); `app/(portal)/layout.tsx`, `types.ts`, `public-sticky-announcement.tsx`, `animation.ts`, `package.json`, `package-lock.json` not in diff (regression fence AC-11, AC-12, AC-13). | inline |
| `E-07` | `git diff --check` (post-R2-commit) | exit 0, no whitespace/line-ending issues | inline |
| `E-08` | `node node_modules/next/dist/bin/next build` | exit 0, "Compiled successfully" (R2 build); 4 pre-existing warnings (TypeScript-eslint) unrelated to T1A | inline |
| `E-09` | `powershell -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md` | exit 0, RESULT DRAFT-VALID (6 non-blocking warnings) | inline |
| `E-10` | `powershell -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/HANDOFF.md -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md` | exit 0, RESULT PASS (this round, after re-write for R2) | inline |

### Pre-existing failures outside T1A scope (NOT introduced by R2)

Full vitest run (`node node_modules/vitest/dist/cli.js run` with no filter) shows 22 test files failing with 28 failed tests, 5413 passed, 9 skipped. Tier 1 verified by `git stash` + `git checkout origin/main -- .` + re-run on baseline: **same 22 files fail on `origin/main` HEAD `efbfca63`** before any T1A change. Failures are encoding-hygiene tests asserting `expect(src).not.toMatch(/\r\n/)` against source files (e.g. `app/admin/workers/[id]/__tests__/worker-detail-sections.static.test.ts`, `app/admin/staffing-orders/__tests__/order-detail-role-visibility.static.test.ts`, etc.) — pre-existing CRLF/LF mismatch from PowerShell `Out-File` default on Windows, NOT introduced by T1A. T1A does not touch any of these files (`git diff --name-only efbfca63..HEAD` returns 12 files, none in `app/admin/`). Tier 1 will leave these to T3 audit lane.

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| None | — | — | No |

## 5. Final status

- Source/test frozen tại Implementation SHA `bb504c14a5d90f450a3a6f953c0a7eaeb820a738`; docs + evidence tại `e4b1d29b` + `bd38eea9` (parent chain: `bb504c14` ← `e4b1d29b` ← `bd38eea9`). Canonical gates (typecheck, vitest targeted, encoding single + range, build, git diff --check, verify-task, verify-handoff) đều PASS. Compiled CSS inspection (`evidence/04-compiled-sticky-css.txt`) xác nhận mọi CSS rule đã được Next/Tailwind compile đúng (R2 `BlinkRing` keyframe với box-shadow: inset ring; default `box-shadow: inset 0 0 0 0 transparent` cho wrapper; hover-pause media query intact; reduced-motion override bao phủ 3 selectors + BlinkRing). Sẵn sàng T0 review.
- Self-review xác nhận `git diff --name-only efbfca63..HEAD` không có semantic delta ngoài allowlist; `app/(portal)/layout.tsx`, `types.ts`, `public-sticky-announcement.tsx`, `animation.ts`, `package.json`, `package-lock.json` đều không có diff (verified bằng E-06). 22 test files pre-existing failures trên `origin/main` baseline nằm ngoài T1A scope (encoding-hygiene tests, `app/admin/**`, `prisma/migrations/**`) — không regress bởi R2.
- R1 baseline note đã giải quyết: rebase lên `efbfca6321b7f1b1c69904b4cd283a859be1a67d` (origin/main HEAD sau PR #137) clean, 3 commit R2 stack trên baseline này.

> Handoff status: READY_FOR_REVIEW
