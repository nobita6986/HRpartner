# TASK — `hrp-v6-ui-04c-home-composition-footer`

> **Composition + Footer** cho UI-04 theo Tier 0 chỉ thị `docs/prompts/TIER0_UI04_HOME_COMPOSITION_FOOTER.md` + Tier 0 UI04C mandate `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md` §2.2.
> Tier 0 review v1 (`tier0-review-ui04c-contracts-v1.md`) + v2 (`tier0-review-ui04c-contracts-v2.md`): REVISION_REQUIRED v2 — sửa RQ-01 (refactor BestJobs thành `bootstrapBestJobs`, xóa `runQuery` cũ sau khi `bootstrapBestJobs` nhận ownership, không có `jobs` state), xóa "read-only" và "flip flag" trong contact narrative (AV6 không sở hữu contact backend), đồng bộ RQ-01/DEC-02/STEP-02/AC-01/02/Risk cùng tên bootstrap + lifecycle. Tier 0 review v3 (`tier0-review-ui04c-contracts-v3.md`) SMALL CLOSEOUT: bỏ "KHÔNG xóa runQuery" trong scope summary; EV-02/EV-03 ghi rõ đây là evidence trước execution, spec v1.3.
> v1.4: Owner live visual review R1 (`docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/owner-live-visual-review-r1.md`) ghép thêm VIS-06: thu hẹp chiều rộng tổng thể homepage còn khoảng 90% — đổi inner container từ `max-w-[1200px]` sang `max-w-[1080px]` cho navbar + Hero + BestJobs + Areas + RecruitingProjects + section nội dung mới + ReferralStrip + Footer. Nâng lane FAST/NONE → **STANDARD/FOCUSED**. VIS-04/VIS-05 thuộc R2 riêng, không implement VIS-04/VIS-05 ở task này.
> Scope: xóa section inline list + dead state; refactor BestJobs thành `bootstrapBestJobs` DUY NHẤT, **xóa `runQuery` cũ** sau khi `bootstrapBestJobs` nhận ownership; reorder ReferralStrip xuống trước Footer; áp nền peach/cam nhạt; lắp footer 3 cột với content Owner cung cấp; v1.4 thêm: đồng bộ inner container homepage 1080px (VIS-06).
> UI-only, v1.3 FAST/NONE, v1.4 **STANDARD/FOCUSED** (nâng lane vì VIS-06 touch nhiều file + có thể gây overflow). KHÔNG mở Admin/schema/API/AV1/CMS/pagination/Plan D. Tier 2 v1.4 chạy SAU khi R2 round 1 ACCEPTED.
> Plan UI predecessor: Plan B `ACCEPTED` (18919da) + correction R1 `ACCEPTED` (284e46c) + interaction R2 correction round 1 (VIS-04/05).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c-home-composition-footer` |
| Work type | `CODE` (UI composition + content + style + layout correction VIS-06) |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Spec version | `v1.4` |
| Status | `DRAFT` (v1.4: Owner R1 ghép VIS-06; chờ R2 round 1 ACCEPTED → Tier 1 chuyển status `READY_FOR_EXECUTION`) |
| Planner | `Tier 1` |
| Baseline | HEAD đầu round — `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt` |
| Source reference | correction R1 commit `284e46c` (predecessor visual) + interaction R2 correction round 1 (`e18e54e` hoặc commit tương đương sau khi R2 ACCEPTED) — diff để đối chiếu trạng thái inline list cũ + ReferralStrip/footer background cũ + inner container 1080px |
| Plan UI predecessor | Plan B `ACCEPTED` (18919da) + correction R1 `ACCEPTED` (284e46c) + interaction R2 correction round 1 `ACCEPTED` (VIS-04/05) |
| Plan UI successor | Task D section-render (`hrp-v6-ui-04d-section-render`) — sau composition/footer (Task D v1.4 inherit inner container 1080px) |
| In-scope roots | `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx` (v1.4 — VIS-06 container), `app/components/GlobalFooter.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `src/domains/job-board/components/landing/hero.tsx` (v1.4 — VIS-06 container chỉ), `src/domains/job-board/components/landing/best-jobs-section.tsx` (v1.4 — VIS-06 container chỉ), `src/domains/job-board/components/landing/areas-section.tsx` (v1.4 — VIS-06 container chỉ), `src/domains/job-board/components/landing/recruiting-projects-section.tsx` (v1.4 — VIS-06 container chỉ), `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**` |
| Forbidden paths | `src/domains/job-board/public.service.ts`, `src/domains/job-board/components/landing/featured-job-card.tsx` (R2 task sở hữu), `src/domains/job-board/fixtures/**`, `app/api/jobs/**`, `app/(jobs)/viec-lam/page.tsx`, `app/admin/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs`, `app/api/admin/homepage-settings/**`, `app/globals.css` NGOÀI nếu chỉ thêm token semantic mới cho nền peach (Tier 2 escalate nếu cần); `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**` NGOÀI file mới của task này |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Tier 3 FOCUSED audit PASS |
| Visual gate | Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `0` (v1.4 DRAFT — Owner R1 ghép VIS-06) |
| Next gate | Chờ R2 round 1 ACCEPTED → `verify-task.ps1` PASS với status `READY_FOR_EXECUTION` → Tier 2 thi công (STANDARD) → Tier 3 FOCUSED audit → Owner live visual review → ACCEPTED → Task D section-render READY_FOR_EXECUTION |

## 1. Outcome

### 1.1 User-visible outcome

**RQ-01 — Bỏ inline list, BestJobs thành bootstrap public DUY NHẤT**

- Xóa section `aria-label="Danh sách việc làm"` (heading `Danh sách việc làm` + grid ul + sentinel) khỏi `app/(portal)/page.tsx`.
- **Refactor BestJobs thành hàm bootstrap DUY NHẤT** tên `bootstrapBestJobs` (hoặc tương đương) chỉ tải page BestJobs và đồng thời set `bestJobsData`, `facets`, `overview`. Hàm mới KHÔNG có mode append, KHÔNG có `jobs` state, KHÔNG có `nextOffset` (chỉ có `bestJobsOffset` của BestJobs section), KHÔNG có generation/sentinel/observer.
- **Xóa `runQuery` cũ** (kèm `useCallback runQuery`, `useEffect init runQuery`, `useEffect IntersectionObserver`, `loadMore`, `generationRef`, `abortRef` riêng homepage search, `sentinelRef`) sau khi chuyển ownership dữ liệu sang `bootstrapBestJobs`. **Giữ** `featuredSource`, `featuredJobs`, `recruitingSource`, `recruitingProjects`, `areasForCards`, `EMPTY_FILTERS`, `EMPTY_OVERVIEW`.
- `bootstrapBestJobs` chạy khi mount và khi `bestJobsOffset` đổi. Tab "Tuyển gấp" (fixture) không hủy bootstrap dữ liệu thật.
- Hero form submit (`handleSearch`) navigate tới `/viec-lam` bằng `useRouter().push(buildListingHref({ q: keyword, area, shift, offset: 0 }))`. **`offset: 0` bắt buộc** (hàm chỉ ghi offset khi khác 0; trang 1 phải là URL sạch).
- `applyArea(value)` cũng navigate tới `/viec-lam` bằng `useRouter().push(buildListingHref({ q: keyword, area: value, shift, offset: 0 }))` — giữ `keyword`/`shift` hiện tại, `offset: 0`.
- Mức lương: giữ select trong Hero (bảo toàn bố cục HuongB) nhưng control `disabled`, label `Mức lương — sắp có`. Không gửi salary vào URL. Không hiển thị câu kỹ thuật "listing chưa hỗ trợ".
- BestJobs pagination (tab "Tất cả" / "Tuyển gấp" + prev/next) giữ nguyên — Plan B đã chốt.
- Loading/error của BestJobs nằm trong section; lỗi fetch không làm trắng Hero/Areas/Recruiting.

**RQ-02 — Reorder + nền peach/cam**

- `ReferralStrip` vẫn giữ structure hiện tại (đã ở sau RecruitingProjects), KHÔNG chèn section nội dung xuống dưới nó. Sau Task D (section-render) ReferralStrip sẽ là section CUỐI CÙNG trước Footer.
- `ReferralStrip`: thêm nền peach/cam nhạt phủ ngang viewport; content `max-w-[1200px]` mx-auto giữa. Tier 2 chọn token semantic hiện có (ưu tiên `bg-primary-fixed` với opacity, hoặc thêm biến `--color-surface-warm` nếu `app/globals.css` chưa có token semantic phù hợp — KHÔNG hardcode `#ffdbce`).
- `GlobalFooter`: nền cùng họ màu peach nhưng tách nhẹ (ưu tiên `bg-primary-fixed/40` hoặc token mới `--color-surface-warm-low`); text `text-on-surface` đủ contrast; divider tinh tế (`border-line` hoặc tương đương).
- Container `max-w-[1200px]`, mobile stack theo thứ tự: Company → Services → Contact.

**RQ-03 — Footer content theo ảnh Owner cung cấp**

Cột 1 — Công ty:
- Heading `CÔNG TY TNHH HRP VIỆT NAM`
- Tên quốc tế `HRP VIET NAM COMPANY LIMITED`
- Tên viết tắt `HRP Co.,Ltd`
- Địa chỉ `Thuê Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kê, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam`
- Hotline `0211 2216999` (`tel:02112216999`) và `0964 984 866` (`tel:0964984866`)
- Email `nhaluchrp@gmail.com` (`mailto:`)
- Website `https://hrpvietnam.com/` (external link `target="_blank" rel="noopener noreferrer"`)

Cột 2 — Danh mục dịch vụ:
- `Cung ứng và cho thuê lại lao động thời vụ ngắn hạn, dài hạn`
- `Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử`
- `Dịch vụ giới thiệu lao động, việc làm`
- `Dịch vụ bốc xếp hàng hóa`
- `Dịch vụ đóng gói hàng hoá`

Cột 3 — Thông tin liên hệ:
- Heading `THÔNG TIN LIÊN HỆ`
- Field Họ và tên, Điện thoại, Nội dung (HTML textarea element)
- Validation: required Họ tên, required Điện thoại (regex `^[0-9 +\-()]{8,20}$`), maxlength nội dung 1000
- CTA `GỬI NGAY`
- Vì chưa có contact endpoint canonical: form ở trạng thái `Đang hoàn thiện` (disabled fieldset hoặc control disabled + helper text "Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email.") + render hotline/email/website rõ ràng bên dưới form. Form KHÔNG submit; KHÔNG `preventDefault()` giả; KHÔNG lưu vào `CrmLead`. Tier 2 tạo component ContactForm presentational. Validation/submit contract thuộc task backend contact riêng — AV6 (Homepage CMS) KHÔNG mặc nhiên sở hữu contact backend.

**RQ-04 — Footer link + copyright**

- Bỏ dòng `Phiên bản 6.0 — thiết kế bởi HRP Studio`.
- Copyright `&copy; {năm hiện hành} HRP — Hệ sinh thái nhân sự toàn diện.` giữ (năm tính runtime).
- Route thật: `/ve-chung-toi`, `/ctv-portal`. Mục Điều khoản/Chính sách/Liên hệ chưa có route → dùng button element với attributes `type=button`, `aria-disabled=true`, `title="Đang phát triển"`, `tabindex=-1` (pattern Footer hiện đang dùng).

**RQ-05 — Hero form submission, salary filter disclosure**

- Hero form submission dùng `useRouter().push(buildListingHref({ q: keyword, area, shift, offset: 0 }))` thay vì bootstrap cũ. **`offset: 0` bắt buộc**.
- Salary select trong Hero giữ ở trạng thái `disabled`, label `Mức lương — sắp có`. KHÔNG pass salary vào URL. KHÔNG hiển thị câu kỹ thuật "Salary filter sẽ có hiệu lực sau khi listing hỗ trợ" hay câu kỹ thuật tương tự.
- Keyword + Area + Shift vẫn pass qua URL đúng parser.

**RQ-06 — Visual parity invariants**

- 1200px container giữ nguyên (TASK A).
- Desktop 3 cột footer, mobile stack.
- Nhịp padding `px-4 md:px-6` giữ.
- Không tái sử dụng màu production footer trắng lạnh `bg-surface-container-lowest`; chuyển sang họ peach.
- Hero gradient orange giữ nguyên.

**RQ-08 (v1.4) — VIS-06: thu hẹp inner container homepage còn ~90% (1080px)**

- Dùng một mốc thống nhất `max-w-[1080px] mx-auto` cho inner container của: `GlobalNavbar`, Hero, BestJobs, Areas, RecruitingProjects, các section nội dung mới (Task D v1.4), ReferralStrip, Footer.
- Gutter responsive cân đối: `px-4` mobile, `md:px-6` desktop. KHÔNG `width: 90vw` cố định. KHÔNG `transform: scale(...)` toàn trang.
- Grid/card/padding bên trong giảm nhẹ (khoảng một spacing step) nơi cần thiết. KHÔNG thu nhỏ hàng loạt font bằng scale — giữ hierarchy chữ/logo/icon.
- BestJobs tối đa 3 cột desktop; card phải đủ chỗ cho title + ribbon + CTA, không cắt chữ hoặc overflow. Areas/Recruiting/section mới reflow theo breakpoint hiện có.
- Mobile giữ gutter + touch target tối thiểu 44px. KHÔNG horizontal scroll ở 390px. KHÔNG giảm touch target.

### 1.2 Non-goals

- KHÔNG mở Admin editor, schema, Prisma, auth, AV1.
- KHÔNG thêm CMS sections (Giới thiệu HRP, Đối tác, Tin tức, Banner mobile) → Task D section-render.
- KHÔNG sửa BestJobs, Areas, Recruiting card — Plan A/B đã chốt.
- KHÔNG sửa featured-job-card, hero card, search card nội bộ.
- KHÔNG tạo Contact submission endpoint / API / Prisma model / persistence.
- KHÔNG sửa `app/(jobs)/viec-lam/page.tsx` (Plan B đã chốt).
- KHÔNG cài tool đo (axe-core, Lighthouse, CDP, pa11y).
- KHÔNG phục hồi bộ gate CDP/20 PNG/overlay/bbox đã bỏ.
- KHÔNG revert status `ACCEPTED` của Plan B hay correction R1.

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| Composition/footer (task này) | Plan UI composition/footer | DRAFT |
| BestJobs tab + pagination + URGENT fixture | Plan B | ACCEPTED (18919da) |
| VIS-01..03 style/layout correction | Correction R1 | ACCEPTED (284e46c) |
| Backend (schema, permission, write API, Admin page, listingPageSize, view-model) | Plan Admin V6 AV1 | DRAFT |
| Sections mới (Việc làm mới nhất REAL, Giới thiệu HRP, Đối tác, Tin tức, Banner mobile) | Task D section-render | DRAFT |
| CMS homepage content | Plan Admin V6 AV6 | DRAFT |
| Detail page UI | Plan D.A | DRAFT |
| JobPosting editor | Plan Admin V6 AV2 | DRAFT |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/(portal)/page.tsx:442-491` | Section `Danh sách việc làm` inline hiện đang render — phải xóa |
| `EV-02` | `app/(portal)/page.tsx:102-118, 130-190` | **Evidence trước execution** (KHÔNG desired state): state `jobs`, `nextOffset`, `sentinelRef`, `generationRef`, `abortRef`, `runQuery`, `loadMore`, `useEffect IntersectionObserver` hiện đang phục vụ inline list. Sau STEP-02 execution sẽ xóa các state/effect này. `runQuery` được refactor thành `bootstrapBestJobs` DUY NHẤT |
| `EV-03` | `app/(portal)/page.tsx:228-241` | **Evidence trước execution** (KHÔNG desired state): `handleSearch`, `applyArea` hiện đang gọi `runQuery` (homepage search). Sau STEP-02 execution sẽ chuyển sang `useRouter().push(buildListingHref({ ..., offset: 0 }))` |
| `EV-04` | `src/domains/job-board/public-listing.params.ts:30, 67-100` | `LISTING_PATH = '/viec-lam'`, `parseListingSearchParams` chỉ hỗ trợ `q/area/shift/offset` (không `salary`); `buildListingHref` sinh URL canonical |
| `EV-05` | `app/(portal)/page.tsx:439` | `ReferralStrip` component đang đứng trước inline list (sau Recruiting). Sau task này vẫn giữ vị trí này; Task D sẽ chèn section nội dung trước ReferralStrip |
| `EV-06` | `src/domains/job-board/components/landing/referral-strip.tsx:11-17` | ReferralStrip class hiện `w-full px-4 md:px-6 py-12 md:py-16` (không nền peach) — phải thêm nền peach/cam nhạt semantic |
| `EV-07` | `app/components/GlobalFooter.tsx:42` | Footer class hiện `bg-surface-container-lowest` — phải chuyển sang họ peach |
| `EV-08` | `app/components/GlobalFooter.tsx:44-87` | Footer hiện 4 cột (Company 2-span + HRP links + Partners) — phải thay bằng 3 cột (Công ty + Dịch vụ + Liên hệ) theo ảnh Owner |
| `EV-09` | `app/components/GlobalFooter.tsx:88-89` | Copyright "Phiên bản 6.0 — thiết kế bởi HRP Studio" — phải xóa theo RQ-04 |
| `EV-10` | `app/globals.css` (chưa đọc nội dung, Tier 2 khảo sát trước khi thêm token mới) | Kiểm tra token semantic hiện có: `primary-fixed`, `primary-fixed-dim`, `primary-container`, `surface`; nếu chưa có token phù hợp cho peach background thì Tier 2 escalate |
| `EV-11` | `docs/prompts/TIER0_UI04_HOME_COMPOSITION_FOOTER.md` §RQ-01..04 | Owner mandate chốt: hotline, email, website, địa chỉ, dịch vụ, form contact contract |
| `EV-12` | `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md` §2.2 + §3 | UI04C mandate: composition/footer là task nhỏ trước Task C; ReferralStrip invariant |
| `EV-13` | Tier 0 mandate UI04D (link hình ảnh từ Owner) | Reference cho hotline 0211 2216999, 0964 984 866, email nhaluchrp@gmail.com, địa chỉ Phú Thọ, website hrpvietnam.com — Tier 1 chưa có ảnh nhưng mandate text đã liệt kê đầy đủ |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | RQ-01: Hero submit + `applyArea` navigate tới `/viec-lam` bằng `useRouter().push(buildListingHref({ q, area, shift, offset: 0 }))`. **`offset: 0` bắt buộc**. Salary select `disabled`, label `Mức lương — sắp có`, KHÔNG gửi salary vào URL. KHÔNG hiển thị câu kỹ thuật "listing chưa hỗ trợ" | `CHOSEN` |
| `DEC-02` | RQ-01: BestJobs tab "Tất cả" refactor thành hàm `bootstrapBestJobs` DUY NHẤT, chỉ tải page và đồng thời set `bestJobsData`, `facets`, `overview`. Hàm mới KHÔNG có mode append, KHÔNG `jobs` state, KHÔNG `nextOffset` (chỉ `bestJobsOffset` section), KHÔNG generation/sentinel/observer. **Xóa `runQuery` cũ** kèm `useCallback runQuery`, `useEffect init runQuery`, `useEffect IntersectionObserver`, `loadMore`, `generationRef`, `abortRef` (inline), `sentinelRef`. Giữ `featuredSource`/`featuredJobs`/`recruitingSource`/`recruitingProjects`/`areasForCards`/`EMPTY_FILTERS`/`EMPTY_OVERVIEW` | `CHOSEN` |
| `DEC-03` | RQ-02: ReferralStrip nền peach/cam nhạt. Tier 2 đo contrast ratio WCAG AA trước khi commit; nếu cần thêm token semantic mới, Tier 2 escalate Tier 1 (Tier 1 duyệt việc sửa `app/globals.css`) | `CHOSEN` |
| `DEC-04` | RQ-02: Footer nền peach nhạt hơn ReferralStrip (visual separation). Text `text-on-surface` đủ contrast. Divider giữ `border-line` | `CHOSEN` |
| `DEC-05` | RQ-03: Footer 3 cột (Công ty 1-col + Dịch vụ 1-col + Liên hệ 1-col). Mobile stack theo thứ tự Công ty → Dịch vụ → Liên hệ | `CHOSEN` |
| `DEC-06` | RQ-03: Form liên hệ render với prop `disabled` mặc định `true`. Helper text "Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email." Form KHÔNG submit; hotline/email/website render bên dưới | `CHOSEN` |
| `DEC-07` | RQ-04: Bỏ "Phiên bản 6.0 — thiết kế bởi HRP Studio". Copyright runtime `&copy; {năm hiện hành} HRP — Hệ sinh thái nhân sự toàn diện.` | `CHOSEN` |
| `DEC-08` | RQ-01: Salary select giữ trong Hero UI (bảo toàn bố cục HuongB) nhưng control `disabled`, label `Mức lương — sắp có`. KHÔNG gửi salary vào URL. KHÔNG hiển thị câu kỹ thuật "listing chưa hỗ trợ" | `CHOSEN` |
| `DEC-09` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source/test allowlist. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa plan cha | `CHOSEN` |
| `DEC-10` | Baseline = HEAD đầu round (Tier 2 đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`). Expected unit failure set capture tại exec-head-before | `CHOSEN` |
| `DEC-11` | Visual parity = Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-12` | v1.3: Tier 3 KHÔNG audit task này (FAST bypass). v1.4: lane nâng STANDARD/FOCUSED → Tier 3 FOCUSED audit bắt buộc | `CHOSEN` |
| `DEC-13` | OBR-01 allow tạo HANDOFF + `evidence/**` + sửa `app/globals.css` (chỉ khi cần thêm semantic token cho peach — Tier 1 duyệt trước khi Tier 2 commit). KHÔNG cấm mọi file mới | `CHOSEN` |
| `DEC-14` | v1.4 (VIS-06): Mọi inner container homepage dùng `max-w-[1080px] mx-auto`. Chỉ sửa container wrapper của GlobalNavbar + Hero + BestJobs + Areas + RecruitingProjects + ReferralStrip + Footer — KHÔNG sửa nội dung card, KHÔNG sửa featured-job-card (R2 sở hữu). Gutter `px-4 md:px-6`. BestJobs vẫn tối đa 3 cột desktop. Mobile giữ touch target ≥44px, không horizontal scroll ở 390px | `CHOSEN` |
| `DEC-15` | v1.4: Tier 3 FOCUSED audit sau khi Tier 2 xong (lane nâng từ FAST/NONE). Audit focus: VIS-06 container uniformity (1080px), overflow regression, mobile gutter/touch target preservation, không touch card internals | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Homepage KHÔNG còn section `aria-label="Danh sách việc làm"` + heading `Danh sách việc làm` + grid ul + sentinel load-more. KHÔNG còn state/effect/import chỉ phục vụ inline list. Hero submit và `applyArea` navigate tới `/viec-lam` qua `useRouter().push(buildListingHref(...))`. Salary select KHÔNG navigate (helper text dưới) |
| `RQ-02` | `ReferralStrip` có nền peach/cam nhạt (semantic token, KHÔNG hardcode hex); `GlobalFooter` có nền peach nhạt hơn ReferralStrip; cả 2 container `max-w-[1200px] mx-auto px-4 md:px-6`; text `text-on-surface` đủ contrast; desktop 3 cột footer, mobile stack Công ty → Dịch vụ → Liên hệ |
| `RQ-03` | Footer cột 1 Công ty: heading `CÔNG TY TNHH HRP VIỆT NAM`, tên quốc tế `HRP VIET NAM COMPANY LIMITED`, tên viết tắt `HRP Co.,Ltd`, địa chỉ đầy đủ (Phú Thọ), 2 hotline `tel:02112216999` `tel:0964984866`, email `mailto:nhaluchrp@gmail.com`, website external link `https://hrpvietnam.com/` `target="_blank" rel="noopener noreferrer"` |
| `RQ-04` | Footer cột 2 Dịch vụ: 5 dịch vụ dạng list semantic (KHÔNG anchor `#` giả). Mỗi item là `li` element text-only, không link |
| `RQ-05` | Footer cột 3 Liên hệ: heading `THÔNG TIN LIÊN HỆ`, form Họ tên + Điện thoại + Nội dung + CTA `GỬI NGAY`. Form presentational disabled: prop `disabled` mặc định `true` (dùng disabled fieldset hoặc control disabled), CTA disabled, helper text "Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email." Hotline/email/website render bên dưới form. **Không có validation khi disabled** — validation/submit contract thuộc task backend contact riêng. Không có `preventDefault` giả, không gọi API, không persist |
| `RQ-06` | Footer link thật: `/ve-chung-toi`, `/ctv-portal`. Mục Điều khoản/Chính sách/Liên hệ dùng button element với attributes `type=button`, `aria-disabled=true`, `title="Đang phát triển"`, `tabindex=-1` (pattern hiện có) |
| `RQ-07` | Copyright `&copy; {năm hiện hành} HRP — Hệ sinh thái nhân sự toàn diện.` runtime tính năm. Bỏ "Phiên bản 6.0 — thiết kế bởi HRP Studio" |
| `RQ-08` | Regression: KHÔNG đổi BestJobs, Areas, Recruiting card, Hero gradient, search card trắng (Plan A/B/correction R1 đã chốt). KHÔNG mở API, service, schema, permission, Admin page, AV1, Plan C/D, contact endpoint |
| `RQ-09` | Visual: 1200px container giữ; desktop 3 cột footer, mobile stack; nhịp padding `px-4 md:px-6` giữ; nền peach semantic token |
| `RQ-10` | v1.4 (VIS-06): Mọi inner container homepage dùng `max-w-[1080px] mx-auto` thay cho `max-w-[1200px]` hiện có. Áp dụng cho: `GlobalNavbar`, Hero, BestJobs, Areas, RecruitingProjects, các section nội dung mới (Task D), ReferralStrip, Footer. Gutter `px-4 md:px-6` giữ. Grid/card/padding bên trong giảm nhẹ (≈ 1 spacing step) nơi cần thiết. KHÔNG thu nhỏ font bằng scale. KHÔNG `width: 90vw` cố định. KHÔNG `transform: scale(...)` toàn trang. BestJobs tối đa 3 cột desktop, card đủ chỗ cho title + ribbon + CTA, không overflow. Mobile giữ gutter + touch target ≥44px, không horizontal scroll ở 390px |
| `RQ-11` | v1.4 (VIS-06) Regression: KHÔNG sửa nội dung card, KHÔNG sửa featured-job-card (R2 sở hữu), KHÔNG đổi Hero gradient, KHÔNG sửa ApplyModal. KHÔNG mở API/service/schema/permission/Admin/AV1/Plan C/D/contact endpoint |

### 4.2 Scope boundaries

- **Container-only edits**: KHÔNG đổi padding ở Hero/Areas/CTV/Footer trừ background ReferralStrip + Footer
- **Data/state**: Xóa dead state homepage search (RQ-01). KHÔNG đổi data flow BestJobs/Recruiting/Areas
- **Permission/security**: N/A
- **Interface/API**: N/A (chỉ dùng `buildListingHref` hiện có)
- **Migration/rollback**: N/A
- **Cache**: N/A

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04c-home-composition-footer/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha, KHÔNG ghi Plan A/B/correction R1 files

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) `git status --porcelain` → `evidence/working-tree-before.txt`. (c) Capture unit failure set hiện tại → `evidence/expected-failure-set-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + failing test files | Nếu expected failure set > 1 (baseline pre-existing) → verify đo đúng lúc exec-head-before; nếu > 1 → báo Planner |
| `STEP-02` | `app/(portal)/page.tsx` | RQ-01: (a) Refactor BestJobs thành hàm `bootstrapBestJobs` DUY NHẤT — chỉ tải page BestJobs, đồng thời set `bestJobsData`, `facets`, `overview`. KHÔNG mode append, KHÔNG `jobs` state, KHÔNG `nextOffset` (chỉ `bestJobsOffset`), KHÔNG generation/sentinel/observer. (b) Xóa `runQuery` cũ kèm `useCallback runQuery`, `useEffect init runQuery`, `useEffect IntersectionObserver`, `loadMore`, `generationRef`, `abortRef` (inline), `sentinelRef`. Giữ `featuredSource`/`featuredJobs`/`recruitingSource`/`recruitingProjects`/`areasForCards`/`EMPTY_FILTERS`/`EMPTY_OVERVIEW`. (c) `bootstrapBestJobs` chạy khi mount và khi `bestJobsOffset` đổi. Tab "Tuyển gấp" (fixture) không hủy bootstrap dữ liệu thật. (d) Sửa `handleSearch` dùng `useRouter().push(buildListingHref({ q: keyword, area, shift, offset: 0 }))`. **`offset: 0` bắt buộc** (trang 1 URL sạch). (e) Sửa `applyArea(value)` dùng `useRouter().push(buildListingHref({ q: keyword, area: value, shift, offset: 0 }))` — giữ `keyword`/`shift` hiện tại, `offset: 0`. (f) Mức lương: giữ select trong Hero nhưng control `disabled`, label `Mức lương — sắp có`. Không gửi salary vào URL. Không hiển thị câu kỹ thuật "listing chưa hỗ trợ" | Source review: `bootstrapBestJobs` còn, `runQuery`/`useCallback runQuery`/`useEffect init runQuery`/`useEffect IntersectionObserver`/`loadMore`/`generationRef`/`abortRef`/`sentinelRef` đã xóa; `handleSearch` gọi `useRouter().push(buildListingHref({ q: keyword, area, shift, offset: 0 }))`; `applyArea` cũng `offset: 0`; salary select `disabled` với label `Mức lương — sắp có` | Nếu BestJobs/Recruiting/Areas render gãy → revert; nếu ApplyModal/SuccessModal reference bị mất → revert |
| `STEP-03` | `src/domains/job-board/components/landing/referral-strip.tsx` | RQ-02: thêm nền peach/cam nhạt semantic token cho section element. Tier 2 đo contrast WCAG AA. Nếu cần thêm token semantic mới trong `app/globals.css` (Tier 1 duyệt trước khi commit), Tier 2 tạo `--color-surface-warm` hoặc dùng `bg-primary-fixed/40`. Giữ `max-w-[1200px]` | Source review: section có class bg peach; contrast pass | Nếu contrast fail WCAG AA → escalate, KHÔNG commit với class tạm |
| `STEP-04` | `app/components/GlobalFooter.tsx` | RQ-02..07: rebuild 3 cột (Công ty / Dịch vụ / Liên hệ). Mobile stack theo thứ tự Công ty → Dịch vụ → Liên hệ. Nền peach nhạt hơn ReferralStrip (semantic token). Text `text-on-surface`. Divider giữ `border-line`. Bỏ "Phiên bản 6.0 — thiết kế bởi HRP Studio". Route thật `/ve-chung-toi`, `/ctv-portal`; disabled button cho Điều khoản/Chính sách/Liên hệ. Form liên hệ ContactForm với prop disabled, helper text "Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email." Hotline/email/website render bên dưới form | Source review: 3 cột desktop; mobile stack; form disabled; 5 dịch vụ list semantic; 2 hotline tel: link; email mailto: link; website external link với `target="_blank" rel="noopener noreferrer"`; copyright runtime năm; KHÔNG có "Phiên bản 6.0" | Nếu hotline format sai hoặc email sai → revert; nếu form submit dù chỉ 1 field → halt |
| `STEP-05` | `app/components/ContactForm.tsx` (NEW) | RQ-05: client component form Họ tên + Điện thoại + Nội dung (textarea) + CTA `GỬI NGAY`. Prop `disabled?: boolean` mặc định `true`. Khi `disabled`: dùng disabled fieldset hoặc control disabled rõ ràng, CTA disabled, helper text "Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email." **Không có validation khi disabled**. **Không gọi API, không persist, không `preventDefault` giả**. Component export từ `app/components/ContactForm.tsx`. Tier 2 có thể colocate trong `app/components/` hoặc `app/(portal)/_components/` — chọn 1 path, ghi rõ trong HANDOFF. Validation/submit contract thuộc task backend contact riêng — AV6 (Homepage CMS) không sở hữu contact backend | Source review: prop `disabled`, helper text disabled, không gọi API, không persist, không validation | Nếu form submit dù chỉ console.log → halt |
| `STEP-06` | (nếu cần) `app/globals.css` | RQ-02: Tier 2 chỉ sửa khi cần thêm semantic token mới. Tier 1 duyệt trước khi Tier 2 commit. Tier 2 đo contrast, đề xuất token name (e.g. `--color-surface-warm`, `--color-surface-warm-low`), Tier 1 duyệt | Source review + Tier 1 explicit approve | Nếu Tier 1 không duyệt → Tier 2 revert |
| `STEP-07` | Regression check shell + mandatory gates (DEC-11) | Source review: KHÔNG có diff ngoài §0 In-scope roots (+ `app/globals.css` nếu Tier 1 duyệt STEP-06 + `app/components/ContactForm.tsx` từ STEP-05). `git diff --name-only exec-head-before..HEAD` so với allowlist. `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS | `evidence/ac09-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_REVIEW |

| `STEP-08` | v1.4 VIS-06 inner container 1080px — `app/components/GlobalNavbar.tsx` + `src/domains/job-board/components/landing/hero.tsx` + `src/domains/job-board/components/landing/best-jobs-section.tsx` + `src/domains/job-board/components/landing/areas-section.tsx` + `src/domains/job-board/components/landing/recruiting-projects-section.tsx` + `src/domains/job-board/components/landing/referral-strip.tsx` + `app/components/GlobalFooter.tsx` + `app/(portal)/page.tsx` | RQ-10: đổi inner container từ `max-w-[1200px]` sang `max-w-[1080px] mx-auto` cho mọi section homepage. Gutter `px-4 md:px-6` giữ. KHÔNG touch card internals (BestJobs card tái dùng FeaturedJobCard đã chốt ở R2). BestJobs giữ tối đa 3 cột desktop; card đủ chỗ cho title + ribbon + CTA. Giảm nhẹ grid gap / padding nơi cần (≈ 1 spacing step). KHÔNG thu nhỏ font scale. KHÔNG horizontal scroll ở 390px | Source review: grep `max-w-\[1200px\]` trong In-scope roots expect 0 match (hoặc chỉ còn ở BestJobs nếu không touch); grep `max-w-\[1080px\]` expect ≥ 7 match (8 components homepage). Manual: build + load homepage ở 390px / 768px / 1280px — không horizontal scroll, gutter cân đối, touch target ≥44px. Lưu `evidence/ac10-vis06-container.txt` | Nếu 390px xuất hiện horizontal scroll → halt |
| `STEP-09` | v1.4 Regression check shell + mandatory gates (DEC-15) | Source review: KHÔNG có diff ngoài §0 In-scope roots. `git diff --name-only exec-head-before..HEAD` filter allowlist với `featured-job-card.tsx` KHÔNG thuộc allowlist của task này. `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Tier 3 FOCUSED audit PASS | `evidence/ac11-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_AUDIT |
## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method (command/source review/evidence file) |
|---|---|---|
| `AC-01` | Homepage KHÔNG còn section `aria-label="Danh sách việc làm"` + heading `Danh sách việc làm` + sentinel load-more; `runQuery` cũ đã xóa | Command: `Select-String -Path app/(portal)/page.tsx -Pattern "Danh sách việc làm\|load-more-sentinel\|sentinelRef\|runQuery"` expect 0 match. Source review: section đã xóa, không còn `useCallback runQuery`/`useEffect init runQuery`/`useEffect IntersectionObserver`/`loadMore`/`generationRef`/`abortRef` (inline)/`sentinelRef`/`jobs` (state)/`nextOffset` (inline). Lưu `evidence/ac01-inline-list-removed.txt` |
| `AC-02` | `handleSearch` gọi `useRouter().push(buildListingHref(...))` thay vì gọi bootstrap cũ; `applyArea` cũng navigate. **`offset: 0` trong cả hai** | Command: `Select-String -Path app/(portal)/page.tsx -Pattern "router\.push.*buildListingHref\|buildListingHref.*router\.push"` expect ≥2 match (handleSearch + applyArea). `Select-String -Path app/(portal)/page.tsx -Pattern "offset:\s*0"` expect ≥2 match (handleSearch + applyArea). Source review: `bootstrapBestJobs` là hàm duy nhất, không có hàm `runQuery` cũ. Lưu `evidence/ac02-hero-navigates.txt` |
| `AC-03` | Salary select `disabled` với label `Mức lương — sắp có`; KHÔNG gửi salary vào URL; KHÔNG hiển thị câu kỹ thuật "listing chưa hỗ trợ" | Command: `Select-String -Path app/(portal)/page.tsx -Pattern "Mức lương — sắp có"` expect ≥1 match. `Select-String -Path app/(portal)/page.tsx -Pattern "salary.*href\|href.*salary\|buildListingHref.*salary"` expect 0 match (salary not passed to URL). Lưu `evidence/ac03-salary-disabled.txt` |
| `AC-04` | `ReferralStrip` có class bg peach/cam nhạt semantic token | Command: `Select-String -Path src/domains/job-board/components/landing/referral-strip.tsx -Pattern "bg-primary-fixed\|bg-surface-warm\|surface-warm-low"` expect ≥1 match. Source review: section có background peach; contrast WCAG AA pass. Lưu `evidence/ac04-referral-bg.txt` |
| `AC-05` | `GlobalFooter` có 3 cột (Công ty / Dịch vụ / Liên hệ); nền peach nhạt hơn ReferralStrip; mobile stack | Command: `Select-String -Path app/components/GlobalFooter.tsx -Pattern "CÔNG TY TNHH HRP VIỆT NAM\|HRP VIET NAM COMPANY LIMITED\|HRP Co\.,Ltd"` expect 3 match. `Select-String -Path app/components/GlobalFooter.tsx -Pattern "Cung ứng và cho thuê lại lao động\|Dịch vụ gia công và kiểm tra\|Dịch vụ giới thiệu lao động\|Dịch vụ bốc xếp hàng hóa\|Dịch vụ đóng gói hàng hoá"` expect 5 match. `Select-String -Path app/components/GlobalFooter.tsx -Pattern "THÔNG TIN LIÊN HỆ\|GỬI NGAY"` expect ≥2 match. Source review: grid `md:grid-cols-3` (hoặc tương đương); mobile `grid-cols-1`. Lưu `evidence/ac05-footer-3col.txt` |
| `AC-06` | Hotline `tel:` link 2 số, email `mailto:`, website external link | Command: `Select-String -Path app/components/GlobalFooter.tsx -Pattern "tel:02112216999\|tel:0964984866"` expect ≥2 match. `Select-String -Path app/components/GlobalFooter.tsx -Pattern "mailto:nhaluchrp@gmail\.com"` expect ≥1 match. `Select-String -Path app/components/GlobalFooter.tsx -Pattern "https://hrpvietnam\.com/.*target=\"_blank\".*rel=\"noopener noreferrer\""` expect ≥1 match. Lưu `evidence/ac06-footer-contact-links.txt` |
| `AC-07` | Form liên hệ ContactForm với prop disabled và helper text | Command: `Select-String -Path app/components/GlobalFooter.tsx -Pattern "ContactForm\s+disabled"` expect ≥1 match. `Select-String -Path app/components/ContactForm.tsx -Pattern "Tính năng đang được hoàn thiện"` expect ≥1 match. `Select-String -Path app/components/ContactForm.tsx -Pattern "preventDefault\|fetch\(.*contact\|/api/contact"` expect 0 match. Lưu `evidence/ac07-contact-form-disabled.txt` |
| `AC-08` | Copyright runtime năm; bỏ "Phiên bản 6.0" | Command: `Select-String -Path app/components/GlobalFooter.tsx -Pattern "new Date\(\)\.getFullYear\(\)"` expect ≥1 match. `Select-String -Path app/components/GlobalFooter.tsx -Pattern "Phiên bản 6\.0"` expect 0 match. Lưu `evidence/ac08-copyright-runtime.txt` |
| `AC-09` | Visual parity | Visual parity invariants như §1.1 RQ-06: 1200px container giữ (v1.3); desktop 3 cột footer, mobile stack; nhịp padding `px-4 md:px-6` giữ; nền peach semantic token. Tier 3 / Owner live review |
| `AC-10` | v1.4 VIS-06 inner container 1080px uniformity | Command: `rg --no-heading "max-w-\[1080px\]" app/components/GlobalNavbar.tsx src/domains/job-board/components/landing/hero.tsx src/domains/job-board/components/landing/best-jobs-section.tsx src/domains/job-board/components/landing/areas-section.tsx src/domains/job-board/components/landing/recruiting-projects-section.tsx src/domains/job-board/components/landing/referral-strip.tsx app/components/GlobalFooter.tsx app/(portal)/page.tsx` expect ≥ 7 match (8 components homepage). Command: `rg --no-heading "max-w-\[1200px\]"` trong cùng 8 path expect 0 match (BestJobs không giữ 1200px). Source review: không có `transform: scale(...)` toàn trang, không `width: 90vw`. Lưu `evidence/ac10-vis06-container.txt` |
| `AC-11` | v1.4 VIS-06 — không horizontal scroll ở 390px, touch target ≥44px | Source review: gutter `px-4 md:px-6` đồng bộ 8 components; CTA button và link có `min-height: 44px` (Tailwind: `min-h-[44px]` hoặc `min-h-11`) cho mọi touch target trong các section đã touch. Manual / Owner: load homepage ở 390px — không horizontal scroll. BestJobs card đủ chỗ cho title + ribbon + CTA, không cắt chữ, không overflow. Lưu `evidence/ac11-vis06-mobile.txt` |
| `AC-12` | v1.4 VIS-06 — KHÔNG sửa featured-job-card | Command: `git diff --name-only exec-head-before..HEAD -- src/domains/job-board/components/landing/featured-job-card.tsx` expect 0 line (R2 task sở hữu). Source review: In-scope roots của task này KHÔNG bao gồm `featured-job-card.tsx`. Lưu `evidence/ac12-vis06-featuredscope.txt` |
| `AC-13` | v1.4 Mandatory gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Tier 3 FOCUSED audit PASS. Lưu `evidence/ac13-gates.txt` |
| `AC-10` | AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-11). Tier 1 ghi closeout sau khi Owner confirm | Status marker trong HANDOFF; Tier 1 KHÔNG fail vì thiếu screenshot; Tier 1 KHÔNG audit visual; visual parity Owner duyệt post-deploy |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02 | AC-01, AC-02, AC-03 |
| RQ-02 | STEP-03, STEP-04, STEP-06 | AC-04, AC-05 |
| RQ-03 | STEP-04 | AC-05, AC-06 |
| RQ-04 | STEP-04 | AC-05 |
| RQ-05 | STEP-04, STEP-05 | AC-05, AC-07 |
| RQ-06 | STEP-04 | AC-05 |
| RQ-07 | STEP-04 | AC-08 |
| RQ-08 | STEP-07 | AC-09 (v1.3; v1.4 visual parity giữ 1080px qua AC-10) |
| RQ-09 | STEP-03, STEP-04, STEP-07 | AC-04, AC-05, AC-09 |
| RQ-10 | STEP-08 | AC-10, AC-11 |
| RQ-11 | STEP-09 | AC-12, AC-13 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `applyArea(value)` navigate tới `/viec-lam?area=...` có thể reset Hero filter `keyword`/`shift` — user mất filter state khác | STEP-02 source review: `applyArea` gọi `buildListingHref({ q: keyword, area: value, shift, offset: 0 })` để giữ state filter khác. Nếu `keyword` rỗng → URL không có `q` (parser bỏ qua); nếu `shift` rỗng → URL không có `shift` |
| `RISK-02` | Hero submit navigation có thể double-submit nếu user click nhanh | STEP-02 source review: `useRouter().push` async; button có thể disable khi searching đang true. Hiện `searching` state vẫn còn → KHÔNG xóa; Tier 2 giữ pattern disable hiện tại |
| `RISK-03` | Tier 2 vô tình sửa `app/(jobs)/viec-lam/page.tsx` hoặc `public.service.ts` | STEP-07 + AC-09 enforce: git diff name-only filter. Forbidden paths trong §0 |
| `RISK-04` | Tier 2 hardcode màu `#ffdbce` thay vì semantic token | STEP-03 + STEP-04 source review: chỉ dùng class Tailwind map với semantic token. Nếu cần token mới → STEP-06 + Tier 1 duyệt |
| `RISK-05` | Form liên hệ dù `disabled` vẫn cho submit (ví dụ console.log payload) | STEP-05 source review: KHÔNG `onSubmit`; helper text chỉ render khi `disabled` |
| `RISK-06` | ContactForm tạo file mới nhưng Tier 2 đặt sai vị trí (e.g. trong `app/(portal)/`) làm vỡ route grouping | STEP-05: Tier 2 đặt tại `app/components/ContactForm.tsx`. Import từ GlobalFooter cùng `app/components/`. Tier 2 KHÔNG đặt trong `app/(portal)/_components/` |
| `RISK-07` | Nền peach có contrast WCAG AA fail với text `text-on-surface` | STEP-03/04 source review + manual contrast check. Nếu fail → escalate Tier 1, KHÔNG commit với class tạm |
| `RISK-08` | Tier 2 xóa nhầm `featuredSource`/`featuredJobs`/`recruitingSource`/`recruitingProjects`/`areasForCards` (BestJobs/Recruiting/Areas cần) | DEC-02 ghi rõ chỉ xóa inline-list state. STEP-02 source review: giữ nguyên các derived value này |
| `RISK-09` | v1.4 — VIS-06 inner container gây overflow khi BestJobs card không đủ chỗ ở 1080px | STEP-08 verify 390px / 1280px viewport. BestJobs giữ tối đa 3 cột desktop. Nếu card overflow → giảm grid gap / padding 1 step, KHÔNG scale font |
| `RISK-10` | v1.4 — Tier 2 sửa nhầm `featured-job-card.tsx` (R2 task sở hữu) | AC-12 enforce: `featured-job-card.tsx` KHÔNG thuộc allowlist task này. Forbidden paths giữ nguyên từ v1.3. STEP-09 git diff filter. Nếu bị sửa → revert |
| `RISK-11` | v1.4 — Inner container 1080px khác breakpoint nội bộ từng component (e.g. BestJobs dùng container riêng) | STEP-08 source review: grep `max-w-[1080px]` expect ≥ 7 match (8 components). Nếu component nào giữ `max-w-[1200px]` → halt, đồng bộ |
| `RISK-09` | Tier 2 vô tình revert status `ACCEPTED` của Plan B hay correction R1 | §0 Forbidden + §1.2 rõ ràng. Tier 2 chỉ tạo file mới trong task root; KHÔNG đụng Plan B / R1 files |

## 8. Open Questions

None — Tier 0 mandate UI04 footer + UI04C đã chốt. Tier 2 chỉ cần đo contrast và escalate nếu cần token semantic mới trong `app/globals.css`.

## 9. Planner Resolution

Tier 1 append sau mỗi round.

## 10. Revision Log

- `v1.0` (10/09/2026): Khởi tạo contract. Source: Tier 0 UI04 footer mandate + UI04C §2.2. FAST lane. UI-only. Tier 1 review trực tiếp.
- `v1.1` (10/09/2026): Tier 0 review v1 REVISION_REQUIRED. Sửa RQ-01 giữ `runQuery` vì facets/overview, `buildListingHref` offset:0, salary disabled label "sắp có", contact form disabled presentational không validation.
- `v1.2` (10/09/2026): Tier 0 review v2 REVISION_REQUIRED. Sửa RQ-01 refactor BestJobs thành `bootstrapBestJobs`, xóa `runQuery` cũ sau khi nhận ownership; xóa "read-only" và "flip flag" trong contact narrative; đồng bộ RQ-01/DEC-02/STEP-02/AC-01/02/Risk cùng tên bootstrap + lifecycle; AV-CMS → AV6 trong CMS ownership ref.
- `v1.4` (10/09/2026): Owner live visual review R1 (`docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/owner-live-visual-review-r1.md`) ghép VIS-06 (inner container 1080px). Nâng lane FAST/NONE → STANDARD/FOCUSED. Append: RQ-10 (VIS-06 container uniformity), RQ-11 (VIS-06 regression scope); DEC-14 (VIS-06 container rule), DEC-15 (Tier 3 FOCUSED audit bắt buộc); STEP-08 (VIS-06 container), STEP-09 (v1.4 regression + gates); AC-10 (container uniformity), AC-11 (mobile 390px scroll/touch target), AC-12 (featured-job-card not in scope), AC-13 (v1.4 gates); RISK-09/10/11. In-scope roots mở rộng: thêm `app/components/GlobalNavbar.tsx`, mở rồi `hero.tsx`/`best-jobs-section.tsx`/`areas-section.tsx`/`recruiting-projects-section.tsx` (VIS-06 container chỉ). Hand-off: chờ R2 round 1 ACCEPTED → Tier 1 chuyển status `READY_FOR_EXECUTION` → Tier 2 thi công (STANDARD) → Tier 3 FOCUSED audit → Owner live review → ACCEPTED → Task D section-render READY_FOR_EXECUTION. Spec bump → v1.4.
- `v1.3` (10/09/2026): Tier 0 review v3 SMALL CLOSEOUT. Sửa: (a) bỏ "KHÔNG xóa runQuery" trong scope summary (quyết định đúng là xóa `runQuery` cũ sau khi `bootstrapBestJobs` nhận ownership); (b) EV-02/EV-03 ghi rõ đây là evidence trước execution (KHÔNG desired state); (c) `Current execution round` đồng bộ v1.3 DRAFT. Spec bump → v1.3.
