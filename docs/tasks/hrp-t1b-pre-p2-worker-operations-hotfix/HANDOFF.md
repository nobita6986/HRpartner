# HANDOFF — T1B-OPS Worker Operations Hotfix (PRE-P2)

## Decisions (T0, locked)

- **Q1 (audit scope)**: `admin-only-all-entities` — `/api/admin/audit-logs`
  chỉ cho ADMIN, tra cứu mọi entity (Worker / LaborProfile / User / ProjectAssignment / …).
- **Q2 (first workday)**: `episode-startedat` — Ngày làm đầu tiên =
  `MIN(EmploymentEpisode.startedAt)`. KHÔNG dùng `Worker.createdAt`.
- **Q3 (worker table cols)**: thêm `currentProject, projectManager, handler, referrer,
  commissionBeneficiary`. Phân biệt rõ 4 thực thể người: `handler=Worker.assignedToId`,
  `referrer=ProjectAssignment.referrerId`, `pm=Project.pmUserId`,
  `beneficiary=SourceClaim.ctvId WHERE claimType='CTV_REFERRAL' AND accepted=true`.
- **Q4 (LaborProfile cols)**: 6 cột vận hành (`latestJob, applicationCount, handler,
  intakeSource, identityVerification, completeness, intakeDate`). Bỏ CCCD
  khỏi bảng (PII); giữ nguyên permission/che dữ liệu.

## Scope implemented

1. **Worker delete confirmation banner** — T1B Modal xóa Worker
   (`app/admin/workers/[id]/worker-delete-button.tsx`) đã có sẵn từ
   `f4a45565`/`3d33315a`; T1B-OPS chỉ sửa prop `workerName: string | null`
   để khớp `Worker.fullName: string | null`. Sau khi xóa thành công → redirect
   về `/admin/workers` (đã có sẵn — DEC-T1B-OPS-01 mở rộng banner inline).
2. **Audit log viewer** — `GET /api/admin/audit-logs` + `app/admin/audit-logs/`
   với filter (entityType/entityId/action/actorId/fromDate/toDate) + pagination
   50/trang. Diff redact PII ở `redactAuditDiff` với `AUDIT_DIFF_PII_KEYS`.
   ADMIN-only (server-side redirect non-ADMIN).
3. **Worker table 6 cột vận hành** — service `listWorkersForAdmin` đã có
   canonical relational data (Episode / ProjectAssignment / SourceClaim);
   T1B-OPS chỉ re-export type `WorkerListEnrichedRow` + import ở route.
4. **Copy cleanup** — `app/admin/workers/page.tsx` description đổi từ
   `Phân hệ M5 — Quản lý hồ sơ người lao động` → `Quản lý thông tin và
   trạng thái người lao động.` (DEC-T1B-OPS-04). Bỏ cột "Xem"/"Mã"/"Điện thoại"/
   "Ngày tạo"/"Thao tác"; row click vẫn mở detail.
5. **LaborProfile 6 cột vận hành** — service `getLaborProfilesList` đã có
   `latestJob, applicationCount, handler, intakeSource, intakeDate`
   (DEC-T1B-OPS-09/10). Render 8 cột ở `app/admin/labor-profiles/page.tsx`
   (Job gần nhất, Số đơn, Người phụ trách, Nguồn tiếp nhận, Xác minh,
   Hoàn thiện, Ngày tiếp nhận). Bỏ cột "Số điện thoại" (PII) khỏi list.

## Tests

- **NEW**: `src/domains/audit/audit-logs.read-service.test.ts` (17): PII redact
  (deep walk, case-insensitive, no-mutate, arrays), admin guard, filter shape,
  ISO createdAt, clamping.
- **NEW**: `src/domains/audit/api-admin-audit-logs.test.ts` (6): 401/403/400/200.
- **UPDATED**: `app/admin/workers/__tests__/workers-list-cta.test.tsx` (9): 6
  cột vận hành thay cho 6 cột cũ; bỏ 'Thao tác'/'Mã'/'Ngày tạo'/'Xem'; thêm
  "bỏ mã phân hệ nội bộ" assertion.
- **UPDATED**: `app/admin/workers/__tests__/workers-terminology.static.test.ts`
  (10): copy mới "Quản lý thông tin và trạng thái người lao động." (bỏ
  "Phân hệ M5"); bỏ column legacy.
- **PASS**: workers-route.test.ts (4), worker-delete-button.static.test.ts (17),
  worker-detail-sections.static.test.ts (17), labor-profile.read-service.test.ts (11).

## Files

- `app/admin/audit-logs/page.tsx` (server wrapper, ADMIN redirect)
- `app/admin/audit-logs/audit-logs-client.tsx` (client UI, filter+table+paginate)
- `app/api/admin/audit-logs/route.ts` (GET, ADMIN-only, Zod query)
- `src/domains/audit/audit-logs.read-service.ts` (listAuditLogs + redactAuditDiff)
- `app/admin/workers/page.tsx` (6 cols, copy mới, bỏ Xem)
- `app/admin/workers/[id]/worker-delete-button.tsx` (workerName null-safe)
- `app/admin/labor-profiles/page.tsx` (8 cols vận hành, bỏ SĐT/CCCD)

## Out of scope (deferred)

- Không đổi `Worker.createdAt` semantics (chỉ dùng cho sort `orderBy`).
- Không đổi `Worker.assignedToId` semantics (handler).
- Không đổi `linkLaborProfileWorker` / conversion flow.
- Không build full worker detail page (đã có từ `f4a45565`).
- Không build full worker edit form (đã có từ `f4a45565`).
- Không export Excel/CSV cho audit log (out of scope).
- Không sửa auth/RLS/prod DB.

## PR

- Branch: `codex/t1b-pre-p2-worker-operations`
- Title: `T1B-OPS: worker delete confirm + audit viewer + 6 op cols each list`
- Status: ready, chờ CI xanh.

## Evidence

- typecheck: PASS
- unit tests: 9 test files / 91 tests pass (audit + workers + labor-profile)
- UTF-8 no-BOM gate: PASS (17 changed text files)
