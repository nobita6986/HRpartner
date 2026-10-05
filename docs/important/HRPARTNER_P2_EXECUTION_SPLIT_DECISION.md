# HRPartner — P2 Execution Split Decision

| Field | Value |
| --- | --- |
| Authority | Owner / Tier 0 |
| Status | `BINDING` |
| Document class | `BINDING EXECUTION DECISION` |
| Decision date | 2026-10-03 |
| Effective main baseline | `22a9451b83d0bf8a75a5a0b54d609ea32952e623` (`origin/main`, reconciled 2026-10-05) |
| Branch | `codex/t1c-p2-execution-split-decision` |
| Companion reconciliation | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §15.3 (new addendum) |
| Supersedes (planning-level only) | Non-binding rollout suggestions that conflict with this split |
| Applies to | T1A / T1B / T1C / Tier 3 / future implementation tasks opening P2 work |

> **Document status:** `BINDING EXECUTION DECISION` (Owner / Tier 0).
> **Conflict rule:** This decision is binding on execution **scope**, **order** and **acceptance vocabulary** for the P2 envelope. Source code, the canonical V7/V8/AFF authority documents, and the live Prisma schema continue to determine runtime behavior until implementation lands. The split does not change `docs/V6/aff_plan.md` domain authority and does not change the Realignment Plan authority order (§1); it only sequences P2 work and locks completion vocabulary.

## A. Purpose

This document materializes the Owner/Tier 0 decision to split P2 — Early V8 Experience into two execution envelopes:

- **P2.1** — Recruiter Referral Profile & Attribution V1 (referral-and-profile landing for one eligible recruiter).
- **P2.2** — Early V8 Workspace & Microsite Completion (workspace shell + remaining microsite polish for all recruiters).

It is the binding answer to the question "what does the next P2 contract open?" and the binding vocabulary for what may be claimed as "complete" once each envelope lands.

It is **not**:

- a TASK, HANDOFF, AUDIT, or implementation contract;
- a rewrite of `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`;
- a rewrite of `docs/V6/aff_plan.md`;
- a claim that any P2.1 / P2.2 capability is already implemented.

## B. Authority and ordering

1. **Authority order** is unchanged from `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §1.
   - `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` — execution sequencing.
   - `docs/V6/aff_plan.md` — domain/design authority for Universal Affiliate.
   - `docs/V7/...` — canonical domain model.
   - `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` — binding Mốc 0 → 3 order.
2. **AFF decision inventory** (`docs/V6/aff_plan.md` §20) remains the per-slice decision gate; nothing in this document reopens any `FINAL` AFF decision.
3. **Operational milestones** (Mốc 0 → 3 from the binding operational workflow debt decision) remain `BLOCKING` for any P2 envelope opening. P2 work — including planning or `READY_TO_CODE` contracts — does NOT start before Mốc 3 records a disposition.
4. **Pre-P2 readiness signals** — F9 disposition (`RESOLVED` or `CLOSED_NO_ISSUE`), no unresolved P1 authorization finding carried into P2, `ActorContext` + permissions + basic navigation stable, `REC` public profile / public JobPosting projection / Public Apply / public security boundary safe, sensitive evidence disabled or fully governed — are **inputs**, not a separate gate. They are absorbed by the Mốc 0 → 3 sequence recorded in [`docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md`](HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md) §D and §E.
5. P2 contracts do NOT reopen AFF slices that are `REUSE — DO_NOT_REOPEN` (§G.1). Defects found in reused capability open under their own narrow correction contract.

## C. Pre-P2 execution order (operational vs product milestones)

Operational milestones are labelled `OP-Mx` to avoid confusion with the product milestones `M0..M5` already defined in `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §46. The binding order is:

1. `OP-M0` — JobPosting production flow: **COMPLETE** (binding closeout in [`docs/tasks/hrp-t1a-postdeploy-runtime-correction-2/HANDOFF.md`](../tasks/hrp-t1a-postdeploy-runtime-correction-2/HANDOFF.md); the recovery bridge, publish gating and CTA hint are accepted against `f6100c39` and `8b8e39b` per the operational workflow debt decision §D "Priority 0").
2. `OP-M1` — `F9` / `F9-B` HR_STAFF write-boundary hardening: **COMPLETE / PRODUCTION VERIFIED**. PR #88 true-merged at `09d68a67fe9ab3b30c09e77eea65f042519365e1`; the binding closeout is recorded in [`docs/tasks/hrp-f9b-r2-slot-scope-read-restore/CLOSEOUT.md`](../tasks/hrp-f9b-r2-slot-scope-read-restore/CLOSEOUT.md). `HR_STAFF` remains a scoped recruiter; selector and server write path both enforce assignment scope. ADMIN/HR_MANAGER behaviour remains unchanged.
3. **UI V1** (canonical stamps, logo/title, homepage Next.js convergence, remove `/ve-chung-toi`; Hotline/Zalo/Messenger excluded) — accepted as part of `P1` closeout at main `0179ef8b18045d1340028669871bc1db492da08d` (PR #73; `docs/tasks/hrp-p1-final-release-safety-closeout/HANDOFF.md`). `P1 Thin Recruitment Value Slice = COMPLETE`; no `P2/P3/P4/P5` work is opened from `P1`.
4. `OP-M2` — Navigation/recovery debt (F2/F3/F7/F8/F11): **COMPLETE**. PR #90 true-merged at `8382bbc70b74f2fc21471c532b98bd20ab8a1fac`; completion evidence is recorded in [`docs/tasks/hrp-m2a-operational-ux-debt/HANDOFF.md`](../tasks/hrp-m2a-operational-ux-debt/HANDOFF.md).
5. `OP-M3` — Placement unavailable reason (F6; DTO + presentation only): **COMPLETE**. PR #92 true-merged at `835c833fa4ad5432c1d71d9e3d312c583d40d9ea`; completion evidence is recorded in [`docs/tasks/hrp-m2b-f6-placement-unavailable-reason/HANDOFF.md`](../tasks/hrp-m2b-f6-placement-unavailable-reason/HANDOFF.md).
6. Owner-added pre-P2 product gates: **MERGED** — staffing-order management (PR #108, `4957fe784dd01fd31dbd363cf5b3966403eb7ea7`), Bottom Sticky settings follow-up (PR #105, `ca41980e342de3a547d09bf70d88a317a42127a6`) and JobPosting image gallery + YouTube embed (PR #109, `22a9451b83d0bf8a75a5a0b54d609ea32952e623`).
7. `PRE_P2_CLOSEOUT` — verify the final merge train's production migration, deploy and smoke evidence and confirm that no security/operational blocker remains. This is a thin event, not a new feature. **P2 remains unopened until this event passes.**
8. **P2.1** — `Recruiter Referral Profile & Attribution V1` (this document).
9. **P2.2** — `Early V8 Workspace & Microsite Completion` (this document).
10. P3/P4/P5 — kept unchanged from the Realignment Plan.

Owner/Tier 0 made JobPosting image gallery + YouTube embed a **mandatory pre-P2 gate** on 2026-10-05. The implementation is merged through PR #109; `PRE_P2_CLOSEOUT` must still confirm its production migration, deploy and smoke evidence before P2.1 may open.

## D. P2 envelope definitions

### D.1 P2.1 — Recruiter Referral Profile & Attribution V1

**Outcome.** One eligible recruiter has a public profile and a stable referral link they can share. A candidate arriving through that link applies through the canonical thin slice, the application is attributed to the correct referrer server-side, and that attribution is preserved through `ReferralAttribution` → `CandidateSubmission` → `LaborProfile` → accepted `SourceClaim` → `Placement` / `ProjectAssignment`, with admin/audit visibility on the canonical chain.

**P2.1 must deliver.**

- Public recruiter profile at minimum safe scope.
- Stable referral code / link (reuse `User.affCode` per `docs/V6/aff_plan.md` §6.1).
- Recruiter self-service to view/copy the link (`GET /api/me/affiliate-link` family, per `docs/V6/aff_plan.md` §7.2).
- Link targets the recruiter profile; optionally targets an eligible published `JobPosting`.
- Only `JobPosting` rows with status `PUBLISHED`, public-visible, and within the recruiter's assignment scope are surfaced from the link.
- Signed attribution token/cookie (`hrp_aff`) with TTL 30 days (per `AFF-DEC-010`).
- First valid source wins (per `AFF-DEC-010`).
- Existing unexpired attribution wins later clicks (per `AFF-PROP-004`).
- Invalid / expired / forged / inactive / revoked source fails safe — apply still succeeds with `PUBLIC` channel and no identity leak (per `AFF-PROP-005` and §9.2).
- Browser and request bodies cannot supply or override `referrerUserId` (per `AFF-DEC-005` and §5.2 trust boundaries).
- Attribution is preserved across `ReferralAttribution`, `CandidateSubmission`, `LaborProfile`, accepted `SourceClaim`, and `Placement` / `ProjectAssignment`.
- Admin/audit visibility on the canonical attribution chain.
- Production-compatible E2E (or production-equivalent verification, per Owner decision in `§K`).

**P2.1 must NOT include.**

- Commission rate / cap, commission beneficiary, commission policy, ledger, payout/withdrawal, debt/reversal, accounting workflow, or financial dispute.
- A "Company Pool" feature if its only purpose is commission-beneficiary resolution.
- Full analytics / dashboard.
- Theme / layout customization.
- A "Verified Profile" programme beyond minimum eligibility.
- Featured Jobs curation beyond minimum visibility.
- A full QR / Share Kit.
- Social feed / follow / comment.
- Content Studio or AI features.

The two menu items in the recruiter workspace — **Chính sách hoa hồng** (Commission Policy) and **Sổ cái hoa hồng** (Commission Ledger) — remain `Đang phát triển` and are not enabled by P2.1.

### D.2 P2.2 — Early V8 Workspace & Microsite Completion

P2.2 is split internally into:

- **P2.2-A — Workspace Shell.** ActorContext, permission-driven navigation, workspace selector where needed, shared loading/error/empty states, saved views/filter state that serve real workflow. **No role workspace is built on fake data** (per `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §43 V8.3 unlock rule).
- **P2.2-B — Recruiter Microsite Completion.** Profile management inside the authenticated workspace, preview, public `JobPosting` projection completion, mobile/accessibility/SEO, public-contact privacy controls, active/inactive/moderation boundary, plus the residual public microsite surface that P2.1 does not already cover.

P2.2 must NOT pull in P3 Appearance Lite, full Verified Profile, Featured Jobs curation, the full Share Kit, or any V9 work.

## E. Old P2-A / P2-B → new P2.1 / P2.2 mapping

| Plan gốc (Realignment Plan §32–§35) | New envelope |
| --- | --- |
| `P2-A V8.0 Workspace Shell` (Realignment §33) | **P2.2-A Workspace Shell** |
| `P2-B V8.2 Recruiter Microsite` — referral / profile landing minimum (Realignment §34, when AFF unavailable) | **P2.1 Recruiter Referral Profile & Attribution V1** |
| `P2-B V8.2 Recruiter Microsite` — profile management and microsite completion | **P2.2-B Recruiter Microsite Completion** |
| AFF-01 → AFF-04 (`docs/V6/aff_plan.md` §14) | Existing dependencies consumed by P2.1; **not** new tasks. See §G. |
| P3-A / P3-B / P3-D (Realignment §37, §38, §40) | Stay in P3; **not** pulled into P2.1. |

P2.1 has its own gate (see §I), but it does **not** close the entire P2 envelope. The **formal P2 closeout** runs only after P2.2 completes.

## F. AFF decisions that P2.1 must lock

P2.1 may lock or reconcile only the following `AFF-OQ` items, all of which fall within the P2.1 scope (eligibility, link format, code lifecycle, redirect/attribution precedence, manual fallback, self-referral classification, public profile scope, JobPosting scope):

- `AFF-OQ-01` — eligibility to have a referral link (default: keep history/code, deny new attribution/credit when inactive; per `AFF-PROP-001`).
- `AFF-OQ-03` — one attribution vs many applications per TTL (default: yes, share referrer; per `AFF-PROP-004` and §6.2 cardinality).
- `AFF-OQ-04` — link shape: one base link per user, optional `?job=<slug>` does not change owner (per `AFF-PROP-002` and §6.1).
- `AFF-OQ-05` — code rotation authority (default: not self-serve at v1; Admin controlled; per `AFF-PROP-002`).
- `AFF-OQ-06` — self-referral (default: apply allowed, commission ineligible with audit reason; per §10.1 and §4.2 trust boundaries).
- `AFF-OQ-07` — auto-accept claim at convert (default: yes if no conflict; per `AFF-PROP-007`).
- `AFF-OQ-08` — manual fallback (default: only when no valid first-click token exists; per `AFF-PROP-005`).
- `AFF-OQ-12` — bounded manager reassignment interval after Company Pool entry (`docs/V6/aff_plan.md` §5.5.1).

P2.1 must NOT lock:

- payout UX for non-CTV (`AFF-OQ-09`);
- milestone / rate / cap (`AFF-OQ-10`);
- analytics retention detail (`AFF-OQ-11`);
- any decision reserved for AFF-05B / AFF-06 / AFF-07.

All financial decisions in P2.1 are recorded `DEFERRED_OUTSIDE_P2.1`.

## G. AFF carry-forward matrix (binding)

| AFF slice (`docs/V6/aff_plan.md` §14) | Trạng thái carry-forward | P2.1 disposition |
| --- | --- | --- |
| `AFF-00` | Design exists; metadata/decision inventory reconciled at §20 of `docs/V6/aff_plan.md`. | `RECONCILE_DECISIONS_ONLY` — only decisions in §F are touched. |
| `AFF-01` | Capability baseline present (`User.affCode`, additive columns, FK constraints, RLS skeleton). | `REUSE — DO_NOT_REOPEN`. |
| `AFF-02` | Link capture / redirect / signed-token baseline present (`/r/{code}` route, HMAC-signed `hrp_aff` cookie, dual rate-limit, allow-listed redirect). | `REUSE — DO_NOT_REOPEN`. |
| `AFF-03 / 03B / 03C` | Production-verified public attribution/intake path with SECURITY DEFINER closure; AFF-03C closed the missing direct `labor_profile_id` link. | `REUSE — REGRESSION_PROTECT`. |
| `AFF-04` | `ACCEPTED`, merged to main `8b8e39b` (PR #35), production migration + branch gate + post-deploy verified. Conversion → accepted SourceClaim → server-derived Placement propagation. | `REUSE — REGRESSION_PROTECT`. |
| `AFF-05A` | `LaborProfileHandlingAssignment` foundation (`W5` RLS, expiry sweep, `REVOKED` semantics) and bounded manager-assignment contract (`AFF-05A-R2` accepted) present; residual Company Pool / dispute scope remains. | `CARRY_FORWARD — NOT_A_P2.1_BLOCKER`. P2.1 uses the existing initial-assignment behavior; residual AFF-05A reconciliation stays on its own lane. |
| `AFF-05B` | Not complete. | `DEFERRED — OUT_OF_SCOPE`. |
| `AFF-06` | Not complete. | `DEFERRED — OUT_OF_SCOPE`. P2.1 may keep existing safeguard surface only. |
| `AFF-07` | Not complete. | `DEFERRED — OUT_OF_SCOPE`. |

Binding rules:

1. P2.1 must NOT rebuild AFF from scratch.
2. P2.1 must NOT create a duplicate schema/model/route/RPC.
3. P2.1 must NOT reopen `AFF-01` → `AFF-04`. Their HANDOFF/CLOSEOUT are pinned and authoritative.
4. If P2.1 reproduces a defect in reused AFF capability, it opens under a separate, narrow correction contract. The P2.1 lane does not silently patch a closed slice.
5. P2.1 must NOT use legacy TASK/HANDOFF status fields to deny a production closeout.
6. P2.1 must NOT claim `UNIVERSAL_AFF_COMPLETE`.

## H. Completion vocabulary

**Allowed completion claims** after the corresponding contract lands and is verified:

- `P2.1 Recruiter Referral Profile & Attribution V1 = COMPLETE`.
- `P2.1 Recruiter Referral Profile & Attribution V1 = READY_FOR_PRODUCTION_GATE` (interim claim when synthetic / preview tier has passed but T0 production closeout is still pending; see §K.2).
- `AFF attribution / distribution capability = USER_FACING_AND_PRODUCTION_VERIFIED` (gated by §K.2 — requires T0 production closeout on the configured production origin; synthetic / preview PASS is NOT sufficient).

**Forbidden completion claim** under this decision:

- `UNIVERSAL_AFF_COMPLETE`.

`UNIVERSAL_AFF_COMPLETE` requires the Definition of Done at `docs/V6/aff_plan.md` §23, which depends on residual `AFF-05A` Company Pool/dispute, `AFF-05B` universal commission beneficiary, `AFF-06` analytics/dashboard and `AFF-07` rollout/cleanup. None of those is P2.1.

A claim of `READY_FOR_PRODUCTION_GATE` followed by failure on the T0 production gate is NOT a regression that reverts prior gates — the implementation SHA stays valid; only the production-claim step is reopened.

## I. P2.1 release gate

The P2.1 release gate is the smallest set of measurable checks that proves the §D.1 outcome. Owner may accept a production-equivalent verification path when a recruiter-eligible audience does not yet exist on production.

```text
Recruiter signs in
  -> retrieves stable personal referral link
  -> opens link in a clean browser
  -> public profile renders
  -> opens one eligible published JobPosting
  -> candidate Applies
  -> server records the correct attribution
  -> same referrer preserved across LaborProfile, SourceClaim, Placement
  -> another recruiter's link does NOT overwrite
  -> revoked / inactive recruiter does NOT create new attribution

Negative gates:
  - No CommissionLedger rows are created.
  - No payout / debt rows are created.
  - No expansion of candidate visibility beyond the existing assignment authority.
  - No public PII is exposed.
  - No duplicate attribution is created.
  - No client-supplied referrer override takes effect.
  - Direct / non-AFF application still succeeds end-to-end.
```

Failure on any single line above is a blocker. Waiver is permitted ONLY under §I.1, and ONLY on the lines explicitly classified as waivable there. Security-class negative gates are non-waivable.

### I.1. Waiver policy (binding)

The §I gate has two classes of line:

**Non-waivable (release blockers).** If any of the following fails, P2.1 is `BLOCKED` and no HANDOFF may move the slice to `READY_FOR_PRODUCTION_GATE`. Owner / Tier 0 may NOT clear these by waiver, written or otherwise; the only way to relax them is a forward-only revision of this binding decision (adding a new revision-log row, opening a fresh PR, and re-running CI). The non-waivable list is:

- **No public PII** is exposed (negative gate).
- **No candidate-visibility expansion** beyond the existing assignment authority (negative gate).
- **No client-supplied `referrerUserId` override** takes effect (negative gate).
- **No cross-user / cross-recruiter overwrite** of attribution (negative gate, captured by "another recruiter's link does NOT overwrite").
- **No duplicate attribution** is created (negative gate).
- **Revoked / inactive recruiter does NOT create new attribution** (positive + negative, paired).
- **Direct / non-AFF Apply still succeeds end-to-end** (negative gate — no regression of the canonical thin slice).

**Waivable under written Owner risk acceptance.** All other lines in §I are waivable with a written waiver recorded in the implementation HANDOFF, naming the residual risk and the Owner who signed the waiver. Waivers do NOT lift the §J predecessor regression requirement.

A future revision that wishes to weaken, replace, or remove a non-waivable line MUST land as a forward-only revision of this binding decision (new version row in §N, new PR, new CI), never as a waiver inside a TASK / HANDOFF.

## J. P2.1 predecessor regression requirements

The implementation contract for P2.1 MUST require the existing predecessor regression suites to pass, not weaken them and not replace production-proven contracts with mock-only evidence. Required regressions:

- `AFF-02` redirect / link-capture suite (`src/domains/referrals/attribution-redirect.{service,route}.test.ts` and related).
- `AFF-03` public intake suite (`src/domains/applications/aff03-public-intake.{service,route}.test.ts`).
- `AFF-03B` RLS / runtime suite (integration tests attached to the SECURITY DEFINER RPC).
- `AFF-03C` LaborProfile direct-link suite (CLOSEOUT at `docs/tasks/hrp-v6-n2-aff-03c-cs-labor-profile-fix/CLOSEOUT.md`).
- `AFF-04` conversion / `SourceClaim` / `Placement` propagation suite (`docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/HANDOFF.md` §2 E-FP3 / E-FP4).
- `W5` / `AFF-05A` assignment / write-boundary suite (`docs/tasks/hrp-v6-w5-handling-assignment-safety/HANDOFF.md`; bounded manager-assignment per `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md`).
- `F9` / `F9-B` HR_STAFF assignment / write-boundary suites (binding rule: `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` §D "Priority 1").
- `P1` canonical recruiter E2E (PR #73; `docs/tasks/hrp-p1-final-release-safety-closeout/HANDOFF.md`).

The P2.1 contract pins these as required regressions and not as optional evidence. Any prior assertion weakened to "PASS by mock" is a blocker for P2.1.

## K. Production / production-equivalent verification

`docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` §1 forbids production DB writes during reproduction. P2.1 follows the same posture for its own contract:

- Reproduction and CI use ephemeral synthetic databases only.
- Vercel previews are permitted as a **secondary** read-only verification surface with Owner authorization and a synthetic marker recorded in evidence. Vercel is **not** the production authority.
- The configured production public origin (currently `https://vieclammienbac.com.vn`) is the authority for any claim that includes the word `PRODUCTION_VERIFIED`. Earlier `https://www.hrpartner.vn` references in legacy evidence are historical and must NOT be re-pinned as the production origin by any later slice.
- A production migration, deploy or production DB write is NOT opened from P2.1; if required, it is a separate Owner-gated step.

## K.1. Test / verification posture by tier (binding)

The Tier 1 implementation lane, the Tier 3 audit lane, and the final T0 production gate are three separate events with separate rights. They must NOT be collapsed.

- **Tier 1 coding / CI** uses ephemeral synthetic databases only. No production DB access, no production credential read, no production data fixture.
- **Tier 3 audit** audits the exact frozen implementation SHA. Tier 3 does NOT perform production writes and does NOT extend its scope to a production smoke.
- **T0 / Owner** is the sole party authorized to schedule a deploy, apply a production migration, or run a controlled production E2E. Production E2E follows a separate Owner-authored runbook; P2.1 may reference but must NOT inline or duplicate that runbook.
- **Final production acceptance** requires T0 production closeout evidence (controlled Apply / E2E on the configured production origin). Until that closeout is recorded, P2.1 may only claim what its current evidence supports (see K.2).

## K.2. Completion-claim gates (binding)

The two allowed completion claims in §H are gated by the evidence tier:

| Claim | Minimum evidence required |
|---|---|
| `P2.1 Recruiter Referral Profile & Attribution V1 = COMPLETE` | All §I positive gates PASS + all §I security negative gates PASS (no waiver permitted per §I.1) + all §J predecessor regressions PASS + Tier 3 LIGHT audit PASS on the frozen implementation SHA. |
| `AFF attribution / distribution capability = USER_FACING_AND_PRODUCTION_VERIFIED` | T0 production closeout evidence on the configured production origin (currently `https://vieclammienbac.com.vn`) — controlled Apply / E2E per Owner runbook. Synthetic-DB PASS or Vercel-preview PASS are **not sufficient** for this claim. |

If only the synthetic / preview tier has passed, the maximum claim permitted is:

```text
P2.1 Recruiter Referral Profile & Attribution V1 = READY_FOR_PRODUCTION_GATE
```

`READY_FOR_PRODUCTION_GATE` is not a `COMPLETE` claim. It means: Tier 1 self-review PASS, Tier 3 LIGHT audit PASS on the frozen implementation SHA, all §I / §J gates PASS in synthetic CI, and T0 production gate is the only remaining step.

## L. Boundaries

Tier 1 / Tier 3 MUST NOT, in the current execution round:

- implement P2.1 / P2.2 (this document is docs-only);
- modify source / test / schema / migration / package / lockfile / CI / deploy / production-config;
- modify financial / commission code;
- open a TASK implementation contract for P2.1 / P2.2;
- call Tier 3 to audit P2.1 / P2.2 source work that does not exist;
- merge or deploy;
- access production DB;
- hand off to another agent;
- modify TASK / HANDOFF files of `F9` / `F9-B` or of UI tasks.

Owner / Tier 0 may, after `PRE_P2_CLOSEOUT`, open P2.1 contracts under `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §47.1 discipline.

## M. Cross-document consistency

| Concern | Authority / state |
| --- | --- |
| Mốc 0 (JobPosting production flow) | `COMPLETE`. |
| Mốc 1 / `F9` | `COMPLETE / PRODUCTION VERIFIED` through PR #88. |
| Mốc 2 (navigation/recovery) | `COMPLETE` through PR #90. |
| Mốc 3 (placement unavailable reason) | `COMPLETE` through PR #92. |
| Owner-added pre-P2 gates | Runtime changes merged through PR #108, PR #105 and PR #109; production closeout of the final merge train remains the next gate. |
| P2-A / P2-B (legacy) | **Superseded** by `P2.1` / `P2.2` for execution sequencing. Historical design preserved in `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §32–§35. |
| P3 / P4 / P5 | Unchanged. |
| AFF continuity | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §15.1 + `docs/V6/aff_plan.md` §0.2 remain authoritative for the AFF state table. |

## N. Revision log

| Version | Date | Change |
| --- | --- | --- |
| `v1.0` | 2026-10-03 | Materialize the Owner/Tier 0 split of P2 into P2.1 (`Recruiter Referral Profile & Attribution V1`) and P2.2 (`Early V8 Workspace & Microsite Completion`); lock the AFF carry-forward matrix; lock the P2.1 release gate and predecessor regression requirements; introduce `OP-M0..OP-M3` to disambiguate operational milestones from product `M0..M5`; add companion `§15.3` addendum to `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`. Docs-only. |
| `v1.1` | 2026-10-03 | T0 verdict `ACCEPTED_WITH_DOC_CORRECTIONS / PENDING_CI` — three docs-only corrections applied. **(C-01)** §K: replace the `https://www.hrpartner.vn` example with the configured production public origin (currently `https://vieclammienbac.com.vn`); Vercel is repositioned as a secondary preview surface, not a production authority. **(C-02)** New §K.1 separates Tier 1 / Tier 3 / T0 production gate, and new §K.2 binds the `USER_FACING_AND_PRODUCTION_VERIFIED` claim to T0 production closeout on the configured origin; introduces `READY_FOR_PRODUCTION_GATE` as the maximum claim supported by synthetic / preview PASS alone. §H updated to list the interim claim and to point to §K.2. **(C-03)** New §I.1 splits the §I gate into **non-waivable security negative gates** (public PII, candidate-visibility expansion, client-supplied referrer override, cross-user overwrite, duplicate attribution, revoked/inactive creating new attribution, direct/non-AFF Apply regression) and waivable operational lines under written Owner risk acceptance; non-waivable lines may only be relaxed by a forward-only revision of this binding decision, never by a HANDOFF waiver. Docs-only; no source / test / migration / lockfile change. |
| `v1.2` | 2026-10-05 | Reconcile the live pre-P2 cursor after OP-M1, OP-M2 and OP-M3 completion; record the Owner-added staffing-order, Bottom Sticky and JobPosting media/YouTube gates; make JobPosting media/YouTube mandatory rather than optional; keep P2 unopened until production migration/deploy/smoke closeout passes. Docs-only. |
