# HANDOFF: hrp-portal-m1-design-system

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m1-design-system` |
| Milestone | 1 — Design System & Public Layout |
| Execution round | `2` (Round 1: Design System + Layout + Navbar + Footer | Round 2: Fix user.test.ts cookie name + READY_FOR_AUDIT) |
| Baseline | `HEAD of main` |
| Status | **READY_FOR_AUDIT** |
| Source | `stitch/warm_professionalism/DESIGN.md` + `stitch/hrp_landing_page_html_standard/code.html` |

## 1. What was done

### Round 1 — Design System + Public Layout

#### 1.1 Design System — Tailwind v4 `@theme` tokens

Updated `app/globals.css` to use Tailwind v4 `@theme` directive, mapping all tokens from `stitch/warm_professionalism/DESIGN.md`:

**Brand tokens:**
```
--color-primary: #f26522         (canonical G27)
--color-primary-dark: #a63b00    (hover/active)
--color-primary-soft: #fdf1ec    (tint ~10%)
--color-on-primary: #ffffff
--color-primary-container: #a63b00
```

**Surface tokens (11 levels):**
```
--color-background: #faf9f7
--color-surface: #ffffff
--color-surface-dim: #dadad8
--color-surface-container-low: #f4f3f1
--color-surface-container: #efeeec
--color-surface-container-high: #e9e8e6
--color-surface-container-highest: #e3e2e0
--color-on-surface: #1a1c1b
--color-on-surface-variant: #594138
```

**Semantic tokens:**
```
--color-success: #16803a
--color-success-soft: #e7f4ec
--color-warning: #b45309
--color-warning-soft: #fdf1e7
--color-brand-red: #d9272d
--color-brand-dark: #333333
--color-line: #eae8e4
```

**Typography:** Fonts (`Be Vietnam Pro`, `Inter`) already configured via `next/font/google` in `app/layout.tsx`.

**Border radius:**
```
--radius-sm: 0.25rem     --radius-DEFAULT: 0.5rem
--radius-md: 0.75rem     --radius-lg: 1rem
--radius-xl: 1.5rem      --radius-full: 9999px
```

### 1.2 Public Layout — `app/(portal)/layout.tsx`

Created route group layout wrapping all public pages:

```
app/(portal)/
  layout.tsx      — GlobalNavbar + GlobalFooter wrapper
  home/page.tsx   — Landing page (/)
  ctv/page.tsx    — CTV portal (/ctv)
```

`GlobalNavbar` and `GlobalFooter` are shared components under `app/components/`.

### 1.3 Navbar — `app/components/GlobalNavbar.tsx`

- Logo: HR**P** with orange accent
- Desktop nav: 6 links (Việc làm, Dịch vụ Tuyển dụng, Giải pháp Nhân sự, Cộng tác viên, Về chúng tôi, Liên hệ)
- Auth buttons: Ghost (Đăng nhập) + Primary (Đăng ký)
- Mobile: Hamburger toggle with `useState`, dropdown nav with auth buttons
- Responsive: `md:flex` / `md:hidden`

### 1.4 Footer — `app/components/GlobalFooter.tsx`

- HR**P** logo
- 4 nav links
- Copyright with dynamic year

### 1.5 Landing Page — `app/(portal)/home/page.tsx`

Full hero section from `code.html`:
- Hero banner (640px, gradient overlay)
- Badge "Kết Nối Để Thành Công"
- Headline + subline
- Search box (keyword + location dropdown + CTA button)
- Quick-tag chips

Services section (3-column grid):
- Dịch vụ Tuyển dụng, Giải pháp Nhân sự, Đào tạo & Phát triển

Why HRP + Contact form section.

### Round 2 — Fix user.test.ts cookie regression (AUD-003)

**Problem:** `src/shared/auth/user.test.ts` used cookie name `hrp_token` but `src/shared/auth/user.ts` exports `AUTH_COOKIE_NAME = 'hrp_session'`. Test was failing because the mock cookie name didn't match the actual implementation.

**Fix:** Updated 3 test cases in `user.test.ts` to use `hrp_session` instead of `hrp_token`:
- `'đọc token từ cookie hrp_session'` (was: `hrp_token`)
- `'cookie ưu tiên hơn Bearer'` — `hrp_session=cook123` (was: `hrp_token`)

**Result:** `npx vitest run src/shared/auth/user.test.ts` → 5/5 PASS, exit 0
**Result:** `npx vitest run` (full suite) → 605/605 PASS, exit 0

### 1.6 CTV Page — `app/(portal)/ctv/page.tsx`

Stub page: heading + login prompt card (uses existing `app/ctv/page.tsx` for full dashboard, so `(portal)/ctv` acts as the public-facing CTV portal landing).

## 2. Verification Evidence

### Build
```
npm run build → exit 0 ✓
Compiled successfully in 17.3s
26 routes, 70 pages
```

Key routes:
```
○ / (portal landing)
○ /ctv (CTV portal)
○ /home (→ /)
```

### Token Coverage

| Token group | Count | Tailwind class |
|---|---|---|
| Colors (primary, surface, semantic) | ~30 | `bg-primary`, `text-on-surface`, etc. |
| Border radius | 6 | `rounded-DEFAULT`, `rounded-lg` |
| Shadows | 1 | `shadow-card` (ambient orange) |
| Spacing | 5 | custom CSS vars |
| Typography | 3 | `--font-head/body/label` |

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `app/globals.css` | MOD — add Tailwind v4 `@theme` tokens, update old CSS vars | Design system integration |
| `app/(portal)/layout.tsx` | NEW — route group layout | Separate portal from admin/worker |
| `app/(portal)/home/page.tsx` | NEW — landing page | Public homepage |
| `app/(portal)/ctv/page.tsx` | NEW — CTV portal page | Public CTV landing |
| `app/components/GlobalNavbar.tsx` | NEW — sticky navbar with mobile menu | Global navigation |
| `app/components/GlobalFooter.tsx` | NEW — footer with logo + links | Global footer |
| `src/shared/auth/user.test.ts` | MOD — `hrp_token` → `hrp_session` | Cookie regression fix (AUD-003/RQ-03) |
| `docs/tasks/hrp-portal-m1-design-system/HANDOFF.md` | MOD — status → READY_FOR_AUDIT | Planner requirement |

## 4. Design Tokens Reference

All tokens available for use in components:

```tsx
// Colors — use Tailwind classes
<div className="bg-primary text-on-primary" />        // #f26522 / #fff
<div className="bg-surface shadow-card" />            // #fff / ambient shadow
<div className="bg-surface-container-low" />         // #f4f3f1

// Typography
<div className="font-[family-name:var(--font-head)]" />

// Radius
<button className="rounded-DEFAULT" />               // 8px
<div className="rounded-lg" />                        // 16px

// Semantic
<div className="bg-success-soft text-success" />     // green
<div className="bg-warning-soft text-warning" />     // amber
```

## 5. Next Gate

`/audit hrp-portal-m1-design-system` — Tier 3 audit.

## 6. Milestone 2 Preview

Remaining work for M2:
- Full Hero Section content
- Job Search functionality
- Additional portal pages (services, about, contact)
- Responsive polish
