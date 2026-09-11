# TASK — `hrp-v6-ui-04e-hero-width-balance`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04e-hero-width-balance` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual width sync giữa hero + body section; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `e09ceec` (R9 docs) |
| In-scope roots | `src/domains/job-board/components/landing/hero.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `app/(portal)/home/page.tsx` |
| Forbidden paths | Other sections, footer, navbar |
| Required gates | `npm run typecheck` exit 0, Vercel visual review |

## 1. Outcome

### 1.1 Owner directive

11/09/2026 08:19 UTC+7: "nhìn hình ta thấy phần hero ở trên đang hơi hẹp hơn so với body ở dưới ? bây giờ tăng chiều rộng phần trên lên 1 chút cho đồng bộ, đồng thời để các chữ như 'Tên công việc', 'Tất cả...' nó hiển thị được đầy đủ."

### 1.2 User-visible outcome

Sau push lên main, https://hrpvietnam.com/:

- **Hero** (`app/(portal)/page.tsx` portal dashboard): chiều rộng tăng `max-w-[1080px]` → `max-w-7xl` (1280px) — đồng bộ với `SearchSection` + các section khác
- **BestJobsSection**: cũng `max-w-[1080px]` → `max-w-7xl` để match hero + SearchSection
- **Search panel** (3 cột input/select): với parent rộng hơn, mỗi cột rộng hơn → text:
  - Input "Tên công việc" → hiển thị đủ
  - Select "Tất cả khu vực" → hiển thị đủ (không truncate "Tất cả...")
  - Select "Mọi mức lương" → hiển thị đủ (không truncate "Mọi mức lư...")
- **Home page** (`app/(portal)/home/page.tsx`): bỏ `max-w-2xl` (672px) → dùng `max-w-3xl` cho headline + sub + `max-w-5xl` cho search panel → mở rộng hero cân đối với `max-w-7xl` body

### 1.3 Root cause

| Section | Before | After |
|---|---|---|
| Portal Hero (`hero.tsx`) | `max-w-[1080px]` | `max-w-7xl` (1280px) |
| Portal BestJobs (`best-jobs-section.tsx`) | `max-w-[1080px]` | `max-w-7xl` (1280px) |
| Portal SearchSection | `max-w-7xl` (1280px) | giữ nguyên |
| Home Hero wrapper | `max-w-7xl` (1280px) | giữ nguyên |
| Home Hero content `max-w-2xl` | 672px | `max-w-3xl` (768px) cho headline + `max-w-5xl` (1024px) cho search panel |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner screenshot 11/09/2026 08:19 | Visual: hero hẹp hơn body, search text bị truncate |
| `EV-02` | Owner message 11/09/2026 08:19 | "tăng chiều rộng phần trên lên 1 chút cho đồng bộ" |
| `EV-03` | `hero.tsx` line 26: `max-w-[1080px]` | Hero wrapper width |
| `EV-04` | `best-jobs-section.tsx` line 60: `max-w-[1080px]` | BestJobs wrapper width |
| `EV-05` | `search-section.tsx` line 13: `max-w-7xl` | SearchSection wrapper width |
| `EV-06` | `(portal)/home/page.tsx` line 71: `max-w-2xl` | Home hero content width |
| `EV-07` | Inputs/selects hiện tại có label nhưng bị cắt vì parent quá hẹp | Search panel truncate |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Tăng Hero + BestJobsSection từ `max-w-[1080px]` → `max-w-7xl` | `OWNER_DECIDED` |
| `DEC-02` | Home page: bỏ `max-w-2xl` toàn block → tách `max-w-3xl` (headline+sub) + `max-w-5xl` (search panel) | `TIER_1_DECIDED` (giữ visual hierarchy, không làm headline full-width quá 768px) |
| `DEC-03` | Giữ nguyên các class khác trên inputs/selects | `TIER_1_DECIDED` (chỉ fix width) |
| `DEC-04` | Commit + push `main` (TIER0_UI04 + UI04e directive còn hiệu lực) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `hero.tsx`: `max-w-[1080px]` → `max-w-7xl`, padding `md:px-6` → `md:px-8` cho cân đối |
| `RQ-02` | `best-jobs-section.tsx`: `max-w-[1080px]` → `max-w-7xl` |
| `RQ-03` | `(portal)/home/page.tsx`: bỏ `max-w-2xl` wrapper, thêm `max-w-3xl` ở headline+sub, `max-w-5xl` ở search panel |
| `RQ-04` | Search panel inputs/selects (3 cột flex-1): KHÔNG đổi class, để parent rộng hơn tự nhiên expand |
| `RQ-05` | `npm run typecheck` exit 0 |

### 4.2 Non-goals

- KHÔNG đổi SearchSection width
- KHÔNG đổi Footer width (cũng là 1080px nhưng anh không complain)
- KHÔNG đổi services section width

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | `hero.tsx` line 26 | Tăng `max-w-[1080px]` → `max-w-7xl`, `md:px-6` → `md:px-8` | grep |
| `STEP-02` | `best-jobs-section.tsx` line 60 | Tăng `max-w-[1080px]` → `max-w-7xl` | grep |
| `STEP-03` | `(portal)/home/page.tsx` line 71+ | Bỏ `max-w-2xl`, thêm `max-w-3xl` + `max-w-5xl` | grep |
| `STEP-04` | Local | `npm run typecheck` | exit 0 |
| `STEP-05` | Git | Commit + push `main` | Vercel trigger |

## 6. Acceptance

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | Hero + BestJobs width = `max-w-7xl` (1280px) | grep |
| `AC-02` | Search panel inputs/selects hiển thị text đầy đủ: "Tên công việc", "Tất cả khu vực", "Mọi mức lương" | Vercel preview |
| `AC-03` | Hero (portal) + BestJobs + SearchSection cùng chiều rộng (đồng bộ) | Visual |
| `AC-04` | `npm run typecheck` exit 0 | shell |
| `AC-05` | Home page hero không quá giãn (headline vẫn `max-w-3xl`, search panel `max-w-5xl`) | Visual |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Hero đồng bộ 1280px với body có thể làm h1 quá rộng | Headline vẫn `max-w-3xl` (768px) để wrap thành 2-3 dòng tự nhiên |
| `RISK-02` | Width chênh giữa portal (1280px) và footer (1080px) | Footer riêng scope, anh không complain về footer |
| `RISK-03` | Vercel auto-deploy Visual Quality gate check width lệch chuẩn | TIER 1 theo dõi |

## 8. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | Tăng hero width đồng bộ với body, fix search panel truncate |
