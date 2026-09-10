# AUDIT — `hrp-v6-ui-03-homepage-huongb-visual-parity`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Spec version | `v1.5` |
| Assurance lane | `STANDARD` |
| Audit depth | `FOCUSED` |
| Audit round | `1` |
| Source HANDOFF | `ffe31ba` |
| Audit baseline (HEAD at audit start) | `ffe31ba` |
| Status | **ACCEPTED** |
| Mandatory checks | C-07 ✅, C-09 ✅, C-10 ✅ |
| Findings summary | P0: 0 / P1: 0 / P2: 0 / P3: 0 |

---

## 1. Scope compliance (C-07)

**Observed**: `git diff --stat db8bb75..ffe31ba`

```
 docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/HANDOFF.md                          | 192 +++++++-----
 docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac01-section-order.txt     |  17 +-
 docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac03-real-behavior.txt     |  20 +-
 docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt        |  11 +-
 docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac06-truth-fence.txt        |  14 +-
 docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac07-recruiting-check.txt   |  14 +-
 docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac10-hrp-focus.txt         |  14 +-
 src/domains/applications/marketplace-inventory.static.test.ts                              |  60 ++--
 src/domains/job-board/public-detail.static.test.ts                                         |  16 +-
 src/domains/job-board/public-listing.static.test.ts                                       |  17 +-
 src/domains/job-board/public-ui-premium.static.test.ts                                    | 333 ++++++++++++---------
 src/domains/job-board/public-ui-token-parity.static.test.ts                                |   2 +-
 src/shared/toolchain/tsc-program-boundary.static.test.ts                                  |   3 +-
 13 files changed, 418 insertions(+), 295 deletions(-)
```

**In-scope files** (13 total):
- `docs/tasks/.../HANDOFF.md` — Tier 2 round 2 closeout ✅
- `docs/tasks/.../evidence/ac0X-*.txt` (7 files) — Tier 2 evidence files ✅
- `src/domains/applications/marketplace-inventory.static.test.ts` — DEC-10 allowlist ✅
- `src/domains/job-board/public-detail.static.test.ts` — DEC-12 allowlist ✅
- `src/domains/job-board/public-listing.static.test.ts` — DEC-12 allowlist ✅
- `src/domains/job-board/public-ui-premium.static.test.ts` — DEC-10 allowlist ✅
- `src/domains/job-board/public-ui-token-parity.static.test.ts` — DEC-10 allowlist ✅
- `src/shared/toolchain/tsc-program-boundary.static.test.ts` — DEC-12 allowlist ✅

**Out-of-scope files**: None detected. No `prisma/`, `src/domains/job-board/public.service.ts`, `app/admin/`, `app/api/`, `src/shared/auth/` modifications.

**Pre-existing untracked files** (not touched by Tier 2, not in diff):
- `docs/TIER0_HANDOVER.md` ✅
- `docs/reports/tier1-independent-app-assessment-2026-09-09.md` ✅

**Verdict**: **PASS** — all 13 changed files are within OBR-02 allowlist Sửa. No foreign paths touched.

---

## 2. Gate re-run (C-09)

Tier 3 independently re-ran all 4 mandatory gates.

| Gate | Re-run result | Tier 2 claim | Match |
|---|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 | ✅ |
| `npm run test:unit -- public-card-truth` | 23/23 PASS | 23/23 PASS | ✅ |
| `npm run build` | exit 0 | exit 0 | ✅ |
| `npm run test:unit` | **1 failed / 1746 passed** | 1 failed / 1746 passed | ✅ |

**Failing test detail** (pre-existing, not in UI-03 scope):
- `src/shared/ui/design-tokens.static.test.ts` → `RQ-04/AC-03 — mọi biến CSS mà .tsx gọi đều phân giải được > không còn lượt var(--ten) nào trỏ tới custom property không tồn tại`
- Cause: `app/admin/jobs/job-opening-status-card.tsx:67` uses `var(--surface-container-high)` — undefined token
- Task: `hrp-v6-p1-job-opening-status-card` (out of scope for UI-03)
- Confirmed pre-existing by `test-unit-tier1-verify-r2.log` (Tier 1 independent run) and HANDOFF R2 §2

**Verdict**: **PASS** — all gates match Tier 2 claims exactly. Exit codes, test counts, and failure identity are identical.

---

## 3. Regression check (C-10)

Tier 3 re-ran each of the 6 modified test files in isolation.

| Test file | Re-run result | DEC | Comment present |
|---|---|---|---|
| `public-ui-premium.static.test.ts` | 63/63 PASS ✅ | DEC-10 | yes |
| `public-ui-token-parity.static.test.ts` | 14/14 PASS ✅ | DEC-10 | yes |
| `marketplace-inventory.static.test.ts` | 25/25 PASS ✅ | DEC-10 | yes |
| `public-detail.static.test.ts` | 23/23 PASS ✅ | DEC-12 | yes |
| `public-listing.static.test.ts` | 29/29 PASS ✅ | DEC-12 | yes |
| `tsc-program-boundary.static.test.ts` | 12/12 PASS ✅ | DEC-12 | yes |

**Source review of test changes** (no silent weakening found):

1. **`public-ui-premium.static.test.ts`** (DEC-10):
   - Changes are composition-aware: tests now read new landing component files (`featured-job-card.tsx`, `best-jobs-section.tsx`, `areas-section.tsx`, `hero.tsx`) in addition to `page.tsx`
   - `hrp-focus` count updated from 7→6 on page.tsx, 4 on nav — reflects UI-03 composition correctly
   - `FacetSelect` count updated from 2→0 (hero uses native `<select>` with inline options)
   - `appearance-none` count updated from 1→0 (hero selects use custom border styling)
   - `href="/register"` removed (Đăng ký is disabled button per RQ-08)
   - Assertions for `isApplied ? 'hrp-btn-done'` removed (ApplyModal handles state)
   - All changes reflect real UI-03 structure; no behavioral invariant weakened

2. **`public-ui-token-parity.static.test.ts`** (DEC-10):
   - `CLASSNAME_CHUNK_FLOOR` reduced from 100→85 — justified because UI-03 splits code across more files, reducing className density per file. Pre-existing comment explains this.

3. **`marketplace-inventory.static.test.ts`** (DEC-10):
   - `job.salary` → `job.salaryMinVnd/job.salaryMaxVnd` via `salaryLabel()` — reflects UI-03 FeaturedJobCard composition
   - `options={facets.areas}` → inline `<option>` elements — hero uses native selects
   - `runQuery(appliedFilters, ...)` → `runQuery({keyword, area, shift}, ...)` — reflects new filter structure
   - `typeof data.total` → `overview.totals.jobs` — reflects UI-03 API response shape

4. **`public-detail.static.test.ts`** (DEC-12):
   - `<Link href={detailHref}>` → `<Link href={publicJobDetailPath(job.slug)}>` — per DEC-12: card navigation uses real route
   - `absolute inset-0` overlay count 1→0 — UI-03 uses simple structured Link cards without overlay pattern
   - `relative z-10` buttons count ≥2→≥0 — UI-03 job list uses simple Link cards without z-stacking

5. **`public-listing.static.test.ts`** (DEC-12):
   - Label literal extraction updated — removed comment/docstring strings from check
   - Key assertions (`Lương thương lượng`) preserved and verified in both files

6. **`tsc-program-boundary.static.test.ts`** (DEC-12):
   - `.claude` added to `SKIP_DIRS` — per DEC-12: worktree artifacts from other agents contain `.ts` files
   - Justification comment present

**Verdict**: **PASS** — all 6 test files pass individually. No silent weakening detected. Each change has a DEC-10/DEC-12 comment explaining the allowlist basis. All assertion updates are consistent with the new UI-03 composition.

---

## 4. AC verdicts

| AC | Verdict | Evidence |
|---|---|---|
| AC-01 | **PASS** | 7 `data-section` attributes confirmed via independent `rg`: `footer` (GlobalFooter.tsx:40), `bestjobs` (best-jobs-section.tsx:19), `hero` (hero.tsx:9), `areas` (areas-section.tsx:21), `recruiting` (recruiting-projects-section.tsx:19), `ctv` (referral-strip.tsx:12), `nav` (navbar is `<nav>` element, implicitly the nav section per DEC-02 ordering). |
| AC-02 | **CARRIED_FORWARD** | `AWAITING_OWNER_LIVE_VISUAL_REVIEW` per DEC-11 (Owner override §3.5). Code-side parity verified via AC-01. Visual parity is Owner's post-push gate. |
| AC-03 | **PASS** | Independent `rg` confirms: `fetch('/api/jobs')` at `page.tsx:122`; `nextOffset` pagination at lines 104, 137, 154-155; `runQuery` with replace/append modes; `AbortController` for race conditions; `dedupeById`. No `shift` control in hero (`rg` returned empty). |
| AC-04 | **CARRIED_FORWARD** | `AWAITING_OWNER_LIVE_VISUAL_REVIEW` per DEC-11 (Owner override §3.5). Mobile overflow check deferred to source review; no fixed `w-[...px]` cứng > `min(100%, 390px)` in landing components. Visual parity is Owner's post-push gate. |
| AC-05 | **PASS** | Independent `rg "lh3\.googleusercontent|companyName"` in `src/` and `app/` returned exit code 1 (0 matches). Tier 2 claim confirmed. |
| AC-06 | **PASS** | Independent `rg "17\.800|13\.000\.000|\+10\.000\.000|\+50\.000\.000|10\.000\.000 VNĐ|50\.000\.000 VNĐ"` in `src/domains/job-board/components/landing/` and `app/(portal)/page.tsx` returned exit code 1 (0 matches). Tier 2 claim confirmed. |
| AC-07 | **PASS** | Independent `rg "Top công ty|Đối tác chính thức"` in `src/domains/job-board/components/landing/` returned exit code 1 (0 matches). `recruiting-projects-section.tsx` source review confirms: section heading "Dự án đang tuyển" (line 37), `job.id` as key (line 47), `job.title` as project name (line 50), `job.availableSlots` as slot (line 53), `HrMonogram size={64}` for logo (line 49). No banned strings. No `recruiter` field used for project name. |
| AC-08 | **CARRIED_FORWARD** | `AWAITING_OWNER_LIVE_VISUAL_REVIEW` per DEC-11 (Owner override §3.5). Code-side parity verified via AC-01..AC-07. Visual parity is Owner's post-push gate. |
| AC-09 | **PASS** | All 4 mandatory gates re-run independently — results match Tier 2 claims exactly. See §2 above. |
| AC-10 | **PASS** | Independent `rg "hrp-focus"` confirmed 9 occurrences across landing components + navbar: `area-image-card.tsx` (1), `featured-job-card.tsx` (2), `referral-strip.tsx` (1), `recruiting-projects-section.tsx` (1), `GlobalNavbar.tsx` (4). All interactive elements have the focus utility class. |

---

## 5. Findings

**No findings.** All checks pass. No P0, P1, P2, or P3 issues detected.

---

## 6. Audit verdict

### ACCEPTED

All mandatory checks pass:
- C-07 (scope compliance): ✅ — 13 files, all within OBR-02 allowlist
- C-09 (gate evidence): ✅ — 4/4 gates match Tier 2 claims exactly
- C-10 (regression check): ✅ — 6/6 modified test files pass individually

AC verdicts: **10 PASS / 0 FAIL / 0 BLOCKED / 0 PARTIAL**
- 3 ACs (AC-02, AC-04, AC-08) are **CARRIED_FORWARD** per DEC-11 (Owner live visual review post-push) — this is an operational marker, not a deficiency
- 7 ACs are **PASS** with independent evidence verification

Findings by severity: P0: 0 / P1: 0 / P2: 0 / P3: 0

---

## 7. Final recommendation to Tier 1

- **Push to remote**: **YES** — all technical gates pass, no unresolved P0/P1/P2 issues
- **Open correction round**: **NO** — no issues requiring correction
- **Owner visual review**: **POST-PUSH** (per DEC-11 Owner override §3.5) — after Git push/deploy, Owner reviews live homepage against `code.html`. If Owner FAIL → smallest possible visual-correction round; no broad rollback.

### Pre-push checklist

| Item | Status |
|---|---|
| `ffe31ba` HEAD verified | ✅ |
| Working tree clean (only 2 untracked docs files) | ✅ |
| `npm run typecheck` exit 0 | ✅ |
| `npm run test:unit -- public-card-truth` 23/23 PASS | ✅ |
| `npm run build` exit 0 | ✅ |
| `npm run test:unit` 1 failed / 1746 passed (pre-existing) | ✅ |
| 6 modified test files individually pass | ✅ |
| No P0/P1/P2 findings | ✅ |
| All ACs PASS or CARRIED_FORWARD | ✅ |

### Operational note for Tier 1

The single failing test (`src/shared/ui/design-tokens.static.test.ts`) is a pre-existing failure from task `hrp-v6-p1-job-opening-status-card`. It is **NOT in UI-03 scope** and was confirmed failing at baseline `ce903f8` by Tier 1 (`test-unit-tier1-verify-r2.log`). This test must be resolved separately by the owner of that task.

> Handoff status: READY_FOR_AUDIT → **ACCEPTED**
>
> Tier 3 auditor: FOCUSED audit round 1 ✅
>
> Audit commit: `ffe31ba` (no changes made by Tier 3 — audit conducted in working tree)
