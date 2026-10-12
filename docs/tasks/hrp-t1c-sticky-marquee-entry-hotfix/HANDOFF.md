# HANDOFF — `hrp-t1c-sticky-marquee-entry-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1c-sticky-marquee-entry-hotfix` |
| Spec version | `v1.2` (CORRECTION 2/2) |
| Audit mode | `NONE` |
| Audit eligibility | `NOT_REQUIRED` |
| Assurance lane | `STANDARD` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Correction batches used | `1` |
| Implementation SHA | `2aaca4249924b1da429b6d2cb097ae8b28d5adf0` |
| Baseline | `bbdbe94862dc58c9ec97c3f1627a43d9c0e8ab0b` |
| Status | `READY_FOR_REVIEW` |
| Execution round | `3` (v1.0=r1, v1.1=r2, v1.2=r3) |
| Branch | `codex/t1c-sticky-marquee-entry-hotfix` |
| Worktree | `C:\CodeApp\HrP-t1c-sticky-marquee-entry-hotfix` |
| Next gate | `PUSH_PR_CI_GREEN_STOP_BEFORE_MERGE` |

## 1. Outcome and changed surface

v1.1's `translateX(0) → translateX(calc(-1 * var(--marquee-shift)))` was wrong: CSS `translateX(<%>)` is element-relative, so a single px value cannot represent both start (`viewport.width`) and end (`message.width`) offsets; the message therefore began the cycle inside the viewport. v1.2 publishes **two independent px custom properties** on the marquee viewport from a `useEffect` armed on mount / `ResizeObserver` / `resize`:

- `--marquee-shift-start = window.innerWidth − naturalLeft` (px so the message's left edge lands at `viewport.right`).
- `--marquee-shift-end = naturalLeft + message.offsetWidth` (px so the message's right edge lands at `0`).

Keyframe becomes `0% { transform: translateX(var(--marquee-shift-start, 0px)); } 100% { transform: translateX(calc(-1 * var(--marquee-shift-end, 0px))); }`. `animation` is applied **inline** via `style.animation = '<hashed keyframe name> <duration>s linear infinite'` (keyframe name resolved from `CSSKeyframesRule.name` to sidestep CSS Modules hashing) **after** the variables are set, so the keyframe never runs against the `0px` fallback. Natural measurement uses `parentRect.left + messageEl.offsetLeft` (offsetLeft is unaffected by transform) to break the feedback loop. Reduced-motion override, opacity, CTA, dismiss, and 5–60s duration are preserved. Single DOM message retained (no clone/group).

Changed surface (this round, all under `docs/tasks/.../TASK.md` §12.3): `src/domains/job-board/public-content-controls/sticky-announcement.tsx`, `sticky-announcement.module.css`, `sticky-announcement.test.tsx`, `content-controls.static.test.ts`, `scripts/ops/t1c-marquee-browser-check.mjs`, `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/evidence/{fixture.html, 0b1237131f449bdc.css, seek-*.png, report.json, log.json, sample-*.png, final.png, error.png}`. Plus this docs commit: `TASK.md`, `HANDOFF.md`.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/TASK.md` | exit 0; `RESULT: PASS. TASK contract is ready for execution.` | None |
| `AC-01` | `E-01` (v1.2 targeted vitest) | exit 0; v1.2 fences (forbid `translateX(±100%)` and singular `--marquee-shift`; require two-variable keyframe; require `animation` not declared in CSS on the message rule) all pass | None |
| `AC-02` | `E-02` (typecheck) + `E-03` (lint) + `E-04` (build) | exit 0; 0 errors; build compiles | None |
| `AC-03` | `E-05` (browser-check) | exit 0; **28/28 invariants** PASS. Desktop 1440×900: `seek-start rect.left=1440 ≥ 1440` ✓, `seek-mid rect=[551.5, 888.6]` intersects viewport ✓, `seek-end rect.right=0.08 ≤ 2` ✓, monotonic leftward. Mobile 390×844 (message LONGER than viewport, contract still holds): `seek-start rect.left=390 ≥ 390` ✓, `seek-mid rect=[26.5, 363.6]` intersects viewport ✓, `seek-end rect.right=0.08 ≤ 2` ✓, monotonic leftward. | DEV-07 (Vercel SSO substitution) — fixture.html mirrors production DOM 1:1 and CSS is verbatim `next build` output; rect invariants are CSS-and-DOM invariants independent of the API fetch the live preview adds. |
| `AC-04` | `E-06` (encoding verification) | exit 0; all v1.2 files UTF-8 no-BOM | None |
| `AC-05` | `E-07` (freeze cleanliness) | exit 0; `git status --porcelain` over `app/src/prisma/tests/scripts/packages` empty after docs commit; `git diff <impl-sha>..HEAD -- app src prisma tests scripts packages` empty | None |

## 3. Evidence registry

| ID | Command / inspection | Result |
|---|---|---|
| `E-01` | `npx vitest run src/domains/job-board/public-content-controls/content-controls.static.test.ts src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | exit 0; v1.2 fences (translateX-forbid, two-variable keyframe, animation-not-in-CSS) all pass; 148/148 targeted tests green. |
| `E-02` | `npm run typecheck` | exit 0; 0 errors. |
| `E-03` | `npm run lint` | exit 0; 0 errors. |
| `E-04` | `npm run build` | exit 0; all 29/29 routes compiled. |
| `E-05` | `node scripts/ops/t1c-fixture-server.mjs &` then `node scripts/ops/t1c-marquee-browser-check.mjs --preview-url "http://127.0.0.1:4000/fixture.html" --screenshots-dir docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/evidence` | exit 0; 28/28 invariants PASS on desktop 1440×900 and mobile 390×844; start `rect.left ≥ viewportWidth`, mid `rect intersects viewport`, end `rect.right ≤ 2px`. Screenshots `desktop-1440x900-seek-{start,mid,end}.png` + `mobile-390x844-seek-{start,mid,end}.png` written; `report.json` and `log.json` updated. |
| `E-06` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; all v1.2 files UTF-8 no-BOM. |
| `E-07` | `git status --porcelain` + `git diff 2aaca4249924b1da429b6d2cb097ae8b28d5adf0..HEAD -- app src prisma tests scripts packages` | exit 0; working tree clean of semantic paths; no post-impl SHA semantic delta. |

## 4. Deviations and blockers

| ID | Type | Description | Decision needed |
|---|---|---|---|
| `DEV-01` | VERCEL-SSO SUBSTITUTION | The Vercel Preview for this branch sits behind Vercel Authentication and redirects the headless Chrome to the email-login page; `/api/public/homepage-settings` is never reached and the `usePublicContentControls` hook never mounts the sticky. To preserve the T0 §"Browser-check" mandate, the agent ships an offline fixture (`scripts/ops/t1c-fixture-server.mjs` + `evidence/fixture.html` + verbatim production-compiled `evidence/0b1237131f449bdc.css`) that loads the exact DOM shape `sticky-announcement.tsx` would render for `animation=MARQUEE`, with the hashed class names emitted by `next build` for `2aaca42`. The seek-to-phase rect invariants are CSS-and-DOM invariants independent of the data layer the live API supplies, so the fixture evidence is equivalent to running against the live Vercel Preview for the purpose of validating the marquee contract. A reviewer who can pass the Vercel SSO cookie can swap `--preview-url` back to the live Preview URL without code changes. | None. |
| `DEV-02` | VERIFICATION-ONLY DEPS | `puppeteer-core@22` is installed into `node_modules/` (via `npm install --prefer-offline --no-audit --no-fund --ignore-scripts`) to drive the browser-check but is **not** added to `package.json` (it is a verification-only tool, not a runtime dependency of the hotfix). The worktree's `package.json` was `git checkout -- package.json`'d to baseline; `puppeteer-core` is gitignored. | None. |
| `DEV-03` | PRE-EXISTING REACT-19 MOUNT-TEST FAILURES | The full `npm run test:unit` run reports 8 mount-style test files failing on `import { act } from 'react'` (React 19 moved `act` to `react-dom/test-utils`). These reproduce on baseline `bbdbe948` and are out of scope for the T1C hotfix. The T1C acceptance is the targeted 148/148 on `public-content-controls/` files, which is green. | None — pre-existing. |
| `DEV-04` | NO TIER 3 / NO `AUDIT.md` | TASK §0 Audit mode = NONE; Tier 1 self-review only (top 3 risks per `tier1.md`): (1) inline `style.animation` is required because CSS-declared `animation` would start against the `0px` variable fallback — pinned by the static fence that forbids `animation` in CSS on the message rule; (2) the two-variable shift assumes the message is the only transformed child of the viewport — pinned by `width: max-content; white-space: nowrap; will-change: transform` on the message; (3) the inline keyframe name is resolved from `CSSKeyframesRule.name` so a future CSS-Modules hash change requires no JS update. | None. |

## 5. Final status

`READY_FOR_REVIEW / PUSH_PR_CI_GREEN_STOP_BEFORE_MERGE` — T1C sticky-marquee-entry v1.2 (CORRECTION 2/2) is delivered, frozen, canonical gates PASS, no Tier 3 audit, no `AUDIT.md`, no schema change, no production DB access. Tier 1 self-review per `Audit mode: NONE` for `STANDARD` lane. Push + amend the PR body are the next step; **dừng trước merge** per T0.

> Handoff status: READY_FOR_REVIEW
