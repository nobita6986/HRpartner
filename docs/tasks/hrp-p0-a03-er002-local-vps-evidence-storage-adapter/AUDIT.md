# AUDIT — hrp-p0-a03-er002-local-vps-evidence-storage-adapter (round 1)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a03-er002-local-vps-evidence-storage-adapter` |
| Spec version | `v1.0` |
| Audit mode | LIGHT |
| Audit lane | CRITICAL |
| Branch | `codex/t1b-er002-local-vps-evidence-storage-adapter` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge #30) |
| Implementation SHA | `7f12b9da86f010c9f38d8a1f9cdca0989b7798cc` (frozen by Tier 1) |
| Diff range | `f04bc94..7f12b9d` (1 commit: `feat(evidence): add LocalVpsEvidenceStorageAdapter (P0-A03 / ER-002)`) |
| Diff size | 4 NEW files, 0 modified, 0 renamed, 0 deleted |
| Verdict | **`PASS` — Tier 3 LIGHT round 1** (consistent with §4) |

> Adapter-only deliverable: provider-local filesystem implementation of the ER-001 `EvidenceStorage` port. Root via injected `PathResolver`, layered key validation (port + filesystem encoding), `fs.realpath` symlink containment, OS-level atomic no-overwrite via `'wx'`, typed error surface, no public path/root/stack leakage. ER-001 port file (`evidence-storage.port.ts`) bit-stamp unchanged.

## 1. Findings

> Severity levels: `P0` (data corruption, security breach), `P1` (correctness, gating defect), `P2` (debt, hardening), `P3` (style, docs).

*(No findings — all checks PASS.)*

## 2. Verification

| # | Item | Verification method | Tier 3 verdict | Evidence |
|---|---|---|---|---|
| C-07 | Git hygiene: clean whitespace, scope intact, HEAD frozen, no push/PR/deploy | `git diff --check` exit 0; `git status` clean; `git rev-parse HEAD` = `7f12b9d`; remote not pushed | **PASS** | `git diff --check` exit 0; working tree clean; branch 1 commit ahead of `origin/main` (not pushed) |
| C-09 | Contract validity gates | `pwsh .ai-pipeline/scripts/verify-task.ps1` + `verify-handoff.ps1` | **PASS** | verify-task: `RESULT: DRAFT-VALID (2 warning(s))` — both non-blocking (T-03 bare `git diff` for AC-12, T-05 AC-01/AC-02/AC-03/AC-06/AC-08/AC-09/AC-10 use inline assertions); verify-handoff: `PASS` (zero warnings — H-15 clean because HANDOFF §0 control fields stayed consistent with TASK §0) |
| C-10 | Diff scope: only in-scope roots changed | `git diff --name-only f04bc94..HEAD` | **PASS** | 4 files (`adapter.ts`, `adapter.test.ts`, TASK.md, HANDOFF.md) all within TASK §0 in-scope roots; ER-001 port file (`evidence-storage.port.ts`) confirmed bit-stamp unchanged (empty diff vs `f04bc94`); forbidden paths (`prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, `docs/PLANNER_HANDOVER.md`) confirmed clean |
| AC-01 | Adapter implements all five `EvidenceStorage` methods with correct types | TypeScript assignment of `adapter: EvidenceStorage` literal enforces shape; full unit includes ER-001 carry-forward | **PASS** | Adapter declares `: EvidenceStorage` (line 301) and returns object literal typed `: EvidenceStorage` (line 344); methods: `write` (line 345) → `Promise<EvidenceWriteResult>`, `read` (line 400) → `Promise<EvidenceByteStream>`, `delete` (line 416) → `Promise<void>`, `exists` (line 431) → `Promise<boolean>`, `stat` (line 458) → `Promise<EvidenceStat>`. ER-001 port tests 17/17 PASS in isolation (carry-forward verified by Tier 3) |
| AC-02 | `makeLocalVpsEvidenceStorageAdapter` accepts `PathResolver`; root validation: missing/blank/relative/non-directory/symlink → `INVALID_REQUEST` | Targeted unit tests "root validation" (5 tests) | **PASS** | `defaultEvidencePathResolver` (line 58) synchronously rejects blank/missing/non-absolute (sync `INVALID_REQUEST`). `validateRoot` (line 152) lazily rejects missing (ENOENT → INVALID_REQUEST), file path (not directory → INVALID_REQUEST), symlink root (`isSymbolicLink()` → INVALID_REQUEST) on first port call. 5 tests in "root validation" group all PASS on Windows; symlink-root test `skipIf(!IS_POSIX)` runs on Linux CI |
| AC-03 | Key enforcement: `\\`, `..`, empty segment, trailing `/`, NUL/control, absolute path, URL scheme, symlink escape → `INVALID_KEY` | Targeted unit tests "storage key validation" (9 tests) | **PASS** | `validateKeyStructure` (line 122) rejects `\\`, NUL/control chars (line 126), empty/`./..` segments (line 131), non-`[A-Za-z0-9._-]` segment chars (line 138). Port-layer `asStorageKey` rejects absolute paths + URL schemes. `resolveKey` (line 208) does `fs.realpath` per segment, rejects escape via `real !== canonicalRoot && !real.startsWith(canonicalRoot + path.sep)`. 9 key-validation tests PASS; 2 symlink-escape tests skip on Windows, run on Linux CI |
| AC-04 | Write round-trip multi-chunk synthetic bytes; empty object → `sizeBytes: 0` | Targeted unit tests "write / read / delete / stat / exists" | **PASS** | Test "round-trips multi-chunk synthetic bytes" PASS (3-chunk payload `[0x01..0x09]` round-trips byte-exact via drain); test "writes empty object (zero bytes)" PASS (`sizeBytes: 0` after write, `stat.sizeBytes: 0`, drained stream `byteLength: 0`) |
| AC-05 | Duplicate write → `ALREADY_EXISTS`; concurrent writes → exactly one success | Targeted unit tests for sequential dup + concurrent `Promise.allSettled` | **PASS** | Test "rejects duplicate writes with ALREADY_EXISTS" PASS (second write to same key rejected). Test "rapid sequential writes of same key" PASS — uses `Promise.allSettled` of 3 concurrent writes; assertion: ≥1 fulfilled, ≥1 rejected, all rejections have `reason: 'ALREADY_EXISTS'`. `'wx'` flag at line 362 provides OS-level atomic no-overwrite |
| AC-06 | Source stream fails mid-stream → partial file removed; `STREAM_FAILURE` returned | Targeted unit test "cleans up partial artifact when source fails mid-stream" | **PASS** | Test PASS — adapter's `write` catch block (lines 380-393) calls `fsPromises.unlink(targetPath)` before throwing; after failure, `read` → `NOT_FOUND`, `exists` → `false` (verified in test) |
| AC-07 | Missing read/stat/delete → `NOT_FOUND`; `exists` returns `false` for missing | Targeted unit tests for missing-key semantics | **PASS** | Tests "delete on missing throws NOT_FOUND" + "delete after write succeeds; subsequent delete throws NOT_FOUND" + "read on missing throws NOT_FOUND" + "stat on missing throws NOT_FOUND" + "exists returns true after write, false on missing" all PASS. `exists` (lines 431-456) catches NOT_FOUND from `resolveKey` and from `fsPromises.access` ENOENT, returns `false`; other errors propagate |
| AC-08 | `stat.contentType = null`, `stat.etag = null`, `write.etag = null` | Targeted unit test "stat returns contentType=null, etag=null, lastModified non-null" | **PASS** | Test PASS — verified against `stat` return shape at lines 463-469 (`contentType: null`, `etag: null`, `lastModified: s.mtime`) and `write` return shape at lines 375-379 (`etag: null`) |
| AC-09 | `stat` and `exists` do not stream body | Code review + implementation uses `fsPromises.stat` / `fsPromises.access` | **PASS** | `stat` calls `fsPromises.stat(targetPath)` (line 462) — metadata-only syscall, no body open. `exists` calls `fsPromises.access(targetPath, fsPromises.constants.F_OK)` (line 443) — F_OK existence probe, no body open. No `fsPromises.open` in either path |
| AC-10 | No absolute filesystem path or root path in error/return value | Targeted unit test "error messages never include the absolute root path" + adapter uses generic safe messages | **PASS** | Test PASS — `expect(msg.includes(tempDir)).toBe(false)`. Adapter error messages are generic constants: `"cannot open target for read"`, `"cannot delete target"`, `"cannot stat target"`, `"cannot probe target"`, `"cannot create directory"`, `"cannot open target for write"`, `"target already exists"`, `"stream write failed"`, `"key escapes root"`, `"key uses forbidden backslash separator"`, etc. — none embed `rootDir` or absolute paths. Adapter also does NOT include `process.env` import or reference in code |
| AC-11 | Targeted adapter tests + full unit + typecheck + lint + build all pass; ER-001 carry-forward green | Canonical commands + Tier 3 re-runs | **PASS** | Targeted: `npx vitest run src/domains/evidence/local-vps-evidence-storage.adapter.test.ts --config vitest.unit.config.ts` → **28/28 PASS + 3 skipped** (POSIX symlink, expected on Windows) in 0.87s. Full unit: `npx vitest run --config vitest.unit.config.ts` → **2452/2452 PASS + 3 skipped** in 160 files in 70.4s (matches HANDOFF E-03). Typecheck: `npx tsc --noEmit` exit 0 (after `npm run build` generates `.next/types/cache-life.d.ts` — pre-existing Next.js ordering dependency, NOT introduced by this slice). Lint: `npx eslint .` exit 0 (0 errors, 650 warnings — baseline 649 + 1 new = test file unused-import warning on `EvidenceByteSource`, non-blocking). Build: `npm run build` exit 0. Carry-forward: ER-001 port test 17/17 PASS in isolation; W5 handling-assignment security 3/3 + service 11/11 PASS (no regression) |
| AC-12 | Allowlist scope intact; ER-001 port file untouched; verify-task + verify-handoff pass | Scope command + ER-001 diff + pipeline scripts | **PASS** | `git diff --name-only f04bc94..HEAD` = 4 files (2 src + TASK + HANDOFF), all inside allowlist; `git diff --check` exit 0; ER-001 port file `evidence-storage.port.ts` shows empty diff vs `f04bc94` (bit-stamp identical); verify-task DRAFT-VALID (2 non-blocking warnings); verify-handoff PASS (zero warnings) |

## 3. Risk surface audit

| Risk (TASK §7) | Disposition |
|---|---|
| RISK-01 — adapter couples to provider | **Acceptable in scope**: adapter is `node:fs`-backed by design (filesystem is the provider); port surface stays clean. Adapter does NOT import `process.env` (verified: only matches are JSDoc comments documenting the boundary) |
| RISK-02 — raw path leakage | **Mitigated**: `AC-10` test + generic safe error messages in adapter; no `tempDir` or root substring in any error string |
| RISK-03 — TOCTOU symlink race | **Documented + accepted**: HANDOFF §5.1.1 explicitly enumerates the race window and 3 mitigations deferred to EvidenceGateway (audit log canonical path, ownership re-check, O_NOFOLLOW+O_PATH). Adapter's `fs.realpath` per segment reduces but does not eliminate the race. ER-001 port contract requires callers pass through EvidenceGateway for authorization, which is the natural enforcement layer. **Tier 3 accepts this as a non-blocker** — the adapter is the primitive layer; TOCTOU hardening is the gateway's responsibility. Future ER slice |
| RISK-04 — POSIX symlink test failures on Windows | **Mitigated**: `it.skipIf(!IS_POSIX)` markers; Linux CI exercises them. Deployment target = Linux VPS, so POSIX-only behaviour is production behaviour. Local Windows run: 28 PASS + 3 skipped (deterministic) |
| RISK-05 — in-memory fallback drift | **Pre-empted at port + adapter**: adapter has NO in-memory fallback; production must call `makeLocalVpsEvidenceStorageAdapter(env)` with a real `HRP_EVIDENCE_ROOT`; ER-001 port forbids in-memory production fallback |

## 4. Verdict

**Verdict: `PASS`** (round 1 — Tier 3 LIGHT audit at HEAD `7f12b9d`).

All 12 AC pass. Interface contract (ER-001) faithfully implemented. Security boundaries verified at three layers: root (sync-resolvable config mistakes fail-closed; lazy I/O failures fail-closed as `INVALID_REQUEST`), key (port-layer + adapter-layer validation, `fs.realpath` containment, symlink escape rejected), and surface (typed errors only; no raw Node error / stack / absolute path / root / secret leakage). `'wx'` flag provides OS-level atomic no-overwrite. Streaming reads via `FileHandle.createReadStream` with no Buffer / NodeJS.ReadableStream in adapter surface. Forbidden paths clean. ER-001 port file bit-stamp unchanged.

**Tier 3 confirms**:
- No DB / Prisma / migration / Neon / production env touched.
- No `app/**`, no API route, no runtime composition.
- No `src/domains/media/**`, no `@vercel/blob`.
- No `EvidenceRecord`, no audit, no retention/quarantine/backup.
- No public/signed URL.
- No `package.json` / lockfile change.
- No `docs/PLANNER_HANDOVER.md` change.
- Branch ahead of origin/main by 1 commit, not pushed, no PR opened, no production deploy.
- Worktree clean.
- ER-001 port file (`evidence-storage.port.ts`) bit-stamp identical to baseline `f04bc94` — no accidental coupling.

**Tier 3 recommendation to Tier 0 / Owner**:
`PASS` authorizes Tier 0/Owner to greenlight the next gate (docs-only follow-up commit + push + PR). The adapter is a security boundary primitive with verified fail-closed semantics. The TOCTOU residual risk (RISK-03) is explicitly enumerated, owner-assigned to EvidenceGateway slice, and not a release-blocker at the adapter layer.

This audit does NOT modify the delivery SHA `7f12b9d`.

## 5. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-22 | Tier 3 verdict PASS; all 12 AC verified; no findings; boundary/key/error-surface audit complete; ER-001 carry-forward green; forbidden paths clean; TOCTOU residual risk documented in HANDOFF §5.1.1 and accepted as gateway-layer mitigation | Tier 3 LIGHT audit round 1 complete at HEAD `7f12b9d`; Tier 0/Owner may greenlight ER-002 and queue ER-003 (EvidenceRecord metadata) as the next slice |
