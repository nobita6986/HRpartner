# AUDIT — hrp-p0-a03-er002-local-vps-evidence-storage-adapter (rounds 1–3)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a03-er002-local-vps-evidence-storage-adapter` |
| Spec version | `v1.0` |
| Audit mode | LIGHT |
| Audit lane | CRITICAL |
| Branch | `codex/t1b-er002-local-vps-evidence-storage-adapter` |
| Baseline | `f04bc94a7b9a06b3cb5b33035f8eb2f8e3a05899` (origin/main, post ER-001 port merge #30) |
| Round 1 SHA (frozen) | `7f12b9da86f010c9f38d8a1f9cdca0989b7798cc` — Tier 3 LIGHT round 1 PASS |
| Round 2 SHA (frozen) | `36cbbef809c371b6909104603a201a662334fade` — F1..F5 v1 fixes, Tier 3 LIGHT round 2 PASS |
| Round 3 substantive SHA (frozen) | `d368cad88b0f2ad8686336d24ec96684f8d27e02` — F4 symlink-following + F5 cleanup failure surfacing + error-surface sanitization + deterministic regression tests |
| Round 3 test-alignment SHA (frozen) | `21fe5342b0105d19b5e4101d31c2fe076c0bb619` — F4 symlink-alias tests aligned with adapter INVALID_KEY semantics (no production source change); CI run 35683018593 PASS |
| Round 3 docs SHA (frozen) | `fb819a18d57281915e86f5c650cae371aa65daf5` — TASK/HANDOFF + evidence/ci-round3.txt; CI run 35683639100 PASS |
| Round 3 evidence SHA (frozen) | `ad57f3854f1e9774d914c629a46a97379c3ceb65` — adds second CI run to evidence (docs-only) |
| Final HEAD | `ad57f3854f1e9774d914c629a46a97379c3ceb65` |
| Audit delta boundary | `7f12b9d..ad57f38` (covers rounds 2 + 3) |
| Round 1 verdict | **`PASS`** |
| Round 2 verdict | **`PASS`** |
| Round 3 verdict | **`PASS`** (this document) |
| Overall verdict | **`PASS`** (cumulative across 3 rounds) |

> Adapter-only deliverable: provider-local filesystem implementation of the ER-001 `EvidenceStorage` port. Three rounds of refinement: round 1 initial implementation, round 2 closed 5 T0 source-review findings (F1–F5) for index/short-write/stream-cancel/storage-object/cleanup-ordering, round 3 closed PR #32 HOLD comments for symlink-following aliasing + cleanup failure visibility + caller-supplied error sanitization. ER-001 port file (`evidence-storage.port.ts`) bit-stamp unchanged across all three rounds.

## 1. Findings (cumulative)

> Severity levels: `P0` (data corruption, security breach), `P1` (correctness, gating defect), `P2` (debt, hardening), `P3` (style, docs).

### Round 1 findings

None. All 12 AC passed at HEAD `7f12b9d`.

### Round 2 findings (T0 source-review, resolved in round 2)

| ID | Severity | Description | Fix | Disposition |
|---|---|---|---|---|
| F1 | P1 | `resolveKey` walked segments by value; `segments.indexOf(seg)` returns FIRST occurrence — repeated-segment keys (`a/a/file.bin`) mis-resolved | Index-based iteration (`for (let i = 0; i < segments.length; i++)` + `segments.slice(i)`) | **CLOSED — round 2** |
| F2 | P1 | `drainSource` summed `chunk.byteLength` directly; `handle.write()` may return fewer bytes (short write); `sizeBytes` unreliable | New `writeChunkAll` helper loops `while (offset < chunk.byteLength)` reading `bytesWritten` per iteration | **CLOSED — round 2** |
| F3 | P1 | Round-1 adapter used `FileHandle.createReadStream()`; consumer-cancel undefined, possible fd leak, no explicit late-error handling | `fileHandleToStream` rewritten as async generator with `finally { handle.close() }` + STREAM_FAILURE mapping | **CLOSED — round 2** |
| F4 | P1 | `exists` used `access(F_OK)` — returns `true` for non-regular inodes; `delete` on directory → EISDIR → wrong semantics | `statObject` helper: `lstat` + `!isFile()` → NOT_FOUND; all ops route through it | **CLOSED — round 2 (partial — see F4-round-3 below)** |
| F5 | P1 | Round-1 partial cleanup called `unlink` before `close`; storageKey from failing source, not caller's request | Close-then-unlink via `partialCleanupNeeded` flag; storageKey re-anchored | **CLOSED — round 2 (partial — see F5-round-3 below)** |

### Round 3 findings (PR #32 HOLD T0 source-review, resolved in round 3)

| ID | Severity | Description | Fix | Disposition |
|---|---|---|---|---|
| F4-round-3 | P1 | Round-2 `resolveKey` called `fsPromises.realpath(next)` BEFORE checking whether `next` itself was a symlink. A symlink whose target is a regular file inside canonicalRoot would be silently **followed** through realpath and aliased to the target — defeating the storage-object boundary's purpose. The round-2 `statObject` is unreachable because realpath already produced the canonical path. | Pre-flight `lstat(next)` at every segment BEFORE `realpath`; if `lstatRes.isSymbolicLink()`, throw `INVALID_KEY 'key resolves through a symlink'`. Code comment at lines 303-310 + 322-327 documents the threat model. Symlink-rejection is symmetric for intermediate dirs and leaves. | **CLOSED — round 3 substantive `d368cad`** |
| F5-round-3 | P1 | Round-2 partial cleanup swallowed errors from `handle.close()` and `fsPromises.unlink()`. A successful drain with a failed close would silently report success to the caller, leaving the caller with a stale handle reference and no indication that the file descriptor state is inconsistent. A failed unlink (non-ENOENT) would leave a partial file on disk but the caller would never know — they'd see the original `STREAM_FAILURE` reason, not the cleanup-incomplete fact. | `safeCloseHandle(handle)` returns the close error (or null) WITHOUT throwing. `safeUnlinkPartial(targetPath)` treats ENOENT as success and returns other errors. `write` method tracks 3 independent failure modes: `drainError`, `closeError`, `unlinkError`. Decision priority: `unlinkError → drainError → closeError → success`. Successful drain + failed close → `STORAGE_UNAVAILABLE 'handle close failed'`. Unlink failed with non-ENOENT → `STORAGE_UNAVAILABLE 'partial artifact not removed'` (caller informed that file may still exist). | **CLOSED — round 3 substantive `d368cad`** |
| RQ-04 (error sanitization) | P2 | Round-2 `drainSourceToHandle` caught and re-threw errors with `streamError.message` preserved verbatim (only `storageKey` was re-anchored). A caller-supplied byte source that emits errors with sensitive text (PII, sentinels, internal paths, errno strings) could leak that text into the public error surface. Same risk for round-2 `fileHandleToStream` late-error path. | `SAFE_STREAM_MESSAGES` whitelist (line 179) with 7 fixed strings — one per port reason. `sanitizeReason(err, defaultReason)` (lines 189-204) maps via narrow whitelist: `EvidenceStorageError.reason` (typed enum, trusted) OR errno code (whitelisted) OR default reason. `safeMessage(reason)` returns the fixed string. All surface throws use `safeMessage(reason)` instead of the source error's message. `drainSourceToHandle` line 460: `throw new EvidenceStorageError(err.reason, safeMessage(err.reason), null)` — drops the original message. | **CLOSED — round 3 substantive `d368cad`** |
| Test alignment (post-CI) | P3 | CI run on round-3 substantive failed: round-3 tests assumed F4 would surface as NOT_FOUND (matching round-2 semantics) but the round-3 F4 fix correctly surfaces as INVALID_KEY. | `21fe534` test-alignment commit updated F4 tests to expect `INVALID_KEY` uniformly (matches new semantics). No production source change. CI run 35683018593 PASS. | **CLOSED — round 3 test alignment `21fe534`** |

### Round 3 audit findings (Tier 3 audit on delta 7f12b9d..ad57f38)

*(No new findings — all checks PASS.)*

## 2. Verification (round 3)

### Cumulative verification (delta 7f12b9d..ad57f38)

| # | Item | Verification method | Tier 3 verdict | Evidence |
|---|---|---|---|---|
| C-07 | Git hygiene: clean whitespace, scope intact, HEAD frozen, no force-push needed | `git diff --check` exit 0; `git status` clean; SHA chain integrity check | **PASS** | `git diff --check` exit 0; working tree clean for tracked files; `git merge-base --is-ancestor` confirms 7f12b9d, 36cbbef, d368cad all reachable from HEAD ad57f38; remote `git ls-remote` = local HEAD ad57f38 |
| C-09 | Contract validity gates | `verify-task.ps1` + `verify-handoff.ps1` | **PASS** | verify-task: `RESULT: DRAFT-VALID (1 warning)` — A-04 `READY_FOR_AUDIT` placeholder is non-blocking per realignment plan (status only transitions to `ACCEPTED` post-merge). verify-handoff: `PASS WITH WARNINGS (1 warning)` — H-15 expected (TASK control fields intentionally updated for round 3, recorded in §9/§10 Revision Log) |
| C-10 | Delta scope: only round-2/3 fixing files changed; ER-001 untouched | `git diff --name-only 7f12b9d..ad57f38` | **PASS** | 5 files in delta: `adapter.ts` (rounds 2+3 changes), `adapter.test.ts` (F1-F5 round-2 + F4-round-3 + sanitization round-3 tests), `TASK.md` (round 3 control updates + §11.2 round-3 closure), `HANDOFF.md` (round 3 sections), `evidence/ci-round3.txt` (new evidence file). ER-001 port file (`evidence-storage.port.ts`) confirmed empty diff vs `f04bc94` baseline. Forbidden paths (`prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, `docs/PLANNER_HANDOVER.md`) confirmed clean. AUDIT.md bit-stamp unchanged vs round 1 commit `614deb8` (Tier 3-owned; T3 round 2 write was untracked and reverted by Tier 1 per workflow convention) |
| F4-r3 | Pre-flight `lstat` per segment rejects symlinks (including aliases to regular files inside root) | Code review + F4-round-3 tests | **PASS** | `resolveKey` line 330: `lstatRes = await fsPromises.lstat(next)` BEFORE `realpath`. Line 351: `if (lstatRes.isSymbolicLink())` → throw `INVALID_KEY 'key resolves through a symlink'` (line 356). Threat-model documented in lines 303-310 + 322-327. F4-round-3 tests: symlink-to-regular-file inside root (leaf + intermediate directory) — both rejected with `INVALID_KEY`; `delete(alias)` does NOT remove the target (verified by post-condition file existence check) |
| F5-r3 | Cleanup failure surfaces: 3-state priority unlink→drain→close; no silent success | Code review + F5-round-3 tests | **PASS** | `safeCloseHandle` (lines 621-630) returns close error without throwing. `safeUnlinkPartial` (lines 637-648) treats ENOENT as success, returns other errors. `write` tracks `drainError` / `closeError` / `unlinkError` (lines 686-688) with priority decision (lines 739-767). F5-round-3 tests use `vi.spyOn(fsPromises, 'open')` to wrap real `handle.close()` and `vi.spyOn(fsPromises, 'unlink')` to inject non-ENOENT unlink failures — all three failure modes verified |
| RQ-04 (sanitization) | No caller-supplied text leaks into surface; reason via narrow whitelist | Code review + sanitization tests | **PASS** | `SAFE_STREAM_MESSAGES` whitelist (lines 179-187) has 7 fixed strings, one per `EvidenceStorageErrorReason`. `sanitizeReason` (lines 189-204) trusts only the typed enum or whitelisted errno codes. `drainSourceToHandle` line 460: throws with `safeMessage(err.reason)` — original message dropped. `fileHandleToStream` line 519: late-error uses `safeMessage('STREAM_FAILURE')`. `statObject` lines 601, 612: NOT_FOUND uses `safeMessage('NOT_FOUND')`. All 32 `throw new EvidenceStorageError(...)` statements verified: none embed caller-supplied text. Sanitization tests (sentinel in `EvidenceStorageError` message, sentinel in plain `Error` message, raw `ENOSPC` errno with sensitive blob substring) verify all three surface paths drop the original text |
| AC-01 | All 5 port methods correctly typed after 3 rounds of refactor | TypeScript assignment + targeted adapter tests | **PASS** | Adapter still typed `: EvidenceStorage`; method shapes unchanged across rounds. 53/53 targeted tests PASS on Windows (9 POSIX-only skipped) |
| AC-02 | Root validation unchanged + still enforced | Targeted tests "root validation" | **PASS** | Round-1 root validation preserved (lines 245-292). `validateRoot`: missing (ENOENT → INVALID_REQUEST), file path (not dir → INVALID_REQUEST), symlink root (`isSymbolicLink()` → INVALID_REQUEST). 5 tests in "root validation" group all PASS |
| AC-03 | Key enforcement: structural + symlink + sanitized rejection | Targeted tests "storage key validation" + F4-round-3 tests | **PASS** | `validateKeyStructure` (lines 215-239) unchanged from round 1. `resolveKey` line 356 adds new `'key resolves through a symlink'` rejection. F4-round-3 tests confirm symlink aliases (target inside root) are rejected as `INVALID_KEY`, not silently followed |
| AC-06 | Mid-stream source failure → partial cleanup; F5 failure surfaced | Targeted tests "write / read / delete / stat / exists" + F5-round-3 | **PASS** | Round-1 test "cleans up partial artifact when source fails mid-stream" still PASS. Round-3 sanitization preserves observable behavior: same `STREAM_FAILURE` reason, but message now from safe whitelist (`'stream failure'` instead of any caller-supplied text). F5-round-3 tests verify the 3-state cleanup priority |
| AC-09 | stat/exists don't stream body | Code review | **PASS** | `statObject` uses `lstat` (metadata only). `exists` uses `lstat` + `isFile()` (metadata only). No `fsPromises.open` in either path |
| AC-10 | No absolute path / root in error surface; no caller-supplied text leaks | F5 regression + sanitization tests | **PASS** | AC-10 test (round 1): `expect(msg.includes(tempDir)).toBe(false)`. Sanitization tests (round 3): sentinels in caller errors are NOT in surfaced errors; raw errno code is NOT in surfaced message; sensitive blob substring is NOT in surfaced message |
| AC-11 | All gates green; ER-001 carry-forward green; no regression | Canonical commands + Tier 3 re-runs | **PASS** | Targeted: **53/53 PASS + 9 skipped** in 1.04s. Full unit: **2477/2477 PASS + 9 skipped** in 160 files in 85.7s. Typecheck: exit 0. Lint: exit 0 (0 errors, 650 warnings — baseline). Build: exit 0. ER-001 port: **17/17 PASS** in isolation. CI runs 35683018593 + 35683639100 both PASS Quality + Integration on PR #32 |
| AC-12 | Allowlist scope intact; ER-001 port bit-stamp identical; verify scripts | Scope diff + scripts | **PASS** | `git diff --name-only 7f12b9d..ad57f38` = 5 files (2 src + 3 docs). `git diff --check` clean. ER-001 port empty diff vs `f04bc94`. verify-task DRAFT-VALID (1 expected warning). verify-handoff PASS WITH WARNINGS (1 expected warning) |

## 3. Risk surface audit

All round 1 + round 2 risk dispositions carry forward. Round 3 changes the disposition of two risks:

| Risk (TASK §7) | Round 1+2 disposition | Round 3 disposition | Change? |
|---|---|---|---|
| RISK-01 — adapter couples to provider | Acceptable in scope | Unchanged — adapter still `node:fs`-backed; port surface still clean | **No** |
| RISK-02 — raw path leakage | Mitigated by AC-10 | **Hardened** — round-3 sanitization ensures NO caller-supplied text (including paths, sentinels, internal strings) can leak through the surface error path. `safeMessage` whitelist covers all reason paths | **Yes — hardened** |
| RISK-03 — TOCTOU symlink race | Documented + accepted; deferred to EvidenceGateway | **Reduced** — round-3 F4 pre-flight `lstat` rejects symlinks even when their target is inside canonicalRoot. The aliasing attack (placing a symlink to a different file inside the root) is no longer possible at the adapter layer. Residual TOCTOU between `lstat` and the eventual `open` call is still documented in HANDOFF §5.1.1 as a gateway-layer concern | **Yes — reduced** |
| RISK-04 — POSIX symlink tests skip on Windows | Mitigated | Unchanged — 9 POSIX-only tests use `it.skipIf(!IS_POSIX)`; Windows count 53/53 PASS | **No** |
| RISK-05 — in-memory fallback drift | Pre-empted at port + adapter | Unchanged | **No** |

## 4. Verdict

**Verdict: `PASS`** (cumulative across rounds 1, 2, 3 — Tier 3 LIGHT audit at HEAD `ad57f3854f1e9774d914c629a46a97379c3ceb65`).

Round 3 closes the PR #32 HOLD comments raised during T0 source-review:

- **F4-round-3 (symlink aliasing)**: `resolveKey` now does pre-flight `lstat` BEFORE `realpath`, rejecting any segment that is a symlink — even if its target is a regular file inside canonicalRoot. The storage-object boundary is now genuinely enforced: only canonical (non-symlink) paths are reachable by key.
- **F5-round-3 (cleanup failure visibility)**: `write` method tracks 3 independent failure modes (`drainError`, `closeError`, `unlinkError`) and surfaces the most specific via `EvidenceStorageError`. `unlinkError` wins so a partial file still on disk is communicated to the caller. `closeError` after successful drain means the caller does NOT get a silent success — they get `STORAGE_UNAVAILABLE 'handle close failed'` and can retry.
- **Error sanitization**: All surfaced errors use `safeMessage(reason)` from a fixed whitelist. Caller-supplied text from byte-source errors is dropped at the boundary. Sensitive substrings (paths, sentinels, errno strings) cannot leak through the adapter.

Round 3 introduces deterministic regression tests using local Vitest mocks (`vi.spyOn(fsPromises, ...)`) — no new testing framework. The tests activate the original failure modes by injecting controlled failures into real adapter operations.

No new findings introduced. All round-1 + round-2 AC results preserved. ER-001 port file bit-stamp unchanged across all three rounds. Forbidden paths clean. SHA chain clean: no force-push needed; round-1 SHA `7f12b9d`, round-2 SHA `36cbbef`, round-3 substantive SHA `d368cad`, round-3 test-alignment SHA `21fe534`, round-3 docs SHA `fb819a1`, round-3 evidence SHA `ad57f38` all reachable as ancestors.

**Tier 3 confirms**:
- No DB / Prisma / migration / Neon / production env touched.
- No `app/**`, no API route, no runtime composition.
- No `src/domains/media/**`, no `@vercel/blob`.
- No `EvidenceRecord`, no audit, no retention/quarantine/backup.
- No public/signed URL.
- No `package.json` / lockfile change.
- No `docs/PLANNER_HANDOVER.md` change.
- Branch chain clean, remote up-to-date, no force-push needed.
- Worktree clean (for tracked files).
- ER-001 port file (`evidence-storage.port.ts`) bit-stamp identical to baseline `f04bc94` across all 3 rounds.

**CI evidence**:
- Run 35683018593 on `21fe534`: PASS Quality + Integration.
- Run 35683639100 on `fb819a1`: PASS Quality + Integration.
- Recorded in `docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/evidence/ci-round3.txt`.

**Tier 3 recommendation to Tier 0 / Owner**:
`PASS` authorizes Tier 0/Owner to greenlight PR #32 for merge. The adapter is a security boundary primitive with verified fail-closed semantics across three refinement rounds. No new surface introduced. Next logical slice per realignment plan §17: **ER-003** (EvidenceRecord metadata).

This audit does NOT modify the round-3 delivery SHAs `d368cad`, `21fe534`, `fb819a1`, `ad57f38`.

## 5. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-22 | Tier 3 verdict PASS round 1; all 12 AC verified; no findings; boundary/key/error-surface audit complete; ER-001 carry-forward green; forbidden paths clean; TOCTOU residual risk documented in HANDOFF §5.1.1 and accepted as gateway-layer mitigation | Tier 3 LIGHT audit round 1 complete at HEAD `7f12b9d` |
| v1.0 | 2026-09-22 | Tier 3 verdict PASS round 2; T0 source-review findings F1–F5 verified correct in code and regression tests; 9 F1–F5 regression tests added (40/40 PASS + 5 skipped); verify-task upgraded from DRAFT-VALID to PASS; no new findings; scope guard intact; round-2 implementation SHA `36cbbef` frozen; round-1 frozen SHA `7f12b9d` unchanged and reachable | Tier 3 LIGHT audit round 2 on delta `7f12b9d..36cbbef` |
| v1.0 | 2026-09-22 | Tier 3 verdict PASS round 3 (cumulative). T0 source-review findings F4-round-3 (symlink aliasing pre-check), F5-round-3 (cleanup failure surfacing with 3-state priority), RQ-04 (error sanitization via `safeMessage` whitelist) verified correct in code and deterministic regression tests. Test-alignment commit `21fe534` aligns F4 tests with new `INVALID_KEY` semantics. CI runs 35683018593 + 35683639100 both PASS. 53/53 targeted tests + 2477/2477 full unit tests + ER-001 17/17 carry-forward all green. verify-task DRAFT-VALID (1 expected warning); verify-handoff PASS WITH WARNINGS (1 expected warning). ER-001 port bit-stamp identical to baseline across all 3 rounds. SHA chain clean: no force-push needed. PR #32 ready for merge | Tier 3 LIGHT audit round 3 (final) on delta `7f12b9d..ad57f38`; Tier 0/Owner may greenlight PR #32 for merge; next slice per realignment plan: ER-003 (EvidenceRecord metadata) |
