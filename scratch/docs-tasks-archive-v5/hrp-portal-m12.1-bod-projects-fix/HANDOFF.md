# HANDOFF: hrp-portal-m12.1-bod-projects-fix

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m12.1-bod-projects-fix` |
| Work type | CODE |
| Audit mode (phải khớp TASK) | CODE_AUDIT |
| Spec version | v1.0 |
| Execution round | 1 |
| Current audit round | 0 |
| Executor | Tier 2 (Cursor assistant, hrp-engineer role) |
| Baseline | HEAD of `main` tại `C:\CodeApp\HrP` sau M11.2 (seed) |
| Status | READY_FOR_AUDIT |
| Started/updated | 2026-08-21 00:01 → 00:12 +07:00 |

## 1. Outcome Summary

Mục tiêu: (1) fix DEV-01 (Priority Projects hiện `Vendor` sai nghiệp vụ thay vì Project nội bộ), (2) chống crash 500 trên `/bod` khi DB lỗi/rỗng.

**Đã hoàn thành:**
- **RQ-01 (Null Safety):** Wrap try/catch quanh tất cả 6 sub-query trong `bod.service.ts` (`getHeadcount`, `getFinance`, `getPipeline`, `getFillRateRows`, `getQueue`, `getPriorityProjects`) + wrap try/catch cho `getBodSnapshot` ở level trên. Mỗi hàm fallback về `0` / `[]` / empty snapshot khi Prisma throw error. Thêm `?? 0` cho mọi `slotsNeeded` / `slotsFilled` aggregate.
- **RQ-02 (Priority Projects):** Viết lại `getPriorityProjects()` query từ bảng `Project` (kết hợp `ProjectAssignment ACTIVE` + `TimesheetPeriod LOCKED` qua lookup riêng) thay vì `VendorStatement`. Sort theo ACTIVE count desc rồi quota desc. Map đầy đủ 9 fields của `PriorityProjectRow` interface (giữ nguyên UI shape).
- **UI consistency:** Sửa empty-state text trong `app/bod/page.tsx` line 296 — đổi `"Chưa có Vendor Statement trong kỳ này."` → `"Chưa có dự án ưu tiên trong hệ thống."` (khớp với service mới).
- Xóa 2 helper unused (`formatThousands`, `severityKind`) sau khi refactor.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `src/lib/services/bod.service.ts` (getHeadcount, getFinance, getPipeline, getFillRateRows, getQueue, getBodSnapshot) | DONE | Tất cả 6 hàm wrap try/catch; fallback `0` / `[]` / empty snapshot. |
| `STEP-02` | `RQ-02` | `src/lib/services/bod.service.ts` (getPriorityProjects) | DONE | Query `Project` thay cho `VendorStatement`. Lookup `TimesheetPeriod` riêng (Project không có relation trực tiếp đến TimesheetPeriod trong schema — `ProjectId` optional trên TimesheetPeriod). Sort theo ACTIVE count desc. Map đầy đủ `PriorityProjectRow`. |
| `STEP-02-side` | — | `app/bod/page.tsx` (empty state) | DONE | Đổi text fallback từ "Vendor Statement" → "dự án ưu tiên". |
| `STEP-03` | `RQ-03` | `npm run build` | DONE | **PASS — exit 0**, `/bod` route được build thành công (270 B server component). Không có type error, không có lint error. |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| `AC-01` (RQ-01, RQ-02) | HTTP `GET http://localhost:3000/bod` (dev server) | HTTP 200; body length 69025 bytes; không chứa `"Application error"` / `"Internal Server Error"`; section headers (`Dự án`, `ưu tiên`, `Hàng đợi`, `Tổng quan`, `Danh mục dự án`) render đầy đủ; không còn text `"Chưa có Vendor Statement"` (sai nghiệp vụ cũ) hay `"Vendor xxxxxx"` (label sai). | Server log: `Compiled /bod in 726ms (725 modules)`, `GET /bod 200 in 1860ms`. Các query throw `42501 permission denied` (infra issue — không phải bug code) → fallback rỗng → page vẫn render thành công. | **DB permissions**: `app_user_writer` (DATABASE_URL runtime) bị `42501 permission denied for schema public` sau M11.1 `db push` — grant privileges đã mất. Cần M12.1.1 task để grant lại privileges. Hiện tại: API `/api/jobs` cũng fail tương tự (xem server log line 26–43). |
| `AC-02` (RQ-03) | `npm run build` | exit 0 — `Compiled successfully in 8.7s` (sau sửa lần 2), `/bod` route included | Build output: `/bod ƒ 270 B 103 kB` | None |
| Lint | `ReadLints` cho 2 file changed | No linter errors found | — | None |

## 4. Changed Deliverables

- **Source/artifact changed:**
  - `src/lib/services/bod.service.ts` — wrap try/catch + refactor `getPriorityProjects` + xóa unused helpers.
  - `app/bod/page.tsx` — sửa empty-state text (1 dòng, line 296).
- **Schema/migration:** None.
- **Environment/config:** None.
- **Git diff/commit:** Not created.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-02` | Infra (out of M12.1 scope) | Server log: 6 queries trong `bod.service` đều fail với `42501 permission denied for schema public`. DB sau M11.1 reset grant privileges. M12.1 task không có scope để grant. | UI render OK (nhờ fallback) nhưng **không có data thật** cho đến khi grant lại. Tier 3 verify sẽ chỉ thấy "empty state" thay vì số liệu. | Mở task M12.1.1 (infra) để grant privileges lại cho `app_user_writer` trên schema `public`. |
| `DEV-03` | Code (unrelated to M12.1) | Server log line 26–43: `/api/jobs` cũng fail `42501` — không nằm trong scope M12.1 nhưng liên quan cùng root cause. | API `/api/jobs` không hoạt động. | Track trong M12.1.1 hoặc tách task `hrp-m12.1.1-db-grants`. |

## 6. Evidence Index

| Evidence | Path / cmd | Proves |
|---|---|---|
| `E-01` | `npm run build` exit 0 | AC-02: build pass |
| `E-02` | HTTP 200 + body 69 KB + không có "Application error" | AC-01: không crash 500 |
| `E-03` | Server log: 6 queries `[bod] getX failed, fallback 0/[]` | Try/catch hoạt động, không propagate error ra client |
| `E-04` | Server log: 6 queries `permission denied for schema public` | DEV-02 infra issue, không phải bug code |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | READY_FOR_AUDIT | Null-safety + Priority Projects từ `Project` đã ship; build pass; runtime trả HTTP 200 fallback. |

> Handoff status: **READY_FOR_AUDIT**. Cần Tier 3 verify AC-01 (UI render) + AC-02 (build pass). Lưu ý DEV-02/03 nếu Tier 3 test thấy "empty state" — đó là permission issue, không phải bug code M12.1.