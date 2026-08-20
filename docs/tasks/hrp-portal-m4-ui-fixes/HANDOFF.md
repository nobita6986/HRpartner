# HANDOFF: hrp-portal-m4-ui-fixes

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m4-ui-fixes` |
| Milestone | 4 — Hotfixes |
| Execution round | `1` |
| Baseline | `HEAD of main` |
| Status | **READY_FOR_AUDIT** |

## 1. What was done

### 1.1 RQ-01 — Fix Material Symbols icon rendering (`app/layout.tsx` + `app/globals.css`)

**Problem:** `<span class="material-symbols-outlined">` rendered as fallback text because the font was not loaded.

**Fix:**
1. Added `<link>` tags inside `<head>` in `app/layout.tsx`:
   - `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`
   - Google Fonts link for `Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`

2. Added `.material-symbols-outlined` CSS class in `app/globals.css`:
   - `font-family: 'Material Symbols Outlined'`
   - `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`
   - All rendering properties (size, letter-spacing, direction, antialiasing)

### 1.2 RQ-02 — Infinite scroll logic (`app/(portal)/page.tsx`)

**Before:** "Đang tải thêm..." spinner always visible at bottom of job list.

**After:**
- `useRef<HTMLDivElement>(null)` sentinel element at bottom of list
- `IntersectionObserver` with `rootMargin: '200px'` (prefetch before reaching bottom)
- State: `hasMore` (API doesn't support pagination yet → always false), `loadingMore`
- `loadingMore` flag prevents duplicate triggers
- Text logic:
  - `loadingMore === true` → "Đang tải thêm việc làm..."
  - `hasMore === false` → "Đã xem toàn bộ danh sách"
- The entire footer section is now conditionally rendered only when `!loading && !fetchError && filteredJobs.length > 0`

### 1.3 RQ-03 — Remove 2 nav links (`app/components/GlobalNavbar.tsx`)

Removed from `navLinks` array:
- `{ href: '/dich-vu-tuyen-dung', label: 'Dịch vụ Tuyển dụng' }`
- `{ href: '/giai-phap-nhan-su', label: 'Giải pháp Nhân sự' }`

Kept: Việc làm, Cộng tác viên, Về chúng tôi, Liên hệ.

### 1.4 RQ-04 — Replace `/ve-chung-toi` page (`app/(portal)/ve-chung-toi/page.tsx`)

Created new directory `app/(portal)/ve-chung-toi/` with `page.tsx`:
- Server Component (no 'use client') for SEO + static generation
- Converts static HTML from `index.html` (root) into JSX
- Hero section: kicker badge, h1 headline with orange `<em>`, lede paragraph, CTA buttons, meta row
- Feature cards grid (5 cards): icon, title, description, status tag, "more" link
- Tags: "v4.22" (success green), "Sẵn sàng demo" (green), "Chờ OP P1/P2" (warning amber), "Phase Mới Nhất" (amber), "Đã triển khai" (green)
- Footer with version + links
- Tailwind `hover:` classes for card hover effects (no event handlers → Server Component compatible)

## 2. Verification Evidence

### Build
```
npm run build → exit 0 ✅
27 routes (new /ve-chung-toi)
```

### Test
```
npx vitest run → 35 files
  ❌ 2 test files pre-existing failures (security-matrix, matrix-scope)
  ✅ 558 tests PASS
  ❌ 47 tests FAIL (pre-existing baseline — unrelated to M4 changes)
Exit 0? NO — but 47 failures match baseline exactly, confirmed by running same tests
on HEAD~1 (before any M4 changes).
```

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `app/layout.tsx` | Added Material Symbols link tags in `<head>` | RQ-01 |
| `app/globals.css` | Added `.material-symbols-outlined` CSS class | RQ-01 |
| `app/(portal)/page.tsx` | Infinite scroll: IntersectionObserver, hasMore/loadingMore state, conditional footer text | RQ-02 |
| `app/components/GlobalNavbar.tsx` | Removed 2 nav links from navLinks array | RQ-03 |
| `app/(portal)/ve-chung-toi/page.tsx` | NEW — Server Component with hero + 5 feature cards from index.html | RQ-04 |

## 4. Compliance

| AC | RQ | Pass | Evidence |
|---|---|---|---|
| AC-01 | RQ-01..04 | ✅ | Icon font loaded, scroll logic conditional, nav trimmed, `/ve-chung-toi` renders |
| AC-02 | RQ-05 | ✅ (with pre-existing caveats) | 558/605 pass — 47 pre-existing failures unrelated to M4 |

## 5. Round 2 — RQ-05 Completion (AUD-001)

Tier 3 AUD-001 identified that `role-guard-layout.tsx` still had text-logo "H" badge.

**Changes:**

| File | Change | Reason |
|---|---|---|
| `src/shared/ui/role-guard/role-guard-layout.tsx` | `SidebarHeader`: replaced `H` badge div with `<img src="/logo.png" alt={title} style={{height:'36px',width:'auto'}}>`, added optional `logoSrc` prop | RQ-05 |
| `src/shared/ui/role-guard/role-guard-layout.tsx` | Added `relative` class to aside sidebar so UserFooter `absolute` works | Layout fix |
| `src/shared/ui/role-guard/role-guard-layout.tsx` | Aligned user avatar height `h-9` to match logo | Visual polish |

`GlobalNavbar` and `GlobalFooter` already had `img /logo.png` from Tier 3 Round 1 work.

### Verification (Round 2)
```
npm run build → exit 0 ✅
npx vitest run → 35 files, 558 tests PASS, 47 pre-existing failures (same as baseline) ✅
```

## 6. Changes Summary (All Rounds)

| File | Change | Reason |
|---|---|---|
| `app/layout.tsx` | Added Material Symbols link tags in `<head>` | RQ-01 |
| `app/globals.css` | Added `.material-symbols-outlined` CSS class | RQ-01 |
| `app/(portal)/page.tsx` | Infinite scroll: IntersectionObserver, hasMore/loadingMore state, conditional footer text | RQ-02 |
| `app/components/GlobalNavbar.tsx` | Removed 2 nav links from navLinks array; Tier 3 already added `/logo.png` img | RQ-03 + RQ-05 |
| `app/components/GlobalFooter.tsx` | Tier 3 added `/logo.png` img | RQ-05 |
| `app/(portal)/ve-chung-toi/page.tsx` | NEW — Server Component with hero + 5 feature cards from index.html | RQ-04 |
| `src/shared/ui/role-guard/role-guard-layout.tsx` | Replaced "H" badge with logo.png img in SidebarHeader | RQ-05 |

## 7. Compliance

| AC | RQ | Pass | Evidence |
|---|---|---|---|
| AC-01 | RQ-01..05 | ✅ | Icon font loaded, scroll logic conditional, nav trimmed, `/ve-chung-toi` renders, all 3 logos → `/logo.png` |
| AC-02 | RQ-06 | ✅ | 558/605 pass — 47 pre-existing failures unrelated to M4 |

## 8. Next Gate

`/audit hrp-portal-m4-ui-fixes` — Tier 3 audit (Round 2).
