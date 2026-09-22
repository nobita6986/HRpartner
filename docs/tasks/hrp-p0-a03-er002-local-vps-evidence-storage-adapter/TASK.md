# TASK — hrp-p0-a03-er002-local-vps-evidence-storage-adapter

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a03-er002-local-vps-evidence-storage-adapter` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Adapter is a security boundary; raw filesystem path operations + traversal/symlink enforcement must be correct to prevent evidence disclosure/overwrite. |
| Spec version | `v1.0` |
| Status | `READY_FOR_AUDIT` (cumulative Tier 3 LIGHT PASS across rounds 1–3 on HEAD `ad57f3854f1e9774d914c629a46a97379c3ceb65`; round 1 at `7f12b9d`, round 2 at `36cbbef`, round 3 substantive at `d368cad`, round 3 test-alignment at `21fe534`, round 3 docs at `fb819a1`, round 3 evidence at `ad57f38`; remote CI runs `35683018593` and `35683639100` both PASS Quality + Integration on PR #32; awaiting `T0_MERGE_DECISION`. Self-declared `ACCEPTED` is NOT set: merge authority belongs to T0.) |
| Planner | `Tier 1` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge) |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A03) |
| In-scope roots | `src/domains/evidence/local-vps-evidence-storage.adapter.ts`, `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`, `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/**` |
| Forbidden paths | `docs/PLANNER_HANDOVER.md`, `prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, CRM/shared integration contracts, env/deploy config, discovery/CRM docs, `src/domains/evidence/evidence-storage.port.ts`, `docs/tasks/.../AUDIT.md` |
| Required gates | `verify-task.ps1`, targeted adapter tests, typecheck, lint, full unit, build, scope diff, `verify-handoff.ps1`, Tier 3 LIGHT audit (cumulative PASS rounds 1–3 at HEAD `ad57f3854f1e9774d914c629a46a97379c3ceb65`); merge authority `T0_MERGE_DECISION` |
| Current execution round | `3` |
| Current audit round | `cumulative PASS rounds 1–3 at HEAD `ad57f3854f1e9774d914c629a46a97379c3ceb65` (round 1 PASS at `7f12b9d`; round 2 PASS at `36cbbef`; round 3 PASS at `d368cad`/`21fe534`/`fb819a1`/`ad57f38` — see `AUDIT.md` rounds 1–3 verdict rows) |
| Next gate | `T0_MERGE_DECISION` (Tier 3 cumulative PASS complete; PR #32 already OPEN; remote CI Quality + Integration PASS on `21fe534` and `fb819a1`). Implementation SHAs (all frozen, none amended/force-pushed/rebased): round 1 at `7f12b9d`; round 2 at `36cbbef`; round 3 substantive at `d368cad`; round 3 test-alignment at `21fe534`; round 3 docs at `fb819a1`; round 3 evidence at `ad57f38`. Status `READY_FOR_AUDIT` (verifier-compatible); self-declared `ACCEPTED` is NOT set: per `00-global-rules.md`, `ACCEPTED` is reserved for post-merge/main verification, owned by T0. |
| T0 source-review findings | Round 2: F1 resolveKey indexOf value bug; F2 writeChunk short-write; F3 read stream raw error / handle leak; F4 directory = NOT_FOUND; F5 close-before-unlink ordering. Round 3: F4 symlink-following via realpath collapse; F5 cleanup failure swallowed; F1/F2/F3/F5 tests insufficiently deterministic; error-surface message/cause verbatim propagation. Substantive closure at `d368cad88b0f2ad8686336d24ec96684f8d27e02`. Post-CI test alignment at `21fe5342b0105d19b5e4101d31c2fe076c0bb619` (F4 symlink-alias tests corrected to expect INVALID_KEY uniformly across exists/read/stat/delete/write, matching the adapter pre-check lstat behavior). All T0 findings closed at HEAD `ad57f3854f1e9774d914c629a46a97379c3ceb65`. |

## 1. Outcome

### 1.1 User-visible outcome

- `makeLocalVpsEvidenceStorageAdapter(env, resolver?)` is callable from any application context; it returns a value that satisfies the provider-neutral `EvidenceStorage` port from ER-001.
- All five port methods (`write`, `read`, `delete`, `exists`, `stat`) work against a VPS-controlled directory; write is atomic and never overwrites; read is streaming; probes never stream body.
- Configuration mistakes (missing, blank, non-absolute, missing, non-directory, symlink root) fail closed with `INVALID_REQUEST`.
- Storage key mistakes (backslash, traversal, empty segments, NUL/control chars, absolute paths, URLs, symlink escapes) fail closed with `INVALID_KEY`.
- Errors on public surface are typed via the port's `EvidenceStorageError` and never leak absolute path, root, raw Node stack, or secret.

### 1.2 Non-goals

- No DB / Prisma / migration.
- No `app/**` API route or runtime composition.
- No `src/domains/media/**` or `@vercel/blob` changes.
- No `EvidenceRecord`, checksum, audit, retention, quarantine, backup/restore.
- No public/signed URL.
- No `package.json`/lockfile change.
- No `docs/PLANNER_HANDOVER.md` change.
- No neutral contract repository or `CONTRACT-02B` change.
- No production/staging credentials or real data.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/evidence/evidence-storage.port.ts` (ER-001, post-merge) | The interface this adapter must satisfy; port surface is the contract. |
| `EV-02` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A03) | Authoritative source for the VPS filesystem adapter requirement. |
| `EV-03` | `vitest.unit.config.ts` | Test lane that runs in CI; targeted tests must work inside it without DB. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Root resolved via dependency injection (`PathResolver` function, default reads `HRP_EVIDENCE_ROOT`); adapter never reads `process.env` directly. | `CHOSEN` |
| `DEC-02` | Storage key layering: `asStorageKey` (port) + adapter-layer checks (backslash, traversal, empty segments, NUL/control, symlink containment). | `CHOSEN` |
| `DEC-03` | Symlink enforcement via `fs.realpath` per segment; rejected via `INVALID_KEY` if realpath resolves outside canonical root. | `CHOSEN` |
| `DEC-04` | Use `'wx'` flag for `write` — OS-level atomic no-overwrite; concurrent writers get exactly one success, rest see `ALREADY_EXISTS`. | `CHOSEN` |
| `DEC-05` | File/dir permission: 0o640 file, 0o750 directory. | `CHOSEN` |
| `DEC-06` | Stream read via `FileHandle.createReadStream()`; consumer drains single-use `AsyncIterable<Uint8Array>`. | `CHOSEN` |
| `DEC-07` | `contentType`/`etag` always `null` from adapter (ER-003 owns metadata). | `CHOSEN` |
| `DEC-08` | Error mapping from Node errno codes to port reason enum; no raw errors / stacks / paths on the public surface. | `CHOSEN` |
| `DEC-09` | No application wiring in this slice (composition is a later slice). | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Adapter implements `EvidenceStorage` from `evidence-storage.port.ts` (ER-001) for all five methods: `write`, `read`, `delete`, `exists`, `stat`. |
| `RQ-02` | Root directory is accepted via dependency injection. Adapter exposes a `PathResolver` interface and a `defaultEvidencePathResolver` reading `HRP_EVIDENCE_ROOT` from a passed env object. |
| `RQ-03` | Root validation: missing, blank, relative, non-existent, non-directory, or symlink root must throw `EvidenceStorageError` (reason `INVALID_REQUEST`) either at construction (sync-rejectable cases) or on first call (I/O cases). |
| `RQ-04` | Storage key validation layered atop the port's `asStorageKey`: reject backslash, `..`/`.`, empty segments, trailing slash, NUL/control characters, absolute paths, URL schemes, key escaping canonical root, broken or symlinked intermediate segments. All return `INVALID_KEY`. |
| `RQ-05` | Write streams `AsyncIterable<Uint8Array>` directly to file via `fsPromises.open(path, 'wx')`. No full payload load into RAM. On stream failure mid-write, partial file is removed. |
| `RQ-06` | Concurrent writes to the same key: exactly one succeeds; others receive `ALREADY_EXISTS` (OS-level atomic via `'wx'`). |
| `RQ-07` | Read returns single-use async byte stream from open file handle. Mid-read errors mapped to `STREAM_FAILURE`. |
| `RQ-08` | `exists` returns `false` only for `NOT_FOUND`; permission/storage errors throw. `stat` and `exists` never stream body. |
| `RQ-09` | `delete` on missing throws `NOT_FOUND`. |
| `RQ-10` | `stat.contentType = null`, `stat.etag = null`, `write.etag = null` (ER-003 owns metadata; no sidecar). |
| `RQ-11` | Errors carry typed reason and storageKey (where applicable). No raw Node error, stack trace, absolute path, root path, or secret on the public error surface. |

### 4.2 Scope boundaries

- **In:** `src/domains/evidence/local-vps-evidence-storage.adapter.ts`, `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`, `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/**`.
- **Out:** `src/domains/evidence/evidence-storage.port.ts` (ER-001; no modification), all DB / Prisma / API / Media-service code, all package metadata.
- **Allowed task artifacts:** `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/**`.

### 4.3 Domain boundaries

- **Data/state:** `N/A — adapter is stateless; configuration passed in via resolver.`
- **Permission/security:** Boundaries enforced as per RQ-03, RQ-04, RQ-06, RQ-11. File mode `0o640`, dir mode `0o750`.
- **Interface/API:** Implements the `EvidenceStorage` interface from ER-001; no other public types.
- **Migration/rollback:** `N/A — no schema or persistent config in this slice.`

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `local-vps-evidence-storage.adapter.ts` | Root validation: `validateRoot` + `defaultEvidencePathResolver` rejects blank/non-absolute (sync) and missing/file/symlink (lazy I/O via first-call). | `targeted unit tests > root validation` | Tests fail on a real Linux CI run. |
| `STEP-02` | `local-vps-evidence-storage.adapter.ts` | Key validation: port-layer `asStorageKey` + adapter-layer `validateKeyStructure` + `resolveKey` containment via `fs.realpath`. | `targeted unit tests > storage key validation` | Tests fail on a real Linux CI run. |
| `STEP-03` | `local-vps-evidence-storage.adapter.ts` | Operations: `write` (`'wx'`, streaming, mode 0o640, cleanup), `read` (stream from handle), `delete` (unlink), `exists` (access), `stat` (stat). Error mapping from errno. | `targeted unit tests > write / read / delete / stat / exists` | Tests fail or fs surface differs unexpectedly. |
| `STEP-04` | `local-vps-evidence-storage.adapter.test.ts` | Targeted test suite covering all §4.1 requirements + error surface safety. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` | Test failure other than platform-specific symlink skips. |
| `STEP-05` | All gates | Typecheck, lint, full unit, build, scope diff. | `tsc --noEmit`, `npm run lint`, `npm run build`, `vitest run --config vitest.unit.config.ts`, `git diff --check` | Any non-baseline failure. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Adapter implements all five `EvidenceStorage` methods with correct types. | `npx vitest run src/domains/evidence/evidence-storage.port.test.ts --config vitest.unit.config.ts`; adapter tests cover method-level semantics. |
| `AC-02` | `makeLocalVpsEvidenceStorageAdapter` accepts a `PathResolver` and validates root: missing / blank / relative / non-directory / symlink root → `INVALID_REQUEST`. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > root validation`. |
| `AC-03` | Storage key enforcement: `\` , `..` , empty segment, trailing `/`, NUL/control char → `INVALID_KEY`. Key escaping canonical root, broken symlink, or target/parent symlink that escapes root → `INVALID_KEY`. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > storage key validation`. |
| `AC-04` | Write round-trip: synthetic multi-chunk bytes → read → exact bytes. Empty object → `sizeBytes: 0`. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > round-trips multi-chunk synthetic bytes + writes empty object (zero bytes)`. |
| `AC-05` | Duplicate write → `ALREADY_EXISTS`. Concurrent writes → exactly one success (best-effort guarantee via `'wx'`; rest observe `ALREADY_EXISTS`). | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > rejects duplicate writes with ALREADY_EXISTS + rapid sequential writes of same key`. |
| `AC-06` | Source stream fails mid-stream → partial file cleaned up; `STREAM_FAILURE` returned. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > cleans up partial artifact when source fails mid-stream`. |
| `AC-07` | Missing read/stat/delete → `NOT_FOUND`. `exists` returns `false` for missing. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > delete on missing throws NOT_FOUND + read on missing throws NOT_FOUND + stat on missing throws NOT_FOUND + exists returns true after write, false on missing`. |
| `AC-08` | `stat.contentType = null`, `stat.etag = null`, `write.etag = null`. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > stat returns contentType=null, etag=null, lastModified non-null`. |
| `AC-09` | `stat` and `exists` do not stream body. | Code review + adapter uses `fsPromises.stat` / `fsPromises.access` (no body open). Manual document review. |
| `AC-10` | No absolute filesystem path or root path appears in error message or return value. | `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts > error messages never include the absolute root path`. |
| `AC-11` | Targeted adapter tests + full unit + typecheck + lint + build all pass. | `tsc --noEmit`; `vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`; `vitest run --config vitest.unit.config.ts`; `eslint .`; `npm run build`. |
| `AC-12` | Allowlist scope intact; ER-001 port file untouched; verify-task and verify-handoff passes. | `git status --porcelain`; `git diff --name-only f04bc94f..HEAD`; `git diff --check HEAD`; `verify-task.ps1`; `verify-handoff.ps1`. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-03` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-01` | `AC-02` |
| `RQ-04` | `STEP-02` | `AC-03` |
| `RQ-05` | `STEP-03` | `AC-04`, `AC-06`, `AC-11` |
| `RQ-06` | `STEP-03` | `AC-05` |
| `RQ-07` | `STEP-03` | `AC-04`, `AC-11` |
| `RQ-08` | `STEP-03` | `AC-07`, `AC-09` |
| `RQ-09` | `STEP-03` | `AC-07` |
| `RQ-10` | `STEP-03` | `AC-08` |
| `RQ-11` | `STEP-03`, `STEP-04` | `AC-10`, `AC-11` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Adapter accidentally couples to provider (e.g. hardcoded `node:fs` syscall types in port surface). | Adapter is in a different file; lint rule `no-restricted-imports` does not block `node:fs` here; constraint enforced via RQ-11 surface audit + HANDOFF §5. |
| `RISK-02` | Future adapter change leaks raw filesystem paths on public surface. | `AC-10` test + `safeMessage()` in adapter strips path substrings. |
| `RISK-03` | TOCTOU between `exists` and `read` (symlink substitution race). | Accepted; documented in HANDOFF §5.1; mitigation at higher layer (EvidenceGateway) in a future slice. POSIX symlink enforcement at the adapter reduces but does not eliminate the race. |
| `RISK-04` | Tests fail on Windows (POSIX-specific symlink assertions). | `it.skipIf(!IS_POSIX)` markers; Linux CI exercises them for real. |
| `RISK-05` | Drift toward fallback in-memory implementation. | Out of scope (RQ-04 + ER-001 contract already forbid in-memory production fallback). |

## 8. Open Questions

- None. All Tier 1 decisions resolved against TASK.md baseline spec.

## 11. Tier 0 Source-Review Findings -- Revision Round 2 + Round 3

### 11.1 Round 2 closure (preserved from prior SHA `36cbbef`)

Tier 0 source-review (after Tier 3 round 1 PASS at `7f12b9d`) identified five defects that were not covered by the round-1 audit. Tier 1 addressed each one in revision round 2 at HEAD `36cbbef` (this section is a verbatim closure record; the corresponding code/test diff is the authoritative evidence).

| ID | Severity | Finding (T0 source-review) | Closure at `36cbbef` | Test |
|---|---|---|---|---|
| `F1` | P1 | `resolveKey` used `segments.indexOf(seg)` — value-based lookup. With key `a/a/file.bin`, when `a` exists but the second `a` does not yet, `indexOf` returned the index of the first `a` and the loop took the ENOENT branch with the wrong remaining slice, producing a misrouted path (extra segment). | `resolveKey` now iterates segments by INDEX (`for (let i = 0; i &lt; segments.length; i++)`); on ENOENT the remaining tail is `segments.slice(i)`, anchored positionally. No `indexOf` of value anywhere in the resolver. | `LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index) > writes and reads back a key with repeated segments (a/a/file.bin)`; `… > writes and reads back a triple-repeated segment key (x/x/x/file.bin)`. Both PASS. Filesystem ground-truth check confirms exact path `ROOT/a/a/file.bin` and `ROOT/x/x/x/file.bin` with no spurious sibling segments. |
| `F2` | P1 | `handle.write(chunk)` return value was discarded; `total += chunk.byteLength` added the full chunk length regardless of bytes actually persisted. Short writes would inflate `sizeBytes` and leave a truncated file. | `writeChunkAll(handle, chunk)` retries short writes until the whole chunk is persisted, reading the actual `bytesWritten` from the `{ bytesWritten, buffer }` return object. `drainSourceToHandle` accumulates `writeChunkAll` results — the returned `total` equals the on-disk size. | `LocalVpsEvidenceStorageAdapter — F2 regression (short write loop) > sizeBytes equals the count of bytes actually persisted` (8 KiB payload) and `… > write does not throw when the OS returns a short write; sizeBytes = bytes actually written` (5000 bytes split into 7 pieces of sizes `[1, 17, 4097, 41, 700, 80, 64]`). Both PASS; in both cases `result.sizeBytes` matches the OS `stat.size`. |
| `F3` | P1 | `read()` returned `fileHandleToStream(handle)` which wrapped `FileHandle.createReadStream()`. Late errors during consumer drain surfaced as raw Node errors with `errno`/stack/path; the handle was not reliably closed on consumer cancellation. | `fileHandleToStream` is now an `async generator` (`producerFn`) that loops over `handle.read(buf, 0, 64 KiB, null)`. Late read errors are caught and rethrown as `EvidenceStorageError('STREAM_FAILURE', 'read stream failed mid-drain', null)` — no errno, no path, no stack on the public surface. The handle is closed in a `finally` block, which fires on success, on mid-drain error, and on consumer cancellation. | `LocalVpsEvidenceStorageAdapter — F3 regression (read stream handles close + late errors) > returns a typed STREAM_FAILURE error when the underlying read fails mid-drain` PASS (handle patched to throw raw EIO on second chunk; outer surface is typed `STREAM_FAILURE`; second call confirms no `EIO` / absolute path / `injected` substrings in the message). `… > closes the file handle when the consumer cancels iteration mid-drain` PASS (256 KiB payload drained only to first chunk; second read on same key succeeds, observable indicator that handle was closed). |
| `F4` | P1 | `exists(directoryKey)` returned `true` (F_OK passes on directories), but `read(directoryKey)` could not drain. `delete(directoryKey)` relied on `unlink`'s `EISDIR` (mapped to `PERMISSION_DENIED`, which is wrong semantics). Directories were inconsistently treated across the four probe operations. | New helper `statObject(targetPath, key)` runs `lstat` and uniformly throws `NOT_FOUND` when `!s.isFile()`. `read`/`delete`/`stat`/`exists` all route through this boundary. `delete` no longer relies on `unlink`'s `EISDIR` — directory probes are pre-rejected before `unlink` is called. | `LocalVpsEvidenceStorageAdapter — F4 regression (non-regular nodes are NOT_FOUND) > exists() returns false for a directory` PASS; `… > read() on a directory key throws NOT_FOUND` PASS; `… > stat() on a directory key throws NOT_FOUND` PASS; `… > delete() on a directory key throws NOT_FOUND` PASS (and the directory is verifiably NOT removed); `… > exists() rejects INVALID_KEY for a dangling symlink in the resolved path` SKIPPED on Windows, runs on Linux CI (alias keys uniformly INVALID_KEY, NOT exists=false). |
| `F5` | P2 | On write failure, partial artifact cleanup ran `unlink(targetPath)` BEFORE the `finally` block closed the handle. The handle was still open to a path that may already be unlinked. Cleanup errors were silently swallowed, which could mask a residual partial file. | Cleanup is now sequenced inside `finally`: `await handle.close().catch(() => {})` first, then `await fsPromises.unlink(targetPath).catch(() => {})`. `partialCleanupNeeded` flag is set in the catch block and acted on only after close completes. Public invariant is "no partial artifact after a failure." | `LocalVpsEvidenceStorageAdapter — F5 regression (cleanup ordering) > closes the handle before unlinking the partial artifact on stream failure` PASS (after-stream-failure `existsSync` on the target path returns `false`; a follow-up write to the SAME key succeeds — i.e. cleanup actually ran, not silently swallowed). `… > preserves typed error surface when cleanup itself fails (path never leaks)` PASS (the thrown `EvidenceStorageError` carries `storageKey === request.storageKey`, and the message contains neither the absolute root path nor the key string). |

### 11.2 Round 3 closure (T0 source-review delta after PR #32 HOLD)

After PR #32 was placed on `HOLD` by T0 with the finding that round-2 closure lacked sufficient evidence, Tier 1 delivered the round-3 substantive corrections at HEAD `d368cad88b0f2ad8686336d24ec96684f8d27e02` (final branch HEAD `21fe5342b0105d19b5e4101d31c2fe076c0bb619`) and final test alignment + remote CI PASS at HEAD `21fe5342b0105d19b5e4101d31c2fe076c0bb619`. The corrections stay within the allowlist (`adapter`, `adapter tests`, `TASK.md`, `HANDOFF.md`); `AUDIT.md` and the ER-001 port remain untouched.

| ID | Round 2 status | Round 3 finding | Closure at `d368cad88b0f2ad8686336d24ec96684f8d27e02` (final head `21fe5342b0105d19b5e4101d31c2fe076c0bb619` only adds test alignment) | Test |
|---|---|---|---|---|
| `F1` | Addressed (`indexOf` → index iteration) | Test was not deterministic: the previous F1 test happened to work because `write()` lazily `mkdir`ed the parent chain, masking the `indexOf` bug. | Logic preserved at round-2 form (index-based iteration, `slice(i)` on ENOENT). | `… F1 regression (resolveKey by index, pre-existing parent) > resolves a/a/file.bin when <root>/a exists and <root>/a/a is missing` PASS — pre-creates `root/a`, leaves `root/a/a` absent, then writes `a/a/file.bin` and verifies exact path `root/a/a/file.bin` on disk (no spurious sibling). `… > resolves x/x/x/file.bin when <root>/x exists and x/x, x/x/x are missing` PASS — same shape, three levels of repeated segment. |
| `F2` | Addressed (write-all loop on `bytesWritten`) | Test only verified the happy-path `sizeBytes === stat.size` invariant; did NOT inject a short-write to exercise the loop. | Logic preserved; zero-progress guard added: `writeChunkAll` throws `STORAGE_UNAVAILABLE` if `bytesWritten <= 0` (refuses to loop forever on a buggy/hostile backend). | `… F2 regression > writeChunkAll covers short writes by looping until the chunk is fully drained` PASS — fake handle returns 3 then 4 bytes for a 7-byte chunk; helper returns 7, called exactly twice, offset advances to 3 between calls. `… > writeChunkAll throws STORAGE_UNAVAILABLE on zero-progress (no infinite loop)` PASS — fake handle always returns 0 bytesWritten; helper rejects after exactly 1 iteration. `… > writeChunkAll throws STORAGE_UNAVAILABLE when bytesWritten is non-integer / negative` PASS for `-1, 1.5, NaN, Infinity`. `… > sizeBytes equals the count of bytes actually persisted for a real write` PASS (8 KiB sanity). `… > sizeBytes matches a chunked (7-piece) source end-to-end` PASS (5000 bytes / 7 pieces). `… > adapter.write uses short-write-aware loop end-to-end (injected via fsPromises.open spy)` PASS — `vi.spyOn(fsPromises, 'open')` wraps the real handle so its `write` reports 3 bytesWritten on the first call (after actually persisting 3) then delegates; on-disk file ends up 7 bytes, byte-exact, and `result.sizeBytes === 7`. |
| `F3` | Addressed (async generator + finally close) | The "second read on the same key succeeds" check was insufficient: it proved the FILE was no longer exclusively locked, not that THIS handle was closed. | Logic preserved: `fileHandleToStream` is an `async generator` with a `finally` block that calls `handle.close()`. The wrapper accepts an optional `storageKey` so late read errors carry the read request's key, not the write request's. | `… F3 regression > fileHandleToStream calls handle.close() exactly once on EOF` PASS — real `FileHandle.close` is wrapped in a counter spy; counter increments exactly 1 after a normal drain. `… > fileHandleToStream calls handle.close() exactly once on late mid-drain error` PASS — `handle.read` patched to throw raw EIO on the 2nd call; counter increments 1 even on error. `… > fileHandleToStream calls handle.close() when the consumer cancels iteration mid-drain` PASS — consumer breaks after first chunk; counter increments 1. `… > late mid-drain error is surfaced as STREAM_FAILURE with safe message and storageKey` PASS — source throws raw `EIO` error with embedded sentinel `/sentinel/absolute/PII_leaked`; surfaced error carries `reason='STREAM_FAILURE'`, `storageKey=key`, and the message contains no `sentinel`, no `PII_leaked`, no `EIO`, no `injected`. |
| `F4` | Addressed (per-component realpath + storage-object boundary) | Realpath collapses symlinks BEFORE the inode is examined, so a symlink-to-regular-file inside the root is treated as the target file (`read/stat/delete` succeed; `delete(alias)` removes the target). The round-2 contract check after `realpath` was the wrong layer for alias rejection. | `resolveKey` now `lstat`s each ORIGINAL path component BEFORE any `realpath` follow-through. If `lstat.isSymbolicLink()` is true, the key is rejected with `INVALID_KEY` for both intermediate directories and leaf segments. Containment check + error semantics from round 2 are preserved. TOCTOU residual risk between `lstat` and `open` is acknowledged but not claimed to be fully solved. **Current state (round 3 final)**: every port operation on an alias key — `write`, `read`, `stat`, `exists`, `delete` — rejects with `INVALID_KEY`. There is NO `exists=false` or `NOT_FOUND` for symlink-alias keys; the adapter never follows the alias. | `… F4 regression > write rejects a leaf alias that points to a regular file inside root` PASS — `real.bin` exists at `root/`; `tenant-1/alias.bin` symlinks to it; write throws `INVALID_KEY` and `real.bin` is untouched. `… > read / stat / exists / delete on a leaf alias do NOT follow the alias` PASS — `exists`/`read`/`stat`/`delete` all reject with `INVALID_KEY` (NOT `false` / `NOT_FOUND`); `real.bin` is verifiably NOT removed by `delete(alias)`. `… > read / stat / exists / delete on an intermediate-directory alias do NOT follow the alias` PASS — symlink at `tenant-1/aliased-dir` points to a real directory `real-dir` containing `evidence.bin`; `exists`/`read`/`stat`/`delete` all reject with `INVALID_KEY`; `evidence.bin` is untouched. `… > write through an intermediate-directory alias is rejected before the leaf is opened` PASS — write throws `INVALID_KEY`, inner file untouched. `… > exists() rejects INVALID_KEY for a dangling symlink in the resolved path` (POSIX-only) PASS / SKIPPED on Windows. `… > exists() rejects INVALID_KEY for a symlink whose target is a non-regular node` PASS / SKIPPED on Windows. (Round-3 test-alignment commit `21fe534` corrected the test expectations from `false`/`NOT_FOUND` to `INVALID_KEY` to match the corrected adapter semantics; CI run `35683018593` confirmed the corrected tests pass on Linux.) |
| `F5` | Addressed (close-before-unlink) | (a) `handle.close()` failures were silently swallowed — a successful drain with a failed close still reported `STORAGE_UNAVAILABLE` only on stream failure, never on close. (b) `unlink()` non-`ENOENT` errors were silently swallowed in the catch, so a partial file remaining on disk was indistinguishable from successful cleanup. | `write` now tracks three independent failure modes — `drainError`, `closeError`, `unlinkError` — and surfaces all three via typed `EvidenceStorageError` with the request `storageKey`. Decision order: `unlinkError` wins (cleanup incomplete is the most important fact for the caller, since the partial file may still be on disk); then `drainError`; then `closeError`. | `… F5 regression > on stream failure + injected unlink EACCES: surfaces typed error with safe message + request storageKey` PASS — `vi.spyOn(fsPromises, 'unlink')` injects an EACCES error with embedded sentinel `/tmp/EACCES_leaked`; surfaced error has `reason='STORAGE_UNAVAILABLE'`, message contains no `sentinel`, no `EACCES_leaked`, no `tempDir`, and `storageKey` is the request key. `… > close failure with successful drain is surfaced as STORAGE_UNAVAILABLE (no silent success)` PASS — `vi.spyOn(fsPromises, 'open')` wraps the real handle so its `close()` throws raw EBADF with embedded sentinel; surfaced error has `reason='STORAGE_UNAVAILABLE'`, message contains no `sentinel`, no `EBADF_leaked`, no `tempDir`, and `storageKey` is the request key. `… > partial file remains on disk when unlink fails (cleanup is incomplete, NOT silently successful)` PASS — `vi.spyOn(fsPromises, 'unlink')` injects EBUSY; after the write rejects, `existsSync` on the target path returns `true` — the adapter does not pretend cleanup succeeded. `… > close failure leaves the file on disk (the adapter never claims success)` PASS — same shape as above, drain succeeds but close fails; the file is on disk, the promise rejects with `STORAGE_UNAVAILABLE`. `… > happy-path cleanup: closes the handle before unlinking on stream failure` PASS (round-2 invariant preserved: target file is removed; a follow-up write to the same key succeeds). |

#### 11.2.1 Error-surface sanitization (T0 round-3 RQ-04)

A new section `… error surface safety (round 3 sanitization)` adds three tests proving the adapter boundary does NOT copy message/cause text from any caller-supplied error (including typed `EvidenceStorageError`) into the surfaced error.

| Source throws | Surfaced reason | Surfaced message whitelist |
|---|---|---|
| `EvidenceStorageError('STREAM_FAILURE', '/SENTINEL/ABS/PATH/LEAKED-via-message', null)` | `STREAM_FAILURE` | one of the fixed safe-message whitelist entries — does not contain `SENTINEL`, `LEAKED`, `ABS` |
| `new Error('source failure with SECRET-PII-123-456-789 embedded')` | `STREAM_FAILURE` | safe whitelist — does not contain the PII sentinel nor `tempDir` |
| `new Error('ENOSPC raw message /sensitive/blob')` with `code: 'ENOSPC'` | `STORAGE_UNAVAILABLE` (reason whitelist) | safe whitelist — does not contain `ENOSPC`, `sensitive`, `raw message`, nor `tempDir` |

The implementation introduces a narrow `SAFE_STREAM_MESSAGES` table and `safeMessage(reason)` helper. `drainSourceToHandle` maps any inner error to a whitelisted reason via `sanitizeReason`, then constructs a fresh `EvidenceStorageError` with the whitelisted message. The outer `write` re-anchors `storageKey` to the request key before throwing.

#### 11.2.2 Implementation file diff scope (round 3)

```
src/domains/evidence/local-vps-evidence-storage.adapter.ts   # adapter: round-3 F4 symlink pre-check + round-3 F5 close/unlink surface + round-3 error sanitization; exports writeChunkAll + fileHandleToStream @internal helpers (FROZEN at d368cad)
src/domains/evidence/local-vps-evidence-storage.adapter.test.ts  # F1/F2/F3/F5 tests rewritten to deterministically activate failure modes; new F4 alias tests; new error-surface sanitization tests (test-alignment at 21fe534 — no source change)
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md  # §0 control updated to cumulative Tier 3 PASS; §11.2 round-3 closure; §9.1/§9.2 + §10 revision log updated (this commit)
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md  # §0 control updated to cumulative Tier 3 PASS; §5 F4 stale wording corrected; revision log updated (this commit)
```

No other paths touched. No ER-001 port change. No `package.json` change. No AUDIT.md change (Tier 3-owned). No staging/production/credential use.

#### 11.2.3 Audit delta boundary (round 3)

Tier 3 LIGHT cumulative audit covers the delta `7f12b9d..ad57f3854f1e9774d914c629a46a97379c3ceb65` (covers round 2 closure at `36cbbef`, round 3 substantive closure at `d368cad`, test alignment at `21fe534`, docs at `fb819a1`, evidence at `ad57f38`). The boundary excludes:
- The original implementation commit `7f12b9d` (round 1 PASS).
- The docs follow-up commit `614deb8` (metadata alignment only).
- The PR-merge commit on `origin/main` (separate lane).
- Any path outside `src/domains/evidence/{local-vps-evidence-storage.adapter,local-vps-evidence-storage.adapter.test}.ts` and the two task docs.

#### 11.2.4 Residual test-cleanup debt (recorded, not fixed in this slice)

Tier 3 rerun (local + Linux CI) surfaced a `DeprecationWarning: Closing a FileHandle object on garbage collection is deprecated` from the F5 round-3 regression tests that inject `handle.close()` failures (`vi.spyOn(fsPromises, 'open')` wraps the real `FileHandle`; on injected close failure, the test's wrapper may not always invoke the underlying `handle.close()` before the `FileHandle` falls out of scope). This is a **test-only** debt: production paths guarantee `handle.close()` in a `finally` block (`fileHandleToStream`, `write`). The warning does NOT affect correctness, security, or coverage — it indicates that some failure-injection tests could close the spy handle more eagerly. Out-of-scope for this delivery slice; recorded for the next test-hygiene pass. Source/tests are NOT modified by this commit.

### 9.1 Implementation file diff scope (round 3)

```
src/domains/evidence/local-vps-evidence-storage.adapter.ts   # adapter: round-3 F4 symlink pre-check + round-3 F5 close/unlink surface + round-3 error sanitization; exports writeChunkAll + fileHandleToStream @internal helpers (FROZEN at d368cad)
src/domains/evidence/local-vps-evidence-storage.adapter.test.ts  # F1/F2/F3/F5 tests rewritten to deterministically activate failure modes; new F4 alias tests; new error-surface sanitization tests (test-alignment at 21fe534 — no source change)
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md  # §0 control updated to cumulative Tier 3 PASS; §11.2 round-3 closure; §9.1/§9.2 + §10 revision log updated (this commit)
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md  # §0 control updated to cumulative Tier 3 PASS; §5 F4 stale wording corrected; revision log updated (this commit)
```

No other paths touched. No ER-001 port change. No `package.json` change. No AUDIT.md change (Tier 3-owned). No staging/production/credential use.

### 9.2 Audit delta boundary

Tier 3 LIGHT cumulative audit covers the delta `7f12b9d..ad57f3854f1e9774d914c629a46a97379c3ceb65` (covers round 2 closure at `36cbbef`, round 3 substantive closure at `d368cad`, test alignment at `21fe534`, docs at `fb819a1`, evidence at `ad57f38`). The boundary excludes:
- The original implementation commit `7f12b9d` (round 1 PASS).
- The docs follow-up commit `614deb8` (metadata alignment only).
- The PR-merge commit on `origin/main` (separate lane).
- Any path outside `src/domains/evidence/{local-vps-evidence-storage.adapter,local-vps-evidence-storage.adapter.test}.ts` and the two task docs.



## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 (execution) | Tier 1 delivery complete at SHA `7f12b9d`; status held at `READY_FOR_AUDIT`. | All §6 Acceptance criteria met; targeted + full unit + typecheck + lint + build green; ER-001 carry-forward unchanged; no env/DB touched; forbidden paths clean. |
| 1 (audit) | Tier 3 LIGHT round 1 `PASS` at HEAD `7f12b9d`. | All 12 AC verified by Tier 3 (see `AUDIT.md` §2 + §4). No findings. Boundary / key / error-surface audits clean. TOCTOU residual risk explicitly enumerated (RISK-03) and accepted as gateway-layer mitigation. ER-001 port file bit-stamp unchanged vs `f04bc94`. |
| 2 (post-audit delivery) | Status remains `READY_FOR_AUDIT` (not `ACCEPTED`) until remote `PUSH_AND_OPEN_PR` → CI → `T0_MERGE_DECISION` resolves. | `ACCEPTED` is reserved for post-merge/main verification per `00-global-rules.md`. The merge decision belongs to T0, not Tier 1. |
| 2 (T0-source-review) | Status `READY_FOR_AUDIT` → `REVISION_REQUIRED`. New implementation SHA `36cbbef` carries F1..F5 closures. Round-1 audit verdict retained; round-2 audit will be applied to the delta `7f12b9d..36cbbef`. Implementation commit `7f12b9d` not amended; `AUDIT.md` not modified (Tier 3-owned). | T0 source review identified five correctness gaps not covered by round-1 audit. Each is closed by a deterministic regression test (§11.1) and by a typed, fail-closed code fix. Round-2 audit must confirm round-1 properties are preserved AND new regression tests are sufficient. |
| 3 (T0-source-review delta on PR #32 HOLD) | Status `REVISION_REQUIRED` → `READY_FOR_AUDIT`. New implementation SHA `d368cad88b0f2ad8686336d24ec96684f8d27e02` carries the F4/F5 hardening + error-surface sanitization + deterministic regression tests. Round-1 audit verdict retained; round-2 audit will be applied to the delta `7f12b9d..21fe5342b0105d19b5e4101d31c2fe076c0bb619`. Implementation commits `7f12b9d` and `36cbbef` are not amended, force-pushed, or rebased. `AUDIT.md` not modified (Tier 3-owned). | T0 source review on PR #32 determined that round-2 closure lacked sufficient evidence for F1..F5 (round-3 RQ-01..RQ-04). Round 3 hardens `resolveKey` (per-component lstat before canonicalization, rejecting symlinks to regular files inside the root at the FIRST non-canonical segment), surfaces cleanup failures via typed errors with the request `storageKey`, sanitizes all error messages at the adapter boundary so caller-supplied PII / absolute paths / sentinels cannot leak, and rewrites regression tests to deterministically activate the original failure modes via local Vitest mocks/spies (no new testing framework). |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial contract | P0-A03 / ER-002 from realignment plan. |
| `v1.0` | `2026-09-22` | Status `ACCEPTED` → `READY_FOR_AUDIT`; Next gate → `PUSH_AND_OPEN_PR → CI → T0_MERGE_DECISION`; audit round 0 → 1 (Tier 3 LIGHT PASS at HEAD `7f12b9d`). | Post-audit delivery: metadata alignment per `00-global-rules.md` (ACCEPTED is post-merge only); T0 keeps merge authority. |
| `v1.0` | `2026-09-22` | Status `READY_FOR_AUDIT` → `REVISION_REQUIRED`; execution round 1 → 2; new implementation SHA `36cbbef` carrying F1..F5 closures; Next gate → `TIER3_AUDIT_ROUND2 → PUSH_AND_OPEN_PR → CI → T0_MERGE_DECISION`; forbidden paths add `AUDIT.md` (Tier 3-owned). | T0 source-review round (F1..F5) — see §11.1 for per-finding closure record. |
| `v1.0` | `2026-09-22` | Status `REVISION_REQUIRED` → `READY_FOR_AUDIT`; execution round 2 → 3; new substantive implementation SHA `d368cad88b0f2ad8686336d24ec96684f8d27e02`; final test-alignment SHA `21fe5342b0105d19b5e4101d31c2fe076c0bb619` carrying F4 symlink-following fix, F5 cleanup-failure surfacing, F1/F2/F3/F5 deterministic tests, and error-surface sanitization; §11.2 added for round 3 closure. | T0 source-review on PR #32 HOLD — see §11.2 for per-finding round-3 closure record. |
| `v1.0` | `2026-09-22` | Final delivery: cumulative Tier 3 LIGHT PASS rounds 1–3 recorded at HEAD `ad57f3854f1e9774d914c629a46a97379c3ceb65` (PR #32 already OPEN, CI Quality + Integration both PASS). Status `READY_FOR_AUDIT` (verifier-compatible); self-declared `ACCEPTED` is NOT set — `ACCEPTED` is reserved for post-merge/main verification, owned by T0. Next gate → `T0_MERGE_DECISION`. Stale F4 wording in §11.1 and §11.2 corrected: symlink-alias keys uniformly reject with `INVALID_KEY` for `write`/`read`/`stat`/`exists`/`delete` (NO `exists=false` / `NOT_FOUND`). Residual test-cleanup debt (FileHandle GC warning from F5 close-injection tests) recorded in §11.2.4 for the next test-hygiene pass; source/tests are NOT modified by this commit. Implementation SHAs preserved (no amend, no force-push, no rebase): `7f12b9d`, `36cbbef`, `d368cad`, `21fe534`, `fb819a1`, `ad57f38`. | T0 final delivery directive after cumulative Tier 3 PASS. |
