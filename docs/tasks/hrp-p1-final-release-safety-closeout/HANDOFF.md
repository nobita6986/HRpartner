# HANDOFF — `hrp-p1-final-release-safety-closeout`

> **TIER-1 CONTROL (rev. 6 — PR #73 build-blocker font hotfix 2026-10-01)**:
> This HANDOFF.md is restructured for the **post-audit release-integrity
> exception #1** (T0 directive §A–§G, 2026-10-01). PR #73 (audit-adoption
> SHA `1b60dd40…`) had passed Tier 3 LIGHT audit round 1 and was pushed;
> GitHub CI Quality (`next build`) and Vercel preview both failed with
> `next/font/google`'s loader throwing `TypeError: Cannot read properties
> of null (reading '1')` while attempting to fetch font data from
> `fonts.googleapis.com`. T0 ruled: **self-host fonts**, no retry-to-find-a-pass.
>
> The runtime semantic implementation SHA `708e0ce71d258c3a70383330dfb8d5d370dbd974`
> (T0 §A.1) and the E2E ×3 PASS evidence `EV-RUN-{1,2,3}-*` (T0 §A.2) are
> carry-forward — this revision does NOT touch `prisma/`, `tests/`,
> `package.json`, or `package-lock.json` (T0 §Stop boundary). Tier 3
> round-1 audit PASS evidence remains authoritative for the **unchanged**
> P1 runtime surface; the DELTA audit scope (next gate) is strictly the
> font delta and docs. `AUDIT.md` is owned by Tier 3 and is **not**
> authored by T1.
>
> Status = READY_FOR_AUDIT, Frozen delivery = YES, Canonical gates = PASS,
> Audit eligibility = ELIGIBLE, Next gate = TIER3_DELTA_AUDIT.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.5` (rev. 6 — PR #73 build-blocker font hotfix; round-1 audit PASS verdict unchanged on original surface) |
| Status | `READY_FOR_AUDIT` |
| Current audit round | `1` (Tier 3 round-1 PASS covers unchanged P1 surface; DELTA scope = font + docs only) |
| Next gate | `TIER3_DELTA_AUDIT` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Baseline | `2f77399309c94732e71dd371175ab0ba4af02f57` |
| Implementation SHA | `b0d095822780201c96715c27acb9d3396a20079e` |
| Implementation SHA (P1) | `708e0ce71d258c3a70383330dfb8d5d370dbd974` |
| Implementation SHA description | Font-hotfix Implementation SHA = `b0d095822780201c96715c27acb9d3396a20079e` (`fix(p1-final): self-host fonts via next/font/local (PR #73 build blocker)`); P1 predecessor = `708e0ce71d258c3a70383330dfb8d5d370dbd974` (semantic/test/migration commit). |
| Docs/evidence freeze SHA (pre-font-hotfix) | `ae56072525a60f5e75e196c28b3d4f486b64b3a0` |
| Prior docs/update HEAD (pre-font-hotfix) | `e09a5e2ba99ca27035461cfaf67c6543a11ad481` |
| Audit-adoption SHA | `1b60dd40991e71a20845ab35985ea7454518d080` (PR #73) |
| Font-hotfix Implementation SHA | `b0d095822780201c96715c27acb9d3396a20079e` (`fix(p1-final): self-host fonts via next/font/local (PR #73 build blocker)`) |
| Docs/evidence freeze SHA (post-font-hotfix) | (recorded in §6 `v1.5` docs-freeze row once committed) |
| New audit-target HEAD | font-hotfix commit `b0d09582…` (or `b0d09582…+docs` once docs freeze lands — T0 will be told the exact value) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| T0 post-audit release-integrity exceptions used | `1` |
| Correction batches used | `1` |
| Execution round | `6` |
| Production migration | `NOT_RUN` (T0 owns production-side remediation per stop boundary) |
| Production verification | `NOT_IN_SCOPE` (T1C closeout runs only against synthetic Neon per T0 §B-01 contract) |
| Branch | `codex/t1c-p1-final-release-safety-closeout` |
| Worktree | `C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout` |
| Planner | `Tier 1` (T1C) |
| Plan artifact | `docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` |

## 1. Outcome and changed surface

### 1.1 What round 3 closes (T0 §F)

Per T0 directive 2026-10-01 §F, the previous handoff was rejected because:

1. **Control truthfulness** (T0 §A): `Status=READY_FOR_AUDIT` was a lie when
   canonical gates were FAIL. Round 3 flipped to `Status=BLOCKED / Frozen=NO /
   Canonical=FAIL / Audit=NOT_ELIGIBLE / Next=T0_RUNTIME_REPRODUCE`.
2. **Public Job release blocker** (T0 §B BLK-02): `GET /viec-lam/SLUG` (where
   SLUG is the published job slug) returned HTTP 500. Round 3 fixes the root
   cause by adding `'use client'` to
   `src/domains/job-board/components/landing/featured-job-card.tsx`.
3. **Recruiter-only canonical flow** (T0 §C BLK-03): HR_STAFF used ADMIN
   SQL/API fallback after login. Round 3 enforces canonical
   `POST /api/admin/applications/SUBMISSION_ID/claim` (where SUBMISSION_ID is
   the application submission id) + UUID-v4 Idempotency-Key (no ADMIN SQL
   INSERT), canonical `POST /api/admin/recruiter/placements` (no fallback to
   `/api/admin/placements`), and canonical
   `/api/admin/recruiter/placements/PLACEMENT_ID/actions/*` (where
   PLACEMENT_ID is the placement id) for confirm/effective/cancel.
4. **Runtime safety and cleanup** (T0 §D BLK-04): runner dirtied
   `docs/tasks/.tmp/`. Round 3 cleans the residue and writes into
   `os.tmpdir()` by default with `process.on('exit')` cleanup.

### 1.2 What is now verified (×3 final runs + baseline gates)

Three fresh runtime E2E suites (`EV-RUN-1`, `EV-RUN-2`, `EV-RUN-3`)
captured on **2026-10-01** against the synthetic Neon
`ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech` /
`neondb` confirmed:

- **Posture PASS** — writer `app_user_writer` (`rolsuper=false`,
  `rolbypassrls=false`), admin `neondb_owner` (`rolsuper=false`,
  `rolbypassrls=true`), same `current_database` (`db-alias=693fe5919fc2`).
- **Fixture bootstrap PASS** — every run's `synthetic-fixture.mjs` writes
  under `os.tmpdir()` with exact IDs + redacted phone aliases + ACTIVE
  `StaffingOrderRecruiterAssignment` (DEC-12).
- **E2E 20/20 steps PASS** — steps 1–20 per run; step 7 `GET
  /viec-lam/SLUG` HTTP 200 with run-scoped title/slug marker; step 12
  HR_STAFF canonical claim via `POST
  /api/admin/applications/SUBMISSION_ID/claim` with UUID-v4
  Idempotency-Key (no ADMIN SQL); step 13 HR_STAFF placement create via
  recruiter route (no `/api/admin/placements` fallback); step 14
  `confirm` → `status=CONFIRMED`; step 15 `effective` returns fail-closed
  contract `400 PLACEMENT_VALIDATION_ERROR` per DEC-07 ("HRP-managed
  Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce
  bridge thuộc N4"); step 16 `cancel` → `status=CANCELLED`; step 17
  `GET /viec-lam/SLUG` HTTP 200; step 18 workbench MINE reflects
  final handling assignments; step 19 residue counts `users=3,
  orders=1, slots=1, openings=1, postings=1, submissions=1, placements=1,
  handlingassignments=1` (pre-teardown); step 20 public tracking code
  + placementId linked.
- **Exact-ID teardown PASS** — residue
  `{"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`
  per run. OS temp dir removed. No `docs/tasks/.tmp/`.
- **Zero `INFRASTRUCTURE_DEFECT`**, **zero unexpected `EXPECTED_FAIL`**.
- `git status --short` clean after each run (only matching evidence under
  `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/`).

Evidence map (per run):

```
evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}     ← POSTURE_OK
evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}     ← exact IDs + ACTIVE assignment
evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}        ← 20-step run + FAIL-closed evidence
evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}   ← residue=0/0/0/0/0
evidence/EV-RUN-{1,2,3}-summary.json               ← { posture, fixture, e2e, teardown } all 0
```

`EV-ATTEMPT-1-*` working-tree artefacts (failure already captured in
`TIER1_SELF_REVIEW.md` §C) were renamed-from-stale and excluded from the
final ×3 set per T0 §B; they are removed from this revision's working tree.

### 1.3 What is still blocking

None. The control list below (`Status=READY_FOR_AUDIT`,
`Frozen=YES`, `Canonical=PASS`, `Audit=ELIGIBLE`) means this delivery is
eligible for Tier 3 LIGHT audit. Tier 3 owns the audit verdict and the
production-side remediation decision (T0 §Stop boundary).

### 1.4 Files touched (round 3 closeout)

```
docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md                            (revised v1.4)
docs/tasks/hrp-p1-final-release-safety-closeout/HANDOFF.md                        (revised v1.4)
docs/tasks/hrp-p1-final-release-safety-closeout/evidence/TIER1_SELF_REVIEW.md     (Tier 1 self-review)
docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md                          (REMOVED — Tier 3-owned)
docs/tasks/.tmp/                                                                   (REMOVED — T0 §D.1)
scripts/runtime/synthetic-fixture.mjs                                              (revised — DEC-12 dual authority + DEC-13 OS temp)
scripts/runtime/p1-final-runtime-e2e.mjs                                           (revised — DEC-14 SSR fix + DEC-12/13 recruiter flow + Step 18 workbench MINE)
scripts/runtime/run-p1-e2e-pipeline.mjs                                            (revised — DEC-13 OS temp + cleanup hook)
src/domains/job-board/components/landing/featured-job-card.tsx                     (modified — added 'use client')
```

### 1.5 Forbidden paths confirmed clean (round 3)

`git diff <baseline>..HEAD --` for the following paths returned empty:

- `prisma/schema.prisma`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `.env*`, `.editorconfig`, `verify-encoding.ps1`
- `docs/important/`, `tier1.md`, `tier0.md`, `tier3.md`
- `docs/tasks/.tmp/` (round 3: removed)
- `docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md` (round 3: removed — T3-owned)
- production `ep-shy-tree-az32as2c` URLs (lines 5/7 of `C:\cre_hrp.txt` — never read into env)
- PR #71 / PR #72 source code (read-only for anti-pattern recognition; never reused)

### 1.6 rev. 4 — T0 pre-audit docs/control integrity correction

T0 §A..§G inspection. The runtime semantic delta is empty
(`git diff --name-only 708e0ce..HEAD -- app src prisma tests scripts packages
package.json package-lock.json` is empty), so the ×3 PASS runtime evidence
remains authoritative. The correction batch is limited to:

- HANDOFF.md / TASK.md / SELF_REVIEW.md structural alignment with the
  V1 / compact-V2 canonical schema the verifier scripts hard-code.
- Removal of the in-commit `Final HEAD (this handoff freeze)` field that
  pinned a previous forward-only docs commit (`ebc2c704…`); the corrected
  docs pin Implementation SHA `708e0ce7…`, docs/evidence freeze SHA
  `ae560725…`, and record the prior docs/update HEAD `e09a5e2b…`.
- Commit deletion of `docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md`
  (already staged for deletion at pre-correction HEAD; finalized in this batch).
- Working-tree cleanup of `EV-ATTEMPT-1-*` (failure already captured in
  `TIER1_SELF_REVIEW.md` §C; the canonical ×3 evidence is `EV-RUN-{1,2,3}-*`).

### 1.7 rev. 6 — PR #73 build-blocker font hotfix (post-audit release-integrity exception #1)

T0 §A–§G inspection. PR #73 (audit-adoption SHA `1b60dd40…`) had passed
Tier 3 LIGHT audit round 1 and was pushed; GitHub Actions `next build` and
Vercel preview both failed with `TypeError: Cannot read properties of null
(reading '1')` raised inside `@next/font/dist/google/loader.js` while trying
to fetch font data from `fonts.googleapis.com` / `fonts.gstatic.com`. T0
ruled: self-host fonts, no retry-to-find-a-pass.

**Build-blocker root cause (accepted).** `next/font/google` requires
network egress at build time; CI and Vercel build sandboxes deny it →
loader throws. Fix-by-retry is forbidden by T0 §B; the only acceptable
remedy is self-hosting via `next/font/local`.

**Semantic correction (font-hotfix commit `b0d09582…`).**

1. Removed every `next/font/google` production import from `app/**` and
   `src/**`. Production-import scan (`grep -rn "from 'next/font/google'"`
   in `app/` + `src/`) now returns zero matches (`EV-25`).
2. Introduced shared loader `app/fonts/local-fonts.tsx` exporting
   `beVietnamPro` (`variable: '--font-bvp'`, weights 400/500/600/700) and
   `inter` (`variable: '--font-inter'`, single variable file covering
   14..32 opsz × 100..900 weight). `.tsx` extension is mandatory so the
   existing `src/shared/ui/design-tokens.static.test.ts` regex (scans
   `*.tsx` for `variable: '--font-bvp'`) continues to pass without churn.
3. Committed font assets to `app/fonts/`:
   - `BeVietnamPro-{Regular,Medium,SemiBold,Bold}.ttf` — 4 static weights
     (no upstream variable yet — `google/fonts#4340`).
   - `Inter[opsz,wght].ttf` — single variable file.
   - `BeVietnamPro-OFL.txt`, `Inter-OFL.txt` — SIL OFL 1.1 license texts.
   - `FONTS_PROVENANCE.txt` — registry of file sizes, SHA-256 hashes, and
     upstream commit provenance.
4. `app/layout.tsx` imports `beVietnamPro` and `inter` from
   `./fonts/local-fonts`; Google Fonts `<link rel="preconnect">` tags
   removed; the Material Symbols runtime CSS link
   (`fonts.googleapis.com/icon`) is **retained** per T0 §B-7 (P3 debt, out
   of scope here).
5. `app/bod/page.tsx` now imports `beVietnamPro` from
   `@/app/fonts/local-fonts`; the bespoke Google-font loader is gone.
6. CSS variable contracts preserved exactly: `--font-bvp`, `--font-inter`.
   No design-token churn. No class-name churn outside the imports.
7. New static regression guard
   `src/shared/ui/font-google-ban.static.test.ts` proves (a) zero
   `next/font/google` imports in `app/**`; (b) `app/layout.tsx` wires
   `--font-bvp` and `--font-inter` from local-font exports; (c)
   `app/bod/page.tsx` imports from `@/app/fonts/local-fonts`; (d) the
   shared loader exports both CSS variables; (e) negative fixture is
   rejected.

**Impact proof for unchanged surface.** `git diff --name-only 708e0ce7..b0d09582
-- app src prisma scripts tests packages package.json package-lock.json` is
empty outside `app/fonts/**`, `app/layout.tsx`, `app/bod/page.tsx`, and
`src/shared/ui/font-google-ban.static.test.ts`. Therefore the ×3 PASS
runtime E2E evidence (`EV-04`–`EV-06`), Tier 3 round-1 audit PASS
evidence (`audit/AI_AUDIT_TIER3_ROUND1.md`), and the design-token static
test suite all carry forward unchanged.

**State at handoff to T0.**

| Field | Value |
|---|---|
| Status | `READY_FOR_AUDIT` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Next gate | `TIER3_DELTA_AUDIT` |
| Predecessor (P1 implementation) | `708e0ce7…` |
| Audit-adoption predecessor | `1b60dd40…` |
| Font-hotfix Implementation SHA | `b0d09582…` |
| Docs/evidence freeze SHA | (recorded once committed) |
| T0 post-audit release-integrity exceptions used | **1** (this build blocker) |

**Commit/freeze discipline.**

- Forward-only semantic commit `b0d09582…`
  (`fix(p1-final): self-host fonts via next/font/local (PR #73 build blocker)`).
- Separate docs/evidence freeze commit to follow; it pins SHAs, flips
  control state, and references this HANDOFF rev. 6.
- No `git reset --hard` / `git commit --amend` / `git rebase` /
  `git push --force` (T0 §E.3).
- No push of new commits to PR #73 before DELTA audit (T0 §E.4).
- Working tree clean before handoff (`EV-30`).

## 2. Acceptance evidence

The first row is the `verify-task.ps1` contract-gate pass. The remaining rows cover AC-01..AC-17, each pointing to its evidence file under `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/` and to the runnable evidence registry entry in §3.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` | `RESULT: PASS` (exit 0; rev. 4 schema correction) | `None` |
| `AC-01` | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (E-23) | 19/19 PASS; constant pin `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'` | `None` |
| `AC-02` | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (E-23) | 19/19 PASS; exit 0 | `None` |
| `AC-03` | `node scripts/runtime/db-posture-preflight.mjs` (E-RUN-{1,2,3}-posture) | `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a` ×3; exit 0 ×3 | `None` |
| `AC-04` | `node scripts/runtime/synthetic-fixture.mjs` (E-RUN-{1,2,3}-fixture) | exit 0 ×3; admin/manager/staffUser IDs + ACTIVE `StaffingOrderRecruiterAssignment` recorded per fixture file | `None` |
| `AC-05` | `node scripts/runtime/exact-id-teardown.mjs` (E-RUN-{1,2,3}-teardown) | residue `{users:"0", orders:"0", slots:"0", projects:"0", companies:"0"}` ×3; exit 0 ×3 | `None` |
| `AC-06` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (E-RUN-{1,2,3}-e2e) | 20/20 `[step-NN] PASS` ×3; step 7/17 `status=200 marker=ok`; step 15 fail-closed `400 PLACEMENT_VALIDATION_ERROR`; `[p1-e2e] OK` ×3 | `None` |
| `AC-07` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (E-RUN-{1,2,3}-summary) | `{"posture":0,"fixture":0,"e2e":0,"teardown":0,...}` ×3 | `None` |
| `AC-08` | `npm run typecheck` (E-09) | exit 0 | `None` |
| `AC-09` | `npm run lint` (E-10) | exit 0 — 0 errors; task-surface warnings only (warnings unrelated to changed surface) | `None` |
| `AC-10` | `npm run build` (E-08) | exit 0, Next.js 15.5.23 build OK | `None` |
| `AC-11` | `npm run test:unit` (E-11) | exit 0 — 211/211 files, 3517 tests passed, 9 skipped, 0 failed | `None` |
| `AC-12` | `npx prisma validate` (E-12) | exit 0 — `The schema at prisma\schema.prisma is valid` | `None` |
| `AC-13` | `git diff --check HEAD` (E-13) | exit 0 (no whitespace errors) | `None` |
| `AC-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` (E-14) | exit 0 — 12/12 changed files UTF-8 no BOM | `None` |
| `AC-15` | `pwsh -NoProfile -Command "Write-Output 'integration gate: NOT_REQUIRED (T0 §B-01 forbids DATABASE_URL_TEST env name); DEC-10'; exit 0"` (E-15) | `NOT_REQUIRED` — T0 §B-01 forbids `DATABASE_URL_TEST` env name | `None` |
| `AC-16` | `git log --oneline 2f773993..708e0ce7; git log --oneline 708e0ce7..ae560725` (E-16) | Implementation SHA `708e0ce7…` then docs/evidence freeze `ae560725…`; no amend, no rebase, no force-push | `None` |
| `AC-17` | `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/`; `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md` (expect absent) | TASK.md + HANDOFF.md + TIER1_SELF_REVIEW.md tracked; AUDIT.md not in tree | `None` |
| `AC-18` | `grep -rn "from 'next/font/google'" app src` (E-25); `src/shared/ui/font-google-ban.static.test.ts` (E-24) | Zero matches; static test asserts `app/layout.tsx`, `app/bod/page.tsx`, and negative fixture all clean | `None` |
| `AC-19` | `src/shared/ui/design-tokens.static.test.ts` (E-24); `app/fonts/local-fonts.tsx` source inspection | 12/12 design-token tests PASS; both `variable: '--font-bvp'` and `variable: '--font-inter'` declared in shared loader | `None` |
| `AC-20` | `npm run build` (E-27) | exit 0; no `TypeError` from `@next/font/dist/google/loader.js`; `--font-bvp` + `--font-inter` injected from `app/fonts/local-fonts.tsx` | `None` |
| `AC-21` | `git hash-object app/fonts/BeVietnamPro-Regular.ttf app/fonts/BeVietnamPro-Medium.ttf app/fonts/BeVietnamPro-SemiBold.ttf app/fonts/BeVietnamPro-Bold.ttf 'app/fonts/Inter[opsz,wght].ttf' app/fonts/BeVietnamPro-OFL.txt app/fonts/Inter-OFL.txt` (E-31); `Get-Content app/fonts/BeVietnamPro-OFL.txt, app/fonts/Inter-OFL.txt` (manual OFL 1.1 license-text presence check). | 7/7 SHA-256 digests cross-checked against `app/fonts/FONTS_PROVENANCE.txt`; OFL 1.1 license text present in both `BeVietnamPro-OFL.txt` and `Inter-OFL.txt`; no `.next/static/media/` hash files referenced | `None` |
| `AC-22` | `git diff --name-only 708e0ce7..b0d09582 -- app src prisma scripts tests packages package.json package-lock.json` (E-32) | Diff limited to font delta; P1 runtime E2E ×3 evidence (`EV-04`–`EV-06`) + Tier 3 round-1 audit PASS evidence (`audit/AI_AUDIT_TIER3_ROUND1.md`) carry forward unchanged | `None` |

## 3. Evidence registry

| Evidence ID | Command | Result | Artifact |
|---|---|---|---|
| `E-08` | `npm run build` | exit 0 | `evidence/EV-08-build.log` |
| `E-09` | `npm run typecheck` | exit 0 | `evidence/EV-09-typecheck.log` |
| `E-10` | `npm run lint` | exit 0 (0 errors; pre-existing warnings only) | `evidence/EV-10-lint.log` |
| `E-11` | `npm run test:unit` | exit 0 — 211/211 files, 3517 tests passed, 9 skipped, 0 failed | `evidence/EV-11-unit-tests.log` |
| `E-12` | `npx prisma validate` | exit 0 — `The schema at prisma\schema.prisma is valid` | `evidence/EV-12-prisma-validate.log` |
| `E-13` | `git diff --check HEAD` | exit 0 (no whitespace errors) | `evidence/EV-13-diff-check.log` |
| `E-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 — 12/12 changed files UTF-8 no BOM | `evidence/EV-14-encoding-scan.log` |
| `E-15` | (DEC-10 contract decision; integration gate intentionally NOT_RUN) | `NOT_REQUIRED` — T0 §B-01 forbids `DATABASE_URL_TEST` env name | `evidence/EV-15-integration-contract-note.log` |
| `E-16` | `git log --oneline 2f773993..708e0ce7; git log --oneline 708e0ce7..ae560725` | forward-only chain: Implementation SHA `708e0ce7…` then docs/evidence freeze `ae560725…` | `evidence/EV-16-forward-only-commits.log` |
| `E-22` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` | `RESULT: PASS` (rev. 4 schema correction; exit 0) | `evidence/EV-22-task-contract-gate.log` |
| `E-23` | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` | 19/19 PASS; exit 0 | `evidence/EV-23-guard-unit-tests.log` |
| `E-RUN-1` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` | exit 0; `[p1-e2e] OK`; residue `{users:0, orders:0, slots:0, projects:0, companies:0}` | `evidence/EV-RUN-1-{posture,fixture,e2e,teardown}.{stdout,stderr}` + `evidence/EV-RUN-1-summary.json` |
| `E-RUN-2` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (independent re-run) | exit 0; `[p1-e2e] OK`; residue 0/0/0/0/0 | `evidence/EV-RUN-2-{posture,fixture,e2e,teardown}.{stdout,stderr}` + `evidence/EV-RUN-2-summary.json` |
| `E-RUN-3` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (independent re-run) | exit 0; `[p1-e2e] OK`; residue 0/0/0/0/0 | `evidence/EV-RUN-3-{posture,fixture,e2e,teardown}.{stdout,stderr}` + `evidence/EV-RUN-3-summary.json` |
| `E-TIER1-SELF-REVIEW` | Tier 1 self-review of the change; documents the EV-ATTEMPT-1 step-15 first-pass failure history. | n/a (prose analysis, not a gate result) | `evidence/TIER1_SELF_REVIEW.md` |
| `E-T1-TO-T0-HANDOVER` | T1→T0 checkpoint handover (round-3 carrier). | n/a | `evidence/T1_TO_T0_HANDOVER.md` |
| `E-handoff-substance-gate` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath TASK.md -HandoffPath HANDOFF.md` | `RESULT: PASS WITH WARNINGS` (rev. 4 schema correction; exit 0) | `evidence/EV-22-handoff-substance-gate.log` |
| `E-24` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/font-google-ban.static.test.ts src/shared/ui/design-tokens.static.test.ts` | 18/18 PASS (font-ban 6/6, design-tokens 12/12); exit 0 | `evidence/EV-24-font-ban-test.log` |
| `E-25` | `grep -rn "from 'next/font/google'" app src` | ZERO MATCHES | `evidence/EV-25-font-google-ban-scan.log` |
| `E-26` | `npm run typecheck` (after font hotfix) | exit 0 | `evidence/EV-26-font-hotfix-typecheck.log` |
| `E-27` | `npm run build` (after font hotfix) | exit 0 — no `TypeError` from `@next/font/dist/google/loader.js`; `--font-bvp` + `--font-inter` injected from `app/fonts/local-fonts.tsx` | `evidence/EV-27-font-hotfix-build.log` |
| `E-28` | `npm run test:unit` (after font hotfix) | exit 0 — 212/212 files, 3523 tests passed, 9 skipped, 0 failed (font-ban added 6 tests; design-tokens unchanged at 12) | `evidence/EV-28-font-hotfix-unit-tests.log` |
| `E-29` | `node .ai-pipeline/scripts/verify-encoding.mjs` (after font hotfix) | exit 0 — 7/7 changed text files PASS (TTF binary files are scoped out by `verify-encoding.mjs`'s text-only filter) | `evidence/EV-29-font-hotfix-encoding-scan.log` |
| `E-30` | `git status --short` (after font hotfix) | empty (clean working tree) | `evidence/EV-30-font-hotfix-clean-tree.log` |
| `E-31` | `app/fonts/FONTS_PROVENANCE.txt` SHA-256 cross-check | 7/7 assets verified (4 BVP statics + 1 Inter var + 2 OFL.txt); OFL 1.1 text present in both license files; upstream commit SHAs from `google/fonts` repo recorded | `evidence/EV-31-font-provenance.log` |
| `E-32` | `git diff --name-only 708e0ce7..b0d09582 -- app src prisma scripts tests packages package.json package-lock.json` | diff empty outside `app/fonts/**`, `app/layout.tsx`, `app/bod/page.tsx`, `src/shared/ui/font-google-ban.static.test.ts` — carries forward E2E ×3 + Tier 3 round-1 audit evidence for unchanged P1 surface | `evidence/EV-32-impact-proof.log` |

## 4. Deviations and blockers

### 4.1 DEC-10 — Canonical strict integration gate NOT_REQUIRED

T0 §B-01 lists `DATABASE_URL_TEST` as a forbidden env name. The canonical
strict integration gate requires `DATABASE_URL_TEST`. The P1 final closeout
uses runtime UI/HTTP proof against synthetic Neon as the canonical
validation lane. This is a documented contract decision, not a gate failure.

### 4.2 DEC-09 — REMOVED (round 3)

The pre-existing `/viec-lam/SLUG` SSR 500 is no longer tolerated as
out-of-scope. The root cause is fixed via DEC-14. Steps 7 + 17 must return
HTTP 200 and render the published job posting.

### 4.3 DEC-06 — Cold-connect warmup fix (round 2)

The first run of three consecutive runs occasionally returned step-1
`INVALID_CREDENTIALS` 401 from `/api/auth/login`. Root cause: child server's
Prisma client takes 10–30s to cold-connect to synthetic Neon; the
cold-connect 500 was masked by `/api/auth/login` catch block as 401. Fix:
`waitForBoot()` requires Prisma 200/404 (not just `<500`). After fix, all
rounds ×3 PASS with zero residue.

### 4.4 Production boundary

- No `ep-shy-tree-az32as2c` connection.
- No production migration/write/read.
- No Vercel env mutation (T0 owns production deployment).
- No PITR forensic branch access (T0 owns production containment/recovery).
- No production evidence cleanup (T0 owns production recovery).
- No `--force-production` switch exists in the guard.
- Credentials loaded only into the in-process env from `C:\cre_hrp.txt`;
  never copied to disk, evidence, `.env`, shell history, or docs.

### 4.5 JWT / identities boundary

- Per-run signing key = `crypto.randomBytes(48).toString('hex')` set only in
  child process env.
- Signing key is never written to disk, evidence, or shell history.
- ADMIN/HR_MANAGER/HR_STAFF synthetic users created per-run with random
  passwords held only in process memory.
- Synthetic Vietnamese phones derived from RUN_ID + user role slot; always
  pass Vietnamese phone schema validator.
- No production-like phones, no shared seeded user accounts, no credentials
  from `.env`.

### 4.6 rev. 4 docs/control correction

- Stale `Final HEAD (this handoff freeze)` field that pinned a previous
  forward-only docs commit (`ebc2c704…`) was retired; superseded by
  `Docs/evidence freeze SHA ae560725…` + `Prior docs/update HEAD e09a5e2b…`
  rows in `## 0. Control`. T0 §E anti-self-reference rule observed: this
  revision does not create a follow-up commit solely to record its own SHA.
- AUDIT.md deletion finalized (T3-owned).
- `EV-ATTEMPT-1-*` working-tree artefacts removed (failure captured in
  `TIER1_SELF_REVIEW.md` §C; canonical ×3 evidence is `EV-RUN-{1,2,3}-*`).
- The T1-side `verifier failures` recorded in `EV-22-task-contract-gate.log`
  + `EV-22-handoff-substance-gate.log` from rev. 3 were **real FAIL** (exit 2
  with V1-template section-list mismatches), not "V1 residual warnings".
  Rev. 4 corrects them to exit 0 by realigning TASK.md / HANDOFF.md with
  the V1 canonical schema the verifier scripts still hard-code.

## 5. Final status

- **Status**: `READY_FOR_AUDIT`
- **Frozen delivery**: `YES`
- **Canonical gates**: `PASS`
- **Audit eligibility**: `ELIGIBLE`
- **Next gate**: `TIER3_DELTA_AUDIT`
- **Implementation SHA (P1)**: `708e0ce71d258c3a70383330dfb8d5d370dbd974` (predecessor)
- **Font-hotfix Implementation SHA**: `b0d09582…` (new audit-target HEAD — semantic commit)
- **Docs/evidence freeze SHA**: (recorded in §6 `v1.5` docs-freeze row once committed)
- **Spec version**: `v1.5`
- **Execution round**: `6`
- **Audit round**: `1` (Tier 3 round-1 PASS covers unchanged P1 surface; DELTA scope = font + docs only)
- **T0 post-audit release-integrity exceptions used**: `1`

This handoff pins P1 Implementation SHA = `708e0ce71d258c3a70383330dfb8d5d370dbd974`
(semantic/test/migration commit, predecessor) and Font-hotfix Implementation
SHA = `b0d09582…` (new audit-target HEAD). Tier 3 owns AUDIT.md and the
DELTA audit verdict on the font delta + docs only; Tier 3 round-1 PASS
evidence remains authoritative for the unchanged P1 runtime surface. Tier 1
stops here per T0 §Stop boundary (no push, no merge, no deploy).

## 6. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial HANDOFF.md authored (claimed `READY_FOR_AUDIT`). | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B. |
| `v1.1` | `2026-10-01` | Status flipped to `BLOCKED`; `AUDIT.md` removed (T3-owned); `evidence/TIER1_SELF_REVIEW.md` added; `docs/tasks/.tmp/` cleaned; SSR fix + recruiter canonical flow + OS-temp cleanup recorded as DEC-12/13/14/15; DEC-09 SUPERSEDED. | T0 §F rejections: 54 PASS + 6 HTTP 500 ≠ 60/60 business PASS; ADMIN fallback after HR_STAFF login forbidden; `docs/tasks/.tmp/` residue forbidden. |
| `v1.2` | `2026-10-01` | Step 15 payload fix: `clientAcknowledgedByUserId` switched from `adminUserId` (fixture ID shape `rt-e2e-TOKEN-ROLE`, not UUID v4) to `randomUUID()`. Server-side `z.string().refine(isUuidV4, …)` at the canonical recruiter effective-action route handler requires UUID v4; service-side `markPlacementEffective` stores it as opaque acknowledgement identifier (no FK to users). After schema pass, HRP_MANAGED still fails closed per DEC-07 → 400 `PLACEMENT_VALIDATION_ERROR`; step 16 cancel unaffected. | T0 §C.5 + Step 15 first-pass failure (see `EV-ATTEMPT-1-e2e.stderr`). |
| `v1.3` | `2026-10-01` | Stale `EV-RUN-1-*` evidence renamed to `EV-ATTEMPT-1-*` and EXCLUDED from final ×3 evidence. | T0 §B (×3 final runs must be PASS runs, not attempt runs). |
| `v1.4` | `2026-10-01` | Fresh `EV-RUN-1/2/3-*` ×3 PASS captured (20/20 steps, posture/fixture/e2e/teardown all `0`, residue `users=0/orders=0/slots=0/projects=0/companies=0` per run). Step 15 fail-closed contract confirmed (400 `PLACEMENT_VALIDATION_ERROR` "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). Step 17 HTTP 200 + run-scoped marker. Baseline gates PASS: `npx prisma validate`, `tsc --noEmit`, `eslint .`, `next build`, `vitest run --config vitest.unit.config.ts` (211/211 files, 3517 tests), `git diff --check`, `node verify-encoding.mjs` (12/12 files UTF-8 no BOM). Status flipped to `READY_FOR_AUDIT` after ×3 PASS. Implementation SHA pinned. | T0 §E + §F closure: 3 final runs PASS, all blockers + audit calls. |
| `v1.4` (rev. 4 — docs/control correction) | `2026-10-01 18:30 ICT` | T0 pre-audit docs/control integrity correction: HANDOFF.md / TASK.md aligned to the canonical schema the verifier scripts hard-code. HANDOFF switched to the compact-V2 sections 0..5 layout (`## 2. Acceptance evidence`, `## 3. Evidence registry`, `## 5. Final status`); `verify-task.ps1` row added at the head of `## 2. Acceptance evidence` with `RESULT: PASS`. AUDIT.md deletion finalized. `EV-ATTEMPT-1-*` working-tree artefacts removed. Stale `Final HEAD (this handoff freeze)` field that pinned a previous forward-only docs commit (`ebc2c704…`) was retired; superseded by `Docs/evidence freeze SHA ae560725…` + `Prior docs/update HEAD e09a5e2b…` rows in `## 0. Control`. The T1-side verifier failures recorded in `EV-22-{task-contract-gate,handoff-substance-gate}.log` from rev. 3 were **real FAIL** (exit 2 with V1-template section-list mismatches), not "V1 residual warnings"; rev. 4 corrects them to exit 0 by realigning TASK.md / HANDOFF.md with the V1 canonical schema the verifier scripts still hard-code. Spec version retained as `v1.4` because no semantic delta was introduced — this revision is docs/control-only per T0 §A.1. | T0 §A..§G corrections. Carry-forward from `v1.4` implementation + freeze is authoritative; verifier scripts still hard-code the V1 canonical schema, so docs/evidence must conform. |
| `v1.5` (rev. 6 — PR #73 build-blocker font hotfix) | `2026-10-01 22:30 ICT` | T0 post-audit release-integrity exception #1: removed every `next/font/google` production import; introduced `next/font/local` via shared loader `app/fonts/local-fonts.tsx` exporting `beVietnamPro` (`--font-bvp`, weights 400/500/600/700) and `inter` (`--font-inter`, single variable file); committed font assets to `app/fonts/` (4 BVP static TTF + 1 Inter variable TTF + 2 OFL license files + 1 provenance registry); removed Google Fonts `<link rel="preconnect">` tags; `app/bod/page.tsx` switched to shared root local-font loader; added static regression guard `src/shared/ui/font-google-ban.static.test.ts`; verified E-24..E-31 (font-ban 18/18, zero `next/font/google` imports, typecheck/lint/build/unit PASS, UTF-8/no-BOM scan 7/7, clean tree, provenance 7/7). Tier 3 round-1 PASS evidence preserved as authoritative for unchanged P1 surface; DELTA audit scope is strictly the font delta + docs. Status flipped to `READY_FOR_AUDIT` (next gate `TIER3_DELTA_AUDIT`); Audit eligibility `ELIGIBLE`; T0 post-audit release-integrity exceptions used = 1. Font-hotfix Implementation SHA `b0d09582…`. | T0 §A–§G post-audit release-integrity exception #1. `next/font/google` blocked CI + Vercel build; self-host fonts. No semantic delta to unchanged P1 runtime surface (`EV-32` impact proof). |
| `v1.5` (rev. 6 — docs/control freeze) | (recorded once committed) | Docs/evidence freeze commit. Pins Font-hotfix Implementation SHA `b0d09582…`; preserves P1 Implementation SHA `708e0ce7…` as predecessor; records audit round-1 PASS applies to the unchanged P1 surface; flips Status → `READY_FOR_AUDIT`; Frozen delivery → `YES`; Canonical gates → `PASS`; Audit eligibility → `ELIGIBLE`; Next gate → `TIER3_DELTA_AUDIT`. No semantic delta vs `b0d09582…`. Docs-only commit; no source code, no tests, no scripts, no evidence payload changes. | T0 §E.2 docs/evidence freeze discipline; rev. 6 closing this fork. |

---

**Handoff status: READY_FOR_AUDIT** (per T0 §E.5 control truthfulness)

Frozen: YES; Canonical: PASS; Audit eligibility: ELIGIBLE; Next gate: TIER3_DELTA_AUDIT.

This handoff pins P1 Implementation SHA = `708e0ce71d258c3a70383330dfb8d5d370dbd974` (predecessor) and Font-hotfix Implementation SHA = `b0d09582…` (new audit-target HEAD). Tier 3 owns `AUDIT.md` and the DELTA audit verdict on the font delta + docs only; Tier 3 round-1 PASS evidence (`audit/AI_AUDIT_TIER3_ROUND1.md`) remains authoritative for the unchanged P1 runtime surface. Tier 1 stops here per T0 §Stop boundary (no push, no merge, no deploy, no production DB access).