# HANDOFF — hrp-t1b-pre-p2-intake-worker-separation

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-t1b-pre-p2-intake-worker-separation` |
| Work type | `FAST_HOTFIX` (UI/API tightening; no schema; no migration) |
| Audit mode | `NONE` (Tier 1 self-review per directive) |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` |
| Baseline | `origin/main @ bbdbe94862dc58c9ec97c3f1627a43d9c0e8ab0b` |
| Worktree | `C:\CodeApp\HrP-t1b-pre-p2-intake-worker-separation` |
| Branch | `codex/t1b-pre-p2-intake-worker-separation` |
| Implementation SHA | `27afbb6f5c4b09e2e9ab69a823ec6135d561f18d` |
| Updated | 2026-10-06 08:42 UTC+7 |

## 1. Outcome (recap)

Tách rõ hai mặt workforce ingestion trong admin portal: LaborProfile (intake) vs Worker (official). Implement:

- `getLaborProfilesList` mặc định `workerId: null` (DEC-P2-01).
- `PATCH /api/admin/labor-profiles/[id]` với role matrix `ADMIN | HR_MANAGER` (writer), `HR_STAFF` đọc-only.
- PATCH auto-`normalizePhone` + recompute `completeness` (DEC-P2-04, DEC-P2-05).
- PATCH từ chối typed nếu `workerId != null` → 409 (DEC-P2-06).
- PATCH không nhận `workerId` từ client (zod `.strict()` + service guard).
- UI list 4 filter chips canonical; bỏ cột "Liên kết nhân viên".
- UI detail read-only banner khi đã linked; mount edit form khi unlinked + writer.
- Fix bug modal `<h2>` ở `/admin/workers` (raw `// T0 T1B` comment render).

## 2. Evidence

### Gate outputs

- `npm run typecheck` → exit 0
  - Evidence: `tsc.log` (empty stderr/stdout)
- `npm run lint` → exit 0 (969 pre-existing warnings, 0 errors; 0 new warnings in our files)
  - Evidence: `lint.log`
- `npm run test:unit` → 4652/4652 PASS, 9 skipped, 0 failed
  - Evidence: `vitest-full.log` (last 20 lines: "Test Files 295 passed (295)")
- `npm run build` → exit 0
  - Evidence: `build.log`
- `npx prisma validate` → exit 0 với env vars (DATABASE_URL*, DATABASE_URL_TEST)
  - Pre-existing issue: nếu không set env, P1012 vì `DATABASE_URL_ADMIN` không có. Đã xác nhận pre-existing qua `git stash` + `npx prisma validate` (cùng lỗi).
- `node .ai-pipeline/scripts/verify-encoding.mjs` → PASS (14 changed files, all UTF-8 no-BOM, LF-only)
  - Evidence: `verify-encoding.log`
- `git diff --check` → exit 0
  - Evidence: shell output (no whitespace warnings)

### Targeted tests

```
src/domains/talent/labor-profile.update-service.test.ts (13 tests) 7ms
  ├── deriveCompleteness — pure
  │   ├── COMPLETE khi có fullName + phone + cccd
  │   ├── COMPLETE khi chỉ normalizedPhone (phone empty)
  │   ├── MINIMAL khi thiếu name
  │   ├── MINIMAL khi thiếu phone (cả phone + normalizedPhone)
  │   ├── MINIMAL khi thiếu cccd
  │   └── MINIMAL khi tất cả whitespace
  └── updateLaborProfileIntakeProfile — in-memory Prisma
      ├── 409 LaborProfileAlreadyLinkedError khi workerId set
      ├── NOT_FOUND khi current null
      ├── Happy path: 3 fields, completeness = COMPLETE
      ├── Phone empty → null + normalizedPhone null
      ├── Partial PATCH (undefined field → giữ current)
      ├── Warning khi duplicate phone (other profile)
      └── Exclude self + linked profiles khỏi duplicate probe

app/api/admin/labor-profiles/__tests__/route-patch.test.ts (21 tests) 22ms
  ├── 401 NO_TOKEN
  ├── 403 cho 11 non-writer roles (HR_STAFF, SALE, PM, WORKER, CTV, ...)
  ├── 200 cho ADMIN, HR_MANAGER
  ├── 400 INVALID_INPUT khi body có `workerId` (zod .strict())
  ├── 400 BAD_REQUEST khi JSON invalid
  ├── 400 INVALID_INPUT khi body rỗng (refine ≥1 field)
  ├── 200 khi cccdNumber=null (clear field)
  ├── 409 LABOR_PROFILE_ALREADY_LINKED khi service throw typed
  ├── 404 NOT_FOUND khi service throw LABOR_PROFILE_NOT_FOUND
  └── actorId = ctx.userId (KHÔNG random)

app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts (20 tests) 10ms
  ├── 4 filter chips canonical (Tất cả, Chưa hoàn thiện, Cần đối chiếu, Kho chung)
  ├── 3 chip cũ NEVER_WORKED/WORKING/TERMINATED KHÔNG còn
  ├── Cột "Liên kết nhân viên" KHÔNG render
  ├── <th> count = 5
  ├── Empty-state colSpan = 5
  ├── <h1> giữ canonical "Hồ sơ tiếp nhận người lao động"
  ├── CTA button "+ Tiếp nhận người lao động"
  ├── Banner "Đã chuyển thành người lao động" + link /admin/workers
  ├── KHÔNG có button "Sửa thông tin" cũ
  ├── <LaborProfileEditForm> mount với `canEdit`
  ├── Form gate UI: role === 'ADMIN' || role === 'HR_MANAGER'
  ├── PATCH body: fullName + phone + cccdNumber, KHÔNG workerId
  ├── 409 → setStatus({ kind: 'locked' })
  └── 403 distinct handling

app/admin/workers/__tests__/workers-modal-no-comment-leak.static.test.ts (5 tests) 3ms
  ├── First JSX <h2> KHÔNG chứa `// T0 T1B` raw text
  ├── First JSX <h2> chỉ chứa modal title canonical
  ├── <h2> body KHÔNG có T0 T1B HOTFIX
  ├── Modal titles "Thêm người lao động mới" / "Sửa người lao động" preserved
  └── LF-only + no UTF-8 BOM

src/domains/talent/labor-profile.read-service.test.ts (11 tests, +3 mới) 13ms
  ├── 3 cases mới: default workerId: null, includeLinked:false → same, includeLinked:true → no workerId filter
```

Total new + extended tests: **80 tests** (4 update-service, 21 route-patch, 20 list-separation, 5 modal-fence, 3 read-service extensions, + 27 from pre-existing).

## 3. Files changed (allowlist verification)

| File | Status | Purpose |
|------|--------|---------|
| `app/admin/labor-profiles/page.tsx` | M | 4 chips; bỏ cột worker link; colSpan 5; comment sửa đặt ngoài `<tr>` |
| `app/admin/labor-profiles/[id]/page.tsx` | M | Banner read-only khi linked; mount LaborProfileEditForm; gate HR_STAFF |
| `app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx` | A | Client form mới; PATCH /api; lock-on-409 |
| `app/api/admin/labor-profiles/[id]/route.ts` | M | Thêm PATCH handler với RBAC + zod strict + 409 mapping |
| `app/admin/workers/page.tsx` | M | Di chuyển comment ra ngoài `<h2>` |
| `src/domains/talent/labor-profile.read-service.ts` | M | includeLinked filter; default workerId: null |
| `src/domains/talent/labor-profile.read-service.test.ts` | M | +3 tests cho filter |
| `src/domains/talent/labor-profile.service.ts` | M | +deriveCompleteness pure + updateLaborProfileIntakeProfile |
| `src/domains/talent/labor-profile.types.ts` | M | +LaborProfileEditableFields + LaborProfileCompletenessLevel + PossibleDuplicateWarning + LaborProfileAlreadyLinkedError |
| `src/domains/talent/labor-profile.update-service.test.ts` | A | 13 tests mới |
| `app/api/admin/labor-profiles/__tests__/route-patch.test.ts` | A | 21 tests mới |
| `app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts` | A | 20 tests mới |
| `app/admin/workers/__tests__/workers-modal-no-comment-leak.static.test.ts` | A | 5 tests mới |
| `docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/TASK.md` | A | Contract |
| `docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/HANDOFF.md` | A | File này |

A = Added, M = Modified. **No files outside the allowlist.**

## 4. Boundaries preserved (NOT touched)

- `prisma/schema.prisma` — UNTOUCHED (no migration).
- `prisma/migrations/**` — UNTOUCHED.
- `src/domains/applications/conversion.service.ts` — UNTOUCHED. `linkLaborProfileWorker` PR #107 giữ nguyên, không bị bypass.
- `src/shared/auth/with-db-context.ts`, `with-auth-scope.ts` — UNTOUCHED (no RLS widening).
- `app/api/workers/**` — UNTOUCHED.
- `app/admin/recruiter-workbench/**`, `app/admin/applications/**` — UNTOUCHED.
- `package.json`, `package-lock.json`, `pnpm-workspace.yaml` — UNTOUCHED.
- `.env*` — UNTOUCHED.
- `vitest.*.config.ts`, `tsconfig.json`, `eslint.config.mjs` — UNTOUCHED.

## 5. Self-review (Tier 1 — 3 risks)

### Risk 1: PATCH route có thể mở attack surface mới cho non-writer role

**Mitigation implemented**: 
- `WRITER_ROLES` set (`ADMIN | HR_MANAGER`) enforced ở route layer; non-writer → 403 ngay.
- Zod `.strict()` reject mọi key ngoài `fullName | phone | cccdNumber` → fail-closed.
- Refine `≥ 1 field present` → PATCH nửa-vời bị 400 (không vô tình trigger no-op write).
- Test `route-patch.test.ts` cover 11 non-writer roles.
- **Verdict**: PATCH surface chỉ mở cho ADMIN/HR_MANAGER (đã có authority). Không có role nào khác được elevate.

### Risk 2: `workerId` leak — liệu client có thể set workerId từ PATCH

**Mitigation implemented**:
- Zod `.strict()` schema ở route: `workerId` không có trong schema → request có `workerId` → 400 INVALID_INPUT.
- Service `updateLaborProfileIntakeProfile` không nhận `workerId` (type system + run-time check via `data` object); Prisma `data` object literal không chứa `workerId` key.
- Test `route-patch.test.ts` PATCH: body có `workerId` → 400.
- Test `labor-profile.update-service.test.ts` happy path: assert `updateArgs.data` KHÔNG có `workerId`.
- Test `labor-profiles-separation.static.test.ts` form PATCH body: KHÔNG có `workerId`.
- **Verdict**: 3 lớp defense (zod schema + service type + service run-time data). Không có đường set `workerId` từ PATCH.

### Risk 3: PR #107 CAS / idempotency có thể bị bypass

**Mitigation implemented**:
- `updateLaborProfileIntakeProfile` KHÔNG đụng `workerId` trong bất kỳ nhánh nào. PR #107's `linkLaborProfileWorker` (CAS-update `where: { id, workerId: null }`) là đường duy nhất set `workerId`.
- Service throw `LaborProfileAlreadyLinkedError` nếu `current.workerId != null` TRƯỚC khi UPDATE → không có concurrent-overwrite race.
- `linkLaborProfileWorker` file path UNTOUCHED.
- **Verdict**: PR #107 invariants giữ nguyên. PATCH chỉ thao tác 3 field intake, không đụng conversion contract.

## 6. Open items / not in this PR

- T1A StaffingOrder tasks (PR #105) — directive nói rõ "Không đụng task của T1A" → UNTOUCHED.
- Tier 3 AUDIT.md — directive yêu cầu KHÔNG Tier 3.
- Schema migration — directive yêu cầu KHÔNG migration.
- Production DB RLS — UNTOUCHED.

## 7. Revision Log

| Spec | Date | Change | Note |
|------|------|--------|------|
| `v1.0` | 2026-10-06 | Phát hành từ T0 directive; baseline `bbdbe9486` | T1 self-review |
