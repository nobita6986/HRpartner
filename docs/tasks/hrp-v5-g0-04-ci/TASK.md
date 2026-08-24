# TASK: hrp-v5-g0-04-ci

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-g0-04-ci` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `76096b7` — MP-2 implementation + evidence đã commit scoped và TASK MP-2 `ACCEPTED` |
| Modules | `V5-G0-04`, `RF-05`, CI/Test Infrastructure |
| ADR references | `UNIFIED_PLAN_v5.md §4.2 V5-G0-04, §8.1-8.3, §12.2 RF-05`; `V5_3_TIER_EXECUTION_GUIDE.md §4.2, §5.1` |
| Current execution round | `2` |
| Current audit round | `1` (independent audit round 1 PASS; sếp waiver re-audit round 2) |
| Next gate | G0-04 đóng; Tier 1 mở `hrp-v5-g0-05-operation-fixtures` sau khi commit scoped G0-04. |
| Updated | `2026-08-24 15:55 +07:00` |

## 1. Outcome

### User-visible outcome

Mỗi pull request và thay đổi vào `main` có một CI tối thiểu, tái lập được, chạy schema validation, typecheck, lint, unit test và build; lỗi làm check đỏ. Integration/security test chỉ chạy trên DB test tách biệt, không bao giờ tự rơi về Neon dev/production. Khi GitHub chưa được cấp test secrets, CI phải hiển thị rõ `ENV_BLOCKED` thay vì báo integration PASS giả.

### Non-goals

- Không sửa business rule, API behavior, UI, Prisma schema hoặc migration.
- Không tạo/seed/reset/apply migration vào bất kỳ DB dev/production nào.
- Không đưa secret hoặc connection string vào repo, workflow log, artifact hay fixture.
- Không xử lý G0-02 seed, G0-05 operation fixtures, RF-08 migration drift automation hoặc xóa `appBCC`.
- Không đổi test expectation để làm CI xanh; không dùng `skip`, `only`, blanket exclude hoặc giảm coverage hiện hữu.
- Không cấu hình GitHub branch protection bằng API trong task này; workflow phải tạo check ổn định để sếp bật required check sau audit.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md` — hàng `V5-G0-04`, §8.3, RF-05 | G0-04 yêu cầu CI + scripts `typecheck/lint/test:unit/test:integration/build`; integration dùng DB test riêng và báo `ENV_BLOCKED` khi thiếu secret. | Khóa deliverables và DB safety gate. |
| `EV-02` | `package.json:5-12` tại baseline `76096b7` | Chỉ có `build`, `test`, `test:watch`, Prisma scripts; chưa có typecheck/lint/unit/integration scripts. | Tier 2 bổ sung scripts, giữ compatibility `npm test`. |
| `EV-03` | `.github/workflows/` read-only preflight 24/08 | Không tồn tại workflow. | Tạo một workflow canonical `.github/workflows/ci.yml`. |
| `EV-04` | `vitest.config.ts:10-42` | Repo có 43 test files, single-thread, default LIVE block bị skip nếu không có opt-in; config ưu tiên env đã truyền. | Tách command unit/integration mà không phá default suite. |
| `EV-05` | `npx tsc --noEmit --pretty false` tại `76096b7`, exit `2` | Lỗi type hiện nằm trong test files attendance/job-board/reconciliation/security/staffing/shared-auth; không phải bằng chứng production behavior sai. | Tier 2 được sửa type test cơ học trong danh sách baseline; production API/interface change là stop condition. |
| `EV-06` | `package-lock.json` + manifest | Repo dùng npm lockfile; chưa có ESLint dependency/config. | CI dùng `npm ci`; Planner cho phép thêm ESLint toolchain tương thích Next 15 + TypeScript ở devDependencies và config tối thiểu. |
| `EV-07` | `src/domains/applications/security-boundary.mp2.test.ts`, `live-integration.mp2.test.ts` | Security/integration LIVE cần runtime test URL, admin test URL và opt-in; MP-2 đã chứng minh trên Neon branch riêng. | Integration runner phải hỗ trợ privileged security checks nhưng fail-closed, không đọc `.env` production. |
| `EV-08` | `git status --short` 24/08 | Worktree có nhiều thay đổi/xóa ngoài scope, đặc biệt `appBCC`, Phase-5 và MP-1/M13 artifacts. | Tier 2 chỉ stage file thuộc task; cấm `git add -A`, reset/revert hoặc format toàn repo. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Package manager canonical là npm; CI dùng `npm ci` và lockfile hiện hữu. | EV-06 / Tier 1 | Valid |
| `DEC-02` | `CHOSEN` | Cho phép thêm ESLint + Next/TypeScript config/dependency tối thiểu tương thích version hiện tại. Không thêm Prettier hoặc formatter mới trong G0-04. | EV-02/06 / Tier 1 | Valid |
| `DEC-03` | `CHOSEN` | `typecheck` là full `tsc --noEmit`; không exclude test khỏi tsconfig để che baseline. Tier 2 được sửa type-only/mechanical test harness tại đúng các file EV-05, giữ nguyên assertion và business expectation. | EV-05 / Tier 1 | Valid |
| `DEC-04` | `CHOSEN` | Unit lane không cần DB/secret và phải xanh. Integration lane chỉ dùng `DATABASE_URL_TEST`; security introspection có thể dùng `DATABASE_URL_ADMIN_TEST`. Cấm fallback sang `.env`, `DATABASE_URL_DEV`, `DATABASE_URL_ADMIN` hoặc URL production. | Plan §8.3 / MP-2 lesson | Valid |
| `DEC-05` | `CHOSEN` | Khi GitHub chưa có test secrets, integration lane xuất đúng token `ENV_BLOCKED`, ghi job summary và không tuyên bố test PASS. Quality lane vẫn phải chạy; sau khi secrets được cấp, integration failure phải làm workflow đỏ. | RF-05 / Tier 1 | Valid until secrets configured |
| `DEC-06` | `CHOSEN` | Workflow chạy `pull_request`, push `main`, `workflow_dispatch`; permissions tối thiểu `contents: read`, có timeout và concurrency cancel-in-progress. Secret-backed LIVE DB tests không chạy trên PR fork/untrusted context. | Security baseline / Tier 1 | Valid |
| `DEC-07` | `ASSUMPTION` | GitHub test secrets chưa được cấu hình trong repo tại thời điểm lập task. | Local evidence cannot inspect secrets / OP | Expires when OP confirms secrets |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Bổ sung scripts `typecheck`, `lint`, `test:unit`, `test:integration`, giữ `build` và backward-compatible `test`; mỗi script có exit code đáng tin cậy. | Must | EV-01/02 | Script thiếu, no-op hoặc swallow failure → task fail. |
| `RQ-02` | Tạo `.github/workflows/ci.yml` chạy install khóa bằng lockfile, Prisma generate/validate, typecheck, lint, unit và build trên PR/push main/manual. | Must | V5-G0-04, DEC-01/06 | Bất kỳ quality command fail phải làm quality check đỏ. |
| `RQ-03` | Thiết lập ESLint tối thiểu cho Next 15 + TypeScript, lint source/test/config thuộc repo; warning policy ghi rõ và không ignore toàn thư mục để lấy green. | Must | DEC-02 | Config không tải được hoặc lint bỏ qua app/src → fail. |
| `RQ-04` | Đưa full `tsc --noEmit` về exit 0 bằng sửa type test cơ học trong baseline EV-05; không đổi production interface/business rule hoặc assertion intent. | Must | DEC-03 | Nếu cần đổi source contract hoặc behavior, ghi HANDOFF `BLOCKED` và dừng phần đó. |
| `RQ-05` | Phân lane unit/integration rõ và deterministic: unit không cần network/DB; integration chọn đúng integration/security suites, chạy serial theo config hiện hữu và không double-run ngoài chủ ý. | Must | Plan §8.1-8.3, EV-04/07 | Unit chạm DB hoặc integration silently skipped → fail. |
| `RQ-06` | Integration preflight fail-closed: chỉ nhận test secrets, xác nhận runtime/admin cùng test target và target không trùng protected/dev/prod; thiếu secret → `ENV_BLOCKED` rõ, không PASS giả; có secret → test failure làm CI đỏ. | Must | DEC-04/05/06 | URL fallback, log secret, chạy prod/dev hoặc green giả → P0 fail, dừng workflow. |
| `RQ-07` | Workflow có least privilege, timeout, concurrency; không persist/generate secret artifact; fork PR không được nhận privileged secrets. | Must | DEC-06 | Secret exposure hoặc privileged test trên untrusted PR → P0 fail. |
| `RQ-08` | Bổ sung tài liệu vận hành ngắn trong `HANDOFF.md`/workflow comments: tên secrets, cách nhận biết `ENV_BLOCKED`, cách OP bật required checks sau audit; không tạo runbook phụ ngoài scope. | Should | Guide evidence gate | Thiếu hướng dẫn không chặn quality code nhưng chặn audit readiness nếu CI state mơ hồ. |

### 4.2 Scope boundaries

**In scope:**

- `package.json`, `package-lock.json`.
- `.github/workflows/ci.yml`.
- ESLint config tối thiểu tại repo root.
- Một integration preflight/runner/config nhỏ trong `scripts/` hoặc test config nếu cần để thực hiện RQ-05/06.
- `vitest.config.ts` hoặc config Vitest chuyên biệt, chỉ để phân lane và bảo vệ env.
- Các test files đang có lỗi type tại EV-05, chỉ thay đổi type-safe/mechanical không đổi assertion intent.
- `docs/tasks/hrp-v5-g0-04-ci/HANDOFF.md` do Tier 2 tạo.

**Out of scope:**

- Application/business source trong `app/**`, production domain service, Prisma schema/migrations/seed.
- Test behavior/expected result, removal test, blanket `exclude`, `skip/only`, coverage downgrade.
- GitHub secret creation, branch protection mutation, deploy/release.
- Mọi file `appBCC/**`, G0-02/G0-05/RF-08, và dirty files không được liệt kê trong In scope.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** CI không tạo dữ liệu production/dev. Integration data chỉ ở test DB tách biệt, test tự cleanup hoặc transaction rollback; không log PII/URL.
- **State:** quality lane luôn chạy. Integration state là `ENV_BLOCKED` khi thiếu secrets, hoặc thực thi thật với PASS/FAIL khi đủ secrets; không có trạng thái “skip nhưng báo PASS”.
- **Permission/data scope:** workflow `contents: read`; admin test secret chỉ dành cho security introspection/migration-free checks và không có ở fork PR.
- **Interface:** scripts trong `package.json` là public developer contract. Giữ `npm test`; các script mới chạy được trên Windows local và Ubuntu GitHub runner.
- **Failure/idempotency/concurrency:** workflow rerun không thay đổi runtime state ngoài dữ liệu test có cleanup; concurrency hủy run cũ cùng ref; timeout ngăn job treo.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01/03 | `package.json`, lockfile, ESLint config | Thêm scripts/toolchain tối thiểu; giữ npm/test compatibility. | DEC-01/02 | `npm ci`; `npm run lint`; inspect manifest diff | Dependency conflict hoặc lint cần ignore app/src để xanh. |
| `STEP-02` | RQ-04 | Test files EV-05 | Sửa type-only baseline đến full typecheck exit 0, không đổi behavior/assertions. | DEC-03 | `npm run typecheck`; targeted tests cho file đã sửa | Cần đổi production interface/business rule hoặc test expectation. |
| `STEP-03` | RQ-05/06 | Vitest config + integration preflight/runner | Tách lane; khóa env test-only; xuất `ENV_BLOCKED` khi thiếu secret; không fallback. | DEC-04/05, MP-2 safe DB pattern | Chạy unit không DB; chạy integration thiếu env; chạy preflight với masked safe env nếu OP cấp | Bất kỳ URL protected/dev/prod hoặc secret bị in. |
| `STEP-04` | RQ-02/06/07 | `.github/workflows/ci.yml` | Workflow quality + integration state, triggers/permissions/timeout/concurrency. | GitHub Actions, DEC-06 | Parse workflow; local commands tương đương; CI/PR thử nếu môi trường cho phép | Workflow cần privileged secret trên fork hoặc có write permission không cần thiết. |
| `STEP-05` | RQ-01/02/05 | Full verification | Chạy toàn bộ quality commands và default regression; xác nhận integration behavior ở cả thiếu/có env nếu safe DB được cung cấp. | STEP-01..04 | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm test`; `npm run build`; `npx prisma validate`; integration evidence/ENV_BLOCKED | Bất kỳ mandatory command fail hoặc test bị giảm/skip ngoài contract. |
| `STEP-06` | RQ-08 | `HANDOFF.md`, scoped git diff | Ghi command+exit+output, file list, limitations; bảo vệ dirty worktree. | Pipeline guide | `verify-task.ps1`; `git diff --check`; `git status --short`; exact scoped file list | Có diff ngoài scope, stage `appBCC`, dùng `git add -A`, hoặc evidence thiếu. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | 5 scripts yêu cầu tồn tại, chạy thật và propagate exit code; `npm test` còn hoạt động. | Manifest inspection + chạy từng script phù hợp | Command, exit, summary | Yes |
| `AC-02` | RQ-02 | Workflow hợp lệ, chạy quality commands trên PR/push main/manual; một test/lint failure thử nghiệm làm check đỏ hoặc được chứng minh bằng audit-safe controlled failure. | Workflow inspection + PR run hoặc controlled negative check | Run URL/screenshot/log hoặc limitation + reproducible local negative | Yes |
| `AC-03` | RQ-03 | ESLint tải được, lint app/src/tests/config, không blanket-ignore; exit 0 trên baseline sau fix. | `npm run lint` + config inspection | Exit 0, file/config evidence | Yes |
| `AC-04` | RQ-04 | Full `npm run typecheck` exit 0; diff test type fixes không đổi assertion/business behavior. | Typecheck + targeted test + diff review | Exit 0; changed-test list; rationale từng nhóm | Yes |
| `AC-05` | RQ-05 | Unit lane exit 0 khi không có DB secrets; không kết nối network/DB; default regression không giảm test files/cases ngoài LIVE conditional. | Unset DB vars rồi chạy unit/default; compare summary baseline | Exit/output + test count/skip explanation | Yes |
| `AC-06` | RQ-06 | Thiếu secrets cho output `ENV_BLOCKED` và không chạy DB; safe secrets chạy integration thật; protected/same-target probe bị từ chối trước test; không log URL. | Ba preflight scenarios + integration run nếu có test secrets | Masked output, exit/job state, LIVE test summary | Yes |
| `AC-07` | RQ-07 | Workflow `contents: read`, timeout/concurrency; privileged secrets không dùng trên fork PR; không artifact chứa env. | YAML/security audit | Relevant YAML excerpts + fork condition evidence | Yes |
| `AC-08` | RQ-02 | `npm run build` và `npx prisma validate` exit 0 trong quality lane; CI dùng `npm ci`. | Local commands + workflow inspection | Exit/output | Yes |
| `AC-09` | RQ-08 | HANDOFF có matrix command/exit/evidence, `ENV_BLOCKED` semantics và OP follow-up; diff chỉ thuộc In scope. | HANDOFF/gitscope audit | HANDOFF final status + `git diff --name-only` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-05` | `AC-01` |
| `RQ-02` | `STEP-04`, `STEP-05` | `AC-02`, `AC-08` |
| `RQ-03` | `STEP-01` | `AC-03` |
| `RQ-04` | `STEP-02` | `AC-04` |
| `RQ-05` | `STEP-03`, `STEP-05` | `AC-05` |
| `RQ-06` | `STEP-03`, `STEP-04` | `AC-06` |
| `RQ-07` | `STEP-04` | `AC-07` |
| `RQ-08` | `STEP-06` | `AC-09` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | CI chạm Neon dev/production | Host fallback hoặc reuse `.env` | Test-only vars, protected-host preflight, no fallback, fork guard | Disable integration job; rotate exposed secret nếu có; incident review |
| `RISK-02` | CI xanh giả vì skip integration | Missing secret nhưng job ghi PASS | Token/state `ENV_BLOCKED`, job summary, audit kiểm tra command không chạy | Revert workflow state logic; giữ quality lane độc lập |
| `RISK-03` | Sửa type làm đổi nghiệp vụ | Test expectation/source interface bị thay | Chỉ type-only files EV-05; targeted regression; stop condition | Revert từng test-only change; mở task domain riêng nếu API mismatch thật |
| `RISK-04` | ESLint tạo churn lớn | Auto-fix/format toàn repo | Không chạy bulk auto-fix; config tối thiểu; stage scoped | Revert lint-only churn/config commit |
| `RISK-05` | Workflow quá chậm/treo | Full serial suite + build vượt timeout | Cache npm, timeout, concurrency, lane separation | Tăng timeout có evidence hoặc split job, không bỏ test |
| `RISK-06` | Dirty worktree bị stage nhầm | `appBCC`/Phase-5 xuất hiện trong commit | Exact file list, cấm `git add -A`, Tier 3 C-07/C-10 | Không reset user files; unstage chỉ task commit scope theo hướng dẫn sếp |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None — GitHub secret provisioning là OP follow-up đã được mô hình hóa bằng `ENV_BLOCKED`, không làm đổi implementation contract. | - | - | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `PLN-01` (Planner spot-check, P1) | `REVISION_REQUIRED`: CI phải strict mặc định; không được lấy `CI_INTEGRATION_STRICT` từ secret tùy chọn. | Audit verdict PASS nhưng `.github/workflows/ci.yml` truyền `CI_INTEGRATION_STRICT: ${{ secrets.CI_INTEGRATION_STRICT }}`; khi secret chưa có, `integration-preflight.mjs` in `ENV_BLOCKED` rồi exit 0, khiến GitHub job xanh. Mâu thuẫn DEC-05/RQ-06: trạng thái blocked không được trình bày như PASS. | Giữ spec v1.0. Round 2 chỉ: đặt strict unconditionally trong CI (ví dụ env literal `CI_INTEGRATION_STRICT: '1'` hoặc tương đương); thiếu `DATABASE_URL_TEST` phải in `ENV_BLOCKED` và job exit non-zero; local không strict vẫn có thể exit 0. Bổ sung controlled workflow-context evidence. | Tier 2 sửa workflow/evidence; Tier 3 re-audit AC-02/06. |
| `1` | `BLK-01` HANDOFF (co-mingled diff) | `ACCEPT` implementation nhưng khóa commit hygiene. | Hunk type-only ở `security-matrix.integration.test.ts` thuộc G0-04; describe-block RLS structural guard là thay đổi Phase-5 có sẵn trước task. Không được stage cả file mù quáng vào commit G0-04. | Không đổi contract. Tier 2 phải tách/stage đúng hunk hoặc báo sếp commit Phase-5 trước; cấm reset/revert block của user. | Tier 2 + sếp trước handoff round 2. |
| `1` | `AUDIT-ROUND-1` | `DEFER ACCEPTANCE` dù validator/audit PASS. | 9/9 AC được Tier 3 đánh PASS và quality lane xanh, nhưng PLN-01 là P1 gate semantics bị audit bỏ sót; Tier 1 giữ quyền REVISION theo Resolve Protocol. | Task chưa ACCEPTED; chỉ re-audit phần strict gate và scope hygiene, không chạy lại toàn bộ nếu không có diff khác. | Tier 3 audit round 2. |
| `1 + sếp waiver` | `PLN-01` closure | `ACCEPT_FIX`: strict CI đã được sửa và kiểm chứng. | `.github/workflows/ci.yml` dùng literal `CI_INTEGRATION_STRICT: '1'`; controlled checks: local thiếu secret → `ENV_BLOCKED` exit 0, CI strict thiếu secret → `ENV_BLOCKED` exit 1, YAML parse exit 0 và không còn strict secret reference. | Không đổi contract/spec. | Đóng bởi Tier 1 theo ủy quyền trực tiếp của sếp; không gọi Tier 2/Tier 3 round 2. |
| `1 + sếp waiver` | `PLN-02` (LIVE lane opt-in) | `ACCEPT_FIX`: integration config tự bật MP-2 LIVE khi có admin test URL đã qua preflight. | Trước fix, 15 MP-2 LIVE tests bị skip dù safe admin URL tồn tại. Sau fix, targeted integration trên Neon test branch: 2 files, 23/23 tests PASS, gồm role/function/grant/RLS/idempotency/concurrency/projection thật. | `vitest.integration.config.ts` set `MP2_LIVE_SECURITY_CHECK='1'` chỉ khi `DATABASE_URL_ADMIN_TEST` có giá trị. | Đóng bởi Tier 1 theo sếp waiver. |
| `1 + sếp waiver` | `FOUNDER-WAIVER-01` | `ACCEPTED` không re-audit round 2. | Sếp đích danh cho phép Tier 1 tự xử lý nốt, bỏ vòng Tier 2/Tier 3. Existing independent audit round 1 đã PASS 9/9 AC; diff sau audit chỉ gồm strict literal + LIVE opt-in. Tier 1 verify: typecheck exit 0; unit 37 files/470 tests PASS; targeted MP-2 LIVE 23/23 PASS; controlled strict checks đúng exit 0/1. | Status → `ACCEPTED`. Waiver chỉ áp dụng round 2 của task này, không thay quy trình mặc định task sau. | Sếp/Tier 1 đóng task. |
| `1 + sếp waiver` | `OBS-G0-04-01` | `DEFER` DB baseline failure sang G0-01/G0-02. | Full integration lane chạy thật và đỏ tại staffing permission lookup vì test DB branch thiếu baseline `RolePermission`; runner propagate failure đúng contract. Không skip/che lỗi trong G0-04. | Không đổi CI. G0 DB baseline/seed task phải dựng schema+permission pool test DB trước khi yêu cầu full integration xanh. | Tier 1 lập task G0-01/G0-02 follow-up; chặn full integration green, không chặn nghiệm thu hạ tầng G0-04. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-24` | Contract ban đầu cho G0-04/RF-05: CI quality, type/lint debt closure, unit/integration separation và test-DB fail-closed. | V5.3 G0 debt gate trước MP-3; baseline `76096b7`. |
| `v1.0` | `2026-08-24` | Resolve audit round 1: giữ spec, mở execution round 2 hẹp vì CI `ENV_BLOCKED` đang có thể xanh khi strict secret chưa tồn tại; thêm commit-hygiene resolution cho diff co-mingle. | Audit round 1 PASS + Planner spot-check PLN-01. |
| `v1.0` | `2026-08-24` | Sếp waiver Tier 2/Tier 3 round 2; Tier 1 sửa strict CI + MP-2 LIVE opt-in, chạy controlled/LIVE/unit/type verification và đóng `ACCEPTED`; DB permission baseline failure defer G0-01/G0-02. | Direct user authorization + existing audit round 1 PASS + evidence trong Planner Resolution. |
