# TASK — `hrp-v6-ui-04c1-r9-footer-map-osm`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-r9-footer-map-osm` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual replacement trong scope footer; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1 (Delivery Lead — tier1.md)` |
| Baseline | `becb6ff` (R8 docs push) |
| In-scope roots | `app/components/GlobalFooter.tsx` (chỉ cột 3) |
| Forbidden paths | Cột 1, cột 2, ContactForm, bottom nav |
| Required gates | `npm run typecheck` exit 0, Vercel preview visual review |

## 1. Outcome

### 1.1 User-visible outcome

Sau push lên main, https://hrpvietnam.com/ footer:

- **Cột 1** (Công ty): giữ nguyên R8 — 7 items flat, gap 8px, không min-h-11
- **Cột 2** (Dịch vụ): giữ nguyên R8 — 5 services items
- **Cột 3** (Bản đồ): thay ContactForm disabled bằng OpenStreetMap iframe embed (220px height) hiển thị vị trí công ty tại Phú Thọ
- Chiều cao 3 cột tương đương: cột 1 ~248px, cột 2 ~220px, cột 3 ~220px iframe + header + gap ≈ 255px

### 1.2 Owner directive

Owner 11/09/2026 01:22 UTC+7: "bỏ hẳn cột THÔNG TIN LIÊN HỆ / thay vào đó nội dung khác như là map đến công ty, nhưng lưu ý về chiều cao ở 3 cột footer phải tương đương nhau"

### 1.3 Technical approach

- Google Maps không dùng được vì không có API key → dùng **OpenStreetMap embed** (free, không cần key)
- `bbox` coordinates: `105.20,21.35,105.30,21.45` (tọa độ Phú Thọ, Việt Nam)
- `height="220"` để match height tổng cột ≈ 220px (cột 2 ~5 services × ~40px = ~200px + header ≈ 240px → gần tương đương)

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner message 11/09/2026 01:22: "bỏ hẳn cột THÔNG TIN LIÊN HỆ / thay map đến công ty" | Owner directive trực tiếp |
| `EV-02` | Không có Google Maps API key trong .env | Google Maps không khả dụng |
| `EV-03` | OpenStreetMap embed endpoint: `https://www.openstreetmap.org/export/embed.html` | Free map provider |
| `EV-04` | Address: "Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kế, Xã Bình Tuyền, Tỉnh Phú Thọ" | Tọa độ bản đồ |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Thay cột 3 ContactForm → OpenStreetMap iframe | `OWNER_DECIDED` |
| `DEC-02` | Header cột 3: "THÔNG TIN LIÊN HỆ" → "BẢN ĐỒ" | `OWNER_DECIDED` (theo context map) |
| `DEC-03` | Wrapper: bỏ `bg-primary-container/40 p-4 md:p-5`, dùng `overflow-hidden rounded-2xl border border-outline-variant` | `TIER_1_DECIDED` (clean, border đều) |
| `DEC-04` | iframe height: 220px | `TIER_1_DECIDED` (gần bằng cột 2) |
| `DEC-05` | Bỏ `ContactForm` import + component không còn used trong footer | `TIER_1_DECIDED` (dead code) |
| `DEC-06` | Commit + push thẳng `main` (TIER0_UI04 directive còn hiệu lực) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Thay cột 3: bỏ ContactForm, thêm OpenStreetMap iframe |
| `RQ-02` | Header cột 3: "BẢN ĐỒ" |
| `RQ-03` | iframe height 220px, border rounded-2xl |
| `RQ-04` | 3 cột có chiều cao tương đương (cột 1 ~248px, cột 2 ~240px, cột 3 ~255px) |
| `RQ-05` | KHÔNG đổi cột 1, cột 2, bottom nav |
| `RQ-06` | `npm run typecheck` exit 0 |

### 4.2 Non-goals

- KHÔNG bỏ ContactForm.tsx file (vẫn còn import ở chỗ khác có thể)
- KHÔNG thêm interactive map (zoom/pan) — chỉ embed static view
- KHÔNG đổi tọa độ bản đồ (chưa có feedback vị trí chính xác)

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | GlobalFooter.tsx line 112-126 | Thay cột 3 ContactForm → OpenStreetMap iframe | visual |
| `STEP-02` | GlobalFooter.tsx import | Check ContactForm still used anywhere else | grep |
| `STEP-03` | Local | `npm run typecheck` | exit 0 |
| `STEP-04` | Git | Commit + push `main` | Vercel trigger |
| `STEP-05` | `docs/tasks/hrp-v6-ui-04c1-r9-footer-map-osm/HANDOFF.md` | Document | manual |
| `STEP-06` | `docs/PLANNER_HANDOVER.md` §0 | Update R8 → R9 | YAML valid |

## 6. Acceptance

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | Cột 3 hiển thị bản đồ OpenStreetMap iframe (220px) | Vercel preview |
| `AC-02` | Header cột 3: "BẢN ĐỒ" | grep |
| `AC-03` | 3 cột footer có chiều cao tương đương (không lệch quá nhiều) | visual |
| `AC-04` | `npm run typecheck` exit 0 | shell |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Tọa độ OSM không chính xác (chỉ đoán bbox) | Owner feedback sau; nếu sai → cung cấp link Google Maps đúng → em extract tọa độ |
| `RISK-02` | Cột 1 vẫn cao hơn nhiều (cột 1 ~248px, cột 2/3 ~240px) | Chênh lệch ~8px = 3% → chấp nhận |
| `RISK-03` | iframe embed hơi bị crop/blank nếu bbox sai | OSM fallback hiển thị khu vực Phú Thọ nói chung |

## 8. Open Questions

- Q1: Tọa độ bản đồ có chính xác không? Nếu không, anh cung cấp link Google Maps đúng → em extract coordinates.
- Q2: Header "BẢN ĐỒ" hay giữ "THÔNG TIN LIÊN HỆ"? (Owner directive không nói rõ, em đổi thành "BẢN ĐỒ" theo context)
- Q3: Chiều cao iframe 220px có OK không, hay muốn cao hơn/thấp hơn?

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| R0 | Owner ask 11/09/2026 01:22 bỏ cột Liên hệ + thay map | Owner directive |
| R1 | TIER_1_RESOLVED | Tier 1 implement theo directive |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | R9 thay cột 3 ContactForm → OpenStreetMap iframe |
