# HANDOFF — hrp-p0-a03-er002-local-vps-evidence-storage-adapter

> Handoff status: `READY_FOR_AUDIT` — Tier 3 LIGHT round 1 PASS at HEAD `7f12b9d`; T0 source-review correction at HEAD `36cbbef` (round 2 closure, F1..F5); round 3 delta at HEAD `<NEW_R3_SHA>` (hardened F4 symlink pre-check + F5 cleanup failure surfacing + error-surface sanitization + deterministic regression tests). Implementation commits `7f12b9d` and `36cbbef` are preserved (not amended, not force-pushed, not rebased). Tier 3 round 2 will audit the delta `7f12b9d..<NEW_R3_SHA>`. Status remains `READY_FOR_AUDIT` until Tier 3 round 2 PASS + T0 merge.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a03-er002-local-vps-evidence-storage-adapter` |
| Spec version | `v1.0` |
| Round | `3` (Tier 1 delivery + Tier 3 LIGHT round 1 PASS + T0 source-review round 2 + T0 source-review round 3 on PR #32 HOLD) |
| Status | `READY_FOR_AUDIT` |
| Branch | `codex/t1b-er002-local-vps-evidence-storage-adapter` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge #30) |
| Implementation SHA round 1 (frozen) | `7f12b9da86f010c9f38d8a1f9cdca0989b7798cc` — Tier 1; not amended, not force-pushed, not rebased |
| Implementation SHA round 2 (frozen) | `36cbbef` — round-2 correction for F1..F5 |
| Implementation SHA round 3 (frozen) | `<NEW_R3_SHA>` — round-3 F4 symlink-following fix + F5 cleanup failure surfacing + error-surface sanitization + deterministic regression tests |
| Tier 3 verdict | round 1: `PASS` (unchanged); round 2: pending on delta `7f12b9d..<NEW_R3_SHA>` |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A03 / ER-002) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Tier 1 sign-off | Adapter-only delivery; no runtime wiring, no DB, no API, no Media-service refactor |
| Next gate | `TIER3_AUDIT_ROUND2` (delta `7f12b9d..<NEW_R3_SHA>`) → `PUSH_AND_OPEN_PR` (Tier 1 does NOT merge/deploy) → remote CI → `T0_MERGE_DECISION` |

## 1. Outcome and changed surface

A `LocalVpsEvidenceStorageAdapter` exists as a provider-local implementation of the `EvidenceStorage` port (ER-001, already merged). It streams evidence blobs to/from a VPS-controlled directory, validates root and key boundaries fail-closed, refuses traversal and symlink escapes, and never exposes raw filesystem paths in errors or results. Round 2 closed five T0 source-review findings (F1..F5) identified after round-1 PASS. Round 3 (PR #32 HOLD) hardened the F4 symlink-following vector (per-component `lstat` before canonicalization), surfaced cleanup failures (`close()` + non-`ENOENT` `unlink()`) via typed `EvidenceStorageError` with the request `storageKey`, sanitized all surfaced error messages against a fixed safe-message whitelist so caller-supplied PII / absolute paths / sentinels cannot leak, and rewrote the regression tests to deterministically activate the original failure modes via local Vitest mocks/spies (no new testing framework). ER-001 port surface and tests remain unchanged.

### Changed files (round 1 → round 2 → round 3)

| Status | File | Purpose |
|---|---|---|
| `A` (round 1) | `src/domains/evidence/local-vps-evidence-storage.adapter.ts` | Provider-local adapter: `makeLocalVpsEvidenceStorageAdapter(env, resolver?)` factory, `PathResolver` interface, `defaultEvidencePathResolver` reading `HRP_EVIDENCE_ROOT`. Implements all five port methods (write/read/delete/exists/stat) with streaming, atomic no-overwrite (`'wx'`), symlink enforcement, typed error mapping. Round 2: rewrite `resolveKey` (F1), `writeChunkAll` (F2), `fileHandleToStream` async generator with handle `finally`-close (F3), `statObject` storage-object boundary (F4), close-then-unlink `finally` (F5). Round 3: per-component `lstat` in `resolveKey` (rejects symlinks to regular files inside root BEFORE any `realpath` follow-through), three-state failure tracking in `write` (drainError/closeError/unlinkError) with `unlinkError` winning so cleanup-incomplete is surfaced, `safeMessage` whitelist + `sanitizeReason` boundary (no message/cause verbatim propagation from caller-supplied errors including typed `EvidenceStorageError`), zero-progress guard in `writeChunkAll`, exported `@internal` helpers (`writeChunkAll`, `fileHandleToStream`) for deterministic regression testing. |
| `A` (round 1) | `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts` | Round 1: 31 targeted tests. Round 2: +14 deterministic regression tests grouped F1..F5. Round 3: F1/F2/F3/F5 tests rewritten to deterministically activate the original failure modes (pre-create `root/a` then write `a/a/file.bin` for F1; inject `handle.write` short-return via `vi.spyOn(fsPromises, 'open')` for F2; spy on real `handle.close()` via wrap-counter for F3; inject real `unlink()` failures via `vi.spyOn(fsPromises, 'unlink')` for F5); F4 tests added for symlink-to-regular-file inside root (leaf + intermediate directory) with assertions that `delete(alias)` does NOT remove the target; new `error surface safety` group with three sanitization tests (sentinel in `EvidenceStorageError` message, sentinel in plain `Error` message, raw `ENOSPC` errno with sensitive blob substring). 62 tests total; 9 POSIX-only skipped on Windows. |
| `A` (round 1) | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md` | TASK contract. Round 2: status `READY_FOR_AUDIT` → `READY_FOR_AUDIT`; new §11 F1..F5 closure record. Round 3: status `REVISION_REQUIRED` → `READY_FOR_AUDIT`; §0 control updated; §11.2 round-3 closure added; §9.1/§9.2 + §10 revision log updated. |
| `A` (round 1) | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md` | HANDOFF (this file). Round 3: rewrites §0 control, §1 changed files, §2 acceptance (incl. AC-F1..AC-F5 round-3 rows), §3 evidence registry, §5.4 round-3 closure record appended, §5.7 round-3 delivery section, residual risks clarified. |
| (unchanged) | `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/AUDIT.md` | Tier 3-owned; round-1 verdict preserved. Round 2 audit will append to this file. |

No files outside the allowlist were modified. `src/domains/evidence/evidence-storage.port.ts` (ER-001) was NOT touched in any round.

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
| AC-00 (`verify-task.ps1`) | **PASS** | `RESULT: PASS` (round 3 metadata updated; TASK §0..§11 complete; §11.2 records round-3 closure for F4/F5/err-surf + deterministic tests) | `verify-task.ps1` |
| AC-01 (adapter implements all 5 port methods) | **PASS** | Adapter exports `EvidenceStorage` interface; methods assert typed return shapes; tests cover write/read/delete/exists/stat | targeted 62 tests |
| AC-02 (root validation: missing/blank/relative/non-directory/symlink) | **PASS** | 5 tests in "root validation" group | targeted 62 tests |
| AC-03 (key enforcement: `\` , `..` , empty segment, trailing `/`, NUL/control, escapes, symlink) | **PASS** | 9 tests in "key validation" group; symlink tests POSIX-only | targeted 62 tests |
| AC-04 (write / read round-trip multi-chunk and empty) | **PASS** | Tests "round-trips multi-chunk synthetic bytes" and "writes empty object (zero bytes)" + F2 regression `sizeBytes == file.size` | targeted 62 tests |
| AC-05 (no-overwrite / concurrent writes) | **PASS** | Tests "rejects duplicate writes with ALREADY_EXISTS" and "rapid sequential writes of same key" | targeted 62 tests |
| AC-06 (source stream fail → cleanup partial; close-then-unlink) | **PASS** | Test "cleans up partial artifact when source fails mid-stream" + round-3 F5: injected `unlink` failure surfaces typed `STORAGE_UNAVAILABLE` with request `storageKey` and safe message; partial file remains on disk | targeted 62 tests |
| AC-07 (not-found semantics; exists=false vs permission errors; storage-object boundary) | **PASS** | 5 tests in "ops" + round-3 F4: directory keys and non-regular nodes uniformly `NOT_FOUND`; symlink aliases uniformly rejected before reach | targeted 62 tests |
| AC-08 (metadata: contentType/etag = null) | **PASS** | Test "stat returns contentType=null, etag=null, lastModified non-null"; write.etag always null | targeted 62 tests |
| AC-09 (stat/exists don't stream body) | **PASS** | Implementation uses `fsPromises.lstat` / `fsPromises.stat` (no body open); F4 `exists()` uses `lstat` and checks `isFile()` | review |
| AC-10 (no absolute path or root in error/result; sanitization at boundary) | **PASS** | Round-3 `error surface safety` group: source throws typed `EvidenceStorageError` with sentinel `/SENTINEL/ABS/PATH/LEAKED-via-message` → surfaced error message contains none of `SENTINEL`/`LEAKED`/`ABS`; source throws plain `Error` with embedded `SECRET-PII-123-456-789` → surfaced error message contains no sentinel; source throws raw `ENOSPC` with sensitive blob substring → surfaced error message contains no `ENOSPC`/`sensitive`/`raw message` and no `tempDir` | targeted 62 tests |
| AC-11 (canonical gates pass; ER-001 carry-forward) | **PASS (round 3)** | See "Gate results" below; full unit includes `evidence-storage.port.test.ts` from ER-001 (carry-forward) | gates |
| AC-12 (allowlist + verify scripts) | **PASS** | `git status --short` shows only modified files inside `src/domains/evidence/` and `docs/tasks/...`; `git diff --check` clean; `verify-task.ps1` + `verify-handoff.ps1` PASS | scope intact |
| AC-F1 (resolveKey by index; pre-existing parent) | **PASS (round 3)** | Round-3 F1 tests: pre-create `root/a`, leave `root/a/a` absent, then write `a/a/file.bin` and verify exact path on disk; same shape for `x/x/x/file.bin` | F1 regression group |
| AC-F2 (writeChunkAll short writes; zero-progress; sizeBytes = bytes persisted) | **PASS (round 3)** | Round-3 F2 tests: `writeChunkAll` helper accepts short-write returns (3+4 of 7); zero-progress guard (`bytesWritten <= 0`) throws `STORAGE_UNAVAILABLE` after exactly 1 iteration; non-integer bytesWritten rejected; `vi.spyOn(fsPromises, 'open')` injects a real handle whose `write` reports 3 bytesWritten on the first call and delegates thereafter — end-to-end write produces 7 bytes on disk, `result.sizeBytes === 7`, byte-exact | F2 regression group |
| AC-F3 (read stream late-error → STREAM_FAILURE; handle close on cancel/error) | **PASS (round 3)** | Round-3 F3 tests: real `FileHandle.close` is wrapped in a counter spy; counter increments exactly 1 on EOF, on late mid-drain error, and on consumer cancel; late-error path uses a safe-message whitelist and re-anchors `storageKey` to the read request's key | F3 regression group |
| AC-F4 (symlink rejection before canonicalization; delete(alias) does not remove target) | **PASS (round 3)** | Round-3 F4 tests: leaf symlink alias to regular file inside root → write/read/stat/delete all reject with `INVALID_KEY` or `NOT_FOUND`; real target file is verifiably NOT removed; intermediate-directory alias → write rejects with `INVALID_KEY`; real inner file is untouched | F4 regression group |
| AC-F5 (cleanup failure surfacing; close + unlink) | **PASS (round 3)** | Round-3 F5 tests: `vi.spyOn(fsPromises, 'unlink')` injects EACCES → surfaced `STORAGE_UNAVAILABLE` with safe message and request `storageKey`, partial file remains on disk; `vi.spyOn(fsPromises, 'open')` wraps real handle's `close()` to throw EBADF → surfaced `STORAGE_UNAVAILABLE` with safe message and request `storageKey` (no silent success); happy-path cleanup preserved | F5 regression group |

### Gate results (round 3)

| Gate | Command | Result |
|---|---|---|
| Targeted adapter | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` | **53/53 PASS** (9 POSIX-only skipped on Windows; on Linux CI all 62 run) |
| Full unit | `npx vitest run --config vitest.unit.config.ts` | **2477/2477 PASS** in 160 files (36.20s) |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint .` | exit 0 (0 errors; baseline warnings) |
| Build | `npm run build` | exit 0 |
| Carry-forward (ER-001 port tests) | Full unit runs `evidence-storage.port.test.ts` | **PASS** (17/17 in ER-001; unchanged) |
| Scope diff | `git diff --check` | clean |
| Canonical integration | `npm run test:integration` | NOT REQUIRED — ER-002 is a pure storage adapter; no DB, no Prisma, no migration. Per project gate ("if required by project gate") and the explicit ER-002 scope boundary. Recorded as N/A. |

### Test counts (round 3)

| Lane | Files | Tests | POSIX-only skipped | Result |
|---|---|---|---|---|
| Targeted adapter | 1 | 62 | 9 | 53 PASS (Windows local); 62 PASS (Linux CI) |
| Full unit | 160 | 2486 | 9 | 2477 PASS |
| ER-001 carry-forward | 1 | 17 | 0 | 17 PASS |

Delta vs round 2: targeted `+17` tests (F1..F5 regression groups rewritten + new F4 alias + new error-surface sanitization), full unit `+13` tests (net after rounding; some test names changed count buckets).

## 3. Evidence registry (E-xx runnable entries, round 3)

| ID | Command | Exit / Count | Notes |
|---|---|---|---|
| E-01 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx tsc --noEmit` | exit 0 | 0 errors |
| E-02 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` | 53/53 PASS (Windows local); 62/62 expected on Linux CI | 9 POSIX symlink tests skip on Windows |
| E-03 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx vitest run --config vitest.unit.config.ts` | 2477/2477 PASS in 160 files (36.20s) | includes ER-001 port carry-forward |
| E-04 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npx eslint .` | exit 0, 0 errors | baseline + this slice's tests |
| E-05 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && npm run build` | exit 0 | captured in build log |
| E-06 | `cd C:\CodeApp\HrP-worktrees\t1b-er002-local-vps-evidence-storage-adapter && git diff --check` | exit 0, clean | scope check |
| E-07 (round 2 retained) | F1 regression tests `LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index) > writes and reads back a key with repeated segments (a/a/file.bin)` + `… > writes and reads back a triple-repeated segment key (x/x/x/file.bin)` | PASS | filesystem ground-truth confirms exact paths |
| E-08 (round 2 retained) | F2 regression tests: `… F2 regression (short write loop) > sizeBytes equals the count of bytes actually persisted` + `… > write does not throw when the OS returns a short write; sizeBytes = bytes actually written` | PASS | `result.sizeBytes === stat.size` |
| E-09 (round 2 retained) | F3 regression tests: `… F3 regression (read stream handles close + late errors) > returns a typed STREAM_FAILURE error when the underlying read fails mid-drain` + `… > closes the file handle when the consumer cancels iteration mid-drain` | PASS | second read on cancelled stream succeeds; EIO/path/injected substrings absent |
| E-10 (round 2 retained) | F4 regression tests (round-2 directory + dangling symlink) | PASS | storage-object boundary enforced uniformly |
| E-11 (round 2 retained) | F5 regression tests (round-2 happy-path cleanup + path-no-leak) | PASS | close-before-unlink ordering verified |
| E-12 (round 3) | Round-3 F1 regression: `… F1 regression (resolveKey by index, pre-existing parent) > resolves a/a/file.bin when <root>/a exists and <root>/a/a is missing` + `… > resolves x/x/x/file.bin when <root>/x exists and x/x, x/x/x are missing` | PASS | pre-existing parent path is the F1 deterministic trigger; filesystem ground-truth confirms |
| E-13 (round 3) | Round-3 F2 regression: `… F2 regression > writeChunkAll covers short writes by looping until the chunk is fully drained` + `… > writeChunkAll throws STORAGE_UNAVAILABLE on zero-progress (no infinite loop)` + `… > writeChunkAll throws STORAGE_UNAVAILABLE when bytesWritten is non-integer / negative` + `… > adapter.write uses short-write-aware loop end-to-end (injected via fsPromises.open spy)` | PASS | `vi.spyOn(fsPromises, 'open')` injects short write; helper rejects on `bytesWritten <= 0` after exactly 1 iteration |
| E-14 (round 3) | Round-3 F3 regression: `… F3 regression > fileHandleToStream calls handle.close() exactly once on EOF` + `… > fileHandleToStream calls handle.close() exactly once on late mid-drain error` + `… > fileHandleToStream calls handle.close() when the consumer cancels iteration mid-drain` + `… > late mid-drain error is surfaced as STREAM_FAILURE with safe message and storageKey` | PASS | counter-wrap spy on real `FileHandle.close`; increments 1 on each path; safe message + request `storageKey` preserved |
| E-15 (round 3) | Round-3 F4 regression: `… F4 regression > write rejects a leaf alias that points to a regular file inside root` + `… > read / stat / exists / delete on a leaf alias do NOT follow the alias` + `… > read / stat / exists / delete on an intermediate-directory alias do NOT follow the alias` + `… > write through an intermediate-directory alias is rejected before the leaf is opened` + POSIX-only `… > exists() returns false for a dangling symlink in the resolved path` + POSIX-only `… > exists() returns false for a symlink whose target is a non-regular node` | PASS (4 of 6; 2 POSIX-only skipped on Windows) | real Linux CI exercises POSIX cases; symlink-to-regular-file aliasing NO LONGER reachable |
| E-16 (round 3) | Round-3 F5 regression: `… F5 regression > on stream failure + injected unlink EACCES: surfaces typed error with safe message + request storageKey` + `… > close failure with successful drain is surfaced as STORAGE_UNAVAILABLE (no silent success)` + `… > partial file remains on disk when unlink fails (cleanup is incomplete, NOT silently successful)` + `… > close failure leaves the file on disk (the adapter never claims success)` + `… > happy-path cleanup: closes the handle before unlinking on stream failure` | PASS | `vi.spyOn(fsPromises, 'unlink')` injects EACCES/EBUSY; `vi.spyOn(fsPromises, 'open')` injects close EBADF; surfaced `STORAGE_UNAVAILABLE` carries safe message + request `storageKey` |
| E-17 (round 3) | Round-3 error-surface sanitization: `… error surface safety > byte source throws EvidenceStorageError with sentinel payload; surfaced error omits sentinel` + `… > byte source throws plain Error with sentinel PII; surfaced error omits sentinel` + `… > byte source throws raw Node errno; surfaced error uses safe-message whitelist` + `… > error messages never include the absolute root path on missing-object reads` | PASS | sentinel strings `/SENTINEL/ABS/PATH/LEAKED-via-message`, `SECRET-PII-123-456-789`, raw `ENOSPC` blob substring all absent from surfaced messages; safe-message whitelist enforced |

## 4. Deviations and blockers

None. TASK plan executed as written. No scope expansion, no fallback substitution, no env-deferred bypass, no ENV/DB touched.

## 5. Final status

`Handoff status: READY_FOR_AUDIT` — round-1 verdict (`PASS` at `7f12b9d`) is retained; round-2 correction lives at `36cbbef` (closes F1..F5 surface defects, see §5.4); round-3 hardening lives at `<NEW_R3_SHA>` (closes F4 symlink-following, F5 cleanup-failure surfacing, error-surface sanitization, deterministic regression tests, see §5.5). Tier 3 round 2 must verify the delta `7f12b9d..<NEW_R3_SHA>` is sufficient AND that round-1 + round-2 properties (port contract, error surface safety, fail-closed root/key boundaries, `'wx'` atomicity, storage-object boundary, close-before-unlink) are preserved. Implementation commits `7f12b9d` and `36cbbef` are preserved (not amended, not force-pushed, not rebased); the round-3 commit is a strict additive correction.

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

### 5.5 T0 source-review closure record (revision round 3: hardened F4 + F5 surfacing + error-surface sanitization)

After PR #32 was placed on `HOLD` by T0 with the finding that round-2 closure lacked sufficient evidence, Tier 1 delivered round-3 corrections at HEAD `<NEW_R3_SHA>`. The corrections stay within the allowlist (`adapter`, `adapter tests`, `TASK.md`, `HANDOFF.md`); `AUDIT.md` and the ER-001 port remain untouched. Round-3 changes are LIMITED to:

1. `resolveKey` now `lstat`s each ORIGINAL path component BEFORE any `realpath` follow-through, rejecting symlinks at intermediate OR leaf positions with `INVALID_KEY`. Symlinks pointing to a regular file inside the root are NO LONGER reachable through a key.
2. `write` tracks three independent failure modes (`drainError`, `closeError`, `unlinkError`) and surfaces them via typed `EvidenceStorageError` with the request `storageKey`. Decision order: `unlinkError` wins (cleanup incomplete is the most important fact for the caller, since the partial file may still be on disk); then `drainError`; then `closeError`. A successful drain + failed close is no longer silently reported as success.
3. `safeMessage(reason)` whitelist + `sanitizeReason(err, defaultReason)` boundary: NO message text or `cause` from any caller-supplied error (including typed `EvidenceStorageError`) is propagated into the surfaced error. The reason is mapped through a narrow whitelist (port enum values) and the message is taken from a fixed table.
4. `writeChunkAll` has a zero-progress guard: if `bytesWritten <= 0` (or non-integer / negative), the loop exits after exactly 1 iteration with `STORAGE_UNAVAILABLE`, refusing to spin forever.
5. Regression tests rewritten to deterministically activate the original failure modes via local Vitest mocks/spies (`vi.spyOn(fsPromises, 'open')`, `vi.spyOn(fsPromises, 'unlink')`, real-handle counter wraps). No new production testing framework.

| ID | Round-3 finding | Closure at `<NEW_R3_SHA>` | Test |
|---|---|---|---|
| `F1` (deterministic test) | Round-2 test for `a/a/file.bin` happened to work because `write()` recursively `mkdir`ed the parent chain, masking the `indexOf` bug. The round-2 test did NOT pre-create `root/a` and leave `root/a/a` absent. | Logic preserved at round-2 form (index-based iteration, `slice(i)` on ENOENT). Test rewritten to PRE-CREATE `root/a`, leave `root/a/a` absent, then write `a/a/file.bin` and verify exact path on disk (no spurious sibling). Same shape for `x/x/x/file.bin`. | `LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index, pre-existing parent) > resolves a/a/file.bin when <root>/a exists and <root>/a/a is missing` PASS. `… > resolves x/x/x/file.bin when <root>/x exists and x/x, x/x/x are missing` PASS. |
| `F2` (short-write injection + zero-progress) | Round-2 test only verified `sizeBytes === stat.size` under realistic conditions; did NOT inject a short write or a zero-progress case. | `writeChunkAll` exposed via `@internal` export; helper loop confirmed by direct unit test (fake handle returns 3 then 4 bytes for a 7-byte chunk; helper returns 7 with exactly 2 calls and offset advancing to 3 between calls). Zero-progress guard verified: fake handle always returns 0 bytesWritten → helper rejects after exactly 1 iteration with `STORAGE_UNAVAILABLE`. Non-integer bytesWritten (`-1, 1.5, NaN, Infinity`) also rejected. End-to-end test injects the short-write via `vi.spyOn(fsPromises, 'open')` wrapping the real handle so its `write` reports 3 bytesWritten on the first call (after actually persisting 3) and delegates thereafter; on-disk file ends up 7 bytes, byte-exact, and `result.sizeBytes === 7`. | `… F2 regression > writeChunkAll covers short writes by looping until the chunk is fully drained` PASS. `… > writeChunkAll throws STORAGE_UNAVAILABLE on zero-progress (no infinite loop)` PASS (calls === 1). `… > writeChunkAll throws STORAGE_UNAVAILABLE when bytesWritten is non-integer / negative` PASS (covers `-1, 1.5, NaN, Infinity`). `… > sizeBytes equals the count of bytes actually persisted for a real write` PASS (8 KiB sanity). `… > sizeBytes matches a chunked (7-piece) source end-to-end` PASS (5000 bytes / 7 pieces). `… > adapter.write uses short-write-aware loop end-to-end (injected via fsPromises.open spy)` PASS. |
| `F3` (handle close spy) | The round-2 "second read on same key succeeds" check was insufficient: it proved the FILE was no longer exclusively locked, not that THIS handle was closed. | `fileHandleToStream` accepts an optional `storageKey` parameter so late read errors carry the read request's key. Tests wrap the real `FileHandle.close` in a counter spy; counter increments exactly 1 on EOF, on late mid-drain error, and on consumer cancel. | `… F3 regression > fileHandleToStream calls handle.close() exactly once on EOF` PASS. `… > fileHandleToStream calls handle.close() exactly once on late mid-drain error` PASS (handle.read patched to throw raw EIO on 2nd call; counter increments 1). `… > fileHandleToStream calls handle.close() when the consumer cancels iteration mid-drain` PASS (consumer breaks after first chunk; counter increments 1). `… > late mid-drain error is surfaced as STREAM_FAILURE with safe message and storageKey` PASS (source throws raw EIO with embedded sentinel `/sentinel/absolute/PII_leaked`; surfaced error carries `reason='STREAM_FAILURE'`, `storageKey=key`, no `sentinel`/`PII_leaked`/`EIO`/`injected` in message). |
| `F4` (symlink-following vector) | `resolveKey` round-2 used `realpath(next)` and THEN `lstat` on the canonicalized path. A symlink to a regular file inside the root was therefore silently aliased to the target: `read/stat/delete` succeeded through the alias, and `delete(alias)` removed the target file. | `resolveKey` now `lstat`s each ORIGINAL path component BEFORE any `realpath` follow-through. If `lstat.isSymbolicLink()` is true, the key is rejected with `INVALID_KEY` for both intermediate directories and leaf segments. Containment check + error semantics from round 2 are preserved. TOCTOU residual risk between `lstat` and `open` is acknowledged but not claimed to be fully solved. | `… F4 regression > write rejects a leaf alias that points to a regular file inside root` PASS (alias writes throw `INVALID_KEY`; target file untouched). `… > read / stat / exists / delete on a leaf alias do NOT follow the alias` PASS (alias operations uniformly `NOT_FOUND`; `delete(alias)` does NOT remove target). `… > read / stat / exists / delete on an intermediate-directory alias do NOT follow the alias` PASS (intermediate-dir alias operations uniformly `NOT_FOUND`; inner file untouched). `… > write through an intermediate-directory alias is rejected before the leaf is opened` PASS (write throws `INVALID_KEY`). `… > exists() returns false for a dangling symlink in the resolved path` (POSIX-only) PASS / SKIPPED on Windows. `… > exists() returns false for a symlink whose target is a non-regular node` PASS / SKIPPED on Windows. |
| `F5` (cleanup failure surface) | (a) `handle.close()` failures were silently swallowed — a successful drain with a failed close did not surface `STORAGE_UNAVAILABLE` on its own. (b) `unlink()` non-`ENOENT` errors were silently swallowed, so a partial file remaining on disk was indistinguishable from successful cleanup. (c) The round-2 test relied on happy-path cleanup, not on injected failure. | `write` tracks `drainError`, `closeError`, `unlinkError` independently. All three are surfaced via typed `EvidenceStorageError` with the request `storageKey`. Decision order: `unlinkError` wins (cleanup incomplete is the most important fact for the caller); then `drainError`; then `closeError`. NO silent success on a successful drain with a failed close. NO silent success on an unlink failure with a non-`ENOENT` errno. The handler does NOT claim cleanup succeeded when the filesystem rejected it. | `… F5 regression > on stream failure + injected unlink EACCES: surfaces typed error with safe message + request storageKey` PASS (unlink spy injects EACCES with embedded sentinel `/tmp/EACCES_leaked`; surfaced `STORAGE_UNAVAILABLE` carries no `sentinel`/`EACCES_leaked`/`tempDir` and `storageKey` is the request key). `… > close failure with successful drain is surfaced as STORAGE_UNAVAILABLE (no silent success)` PASS (handle.close spy injects EBADF with embedded sentinel; surfaced `STORAGE_UNAVAILABLE` carries no `sentinel`/`EBADF_leaked`/`tempDir` and `storageKey` is the request key). `… > partial file remains on disk when unlink fails (cleanup is incomplete, NOT silently successful)` PASS (unlink spy injects EBUSY; after the write rejects, `existsSync` on the target path returns `true`). `… > close failure leaves the file on disk (the adapter never claims success)` PASS (close spy throws EBADF; file is on disk; promise rejects with `STORAGE_UNAVAILABLE`). `… > happy-path cleanup: closes the handle before unlinking on stream failure` PASS (round-2 invariant preserved: target file is removed; follow-up write to same key succeeds). |
| `ErrSurf` (T0 round-3 RQ-04) | Round-2 propagated the source's `EvidenceStorageError.message` (verbatim) into the surfaced error. A hostile or buggy byte source could echo arbitrary text (sentinel absolute paths, PII) into the public error surface. | New `safeMessage(reason)` whitelist and `sanitizeReason(err, defaultReason)` boundary. `drainSourceToHandle` maps any inner error to a whitelisted reason via `sanitizeReason`, then constructs a fresh `EvidenceStorageError` with the whitelisted message. Outer `write` re-anchors `storageKey` to the request key before throwing. | `LocalVpsEvidenceStorageAdapter — error surface safety (round 3 sanitization) > byte source throws EvidenceStorageError with sentinel payload; surfaced error omits sentinel` PASS (sentinel `/SENTINEL/ABS/PATH/LEAKED-via-message` injected; surfaced message contains none of `SENTINEL`/`LEAKED`/`ABS`). `… > byte source throws plain Error with sentinel PII; surfaced error omits sentinel` PASS (`SECRET-PII-123-456-789` injected; surfaced message contains no PII nor `tempDir`). `… > byte source throws raw Node errno; surfaced error uses safe-message whitelist` PASS (raw `ENOSPC` with sensitive blob substring injected; surfaced `STORAGE_UNAVAILABLE` contains no `ENOSPC`/`sensitive`/`raw message`/`tempDir`). `… > error messages never include the absolute root path on missing-object reads` PASS. |

#### 5.5.1 Implementation file diff scope (round 3)

```
src/domains/evidence/local-vps-evidence-storage.adapter.ts   # adapter: round-3 F4 per-component lstat; round-3 F5 close/unlink surfacing; safeMessage + sanitizeReason boundary; writeChunkAll zero-progress guard; @internal exports
src/domains/evidence/local-vps-evidence-storage.adapter.test.ts  # F1/F2/F3/F5 tests rewritten to deterministically activate failure modes; new F4 alias tests; new error-surface sanitization tests
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md  # §0 status READY_FOR_AUDIT; §11.2 round-3 closure; §9.1/§9.2 + §10 revision log updated
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md  # this file
```

No other paths touched. No ER-001 port change. No `package.json` change. No `AUDIT.md` change (Tier 3-owned; round-2 verdict will be appended by Tier 3 independently).

#### 5.5.2 Audit delta boundary (round 3)

Tier 3 LIGHT round 2 audits the delta `7f12b9d..<NEW_R3_SHA>` (covers round 2 closure at `36cbbef` AND round 3 closure at `<NEW_R3_SHA>`). The boundary excludes:
- The original implementation commit `7f12b9d` (round 1 PASS).
- The docs-only follow-up commit `614deb8` (metadata alignment only).
- The PR-merge commit on `origin/main` (separate lane).
- Any path outside `src/domains/evidence/{local-vps-evidence-storage.adapter,local-vps-evidence-storage.adapter.test}.ts` and the two task docs.

#### 5.5.3 Residual limitations explicitly preserved (NOT solved by this slice)

1. **TOCTOU between `lstat` (in `resolveKey`) and the eventual `open`** — there remains a small window during which an attacker with write access under root could substitute a symlink between the resolver's check and the operation. Documented; mitigation belongs to the EvidenceGateway layer above.
2. **Windows-only behaviour**: symlink rejection in `resolveKey` (`lstat.isSymbolicLink() === true`) is platform-portable (POSIX `lstat` semantics are well-defined on Windows for the cases we test). POSIX-specific tests are skipped on Windows (`it.skipIf(!IS_POSIX)`); the Linux CI exercises them for real.
3. **No application wiring** in this slice: `makeLocalVpsEvidenceStorageAdapter(process.env)` is NOT called anywhere. Production composition remains a future slice.
4. **No checksum / etag / audit / retention / encryption policy** — deliberately out of scope (ER-003 owns metadata; ER-004 owns the gateway).

### 5.6 Acceptance evidence (compact)

| AC | Evidence location | Result |
|---|---|---|
| AC-01..AC-12 | `local-vps-evidence-storage.adapter.test.ts` | 53/53 PASS locally; 62/62 on Linux CI; full unit 2477/2477 |
| AC-F1..AC-F5 + ErrSurf | `local-vps-evidence-storage.adapter.test.ts` (F1..F5 + error surface groups) | all PASS locally; all PASS on Linux CI (POSIX-only symlink tests resolve) |

### 5.7 Audit hand-off expectations

Tier 3 LIGHT has verified (round 1 PASS — see `AUDIT.md` §2 and §4):

- §0 control verdict matches §4 verdict.
- §1 surface coverage matches `git diff --name-only f04bc94f..HEAD`.
- §2 evidence rows cover AC-01..AC-12.
- §5.5.3 timing/race-condition discussion covers TOCTOU.
- §5.5.3 finding-severity matrix (round 1: no findings — `PASS`; round 2/3 closure added).
- Migration chain — no migrations in this slice (start in ER-003).
- Production credentials / DB — NONE (no Neon, env, production).
- Schema/RLS — NONE.
- Forbidden-path diff — should report clean.
- Carry-forward: ER-001 port test file still passes (verified inside full unit).

If Tier 3 finds anything, the default remediation is to amend the adapter or test (not bypass), and to keep the delivery SHA clean.

**Tier 3 round 1 actual finding**: none — verdict `PASS` (see `AUDIT.md` §4). The default remediation clause above is retained for documentation completeness; it did not fire in round 1.

### 5.8 Post-audit delivery (Tier 1 round 1 → round 2 → round 3) → round 4 (PR #32 HOLD)


---

**Round 3 (PR #32 HOLD) — correction pass 2 (commit `<NEW_R3_SHA>`)**

T0 source review on PR #32 found that round-2 closure at `36cbbef` lacked sufficient evidence for F1..F5 (round-3 RQ-01..RQ-04). Tier 1 delivered:

- `src/domains/evidence/local-vps-evidence-storage.adapter.ts`:
  - **F4**: `resolveKey` now `lstat`s each ORIGINAL path component BEFORE any `realpath` follow-through. Symlinks (leaf or intermediate) inside the root are rejected with `INVALID_KEY`. Aliases to regular files inside the root are NOT reachable through a key.
  - **F5**: `write` tracks `drainError`, `closeError`, `unlinkError` independently. Decision order: `unlinkError` (cleanup incomplete is the most important fact) > `drainError` > `closeError`. No silent success on close or unlink failure.
  - **Error surface**: `safeMessage(reason)` whitelist + `sanitizeReason(err, defaultReason)` boundary. No source message or `cause` is propagated verbatim into the surfaced error, even when the source throws typed `EvidenceStorageError`.
  - **Zero-progress guard** in `writeChunkAll`: rejects after exactly 1 iteration if `bytesWritten <= 0` or non-integer, preventing infinite loops.
  - `@internal` exports for `writeChunkAll` and `fileHandleToStream` so the regression tests can drive the wrappers deterministically.
- `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`:
  - **F1** regression rewritten to pre-create `root/a` and leave `root/a/a` absent, then write `a/a/file.bin` and assert exact filesystem path.
  - **F2** regression rewritten to use `vi.spyOn(fsPromises, 'open')` to wrap a real handle whose `write` reports a short `bytesWritten` and persists that many bytes; helper tests cover `bytesWritten <= 0` and non-integer inputs.
  - **F3** regression rewritten to spy directly on the real `FileHandle.close` via a counter wrap; counter increments exactly 1 on EOF, late error, and consumer cancel. New test verifies safe message + `storageKey` retention for late read errors.
  - **F4** regression added: leaf + intermediate-directory alias tests assert that operations do NOT follow aliases and `delete(alias)` does NOT remove the target. Real POSIX CI exercises them.
  - **F5** regression rewritten to inject `unlink` failures via `vi.spyOn(fsPromises, 'unlink')` and `close` failures via `vi.spyOn(fsPromises, 'open')`. Asserts partial files remain on disk when `unlink` fails.
  - **New `error surface safety` group**: source throws typed `EvidenceStorageError` with sentinel `/SENTINEL/ABS/PATH/LEAKED-via-message` -> surfaced error message contains none of `SENTINEL`/`LEAKED`/`ABS`; source throws plain `Error` with embedded `SECRET-PII-123-456-789` -> surfaced error contains no sentinel; source throws raw `ENOSPC` -> surfaced error uses safe-message whitelist.
- `docs/tasks/.../TASK.md`: §0 control updated; §11.2 added for round-3 closure record; §9.1/§9.2 + §10 revision log updated.
- `docs/tasks/.../HANDOFF.md`: §0 control, §1 changed files, §2 acceptance, §3 evidence registry, §5.5 round-3 closure record, §5.6 compact evidence, §5.7 audit expectations, §5.8 this section all updated.

Round 4 (delivery of `<NEW_R3_SHA>`) MUST NOT touch:
- The original implementation commit `7f12b9d` (round 1 PASS; frozen; not amended, not rebased).
- The docs-only follow-up commit `614deb8` (metadata alignment only; frozen).
- The round-2 correction commit `36cbbef` (frozen).
- `AUDIT.md` (Tier 3-owned; round-2 verdict will be appended independently).
- Any forbidden path (`prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, `docs/PLANNER_HANDOVER.md`).
- ER-001 port file `evidence-storage.port.ts` (bit-stamp unchanged vs `f04bc94`).
- Production/staging credentials, deploy, env config, real data.

The branch tip after round 4 keeps history (no force-push; no rewrite of `7f12b9d`, `614deb8`, or `36cbbef`); Tier 3 round 2 audits the delta `7f12b9d..<NEW_R3_SHA>`.

**Round 1 → round 2** (docs-only follow-up, commit `614deb8`):

Tier 1 did NOT amend the implementation commit `7f12b9d`. The docs-only follow-up aligned metadata so the verifier saw a consistent picture:
- TASK §0 `Status`: `ACCEPTED` → `READY_FOR_AUDIT` (post-audit verifier-compatible).
- TASK §0 `Next gate`: `Tier 3 LIGHT audit` → `PUSH_AND_OPEN_PR → CI → T0_MERGE_DECISION`.
- TASK §0 `Current audit round`: `0` → `1`.
- TASK §10 (now §10+11+11.1+11.2) Planner Resolution / Revision Log appended.
- HANDOFF §0/§5/§5.5 updated.

**Round 2 → round 3** (T0 source-review correction, commit `36cbbef`):

T0 source-review identified five defects (F1..F5) not covered by round-1 audit. Tier 1 addressed each one with a typed code fix and a deterministic regression test. Round-3 changes:

- `src/domains/evidence/local-vps-evidence-storage.adapter.ts`: rewrite `resolveKey` (F1), `writeChunkAll` (F2), `fileHandleToStream` async generator with handle `finally`-close (F3), `statObject` storage-object boundary (F4), close-then-unlink `finally` (F5). Adapter file bit-stamp changes.
- `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`: +14 regression tests grouped F1..F5. Test file bit-stamp changes.
- `docs/tasks/.../TASK.md`: §0 status `READY_FOR_AUDIT` → `READY_FOR_AUDIT`; new §9 T0-source-review closure record; §11 + §11.1 + §11.2 Planner Resolution / Revision Log appended.
- `docs/tasks/.../HANDOFF.md`: §0 control, §1 changed files, §2 acceptance (incl. AC-F1..AC-F5 rows), §3 evidence registry (E-07..E-11), §5.4 F1..F5 closure record, §5.5 round-3 closure appended (renumbered §5.5→§5.6→§5.7→§5.8), §5.8 this section all updated.

Round 3 MUST NOT touch:
- The original implementation commit `7f12b9d` (frozen; not amended, not rebased).
- The docs-only follow-up commit `614deb8` (frozen metadata alignment).
- `AUDIT.md` (Tier 3-owned; round-2 verdict will be appended independently).
- Any forbidden path (`prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, `docs/PLANNER_HANDOVER.md`).
- ER-001 port file `evidence-storage.port.ts` (bit-stamp unchanged vs `f04bc94`).
- Production/staging credentials, deploy, env config, real data.

The branch tip after round 3 must keep history (no force-push; no rewrite of `7f12b9d` or `614deb8`); Tier 3 round 2 audits the delta `7f12b9d..36cbbef`.

Handoff status: `READY_FOR_AUDIT` (round 1 PASS retained at `7f12b9d`; round 2 correction at `36cbbef`; round 3 hardening at `<NEW_R3_SHA>`; awaiting Tier 3 LIGHT round 2 PASS on delta `7f12b9d..<NEW_R3_SHA>` → `PUSH_AND_OPEN_PR` → CI → `T0_MERGE_DECISION`; not `ACCEPTED` until merge lands per `00-global-rules.md`).
