# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

## Survey Summary

Two parallel surveys were conducted:

1. **N2 policy survey** — Answered the 10 policy questions
2. **Codebase & migrations survey** — Mapped schema, RLS, services

---

## Key Findings

### Already Exists
- `User.affCode` (`schema.prisma:141`) — reusable, no new column needed
- `PlacementCase.openedAt` (`schema.prisma:1465`) — viable clock anchor
- `LaborProfile` (V6 Phase 1) — N2-3 dependency satisfied
- `Holiday` table — reusable for business-day logic if chosen
- `CommissionLedger` / `CommissionEngine` — patterns reusable, additive beneficiary needed
- `outbox.service.ts` — pattern reusable for handling assignment events

### Greenfield (NOT Implemented)
- `ReferralAttribution` model — designed in `aff_plan.md §6.2` but not coded
- `LaborProfileHandlingAssignment` model — designed in `aff_plan.md §6.5.1` but not coded
- `beneficiaryUserId` columns on `commission_ledger`, `commission_debt`, `ctv_withdrawal_requests`
- Handler assignment permissions (`CAN_ASSIGN_HANDLING`, etc.)
- AFF API routes (`/api/me/affiliate-link`, `/r/:code`, etc.)
- `AffiliateClickEvent` analytics table (optional)

### Conflicts / High-Risk
- `hrp_public_apply_submission` RPC signature change required for N2-3
- Commission engine `ctvId`-specific logic needs dual-write compat window
- `SourceClaim.ctvId/vendorId` legacy columns need additive `referrerUserId`

### No Conflicts
- Timezone: only `ProjectAssignment.validFrom/To` uses TIMESTAMPTZ; rest are TIMESTAMP
- Permissions: existing catalog has no handling-specific codes yet — additive only
- RLS: existing patterns (HR_MANAGER + HR_STAFF + ADMIN) extend to new tables

---

## Survey Source Data

The two surveys were conducted by separate subagents (explore mode). Their raw output has been consolidated into `DISCOVERY.md` in this task folder.

| Survey | Coverage | Output |
|---|---|---|
| 1 | 10 policy questions | `DISCOVERY.md §2` |
| 2 | Schema, migrations, services, RLS | `DISCOVERY.md §1` + appendix |

---

## Migration Inventory (relevant to N2)

| Migration | Date | N2 Relevance |
|---|---|---|
| `v6_phase1a_labor_profile_schema` | 20260908001 | N2-3 dependency (LaborProfile) |
| `v6_phase1a_labor_profile_rls` | 20260908150001 | N2-3 dependency |
| `n1_placement_case_foundation` | 20260912140411 | N2 clock anchor |
| `n1_placement_case_rls` | 20260912140412 | N2 RLS pattern |
| `p2_commission_schema` | 20260819083254 | N2-5 base |
| `p2_commission_rls` | 20260819104700 | N2-5 RLS pattern |

---

## Affinity to aff_plan.md Decisions

| `AFF-DEC-*` | Status | T0 Action |
|---|---|---|
| `AFF-DEC-001` (All Users eligible) | LOCKED | None |
| `AFF-DEC-002` (Standalone design) | LOCKED | None |
| `AFF-DEC-003` (Reuse affCode) | LOCKED | None |
| `AFF-DEC-004` (Generic User identity) | LOCKED | None |
| `AFF-DEC-005` (Public client no raw userId) | LOCKED | None |
| `AFF-DEC-006` (Versioned policy + milestone) | LOCKED | None |
| `AFF-DEC-007` (Analytics ≠ attribution) | LOCKED | None |
| `AFF-DEC-008` (Attribution immutable + handling separate) | LOCKED | None |
| `AFF-DEC-009` (Dispute → Ticket/Case) | LOCKED | None |
| `AFF-DEC-010` (Cookie TTL 30d, first-click) | LOCKED | None |
| `AFF-DEC-011` (7d protected window) | LOCKED | None |
| `AFF-DEC-012` (Expiry → pool) | LOCKED | None |
| `AFF-DEC-013` (Referrer ≠ beneficiary) | LOCKED | None |
| `AFF-DEC-014` (Ticket in window) | LOCKED | None |
| `AFF-DEC-015` (HR preserve attribution) | LOCKED | None |
| `AFF-DEC-016` (Actor ≠ referrer) | LOCKED | None |
| `AFF-DEC-017` (Direct channel) | LOCKED | None |
| `AFF-DEC-018` (Attribution on LaborProfile) | LOCKED | None |

All 18 decisions are LOCKED. Discovery confirms no conflicts with these.

---

## Open Decisions (10 new, awaiting T0)

See `DISCOVERY.md §3` for full list with options + recommendations.

These 10 are operational details (clock type, timezone, permission codes) — not in scope of `aff_plan.md` decisions but required before N2-1 implementation.
