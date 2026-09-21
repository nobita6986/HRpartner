# TASK — hrp-p0-a02-er001-evidence-storage-port

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a02-er001-evidence-storage-port` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Port is a security boundary — all evidence (CCCD, sensitive PII) must flow through a provider-neutral contract before any adapter can be wired. |
| Spec version | `v1.0` |
| Status | `READY_FOR_AUDIT` |
| Planner | `Tier 1` |
| Baseline | `0f46f0fbf2c8bc8d106c9aa2f0d3fc6143d2850b` (latest `origin/main` post W5 closeout) |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A02), `docs/discovery/realignment/EVIDENCE_STORAGE_AUDIT.md` |
| In-scope roots | `src/domains/evidence/evidence-storage.port.ts`, `src/domains/evidence/evidence-storage.port.test.ts`, `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/**` |
| Forbidden paths | `docs/PLANNER_HANDOVER.md`, `prisma/**`, `app/**`, `src/domains/media/**`, `package.json`, `package-lock.json`, CRM/shared integration contracts, env/deploy config, discovery/CRM docs |
| Required gates | `verify-task.ps1`, targeted unit tests, typecheck, lint, full unit, build, scope diff, `verify-handoff.ps1`, Tier 3 LIGHT audit |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver → /audit → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

- A provider-neutral `EvidenceStorage` port exists as a single TypeScript module.
- No adapter, no runtime wiring, no DB/migration, no env reads, no public URL exposure.
- Domain code can already compile against the port surface (`write`, `read`, `delete`, `exists`, `stat`).
- Static and unit tests prove the port is provider-neutral and streaming-safe without touching real CCCD/PII data.

### 1.2 Non-goals

- No adapter implementation (no LocalVpsEvidenceStorageAdapter; that is ER-002).
- No EvidenceRecord metadata, audit DB, retention/quarantine/signed URL/encryption/versioning/RBAC.
- No domain refactor and no migration of the existing Media service onto this port.
- No production deploy, no env config, no package.json change.
- No prisma/** changes, no schema, no new dependencies.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/evidence/evidence-storage.port.ts` | The interface itself; capability surface and provider-neutrality invariant live here. |
| `EV-02` | `src/domains/evidence/evidence-storage.port.test.ts` | Unit + type-contract + boundary tests; synthetic bytes only. |
| `EV-03` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A02) | Authority: interface-only directive, no adapter, no domain refactor. |
| `EV-04` | `docs/discovery/realignment/EVIDENCE_STORAGE_AUDIT.md` | Discovery: current Media service uses Vercel Blob; port must not couple to it. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Port-only deliverable; no adapter in this slice. Adapter is ER-002 (separate slice). | `CHOSEN` |
| `DEC-02` | Streaming read/write contract via `AsyncIterable<Uint8Array>`; no `Buffer`, no `node:fs` in port. | `CHOSEN` |
| `DEC-03` | `StorageKey` is an opaque branded string; port enforces no-path/no-URL at the boundary via `asStorageKey`. | `CHOSEN` |
| `DEC-04` | Typed error surface (`EvidenceStorageError` with `reason` enum) so callers can map to domain decisions without leaking provider strings. | `CHOSEN` |
| `DEC-05` | Test double lives only in the test file. No production in-memory fallback. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Port compile under TypeScript strict; no provider/runtime imports; no `Buffer`, no `node:fs`, no `node:path`, no `@vercel/blob`, no `process.env`. |
| `RQ-02` | Capability surface = `write`, `read` (stream), `delete`, `exists`, `stat`. No gateway/adapter concerns (EvidenceRecord, audit, RBAC, signed URL, retention, quarantine, encryption, versioning). |
| `RQ-03` | `StorageKey` opaque; `asStorageKey` rejects absolute paths and URL schemes at the port boundary. |
| `RQ-04` | Synthetic-only tests; no CCCD/PII. |
| `RQ-05` | Static + type-contract + boundary tests pass; full unit + typecheck + lint + build pass. |

### 4.2 Scope boundaries

- **In:** `src/domains/evidence/evidence-storage.port.ts`, `src/domains/evidence/evidence-storage.port.test.ts`, `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/**`.
- **Out:** adapters, runtime wiring, Media service refactor, `prisma/**`, `app/**`, `package.json`, env config, discovery/CRM docs, planner docs.
- **Allowed task artifacts:** `docs/tasks/hrp-p0-a02-er001-evidence-storage-port/**`.

### 4.3 Domain boundaries

- **Addressability:** `StorageKey` only — never raw filesystem paths, never public URLs.
- **Streaming:** `read` returns `Promise<EvidenceByteStream>` (drained once); `write` consumes `EvidenceByteSource` (drained once).
- **Errors:** typed `EvidenceStorageError(reason)` with canonical reason enum; no bare Error leaking from the port.
- **Future slices (NOT in this slice):** `LocalVpsEvidenceStorageAdapter` (ER-002), `EvidenceRecord` metadata (ER-003), `storeEvidence` command (ER-004), access audit (ER-005), production/test environment guard (ER-006), backup/restore runbook (ER-007).

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `evidence-storage.port.ts` | Define interface, capability surface, error type, key guard. | `AC-01`, `AC-02` | Stop if port pulls in any provider/runtime symbol. |
| `STEP-02` | `evidence-storage.port.test.ts` | Type-contract, boundary, synthetic-byte functional tests. | `AC-03`, `AC-04` | Stop if any test depends on real PII or filesystem. |
| `STEP-03` | Gates | Run typecheck, lint, targeted unit, full unit, build. | `AC-05` | Stop on any failing gate. |
| `STEP-04` | Handoff | Write HANDOFF.md; freeze SHA at READY_FOR_AUDIT. | `AC-06` | No push, no PR, no production action. |

## 6. Acceptance Criteria

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Port compile under TypeScript strict; no provider/runtime import in port code. | `tsc --noEmit`; static boundary test reading port source. |
| `AC-02` | Port surface contains exactly `write`, `read`, `delete`, `exists`, `stat`; no gateway/adapter concerns (EvidenceRecord, audit, RBAC, signed URL, retention, quarantine, encryption, versioning). | Static structural assertions in test file. |
| `AC-03` | `asStorageKey` rejects empty/whitespace keys, absolute POSIX paths, absolute Windows paths (drive and UNC), and URL-shaped values; otherwise returns a branded `StorageKey`. | Direct unit assertions on `asStorageKey` (see `evidence-storage.port.test.ts > "asStorageKey — port boundary guard"`). |
| `AC-04` | `EvidenceStorageError` exposes a typed reason enum; `storageKey` field is set when relevant. | Direct unit assertions (see `evidence-storage.port.test.ts > "EvidenceStorageError — typed error surface"`). |
| `AC-05` | Targeted unit + full unit + typecheck + lint + build pass. | `node_modules/.bin/vitest run src/domains/evidence/`; `vitest run --config vitest.unit.config.ts`; `tsc --noEmit`; `npm run lint`; `npm run build`. |
| `AC-06` | Diff stays inside allowlist; `verify-task.ps1` PASS; `verify-handoff.ps1` PASS. | Scope command + pipeline scripts. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-01`, `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-01`, `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-02` | `AC-04`, `AC-05` |
| `RQ-05` | `STEP-03`, `STEP-04` | `AC-05`, `AC-06` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Port accidentally couples to a provider (Vercel Blob, node:fs, env). | Static boundary test asserts no such imports inside the port; documented in JSDoc. |
| `RISK-02` | Future adapter writers leak raw paths. | `asStorageKey` enforces no-path/no-URL at the boundary; brand type makes accidental raw strings surface in code review. |
| `RISK-03` | Future slice drift toward in-memory fallback. | Documented non-goal; test double lives only in test code; spec says "no production in-memory fallback". |

## 8. Open Questions / Known Limitations (dành cho ER-002+)

- Adapter choice and root resolution (`HRP_EVIDENCE_ROOT`) is intentionally out of scope; ER-002 will define the filesystem adapter and the safe-resolution rules.
- `EvidenceRecord` metadata (owner, evidenceType, status, retention) is ER-003; port's `EvidenceStat` is storage-level only.
- Audit, signed URL, encryption policy, multipart, versioning are deliberately deferred to later slices.
- No batch/multi-object operations yet (single-object semantics); revisit if usage demands batch.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial contract | ER-001 / P0-A02 thin slice from realignment plan. |
