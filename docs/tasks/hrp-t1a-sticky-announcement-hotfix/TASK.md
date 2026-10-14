# TASK — `hrp-t1a-sticky-announcement-hotfix`

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
| Audit reason | Hotfix UI/CSS thuần, blast radius hẹp (1 component + 1 footer). Không đổi contract data, không đổi schema, không auth/permission, không public API. Tier 1 self-review đủ. |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` (implementation SHA `e592a7ac`; awaiting T0 push/merge approval) |
| Planner | `Tier 1` |
| Baseline | `c0d32c8a29daf2b94325b3c0cef08bb79409f235` (origin/main, post-PR #136) |
| Baseline note | User directive tham chiếu SHA `efbfca6321b7f1b1c69904b4cd283a859be1a67d` không tồn tại trong repo (`git rev-parse efbfca6... -> bad object`). Origin/main HEAD thực tế tại thời điểm lập task = `c0d32c8a` (Merge PR #136). Tier 1 dùng `c0d32c8a` làm baseline, lưu ý lên Tier 0 trong HANDOFF § Baseline note. |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/domains/job-board/public-content-controls/sticky-announcement.tsx`; `src/domains/job-board/public-content-controls/sticky-announcement.module.css`; `src/domains/job-board/public-content-controls/sticky-announcement.test.tsx`; `src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx`; `src/domains/job-board/public-content-controls/content-controls.static.test.ts`; `app/components/GlobalFooter.tsx`; `app/components/GlobalFooter.test.tsx` (tạo mới nếu chưa có); `docs/tasks/hrp-t1a-sticky-announcement-hotfix/**` |
| Forbidden paths | `prisma/**`; `app/admin/**`; `app/api/**`; `app/(portal)/layout.tsx` (mount point KHÔNG đổi); `src/domains/job-board/public-content-controls/types.ts` (DTO KHÔNG đổi); `src/domains/job-board/public-content-controls/public-sticky-announcement.tsx` (Phase B wrapper KHÔNG đổi); `src/domains/job-board/public-content-controls/animation.ts`; các T1C-owned file khác ngoài allowlist |
| Required gates | `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/domains/job-board/public-content-controls app/components/GlobalFooter.test.tsx` (nếu có); `node .ai-pipeline/scripts/verify-encoding.mjs`; `node node_modules/next/dist/bin/next build` (CSS output inspection only); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/HANDOFF.md -TaskPath docs/tasks/hrp-t1a-sticky-announcement-hotfix/TASK.md`; `git diff --check` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `T0_PUSH_PR_MERGE` |
| Implementation SHA | `e592a7ac8426df449d0d544ff696f7b2a742e4fc` |

> Lane FAST mặc định Audit NONE. Tier 1 tự review ≤ 3 rủi ro trọng yếu. T0 review contract hotfix trước khi push.

## 1. Outcome

### 1.1 User-visible outcome

1. **Sticky announcement animation hoạt động trên desktop** (giống mobile):
   - Cấu hình admin (DTO `animation: 'BLINK'` hoặc `'MARQUEE'`) hiển thị hiệu ứng tương ứng trên cả desktop và mobile khi người dùng không bật `prefers-reduced-motion: reduce`.
   - Hành vi reduced-motion được giữ nguyên (giữ theo quy ước a11y) — khi user OS bật reduce-motion, animation tắt cả desktop và mobile.
   - Hiệu ứng BLINK phải **nhìn thấy được** bất kể `backgroundOpacity` (0–100%): thêm 1 visual cue phụ (border-color flash) ngoài `::before` opacity để vẫn thấy blink khi background mờ.

2. **Pause khi hover, resume khi un-hover**:
   - Khi user rê chuột vào bar (mouse enter): cả BLINK và MARQUEE đều **pause** ngay lập tức (`animation-play-state: paused`).
   - Khi user rê chuột ra (mouse leave): animation **resume** từ đúng thời điểm pause (`animation-play-state: running`).
   - BLINK: animation nằm trên `::before` pseudo-element → dùng parent `:hover` selector.
   - MARQUEE: animation apply inline trên message element → dùng stylesheet `animation-play-state` (CSS cascade, không bị ghi đè vì inline shorthand không khai báo play-state).
   - **Touch device**: không có `mouseenter`/`mouseleave` thật → wrap hover-pause trong `@media (hover: hover) and (pointer: fine)` để touch KHÔNG bị kẹt banner.

3. **GlobalFooter map iframe OSM → Google Maps embed**:
   - Thay `https://www.openstreetmap.org/export/embed.html?bbox=...&marker=21.314035%2C105.680883` bằng Google Maps embed tương đương, **không cần API key**.
   - URL: `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed` (public embed endpoint, marker giữ nguyên toạ độ).
   - Địa chỉ text trong cột 1 giữ nguyên nguyên văn: `Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kế, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam`.

### 1.2 Non-goals

- Không đổi DTO `StickyAnnouncementDto` (`types.ts`).
- Không đổi `safeStickyAnnouncement`.
- Không đổi `prefers-reduced-motion` semantics (giữ nguyên a11y behavior).
- Không thêm dependency, package, hoặc env variable.
- Không thêm API key cho Google Maps.
- Không đổi `app/(portal)/layout.tsx` (mount point của `<PublicStickyAnnouncement />`).
- Không touch admin, prisma, API routes.
- Không push / merge / deploy.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public-content-controls/sticky-announcement.tsx:282-285` (`if (mounted && isDismissed) return null;`) | Suppression predicates; pause-on-hover chỉ có ý nghĩa khi bar đang render. |
| `EV-02` | `src/domains/job-board/public-content-controls/sticky-announcement.tsx:178-205` (marquee effect armAnimation) | MARQUEE animation được apply inline trên `messageEl.style.animation` (name + duration + timing + iteration, KHÔNG có `animation-play-state`). Đây là cơ sở cho DEC-T1A-15: stylesheet `:hover { animation-play-state: paused }` sẽ apply. |
| `EV-03` | `src/domains/job-board/public-content-controls/sticky-announcement.module.css:128-152` (BLINK keyframe + class) | BLINK animation `opacity 1 → 0.55 → 1` chỉ trên `::before` (background overlay). Nếu `backgroundOpacity < 50%` thì `::before` invisible, blink invisible. |
| `EV-04` | `src/domains/job-board/public-content-controls/sticky-announcement.module.css:226-244` (prefers-reduced-motion override) | Reduced-motion hiện set `animation: none` cho cả `::before` và `.hrpStickyAnnouncementMessageMarquee`. Hover-pause phải nằm NGOÀI rule này (chỉ apply khi `prefers-reduced-motion: no-preference`). |
| `EV-05` | `app/components/GlobalFooter.tsx:115-126` (iframe OSM embed) | Hiện đang dùng `https://www.openstreetmap.org/export/embed.html?bbox=...`. Cần thay bằng Google Maps embed URL. |
| `EV-06` | `app/(portal)/layout.tsx:1-32` (mount point) | Mount `<PublicStickyAnnouncement />` ở public-portal layout, KHÔNG ở admin/recruiter. Mount này KHÔNG được đổi. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-T1A-15` | Pause animation qua CSS `animation-play-state: paused` thay vì clear/re-apply inline `style.animation`. | `CHOSEN` |
| `DEC-T1A-16` | Wrap hover-pause trong `@media (hover: hover) and (pointer: fine)`. | `CHOSEN` |
| `DEC-T1A-17` | Thêm visual cue phụ cho BLINK: `border-color` flash keyframe trên wrapper `.hrpStickyAnnouncementAnimBlink` (wrapper có `color: var(--color-on-primary)` ổn định, không ảnh hưởng text/icon). | `CHOSEN` |
| `DEC-T1A-18` | Google Maps embed URL: `https://maps.google.com/maps?q=21.314035,105.680883&hl=vi&z=15&output=embed`. | `CHOSEN` |
| `DEC-T1A-19` | Giữ nguyên DTO `StickyAnnouncementDto` (không thêm field hover-pause-enable). | `CHOSEN` |
| `DEC-T1A-20` | Không test chi tiết reduced-motion × hover-pause interaction (đã cover bằng static fence). | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Hover-pause cho CSS animation | Native CSS `animation-play-state` | `N/A` | N/A | N/A | N/A | Task không tạo capability mới, chỉ dùng primitive có sẵn. |
| Visual cue thứ 2 cho BLINK | Native CSS keyframe `border-color` | `N/A` | N/A | N/A | N/A | Primitive có sẵn, không cần library. |
| Google Maps embed | `maps.google.com/maps?output=embed` (public endpoint) | `N/A` | Google ToS | N/A | Wrapper = iframe `src` attr | Public embed, không cần API key, không cần library. Không thêm dependency. |

- `N/A`: task không tạo capability kỹ thông thường và không thêm/thay dependency hoặc shared framework. Tất cả 3 capability đều dùng primitive có sẵn trong browser/CSS.

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | N/A | `N/A` | N/A | N/A | N/A | N/A | Task không tạo/thay connector, scheduler, notification worker hoặc multi-system/operator workflow. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Sticky announcement BLINK + MARQUEE phải pause khi user hover vào bar; resume khi un-hover. |
| `RQ-02` | Touch device KHÔNG bị kẹt banner (hover-pause chỉ apply khi browser có hover capability thật). |
| `RQ-03` | BLINK vẫn visible trên desktop bất kể `backgroundOpacity` (thêm visual cue thứ 2 ngoài `::before` opacity). |
| `RQ-04` | GlobalFooter iframe thay OSM bằng Google Maps embed cho cùng toạ độ `21.314035, 105.680883`; địa chỉ text giữ nguyên nguyên văn. |
| `RQ-05` | `prefers-reduced-motion: reduce` vẫn tắt animation, độc lập với hover-pause (không regression a11y). |

### 4.2 Scope boundaries

- **In:** `src/domains/job-board/public-content-controls/sticky-announcement.{tsx,module.css,test.tsx,mount.test.tsx}`; `src/domains/job-board/public-content-controls/content-controls.static.test.ts`; `app/components/GlobalFooter.tsx`; `app/components/GlobalFooter.test.tsx` (tạo mới nếu chưa có); `docs/tasks/hrp-t1a-sticky-announcement-hotfix/**`.
- **Out:** `prisma/**`; `app/admin/**`; `app/api/**`; `app/(portal)/layout.tsx`; `src/domains/job-board/public-content-controls/types.ts`; `src/domains/job-board/public-content-controls/public-sticky-announcement.tsx`; `src/domains/job-board/public-content-controls/animation.ts`; các T1C-owned file khác.
- **Allowed task artifacts:** `docs/tasks/hrp-t1a-sticky-announcement-hotfix/**`.

### 4.3 Domain boundaries

- **Data/state:** N/A — không đổi DTO, không đổi storage. Pause state là UI-only local state (`useState<boolean>(isHovered)`).
- **Permission/security:** N/A — không thay đổi permission, RLS, hoặc auth scope.
- **Interface/API:** N/A — không thay đổi HTTP route, DTO, hoặc public API.
- **Migration/rollback:** N/A — không thay đổi schema hoặc migration. Rollback = `git revert <Implementation SHA>`.

## 5. Execution Plan

FAST: 1–4 STEP. Mỗi STEP mô tả outcome theo thứ tự.

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `sticky-announcement.module.css` | Thêm `@media (hover: hover) and (pointer: fine)` block với `:hover { animation-play-state: paused }` cho cả BLINK `::before` và MARQUEE message. Thêm keyframe `hrpStickyAnnouncementBlinkBorder` áp dụng trên `.hrpStickyAnnouncementAnimBlink` (wrapper) cho visual cue thứ 2. Override pause trong `prefers-reduced-motion` block. | E-01, E-04 | Không tìm được cách áp dụng pause mà không ghi đè inline `style.animation` của MARQUEE → escalate T0. |
| `STEP-02` | `sticky-announcement.tsx` | Thêm `useState<boolean>(isHovered)` + `onMouseEnter` / `onMouseLeave` trên wrapper. Khi `isHovered && showMarqueeTrack && !prefersReducedMotion`, set `messageEl.style.animationPlayState = 'paused'` (inline). Cleanup: khi un-hover hoặc khi animation = NONE, reset `animationPlayState = ''`. | E-02 | Inline manipulation không thể bypass CSS cascade → escalate T0. |
| `STEP-03` | `GlobalFooter.tsx` | Thay iframe `src` từ OSM URL → Google Maps embed URL. Giữ nguyên `title`, `loading`, `width`, `height`. | E-05 | Google Maps embed cần API key → escalate T0 (không xảy ra: đã verify endpoint public). |
| `STEP-04` | Tests (3 file test + 1 file test mới) | Cập nhật `content-controls.static.test.ts` (fence mới); cập nhật `sticky-announcement.test.tsx` (server-render); cập nhật `sticky-announcement.mount.test.tsx` (jsdom hover-pause); tạo `GlobalFooter.test.tsx` nếu chưa có. | E-03 | Test environment thiếu jsdom config → escalate T0. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `.hrpStickyAnnouncementAnimBlink::before` vẫn được animate (regression fence cho signature BLINK behavior). | E-04 (static fence) |
| `AC-02` | `.hrpStickyAnnouncementAnimBlink` (wrapper) có thêm 1 animation visual cue thứ 2 (border flash keyframe) để visible khi `backgroundOpacity` thấp. | E-04 (static fence) |
| `AC-03` | CSS rule `.hrpStickyAnnouncement:hover .hrpStickyAnnouncementAnimBlink::before { animation-play-state: paused }` tồn tại bên trong `@media (hover: hover) and (pointer: fine)`. | E-04 (static fence) |
| `AC-04` | CSS rule tương tự cho MARQUEE message `.hrpStickyAnnouncementMessageMarquee`. | E-04 (static fence) |
| `AC-05` | `prefers-reduced-motion: reduce` block vẫn set `animation: none` cho cả BLINK và MARQUEE (regression fence). | E-04 (static fence) |
| `AC-06` | TSX có `onMouseEnter` / `onMouseLeave` trên wrapper, set state `isHovered`. | E-02 (mount test) |
| `AC-07` | Khi `isHovered && showMarqueeTrack && !prefersReducedMotion`, message element có `style.animationPlayState === 'paused'`. | E-02 (mount test) |
| `AC-08` | Touch device simulation (`window.matchMedia('(hover: hover)')` trả `false`): hover handler fire nhưng `style.animationPlayState` KHÔNG set. | E-02 (mount test) |
| `AC-09` | `app/components/GlobalFooter.tsx` iframe `src` chứa `https://maps.google.com/maps?q=21.314035%2C105.680883`. | E-05 (footer test) |
| `AC-10` | Text địa chỉ cột 1 giữ nguyên nguyên văn `Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kế, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam`. | E-05 (footer test) |
| `AC-11` | `app/(portal)/layout.tsx` KHÔNG bị đổi (regression fence: file not in diff). | E-06 (`git diff --stat`) |
| `AC-12` | DTO `src/domains/job-board/public-content-controls/types.ts` KHÔNG bị đổi (regression fence: file not in diff). | E-06 (`git diff --stat`) |
| `AC-13` | Không thêm dependency: `package.json` + `package-lock.json` không có diff ngoài allowlist. | E-06 (`git diff --stat`) |

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
| `RISK-01` | Inline `style.animation` shorthand trên MARQUEE message ghi đè stylesheet `animation-play-state`. | MARQUEE inline chỉ set `${name} ${duration}s linear infinite` (không có `animation-play-state`), nên stylesheet `:hover { animation-play-state: paused }` vẫn apply theo CSS cascade. Verify bằng compiled CSS inspection (`evidence/04-compiled-sticky-css.txt`). |
| `RISK-02` | `@media (hover: hover)` không match trên browser cũ (IE11, Safari < 13.4). | Repo target Next 15, React 19, Tailwind 4 — modern browsers. Browser support 2026 đủ. Không cần polyfill. |
| `RISK-03` | Google Maps embed bị rate-limit hoặc chặn ở một số network. | External resource, không phải API key. Nếu chặn thì iframe trắng (giống OSM). User directive chấp nhận. |
| `RISK-04` | `output=embed` parameter bị Google deprecate. | Public embed ổn định 10+ năm. Nếu deprecate, chuyển sang variant URL. Đã verify. |
| `RISK-05` | Touch device có `hover: hover` khi kết nối mouse (iPad + Magic Keyboard). | Khi đó user có hover thật → pause là behavior mong muốn. Không gây vấn đề. |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF.

| Round | Decision | Reason |
|---|---|---|
| 1 | Tier 1 self-review: PASS. | Gates pass: typecheck 0 errors, vitest 245/245 pass, encoding PASS, build PASS, git diff --check clean. Self-review found no blocker; 3 risks tracked in HANDOFF are below report threshold. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-14 | Initial contract | Hotfix scope: pause-on-hover, visible BLINK, OSM→Google Maps. |
| `v1.0` | 2026-10-14 | Status: READY_TO_CODE → READY_FOR_REVIEW; added Implementation SHA + Evidence index. | Implementation committed at `e592a7ac`; gates pass. |

## 11. Evidence index (informational, không thuộc template V2)

Tier 1 đã capture evidence trong `docs/tasks/hrp-t1a-sticky-announcement-hotfix/evidence/`:

| File | Description | Tied to AC |
|---|---|---|
| `01-vitest-targeted.log` | Targeted vitest run: 11 file, 245 test pass (148 static fence + 15 server-render + 10 mount + 18 revision + 17 url-safety + 13 dto-projection + 6 footer + 5 use-public-content + 2 news-section + 7 animation + 4 news-section-gate). | AC-01..AC-08, AC-09, AC-10 |
| `02-encoding-verify.log` | `verify-encoding.mjs`: 7 file changed text, strict UTF-8 without BOM, RESULT PASS. | regression fence (AC-13) |
| `03-typecheck.log` | `tsc --noEmit`: 0 errors. | regression fence |
| `04-compiled-sticky-css.txt` | Compiled CSS for the sticky announcement module (extracted from `.next/static/css/fa95e596bd9d7205.css`). Confirms: `hrpStickyAnnouncementBlinkBorder` keyframe with `border-color` animation; `.hrpStickyAnnouncementAnimBlink` wrapper rule; `@media (hover: hover) and (pointer: fine)` with `animation-play-state: paused` for all 3 selectors; `@media (prefers-reduced-motion: reduce)` override with `animation: none` for all 3 selectors. | AC-01..AC-05, AC-09 (CSS) |
