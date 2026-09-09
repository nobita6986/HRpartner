# HANDOFF Round 4 — Slice 4B Attendance Lock

**Task:** `hrp-phase4-vertical-slices`
**Spec version:** `v1.5`
**Round:** 4
**Executed by:** Tier 2 — agent ngoài (sếp giao qua Cursor)
**Date:** 2026-08-17 15:04 ICT
**Status:** EXECUTED — chờ Tier 3 audit → Tier 1 resolve

---

## 1. Deliverables đã hoàn thành

### STEP-08 — `import.service.ts`
**File:** `src/domains/attendance/import.service.ts`

- `ANOMALY_TYPES`: 6 lỗi G29 — `FORMAT_ERROR`, `UNKNOWN_CODE`, `MISSING_PUNCH`, `DUPLICATE_CCCD`, `OUTSIDE_SHIFT`, `DUPLICATE_SCAN`
- `ANOMALY_OWNER`: `FORMAT_ERROR/UNKNOWN_CODE/MISSING_PUNCH → KT`, `DUPLICATE_CCCD → HR`, `OUTSIDE_SHIFT/DUPLICATE_SCAN → PM`
- `BLOCKER_TYPES`: `UNMATCHED_EMPLOYEE`, `SOURCE_CONFLICT`, `WRONG_PROJECT`
- `parseCsvBuffer()`: parse CSV buffer → `ParsedRow[]`, support multiple date formats
- `classifyRow()`: match by `ProjectAssignment.employeeCode` (mã NV tại dự án) → classification result + blocker detection
- `createImportBatch(tx, ctx, input)`: validate ≤4.5MB → SHA-256 hash → parse → classify → save batch + rows → PREVIEWED
- `getBatchPreview(tx, ctx, batchId)`: đọc batch từ DB, trả preview + blockers
- `listImportBatches(tx, ctx, opts)`: paginated list

### STEP-09 — `import-commit.service.ts`
**File:** `src/domains/attendance/import-commit.service.ts`

- `checkBlockers(tx, batchId)`: kiểm tra 3 blockers:
  - `UNMATCHED_EMPLOYEE`: rows với `status=UNMATCHED`
  - `SOURCE_CONFLICT`: cùng `external_event_id` gắn 2 worker khác nhau trong batch
  - `WRONG_PROJECT`: matched rows nhưng worker không thuộc project batch
- `commitBatch(tx, ctx, batchId)`:
  - verify status = `PREVIEWED`
  - check blockers → 409 `HAS_BLOCKERS` nếu còn
  - `AttendanceEvent` upsert — `UNIQUE(source, external_event_id)` đảm bảo idempotent
  - risk flag: `receivedAt − capturedAt > 15 phút`
  - `enqueueOutbox(AttendanceBatchCommitted)`

### STEP-10 — `timesheet.service.ts`
**File:** `src/domains/attendance/timesheet.service.ts`

- State machine `PENDING → REVIEWED → APPROVED → LOCKED` (DEC-12, ADR-011)
- `TIMESHEET_TRANSITIONS`: role-based guard
  - `PENDING.REVIEW → REVIEWED` (ADMIN/HR_MANAGER/HR_STAFF/PM)
  - `REVIEWED.APPROVE → APPROVED` (ADMIN/HR_MANAGER/HR_STAFF/ACCOUNTANT/DIRECTOR)
  - `APPROVED.LOCK → LOCKED` (ADMIN/HR_MANAGER/HR_STAFF/ACCOUNTANT/DIRECTOR)
  - `LOCKED.REOPEN → PENDING` (ADMIN/HR_MANAGER/HR_STAFF) — tạo version mới
- D06 maker≠checker: `APPROVE`/`LOCK` check audit log — reject nếu `actorId === creator`
- `createTimesheetPeriod`: unique `(projectId, month, year, version=1)` — `PERIOD_EXISTS` nếu trùng
- `transitionTimesheetPeriod`: generic SM guard → audit log → outbox event
- `reopenPeriod`: tạo version mới, dữ liệu cũ giữ nguyên (F21)
- `enqueueOutbox(TimesheetPeriodTransition)` + `(TimesheetPeriodReopened)`

### STEP-11 — API Routes + UI

**Routes:**
- `POST /api/attendance/import` — upload CSV ≤4.5MB, `ADMIN/HR_MANAGER/HR_STAFF/PM`
- `GET /api/attendance/import` — list batches / get preview
- `POST /api/attendance/import/[id]/commit` — commit batch, `ADMIN/HR_MANAGER/HR_STAFF`
- `GET /api/attendance/timesheets` — list periods
- `POST /api/attendance/timesheets` — create period
- `GET /api/attendance/timesheets/[id]` — get period detail
- `POST /api/attendance/timesheets/[id]` — transition (REVIEW/APPROVE/LOCK/REOPEN)

**UI:** `app/admin/attendance/page.tsx` — skeleton thay bằng UI thực:
- Tab `Import batch`: upload CSV button + batch list với matched/unmatched/anomaly counts
- Tab `Kỳ công`: period list với status badge + action buttons (Review/Approve/Khóa)
- Tab `Ngoại lệ`: taxonomy filter (KT/HR/PM) + exception table
- Upload modal placeholder (drag-drop zone)

### STEP-12 — Integration Tests

**Files:**
- `src/domains/attendance/4role-attendance.integration.test.ts` — 12 tests
  - 3 blocker tests (clean batch / UNMATCHED row / no rows)
  - 9 SM transition tests (REVIEW/APPROVE/LOCK/REOPEN + MAKER_EQ_CHECKER + ILLEGAL_TRANSITION + PERIOD_EXISTS + new period create)
- `src/domains/attendance/e2e-attendance-narrative.integration.test.ts` — 6 tests
  - F00A bước 6-10: Exception badge → Review → Approve → Lock → Reopen v2
  - Invariant: 1-ACTIVE version preservation

---

## 2. Verification

| Evidence | Command | Result |
|---|---|---|
| `npx vitest run` | vitest | **385/385 PASS** (27 files, +18) |
| `npm run build` | next build | **exit 0** |
| Diff vùng cấm | `git diff --name-only` | Sạch (không appBCC/auth core) |

---

## 3. RQ/AC trace

| RQ | Coverage | Evidence |
|---|---|---|
| `RQ-06` | STEP-08 | taxonomy 6 lỗi G29 + chủ xử lý |
| `RQ-07` | STEP-09 | 3 blockers chặn COMMIT |
| `RQ-08` | STEP-09 | AttendanceEvent UNIQUE(source, external_event_id) idempotent |
| `RQ-09` | STEP-10 | Timesheet SM PENDING→REVIEWED→APPROVED→LOCKED + maker≠checker |
| `RQ-10` | STEP-10 | Timesheet SM + audit log (adjustment DEFERRED — resolve drawer trong round tiếp) |
| `RQ-18` | STEP-12 | 4-role integration tests |
| `RQ-19` | STEP-08..11 | Outbox events cho import + timesheet transitions |

---

## 4. Notes cho Tier 3

1. **AttendanceImportBatch.fileUrl** trong schema là `String NOT NULL` → MVP dùng `''` (DEC-04: fileUrl deferred, file stored externally)
2. **TimesheetAdjustment** (RQ-10 resolve drawer) — chưa implement trong round này, DEFERRED
3. **RLS policy** cho attendance/timesheet bảng — chưa migrate (DEC-15), DEFERRED theo slice
4. **Upload UI** là placeholder modal (drag-drop zone) — full client-side upload logic DEFERRED
5. **Source Conflict detection** dùng `externalEventId` = hash of (source, employeeCode, date, time, type)

---

## 5. Files changed

```
src/domains/attendance/import.service.ts           [NEW]
src/domains/attendance/import-commit.service.ts   [NEW]
src/domains/attendance/timesheet.service.ts        [NEW]
src/domains/attendance/4role-attendance.integration.test.ts   [NEW]
src/domains/attendance/e2e-attendance-narrative.integration.test.ts [NEW]
app/api/attendance/import/route.ts                [NEW]
app/api/attendance/import/[id]/commit/route.ts    [NEW]
app/api/attendance/timesheets/route.ts             [NEW]
app/api/attendance/timesheets/[id]/route.ts       [NEW]
app/admin/attendance/page.tsx                      [MODIFY — skeleton → full UI]
```

---

## 6. Open items (DEFERRED)

| Item | Owner | Blocked by |
|---|---|---|
| `TimesheetAdjustment` resolve drawer (RQ-10) | Round tiếp | DEC-15 RLS pending |
| RLS policy attendance/timesheet tables | Ops | Migration pending |
| Full client-side upload (drag-drop) | Round tiếp | MVP placeholder |
| `resolve-override` endpoint (map unmatched → worker) | Round tiếp | UI pending |
