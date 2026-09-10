# TASK A — `hrp-v6-ui-04a-visual-polish`

> Canonical contract path. Tier 1 owns this file; Tier 2 owns HANDOFF + evidence + source/test được phép sửa.
> Mandate: `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md` (Tier 0 chỉ thị 10/09/2026, đã chốt A1–A16).
> Tier 0 review r1 (`evidence/tier0-review-task-a-v1.md`) — chấp thuận outcome, yêu cầu sửa ranh giới 2 plan, container scope, baseline, gate, logo 64px.
> Tier 1 đặt TASK.md này; Tier 2 sở hữu HANDOFF và evidence.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04a-visual-polish` |
| Work type | `DESIGN` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Spec version | `v1.1` |
| Status | `ACCEPTED` (Tier 2 thi công 10/10 STEP, Tier 3 FOCUSED audit PASS 21/21, all gates PASS) |
| Planner | `Tier 1` |
| Plan overview | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md` |
| Field matrix | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` |
| Plan UI skeleton | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/skeleton-B-C-D.md` |
| Plan Admin V6 skeleton | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-admin-v6.md` |
| Source TASK reference | UI-03 audit commit `4d9a633` |
| Baseline (source reference) | `4d9a633` — UI-03 Tier 3 audit commit (Tier 0 đã chốt; KHÔNG `git checkout`) |
| Execution HEAD | đo ngay trước STEP-01 bằng `git rev-parse HEAD`; lưu `evidence/exec-head-before.txt` |
| In-scope roots | `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`, `app/(portal)/page.tsx`, `app/(portal)/layout.tsx` (nếu có portal padding wrapper), `src/domains/job-board/components/landing/**` (`hero.tsx`, `best-jobs-section.tsx`, `featured-job-card.tsx`, `recruiting-projects-section.tsx`, `hr-monogram.tsx`, `areas-section.tsx`, `referral-strip.tsx`), `app/globals.css`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**` |
| Forbidden paths | `prisma/**`, `src/domains/job-board/public.service.ts`, `src/lib/auth/**`, `src/lib/db/**`, `src/domains/job-board/apply-modal/**`, `src/domains/job-board/success-modal/**`, route `/viec-lam/[slug]/**` (NGOÀI SCOPE — sang TASK D.A ở Plan UI; editor sang Plan Admin V6), `app/admin/**`, schema/database/file MIGRATION bất kỳ. **KHÔNG** `app/api/jobs/route.ts` (Tier 0 đã đóng query URGENT khỏi Plan UI; sang AV1 V6) |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; full `npm run test:unit` cùng expected failure set đo tại exec-head-before + new failure count = 0; `npm run build` exit 0; `verify-task.ps1` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS |
| Visual gate | **Owner live review post-push** (DEC-11 chung — giữ override mới nhất). KHÔNG Edge/CDP/20 PNG/overlay/bbox markers; KHÔNG Lighthouse/pa11y/axe-core auto-install. Tier 3 KHÔNG audit visual; KHÔNG fail vì thiếu screenshot. |
| Current execution round | `1` (READY_FOR_AUDIT after Tier 2 thi công → Tier 3 FOCUSED audit **PASS 21/21** với 2 cosmetic warnings only) |
| Next gate | `/resolve → commit ACCEPTED → Owner live visual review post-deploy (AC-19, DEC-18)` |

> **Nguyên tắc UI-04A**: thay đổi JSX/class/style của homepage shell, Navbar, Footer, Hero search wrapper (A16), BestJobs card, Recruiting card. Mọi container/padding đồng bộ 1200px ở các landing component được phép sửa thuần (xem OBR-02). KHÔNG đụng schema/permission/DTO/persistence/API write — đó là Plan Admin V6.

## 1. Outcome

### 1.1 User-visible outcome

Trang `/` sau khi thi công đạt visual refinement theo `scratch/new-ui-HuongB-ref-2026-09-07/code.html` ở những phần đã chốt (A1–A16):

#### Container toàn trang (RQ-01, áp dụng RQ-02 + STEP-02..STEP-08)
- Container `max-w-[1200px]` (A1) — chính xác, padding trong border-box
- Tất cả section landing user-facing: Navbar, Hero, BestJobs, **Areas**, **Recruiting**, **CTV/ReferralStrip**, **Footer** đều dùng `max-w-[1200px] mx-auto`. Mobile `px-4` / desktop `px-6`.
- Cho phép Tier 2 sửa **chỉ container/padding thuần** ở Areas/CTV/Footer/Hero (không content/logic/restyle). Xem OBR-02.

#### Navbar (RQ-02..RQ-04, STEP-02)
- `h-16` (64px) — đồng bộ reference
- Logo + menu cùng cụm trái, auth cụm phải (`flex items-center gap-8` + `gap-4`)
- Menu typography dùng token hiện hữu trong app (`app/globals.css`): `text-label-md` hoặc `font-label-md text-label-md` — phải đối chiếu token table thật; KHÔNG mặc định `font-label-md` tồn tại. Nếu class thiếu, bổ sung scoped class scoped-class chỉ trong `app/globals.css` (đồng bộ Inter 14px)
- Active link `border-b-2 border-primary-container pb-1 font-bold`
- **Login → text link**: bỏ `hrp-btn-outline`. Dùng `font-label-md text-label-md text-on-surface hover:text-primary-container transition-colors`
- Signup giữ solid button nhỏ gọn
- Disabled link giữ nguyên pattern (button element + `aria-disabled`)
- Mobile hamburger giữ nguyên; breakpoint nav đủ rộng cho cụm menu/auth (>= 768px container width khi expanded)

#### BestJobs Card (RQ-04..RQ-07, STEP-03)
- **Logo 64×64 px (outer block)**, một lớp border/nền, inner mark co theo padding. Wrapper `w-16 h-16 rounded-xl border border-outline-variant bg-white shrink-0`. HrMonogram bên trong render mark co theo padding tự nhiên (KHÔNG lồng 2 borders, KHÔNG `p-2` ăn vào 64px)
- Title font: `font-headline-md text-on-surface font-bold leading-tight mb-1` + hover `group-hover:text-primary-container`
- Company name "HRP Việt Nam" giữ (chưa có public partner contract)
- Location icon + label giữ
- **Ribbon sát góc** (RQ-05, A6): className `absolute top-0 right-0 rounded-bl-lg bg-primary-container text-white px-3 py-1 flex items-center gap-1 shadow-sm z-10`. Icon: span className=`material-symbols-outlined text-[14px]` + `local_fire_department`. Label: `TUYỂN GẤP` uppercase. Chỉ render khi `badgeType === 'urgent'`
- **Salary thanh rộng** (RQ-06, A7): outer div className=`mt-auto`; inner div className=`bg-surface-container-low rounded-xl p-3 flex items-center justify-center gap-2`; icon span className=`material-symbols-outlined text-[20px] text-primary-container` + `payments`; label span className=`font-label text-label-md font-bold text-primary-container` hiển thị `{salary}`. Đơn vị giữ `đ/giờ`
- Salary unit giữ `đ/giờ` — không quy đổi sang tháng
- Section icon `local_fire_department` trong div className=`w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center`
- "Xem tất cả" link (RQ-07, A10) → route thật `/viec-lam`

#### Recruiting (RQ-08..RQ-10, STEP-05)
- Icon `apartment` trong vòng tròn nhẹ (DEC-11, A11) — gần hình thức demo, vẫn gọi "Dự án đang tuyển"
- **Monogram 64×64 px (outer block)** — giống nguyên tắc RQ-04 (KHÔNG `p-2` ăn 64px, KHÔNG nhân bản border hai lớp)
- **Bỏ cả eyebrow + bỏ sub-heading kỹ thuật** (DEC-13, A13) — chỉ heading + icon. KHÔNG thêm claim "Dự án trọng điểm"
- Copy: **`Cần tuyển {n} người`** (DEC-14, A14), `n = availableSlots` — slot là số người cần
- Card 4-col md / 2-col mobile, padding `rounded-xl p-4`, border `border-outline-variant`, hover `border-primary-container`
- Card là Next `Link` component (RQ-08 → RQ-10 dẫn tới AC-09) — KHÔNG anchor element giả
- Ẩn section nếu không có dữ liệu (giữ)

#### A16 — Search Card Nền Trắng (RQ-11, STEP-06)
- Bỏ wrapper glass hiện tại trong `app/(portal)/page.tsx`: form className=`flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur-md sm:flex-row sm:items-end sm:p-4`
- Dùng wrapper nền trắng (mới): form className=`flex flex-col gap-3 rounded-2xl border border-outline-variant bg-white p-3 sm:flex-row sm:items-end sm:p-4`
- Label đổi từ `text-white` → `text-on-surface` (KHÔNG để label trắng trên nền trắng — AC-13 contrast)
- Input `border-white/30 bg-white/95` → `border-outline-variant bg-white`
- CTA giữ `bg-primary-container text-white` (cam)
- Nền hero cam và recruitment highlight glass (riêng) giữ nguyên

### 1.2 Non-goals

- KHÔNG thay `src/domains/job-board/public.service.ts` (DTO/overview contract cố định). KHÔNG thêm field, không thay endpoint
- KHÔNG sửa `app/api/jobs/route.ts` (Tier 0 đã đóng URGENT filter khỏi Plan UI — chuyển Plan Admin V6 AV1)
- KHÔNG thay `prisma/schema.prisma` hay file migration nào
- KHÔNG mở pagination thật (sang Plan UI B)
- KHÔNG thêm tab filter BestJobs (sang Plan UI B)
- KHÔNG thêm Admin settings form (sang Plan Admin V6 AV1)
- KHÔNG thêm section Giới thiệu HRP, Dải đối tác, Tin tức, Banner mobile, Việc làm mới nhất (sang Plan UI C)
- KHÔNG thay đổi trang chi tiết `/viec-lam/[slug]` — sang Plan UI D.A (sau A)
- KHÔNG thêm logo doanh nghiệp / "Đối tác chính thức" / "Dự án trọng điểm"
- KHÔNG mở CMS, Tag tùy biến, search/filter mới, careers/apply mới
- KHÔNG thay đổi hero section ngoài search card wrapper (A16) và container padding (RQ-01). KHÔNG thay đổi AreasSection content/style ngoài container padding. KHÔNG thay đổi ReferralStrip content/style ngoài container padding và bỏ floating income claim. KHÔNG thay đổi Footer content ngoài container padding
- KHÔNG mở lại verdict UI-03 (đã ACCEPTED)
- KHÔNG tự phát minh SUPER_ADMIN, mở schema qua style task
- KHÔNG tự gắn nhãn "nổi bật", "đối tác", "cam kết", "Dự án trọng điểm" — không có data thật
- KHÔNG can thiệp kế hoạch plan cha (`docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` Tier 1 plane) ngoài allowlist ghi tại OBR-02

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Task slug dự kiến |
|---|---|---|
| Container + Navbar polish + A16 search card + BestJobs/Recruiting cards | **Plan UI A (task này)** | `hrp-v6-ui-04a-visual-polish` |
| Tab filter + pagination thật + UI controls (chỉ UI, không schema, không API mới) | Plan UI B | `hrp-v6-ui-04b-pagination-ui` |
| Sections mới + demo content có cấu trúc | Plan UI C | `hrp-v6-ui-04c-section-render` |
| Detail page UI (editorial sections skeleton) | Plan UI D.A | `hrp-v6-ui-04d-detail-ui` |
| HomepageSettings schema + admin write API + permission | **Plan Admin V6 AV1** | `hrp-v6-admin-v6-av1-settings-editor` |
| Editor tin Admin/Sale + JobPosting fields | Plan Admin V6 AV2 | `hrp-v6-admin-v6-av2-jobposting-editor` |
| Tag tùy biến | Plan Admin V6 AV3 (defer) | `hrp-v6-admin-v6-av3-tags` |
| Media management | Plan Admin V6 AV4 | `hrp-v6-admin-v6-av4-media` |
| Cache invalidation + integration test | Plan Admin V6 AV5 | `hrp-v6-admin-v6-av5-cache-inttest` |

> Tier 1 khảo sát + khóa data contract cho Plan Admin V6 AV1 ngay (xem `evidence/plan-admin-v6.md`); không chờ UI D.A mới lập plan.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `scratch/new-ui-HuongB-ref-2026-09-07/code.html` | Source of truth navbar, card ribbon, salary bar, recruiting. |
| `EV-02` | `evidence/plan-overview.md` | Plan tổng thể 2 plan. |
| `EV-03` | `evidence/field-matrix.md` | Hợp đồng dữ liệu UI ↔ Admin. |
| `EV-04` | `evidence/OWNER_APPROVAL_REQUIRED.md` | 28 quyết định đã chốt. |
| `EV-05` | `evidence/plan-admin-v6.md` | Plan Admin V6 mapping AV1..AV5 (xem Plan Admin V6 skeleton). |
| `EV-06` | `evidence/skeleton-B-C-D.md` | Skeleton UI B/C/D. |
| `EV-07` | `evidence/tier0-review-task-a-v1.md` | Tier 0 review v1 — REVISION_REQUIRED + chỉ thị cụ thể (closeout). |
| `EV-08` | `src/domains/job-board/public.service.ts` | DTO cố định. |
| `EV-09` | `app/components/GlobalNavbar.tsx` | Shell navbar hiện (`max-w-[1600px]`, `h-20`, login outline). |
| `EV-10` | `src/domains/job-board/components/landing/featured-job-card.tsx` | BestJobs card hiện. |
| `EV-11` | `src/domains/job-board/components/landing/recruiting-projects-section.tsx` | Recruiting section hiện. |
| `EV-12` | `app/(portal)/page.tsx` | Hero search card wrapper. |
| `EV-13` | `app/(jobs)/viec-lam/[slug]/page.tsx` | Detail (NGOÀI scope A — chỉ verify regression shell). |
| `EV-14` | `app/globals.css` | Token table (`font-label-md`, `font-headline-md`, `--color-*`). |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Container 1200px (padding trong border-box) | `CHOSEN` |
| `DEC-02` | Tier 2 được phép sửa **container/padding thuần** ở Areas/CTV/Footer/Hero (RQ-01 cover toàn bộ) | `CHOSEN` (closeout v1) |
| `DEC-03` | Tier 2 KHÔNG mở `app/api/jobs/route.ts` (URI URGENT khỏi Plan UI — sang AV1 V6) | `CHOSEN` (closeout v1) |
| `DEC-04` | Navbar `h-16` | `CHOSEN` |
| `DEC-05` | Login button đổi sang text link (bỏ outline button) | `CHOSEN` |
| `DEC-06` | Logo + menu gom cùng cụm trái (`gap-8`); auth cụm phải (`gap-4`) | `CHOSEN` |
| `DEC-07` | Logo 64×64 px (outer block), inner mark co theo padding; KHÔNG lồng 2 HrMonogram borders | `CHOSEN` (closeout v1) |
| `DEC-08` | Ribbon sát góc trên-phải (`rounded-bl-lg`) + icon `local_fire_department` 14px | `CHOSEN` |
| `DEC-09` | Salary thanh rộng (`rounded-xl p-3`) + icon `payments` 20px | `CHOSEN` |
| `DEC-10` | Salary unit `đ/giờ` — KHÔNG tự quy đổi sang tháng | `CHOSEN` |
| `DEC-11` | Section header icon `local_fire_department` trong `bg-secondary-container rounded-full` 40×40 | `CHOSEN` |
| `DEC-12` | "Xem tất cả" link → route thật `/viec-lam` | `CHOSEN` |
| `DEC-13` | Recruiting icon `apartment` trong vòng tròn nhẹ | `CHOSEN` |
| `DEC-14` | Monogram 64×64 px giữ nguyên — KHÔNG nhân bản border hai lớp, KHÔNG dùng nhận định "Foxconn 56px" | `CHOSEN` |
| `DEC-15` | Bỏ eyebrow + sub-heading recruiting; KHÔNG thêm claim "Dự án trọng điểm" | `CHOSEN` |
| `DEC-16` | Copy recruiting: `Cần tuyển {n} người`, n = availableSlots | `CHOSEN` |
| `DEC-17` | A16 search card wrapper đổi từ glass (`bg-white/10 backdrop-blur-md`) sang nền trắng (`bg-white border-outline-variant`) | `CHOSEN` |
| `DEC-18` | Visual gate = Owner live review post-push (giữ DEC-11 chung). KHÔNG Edge/CDP/PNG/bbox/measurement. Tier 3 KHÔNG audit visual; KHÔNG fail vì thiếu screenshot; KHÔNG tự ký PASS thay Owner | `CHOSEN` |
| `DEC-19` | Tier 1 sở hữu TASK.md canonical tại `docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md`. Tier 2 sở hữu HANDOFF + `evidence/**` + source code được phép sửa. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa các tài liệu plan cha ngoài allowlist | `CHOSEN` (closeout v1) |
| `DEC-20` | Baseline reference = `4d9a633` (UI-03 audit). Execution HEAD đo ngay trước sửa source bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt`. Expected unit failure set capture tại exec-head-before. KHÔNG `git checkout` về baseline cũ | `CHOSEN` (closeout v1) |
| `DEC-21` | Tier 2 typography đối chiếu `app/globals.css` token table thực có; nếu class thiếu, bổ sung scoped class vào `app/globals.css` chứ KHÔNG giả định `font-label-md` đã tồn tại | `CHOSEN` (closeout v1) |
| `DEC-22` | Tier 2 đo contrast thật theo cặp fg/bg pair + size/weight khi áp dụng search card trắng. Nếu CTA/label không đạt ngưỡng WCAG AA thì dùng token tương phản cao hơn, KHÔNG ép PASS để bám demo | `CHOSEN` (closeout v1) |
| `DEC-23` | OBR-01 allow tạo file mới HANDOFF + `evidence/**` + source test mới trong allowlist; KHÔNG cấm mọi path ngoài baseline-manifest | `CHOSEN` (closeout v1) |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Container `max-w-[1200px] mx-auto` ở tất cả section landing user-facing: Navbar (top shell), Hero content, BestJobs, **Areas**, **Recruiting**, **CTV/ReferralStrip**, **Footer**. Padding `px-4` mobile / `px-6` desktop. Padding NẰM TRONG border-box |
| `RQ-02` | Navbar `h-16` (64px). Logo + nav menu cùng cụm trái (`flex items-center gap-8`). Auth cụm phải (`flex items-center gap-4`). Breakpoint nav đủ rộng cho cụm menu/auth (>= 768px container width khi expanded) |
| `RQ-03` | Login → text link: bỏ `hrp-btn-outline`. Dùng token typography hiện hữu trong `app/globals.css` (font-label + text-label-md) với `text-on-surface hover:text-primary-container transition-colors`. KHÔNG border, KHÔNG bg |
| `RQ-04` | BestJobs logo **outer 64×64 px** một lớp border + bg-white (`w-16 h-16 rounded-xl border border-outline-variant bg-white shrink-0`). `HrMonogram` bên trong co theo padding wrapper (inner mark ~48-56px). KHÔNG lồng 2 HrMonogram borders |
| `RQ-05` | Ribbon sát góc (DEC-08): className đúng spec §1.1. Chỉ render khi `badgeType === 'urgent'`. Icon `local_fire_department` 14px |
| `RQ-06` | Salary thanh rộng (DEC-09): className đúng spec §1.1 + icon `payments` 20px. Đơn vị giữ `đ/giờ`. KHÔNG parse văn bản thành số |
| `RQ-07` | "Xem tất cả" link → route thật `/viec-lam`. BestJobs section header icon `local_fire_department` trong `w-10 h-10 bg-secondary-container rounded-full` |
| `RQ-08` | Recruiting header: `Dự án đang tuyển` + icon `apartment` trong vòng tròn nhẹ (`rounded-full bg-secondary-container w-10 h-10 flex items-center justify-center`) |
| `RQ-09` | Recruiting card: logo monogram 64×64 px outer (cùng pattern RQ-04, KHÔNG nhân bản border). Title font-bold text-on-surface. Slot text: `Cần tuyển {n} người`, `n = availableSlots` |
| `RQ-10` | Recruiting section copy gốc ràng buộc: KHÔNG "Top công ty", "Đối tác chính thức", "Cơ hội mới", "hiển thị số slot thật", "Dự án trọng điểm". Bỏ eyebrow + bỏ sub-heading kỹ thuật |
| `RQ-11` | A16 search card wrapper đổi từ glass → nền trắng (DEC-17). Label `text-white` → `text-on-surface`. Input `border-white/30 bg-white/95` → `border-outline-variant bg-white`. CTA giữ `bg-primary-container text-white`. Hero gradient cam giữ nguyên. RecruitmentHighlight glass riêng giữ nguyên |
| `RQ-12` | Tất cả data biến thiên (`title`, `companyName`, `salary`, `availableSlots`, `badgeType`, `location`, `deadline`) từ `PublicJobDto`/`PublicJobOverview` qua `/api/jobs`. KHÔNG hardcode số |
| `RQ-13` | Asset ảnh chỉ từ `public/images/homepage-huongb/**` đã Owner duyệt (giữ RQ-09 UI-03). KHÔNG URL Google tạm. KHÔNG logo doanh nghiệp bị hardcode |
| `RQ-14` | Regression shell: Navbar dùng chung trên `/`, `/viec-lam`, `/viec-lam/[slug]`, `/login`, `/ve-chung-toi`, `/ctv-portal`. Tier 2 source review từng route. Trang chi tiết `/viec-lam/[slug]` chỉ bị ảnh hưởng shell navbar/text-link — KHÔNG sửa nội dung detail |
| `RQ-15` | Fence test cập nhật theo composition mới (allowlist §11 OBR-02): `public-ui-premium.static.test.ts` (BestJobs ribbon + salary bar + logo border), `public-ui-token-parity.static.test.ts` (className density), `marketplace-inventory.static.test.ts` (salary label style), `public-card-truth.test.ts` (Truth mapping BestJobs). Mỗi thay đổi PHẢI có comment giải thích DEC |
| `RQ-16` | Typography đối chiếu token table thực trong `app/globals.css` (DEC-21). Bổ sung scoped class nếu thiếu; KHÔNG mặc định `font-label-md`/`font-headline-md` đã tồn tại |
| `RQ-17` | Visual parity gate: (a) code-side parity §1.1; (b) Owner live review post-push trên deployed homepage (DEC-18). Tier 2 KHÔNG cần Edge CDP/PNG/bbox measurement |

### 4.2 Domain boundaries

- **Container-only edits**: Tier 2 sửa được **container/padding thuần** ở Areas/CTV/Footer/Hero để thực hiện RQ-01 (xem OBR-02 allowlist). KHÔNG restyle nội dung các section đó ngoài container
- **Data/state**: giữ nguyên DTO + service. KHÔNG thêm field mới
- **Permission/security**: KHÔNG đổi auth/middleware/RLS
- **Interface/API**: KHÔNG đổi `/api/jobs/route.ts`. KHÔNG thêm route mới
- **Migration/rollback**: N/A

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04a-visual-polish/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline reference + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) Source reference commit = `4d9a633` (UI-03 audit, Tier 0 chốt — chỉ tham chiếu, KHÔNG checkout). (c) Capture unit failure set hiện tại → `evidence/expected-failure-set-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + danh sách failing test files | Nếu file expected failure set không match UI-03 baseline (3 pre-existing) → verify đo đúng lúc exec-head-before; nếu > 3 → báo Planner |
| `STEP-02` | `app/components/GlobalNavbar.tsx` (RQ-01 cho Navbar, RQ-02, RQ-03) | Container `max-w-[1200px]` (thay `max-w-[1600px]` hiện tại), `h-16` (thay `h-20`), logo+menu cùng cụm trái `flex items-center gap-8`, auth cụm phải `gap-4`. Active link `border-b-2 border-primary-container pb-1 font-bold`. Login đổi sang text link (bỏ `hrp-btn-outline`). Giữ mobile hamburger + disabled pattern (`button[aria-disabled]`) | Source review: `max-w-[1200px]` ở Navbar root, `h-16`, `gap-8`/`gap-4`. Token typography đối chiếu `app/globals.css`. Boundary check `px-4`/`px-6` border-box | Nếu mobile hamburger không focusable, text-link chữ dài tràn, hoặc token thiếu → sửa trước STEP-03 |
| `STEP-03` | `src/domains/job-board/components/landing/featured-job-card.tsx` (RQ-04..RQ-07, DEC-07..DEC-11) | Logo outer 64×64 px 1 lớp (`w-16 h-16 rounded-xl border border-outline-variant bg-white shrink-0`); HrMonogram con render mark co theo padding (KHÔNG `p-2` nếu wrapper đã border). Title font-headline. Company "HRP Việt Nam". Location chip. Ribbon sát góc `rounded-bl-lg` + `local_fire_department` 14px (chỉ khi `urgent`). Salary thanh rộng `rounded-xl p-3` + `payments` 20px, `đ/giờ` | Source review className string + điều kiện ribbon. Không có border nhân bản. `npm run test:unit -- public-card-truth` PASS | Nếu ribbon render khi `badgeType !== 'urgent'`, hoặc logo border lồng 2 lớp, hoặc salary parse văn bản → sửa |
| `STEP-04` | `src/domains/job-board/components/landing/best-jobs-section.tsx` (RQ-07 AC-08) | Section header icon `local_fire_department` trong div className=`w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center`. "Xem tất cả" link tag=`Link` href=`/viec-lam` thật (route đã verify) | Source review: tag=`Link` href=`/viec-lam` + icon wrapper | Nếu `/viec-lam` không phải route thật (verify tại EV-09 hoặc `app/(jobs)/viec-lam/page.tsx`) → dừng, escalate |
| `STEP-05` | `src/domains/job-board/components/landing/recruiting-projects-section.tsx` (RQ-08..RQ-10, DEC-13..DEC-16) | Icon `apartment` + vòng tròn nhẹ. Bỏ eyebrow + bỏ sub-heading kỹ thuật. Logo monogram 64×64 px outer (same RQ-04 pattern). Copy `Cần tuyển {n} người`, `n = availableSlots`. Card vẫn Next `Link` component. Ẩn section nếu không có data | Source review + PowerShell pattern AC-10 exit 1 (no match) | Nếu copy vẫn chứa "Top công ty", "Đối tác", "Cơ hội mới", "Dự án trọng điểm", hoặc eyebrow cũ → sửa |
| `STEP-06` | `app/(portal)/page.tsx` Hero search card (RQ-11, A16) | Wrapper đổi từ glass (`bg-white/10 backdrop-blur-md border-white/30`) sang `bg-white border border-outline-variant`. Label `text-white` → `text-on-surface` (`text-label-md font-bold text-on-surface`). Input → `bg-white border-outline-variant`. CTA giữ `bg-primary-container text-white`. Hero gradient cam và RecruitmentHighlight glass riêng giữ nguyên | Source review wrapper className + label/input/CTA. Đo contrast thật fg/bg pair theo DEC-22 | Nếu label trắng trên nền trắng (fail WCAG AA), hoặc CTA thiếu contrast → đổi token tối hơn, KHÔNG ép PASS |
| `STEP-07` | Container-only sync tại Areas/CTV/Footer (RQ-01 cover) | `src/.../landing/areas-section.tsx`: root wrapper `max-w-[1200px] mx-auto px-4 md:px-6` (giữ content). `src/.../landing/referral-strip.tsx`: cùng pattern. Bỏ floating income claim khớp DEC-06 UI-03. `app/components/GlobalFooter.tsx`: cùng pattern | Source review: `max-w-[1200px]` ở root wrapper từng file. KHÔNG restyle nội dung. Floating income → xem DEC-06 UI-03 (nếu đã bỏ) | Nếu restyle nội dung lỡ tay → revert từng phần |
| `STEP-08` | Cập nhật fence test allowlist §11 OBR-02 (DEC-19) | Cập nhật `public-ui-premium.static.test.ts`, `public-ui-token-parity.static.test.ts`, `marketplace-inventory.static.test.ts`, `public-card-truth.test.ts` theo composition mới; mỗi change phải có comment DEC-19 + file:line | `npm run test:unit -- public-card-truth` exit 0 | Nếu test fail ngoài expected-failure-set-before → dừng, báo Planner |
| `STEP-09` | Regression check shell cho mọi route portal (RQ-14) | Source review `app/(portal)/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`, `app/login/page.tsx` (hoặc tương đương), `app/ve-chung-toi/page.tsx`, `app/ctv-portal/page.tsx`. Tất cả đều render Navbar shell mới không vỡ | Source review + đếm route import GlobalNavbar | Nếu route nào import GlobalNavbar nhưng layout không tương thích → sửa |
| `STEP-10` | Mandatory gates (DEC-18) | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS | evidence file `ac14-gates.txt` | Nếu gate fail → dừng, sửa, KHÔNG ghi READY_FOR_AUDIT |

## 6. Acceptance

### 6.1 Acceptance criteria

Tất cả AC name một measurable method (T-05 — Tier 0 chỉ thị §4). Tier 2 ghi evidence file + manual source review cụ thể (file:điểm kiểm:evidence) thay vì tên phương pháp chung (Tier 0 §4).

| AC | Pass condition | Verification method (command/source review/evidence file) |
|---|---|---|
| `AC-01` | Container 1200px ở Navbar, Hero, BestJobs, Areas, Recruiting, CTV, Footer (RQ-01) | `rg -n "max-w-\[1200px\]" app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx "app/(portal)/page.tsx" src/domains/job-board/components/landing/hero.tsx src/domains/job-board/components/landing/best-jobs-section.tsx src/domains/job-board/components/landing/featured-job-card.tsx src/domains/job-board/components/landing/recruiting-projects-section.tsx src/domains/job-board/components/landing/areas-section.tsx src/domains/job-board/components/landing/referral-strip.tsx` (PowerShell; `-e` per pattern; exit 1 = no match). Lưu `evidence/ac01-container-1200.txt`. Expect ≥ 1 match từng file (10 file). Tier 2 ghi evidence file ghi rõ đã grep file nào, kết quả. |
| `AC-02` | Navbar `h-16` | `rg -n "h-16" app/components/GlobalNavbar.tsx`. Lưu `evidence/ac02-navbar-height.txt`. Expect ≥ 1 match tại root navbar wrapper. Tier 2 ghi evidence ghi rõ đã grep, line match. |
| `AC-03` | Logo + menu gom cụm trái; auth cụm phải | **Document review** `app/components/GlobalNavbar.tsx`: logo group tag=`Link` + nav tag=`ul`/`flex` cùng wrapper className=`flex items-center gap-8`; auth group className=`flex items-center gap-4`. Ghi `evidence/ac03-navbar-cluster.txt` kèm line range + 2 dòng source minh chứng |
| `AC-04` | Login là text link | `rg -n "hrp-btn-outline" app/components/GlobalNavbar.tsx` expect 0 match cho Login (Signup giữ nguyên, còn 1 match cho signup button riêng). Source review Login button: tag=`button`, className `text-label-md text-on-surface` không có border/bg. Ghi `evidence/ac04-login-textlink.txt` |
| `AC-05` | BestJobs logo 64×64 px outer 1 lớp border | **Document review** `src/domains/job-board/components/landing/featured-job-card.tsx`: HrMonogram wrapper `w-16 h-16 rounded-xl border border-outline-variant bg-white shrink-0` KHÔNG `p-2` lồng vào 64px; HrMonogram con render trong vùng padding tự nhiên. Ghi `evidence/ac05-bestjobs-logo.txt` kèm line + className |
| `AC-06` | Ribbon sát góc + icon | **Document review** `featured-job-card.tsx`: ribbon wrapper `absolute top-0 right-0 rounded-bl-lg bg-primary-container text-white px-3 py-1 flex items-center gap-1 shadow-sm z-10` + `material-symbols-outlined text-[14px]` `local_fire_department`. Conditional `{badgeType === 'urgent' && (...)}`. Ghi `evidence/ac06-ribbon.txt` |
| `AC-07` | Salary thanh rộng + icon + đơn vị `đ/giờ` | Source review `featured-job-card.tsx`: thanh `bg-surface-container-low rounded-xl p-3 flex items-center justify-center gap-2` + icon `payments text-[20px]` + label `text-primary-container font-bold`. `grep -n "đ/giờ\|đ\/giờ" src/domains/job-board/components/landing/featured-job-card.tsx` (or `app/(portal)/page.tsx` salaryLabel); expect ≥ 1 match. Ghi `evidence/ac07-salary-bar.txt` |
| `AC-08` | "Xem tất cả" link → `/viec-lam` | `rg -n "href=\"/viec-lam\"" src/domains/job-board/components/landing/best-jobs-section.tsx` expect ≥ 1 match. Ghi `evidence/ac08-xem-tat-ca.txt` |
| `AC-09` | Recruiting copy `Cần tuyển {n} người` với `n = availableSlots` + icon `apartment` + không eyebrow/sub-heading | **Document review** `recruiting-projects-section.tsx`: icon `apartment` trong `rounded-full bg-secondary-container`; copy `{n} vị trí`/`Cần tuyển {availableSlots}`; KHÔNG thẻ paragraph eyebrow cũ (kiểu `Cơ hội mới`, `Dự án trọng điểm`, `Đối tác`). Ghi `evidence/ac09-recruiting-copy.txt` |
| `AC-10` | **Truth fence**: changed public surface không chứa "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm" ở recruiting card | PowerShell `Select-String -Path src/domains/job-board/components/landing/recruiting-projects-section.tsx -Pattern "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm"`. Expect 0 match (exit 1). Lưu `evidence/ac10-truth-fence.txt`. (Tier 0 §4: chỉ scan changed public surface, không cả repo) |
| `AC-11` | A16 search card wrapper đổi sang nền trắng + label `text-on-surface` + input nền trắng | **Document review** `app/(portal)/page.tsx`: form wrapper `bg-white border border-outline-variant p-3` (KHÔNG `bg-white/10 backdrop-blur-md`); label `text-on-surface`; input `bg-white border-outline-variant`; CTA `bg-primary-container`. Ghi `evidence/ac11-search-card-white.txt` |
| `AC-12` | Container-only sync ở Areas/CTV/Footer (RQ-01) | **Document review** `areas-section.tsx`, `referral-strip.tsx`, `GlobalFooter.tsx`: root wrapper `max-w-[1200px] mx-auto px-4 md:px-6` (KHÔNG restyle nội dung). `referral-strip.tsx` KHÔNG floating income claim (DEC-06 UI-03). Ghi `evidence/ac12-container-sync.txt` kèm 3 file + line + className |
| `AC-13` | Contrast A16 search card thực đo theo fg/bg + size + weight (DEC-22) | Source review file `app/globals.css` token table: ghi rõ `--color-on-surface`, `--color-primary-container` defined; Tier 2 đo thủ công tỉ lệ: (a) label `text-on-surface` trên `bg-white` ≥ 4.5:1 (body) hoặc ≥ 3:1 (large). (b) CTA label `text-white` trên `bg-primary-container` — nếu không đạt 4.5:1 thì đổi token tương phản cao hơn. Lưu `evidence/ac13-contrast-actual.txt` (KHÔNG dùng Lighthouse/pa11y/axe-core auto-install — DEC-18) |
| `AC-14` | Typography đối chiếu token table thực (DEC-21) | **Document review** `app/globals.css`: verify `font-label-md`, `font-headline-md`, `text-label-md`, `text-headline-md` đã định nghĩa; nếu chưa, bổ sung scoped class vào `app/globals.css` (KHÔNG giả định tồn tại). Tier 2 ghi `evidence/ac14-typography-tokens.txt` kèm line + className |
| `AC-15` | Hardcode truth-fence: changed public surface không chứa số giả (`17.800`, `13.000.000`, `+10.000.000`, `+50.000.000`, `10.000.000 VNĐ`, `50.000.000 VNĐ`) | PowerShell `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx,src/domains/job-board/components/landing/recruiting-projects-section.tsx,"app/(portal)/page.tsx" -Pattern "17\.800|13\.000\.000|\+10\.000\.000|\+50\.000\.000|10\.000\.000 VNĐ|50\.000\.000 VNĐ"`. Expect 0 match. (Tier 0 §4: chỉ kiểm changed public surface, không cả repo; `/logo.png` trong `public/` hợp lệ ngoài phạm vi. Asset references check riêng AC-13b). Lưu `evidence/ac15-truth-fence-numbers.txt` |
| `AC-16` | Asset references: chỉ `public/images/homepage-huongb/**` (RQ-13) | `rg -n "lh3\.googleusercontent|/logo\.png" src/domains/job-board/components/landing/ "app/(portal)/page.tsx" app/components/Global*.tsx` expect 0 match. (Tier 0 §4: không cả repo, chỉ changed public surface). Lưu `evidence/ac16-asset-refs.txt` |
| `AC-17` | Regression shell: tất cả route portal render đúng shell | **Document review** import GlobalNavbar trong 6 route files. Tier 2 đếm route import + ghi line từng route. Lưu `evidence/ac17-regression-check.txt` |
| `AC-18` | Mandatory gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0; `npm run build` exit 0; `node scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md` exit 0 PASS; `node scripts/verify-handoff.ps1` exit 0 PASS. Lưu `evidence/ac18-gates.txt` với exit code từng gate |
| `AC-19` | AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-18) | Status marker trong HANDOFF; Tier 3 không fail vì thiếu screenshot; visual parity Owner duyệt post-deploy |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02, STEP-07 | AC-01, AC-12 |
| RQ-02 | STEP-02 | AC-02, AC-03 |
| RQ-03 | STEP-02 | AC-04 |
| RQ-04 | STEP-03 | AC-05 |
| RQ-05 | STEP-03 | AC-06 |
| RQ-06 | STEP-03 | AC-07 |
| RQ-07 | STEP-03, STEP-04 | AC-07, AC-08 |
| RQ-08 | STEP-05 | AC-09 |
| RQ-09 | STEP-05 | AC-09 |
| RQ-10 | STEP-05 | AC-10 |
| RQ-11 | STEP-06 | AC-11, AC-13, AC-14 |
| RQ-12 | STEP-03, STEP-04, STEP-05 | AC-15 |
| RQ-13 | STEP-02, STEP-03, STEP-04, STEP-05 | AC-16 |
| RQ-14 | STEP-09 | AC-17 |
| RQ-15 | STEP-08 | AC-18 |
| RQ-16 | STEP-02, STEP-03 | AC-14 |
| RQ-17 | STEP-10 | AC-19 |
| (visual) | (post-push) | AC-19 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Text-link Login phá style của route portal khác. | STEP-09 source review tất cả route dùng `GlobalNavbar`; nếu route nào vỡ → sửa trước STEP-10 |
| `RISK-02` | Container 1200px ảnh hưởng admin route (nếu admin dùng cùng shell). | STEP-09 source review; chỉ áp dụng 1200px cho shell public user-facing; admin route có max-w riêng |
| `RISK-03` | Search card nền trắng fail contrast (label trắng hoặc CTA cam). | AC-13 đo contrast thật; nếu không đạt → đổi token, KHÔNG ép PASS |
| `RISK-04` | Fence test fail khi đổi card style/className/salary style. | DEC-19 mở allowlist; STEP-08 cập nhật fence theo composition mới; nếu test fail ngoài expected → halt |
| `RISK-05` | Tier 2 vô tình dùng lại copy cũ hoặc assumption "Foxconn 56px". | AC-10 truth-fence + DEC-13/DEC-14 chặn |
| `RISK-06` | Tier 2 dùng `font-label-md` mà class chưa tồn tại trong app. | DEC-21 + AC-14 bắt buộc verify token table thật |
| `RISK-07` | OBR-01 cấm mọi path ngoài baseline-manifest (Tier 0 §3). | DEC-23 explicitly allow `docs/tasks/hrp-v6-ui-04a-visual-polish/HANDOFF.md` + `evidence/**` |

## 8. Open Questions

None — Owner đã chốt 28 quyết định trong `evidence/OWNER_APPROVAL_REQUIRED.md`. Tier 0 review v1 đã close (REVISION_REQUIRED → sửa → READY).

## 9. Planner Resolution

Tier 1 sẽ append sau mỗi round.

| Round | Decision | Reason |
|---|---|---|
| Round 0 (planning) | Tier 1 soạn `TASK.md` canonical tại `docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md`. Plan cha `hrp-v6-ui-04-homepage-huongb-refinement/` chỉ chứa plan overview, field matrix, skeleton, owner approval. Tách Plan UI A→B→C→D và Plan Admin V6 (AV1..AV5) | Tier 0 chỉ thị mới 10/09/2026. |
| Round 1 (closeout) | Tier 1 sửa đúng 5 nhóm theo Tier 0 review v1: (1) tách plan — gộp B schema/admin write, D.B editor sang Plan Admin V6 ngay; UI B chỉ controls/view-model INTEGRATION_PENDING. (2) container scope mở rộng cho phép Tier 2 sửa Areas/CTV/Footer thuần padding. (3) baseline reference + execution HEAD; Tier 1 sở hữu TASK.md canonical, Tier 2 HANDOFF/evidence. (4) gate: STEP IDs split tường minh; ACs document review cụ thể; rg PowerShell pattern đúng; AC-10/AC-15 thu hẹp scope; số AC match Required gates. (5) logo 64px outer 1 lớp + token thực + contrast thực đo. Bump v1.1 → READY_FOR_EXECUTION. verify-task DRAFT-VALID (1 warning). | Tier 0 verdict REVISION_REQUIRED r1. |
| Round 2 (sau execution) | Tier 2 thi công → verify-task PASS → verify-handoff PASS → Tier 3 FOCUSED audit PASS 21/21 → Task `ACCEPTED` → Owner live visual review post-deploy (AC-19, DEC-18) | per §0 Next gate |
| Round 3 (resolve) | Tier 1 bump status TASK.md → `ACCEPTED`, Next gate → `/resolve → commit → Owner live visual review`. Tier 3 evidence: audit report `agent-transcripts/9e5060da-c10f-451a-af40-8cf6d61856fd/subagents/02ca676b-1595-42fc-b4ce-d1f368d041b2.jsonl`. | Tier 3 verdict PASS |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-10 (Tier 1) | Initial TASK A | Tier 0 chỉ thị mới. |
| v1.1 | 2026-09-10 (Tier 1) | Closeout theo Tier 0 review v1. Tách Plan Admin V6 sang AV1..AV5 skeleton riêng; UI B chỉ controls/view-model. Container 1200px mở rộng Areas/CTV/Footer (DEC-02). Logo 64px outer 1 lớp (DEC-07). Baseline ref `4d9a633`, exec HEAD đo ngay trước (DEC-20). Tier 1 sở hữu TASK.md canonical; Tier 2 HANDOFF/evidence (DEC-19). STEP IDs split tường minh; ACs document review cụ thể; rg PowerShell pattern đúng; AC-10/AC-15 thu hẹp changed public surface only (Tier 0 §4). Typography đối chiếu token thực (DEC-21). Contrast đo fg/bg + size/weight (DEC-22). OBR-01 allow create HANDOFF/evidence (DEC-23) | Tier 0 verdict REVISION_REQUIRED r1. |

## 11. Owner Baseline-aware Resolution (OBR)

### OBR-01 — Baseline reference + execution HEAD

- Source reference = `4d9a633` (UI-03 audit commit). Dùng để đối chiếu scope UI-03 đã ACCEPTED. KHÔNG `git checkout`; chỉ đo `git show 4d9a633 -- file` khi cần
- Execution HEAD: đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt`. Tier 2 dùng để so diff
- Baseline expected unit failure set: chạy `npm run test:unit --reporter=json 2>evidence/test-unit-before.json` LÚC exec-head-before, hash số failing tests → `evidence/expected-failure-set-before.txt`
- `git status --porcelain` tại exec-head-before → `evidence/working-tree-before.txt`. Mọi dirty file ngoài §1.3 dirty set là non-task (foreign), KHÔNG FAIL
- **Allow create/edit HANDOFF + `evidence/**`** trong `docs/tasks/hrp-v6-ui-04a-visual-polish/**` (DEC-23). OBR-01 chỉ cảnh báo path ngoài allowlist OBR-02 chứ KHÔNG cấm mọi file chưa tồn tại trong baseline-manifest
- `git diff --name-only [exec-head-before]..HEAD` cuối round vs baseline = KHÔNG có path mới ngoài allowlist OBR-02

### OBR-02 — Allowlist Sửa (paths Tier 2 được phép tạo/sửa)

| Path | Quyền | Ghi chú |
|---|---|---|
| `app/components/GlobalNavbar.tsx` | Sửa | STEP-02 container 1200px + h-16 + cluster + login text link |
| `app/components/GlobalFooter.tsx` | Sửa (container/padding thuần) | STEP-07 RQ-01 |
| `app/(portal)/page.tsx` | Sửa (Hero search wrapper + container/padding) | STEP-06 A16, STEP-07 RQ-01 |
| `app/(portal)/layout.tsx` | Sửa (nếu có portal padding wrapper) | RQ-01 cover |
| `app/globals.css` | Sửa (chỉ bổ sung scoped class typography nếu thiếu) | DEC-21, AC-14 |
| `src/domains/job-board/components/landing/hero.tsx` | Sửa (chỉ container/padding) | STEP-07 RQ-01 |
| `src/domains/job-board/components/landing/best-jobs-section.tsx` | Sửa | STEP-04 RQ-07, AC-08 |
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Sửa | STEP-03 RQ-04..RQ-07 |
| `src/domains/job-board/components/landing/recruiting-projects-section.tsx` | Sửa | STEP-05 RQ-08..RQ-10 |
| `src/domains/job-board/components/landing/hr-monogram.tsx` | Sửa (nếu cần đồng bộ inner mark) | DEC-07 |
| `src/domains/job-board/components/landing/areas-section.tsx` | Sửa (chỉ container/padding) | STEP-07 RQ-01 |
| `src/domains/job-board/components/landing/referral-strip.tsx` | Sửa (chỉ container/padding; bỏ floating income claim nếu chưa) | STEP-07 RQ-01 |
| `src/domains/applications/marketplace-inventory.static.test.ts` | Sửa (fence) | STEP-08 DEC-19 |
| `src/domains/job-board/public-ui-premium.static.test.ts` | Sửa (fence) | STEP-08 DEC-19 |
| `src/domains/job-board/public-ui-token-parity.static.test.ts` | Sửa (fence) | STEP-08 DEC-19 |
| `src/domains/job-board/public-card-truth.test.ts` | Sửa (fence) | STEP-08 DEC-19 |
| `docs/tasks/hrp-v6-ui-04a-visual-polish/**` | Tạo + Sửa | HANDOFF + evidence + planning artifacts do Tier 2 tạo |
| `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` | **KHÔNG** sửa (Tier 1 plane) | DEC-19; Tier 2 phát hiện cần sửa → halt, báo Tier 1 |
| (mọi path khác) | **KHÔNG** sửa | OBR-01 cảnh báo; Tier 2 halt, escalate Tier 1 |

### OBR-03 — Anti-scope-creep

- Tier 2 không tự ý thêm path mới vào allowlist; nếu cần, mở correction round
- Mọi file mới: Tier 2 chỉ tạo trong `docs/tasks/hrp-v6-ui-04a-visual-polish/evidence/**` + `HANDOFF.md`
- Tier 2 KHÔNG commit/push/deploy — Tier 1 có quyền đó sau khi đạt gate READY_FOR_AUDIT + Tier 3 PASS
