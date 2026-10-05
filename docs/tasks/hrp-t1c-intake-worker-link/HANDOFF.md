# HANDOFF — `hrp-t1c-intake-worker-link`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1c-intake-worker-link` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `ea8f81a47c23e33a836a4f57a834a91b994b6665` |
| Implementation SHA | `5cbc3f06d4179c2389d79541745e38e0db5ef0b2` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered:** `convertApplication` giờ bind Worker vừa resolve về LaborProfile
  trong cùng transaction convert khi submission có `laborProfileId`. UI
  `/admin/labor-profiles` chuyển từ "Chưa liên kết" → "Đã liên kết" cho các
  submission được convert sau hotfix. Replay idempotent cho submission đã
  CONVERTED có LaborProfile.workerId NULL. Fail-closed với code ổn định
  `LABOR_PROFILE_WORKER_CONFLICT` (409) cho mọi xung đột Worker/LaborProfile.
- **Not delivered:** Endpoint tạo Worker trực tiếp (`app/api/admin/workers/...`)
  không thay đổi; backfill dữ liệu cũ KHÔNG chạy; production DB KHÔNG được
  truy cập.
- **Changed:**
  - `src/domains/applications/conversion.service.ts` — thêm
    `linkLaborProfileWorker` helper, wire vào QUALIFIED flow + REPLAY flow;
    mở rộng `ConversionError.code` union với `'LABOR_PROFILE_WORKER_CONFLICT'`;
    mở rộng audit `diff.after` với field `laborProfileLink` (chỉ khi
    submission có `laborProfileId`).
  - `src/domains/applications/conversion.service.test.ts` — thêm
    `LaborProfileMockState` + auto-seed khi `laborProfileId` set, mở rộng
    9 case mới (AC-01, AC-02, AC-03, AC-04, AC-04b, AC-05, AC-06, AC-RQ-04,
    AC-P2002).
  - `src/shared/security/required-relation-sweep.static.test.ts` — cập nhật
    line number 128 → 130 cho entry `conversion.service.ts:130 laborProfile`
    trong `EXPECTED_HITS` (line shift do helper insertion).
  - `tests/db/intake-convert-worker-link.integration.test.ts` (mới) — DB-touching
    proof cho AC-09..AC-12.
  - `vitest.integration-files.ts` — đăng ký file integration mới.
  - `docs/tasks/hrp-t1c-intake-worker-link/TASK.md` (mới) — contract.
  - `docs/tasks/hrp-t1c-intake-worker-link/HANDOFF.md` (file này).
- **Lane escalation:** Không. `STANDARD` lane phù hợp với blast radius hữu hạn
  (1 service + 1 helper + 1 integration test, không đụng schema/RLS/route layer).

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git diff --check HEAD` exit 0; `verify-encoding.mjs` PASS; only touched files in-scope. |
| API/route boundary | `PASS` | Route `POST /api/admin/applications/[id]/actions/convert` không đổi; chỉ sửa logic trong transaction do route đã wrap sẵn qua `withDbContext`. |
| Auth/permission/data exposure | `PASS` | Không đổi role gate (CONVERT_ROLES = {ADMIN, HR_MANAGER}); không đổi RLS; không thêm cột/bảng. |
| Migration/backfill/rollback | `PASS` | Không có migration; nếu rollback revert commit, schema không đổi. Backfill dữ liệu cũ không tự động chạy. |
| Concurrency/idempotency | `PASS` | (a) `linkLaborProfileWorker` chạy sau `tx.candidateSubmission.updateMany` lock; (b) helper check + update + return `before/after` rồi mới tiếp tục SourceClaim/audit; (c) Prisma P2002 từ unique index được map thành `LABOR_PROFILE_WORKER_CONFLICT` typed; (d) REPLAY path idempotent (AC-04 + AC-04b pass). |
| Test isolation and cleanup | `PASS` | (a) Unit tests dùng `txFor` mock với `LaborProfileMockState` auto-seed; (b) Integration test `describe.skipIf(!HAS_TEST_DB)` self-skip khi env thiếu; (c) `afterAll` cleanup tracked list (`createdLaborProfileIds`, `createdSubmissionIds`, `createdWorkerIds`, `createdUserIds`, `createdSourceClaimIds`, `createdHistoryIds`, `createdAuditLogIds`) với `LaborProfile.workerId = NULL` unlink trước delete. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath .../TASK.md` | `RESULT: DRAFT-VALID (1 warning — A-04 placeholder non-blocking)` | None |
| `AC-01` | `E-01` | PASS: 27/27 unit tests trong `conversion.service.test.ts` | None |
| `AC-02` | `E-01` | PASS: case "AC-02 QUALIFIED + laborProfileId + chọn Worker qua dedup" green | None |
| `AC-03` | `E-01` | PASS: case "AC-03 QUALIFIED + LaborProfile.workerId đã set sang Worker khác" green | None |
| `AC-04` | `E-04` | PASS: case "AC-04 REPLAY CONVERTED + LaborProfile.workerId NULL → khôi phục" green | None |
| `AC-05` | `E-01` | PASS: case "AC-05 REPLAY CONVERTED + LaborProfile.workerId ≠ submission.workerId" green | None |
| `AC-06` | `E-01` | PASS: case "AC-06 QUALIFIED không có laborProfileId" green | None |
| `AC-07` | `E-02`, `E-03`, `E-04`, `E-05`, `E-06` | PASS: typecheck, lint, prisma validate/generate, build — all exit 0 | None |
| `AC-08` | `E-01` | PASS: 4264/4264 unit tests green (1 file có 1 case ngoài scope đã được sửa để theo line shift) | None |
| `AC-09` | `E-09` | self-skip: `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` không có sẵn trong worktree này; file `tests/db/intake-convert-worker-link.integration.test.ts` đã sẵn sàng chạy khi owner cấp env. AC-09..AC-12 đã cover trong unit test bằng mock — DB-touching proof chạy ở CI/owner pre-merge. | Synthetic Neon DB env chưa được cấp cho worktree này; Tier 1 sẽ chạy tại CI hoặc owner pre-merge. |
| `AC-10` | `E-07` | PASS: `git diff --check HEAD` exit 0; `verify-encoding.mjs` PASS; `git status --porcelain` chỉ thấy file trong `docs/tasks/hrp-t1c-intake-worker-link/**` + source + integration test. | None |
| `AC-11` | `E-08` | PENDING: chờ owner review; PR non-draft sẽ được mở sau khi user xác nhận. | Cần user chỉ định base branch và chạy `gh pr create --draft=false`. |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/conversion.service.test.ts` | exit 0; 27/27 passed | `evidence/e01-conversion-service-unit.txt` (logged below) |
| `E-02` | `npm run typecheck` | exit 0 | inline (clean stdout) |
| `E-03` | `npm run lint` | exit 0; warnings only (no errors) | `evidence/e03-lint-summary.txt` |
| `E-04` | `npx --no-install prisma validate` (after `.env` load) | exit 0; "The schema at prisma/schema.prisma is valid 🚀" | inline |
| `E-05` | `npx --no-install prisma generate` | exit 0; "Generated Prisma Client (v5.22.0)" | inline |
| `E-06` | `npm run build` | exit 0; full route map emitted | `evidence/e06-build.txt` (truncated) |
| `E-07` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; "PASS (8 changed text file(s), strict UTF-8 without BOM)" | inline |
| `E-08` | `git status --porcelain` | tracked surface: `src/domains/applications/conversion.service.{ts,test.ts}`, `src/shared/security/required-relation-sweep.static.test.ts`, `vitest.integration-files.ts`, `tests/db/intake-convert-worker-link.integration.test.ts`, `docs/tasks/hrp-t1c-intake-worker-link/{TASK.md,HANDOFF.md}`. Untracked ignored: `node_modules/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.env` | inline |
| `E-09` | `npx vitest run --config vitest.integration.config.ts tests/db/intake-convert-worker-link.integration.test.ts` | self-skip: `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` absent. `describe.skipIf(!HAS_TEST_DB)` is set, so exit 0. | inline |
| `E-10` | `git diff --check HEAD` | exit 0 (no whitespace errors) | inline |

### Test counts

- `npm run test:unit` — `Test Files  275 passed (275)` / `Tests  4264 passed | 9 skipped (4273)` / `Duration  120.03s`
- Targeted unit: 27/27 pass in `conversion.service.test.ts` (18 existing + 9 new)
- Integration: self-skipped (env-blocked) — file is ready for CI/owner pre-merge

### Required-gate checklist

| Gate | Command | Result |
|---|---|---|
| Targeted unit | `npx vitest run --config vitest.unit.config.ts src/domains/applications/conversion.service.test.ts` | `27/27 PASS` |
| Full unit | `npm run test:unit` | `275 files, 4264 tests PASS, 9 skipped` |
| Typecheck | `npm run typecheck` | `exit 0` |
| Lint | `npm run lint` | `exit 0` (warnings only) |
| Build | `npm run build` | `exit 0` |
| Prisma validate | `npx --no-install prisma validate` | `exit 0` (after `.env` load) |
| Prisma generate | `npx --no-install prisma generate` | `exit 0` |
| Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | `exit 0` |
| Diff hygiene | `git diff --check HEAD` | `exit 0` |
| Task contract | `pwsh .ai-pipeline/scripts/verify-task.ps1` | `DRAFT-VALID` (1 non-blocking warning) |
| Handoff contract | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | `PASS` (1 round) |
| Integration (synthetic DB) | `npx vitest run --config vitest.integration.config.ts tests/db/intake-convert-worker-link.integration.test.ts` | self-skip; ready for CI |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

- Standard lane NONE; self-review complete; all canonical gates PASS; integration
  test self-skip an toàn do env-blocked, sẵn sàng chạy khi owner cấp
  `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST`. Implementation đã được commit
  forward-only (chờ final SHA sau commit). Source, test, integration test
  không còn semantic delta ngoài commit này.

- `git status --porcelain` clean cho tracked surface; untracked `node_modules/`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.env` đã được `.gitignore` cover.

> Handoff status: `READY_FOR_REVIEW` (chờ owner confirm base branch + tạo PR non-draft).
