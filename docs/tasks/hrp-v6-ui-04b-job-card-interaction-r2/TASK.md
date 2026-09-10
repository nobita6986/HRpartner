# TASK — `hrp-v6-ui-04b-job-card-interaction-r2`

> **Job-card interaction correction R2** theo Tier 0 review v2 (`tier0-review-ui04c-contracts-v2.md`) §3 + Tier 0 review v3 (`tier0-review-ui04c-contracts-v3.md`) SMALL CLOSEOUT.
> Tier 0 review v1 (`tier0-review-ui04c-contracts-v1.md`) §6 + v2 + v3: sửa v1.3 với semantic Link cho content, CTA button sibling, prop chain chốt ngay trong contract, không dùng `aria-hidden` trên CTA có thể focus, thêm `featured-job-card.test.tsx` allowlist, dùng `buildHref(job.slug)`, RISK-05 bỏ stopPropagation, AC-10 bỏ selector `.cta:focus + .action-area`, metadata đồng bộ v1.3.
> v1.4: Owner live visual review R1 (`docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/owner-live-visual-review-r1.md`) FAIL — `CORRECTION_REQUIRED` trước Tier 3 audit. Round mới: VIS-04 (CTA capsule/ring dư) + VIS-05 (hover label mất tương phản). Reset execution round về `1`. Status `READY_FOR_EXECUTION` (chờ Tier 2 round 1).
> Scope: sửa `featured-job-card.tsx` để vùng lương/action có hiệu ứng lật sang CTA `Ứng tuyển nhanh` khi hover/focus; CTA gọi ApplyModal hiện có; click vùng card còn lại đi tới `/viec-lam/{slug}`; không nested interactive element; hỗ trợ keyboard + touch/mobile + prefers-reduced-motion; preview fixture cards có CTA disabled. Round 2 thêm: CTA hiển thị sạch — chỉ một filled surface duy nhất, không capsule/ring dư; hover/focus giữ text tương phản đọc được.
> UI-only, STANDARD lane, FOCUSED audit. KHÔNG mở ApplyModal internals (Plan B đã chốt), KHÔNG schema/API/Admin.
> Plan UI predecessor: Plan B `ACCEPTED` (18919da) + correction R1 `ACCEPTED` (284e46c).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04b-job-card-interaction-r2` |
| Work type | `CODE` (UI interaction + accessibility + mobile fallback) |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Spec version | `v1.4` |
| Status | `ACCEPTED` (Tier 1 /resolve — Tier 3 FOCUSED audit PASS round 1, 0 findings, VIS-04/05 verified) |
| Planner | `Tier 1` |
| Baseline | HEAD đầu round — `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt` |
| Source reference | correction R1 commit `284e46c` (card polish + ribbon VIS-01..03 đã chốt) |
| Plan UI predecessor | Plan B `ACCEPTED` (18919da) + correction R1 `ACCEPTED` (284e46c) |
| Plan UI successor | composition/footer (`hrp-v6-ui-04c-home-composition-footer`) + section-render (`hrp-v6-ui-04d-section-render`) — cả hai phụ thuộc card đã hoàn thiện interaction này |
| In-scope roots | `src/domains/job-board/components/landing/featured-job-card.tsx`, `src/domains/job-board/components/landing/featured-job-card.test.tsx` (NEW — AC-01/02/03/10/15), `src/domains/job-board/components/landing/best-jobs-section.tsx`, `app/(portal)/page.tsx` (chỉ khi cần thay đổi compose để test, không sửa section khác), `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**` (bao gồm `evidence/owner-live-visual-review-r1.md`) |
| Forbidden paths | `src/domains/job-board/public.service.ts`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `app/components/GlobalFooter.tsx`, `src/domains/job-board/public-listing.params.ts`, `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` (không sửa fixture; dùng prop để phân biệt), `app/api/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `app/admin/**`, `app/globals.css` NGOÀI nếu cần thêm CSS transition cho flip (Tier 1 duyệt); `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**`, `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Tier 3 FOCUSED audit PASS |
| Visual gate | Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `1` (v1.4 — Owner R1 visual review correction; round 0 implementation `e18e54e` đã pass gates nhưng CTA visual fail) |
| Next gate | `/resolve → ACCEPTED` — Tier 3 FOCUSED audit PASS round 1, 0 findings. composition/footer + section-render chuyển `READY_FOR_EXECUTION`. Owner R2 live visual review (post-deploy) |

## 1. Outcome

### 1.1 User-visible outcome

**Card interaction mới trên tất cả FeaturedJobCard instances** (BestJobs grid trên homepage):

- **Hover desktop (pointer):** khi pointer vào card, vùng thanh lương/salary/action area chuyển từ mặt trước (hiển thị salary thật hoặc "Lương thương lượng") sang mặt sau (CTA `Ứng tuyển nhanh`). Rời card thì quay về salary.
- **Focus-within (keyboard):** khi focus vào card (Tab), vùng action hiện CTA mà không cần hover. Focus CTA riêng hiện CTA.
- **Click/tap behavior:**
  - Click/tap vào CTA `Ứng tuyển nhanh` → mở ApplyModal hiện có (Plan B đã chốt), không điều hướng. ApplyModal nhận job identity/slug/title thật qua prop.
  - Click/tap vào bất kỳ vùng còn lại của card → đi tới `/viec-lam/{slug}`.
- **Touch/mobile fallback:** không phụ thuộc hover. Ưu tiên: vùng action hiển thị salary + CTA song song (side by side) hoặc CTA luôn truy cập được. Tap CTA mở ApplyModal. Tap vùng card khác đi tới detail. Không có tap nào vô tình submit.
- **`prefers-reduced-motion`:** không có chuyển động lật 3D. Chuyển tức thời hoặc fade nhẹ. Chức năng đầy đủ.
- **Card không có salary:** hiển thị mặt trước "Lương thương lượng", sau đó flip sang CTA.
- **Preview/INTEGRATION_PENDING cards:** CTA disabled hoặc ghi "Bản xem trước". Không mở ApplyModal bằng fixture giả. Card thật dùng flow thật.

**CTA visual treatment (Owner R1 correction — VIS-04 + VIS-05):**
- Mặt sau chỉ chứa **đúng một** filled CTA surface. KHÔNG có outer capsule/padded ring ngoài (không `bg-primary-container p-3` trên `.action-area-back`).
- CTA button là visible rounded surface duy nhất; border không quá 1px semantic outline token; KHÔNG double background, KHÔNG inset ring khi nghỉ.
- Rest + hover + focus + active giữ cặp foreground/background tương phản hợp lệ. KHÔNG `hover:text-primary-container` (làm icon + label mất tương phản cùng background token). Hover dùng subtle state overlay hoặc shadow, không đổi text sang background token.
- Keyboard focus outline ≤ 2px, chỉ hiển thị trên `:focus-visible`, không trông giống resting border.

**Semantic HTML structure:**
- Không nested interactive element (không button bên trong Link, không Link bên trong button).
- Card link là link thật (anchor element hoặc Next Link component) với href canonical `/viec-lam/{slug}` — bọc nội dung card (title + meta + salary area decoration).
- CTA button là sibling với card link, có stacking/focus rõ ràng. CTA KHÔNG bên trong Link.
- KHÔNG dùng div với onClick để navigate.

**Accessibility:**
- Keyboard: Tab tới link detail và CTA riêng. Focus CTA hiện mặt CTA (CSS rule `.card:focus-within .action-area` + `.cta:focus + .action-area`).
- Salary có accessible text bình thường (button CTA có accessible name `Ứng tuyển nhanh` qua text content hoặc `aria-label`).
- KHÔNG dùng `aria-hidden` trên CTA có thể focus. KHÔNG dùng `aria-hidden` để che cả hai mặt cùng lúc; chỉ ẩn mặt trang trí trùng lặp khỏi screen reader khi mặt còn lại đang hiện.
- Focus indicator rõ ràng trên cả link và CTA (`focus-visible` outline hoặc ring).

### 1.2 Non-goals

- KHÔNG tạo modal thứ hai — dùng ApplyModal hiện có.
- KHÔNG gọi route apply trực tiếp khi chưa có dữ liệu/consent form.
- KHÔNG lật toàn bộ card — chỉ vùng action/salary.
- KHÔNG làm title/layout nhảy — chiều cao hai mặt cố định.
- KHÔNG phục hồi bộ gate CDP/20 PNG đã bỏ.
- KHÔNG sửa ApplyModal internals.
- KHÔNG sửa Hero, Areas, Recruiting card.
- KHÔNG mở schema/API/Admin.

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| Job-card interaction R2 (task này) | Plan UI interaction R2 | DRAFT — đầu chuỗi |
| BestJobs tab + pagination + URGENT fixture | Plan B | ACCEPTED (18919da) |
| VIS-01..03 style/layout correction | Correction R1 | ACCEPTED (284e46c) |
| Composition/footer | Task C composition/footer | DRAFT |
| Sections 5 mới (Việc làm mới nhất, Giới thiệu HRP, Đối tác, Tin tức, Banner mobile) | Task D section-render | DRAFT |
| Backend (HomepageSettings, permission, write API, Admin page) | Plan Admin V6 AV1 | DRAFT |
| JobPosting editor | Plan Admin V6 AV2 | DRAFT |
| CMS homepage content | Plan Admin V6 AV-CMS | DRAFT |
| Detail page UI | Plan D.A | DRAFT |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/components/landing/featured-job-card.tsx:1-150` | Card hiện đang hiển thị salary badge và CTA cùng lúc (static). Phải thêm flip state + animation |
| `EV-02` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Card dùng article element. Props: job, urgency, source?, onApply? callback (chốt prop chain trong DEC-04/RQ-07). onApply nhận closure job, gọi ApplyModal hiện có qua prop chain page.tsx → BestJobsSection → FeaturedJobCard |
| `EV-03` | `app/(portal)/page.tsx` + `src/domains/job-board/components/landing/best-jobs-section.tsx` | BestJobs grid render FeaturedJobCard với job data từ overview.newest hoặc fixture. Prop chain chốt trong contract: page.tsx có `handleApply(job)` closure; truyền xuống BestJobsSection qua `onApply`; BestJobsSection đóng closure theo job và truyền `onApply: () => void` vào FeaturedJobCard |
| `EV-04` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Card link tới `/viec-lam/{slug}` via Next Link. Prop `job.slug` đã có |
| `EV-05` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Salary label từ `salaryLabel(job.salaryMin, job.salaryMax)` — hiện trên salary badge. Card không có salary → "Lương thương lượng" |
| `EV-06` | `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` | Preview fixture (INTEGRATION_PENDING) có cấu trúc tương tự job thật nhưng không trigger ApplyModal thật. Tier 2 phân biệt qua prop `source` hoặc `isPreview` |
| `EV-07` | `tier0-review-ui04c-contracts-v1.md` §6 | Tier 0 mandate: flip animation, ApplyModal contract, no nested interactive, keyboard, touch/mobile, prefers-reduced-motion |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Card structure: vùng card chính là article element hoặc div với role="article". Nội dung card (title + meta + salary area decoration) được bọc bởi Link với href là `/viec-lam/${slug}` — link thật có semantic + keyboard behavior sẵn. CTA button là **sibling** của Link (KHÔNG nằm trong Link), có `position: absolute` overlay trên vùng salary/action. CTA button gọi `onApply` callback (xem DEC-04). KHÔNG dùng div với onClick để navigate; KHÔNG nested interactive element | `CHOSEN` |
| `DEC-02` | Flip chỉ áp dụng cho vùng action/salary area — KHÔNG flip toàn bộ card. Mặt trước: salary badge thật hoặc "Lương thương lượng". Mặt sau: CTA `Ứng tuyển nhanh`. Chiều cao hai mặt CỐ ĐỊNH để grid không reflow. Dùng CSS 3D transform hoặc clip-path với `perspective` | `CHOSEN` |
| `DEC-03` | Hover/focus trigger flip. Desktop: `hover`/`focus-within` đưa CTA ra. Touch/mobile: hiển thị cả salary và CTA song song trong vùng action — không phụ thuộc hover. CTA vẫn truy cập được | `CHOSEN` |
| `DEC-04` | **Prop chain chốt ngay trong contract:** handleApply là closure bắt ApplyModal trigger từ page state với signature `(job: EnrichedJob) => void`. Page truyền handleApply xuống BestJobsSection qua prop `onApply`. BestJobsSection đóng closure theo `EnrichedJob` và truyền callback không tham số vào FeaturedJobCard qua prop `onApply: () => void`. FeaturedJobCard CTA gọi `props.onApply()` — không tạo context mới, không sửa `ApplyModal` internals. Fixture preview (best-jobs-urgent-preview) truyền `onApply: undefined` hoặc `disabled` state — Tier 2 phân biệt qua prop `source === 'DEMO'` hoặc `isPreview`. | `CHOSEN` |
| `DEC-05` | Click vùng card (không phải CTA) → navigate tới `/viec-lam/{slug}` qua Link semantic. Click CTA → gọi `props.onApply()` (đã đóng closure theo job). KHÔNG cần `e.stopPropagation()` vì CTA là sibling DOM. KHÔNG dùng div với onClick để navigate | `CHOSEN` |
| `DEC-06` | Detail URL = `/viec-lam/{slug}` — `BestJobsSection` dùng `buildHref(job.slug)` (KHÔNG `job.id`) khi truyền prop cho `FeaturedJobCard`; `FeaturedJobCard` Link semantic dùng `href={\`/viec-lam/${job.slug}\`}`. KHÔNG hardcode route lần thứ hai trong card (card chỉ giữ `href` prop, route helper thuộc BestJobsSection) | `CHOSEN` |
| `DEC-07` | `prefers-reduced-motion`: bỏ 3D rotation, chuyển tức thời hoặc fade nhẹ. Dùng CSS media query `@media (prefers-reduced-motion: reduce)` | `CHOSEN` |
| `DEC-08` | Preview/INTEGRATION_PENDING card (phân biệt qua prop `source === 'DEMO'` hoặc `isPreview`): CTA disabled hoặc ghi "Bản xem trước". Click CTA không mở ApplyModal. Card thật dùng flow thật | `CHOSEN` |
| `DEC-09` | Card không có salary: mặt trước "Lương thương lượng", sau đó flip sang CTA. Không để action area rỗng | `CHOSEN` |
| `DEC-10` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source/test allowlist. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa plan cha | `CHOSEN` |
| `DEC-11` | Baseline = HEAD đầu round (Tier 2 đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`). Expected unit failure set capture tại exec-head-before | `CHOSEN` |
| `DEC-12` | Visual parity = Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-13` | Tier 3 FOCUSED audit sau khi Tier 2 xong. Audit focus: semantic HTML structure (no nested interactive), CTA modal contract, keyboard accessibility, touch/mobile fallback, prefers-reduced-motion, preview card behavior | `CHOSEN` |
| `DEC-14` | OBR-01 allow tạo HANDOFF + `evidence/**` + sửa featured-job-card.tsx (chính) + tạo featured-job-card.test.tsx (NEW) + best-jobs-section.tsx (nếu cần điều chỉnh prop chain) + page.tsx (nếu cần thay đổi compose để test). KHÔNG cấm mọi file mới trong §0 In-scope roots | `CHOSEN` |
| `DEC-15` | VIS-04 (Owner R1): Mặt sau CTA chỉ chứa đúng một filled surface. `.action-area-back` KHÔNG dùng `bg-primary-container p-3` (loại bỏ outer capsule/ring). CTA button là visible rounded surface duy nhất, fill action area, border không quá 1px semantic outline. KHÔNG double background, KHÔNG inset ring khi nghỉ. Dùng radius family + restrained shadow hiện có của HuongB. Focus outline ≤ 2px, chỉ trên `:focus-visible` | `CHOSEN` |
| `DEC-16` | VIS-05 (Owner R1): CTA giữ cặp foreground/background tương phản ở rest + hover + focus + active. KHÔNG `hover:text-primary-container` (làm icon + label mất tương phản cùng background token). Hover dùng subtle state overlay hoặc shadow, không đổi text sang background token. Icon cùng foreground đọc được với label. Hover/focus KHÔNG ẩn CTA face, KHÔNG reset về back side, KHÔNG làm text trong suốt | `CHOSEN` |
| `DEC-17` | R2 round 1 preserve flip timing, salary front face, semantic Link/button sibling, ApplyModal callback, preview disabled, mobile fallback, reduced-motion, buildHref(job.slug) — chỉ sửa visual treatment CTA. KHÔNG đổi semantic HTML, KHÔNG đổi prop chain, KHÔNG đổi route helper. KHÔNG thêm padding/background mới vào `.action-area-back`; chỉ clean CTA surface | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Card structure: vùng card chính là article element hoặc div với role="article". Nội dung card (title + meta + salary area decoration) được bọc bởi Link với href là `/viec-lam/${job.slug}` — Link thật có semantic + keyboard behavior sẵn, không cần role/click handler giả. CTA button là **sibling** của Link (KHÔNG nằm trong Link), có `position: absolute` overlay trên vùng salary/action. CTA gọi `props.onApply()` đã đóng closure theo job (xem RQ-06). KHÔNG nested interactive element; KHÔNG div với onClick để navigate |
| `RQ-02` | Flip animation chỉ áp dụng cho vùng action/salary area — KHÔNG flip toàn bộ card. Mặt trước: salary badge thật hoặc "Lương thương lượng". Mặt sau: CTA "Ứng tuyển nhanh". Chiều cao hai mặt CỐ ĐỊNH (fixed height) để grid không reflow khi flip. Dùng CSS 3D transform với `perspective` + `transform-style: preserve-3d` |
| `RQ-03` | Desktop hover/focus trigger: `hover`/`focus-within` đưa mặt sau (CTA) ra; rời card trả về mặt trước (salary). Animation ngắn, easing nhẹ, không gây nhấp nháy |
| `RQ-04` | Touch/mobile fallback: KHÔNG phụ thuộc hover. Ưu tiên: hiển thị salary và CTA song song trong vùng action (side by side). Nếu không đủ chỗ: salary + tap/toggle để hiện CTA. Tap CTA mở ApplyModal. Tap vùng card khác đi tới detail. Không tap nào vô tình submit |
| `RQ-05` | Keyboard accessibility: Tab tới link detail và CTA riêng. Focus CTA hiện mặt CTA mà không cần hover. Focus indicator rõ ràng trên cả link và CTA (`focus-visible` outline hoặc ring). **KHÔNG** dùng `aria-hidden` trên CTA có thể focus. Salary giữ accessible text bình thường; CTA có accessible name `Ứng tuyển nhanh`. Chỉ ẩn mặt trang trí trùng lặp khỏi screen reader khi cần |
| `RQ-06` | `prefers-reduced-motion`: dùng `@media (prefers-reduced-motion: reduce)`. Bỏ 3D rotation, chuyển tức thời hoặc fade nhẹ. Chức năng đầy đủ khi không có animation |
| `RQ-07` | **Prop chain chốt ngay trong contract:** page.tsx định nghĩa `handleApply: (job: EnrichedJob) => void` (closure bắt ApplyModal trigger từ page state). Page truyền `handleApply` xuống `BestJobsSection` qua prop `onApply`. `BestJobsSection` đóng closure theo `EnrichedJob` (best-jobs-urgent-preview shape) và truyền callback không tham số vào `FeaturedJobCard` qua prop `onApply: () => void`. `FeaturedJobCard` CTA button gọi `props.onApply?.()`. KHÔNG tạo context mới; KHÔNG sửa ApplyModal internals; KHÔNG gọi route apply trực tiếp. |
| `RQ-08` | Preview/INTEGRATION_PENDING card (phân biệt qua prop `source === 'DEMO'` hoặc `isPreview`): CTA disabled hoặc ghi "Bản xem trước". Click CTA không mở ApplyModal. Card thật dùng flow thật |
| `RQ-09` | Card không có salary: mặt trước "Lương thương lượng", sau đó flip sang CTA. Không để action area rỗng |
| `RQ-10` | Regression: KHÔNG sửa ApplyModal internals, Hero, Areas, Recruiting card, search card, ReferralStrip, Footer. KHÔNG mở API, service, schema, permission, Admin page. KHÔNG phục hồi bộ gate CDP/20 PNG đã bỏ |
| `RQ-11` | Detail URL helper: `BestJobsSection` gọi `buildHref(job.slug)` (KHÔNG `job.id`) khi truyền prop cho `FeaturedJobCard`. `FeaturedJobCard` Link semantic dùng `href={\`/viec-lam/${job.slug}\`}`. KHÔNG hardcode route lần thứ hai trong card — card chỉ giữ `href` prop, route helper thuộc `BestJobsSection` |
| `RQ-12` | VIS-04 (CTA visual treatment): Mặt sau CTA chỉ có đúng một filled surface duy nhất. `.action-area-back` KHÔNG dùng `bg-primary-container p-3` (loại bỏ outer capsule/ring ngoài); chỉ là positioning/flip surface, không background/padding trang trí. CTA button fill action area, dùng radius family + restrained shadow hiện có của HuongB. Border không quá 1px semantic outline token; KHÔNG double background, KHÔNG inset ring khi nghỉ |
| `RQ-13` | VIS-05 (CTA label contrast): CTA giữ cặp foreground/background tương phản ở rest + hover + focus + active. KHÔNG dùng `hover:text-primary-container` (làm icon + label mất tương phản cùng background token). Hover dùng subtle state overlay hoặc shadow, không đổi text sang background token. Icon cùng foreground đọc được với label. Hover/focus KHÔNG ẩn CTA face, KHÔNG reset về back side, KHÔNG làm text trong suốt. Dùng một trong hai cặp semantic: `bg-primary-dark`/`text-on-primary` hoặc `bg-primary-container`/`text-on-primary-container` |

### 4.2 Scope boundaries

- **Container-only edits**: Sửa `featured-job-card.tsx` (chính) + `best-jobs-section.tsx` (prop chain) + `app/(portal)/page.tsx` (nếu cần test). KHÔNG sửa ApplyModal
- **Data/state**: Card nhận job data + onQuickApply callback. KHÔNG gọi API mới
- **Permission/security**: N/A
- **Interface/API**: N/A
- **Migration/rollback**: N/A
- **Cache**: N/A

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) `git status --porcelain` → `evidence/working-tree-before.txt`. (c) Capture unit failure set hiện tại → `evidence/expected-failure-set-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + failing test files | Nếu expected failure set > 1 (baseline pre-existing) → verify đo đúng lúc exec-head-before; nếu > 1 → báo Planner |
| `STEP-02` | `src/domains/job-board/components/landing/featured-job-card.tsx` — refactor HTML structure | RQ-01: refactor card với semantic structure đúng: article element hoặc div với role="article" chứa Link với href `/viec-lam/${job.slug}` bọc nội dung card (title + meta + decoration), CTA button là **sibling** với `position: absolute` overlay vùng salary/action. KHÔNG nested interactive element. KHÔNG div với onClick để navigate. CTA gọi `props.onApply()` (xem DEC-04) | Source review + component test: không có nested anchor/button. Link và button là siblings. CTA onClick gọi `props.onApply?.()` | Nếu nested interactive tồn tại → halt |
| `STEP-03` | `src/domains/job-board/components/landing/featured-job-card.tsx` — flip animation | RQ-02: thêm CSS 3D transform cho vùng action/salary area. Mặt trước: salary badge thật hoặc "Lương thương lượng". Mặt sau: CTA "Ứng tuyển nhanh". Chiều cao cố định. Dùng `perspective`, `transform-style: preserve-3d`, `backface-visibility: hidden`. Thêm `prefers-reduced-motion` media query | Source review: CSS flip structure, fixed height, no reflow | Nếu flip ảnh hưởng layout card → revert |
| `STEP-04` | `src/domains/job-board/components/landing/featured-job-card.tsx` — hover/focus trigger | RQ-03: thêm CSS trigger: `.card:hover .action-area, .card:focus-within .action-area { transform: rotateX(180deg) }`. Focus indicator rõ ràng | Source review: hover + focus-within trigger, focus indicator | Nếu hover gây nhấp nháy → revert |
| `STEP-05` | `src/domains/job-board/components/landing/featured-job-card.tsx` — CTA modal integration | RQ-07: thêm prop `onApply?: () => void` vào FeaturedJobCard. CTA button gọi `props.onApply?.()`. Prop chain `page.tsx` → `BestJobsSection` → `FeaturedJobCard` chốt: page.tsx có `handleApply(job)` closure bắt ApplyModal trigger; BestJobsSection đóng closure theo `EnrichedJob` và truyền callback không tham số vào FeaturedJobCard. KHÔNG tạo context mới; KHÔNG sửa ApplyModal | Source review + component test: `onApply` prop đúng closure job, gọi modal | Nếu modal không mở → halt |
| `STEP-06` | `src/domains/job-board/components/landing/featured-job-card.tsx` — preview card behavior | RQ-08: thêm prop `source?: 'REAL' | 'DEMO'` hoặc `isPreview?: boolean`. Nếu DEMO/preview: CTA disabled, label "Bản xem trước". Click CTA không gọi `onApply` | Source review: DEMO card CTA disabled, REAL card CTA hoạt động | Nếu CTA preview không disabled → halt |
| `STEP-07` | `src/domains/job-board/components/landing/featured-job-card.tsx` — touch/mobile | RQ-04: CSS media query mobile: hiển thị cả salary và CTA song song (flex-row). Hoặc salary + tap to reveal. Tap CTA mở ApplyModal. Không tap nào vô tình submit | Source review: mobile layout, tap behavior | Nếu mobile không truy cập được CTA → halt |
| `STEP-08` | `src/domains/job-board/components/landing/featured-job-card.tsx` — accessibility | RQ-05: KHÔNG dùng `aria-hidden` trên CTA có thể focus. Salary giữ accessible text bình thường; CTA có accessible name `Ứng tuyển nhanh`. KHÔNG dùng aria-hidden để che cả hai mặt cùng lúc; chỉ ẩn mặt trang trí trùng lặp | Source review + component test: CTA có accessible name, salary có accessible text | Nếu accessibility fail → halt |
| `STEP-09` | `src/domains/job-board/components/landing/featured-job-card.tsx` — reduced motion | RQ-06: thêm `@media (prefers-reduced-motion: reduce)`. Bỏ 3D rotation, chuyển tức thời. Chức năng đầy đủ | Source review: reduced motion media query | Nếu reduced motion không hoạt động → halt |
| `STEP-10` | `src/domains/job-board/components/landing/featured-job-card.tsx` — card không có salary | RQ-09: khi `!job.salaryMin && !job.salaryMax`: mặt trước "Lương thương lượng", sau đó flip sang CTA. Không để action area rỗng | Source review: không salary → "Lương thương lượng" | Nếu action area rỗng → halt |
| `STEP-11` | `src/domains/job-board/components/landing/best-jobs-section.tsx` + `app/(portal)/page.tsx` | Truyền `onApply` prop chain: `page.tsx` định nghĩa `handleApply(job)` closure bắt ApplyModal trigger; truyền xuống BestJobsSection qua prop `onApply`. `BestJobsSection` đóng closure theo `EnrichedJob` (best-jobs-urgent-preview shape) và truyền callback không tham số vào FeaturedJobCard qua prop `onApply: () => void`. RQ-11: `BestJobsSection` dùng `buildHref(job.slug)` khi truyền href cho `FeaturedJobCard` (KHÔNG `job.id`). Component test: render BestJobs trong page.tsx với mock ApplyModal, click CTA card thật mở modal đúng job | Source review + component test: prop chain đúng, modal mở với đúng job data, href dùng `job.slug` | Nếu prop chain gãy hoặc href dùng `job.id` → halt |
| `STEP-12` | Regression check shell + mandatory gates (DEC-12) | Source review: KHÔNG có diff ngoài §0 In-scope roots. `git diff --name-only exec-head-before..HEAD` so với allowlist. `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS | `evidence/ac12-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_REVIEW |

| `STEP-13` | `src/domains/job-board/components/landing/featured-job-card.tsx` — VIS-04 CTA capsule cleanup (R2 round 1) | RQ-12: Bỏ `bg-primary-container p-3` trên `.action-area-back` (loại bỏ outer capsule/ring). `.action-area-back` chỉ là positioning/flip surface, KHÔNG background/padding trang trí. CTA button fill action area height + width, dùng radius family + restrained shadow hiện có của HuongB. Border không quá 1px semantic outline. KHÔNG double background, KHÔNG inset ring khi nghỉ. Preserve DEC-17 (flip timing, salary front, sibling DOM, prop chain) | Source review: `.action-area-back` không còn `bg-primary-container p-3`; CTA button fill action area; chỉ một filled CTA surface. Lưu `evidence/ac15-cta-capsule.txt` | Nếu outer capsule/ring còn → halt |
| `STEP-14` | `src/domains/job-board/components/landing/featured-job-card.tsx` — VIS-05 hover label contrast (R2 round 1) | RQ-13: CTA giữ cặp foreground/background tương phản ở rest + hover + focus + active. Bỏ `hover:text-primary-container` (làm icon + label mất tương phản). Hover dùng subtle state overlay hoặc shadow, không đổi text sang background token. Icon cùng foreground đọc được với label. Hover/focus KHÔNG ẩn CTA face, KHÔNG reset về back side, KHÔNG làm text trong suốt. Component test: assert CTA KHÔNG chứa `hover:text-primary-container`. Focus indicator ≤ 2px, chỉ `:focus-visible` | Source review + component test: CTA không có `hover:text-primary-container`; mỗi state (rest/hover/focus/active) giữ contrasting pair. Lưu `evidence/ac16-cta-hover-contrast.txt` | Nếu hover label mất tương phản → halt |
## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method (command/source review/evidence file) |
|---|---|---|
| `AC-01` | Semantic HTML — KHÔNG nested interactive element, CTA là sibling của Link | Component test (`@testing-library/react`): render `FeaturedJobCard` với mockJob trong file `featured-job-card.test.tsx`, query cho role `link` đếm 1 (chỉ Link detail), role `button` đếm 1 (chỉ CTA). Source review: không có button bên trong Link hoặc ngược lại. Manual method (Tier 2/Tier 3): inspect DOM tree trong test snapshot. Lưu `evidence/ac01-no-nested-interactive.txt` |
| `AC-02` | CTA gọi `onApply` callback với đúng job — không navigate | Component test: click button CTA với mockJob trong file `featured-job-card.test.tsx`, expect `onApply` được gọi 1 lần với closure job. URL pathname KHÔNG đổi. Source review: `props.onApply?.()` trong CTA onClick. Manual method: spy on `useRouter` để assert không có `router.push`. Lưu `evidence/ac02-cta-modal.txt` |
| `AC-03` | Click vào Link (nội dung card) navigate tới `/viec-lam/{slug}` | Component test: click vào title text (Link content) trong `featured-job-card.test.tsx`, expect pathname đổi sang `/viec-lam/{mockJob.slug}`. Source review: `Link` có `href={\`/viec-lam/${job.slug}\`}`. KHÔNG `stopPropagation` cần thiết (CTA là sibling DOM). Manual method: assert `Link` href bằng attribute selector. Lưu `evidence/ac03-card-navigate.txt` |
| `AC-04` | Flip animation chỉ trên vùng action/salary area — chiều cao cố định | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "rotateX\|transform-style: preserve-3d\|backface-visibility"` expect ≥3 match. `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "height.*px\|min-height.*px"` expect ≥1 match trong action area. Lưu `evidence/ac04-flip-animation.txt` |
| `AC-05` | Hover/focus trigger flip — rời card trả về salary | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "\\.card:hover\|\\.card:focus-within"` expect ≥1 match. Lưu `evidence/ac05-hover-trigger.txt` |
| `AC-06` | Touch/mobile: CTA truy cập được mà không cần hover | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "@media.*max-width\|@media.*mobile\|touch\|md:flex"` expect ≥1 match. Source review: mobile layout hiển thị CTA. Lưu `evidence/ac06-mobile-cta.txt` |
| `AC-07` | `prefers-reduced-motion`: bỏ 3D rotation khi set | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "prefers-reduced-motion"` expect ≥1 match. Lưu `evidence/ac07-reduced-motion.txt` |
| `AC-08` | Preview card: CTA disabled hoặc "Bản xem trước" | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "Bản xem trước\|disabled.*DEMO\|DEMO.*disabled\|isPreview.*disabled"` expect ≥1 match. Lưu `evidence/ac08-preview-disabled.txt` |
| `AC-09` | Card không salary: mặt trước "Lương thương lượng" | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "Lương thương lượng"` expect ≥1 match. Lưu `evidence/ac09-no-salary.txt` |
| `AC-10` | Keyboard: focus indicator rõ, CTA focus hiện mặt CTA | Component test trong `featured-job-card.test.tsx`: focus CTA button, expect state/class mà implementation chọn để reveal mặt CTA (e.g. `data-flipped="true"`, `aria-pressed`, hoặc class do flip logic set) xuất hiện. KHÔNG có `aria-hidden` trên CTA button. Manual method: inspect implementation để chọn selector phù hợp với cấu trúc thực (contract không khóa một selector CSS cụ thể); `focus-visible` outline/ring tồn tại. Lưu `evidence/ac10-keyboard.txt` |
| `AC-11` | Regression — không đổi ApplyModal, Hero, Areas, Recruiting card, ReferralStrip, Footer | Command: `git diff --name-only exec-head-before..HEAD \| Where-Object { $_ -notin @('docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/HANDOFF.md', 'docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/**', 'src/domains/job-board/components/landing/featured-job-card.tsx', 'src/domains/job-board/components/landing/best-jobs-section.tsx', 'app/(portal)/page.tsx') }` expect 0 line. Lưu `evidence/ac11-regression.txt` |
| `AC-12` | Mandatory gates | `npm run typecheck` exit 0; full `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS. Tier 3 FOCUSED audit PASS. Lưu `evidence/ac12-gates.txt` với exit code từng gate |
| `AC-13` | Detail URL helper dùng `buildHref(job.slug)`, không hardcode route trong card, không dùng `job.id` | Component test trong `featured-job-card.test.tsx`: render card với mockJob có `slug` (KHÔNG dùng `id`), expect `Link` href chứa `/viec-lam/${mockJob.slug}`. Command: `Select-String -Path src/domains/job-board/components/landing/best-jobs-section.tsx -Pattern "buildHref\(job\.slug\)\|buildHref\(.*\.slug\)"` expect ≥1 match. `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "job\.id"` expect 0 match trong href/Link. Source review: `BestJobsSection` dùng `buildHref(job.slug)`; `FeaturedJobCard` Link `href={\`/viec-lam/${job.slug}\`}`; KHÔNG `job.id` trong href; KHÔNG hardcode route lần thứ hai trong card. Lưu `evidence/ac13-build-href.txt` |
| | `AC-15` | VIS-04 — CTA chỉ là một filled surface duy nhất; `.action-area-back` không còn capsule/ring dư | Component test: render `FeaturedJobCard`, expect className của `.action-area-back` KHÔNG chứa `bg-primary-container` và KHÔNG có `p-3` (no padding on back face). Source review: grep `bg-primary-container p-3` trên `.action-area-back` → expect 0 match. CTA button fill action area (height + width 100%). Border không quá 1px. Lưu `evidence/ac15-cta-capsule.txt` |
| `AC-16` | VIS-05 — CTA giữ cặp foreground/background tương phản; hover KHÔNG đổi text sang background token | Component test (`@testing-library/react`): render CTA, assert button KHÔNG có class `hover:text-primary-container`. Source review: grep `hover:text-primary-container` trong `featured-job-card.tsx` → expect 0 match. Hover state dùng subtle state overlay hoặc shadow, không đổi text color. Lưu `evidence/ac16-cta-hover-contrast.txt` |
| `AC-17` | R2 round 1 preserve flip + accessibility + prop chain — không regression | Component test: 30 test cũ + 2 test mới (AC-15/16) đều pass. `git diff --name-only exec-head-before..HEAD` filter allowlist vẫn 0 line ngoài In-scope roots. Required gates pass. Lưu `evidence/ac17-regression-r2.txt` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02 | AC-01 |
| RQ-02 | STEP-03 | AC-04 |
| RQ-03 | STEP-04 | AC-05 |
| RQ-04 | STEP-07 | AC-06 |
| RQ-05 | STEP-08 | AC-10 |
| RQ-06 | STEP-09 | AC-07 |
| RQ-07 | STEP-05, STEP-11 | AC-02 |
| RQ-08 | STEP-06 | AC-08 |
| RQ-09 | STEP-10 | AC-09 |
| RQ-10 | STEP-12 | AC-11, AC-12 |
| RQ-11 | STEP-02, STEP-11 | AC-13 |
| RQ-12 | STEP-13 | AC-15 |
| RQ-13 | STEP-14 | AC-16 |
| RQ-10, RQ-12, RQ-13 (round 1) | STEP-12, STEP-13, STEP-14 | AC-17 |
| (visual review) | — | AC-14 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Nested interactive element (button trong Link) — HTML không hợp lệ | STEP-02 source review + AC-01 grep. Nếu có nested → halt |
| `RISK-02` | Flip animation gây reflow/layout shift — grid nhảy khi flip | STEP-03 verify fixed height. Chiều cao action area cố định. Nếu reflow → revert |
| `RISK-03` | CTA không mở ApplyModal đúng job (sai prop chain) | STEP-05 + STEP-11 source review + component test. `onApply` prop đúng closure job. Test trên card thật trong BestJobs grid |
| `RISK-04` | Hover gây nhấp nháy khi di chuột từ salary sang CTA | STEP-04 verify easing + duration. Nếu nhấp nháy → revert |
| `RISK-05` | Mobile: tap CTA vô tình navigate sang detail | STEP-07 verify tap behavior. CTA là sibling DOM của Link nên KHÔNG cần `e.stopPropagation()` (Tier 0 review v3 §1.3). Tap CTA trigger `onApply` callback; tap vùng card khác navigate qua Link. Test trên thiết bị thật hoặc device emulation |
| `RISK-06` | Screen reader đọc đồng thời salary và CTA đang bị che | STEP-08 KHÔNG dùng `aria-hidden` che CTA. Salary giữ accessible text bình thường. CTA có accessible name `Ứng tuyển nhanh` |
| `RISK-07` | `prefers-reduced-motion` không disable flip animation | STEP-09 verify media query. Test với `prefers-reduced-motion: reduce` |
| `RISK-08` | Tier 2 sửa ApplyModal internals (Plan B đã chốt) | §0 Forbidden. STEP-12 git diff filter |
| `RISK-09` | Tier 2 sửa Hero, Areas, Recruiting card (Plan A/B đã chốt) | §0 Forbidden. STEP-12 git diff filter |
| `RISK-10` | Flip 3D gây vấn đề performance trên mobile low-end | STEP-03 dùng CSS transform tối thiểu. STEP-07 verify mobile fallback hoạt động |
| `RISK-11` | R2 round 1 — Tier 2 revert semantic HTML structure (link/button sibling) khi sửa CTA visual | DEC-17 preserve + AC-17 regression gate. AC-01/02/03/04/05 vẫn pass; chỉ visual treatment đổi. Nếu semantic HTML bị revert → halt |
| `RISK-12` | R2 round 1 — Tier 2 reintroduce `hover:text-primary-container` khi sửa | AC-16 grep + component test. Nếu hover token vẫn đổi text sang background → halt |
| `RISK-13` | R2 round 1 — Owner R2 visual review lại FAIL vì còn ring dư hoặc hover contrast kém | DEC-15/16 chốt rõ. STEP-13/14 verify bằng grep + component test. Nếu R2 FAIL → Tier 1 đánh giá round tiếp theo |

## 8. Open Questions

None — Tier 0 review v2 đã chốt prop chain ngay trong contract (DEC-04 + RQ-07). Tier 2 chỉ thi công theo contract.

## 9. Planner Resolution

Tier 1 append sau mỗi round.

## 10. Revision Log

- `v1.0` (10/09/2026): Khởi tạo contract. Source: Tier 0 review v1 §6 + owner-live-visual-review-r1.md. STANDARD/FOCUSED lane. Đầu chuỗi thực hiện. UI-only, card interaction flip + ApplyModal + accessibility + touch/mobile + reduced-motion.
- `v1.2` (10/09/2026): Tier 0 review v2 REVISION_REQUIRED. Sửa: (a) Card structure dùng Link semantic cho content, CTA button sibling (bỏ div với onClick để navigate); (b) Prop chain chốt ngay trong contract `handleApply(job)` → `onApply` qua BestJobsSection closure → `onApply()` trong CTA, không OQ; (c) Bỏ `aria-hidden` trên CTA có thể focus; (d) AC semantic dùng component test (không regex multiline); (e) Spec bump → v1.2.
- `v1.4` (10/09/2026): Owner live visual review R1 FAIL — `CORRECTION_REQUIRED`. Append VIS-04 + VIS-05 (CTA capsule/ring dư + hover label mất tương phản). Bổ sung: DEC-15 (CTA chỉ một filled surface), DEC-16 (CTA foreground/background contrast pair), DEC-17 (preserve flip + accessibility + prop chain); RQ-12 (VIS-04 capsule cleanup) + RQ-13 (VIS-05 hover contrast); STEP-13 (VIS-04) + STEP-14 (VIS-05); AC-15 (capsule removed) + AC-16 (hover contrast) + AC-17 (round 1 regression gate); RISK-11/12/13 (round 1 specific). Reset execution round `1`. Status `READY_FOR_EXECUTION` (chờ Tier 2 round 1). In-scope roots thêm `evidence/owner-live-visual-review-r1.md`. Hand-off flow: Tier 2 round 1 → Tier 3 FOCUSED audit → Owner R2 live visual review → ACCEPTED → composition/footer + section-render chuyển `READY_FOR_EXECUTION`. Spec bump → v1.4.
- `v1.3` (10/09/2026): Tier 0 review v3 SMALL CLOSEOUT. Sửa: (a) Thêm `featured-job-card.test.tsx` (NEW) vào In-scope roots + DEC-14 OBR-01; (b) Thêm DEC-06 + RQ-11 + STEP-11 + AC-13 chốt `BestJobsSection` dùng `buildHref(job.slug)`, KHÔNG `job.id`, KHÔNG hardcode route trong card; (c) RISK-05 bỏ `e.stopPropagation()` (CTA là sibling DOM); (d) AC-10 bỏ verification selector `.cta:focus + .action-area` — contract không khóa một selector CSS sai chiều; (e) AC-13 visual review → AC-14; (f) `Current execution round` đồng bộ v1.3 DRAFT. Spec bump → v1.3.
