# Quyết định còn thiếu — cần Owner trước `/code`

Ngày: 10/09/2026. Tier 1 trình Owner trước khi viết TASK.md.

---

## Quyết định A — Lát cắt delivery

**Câu hỏi**: Tier 1 đề xuất **A + B trong 1 task** (visual polish + pagination thật + admin config). Owner muốn tách hay gộp?

| Option | Owner chọn? |
|---|---|
| A + B gộp trong 1 task (CRITICAL lane) | ⬜ |
| A trước (visual polish), B sau (pagination+admin) — 2 task | ⬜ |

**Tier 1 note**: Nếu Owner muốn nhanh, chỉ làm Phase A trước cũng OK — nhưng "số tin mỗi trang do Admin cấu hình" và "pagination thật" sẽ chưa đạt.

---

## Quyết định B — Navbar container width

**Câu hỏi**: Navbar + toàn bộ container dùng `max-width` bao nhiêu?

| Option | Owner chọn? |
|---|---|
| `max-w-[1200px]` (Owner prompt §1 gợi ý 1200px) | ⬜ |
| `max-w-[1140px]` (Owner prompt §1 gợi ý thử) | ⬜ |
| Giữ `max-w-[1600px]` như hiện tại | ⬜ |

**Tier 1 note**: `1200px` ≈ `max-w-7xl` ≈ 1280px. Reference code.html dùng `max-w-7xl` (1280px). Owner prompt §1 nói "1200px là điều chỉnh mới" — Tier 1 đề xuất 1200px.

---

## Quyết định C — BestJobs page size (Admin config)

**Câu hỏi**: Giá trị mặc định cho `homepageBestJobs.pageSize` (số tin hiển thị ở BestJobs section)?

| Option | Owner chọn? |
|---|---|
| **3** (giữ nguyên hiện tại — `.slice(0, 3)`) | ⬜ |
| 6 | ⬜ |
| 9 | ⬜ |
| 12 | ⬜ |

**Khoảng hợp lệ**: Tier 1 đề xuất `{3, 6, 9, 12}` (chia hết cho 3-col grid). Owner đồng ý?

| Option | Owner chọn? |
|---|---|
| `{3, 6, 9, 12}` ✅ | ⬜ |
| `{3, 6, 9, 12, 15, 18}` (multi của 3) | ⬜ |
| `[3..12]` integer bất kỳ | ⬜ |

---

## Quyết định D — Listing page size (Admin config)

**Câu hỏi**: Giá trị mặc định cho `publicListing.pageSize`?

| Option | Owner chọn? |
|---|---|
| **12** (giữ nguyên PAGE_SIZE hiện tại) | ⬜ |
| 6 | ⬜ |
| 24 | ⬜ |

**Khoảng hợp lệ**: API clamp là `1..50`. Tier 1 đề xuất `[6..50]` (tối thiểu 6 để không bị page trống quá).

| Option | Owner chọn? |
|---|---|
| `[6..50]` ✅ | ⬜ |
| `[3..50]` | ⬜ |
| `[1..50]` | ⬜ |

---

## Quyết định E — Login button style

**Câu hỏi**: Đổi nút "Đăng nhập" từ outline button thành text link — có OK không?

Hiện tại: `hrp-btn-outline hrp-focus px-4 min-h-11 border rounded-lg` (button outline có viền)
Reference: text link `font-label-md text-label-md text-on-surface hover:text-primary-container` (không viền, không nền)

**Regression**: Nếu có route portal khác dùng GlobalNavbar → tất cả đều đổi theo. Có route nào dùng GlobalNavbar mà bị ảnh hưởng xấu không?

| Option | Owner chọn? |
|---|---|
| Đổi sang text link ✅ | ⬜ |
| Giữ outline button như hiện tại | ⬜ |

---

## Quyết định F — Salary unit trên card

**Câu hỏi**: Giữ `đ/giờ` hay đổi sang `đ/tháng` để khớp demo?

Reference code.html dùng `/ tháng` (line 297). Tuy nhiên Owner prompt §2 nói rõ: **"Giữ đơn vị lương thật (giờ/tháng); không chuyển lương giờ thành tháng chỉ để giống demo"**.

Tier 1 hiểu: nếu dữ liệu là lương giờ thật → hiển thị `đ/giờ`. Nếu dữ liệu là lương tháng thật → hiển thị `đ/tháng`. Không tự quy đổi.

| Option | Owner chọn? |
|---|---|
| **GIỮ `đ/giờ`** (theo Owner prompt §2) | ⬜ |
| Đổi sang `đ/tháng` để khớp demo | ⬜ |

---

## Quyết định G — Tab filter trên BestJobs

**Câu hỏi**: BestJobs có tab `Tất cả` / `Tuyển gấp` không? Nếu có, tab nào active mặc định?

Reference code.html không có tab filter (chỉ 3 card static). Nhưng Owner prompt §2 yêu cầu: **"Tab ban đầu đề xuất `Tất cả` và `Tuyển gấp`"**.

| Option | Owner chọn? |
|---|---|
| **Có tab `Tất cả` + `Tuyển gấp`**, default = `Tất cả` | ⬜ |
| Có tab nhưng default = `Tuyển gấp` | ⬜ |
| Không có tab (chỉ prev/next pagination) | ⬜ |

**`Tuyển gấp` filter logic**: `badgeType === 'urgent' || urgency === 'URGENT' || 'CLOSING'` (dùng `urgency` đã có trong DTO, DEC-04 P0-01). Owner đồng ý logic này?

| Option | Owner chọn? |
|---|---|
| **Sử dụng `urgency === 'URGENT' || 'CLOSING'`** ✅ | ⬜ |
| Chỉ `urgency === 'URGENT'` | ⬜ |

---

## Quyết định H — Pagination style cho BestJobs

**Câu hỏi**: Dùng prev/next hay append (load-more)?

Owner prompt §2: **"Nút trước/sau phía dưới BestJobs hoạt động thật, không carousel giả chỉ xoay 3 hoặc 6 tin overview. Ưu tiên trước/sau thay trang đúng hình thức demo."**

Tier 1 đề xuất: **prev/next thay trang** (đúng hình thức demo), **không phải** append/load-more.

| Option | Owner chọn? |
|---|---|
| **Prev/Next thay trang** ✅ | ⬜ |
| Append/load-more | ⬜ |

**BestJobs fetch riêng hay dùng chung data với search list?**
- Hiện tại: BestJobs lấy từ `overview.newest` (6 items cứng từ service)
- Pagination thật cần: fetch riêng với `limit=pageSize&offset=0` trên `/api/jobs`
- Cách khác: dùng intersection of `overview.newest` data + điều khiển page client-side

| Option | Owner chọn? |
|---|---|
| **Fetch riêng từ `/api/jobs`** ✅ (clean, đúng REST semantics) | ⬜ |
| Client-side page trên `overview.newest` (giới hạn 6 items — KHÔNG cho phép page nhiều hơn 2) | ⬜ |

**Tier 1 note**: Nếu chọn client-side paging trên overview (6 items) → chỉ có tối đa 2 trang (3 items/page). Fetch riêng cho phép page nhiều hơn (ví dụ 6 items/page × N pages). Tier 1 đề xuất fetch riêng.

---

## Quyết định I — Logo trên BestJobs card

**Câu hỏi**: Logo trên card có giữ `HrMonogram` hay đổi sang `company logo thật`?

Owner prompt §2 nói: **"Không mặc định mở toàn bộ CMS tag trong task polish"** — và trước đó Owner đã chốt (DEC-04 P0-01) là dùng `HrMonogram`.

| Option | Owner chọn? |
|---|---|
| **Giữ `HrMonogram`** ✅ (Owner DEC-04) | ⬜ |
| Thử dùng `company logo thật` nếu có trong DTO | ⬜ |

---

## Quyết định J — Recruiting section icon

**Câu hỏi**: Icon nào cho section heading "Dự án đang tuyển"?

| Option | Owner chọn? |
|---|---|
| `engineering` (hiện tại) | ⬜ |
| `apartment` | ⬜ |
| `work_outline` | ⬜ |
| `business` | ⬜ |
| Không có icon | ⬜ |

---

## Quyết định K — Tag tùy biến (DEFER)

**Câu hỏi**: Tag tùy biến do Admin tạo — chốt DEFER sang task riêng?

Owner prompt §2: **"Tag tùy biến là yêu cầu tương lai"** — Tier 1 đề xuất DEFER sang task UI-05.

Tier 1 trình mô hình tối thiểu để Owner chốt DEFER:
- `JobTag` entity: `{id, name, color, createdById, createdAt}`
- Assignment: nhiều tag cho nhiều job
- Card hiển thị: tag được gán + urgency badge (2 thứ khác nhau)
- Scope của UI-04: chỉ để placeholder/interface, không cài data model

| Option | Owner chọn? |
|---|---|
| **DEFER tag tùy biến sang UI-05** ✅ | ⬜ |
| Mở trong UI-04 luôn | ⬜ |

---

## Quyết định L — Tier 3 audit mode

**Câu hỏi**: Task dùng audit mode nào?

- Phase A (visual polish): **STANDARD / FOCUSED** (chỉ JSX/style, no schema/permission)
- Phase B (pagination + admin config): **CRITICAL** (có schema migration + API + permission)

| Option | Owner chọn? |
|---|---|
| **CRITICAL** cho toàn bộ task (A + B) | ⬜ |
| STANDARD/FOCUSED cho Phase A, CRITICAL cho Phase B (2 audit riêng) | ⬜ |

---

## Checklist trước khi Tier 1 viết TASK.md

| # | Quyết định | Owner ký | Trạng thái |
|---|---|---|---|
| A | Lát cắt (gộp/tách A+B) | ⬜ | **Chờ Owner** |
| B | Container max-width (1200px) | ⬜ | **Chờ Owner** |
| C | BestJobs page size default + range | ⬜ | **Chờ Owner** |
| D | Listing page size default + range | ⬜ | **Chờ Owner** |
| E | Login button → text link | ⬜ | **Chờ Owner** |
| F | Salary unit giữ `đ/giờ` | ⬜ | **Chờ Owner** |
| G | Tab filter (Tất cả / Tuyển gấp) + default | ⬜ | **Chờ Owner** |
| H | Pagination style (prev/next) + BestJobs fetch riêng | ⬜ | **Chờ Owner** |
| I | Logo trên card (giữ HrMonogram) | ⬜ | **Chờ Owner** |
| J | Recruiting icon (`engineering`) | ⬜ | **Chờ Owner** |
| K | Tag tùy biến DEFER UI-05 | ⬜ | **Chờ Owner** |
| L | Audit mode (CRITICAL) | ⬜ | **Chờ Owner** |

Sau khi Owner ký đủ → Tier 1 viết TASK.md v1.0 + giao Tier 2.
