# Skeleton — TASK B, C, D (Plan UI)

> Tier 1 cập nhật sau khi TASK A xong. **Chưa viết contract đầy đủ** — chỉ liệt kê in-scope/out-of-scope/dependency/gates sơ bộ để Tier 2 lập kế hoạch nối tiếp.

---

## TASK B — Pagination thật + Admin Config read-only (`hrp-v6-ui-04b-pagination-admin`)

### Status: `ACCEPTED` (`18919da`) — CRITICAL lane closed 2026-09-09

### Lane / Audit
- **CRITICAL** (có schema migration + permission + admin write API)
- Audit mode: **DEEP sâu trên schema/permission/data changed surface** (KHÔNG quét toàn repo)

### Outcome (đã chốt trong OWNER_APPROVAL_REQUIRED.md)
- Tab filter BestJobs: `Tất cả` + `Tuyển gấp` (chỉ URGENT)
- Pagination prev/next + BestJobs fetch riêng từ `/api/jobs`
- Schema `HomepageSettings` singleton + invariant DB
- Homepage page size default 9, range {3,6,9,12}
- Listing page size default 12, range integer 6..50
- Homepage search giữ append/load-more; SSR `/viec-lam` pagination URL — `listingPageSize` áp dụng cả hai qua loader check

### In-scope
- `prisma/schema.prisma`: thêm `HomepageSettings` table (id='default' CHECK constraint)
- `prisma/migrations/<date>_homepage_settings/migration.sql`: ADD-only
- `src/domains/job-board/public-settings.service.ts` (mới): get/update singleton + cache + concurrency
- `app/api/admin/homepage-settings/route.ts` (mới): GET public (read-only), POST admin-only
- `app/api/jobs/route.ts`: mở scope query filter `urgency=URGENT` trước pagination (B4)
- `src/domains/job-board/public.service.ts`: thêm filter URGENT trong `listPublicJobProjection`
- `app/(portal)/page.tsx`: thêm tab state + BestJobs fetch riêng + prev/next control
- `app/(jobs)/viec-lam/page.tsx`: verify pagination URL behavior với listingPageSize
- Fence tests cập nhật

### Out-of-scope
- Tag tùy biến (DEFER)
- Editor CMS content (Plan Admin V6)
- Detail page editorial (Task D)

### Acceptance criteria sơ bộ
- AC: BestJobs tab `Tất cả` / `Tuyển gấp` filter đúng `urgency === 'URGENT'`
- AC: prev/next control gọi `/api/jobs?urgency=URGENT&limit=9&offset=N` đúng
- AC: `/api/admin/homepage-settings` GET public returns `{bestJobsPageSize, listingPageSize}`; POST ADMIN only 403 nếu không phải ADMIN
- AC: invariant DB: 2 row insert → fail (CHECK constraint); missing row → bootstrap default
- AC: migration ADD-only — `git diff --cached -- prisma/schema.prisma` chỉ `+`, không `-`
- AC: `npx prisma migrate diff --from-schema-datamodel baseline.prisma --to-schema-datamodel prisma/schema.prisma --script` không có DROP
- AC: SSR `/viec-lam?page=N` pagination URL giữ metadata canonical

### Gates
- `npm run typecheck` exit 0
- `npm run test:unit` (new failure count = 0)
- `npm run test:unit -- public-card-truth` PASS
- `npm run build` exit 0
- `npx prisma validate` exit 0
- `npx prisma generate` exit 0
- `verify-task.ps1` PASS
- `verify-handoff.ps1` PASS
- Permission integration test: POST không phải ADMIN → 403

---

## TASK C — Composition + Footer (`hrp-v6-ui-04c-home-composition-footer`)

### Status: `ACCEPTED v1.4` (`04b767e`) — 2026-09-10

### Lane / Audit
- **FAST** (UI composition thuần — xóa inline list + reorder ReferralStrip + rebuild Footer)
- Audit mode: **NONE** (FAST bypass Tier 3)

### Outcome
- Homepage KHÔNG còn section inline list (grid/sentinel/append) + dead state
- Hero search + applyArea navigate tới `/viec-lam` bằng `useRouter().push(buildListingHref({ q, area, shift, offset: 0 }))`
- `runQuery` giữ lại — là bootstrap public DUY NHẤT cấp facets/overview cho Hero/Areas/Recruiting/section mới
- Salary select `disabled` label "Mức lương — sắp có"
- ReferralStrip xuống cuối nội dung, ngay trước Footer, nền peach/cam nhạt
- GlobalFooter rebuild 3 cột (Công ty + Dịch vụ + Liên hệ disabled), nền peach nhạt hơn ReferralStrip

### In-scope
- `app/(portal)/page.tsx`: xóa inline list section + state/effect riêng; sửa handleSearch/applyArea navigate
- `src/domains/job-board/components/landing/referral-strip.tsx`: thêm nền peach/cam nhạt
- `app/components/GlobalFooter.tsx`: rebuild 3 cột với content Owner
- `app/components/ContactForm.tsx` (NEW): disabled presentational form

### Out-of-scope
- CMS, schema, API, permission, Admin page, AV1

---

## TASK 04c1 — Footer tweak r2 (`hrp-v6-ui-04c1-footer-tweak-r2`)

### Status: `READY_FOR_EXECUTION v1.0` (2026-09-10) — 16 Owner decisions chốt tại `evidence/owner-footer-r2-decisions.md`; `verify-task.ps1` PASS

### Lane / Audit
- **FAST** (chỉ style/copy/layout nhẹ trong footer)
- Audit mode: **NONE** (FAST bypass Tier 3)
- Nâng `STANDARD/FOCUSED` nếu thay behavior, form, navigation hoặc shared responsive layout

### Outcome (16 Owner decisions 2026-09-10)
- Nền footer peach sáng nhưng đậm hơn baseline `bg-primary-fixed/20` một bậc → `bg-primary-fixed/35` (Owner #1)
- 3 cột desktop giữ thứ tự `Công ty → Dịch vụ → Liên hệ`; mobile stack giữ nguyên (Owner #2, #3)
- 5 dịch vụ giữ nguyên nội dung; chỉ chỉnh typography + icon (Lucide, KHÔNG thêm package) + spacing (Owner #4)
- Hotline `0211 2216999` + `0964 984 866`; email `nhaluchrp@gmail.com`; website `https://hrpvietnam.com/` (external, noopener noreferrer) — giữ nguyên (Owner #5, #6, #7)
- Địa chỉ Phú Thọ giữ nguyên nội dung (Owner #8)
- ContactForm giữ `disabled={true}` (Owner #9); CTA `GỬI NGAY` giữ nhãn + disabled (Owner #11)
- Helper text đổi sang `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.` (Owner #10)
- Copyright đổi thành `&copy; {năm hiện hành} HRP Việt Nam. Connecting for Success.` (Owner #12)
- Routes thật `/ve-chung-toi`, `/ctv-portal` giữ nguyên (Owner #13)
- 3 link `Điều khoản / Chính sách bảo mật / Liên hệ` đổi semantic từ `<button>` giả sang `<span aria-disabled="true">`; KHÔNG `<button>`, KHÔNG `href="#"` (Owner #14)
- Touch target ≥ 44px min; mobile 390px không horizontal scroll (Owner #15)
- Container `max-w-[1080px] mx-auto px-4 md:px-6` giữ (Owner #16)
- Cột Liên hệ wrap trong panel cam ấm nhẹ, bo góc (visual direction)
- Heading labels: `CÔNG TY TNHH HRP VIỆT NAM` / `DANH MỤC DỊCH VỤ` / `THÔNG TIN LIÊN HỆ` (visual direction)
- Tier 2 KHÔNG mở contact API, persistence, schema, permission, CMS, Admin, route thật mới

### Skeleton invariant guard (RQ-00, lock từ composition/footer v1.4)
- Container `max-w-[1080px] mx-auto px-4 md:px-6` (Owner #16, VIS-06)
- Mobile stack `Công ty → Dịch vụ → Liên hệ` (Owner #3)
- 3 cột desktop giữ thứ tự (Owner #2)
- `tel:02112216999` + `tel:0964984866` + `mailto:nhaluchrp@gmail.com` + external `https://hrpvietnam.com/` (target=_blank rel=noopener noreferrer) (Owner #5, #6, #7)
- 5 dịch vụ giữ nguyên nội dung (Owner #4)
- Route `/ve-chung-toi` + `/ctv-portal` (Owner #13)
- ContactForm `disabled={true}` + helper text `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.` (Owner #9, #10)
- Copyright `&copy; {năm hiện hành} HRP Việt Nam. Connecting for Success.` (Owner #12) — không phục hồi "Phiên bản 6.0"
- Background `bg-primary-fixed/35` (Owner #1; đậm hơn baseline `/20` một bậc, không sang nâu đậm)
- KHÔNG revert R3 (8 file dirty tại `8c6fd03`)
- KHÔNG revert composition/footer `04b767e`

### Out-of-scope
- Contact API, persistence, schema, Admin, CMS
- Footer layout khác (vẫn giữ 3 cột)
- Mở route mới
- Cài package icon mới (dùng Lucide đã có)

### Trạng thái Owner delta
ĐÃ CHỐT 16 lựa chọn tại `evidence/owner-footer-r2-decisions.md` (2026-09-10). Tier 1 finalize contract v1.0; `verify-task.ps1` PASS.

---

## TASK R3 — Live urgent jobs + Job Card Minimal SaaS (`hrp-v6-ui-04b-urgent-live-ribbon-r3`)

### Status: `ACCEPTED v1.3` (`8c6fd03`) — 2026-09-10

### Status: `BLOCKED v1.5` (2026-09-10) — chờ `hrp-v6-ui-04c1-footer-tweak-r2` `ACCEPTED`

### Lane / Audit
- **STANDARD** (UI thuần — dùng demo fixture có cấu trúc)
- Audit mode: **FOCUSED**

### Outcome
Thứ tự homepage cuối cùng: Navbar → Hero/Search → BestJobs → Areas → RecruitingProjects → Việc làm mới nhất (REAL) → Giới thiệu HRP (DEMO) → Dải đối tác/minh họa (DEMO) → Tin tức & cẩm nang (DEMO) → Banner trải nghiệm trên di động (DEMO) → ReferralStrip (nền peach) → Footer (3 cột)

### In-scope
- 5 section component trong Task D (Section 1 REAL NewestJobsSection + Section 2..5 DEMO HrpIntroSection, PartnerStripSection, NewsSection, MobileBannerSection). CMS Admin V6 AV6 quản trị 4 section DEMO (Giới thiệu HRP, Đối tác/minh họa, Tin tức/cẩm nang, Banner di động); Section 1 Việc làm mới nhất REAL từ overview.newest, không thuộc AV6
- Typed structured content (paragraphs/bullets) — KHÔNG SafeHtml tự viết
- View-model với `source: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING'`
- Local asset trong `public/images/landing/`
- Badge minh họa cho DEMO section

### Out-of-scope
- CMS schema/API/persistence (→ AV6)
- Tag tùy biến (DEFER)
- AV4 media (dùng chung)

### Acceptance criteria sơ bộ
- AC: 5 section trong Task D render đúng với view-model props
- AC: Demo section có badge "Minh họa" visible
- AC: Mobile responsive không overflow
- AC: Việc làm mới nhất: max 6 tin thật từ `overview.newest`
- AC: Structured content rendering — KHÔNG HTML string, KHÔNG SafeHtml
- AC: Asset local tại `public/images/landing/` — không URL ngoài

### Gates
- `npm run typecheck` exit 0
- `npm run test:unit` (new failure count = 0)
- `npm run build` exit 0
- `verify-task.ps1` PASS
- `verify-handoff.ps1` PASS

---

## TASK D.A — Trang chi tiết UI (`hrp-v6-ui-04d-detail-ui`)

### Status: `DRAFT` (sau TASK C)

### Lane / Audit
- **STANDARD** (UI nâng cấp với demo view-model)
- Audit mode: **FOCUSED**

### Outcome
Nâng cấp route `/viec-lam/[slug]/page.tsx` theo ảnh reference (giữ nhận diện cam HRP/HuongB). Thêm các section editorial với view-model props từ `field-matrix.md`:
1. Search/breadcrumb (giữ route thật)
2. Tóm tắt tin (title, mã, kỳ tuyển, lương min/max, age range, location, job type, slots)
3. Thư viện ảnh (gallery có order, cover, alt, status)
4. Giới thiệu + mô tả công việc (HTML safe-render)
5. Lương, thưởng, phúc lợi nhà máy
6. Hỗ trợ HRP (optional, ẩn khi null)
7. Thông tin dành cho CTV (AFF-gated, ẩn khi chưa mở AFF)
8. Hồ sơ, yêu cầu, lưu ý
9. Sidebar đơn vị tuyển dụng (tên hiển thị, logo allowed, address, map)
10. Hướng dẫn ứng tuyển (CTA phản ánh flow thật)
11. CTA trên/dưới (apply modal/flow thật, share URL canonical, yêu thích optional)
12. Việc làm liên quan (data public eligible thật, sort/pagination rõ)
13. Banner cuối (tái dùng section C)

### In-scope
- `app/(jobs)/viec-lam/[slug]/page.tsx`: thêm section editorial với `EditorialContent` props từ field-matrix
- Container `max-w-[1080px] mx-auto` (đồng bộ composition/footer v1.4 RQ-11; KHÔNG dùng 1200px)
- `src/domains/job-board/public-types.ts`: export canonical types
- `src/domains/job-board/fixtures/demo-editorial.ts`: fixture cho từng trường
- `src/domains/job-board/components/detail-sections/` (mới): sub-components cho từng section

### Out-of-scope
- Editor form, schema mới, API write, persistence (sang D.B)
- Content sections (Giới thiệu, Tin tức, banner mobile) trên detail page tái dùng section C

### Acceptance criteria sơ bộ
- AC: 13 section render theo view-model props
- AC: Container `max-w-[1080px]` (đồng bộ homepage)
- AC: Nhận diện cam HRP/HuongB giữ nguyên
- AC: Demo content có nhãn "Demo" / "Minh họa"
- AC: Hết hạn/đủ người/ẩn tin xử lý đúng
- AC: Related jobs lấy data public eligible thật
- AC: Test long content, thiếu optional, mobile, related data ít hơn một trang, ảnh lỗi

### Gates
- `npm run typecheck` exit 0
- `npm run test:unit` (new failure count = 0)
- `npm run build` exit 0
- `verify-task.ps1` PASS
- `verify-handoff.ps1` PASS

---

## TASK D.B — Editor Admin/Sale + Schema/API/Permission (`hrp-v6-ui-04d-detail-editor`)

### Status: `DRAFT` (sau TASK D.A)

### Lane / Audit
- **CRITICAL** (schema/API/permission thay đổi)
- Audit mode: **DEEP sâu schema/permission/API changed surface**

### Outcome
Editor tin Admin/Sale đầy đủ trường theo `field-matrix.md` §5 (EditorialContent). Draft/preview/publish, scope Sale, ADMIN publish, revision/concurrency, audit, media management.

### In-scope
- `prisma/schema.prisma`: thêm bảng `JobPosting` với `status enum (DRAFT/PENDING_REVIEW/PUBLISHED/UNPUBLISHED/ARCHIVED)`, `publishedAt`, `revision`, `createdById`, FK to `JobOpening`
- `prisma/schema.prisma`: thêm bảng `Media` (id, url, alt, caption, order, status, ownerId) + `MediaAssignment` (n-N với JobPosting)
- `prisma/schema.prisma`: thêm các field editorial vào JobPosting (title, introHtml, jobDescriptionHtml, salaryDescription, etc.) — **additive only**
- `prisma/migrations/<date>_detail_editor/migration.sql`: ADD-only + RLS policies
- Server-side safe-render cho HTML editorial (allowlist tags)
- `/api/admin/job-postings/[id]/route.ts`: GET (own scope), PATCH (own scope, draft only), POST publish (ADMIN only)
- `/api/admin/job-postings/[id]/preview/route.ts`: GET preview only, no index, no public
- `/api/admin/job-postings/[id]/media/route.ts`: POST upload, DELETE, PATCH order
- `/app/admin/jobs/[id]/edit/page.tsx`: editor form đầy đủ trường
- Sale scope enforcement: check `ProjectAssignment` table (Tier 2 verify schema chính xác)
- Audit log: actor/action/time
- Cache invalidation: revalidateTag on publish

### Out-of-scope
- CMS homepage content (Plan Admin V6 #2)
- Tag tùy biến (Plan Admin V6 #3, DEFER sau UI-05)
- Public read API mở rộng (D.A scope)

### Acceptance criteria sơ bộ
- AC: Admin/Sale nhập đủ từng nhóm trường → lưu → mở lại còn nguyên → preview → người có quyền publish → route chi tiết hiển thị đúng nội dung
- AC: Sửa/lưu bản nháp không đổi live cho đến publish
- AC: Sale không thể sửa/publish vượt quyền hoặc xem draft ngoài scope bằng API trực tiếp (test direct API call)
- AC: Người chưa đăng nhập không đọc draft (test)
- AC: Card homepage/listing/detail đồng nhất lương, đơn vị, tiêu đề, lifecycle
- AC: Slug/canonical/metadata/redirect giữ contract cũ
- AC: Safe-render cho HTML editorial (allowlist tags)
- AC: Migration ADD-only

### Gates
- `npm run typecheck` exit 0
- `npm run test:unit` (new failure count = 0)
- `npm run build` exit 0
- `npx prisma validate` exit 0
- `npx prisma generate` exit 0
- `verify-task.ps1` PASS
- `verify-handoff.ps1` PASS
- Permission integration test: Sale edit/publish scope riêng; ADMIN all

---

## Plan Admin V6 — Sau Plan UI

| Sub-task | Tên | Phạm vi | Tier 1 viết TASK khi |
|---|---|---|---|
| `AV1` | Editor tin extend (extend từ D.B) | Thêm variants, polish UI editor | Sau D.B |
| `AV2` | Editor JobPosting (canonical mapping hiện hành) | Schema + form + write API + permission cho JobPosting editorial fields | AV1 |
| `AV6` | CMS homepage content (Tier 0 review v2 chốt tên, work item đã thêm) | Editor 4 section Plan C (Giới thiệu HRP, Đối tác/minh họa, Tin tức/cẩm nang, Banner di động). Schema `HomepageSection` + form + API + media + publish + preview. **KHÔNG** gộp vào AV2 | Sau UI Task D section-render + AV4 (media foundation), AV1 nếu dùng chung HomepageSettings adapter |
| `AV3` | Tag tùy biến | Sau UI-05 — đối chiếu roadmap V6 trước | Sau V6 priority |
| `AV4` | Media management (extend từ D.B4) — foundation chung, đứng trước các editor | Centralized media library + folder + tags; serve cả JobPosting và HomepageSection | (none — foundation, chuẩn bị song song với AV1) |
| `AV5` | Cache invalidation + integration test | Tag-based revalidation; integration test cho từng section | Sau AV1, AV2, AV4, AV6 |

---

## Reference

- Tier 0 chỉ thị:
  - `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`
  - `docs/prompts/TIER0_UI04_HOME_COMPOSITION_FOOTER.md`
  - `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md` (UI04C mandate)
  - `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/tier0-review-ui04c-contracts-v1.md` (Tier 0 review v1 REVISION_REQUIRED)
- Plan tổng thể: `evidence/plan-overview.md`
- Field matrix: `evidence/field-matrix.md`
- Plan Admin V6 (Tier 0 chốt tên `AV6` tại review v2; lịch sử label planning tạm là `AV-CMS`): `evidence/plan-admin-v6.md`
- TASK A: `docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md`
- TASK B: `docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md`
- Interaction R2: `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` (đầu chuỗi)
- TASK C composition/footer: `docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` (ACCEPTED v1.4 @ `04b767e`)
- TASK 04c1 footer tweak r2: `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md` (DRAFT v0.1 — BLOCKED_OWNER)
- TASK R3 urgent live + ribbon: `docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/TASK.md` (ACCEPTED v1.3 @ `8c6fd03`)
- TASK D section-render: `docs/tasks/hrp-v6-ui-04d-section-render/TASK.md` (BLOCKED v1.5 — chờ 04c1 ACCEPTED)
- Visual correction R1 (VIS-01..03): `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/TASK.md` (ACCEPTED)

---

## Revision Log

- 10/09/2026: Tier 1 đồng bộ residue theo Tier 0 verdict `docs/prompts/TIER0_UI04_R3_CLOSEOUT_VERDICT.md` §5:
  - **TASK B**: `DRAFT` → `ACCEPTED (18919da)`
  - **TASK C composition/footer**: `DRAFT` → `ACCEPTED v1.4 (04b767e)`
  - **TASK D section-render**: `DRAFT` → `BLOCKED v1.5` (chờ 04c1 ACCEPTED)
  - **Thêm mới TASK 04c1 footer tweak r2**: `DRAFT v0.1`, `BLOCKED_OWNER`, FAST lane, skeleton invariant guard ghi rõ scope không revert
  - **Thêm mới TASK R3**: `ACCEPTED v1.3 (8c6fd03)`
  - **TASK D.A in-scope/AC**: container `1200px` → `max-w-[1080px]` (đồng bộ composition/footer v1.4 RQ-11; bỏ reference "đồng bộ A1")
  - Reference list: thêm 04c1 + R3, ghi commit hash cho C và R3
- 10/09/2026 (round 2): Tier 1 nhận 16 Owner decisions tại `evidence/owner-footer-r2-decisions.md`; finalize 04c1 contract v1.0; đồng bộ:
  - **TASK 04c1**: `DRAFT v0.1, BLOCKED_OWNER` → `READY_FOR_EXECUTION v1.0` (verify-task PASS)
  - Outcome: thay placeholder bằng 16 Owner decisions (#1 peach đậm hơn /20; #2 3 cột giữ; #3 mobile stack; #4 5 dịch vụ; #5-7 hotline/email/website; #8 địa chỉ; #9 form disabled; #10 helper text mới; #11 CTA; #12 copyright mới; #13 routes; #14 semantic disabled; #15 44px + 390px; #16 container)
  - Skeleton invariant: thêm panel liên hệ cam ấm + heading labels mới + bỏ row "Bị chặn"
