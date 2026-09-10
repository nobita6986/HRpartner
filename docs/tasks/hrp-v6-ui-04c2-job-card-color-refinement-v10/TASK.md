# TASK — `hrp-v6-ui-04c2-job-card-color-refinement-v10`

> **Job Card color & layout refinement v10** — chỉnh delta visual sau R3 `ACCEPTED` (`8c6fd03`); repo chưa có directive Owner cụ thể về câu trả lời 16 lựa chọn của task này. Tier 1 đã nhận directive thô từ Owner về ý định refinement, nhưng task ở trạng thái `DRAFT` chờ Owner xác nhận các quyết định cụ thể (giống cơ chế 04c1 v0.1 round 0).
> Scope dự kiến: chỉnh style/copy className trong `src/domains/job-board/components/landing/featured-job-card.tsx`. KHÔNG mở API, schema, route mới, package mới.
> Plan UI predecessor: `hrp-v6-ui-04b-urgent-live-ribbon-r3` `ACCEPTED` v1.3 (`8c6fd03` — Job Card Minimal SaaS) + `hrp-v6-ui-04b-vis-correction-r1` `ACCEPTED` + `hrp-v6-ui-04b-job-card-interaction-r2` `ACCEPTED` (`9e51917`).
> Plan UI successor: `hrp-v6-ui-04c1-footer-tweak-r2` `READY_FOR_EXECUTION` v1.0 (song song); `hrp-v6-ui-04d-section-render` `BLOCKED` v1.5 — không phụ thuộc 04c2.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c2-job-card-color-refinement-v10` |
| Work type | `TWEAK` (UI Job Card color/layout) |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST bypass Tier 3) |
| Spec version | `v0.1` (DRAFT — chờ Owner delta) |
| Status | `DRAFT` (Tier 1 tạo skeleton, chờ Owner mô tả delta cụ thể; 2026-09-10) |
| Planner | `Tier 1` |
| Baseline | HEAD thật ngay trước Tier 2 round — `git rev-parse HEAD` tại STEP-01 → `evidence/exec-head-before.txt`. Dự kiến HEAD = `01c54dd` (04c1 HANDOFF skeleton commit) sau khi Tier 1 finalize |
| Source reference | R3 v1.3 `ACCEPTED` (`8c6fd03` — FeaturedJobCard refactor Minimal SaaS) + R2 `ACCEPTED` (`9e51917` — VIS-04/05 CTA visual correction) + correction R1 `ACCEPTED` |
| Plan UI predecessor | R3 v1.3 ACCEPTED + R2 ACCEPTED + correction R1 + composition/footer v1.4 `ACCEPTED` (`04b767e`) |
| Plan UI successor | section-render (`hrp-v6-ui-04d-section-render` BLOCKED v1.5 — sau 04c1 ACCEPTED). 04c2 KHÔNG khoá section-render; 04c2 chạy song song 04c1 vì scope khác file |
| In-scope roots | `src/domains/job-board/components/landing/featured-job-card.tsx`, `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/**` |
| Forbidden paths | `app/(portal)/page.tsx`, `app/api/jobs/route.ts`, `src/domains/job-board/public.service.ts`, `app/api/admin/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `app/admin/**`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/components/landing/referral-invite-strip.tsx`, `src/domains/job-board/fixtures/**`, `app/(jobs)/viec-lam/page.tsx`, `app/components/GlobalFooter.tsx`, `app/components/ContactForm.tsx`, `package.json` (KHÔNG thêm icon dependency; chỉ dùng `lucide-react` đã có), `app/globals.css` NGOÀI nếu cần thêm token semantic (Tier 1 duyệt trước), `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**`, `docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/**`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**`, `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/**`, `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Owner live visual review |
| Visual gate | Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `0` (v0.1 DRAFT — chờ Owner delta) |
| Next gate | Tier 1 chờ Owner trả lời 16 câu hỏi §8 → Tier 1 finalize contract v1.0 → Tier 2 thi công (FAST) → Owner live visual review → ACCEPTED |

## 1. Outcome

### 1.1 User-visible outcome (TBD — Tier 1 chưa nhận đủ directive cụ thể từ Owner)

TBD sau câu trả lời của Owner. Nguyên tắc giữ:

- **Container card `bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200`** (R3 surface contract) — KHÔNG đổi.
- **Layout 2-cột header (logo 48px + title + company)** (R3 header contract) — KHÔNG đổi.
- **Ribbon compact `Tuyển gấp` giữ `bg-orange-500/75`** (R3 ribbon contract) — KHÔNG đổi.
- **Body metadata (Location + postedAt) Lucide icons + slate-500** (R3 body contract) — KHÔNG đổi.
- **Footer `border-t border-slate-100 p-4`** (R3 footer contract) — KHÔNG đổi border-top; có thể chỉnh padding/gap.
- **`salaryLabel()` helper** (giữ nguyên).
- **`onApply` wiring với ApplyModal** (R3 ApplyModal contract) — KHÔNG đổi behavior; chỉ chỉnh className CTA `Ứng tuyển`.
- **`prev iew` logic với slate-100 disabled state** (giữ nguyên behavior; có thể chỉnh className).
- **Test file `featured-job-card.test.ts`** — Tier 2 KHÔNG sửa trừ khi Owner delta yêu cầu đổi label test.

Owner đã nêu ý định (delta thô) — Tier 1 chờ 16 câu hỏi §8:

1. Đổi CTA "Xem chi tiết" từ solid `bg-blue-600` → ghost/outline (white/gray border + gray text).
2. Đổi CTA "Ứng tuyển" từ subtle slate-100 → primary cam/đỏ thương hiệu (nền cam + trắng text).
3. Salary pill giảm saturation (emerald-50/700 → tone trầm, hoặc đen/xám đậm + icon xanh).
4. Title `text-lg` → `text-base` + `line-clamp-2` (giảm 1 bậc + 2 dòng).
5. Button text `text-sm font-medium` (giữ — đã đúng); nếu muốn bỏ `font-medium` → Tier 1 chờ Owner.
6. Footer tăng padding (px-4 py-2 theo Owner gợi ý) + `justify-between` + tăng gap.
7. Card surface, header layout, ribbon, body metadata, salaryLabel — không đổi.

Tier 1 KHÔNG tự quyết định các giá trị cụ thể (cường độ cam, tone emerald cụ thể, gap, padding) — chờ Owner.

### 1.2 Non-goals (BẮT BUỘC — bất kể Owner delta)

- KHÔNG mở API mới.
- KHÔNG thêm schema, persistence, CrmLead.
- KHÔNG đổi route `/viec-lam/{slug}` hay ApplyModal UX.
- KHÔNG sửa `featured-job-card.test.ts` trừ khi test id/aria-label đổi thật sự.
- KHÔNG đổi body metadata (location + postedAt).
- KHÔNG đổi ribbon compact (nếu Owner muốn đổi → escalate task riêng).
- KHÔNG đổi logo `<HrMonogram size={48}>` container.
- KHÔNG đổi salaryLabel helper.
- KHÔNG revert R3 (`8c6fd03`) — job card Minimal SaaS surface/border/shadow giữ nguyên.
- KHÔNG revert R2 (`9e51917`) — VIS-04/05 CTA visual correction giữ nguyên.
- KHÔNG revert correction R1.
- KHÔNG revert composition/footer (`04b767e`).
- KHÔNG đổi `src/domains/job-board/public.service.ts`.
- KHÔNG hardcode màu hex — ưu tiên Tailwind utility (palette hiện có trong `tailwind.config`).
- KHÔNG thêm package icon mới — dùng `lucide-react` đã có (R3 quyết).
- KHÔNG cài tool đo (axe-core, Lighthouse, CDP, pa11y).

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| Job Card color & layout refinement (task này) | Plan UI tweak | **DRAFT v0.1** |
| URGENT live + ribbon + Job Card Minimal SaaS (R3) | Plan UI R3 | ACCEPTED v1.3 (`8c6fd03`) — predecessor |
| Composition/footer | Plan UI composition/footer | ACCEPTED v1.4 (`04b767e`) — predecessor |
| Footer tweak r2 | Plan UI tweak | READY_FOR_EXECUTION v1.0 (song song, file khác) |
| VIS-04/05 CTA correction (R2) | Plan UI R2 | ACCEPTED (`9e51917`) — predecessor |
| Section-render | Task D | BLOCKED v1.5 (chờ 04c1 ACCEPTED; 04c2 chạy song song) |
| Backend (HomepageSettings, Admin) | Plan Admin V6 | DRAFT |

## 2. Evidence (chưa có — Tier 2 capture khi thi công)

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/components/landing/featured-job-card.tsx` tại `8c6fd03` (R3 ACCEPTED baseline) | Tier 2 đối chiếu R3 baseline trước khi sửa |
| `EV-02` | `src/domains/job-board/components/landing/featured-job-card.test.ts` tại `8c6fd03` | Tier 2 xác nhận test không bị phá nếu không sửa file |
| `EV-03` | `tailwind.config.*` (Tier 2 khảo sát palette) | Verify Tailwind color tokens (orange/blue/emerald/slate) hiện có; nếu cần token mới → escalate Tier 1 |
| `EV-04` | `app/(portal)/page.tsx` (Tier 2 capture nếu cần) | Kiểm tra prop chain `EnrichedJob` không đổi; Tier 2 KHÔNG sửa page.tsx |
| `EV-05` | Câu trả lời Owner (TBD) | Tier 1 sẽ bổ sung khi Owner trả lời §8 |

## 3. Decisions (placeholder — Tier 1 cập nhật khi có Owner delta)

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source allowlist. Tier 2 KHÔNG sửa TASK.md, KHÔNG revert R3/R2/correction R1/composition-footer | `CHOSEN` |
| `DEC-02` | Baseline = HEAD đầu round (Tier 2 đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`). Tier 1 KHÔNG hardcode commit | `CHOSEN` |
| `DEC-03` | FAST lane vì phạm vi là tweak style/copy className. Nếu Owner delta chạm ApplyModal, route, responsive shared layout, hoặc blast radius ngoài featured-job-card → Tier 1 nâng lane STANDARD/FOCUSED | `CHOSEN` |
| `DEC-04` | Tier 2 KHÔNG mở bất kỳ file ngoài §0 In-scope roots (kể cả `app/globals.css`, `tailwind.config.*`, `package.json`). Nếu cần thêm token semantic mới → Tier 2 escalate Tier 1 trước khi commit | `CHOSEN` |
| `DEC-05` | Visual parity = Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-06` | OBR-01 cho phép tạo HANDOFF + `evidence/**` + sửa file trong §0 In-scope roots. KHÔNG cấm file mới | `CHOSEN` |
| `DEC-07` | R3 Minimal SaaS surface (`bg-white border-slate-200 rounded-xl shadow-sm`) là invariant; không đổi palette card surface | `CHOSEN` |
| `DEC-08` | ApplyModal wiring (`onApply` + `onClick={preview ? undefined : onApply}` + preview disabled logic) là invariant; Tier 2 chỉ chỉnh className CTA `Ứng tuyển` | `CHOSEN` |
| `DEC-09..N` | (chờ Owner delta — Tier 1 sẽ append khi nhận câu trả lời) | `PENDING` |

## 4. Contract (placeholder — Tier 1 cập nhật khi có Owner delta)

### 4.1 Requirements (placeholder)

| ID | Requirement | Status |
|---|---|---|
| `RQ-00` | **Skeleton invariant guard:** bất kỳ delta nào Owner yêu cầu, Tier 2 phải giữ: container card `bg-white border-slate-200 rounded-xl shadow-sm hover:shadow-md` (R3 surface contract); header 2-cột `HrMonogram size={48}` + title + company `HRP Việt Nam` (R3 header contract); ribbon compact `bg-orange-500/75` (R3 ribbon contract); body metadata Lucide `MapPin` + `Clock3` slate-500 (R3 body contract); footer `border-t border-slate-100 p-4`; salaryLabel helper; preview logic slate-100 disabled; onApply wiring ApplyModal. Tier 2 chỉ sửa trong §0 In-scope roots, KHÔNG revert R3 8 file dirty (đã commit path-scoped tại 8c6fd03), KHÔNG revert R2 9e51917 / correction R1 / composition-footer 04b767e. | `CHOSEN` |
| `RQ-XX` | (placeholder cho mọi RQ Owner-driven — Tier 1 sẽ append khi nhận câu trả lời §8. Tier 1 giữ status `DRAFT` cho đến khi có ít nhất 1 RQ Owner-driven mới bump spec → `v1.0` và chuyển `READY_FOR_EXECUTION`.) | `DRAFT_PENDING_OWNER` |

Nguyên tắc giữ khi Tier 1 viết RQ (sau khi Owner trả lời):

- Card surface KHÔNG đổi (white + slate border + slate shadow).
- Header layout KHÔNG đổi.
- Ribbon KHÔNG đổi.
- Body metadata KHÔNG đổi.
- Footer border-top KHÔNG đổi.
- salaryLabel KHÔNG đổi.
- ApplyModal wiring KHÔNG đổi.
- `Xem chi tiết` anchor `href={href}` KHÔNG đổi (canonical URL từ BestJobsSection).
- `Ứng tuyển` button `disabled={preview}` + onClick wiring KHÔNG đổi.

### 4.2 Scope boundaries

- **Container-only edits**: KHÔNG đổi nội dung card nào khác ngoài `featured-job-card.tsx`.
- **Data/state**: KHÔNG đổi state/props/onClick logic; chỉ chỉnh Tailwind className ở các CTA + salary + title + footer layout.
- **Permission/security**: N/A.
- **Interface/API**: KHÔNG tạo API mới.
- **Migration/rollback**: N/A.
- **Cache**: N/A.

### 4.3 Scope

- In: §0 In-scope roots.
- Out: §0 Forbidden + §1.2.
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha, KHÔNG revert R3/R2/correction R1/composition-footer.

## 5. Execution Plan (placeholder — Tier 1 cập nhật khi có Owner delta)

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) `git status --porcelain` → `evidence/working-tree-before.txt`. (c) Capture unit failure set → `evidence/expected-failure-set-before.txt` (hash + failing test files; Tier 2 không reset/fixture) | `git status --porcelain` không có path ngoài working tree hiện tại (post-R3 ACCEPTED đã commit path-scoped; nếu có file dirty mới → Tier 2 không revert) | Nếu expected failure set khác baseline pre-existing → verify đo đúng lúc exec-head-before |
| `STEP-02` | Skeleton invariant guard | RQ-00: Tier 2 đọc §1.1 (nguyên tắc giữ) + §1.2 (non-goals) + §0 (Forbidden paths) + §4 RQ-00 trước khi sửa. Nếu delta chạm nguyên tắc giữ → Tier 2 escalate Tier 1 | Source review: Tier 2 ghi nhận trong HANDOFF.md §1 Outcome | Nếu Tier 2 phá invariant → halt, revert, escalate |
| `STEP-03..N` | (chờ Owner delta — Tier 1 sẽ định nghĩa khi nhận câu trả lời) | `PENDING` | `PENDING` | `PENDING` |
| `STEP-99` | Regression check shell + mandatory gates | Source review: KHÔNG có diff ngoài §0 In-scope roots. `git diff --name-only exec-head-before..HEAD` filter allowlist. Verify: (a) R3 8 file dirty không đổi (đã commit path-scoped; nếu Tier 2 có diff trong `featured-job-card.tsx` thuộc allowlist); (b) R2 9e51917 không revert; (c) `tailwind.config.*` không đổi; (d) mandatory gates PASS. | `evidence/ac00-invariants.txt` + `evidence/ac-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_REVIEW |

## 6. Acceptance (placeholder — Tier 1 cập nhật khi có Owner delta)

### 6.1 Acceptance criteria (placeholder)

| AC | Pass condition | Verification method | Status |
|---|---|---|---|
| `AC-00` | **Skeleton invariant guard:** Tier 2 chạm file nào trong §0 In-scope roots; (a) `featured-job-card.tsx` còn `bg-white border-slate-200 rounded-xl shadow-sm` (R3 surface contract); (b) còn `<HrMonogram size={48}>` header (R3 header contract); (c) còn ribbon `bg-orange-500/75` nếu `badgeType === 'urgent'` (R3 ribbon contract); (d) còn Lucide `MapPin` + `Clock3` slate-500 (R3 body contract); (e) còn `border-t border-slate-100` ở footer (R3 footer contract); (f) `salaryLabel()` + preview disabled logic + onApply wiring còn nguyên. `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0. | Command: `rg -n "bg-white border-slate-200 rounded-xl|<HrMonogram|bg-orange-500/75|<MapPin|<Clock3|border-t border-slate-100|salaryLabel|isPreview" src/domains/job-board/components/landing/featured-job-card.tsx` expect ≥7 match + npm gates. Lưu `evidence/ac00-invariants.txt` | `CHOSEN` |
| `AC-01..N` | (chờ Owner delta — Tier 1 sẽ định nghĩa khi nhận câu trả lời) | `PENDING` | `PENDING` |

Nguyên tắc khi Tier 1 viết AC:

- Mỗi điểm Owner yêu cầu phải có 1 AC tương ứng với command đo được (`rg`, `Select-String`, hoặc test).
- Mọi AC chạm behavior phải có test.
- Mọi AC visual phải được Owner review thật.
- Mọi AC color phải dùng palette hiện có (Tailwind tokens).
- Verify R3 8 file dirty không bị revert.
- Verify R2 correction không bị revert.
- Verify composition-footer không bị revert.

### 6.2 Traceability (placeholder)

| Requirement | Step | Acceptance | Status |
|---|---|---|---|
| `RQ-00` | `STEP-02`, `STEP-99` | `AC-00` | `CHOSEN` |
| `RQ-XX` | (placeholder cho mọi RQ Owner-driven — Tier 1 sẽ append khi nhận câu trả lời §8) | (placeholder) | `DRAFT_PENDING_OWNER` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Tier 1 tự tưởng tượng yêu cầu khi Owner chưa trả lời đủ | DRAFT status; §1.1 liệt kê nguyên tắc giữ; Tier 1 KHÔNG chuyển READY cho đến khi Owner delta được xác nhận. Câu hỏi Tier 1 gửi Owner ghi ở §8 |
| `RISK-02` | Tier 2 revert R2 correction R1 (`9e51917`) khi chạm CTA | §0 Forbidden. STEP-LAST git diff filter. R2 file không thuộc §0 In-scope roots |
| `RISK-03` | Tier 2 vô tình đổi ApplyModal wiring | RQ-00 giữ onApply + preview disabled. AC-00 grep `onApply\|isPreview` |
| `RISK-04` | Tier 2 hardcode màu hex khi Owner muốn đổi tone cam/salary | DEC-04: chỉ dùng Tailwind token hiện có. Nếu cần token mới → Tier 1 duyệt |
| `RISK-05` | Tier 2 phá R3 card surface bằng cách đổi sang semantic `surface` token | DEC-07: R3 minimal SaaS surface invariant. AC-00 grep `bg-white border-slate-200 rounded-xl` |
| `RISK-06` | Tier 2 sửa `featured-job-card.test.ts` không cần thiết | §0 Forbidden (test file không thuộc In-scope roots). STEP-LAST git diff filter |
| `RISK-07` | Tier 2 mở `app/(portal)/page.tsx` (nơi `EnrichedJob` định nghĩa) | §0 Forbidden. STEP-LAST git diff filter |
| `RISK-08` | Tier 2 đụng `package.json` thêm icon library | §0 Forbidden (quyết R3: chỉ dùng lucide-react đã có) |

## 8. Open Questions

**Câu hỏi Tier 1 gửi Owner (2026-09-10):**

> Job Card color & layout refinement v10 cần thay đổi cụ thể những điểm nào so với Job Card hiện tại tại commit `8c6fd03` (R3 ACCEPTED)?
>
> Các điểm có thể chạm (Owner tick vào ô phù hợp hoặc mô tả khác):
>
> - [ ] **CTA "Xem chi tiết"** — đổi từ solid `bg-blue-600 hover:bg-blue-700 text-white` (R3 CTA contract) sang ghost/outline (white/gray bg + gray border + gray/dark text)? Tone cụ thể: `border-slate-300 text-slate-700 hover:bg-slate-50` hay khác?
> - [ ] **CTA "Ứng tuyển"** — đổi từ subtle `bg-slate-100 text-slate-700 hover:bg-slate-200` (R3 CTA contract) sang primary cam/đỏ thương hiệu (nền cam + text trắng)? Tone cụ thể: `bg-primary text-white hover:bg-primary-dark` hay khác (xem `tailwind.config` để chọn token đúng — em đề xuất `bg-primary hover:bg-primary-dark`)?
> - [ ] **Salary pill** — đổi từ `bg-emerald-50 text-emerald-700` (R3 salary contract) sang tone trầm hơn (ví dụ `bg-emerald-50/60 text-emerald-800` hay `text-slate-700 font-semibold + icon emerald-600 bg-transparent`)? Hay giữ emerald nhưng giảm saturation?
> - [ ] **Title font-size** — đổi từ `text-lg font-semibold` (R3 title contract) sang `text-base font-medium` + `line-clamp-2`?
> - [ ] **Button text font-weight** — giữ `font-medium` (đã đúng theo Owner đề xuất) hay bỏ `font-medium` cho thanh thoát hơn?
> - [ ] **Footer padding** — đổi từ `p-4` (R3 footer contract) sang `px-4 py-3` hay `p-4` giữ + `pt-3.5`?
> - [ ] **Footer gap** — đổi từ `gap-2` (R3) sang `gap-3` hay `gap-2.5`?
> - [ ] **Footer layout** — `justify-between` (salary trái / CTA group phải) hay giữ cụm salary + spacer + 2 CTA?
> - [ ] **Border separator** — giữ `border-t border-slate-100` (R3) hay đổi `border-t border-slate-200` cho rõ hơn?
> - [ ] **Card container radius** — giữ `rounded-xl` (R3 surface contract) hay `rounded-2xl`?
> - [ ] **Card surface border** — giữ `border border-slate-200` (R3 surface contract) hay `border border-slate-300`?
> - [ ] **Card shadow** — giữ `shadow-sm hover:shadow-md` (R3 surface contract) hay bỏ hover lift?
> - [ ] **ARIA labels** — giữ `aria-label={preview ? 'Bản xem trước' : 'Ứng tuyển nhanh'}` (R3 ARIA contract) hay đổi chuỗi `Bản xem trước` / `Ứng tuyển nhanh` thành label phù hợp với giao diện mới?
> - [ ] **`hidden sm:inline` cho label `Ứng tuyển`** — giữ mobile chỉ icon / desktop icon+label, hay đổi pattern?
> - [ ] **Test file `featured-job-card.test.ts`** — Tier 2 KHÔNG sửa trừ khi Owner yêu cầu (ví dụ label/aria-label đổi → test phải update)? Test pass/fail yêu cầu cụ thể nào?
> - [ ] **Container card surface revert** — giữ `bg-white border border-slate-200 rounded-xl shadow-sm` (R3 surface contract) hoặc đổi sang `surface` semantic color?
>
> Tier 1 sẽ cập nhật §3, §4, §5, §6 sau khi nhận câu trả lời. Trong lúc chờ, Tier 1 giữ status `DRAFT` và KHÔNG giao Tier 2. Sau khi Owner trả lời, Tier 1 finalize contract `v1.0`, chạy `verify-task.ps1`, chỉ chuyển `READY_FOR_EXECUTION` khi PASS không còn placeholder warning (cơ chế giống 04c1 v1.0 round 1).

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | Tier 1 tạo skeleton TASK.md ở `DRAFT`, gửi 16 câu hỏi §8 cho Owner. Tier 1 KHÔNG tự định nghĩa RQ/AC/STEP vì repo chưa chứa directive Owner cụ thể về delta Job Card refinement. Tier 1 giữ nguyên tắc: card surface white+slate (R3 surface contract), header layout, ribbon cam, footer border-top, salaryLabel, onApply wiring. | Owner đã cung cấp ý định thô qua AskQuestion (chọn "mở task mới"); chưa có đủ câu trả lời cụ thể cho 16 lựa chọn refinement. Bám đúng cơ chế 04c1 v0.1 round 0 (Tier 1 chờ Owner). |

## 10. Revision Log

- `v0.1` (10/09/2026): Tier 1 tạo skeleton DRAFT sau khi R3 `ACCEPTED` tại `8c6fd03`. Source: Owner ý định refinement (delta thô) + `src/domains/job-board/components/landing/featured-job-card.tsx` hiện tại (R3 ACCEPTED) + R2 correction R1 (`9e51917`). Status `DRAFT` vì chưa có Owner delta cụ thể cho 16 lựa chọn. Tier 1 ghi §8 Open Questions cho Owner. Spec bump sẽ thành `v1.0` khi Owner trả lời và Tier 1 finalize contract.
