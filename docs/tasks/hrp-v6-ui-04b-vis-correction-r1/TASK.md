# TASK — `hrp-v6-ui-04b-vis-correction-r1`

> **Correction round** cho visual live review R1 (`docs/tasks/hrp-v6-ui-04b-pagination-admin/evidence/owner-live-visual-review-r1.md`). Plan B giữ `ACCEPTED` ở commit `18919da`; task này KHÔNG sửa ngược status đó.
> Scope: 3 lỗi trình bày (VIS-01..03), giới hạn đúng 2 component `featured-job-card.tsx` + `areas-section.tsx` + 1 fence test `public-ui-premium.static.test.ts` (claim cũ khóa class). KHÔNG mở schema/API/Admin/AV1/Plan C/Plan D/pagination logic/URGENT fixture.
> Tier 1 phân loại **FAST** theo verdict r1: giữ đúng 2 component + chỉ style/layout. Tier 1 review trực tiếp theo pipeline (FAST → Tier 1 review HANDOFF), không cần Tier 3 audit.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04b-vis-correction-r1` |
| Work type | `CODE` (style/layout thuần) |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST mặc định) |
| Spec version | `v1.0` (Lưu ý: Tailwind arbitrary values như `pr-[64px]`, `text-[12px]` xuất hiện trong mô tả RQ/STEP/AC — đây là code snippets hợp lệ, KHÔNG phải placeholder angle-bracket. verify-task.ps1 A-04 có thể false-positive cho các token này) |
| Status | `READY_FOR_EXECUTION` (Tier 1 soạn v1.0 theo Owner verdict r1, FAST lane, Tier 1 review trực tiếp khi HANDOFF xong) |
| Planner | `Tier 1` |
| Baseline | HEAD đầu round — `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt` |
| Source reference | TASK B commit `d4e5ebb` (Plan B thi công) — diff để đối chiếu ribbon/salary/eyebrow cũ |
| Plan UI predecessor | Plan B `ACCEPTED` (`18919da`) |
| Plan UI successor | (không — correction thuần visual, kết thúc ở ghi AC-14 closeout) |
| In-scope roots | `src/domains/job-board/components/landing/featured-job-card.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/public-ui-premium.static.test.ts`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**` |
| Forbidden paths | `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `src/domains/job-board/public.service.ts`, `app/api/jobs/route.ts`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs`, `app/api/admin/homepage-settings/**`, `app/(jobs)/viec-lam/page.tsx`, `app/admin/**`, `app/globals.css`, `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` NGOÀI file mới của correction này |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run test:unit -- public-card-truth` exit 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-vis-correction-r1/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; source review ribbon/title collision invariant (see §6.1 AC-03) |
| Visual gate | Owner live review post-deploy (DEC-12). KHÔNG Edge/CDP/PNG/bbox. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `0` (READY_FOR_EXECUTION) |
| Next gate | `/code → Tier 2 thi công (FAST) → verify-task PASS → verify-handoff PASS → Tier 1 review HANDOFF trực tiếp (FAST bypass Tier 3) → /resolve → commit → Owner live visual review → ghi AC-14 closeout → mở Plan C hoặc AV1 theo ưu tiên Owner` |

## 1. Outcome

### 1.1 User-visible outcome

Sau khi sửa 3 lỗi trình bày:

**VIS-01 — Ribbon `Tuyển gấp` không che tiêu đề**
- Ribbon giữ ở góc trên-phải với icon `local_fire_department`. Label đổi từ `TUYỂN GẤP` (uppercase, tracking-wider) thành `Tuyển gấp` (bình thường, cỡ 12px, padding vừa đủ).
- Header card tổ chức thành grid/flex có vùng badge riêng: title + meta nằm trong wrapper có `pr-` chừa vùng an toàn cho badge (≈56–64px bên phải) khi có ribbon; không có ribbon thì dùng width tự nhiên.
- Title có thể xuống dòng tự nhiên (2–3 dòng tùy chiều dài) nhưng KHÔNG bao giờ chạy dưới ribbon. Logo HrMonogram 64×64 giữ ở góc trên-trái.
- Card có/không ribbon đều có cùng nhịp (mobile 1 col, tablet 2 col, desktop 3 col) — không đứt nhịp vì ribbon.
- Viewport mobile (390px): ribbon vẫn không che title; HrMonogram 64×64 ở góc trên-trái, title wrap 2–3 dòng.

**VIS-02 — Thanh lương đậm hơn, đủ điểm nhấn**
- Nền thanh lương đổi từ `bg-surface-container-low` → `bg-primary-fixed` (semantic token light-orange đã có trong theme `#ffdbce` — `app/globals.css:57`). Icon `payments` 20px và chuỗi lương giữ `text-primary-container` (cam đậm) để có contrast rõ trên nền mới.
- Nền mới vẫn nhẹ hơn CTA/ribbon (`bg-primary-container` đậm hơn nhiều) nên không tranh cấp bậc hành động.

**VIS-03 — Eyebrow `Theo khu vực` đậm hơn**
- `text-secondary-fixed` → `text-primary-dark` (đã dùng ở BestJobs eyebrow — đồng bộ).
- Cỡ giữ nguyên (`text-label-sm`) — không tăng `text-label-md` vì giữ nhịp label với các section khác. Font-bold + uppercase + tracking-widest giữ nguyên.

### 1.2 Non-goals

- KHÔNG đổi `app/(portal)/page.tsx` (Tier 1 plane, Plan B đã chốt).
- KHÔNG đổi `best-jobs-section.tsx` (Tier 1 plane, Plan B đã chốt).
- KHÔNG đổi `best-jobs-urgent-preview.ts` (Plan B fixture, đã chốt).
- KHÔNG đổi API, service, schema, permission, Admin page, AV1.
- KHÔNG đổi data flow, fetch logic, state, pagination control.
- KHÔNG đổi heading `Việc làm theo khu vực`, count, hoặc hành vi chọn khu vực (onPick).
- KHÔNG thay đổi giá trị lương/đơn vị/tiêu đề (data thật).
- KHÔNG cài tool đo (axe-core, Lighthouse, CDP, pa11y).
- KHÔNG revert status `ACCEPTED` của Plan B (Tier 1 chỉ ghi AC-14 closeout sau khi Owner confirm).

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| VIS-01..03 style/layout correction | **Correction task này** (`hrp-v6-ui-04b-vis-correction-r1`) | DRAFT |
| BestJobs tab + pagination + URGENT fixture | Plan B | `ACCEPTED` (`18919da`) |
| Backend (schema, permission, write API, Admin page, listingPageSize, view-model) | Plan Admin V6 AV1 | `DRAFT` |
| Sections mới + demo content | Plan C | `DRAFT` |
| Detail page UI | Plan D.A | `DRAFT` |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/components/landing/featured-job-card.tsx:22-30` | Ribbon hiện tại `absolute top-0 right-0` với label `TUYỂN GẤP` uppercase — VIS-01 cần layout cho phép title không va chạm |
| `EV-02` | `src/domains/job-board/components/landing/featured-job-card.tsx:54-57` | Salary pill `bg-surface-container-low` — VIS-02 cần đổi sang `bg-primary-fixed` |
| `EV-03` | `src/domains/job-board/components/landing/areas-section.tsx:28` | Eyebrow `text-secondary-fixed` — VIS-03 cần đổi sang `text-primary-dark` |
| `EV-04` | `app/globals.css:57` | `--color-primary-fixed: #ffdbce` — semantic token light-orange đã có trong theme |
| `EV-05` | `src/domains/job-board/components/landing/best-jobs-section.tsx:62` | `text-primary-dark` đã dùng ở BestJobs eyebrow — VIS-03 đồng bộ |
| `EV-06` | `src/domains/job-board/public-ui-premium.static.test.ts` (test "ui-03: salary pill" assertion block) | Fence test cũ claim `CARD toContain 'bg-surface-container-low'` cho salary pill — VIS-02 cần update assertion sang `bg-primary-fixed` |
| `EV-07` | `docs/tasks/hrp-v6-ui-04b-pagination-admin/evidence/owner-live-visual-review-r1.md` | Owner verdict chốt 3 lỗi + allowlist source tối thiểu |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | VIS-01 layout: header card dùng flex (HrMonogram 64×64 trái + title/meta phải có wrapper `pr-` chừa vùng badge). KHÔNG đổi absolute positioning của ribbon — chỉ thêm `pr-` cho title wrapper khi ribbon có mặt | `CHOSEN` |
| `DEC-02` | VIS-01 label: `TUYỂN GẤP` → `Tuyển gấp`. Bỏ `uppercase tracking-wider`. Cỡ `text-[12px]` + `px-2 py-0.5` | `CHOSEN` |
| `DEC-03` | VIS-02 token: `bg-surface-container-low` → `bg-primary-fixed`. Giữ `text-primary-container` cho icon + chữ. Nền vẫn nhẹ hơn CTA ribbon (vốn `bg-primary-container` đậm) | `CHOSEN` |
| `DEC-04` | VIS-03 token: `text-secondary-fixed` → `text-primary-dark`. Giữ `text-label-sm font-bold uppercase tracking-widest`. KHÔNG tăng `text-label-md` | `CHOSEN` |
| `DEC-05` | Fence test `src/domains/job-board/public-ui-premium.static.test.ts` (test name "ui-03: salary pill"): update assertion `bg-surface-container-low` → `bg-primary-fixed` (giữ nguyên test name; thêm comment VIS-02 trước dòng assert) | `CHOSEN` |
| `DEC-06` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source/test allowlist. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa plan cha | `CHOSEN` |
| `DEC-07` | Baseline = HEAD đầu round (Tier 2 đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`). Expected unit failure set capture tại exec-head-before | `CHOSEN` |
| `DEC-08` | Visual parity = Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-09` | Tier 3 KHÔNG audit correction này (FAST bypass). Tier 1 review HANDOFF trực tiếp | `CHOSEN` |
| `DEC-10` | OBR-01 allow tạo HANDOFF + `evidence/**` trong task root. KHÔNG cấm mọi file mới | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Ribbon `Tuyển gấp` ở góc trên-phải với icon `local_fire_department`, label `Tuyển gấp` (không uppercase), cỡ 12px, padding vừa đủ. Title card KHÔNG bao giờ nằm dưới ribbon — header có wrapper chừa vùng an toàn khi ribbon có mặt. Title cho phép wrap tự nhiên (2–3 dòng) |
| `RQ-02` | Thanh lương đổi nền `bg-surface-container-low` → `bg-primary-fixed` (semantic token light-orange). Icon `payments` 20px + chuỗi lương giữ `text-primary-container`. Nền vẫn nhẹ hơn CTA ribbon |
| `RQ-03` | Eyebrow `Theo khu vực` đổi `text-secondary-fixed` → `text-primary-dark` (đồng bộ BestJobs eyebrow). Giữ `text-label-sm font-bold uppercase tracking-widest`. KHÔNG đổi heading, count, onPick |
| `RQ-04` | Fence test `public-ui-premium.static.test.ts` line 225 update assertion từ `bg-surface-container-low` → `bg-primary-fixed` với comment VIS-02. KHÔNG đổi test name |
| `RQ-05` | Regression: KHÔNG đổi `app/(portal)/page.tsx`, `best-jobs-section.tsx`, `best-jobs-urgent-preview.ts`, API, service, schema, permission, Admin page, AV1. Verify diff name-only chỉ 2 component + 1 fence test + HANDOFF + evidence |

### 4.2 Scope boundaries

- **Container-only edits**: KHÔNG đổi container 1200px (TASK A đã chốt). Tier 2 KHÔNG đổi padding ở Hero/Areas/CTV/Footer
- **Data/state**: N/A (style thuần)
- **Permission/security**: N/A
- **Interface/API**: N/A
- **Migration/rollback**: N/A
- **Cache**: N/A

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha, KHÔNG ghi Plan B files

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) `git status --porcelain` → `evidence/working-tree-before.txt`. (c) Capture unit failure set hiện tại → `evidence/expected-failure-set-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + failing test files | Nếu expected failure set > 1 (baseline pre-existing `design-tokens.static.test.ts` RQ-04/AC-03) → verify đo đúng lúc exec-head-before; nếu > 1 → báo Planner |
| `STEP-02` | `src/domains/job-board/components/landing/featured-job-card.tsx` | VIS-01: header card dùng flex (HrMonogram 64×64 trái + title/meta phải có wrapper với "64px right padding" chừa vùng badge khi `badgeType === 'urgent'`, "0px right padding" khi không có badge). Title cho phép wrap. VIS-02: salary pill đổi `bg-surface-container-low` → `bg-primary-fixed`. VIS-01 ribbon label đổi `TUYỂN GẤP` → `Tuyển gấp`, bỏ `uppercase tracking-wider`, đổi cỡ `text-[12px] px-2 py-0.5` | Source review: header có conditional right padding khi badge; ribbon label đúng chuỗi + class; salary pill class đúng | Nếu ribbon absolute + title absolute conflict → revert; nếu salary pill contrast thấp hơn ribbon → dừng |
| `STEP-03` | `src/domains/job-board/components/landing/areas-section.tsx` | VIS-03: eyebrow `text-secondary-fixed` → `text-primary-dark`. KHÔNG đổi heading, count, onPick | Source review: 1 dòng thay đổi; className khác | Nếu heading hoặc count bị đổi → revert |
| `STEP-04` | `src/domains/job-board/public-ui-premium.static.test.ts` | Update assertion block trong test "ui-03: salary pill": `expect(CARD).toContain('bg-surface-container-low')` → `expect(CARD).toContain('bg-primary-fixed')`. Thêm comment VIS-02 trước dòng assert. KHÔNG đổi test name | `npm run test:unit -- public-card-truth` exit 0; source review comment VIS-02 | Nếu test name đổi → revert |
| `STEP-05` | Regression check shell + mandatory gates (DEC-08) | Source review: KHÔNG có diff ngoài §0 In-scope roots. `git diff --name-only exec-head-before..HEAD` so với allowlist. `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run test:unit -- public-card-truth` exit 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-vis-correction-r1/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS | `evidence/ac05-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_REVIEW |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method (command/source review/evidence file) |
|---|---|---|
| `AC-01` | Ribbon label `Tuyển gấp` (không uppercase, không tracking-wider, cỡ 12px). Class ribbon không có `uppercase`/`tracking-wider` | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "TUYỂN GẤP\|uppercase tracking-wider"` expect 0 match. `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "Tuyển gấp"` expect ≥1 match. Lưu `evidence/ac01-ribbon-label.txt` |
| `AC-02` | Title wrapper có "64px right padding" khi ribbon có mặt, "0px right padding" (hoặc mặc định) khi không có. Title cho phép wrap 2–3 dòng | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "pr-\[64px\]"` expect ≥1 match. Source review header card dùng flex, title wrapper conditional padding-right. Lưu `evidence/ac02-title-padding.txt` kèm line |
| `AC-03` | Title KHÔNG chạy dưới ribbon (collision invariant) — manual source review: ribbon ở `absolute top-0 right-0` ~56-64px chiếm góc; title wrapper có right padding chừa vùng đó; title max-width = card-width − HrMonogram-width − padding − ribbon-width | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "w-16 h-16"` expect ≥1 match (HrMonogram 64px). `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "absolute top-0 right-0"` expect ≥1 match (ribbon corner). Source review: HrMonogram `w-16 h-16` (= 64px), ribbon ~64px, total ~160px từ phải. Right padding ≥ ribbon width + buffer. Lưu `evidence/ac03-collision-invariant.txt` kèm tính toán |
| `AC-04` | Salary pill `bg-primary-fixed`. Icon `payments` 20px + text `text-primary-container` giữ nguyên | Command: `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "bg-surface-container-low"` expect 0 match (trong salary pill). `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern "bg-primary-fixed"` expect ≥1 match. Lưu `evidence/ac04-salary-token.txt` |
| `AC-05` | Eyebrow `Theo khu vực` đổi sang `text-primary-dark` | Command: `Select-String -Path src/domains/job-board/components/landing/areas-section.tsx -Pattern "text-secondary-fixed"` expect 0 match. `Select-String -Path src/domains/job-board/components/landing/areas-section.tsx -Pattern "text-primary-dark"` expect ≥1 match. Lưu `evidence/ac05-eyebrow-token.txt` |
| `AC-06` | Fence test `public-ui-premium.static.test.ts` (test "ui-03: salary pill" assertion block) update: `bg-surface-container-low` → `bg-primary-fixed` + comment VIS-02. Test name giữ nguyên | Command: `Select-String -Path src/domains/job-board/public-ui-premium.static.test.ts -Pattern "bg-primary-fixed.*VIS-02\|VIS-02.*bg-primary-fixed"` expect ≥1 match. `Select-String -Path src/domains/job-board/public-ui-premium.static.test.ts -Pattern "bg-surface-container-low"` expect 0 match trong test "ui-03: salary pill" assertion block. Lưu `evidence/ac06-fence-update.txt` |
| `AC-07` | Truth fence: changed public surface không chứa "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm" + số giả (`17.800`, `13.000.000`, `+10.000.000`, `+50.000.000`) | PowerShell `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx,src/domains/job-board/components/landing/areas-section.tsx -Pattern "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm\|17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000"`. Expect 0 match. Lưu `evidence/ac07-truth-fence.txt` |
| `AC-08` | Scope discipline: `git diff --name-only exec-head-before..HEAD` chỉ có 2 source + 1 fence test + HANDOFF.md + evidence/** | Command: `git diff --name-only exec-head-before..HEAD \| Where-Object { $_ -notin @('docs/tasks/hrp-v6-ui-04b-vis-correction-r1/HANDOFF.md', 'docs/tasks/hrp-v6-ui-04b-vis-correction-r1/evidence/**', 'src/domains/job-board/components/landing/featured-job-card.tsx', 'src/domains/job-board/components/landing/areas-section.tsx', 'src/domains/job-board/public-ui-premium.static.test.ts') }` expect 0 line. Lưu `evidence/ac08-scope-discipline.txt` |
| `AC-09` | Mandatory gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; full `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-vis-correction-r1/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS. Lưu `evidence/ac09-gates.txt` với exit code từng gate |
| `AC-10` | AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-08). Tier 1 ghi AC-14 closeout sau khi Owner confirm | Status marker trong HANDOFF; Tier 1 KHÔNG fail vì thiếu screenshot; Tier 1 KHÔNG audit visual; visual parity Owner duyệt post-deploy |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02 | AC-01, AC-02, AC-03 |
| RQ-02 | STEP-02 | AC-04 |
| RQ-03 | STEP-03 | AC-05 |
| RQ-04 | STEP-04 | AC-06 |
| RQ-05 | STEP-05 | AC-08, AC-09 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Ribbon absolute vẫn che title dù có right padding (do title cỡ chữ wrap) | STEP-02 source review: right padding ≥ ribbon width + 4-8px buffer; ribbon `px-2 py-0.5` + icon 14px + label ~60px = ~90-100px width. Nếu right padding quá nhỏ so với ribbon → escalate |
| `RISK-02` | `bg-primary-fixed` (#ffdbce) contrast với `text-primary-container` không đạt WCAG AA | AC-04 verify contrast icon/chữ bằng tier1 manual sample (compute ratio). Nếu ratio dưới 4.5:1 → escalate Tier 1, KHÔNG ép PASS |
| `RISK-03` | Tier 2 vô tình sửa `app/(portal)/page.tsx` hoặc `best-jobs-section.tsx` | STEP-05 + AC-08 enforce: git diff name-only filter. Nếu touch → revert |
| `RISK-04` | Fence test fail khi đổi assertion | AC-06 update assertion đúng + comment VIS-02. STEP-04 verify `npm run test:unit -- public-card-truth` exit 0 |
| `RISK-05` | Tier 2 revert status `ACCEPTED` của Plan B | §0 Forbidden + §1.2 rõ ràng. Tier 2 chỉ tạo file mới trong correction task root; KHÔNG đụng Plan B files |

## 8. Open Questions

None — Owner verdict r1 đã chốt cả 3 VIS. Scope đã giới hạn đúng 2 component + 1 fence test.

## 9. Planner Resolution

Tier 1 append sau mỗi round.

| Round | Decision | Reason |
|---|---|---|
| Round 0 (planning) | Tier 1 soạn TASK.md v1.0 theo Owner verdict r1. FAST lane (1 outcome, 2 component, chỉ style/layout). Tier 1 review HANDOFF trực tiếp theo pipeline, KHÔNG Tier 3 audit. | Owner live visual review r1 — `docs/tasks/hrp-v6-ui-04b-pagination-admin/evidence/owner-live-visual-review-r1.md` |
| Round 1 (sau execution) | Tier 2 thi công → verify-task PASS → verify-handoff PASS → Tier 1 review HANDOFF trực tiếp → Tier 1 resolve → push → Owner live visual review post-deploy → ghi AC-14 closeout | per §0 Next gate |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-09-10 (Tier 1) | Initial correction task VIS-01..03. FAST lane. Plan B giữ `ACCEPTED` (`18919da`). Baseline = HEAD đầu round | Owner live visual review r1 verdict |

## 11. Owner Baseline-aware Resolution (OBR)

### OBR-01 — Baseline reference + execution HEAD

- Baseline = HEAD đầu round (đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`)
- Source reference = TASK B commit `d4e5ebb` (Plan B thi công) — dùng để đối chiếu ribbon/salary/eyebrow cũ. KHÔNG `git checkout`; chỉ đo `git show d3add63 -- file` khi cần (đối chiếu field parity)
- Execution HEAD: đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt`. Tier 2 dùng để so diff
- Baseline expected unit failure set: chạy `npm run test:unit --reporter=json 2>evidence/test-unit-before.json` LÚC exec-head-before, hash số failing tests → `evidence/expected-failure-set-before.txt`
- `git status --porcelain` tại exec-head-before → `evidence/working-tree-before.txt`. Mọi dirty file ngoài §1.3 dirty set là non-task (foreign), KHÔNG FAIL
- **Allow create/edit HANDOFF + `evidence/**`** trong `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**` (DEC-10)
- `git diff --name-only [exec-head-before]..HEAD` cuối round vs baseline = KHÔNG có path mới ngoài allowlist OBR-02

### OBR-02 — Allowlist Sửa (paths Tier 2 được phép tạo/sửa)

| Path | Quyền | Ghi chú |
|---|---|---|
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Sửa (VIS-01 layout + VIS-01 ribbon label + VIS-02 salary token) | STEP-02 RQ-01, RQ-02 |
| `src/domains/job-board/components/landing/areas-section.tsx` | Sửa (VIS-03 eyebrow token) | STEP-03 RQ-03 |
| `src/domains/job-board/public-ui-premium.static.test.ts` | Sửa (line 225 assertion + comment VIS-02) | STEP-04 RQ-04 |
| `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**` | Tạo + Sửa | HANDOFF + evidence + planning artifacts do Tier 2 tạo |
| `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` | **KHÔNG** sửa (Tier 1 plane) | DEC-06 |
| `docs/tasks/hrp-v6-ui-04b-pagination-admin/**` | **KHÔNG** sửa NGOÀI file mới của correction này | Tier 1 plane; Plan B ACCEPTED ở `18919da` |
| `app/(portal)/page.tsx` | **KHÔNG** sửa (Tier 1 plane, Plan B đã chốt) | Owner verdict r1 §Scope |
| `src/domains/job-board/components/landing/best-jobs-section.tsx` | **KHÔNG** sửa (Tier 1 plane) | Owner verdict r1 §Scope |
| `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` | **KHÔNG** sửa | DEC-06 |
| `src/domains/job-board/components/landing/hero.tsx` | **KHÔNG** sửa | Owner verdict r1 §Scope |
| `src/domains/job-board/components/landing/recruiting-projects-section.tsx` | **KHÔNG** sửa | Owner verdict r1 §Scope |
| `src/domains/job-board/components/landing/referral-strip.tsx` | **KHÔNG** sửa | Owner verdict r1 §Scope |
| `src/domains/job-board/public.service.ts` | **KHÔNG** sửa | N/A scope |
| `app/api/jobs/route.ts` | **KHÔNG** sửa | N/A scope |
| `prisma/**` | **KHÔNG** sửa | N/A scope |
| `src/shared/auth/permission-catalog.ts` | **KHÔNG** sửa | N/A scope |
| `prisma/seed.mjs` | **KHÔNG** sửa | N/A scope |
| `app/api/admin/homepage-settings/**` | **KHÔNG** tạo (sang AV1) | N/A scope |
| `app/(jobs)/viec-lam/page.tsx` | **KHÔNG** sửa (sang AV1) | N/A scope |
| `app/admin/**` | **KHÔNG** sửa (sang AV1) | N/A scope |
| `app/globals.css` | **KHÔNG** sửa (dùng token hiện hữu) | DEC-04; `bg-primary-fixed` đã có sẵn |
| (mọi path khác) | **KHÔNG** sửa | OBR-01 cảnh báo; Tier 2 halt, escalate Tier 1 |

### OBR-03 — Anti-scope-creep

- Tier 2 không tự ý thêm path mới vào allowlist; nếu cần, mở correction round
- Mọi file mới: Tier 2 chỉ tạo trong `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/evidence/**` + `HANDOFF.md`
- Tier 2 KHÔNG commit/push/deploy — Tier 1 có quyền đó sau khi đạt gate READY_FOR_REVIEW + Tier 1 review PASS
- Tier 2 KHÔNG revert status `ACCEPTED` của Plan B (commit `18919da`)
