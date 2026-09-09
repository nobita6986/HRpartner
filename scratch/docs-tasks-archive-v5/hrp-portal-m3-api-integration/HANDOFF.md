# HANDOFF: hrp-portal-m3-api-integration

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m3-api-integration` |
| Milestone | 3 — API Integration |
| Execution round | `1` |
| Baseline | `HEAD of main` (sau M2.5) |
| Status | **READY_FOR_AUDIT** |
| Source | `app/api/jobs/route.ts`, `app/api/auth/login/route.ts`, `app/api/me/route.ts` |

## 1. What was done

### 1.1 RQ-01 — Job Dashboard API Integration (`app/(portal)/page.tsx`)

Replaced static `MOCK_JOBS` array with real API fetch from `/api/jobs`.

**`EnrichedJob` interface** — adapter layer (DEC-01, RISK-01 mitigation):
```typescript
interface EnrichedJob {
  id: string;           // from API
  title: string;        // from API
  company: string;      // enriched: "HRP Partners"
  icon: string;         // enriched: keyword mapping
  salary: string;       // enriched: from availableSlots
  location: string;     // enriched: static
  schedule: string;     // enriched: static
  badge: string|null;   // enriched: "Tuyển gấp" | "Đã tuyển đủ" | null
  badgeType: string|null;
  filled: null;
  remaining: number;    // from API
}
```

**Icon enrichment:** `ICONS_BY_KEYWORD` array maps title keywords to material symbols icons.

**Salary enrichment:** derived from `availableSlots`:
- 0 slots → "Hết vị trí"
- 1-5 slots → dynamic range (urgent)
- 6+ slots → "7 - 12 Triệu"

**Badge logic:**
- `availableSlots === 0` → "Đã tuyển đủ" (gray, disabled)
- `availableSlots <= 5` → "Tuyển gấp" (red)
- else → no badge

**State management:**
- `useState<EnrichedJob[]>([])` — job list
- `useState<string[]>([])` — `appliedIds` tracking
- `useCallback` for `fetchJobs` (stable reference)
- `useEffect` triggers fetch on mount
- Client-side keyword filter (passes `?q=` intent; backend filtering in future)

**Apply flow:**
- `ApplyModal` component: controlled form (fullName, phone, cccdNumber)
- POST to `/api/jobs` with `projectId` + form data
- Success → `SuccessModal` with submission code
- Applied state tracked in `appliedIds[]`

**Error/loading states:**
- Error banner with "Thử lại" button
- Loading: 6-card skeleton with pulse animation
- Empty state: "Không tìm thấy việc làm phù hợp"

### 1.2 RQ-02 — Auth Flow in GlobalNavbar (`app/components/GlobalNavbar.tsx`)

**Session check:**
- `useEffect` → `GET /api/me` on mount
- `401` → `setUser(null)` (not logged in)
- `200` → `setUser({ userId, role })` (logged in)

**Logged-in state (Avatar + Dropdown):**
- Shows `Avatar` (2-letter initials, orange circle)
- Dropdown: shows userId, role badge, "Bảng điều khiển" → `/ctv`, "Đăng xuất" → `POST /api/auth/logout`
- Outside-click closes dropdown

**Not logged-in state:**
- "Đăng nhập" button → `/login`
- "Đăng ký" button → `/register`

**Loading state:**
- Pulse skeleton circle while `/api/me` resolves

**Mobile:** Same auth states replicated in mobile menu.

**Logout:** `POST /api/auth/logout` → redirect to `/`.

### 1.3 Data Flow Summary

```
GET /api/me → 401 → guest UI
GET /api/me → 200 { userId, role } → avatar + dropdown

GET /api/jobs → { jobs: ApiJob[] } → map(enrichJob) → EnrichedJob[]
  ↓
JobCard[] with keyword filter
  ↓
ApplyModal → POST /api/jobs → 201 { submission } → SuccessModal
```

## 2. Verification Evidence

### Build
```
npm run build → exit 0 ✓
26 routes preserved
```

### Test
```
npx vitest run → 35 files, 605 tests PASS, exit 0 ✓
```

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `app/(portal)/page.tsx` | REWRITE — API fetch, adapter, ApplyModal, SuccessModal, skeleton loading | RQ-01 |
| `app/components/GlobalNavbar.tsx` | REWRITE — auth session, avatar dropdown, logout | RQ-02 |
| `docs/tasks/hrp-portal-m3-api-integration/HANDOFF.md` | NEW | RQ-04 (implicit) |

## 4. Compliance

| AC | Pass | Evidence |
|---|---|---|
| AC-01 (RQ-01) | ✅ | `/` fetches from `/api/jobs`, filter changes displayed list, Apply → POST |
| AC-02 (RQ-02) | ✅ | `/api/me` check → Navbar shows avatar/logged-in UI or login buttons |
| AC-03 (RQ-03) | ✅ | `npx vitest run` exit 0, 605/605 PASS |

## 5. Next Gate

`/audit hrp-portal-m3-api-integration` — Tier 3 audit.

## 6. Milestone 4 Preview

Remaining work:
- `/api/jobs` search params filtering (`?q=`, `?location=`, `?industry=`)
- Job detail page (`/jobs/[id]`)
- Auth redirect: after login return to previous page
- Real CTV registration form
- Pagination for job listings
