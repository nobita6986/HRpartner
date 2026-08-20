# TASK: hrp-m12.1.1-db-grants

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-m12.1.1-db-grants |
| Work type | INFRA |
| Audit mode (Tier 3 đọc) | INFRA_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M12.1.1-DB-Grants |
| ADR references | DEV-02/03 Permission Issues |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-m12.1.1-db-grants |
| Updated | 2026-08-21 00:15 +07:00 |

## 1. Outcome

### User-visible outcome

- **Hệ thống hết lỗi phân quyền:** Dữ liệu trên toàn bộ trang `/bod` và `/ctv` (withdrawal) sẽ có thể đọc/ghi bình thường vào CSDL Postgres (Neon) mà không bị kẹt lỗi `42501 permission denied`.

### Non-goals

- Không tạo cấu trúc bảng mới (Schema). Chỉ tập trung cấp quyền cho các role Database (như `app_user_writer`).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | M12.1 Handoff / M12 Audit | Lỗi `42501 permission denied` xảy ra liên tục khi UI (Prisma Client) query vào Postgres. | Cần tạo task chạy script DCL (`GRANT`) để fix quyền. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Cấp quyền `GRANT ALL ON SCHEMA public TO app_user_writer` và cấp quyền mặc định cho các bảng hiện tại. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | **SQL Grant:** Viết hoặc chạy câu lệnh SQL để GRANT quyền sử dụng SCHEMA và các Tables/Sequences cho role Prisma (VD: `app_user_writer`). | Must | EV-01 | Prisma không query được. |

### 4.2 Scope boundaries

**In scope:**
- Script thao tác Database (Ví dụ: `prisma/seed.mjs` hoặc một file `.sql`).

**Out of scope:**
- Sửa file logic `.ts`, `.tsx`.

### 4.3 Data, State, Permission và Interface Rules

- **Permission:** Role truy xuất DB (connection string dùng role nào thì cấp cho role đó, hoặc grant cho public/app_user_writer).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | Database | Viết script hoặc gọi `npx prisma db execute` để cấp quyền (GRANT ALL). | N/A | Query check | Lỗi SQL |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Các query (VD gọi `getBodSnapshot()`) chạy không còn bị ném lỗi 42501. | Chạy thử `/bod` | Không có | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Cấp dư quyền (Over-permissive). | | Ở môi trường Dev/Test có thể chấp nhận GRANT ALL. | Thu hồi quyền. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None | - | - | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-21 | Tạo task hrp-m12.1.1-db-grants. | Sửa lỗi quyền DB. |
