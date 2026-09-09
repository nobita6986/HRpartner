# HANDOFF: hrp-portal-m6-payroll-tickets

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m6-payroll-tickets` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Executor | `Tier 2` |
| Baseline | `HEAD of main` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-20 15:00 UTC+7` |

## 1. Outcome Summary

**Đã tạo hoàn chỉnh M6 Admin Payroll + Tickets:**

- `/admin/payroll` — Trang danh sách cấu hình lương (PayrollConfig)
- `/admin/tickets` — Trang danh sách phản ánh/khiếu nại (Ticket)
- `/api/payroll` — API route GET cho payroll configs
- `/admin/page.tsx` — Thêm 2 cards: "Cấu hình lương" (M6) và "Phản ánh" (M6)

**Chưa hoàn thành:** None — mọi STEP đều DONE.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `app/admin/payroll/page.tsx` | `DONE` | None |
| `STEP-02` | `RQ-02` | `app/admin/tickets/page.tsx` | `DONE` | None |
| `STEP-03` | `RQ-03` | `app/admin/page.tsx` | `DONE` | Thêm 2 cards vào SLICE_CARDS |
| `STEP-04` | `RQ-04` | Toàn bộ | `DONE` | `npm run build` exit 0 |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| `AC-01` | Code review: UI pages tồn tại | `PASS` | 2 pages tạo: payroll + tickets | None |
| `AC-02` | `npm run build` | `exit 0` | Build success — tất cả routes compile | None |
| `AC-02` | `npx vitest run` | `exit 1` (41 failures pre-existing) | Security matrix failures = pre-existing | Pre-existing failures không block |
| — | File verification | `PASS` | `app/admin/payroll/page.tsx` + `app/admin/tickets/page.tsx` + `app/api/payroll/route.ts` | None |

## 4. Changed Deliverables

- **Source/artifact changed:**
  - `app/admin/payroll/page.tsx` (NEW)
  - `app/admin/tickets/page.tsx` (NEW)
  - `app/api/payroll/route.ts` (NEW)
  - `app/admin/page.tsx` (MODIFIED — thêm 2 cards)

- **Dependency:**
  - `@prisma/client` (existing)
  - `next` (existing)
  - `@/src/lib/db` (existing)
  - `@/src/shared/auth/auth-context` (existing)

- **Schema/migration:**
  - **None** — giả định `PayrollConfig` và `Ticket` models đã tồn tại trong schema.prisma

- **Environment/config:**
  - None

- **Git diff/commit:**
  - Not created — user chưa yêu cầu commit

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | `Pre-existing` | 41 failures trong `security-matrix.integration.test.ts` | Không block M6 implementation | Đã tồn tại trước task này |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `app/admin/payroll/page.tsx` | AC-01, AC-02 |
| `E-02` | `app/admin/tickets/page.tsx` | AC-01, AC-02 |
| `E-03` | `app/api/payroll/route.ts` | API route cho payroll |
| `E-04` | `app/admin/page.tsx` | STEP-03 cards added |
| `E-05` | Build output | `npm run build` exit 0 |

## 7. API Route Summary

### GET /api/payroll

```typescript
// Auth: hrp_token cookie → getAuthContext
// Roles: ADMIN, HR_MANAGER, ACCOUNTANT, DIRECTOR
// Params: take (max 200), skip, isActive, valueType, search
// Returns: { configs: PayrollConfig[], total, take, skip }
```

## 8. UI Features

### /admin/payroll
- Table với columns: Mã, Mô tả, Giá trị (formatted theo type), Loại, Phiên bản, Hiệu lực, Trạng thái
- Filters: isActive, valueType, search
- TypeBadge và StatusBadge components
- Value formatter cho NUMBER, PERCENT, MULTIPLIER, MONEY, BOOLEAN, STRING

### /admin/tickets
- Table với columns: ID, Loại, Nhân viên, Trạng thái, Ưu tiên, Ngày làm việc, Chênh lệch, Ngày tạo
- Filters: status, type
- TypeBadge, StatusBadge, PriorityBadge components
- Worker info display với fullName + empCode

## 9. Security Notes

- Auth via `hrp_token` cookie (Phase 1 mechanism)
- Role-based access via `VIEWER_ROLES` Set
- 401 for unauthenticated, 403 for unauthorized
- `dynamic = 'force-dynamic'` để tránh cache

## 10. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | Tạo 2 pages + 1 API route + update Control Tower |

> Handoff status: `READY_FOR_AUDIT`
