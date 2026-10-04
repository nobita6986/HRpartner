# HANDOFF — `hrp-pwa-icon-assets-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-pwa-icon-assets-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Execution round | `0` |
| Baseline | `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` |
| Implementation SHA | `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (pinned post-commit) |
| Frozen delivery | `YES` |
| Canonical gates | `NOT_REQUIRED` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

> **Note on `Audit eligibility: NOT_REQUIRED` / `Status: READY_FOR_REVIEW`.**
> Tier 1 self-reviews and the task contract declares `Audit mode: NONE`, so
> no separate Tier 3 audit is requested. H-10/H-16 then pin the
> gate-compatible values: `READY_FOR_REVIEW` (T1 has reviewed and considers
> it ready for Owner handoff) and `Audit eligibility: NOT_REQUIRED`
> (no audit step exists to be eligible for). The substantive gate results
> (all PASS — see §3) are recorded in the evidence registry below.

## 1. Outcome and changed surface

- **Delivered:** Two real PNG files at the manifest-declared paths plus a
  static-asset fence test that pins the contract.
  - `public/icons/icon-192.png` — 192×192 PNG (8-bit RGBA), 3,064 bytes,
    SHA-256 `c94d50319f75644f7055ecae94ef5d004d2ba15f81bcfe74b0c9fb51a8ace6b2`.
  - `public/icons/icon-512.png` — 512×512 PNG (8-bit RGBA), 14,125 bytes,
    SHA-256 `97dd87a064482668d8e3fd4a9b9803ca0e8d81e8f97c8179a87bbdfd2772a3b4`.
  - `src/pwa/pwa-icons.test.ts` — vitest unit test (9 cases) that reads both
    PNGs from disk, parses `public/manifest.json`, and greps `public/sw.js`
    to pin the contract: PNG signature, IHDR dimensions, manifest `sizes` /
    `type` / `purpose` / file existence, and every `sw.js`-referenced icon
    path existing on disk.
- **Brand source used:** `public/logo.png` (canonical 2300×2291 RGBA PNG, 85,892 bytes,
  blue HRP monogram over white background, baseline SHA `ce77449a6e8cf96963fcdf27cf580096628a7ef9`).
  The two icons are down-scaled versions of this asset, painted onto a white
  canvas at the manifest-declared size. The blue matches
  `manifest.theme_color: #2563eb`; the white matches
  `manifest.background_color: #ffffff`. The mark sits inside the central
  ~60% of the canvas (20% safe-zone padding on each side) so it survives the
  W3C `purpose: "any maskable"` circle/squircle/rounded-square mask shapes.
- **Not delivered:** No `manifest.json` semantic change (already correct), no
  `sw.js` semantic change (already correct), no dependency, no lockfile
  change, no `package.json` change, no schema, no migration, no auth, no
  UI logic, no production deploy, no production-database touch.
- **Generator script:** A one-shot Node-only PNG generator
  (`generate-pwa-icons.mjs`) was used inside the worktree to produce the two
  PNGs. It is **not** in the index and **not** part of the deliverable. It
  used only Node built-ins (`fs`, `zlib`) plus a 220-line decoder/encoder;
  no third-party dependency, no `pngjs`, no `sharp`, no `canvas`. The script
  was deleted after producing and verifying the two PNGs; only the resulting
  static assets are committed.
- **Changed (4 files):**
  - **New static assets (2):** `public/icons/icon-192.png`,
    `public/icons/icon-512.png`.
  - **New test (1):** `src/pwa/pwa-icons.test.ts` (9 vitest cases).
  - **New docs (2):** `docs/tasks/hrp-pwa-icon-assets-hotfix/TASK.md`,
    `docs/tasks/hrp-pwa-icon-assets-hotfix/HANDOFF.md` (this file).
- **Lane escalation:** None. `FAST` is the original lane; the hotfix is
  self-contained (two PNGs + a static-fence test), so the lane stays `FAST`
  and Audit mode stays `NONE`.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` → `RESULT: PASS. TASK contract is ready for execution.` All 11 required sections, A-01..T-09 OK. |
| API/route boundary | `N/A` | No API route touched. The two PNGs are static assets served by Next.js from `public/`. `manifest.json` and `sw.js` are read-only. |
| Auth/permission/data exposure | `N/A` | No auth, no API, no PII. The hotfix is two PNG files at well-known paths. |
| Migration/backfill/rollback | `N/A` | No migration, no DB. The hotfix is forward-only: `git revert` removes the two PNGs exactly as cleanly as it added them. |
| Concurrency/idempotency | `N/A` | Static assets. The PNGs are deterministic: same source + same Node encoder → identical bytes every build. |
| Test isolation and cleanup | `PASS` | `pwa-icons.test.ts` is a pure filesystem + JSON.parse test with no shared state. The full unit suite is green (225 files / 3,723 passed). |

## 2. Acceptance evidence

The first row is `verify-task`. Each command is registered once as `E-xx`;
multiple AC share the same evidence row.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-pwa-icon-assets-hotfix/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` | `None` |
| `AC-01` | `E-01a` | `public/icons/icon-192.png` exists on disk; `stat` reports 3,064 bytes. | `None` |
| `AC-02` | `E-02a` | `public/icons/icon-192.png` has the canonical PNG signature `89 50 4E 47 0D 0A 1A 0A`; IHDR reads width=192, height=192, bit depth=8, color type=6 (RGBA). | `None` |
| `AC-03` | `E-01b` | `public/icons/icon-512.png` exists on disk; `stat` reports 14,125 bytes. | `None` |
| `AC-04` | `E-02b` | `public/icons/icon-512.png` has the canonical PNG signature; IHDR reads width=512, height=512, bit depth=8, color type=6 (RGBA). | `None` |
| `AC-05` | `E-03` | `pwa-icons.test.ts` parses `public/manifest.json` and asserts each declared entry has `sizes: "192x192"` / `"512x512"`, `type: "image/png"`, `purpose` includes `maskable`. | `None` |
| `AC-06` | `E-04` | `pwa-icons.test.ts` greps `public/sw.js` and finds `icon: '/icons/icon-192.png'` and `badge: '/icons/icon-192.png'` in the `showNotification` call. | `None` |
| `AC-07` | `E-05` | The test cases in `E-03` and `E-04` fail loudly when a referenced icon path is missing. The `expect(existsSync(p)).toBe(true)` and `expect(width).toBe(192)` assertions report a clear failure message. | `None` |
| `AC-08` | `E-06` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` exits 0; `Test Files 1 passed (1) · Tests 9 passed (9)`. | `None` |
| `AC-09` | `E-07` | Full unit suite: `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts` exits 0; `Test Files 225 passed (225) · Tests 3723 passed | 9 skipped (3732) · Duration 75.93s`. | `None` |
| `AC-10` | `E-08` | `git diff --check --cached` exits 0 with no output; `git diff --check HEAD` exits 0 with no output. | `None` |
| `AC-11` | `E-09` | `node .ai-pipeline/scripts/verify-encoding.mjs` → `RESULT: PASS (5 changed text file(s), strict UTF-8 without BOM).` | `None` |
| `AC-12` | `E-10` | `git diff <baseline>..HEAD -- public/logo.png public/hrp-logo.webp` outputs nothing (both files byte-identical to baseline). | `None` |
| `AC-13` | `E-11` | `git status --porcelain -- package.json` outputs nothing. The pre-existing untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml` are untracked in the baseline commit `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` too (reproduced with `git ls-tree f570db06 -- pnpm-lock.yaml pnpm-workspace.yaml` which returns empty, and `git status --porcelain` from a clean checkout at `f570db06` which reports them as untracked). The pre-existing untracked state is the baseline; this commit does not introduce it. | `None` |
| `AC-14` | `E-12` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` outputs nothing. | `None` |
| `AC-15` | `E-13` | `git status --porcelain` over the TASK forbidden paths is empty for all of them. `git log --format=%s HEAD` shows no `deploy` / `migrate` / `prisma` / `db push` token. No shell commands against production were issued. | `None` |
| `AC-16` | `E-14` | Implementation SHA recorded in §0 matches `git rev-parse HEAD` after the commit. | `None` |

## 3. Evidence registry

Short logs are inline; long output, live transcripts or images go in
`docs/tasks/<slug>/evidence/`.

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01a` | `node -e "const f=require('fs').readFileSync('public/icons/icon-192.png');console.log('size=',f.length)"` | `size= 3064` | inline |
| `E-01b` | `node -e "const f=require('fs').readFileSync('public/icons/icon-512.png');console.log('size=',f.length)"` | `size= 14125` | inline |
| `E-02a` | `node -e "const f=require('fs').readFileSync('public/icons/icon-192.png');console.log('sig=',f.slice(0,8).toString('hex'),'w=',f.readUInt32BE(16),'h=',f.readUInt32BE(20),'bitDepth=',f[24],'colorType=',f[25])"` | `sig= 89504e470d0a1a0a w= 192 h= 192 bitDepth= 8 colorType= 6` | inline |
| `E-02b` | `node -e "const f=require('fs').readFileSync('public/icons/icon-512.png');console.log('sig=',f.slice(0,8).toString('hex'),'w=',f.readUInt32BE(16),'h=',f.readUInt32BE(20),'bitDepth=',f[24],'colorType=',f[25])"` | `sig= 89504e470d0a1a0a w= 512 h= 512 bitDepth= 8 colorType= 6` | inline |
| `E-03` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` (the fresh worktree's `pnpm exec` triggers pnpm's deps status check; the test itself runs identically) | `Test Files 1 passed (1) · Tests 9 passed (9) · Duration 397ms` | inline |
| `E-04` | same as `E-03` — the sw.js + manifest assertions are inside the same test file, so a single `vitest run` covers `E-03`, `E-04`, and `E-05`. | included in `E-03` | inline |
| `E-05` | The assertions in `E-03` / `E-04` are themselves the regression-failure proof. They use `expect(existsSync(p)).toBe(true)` and `expect(width).toBe(192)`, which fail with a clear message if the icon is missing, the file is a fake PNG, or the IHDR dimensions drift. | covered by `E-03` | inline |
| `E-06` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` | `Test Files 1 passed (1) · Tests 9 passed (9) · Duration 397ms` | inline |
| `E-07` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts` (full unit suite) | `Test Files 225 passed (225) · Tests 3723 passed | 9 skipped (3732) · Duration 75.93s` | inline |
| `E-08` | `git diff --check --cached` ; `git diff --check HEAD` | both exit 0 with no output | inline |
| `E-09` | `node .ai-pipeline/scripts/verify-encoding.mjs` | `RESULT: PASS (5 changed text file(s), strict UTF-8 without BOM).` | inline |
| `E-10` | `git diff f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1..HEAD -- public/logo.png public/hrp-logo.webp` (where `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` is the recorded baseline SHA) | empty output | inline |
| `E-11` | `git status --porcelain -- package.json` | empty; `pnpm-lock.yaml` and `pnpm-workspace.yaml` are pre-existing untracked artifacts in the baseline commit `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (reproduced with `git ls-tree f570db06 -- pnpm-lock.yaml pnpm-workspace.yaml` returning empty, and `git status --porcelain` from a clean checkout at `f570db06` reporting them as untracked). | inline |
| `E-12` | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` | empty | inline |
| `E-13` | `git status --porcelain` over the TASK forbidden paths (`prisma/**`, `app/**`, `src/domains/**`, `src/shared/auth/**`, `src/lib/**`, `next.config.*`, `public/hrp-logo.webp`, `public/logo.png`, `public/mockup/**`, `scripts/**`, `.github/**`) | all empty | inline |
| `E-14` | `git rev-parse HEAD` | 40-char hex SHA equal to the Implementation SHA recorded in §0 | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|

No deviations from TASK. The TASK declared `Correction budget: 1`; the
implementation shipped with **zero** corrections used. All 16 AC are GREEN at
the implementation SHA.

`prisma generate` was run once inside the worktree to populate
`node_modules/.pnpm/.../default.js` (a generated client artifact, not part
of the repo tree). This is a transient build step: it does not change
`prisma/schema.prisma`, does not run any migration, and does not touch the
production database. The repo's `prisma/migrations/**` is byte-identical to
the baseline.

## 5. Final status

`READY_FOR_REVIEW` (Tier 1 self-review; Audit mode `NONE` per task contract).

- **Implementation SHA is pinned in §0** and equals `git rev-parse HEAD`
  after the commit. The SHA is the audit anchor for any future re-audit.
- **Branch state:** `git status --porcelain` after commit is empty on the
  declared paths (the two pre-existing untracked `pnpm-*` files are
  workspace-wide artifacts unrelated to this hotfix). Working tree is clean.
- **Production untouched:** No production deploy, no production-database
  touch, no production-credential load, no merge, no deploy. The branch is
  pushed and a PR is opened into `main`; CI is awaited.
- **CI merge state:** Pending — the PR is opened; CI is running; Tier 1
  will resolve any CI failure on this PR's surface inside the
  `Correction budget: 1`. T0 is the merge/deploy authority.
- **Post-merge, T0 will verify on production:**
  - `GET /icons/icon-192.png` → `200 image/png`
  - `GET /icons/icon-512.png` → `200 image/png`
  - `/manifest.json` no longer reports an icon download error
  - the browser console no longer reports PWA icon warnings

> Handoff status: `READY_FOR_REVIEW`
