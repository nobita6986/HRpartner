# TASK — `hrp-v6-ui-04d-pre-existing-13-fail-resolve-2026-09-11`

> Resolve 13 fail pre-existing từ R3 (`8c6fd03`) + plan V6 AV1 cleanup.
> Phân loại 2 nhóm: **stale tests** (10 fail) → cập nhật test cho khớp source; **real source bugs** (3 fail) → fix source.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04d-pre-existing-13-fail-resolve-2026-09-11` |
| Work type | `CODE` (test refactor + 3 source fixes) |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` → commit `fe54903` |
| Planner | `Tier 1` |
| Baseline | `ce7fc7c` (HEAD trước task) |
| In-scope roots | `src/domains/job-board/public-ui-premium.static.test.ts`, `src/domains/job-board/public-ui-token-parity.static.test.ts`, `src/domains/applications/marketplace-inventory.static.test.ts`, `src/domains/applications/marketplace-browse.routes.test.ts`, `src/shared/ui/design-tokens.static.test.ts`, `app/globals.css`, `docs/tasks/hrp-v6-ui-04d-pre-existing-13-fail-resolve-2026-09-11/**` |
| Forbidden paths | `app/(portal)/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `prisma/**`, `app/api/**`, mọi task docs khác |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` 0 fail; `npm run build` exit 0; `verify-task.ps1` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

**Group A — Update stale tests (10 fail):**

| Test | Stale assertion | New assertion | Lý do |
|---|---|---|---|
| A1 `public-ui-premium` (test code RQ-02..04) | `font-head text-headline-md font-bold` ở CARD | `text-base font-semibold leading-snug` | R3 đổi title size sang `text-base` |
| A2 `public-ui-premium` (test code RQ-02..04) | `text-on-surface-variant` ở CARD | `text-slate-500` | R3 dùng raw color (intentional — minimal_touch) |
| A3 `public-ui-premium` (AC-05,06 ở file test) | `bg-primary-fixed` ở CARD (salary pill) | `bg-emerald-50 text-emerald-700 border-emerald-100` | R3 đổi salary pill palette |
| A4 `public-ui-premium` (AC-21 ở file test) | `material-symbols-outlined` ≥ 3 | `Lucide icons ≥ 3` (MapPin + Banknote + Clock3) | R3 chuyển sang Lucide React |
| A5 `public-ui-premium` (test code DEC-01) | `jobs.slice(0, pageSize)` ở BEST | `jobs.map(...)` (page đã slice từ fetch) | Component nhận `jobs` đã đúng kích thước |
| A6 `public-ui-premium` (test code DEC-06) | `BEST_JOBS_URGENT_PREVIEW` ở page | bỏ — dùng live API | V6 AV1 cleanup |
| A7 `public-ui-premium` (test code DEC-06) | `bestJobsTab === 'all' ? bestJobsData.jobs : BEST_JOBS_URGENT_PREVIEW` | `bestJobsTab === 'all' ? bestJobsData.jobs : bestJobsUrgentData.jobs` | Live API urgent state |
| A8 `marketplace-inventory` (test code DEC-01) | `BEST_JOBS_URGENT_PREVIEW` | bỏ | V6 AV1 cleanup |
| A9 `marketplace-inventory` (test code DEC-01) | `not match /\/api\/jobs\?.*urgency=URGENT/` | match được | V6 đổi sang live API |
| A10 `marketplace-browse` (test code RQ-03) | spy called với query cụ thể | bỏ — test handler đổi signature | Route đổi từ V5-OPS-06A → V6 |

**Group B — Fix real source bugs (3 fail):**

| Test | Source bug | Fix |
|---|---|---|
| B1 `public-ui-token-parity` (AC-12 ở file test) | 14 classes không resolve về `@theme` token | Thêm token alias hoặc đổi class về semantic |
| B2 `design-tokens` (AC-04 ở file test) | CSS alias thiếu `:root` 22 declarations | Thêm `:root` block với 22 declarations |
| B3 `design-tokens > R2-04` | Alias dán vào comment, không sống | Sửa vị trí khối `:root` ra ngoài comment |

### 1.2 Non-goals

- KHÔNG đụng `app/(portal)/page.tsx`, `app/(jobs)/viec-lam/page.tsx`.
- KHÔNG đụng API/schema.
- KHÔNG thêm dependency mới.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `evidence/E-01-typecheck.txt` | typecheck exit 0 |
| `EV-02` | `evidence/E-02-test-unit.txt` | test:unit 0 fail |
| `EV-03` | `evidence/E-03-build.txt` | build exit 0 |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Group A: cập nhật stale test khớp source thực tế (R3 + V6 đã đổi có chủ đích) | `CHOSEN` |
| `DEC-02` | Group B: sửa source (CSS) để test pass — token parity là test bảo vệ source | `CHOSEN` |
| `DEC-03` | KHÔNG thêm test mới; chỉ sửa assertion đã có | `CHOSEN` |
| `DEC-04` | CHỈ sửa test nếu assertion đang đo "stale pattern"; KHÔNG xoá test bảo vệ thật | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Group A — 10 stale assertions cập nhật theo source thực tế |
| `RQ-02` | Group B — 14 unresolved classes phải resolve về `@theme` token |
| `RQ-03` | Group B — `:root` block có đúng 22 declarations, sống (không nằm trong comment) |

### 4.2 Scope boundaries

- **In:** §0 In-scope roots
- **Out:** §0 Forbidden + §1.2

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `public-ui-premium.static.test.ts` | Group A1–A7 | Re-run test:unit | nếu fail khác → halt |
| `STEP-02` | `marketplace-inventory.static.test.ts` | Group A8 + A9 | Re-run test:unit | nếu fail khác → halt |
| `STEP-03` | `marketplace-browse.routes.test.ts` | Group A10 | Re-run test:unit | nếu fail khác → halt |
| `STEP-04` | `app/globals.css` | Group B1–B3 | Re-run test:unit | nếu fail khác → halt |
| `STEP-05` | Gates | typecheck + test:unit + build | exit code | nếu fail → halt |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `npm run test:unit` 0 fail | exit 0 với "0 failed" |
| `AC-02` | `npm run typecheck` exit 0 | exit 0 |
| `AC-03` | `npm run build` exit 0 | exit 0 |
| `AC-04` | Group A: 10 stale assertions cập nhật | `git status --porcelain | Select-String 'test\.ts'` — count ≤ 13 changed test files |
| `AC-05` | Group B: 14 unresolved classes resolved | `npm run test:unit -- public-ui-token-parity` 0 fail |
| `AC-06` | Group B: `:root` 22 declarations | `npm run test:unit -- design-tokens` 0 fail |
| `AC-07` | Verify-handoff PASS | `verify-handoff.ps1` exit 0 |
| `AC-08` | Verify-task PASS | `verify-task.ps1` exit 0 |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02`, `STEP-03` | `AC-04` |
| `RQ-02` | `STEP-04` | `AC-05` |
| `RQ-03` | `STEP-04` | `AC-06` |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Test refactor vô tình xoá bảo vệ thật | DEC-04: chỉ sửa assertion stale, không xoá test |
| `RISK-02` | CSS fix đổi visual của site | Diff CSS trước; chạy build để phát hiện |
| `RISK-03` | Phá fence anchor của task `hrp-ui-refactor-viec-lam-and-best-jobs-2026-09-11` | Grep fence anchor sau khi đổi |

## 8. Open Questions

None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 (11/09/2026) | Tier 1 thực hiện thẳng theo chỉ thị sếp | "xử lý luôn 13 fail pre-existing đi" |

## 10. Revision Log

- `v1.0` (11/09/2026): Initial TASK.
- `v1.1` (11/09/2026): Executed all 13 fixes. Commit `fe54903`. 0 fail / 1847 tests / 116 files.
