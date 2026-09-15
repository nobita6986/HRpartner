# N2 AFF Policy & Contract Discovery

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f` (15 Sep 2026)
**Author:** S1
**Type:** READ-ONLY Discovery — no production code changes
**Status:** `READY_FOR_T0_DECISION` — awaiting T0 policy decisions before implementation

---

## 0. Executive Summary

N2 AFF (Admin Fee Clock) chưa có schema/service/API nào trong codebase. Tất cả đều greenfield. `aff_plan.md v2.3` đã chốt 18 decision, nhưng **10 câu hỏi vận hành cụ thể chưa được trả lời** — mỗi câu ảnh hưởng trực tiếp đến schema, migration, và implementation gate.

Tài liệu này trình bày evidence từ codebase, gaps, và recommendation cho từng câu. T0 cần chốt trước khi N2 implementation có thể bắt đầu.

---

## 1. Evidence Baseline

### 1.1 What exists for N2/AFF

| Component | Status | Evidence |
|---|---|---|
| `User.affCode` | ✅ Already exists | `schema.prisma:141` |
| `PlacementCase` | ✅ Foundation exists | `schema.prisma:1460-1484` |
| `PlacementCase.openedAt` | ✅ Clock anchor candidate | `schema.prisma:1465` |
| `LaborProfile` | ⚠️ EXISTS BUT NOT IN origin/main | `codex/hrp-v6-p1a-labor-profile-schema:3a33212` — see §1.2 |
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

### 1.2 V6 Phase 1 — Evidence of NOT in origin/main

**Critical finding:** `LaborProfile` exists in codebase but is **NOT yet merged into origin/main**.

Evidence:
```
$ git merge-base --is-ancestor 3a33212 origin/main
# Exit 1: V6 P1 schema commit (3a33212) is NOT an ancestor of origin/main (b91a33f)

$ git branch --contains 3a33212
  codex/hrp-v6-p1a-labor-profile-schema
  codex/hrp-v6-p1b-job-opening-posting-split
```

- `3a33212` ("feat(schema): V6 Phase 1A — LaborProfile schema THÊM-thuần") tồn tại trên branch `codex/hrp-v6-p1a-labor-profile-schema`
- Branch đó **chưa được merge vào origin/main** (tính đến b91a33f)
- `origin/main` b91a33f chứa `LaborProfile` model (`schema.prisma:1380-1400`) nhưng đây là legacy placeholder từ V6 roadmap, KHÔNG phải V6 Phase 1A production-ready model

**Điều này có nghĩa:**
- N2-3 (Apply Attribution) và N2-4 (Handling Assignment) **phụ thuộc V6 Phase 1A** phải đợi merge
- T0 cần chốt: V6 Phase 1A merge trước hay N2-1/N2-2 chạy song song?
- Recommendation: N2-1 và N2-2 không phụ thuộc LaborProfile → có thể chạy song song

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
  OPEN           // case mới mở
  IN_PROGRESS    // đang xử lý
  READY_TO_PLACE // sẵn sàng place
  CLOSED         // đã đóng (final)
}
// No RELEASED, TRANSFERRED, PAUSED, SUSPENDED
```

`ProjectAssignment` has `PAUSED | TRANSFERRED | CANCELLED` (`schema.prisma:647`) but that's for employment placement, not case handling.

### 1.6 Existing permissions catalog

```typescript:34:75:src/shared/auth/permission-catalog.ts
// No CAN_ASSIGN_HANDLING, CAN_TRANSFER_HANDLING, CAN_VIEW_HANDLING_POOL
// Only: CAN_MANAGE_PERMISSIONS, CAN_VIEW_UNASSIGNED_POOL, CAN_VIEW_WORKER_SENSITIVE, CAN_APPROVE_PAYROLL, etc.
```

---

## 2. The 10 Policy Questions

---

### Q1. AFF Clock — Calendar Days vs Business Days

**Question:** Nên dùng calendar days hay business days để tính AFF clock?

**Evidence:**
- `PlacementCase.openedAt` là clock anchor duy nhất hiện tại
- Codebase hiện tại **không có business-day logic** — tất cả date arithmetic đều dùng calendar days
- `Holiday` table tồn tại (attendance-only) nhưng không được consume bởi bất kỳ service nào
- Commission milestone engine dùng calendar days: `ageDays = ageMs / (24*60*60*1000)` (`engine.service.ts:75`)
- Referral Guard dùng calendar days: `cutoff.setDate(cutoff.getDate() - REFERRAL_GUARD_DAYS)` (`referral-guard.service.ts:48`)

**Gap:** Không có `computeBusinessDays()` utility. `Holiday` table chưa có VN public holiday data.

**Recommendation:** ⬅️ **T0 quyết định**

| Option | Pros | Cons |
|---|---|---|
| **A. Calendar days (Recommended for MVP)** | Đơn giản, consistent với existing codebase, predictable | Không skip VN holidays; người được giao có thể "bị tính phí" vào ngày nghỉ |
| **B. Business days** | Chính xác hơn với VN business practice | Cần `Holiday` population + `computeBusinessDays()` utility; phức tạp hơn; boundary cases khi nhiều ngày nghỉ liền |

**T0 Action Required:** Chọn A hoặc B. Nếu B: cần populate `Holiday` table với VN 2026 calendar và define `computeBusinessDays(start, end, holidays[])` utility.

---

### Q2. Timezone Canonical + Cut-off Time

**Question:** Dùng timezone nào làm canonical? Cut-off time là mấy giờ?

**Evidence:**
- **Tất cả** timestamps hiện tại là `TIMESTAMP(3)` không có timezone (PostgreSQL)
- **Một ngoại lệ duy nhất:** `ProjectAssignment.validFrom/validTo` dùng `@db.Timestamptz(3)` (`schema.prisma:648-651`) — được thêm bởi Tier 3 directive sau G17
- Không có `TIMEZONE` environment variable, không có `Asia/Bangkok` normalization
- All code dùng `new Date()` (server local time)

**Gap:** Không có timezone enforcement. Clock sẽ drift nếu server di chuyển hoặc DST change.

**Recommendation:** ⬅️ **T0 quyết định**

| Layer | Option | Description | Implementation |
|---|---|---|---|
| **Storage** | **UTC / TIMESTAMPTZ (Recommended)** | Store all AFF clock fields as `TIMESTAMPTZ(3)`, normalized to UTC | Add `@db.Timestamptz(3)` to all new AFF timestamp fields |
| **Business clock** | **Asia/Bangkok** | AFF clock tính theo VN business hours; "end of day" = 23:59:59.999 VN | Display layer converts UTC → Asia/Bangkok; storage always UTC |
| **Cut-off** | **23:59:59.999 Asia/Bangkok (Recommended)** | Midnight VN (16:59:59.999 UTC) | Use `Asia/Bangkok` timezone for business-day boundary calculations |

**Clarification on T0 revision:** Storage = UTC instant (TIMESTAMPTZ). Business clock = Asia/Bangkok. These are two separate layers.

**T0 Action Required:** Confirm storage = TIMESTAMPTZ UTC và business clock = Asia/Bangkok. Nếu muốn giữ TIMESTAMP: specify risk.

---

### Q3. Holiday Calendar Authority + Unconfigured Behavior

**Question:** Holiday calendar thuộc authority nào? Nếu chưa configured thì sao?

**Evidence:**
- `Holiday` model tồn tại (`schema.prisma:737-745`) với `date`, `name`, `type` (PUBLIC_HOLIDAY | WEEKEND | COMPANY_HOLIDAY)
- Hiện tại chỉ dùng cho attendance/timesheet, **không dùng cho business-day calculation**
- Không có service nào query `Holiday` table
- No default VN 2026 holiday data

**Gap:** Không có `HolidayService`, không có holiday-aware date utility.

**Recommendation:** ⬅️ **T0 quyết định**

| Decision | Option | Implication |
|---|---|---|
| **Calendar owner** | A. HR Admin (Recommended) — HR tạo/edit holiday entries qua admin UI | HR có quyền configure, có audit trail |
| | B. System — hard-coded VN holidays | Không linh hoạt, cần code change khi có ngày nghỉ bất thường |
| **Unconfigured behavior** | A. Fallback to calendar days — nếu no Holiday rows, dùng calendar days | Fail-safe, always works |
| | B. Block/Error — require at least one Holiday row | Strict, có thể break deployment |

**T0 Action Required:** Chọn owner (recommend A) và fallback behavior (recommend A). Nếu chọn business days ở Q1 mà chưa có holiday data: clock vẫn chạy calendar days cho đến khi HR populate holidays.

---

### Q4. Clock Start Event

**Question:** Clock bắt đầu chính xác từ `PlacementCase.openedAt` hay event khác?

**Evidence:**
- `PlacementCase.openedAt` được set bằng `new Date()` khi `openPlacementCase()` được gọi (`placement-case.service.ts:69`)
- `openPlacementCase()` được gọi từ `createCandidateSubmissionFromIntake()` trong intake flow (`intake-writer.service.ts:120`)
- No separate "open case" API route — placement case được tạo implicit khi intake submission
- `aff_plan.md §6.5.1` nói: "7 ngày tính từ lúc tạo/match LaborProfile" — `openedAt` = case creation = LaborProfile create/match trong flow hiện tại

**Gap:** Không có `affClockStart` field riêng. Clock start policy chưa được encode.

**Recommendation:** ✅ **Recommend: `PlacementCase.openedAt` là clock anchor**

| Option | Description | Risk |
|---|---|---|
| **A. `openedAt` = clock anchor (Recommended)** | Clock start = `openedAt`. Đơn giản, đã có field, consistent với existing flow. | Clock bắt đầu khi intake submission, không phải khi NLD express interest |
| **B. Separate `affClockStartAt` field** | Thêm field mới để tách clock start khỏi case creation | Thêm complexity; có thể drift giữa hai timestamps |

**T0 Action Required:** Confirm `openedAt` hay cần field mới. Nếu cần mới: specify khi nào clock nên bắt đầu (case creation? qualification? first assignment?).

---

### Q5. Pause/Reset Semantics

**Question:** Khi case được release hoặc transfer handling, clock có pause/reset không?

**Evidence:**
- Không có `RELEASED`, `TRANSFERRED`, `PAUSED`, `SUSPENDED` status trên `PlacementCase`
- `LaborProfileHandlingAssignment` chưa tồn tại — không có cơ chế giao/xóa handling assignment
- `ProjectAssignment` có `PAUSED | TRANSFERRED | CANCELLED` nhưng đó là employment placement, không phải case handling
- `aff_plan.md §14` nói "Ticket/Case có thể mở ngay trong cửa sổ 7 ngày" — nghĩa là clock không bị pause khi dispute

**Gap:** Không có clock-pause mechanism.

**Recommendation:** ✅ **Recommend: Clock RUNNING always, assignment có thời hạn — NOT pause**

| Option | Description | Implication |
|---|---|---|
| **A. Clock RUNNING always, assignment expires (Recommended)** | Clock chạy liên tục. Assignment có `expiresAt`. Hết hạn → profile vào Company Pool. Không pause. | Đơn giản, predictable. Clock 7 ngày không bị pause khi dispute. |
| **B. Clock PAUSES during certain statuses** | Clock tạm dừng khi case ở trạng thái dispute/hold. Resume khi resolve. | Phức tạp hơn. Cần `clockPausedAt` + `clockResumedAt` fields. |

**T0 Action Required:** Confirm Option A (Recommended) hay Option B (cần define rõ trigger statuses và pause logic).

---

### Q6. ReferralAttribution Immutability + Attribution Cardinality/History

**Question:** ReferralAttribution phải bất biến thế nào khi handler thay đổi?

**Evidence:**
- `ReferralAttribution` **chưa được implement** — greenfield
- `aff_plan.md §6.2` đã design model với `status: ACTIVE | CONSUMED | EXPIRED | REVOKED | SUPERSEDED`
- `aff_plan.md §10.4` nói: "ReferralAttribution giữ provenance; Handling Assignment giữ quyền/trách nhiệm xử lý có thời hạn; Commission Ledger snapshot beneficiary khi milestone đạt. Ba relation không được đồng nhất."
- `aff_plan.md §10.4` cũng nói: "Không route/client nào được phép truyền `referrerUserId`, `assigneeUserId` hoặc `beneficiaryUserId` mới chỉ vì thay đổi placement."
- `aff_plan.md AFF-DEC-018` đã chốt: `ReferralAttribution` treo trên `LaborProfile` bằng `laborProfileId` nullable + unique

**Attribution Cardinality Rule (T0-revised):**

> **Attribution history is immutable. Attribution does NOT change when handling assignment changes or expires.**

Specifically:
- When `LaborProfileHandlingAssignment` expires → `LaborProfile.referralAttributionId` remains pointing to the original attribution row
- When handler is transferred → `ReferralAttribution` row stays unchanged; new `LaborProfileHandlingAssignment` row created with new `assigneeUserId`
- When `LaborProfileHandlingAssignment` is revoked → attribution stays ACTIVE, assignment goes to TRANSFERRED/REVOKED status
- Attribution expiry and handling expiry are **two separate clocks** with different TTLs:
  - Attribution cookie TTL: 30 days (`AFF-DEC-010`)
  - Handling protected window: 7 days from LaborProfile create/match (`AFF-DEC-011`)

**Gap:** Không có model/service. Chỉ có design.

**Recommendation:** ✅ **Already decided by `AFF-DEC-018` + T0 clarification — no T0 action needed**

| Invariant | Rule | Implementation |
|---|---|---|
| Attribution source | IMMUTABLE — không sửa, không xóa, không reassign | No UPDATE/DELETE on `ReferralAttribution` rows; RLS deny |
| Attribution status | Có thể TRANSITION: ACTIVE → EXPIRED/SUPERSEDED/REVOKED, nhưng không UPDATE facts | Status field only; snapshot fields are READONLY |
| Attribution-handling coupling | NONE — attribution tồn tại độc lập với handling assignment | Attribution row outlasts any handling assignment row |
| Attribution history | Audit log cho mọi status transition | `OutboxEvent` hoặc dedicated audit table |

**Immutability enforcement:**
1. RLS policy: no UPDATE/DELETE on `referral_attributions` table
2. Application service: no setter for `referrerUserId`, `affiliateCodeSnapshot`, `firstClickedAt`, `expiresAt`
3. Only `status` field is mutable (via explicit transition method)
4. `laborProfileId` nullable FK: set once at `CONSUME` time, never cleared

**T0 Action Required:** Confirm this immutability + cardinality model. If confirmed, N2-1 schema must enforce it via DB constraint.

---

### Q7. CommissionBeneficiaryDecision — REVISED PER T0

**Question:** CommissionBeneficiaryDecision tách khỏi referral/handling ra sao?

**⚠️ T0 REVISION APPLIED:**

> CommissionBeneficiaryDecision phải là **authority/record độc lập**, không phải derived từ active handler. HandlingAssignment chỉ là input/candidate. Named decision phải snapshot đầy đủ: beneficiary, reason, source, evidence, decidedAt, actor, handlingAssignmentId(nullable).

### Current state (evidence)

- `CommissionLedger.ctvId` là CTV-specific, không generic
- `CommissionEngine` đọc `assignment.referrerId` và ghi ledger bằng `ctvId` (`engine.service.ts:239-242`)
- `aff_plan.md §6.5.1` nói: "`LaborProfileHandlingAssignment` xác định beneficiary candidate tại milestone"
- `aff_plan.md §11.1` nói: "Mọi User được lãnh đạo giao LaborProfile hợp lệ đều có thể trở thành beneficiary"

### Proposed CommissionBeneficiaryDecision model (NEW — not in current codebase)

```prisma
/// CommissionBeneficiaryDecision — authority record độc lập cho mỗi milestone.
/// Không derived từ active handler động. Mỗi decision là immutable snapshot.
model CommissionBeneficiaryDecision {
  id                      String    @id @default(uuid())
  laborProfileId          String    @map("labor_profile_id")
  assignmentId            String?   @map("assignment_id")              // ProjectAssignment.id
  handlingAssignmentId    String?   @map("handling_assignment_id")    // LaborProfileHandlingAssignment.id — nullable
  beneficiaryUserId       String    @map("beneficiary_user_id")        // Người được chốt
  source                  String    @map("source")                    // AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION | DIRECT
  reason                  String    @map("reason")                    // Typed reason: AFF_WINDOW | MANAGER_DECISION | DISPUTE_RESOLUTION | POOL_DEFAULT
  evidence                Json      @default("{}") @map("evidence")    // Snapshot: referrerUserId, referrerSnapshot, handlingSnapshot
  decidedAt               DateTime  @map("decided_at")                 // Khi nào decision được tạo
  actorId                 String    @map("actor_id")                   // User/system tạo decision
  milestone               String    @map("milestone")                 // RETAINED_30_DAYS | ...
  status                  String    @default("ACTIVE") @map("status")  // ACTIVE | SUPERSEDED | REVERSED
  supersededById          String?   @map("superseded_by_id")
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt      @map("updated_at")

  laborProfile      LaborProfile               @relation(fields: [laborProfileId], references: [id])
  beneficiary       User                       @relation("BeneficiaryUser", fields: [beneficiaryUserId], references: [id])
  actor             User                       @relation("DecisionActor", fields: [actorId], references: [id])
  supersededBy      CommissionBeneficiaryDecision? @relation("DecisionSupersession", fields: [supersededById], references: [id])
  supersessions     CommissionBeneficiaryDecision[] @relation("DecisionSupersession")

  @@unique([laborProfileId, assignmentId, milestone])
  @@index([laborProfileId, status])
  @@index([beneficiaryUserId, status])
  @@map("commission_beneficiary_decisions")
}
```

**Key differences from old Q7:**

| Aspect | OLD (dynamic handler) | NEW (CommissionBeneficiaryDecision) |
|---|---|---|
| **Authority** | Active `LaborProfileHandlingAssignment` is the source of truth | `CommissionBeneficiaryDecision` record is the source of truth |
| **Snapshot** | Engine reads handler at evaluation time | Decision snapshots: beneficiaryUserId, source, reason, evidence, actor, handlingAssignmentId |
| **Immutability** | Handler can change; beneficiary changes | Decision is immutable once created; superseding creates new row |
| **HandlingAssignment** | Only ACTIVE assignment counts | `handlingAssignmentId` nullable — can point to expired/revoked assignment as evidence |
| **Milestone coupling** | One beneficiary per milestone evaluation | `@@unique(laborProfileId, assignmentId, milestone)` — one decision per milestone per assignment |
| **Commission engine** | `resolveBeneficiaryFromActiveHandler()` | `resolveBeneficiaryFromDecision()` — reads most recent ACTIVE decision |

**Decision resolution flow (NEW):**

```
At milestone evaluation time:
1. Lookup most recent ACTIVE CommissionBeneficiaryDecision
   WHERE laborProfileId = X AND assignmentId = Y AND milestone = Z
2. If found: use decision.beneficiaryUserId
3. If NOT found:
   a. Evaluate candidate from LaborProfileHandlingAssignment (ACTIVE + not expired)
   b. Create CommissionBeneficiaryDecision with:
      - beneficiaryUserId = assigneeUserId (or null if no active handler)
      - source = 'AFF_WINDOW' | 'POOL_DEFAULT'
      - reason = 'NO_ACTIVE_HANDLER' if null
      - evidence = { handlerSnapshot }
      - handlingAssignmentId = assignment?.id
      - decidedAt = now
      - actorId = 'SYSTEM'
   c. Commission engine uses this decision
```

**Beneficiary derivation hierarchy:**

```
1. Explicit CommissionBeneficiaryDecision (authority record) — highest priority
   └── Superseded decision → superseding decision (via supersededById)
2. Active LaborProfileHandlingAssignment (input/candidate only)
   └── Only used if no explicit decision exists
3. Company Pool default (system)
   └── reason = 'POOL_DEFAULT', beneficiaryUserId = null
```

**T0 Action Required:**
- Confirm `CommissionBeneficiaryDecision` as authority record (not dynamic handler read)
- Confirm `handlingAssignmentId` nullable (evidence only, not FK dependency)
- Confirm decision is created when no active handler (vs. skipping credit)
- Confirm `@@unique(laborProfileId, assignmentId, milestone)` as idempotency key

---

### Q8. Role/Permission/Data-Scope

**Question:** Role và permission nào cho assign, transfer, release, và beneficiary decision?

**Evidence:**
- `PlacementCase` RLS: HR_MANAGER + HR_STAFF + ADMIN only (`n1_placement_case_rls` migration)
- `CommissionLedger` RLS: CTV đọc own rows; ADMIN/ACCOUNTANT/DIRECTOR write
- No permissions for handler assignment: không có `CAN_ASSIGN_HANDLING`, `CAN_TRANSFER_HANDLING`, `CAN_VIEW_HANDLING_POOL`
- `aff_plan.md §8` (role/permission) đã define concept nhưng không specify permission codes

**Gap:** Không có handler assignment permissions. Không có Company Pool visibility.

**Recommendation:** ⬅️ **T0 quyết định — key security boundary**

| Action | Permission | Data Scope |
|---|---|---|
| **Assign handler to profile** | `CAN_ASSIGN_HANDLING` | MANAGER: có thể assign cho team member; HR: assign cho anyone; ADMIN: assign cho anyone |
| **Transfer handling** | `CAN_TRANSFER_HANDLING` | Same as assign; chỉ assignee hiện tại HOẶC MANAGER/HR/ADMIN |
| **Release (về Company Pool)** | `CAN_RELEASE_HANDLING` | Chỉ assignee tự release HOẶC MANAGER/HR/ADMIN |
| **Create beneficiary decision** | `CAN_CREATE_BENEFICIARY_DECISION` | HR/ADMIN for disputes; SYSTEM for automatic decision at milestone |
| **View Company Pool** | `CAN_VIEW_HANDLING_POOL` | MANAGER: xem team profiles; HR: xem all |
| **View own assignments** | Implicit (self) | User chỉ thấy assignment mình là assignee |

**Permission code proposal:**
```typescript
CAN_ASSIGN_HANDLING           // Ai có thể giao profile cho handler
CAN_TRANSFER_HANDLING          // Ai có thể chuyển handler
CAN_RELEASE_HANDLING           // Ai có thể đưa profile về pool
CAN_VIEW_HANDLING_POOL         // Ai có thể xem profiles không ai xử lý
CAN_CREATE_BENEFICIARY_DECISION // Ai/system có thể tạo decision record
CAN_MANAGE_HANDLING_ADMIN      // ADMIN: full override
```

**RLS proposal:**
```sql
-- LaborProfileHandlingAssignment
CREATE POLICY hrp_handling_assignment_scope ON labor_profile_handling_assignments
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = assignee_user_id  -- assignee thấy assignment của mình
  );

-- CommissionBeneficiaryDecision
CREATE POLICY hrp_beneficiary_decision_scope ON commission_beneficiary_decisions
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = beneficiary_user_id  -- beneficiary thấy decision của mình
  );
```

**T0 Action Required:** Chốt permission codes và data scope matrix. Đặc biệt quan trọng: ai có thể override/reassign khi có dispute?

---

### Q9. Inventory Reuse + N2 Conflicts

**Question:** Inventory hiện tại có thể tái sử dụng gì, và có conflict gì với N2?

**Evidence from codebase survey:**

| Component | N2 Reuse | Conflict Risk | Resolution |
|---|---|---|---|
| `User.affCode` | ✅ Reuse mandatory | Low | Already there; cần harden issuance |
| `PlacementCase.openedAt` | ✅ Clock anchor | Low | Additive field |
| `LaborProfile` | ⚠️ NOT in origin/main | HIGH | Wait for V6 P1 merge; see §1.2 |
| `ReferralGuard.applyOverride()` | ✅ Block-code logic reusable | Medium | R1/R2/R3 rules có thể conflict với new AFF attribution |
| `CommissionEngine.evaluateMilestones()` | ✅ Milestone pattern reusable | Medium | Cần update để đọc `CommissionBeneficiaryDecision` (Q7 revised) |
| `CommissionLedger.ctvId` | ⚠️ CTV-specific | High | Additive `beneficiaryUserId`; legacy columns giữ compatibility |
| `SourceClaim.ctvId/vendorId` | ⚠️ Legacy | High | Additive `referrerUserId`; legacy columns giữ compatibility |
| `ProjectAssignment.referrerId` | ✅ Source field | Low | Giữ nguyên; placement derives from accepted SourceClaim |
| `intake-writer.service.ts` | ✅ Intake flow | Low | Preserve attribution khi staff-assisted intake |
| `candidate_submissions` RPC | ⚠️ SECURITY DEFINER | High | RPC signature phải thay đổi — impact assessment needed |
| `Holiday` table | ✅ VN holiday data | Low | Population + consumption by business-day clock |
| `outbox.service.ts` pattern | ✅ Audit events | Low | Tái sử dụng cho handling assignment + decision events |

**Highest-risk conflicts:**

1. **RPC signature change (`hrp_public_apply_submission`)**: Đây là critical path cho public apply. Thay đổi signature cần:
   - Migration to update function
   - Re-grant ACL
   - Full LIVE test với existing rows
   - Rollback plan
   - **Recommendation:** N2-3 slice phải có dedicated migration test với production-equivalent data

2. **Commission engine beneficiary**: Engine cần đọc `CommissionBeneficiaryDecision` (Q7 revised) thay vì dynamic handler. Breaking change:
   ```typescript
   // OLD: resolve from active handler
   const beneficiary = await resolveActiveHandler(laborProfileId)
   
   // NEW: resolve from authority decision
   const decision = await resolveBeneficiaryDecision(laborProfileId, assignmentId, milestone)
   const beneficiary = decision?.beneficiaryUserId
   ```

3. **CTV compat window**: Backfill `beneficiaryUserId` cần phân loại rõ ràng:
   - **EXACT_SAFE**: row có valid FK tới User và `ctvId` semantics rõ ràng → backfill OK
   - **UNRESOLVED**: row có `ctvId` nhưng không có FK đến User hoặc semantics không rõ → skip, require manual resolution

**T0 Action Required:** Xác nhận RPC change acceptable cho N2-3. Xác nhận CTV compatibility window classification (EXACT_SAFE vs UNRESOLVED).

---

### Q10. Proposed Vertical Slices

**Question:** Decomposition N2 thành vertical slices nhỏ?

**Recommendation:** 6 slices, ordered by dependency:

---

#### Slice N2-1: `ReferralAttribution` Foundation
**Slug:** `hrp-v6-n2-aff-01-attribution-foundation`
**V6 Phase 1 dependency:** None (can run in parallel)
**Schema scope:**
- New table: `ReferralAttribution` per `aff_plan.md §6.2` + T0 Q6 immutability rules
  - `id`, `referrerUserId`, `affiliateCodeSnapshot`, `channel`, `firstClickedAt`, `expiresAt`, `status`, `laborProfileId` (nullable FK)
  - Unique index on `laborProfileId` (nullable) — immutable once set
  - Index: `(referrerUserId, firstClickedAt)`, `(status, expiresAt)`
- RLS: referrer thấy own rows; ADMIN/HR_MANAGER/HR_STAFF thấy all
- No new API routes
**Migration risk:** Low — additive, no existing rows affected
**Test gate:** Unique constraint, RLS, immutability enforcement, no PII leak

---

#### Slice N2-2: Link Capture + Shared Self-Service
**Slug:** `hrp-v6-n2-aff-02-link-capture`
**V6 Phase 1 dependency:** None (can run in parallel with N2-1)
**Schema scope:**
- No new tables
- New API: `GET /api/me/affiliate-link` (reuse existing `User.affCode`)
- New route: `GET /r/:code` (redirect + attribution capture)
- New cookie: `hrp_aff` signed HttpOnly, 30-day TTL
- Feature flags: `AFFILIATE_LINK_ISSUANCE_ENABLED`, `AFFILIATE_CAPTURE_ENABLED`
**Migration risk:** Zero — pure application logic
**Test gate:** Two users race for same browser → deterministic winner; forged code → no attribution

---

#### Slice N2-3: Public Apply Attribution Snapshot
**Slug:** `hrp-v6-n2-aff-03-apply-attribution`
**V6 Phase 1 dependency:** **REQUIRES V6 Phase 1A merge** (LaborProfile + CandidateSubmission.laborProfileId)
**Evidence of dependency status:** See §1.2 — V6 P1 is NOT yet in origin/main
**Schema scope:**
- Additive columns on `candidate_submissions`:
  - `referrer_user_id` (nullable FK)
  - `referral_attribution_id` (nullable FK)
  - `referral_code_snapshot` (text)
  - `referral_captured_at` (timestamptz)
  - `referral_channel` (text)
- RPC `hrp_public_apply_submission` signature change — **HIGH RISK**
- RLS: public can write via RPC; internal can read
**Migration risk:** HIGH — RPC + ACL change, needs LIVE test
**Test gate:** Apply flow creates correct snapshot; RPC migration tested on upgrade path
**Blocking dependency:** Must wait for `codex/hrp-v6-p1a-labor-profile-schema` to merge into main

---

#### Slice N2-4: `LaborProfileHandlingAssignment` + 7-Day Clock
**Slug:** `hrp-v6-n2-aff-04-handling-assignment`
**V6 Phase 1 dependency:** **REQUIRES V6 Phase 1A merge** (LaborProfile FK)
**Schema scope:**
- New table: `labor_profile_handling_assignments`:
  - `id`, `laborProfileId` (FK → LaborProfile), `assigneeUserId`, `assignedByUserId`
  - `source` (AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION)
  - `startsAt`, `expiresAt` (TIMESTAMPTZ, UTC storage, Asia/Bangkok business clock)
  - `status` (ACTIVE | COMPLETED | EXPIRED | TRANSFERRED | REVOKED)
  - `reason`, `previousAssignmentId`, timestamps
  - Partial unique: `(laborProfileId)` WHERE `status = 'ACTIVE'` — at-most-one-active invariant
- RLS: assignee thấy own; ADMIN/HR_MANAGER/HR_STAFF thấy all
- API routes: assign, transfer, release, view pool
- Permission codes: `CAN_ASSIGN_HANDLING`, `CAN_TRANSFER_HANDLING`, `CAN_RELEASE_HANDLING`, `CAN_VIEW_HANDLING_POOL`
**Migration risk:** Medium — new table, FK constraints
**Test gate:** Two managers race to assign same profile → only one wins; clock expires → profile in pool; client cannot override assignee
**Blocking dependency:** Must wait for V6 P1 LaborProfile model

---

#### Slice N2-5: `CommissionBeneficiaryDecision` Authority Record
**Slug:** `hrp-v6-n2-aff-05-beneficiary-decision`
**V6 Phase 1 dependency:** Requires N2-4 (HandlingAssignment as input)
**Schema scope:**
- New table: `CommissionBeneficiaryDecision` (per Q7 revised model above)
  - `id`, `laborProfileId`, `assignmentId`, `handlingAssignmentId` (nullable)
  - `beneficiaryUserId`, `source`, `reason`, `evidence` (JSON snapshot)
  - `decidedAt`, `actorId`, `milestone`, `status`
  - `@@unique([laborProfileId, assignmentId, milestone])`
  - Supersession chain via `supersededById`
- RLS: beneficiary thấy own decisions; HR/ADMIN thấy all
- Service: `createBeneficiaryDecision()`, `resolveBeneficiaryDecision()`
**Migration risk:** Medium — new table with unique constraint
**Test gate:** Decision created per milestone; superseding creates new row; expired handler assignment preserved as evidence

---

#### Slice N2-6: `beneficiaryUserId` Generalization + Commission Update
**Slug:** `hrp-v6-n2-aff-06-commission-beneficiary`
**V6 Phase 1 dependency:** Requires N2-5 (Decision as authority)
**Schema scope:**
- Additive column: `commission_ledger.beneficiary_user_id` (nullable FK → users)
- Additive column: `commission_debt.beneficiary_user_id` (nullable FK → users)
- Additive column: `ctv_withdrawal_requests.beneficiary_user_id` (nullable FK)
- Index: `(beneficiary_user_id, month, year, milestone)` on ledger
- **Legacy ctvId backfill classification (T0-revised):**
  - **EXACT_SAFE**: `ctvId` có valid FK tới User table → backfill `beneficiary_user_id = ctvId`
  - **UNRESOLVED**: `ctvId` không có FK hoặc semantics không rõ → skip, log for manual review
- Service update: `CommissionEngine` reads `CommissionBeneficiaryDecision` (N2-5) instead of dynamic handler
**Migration risk:** Medium — backfill with classification, FK validation
**Test gate:** Milestone creates credit for correct beneficiary from decision; concurrent milestone → exactly one credit; legacy ctvId rows handled correctly

---

### Slice Dependency Graph

```
N2-1 (Attribution Foundation)
    ↓
N2-2 (Link Capture) [can run in parallel with N2-1]
    ↓
[N2-3 + N2-4] [requires V6 Phase 1A merge]
    ↓
N2-5 (Beneficiary Decision) [requires N2-4]
    ↓
N2-6 (Commission Beneficiary) [requires N2-5]
```

**V6 Phase 1 dependency clarification:**
- N2-1 và N2-2: **No V6 P1 dependency** → can run immediately
- N2-3: Requires `LaborProfile` + `CandidateSubmission.laborProfileId` FK
- N2-4: Requires `LaborProfile` FK for `laborProfileHandlingAssignments`
- N2-5: Requires N2-4 (HandlingAssignment as input to decision)
- N2-6: Requires N2-5 (Decision as authority for engine)

---

## 3. Unresolved Decisions — T0 Must Decide

### Decision Gate: Before N2-1 Implementation

| # | Decision | Options | Owner | Recommendation |
|---|---|---|---|---|
| Q1 | **AFF clock = calendar hay business days?** | A. Calendar / B. Business | Founder/T0 | **A** — simpler |
| Q2a | **Storage timezone?** | A. TIMESTAMPTZ UTC (Recommended) / B. Keep TIMESTAMP | T0 | **A** |
| Q2b | **Business clock timezone?** | A. Asia/Bangkok (Recommended) / B. Other | T0 | **A** |
| Q2c | **Cut-off time?** | A. 23:59:59.999 VN (Recommended) / B. Other | T0 | **A** |
| Q3a | **Holiday calendar owner?** | A. HR Admin (Recommended) / B. Hard-coded | T0 | **A** |
| Q3b | **Unconfigured fallback?** | A. Fallback to calendar (Recommended) / B. Block | T0 | **A** |
| Q4 | **Clock start event?** | A. `openedAt` (Recommended) / B. Separate field | Founder/T0 | **A** — confirm |
| Q5 | **Pause/reset semantics?** | A. Clock RUNNING always (Recommended) / B. Pause on statuses | T0 | **A** |
| Q7a | **CommissionBeneficiaryDecision as authority?** | A. Yes, immutable record (Recommended) / B. No, dynamic handler read | T0 | **A** — per T0 revision |
| Q7b | **handlingAssignmentId nullable?** | A. Nullable, evidence only (Recommended) / B. Required FK | T0 | **A** |
| Q7c | **No handler = skip credit or create decision?** | A. Create decision with null beneficiary (Recommended) / B. Skip credit | T0 | **A** |
| Q8 | **Permission codes for handling?** | See proposal above | T0 | Review and confirm |
| Q9a | **RPC change acceptable for N2-3?** | A. Yes (Recommended) / B. Defer | T0 | **A** with dedicated test plan |
| Q9b | **Legacy ctvId backfill classification?** | EXACT_SAFE / UNRESOLVED | T0 | Classify per Q9 evidence |
| Q10 | **N2-1/N2-2 can run before V6 P1 merge?** | A. Yes, no dep (Recommended) / B. No, wait for merge | T0 | **A** |

### Decisions Already Locked (no T0 action needed)

- `AFF-DEC-001` — All Users eligible
- `AFF-DEC-003` — Reuse `User.affCode`
- `AFF-DEC-010` — Cookie TTL 30 days, first-click wins
- `AFF-DEC-011` — 7-day protected window from LaborProfile create/match
- `AFF-DEC-012` — Expiry → Company Pool, manager reassign
- `AFF-DEC-013` — Referrer không giữ commission vô thời hạn
- `AFF-DEC-018` — `ReferralAttribution` treo trên `LaborProfile`

---

## 4. Trade-offs Summary

| Decision | Simpler Option | Robust Option | Recommendation |
|---|---|---|---|
| Clock type | Calendar days | Business days | Calendar for MVP |
| Storage timezone | TIMESTAMP + env | TIMESTAMPTZ UTC | TIMESTAMPTZ |
| Business clock | Asia/Bangkok | Other | Asia/Bangkok |
| Clock start | `openedAt` | Separate field | `openedAt` |
| Pause behavior | Clock always running | Pause on hold | Always running |
| Handler assignment | Additive new table | Extend existing | Additive new table |
| Commission beneficiary | Dynamic handler read | CommissionBeneficiaryDecision record | **Decision record (T0 revision)** |
| Legacy ctvId | Blanket backfill | Manual classification | **EXACT_SAFE / UNRESOLVED** |

**Simplicity wins:** Every complex choice adds schema surface, migration complexity, and testing burden. The MVP should pick the simpler option and add complexity only when business requirement demands it.

**Exception:** Q7 (CommissionBeneficiaryDecision as authority record) is the robust option but is **required by T0 revision** — it is not optional.

---

## 5. Next Steps for T0

1. **Review this document** — confirm or override recommendations in §3
2. **Unlock N2-1 + N2-2** — N2-1/N2-2 have no V6 P1 dependency, can start immediately after Q decisions
3. **Track V6 Phase 1A merge** — N2-3 and N2-4 must wait for `codex/hrp-v6-p1a-labor-profile-schema` merge
4. **Set RPC change expectation** — N2-3 requires coordination with ops for LIVE test
5. **Classify legacy ctvId rows** — N2-6 needs pre-assessment of EXACT_SAFE vs UNRESOLVED counts

---

## 6. Evidence Appendix

### File:line references

| Evidence | Location |
|---|---|
| `User.affCode` exists | `schema.prisma:141` |
| `PlacementCase` model | `schema.prisma:1460-1484` |
| `openPlacementCase()` sets `openedAt` | `placement-case.service.ts:67-70` |
| `intake-writer` creates case | `intake-writer.service.ts:120` |
| `PlacementCase` RLS | `n1_placement_case_rls` migration |
| `CommissionLedger.ctvId` | `schema.prisma:1231` |
| `CommissionEngine.milestone` | `engine.service.ts:75-80` |
| `REFERRAL_GUARD_DAYS` calendar | `referral-guard.service.ts:48` |
| `Holiday` table | `schema.prisma:737-745` |
| `ProjectAssignment.referrerId` | `schema.prisma:658` |
| `aff_plan.md v2.3` | `docs/V6/aff_plan.md:1-1080` |

### V6 Phase 1 merge status

| Commit | Branch | In origin/main? | Evidence |
|---|---|---|---|
| `3a33212` V6 Phase 1A schema | `codex/hrp-v6-p1a-labor-profile-schema` | ❌ NO | `git merge-base --is-ancestor 3a33212 origin/main` → exit 1 |
| `a4ab9f0` Phase 1A ACCEPTED | `codex/hrp-v6-p1b-job-opening-posting-split` | ❌ NO | Branch not merged |
| `4e7b8fe` N3 Placement model | `origin/main` | ✅ YES | In main at b91a33f |
| `f7f85bb` N1 PlacementCase foundation | `origin/main` | ✅ YES | In main at b91a33f |

### Migration inventory (relevant)

| Migration | Date | N2 Relevance |
|---|---|---|
| `v6_phase1a_labor_profile_schema` | 20260908001 | **N2-3/4 dependency — NOT yet merged** |
| `v6_phase1a_labor_profile_rls` | 20260908150001 | **N2-3/4 dependency — NOT yet merged** |
| `n1_placement_case_foundation` | 20260912140411 | N2 base |
| `n1_placement_case_rls` | 20260912140412 | N2 base |
| `p2_commission_schema` | 20260819083254 | N2-6 base |
| `p2_commission_rls` | 20260819104700 | N2-6 base |

---

**Discovery complete. Status: READY_FOR_T0_DECISION. Awaiting T0 policy decisions before N2-1 implementation can begin.**
