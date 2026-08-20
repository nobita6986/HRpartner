# TASK: hrp-m13-backend-expansion

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-m13-backend-expansion |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M13-Database-Backend |
| ADR references | UNIFIED_PLAN_v5.md (M13) |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-m13-backend-expansion |
| Updated | 2026-08-21 00:30 +07:00 |

## 1. Outcome

### User-visible outcome

- **Cấu trúc quản lý mới:** Nền tảng Database và Prisma Client sẽ hỗ trợ 2 Quản lý phụ (`subPmUserId1`, `subPmUserId2`) cho mỗi Dự án (`Project`), phục vụ cho các tổ chức phức tạp nhiều tầng quản lý.
- **Worker Management:** Mỗi Người lao động (`Worker`) sẽ được gán trực tiếp với một Quản lý (`managerId`), giúp dễ dàng filter và phân quyền xem dữ liệu trên UI sau này.

### Non-goals

- Chưa làm màn hình UI (Frontend) cho tính năng này (UI sẽ thuộc các phase sau).
- Không động chạm tới phần Tín dụng (Commission Engine) hay luồng Transfer nội bộ.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | UNIFIED_PLAN_v5.md (M13) | Yêu cầu mở rộng schema `Project` và `Worker`. | Cần chạy Prisma schema update và migration. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Thêm `subPmUserId1` và `subPmUserId2` dưới dạng quan hệ (relation) trỏ đến `User` table trong model `Project`. (Nullable) | Planner | Valid |
| `DEC-02` | CHOSEN | Thêm `managerId` dưới dạng quan hệ trỏ đến `User` trong model `Worker`. Cung cấp seed/fallback logic nếu cần. (Nullable) | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | **Update Prisma Schema:** Thêm `subPmUserId1` (String?), `subPmUserId2` (String?) vào `Project`. Thiết lập quan hệ tới `User`. | Must | EV-01 | Lỗi Migrate Prisma |
| `RQ-02` | **Update Prisma Schema:** Thêm `managerId` (String?) vào `Worker`. Thiết lập quan hệ tới `User`. | Must | EV-01 | Lỗi Migrate Prisma |
| `RQ-03` | **Tạo Migration:** Tạo và chạy file migration mới bằng lệnh `npx prisma migrate dev --name init_m13`. | Must | EV-01 | DB không đồng bộ. |

### 4.2 Scope boundaries

**In scope:**
- `prisma/schema.prisma`
- Thư mục `prisma/migrations`

**Out of scope:**
- Components frontend (`app/**/*.tsx`)
- Logic commission/transfer.

### 4.3 Data, State, Permission và Interface Rules

- Cần đảm bảo thêm các thuộc tính `name` phù hợp cho quan hệ (Ví dụ: `@relation("ProjectSubPm1", fields: [subPmUserId1], references: [id])`) vì một `Project` đang trỏ đến `User` nhiều lần (PM chính, PM phụ 1, PM phụ 2).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-02` | `schema.prisma` | Bổ sung fields và thiết lập `@relation` chính xác để tránh xung đột tên. | N/A | `npx prisma validate` | Syntax Error |
| `STEP-02` | `RQ-03` | Database | Chạy migration để áp schema mới xuống DB. | `STEP-01` | `npx prisma migrate dev` | Lỗi DB Engine |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-02`, `RQ-03` | File migration SQL được sinh ra thành công, DB Schema được cập nhật mà không làm hỏng dữ liệu cũ. | Lệnh migrate thành công | Commit chứa thư mục migration | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-01` |
| `RQ-03` | `STEP-02` | `AC-01` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Tên relation trong Prisma bị trùng lặp. | Khi chạy validate báo lỗi Ambiguous Relation. | Explicitly define name `@relation("UserToSubPm1")`. | Sửa lại schema. |

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
| `v1.0` | 2026-08-21 | Tạo task hrp-m13-backend-expansion. | Bắt đầu M13 theo kế hoạch V5. |
