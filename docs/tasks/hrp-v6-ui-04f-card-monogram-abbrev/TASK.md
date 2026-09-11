# TASK — `hrp-v6-ui-04f-card-monogram-abbrev`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04f-card-monogram-abbrev` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual card mark; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `0ca3cc7` (UI04e docs) |
| In-scope roots | `hr-monogram.tsx`, `recruiting-projects-section.tsx`, `featured-job-card.tsx` |
| Forbidden paths | Other components, services |
| Required gates | `npm run typecheck` exit 0, Vercel visual review |

## 1. Outcome

### 1.1 Owner directive (3 phần)

11/09/2026 08:25 UTC+7:

1. **Logo HRP trong card** → dùng abbreviation đại diện tên project/công ty (vd "Yên Phong 3" → "YPE" hoặc "YP")
2. **"Cần tuyển..." thẳng hàng** giữa các card (screenshot 2 cho thấy card "Yên Phong 3" / "Khổng Tiên" / "Thanh Ba" / "Phong Lộc" có title 1 dòng vs 2 dòng → "Cần tuyển N người" bị lệch y)
3. **Hover tên job** trong FeaturedJobCard: `group-hover:text-blue-700` → `group-hover:text-primary-dark` (tone cam #a63b00)

### 1.2 User-visible outcome

Sau push lên main, https://hrpvietnam.com/:

- **Recruiting Projects cards** ("Dự án đang tuyển"):
  - Logo monogram = 2 chữ cái đầu của title (vd "Yên Phong 3" → "YP", "Khổng Tiên" → "KT", "Thanh Ba" → "TB", "Phong Lộc" → "PL")
  - Title giữ nguyên text, có `min-h-[3.2em]` để các card title đồng đều chiều cao
  - "Cần tuyển N người" có `mt-auto` → thẳng hàng theo đáy card dù title 1 hay 2 dòng
- **BestJobs / FeaturedJobCards**:
  - Logo monogram 48×48 = 2 chữ cái đầu của job title
  - Tên công ty "HRP Việt Nam" giữ nguyên (chưa có data company để derive — để pass)
  - Hover tên job: xanh → cam đậm `text-primary-dark` (#a63b00)

### 1.3 Implementation

**`hr-monogram.tsx`**:
- Thêm prop `label?: string` (default "HRP" backward compat)
- `aria-label` động theo label

**`recruiting-projects-section.tsx`**:
- Thêm helper `deriveMonogram(title)` lấy 2 chữ cái đầu của các từ trong title
- `HrMonogram` nhận `label={deriveMonogram(job.title)}`
- Wrap card: `h-full` (để cards đều cao như nhau)
- Title: `min-h-[3.2em]` (~48px = 2 dòng × 24px line-height) cho 1-2 dòng
- "Cần tuyển N người": `mt-auto` đẩy xuống đáy

**`featured-job-card.tsx`**:
- Thêm helper `deriveMonogram(title)`
- `HrMonogram` nhận `label={deriveMonogram(job.title)}`
- `<h3>`: `group-hover:text-blue-700` → `group-hover:text-primary-dark`

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner screenshot 1 (featured jobs cards) | Logo "HRP" cứng trong 6 cards → anh muốn abbreviation |
| `EV-02` | Owner screenshot 2 (recruiting projects) | "Cần tuyển..." bị lệch y giữa các card có title 1 dòng vs 2 dòng |
| `EV-03` | Owner message: "chuyển sang màu khác cùng tone cam" | Hover xanh → cam |
| `EV-04` | `hr-monogram.tsx`: hard-coded "HRP" line 19 | Root cause logo |
| `EV-05` | `featured-job-card.tsx` line 89: `group-hover:text-blue-700` | Hover color cũ |
| `EV-06` | `globals.css` `--color-primary-dark: #a63b00` | Cam đậm, đạt WCAG AA 5.83:1 |
| `EV-07` | `EnrichedJob` không có field `company` | Em derive từ title thay vì cần schema change |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | HrMonogram thêm prop `label` (default "HRP" backward compat) | `TIER_1_DECIDED` |
| `DEC-02` | Monogram = 2 chữ cái đầu các từ trong title (uppercase) | `OWNER_DECIDED` (screenshot example) |
| `DEC-03` | "Cần tuyển N người" thẳng hàng: `h-full` + `min-h-[3.2em]` title + `mt-auto` | `TIER_1_DECIDED` (CSS pattern phổ biến) |
| `DEC-04` | Hover tên job: `text-primary-dark` (#a63b00) | `OWNER_DECIDED` ("tone cam") |
| `DEC-05` | Giữ nguyên text "HRP Việt Nam" ở FeaturedJobCard subtitle (chưa có data company) | `TIER_1_DECIDED` (anh không complain; schema không có `company`) |
| `DEC-06` | Commit + push `main` (TIER0_UI04 + UI04e + UI04f đang chain) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | HrMonogram nhận `label?: string`, default `"HRP"` |
| `RQ-02` | recruiting-projects: HrMonogram `label={deriveMonogram(title)}` |
| `RQ-03` | recruiting-projects: card `h-full` + title `min-h-[3.2em]` + "Cần tuyển" `mt-auto` |
| `RQ-04` | featured-job-card: HrMonogram `label={deriveMonogram(title)}` |
| `RQ-05` | featured-job-card: `<h3>` `group-hover:text-blue-700` → `group-hover:text-primary-dark` |
| `RQ-06` | `npm run typecheck` exit 0 |
| `RQ-07` | KHÔNG đổi `<p>HRP Việt Nam</p>` subtitle (scope chưa mở rộng) |

### 4.2 Non-goals

- KHÔNG schema change `EnrichedJob` (thêm `company`)
- KHÔNG sửa HrMonogram size/colors/style khác
- KHÔNG sửa SearchSection (không liên quan)

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | hr-monogram.tsx | Thêm prop `label` | grep |
| `STEP-02` | recruiting-projects-section.tsx | Derive monogram + thẳng hàng | grep |
| `STEP-03` | featured-job-card.tsx | Derive monogram + hover cam | grep |
| `STEP-04` | Local | `npm run typecheck` | exit 0 |
| `STEP-05` | Git | Commit + push `main` | Vercel trigger |

## 6. Acceptance

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | HrMonogram nhận prop `label` | grep |
| `AC-02` | Logo recruiting cards = abbreviation từ title (vd "YP", "KT") | Vercel preview |
| `AC-03` | "Cần tuyển N người" thẳng hàng giữa các card | Vercel preview |
| `AC-04` | Hover tên job (BestJobs): xanh → cam đậm | Vercel preview |
| `AC-05` | `npm run typecheck` exit 0 | shell |
| `AC-06` | Diff scope: 3 file (hr-monogram + 2 section) | `git diff --stat` |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Monogram 2 chữ cái đầu có thể trùng nhau giữa các job (vd "Yên Phong" và "Yên Bái" đều → "YP") | Chấp nhận vì demo; nếu feedback → add index suffix |
| `RISK-02` | Title Vietnamese nhiều ký tự đặc biệt có thể bị strip hết → monogram rỗng → fallback "HRP" | Helper `deriveMonogram` đã có fallback |
| `RISK-03` | `min-h-[3.2em]` chỉ đủ cho 2 dòng, nếu title > 2 dòng (line-clamp) vẫn còn lệch | Line-clamp:2 ở FeaturedJobCard → không có wrap ngoài 2 dòng |

## 8. Open Questions

- Q1: Anh muốn monogram 2 chữ cái ("YP") hay 3 chữ cái ("YPE" = Yên Phong Electric)? Em implement 2 chữ; nếu muốn 3 chữ → 1 dòng fix.

## 9. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | Monogram abbreviation + align + hover cam |
