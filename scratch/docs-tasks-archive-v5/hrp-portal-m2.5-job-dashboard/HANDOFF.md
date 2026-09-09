# HANDOFF: hrp-portal-m2.5-job-dashboard

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m2.5-job-dashboard` |
| Milestone | 2.5 — Job Dashboard / Job Market |
| Execution round | `1` |
| Baseline | `HEAD of main` (sau M2) |
| Status | **READY_FOR_AUDIT** |
| Source | `stitch/hrp_balanced_4_card_dashboard/code.html` |

## 1. What was done

### 1.1 Root Job Dashboard — `app/(portal)/page.tsx`

Chuyển đổi toàn bộ nội dung từ `stitch/hrp_balanced_4_card_dashboard/code.html` (DEC-02: chỉ lấy phần body, bỏ Navbar/Footer vì đã có GlobalNavbar/GlobalFooter từ layout).

**Layout:**
- Sidebar filters (280px) + main content grid `1→2 cols`
- `max-w-[1600px]` container
- Full responsive: stack on mobile, side-by-side on lg+

**Sidebar Filters:**
- Search input với icon + controlled state
- Location dropdown (Tất cả tỉnh/thành, Bắc Ninh, Bắc Giang, Hà Nội)
- Industry dropdown
- Work schedule checkboxes: Ca ngày, Ca đêm, Xoay ca
- Job type checkboxes: Toàn thời gian, Bán thời gian, Thời vụ
- Submit button với loading spinner

**Job Cards Grid (8 mock jobs):**
- `grid-cols-1 xl:grid-cols-2` — 2-col on xl, 1-col on mobile
- Each card: accent top bar (primary-container), company icon, title + badge, company name, tags (salary, location, schedule), apply button, save button
- Badges: "Tuyển gấp" (red), "Đã tuyển đủ" (gray, disabled)
- Apply state: `useState<number[]>` tracking applied jobs → button changes to "Đã ứng tuyển" (green)
- Full state: button disabled as "Đã đủ chỉ tiêu"

**Mock data:** 8 jobs (Assembly, Sewing, Mechanics, CNC, Warehouse, QA/QC, Electrician, Packaging)

### 1.2 Route Resolution Fix

**Problem:** `app/(portal)/page.tsx` và `app/(jobs)/page.tsx` cùng resolve về `/` → Next.js conflict.

**Solution:** Moved `app/(jobs)/page.tsx` → `app/(jobs)/jobs/page.tsx` (resolves to `/jobs`).

**Route map:**

| Route | File | Purpose |
|---|---|---|
| `/` | `app/(portal)/page.tsx` | **NEW:** Job Dashboard public landing (with Navbar/Footer) |
| `/jobs` | `app/(jobs)/jobs/page.tsx` | **MOVED:** Internal job board (auth required, no Navbar) |
| `/home` | `app/(portal)/home/page.tsx` | Landing page (M2) |
| `/ctv-portal` | `app/(portal)/ctv-portal/page.tsx` | CTV public landing (M2) |

### 1.3 Token Compliance

- All colors from `globals.css` Tailwind v4 tokens: `bg-surface`, `border-outline-variant`, `text-primary`, `text-primary-container`, `bg-surface-container-low`, `bg-primary-container/10`, `text-error`, `bg-error-container`
- Shadows: `shadow-sm`, `hover:shadow-md`
- Radius: `rounded-xl`, `rounded-lg`, `rounded-full`
- Material symbols for icons: `location_on`, `work`, `schedule`, `category`, `search`, `expand_more`, `favorite`, `precision_manufacturing`, etc.

## 2. Verification Evidence

### Build
```
npm run build → exit 0 ✓
26 routes + /jobs (moved from /(jobs)/page)
```

### Test
```
npx vitest run → 35 files, 605 tests PASS, exit 0 ✓
```

### Routes
```
○ /          (NEW: Job Dashboard - 4-card layout)
○ /jobs      (MOVED: internal job board, was /(jobs)/page)
○ /ctv-portal (M2)
○ /home      (M2)
```

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `app/(portal)/page.tsx` | NEW — Job Dashboard (8 jobs, sidebar filters, 2-col grid) | RQ-01, RQ-02 |
| `app/(jobs)/jobs/page.tsx` | MOVED from `app/(jobs)/page.tsx` (was root `/`) | RQ-03 route conflict |
| `docs/tasks/hrp-portal-m2.5-job-dashboard/HANDOFF.md` | NEW | RQ-04 (implicit) |

## 4. Compliance

| AC | Pass | Evidence |
|---|---|---|
| AC-01 (RQ-01, RQ-02) | ✅ | `/` renders Job Dashboard with 4-card grid layout, filters, responsive |
| AC-02 (RQ-03) | ✅ | `npx vitest run` exit 0, 605/605 PASS |

## 5. Next Gate

`/audit hrp-portal-m2.5-job-dashboard` — Tier 3 audit.

## 6. Milestone 3 Preview

Remaining work:
- Job Search API integration (connect to real backend)
- Job detail page (/jobs/[id])
- Application flow integration
- Pagination with real data
