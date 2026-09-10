# TASK — `hrp-v6-ui-04c2-job-card-color-refinement-v10`

> **Job Card color & layout refinement v10** — chỉnh delta visual sau R3 `ACCEPTED` (`8c6fd03`); 16 Owner decisions đã chốt tại `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/owner-job-card-color-refinement-decisions.md` (2026-09-10). Tier 1 finalize contract v1.0 theo Tier 0 directive [TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md] §Phase 2.
> Scope: chỉnh style/copy/markup `src/domains/job-board/components/landing/featured-job-card.tsx` + `featured-job-card.test.ts`. KHÔNG mở API, schema, route, ApplyModal UX, package mới.
> Plan UI predecessor: `hrp-v6-ui-04b-urgent-live-ribbon-r3` `ACCEPTED` v1.3 (`8c6fd03` — Job Card Minimal SaaS) + `hrp-v6-ui-04b-vis-correction-r1` `ACCEPTED` + `hrp-v6-ui-04b-job-card-interaction-r2` `ACCEPTED` (`9e51917`).
> Plan UI successor: `hrp-v6-ui-04c1-footer-tweak-r2` (cùng round Tier 0 push; Tier 1 push production sau cả hai) → `hrp-v6-ui-04d-section-render` `BLOCKED` v1.5 (sau 04c1 ACCEPTED).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c2-job-card-color-refinement-v10` |
| Work type | `TWEAK` (UI Job Card + test file) |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST bypass Tier 3) |
| Spec version | `v1.0` (16 Owner decisions chốt 10/09/2026 tại `evidence/owner-job-card-color-refinement-decisions.md`) |
| Status | `ACCEPTED` (Tier 2 thi công `1316ff4` 2026-09-10 23:48 UTC+7, Owner live visual review pending post-deploy) |
| Planner | `Tier 1` |
| Baseline | HEAD thật ngay trước Tier 2 round — `git rev-parse HEAD` tại STEP-01 → `evidence/exec-head-before.txt`. HEAD sau khi Tier 1 finalize v1.0 + Tier 2 thi công round 1 = `1316ff4` |
| Source reference | R3 v1.3 `ACCEPTED` (`8c6fd03` — FeaturedJobCard refactor Minimal SaaS) + R2 `ACCEPTED` (`9e51917` — VIS-04/05 CTA visual correction) + correction R1 + composition/footer `ACCEPTED` (`04b767e`) |
| Plan UI predecessor | R3 ACCEPTED + R2 ACCEPTED + correction R1 + composition/footer `04b767e` + 04c1 footer tweak r2 v1.0 `READY_FOR_EXECUTION` (song song Phase 1) |
| Plan UI successor | section-render (`hrp-v6-ui-04d-section-render` BLOCKED v1.5 — sau 04c1 ACCEPTED). 04c2 chạy song song 04c1 trong cùng worktree vì scope file khác |
| In-scope roots | `src/domains/job-board/components/landing/featured-job-card.tsx`, `src/domains/job-board/components/landing/featured-job-card.test.ts`, `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/**` |
| Forbidden paths | `app/(portal)/page.tsx`, `app/api/jobs/route.ts`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `src/domains/job-board/components/landing/referral-invite-strip.tsx`, `src/domains/job-board/fixtures/**`, `app/(jobs)/viec-lam/page.tsx`, `app/components/GlobalFooter.tsx`, `app/components/ContactForm.tsx`, `package.json` (KHONG them icon dependency; chi dung `lucide-react` da co), `app/globals.css` NGOAI neu can them token semantic (Tier 1 duyet truoc), `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**`, `docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/**`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**`, `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/**`, `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cung expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Owner live visual review |
| Visual gate | Owner live review post-deploy. KHONG Edge/CDP/PNG/bbox. KHONG Lighthouse/axe-core auto-install |
| Current execution round | `1` (v1.0 READY_FOR_EXECUTION -> Tier 2 thi cong 1316ff4 -> ACCEPTED sau khi Tier 1 review + push production) |
| Next gate | Tier 1 push HEAD len origin/main + monitor Vercel/CI deploy status + Owner live review |

## 1. Outcome

### 1.1 User-visible outcome (tu 16 Owner decisions + 5 interaction invariants)

Tong the Job Card giu surface `bg-white border border-slate-200 rounded-xl shadow-sm` (Owner #11, #16; R3 surface contract). CTA `Xem chi tiet` doi sang outline/ghost (`border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`, Owner #1). CTA `Ung tuyen nhanh` doi sang primary cam thuong hieu (`bg-primary` hover dam hon, chu trang, max 1px border, Owner #2). Salary pill giu pill nho `bg-emerald-50 text-emerald-700` co the them `border-emerald-100` (Owner #3). Title `text-lg` -> `text-base font-semibold leading-snug line-clamp-2` + them `title` attribute de hover doc full title (Owner #4). Button text giu `text-sm font-medium` (Owner #5). Footer padding `p-4` -> `px-4 py-3` (Owner #6). Footer gap `gap-2` mobile va `sm:gap-3` desktop (Owner #7). Footer layout `justify-between`: salary trai, CTA group phai, wrap co kiem soat (Owner #8). Border separator `border-t border-slate-100` -> `border-t border-slate-200` (Owner #9). Radius giu `rounded-xl` (Owner #10). Card border giu `border border-slate-200` (Owner #11). Shadow giu `shadow-sm hover:shadow-md transition-all duration-200` (Owner #12). ARIA ten hanh dong ro: CTA that accessible name `Ung tuyen nhanh`; preview co `Ban xem truoc` + disabled semantic (Owner #13). Mobile KHONG an chu bang `hidden sm:inline`; mobile phai con nhan nhin thay `Ung tuyen`; accessible name van day du la `Ung tuyen nhanh` (Owner #14). Test file `featured-job-card.test.ts` duoc phep sua; Tier 1 da dua vao allowlist v1.0; bo sung/cap nhat test co y nghia cho accessible label, preview disabled va hai CTA khong kich hoat click card ngoai y muon (Owner #15). Surface KHONG doi sang `surface` semantic trong task nay (Owner #16).

### 1.2 Interaction invariants (BAT BUOC)

- Click vao vung card ngoai CTA tiep tuc di den canonical job detail URL (BestJobsSection qua `href={href}`).
- `Xem chi tiet` tiep tuc di den canonical job detail URL.
- `Ung tuyen nhanh` tiep tuc mo ApplyModal va phai chan dieu huong card do bubbling (preventDefault + stopPropagation neu can).
- Hover/focus cua `Ung tuyen nhanh` luon giu icon va chu co contrast ro (khong tai dien loi nut con nen nhung mat chu).
- Preview giu disabled; khong mo modal; khong gia lap live integration.
- Ribbon `Tuyen gap` giu compact `bg-orange-500/75` + `pointer-events-none` + absolute top-right; khong lay cho trong flow cua title; khong che title.

### 1.3 Skeleton invariant guard (R3 surface contract -- giu nguyen)

- Container `bg-white border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200`
- Header 2-cot `HrMonogram size={48}` + title + company `HRP Việt Nam`
- Ribbon compact `bg-orange-500/75` neu `badgeType === 'urgent'`
- Body metadata Lucide `MapPin` + `Clock3` slate-500
- Footer border-top `border-t border-slate-200` (Owner #9 - was border-slate-100)
- `salaryLabel()` helper giu nguyen
- Preview logic slate-100 disabled + onApply wiring ApplyModal

### 1.4 Non-goals (BAT BUOC - bat ke Owner delta)

- KHONG mo API moi.
- KHONG them schema, persistence, CrmLead.
- KHONG doi route `/viec-lam/{slug}`.
- KHONG doi ApplyModal UX hoac props.
- KHONG doi `salaryLabel()` helper.
- KHONG doi body metadata (location + postedAt className).
- KHONG doi ribbon compact (neu Owner muon doi -> escalate task rieng).
- KHONG doi logo `&lt;HrMonogram size={48}&gt;` container.
- KHONG revert R3 (`8c6fd03`).
- KHONG revert R2 (`9e51917`).
- KHONG revert correction R1.
- KHONG revert composition/footer (`04b767e`).
- KHONG doi `src/domains/job-board/public.service.ts`.
- KHONG hardcode mau hex - uu tien Tailwind utility (palette hien co trong `tailwind.config`).
- KHONG them package icon moi - dung `lucide-react` da co.
- KHONG cai tool do (axe-core, Lighthouse, CDP, pa11y).
- KHONG ghi test chi sao chep danh sach class (Owner #15).

### 1.5 Plan UI split reminder

| Cong viec | Thuc plan | Trang thai |
|---|---|---|
| Job Card color & layout refinement (task nay) | Plan UI tweak | **ACCEPTED round 1 v1.0** |
| URGENT live + ribbon + Job Card Minimal SaaS (R3) | Plan UI R3 | ACCEPTED v1.3 (`8c6fd03`) - predecessor |
| Composition/footer | Plan UI composition/footer | ACCEPTED v1.4 (`04b767e`) - predecessor |
| Footer tweak r2 | Plan UI tweak | READY_FOR_EXECUTION v1.0 (song song, file khac) |
| VIS-04/05 CTA correction (R2) | Plan UI R2 | ACCEPTED (`9e51917`) - predecessor |
| Section-render | Task D | BLOCKED v1.5 (cho 04c1 ACCEPTED) |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/components/landing/featured-job-card.tsx` tai `8c6fd03` (R3 ACCEPTED baseline) | Tier 2 doi chieu R3 baseline truoc khi sua |
| `EV-02` | `src/domains/job-board/components/landing/featured-job-card.test.ts` tai `8c6fd03` | Tier 2 doi chieu test baseline (Owner #15 cho phep sua file nay) |
| `EV-03` | `evidence/owner-job-card-color-refinement-decisions.md` | 16 Owner decisions + 5 interaction invariants - Tier 2 doc dau round |
| `EV-04` | `tailwind.config.*` | Tier 2 khao sat palette hien co; neu can token moi -> escalate Tier 1 |
| `EV-05` | `app/(portal)/page.tsx` (Tier 2 chi capture neu can) | Verify prop chain `EnrichedJob` khong doi; Tier 2 KHONG sua page.tsx |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source allowlist. Tier 2 KHONG sua TASK.md, KHONG revert R3/R2/correction R1/composition-footer | `CHOSEN` |
| `DEC-02` | Baseline = HEAD dau round (Tier 2 do `git rev-parse HEAD` ngay truoc STEP-01 -> `evidence/exec-head-before.txt`). Tier 1 KHONG hardcode commit | `CHOSEN` |
| `DEC-03` | FAST lane vi pham vi la tweak style/copy className + test file. Neu implementation buoc cham ngoai component -> escalate Tier 0 (Tier 0 directive §Boundary) | `CHOSEN` |
| `DEC-04` | Tier 2 KHONG mo bat ky file ngoai §0 In-scope roots (ke ca `app/globals.css`, `tailwind.config.*`, `package.json`). Neu can them token semantic moi -> Tier 2 escalate Tier 1 truoc khi commit | `CHOSEN` |
| `DEC-05` | Visual parity = Owner live review post-deploy. KHONG Edge/CDP/PNG/bbox. KHONG fail vi thieu screenshot | `CHOSEN` |
| `DEC-06` | OBR-01 cho phep tao HANDOFF + `evidence/**` + sua file trong §0 In-scope roots. KHONG cam file moi | `CHOSEN` |
| `DEC-07` | R3 Minimal SaaS surface (`bg-white border-slate-200 rounded-xl shadow-sm`) la invariant; khong doi palette card surface | `CHOSEN` |
| `DEC-08` | ApplyModal wiring (`onApply` + `onClick={preview ? undefined : onApply}` + preview disabled logic) la invariant; Tier 2 chi chinh className CTA `Ung tuyen` | `CHOSEN` |
| `DEC-09` | Test file `featured-job-card.test.ts` duoc phep sua theo Owner #15 - Tier 1 da dua vao In-scope roots; Tier 2 bo sung/cap nhat test co y nghia (khong sao chep class list) | `CHOSEN` |
| `DEC-10` | Tier 2 DUOC commit path-scoped (theo Tier 0 directive §Phase 2 §5); Tier 1 push production o cuoi ca 2 phase | `CHOSEN` |
| `DEC-11` | Test file co the co pre-existing baseline failure set - Tier 2 do `expected-failure-set-before.txt` ngay truoc STEP-01; sau thi cong phai cung expected failure set + new failure count = 0 | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement (Owner #) | Status |
|---|---|---|
| `RQ-00` | **Skeleton invariant guard:** Tier 2 phai giu container card `bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200` (R3 surface contract + Owner #11 #16); header 2-cot `&lt;HrMonogram size={48}&gt;` + title + company `HRP Việt Nam` (R3 header contract); ribbon compact `bg-orange-500/75` voi `pointer-events-none` (R3 ribbon contract); body metadata Lucide `MapPin` + `Clock3` slate-500 (R3 body contract); footer `border-t border-slate-200 px-4 py-3` KHONG doi separator; salaryLabel helper; preview logic + onApply wiring ApplyModal. Tier 2 chi sua trong §0 In-scope roots, KHONG revert R3 8 file dirty (da commit path-scoped tai 8c6fd03), KHONG revert R2 9e51917 / correction R1 / composition-footer 04b767e. | `CHOSEN` |
| `RQ-01` | **CTA `Xem chi tiet` - DOI outline/ghost (Owner #1):** doi tu solid `bg-blue-600 hover:bg-blue-700 text-white` sang `border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`. KHONG dung nut xanh solid. | `CHOSEN` |
| `RQ-02` | **CTA `Ung tuyen nhanh` - DOI cam thuong hieu (Owner #2):** doi tu subtle slate-100 sang `bg-primary text-white hover:bg-primary-dark` (CSS var `--color-primary` + `--color-primary-dark`). Vien toi da 1px neu can; tuyet doi KHONG vien cam/nau day. | `CHOSEN` |
| `RQ-03` | **Salary pill - GIU pill nho, tang do doc (Owner #3):** giu `bg-emerald-50 text-emerald-700`; them `border border-emerald-100` (tuy chon). KHONG bien thanh thanh full-width, KHONG nen cam/do bet. | `CHOSEN` |
| `RQ-04` | **Title - DOI text-base + line-clamp-2 (Owner #4):** doi tu `text-lg font-semibold` sang `text-base font-semibold leading-snug line-clamp-2` (toi da 2 dong). Them `title={job.title}` attribute de hover doc full title. Giu `group-hover:text-blue-700` (R3 hover blue). | `CHOSEN` |
| `RQ-05` | **Button font - GIU (Owner #5):** giu `text-sm font-medium`. KHONG dung chu qua dam. | `CHOSEN` |
| `RQ-06` | **Footer padding - DOI px-4 py-3 (Owner #6):** doi tu `p-4` sang `px-4 py-3`. | `CHOSEN` |
| `RQ-07` | **Footer gap - gap-2 mobile sm:gap-3 desktop (Owner #7):** dung `gap-2 sm:gap-3`. | `CHOSEN` |
| `RQ-08` | **Footer layout - justify-between (Owner #8):** doi tu hien tai (salary + spacer + 2 CTA inline) sang `justify-between` (salary trai, CTA group phai); wrap co kiem soat (`flex-wrap` hoac similar) de khong tran card tren mobile. | `CHOSEN` |
| `RQ-09` | **Separator - DOI border-slate-200 (Owner #9):** doi tu `border-t border-slate-100` sang `border-t border-slate-200`. | `CHOSEN` |
| `RQ-10` | **Radius - GIU rounded-xl (Owner #10).** KHONG doi. | `CHOSEN` |
| `RQ-11` | **Card border - GIU border-slate-200 (Owner #11).** KHONG doi. | `CHOSEN` |
| `RQ-12` | **Shadow - GIU shadow-sm hover:shadow-md transition-all duration-200 (Owner #12).** KHONG doi. | `CHOSEN` |
| `RQ-13` | **ARIA ten hanh dong ro (Owner #13):** CTA that co accessible name `Ung tuyen nhanh`; preview co accessible name `Ban xem truoc` + trang thai disabled dung semantic. KHONG mat accessible name. | `CHOSEN` |
| `RQ-14` | **Mobile KHONG an chu (Owner #14):** KHONG dung `hidden sm:inline` an toan bo chu. Mobile phai con nhan nhin thay `Ung tuyen`; accessible name van day du la `Ung tuyen nhanh`. Hover/focus khong lam mat chu hoac trung mau nen. | `CHOSEN` |
| `RQ-15` | **Test file duoc sua (Owner #15):** Tier 2 sua `featured-job-card.test.ts` (da co trong allowlist). Bo sung/cap nhat test co y nghia: (a) accessible label CTA/preview; (b) preview disabled; (c) hai CTA khong kich hoat click card ngoai y muon. KHONG viet test chi sao chep danh sach class. | `CHOSEN` |
| `RQ-16` | **Surface GIU (Owner #16):** `bg-white border border-slate-200 rounded-xl shadow-sm`; KHONG doi sang semantic `surface`. | `CHOSEN` |
| `RQ-17` | **Interaction: Card outer click -> canonical href (invariant):** Tier 2 giu logic click vung card ngoai CTA -> canonical job detail URL (hien tai KHONG co - neu co wrapper `Link` wrap card thi KHONG sua). | `CHOSEN` |
| `RQ-18` | **Interaction: CTA `Xem chi tiet` Link href invariant:** giu `&lt;Link href={href}&gt;` (canonical URL tu BestJobsSection). KHONG doi href. | `CHOSEN` |
| `RQ-19` | **Interaction: CTA `Ung tuyen nhanh` button -> ApplyModal + prevent bubbling (invariant):** keep `type="button"` + `disabled={preview}` + `onClick={preview ? undefined : onApply}`. Wrap voi `e.stopPropagation()` + `e.preventDefault()` neu can de chan navigate khi click CTA (BestJobsSection wire onApply qua page-level closure). | `CHOSEN` |
| `RQ-20` | **Interaction: Hover/focus CTA `Ung tuyen` giu icon+chu contrast (Owner #13+#14 invariant):** KHONG tai dien loi nut con nen nhung mat chu. Icon va chu phai luon visible voi contrast ro (4.5:1 min). | `CHOSEN` |
| `RQ-21` | **Ribbon compact giu flow title (R3 invariant):** ribbon `bg-orange-500/75` absolute top-right; pointer-events-none; KHONG push title (KHONG them `pr-[72px]` wrapper). Title wrapper KHONG co padding-right override. | `CHOSEN` |

### 4.2 Scope boundaries

- **Container-only edits**: KHONG doi noi dung card nao khac ngoai `featured-job-card.tsx` + `featured-job-card.test.ts`.
- **Data/state**: KHONG doi state/props/onClick logic; chi chinh className + test cases.
- **Permission/security**: N/A.
- **Interface/API**: KHONG tao API moi.
- **Migration/rollback**: N/A.
- **Cache**: N/A.

### 4.3 Scope

- In: §0 In-scope roots.
- Out: §0 Forbidden + §1.4.
- Tier 2 tao HANDOFF + `evidence/**` tai `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/`. Tier 2 KHONG ghi TASK.md, KHONG revert R3/R2/correction R1/composition-footer/04c1.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` -> `evidence/exec-head-before.txt`. (b) `git status --porcelain` -> `evidence/working-tree-before.txt`. (c) Capture unit failure set -> `evidence/expected-failure-set-before.txt` | `git status --porcelain` khong co path ngoai working tree hien tai | Neu expected failure set khac baseline -> verify do dung luc exec-head-before |
| `STEP-02` | Skeleton invariant guard | RQ-00: Tier 2 doc §1.1 (16 Owner decisions) + §1.2 (5 interaction invariants) + §1.3 (skeleton invariant guard) + §0 (In-scope roots) + §4 RQ-00 truoc khi sua. Tier 2 ghi nhan trong HANDOFF.md §1 Outcome rang da doc skeleton invariant + 16 Owner decisions + 5 interaction invariants. | Source review | Neu Tier 2 pha invariant -> halt, revert, escalate Tier 1 |
| `STEP-03` | CTA Xem chi tiet -> ghost/outline | RQ-01: doi className CTA `Xem chi tiet` tu `bg-blue-600 hover:bg-blue-700 ...` sang `border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`. Verify = `rg "border border-slate-300 bg-white text-slate-700"` tren file. Tiep tuc giu `href={href}` (canonical URL invariant). | Source review + rg match | Neu con class cu -> halt |
| `STEP-04` | CTA Ung tuyen -> cam primary | RQ-02: doi className CTA `Ung tuyen` tu subtle slate-100 sang `bg-primary text-white hover:bg-primary-dark` (semantic token). Giu `type="button"` + `disabled={preview}` + `onClick={preview ? undefined : onApply}` + accessible name. Wrap `e.stopPropagation()` + `e.preventDefault()` de chan bubbling (RQ-19). Verify token `bg-primary` resolve duoc = `rg "primary:" app/globals.css src/`. | Source review + npm typecheck | Neu mount nested button hoac mat href -> halt |
| `STEP-05` | Salary pill giu + tang contrast | RQ-03: giu `bg-emerald-50 text-emerald-700`; them `border border-emerald-100` tuy chon. KHONG bien thanh thanh full-width. Verify = `rg "bg-emerald-50 text-emerald-700"\|"border border-emerald-100"` expect >=1 match. | Source review | Neu empty pill hoac full-width slab -> halt |
| `STEP-06` | Title text-base + line-clamp-2 + title attribute | RQ-04: doi `&lt;h3 className="text-lg font-semibold leading-tight text-slate-900 transition group-hover:text-blue-700 mb-0.5"&gt;` thanh `&lt;h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-blue-700 mb-0.5" title={job.title}&gt;`. Verify rg "text-base font-semibold leading-snug line-clamp-2" + "title={job.title}". | Source review + npm typecheck | Neu mat title attr hoac line-clamp-2 -> halt |
| `STEP-07` | Footer separator + padding + gap | RQ-06, RQ-09: doi tu `p-4 border-t border-slate-100` sang `px-4 py-3 border-t border-slate-200` (Owner #6 #9). Verify rg "px-4 py-3" + "border-t border-slate-200". | Source review | Neu border-t border-slate-100 con -> halt |
| `STEP-08` | Footer layout justify-between + gap responsive | RQ-07, RQ-08: doi tu `flex items-center gap-2` sang `flex items-center justify-between flex-wrap gap-2 sm:gap-3`. Salary trai (overflow), CTA group phai (`ml-auto` hoac `shrink-0`). Verify rg "justify-between flex-wrap" hoac tuong duong. | Source review | Neu salary van o giua -> halt |
| `STEP-09` | Title + Ribbon wrapper giu flow | RQ-00/RQ-21: KHONG them `pr-[72px]` quanh title. Ribbon giu `pointer-events-none` absolute top-right. Verify rg "pr-\\[72px\\]" expect 0 match. | Source review | Neu con pr-[72px] -> halt |
| `STEP-10` | ARIA + mobile label | RQ-13, RQ-14: CTA `Ung tuyen` accessible name `Ung tuyen nhanh` (luon). Preview accessible name `Ban xem truoc`. Mobile: label `Ung tuyen` van hien thi (`hidden sm:inline` BO). Verify rg "aria-label=\{preview" expect match + rg "hidden sm:inline" expect 0 match tren CTA `Ung tuyen`. | Source review | Neu accessible name mat -> halt |
| `STEP-11` | Test file updates | RQ-15: bo sung/cap nhat test co y nghia trong `featured-job-card.test.ts`. KHONG ghi test chi sao chep class list. Tier 2 chay `npm run test:unit` doi chieu cung expected failure set + new failure count = 0. Tier 2 uu tien test cho: (a) accessible label CTA/preview; (b) preview disabled; (c) hai CTA khong kich hoat click card ngoai y muon (neu co wrapper Link wrap card -> test bubble). | npm run test:unit + new failure count = 0 | Neu new failure > 0 -> halt, fix |
| `STEP-12` | Invariant smoke check (RQ-10/11/12/16/17/18/21) | Tier 2 smoke-check cac Owner #10/11/12/16 invariants + RQ-17/18/21: RQ-10 radius `rounded-xl` van con (grep); RQ-11 border-slate-200 van con (grep); RQ-12 shadow `shadow-sm hover:shadow-md transition-all duration-200` van con (grep); RQ-16 surface khong doi sang `surface` semantic (grep `bg-surface[^a-z]` expect 0); RQ-17 card outer click -> canonical href invariant (Tier 2 KHONG them wrapper Link wrap card; neu R3 chua co wrapper Link thi KHONG them); RQ-18 CTA `Xem chi tiet` href invariant (grep `href={href}` expect match); RQ-21 ribbon KHONG push title (grep `pr-[72px]` expect 0). | Source review + rg match | Neu bat ky kept-invariant nao bi pha -> halt, revert, escalate Tier 1 |
| `STEP-99` | Regression check shell + mandatory gates | Source review: KHONG co diff ngoai §0 In-scope roots. `git diff --name-only exec-head-before..HEAD` filter allowlist. Verify: (a) R3 8 file dirty khong doi; (b) R2 9e51917 khong revert; (c) `tailwind.config.*` khong doi; (d) mandatory gates PASS. | `evidence/ac00-invariants.txt` + `evidence/ac-gates.txt` | Neu gate fail -> halt |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method | Status |
|---|---|---|---|
| `AC-00` | **Skeleton invariant guard:** Tier 2 chi cham file trong §0 In-scope roots; (a) `featured-job-card.tsx` con `bg-white border-slate-200 rounded-xl shadow-sm` (RQ-00 R3 surface); (b) con `&lt;HrMonogram size={48}&gt;` header (RQ-00); (c) con ribbon `bg-orange-500/75` neu `badgeType === 'urgent'` (RQ-00 + RQ-21); (d) con Lucide `MapPin` + `Clock3` slate-500; (e) `salaryLabel()` + preview disabled logic + onApply wiring con nguyen (RQ-00 + RQ-19); (f) KHONG co `pr-[72px]` wrapper title (RQ-21); (g) KHONG co `hidden sm:inline` an toan bo chu CTA (RQ-14). Gates: `npm run typecheck` exit 0; `npm run test:unit` cung expected failure set + new failure count = 0; `npm run build` exit 0. | Command: `rg -n "bg-white border-slate-200 rounded-xl\|&lt;HrMonogram\|bg-orange-500/75\|&lt;MapPin\|&lt;Clock3\|salaryLabel\|isPreview\|onApply\|pr-\\[72px\\]\|hidden sm:inline" src/domains/job-board/components/landing/featured-job-card.tsx` + npm gates. Luu `evidence/ac00-invariants.txt`. | `CHOSEN` |
| `AC-01` | CTA `Xem chi tiet` outline/ghost (RQ-01) | Command: `rg -n "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" src/domains/job-board/components/landing/featured-job-card.tsx` expect match; `rg -n "bg-blue-600 hover:bg-blue-700" src/domains/job-board/components/landing/featured-job-card.tsx` (CTA chi tiet) expect 0 match. Luu `evidence/ac01-xem-chi-tiet-ghost.txt`. | `CHOSEN` |
| `AC-02` | CTA `Ung tuyen` cam primary (RQ-02) | Command: `rg -n "bg-primary.*text-white\|bg-primary text-white hover:bg-primary-dark" src/domains/job-board/components/landing/featured-job-card.tsx` expect match. Token `primary` resolve: `rg -n "primary:" tailwind.config.* app/globals.css` expect match. CTA con type=button + disabled={preview} + onClick. Luu `evidence/ac02-ung-tuyen-cam.txt`. | `CHOSEN` |
| `AC-03` | Salary pill emerald (RQ-03) | Command: `rg -n "bg-emerald-50 text-emerald-700\|border-emerald-100" src/domains/job-board/components/landing/featured-job-card.tsx` expect >=1 match (pill nho, KHONG full-width slab). Luu `evidence/ac03-salary-pill.txt`. | `CHOSEN` |
| `AC-04` | Title text-base + line-clamp-2 + title attribute (RQ-04) | Command: `rg -n "text-base font-semibold leading-snug line-clamp-2\|title={job.title}" src/domains/job-board/components/landing/featured-job-card.tsx` expect match. Luu `evidence/ac04-title.txt`. | `CHOSEN` |
| `AC-05` | Button font giu (RQ-05) | Command: `rg -n "text-sm font-medium" src/domains/job-board/components/landing/featured-job-card.tsx` expect match. Luu `evidence/ac05-button-font.txt`. | `CHOSEN` |
| `AC-06` | Footer padding + separator (RQ-06 + RQ-09) | Command: `rg -n "px-4 py-3 border-t border-slate-200\|px-4 py-3" src/domains/job-board/components/landing/featured-job-card.tsx` expect match. `border-t border-slate-100` expect 0 match. Luu `evidence/ac06-footer-padding-separator.txt`. | `CHOSEN` |
| `AC-07` | Footer layout justify-between + gap responsive (RQ-07 + RQ-08) | Command: `rg -n "justify-between.*flex-wrap\|flex-wrap.*justify-between\|gap-2 sm:gap-3" src/domains/job-board/components/landing/featured-job-card.tsx` expect match. Luu `evidence/ac07-footer-layout.txt`. | `CHOSEN` |
| `AC-08` | ARIA ten hanh dong ro (RQ-13) | Command: `rg -n "aria-label.*Ung tuyen nhanh\|aria-label.*Ban xem truoc\|aria-label={preview \?" src/domains/job-board/components/landing/featured-job-card.tsx` expect match. Luu `evidence/ac08-aria.txt`. | `CHOSEN` |
| `AC-09` | Mobile label kho an (RQ-14) | Command: `rg -n "hidden sm:inline" src/domains/job-board/components/landing/featured-job-card.tsx` (CTA Ung tuyen) expect 0 match. Luu `evidence/ac09-mobile-label.txt`. | `CHOSEN` |
| `AC-10` | Test file cap nhat co y nghia (RQ-15) | Manual review HANDOFF.md §1 + diff file `featured-job-card.test.ts`. Test moi/co sua cover: (a) accessible label; (b) preview disabled; (c) bubble prevention neu can. Tier 2 KHONG sua de pass fake. Luu `evidence/ac10-test.txt`. | `CHOSEN` |
| `AC-11` | Surface khong doi (RQ-11 + RQ-16) | Command: `rg -n "bg-white border border-slate-200 rounded-xl shadow-sm" src/domains/job-board/components/landing/featured-job-card.tsx` expect match. `bg-surface[^a-z]` expect 0 match (khong doi semantic surface). Luu `evidence/ac11-surface.txt`. | `CHOSEN` |
| `AC-12` | Regression: R3 + R2 + correction R1 + composition-footer khong revert | Command: `git diff --name-only exec-head-before..HEAD | Where-Object { $_ -notin @('src/domains/job-board/components/landing/featured-job-card.tsx', 'src/domains/job-board/components/landing/featured-job-card.test.ts', 'docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/**') }` expect 0 line. Luu `evidence/ac12-regression.txt`. | `CHOSEN` |
| `AC-13` | Mandatory gates | `npm run typecheck` exit 0; `npm run test:unit` cung expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS. Luu `evidence/ac-gates.txt`. | `CHOSEN` |
| `AC-14` | Owner live visual review | Owner review post-deploy. Tier 1 se ghi closeout sau khi Owner confirm. | `CHOSEN` |

### 6.2 Traceability

| Requirement | Step | Acceptance | Status |
|---|---|---|---|
| `RQ-00` | `STEP-02`, `STEP-99` | `AC-00` | `CHOSEN` |
| `RQ-01` | `STEP-03` | `AC-01` | `CHOSEN` |
| `RQ-02` | `STEP-04` | `AC-02`, `AC-00` | `CHOSEN` |
| `RQ-03` | `STEP-05` | `AC-03`, `AC-00` | `CHOSEN` |
| `RQ-04` | `STEP-06` | `AC-04` | `CHOSEN` |
| `RQ-05` | `STEP-04` | `AC-05`, `AC-00` | `CHOSEN` |
| `RQ-06` | `STEP-07` | `AC-06` | `CHOSEN` |
| `RQ-07` | `STEP-08` | `AC-07` | `CHOSEN` |
| `RQ-08` | `STEP-08` | `AC-07` | `CHOSEN` |
| `RQ-09` | `STEP-07` | `AC-06` | `CHOSEN` |
| `RQ-10` | `STEP-12` | `AC-11`, `AC-00` | `CHOSEN` |
| `RQ-11` | `STEP-12` | `AC-11`, `AC-00` | `CHOSEN` |
| `RQ-12` | `STEP-12` | `AC-00` | `CHOSEN` |
| `RQ-13` | `STEP-10` | `AC-08`, `AC-00` | `CHOSEN` |
| `RQ-14` | `STEP-04`, `STEP-10` | `AC-09`, `AC-00` | `CHOSEN` |
| `RQ-15` | `STEP-11` | `AC-10`, `AC-13` | `CHOSEN` |
| `RQ-16` | `STEP-12` | `AC-11` | `CHOSEN` |
| `RQ-17` | `STEP-12` | `AC-00` | `CHOSEN` |
| `RQ-18` | `STEP-12` | `AC-00`, `AC-01` | `CHOSEN` |
| `RQ-19` | `STEP-04` | `AC-00`, `AC-02` | `CHOSEN` |
| `RQ-20` | `STEP-04`, `STEP-10` | `AC-00`, `AC-08` | `CHOSEN` |
| `RQ-21` | `STEP-09` | `AC-00` | `CHOSEN` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Tier 2 revert R3 (`8c6fd03`) job card Minimal SaaS surface | §0 Forbidden. STEP-99 git diff filter. AC-00 grep `bg-white border-slate-200 rounded-xl` |
| `RISK-02` | Tier 2 vo tinh doi ApplyModal wiring | RQ-00 giu onApply + preview disabled. AC-00 grep `onApply\|isPreview` |
| `RISK-03` | Tier 2 hardcode mau hex khi Owner muon doi tone cam/salary | DEC-04: chi dung Tailwind token hien co. AC-02 grep `bg-primary.*text-white\|bg-emerald-50` |
| `RISK-04` | Tier 2 them package icon moi | §0 Forbidden (R3 quyet: chi dung lucide-react da co). Quyet chi dung icon da co san (khong them) |
| `RISK-05` | Tier 2 pha footer separator border-t border-slate-100 -> 200 | RQ-09 dinh ro la DOI sang 200. AC-06 grep `border-t border-slate-100` expect 0 match. Neu Tier 2 lo de 100 -> halt |
| `RISK-06` | Tier 2 sua ApplyModal/CTA logic state/onClick | RQ-19 invariant: giu onClick wiring. AC-00 grep `onApply\|isPreview` |
| `RISK-07` | Tier 2 khong wrap `e.stopPropagation()`/`e.preventDefault()` cho CTA `Ung tuyen` | RQ-19 yeu cau. Tier 2 phai wrap stopPropagation de chan bubble toi wrapper Link (neu ton tai). Tier 2 xac minh wrapper Link trong card qua source review truoc khi sua |
| `RISK-08` | Test file modifications cover behavior changes nhung khong cover accessibility (Owner #15 yeu cau co y nghia) | RQ-15 + AC-10 manual review + Tier 3 audit future. Tier 2 uu tien test: accessible name, preview disabled, bubble prevention |
| `RISK-09` | Tier 2 KHONG sua test nhung test co pre-existing baseline failures tang sau khi sua source | DEC-11: cap baseline pre-existing. Tier 2 so sanh expected failure set truoc/sau. new failure count phai = 0 |
| `RISK-10` | Tier 2 cham source accepted (R2/R3/correction R1/composition/footer) | §0 Forbidden. AC-12 regression check shell |

## 8. Open Questions

**[RESOLVED]** All 16 Owner decisions da chat tai `evidence/owner-job-card-color-refinement-decisions.md`. Tier 1 da ap dung vao §4.1 RQ-01..RQ-16 + §1.2 5 interaction invariants. Tier 2 doc file decisions dau round.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 (10/09/2026 ~22:40) | Tier 1 tao skeleton TASK.md o `DRAFT`, gui 16 cau hoi §8 cho Owner. Tier 1 KHONG tu dinh nghia RQ/AC/STEP vi repo chua chua directive Owner cu the ve delta Job Card refinement. Tier 1 giu nguyen tac: card surface white+slate (R3 surface contract), header layout, ribbon cam, footer border-top, salaryLabel, onApply wiring. | Owner da cung cap y dinh tho qua AskQuestion (chon "mo task moi"); chua co du cau tra loi cu the cho 16 lua chon refinement. Bam dung co che 04c1 v0.1 round 0 (Tier 1 cho Owner). |
| 1 (10/09/2026 ~22:55) | Tier 1 finalize contract v1.0 theo Tier 0 directive `docs/prompts/TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md` + 16 Owner decisions + 5 interaction invariants tai `evidence/owner-job-card-color-refinement-decisions.md`. Them `featured-job-card.test.ts` vao In-scope roots (Owner #15). Bo file do khoi Forbidden paths. Spec bump v0.1 -> v1.0. Status DRAFT -> READY_FOR_EXECUTION -> ACCEPTED (sau Tier 2 round 1 commit `1316ff4`). `verify-task.ps1` PASS. | Tier 0 directive cho phep commit+push 04c2 (thay lenh cu "Tier 2 KHONG push"). 16 Owner decisions day du; 5 interaction invariants giu hanh vi R3. Tier 1 KHONG hoi lai 16 cau hoi. Tier 2 round 1 commit `1316ff4` apply dung allowlist + tat ca gates PASS. Tier 1 finalize status ACCEPTED o round 1 commit nay (sau Tier 1 review FAST). |

## 10. Revision Log

- `v0.1` (10/09/2026 ~22:40): Tier 1 tao skeleton DRAFT sau khi R3 `ACCEPTED` tai `8c6fd03`. Status `DRAFT` - cho Owner tra loi 16 cau hoi §8.
- `v1.0` (10/09/2026 ~22:55): Tier 1 finalize contract v1.0 theo Tier 0 directive `docs/prompts/TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md` + 16 Owner decisions chat tai `evidence/owner-job-card-color-refinement-decisions.md`. Them RQ-01..RQ-21 (21 req; 16 Owner + 5 interaction invariants). Bo sung `featured-job-card.test.ts` vao In-scope (Owner #15 + DEC-09). Bo sung STEP-03..STEP-11 + STEP-99. Them AC-00..AC-14 voi command do duoc. Tier 1 giu nguyen tac: KHONG revert R3 (`8c6fd03`) + R2 (`9e51917`) + correction R1 + composition/footer (`04b767e`); KHONG hardcode hex; KHONG them package; KHONG mo ApplyModal/ApplyModal contract.
- `v1.0 round 1` (10/09/2026 ~23:48): Tier 2 thi cong round 1 commit `1316ff4`. Status `ACCEPTED`. Tier 1 review FAST PASS: 14 evidence files (AC-00..AC-13) + ac-gates + Tier 2 dev reports 89/89 tests pass in featured-job-card.test.ts, 0 new failure, typecheck + build PASS. Tier 1 commit finalize TASK.md v1.0 (round 1) + push production sau khi Owner live visual review ends.
