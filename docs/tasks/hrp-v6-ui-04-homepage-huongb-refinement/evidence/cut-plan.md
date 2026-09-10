# Cut plan — `hrp-v6-ui-04-homepage-huongb-refinement`

Ngày: 10/09/2026. Đề xuất Tier 1. Chờ Owner duyệt trước khi viết TASK.md contract.

---

## 1. Lát cắt đề xuất

Tier 1 đề xuất **2 giai đoạn** (cắt theo dependency thật):

### Phase A — Visual Polish (STANDARD / FOCUSED audit)

Mục tiêu: đạt visual parity với reference ở những phần không cần thay đổi contract data/pagination.

**In-scope**:
- Nhóm 1: Navbar typography (N1.4, N1.6, N1.9, N1.10), logo–menu spacing (N1.8), container width (N1.1–N1.3)
- Nhóm 2: Card style (BJ2, BJ3, BJ4, BJ5, BJ8, BJ9, BJ14), section header (BJ13, BJ14)
- Nhóm 3: Recruiting card style (RP2, RP3, RP5, RP9, RP10)
- Regression check: navbar dùng chung trên tất cả route portal

**Out-of-scope Phase A**:
- Pagination thật (BJ16, BJ17)
- Tab filter (BJ11, BJ12)
- Admin settings / persistence (Nhóm 4)
- Tag tùy biến (DEFER)
- "Xem tất cả" link (BJ13) — có thể làm sau nhưng trong Phase A cho đơn giản

**Đặc điểm Phase A**:
- Không chạm API/service/DTO/persistence
- Không thêm schema/database
- No new dependencies
- No new permissions/auth changes
- Only JSX/class/style changes

**Gates Phase A**:
- `npm run typecheck` exit 0
- `npm run test:unit -- public-card-truth` PASS
- `npm run test:unit` (expected failure set = baseline + new failure count = 0)
- `npm run build` exit 0
- Visual parity: **Owner live review** (post-push, same as UI-03)

---

### Phase B — Pagination thật + Admin Config (CRITICAL)

Mục tiêu: pagination thật ở BestJobs + cấu hình Admin.

**In-scope Phase B**:
- Nhóm 2: Tab filter `Tất cả` / `Tuyển gấp` (BJ11, BJ12)
- Nhóm 2: Prev/Next pagination control (BJ16)
- Nhóm 2: Admin-configured page size persistent (BJ17, Nhóm 4 AS1–AS7)
- API contract: thêm endpoint `/api/admin/homepage-settings` (GET/POST) — cần Prisma schema mới
- Fence tests cập nhật (nếu Phase A làm thay đổi test)

**Đặc điểm Phase B**:
- Có schema/database migration (CRITICAL lane)
- Có new API endpoint (CRITICAL lane)
- Có new permission check (CRITICAL lane)
- Admin persistence

**Đặc điểm Phase B — Deferred**:
- Tag tùy biến do Admin tạo (AS8) — tách sang UI-05 sau

---

## 2. Đề xuất Owner chọn lát cắt

| Option | Mô tả | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A only** | Chỉ visual polish (không pagination thật, không admin config) | Nhanh, ít rủi ro, chỉ là JSX/style | Không đạt được yêu cầu "pagination thật" và "số tin mỗi trang do Admin cấu hình" |
| **A + B** | Visual polish + pagination thật + admin config trong 1 task | Đạt mọi yêu cầu Owner, review 1 lần | Dài hơn, rủi ro CRITICAL lane (migration + permission) |
| **B only** | Skip visual polish, chỉ pagination + admin config | Owner đã duyệt UI-03 visual | Bỏ qua visual gap N1/N2/N3, user thấy navbar/logovẫn chưa khớp ref |
| **A → B sequential** | Visual polish trước, rồi pagination+admin | Đạt mọi yêu cầu, review theo phase | 2 task, 2 lần Owner review, 2 lần audit |

**Tier 1 đề xuất**: **A + B trong 1 task CRITICAL**
- Lý do: pagination + admin config phụ thuộc data flow từ service (đã có `overview.newest`/`overview.topPaid` làm source), và schema mới cần chạy migration 1 lần
- Phân tách A và B ra 2 task → Tier 2 phải chạy lại test migration 2 lần
- Nếu Owner muốn nhanh → chỉ làm Phase A trước (nhưng nhận nhược điểm)

---

## 3. Lý do cắt theo cách này

### Tại sao KHÔNG tách Phase A và Phase B hoàn toàn riêng?

1. **BestJobs card visual changes (BJ3, BJ4, BJ8, BJ9)** ảnh hưởng trực tiếp đến `featured-job-card.tsx` — nếu đổi card trong Phase A rồi đổi lại trong Phase B, sẽ có 2 round chỉnh card cùng 1 file
2. **Fence tests** phải cập nhật sau cả 2 phase — tách 2 task → 2 lần cập nhật test cùng file
3. **Admin settings form** cần thêm vào `/admin/settings` — đã touch `/admin/settings/page.tsx` nên merge vào 1 task

### Tại sao visual polish KHÔNG thuộc UI-03?

- UI-03 đã push (`4d9a633`) — không tự revert
- Navbar hiện tại (`max-w-[1600px]`, `h-20`, `font-medium`) khác với reference (`max-w-7xl`, `h-16`, `font-label-md`)
- Những gap này không phải "lỗi" UI-03 mà là refinement mới
- Owner prompt §1 gọi đích danh "chỉnh navbar" → đây là task mới

### Tại sao tag tùy biến DEFER?

- Chưa có data model (Admin tạo tag → gán vào JobPosting/JobOpening → hiển thị trên card)
- Chưa có permission (ai được tạo tag? ai được gán? ai thấy?)
- Schema impact lớn (cần `JobTag`, `Tag`, `JobTagAssignment` hoặc tương đương)
- Owner prompt §2 nói "Tag tùy biến là yêu cầu tương lai" → DEFER hợp lý

---

## 4. Dependency map

```
Phase A (Visual Polish)
├── GlobalNavbar.tsx → N1.1–N1.15
├── featured-job-card.tsx → BJ2–BJ5, BJ8, BJ9
├── best-jobs-section.tsx → BJ13, BJ14
├── recruiting-projects-section.tsx → RP2, RP3, RP5, RP9, RP10
└── Regression: tất cả route portal (navbar dùng chung)

Phase B (Pagination + Admin)
├── Phase A outputs (featured-job-card, best-jobs-section đã polish)
├── Schema migration: HomepageSettings table (singleton id=1)
├── API: GET/POST /api/admin/homepage-settings
├── Service: getHomepageSettings() + updateHomepageSettings()
├── Page.tsx: thêm state cho tab filter + pagination control + fetch settings
├── best-jobs-section.tsx: nhận page/tab props → fetch riêng
├── Fence tests: update (DEC-13/DEC-14 allowlist)
└── Admin settings page: thêm form "Cấu hình Homepage"
```

---

## 5. Fence test strategy

Tier 2 (trong task này) sẽ cần cập nhật fence tests sau khi visual changes + pagination changes. Allowlist cho sửa test:

| Test file | Reason |
|---|---|
| `public-ui-premium.static.test.ts` | Phase A: card shape/theming đổi (BJ3, BJ4, BJ8, BJ9), Phase B: tab filter thêm |
| `public-ui-token-parity.static.test.ts` | Phase A: class density đổi |
| `public-card-truth.test.ts` | Phase A: BestJobs card content/theming đổi |
| `marketplace-inventory.static.test.ts` | Phase A: salary label style đổi (BJ9) |
| `public-listing.static.test.ts` | Phase B: listing pagination behavior có thể đổi |

Cần Tier 1 confirm với Owner về DEC-13 (mở rộng allowlist) khi viết TASK.md contract.

---

## 6. Non-goals giữ nguyên từ UI-03

- Không thay đổi `src/domains/job-board/public.service.ts` (DTO contract cố định)
- Không thay đổi `/api/jobs/route.ts` (chỉ thêm config endpoint mới ở Phase B)
- Không thay đổi `ApplyModal` / `SuccessModal`
- Không thay đổi route `/viec-lam/{code}`
- Không thay đổi `Hero` search card (trừ container width đồng bộ)
- Không thay đổi Areas section (không nằm trong Owner mandate)
- Không thay đổi ReferralStrip / CTV section
- Không thay đổi Footer structure
- Không thêm logo công ty / "Đối tác chính thức" vào recruiting section
