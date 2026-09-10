# Owner Approval Required — UI-04 Homepage Refinement

Ngày: 10/09/2026. **CẬP NHẬT** theo Tier 0 chỉ thị mới (`docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`).

> Các quyết định hình thức và nội dung giữ nguyên từ ký lần trước; chỉ điều chỉnh theo hướng dẫn mới và **tách 2 plan độc lập** (UI public vs Admin V6) với chuỗi A→B→C→D.

> Tier 1 soạn TASK A ngay, không cần hỏi lại các quyết định đã chốt.

---

## Task A — Visual Polish + Search Card Trắng

### A1 — Container max-width

| Chọn | Giá trị |
|---|---|
| ✅ | **1200px chính xác** (Owner điều chỉnh: không ghi tương đương 1280px. Padding nằm trong chiều rộng border-box.) |

### A2 — Navbar height

| Chọn | Giá trị |
|---|---|
| ✅ | h-16 (64px) |

### A3 — Login button style

| Chọn | Style |
|---|---|
| ✅ | Text link (`font-label-md text-label-md text-on-surface hover:text-primary-container`) |

### A4 — Logo spacing trong navbar

| Chọn | Layout |
|---|---|
| ✅ | Logo + menu cùng cụm trái, auth cụm phải (`flex items-center gap-8`) |

### A5 — BestJobs logo border/padding

| Chọn | Style |
|---|---|
| ✅ | `w-16 h-16 rounded-xl border border-outline-variant p-2 bg-white` — khớp reference |

### A6 — Ribbon style trên BestJobs card

| Chọn | Style |
|---|---|
| ✅ | Sát góc `absolute top-0 right-0 rounded-bl-lg bg-primary-container text-white flex items-center gap-1` + `local_fire_department` icon 14px |

### A7 — Salary bar trên BestJobs card

| Chọn | Style |
|---|---|
| ✅ | `bg-surface-container-low rounded-xl p-3 flex items-center justify-center gap-2` + `payments` icon 20px |

### A8 — Salary unit

| Chọn | Đơn vị |
|---|---|
| ✅ | **đ/giờ** (giữ nguyên, không quy đổi sang tháng) |

### A9 — Section header icon BestJobs

| Chọn | Icon |
|---|---|
| ✅ | `local_fire_department` trong `w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center` |

### A10 — "Xem tất cả" link

| Chọn | Hành vi |
|---|---|
| ✅ | Có — link đến `/viec-lam` (route listing thật đã kiểm tra) |

### A11 — Recruiting section icon

| Chọn | Icon |
|---|---|
| ✅ | **`apartment` trong vòng tròn nhẹ** (điều chỉnh — gần hình thức demo, vẫn gọi "Dự án đang tuyển") |

### A12 — Recruiting logo size

| Chọn | Size |
|---|---|
| ✅ | **Giữ monogram 64px**, đặt trong vùng nhận diện thoáng. **Không dùng nhận định chưa đo "Foxconn 56px"** làm evidence. Không nhân bản border hai lớp. |

### A13 — Recruiting eyebrow / sub-heading

| Chọn | Xử lý |
|---|---|
| ✅ | **Bỏ cả eyebrow + bỏ sub-heading**, chỉ heading + icon. Không thêm claim "dự án trọng điểm" khi chưa có căn cứ. |

### A14 — Recruiting slot copy

| Chọn | Copy |
|---|---|
| ✅ | **`Cần tuyển {n} người`**, với `n = availableSlots`. Slot là số người cần, không phải số chức danh/vị trí khác nhau. |

### A15 — Audit mode Task A

| Chọn | Mode |
|---|---|
| ✅ | STANDARD / FOCUSED |

### A16 — Search card nền trắng (mới)

| Chọn | Hành vi |
|---|---|
| ✅ | Nền khung chứa toàn form search màu trắng như HuongB. Bỏ nền cam trong suốt/glass ở search wrapper. Dùng nhãn tối rõ, input border nhẹ, CTA cam. Giữ nền hero cam và recruitment highlight riêng. Giữ filter/submit/focus/mobile hoạt động, không để label trắng trên nền trắng. |

---

## Task B — Pagination + Admin Config

### B1 — Tab filter BestJobs

| Chọn | Hành vi |
|---|---|
| ✅ | Có tab `Tất cả` + `Tuyển gấp`, default = `Tất cả` |

### B2 — Logic lọc "Tuyển gấp"

| Chọn | Logic |
|---|---|
| ✅ | **Chỉ `urgency === 'URGENT'`** (điều chỉnh — CLOSING = sắp đóng/hết hạn, không tự nhập chung Tuyển gấp. Ribbon và tab dùng cùng ngữ nghĩa.) |

### B3 — Pagination control style

| Chọn | Style |
|---|---|
| ✅ | Prev/Next thay trang |

### B4 — BestJobs fetch strategy

| Chọn | Strategy |
|---|---|
| ✅ | Fetch riêng từ `/api/jobs`. **Mở scope query/service `/api/jobs` cho filter URGENT trước pagination** (điều chỉnh — bỏ non-goal cũ cấm sửa API/service). Giữ invariant eligibility/public projection và backward compatibility; không client-filter một trang hoặc overview 6 tin. |

### B5 — BestJobs page size default

| Chọn | Default |
|---|---|
| ✅ | **9** (điều chỉnh từ 3 → 9 — bố cục 3 hàng × 3 desktop theo demo1) |

### B6 — BestJobs page size range

| Chọn | Range |
|---|---|
| ✅ | `{3, 6, 9, 12}` |

### B7 — Listing page size default

| Chọn | Default |
|---|---|
| ✅ | 12 |

### B8 — Listing page size range

| Chọn | Range |
|---|---|
| ✅ | **integer 6..50** (điều chỉnh — đây là lựa chọn mật độ, không phải bảo đảm có dữ liệu hay tránh trang rỗng) |

### B9 — Search list pagination (Danh sách việc làm) vs SSR `/viec-lam`

| Chọn | Xử lý |
|---|---|
| ✅ | **Phân biệt rõ**: homepage search giữ append/load-more; SSR `/viec-lam` có pagination URL. `listingPageSize` áp dụng cả hai bằng cách kiểm tra loader. Giữ kiểu navigation riêng hiện có và metadata/URL của SSR, không biến SSR thành append. |

### B10 — Schema HomepageSettings

| Chọn | Schema |
|---|---|
| ✅ | Singleton row + **invariant DB** (điều chỉnh — `@default("default") @unique` KHÔNG bảo đảm chỉ một row; Tier 1 khóa id canonical bằng invariant DB thích hợp). Trường số có validation, xử lý missing row, concurrent update, cache. Không xây generic settings platform. |

### B11 — Admin permission

| Chọn | Permission |
|---|---|
| ✅ | **ADMIN qua cơ chế quyền hiện có**, enforce server-side (điều chỉnh — không phát minh SUPER_ADMIN). Public chỉ đọc projection các giá trị cần hiển thị, không đọc endpoint quản trị hoặc metadata nội bộ. |

### B12 — Tag tùy biến

| Chọn | Xử lý |
|---|---|
| ✅ | **Hoãn sang lát cắt riêng sau**, không mặc định chiếm slug UI-05 trước khi đối chiếu roadmap. |

### B13 — Audit mode Task B

| Chọn | Mode |
|---|---|
| ✅ | **CRITICAL với audit sâu trên schema/permission/data thay đổi** (điều chỉnh — không quét lại toàn repo) |

---

## Task C — Section Renderer + Demo Content

### C1 — Section thứ tự homepage

| Chọn | Thứ tự |
|---|---|
| ✅ | navbar → hero/search → **Việc làm tốt nhất** → **Dự án đang tuyển** → **Việc làm mới nhất** → **Việc làm theo khu vực** → **Giới thiệu HRP** → **Dải đối tác/minh họa** → **Cộng tác viên** → **Tin tức & cẩm nang** → **banner trải nghiệm trên di động** → footer |

### C2 — Demo content nhãn rõ

| Chọn | Xử lý |
|---|---|
| ✅ | Mỗi section demo render badge "Demo" / "Minh họa". Tin tuyển dụng, slot, mức lương vẫn từ API thật. Demo không ghi vào DB nghiệp vụ. Khi chưa có nội dung published, renderer có chính sách demo/ẩn khai rõ; không fallback im lặng. |

### C3 — Section renderer props structure

| Chọn | Cấu trúc |
|---|---|
| ✅ | Mỗi section nhận `props/view-model` có `id, enabled/order, content fields, source: 'REAL' \| 'DEMO' \| 'INTEGRATION_PENDING'`. Seam để gắn CMS sau, không phải page builder. |

### C4 — Audit mode Task C

| Chọn | Mode |
|---|---|
| ✅ | STANDARD / FOCUSED |

---

## Task D — Trang chi tiết + Editor Admin/Sale

### D.A — Detail page UI

#### D.A1 — Section theo reference ảnh `screencapture-viec3mien-vn-viec-lam-chi-tiet-2026-09-10-08_57_09.png`

| Chọn | Section |
|---|---|
| ✅ | Search/breadcrumb, tóm tắt tin, thư viện ảnh, giới thiệu + mô tả, lương/thưởng/phúc lợi, hỗ trợ HRP (optional), thông tin CTV (AFF-gated), hồ sơ/yêu cầu/lưu ý, sidebar đơn vị tuyển dụng, hướng dẫn ứng tuyển, CTA trên/dưới (apply modal/flow thật, share, yêu thích chỉ mở khi persistence rõ), việc làm liên quan (data eligible thật), banner cuối |

#### D.A2 — Container

| Chọn | Width |
|---|---|
| ✅ | 1200px (đồng bộ A1) |

#### D.A3 — Nhận diện

| Chọn | Hành vi |
|---|---|
| ✅ | Giữ cam HRP/HuongB. Không sao chép thương hiệu/màu/mức thưởng Việc 3 Miền. |

#### D.A4 — Audit mode D.A

| Chọn | Mode |
|---|---|
| ✅ | STANDARD / FOCUSED |

### D.B — Editor Admin/Sale (CRITICAL)

#### D.B1 — Editor đầy đủ trường

| Chọn | Hành vi |
|---|---|
| ✅ | Form nhập/sửa đủ trường editorial theo `field-matrix.md`: title, body, gallery, benefits, requirements, company info, age range, salary description, etc. Draft/preview/publish, scope Sale (chỉ với dự án/tin thuộc scope được giao, không tất cả dự án). ADMIN publish. |

#### D.B2 — Sale workflow mặc định

| Chọn | Hành vi |
|---|---|
| ✅ | Sale lưu draft + gửi duyệt (status=PENDING_REVIEW); ADMIN publish. Tier 2 verify quyền publish hiện có trước khi khóa matrix. |

#### D.B3 — Concurrency + audit

| Chọn | Hành vi |
|---|---|
| ✅ | Revision tăng khi save, optimistic lock; audit actor/action/time. Preview không public, không index. Slug/canonical/metadata/redirect giữ contract cũ. |

#### D.B4 — Media

| Chọn | Hành vi |
|---|---|
| ✅ | Upload + quản lý asset, validation URL, alt text, order, status (public/internal). Safe-render allowlist. Không lưu/render script/raw HTML. Không lọt thông tin nội bộ ra DTO public. |

#### D.B5 — Demo data → job thật

| Chọn | Hành vi |
|---|---|
| ✅ | Demo KHÔNG dùng làm job thật nhận ứng tuyển. Fixture tham khảo chỉ preview/test. |

#### D.B6 — Audit mode D.B

| Chọn | Mode |
|---|---|
| ✅ | **CRITICAL** — schema/API/permission thay đổi. Audit sâu trên changed surface. Không thêm vào allowlist A/C bằng lý do "chỉ làm giao diện". |

---

## Plan Admin V6 (sau Plan UI)

### AV1 — Editor tin Admin/Sale (extend từ D.B)

### AV2 — CMS homepage content

Các section trong Plan C: Giới thiệu HRP, Dải đối tác, Tin tức & cẩm nang, Banner mobile. Schema + form + API + media + publish.

### AV3 — Tag tùy biến (DEFER sau UI-05)

### AV4 — Media management (extend từ D.B4)

### AV5 — Cache invalidation + integration test

| Chọn | Hành vi |
|---|---|
| ✅ | Tag `homepage-settings` + revalidateTag on write. Integration test cho mỗi section: Admin/Sale nhập → lưu → preview → publish → public hiển thị đúng. |

---

## Tóm tắt ký lần trước (28 quyết định) — đã chốt

Theo Tier 0 §Quyền tiếp tục: **A1–A15, B1–B13 đã chốt trong bảng ký cuối**. Bảng ký này ưu tiên khi khác nhau. Tier 1 soạn TASK A ngay, không cần hỏi lại.

Cập nhật cuối cùng (Tier 0 chỉ thị mới §Điều chỉnh):
- A11: `apartment` trong vòng tròn nhẹ
- A12: giữ monogram 64px
- A13: bỏ cả eyebrow + sub-heading
- A14: `Cần tuyển {n} người`, n = availableSlots
- A16: search card nền trắng (mới)
- B2: chỉ URGENT (CLOSING riêng)
- B5: mặc định 9 (3 hàng × 3 desktop)
- B6: {3, 6, 9, 12}
- B8: integer 6..50
- B10: singleton + invariant DB
- B11: ADMIN thuần qua cơ chế hiện có
- B13: CRITICAL sâu changed surface

---

## Ký xác nhận

| Quyết định | Owner chọn |
|---|---|
| A1–A16 | ✅ (theo bảng trên) |
| B1–B13 | ✅ |
| C1–C4 | ✅ (đề xuất) |
| D.A1–D.A4 | ✅ (đề xuất) |
| D.B1–D.B6 | ✅ (đề xuất) |
| AV1–AV5 | ✅ (backlog — sau Plan UI) |

Tier 1 soạn TASK A ngay.
