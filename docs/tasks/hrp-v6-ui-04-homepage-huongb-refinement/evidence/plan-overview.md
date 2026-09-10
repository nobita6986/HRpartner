# Plan tổng thể — UI-04 Homepage Refinement + Admin V6 + Detail Page

Ngày: 10/09/2026. Cập nhật theo Tier 0 chỉ thị mới nhất:
- `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md` (tách 2 plan)
- `docs/prompts/TIER0_UI04_HOME_COMPOSITION_FOOTER.md` (composition + footer)
- `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md` (UI04C mandate: Task C + sửa plan Admin V6 + flip interaction card)

> **Tách đúng hai plan**:
> - **Plan UI (public)**: A → B → C → D, một Tier 2 stream, nghiệm thu UI riêng, dùng dữ liệu thật có sẵn hoặc demo có cấu trúc.
> - **Plan Admin V6**: editor + CMS + schema/API + permission + publish. Tích hợp sau, là exit gate riêng.

> **Một Tier 2 stream**. Hai plan không tự cấp quyền làm song song.

> **Hợp đồng dữ liệu dùng chung** (`evidence/field-matrix.md`) — Tier 1 khóa sớm kiểu dữ liệu tiền/đơn vị, ngày, gallery, publish status, settings, pagination.

---

## 1. Sơ đồ 2 plan

```
┌────────────────────────────────────────────────────────────────┐
│ Plan UI (public) — Tier 1 viết TASK A ngay                    │
│                                                                │
│ A. Visual Polish (Navbar + BestJobs + Recruiting + A16 search)│
│    └── STANDARD / FOCUSED                                       │
│ B. Pagination + Admin Config (read-only query + UI)            │
│    └── CRITICAL (schema + permission)                          │
│ C. Section Renderer + Demo Content (nội dung cấu trúc)         │
│    └── STANDARD / FOCUSED (UI only)                            │
│ D. Trang chi tiết + Editor Admin/Sale (UI trước, editor sau) │
│    └── A_Detail UI: STANDARD/FOCUSED; B_Editor: CRITICAL      │
│                                                                │
│ Mỗi task đều có UI_READY / INTEGRATION_PENDING seam cho data  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Plan Admin V6 — Sau khi Plan UI đạt A_Detail UI              │
│                                                                │
│ 1. Editor tin Admin/Sale (canonical fields, draft/preview/    │
│    publish, scope Sale, lifecycle, public DTO)                │
│ 2. CMS homepage content (Giới thiệu, banner, news, đối tác)   │
│ 3. Tag tùy biến (theo lộ trình V6)                            │
│ 4. Media: upload + quản lý asset + URL validation + alt text  │
│ 5. Cache invalidation + integration test cho từng section     │
│                                                                │
│ Exit gate: Admin/Sale nhập → lưu → preview → publish →        │
│ public hiển thị đúng. KHÔNG phải blocker của UI nghiệm thu.   │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Lát cắt A → B → C → D (Plan UI)

Tier 1 chốt chuỗi **Interaction R2 → Composition/Footer → Section Renderer → D** tuần tự, một Tier 2 stream.

> **Thứ tự Tier 0 đã khóa**: interaction R2 (card flip) → composition/footer → section-render. Chỉ interaction R2 được chuyển READY_FOR_EXECUTION sau khi cả 3 contract PASS gate.

### Interaction R2 — Job-card flip interaction (STANDARD/FOCUSED) — đầu chuỗi

**In-scope** (theo Tier 0 review v1 §6 + owner-live-visual-review-r1.md):
- `featured-job-card.tsx`: vùng lương/action flip sang CTA `Ứng tuyển nhanh` khi hover/focus
- CTA gọi ApplyModal hiện có — không tạo modal mới
- Click vùng card còn lại → `/viec-lam/{slug}`
- Semantic HTML: không nested interactive element
- Keyboard: Tab + focus indicator, screen reader không đọc đồng thời salary và CTA
- Touch/mobile: CTA truy cập được mà không cần hover
- `prefers-reduced-motion`: bỏ 3D rotation
- Preview card: CTA disabled/"Bản xem trước"
- Card không salary: mặt trước "Lương thương lượng"

**Ghi chú**: Interaction R2 là predecessor cho composition/footer và section-render — cả hai phụ thuộc card đã hoàn thiện.

---

### Task C — Composition + Footer (`hrp-v6-ui-04c-home-composition-footer`) (FAST, NONE audit)

**In-scope** (theo Tier 0 §Khảo sát + Tier 0 review v1):
- Xóa section inline list (grid/sentinel/append) + dead state
- **Giữ `runQuery`** — là bootstrap public DUY NHẤT cấp facets/overview cho Hero/Areas/Recruiting/section mới
- Hero + applyArea navigate tới `/viec-lam` bằng `useRouter().push(buildListingHref({ q, area, shift, offset: 0 }))`
- Salary select `disabled` label "Mức lương — sắp có"
- ReferralStrip xuống cuối nội dung, nền peach/cam nhạt
- GlobalFooter rebuild 3 cột (Công ty + Dịch vụ + Liên hệ disabled), nền peach nhạt hơn ReferralStrip

**Out-of-scope**: CMS, schema, API, permission, AV1, AV6

---

### Task D — Section Renderer + Demo Content (`hrp-v6-ui-04d-section-render`) (STANDARD, FOCUSED)

### Task A — Visual Polish + Search Card Trắng (STANDARD/FOCUSED)

**In-scope**:
- Navbar: container `max-w-[1200px]` (A1), height `h-16` (A2), login text link (A3), logo+menu gom cụm trái (A4)
- BestJobs card: logo `rounded-xl + border + bg-white` 64px (A5), ribbon sát góc `rounded-bl-lg` + icon `local_fire_department` (A6), salary thanh rộng + icon `payments` (A7), giữ `đ/giờ` (A8), section icon `local_fire_department + circle` (A9), thêm "Xem tất cả" `/viec-lam` (A10)
- Recruiting: icon `apartment` trong vòng tròn nhẹ (A11), giữ monogram 64px (A12), **bỏ eyebrow + bỏ sub-heading kỹ thuật** (A13), copy `{n} vị trí đang mở` → **`Cần tuyển {n} người`** với `n = availableSlots` (A14)
- **A16 search card nền trắng** (mới): bỏ `bg-white/10 backdrop-blur-md` glass, dùng `bg-white` nền, label tối `text-on-surface`, input border nhẹ `border-outline-variant`, CTA cam `bg-primary-container`. Giữ hero cam nền, recruitment highlight glass.
- Audit mode: **STANDARD / FOCUSED** (A15)

**Out-of-scope A**: pagination thật, tab filter, admin config, tag tùy biến, "Việc làm mới nhất" section, Giới thiệu HRP, dải đối tác, Tin tức, banner mobile, trang chi tiết (D), Admin editor.

**Gates A**:
- `npm run typecheck` exit 0
- `npm run test:unit -- public-card-truth` PASS
- `npm run test:unit` (expected failure set = baseline + new failure count = 0)
- `npm run build` exit 0
- Visual parity: **Owner live review post-push** (giữ override mới nhất)
- Regression check: navbar dùng chung trên tất cả route portal + trang chi tiết

---

### Task B — Pagination thật + Admin Config (CRITICAL)

**In-scope**:
- Tab filter BestJobs: `Tất cả` + `Tuyển gấp`, default = `Tất cả` (B1)
- Logic lọc `Tuyển gấp` = `urgency === 'URGENT'` (B2, **chỉ URGENT, KHÔNG bao gồm CLOSING** — Owner prompt điều chỉnh §B2)
- Pagination control: prev/next thay trang (B3), BestJobs fetch riêng từ `/api/jobs` (B4)
- Homepage page size: default 9 (B5, **Owner điều chỉnh từ 3 → 9**, layout 3 hàng × 3 desktop theo demo1), range `{3, 6, 9, 12}` (B6)
- Listing page size: default 12 (B7), range integer `[6..50]` (B8, **B8 chỉ là lựa chọn mật độ, không bảo đảm tránh trang rỗng**)
- Homepage search `append/load-more` (B9, **giữ**) vs SSR `/viec-lam` có pagination URL (`listingPageSize` áp dụng cả hai bằng cách kiểm tra loader)
- Schema `HomepageSettings` (B10): singleton row + **invariant DB** (Tier 1 khóa id canonical, validation, missing row, concurrent update, cache — KHÔNG `@default("default") @unique` đơn thuần)
- Permission ADMIN (B11): dùng cơ chế hiện có `permission-resolver`, enforce server-side, public chỉ đọc projection. **KHÔNG phát minh SUPER_ADMIN**
- Audit mode: **CRITICAL** với audit sâu trên schema/permission/data changed surface (B13, không quét toàn repo)

**Scope mở B4** (Owner điều chỉnh §B4):
- Mở scope `/api/jobs` cho filter URGENT trước pagination
- Giữ invariant eligibility/public projection và backward compatibility
- **KHÔNG client-filter một trang hoặc overview 6 tin**
- Bỏ non-goal cũ cấm sửa API/service trong TASK A

**Out-of-scope B**: editor CMS, schema JobPosting fields, tag tùy biến (DEFER UI-05), content sections (C).

**Gates B**: như A + migration validation (`npx prisma migrate diff`, `npx prisma validate` exit 0) + permission integration test.

---

### Task C — Section Renderer + Demo Content có cấu trúc (STANDARD/FOCUSED)

**In-scope** (theo Tier 0 §Khảo sát):
1. **Giới thiệu HRP** (split image/text + 4 ô giá trị)
2. **Dải đối tác/minh họa** (logo strip với HRP/nhận diện trung tính + nhãn "Minh họa")
3. **Tin tức & cẩm nang** (1 bài lớn + 2 bài nhỏ, ảnh local, title/excerpt/category — fixture "Nội dung mẫu")
4. **Banner di động** (về trải nghiệm HRP trên mobile, CTA dùng route thật, link store optional cho Admin)
5. **Việc làm mới nhất** (tái dùng card polish, mặc định 6 tin thật từ `overview.newest`)

**Nguyên tắc demo content**:
- Tách bộ dữ liệu mẫu có kiểu rõ khỏi JSX; mỗi section nhận `props/view-model` có `id, enabled/order, content fields`
- Nhãn "Demo" / "Minh họa" hiển thị rõ ở section chứa nội dung mẫu (kể cả bản public)
- **Không lẫn fixture vào job live nhận ứng tuyển**
- Khi chưa có nội dung đã publish → renderer có chính sách demo/ẩn khai rõ; KHÔNG fallback im lặng từ lỗi API sang nội dung giả
- Tin tuyển dụng, slot, mức lương vẫn từ API thật

**Thứ tự homepage theo demo1**:
1. Navbar (A)
2. Hero/search (A16)
3. **Việc làm tốt nhất** (A + B)
4. **Dự án đang tuyển** (A)
5. **Việc làm mới nhất** (C, mới)
6. **Việc làm theo khu vực** (C, tái dùng AreasSection)
7. **Giới thiệu HRP** (C, mới)
8. **Dải đối tác/minh họa** (C, mới)
9. **Cộng tác viên** (A, giữ ReferralStrip — bỏ floating income claim)
10. **Tin tức & cẩm nang** (C, mới)
11. **Banner trải nghiệm trên di động** (C, mới)
12. **Footer** (giữ)

**Out-of-scope C**: editor CMS, publish/unpublish, schema mới cho CMS, tag tùy biến, related jobs trên trang chi tiết (D).

**UI_READY / INTEGRATION_PENDING seam**:
- Mỗi section nhận `props` có cấu trúc `{ source: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING', ... }`
- Tier 2 gắn nhãn UI_READY khi UI render đúng với props
- Tier 2 gắn nhãn INTEGRATION_PENDING khi chưa có data thật — tier UI được nghiệm thu riêng (UI không phải feature end-to-end)

**Gates C**: như A + content rendering test với props REAL/DEMO/INTEGRATION_PENDING.

---

### Task D — Trang chi tiết + Editor Admin/Sale (A_Detail UI: STANDARD/FOCUSED, B_Editor: CRITICAL)

**Hai sub-task**:

#### D.A — Detail page UI (STANDARD/FOCUSED)

Theo Tier 0 §Bổ sung D + ảnh `screencapture-viec3mien-vn-viec-lam-chi-tiet-2026-09-10-08_57_09.png`:
- Nâng cấp route hiện `/viec-lam/[slug]/page.tsx` (KHÔNG tạo route cạnh tranh)
- Container 1200px (đồng bộ A1)
- Bố cục theo ảnh reference (giữ nhận diện cam HRP)
- Demo dùng `fixture/view-model` có cấu trúc cho các section editorial chưa có backend
- Tag UI_READY / INTEGRATION_PENDING

**Section theo ảnh reference (mapping field matrix)**:
1. Search/breadcrumb (giữ route thật)
2. Tóm tắt tin (tiêu đề, mã, kỳ tuyển, lương min/max, yêu cầu tuổi, địa điểm, loại việc, số người cần)
3. Thư viện ảnh (gallery có thứ tự, cover, alt, allowed public)
4. Giới thiệu + mô tả công việc (nội dung public riêng)
5. Lương, thưởng, phúc lợi nhà máy (lương cơ bản, phụ cấp, chuyên cần, tăng ca, bữa ăn, nhà ở/xe, bảo hiểm, thưởng có số tiền/đơn vị, điều kiện)
6. Hỗ trợ từ HRP (tư vấn/hồ sơ/đi lại/nhà trọ) — cho phép ẩn
7. Thông tin dành cho CTV (nội dung biên tập tùy chọn; AFF-gated)
8. Hồ sơ, yêu cầu và lưu ý (giấy tờ, thời hạn, giờ/ca, kinh nghiệm, kỹ năng)
9. Sidebar đơn vị tuyển dụng (tên hiển thị, logo allowed, địa chỉ public, map link)
10. Hướng dẫn ứng tuyển (CTA, phản ánh flow thật, không bắt đăng ký)
11. CTA trên/dưới (apply modal/flow thật, share, yêu thích)
12. Việc làm/dự án liên quan (data public eligible thật, sort/pagination rõ)
13. Banner cuối (tái dùng section C)

**Out-of-scope D.A**: editor form, schema mới, API write, persistence.

#### D.B — Editor Admin/Sale + Schema/API/Permission (CRITICAL)

Theo Tier 0 §D + roadmap V6:
- Editor tin Admin/Sale đầy đủ trường theo field matrix
- Draft/preview/publish, scope Sale (không tất cả dự án), ADMIN publish
- Revision/concurrency, audit actor/action/time, preview không public và không index
- JobOpening giữ nhu cầu vận hành; JobPosting sở hữu nội dung xuất bản (đã có schema từ `hrp-v6-p1-job-opening-posting-split`)
- Khảo sát model hiện (`prisma/schema.prisma` đã có `JobOpening`/`JobPosting`) → cần thêm editorial fields: title (riêng JobPosting), body, gallery, benefits, requirements, etc.
- Media upload + asset management + URL validation + alt text + safe render allowlist
- **Sale scope**: chỉ với dự án/tin thuộc scope được giao. Sale mặc định lưu draft + gửi duyệt; ADMIN publish
- **PUBLIC DTO MỚI** cho editorial fields → update `PublicJobDetailDto` + `toDetailDto` mapper

**Public read API/query bổ sung**:
- Filter URGENT (B4 — đã ghi ở trên)
- Sort ổn định + tie-breaker
- Page-size
- Published data
- Related jobs

**Out-of-scope D.B**:
- Content sections (Giới thiệu, Tin tức, banner mobile) → sang Admin CMS task riêng (Plan Admin V6 #2)
- Tag tùy biến → sang Plan Admin V6 #3 (lát cắt riêng)

---

## 3. Hợp đồng dữ liệu dùng chung — `evidence/field-matrix.md`

Tier 1 soạn field matrix định nghĩa các trường public ↔ model ↔ form ↔ API ↔ validation ↔ DTO ↔ component ↔ trạng thái REAL/DEMO/INTEGRATION_PENDING.

Tier 1 khóa sớm:
- **Tiền/đơn vị**: lương là `number (VND/giờ)`; hiển thị với prefix `đ/giờ` — KHÔNG tự quy đổi giờ → tháng
- **Ngày**: ISO string cho cross-machine, locale VN cho UI
- **Gallery**: `Media[]` có `{ id, url, alt, order, status: 'public' | 'internal' }`
- **Publish status**: `'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED'`
- **Settings**: 1 row `HomepageSettings` với invariant DB
- **Pagination**: cursor-based hoặc offset-based (Tier 2 chốt trong TASK B)

---

## 4. Phân lane

| Task | Lane | Audit mode |
|---|---|---|
| A | STANDARD | FOCUSED |
| B | CRITICAL | DEEP trên schema/permission changed surface |
| Interaction R2 | STANDARD | FOCUSED |
| C composition/footer | FAST | NONE |
| D section-render | STANDARD | FOCUSED |
| D.A Detail UI | STANDARD | FOCUSED |
| D.B Editor | CRITICAL | DEEP trên schema/permission/API changed surface |

**Nguyên tắc**: chỉ nâng CRITICAL vì phần backend có migration/auth. Phần UI thuần không tự nâng CRITICAL.

---

## 5. Out-of-scope toàn plan

- Không thay đổi `src/domains/job-board/public.service.ts` ngoài các scope được mở trong B4/D.B
- Không thay đổi `ApplyModal` / `SuccessModal` / `DetailApplyCta` ngoài style đồng bộ
- Không thay đổi route `/login`, `/ve-chung-toi`, `/ctv-portal` (chỉ style consistency)
- Không xóa/chỉnh sửa `prisma/schema.prisma` NGOÀI B (HomepageSettings) + D.B (editorial fields)
- Không mở song song hai plan
- Không commit/push/deploy chỉ từ chỉ thị planning (Tier 2 chỉ làm theo TASK contract)

---

## 6. Visual gate

Visual review theo **Owner override hiện hành** (post-push live review). KHÔNG phục hồi gate ảnh cũ (Edge/CDP/20 PNG/overlay/bbox). Tier 2 KHÔNG tự coi bản demo là production-ready hay ký PASS bằng test.

---

## 7. Bàn giao Tier 1 lần này

Tier 1 cập nhật tài liệu lần này:
1. `evidence/plan-overview.md` (file này) — plan tổng thể 2 plan + A→B→C→D
2. `evidence/field-matrix.md` — hợp đồng dữ liệu chung UI ↔ Admin
3. `evidence/cut-plan.md` — **CẬP NHẬT** bỏ đề xuất gộp Phase A+B (giờ là 4 task riêng)
4. `evidence/OWNER_APPROVAL_REQUIRED.md` — **CẬP NHẬT** điều chỉnh 28 quyết định theo Tier 0 (A11=Apartment, A12=64px, A14=Cần tuyển, A16 search card trắng, B2=URGENT only, B5=default 9, B6={3,6,9,12}, B8=integer 6..50, B10=invariant DB, B11=ADMIN thuần, B13=CRITICAL sâu changed surface)
5. `TASK-A.md` — viết TASK A contract ngay, giao Tier 2
6. `skeleton/B-C-D.md` — skeleton các task sau với dependency
