# N2 AFF Policy & Contract Discovery

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f` (15 Sep 2026)
**Author:** S1
**Type:** READ-ONLY Discovery — no production code changes
**Status:** `DRAFT` — awaiting T0 policy decisions before implementation

---

## 0. Executive Summary

N2 AFF (Admin Fee Clock) chưa có schema/service/API nào trong codebase. Tất cả đều greenfield. `aff_plan.md v2.3` đã chốt kiến trúc và 18 decision, nhưng **10 câu hỏi vận hành cụ thể chưa được trả lời** — mỗi câu ảnh hưởng trực tiếp đến schema, migration, và implementation gate.

Tài liệu này trình bày evidence từ codebase, gaps, và recommendation cho từng câu. T0 cần chốt trước khi N2 implementation có thể bắt đầu.

---

## 1. Evidence Baseline

### 1.1 What exists for N2/AFF

| Component | Status | Evidence |
|---|---|---|
| `User.affCode` | ✅ Already exists | `schema.prisma:141` |
| `PlacementCase` | ✅ Foundation exists | `schema.prisma:1460-1484` |
| `PlacementCase.openedAt` | ✅ Clock anchor candidate | `schema.prisma:1465` |
| `LaborProfile` | ✅ V6 Phase 1 done | `schema.prisma:1380-1400` |
| `Holiday` table | ✅ Exists, attendance-only | `schema.prisma:737-745` |
| Commission ledger | ✅ CTV-specific | `schema.prisma:1229-1260` |
| Commission engine | ✅ 30/60/90-day milestones | `engine.service.ts:75-80` |
| `ProjectAssignment.referrerId` | ✅ Legacy referral | `schema.prisma:658` |
| `ReferralAttribution` | ❌ NOT IMPLEMENTED | Greenfield |
| `LaborProfileHandlingAssignment` | ❌ NOT IMPLEMENTED | Greenfield |
| `beneficiaryUserId` | ❌ NOT IMPLEMENTED | Greenfield |
| Handler assignment service | ❌ NOT IMPLEMENTED | Greenfield |
| AFF-specific API routes | ❌ NOT IMPLEMENTED | Greenfield |

### 1.2 No timezone handling anywhere

```sql
-- All timestamps are TIMESTAMP(3), not TIMESTAMPTZ
openedAt       DateTime  @default(now()) @map("opened_at")     -- schema.prisma:1465
validFrom      DateTime  @map("valid_from") @db.Timestamptz(3) -- ONLY exception: ProjectAssignment.validFrom/To
```

**Zero** timezone fields, zero `TIMEZONE` config, zero `tz`/`utc`/`offset` in any migration.

### 1.3 No business-day logic

`REFERRAL_GUARD_DAYS` uses pure calendar arithmetic:
```typescript:48:src/domains/staffing/referral-guard.service.ts
export const REFERRAL_GUARD_DAYS = Number(process.env['REFERRAL_GUARD_DAYS'] ?? 7);
// Used as: cutoff.setDate(cutoff.getDate() - REFERRAL_GUARD_DAYS)
```

### 1.4 No pause/reset on PlacementCase

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

### 1.5 Existing permissions catalog

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

| Option | Description | Implementation |
|---|---|---|
| **A. Asia/Bangkok (TIMESTAMPTZ) — Recommended** | Tất cả AFF clock fields dùng `TIMESTAMPTZ`, normalize to Asia/Bangkok | Add `@db.Timestamptz(3)` to `PlacementCase.openedAt` và new `LaborProfileHandlingAssignment.startsAt/expiresAt`; store as UTC |
| **B. Keep as TIMESTAMP, enforce server TZ** | Giữ nguyên `TIMESTAMP`, enforce server timezone qua env | Add `APP_TIMEZONE=Asia/Bangkok` env var, validate on startup |

**Cut-off time question:** Nếu clock tính theo ngày, "end of day" là mấy giờ VN?
- **Default:** 23:59:59.999 VN (midnight VN = 16:59:59.999 UTC)
- **Option:** 00:00:00 next day VN (cùng instant, khác boundary)

**T0 Action Required:** Chọn A hoặc B. Khuyến nghị A vì future-proof hơn cho multi-region.

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

**Rationale:** `openedAt` đã là de-facto clock anchor trong flow. Việc tách ra field riêng chỉ cần thiết nếu business muốn clock bắt đầu muộn hơn case creation (ví dụ: khi NLD qualify, hoặc khi first assignment được tạo). Nếu không có yêu cầu đặc biệt, dùng `openedAt`.

**T0 Action Required:** Confirm `openedAt` hay cần field mới. Nếu cần mới: specify khi nào clock nên bắt đầu (case creation? qualification? first assignment?).

---

### Q5. Pause/Reset Semantics

**Question:** Khi case được release hoặc transfer handling, clock có pause/reset không?

**Evidence:**
- Không có `RELEASED`, `TRANSFERRED`, `PAUSED`, `SUSPENDED` status trên `PlacementCase`
- `LaborProfileHandlingAssignment` chưa tồn tại — không có cơ chế giao/xóa handling assignment
- `ProjectAssignment` có `PAUSED | TRANSFERRED | CANCELLED` nhưng đó là employment placement, không phải case handling
- `aff_plan.md §6.5.1` nói: "hết 7 ngày chưa thành công, profile về Company Pool; lãnh đạo có thể giao lại cho User bất kỳ" — có nghĩa là assignment có thời hạn, không phải pause clock

**Gap:** Không có clock-pause mechanism. Không có `LaborProfileHandlingAssignment` model.

**Recommendation:** ✅ **Recommend: Clock RUNNING, assignment có thời hạn — NOT pause**

| Option | Description | Implication |
|---|---|---|
| **A. Clock RUNNING always, assignment expires (Recommended)** | Clock chạy liên tục. Assignment có `expiresAt`. Hết hạn → profile vào Company Pool. Không pause. | Đơn giản, predictable. Clock 7 ngày không bị pause khi dispute. |
| **B. Clock PAUSES during certain statuses** | Clock tạm dừng khi case ở trạng thái dispute/hold. Resume khi resolve. | Phức tạp hơn. Cần `clockPausedAt` + `clockResumedAt` fields. Có edge cases khi pause kéo dài. |

**Rationale:** `aff_plan.md §14` nói "Ticket/Case có thể mở ngay trong cửa sổ 7 ngày" — nghĩa là clock không bị pause khi dispute. Assignment hết hạn → profile về pool → manager giao lại với thời hạn mới.

**Pause chỉ hợp lý nếu:** case bị tạm ngưng toàn bộ (không ai xử lý được, không phải vì hết assignment window mà vì business freeze).

**T0 Action Required:** Confirm Option A (Recommended) hay Option B (cần define rõ trigger statuses và pause logic).

---

### Q6. ReferralAttribution Immutability

**Question:** ReferralAttribution phải bất biến thế nào khi handler thay đổi?

**Evidence:**
- `ReferralAttribution` **chưa được implement** — greenfield
- `aff_plan.md §6.2` đã design model với `status: ACTIVE | CONSUMED | EXPIRED | REVOKED | SUPERSEDED`
- `aff_plan.md §10.4` nói rõ: "ReferralAttribution giữ provenance; Handling Assignment giữ quyền/trách nhiệm xử lý có thời hạn; Commission Ledger snapshot beneficiary khi milestone đạt. Ba relation không được đồng nhất."
- `aff_plan.md §10.4` cũng nói: "Không route/client nào được phép truyền `referrerUserId`, `assigneeUserId` hoặc `beneficiaryUserId` mới chỉ vì thay đổi placement."
- `aff_plan.md AFF-DEC-018` đã chốt: `ReferralAttribution` treo trên `LaborProfile` bằng `laborProfileId` nullable + unique

**Gap:** Không có model/service. Chỉ có design.

**Recommendation:** ✅ **Already decided by `AFF-DEC-018` — no T0 action needed**

| Invariant | Rule | Implementation |
|---|---|---|
| Attribution source | IMMUTABLE — không sửa, không xóa, không reassign | No UPDATE/DELETE on `ReferralAttribution` rows; RLS deny |
| Attribution status | Có thể TRANSITION: ACTIVE → EXPIRED/SUPERSEDED/REVOKED, nhưng không UPDATE facts | Status field only; snapshot fields are READONLY |
| Multiple clicks | SUPERSEDED: second valid click → first row SUPERSEDED, new row ACTIVE | `firstClickedAt` + `expiresAt` immutable |
| Attribution history | Audit log cho mọi status transition | `OutboxEvent` hoặc dedicated audit table |

**Immutability enforcement:**
1. RLS policy: no UPDATE/DELETE on `referral_attributions` table
2. Application service: no setter for `referrerUserId`, `affiliateCodeSnapshot`, `firstClickedAt`, `expiresAt`
3. Only `status` field is mutable (via explicit transition method)

**T0 Action Required:** None — already locked by `AFF-DEC-018`. Confirm this is understood.

---

### Q7. CommissionBeneficiaryDecision Separation

**Question:** CommissionBeneficiaryDecision tách khỏi referral/handling ra sao?

**Evidence:**
- `CommissionLedger.ctvId` là CTV-specific, không generic
- `CommissionEngine` đọc `assignment.referrerId` và ghi ledger bằng `ctvId` (`engine.service.ts:239-242`)
- `aff_plan.md §6.5.1` nói: "`LaborProfileHandlingAssignment` xác định beneficiary candidate tại milestone"
- `aff_plan.md §6.5.1` cũng nói: "Referrer không giữ quyền hưởng hoa hồng vô thời hạn" (`AFF-DEC-013`)
- `aff_plan.md §11.1` nói: "Mọi User được lãnh đạo giao LaborProfile hợp lệ đều có thể trở thành beneficiary, dù không phải referrer ban đầu"

**Gap:** Không có `beneficiaryUserId` field. Không có `LaborProfileHandlingAssignment` model. Commission engine chưa resolve beneficiary từ handling assignment.

**Recommendation:** ✅ **Recommend: additive `beneficiaryUserId` + handling assignment resolution**

| Layer | Current State | N2 Addition |
|---|---|---|
| Source/Referral | `ReferralAttribution.referrerUserId` (immutable) | New model |
| Handling Assignment | None | New `LaborProfileHandlingAssignment` with `assigneeUserId`, `status`, `expiresAt` |
| Beneficiary | `CommissionLedger.ctvId` (CTV-only) | Additive `beneficiaryUserId` nullable FK → `users` |
| Resolution | Engine reads `assignment.referrerId` | Engine reads active `LaborProfileHandlingAssignment` at milestone time |

**Decision chain:**
```
At milestone evaluation time:
1. Find LaborProfile from ProjectAssignment.workerId
2. Find ACTIVE LaborProfileHandlingAssignment WHERE laborProfileId = X AND status = 'ACTIVE' AND expiresAt > now
3. beneficiaryUserId = assigneeUserId from that assignment
4. If no active assignment → skip credit with typed reason (POOL_NO_HANDLER)
```

**T0 Action Required:** Confirm this separation model. Key question: nếu không có active handling assignment (profile đang ở Company Pool), commission có được credit cho ai không, hay skip?

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
| **Beneficiary decision** | System derives — không có human decision point | Engine tự resolve từ active assignment |
| **View Company Pool** | `CAN_VIEW_HANDLING_POOL` | MANAGER: xem team profiles; HR: xem all |
| **View own assignments** | Implicit (self) | User chỉ thấy assignment mình là assignee |

**Permission code proposal:**
```typescript
CAN_ASSIGN_HANDLING      // Ai có thể giao profile cho handler
CAN_TRANSFER_HANDLING    // Ai có thể chuyển handler
CAN_RELEASE_HANDLING     // Ai có thể đưa profile về pool
CAN_VIEW_HANDLING_POOL   // Ai có thể xem profiles không ai xử lý
CAN_MANAGE_HANDLING_ADMIN // ADMIN: full override
```

**RLS proposal:**
```sql
-- LaborProfileHandlingAssignment
CREATE POLICY hrp_handling_assignment_scope ON labor_profile_handling_assignments
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR hrp_session_user_id() = assignee_user_id  -- assignee thấy assignment của mình
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
| `LaborProfile` | ✅ Foundation | Low | V6 Phase 1 done |
| `ReferralGuard.applyOverride()` | ✅ Block-code logic reusable | Medium | R1/R2/R3 rules có thể conflict với new AFF attribution |
| `CommissionEngine.evaluateMilestones()` | ✅ Milestone pattern reusable | Medium | Cần update để đọc `beneficiaryUserId` thay vì chỉ `ctvId` |
| `CommissionLedger.ctvId` | ⚠️ CTV-specific | High | Additive `beneficiaryUserId`; dual-read compat window |
| `SourceClaim.ctvId/vendorId` | ⚠️ Legacy | High | Additive `referrerUserId`; legacy columns giữ compatibility |
| `ProjectAssignment.referrerId` | ✅ Source field | Low | Giữ nguyên; placement derives from accepted SourceClaim |
| `intake-writer.service.ts` | ✅ Intake flow | Low | Preserve attribution khi staff-assisted intake |
| `candidate_submissions` RPC | ⚠️ SECURITY DEFINER | High | RPC signature phải thay đổi — impact assessment needed |
| `Holiday` table | ✅ VN holiday data | Low | Population + consumption by business-day clock |
| `outbox.service.ts` pattern | ✅ Audit events | Low | Tái sử dụng cho handling assignment events |

**Highest-risk conflicts:**

1. **RPC signature change (`hrp_public_apply_submission`)**: Đây là critical path cho public apply. Thay đổi signature cần:
   - Migration to update function
   - Re-grant ACL
   - Full LIVE test với existing rows
   - Rollback plan
   - **Recommendation:** N2-3 slice phải có dedicated migration test với production-equivalent data

2. **Commission engine beneficiary**: Engine hiện tại đọc `ctvId` từ assignment. N2 cần đọc `beneficiaryUserId` từ handling assignment. Có thể dual-write trong compat window:
   ```typescript
   // Compat: write both
   beneficiary = activeHandlingAssignment?.assigneeUserId
   ctvId = legacy_ctvId_from_submission
   if (beneficiary && ctvId !== beneficiary) {
     // Log mismatch metric
   }
   ```

**T0 Action Required:** Xác nhận RPC change acceptable cho N2-3. Xác nhận CTV compatibility window cần bao lâu (recommend 2-3 sprint minimum).

---

### Q10. Proposed Vertical Slices

**Question:** Decomposition N2 thành vertical slices nhỏ?

**Recommendation:** 5 slices, ordered by dependency:

---

#### Slice N2-1: `ReferralAttribution` Foundation
**Slug suggestion:** `hrp-v6-n2-aff-01-attribution-foundation`
**Schema scope:**
- New table: `ReferralAttribution` per `aff_plan.md §6.2`
  - `id`, `referrerUserId`, `affiliateCodeSnapshot`, `channel`, `firstClickedAt`, `expiresAt`, `status`, `laborProfileId` (nullable FK), `consumedAt`, timestamps
  - Unique index on `laborProfileId` (nullable)
  - Index: `(referrerUserId, firstClickedAt)`, `(status, expiresAt)`
- RLS: referrer thấy own rows; ADMIN/HR_MANAGER/HR_STAFF thấy all
- No new API routes
**Migration risk:** Low — additive, no existing rows affected
**Test gate:** Unique constraint, RLS, no PII leak

---

#### Slice N2-2: Link Capture + Shared Self-Service
**Slug suggestion:** `hrp-v6-n2-aff-02-link-capture`
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
**Slug suggestion:** `hrp-v6-n2-aff-03-apply-attribution`
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
**Note:** This is where the V6 lane and AFF lane intersect. V6 LaborProfile foundation must be merged first.

---

#### Slice N2-4: `LaborProfileHandlingAssignment` + 7-Day Clock
**Slug suggestion:** `hrp-v6-n2-aff-04-handling-assignment`
**Schema scope:**
- New table: `labor_profile_handling_assignments`:
  - `id`, `laborProfileId`, `assigneeUserId`, `assignedByUserId`, `source` (AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION)
  - `startsAt`, `expiresAt` (TIMESTAMPTZ)
  - `status` (ACTIVE | COMPLETED | EXPIRED | TRANSFERRED | REVOKED)
  - `reason`, `previousAssignmentId`, `completedMilestoneId`, timestamps
  - Partial unique: `(laborProfileId)` WHERE `status = 'ACTIVE'` — at-most-one-active invariant
- RLS: assignee thấy own; ADMIN/HR_MANAGER/HR_STAFF thấy all
- API routes: assign, transfer, release, view pool
- Permission codes: `CAN_ASSIGN_HANDLING`, `CAN_TRANSFER_HANDLING`, `CAN_RELEASE_HANDLING`, `CAN_VIEW_HANDLING_POOL`
**Migration risk:** Medium — new table, FK constraints
**Test gate:** Two managers race to assign same profile → only one wins; clock expires → profile in pool; client cannot override assignee

---

#### Slice N2-5: `beneficiaryUserId` Generalization + Commission Update
**Slug suggestion:** `hrp-v6-n2-aff-05-commission-beneficiary`
**Schema scope:**
- Additive column: `commission_ledger.beneficiary_user_id` (nullable FK → users)
- Additive column: `commission_debt.beneficiary_user_id` (nullable FK → users)
- Additive column: `ctv_withdrawal_requests.beneficiary_user_id` (nullable FK)
- Index: `(beneficiary_user_id, month, year, milestone)` on ledger
- Backfill: `beneficiary_user_id = ctv_id` where `ctv_id IS NOT NULL`
- Service update: CommissionEngine resolves beneficiary from active `LaborProfileHandlingAssignment`
**Migration risk:** Medium — backfill, FK validation
**Test gate:** Milestone creates credit for correct beneficiary from handling assignment; concurrent milestone → exactly one credit

---

### Slice Dependency Graph

```
N2-1 (Attribution Foundation)
    ↓
N2-2 (Link Capture) [can start after N2-1]
    ↓
N2-3 (Apply Attribution) [requires V6 LaborProfile + N2-1]
    ↓
N2-4 (Handling Assignment) [requires N2-3 for AFF_INITIAL auto-assign]
    ↓
N2-5 (Commission Beneficiary) [requires N2-4]
```

**Note:** N2-2 can be developed and tested in parallel with N2-1 (no schema dependency). N2-3 needs V6 Phase 1 merged first.

---

## 3. Unresolved Decisions — T0 Must Decide

### Decision Gate: Before N2-1 Implementation

| # | Decision | Options | Owner | Recommendation |
|---|---|---|---|---|
| Q1 | **AFF clock = calendar hay business days?** | A. Calendar (Recommended) / B. Business | Founder/T0 | **A** — simpler, consistent with existing codebase |
| Q2 | **Timezone canonical?** | A. TIMESTAMPTZ Asia/Bangkok (Recommended) / B. Keep TIMESTAMP + env | Founder/T0 | **A** — future-proof |
| Q3a | **Holiday calendar owner?** | A. HR Admin (Recommended) / B. Hard-coded | T0 | **A** |
| Q3b | **Unconfigured fallback?** | A. Fallback to calendar (Recommended) / B. Block | T0 | **A** |
| Q4 | **Clock start event?** | A. `openedAt` (Recommended) / B. Separate field | Founder/T0 | **A** — confirm |
| Q5 | **Pause/reset semantics?** | A. Clock RUNNING always (Recommended) / B. Pause on certain statuses | T0 | **A** — simpler, consistent with aff_plan |
| Q7 | **No handler assignment = no commission?** | A. Skip credit with reason (Recommended) / B. Assign to pool owner | T0 | **A** |
| Q8 | **Permission codes for handling assignment?** | See proposal above | T0 | Review and confirm matrix |
| Q9 | **RPC change acceptable for N2-3?** | A. Yes (Recommended) / B. Defer to separate task | T0 | **A** with dedicated test plan |

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
| Timezone | TIMESTAMP + env | TIMESTAMPTZ | TIMESTAMPTZ |
| Clock start | `openedAt` | Separate field | `openedAt` |
| Pause behavior | Clock always running | Pause on hold | Always running |
| Handler assignment | Additive new table | Extend existing | Additive new table |
| Commission beneficiary | Additive column | Separate model | Additive column |

**Simplicity wins:** Every complex choice (business days, separate clock field, pause semantics, separate beneficiary model) adds schema surface, migration complexity, and testing burden. The MVP should pick the simpler option and add complexity only when business requirement demands it.

---

## 5. Next Steps for T0

1. **Review this document** — confirm or override recommendations in §3
2. **Unlock N2-1** — once Q1-Q8 decisions are confirmed, Tier 1 can create first task
3. **Confirm V6 Phase 1 status** — N2-3 depends on V6 LaborProfile merged
4. **Set RPC change expectation** — N2-3 requires coordination with ops for LIVE test

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

### Migration inventory (relevant)

| Migration | Date | N2 Relevance |
|---|---|---|
| `v6_phase1a_labor_profile_schema` | 20260908001 | N2-3 dependency |
| `v6_phase1a_labor_profile_rls` | 20260908150001 | N2-3 dependency |
| `n1_placement_case_foundation` | 20260912140411 | N2 base |
| `n1_placement_case_rls` | 20260912140412 | N2 base |
| `p2_commission_schema` | 20260819083254 | N2-5 base |
| `p2_commission_rls` | 20260819104700 | N2-5 base |

---

**Discovery complete. Awaiting T0 policy decisions before N2 implementation can begin.**
