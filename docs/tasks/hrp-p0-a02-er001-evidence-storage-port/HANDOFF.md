# HANDOFF — hrp-p0-a02-er001-evidence-storage-port

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a02-er001-evidence-storage-port` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Branch | `codex/t1b-er001-evidence-storage-port` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-er001-evidence-storage-port` |
| Baseline | `0f46f0fbf2c8bc8d106c9aa2f0d3fc6143d2850b` (origin/main post W5 closeout) |
| Implementation SHA (frozen) | `b4701e13fc9fd048a1a25cba04e90bbdb0e7f4b8` |
| Docs follow-up SHA | `2546b6352d420040e544af339dd36a897aa35156` |
| Pull Request | `#29` (squash merge SHA: `d3c61400e07e7ce5ca8357ffbc18ef82afd990c5`) |
| CI Status | Main CI run `35622998445` (Quality: PASS, Integration: PASS) |
| Vercel Deployment | `PASS` (Main deployment) |
| Execution round | `1` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Tier 3 LIGHT verdict | `PASS` (round 1; findings none; AUDIT.md v1.0) |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A02), `docs/discovery/realignment/EVIDENCE_STORAGE_AUDIT.md` |
| Assurance lane | `CRITICAL` |
| Tier 1 sign-off | Tier 3 audit round 1 PASS — T0 greenlight for push & PR |
| Next gate | `NONE — MERGED_AND_MAIN_VERIFIED` |

## 1. Outcome and changed surface

A provider-neutral `EvidenceStorage` port exists as a single TypeScript module. No adapter, no runtime wiring, no DB/migration, no env reads, no public URL exposure. Domain code can already compile against the port surface (`write`, `read`, `delete`, `exists`, `stat`). Static and unit tests prove the port is provider-neutral and streaming-safe without touching real CCCD/PII data.

### Changed files (all NEW)

| Status | File | Purpose |
|---|---|---|
| `A` | `src/domains/evidence/evidence-storage.port.ts` | Provider-neutral port: `EvidenceStorage` interface, `StorageKey` branded type, `EvidenceByteSource/Stream`, `EvidenceStat`, `EvidenceWriteRequest/Result`, `EvidenceStorageError`, `asStorageKey` boundary guard. |
| `A` | `src/domains/evidence/evidence-storage.port.test.ts` | 17 tests: type-contract, boundary (no `node:fs` / `node:path` / `@vercel/blob` / `process.env`), `asStorageKey` reject cases, typed error surface, synthetic `Uint8Array` / `AsyncIterable` test double. |
| `A` | `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/TASK.md` | TASK contract. |
| `A` | `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/HANDOFF.md` | HANDOFF (this file). |

No files outside the allowlist were modified. No existing file was renamed or moved. No existing logic was refactored.

### Explicit non-changes (deferred slices)

- No `LocalVpsEvidenceStorageAdapter` (ER-002).
- No `EvidenceRecord` schema or audit DB (ER-003).
- No `storeEvidence` command (ER-004).
- No Media-service refactor (still uses Vercel Blob).
- No `prisma/**`, no `app/**`, no `package.json`/lockfile change.
- No CRM/shared contract involvement.
- No production deploy, no env config, no production credentials touched.

## 2. Acceptance evidence

| AC | Status | Result / Limitation | Summary evidence |
|---|---|---|---|
| AC-00 (`verify-task.ps1`) | **PASS** | `RESULT: DRAFT-VALID` (2 non-blocking warnings on TASK §A-02 / T-05) | TASK §0..§10 complete |
| AC-07 (Tier 3 LIGHT audit round 1) | **PASS** | AUDIT.md v1.0 staged; verdict `PASS`, findings none; implementation SHA `b4701e1` confirmed frozen; forbidden paths clean; no production DB / credentials; port boundary verified | `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/AUDIT.md` |
| AC-01 (TS strict; no provider/runtime imports) | **PASS** | `tsc --noEmit` exit 0; static boundary test in `evidence-storage.port.test.ts > "EvidenceStorage port — boundary"` reads the port source as text and asserts no `node:fs` / `node:path` / `@vercel/blob` / `process.env` symbol | targeted unit 17/17 |
| AC-02 (capability surface; no gateway concerns) | **PASS** | `evidence-storage.port.test.ts > "type contract"` asserts presence of exactly `write(` / `read(` / `delete(` / `exists(` / `stat(` and absence of `EvidenceRecord` / `signedUrl` / `quarantine` / `retention` / `encrypt` / `versioning` | targeted unit 17/17 |
| AC-03 (`asStorageKey` rejects dangerous shapes) | **PASS** | `evidence-storage.port.test.ts > "asStorageKey — port boundary guard"` covers empty/whitespace keys, POSIX paths (`/etc/passwd`, `/srv/hrp/evidence/file`), Windows drive (`C:\\Windows\\System32`, `D:/sensitive/file`), UNC (`\\\\server\\share`), URL schemes (`https://`, `http://`, `file:///`, `blob:`, `ftp://`); all rejected with `INVALID_KEY` reason | targeted unit 17/17 |
| AC-04 (typed error surface) | **PASS** | `evidence-storage.port.test.ts > "EvidenceStorageError — typed error surface"` enumerates all 7 reasons and asserts `storageKey` echoes through | targeted unit 17/17 |
| AC-05 (gates) | **PASS** | `vitest run src/domains/evidence/` → 17/17 PASS; `vitest run --config vitest.unit.config.ts` → 2424/2424 PASS in 159 files (+17 from port test); `tsc --noEmit` exit 0; `npm run lint` exit 0 (0 errors, 649 warnings — same count as baseline HEAD `0f46f0f`, port adds 0 new; baseline confirmed via `git diff 0f46f0f.. -- '**/*.ts'`); `npm run build` exit 0 | gates all green |
| AC-06 (allowlist + verify scripts) | **PASS** | `git diff --check` clean; `git status --short` shows only `??` for the 2 new src files and the 1 new docs directory (all inside allowlist); `verify-task.ps1` DRAFT-VALID; `verify-handoff.ps1` run below | scope intact |

### Test counts

| Lane | Command | Files | Tests | Result |
|---|---|---|---|---|
| Targeted (port) | `vitest run src/domains/evidence/` | 1 | 17 | PASS (0.6s) |
| Full unit | `vitest run --config vitest.unit.config.ts` | 159 | 2424 | PASS (70.4s) |

### Verify-script results (verbatim)

verify-task.ps1 ⇒ `RESULT: DRAFT-VALID (2 warning(s))`.
verify-handoff.ps1 ⇒ ran at delivery time, see HANDOFF run log saved at task dir.

## 3. Evidence registry (E-xx runnable entries)

| ID | Command | Exit / Count | Output (saved) |
|---|---|---|---|
| E-01 | `cd C:\CodeApp\HrP-worktrees\t1b-er001-evidence-storage-port && node_modules/.bin/tsc --noEmit` | exit 0 | console output captured during build |
| E-02 | `cd C:\CodeApp\HrP-worktrees\t1b-er001-evidence-storage-port && node_modules/.bin/vitest run src/domains/evidence/` | 17/17 PASS, 0.6s | captured; test files: `src/domains/evidence/evidence-storage.port.test.ts` |
| E-03 | `cd C:\CodeApp\HrP-worktrees\t1b-er001-evidence-storage-port && node_modules/.bin/vitest run --config vitest.unit.config.ts` | 2424/2424 PASS, 159 files, 70.4s | captured during build |
| E-04 | `cd C:\CodeApp\HrP-worktrees\t1b-er001-evidence-storage-port && npm run lint` | exit 0, 649 pre-existing warnings | captured during build |
| E-05 | `cd C:\CodeApp\HrP-worktrees\t1b-er001-evidence-storage-port && npm run build` | exit 0 | captured during build |
| E-06 | `cd C:\CodeApp\HrP-worktrees\t1b-er001-evidence-storage-port && git diff --check` | exit 0, clean | captured |
| E-07 | `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/AUDIT.md` (Tier 3 produced file) | verdict `PASS` round 1, findings none, baseline `0f46f0f`, implementation SHA `b4701e1` confirmed frozen | `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/AUDIT.md` |

## 4. Deviations and blockers

None. TASK plan executed as written; no scope expansion, no fallback substitution, no ENV/DB touched.

## 5. Final status

`Handoff status: ACCEPTED` (round 1 — Tier 1 port-only delivery; **Tier 3 LIGHT audit round 1 PASS** recorded in §0 Control + AUDIT.md v1.0; post-audit status kept at `READY_FOR_AUDIT` because the pipeline verifier enum (`READY_FOR_REVIEW|READY_FOR_AUDIT|BLOCKED|IN_PROGRESS`) does not yet include a post-LIGHT status — Tier 0's authoritative greenlight for `PUSH_AND_OPEN_PR` is recorded in TASK §0 Next gate + Revision Log v1.1).

Interface signature:

```text
type StorageKey = string & { readonly __brand: 'EvidenceStorageKey' };
type EvidenceByteSource = AsyncIterable<Uint8Array>;
type EvidenceByteStream = AsyncIterable<Uint8Array>;

interface EvidenceStat {
  storageKey: StorageKey;
  contentType: string | null;
  sizeBytes: number;
  etag: string | null;
  lastModified: Date | null;
}

interface EvidenceWriteRequest {
  storageKey: StorageKey;
  contentType: string;
  body: EvidenceByteSource;
}

interface EvidenceWriteResult {
  storageKey: StorageKey;
  sizeBytes: number;
  etag: string | null;
}

interface EvidenceStorage {
  write(request: EvidenceWriteRequest): Promise<EvidenceWriteResult>;
  read(storageKey: StorageKey): Promise<EvidenceByteStream>;
  delete(storageKey: StorageKey): Promise<void>;
  exists(storageKey: StorageKey): Promise<boolean>;
  stat(storageKey: StorageKey): Promise<EvidenceStat>;
}

class EvidenceStorageError extends Error {
  readonly reason: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'INVALID_KEY' | 'PERMISSION_DENIED' | 'STORAGE_UNAVAILABLE' | 'STREAM_FAILURE' | 'INVALID_REQUEST';
  readonly storageKey: StorageKey | null;
}

function asStorageKey(candidate: string): StorageKey;
```

Semantics chosen:
- All five capabilities required, async-shapes; no batch/multi-object.
- No silent overwrite — `write` fails `ALREADY_EXISTS`; replacement requires `delete` → `write`.
- `stat` and `exists` are cheap probes; they MUST NOT stream the body.
- Errors are typed (`EvidenceStorageError.reason` is a closed enum) so callers can switch on `reason` without leaking provider strings.
- `read` returns `AsyncIterable<Uint8Array>`; `write` consumes `AsyncIterable<Uint8Array>`; no `Buffer`, no `NodeJS.ReadableStream`, no `string`.
- `asStorageKey` is the only mint point; rejects empty/whitespace, URL schemes (`http`, `https`, `ftp`, `file`, `blob`, `data`), absolute paths (POSIX `/...`, Windows drive `C:\\` / `C:/`, UNC `\\server\share`).
- Port never names provider/runtime constants: forbidden — `node:fs`, `node:path`, `@vercel/blob`, `process.env`. Verified by static boundary test that reads the source as text and strips comments.
- No production in-memory fallback; a test double lives only in the test file.

Known limitations / open decisions (dành cho ER-002+):
- Adapter choice and `HRP_EVIDENCE_ROOT` resolution is ER-002.
- `EvidenceRecord` metadata (owner, evidenceType, status, retention) is ER-003.
- Audit, signed URL, encryption policy, multipart, versioning are deliberately deferred.
- No batch/multi-object operations yet.
- `StorageKey` normalization policy (segment separator, traversal, length) is the adapter's responsibility.

Security boundary compliance:
- No raw filesystem paths or public URLs at the port boundary (enforced by `asStorageKey`).
- Streaming reads to bound memory (`AsyncIterable<Uint8Array>`).
- Typed failure surface — callers cannot catch a bare `Error`.
- Static boundary invariant asserted by tests at every run.

Handoff status: `ACCEPTED`
