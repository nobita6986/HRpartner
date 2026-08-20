# TASK: hrp-portal-m11-affiliate-db-migration

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m11-affiliate-db-migration |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M11-Affiliate-DB-Migration |
| ADR references | M9 Audit Finding (AUD-002) |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m11-affiliate-db-migration |
| Updated | 2026-08-20 22:30 +07:00 |

## 1. Outcome

### User-visible outcome

- **Không có thay đổi về giao diện (UI).** Người dùng (CTV) vẫn sử dụng chức năng "Yêu cầu rút tiền" bình thường trên Affiliate Dashboard.
- Cải tiến hiệu năng & tính toàn vẹn dữ liệu (Data Integrity): Dữ liệu rút tiền sẽ được lưu an toàn trong PostgreSQL Database thay vì file `.json` local, giúp ứng dụng sẵn sàng triển khai lên Vercel Edge Serverless.

### Non-goals

- Không thiết kế lại hoặc thay đổi chức năng hiển thị UI của Affiliate.
- Không lập trình luồng Payment Gateway. Chỉ cập nhật bộ khung Database để lưu Request chờ duyệt.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `M9 AUDIT.md (AUD-002)` | Luồng Affiliate Withdrawal đang dùng file `withdrawals.json`. | Vercel Serverless/Edge không hỗ trợ ghi file tĩnh. Cần DB Schema thật. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Định nghĩa một Model Prisma tên là `CtvWithdrawalRequest`. | Planner | Valid |
| `DEC-02` | CHOSEN | Tái cấu trúc API Route (`/api/ctv/withdrawals/route.ts`) để tương tác với Prisma. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | **Database Schema:** Cập nhật `schema.prisma`, thêm model `CtvWithdrawalRequest` có đủ các trường (id, userId, amount, status, createdAt...). | Must | EV-01 | Prisma generate fail. |
| `RQ-02` | **Prisma Migration:** Chạy lệnh `npx prisma migrate dev` hoặc tương đương để đồng bộ DB. | Must | EV-01 | Lỗi SQL query. |
| `RQ-03` | **API Route Migration:** Sửa logic API `app/api/ctv/withdrawals/route.ts` thay vì đọc/ghi file `.json`, hãy đọc/ghi vào Database bằng Prisma Client. | Must | EV-01 | Lỗi lưu dữ liệu rút tiền. |
| `RQ-04` | Pass toàn bộ test suite và build Next.js thành công. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- `prisma/schema.prisma`
- `app/api/ctv/withdrawals/route.ts`
- Thư mục dữ liệu ảo tạm nếu có đang được sử dụng (xoá `withdrawals.json`).

**Out of scope:**
- Các API không liên quan tới CTV.
- Giao diện UI/UX (app/ctv/page.tsx).

### 4.3 Data, State, Permission và Interface Rules

- **Data:**
  - `status` của Withdrawal Request có thể là `PENDING`, `APPROVED`, `REJECTED`.
  - Phải có ràng buộc quan hệ với `User` (userId).
- **Interface:** API trả về chuẩn JSON response format gốc, chỉ thay đổi luồng xử lý bên dưới.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `schema.prisma` | Định nghĩa model `CtvWithdrawalRequest`. | N/A | `npx prisma format` | Syntax Error |
| `STEP-02` | `RQ-02` | DB Migration | Chạy migrate (tạo file migration mới cho DB). | `STEP-01` | DB table created | Migration Fail |
| `STEP-03` | `RQ-03` | `route.ts` | Refactor API Endpoint từ FS write sang Prisma. | `STEP-02` | Test API | 500 Error |
| `STEP-04` | `RQ-04` | Quality | Chạy vitest và build. | `STEP-03` | `npm run build` | Build Fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-02` | Prisma generate được file Type và Migration thành công, không xung đột DB hiện tại. | `npx prisma validate` | Log terminal | Yes |
| `AC-02` | `RQ-03` | API POST Withdrawal chạy thành công và bản ghi hiện trên CSDL thật. | Gọi qua UI hoặc curl | Ảnh chụp DB Table / Log | Yes |
| `AC-03` | `RQ-04` | Build Next.js thành công. | Chạy lệnh `npm run build` | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-01` |
| `RQ-03` | `STEP-03` | `AC-02` |
| `RQ-04` | `STEP-04` | `AC-03` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Lỗi DB do xung đột schema. | Migration bị failed khi chạy DB cũ. | Kiểm tra kỹ quan hệ (Relation) với `User` và tuân thủ Prisma schema rules. | `npx prisma migrate resolve --rolled-back` hoặc reset DB dev. |

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
| `v1.0` | 2026-08-20 | Tạo task hrp-portal-m11-affiliate-db-migration. | Khắc phục nợ kỹ thuật (AUD-002) từ M9. |
