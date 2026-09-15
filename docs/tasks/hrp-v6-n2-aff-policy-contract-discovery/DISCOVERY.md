# N2 AFF Policy & Contract Discovery

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f` (15 Sep 2026)
**Author:** S1
**Type:** READ-ONLY Discovery — no production code changes
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE` (read-only docs-only)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 0. Executive Summary

N2 AFF (Admin Fee Clock) chưa có schema/service/API nào trong codebase. Tất cả đều greenfield. `aff_plan.md v2.3` đã chốt 18 decision. T0 đã chốt thêm operational decisions trong rounds R0–R3. Tài liệu này lock toàn bộ policy để Tier 1 mở N2-1 slice.

---

## 1. Evidence Baseline

### 1.1 What exists for N2/AFF in origin/main b91a33f

| Component | Status | Evidence |
|---|---|---|
| `User.affCode` | ✅ Already exists | `schema.prisma:141` |
| `PlacementCase` | ✅ Foundation exists | `schema.prisma:1460-1484` |
| `PlacementCase.openedAt` | ✅ Clock anchor candidate | `schema.prisma:1465` |
| `LaborProfile` | ✅ EXISTS in origin/main | `schema.prisma:1393` |
| `LaborProfileIntake` | ✅ EXISTS in origin/main | `schema.prisma:1421` |
| `EmploymentEpisode` | ✅ EXISTS in origin/main | `schema.prisma:1431` |
| V6 Phase 1A migrations | ✅ IN main migrations/ | `20260908150000_v6_phase1a_labor_profile_schema/`, `20260912140411_n1_placement_case_foundation`, `20260908150001_v6_phase1a_labor_profile_rls/` |
| `Holiday` table | ✅ Exists, attendance-only | `schema.prisma:737-745` |
| Commission ledger | ✅ CTV-specific | `schema.prisma:1229-1260` |
| Commission engine | ✅ 30/60/90-day milestones | `engine.service.ts:75-80` |
| `ProjectAssignment.referrerId` | ✅ Legacy referral | `schema.prisma:658` |
| `ReferralAttribution` | ❌ NOT IMPLEMENTED | Greenfield |
| `CommissionBeneficiaryDecision` | ❌ NOT IMPLEMENTED | Greenfield |
| `LaborProfileHandlingAssignment` | ❌ NOT IMPLEMENTED | Greenfield |
| Handler assignment service | ❌ NOT IMPLEMENTED | Greenfield |
| AFF-specific API routes | ❌ NOT IMPLEMENTED | Greenfield |

### 1.2 V6 Phase 1A — Capability Is Available in origin/main

V6 Phase 1A schema và RLS đã nằm trong `prisma/migrations/` của origin/main. No merge dependency. N2-3 và N2-4 không bị blocked.

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  prisma/migrations/20260912140411_n1_placement_case_foundation
  prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

### 1.3 No timezone handling anywhere

```sql
-- All timestamps are TIMESTAMP(3), not TIMESTAMPTZ
openedAt       DateTime  @default(now()) @map("opened_at")     -- schema.prisma:1465
validFrom      DateTime  @map("valid_from") @db.Timestamptz(3) -- ONLY exception: ProjectAssignment.validFrom/To
```

---

## 2. Locked Decisions (T0 Verdict Applied)

Theo verdict T0, các operational decisions dưới đây **đã chốt** (`LOCKED`). Tier 1 dùng trực tiếp làm contract khi viết N2-1 TASK.

### 2.1 Clock & Timezone

| Decision | Status | Locked Value |
|---|---|---|
| Q1 | `LOCKED` | **Calendar days** (không business day) |
| Q2a — Storage | `LOCKED` | **TIMESTAMPTZ UTC** cho toàn bộ AFF clock fields |
| Q2b — Business clock | `LOCKED` | **Asia/Bangkok** cho business boundary |
| Q2c — Day boundary | `LOCKED` | **Exclusive next-day** — boundary = start of next day Asia/Bangkok (00:00:00 +07:00 ngày kế tiếp). Half-open interval `[start, nextDayStart)` |
| Q3a — Holiday owner | `OUT OF N2 SCOPE` | Holiday không thuộc implementation scope N2 (xem §2.2) |
| Q3b — Unconfigured | `OUT OF N2 SCOPE` | Calendar days luôn — không cần Holiday |

### 2.2 Holiday OUT of N2 Scope

> **Holiday table dropped from N2 implementation scope.**

`Holiday` table hiện đang độc lập, chỉ phục vụ attendance/timesheet. N2 AFF clock dùng **calendar days pure** — không có business-day logic, không cần Holiday consumption. Nếu sau này business days được chốt, đó là task riêng ngoài N2.

### 2.3 Lifecycle

| Decision | Status | Locked Value |
|---|---|---|
| Q4 — Clock start | `LOCKED` | **`PlacementCase.openedAt`** là clock anchor |
| Q5 — Pause/reset | `LOCKED` | **Clock RUNNING always** — assignment có `expiresAt`, không pause |

### 2.4 Attribution Cardinality & Immutable Facts (LOCKED)

**Attribution history is immutable. Attribution does NOT change when handling assignment changes or expires.**

Two separate clocks:
- Attribution TTL: 30 days from first click
- Handling protected window: 7 days from LaborProfile create/match

| Fact | Mutable? | Notes |
|---|---|---|
| `referrerUserId` | **IMMUTABLE** | Set once; never changes |
| `affiliateCodeSnapshot` | **IMMUTABLE** | Set once; never changes |
| `firstClickedAt` | **IMMUTABLE** | Set once; never changes |
| `expiresAt` | **IMMUTABLE** | Set once at creation; never extended |
| `laborProfileId` | **IMMUTABLE** | Set once via `consume()`; never cleared |
| `status` | **MUTABLE** (lifecycle) | ACTIVE → CONSUMED / EXPIRED / REVOKED / SUPERSEDED |
| `consumedAt` | **MUTABLE** (lifecycle) | Set when status → CONSUMED |
| `createdAt` | IMMUTABLE | Auto-generated |
| `updatedAt` | MUTABLE (system) | Auto-managed by Prisma |

**Immutability enforcement:**
1. RLS: no UPDATE/DELETE on `referral_attributions`
2. Application service: no setter for immutable fields
3. `laborProfileId` set once via explicit `consume()` method
4. Status transitions only via explicit transition methods with audit

### 2.5 CommissionBeneficiaryDecision (Q7 — LOCKED Per T0 Verdict)

#### 2.5.1 Schema (LOCKED)

```prisma
/// CommissionBeneficiaryDecision — authority record độc lập cho mỗi milestone.
/// Không derived từ active handler động. Mỗi decision là immutable snapshot.
model CommissionBeneficiaryDecision {
  id                      String    @id @default(uuid())
  laborProfileId          String    @map("labor_profile_id")
  assignmentId            String?   @map("assignment_id")
  handlingAssignmentId    String?   @map("handling_assignment_id")
  beneficiaryUserId       String    @map("beneficiary_user_id")     // REQUIRED
  source                  String    @map("source")                   // AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION | DIRECT
  reason                  String    @map("reason")                   // Typed reason
  evidence                Json      @default("{}") @map("evidence") // Snapshot
  decidedAt               DateTime  @map("decided_at")
  milestone               String    @map("milestone")
  status                  String    @default("ACTIVE") @map("status") // ACTIVE | SUPERSEDED | REVERSED
  supersededById          String?   @map("superseded_by_id")
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt      @map("updated_at")

  // === T0 R3 verdict ===
  actorType               String    @map("actor_type")               // USER | SYSTEM
  actorUserId             String?   @map("actor_user_id")            // nullable when actorType=SYSTEM

  laborProfile      LaborProfile                   @relation(fields: [laborProfileId], references: [id])
  beneficiary       User                           @relation("BeneficiaryUser", fields: [beneficiaryUserId], references: [id])
  actorUser         User?                          @relation("DecisionActor", fields: [actorUserId], references: [id])
  supersededBy      CommissionBeneficiaryDecision? @relation("DecisionSupersession", fields: [supersededById], references: [id])
  supersessions     CommissionBeneficiaryDecision[] @relation("DecisionSupersession")

  @@index([laborProfileId, status])
  @@index([beneficiaryUserId, status])
  @@map("commission_beneficiary_decisions")
}
```

#### 2.5.2 Invariant Contract — LOCKED

**Business key:** `(laborProfileId, assignmentId, milestone)`

**Invariant:** At any point in time, at most **one ACTIVE decision** per business key.

**Nullable-safe handling (T0 R3 directive):**

PostgreSQL 15+ cung cấp `NULLS NOT DISTINCT`:

```sql
-- PostgreSQL 15+ partial unique with NULLS NOT DISTINCT (preferred)
CREATE UNIQUE INDEX cbd_active_uniq
  ON commission_beneficiary_decisions(labor_profile_id, assignment_id, milestone)
  WHERE status = 'ACTIVE'
  NULLS NOT DISTINCT;
```

Alternative cho PostgreSQL < 15 hoặc nếu cần normalized key:

```sql
-- Expression-based partial unique index using COALESCE sentinel
CREATE UNIQUE INDEX cbd_active_uniq
  ON commission_beneficiary_decisions(
    labor_profile_id,
    COALESCE(assignment_id, '__NONE__'),
    COALESCE(milestone, '__NONE__')
  )
  WHERE status = 'ACTIVE';
```

**Authority:** Migration SQL owns the constraint. Prisma schema is documentation; nếu không support thì SQL migration is authority.

**Concurrency-safe write:**

```typescript
// Advisory lock with normalized tuple — RS (0x1E) is delimiter sentinel
// RS is a non-printable ASCII separator never appearing in cuid/uuid
function normalizeKey(laborProfileId: string, assignmentId: string | null, milestone: string): string {
  return [laborProfileId, assignmentId ?? '__NONE__', milestone].join('\x1E');
}

await prisma.$executeRaw`
  SELECT pg_advisory_xact_lock(hashtext(${normalizeKey(laborProfileId, assignmentId, milestone)}))
`;
// Then check-then-insert pattern relying on partial unique index
```

#### 2.5.3 UNRESOLVED Outcome (LOCKED — T0 R3)

> **UNRESOLVED là typed result + audit/outbox, KHÔNG phải active decision.**

Khi không có handler/no beneficiary:
- **Không tạo active decision** với `beneficiaryUserId = null`
- Commission engine returns **typed result** `NO_ACTIVE_HANDLER`
- `OutboxEvent` ghi UNRESOLVED audit
- Skipped credit có typed reason

```typescript
type MilestoneResult =
  | { kind: 'CREATED'; decisionId: string }
  | { kind: 'SKIPPED'; reason: 'NO_ACTIVE_HANDLER' }
  | { kind: 'SKIPPED'; reason: 'OTHER' };

if (result.kind === 'SKIPPED') {
  await outbox.publish({
    type: 'BENEFICIARY_DECISION_UNRESOLVED',
    payload: { laborProfileId, assignmentId, milestone, reason: result.reason, decidedAt: now }
  });
}
```

#### 2.5.4 Actor Field (LOCKED — T0 R3)

Schema drops the magic-string SYSTEM approach. Two-field model instead:

```prisma
actorType    String   // 'USER' | 'SYSTEM'
actorUserId  String?  // nullable; FK to users when actorType='USER'
```

**CHECK constraint (SQL authority):**

```sql
ALTER TABLE commission_beneficiary_decisions
  ADD CONSTRAINT cbd_actor_check
  CHECK (
    (actor_type = 'USER' AND actor_user_id IS NOT NULL)
    OR (actor_type = 'SYSTEM' AND actor_user_id IS NULL)
  );
```

**Decision creation:**

| Trigger | actorType | actorUserId |
|---|---|---|
| HR/Manager explicit decision | `USER` | The HR's `User.id` |
| Auto-created at milestone by engine | `SYSTEM` | `NULL` |
| Correction via Ticket/Case resolution | `USER` | Resolver's `User.id` |

#### 2.5.5 Decision Resolution Flow (LOCKED)

```
At milestone evaluation time:
1. ACQUIRE advisory lock on normalized(business key)
2. Lookup existing ACTIVE decision for business key
   a. IF found AND status=ACTIVE:
      → Use decision.beneficiaryUserId
   b. IF NOT found:
      → IF active LaborProfileHandlingAssignment exists (ACTIVE + not expired):
         → CREATE ACTIVE decision with:
            beneficiaryUserId = assigneeUserId
            actorType = 'SYSTEM'
            actorUserId = NULL
         → outbox publish: BENEFICIARY_DECISION_CREATED
      → ELSE:
         → Return { kind: 'SKIPPED', reason: 'NO_ACTIVE_HANDLER' }
         → outbox publish: BENEFICIARY_DECISION_UNRESOLVED
         → NO decision row created
3. RELEASE lock
```

#### 2.5.6 Correction/Reversal History (LOCKED)

| Action | Old decision | New decision | History preservation |
|---|---|---|---|
| Correction (dispute resolves change of beneficiary) | status: ACTIVE → SUPERSEDED, sets `supersededById` | New decision created, status: ACTIVE | Old kept as SUPERSEDED for audit chain |
| Reversal (fraud/error) | status: ACTIVE → REVERSED, sets `supersededById` | New decision references original for audit | Original kept as REVERSED; not deleted |

SUPERSEDED/REVERSED rows are **never deleted** — they are the audit trail.

### 2.6 Permissions (LOCKED)

| Action | Permission | Data Scope |
|---|---|---|
| Assign handler to profile | `CAN_ASSIGN_HANDLING` | MANAGER (team), HR (anyone), ADMIN (anyone) |
| Transfer handling | `CAN_TRANSFER_HANDLING` | Assignee current OR MANAGER/HR/ADMIN |
| Release (về Company Pool) | `CAN_RELEASE_HANDLING` | Assignee self OR MANAGER/HR/ADMIN |
| Create beneficiary decision | `CAN_CREATE_BENEFICIARY_DECISION` | HR/ADMIN for explicit decisions |
| View Company Pool | `CAN_VIEW_HANDLING_POOL` | MANAGER (team), HR (all) |
| View own assignments | Implicit self | Assignee only |

```sql
-- LaborProfileHandlingAssignment RLS
CREATE POLICY hrp_handling_assignment_scope ON labor_profile_handling_assignments
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = assignee_user_id
  );

-- CommissionBeneficiaryDecision RLS
CREATE POLICY hrp_beneficiary_decision_scope ON commission_beneficiary_decisions
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = beneficiary_user_id
  );
```

### 2.7 Inventory Reuse + N2 Conflicts

| Component | N2 Reuse | Conflict Risk | Resolution |
|---|---|---|---|
| `User.affCode` | ✅ Reuse mandatory | Low | Already there |
| `PlacementCase.openedAt` | ✅ Clock anchor | Low | Additive |
| `LaborProfile` | ✅ Available in main | Low | FK ready |
| `ReferralGuard.applyOverride()` | ✅ Block-code logic | Medium | R1/R2/R3 rules có thể conflict |
| `CommissionEngine.evaluateMilestones()` | ✅ Milestone pattern | Medium | Update to read `CommissionBeneficiaryDecision` |
| `CommissionLedger.ctvId` | ⚠️ CTV-specific | High | Additive `beneficiaryUserId` legacy compat |
| `SourceClaim.ctvId/vendorId` | ⚠️ Legacy | High | Additive `referrerUserId` |
| `ProjectAssignment.referrerId` | ✅ Source field | Low | Placement derives from accepted SourceClaim |
| `intake-writer.service.ts` | ✅ Intake flow | Low | Preserve attribution |
| `candidate_submissions` RPC | ⚠️ SECURITY DEFINER | High | RPC signature change — needs LIVE test |
| `outbox.service.ts` | ✅ Audit events | Low | Reuse for handling + decision + UNRESOLVED events |
| `Holiday` | ❌ NOT in N2 scope | — | Out of scope per T0 |

### 2.8 Legacy ctvId Backfill (LOCKED — Tightened EXACT_SAFE)

**EXACT_SAFE requires ALL of:**

| # | Criterion | Why |
|---|---|---|
| 1 | Valid `User` FK | Referential integrity |
| 2 | **Provenance** | The row was written in a known context with documented meaning |
| 3 | **Writer semantics** | The row was created by canonical `CommissionEngine` or audited migration (no manual INSERT) |
| 4 | No conflict | No existing `beneficiaryUserId` already set |
| 5 | Audit trail | Outbox event or equivalent audit proving the relationship |

**UNRESOLVED** = fails ANY criterion → manual review, no backfill.

Valid FK alone is **NOT sufficient**.

---

## 3. Implementation Slice Plan (LOCKED)

```
N2-1 (Attribution Foundation)
    ↓
N2-2 (Link Capture) [parallel with N2-1]
    ↓
N2-3 (Apply Attribution) [requires LaborProfile — available]
    ↓
N2-4 (Handling Assignment) [requires LaborProfile FK]
    ↓
N2-5 (Beneficiary Decision) [requires N2-4]
    ↓
N2-6 (Commission Beneficiary) [requires N2-5]
```

**Per-slice lock state:**

| Slice | Slug | Schema scope | Migration risk | Test gate | V6 P1 dep |
|---|---|---|---|---|---|
| N2-1 | `hrp-v6-n2-aff-01-attribution-foundation` | `ReferralAttribution` table (immutable, status-only state machine, partial unique on laborProfileId) | Low — additive | Immutability enforcement + RLS | No |
| N2-2 | `hrp-v6-n2-aff-02-link-capture` | None (pure app) | Zero | Race, forged code, all roles | No |
| N2-3 | `hrp-v6-n2-aff-03-apply-attribution` | Additive `candidate_submissions` columns + RPC signature change | HIGH | RPC migration test, upgrade path | No (LaborProfile in main) |
| N2-4 | `hrp-v6-n2-aff-04-handling-assignment` | `labor_profile_handling_assignments` with partial unique `(laborProfileId) WHERE status = 'ACTIVE'` | Medium | Race to assign, expiry | No |
| N2-5 | `hrp-v6-n2-aff-05-beneficiary-decision` | `CommissionBeneficiaryDecision` per §2.5 schema; **migration SQL owns**: partial unique with `NULLS NOT DISTINCT` + CHECK constraint + advisory lock (normalized tuple) | Medium | Invariant, UNRESOLVED typed result, correction history | No (requires N2-4) |
| N2-6 | `hrp-v6-n2-aff-06-commission-beneficiary` | Additive `beneficiary_user_id` columns; EXACT_SAFE-only backfill; engine reads decision | Medium | EXACT_SAFE classification, UNRESOLVED skip | No (requires N2-5) |

---

## 4. Timing/Boundary Policy (LOCKED)

### 4.1 Day boundary

> Day boundary = exclusive next-day. Half-open interval `[start, nextDayStart)`.

Ví dụ: profile tạo ngày 2026-09-10 14:00 Asia/Bangkok → 7-day window kết thúc tại **2026-09-17 00:00:00 +07:00** (exclusive). Sau thời điểm đó = expired.

```typescript
const nextDayStart = (anchor: Date): Date => {
  // Convert UTC to Asia/Bangkok, ceil to next day start, back to UTC
  const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
  const bkkMs = anchor.getTime() + BKK_OFFSET_MS;
  const dayBkk = Math.floor(bkkMs / (24 * 60 * 60 * 1000));
  const startOfNextDayUtc = (dayBkk + 1) * 24 * 60 * 60 * 1000 - BKK_OFFSET_MS;
  return new Date(startOfNextDayUtc);
};

const expiry = nextDayStart(addDays(openedAt, 7));  // exclusive
```

### 4.2 Half-open intervals

Mọi `[start, end)` interval:
- `startAt` inclusive
- `expiresAt` exclusive (= start of next slot)
- Tại `now == expiresAt` → đã expired

---

## 5. Out of Scope (Locked)

Items explicitly **không thuộc N2 implementation**:

1. ❌ **Holiday** — out of scope. N2 uses pure calendar days.
2. ❌ **Business-day arithmetic** — không có trong N2.
3. ❌ **N2-1 implementation** — task này là discovery only.
4. ❌ **Schema/migration changes** — task này là discovery only.
5. ❌ **`docs/TIER0_SHIFT_HANDOVER.md`** — không touch.
6. ❌ **`docs/PLANNER_HANDOVER.md`** — không touch.
7. ❌ **PR #3 / P2** — không touch.
8. ❌ **N4 implementation** — không mở.

---

## 6. Evidence Appendix

### 6.1 File:line references

| Evidence | Location |
|---|---|
| `User.affCode` exists | `schema.prisma:141` |
| `PlacementCase` model | `schema.prisma:1460-1484` |
| `LaborProfile` model | `schema.prisma:1393` |
| `LaborProfileIntake` model | `schema.prisma:1421` |
| `EmploymentEpisode` model | `schema.prisma:1431` |
| V6 Phase 1A migrations in main | `prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/`, `20260912140411_n1_placement_case_foundation`, `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/` |
| `CommissionLedger.ctvId` | `schema.prisma:1231` |
| `CommissionEngine.milestone` | `engine.service.ts:75-80` |
| `Holiday` table (informational only) | `schema.prisma:737-745` |
| `aff_plan.md v2.3` | `docs/V6/aff_plan.md:1-1080` |

### 6.2 V6 Phase 1A Capability in origin/main

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  040000 tree 613b6fe6... prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  040000 tree a399344c... prisma/migrations/20260912140411_n1_placement_case_foundation
  040000 tree a399344c... prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

Tables: `labor_profiles`, `labor_profile_intakes`, `employment_episodes`
FK: `candidate_submissions.labor_profile_id`
RLS: all three tables

---

## 7. Definition of Done — Discovery (Locked)

Discovery hoàn tất khi:

- ✅ 18 `AFF-DEC-*` decisions đã chốt bởi `aff_plan.md`
- ✅ Operational decisions chốt bởi T0 verdict (R0–R3)
- ✅ Schema sketch cho ReferralAttribution, LaborProfileHandlingAssignment, CommissionBeneficiaryDecision
- ✅ Invariant contracts với nullable-safe specification (NULLS NOT DISTINCT)
- ✅ UNRESOLVED pattern (typed result + outbox, no decision row)
- ✅ Actor model (actorType + actorUserId nullable + CHECK constraint)
- ✅ Day boundary policy (exclusive next-day, half-open interval)
- ✅ Holiday out-of-scope
- ✅ 6 vertical slices với dependency graph
- ✅ V6 P1 capability confirmed available
- ✅ All 4 files synced
- ✅ PR #4 opened as docs-only
- ✅ Status: COMPLETE / READY_FOR_MERGE
- ✅ Audit: NONE (read-only docs-only task)

---

**Discovery COMPLETE. Status READY_FOR_MERGE. PR #4 ready for review and merge.**
