# HRPartner — Maintainability Reference (T1C)

> Document status: NON-AUTHORITATIVE REFERENCE
> Measured against main SHA: ce18f8af
> Measurement date: 2026-10-03
> Reconciliation note: header SHA was cdde6cef at first authoring; re-pinned to ce18f8af after forward-only merge of origin/main (PR #83, 02:57 +0700).
> Owner: T0/Owner
> Supersedes: none
> Conflict rule: authority documents win

## 1. Purpose and non-authority statement

This document answers exactly one question:

> Given the canonical HRPartner architecture, how should I change code without making the system harder to maintain?

It does NOT answer:

- "What task should I do next?"
- "Which V7/V8 domain rule should I override?"
- "Which production slice should I reopen?"

Those belong to the canonical authority documents below. Where this reference and an authority conflict, the authority wins. This file must never become a second source of truth.

## 2. Authority order

| Concern | Authority |
| --- | --- |
| Execution sequencing / coordination / go-live gates | [docs/HRP_EXECUTION_REALIGNMENT_PLAN.md](../HRP_EXECUTION_REALIGNMENT_PLAN.md) |
| Canonical domain and architecture | [docs/V7/V7_ARCHITECTURE.md](../V7/V7_ARCHITECTURE.md) + [docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md](../V7/HRP_V6_PLUS_V7_MASTER_INDEX.md) |
| Future experience / product direction | [docs/V8/V8_MASTER_PLAN.md](../V8/V8_MASTER_PLAN.md), [docs/V9/V9_MASTER_PLAN_v1.1.md](../V9/V9_MASTER_PLAN_v1.1.md) |
| Current coordination cursor | [docs/PLANNER_HANDOVER.md](../PLANNER_HANDOVER.md) (read `ROADMAP_CURSOR`) |
| Coding / process rules | [docs/V7/AI_CODING_GUARDRAILS.md](../V7/AI_CODING_GUARDRAILS.md), [`.ai-pipeline/README.md`](../../.ai-pipeline/README.md), current TASK or HANDOFF |
| Infrastructure & data-architecture decisions | [docs/important/HRP_CRM_INFRASTRUCTURE_AND_DATA_ARCHITECTURE.md](HRP_CRM_INFRASTRUCTURE_AND_DATA_ARCHITECTURE.md), [docs/important/HRP_PRODUCTION_GO_LIVE_HANDOFF_2026-10-02.md](HRP_PRODUCTION_GO_LIVE_HANDOFF_2026-10-02.md) |

This reference sits **below** all of the above. It cannot redefine P0/P1/P2/P3, the domain model, or production verification.

## 3. Statement classification

Every sentence in HRPartner docs falls into exactly one class:

| Class | Meaning (≤3 lines) |
| --- | --- |
| `CANONICAL` | Rule defined in V6+/V7/AFF authority. Silent redesign forbidden. |
| `VERIFIED_IMPLEMENTATION` | Capability with explicit implementation/production evidence. Do not reopen from zero. |
| `TARGET_ARCHITECTURE` | Canonical but not yet fully implemented. Verify current source and TASK scope before coding. |
| `DEFERRED` | Documented future capability. Existence in repo ≠ permission to implement. |
| `MAINTAINABILITY_RECOMMENDATION` | Engineering advice from this file. Implements only when current TASK includes it, T0/Owner promotes it, or it is needed to safely finish the active task. |

## 4. Maintainability work classification

| Class | When to apply |
| --- | --- |
| `BLOCKING` | Required in the active task — security bypass, broken invariant, PII leak, migration ambiguity, invalid idempotency/concurrency, runtime/build blocker. |
| `TOUCHED_SURFACE` | Small bounded cleanup on the same file/module the active task already touches: split one mapper, dedupe one permission check, split one service only if it blocks a safe hotfix. |
| `DEDICATED_DEBT_TASK` | Larger refactor needing its own contract: central env validation, module reorganize, query architecture rewrite, role/permission codegen, Prisma/schema reorganize, integration contract consolidation. Open only via T0/Owner contract. |
| `DEFERRED` | Add infrastructure (Kafka, Elasticsearch, Kubernetes, microservices, generic workflow engine, full event sourcing, broad framework rewrite) only when measured pressure proves it is justified. |

`BLOCKING` and bounded `TOUCHED_SURFACE` work belongs in the current task. `DEDICATED_DEBT_TASK` and `DEFERRED` do not.

## 5. Core invariants to preserve

The canonical architecture documents already define these. Reference (do not redefine) at:

- [`docs/V7/V7_ARCHITECTURE.md`](../V7/V7_ARCHITECTURE.md) §3, §4 — bounded contexts, aggregate semantics.
- [`docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md`](../V7/HRP_V6_PLUS_V7_MASTER_INDEX.md) §3 — domain distinctions that MUST stay explicit.
- [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../HRP_EXECUTION_REALIGNMENT_PLAN.md) §1 — authority order, evidence-gated deployment.

One-line index (link above for full rule):

- `LaborProfile` is the canonical person identity (long-lived, never replaced by a `Worker`).
- `JobOpening ≠ JobPosting` — opening is operational demand; posting is public projection.
- `Application ≠ JobProposal` — candidate-initiated vs HRP-initiated.
- `Placement ≠ Assignment` — placement is the matching outcome; assignment is the operational worker placement under HRP-managed demand.
- `ReferralAttribution ≠ HandlingAssignment ≠ CommissionBeneficiaryDecision` — source ≠ custody ≠ beneficiary.
- Client-managed `Placement` does NOT create a `Worker`.
- Permission ≠ data scope (authenticate → resolve permissions → resolve context/scope → authorize command/query → RLS).
- V8 is an experience layer; it never replaces V7 domain authority.
- CRM / n8n are engagement/orchestration systems; they do not become HRP domain authority.
- Public media ≠ sensitive evidence (CCCD travels only via the `EvidenceGateway`).

## 6. Recommendations and when to apply

| Recommendation | Apply when | Do not apply when | Work class |
| --- | --- | --- | --- |
| Central environment validation | Adding or changing env, deployment pipeline, or hitting production config failure. | Active task is a copy/style edit or unrelated UI tweak. | `DEDICATED_DEBT_TASK` |
| Oversized module decomposition | Module >700 lines is being touched and its size blocks a safe change. | No active task touches it. | `TOUCHED_SURFACE` (single file), or `DEDICATED_DEBT_TASK` (campaign) |
| Role/permission drift protection | Touching role, permission, JWT, middleware, sidebar, or RLS. | Task does not touch auth surface. | `BLOCKING` (when in scope) / `TOUCHED_SURFACE` |
| Query/command separation | Adding lifecycle mutation or public/admin read model. | Static content / copy / comment change. | `TOUCHED_SURFACE` |
| Public job query optimization | Editing job list/detail, or evidence of payload growth / N+1 / latency appears. | No measurement and no active task on the path. | `TOUCHED_SURFACE` (now) / `DEDICATED_DEBT_TASK` (campaign) |
| Evidence storage/security | BEFORE CCCD or real evidence is opened to production users. | Synthetic preview work only. | `BLOCKING` when go-live is in scope |
| External integration contracts | Before adding CRM, Zalo, n8n, or new worker process. | Internal refactor only. | `DEDICATED_DEBT_TASK` |
| Canonical journey tests | Inside each slice that touches the journey. | Saving tests until the end of a phase. | `TOUCHED_SURFACE` |
| Frontend module guardrails | Page/component is large AND is being touched or has caused regression. | UI copy/visual tweak only. | `TOUCHED_SURFACE` (single file) |
| Database invariants | Adding NOT NULL/FK/CHECK, or invalid state cannot be stored. | Migration would fabricate historical truth. | `TOUCHED_SURFACE` (in-scope) / `DEDICATED_DEBT_TASK` (campaign) |

## 7. Evidence-backed current repository observations

Measured against `ce18f8af` on 2026-10-03.

### 7.0 Reconciliation history

| Header SHA at commit | When | Why |
| --- | --- | --- |
| `cdde6cef` | 2026-10-03 11:50 (commit `b531140a`) | First authoring; main HEAD was `cdde6cef` (PR #78 go-live handoff). |
| `ce18f8af` | 2026-10-03 ~12:00 (commit `<this>`) | After forward-only merge of `origin/main` (PR #83 admin sidebar realignment). Evidence was re-measured; size landscape and capability list are unchanged. |

### 7.1 File-size landscape

Total production TS/TSX files (`src/`, `app/`, `lib/`): **531** (was 529 on `cdde6cef`; +2 = PR #82 UnderDevelopment.tsx + test).
Files >500 lines: **39** (`>500` = review-required per `AI_CODING_GUARDRAILS.md` §2.2; 19 in the 500–700 band + 20 over 700).
Files >700 lines: **20** (`>700` = architecture smell by default; +1 from `cdde6cef` due to PR #82/83 net additions).

Top hotspots (>700 lines, sorted desc):

| Lines | Path |
| ---: | --- |
| 1031 | `src/domains/talent/recruiter-assignment.service.ts` |
| 985 | `src/domains/staffing/job-posting-authoring.service.ts` |
| 980 | `src/domains/talent/recruiter-workbench.read-service.ts` |
| 921 | `src/domains/job-board/public.service.ts` |
| 915 | `src/domains/staffing/assignment-placement.service.ts` |
| 867 | `src/domains/attendance/ticket.service.ts` |
| 834 | `src/domains/evidence/local-vps-evidence-storage.adapter.ts` |
| 795 | `src/domains/talent/recruiter-workbench.placement-actions.tsx` |
| 767 | `app/admin/media/media-library-client.tsx` |
| 750 | `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` |
| 713 | `src/domains/talent/recruiter-workbench.derive.test.ts` |

These are review-required. They are NOT automatic refactor targets — only `BLOCKING` when an active task is blocked by them, or `DEDICATED_DEBT_TASK` when T0 opens a contract.

### 7.2 `process.env` usage

`process.env.*` referenced in **40 files** under `src/` (was 32 on `cdde6cef`; +8 from PR #82/83 admin role-guard + commission page reduction). There is no `src/shared/config/env.server.ts` or equivalent. Env reading is currently scattered through `src/shared/auth/jwt.ts`, `src/shared/auth/cron-auth.ts`, `src/shared/auth/internal-webhook-auth.ts`, `src/shared/feature-flags.ts`, `src/db/engine-client.ts`, `src/domains/referrals/redirect-token.ts`, etc. This is real debt; it is not blocking current work unless a task touches env shape.

### 7.3 Maintainability capabilities already present

These capabilities exist and must not be re-implemented under the banner "maintainability":

- Permission catalog: `src/shared/auth/permission-catalog.ts` (`PERMISSION_CATALOG`, `PERMISSION_GROUPS`, `PermissionCode`).
- Permission resolver: `src/shared/auth/permission-resolver.ts`.
- Idempotency: `src/shared/integrity/idempotency.ts` — UNIQUE `(actorId, route, key)` scope, body hash for conflict, race-safe `P2002` replay, 24h default TTL.
- Outbox: `src/shared/integrity/outbox.ts` — `enqueueOutbox` inside `$transaction`, `drainOutboxOnce` in-process, cron `processCronRetry`. No QStash/Redis/worker dependency.
- Evidence storage port: `src/domains/evidence/evidence-storage.port.ts` — provider-neutral, opaque `StorageKey` brand, streaming read, typed `EvidenceStorageError` reasons, no raw FS path or URL on the surface.
- Evidence VPS adapter: `src/domains/evidence/local-vps-evidence-storage.adapter.ts` — filesystem implementation behind the port, symlink-rejected per segment, atomic `'wx'` writes, three-mode cleanup, safe-message whitelist.
- Public job projection tests: `src/domains/job-board/public-card-truth.{test,integration.test}.ts`, `public-board-architecture.test.ts`, `public-select.static.test.ts`, `job-posting-stamps-mapping.test.ts`.
- Security matrix integration test: `src/domains/security/security-matrix.integration.test.ts`.

### 7.4 Test files larger than services

Several test files exceed `src/domains/*` service files in line count (e.g. `recruiter-workbench.read-service.test.ts` 1552 lines vs the 980-line service). This is a **legitimate** pattern in this repo for behaviour-rich test suites; it does NOT trigger the >700 architecture-smell rule for production sources.

## 8. Prioritized debt candidates

| Candidate | Current evidence | Trigger | Class | Priority condition |
| --- | --- | --- | --- | --- |
| Central environment validation | 32 files reference `process.env`; no central `env.server.ts`. | Active task touches env, deploy pipeline, or hits production config failure. | `DEDICATED_DEBT_TASK` | Highest ROI when `BLOCKING` a deploy/evidence task. |
| Oversized touched services | 11 services >700 lines; 19 total. | Active task touches one of them and size blocks a safe change. | `TOUCHED_SURFACE` (single) or `DEDICATED_DEBT_TASK` (campaign) | Prefer `TOUCHED_SURFACE`; do not mass-split. |
| Role/permission equality tests | Permission catalog exists but the equality between Prisma role enum, JWT claim, sidebar, and `PERMISSION_CATALOG` is not codified. | Touching role/permission/JWT/middleware/sidebar/RLS. | `TOUCHED_SURFACE` (equality test) over codegen campaign | Static equality test first; codegen only if pressure mounts. |
| Public job projection / query scaling | `public.service.ts` 921 lines, single projection surface. | Editing job list/detail with payload/N+1/latency evidence. | `TOUCHED_SURFACE` (card/detail split) | Add DB-side filter/pagination before any dedicated search. |
| Security flow clarity | Auth middleware exists; check rate-limit → auth → permission/scope → command/query chain on touched protected routes. | Touching any protected route. | `TOUCHED_SURFACE` (audit + small fix) | Not a stand-alone project. |
| External integration contract drift | CRM/HRP split already documented; S2S contract not yet declared. | Before opening CRM/Zalo/n8n/worker slice. | `DEDICATED_DEBT_TASK` | Versioned contract + idempotent receiver + outbox. |

Priority order is conditional, not an execution roadmap. A candidate is opened only when its trigger fires and a contract is written.

## 9. When HRPartner should apply these recommendations

### NOW (this T1C task)

- Land this reference in `docs/important/`. Do NOT open any other task from it.
- Continue the active P1 stream (`hrp-p1-e0-recruiter-workbench-read-model`) and any hotfix in flight.
- Do NOT mass-refactor, do NOT mass-`src/domains/**` moves.

### WHEN TOUCHING THE SAME SURFACE

- Apply `TOUCHED_SURFACE` only on the file the active task already touches.
- Add the canonical journey regression for the slice (Demand → Public job, Intake → LaborProfile, PlacementCase → Placement, HRP-managed effective, Handling → Company Pool, AFF provenance, Authorization, Evidence security, CRM integration). See `V7_ARCHITECTURE.md` §3 and the canonical journeys in the previous companion guide.
- Check permission, scope, and RLS for any auth-touching change.
- Check idempotency/concurrency for any mutation path.

### BEFORE REAL EVIDENCE / CCCD GO-LIVE

- Evidence access authorization (separate from raw record access).
- Filesystem isolation outside web root, unguessable IDs, MIME/type/size validation, checksum, TLS.
- Audit access AND delete.
- Encrypted backup outside VPS + restore drill.
- Retention and quarantine policy.
- `REAL_EVIDENCE_STORAGE_ENABLED=true` only in approved VPS environments; `false` in preview/test.

### BEFORE CRM / n8n / CHANNEL EXPANSION

- Versioned event + error envelope (`IntegrationEventEnvelope`, `IdempotencyKey`, `CorrelationId`, `ActorRef`, event version, retry semantics).
- Scoped service identity + rotation + audit.
- Idempotent receiver + outbox + dedup.
- Retry/dead-letter observability.
- CRM and HRP stay separated by S2S contract; CRM/Chatwoot is engagement, HRP is system of record.

### WHEN V8 WORKSPACES / KANBAN START

- Column-level pagination, cursor/page loading.
- Query batching; no N+1.
- Incremental refresh + server-confirmed optimistic updates.
- No "kanban god page" — split by workspace.
- Drag/drop invokes canonical V7 commands; never patch lifecycle status directly from a component.

### ONLY AFTER MEASURED SCALE PRESSURE

- Dedicated search engine (Postgres FTS / `pg_trgm` first).
- Advanced caching beyond in-process.
- Realtime infrastructure beyond query invalidation + polling + existing server event.
- Service extraction beyond the modular monolith.
- Microservices, Kafka, Elasticsearch, Kubernetes, generic workflow engine, full event sourcing, broad framework rewrite.

## 10. Agent pre-flight checklist

Before opening a code change:

- [ ] Current `TASK.md` and its spec version, baseline, and lane
- [ ] Exact `origin/main` SHA this work is based on
- [ ] Relevant canonical authority for the touched surface (V7/V8/AFF/EXEC_PLAN)
- [ ] Verified implementation that must not regress
- [ ] File ownership and forbidden paths
- [ ] Permission, scope, and RLS for the touched surface
- [ ] PII / evidence implications
- [ ] Idempotency / concurrency implications
- [ ] Migration / data ownership (especially if V7 authority is in play)
- [ ] Test environment availability
- [ ] `BUILD_VS_ADOPT` decision if adding a dependency
- [ ] `BUILD_VS_AUTOMATE` decision if adding a connector/scheduler/workflow
- [ ] `process.env` shape impact (does the central env surface need to change?)
- [ ] Frontend size implications if a `app/` or component file is being touched

## 11. Completion checklist

Before handoff:

- [ ] `tsc` / typecheck PASS in-scope
- [ ] `eslint` PASS in-scope
- [ ] Unit tests PASS in-scope (no regression in the existing gate)
- [ ] Integration tests PASS in-scope (RLS / DB / S2S as applicable)
- [ ] Build PASS
- [ ] Strict UTF-8 no-BOM verification on every changed file (`.ai-pipeline/scripts/verify-encoding.ps1`)
- [ ] Migration evidence if schema changed (NDJSON + post-check)
- [ ] Authorization / RLS negative tests if auth surface touched
- [ ] Canonical journey regression for the touched slice
- [ ] Exact Implementation SHA recorded
- [ ] Clean working tree (no `git add .` / `git add -A`)
- [ ] No secret / no PII in commit / no leakage in logs
- [ ] Known limitations documented (if any deferred decision was taken)

## 12. Revision metadata

| Field | Value |
| --- | --- |
| Document status | NON-AUTHORITATIVE REFERENCE |
| Measured against main SHA | cdde6cef |
| Measurement date | 2026-10-03 |
| Owner | T0/Owner |
| Supersedes | none |
| Conflict rule | authority documents win (see §2) |
| Companion source (not authority) | `C:\Users\Admin\Downloads\HRPARTNER_ARCHITECTURE_MAINTAINABILITY_GUIDE_V2.md` (historical, not canonical) |