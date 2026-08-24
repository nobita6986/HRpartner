# TASK: hrp-v5-g0-05-operation-fixtures

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-g0-05-operation-fixtures` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | `Tier 1` |
| Executor | `Tier 1 acting under Founder waiver` |
| Auditor | `Tier 1 self-audit under Founder waiver` |
| Baseline | `e6daa27` |
| Modules | `V5-G0-05`, `tests/fixtures/operations` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `G0-05 closed; proceed to G0 phase review / remaining G0-01..03 debt` |
| Updated | `2026-08-24 +07:00` |

## 1. Outcome

Tạo bộ fixture nghiệp vụ deterministic, ẩn danh và tái sử dụng cho các case đủ tháng, chuyển project giữa kỳ, ca đêm, OT, correction và dispute. Fixture không đọc `.env`, không gọi DB và không chứa dữ liệu thật.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `UNIFIED_PLAN_v5.md §7.1, §12.2 RF-07` | G0-05 yêu cầu `tests/fixtures/operations/*` dùng chung. | Tạo fixture package canonical. |
| `EV-02` | `V5_READINESS_ASSESSMENT.md T-02/RF-07` | Sáu case vận hành chưa được đóng gói và fixture phải được ít nhất hai suite import. | Wire vào Attendance và Reconciliation unit suites. |
| `EV-03` | `V5_3_TIER_EXECUTION_GUIDE.md §7` | Fixture phải có seed version, dữ liệu ẩn danh và chạy lặp. | Version cố định, ID namespace và clone độc lập. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Status |
|---|---|---|---|
| `DEC-01` | `CHOSEN` | Fixture là TypeScript thuần dữ liệu, không phụ thuộc Prisma hoặc biến môi trường. | Valid |
| `DEC-02` | `CHOSEN` | Mọi timestamp là ISO-8601 có `+07:00`; tiền là chuỗi VND để không mất precision. | Valid |
| `DEC-03` | `CHOSEN` | ID dùng prefix `g005:` và không mô phỏng PII thật. | Valid |
| `DEC-04` | `CHOSEN` | Founder cho Tier 1 trực tiếp implement/self-audit, không gọi Tier 2/3 cho round này. | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| `RQ-01` | Có đủ 6 scenario: full month, mid-month transfer, night shift, OT, correction, dispute. | Must | Thiếu scenario làm test đỏ. |
| `RQ-02` | Fixture deterministic, clone an toàn, không `.env`/DB/network/PII. | Must | Typecheck/test hoặc static check đỏ. |
| `RQ-03` | Ít nhất hai suite domain dùng fixture và xác nhận các tổng kỳ vọng. | Must | Không nghiệm thu chỉ vì file tồn tại. |
| `RQ-04` | Unit lane và typecheck giữ xanh. | Must | Task không ACCEPTED. |

### 4.2 Scope boundaries

**In scope:** `tests/fixtures/operations/*`, test Attendance/Reconciliation tối thiểu, tài liệu task.

**Out of scope:** thay đổi schema/migration/seed DB, sửa thuật toán payroll/statement, apply vào DB dev/prod, thêm dependency.

## 5. Execution Plan

| STEP ID | RQ | Deliverable | Verify |
|---|---|---|---|
| `STEP-01` | RQ-01/02 | Fixture types, version, six scenarios, clone + summary helpers. | Targeted Vitest + typecheck |
| `STEP-02` | RQ-03 | Attendance và Reconciliation suites import/use fixture. | Targeted Vitest |
| `STEP-03` | RQ-04 | Full unit lane, task/handoff/audit verifier. | Exit code 0 |

## 6. Acceptance

| AC ID | Pass condition | Verification method | Blocking? |
|---|---|---|---|
| `AC-01` | `OPERATION_FIXTURES` có đúng 6 key và version cố định. | Unit assertions | Yes |
| `AC-02` | Full month = 176h; transfer = 80h/project; night = 8h; OT = 3h. | Attendance suite | Yes |
| `AC-03` | Correction delta = 0.5h; dispute amount/round giữ kiểu an toàn. | Reconciliation suite | Yes |
| `AC-04` | Hai lần materialize bằng nhau nhưng không chia sẻ mutable state. | Unit assertion | Yes |
| `AC-05` | `npm run test:unit` và `npm run typecheck` exit 0. | Command output | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02`, `AC-03` |
| `RQ-02` | `STEP-01` | `AC-01`, `AC-04` |
| `RQ-03` | `STEP-02` | `AC-02`, `AC-03` |
| `RQ-04` | `STEP-03` | `AC-05` |

## 7. Risk và Rollback

| Risk ID | Risk | Mitigation | Rollback |
|---|---|---|---|
| `RISK-01` | Fixture drift khỏi domain contract. | TypeScript types + hai consumer suites. | Revert commit fixture. |
| `RISK-02` | Timezone làm test không ổn định. | ISO timestamp có offset, không dùng `Date.now()`. | Giữ string canonical. |
| `RISK-03` | Test mutate fixture global. | Consumer dùng `materializeOperationFixtures()`. | Clone lại mỗi test. |

## 8. Open Questions

Không có câu hỏi blocking.

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | — | `ACCEPTED` | Self-audit PASS under explicit Founder waiver; targeted 29/29, full unit 473/473, typecheck PASS, two suite consumers and no env/DB/network/PII reference. | None | Tier 1 / Closed |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-08-24` | Mở task G0-05 fixture operations. | Đóng G0 debt trước MP-3. |
