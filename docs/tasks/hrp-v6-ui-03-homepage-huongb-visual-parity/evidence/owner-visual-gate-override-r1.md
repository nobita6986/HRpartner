# OWNER OVERRIDE — UI-03 visual gate

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Owner | HRPartner Project Owner |
| Date | `2026-09-09` |
| Reviewed implementation | `ca13a62` |
| Reviewed HANDOFF R1 | `d415672` |
| Decision | `APPROVED — CHANGE OF ASSURANCE POLICY` |

## 1. Owner decision

Agent-generated screenshots are not a feasible assurance mechanism in the current execution environment. Effective immediately, this Owner decision supersedes every requirement in TASK v1.4.1 and HANDOFF R1 that requires an Agent to:

- launch Edge or another local browser for evidence generation;
- use CDP to capture screenshots, bounding boxes, computed styles, overlays, or viewport measurements;
- produce or validate the set of 20 PNG files;
- obtain Owner visual sign-off before Tier 3 focused audit;
- treat missing browser runtime, missing PNG files, or missing CDP outputs as task blockers.

Agents must not fabricate screenshots, CDP output, measurements, or Owner approval. The existing placeholder/stub scripts and empty screenshot directory are not acceptance deliverables and may be removed from the task scope by Tier 1.

## 2. Resolution of current blockers

| Blocker | Owner resolution |
|---|---|
| `BLK-01` — Owner sign-off required before audit | **CLOSED BY OWNER POLICY OVERRIDE.** Visual approval moves to the deployed-site review after push. |
| `BLK-02` — Edge/CDP unavailable and 0/20 PNG | **CLOSED BY OWNER POLICY OVERRIDE.** No browser-generated evidence is required from an Agent. |
| `BLK-03` — 36 new failing tests versus baseline | **REMAINS BLOCKING.** This is a technical regression gate and must be resolved before push. |

Closing BLK-01 and BLK-02 is not a claim that visual parity already passes. It only changes who performs the visual check, on which environment, and at what point in the release flow.

## 3. Replacement execution flow

1. Tier 1 amends TASK and HANDOFF to incorporate this Owner override, removes screenshot/CDP/20-PNG acceptance requirements, and opens a correction round for `BLK-03`.
2. Tier 2 resolves all new test failures relative to the recorded baseline. Tests may be updated only where the intended UI composition changed; behavioral invariants must not be weakened to make the suite green.
3. Before push, the mandatory measurable gates are:
   - `npm run typecheck` exits `0`;
   - the focused public job-card truth test passes;
   - the full unit lane has the same expected failure set as the recorded baseline and `new failure count = 0`;
   - `npm run build` exits `0`;
   - task-scope and forbidden-path checks pass;
   - Tier 3 performs a focused source/test audit and finds no unresolved P0/P1 issue.
4. After the technical audit is accepted, the scoped UI implementation is committed and pushed without waiting for screenshot evidence.
5. The Owner reviews the actual deployed homepage after push. The deployment is the visual source of truth for this gate.
6. If the Owner passes the live UI, Tier 1 records final acceptance. If the Owner fails it, Tier 1 opens the smallest possible visual-correction round; no broad rollback or unrelated refactor is implied.

Until step 5 is complete, Tier 1 must label the product decision clearly as `AWAITING_OWNER_LIVE_VISUAL_REVIEW` in HANDOFF/Planner Resolution. This marker is an operational state and must be represented using a pipeline-valid status field if the verifier does not recognize it literally.

## 4. Focused audit boundary

Tier 3 must audit what can be established from source code and reproducible non-browser gates:

- preservation of API/data behavior, facets, pagination, job-detail navigation, and application flow;
- truthfulness of salary, slots, deadline, project/job copy, and absence of fabricated company data;
- route semantics, disabled-control semantics, keyboard/focus structure, and accessible markup;
- responsive layout intent visible in source and absence of obvious overflow-causing fixed dimensions;
- scope compliance, forbidden paths, build/typecheck results, and regression-test integrity.

Tier 3 must not fail this task because Agent screenshots, Edge/CDP measurements, overlays, or pre-push Owner visual sign-off are absent. Tier 3 also must not issue a visual-parity PASS on the Owner's behalf.

## 5. Owner acceptance statement

The Owner will perform the final visual review on the homepage available after the relevant Git push/deployment. This review determines whether the result is sufficiently faithful to `scratch/new-ui-HuongB-ref-2026-09-07/code.html` and whether another visual-correction round is required.

> Owner verdict: **APPROVED — replace Agent screenshot evidence with post-push Owner live visual review.**
