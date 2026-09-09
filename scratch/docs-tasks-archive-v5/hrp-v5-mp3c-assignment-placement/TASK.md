# TASK: hrp-v5-mp3c-assignment-placement

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-mp3c-assignment-placement` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` — Founder waived missing browser evidence for `AC-08` |
| Planner | Tier 1 — primary agent |
| Executor | Tier 2 — Coding agent |
| Auditor | Tier 3 — independent Audit agent |
| Baseline | `42edc43` |
| Modules | `MP-3 / V5-PORTAL-03 / V5-M35-06 / V5-M35-04` |
| ADR references | `UNIFIED_PLAN_v5.md` §7.9.3–§7.9.7, §7.10, §8.2; existing G14/O9 assignment invariants |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | Task closed → Tier 2 creates one scoped MP-3C commit (no push) → Tier 1 promotes M1-06a baseline |
| Updated | `2026-08-25 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Từ drawer hồ sơ ứng viên, HR đi hết flow `screen → qualify → convert → preview placement → activate assignment`. Preview cho thấy rõ slot/quota, assignment đang ACTIVE và Referral Guard; activate chỉ thành công khi mọi invariant vẫn đúng trong transaction. Duplicate, IDOR, quota race, `1-ACTIVE` và override trái phép đều bị chặn bằng lỗi có thể xử lý trên UI.

### Non-goals

- Không tự động transfer hoặc đóng assignment ACTIVE hiện hữu; conflict phải dẫn sang guided transfer hiện có.
- Không tạo assignment cho Worker không đi từ một `CandidateSubmission` đã `CONVERTED` trong task này.
- Không làm bulk assignment, scheduling tương lai, payroll/rate calculation, attendance hay commission settlement.
- Không thay đổi queue reader boundary MP-2, public tracking projection hoặc public apply RPC.
- Không deploy production và không dùng dev/prod DB để tạo evidence.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `UNIFIED_PLAN_v5.md` §7.9.3–§7.9.7 | Marketplace yêu cầu preview/activate riêng; slot/quota/1-ACTIVE/referral conflict phải bị chặn. | Hai endpoint riêng; activate luôn re-check, không tin preview cũ. |
| `EV-02` | `prisma/schema.prisma` at `42edc43` | `ProjectAssignment` có Worker/Project/StaffingOrder nhưng chưa liên kết slot hoặc source submission. | Thêm nullable/backfill-safe relation tới slot và unique source submission. |
| `EV-03` | migration `20260815084134_g22_security` | Partial unique index `one_active_assignment(worker_id) WHERE status='ACTIVE'` đã là DB backstop. | Giữ nguyên index; thêm lock/race test, không thay bằng app-only check. |
| `EV-04` | `StaffingOrderSlot.slotsFilled`, `Project.filled` | Hai counter đang denormalized; plan nói filled là projection từ assignment. | Counter chỉ cập nhật cùng transaction và phải được đối chiếu với ACTIVE assignment. |
| `EV-05` | `src/domains/staffing/transfer.service.ts` | Transfer đã dùng advisory lock theo Worker và invariant `1-ACTIVE`, nhưng không biết slot. | Reuse lock order/pattern; không tự gọi transfer trong activation. |
| `EV-06` | `src/domains/staffing/referral-guard.service.ts` | R1 còn query `merged_worker_id` dù MP-3B đã có canonical `worker_id`; bitmask type không biểu diễn 3/5/6/7. | Sửa guard về canonical conversion link và bitmask `0..7` trước khi dùng cho placement. |
| `EV-07` | `app/admin/applications/page.tsx` | UI chỉ có action MP-2 `NEW ↔ NEEDS_INFO`; chưa gọi screen/qualify/reject/convert/placement. | MP-3C phải hoàn tất drawer end-to-end, không chỉ thêm backend. |
| `EV-08` | RLS policy `hrp_project_assignment_scope` | Writer cho phép insert assignment ở ADMIN/HR_MANAGER/DIRECTOR, trong khi MP-3 action boundary là ADMIN/HR_MANAGER. | App gate chỉ ADMIN/HR_MANAGER; RLS là floor, DIRECTOR vẫn read-only ở API. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Preview và activate nhận `submissionId`; slot/project/worker luôn suy ra từ submission, không nhận ID thay thế từ client. | EV-01/02 | Final |
| `DEC-02` | CHOSEN | `ProjectAssignment` thêm `staffingOrderSlotId` và nullable unique `submissionId`; existing rows không backfill đoán mò. | Plan data contract | Final |
| `DEC-03` | CHOSEN | Preview read-only/advisory. Activate bắt buộc re-evaluate trong `withDbContext` transaction sau khi khóa Worker rồi khóa slot; không dùng preview token làm authority. | Race/TOCTOU gate | Final |
| `DEC-04` | CHOSEN | Preview/activate roles = ADMIN, HR_MANAGER. DIRECTOR/SALE/HR_STAFF không được mutate qua endpoint mới. | MP-3A/3B boundary | Final |
| `DEC-05` | CHOSEN | Nếu Worker đã có ACTIVE assignment, trả guided conflict metadata an toàn; không auto-transfer. | G14 + existing transfer flow | Final |
| `DEC-06` | CHOSEN | `slotsFilled` và `Project.filled` là transactional projection; ACTIVE assignments có slot link là nguồn đối chiếu. | EV-04 | Final |
| `DEC-07` | CHOSEN | Vendor accepted claim chạy Referral Guard; PUBLIC/CTV không giả lập vendor. Override cần permission, case S1/S2/S3, reason và audit trong cùng transaction. | EV-06 | Final |
| `DEC-08` | CHOSEN | Activate yêu cầu `Idempotency-Key`; same key+payload replay cùng kết quả, payload khác fail; DB unique `submissionId` là backstop. | Critical POST policy | Final |
| `DEC-09` | CHOSEN | Application giữ status `CONVERTED`; placement state nằm ở ProjectAssignment, không thêm status `PLACED`. | Separate aggregate rule | Final |
| `DEC-10` | CHOSEN | Tier 1 chỉ sở hữu TASK này. Tier 2 tạo code/migration/tests/HANDOFF; Tier 3 tự chạy audit và chỉ sửa AUDIT.md. | Founder instruction | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Thêm quan hệ canonical, nullable/backfill-safe: assignment → source submission (unique) và assignment → staffing slot; index/FK/migration rõ rollback. | Must | EV-02 | Prisma/migration gate fail; không activate. |
| `RQ-02` | `POST /api/admin/assignments/preview` xác thực ADMIN/HR_MANAGER, đọc theo RLS và trả projection không PII của conversion invariant, slot/order/project validity, slot/project remaining, employee-code collision, ACTIVE assignment và Referral Guard. Preview không ghi DB. | Must | EV-01/08 | 401/403/404 hoặc `canActivate=false` + stable conflicts. |
| `RQ-03` | `POST /api/admin/assignments` bắt buộc auth, reason và `Idempotency-Key`; chỉ nhận `submissionId`, assignment attributes và optional override; tất cả ID canonical suy ra server-side. | Must | DEC-01/04/08 | Stable 400/401/403/404/409; không có partial write. |
| `RQ-04` | Chỉ application `CONVERTED` có `workerId`, `slotId` và accepted SourceClaim hợp lệ mới placement; same submission chỉ có một initial assignment. | Must | MP-3B invariant | `CONVERSION_INVARIANT_BROKEN`/`ASSIGNMENT_EXISTS`. |
| `RQ-05` | Activate khóa Worker trước, khóa slot trong transaction, re-check `1-ACTIVE`, slot/order/project validity, slot capacity, project quota và employee code; tạo ACTIVE assignment rồi tăng hai counter đúng một lần. | Must | EV-03/04/05 | 409 conflict; toàn transaction rollback. |
| `RQ-06` | Referral Guard dùng canonical `candidate_submissions.worker_id`, hỗ trợ bitmask `0..7`, không áp vendor rules cho PUBLIC/CTV; blocked vendor chỉ được override bằng permission + S1/S2/S3 + reason/evidence + audit. | Must | EV-06/DEC-07 | `REFERRAL_GUARD_BLOCKED`/`OVERRIDE_DENIED`; no assignment. |
| `RQ-07` | Successful activate ghi `AuditLog` và outbox exactly once; idempotent replay không tăng counter hoặc lặp audit/outbox. | Must | Critical command policy | Transaction rollback hoặc replay stored response. |
| `RQ-08` | Mở rộng admin application detail projection tối thiểu cho MP-3 (`version`, `workerId`, assignment summary, safe source/dedup facts) mà không nới queue role/PII boundary. | Must | EV-07/08 | DTO/contract test fail. |
| `RQ-09` | Nâng drawer `/admin/applications`: screen/qualify/reject, dedup-aware convert, placement preview, guard/quota/1-ACTIVE conflict, override form và activate confirmation; loading/error/success rõ, double-submit disabled, refresh từ server sau command. | Must | §7.10/EV-07 | UI flow/evidence gate fail. |
| `RQ-10` | Có unit/route/component tests và LIVE DB races chứng minh: two-worker last-slot race, same-worker activation race, idempotency replay, DB unique backstops, IDOR/role deny, counter/source-of-truth consistency và MP-2/MP-3B regression. | Must | Marketplace launch gate | Audit BLOCKED/FAIL. |
| `RQ-11` | Prisma validate/migrate on safe clone, full unit, integration, typecheck, scoped lint và production build đều exit 0. | Must | Repository quality gate | Handoff không được READY_FOR_AUDIT. |

### 4.2 Scope boundaries

**In scope:** additive schema/migration; assignment preview/activation service + routes; Referral Guard canonical fix; application detail DTO; admin application drawer flow; audit/outbox/idempotency; unit/UI/LIVE security and race evidence.

**Out of scope:** changing public endpoints/projections, automatic transfer, bulk/scheduled assignment, payroll/rate semantics, redesigning transfer service, production migration and test-resource deletion.

### 4.3 Input/output contract

**Preview request:**

```json
{
  "submissionId": "canonical submission id",
  "employeeCode": "project employee code",
  "employmentType": "HRP_EMPLOYED | OUTSOURCED | REFERRED_OUT",
  "workSetting": "optional",
  "validFrom": "ISO timestamp active now",
  "validTo": "optional ISO timestamp after validFrom"
}
```

**Preview response:** `canActivate`, safe submission/worker identifiers, slot/order/project IDs and counters, existing ACTIVE assignment summary, Referral Guard result (`blockCode`, `failedRules`, `overrideRequired`) and stable `conflicts[]`. Không trả phone/CCCD/rate/margin/internal source evidence.

**Activate request:** preview payload + non-empty `reason` + optional `{ overrideCase, reason, evidence }`; header `Idempotency-Key` bắt buộc. Server không nhận `workerId`, `slotId`, `projectId`, `staffingOrderId` từ client.

**Activate response:** assignment ID/status/source submission/slot/project IDs, counter projection và replay indicator. Replay cùng key+payload phải trả cùng aggregate; key trùng payload khác trả `IDEMPOTENCY_CONFLICT`.

### 4.4 State, permission, failure và concurrency rules

- `validFrom <= now < validTo` nếu có `validTo`; future placement thuộc scheduling task khác.
- Slot phải thuộc OPEN StaffingOrder, ACTIVE Project, nằm trong effective interval, `slotsFilled < slotsNeeded`; Project phải `filled < quota`.
- Lock order bắt buộc: Worker advisory lock → slot row/advisory lock → checks/writes. Không network I/O sau khi lấy lock.
- Existing ACTIVE assignment trả `ACTIVE_ASSIGNMENT_CONFLICT` cùng `assignmentId/projectId`; UI dẫn sang transfer, không tự mutate.
- Stable errors tối thiểu: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONVERSION_INVARIANT_BROKEN`, `ASSIGNMENT_EXISTS`, `SLOT_UNAVAILABLE`, `PROJECT_QUOTA_FULL`, `ACTIVE_ASSIGNMENT_CONFLICT`, `EMPLOYEE_CODE_CONFLICT`, `REFERRAL_GUARD_BLOCKED`, `OVERRIDE_DENIED`, `IDEMPOTENCY_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `ASSIGNMENT_CONFLICT`.
- DB partial unique `one_active_assignment` giữ nguyên. Migration mới phải có unique non-null source submission and FK/index slot.
- `slotsFilled`/`Project.filled` không được âm hoặc vượt capacity/quota; LIVE test đối chiếu counter với ACTIVE assignment counts.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `prisma/schema.prisma` + new migration | Add submission/slot relations and DB backstops; existing rows remain nullable. | Baseline `42edc43` | validate + clean-clone deploy/status | Destructive/backfill guess or migration drift. |
| `STEP-02` | `RQ-06` | `src/domains/staffing/referral-guard.service.ts` | Canonical worker link, `0..7` bitmask, source-aware evaluation/override audit. | MP-3B Worker link | unit tests | `merged_worker_id` remains authority or combo bits truncate. |
| `STEP-03` | `RQ-02`, `RQ-04` | new assignment placement service + preview route | Read-only projection and all preflight conflicts. | STEP-01/02 | unit/route tests prove zero writes | Preview mutates or trusts client IDs. |
| `STEP-04` | `RQ-03`, `RQ-05` | activation service + route | Auth/idempotency/lock/re-check/create/counter transaction. | STEP-03 | unit + DB race | Any partial write or counter overfill. |
| `STEP-05` | `RQ-07` | activation transaction | Audit/outbox exactly once; replay no-op. | STEP-04 | interaction + replay tests | Duplicate side effect. |
| `STEP-06` | `RQ-08` | application queue/detail DTO + route tests | Add safe MP-3 facts without changing reader roles. | MP-3A/B | projection/role tests | PII/internal data leak or role drift. |
| `STEP-07` | `RQ-09` | `app/admin/applications/page.tsx` + focused UI modules/tests | Full MP-3 action/dedup/preview/override/activate drawer. | STEP-03..06 | component/browser evidence | Hidden conflict, double-submit or stale success. |
| `STEP-08` | `RQ-10` | guarded integration files/config | LIVE same-worker and last-slot races, IDOR, DB backstop, counter consistency; cleanup fixtures. | safe dedicated test DB | integration exit 0 | Any orphan/overfill/leak or ENV masquerades as PASS. |
| `STEP-09` | `RQ-10`, `RQ-11` | regressions | MP-2 LIVE + MP-3B conversion race + existing staffing/transfer tests. | all source changes | all PASS | Regression. |
| `STEP-10` | `RQ-11` | quality/docs | Full gates; HANDOFF only after real outputs; no self-audit. | all steps | verifier + git diff review | Error, missing evidence or unrelated file. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Additive migration deploys on safe clone; assignment has nullable slot link and unique nullable source-submission link; all migrations up to date. | Prisma validate/deploy/status + DB introspection | Command/exit and index/FK rows | Yes |
| `AC-02` | `RQ-02`, `RQ-04` | Preview is read-only and returns exact conflict/projection for intact conversion, broken conversion, closed/expired/full slot, project quota, employee code and active assignment. | Service/route tests + before/after DB counts | PASS matrix | Yes |
| `AC-03` | `RQ-03`, `RQ-05` | Valid activation creates one ACTIVE assignment linked to submission/slot and increments slot/project counters once inside RLS transaction. | Unit + LIVE happy path | Aggregate/counter assertions | Yes |
| `AC-04` | `RQ-05`, `RQ-10` | Two workers racing for last slot yield one success; same worker racing yields one ACTIVE assignment; loser leaves no assignment/counter/audit/outbox residue. | Independent-client LIVE races | Row/count evidence | Yes |
| `AC-05` | `RQ-06` | R1 reads canonical `worker_id`; combo block codes 3/5/6/7 preserved; PUBLIC/CTV path does not fabricate vendor guard; unauthorized/invalid override fails and valid override audits once. | Unit + LIVE guard cases | PASS matrix + audit count | Yes |
| `AC-06` | `RQ-07` | Same idempotency key+payload replays same result; changed payload conflicts; replay never changes counters or duplicates audit/outbox. | Route/service/LIVE replay | Before/after counts | Yes |
| `AC-07` | `RQ-08` | Detail DTO exposes only safe MP-3 facts and retains ADMIN/HR_MANAGER/DIRECTOR/SALE read boundary; mutation routes deny DIRECTOR/SALE/HR_STAFF/anonymous. | Contract/route/IDOR tests | Role matrix | Yes |
| `AC-08` | `RQ-09` | UI exposes correct action per state/role, dedup selection, preview counters/conflicts, guard override and activation confirmation; handles loading/error/retry and disables duplicate submit. | Component tests + browser demo on anonymized fixture | Test output + screenshots/steps | Yes |
| `AC-09` | `RQ-10` | MP-2 LIVE 23/23, MP-3B LIVE conversion race and existing staffing/transfer suites remain green; integration lane reports real PASS, not `ENV_BLOCKED`. | Guarded integration commands | Outputs and DB target mask | Yes |
| `AC-10` | `RQ-10` | For each tested slot/project, denormalized counters equal ACTIVE assignment counts after success, conflict and replay. | LIVE SQL/Prisma assertions | Count table | Yes |
| `AC-11` | `RQ-11` | Full unit/integration/typecheck/scoped lint/build and TASK/HANDOFF verifiers exit 0; scoped diff contains no secret/unrelated file. | Quality commands + git review | Command/exit summary | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-03` | `AC-02` |
| `RQ-03` | `STEP-04` | `AC-03`, `AC-06` |
| `RQ-04` | `STEP-03` | `AC-02`, `AC-03` |
| `RQ-05` | `STEP-04` | `AC-03`, `AC-04`, `AC-10` |
| `RQ-06` | `STEP-02` | `AC-05` |
| `RQ-07` | `STEP-05` | `AC-06` |
| `RQ-08` | `STEP-06` | `AC-07` |
| `RQ-09` | `STEP-07` | `AC-08` |
| `RQ-10` | `STEP-08`, `STEP-09` | `AC-04`, `AC-09`, `AC-10` |
| `RQ-11` | `STEP-10` | `AC-11` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Last-slot race overfills slot/project. | Concurrent workers. | Worker-first + slot lock, re-check and atomic counter writes; DB/LIVE race. | Roll back transaction; revert scoped migration/code before production deploy. |
| `RISK-02` | Preview passes but activate uses stale facts. | Counter/assignment changes between calls. | Preview advisory only; activate repeats all checks under lock. | Return conflict and refresh preview. |
| `RISK-03` | Referral source ownership is overridden silently. | Vendor guard blocked. | Explicit permission/case/reason/evidence and same-tx audit. | No assignment; Planner resolves any policy gap. |
| `RISK-04` | Existing transfer rows cannot be linked to slots. | Add required relation/backfill. | Relations remain nullable for legacy rows; only new Marketplace assignment requires both. | Drop new indexes/FKs/columns via reviewed rollback if not deployed. |
| `RISK-05` | UI suggests success after stale/double submit. | Network retry or concurrent click. | Required idempotency key, disabled pending state, refresh server result. | Display stable conflict and retry with new preview. |
| `RISK-06` | Tier boundary collapses and audit loses independence. | Tier 1/Tier 2 writes AUDIT or Tier 3 patches code. | DEC-10 and scoped handoff commands. | Reject artifact and rerun proper tier. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. Contract decisions above are complete for execution. | — | — | No |

## 9. Planner Resolution

Audit round 1 qua gate cơ học (`verify-audit.ps1: PASS`); migration, unit, build và LIVE integration evidence đều PASS. Browser walkthrough/screenshot của `AC-08` không được thực hiện; AUDIT chỉ có component-test evidence và ghi rõ lỗi Playwright CDN. Ngày 2026-08-25, Founder chọn phương án 2 và đích danh cho phép waive visual evidence. Planner chấp nhận rủi ro này để đóng MP-3C; waiver không được diễn giải thành browser test đã chạy hoặc PASS.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `Coverage Gap §5 / AC-08` | `REJECT` as closure blocker | Browser evidence không tồn tại; Founder explicitly waived AC-08 visual evidence on 2026-08-25. Component behavior vẫn có unit evidence. | `None` — acceptance-risk waiver, source/spec giữ `v1.0` | Closed by Founder decision. Manual visual QA vẫn là pre-public-launch residual, không block MP-3C. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-24` | Initial MP-3C assignment placement and UI completion contract. | MP-3B accepted at `42edc43`; normal Tier separation restored. |
| `v1.0` | `2026-08-25` | Resolution giữ contract, yêu cầu audit evidence-only cho blocking AC-08. | Audit round 1 Coverage Gap §5 mâu thuẫn verdict PASS; không có source revision. |
| `v1.0` | `2026-08-25` | Marked `ACCEPTED` under explicit Founder waiver for missing AC-08 browser evidence. | Audit round 1 PASS; Founder selected waiver option 2; no source/spec change. |
