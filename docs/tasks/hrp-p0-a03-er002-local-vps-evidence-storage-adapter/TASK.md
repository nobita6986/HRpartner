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
| Status | `ACCEPTED` |
| Planner | `Tier 1` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge) |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A03) |
| In-scope roots | `src/domains/evidence/local-vps-evidence-storage.adapter.ts`, `src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`, `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/**` |
| Forbidden paths | `docs/PLANNER_HANDOVER.md`, `prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, CRM/shared integration contracts, env/deploy config, discovery/CRM docs, `src/domains/evidence/evidence-storage.port.ts` |
| Required gates | `verify-task.ps1`, targeted adapter tests, typecheck, lint, full unit, build, scope diff, `verify-handoff.ps1`, Tier 3 LIGHT audit |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Tier 3 LIGHT audit (independent) |

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
| `AC-01` | Adapter implements all five `EvidenceStorage` methods with correct types. | `evidence-storage.port.test.ts` indirectly covers port contract; adapter tests cover method-level semantics. |
| `AC-02` | `makeLocalVpsEvidenceStorageAdapter` accepts a `PathResolver` and validates root: missing / blank / relative / non-directory / symlink root → `INVALID_REQUEST`. | `local-vps-evidence-storage.adapter.test.ts > "root validation"` |
| `AC-03` | Storage key enforcement: `\` , `..` , empty segment, trailing `/`, NUL/control char → `INVALID_KEY`. Key escaping canonical root, broken symlink, or target/parent symlink that escapes root → `INVALID_KEY`. | `local-vps-evidence-storage.adapter.test.ts > "storage key validation"` |
| `AC-04` | Write round-trip: synthetic multi-chunk bytes → read → exact bytes. Empty object → `sizeBytes: 0`. | `local-vps-evidence-storage.adapter.test.ts > "write / read / delete / stat / exists" > "round-trips multi-chunk synthetic bytes" + "writes empty object (zero bytes)"` |
| `AC-05` | Duplicate write → `ALREADY_EXISTS`. Concurrent writes → exactly one success (best-effort guarantee via `'wx'`; rest observe `ALREADY_EXISTS`). | `local-vps-evidence-storage.adapter.test.ts > "rejects duplicate writes with ALREADY_EXISTS" + "rapid sequential writes of same key"` |
| `AC-06` | Source stream fails mid-stream → partial file cleaned up; `STREAM_FAILURE` returned. | `local-vps-evidence-storage.adapter.test.ts > "cleans up partial artifact when source fails mid-stream"` |
| `AC-07` | Missing read/stat/delete → `NOT_FOUND`. `exists` returns `false` for missing. | `local-vps-evidence-storage.adapter.test.ts > "delete on missing throws NOT_FOUND"`, `"read on missing throws NOT_FOUND"`, `"stat on missing throws NOT_FOUND"`, `"exists returns true after write, false on missing"` |
| `AC-08` | `stat.contentType = null`, `stat.etag = null`, `write.etag = null`. | `local-vps-evidence-storage.adapter.test.ts > "stat returns contentType=null, etag=null, lastModified non-null"` |
| `AC-09` | `stat` and `exists` do not stream body. | Code review + adapter uses `fsPromises.stat` / `fsPromises.access` (no body open). |
| `AC-10` | No absolute filesystem path or root path appears in error message or return value. | `local-vps-evidence-storage.adapter.test.ts > "error messages never include the absolute root path"` |
| `AC-11` | Targeted adapter tests + full unit + typecheck + lint + build all pass. | `tsc --noEmit`; `vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts`; `vitest run --config vitest.unit.config.ts`; `eslint .`; `npm run build`. |
| `AC-12` | Allowlist scope intact; ER-001 port file untouched; verify-task and verify-handoff passes. | `git diff --name-only f04bc94f..HEAD`; `git diff --check`; `verify-task.ps1`; `verify-handoff.ps1`. |

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

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Adapter slice accepted against TASK §1..§7; status `ACCEPTED`; awaiting Tier 3 LIGHT audit. | All §6 Acceptance criteria met; all gates green; no deviation; no ENV/DB touched; ER-001 carry-forward unchanged. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial contract | P0-A03 / ER-002 from realignment plan. |
