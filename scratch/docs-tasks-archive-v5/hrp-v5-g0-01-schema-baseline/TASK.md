# TASK: hrp-v5-g0-01-schema-baseline

## 0. Control
| Field | Value |
|---|---|
| Task slug | `hrp-v5-g0-01-schema-baseline` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner/Executor/Auditor | `Tier 1 under explicit Founder waiver` |
| Baseline | `715a58b` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `G0-02 seed baseline` |
| Updated | `2026-08-24 +07:00` |

## 1. Outcome
Schema canonical có thể migrate từ database sạch và database nâng cấp; schema diff rỗng; RLS/RPC vẫn hoạt động.

## 2. Evidence và Baseline
| ID | Evidence | Impact |
|---|---|---|
| `EV-01` | Clean deploy từng lỗi do index rename chạy trước index, UTF-8 BOM và MP2 ownership transfer. | Sửa migration chain thay vì resolve giả. |
| `EV-02` | Upgraded test DB ban đầu thiếu 15 migration, RLS 0 policy. | Apply chain và kiểm LIVE. |

## 3. Decisions
| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Chỉ thao tác endpoint test `ep-empty-forest…`; không apply dev/prod. | Valid |
| `DEC-02` | Ownership transfer tạm bật membership SET/CREATE trong transaction rồi phục hồi SET=false/CREATE=false. | Valid |
| `DEC-03` | Founder waive Tier 2/3; Tier 1 trực tiếp implement/self-audit. | Valid |

## 4. Contract
| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| `RQ-01` | `prisma migrate deploy` chạy từ DB sạch và DB nâng cấp. | Must | Không ACCEPTED. |
| `RQ-02` | Prisma schema diff rỗng ở cả hai target. | Must | Tạo forward reconcile migration. |
| `RQ-03` | FORCE RLS/policy và MP2 SECURITY DEFINER boundary không regress. | Must | LIVE tests phải đỏ. |
| `RQ-04` | Migration chain không BOM và không phụ thuộc index sai thứ tự. | Must | Clean deploy phải bắt lỗi. |

## 5. Execution Plan
| STEP | RQ | Deliverable | Verify |
|---|---|---|---|
| `STEP-01` | `RQ-01/04` | Sửa BOM + legacy rename + MP2 owner sequence. | Clean deploy |
| `STEP-02` | `RQ-02` | Reconcile schema/index migrations. | `migrate diff --script` |
| `STEP-03` | `RQ-03` | RLS structural guard + MP2 fixture GUC. | 135 LIVE tests |

## 6. Acceptance
| AC | Pass condition | Method | Blocking? |
|---|---|---|---|
| `AC-01` | Clean DB apply đủ 20 migrations. | `prisma migrate deploy` | Yes |
| `AC-02` | Upgraded DB apply đủ 20 migrations. | `prisma migrate deploy` | Yes |
| `AC-03` | Cả hai schema diff rỗng. | `prisma migrate diff` | Yes |
| `AC-04` | Security matrix 112/112 và MP2 LIVE 23/23. | Vitest integration | Yes |

### Traceability
| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02` | `AC-03` |
| `RQ-03` | `STEP-03` | `AC-04` |
| `RQ-04` | `STEP-01` | `AC-01` |

## 7. Risk và Rollback
Forward-only migrations; rollback code commit riêng. Database tạm có thể drop; upgraded test branch giữ migration history.

## 8. Open Questions
Không có blocking question.

## 9. Planner Resolution
| Round | Decision | Evidence | Closure |
|---|---|---|---|
| `1` | `ACCEPTED` | Clean/upgraded 20 migrations, two empty diffs, 135/135 LIVE. | Closed under Founder waiver |

## 10. Revision Log
| Version | Date | Change |
|---|---|---|
| `v1.0` | `2026-08-24` | Close canonical migration baseline. |