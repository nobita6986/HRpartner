# TASK: hrp-portal-m10-bod-dashboard

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m10-bod-dashboard |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M10-BoD-Dashboard (M5 gốc) |
| ADR references | Design System: S01_ControlTower |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m10-bod-dashboard |
| Updated | 2026-08-20 22:05 +07:00 |

## 1. Outcome

### User-visible outcome

- **Ban Giám đốc (BoD):** Truy cập `/bod` (Control Tower) sẽ thấy một màn hình Dashboard tập trung, phản ánh đúng thiết kế từ `S01_ControlTower_Default_1440.html`.
- Màn hình bao gồm 4 thẻ chỉ số sinh tử (Headcount, Tỷ lệ lấp đầy, Sức khỏe tài chính, Hiệu suất tuyển dụng) và các thông báo/biểu đồ tương ứng.

### Non-goals

- Chưa tích hợp API thật tính toán các chỉ số phức tạp từ Database. Chúng ta sử dụng Mock data để hoàn thiện giao diện trước.
- Không thay đổi luồng xác thực hay phân quyền quá sâu, mặc định `/bod` dùng UI layout mới.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/roadmap-portals.md` | M5 gốc (Control Tower) chưa được thực hiện. | Cần tạo trang Dashboard cho BoD. |
| `EV-02` | `docs/tasks/hrp-v4-bod-mockup/mockup` | Đã có sẵn thiết kế HTML chi tiết (S01 series). | Tier 2 sẽ sử dụng HTML/CSS từ Mockup để chuyển đổi sang Next.js/Tailwind. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Sử dụng Mock data (JSON) cho các chỉ số trên BoD Dashboard để tách biệt việc làm UI với việc tính toán data. | Planner | Valid |
| `DEC-02` | CHOSEN | Áp dụng Layout chuẩn (Global Navbar/Footer) từ Milestone 1. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | **BoD Layout:** Chuyển đổi mã HTML/CSS từ `S01_ControlTower_Default_1440.html` thành component React ở `app/bod/page.tsx`. | Must | EV-02 | Lệch thiết kế, vỡ layout. |
| `RQ-02` | **Chỉ số (Cards):** Hiển thị đủ 4 nhóm KPI chính (Workers, Pipeline, Finance, Performance). | Must | EV-01 | UI thiếu thông tin. |
| `RQ-03` | **Mock Data:** Định nghĩa interface và nhúng mock data hợp lý để UI render đẹp. | Must | DEC-01 | Lỗi hiển thị, code cứng quá nhiều. |
| `RQ-04` | Pass toàn bộ test suite và build Next.js thành công. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- `app/bod/page.tsx`
- Các component con của Dashboard (vd: `src/components/bod/*` nếu cần tách nhỏ).
- Mock data/JSON tĩnh cho Dashboard.

**Out of scope:**
- Viết API tính toán thật cho 4 thẻ KPI.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Sử dụng Mock object (tĩnh).
- **Interface:** Layout chuẩn Tailwind v4, Mobile-responsive ở mức cơ bản (nếu có trong thiết kế).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-02` | `app/bod/page.tsx` | Tạo file page, cắt HTML từ Mockup S01 chuyển sang React Components (JSX/Tailwind). | N/A | Check UI | Syntax Error |
| `STEP-02` | `RQ-03` | `app/bod/page.tsx` | Thay thế các text cứng bằng biến Mock Data. Tách nhỏ component nếu trang quá dài. | `STEP-01` | Check Code | 500 Error |
| `STEP-03` | `RQ-04` | Quality | Chạy vitest và build. | `STEP-02` | `npm run build` | Build Fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-02`, `RQ-03` | Dashboard load mượt, hiển thị 4 KPI cards đúng với bản thiết kế S01. | Truy cập `/bod` | Ảnh chụp màn hình | Yes |
| `AC-02` | `RQ-04` | Build Next.js thành công. | Chạy lệnh `npm run build` | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-01` |
| `RQ-03` | `STEP-02` | `AC-01` |
| `RQ-04` | `STEP-03` | `AC-02` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | CSS từ bản mockup có thể đụng độ với global Tailwind config hiện tại (Design System M1). | Vỡ layout trang khác. | Dùng đúng utility classes của Tailwind, hạn chế copy CSS thuần. | Revert commit. |

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
| `v1.0` | 2026-08-20 | Tạo task hrp-portal-m10-bod-dashboard. | Theo roadmap M5 gốc (BoD Control Tower). |
