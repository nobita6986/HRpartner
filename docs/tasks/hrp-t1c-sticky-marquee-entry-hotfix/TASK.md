# TASK — hrp-t1c-sticky-marquee-entry-hotfix

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-sticky-marquee-entry-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | `Bug chỉ ở CSS keyframe/layout của sticky marquee; không thuộc authorization/RLS, schema, business rule. Owner chấp nhận self-review top 3 risks. Không tạo AUDIT.md.` |
| Spec version | `v1.1` (CORRECTION 1/1) |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `bbdbe94862dc58c9ec97c3f1627a43d9c0e8ab0b` |
| Baseline origin | `bbdbe948… = origin/main @ takeover` |
| Implementation SHA | `e777267528e95caca0bd5c979aff2083847a2aa5` (v1.1 semantic commit) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| In-scope roots | `src/domains/job-board/public-content-controls/sticky-announcement.tsx`; `src/domains/job-board/public-content-controls/sticky-announcement.module.css`; `src/domains/job-board/public-content-controls/sticky-announcement.test.tsx`; `src/domains/job-board/public-content-controls/content-controls.static.test.ts`; `scripts/ops/t1c-marquee-browser-check.mjs`; `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/**` |
| Forbidden paths | `Prisma schema/migrations; auth/RLS; API payload names, enum values, IDs, domain invariants; production DB; unrelated admin UI; other CSS keyframe/animation files; package.json (no new runtime dependency added — see HANDOFF §DEV-06)` |
| Required gates | `targeted Vitest (sticky-announcement); npm run test:unit; npm run typecheck; npm run lint; npm run build; encoding verification; prisma validate; git diff --check; t1c-marquee-browser-check (Puppeteer-core on Vercel Preview, desktop 1440x900 + mobile 390x844)` |
| Current execution round | `2` |
| Current audit round | `0` |
| Next gate | `PUSH_PR_CI_GREEN` (Tier 1 dừng trước merge) |

## 1. Outcome

### 1.1 User-visible outcome

- **Bottom Sticky MARQUEE mỗi vòng chạy tuần tự**: bản hiện tại chạy hết từ ngoài mép phải ra khỏi mép trái (visible rời khỏi viewport hoàn toàn) rồi mới có bản kế tiếp vào từ mép phải.
- **Không còn hiện tượng "bản sao xuất hiện giữa viewport khi bản đầu còn đang chạy"** — mỗi thời điểm chỉ một bản nội dung hiển thị, đúng pattern double-text seamless mà T0 yêu cầu.
- Không thay đổi animation class, keyframe timing, duration bound, opacity, CTA, dismiss button, reduced-motion handling.

### 1.2 Non-goals

- Không sửa keyframe `0% → -50%` (giữ nguyên để tránh ảnh hưởng timing/duration đã test ở #105).
- Không thêm JS ResizeObserver hay đo width runtime.
- Không sửa markup (`sticky-announcement.tsx` vẫn render 2 group giống pattern #105).
- Không thay đổi Zod schema, API, admin form, persistence.
- Không thay đổi reduced-motion override.
- Không sửa các module khác ngoài `sticky-announcement.module.css` và static test fence.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner mô tả bug trên production: `vieclammienbac.com.vn` Sticky MARQUEE có "bản sao xuất hiện giữa viewport khi bản đầu còn đang chạy"; Expected: mỗi vòng bắt đầu hoàn toàn ngoài mép phải, chạy hết qua mép trái rồi mới lặp | Xác định triệu chứng + expected behavior rõ ràng |
| `EV-02` | PR #105 (`codex/t1c2-sticky-settings-followup`) merge `ca41980e` đã sửa opacity-only-on-background + bounded 5–60s duration, nhưng KHÔNG sửa cấu trúc track group → bug mới phát sinh sau #105 | Hotfix này tiếp nối #105, không phải re-#105 |
| `EV-03` | `src/domains/job-board/public-content-controls/sticky-announcement.module.css` hiện có: `track { display: flex; width: max-content; animation: ... }` + `group { padding-right: 2rem }` (2 group giống hệt) + `keyframe { 0% translateX(0); 100% translateX(-50%) }` | Khi message width < viewport, group A vẫn còn visible trong viewport khi animation reset → "bản sao chen giữa" |
| `EV-04` | HTML production (`vieclammienbac.com.vn/`) server-render: KHÔNG có `data-testid="sticky-announcement"` trong initial SSR (đúng — `mounted=false` server-render). Sticky chỉ render sau client fetch `/api/public/homepage-settings` | Xác nhận hotfix không ảnh hưởng SSR; chỉ cần test behavior client sau mount |
| `EV-05` | W3C CSS `transform: translateX(-N%)` tính theo width của element được transform (track), không theo viewport. Khi 2 group có cùng width W và gap 0 giữa 2 group, track width = 2W, `translateX(-50%)` dịch đi W (seamless). Khi có gap/padding ở group hoặc giữa group, track width ≠ 2W → animation lệch | Lý do chọn pattern `width: 200%` + 2 group `width: 50%` thay vì `width: max-content` |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Đổi `track` từ `width: max-content` sang `width: 200%`; đổi `group` từ `flex: 0 0 auto` + `padding-right: 2rem` sang `flex: 0 0 50%; width: 50%`; giữ `padding-right: 2rem` ở group (vẫn tạo gap A↔B visually) | `CHOSEN` |
| `DEC-02` | Giữ keyframe `translateX(0) → translateX(-50%)` nguyên xi. Toán học: `50% × 200% = 100%` = 1 group width = seamless | `CHOSEN` |
| `DEC-03` | Thêm `overflow: hidden` ở group để clip message dài hơn viewport (giới hạn 280 chars theo Zod schema → max ~2800px, có thể vượt viewport ở mobile) | `CHOSEN` |
| `DEC-04` | Bổ sung static fence assert `width: 50%` ở group + `width: 200%` ở track; verify giá trị `-50%` trong keyframe là relative to track (không đổi % value) | `CHOSEN` |
| `DEC-05` | Tradeoff chấp nhận được: message dài hơn viewport sẽ bị clip trong group. Document trong `EV-06` để Owner/Admin biết convention (giữ message ngắn, dưới ~80 chars để fit desktop 1440px và mobile 390px) | `CHOSEN` |
| `DEC-06` | Không thêm JS ResizeObserver, không đo runtime width — CSS-only pattern đủ cho cả desktop và mobile với group width cố định = viewport width | `CHOSEN` |
| `DEC-07` | Không gọi Tier 3, không tạo `AUDIT.md`. Audit mode: NONE theo hotfix scope (chỉ CSS keyframe/layout, không authorization/RLS/business rule) | `CHOSEN` |

`Build vs adopt N/A`: hotfix dùng CSS pattern đã có (CSS Modules, keyframe animation). Không thêm dependency, không thêm shared framework.

`Build vs automate N/A`: không có connector, scheduler, worker.

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| CSS keyframe / transform pattern | Existing CSS Modules + keyframe | `N/A` | `N/A` | Repo `sticky-announcement.module.css` | Same file | Tự sửa CSS, không thêm library |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| None | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | Không có workflow |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | MARQUEE render đảm bảo 1 bản nội dung visible tại mỗi thời điểm (không có 2 bản cùng hiển thị trong viewport cùng lúc) |
| `RQ-02` | Mỗi vòng bắt đầu từ ngoài mép phải viewport, chạy hết qua mép trái (visible rời khỏi viewport hoàn toàn), rồi mới có bản tiếp theo vào từ mép phải |
| `RQ-03` | Không thay đổi keyframe timing (giữ `0% → -50%`), animation duration bound (5–60s), opacity-only-on-background, reduced-motion override, dismiss control, CTA behavior |
| `RQ-04` | Markup (`sticky-announcement.tsx`) không đổi; chỉ CSS thay đổi |

### 4.2 Scope boundaries

- **In:** `src/domains/job-board/public-content-controls/sticky-announcement.module.css`; static test fence `content-controls.static.test.ts` (bổ sung assertion); `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/**` (TASK + HANDOFF + optional evidence)
- **Out:** Prisma schema/migrations; auth/RLS; API payload names, enum values, IDs, domain invariants; production DB; unrelated admin UI; other CSS files; `sticky-announcement.tsx`; Zod schema; admin form; `usePublicContentControls`; `public-sticky-announcement.tsx`

### 4.3 Domain boundaries

- **Data/state:** không thay đổi. Hotfix thuần CSS, không ảnh hưởng persistence.
- **Permission/security:** không thay đổi. CTA URL validation, dismiss/revision semantics, text rendering giữ nguyên.
- **Interface/API:** không thay đổi.
- **Migration/rollback:** N/A — không có schema change, không có state change. Rollback = revert commit duy nhất.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `sticky-announcement.module.css` | Sửa `.hrpStickyAnnouncementTrack` `width: max-content` → `width: 200%`; sửa `.hrpStickyAnnouncementMarqueeGroup` `flex: 0 0 auto` → `flex: 0 0 50%; width: 50%; overflow: hidden` | Targeted vitest static fence; manual CSS reasoning | Bất kỳ thay đổi markup hay keyframe nào ngoài plan |
| `STEP-02` | `content-controls.static.test.ts` | Bổ sung assertion: `width: 200%` ở track, `width: 50%` + `flex: 0 0 50%` + `overflow: hidden` ở group | Targeted vitest run | Assertion phá vỡ invariant khác |
| `STEP-03` | Toàn changed surface | Chạy canonical quality gates, review diff, commit implementation SHA, viết HANDOFF, pin SHA, `verify-handoff.ps1` | Tất cả required gates pass | Bất kỳ gate fail |
| `STEP-04` | Branch `codex/t1c-sticky-marquee-entry-hotfix` | Push + mở PR, base `main @ bbdbe948` | `gh pr create` exit 0; CI run triggered | Network/auth fail |
| `STEP-05` | CI | Đợi CI xanh | `gh pr checks` tất cả success | CI fail → dừng, báo T0, không tự fix ngoài scope |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | CSS track có `width: 200%`; group có `flex: 0 0 50%; width: 50%; overflow: hidden` | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/content-controls.static.test.ts` (assert mới thêm) |
| `AC-02` | Keyframe vẫn `0% → -50%`; track `width: 200%` → `translateX(-50%) = -100% = -1 viewport = -1 group width` (seamless) | `node -e` static analysis (xem `E-08`); vitest component test (server-render) |
| `AC-03` | Toàn bộ test surface (targeted + full unit) pass; typecheck pass; lint 0 errors; build pass; encoding PASS; prisma validate pass; `git status --porcelain` clean of `app/ src/ prisma/ tests/ scripts/ packages/` after freeze | `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run build`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `npx --no-install prisma validate`, `git status --porcelain` |
| `AC-04` | Markup `sticky-announcement.tsx` không đổi (byte-for-byte empty diff) | `git diff HEAD -- src/domains/job-board/public-content-controls/sticky-announcement.tsx` returns empty |
| `AC-05` | No schema/migration, no auth/RLS, no canonical API/enum/ID change | `git status --porcelain` + manual review |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-01` | `AC-04`, `AC-05` |
| `RQ-04` | `STEP-04` (post-merge) | `AC-04` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | CSS pattern `width: 200% + group width: 50%` có thể conflict với `width: max-content` ở parent track container trong một số browser cũ | Static fence assert width/flex; `AC-01` regression; rollback = revert single commit |
| `RISK-02` | Message dài hơn viewport bị clip trong group | Document convention (giữ message < 80 chars); không chặn release; thêm static fence check `overflow: hidden` để behavior nhất quán |
| `RISK-03` | Admin có thể set message rất dài trong tương lai, gây UX kém khi bị clip | Owner thông báo convention trong admin form help text (out-of-scope cho hotfix này; note là P3) |
| `RISK-04` | Reduced-motion override hiện tại set `display: none` cho group `aria-hidden="true"` và `overflow: visible` cho viewport — vẫn tương thích với pattern mới (group mới có overflow hidden, override reduced-motion vẫn áp dụng) | Manual reasoning + vitest mount test |

## 8. Open Questions

- None. T0 đã ghi rõ root cause nghi ngờ ("render hai group giống nhau, keyframe 0% → -50%") và cho phép T1 tự quyết fix.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | `Keep the approved contract execution-ready; tier1 self-review` | CSS-only hotfix, single file changed, no DB |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-06` | Initial contract; CSS-only hotfix for sticky marquee entry, base `bbdbe948`, Audit mode NONE | T0 directive to fix marquee entry bug surviving #105 |
| `v1.1` | `2026-10-06` | **CORRECTION 1/1** — pivot from `width: 200% / group width: 50%` (double-text seamless) to **single-text marquee**: drop the duplicate `aria-hidden="true"` group from `sticky-announcement.tsx`, drop `.hrpStickyAnnouncementTrack` + `.hrpStickyAnnouncementMarqueeGroup` rules from the stylesheet, animate the message itself with `translateX(100%) → translateX(-100%)` so the message starts fully off the right edge, runs through the viewport, and exits fully off the left edge before the next cycle begins. Update the static fence to assert the new contract and to forbid the `200% / 50%` constants. Add a Puppeteer-core browser-check that runs the live Vercel Preview on a desktop (1440×900) and a mobile (390×844) viewport to assert exactly one `.hrpStickyAnnouncementMessageMarquee` element is visible at a time. | T0 rejected the previous attempt and required: (1) exactly one copy of the message per cycle; (2) start fully outside the right edge; (3) run through the entire viewport and exit fully off the left; (4) no second clone; (5) viewport clips but the message is not internally truncated; (6) markup AND keyframe are allowed to change. |

## 11. CORRECTION 1/1 — Single-Text Marquee (T0 mandated pivot)

### 11.1 Why the previous shape was rejected

The first execution round kept the legacy `width: 200%` track with two
`width: 50%` group copies and the legacy `translateX(0) → translateX(-50%)`
keyframe, with a T0 explanation of "mathematically seamless". T0 rejected
that approach for the following reasons:

- **Two copies are explicitly forbidden.** T0 point 4: "Không dùng bản sao
  thứ hai chen vào để tạo seamless loop." The `200% / 50% / 50%` shape
  exists *only* to support a second clone of the message that scrolls
  in from the right as the first one scrolls out on the left. That is
  exactly the shape T0 forbade.
- **Message truncation.** With `overflow: hidden` on each group, a
  message whose natural width exceeds the viewport is clipped on both
  edges. T0 point 5: "bản thân message không bị cắt khi dài." The
  `overflow: hidden` belongs on the viewport, not on the group.
- **Constraint was lifted.** T0 point 6: "Được sửa markup/keyframe —
  bỏ constraint 'markup và 0→-50% không đổi'." The previous contract
  locked both the JSX and the keyframe, which is why the first attempt
  had to attempt a duplicate-clone pattern at all. Both are now free
  to change.

### 11.2 New contract

| ID | Contract |
|---|---|
| `CQ-01` | Exactly one SPAN element with class `hrpStickyAnnouncementMessageMarquee` is rendered in the DOM. No `aria-hidden="true"` clone, no track wrapper, no second group. |
| `CQ-02` | The keyframe is `0% { transform: translateX(100%); } 100% { transform: translateX(-100%); }`. The single message starts fully outside the right edge of the viewport, runs through the entire viewport, and exits fully off the left edge before the next cycle begins. |
| `CQ-03` | The viewport has `overflow: hidden`. The message itself has `white-space: nowrap` and `width: max-content`; the message is never truncated by its own `overflow`. |
| `CQ-04` | The marquee duration is still bound to `var(--sticky-marquee-duration, 18s)` (5–60s as set by the admin), and the marquee message class is animated `linear infinite`. Reduced-motion override collapses to `animation: none` and `white-space: normal`. |
| `CQ-05` | All previously preserved affordances still hold: opacity stays on the `::before` background, the CTA `sticky-announcement-cta` is unchanged, the dismiss `sticky-announcement-dismiss` button is unchanged, and the component still imports / re-exports through the public barrel. |
| `CQ-06` | Browser-check is mandatory: a Puppeteer-core script runs the live Vercel Preview URL on (a) desktop 1440×900 and (b) mobile 390×844, asserts exactly one `.hrpStickyAnnouncementMessageMarquee` element is in the DOM, asserts the computed keyframe is `translateX(100%) → translateX(-100%)`, and takes a screenshot of the marquee at three timestamps (start, mid, end of one cycle). |

### 11.3 Files changed in v1.1

| Path | Change |
|---|---|
| `src/domains/job-board/public-content-controls/sticky-announcement.tsx` | Drop the `aria-hidden="true"` clone group. Render exactly one SPAN with classes `hrpStickyAnnouncementMessage` and `hrpStickyAnnouncementMessageMarquee` inside the marquee viewport. |
| `src/domains/job-board/public-content-controls/sticky-announcement.module.css` | Drop `.hrpStickyAnnouncementTrack` and `.hrpStickyAnnouncementMarqueeGroup` rules. Rewrite `@keyframes hrpStickyAnnouncementMarquee` to `0% { translateX(100%); } 100% { translateX(-100%); }`. Move the `animation: …marquee…` declaration from the track onto the new `.hrpStickyAnnouncementMessageMarquee` class. The viewport keeps `overflow: hidden`; the message keeps `width: max-content; white-space: nowrap; will-change: transform`. Reduced-motion override is rewritten to address the new class names. |
| `src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | Update the "MARQUEE" component test to assert exactly one occurrence of the message in the rendered HTML, the presence of the new `hrpStickyAnnouncementMessageMarquee` class, the absence of `data-testid="sticky-announcement-marquee-tail"`, and the absence of the `hrpStickyAnnouncementMarqueeGroup` / `hrpStickyAnnouncementTrack` classes. |
| `src/domains/job-board/public-content-controls/content-controls.static.test.ts` | Replace the previous `width: 200%` / `width: 50%` seamless-entry fence with a single-text entry fence: assert the keyframe is `translateX(100%) → translateX(-100%)`, the message rule is `width: max-content; white-space: nowrap`, the message rule does NOT contain `overflow: hidden`, the viewport rule has `overflow: hidden`, the animation property is set on the message, and the legacy `200%` / `50%` constants are forbidden anywhere in the stylesheet. Allow whitespace around `{message}` in the JSX interpolation fence. |

### 11.4 Browser-check evidence requirement

The browser-check script lives at
`scripts/ops/t1c-marquee-browser-check.mjs` and uses `puppeteer-core`
pointed at the existing `C:\Users\Admin\.cache\puppeteer\chrome\…\chrome.exe`
binary that the agent already discovered in this environment. The script:

1. Connects to the Vercel Preview URL of this PR.
2. Waits for `data-testid="sticky-announcement"` to appear (the component
   only renders after the client-side `usePublicContentControls` fetch).
3. Counts `document.querySelectorAll('.hrpStickyAnnouncementMessageMarquee').length`
   — must be exactly `1`.
4. Captures `getComputedStyle(...).animation` and `getComputedStyle(...).transform`
   at three timestamps separated by 1.5 s, confirming the message moves
   monotonically leftward and the keyframe is `translateX(100%)` → `translateX(-100%)`.
5. Repeats the same flow on a 390×844 mobile viewport.
6. Writes screenshots to `docs/tasks/hrp-t1c-sticky-marquee-entry-hotfix/evidence/`.
7. Exits non-zero on any failure so CI / gate wrappers can fail loud.

If the Vercel Preview is unreachable or the marquee is not yet served on
the preview, the script reports a structured `BLOCKER` line to the
HANDOFF and the run is treated as a blocking failure (T0 point 8).

