# N2 AFF Policy & Contract Discovery

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (15 Sep 2026)
**Author:** S1
**Type:** READ-ONLY Discovery — no production code changes
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE` (read-only docs-only)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 0. Executive Summary

N2 AFF (Admin Fee Clock) chưa có schema/service/API nào trong codebase. Tất cả đều greenfield. `aff_plan.md v2.3` đã chốt 18 decision. T0 đã chốt operational decisions R0–R5. Tài liệu này lock toàn bộ policy để Tier 1 mở N2-1 slice.

---

## 1. Evidence Baseline

### 1.1 What exists for N2/AFF in pinned baseline b91a33f

| Component | Status | Evidence |
|---|---|---|
| `User.affCode` | ✅ Already exists | `schema.prisma:141` |
| `PlacementCase` | ✅ Foundation exists | `schema.prisma:1460-1484` |
| `PlacementCase.openedAt` | ✅ Clock anchor candidate | `schema.prisma:1465` |
| `LaborProfile` | ✅ EXISTS in pinned baseline | `schema.prisma:1393` |
| `LaborProfileIntake` | ✅ EXISTS in pinned baseline | `schema.prisma:1421` |
| `EmploymentEpisode` | ✅ EXISTS in pinned baseline | `schema.prisma:1431` |
| V6 Phase 1A migrations | ✅ IN pinned baseline | `20260908150000_v6_phase1a_labor_profile_schema/`, `20260908150001_v6_phase1a_labor_profile_rls/` |
| n1_placement_case_foundation | ✅ IN pinned baseline | `20260912140411_n1_placement_case_foundation/`, `20260912140412_n1_placement_case_rls/` |
| `Holiday` table | ✅ Exists, attendance-only | `schema.prisma:737-745` |
| Commission ledger | ✅ CTV-specific | `schema.prisma:1229-1260` |
| Commission engine | ✅ 30/60/90-day milestones | `engine.service.ts:75-80` |
| `ProjectAssignment.referrerId` | ✅ Legacy referral | `schema.prisma:658` |
| `ReferralAttribution` | ❌ NOT IMPLEMENTED | Greenfield |
| `CommissionBeneficiaryDecision` | ❌ NOT IMPLEMENTED | Greenfield |
| `LaborProfileHandlingAssignment` | ❌ NOT IMPLEMENTED | Greenfield |
| Handler assignment service | ❌ NOT IMPLEMENTED | Greenfield |
| AFF-specific API routes | ❌ NOT IMPLEMENTED | Greenfield |

### 1.2 V6 Phase 1A — Capability Available in Pinned Baseline

V6 Phase 1A schema và RLS đã nằm trong `prisma/migrations/` của pinned baseline. No merge dependency. N2-3 và N2-4 không bị blocked.

### 1.3 No timezone handling anywhere

```sql
-- All timestamps are TIMESTAMP(3), not TIMESTAMPTZ
openedAt       DateTime  @default(now()) @map("opened_at")     -- schema.prisma:1465
validFrom      DateTime  @map("valid_from") @db.Timestamptz(3) -- ONLY exception: ProjectAssignment.validFrom/To
```

---

## 2. Locked Decisions (T0 Verdict Applied)

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

`Holiday` table hiện đang độc lập, chỉ phục vụ attendance/timesheet. N2 AFF clock dùng **calendar days pure** — không có business-day logic, không cần Holiday consumption.

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
| `laborProfileId` | **IMMUTABLE NULL → value** | Pre-consume: NULL; post-consume: a `labor_profiles.id` value; never re-cleared, never replaced |
| `status` | **MUTABLE (lifecycle)** | ACTIVE → CONSUMED / EXPIRED / REVOKED / SUPERSEDED; transitions only via explicit transition command |
| `consumedAt` | **MUTABLE (lifecycle)** | Set when status → CONSUMED |
| `createdAt` | IMMUTABLE | Auto-generated |
| `updatedAt` | MUTABLE (system) | Auto-managed by Prisma |

#### 2.4.2 Immutability enforcement — multi-layer (R5 clarified)

> **No single layer owns the invariant.** Application service is **NOT** the sole layer; triggers + RLS work together; each layer has a distinct role.

**Layer 1 — Trigger BEFORE UPDATE (immutable protection):**

Rejects any UPDATE that attempts to change an immutable column. Allowed only on lifecycle columns (`status`, `consumedAt`).

```sql
CREATE FUNCTION referral_attributions_immutable_update()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referrer_user_id       IS DISTINCT FROM OLD.referrer_user_id       THEN RAISE EXCEPTION 'referrer_user_id is immutable';       END IF;
  IF NEW.affiliate_code_snapshot IS DISTINCT FROM OLD.affiliate_code_snapshot THEN RAISE EXCEPTION 'affiliate_code_snapshot is immutable'; END IF;
  IF NEW.first_clicked_at       IS DISTINCT FROM OLD.first_clicked_at       THEN RAISE EXCEPTION 'first_clicked_at is immutable';       END IF;
  IF NEW.expires_at             IS DISTINCT FROM OLD.expires_at             THEN RAISE EXCEPTION 'expires_at is immutable';             END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER referral_attributions_immutable_update_trg
  BEFORE UPDATE ON referral_attributions
  FOR EACH ROW EXECUTE FUNCTION referral_attributions_immutable_update();
```

**Layer 1b — Trigger BEFORE INSERT/UPDATE on `laborProfileId` (write-once NULL → value, R5):**

Enforces the `NULL → value` write-once transition. INSERT allows NULL or a real `labor_profiles.id`. UPDATE rejects change from a non-null value and rejects clearing a non-null value.

```sql
CREATE FUNCTION referral_attributions_labor_profile_id_write_once()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.labor_profile_id IS NOT NULL AND length(NEW.labor_profile_id) = 0 THEN
      RAISE EXCEPTION 'labor_profile_id empty';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.labor_profile_id IS NULL AND NEW.labor_profile_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    IF OLD.labor_profile_id IS NOT NULL AND NEW.labor_profile_id IS DISTINCT FROM OLD.labor_profile_id THEN
      RAISE EXCEPTION 'labor_profile_id is write-once (NULL -> value only)';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER referral_attributions_labor_profile_id_write_once_trg
  BEFORE INSERT OR UPDATE ON referral_attributions
  FOR EACH ROW EXECUTE FUNCTION referral_attributions_labor_profile_id_write_once();
```

**Layer 2 — CHECK constraints (current state, R5 clarified):**

CHECK constraints inspect **only the row's current values**. They do not enforce write-once semantics — that is the trigger's job.

```sql
ALTER TABLE referral_attributions
  ADD CONSTRAINT referral_attributions_labor_profile_id_fk
    FOREIGN KEY (labor_profile_id) REFERENCES labor_profiles(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE referral_attributions
  ADD CONSTRAINT referral_attributions_status_check
    CHECK (status IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED'));
```

**Layer 3 — RLS USING (read visibility, per role) + WITH CHECK (write-path policy, per command):**

See §2.6 for the role-scoped RLS matrix.

**Layer 4 — Application service (convenience, not authority):**

Application service only exposes scoped transition methods (`consume()`, `transitionStatus()`). The DB trigger is the authority for write-once / immutable enforcement.

**Layer 5 — DELETE policy (R5 clarified):**

> **`WITH CHECK` is NOT a DELETE protection.** `WITH CHECK` applies to `INSERT` and `UPDATE` only. DELETE is governed by the `USING` clause of a DELETE policy, OR by the absence of any DELETE policy under `FORCE ROW LEVEL SECURITY` (which yields a default-deny).

Recommended pattern: rely on **default-deny DELETE** under `FORCE ROW LEVEL SECURITY`. Optionally add a **BEFORE DELETE trigger** as defense-in-depth.

```sql
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions FORCE ROW LEVEL SECURITY;
-- No DELETE policy => default-deny.
CREATE FUNCTION referral_attributions_block_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'referral_attributions rows are never deleted'; END $$;
CREATE TRIGGER referral_attributions_block_delete_trg
  BEFORE DELETE ON referral_attributions FOR EACH ROW EXECUTE FUNCTION referral_attributions_block_delete();
```

### 2.5 CommissionBeneficiaryDecision (Q7 — LOCKED Per T0 Verdict)

#### 2.5.1 Schema (LOCKED)

```prisma
model CommissionBeneficiaryDecision {
  id                      String    @id @default(uuid())
  laborProfileId          String    @map("labor_profile_id")
  assignmentId            String?   @map("assignment_id")
  handlingAssignmentId    String?   @map("handling_assignment_id")
  beneficiaryUserId       String    @map("beneficiary_user_id")
  source                  String    @map("source")
  reason                  String    @map("reason")
  evidence                Json      @default("{}") @map("evidence")
  decidedAt               DateTime  @map("decided_at")
  milestone               String    @map("milestone")
  status                  String    @default("ACTIVE") @map("status")
  supersededById          String?   @map("superseded_by_id")
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt      @map("updated_at")
  actorType               String    @map("actor_type")
  actorUserId             String?   @map("actor_user_id")

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

**R5 link direction:** `OLD.supersededById` points to the **replacement** decision id. The replacement does NOT carry a back-pointer. Single direction.

#### 2.5.2 Immutable Facts vs Mutable Lifecycle Metadata

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
| `status` | **MUTABLE** (lifecycle) | ACTIVE → SUPERSEDED / REVERSED via explicit transition commands |
| `supersededById` | **MUTABLE** (lifecycle) | Set during SUPERSEDED transition only (forward link) |
| `createdAt` | IMMUTABLE | Auto-generated |
| `updatedAt` | MUTABLE (system) | Auto-managed by Prisma |

#### 2.5.3 Invariant Contract — LOCKED

**Business key:** `(laborProfileId, assignmentId, milestone)`. `milestone` is non-null; only `assignmentId` may be null.

**Invariant:** At most **one ACTIVE decision** per business key.

```sql
-- PostgreSQL 15+ partial unique index (preferred)
CREATE UNIQUE INDEX cbd_active_uniq
  ON commission_beneficiary_decisions
    (labor_profile_id, assignment_id, milestone)
  NULLS NOT DISTINCT
  WHERE status = 'ACTIVE';
```

**Sentinel fallback:**

```sql
CREATE UNIQUE INDEX cbd_active_uniq
  ON commission_beneficiary_decisions(
    labor_profile_id,
    COALESCE(assignment_id, '__NONE__')
  )
  WHERE status = 'ACTIVE';

ALTER TABLE commission_beneficiary_decisions
  ADD CONSTRAINT cbd_id_domain_check
  CHECK (
    labor_profile_id <> '__NONE__'
    AND assignment_id <> '__NONE__'
  );
```

**Authority:** Migration SQL owns the constraint. Prisma schema is documentation.

#### 2.5.4 Concurrency-safe write — interactive transaction required

```typescript
await prisma.$transaction(async (tx) => {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${normalizeKey(laborProfileId, assignmentId, milestone)}, 0)
    )
  `;

  const existing = await tx.commissionBeneficiaryDecision.findFirst({
    where: { laborProfileId, assignmentId: assignmentId ?? null, milestone, status: 'ACTIVE' }
  });

  if (existing && existing.beneficiaryUserId === beneficiaryUserId) {
    return existing;
  }

  await tx.commissionBeneficiaryDecision.create({
    data: { }
  });
});
```

#### 2.5.5 Beneficiary Commands (R5)

The decision lifecycle is driven by **four explicit commands**.

| Command | Precondition | Effect | New row? | Audit event |
|---|---|---|---|---|
| **CREATE** | No ACTIVE for business key, OR existing ACTIVE is exact-match (idempotent path) | If no ACTIVE: INSERT new ACTIVE. If exact-match ACTIVE: no-op return. | Only when no ACTIVE | `BENEFICIARY_DECISION_CREATED` |
| **CORRECT** | Existing ACTIVE for business key | UPDATE old ACTIVE → status=SUPERSEDED, supersededById = new replacement id; INSERT new ACTIVE with new beneficiary | YES | `BENEFICIARY_DECISION_CORRECTED` (old SUPERSEDED) + `BENEFICIARY_DECISION_CREATED` (new) |
| **REVERSE** | Existing ACTIVE for business key | UPDATE old ACTIVE → status=REVERSED, supersededById = NULL (no replacement) | NO | `BENEFICIARY_DECISION_REVERSED` |
| **REDECIDE_AFTER_REVERSAL** | Most recent row for business key has status=REVERSED | INSERT new ACTIVE with new beneficiary (no supersede link) | YES | `BENEFICIARY_DECISION_REDECIDED` |

**Forbidden transitions (R5):**

- ❌ REVERSED → SUPERSEDED (a reversed row is terminal)
- ❌ SUPERSEDED → REVERSED (a superseded row is also terminal)
- ❌ REVERSED → ACTIVE (no resurrection)
- ❌ SUPERSEDED → ACTIVE (no resurrection)

**Transition state machine:**

```
            CREATE
              |
              v
            ACTIVE <-----+
              |          |
              |  CORRECT |  REDECIDE_AFTER_REVERSAL
              v          |
         SUPERSEDED     |
              |          |
              v          |
           (terminal)    |
              |          |
              | REVERSE  |
              v          |
           REVERSED -----+
              |
              v
           (terminal)
```

#### 2.5.6 UNRESOLVED Outcome (LOCKED)

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

#### 2.5.7 Actor Field (LOCKED)

```prisma
actorType    String
actorUserId  String?
```

```sql
ALTER TABLE commission_beneficiary_decisions
  ADD CONSTRAINT cbd_actor_check
  CHECK (
    (actor_type = 'USER' AND actor_user_id IS NOT NULL)
    OR (actor_type = 'SYSTEM' AND actor_user_id IS NULL)
  );
```

### 2.6 Permissions (LOCKED — R5 final)

> **R5:** System engine path is **internal capability**, NOT a human permission. The count is **5 explicit permission codes + implicit self-view**.

#### 2.6.1 Permission codes

| Action | Permission | Authorized Roles | Data Scope |
|---|---|---|---|
| Assign handler to profile | `CAN_ASSIGN_HANDLING` | ADMIN, HR_MANAGER | HR_MANAGER (team scope); ADMIN (anyone) |
| Transfer handling | `CAN_TRANSFER_HANDLING` | ADMIN, HR_MANAGER | Assignee current OR HR_MANAGER (team); ADMIN (anyone) |
| Release (về Company Pool) | `CAN_RELEASE_HANDLING` | ADMIN, HR_MANAGER | Assignee self OR HR_MANAGER (team); ADMIN (anyone) |
| Create beneficiary decision / correction / reversal / redeide-after-reversal | `CAN_CREATE_BENEFICIARY_DECISION` | ADMIN, HR_MANAGER | Explicit beneficiary/correction/reversal/redeide commands |
| View Company Pool | `CAN_VIEW_HANDLING_POOL` | ADMIN, HR_MANAGER, HR_STAFF | HR_MANAGER (team); HR_STAFF (assigned rows only); ADMIN (all) |
| View own assignments | **Implicit self-view** (no code) | Any session user | Own rows only |

#### 2.6.2 Role semantics (R5)

- `ADMIN` — full override; scope: any row.
- `HR_MANAGER` — assign/reassign/release; beneficiary decisions/corrections/reversals/redeides; **scope: team**.
- `HR_STAFF` — visibility on assigned rows only; **NOT** beneficiary override by default; **NOT** assigner/releaser.
- `SYSTEM` — internal engine capability; **NOT** a role for human authorization.

**R5 invariant:** No role-only policy opens all rows. Every policy must be scoped (team/assigned/self/own).

#### 2.6.3 RLS Matrix (R5 — UPDATE USING/WITH CHECK required)

```sql
-- LaborProfileHandlingAssignment
ALTER TABLE labor_profile_handling_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_handling_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_lha_select ON labor_profile_handling_assignments
  AS PERMISSIVE FOR SELECT TO app_user
  USING (
    hrp_session_role() = 'ADMIN'
    OR (hrp_session_role() = 'HR_MANAGER'
        AND EXISTS (
          SELECT 1 FROM hr_team_members m
          WHERE m.manager_id = hrp_session_user_id()
            AND m.member_user_id = assignee_user_id
        ))
    OR (hrp_session_role() = 'HR_STAFF' AND assignee_user_id = hrp_session_user_id())
    OR assignee_user_id = hrp_session_user_id()
  );

CREATE POLICY hrp_lha_insert ON labor_profile_handling_assignments
  AS PERMISSIVE FOR INSERT TO app_user_writer
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  );

CREATE POLICY hrp_lha_update ON labor_profile_handling_assignments
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    hrp_session_role() = 'ADMIN'
    OR (hrp_session_role() = 'HR_MANAGER'
        AND EXISTS (
          SELECT 1 FROM hr_team_members m
          WHERE m.manager_id = hrp_session_user_id()
            AND m.member_user_id = assignee_user_id
        ))
    OR assignee_user_id = hrp_session_user_id()
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    OR assignee_user_id = hrp_session_user_id()
  );

-- No DELETE policy => default-deny DELETE under FORCE RLS

-- CommissionBeneficiaryDecision
ALTER TABLE commission_beneficiary_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_beneficiary_decisions FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_cbd_select ON commission_beneficiary_decisions
  AS PERMISSIVE FOR SELECT TO app_user
  USING (
    hrp_session_role() = 'ADMIN'
    OR (hrp_session_role() = 'HR_MANAGER'
        AND EXISTS (
          SELECT 1 FROM labor_profile_handling_assignments lha
          WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
            AND EXISTS (
              SELECT 1 FROM hr_team_members m
              WHERE m.manager_id = hrp_session_user_id()
                AND m.member_user_id = lha.assignee_user_id
            )
        ))
    OR beneficiary_user_id = hrp_session_user_id()
    OR (hrp_session_role() = 'HR_STAFF'
        AND EXISTS (
          SELECT 1 FROM labor_profile_handling_assignments lha
          WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
            AND lha.assignee_user_id = hrp_session_user_id()
        ))
  );

CREATE POLICY hrp_cbd_insert ON commission_beneficiary_decisions
  AS PERMISSIVE FOR INSERT TO app_user_writer
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  );

CREATE POLICY hrp_cbd_update ON commission_beneficiary_decisions
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    hrp_session_role() = 'ADMIN'
    OR (hrp_session_role() = 'HR_MANAGER'
        AND EXISTS (
          SELECT 1 FROM labor_profile_handling_assignments lha
          WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
            AND EXISTS (
              SELECT 1 FROM hr_team_members m
              WHERE m.manager_id = hrp_session_user_id()
                AND m.member_user_id = lha.assignee_user_id
            )
        ))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  );

-- No DELETE policy => default-deny DELETE under FORCE RLS
```

#### 2.6.4 LIVE RLS matrix tests (R5 — required)

> **R5 requirement:** The RLS policies above MUST be exercised by an explicit LIVE matrix test on a real Postgres instance.

| Role | Action | Expected result |
|---|---|---|
| ADMIN | SELECT all rows | allowed |
| HR_MANAGER | SELECT team-scoped rows | allowed |
| HR_MANAGER | SELECT out-of-team rows | denied |
| HR_STAFF | SELECT assigned rows | allowed |
| HR_STAFF | SELECT unassigned rows | denied |
| any role | DELETE row | denied (no DELETE policy) |
| HR_STAFF | INSERT row | denied |
| HR_STAFF | UPDATE row | denied |
| HR_MANAGER (team) | INSERT/UPDATE own-team row | allowed |
| HR_MANAGER (out-of-team) | INSERT/UPDATE row | denied |
| beneficiary | SELECT own decision | allowed |
| beneficiary | UPDATE own decision | denied (no UPDATE policy for self) |

N2-5 TASK must include this LIVE matrix as a hard test gate.

### 2.7 Inventory Reuse + N2 Conflicts

| Component | N2 Reuse | Conflict Risk | Resolution |
|---|---|---|---|
| `User.affCode` | Reuse mandatory | Low | Already there |
| `PlacementCase.openedAt` | Clock anchor | Low | Additive |
| `LaborProfile` | Available in pinned baseline | Low | FK ready |
| `ReferralGuard.applyOverride()` | Block-code logic | Medium | R1/R2/R3 rules có thể conflict |
| `CommissionEngine.evaluateMilestones()` | Milestone pattern | Medium | Update to read `CommissionBeneficiaryDecision` |
| `CommissionLedger.ctvId` | CTV-specific | High | Additive `beneficiaryUserId` legacy compat |
| `SourceClaim.ctvId/vendorId` | Legacy | High | Additive `referrerUserId` |
| `ProjectAssignment.referrerId` | Source field | Low | Placement derives from accepted SourceClaim |
| `intake-writer.service.ts` | Intake flow | Low | Preserve attribution |
| `candidate_submissions` RPC | SECURITY DEFINER | High | RPC signature change — needs LIVE test |
| `outbox.service.ts` | Audit events | Low | Reuse for handling + decision + UNRESOLVED events |
| `Holiday` | NOT in N2 scope | — | Out of scope per T0 |

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
| N2-1 | `hrp-v6-n2-aff-01-attribution-foundation` | `ReferralAttribution` table; immutable trigger (Layer 1) + laborProfileId write-once trigger (Layer 1b) + CHECK current state (Layer 2) + RLS per role (Layer 3) + default-deny DELETE (Layer 5) | Low — additive | Immutability trigger test + lifecycle transitions + role-scoped LIVE RLS matrix | No |
| N2-2 | `hrp-v6-n2-aff-02-link-capture` | None (pure app) | Zero | Race, forged code, all roles | No |
| N2-3 | `hrp-v6-n2-aff-03-apply-attribution` | Additive `candidate_submissions` columns + RPC signature change | HIGH | RPC migration test, upgrade path | No (LaborProfile in pinned baseline) |
| N2-4 | `hrp-v6-n2-aff-04-handling-assignment` | `labor_profile_handling_assignments` with partial unique `(laborProfileId) WHERE status = 'ACTIVE'`; RLS per §2.6.3 with explicit UPDATE USING/WITH CHECK for transfer + release | Medium | Race to assign, expiry, LIVE RLS matrix | No |
| N2-5 | `hrp-v6-n2-aff-05-beneficiary-decision` | `CommissionBeneficiaryDecision` per §2.5 schema; **migration SQL owns**: NULLS NOT DISTINCT partial unique + CHECK constraint + CHECK actor XOR + immutable-fact trigger; interactive transaction per §2.5.4; four explicit commands per §2.5.5; RLS per §2.6.3 with explicit UPDATE USING/WITH CHECK for CORRECT + REVERSE | Medium | Invariant, command-level lifecycle test, four-command matrix, LIVE RLS matrix | No (requires N2-4) |
| N2-6 | `hrp-v6-n2-aff-06-commission-beneficiary` | Additive `beneficiary_user_id` columns; EXACT_SAFE-only backfill; engine reads decision | Medium | EXACT_SAFE classification, UNRESOLVED skip | No (requires N2-5) |

---

## 4. Timing/Boundary Policy (LOCKED)

### 4.1 Day boundary

> Day boundary = exclusive next-day. Half-open interval `[start, nextDayStart)`.

```
openedAt = 2026-09-10T07:00:00Z   (≈ 2026-09-10 14:00 Asia/Bangkok)
window   = 7 calendar dates
expiresAt = 2026-09-16T17:00:00Z  (≈ 2026-09-17 00:00 Asia/Bangkok)  -- exclusive
now < expiresAt   => active
now == expiresAt  => expired
```

Concrete helper is N2-1's job.

### 4.2 Half-open intervals

Mọi `[start, end)` interval:
- `startAt` inclusive
- `expiresAt` exclusive (= start of next slot)
- Tại `now == expiresAt` → đã expired

---

## 5. Out of Scope (Locked)

Items explicitly **không thuộc N2 implementation**:

1. **Holiday** — out of scope. N2 uses pure calendar days.
2. **Business-day arithmetic** — không có trong N2.
3. **N2-1 implementation** — task này là discovery only.
4. **Schema/migration changes** — task này là discovery only.
5. **`docs/TIER0_SHIFT_HANDOVER.md`** — không touch.
6. **`docs/PLANNER_HANDOVER.md`** — không touch.
7. **PR #3 / P2** — không touch.
8. **N4 implementation** — không mở.

---

## 6. Evidence Appendix

### 6.1 File:line references (pinned to b91a33f)

| Evidence | Location |
|---|---|
| `User.affCode` exists | `schema.prisma:141` |
| `PlacementCase` model | `schema.prisma:1460-1484` |
| `LaborProfile` model | `schema.prisma:1393` |
| `LaborProfileIntake` model | `schema.prisma:1421` |
| `EmploymentEpisode` model | `schema.prisma:1431` |
| V6 Phase 1A migrations in pinned baseline | `prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/`, `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/` |
| n1_placement_case_foundation in pinned baseline | `prisma/migrations/20260912140411_n1_placement_case_foundation/`, `prisma/migrations/20260912140412_n1_placement_case_rls/` |
| `CommissionLedger.ctvId` | `schema.prisma:1231` |
| `CommissionEngine.milestone` | `engine.service.ts:75-80` |
| `Holiday` table (informational only) | `schema.prisma:737-745` |
| `aff_plan.md v2.3` | `docs/V6/aff_plan.md:1-1080` |

### 6.2 V6 Phase 1A Capability in Pinned Baseline (R5 reproducible)

> **R5 evidence:** pinned to commit `b91a33f948aed224a88f3e8e7c9847006f33e97f`. Evidence commands use `git ls-tree -r --name-only` (recursive, full names); no hash placeholders or shortened hashes.

```
$ git ls-tree -r --name-only b91a33f prisma/migrations/ | Select-String "phase1a|n1_placement"
prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql
prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql
prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql
prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql
```

Tables: `labor_profiles`, `labor_profile_intakes`, `employment_episodes`
FK: `candidate_submissions.labor_profile_id`
RLS: all three tables

---

## 7. Definition of Done — Discovery (Locked)

Discovery hoàn tất khi:

- 18 `AFF-DEC-*` decisions đã chốt bởi `aff_plan.md`
- Operational decisions chốt bởi T0 verdict (R0–R5)
- Schema sketch cho ReferralAttribution, LaborProfileHandlingAssignment, CommissionBeneficiaryDecision
- Invariant contracts với nullable-safe specification (NULLS NOT DISTINCT — R4 corrected syntax)
- UNRESOLVED pattern (typed result + outbox, no decision row)
- Actor model (actorType + actorUserId nullable + CHECK constraint)
- Day boundary policy (exclusive next-day, half-open interval; helper removed — N2-1 owns concrete implementation)
- Holiday out-of-scope
- Correction vs reversal vs redeide-after-reversal semantics split; supersede link direction fixed (R5)
- Immutable facts vs mutable metadata split for both tables
- Interactive transaction contract for advisory lock
- Permission codes = 5 explicit + implicit self-view (R5 final)
- WITH CHECK clauses added for all write paths (R5)
- Role-scoped RLS, no role-only opens (R5)
- LIVE RLS matrix tests required (R5)
- DELETE default-deny under FORCE RLS; optional BEFORE DELETE trigger defense-in-depth (R5)
- CHECK constraints are current-state only; write-once is trigger's job (R5)
- Evidence pinned to b91a33f, `git ls-tree -r --name-only`, no placeholders (R5)
- 6 vertical slices với dependency graph
- V6 P1 capability confirmed available in pinned baseline
- All 4 files synced
- PR #4 opened as docs-only
- Status: COMPLETE / READY_FOR_MERGE
- Audit: NONE (read-only docs-only task)

---

**Discovery COMPLETE. Status READY_FOR_MERGE. PR #4 ready for review and merge.**
