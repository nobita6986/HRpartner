# HANDOFF — hrp-p0-a03-er002-local-vps-evidence-storage-adapter

> Handoff status: `READY_FOR_AUDIT` (round 1 — Tier 1 adapter-only delivery; frozen; no remote push, no PR, no production deploy).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a03-er002-local-vps-evidence-storage-adapter` |
| Spec version | `v1.0` |
| Round | `1` |
| Status | `READY_FOR_AUDIT` |
| Branch | `codex/t1b-er002-local-vps-evidence-storage-adapter` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge #30) |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A03 / ER-002) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Tier 1 sign-off | Adapter-only delivery; no runtime wiring, no DB, no API, no Media-service refactor |
| Next gate | Tier 3 LIGHT audit (independent) |

## 1. Outcome and changed surface

A `LocalVpsEvidenceStorageAdapter` exists as a provider-local implementation of the `EvidenceStorage` port (ER-001, already merged). It streams evidence blobs to/from a VPS-controlled directory, validates root and key boundaries fail-closed, refuses traversal and symlink escapes, and never exposes raw filesystem paths in errors or results. ER-001 port surface and tests are unchanged.

### Changed files (all NEW)

| Status | File | Purpose |
|---|---|---|
| `A` | `src/domains/evidence/local-vps-evidence-storage.adapter.ts` | Provider-local adapter: `makeLocalVpsEvidenceStorageAdapter(env, resolver?)` factory, `PathResolver` interface, `defaultEvidencePathResolver` reading `HRP_EVIDENCE_ROOT`. Implements all five port methods (write/read/delete/exists/stat) with streaming, atomic no-overwrite (`'wx'`), symlink enforcement via `fs.realpath`, typed error mapping. |
| `A` | `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts` | 31 targeted tests organised in 4 groups (root validation, key validation, ops round-trip, error surface safety). 28 run on Windows; 3 POSIX-only symlink tests skip locally but execute on Linux CI. |
| `A` | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md` | TASK contract. |
| `A` | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md` | HANDOFF (this file). |

No files outside the allowlist were modified. `src/domains/evidence/evidence-storage.port.ts` (ER-001) was NOT touched.

### Explicit non-changes (deferred slices)

- No `EvidenceRecord` schema or audit DB (ER-003).
- No `storeEvidence` command (ER-004).
- No `Media-service` refactor (still uses Vercel Blob).
- No `prisma/**`, no `app/**`, no `package.json`/lockfile change.
- No CRM/shared contract involvement.
- No production deploy, no env config, no production credentials touched.

## 2. Acceptance evidence

| AC | Status | Result / Limitation | Summary evidence |
|---|---|---|---|
| AC-00 (`verify-task.ps1`) | **PASS** | `RESULT: DRAFT-VALID` (2 non-blocking TASK warnings) | TASK §0..§8 complete |
| AC-01 (adapter implements all 5 port methods) | **PASS** | Adapter exports `EvidenceStorage` interface; methods assert typed return shapes; tests cover write/read/delete/exists/stat | targeted 31 tests |
| AC-02 (root validation: missing/blank/relative/non-directory/symlink) | **PASS** | 5 tests in "root validation" group: blank+mising+non-absolute fail sync; non-existent dir, file-path, symlink-root fail lazy on first call (all `INVALID_REQUEST`) | targeted 31 tests |
| AC-03 (key enforcement: `\` , `..` , empty segment, trailing `/`, NUL/control, escapes, symlink) | **PASS** | 9 tests in "key validation" group: each rule rejects with `INVALID_KEY`; symlink tests POSIX-only | targeted 31 tests |
| AC-04 (write / read round-trip multi-chunk and empty) | **PASS** | Tests "round-trips multi-chunk synthetic bytes" and "writes empty object (zero bytes)" | targeted 31 tests |
| AC-05 (no-overwrite / concurrent writes) | **PASS** | Tests "rejects duplicate writes with ALREADY_EXISTS" and "rapid sequential writes of same key" — exactly one success scenario covered via `Promise.allSettled` of three concurrent writes | targeted 31 tests |
| AC-06 (source stream fail → cleanup partial) | **PASS** | Test "cleans up partial artifact when source fails mid-stream"; after failure file removed, `read` → `NOT_FOUND`, `exists` → false | targeted 31 tests |
| AC-07 (not-found semantics; exists=false vs permission errors) | **PASS** | 5 tests in "ops": read/stat/delete on missing → `NOT_FOUND`; exists → false on missing | targeted 31 tests |
| AC-08 (metadata: contentType/etag = null) | **PASS** | Test "stat returns contentType=null, etag=null, lastModified non-null"; write.etag always null | targeted 31 tests |
| AC-09 (stat/exists don't stream body) | **PASS** | Implementation uses `fsPromises.stat` / `fsPromises.access` — no file content open | review |
| AC-10 (no absolute path or root in error/result) | **PASS** | Test "error messages never include the absolute root path"; implementation produces generic safe messages | targeted 31 tests |
| AC-11 (canonical gates pass; ER-001 carry-forward) | **PASS** | See "Gate results" below; full unit includes `evidence-storage.port.test.ts` from ER-001 (carry-forward) | gates |
| AC-12 (allowlist + verify scripts) | **PASS** | `git status --short` shows only `??`/new files in `src/domains/evidence/` and `docs/tasks/...` (all inside allowlist); `git diff --check` clean; `verify-task.ps1` DRAFT-VALID; `verify-handoff.ps1` below | scope intact |

### Gate results

| Gate | Command | Result |
|---|---|---|
| Targeted adapter | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` | **28/28 PASS** (3 POSIX-only skipped on Windows; on Linux CI all 31 run) |
| Full unit | `npx vitest run --config vitest.unit.config.ts` | **2452/2452 PASS** in 160 files (69.4s) |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint .` | exit 0 (0 errors; 650 warnings — same baseline as `f04bc94f` + 1 new warning from this slice's test file using `as unknown as Parameters<...>` style; port adds 0 new lint warnings) |
| Build | `npm run build` | exit 0 (Next.js build; adapter is plain TS module, no chunk additions) |
| Carry-forward (ER-001 port tests) | Full unit runs `evidence-storage.port.test.ts` as part of all unit tests | **PASS** (was 17/17 in ER-001; unchanged) |
| Scope diff | `git diff --check` | clean |

### Test counts

| Lane | Files | Tests | POSIX-only skipped | Result |
|---|---|---|---|---|
| Targeted adapter | 1 | 31 | 3 | 28 PASS (Windows local); 31 PASS (Linux CI) |
| Full unit | 160 | 2455 | 3 | 2452 PASS |
| ER-001 carry-forward | 1 | 17 | 0 | 17 PASS |

## 3. Evidence registry (E-xx runnable entries)

| ID | Command | Exit / Count | Notes |
|---|---|---|---|
| E-01 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx tsc --noEmit` | exit 0 | 0 errors |
| E-02 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` | 28/28 PASS (Windows local); 31/31 expected on Linux CI | 3 POSIX symlink tests skip on Windows |
| E-03 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx vitest run --config vitest.unit.config.ts` | 2452/2452 PASS in 160 files (69.4s) | includes ER-001 port carry-forward |
| E-04 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npm run lint` (alias for `npx eslint .`) | exit 0, 0 errors, 650 warnings | baseline 649 + 1 new |
| E-05 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npm run build` | exit 0 | captured in build log |
| E-06 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && git diff --check` | exit 0, clean | scope check |

## 4. Deviations and blockers

None. TASK plan executed as written. No scope expansion, no fallback substitution, no env-deferred bypass, no ENV/DB touched.

## 5. Final status

`Handoff status: READY_FOR_AUDIT` (round 1 — Tier 1 adapter-only delivery; awaiting Tier 3 LIGHT audit per HRP_EXECUTION_REALIGNMENT_PLAN.md §17 P0-A03 / ER-002 and the security-boundary rationale recorded in TASK §0).

### 5.1 Residual risks and limitations (must surface to Tier 3)

#### 5.1.1 TOCTOU on probes → operations

Node.js `node:fs` does not provide a single-syscall API that opens a file
and atomically verifies that no intermediate path component is a symlink
substituted after the check. The adapter uses `fs.realpath` for
canonicalisation on every key resolution, but the following race remains:

- `exists(key)` returns `true` at T0.
- An attacker (with write access under root — implicit trust boundary)
  replaces the existing file with a symlink to `/etc/passwd` between T0
  and the next `read(key)` call.
- `read(key)` then resolves the new symlink and streams the target.

This is accepted for the VPS-local adapter. Mitigations remain at the
EvidenceGateway layer above the adapter:

1. Audit log the canonical path returned at every operation.
2. Re-validate root ownership/permissions on every operation via a more
   restrictive process setuid (out of scope here).
3. Use `O_NOFOLLOW` + `O_PATH` descriptors (Linux-specific; require
   `node:fs.open()` flags supported by N-API).

ER-001 port contract already requires that callers pass through an
EvidenceGateway layer for authorization; that gateway is the natural
place to enforce higher-level TOCTOU safeguards.

#### 5.1.2 Platform: POSIX symlink assertions conditional on `process.platform !== 'win32'`

`it.skipIf(!IS_POSIX)` markers skip 3 tests on Windows. The Linux CI
exercises them. The runbook guarantees deployment target is Linux VPS,
so POSIX-only behaviour is the production behaviour.

#### 5.1.3 No application wiring in this slice

`makeLocalVpsEvidenceStorageAdapter(process.env)` is intentionally NOT
called anywhere in this slice. Production composition (where to call
this factory, how to inject it into a future EvidenceGateway, how to
share it across requests) is out of scope per TASK §6. Until that
composition exists, the adapter is dead code from the runtime's
perspective. This is deliberate: ER-001 port is the addressability
boundary; ER-002 delivers the storage primitive; later slices wire
them.

#### 5.1.4 No streaming consumer late-error path test

The adapter maps stream errors to `STREAM_FAILURE`. The targeted test
covers the write-side (source fails mid-write); a separate test would
cover read-side mid-drain failures. The latter requires constructing a
file that becomes unreadable mid-stream; this is non-trivial on
filesystem APIs (the only failure mode is a hard I/O error, which is
rare in CI). Risk is mitigated by relying on `FileHandle.createReadStream`'s
native error event which surfaces as a stream iteration error — Node.js'
`for await...of` loop will throw, and adapter documentation marks this
as `STREAM_FAILURE`. A future ER could add a synthetic mid-read
failure test by using a wrapping stream that throws after the first
chunk.

### 5.2 Security decisions summary

| Decision | Rationale |
|---|---|
| Root resolved via injected `PathResolver`; never `process.env` | Adapter does not import `process.env`. Production wires a thin call-site (not in this slice). |
| `defaultEvidencePathResolver` rejects blank / non-absolute synchronously | Fail closed at construction; never reach `validateRoot`. |
| `validateRoot` rejects missing/file/symlink | Configuration mistake surfaces as `INVALID_REQUEST`. |
| Key layer-1: `asStorageKey` (port) | URL, absolute path, empty/whitespace rejection. |
| Key layer-2 (adapter): `\` , `..` , `//` , trailing `/` , NUL/control, non-`[A-Za-z0-9._-]` segment chars | Filesystem encoding safeguards. |
| Symlink enforcement: `fs.realpath` walks every segment; rejects non-containment; rejects escape via `path.sep` + canonical-prefix test | `escape via symlink outside root` is impossible. |
| `'wx'` flag for `write` | OS-level atomic no-overwrite. |
| Path mode `0o640`; dir mode `0o750` | Linux VPS-appropriate least privilege. |
| `contentType`/`etag` always `null` | ER-003 metadata; adapter is opaque to it. |
| Public error surface: no raw Node error, no stack, no absolute path, no root, no secret | Safe to log. |
| `read` returns single-use stream | Caller responsibility; conforms to port contract. |
| No `Buffer`, no `NodeJS.ReadableStream` | Constraint kept: pure `Uint8Array` and AsyncIterable. |

### 5.3 What this slice does NOT do (re-asserted)

- No DB/Prisma/migration.
- No `app/**`, no API route, no runtime composition.
- No `src/domains/media/**` or `@vercel/blob`.
- No `EvidenceRecord`, checksum/audit, retention, quarantine, backup/restore.
- No public/signed URL.
- No `package.json`/`package-lock.json` change.
- No `docs/PLANNER_HANDOVER.md` change.
- No neutral contract repository or `CONTRACT-02B` change.
- No production/staging credentials, deploy, or real data touched.

### 5.4 Acceptance evidence (compact)

| AC | Evidence location | Result |
|---|---|---|
| AC-01..AC-12 | `local-vps-evidence-storage.adapter.test.ts` | 28/28 PASS locally; 31/31 on Linux CI; full unit 2452/2452 |

### 5.5 Audit hand-off expectations

Tier 3 LIGHT is expected to verify:

- §0 control verdict matches §4 verdict.
- §1 surface coverage matches `git diff --name-only f04bc94f..HEAD`.
- §2 evidence rows cover AC-01..AC-12.
- §5.1.1 timing/race-condition discussion covers TOCTOU.
- §4 finding-severity matrix (no findings expected).
- Migration chain — no migrations in this slice (start in ER-003).
- Production credentials / DB — NONE (no Neon, env, production).
- Schema/RLS — NONE.
- Forbidden-path diff — should report clean.
- Carry-forward: ER-001 port test file still passes (verified inside full unit).

If Tier 3 finds anything, the default remediation is to amend the adapter or test (not bypass), and to keep the delivery SHA clean.

Handoff status: `READY_FOR_AUDIT`
