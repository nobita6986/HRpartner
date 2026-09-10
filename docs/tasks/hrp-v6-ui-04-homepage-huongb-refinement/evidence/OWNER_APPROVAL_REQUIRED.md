# Owner Approval Required — UI-04 Homepage Refinement

Ngày: 10/09/2026. **Cần Owner ký trước khi Tier 1 viết TASK.md.**

Tier 1 đề xuất 2 task riêng:
- **UI-04A**: Visual Polish (navbar + card styling)
- **UI-04B**: Pagination thật + Admin Config

---

## Task A — Visual Polish (`hrp-v6-ui-04a-visual-polish`)

### Quyết định A1 — Container max-width

Navbar + toàn bộ section container dùng `max-width` bao nhiêu?

| Chọn | Giá trị | Ghi chú |
|---|---|---|
| ⬜ | **1200px** | ~`max-w-[1200px]`, Owner prompt §1 đề xuất |
| ⬜ | 1140px | `max-w-[1140px]` |
| ⬜ | 1280px | `max-w-[1280px]` ≈ `max-w-7xl` (khớp reference code.html) |
| ⬜ | Giữ 1600px | Không thay đổi |

**Tier 1 đề xuất**: ⬜ **1200px** (Owner prompt §1)

---

### Quyết định A2 — Navbar height

| Chọn | Giá trị | Ghi chú |
|---|---|---|
| ⬜ | **h-16 (64px)** | Khớp reference code.html |
| ⬜ | Giữ h-20 (80px) | Hiện tại |

**Tier 1 đề xuất**: ⬜ **h-16**

---

### Quyết định A3 — Login button style

Nút "Đăng nhập" ở navbar phải thay đổi thành text link hay giữ nguyên?

| Chọn | Style | Ghi chú |
|---|---|---|
| ⬜ | **Text link** | `font-label-md text-label-md text-on-surface hover:text-primary-container` — khớp reference code.html |
| ⬜ | Giữ outline button | `hrp-btn-outline` như hiện tại |

**Tier 1 đề xuất**: ⬜ **Text link**

---

### Quyết định A4 — Logo spacing trong navbar

Logo và menu gom cùng cụm bên trái hay để `justify-between` như hiện tại?

| Chọn | Layout | Ghi chú |
|---|---|---|
| ⬜ | **Logo + menu cùng cụm trái, auth cụm phải** | `flex items-center gap-8` — khớp reference |
| ⬜ | Giữ `justify-between` như hiện tại | Khoảng trống lớn giữa logo và menu |

**Tier 1 đề xuất**: ⬜ **Gom cụm**

---

### Quyết định A5 — BestJobs logo border/padding

Logo trên card BestJobs đổi style theo reference?

| Chọn | Style | Ghi chú |
|---|---|---|
| ⬜ | **rounded-xl + border + bg-white** | `w-16 h-16 rounded-xl border border-outline-variant p-2 bg-white` — khớp reference code.html |
| ⬜ | Giữ HrMonogram nguyên bản | Không thêm border/bg |

**Tier 1 đề xuất**: ⬜ **rounded-xl + border + bg-white**

---

### Quyết định A6 — Ribbon style trên BestJobs card

Ribbon "Tuyển gấp" trên card đổi sang style sát góc theo reference?

| Chọn | Style | Ghi chú |
|---|---|---|
| ⬜ | **Sát góc trên-phải + có icon** | `absolute top-0 right-0 rounded-bl-lg bg-primary-container text-white flex items-center gap-1` + `local_fire_department` icon 14px — khớp reference |
| ⬜ | Giữ pill tròn hiện tại | `rounded-full` ở góc trên-phải, không icon |

**Tier 1 đề xuất**: ⬜ **Sát góc + icon**

---

### Quyết định A7 — Salary bar trên BestJobs card

Thanh lương đổi thành thanh rộng theo reference?

| Chọn | Style | Ghi chú |
|---|---|---|
| ⬜ | **Thanh rộng + icon payments** | `bg-surface-container-low rounded-xl p-3 flex items-center justify-center gap-2` + `payments` icon 20px — khớp reference |
| ⬜ | Giữ pill nhỏ như hiện tại | `rounded-full px-3 py-1 inline-flex` |

**Tier 1 đề xuất**: ⬜ **Thanh rộng + icon**

---

### Quyết định A8 — Salary unit

Đơn vị lương hiển thị `đ/giờ` hay `đ/tháng`?

| Chọn | Đơn vị | Ghi chú |
|---|---|---|
| ⬜ | **đ/giờ** | Dữ liệu là lương giờ — giữ nguyên. Owner prompt §2 cấm quy đổi giờ→tháng. |
| ⬜ | đ/tháng | Quy đổi theo tỷ lệ (không khuyến khích) |

**Tier 1 đề xuất**: ⬜ **đ/giờ**

---

### Quyết định A9 — Section header icon BestJobs

| Chọn | Icon | Ghi chú |
|---|---|---|
| ⬜ | **local_fire_department + circle** | `w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center` + `local_fire_department` — khớp reference |
| ⬜ | Giữ `workspace_premium` hiện tại | |

**Tier 1 đề xuất**: ⬜ **local_fire_department + circle**

---

### Quyết định A10 — "Xem tất cả" link trên BestJobs

Có thêm link "Xem tất cả" ở header BestJobs không?

| Chọn | Hành vi | Ghi chú |
|---|---|---|
| ⬜ | **Có** | Link đến route `/viec-lam` (listing page thật) |
| ⬜ | Không | Giữ nguyên |

**Tier 1 đề xuất**: ⬜ **Có**

---

### Quyết định A11 — Recruiting section icon

| Chọn | Icon | Ghi chú |
|---|---|---|
| ⬜ | `engineering` | Hiện tại |
| ⬜ | `apartment` | |
| ⬜ | `work_outline` | |
| ⬜ | Không có icon | |

**Tier 1 đề xuất**: ⬜ **`engineering`**

---

### Quyết định A12 — Recruiting logo size

Logo HRP monogram trên card Recruiting đổi kích thước?

| Chọn | Size | Ghi chú |
|---|---|---|
| ⬜ | **56px (size={56})** | Khớp reference Foxconn ~`w-14 h-14` |
| ⬜ | Giữ 64px hiện tại | |

**Tier 1 đề xuất**: ⬜ **56px**

---

### Quyết định A13 — Recruiting eyebrow / sub-heading

Eyebrow "Cơ hội mới" và sub-heading của Recruiting section xử lý thế nào?

| Chọn | Xử lý | Ghi chú |
|---|---|---|
| ⬜ | **Bỏ eyebrow, bỏ sub-heading kỹ thuật** | Giữ heading "Dự án đang tuyển" thôi. Sub-heading mới: "Cơ hội làm việc tại các dự án trọng điểm." |
| ⬜ | Giữ eyebrow + sub-heading hiện tại | "Cơ hội mới" + "Các dự án đang mở tuyển, hiển thị số slot thật từ dữ liệu HRP." |

**Tier 1 đề xuất**: ⬜ **Bỏ eyebrow + copy mới**

---

### Quyết định A14 — Recruiting slot copy

| Chọn | Copy | Ghi chú |
|---|---|---|
| ⬜ | **{n} vị trí đang mở** | Hướng người tìm việc, Owner prompt §3 |
| ⬜ | Giữ `{n} slot đang mở` hiện tại | |

**Tier 1 đề xuất**: ⬜ **{n} vị trí đang mở**

---

### Quyết định A15 — Audit mode Task A

| Chọn | Mode | Ghi chú |
|---|---|---|
| ⬜ | **STANDARD / FOCUSED** | Chỉ JSX/style changes, không schema/permission |
| ⬜ | FAST | Nếu thay đổi rất nhỏ |

**Tier 1 đề xuất**: ⬜ **STANDARD / FOCUSED**

---

## Task B — Pagination + Admin Config (`hrp-v6-ui-04b-pagination-admin`)

### Quyết định B1 — Tab filter trên BestJobs

BestJobs có tab filter `Tất cả` / `Tuyển gấp` không?

| Chọn | Hành vi | Ghi chú |
|---|---|---|
| ⬜ | **Có tab `Tất cả` + `Tuyển gấp`** | Default = `Tất cả` |
| ⬜ | Có tab nhưng default = `Tuyển gấp` | |
| ⬜ | Không có tab | Chỉ prev/next pagination |

**Tier 1 đề xuất**: ⬜ **Có, default = Tất cả**

---

### Quyết định B2 — Logic lọc "Tuyển gấp"

Tab "Tuyển gấp" lọc theo logic nào?

| Chọn | Logic | Ghi chú |
|---|---|---|
| ⬜ | **`urgency === 'URGENT' || urgency === 'CLOSING'`** | Dùng field `urgency` đã có trong DTO (DEC-04 P0-01) |
| ⬜ | Chỉ `urgency === 'URGENT'` | Không include 'CLOSING' |

**Tier 1 đề xuất**: ⬜ **`URGENT` || `CLOSING`**

---

### Quyết định B3 — Pagination control style

BestJobs dùng prev/next hay append/load-more?

| Chọn | Style | Ghi chú |
|---|---|---|
| ⬜ | **Prev/Next thay trang** | Đúng hình thức demo. Owner prompt §2 ưu tiên. |
| ⬜ | Append/load-more | |

**Tier 1 đề xuất**: ⬜ **Prev/Next**

---

### Quyết định B4 — BestJobs fetch strategy

Dùng API call riêng cho BestJobs pagination hay dùng chung data với search list?

| Chọn | Strategy | Ghi chú |
|---|---|---|
| ⬜ | **Fetch riêng từ `/api/jobs`** | Gọi `GET /api/jobs?limit={pageSize}&offset={offset}` riêng cho BestJobs. Clean, đúng REST. |
| ⬜ | Client-side paging trên `overview.newest` (tối đa 6 items = 2 pages) | Hạn chế: chỉ 2 trang max |

**Tier 1 đề xuất**: ⬜ **Fetch riêng**

---

### Quyết định B5 — BestJobs page size mặc định

Admin config: giá trị mặc định cho `homepageBestJobs.pageSize`?

| Chọn | Default | Ghi chú |
|---|---|---|
| ⬜ | **3** | Giữ nguyên hiện tại |
| ⬜ | 6 | |
| ⬜ | 9 | |
| ⬜ | 12 | |

**Tier 1 đề xuất**: ⬜ **3**

---

### Quyết định B6 — BestJobs page size range

Khoảng hợp lệ cho BestJobs page size?

| Chọn | Range | Ghi chú |
|---|---|---|
| ⬜ | **{3, 6, 9, 12}** | Chia hết cho 3-col grid. Owner prompt §2 đề xuất. |
| ⬜ | {3, 6, 9, 12, 15, 18} | Multi của 3 |
| ⬜ | [3..12] integer bất kỳ | |

**Tier 1 đề xuất**: ⬜ **{3, 6, 9, 12}**

---

### Quyết định B7 — Listing page size mặc định

Admin config: giá trị mặc định cho `publicListing.pageSize`?

| Chọn | Default | Ghi chú |
|---|---|---|
| ⬜ | **12** | Giữ nguyên PAGE_SIZE hiện tại |
| ⬜ | 6 | |
| ⬜ | 24 | |

**Tier 1 đề xuất**: ⬜ **12**

---

### Quyết định B8 — Listing page size range

Khoảng hợp lệ cho listing page size?

| Chọn | Range | Ghi chú |
|---|---|---|
| ⬜ | **[6..50]** | API clamp `1..50`. Tối thiểu 6 để tránh page trống. |
| ⬜ | [3..50] | |
| ⬜ | [1..50] | |

**Tier 1 đề xuất**: ⬜ **[6..50]**

---

### Quyết định B9 — Search list pagination (Danh sách việc làm)

"DanH sách việc làm" (search results) giữ append/load-more hay đổi sang prev/next?

| Chọn | Style | Ghi chú |
|---|---|---|
| ⬜ | **Giữ append/load-more** | Search list dùng sentinel + load-more (hiện tại). User search thường muốn đọc hết. |
| ⬜ | Đổi sang prev/next | |

**Tier 1 đề xuất**: ⬜ **Giữ append/load-more**

---

### Quyết định B10 — Schema cho HomepageSettings

Admin config: dùng Prisma model nào để lưu settings?

| Chọn | Schema | Ghi chú |
|---|---|---|
| ⬜ | **Singleton row** | `HomepageSettings` table với `id String @default("default") @unique`. Có `bestJobsPageSize Int`, `listingPageSize Int`. Chỉ 1 row. |
| ⬜ | JSON trong SystemSetting | Nếu đã có `SystemSetting` table |
| ⬜ | File-based config | `config/homepage.json` trong project |

**Tier 1 đề xuất**: ⬜ **Singleton row**

---

### Quyết định B11 — Admin permission

Ai được phép thay đổi homepage settings?

| Chọn | Permission | Ghi chú |
|---|---|---|
| ⬜ | **role === 'ADMIN'** | Dùng permission resolver hiện có |
| ⬜ | role === 'ADMIN' \|\| role === 'SUPER_ADMIN' | Nếu có SUPER_ADMIN trong hệ thống |

**Tier 1 đề xuất**: ⬜ **role === 'ADMIN'**

---

### Quyết định B12 — Tag tùy biến (Admin)

Tag do Admin tạo — xử lý thế nào?

| Chọn | Xử lý | Ghi chú |
|---|---|---|
| ⬜ | **DEFER sang task UI-05** | Chưa có data model. Owner prompt §2 gọi là "yêu cầu tương lai". |
| ⬜ | Mở trong UI-04B luôn | |

**Tier 1 đề xuất**: ⬜ **DEFER sang UI-05**

---

### Quyết định B13 — Audit mode Task B

| Chọn | Mode | Ghi chú |
|---|---|---|
| ⬜ | **CRITICAL** | Có schema migration + API + permission |
| ⬜ | STANDARD | |

**Tier 1 đề xuất**: ⬜ **CRITICAL**

---

## Tóm tắt Tier 1 đề xuất

### Task A (Visual Polish)
- A1: 1200px
- A2: h-16
- A3: Login → text link
- A4: Logo + menu gom cụm trái
- A5: Logo rounded-xl + border + bg-white
- A6: Ribbon sát góc + icon
- A7: Salary thanh rộng + icon
- A8: Giữ đ/giờ
- A9: local_fire_department + circle
- A10: Có link "Xem tất cả"
- A11: engineering
- A12: 56px
- A13: Bỏ eyebrow + copy mới
- A14: {n} vị trí đang mở
- A15: STANDARD/FOCUSED

### Task B (Pagination + Admin)
- B1: Có tab Tất cả + Tuyển gấp, default = Tất cả
- B2: urgency === URGENT || CLOSING
- B3: Prev/Next
- B4: Fetch riêng từ /api/jobs
- B5: Default = 3
- B6: Range {3, 6, 9, 12}
- B7: Default = 12
- B8: Range [6..50]
- B9: Giữ append/load-more cho search list
- B10: Singleton row HomepageSettings
- B11: role === 'ADMIN'
- B12: DEFER sang UI-05
- B13: CRITICAL

---

## Owner ký xác nhận

Owner điền ⬜ cho mỗi quyết định. Sau khi ký đủ → Tier 1 viết TASK.md cho Task A trước.

| Quyết định | Owner chọn |
|---|---|
| A1 | ⬜ |
| A2 | ⬜ |
| A3 | ⬜ |
| A4 | ⬜ |
| A5 | ⬜ |
| A6 | ⬜ |
| A7 | ⬜ |
| A8 | ⬜ |
| A9 | ⬜ |
| A10 | ⬜ |
| A11 | ⬜ |
| A12 | ⬜ |
| A13 | ⬜ |
| A14 | ⬜ |
| A15 | ⬜ |
| B1 | ⬜ |
| B2 | ⬜ |
| B3 | ⬜ |
| B4 | ⬜ |
| B5 | ⬜ |
| B6 | ⬜ |
| B7 | ⬜ |
| B8 | ⬜ |
| B9 | ⬜ |
| B10 | ⬜ |
| B11 | ⬜ |
| B12 | ⬜ |
| B13 | ⬜ |

**Owner ký**: _________________________ **Ngày**: ____________
