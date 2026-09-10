# TASK A — `hrp-v6-ui-04a-visual-polish`

> Mandate Owner: `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md` (Tier 0 chỉ thị 10/09/2026). Tier 1 soạn TASK A ngay theo §"Quyền tiếp tục". Tier 2 chỉ thi công sau khi Owner duyệt và Tier 1 chuyển trạng thái `READY_FOR_EXECUTION`.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04a-visual-polish` |
| Work type | `DESIGN` (thay đổi JSX/class/style của homepage + Navbar + Footer + landing components + search card Hero) |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Spec version | `v1.0` |
| Status | `DRAFT` |
| Planner | `Tier 1` |
| Plan overview | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md` |
| Source TASK | TASK UI-03 v1.5 (`hrp-v6-ui-03-homepage-huongb-visual-parity` đã ACCEPTED + audit `4d9a633`) |
| Baseline | `4d9a633` (HEAD sau khi UI-03 R2 + audit đã push; planning commit `0eaf912` đã push) |
| In-scope roots | `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`, `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/**` (`hero.tsx`, `best-jobs-section.tsx`, `featured-job-card.tsx`, `recruiting-projects-section.tsx`, `hr-monogram.tsx`, `areas-section.tsx`, `referral-strip.tsx`), `app/globals.css`, `evidence/**` |
| Forbidden paths | `prisma/**`, `src/domains/job-board/public.service.ts`, `src/lib/auth/**`, `src/lib/db/**`, `src/domains/job-board/apply-modal/**`, `src/domains/job-board/success-modal/**`, route `/viec-lam/[slug]/**` (ngoài scope A — sang Task D), `app/admin/**`, mọi thay đổi schema/database |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0 (KHÔNG ép exit 1); `npm run build` exit 0; `verify-task.ps1` PASS; `verify-handoff.ps1` PASS; `rg -n "lh3\.googleusercontent|companyName"` (AC-08, 0 match); `rg -n "17\.800|13\.000\.000|\+10\.000\.000|\+50\.000\.000|10\.000\.000 VNĐ|50\.000\.000 VNĐ"` (AC-09, 0 match); `rg -n "Dự án trọng điểm|hiển thị số slot thật"` (AC-10, 0 match — copy mới Tier 0 A13) |
| Visual gate | **Owner live review post-push** theo DEC-11 (giữ override mới nhất). KHÔNG cần Edge/CDP/20 PNG/overlay/bbox markers/scrollWidth measurement; KHÔNG cần Lighthouse/pa11y/axe-core auto-install; KHÔNG cần Edge CDP runtime. |
| Current execution round | `0` (READY_FOR_EXECUTION sau khi Owner duyệt TASK.md này) |
| Next gate | `/code → Tier 2 thi công → verify-task PASS → verify-handoff PASS → Tier 1 trình /audit → Tier 3 FOCUSED audit → /resolve → push Git → Owner live visual review post-deploy`. |

> **Nguyên tắc UI-04A**: đây là JSX/style changes — không chạm schema/permission/DTO/persistence. Pagination + Admin Config thuộc Task B. Section demo content thuộc Task C. Trang chi tiết thuộc Task D.

## 1. Outcome

### 1.1 User-visible outcome

Trang `/` sau khi thi công đạt visual refinement theo `scratch/new-ui-HuongB-ref-2026-09-07/code.html` ở những phần đã chốt (A1–A16):

#### Navbar + Container
- Container `max-w-[1200px]` (A1) chính xác, padding trong border-box, `px-4` mobile / `px-6` desktop (A2 đồng bộ container)
- Navbar `h-16` (64px) (A2) — đồng bộ reference
- Logo + menu cùng cụm trái, auth cụm phải (A4) — `flex items-center gap-8`
- Menu typography rõ: `font-label-md text-label-md` Inter 14px (đang đúng)
- Active link `border-b-2 border-primary-container pb-1 font-bold` (A9 điều chỉnh sang font-bold)
- **Login button → text link** (A3): bỏ `hrp-btn-outline`, dùng `font-label-md text-label-md text-on-surface hover:text-primary-container` — đồng bộ reference
- Signup giữ solid button nhỏ gọn
- Disabled link giữ nguyên pattern (button element + aria-disabled)
- Mobile hamburger giữ nguyên

#### BestJobs Card
- Logo monogram 64×64 px (giữ `HrMonogram`) **trong vòng nhận diện thoáng** (A5): `w-16 h-16 rounded-xl border border-outline-variant p-2 bg-white`
- Title `font-headline-md text-headline-md text-on-surface font-bold leading-tight mb-1 group-hover:text-primary-container`
- Company name "HRP Việt Nam" giữ (chưa có public partner contract)
- Location icon + label giữ
- **Ribbon sát góc** (A6): `absolute top-0 right-0 rounded-bl-lg bg-primary-container text-white px-3 py-1 flex items-center gap-1 shadow-sm` + `local_fire_department` icon 14px
- **Salary thanh rộng** (A7): `bg-surface-container-low rounded-xl p-3 flex items-center justify-center gap-2` + `payments` icon 20px
- Salary unit giữ `đ/giờ` (A8) — KHÔNG quy đổi sang tháng
- Section icon `local_fire_department` trong `w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center`
- **"Xem tất cả" link** (A10) → route thật `/viec-lam` đã kiểm tra

#### Recruiting (Dự án đang tuyển)
- **Icon `apartment` trong vòng tròn nhẹ** (A11) — gần hình thức demo, vẫn gọi "Dự án đang tuyển"
- Monogram 64×64 px **giữ nguyên** (A12) — KHÔNG dùng nhận định "Foxconn 56px"; KHÔNG nhân bản border hai lớp
- **Bỏ cả eyebrow + bỏ sub-heading kỹ thuật** (A13) — chỉ heading/icon, không thêm claim "dự án trọng điểm"
- Copy: **`Cần tuyển {n} người`** (A14) với `n = availableSlots` — slot là số người cần
- Card giữ 4-col md / 2-col mobile, padding `rounded-xl p-4`, border `border-outline-variant`, hover `border-primary-container`
- Card là Next `<Link>` (theo RQ-08/RQ-10 UI-03) — không anchor element giả
- Ẩn section nếu không có dữ liệu (giữ)

#### A16 — Search Card Nền Trắng
- **Bỏ wrapper glass** hiện tại: `flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur-md sm:flex-row sm:items-end sm:p-4`
- **Dùng wrapper nền trắng** (mới): `flex flex-col gap-3 rounded-2xl border border-outline-variant bg-white p-3 sm:flex-row sm:items-end sm:p-4`
- Label đổi từ `text-white` → `text-on-surface` (hoặc dùng `text-label-md font-bold text-on-surface`)
- Input border đổi từ `border-white/30` → `border-outline-variant`, `bg-white/95` → `bg-white`
- CTA giữ `bg-primary-container text-white` (cam trên nền trắng)
- Nền hero cam (giữ `from-primary-dark via-primary to-primary-fixed`) và `RecruitmentHighlight` glass riêng (giữ nguyên)
- Filter/submit/focus/mobile hoạt động bình thường
- Không để label trắng trên nền trắng

### 1.2 Non-goals

- **Không** thay đổi `src/domains/job-board/public.service.ts` (DTO/overview contract cố định)
- **Không** thay đổi `/api/jobs/route.ts`
- **Không** thay đổi `prisma/schema.prisma`
- **Không** mở pagination thật (thuộc Task B)
- **Không** thêm tab filter BestJobs (thuộc Task B)
- **Không** thêm Admin settings form (thuộc Task B)
- **Không** thêm section Giới thiệu HRP, Dải đối tác, Tin tức, Banner mobile, Việc làm mới nhất (thuộc Task C)
- **Không** thay đổi trang chi tiết `/viec-lam/[slug]` (thuộc Task D)
- **Không** thêm logo công ty / "Đối tác chính thức" vào recruiting section (DEC-04 UI-03)
- **Không** thay đổi `Hero` (trừ search card theo A16), `AreasSection`, `ReferralStrip` (trừ bỏ floating income claim khớp DEC-06 UI-03), `Footer`
- **Không** mở lại verdict UI-03 (đã ACCEPTED)
- **Không** tự phát minh SUPER_ADMIN, tag tùy biến, mở schema qua style task
- **Không** tự gắn nhãn "nổi bật", "đối tác", "cam kết" — không có data thật

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `scratch/new-ui-HuongB-ref-2026-09-07/code.html` | source of truth về navbar typography, card ribbon, salary bar, recruiting section. |
| `EV-02` | `evidence/plan-overview.md` | Plan tổng thể 2 plan (UI public + Admin V6) + A→B→C→D. |
| `EV-03` | `evidence/field-matrix.md` | Hợp đồng dữ liệu UI ↔ Admin V6 — types canonical. |
| `EV-04` | `evidence/OWNER_APPROVAL_REQUIRED.md` | 28 quyết định đã chốt (A1–A16, B1–B13). |
| `EV-05` | `src/domains/job-board/public.service.ts` | DTO cố định (PublicJobDto, PublicJobOverview, PublicJobFacets). |
| `EV-06` | `app/components/GlobalNavbar.tsx` | Shell navbar hiện tại (`max-w-[1600px]`, `h-20`, login outline button). |
| `EV-07` | `src/domains/job-board/components/landing/featured-job-card.tsx` | BestJobs card hiện tại (logo 64px, pill ribbon, salary pill nhỏ). |
| `EV-08` | `src/domains/job-board/components/landing/recruiting-projects-section.tsx` | Recruiting section hiện tại (`Cần tuyển` chưa chuẩn hoá, eyebrow "Cơ hội mới", sub-heading kỹ thuật). |
| `EV-09` | `app/(portal)/page.tsx` (Hero search card) | Wrapper search hiện tại (`bg-white/10 backdrop-blur-md`) cần đổi sang nền trắng theo A16. |
| `EV-10` | `app/(jobs)/viec-lam/[slug]/page.tsx` | Trang chi tiết (NGOÀI SCOPE A — sang Task D) — chỉ đảm bảo navbar mới không vỡ trang này. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Navbar container 1200px chính xác, padding nằm trong chiều rộng border-box (Owner điều chỉnh A1 — không ghi tương đương 1280px) | `CHOSEN` |
| `DEC-02` | Navbar height `h-16` (64px) | `CHOSEN` |
| `DEC-03` | Login button đổi sang text link (bỏ outline button) | `CHOSEN` |
| `DEC-04` | Logo + menu gom cùng cụm trái (không `justify-between` rỗng) | `CHOSEN` |
| `DEC-05` | BestJobs logo 64×64 px trong `rounded-xl border border-outline-variant p-2 bg-white` (giữ monogram) | `CHOSEN` |
| `DEC-06` | Ribbon sát góc trên-phải (`rounded-bl-lg`) + `local_fire_department` icon 14px | `CHOSEN` |
| `DEC-07` | Salary thanh rộng (`rounded-xl p-3`) + `payments` icon 20px | `CHOSEN` |
| `DEC-08` | Salary unit giữ `đ/giờ` — không tự quy đổi sang tháng | `CHOSEN` |
| `DEC-09` | Section header icon `local_fire_department` trong vòng tròn `bg-secondary-container` | `CHOSEN` |
| `DEC-10` | "Xem tất cả" link → route thật `/viec-lam` | `CHOSEN` |
| `DEC-11` | Recruiting icon `apartment` trong vòng tròn nhẹ | `CHOSEN` |
| `DEC-12` | Monogram 64×64 px giữ nguyên — KHÔNG nhân bản border hai lớp, KHÔNG dùng nhận định "Foxconn 56px" | `CHOSEN` |
| `DEC-13` | Bỏ eyebrow + sub-heading recruiting; KHÔNG thêm claim "dự án trọng điểm" | `CHOSEN` |
| `DEC-14` | Copy recruiting: `Cần tuyển {n} người`, n = availableSlots (slot là số người cần) | `CHOSEN` |
| `DEC-15` | Search card wrapper đổi từ glass (`bg-white/10 backdrop-blur-md`) sang nền trắng (`bg-white border-outline-variant`) — A16 | `CHOSEN` |
| `DEC-16` | Visual review gate = **Owner live review post-push** (giữ override mới nhất); Tier 2 KHÔNG cần Edge/CDP/PNG/bbox markers, KHÔNG cần Lighthouse/pa11y/axe-core auto-install | `CHOSEN` |
| `DEC-17` | Tier 3 audit boundary = source/test/route/a11y/regression (KHÔNG audit visual); Tier 3 KHÔNG được ký PASS thay Owner; Tier 3 KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-18` | Fence tests cập nhật theo composition mới trong allowlist §11 OBR-02 (DEC-10 + DEC-12 UI-03 vẫn áp dụng) | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | **Container 1200px**: toàn bộ section container (Navbar, Hero content, BestJobs, Areas, Recruiting, CTV, Footer) dùng `max-w-[1200px] mx-auto`. Padding `px-4` mobile / `px-6` desktop. Padding NẰM TRONG border-box (đồng bộ). |
| `RQ-02` | **Navbar**: `h-16` (64px). Logo + nav menu cùng cụm trái (`flex items-center gap-8`). Auth cụm phải (`flex items-center gap-4`). Menu typography `font-label-md text-label-md` (Inter 14px) rõ ràng. |
| `RQ-03` | **Login → text link**: bỏ `hrp-btn-outline`, dùng `font-label-md text-label-md text-on-surface hover:text-primary-container transition-colors`. Không border, không bg. |
| `RQ-04` | **BestJobs logo**: `w-16 h-16` (giữ monogram 64×64 px) trong `rounded-xl border border-outline-variant p-2 bg-white` (theo A5). |
| `RQ-05` | **Ribbon sát góc** (A6): `absolute top-0 right-0 rounded-bl-lg bg-primary-container text-white px-3 py-1 flex items-center gap-1 shadow-sm z-10` + `<span className="material-symbols-outlined text-[14px]" aria-hidden="true">local_fire_department</span>` + label `Tuyển gấp` `font-label text-label-sm font-bold uppercase tracking-wider`. Ribbon chỉ render khi `badgeType === 'urgent'`. |
| `RQ-06` | **Salary thanh rộng** (A7): `<div className="mt-auto"><div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-center gap-2"><span className="material-symbols-outlined text-primary-container text-[20px]" aria-hidden="true">payments</span><span className="font-label text-label-md font-bold text-primary-container">{salary}</span></div></div>`. Đơn vị giữ `đ/giờ` (A8). |
| `RQ-07` | **BestJobs section header**: `Việc làm tốt nhất` với icon `local_fire_department` trong `<div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center">` + eyebrow "Gợi ý cho bạn" (giữ) + "Xem tất cả" link đến `/viec-lam` (A10). |
| `RQ-08` | **Recruiting header**: `Dự án đang tuyển` + icon `apartment` trong vòng tròn nhẹ (A11). Bỏ eyebrow + sub-heading kỹ thuật (A13). |
| `RQ-09` | **Recruiting card**: logo monogram 64×64 px giữ nguyên (A12 — không nhân bản border hai lớp). Title `font-headline-md font-bold text-on-surface`. Slot text: **`Cần tuyển {n} người`** với `n = availableSlots` (A14). |
| `RQ-10` | **A16 Search card nền trắng**: wrapper đổi từ `<form className="flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur-md sm:flex-row sm:items-end sm:p-4">` → `<form className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-white p-3 sm:flex-row sm:items-end sm:p-4">`. Label `text-white` → `text-on-surface`. Input `border-white/30 bg-white/95` → `border-outline-variant bg-white`. CTA giữ `bg-primary-container text-white`. |
| `RQ-11` | **Asset ảnh** chỉ từ `public/images/homepage-huongb/**` đã Owner duyệt (giữ RQ-09 UI-03). Không URL Google tạm, không logo doanh nghiệp bịa. |
| `RQ-12` | **Data biến thiên**: tất cả số job/lương/deadline/badge/slot từ `PublicJobDto`/`PublicJobOverview` qua `/api/jobs`. Không hardcode. |
| `RQ-13` | **Regression check** (bắt buộc): Navbar dùng chung trên `/`, `/viec-lam`, `/viec-lam/[slug]`, `/login`, `/ve-chung-toi`, `/ctv-portal`. Khi đổi navbar/text-link/typography phải verify các route trên vẫn render đúng. Trang chi tiết `/viec-lam/[slug]` chỉ bị ảnh hưởng về shell — không sửa nội dung detail. |
| `RQ-14` | **Fence tests** cập nhật theo composition mới (cho phép, không bị block test cũ): `public-ui-premium.static.test.ts`, `public-ui-token-parity.static.test.ts`, `marketplace-inventory.static.test.ts`, `public-card-truth.test.ts`. Mỗi thay đổi PHẢI có comment giải thích cho phép DEC-18. |
| `RQ-15` | **Visual parity gate** (post-push, DEC-16): (a) code-side parity khớp `code.html` ở section-level theo A1–A16. (b) Owner visual review chuyển sang post-push live trên deployed homepage. Tier 2 KHÔNG cần Edge CDP runtime/PNG/bbox. (c) Tier 3 KHÔNG audit visual; Tier 3 KHÔNG fail vì thiếu screenshot; Tier 3 KHÔNG tự ký PASS thay Owner. |

### 4.2 Scope boundaries

- **In**: xem §0 In-scope roots.
- **Out**: xem §0 Forbidden paths + §1.2 Non-goals.
- **Allowed task artifacts**: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**` (Tier 2 tạo TASK.md tại đây).

### 4.3 Domain boundaries

- **Data/state**: giữ nguyên DTO + service. Không thêm field, không thay đổi endpoint.
- **Permission/security**: KHÔNG đổi auth/middleware/RLS. Tier 2 KHÔNG mở route Admin hoặc endpoint mới.
- **Interface/API**: KHÔNG đổi `/api/jobs/route.ts`. KHÔNG thêm route mới.
- **Migration/rollback**: N/A — không migration.
- **Audit lane**: STANDARD / FOCUSED.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline capture | Tier 2 chạy `git status --porcelain` + `git rev-parse HEAD` trong CÙNG execution round. Baseline commit = `4d9a633` (UI-03 audit). | diff `git status` vs baseline; `git rev-parse HEAD` chính là baseline commit | Nếu `git status` lệch với scope task này → dừng, báo Planner. |
| `STEP-02` | `app/components/GlobalNavbar.tsx` | Container 1200px (RQ-01), `h-16` (RQ-02), logo+menu gom cụm trái (RQ-02), active link font-bold (DEC-09), login text link (RQ-03). | Source review cho `max-w-[1200px]`, `h-16`, `gap-8`, text-link className; verify mobile responsive (hamburger collapse). | Nếu mobile hamburger không focusable hoặc text-link bị underline sai → sửa trước STEP-03. |
| `STEP-03` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Logo 64×64 px với `rounded-xl border border-outline-variant p-2 bg-white` (RQ-04); ribbon sát góc `rounded-bl-lg` + icon (RQ-05); salary thanh rộng + icon (RQ-06); section icon `local_fire_department + circle` (RQ-07). | Source review cho className; `npm run test:unit -- public-card-truth` PASS. | Nếu ribbon render khi `badgeType !== 'urgent'` hoặc logo border nhân bản → sửa. |
| `STEP-04` | `src/domains/job-board/components/landing/best-jobs-section.tsx` | Section header icon + "Xem tất cả" link `/viec-lam` (RQ-07). | Source review cho `<Link href="/viec-lam">` và icon wrapper. | Nếu route `/viec-lam` không phải route thật → dừng, escalate. |
| `STEP-05` | `src/domains/job-board/components/landing/recruiting-projects-section.tsx` | Icon `apartment` trong vòng tròn nhẹ (RQ-08); bỏ eyebrow + bỏ sub-heading (DEC-13); copy `Cần tuyển {n} người` với `n = availableSlots` (RQ-09); logo monogram 64 giữ (DEC-12). | Source review; `rg "Top công ty|Đối tác chính thức|Cơ hội mới|hiển thị số slot thật|Dự án trọng điểm"` → 0 match. | Nếu vẫn hiển thị eyebrow hoặc copy cũ → sửa. |
| `STEP-06` | `app/(portal)/page.tsx` Hero search card (A16) | Wrapper glass → nền trắng (RQ-10). Label `text-white` → `text-on-surface`. Input `border-white/30 bg-white/95` → `border-outline-variant bg-white`. CTA giữ cam. | Source review cho wrapper className và label/input className. | Nếu label trắng trên nền trắng (fail a11y) → sửa. |
| `STEP-07` | Cập nhật fence test trong allowlist §11 OBR-02 (DEC-18) | Cho phép cập nhật: `public-ui-premium.static.test.ts` (BestJobs ribbon + salary bar + logo border), `public-ui-token-parity.static.test.ts` (className density), `marketplace-inventory.static.test.ts` (salary label style — nếu ảnh hưởng), `public-card-truth.test.ts` (Truth → BestJobsFeatured mapping). Mỗi thay đổi phải có comment giải thích. | `npm run test:unit -- public-card-truth` PASS; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0. | Nếu test fail không nằm trong baseline → dừng, báo Planner. |
| `STEP-08` | Regression check tất cả route portal | `/`, `/viec-lam`, `/viec-lam/[slug]`, `/login`, `/ve-chung-toi`, `/ctv-portal` vẫn render đúng navbar. Source review cho từng route. | Source review `app/layout.tsx` (nếu có portal layout) và verify route file. | Nếu route portal nào vỡ navbar → sửa trước khi qua STEP-09. |
| `STEP-09` | Mandatory gates (DEC-16, DEC-17) | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` baseline + 0 new failures; `npm run build` exit 0; `verify-task.ps1` PASS; `verify-handoff.ps1` PASS; `rg` truth-fence scope. | evidence file cho từng gate | Nếu gate fail → dừng, sửa; không ghi `READY_FOR_AUDIT` khi còn gate fail. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Container 1200px + padding trong border-box ở Navbar, Hero, BestJobs, Areas, Recruiting, CTV, Footer. | `rg "max-w-\[1200px\]" src/domains/job-board/components/landing/ app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx "app/(portal)/page.tsx"` ≥ 1 match cho mỗi section. Lưu `evidence/ac01-container-width.txt`. |
| `AC-02` | Navbar `h-16` (64px) | `rg "h-16" app/components/GlobalNavbar.tsx` ≥ 1 match. Lưu `evidence/ac02-navbar-height.txt`. |
| `AC-03` | Logo + menu gom cụm trái (`gap-8`); auth cụm phải. | Source review `GlobalNavbar.tsx`. Lưu `evidence/ac03-navbar-cluster.txt`. |
| `AC-04` | Login là text link (không phải outline button). | `rg "hrp-btn-outline" app/components/GlobalNavbar.tsx` → 0 match cho Login (Signup giữ nguyên). Lưu `evidence/ac04-login-textlink.txt`. |
| `AC-05` | BestJobs logo monogram 64×64 px trong `rounded-xl border border-outline-variant p-2 bg-white`. | Source review `featured-job-card.tsx`. Lưu `evidence/ac05-bestjobs-logo.txt`. |
| `AC-06` | Ribbon sát góc `rounded-bl-lg` + `local_fire_department` icon 14px. | Source review `featured-job-card.tsx`. Lưu `evidence/ac06-ribbon.txt`. |
| `AC-07` | Salary thanh rộng `rounded-xl p-3` + `payments` icon 20px; đơn vị giữ `đ/giờ`. | Source review `featured-job-card.tsx` + `page.tsx salaryLabel()`. Lưu `evidence/ac07-salary-bar.txt`. |
| `AC-08` | "Xem tất cả" link → `/viec-lam`. | `rg "href=\"/viec-lam\"" src/domains/job-board/components/landing/best-jobs-section.tsx` ≥ 1 match. Lưu `evidence/ac08-xem-tat-ca.txt`. |
| `AC-09` | Recruiting icon `apartment` trong vòng tròn; eyebrow + sub-heading đã bỏ; copy `Cần tuyển {n} người`. | Source review `recruiting-projects-section.tsx`. Lưu `evidence/ac09-recruiting-copy.txt`. |
| `AC-10` | Copy recruiting KHÔNG còn "Top công ty", "Đối tác chính thức", "Cơ hội mới", "hiển thị số slot thật", "Dự án trọng điểm". | `rg "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm" src/domains/job-board/components/landing/` → 0 match. Lưu `evidence/ac10-recruiting-truth-fence.txt`. |
| `AC-11` | Search card wrapper đổi từ glass sang nền trắng; CTA giữ cam; hero giữ nền cam; recruitment highlight giữ glass riêng. | Source review `app/(portal)/page.tsx`. Lưu `evidence/ac11-search-card-white.txt`. |
| `AC-12` | AWAITING_OWNER_LIVE_VISUAL_REVIEW (post-push, DEC-16). Tier 2 KHÔNG cần Edge/CDP/PNG/bbox. Code-side parity đã verify qua AC-01..AC-11 + AC-13. Visual parity Owner duyệt trên deployed homepage sau push. | Status marker trong HANDOFF. |
| `AC-13` | **Accessibility (giữ DEC-11 UI-03, RQ-12)**: (a) grep utility `hrp-focus` (đã có trong repo): `rg "hrp-focus" src/domains/job-board/components/landing/ app/components/Global*.tsx` (expect ≥ 1 match cho mỗi interactive component). (b) Source review: Navbar/Footer/Hero controls không có fixed width gây mobile horizontal overflow. (c) Contrast: token table trong `app/globals.css` ≥ 4.5:1 cho body, ≥ 3:1 cho large text. KHÔNG dùng `npx lighthouse`/`npx pa11y`/`npx axe-core`/`npx playwright` auto-install. | `evidence/ac13-hrp-focus.txt` + source review. |
| `AC-14` | Mandatory gates: `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run build` exit 0; `verify-task.ps1` PASS; `verify-handoff.ps1` PASS; `rg` scope check (AC-15, AC-16, AC-17). | `evidence/ac14-gates.txt`. |
| `AC-15` | Asset ảnh chỉ từ `public/images/homepage-huongb/**`; không có URL Google tạm; không có logo doanh nghiệp bị hardcode. | `rg -n "lh3\.googleusercontent\|companyName" src/ app/` → 0 match. Lưu `evidence/ac15-scope-diff.txt`. |
| `AC-16` | Dữ liệu biến thiên từ `PublicJobDto`/`PublicJobOverview`; không hardcode `17.800`, `13.000.000đ`, etc. | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` → 0 match. Lưu `evidence/ac16-truth-fence.txt`. |
| `AC-17` | Regression check: tất cả route portal (Navbar dùng chung) vẫn render đúng. | Source review `app/layout.tsx` + route file. Lưu `evidence/ac17-regression-check.txt`. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02 | AC-01 |
| RQ-02 | STEP-02 | AC-02, AC-03 |
| RQ-03 | STEP-02 | AC-04 |
| RQ-04 | STEP-03 | AC-05 |
| RQ-05 | STEP-03 | AC-06 |
| RQ-06 | STEP-03 | AC-07 |
| RQ-07 | STEP-03, STEP-04 | AC-08 |
| RQ-08 | STEP-05 | AC-09 |
| RQ-09 | STEP-05 | AC-09, AC-10 |
| RQ-10 | STEP-06 | AC-11 |
| RQ-11 | STEP-02..STEP-08 | AC-15 |
| RQ-12 | STEP-04, STEP-05, STEP-06 | AC-16 |
| RQ-13 | STEP-08 | AC-17 |
| RQ-14 | STEP-07 | AC-14 |
| RQ-15 | STEP-09 | AC-12 |
| VISUAL | (post-push, DEC-16) | AWAITING_OWNER_LIVE_VISUAL_REVIEW (AC-12) |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Text-link Login phá style của route portal khác (e.g., `/admin/jobs` đã có layout riêng). | Tier 2 source review tất cả route dùng `GlobalNavbar` (STEP-08); nếu route nào vỡ → sửa trước khi qua STEP-09. |
| `RISK-02` | Container 1200px ảnh hưởng route portal đang dùng max-width khác (e.g., `/admin/jobs` có thể dùng max-w khác). | Tier 2 source review tất cả route; đảm bảo chỉ áp dụng 1200px cho shell homepage/portal user-facing, KHÔNG ép admin route. |
| `RISK-03` | Search card nền trắng phá focus ring hoặc contrast với hero cam. | Tier 2 source review label + input + CTA contrast với `bg-white` và `bg-primary-container`. |
| `RISK-04` | Fence test (`public-ui-premium`, `public-ui-token-parity`, `public-card-truth`) fail khi đổi card style, className density, salary style. | DEC-18 mở allowlist §11 OBR-02; Tier 2 cập nhật fence theo composition mới, comment giải thích. |
| `RISK-05` | Tier 2 vô tình dùng lại "Dự án trọng điểm" copy hoặc "Foxconn 56px" assumption. | AC-10 rg truth-fence + DEC-13 + DEC-12 chặn; Tier 3 audit source review. |

## 8. Open Questions

None — Owner đã chốt 28 quyết định trong `evidence/OWNER_APPROVAL_REQUIRED.md`. Tier 1 soạn TASK A ngay theo §Quyền tiếp tục.

## 9. Planner Resolution

Tier 1 sẽ append sau review/audit.

| Round | Decision | Reason |
|---|---|---|
| Round 0 (planning) | Tier 1 soạn TASK A + skeleton B/C/D theo Tier 0 chỉ thị mới (`TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`, 10/09/2026). Commit planning `0eaf912` đã push. | Tách 2 plan UI + Admin V6; chuỗi A→B→C→D. |
| Round 1 (TBD) | Tier 2 thi công TASK A → verify-task → verify-handoff → Tier 1 trình /audit → Tier 3 FOCUSED audit → /resolve → push Git → Owner live visual review post-deploy. | Per §"Next gate" in §0. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-10 | Initial TASK A (visual polish + A16 search card) — PLAN UI thuộc 2-plan split, Plan Admin V6 tách riêng. A1–A16, B1–B13 (khóa sớm cho B) chốt từ `OWNER_APPROVAL_REQUIRED.md`. | Tier 0 chỉ thị mới tách UI và Admin V6 thành 2 plan; chuỗi A→B→C→D. |

## 11. Owner Baseline-aware Resolution (OBR)

### OBR-01 — Baseline-aware scope compliance

- `git ls-files` + `git status --porcelain` đầu round, lưu `evidence/baseline-manifest.txt` (full path + SHA + status) và `evidence/baseline-snapshot.txt` (output thô).
- Trước khi commit, `git diff --name-only` (working tree) + `git diff --staged --name-only` (index). Path nào xuất hiện KHÔNG có trong `baseline-manifest.txt` → halt.

### OBR-02 — Allowlist Sửa (paths Tier 2 được phép sửa)

| Path | Quyền |
|---|---|
| `app/components/GlobalNavbar.tsx` | Sửa |
| `app/components/GlobalFooter.tsx` | Sửa (nếu cần đồng bộ container) |
| `app/(portal)/page.tsx` | Sửa (A16 search card) |
| `src/domains/job-board/components/landing/hero.tsx` | Sửa (nếu A16 search card nằm ở đây) |
| `src/domains/job-board/components/landing/best-jobs-section.tsx` | Sửa (RQ-07 section header + "Xem tất cả") |
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Sửa (RQ-04..RQ-07) |
| `src/domains/job-board/components/landing/recruiting-projects-section.tsx` | Sửa (RQ-08, RQ-09) |
| `src/domains/job-board/components/landing/hr-monogram.tsx` | Sửa (nếu cần đồng bộ vòng nhận diện) |
| `app/globals.css` | Sửa (chỉ bổ sung class nếu thiếu) |
| `src/domains/applications/marketplace-inventory.static.test.ts` | Sửa (fence, DEC-18) |
| `src/domains/job-board/public-ui-premium.static.test.ts` | Sửa (fence, DEC-18) |
| `src/domains/job-board/public-ui-token-parity.static.test.ts` | Sửa (fence, DEC-18) |
| `src/domains/job-board/public-card-truth.test.ts` | Sửa (fence, DEC-18) |
| `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**` | Tạo/Sửa |
| `docs/tasks/hrp-v6-ui-04a-visual-polish/**` | Tạo (TASK + HANDOFF + evidence) |

Ngoài allowlist: **KHÔNG được sửa**. Tier 2 phát hiện file ngoài allowlist → halt, báo Tier 1.

### OBR-03 — Anti-scope-creep

- Tier 2 không tự ý thêm path mới vào allowlist; nếu cần, mở correction round.
- Mọi evidence file mới phải nằm trong `docs/tasks/hrp-v6-ui-04a-visual-polish/evidence/`; file ngoài đó mà không thuộc OBR-02 allowlist → halt.
