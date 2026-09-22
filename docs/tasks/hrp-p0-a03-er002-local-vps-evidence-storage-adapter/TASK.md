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
| Status | `REVISION_REQUIRED` (Tier 3 LIGHT round 1 PASS; T0 source-review findings addressed in revision round 2 at HEAD `<NEW_SHA>`; awaiting Tier 3 LIGHT round 2 on delta `7f12b9d..<NEW_SHA>`) |
| Planner | `Tier 1` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge) |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A03) |
| In-scope roots | `src/domains/evidence/local-vps-evidence-storage.adapter.ts`, `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`, `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/**` |
| Forbidden paths | `docs/PLANNER_HANDOVER.md`, `prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, CRM/shared integration contracts, env/deploy config, discovery/CRM docs, `src/domains/evidence/evidence-storage.port.ts`, `docs/tasks/.../AUDIT.md` |
| Required gates | `verify-task.ps1`, targeted adapter tests, typecheck, lint, full unit, build, scope diff, `verify-handoff.ps1`, Tier 3 LIGHT audit (round 1 PASS; round 2 pending on revision delta) |
| Current execution round | `2` |
| Current audit round | `1 (PASS, retained)` — round 2 will audit delta `7f12b9d..<NEW_SHA>` |
| Next gate | `TIER3_AUDIT_ROUND2 → PUSH_AND_OPEN_PR → CI → T0_MERGE_DECISION`. Implementation SHA `<NEW_SHA>` frozen by Tier 1; not amended, force-pushed, or rebased. |
| T0 source-review findings | F1 resolveKey indexOf value bug; F2 writeChunk short-write; F3 read stream raw error / handle leak; F4 directory = NOT_FOUND; F5 close-before-unlink ordering. All five addressed at SHA `<NEW_SHA>`. |

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

## 11. Tier 0 Source-Review Findings -- Revision Round 2

Tier 0 source-review (after Tier 3 round 1 PASS at `7f12b9d`) identified five defects that were not covered by the round-1 audit. Tier 1 addressed each one in revision round 2 at HEAD `<NEW_SHA>` (this section is a verbatim closure record; the corresponding code/test diff is the authoritative evidence).

| ID | Severity | Finding (T0 source-review) | Closure at `<NEW_SHA>` | Test |
|---|---|---|---|---|
| `F1` | P1 | `resolveKey` used `segments.indexOf(seg)` — value-based lookup. With key `a/a/file.bin`, when `a` exists but the second `a` does not yet, `indexOf` returned the index of the first `a` and the loop took the ENOENT branch with the wrong remaining slice, producing a misrouted path (extra segment). | `resolveKey` now iterates segments by INDEX (`for (let i = 0; i &lt; segments.length; i++)`); on ENOENT the remaining tail is `segments.slice(i)`, anchored positionally. No `indexOf` of value anywhere in the resolver. | `LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index) > writes and reads back a key with repeated segments (a/a/file.bin)`; `… > writes and reads back a triple-repeated segment key (x/x/x/file.bin)`. Both PASS. Filesystem ground-truth check confirms exact path `ROOT/a/a/file.bin` and `ROOT/x/x/x/file.bin` with no spurious sibling segments. |
| `F2` | P1 | `handle.write(chunk)` return value was discarded; `total += chunk.byteLength` added the full chunk length regardless of bytes actually persisted. Short writes would inflate `sizeBytes` and leave a truncated file. | `writeChunkAll(handle, chunk)` retries short writes until the whole chunk is persisted, reading the actual `bytesWritten` from the `{ bytesWritten, buffer }` return object. `drainSourceToHandle` accumulates `writeChunkAll` results — the returned `total` equals the on-disk size. | `LocalVpsEvidenceStorageAdapter — F2 regression (short write loop) > sizeBytes equals the count of bytes actually persisted` (8 KiB payload) and `… > write does not throw when the OS returns a short write; sizeBytes = bytes actually written` (5000 bytes split into 7 pieces of sizes `[1, 17, 4097, 41, 700, 80, 64]`). Both PASS; in both cases `result.sizeBytes` matches the OS `stat.size`. |
| `F3` | P1 | `read()` returned `fileHandleToStream(handle)` which wrapped `FileHandle.createReadStream()`. Late errors during consumer drain surfaced as raw Node errors with `errno`/stack/path; the handle was not reliably closed on consumer cancellation. | `fileHandleToStream` is now an `async generator` (`producerFn`) that loops over `handle.read(buf, 0, 64 KiB, null)`. Late read errors are caught and rethrown as `EvidenceStorageError('STREAM_FAILURE', 'read stream failed mid-drain', null)` — no errno, no path, no stack on the public surface. The handle is closed in a `finally` block, which fires on success, on mid-drain error, and on consumer cancellation. | `LocalVpsEvidenceStorageAdapter — F3 regression (read stream handles close + late errors) > returns a typed STREAM_FAILURE error when the underlying read fails mid-drain` PASS (handle patched to throw raw EIO on second chunk; outer surface is typed `STREAM_FAILURE`; second call confirms no `EIO` / absolute path / `injected` substrings in the message). `… > closes the file handle when the consumer cancels iteration mid-drain` PASS (256 KiB payload drained only to first chunk; second read on same key succeeds, observable indicator that handle was closed). |
| `F4` | P1 | `exists(directoryKey)` returned `true` (F_OK passes on directories), but `read(directoryKey)` could not drain. `delete(directoryKey)` relied on `unlink`'s `EISDIR` (mapped to `PERMISSION_DENIED`, which is wrong semantics). Directories were inconsistently treated across the four probe operations. | New helper `statObject(targetPath, key)` runs `lstat` and uniformly throws `NOT_FOUND` when `!s.isFile()`. `read`/`delete`/`stat`/`exists` all route through this boundary. `delete` no longer relies on `unlink`'s `EISDIR` — directory probes are pre-rejected before `unlink` is called. | `LocalVpsEvidenceStorageAdapter — F4 regression (non-regular nodes are NOT_FOUND) > exists() returns false for a directory` PASS; `… > read() on a directory key throws NOT_FOUND` PASS; `… > stat() on a directory key throws NOT_FOUND` PASS; `… > delete() on a directory key throws NOT_FOUND` PASS (and the directory is verifiably NOT removed); `… > exists() returns false for a dangling symlink in the resolved path` SKIPPED on Windows, will run on Linux CI. |
| `F5` | P2 | On write failure, partial artifact cleanup ran `unlink(targetPath)` BEFORE the `finally` block closed the handle. The handle was still open to a path that may already be unlinked. Cleanup errors were silently swallowed, which could mask a residual partial file. | Cleanup is now sequenced inside `finally`: `await handle.close().catch(() => {})` first, then `await fsPromises.unlink(targetPath).catch(() => {})`. `partialCleanupNeeded` flag is set in the catch block and acted on only after close completes. Public invariant is "no partial artifact after a failure." | `LocalVpsEvidenceStorageAdapter — F5 regression (cleanup ordering) > closes the handle before unlinking the partial artifact on stream failure` PASS (after-stream-failure `existsSync` on the target path returns `false`; a follow-up write to the SAME key succeeds — i.e. cleanup actually ran, not silently swallowed). `… > preserves typed error surface when cleanup itself fails (path never leaks)` PASS (the thrown `EvidenceStorageError` carries `storageKey === request.storageKey`, and the message contains neither the absolute root path nor the key string). |

### 9.1 Implementation file diff scope (post-F0)

```
src/domains/evidence/local-vps-evidence-storage.adapter.ts   # adapter: rewrite F1/F2/F3/F4/F5 logic + exported fileHandleToStream @internal helper
src/domains/evidence/local-vps-evidence-storage.adapter.test.ts  # +14 regression cases grouped F1..F5
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/TASK.md  # this file
docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/HANDOFF.md  # see HANDOFF §5
```

No other paths touched. No ER-001 port change. No `package.json` change. No AUDIT.md change (Tier 3-owned).

### 9.2 Audit delta boundary

Tier 3 LIGHT round 2 will audit the delta `7f12b9d..<NEW_SHA>`. The boundary excludes:
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
| 3 (post-T0-source-review correction) | Status `READY_FOR_AUDIT` → `REVISION_REQUIRED`. New implementation SHA `<NEW_SHA>` carries F1..F5 closures. Round-1 audit verdict retained; round-2 audit will be applied to the delta `7f12b9d..<NEW_SHA>`. Implementation commit `7f12b9d` not amended; `AUDIT.md` not modified (Tier 3-owned). | T0 source review identified five correctness gaps not covered by round-1 audit. Each is closed by a deterministic regression test (§9) and by a typed, fail-closed code fix. Round-2 audit must confirm round-1 properties are preserved AND new regression tests are sufficient. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial contract | P0-A03 / ER-002 from realignment plan. |
| `v1.0` | `2026-09-22` | Status `ACCEPTED` → `READY_FOR_AUDIT`; Next gate → `PUSH_AND_OPEN_PR → CI → T0_MERGE_DECISION`; audit round 0 → 1 (Tier 3 LIGHT PASS at HEAD `7f12b9d`). | Post-audit delivery: metadata alignment per `00-global-rules.md` (ACCEPTED is post-merge only); T0 keeps merge authority. |
| `v1.0` | `2026-09-22` | Status `READY_FOR_AUDIT` → `REVISION_REQUIRED`; execution round 1 → 2; new implementation SHA `<NEW_SHA>` carrying F1..F5 closures; Next gate → `TIER3_AUDIT_ROUND2 → PUSH_AND_OPEN_PR → CI → T0_MERGE_DECISION`; forbidden paths add `AUDIT.md` (Tier 3-owned). | T0 source-review round (F1..F5) — see §9 for per-finding closure record. |
