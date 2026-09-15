# N2 AFF Policy & Contract Discovery

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f` (15 Sep 2026)
**Author:** S1
**Type:** READ-ONLY Discovery — no production code changes
**Status:** `READY_FOR_T0_DECISION` — awaiting T0 policy decisions before implementation
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**HEAD (R2):** `fd56eaa` (R2 revision pending push)

---

## 0. Executive Summary

N2 AFF (Admin Fee Clock) chưa có schema/service/API nào trong codebase. Tất cả đều greenfield. `aff_plan.md v2.3` đã chốt 18 decision, nhưng **15 câu hỏi vận hành cụ thể chưa được trả lời** — mỗi câu ảnh hưởng trực tiếp đến schema, migration, và implementation gate.

Tài liệu này trình bày evidence từ codebase, gaps, và recommendation cho từng câu. T0 cần chốt trước khi N2 implementation có thể bắt đầu.

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
| V6 Phase 1A migrations | ✅ IN main migrations/ | `20260908150000_v6_phase1a_labor_profile_schema/migration.sql`, `20260908150001_v6_phase1a_labor_profile_rls/migration.sql` |
| `Holiday` table | ✅ Exists, attendance-only | `schema.prisma:737-745` |
| Commission ledger | ✅ CTV-specific | `schema.prisma:1229-1260` |
| Commission engine | ✅ 30/60/90-day milestones | `engine.service.ts:75-80` |
| `ProjectAssignment.referrerId` | ✅ Legacy referral | `schema.prisma:658` |
| `ReferralAttribution` | ❌ NOT IMPLEMENTED | Greenfield |
| `CommissionBeneficiaryDecision` | ❌ NOT IMPLEMENTED | Greenfield — see Q7 revision |
| `LaborProfileHandlingAssignment` | ❌ NOT IMPLEMENTED | Greenfield |
| `beneficiaryUserId` | ❌ NOT IMPLEMENTED | Greenfield |
| Handler assignment service | ❌ NOT IMPLEMENTED | Greenfield |
| AFF-specific API routes | ❌ NOT IMPLEMENTED | Greenfield |

### 1.2 V6 Phase 1A — Capability Is Available in origin/main (CORRECTED)

**T0 R2 correction:** V6 Phase 1A schema và RLS đã nằm trong `prisma/migrations/` của origin/main. Không cần merge branch cũ. N2 dependency được tính từ **capability thực tế**, không phải commit ancestry.

Evidence:
```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  040000 tree 613b6fe6... prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  040000 tree a399344c... prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/

$ git show origin/main:prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql
  CREATE TABLE labor_profiles (...)
  CREATE TABLE labor_profile_intakes (...)
  CREATE TABLE employment_episodes (...)
  ALTER TABLE candidate_submissions ADD COLUMN labor_profile_id TEXT
```

Capability summary:
- `LaborProfile` table: CREATE TABLE ✅
- `LaborProfileIntake` table: CREATE TABLE ✅
- `CandidateSubmission.laborProfileId` nullable FK: ADD COLUMN ✅
- RLS policies on all three tables: APPLIED ✅

**Điều này có nghĩa:**
- N2-3 và N2-4 **không bị blocked** bởi V6 P1 merge — capability đã sẵn sàng trong origin/main
- N2-1, N2-2, N2-3, N2-4 đều có thể proceed sau khi T0 unlock
- N2-5 phụ thuộc N2-4 (HandlingAssignment là input cho decision)
- N2-6 phụ thuộc N2-5 (Decision là authority cho commission engine)

### 1.3 No timezone handling anywhere

```sql
-- All timestamps are TIMESTAMP(3), not TIMESTAMPTZ
openedAt       DateTime  @default(now()) @map("opened_at")     -- schema.prisma:1465
validFrom      DateTime  @map("valid_from") @db.Timestamptz(3) -- ONLY exception: ProjectAssignment.validFrom/To
```

**Zero** timezone fields, zero `TIMEZONE` config, zero `tz`/`utc`/`offset` in any migration.

### 1.4 No business-day logic

`REFERRAL_GUARD_DAYS` uses pure calendar arithmetic:
```typescript:48:src/domains/staffing/referral-guard.service.ts
export const REFERRAL_GUARD_DAYS = Number(process.env['REFERRAL_GUARD_DAYS'] ?? 7);
// Used as: cutoff.setDate(cutoff.getDate() - REFERRAL_GUARD_DAYS)
```

### 1.5 No pause/reset on PlacementCase

```prisma:1460:1466:prisma/schema.prisma
enum PlacementCaseStatus {
  OPEN
  IN_PROGRESS
  READY_TO_PLACE
  CLOSED
}
// No RELEASED, TRANSFERRED, PAUSED, SUSPENDED
```

### 1.6 Existing permissions catalog

No handler-assignment permissions exist. Only generic permissions like `CAN_MANAGE_PERMISSIONS`, `CAN_VIEW_UNASSIGNED_POOL`, etc.

---

## 2. The 10 Policy Questions

---

### Q1. AFF Clock — Calendar Days vs Business Days

**Question:** Nên dùng calendar days hay business days để tính AFF clock?

**Evidence:**
- `PlacementCase.openedAt` là clock anchor duy nhất hiện tại
- Codebase **không có business-day logic** — tất cả date arithmetic dùng calendar days
- `Holiday` table tồn tại (attendance-only) nhưng không được consume
- Commission milestone engine dùng calendar days: `ageDays = ageMs / (24*60*60*1000)` (`engine.service.ts:75`)
- Referral Guard dùng calendar days: `cutoff.setDate(cutoff.getDate() - REFERRAL_GUARD_DAYS)` (`referral-guard.service.ts:48`)

**Recommendation:** ⬅️ **T0 quyết định**

| Option | Pros | Cons |
|---|---|---|
| **A. Calendar days (Recommended for MVP)** | Đơn giản, consistent với existing codebase, predictable | Không skip VN holidays |
| **B. Business days** | Chính xác hơn với VN business practice | Cần `Holiday` population + `computeBusinessDays()` utility |

---

### Q2. Timezone Canonical + Cut-off Time

**Question:** Dùng timezone nào làm canonical? Cut-off time là mấy giờ?

**Evidence:**
- **Tất cả** timestamps hiện tại là `TIMESTAMP(3)` không có timezone (PostgreSQL)
- **Một ngoại lệ duy nhất:** `ProjectAssignment.validFrom/validTo` dùng `@db.Timestamptz(3)` (`schema.prisma:648-651`)

**Recommendation:** ⬅️ **T0 quyết định**

| Layer | Option | Description |
|---|---|---|
| **Storage** | **TIMESTAMPTZ UTC (Recommended)** | Store all AFF clock fields as `TIMESTAMPTZ(3)`, normalized to UTC |
| **Business clock** | **Asia/Bangkok (Recommended)** | AFF clock tính theo VN business hours |
| **Cut-off** | **23:59:59.999 Asia/Bangkok (Recommended)** | Midnight VN |

---

### Q3. Holiday Calendar Authority + Unconfigured Behavior

**Question:** Holiday calendar thuộc authority nào? Nếu chưa configured thì sao?

**Evidence:**
- `Holiday` model tồn tại (`schema.prisma:737-745`) với `date`, `name`, `type` (PUBLIC_HOLIDAY | WEEKEND | COMPANY_HOLIDAY)
- Hiện tại chỉ dùng cho attendance/timesheet, **không dùng cho business-day calculation**

**Recommendation:** ⬅️ **T0 quyết định**

| Decision | Option | Implication |
|---|---|---|
| **Calendar owner** | A. HR Admin (Recommended) | HR tạo/edit holiday entries qua admin UI |
| | B. System — hard-coded VN holidays | Không linh hoạt |
| **Unconfigured behavior** | A. Fallback to calendar days (Recommended) | Fail-safe, always works |
| | B. Block/Error | Strict, có thể break deployment |

---

### Q4. Clock Start Event

**Question:** Clock bắt đầu chính xác từ `PlacementCase.openedAt` hay event khác?

**Evidence:**
- `PlacementCase.openedAt` được set bằng `new Date()` khi `openPlacementCase()` được gọi (`placement-case.service.ts:69`)
- `openPlacementCase()` được gọi từ `createCandidateSubmissionFromIntake()` trong intake flow (`intake-writer.service.ts:120`)
- No separate "open case" API route — placement case được tạo implicit khi intake submission

**Recommendation:** ✅ **Recommend: `PlacementCase.openedAt` là clock anchor**

| Option | Description | Risk |
|---|---|---|
| **A. `openedAt` = clock anchor (Recommended)** | Clock start = `openedAt`. Đơn giản, đã có field. | Clock bắt đầu khi intake submission |
| **B. Separate `affClockStartAt` field** | Thêm field mới để tách clock start | Thêm complexity |

---

### Q5. Pause/Reset Semantics

**Question:** Khi case được release hoặc transfer handling, clock có pause/reset không?

**Evidence:**
- Không có `RELEASED`, `TRANSFERRED`, `PAUSED`, `SUSPENDED` status trên `PlacementCase`
- `LaborProfileHandlingAssignment` chưa tồn tại — không có cơ chế giao/xóa handling assignment
- `aff_plan.md §14` nói "Ticket/Case có thể mở ngay trong cửa sổ 7 ngày" — clock không bị pause khi dispute

**Recommendation:** ✅ **Recommend: Clock RUNNING always, assignment có thời hạn**

| Option | Description | Implication |
|---|---|---|
| **A. Clock RUNNING always (Recommended)** | Assignment có `expiresAt`. Hết hạn → profile vào Company Pool. Không pause. | Đơn giản, predictable |
| **B. Clock PAUSES during certain statuses** | Clock tạm dừng khi dispute. Resume khi resolve. | Phức tạp hơn |

---

### Q6. ReferralAttribution Immutability + Attribution Cardinality/History

**Question:** ReferralAttribution phải bất biến thế nào khi handler thay đổi?

**Evidence:**
- `ReferralAttribution` **chưa được implement** — greenfield
- `aff_plan.md §6.2` đã design model với `status: ACTIVE | CONSUMED | EXPIRED | REVOKED | SUPERSEDED`
- `aff_plan.md §10.4` nói: "ReferralAttribution giữ provenance; Handling Assignment giữ quyền/trách nhiệm xử lý có thời hạn; Commission Ledger snapshot beneficiary khi milestone đạt. Ba relation không được đồng nhất."
- `aff_plan.md AFF-DEC-018` đã chốt: `ReferralAttribution` treo trên `LaborProfile` bằng `laborProfileId` nullable + unique

**Attribution Cardinality and History Rule:**

> **Attribution history is immutable. Attribution does NOT change when handling assignment changes or expires.**

Specifically:

| Event | Attribution Row | Handling Assignment Row | Relationship |
|---|---|---|---|
| AFF click captures | `ReferralAttribution` created with `status=ACTIVE` | Not yet created | Independent |
| LaborProfile created/matched | Attribution linked via `laborProfileId` | `LaborProfileHandlingAssignment` created with `source=AFF_INITIAL`, `status=ACTIVE` | Attribution holds source; assignment holds handler |
| Assignment expires (7d) | Attribution row stays `ACTIVE`, `laborProfileId` unchanged | Assignment → `status=EXPIRED` | Attribution survives assignment expiry |
| Handler transferred | Attribution row unchanged | New assignment → `status=ACTIVE`; old → `status=TRANSFERRED` | Attribution never changes |
| Attribution expires (30d) | Attribution row → `status=EXPIRED` | Existing assignment unaffected | Separate clocks |

**Two separate clocks:**
- Attribution TTL: 30 days from first click (`AFF-DEC-010`)
- Handling protected window: 7 days from LaborProfile create/match (`AFF-DEC-011`)
- These clocks are independent — handling expiry does NOT affect attribution, and vice versa

**Immutable facts on `ReferralAttribution`:**
- `referrerUserId` — NEVER mutable after creation
- `affiliateCodeSnapshot` — NEVER mutable after creation
- `firstClickedAt` — NEVER mutable after creation
- `expiresAt` — NEVER mutable after creation (set once at creation time)
- `laborProfileId` — SET ONCE at `CONSUME` time (when LaborProfile is matched), immutable thereafter

**Mutable fields (status transitions only):**
- `status`: ACTIVE → CONSUMED | EXPIRED | REVOKED | SUPERSEDED
- `consumedAt`: SET when status transitions to CONSUMED

**Immutability enforcement:**
1. RLS policy: no UPDATE/DELETE on `referral_attributions` table
2. Application service: no setter for immutable fields
3. `laborProfileId` set once via explicit `consume()` method, not direct setter
4. Only status transitions via explicit transition methods with audit

**Recommendation:** ✅ **Already decided by `AFF-DEC-018` + T0 clarification — no T0 action needed**

---

### Q7. CommissionBeneficiaryDecision — REVISED PER T0 R1 + R2

**Question:** CommissionBeneficiaryDecision tách khỏi referral/handling ra sao?

**⚠️ R2 MAJOR REVISIONS:**

> 1. `beneficiaryUserId` bắt buộc đối với ACTIVE decision.
> 2. No handler/no beneficiary → typed `UNRESOLVED` outcome; không tạo active decision với `beneficiaryUserId = null`.
> 3. Actor SYSTEM phải reference valid `User` row (không dùng magic string "SYSTEM").
> 4. Uniqueness invariant: max one ACTIVE decision per (laborProfileId, assignmentId, milestone); nullable-safe; concurrency-safe; preserves correction/reversal history.

### Current state (evidence)

- `CommissionLedger.ctvId` là CTV-specific, không generic
- `CommissionEngine` đọc `assignment.referrerId` và ghi ledger bằng `ctvId` (`engine.service.ts:239-242`)
- `aff_plan.md §6.5.1` nói: "`LaborProfileHandlingAssignment` xác định beneficiary candidate tại milestone"
- `aff_plan.md §11.1` nói: "Mọi User được lãnh đạo giao LaborProfile hợp lệ đều có thể trở thành beneficiary"

### Proposed CommissionBeneficiaryDecision model (REVISED per R2)

```prisma
/// CommissionBeneficiaryDecision — authority record độc lập cho mỗi milestone.
/// Không derived từ active handler động. Mỗi decision là immutable snapshot.
/// Invariant: max one ACTIVE decision per (laborProfileId, assignmentId, milestone).
model CommissionBeneficiaryDecision {
  id                      String    @id @default(uuid())
  laborProfileId          String    @map("labor_profile_id")
  assignmentId            String?   @map("assignment_id")
  handlingAssignmentId    String?   @map("handling_assignment_id")  // nullable — evidence only
  beneficiaryUserId       String    @map("beneficiary_user_id")     // REQUIRED for ACTIVE decision
  source                  String    @map("source")                   // AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION | DIRECT
  reason                  String    @map("reason")                   // Typed reason
  evidence                Json      @default("{}") @map("evidence") // Full snapshot
  decidedAt               DateTime  @map("decided_at")
  actorId                 String    @map("actor_id")                // User.id — SYSTEM = valid User row
  milestone               String    @map("milestone")
  status                  String    @default("ACTIVE") @map("status") // ACTIVE | SUPERSEDED | REVERSED
  supersededById          String?   @map("superseded_by_id")
  outcome                 String?   @map("outcome")                 // ACTIVE | UNRESOLVED (set when no valid handler)
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt      @map("updated_at")

  laborProfile      LaborProfile               @relation(fields: [laborProfileId], references: [id])
  beneficiary      User                       @relation("BeneficiaryUser", fields: [beneficiaryUserId], references: [id])
  actor            User                       @relation("DecisionActor", fields: [actorId], references: [id])
  supersededBy     CommissionBeneficiaryDecision? @relation("DecisionSupersession", fields: [supersededById], references: [id])
  supersessions    CommissionBeneficiaryDecision[] @relation("DecisionSupersession")

  @@index([laborProfileId, status])
  @@index([beneficiaryUserId, status])
  @@map("commission_beneficiary_decisions")
}
```

### Invariant Contract: Max One ACTIVE Decision Per Business Key

**Business key:** `(laborProfileId, assignmentId, milestone)`

**Invariant:** At any point in time, there can be **at most one ACTIVE decision** for a given business key.

**Implementation requirements:**

1. **Nullable-safe:** `(NULL, NULL, NULL)` does not violate the invariant (multiple UNRESOLVED rows for different keys are fine; same key with `assignmentId=null` is still unique).

2. **Concurrency-safe:** Use partial unique index + advisory lock:
   ```sql
   -- Partial unique index: one ACTIVE per laborProfileId + assignmentId + milestone
   CREATE UNIQUE INDEX cbd_active_uniq
     ON commission_beneficiary_decisions(labor_profile_id, assignment_id, milestone)
     WHERE status = 'ACTIVE';
   ```

3. **Advisory lock on write:**
   ```typescript
   await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(laborProfileId || assignmentId || milestone))`;
   // Then upsert with ON CONFLICT DO NOTHING or check-then-insert
   ```

4. **Preserving correction/reversal history:**
   - When a decision is corrected (e.g., dispute resolution changes beneficiary):
     - Old ACTIVE → SUPERSEDED (sets `supersededById` to new decision's id)
     - New ACTIVE decision created with full evidence of correction
   - When a decision must be reversed (e.g., found to be fraudulent):
     - Old ACTIVE → REVERSED (sets `supersededById`)
     - New decision references original for audit chain
   - Historical SUPERSEDED/REVERSED rows are NEVER deleted — they are the audit trail

5. **No handler scenario (UNRESOLVED outcome):**
   - **No active decision is created** with `beneficiaryUserId = null`
   - Instead, when no valid handler found:
     - Outcome is recorded as `UNRESOLVED` in a separate tracking mechanism (not a decision row with null beneficiary)
     - Commission engine skips credit with typed reason `NO_ACTIVE_HANDLER`
     - This preserves the invariant: every ACTIVE decision has a valid `beneficiaryUserId`
   - Alternatively: create decision with `outcome = 'UNRESOLVED'` and `beneficiaryUserId` pointing to a SYSTEM service user:
     ```prisma
     // SYSTEM actor must be a valid User row (e.g., userId of a dedicated system service account)
     // This is NOT a magic string — it's a real FK to users table
     actorId = "00000000-0000-0000-0000-000000000001"  // System service account User
     outcome = "UNRESOLVED"
     beneficiaryUserId = "00000000-0000-0000-0000-000000000001"  // Same system user
     ```

### Decision Resolution Flow (REVISED per R2)

```
At milestone evaluation time:
1. ACQUIRE advisory lock on business key (laborProfileId, assignmentId, milestone)
2. Lookup existing ACTIVE decision for business key
   a. IF found AND has valid beneficiaryUserId:
      → Use decision.beneficiaryUserId
      → decision is authoritative
   b. IF NOT found:
      → Evaluate candidate from LaborProfileHandlingAssignment (ACTIVE + not expired)
      → IF valid handler found:
         → Create ACTIVE decision with beneficiaryUserId = assigneeUserId
         → outcome = 'ACTIVE'
         → actorId = 'SYSTEM_USER_ID' (valid User FK)
      → IF no valid handler:
         → DO NOT create decision with null beneficiary
         → Record UNRESOLVED outcome separately (audit log or outcome table)
         → Skip commission credit with typed reason 'NO_ACTIVE_HANDLER'
         → No decision row created
3. RELEASES lock
```

### Actor SYSTEM — Valid User Requirement

> **Actor SYSTEM must reference a valid `User` row. Do not use a magic string like "SYSTEM".**

**Implementation options:**

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. System service User (Recommended)** | Pre-create a `User` row with role=SYSTEM and use its ID as `actorId` | Valid FK, auditable, queryable | Requires pre-seed |
| **B. Nullable actorId** | Allow `actorId=null` for system-generated decisions | Simple | Breaks FK integrity, harder to query |
| **C. Magic string** | Use `"SYSTEM"` as sentinel value | Simple | Not a valid FK; query breaks; violates referential integrity |

**Recommendation: Option A.** Create a `User` row for system operations (or reuse an existing service account) and reference it by ID. This makes all decisions queryable via the same `actorId` relation and maintains FK integrity.

### Beneficiary Derivation Hierarchy (REVISED per R2)

```
1. Explicit CommissionBeneficiaryDecision (authority record) — highest priority
   └── Must have valid beneficiaryUserId (FK to User)
   └── Superseded → superseding decision (via supersededById)
2. System evaluation at milestone:
   a. Active LaborProfileHandlingAssignment exists
      → Create decision with assigneeUserId as beneficiaryUserId
   b. No active assignment
      → UNRESOLVED outcome (no active decision created)
      → Commission engine skips credit
3. Company Pool default:
   → NOT represented as a decision with null beneficiary
   → Represented as UNRESOLVED outcome in audit
```

**T0 Action Required:**
- Confirm `outcome = 'UNRESOLVED'` pattern (no decision row with null beneficiary)
- Confirm SYSTEM actor must be valid `User` row (Option A)
- Confirm invariant contract: max one ACTIVE per (laborProfileId, assignmentId, milestone)
- Confirm correction/reversal preserves history (SUPERSEDED/REVERSED, never deleted)

---

### Q8. Role/Permission/Data-Scope

**Question:** Role và permission nào cho assign, transfer, release, và beneficiary decision?

**Evidence:**
- `PlacementCase` RLS: HR_MANAGER + HR_STAFF + ADMIN only
- `CommissionLedger` RLS: CTV đọc own rows; ADMIN/ACCOUNTANT/DIRECTOR write
- No permissions for handler assignment

**Recommendation:** ⬅️ **T0 quyết định**

| Action | Permission | Data Scope |
|---|---|---|
| **Assign handler to profile** | `CAN_ASSIGN_HANDLING` | MANAGER: team member; HR: anyone; ADMIN: anyone |
| **Transfer handling** | `CAN_TRANSFER_HANDLING` | Assignee current OR MANAGER/HR/ADMIN |
| **Release (về Company Pool)** | `CAN_RELEASE_HANDLING` | Assignee self OR MANAGER/HR/ADMIN |
| **Create beneficiary decision** | `CAN_CREATE_BENEFICIARY_DECISION` | HR/ADMIN for disputes; SYSTEM for auto at milestone |
| **View Company Pool** | `CAN_VIEW_HANDLING_POOL` | MANAGER: team; HR: all |
| **View own assignments** | Implicit (self) | User chỉ thấy assignment mình là assignee |

**RLS proposal:**
```sql
-- LaborProfileHandlingAssignment
CREATE POLICY hrp_handling_assignment_scope ON labor_profile_handling_assignments
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = assignee_user_id
  );

-- CommissionBeneficiaryDecision
CREATE POLICY hrp_beneficiary_decision_scope ON commission_beneficiary_decisions
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = beneficiary_user_id
  );
```

**T0 Action Required:** Chốt permission codes và data scope matrix.

---

### Q9. Inventory Reuse + N2 Conflicts + Legacy Classification

**Question:** Inventory hiện tại có thể tái sử dụng gì, và có conflict gì với N2?

**Evidence:**

| Component | N2 Reuse | Conflict Risk | Resolution |
|---|---|---|---|
| `User.affCode` | ✅ Reuse mandatory | Low | Already there |
| `PlacementCase.openedAt` | ✅ Clock anchor | Low | Additive |
| `LaborProfile` | ✅ Available in main | Low | FK ready |
| `ReferralGuard.applyOverride()` | ✅ Block-code logic | Medium | R1/R2/R3 rules có thể conflict |
| `CommissionEngine.evaluateMilestones()` | ✅ Milestone pattern | Medium | Update to read from Decision |
| `CommissionLedger.ctvId` | ⚠️ CTV-specific | High | Additive `beneficiaryUserId` |
| `SourceClaim.ctvId/vendorId` | ⚠️ Legacy | High | Additive `referrerUserId` |
| `ProjectAssignment.referrerId` | ✅ Source field | Low | Placement derives from accepted SourceClaim |
| `intake-writer.service.ts` | ✅ Intake flow | Low | Preserve attribution |
| `candidate_submissions` RPC | ⚠️ SECURITY DEFINER | High | RPC signature change — needs LIVE test |
| `Holiday` table | ✅ VN holiday data | Low | Population + consumption |
| `outbox.service.ts` | ✅ Audit events | Low | Reuse for handling + decision events |

**Highest-risk conflicts:**

1. **RPC signature change (`hrp_public_apply_submission`):** Critical path for public apply. Migration + ACL + LIVE test required.

2. **Commission engine beneficiary:** Engine needs to read `CommissionBeneficiaryDecision` (Q7 revised) instead of dynamic handler.

3. **Legacy ctvId/SourceClaim:** Requires EXACT_SAFE classification (see Q9b).

---

### Q9b. Legacy ctvId Backfill Classification (TIGHTENED PER R2)

**⚠️ R2 TIGHTENING: valid User/FK là cần nhưng CHƯA ĐỦ.**

**EXACT_SAFE requires ALL of the following:**

| Criterion | Description | Why Required |
|---|---|---|
| **Valid FK** | `ctvId` maps to a `User.id` that exists and is not soft-deleted | Referential integrity |
| **Provenance** | The `ctvId` was written by a known writer with known semantics | The writer's context proves the beneficiary relationship |
| **Writer semantics** | The commission was created via the canonical `CommissionEngine` or an audited migration with the same semantics | Not a manual INSERT or an ad-hoc write |
| **No conflict** | No other `beneficiaryUserId` already set for this worker/period | No overwriting of existing decisions |
| **Audit trail** | The row has an `outbox` event or equivalent audit proving the relationship | Evidence for disputes |

**What does NOT qualify as EXACT_SAFE:**
- `ctvId` that maps to a User, but was written by a manual INSERT (not via engine)
- `ctvId` that maps to a User, but the commission row has no audit trail
- `ctvId` that maps to a User, but there is already a `beneficiaryUserId` set (conflict)
- `ctvId` that is a string but not a valid `User.id` (no FK match)

**Classification workflow:**

```
For each CommissionLedger row with ctvId:
1. Check: Does ctvId match a valid User.id?
   → NO: UNRESOLVED (invalid FK)
2. Check: Was this row written by canonical engine or audited migration?
   → NO: UNRESOLVED (no writer semantics proof)
3. Check: Is there already a beneficiaryUserId set?
   → YES: UNRESOLVED (conflict — manual override exists)
4. Check: Is there an outbox event or audit trail?
   → NO: UNRESOLVED (no provenance evidence)
5. ALL PASS: EXACT_SAFE → backfill beneficiaryUserId = ctvId
```

**UNRESOLVED disposition:**
- Do NOT backfill
- Log for manual review
- Manual resolution required with evidence review

**T0 Action Required:**
- Confirm EXACT_SAFE criteria (R2 tightened: valid FK alone is not enough)
- Set expectation for UNRESOLVED count — may be significant

---

### Q10. Proposed Vertical Slices

**Recommendation:** 6 slices, ordered by dependency:

```
N2-1 (Attribution Foundation)
    ↓
N2-2 (Link Capture) [parallel with N2-1]
    ↓
N2-3 (Apply Attribution) [requires LaborProfile — available in main]
    ↓
N2-4 (Handling Assignment) [requires LaborProfile FK]
    ↓
N2-5 (Beneficiary Decision) [requires N2-4]
    ↓
N2-6 (Commission Beneficiary) [requires N2-5]
```

**V6 Phase 1A status:** Capability available in origin/main — no merge dependency.

---

#### Slice N2-1: `ReferralAttribution` Foundation

**Slug:** `hrp-v6-n2-aff-01-attribution-foundation`
**Schema scope:**
- New table: `ReferralAttribution` per `aff_plan.md §6.2` + Q6 immutability rules
  - Immutable fields: `referrerUserId`, `affiliateCodeSnapshot`, `firstClickedAt`, `expiresAt`
  - `laborProfileId` set once via `consume()` method
  - `status` transitions only via explicit methods
- RLS: referrer thấy own rows; ADMIN/HR_MANAGER/HR_STAFF thấy all
- No new API routes
**Migration risk:** Low — additive
**Test gate:** Immutability, unique constraint, RLS

---

#### Slice N2-2: Link Capture + Shared Self-Service

**Slug:** `hrp-v6-n2-aff-02-link-capture`
**Schema scope:** None (pure application logic)
- New API: `GET /api/me/affiliate-link`
- New route: `GET /r/:code` (redirect + attribution capture)
- New cookie: `hrp_aff` signed HttpOnly, 30-day TTL
- Feature flags: `AFFILIATE_LINK_ISSUANCE_ENABLED`, `AFFILIATE_CAPTURE_ENABLED`
**Migration risk:** Zero
**Test gate:** Race, forged code, all roles

---

#### Slice N2-3: Public Apply Attribution Snapshot

**Slug:** `hrp-v6-n2-aff-03-apply-attribution`
**Schema scope:**
- Additive columns on `candidate_submissions`:
  - `referrer_user_id` (nullable FK)
  - `referral_attribution_id` (nullable FK)
  - `referral_code_snapshot` (text)
  - `referral_captured_at` (timestamptz)
  - `referral_channel` (text)
- RPC signature change — **HIGH RISK**
**Migration risk:** HIGH — RPC + ACL
**Test gate:** Apply flow, RPC migration, upgrade path
**V6 P1 dependency:** LaborProfile FK available in main — no block

---

#### Slice N2-4: `LaborProfileHandlingAssignment` + 7-Day Clock

**Slug:** `hrp-v6-n2-aff-04-handling-assignment`
**Schema scope:**
- New table: `labor_profile_handling_assignments`
  - `laborProfileId` (FK → LaborProfile)
  - `assigneeUserId`, `assignedByUserId`
  - `source` (AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION)
  - `startsAt`, `expiresAt` (TIMESTAMPTZ, UTC storage)
  - `status` (ACTIVE | COMPLETED | EXPIRED | TRANSFERRED | REVOKED)
  - Partial unique: `(laborProfileId)` WHERE `status = 'ACTIVE'`
- API routes: assign, transfer, release, view pool
- Permission codes
**Migration risk:** Medium
**Test gate:** Race to assign, expiry, client override denied
**V6 P1 dependency:** LaborProfile FK available — no block

---

#### Slice N2-5: `CommissionBeneficiaryDecision` Authority Record

**Slug:** `hrp-v6-n2-aff-05-beneficiary-decision`
**Schema scope:**
- New table: `CommissionBeneficiaryDecision` (per Q7 R2 model)
  - `beneficiaryUserId` REQUIRED for ACTIVE decision
  - `outcome` field: `ACTIVE | UNRESOLVED`
  - Max one ACTIVE per (laborProfileId, assignmentId, milestone) — invariant enforced
  - Advisory lock on write
  - Correction/reversal preserves SUPERSEDED/REVERSED history
  - SYSTEM actor = valid User FK (not magic string)
- RLS: beneficiary thấy own; HR/ADMIN thấy all
**Migration risk:** Medium — unique constraint, FK
**Test gate:** Invariant, UNRESOLVED outcome, correction history

---

#### Slice N2-6: `beneficiaryUserId` Generalization + Commission Update

**Slug:** `hrp-v6-n2-aff-06-commission-beneficiary`
**Schema scope:**
- Additive column: `commission_ledger.beneficiary_user_id` (nullable FK)
- Additive column: `commission_debt.beneficiary_user_id` (nullable FK)
- Additive column: `ctv_withdrawal_requests.beneficiary_user_id` (nullable FK)
- Index: `(beneficiary_user_id, month, year, milestone)` on ledger
- **Legacy backfill — EXACT_SAFE classification only (per Q9b R2 tightening):**
  - Valid FK + provenance + writer semantics + no conflict + audit trail
  - UNRESOLVED: manual review
- Engine update: reads `CommissionBeneficiaryDecision` (N2-5)
**Migration risk:** Medium — backfill with classification
**Test gate:** EXACT_SAFE/UNRESOLVED classification, UNRESOLVED skip, credit creation

---

## 3. Unresolved Decisions — T0 Must Decide

### Decision Gate: Before N2-1 Implementation

| # | Decision | Options | Owner | Recommendation |
|---|---|---|---|---|
| Q1 | **AFF clock = calendar hay business days?** | A. Calendar / B. Business | Founder/T0 | **A** |
| Q2a | **Storage timezone?** | A. TIMESTAMPTZ UTC / B. Keep TIMESTAMP | T0 | **A** |
| Q2b | **Business clock timezone?** | A. Asia/Bangkok / B. Other | T0 | **A** |
| Q2c | **Cut-off time?** | A. 23:59:59.999 VN / B. Other | T0 | **A** |
| Q3a | **Holiday calendar owner?** | A. HR Admin / B. Hard-coded | T0 | **A** |
| Q3b | **Unconfigured fallback?** | A. Calendar days / B. Block | T0 | **A** |
| Q4 | **Clock start event?** | A. `openedAt` / B. Separate field | Founder/T0 | **A** |
| Q5 | **Pause/reset semantics?** | A. Clock RUNNING always / B. Pause | T0 | **A** |
| Q7a | **Decision as authority (R1 revised)?** | A. Yes, immutable record / B. Dynamic handler | T0 | **A** |
| Q7b | **beneficiaryUserId required for ACTIVE (R2)?** | A. Yes / B. Nullable allowed | T0 | **A** |
| Q7c | **UNRESOLVED outcome pattern (R2)?** | A. No active decision with null beneficiary / B. Create with null | T0 | **A** |
| Q7d | **SYSTEM actor = valid User FK (R2)?** | A. Yes, pre-created system User / B. Magic string | T0 | **A** |
| Q7e | **Invariant: max one ACTIVE per key (R2)?** | A. Yes / B. Allow multiple | T0 | **A** |
| Q8 | **Permission codes for handling?** | See proposal | T0 | Review |
| Q9a | **RPC change acceptable for N2-3?** | A. Yes / B. Defer | T0 | **A** |
| Q9b | **Legacy ctvId classification (R2 tightened)?** | EXACT_SAFE = FK + provenance + writer + no conflict + audit | T0 | Confirm criteria |
| Q10 | **V6 P1 capability available in main?** | ✅ Confirmed — no dependency | T0 | Acknowledge |

### Decisions Already Locked (no T0 action needed)

- `AFF-DEC-001` — All Users eligible
- `AFF-DEC-003` — Reuse `User.affCode`
- `AFF-DEC-010` — Cookie TTL 30 days, first-click wins
- `AFF-DEC-011` — 7-day protected window
- `AFF-DEC-012` — Expiry → Company Pool
- `AFF-DEC-013` — Referrer không giữ commission vô thời hạn
- `AFF-DEC-018` — `ReferralAttribution` on `LaborProfile`

---

## 4. Trade-offs Summary

| Decision | Simpler Option | Robust Option | Recommendation |
|---|---|---|---|
| Clock type | Calendar days | Business days | Calendar |
| Storage timezone | TIMESTAMP + env | TIMESTAMPTZ UTC | TIMESTAMPTZ UTC |
| Business clock | Asia/Bangkok | Other | Asia/Bangkok |
| Clock start | `openedAt` | Separate field | `openedAt` |
| Pause behavior | Clock always running | Pause on hold | Always running |
| Commission beneficiary | Dynamic handler read | Decision authority record | **Decision record (R1+R2)** |
| UNRESOLVED | Active decision with null beneficiary | No decision row, typed UNRESOLVED outcome | **No decision with null (R2)** |
| Legacy ctvId | Blanket backfill | EXACT_SAFE/UNRESOLVED classification | **EXACT_SAFE (R2 tightened)** |

---

## 5. Next Steps for T0

1. Review this document — confirm recommendations
2. Chốt 18 open decisions
3. Authorize Tier 1 to create N2-1 task (with N2-2 in parallel)
4. Set RPC change expectation for N2-3
5. Set UNRESOLVED count expectation for N2-6

---

## 6. Evidence Appendix

### File:line references

| Evidence | Location |
|---|---|
| `User.affCode` exists | `schema.prisma:141` |
| `PlacementCase` model | `schema.prisma:1460-1484` |
| `LaborProfile` model | `schema.prisma:1393` |
| `LaborProfileIntake` model | `schema.prisma:1421` |
| `EmploymentEpisode` model | `schema.prisma:1431` |
| V6 Phase 1A migrations in main | `prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/`, `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/` |
| `CommissionLedger.ctvId` | `schema.prisma:1231` |
| `CommissionEngine.milestone` | `engine.service.ts:75-80` |
| `Holiday` table | `schema.prisma:737-745` |
| `aff_plan.md v2.3` | `docs/V6/aff_plan.md:1-1080` |

### V6 Phase 1A Capability in origin/main

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  040000 tree 613b6fe6... prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  040000 tree a399344c... prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

Tables available: `labor_profiles`, `labor_profile_intakes`, `employment_episodes`
FK available: `candidate_submissions.labor_profile_id`
RLS applied: all three tables

---

**Discovery complete. Status: READY_FOR_T0_DECISION. Awaiting T0 decisions before N2 implementation.**
