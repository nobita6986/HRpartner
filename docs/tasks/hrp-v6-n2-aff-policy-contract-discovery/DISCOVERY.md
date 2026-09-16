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

N2 AFF (Admin Fee Clock) chưa có schema/service/API nào trong codebase. Tất cả đều greenfield. `aff_plan.md v2.3` đã chốt 18 decision. T0 đã chốt operational decisions R0–R4. Tài liệu này lock toàn bộ policy để Tier 1 mở N2-1 slice.

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
| V6 Phase 1A migrations | ✅ IN main migrations/ | `20260908150000_v6_phase1a_labor_profile_schema/`, `20260908150001_v6_phase1a_labor_profile_rls/` |
| `n1_placement_case_foundation` | ✅ IN main migrations/ | `20260912140411_n1_placement_case_foundation/` |
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
  040000 tree 613b6fe6... prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  040000 tree a399344c... prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/

$ git ls-tree origin/main prisma/migrations/ | Select-String "n1_placement_case"
  040000 tree <hash>...   prisma/migrations/20260912140411_n1_placement_case_foundation/
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
| Q2c — Day boundary | `LOCKED` | **Exclusive next-day** — boundary = start of day kế tiếp Asia/Bangkok. Half-open interval `[start, nextDayStart)`. Boundary computed via `businessDate(anchor) + N calendar dates`, ceil to start-of-day. **Helper removed from this discovery**; concrete helper is N2-1's job. Acceptance vector: `openedAt=2026-09-10T07:00:00Z` (≈ 14:00 BKK) → `expiresAt=2026-09-16T17:00:00Z` (≈ 2026-09-17 00:00 BKK). |
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

### 2.4 ReferralAttribution — Immutable Facts vs Mutable Lifecycle Metadata (LOCKED)

**Attribution history is immutable. Attribution does NOT change when handling assignment changes or expires.**

Two separate clocks:
- Attribution TTL: 30 days from first click
- Handling protected window: 7 days from LaborProfile create/match

#### 2.4.1 Fact classification

| Fact | Mutable? | Notes |
|---|---|---|
| `referrerUserId` | **IMMUTABLE** | Set once at creation; never changes |
| `affiliateCodeSnapshot` | **IMMUTABLE** | Set once; never changes |
| `firstClickedAt` | **IMMUTABLE** | Set once; never changes |
| `expiresAt` | **IMMUTABLE** | Set once at creation; never extended |
| `laborProfileId` | **IMMUTABLE (write-once NULL → value)** | Set once via `consume()`; never cleared; transition is `NULL → value` only |
| `status` | **MUTABLE (lifecycle)** | ACTIVE → CONSUMED / EXPIRED / REVOKED / SUPERSEDED; transitions only via explicit transition command |
| `consumedAt` | **MUTABLE (lifecycle)** | Set when status → CONSUMED |
| `createdAt` | IMMUTABLE | Auto-generated |
| `updatedAt` | MUTABLE (system) | Auto-managed by Prisma |

#### 2.4.2 Immutability enforcement — multi-layer (R4)

> **No single layer owns the invariant.** Application service is **NOT** the sole layer; DB constraints are the authority for write-once columns.

Layers:

1. **RLS USING**: read visibility only — restricts **which rows** a session sees.
2. **RLS WITH CHECK**: write-path visibility — restricts **which rows** can be inserted/updated.
3. **DB trigger / BEFORE UPDATE**: rejects updates to IMMUTABLE columns. If `OLD.<immutable_col> IS DISTINCT FROM NEW.<immutable_col>` → raise exception.
4. **BEFORE INSERT / BEFORE UPDATE trigger on `labor_profile_id`**: enforces `NULL → value` write-once transition. For `INSERT`, accepts both NULL (pre-consume) and value (consume in same transaction). For `UPDATE`, rejects change from a non-null value.
5. **Application service**: command-path authorized; scoped UPDATE allowed only for lifecycle columns (`status`, `consumedAt`). Application service is convenience, not authority.
6. **No DELETE**: enforced by RLS `WITH CHECK` and trigger.

The earlier text "RLS: no UPDATE/DELETE on `referral_attributions`" was misleading — scoped UPDATE is required for the lifecycle state machine. The corrected stance:

- **DB authority**: triggers + CHECK constraints prevent UPDATE to immutable columns and reject DELETE.
- **Application service**: only exposes scoped transition methods (`consume()`, `transitionStatus()`).
- **RLS WITH CHECK**: write-path visibility on top of DB authority.

### 2.5 CommissionBeneficiaryDecision (Q7 — LOCKED Per T0 Verdict)

#### 2.5.1 Schema (LOCKED)

```prisma
/// CommissionBeneficiaryDecision — authority record độc lập cho mỗi milestone.
/// Không derived tởi active handler động. Mỗi decision là immutable snapshot.
model CommissionBeneficiaryDecision {
  id                      String    @id @default(uuid())
  laborProfileId          String    @map("labor_profile_id")
  assignmentId            String?   @map("assignment_id")
  handlingAssignmentId    String?   @map("handling_assignment_id")
  beneficiaryUserId       String    @map("beneficiary_user_id")     // REQUIRED for ACTIVE
  source                  String    @map("source")                   // AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION | DIRECT
  reason                  String    @map("reason")                   // Typed reason
  evidence                Json      @default("{}") @map("evidence") // Snapshot — referrerFacts, handlingFacts
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

#### 2.5.2 Immutable Facts vs Mutable Lifecycle Metadata (R4)

| Field | Mutable? | Notes |
|---|---|---|
| `laborProfileId` (business key part) | **IMMUTABLE** | Part of business key; never changes |
| `assignmentId` (business key part) | **IMMUTABLE** | Part of business key; never changes |
| `milestone` (business key part) | **IMMUTABLE** | Part of business key; never changes |
| `beneficiaryUserId` | **IMMUTABLE** | Snapshot; never changes after row creation |
| `source` | **IMMUTABLE** | Snapshot; never changes after row creation |
| `reason` | **IMMUTABLE** | Snapshot; never changes after row creation |
| `evidence` | **IMMUTABLE** | Snapshot; never changes after row creation |
| `decidedAt` | **IMMUTABLE** | Snapshot; never changes after row creation |
| `actorType` | **IMMUTABLE** | Snapshot; never changes after row creation |
| `actorUserId` | **IMMUTABLE** | Snapshot; never changes after row creation |
| `handlingAssignmentId` | **IMMUTABLE** | Snapshot at creation; never changes |
| `status` | **MUTABLE** (lifecycle) | ACTIVE → SUPERSEDED | REVERSED via explicit transition commands |
| `supersededById` | **MUTABLE** (lifecycle) | Set during SUPERSEDED or REVERSED transition |
| `createdAt` | IMMUTABLE | Auto-generated |
| `updatedAt` | MUTABLE (system) | Auto-managed by Prisma |

**R4 correction:** Earlier docs called decisions "immutable" as a whole. R4 splits immutable facts (everything except `status`, `supersededById`, `updatedAt`) from mutable lifecycle metadata.

#### 2.5.3 Invariant Contract — LOCKED (R4 syntax fix)

**Business key:** `(laborProfileId, assignmentId, milestone)`. Note: `milestone` is non-null in the locked schema, so it does not need NULL normalization; only `assignmentId` may be null.

**Invariant:** At any point in time, at most **one ACTIVE decision** per business key.

**Nullable-safe handling — PostgreSQL 15+ correct syntax (R4 fix):**

The earlier SQL placed `NULLS NOT DISTINCT` after `WHERE status = 'ACTIVE'`. PostgreSQL syntax requires `NULLS NOT DISTINCT` immediately after the column list, before `WHERE`:

```sql
-- PostgreSQL 15+ partial unique index (preferred)
CREATE UNIQUE INDEX cbd_active_uniq
  ON commission_beneficiary_decisions
    (labor_profile_id, assignment_id, milestone)
  NULLS NOT DISTINCT
  WHERE status = 'ACTIVE';
```

**Sentinel fallback** (for environments without PG 15+ `NULLS NOT DISTINCT`, or when DB-level NULL semantics must be enforced):

```sql
-- Expression-based partial unique index using COALESCE sentinel
-- Sentinel '__NONE__' must be excluded from the laborProfileId/assignmentId/milestone domain
-- via a CHECK constraint (cbd_id_domain_check) so sentinel cannot collide with real IDs.
CREATE UNIQUE INDEX cbd_active_uniq
  ON commission_beneficiary_decisions(
    labor_profile_id,
    COALESCE(assignment_id, '__NONE__')
  )
  WHERE status = 'ACTIVE';

-- Sentinel domain guard:
ALTER TABLE commission_beneficiary_decisions
  ADD CONSTRAINT cbd_id_domain_check
  CHECK (
    labor_profile_id <> '__NONE__'
    AND assignment_id <> '__NONE__'  -- explicit check; assignmentId may be NULL but not '__NONE__'
  );
```

**Note:** In the locked schema `milestone` is **non-null**, so `COALESCE(milestone, '__NONE__')` is technically redundant. R4 drops it. The CHECK constraint explicitly guards the sentinel against the assignment_id domain (assignment_id may be NULL, but if present must not equal the sentinel).

**Authority:** Migration SQL owns the constraint. Prisma schema is documentation; if Prisma can't represent the index, SQL migration is authority.

#### 2.5.4 Concurrency-safe write — interactive transaction required (R4 fix)

> **`pg_advisory_xact_lock` only persists for the duration of the transaction holding it. Lock + lookup + supersede + insert MUST run inside a single interactive transaction.**

The earlier sketch used `prisma.$executeRaw` then a separate `tx` — that releases the lock before the lookup. R4 mandates:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. ACQUIRE advisory lock (xact-scoped — released at commit/rollback)
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${normalizeKey(laborProfileId, assignmentId, milestone)}, 0)
    )
  `;

  // 2. LOOKUP existing ACTIVE decision for business key
  const existing = await tx.commissionBeneficiaryDecision.findFirst({
    where: { laborProfileId, assignmentId: assignmentId ?? null, milestone, status: 'ACTIVE' }
  });
  if (existing) {
    return existing; // idempotent — keep authoritative row
  }

  // 3. SUPERSEDE if there is a non-ACTIVE row needing correction
  //    (correction path — see §2.5.7)

  // 4. INSERT new ACTIVE decision
  await tx.commissionBeneficiaryDecision.create({
    data: { /* ... */ }
  });

  // 5. Lock released on COMMIT (or stays locked on ROLLBACK)
});
```

**Why `hashtextextended` instead of `hashtext`:** `hashtextextended(key, seed)` accepts a `text` argument directly and is the preferred 64-bit hashing function in modern PostgreSQL. The R4 contract uses `hashtextextended(key, 0)` for clarity.

**DB unique index remains the authority for the invariant.** Advisory lock only reduces contention under concurrent writes; it is not a substitute for the unique index.

#### 2.5.5 UNRESOLVED Outcome (LOCKED — T0 R3, R4 retained)

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

#### 2.5.6 Actor Field (LOCKED — T0 R3, R4 retained)

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

#### 2.5.7 Correction vs Reversal Semantics (R4 clarified)

| Action | Old decision | New decision? | Audit record |
|---|---|---|---|
| **Correction** (dispute resolves change of beneficiary) | `status: ACTIVE → SUPERSEDED`, sets `supersededById = <new decision id>` | YES — new ACTIVE decision created with new beneficiary | SUPERSEDED row kept as audit chain; new decision links back via `supersededById` (forward link) |
| **Reversal** (fraud/error discovered) | `status: ACTIVE → REVERSED`, sets `supersededById = NULL or <self>` | NO replacement created automatically | REVERSED row kept; no new active row until an explicit correction command |
| **Reversal + replacement** | Same as reversal, then explicit correction command | YES, as a separate audited command | Both REVERSED and SUPERSEDED rows preserved with full chain |

**Implications:**

- Reversal does NOT by itself create a replacement ACTIVE decision. If the operator wants a replacement, they run an explicit correction command (which creates a new ACTIVE row and supersedes the REVERSED row).
- Reversal + replacement is two commands, two audit records.
- R4 separates "reversal" from "correction" — they are distinct lifecycle events, not the same thing.

#### 2.5.8 Decision Resolution Flow (LOCKED)

```
At milestone evaluation time (single interactive transaction):
1. ACQUIRE advisory_xact_lock on normalized(business key)
2. LOOKUP existing ACTIVE decision for business key
   a. IF found AND status=ACTIVE:
      → Use decision.beneficiaryUserId
   b. IF NOT found:
      → IF active LaborProfileHandlingAssignment exists (ACTIVE + not expired):
         → INSERT ACTIVE decision with:
            beneficiaryUserId = assigneeUserId
            actorType = 'SYSTEM'
            actorUserId = NULL
         → outbox publish: BENEFICIARY_DECISION_CREATED
      → ELSE:
         → Return { kind: 'SKIPPED', reason: 'NO_ACTIVE_HANDLER' }
         → outbox publish: BENEFICIARY_DECISION_UNRESOLVED
         → NO decision row created
3. COMMIT (releases lock) or ROLLBACK
```

### 2.6 Permissions (LOCKED — R4 corrected)

> **R4 correction:** Earlier §2.6 listed 6 codes but the actual count is 5 explicit permission codes + implicit self-view. R4 formally records **5 codes + implicit self-view**.

System engine path is **internal capability**, NOT a human permission — does not require a 6th code.

| Action | Permission | Authorized Roles | Data Scope |
|---|---|---|---|
| Assign handler to profile | `CAN_ASSIGN_HANDLING` | `ADMIN`, `HR_MANAGER` | ADMIN/HR_MANAGER: anyone |
| Transfer handling | `CAN_TRANSFER_HANDLING` | `ADMIN`, `HR_MANAGER` | Authorized roles; assignee current |
| Release (về Company Pool) | `CAN_RELEASE_HANDLING` | `ADMIN`, `HR_MANAGER` | Authorized roles; assignee self |
| Create beneficiary decision / correction / reversal | `CAN_CREATE_BENEFICIARY_DECISION` | `ADMIN`, `HR_MANAGER` | Explicit beneficiary/correction/reversal commands |
| View Company Pool | `CAN_VIEW_HANDLING_POOL` | `ADMIN`, `HR_MANAGER`, `HR_STAFF` | HR_MANAGER (team), HR_STAFF (assigned rows only), HR (all) |
| View own assignments | **Implicit self-view** (no code) | Any session user | Own rows only |

**Role semantics clarified:**
- `ADMIN` — full override.
- `HR_MANAGER` — assign/reassign/release, beneficiary decisions/corrections/reversals.
- `HR_STAFF` — visibility on assigned rows only; **NOT** beneficiary override by default.
- `SYSTEM` — internal engine capability; not a role for human authorization.

**RLS USING = read visibility skeleton; WITH CHECK = write-path policy. Authorization is at the command/service layer; RLS is defense-in-depth, not the authorization authority.**

```sql
-- LaborProfileHandlingAssignment RLS
ALTER TABLE labor_profile_handling_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_handling_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_handling_assignment_read ON labor_profile_handling_assignments
  AS PERMISSIVE FOR SELECT
  TO app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = assignee_user_id
  );

CREATE POLICY hrp_handling_assignment_write ON labor_profile_handling_assignments
  AS PERMISSIVE FOR INSERT
  TO app_user_writer
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  );

-- CommissionBeneficiaryDecision RLS
ALTER TABLE commission_beneficiary_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_beneficiary_decisions FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_beneficiary_decision_read ON commission_beneficiary_decisions
  AS PERMISSIVE FOR SELECT
  TO app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = beneficiary_user_id
  );

CREATE POLICY hrp_beneficiary_decision_write ON commission_beneficiary_decisions
  AS PERMISSIVE FOR INSERT
  TO app_user_writer
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
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
| N2-1 | `hrp-v6-n2-aff-01-attribution-foundation` | `ReferralAttribution` table (immutable facts vs mutable lifecycle metadata per §2.4.1; trigger + write-once CHECK on `laborProfileId`; partial unique on laborProfileId for one-attribution-per-profile) | Low — additive | Immutability trigger + lifecycle transitions + RLS USING + RLS WITH CHECK | No |
| N2-2 | `hrp-v6-n2-aff-02-link-capture` | None (pure app) | Zero | Race, forged code, all roles | No |
| N2-3 | `hrp-v6-n2-aff-03-apply-attribution` | Additive `candidate_submissions` columns + RPC signature change | HIGH | RPC migration test, upgrade path | No (LaborProfile in main) |
| N2-4 | `hrp-v6-n2-aff-04-handling-assignment` | `labor_profile_handling_assignments` with partial unique `(laborProfileId) WHERE status = 'ACTIVE'`; RLS USING + RLS WITH CHECK per §2.6 | Medium | Race to assign, expiry | No |
| N2-5 | `hrp-v6-n2-aff-05-beneficiary-decision` | `CommissionBeneficiaryDecision` per §2.5 schema; **migration SQL owns**: NULLS NOT DISTINCT partial unique (R4 corrected syntax) + CHECK constraint + CHECK actor XOR + immutable-fact trigger; interactive transaction per §2.5.4 | Medium | Invariant, UNRESOLVED typed result, correction/reversal history, transaction scope | No (requires N2-4) |
| N2-6 | `hrp-v6-n2-aff-06-commission-beneficiary` | Additive `beneficiary_user_id` columns; EXACT_SAFE-only backfill; engine reads decision | Medium | EXACT_SAFE classification, UNRESOLVED skip | No (requires N2-5) |

---

## 4. Timing/Boundary Policy (LOCKED)

### 4.1 Day boundary (R4 — helper removed)

> Day boundary = exclusive next-day. Half-open interval `[start, nextDayStart)`.

Ví dụ: profile tạo ngày 2026-09-10 14:00 Asia/Bangkok → 7-day window kết thúc tại **2026-09-17 00:00:00 +07:00** (exclusive). Sau thời điểm đó = expired.

**R4 correction:** The earlier `nextDayStart()` helper was off-by-one — it added 7 days then ceiled to next day, producing `2026-09-18 00:00 BKK` instead of `2026-09-17 00:00 BKK`. R4 **removes the broken helper from this discovery**. The concrete helper is N2-1's job and must be designed against the acceptance vector:

```
openedAt = 2026-09-10T07:00:00Z   (≈ 2026-09-10 14:00 Asia/Bangkok)
window   = 7 calendar dates
expiresAt = 2026-09-16T17:00:00Z  (≈ 2026-09-17 00:00 Asia/Bangkok)  -- exclusive
now < expiresAt   => active
now == expiresAt  => expired
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
| V6 Phase 1A migrations in main | `prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/`, `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/` |
| n1_placement_case_foundation | `prisma/migrations/20260912140411_n1_placement_case_foundation/` |
| `CommissionLedger.ctvId` | `schema.prisma:1231` |
| `CommissionEngine.milestone` | `engine.service.ts:75-80` |
| `Holiday` table (informational only) | `schema.prisma:737-745` |
| `aff_plan.md v2.3` | `docs/V6/aff_plan.md:1-1080` |

### 6.2 V6 Phase 1A Capability in origin/main

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  040000 tree 613b6fe6... prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  040000 tree a399344c... prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/

$ git ls-tree origin/main prisma/migrations/ | Select-String "n1_placement_case"
  040000 tree <hash>...   prisma/migrations/20260912140411_n1_placement_case_foundation/
```

Tables: `labor_profiles`, `labor_profile_intakes`, `employment_episodes`
FK: `candidate_submissions.labor_profile_id`
RLS: all three tables

---

## 7. Definition of Done — Discovery (Locked)

Discovery hoàn tất khi:

- ✅ 18 `AFF-DEC-*` decisions đã chốt bởi `aff_plan.md`
- ✅ Operational decisions chốt bởi T0 verdict (R0–R4)
- ✅ Schema sketch cho ReferralAttribution, LaborProfileHandlingAssignment, CommissionBeneficiaryDecision
- ✅ Invariant contracts với nullable-safe specification (NULLS NOT DISTINCT — R4 corrected syntax)
- ✅ UNRESOLVED pattern (typed result + outbox, no decision row)
- ✅ Actor model (actorType + actorUserId nullable + CHECK constraint)
- ✅ Day boundary policy (exclusive next-day, half-open interval; helper removed — N2-1 owns concrete implementation)
- ✅ Holiday out-of-scope
- ✅ **R4: Correction vs reversal semantics clarified**
- ✅ **R4: Immutable facts vs mutable metadata split for both tables**
- ✅ **R4: Interactive transaction contract for advisory lock**
- ✅ **R4: Permission codes reconciled to 5 + implicit self-view; WITH CHECK clauses added**
- ✅ 6 vertical slices với dependency graph
- ✅ V6 P1 capability confirmed available
- ✅ All 4 files synced
- ✅ PR #4 opened as docs-only
- ✅ Status: COMPLETE / READY_FOR_MERGE
- ✅ Audit: NONE (read-only docs-only task)

---

**Discovery COMPLETE. Status READY_FOR_MERGE. PR #4 ready for review and merge.**
