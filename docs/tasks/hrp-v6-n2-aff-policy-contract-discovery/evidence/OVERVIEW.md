# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

## Survey Summary

Two parallel surveys were conducted:

1. **N2 policy survey** — Answered the 10 policy questions
2. **Codebase & migrations survey** — Mapped schema, RLS, services

**Survey results consolidated in `../DISCOVERY.md`.**

---

## Key Findings

### Already Exists
- `User.affCode` (`schema.prisma:141`) — reusable, no new column needed
- `PlacementCase.openedAt` (`schema.prisma:1465`) — viable clock anchor
- `LaborProfile` model exists in schema (`schema.prisma:1380-1400`) BUT V6 Phase 1A not yet in origin/main (see §V6 Status below)
- `Holiday` table — reusable for business-day logic if chosen
- `CommissionLedger` / `CommissionEngine` — patterns reusable, additive beneficiary needed
- `outbox.service.ts` — pattern reusable for handling assignment events

### Greenfield (NOT Implemented)
- `ReferralAttribution` model — designed in `aff_plan.md §6.2` but not coded
- `CommissionBeneficiaryDecision` model — designed per T0 R1 revision but not coded
- `LaborProfileHandlingAssignment` model — designed in `aff_plan.md §6.5.1` but not coded
- `beneficiaryUserId` columns on `commission_ledger`, `commission_debt`, `ctv_withdrawal_requests`
- Handler assignment permissions (`CAN_ASSIGN_HANDLING`, etc.)
- AFF API routes (`/api/me/affiliate-link`, `/r/:code`, etc.)
- `AffiliateClickEvent` analytics table (optional)

### Conflicts / High-Risk
- `hrp_public_apply_submission` RPC signature change required for N2-3
- Commission engine `ctvId`-specific logic needs dual-write compat window with EXACT_SAFE/UNRESOLVED classification
- `SourceClaim.ctvId/vendorId` legacy columns need additive `referrerUserId`

### No Conflicts
- Timezone: only `ProjectAssignment.validFrom/To` uses TIMESTAMPTZ; rest are TIMESTAMP
- Permissions: existing catalog has no handling-specific codes yet — additive only
- RLS: existing patterns (HR_MANAGER + HR_STAFF + ADMIN) extend to new tables

---

## V6 Phase 1 Status — CRITICAL EVIDENCE

**Verified via git:**

```
$ git merge-base --is-ancestor 3a33212 origin/main
# Exit 1: V6 P1 schema commit (3a33212) is NOT an ancestor of origin/main (b91a33f)

$ git branch --contains 3a33212
  codex/hrp-v6-p1a-labor-profile-schema
  codex/hrp-v6-p1b-job-opening-posting-split
```

| Commit | Description | Branch | In origin/main? |
|---|---|---|---|
| `3a33212` | V6 Phase 1A — LaborProfile schema | `codex/hrp-v6-p1a-labor-profile-schema` | ❌ NO |
| `a4ab9f0` | Phase 1A ACCEPTED + AUDIT + 21 evidence | `codex/hrp-v6-p1b-job-opening-posting-split` | ❌ NO |
| `4e7b8fe` | N3 ServiceModel + Placement | origin/main | ✅ YES |
| `f7f85bb` | N1 PlacementCase foundation | origin/main | ✅ YES |

**Implication:**
- `LaborProfile` model trong `origin/main` `schema.prisma` là legacy placeholder
- Production-ready LaborProfile model chỉ tồn tại trên `codex/hrp-v6-p1a-labor-profile-schema`
- N2-3 và N2-4 **blocked** cho đến khi V6 P1 merge vào main
- N2-1 và N2-2 **không có dependency** — có thể chạy song song với V6 P1 merge

---

## Survey Source Data

The two surveys were conducted by separate subagents (explore mode). Their raw output has been consolidated into `DISCOVERY.md` in this task folder.

| Survey | Coverage | Output |
|---|---|---|
| 1 | 10 policy questions | `DISCOVERY.md §2` |
| 2 | Schema, migrations, services, RLS | `DISCOVERY.md §1` + appendix |

---

## Migration Inventory (relevant to N2)

| Migration | Date | N2 Relevance | In origin/main? |
|---|---|---|---|
| `v6_phase1a_labor_profile_schema` | 20260908001 | N2-3/4 dependency (LaborProfile) | ❌ NO |
| `v6_phase1a_labor_profile_rls` | 20260908150001 | N2-3/4 dependency | ❌ NO |
| `n1_placement_case_foundation` | 20260912140411 | N2 clock anchor | ✅ YES |
| `n1_placement_case_rls` | 20260912140412 | N2 RLS pattern | ✅ YES |
| `p2_commission_schema` | 20260819083254 | N2-6 base | ✅ YES |
| `p2_commission_rls` | 20260819104700 | N2-6 RLS pattern | ✅ YES |

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

All 18 aff_plan.md decisions are LOCKED. Discovery confirms no conflicts with these.

---

## Open Decisions (15 — awaiting T0)

See `DISCOVERY.md §3` for full list with options + recommendations. Summary:

| Category | Decisions |
|---|---|
| Clock / Time | Q1, Q2a, Q2b, Q2c (4) |
| Holiday | Q3a, Q3b (2) |
| Lifecycle | Q4, Q5 (2) |
| Decision (T0-revised) | Q7a, Q7b, Q7c (3) |
| Permissions | Q8 (1) |
| Migration / Compat | Q9a, Q9b, Q10 (3) |

These 15 are operational details required before N2-1 implementation.

---

## T0-R1 Revisions Applied

1. ✅ Status: DONE → **READY_FOR_T0_DECISION** (consistent across TASK/DISCOVERY/HANDOFF)
2. ✅ HANDOFF.md created
3. ✅ Q7: CommissionBeneficiaryDecision as authority record (immutable, with full snapshot fields)
4. ✅ Q9b: Legacy ctvId backfill requires EXACT_SAFE / UNRESOLVED classification
5. ✅ Q2: Storage = TIMESTAMPTZ UTC / Business clock = Asia/Bangkok (layered)
6. ✅ V6 Phase 1 merge status verified with git evidence (NOT in origin/main)
7. ✅ Q6: Attribution cardinality clarified — immutable, separate from handling clock
