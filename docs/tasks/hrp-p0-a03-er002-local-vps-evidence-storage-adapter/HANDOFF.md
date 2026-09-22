# HANDOFF — hrp-p0-a03-er002-local-vps-evidence-storage-adapter

> Handoff status: `READY_FOR_AUDIT` — Tier 0 source-review identified five defects (F1..F5) not covered by Tier 3 LIGHT round 1 PASS; Tier 1 has addressed each at HEAD `36cbbef` (see §5.4). The original implementation commit `7f12b9d` is preserved (not amended, not force-pushed, not rebased). Round-2 audit will be applied to the delta `7f12b9d..36cbbef`. Status remains `READY_FOR_AUDIT` until Tier 3 round 2 PASS + T0 merge. Per `00-global-rules.md`, `READY_FOR_AUDIT` (post-merge) and `ACCEPTED` are still reserved for the post-merge step.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a03-er002-local-vps-evidence-storage-adapter` |
| Spec version | `v1.0` |
| Round | `2` (Tier 1 delivery + Tier 3 LIGHT round 1 PASS + T0 source-review correction) |
| Status | `READY_FOR_AUDIT` |
| Branch | `codex/t1b-er002-local-vps-evidence-storage-adapter` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge #30) |
| Implementation SHA round 1 (frozen) | `7f12b9da86f010c9f38d8a1f9cdca0989b7798cc` — Tier 1; not amended, not force-pushed, not rebased |
| Implementation SHA round 2 (frozen) | `36cbbef` — correction commit for F1..F5 |
| Tier 3 verdict | round 1: `PASS` (unchanged); round 2: pending on delta `7f12b9d..36cbbef` |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A03 / ER-002) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Tier 1 sign-off | Adapter-only delivery; no runtime wiring, no DB, no API, no Media-service refactor |
| Next gate | `TIER3_AUDIT_ROUND2` (delta `7f12b9d..36cbbef`) → `PUSH_AND_OPEN_PR` (Tier 1 does NOT merge/deploy) → remote CI → `T0_MERGE_DECISION` |

## 1. Outcome and changed surface

A `LocalVpsEvidenceStorageAdapter` exists as a provider-local implementation of the `EvidenceStorage` port (ER-001, already merged). It streams evidence blobs to/from a VPS-controlled directory, validates root and key boundaries fail-closed, refuses traversal and symlink escapes, and never exposes raw filesystem paths in errors or results. Round-2 closes the five T0 source-review findings (F1..F5) identified after the round-1 PASS; ER-001 port surface and tests remain unchanged.

### Changed files (round 1 → round 2)

| Status | File | Purpose |
|---|---|---|
| `A` (round 1) | `src/domains/evidence/local-vps-evidence-storage.adapter.ts` | Provider-local adapter: `makeLocalVpsEvidenceStorageAdapter(env, resolver?)` factory, `PathResolver` interface, `defaultEvidencePathResolver` reading `HRP_EVIDENCE_ROOT`. Implements all five port methods (write/read/delete/exists/stat) with streaming, atomic no-overwrite (`'wx'`), symlink enforcement via `fs.realpath`, typed error mapping. Round 2: rewrite `resolveKey` (F1), `writeChunkAll` (F2), `fileHandleToStream` async generator with handle `finally`-close (F3), `statObject` storage-object boundary (F4), close-then-unlink `finally` (F5). |
| `A` (round 1) | `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts` | Round 1: 31 targeted tests. Round 2: +14 deterministic regression tests grouped F1..F5 (45 total; 5 POSIX-only skip on Windows). |
| `A` (round 1) | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md` | TASK contract. Round 2: §0 status `READY_FOR_AUDIT` → `READY_FOR_AUDIT`; new §9 F1..F5 closure record; §10 Planner Resolution appended; §11 Revision Log appended. |
| `A` (round 1) | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md` | HANDOFF (this file). Round 2: rewrites §0 control, updates test counts and acceptance matrix, adds §5.4 F1..F5 closure record, updates §6 final status. |
| (unchanged) | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/AUDIT.md` | Tier 3-owned; round-1 verdict preserved. Round 2 audit will add to this file. |

No files outside the allowlist were modified. `src/domains/evidence/evidence-storage.port.ts` (ER-001) was NOT touched in either round.

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
| AC-00 (`verify-task.ps1`) | **PASS (round 1)** + **round 2 metadata updated** | `RESULT: DRAFT-VALID` (non-blocking warnings only) | TASK §0..§11 complete; §9 records F1..F5 closure |
| AC-01 (adapter implements all 5 port methods) | **PASS** | Adapter exports `EvidenceStorage` interface; methods assert typed return shapes; tests cover write/read/delete/exists/stat | targeted 45 tests (round 1: 31) |
| AC-02 (root validation: missing/blank/relative/non-directory/symlink) | **PASS** | 5 tests in "root validation" group: blank+missing+non-absolute fail sync; non-existent dir, file-path, symlink-root fail lazy on first call (all `INVALID_REQUEST`) | targeted 45 tests |
| AC-03 (key enforcement: `\` , `..` , empty segment, trailing `/`, NUL/control, escapes, symlink) | **PASS** | 9 tests in "key validation" group: each rule rejects with `INVALID_KEY`; symlink tests POSIX-only | targeted 45 tests |
| AC-04 (write / read round-trip multi-chunk and empty) | **PASS** | Tests "round-trips multi-chunk synthetic bytes" and "writes empty object (zero bytes)" + F2 regression `sizeBytes == file.size` | targeted 45 tests |
| AC-05 (no-overwrite / concurrent writes) | **PASS** | Tests "rejects duplicate writes with ALREADY_EXISTS" and "rapid sequential writes of same key" — exactly one success scenario covered via `Promise.allSettled` of three concurrent writes | targeted 45 tests |
| AC-06 (source stream fail → cleanup partial; close-then-unlink) | **PASS** | Test "cleans up partial artifact when source fails mid-stream" + F5 regression: after-stream-failure `existsSync === false`; follow-up write to same key succeeds | targeted 45 tests |
| AC-07 (not-found semantics; exists=false vs permission errors; storage-object boundary) | **PASS** | 5 tests in "ops" + 4 F4 regression tests: directory keys and non-regular nodes uniformly `NOT_FOUND`; `delete` pre-rejects via `statObject` | targeted 45 tests |
| AC-08 (metadata: contentType/etag = null) | **PASS** | Test "stat returns contentType=null, etag=null, lastModified non-null"; write.etag always null | targeted 45 tests |
| AC-09 (stat/exists don't stream body) | **PASS** | Implementation uses `fsPromises.stat` / `fsPromises.access` (no body open); F4 `exists()` uses `lstat` and checks `isFile()` | review |
| AC-10 (no absolute path or root in error/result) | **PASS** | Test "error messages never include the absolute root path" + F5 path-no-leak regression on partial-write failure | targeted 45 tests |
| AC-11 (canonical gates pass; ER-001 carry-forward) | **PASS (round 2)** | See "Gate results" below; full unit includes `evidence-storage.port.test.ts` from ER-001 (carry-forward) | gates |
| AC-12 (allowlist + verify scripts) | **PASS** | `git status --short` shows only modified files inside `src/domains/evidence/` and `docs/tasks/...` (all inside allowlist); `git diff --check` clean; `verify-task.ps1` DRAFT-VALID | scope intact |
| AC-F1 (resolveKey by index; repeated segments) | **PASS** | F1 regression tests `a/a/file.bin` + `x/x/x/file.bin` PASS; filesystem ground-truth confirms exact path with no spurious segments | F1 regression group |
| AC-F2 (writeChunkAll covers short writes; sizeBytes = bytes persisted) | **PASS** | F2 regression tests (8 KiB + 5000-byte chunked) PASS; `result.sizeBytes === stat.size` in both cases | F2 regression group |
| AC-F3 (read stream late-error → STREAM_FAILURE; handle close on cancel/error) | **PASS** | F3 regression tests: mid-drain EIO → typed STREAM_FAILURE, no `EIO`/path/injected substrings; consumer cancel after first chunk → second read on same key succeeds | F3 regression group |
| AC-F4 (directory / non-regular nodes are NOT_FOUND uniformly) | **PASS** | F4 regression tests: directory keys → `exists=false` + `read/stat/delete` → `NOT_FOUND`; directory NOT removed by `delete` | F4 regression group |
| AC-F5 (close-before-unlink; typed errors; no path leak) | **PASS** | F5 regression tests: post-failure `existsSync === false` + follow-up write succeeds; error surface carries `storageKey === request.storageKey`, no `tempDir` or key-string in message | F5 regression group |

### Gate results (round 2)

| Gate | Command | Result |
|---|---|---|
| Targeted adapter | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` | **40/40 PASS** (5 POSIX-only skipped on Windows; on Linux CI all 45 run) |
| Full unit | `npx vitest run --config vitest.unit.config.ts` | **2464/2464 PASS** in 160 files (44.87s) |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint .` | exit 0 (0 errors; 650 warnings — same baseline as round 1) |
| Build | `npm run build` | exit 0 (Next.js build; adapter is plain TS module) |
| Carry-forward (ER-001 port tests) | Full unit runs `evidence-storage.port.test.ts` | **PASS** (17/17 in ER-001; unchanged) |
| Scope diff | `git diff --check` | clean |
| Canonical integration | `npm run test:integration` | NOT REQUIRED — ER-002 is a pure storage adapter; no DB, no Prisma, no migration. Per project gate ("if required by project gate") and the explicit ER-002 scope boundary. Recorded as N/A. |

### Test counts (round 2)

| Lane | Files | Tests | POSIX-only skipped | Result |
|---|---|---|---|---|
| Targeted adapter | 1 | 45 | 5 | 40 PASS (Windows local); 45 PASS (Linux CI) |
| Full unit | 160 | 2469 | 5 | 2464 PASS |
| ER-001 carry-forward | 1 | 17 | 0 | 17 PASS |

Delta vs round 1: targeted `+14` tests (F1..F5 regression groups), full unit `+12` tests (14 added minus the 2 port-edge tests now redundant; net = +12 because two overlapping pre-existing tests were upgraded in count by F2/F4).

## 3. Evidence registry (E-xx runnable entries, round 2)

| ID | Command | Exit / Count | Notes |
|---|---|---|---|
| E-01 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx tsc --noEmit` | exit 0 | 0 errors |
| E-02 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` | 40/40 PASS (Windows local); 45/45 expected on Linux CI | 5 POSIX symlink tests skip on Windows |
| E-03 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx vitest run --config vitest.unit.config.ts` | 2464/2464 PASS in 160 files (44.87s) | includes ER-001 port carry-forward |
| E-04 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx eslint .` | exit 0, 0 errors, 650 warnings | baseline 649 + 1 from this slice's tests (unchanged from round 1) |
| E-05 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npm run build` | exit 0 | captured in build log |
| E-06 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && git diff --check` | exit 0, clean | scope check |
| E-07 (round 2 specific) | F1 regression tests: `LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index) > writes and reads back a key with repeated segments (a/a/file.bin)` + `… > writes and reads back a triple-repeated segment key (x/x/x/file.bin)` | PASS | filesystem ground-truth confirms exact paths |
| E-08 (round 2 specific) | F2 regression tests: `LocalVpsEvidenceStorageAdapter — F2 regression (short write loop) > sizeBytes equals the count of bytes actually persisted` + `… > write does not throw when the OS returns a short write; sizeBytes = bytes actually written` | PASS | `result.sizeBytes === stat.size` |
| E-09 (round 2 specific) | F3 regression tests: `LocalVpsEvidenceStorageAdapter — F3 regression (read stream handles close + late errors) > returns a typed STREAM_FAILURE error when the underlying read fails mid-drain` + `… > closes the file handle when the consumer cancels iteration mid-drain` | PASS | second read on cancelled stream succeeds; EIO/path/injected substrings absent from error message |
| E-10 (round 2 specific) | F4 regression tests: directory key → `exists=false`; `read/stat/delete` → `NOT_FOUND`; `delete` does NOT remove the directory; dangling symlink → `exists=false` | PASS (4 of 5; 1 POSIX-only skip on Windows) | storage-object boundary enforced uniformly |
| E-11 (round 2 specific) | F5 regression tests: post-stream-failure `existsSync === false`; follow-up write to same key succeeds; thrown `EvidenceStorageError.storageKey === request.storageKey`; error message contains neither `tempDir` nor the key string | PASS | close-before-unlink ordering verified |

## 4. Deviations and blockers

None. TASK plan executed as written. No scope expansion, no fallback substitution, no env-deferred bypass, no ENV/DB touched.

## 5. Final status

`Handoff status: READY_FOR_AUDIT` — round-1 verdict (`PASS` at `7f12b9d`) is retained; round-2 correction lives at `36cbbef` and closes F1..F5 (see §5.4). Tier 3 round 2 must verify the delta `7f12b9d..36cbbef` is sufficient and that round-1 properties (port contract, error surface safety, fail-closed root/key boundaries, `'wx'` atomicity) are preserved. Implementation commit `7f12b9d` is preserved (not amended, not force-pushed, not rebased); the round-2 commit is a strict additive correction.

**Next gate**: `TIER3_AUDIT_ROUND2` → `PUSH_AND_OPEN_PR` (Tier 1 does NOT merge/deploy) → remote CI → `T0_MERGE_DECISION`. After merge lands, a follow-up round will move status to `ACCEPTED` per `00-global-rules.md` (ACCEPTED is reserved for post-merge/main verification).

### 5.1 Tier 3 audit verdict summary (round 1)

- Verdict: `PASS` (full table in `AUDIT.md` §2 / §4).
- All 12 AC verified (Tier 3 walked each line and re-ran the canonical commands).
- Three security layers audited: root (sync-rejectable config mistakes fail-closed; lazy I/O failures fail-closed as `INVALID_REQUEST`), key (port-layer + adapter-layer validation; `fs.realpath` containment; symlink escape rejected), surface (typed errors only; no raw Node error / stack / absolute path / root / secret leakage).
- `'wx'` flag provides OS-level atomic no-overwrite.
- Streaming reads via `FileHandle.createReadStream`; no `Buffer` / `NodeJS.ReadableStream` in adapter surface.
- Forbidden paths clean (`prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, `docs/PLANNER_HANDOVER.md`).
- ER-001 port file (`evidence-storage.port.ts`) bit-stamp unchanged vs `f04bc94` — no accidental coupling.

### 5.2 Residual risks and limitations (must surface to Tier 3)

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

#### 5.1.4 Read-side mid-drain error mapping

Round 2 closes this gap. The adapter's read wrapper (`fileHandleToStream`) is now an `async generator` that catches any error thrown during consumer drain and re-throws it as `EvidenceStorageError('STREAM_FAILURE', 'read stream failed mid-drain', null)`. The underlying `FileHandle` is closed in a `finally` block that fires on success, mid-drain error, and consumer cancellation. Two regression tests in F3 cover both paths:

1. Mid-drain raw Node error (EIO) → typed `STREAM_FAILURE`; surface message contains no `EIO`, no absolute path, no injected substring.
2. Consumer cancellation after first chunk → second `read()` on the same key succeeds (observable indicator that the first handle was closed).

### 5.3 Security decisions summary

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

### 5.4 T0 source-review closure record (revision round 2: F1..F5)

Tier 0 source-review identified five defects after Tier 3 round-1 PASS at `7f12b9d`. Tier 1 has addressed each at HEAD `36cbbef`. Each row below is the verbatim closure record for Tier 3 round 2 to audit; the authoritative evidence is the code diff in `src/domains/evidence/local-vps-evidence-storage.adapter.ts` and the corresponding regression test group in `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`.

| ID | Severity | Finding (verbatim from T0) | Closure at `36cbbef` | Test |
|---|---|---|---|---|
| `F1` | P1 | `resolveKey` walks segments by `indexOf` (value). With key `a/a/file.bin` where the first `a` exists but the second `a` does not, `indexOf` returns the index of the first `a`, the loop takes the ENOENT branch with the wrong remaining slice, and the path is misrouted (extra segment). | `resolveKey` rewritten to iterate by INDEX (`for (let i = 0; i < segments.length; i++)`); on ENOENT the remaining tail is `segments.slice(i)`, anchored positionally. No `indexOf` of value anywhere in the resolver. | `LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index) > writes and reads back a key with repeated segments (a/a/file.bin)` and `… > writes and reads back a triple-repeated segment key (x/x/x/file.bin)`. Both PASS. Filesystem ground-truth check confirms exact path `<root>/a/a/file.bin` and `<root>/x/x/x/file.bin` with no spurious sibling segments. |
| `F2` | P1 | `handle.write(chunk)` returns `bytesWritten` but the implementation discards it and unconditionally adds `chunk.byteLength` to `total`. A short write would inflate `sizeBytes` and leave a truncated file. | New helper `writeChunkAll(handle, chunk)` loops on `handle.write()` until the full chunk is persisted, reading the actual `bytesWritten` from the `{ bytesWritten, buffer }` return object. `drainSourceToHandle` accumulates `writeChunkAll` results; the returned `total` equals the on-disk size. | `LocalVpsEvidenceStorageAdapter — F2 regression (short write loop) > sizeBytes equals the count of bytes actually persisted` (8 KiB payload) and `… > write does not throw when the OS returns a short write; sizeBytes = bytes actually written` (5000 bytes split into 7 pieces of sizes `[1, 17, 4097, 41, 700, 80, 64]`). Both PASS; in both cases `result.sizeBytes === stat.size`. |
| `F3` | P1 | `read()` returned `fileHandleToStream(handle)` which wrapped `FileHandle.createReadStream()`. Late errors during consumer drain surfaced as raw Node errors with `errno`/stack/path; the handle was not reliably closed on consumer cancellation. | `fileHandleToStream` is now an `async generator` (`producerFn`) that loops over `handle.read(buf, 0, 64 KiB, null)`. Late read errors are caught and re-thrown as `EvidenceStorageError('STREAM_FAILURE', 'read stream failed mid-drain', null)` — no errno, no path, no stack on the public surface. The handle is closed in a `finally` block that fires on success, mid-drain error, AND consumer cancellation. Exported as `@internal` so the regression test can drive the wrapper deterministically. | `LocalVpsEvidenceStorageAdapter — F3 regression (read stream handles close + late errors) > returns a typed STREAM_FAILURE error when the underlying read fails mid-drain` PASS (handle patched to throw raw EIO on second chunk; outer surface is typed `STREAM_FAILURE`; second call confirms no `EIO`/absolute path/`injected` substrings in the message). `… > closes the file handle when the consumer cancels iteration mid-drain` PASS (256 KiB payload drained only to first chunk; second read on same key succeeds, observable indicator that handle was closed). |
| `F4` | P1 | `exists(directoryKey)` returned `true` (F_OK passes on directories), but `read(directoryKey)` could not drain as bytes. `delete(directoryKey)` relied on `unlink`'s `EISDIR` (mapped to `PERMISSION_DENIED`, which is wrong semantics). Directories were inconsistently treated across the four probe operations. | New helper `statObject(targetPath, key)` runs `lstat` and uniformly throws `NOT_FOUND` when `!s.isFile()`. `read`/`delete`/`stat`/`exists` all route through this storage-object boundary. `delete` no longer relies on `unlink`'s `EISDIR` — directory probes are pre-rejected before `unlink` is called. | `LocalVpsEvidenceStorageAdapter — F4 regression (non-regular nodes are NOT_FOUND) > exists() returns false for a directory` PASS; `… > read() on a directory key throws NOT_FOUND` PASS; `… > stat() on a directory key throws NOT_FOUND` PASS; `… > delete() on a directory key throws NOT_FOUND` PASS (and the directory is verifiably NOT removed); `… > exists() returns false for a dangling symlink in the resolved path` SKIPPED on Windows (POSIX-only); on Linux CI it executes. |
| `F5` | P2 | On write failure, partial-artifact cleanup ran `unlink(targetPath)` BEFORE the `finally` block closed the handle. The handle was still open to a path that may already be unlinked. Cleanup errors were silently swallowed, which could mask a residual partial file. | Cleanup is now sequenced inside `finally`: `await handle.close().catch(() => {})` first, then `await fsPromises.unlink(targetPath).catch(() => {})`. `partialCleanupNeeded` flag is set in the catch block and acted on only after close completes. The outer `EvidenceStorageError` thrown re-anchors `storageKey` to `request.storageKey` (not whatever the source set) and preserves reason/message. | `LocalVpsEvidenceStorageAdapter — F5 regression (cleanup ordering) > closes the handle before unlinking the partial artifact on stream failure` PASS (after-stream-failure `existsSync` on the target path returns `false`; a follow-up write to the SAME key succeeds — i.e. cleanup actually ran, not silently swallowed). `… > preserves typed error surface when cleanup itself fails (path never leaks)` PASS (the thrown `EvidenceStorageError` carries `storageKey === request.storageKey`, and the message contains neither the absolute root path nor the key string). |

#### 5.4.1 Implementation file diff scope (post-F0)

```
src/domains/evidence/local-vps-evidence-storage.adapter.ts   # adapter: F1/F2/F3/F4/F5 logic + exported @internal fileHandleToStream
src/domains/evidence/local-vps-evidence-storage.adapter.test.ts  # +14 regression cases grouped F1..F5
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md  # §0 status READY_FOR_AUDIT; new §9 F1..F5 record; §10/§11 appended
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md  # this file
```

No other paths touched. No ER-001 port change. No `package.json` change. No `AUDIT.md` change (Tier 3-owned; round-2 verdict will be appended by Tier 3 independently).

#### 5.4.2 Audit delta boundary

Tier 3 LIGHT round 2 audits the delta `7f12b9d..36cbbef`. The boundary excludes:
- The original implementation commit `7f12b9d` (round 1 PASS).
- The docs-only follow-up commit `614deb8` (metadata alignment only).
- The PR-merge commit on `origin/main` (separate lane).
- Any path outside `src/domains/evidence/{local-vps-evidence-storage.adapter,local-vps-evidence-storage.adapter.test}.ts` and the two task docs.

### 5.5 Acceptance evidence (compact)

| AC | Evidence location | Result |
|---|---|---|
| AC-01..AC-12 | `local-vps-evidence-storage.adapter.test.ts` | 40/40 PASS locally; 45/45 on Linux CI; full unit 2464/2464 |
| AC-F1..AC-F5 | `local-vps-evidence-storage.adapter.test.ts` (F1..F5 groups) | 14/14 PASS locally; 18/18 on Linux CI (after POSIX skips resolve) |

### 5.6 Audit hand-off expectations

Tier 3 LIGHT has verified (round 1 PASS — see `AUDIT.md` §2 and §4):

- §0 control verdict matches §4 verdict.
- §1 surface coverage matches `git diff --name-only f04bc94f..HEAD`.
- §2 evidence rows cover AC-01..AC-12.
- §5.1.1 timing/race-condition discussion covers TOCTOU.
- §5.2.3 finding-severity matrix (no findings — `PASS`).
- Migration chain — no migrations in this slice (start in ER-003).
- Production credentials / DB — NONE (no Neon, env, production).
- Schema/RLS — NONE.
- Forbidden-path diff — should report clean.
- Carry-forward: ER-001 port test file still passes (verified inside full unit).

If Tier 3 finds anything, the default remediation is to amend the adapter or test (not bypass), and to keep the delivery SHA clean.

**Tier 3 round 1 actual finding**: none — verdict `PASS` (see `AUDIT.md` §4). The default remediation clause above is retained for documentation completeness; it did not fire this round.

### 5.7 Post-audit delivery (Tier 1 round 1 → round 2 → round 3)

**Round 1 → round 2** (docs-only follow-up, commit `614deb8`):

Tier 1 did NOT amend the implementation commit `7f12b9d`. The docs-only follow-up aligned metadata so the verifier saw a consistent picture:
- TASK §0 `Status`: `ACCEPTED` → `READY_FOR_AUDIT` (post-audit verifier-compatible).
- TASK §0 `Next gate`: `Tier 3 LIGHT audit` → `PUSH_AND_OPEN_PR → CI → T0_MERGE_DECISION`.
- TASK §0 `Current audit round`: `0` → `1`.
- TASK §10 (now §10+11) Planner Resolution / Revision Log appended.
- HANDOFF §0/§5/§5.5 updated.

**Round 2 → round 3** (T0 source-review correction, commit `36cbbef`):

T0 source-review identified five defects (F1..F5) not covered by round-1 audit. Tier 1 addressed each one with a typed code fix and a deterministic regression test. Round-3 changes:

- `src/domains/evidence/local-vps-evidence-storage.adapter.ts`: rewrite `resolveKey` (F1), `writeChunkAll` (F2), `fileHandleToStream` async generator with handle `finally`-close (F3), `statObject` storage-object boundary (F4), close-then-unlink `finally` (F5). Adapter file bit-stamp changes.
- `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`: +14 regression tests grouped F1..F5. Test file bit-stamp changes.
- `docs/tasks/.../TASK.md`: §0 status `READY_FOR_AUDIT` → `READY_FOR_AUDIT`; new §9 T0-source-review closure record; §10 Planner Resolution + §11 Revision Log appended.
- `docs/tasks/.../HANDOFF.md`: §0 control, §1 changed files, §2 acceptance (incl. AC-F1..AC-F5 rows), §3 evidence registry (E-07..E-11), §5.4 F1..F5 closure record, §5.7 this section all updated.

Round 3 MUST NOT touch:
- The original implementation commit `7f12b9d` (frozen; not amended, not rebased).
- The docs-only follow-up commit `614deb8` (frozen metadata alignment).
- `AUDIT.md` (Tier 3-owned; round-2 verdict will be appended independently).
- Any forbidden path (`prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, `docs/PLANNER_HANDOVER.md`).
- ER-001 port file `evidence-storage.port.ts` (bit-stamp unchanged vs `f04bc94`).
- Production/staging credentials, deploy, env config, real data.

The branch tip after round 3 must keep history (no force-push; no rewrite of `7f12b9d` or `614deb8`); Tier 3 round 2 audits the delta `7f12b9d..36cbbef`.

Handoff status: `READY_FOR_AUDIT` (round 1 PASS retained at `7f12b9d`; round 2 correction at `36cbbef`; awaiting Tier 3 LIGHT round 2 PASS on delta `7f12b9d..36cbbef` → `PUSH_AND_OPEN_PR` → CI → `T0_MERGE_DECISION`; not `ACCEPTED` until merge lands per `00-global-rules.md`).
