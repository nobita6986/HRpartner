# TASK: hrp-phase2-tenant-scope-v2

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase2-tenant-scope-v2` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `CANCELLED` — không được giao `/code`; scope trùng đã hợp nhất về identity-core và `hrp-phase2-tenant-scope` v1.2 |
| Planner | Tier 1 — Planner / Product & Architecture Decision Owner |
| Executor | Tier 2 — bên ngoài, do sếp giao (Cursor/agent khác — Tier 1 KHÔNG spawn Tier 2/3; quy ước 16/08) |
| Auditor | Tier 3 — bên ngoài, do sếp giao (độc lập với Tier 2) |
| Baseline | `4a3a0fe` (main 16/08/2026 — bcc-fence ACCEPTED) |
| Modules | Phase 2 Tenant Scope — chạm: `src/shared/auth/worker-projection.ts` (mới), `app/api/tickets/*` (6 route — refactor), tests |
| ADR references | **PHASE_KHOAHOC_V1.md** §4 Phase 2; **`docs/data-scope-security.md` §2** (field masking) |
| Current execution round | 1 |
| Current audit round | 0 (chưa audit) |
| Next gate | `CANCELLED` — không có execution/audit gate |
| Updated | 2026-08-16 18:00 ICT |

## 1. Outcome

### User-visible outcome

Task này không có deliverable: bị hủy trước execution để tránh giao trùng scope. Field masking thuộc `hrp-phase2-tenant-scope` v1.2; thay stub 6 route ticket và UNIQUE `portal_timesheets` thuộc `hrp-phase1-identity-core`.

### Non-goals

- KHÔNG RLS / scope builders (đã ở task 1)
- KHÔNG permission-catalog / resolver / with-auth-scope (đã ở identity-core)
- KHÔNG outbox/audit/idempotency/state-machine (Phase 3)
- KHÔNG UI mới, KHÔNG đổi flow

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/data-scope-security.md` §2 | Field masking chỉ application-level (select/DTO), không column-level | Phase 2 KHÔNG phải DDL masking ở DB |
| `EV-02` | `app/api/tickets/*` (6 route) | 6 route còn dùng stub session.ts | identity-core sẽ thay stub trước; task 2 chỉ refactor |
| `EV-03` | Glob `app/api/tickets/*` | Service ticket đang dùng `TicketActorRole` (6 role) | Cần ánh xạ rõ ràng với SystemRole (13) theo DEC-08 của identity-core |
| `EV-04` | `prisma/schema.prisma:1028-1046` | `portal_timesheets` drift | Task 1 đã xử lý; task 2 chỉ thêm UNIQUE nếu cần |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | **Refactor 6 route tickets** theo DEC-08 của identity-core: thay stub → auth-context + require-permission; ngoài 6 TicketActorRole → 403 | Planner | CHỐT |
| `DEC-02` | CHOSEN | Field masking chỉ application-level (worker-projection.ts); permission `CAN_VIEW_WORKER_SENSITIVE` do identity-core seed | Planner | CHỐT |
| `DEC-03` | CHOSEN | UNIQUE constraint `portal_timesheets` (nếu chưa có) | CONTRACT_BCC §10 + DEC-09 task 1 | CHỐT |
| `DEC-04` | ASSUMPTION | identity-core seed đủ `CAN_VIEW_WORKER_SENSITIVE` | Planner | Hết hiệu lực khi identity-core ACCEPTED |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Refactor 6 route `/api/tickets/*`: thay stub → auth-context + require-permission theo DEC-08 | Must | DEC-01 + EV-02 | Hành vi service cũ đổi = fail |
| `RQ-02` | `worker-projection.ts`: che 7 field nhạy cảm khi thiếu `CAN_VIEW_WORKER_SENSITIVE` | Must | DEC-02 | Lộ CCCD/STK = block |
| `RQ-03` | Matrix test cập nhật: role yếu vẫn thấy dữ liệu (vì chưa RLS), ngoài 6 role → 403 | Must | DEC-01 | Case fail = chặn release |
| `RQ-04` | UNIQUE constraint `portal_timesheets` (nếu chưa có) | Must | CONTRACT_BCC §10 | Duplicate → dừng báo (KHÔNG tự xóa) |

### 4.2 Scope boundaries

**In scope:**

- `src/shared/auth/worker-projection.ts`
- `app/api/tickets/*` (6 route — chỉ refactor layer auth)
- Tests matrix + integration

**Out of scope:**

- RLS / scope builders (task 1)
- permission-catalog / resolver (identity-core)
- Outbox/audit/idempotency/state-machine (Phase 3)
- UI mới

### 4.3 Data, State, Permission và Interface Rules

- **Data:** chỉ thêm UNIQUE nếu cần; không đổi model.
- **State:** không đổi state machine ticket.
- **Permission/data scope:** hai trục độc lập; task 2 chỉ hoàn thiện layer application.
- **Interface:** route tickets giữ JSON response cũ; 403 thêm reason.
- **Failure/idempotency/concurrency:** giữ hành vi `x-idempotency-key` cũ (Phase 3 xử lý).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01 | 6 route tickets | Refactor layer auth (auth-context + require-permission) | identity-core ACCEPTED | `next dev` + curl matrix | Hành vi service cũ đổi |
| `STEP-02` | RQ-02 | `worker-projection.ts` | Masking 7 field | STEP-01 | vitest: role có/không permission → plaintext/`***` | — |
| `STEP-03` | RQ-03 | Tests | Update matrix + integration | STEP-01 | vitest PASS | Case fail |
| `STEP-04` | RQ-04 | UNIQUE constraint | Nếu chưa có: thêm migration | CONTRACT_BCC §10 | migrate dev + test duplicate | Duplicate → dừng báo |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | 6 route tickets hoạt động đúng logic cũ (approve/cancel/pay/reject) | curl + service test | Command + output | Yes |
| `AC-02` | RQ-02 | Field masking áp dụng đúng | vitest | Test output | Yes |
| `AC-03` | RQ-03 | Matrix test PASS | vitest | Test output | Yes |
| `AC-04` | RQ-04 | UNIQUE áp thành công hoặc duplicate → BLOCKED đúng | migrate + test | Log | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Refactor tickets làm vỡ service | vitest domain fail | Giữ interface `SessionUser` | Revert route — service không đổi |
| `RISK-02` | Field masking sai | vitest fail | Quy tắc masking chốt | Fix projection |
| `RISK-03` | UNIQUE constraint không apply | migrate fail | Quy trình DEC-31 | Theo DEC-31 |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | Không còn câu hỏi mở | — | — | — |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-16 | Initial contract — Phase 2 Tenant Scope: Field Masking + Ticket refactor | Sếp yêu cầu "viết cả 2 task luôn"; căn cứ PHASE_KHOAHOC §4 + data-scope-security §2 |
| `v1.1` | 2026-08-16 | `CANCELLED` trước execution: RQ-01 (ticket stub replacement) và RQ-04 (UNIQUE portal_timesheets) trùng `hrp-phase1-identity-core`; RQ-02 (worker-projection/masking) trùng `hrp-phase2-tenant-scope`; không có source/test/migration nào được thực thi từ task này | Planner review theo yêu cầu sếp |
