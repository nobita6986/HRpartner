# N2 AFF Policy & Contract Discovery

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (15 Sep 2026)
**Author:** S1
**Type:** READ-ONLY Discovery — no production code changes
**Status:** `OPEN / FINAL_R11_DELTA_REQUIRED` (T0 verdict after R7/R8/R9/R10/R11 reviews + R11 delta)

> **R11 delta status note:** R11 closes 6 blockers; FINAL R11 DELTA closes 6 surgical corrections on top: (D1) removed blanket ALL SEQUENCES revoke; (D2) `public` schema now checked in ownership assertion (only `information_schema` and `pg_%` excluded); (D3) removed unsupported full-grant-scan claim, added E-19 N2-5 privilege-survival LIVE vector; (D4) L-02a is admin/bypass-RLS schema-only SQLSTATE 23502 test (NOT an RLS test); (D5) L-03 strengthened with `current_user`, `rolsuper=false`, schema/table privilege assertions and RLS-diagnostic on denial; (D6) removed IEEE-754/DOUBLE_PRECISION claim; numeric parity limited to two specific vectors (`1.0=1`, `-0=0`); all stale R0-R9/R10 references synced to R11. PR remains OPEN until T0 final authorization.
**Audit:** `NONE` (read-only docs-only)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 0. Executive Summary

N2 AFF (Admin Fee Clock) chưa có schema/service/API nào trong codebase. Tất cả đều greenfield. `aff_plan.md v2.3` đã chốt 18 decision. T0 đã chốt operational decisions R0–R11 (R11 delta applied). Tài liệu này lock toàn bộ policy để Tier 1 mở N2-1 slice.

> **R8 status note:** PR #4 has been REVISION_REQUIRED by T0 after R7. R8 closes 4 P1 executable-contract blockers (CBD scope bypass, missing app_engine_writer executable contract, set_config isolation semantics, recursive canonical JSON). PR remains OPEN / REVISION_REQUIRED until T0 final authorization.

**R9/R10/R11/R11-delta additions**: (1) **app_engine_writer runtime (R9)**: dedicated LOGIN role + dedicated engine DSN/connection pool (`HRPARTNER_ENGINE_URL`); runtime test confirms `current_user='app_engine_writer'`; no SET ROLE assumption; pool/credential boundary verified via `pg_stat_activity`. (2) **membership/ownership lock (R11 P1-1+P1-2, R11-delta D2)**: `FOR LOOP` inside `DO $$` with cursor; `pg_auth_members` joined via `pg_roles` on `roleid=oid`; per-slice privilege allowlist (only RA grants revoked in Step 2; CBD grants survive re-run); `pg_namespace.nspowner` schema ownership check now includes `public`. (3) **link-capture + RETURNING (R9)**: SELECT policy permits `link-capture` so Prisma `INSERT ... RETURNING` works; LIVE test E-17 with exact Prisma statement. (4) **Canonical JSON K-08/K-09 alignment (R9)**: `1.0 ↔ 1` and `-0 ↔ 0` return `true` to match both `JSON.stringify` and PostgreSQL `jsonb` numeric semantics. (5) **`isJsonValue` with WeakSet cycle detection (R10 P1-1)**: rejects undefined, NaN, ±Infinity, Date, exotic objects, cycles; 10 rejection vectors K-11..K-20; WeakSet add-before-descend/delete-after-unwind pattern. (6) **N2-1 slice scope (R10 P1-3)**: N2-1 = RA grants/policies only; CBD grants deferred to N2-5. (7) **L-01..L-06 isolation (R11 P1-3+P1-4+P2-1, R11-delta D4+D5)**: L-02a is admin/bypass-RLS schema-only SQLSTATE 23502 test; L-02b positive in-team CBD INSERT; L-03 strengthened with current_user, rolsuper, schema/table privilege assertions and RLS-diagnostic on denial; L-05 uses `updatedAt` (mutable system column).

**R9/R10/R11/R11-delta P2 corrections**: (8) **COALESCE (R9)**: engine policies use `COALESCE(current_setting(..., true), '')` for absent-or-not-in-allowlist. (9) **Posture converge (R10)**: ALTER first, then post-assert; fail-loud on drift. (10) **jsonb parity (R11-delta D6)**: application validator runs first; DB `jsonb =` equality is secondary backup only; IEEE-754 / DOUBLE_PRECISION claim removed; numeric parity limited to two specific vectors (`1.0=1`, `-0=0`). (11) **Status sync (R9)**: `OPEN / FINAL_R11_DELTA_REQUIRED` in all 4 docs. (12) **Stale references (R11-delta D6)**: all R0-R9/R10 status text synced to R11. (13) **Privilege-survival LIVE (R11-delta D3)**: E-19 vector proves CBD grants survive N2-1 re-run via `has_table_privilege` assertions. (14) **Sequence revoke (R11-delta D1)**: blanket `ALL SEQUENCES` revoke removed; only exact sequences are revoked if needed.

**R8 prior**: CBD RLS scope; app_engine_writer executable contract; set_config(true) only; recursive canonical JSON.

**R7 prior**: CREATE/CORRECT split + ordering; RLS valid PostgreSQL; N2-1 RLS simplified; engine separate DB principal; Layer 1 / Layer 1b separation; matrix self-release removed.

**R6 prior**: branch sync; CREATE/CORRECT pseudocode split; RLS team-scope on both rows; ReferralAttribution DB contract complete; state diagram corrected; full-SHA evidence.

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

> **R7 correction:** `labor_profile_id` is REMOVED from Layer 1. Layer 1b is the **sole authority** for `labor_profile_id` write-once enforcement (NULL→value). Layer 1 and Layer 1b are separate triggers on different columns; Layer 1 does not override Layer 1b's permission.

```sql
CREATE FUNCTION referral_attributions_immutable_update()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referrer_user_id       IS DISTINCT FROM OLD.referrer_user_id       THEN RAISE EXCEPTION 'referrer_user_id is immutable';       END IF;
  IF NEW.affiliate_code_snapshot IS DISTINCT FROM OLD.affiliate_code_snapshot THEN RAISE EXCEPTION 'affiliate_code_snapshot is immutable'; END IF;
  IF NEW.first_clicked_at       IS DISTINCT FROM OLD.first_clicked_at       THEN RAISE EXCEPTION 'first_clicked_at is immutable';       END IF;
  IF NEW.expires_at             IS DISTINCT FROM OLD.expires_at             THEN RAISE EXCEPTION 'expires_at is immutable';             END IF;
  IF NEW.created_at             IS DISTINCT FROM OLD.created_at             THEN RAISE EXCEPTION 'created_at is immutable';             END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER referral_attributions_immutable_update_trg
  BEFORE UPDATE ON referral_attributions
  FOR EACH ROW EXECUTE FUNCTION referral_attributions_immutable_update();
```

**Layer 1b — Trigger BEFORE INSERT/UPDATE on `laborProfileId` (write-once NULL → value, R5):**

Enforces the `NULL → value` write-once transition. Layer 1b is the **sole authority** for this column.

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
      RETURN NEW;  -- NULL -> value: allowed exactly once
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

**LIVE test for write-once (R7 required):**

| Operation | Expected |
|---|---|
| INSERT with `labor_profile_id = NULL` | allowed |
| UPDATE: `NULL → value` | allowed (exactly once per attribution row) |
| UPDATE: `value → same value` | allowed (no-op, no trigger fires diff) |
| UPDATE: `value → other value` | **denied** (Layer 1b raises exception) |
| UPDATE: `value → NULL` | **denied** (Layer 1b raises exception) |

**Layer 1c — Trigger BEFORE UPDATE on lifecycle transitions (R6 strict — transition matrix):**

> **R6 addition:** Status enum membership alone (Layer 2 CHECK) does NOT prevent terminal-state resurrection. A trigger on UPDATE must enforce the allowed transition matrix.

Allowed transitions:

| From | To | Triggered by |
|---|---|---|
| `ACTIVE` | `CONSUMED` | consume command |
| `ACTIVE` | `EXPIRED` | TTL expiry command / scheduler |
| `ACTIVE` | `REVOKED` | admin revoke command |
| `ACTIVE` | `SUPERSEDED` | superseded by another attribution |
| `CONSUMED` | (terminal) | none |
| `EXPIRED` | (terminal) | none |
| `REVOKED` | (terminal) | none |
| `SUPERSEDED` | (terminal) | none |

Any other transition (including resurrection to `ACTIVE` from a terminal state) is rejected.

```sql
CREATE FUNCTION referral_attributions_lifecycle_transition()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  terminal_statuses CONSTANT TEXT[] := ARRAY['CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED'];
  allowed_next CONSTANT TEXT[] := ARRAY['CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED'];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Resurrection guard: terminal states cannot transition to anything else
    IF OLD.status = ANY(terminal_statuses) THEN
      RAISE EXCEPTION 'referral_attributions: terminal status % cannot transition to %', OLD.status, NEW.status;
    END IF;
    -- Allowed forward transitions from ACTIVE
    IF OLD.status = 'ACTIVE' AND NOT (NEW.status = ANY(allowed_next)) THEN
      RAISE EXCEPTION 'referral_attributions: status % can only transition to CONSUMED|EXPIRED|REVOKED|SUPERSEDED, got %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER referral_attributions_lifecycle_transition_trg
  BEFORE UPDATE ON referral_attributions
  FOR EACH ROW EXECUTE FUNCTION referral_attributions_lifecycle_transition();
```

**Layer 2 — CHECK constraints (current state, R5 clarified):**

CHECK constraints inspect **only the row's current values**. They do not enforce write-once or transition semantics — those are the triggers' job.

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

> **N2-1 RLS (R7):** ReferralAttribution RLS policies are defined in §2.6.3 under "ReferralAttribution (N2-1 RLS)". N2-1 policies are scoped to ADMIN/referrer own-view and the engine principal. Handler/team-scoped policies for `labor_profile_handling_assignments` and `hr_team_members` are additive RLS added by N2-4 (see N2-4 scope in §2.6.3).

**Team-scope rule recap (R6):** HR_MANAGER must satisfy team-scope for BOTH the old row (USING) AND the new row (WITH CHECK). HR_STAFF has SELECT only on assigned rows and NO INSERT/UPDATE on either referral table — the explicit `FALSE` in `WITH CHECK (FALSE)` for INSERT enforces this at the DB layer regardless of any upstream logic.

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

#### 2.5.4 Concurrency-safe write — CREATE / CORRECT split (R6 strict correction)

> **R6 strict:** CREATE and CORRECT are **separate commands** with **separate pseudocode**. CREATE never auto-supersedes; CORRECT never goes through CREATE's no-ACTIVE branch.

**Key for normalization (used in advisory lock + business-key lookup):**

```typescript
function normalizeKey(laborProfileId: string, assignmentId: string | null, milestone: string): string {
  // null-safe canonical tuple; delimiter must not appear in any UUID component
  return [laborProfileId, assignmentId ?? '__NONE__', milestone].join('\x1e');
}
```

**CREATE — three typed outcomes (no auto-supersede, no second ACTIVE insert):**

```typescript
type CreateOutcome =
  | { kind: 'CREATED'; decisionId: string }
  | { kind: 'IDEMPOTENT_REPLAY'; decisionId: string }   // exact-match ACTIVE already exists
  | { kind: 'CONFLICT_EXISTING_ACTIVE'; existing: { id: string; beneficiaryUserId: string; source: string; reason: string; evidence: unknown; handlingAssignmentId: string | null; decidedAt: Date; actorType: string; actorUserId: string | null } };

async function createBeneficiaryDecision(input: {
  laborProfileId: string;
  assignmentId: string | null;
  milestone: string;
  beneficiaryUserId: string;
  source: string;
  reason: string;
  evidence: unknown;
  handlingAssignmentId: string | null;
  decidedAt: Date;
  actorType: 'USER' | 'SYSTEM';
  actorUserId: string | null;
}): Promise<CreateOutcome> {
  return await prisma.$transaction(async (tx) => {
    // 1. ACQUIRE advisory lock (xact-scoped; released at COMMIT/ROLLBACK)
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${normalizeKey(input.laborProfileId, input.assignmentId, input.milestone)}, 0)
      )
    `;

    // 2. LOOKUP existing ACTIVE for business key
    const existing = await tx.commissionBeneficiaryDecision.findFirst({
      where: {
        laborProfileId: input.laborProfileId,
        assignmentId: input.assignmentId ?? null,
        milestone: input.milestone,
        status: 'ACTIVE',
      },
    });

    // 3a. No ACTIVE → INSERT new ACTIVE
    if (!existing) {
      const created = await tx.commissionBeneficiaryDecision.create({
        data: {
          laborProfileId: input.laborProfileId,
          assignmentId: input.assignmentId,
          handlingAssignmentId: input.handlingAssignmentId,
          beneficiaryUserId: input.beneficiaryUserId,
          source: input.source,
          reason: input.reason,
          evidence: input.evidence as object,
          decidedAt: input.decidedAt,
          milestone: input.milestone,
          status: 'ACTIVE',
          actorType: input.actorType,
          actorUserId: input.actorUserId,
          // supersededById intentionally omitted (default null)
        },
      });
      await tx.outbox.create({
        data: { type: 'BENEFICIARY_DECISION_CREATED', payload: { decisionId: created.id, ...input } },
      });
      return { kind: 'CREATED', decisionId: created.id };
    }

    // 3b. ACTIVE exists; compute exact-match across ALL authoritative immutable facts
    // Idempotency identity: business key already verified (lookup); command-defining fields
    // are: beneficiaryUserId, source, reason, evidence (canonical), handlingAssignmentId,
    // actorType, actorUserId.  decidedAt is NOT part of idempotency identity — the same
    // decision made at two different timestamps is still the same decision; the human/system
    // who decided at time T1 vs T2 with identical inputs is the same decision.
    // Canonical deep-equal for evidence: sort keys then JSON.stringify (no key-order variance).
    function isJsonValue(val: unknown, seen?: WeakSet<object>): boolean {
      // R10 strict: only JSON-value domain allowed:
      //   null | boolean | finite number | string | array<JSON> | plain object<JSON>
      // Reject: undefined, NaN, ±Infinity, Date, RegExp, Map, Set, Function,
      //         cyclic references, exotic prototypes.
      //
      // Cycle detection: uses a WeakSet passed by reference across the full
      // validation call stack. An object/array reference is added to `seen`
      // BEFORE recursing into its children. If a previously-visited reference
      // is encountered again, a cycle exists → throw TypeError (contract K-15).
      //
      // WeakSet is used (not Set) so that once an object becomes unreachable
      // from the root it can be garbage-collected. The shared `seen` set is
      // created once at the public entry point and passed by reference through
      // all recursive calls.

      if (val === null) return true;
      const t = typeof val;
      if (t === 'boolean' || t === 'string') return true;
      if (t === 'number') return Number.isFinite(val); // rejects NaN, ±Infinity
      if (Array.isArray(val)) {
        // Arrays are objects (typeof === 'object'). Add to seen BEFORE recursing.
        if (!seen) seen = new WeakSet<object>();
        if (seen.has(val)) {
          throw new TypeError('canonicalJson: input contains a cycle (array)');
        }
        seen.add(val);
        for (let i = 0; i < val.length; i++) {
          if (!isJsonValue(val[i], seen)) return false;
        }
        seen.delete(val); // unwind: allow sibling subtrees to revisit this ref
        return true;
      }
      if (t === 'object') {
        // Plain object: getPrototypeOf must be Object.prototype or null.
        const proto = Object.getPrototypeOf(val);
        if (proto !== Object.prototype && proto !== null) return false;
        if (!seen) seen = new WeakSet<object>();
        if (seen.has(val)) {
          throw new TypeError('canonicalJson: input contains a cycle (object)');
        }
        seen.add(val);
        const keys = Object.keys(val as Record<string, unknown>);
        for (let i = 0; i < keys.length; i++) {
          if (!isJsonValue((val as Record<string, unknown>)[keys[i]], seen)) {
            seen.delete(val); // unwind on early exit
            return false;
          }
        }
        seen.delete(val); // unwind: allow sibling subtrees to revisit this ref
        return true;
      }
      return false; // undefined, function, symbol, bigint, exotic objects
    }

    function canonicalJson(val: unknown): string {
      // R10: validate input is a JSON-value domain object. Reject otherwise.
      // This guarantees canonicalJson and PostgreSQL jsonb agree on the
      // representation (both reject undefined/NaN/±Infinity; both treat
      // 1.0 == 1 and -0 == 0 at numeric level).
      if (!isJsonValue(val)) {
        throw new TypeError(
          'canonicalJson: input is not a valid JSON value. ' +
          'Rejected: undefined, NaN, ±Infinity, Date, exotic objects, cycles.'
        );
      }
      if (val === null) return 'null';
      if (typeof val === 'number') {
        // Number.isFinite already guaranteed finite. JSON.stringify normalizes
        // 1.0 vs 1 and -0 vs 0 to the same serialization (both align with
        // PostgreSQL jsonb numeric equality).
        return JSON.stringify(val);
      }
      if (typeof val === 'string' || typeof val === 'boolean') return JSON.stringify(val);
      if (Array.isArray(val)) {
        // Arrays: preserve order; recurse on each element.
        return '[' + val.map((item) => canonicalJson(item)).join(',') + ']';
      }
      // Plain object: sort keys lexicographically, recurse on each value.
      const keys = Object.keys(val as Record<string, unknown>).sort();
      return (
        '{' +
        keys
          .map((k) => JSON.stringify(k) + ':' + canonicalJson((val as Record<string, unknown>)[k]))
          .join(',') +
        '}'
      );
    }

    const exactMatch =
      existing.beneficiaryUserId === input.beneficiaryUserId &&
      existing.source === input.source &&
      existing.reason === input.reason &&
      canonicalJson(existing.evidence) === canonicalJson(input.evidence) &&
      existing.handlingAssignmentId === input.handlingAssignmentId &&
      existing.actorType === input.actorType &&
      existing.actorUserId === input.actorUserId;

    if (exactMatch) {
      // IDEMPOTENT REPLAY — caller asked the same question; we return the existing row
      return { kind: 'IDEMPOTENT_REPLAY', decisionId: existing.id };
    }

    // 3c. NON-MATCHING ACTIVE — DO NOT INSERT, DO NOT AUTO-SUPERSEDE
    // The caller must use CORRECT (or surface to human review). CREATE does not collide
    // and does not invent a second ACTIVE row — that would violate the partial-unique invariant.
    return {
      kind: 'CONFLICT_EXISTING_ACTIVE',
      existing: {
        id: existing.id,
        beneficiaryUserId: existing.beneficiaryUserId,
        source: existing.source,
        reason: existing.reason,
        evidence: existing.evidence,
        handlingAssignmentId: existing.handlingAssignmentId,
        decidedAt: existing.decidedAt,
        actorType: existing.actorType,
        actorUserId: existing.actorUserId,
      },
    };
  });
}
```

**CORRECT — only reachable path to replace an ACTIVE (separate command):**

```typescript
type CorrectOutcome =
  | { kind: 'CORRECTED'; oldDecisionId: string; newDecisionId: string }
  | { kind: 'NO_ACTIVE'; reason: 'no ACTIVE exists for business key — use CREATE first' };

async function correctBeneficiaryDecision(input: {
  laborProfileId: string;
  assignmentId: string | null;
  milestone: string;
  newBeneficiaryUserId: string;
  newSource: string;
  newReason: string;
  newEvidence: unknown;
  newHandlingAssignmentId: string | null;
  decidedAt: Date;
  actorType: 'USER' | 'SYSTEM';
  actorUserId: string | null;
}): Promise<CorrectOutcome> {
  return await prisma.$transaction(async (tx) => {
    // 1. ACQUIRE advisory lock
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${normalizeKey(input.laborProfileId, input.assignmentId, input.milestone)}, 0)
      )
    `;

    // 2. LOOKUP old ACTIVE
    const oldActive = await tx.commissionBeneficiaryDecision.findFirst({
      where: {
        laborProfileId: input.laborProfileId,
        assignmentId: input.assignmentId ?? null,
        milestone: input.milestone,
        status: 'ACTIVE',
      },
    });

    if (!oldActive) {
      // No auto-create fallback. Caller must invoke CREATE first (or surface to human).
      return { kind: 'NO_ACTIVE', reason: 'no ACTIVE exists for business key — use CREATE first' };
    }

    // 3. UPDATE old ACTIVE → SUPERSEDED (before inserting replacement to keep partial-unique invariant)
    await tx.commissionBeneficiaryDecision.update({
      where: { id: oldActive.id },
      data: { status: 'SUPERSEDED' },
    });

    // 4. INSERT replacement ACTIVE (partial unique index now satisfied — old ACTIVE is gone)
    const replacement = await tx.commissionBeneficiaryDecision.create({
      data: {
        laborProfileId: input.laborProfileId,
        assignmentId: input.assignmentId,
        handlingAssignmentId: input.newHandlingAssignmentId,
        beneficiaryUserId: input.newBeneficiaryUserId,
        source: input.newSource,
        reason: input.newReason,
        evidence: input.newEvidence as object,
        decidedAt: input.decidedAt,
        milestone: input.milestone,
        status: 'ACTIVE',
        actorType: input.actorType,
        actorUserId: input.actorUserId,
      },
    });

    // 5. SET forward link on the SUPERSEDED row
    //    supersededById is mutable; SUPERSEDED is a terminal state so this link
    //    is set once and never changes.
    await tx.commissionBeneficiaryDecision.update({
      where: { id: oldActive.id },
      data: { supersededById: replacement.id },
    });

    // 6. Audit events
    await tx.outbox.create({
      data: { type: 'BENEFICIARY_DECISION_CORRECTED', payload: { oldDecisionId: oldActive.id, newDecisionId: replacement.id, ...input } },
    });
    await tx.outbox.create({
      data: { type: 'BENEFICIARY_DECISION_CREATED', payload: { decisionId: replacement.id, milestone: input.milestone } },
    });

    return { kind: 'CORRECTED', oldDecisionId: oldActive.id, newDecisionId: replacement.id };
  });
}
```

**Property checklist (DB-level invariant remains authority):**

- The partial unique `cbd_active_uniq` is the authority; the advisory lock only reduces contention.
- CREATE's `CONFLICT_EXISTING_ACTIVE` is a typed error to the caller — the API layer maps it to HTTP 409 REQUIRE_CORRECT and surfaces the existing row snapshot.
- CORRECT's `NO_ACTIVE` is a typed error — HTTP 409 REQUIRE_CREATE.
- REVERSE and REDECIDE_AFTER_REVERSAL follow the same lock + lookup + INSERT/UPDATE pattern (separate functions, not shown here but explicitly listed in §2.5.5).

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

**Transition state machine (R6 strict — no forbidden transitions drawn):**

```
                       CREATE (no ACTIVE)
                          |
                          v
   +----[forbidden transitions not drawn]----+
   |                                        |
   v                                        |
 ACTIVE ----CORRECT----> SUPERSEDED          |
   |                      (terminal)        |
   |                                       |
   ----REVERSE----> REVERSED                |
                     (terminal)            |
                          |                 |
                          | REDECIDE_AFTER_REVERSAL
                          | (NOT a transition from REVERSED — this is INSERT of a NEW row;
                          |  the old REVERSED row remains REVERSED, unchanged)
                          v
                       NEW ACTIVE  (separate row, new id)
```

**Critical R6 clarification:** REVERSED does NOT transition to ACTIVE. There is no UPDATE on a REVERSED row that flips its status. REDECIDE_AFTER_REVERSAL creates a separate ACTIVE row; the REVERSED row is untouched and stays terminal.

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

#### 2.6.3 RLS Matrix (R7 strict — valid PostgreSQL syntax, N2-1 simplified, engine properly scoped)

> **PostgreSQL RLS syntax rule (R7+R8):**
> - Policy expressions (USING and WITH CHECK) do NOT use `NEW.` or `OLD.` prefixes (R7 fix).
> - Bare column names in a correlated subquery may resolve to the nearest match; for column
>   names also used in the subquery's referenced table, **qualify with the outer table name**
>   to avoid self-comparison. Example: `WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id`,
>   NOT `WHERE lha.labor_profile_id = labor_profile_id` (R8 fix).
> - `WITH CHECK` evaluates the final values of the row being inserted/updated; `USING`
>   evaluates the existing row for SELECT/DELETE and the old row for UPDATE.
>
> **N2-1 RLS simplification (R7):** N2-1 migration must NOT reference tables that don't exist yet. `labor_profile_handling_assignments` (N2-4) and `hr_team_members` (N2-4) are not available at N2-1 time. N2-1 policies are scoped only to the referral attribution's own data and the engine principal.
>
> **System engine DB principal (R7):** `app_engine_writer` is a separate Postgres role. It has NO `BYPASSRLS` attribute and is NOT a table owner. It has explicit `INSERT`/`UPDATE` policies `TO app_engine_writer`. Each policy uses `current_setting('hrp.engine_context', true)` to gate specific operations. `DELETE` privilege is not granted; no DELETE policy exists. Transactions set the context via `set_config('hrp.engine_context', '...', true)` (session-level, not LOCAL). Context absent or invalid = denied. LIVE tests verify role attributes, grants, and context absent/invalid/valid.

```sql
-- ============================================================
-- ReferralAttribution (N2-1 RLS — no external table dependencies)
-- ============================================================
-- N2-1 creates this table. At N2-1 time, labor_profile_handling_assignments
-- and hr_team_members do not exist yet. Policies are scoped to the attribution
-- row itself and the engine principal only.

ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions FORCE ROW LEVEL SECURITY;

-- SELECT: ADMIN, or referrer sees own attributions
CREATE POLICY hrp_ra_select ON referral_attributions
  AS PERMISSIVE FOR SELECT TO app_user
  USING (
    hrp_session_role() = 'ADMIN'
    OR referrer_user_id = hrp_session_user_id()
  );

-- INSERT (N2-1): engine principal only — no human role can insert attributions directly.
-- The public capture path goes through N2-2 link-capture service, which runs as app_engine_writer.
CREATE POLICY hrp_ra_insert ON referral_attributions
  AS PERMISSIVE FOR INSERT TO app_engine_writer
  WITH CHECK (
    -- Context must be set to one of the allowed engine operation names
    current_setting('hrp.engine_context', true) IN ('link-capture', 'consume', 'milestone')
  );

-- UPDATE: ADMIN only — lifecycle transitions are admin commands
CREATE POLICY hrp_ra_update ON referral_attributions
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    hrp_session_role() = 'ADMIN'
  )
  WITH CHECK (
    hrp_session_role() = 'ADMIN'
  );

-- No DELETE policy => default-deny DELETE under FORCE RLS

-- ============================================================
-- LaborProfileHandlingAssignment (N2-4 RLS — N2-1 NOT available)
-- ============================================================
-- N2-4 creates this table. hr_team_members must be created by N2-4 or sourced
-- from an existing table owned by N2-4's migration.
-- The team-membership source is an N2-4 decision (not assumed to exist).

ALTER TABLE labor_profile_handling_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_handling_assignments FORCE ROW LEVEL SECURITY;

-- SELECT: ADMIN, HR_MANAGER (team scope via hr_team_members), HR_STAFF (own rows)
CREATE POLICY hrp_lha_select ON labor_profile_handling_assignments
  AS PERMISSIVE FOR SELECT TO app_user
  USING (
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM hr_team_members m
        WHERE m.manager_id = hrp_session_user_id()
          AND m.member_user_id = labor_profile_handling_assignments.assignee_user_id
      )
    )
    OR (
      hrp_session_role() = 'HR_STAFF'
      AND labor_profile_handling_assignments.assignee_user_id = hrp_session_user_id()
    )
  );

-- INSERT: HR_MANAGER team-scope on the resulting row (assignee must be in manager's team)
CREATE POLICY hrp_lha_insert ON labor_profile_handling_assignments
  AS PERMISSIVE FOR INSERT TO app_user_writer
  WITH CHECK (
    -- PostgreSQL: WITH CHECK evaluates proposed row's column values directly (no NEW. prefix)
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM hr_team_members m
        WHERE m.manager_id = hrp_session_user_id()
          AND m.member_user_id = assignee_user_id
      )
    )
  );

-- UPDATE: HR_MANAGER team-scope on BOTH old (USING) and new (WITH CHECK) rows
CREATE POLICY hrp_lha_update ON labor_profile_handling_assignments
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    -- USING evaluates the existing (OLD) row's assignee
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM hr_team_members m
        WHERE m.manager_id = hrp_session_user_id()
          AND m.member_user_id = labor_profile_handling_assignments.assignee_user_id
      )
    )
  )
  WITH CHECK (
    -- WITH CHECK evaluates the resulting (NEW) row's assignee
    -- Manager cannot reassign out-of-team (assignee must stay in team)
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM hr_team_members m
        WHERE m.manager_id = hrp_session_user_id()
          AND m.member_user_id = assignee_user_id
      )
    )
  );

-- No DELETE policy => default-deny DELETE under FORCE RLS

-- ============================================================
-- CommissionBeneficiaryDecision (N2-5 RLS — depends on N2-4)
-- ============================================================
-- labor_profile_handling_assignments (N2-4) must exist before this migration runs.

ALTER TABLE commission_beneficiary_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_beneficiary_decisions FORCE ROW LEVEL SECURITY;

-- SELECT: ADMIN, HR_MANAGER (team scope), HR_STAFF (assigned), beneficiary (own decision)
CREATE POLICY hrp_cbd_select ON commission_beneficiary_decisions
  AS PERMISSIVE FOR SELECT TO app_user
  USING (
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM labor_profile_handling_assignments lha
        WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
          AND EXISTS (
            SELECT 1 FROM hr_team_members m
            WHERE m.manager_id = hrp_session_user_id()
              AND m.member_user_id = lha.assignee_user_id
          )
      )
    )
    OR commission_beneficiary_decisions.beneficiary_user_id = hrp_session_user_id()
    OR (
      hrp_session_role() = 'HR_STAFF'
      AND EXISTS (
        SELECT 1 FROM labor_profile_handling_assignments lha
        WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
          AND lha.assignee_user_id = hrp_session_user_id()
      )
    )
  );

-- INSERT: HR_MANAGER team-scope (labor_profile must be handled by manager's team)
CREATE POLICY hrp_cbd_insert ON commission_beneficiary_decisions
  AS PERMISSIVE FOR INSERT TO app_user_writer
  WITH CHECK (
    -- PostgreSQL: WITH CHECK evaluates the proposed row's column values directly.
    -- The bare column name 'labor_profile_id' in the EXISTS subquery would resolve
    -- to the nearest match in scope; qualify with the outer table name to avoid
    -- self-comparison (R8 fix).
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM labor_profile_handling_assignments lha
        WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
          AND EXISTS (
            SELECT 1 FROM hr_team_members m
            WHERE m.manager_id = hrp_session_user_id()
              AND m.member_user_id = lha.assignee_user_id
          )
      )
    )
  );

-- UPDATE: HR_MANAGER team-scope on BOTH old (USING) and new (WITH CHECK) rows; HR_STAFF denied
CREATE POLICY hrp_cbd_update ON commission_beneficiary_decisions
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    -- USING evaluates the existing row's labor_profile_id (OLD row)
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM labor_profile_handling_assignments lha
        WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
          AND EXISTS (
            SELECT 1 FROM hr_team_members m
            WHERE m.manager_id = hrp_session_user_id()
              AND m.member_user_id = lha.assignee_user_id
          )
      )
    )
  )
  WITH CHECK (
    -- WITH CHECK evaluates the resulting row's labor_profile_id (NEW row).
    -- Qualify with outer table to avoid self-comparison (R8 fix).
    hrp_session_role() = 'ADMIN'
    OR (
      hrp_session_role() = 'HR_MANAGER'
      AND EXISTS (
        SELECT 1 FROM labor_profile_handling_assignments lha
        WHERE lha.labor_profile_id = commission_beneficiary_decisions.labor_profile_id
          AND EXISTS (
            SELECT 1 FROM hr_team_members m
            WHERE m.manager_id = hrp_session_user_id()
              AND m.member_user_id = lha.assignee_user_id
          )
      )
    )
  );

-- No DELETE policy => default-deny DELETE under FORCE RLS

-- ============================================================
-- System engine DB principal — executable contract (R9 — dedicated connection)
-- ============================================================
-- The engine uses a DEDICATED Postgres role with direct LOGIN capability.
-- The engine does NOT assume SET ROLE from app_user_writer (forbidden by current
-- session backend policy). Instead, the engine connects with its own DSN and
-- PgPool/pgBouncer is configured with TWO pools:
--   - HRPARTNER_PRIMARY_URL — used by app_user_writer (human role path)
--   - HRPARTNER_ENGINE_URL   — used ONLY by the engine; connects as
--                              app_engine_writer with its own secret
-- The engine pool has no SET ROLE capability and no INHERIT to app_user_writer.

-- PROVISIONING (R9 — idempotent + posture converge; FAIL-LOUD if forced role
-- attributes don't match the contract).
DO $$
DECLARE
  r pg_roles%ROWTYPE;
BEGIN
  -- Step 1: create role if absent (LOGIN with empty password; secret is set
  -- out-of-band by ops, not in this migration). NOINHERIT, NOSUPERUSER,
  -- NOBYPASSRLS are explicit at CREATE TIME.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_engine_writer') THEN
    CREATE ROLE app_engine_writer LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
  END IF;
END
$$;

-- STEP 2: REVOKE unexpected memberships and table ownership (R11 P1-1 + P1-2).
-- NOINHERIT only prevents automatic privilege inheritance; it does NOT revoke
-- existing memberships or remove ownership. Both must be revoked explicitly.
--
-- PER-SLICE PRIVILEGE MODEL (R11 P1-2 fix):
--   - This block (Step 2) only revokes grants on the tables that N2-1 owns:
--     referral_attributions. It does NOT touch commission_beneficiary_decisions.
--   - CBD grants (added by N2-5) survive a re-run of the N2-1 provisioning block.
--   - This approach is idempotent per slice: re-running Step 2 only affects RA grants.
--   - The post-assert (Step 4) checks role attributes + memberships + schema/table
--     ownership only. It does NOT claim a "full grant scan". N2-5 privilege
--     survival is proven by the dedicated E-19 LIVE vector (see below).
--
-- Revoke all direct grants on referral_attributions only (N2-1 scope):
REVOKE ALL PRIVILEGES ON referral_attributions FROM app_engine_writer;
-- (R11 delta D1 fix: removed blanket ALL SEQUENCES revoke. RA uses UUID primary
-- keys, so no application sequence is needed. CBD sequences are owned by N2-5
-- and not touched here. If a future N2-1 migration introduces a sequence, it
-- must be revoked by exact name.)

-- Revoke unexpected memberships (must be inside a DO $$ block — FOR LOOP is not
-- valid at top-level SQL; also pg_auth_members has no direct role_name column):
DO $$
DECLARE
  -- m.roleid is the OID of the granted role; join to pg_roles to get its name
  membership_role_text TEXT;
  membership_cur CURSOR FOR
    SELECT gr.rolname::TEXT AS granted_role_name
    FROM pg_auth_members m
    JOIN pg_roles gr ON gr.oid = m.roleid
    WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
      AND gr.rolname != 'app_engine_writer'; -- exclude harmless self-membership
BEGIN
  OPEN membership_cur;
  LOOP
    FETCH membership_cur INTO membership_role_text;
    EXIT WHEN NOT FOUND;
    EXECUTE format('REVOKE %I FROM app_engine_writer', membership_role_text);
  END LOOP;
  CLOSE membership_cur;
END
$$;

-- STEP 3: CONVERGE role attributes (idempotent; ALTER with same value is no-op).
-- MUST run BEFORE the post-assert (P2-1 fix: assert-after not assert-before).
ALTER ROLE app_engine_writer NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION;

-- STEP 4: POST-ASSERT — fail-loud if any contract attribute is violated (R10 P2-1).
-- Runs AFTER ALTER so it catches external drift that ALTER did not fix.
-- Also detects if a re-run of N2-1 accidentally removed N2-5 CBD grants.
DO $$
DECLARE
  r pg_roles%ROWTYPE;
  unexpected_members TEXT;
  unexpected_owned_schemas TEXT;
  unexpected_owned_objects TEXT;
BEGIN
  SELECT * INTO r FROM pg_roles WHERE rolname = 'app_engine_writer';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer role missing after provisioning';
  END IF;

  -- Attribute assertions
  IF r.rolcanlogin = false THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must be LOGIN (found NOLOGIN)';
  END IF;
  IF r.rolsuper = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT be SUPERUSER';
  END IF;
  IF r.rolbypassrls = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT be BYPASSRLS';
  END IF;
  IF r.rolinherit = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT INHERIT';
  END IF;
  IF r.rolreplication = true THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must NOT be REPLICATION';
  END IF;

  -- Membership assertions (R11 P1-1 fix): engine must have ZERO unexpected memberships.
  -- pg_auth_members has NO role_name column; must JOIN pg_roles on roleid=oid (R11 P1-1).
  SELECT string_agg(gr.rolname::TEXT, ', ' ORDER BY gr.rolname)
  INTO unexpected_members
  FROM pg_auth_members m
  JOIN pg_roles gr ON gr.oid = m.roleid
  WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
    AND gr.rolname != 'app_engine_writer';
  IF unexpected_members IS NOT NULL THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer has unexpected memberships: %', unexpected_members;
  END IF;

  -- Schema ownership assertions (R11 delta D2 fix): engine must own ZERO
  -- application schemas. Only system schemas are excluded: `information_schema`
  -- and any `pg_%` catalog schema (matched via `nspname NOT LIKE 'pg_%'`).
  -- `public` is now checked — the engine must NOT own `public` either.
  SELECT string_agg(nspname, ', ' ORDER BY nspname)
  INTO unexpected_owned_schemas
  FROM pg_namespace
  WHERE nspowner = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
    AND nspname <> 'information_schema'
    AND nspname NOT LIKE 'pg_%';
  IF unexpected_owned_schemas IS NOT NULL THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must not own application schemas: %', unexpected_owned_schemas;
  END IF;

  -- Table and sequence ownership assertions (R10 P1-2, R11 P1-2 fix):
  -- engine must own ZERO non-system application tables/sequences.
  -- `public` schema is included — engine must NOT own application objects there.
  SELECT string_agg(nspname || '.' || relname, ', ' ORDER BY nspname, relname)
  INTO unexpected_owned_objects
  FROM (
    SELECT c.relnamespace::regnamespace::text AS nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relowner = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
      AND n.nspname <> 'information_schema'
      AND n.nspname NOT LIKE 'pg_%'
  ) t;
  IF unexpected_owned_objects IS NOT NULL THEN
    RAISE EXCEPTION 'engine contract: app_engine_writer must not own any application objects: %', unexpected_owned_objects;
  END IF;
END
$$;

-- Assert expected attributes (R10 LIVE tests E-01/E-14 confirm this):
-- SELECT rolname, rolsuper, rolbypassrls, rolcanlogin, rolinherit, rolreplication
-- FROM pg_roles WHERE rolname = 'app_engine_writer';
-- Expected: rolcanlogin=true, rolsuper=false, rolbypassrls=false,
--          rolinherit=false, rolreplication=false.

-- STEP 5: N2-1 SLICE SCOPE — least-privilege grants for referral_attributions ONLY (R10 P1-3).
-- CBD grants are deferred to N2-5 (CBD table does not exist in N2-1).
-- The engine does NOT inherit from app_user_writer (NOINHERIT set above).
GRANT USAGE ON SCHEMA public TO app_engine_writer;
GRANT SELECT, INSERT, UPDATE ON referral_attributions TO app_engine_writer;
-- EXPLICITLY REVOKE DELETE (no DELETE privilege for the engine):
REVOKE DELETE ON referral_attributions FROM app_engine_writer;

-- CBD grants and policies are deferred to N2-5 (R10 P1-3):
--   GRANT SELECT, INSERT, UPDATE ON commission_beneficiary_decisions TO app_engine_writer;
--   CREATE POLICY hrp_cbd_select_engine ...
--   CREATE POLICY hrp_cbd_insert_engine ...
--   CREATE POLICY hrp_cbd_update_engine ...
--   REVOKE DELETE ON commission_beneficiary_decisions FROM app_engine_writer;

-- SELECT policy for engine consume flow (R8 addition — necessary for engine
-- to read rows before/after INSERT/UPDATE within the same transaction):
CREATE POLICY hrp_ra_select_engine ON referral_attributions
  AS PERMISSIVE FOR SELECT TO app_engine_writer
  USING (
    -- Engine reads rows that match the current operation context.
    -- R9 addition: include 'link-capture' so Prisma's INSERT...RETURNING and
    -- subsequent SELECT within the same transaction both work. PostgreSQL
    -- applies SELECT RLS even on RETURNING clauses, so the SELECT policy must
    -- permit the link-capture context or the engine cannot read back the
    -- row it just inserted.
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('link-capture', 'consume', 'milestone')
  );

-- Engine INSERT policy (context gate):
CREATE POLICY hrp_ra_insert_engine ON referral_attributions
  AS PERMISSIVE FOR INSERT TO app_engine_writer
  WITH CHECK (
    -- COALESCE handles two failure modes:
    --   1. current_setting(name, true) returns NULL when setting has never
    --      been set in this session (parameter missing_ok=true default).
    --   2. After ROLLBACK or COMMIT the GUC resets to empty string.
    -- The COALESCE pattern enforces "absent OR not in allowlist" semantics.
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('link-capture', 'consume', 'milestone')
  );

-- Engine UPDATE policy (context gate, transition triggers + RLS both enforced):
CREATE POLICY hrp_ra_update_engine ON referral_attributions
  AS PERMISSIVE FOR UPDATE TO app_engine_writer
  USING (
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('consume', 'milestone')
  )
  WITH CHECK (
    COALESCE(current_setting('hrp.engine_context', true), '') IN
      ('consume', 'milestone')
  );

-- CBD grants and policies are deferred to N2-5 (R10 P1-3):

-- No DELETE policy for app_engine_writer. DELETE privilege was REVOKEd above.
-- No DELETE policy under FORCE RLS => default-deny DELETE for ALL roles.

-- ============================================================
-- set_config semantics (R8 strict)
-- ============================================================
-- set_config(setting_name, new_value, is_local):
--   is_local = false -> session-scoped (persists across transactions)
--   is_local = true  -> transaction-local (cleared at COMMIT or ROLLBACK)
--
-- The engine MUST use is_local = true so that context is cleared at COMMIT
-- and never leaks to the next transaction that reuses the pooled connection.
-- is_local = false is FORBIDDEN for engine operations; session-level context
-- would leak across COMMIT boundaries in a connection pool.
--
-- APPLICATION CALL (TxScope or before the operation):
--   await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'link-capture', true)`;
--   await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'consume', true)`;
--   await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'milestone', true)`;
--
-- LIVE tests must assert (R8):
--   1. After COMMIT: SELECT current_setting('hrp.engine_context', true)
--      from a NEW transaction returns '' (cleared)
--   2. After ROLLBACK: same — cleared
--   3. Pooled-connection reuse: open tx1 (set context), COMMIT, open tx2 on
--      same connection: current_setting returns '' (no leak)
--   4. set_config(..., false) is rejected by application layer (lint rule);
--      only set_config(..., true) is allowed in engine code paths
```

#### 2.6.4 LIVE RLS matrix tests (R6 — extended per table)

> **R6 requirement:** The RLS policies above MUST be exercised by an explicit LIVE matrix test on a real Postgres instance. The matrix is split per table.

**`labor_profile_handling_assignments`:**

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
| HR_MANAGER (team) | INSERT own-team assignee | allowed |
| HR_MANAGER (out-of-team) | INSERT assignee outside team | denied (WITH CHECK) |
| HR_MANAGER (team, transfer) | UPDATE result-row assignee outside team | denied (WITH CHECK) |
| HR_MANAGER (team, transfer) | UPDATE result-row assignee inside team | allowed |

**`commission_beneficiary_decisions`:**

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
| HR_MANAGER (team) | INSERT/UPDATE own-team labor_profile_id | allowed |
| HR_MANAGER (out-of-team) | INSERT/UPDATE labor_profile_id outside team | denied (WITH CHECK on NEW row) |
| beneficiary | SELECT own decision | allowed |
| beneficiary | UPDATE own decision | denied (no UPDATE policy for self) |

**`commission_beneficiary_decisions` — R9 P2 INSERT/WITH CHECK isolation tests:**

The single cross-profile UPDATE test in §2.6.4 above only hits the USING clause
on the OLD row. To isolate the WITH CHECK clause, R9 adds these targeted tests:

| # | Test scenario | Expected | Layer that denies |
|---|---|---|---|
| L-01 | HR_MANAGER (team) INSERTs a NEW CBD row with `labor_profile_id` of out-of-team profile | **denied** | CBD INSERT WITH CHECK |
| L-02a | Direct SQL `INSERT ... (labor_profile_id = NULL)` executed by **test-admin / table-owner** in the dedicated integration test DB, BYPASSING RLS (e.g. via `SET LOCAL row_security = OFF` in the same transaction). | **rejected with SQLSTATE `23502`** (NOT NULL violation). | PostgreSQL NOT NULL table constraint — schema layer. **This is NOT an RLS test.** RLS is intentionally bypassed here to isolate the schema constraint. |
| L-02b | Positive control: HR_MANAGER (team) INSERTs a NEW CBD row with valid `labor_profile_id` matching in-team profile | **allowed** | CBD INSERT WITH CHECK (passes — in-team) |
| L-03 | HR_MANAGER (team) UPDATE on a CBD row attached to profile P1 (in-team), changing `labor_profile_id` to P2 (out-of-team); uses a dedicated integration test DB (not the migration target); executed under table-owner/admin who can disable the specific immutable trigger; `SET LOCAL ROLE app_user_writer` switches to the **human writer principal** (test-only exception — not a runtime path); HR_MANAGER GUC is set transaction-locally. Before UPDATE: `assert current_user = 'app_user_writer'`, `assert rolsuper = false`, `assert has_schema_privilege('app_user_writer', 'public', 'USAGE') = true`, `assert has_table_privilege('app_user_writer', 'commission_beneficiary_decisions', 'UPDATE') = true`, `assert OLD P1 row visible under HR_MANAGER context` (USING policy passes for OLD row). UPDATE attempts to set `labor_profile_id = P2`. | **denied with SQLSTATE `42501` AND ERROR MESSAGE containing new-row RLS policy violation on CBD** (e.g. `new row violates row-level security policy for table "commission_beneficiary_decisions"`) | CBD UPDATE WITH CHECK — confirmed by SQLSTATE + diagnostic (R11 delta D5 fix: SQLSTATE 42501 alone is insufficient — it could also indicate a privilege gap; the diagnostic must point to new-row RLS) |
| L-04 | Same as L-03 with the immutable trigger **enabled** (full system, non-superuser, same transaction flow) | **denied** | CBD UPDATE WITH CHECK OR immutable trigger (full stack denial; L-03 isolates WITH CHECK) |
| L-05 | HR_MANAGER (team) UPDATE to change `updatedAt` to `NOW()` (a mutable system column, no-op update); the OLD row's `labor_profile_id` is in-team; immutable columns (`beneficiaryUserId`, `source`, `reason`, `actorType`, `actorUserId`) are unchanged | **allowed** | n/a (mutable column only; no immutable trigger conflict; no RLS denial — in-team) |
| L-06 | HR_MANAGER (team) INSERT a NEW CBD row attached to profile P2 (out-of-team); verify INSERT WITH CHECK denies before the partial unique index is consulted | **denied before index** | CBD INSERT WITH CHECK |

> **R11 delta D5 isolation note for L-03:** `app_user_writer` is the **human writer principal** (not the engine role). SQLSTATE `42501` alone is insufficient evidence — it can also indicate missing schema/table privilege. Before the UPDATE, the test asserts: (a) `current_user = 'app_user_writer'`, (b) `rolsuper = false`, (c) `has_schema_privilege('app_user_writer', 'public', 'USAGE') = true`, (d) `has_table_privilege('app_user_writer', 'commission_beneficiary_decisions', 'UPDATE') = true`, (e) OLD P1 row is visible under HR_MANAGER context (USING policy passes). The UPDATE then attempts to set `labor_profile_id = P2`; the test asserts SQLSTATE `42501` AND an error message that contains the new-row RLS policy violation string on `commission_beneficiary_decisions`. This proves the denial is the new-row RLS WITH CHECK, not a privilege gap. `SET LOCAL ROLE app_user_writer` is a **test-only exception** — not a real runtime path; the engine always connects via `HRPARTNER_ENGINE_URL`.
>
> **R11 delta D4 isolation note for L-02a:** L-02a runs under test-admin / table-owner in the dedicated integration test DB, **explicitly bypassing RLS** (`SET LOCAL row_security = OFF`) so the test isolates the schema-layer NOT NULL constraint. SQLSTATE `23502` is the expected rejection. L-02a is **explicitly NOT an RLS test**; it confirms the schema rejects NULL before RLS is even consulted. L-02b provides the positive RLS control that CBD INSERT WITH CHECK correctly allows valid in-team rows.
>
> **R11 P1-3 isolation note for L-03:** Blanket `DISABLE TRIGGER ALL` requires superuser and bypasses all RLS — it tests nothing. L-03 uses the **exact immutable trigger name** (e.g. `hrp_cbd_immutable_layer1` — the actual name assigned by the N2-5 migration). Only the table owner or a superuser can `DISABLE TRIGGER`. In the dedicated integration test DB, the test runs as table-owner/admin, disables the **named** trigger (not `ALL`), then switches to `app_user_writer` via `SET LOCAL ROLE` to execute the UPDATE under the human writer principal's RLS context.
>
> **R11 P1-4 isolation note for L-05:** The CBD schema does not contain `outcomeNote`. L-05 uses `updatedAt` (a mutable system column — typically `updated_at` with `DEFAULT now()` or `ON UPDATE`). This is truly mutable: no immutable trigger fires, and the UPDATE is allowed by RLS (in-team). As an alternative, a valid lifecycle transition (e.g. `ACTIVE -> SUPERSEDED` if the CBD is in `ACTIVE` state) is also a legitimate mutable path with appropriate fixtures.

**`referral_attributions` (N2-1 RLS simplified — R7):**

| Role / Principal | Action | Expected result |
|---|---|---|
| ADMIN | SELECT all rows | allowed |
| referrer_user | SELECT own attributions | allowed |
| any human role | INSERT attribution | **DENIED** — no INSERT policy TO app_user_writer |
| app_engine_writer (valid context) | INSERT attribution (link-capture) | allowed (current_setting IN ('link-capture', ...)) |
| app_engine_writer (context absent) | INSERT attribution | **DENIED** (current_setting returns '') |
| app_engine_writer (invalid context) | INSERT attribution | **DENIED** (not in allowed list) |
| ADMIN | UPDATE attribution (lifecycle transition) | allowed |
| HR_MANAGER | UPDATE attribution | **DENIED** — N2-1 UPDATE is ADMIN only (handler/team policies added by N2-4) |
| HR_STAFF | UPDATE attribution | **DENIED** |
| beneficiary (referrer) | UPDATE own attribution | **DENIED** |
| any role | DELETE attribution | denied (no DELETE policy; default-deny under FORCE RLS) |

**App engine writer LIVE contract tests (R8 executable):**

| # | Test | Expected result |
|---|---|---|
| E-01 | `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_engine_writer'` | `rolname = 'app_engine_writer'`, `rolsuper = false`, `rolbypassrls = false` |
| E-02 | `SELECT has_table_privilege('app_engine_writer', 'referral_attributions', 'DELETE')` | `false` (no DELETE privilege) |
| E-03 | `SELECT has_table_privilege('app_engine_writer', 'referral_attributions', 'INSERT')` | `true` |
| E-04 | `SELECT has_table_privilege('app_engine_writer', 'referral_attributions', 'UPDATE')` | `true` |
| E-05 | `SELECT has_table_privilege('app_engine_writer', 'referral_attributions', 'SELECT')` | `true` |
| E-06 | Open tx1 as `app_engine_writer`, `SELECT set_config('hrp.engine_context', 'link-capture', true)`, INSERT, COMMIT. Open tx2 on SAME connection: `SELECT current_setting('hrp.engine_context', true)` | returns `''` (cleared at COMMIT, R8 transactional isolation test) |
| E-07 | Open tx1 as `app_engine_writer`, set context, ROLLBACK. tx2 same connection: `current_setting` | returns `''` (cleared at ROLLBACK) |
| E-08 | Set context to `'link-capture'` then attempt UPDATE on ACTIVE row | allowed only for `consume`/`milestone`; insert/UPDATE require context match |
| E-09 | TX without `set_config` first: INSERT | denied (current_setting returns `''`) |
| E-10 | TX with `set_config('hrp.engine_context', 'invalid', true)`: INSERT | denied (not in allowed list) |
| E-11 | Lint rule / static check: `set_config('hrp.engine_context', ..., false)` in app_engine_writer code paths | rejected; only `set_config(..., true)` allowed |
| E-12 | Pooled-connection reuse: tx1 set context + COMMIT, tx2 immediate INSERT on same pooled connection | denied (context cleared) |
| E-13 | `SELECT COALESCE(current_setting('hrp.engine_context', true), '')` in fresh tx | returns `''` (COALESCE guards against NULL when GUC never set); engine policy USING/CHECK uses COALESCE — absence or not-in-allowlist is denied |
| E-14 | `SELECT current_user, session_user` when engine connects via dedicated DSN | `current_user='app_engine_writer'`, `session_user='app_engine_writer'` (no SET ROLE assumption; direct LOGIN as engine role) |
| E-15 | Engine pool + human pool are distinct: `SELECT * FROM pg_stat_activity WHERE usename = 'app_engine_writer'` | shows connections from engine pool only; `app_user_writer` connections from human pool only; no overlap |
| E-16 | Credential boundary: `app_engine_writer` connection string is `HRPARTNER_ENGINE_URL` env var; `app_user_writer` connection string is `HRPARTNER_PRIMARY_URL`; no shared `PGUSER` env var | runtime config review confirms separation; no fallback to `app_user_writer` when engine secret unset (engine refuses to start) |
| E-17 | Prisma create with `INSERT ... RETURNING` under `link-capture` context: `await tx.referralAttribution.create({ data })` (Prisma adds RETURNING by default) | allowed; row inserted; SELECT policy permits `link-capture` so RETURNING returns the new row |
| E-18 | Canonical JSON K-08 with `JSON.stringify(1.0) === JSON.stringify(1)` and `JSON.stringify(-0) === JSON.stringify(0)` | BOTH JavaScript `JSON.stringify` and PostgreSQL `jsonb` map `1.0 ↔ 1` and `-0 ↔ 0`; canonicalJson matches application+DB (`true` for both, NOT `false`) |
| E-19 | N2-5 privilege-survival LIVE vector (R11 delta D3 fix): apply N2-5 CBD grants (`GRANT SELECT, INSERT, UPDATE ON commission_beneficiary_decisions TO app_engine_writer` + `REVOKE DELETE ... FROM app_engine_writer`), then re-run N2-1 provisioning (Step 1-5) in the SAME transaction, then assert: `has_table_privilege('app_engine_writer', 'commission_beneficiary_decisions', 'SELECT')` = true, `has_table_privilege('app_engine_writer', 'commission_beneficiary_decisions', 'INSERT')` = true, `has_table_privilege('app_engine_writer', 'commission_beneficiary_decisions', 'UPDATE')` = true, `has_table_privilege('app_engine_writer', 'commission_beneficiary_decisions', 'DELETE')` = false. (N2-1 MUST NOT introduce a generic CBD query; this vector exercises only `has_table_privilege` and the re-run, no `commission_beneficiary_decisions` SELECT in N2-1.) |

N2-1 and N2-5 TASKs must include these LIVE matrices as hard test gates.

**Canonical JSON (R9 strict — application/JSON.stringify and PostgreSQL jsonb aligned):**

R9 alignment principle: `canonicalJson(x)` and PostgreSQL `jsonb` MUST agree on
representation. Both reject undefined, NaN, ±Infinity; both treat `1.0 == 1` and
`-0 == 0` (PostgreSQL jsonb normalizes numerics identically). The application
helper uses `JSON.stringify` for primitives so 1.0 and 1 produce identical output.

| # | Input A | Input B | `canonicalJson(A) === canonicalJson(B)` |
|---|---|---|---|
| K-01 | `{a:1,b:2}` | `{b:2,a:1}` | true (key-order invariance) |
| K-02 | `{a:{x:1,y:2}}` | `{a:{y:2,x:1}}` | true (nested key-order) |
| K-03 | `{a:[1,2,3]}` | `{a:[1,2,3]}` | true (array identity) |
| K-04 | `{a:[1,2]}` | `{a:[2,1]}` | false (array order is significant) |
| K-05 | `{a:1,b:null}` | `{a:1}` | false (null is meaningful) |
| K-06 | `{a:1,b:{c:2}}` | `{a:1,b:{c:2}}` | true (deep equality) |
| K-07 | `{a:1,b:[{x:1},{x:2}]}` | `{b:[{x:1},{x:2}],a:1}` | true (mixed nested) |
| K-08 | `{a:1.0}` | `{a:1}` | **true** — `JSON.stringify(1.0) === JSON.stringify(1)` AND PostgreSQL jsonb normalizes numerics identically; application and DB agree |
| K-09 | `{a:-0}` | `{a:0}` | **true** — `JSON.stringify(-0) === JSON.stringify(0)` AND PostgreSQL jsonb normalizes -0 to 0; application and DB agree |
| K-10 | `{a:"x"}` | `{a:'x'}` | true (string normalization; JSON.stringify handles quotes) |

**Rejection vectors (R9 — `canonicalJson` must throw, not coerce):**

| # | Input | Expected |
|---|---|---|
| K-11 | `{a: undefined}` | throws TypeError (undefined is not a JSON value) |
| K-12 | `{a: NaN}` | throws TypeError (NaN is not a JSON value) |
| K-13 | `{a: Infinity}` | throws TypeError (±Infinity is not a JSON value) |
| K-14 | `new Date()` | throws TypeError (Date prototype — not a plain object) |
| K-15 | `(() => { const o: any = {}; o.self = o; return o; })()` (cyclic object) | **throws TypeError** (WeakSet detects cycle in object, throws on second visit) |
| K-16 | `new Map([['a',1]])` | throws TypeError (Map prototype — not a plain object) |
| K-17 | `(a:number) => a` | throws TypeError (function type) |
| K-18 | `Symbol('x')` | throws TypeError (symbol type) |
| K-19 | `{a: {b: undefined}}` (nested undefined) | throws TypeError |
| K-20 | `{a: [1, undefined, 3]}` (undefined in array) | throws TypeError |

> **R10 P2-2 correction — jsonb parity scope (R11 delta D6):** The statement "both `canonicalJson` and PostgreSQL `jsonb` reject these inputs" is misleading — `isJsonValue` (JavaScript layer) is the validator that rejects Date, Map, Set, Symbol, function, NaN, ±Infinity, undefined, cyclic objects, and exotic prototypes. PostgreSQL `jsonb_in` does not directly receive JavaScript types; the DB only sees JSON-serialized strings. The two systems operate at different layers: the application validator runs FIRST, and `jsonb =` is a backup equality check applied only to confirmed-JSON column values (NOT NULL jsonb column accepts only valid JSON values).
>
> **Numeric parity (R11 delta D6 — only the two specific vectors):**
> - `JSON.stringify(1.0) === JSON.stringify(1)` is `true` in JavaScript.
> - `'1.0'::jsonb = '1'::jsonb` is `true` in PostgreSQL.
> - `JSON.stringify(-0) === JSON.stringify(0)` is `true` in JavaScript.
> - `'-0'::jsonb = '0'::jsonb` is `true` in PostgreSQL.
>
> **PostgreSQL jsonb number type uses `numeric` (arbitrary precision), not IEEE 754 double-precision.** The numeric parity above holds because both JS `JSON.stringify` and PG `jsonb` normalize these specific literals to the same canonical form — not because of IEEE 754 floating-point semantics.
>
> **Application validator runs first; DB jsonb equality is a secondary backup check applied only to confirmed-JSON values.**

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
| N2-1 | `hrp-v6-n2-aff-01-attribution-foundation` | `ReferralAttribution` table; Layer 1 (immutable cols incl. `created_at`, NO labor_profile_id check), Layer 1b (NULL→value write-once), Layer 1c (lifecycle transition trigger), Layer 2 (CHECK current state only), Layer 5 (default-deny DELETE); N2-1 RLS policies: ADMIN/referrer SELECT, engine INSERT (current_setting gate), ADMIN UPDATE; no external table refs (N2-4 owns team source); Layer 1b write-once LIVE test cases | Low — additive | Immutability trigger test (incl. `created_at`), write-once test (NULL→value allowed once, value→other denied, value→NULL denied), lifecycle transition matrix test, N2-1 RLS policy tests (engine context absent/invalid/valid) | No |
| N2-2 | `hrp-v6-n2-aff-02-link-capture` | None (pure app) | Zero | Race, forged code, all roles | No |
| N2-3 | `hrp-v6-n2-aff-03-apply-attribution` | Additive `candidate_submissions` columns + RPC signature change | HIGH | RPC migration test, upgrade path | No (LaborProfile in pinned baseline) |
| N2-4 | `hrp-v6-n2-aff-04-handling-assignment` | `labor_profile_handling_assignments` with partial unique `(laborProfileId) WHERE status = 'ACTIVE'`; N2-4 creates or sources `hr_team_members`; N2-4 RLS: ADMIN/HR_MANAGER (team scope USING+WITH CHECK on both rows) / HR_STAFF (SELECT assigned only; UPDATE denied); N2-4 adds additive handler/team RLS for ReferralAttribution (N2-1 table) | Medium | Race to assign, transfer/release WITH CHECK (no out-of-team assignee), expiry, LIVE RLS matrix (team scope on both rows, HR_STAFF UPDATE denied), team-membership source test | No |
| N2-5 | `hrp-v6-n2-aff-05-beneficiary-decision` | `CommissionBeneficiaryDecision` per §2.5 schema; **migration SQL owns**: NULLS NOT DISTINCT + CHECK + CHECK actor XOR + immutable-fact trigger; CREATE/CORRECT split with CORRECT ordering (lock→lookup→UPDATE→INSERT→link→commit); four commands; N2-5 RLS: ADMIN/HR_MANAGER (team scope USING+WITH CHECK on both rows) / HR_STAFF (SELECT assigned only; UPDATE denied) | Medium | Invariant, command lifecycle matrix, four-command test, state-machine test (no forbidden transitions), CORRECT ordering rollback test, CREATE CONFLICT_EXISTING_ACTIVE test, LIVE RLS matrix | No (requires N2-4) |
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

### 6.2 V6 Phase 1A Capability in Pinned Baseline (R5 reproducible, R6 full-SHA)

> **R5 evidence + R6 full-SHA rule:** pinned to commit `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA, no shortened hash, no `<hash>` placeholder). Evidence commands use `git ls-tree -r --name-only` (recursive, full names). The `--` separator guards against accidental path interpretation.

```
$ git ls-tree -r --name-only `
>>   b91a33f948aed224a88f3e8e7c9847006f33e97f `
>>   -- prisma/migrations `
>>   | Select-String "phase1a"
prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql
prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql

$ git ls-tree -r --name-only `
>>   b91a33f948aed224a88f3e8e7c9847006f33e97f `
>>   -- prisma/migrations `
>>   | Select-String "n1_placement"
prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql
prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql
```

> **R6 reproducibility note:** The two `Select-String` calls are intentionally separate. The previous combined `phase1a|n1_placement` pattern was non-reproducible because `Select-String` does regex alternation via `|` only when wrapped with a regex class; using separate calls avoids that ambiguity.

Tables: `labor_profiles`, `labor_profile_intakes`, `employment_episodes`
FK: `candidate_submissions.labor_profile_id`
RLS: all three tables

---

## 7. Definition of Done — Discovery (Locked)

Discovery hoàn tất khi:

- 18 `AFF-DEC-*` decisions đã chốt bởi `aff_plan.md`
- Operational decisions chốt bởi T0 verdict (R0–R9)
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
- **R9 — app_engine_writer runtime**: dedicated LOGIN role + dedicated engine connection pool (`HRPARTNER_ENGINE_URL`); no SET ROLE assumption; `current_user='app_engine_writer'` runtime test; pool/credential boundary via `pg_stat_activity`; posture converge `ALTER ROLE ... NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`; explicit posture assertion raises if forced attributes don't match
- **R9 — link-capture + RETURNING**: SELECT policy permits `link-capture` so `INSERT ... RETURNING` (Prisma default) works; LIVE test E-17 with exact Prisma statement
- **R9 — Canonical JSON K-08/K-09 alignment**: 1.0↔1 and -0↔0 return true (align with `JSON.stringify` and PostgreSQL `jsonb` numeric normalization)
- **R9 — `isJsonValue` reject vectors**: 10 LIVE tests K-11..K-20 cover undefined, NaN, ±Infinity, Date, exotic objects, cycles, function, symbol, nested undefined, undefined-in-array; `canonicalJson` and PostgreSQL `jsonb` must both reject
- **R9 — CBD INSERT WITH CHECK isolation tests**: L-01..L-06 isolate WITH CHECK from USING and from immutable triggers; L-05 verifies non-team-modifying updates still allowed
- **R9 — COALESCE engine policies**: all engine policies use `COALESCE(current_setting('hrp.engine_context', true), '')` to guard against NULL when GUC never set
- **R8 — CBD RLS scope fix**: bare `labor_profile_id` in WITH CHECK subqueries replaced with qualified `commission_beneficiary_decisions.labor_profile_id`; cross-profile denial LIVE test added
- **R8 — App engine writer executable contract**: idempotent provisioning (DO $$ with EXISTS check), explicit grants + REVOKE DELETE, three policies per table (SELECT for consume flow, INSERT/UPDATE gated by current_setting context), NO BYPASSRLS assertion; 12 LIVE contract tests
- **R8 — set_config(..., true)**: set_config(setting, value, false) FORBIDDEN — only set_config(setting, value, true) (transaction-local); LIVE tests prove context cleared after COMMIT/ROLLBACK/pooled-reuse
- **R8 — Recursive canonical JSON**: top-level Object.keys().sort() replaced with recursive helper; 10 LIVE tests (K-01..K-10); optional DB-layer `jsonb =` comparison
- **R7 — CREATE/CORRECT split**: two separate functions, three typed CREATE outcomes (CREATED / IDEMPOTENT_REPLAY / CONFLICT_EXISTING_ACTIVE), explicit CORRECT typed outcomes (CORRECTED / NO_ACTIVE), exact-match across all authoritative immutable facts (decidedAt NOT in idempotency identity; canonical JSON deep-equal for evidence)
- **R7 — CORRECT ordering**: lock → lookup → UPDATE old ACTIVE→SUPERSEDED → INSERT replacement ACTIVE → SET supersededById on old → commit; partial unique invariant satisfied throughout
- **R7 — RLS valid PostgreSQL**: no NEW./OLD. prefixes in policy expressions; column names evaluate proposed/resulting row directly; WITH CHECK enforces team-scope on BOTH old (USING) and new (WITH CHECK) rows; HR_STAFF UPDATE denied on both tables
- **R7 — N2-1 RLS simplified**: ADMIN/referrer own-view + engine INSERT/UPDATE; no labor_profile_handling_assignments/hr_team_members references (tables not available at N2-1 time)
- **R7 — N2-4 owns team membership + LHA**: N2-4 creates LHA and locks team-membership source; N2-4 adds additive handler/team RLS for ReferralAttribution
- **R7 — System engine DB principal**: app_engine_writer role, no BYPASSRLS, no DELETE grant, explicit INSERT/UPDATE policies TO app_engine_writer, current_setting('hrp.engine_context') gate, valid set_config syntax, LIVE isolation tests
- **R7 — ReferralAttribution Layer 1 does NOT check labor_profile_id**: Layer 1b is sole authority for write-once; write-once LIVE test cases defined (NULL→value allowed once, value→same allowed, value→other denied, value→NULL denied)
- **R7 — ReferralAttribution DB contract**: Layer 1 (created_at + immutable cols), Layer 1b (NULL→value write-once), Layer 1c (lifecycle transition trigger), Layer 2 (CHECK current state only), N2-1 RLS (ADMIN/referrer/engine), default-deny DELETE; §2.6.3 R7 for actual SQL
- **R6 — State diagram**: two direct branches drawn (ACTIVE -> SUPERSEDED via CORRECT, ACTIVE -> REVERSED via REVERSE); REDECIDE_AFTER_REVERSAL is INSERT of new row, not transition from REVERSED
- **R6 — Full-SHA evidence**: `git ls-tree -r --name-only b91a33f948aed224a88f3e8e7c9847006f33e97f -- prisma/migrations` (full hash, no shortened, no placeholder, `--` separator); two separate `Select-String` calls for phase1a and n1_placement families
- **R6 — Main sync**: branch synced with `origin/main` (HEAD `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`) before R6 corrections; PR #4 diff still scoped to 4 N2 docs files
- WITH CHECK clauses added for all write paths (R5)
- Role-scoped RLS, no role-only opens (R5)
- LIVE RLS matrix tests required (R5, expanded R6 per-table matrices)
- DELETE default-deny under FORCE RLS; optional BEFORE DELETE trigger defense-in-depth (R5)
- CHECK constraints are current-state only; write-once is trigger's job (R5)
- Evidence pinned to full SHA `b91a33f948aed224a88f3e8e7c9847006f33e97f`, `git ls-tree -r --name-only -- <path>`, no placeholders (R5/R6)
- 6 vertical slices với dependency graph
- V6 P1 capability confirmed available in pinned baseline
- All 4 files synced
- PR #4 opened as docs-only
- Status: OPEN / FINAL_R11_DELTA_REQUIRED (T0 verdict after R7/R8/R9/R10/R11 reviews + R11 delta; awaiting T0 final authorization)
- Audit: NONE (read-only docs-only task)

---

**Discovery in FINAL_R11_DELTA_REQUIRED state. PR #4 awaiting T0 final authorization (R0..R11 + R11 delta corrections applied; merge-base = origin/main `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`).**
