# TASK — `hrp-v6-ui-04d-section-render`

> **Section renderer + demo content có cấu trúc** cho UI-04 theo Tier 0 mandate `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md` §3.
>
> v1.7 (11/09/2026 10:35): Tier 0 directive mới — Tier 1 sửa contract theo HEAD thực tế, triển khai trực tiếp trong cùng lượt. Baseline = HEAD `22e310d` (commit Y10.8 stamp refinement đã là visual authority hiện hữu). Container pattern = `max-w-7xl mx-auto px-4 md:px-6` (đồng bộ với Hero/BestJobs/Areas/Recruiting/ReferralStrip). Tier 1 trực tiếp code + commit + push. Audit NONE. KHÔNG revert Y10.4..Y10.12. KHÔNG mở lại Tier 3 hay Owner visual review trước deploy.
>
> Lịch sử review: Tier 0 review v1 (`tier0-review-ui04c-contracts-v1.md`) + v2 (`tier0-review-ui04c-contracts-v2.md`): REVISION_REQUIRED v2. Tier 0 review v3 (`tier0-review-ui04c-contracts-v3.md`): SMALL CLOSEOUT. v1.4: Owner visual review ghép VIS-06 → container 1080px. v1.5: BLOCKED chờ 04c1. v1.6: confirm blockers closed (drafted nhưng revert theo directive mới). v1.7: thiết kế lại theo HEAD hiện hữu.
>
> **Outcome**: Làm homepage đầy đặn bằng các section có cấu trúc, dùng demo content + ảnh local trước khi AV6 CMS thật triển khai. Renderer nhận view-model typed với `source: REAL | DEMO | INTEGRATION_PENDING` + `enabled` + `order`; thiết kế component để AV6 sau này thay fixture bằng published CMS projection mà không viết lại layout.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04d-section-render` |
| Work type | `CODE` (UI section renderer + demo fixture + typed view-model) |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` (UI thuần: renderer + typed fixture + view-model. Directive Tier 0 11/09/2026: bỏ FOCUSED audit, không gọi Tier 3 cho task này) |
| Spec version | `v1.7` |
| Status | `READY_FOR_EXECUTION` (Tier 1 triển khai trực tiếp theo Tier 0 directive 11/09/2026) |
| Planner | `Tier 1` |
| Implementer | `Tier 1` (Tier 1 owns task contract + implementation + evidence trong cùng round; KHÔNG chờ Tier 2) |
| Baseline | HEAD `22e310d` (Y10.8 stamp refinement) — `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`. Working tree clean theo TIER0_HANDOVER §4.1. |
| Source reference | HEAD `22e310d` = baseline visual authority hiện hữu. **Kế thừa nguyên xi** (KHÔNG sửa nếu không bắt buộc): `Hero` (`hero.tsx` gradient peach), `BestJobsSection`, `AreasSection`, `RecruitingProjectsSection`, `RecruitmentHighlight` (carousel 3 ảnh local VN), `ReferralStrip`, `FeaturedJobCard` (Y10.8 stamp nhỏ + opacity 50%, salary chip centered, header h-[4.75rem], strip "Tuyển " prefix, thicker logo border), `GlobalFooter`, `ContactForm`. Visual contract = HEAD đã chốt bởi 04c1 + 04c2 + Y10.4..Y10.12. |
| Container contract (HEAD) | `max-w-7xl mx-auto px-4 md:px-6` cho mọi inner container section. Section padding `pb-8 pt-4 md:pb-10 md:pt-6` (BestJobs/Recruiting/ReferralStrip) hoặc `pb-4 pt-1 md:pb-5 md:pt-2` (Areas — Y10.11/UI04k r2). Tier 1 KHÔNG hardcode 1080px hay 1200px — theo HEAD đã chốt 1280px. |
| Plan UI predecessor | composition/footer `ACCEPTED` (`hrp-v6-ui-04c-home-composition-footer` v1.4 @ `04b767e`) + R3 `ACCEPTED` (`hrp-v6-ui-04b-urgent-live-ribbon-r3` v1.3 @ `8c6fd03`) + 04c1 footer tweak r2 `ACCEPTED` (`780bb75`, 10/09/2026 23:21) + 04c2 job-card color refinement v10 `ACCEPTED` (`d7e6899`, 10/09/2026 23:48) + Plan B `ACCEPTED` + correction R1 + interaction R2 + Y10.4..Y10.12 stamp/header/salary/logo fixes. **Full chain closed.** |
| Plan UI successor | `hrp-v6-ui-04d-detail-ui` (Plan D.A — sau UI04d ACCEPTED) |
| In-scope roots | `app/(portal)/page.tsx`, `src/domains/job-board/public-types.ts` (NEW types), `src/domains/job-board/fixtures/demo-content.ts` (NEW), `src/domains/job-board/components/landing/newest-jobs-section.tsx` (NEW), `src/domains/job-board/components/landing/hrp-intro-section.tsx` (NEW), `src/domains/job-board/components/landing/partner-strip-section.tsx` (NEW), `src/domains/job-board/components/landing/news-section.tsx` (NEW), `src/domains/job-board/components/landing/news-preview-modal.tsx` (NEW), `src/domains/job-board/components/landing/mobile-banner-section.tsx` (NEW), `src/domains/job-board/components/landing/article-preview-data.ts` (NEW), `src/domains/job-board/components/landing/__tests__/sections-policy.test.tsx` (NEW), `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Forbidden paths | `src/domains/job-board/public.service.ts` (KHÔNG đổi DTO công khai), `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/components/landing/areas-section.tsx`, `src/domains/job-board/components/landing/recruiting-projects-section.tsx`, `src/domains/job-board/components/landing/featured-job-card.tsx`, `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/referral-strip.tsx`, `src/domains/job-board/components/landing/recruitment-highlight.tsx`, `src/domains/job-board/components/landing/area-image-card.tsx`, `src/domains/job-board/components/landing/hr-monogram.tsx`, `src/domains/job-board/components/landing/stamp-defs.ts`, `src/domains/job-board/components/landing/search-section.tsx`, `app/components/GlobalFooter.tsx`, `app/components/ContactForm.tsx`, `src/domains/job-board/components/landing/referral-invite-strip.tsx`, `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts`, `app/api/jobs/**`, `app/(jobs)/viec-lam/page.tsx`, `app/admin/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs`, `app/api/admin/homepage-settings/**`, `app/globals.css` NGOÀI nếu cần thêm token semantic (Tier 1 duyệt); các docs/tasks khác NGOÀI file mới của task này. |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` exit 0 (cùng expected failure set + new failure count = 0); `npm run build` exit 0. KHÔNG `verify-task.ps1` (Tier 1 owns task). KHÔNG `verify-handoff.ps1`. KHÔNG Tier 3. |
| Visual gate | Owner live review post-deploy (Vercel auto-deploy sau push). Tier 1 KHÔNG dùng Edge/CDP/PNG/bbox. Tier 1 KHÔNG fail vì thiếu screenshot. |
| Current execution round | `1` (v1.7 READY_FOR_EXECUTION — Tier 1 implement trực tiếp) |
| Next gate | Tier 1 code → gate local (typecheck/test/build) → commit + push → monitor Vercel → Owner live visual review → ACCEPTED |

## 1. Outcome

### 1.1 Thứ tự homepage cuối cùng

```
Navbar
→ Hero (gradient peach + RecruitmentHighlight carousel 3 ảnh local VN)
→ BestJobs (BestJobsSection)
→ Areas (AreasSection)
→ RecruitingProjects (RecruitingProjectsSection)
→ NewestJobs (Section 1 — REAL — Task D) ← NEW
→ HrpIntro (Section 2 — DEMO — Task D) ← NEW
→ PartnerStrip (Section 3 — DEMO — Task D) ← NEW
→ News (Section 4 — DEMO — Task D) ← NEW (modal preview trong page)
→ MobileBanner (Section 5 — DEMO — Task D) ← NEW
→ ReferralStrip (gradient peach nhạt)
→ GlobalFooter (3 cột, peach nhạt hơn)
```

### 1.2 Section contract (mỗi section)

| Section | source | Dữ liệu | Đặc điểm |
|---|---|---|---|
| **Section 1 — Việc làm mới nhất** | `REAL` | `overview.newest.slice(0, 6)` (đã có sẵn từ `bootstrapBestJobs`) | Tái dùng `FeaturedJobCard`. Title wrap tự nhiên. Stamp `tuyen-gap` nếu URGENT. Salary từ `salaryLabel(min, max)`. Link tới `/viec-lam/{slug}`. HIDDEN nếu rỗng. |
| **Section 2 — Giới thiệu HRP** | `DEMO` | view-model từ fixture local | Split image/text 2 cột desktop, stack mobile. 4 ô giá trị lấy từ 5 dịch vụ HRP (carousel hero — cung ứng LĐ thời vụ, gia công linh kiện, giới thiệu LĐ, bốc xếp, đóng gói — chọn 4/5). paragraphs: string[] render trực tiếp bằng map. KHÔNG chữ "demo" / "CMS pending". |
| **Section 3 — Đối tác/minh họa** | `DEMO` | view-model từ fixture local | Strip/strip monogram HRP + 4 monogram project (dùng chính deriveMonogram từ các project name đang tuyển, hoặc HRP monogram lặp). Container `max-w-7xl`, scroll-snap mobile. |
| **Section 4 — Tin tức & cẩm nang** | `DEMO` | view-model từ fixture local | 1 bài lớn + 2 bài nhỏ (article-preview-data.ts). Click mở `NewsPreviewModal` (client component). body: `Array<{ type: 'paragraph' | 'heading' | 'list'; content: string | string[] }>` render trực tiếp bằng React elements. KHÔNG HTML string, KHÔNG dangerouslySetInnerHTML, KHÔNG SafeHtml. |
| **Section 5 — Banner trải nghiệm trên di động** | `DEMO` | view-model từ fixture local | Image left + copy right desktop, stack mobile. CTA `href='/viec-lam'` (route thật). KHÔNG App Store/Google Play URL giả. KHÔNG storeLinks. |

### 1.3 Renderer chính sách

Mỗi section component nhận view-model có:
- `id: string`
- `enabled: boolean`
- `order: number`
- `source: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING'`

Policy:
- Nếu `enabled === false` → return null (KHÔNG render)
- Nếu `source === 'REAL'` và data rỗng → return null (HIDDEN, không fallback giả)
- Nếu `source === 'DEMO'` → render section + nội dung fixture (KHÔNG hiển thị badge "demo"/"CMS pending" theo directive)
- Nếu `source === 'INTEGRATION_PENDING'` và data rỗng → HIDDEN (không fallback im lặng sang nội dung giả)

### 1.4 Non-goals (Tier 0 directive §5 — KHÔNG làm trong task này)

- KHÔNG schema CMS / migration / Admin editor / write API / upload / media library / permission CMS / cache invalidation
- KHÔNG JobPosting editor (→ AV2)
- KHÔNG Job Detail UI (→ D.A, sau UI04d)
- KHÔNG AFF
- KHÔNG tự viết HTML sanitizer; rich text dùng structured paragraphs/bullets/typed fields

### 1.5 Plan split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| 5 section renderer + fixture (Task D này) | Plan UI Task D section-render | READY_FOR_EXECUTION v1.7 (Tier 1 triển khai) |
| Composition/footer | Plan UI composition/footer | ACCEPTED v1.4 (`04b767e`) |
| R3 URGENT live + Job Card Minimal SaaS | Plan UI R3 | ACCEPTED v1.3 (`8c6fd03`) |
| 04c1 footer tweak r2 | Plan UI 04c1 | ACCEPTED v1.0 (`780bb75`) |
| 04c2 job-card color refinement v10 | Plan UI 04c2 | ACCEPTED v1.0 (`d7e6899`) |
| Y10.4..Y10.12 stamp/header/salary/logo fixes | Owner visual review rounds | HEAD `22e310d` (visual authority) |
| Backend (HomepageSettings, write API, Admin) | Plan Admin V6 AV1 | DRAFT |
| JobPosting editor | Plan Admin V6 AV2 | DRAFT |
| CMS homepage content | Plan Admin V6 AV6 | DRAFT |
| Detail page UI | Plan D.A | DRAFT — sau UI04d ACCEPTED |
| Detail page editor | Plan D.B | DRAFT — sau D.A |
| AFF | aff_plan | BLOCKED (17/17 §20 chưa tick) |

## 2. Visual baseline (Tier 0 directive §6)

Tier 1 dùng visual source HEAD làm chuẩn — KHÔNG sửa các component đã hoàn thành:
- container `max-w-7xl mx-auto px-4 md:px-6`
- padding ngang và khoảng cách section nhất quán với Hero, BestJobs, Areas, RecruitingProjects, ReferralStrip
- tone trắng/cam/peach nhẹ
- card bo góc `rounded-xl` / `rounded-2xl`, shadow `shadow-sm` / `shadow-card`
- typography: `font-head`, `font-body`, `font-label` (semantic tokens hiện hữu)
- ảnh local `/images/homepage-huongb/industrial-location-01..04.webp` (4 ảnh phân biệt), `/images/homepage-huongb/referral-team.webp`, `/images/hero/cong-nhan-may-moc.jpg|may-sai-gon.jpg|dong-goi-ha-noi.jpg`
- responsive mobile/tablet/desktop
- KHÔNG tạo section nền tách rời thô cứng; section mới hòa vào flow với các section đã có
- KHÔNG sửa Hero, BestJobsSection, FeaturedJobCard, AreasSection, RecruitingProjectsSection, RecruitmentHighlight, ReferralStrip, GlobalFooter — trừ khi integration thực sự bắt buộc (và khi đó diff tối thiểu + ghi rõ trong HANDOFF)

## 3. Required Files (Tier 1 tạo mới)

| File | Mục đích |
|---|---|
| `src/domains/job-board/public-types.ts` | Typed view-models: `NewestJobsContent`, `HrpIntroContent`, `HrpValueItem`, `PartnerStripContent`, `PartnerStripItem`, `NewsSectionContent`, `ArticleCardExtended`, `MobileBannerContentExtended`. Source enum: `'REAL' | 'DEMO' | 'INTEGRATION_PENDING'`. Mỗi view-model có `id`, `enabled`, `order`, `source`. |
| `src/domains/job-board/fixtures/demo-content.ts` | 4 view-model DEMO: `hrpIntro`, `partnerStrip`, `newsSection`, `mobileBanner`. Article body dạng structured content array. KHÔNG HTML string. |
| `src/domains/job-board/components/landing/article-preview-data.ts` | 3 fixture article (id, title, excerpt, body structured content, category, publishedAt, imageUrl). |
| `src/domains/job-board/components/landing/newest-jobs-section.tsx` | Section 1: 6 jobs từ `overview.newest.slice(0, 6)`. Grid 3 cột desktop. Tái dùng `FeaturedJobCard`. HIDDEN nếu `jobs.length === 0`. |
| `src/domains/job-board/components/landing/hrp-intro-section.tsx` | Section 2: title + image left + text right + 4 value items. paragraphs string[] map render. |
| `src/domains/job-board/components/landing/partner-strip-section.tsx` | Section 3: 5 logo monogram (1 HRP + 4 project abbreviations). Scroll-snap mobile. |
| `src/domains/job-board/components/landing/news-section.tsx` | Section 4: title + 1 featured + 2 others. Click mở NewsPreviewModal. |
| `src/domains/job-board/components/landing/news-preview-modal.tsx` | Modal client component: render `title + excerpt + body` từ structured content array (paragraph/heading/list → React elements). |
| `src/domains/job-board/components/landing/mobile-banner-section.tsx` | Section 5: image + copy + CTA `href='/viec-lam'`. |
| `src/domains/job-board/components/landing/__tests__/sections-policy.test.tsx` | Unit test cho enabled=false, ordering/view-model mapping, REAL/DEMO source policy, structured fixture validity. |

## 4. Required Updates

| File | Thay đổi |
|---|---|
| `app/(portal)/page.tsx` | Import 5 section component + fixture. Chèn theo thứ tự UI04C §3: RecruitingProjects → NewestJobs → HrpIntro → PartnerStrip → News → MobileBanner → ReferralStrip. Section 1 lấy `overview.newest.slice(0, 6)` rồi `map(enrichJob)` thành `EnrichedJob[]` để pass cho `FeaturedJobCard`. |

## 5. Verification

Chạy local:
- `npm run typecheck` → exit 0
- `npm run test:unit` → exit 0 (cùng expected failure set + new failure count = 0)
- `npm run build` → exit 0

Test trọng yếu (theo Tier 0 §8):
- `enabled === false` → component return null
- ordering/view-model mapping (component nhận props đúng typed view-model)
- `source === 'REAL'` + data rỗng → return null (KHÔNG fallback)
- `source === 'DEMO'` → render với content
- structured fixture hợp lệ (article body parse được paragraph/heading/list)
- NewsPreviewModal mở từ click + render structured body

KHÔNG viết test:
- đếm class CSS
- đếm số dòng
- comment anchor count

KHÔNG trộn:
- lint scope archive
- Integration `DATABASE_URL_TEST`
- CI workflow fix

(Khi local gates pass, Tier 1 commit + push; CI infra còn 2 issue tách biệt — không thuộc UI04d.)

## 6. Delivery (Tier 0 directive §9)

Sau gate local đạt:
1. Tự review diff
2. Commit source + test + cập nhật TASK/HANDOFF
3. Push `origin/main`
4. Theo dõi Vercel auto-deploy
5. Báo Owner: commit hash, danh sách section, kết quả gates, URL production preview, giới hạn còn lại, trạng thái CI thật

Gate cuối: Owner visual review trên production. KHÔNG Tier 3.

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Sửa `FeaturedJobCard` hoặc các component đã chốt | §0 Forbidden + step-05 self-review. Nếu phải sửa thì diff tối thiểu + ghi rõ trong HANDOFF. |
| `RISK-02` | Tier 1 vô tình dùng ảnh internet cho asset | Fixture dùng `/images/homepage-huongb/*.webp` (industrial-location-01..04, referral-team) đã có sẵn — KHÔNG download ảnh. |
| `RISK-03` | Modal news không mở do state sai | `news-preview-modal.tsx` dùng `useState<ArticleCardExtended \| null>`; NewsSection truyền `onSelect={setSelected}`. Test AC-06 grep setSelectedArticle/onSelect. |
| `RISK-04` | Thứ tự section sai (chèn dưới ReferralStrip) | Source review trong `app/(portal)/page.tsx`. UI04C §3 invariant. |
| `RISK-05` | Mở API/Schema/Admin | §0 Forbidden + step-05 git diff filter. AC-10 scope discipline. |
| `RISK-06` | Banner mobile chèn App Store/Google Play giả | DEC-05 + source review. AC-07 grep cấm pattern. |
| `RISK-07` | Tier 1 hardcode màu hex (vi phạm semantic token) | Dùng Tailwind utility map semantic token. Nếu cần token mới → Tier 1 duyệt `app/globals.css`. |
| `RISK-08` | Tier 1 vô tình revert status `ACCEPTED` của Plan A/B/composition-footer/04c1/04c2/Y10.4..Y10.12 | §0 Forbidden + chỉ tạo file mới trong in-scope roots + page.tsx (composition-only edit). |
| `RISK-09` | CI fail do lint scope archive / Integration thiếu DATABASE_URL_TEST | KHÔNG trộn infra fix vào UI04d. Tuyên bố gate local PASS (typecheck/test/build). Báo Owner trạng thái CI thật. |

## 8. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | v1.5 BLOCKED chờ 04c1 (10/09/2026) | Tier 0 directive continuation-after-R3. |
| 1 | Tier 1 confirm blockers closed (11/09/2026 10:30 — reverted theo directive mới) | 04c1 + 04c2 đã ACCEPTED. |
| 2 (current) | Tier 0 directive mới 11/09/2026: sửa contract theo HEAD, Tier 1 triển khai trực tiếp, audit NONE. Spec bump v1.6/v1.7. Tier 1 owns task + implementation trong cùng round. | Tier 0 directive 11/09/2026 §3-§9: HEAD `22e310d` = visual authority hiện hữu (Y10.4..Y10.12 đã chốt); container = `max-w-7xl` (KHÔNG 1080px); Tier 1 trực tiếp (KHÔNG Tier 2); audit NONE (KHÔNG Tier 3); commit + push + Vercel + Owner visual review là gate cuối. |

## 9. Revision Log

- `v1.0` (10/09/2026): Khởi tạo contract theo UI04C §3 + field-matrix §13. STANDARD/FOCUSED lane. 5 section với view-model contract + safe-html helper + asset local.
- `v1.1` (10/09/2026): Tier 0 review v1 REVISION_REQUIRED. Sửa DEC-07: bỏ SafeHtml tự viết, dùng typed structured content. Spec bump → v1.1.
- `v1.2` (10/09/2026): Tier 0 review v2 REVISION_REQUIRED. Sửa RQ-07 traceability STEP ID, AC-13 policy, asset map local, dependency overview, xóa residue SafeHtml, AV-CMS → AV6.
- `v1.3` (10/09/2026): Tier 0 review v3 SMALL CLOSEOUT. Chuẩn hóa "CMS 4 section" + thay AV-CMS → AV6.
- `v1.4` (10/09/2026): Owner visual review ghép VIS-06 → container 1080px.
- `v1.5` (10/09/2026): Tier 1 revise dependency theo Tier 0 directive §5. Status BLOCKED chờ 04c1.
- `v1.6` (11/09/2026 10:30 — drafted, reverted): Tier 1 confirm blockers closed. Status BLOCKED → READY_FOR_EXECUTION. Reverted theo directive mới.
- `v1.7` (11/09/2026 10:35 — current): Tier 0 directive mới. (a) Baseline HEAD `22e310d` (visual authority Y10.4..Y10.12). (b) Container = `max-w-7xl` (KHÔNG 1080px). (c) Tier 1 trực tiếp (KHÔNG Tier 2). (d) Audit NONE (KHÔNG Tier 3). (e) Tier 1 owns task + implementation + commit + push + monitor Vercel + báo Owner. (f) Gate cuối: Owner visual review trên production. (g) Spec bump v1.6 → v1.7.
