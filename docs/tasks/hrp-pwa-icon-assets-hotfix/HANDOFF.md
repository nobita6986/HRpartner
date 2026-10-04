# HANDOFF — `hrp-pwa-icon-assets-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-pwa-icon-assets-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.2` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Execution round | `2` (correction 1/1) |
| Baseline | `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` |
| Superseded Implementation SHA (round 1 — missing-asset hotfix) | `6df991ad55d5c9c86e073e223eb0c367a8049a53` |
| Corrected Implementation SHA (round 2 — C-01 maskable safe zone) | `df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf` |
| Final docs HEAD | reported in post-commit T0 handback (see §11) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` (Audit mode NONE) |
| Correction batches used | `1` (of budget 1) |
| Status | `READY_FOR_REVIEW` |

> **Note on `Audit eligibility: NOT_REQUIRED` / `Status: READY_FOR_REVIEW`.**
> Tier 1 self-reviews and the task contract declares `Audit mode: NONE`, so
> no separate Tier 3 audit is requested. H-10/H-16 then pin the
> gate-compatible values: `READY_FOR_REVIEW` (T1 has reviewed and considers
> it ready for Owner handoff) and `Audit eligibility: NOT_REQUIRED`
> (no audit step exists to be eligible for). The substantive gate results
> (all PASS — see §3) are recorded in the evidence registry below.

## 1. Outcome and changed surface

### Round 2 (corrected) — current deliverable

- **Delivered (re-rendered):**
  - `public/icons/icon-192.png` — 192×192 PNG (8-bit RGBA), 1,462 bytes,
    SHA-256 `c47c1837711b218f3ba317457226a8f677554d1645006edb12bf0e292038fb44`.
    Logo mark only (no tagline), centered in inner 60% maskable safe zone.
    Padding 38px each side (115px inner). White background.
  - `public/icons/icon-512.png` — 512×512 PNG (8-bit RGBA), 6,100 bytes,
    SHA-256 `030c8929917008234345885945b9217012cb73890137f7bd0c08ac6877c35223`.
    Logo mark only (no tagline), centered in inner 60% maskable safe zone.
    Padding 102px each side (307px inner). White background.
  - `src/pwa/pwa-icons.test.ts` — vitest unit test (13 cases: original 9
    plus 4 new safe-zone composition assertions). Tests PNG decode +
    inner 60% invariant + corner white-background assertion for both sizes.
  - `docs/tasks/hrp-pwa-icon-assets-hotfix/evidence/c01-maskable-safe-zone.json`
    — C-02 evidence: asset source, crop bounds, padding/composition rule,
    manual-review note, SHA-256 + dimensions.

- **Brand source used:** `public/logo.png` (canonical 2300×2291 RGBA PNG,
  85,892 bytes, blue HRP monogram over white background, baseline SHA
  `ce77449a6e8cf96963fcdf27cf580096628a7ef9`). The corrected icons crop
  the source above the tagline zone (y=110..1729, tagline at y=1729..2185
  excluded) and down-scale the logo mark to fit the inner 60% safe zone.
  The blue matches `manifest.theme_color: #2563eb`; the white matches
  `manifest.background_color: #ffffff`.

- **C-01 maskable safe zone correction (T0 → T1C round 1/1):**
  - **Finding:** Manual visual review of the round-1 icons at
    `6df991ad55d5c9c86e073e223eb0c367a8049a53` confirmed both PNG files were
    valid but their content was not safe for `purpose: any maskable`. The
    tagline "VIỆC LÀM MIỀN BẮC" sat at the bottom edge of the canvas; the
    HRP star sat close to the top/right edge. Android circle/squircle masks
    on adaptive-icon devices could clip essential brand content.
  - **Resolution:** Re-rendered both icons with the HRP **logo mark only**
    (no tagline), centered in the inner 60% maskable safe zone per the W3C
    guidance and Android adaptive-icon strict-safe-zone rule. The approved
    HRP artwork is preserved without redrawing, without retyping text, and
    without distorting the logo mark's aspect ratio.

- **Not delivered (boundary):** No `manifest.json` semantic change, no
  `sw.js` semantic change, no dependency, no lockfile change, no
  `package.json` change, no schema, no migration, no auth, no UI logic,
  no UI2 work, no admin localization, no favicon/metadata change, no
  production deploy, no production-database touch.

- **Generator script:** A one-shot Node-only PNG generator
  (`generate-pwa-icons.mjs`) was used inside the worktree to produce the
  two PNGs. It is **not** in the index and **not** part of the deliverable.
  It used only Node built-ins (`fs`, `zlib`, `crypto`) plus a custom
  decoder + encoder; no third-party dependency, no `pngjs`, no `sharp`, no
  `canvas`. The script is untracked on disk (intentionally not committed).

- **Changed (4 files in round 2):**
  - **Modified (2):** `public/icons/icon-192.png`, `public/icons/icon-512.png`.
  - **Modified (1):** `src/pwa/pwa-icons.test.ts` (added 4 safe-zone tests).
  - **New (1):** `docs/tasks/hrp-pwa-icon-assets-hotfix/evidence/c01-maskable-safe-zone.json`.
  - **Modified (1):** `docs/tasks/hrp-pwa-icon-assets-hotfix/HANDOFF.md` (this file).

- **Lane escalation:** None. `FAST` is the original lane; the hotfix is
  self-contained (two PNGs + a static-fence test), so the lane stays
  `FAST` and Audit mode stays `NONE`.

### Round 1 (superseded) — historical reference

Round-1 (`6df991ad55d5c9c86e073e223eb0c367a8049a53`) shipped valid PNGs
but the artwork was not safe for `purpose: any maskable` (see C-01 above).
The round-1 SHA remains in the git history but is NOT the corrected
audit-target SHA.

### Self-review checklist (round 2)

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` → `RESULT: PASS`. All 11 required sections, A-01..T-09 OK. |
| API/route boundary | `N/A` | No API route touched. The two PNGs are static assets served by Next.js from `public/`. `manifest.json` and `sw.js` are read-only. |
| Auth/permission/data exposure | `N/A` | No auth, no API, no PII. The hotfix is two PNG files at well-known paths. |
| Migration/backfill/rollback | `N/A` | No migration, no DB. The hotfix is forward-only: `git revert` removes the two PNGs exactly as cleanly as it added them. |
| Concurrency/idempotency | `N/A` | Static assets. The PNGs are deterministic: same source + same Node encoder → identical bytes every build. |
| Test isolation and cleanup | `PASS` | `pwa-icons.test.ts` is a pure filesystem + JSON.parse + PNG-decode test with no shared state. The full unit suite is green (225 files / 3,727 passed, 9 skipped). |
| Worktree hygiene (C-03) | `PASS` | `pnpm-lock.yaml` and `pnpm-workspace.yaml` are NOT in the worktree (removed; never tracked by baseline). |
| SHA identity (C-04) | `PASS` | Corrected Implementation SHA pinned in §0; semantic diff after that SHA is empty. |
| Manifest / SW contract preserved | `PASS` | `public/manifest.json` still declares both icons with `purpose: any maskable`; `public/sw.js` still references `/icons/icon-192.png` for both `icon` and `badge`. |
| Brand asset source preserved | `PASS` | `git diff baseline..df87e7fd -- public/logo.png public/hrp-logo.webp` is empty. |

## 2. Acceptance evidence

The first row is `verify-task`. Each command is registered once as `E-xx`;
multiple AC share the same evidence row.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-pwa-icon-assets-hotfix/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` | `None` |
| `AC-01` | `public/icons/icon-192.png` | `node -e "const f=require('fs').readFileSync('public/icons/icon-192.png');console.log('size=',f.length)"` exits 0; output `size= 1462` (1,462 bytes). | `None` |
| `AC-02` | `public/icons/icon-192.png` | `node -e "const f=require('fs').readFileSync('public/icons/icon-192.png');console.log('sig=',f.slice(0,8).toString('hex'),'w=',f.readUInt32BE(16),'h=',f.readUInt32BE(20),'bitDepth=',f[24],'colorType=',f[25])"` exits 0; output `sig= 89504e470d0a1a0a w= 192 h= 192 bitDepth= 8 colorType= 6` (PNG signature, 192×192, 8-bit, RGBA). | `None` |
| `AC-03` | `public/icons/icon-512.png` | `node -e "const f=require('fs').readFileSync('public/icons/icon-512.png');console.log('size=',f.length)"` exits 0; output `size= 6100` (6,100 bytes). | `None` |
| `AC-04` | `public/icons/icon-512.png` | `node -e "const f=require('fs').readFileSync('public/icons/icon-512.png');console.log('sig=',f.slice(0,8).toString('hex'),'w=',f.readUInt32BE(16),'h=',f.readUInt32BE(20),'bitDepth=',f[24],'colorType=',f[25])"` exits 0; output `sig= 89504e470d0a1a0a w= 512 h= 512 bitDepth= 8 colorType= 6` (PNG signature, 512×512, 8-bit, RGBA). | `None` |
| `AC-05` | `E-01` | `pwa-icons.test.ts` parses `public/manifest.json` and asserts each declared entry has `sizes: "192x192"` / `"512x512"`, `type: "image/png"`, `purpose` includes `maskable`. | `None` |
| `AC-06` | `E-02` | `pwa-icons.test.ts` greps `public/sw.js` and finds `icon: '/icons/icon-192.png'` and `badge: '/icons/icon-192.png'` in the `showNotification` call. | `None` |
| `AC-07` | `E-03` | The test cases in `E-01` and `E-02` fail loudly when a referenced icon path is missing. The `expect(existsSync(p)).toBe(true)` and `expect(width).toBe(192)` assertions report a clear failure message. | `None` |
| `AC-08` | `E-04` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` exits 0; `Test Files 1 passed (1) · Tests 13 passed (13)`. | `None` |
| `AC-09` | `E-05` | Full unit suite: `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts` exits 0; `Test Files 225 passed (225) · Tests 3727 passed | 9 skipped (3736) · Duration 103.59s`. | `None` |
| `AC-10` | `E-06` | `git diff --check --cached` exits 0 with no output; `git diff --check HEAD` exits 0 with no output. | `None` |
| `AC-11` | `E-07` | `node .ai-pipeline/scripts/verify-encoding.mjs` → `RESULT: PASS (3 changed text file(s), strict UTF-8 without BOM).` | `None` |
| `AC-12` | `E-08` | `git diff f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1..df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf -- public/logo.png public/hrp-logo.webp` outputs nothing (both files byte-identical to baseline). | `None` |
| `AC-13` | `E-09` | `git status --porcelain -- package.json` outputs nothing. `pnpm-lock.yaml` and `pnpm-workspace.yaml` were never tracked by the baseline (`git ls-tree f570db06 -- pnpm-lock.yaml pnpm-workspace.yaml` returns empty). Per C-03 they were removed from this worktree (untracked only). | `None` |
| `AC-14` | `E-10` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` outputs nothing. | `None` |
| `AC-15` | `E-11` | `git status --porcelain` over the TASK forbidden paths is empty for all of them. `git log --format=%s HEAD` shows no `deploy` / `migrate` / `prisma` / `db push` token. No shell commands against production were issued. | `None` |
| `AC-16` | `E-12` | Corrected Implementation SHA recorded in §0 (`df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf`) matches `git rev-parse HEAD` immediately after the correction commit. Subsequent commits are docs-only. | `None` |

## 3. Evidence registry

Short logs are inline; long output, live transcripts or images go in
`docs/tasks/<slug>/evidence/`.

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` | `Test Files 1 passed (1) · Tests 13 passed (13) · Duration ~700ms` (round-2: 9 original + 4 safe-zone composition) | inline |
| `E-02` | same as `E-01` — the sw.js + manifest assertions are inside the same test file, so a single `vitest run` covers `E-01`, `E-02`, and `E-03`. | included in `E-01` | inline |
| `E-03` | The assertions in `E-01` / `E-02` are themselves the regression-failure proof. They use `expect(existsSync(p)).toBe(true)` and `expect(width).toBe(192)`, which fail with a clear message if the icon is missing, the file is a fake PNG, or the IHDR dimensions drift. The 4 new safe-zone tests (decodeRgba + measureSafeZone) fail loudly if the brand-mark content bleeds into the outer 40% at-risk region. | covered by `E-01` | inline |
| `E-04` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` | `Test Files 1 passed (1) · Tests 13 passed (13) · Duration ~700ms` | inline |
| `E-05` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts` (full unit suite) | `Test Files 225 passed (225) · Tests 3727 passed | 9 skipped (3736) · Duration 103.59s` | inline |
| `E-06` | `git diff --check --cached` ; `git diff --check HEAD` | both exit 0 with no output | inline |
| `E-07` | `node .ai-pipeline/scripts/verify-encoding.mjs` | `RESULT: PASS (3 changed text file(s), strict UTF-8 without BOM).` | inline |
| `E-08` | `git diff f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1..df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf -- public/logo.png public/hrp-logo.webp` | empty output | inline |
| `E-09` | `git status --porcelain -- package.json` | empty. `pnpm-lock.yaml` and `pnpm-workspace.yaml` were removed from this worktree (per C-03) and were never tracked by the baseline (`git ls-tree f570db06 -- pnpm-lock.yaml pnpm-workspace.yaml` returns empty). | inline |
| `E-10` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` | empty | inline |
| `E-11` | `git status --porcelain` over the TASK forbidden paths (`prisma/**`, `app/**`, `src/domains/**`, `src/shared/auth/**`, `src/lib/**`, `next.config.*`, `public/hrp-logo.webp`, `public/logo.png`, `public/mockup/**`, `scripts/**`, `.github/**`) | all empty | inline |
| `E-12` | `git rev-parse HEAD` | 40-char hex SHA equal to the Corrected Implementation SHA recorded in §0 (`df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf`) immediately after the correction commit. Subsequent commits are docs-only. | inline |
| `E-13` | `node node_modules/next/dist/bin/next build` | exit 0; all routes built; `/icons/icon-192.png` and `/icons/icon-512.png` are served by Next.js from `public/` with the corrected bytes | inline |
| `E-14` | SHA-256 verified on both PNGs (re-checked 2026-10-04 post-correction). `node -e "const c=require('crypto');console.log(c.createHash('sha256').update(require('fs').readFileSync('public/icons/icon-192.png')).digest('hex'))"` prints `c47c1837711b218f3ba317457226a8f677554d1645006edb12bf0e292038fb44`. Same for icon-512.png prints `030c8929917008234345885945b9217012cb73890137f7bd0c08ac6877c35223`. | matches §1 SHA-256 records | inline |
| `E-15` | `docs/tasks/hrp-pwa-icon-assets-hotfix/evidence/c01-maskable-safe-zone.json` | written and committed; contains asset source, crop bounds, padding/composition rule, manual-review note, SHA-256 + dimensions. | `evidence/c01-maskable-safe-zone.json` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-01` | T0 → T1C correction batch 1/1 (round 2) | T0 review of round-1 icons at `6df991ad55d5c9c86e073e223eb0c367a8049a53` flagged C-01: artwork not safe for `purpose: any maskable` (tagline and star too close to edges). T1C re-rendered both PNGs with logo mark only, centered in inner 60% safe zone, and added 4 safe-zone composition tests. Round-1 SHA `6df991ad55d5c9c86e073e223eb0c367a8049a53` is superseded; corrected Implementation SHA is `df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf`. 1/1 correction budget consumed. CI re-run awaited. | RESOLVED |
| `DEV-02` | C-03 worktree hygiene | `pnpm-lock.yaml` and `pnpm-workspace.yaml` were untracked in the worktree (never committed by baseline). They were removed from this worktree per C-03 and are NOT touched in any other checkout. | RESOLVED |
| `DEV-03` | Round-1 implementation SHA pinning | The `Implementation SHA: 6df991ad...` value in the round-1 HANDOFF was the implementation commit. After correction, the HANDOFF §0 now pins `Corrected Implementation SHA: df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf` and labels the round-1 SHA as superseded historical. AC-16 verification updated to point at the corrected SHA. | RESOLVED |
| `DEV-04` | pnpm vs npm | pnpm attempts to relocate `node_modules` to `.ignored/` on first invocation, breaking nested scope resolution. Round-1 fix: switched to `npm` for gate invocations and direct `node node_modules/vitest/vitest.mjs`. Round-2: same approach. Not a code change. | Worktree-local tooling effect |

`prisma generate` was run once inside the worktree to populate
`node_modules/.pnpm/.../default.js` (a generated client artifact, not part
of the repo tree). This is a transient build step: it does not change
`prisma/schema.prisma`, does not run any migration, and does not touch the
production database. The repo's `prisma/migrations/**` is byte-identical to
the baseline.

## 5. Final status

`READY_FOR_REVIEW` (Tier 1 self-review; Audit mode `NONE` per task contract).

- **Corrected Implementation SHA is pinned in §0** as
  `df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf` and equals `git rev-parse HEAD`
  immediately after the correction commit. Subsequent commits are docs-only.
- **Round-1 SHA `6df991ad55d5c9c86e073e223eb0c367a8049a53` is superseded
  historical** — it remains in the git history but is NOT the corrected
  audit-target SHA.
- **Branch state:** `git status --porcelain` after the correction commit is
  empty on the declared paths. `pnpm-lock.yaml` and `pnpm-workspace.yaml`
  are not in the worktree (per C-03). Working tree is clean.
- **Production untouched:** No production deploy, no production-database
  touch, no production-credential load, no merge, no deploy. The branch is
  pushed and a PR is opened into `main`; CI is awaited on the new HEAD;
  Tier 1 stops here and waits for T0 to decide merge/deploy.
- **PR URL:** https://github.com/nobita6986/HRpartner/pull/95
- **Post-merge, T0 will verify on production:**
  - `GET /icons/icon-192.png` → `200 image/png` with SHA-256
    `c47c1837711b218f3ba317457226a8f677554d1645006edb12bf0e292038fb44`
  - `GET /icons/icon-512.png` → `200 image/png` with SHA-256
    `030c8929917008234345885945b9217012cb73890137f7bd0c08ac6877c35223`
  - `/manifest.json` no longer reports an icon download error
  - the browser console no longer reports PWA icon warnings
  - Android adaptive-icon devices render the logo mark centered with no
    content clipped by circle/squircle masks

> Handoff status: `READY_FOR_REVIEW`

## 11. SHA identity summary (round 2)

| SHA | Role | Source |
|---|---|---|
| `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` | Baseline (origin/main, pre-hotfix) | recorded in §0 |
| `6df991ad55d5c9c86e073e223eb0c367a8049a53` | Round-1 superseded implementation (original hotfix; C-01 failed manual review) | git history |
| `df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf` | **Corrected Implementation SHA** (round-2 forward-only correction commit; C-01+C-02+C-03+C-04) | git history, pinned in §0 |
| Final docs HEAD | reported in post-commit T0 handback (subsequent to `df87e7fd` are docs/evidence-only commits, do not change audit-target SHA) | post-commit |

**AC-16 invariant measurement (verified post-correction):**

```text
- Corrected Implementation SHA `df87e7fdf8cda4e3d2ebcbb9df0034aa34370dbf` exists (git rev-parse verifies)
- semantic diff after `df87e7fd` over app/src/prisma/tests/scripts/packages = empty
- Final HEAD is reported in the post-commit T0 handback (separate from this §11 row)
```
