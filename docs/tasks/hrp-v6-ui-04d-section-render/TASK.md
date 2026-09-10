# TASK — `hrp-v6-ui-04d-section-render`

> **Section renderer + demo content có cấu trúc** cho UI-04 theo Tier 0 mandate `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md` §3.
> Tier 0 review v1 (`tier0-review-ui04c-contracts-v1.md`) + v2 (`tier0-review-ui04c-contracts-v2.md`): REVISION_REQUIRED v2 — sửa RQ-07 traceability STEP ID tường minh, AC-13 đo enabled/source policy, asset map dùng ảnh local phân biệt (industrial-location-01..04.webp, referral-team.webp), dependency overview từ `bootstrapBestJobs` của composition task, xóa residue SafeHtml, AV-CMS → AV6. Tier 0 review v3 (`tier0-review-ui04c-contracts-v3.md`) SMALL CLOSEOUT: thay mọi reference active còn sót `AV-CMS` bằng `AV6`; chuẩn hóa "CMS 4 section"; spec v1.3.
> v1.4: Owner live visual review R1 (`docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/owner-live-visual-review-r1.md`) ghép VIS-06 vào composition/footer task. Section-render inherit: mọi inner container homepage dùng `max-w-[1080px] mx-auto` ngay từ đầu, KHÔNG hardcode 1200px. Section-render chạy SAU composition/footer (kế thừa 1080px contract).
> Scope: dựng 4 section mới trên homepage (Section 1 Việc làm mới nhất REAL + Section 2..5 Giới thiệu HRP, Dải đối tác/minh họa, Tin tức & cẩm nang, Banner trải nghiệm trên di động DEMO) — tổng cộng 5 section trong Task D. Mỗi section nhận view-model có kiểu rõ, `source: REAL | DEMO | INTEGRATION_PENDING`, id, enabled/order. Renderer dùng chính sách DEMO/HIDDEN khi CMS chưa có. v1.4: dùng `max-w-[1080px] mx-auto` cho mọi section container. KHÔNG mở Admin/CMS schema/API/persistence (→ Plan Admin V6 AV6). UI-only, STANDARD/FOCUSED lane.
> Plan UI predecessor: composition/footer task `ACCEPTED` (`hrp-v6-ui-04c-home-composition-footer` v1.4) + Plan B `ACCEPTED` (18919da) + correction R1 `ACCEPTED` (284e46c) + interaction R2 correction round 1 (VIS-04/05).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04d-section-render` |
| Work type | `CODE` (UI section renderer + demo content + view-model) |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` (UI thuần — section renderer + demo fixture có cấu trúc) |
| Spec version | `v1.4` |
| Status | `DRAFT` (v1.4: Owner R1 ghép VIS-06 inherited; chờ composition/footer v1.4 ACCEPTED → Tier 1 chuyển status `READY_FOR_EXECUTION`) |
| Planner | `Tier 1` |
| Baseline | HEAD đầu round — `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt` |
| Source reference | composition/footer task v1.4 `ACCEPTED` (predecessor) — diff để đối chiếu ReferralStrip reorder cuối cùng + nền peach + inner container 1080px |
| Plan UI predecessor | composition/footer `ACCEPTED` (`hrp-v6-ui-04c-home-composition-footer` v1.4) |
| Plan UI successor | (không — Plan UI D xong; Plan D.A/B và Plan Admin V6 AV6 chạy song song sau) |
| In-scope roots | `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/newest-jobs-section.tsx` (NEW), `src/domains/job-board/components/landing/hrp-intro-section.tsx` (NEW), `src/domains/job-board/components/landing/partner-strip-section.tsx` (NEW), `src/domains/job-board/components/landing/news-section.tsx` (NEW), `src/domains/job-board/components/landing/mobile-banner-section.tsx` (NEW), `src/domains/job-board/components/landing/news-preview-modal.tsx` (NEW), `src/domains/job-board/components/landing/article-preview-data.ts` (NEW), `src/domains/job-board/public-types.ts` (NEW types), `src/domains/job-board/fixtures/demo-content.ts` (NEW), `public/images/landing/**` (NEW local assets), `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Forbidden paths | `src/domains/job-board/public.service.ts`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/featured-job-card.tsx`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `app/components/GlobalFooter.tsx`, `app/components/ContactForm.tsx`, `src/domains/job-board/components/landing/referral-invite-strip.tsx`, `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts`, `app/api/jobs/**`, `app/(jobs)/viec-lam/page.tsx`, `app/admin/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs`, `app/api/admin/homepage-settings/**`, `app/globals.css` NGOÀI nếu cần thêm token semantic (Tier 1 duyệt); `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**` NGOÀI file mới của task này |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set với baseline + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04d-section-render/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Tier 3 FOCUSED audit PASS |
| Visual gate | Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox đã bỏ. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `0` (v1.3 DRAFT — closeout Tier 0 review v3) |
| Next gate | Sửa contract → `verify-task.ps1` PASS → Chờ composition/footer task ACCEPTED → interaction R2 READY_FOR_EXECUTION → composition/footer READY_FOR_EXECUTION → sau đó task này READY_FOR_EXECUTION |

## 1. Outcome

### 1.1 User-visible outcome

**Thứ tự homepage cuối cùng** (composition/footer + Task D này):

```
Navbar
→ Hero/Search (A+A16)
→ BestJobs (A+B)
→ Areas (A)
→ RecruitingProjects (A)
→ Việc làm mới nhất (Task D, REAL)
→ Giới thiệu HRP (Task D, DEMO)
→ Dải đối tác/minh họa (Task D, DEMO)
→ Tin tức & cẩm nang (Task D, DEMO)
→ Banner trải nghiệm trên di động (Task D, DEMO)
→ ReferralStrip (composition/footer, nền peach, đứng sau toàn bộ section nội dung)
→ GlobalFooter (composition/footer, 3 cột, nền peach nhạt hơn)
```

**Section 1 — Việc làm mới nhất (REAL)**

- Nguồn: `overview.newest` (do `bootstrapBestJobs` của composition task cung cấp, không gọi API mới). Slice tối đa 6 tin.
- Card tái dùng `FeaturedJobCard` đã polish (Plan A). Title wrap tự nhiên, ribbon `Tuyển gấp` nếu `urgency === URGENT`, salary từ `salaryLabel(min, max)`, link tới `/viec-lam/{slug}`.
- Nếu `overview.newest.length` ít hơn 6: render đúng số tin. Nếu rỗng: KHÔNG hiển thị section (HIDDEN).
- Props: `NewestJobsContent` từ `field-matrix.md` §13 — `{ jobs[], source: 'REAL' }`.

**Section 2 — Giới thiệu HRP (DEMO)**

- View-model `HrpIntroContent` từ `field-matrix.md` §13: `{ title, imageUrl, imageAlt, paragraphs: string[], values: HrpValueItem[] }`.
- Layout: split image/text 2 cột desktop, stack mobile. Image local `public/images/landing/hrp-intro.webp` (placeholder Owner-cung-cấp hoặc tạo ảnh trung tính).
- 4 ô giá trị KHÔNG chép "400.000+ / 50.000+" thành thành tích HRP. Dùng 4 lợi ích lấy từ mô tả dịch vụ Owner cung cấp ở `app/components/GlobalFooter.tsx` (cung ứng lao động, gia công linh kiện, giới thiệu LĐ, bốc xếp/đóng gói).
- Badge `Minh họa` ở góc heading.
- Content dạng `paragraphs: string[]` — render trực tiếp bằng React elements hoặc `map`. KHÔNG HTML string.

**Section 3 — Dải đối tác/minh họa (DEMO)**

- View-model `PartnerStripContent`: `{ title, partners: PartnerStripItem[] }`.
- 5 logo strip. Tất cả dùng monogram HRP local lặp (ghi rõ minh họa). KHÔNG lấy logo doanh nghiệp khác, KHÔNG tự phát minh tên đối tác.
- Badge `Minh họa` ở góc heading.
- Container `max-w-[1200px]` desktop, scroll-snap ngang trên mobile.

**Section 4 — Tin tức & cẩm nang (DEMO)**

- View-model `NewsSectionContent`: `{ title, featured: ArticleCardExtended, others: ArticleCardExtended[] }` (1 bài lớn + 2 bài nhỏ).
- Badge `Nội dung mẫu` ở góc heading.
- Click bài lớn mở `NewsPreviewModal` (client component, modal trong page). KHÔNG anchor chết. Click bài nhỏ cũng mở modal tương ứng.
- Ảnh local: 3 placeholder `public/images/landing/news-1.webp`, `news-2.webp`, `news-3.webp`. Title/excerpt/category dạng cẩm nang mẫu (chung chung, không claim cụ thể).
- Modal: title + excerpt + body dạng structured content `Array<{ type: 'paragraph' | 'heading' | 'list'; content: string | string[] }>` — render trực tiếp bằng React elements. KHÔNG HTML string, KHÔNG SafeHtml.
- Tier 2 tạo `article-preview-data.ts` chứa 3 fixture article (id, title, excerpt, body: structured content array, category, publishedAt, imageUrl). Modal đọc từ đây.

**Section 5 — Banner trải nghiệm HRP trên di động (DEMO)**

- View-model `MobileBannerContentExtended`: `{ title, body, imageUrl, imageAlt, ctaText, ctaHref, storeLinks? }`.
- CTA `ctaHref` dùng route thật (e.g. `/viec-lam` hoặc `/ctv-portal`); KHÔNG App Store/Google Play URL giả.
- `storeLinks` KHÔNG render nút download (chỉ render khi AV6 bật).
- Badge `Minh họa` ở góc.
- Layout: image bên trái, copy bên phải desktop; stack mobile.

**Renderer chính sách**

- Mỗi section component nhận view-model có `source: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING'`.
- Nếu `enabled === false` (real only, AV6 bật): KHÔNG render.
- Nếu `source === 'DEMO'`: render section + badge minh họa.
- Nếu `source === 'INTEGRATION_PENDING'` và data rỗng: KHÔNG render (HIDDEN), KHÔNG fallback im lặng sang nội dung giả.
- Nếu `source === 'REAL'` và data rỗng: HIDDEN.

### 1.2 Non-goals

- KHÔNG mở Admin CMS schema/API/persistence → Plan Admin V6 AV6 (work item chốt theo Tier 0 review v2).
- KHÔNG mở contact endpoint, Plan A/B/R1/composition-footer files, Plan D.A/B (detail page).
- KHÔNG sửa BestJobs/Areas/Recruiting card nội bộ — Plan A/B đã chốt.
- KHÔNG dùng Google Image Search URL, hotlink, hay logo doanh nghiệp khác.
- KHÔNG chèn section nội dung xuống dưới ReferralStrip — invariant từ UI04C §3.
- KHÔNG fallback im lặng từ lỗi API sang nội dung giả.
- KHÔNG cài tool đo (axe-core, Lighthouse, CDP, pa11y).
- KHÔNG phục hồi bộ gate CDP/20 PNG/overlay/bbox đã bỏ.

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| Sections 5 mới (Task D này) | Plan UI Task D section-render | DRAFT |
| Composition/footer (UI04 footer + UI04C §2.2) | Plan UI composition/footer | DRAFT (v1.2 — chờ predecessor R2 ACCEPTED) |
| BestJobs tab + pagination + URGENT fixture | Plan B | ACCEPTED (18919da) |
| VIS-01..03 style/layout correction | Correction R1 | ACCEPTED (284e46c) |
| Backend (HomepageSettings, permission, write API, Admin page) | Plan Admin V6 AV1 | DRAFT |
| JobPosting editor | Plan Admin V6 AV2 | DRAFT |
| CMS homepage content | Plan Admin V6 AV6 | DRAFT |
| Detail page UI | Plan D.A | DRAFT |
| Detail page editor | Plan D.B | DRAFT |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/(portal)/page.tsx:412-493` | Composition hiện tại: BestJobs → Areas → RecruitingProjects → ReferralStrip → inline list. Sau composition/footer task: BestJobs → Areas → RecruitingProjects → ReferralStrip → Footer. Task D chèn 5 section (Section 1 REAL + Section 2..5 DEMO) giữa RecruitingProjects và ReferralStrip |
| `EV-02` | `src/domains/job-board/public-types.ts` (chưa có — Tier 2 tạo từ field-matrix.md §13) | Canonical types: NewestJobsContent, HrpIntroContent, PartnerStripContent, NewsSectionContent, ArticleCardExtended, MobileBannerContentExtended, HrpValueItem, PartnerStripItem |
| `EV-03` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Card tái dùng cho Section 1. Đã polish từ Plan A. Tier 2 KHÔNG sửa |
| `EV-04` | `src/domains/job-board/components/landing/referral-strip.tsx` | Sau composition/footer task, ReferralStrip đứng giữa section nội dung và Footer. Task D KHÔNG sửa ReferralStrip |
| `EV-05` | `public/images/landing/` (NEW — Tier 2 sao chép ảnh local phân biệt hiện có) | Asset allowlist: hrp-intro.webp (copy từ `referral-team.webp`), news-1.webp (copy từ `industrial-location-01.webp`), news-2.webp (copy từ `industrial-location-02.webp`), news-3.webp (copy từ `industrial-location-03.webp`), mobile-banner.webp (copy từ `industrial-location-04.webp`), hrp-monogram-1.svg..5.svg (5 monogram HRP giống nhau cho partner strip minh họa) |
| `EV-06` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` §13 | Plan C view-models đã định nghĩa. Tier 2 dùng đúng types |
| `EV-07` | `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` §13 | Plan C view-models định nghĩa structured content types. Tier 2 dùng đúng types |
| `EV-08` | `app/(jobs)/viec-lam/[slug]/page.tsx` | Tin tức preview modal có thể tái dùng route detail với slug fake (e.g. `/tin-tuc/cam-nang-phong-van`). Tier 2 chọn modal trong page (đơn giản hơn) — ghi rõ trong HANDOFF |
| `EV-09` | `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md` §3 + §5 | UI04C mandate chốt: 5 section trong Task D (Section 1 REAL + Section 2..5 DEMO), view-model contract, REAL/DEMO/INTEGRATION_PENDING, ReferralStrip invariant |
| `EV-10` | `src/domains/job-board/public.service.ts` (Tier 2 KHÔNG sửa) | `PublicJobOverview.newest` đã có sẵn — Tier 2 chỉ đọc |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Section 1 dùng `overview.newest.slice(0, 6)` — KHÔNG mở API mới. Card tái dùng `FeaturedJobCard` đã polish | `CHOSEN` |
| `DEC-02` | Section 2 (Giới thiệu HRP) 4 ô giá trị lấy từ 5 dịch vụ ở Footer (cung ứng lao động, gia công linh kiện, giới thiệu LĐ, bốc xếp/đóng gói) — chọn 4/5 (chừa 1 cho banner mobile). KHÔNG chép "400.000+ / 50.000+" | `CHOSEN` |
| `DEC-03` | Section 3 (Dải đối tác) 5 logo strip đều monogram HRP — KHÔNG lấy logo doanh nghiệp khác | `CHOSEN` |
| `DEC-04` | Section 4 (Tin tức) 3 fixture (1 featured + 2 others) — title/excerpt/body dạng cẩm nang mẫu chung chung. Click mở modal trong page (KHÔNG route) | `CHOSEN` |
| `DEC-05` | Section 5 (Banner mobile) CTA `ctaHref = '/viec-lam'` (route thật). `storeLinks` KHÔNG render khi undefined | `CHOSEN` |
| `DEC-06` | Mỗi section component nhận view-model có `source: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING'` và `enabled` flag. Renderer chính sách HIDDEN nếu `enabled === false` hoặc data rỗng | `CHOSEN` |
| `DEC-07` | **BỎ SafeHtml tự viết.** Dùng typed structured content: `paragraphs: string[]` cho Section 2 Giới thiệu HRP, `body: Array<{ type: 'paragraph' | 'heading' | 'list'; content: string | string[] }>` cho Section 4 Tin tức. AV6 (Homepage CMS) sau này chịu trách nhiệm quyết định rich-text storage và sanitization ở boundary thật. KHÔNG tạo file `safe-html.tsx` | `CHOSEN` |
| `DEC-08` | Asset local tại `public/images/landing/` — Tier 2 dùng ảnh phân biệt hiện có: `hrp-intro.webp` (copy từ `referral-team.webp`), news cards dùng `industrial-location-01.webp`, `industrial-location-02.webp`, `industrial-location-03.webp`, mobile banner dùng `industrial-location-04.webp`. Partner strip minh họa dùng HRP monogram lặp (ghi rõ minh họa). KHÔNG download ảnh từ internet | `CHOSEN` |
| `DEC-09` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source/test allowlist. Tier 2 KHÔNG sửa TASK.md, KHÔNG sửa plan cha | `CHOSEN` |
| `DEC-10` | Baseline = HEAD đầu round (Tier 2 đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`). Expected unit failure set capture tại exec-head-before | `CHOSEN` |
| `DEC-11` | Visual parity = Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-12` | Tier 3 FOCUSED audit sau khi Tier 2 xong. Audit focus: view-model contract, source label rendering, asset local phân biệt, modal route fallback, enabled/source policy | `CHOSEN` |
| `DEC-13` | OBR-01 allow tạo HANDOFF + `evidence/**` + section component files + fixture + image assets + structured content types. KHÔNG cấm mọi file mới | `CHOSEN` |
| `DEC-14` | Order section trong `app/(portal)/page.tsx` theo UI04C §3 chuẩn — KHÔNG chèn dưới ReferralStrip | `CHOSEN` |
| `DEC-15` | Section 1 (Việc làm mới nhất) KHÔNG có badge DEMO — là REAL. Section 2..5 có badge minh họa | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Thứ tự homepage cuối cùng theo UI04C §3: Navbar → Hero/Search → BestJobs → Areas → RecruitingProjects → Việc làm mới nhất → Giới thiệu HRP → Dải đối tác/minh họa → Tin tức & cẩm nang → Banner trải nghiệm trên di động → ReferralStrip → Footer. ReferralStrip invariant: LUÔN đứng sau toàn bộ section nội dung và ngay trước Footer |
| `RQ-02` | Section 1 (Việc làm mới nhất) — REAL data từ `overview.newest.slice(0, 6)`. Tái dùng `FeaturedJobCard`. Hidden nếu rỗng. KHÔNG badge demo |
| `RQ-03` | Section 2 (Giới thiệu HRP) — DEMO. View-model `HrpIntroContent` từ field-matrix §13. Layout split image/text desktop, stack mobile. 4 ô giá trị lấy từ 5 dịch vụ Footer (chọn 4/5). KHÔNG chép "400.000+ / 50.000+". Badge `Minh họa` |
| `RQ-04` | Section 3 (Dải đối tác/minh họa) — DEMO. 5 logo strip, tất cả monogram HRP local. Badge `Minh họa`. Mobile scroll-snap ngang |
| `RQ-05` | Section 4 (Tin tức & cẩm nang) — DEMO. 1 bài lớn + 2 bài nhỏ. Click mở modal trong page (KHÔNG anchor chết, KHÔNG route). Modal render `title + excerpt + body` qua structured content array (React elements). Badge `Nội dung mẫu` |
| `RQ-06` | Section 5 (Banner trải nghiệm trên di động) — DEMO. CTA `ctaHref = '/viec-lam'` (route thật). KHÔNG App Store/Google Play URL giả. `storeLinks` chỉ render khi defined. Badge `Minh họa` |
| `RQ-07` | Mỗi section component nhận view-model có `source: REAL | DEMO | INTEGRATION_PENDING` và `enabled`. Renderer chính sách HIDDEN nếu `enabled === false` hoặc data rỗng. KHÔNG fallback im lặng từ lỗi API sang nội dung giả |
| `RQ-08` | Dùng typed structured content thay vì HTML string. Section 2 Giới thiệu HRP: `paragraphs: string[]`. Section 4 Tin tức: `body: Array<{ type: 'paragraph' | 'heading' | 'list'; content: string | string[] }>`. Render trực tiếp bằng React elements. AV6 sau này quyết định rich-text storage và sanitization ở boundary thật |
| `RQ-09` | Asset local tại `public/images/landing/` — Tier 2 tạo ảnh placeholder (copy từ `/images/homepage-huongb/` hoặc SVG inline đơn giản). KHÔNG download ảnh từ internet, KHÔNG Google Image Search, KHÔNG hotlink |
| `RQ-10` | Regression: KHÔNG đổi BestJobs, Areas, Recruiting card, Hero, search card, ReferralStrip, Footer. KHÔNG mở API, service, schema, permission, Admin page, AV1, AV6, AV2, Plan D.A/B, contact endpoint |
| `RQ-11` | Visual: 1080px container cho mỗi section (v1.4 inherit từ composition/footer v1.4 — VIS-06; KHÔNG dùng 1200px); desktop layout theo từng section; mobile stack (gutter `px-4 md:px-6`); nền peach semantic token kết hợp với ReferralStrip/Footer từ composition/footer task. Section mới dùng `max-w-[1080px] mx-auto` ngay từ đầu |

### 4.2 Scope boundaries

- **Container-only edits**: KHÔNG đổi padding ở BestJobs/Areas/Recruiting/Hero/Footer (Plan A/B/composition-footer đã chốt)
- **Data/state**: Section 1 dùng `overview.newest` (do `bootstrapBestJobs` của composition task cung cấp). Sections 2..5 dùng view-model DEMO từ fixture local — KHÔNG gọi API
- **Permission/security**: N/A
- **Interface/API**: KHÔNG tạo API mới. KHÔNG SafeHtml — dùng typed structured content
- **Migration/rollback**: N/A
- **Cache**: N/A

### 4.3 Scope

- In: §0 In-scope roots
- Out: §0 Forbidden + §1.2
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04d-section-render/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt`. (b) `git status --porcelain` → `evidence/working-tree-before.txt`. (c) Capture unit failure set hiện tại → `evidence/expected-failure-set-before.txt` | `git status --porcelain` không có path ngoài §1.3 dirty set; expected-failure-set-before.txt có hash + failing test files | Nếu expected failure set > 1 (baseline pre-existing) → verify đo đúng lúc exec-head-before; nếu > 1 → báo Planner |
| `STEP-02` | `src/domains/job-board/public-types.ts` (NEW) | Thêm types Plan C: NewestJobsContent, HrpIntroContent, HrpValueItem, PartnerStripContent, PartnerStripItem, NewsSectionContent, ArticleCardExtended, MobileBannerContentExtended. Theo field-matrix.md §13 | Source review: types khớp với §13 (shape, label, source enum). Tier 2 verify với `npm run typecheck` | Nếu types không khớp field-matrix §13 → halt, sửa |
| `STEP-03` | `src/domains/job-board/fixtures/demo-content.ts` (NEW) | Thêm 5 view-model DEMO: hrpIntro (title + image path + paragraphs string[] + 4 value items), partnerStrip (title + 5 monogram), newsSection (title + 1 featured + 2 others với body structured content array: Array<{ type: 'paragraph' | 'heading' | 'list'; content: string | string[] }>), mobileBanner (title + body paragraphs + cta). Mỗi view-model có `source: 'DEMO'`. Article body dạng structured content — render trực tiếp bằng React elements. KHÔNG HTML string | Source review: đủ 5 view-model, source đúng 'DEMO', paragraphs/bullets structured. Lưu `evidence/ac03-demo-content.txt` | Nếu view-model thiếu field hoặc source sai → halt |
| `STEP-04` | `src/domains/job-board/components/landing/newest-jobs-section.tsx` (NEW) | Section 1: title + grid 3 cột desktop (tái dùng `FeaturedJobCard`). Hidden nếu `jobs.length === 0`. KHÔNG badge | Source review: `enabled` flag check, data rỗng → return null, `FeaturedJobCard` props đúng. Lưu `evidence/ac04-newest-jobs.txt` | Nếu không hidden khi rỗng → halt |
| `STEP-05` | `src/domains/job-board/components/landing/hrp-intro-section.tsx` (NEW) | Section 2: title + badge `Minh họa` + image left + text right + 4 value items (icon + title + body). paragraphs string[] render trực tiếp bằng map | Source review: layout split, badge visible, 4 value items render, paragraphs map render. Lưu `evidence/ac05-hrp-intro.txt` | Nếu badge missing hoặc 4 items ít hơn 4 → halt |
| `STEP-06` | `src/domains/job-board/components/landing/partner-strip-section.tsx` (NEW) | Section 3: title + badge `Minh họa` + 5 logo monogram. Mobile scroll-snap | Source review: 5 logos render, badge visible. Lưu `evidence/ac06-partner-strip.txt` | Nếu ít hơn 5 logos hoặc badge missing → halt |
| `STEP-07` | `src/domains/job-board/components/landing/news-section.tsx` (NEW) + `news-preview-modal.tsx` (NEW) | Section 4: title + badge `Nội dung mẫu` + 1 featured (large card) + 2 others (small cards). Click mở `NewsPreviewModal` với title + excerpt + body (structured content array render trực tiếp bằng React elements). KHÔNG HTML string, KHÔNG SafeHtml | Source review: 1+2 layout, badge visible, modal mở từ click, body render từ structured content array. Lưu `evidence/ac07-news-section.txt` | Nếu modal không mở hoặc raw HTML → halt |
| `STEP-08` | `src/domains/job-board/components/landing/mobile-banner-section.tsx` (NEW) | Section 5: title + badge `Minh họa` + image + copy + CTA `ctaHref='/viec-lam'`. KHÔNG storeLinks | Source review: CTA route thật, badge visible, KHÔNG App Store/Google Play URL. Lưu `evidence/ac08-mobile-banner.txt` | Nếu CTA href sai hoặc có link giả → halt |
| `STEP-09` | `public/images/landing/` (NEW dir + assets) | Sao chép ảnh local phân biệt hiện có: `hrp-intro.webp` (copy từ `/images/homepage-huongb/referral-team.webp`), `news-1.webp` (copy từ `industrial-location-01.webp` tại `/images/landing-card/` hoặc thư mục asset hiện có), `news-2.webp` (copy từ `industrial-location-02.webp`), `news-3.webp` (copy từ `industrial-location-03.webp`), `mobile-banner.webp` (copy từ `industrial-location-04.webp`). Partner strip dùng `hrp-monogram-1.svg..5.svg` (5 SVG giống nhau inline SVG, ghi rõ minh họa). Tier 2 KHÔNG download ảnh từ internet, KHÔNG copy lặp 1 ảnh cho mọi card | Source review: file tồn tại, mỗi card ảnh phân biệt, SVG inline đơn giản. Lưu `evidence/ac09-assets.txt` | Nếu ảnh rỗng hoặc asset lặp → halt |
| `STEP-10` | `app/(portal)/page.tsx` | Thêm 5 section component theo thứ tự UI04C §3: chèn sau `RecruitingProjects`, trước `ReferralStrip`. Section 1 lấy từ `overview.newest` (do `bootstrapBestJobs` của composition task cung cấp); Section 2..5 lấy từ `fixtures/demo-content.ts`. KHÔNG đổi BestJobs/Areas/Recruiting/ReferralStrip | Source review: 5 section render theo thứ tự, props đúng. Lưu `evidence/ac10-composition.txt` | Nếu thứ tự sai hoặc props sai → halt |
| `STEP-11` | Truth fence — không có nội dung độc hại | PowerShell grep các pattern cấm: "Top công ty", "Đối tác chính thức", "17.800", "13.000.000", "+10.000.000", "+50.000.000", "400.000+", "50.000+", "App Store", "Google Play", "QR tải app", `play.google.com`, `apps.apple.com`. Source: 5 component mới + fixture + page.tsx | PowerShell `Select-String` expect 0 match. Lưu `evidence/ac11-truth-fence.txt` | Nếu có pattern cấm → halt, loại bỏ |
| `STEP-12` | Regression check shell + mandatory gates (DEC-11) | Source review: KHÔNG có diff ngoài §0 In-scope roots. `git diff --name-only exec-head-before..HEAD` so với allowlist. `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04d-section-render/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS | `evidence/ac12-gates.txt` | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_REVIEW |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method (command/source review/evidence file) |
|---|---|---|
| `AC-01` | Thứ tự homepage đúng theo UI04C §3 — 5 section mới chèn giữa RecruitingProjects và ReferralStrip | Command: Select-String path `app/(portal)/page.tsx` regex `NewestJobsSection\|HrpIntroSection\|PartnerStripSection\|NewsSection\|MobileBannerSection` expect ít nhất 5 match theo thứ tự. Source review. Lưu `evidence/ac01-order.txt` |
| `AC-02` | Section 1 Việc làm mới nhất — REAL, dùng `overview.newest.slice(0, 6)`, hidden khi rỗng | Command: `Select-String -Path src/domains/job-board/components/landing/newest-jobs-section.tsx -Pattern "overview\.newest\.slice\|newestJobs\.length === 0\|return null"` expect ≥1 match. Source review. Lưu `evidence/ac02-newest-real.txt` |
| `AC-03` | Section 2..5 có badge minh họa (Giới thiệu HRP + Đối tác + Tin tức + Banner mobile) | Command: `Select-String -Path src/domains/job-board/components/landing/hrp-intro-section.tsx,src/domains/job-board/components/landing/partner-strip-section.tsx,src/domains/job-board/components/landing/news-section.tsx,src/domains/job-board/components/landing/mobile-banner-section.tsx -Pattern "Minh họa\|Nội dung mẫu"` expect ≥4 match. Source review. Lưu `evidence/ac03-demo-badge.txt` |
| `AC-04` | Structured content rendering — Section 2 Giới thiệu HRP dùng paragraphs string[] map, Section 4 Tin tức dùng body structured content array render. KHÔNG HTML string, KHÔNG SafeHtml, KHÔNG dangerouslySetInnerHTML | Command: `Select-String -Path src/domains/job-board/components/landing/hrp-intro-section.tsx -Pattern "paragraphs\.(map|forEach)"` expect ≥1 match. `Select-String -Path src/domains/job-board/components/landing/news-preview-modal.tsx -Pattern "body\.(map|forEach)\|type === 'paragraph'\|type === 'heading'\|type === 'list'"` expect ≥1 match. `Select-String -Path src/domains/job-board/components/landing/news-preview-modal.tsx,src/domains/job-board/components/landing/hrp-intro-section.tsx -Pattern "SafeHtml\|dangerouslySetInnerHTML"` expect 0 match. Lưu `evidence/ac04-structured-content.txt` |
| `AC-05` | Section 3 (Dải đối tác) 5 logos monogram HRP local — không có URL ngoài | Command: `Select-String -Path src/domains/job-board/components/landing/partner-strip-section.tsx,src/domains/job-board/fixtures/demo-content.ts -Pattern "partners\.length === 5\|partners\.length >= 5\|partners\.length === 5"` expect ≥1 match. `Select-String -Path src/domains/job-board/fixtures/demo-content.ts -Pattern "https?://"` expect 0 match (ngoại trừ monogram local). Lưu `evidence/ac05-partner-strip.txt` |
| `AC-06` | Section 4 (Tin tức) — modal mở từ click, body render từ structured content array | Command: `Select-String -Path src/domains/job-board/components/landing/news-section.tsx -Pattern "onClick.*setSelectedArticle\|setSelectedArticle"` expect ≥1 match. `Select-String -Path src/domains/job-board/components/landing/news-preview-modal.tsx -Pattern "body\.(map|forEach)"` expect ≥1 match. Lưu `evidence/ac06-news-modal.txt` |
| `AC-07` | Section 5 (Banner mobile) CTA `href='/viec-lam'` — không có App Store/Google Play URL giả | Command: `Select-String -Path src/domains/job-board/components/landing/mobile-banner-section.tsx -Pattern "ctaHref.*viec-lam\|ctaHref === '/viec-lam'"` expect ≥1 match. `Select-String -Path src/domains/job-board/components/landing/mobile-banner-section.tsx,src/domains/job-board/fixtures/demo-content.ts -Pattern "apps\.apple\.com\|play\.google\.com\|App Store\|Google Play"` expect 0 match. Lưu `evidence/ac07-mobile-banner-cta.txt` |
| `AC-08` | Asset local tại `public/images/landing/` — mỗi card dùng ảnh phân biệt, không có URL ngoài | Command: `Test-Path public/images/landing/hrp-intro.webp,public/images/landing/news-1.webp,public/images/landing/news-2.webp,public/images/landing/news-3.webp,public/images/landing/mobile-banner.webp,public/images/landing/hrp-monogram-1.svg` expect all True. Source review: ảnh news/intro/banner mỗi card khác nhau (so sánh file size/inode hoặc hash). Lưu `evidence/ac08-assets-local.txt` |
| `AC-09` | Truth fence — không có nội dung độc hại | Command: `Select-String -Path src/domains/job-board/components/landing/newest-jobs-section.tsx,src/domains/job-board/components/landing/hrp-intro-section.tsx,src/domains/job-board/components/landing/partner-strip-section.tsx,src/domains/job-board/components/landing/news-section.tsx,src/domains/job-board/components/landing/mobile-banner-section.tsx,src/domains/job-board/components/landing/news-preview-modal.tsx,src/domains/job-board/fixtures/demo-content.ts,app/(portal)/page.tsx -Pattern "Top công ty\|Đối tác chính thức\|17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|400\.000\+\|50\.000\+\|App Store\|Google Play\|QR tải app\|play\.google\.com\|apps\.apple\.com"` expect 0 match. Lưu `evidence/ac09-truth-fence.txt` |
| `AC-10` | Regression — không đổi BestJobs, Areas, Recruiting card, ReferralStrip, Footer, FeaturedJobCard | Command: `git diff --name-only exec-head-before..HEAD \| Where-Object { $_ -notin @('docs/tasks/hrp-v6-ui-04d-section-render/HANDOFF.md', 'docs/tasks/hrp-v6-ui-04d-section-render/evidence/**', 'src/domains/job-board/components/landing/newest-jobs-section.tsx', 'src/domains/job-board/components/landing/hrp-intro-section.tsx', 'src/domains/job-board/components/landing/partner-strip-section.tsx', 'src/domains/job-board/components/landing/news-section.tsx', 'src/domains/job-board/components/landing/mobile-banner-section.tsx', 'src/domains/job-board/components/landing/news-preview-modal.tsx', 'src/domains/job-board/components/landing/article-preview-data.ts', 'src/domains/job-board/public-types.ts', 'src/domains/job-board/fixtures/demo-content.ts', 'app/(portal)/page.tsx', 'public/images/landing/**') }` expect 0 line. Lưu `evidence/ac10-regression.txt` |
| `AC-11` | Mandatory gates | `npm run typecheck` exit 0; full `npm run test:unit` cùng expected failure set với expected-failure-set-before + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04d-section-render/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS. Tier 3 FOCUSED audit PASS. Lưu `evidence/ac11-gates.txt` với exit code từng gate |
| `AC-12` | AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-11). Tier 1 ghi closeout sau khi Owner confirm | Status marker trong HANDOFF; Tier 1 KHÔNG fail vì thiếu screenshot; Tier 1 KHÔNG audit visual; visual parity Owner duyệt post-deploy |
| `AC-13` | **Renderer chính sách `enabled`/`source` (RQ-07)** | Command: `Select-String -Path src/domains/job-board/components/landing/hrp-intro-section.tsx,src/domains/job-board/components/landing/partner-strip-section.tsx,src/domains/job-board/components/landing/news-section.tsx,src/domains/job-board/components/landing/mobile-banner-section.tsx -Pattern "enabled === false\|!enabled\|source === 'DEMO'\|source === 'INTEGRATION_PENDING'"` expect ≥4 match (mỗi section 1 match policy check). Source review: nếu `enabled === false` → return null; nếu `source === 'INTEGRATION_PENDING'` và data rỗng → HIDDEN; KHÔNG fallback im lặng sang nội dung giả. Lưu `evidence/ac13-policy-enabled-source.txt` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-11 | AC-01 |
| RQ-02 | STEP-02, STEP-04, STEP-10 | AC-02 |
| RQ-03 | STEP-02, STEP-03, STEP-05, STEP-10 | AC-03 |
| RQ-04 | STEP-02, STEP-03, STEP-06, STEP-10 | AC-03, AC-05 |
| RQ-05 | STEP-02, STEP-03, STEP-07, STEP-10 | AC-03, AC-06 |
| RQ-06 | STEP-02, STEP-03, STEP-08, STEP-10 | AC-03, AC-07 |
| RQ-07 | STEP-04, STEP-05, STEP-06, STEP-07, STEP-08 | AC-13 |
| RQ-08 | STEP-03, STEP-07 | AC-04 |
| RQ-09 | STEP-09 | AC-08 |
| RQ-10 | STEP-12 | AC-10, AC-11 |
| RQ-11 | STEP-10, STEP-12 | AC-01, AC-11 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Tier 2 dùng ảnh internet cho asset (vi phạm RQ-09) | STEP-10 chỉ tạo ảnh local. Truth fence STEP-12 grep `https?://` trong fixture → expect 0 match ngoại trừ path local |
| `RISK-02` | Modal news không mở do state sai | STEP-07 source review state + onClick. AC-06 grep setSelectedArticle |
| `RISK-03` | Thứ tự section sai (chèn dưới ReferralStrip) | STEP-10 source review. AC-01 grep thứ tự render. UI04C §3 invariant |
| `RISK-04` | Tier 2 sửa `FeaturedJobCard` (Plan A đã chốt) | §0 Forbidden. STEP-12 git diff filter. AC-10 scope discipline |
| `RISK-05` | Tier 2 sửa `RecruitingProjectsSection` hay `AreasSection` (Plan A/B đã chốt) | §0 Forbidden. STEP-12 git diff filter |
| `RISK-06` | Tier 2 mở API mới cho section (vi phạm UI-only) | §0 Forbidden: `app/api/jobs/**`. STEP-12 git diff filter |
| `RISK-07` | Banner mobile chèn link App Store/Google Play giả | DEC-05 + STEP-08 source review. AC-07 grep cấm pattern |
| `RISK-08` | Tier 2 hardcode màu hex (vi phạm dùng semantic token) | STEP-05..08 source review: chỉ dùng class Tailwind map semantic token. Nếu cần token mới → Tier 1 duyệt |
| `RISK-09` | Tier 2 vô tình revert status `ACCEPTED` của Plan B/R1/composition-footer | §0 Forbidden rõ ràng. Tier 2 chỉ tạo file mới trong task root + 5 section component + 1 fixture + asset + page.tsx |
| `RISK-10` | Asset SVG inline không render trên một số browser | STEP-09 dùng SVG cơ bản (rect + text). AC-08 verify file tồn tại + tier 3 visual audit |

## 8. Open Questions

None — UI04C §3 chốt cả 5 section + view-model + render policy. Tier 2 chỉ cần Tier 1 duyệt nếu cần thêm semantic token cho peach background (kế thừa từ composition/footer task).

## 9. Planner Resolution

Tier 1 append sau mỗi round.

## 10. Revision Log

- `v1.0` (10/09/2026): Khởi tạo contract. Source: UI04C §3 + UI04D §Giới thiệu HRP + field-matrix §13. STANDARD/FOCUSED lane. UI-only, 5 section với view-model contract + safe-html helper + asset local.
- `v1.1` (10/09/2026): Tier 0 review v1 REVISION_REQUIRED. Sửa DEC-07: bỏ SafeHtml tự viết (XSS risk), dùng typed structured content paragraphs/bullets. Sửa §1.1 (Section 2 introHtml → paragraphs string[], Section 4 body → structured content array). Sửa RQ-08, STEP-03/04/05/06/07/08, AC-04/06/10, Risk table (bỏ 2 risk SafeHtml), Traceability. Spec bump → v1.1, Status → DRAFT. Thứ tự thực hiện: interaction R2 → composition/footer → section-render.
- `v1.2` (10/09/2026): Tier 0 review v2 REVISION_REQUIRED. Sửa: (a) RQ-07 traceability dùng STEP ID tường minh STEP-04, STEP-05, STEP-06, STEP-07, STEP-08; (b) AC-13 đo enabled/source policy trực tiếp; (c) Asset map dùng ảnh phân biệt hiện có (industrial-location-01..04.webp, referral-team.webp); (d) data dependency `overview.newest` đến từ `bootstrapBestJobs` của composition task; (e) xóa residue SafeHtml (EV-07, DEC-12, DEC-13, RQ-05); (f) AV-CMS → AV6 (label tạm được chốt tên chính thức); (g) §1.3 plan split reminder sửa composition status DRAFT v1.2.
- `v1.4` (10/09/2026): Owner live visual review R1 (`docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/owner-live-visual-review-r1.md`) ghép VIS-06 vào composition/footer task. Section-render inherit: RQ-11 sửa "1200px" → "1080px" cho mỗi section; thêm ghi chú "v1.4 inherit từ composition/footer v1.4 — VIS-06; section mới dùng `max-w-[1080px] mx-auto` ngay từ đầu". Predecessor dependency update: composition/footer v1.4 `ACCEPTED`. Plan UI predecessor chain: Plan B + correction R1 + interaction R2 correction round 1 + composition/footer v1.4. Tier 2 task D chạy SAU composition/footer v1.4 ACCEPTED → chuyển status `READY_FOR_EXECUTION`. KHÔNG thêm STEP/AC riêng — chỉ consistency reference với composition/footer. Spec bump → v1.4.
- `v1.3` (10/09/2026): Tier 0 review v3 SMALL CLOSEOUT. Sửa: (a) thay mọi reference active còn sót `AV-CMS` bằng `AV6` (scope summary, §1.3 plan split successor, RQ-08, RQ-10, EV-09, view-model `storeLinks` note, `enabled` note, AV-CMS ref §1.1); (b) chuẩn hóa "CMS 4 section" — Task D dựng 4 section mới DEMO + Section 1 REAL = 5 section trong Task D; (c) `Current execution round` đồng bộ v1.3 DRAFT. Spec bump → v1.3.
