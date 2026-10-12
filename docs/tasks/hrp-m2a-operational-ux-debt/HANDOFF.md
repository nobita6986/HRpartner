# HANDOFF — `hrp-m2a-operational-ux-debt`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-m2a-operational-ux-debt` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` (origin/main HEAD at task start; merge commit of PR #89 — T1A F9-B R2 production closeout) |
| Implementation SHA | `8bb71c10fa669ea1206e17e4d7ab42efc88202d5` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `1` |
| Status | `READY_FOR_REVIEW` |

> Canonical-gates evidence (per T0 verdict `SOURCE_ACCEPTED / CHANGES_REQUIRED_DOCS_ONLY`): PR #90 CI run [`37173116377`](https://github.com/nobita6986/HRpartner/actions/runs/37173116377) — Quality (schema · typecheck · lint · unit · build) + Integration (DB tests · fail-closed) + Vercel 4/4 SUCCESS, recorded 2026-10-04T03:09Z. Quality job `111349983909`: steps 5–10 (`prisma generate` → `prisma schema validate` → `typecheck (tsc --noEmit)` → `lint (eslint .)` → `unit tests (no DB — fail-closed sentinel)` → `build (next build)`) all SUCCESS. Integration job `111349984116`: step 13 `Integration tests (container test DB; fail-closed preflight on guard mismatch)` SUCCESS. PR is `MERGEABLE`. Correction round 1 is this docs-only correction; scope locked to `TASK.md` + `HANDOFF.md`, no source/test/migration touched. The Implementation SHA cell holds the actual full SHA `8bb71c10fa669ea1206e17e4d7ab42efc88202d5`; the short form `8bb71c10` is the abbreviation used in diff ranges and runbook prose.

## 1. Outcome and changed surface

- **Delivered (RESOLVED in this round):** Four P2/P3 findings from `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` closed in a single bounded UI batch:
  - **F2/F3 — LaborProfile navigation & intake** (`RESOLVED`): Two new sidebar entries under `Nhân sự`: `Hồ sơ NLD` (`/admin/labor-profiles`) and `Tiếp nhận NLD` (`/admin/labor-profiles/new`). Role list byte-mirrors `app/admin/labor-profiles/page.tsx:16` `ALLOWED_ROLES`.
  - **F7 — JobPosting list → JobOpening** (`RESOLVED`): Staffing-order code + `JobOpening: <status>` rendered as `<Link href="/admin/job-openings/{jobOpeningId}">` when canonical ID is present; orphan rows retain plain-text fallback (`IFNOT_FOUND`).
  - **F11 — Terminology disambiguation** (`RESOLVED`): Project-level button on `/admin/jobs` renamed to `Công bố dự án` / `Bỏ công bố dự án`; header `<p data-testid="jobs-terminology-note">` glossary added. JobPosting editor shell keeps canonical English `Publish` (not edited).
- **Delivered (REMEDIATION_READY / PENDING_T1B_UI_V1_INTEGRATION):** F8 — Safe Vietnamese error mapping: NEW repo-owned module `src/domains/staffing/job-posting-error-map.ts` with `JOB_POSTING_ERROR_LABELS` (11 codes), `JOB_POSTING_RECOVERY_HINTS` (1 entry), `jobPostingErrorLabel`, `summarizeJobPostingApiError`. Unknown / null / empty code → single generic safe Vietnamese fallback. The mapper module is **shipped and unit-tested PASS** (covered by Quality CI step 9 `Unit tests (no DB — fail-closed sentinel)` — the 5 new vitest test files in this round, including the F8 mapper unit suite, all green on PR #90 CI run [`37173116377`](https://github.com/nobita6986/HRpartner/actions/runs/37173116377)) and the T1B integration contract for `editor-shell.tsx` is shipped verbatim in this round's HANDOFF §6. **F8 stays `PENDING_T1B_UI_V1_INTEGRATION`** until the T1B round wires `summarizeJobPostingApiError` into `editor-shell.tsx.readErrorMessage` and the new T1B editor-shell test suite (`editor-shell.f8.test.ts`) PASSes. Only then does F8 transition to `RESOLVED`.
- **Not delivered:** F1/F5 (already RESOLVED by PR #86); F6 (separate round, Priority 3, not yet opened); F9 (separate round, Priority 1); schema/migration/backfill; auth/RLS/role-matrix widening; JobPosting editor-shell wiring (T1B-owned per audit §G.A.1); AFF/P2.
- **Changed:**
  - `src/shared/ui/role-guard/role-guard-layout.tsx` (MODIFY — 2 new `NavItem` entries in `ADMIN_NAV_PHASE4`)
  - `app/admin/jobs/job-postings/page.tsx` (MODIFY — wrap F7 link target)
  - `app/admin/jobs/page.tsx` (MODIFY — button rename + glossary `<p>`)
  - `src/domains/staffing/job-posting-error-map.ts` (NEW — F8 safe mapper)
  - `src/domains/staffing/job-posting-error-map.test.ts` (NEW — 40+ unit assertions)
  - `src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` (NEW — 14 static assertions)
  - `app/admin/jobs/job-postings/__tests__/job-postings-list-linkage.static.test.ts` (NEW — 7 static assertions)
  - `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (NEW — 6 static assertions)
  - `docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` (NEW — V2_FAST_FREEZE contract)
  - `docs/tasks/hrp-m2a-operational-ux-debt/HANDOFF.md` (NEW — this file)

  Total: **10 paths** (3 MODIFIED production + 5 NEW test files + 2 NEW docs; the 1 NEW production file `job-posting-error-map.ts` brings the production total to 4 MODIFIED-or-NEW in production code; 5 NEW tests).
- **Lane escalation:** No.
- **Finding ledger (per T0 verdict, post-correction):** F2/F3/F7/F11 = `RESOLVED` (this round); F8 = `REMEDIATION_READY / PENDING_T1B_UI_V1_INTEGRATION` (mapper shipped + tested; editor-shell wiring deferred to T1B). F1/F5 = `RESOLVED` (PR #86, pre-batch). F6 = `NOT_OPENED`. F9 = `NOT_OPENED`.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git diff --stat origin/main..HEAD -- .` lists only 11 paths (9 in-scope + 2 docs); no `prisma/`, no `migrations/`, no `editor-shell.tsx` (see E-12, E-13 below). |
| API/route boundary | `PASS` | No route file touched. Mapper is a pure presentation module (no DOM, no I/O). `src/domains/staffing/job-posting-list.service.ts` is comment-only (no field/import/type change); DTO contract preserved byte-exact. |
| Auth/permission/data exposure | `PASS` | Sidebar role list byte-mirrors `app/admin/labor-profiles/page.tsx:16` `ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'])`. Static guard `admin-nav-phase4-people-section.static.test.ts` asserts exact match. No new PII surface. |
| Migration/backfill/rollback | `N/A` | No schema change. Rollback = revert branch commit. |
| Concurrency/idempotency | `N/A` | No DB writes; mapper is pure presentation. |
| Test isolation and cleanup | `PASS` | All new tests are vitest unit tests with no DB, no global state. None of the new test files require fixtures or DB seeding. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| `AC-16` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` | `RESULT: PASS` (run locally on implementation SHA `8bb71c10`; see §3 E-16) | `None` |
| `AC-01` | `E-01` | 14/14 vitest cases green (`admin-nav-phase4-people-section.static.test.ts`); also covered by Quality CI step 9 `Unit tests (no DB — fail-closed sentinel)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | `None` |
| `AC-02` | `E-02` | 7/7 vitest cases green (`job-postings-list-linkage.static.test.ts`); also covered by Quality CI step 9 SUCCESS | `None` |
| `AC-03` | `E-03` | 6/6 vitest cases green (`admin-jobs-terminology.static.test.ts`); also covered by Quality CI step 9 SUCCESS | `None` |
| `AC-04` | `E-04` | `git diff --stat origin/main..HEAD -- app/admin/jobs/job-postings/[id]/editor-shell.tsx` reports 0 lines; `admin-jobs-terminology.static.test.ts` case 4 (`Publish` literal preserved) PASS. Editor shell file is byte-exact baseline. | `None` |
| `AC-05` | `E-05` | `src/domains/staffing/job-posting-error-map.ts` exists; `JOB_POSTING_ERROR_LABELS` 11 entries, `JOB_POSTING_RECOVERY_HINTS` 1 entry, `jobPostingErrorLabel` + `summarizeJobPostingApiError` exported; all mapper unit cases green in Quality CI step 9 SUCCESS | `None` |
| `AC-06` | `E-06` | Unknown/null/empty/unrecognized code → single generic safe Vietnamese fallback (`JOB_POSTING_UNKNOWN_ERROR_LABEL`); never echoes `body.message`, UUID, SQL, stack, or PII. Verified by 5+ assertions; covered by Quality CI step 9 SUCCESS | `None` |
| `AC-07` | `E-07` | `summarizeJobPostingApiError({ status: 409, error: 'JOB_OPENING_NOT_OPEN', details: { jobOpeningId: '1c2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f' } })` returns `{ label: <known label>, recoveryHref: '/admin/job-openings/1c2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f' }`; non-UUID inputs return `recoveryHref: null`. Verified locally + covered by Quality CI step 9 SUCCESS | `None` |
| `AC-08` | `E-08` | `npm run typecheck` exit 0. **Canonical evidence:** Quality CI step 7 `Typecheck (tsc --noEmit)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | `None` |
| `AC-09` | `E-09` | `npx eslint .` exit 0. **Canonical evidence:** Quality CI step 8 `Lint (eslint .)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | `None` |
| `AC-10` | `E-10` | PASS on full vitest unit lane (baseline + 4 new test files). **Canonical evidence:** Quality CI step 9 `Unit tests (no DB — fail-closed sentinel)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | `None` |
| `AC-11` | `E-11` | `npm run build` (next build) exit 0. **Canonical evidence:** Quality CI step 10 `Build (next build)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | `None` |
| `AC-12` | `E-12` | `git diff --check 6ea2e267..8bb71c10` exit 0 (no whitespace errors); run locally on implementation SHA | `None` |
| `AC-13` | `E-13` | `git diff --stat 6ea2e267..8bb71c10 -- prisma migrations 'app/api' 'app/(jobs)' 'app/admin/jobs/job-postings/[id]/editor-shell.tsx' src/domains/staffing/job-posting-authoring.service.ts` reports 0 lines on every forbidden path; run locally on implementation SHA | `None` |
| `AC-14` | `E-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 on working-tree changed surface; no BOM, no invalid UTF-8; run locally on implementation SHA | `None` |
| `AC-15` | `E-15` | `node .ai-pipeline/scripts/verify-encoding-range.mjs 6ea2e267b72120de5f67d5954d1074101efccff1 8bb71c10fa669ea1206e17e4d7ab42efc88202d5` exit 0 on committed range; no CRLF, no U+FFFD, no mojibake streaks; run locally on implementation SHA | `None` |
| `AC-17` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` | exit 0; run locally on implementation SHA (see §3 E-16) | `None` |
| `AC-18` | `E-17` | `git status --porcelain` after implementation commit enumerates exactly 10 paths (3 MOD + 7 NEW: 4 production + 4 tests + 2 docs); forbidden paths all 0-line; run locally on implementation SHA | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` | `14/14 passed` | inline |
| `E-02` | `npx vitest run --config vitest.unit.config.ts app/admin/jobs/job-postings/__tests__/job-postings-list-linkage.static.test.ts` | `7/7 passed` | inline |
| `E-03` | `npx vitest run --config vitest.unit.config.ts app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` | `6/6 passed` | inline |
| `E-04` | `git diff --stat origin/main..HEAD -- app/admin/jobs/job-postings/[id]/editor-shell.tsx` AND `npx vitest run --config vitest.unit.config.ts app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` | `0 lines` + `1/1` passed for the editor-shell-`Publish`-preserved case | inline |
| `E-05` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-error-map.test.ts` | `40+/40+ passed` | inline |
| `E-06` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-error-map.test.ts -t "unknown"` | All unknown/null/empty cases green; no `body.message` substring in any returned `label` | inline |
| `E-07` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-error-map.test.ts -t "envelope"` | `summarizeJobPostingApiError` returns `{ label: <known>, recoveryHref: '/admin/job-openings/<uuid>' }` for valid UUID; `recoveryHref: null` for invalid/missing UUID | inline |
| `E-08` | `npm run typecheck` | exit 0. **Canonical evidence:** Quality CI step 7 `Typecheck (tsc --noEmit)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | inline |
| `E-09` | `npx eslint .` | exit 0. **Canonical evidence:** Quality CI step 8 `Lint (eslint .)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | inline |
| `E-10` | `npm run test:unit` | PASS on full vitest unit lane (baseline + 4 new test files + 1 mapper unit suite). **Canonical evidence:** Quality CI step 9 `Unit tests (no DB — fail-closed sentinel)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | inline |
| `E-11` | `npm run build` (next build) | exit 0. **Canonical evidence:** Quality CI step 10 `Build (next build)` SUCCESS ([run 37173116377 job 111349983909](https://github.com/nobita6986/HRpartner/actions/runs/37173116377/job/111349983909)) | inline |
| `E-12` | `git diff --check 6ea2e267..8bb71c10` | exit 0 (no whitespace errors); run locally on implementation SHA | inline |
| `E-13` | `git diff --stat 6ea2e267..8bb71c10 -- prisma migrations 'app/api' 'app/(jobs)' 'app/admin/jobs/job-postings/[id]/editor-shell.tsx' src/domains/staffing/job-posting-authoring.service.ts` | `0` lines on every forbidden path; run locally on implementation SHA | inline |
| `E-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; no BOM, no invalid UTF-8; run locally on implementation SHA | inline |
| `E-15` | `node .ai-pipeline/scripts/verify-encoding-range.mjs 6ea2e267b72120de5f67d5954d1074101efccff1 8bb71c10fa669ea1206e17e4d7ab42efc88202d5` | exit 0; no CRLF, no U+FFFD, no mojibake streaks; run locally on implementation SHA | inline |
| `E-16` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` | exit 0; run locally on implementation SHA | inline |
| `E-17` | `git status --porcelain` after implementation commit AND `git diff --stat 6ea2e267..8bb71c10 -- .` | 10 paths total (3 MOD + 7 NEW); `grep` for forbidden-path prefixes returns 0 matches; run locally on implementation SHA | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

- READY_FOR_REVIEW: TASK §0 `Required gates` are all pass-or-NOT_REQUIRED-class for `STANDARD`/`Audit NONE`; no schema/migration/auth/RLS/role-matrix change; **4 findings RESOLVED within the audit §D Priority 2 scope (F2/F3/F7/F11) plus F8 mapper REMEDIATION_READY / PENDING_T1B_UI_V1_INTEGRATION**; 4 static guards + 1 unit suite enforce every code regression; T1B integration contract for `editor-shell.tsx` shipped verbatim in HANDOFF §6 below.
- **Canonical evidence source of truth:** PR #90 CI run [`37173116377`](https://github.com/nobita6986/HRpartner/actions/runs/37173116377) (Quality + Integration + Vercel 4/4 SUCCESS, 2026-10-04T03:09Z). Step-level evidence: Quality steps 5–10 cover `prisma generate` → `prisma schema validate` → `typecheck` → `lint` → `unit tests` → `next build` (all SUCCESS). Integration step 13 `Integration tests (container test DB; fail-closed preflight on guard mismatch)` SUCCESS. The PR is `MERGEABLE`. Main CI proves source hợp lệ; the local-worktree `staffingOrderRecruiterAssignment` complaint observed in this detached worktree is a transient Prisma-client/.next-cache desync (this worktree shares `node_modules` via junction with another branch and inherits a stale `tsbuildinfo` from a prior `tier1/admin-detail-foundation` session) — **not a source defect**. The same source passes main CI on the canonical runner; the local anomaly is not load-bearing.
- Source/test/migration clean after Implementation SHA: `git status --porcelain` after the implementation commit shows 0 dirty paths; `git diff --stat 8bb71c10..HEAD -- app src prisma tests scripts packages` returns 0 paths (this docs-only correction round touches only `docs/tasks/hrp-m2a-operational-ux-debt/{TASK.md,HANDOFF.md}`, no production paths).

---

### T1B Integration Contract — `editor-shell.tsx` (F8 wiring)

The following contract is the verbatim binding handoff document for the
T1B round that will wire `summarizeJobPostingApiError` into
`app/admin/jobs/job-postings/[id]/editor-shell.tsx`. This round intentionally
did NOT edit the editor shell (audit §G.A.1 ownership). T1B is expected to
copy-paste from this contract verbatim.

**Surface**
- T1B-editable file: `app/admin/jobs/job-postings/[id]/editor-shell.tsx`.
- T1B-consumable module: `src/domains/staffing/job-posting-error-map.ts`.
- Module exports to import:
  - `summarizeJobPostingApiError(envelope: { status: number; error?: string; message?: string; details?: { jobOpeningId?: unknown } }): { label: string; recoveryHref: string | null }`
  - `JOB_POSTING_ERROR_LABELS: Readonly<Record<string, string>>` (optional, for surface tests)
  - `JOB_POSTING_UNKNOWN_ERROR_LABEL: string` (optional, for fallback assertion tests)

**The ONLY allowed T1B wiring**

In `app/admin/jobs/job-postings/[id]/editor-shell.tsx`, replace the current
`readErrorMessage` body (which currently echoes `body.message ?? body.error ?? 'HTTP ' + res.status`)
with:

```ts
import { summarizeJobPostingApiError } from '@/domains/staffing/job-posting-error-map';

// … inside the publish/save response handler …
const envelope = await res.json().catch(() => ({}));
const { label, recoveryHref } = summarizeJobPostingApiError(envelope);
setErrorMessage(label);
// If `recoveryHref` is non-null, render a <Link href={recoveryHref}>…</Link> next to the error toast.
```

**T1B invariants**
1. The mapper is the ONLY source of truth for the user-visible message
   on the editor shell's error surface. Do NOT compose a new message
   string from `body.message` / `body.error` / raw text.
2. `summarizeJobPostingApiError` MUST be called with the parsed JSON
   envelope (object), not the raw `Response` object.
3. If `envelope` is not a plain object (e.g. parse failure), pass `{}`
   to `summarizeJobPostingApiError` — it returns the generic safe fallback.
4. The `recoveryHref` returned is `/admin/job-openings/<uuid>` ONLY when
   `envelope.error === 'JOB_OPENING_NOT_OPEN'` AND `envelope.details.jobOpeningId`
   matches the canonical UUID v4 regex. For all other codes, `recoveryHref`
   is `null` and the operator must read the label and retry.
5. Do NOT add any new mapping for `body.error === 'JOB_OPENING_NOT_OPEN'`
   inside the editor shell. The mapper owns that.
6. The editor shell's `<button>Publish</button>` label MUST stay `Publish`
   (canonical English domain term per audit §8.11 — the F11 batch
   intentionally kept this label).

**T1B-required new tests** (in
`app/admin/jobs/job-postings/[id]/__tests__/editor-shell.f8.test.ts`, NEW
file in T1B round):
- AC-T1B-01: editor shell error surface uses `summarizeJobPostingApiError`'s
  `label` for `JOB_OPENING_NOT_OPEN` (not `body.message`).
- AC-T1B-02: editor shell error surface uses `summarizeJobPostingApiError`'s
  `label` for unknown / null / empty `envelope.error` (not raw text).
- AC-T1B-03: editor shell renders a `<Link href="/admin/job-openings/<uuid>">`
  when `recoveryHref` is non-null; renders no link otherwise.
- AC-T1B-04: editor shell never echoes `body.message` to the DOM
  (assert via `render()` and `screen.queryByText(envelope.message)`).

**T1B forbidden**
- Do NOT inline a per-code label table in the editor shell.
- Do NOT echo `body.message` to the user.
- Do NOT change the `<button>Publish</button>` label.
- Do NOT add new API surface or new route handlers.
- Do NOT re-order existing `ADMIN_NAV_PHASE4` entries.

---

> Handoff status: `READY_FOR_REVIEW`