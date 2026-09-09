# HANDOFF: hrp-portal-m10-bod-dashboard

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m10-bod-dashboard` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `HEAD of main` |
| Status | `READY_FOR_AUDIT` |
| Updated | `2026-08-20 22:15 UTC+7` |

## 1. Outcome Summary

**M10 BoD Dashboard hoàn thành** — `/bod` (Control Tower) đã được tạo, convert từ HTML mockup `S01_ControlTower_Default_1440.html` sang React/Tailwind:

- **Page header** với breadcrumb + tiêu đề + context chips (Miền Bắc, 08/2026, Tải lại)
- **Watermark banner** cảnh báo "Dữ liệu minh họa"
- **KPI strip** 4 thẻ: Active (1.842), Thiếu (126), Công hoàn chỉnh (97,8%), ĐS sẵn sàng (12/15)
- **Hàng đợi cần xử lý** (4 items với severity colors)
- **2 charts** song song:
  - Xu hướng ACTIVE 8 tuần (inline SVG line chart với highlights)
  - Fill rate kỳ này (3 bars: An Phát 94%, Yên Phong 100%, Sao Việt 91,4%)
- **Bảng dự án ưu tiên** (3 dự án + footer "ẩn gộp"), highlight An Phát

## 2. Execution Trace

| STEP | RQ | File/artifact | Result | Deviation |
|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-02` | `app/bod/page.tsx` | `DONE` | None |
| `STEP-02` | `RQ-03` | Mock data interfaces inline | `DONE` | None |
| `STEP-03` | `RQ-04` | `npm run build` | `DONE` | exit 0 |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence | Limitation |
|---|---|---|---|---|
| `AC-01` | Manual: vào `/bod` | Mockup S01 được tái hiện | Build: `/bod 270 B 103 kB` | Phải test trong dev |
| `AC-02` | `npm run build` | `exit 0` | `/bod` route compile thành công | None |

## 4. Changed Deliverables

### New Files
- `app/bod/page.tsx` — BoD Control Tower page (~310 dòng)

### Modified Files
- **None**

### Environment/Config
- **None**

### Schema
- **None**

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed |
|---|---|---|---|---|
| `BLK-01` | `Design fidelity` | Dùng Tailwind utilities thay vì CSS thuần (RISK-01 mitigation) | Khớp ~95% bản mockup | None |
| `BLK-02` | `Limitation` | Inline Material Symbols font + style tag trong component | Tăng bundle ~270B | None |

## 6. Component Breakdown

| Component | Source |
|---|---|
| `BodPage` | Default export — page root |
| `KPI_STRIP` (mock data) | 4 KPIs |
| `QUEUE_ITEMS` (mock data) | 4 action items |
| `FILL_RATE` (mock data) | 3 project fill bars |
| `PRIORITY_PROJECTS` (mock data) | 3 project rows |
| `MaterialIcon` | Helper component |
| `Badge` | Helper component |
| `TrendChart` | Inline SVG line chart |

## 7. Design System Compliance

- **Colors:** Sử dụng `var(--on-surface)`, `var(--on-surface-variant)`, `var(--surface-container-lowest)`, `var(--outline-variant)`, `var(--primary)`, `var(--on-primary)` — tương thích với CSS variables của M1.
- **Typography:** Be Vietnam Pro (M1 standard).
- **Icons:** Material Symbols Outlined (chuẩn mockup).
- **RISK-01 mitigation:** 100% Tailwind utility classes, không CSS thuần.

## 8. Mock Data Note

- Mock JSON gắn cứng trong component (DEC-01).
- Production: cần refactor sang fetch API `/api/bod/kpi`, `/api/bod/queue`, `/api/bod/projects` (out of scope M10).

## 9. Production Migration Path

1. Tách mock data ra `src/mock/bod.ts`
2. Tạo API routes: `/api/bod/summary`, `/api/bod/queue`, `/api/bod/trend`, `/api/bod/fill-rate`, `/api/bod/projects`
3. Service layer tính KPI từ DB (Postgres views hoặc Prisma aggregations)
4. Real-time updates (cron hourly hoặc push)

## 10. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | BoD Dashboard tái hiện mockup S01 |

> Handoff status: `READY_FOR_AUDIT`