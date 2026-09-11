# HANDOFF — `hrp-v6-ui-04d-pre-existing-13-fail-resolve-2026-09-11`

> Resolve 13 fail pre-existing từ R3 + V6 AV1 cleanup.

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04d-pre-existing-13-fail-resolve-2026-09-11` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `ce7fc7c` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome

Đã resolve **13 fail pre-existing** từ R3 + V6 AV1. Tất cả test hiện 0 fail.

### Group A — Stale test assertions (10 fail)

| Test | Fix |
|---|---|
| `public-ui-premium` A1 | Title `font-head text-headline-md` → `text-base font-semibold leading-snug` |
| `public-ui-premium` A2 | Location `text-on-surface-variant` → `text-slate-500` |
| `public-ui-premium` A3 | Salary `bg-primary-fixed` → `bg-emerald-50 text-emerald-700 border-emerald-100` (3 assertions riêng) |
| `public-ui-premium` A4 | Icon count: `material-symbols-outlined` → Lucide icons (MapPin, Banknote, Clock3, Flame) |
| `public-ui-premium` A5 | `jobs.slice(0, pageSize)` → `jobs.map(...)` |
| `public-ui-premium` A6+A7 | `BEST_JOBS_URGENT_PREVIEW` → `bestJobsUrgentData` + live API |
| `marketplace-inventory` A8 | `BEST_JOBS_URGENT_PREVIEW` → `bestJobsUrgentData` |
| `marketplace-inventory` A9 | `urgency=URGENT` → test positive (live API sends urgency) |
| `marketplace-browse` A10 | Add `urgency: null` trong spy call args |

### Group B — Real source fixes (3 fail)

| Test | Fix |
|---|---|
| `design-tokens` B2 | `var(--surface-container-high)` → `var(--color-surface-container-high)` trong `app/admin/jobs/job-opening-status-card.tsx` |
| `public-ui-token-parity` B1 | Thêm semantic color tokens vào `@theme`: `--color-slate-{50,100,400,500,700,900}`, `--color-emerald-{50,100,700}`, `--color-orange-500` |

**Bonus fix (không thuộc 13 fail):** Test `featured-job-card.test.ts` check alpha từ `CARD` thay vì `stamp-defs.ts` — đã update test để đọc `stamp-defs.ts`.

## 2. Evidence

| Evidence | Result |
|---|---|
| `npm run typecheck` | `exit 0` |
| `npm run test:unit` | `0 failed | 1847 passed | 116 files` |
| `npm run build` | `Compiled successfully` |

## 3. Verification

- Baseline (`ce7fc7c`): 13 fail pre-existing
- HEAD (`fe54903`): 0 fail
- Diff: +379 insertions, -14 deletions

---

*Handoff status: `READY_FOR_REVIEW` (Audit NONE → Tier 1 đã review tại chỗ.)*
