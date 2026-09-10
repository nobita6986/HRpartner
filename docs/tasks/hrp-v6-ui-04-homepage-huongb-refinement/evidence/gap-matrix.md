# Gap matrix — `hrp-v6-ui-04-homepage-huongb-refinement`

Ngày khảo sát: 10/09/2026. Khảo sát tại HEAD `4d9a633` (sau khi UI-03 R2 + audit đã push).
Không code, không stage; chỉ đo từ source + reference `code.html` + DESIGN.md.

Ký hiệu:
- **Current**: trạng thái code hiện tại (HEAD `4d9a633`)
- **Reference**: `scratch/new-ui-HuongB-ref-2026-09-07/code.html` + `DESIGN.md`
- **Target**: đề xuất Tier 1 (chưa phải chốt, cần Owner duyệt)

---

## Nhóm 1 — Navbar + container width

| # | Aspect | Current | Reference | Target (đề xuất) |
|---|---|---|---|---|
| N1.1 | Container max-width | `max-w-[1600px]` (line 112 GlobalNavbar.tsx) | `max-w-7xl` (≈ 1280px, line 187 + 200 code.html) | **1200px** (Owner điều chỉnh — Owner prompt §1) |
| N1.2 | Container horizontal padding desktop | `md:px-[5%]` (line 112) | `px-margin-desktop` (24px scale, line 187 code.html) | `md:px-6` (24px) |
| N1.3 | Container padding mobile | `px-6` (24px) | `margin-mobile` 16px scale | `px-4` (16px) |
| N1.4 | Navbar height | `h-20` (80px, line 114) | `h-16` (64px, line 187 code.html) | **h-16** đồng bộ reference |
| N1.5 | Logo height | `40px` style inline | `h-10 w-auto` (40px, line 187) | Giữ 40px |
| N1.6 | Menu typography | inline style `font-medium` 1 dòng | `font-label-md text-label-md` (Inter 14px, line 191 code.html) | `font-label-md text-label-md` rõ ràng (Inter 14px, semibold/semibold bold) |
| N1.7 | Menu spacing | `space-x-6` (24px, line 124) | `gap-6` (24px, line 190 code.html) | `gap-6` |
| N1.8 | Logo–menu spacing | `justify-between` (line 114) — bỏ trống lớn | `flex items-center gap-8` (line 187) — nhóm logo+menu trái, auth phải | **Gom logo+menu cùng cụm trái** (gap-8) + auth cụm phải |
| N1.9 | Active link style | `border-b-2 border-primary-container` + `font-semibold` | `border-b-2 border-primary-container pb-1 font-bold` | Giữ, đổi sang font-bold cho khớp ref |
| N1.10 | Login style | `hrp-btn-outline hrp-focus px-4 min-h-11 border rounded-lg` (line 256) — button outline | text link `font-label-md text-label-md text-on-surface hover:text-primary-container` (line 199 code.html) | **Đổi sang text link** (no border, no bg) |
| N1.11 | Signup style | `bg-primary-container text-white px-5 min-h-11 rounded-lg` (line 262) — solid button | `bg-primary-container text-white px-4 py-2 rounded-lg` (line 200 code.html) | Giữ solid button; giảm padding |
| N1.12 | Disabled link `aria-disabled` | `button type=button aria-disabled=true title=… tabindex=-1 opacity-70 cursor-not-allowed` (line 137) | Ref không có disabled (nhưng Owner yêu cầu đánh dấu) | Giữ nguyên pattern đúng Owner verdict P0-02 |
| N1.13 | Mobile menu | hamburger + `<nav className="md:hidden">` với 1 col link list | Ref không show mobile rõ (responsive chỉ là ẩn/hiện) | Giữ hamburger, đồng bộ typography label-md |
| N1.14 | `hrp-skip` link | `href="#hrp-main"` đầu header (line 107) | không khai trong code.html | Giữ (a11y) |
| N1.15 | Sticky behavior | `sticky top-0 z-50` (line 102) | `sticky top-0 z-50` (line 186) | Giữ |

**Quyết định cần Owner (§ Open Questions của nhóm)**:
- N1.1: 1200px hay 1140px? (Tier 1 đề xuất 1200px theo Owner prompt §1)
- N1.10: confirm đổi Login sang text link (sẽ phá style `hrp-btn-outline` hiện tại — regression trên các route portal khác?)

---

## Nhóm 2 — Việc làm tốt nhất + ribbon/tag + pagination

| # | Aspect | Current | Reference | Target (đề xuất) |
|---|---|---|---|---|
| BJ1 | Số card desktop | `.slice(0, 3)` cứng (best-jobs-section.tsx line 44) | 3 cột `grid-cols-3 gap-gutter` (line 277) | **Pagination thật**, cố định 3 cột → dùng prev/next paging trang |
| BJ2 | Card border/shadow | `border border-outline-variant bg-surface p-5 shadow-card` (featured-job-card.tsx line 17) | `border border-outline-variant p-5 hover:shadow-md` | Đồng bộ `hover:shadow-md`; giữ `rounded-2xl` |
| BJ3 | Logo kích thước | `HrMonogram size={64}` (line 32) | `w-16 h-16 rounded-xl border border-outline-variant p-2 bg-white` (line 286) | **Đổi sang rounded-xl + border + bg-white** (giống ref) |
| BJ4 | Logo border/padding | không có border, không có bg trắng | `border border-outline-variant p-2 bg-white` (line 286) | Đồng bộ |
| BJ5 | Title typography | `font-head text-headline-md font-bold text-on-surface` (line 35) | `font-headline-md text-headline-md text-on-surface font-bold leading-tight mb-1 group-hover:text-primary-container` | `leading-tight mb-1` để khớp ref; giữ group-hover |
| BJ6 | Company name | `<p>HRP Việt Nam</p>` (line 37) | `text-primary-container mb-1` (line 288) — LUXSHARE ICT BẮC GIANG | Hiển thị "HRP Việt Nam" (vì chưa có public company name theo Owner mandate §9) |
| BJ7 | Location | `<span className="material-symbols-outlined">location_on</span> + location` (line 41-44) | giống ref | Giữ |
| BJ8 | Ribbon vị trí | `absolute right-4 top-4 rounded-full bg-primary-container px-3 py-1` (line 23) — pill tròn | `absolute top-0 right-0 bg-primary-container text-white px-3 py-1 rounded-bl-lg` (line 281) — ribbon sát góc trên-phải, **có icon `local_fire_department` 14px** | **Đổi sang ribbon sát góc `rounded-bl-lg` + icon** |
| BJ9 | Salary bar | `inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 font-bold text-primary-container` (line 48) — pill nhỏ | `bg-surface-container-low rounded-xl p-3 flex items-center justify-center gap-2 mt-4` (line 296) — **thanh nền nhạt rộng p-3, có icon `payments` 20px** | **Đổi sang thanh rộng `rounded-xl p-3` + icon payments 20px** |
| BJ10 | Salary unit | `đ/giờ` (page.tsx line 54 salaryLabel) | `/ tháng` (line 297 code.html) | **GIỮ `đ/giờ`** (Owner prompt §2 — không quy đổi giờ → tháng để giống demo) |
| BJ11 | Tab filter (Tất cả / Tuyển gấp) | KHÔNG CÓ | KHÔNG CÓ rõ trong code.html | **THÊM tab `Tất cả` + `Tuyển gấp`** (Owner prompt §2) với nguồn filter rõ ràng |
| BJ12 | Nguồn filter `Tuyển gấp` | chưa có | — | `overview.newest.filter(urgency === 'URGENT' || 'CLOSING')` (DEC-04 P0-01 đã có sẵn `urgency`) |
| BJ13 | "Xem tất cả" link | KHÔNG CÓ | `text-primary-container hover:underline` (line 272) | **THÊM link `Xem tất cả`** ở header section (route `/viec-lam` thật) |
| BJ14 | Section header icon | `<span className="material-symbols-outlined">workspace_premium</span>` (line 28) | `<div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center"> + <span className="material-symbols-outlined">local_fire_department</span>` (line 268) | Đổi icon thành `local_fire_department` + bọc trong circle secondary-container |
| BJ15 | Section eyebrow | `Gợi ý cho bạn` (line 27) | không có eyebrow riêng (chỉ h2 + icon) | Có thể giữ hoặc đổi; đề xuất giữ "Gợi ý cho bạn" |
| BJ16 | Pagination control | KHÔNG CÓ ở BestJobs (chỉ load-more ở "Danh sách việc làm") | reference không show (chỉ 3 card) | **THÊM nút Trước/Sau** dưới BestJobs — prev/next thay trang (Owner prompt §2 ưu tiên) |
| BJ17 | Page size | PAGE_SIZE = 12 cứng (page.tsx line 36) | không khai | **PAGE_SIZE do Admin cấu hình** + persistent (Owner prompt §2) |
| BJ18 | Sort ổn định | `overview.newest` sort by `postedAt` desc + tie-break ID (service line 654) | n/a | Tái sử dụng — Tier 2 chỉ cần đảm bảo `nextOffset/prevOffset` paginated list giữ tie-break |
| BJ19 | Filter reset trang khi đổi tab | chưa có | n/a | Tab đổi → offset = 0, mode = 'replace' |
| BJ20 | Loading/error/empty | ĐÃ có cho "Danh sách việc làm" (page.tsx line 302-321) | n/a | Tái dùng pattern cho BestJobs paginated |
| BJ21 | Race-condition / response cũ ghi đè | đã có `AbortController` + `generationRef` (line 109-147) | n/a | Giữ pattern, mở rộng cho BestJobs fetch riêng |

**Quyết định cần Owner (§ Open Questions của nhóm)**:
- BJ11: tab nào ban đầu? (Tier 1 đề xuất `Tất cả` + `Tuyển gấp`)
- BJ16: prev/next hay append (load-more)? Tier 1 đề xuất prev/next — sạch UX, không nhầm với load-more của search list
- BJ17: giá trị mặc định bao nhiêu? Tier 1 đề xuất 12 (đúng PAGE_SIZE hiện tại)
- BJ cho search list hiện tại (`Danh sách việc làm`): cần prev/next hay vẫn load-more? Tier 1 đề xuất GIỮ load-more ở search list (vì user search thường đọc hết), nhưng tab BestJobs dùng prev/next.
- BJ BestJobs page-size riêng hay share với search? Tier 1 đề xuất 2 setting riêng: `homepageBestJobs.pageSize` + `publicListing.pageSize` (vì UX khác — BestJobs prev/next vs search load-more).

---

## Nhóm 3 — Row dự án (recruiting)

| # | Aspect | Current | Reference | Target (đề xuất) |
|---|---|---|---|---|
| RP1 | Số card | `.slice(0, 4)` (recruiting-projects-section.tsx line 45) | 4 cards ngang hàng (line 344 code.html) | Giữ 4 (DEC-04) |
| RP2 | Card border | `rounded-2xl border border-outline-variant bg-surface p-5 shadow-card` (line 47) | `rounded-xl border border-outline-variant p-4 flex flex-col items-center text-center gap-3 hover:border-primary-container` (line 350-358) | Đồng bộ `rounded-xl p-4` |
| RP3 | Logo | `HrMonogram size={64}` (line 50) | `w-14 h-14 rounded-lg bg-white border border-outline-variant p-2` (line 354) | Đổi sang `size={56}` (14×4=56) + `rounded-lg bg-white border p-2` để khớp Foxconn ref |
| RP4 | Title | `font-head text-headline-md font-bold text-on-surface` (line 51) | `font-headline-md text-headline-md font-bold text-on-surface` | Giữ |
| RP5 | Slot | `{n} slot đang mở` (line 53) | `flex items-baseline gap-2 mb-4` + `font-label-md text-label-md font-bold text-on-surface` (line 374) | Đổi sang: copy ngắn `{n} vị trí đang mở` + style font-bold text-on-surface (Owner prompt §3 hướng người tìm việc, bỏ "hiển thị số slot thật từ dữ liệu HRP") |
| RP6 | Section heading | `Dự án đang tuyển` (line 37) | "Top công ty hàng đầu" + eyebrow + image (line 343) | **GIỮ "Dự án đang tuyển"** (DEC-04 — không có public partner contract) |
| RP7 | Heading icon | `material-symbols-outlined engineering` (line 30) | `divine/icons` không khớp | Có thể đổi icon `apartment` hoặc `engineering` — Owner duyệt |
| RP8 | Eyebrow | `Cơ hội mới` (line 30) | `Đối tác chính thức` (line 343 — pill, không eyebrow) | Đề xuất bỏ eyebrow (không còn "Đối tác chính thức"); GIỮ semantic "Dự án đang tuyển" |
| RP9 | Sub-heading | `Các dự án đang mở tuyển, hiển thị số slot thật từ dữ liệu HRP.` (line 38) | — | **BỎ copy kỹ thuật** — đổi sang `Cơ hội làm việc tại các dự án trọng điểm.` (Owner prompt §3) |
| RP10 | Card link semantics | `<a href={buildHref(job.id)}>` tag a (line 43) | `<a href="#" className="group block">` (line 347) | Đổi thành Next `<Link>` cho khớp RQ-08 (RQ-10 trong UI-03 R2) |
| RP11 | Hidden if no data | `if (jobs.length === 0) return null;` (line 14) | n/a | Giữ |
| RP12 | Card border/shadow mobile 2-col → md 4-col | `grid-cols-2 md:grid-cols-4` (line 42) | `grid-cols-1 md:grid-cols-4` responsive | Đề xuất giữ 2-col mobile (4-col md) — đỡ rỗng quá trên 390px |

**Quyết định cần Owner (§ Open Questions của nhóm)**:
- RP3: confirm đổi logo 64→56 + `bg-white border p-2`?
- RP5: copy mới `{n} vị trí đang mở` OK chưa, hay giữ `{n} slot đang mở`?
- RP7: icon nào? (`engineering` / `apartment` / `work_outline` / khác)

---

## Nhóm 4 — Admin cấu hình + persistence

| # | Aspect | Current | Reference (code.html) | Target (đề xuất) |
|---|---|---|---|---|
| AS1 | Trang `/admin/settings` hiện tại | PLACEHOLDER (`app/admin/settings/page.tsx` — 5 nhóm "Chưa khả dụng", không có CRUD) | n/a (reference là public homepage) | **Thêm mục "Cấu hình Homepage"** (UI form + persistence) |
| AS2 | Persistence schema | Không có (`rg "HomepageSettings"` = 0 match) | n/a | **Cần schema mới** — `HomepageSettings` table (id=1 singleton) với `bestJobsPageSize`, `listingPageSize`, ... |
| AS3 | Page size mặc định | `PAGE_SIZE = 12` (hard-coded `app/(portal)/page.tsx`) | n/a | BestJobs default `3`, listing default `12` (giữ UX hiện tại) |
| AS4 | Khoảng hợp lệ | n/a | n/a | BestJobs: `3, 6, 9, 12` (chia hết cho 3-col). Listing: `6..50` (theo API clamp `1..50`) |
| AS5 | Cache invalidation | n/a | n/a | Public read qua query mới `getHomepageSettings()`; admin write → revalidate `homepage` tag |
| AS6 | Quyền Admin ghi | n/a | n/a | `role === 'ADMIN'` (xem `src/shared/auth/permission-resolver.ts` hiện có — chưa mở rộng) |
| AS7 | Validation server | n/a | n/a | Zod schema ở server route; clamp BestJobs ∈ {3,6,9,12}, listing ∈ [6..50] |
| AS8 | Tag tùy biến (Future) | KHÔNG CÓ — chỉ có `urgency` enum suy từ order.status | n/a | **DEFER sang task UI-05** — chỉ trình mô hình tối thiểu trong plan này |

**Quyết định cần Owner (§ Open Questions của nhóm)**:
- AS3: BestJobs page-size default 3 hay 6 hay 12?
- AS4: range `[3,6,9,12]` cho BestJobs đúng chưa? Hay mở rộng cho phép 1, 2?
- AS5: cache strategy OK chưa? (revalidate tag-based)
- AS6: permission resolver — tier 1 cần mở rộng permission schema cho "edit homepage settings" hay dùng `ADMIN` đã có?
- AS7: validation thư viện zod đã có trong repo? (Tier 1 chưa verify) Nếu chưa có → escalate.
- AS8 (tag): chốt defer UI-05 (đề xuất). Tier 1 trình mô hình tối thiểu để sếp duyệt.

---

## Cross-cutting observations (Tier 1 khảo sát)

1. **`evidence/screenshots/`** và **`evidence/scripts/`** (cũ) đã được dọn ở UI-03 R2 (theo DEC-11). Tier 1 xác nhận tại HEAD `4d9a633` KHÔNG còn.

2. **Working tree** tại HEAD `4d9a633`:
   - `?? docs/TIER0_HANOVER.md` — KHÔNG stage/sửa (Tier 0 file riêng)
   - `?? docs/reports/tier1-independent-app-assessment-2026-09-09.md` — KHÔNG stage/sửa

3. **Fence tests** trong `allowlist §11 OBR-02` của UI-03 — Tier 1 cần check xem nhóm nào chắc chắn fail nếu task này đổi component shape:
   - `public-ui-premium.static.test.ts` — chắc chắn fail nếu đổi BestJobs ribbon style, salary bar, tab filter, logo border/padding
   - `public-ui-token-parity.static.test.ts` — có thể fail nếu đổi className density
   - `public-card-truth.test.ts` — có thể fail nếu đổi BestJobs card content
   - `marketplace-inventory.static.test.ts` — có thể fail nếu đổi salary label (từ `đ/giờ` sang `đ/tháng` — nhưng Tier 1 quyết GIỮ `đ/giờ`)
   - `public-detail.static.test.ts` — ổn (BestJobs không ảnh hưởng detail route)
   - `public-listing.static.test.ts` — có thể fail nếu listing page cũng paginate theo cách mới
   - `tsc-program-boundary.static.test.ts` — ổn (đã fix `.claude` SKIP_DIRS)

4. **Regression cần khai** (Owner prompt §1):
   - Navbar dùng chung → trang chi tiết `/viec-lam/{code}`, các route portal khác đều có navbar mới
   - Hero `app/(portal)/page.tsx` không đổi structure (RQ-13 UI-03)
   - Search list "Danh sách việc làm" giữ load-more (BestJobs mới paginate riêng)
   - ApplyModal / SuccessModal không đổi (RQ-13)
   - `/admin/settings` đã là placeholder, có thể thêm mục "Cấu hình Homepage" mà không phá "Chưa khả dụng" các nhóm khác
