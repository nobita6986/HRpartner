# TASK — `hrp-p1-f1-placement-action-ui`

> Implementation round landed as `4983fdc4` + `0dc25571`.
> PRE-AUDIT CORRECTION BATCH 1/1 reports `CHANGES_REQUIRED`.
> Current effective status: `BLOCKED / NOT_ELIGIBLE`.
> Next gate: `T0_CI_SYNTHETIC_DB_GATE`.
> Tier 3 MUST NOT audit yet.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f1-placement-action-ui` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `UI` (thin client island around 5 accepted F0 routes) |
| Build vs adopt | `ADOPT` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Spec version | `v1.1` |
| Status | `BLOCKED` (PRE-AUDIT CORRECTION BATCH 1/1: `CHANGES_REQUIRED`) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Open Owner decisions | `0` |
| Blocker | `T0_CI_SYNTHETIC_DB_GATE` (F-01 teardown failure, F-07 evidence depth, F-09 control drift) |
| Test environment | `REQUIRED` |
| Correction budget | `1` (used: 1) |
| Frozen delivery | `NO` (post-correction T0 reproduction pending) |
| Canonical gates | `FAIL / PENDING` |
| Audit eligibility | `NOT_ELIGIBLE` |
| Baseline | `fabeda29c97720612136909b8f7beccfdf217c25` |
| Implementation SHA | `<filled by Tier 1 in semantic correction commit>` |
| Docs/Evidence SHA | `<reported externally by Tier 1, NOT pinned in this file>` |
| Depends on | P1-F0 `ACCEPTED`; P1-E0 `ACCEPTED`; P1-E1 `ACCEPTED` + merged main |
| Current execution round | `4` (PRE-AUDIT CORRECTION BATCH 1/1) |
| Current audit round | `0` (Tier 3 not yet engaged) |
| Next gate | `T0_CI_SYNTHETIC_DB_GATE` |

> **Note on Test environment.** The previous v1.1 doc used
> `Test environment = REQUIRED` in the control table and
> `Test environment = NOT_REQUIRED` in the inline note. Those two
> statements contradicted each other. The truthful state for the next
> gate (`T0_CI_SYNTHETIC_DB_GATE`) is `REQUIRED` — the
> synthetic PostgreSQL instance is mandatory for the integration test
> to run at all. `ENV_BLOCKED` is an honest report when the env is
> absent, never a fake PASS.

> **Note on correction budget.** PRE-AUDIT CORRECTION BATCH 1/1 was
> issued by T0 with verdict `CHANGES_REQUIRED`. Tier 1 used exactly
> one correction batch to resolve F-01..F-09. If T0 reproduction
> still fails after this batch, a second batch will be issued (and
> the budget above will be incremented accordingly).

## 1. Outcome

### 1.1 User-visible outcome (post-correction target, NOT this round)

- ADMIN / HR_MANAGER open `/admin/recruiter-workbench`, see a row
  with `nextAction = REVIEW_PLACEMENT` and no placement —
  action cell renders the `Mo bo tri` (open placement) trigger.
  Server-derived `canMutatePlacement = true`.
- HR_STAFF / CTV / PUBLIC users see NO mutation affordance at all
  (server-derived `canMutatePlacement = false`).
- Right-side `SlideOutDrawer` opens; user picks an option (preselect
  if single); submit fires `POST /api/admin/placements` with
  idempotency key scoped per `placementCaseId + payloadHash`.
- 5xx / network errors render fixed Vietnamese generic message
  — no leak of raw `envelope.message`, no leak of secret /
  PII / `acknowledgementRef` / actor id / tokens.
- Idempotency-Key is preserved across network uncertainty and 5xx
  retry; cleared only on 200/201 terminal success.
- EFFECTIVE action is offered only when
  `placement.managementMode = CLIENT_MANAGED` AND
  `placement.status = CONFIRMED` AND row `nextAction = REVIEW_PLACEMENT`.

### 1.2 Out of scope

- No schema change.
- No new package.
- No fork of F0 helpers.
- No client-side audit log or `placement.timeline` hook.
- No toast library / SWR / optimistic mutation.

## 2. Surface (in-scope roots)

See `HANDOFF.md` for the current SHAs and diff summary.

## 3. Forbidden paths

See `HANDOFF.md`.

## 4. Findings resolved in this correction batch

| ID | Severity | Resolution |
|---|---|---|
| F-01 | RELEASE BLOCKING | `jobPostingIds` tracked; strict reverse-FK teardown; zero-residue assertions |
| F-02 | RELEASE BLOCKING | server `canMutatePlacement = ADMIN || HR_MANAGER`; substantive tests for ADMIN, HR_MANAGER, HR_STAFF, CTV, PUBLIC |
| F-03 | RELEASE BLOCKING | 5xx / network -> fixed Vietnamese only; idempotency-key retention; adversarial leak tests |
| F-04 | Critical | Zod RFC 3339 + required `clientAcknowledgedByUserId` + `acknowledgementRef`; valid/invalid boundary tests |
| F-05 | Major | `SlideOutDrawer` adoption; fixed `U+FFFD` in `slide-out-drawer.tsx` (authorized narrow scope); a11y test added |
| F-06 | Critical | `nextAction === REVIEW_PLACEMENT` gate in `availableActionsForRow`; tests for all 7 enum values |
| F-07 | Major | runtime F1 command-shape against F0 routes + read-model verification + HRP-managed EFFECTIVE reject |
| F-08 | RELEASE BLOCKING | clean UTF-8 regenerated for TASK/HANDOFF/AUDIT; `AUDIT.md` emptied; Tier 1 self-review moved to `evidence/tier1-self-review.md` |
| F-09 | Critical | controls flipped to `BLOCKED / T0_CI_SYNTHETIC_DB_GATE`; 1 semantic + 1 docs checkpoint commit |

## 5. Revision Log

| Round | Date | SHA | Change |
|---|---|---|---|
| 1 | 2026-09-26 | `6dbd971d` | docs(p1-f1): materialize v1.1 contract + reconciliation |
| 2 | 2026-09-27 | `973585b9` | docs(p1-f1): flip controls to `READY_FOR_EXECUTION` |
| 3 | 2026-09-27 | `4983fdc4` | feat(p1-f1): placement action UI semantic commit |
| 3 | 2026-09-27 | `0dc25571` | docs(p1-f1): V2_FAST_FREEZE control flip + HANDOFF + AUDIT |
| 3 | 2026-09-27 | `5c53b1cb` | docs(p1-f1): update HANDOFF pin metadata |
| 3 | 2026-09-27 | `8bc38fd6` | docs(p1-f1): final HANDOFF-only pin metadata update |
| 3 | 2026-09-27 | `5a55ffea` | docs(p1-f1): final pin metadata update |
| 4 | 2026-09-28 | `<semantic-correction-SHA>` | PRE-AUDIT CORRECTION BATCH 1/1: source/tests for F-01..F-07 |
| 4 | 2026-09-28 | `<docs-checkpoint-SHA>` | PRE-AUDIT CORRECTION BATCH 1/1: clean UTF-8 docs + AUDIT emptied + controls to BLOCKED |

TASK status: BLOCKED
