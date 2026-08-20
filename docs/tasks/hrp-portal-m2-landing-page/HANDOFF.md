# HANDOFF: hrp-portal-m2-landing-page

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m2-landing-page` |
| Milestone | 2 — Landing Page & CTV Portal |
| Execution round | `1` |
| Baseline | `HEAD of main` (sau M1 ACCEPTED) |
| Status | **READY_FOR_AUDIT** |
| Source | `stitch/hrp_collaborator_page_html_standard/code.html` + `stitch/hrp_landing_page_html_standard/code.html` |

## 1. What was done

### 1.1 CTV Portal — `app/(portal)/ctv-portal/page.tsx`

Triển khai đầy đủ từ `stitch/hrp_collaborator_page_html_standard/code.html`:

**Hero Section:**
- Gradient background (135deg từ `var(--color-primary-soft)` đến `#f9a174`)
- Headline "Giới thiệu thành viên, nhận tiền ngay d� dàng"
- 2 CTA buttons: Đăng ký tham gia miễn phí + Video hướng dẫn
- Illustration column: large `groups` icon + 2 floating coins animation

**Process Section (5 bước):**
- Grid `1 col → 3 col → 5 col` responsive (mobile/tablet/desktop)
- Mỗi step card: icon circle + title + description
- Hover effects: lift -5px + shadow upgrade
- Material symbols icons: `ads_click`, `person_search`, `description`, `monitoring`, `payments`

**Token sử dụng:**
- `bg-primary`, `text-primary`, `border-primary/20`, `bg-primary-soft`, `text-on-surface`, `text-on-surface-variant`
- Reused shadow tokens: `shadow-card`, `shadow-card-hover`
- Custom gradient inline (đặc thù của mockup)

**Route:** `/ctv-portal` (tránh conflict với `/ctv` CTV Dashboard ở `app/ctv/page.tsx`).

### 1.2 Landing Page — `app/(portal)/home/page.tsx` (refactor)

Convert sang `'use client'` với search state:

**Job Search Form (improved):**
- `useState` cho `keyword` + `location` + `submitting` + `message`
- Controlled inputs (controlled components)
- `handleSearch` với `URLSearchParams` + setTimeout simulation
- Quick tag chips click → fill keyword
- Inline status message
- Loading state "Đang tìm..." với disabled button

**Responsive polish:**
- Hero: `py-16 md:py-24 lg:py-32` thay vì fixed `h-[640px]`
- All grids: `grid-cols-1 md:grid-cols-3` / `sm:grid-cols-2`
- Heading sizes: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl`
- Spacing: `gap-8 md:gap-12`, `mb-12 md:mb-16`

**New CTA section:**
- "Trở thành Cộng tác viên HRP" — link to `/ctv-portal`
- `bg-primary-soft` background

**Provinces list:** Mở rộng từ 4 → 7 (Bắc Ninh, Bắc Giang, Hà Nội, Hải Phòng, Đà Nẵng, TP.HCM)

### 1.3 Route Resolution

| Route | File | Purpose |
|---|---|---|
| `/ctv` | `app/ctv/page.tsx` (existing) | CTV Dashboard (auth) — KHÔNG đổi |
| `/ctv-portal` | `app/(portal)/ctv-portal/page.tsx` (NEW) | CTV public landing (anon) |
| `/home` | `app/(portal)/home/page.tsx` (modified) | Job Market landing |
| `/` | `app/(portal)/home/page.tsx` (modified) | Same as /home |

## 2. Verification Evidence

### Build
```
npm run build → exit 0 ✓
26 routes + 2 mới: /ctv-portal (165 B), /home (2.86 kB)
```

### Test
```
npx vitest run → 35 files, 605 tests PASS, exit 0 ✓
```

### Routes
```
○ /ctv           (CTV Dashboard — existing, intact)
○ /ctv-portal    (NEW: 165 B)
○ /home          (refactored: 2.86 kB, was 260 B)
```

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `app/(portal)/ctv-portal/page.tsx` | NEW — Hero + 5-step Process | RQ-01 |
| `app/(portal)/home/page.tsx` | MOD — client component, search form, responsive | RQ-02 |
| `docs/tasks/hrp-portal-m2-landing-page/HANDOFF.md` | NEW | RQ-04 (implicit) |

## 4. Compliance

| AC | Pass | Evidence |
|---|---|---|
| AC-01 (RQ-01) | ✅ | `/ctv-portal` renders Hero + 5 steps from mockup |
| AC-02 (RQ-02) | ✅ | `/home` has working Job Search UI + responsive |
| AC-03 (RQ-03) | ✅ | `npx vitest run` exit 0, 605/605 PASS |

## 5. Next Gate

`/audit hrp-portal-m2-landing-page` — Tier 3 audit.

## 6. Milestone 3 Preview

Remaining work:
- Job Search API integration
- CTV registration flow
- Testimonial / partner logos sections
- Performance optimization (lazy load images)
