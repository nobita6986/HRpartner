# HANDOFF — T1B-OPS Worker Operations Hotfix (PRE-P2)

## Decisions (T0, locked)

- **Q1 (audit scope)**: `admin-only-all-entities` — `/api/admin/audit-logs`
  chỉ cho ADMIN, tra cứu mọi entity (Worker / LaborProfile / User / …).
- **Q2 (first workday)**: `episode-startedat` — `MIN(EmploymentEpisode.startedAt)`.
  KHÔNG dùng `Worker.createdAt`.
- **Q3 (worker table cols)**: thêm `currentProject, firstWorkDate,
  currentProjectManager, handler, referrer, commissionBeneficiary`. Phân biệt
  rõ 4 người: `handler=Worker.assignedToId`, `referrer=ProjectAssignment.referrerId`,
  `pm=Project.pmUserId`, `beneficiary=SourceClaim.ctvId WHERE claimType='CTV_REFERRAL' AND accepted=true`.
- **Q4 (LaborProfile cols)**: **5 cột tổng** (giữ invariant DEC-P2-10:
  `<th>=5` + `colSpan=5`). Thay SĐT (PII) + Ngày tạo bằng 3 cột vận hành
  ghép: Job gần nhất (kèm `applicationCount` badge) | Người phụ trách |
  Trạng thái (Xác minh + Hoàn thiện + caption Nguồn) | Ngày tiếp nhận.

## Scope implemented

1. **Worker delete confirmation** — `worker-delete-button.tsx` đã có
   modal 4-layer defense (Xem `f4a45565`/`3d33315a`); T1B-OPS chỉ đổi
   prop `workerName: string | null` (khớp `Worker.fullName`).
2. **Audit log viewer** — `GET /api/admin/audit-logs` (Zod query) +
   `app/admin/audit-logs/audit-logs-client.tsx` với filter
   (entityType/entityId/action/actorId/fromDate/toDate) + pagination 50/trang.
   `redactAuditDiff` mask PII qua `AUDIT_DIFF_PII_KEYS`. ADMIN-only fail-closed.
3. **Worker table 6 cột vận hành** — service `listWorkersForAdmin` (Episode /
   ProjectAssignment / SourceClaim). Worker detail PII (`cccdNumber` /
   `bankAccount` / `bankName`) re-added vào select + masked ở route
   theo `CAN_VIEW_WORKER_SENSITIVE` (regression: pre-existing
   `workers-projection.contract.test.ts`).
4. **Copy cleanup** — `app/admin/workers/page.tsx` description =
   "Quản lý thông tin và trạng thái người lao động." (bỏ "Phân hệ M5").
5. **LaborProfile 5 cột (stacked layout)** — `getLaborProfilesList`
   `latestJob, applicationCount, handler, intakeSource, intakeDate, …`;
   render gộp ở `app/admin/labor-profiles/page.tsx`. Bỏ SĐT (PII); không thêm CCCD.

## Tests

- **NEW**: `src/domains/audit/audit-logs.read-service.test.ts` (17), `api-admin-audit-logs.test.ts` (6).
- **UPDATED**: `workers-list-cta.test.tsx` (9) — 6 op cols + copy sạch;
  merged-layout/delete-confirmation static tests pin #118 history link + #120 banner/audit link;
  `required-relation-sweep.static.test.ts` (11) — exact 53 hits (50 `src/` + 3 `app/api/`).
- **PASS before merge**: full unit 316 files / 5,047 passed / 9 skipped; typecheck, lint (0 errors), build.

## Files

- `app/admin/audit-logs/{page.tsx,audit-logs-client.tsx}`,
  `app/api/admin/audit-logs/route.ts`, `src/domains/audit/audit-logs.read-service.ts`
- `app/admin/workers/page.tsx` (6 cols, copy mới, bỏ Xem)
- `app/admin/workers/[id]/worker-delete-button.tsx` (null-safe `workerName`)
- `app/admin/labor-profiles/page.tsx` (5 cols stacked, bỏ SĐT)
- `app/api/workers/route.ts` (PII mask `cccdNumber/bankAccount/bankName/phone`)
- `src/domains/workforce/{worker.service.ts,worker.types.ts}` (PII fields re-exposed)
- `src/domains/security/workers-projection.contract.test.ts` (mock `listWorkersForAdmin`)
- `src/shared/security/required-relation-sweep.static.test.ts` (line shift 793→796)
- `app/globals.css` (unchanged — dùng `var(--on-error-container)` có sẵn)

## Out of scope

- Không đổi `Worker.createdAt` semantics; không đổi `Worker.assignedToId`.
- Không build full worker detail/edit (đã có ở `f4a45565`).
- Không export CSV/Excel cho audit log.
- Không sửa auth/RLS/prod DB.

## PR

- Branch: `codex/t1b-pre-p2-worker-operations`
- Title: `T1B-OPS: worker delete confirm + audit viewer + 6 op cols each list`
- Forward-merge: `0f08ad2b` merges `origin/main @ 101b0ac8` (which includes PR #118); resolved
  overlap keeps #120's six worker fields, five-column LaborProfile layout and query-based success
  banner, while retaining #118's `/admin/workers/delete-history` entry point.
- Status: final CI pending; no production deploy or migration applied.

## Evidence

- typecheck: PASS
- unit tests: 316 test files / 5,047 passed / 9 skipped (full suite after forward-merge)
- lint: PASS (0 errors; existing warnings)
- build: PASS (optional homepage-settings reads logged missing local `DATABASE_URL`; build completed)
- UTF-8 no-BOM gate: PASS
