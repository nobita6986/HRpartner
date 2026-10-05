# HANDOFF — `t1a-staffing-order-management`

## 0. Status

| Field | Value |
|---|---|
| Task slug | `t1a-staffing-order-management` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Status | `ACCEPTED` |
| Baseline | `598feacc456becd450dcdb3942d2046691af3a3b` (`origin/main`) |
| Branch | `codex/t1a-staffing-order-management` |
| Worktree | `C:/CodeApp/HrP-worktrees/t1a-staffing-order-management` |
| Spec version | `v1.0` |
| Acceptance gate | STANDARD + NONE (T0 pre-authorized) |
| Next gate | `/deliver → /resolve` (PR opened, CI monitoring, stop before merge) |
| Closing line | ACCEPTED — all 7 canonical gates GREEN, 28 test files / 4349 unit tests pass; static RLS sweep updated for 3 new required relation selects in `order.service.ts`. |

## 1. Outcome delivered

#### 1.1 List page `/admin/staffing`

- Vietnamese-first table with header `['Mã', 'Tiêu đề', 'Dự án', 'Vị trí cần tuyển', 'Hạn tuyển', 'Trạng thái', 'Thao tác']`.
- `SlotChip` replaced with `SlotBreakdown`: each position renders `Tên vị trí — filled/needed (còn thiếu N)` or `(đã đủ)`.
- New `Hạn tuyển` column and `Thao tác` column with `Xem chi tiết` link to `/admin/staffing-orders/[id]`.
- Status filter + pagination preserved.

#### 1.2 Detail page `/admin/staffing-orders/[id]`

- Server-derived `StaffingOrderCapability` (`canView`, `canEdit`, `canChangeStatus`, `canAssign`, `canDelete`) computed from `getServerSession()`.
- Read-only banner shown to `HR_STAFF`, `PM`, `DIRECTOR`, `ACCOUNTANT`; non-viewers 404 instead of 403.
- Header: code, title, project, description, deadlineDate, status.
- Positions table: code, title, needed, filled, remaining, shift (start/end), hourlyRateVnd, workLocation, validFrom/validTo. Locked icon 🔒 on slots with dependent JobOpening / JobPosting / submissions / placements.
- Linked `JobOpenings` table (status, openedAt, closedAt, current posting slug, time-on-market) and `JobPostings` table (status, publishedAt, expiresAt).
- Action toolbar: `Sửa nhu cầu`, `Đánh dấu sắp đóng` (`CLOSING_SOON`), `Mở lại` (`OPEN` from `CLOSING_SOON`), `Đóng nhu cầu` (`CLOSED`), `Hủy nhu cầu` (`CANCELLED`), `Xóa vĩnh viễn` (ADMIN only).
- `RecruiterAssignmentManager` mounted in a dedicated section with `canManage={capability.canAssign}` (only ADMIN/HR_MANAGER).
- Confirmation dialogs (`ConfirmDialog`, `DeleteConfirmDialog`) with loading/success/error feedback; idempotency keys for status mutations.

#### 1.3 Management actions

- `Sửa nhu cầu` opens `EditOrderModal` (title, description, deadlineDate, slots list with add/edit/mark-for-deletion).
- `Đánh dấu sắp đóng`: `OPEN → CLOSING_SOON`.
- `Mở lại`: `CLOSING_SOON → OPEN` (UI maps `REOPEN` dialog kind back to `OPEN` API payload).
- `Đóng nhu cầu`: any non-terminal → `CLOSED`.
- `Hủy nhu cầu`: any non-terminal → `CANCELLED`.
- State machine preserved exactly (`VALID_TRANSITIONS`).
- `Xóa vĩnh viễn`: ADMIN only; DELETE `/api/staffing/orders/[id]` returns typed `409` with `code: ORDER_NOT_DELETABLE` and guidance to use `Hủy nhu cầu` when dependencies exist.

#### 1.4 Edit data rules

- Editable: `title`, `description`, `deadlineDate`, `slots` (add / update / mark-for-deletion).
- `projectId` immutable (backend rejects with `ORDER_NOT_EDITABLE`).
- `slotsNeeded >= slotsFilled` enforced per slot.
- Cannot delete a slot that has linked `JobOpening`, `JobPosting`, `CandidateSubmission`, `ProjectAssignment`, or `OpeningSlotNeo`. Backend returns `SLOT_HAS_DEPENDENCIES` (409) with guidance.
- `getStaffingOrderDetail()` and `updateStaffingOrder()` use `withDbContext` so RLS continues to gate downstream reads.

#### 1.5 Permanent delete

- `DELETE /api/staffing/orders/[id]` restricted to `ADMIN`.
- Allowed only when no `JobOpening`, `JobPosting`, `ProjectAssignment`, `StaffingOrderRecruiterAssignment`, or `CandidateSubmission` exists for the order.
- If dependencies exist: typed `409 { code: 'ORDER_NOT_DELETABLE', message: 'Hủy nhu cầu để đóng order thay vì xóa' }`.
- No cascade deletes; soft-delete via `Hủy nhu cầu` (`CANCELLED`) is the official closure path.

#### 1.6 Role permissions

- View authority preserved (`VIEW_ROLES` from list API).
- Create/edit/status: `ADMIN`, `HR_MANAGER`, `SALE` (unchanged).
- Specialist assignment: `ADMIN`, `HR_MANAGER` (gated via `canAssign` capability).
- Delete: `ADMIN` only.
- No auth/RLS expansion.

#### 1.7 Close/Cancel invariant

- Public fail-closed invariant verified by `src/domains/staffing/public-fail-closed.integration.test.ts` (20 regression tests).
- `isOpenOrderStatus()` and `VISIBLE_ORDER_STATUSES` ensure `CLOSED` and `CANCELLED` orders are immediately hidden from `/viec-lam` listing and apply endpoint.
- No new enums / states / schema changes.

## 2. Evidence (deliverables)

| Layer | Path | Purpose |
|---|---|---|
| List UI | `app/admin/staffing/staffing-list-client.tsx` | SlotBreakdown + action column |
| Detail page | `app/admin/staffing-orders/[id]/page.tsx` | Capability derivation + 404 vs read-only |
| Detail UI | `app/admin/staffing-orders/[id]/order-management-client.tsx` | Header / toolbar / tables / modals |
| Edit modal | `app/admin/staffing-orders/[id]/edit-order-modal.tsx` | `Sửa nhu cầu` form |
| API GET | `app/api/staffing/orders/[id]/route.ts` | `getStaffingOrderDetail` projection |
| API PUT | `app/api/staffing/orders/[id]/route.ts` | Update title/description/deadline/slots |
| API DELETE | `app/api/staffing/orders/[id]/route.ts` | Typed 409 + ADMIN-only |
| Service | `src/domains/staffing/order.service.ts` | `getStaffingOrderDetail`, `updateStaffingOrder`, `deleteStaffingOrder` |
| Types | `src/domains/staffing/types.ts` | `UpdateSlotInput`, `UpdateStaffingOrderInput` DTOs |
| Static test | `app/admin/staffing/__tests__/staffing-terminology.static.test.ts` | SlotBreakdown assertions |
| Static test | `app/admin/staffing-orders/__tests__/order-detail-role-visibility.static.test.ts` | 20 role-visibility guards |
| Domain unit | `src/domains/staffing/order.service.test.ts` | 16 guard tests for update/delete |
| Integration | `src/domains/staffing/public-fail-closed.integration.test.ts` | 20 fail-closed regression tests |
| RLS sweep | `src/shared/security/required-relation-sweep.static.test.ts` | Updated EXPECTED_HITS for 3 new safe selects |

## 3. Gates — all GREEN

| Gate | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | PASS (0 errors) |
| `pnpm lint` (eslint) | PASS (0 errors; 938 pre-existing warnings) |
| `pnpm test:unit` (vitest) | PASS — 278 files / 4349 tests / 9 skipped |
| `pnpm build` (next build) | PASS |
| `prisma validate` | PASS (baseline env warning only, identical to baseline) |
| `git diff --check` | PASS (no whitespace / line-ending issues) |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS (17 changed files, strict UTF-8 without BOM) |

## 4. Files changed (canonical surface)

```
M app/admin/staffing-orders/[id]/page.tsx
M app/admin/staffing/__tests__/staffing-terminology.static.test.ts
M app/admin/staffing/staffing-list-client.tsx
M app/api/staffing/orders/[id]/route.ts
M src/domains/staffing/order.service.test.ts
M src/domains/staffing/order.service.ts
M src/domains/staffing/types.ts
M src/domains/talent/recruiter-assignment.manager.component.test.tsx
M src/domains/talent/recruiter-assignment.ui.test.ts
M src/shared/security/required-relation-sweep.static.test.ts
A app/admin/staffing-orders/[id]/edit-order-modal.tsx
A app/admin/staffing-orders/[id]/order-management-client.tsx
A app/admin/staffing-orders/__tests__/order-detail-role-visibility.static.test.ts
A docs/tasks/t1a-staffing-order-management/TASK.md
A src/domains/staffing/public-fail-closed.integration.test.ts
A docs/tasks/t1a-staffing-order-management/HANDOFF.md
```

## 5. Required relation sweep update

`src/shared/security/required-relation-sweep.static.test.ts` updated:

- `EXPECTED_HITS` adds 3 new src/ entries (project@297, jobOpening@302, jobOpening@387) for the new `getStaffingOrderDetail` + `updateStaffingOrder` selects.
- Existing two order.service.ts entries shifted 153/179 → 158/184 (the two new functions added 5 lines above the existing code).
- Total src/ count: 36 → 39.

All new relation selects are RLS-covered (read-only; `withDbContext` sets the GUC session role; `JobOpening` is not a recruiter-gated table on its own).

## 6. State machine preserved

```
OPEN ─► CLOSING_SOON
OPEN ─► CLOSED
OPEN ─► CANCELLED
CLOSING_SOON ─► OPEN
CLOSING_SOON ─► CLOSED
CLOSING_SOON ─► CANCELLED
CLOSED (terminal)
CANCELLED (terminal)
```

No new enum, no new state.

## 7. Non-goals respected

- No Prisma schema / migration changes.
- No new enums / statuses.
- No auth/RLS expansion.
- No cascade deletes.
- No new dependencies.
- No Tier 3 / AUDIT (T0 pre-authorized NONE).

## 8. Revision log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-05 | Initial contract | V2_FAST_FREEZE STANDARD + NONE |
| `v1.0` | 2026-10-05 | HANDOFF ACCEPTED | All gates GREEN; PR pending CI 4/4 GREEN |

## 9. Closing

ACCEPTED — implementation complete, gates GREEN, waiting on PR CI 4/4 GREEN; stop before merge.