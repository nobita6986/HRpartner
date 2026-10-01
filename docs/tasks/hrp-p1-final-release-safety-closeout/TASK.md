# TASK — `hrp-p1-final-release-safety-closeout`

> **TIER-1 CONTROL (rev. 6 — PR #73 build-blocker font hotfix 2026-10-01)**:
> This TASK.md is restructured for the **post-audit release-integrity exception #1**
> (T0 directive §A–§G, 2026-10-01). PR #73 (audit-adoption SHA `1b60dd40`) had
> passed Tier 3 LIGHT audit round 1 and was pushed; GitHub CI Quality (`next build`)
> and Vercel preview both failed with `next/font/google`'s loader throwing
> `TypeError: Cannot read properties of null (reading '1')` while attempting to
> fetch font data from `fonts.googleapis.com`. T0 ruled: **self-host fonts**, no
> retry-to-find-a-pass.
>
> Round 6 is a forward-only exception cycle, not a new audit round. The P1
> semantic implementation SHA `708e0ce71d258c3a70383330dfb8d5d370dbd974` (T0 §A.1
> predecessor) and the E2E ×3 PASS evidence `EV-RUN-{1,2,3}-*` (T0 §A.2
> predecessor) are carry-forward, and **Tier 3 LIGHT audit round 1 PASS verdict
> (per `AUDIT.md` §0 verdict = `PASS`, AUD-001..AUD-008 all P3 non-blocking)**
> remains authoritative for the **unchanged P1 surface** (P1 runtime UI/HTTP E2E
> ×3, hard guard, posture preflight, fixture bootstrap, exact-ID teardown, BLK-02
> SSR fix, BLK-03 recruiter canonical flow, BLK-04 OS-temp cleanup).
>
> The font hotfix is a **strict semantic delta** in:
> - `app/layout.tsx` — replaces `next/font/google` with shared local-font loader
> - `app/bod/page.tsx` — drops its own Google-font loader; consumes the shared loader
> - `app/fonts/` — new directory: 5 TTF files + 2 OFL.txt + 1 provenance registry + 1 loader module
> - `src/shared/ui/font-google-ban.static.test.ts` — new regression guard
>
> No routes, auth, DB, fixtures, runtime E2E scripts, or P1 domain logic are
> touched. Tier 3 DELTA audit will scope-review only the four surfaces above
> plus the docs/control delta. Round 6 status flips to `READY_FOR_AUDIT`
> with Tier 3 DELTA retry accepted (T0 §E.2); Tier 3 does NOT re-open unchanged
> P1 runtime surface (T0 §F). `T0 post-audit release-integrity exceptions used =
> 1` (correction budget and batches used incremented; T0 §A).

> **TIER-1 CONTROL (rev. 7 — post-merge formal closeout 2026-10-02)**:
> PR #73 was merged into `main` at `0179ef8b18045d1340028669871bc1db492da08d`.
> Post-merge gates on `main`: CI Quality `SUCCESS`, Integration `SUCCESS`,
> Vercel deployment `SUCCESS — Deployment has completed`. Tier 3 LIGHT audit
> round 1 PASS verdict (round-1) is preserved as authoritative for the
> unchanged P1 runtime surface; Tier 3 DELTA audit round 2 PASS verdict
> (font delta + docs/control) is adopted. Recruiter end-to-end proof ×3 with
> zero residue (`{users=0, orders=0, slots=0, projects=0, companies=0}` per run).
> All four P1 release blockers (BLK-01..BLK-04) are CLOSED/RESOLVED. Round 7
> is a docs-only forward-only commit on top of the merge SHA; no source,
> test, schema, migration, package, or font asset changes. No production
> DB access/migration. Production migration/deploy is deferred to the VPS
> release cutover. **P1 Thin Recruitment Value Slice = COMPLETE**; no
> P2/P3/P4/P5 work opened.
>
> Status = ACCEPTED, Frozen delivery = YES, Canonical gates = PASS,
> Audit eligibility = ELIGIBLE, Next gate = NONE — MERGED; production migration/deploy deferred to the VPS release cutover.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.6 (rev. 7 — post-merge formal closeout on main; Tier 3 LIGHT round 1 + DELTA round 2 PASS adopted; PR #73 merged into main at 0179ef8b18045d1340028669871bc1db492da08d)` |
| Work type | `CODE` (round-7 = docs-only formal closeout; no semantic delta) |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | P1 final release-safety closeout is a release-blocking gate. Tier 3 LIGHT audit round 1 PASS adopted at AUDIT.md commit (round-1 verbatim verdict carried forward). PR #73 CI/Vercel recovered via font self-host (`b0d09582`). Tier 3 DELTA audit round 2 PASS adopted at AUDIT.md commit (font delta + docs/control). PR #73 merged into `main` at `0179ef8b18045d1340028669871bc1db492da08d` (T0 directive §Post-merge closure). |
| Status | `ACCEPTED` (T0 closeout 2026-10-02: Tier 3 LIGHT audit round 1 PASS adopted; Tier 3 DELTA audit round 2 PASS adopted; both post-merge CI jobs Quality + Integration SUCCESS; Vercel deployment SUCCESS; recruiter end-to-end proof ×3 with zero residue; PR #73 merged into `main` at `0179ef8b18045d1340028669871bc1db492da08d`; production migration/deploy deferred to VPS release cutover) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Next gate | `NONE — MERGED; production migration/deploy deferred to the VPS release cutover` |
| Planner | `Tier 1` (T1C) |
| Baseline | `2f77399309c94732e71dd371175ab0ba4af02f57` |
| Implementation SHA | `708e0ce71d258c3a70383330dfb8d5d370dbd974` (predecessor — round-1 audit target) |
| Pre-correction audit-adoption SHA | `1b60dd40991e71a20845ab35985ea7454518d080` (Tier 3 round-1 PASS at this SHA; build blocker exposed here) |
| Font-hotfix Implementation SHA | `b0d095822780201c96715c27acb9d3396a20079e` (round-6 semantic commit; DELTA audit target) |
| Docs/evidence freeze SHA | `6070f640…` (docs/control freeze; pinned by rev. 6 commit message) |
| Prior docs/update HEAD | `e09a5e2ba99ca27035461cfaf67c6543a11ad481` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Correction batches used | `2` (round 4 docs/control + round 6 font hotfix) |
| Current execution round | `7` (formal post-merge closeout; docs-only forward-only commit; no semantic delta vs `0179ef8b18045d1340028669871bc1db492da08d`) |
| Current audit round | `2` (Tier 3 LIGHT round 1 + DELTA round 2, both PASS adopted) |
| T0 post-audit release-integrity exceptions used | `1` (of `1` budgeted by T0 §A) |
| Accepted main SHA | `0179ef8b18045d1340028669871bc1db492da08d` (PR #73 merge commit on `main`) |
| Merged PR | `#73` (merged into `main` at `0179ef8b18045d1340028669871bc1db492da08d`; source branch `codex/t1c-p1-final-release-safety-closeout`) |
| Post-merge CI Quality | `SUCCESS` |
| Post-merge Integration | `SUCCESS` |
| Post-merge Vercel | `SUCCESS — Deployment has completed` |
| Tier 3 LIGHT round 1 | `PASS` (adopted at AUDIT.md commit; verdict preserved as authoritative for unchanged P1 surface) |
| Tier 3 DELTA round 2 | `PASS` (adopted at AUDIT.md commit; scope = font delta + docs/control) |
| Recruiter E2E ×3 + zero residue | `PASS` (recruiter end-to-end proof ×3 with residue `{users=0, orders=0, slots=0, projects=0, companies=0}` per run) |
| P1 release blockers | `all CLOSED/RESOLVED` (BLK-01..BLK-04 closed; verified by ×3 E2E + Tier 3 LIGHT + DELTA) |
| P1 Thin Recruitment Value Slice | `COMPLETE` (no P2/P3/P4/P5 work opened) |
| Production DB / migration | `NOT_RUN` (T0 owns production-side remediation; VPS release cutover deferred) |
| In-scope roots | `app/layout.tsx`, `app/bod/page.tsx` (font-loader swap, preconnect removal); `app/fonts/` (5 TTF + 2 OFL.txt + `FONTS_PROVENANCE.txt` + `local-fonts.tsx` shared loader); `src/shared/ui/font-google-ban.static.test.ts` (regression guard); `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,evidence/}` (docs/control delta). |
| Required gates | `verify-task.ps1` (exit 0); `verify-handoff.ps1` (exit 0); `npm run typecheck`; `npm run lint`; `npm run build`; `npm run test:unit`; `npx prisma validate`; `git diff --check HEAD`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `rg "from 'next/font/google'" app src` (zero matches). See §0.2 for full list and per-gate evidence file. |

### 0.1 In-scope roots

- **A — PRODUCTION-HOST HARD GUARD**: `scripts/runtime/db-host-guard.mjs`, `scripts/runtime/db-host-guard.test.mjs`.
- **A — INTEGRATION POSTURE PROOF**: `scripts/runtime/db-posture-preflight.mjs`.
- **B — SAFE FIXTURE/RESET/TEARDOWN**: `scripts/runtime/synthetic-fixture.mjs`, `scripts/runtime/exact-id-teardown.mjs`.
- **C — CANONICAL P1 RUNTIME UI/HTTP E2E**: `scripts/runtime/p1-final-runtime-e2e.mjs`, `scripts/runtime/run-p1-e2e-pipeline.mjs`, `scripts/runtime/run-p1-e2e.ps1`.
- **D — INCIDENT CLOSEOUT DOCS**: `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,AUDIT.md,evidence/}`.
- **D' — PUBLIC JOB RELEASE FIX**: `src/domains/job-board/components/landing/featured-job-card.tsx` (added `'use client'`).
- **E — DELIVERY (round 3)**: forward-only commits separating semantic/test from docs/evidence freeze; no push, no PR, no T3, no merge, no deploy.
- **F — ROUND 6 FONT BUILD HOTFIX (PR #73 build blocker; new in rev. 6)**:
  - `app/layout.tsx` — replaced `next/font/google` with shared `next/font/local` loader; CSS contracts `--font-bvp` and `--font-inter` preserved; Material Symbols CSS link kept (P3 debt); removed Google-font preconnect `<link>`s.
  - `app/bod/page.tsx` — dropped its own `next/font/google` loader and inline config; now imports `beVietnamPro` from the shared loader (T0 §B.6); stale UTF-16-LE BOM stripped on legitimate modification (AGENTS.md rule #5); pre-existing U+FFFD in the comment `Hàng đ<U+FFFD>i cần xử lý` preserved verbatim (out-of-scope legacy content).
  - `app/fonts/` (NEW) — 5 committed self-hosted font assets + 2 OFL license files + provenance registry + shared loader module:
    - `BeVietnamPro-Regular.ttf` (132948 bytes), `BeVietnamPro-Medium.ttf` (135980 bytes), `BeVietnamPro-SemiBold.ttf` (136736 bytes), `BeVietnamPro-Bold.ttf` (140300 bytes) — 4 statics because google/fonts has no variable font for Be Vietnam Pro yet (open since 2022 — see `google/fonts#4340`).
    - `Inter[opsz,wght].ttf` (876576 bytes) — single variable font with opsz + wght axes (covers static 400/500/600).
    - `BeVietnamPro-OFL.txt`, `Inter-OFL.txt` (SIL Open Font License 1.1).
    - `FONTS_PROVENANCE.txt` (size + sha256 registry + provenance notes; AGENTS.md rule #1 keeps the bootstrap helper script out of the repo).
    - `local-fonts.tsx` — shared `next/font/local` loader exporting `beVietnamPro` and `inter` (TSX so the existing `design-tokens.static.test.ts`, which scans `.tsx` files for `variable: '--font-bvp'` / `variable: '--font-inter'` regex matches, continues to register the brand tokens).
  - `src/shared/ui/font-google-ban.static.test.ts` (NEW) — static regression guard: ZERO `from 'next/font/google'` imports under `app/**`; shared loader exists and exports both fonts; layout/bod consume shared loader; `--font-bvp` and `--font-inter` remain discoverable as `variable: '<name>'` strings; negative-fixture test proves the gate fails LOUDLY if a future PR reintroduces `next/font/google`.
- **F' — DELIVERY (round 6)**: forward-only semantic commit (`b0d09582`) separates font hotfix from docs/evidence freeze; no push to PR #73 until Tier 3 DELTA audit returns; no production DB / migration / deploy / Vercel mutation; no P3 findings outside font/build blocker.

### 0.2 Required gates

| Gate | Command | Result | Evidence file |
|---|---|---|---|
| Production-host hard guard unit | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` | 19/19 PASS | `evidence/EV-23-guard-unit-tests.log` |
| Integration posture preflight | `node scripts/runtime/db-posture-preflight.mjs` | POSTURE_OK ×3 | `evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}` |
| Synthetic fixture bootstrap | `node scripts/runtime/synthetic-fixture.mjs` | exit 0 ×3 (exact IDs + ACTIVE recruiter assignment) | `evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}` |
| Canonical P1 runtime E2E | `node scripts/runtime/run-p1-e2e-pipeline.mjs` | 20/20 steps PASS ×3 | `evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}` |
| Exact-ID zero-residue teardown | `node scripts/runtime/exact-id-teardown.mjs` | residue 0/0/0/0/0 ×3 | `evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}` |
| Prisma validate | `npx prisma validate` | exit 0 | `evidence/EV-12-prisma-validate.log` |
| Typecheck | `npm run typecheck` | exit 0 | `evidence/EV-09-typecheck.log` |
| Lint | `npm run lint` | exit 0 | `evidence/EV-10-lint.log` |
| Build | `npm run build` | exit 0 | `evidence/EV-08-build.log` |
| Unit tests | `npm run test:unit` | exit 0 (211/211 files, 3517 tests, 9 skipped, 0 failed) | `evidence/EV-11-unit-tests.log` |
| `git diff --check` | `git diff --check` | exit 0 | `evidence/EV-13-diff-check.log` |
| Strict UTF-8/no-BOM scan | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 (12/12 changed files OK) | `evidence/EV-14-encoding-scan.log` |
| Canonical strict integration gate | `CI_INTEGRATION_STRICT=1 npm run test:integration` | `NOT_REQUIRED` (T0 §B-01 forbids `DATABASE_URL_TEST` env name) | `evidence/EV-15-integration-contract-note.log` |
| **Round 6 — Font hotfix gates (PR #73 build blocker)** | | | |
| Targeted font ban regression test | `npx vitest run --config vitest.unit.config.ts src/shared/ui/font-google-ban.static.test.ts src/shared/ui/design-tokens.static.test.ts` | 18/18 PASS (font-ban 6/6, design-tokens 12/12) | `evidence/EV-24-font-ban-test.log` |
| `next/font/google` production-import scan | `grep -rn "from 'next/font/google'" app src` | ZERO MATCHES | `evidence/EV-25-font-google-ban-scan.log` |
| Font-hotfix typecheck | `npm run typecheck` (after font hotfix) | exit 0 | `evidence/EV-26-font-hotfix-typecheck.log` |
| Font-hotfix build (no Google Fonts network fetch) | `npm run build` (after font hotfix) | exit 0 — Next.js compiles `/bod` and all P1 routes with `--font-bvp` + `--font-inter` injected from `app/fonts/local-fonts.tsx`; no `TypeError` from `@next/font/dist/google/loader.js` | `evidence/EV-27-font-hotfix-build.log` |
| Font-hotfix unit tests | `npm run test:unit` (after font hotfix) | exit 0 — 212/212 files, 3523 tests passed, 9 skipped, 0 failed (font-ban added 6 tests; design-tokens unchanged) | `evidence/EV-28-font-hotfix-unit-tests.log` |
| Font-hotfix strict UTF-8/no-BOM scan | `node .ai-pipeline/scripts/verify-encoding.mjs` (after font hotfix) | exit 0 — 7/7 changed text files PASS | `evidence/EV-29-font-hotfix-encoding-scan.log` |
| Font-hotfix clean tree | `git status --short` (after font hotfix) | empty (clean working tree) | `evidence/EV-30-font-hotfix-clean-tree.log` |
| Font asset provenance audit | `node -e "..."` reading `app/fonts/FONTS_PROVENANCE.txt` | 7/7 assets verified (4 BVP statics + 1 Inter var + 2 OFL.txt); size + sha256 pinned; OFL 1.1 text present in both license files | `evidence/EV-31-font-provenance.log` |

### 0.3 Forbidden paths

`prisma/schema.prisma`; `package.json`; `package-lock.json`; any historical script outside `scripts/runtime/`; production `.env*` files; production DB/migration/deploy scripts; production `ep-shy-tree-az32as2c` host; PITR forensic branches; Vercel env/deploy mutation; root worktree dirty state (T0 §B-03); `pnpm-lock.yaml`/`pnpm-workspace.yaml`; `verify-encoding.ps1`; `.editorconfig`; `docs/important`; Tier 1 `tier1.md` (out of T1C scope); `p1f1`/`p1a05`/`p1a04`/`p1f0` legacy integration lane files (T0 §B-01 forbids `DATABASE_URL_TEST`); PR #71 / PR #72 source code (T0 §B-04 read-only, no reuse).

## 1. Outcome

### 1.1 What this revision delivers

- **Public SSR blocker fixed**. `featured-job-card.tsx` now declares `'use client'`. `GET /viec-lam/SLUG` (where SLUG is the published job slug) returns HTTP 200 and renders the published job posting with the correct slug and title. Steps 7 + 17 of the canonical 20-step E2E are no longer `INFRASTRUCTURE_DEFECT`; they are PASS.
- **Recruiter-only canonical flow enforced**. Fixture now seeds an ACTIVE `StaffingOrderRecruiterAssignment` for the HR_STAFF user. E2E claim goes through `POST /api/admin/applications/SUBMISSION_ID/claim` (where SUBMISSION_ID is the application submission id) with HR session + UUID-v4 Idempotency-Key (no ADMIN SQL INSERT). Placement goes through `POST /api/admin/recruiter/placements` (no fallback to `/api/admin/placements`). Confirm/effective/cancel go through `/api/admin/recruiter/placements/PLACEMENT_ID/actions/*` (where PLACEMENT_ID is the placement id) with HR session.
- **Runtime safety + cleanup**. `docs/tasks/.tmp/` residue cleaned. `synthetic-fixture.mjs` and `run-p1-e2e-pipeline.mjs` now write into `os.tmpdir()` by default and clean up in `finally`/`process.on('exit')` so PASS and FAIL both leave `git status --short` empty.

### 1.2 Round 3 closure (T0 §F)

T0 §F mandates:

> Chỉ khi toàn bộ điều trên PASS:
> - tạo semantic commit mới;
> - tạo docs/evidence freeze;
> - pin exact SHAs;
> - Status = READY_FOR_AUDIT;
> - Frozen delivery = YES;
> - Audit eligibility = ELIGIBLE;
> - Next gate = TIER3_LIGHT_AUDIT.

This is the closing round of the closeout. Per T0 §E, final E2E ×3 ran on synthetic writer/admin pair with zero `INFRASTRUCTURE_DEFECT` and zero unexpected `EXPECTED_FAIL`. After ×3 PASS, all baseline gates PASS, then the control flipped to `READY_FOR_AUDIT`.

### 1.3 Rev. 4 — T0 pre-audit docs/control integrity correction

T0 §A..§G inspect this revision. The runtime semantic delta is empty
(`git diff --name-only 708e0ce..HEAD -- app src prisma tests scripts packages
package.json package-lock.json` is empty), so the ×3 PASS runtime evidence
remains authoritative. The correction batch is limited to:

- TASK.md / HANDOFF.md / SELF_REVIEW.md structural alignment with the
  V1 canonical schema the verifier scripts still hard-code.
- Correction of stale `Final HEAD` references pinning a previous forward-only
  docs commit (`ebc2c704…`); the corrected docs pin Implementation SHA
  `708e0ce7…` and docs/evidence freeze SHA `ae560725…`, and they refer to
  the **prior** pre-correction docs/update HEAD `e09a5e2b…` rather than to
  the SHA of this same correction commit (T0 §E anti-self-reference rule).
- Commit deletion of `docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md`
  (already staged for deletion at pre-correction HEAD; finalized in this batch).
- Working-tree cleanup of `EV-ATTEMPT-1-*` (failure already captured in
  `TIER1_SELF_REVIEW.md` §C; the canonical ×3 evidence is `EV-RUN-{1,2,3}-*`).

### 1.3.1 Rev. 6 — PR #73 build-blocker font hotfix (post-audit release-integrity exception #1)

T0 §A–§G rule this revision. Round 1 Tier 3 audit PASS evidence is **preserved
as authoritative for the unchanged P1 runtime surface** (the surface from
Implementation SHA `708e0ce7…` forward through the audit-adoption SHAs); the
DELTA audit scope is strictly the font delta and docs (see §F).

**Build blocker root cause (accepted).** `next/font/google` triggers a
network fetch to `fonts.googleapis.com` / `fonts.gstatic.com` at
`@next/font/dist/google/loader.js` compile time. GitHub Actions and Vercel
build sandboxes deny egress → loader throws `TypeError: Cannot read
properties of null (reading '1')`. Fix-by-retry forbidden by T0 §B; the only
acceptable remedy is self-hosting.

**Semantic correction (font-hotfix commit `b0d09582…`).**

1. Removed every `next/font/google` import from `app/**` and `src/**`.
   Production-import scan (`grep -rn "from 'next/font/google'" app src`) now
   returns zero matches (`EV-25`).
2. Introduced shared loader `app/fonts/local-fonts.tsx` exporting
   `beVietnamPro` (`variable: '--font-bvp'`, weights 400/500/600/700) and
   `inter` (`variable: '--font-inter'`, single variable file). The shared
   `.tsx` extension is required so the existing
   `src/shared/ui/design-tokens.static.test.ts` regex (scans `*.tsx` files
   for `variable: '--font-bvp'`) continues to pass without churn.
3. Committed font assets to `app/fonts/`:
   - `BeVietnamPro-{Regular,Medium,SemiBold,Bold}.ttf` (4 static weights;
     no upstream variable yet — `google/fonts#4340`);
   - `Inter[opsz,wght].ttf` (single variable file covering optical size
     14..32 × weight 100..900);
   - `BeVietnamPro-OFL.txt`, `Inter-OFL.txt` (SIL OFL 1.1 license texts);
   - `FONTS_PROVENANCE.txt` — registry of file sizes, SHA-256 hashes, and
     upstream commit provenance.
4. `app/layout.tsx` imports `beVietnamPro` and `inter` from
   `./fonts/local-fonts`; Google Fonts `<link rel="preconnect">` tags
   removed; the Material Symbols runtime CSS link (`fonts.googleapis.com/icon`)
   is **retained** per T0 §B-7 (P3 debt, out of scope here).
5. `app/bod/page.tsx` now imports `beVietnamPro` from
   `@/app/fonts/local-fonts`; the bespoke Google-font loader is gone.
6. CSS variable contracts preserved exactly: `--font-bvp`, `--font-inter`.
   No design-token churn. No class-name churn outside the imports.
7. New static regression guard
   `src/shared/ui/font-google-ban.static.test.ts` proves (a) zero
   `next/font/google` imports in `app/**`; (b) `app/layout.tsx` wires
   `--font-bvp` and `--font-inter` from local-font exports; (c)
   `app/bod/page.tsx` imports from `@/app/fonts/local-fonts`; (d) the shared
   loader exports both CSS variables; (e) a negative fixture is rejected.

**Impact proof for unchanged surface.** `git diff --name-only 708e0ce7..b0d09582
-- app src prisma scripts tests packages package.json package-lock.json` —
runtime surface diff is empty for everything outside `app/fonts/**`,
`app/layout.tsx`, `app/bod/page.tsx`, and
`src/shared/ui/font-google-ban.static.test.ts`. Therefore the ×3 PASS
runtime E2E evidence (`EV-04`–`EV-06`), Tier 3 round-1 audit PASS evidence,
and the design-token static test suite all carry forward unchanged.

**State at handoff to T0.**

| Field | Value |
|---|---|
| Status | `READY_FOR_AUDIT` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Next gate | `TIER3_DELTA_AUDIT` |
| Predecessor (P1 implementation) | `708e0ce7…` |
| Audit-adoption predecessors | `ae560725…`, `e09a5e2b…`, `1b60dd40…` |
| Font-hotfix Implementation SHA | `b0d09582…` |
| Docs/evidence freeze SHA | `6070f640…` (recorded in §10; rev. 6 docs/control freeze) |
| New audit-target HEAD | font-hotfix commit `b0d095822780201c96715c27acb9d3396a20079e` (DELTA audit target; docs/control freeze = `6070f640…`, EV-30 update = `28aca457…`) |
| T0 post-audit release-integrity exceptions used | **1** (this build blocker) |

**Commit/freeze discipline.**

- Forward-only semantic commit `b0d09582…` (`fix(p1-final): self-host fonts
  via next/font/local (PR #73 build blocker)`).
- Separate docs/evidence freeze commit to follow (recorded in §10 once
  committed); it pins SHAs, flips control state, and references this TASK
  rev. 6.
- No `git reset --hard` / `git commit --amend` / `git rebase` / `git push
  --force` (T0 §E.3).
- No push of new commits to PR #73 before DELTA audit (T0 §E.4).
- Working tree clean before handoff (`EV-30`).

### 1.4 Non-goals

- KHÔNG sửa schema, package.json, package-lock.json.
- KHÔNG touch bất kỳ historical script ngoài `scripts/runtime/**` (T0 §B-07).
- KHÔNG dùng shared `seed-*` fixture; controlled synthetic fixture bootstrap only.
- KHÔNG xóa/rebind shared slot/opening/posting; exact-ID reverse-FK teardown only.
- KHÔNG kết nối production `ep-shy-tree-az32as2c`; KHÔNG Vercel env/deploy mutation; KHÔNG PITR forensic access; KHÔNG production evidence cleanup (T0 §Production boundary).
- KHÔNG cung cấp static JWT_SECRET; launcher tự sinh per-run bằng `crypto.randomBytes(48)`, chỉ truyền cho child process env, không ghi disk/evidence.
- KHÔNG sửa baseline root worktree dirty state (T0 §B-03).
- KHÔNG dùng `DATABASE_URL_TEST` env name (T0 §B-01 forbids); canonical integration lane không được gọi tên xung đột với T0 contract.
- KHÔNG tự ý tuyên bố P1 hoàn tất; chỉ flip `READY_FOR_AUDIT` sau khi toàn bộ T0 §E + §F PASS.
- KHÔNG gọi Tier 3; KHÔNG push/PR/merge/deploy.
- KHÔNG re-run E2E/build/unit nếu docs-only correction không tạo semantic delta (T0 §Stop boundary).
- KHÔNG revert to `next/font/google`; KHÔNG swap to a network-fetching font CDN; font assets phải tự host (T0 §B-1..§B-7).
- KHÔNG đổi design token class names, `--font-bvp`, hoặc `--font-inter` (T0 §B-3).
- KHÔNG push font-hotfix hoặc docs-freeze commits lên PR #73 trước DELTA audit (T0 §E.4).
- KHÔNG merge PR #73 / deploy / promote / touch production DB (T0 §G).
- KHÔNG sửa Material Symbols CSS link thành self-host trong correction này; ghi nhận là P3 debt (T0 §B-7).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `scripts/runtime/db-host-guard.mjs:60-62` — three runtime allowlist constants: `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'`, `SYNTHETIC_DATABASE='neondb'`, `PROD_DENY_PREFIX='ep-shy-tree-az32as2c'`. | T0 §B-01 requires runtime allowlist as constant. |
| `EV-02` | `evidence/EV-23-guard-unit-tests.log` — 19/19 unit tests PASS. | T0 §B-05 requires unit/static proof without credentials. |
| `EV-03` | `evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}` — `POSTURE_OK` ×3 with writer `super=false bypassrls=false` + admin `super=false bypassrls=true`; same db `db-alias=693fe5919fc2`. | T0 §B-05 requires integration posture proof. |
| `EV-04` | `evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}` — exact IDs + redacted phone aliases + ACTIVE `StaffingOrderRecruiterAssignment` row for HR_STAFF (DEC-12). | T0 §B-06 + T0 §C.3 dual-authority requirement. |
| `EV-05` | `evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}` — residue `{users:"0", orders:"0", slots:"0", projects:"0", companies:"0"}` per run. | T0 §B-06 cleanup exact-ID. |
| `EV-06` | `evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}` — 20-step canonical UI/HTTP E2E: Step 7/17 HTTP 200 (BLK-02 fix), Step 12 canonical claim via `POST /api/admin/applications/SUBMISSION_ID/claim` with UUID-v4 Idempotency-Key (BLK-03 fix), Step 13 placement via `POST /api/admin/recruiter/placements` (no admin fallback), Steps 14-16 confirm/effective/cancel via `/api/admin/recruiter/placements/PLACEMENT_ID/actions/*`, Step 18 workbench MINE check. | T0 §C requires canonical 20-step business proof. |
| `EV-07` | `scripts/runtime/run-p1-e2e-pipeline.mjs` — defaults `evidenceDir` to OS temp; orchestrator `process.on('exit')` cleans up the orchestrator-owned evidence dir; PASS and FAIL both leave `git status --short` empty (BLK-04 fix). | T0 §D.2..§D.3 cleanup. |
| `EV-08` | `src/domains/job-board/components/landing/featured-job-card.tsx` — added `'use client'` directive; SSR no longer fails with "Event handlers cannot be passed to Client Component props". | T0 §B BLK-02 fix. |
| `EV-09` | `evidence/TIER1_SELF_REVIEW.md` (T1 self-review; also captures the `EV-ATTEMPT-1-*` step-15 UUID-v4 first-pass failure history). | T0 §A.3 control truthfulness. |
| `EV-10` | `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md}` — Status `READY_FOR_AUDIT`, Frozen `YES`, Canonical `PASS`, Audit `ELIGIBLE`, Next gate `TIER3_LIGHT_AUDIT`. | T0 §A control truthfulness. |
| `EV-11` | `evidence/EV-{08,09,10,11,13,14}-*.log` — baseline gates after ×3 PASS: `npx prisma validate`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs`. | T0 §E. |
| `EV-12` | `evidence/EV-12-prisma-validate.log` — `The schema at prisma\schema.prisma is valid`. | T0 §E. |
| `EV-13` | `evidence/EV-13-diff-check.log` — `git diff --check` exit 0. | T0 §E. |
| `EV-14` | `evidence/EV-14-encoding-scan.log` — 12/12 changed files UTF-8 without BOM (strict scan). | T0 §E + global-rules §7. |
| `EV-15` | `evidence/EV-15-integration-contract-note.log` — canonical strict integration gate is `NOT_REQUIRED` per T0 §B-01 (forbids `DATABASE_URL_TEST` env name). | T0 §B-01 + DEC-10. |
| `EV-16` | `evidence/EV-16-forward-only-commits.log` — forward-only commits separating semantic/test (`708e0ce7…`) from docs/evidence freeze (`ae560725…`). | T0 §Stop boundary. |
| `EV-24` | `evidence/EV-24-font-ban-test.log` — `src/shared/ui/font-google-ban.static.test.ts` (6/6 PASS) + `src/shared/ui/design-tokens.static.test.ts` (12/12 PASS). | T0 §C font regression guard. |
| `EV-25` | `evidence/EV-25-font-google-ban-scan.log` — `grep -rn "from 'next/font/google'" app src` → zero matches. | T0 §C "Expected: zero production imports". |
| `EV-26` | `evidence/EV-26-font-hotfix-typecheck.log` — `npm run typecheck` exit 0 after font hotfix. | T0 §D typecheck gate. |
| `EV-27` | `evidence/EV-27-font-hotfix-build.log` — `npm run build` exit 0 after font hotfix; no `TypeError` from `@next/font/dist/google/loader.js`; `--font-bvp` + `--font-inter` injected from `app/fonts/local-fonts.tsx`. | T0 §D build PASS without Google Fonts network. |
| `EV-28` | `evidence/EV-28-font-hotfix-unit-tests.log` — `npm run test:unit` exit 0; 212/212 files, 3523 tests passed, 9 skipped, 0 failed (font-ban added 6 tests; design-tokens unchanged at 12). | T0 §D unit-test gate. |
| `EV-29` | `evidence/EV-29-font-hotfix-encoding-scan.log` — `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 after font hotfix; 7/7 changed text files PASS (TTF/woff/woff2 binary files are scoped out by `verify-encoding.mjs`'s text-only filter). | T0 §D + global-rules §7. |
| `EV-30` | `evidence/EV-30-font-hotfix-clean-tree.log` — `git status --short` empty (untracked `app/fonts/*.ttf` and `app/fonts/*.txt` are committed inside the semantic commit; no pending edits). | T0 §E.5 working-tree cleanliness. |
| `EV-31` | `evidence/EV-31-font-provenance.log` — `app/fonts/FONTS_PROVENANCE.txt` registry cross-checked: 4 BVP statics + 1 Inter variable + 2 OFL.txt; sizes + sha256s pinned; OFL 1.1 text present in both license files; upstream commit SHAs from `google/fonts` repo recorded. | T0 §B-4 + §F font asset provenance audit. |
| `EV-32` | `evidence/EV-32-impact-proof.log` — `git diff --name-only 708e0ce7..b0d09582 -- app src prisma scripts tests packages package.json package-lock.json` is empty outside `app/fonts/**`, `app/layout.tsx`, `app/bod/page.tsx`, and `src/shared/ui/font-google-ban.static.test.ts`. | T0 §D carry-forward proof: ×3 PASS E2E + Tier 3 round-1 PASS evidence apply to unchanged P1 surface. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Production-host hard guard refuses by construction. | CHOSEN (T0 §B-01) |
| `DEC-02` | Two-tier proof: guard unit tests + posture preflight. | CHOSEN (T0 §B-05) |
| `DEC-03` | Controlled synthetic fixture bootstrap with deterministic IDs + redacted phones + random in-memory passwords. | CHOSEN (T0 §B-06) |
| `DEC-04` | Exact-ID reverse-FK teardown with zero-residue assertion. | CHOSEN (T0 §B-06) |
| `DEC-05` | Canonical 20-step P1 runtime UI/HTTP E2E. | CHOSEN (T0 §C) — revised for §C BLK-03: claim/placement/actions all use canonical recruiter routes; no ADMIN fallback. |
| `DEC-06` | Cold-connect warmup before step 1. | CHOSEN (round-2 debugging) |
| `DEC-07` | Live child server: `NODE_ENV='test'` (NOT production) so the in-memory rate-limit adapter activates. | CHOSEN (T0 §B-09) |
| `DEC-08` | JWT_SECRET = `crypto.randomBytes(48).toString('hex')` per-run, set only in child process env. | CHOSEN (T0 §JWT) |
| `DEC-09` | REMOVED. The public SSR 500 is no longer tolerated as out-of-scope. The root cause (Server Component passing event handlers to Client Component props in `featured-job-card.tsx`) is fixed via `'use client'`. | SUPERSEDED — closed by §C BLK-02 |
| `DEC-10` | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) is INTENTIONAL NOT RUN — T0 §B-01 forbids `DATABASE_URL_TEST` env name. | CHOSEN (T0 §B-01) |
| `DEC-11` | E2E launcher is `run-p1-e2e-pipeline.mjs` (Node) primary; `run-p1-e2e.ps1` is the PowerShell orchestrator alternative. | CHOSEN |
| `DEC-12` | NEW — Fixture seeds an ACTIVE `StaffingOrderRecruiterAssignment` row for the HR_STAFF user + the relevant `StaffingOrder`, with role=`HR_MANAGER_ASSIGN` and status=`ACTIVE`. This satisfies `assertActiveRecruiterForOrder` dual-authority precondition for canonical claim/placement routes. | CHOSEN (T0 §C.2) |
| `DEC-13` | NEW — Runner writes to OS temp dir by default and cleans up in `finally`/`process.on('exit')`. Existing `docs/tasks/.tmp/` residue is purged. | CHOSEN (T0 §D.2..§D.3) |
| `DEC-14` | NEW — `featured-job-card.tsx` adds `'use client'` directive so event handlers inside the component are serialized cleanly on `/viec-lam/SLUG`. | CHOSEN (T0 §B BLK-02) |
| `DEC-15` | TIER1_SELF_REVIEW.md replaces AUDIT.md; T3 owns `AUDIT.md` after the delivery is genuinely eligible. | CHOSEN (T0 §A.3) |
| `DEC-16` | NEW — Self-host fonts via `next/font/local`. `next/font/google` is banned from `app/**` and `src/**` production code (T0 §B-1, §B-2). | CHOSEN (T0 §B build-blocker remedy) |
| `DEC-17` | NEW — Shared root loader `app/fonts/local-fonts.tsx` exporting `beVietnamPro` (`--font-bvp`, weights 400/500/600/700) and `inter` (`--font-inter`, single variable file). `.tsx` extension is mandatory so the existing `design-tokens.static.test.ts` regex (scans `*.tsx` for `variable: '--font-bvp'`) continues to pass without churn. `app/bod/page.tsx` consumes this shared loader rather than maintaining its own Google-font loader. | CHOSEN (T0 §B-6) |
| `DEC-18` | NEW — Font asset provenance via `app/fonts/FONTS_PROVENANCE.txt` (registry of file sizes, SHA-256 hashes, and upstream commit provenance from `google/fonts` repository). OFL 1.1 license texts committed alongside (`BeVietnamPro-OFL.txt`, `Inter-OFL.txt`). | CHOSEN (T0 §B-4) |
| `DEC-19` | NEW — Static regression guard `src/shared/ui/font-google-ban.static.test.ts` proves (a) zero `next/font/google` production imports; (b) `app/layout.tsx` wires `--font-bvp` and `--font-inter` from local-font exports; (c) `app/bod/page.tsx` imports from `@/app/fonts/local-fonts`; (d) shared loader exports both CSS variables; (e) negative fixture is rejected. | CHOSEN (T0 §C) |

## 4. Contract

### 4.1 RQ — Requirements

| ID | Requirement | Source |
|---|---|---|
| `RQ-01` | Production-host hard guard refuses by construction. | T0 §B-01 |
| `RQ-02` | Two-tier runtime proof: guard unit tests + posture preflight. | T0 §B-05 |
| `RQ-03` | Controlled synthetic fixture: deterministic exact IDs + redacted phones + ACTIVE recruiter assignment. | T0 §B-06, §C.3 |
| `RQ-04` | Exact-ID reverse-FK teardown with zero-residue assertion. | T0 §B-06 |
| `RQ-05` | Canonical 20-step P1 runtime UI/HTTP E2E with step 7/17 HTTP 200 + step 12 canonical claim + step 13 recruiter placement (no admin fallback) + step 14/15/16 recruiter confirm/effective/cancel. | T0 §C |
| `RQ-06` | Pipeline ×3 PASS on synthetic writer/admin pair (zero `INFRASTRUCTURE_DEFECT`, zero unexpected `EXPECTED_FAIL`). | T0 §C, §F |
| `RQ-07` | Baseline gates PASS after ×3 PASS: prisma validate, typecheck, lint, build, test:unit, `git diff --check`, UTF-8/no-BOM scan. | T0 §E |
| `RQ-08` | Runner writes into OS temp dir + run-scoped cleanup (no `docs/tasks/.tmp/` residue). | T0 §D.2..§D.3 |
| `RQ-09` | Forward-only commits separating semantic/test from docs/evidence freeze. | T0 §Stop boundary |
| `RQ-10` | `featured-job-card.tsx` `'use client'` directive (BLK-02 SSR fix). | T0 §B BLK-02 |
| `RQ-11` | HANDOFF/TASK/SELF_REVIEW structural truthfulness (canonical T0/A after each round). | T0 §A.3 |
| `RQ-12` | Canonical strict integration gate `NOT_REQUIRED` per T0 §B-01 (DEC-10). | T0 §B-01 |

### 4.2 STEP — Execution Plan

| ID | Step |
|---|---|
| `STEP-01` | Worktree from `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57`. |
| `STEP-02` | Hard guard. |
| `STEP-03` | Posture preflight. |
| `STEP-04` | Synthetic fixture (with DEC-12 dual-authority row). |
| `STEP-05` | Exact-ID teardown. |
| `STEP-06` | E2E launcher (with DEC-14 SSR fix + DEC-12 recruiter canonical flow). |
| `STEP-07` | Pipeline orchestrator (with DEC-13 OS-temp cleanup). |
| `STEP-08` | Baseline gates. |
| `STEP-09` | Evidence captured to `evidence/` under `docs/tasks/hrp-p1-final-release-safety-closeout/`; per-stage logs into OS temp. |
| `STEP-10` | Author TASK.md (this file) + HANDOFF.md + TIER1_SELF_REVIEW.md. Remove AUDIT.md (T3-owned). |
| `STEP-11` | Forward-only commits separating semantic/test from docs/evidence freeze. |
| `STEP-12` | T0 pre-audit docs/control integrity correction (this rev. 4): schema-align TASK/HANDOFF, fix stale `Final HEAD` pin, delete `EV-ATTEMPT-1-*` untracked artefacts, finalize AUDIT.md staged-deletion. |
| `STEP-13` | Stop boundary: hand back T0 with exact SHAs + counts + zero-residue proof + clean-tree proof. |

### 4.3 RQ → STEP → AC traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | STEP-02 | AC-01 |
| `RQ-02` | STEP-02, STEP-03 | AC-01, AC-02, AC-03 |
| `RQ-03` | STEP-04 | AC-04 |
| `RQ-04` | STEP-05 | AC-05 |
| `RQ-05` | STEP-06, STEP-07 | AC-06 |
| `RQ-06` | STEP-07, STEP-08 | AC-07 |
| `RQ-07` | STEP-08 | AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-14 |
| `RQ-08` | STEP-07, STEP-09 | AC-06, AC-07 |
| `RQ-09` | STEP-11, STEP-12 | AC-16 |
| `RQ-10` | STEP-06, STEP-08 | AC-10, AC-11 |
| `RQ-11` | STEP-10, STEP-12 | AC-17 |
| `RQ-12` | STEP-08 | AC-15 |

## 5. Execution Plan

Per `## 4.2`. Three runtime E2E suites (`EV-RUN-1`, `EV-RUN-2`, `EV-RUN-3`)
captured 2026-10-01 against the synthetic Neon
`ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech` / `neondb`
confirmed each of:

- **Posture PASS** — writer `app_user_writer` (`rolsuper=false`,
  `rolbypassrls=false`), admin `neondb_owner` (`rolsuper=false`,
  `rolbypassrls=true`), same `current_database` (`db-alias=693fe5919fc2`).
- **Fixture bootstrap PASS** — every run's `synthetic-fixture.mjs` writes
  under `os.tmpdir()` with exact IDs + redacted phone aliases + ACTIVE
  `StaffingOrderRecruiterAssignment` (DEC-12).
- **E2E 20/20 steps PASS** — steps 1–20 per run; step 7 `GET /viec-lam/SLUG` HTTP 200 with run-scoped title/slug marker; step 12 HR_STAFF canonical claim via `POST /api/admin/applications/SUBMISSION_ID/claim` with UUID-v4 Idempotency-Key (no ADMIN SQL); step 13 HR_STAFF placement create via recruiter route (no `/api/admin/placements` fallback); step 14 `confirm` → `status=CONFIRMED`; step 15 `effective` returns fail-closed contract `400 PLACEMENT_VALIDATION_ERROR` per DEC-07 ("HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"); step 16 `cancel` → `status=CANCELLED`; step 17 `GET /viec-lam/SLUG` HTTP 200; step 18 workbench MINE reflects final handling assignments; step 19 residue counts `users=3, orders=1, slots=1, openings=1, postings=1, submissions=1, placements=1, handlingassignments=1` (pre-teardown); step 20 public tracking code + placementId linked.
- **Exact-ID teardown PASS** — residue
  `{"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`
  per run. OS temp dir removed. No `docs/tasks/.tmp/`.
- **Zero `INFRASTRUCTURE_DEFECT`**, **zero unexpected `EXPECTED_FAIL`**.
- `git status --short` clean after each run (only matching evidence under
  `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/`).

Baseline gates (`STEP-08`) all PASS — see `## 6. Acceptance` row entries
for measured results and evidence.

## 6. Acceptance

| ID | AC | Method / Evidence | Measured result |
|---|---|---|---|
| `AC-01` | Hard guard exists with T0 constants. | `git show 708e0ce7:scripts/runtime/db-host-guard.mjs`; command `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (output: `evidence/EV-23-guard-unit-tests.log`). | 19/19 PASS; constant pin `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'`. |
| `AC-02` | 19/19 guard unit tests PASS. | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (output: `evidence/EV-23-guard-unit-tests.log`). | 19/19 PASS; exit 0. |
| `AC-03` | Posture PASS ×3. | `node scripts/runtime/db-posture-preflight.mjs` (output: `evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}`). | `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a` ×3; exit 0 ×3. |
| `AC-04` | Synthetic fixture PASS — exact IDs + ACTIVE recruiter assignment. | `node scripts/runtime/synthetic-fixture.mjs` (output: `evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}`). | exit 0 ×3; admin/manager/staffUser IDs + ACTIVE `StaffingOrderRecruiterAssignment` recorded per fixture file. |
| `AC-05` | Exact-ID teardown PASS — zero residue. | `node scripts/runtime/exact-id-teardown.mjs` (output: `evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}`). | residue `{users:"0", orders:"0", slots:"0", projects:"0", companies:"0"}` ×3; exit 0 ×3. |
| `AC-06` | E2E PASS — 20/20 steps PASS, zero `INFRASTRUCTURE_DEFECT`, zero unexpected `EXPECTED_FAIL`. | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (output: `evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}`). | 20/20 `[step-NN] PASS` lines ×3; step 7/17 `status=200 marker=ok`; step 15 fail-closed contract `400 PLACEMENT_VALIDATION_ERROR`; `[p1-e2e] OK` ×3. |
| `AC-07` | Pipeline ×3 PASS — RUN OK ×3 with zero residue ×3. | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (summary output: `evidence/EV-RUN-{1,2,3}-summary.json`). | `{"posture":0,"fixture":0,"e2e":0,"teardown":0,...}` ×3. |
| `AC-08` | Typecheck PASS. | `npm run typecheck` (output: `evidence/EV-09-typecheck.log`). | exit 0. |
| `AC-09` | Lint PASS. | `npm run lint` (output: `evidence/EV-10-lint.log`). | exit 0 (0 errors; pre-existing warnings). |
| `AC-10` | Build PASS. | `npm run build` (output: `evidence/EV-08-build.log`). | exit 0, Next.js 15.5.23 build OK. |
| `AC-11` | Unit PASS. | `npm run test:unit` (output: `evidence/EV-11-unit-tests.log`). | exit 0 — 211/211 files, 3517 tests passed, 9 skipped, 0 failed. |
| `AC-12` | Prisma validate PASS. | `npx prisma validate` (output: `evidence/EV-12-prisma-validate.log`). | exit 0 — `The schema at prisma\schema.prisma is valid`. |
| `AC-13` | Git diff check PASS. | `git diff --check HEAD` (output: `evidence/EV-13-diff-check.log`). | exit 0 (no whitespace errors). |
| `AC-14` | UTF-8 scan PASS (strict UTF-8 without BOM). | `node .ai-pipeline/scripts/verify-encoding.mjs` (output: `evidence/EV-14-encoding-scan.log`). | exit 0 — 12/12 changed files OK. |
| `AC-15` | Canonical strict integration gate NOT RUN — DEC-10 contract decision. | `pwsh -NoProfile -Command "Write-Output 'integration gate: NOT_REQUIRED (T0 §B-01 forbids DATABASE_URL_TEST env name); DEC-10'; exit 0"` (log: `evidence/EV-15-integration-contract-note.log`). | `NOT_REQUIRED` — T0 §B-01 forbids `DATABASE_URL_TEST` env name. |
| `AC-16` | Forward-only commits + stop boundary. | `git log --oneline 2f773993..708e0ce7`; `git log --oneline 708e0ce7..ae560725` (output: `evidence/EV-16-forward-only-commits.log`). | Implementation SHA `708e0ce7…` then docs/evidence freeze `ae560725…`; no amend, no rebase, no force-push. |
| `AC-17` | TASK.md + HANDOFF.md + `evidence/TIER1_SELF_REVIEW.md` exist; `AUDIT.md` deleted (T3-owned). | `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/`; `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md` (expect absent). | TASK.md + HANDOFF.md + TIER1_SELF_REVIEW.md tracked; AUDIT.md not in tree. |
| `AC-18` | ZERO `next/font/google` production imports in `app/**` and `src/**`. | `grep -rn "from 'next/font/google'" app src` (output: `evidence/EV-25-font-google-ban-scan.log`); static regression test `src/shared/ui/font-google-ban.static.test.ts` (output: `evidence/EV-24-font-ban-test.log`). | Zero matches; static test asserts `app/layout.tsx`, `app/bod/page.tsx`, and negative fixture all clean. |
| `AC-19` | `--font-bvp` + `--font-inter` CSS variables preserved and wired from shared local-font loader. | `src/shared/ui/design-tokens.static.test.ts` (output: `evidence/EV-24-font-ban-test.log`); `app/fonts/local-fonts.tsx` source inspection. | 12/12 design-token tests PASS; both `variable: '--font-bvp'` and `variable: '--font-inter'` declared in shared loader. |
| `AC-20` | `npm run build` PASS without any Google Fonts network fetch. | `npm run build` (output: `evidence/EV-27-font-hotfix-build.log`). | exit 0; no `TypeError` from `@next/font/dist/google/loader.js`; `--font-bvp` + `--font-inter` injected from `app/fonts/local-fonts.tsx`. |
| `AC-21` | Font asset provenance: 4 BVP statics + 1 Inter variable + 2 OFL.txt committed to `app/fonts/`; sizes + SHA-256 pinned in `app/fonts/FONTS_PROVENANCE.txt`; upstream commit SHAs from `google/fonts` recorded. | Manual SHA-256 verification via `node -e "..."` reading `app/fonts/FONTS_PROVENANCE.txt` and recomputing SHA-256 of each committed font asset (output: `evidence/EV-31-font-provenance.log`); manual grep for "SIL Open Font License" + "Version 1.1" inside both `app/fonts/BeVietnamPro-OFL.txt` and `app/fonts/Inter-OFL.txt` to confirm OFL 1.1 license text is present. | 7/7 assets verified; OFL 1.1 text present in both license files; no `.next/static/media/` hash files referenced. |
| `AC-22` | Font-hotfix ×3 carry-forward proof: `git diff --name-only 708e0ce7..b0d09582 -- app src prisma scripts tests packages package.json package-lock.json` is empty outside `app/fonts/**`, `app/layout.tsx`, `app/bod/page.tsx`, and `src/shared/ui/font-google-ban.static.test.ts`. | `git diff --name-only 708e0ce7..b0d09582 -- app src prisma scripts tests packages package.json package-lock.json` (output: `evidence/EV-32-impact-proof.log`). | Diff limited to font delta; P1 runtime E2E ×3 evidence (`EV-04`–`EV-06`) + Tier 3 round-1 audit PASS evidence (`audit/AI_AUDIT_TIER3_ROUND1.md`) carry forward unchanged. |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Production host connection by mistake. | Hard guard refuses by construction (DEC-01). |
| `RISK-02` | Forbidden env name leak. | Guard rejects with `FORBIDDEN_ENV`. |
| `RISK-03` | Fixture bootstrap mutates shared seeded users. | Controlled synthetic fixture. |
| `RISK-04` | Teardown FK violation on `placement_case → labor_profiles` (RESTRICT). | Reverse-FK order. |
| `RISK-05` | Prisma cold-connect 500 from child `next start` server. | Cold-connect warmup (DEC-06). |
| `RISK-06` | Public `/viec-lam/[slug]` SSR 500. | FIXED via DEC-14 (`'use client'`). |
| `RISK-07` | Canonical strict integration gate misreads closeout as failed. | DEC-10 — NOT_REQUIRED. |
| `RISK-08` | Baseline build fails on clean `origin/main`. | Pre-checked baseline. |
| `RISK-09` | T0 contract says no PR + no T3 call. | Forward-only commits; no push; no PR; no merge/deploy. |
| `RISK-10` | Recruiter route 404 NO_ACTIVE_ASSIGNMENT on first run. | DEC-12 — fixture seeds ACTIVE `StaffingOrderRecruiterAssignment` row. |
| `RISK-11` | E2E runner leaves dirty state on FAIL. | DEC-13 — OS temp + `finally`/`process.on('exit')` cleanup. |
| `RISK-12` | V1 verifier template section-list rejected V2 schema (V1 carry-forward). | Rev. 4 — TASK.md/HANDOFF.md aligned to the V1 canonical schema headings the verifier scripts hard-code (`## 5. Execution Plan`, `## 6. Acceptance`, `## 7. Risk`, `## 8. Open Questions`, `## 9. Planner Resolution`, `## 10. Revision Log`). |
| `RISK-13` | `next/font/google` build-time network fetch breaks GitHub CI and Vercel build sandboxes. | DEC-16 — banned via `font-google-ban.static.test.ts` regression guard; `next/font/local` self-hosted assets committed to `app/fonts/`. |
| `RISK-14` | Drift between shared `local-fonts.tsx` and bespoke Bod-page Google-font loader. | DEC-17 — `app/bod/page.tsx` imports from `@/app/fonts/local-fonts`; static test asserts that import path. |
| `RISK-15` | Untracked binary font assets orphaned or with broken provenance. | DEC-18 — committed into the semantic commit `b0d09582…`; `FONTS_PROVENANCE.txt` registry cross-checked by `EV-31`. |

## 8. Open Questions

NONE — all Owner decisions closed. T0 directive §B-01..§B-09 + §C + §Stop
boundary fully locks Đường B; no new Owner decision required; canonical main
architecture is the only authority (DEC-01..DEC-15 close all decisions).

## 9. Planner Resolution

- Round 1 (initial implementation) — 11 scripts in `scripts/runtime/`.
- Round 2 (cold-connect warmup fix) — observed step-1 `INVALID_CREDENTIALS` 401. Fix: `waitForBoot()` requires Prisma 200/404.
- Round 3 (T0 §F closure) — three P1 release blockers (BLK-02, BLK-03, BLK-04) closed. SSR fix, recruiter canonical flow, OS-temp cleanup. Verified by ×3 fresh runs.
- Round 4 (T0 pre-audit docs/control integrity correction) — TASK.md / HANDOFF.md aligned to the V1 canonical schema the verifier scripts still hard-code; stale `Final HEAD` pin replaced with the correct SHA trio (Implementation `708e0ce7…` / docs/evidence freeze `ae560725…` / prior docs/update HEAD `e09a5e2b…`); AUDIT.md deletion staged-deletion finalized; `EV-ATTEMPT-1-*` removed from working tree (failure already captured in TIER1_SELF_REVIEW.md). No semantic delta vs `708e0ce7…`.
- Round 5 (terminal control sync) — TASK.md §0 Status flipped from `READY_FOR_EXECUTION` to `READY_FOR_AUDIT` so HANDOFF.md and TASK.md agree before Tier 3 invocation.
- Round 6 (PR #73 build-blocker font hotfix) — post-audit release-integrity exception #1. Font hotfix commit `b0d09582`, docs/control freeze `6070f640`, EV-30 update `28aca457`. Status flipped to `READY_FOR_AUDIT` (next gate `TIER3_DELTA_AUDIT`). Tier 3 round-1 audit PASS evidence preserved as authoritative for unchanged P1 surface.
- Round 7 (post-merge formal closeout — current). PR #73 merged into `main` at `0179ef8b18045d1340028669871bc1db492da08d`. Post-merge CI Quality `SUCCESS`, Integration `SUCCESS`, Vercel deployment `SUCCESS — Deployment has completed`. Tier 3 LIGHT audit round 1 PASS adopted + Tier 3 DELTA audit round 2 PASS adopted. Recruiter end-to-end proof ×3 with zero residue. All four P1 release blockers (BLK-01..BLK-04) CLOSED/RESOLVED. Status flipped to `ACCEPTED`; Next gate = `NONE — MERGED; production migration/deploy deferred to the VPS release cutover`. P1 Thin Recruitment Value Slice = COMPLETE. Docs-only forward-only commit on top of merge SHA; no source, test, schema, migration, package, or font asset changes; no amend/reset/rebase/force-push; no Tier 3 recall; no production DB access. T0 owns production deployment at the VPS release cutover.

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial TASK.md authored. Status `READY_FOR_AUDIT`. | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B. |
| `v1.1` | `2026-10-01` | Status flipped to `BLOCKED`; `AUDIT.md` removed (T3-owned); SSR fix + recruiter canonical flow + OS-temp cleanup applied; DEC-09 SUPERSEDED; DEC-12/13/14 added; BLK-01..BLK-04 enumerated. | T0 §F rejections: 54 PASS + 6 HTTP 500 ≠ 60/60 business PASS; ADMIN fallback after HR_STAFF login forbidden; `docs/tasks/.tmp/` residue forbidden. |
| `v1.2` | `2026-10-01` | Step 15 payload fix: `clientAcknowledgedByUserId` switched from `adminUserId` (fixture ID shape `rt-e2e-TOKEN-ROLE`, not UUID v4) to `randomUUID()`. Server-side `z.string().refine(isUuidV4, …)` at the canonical recruiter effective-action route handler requires UUID v4; service-side `markPlacementEffective` stores it as opaque acknowledgement identifier (no FK to users). After schema pass, HRP_MANAGED still fails closed per DEC-07 → 400 `PLACEMENT_VALIDATION_ERROR`; step 16 cancel unaffected. | T0 §C.5 + Step 15 first-pass failure (see `EV-ATTEMPT-1-e2e.stderr`). |
| `v1.3` | `2026-10-01` | Stale `EV-RUN-1-*` evidence renamed to `EV-ATTEMPT-1-*` and EXCLUDED from final ×3 evidence. | T0 §B (×3 final runs must be PASS runs, not attempt runs). |
| `v1.4` | `2026-10-01` | Fresh `EV-RUN-1/2/3-*` ×3 PASS captured (20/20 steps, posture/fixture/e2e/teardown all `0`, residue `users=0/orders=0/slots=0/projects=0/companies=0` per run). Step 15 fail-closed contract confirmed (400 `PLACEMENT_VALIDATION_ERROR` "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). Step 17 HTTP 200 + run-scoped marker. Baseline gates PASS: `npx prisma validate`, `tsc --noEmit`, `eslint .`, `next build`, `vitest run --config vitest.unit.config.ts` (211/211 files, 3517 tests), `git diff --check`, `node verify-encoding.mjs` (12/12 files UTF-8 no BOM). Status flipped to `READY_FOR_AUDIT` after ×3 PASS. Implementation SHA pinned. | T0 §E + §F closure: 3 final runs PASS, all blockers + audit calls. |
| `v1.4` (rev. 5 — terminal control sync) | `2026-10-01 21:57 ICT` | Terminal control sync — TASK.md §0 Status flipped to `READY_FOR_AUDIT` (was `READY_FOR_EXECUTION`); AUDIT.md staged-deletion prose corrected to record that the deletion was committed at rev. 4 SHA `218bcbedb65a3f2d9b35cf57bb2f8f4d03151750`; Tier 3 will author a fresh AUDIT.md after this status flip. Docs-only commit; no semantic delta; runtime ×3 PASS evidence carry-forward from rev. 4. HANDOFF.md, source, tests, scripts, evidence runtime and SHA pins untouched. | T0 terminal control sync directive: TASK.md and HANDOFF.md must both report Status = READY_FOR_AUDIT before Tier 3 is invoked; rev. 5 closes that mismatch without touching HANDOFF.md or runtime evidence. |
| `v1.4` (rev. 4 — docs/control correction) | `2026-10-01 18:30 ICT` | T0 pre-audit docs/control integrity correction: TASK.md / HANDOFF.md aligned to the V1 canonical schema the verifier scripts hard-code; `## 5. Execution Plan`, `## 6. Acceptance`, `## 7. Risk`, `## 8. Open Questions`, `## 9. Planner Resolution`, `## 10. Revision Log` re-introduced; RQ-01..RQ-12 + RQ → STEP → AC traceability added; `In-scope roots` and `Required gates` rows added to `## 0. Control`; `Contract gate` cell reduced to exact `READY_TO_CODE`; stale `Final HEAD` SHA `ebc2c704…` removed; replaced with `Docs/evidence freeze SHA ae560725…` + `Prior docs/update HEAD e09a5e2b…` rows; `AUDIT.md` deletion finalized; `EV-ATTEMPT-1-*` working-tree artefacts removed. Spec version retained as `v1.4` because no semantic delta was introduced — this revision is docs/control-only per T0 §A.1. | T0 §A..§G corrections. Carry-forward from `v1.4` implementation + freeze is authoritative; verifier scripts still hard-code the V1 canonical schema, so docs/evidence must conform. |
| `v1.5` (rev. 6 — PR #73 build-blocker font hotfix) | `2026-10-01 22:30 ICT` (commit `b0d09582…`) | T0 post-audit release-integrity exception #1: removed every `next/font/google` production import (T0 §B-1); introduced `next/font/local` via shared loader `app/fonts/local-fonts.tsx` exporting `beVietnamPro` (`--font-bvp`, weights 400/500/600/700) and `inter` (`--font-inter`, single variable file); committed font assets to `app/fonts/` (4 BVP static TTF + 1 Inter variable TTF + 2 OFL license files + 1 provenance registry); removed Google Fonts `<link rel="preconnect">` tags; `app/bod/page.tsx` switched to shared root local-font loader; added static regression guard `src/shared/ui/font-google-ban.static.test.ts`; verified E-24..E-31 (font-ban 18/18, zero `next/font/google` imports, typecheck/lint/build/unit PASS, UTF-8/no-BOM scan 7/7, clean tree, provenance 7/7). Tier 3 round-1 PASS evidence preserved as authoritative for unchanged P1 surface; DELTA audit scope is strictly the font delta + docs. Status flipped to `READY_FOR_AUDIT` (next gate `TIER3_DELTA_AUDIT`); Audit eligibility `ELIGIBLE`; T0 post-audit release-integrity exceptions used = 1. Font-hotfix Implementation SHA `b0d095822780201c96715c27acb9d3396a20079e`. | T0 §A–§G post-audit release-integrity exception #1. `next/font/google` blocked CI + Vercel build; self-host fonts. No semantic delta to unchanged P1 runtime surface (`EV-32` impact proof). |
| `v1.5` (rev. 6 — docs/control freeze) | `2026-10-01 23:50 ICT` (commit `6070f640…`) | Docs/control freeze commit. Pins Font-hotfix Implementation SHA `b0d09582…`; preserves P1 Implementation SHA `708e0ce7…` as predecessor; records audit round-1 PASS applies to the unchanged P1 surface; flips Status → `READY_FOR_AUDIT`; Frozen delivery → `YES`; Canonical gates → `PASS`; Audit eligibility → `ELIGIBLE`; Next gate → `TIER3_DELTA_AUDIT`. Captured E-24..E-32 evidence logs and pinned them in `## 2. Evidence`. No semantic delta vs `b0d09582…`. Docs-only commit; no source code, no tests, no scripts, no `package.json`/`prisma` changes. | T0 §E.2 docs/evidence freeze discipline; rev. 6 closing this fork. |
| `v1.5` (rev. 6 — EV-30 live clean-tree) | `2026-10-01 23:55 ICT` (commit `28aca457…`) | EV-30 update — replaces the forward-looking clean-tree expectation with the live post-freeze state (working tree empty after `6070f640…`). Docs-only commit; no source code, no tests, no scripts. | EV-30 carries the live `git status --short` proof at handoff time. |
| `v1.6` (rev. 7 — post-merge formal closeout on main) | `2026-10-02` (this commit; on top of merge SHA `0179ef8b18045d1340028669871bc1db492da08d`) | T0 closeout directive 2026-10-02: PR #73 merged into `main` at `0179ef8b18045d1340028669871bc1db492da08d`; post-merge CI Quality `SUCCESS` + Integration `SUCCESS`; Vercel deployment `SUCCESS — Deployment has completed`; Tier 3 LIGHT audit round 1 PASS adopted (round-1 verdict preserved as authoritative for unchanged P1 surface); Tier 3 DELTA audit round 2 PASS adopted (font delta + docs/control); recruiter end-to-end proof ×3 with zero residue; all four P1 release blockers (BLK-01..BLK-04) CLOSED/RESOLVED; Spec version `v1.6`; Status `ACCEPTED`; Frozen `YES`; Canonical `PASS`; Audit eligibility `ELIGIBLE`; Next gate `NONE — MERGED; production migration/deploy deferred to the VPS release cutover`; Current execution round `7`; Current audit round `2`; Production DB / migration `NOT_RUN` (T0 owns production-side remediation). **P1 Thin Recruitment Value Slice = COMPLETE**; no P2/P3/P4/P5 work opened. Docs-only forward-only commit; no source, test, schema, migration, package, or font asset changes; no amend/reset/rebase/force-push; no Tier 3 recall; no production DB access. AUDIT.md not edited (T3-owned). | T0 closeout directive 2026-10-02 — P1 final formal closeout on main. |