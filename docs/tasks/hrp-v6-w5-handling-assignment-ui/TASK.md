# TASK — hrp-v6-w5-handling-assignment-ui

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-w5-handling-assignment-ui |
| Work type | CODE |
| Assurance lane | STANDARD |
| Audit mode | LIGHT |
| Audit reason | Involves new read services querying RLS-sensitive data (Labor Profile, Company Pool) and new manager actions. |
| Spec version | v1.0 |
| Status | READY_FOR_AUDIT |
| Planner | Tier 1 |
| Baseline | 4e6d0c138033e963ac7ade5ed69a7d7a77243a4f |
| In-scope roots | app/admin/labor-profiles/**, src/domains/talent/**, docs/tasks/hrp-v6-w5-handling-assignment-ui/**, app/api/admin/labor-profiles/** |
| Forbidden paths | prisma/schema.prisma, prisma/migrations/**, src/domains/applications/**, src/domains/referrals/** |
| Required gates | npm run typecheck, npm run lint, npm run test:unit, npm run build |
| Current execution round | 0 |
| Current audit round | 0 |
| Next gate | /deliver → /audit → /resolve |

## 1. Outcome

### 1.1 User-visible outcome

- UI admin trang danh sách LaborProfile có thêm tab lọc "Kho chung (Company Pool)" cho các profile không có người phụ trách (hoặc đã hết hạn).
- UI admin trang chi tiết LaborProfile block "Người phụ trách" hiển thị thông tin thực tế từ LaborProfileHandlingAssignment (người phụ trách, thời hạn, nguồn, lịch sử).
- Quản lý có thể gán, chuyển giao, hoặc thu hồi assignment thông qua một hành động trên giao diện (sử dụng API endpoint gọi managerAssign service).

### 1.2 Non-goals

- Beneficiary UI / CommissionBeneficiaryDecision (chờ AFF-05B).
- Ticket/Case dispute UI (chờ hạ tầng Case theo V6-DEC-028).
- Không tạo schema migration mới.
- Không đụng chạm UI hay logic của các domain khác.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | src/domains/talent/labor-profile.read-service.ts | Implement view COMPANY_POOL and append handling details |
| EV-02 | src/domains/talent/handling-assignment.service.ts | Extend with releaseHandlingAssignment and getHistory |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Lazy expiry for Company Pool via query (expires_at < now()). | CHOSEN |
| DEC-02 | Add releaseHandlingAssignment write method to set ACTIVE to EXPIRED. | CHOSEN |
| DEC-03 | Re-use existing components for UI User Selector or build simple dropdown. | CHOSEN |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | Xem ai đang phụ trách, thời hạn còn lại (server clock), nguồn giao, và lịch sử giao nhận. |
| RQ-02 | Quản lý Company Pool: lọc các profile hết hạn / chưa có handling active (KHÔNG chờ scheduler). |
| RQ-03 | Manager assign/transfer/release hành động qua API. |
| RQ-04 | createdBy/updatedBy KHÔNG hiển thị thành assignee/beneficiary. Tên bị RLS che hiển thị "Không có quyền xem". |

### 4.2 Scope boundaries

- **In:** app/admin/labor-profiles/page.tsx, app/admin/labor-profiles/[id]/page.tsx, src/domains/talent/labor-profile.read-service.ts, src/domains/talent/handling-assignment.service.ts, app/api/admin/labor-profiles/**
- **Out:** prisma/schema.prisma, prisma/migrations/**, src/domains/applications/**, src/domains/referrals/**
- **Allowed task artifacts:** docs/tasks/hrp-v6-w5-handling-assignment-ui/**

### 4.3 Domain boundaries

- **Data/state:** Read service uses lazy expiry expires_at < now(). Write only uses existing managerAssign and the new releaseHandlingAssignment.
- **Permission/security:** Display "Không có quyền xem" instead of blank for RLS-hidden names. Action requires manager permissions (handled by API).
- **Interface/API:** New POST endpoint for manager assign/release.
- **Migration/rollback:** N/A.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | src/domains/talent/handling-assignment.service.ts | Add releaseHandlingAssignment and history read method | npm run test:unit | If schema changes are needed (not allowed) |
| STEP-02 | src/domains/talent/labor-profile.read-service.ts | Support COMPANY_POOL and attach handling info to detail | npm run test:unit | N/A |
| STEP-03 | app/api/admin/labor-profiles/[id]/handling-assignments/route.ts | API endpoint for manager actions | npm run typecheck | N/A |
| STEP-04 | app/admin/labor-profiles/** | Update UI components (Block 4, filter, modal) | npm run build | N/A |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | All typecheck, lint, and unit tests pass. | npm run test:unit |
| AC-02 | Build succeeds without errors. | npm run build |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-02, STEP-04 | AC-01, AC-02 |
| RQ-02 | STEP-02, STEP-04 | AC-01, AC-02 |
| RQ-03 | STEP-01, STEP-03, STEP-04 | AC-01, AC-02 |
| RQ-04 | STEP-04 | AC-01, AC-02 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | P2002 conflicts in managerAssign. | Return 409 Conflict in API route. |
| RISK-02 | TIER0 §5 N5 Audit Event, Idempotency, Outbox gaps for managerAssign / releaseHandlingAssignment. | T3 carry-forward to N5 follow-up since outbox/idempotency requires larger infrastructural pattern. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-18 | Initial contract | Initial |
