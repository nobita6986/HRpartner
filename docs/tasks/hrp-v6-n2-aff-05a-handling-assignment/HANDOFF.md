# HANDOFF — hrp-v6-n2-aff-05a-handling-assignment

## 0. Control

| Field | Value |
|---|---|
| Task | hrp-v6-n2-aff-05a-handling-assignment |
| Spec version | v1.1 |
| Assurance lane | STANDARD |
| Audit mode | LIGHT |
| Execution round | 2 |
| Baseline | ada7c83bcc7294f828e6a403f8f406c550954f7b |
| Status | READY_FOR_AUDIT |

## 1. Outcome and changed surface

- **Delivered:** Concurrency-safe handling assignment schema, robust intake consumption logic, and valid migrations.
- **Not delivered:** None.
- **Changed:** prisma/schema.prisma, src/domains/talent/intake-writer.service.ts, src/domains/talent/handling-assignment.service.ts
- **Lane escalation:** No

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | verify-task.ps1 -TaskPath docs\tasks\hrp-v6-n2-aff-05a-handling-assignment\TASK.md | RESULT: PASS | None |
| AC-01 | E-01 | PASS | None |
| AC-02 | E-04 | PASS | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| E-00 | verify-task.ps1 | RESULT: PASS | None |
| E-01 | npm run test | 0 / 2284 passed | evidence/test-unit.txt |
| E-02 | npm run typecheck | 0 | evidence/typecheck.txt |
| E-03 | npm run lint | 0 | evidence/lint.txt |
| E-04 | npx prisma validate | 0 | evidence/prisma-validate.txt |
| E-05 | npx prisma migrate status | 0 | evidence/prisma-migrate-status.txt |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

- Tất cả P1 và P0 từ round 1 đã được xử lý xong.
- Expiry dùng server clock trực tiếp ở READ path (không dựa vào scheduler hay job update trạng thái DB).
- Thời gian 7 ngày cho Affiliate assignment hiện là policy constant hard-coded.
- Idempotency / outbox (để handle N5 invariant) là phần follow-up.
- Việc xử lý column version (optimistic locking) cũng được defer lại làm follow-up.

> Handoff status: READY_FOR_AUDIT


