# T1B — PRE-P2 HOTFIX: HOÀN THIỆN QUẢN TRỊ NGƯỜI LAO ĐỘNG — HANDOFF

## Outcome

`/admin/workers` trở thành bề mặt quản trị Người lao động hữu dụng với detail tại `/admin/workers/[id]`, edit, status update, safe delete; ranh giới Hồ sơ tiếp nhận → Người lao động được giữ vững.

## File Ownership (theo TASK.md)

- `app/admin/workers/page.tsx` (CTA → /admin/labor-profiles/new, row click mở detail, 6 cột gọn)
- `app/admin/workers/[id]/page.tsx` (7 sections server component)
- `app/admin/workers/[id]/worker-edit-form.tsx` (dirty tracking + sensitive gate + `*` reject)
- `app/admin/workers/[id]/worker-status-form.tsx` (3 state machine enums)
- `app/admin/workers/[id]/worker-delete-button.tsx` (ADMIN-only + idempotent + 409 facts)
- `app/api/workers/[id]/route.ts` (GET / PATCH / PUT / DELETE qua service layer)
- `app/api/workers/route.ts` (POST → 410 GONE hướng sang /admin/labor-profiles/new)
- `src/domains/workforce/worker.service.ts` (getWorkerDetail, updateWorkerProfile, deleteWorker, sweep, advisory lock)
- `src/domains/workforce/worker.types.ts` (WorkerEditableFields, WorkerServiceError, WorkerDependencyKind, DeleteWorkerInput, WorkerDetailRow)
- `src/domains/workforce/__tests__/worker.service.test.ts` (41 tests: role guards, mask reject, 14 dep sweep, race, orphan delete)
- `app/api/workers/__tests__/route-get-patch-delete.test.ts` (16 tests: GET/PATCH/PUT/DELETE)
- `app/admin/workers/__tests__/workers-list-cta.test.tsx` (8 tests: CTA wording, link, no POST)
- `app/admin/workers/__tests__/worker-detail-sections.static.test.ts` (17 tests: 7 sections, masks, no PII leak)
- `src/domains/admin/workers-route.test.ts` (POST 410 + GET params)
- `src/domains/security/workers-projection.contract.test.ts` (mock service layer)
- `src/shared/security/required-relation-sweep.static.test.ts` (+3 hits, forward-merged: 41 → 44 src hits)

## Business Invariants Khóa

1. **Worker chỉ qua conversion flow** — `linkLaborProfileWorker` (PR #107) là authority duy nhất của `LaborProfile.workerId`. UI list CTA → `/admin/labor-profiles/new`, không POST Worker rời rạc. POST `/api/workers` → 410 GONE với `redirectTo: /admin/labor-profiles/new`.
2. **4-layer masked data defense** — (a) form dirty tracking chỉ gửi field thay đổi; (b) UI sensitive gate (`canSeeSensitive`); (c) API gate `CAN_VIEW_WORKER_SENSITIVE`; (d) service guard reject `*` mask.
3. **Safe delete protocol** — atomic transaction + `pg_advisory_xact_lock('hrp:worker:<id>')`; sweep 15 dependency bảng (LaborProfile, EmploymentEpisode, ProjectAssignment, Ticket, Dependent, AttendanceEvent, TimesheetLine, TimesheetAdjustment, WorkerDeduction, VendorStatementLine, ClientStatementLine, CommissionLedger, SourceClaim, CandidateSubmission.workerId/mergedWorkerId) → 409 `WORKER_NOT_DELETABLE` nếu còn. Idempotent qua `withIdempotency`.
4. **TERMINATED giữ lịch sử** — không cascade, không set-null. Service chỉ `worker.delete` khi sweep trả rỗng (orphan/garbage).
5. **Strict allowlist** — Zod-style: 26 field T1B PATCH + 5 field legacy PUT. `userId`/`accountUserId`/`workerId`/`id`/`actorId` không thể sửa qua API.

## Gates (PASS)

- Targeted T1B tests: 69/69 PASS (worker.service 41 + route-get-patch-delete 16 + workers-list-cta 8 + workers-route 4) + sweep 11/11
- Full unit: 4885 PASS, 9 skipped (301 files; T1A project-management test files now also included after forward-merge)
- typecheck: 0 errors
- lint: 0 errors (983 warnings pre-existing)
- prisma validate: DATABASE_URL_ADMIN env not set in shell (pre-existing, identical on origin/main)
- next build: PASS
- verify-encoding: PASS (UTF-8 no-BOM, 13 changed files all OK)
- git diff --check: PASS

## Forward-Merge (this revision)

`origin/main` đã tiến `d6f11973 → bc95320d` sau khi T0 merge PR #114 (T1A pre-P2 project management hotfix, `7f30e6eb` + `9ae00ee5` + `6d6e427a`). Conflict duy nhất ở `src/shared/security/required-relation-sweep.static.test.ts`: cả T1A lẫn T1B đều cập nhật comment + `toHaveLength`. T1A ghi `41` (thêm `project-read.service.ts:152 clientCompany`); T1B ghi `43` (thêm 3 entry `worker.service.ts:266/275/283`). Combined count = `44` src hits; `app/api` giữ nguyên `3` (T1A không thêm `app/api` hit). Đã giữ nguyên 3 entry T1B; thêm 1 entry T1A đã có sẵn trên main; cập nhật `toHaveLength(44)` kèm comment kết hợp. Không sửa schema, auth/RLS, conversion flow, hay `projectWorker` allowlist.

## DỪNG TRƯỚC MERGE

Branch: `codex/t1b-pre-p2-worker-management-hotfix` đẩy tới remote; chờ CI 4/4 GREEN; không merge, không deploy.
