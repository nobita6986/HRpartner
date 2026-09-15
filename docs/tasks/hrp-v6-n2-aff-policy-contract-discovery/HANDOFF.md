# N2 AFF Discovery — HANDOFF

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `READY_FOR_T0_DECISION`
**Type:** READ-ONLY Discovery
**Lane:** STANDARD (no implementation in this task)
**Audit:** NONE (read-only docs-only branch)

---

## 1. Final Status

| Item | State |
|---|---|
| Survey scope | ✅ Complete (10 policy questions) |
| Evidence gathering | ✅ Complete (file:line + git evidence) |
| Recommendations | ✅ Complete (15 decisions with options + recommendation) |
| Slice decomposition | ✅ Complete (6 slices with dependency graph) |
| V6 P1 merge status verified | ✅ Yes (NOT in origin/main — see §3) |
| T0 decisions requested | ✅ Yes (see §4) |
| Implementation gate | ⏸️ **BLOCKED — awaiting T0** |

**This task is COMPLETE as a discovery deliverable.** T0 must decide 15 open decisions before N2-1 can be authorized.

---

## 2. Deliverables

| File | Purpose | Status |
|---|---|---|
| `DISCOVERY.md` | 10 policy questions + evidence + recommendations + 15 T0 decisions | ✅ Updated per T0 R1 |
| `TASK.md` | RQ → STEP → AC, scope, boundary, evidence index | ✅ Updated to READY_FOR_T0_DECISION |
| `evidence/OVERVIEW.md` | Affinity to aff_plan.md, migration inventory, V6 P1 status | ✅ Updated |
| `HANDOFF.md` (this file) | Final status + handoff to T0 | ✅ Created |

---

## 3. Critical Evidence: V6 Phase 1 NOT in origin/main

```
$ git merge-base --is-ancestor 3a33212 origin/main
# Exit 1: V6 P1 schema (3a33212) is NOT an ancestor of origin/main (b91a33f)

$ git branch --contains 3a33212
  codex/hrp-v6-p1a-labor-profile-schema
  codex/hrp-v6-p1b-job-opening-posting-split
```

**Implication for N2:**
- N2-3 (Apply Attribution) requires `LaborProfile` FK → BLOCKED until V6 P1 merge
- N2-4 (Handling Assignment) requires `LaborProfile` FK → BLOCKED until V6 P1 merge
- N2-1 (Attribution Foundation) and N2-2 (Link Capture) have NO V6 P1 dependency → can start independently

---

## 4. T0 Decision Summary (15 decisions)

### Pre-implementation gate (must be resolved before N2-1):

| # | Decision | Recommendation |
|---|---|---|
| Q1 | Clock type | **Calendar** |
| Q2a | Storage timezone | **TIMESTAMPTZ UTC** |
| Q2b | Business clock timezone | **Asia/Bangkok** |
| Q2c | Cut-off time | **23:59:59.999 VN** |
| Q3a | Holiday owner | **HR Admin** |
| Q3b | Unconfigured fallback | **Calendar days** |
| Q4 | Clock start | **`PlacementCase.openedAt`** |
| Q5 | Pause/reset | **Clock RUNNING always** |
| Q7a | Decision as authority (T0 revised) | **YES, immutable record** |
| Q7b | handlingAssignmentId nullable (T0 revised) | **Nullable (evidence only)** |
| Q7c | No handler = create decision or skip? | **Create with null beneficiary** |
| Q8 | Permission codes | **6 codes per proposal** |
| Q9a | RPC change for N2-3 | **Yes, with LIVE test plan** |
| Q9b | Legacy ctvId classification (T0 revised) | **EXACT_SAFE / UNRESOLVED** |
| Q10 | N2-1/N2-2 before V6 P1 merge | **Yes, no dep** |

See `DISCOVERY.md §3` for full option descriptions.

---

## 5. T0-Revised Decisions — Key Changes from Round 0

### Q7 — CommissionBeneficiaryDecision (MAJOR REVISION)

**OLD (round 0):** Engine reads active `LaborProfileHandlingAssignment` at milestone time.
**NEW (round 1, per T0):** `CommissionBeneficiaryDecision` is immutable authority record. HandlingAssignment is input/candidate only.

**Key model fields (NEW):**
```prisma
model CommissionBeneficiaryDecision {
  id                   String   @id @default(uuid())
  laborProfileId       String
  assignmentId         String?
  handlingAssignmentId String?     // nullable — evidence only
  beneficiaryUserId    String
  source               String     // AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION | DIRECT
  reason               String     // typed reason
  evidence             Json       // snapshot
  decidedAt            DateTime
  actorId              String
  milestone            String
  status               String     // ACTIVE | SUPERSEDED | REVERSED
  @@unique([laborProfileId, assignmentId, milestone])
}
```

**Engine change:** Read decision, not active handler.

### Q9b — Legacy ctvId (REVISION)

**OLD (round 0):** Backfill all `ctvId` to `beneficiary_user_id`.
**NEW (round 1, per T0):** Classify per row.
- `EXACT_SAFE`: valid FK to User → backfill OK
- `UNRESOLVED`: no FK or ambiguous → skip, manual review

### Q2 — Timezone (REVISION)

**OLD (round 0):** "TIMESTAMPTZ Asia/Bangkok" — ambiguous.
**NEW (round 1, per T0):** Layered:
- Storage: UTC instant / TIMESTAMPTZ
- Business clock: Asia/Bangkok

### Q6 — Attribution Cardinality (CLARIFICATION)

**OLD (round 0):** Mentioned immutability.
**NEW (round 1, per T0):** Explicit rule:
- Immutable attribution does NOT change when handling changes/expires
- Handling clock (7d) and attribution clock (30d) are separate

---

## 6. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base:** `origin/main` b91a33f
**HEAD:** See `git rev-parse HEAD` (updated after each push)
**Diff vs origin/main:** 3 docs files (DISCOVERY.md + TASK.md + evidence/OVERVIEW.md + HANDOFF.md), zero code changes
**PR:** Open as docs-only PR against `main`

---

## 7. What T0 Should Do

1. Read `DISCOVERY.md` end-to-end
2. Review §3 (15 decisions) — confirm or override each recommendation
3. Sign off on:
   - Q7 (decision as authority — biggest design change)
   - Q2 (timezone layers)
   - Q9b (legacy classification)
   - Q10 (slice ordering + V6 P1 dependency)
4. Authorize Tier 1 to create N2-1 task (and N2-2 in parallel)
5. Decide: N2-1/N2-2 starts before or after V6 P1 merge?

---

## 8. What Tier 1 Should Do (after T0 unlock)

- Create `hrp-v6-n2-aff-01-attribution-foundation` task with full RQ → STEP → AC
- Create `hrp-v6-n2-aff-02-link-capture` task in parallel
- Do NOT start N2-3, N2-4 until V6 P1 merged into origin/main
- Do NOT start implementation until §20 DoR in `aff_plan.md` is satisfied

---

## 9. Boundary Compliance

- ✅ No schema/migration/source changes
- ✅ No production DB writes
- ✅ No `PLANNER_HANDOVER.md` / `TIER0_SHIFT_HANDOVER.md` modifications
- ✅ No PR #3 / P2 file changes
- ✅ No N4 implementation
- ✅ No N2 implementation (locked by T0 decisions)

---

## 10. Final Note

This discovery task is a **decision package**, not an implementation artifact.

The 15 decisions in `DISCOVERY.md §3` are the bottleneck for N2. Once T0 chốt, Tier 1 has everything needed to:
1. Create N2-1 task with locked schema/API scope
2. Create N2-2 task in parallel
3. Track V6 P1 merge for N2-3/N2-4 unlock
4. Plan N2-5/N2-6 sequentially

No further S1 survey needed before T0 decisions.

---

**Handoff complete. Awaiting T0.**
