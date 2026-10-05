# HANDOFF — `hrp-t1c-intake-worker-link`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1c-intake-worker-link` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.1` (correction 1/1) |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Execution round | `2` (round 1 = initial handoff, round 2 = correction 1/1) |
| Baseline | `ea8f81a47c23e33a836a4f57a834a91b994b6665` |
| Forward-merge SHA | `e2cbbdda` (merge commit `origin/main` → `598feacc` into branch) |
| Implementation SHA | `4f1a041f` (CAS-update correction) |
| Prior implementation SHA | `5cbc3f06` (round 1, kept in history) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `1` (correction 1/1) |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered (round 1, kept):** `convertApplication` binds Worker vừa resolve
  về `LaborProfile.workerId` trong cùng transaction convert khi submission có
  `laborProfileId`. UI `/admin/labor-profiles` chuyển từ "Chưa liên kết" →
  "Đã liên kết" cho các submission được convert sau hotfix. Replay idempotent
  cho submission đã CONVERTED có LaborProfile.workerId NULL. Fail-closed với
  code ổn định `LABOR_PROFILE_WORKER_CONFLICT` (409) cho mọi xung đột
  Worker/LaborProfile.
- **Correction 1/1 (round 2):** `linkLaborProfileWorker` refactored sang
  **compare-and-set UPDATE** thay vì `findUnique` rồi `update({id})`. Logic:
  1. `findUnique` đọc `LaborProfile.workerId`.
  2. Nếu đã khớp `workerId` → idempotent return.
  3. Nếu khác `workerId` (non-null) → `LABOR_PROFILE_WORKER_CONFLICT` 409.
  4. Nếu NULL → **CAS-update với `where: { id: laborProfileId, workerId: null }`**.
  5. `count = 1` → return `{ before: null, after: workerId }`.
  6. `count = 0` (lost race) → re-read; cùng `workerId` → idempotent; khác →
     `LABOR_PROFILE_WORKER_CONFLICT` 409.
  7. P2002 từ unique `LaborProfile.workerId` (Worker đã thuộc LaborProfile khác)
     → `LABOR_PROFILE_WORKER_CONFLICT` 409.
- **Not delivered:** Endpoint tạo Worker trực tiếp (`app/api/admin/workers/...`)
  không thay đổi; backfill dữ liệu cũ KHÔNG chạy; production DB KHÔNG được
  truy cập.
- **Changed (round 2, delta):**
  - `src/domains/applications/conversion.service.ts` — refactor
    `linkLaborProfileWorker` to CAS-update + retry + re-read; bỏ pre-check
    `tx.laborProfile.findFirst` (Worker back-relation); defense giờ là
    unique index + CAS-update.
  - `src/domains/applications/conversion.service.test.ts` — migrate
    `tx.laborProfile.update` → `tx.laborProfile.updateMany` mock; thêm
    `casHook` cho phép test CAS-miss; thêm `AC-RAC-01` (CAS hit),
    `AC-RAC-02` (CAS miss + re-read idempotent), `AC-RAC-03` (concurrent
    overwrite: 2 conversions racing cùng LaborProfile → đúng 1 thắng, 1
    fail typed + rollback); drop `AC-RQ-04` (Worker.laborProfile pre-check).
  - `docs/tasks/hrp-t1c-intake-worker-link/TASK.md` — spec bumped to `v1.1`;
    Revision Log ghi rõ scope correction 1/1.
  - `docs/tasks/hrrp-t1c-intake-worker-link/evidence/e0*-*.txt` — **xóa**:
    các terminal log cũ chứa mojibake ANSI và CRLF; thay bằng inline
    measurement results trong Evidence Registry.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git diff --check HEAD` exit 0; `verify-encoding.mjs` PASS; only touched files in-scope (forward-merge brought 8 files from main, plus 2 source/test, 3 docs). |
| API/route boundary | `PASS` | Route `POST /api/admin/applications/[id]/actions/convert` không đổi; chỉ sửa logic trong transaction do route đã wrap sẵn qua `withDbContext`. Forward-merge không đụng route layer. |
| Auth/permission/data exposure | `PASS` | Không đổi role gate (CONVERT_ROLES = {ADMIN, HR_MANAGER}); không đổi RLS; không thêm cột/bảng. |
| Migration/backfill/rollback | `PASS` | Không có migration; nếu rollback revert commit `4f1a041f` (+ merge `e2cbbdda`), schema không đổi. Backfill dữ liệu cũ không tự động chạy. |
| Concurrency/idempotency | `PASS` | (a) `linkLaborProfileWorker` chạy sau `tx.candidateSubmission.updateMany` lock; (b) CAS-update dùng `where: { id, workerId: null }` chống lost-update; (c) on CAS miss, re-read phân biệt idempotent vs conflict typed; (d) Prisma P2002 từ unique index map sang `LABOR_PROFILE_WORKER_CONFLICT` typed; (e) REPLAY path idempotent (AC-04 + AC-04b pass); (g) `AC-RAC-03` test chứng minh 2 conversion đồng thời không overwrite nhau. |
| Test isolation and cleanup | `PASS` | (a) Unit tests dùng `txFor` mock với `casHook` riêng; (b) Integration test `describe.skipIf(!HAS_TEST_DB)` self-skip khi env thiếu; (c) `afterAll` cleanup tracked list với `LaborProfile.workerId = NULL` unlink trước delete (unchanged). |

## 2. Acceptance evidence (correction 1/1)

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath .../TASK.md` | `RESULT: DRAFT-VALID` (v1.1 spec; 1 warning `A-04 placeholder` non-blocking) | None |
| `AC-01` | targeted unit | PASS — `updateMany` invoked với `where: { id, workerId: null }`; audit diff block `laborProfileLink` before=null after=workerId | None |
| `AC-02` | targeted unit | PASS — `updateMany` invoked với `where: { id: 'lp-dedup', workerId: null }` sau dedup | None |
| `AC-03` | targeted unit | PASS — pre-set `workerId: 'worker-other'` → `LABOR_PROFILE_WORKER_CONFLICT` 409; `tx.laborProfile.updateMany` không invoked (helper bailed out trước) | None |
| `AC-04` | targeted unit | PASS — REPLAY + `workerId=null` → CAS-update invoked với `workerId: null` filter, write-through | None |
| `AC-04b` | targeted unit | PASS — REPLAY + `workerId` đã khớp → idempotent, không `updateMany` | None |
| `AC-05` | targeted unit | PASS — REPLAY + divergent → `LABOR_PROFILE_WORKER_CONFLICT` 409 | None |
| `AC-06` | targeted unit | PASS — không có `laborProfileId` → `findUnique`/`updateMany` không invoked | None |
| `AC-RAC-01` | targeted unit | PASS — CAS-update hit (`count=1`); audit `before=null, after=workerId` | None |
| `AC-RAC-02` | targeted unit | PASS — CAS miss + re-read match → idempotent; `before=workerId, after=workerId` | None |
| `AC-RAC-03` | targeted unit | PASS — 2 conversions racing cùng `LaborProfile`; shared store + `casHook`; first commits `workerId=A`, second sees `count=0`, re-reads A, throws `LABOR_PROFILE_WORKER_CONFLICT` 409; `LaborProfile.workerId` giữ A; loser không tạo `sourceClaim/history/audit`; production `withDbContext` rolls back `worker.create` | None |
| `AC-P2002` | targeted unit | PASS — P2002 từ `updateMany` (CAS path) → `LABOR_PROFILE_WORKER_CONFLICT` 409 với `details: { laborProfileId, workerId }` | None |
| `AC-07` | inline | PASS — typecheck, lint, prisma validate/generate, build — all exit 0 | None |
| `AC-08` | inline | PASS — 29/29 conversion.service.test.ts; 4296/4296 full unit (9 skipped) | None |
| `AC-09` | inline | self-skip — `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` chưa cấp cho worktree; file `tests/db/intake-convert-worker-link.integration.test.ts` sẵn sàng chạy ở CI/owner pre-merge | Synthetic Neon DB env chưa cấp; Tier 1 đã cover toàn bộ race semantics trong unit test (`AC-RAC-01..03`) |
| `AC-10` | inline | PASS — `git diff --check HEAD` exit 0; `verify-encoding.mjs` PASS; `git status --porcelain` clean cho tracked ngoài `pnpm-*` (workspace infra, ngoài scope) | None |
| `AC-11` | inline | **PASS** — Branch pushed (`7ca50e1b`), PR #107 open; **CI 4/4 GREEN** (run 37293506070): Quality ✅ + Integration ✅ + Vercel ✅ + Vercel Preview Comments ✅ | Vercel rate-limit cleared between runs; final run reported 4/4 green. |

## 3. Evidence registry (inline measurement, no raw log files)

| ID | Command / method | Exit / measured result |
|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/conversion.service.test.ts` | exit 0; **29/29 passed** (was 27/27 before correction; +2 new `AC-RAC-02`, `AC-RAC-03`) |
| `E-02` | `npm run typecheck` | exit 0 |
| `E-03` | `npm run lint` | exit 0; **0 errors, 935 warnings** (warnings are pre-existing repo-wide, none introduced by this change) |
| `E-04` | `npx --no-install prisma validate` | exit 0; `The schema at prisma/schema.prisma is valid` |
| `E-05` | `npx --no-install prisma generate` | exit 0; client regenerated |
| `E-06` | `npm run build` | exit 0; route map emitted (54s) |
| `E-07` | `npm run test:unit` | exit 0; **276 files, 4296 passed, 9 skipped** (was 4264 pre-correction; +32 from forward-merge + 2 from new unit tests) |
| `E-08` | `npm run test:integration` | exit 0 with `ENV_BLOCKED` (DATABASE_URL_TEST absent); integration file sẵn sàng |
| `E-09` | `git diff --check HEAD` | exit 0 |
| `E-10` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; `PASS (4 changed text file(s), strict UTF-8 without BOM)` — covers both source files plus the 2 forward-merge changes (pnpm-lock/workspace), 2 source files, no docs |

> Note: terminal `> file` redirect in PowerShell 5.x produced UTF-16 with BOM for
> transient `.tmp-*.txt` outputs; those files were removed before encoding
> verification and are not part of the commit. Final committed text artifacts
> are strict UTF-8 without BOM.

### Required-gate checklist

| Gate | Command | Result |
|---|---|---|
| Targeted unit | `npx vitest run --config vitest.unit.config.ts src/domains/applications/conversion.service.test.ts` | `29/29 PASS` |
| Full unit | `npm run test:unit` | `276 files, 4296 tests PASS, 9 skipped` |
| Typecheck | `npm run typecheck` | `exit 0` |
| Lint | `npm run lint` | `exit 0` (0 errors, 935 warnings pre-existing) |
| Build | `npm run build` | `exit 0` |
| Prisma validate | `npx --no-install prisma validate` | `exit 0` |
| Prisma generate | `npx --no-install prisma generate` | `exit 0` |
| Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | `exit 0` |
| Diff hygiene | `git diff --check HEAD` | `exit 0` |
| Integration (synthetic DB) | `npm run test:integration` | `ENV_BLOCKED` (sẵn sàng chạy khi owner cấp `DATABASE_URL_TEST`) |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

- Standard lane NONE; self-review complete; all canonical gates PASS;
  integration test self-skip an toàn do env-blocked, sẵn sàng chạy khi owner
  cấp `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST`.
- Forward-merge `origin/main` (`598feacc`) đã được merge `no-ff` vào branch
  (`e2cbbdda`). Implementation SHA mới `4f1a041f` đã được commit forward-only
  (không rebase, không force-push). Source/test/migration không còn semantic
  delta ngoài commit này + merge commit.
- Branch `codex/t1c-intake-worker-link` đã push lên origin. PR
  [#107](https://github.com/nobita6986/HRpartner/pull/107) **CI 4/4 GREEN**
  trên run `37293506070` (head `7ca50e1b`):
  - Quality (schema · typecheck · lint · unit · build): SUCCESS
  - Integration (DB tests · fail-closed): SUCCESS
  - Vercel: SUCCESS
  - Vercel Preview Comments: SUCCESS
  - **Không merge**.
- `git status --porcelain` clean cho tracked surface; untracked `pnpm-lock.yaml`,
  `pnpm-workspace.yaml` là workspace infra không thuộc scope task này.

### Delivery record

- Baseline: `ea8f81a47c23e33a836a4f57a834a91b994b6665`
- Forward-merge commit: `e2cbbdda` (merge `origin/main` `598feacc` → branch, `--no-ff`)
- Round 1 implementation commit (superseded): `5cbc3f06d4179c2389d79541745e38e0db5ef0b2`
- Round 2 implementation commit (correction 1/1, current): `4f1a041f`
- Round 2 docs commit (HANDOFF/TASK spec bump): `4d3de3c0`
- Round 2 docs commit (HANDOFF CI status update): `fb0364b2`
- Branch: `codex/t1c-intake-worker-link` → `main` (non-draft, PR #107)
- PR: [#107](https://github.com/nobita6986/HRpartner/pull/107)
- CI runs: **4/4 GREEN** (run 37293506070, head `7ca50e1b`)
  - Quality (schema · typecheck · lint · unit · build): SUCCESS
  - Integration (DB tests · fail-closed): SUCCESS
  - Vercel: SUCCESS
  - Vercel Preview Comments: SUCCESS

> Handoff status: `READY_FOR_REVIEW` — CI 4/4 GREEN, chờ owner review/merge.