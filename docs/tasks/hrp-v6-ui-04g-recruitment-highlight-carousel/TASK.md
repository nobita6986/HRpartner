# TASK — `hrp-v6-ui-04g-recruitment-highlight-carousel`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04g-recruitment-highlight-carousel` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual card enhancement; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `48c2ac2` (UI04f docs) |
| In-scope roots | `src/domains/job-board/components/landing/recruitment-highlight.tsx` |
| Forbidden paths | Other components |
| Required gates | `npm run typecheck` exit 0, Vercel visual review |

## 1. Outcome

### 1.1 Owner directive

11/09/2026 08:32 UTC+7: "hãy render 3 ảnh khác nhau cùng với các dòng chữ tương ứng cho chạy dạng slide thay vì chỉ để 1 bảng text nhàm chán"

### 1.2 User-visible outcome

Sau push, bên phải Hero (lg+ screen) card "Quy trình rõ ràng / Cùng HRP tuyển nhanh":

**Before**: 3 checkmarks text list nhàm chán
**After**: 3-slide image carousel với:
- Mỗi slide: 1 ảnh (400×280px, picsum.photos placeholder) + title + description
- Auto-play: chuyển mỗi 3.5 giây
- Navigation dots: 3 dots bên dưới, active dot rộng hơn (w-5 vs w-1.5)
- Click dots: nhảy đến slide tương ứng
- Hover: pause auto-play (user có thể đọc)

### 1.3 3 Slides

| # | Image seed | Title | Description |
|---|---|---|---|
| 1 | `hrp-post` | Đăng công việc trong 5 phút | Không cần tài khoản doanh nghiệp. Chỉ cần mô tả và đăng — ứng viên tự tìm đến bạn. |
| 2 | `hrp-filter` | HRP lọc hồ sơ thông minh | Theo địa điểm, ca làm, mức lương thực tế. Chỉ ứng viên phù hợp mới được giới thiệu. |
| 3 | `hrp-interview` | Chỉ gặp ứng viên đã sàng lọc | Ứng viên đã đồng ý phỏng vấn và sẵn sàng. Bạn tiết kiệm thời gian, hiệu quả cao hơn. |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner message 11/09/2026 08:32 | "3 ảnh khác nhau... chạy dạng slide thay vì bảng text nhàm chán" |
| `EV-02` | Owner screenshot | Bảng 3 checkmarks text → điểm yếu thẩm mỹ |
| `EV-03` | `recruitment-highlight.tsx` line 1-40 | Code cũ: 3 `<li>` checkmarks |
| `EV-04` | `picsum.photos/seed/hrp-*` | Ảnh placeholder cố định (không random mỗi load) |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | 3 slides, mỗi slide = 1 ảnh + title + description | `OWNER_DECIDED` |
| `DEC-02` | Dùng picsum.photos với seed cố định (hrp-post, hrp-filter, hrp-interview) | `TIER_1_DECIDED` (không có ảnh local; placeholder này cho từng lần load ra cùng ảnh) |
| `DEC-03` | Auto-play mỗi 3.5s + navigation dots + click to jump | `TIER_1_DECIDED` (UX pattern phổ biến) |
| `DEC-04` | Thêm 'use client' directive vì dùng useState + useEffect | `TIER_1_DECIDED` (React hooks) |
| `DEC-05` | Hover tạm dừng auto-play | `TIER_1_DECIDED` (UX) |
| `DEC-06` | Commit + push `main` | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | 3 slides: image + title + description |
| `RQ-02` | Auto-play: chuyển slide mỗi 3.5 giây |
| `RQ-03` | Navigation dots: 3 dots, active = rộng hơn |
| `RQ-04` | Click dot → nhảy đến slide |
| `RQ-05` | Hover card → pause auto-play |
| `RQ-06` | `npm run typecheck` exit 0 |
| `RQ-07` | Giữ nguyên header "Quy trình rõ ràng" + "Cùng HRP tuyển nhanh" |

### 4.2 Non-goals

- KHÔNG thay ảnh placeholder bằng ảnh thật (chưa có assets)
- KHÔNG thêm prev/next arrows (chỉ dots + auto-play đủ)
- KHÔNG đổi container width (card bên phải Hero)

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | `recruitment-highlight.tsx` | Rewrite: thêm 'use client' + SLIDES array + carousel state + UI | grep |
| `STEP-02` | Local | `npm run typecheck` | exit 0 |
| `STEP-03` | Git | Commit + push `main` | Vercel trigger |

## 6. Acceptance

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | 3 slides hiển thị đúng thứ tự | Vercel preview |
| `AC-02` | Auto-play chuyển slide mỗi 3.5s | Visual |
| `AC-03` | Navigation dots hoạt động | Click dots |
| `AC-04` | Hover pause auto-play | Visual |
| `AC-05` | `npm run typecheck` exit 0 | shell |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | picsum.photos placeholder không phải ảnh thật của HRP | Owner cần cung cấp ảnh thật → em thay vào |
| `RISK-02` | Auto-play có thể gây distraction | Hover pause + user có thể click dots |
| `RISK-03` | Image load chậm (external CDN) | `loading="lazy"` cho slide 2, 3 |

## 8. Open Questions

- Q1: Anh có ảnh thật của HRP muốn dùng thay placeholder không? Nếu có → gửi ảnh → em thay vào.

## 9. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | Thay bảng text 3 checkmarks → 3-slide image carousel |
