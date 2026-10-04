# TASK — `hrp-pwa-icon-assets-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-pwa-icon-assets-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `FAST + missing-asset hotfix; no schema/auth/PII/contract surface; Tier 1 self-reviews per tier1.md. NONE chosen because the only delivery surface is two binary PNG files at well-known paths plus a static-fence test; no API/permission/contract/data blast radius.` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `public/icons/**`; `public/manifest.json`; `public/sw.js`; `src/pwa/pwa-icons.test.ts`; `docs/tasks/hrp-pwa-icon-assets-hotfix/**` |
| Forbidden paths | `prisma/schema.prisma`; `prisma/migrations/**`; `app/**`; `src/domains/**`; `src/shared/auth/**`; `src/lib/**`; `next.config.*`; `package.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `public/hrp-logo.webp`; `public/logo.png`; `public/mockup/**`; `scripts/**`; `.github/**` |
| Required gates | `pwsh .ai-pipeline/scripts/verify-pipeline.ps1`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts`; `pnpm exec vitest run --config vitest.unit.config.ts` (full unit suite, carry-forward evidence acceptable) |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

> Lane is `FAST`: a single missing-asset hotfix on the PWA install + push-notification
> surface. No schema, no auth, no migration, no UI logic, no dependency.
> Per `tier1.md` "FAST" defaults to `Audit mode: NONE`; Tier 1 self-reviews at
> handoff and does not call Tier 3.

## 1. Outcome

### 1.1 User-visible outcome

After this hotfix:

- `GET /icons/icon-192.png` returns `200` with `Content-Type: image/png` and a
  valid 192×192 PNG.
- `GET /icons/icon-512.png` returns `200` with `Content-Type: image/png` and a
  valid 512×512 PNG.
- The browser console no longer reports `Failed to load resource: 404` for
  either icon path.
- The browser no longer reports `Error while trying to use the following icon
  from the Manifest` or `resource isn't a valid image`.
- The Worker PWA `install` flow resolves all manifest icons successfully; the
  push notification handler can render its `icon` and `badge` fields.

### 1.2 Non-goals

- No favicon, no brand redesign, no logo retouch, no copy/translation changes.
- No `manifest.json` semantic change (the existing `icons` array, `theme_color`,
  `background_color`, `start_url`, `display`, and `purpose` are already correct).
- No service-worker caching/offline/notification-logic change.
- No schema/migration/database/auth/RLS/lifecycle/role change.
- No dependency or lockfile change (no `pngjs`, no `sharp`, no `canvas`).
- No raw HTML/CSS/script authoring; no UI2 work; no JobPosting work;
  no admin-portal localization work.
- No production deploy and no production-database touch.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `git ls-tree -r origin/main -- public/ \| grep -E 'logo\|icon'` shows `public/hrp-logo.webp` and `public/logo.png`, and `public/icons/` is absent. | Confirms the brand-asset source and the gap. |
| `EV-02` | `node -e "const f=require('fs').readFileSync('public/logo.png');console.log(f.slice(0,8).toString('hex'),f.readUInt32BE(16),f.readUInt32BE(20),f.length)"` prints the PNG signature, 2300×2291 dims, and 85892 bytes. | Confirms `public/logo.png` is a valid 2300×2291 PNG; this is the brand source we will down-scale into the icons. |
| `EV-03` | `public/manifest.json` declares the two icon paths, sizes, types, and `purpose: "any maskable"`. `public/sw.js` references `/icons/icon-192.png` as `icon` and `badge` for `showNotification`. | Confirms the exact contract the icons must satisfy. |
| `EV-04` | Final-tree `git status --porcelain` is clean on the two declared paths; the only changes are the two new PNGs, the new test file, the TASK.md, and the HANDOFF.md. | Confirms no semantic-delta outside the in-scope roots. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Generate both icons from the existing brand asset `public/logo.png` (a 2300×2291 PNG monogram) — no redrawing, no retyping, no new brand asset. | `CHOSEN` |
| `DEC-02` | Encode the icons as real PNGs using Node's built-in `zlib` + manual chunk writer, no new dependency. | `CHOSEN` |
| `DEC-03` | Square canvas, white background (`#ffffff`, matching `manifest.background_color`), centered logo, safe-zone padding of 20% on each side so the inner 60% of the icon contains the brand mark. This satisfies the W3C `maskable` safe-zone guidance (the inner 80% is the visible area on platforms that apply a circular/squircle mask; the inner 60% is the strict safe area). | `CHOSEN` |
| `DEC-04` | `manifest.json` and `sw.js` are unchanged — their existing contract is already correct. | `CHOSEN` |
| `DEC-05` | Test lives in `src/pwa/pwa-icons.test.ts` (covered by the unit lane glob in `vitest.unit.config.ts`); it reads both icon files and `public/manifest.json` + `public/sw.js` from disk and asserts the contract with Node `Buffer` only. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| PNG encoding | candidate libraries: `pngjs`, `sharp`, `canvas`; Node built-in `zlib` + manual chunk writer | `N/A` | N/A | N/A | N/A | The icon generator is a one-shot build-time operation, not a runtime capability. The Node `zlib` + manual-chunk approach is short, dependency-free, and the entire generator is removed from the deliverable (it runs in the worktree only to produce the two PNGs; the script itself is not shipped). |

- `N/A`: the task does not add a runtime capability or a shared dependency.

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Icon generation | none | `N/A` | N/A | N/A | N/A | N/A | This is a one-shot hotfix; the script is a build-time helper that runs once in the worktree and is not part of the shipped product. |

- `N/A`: the task does not introduce a connector, scheduler, notification worker,
  or multi-system workflow.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `public/icons/icon-192.png` is a real PNG file whose dimensions are exactly 192×192 px. |
| `RQ-02` | `public/icons/icon-512.png` is a real PNG file whose dimensions are exactly 512×512 px. |
| `RQ-03` | Both PNGs start with the canonical 8-byte PNG signature `89 50 4E 47 0D 0A 1A 0A`. |
| `RQ-04` | Both PNGs have a valid IHDR chunk declaring `width`, `height`, `bit depth = 8`, `color type = 6 (RGBA)`. |
| `RQ-05` | Both PNGs are visually derived from the existing `public/logo.png` brand asset — the inner safe zone (central 60% of the canvas) contains the recognizable HRP monogram on a white background. No new logo, no retyped text, no re-colored background. |
| `RQ-06` | `public/manifest.json` continues to declare the two icon paths with `sizes: "192x192"` and `"512x512"`, `type: "image/png"`, and `purpose: "any maskable"`. The file is otherwise unchanged from the baseline commit. |
| `RQ-07` | `public/sw.js` continues to reference `/icons/icon-192.png` as both `icon` and `badge` in the `push` notification handler. The file is otherwise unchanged from the baseline commit. |
| `RQ-08` | A new test `src/pwa/pwa-icons.test.ts` reads the two PNGs from disk and validates RQ-01..RQ-04 + RQ-06 + RQ-07. The test fails if either icon is missing, has a corrupted PNG signature, has the wrong IHDR dimensions, or if `manifest.json` / `sw.js` ever change to reference a missing icon path. |

### 4.2 Scope boundaries

- **In:**
  - `public/icons/icon-192.png` (new).
  - `public/icons/icon-512.png` (new).
  - `src/pwa/pwa-icons.test.ts` (new).
  - `docs/tasks/hrp-pwa-icon-assets-hotfix/TASK.md` (this file).
  - `docs/tasks/hrp-pwa-icon-assets-hotfix/HANDOFF.md` (new).
- **Out:**
  - `public/manifest.json` and `public/sw.js` are read-only in this task; they
    already declare the correct contract. If either needed a real change it
    would be a separate decision (`DEC-04`) — this hotfix does not introduce
    such a change.
  - `public/logo.png` and `public/hrp-logo.webp` are read-only brand sources.
  - The icon-generator script (Node one-shot) is **not** committed; it lives
    only in the worktree to produce the two PNGs and is deleted after the
    PNGs are written and verified.
- **Allowed task artifacts:** `docs/tasks/hrp-pwa-icon-assets-hotfix/**`.

### 4.3 Domain boundaries

- **Data/state:** `N/A — no schema, no persistence, no DB touch.`
- **Permission/security:** `N/A — no auth, no API, no RLS.`
- **Interface/API:** `N/A — no new API route. The two PNGs are static assets
  served by Next.js from `public/`.`
- **Migration/rollback:** `N/A — no migration. The hotfix is forward-only:
  the new PNGs either exist or they don't. Reverting the commit removes them
  exactly as cleanly as it added them.`

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Worktree at baseline `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` | Confirm the hotfix starts from a clean, fresh `origin/main` worktree. | `git log -1 --format=%H` prints the baseline SHA; `git status --porcelain` is empty. | Mismatch with baseline, or working tree dirty on declared paths. |
| `STEP-02` | `public/icons/icon-512.png` (write first so the 192 can be a fast down-scaled version) | Render a 512×512 real PNG derived from `public/logo.png` with the safe-zone layout. | `node -e "const f=require('fs').readFileSync('public/icons/icon-512.png');console.log(f.slice(0,8).toString('hex'),f.readUInt32BE(16),f.readUInt32BE(20),f.length)"` prints the PNG signature, 512, 512, and a reasonable byte size (>1 KB). | PNG signature wrong, dimensions wrong, or zero bytes. |
| `STEP-03` | `public/icons/icon-192.png` | Render a 192×192 real PNG with the same layout, down-scaled from the same source. | Same `node -e` check prints the PNG signature, 192, 192, and a reasonable byte size. | Same as STEP-02. |
| `STEP-04` | `src/pwa/pwa-icons.test.ts` (new) | Static-fence test that reads both icons + `manifest.json` + `sw.js` from disk and asserts RQ-01..RQ-04, RQ-06, RQ-07. | `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` exits 0. | Any PNG check fails, manifest/sw.js reference a missing path, or `sizes`/`type`/`purpose` drift from the declared contract. |
| `STEP-05` | Self-review | Run whitespace check over the staged surface and HEAD, run the encoding verifier over changed text files, run the full unit suite, then re-run the targeted test. | Whitespace check is silent; encoding verifier reports `0 BOM, 0 invalid UTF-8`; full unit suite is green. | Whitespace warning, BOM, or any test failure. |
| `STEP-06` | Commit forward-only on `codex/t1c-pwa-icon-assets-hotfix`; pin exact `Implementation SHA`. | Freeze the surface; produce HANDOFF.md. | `git rev-parse HEAD` resolves to a 40-char hex SHA recorded in HANDOFF.md; `git status --porcelain` is empty after commit. | SHA mismatch with the HANDOFF record, or post-commit dirty tree. |
| `STEP-07` | HANDOFF.md + canonical gates | `pwsh .ai-pipeline/scripts/verify-pipeline.ps1`; `pwsh .ai-pipeline/scripts/verify-task.ps1`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1`; `node .ai-pipeline/scripts/verify-encoding.mjs` all PASS. | All four gates report `RESULT: PASS`. | Any gate FAIL. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `public/icons/icon-192.png` exists and is a real PNG. | `Test-Path` (Node `fs.existsSync`) + first 8 bytes match the PNG signature. |
| `AC-02` | `public/icons/icon-192.png` has IHDR width 192, height 192, bit depth 8, color type 6 (RGBA). | Node `Buffer` reads bytes 16..25 of the file. |
| `AC-03` | `public/icons/icon-512.png` exists and is a real PNG. | Node `fs.existsSync` followed by first 8 bytes compared to `89 50 4E 47 0D 0A 1A 0A` (assertion inside `vitest pwa-icons.test.ts`). |
| `AC-04` | `public/icons/icon-512.png` has IHDR width 512, height 512, bit depth 8, color type 6 (RGBA). | Node `Buffer` reads bytes 16..25 of the file (assertion inside `vitest pwa-icons.test.ts`). |
| `AC-05` | `public/manifest.json` still declares `/icons/icon-192.png` with `sizes: "192x192"`, `type: "image/png"`, and a purpose string that includes `maskable`; same for `/icons/icon-512.png` with `sizes: "512x512"`. | `vitest pwa-icons.test.ts` parses the file and asserts each field. |
| `AC-06` | `public/sw.js` references `/icons/icon-192.png` for both `icon` and `badge` in the `push` handler, and both referenced paths exist on disk. | `vitest pwa-icons.test.ts` greps the file and `fs.existsSync` each path. |
| `AC-07` | The test fails if any of AC-01..AC-06 ever regresses (the assertions are the contract). | Manually delete one icon and re-run the test; the test reports the failure. |
| `AC-08` | `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/pwa-icons.test.ts` exits 0. | Run the command. |
| `AC-09` | `pnpm exec vitest run --config vitest.unit.config.ts` (full unit suite) remains green at the implementation SHA. | Run the command. |
| `AC-10` | Whitespace check on the staged surface and on HEAD is silent (no whitespace-only warnings). | Verification: `git diff --check --cached` and `git diff --check HEAD` both exit 0 with no output. |
| `AC-11` | `node .ai-pipeline/scripts/verify-encoding.mjs` reports `0 BOM, 0 invalid UTF-8` over the changed text surface. | Run the command. |
| `AC-12` | `public/logo.png` and `public/hrp-logo.webp` are byte-identical to the baseline commit (no brand-asset change). | `git diff <baseline>..HEAD -- public/logo.png public/hrp-logo.webp` outputs nothing. |
| `AC-13` | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` are unchanged. | `git status --porcelain` over those three files outputs nothing. |
| `AC-14` | `prisma/schema.prisma` and `prisma/migrations/**` are unchanged. | Same as AC-13. |
| `AC-15` | No production-DB / production-deploy / production-credential touch. The branch is pushed but **not** merged; CI is awaited but no merge/deploy decision is taken by this task. | Self-attested in HANDOFF §5; the actual command-level proof is `git status --porcelain` over the forbidden paths in the TASK control table (all empty) plus `git log --format=%s HEAD` which contains no `deploy`/`migrate`/`prisma`/`db push` token. |
| `AC-16` | Implementation SHA is recorded in HANDOFF.md and `git rev-parse HEAD` matches it. | `git rev-parse HEAD` returns the SHA recorded in `HANDOFF.md` §0. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-03` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02` | `AC-03`, `AC-04` |
| `RQ-03` | `STEP-02`, `STEP-03` | `AC-01`, `AC-03` |
| `RQ-04` | `STEP-02`, `STEP-03` | `AC-02`, `AC-04` |
| `RQ-05` | `STEP-02`, `STEP-03`, `STEP-04` | `AC-12`, `AC-07` |
| `RQ-06` | `STEP-04` | `AC-05` |
| `RQ-07` | `STEP-04` | `AC-06` |
| `RQ-08` | `STEP-04` | `AC-07`, `AC-08` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | A future change re-introduces the missing-asset gap (deletes the icons, edits `manifest.json` to point at a non-existent path, edits `sw.js` to use a different icon path). | The static-fence test (`STEP-04`, `AC-05..AC-07`) fails loudly on any such drift; CI catches it before merge. |
| `RISK-02` | The 60% safe-zone choice might still crop the monogram on a platform that applies an aggressive mask. | Both PNGs are square and the inner 80% contains the full monogram (safe-zone 20% padding on each side, 60% inner strict); `purpose: "any maskable"` is the W3C-defined intent for "visible on any mask shape". If a future platform applies a stricter mask, the icon is still legible because the HRP monogram is geometric and high-contrast. |
| `RISK-03` | The Node-only PNG encoder might produce a file the browser rejects. | Encoder follows the PNG spec (RFC 2083): canonical signature, IHDR, IDAT with deflate-compressed scanlines prefixed by filter byte 0, IEND. The IHDR width/height/bit-depth/color-type match the test's expectations. The full unit suite remains green at the implementation SHA. |
| `RISK-04` | The hotfix is the only thing this PR carries, so a CI failure unrelated to the icons blocks the PWA fix. | Branch is pushed and PR is opened; CI is awaited; if the only failure is on `src/pwa/pwa-icons.test.ts`, the corrected test is the only change in the correction batch. The `Correction budget: 1` is reserved for exactly this. |

## 8. Open Questions

- None. The contract is fully specified: missing-asset hotfix, no surface
  beyond the two PNGs and the static-fence test, no dependency, no schema,
  no API, no UI logic, no production touch.

## 9. Planner Resolution

Tier 1 appends after review/audit. Audit `NONE` resolves directly from HANDOFF;
`LIGHT` resolves from AUDIT.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-04` | Initial contract | Initial |
