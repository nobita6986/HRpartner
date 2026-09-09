# TASK: hrp-portal-m12-bod-api-integration

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m12-bod-api-integration |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M12-BoD-API-Integration |
| ADR references | M10 Audit Gap |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m12-bod-api-integration |
| Updated | 2026-08-20 22:30 +07:00 |

## 1. Outcome

### User-visible outcome

- Giao diện **BoD Dashboard (`/bod`)** sẽ hiển thị dữ liệu thật được tính toán trực tiếp từ cơ sở dữ liệu (Database) thay vì dùng dữ liệu Mock tĩnh (hard-coded).
- Các chỉ số bao gồm: Tổng nhân sự (Headcount), Tỷ lệ lấp đầy (Utilization), Quỹ lương (Finance) và Hiệu suất tuyển dụng (Pipeline) sẽ thay đổi khi có dữ liệu mới trong hệ thống.

### Non-goals

- Không thiết kế lại giao diện Dashboard (đã hoàn thiện ở M10).
- Không tối ưu hoá quá sâu các truy vấn (Aggregations) nếu lượng dữ liệu hiện tại chưa đủ lớn để gây nghẽn. Cứ ưu tiên độ chính xác trước.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `M10 AUDIT.md` (Coverage Gaps) | Dữ liệu trên `/bod` đang được gán cứng (hard-coded). | Bắt buộc phải viết các hàm truy vấn DB (Server Actions / API) để lấy dữ liệu thật. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Sử dụng React Server Components (hoặc Server Actions) trực tiếp trong `app/bod/page.tsx` để truy vấn Prisma thay vì viết API `/api/bod` rời rạc, giúp tối ưu thời gian load. | Planner | Valid |
| `DEC-02` | ASSUMPTION | Nếu một số logic phức tạp (như quỹ lương) chưa có data thật chuẩn, sẽ trả về kết quả truy vấn cơ bản (ví dụ: sum(amount) từ bảng Payment). | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | **Truy vấn Headcount:** Đếm số lượng Worker có trạng thái active từ Database. | Must | EV-01 | Trả về 0 hoặc báo lỗi. |
| `RQ-02` | **Truy vấn Finance:** Tính tổng chi phí lương/hoa hồng đã trả (hoặc dự kiến) từ bảng liên quan. | Must | EV-01 | Không hiện biểu đồ/số liệu. |
| `RQ-03` | **Truy vấn Pipeline:** Thống kê số ứng viên, tỷ lệ chuyển đổi từ dữ liệu Applicant/Vendor. | Should | EV-01 | Fallback về giá trị mặc định. |
| `RQ-04` | **Tích hợp UI:** Thay thế toàn bộ Mock Data JSON trong `app/bod/page.tsx` bằng dữ liệu query từ Prisma. | Must | EV-01 | Code cũ vẫn còn gán cứng. |
| `RQ-05` | Pass toàn bộ test suite và build Next.js thành công. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- `app/bod/page.tsx` (và các component con liên quan nếu có)
- `src/lib/services/bod.service.ts` (Khuyến khích tạo file service riêng để chứa các hàm query Prisma cho gọn UI).

**Out of scope:**
- Đổi giao diện UI của M10.
- Các API bên ngoài luồng BoD.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Truy vấn dạng Aggregation (`prisma.xxx.count`, `prisma.xxx.aggregate`). Nên dùng `Promise.all` để fetch 4 thẻ KPI cùng lúc nhằm giảm thiểu độ trễ (latency).
- **Interface:** Giữ nguyên Type interface của dữ liệu Mock để giao diện Component không bị vỡ.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01`->`RQ-03` | `bod.service.ts` | Tạo các hàm query Prisma (getHeadcount, getFinance...). Trả về định dạng khớp với Mock Data. | N/A | Check type | Syntax Error |
| `STEP-02` | `RQ-04` | `app/bod/page.tsx` | Xóa Mock JSON tĩnh. Import service và gọi hàm query để truyền data vào UI components. | `STEP-01` | Check UI | 500 Error |
| `STEP-03` | `RQ-05` | Quality | Chạy vitest và build. | `STEP-02` | `npm run build` | Build Fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-02`, `RQ-03` | Các thẻ KPI trên trang `/bod` hiển thị số liệu lấy từ Database thật. Khi sửa số liệu trong DB, Dashboard thay đổi theo. | Sửa Database + Refresh `/bod` | Chụp màn hình UI và DB | Yes |
| `AC-02` | `RQ-04` | Không còn từ khóa Mock tĩnh (như mảng JSON gán cứng) trong file page chính. | Check code | Code snippet | Yes |
| `AC-03` | `RQ-05` | Build Next.js thành công. | Chạy lệnh `npm run build` | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-01` |
| `RQ-03` | `STEP-01` | `AC-01` |
| `RQ-04` | `STEP-02` | `AC-02` |
| `RQ-05` | `STEP-03` | `AC-03` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Truy vấn Prisma bị chậm (N+1 query hoặc Aggregate lâu) do chưa có Index. | Load trang `/bod` mất quá nhiều thời gian (>3s). | Dùng `Promise.all` để chạy song song. Có thể Cache query bằng React `cache`. | Revert dùng Mock Data. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Nếu schema hiện tại chưa lưu đủ dữ liệu tuyển dụng chi tiết để tính "Tỷ lệ lấp đầy" thì tính sao? | Tier 2 (Executor) | Lúc code | Fallback về tính tỷ lệ cơ bản nhất (số Job có Worker so với tổng Job). |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | BLK-03 | Sửa Traceability | Script verify-task không hỗ trợ range `->`. | Đã sửa thành 3 dòng RQ-01, RQ-02, RQ-03. | Antigravity / DONE |
| 1 | BLK-01 | Chờ task hrp-m11.1-db-baseline | Lỗi DB drift Neon chung với M11. | Phải dọn dẹp DB trước khi verify được AC-01. | Antigravity / BLOCKED |
| 1 | DEV-01 | Tạo task hrp-portal-m12.1-bod-projects | Hiển thị Vendor Statement thay cho Project làm sai khác nghiệp vụ BoD mong đợi. Cần truy vấn `Project` thật. | Mở task M12.1 riêng để sửa. | Antigravity / PLANNED |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-20 | Tạo task hrp-portal-m12-bod-api-integration. | Khắc phục nợ kỹ thuật (Hard-coded Mock Data) từ M10. |
