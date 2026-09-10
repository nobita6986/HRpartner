# TASK — `hrp-v6-fix-ci-prisma-validate`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-fix-ci-prisma-validate` |
| Work type | `INFRA` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Single-step CI infrastructure fix, scope = ci.yml + prisma/schema.prisma binaryTargets; no business logic change. Fast lane NONE: dev/test runtime đã verified locally (prisma validate PASS), chỉ CI runner mới fail → LOW risk acceptance. Người chấp nhận rủi ro: Tier 1 (chờ Tier 0 confirm).` |
| Spec version | `v0.1 DRAFT` |
| Status | `DRAFT` |
| Planner | `Tier 1` |
| Baseline | `918e2ee` (last green-equivalent push; CI #146 fail từ `8c6fd03`) |
| In-scope roots | `.github/workflows/ci.yml`, `prisma/schema.prisma`, `package.json` (nếu cần pin prisma version) |
| Forbidden paths | `app/**`, `src/**`, `prisma/migrations/**`, `prisma/seed.mjs`, `.env*`, `docs/V7/**`, `docs/tasks/hrp-v6-ui-04*` |
| Required gates | `pnpm prisma:generate`, `npx prisma validate`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`; CI workflow re-run |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `TIER_0_DECISION` (Tier 0 chốt: thực thi vs defer vs close) |

> Tier 0 có thể cancel task này nếu chọn defer CI fix sang go-live hardening phase. Đây là task DRAFT chờ Tier 0, không push độc lập.

## 1. Outcome

### 1.1 User-visible outcome

- GitHub Actions CI workflow (`.github/workflows/ci.yml`) chạy **PASS xanh** trên `main` và trên PRs.
- Bước `Prisma schema validate` không còn fail vì binary engine / runtime mismatch.

### 1.2 Non-goals

- KHÔNG đổi `prisma/schema.prisma` models, relations, indexes, generators (chỉ `binaryTargets` nếu root cause).
- KHÔNG migrate dữ liệu production (`neondb` / `hrp-live`).
- KHÔNG thay đổi `test:integration` logic, `DATABASE_URL_TEST` secrets, hoặc integration test scripts.
- KHÔNG nâng Prisma major version (5.x → 6.x); nếu cần, mở task riêng.
- KHÔNG thay đổi `test:unit` / `vitest.unit.config.ts` / build pipeline ngoài ci.yml.
- KHÔNG đụng UI source, business logic, hay các task UI04 đã ACCEPTED.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | GitHub Actions run #146 (commit `918e2ee`) FAIL ở `Prisma schema validate` step | Xác nhận CI fail là thật, không phải flake |
| `EV-02` | GitHub Actions runs trước đó (từ `8c6fd03`, `0e0320b`) cùng FAIL pre-existing | Loại trừ regression do UI04 round |
| `EV-03` | Local `npx prisma validate` PASS tại HEAD `918e2ee` | Cho thấy schema hợp lệ, vấn đề CI-specific |
| `EV-04` | `package.json`: `prisma: ^5.22.0`, `@prisma/client: ^5.22.0` | Phiên bản Prisma hiện tại |
| `EV-05` | `.github/workflows/ci.yml` line 39: `node-version: '22'`; line 46-47: `Prisma generate` + `Prisma schema validate` | CI dùng Node 22 + Prisma 5.22.0 |
| `EV-06` | `prisma/schema.prisma` generator block (cần đọc để xem `binaryTargets` hiện tại) | Root cause nghi vấn: thiếu `binaryTargets = ["native", "rhel-openssl-3.0.x"]` cho GitHub Actions runner |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Sửa bằng `binaryTargets` (khuyến nghị) thay vì nâng Prisma major | `REJECTED` (root cause KHÔNG phải binaryTargets; investigation 11/09/2026 cho thấy Quality job fail ở `prisma validate` vì thiếu `DATABASE_URL_ADMIN`) |
| `DEC-02` | Giữ Node 22 trong CI (đã là LTS-compat với Next.js hiện tại) | `PROPOSED` (Tier 0 chốt) |
| `DEC-03` | Nếu `binaryTargets` không đủ, fallback: pin Prisma xuống `5.22.0` exact (bỏ `^`) | `REJECTED` (root cause không liên quan Prisma version) |
| `DEC-04` | Nếu vẫn fail: dùng `prisma generate --no-engine` + `prisma validate --schema=...` | `REJECTED` |
| `DEC-05` | Tier 0 quyết thực thi task hay defer sang go-live hardening phase | `OWNER_DECIDED` (Owner chốt: thực thi ngay 11/09/2026 00:36) |
| `DEC-06` | Root cause = schema.prisma:30 có `directUrl = env("DATABASE_URL_ADMIN")` nhưng CI Quality job chỉ set `DATABASE_URL`. Fix: thêm `DATABASE_URL_ADMIN` dummy vào env block (cùng pattern với `DATABASE_URL`, sentinel `postgresql://ci:ci@localhost:5432/ci_dummy`) | `TIER_1_RESOLVED` (verified qua gh run view run #34509107196 Quality job step 6; local `npx prisma validate` PASS sau fix) |
| `DEC-07` | Integration job ENV_BLOCKED (`DATABASE_URL_TEST` thiếu) là **expected** theo RQ-07/G0-04 fail-closed sentinel — không fix, không phải regression | `ACCEPTED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `npx prisma validate` exit 0 trong GitHub Actions runner (Ubuntu latest, Node 22) |
| `RQ-02` | `prisma:generate` exit 0 trong cùng runner |
| `RQ-03` | Local `pnpm typecheck` + `pnpm test:unit` + `pnpm build` vẫn PASS |
| `RQ-04` | Không đổi `prisma/schema.prisma` models/relations/migrations |
| `RQ-05` | Nếu đổi `prisma/schema.prisma` generator: chỉ thêm `binaryTargets`; KHÔNG đổi `provider = "prisma-client-js"` |
| `RQ-06` | CI workflow re-run trên HEAD `918e2ee` (hoặc commit mới nhất) PASS toàn bộ Quality + Integration jobs (Integration có thể vẫn ENV_BLOCKED nếu chưa có `DATABASE_URL_TEST` secret — đây là expected, không phải fail) |
| `RQ-07` | Commit path-scoped: chỉ `.github/workflows/ci.yml`, `prisma/schema.prisma`, `package.json` (nếu cần) |

### 4.2 Scope boundaries

- **In:**
  - `.github/workflows/ci.yml` (nếu cần bump Node hoặc thêm env var)
  - `prisma/schema.prisma` generator block (chỉ `binaryTargets` nếu áp dụng)
  - `package.json` (chỉ pin exact version nếu fallback)
- **Out:**
  - UI source, business logic, schema models, migrations
  - `prisma/seed.mjs`, `.env*`, secrets
  - Các task UI04 ACCEPTED (`hrp-v6-ui-04c1`, `hrp-v6-ui-04c2`)
  - `docs/V7/**` archive
  - `docs/PLANNER_HANDOVER.md` (Tier 1 cập nhật sau khi ACCEPTED)
- **Allowed task artifacts:** `docs/tasks/hrp-v6-fix-ci-prisma-validate/**`

### 4.3 Domain boundaries

- **Data/state:** N/A — không đụng data
- **Permission/security:** N/A — CI infra thuần, không đụng permission model
- **Interface/API:** N/A
- **Migration/rollback:** N/A — không migration mới, không rollback plan cần (nếu fix binaryTargets thì git revert đủ)

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `prisma/schema.prisma` generator block | Đọc hiện trạng `binaryTargets`; xác định root cause bằng `npx prisma -v` + check Prisma 5.22 binary cho Node 22 + Linux x64 | `EV-06` | Nếu root cause khác binaryTargets (vd Prisma client bug), STOP và escalate Tier 0 |
| `STEP-02` | `prisma/schema.prisma` generator block | Nếu root cause là binaryTargets: thêm `binaryTargets = ["native", "rhel-openssl-3.0.x"]` (hoặc tuỳ Prisma 5.22 docs) | Local `npx prisma validate` + `npx prisma generate` exit 0 | Nếu vẫn fail, chuyển `STEP-03` |
| `STEP-03` | `package.json` (fallback) | Pin `prisma` + `@prisma/client` exact `5.22.0` (bỏ `^`); chạy `pnpm install` + `npx prisma validate` | Local PASS | Nếu vẫn fail, STOP và escalate Tier 0 |
| `STEP-04` | GitHub Actions | Push commit path-scoped lên branch `tier1/fix-ci-prisma-validate-worktree` (KHÔNG push `main`); trigger workflow re-run; monitor logs | Workflow run exit 0 ở `Prisma schema validate` step | Nếu vẫn fail, STOP và escalate Tier 0 |
| `STEP-05` | `docs/tasks/hrp-v6-fix-ci-prisma-validate/HANDOFF.md` | Document root cause, fix áp dụng, CI run URL PASS, evidence files | `verify-handoff.ps1` PASS | — |
| `STEP-06` | `docs/PLANNER_HANDOVER.md` ROADMAP_CURSOR | Append note: CI infra fixed, link tới HANDOFF, ACCEPTED task | YAML valid | — |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | GitHub Actions run mới nhất trên branch fix-worktree PASS ở `Prisma schema validate` step | GitHub Actions UI: ✅ xanh step |
| `AC-02` | Local `npx prisma validate` exit 0 | Shell |
| `AC-03` | Local `pnpm typecheck` exit 0 | Shell |
| `AC-04` | Local `pnpm test:unit` exit 0 | Shell |
| `AC-05` | Local `pnpm build` exit 0 | Shell |
| `AC-06` | Diff scope chỉ trong `In-scope roots` (allowlist 3 files) | `git diff --name-only <baseline>..HEAD` |
| `AC-07` | CI workflow file vẫn giữ `node-version: '22'` (hoặc Tier 0 chốt bump khác) | Diff inspection |
| `AC-08` | Không có schema model/relation thay đổi (chỉ generator block nếu áp dụng) | `git diff prisma/schema.prisma` |
| `AC-09` | `verify-handoff.ps1` PASS | Shell |
| `AC-10` | HANDOFF.md ghi rõ root cause + fix + CI run URL PASS | Manual review |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-04` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-01`, `AC-02` |
| `RQ-03` | `STEP-04` | `AC-03`, `AC-04`, `AC-05` |
| `RQ-04` | `STEP-02`, `STEP-08` (verify) | `AC-08` |
| `RQ-05` | `STEP-02` | `AC-08` |
| `RQ-06` | `STEP-04` | `AC-01` |
| `RQ-07` | `STEP-04` | `AC-06` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Root cause không phải binaryTargets (vd Prisma 5.22 + Node 22 incompatibility khác) | STOP tại STEP-01; escalate Tier 0; rollback bằng `git revert` |
| `RISK-02` | Pin Prisma exact version phá vỡ dev environment khác | Chỉ áp dụng nếu STEP-02 fail; document trong HANDOFF |
| `RISK-03` | CI vẫn fail sau fix | Revert commit; mở task CRITICAL lane riêng; KHÔNG tiếp tục trial-and-error |
| `RISK-04` | Tier 0 cancel task (chọn defer) | Tier 1 đóng task với status `CANCELLED`, ghi note vào PLANNER_HANDOVER |

## 8. Open Questions

- Q1: Tier 0 chốt phương án nào — (a) `binaryTargets`, (b) pin exact Prisma, (c) defer sang go-live hardening, (d) cancel task? **[TIER_0_DECISION]**
- Q2: Nếu áp dụng `binaryTargets`, có cần kèm `--engine-type=binary` hay `--engine-type=library` không? **[STEP-01 decide]**
- Q3: Branch fix-worktree push lên remote hay chỉ local + manual trigger `workflow_dispatch`? **[Tier 0 chốt — Tier 1 recommend: push branch + open PR để CI matrix rõ ràng]**

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| R0 | Tier 1 init DRAFT | Owner yêu cầu "làm luôn" task fix-ci 11/09/2026 00:36 |
| R1 | Root cause identified = `DATABASE_URL_ADMIN` env missing in Quality job | `gh run view run #34509107196 job Quality step 6` log: `Error code: P1012 error: Environment variable not found: DATABASE_URL_ADMIN --> prisma/schema.prisma:30` |
| R1 | Fix applied = thêm `DATABASE_URL_ADMIN: postgresql://ci:ci@localhost:5432/ci_dummy` vào Quality job env (cùng sentinel pattern với DATABASE_URL) | Path-scoped `.github/workflows/ci.yml` chỉ, 5 dòng thêm, 1 file diff |
| R1 | Integration job ENV_BLOCKED giữ nguyên | Đây là expected behavior theo RQ-07 fail-closed sentinel (cần DATABASE_URL_TEST secret, chưa có) |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial DRAFT chờ Tier 0 quyết định | Pre-existing CI fail từ `8c6fd03`, Tier 1 đề xuất fix infrastructure thay vì defer vô thời hạn |
