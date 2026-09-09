# TASK — `hrp-v6-ui-03-homepage-huongb-visual-parity`

> Mandate Owner: `docs/prompts/TIER1_HRP_V6_UI_03_HUONGB_VISUAL_PARITY.md` (commit `eda2602`, 09/09 20:09 ICT). Tier 1 chỉ lập contract để Owner duyệt trước khi giao Tier 2 — không tự code UI.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Work type | `DESIGN` (thay đổi JSX/class/style của homepage + Navbar + Footer + landing components) |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Spec version | `v1.2` |
| Status | `REVISION_REQUIRED` (sửa theo Owner verdict 09/09 22:03 ICT — correction round 2) |
| Planner | `Tier 1` |
| Baseline | `eda2602` (commit chứa Owner mandate) |
| In-scope roots | `app/(portal)/page.tsx`, `app/(portal)/layout.tsx`, `src/domains/job-board/components/landing/**`, `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`, `app/globals.css`, `src/styles/**` (nếu có), `public/images/homepage-huongb/**` |
| Forbidden paths | `prisma/**`, `src/domains/job-board/public.service.ts` (DTO/overview contract cố định), `src/lib/auth/**`, `src/lib/db/**`, `src/domains/job-board/apply-modal/**`, `src/domains/job-board/success-modal/**`, mọi thay đổi schema/database. Không thay đổi route `/viec-lam/{code}`. |
| Required gates | `npm run typecheck` (exit 0); `npm run test:unit -- public-card-truth` (exit 0); `npm run test:unit` (exit 1 với expected baseline set + new failure count 0 — Owner-baseline-waiver policy); `npm run build` (exit 0); `verify-task.ps1`; `verify-handoff.ps1`; visual capture desktop 1440px + mobile 390px; CDP scrollWidth=innerWidth kiểm tra horizontal overflow. |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/code → /audit → /resolve` (SỬA: hiện đang `DRAFT`, phải qua Owner duyệt trước khi `/code`) |

> Lane rule: schema/migration/RLS/auth/permission/PII/money/infra/production/shared toolchain luôn `CRITICAL`. Task này chỉ đổi JSX/class/style của `/` và shell (Navbar/Footer) — không chạm schema, auth, permission, money.

## 1. Outcome

### 1.1 User-visible outcome

Trang `/` sau khi thi công đạt visual parity với `scratch/new-ui-HuongB-ref-2026-09-07/code.html` ở mức side-by-side/overlay được, đồng thời giữ nguyên hành vi thật:

- Thứ tự section đúng bảy khối theo code.html (theo thứ tự từ trên xuống):
  1. **TopNavBar** — năm điều hướng chính với trạng thái link rõ ràng (P0-02 fix — KHÔNG dùng anchor element với href="#" cho control disabled vì vẫn điều hướng lên đầu trang):
     - `Việc làm` → anchor element href="/" (active, `border-bottom-2 border-primary-container`).
     - `Công ty` → button element với attributes type=button, aria-disabled=true, aria-describedby="nav-disabled-tooltip", title="Đang phát triển", tabindex=-1 (route chưa tồn tại), với span element id="nav-disabled-tooltip" chứa text "Đang phát triển" ẩn qua CSS. KHÔNG dùng anchor element với href="#".
     - `Về HRP Việt Nam` → cùng pattern button disabled.
     - `Tin tức` → cùng pattern button disabled.
     - `Cộng tác viên` → anchor element href="/#register" (anchor hash tại `/`, scroll đến section CTV qua id="register").
     - CTA `Đăng nhập` / `Đăng ký` ở ngoài cùng — cả hai dùng button element với attributes type=button, aria-disabled=true, title="Đang phát triển" (Owner verdict P0-02: KHÔNG phát minh `?register=1` modal vì chưa có).
  2. **Hero full-width orange** — eyebrow `Cùng tìm kiếm`, H1 `Công việc mơ ước của bạn` (token `text-headline-xl`), search card hai tầng (keyword input + 2 select city/salary theo demo), recruitment highlight dạng glass (`backdrop-blur-md`, `bg-white/10`) ở cột phải desktop ≥ lg.
  3. **Việc làm tốt nhất** — heading `Việc làm tốt nhất` với icon badge, lưới ba cột job-card; mỗi card có ribbon `Tuyển gấp` top-right (nếu có badge), logo công ty **64×64 px**, salary pill `bg-surface-container-low`, hover đổi màu tiêu đề sang `primary-container`. Bind `PublicJobOverview.newest` (ưu tiên) hoặc `PublicJobOverview.topPaid` (fallback khi `newest` rỗng).
  4. **Việc làm theo khu vực** — bốn image-card dùng asset pack `public/images/homepage-huongb/industrial-location-0{1..4}.webp`, height **192 px** (mobile giữ `aspect-ratio: 4/3`), gradient `from-black/80 via-black/20 to-transparent`, tiêu đề trắng + count badge `bg-white/20 backdrop-blur-sm`.
  5. **Dự án đang tuyển** — 4-col card (mobile 2-col, md 4-col), lấy dữ liệu từ `PublicJobOverview.newest`/`topPaid` (đã gộp, khử trùng lặp theo `recruiter`), logo **HRP monogram** (component ``HrMonogram` (component)` 64×64 px, viền `border-outline-variant`, nền `bg-surface-container-low`), tên project = `recruiter` + `positionCount` slot đang mở, KHÔNG pill `Đối tác chính thức`, KHÔNG tên/logo công ty thật. Ẩn section nếu merge rỗng.
  6. **Chương trình Cộng tác viên** — 2-col text + image (`referral-team.webp`), bullet list 4 dòng, CTA `Đăng ký cộng tác viên` (link anchor element href="/#register" anchor hash scroll xuống chính section này, KHÔNG mở route mới).
  7. **Footer 4-col** — cột đầu rộng (mô tả HRP Việt Nam), ba cột link theo DEMO. Tất cả anchor cũng được khóa trạng thái (link chết mở `aria-disabled="true"`).

- Hành vi thật giữ nguyên: `fetch('/api/jobs')`, facets (`keyword/area/shift`), phân trang/load-more, mở chi tiết, ứng tuyển, trạng thái loading/error/empty, dữ liệu lương/slot/deadline từ `PublicJobDto` — không bịa số liệu.

### 1.2 Non-goals

- Không thay schema/database; không thay `src/domains/job-board/public.service.ts` (DTO và overview contract cố định).
- Không render tên `Top công ty hàng đầu`, pill `Đối tác chính thức`, tên công ty hay logo công ty ở section 5 (`Dự án đang tuyển`) — DEC-04 ràng buộc đến khi có public data contract + quyền công khai.
- Không hardcode con số mẫu như `17.800 việc làm`, mức thu nhập referral `+10.000.000đ` / `+50.000.000đ`, hay phúc lợi không có nguồn (Owner mandate §9). Nội dung biến thiên phải lấy từ API hoặc copy đã công bố.
- Không tạo link chết: bất kỳ menu nào chưa có route thật phải dùng button element với attributes type=button, aria-disabled=true, title="Đang phát triển", tabindex=-1 thay vì anchor element với href="#" (Owner verdict P0-02 — anchor "#" vẫn điều hướng lên đầu trang). CTA `Đăng nhập`/`Đăng ký` cũng disabled vì chưa có flow đăng ký. Section CTV CTA dùng anchor hash "/#register" (scroll xuống chính section) thay vì phát minh modal.
- Không sao chép URL Google tạm trong HTML demo (Owner mandate §7). Dùng asset nội bộ `public/images/homepage-huongb/**` đã được Owner duyệt.
- Không sửa trang chi tiết `/viec-lam/{code}`; không sửa admin jobs; không sửa auth/apply modal.
- Không tự ý lộ bảng khách hàng nội bộ ở section 5 (DEC-04).
- Không mở lại hoặc đổi verdict của UI-02 (đã ACCEPTED, commit `0ff27fc`).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `scratch/new-ui-HuongB-ref-2026-09-07/code.html` (530 dòng) | source of truth về bố cục, màu, typography, responsive. |
| `EV-02` | `scratch/new-ui-HuongB-ref-2026-09-07/DESIGN.md` | đặc tả design tokens (color, typography, rounded, spacing) chuẩn. |
| `EV-03` | `public/images/homepage-huongb/industrial-location-0{1..4}.webp`, `referral-team.webp` | asset pack Owner đã duyệt (mandate §12); Tier 2 mapping theo thứ tự facet/khu vực nhưng KHÔNG mô tả ảnh như bằng chứng địa lý chính xác. |
| `EV-04` | `src/domains/job-board/public.service.ts` (interfaces `PublicJobDto`, `PublicJobFacets`, `PublicJobOverview`) | data contract cố định — card không tự đổi kiểu, không tự tính lương, không bịa số. |
| `EV-05` | `app/globals.css` (đoạn `--text-headline-xl: 32px`, `--primary-container`, `--surface-container-lowest`) | semantic tokens đã có sẵn từ UI-02 / Tier 1 v1.4 — Tier 2 dùng, không định nghĩa lại. |
| `EV-06` | `app/(portal)/page.tsx` (UI-02 rút gọn: 6 khối Hero+search-card, BestJobs, Areas chip, ReferralInviteStrip 1-row) | trạng thái hiện tại — cần kế thừa logic data/loading/empty, thay phần JSX/class. |
| `EV-07` | `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx` | shell hiện tại — thay để khớp cấu trúc nav 5-link + footer 4-col. |
| `EV-08` | `app/(portal)/page.tsx` line 667 (`text-headline-xl` đã được Tier 1 thêm vào Hero H1 ở UI-02 R5) | bằng chứng semantic-token usage đang đúng — UI-03 mở rộng thêm breakpoint/typography chứ không revert. |
| `EV-09` | `evidence/baseline-manifest.txt`, `evidence/baseline-snapshot.txt` (Tier 2 tạo trong `/code`) | baseline OBR-01 cho `git status --porcelain` so sánh trước/sau round này. |
| `EV-10` | `evidence/screenshots/desktop-actual.png` + `mobile-actual.png` (UI-02 đã chụp 1440×900 + 390×844) | baseline visual; UI-03 phải so sánh với reference qua overlay/visual diff, không chỉ khẳng định. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | `code.html` là source of truth về bố cục, thứ tự section, tỷ lệ, màu, typography, khoảng trắng, card, ribbon, shadow, phong cách responsive (Owner mandate §1). Homepage hiện tại chỉ là source of truth cho logic và dữ liệu. | `CHOSEN` |
| `DEC-02` | Bảy section theo đúng thứ tự code.html (Navbar → Hero → Việc làm tốt nhất → Việc làm theo khu vực → **Dự án đang tuyển** → CTV → Footer) — consistency #2: KHÔNG gọi section 5 là "Top công ty" ở bất kỳ chỗ nào trong contract. Tách thành các file landing component nhưng giữ một owner duy nhất cho cấu trúc homepage (Owner mandate §3 — không hai form search, không hai danh sách job). | `CHOSEN` |
| `DEC-03` | Xóa khỏi bề mặt cuối các dấu vết của UI-02 (Owner mandate §5): Hero dạng card inset bo tròn, Featured card trắng đơn giản, job grid hai cột trong khối xám lớn, Areas chip text-only header vàng, referral strip một hàng, footer một hàng. | `CHOSEN` |
| `DEC-04` | **"Dự án đang tuyển" (thay "Top công ty hàng đầu")** — Owner đã chốt phương án (b) có ràng buộc (ký tại `evidence/owner-dec-04.md`, 09/09 21:28 ICT) và P0-01 fix (Owner verdict 09/09 22:03 ICT): (1) Section giữ đúng hình thức 4 card từ demo HTML, KHÔNG render tên `Top công ty hàng đầu`, `Đối tác chính thức`, tên công ty hay logo công ty khi chưa có public data contract + quyền công khai; (2) đổi ngữ nghĩa thành `Dự án đang tuyển`; (3) lấy tối đa 4 job đầu từ `PublicJobOverview.newest` (fallback `topPaid`), mỗi card là 1 job với `job.id` (key), `job.title` (tên project), `job.availableSlots` (slot); KHÔNG group theo `recruiter` vì adapter hiện gán cùng giá trị "Tuyển dụng qua HRPartner" → chỉ tạo được 1 card; (4) dùng logo HRP monogram trung tính; (5) nếu không có dữ liệu → ẩn cả section. "Top công ty hàng đầu" thật tách thành task riêng sau khi Owner duyệt danh sách đối tác + logo + quyền công khai. | `CHOSEN` |
| `DEC-05` | Asset pack `public/images/homepage-huongb/**` đã có; Tier 2 map `industrial-location-0{1..4}.webp` theo thứ tự facet/khu vực (mandate §12). KHÔNG mô tả ảnh như bằng chứng địa lý chính xác. | `CHOSEN` |
| `DEC-06` | Floating green badges `+10.000.000đ` / `+50.000.000đ` trong section CTV bị XÓA khỏi demo HTML vì hardcode (Owner mandate §9). Section CTV chỉ giữ 4 bullet + CTA. | `CHOSEN` |
| `DEC-07` | Hành vi thật giữ nguyên 100%: `fetch('/api/jobs')`, facets, phân trang, load-more, mở chi tiết, ứng tuyển, loading/error/empty, dữ liệu lương/slot/deadline từ `PublicJobDto` (Owner mandate §4). Không thay schema, không bịa dữ liệu để giống mockup. | `CHOSEN` |
| `DEC-08` | Audit mode = `FOCUSED` (changed surface giới hạn ở `/` + Navbar + Footer + landing components) — không kéo lại audit toàn repo (Owner mandate §6). | `CHOSEN` |
| `DEC-09` | Mobile là bản reflow đúng của cùng thiết kế; KHÔNG sao chép lỗi overflow/cắt chữ trong `mobile-reference.png` cũ (Owner mandate §2). CDP `scrollWidth nho hon hoac bang innerWidth` là gate bắt buộc ở mobile 390px. | `CHOSEN` |
| `DEC-10` | Test cũ (`marketplace-inventory.static.test.ts`, `public-ui-premium.static.test.ts`, `public-ui-token-parity.static.test.ts`, `public-card-truth.test.ts`) đang ghim composition UI-02 — UI-03 mở scope để Tier 2 được phép cập nhật fence test theo composition mới, không phải chữa test ngoài hợp đồng (Owner mandate §3 + §5 + §6). Cập nhật nằm trong `§11 OBR-02 allowlist Sửa`. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Homepage `/` đạt visual parity với `code.html` ở mức section-by-section, không phải whole-page pixel match. Mỗi section được đối chiếu độc lập dựa trên: bounding box (width, height, padding), spacing theo token (`section-gap`, `container-margin`, `gutter`, `card-padding`), typography scale (`text-headline-xl/lg/md`, `body-lg/md`, `label-md/sm`), colors theo token, và card hierarchy (logo kích thước rõ bằng px, ribbon, salary pill). Thứ tự 7 section giữ nguyên. |
| `RQ-02` | Hero full-width orange (không còn inset card bo tròn như UI-02); eyebrow `Cùng tìm kiếm` ở `text-headline-md` + `text-secondary-fixed`; H1 `Công việc mơ ước của bạn` dùng token `text-headline-xl`; search card hai tầng (keyword input + 2 select city/salary theo demo); recruitment highlight dạng glass (`backdrop-blur-md`, `bg-white/10`) ở cột phải desktop ≥ lg. Section này dùng đúng 3 bộ lọc theo demo (keyword + city + salary); KHÔNG tuyên bố "giữ UI facet `shift`" vì search UI homepage không có control `shift`. |
| `RQ-03` | "Việc làm tốt nhất" — lưới 3-col (mobile 1-col, md 2-col, lg 3-col); mỗi card có logo công ty **64×64 px** (`w-16 h-16`), tiêu đề `text-headline-md`, công ty `text-primary-container`, địa điểm icon, salary pill `bg-surface-container-low` với `text-primary-container` đậm; ribbon `Tuyển gấp` top-right (chỉ render khi `badgeType === 'urgent'`), `bg-primary-container text-white`. Bind `PublicJobOverview.newest` (ưu tiên) → fallback `PublicJobOverview.topPaid`. Kích thước logo ghi rõ 64×64 px, KHÔNG dùng "16×16" hay "height ~48" (Owner verdict §10). |
| `RQ-04` | "Việc làm theo khu vực" — 4 image-card, mỗi card dùng asset `public/images/homepage-huongb/industrial-location-0{1..4}.webp` (mapping theo thứ tự `areaCounts`), **height 192 px** desktop (mobile dùng `aspect-[4/3]`), gradient `from-black/80 via-black/20 to-transparent`, tiêu đề trắng + count badge `bg-white/20 backdrop-blur-sm` lấy từ `areaCounts` (số thật). Nhấn vào card dùng `onPick(area)` mở `?area=` query giống UI-02. Kích thước ghi rõ 192 px, KHÔNG dùng "height ~48" mơ hồ (Owner verdict §10). |
| `RQ-05` | **"Dự án đang tuyển"** (theo DEC-04, P0-01) — 4-col card (mobile 2-col, md 4-col), heading `Dự án đang tuyển` với icon badge. Lấy **tối đa 4 job/project thật** đầu tiên từ `PublicJobOverview.newest`, nếu rỗng thì fallback `PublicJobOverview.topPaid`; mỗi card khử trùng theo `job.id` (mỗi job là một card, KHÔNG group theo `recruiter` vì adapter hiện gán cùng giá trị `Tuyển dụng qua HRPartner`). Mỗi card gồm: logo HRP monogram **64×64 px** (component ``HrMonogram` (component)`, viền `border-outline-variant`, nền `bg-surface-container-low`), **tên project = `job.title`** (chuẩn hoá từ title thật, ví dụ `Nhân viên kỹ thuật`), **slot = `job.availableSlots`** (số thật từ DTO), KHÔNG pill `Đối tác chính thức`, KHÔNG logo/tên công ty thật. Nếu cả `newest` + `topPaid` rỗng → toàn section ẩn, không render header rỗng. Tier 2 không được tự ý dùng field `recruiter` làm tên project vì field đó chưa có schema công khai. |
| `RQ-06` | "Chương trình Cộng tác viên" — 2-col (mobile stack), text bên trái: heading `text-headline-xl text-primary-container`, sub-heading `text-headline-md text-secondary`, 4 bullet dùng `check_circle`, CTA `Đăng ký cộng tác viên` (link anchor element href="/#register" anchor hash tại `/`, scroll xuống section element id="register" chính section này, KHÔNG mở route mới, KHÔNG phát minh modal đăng ký). Ảnh `referral-team.webp` `aspect-[4/3]` ở cột phải, có decorative blur halo. KHÔNG render floating green badges (DEC-06). |
| `RQ-07` | Footer 4-col: cột 1-2 (md) là mô tả HRP Việt Nam rộng `max-w-md`; cột 3-4 là hai cột link `HRP Việt Nam` (Về chúng tôi / Điều khoản / Chính sách bảo mật và Liên hệ / Cộng tác viên). Dưới cùng là divider + copyright. Mọi anchor chưa có route thật phải có `aria-disabled="true"` + tooltip "Đang phát triển". |
| `RQ-08` | TopNavBar 5-link với trạng thái link rõ ràng theo RQ §1 (item 1, P0-02 fix): `Việc làm` active anchor element href="/", `Cộng tác viên` anchor element href="/#register" (anchor hash), các link `Công ty`/`Về HRP Việt Nam`/`Tin tức` dùng button element với attributes type=button, aria-disabled=true, title="Đang phát triển", tabindex=-1 (KHÔNG anchor element với href="#"); CTA `Đăng nhập` + `Đăng ký` cũng dùng button element với attributes type=button, aria-disabled=true, title="Đang phát triển". Mobile: collapse thành hamburger (≥ md hiện link list). |
| `RQ-09` | Asset ảnh CHỈ dùng từ `public/images/homepage-huongb/**` đã Owner duyệt. KHÔNG tham chiếu URL Google tạm trong HTML demo. |
| `RQ-10` | Toàn bộ dữ liệu biến thiên (số job, lương, deadline, tỉnh/thành, badge, recruiter, slot) lấy từ `PublicJobDto`/`PublicJobOverview` qua `/api/jobs`. KHÔNG hardcode `17.800`, `13.000.000đ`, `+10.000.000đ`, `+50.000.000đ` hoặc bất kỳ con số mẫu nào. |
| `RQ-11` | **Visual capture + section-level diff** (THAY vì whole-page ≤ 5% — Owner verdict §4): chụp `desktop-actual.png` 1440×900 + `mobile-actual.png` 390×844 của `/` qua Playwright/Chromium headless; render `code.html` ở cùng viewport thành `desktop-reference.png` + `mobile-reference.png`. Cho mỗi section (Nav, Hero, BestJobs, Areas, Recruiting, CTV, Footer): đo bounding box (`.getBoundingClientRect()` ở cả actual + reference), so sánh width/height/padding với tolerance ±4 px; mask vùng dữ liệu động (ảnh khu vực, logo công ty, lương, count badge) trước khi so sánh layout; vùng text và ảnh động KHÔNG tính pixel diff. CDP `window.innerWidth === documentElement.scrollWidth` ở mobile 390 px (gate về horizontal overflow). Bắt buộc Owner xem ảnh trước khi PASS. |
| `RQ-12` | **Accessibility check** (Owner verdict P0-04): KHÔNG dùng `npx playwright`/`npx lighthouse`/`npx pa11y`/`npx axe-core` auto-install — Tier 2 KHÔNG được tự tải dependency. Dùng Edge DevTools Protocol (CDP) đã chứng minh hoạt động ở UI-02: `cdp-measure-mobile.ps1` (đo scrollWidth/innerWidth, focusable elements qua `Runtime.evaluate`); Tier 2 cũng dùng grep rule thủ công đối chiếu utility `hrp-focus` (đã có trong repo) — KHÔNG phải regex trên `focus:`. Visual capture dùng Edge CDP thay vì Playwright (`msedge.exe --remote-debugging-port` + `Page.captureScreenshot` qua CDP). Nếu thật sự cần Playwright/Lighthouse, mở scope qua task mới để cài dependency đúng quy trình. |
| `RQ-13` | Hành vi thật giữ nguyên: `fetch('/api/jobs')`, facets ở trang chi tiết (`/viec-lam/{code}` — ngoài homepage, không bị ảnh hưởng bởi task này), phân trang, load-more, mở chi tiết, ứng tuyển, loading/error/empty. Modal `ApplyModal`/`SuccessModal` không bị sửa. Homepage search UI chỉ có 3 control theo demo (keyword + city + salary); API vẫn hỗ trợ `shift` ở chỗ khác nhưng KHÔNG thêm control `shift` trên hero. |

### 4.2 Scope boundaries

- **In:**
  - `app/(portal)/page.tsx` — thay toàn bộ JSX/class cho 7 section, giữ logic data/loading/empty.
  - `app/(portal)/layout.tsx` — không đổi cấu trúc nhưng dùng Navbar/Footer mới.
  - `app/components/GlobalNavbar.tsx` — mở rộng thành 5-link + CTA, hamburger ở mobile.
  - `app/components/GlobalFooter.tsx` — chuyển thành 4-col + mô tả HRP Việt Nam.
  - `src/domains/job-board/components/landing/hero.tsx` — bỏ rounded-3xl card inset, đổi thành full-width section.
  - `src/domains/job-board/components/landing/best-jobs-section.tsx` — đổi wrapper, hỗ trợ 3-col grid.
  - `src/domains/job-board/components/landing/areas-section.tsx` — chuyển chip-text-only sang image-card grid (dùng asset pack).
  - `src/domains/job-board/components/landing/referral-strip.tsx` (và `referral-invite-strip.tsx`) — đổi sang 2-col layout có ảnh.
  - `src/domains/job-board/components/landing/recruiting-projects-section.tsx` (mới) — section Dự án đang tuyển (DEC-04, theo RQ-05), logo HRP monogram, không có dữ liệu → ẩn section.
  - `src/domains/job-board/components/landing/recruitment-highlight.tsx` (mới) — glass panel bên phải Hero.
  - `src/domains/job-board/components/landing/featured-job-card.tsx` (mới) — card 64×64 px logo + ribbon `Tuyển gấp`.
  - `src/domains/job-board/components/landing/area-image-card.tsx` (mới) — image card 192 px overlay + count badge.
  - `src/domains/job-board/components/landing/hr-monogram.tsx` (mới) — component monogram HRP 64×64 px, viền `border-outline-variant`, nền `bg-surface-container-low`.
  - `app/globals.css` — bổ sung class tailwind bị thiếu (vd `bg-primary-fixed-dim`, `backdrop-blur-md`, `text-headline-xl-mobile`) nếu cần; KHÔNG xóa token hiện có.
  - Fence tests trong allowlist §11 OBR-02.
  - `evidence/baseline-{manifest,snapshot}.txt`, `evidence/new-manifest.txt` (OBR-01).
  - `evidence/ac07-{actual-desktop,actual-mobile,cdp-measure,overlay-diff}.png/txt` (visual evidence).

- **Out:**
  - `prisma/**`, `src/domains/job-board/public.service.ts` (DTO/overview cố định).
  - `src/lib/auth/**`, `src/lib/db/**`.
  - `src/domains/job-board/apply-modal/**`, `src/domains/job-board/success-modal/**`.
  - Route `/viec-lam/{code}`, `/admin/jobs`, bất kỳ trang công khai/riêng tư nào ngoài `/`.
  - Mọi thay đổi schema/database/seed production; chỉ dùng fixture test (RQ-12 nói rõ).
  - UI-02 verdict đã chốt (commit `0ff27fc`); không mở lại hoặc đổi.

- **Allowed task artifacts:** `docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/**`.

### 4.3 Domain boundaries

- **Data/state:** Dùng `PublicJobDto`, `PublicJobFacets`, `PublicJobOverview` từ `public.service.ts`. KHÔNG cast lỏng kiểu, KHÔNG bịa entry khi mảng rỗng (mỗi section tự ẩn khi input rỗng, không chào tiêu đề trống). Cho section 5 (Dự án đang tuyển) tuân thủ DEC-04 — lấy `job.id`/`job.title`/`job.availableSlots` thật từ `PublicJobOverview.newest` (fallback `topPaid`), KHÔNG tự ý dùng field `recruiter`.
- **Permission/security:** KHÔNG đổi auth, middleware, RLS. Section trên `/` là trang công khai, không cần đăng nhập. Apply flow vẫn qua `ApplyModal` không bịa số điện thoại/email.
- **Interface/API:** KHÔNG đổi `app/api/jobs/route.ts` schema trả về. Nếu cần thêm trường cho Top công ty, **chặn** — phải qua Owner vì chạm API contract.
- **Migration/rollback:** N/A — không migration.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline capture | Tier 2 chạy `git status --porcelain` + `git rev-parse HEAD` trong CÙNG session execution round (KHÔNG dùng `git checkout eda2602` để đo baseline — main đang thi công sẽ vỡ working tree). Baseline commit = commit cuối cùng đặt task thành `READY_FOR_EXECUTION` (sẽ được Tier 1 ghi vào HANDOFF §0 khi chuyển status). Tier 2 ghi `evidence/baseline-{manifest,snapshot}.txt` và `evidence/baseline-commit.txt` chứa output `git rev-parse HEAD` ngay sau khi `/code` bắt đầu. Main tại review đang sạch, không hardcode số file lạ. | diff `git status` vs baseline; `git rev-parse HEAD` chính là baseline commit | Nếu `git status` lệch với scope task này (file ngoài allowlist xuất hiện) → dừng, báo Planner. |
| `STEP-02` | `app/components/GlobalNavbar.tsx` + `GlobalFooter.tsx` | Thay 5-link nav + CTA + hamburger mobile; footer 4-col. Render cùng layout `(portal)/layout.tsx`. | CDP screenshot navbar (desktop + mobile hamburger mở) | Nếu nav hiện đúp CTA hoặc hamburger không focusable → sửa trước khi qua STEP-03. |
| `STEP-03` | `src/domains/job-board/components/landing/hero.tsx` + `recruitment-highlight.tsx` (mới) | Hero full-width orange, eyebrow `Cùng tìm kiếm`, H1 `text-headline-xl`, search card 2 tầng (RQ-02). | CDP screenshot Hero desktop 1440 + mobile 390. | Nếu H1 tràn phải hoặc search card không focusable → sửa trước khi qua STEP-04. |
| `STEP-04` | `best-jobs-section.tsx` + `featured-job-card.tsx` (mới) | Lưới 3-cột, ribbon `Tuyển gấp`, salary pill, hover đổi màu tiêu đề. Bind `PublicJobOverview.newest`/`topPaid` (consistency #1 — KHÔNG dùng `PublicJobDto`). | Edge CDP screenshot BestJobs; `npm run test:unit -- public-card-truth` PASS. | Nếu ribbon hiện khi `badgeType !== 'urgent'` hoặc lưới 2-col ở lg → sửa. |
| `STEP-05` | `areas-section.tsx` + `area-image-card.tsx` (mới) | 4 image-card dùng `industrial-location-0{1..4}.webp`, gradient overlay, count badge từ `areaCounts`. Mapping theo thứ tự facet; click mở `?area=`. | CDP screenshot Areas; click flow mở `/viec-lam?...&area=`. | Nếu ảnh bị lệch khung hoặc count badge hiển thị 0 → sửa. |
| `STEP-06` | `recruiting-projects-section.tsx` (mới) + `hr-monogram.tsx` (mới) | Section "Dự án đang tuyển" theo RQ-05 (P0-01 fix): lấy tối đa 4 job đầu từ `PublicJobOverview.newest` (fallback `topPaid`); mỗi card = 1 job với `job.id` làm key, tên project = `job.title`, slot = `job.availableSlots`. KHÔNG dùng `recruiter` làm tên project. Dùng ``HrMonogram` (component)` (KHÔNG pill Đối tác, KHÔNG logo/tên công ty). Ẩn section nếu cả 2 list rỗng. | CDP screenshot section; `rg "Top công ty|Đối tác chính thức" src/domains/job-board/components/landing/` → 0 match; `rg "recruiter" src/domains/job-board/components/landing/recruiting-projects-section.tsx` → 0 match; `npm run typecheck` PASS. | Nếu vẫn hiển thị "Top công ty" / pill Đối tác, hoặc section render trùng key, hoặc tên project dùng `recruiter` → dừng, sửa. |
| `STEP-07` | `referral-strip.tsx` + `referral-invite-strip.tsx` | 2-col text + ảnh `referral-team.webp`, 4 bullet, CTA full-width, decorative blur halo. | CDP screenshot; `public-ui-premium.static.test.ts` (sau khi cập nhật fence). | Nếu ảnh vỡ khung hoặc halo che chữ → sửa. |
| `STEP-08` | `app/(portal)/page.tsx` | Lắp ráp 7 section theo thứ tự DEC-02; giữ logic data/loading/empty/facets từ UI-02. | typecheck exit 0; CDP full-page desktop + mobile; `scrollWidth not greater than innerWidth`. | Nếu typecheck fail hoặc scrollWidth > innerWidth → dừng, sửa. |
| `STEP-09` | Cập nhật fence test trong allowlist §11 OBR-02 (DEC-10) | Cho phép cập nhật `marketplace-inventory.static.test.ts` (facets), `public-ui-premium.static.test.ts` (panel class, focus ring, aria), `public-ui-token-parity.static.test.ts` (typography scale mới), `public-card-truth.test.ts` (Truth → BestJobsFeatured mapping). | `npm run test:unit -- public-card-truth` PASS; `npm run test:unit` exit 1 + 0 new failure. | Nếu test cũ fail không nằm trong baseline 3 → dừng, báo Planner. |
| `STEP-10` | **Section-level diff (consistency #4+#5)** | Tier 2 dùng Edge CDP chụp `desktop-actual.png` 1440×900 + `mobile-actual.png` 390×844 của `/` qua `Page.captureScreenshot` (UI-02 đã chứng minh, KHÔNG dùng Playwright auto-install); render `code.html` ở cùng viewport thành `desktop-reference.png` + `mobile-reference.png` (mở `file://` qua Edge). Cho MỖI section cấp cao (`[data-section]`): lấy `getBoundingClientRect()` ở cả actual + reference, so sánh width (height chỉ so với reference tĩnh ở những section không có text động: Nav, Hero CTA form, Areas, Recruiting, Footer — KHÔNG so height của BestJobs/CTV vì nội dung phụ thuộc dữ liệu thật), padding với tolerance ±4 px; mask vùng dữ liệu động (ảnh khu vực, logo công ty, lương, count badge, job titles) trước khi so sánh layout. Bổ sung 1 fixture xác định `evidence/fixture-recruiting.json` chứa 4 job với id/title/slots cố định để chạy dữ liệu thật kiểm truth/overflow (Owner consistency #5). Ghi `evidence/ac02-section-bbox.txt` cho từng section (Nav/Hero/BestJobs/Areas/Recruiting/CTV/Footer); fixture-data check ghi `evidence/ac02-data-fixture.txt`. | 7 PNG/section hợp lệ + 1 PNG fixture-data; `evidence/ac02-section-bbox.txt` PASS (width ≤ 4 px lệch, height chỉ check section không động); Edge CDP `window.innerWidth=390, scrollWidth not greater than innerWidth`. | Nếu section nào lệch width > 4 px, hoặc horizontal overflow, hoặc fixture-data có truth mismatch → dừng, sửa. |
| `STEP-11` | Mandatory gates | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` exit 1 + 0 new failure (Owner-baseline-waiver); `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS. | evidence file cho từng gate | Nếu gate nào fail → dừng, sửa; không ghi `READY_FOR_AUDIT` khi còn gate fail. |
| `STEP-12` | Owner visual sign-off | Tier 2 xin Owner xem ảnh desktop + mobile, ký PASS trước khi Tier 3 focused audit. | `evidence/owner-signoff.md` (≥ 5 dòng, Verdict: PASS) | Nếu Owner FAIL → mở correction round, không tự sang audit. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Bảy section cấp cao theo đúng thứ tự code.html (Navbar → Hero → Việc làm tốt nhất → Việc làm theo khu vực → **Dự án đang tuyển** → CTV → Footer). Tier 2 gắn `data-section="nav|hero|bestjobs|areas|recruiting|ctv|footer"` cho MỖI khối cấp cao (KHÔNG query toàn bộ `section, footer, nav` vì Navbar/Footer có thể chứa nav lồng nhau — Owner consistency #6). | Edge CDP `Runtime.evaluate` chạy `document.querySelectorAll('[data-section]')` rồi so khớp 7 khối theo thứ tự đã khai, ghi `evidence/ac01-section-order.txt`. |
| `AC-02` | Section-level visual parity (Owner verdict §4 + P0-04): Mỗi section cấp cao (7 khối: Nav, Hero, BestJobs, Areas, Recruiting, CTV, Footer) ở desktop 1440×900 + mobile 390×844 có bounding box **chỉ width/height** (KHÔNG so height section có text động — Owner consistency #5) chênh ≤ 4 px so với reference tĩnh `code.html` ở cùng viewport; dữ liệu động (job titles, salary, count, slot) được mask bằng fixture xác định `evidence/fixture-recruiting.json` chứa 4 job với id/title/slots cố định. Tier 2 dùng Edge CDP `Runtime.evaluate` lấy `getBoundingClientRect()` từng section ở cả actual (`localhost:3000`) + reference (file `code.html` qua `file://`); KHÔNG dùng `npx playwright` auto-install. | `powershell scripts/section-bbox-cdp.ps1 -Viewport desktop` và `powershell scripts/section-bbox-cdp.ps1 -Viewport mobile` ghi `evidence/ac02-section-bbox.txt` + 4 PNG (desktop/mobile × actual/reference). |
| `AC-03` | Hành vi thật giữ nguyên: `fetch('/api/jobs')` thành công với cùng DTO UI-02; phân trang, load-more, mở chi tiết, ứng tuyển đều hoạt động; modal ApplyModal/SuccessModal không bị sửa. Homepage search UI CHỈ có 3 control (keyword + city + salary) — không có control `shift`. | `curl -fs http://localhost:3000/api/jobs?keyword=test&area=B%E1%BA%AFc+Ninh` lưu `evidence/ac03-real-behavior.txt`; `rg "shift" src/domains/job-board/components/landing/hero.tsx` → 0 match. |
| `AC-04` | Mobile 390×844 không horizontal overflow: `window.innerWidth === document.documentElement.scrollWidth`; không cắt chữ, không tràn. Tier 2 dùng Edge CDP `Runtime.evaluate` (đã chứng minh ở UI-02), KHÔNG dùng Playwright auto-install. | `powershell scripts/cdp-measure-mobile.ps1` ghi `evidence/ac04-cdp-measure.txt` (viewport 390×844 + deviceScaleFactor=1, in ra `window.innerWidth`, `scrollWidth`, `hasHorizontalScroll`). |
| `AC-05` | Asset ảnh chỉ từ `public/images/homepage-huongb/**`; không có URL Google tạm từ demo; không có logo doanh nghiệp bị hardcode. | `rg -n "lh3\.googleusercontent|companyName" src/ app/ docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt` (ghi output từ `rg` vào file; expect 0 match ngoài allowlist). |
| `AC-06` | Toàn bộ dữ liệu biến thiên (số job, lương, deadline, tỉnh/thành, badge, recruiter, slot) từ `PublicJobDto`/`PublicJobOverview`; không có con số mẫu hardcode như `17.800`, `13.000.000đ`, `+10.000.000đ`, `+50.000.000đ`. | `rg -n "17\.800|13\.000\.000|\+10\.000\.000|\+50\.000\.000|10\.000\.000 VNĐ|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` ghi `evidence/ac06-truth-fence.txt` (expect 0 match). |
| `AC-07` | Section "Dự án đang tuyển" render đúng cấu trúc theo DEC-04 + RQ-05 (P0-01 fix): heading `Dự án đang tuyển`; tối đa 4 card lấy từ `PublicJobOverview.newest` (fallback `topPaid`); mỗi card dùng `job.id` làm key với `job.title` và `job.availableSlots`; KHÔNG tên "Top công ty", KHÔNG pill "Đối tác chính thức", KHÔNG logo/tên công ty thật, KHÔNG group theo `recruiter`; ẩn section nếu cả 2 list rỗng. | `node scripts/section-recruiting-check.mjs` (Playwright DOM check section 5: đếm card ≤ 4, mỗi card có data-testid bắt đầu bằng `recruiting-card-` + `job.id`; kiểm KHÔNG có text "Top công ty" / "Đối tác chính thức", img alt không chứa tên công ty, text trong card KHÔNG chứa "Tuyển dụng qua HRPartner") ghi `evidence/ac07-recruiting-check.txt`. |
| `AC-08` | Visual capture: 4 PNG main (`desktop-actual.png`, `desktop-reference.png`, `mobile-actual.png`, `mobile-reference.png`) + 7 PNG/section × 2 viewport (Nav/Hero/BestJobs/Areas/Recruiting/CTV/Footer ở desktop + mobile) đều hợp lệ (magic bytes PNG, đúng kích thước viewport). Tier 2 chụp qua Edge CDP `Page.captureScreenshot` (UI-02 đã chứng minh), KHÔNG dùng Playwright auto-install. Bổ sung 1 ảnh `desktop-data-fixture.png` chạy với fixture `evidence/fixture-recruiting.json` để kiểm truth/overflow trên dữ liệu thật (Owner consistency #5). | `powershell scripts/section-screenshots-cdp.ps1` chụp 4 main + 14 section PNG qua Edge CDP, ghi `evidence/ac08-screenshots.txt` (expect ≥ 19 file: 4 main + 14 section + 1 fixture-data). |
| `AC-09` | Mandatory gates: `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` exit 1 với **baseline đo trong execution round ngay tại baseline commit** (Tier 2 PHẢI chạy `npm run test:unit` trên working tree trước khi sửa code, ghi output vào `evidence/ac09-unit-test-baseline.txt`; KHÔNG dùng `git checkout eda2602 && npm run test:unit` vì main đang thi công — Owner verdict P0-03) + 0 new failure; `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS. | `evidence/ac09-{typecheck,build,unit-test-baseline,unit-test,verify-handoff}.txt` (5 file). |
| `AC-10` | Accessibility (Owner verdict P0-04): Tier 2 KHÔNG dùng `npx lighthouse`/`npx pa11y`/`npx axe-core` auto-install. Dùng 2 phép đo có sẵn: (a) Edge CDP `Runtime.evaluate` đếm interactive elements (`querySelectorAll('a, button, input, select, textarea')` không có `aria-disabled`) có `getBoundingClientRect().width > 0 && height > 0` (focusable/visible check) — lưu `evidence/ac10-cdp-interactive.txt`; (b) grep utility `hrp-focus` có sẵn: `rg "hrp-focus" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (expect ≥ 1 match cho mỗi interactive component) lưu `evidence/ac10-hrp-focus.txt`. Contrast: Tier 2 đối chiếu token table trong `app/globals.css` ≥ 4.5:1 cho body, ≥ 3:1 cho large text. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02, STEP-03, STEP-04, STEP-05, STEP-06, STEP-07, STEP-08, STEP-10 | AC-01, AC-02, AC-08 |
| RQ-02 | STEP-03 | AC-01, AC-02, AC-03 |
| RQ-03 | STEP-04 | AC-01, AC-02, AC-03, AC-06, AC-08 |
| RQ-04 | STEP-05 | AC-01, AC-02, AC-03, AC-06, AC-08 |
| RQ-05 | STEP-06 | AC-01, AC-07 |
| RQ-06 | STEP-07 | AC-01, AC-02, AC-06 |
| RQ-07 | STEP-02 | AC-01, AC-02 |
| RQ-08 | STEP-02 | AC-01, AC-02, AC-10 |
| RQ-09 | STEP-02, STEP-03, STEP-04, STEP-05, STEP-06, STEP-07 | AC-05 |
| RQ-10 | STEP-04, STEP-05, STEP-06, STEP-07 | AC-06 |
| RQ-11 | STEP-10 | AC-02, AC-04, AC-08 |
| RQ-12 | STEP-02, STEP-07 | AC-10 |
| RQ-13 | STEP-08, STEP-09 | AC-03, AC-09 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | DEC-04 chưa chốt — nếu Owner không phản hồi danh sách "Top công ty" thì section render placeholder HRP/monogram và Tier 3 audit vẫn PASS (placeholder hợp lệ); task chỉ ACCEPTED sau khi Owner phản hồi hoặc chính thức hoãn. | Tier 2 viết stub + ghi rõ chờ Owner trong HANDOFF. |
| `RISK-02` | v1.0 visual diff ≤ 5% mismatch đã loại bỏ (Owner verdict §4); Tier 2 dùng section-level bbox tolerance ±4 px + mask vùng data; nếu reference mobile còn overflow thì KHÔNG lấy mobile làm canonical — chỉ dùng desktop reference, mobile kiểm overflow độc lập qua CDP scrollWidth. Tier 2 KHÔNG đo pixel toàn trang vì không phù hợp với responsive reflow và có thể PASS dù hierarchy vẫn sai. |
| `RISK-03` | Fence test (`marketplace-inventory`, `public-ui-premium`, `public-ui-token-parity`, `public-card-truth`) đang ghim composition UI-02 — có thể fail khi UI-03 thay wrapper. | DEC-10 đã mở allowlist §11 OBR-02; Tier 2 cập nhật fence theo composition mới, không bị chặn bởi test cũ. |
| `RISK-04` | Nếu Tier 2 vô tình dùng lại URL Google từ code.html (logo công ty, ảnh khu vực, ảnh nhóm), sẽ lộ PII/bằng chứng địa lý sai. | AC-05 quét rg trên `lh3.googleusercontent`; STEP-09 đã liệt kê asset pack nội bộ; Tier 3 focused audit sẽ kiểm. |
| `RISK-05` | Bài học UI-02 round 4: hardcode con số mẫu (`17.800`, `+10.000.000đ`) bị Tier 3 FAIL vì Tier 2 có thể copy nguyên HTML demo mà quên thay. | AC-06 quét rg; DEC-06 xóa floating green badges; Handbook Tier 2 đọc lại `EV-04` trước khi code. |
| `RISK-06` | Nếu Tier 2 xóa `ApplyModal`/`SuccessModal` hoặc route `/viec-lam/{code}` khi tái cấu trúc, sẽ vỡ ứng tuyển. | AC-03 verify; scope boundary §4.2 Out cấm; Tier 3 audit sẽ kiểm route + modal không đổi. |

## 8. Open Questions

None.

## 9. Planner Resolution

Tier 1 append sau review/audit. Hiện đang ở round 0 (DRAFT, chờ Owner duyệt).

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-09` | Initial contract (DRAFT, chờ Owner duyệt trước khi `READY_FOR_EXECUTION`) | Khảo sát mandate Owner tại `eda2602` + đọc `code.html`/`DESIGN.md`/`public.service.ts` + rà 7 landing component hiện tại + xác nhận asset pack `public/images/homepage-huongb/**` đã sẵn; lập gap matrix, scope, RQ, STEP, AC, OBR. |
| `v1.1` | `2026-09-09` | REVISION_REQUIRED từ Owner verdict 09/09 21:28 ICT: (1) DEC-04 chốt (b) có ràng buộc → đổi tên section 5 thành `Dự án đang tuyển`, dữ liệu từ `PublicJobOverview.newest`/`topPaid` khử trùng lặp, logo HRP monogram, ẩn nếu rỗng; (2) sửa RQ-11 dùng section-level bbox tolerance ±4 px + mask dữ liệu động thay vì whole-page ≤ 5% pixel mismatch; (3) sửa RQ-12 accessibility dùng Lighthouse/pa11y hoặc grep rule thay axe-core; (4) sửa RQ §1 Navbar với trạng thái link rõ ràng (3 link `aria-disabled="true"`); (5) ghi rõ pixel: logo 64×64 px, location card 192 px; (6) sửa AC-09 bỏ "3 baseline failures" cố định — Tier 2 đo baseline thật tại `eda2602`; (7) sửa AC-10 dùng command Lighthouse/pa11y có sẵn thay axe-core; (8) fix verify-task warnings bằng command verify rõ ràng cho AC-07 và AC-10; (9) làm rõ homepage search UI chỉ có 3 control (keyword + city + salary), API vẫn hỗ trợ `shift` ở chỗ khác nhưng KHÔNG thêm control `shift` lên hero; (10) HANDOFF sau sửa execution round = 0, status = `READY_FOR_EXECUTION` (không phải READY_FOR_REVIEW vì task chưa chạy execution). | Owner verdict yêu cầu. |
| `v1.2` | `2026-09-09` | REVISION_REQUIRED từ Owner verdict 09/09 22:03 ICT (correction round 2). 4 P0 fix: P0-01 (section 5): RQ-05/STEP-06/AC-07 bỏ khử trùng theo `recruiter` (adapter gán cùng giá trị `Tuyển dụng qua HRPartner`), lấy tối đa 4 job đầu từ `PublicJobOverview.newest` (fallback `topPaid`), mỗi card = 1 job với `job.id` (key), `job.title` (tên project), `job.availableSlots` (slot). P0-02 (CTA): Navbar link disabled dùng button element với attributes type=button, aria-disabled=true, title="Đang phát triển", tabindex=-1 (KHÔNG anchor element với href="#"); CTA `Đăng nhập`/`Đăng ký` cũng disabled; section CTV CTA dùng `/#register` (anchor hash). P0-03 (baseline): KHÔNG dùng `git checkout eda2602` để đo baseline; Tier 2 đo baseline trong cùng execution round ngay sau khi `/code` bắt đầu. P0-04 (tooling): bỏ `npx playwright`/`npx lighthouse`/`npx pa11y`/`npx axe-core` auto-install — Tier 2 dùng Edge CDP đã chứng minh ở UI-02; accessibility dùng utility `hrp-focus` (đã có trong repo) thay regex `focus:`. 6 consistency fix: STEP-04 bind `PublicJobOverview.newest`/`topPaid` (không `PublicJobDto`); DEC-02 + §4.3 Domain đổi tên section 5 thành `Dự án đang tuyển` (không "Top công ty"); STEP-10 đổi evidence filename `ac11-` → `ac02-`; STEP-10 thêm fixture `evidence/fixture-recruiting.json` cho truth/overflow (không so height BestJobs/CTV); AC-01 query theo `[data-section]` (không query `section, footer, nav` toàn bộ). | Owner verdict yêu cầu. |

## 11. Owner Baseline-aware Resolution (OBR)

### OBR-01 — Baseline-aware scope compliance

**Vấn đề:** so sánh `git status --porcelain` chỉ phát hiện path mới xuất hiện ; nó KHÔNG phát hiện file vốn đã `M` (modified) bị agent khác sửa tiếp (git status vẫn chỉ hiện `M`, không cho biết hash nội dung).

**Giải pháp 2 lớp:**
1. **Manifest snapshot**: chạy `git ls-files` + `git status --porcelain` đầu round, lưu `evidence/baseline-manifest.txt` (full path + SHA + status) và `evidence/baseline-snapshot.txt` (output thô). Mọi so sánh cuối round dùng file này.
2. **Modified-without-staged scan**: trước khi commit, `git diff --name-only` (working tree) + `git diff --staged --name-only` (index). Bất kỳ path nào xuất hiện mà KHÔNG có trong `baseline-manifest.txt` với status tương ứng → halt.

### OBR-02 — Allowlist (paths Tier 2 được phép sửa trong task này)

| Path | Quyền |
|---|---|
| `app/(portal)/page.tsx` | Sửa |
| `app/(portal)/layout.tsx` | Sửa |
| `app/components/GlobalNavbar.tsx` | Sửa |
| `app/components/GlobalFooter.tsx` | Sửa |
| `src/domains/job-board/components/landing/hero.tsx` | Sửa |
| `src/domains/job-board/components/landing/best-jobs-section.tsx` | Sửa |
| `src/domains/job-board/components/landing/areas-section.tsx` | Sửa |
| `src/domains/job-board/components/landing/referral-strip.tsx` | Sửa |
| `src/domains/job-board/components/landing/referral-invite-strip.tsx` | Sửa |
| `src/domains/job-board/components/landing/top-companies-section.tsx` (mới — đã đổi tên `recruiting-projects-section.tsx`) | Tạo |
| `src/domains/job-board/components/landing/hr-monogram.tsx` (mới) | Tạo |
| `src/domains/job-board/components/landing/recruitment-highlight.tsx` (mới) | Tạo |
| `src/domains/job-board/components/landing/featured-job-card.tsx` (mới) | Tạo |
| `src/domains/job-board/components/landing/area-image-card.tsx` (mới) | Tạo |
| `app/globals.css` | Sửa (chỉ bổ sung class nếu thiếu) |
| `src/domains/applications/marketplace-inventory.static.test.ts` | Sửa (fence, DEC-10) |
| `src/domains/job-board/public-ui-premium.static.test.ts` | Sửa (fence, DEC-10) |
| `src/domains/job-board/public-ui-token-parity.static.test.ts` | Sửa (fence, DEC-10) |
| `src/domains/job-board/public-card-truth.test.ts` | Sửa (fence, DEC-10) |
| `docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/**` | Tạo |

Ngoài allowlist trên: **KHÔNG được sửa**. Tier 2 phát hiện file ngoài allowlist → halt, báo Tier 1.

### OBR-03 — Anti-scope-creep

- Tier 2 không tự ý thêm đường dẫn mới vào allowlist; nếu cần, phải mở correction round và qua Tier 1.
- Mọi evidence file mới phải nằm trong `docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/`; file ngoài đó mà không thuộc OBR-02 allowlist → halt.
