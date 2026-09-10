# HRP V6 Admin Rebuild — Canonical Roadmap to V7

> **Status:** maintained roadmap overlay
> **Authority:** `docs/V6/V6_change.md` and the V7 Master Index supersede older V6 sequencing.
> **Rule:** V6+ is not a separate release. Stable `V6P-*` work executes inside V6.

## 1. Current baseline

Completed foundation:

- JobOpening and JobPosting split;
- LaborProfile, LaborProfileIntake and EmploymentEpisode additive schema;
- CandidateSubmission nullable LaborProfile hook;
- public UI and UI04 accepted work recorded in task evidence.

This foundation is useful but does not yet pass the V6 Native Compatibility Gate.
PlacementCase, case-scoped handling, independent Placement, ServiceModel,
case-aware Application, authority switch and safe backfill remain.

## 2. Parallel lanes

```text
Lane A — Public UI/CMS
UI04 section-render -> Job Detail UI -> AV1/AV4/AV6

Lane B — V6 Native Domain
N0 -> N1 -> N2/N3 -> N4/N5 -> N6 -> N7 Gate

Lane C — Demand/Admin
AV2 editorial shell -> wait N3 ServiceModel -> publish/write completion

Lane D — AFF
blocked for rebase -> wait N1/N2 + Owner clock policy -> implementation
```

Parallel work is allowed when it does not create competing authority or share
schema/migration ownership. Tier 1 may use sub-agents for independent files.

## 3. Phase N0 — Contract and read-only discovery

Goal: measure repository/live-data reality before mutation.

- freeze V7-native domain contract;
- build read-only migration audit runner;
- inventory identity conflicts, direct Assignment semantics, source/handler/
  beneficiary coupling, unclassified JobOpenings and unsafe backfill rows;
- classify `EXACT_SAFE`, `POSSIBLE_DUPLICATE`, `UNRESOLVED`;
- produce decomposition input for N1.

No production behavior change. Audit mode for task: `NONE`; the N0 output is
reviewed by Tier 0 as architecture evidence.

## 4. Phase N1 — Canonical identity and PlacementCase

- centralize create-or-match authority;
- harden possible-match and merge behavior;
- add PlacementCase schema/lifecycle;
- enforce max one active case concurrency-safe;
- add nullable `CandidateSubmission.placementCaseId`;
- move new public/staff-assisted Application creation through case-aware command;
- preserve General Interest as a case with zero Applications;
- establish command permissions required by the slice.

Schema/migration and command slices use Tier 3 `LIGHT`.

## 5. Phase N2 — Handling and AFF authority

- add historical, case-scoped HandlingAssignment;
- max one active handler per case;
- assign/claim/transfer/release commands;
- Company Pool selector;
- AFF_INITIAL trigger from qualifying PlacementCase open;
- preserve ReferralAttribution independently.

AFF implementation remains blocked until Owner decides calendar/business days
and timezone/calendar. Tier 3 `LIGHT` for lifecycle/security slices.

## 6. Phase N3 — Demand ServiceModel and Placement

- add canonical ServiceModel to JobOpening with legacy compatibility state;
- add independent Placement and service-model snapshot;
- add Placement lifecycle commands;
- implement client-managed effective path without Worker;
- add fulfillment selectors that distinguish effective placements from active
  HRP workforce.

AV2 JobPosting publish completion depends on the ServiceModel contract from this
phase. Tier 3 `LIGHT`.

## 7. Phase N4 — Workforce actual-start bridge

- link ProjectAssignment to originating Placement where known;
- enforce one active PRIMARY Assignment;
- actual HRP-managed start atomically reuses/creates Worker, starts Episode,
  creates Assignment and marks Placement effective;
- harden no-show, transfer, exit and rehire behavior;
- keep legacy direct Assignment path as compatibility only until authority switch.

Tier 3 `LIGHT`.

## 8. Phase N5 — Operational and security foundation

- effectiveAt/recordedAt/actor/source/correlation pattern;
- idempotency and optimistic concurrency patterns;
- DomainAuditEvent/outbox projection as required;
- JobProposal, InteractionOutcome and NextAction foundations;
- RLS/data scopes and generic critical-mutation blocking;
- remove new source/handler/beneficiary inference paths.

Split into small tasks. Security and lifecycle tasks use `LIGHT`; isolated
non-authoritative read/UI tasks may use `NONE`.

## 9. Phase N6 — Backfill, compatibility reads and authority switch

- dry-run classifiers before writes;
- high-confidence Case/Handling/Placement/Assignment backfill;
- leave ambiguous history unresolved and report it;
- central current-state selectors;
- switch new-write authority;
- migrate affected counters/UI queries;
- reconcile before disabling legacy writes.

Tier 3 `LIGHT`.

## 10. Phase N7 — V6 exit / V7 entry gate

Run permanent fixtures for referral reclaim, direct hire, no-show, transfer,
rehire, multi-job case, concurrent pool claim and duplicate Worker conversion.
Validate identity, case, handling, placement, workforce, security, audit,
migration and reconciliation sections in `docs/V6/V6_change.md`.

Only after this gate passes:

```text
V7.1 Talent Repository
-> V7.2 Talent Workbench
-> V7.3 Matching & JobProposal
-> V7.4 Placement UX
-> V7.5 Workforce Operations
-> V7.6..V7.10
```

## 11. Admin and public feature dependencies

| Work | Dependency |
|---|---|
| UI04 section-render | none from native domain |
| Job Detail UI | public DTO; application write changes wait N1 |
| AV1 Homepage Settings | independent |
| AV4 Media | independent |
| AV6 CMS | UI section-render + AV4 |
| AV2 JobPosting editor | AV1 + AV4; publish completion waits N3 |
| AFF | N1 + N2 + Owner clock policy |
| Assignment/placement admin | N3 + N4 |

Do not create D.B separately; its JobPosting editor scope is absorbed by AV2.
Do not expand HRP commission amount/rate/formula calculation; external Python
application owns calculation.
