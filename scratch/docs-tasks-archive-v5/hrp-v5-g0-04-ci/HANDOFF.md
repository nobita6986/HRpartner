# HANDOFF: hrp-v5-g0-04-ci

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-g0-04-ci` |
| Work type | `INFRA` |
| Audit mode (phải khớp TASK) | `INFRA_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `76096b7` — worktree đã dirty sẵn (EV-08): Phase-5/MP-2/M13 uncommitted; G0-04 layered lên trên |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-24 ~15:05 +07:00` |

## 1. Outcome Summary

Đã dựng CI tối thiểu, tái lập được cho HRP theo contract G0-04/RF-05:

- **Scripts** (`package.json`): thêm `typecheck`, `lint`, `test:unit`, `test:integration`; giữ nguyên `test`/`build` (backward-compatible). Mỗi script propagate exit code thật.
- **ESLint tối thiểu** (`eslint.config.mjs`, flat config): 0 error / 436 warning, KHÔNG blanket-ignore `app/**` hay `src/**`; chỉ ignore asset/build/mockup (`public/**`, `docs/**`, `.next/**`, `appBCC/**`) và stray files. Warning policy: no-error-gate (build vẫn xanh với warning), documented ở §5.
- **Typecheck** full `tsc --noEmit` → exit 0 bằng sửa type-only cơ học trên các file test EV-05 (9 file tracked + 1 file untracked `mp1.contract.test.ts`), KHÔNG đổi assertion/business behavior.
- **Lane split**: `vitest.unit.config.ts` (FORCE unreachable sentinel `DATABASE_URL`, exclude DB files → unit không chạm DB) và `vitest.integration.config.ts` (chỉ nhận `*_TEST` vars). Single source of truth: `vitest.integration-files.ts`.
- **Fail-closed preflight** (`scripts/ci/integration-preflight.mjs`): thiếu test secret → `ENV_BLOCKED` (exit 0, không PASS giả); refuse khi trùng protected URL hoặc admin không cùng target; masked output, KHÔNG log connection string.
- **Workflow** (`.github/workflows/ci.yml`): job `quality` (PR/push main/manual) + job `integration` (fail-closed, fork-PR guard); `permissions: contents: read`, timeout 15', concurrency cancel-in-progress.

Chưa hoàn thành / ngoài tầm Tier 2: chưa có live CI run URL (không push — Tier 2 không được commit/push khi chưa ủy quyền); GitHub test secrets do OP cấp (hiện `ENV_BLOCKED`). Worktree có sẵn nhiều file dirty ngoài scope (EV-08) — KHÔNG đụng, KHÔNG stage.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01/03` | `package.json` (+8), `package-lock.json`, `eslint.config.mjs` (new) | `DONE` | None |
| `STEP-02` | `RQ-04` | 9 test file EV-05 (tracked, +59/−28) + `src/domains/job-board/mp1.contract.test.ts` (untracked) | `DONE` | Type-only. `security-matrix.integration.test.ts` diff co-mingle 1 describe-block RLS pre-existing (M13/Phase-5, KHÔNG do task này viết) — xem BLK-01 |
| `STEP-03` | `RQ-05/06` | `vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.integration-files.ts`, `scripts/ci/integration-preflight.mjs` (new) | `DONE` | None |
| `STEP-04` | `RQ-02/06/07` | `.github/workflows/ci.yml` (new) | `DONE` | None |
| `STEP-05` | `RQ-01/02/05` | full quality lane | `DONE` | `npm test` (base) KHÔNG chạy (đọc real `.env` DATABASE_URL) — thay bằng lane split có chủ ý; xem BLK-02 |
| `STEP-06` | `RQ-08` | `docs/tasks/hrp-v5-g0-04-ci/HANDOFF.md` (this) | `DONE` | None |

## 3. Acceptance Evidence

**Lệnh chính xác đã chạy (Windows, PowerShell/Git Bash, Node v24.19.0 local; CI target Node 22).** Tier 3 chạy lại từng lệnh. Dòng đầu bắt buộc `verify-task.ps1` PASS (C-09).

| AC | Command/check | Exit/result | Evidence summary | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-g0-04-ci\TASK.md` | `RESULT: PASS` (exit 0) | `TASK CONTRACT CHECK ... RESULT: PASS. TASK contract is ready for execution.` | None |
| `AC-01` | `npm run typecheck` · `npm run lint` · `npm run test:unit` · `npm run test:integration` (+ inspect `package.json` scripts, `npm test` giữ nguyên) | tồn tại + propagate exit thật (0/1 theo thiết kế) | 4 script mới có trong manifest; bằng chứng exit thật ở AC-03/04/05/06; `test`+`build` không đổi | None |
| `AC-02` | (a) `node -e "require('js-yaml').load(fs.readFileSync('.github/workflows/ci.yml','utf8'))"` → `YAML_OK`; (b) controlled negative: tạm thêm `src/__tmp_neg__.test.ts` fail → `npm run test:unit` | (a) `YAML_OK` exit 0; (b) `Test Files 1 failed \| 37 passed (38)` / `Tests 1 failed \| 470 passed (471)` **exit 1** (đã xoá temp) | test fail → non-zero → CI step đỏ (GitHub fail step khi exit≠0). jobs=`[quality,integration]` | Chưa có live CI run URL — không push (Tier 2 no-push). Negative tái lập local |
| `AC-03` | `npm run lint` (`eslint .`) | `✖ 436 problems (0 errors, 436 warnings)` **exit 0** | Config lint `app/**`+`src/**`+test+config; ignore chỉ asset/build/stray (`public/**`,`docs/**`,`.next/**`,`appBCC/**`, `check_rls.cjs`…). Không blanket-ignore source | Warning policy (§5) |
| `AC-04` | `npm run typecheck` (`tsc --noEmit`) + `git diff --stat` các file EV-05 | **exit 0**; 9 file test: `+59 −28`; `package.json +8` | Sửa type-only (vd `$queryRawUnsafe<T>()` → `(... ) as T`); assertion/business intent giữ nguyên | `security-matrix.integration.test.ts` co-mingle block pre-existing → BLK-01 |
| `AC-05` | `npm run test:unit` (`vitest run --config vitest.unit.config.ts`) | `Test Files 37 passed (37)` / `Tests 470 passed (470)` **exit 0** (~9.5s) | Lane FORCE `DATABASE_URL=postgresql://blocked:blocked@127.0.0.1:1/blocked?connect_timeout=1` (bỏ qua ambient env) + exclude 6 DB file → không network/DB; không giảm case (LIVE mp2 self-skip) | None |
| `AC-06` | 4 preflight scenario + `npm run test:integration` (không secret): **A** `CI_INTEGRATION_STRICT=1` (no test URL); **B** `DATABASE_URL`==`DATABASE_URL_TEST`; **C** admin khác host; **D** synthetic hợp lệ | no-secret → `ENV_BLOCKED` **exit 0**; **A** `ENV_BLOCKED` + "treated as failure" **exit 1**; **B** `INTEGRATION_REFUSED (DATABASE_URL)` **exit 1**; **C** `INTEGRATION_REFUSED` (same host+port+db) **exit 1**; **D** `guards passed` + `writer/admin: postgresql://****@127.0.0.1:1/hrp_test fp=…` | Leak-check: `grep -c` password thô = **0** → không log URL/secret. Không có fallback `.env`/`_DEV`/`_ADMIN`/prod | Integration LIVE thật chờ OP cấp secret (hiện `ENV_BLOCKED`) |
| `AC-07` | `js-yaml` parse `ci.yml` + đọc field bảo mật | `permissions={"contents":"read"}`; `timeout-minutes: 15`; `concurrency … cancel-in-progress: true`; `integration.if = event_name != 'pull_request' \|\| head.repo.full_name == github.repository` | Least-privilege read-only; fork PR KHÔNG nhận secret; không artifact chứa env | None |
| `AC-08` | `npm run build` (`next build`) + `npx prisma validate` | build **exit 0** (`Compiled successfully`, route table in ra); prisma validate **exit 0** | Quality lane dùng `DATABASE_URL` dummy `postgresql://ci:ci@localhost:5432/ci_dummy` (Prisma connect lazy, không dial); CI dùng `npm ci` + cache npm | None |
| `AC-09` | `git diff --check` + `git status --short` (scoped) + `git diff --name-only` + file này | diff-check **exit 0** (chỉ notice CRLF, không whitespace/conflict error); danh sách scope ở §4 | HANDOFF có full matrix; deliverable trong In-scope; dirty ngoài scope KHÔNG stage | Worktree dirty sẵn (EV-08) → BLK-02/BLK-03 |
## 4. Changed Deliverables

**In-scope — do task này tạo/sửa (đây là tập cần stage khi sếp cho phép commit):**

- **Created (untracked):**
  - `.github/workflows/ci.yml`
  - `eslint.config.mjs`
  - `scripts/ci/integration-preflight.mjs`
  - `vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.integration-files.ts`
  - `docs/tasks/hrp-v5-g0-04-ci/HANDOFF.md` (file này)
- **Modified (tracked) — STEP-01:** `package.json` (+8: 4 script + 4 devDep), `package-lock.json`.
- **Modified (tracked) — STEP-02 type-only (EV-05):** `src/domains/attendance/4role-attendance.integration.test.ts`, `src/domains/attendance/e2e-attendance-narrative.integration.test.ts`, `src/domains/attendance/ticket.service.test.ts`, `src/domains/reconciliation/reconciliation-unit.test.ts`, `src/domains/security/security-matrix-portals.test.ts`, `src/domains/security/security-matrix.integration.test.ts`, `src/domains/staffing/4role-staffing.integration.test.ts`, `src/domains/staffing/e2e-staffing-narrative.integration.test.ts`, `src/shared/auth/matrix-scope.test.ts`.
- **Modified (untracked pre-existing) — STEP-02 type-only:** `src/domains/job-board/mp1.contract.test.ts` (file MP-1/MP-2 chưa track; chỉ thêm type fix, KHÔNG commit — BLK-03).
- **Dependency:** devDependencies `@eslint/js`, `eslint`, `globals`, `typescript-eslint` (tương thích Next 15 + TS 5.7). **Schema/migration:** None. **Environment:** None (secrets do OP).
- **Git diff/commit:** **Not created** — Tier 2 không commit/push khi chưa được ủy quyền.

**NGOÀI scope — dirty sẵn trong worktree (EV-08), KHÔNG đụng, KHÔNG stage:**

- `app/**` (5 file: `admin/jobs/page.tsx`, `api/jobs/route.ts`, `api/staffing/orders/[id]/route.ts`, `api/staffing/orders/route.ts`, `job-board/page.tsx`) + untracked `app/api/projects/[id]/publish/route.ts` — Phase-5/MP work.
- `appBCC/**` (nhiều M/D) — khu vực sếp.
- `prisma/seed.mjs` (M), `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql` (untracked).
- `src/domains/staffing/order.service.ts` (M), `src/shared/auth/permission-catalog.ts` (M), `src/domains/job-board/public.service.ts`, `src/domains/job-board/publish.service.ts` (untracked) — production MP work, KHÔNG do G0-04.
- `docs/V5_READINESS_ASSESSMENT.md`, các `docs/tasks/*/{AUDIT,HANDOFF}.md` khác, `run-test.js` (stray).

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | Limitation | `git diff src/domains/security/security-matrix.integration.test.ts`: ngoài fix type-only (`$queryRawUnsafe<T>()`→`(...) as T`) còn 1 describe-block "RLS structural regression guards" có sẵn từ M13/Phase-5 (KHÔNG do G0-04 viết) | Working-tree diff của file này lẫn thay đổi ngoài task; typecheck exit 0 vẫn đúng | Tier 3 đánh giá STEP-02 theo tiêu chí "tsc exit 0 + không đổi assertion" thay vì raw diff; sếp quyết cách commit sạch |
| `BLK-02` | Limitation | Base `npm test` đọc real `.env DATABASE_URL` (Neon dev) — cố ý KHÔNG chạy; thay bằng lane split (`test:unit` sentinel + `test:integration` fail-closed) | An toàn DB (RISK-01); nhưng không có single "full suite" run trên dev | Xác nhận lane split thay thế `npm test` là chấp nhận được cho gate |
| `BLK-03` | Limitation | `src/domains/job-board/mp1.contract.test.ts` untracked (MP-1/MP-2 chưa commit); G0-04 chỉ layer type fix | Không thể commit file này trong scope G0-04 mà không kéo theo MP work | Sếp/Planner quyết chủ sở hữu file (MP-2 commit trước, hay gộp) |
| `LIM-01` | Limitation | Chưa push → không có CI run URL | AC-02 dùng controlled local negative thay live run | Sau audit, sếp push để lấy run URL + bật required checks |
| `LIM-02` | Limitation | Worktree dirty sẵn (EV-08): app/**, appBCC/**, prisma, 2 production src | Typecheck/lint/build chạy trên tree đã có thay đổi ngoài task | Không của Tier 2 — sếp dọn/commit MP-Phase5 riêng |

**Warning policy (RQ-03):** `eslint.config.mjs` đặt các rule debt hiện hữu ở mức `warn` (không `error`): `@typescript-eslint/no-explicit-any`, `no-unused-vars` (bỏ qua `_`-prefix), `no-require-imports`, `ban-ts-comment`, `no-empty-object-type`, `no-empty` (cho catch), `no-useless-escape`, `no-irregular-whitespace`, `prefer-const`. Lý do: đóng type/lint debt lớn không thuộc G0-04 (tránh churn `app/**`/`src/**`); gate hiện tại = **0 error**. `next build` không fail vì warning → build xanh. Sau khi debt được dọn ở task riêng, có thể nâng dần `warn`→`error`. KHÔNG dùng blanket-ignore `app/**` hay `src/**`; chỉ ignore asset/build/mockup/stray. `react-hooks` dùng placeholder plugin (chỉ để nuốt 1 inline `eslint-disable` có sẵn trong `data-table.tsx`, không kéo plugin thật → tránh scope creep).

## 6. Evidence Index

Không sinh artifact lớn — mọi evidence là output ngắn (inline §3) + command tái lập. Con trỏ chính:

| Evidence | Path / Command | Proves |
|---|---|---|
| `E-01` | `.github/workflows/ci.yml` | AC-02/07/08 — quality+integration job, least-privilege, fork guard |
| `E-02` | `scripts/ci/integration-preflight.mjs` | AC-06 — fail-closed, ENV_BLOCKED, refuse protected/mismatch, mask |
| `E-03` | `vitest.unit.config.ts` + `vitest.integration.config.ts` + `vitest.integration-files.ts` | AC-05/06 — lane split, unit no-DB sentinel |
| `E-04` | `eslint.config.mjs` | AC-03 — 0 error, no blanket-ignore source |
| `E-05` | `npm run test:unit` (rerun) | AC-05 — 37 files / 470 tests exit 0, no DB |
| `E-06` | `npm run build` (rerun với dummy `DATABASE_URL`) | AC-08 — Compiled successfully exit 0 |
| `E-07` | 4 preflight scenario A/B/C/D (rerun với synthetic env) | AC-06 — exit 1 refuse + masked, 0 leak |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | STEP-01..06 DONE. Quality lane xanh (typecheck/lint/unit/build exit 0), integration fail-closed (`ENV_BLOCKED`), preflight guards + masking verified. Limitation: chưa push (no CI run URL); worktree dirty ngoài scope không đụng (EV-08); `security-matrix` diff co-mingle block pre-existing (BLK-01). |

> Handoff status: `READY_FOR_AUDIT`
