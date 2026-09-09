# TASK: hrp-portal-m12.1-bod-projects-fix

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m12.1-bod-projects-fix |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M12.1-BoD-Projects-Fix |
| ADR references | M12 Audit Gap (DEV-01, BLK-01) |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m12.1-bod-projects-fix |
| Updated | 2026-08-20 23:45 +07:00 |

## 1. Outcome

### User-visible outcome

- **Sửa lỗi Crash `/bod`:** Khắc phục ngay lập tức lỗi 500 (Application error) khi truy cập trang Dashboard của Giám đốc. Lỗi này có thể xuất phát từ việc logic tính toán Aggregate bị `null` (vd: `totalNeededAgg._sum.slotsNeeded`) hoặc từ Permission Denied của Database.
- **Dữ liệu chuẩn:** Danh sách "Dự án trọng điểm" (Priority Projects) sẽ được hiển thị đúng từ bảng `Project` (có liên kết đến assignments và margin), thay vì vay mượn bảng `VendorStatement` sai nghiệp vụ.

### Non-goals

- Không thiết kế lại toàn bộ UI, chỉ sửa lại luồng truy xuất dữ liệu bên dưới (Services) và xử lý triệt để các lỗi Exception (Null Safety).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | M12 AUDIT | Bảng "Priority Projects" đang đọc từ `VendorStatement`. | Sai nghiệp vụ BoD. Cần viết lại hàm `getPriorityProjects` để query từ bảng `Project`. |
| `EV-02` | User Report | Truy cập `/bod` bị lỗi 500 Server-side exception. | Hàm `getBodSnapshot()` đang không an toàn khi Database rỗng hoặc thiếu bảng, cần thêm Try/Catch và Fallback default. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Thêm cơ chế phòng thủ (Defensive Programming) vào toàn bộ các hàm trong `bod.service.ts`: Nếu DB query lỗi hoặc trả về `null`, phải fallback về `0` hoặc mảng rỗng `[]` thay vì crash. | Planner | Valid |
| `DEC-02` | CHOSEN | Đổi logic query Priority Projects: Lấy từ `Project` kết hợp `ProjectAssignment`. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | **Null Safety:** Sửa các hàm aggregate (như `getHeadcount`, `getFinance`) đảm bảo nếu DB trả về `null` thì fallback thành `0`. Xử lý try/catch bao bọc `getBodSnapshot`. | Must | EV-02 | Trang web tiếp tục crash. |
| `RQ-02` | **Refactor Priority Projects:** Sửa `getPriorityProjects()` query từ bảng `Project` (sắp xếp theo quy mô hoặc số assignment). Trả về đúng interface `PriorityProjectRow`. | Must | EV-01 | Sai số liệu dự án. |
| `RQ-03` | Pass toàn bộ test suite và build Next.js thành công. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- `src/lib/services/bod.service.ts`
- `app/bod/page.tsx` (nếu cần đổi logic hiển thị lỗi)

**Out of scope:**
- Các trang khác ngoài `/bod`.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Truy vấn `Project` thay cho `VendorStatement` ở mục Priority.
- **Failure:** Nếu Prisma throw error, log lỗi ở Server và trả về Snapshot rỗng để UI hiện empty state chứ không ném Error 500 ra Client (trừ khi cố tình muốn hiện Error Boundary).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `bod.service.ts` | Thêm fallback `?? 0` vào tất cả hàm sum/count. Thêm Try/Catch. | N/A | Check UI | Syntax Error |
| `STEP-02` | `RQ-02` | `bod.service.ts` | Viết lại hàm `getPriorityProjects` query từ `Project`. | `STEP-01` | Check UI | 500 Error |
| `STEP-03` | `RQ-03` | Quality | Chạy vitest và build. | `STEP-02` | `npm run build` | Build Fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-02` | Truy cập `/bod` không bị lỗi 500 kể cả khi Database rỗng. Danh sách dự án hiện đúng tên Project. | Load UI `/bod` | Chụp màn hình | Yes |
| `AC-02` | `RQ-03` | Build thành công. | `npm run build` | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-01` |
| `RQ-03` | `STEP-03` | `AC-02` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Interface `PriorityProjectRow` thay đổi làm vỡ UI. | Trang crash do gọi sai properties. | Giữ nguyên interface, chỉ fake các properties nào chưa có từ bảng Project. | Revert code. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None | - | - | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | N/A | ACCEPT | UI không còn crash 500 khi DB lỗi (chỉ trả về 0/rỗng). Logic Project chuẩn. | Không | Tier 1 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-20 | Tạo task hrp-portal-m12.1-bod-projects-fix. | Sửa lỗi 500 Crash và sai nghiệp vụ (DEV-01). |
