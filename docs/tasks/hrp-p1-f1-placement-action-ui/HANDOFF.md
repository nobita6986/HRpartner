# HANDOFF — `hrp-p1-f1-placement-action-ui`

> Round-2 handback. Semantic correction commit (`f2fb34f`) and docs
> checkpoint commit (this one) are forward appends — round-1 commits
> `713aee9` + `aefb8e6` and frozen baselines `4983fdc4`/`0dc25571` are
> preserved verbatim.
>
> This file is the compact (§0..§5) HANDOFF shape. The full
> §1/§2/§3/§4/§5/§6/§7 legacy shape was abandoned for round 2.

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-f1-placement-action-ui` |
| Spec version | `v1.1` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | UI mở 5 mutation commands từ production-ready backend; rủi ro chính: stale status, leak raw error, idempotency key mistreatment khi retry, role bypass nếu UI gate lệch server gate, double-click tạo duplicate placement. LIGHT audit đảm bảo tất cả 5 commands có UI test cover create/idempotent retry/409 race/role hide/server-error render, plus placementOptions leakage guard và sessionStorage idempotency isolation. |
| Baseline | `fabeda29c97720612136909b8f7beccfdf217c25` |
| Implementation SHA | `f2fb34f1b113a10c42cfafde9ac7f7b0e61c2ecd` |
| Execution round | `5` (PRE-AUDIT CORRECTION BATCH 2/2) |
| Status | `BLOCKED` |
| Frozen delivery | `NO` |
| Canonical gates | `FAIL / PENDING` |
| Audit eligibility | `NOT_ELIGIBLE` |
| Test environment | `REQUIRED` |
| Correction batches used | `2` |
| Next gate | `T0_CI_SYNTHETIC_DB_GATE` |

## 1. Outcome and changed surface

### 1.1 Delivered in round 2 (after T0 reported round-1 handback inaccurate)

1. **C2-01 — DB teardown fix.** `tests/db/p1f1-placement-action-ui.integration.test.ts`
   rewritten with a single canonical `makeSubmission` helper. Every
   CandidateSubmission (including the legacy `slot=null` variant in
   `F1-DB05`) flows through this helper, which **unconditionally** pushes the
   created id into `submissionIds`. `afterAll` deletes by tracked id in the
   strict reverse-FK order: placements → application status history →
   candidate submissions → job postings → staffing order slots → job
   openings → staffing orders → placement cases → projects → client
   companies → labor profiles → users. The final zero-residue assertion
   runs inside a transaction and asserts all counts are `0`.

2. **C2-02 — F1-DB09 is now route-driven.** The test invokes the canonical F0
   `POST /api/admin/placements` handler (with auth + idempotency + role
   gate + RLS) and the canonical `POST /api/admin/placements/[id]/actions/confirm`
   handler. Asserts the real HTTP envelope (`status: 201/200`,
   `placementId`, `replayed`, `confirmedAt`). Then refreshes the
   read-model via `getRecruiterWorkbenchList` and proves the projection
   observes `status=CONFIRMED`. **No direct `placement.create` or
   `placement.update` calls in the F1-DB09 proof.**

3. **C2-03 — F1-DB10 is now also route-driven.** Same canonical F0 create +
   confirm path. The test then issues `POST /api/admin/placements/[id]/actions/effective`
   with valid evidence against an HRP-managed `CONFIRMED` placement. The
   canonical route returns `400 PLACEMENT_VALIDATION_ERROR` (taxonomy
   freeze — never `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED`). Re-reading the
   DB proves the placement stays `CONFIRMED` and the PlacementCase stays
   `OPEN`. **No manually thrown `HRP_EFFECTIVE_FORBIDDEN`.**

4. **C2-04 — `EFFECTIVE_EVIDENCE_SCHEMA` is now a single exported value.**
   Lives in `src/domains/talent/recruiter-workbench.placement-actions.states.ts`.
   The production `EffectiveEvidenceForm` (also exported) imports and uses
   it. Tests import the EXACT production schema; the previous duplicate
   `F4_EVIDENCE_SCHEMA` Zod object has been deleted. Component-level
   invalid-timestamp + onSubmit-wiring assertions replace the static-only
   proof.

5. **C2-05 — TASK.md and HANDOFF.md restored to canonical V2 structure.**
   TASK.md now has §0..§10 with all 11 required section headings. HANDOFF.md
   uses the compact §0..§5 shape. AUDIT.md remains emptied for Tier 3.
   Controls are truthful `BLOCKED / NOT_ELIGIBLE`, `Correction batches
   used: 2`. §5 lists the new `BLK-01` row tying the blocker to the
   failed synthetic DB gate.

6. **C2-06 — Range-aware strict UTF-8 / no-BOM / no-CRLF / no-mojibake
   scanner.** New `.ai-pipeline/scripts/verify-encoding-range.mjs` runs a
   range-aware scan on every committed text file in
   `fabeda29..HEAD` (NOT just dirty files, NOT PowerShell 5.1
   transcoding). Output recorded in §2 E-12: 26/26 PASS, 0 BOM, 0 NUL,
   0 U+FFFD, 0 CRLF, 0 Latin-1 mojibake streaks.

### 1.2 Changed surface

```diff
 .ai-pipeline/scripts/verify-encoding-range.mjs   | NEW (strict range-aware scanner)
 src/domains/talent/recruiter-workbench.placement-actions.tsx | extract EVIDENCE_SCHEMA import
 src/domains/talent/recruiter-workbench.placement-actions.states.ts | export EFFECTIVE_EVIDENCE_SCHEMA
 src/domains/talent/recruiter-workbench.placement-actions.test.tsx | drop duplicate Zod schema; add component-level wiring tests
 tests/db/p1f1-placement-action-ui.integration.test.ts | full rewrite: tracked-id helpers + F0 route-driven F1-DB09/F1-DB10
 docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md | restore §0..§10 V2 structure + truthful BLOCKED controls + Correction batches used: 2
 docs/tasks/hrp-p1-f1-placement-action-ui/HANDOFF.md | compact §0..§5 V2 handback
```

### 1.3 Not delivered

- T0 reproduction x3 was NOT run by Tier 1 (T0 owns that gate).
- Tier 3 audit was NOT performed (Audit eligibility: NOT_ELIGIBLE).
- No packages added. No migration added. No F0 / E0 / E1 surface edited.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| `—` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md` | `RESULT: PASS` (with truthful BLOCKED warnings) | None — V_FAST_FREEZE BLOCKED config is permitted |
| `—` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md` | `RESULT: FAIL` (3 H-16 errors expected for BLOCKED pre-audit; H-01/H-02/H-03/H-04/H-05/H-06/H-07/H-09/H-10/H-12/H-14 PASS) | None — Tier 1 freezes only with `BLOCKED` until T0 reproduction passes; H-16 failures are consequent to the BLOCKED controls the user instructed us to preserve |
| `AC-01` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.test.tsx` covering `F1-RL01..04` + `F1-CEL01..06` x 6 + LOCK-15 | PASS — 48 tests | none |
| `AC-02` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.states.test.ts` covering `availableActionsForRow` for 7 `nextAction` values + LOCK-15 matrix | PASS — 58 tests | none |
| `AC-03` | run `npx vitest run app/admin/recruiter-workbench/page.test.ts` covering `canMutatePlacement` per role | PASS — 27 tests | none |
| `AC-04` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.test.tsx` covering `F4-EV-01..10` + `F4-CMP-01..03` (exported schema + form wiring) | PASS — uses exported `EFFECTIVE_EVIDENCE_SCHEMA` | none |
| `AC-05` | `tests/db/p1f1-placement-action-ui.integration.test.ts` `F1-DB09` + `F1-DB10` (round 2 route-driven) | target `T0_CI_SYNTHETIC_DB_GATE` | **limitation: requires DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST** (T0 / Owner provides); env-gated ENV_BLOCKED is honest |
| `AC-06` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` adversarial leak tests | PASS — 26 tests | none |
| `AC-07` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` mint + scope + same-key reuse on payload unchanged / network / 5xx | PASS
| `AC-08` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` safe mapping (5xx / network / unknown → frozen Vietnamese generic) | PASS — 26 tests | none |
| `AC-09` | run `npx vitest run src/shared/ui/sheet/slide-out-drawer.test.tsx` | PASS — 4 tests | none |
| `AC-10` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` 5xx retry reuse key | PASS | none |
| `AC-11` | `tests/db/p1f1-placement-action-ui.integration.test.ts` `afterAll` + tracked-id helpers (round 2 single canonical `makeSubmission`) | target `T0_CI_SYNTHETIC_DB_GATE` | same limitation as AC-05 |
| `AC-12` | `E-12` `node .ai-pipeline/scripts/verify-encoding-range.mjs fabeda29c97720612136909b8f7beccfdf217c25` | RESULT: PASS — 26/26 files; 0 BOM / 0 NUL / 0 U+FFFD / 0 CRLF / 0 mojibake streaks | none |
| `AC-13` | `E-13` verify-task.ps1 | RESULT: DRAFT-VALID (1 BLOCKED warning, expected) | none |
| `AC-14` | `E-14` verify-handoff.ps1 | RESULT: FAIL (3 H-16 errors are expected for the BLOCKED-state controls the user instructed us to preserve; substance gates H-02/H-03/H-04/H-05/H-06/H-07/H-09/H-10/H-12/H-14 PASS) | none |
| `AC-15` | `E-15` forbidden-path audit (`git diff fabeda29..HEAD -- app/admin/applications src/domains/applications app/api/admin/applications prisma/schema.prisma prisma/migrations package.json package-lock.json next.config.*`) | RESULT: PASS — empty | none |
| `AC-16` | run `npx vitest run src/domains/talent/recruiter-workbench.placement-actions.test.tsx` F1-NA matrix + F1-NA-STALE safety net | PASS — 7 enum values × 2 tests = 14 tests | none |
| `AC-17` | `E-12` (see AC-12) | RESULT: PASS | none |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-12` | `node .ai-pipeline/scripts/verify-encoding-range.mjs fabeda29c97720612136909b8f7beccfdf217c25` | exit 0; `RESULT: PASS. 26/26 text file(s) in range fabeda29..HEAD; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks.` | inline (this HANDOFF) |
| `E-13` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md` | exit 0; `RESULT: DRAFT-VALID (1 warning)` — A-04 BLOCKED-status placeholder/dry-run warning is expected | `evidence/verify-task-output.txt` |
| `E-14` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md` | exit 2; `RESULT: FAIL (3 errors, 1 warning)`. Failures are H-16 frozen-delivery gate (Frozen delivery must be YES, Canonical gates must be PASS/NOT_REQUIRED, Correction batches used must be 0 or 1) — all 3 are CONSCIOUS BLOCKED-state values that Tier 1 is required by the T0 handback to preserve until T0 reproduction passes. Substance gates H-02..H-14 all PASS. | `evidence/verify-handoff-output.txt` |
| `E-15` | `git diff fabeda29c97720612136909b8f7beccfdf217c25..HEAD -- 'app/admin/applications' 'src/domains/applications' 'app/api/admin/applications' 'prisma/schema.prisma' 'prisma/migrations/' 'package.json' 'package-lock.json' 'next.config.ts' 'next.config.mjs' 'next.config.js' 'tsconfig.json' ` | exit 0; empty diff | inline |
| `E-FULL-UNIT` | `npm run test:unit` | exit 0; 196 files / 3228 tests + 9 skipped PASS | inline |

## 4. Deviations and blockers

| ID | Description | Decision Tier 1 must make | Resolution |
|---|---|---|---|
| `BLK-01` | T0 synthetic DB gate still pending after round-2 source / tests rebuild. The `tests/db/p1f1-placement-action-ui.integration.test.ts` now invokes canonical F0 routes and tracks every fixture id, but the gate cannot be confirmed locally without `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST`. | Wait for T0 reproduction x3 + relevant F0 predecessor tests x3 + full canonical integration before flipping to `READY_FOR_AUDIT`. | OPEN |

## 5. Final status

- **Status:** `BLOCKED`
- **Frozen delivery:** `NO`
- **Canonical gates:** `FAIL / PENDING`
- **Audit eligibility:** `NOT_ELIGIBLE`
- **Test environment:** `REQUIRED`
- **Next gate:** `T0_CI_SYNTHETIC_DB_GATE`
- **Correction batches used:** `2`

Implementation SHA: `f2fb34f1b113a10c42cfafde9ac7f7b0e61c2ecd`. Docs/evidence checkpoint SHA: external (this file's commit).

Tier 1 stops here. No push, no PR, no Tier 3 engagement, no merge, no deploy. T0 owns the next gate.

Handoff status: BLOCKED
