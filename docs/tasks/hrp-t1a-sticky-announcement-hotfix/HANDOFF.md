# HANDOFF — `hrp-t1a-sticky-announcement-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1a-sticky-announcement-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `c0d32c8a29daf2b94325b3c0cef08bb79409f235` |
| Implementation SHA | `e592a7ac8426df449d0d544ff696f7b2a742e4fc` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered:**
  1. **Sticky announcement BLINK visible trên desktop bất kể `backgroundOpacity`**: thêm `@keyframes hrpStickyAnnouncementBlinkBorder` animate `border-color` trên wrapper `.hrpStickyAnnouncementAnimBlink` (chạy song song với `::before` opacity blink cũ). Visible ở mọi backgroundOpacity từ 0% đến 100%.
  2. **Pause-on-hover / resume-on-un-hover cho cả BLINK và MARQUEE**: CSS rule gated bởi `@media (hover: hover) and (pointer: fine)` đặt `animation-play-state: paused` cho `::before` (BLINK), wrapper (BLINK border flash), và message (MARQUEE). Touch device KHÔNG bị pause (rule không apply khi `hover: none` hoặc `pointer: coarse`).
  3. **GlobalFooter iframe OSM → Google Maps embed**: thay `https://www.openstreetmap.org/export/embed.html?bbox=...&marker=21.314035%2C105.680883` bằng `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed` (public embed, không cần API key). Toạ độ marker và địa chỉ text giữ nguyên nguyên văn.
- **Not delivered:** None.
- **Changed:**
  - `app/components/GlobalFooter.tsx` (STEP-03) — iframe `src` swap.
  - `app/components/GlobalFooter.test.tsx` (new) (STEP-04) — 6 server-render tests.
  - `src/domains/job-board/public-content-controls/sticky-announcement.tsx` (STEP-02) — `useState<boolean>(isHovered)`, `onMouseEnter`/`onMouseLeave` trên wrapper, hover-pause effect trên marquee message.
  - `src/domains/job-board/public-content-controls/sticky-announcement.module.css` (STEP-01) — `@keyframes hrpStickyAnnouncementBlinkBorder`, wrapper border-color animation, `@media (hover: hover) and (pointer: fine)` block, extended `prefers-reduced-motion` override.
  - `src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx` (STEP-04) — 3 new hover-pause jsdom tests.
  - `src/domains/job-board/public-content-controls/content-controls.static.test.ts` (STEP-04) — 13 new static fence tests (BLINK visual cue #2, hover-pause rules, reduced-motion override, TSX wiring); update 1 existing fence.
- **Lane escalation:** No. Lane FAST đủ cho hotfix UI/CSS với blast radius hẹp (1 component + 1 footer).

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git status --short` confirm 6 source/test file + 5 doc file; `app/(portal)/layout.tsx`, `types.ts`, `public-sticky-announcement.tsx`, `animation.ts`, `package.json`, `package-lock.json` KHÔNG trong diff (regression fence AC-11, AC-12, AC-13). |
| API/route boundary | `PASS` | Không thay đổi route, DTO, hoặc public API. `GlobalFooter` chỉ thay iframe `src`. `sticky-announcement.tsx` chỉ thêm internal state + inline effect, không đổi prop API (`StickyAnnouncementProps` unchanged). |
| Auth/permission/data exposure | `N/A` | Không liên quan auth, permission, hoặc data scope. |
| Migration/backfill/rollback | `N/A` | Không thay đổi schema hoặc migration. Rollback = `git revert e592a7ac` (single commit). |
| Concurrency/idempotency | `N/A` | Không liên quan concurrency. Effect state `isHovered` là per-instance React state, không global. |
| Test isolation and cleanup | `PASS` | Mount test dùng `document.body.innerHTML = ''` + `window.localStorage.clear()` ở `beforeEach`; `afterAll` reset `IS_REACT_ACT_ENVIRONMENT`. New hover-pause tests dispatch `mouseover`/`mouseout` (React 19 mapping) thay vì `mouseenter`/`mouseleave` vì latter không bubble. |

#### Baseline note (cảnh báo T0)

User directive tham chiếu SHA `efbfca6321b7f1b1c69904b4cd283a859be1a67d`. Tier 1 verify: SHA này **không tồn tại** trong repo (`git rev-parse efbfca6... -> fatal: bad object`). Tier 1 dùng `origin/main` HEAD thực tế = `c0d32c8a29daf2b94325b3c0cef08bb79409f235` (Merge PR #136 từ `codex/theme-apply-cta-contrast-hotfix`). T0 cần xác nhận baseline hoặc pin baseline khác.

## 2. Acceptance evidence

Mỗi AC map sang evidence trong section 3 (`E-xx`).

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md` | `RESULT: DRAFT-VALID` (6 non-blocking warnings: 3× "git diff --stat blind" + 3× "AC verification method wording") | None |
| `AC-01` | `E-02`, `E-04` | vitest 148/148 static fence pass (including "applies BLINK opacity to the background pseudo-element"); compiled CSS shows `.hrpStickyAnnouncementAnimBlink::before { animation: hrpStickyAnnouncementBlink 1.4s ease-in-out infinite }`. Signature BLINK behavior preserved. | None |
| `AC-02` | `E-02`, `E-04` | vitest static fence pass (including "applies the border-flash keyframe to the BLINK wrapper class"); compiled CSS shows `@keyframes hrpStickyAnnouncementBlinkBorder { border-color: ... 65% → 25% }` and `.hrpStickyAnnouncementAnimBlink { border-color: transparent; animation: ...BlinkBorder... 1.4s ... infinite }`. | None |
| `AC-03` | `E-02`, `E-04` | vitest static fence pass (including "AC-03: pause-on-hover rule for BLINK `::before` exists inside the hover media"); compiled CSS shows `@media (hover: hover) and (pointer: fine) { ... .hrpStickyAnnouncement:hover .hrpStickyAnnouncementAnimBlink::before { animation-play-state: paused } }`. | None |
| `AC-04` | `E-02`, `E-04` | vitest static fence pass (including "AC-04: pause-on-hover rule for the BLINK wrapper class" + "AC-04: pause-on-hover rule for the MARQUEE message"); compiled CSS shows cùng `@media (hover: hover) and (pointer: fine)` block chứa 3 selectors với `animation-play-state: paused`. | None |
| `AC-05` | `E-02`, `E-04` | vitest static fence pass (including "reduced-motion override still pins `animation: none` for BLINK wrapper, ::before, and MARQUEE message"); compiled CSS shows `@media (prefers-reduced-motion: reduce) { .hrpStickyAnnouncementAnimBlink, ...:before, ...MessageMarquee { animation: none } }`. | None |
| `AC-06` | `E-02`, `E-04` | vitest static fence pass (including "AC-06: wrapper carries onMouseEnter and onMouseLeave attributes" + "AC-06: component declares a `isHovered` useState"); mount test "BLINK wrapper carries onMouseEnter / onMouseLeave listeners" pass. | None |
| `AC-07` | `E-02` | vitest mount test "MARQUEE pauses on mouseenter and resumes on mouseleave" pass: `message!.style.animationPlayState === 'paused'` sau `mouseover`, `'running'` sau `mouseout`. | None |
| `AC-08` | `E-02`, `E-04` | vitest static fence pass (including "AC-05: hover-pause rules are gated by `@media (hover: hover) and (pointer: fine)` so touch devices are not paused"); touch device (báo `hover: none` hoặc `pointer: coarse`) sẽ không match media query → rule không apply → banner không bị pause. | None |
| `AC-09` | `E-02`, `E-05` | `GlobalFooter.test.tsx` 2 test pass: src chứa `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed`; src KHÔNG chứa `openstreetmap.org/export/embed.html`. | None |
| `AC-10` | `E-02`, `E-05` | `GlobalFooter.test.tsx` test "AC-10: text địa chỉ cột 1 giữ nguyên nguyên văn" pass. | None |
| `AC-11` | `E-06` | `git status --short` confirm `app/(portal)/layout.tsx` không có trong staged/unstaged diff. | None |
| `AC-12` | `E-06` | `git status --short` confirm `src/domains/job-board/public-content-controls/types.ts` không có trong staged/unstaged diff. | None |
| `AC-13` | `E-02`, `E-05`, `E-06` | `git status --short` confirm `package.json` + `package-lock.json` không có diff; `GlobalFooter.test.tsx` test "không thêm Google Maps API key vào src" pass. | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node node_modules/typescript/bin/tsc --noEmit` | exit 0, 0 errors | `evidence/03-typecheck.log` |
| `E-02` | `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/domains/job-board/public-content-controls app/components/GlobalFooter.test.tsx` | exit 0, 11 file pass, 245 test pass (148 static fence + 15 server-render + 10 mount + 18 revision + 17 url-safety + 13 dto-projection + 6 footer + 5 use-public-content + 2 news-section + 7 animation + 4 news-section-gate), 0 failed | `evidence/01-vitest-targeted.log` |
| `E-03` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0, 7 file PASS (strict UTF-8 without BOM) | `evidence/02-encoding-verify.log` |
| `E-04` | Inspect compiled CSS file `.next/static/css/fa95e596bd9d7205.css` (after `next build`) for `hrpStickyAnnouncement*` rules | All required keyframes, classes, and media queries present. Confirms: `hrpStickyAnnouncementBlinkBorder` keyframe; `.hrpStickyAnnouncementAnimBlink` wrapper rule with border-color animation; `.hrpStickyAnnouncementAnimBlink::before` opacity animation; `@media (hover: hover) and (pointer: fine)` pause block for all 3 selectors; `@media (prefers-reduced-motion: reduce)` override with `animation: none` for all 3. | `evidence/04-compiled-sticky-css.txt` (extracted) |
| `E-05` | `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts app/components/GlobalFooter.test.tsx` (subset of E-02) | 6/6 test pass | `evidence/01-vitest-targeted.log` (lines for `app/components/GlobalFooter.test.tsx`) |
| `E-06` | `git status --short` after `git commit e592a7ac` and `git commit e4080690` | Confirms: 6 source/test file + 5 doc file staged/committed. `app/(portal)/layout.tsx`, `types.ts`, `public-sticky-announcement.tsx`, `animation.ts`, `package.json`, `package-lock.json` not in diff. | inline (this turn's `git status --short` output) |
| `E-07` | `git diff --check` (post-commit) | exit 0, no whitespace/line-ending issues | inline |
| `E-08` | `node node_modules/next/dist/bin/next build` | exit 0, "Compiled successfully in 38.6s" (first run) / "8.0s" (second run); 4 pre-existing warnings (TypeScript-eslint) unrelated to T1A | inline |
| `E-09` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/.../TASK.md` | exit 0, RESULT DRAFT-VALID (6 non-blocking warnings) | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

- Source/test/migration đã frozen tại Implementation SHA `e592a7ac8426df449d0d544ff696f7b2a742e4fc`; docs + evidence tại `e4080690` (parent: `e592a7ac`). Canonical gates (typecheck, vitest targeted, encoding, build, git diff --check, verify-task) đều PASS. Compiled CSS inspection (`evidence/04-compiled-sticky-css.txt`) xác nhận mọi CSS rule đã được Next/Tailwind compile đúng (hover-pause media query intact, keyframe border-flash tồn tại, reduced-motion override bao phủ 3 selectors). Đủ điều kiện T0 review.
- Self-review xác nhận `git status --short` post-commit không còn semantic delta ngoài allowlist; `app/(portal)/layout.tsx`, `types.ts`, `public-sticky-announcement.tsx`, `animation.ts`, `package.json`, `package-lock.json` đều không có diff (verified bằng E-06).

> Handoff status: READY_FOR_REVIEW
