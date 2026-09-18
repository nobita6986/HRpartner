# TASK — hrp-v7-ci-container-db

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v7-ci-container-db` |
| Work type | `INFRA` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Đụng CI gate + posture DB (RLS/role provisioning). Sai posture = test pass trên container mà production fail khi deploy. Tier 3 phải independently verify (a) container DB reproduce đúng role/RLS từ baseline Neon, (b) fail-closed semantics còn nguyên, (c) không regression ở required check name + concurrency + fork guard. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `df68529fdd89a81952418fc16556823da6576ac4` (origin/main AFTER path-filter PR #13 merged) |
| In-scope roots | `.github/workflows/ci.yml, scripts/ci/container-test-db.mjs (NEW), docs/tasks/hrp-v7-ci-container-db/**` |
| Forbidden paths | `prisma/**, src/**, app/**, tests/**, scripts/** (except ci/container-test-db.mjs), package.json, package-lock.json, vitest.*.ts, .ai-pipeline/**, any other workflow file, branch-protection API, Neon test DB secrets (owner-managed; Tier 1 không đụng), .env* thật, Neon DB schema/data, *.test.ts / *.static.test.ts ngoài evidence self-test của task` |
| Required gates | `verify-task.ps1, verify-handoff.ps1, git diff --check, structural yaml-check (12 assertions) similar to path-filter, container-test-db.mjs self-test (3 fixtures: writer-only grant, admin-bypass, RLS-in-force)` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver → /audit → /resolve` |

---

## 1. Outcome

### 1.1 User-visible outcome
- PR (push to main or fork-allowed same-repo PR) → Integration job dùng **PostgreSQL service container** chạy trên chính runner (postgres:16), không còn truy cập Neon Singapore dedicated test DB.
- Integration runtime giảm từ **~15-20 phút** (Neon latency) xuống **~2-4 phút** (container local).
- Posture RLS/role trên container **khớp Neon hiện tại** (`app_user_writer` + `app_user` + `hrp_etl` + `hrp_public_rpc` + engine role `app_engine_writer` provisioned by N2-1 migration; 13-role matrix; m1-06a/07a, E-01..E-17 engine tests vẫn GREEN).
- Local dev (`DATABASE_URL_TEST` Neon) và local prod (`DATABASE_URL` Neon) **không đụng**.
- Concurrency `hrpartner-dedicated-integration-db` **giữ nguyên** trong PR này (T0 chốt: chỉ gỡ sau khi chứng minh song song an toàn).

### 1.2 Non-goals
- KHÔNG đổi container engine từ postgres:16 → RDS / external (out of scope, chỉ chạm gate CI).
- KHÔNG dùng test-containers Go service (heavy image); dùng native `services: postgres` của GitHub Actions.
- KHÔNG gỡ concurrency trong PR này (T0 defer).
- KHÔNG viết `AUDIT.md` (T3 viết).
- KHÔNG merge.

---

## 2. Evidence (pre-implementation discovery)

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `prisma/migrations/` glob = **39 migration files** (count verified via `rg -l 'CREATE ROLE\|CREATE USER' prisma/migrations/**`): only ONE migration creates roles (`20260917000000_referral_attribution_foundation/migration.sql` line 116: `CREATE ROLE app_engine_writer LOGIN NOINHERIT`). | Container CẦN chạy migration này để có `app_engine_writer` tồn tại; nếu không → E-14 test (`current_user=app_engine_writer`) fail. |
| `EV-02` | `scripts/run-bootstrap-roles.mjs:39-118` chỉ chạm Postgres role bằng **node script + admin connect** (KHÔNG phải Prisma migration) — tạo `app_user_writer`, `app_user`, `hrp_etl` + grants + default privileges. Đặc trưng: `PIPE_ROLE_WRITER_PASSWORD/READER_PASSWORD/ETL_PASSWORD` env vars là secret của Neon dev. | 5 roles NHỎ HƠN (`app_user_writer`, `app_user`, `hrp_etl`) provisioned NGOÀI migration bằng admin script. Trong container, ta sẽ dùng biến POSTGRES_PASSWORD để bootstrap các role này idempotent ngay trên admin password → tránh "hand-setup ngoài migration" giữa local Neon vs container. |
| `EV-03` | `scripts/create-db-roles.cjs` provisions 4 NOLOGIN roles (`worker_user`, `vendor_user`, `ctv_user`, `sale_user`) — KHÔNG provisioning PASSWORD, KHÔNG thuộc runtime URI. Đây là role cho `SET ROLE` trong RLS posture closure. Comment: "DATABASE_URL_ADMIN (superuser, bypasses RLS) — secret sếp giữ". | 4 NOLOGIN roles cũng được tạo NGOÀI migration. Container cần recreate chúng idempotent. |
| `EV-04` | `scripts/create-public-rpc-role.cjs:30-90` provisions role `hrp_public_rpc` (NOLOGIN BYPASSRLS) NGOÀI migration. Migration `20260823101500_mp2_apply_tracking/migration.sql:236-238` chỉ GRANT CREATE cho schema, KHÔNG CREATE ROLE (DEC-09 explicit). | `hrp_public_rpc` cũng provisioned NGOÀI migration. Container CẦN tạo role này trước khi chạy migration `20260823101500` (nếu không GRANT CREATE fail). |
| `EV-05` | `prisma/migrations/20260917000000_referral_attribution_foundation/migration.sql` (singleton — line 116) là migration DUY NHẤT tạo role runtime (`app_engine_writer`); có contract check block lines 145-205 asserts role shape (`NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`). | Cho container: chỉ cần `prisma migrate deploy` chạy TẤT CẢ migration thì role này sẽ tồn tại với posture đúng. Nếu có migration khác cũng CREATE ROLE mà tier 1 chưa thấy → tier 1 sẽ bị lệch posture. |
| `EV-06` | `scripts/verify-rls-phase5.cjs`, `tests/db/referral-attribution-foundation.integration.test.ts:30-46` (E-14..E-17) — engine test nhận `HRPARTNER_ENGINE_URL` từ env HOẶC tự sinh ephemeral password bằng `ALTER ROLE app_engine_writer WITH PASSWORD 'xxx'` qua admin URL, rồi swap URL để derive `HRPARTNER_ENGINE_URL`. | Đây là cách container CÓ THỂ chạy engine test: `DATABASE_URL_ADMIN_TEST` map sang admin (postgres user) → engine test internally call `ALTER ROLE app_engine_writer WITH PASSWORD` → set `HRPARTNER_ENGINE_URL` = `DATABASE_URL_ADMIN_TEST` với username swapped + password ephemeral. KHÔNG cần secret ngoài. |
| `EV-07` | `prisma/schema.prisma:30-32` — `datasource db { url = env("DATABASE_URL"); directUrl = env("DATABASE_URL_ADMIN") }` — `directUrl` chỉ dùng cho `prisma migrate` DDL/admin ops; runtime Prisma client đọc `DATABASE_URL`. `vitest.integration.config.ts:30-50` map `DATABASE_URL_TEST → DATABASE_URL`, `DATABASE_URL_ADMIN_TEST → DATABASE_URL_ADMIN`, `DATABASE_URL_TEST → DATABASE_URL_WRITER`, `DATABASE_URL_TEST → DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST → DATABASE_URL_ADMIN_TEST`, `MP*_LIVE_*_CHECK=1` nếu admin URL present. | Container phải set 4 env vars (DATABASE_URL_TEST, DATABASE_URL_ADMIN_TEST + runner-derived DATABASE_URL, DATABASE_URL_ADMIN) đúng schema. `directUrl` → admin role; runtime pool → writer role. Brief invariant #3 yêu cầu cùng host+port+db, KHÁC role. |
| `EV-08` | `.github/workflows/ci.yml:55-90` Integration job — không có `services:` trước PR này; hiện dùng secrets `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` để dial Neon; concurrency group `hrpartner-dedicated-integration-db` `cancel-in-progress: false`; fork guard; `CI_INTEGRATION_STRICT=1`; preflight guard. | Container thay thế phần dial: thêm `services: postgres: image: postgres:16 env: POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB`; bỏ 2 secrets khỏi Integration job env; set 2 URL từ `${{ job.services.postgres.ports[5432] }}` + env literals. |
| `EV-09` | `prisma/grants-hrp-m12.1.1.sql` (idempotent, plain SQL) cấp `app_user_writer` USAGE+SELECT/INSERT/UPDATE/DELETE trên schema public + sequences + default privileges. `scripts/apply-grants-hrp-m12.1.1.mjs` chạy nó bằng admin. Idempotent: chạy lại OK. | Container có thể apply file này idempotent 1 LẦN sau migration. Thay cho việc build lại `run-bootstrap-roles.mjs` (file đó cũng chạm `hrp_etl` NOLOGIN-scoped nhưng 1 phần grants không idempotent đầy đủ). |
| `EV-10` | `prisma/migrations/20260824161500_g0_schema_reconcile/migration.sql:36-47` chú thích: *"Runtime grants are conditional because clean CI databases may provision roles after schema deployment. The role bootstrap script repeats these idempotently."* | Migration đã được thiết kế idempotent cho roles post-schema. Container tận dụng điều này: tạo role → chạy migration → apply grants idempotent. |
| `EV-11` | `vitest.integration.config.ts:55-59` `fileParallelism: false` — 20 file share MỘT schema (1 worker process, 1 connection pool per role). | Container = 1 process pool per Integration job → không có concurrency cross-DB ngay cả khi nhiều PR song song (mỗi PR có container riêng). Concurrency group giữ vì chưa chứng minh an toàn khi shared-secret fallback removed. |
| `EV-12` | `docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/HANDOFF.md` task đã merge (PR #10) — E-01..E-19 GREEN trên Neon dev. Container sẽ chạy lại E-01..E-19 để prove posture match. Báo cáo duration trước (Neon) vs sau (container). | Single source of truth "posture Neon" → so sánh bằng E-01..E-17 GREEN hoặc xanh tương đương. |
| `EV-13` | `dev`: `.env` vẫn dùng `DATABASE_URL` Neon (sếp cung cấp) — KHÔNG bị PR này đụng; container CHỈ chạy trong CI job env, không xuất hiện ở local. | Invariant #6 local flow KHÔNG đổi. |

### 2.1 Risk assessment per DISCOVERY
| Risky condition (brief STOP-AND-REPORT) | Status | Why |
|---|---|---|
| Role/privilege setup TAY trên Neon NGOÀI migration | **Mitigated, không phải STOP**: 3 role provisioning scripts (run-bootstrap-roles, create-db-roles, create-public-rpc-role) đều nằm trong `scripts/` của repo (KHÔNG phải hand trên Neon console). Container reproduce được 100% bằng cách apply tương tự. 1 role `app_engine_writer` tạo bởi migration; 3 scripts tạo 7 roles (`app_user_writer`, `app_user`, `hrp_etl` + 4 NOLOGIN + `hrp_public_rpc`). Nếu thiếu một trong 8 role (`app_user_writer`, `app_user`, `hrp_etl`, `worker_user`, `vendor_user`, `ctv_user`, `sale_user`, `hrp_public_rpc`, `app_engine_writer`) trên Neon mà KHÔNG nằm trong scripts/migrations này → Tier 1 STOP. | Tier 1 đã khảo sát kỹ scripts/ + migrations/ → 0 role bị hand-setup ngoài repo. |
| Container KHÔNG reproduce được posture | Mitigated bằng cách: roles + grants + extensions match Postgres Neon semantics (extensions: container postgres:16 đã có `pgcrypto`, không cần pg_stat_statements; nếu migration nào enable extension mà container thiếu → `prisma migrate deploy` sẽ fail loudly và HIỂN thị lỗi thiếu extension — fail-closed). | |
| Cần đổi migration/schema để ép container | NONE: container chỉ chạy migrate deploy sẵn. | |
| Không chắc gỡ concurrency | T0 directive: `giữ nguyên`. | |

---

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | **Container chạy mọi Integration job trong CI, không fallback Neon secrets** — brief đã chốt "container" là goal. Neon secrets vẫn còn trong repo secrets nhưng Integration job sẽ KHÔNG đọc (set explicit DATABASE_URL_TEST/_ADMIN_TEST từ `services.postgres`). Local developer flow `DATABASE_URL_TEST` Neon vẫn nguyên (brief invariant #6). | `CHOSEN` |
| `DEC-02` | **Image = `postgres:16-alpine`** (alpine variant ~80MB; production Neon vẫn 16.x → match về major version; không dùng 17 vì một số role posture check hoặc extension có thể drift). | `CHOSEN` |
| `DEC-03` | **Container env: `POSTGRES_USER=ci`, `POSTGRES_PASSWORD=ci`, `POSTGRES_DB=ci_test`, `POSTGRES_INITDB_ARGS=--auth-local=trust`** cho localhost service dial trong job — KHÔNG phải secret thật (container chỉ tồn tại trong job lifetime, sandbox nội bộ runner). Admin = user `postgres` (default superuser), password = `POSTGRES_PASSWORD=ci`. | `CHOSEN` |
| `DEC-04` | **Bootstrap roles bằng inline node script `scripts/ci/container-test-db.mjs`** (KHÔNG phải bash, để reuse `pg` lib sẵn có). Split thành 2 phase: `--phase=pre` (chạy TRƯỚC `prisma migrate deploy`) tạo 8 roles + 11 schema-level + ALL TABLES + DEFAULT PRIVILEGES grants; `--phase=post` (chạy SAU migrate) apply 1 table-level grant cho `portal_timesheets`. Script idempotent ở cả 2 phase. **`prisma migrate deploy` chạy qua step riêng trong ci.yml với `npx prisma migrate deploy`** (KHÔNG thêm npm script mới). | `CHOSEN` |
| `DEC-05` | **8 roles trên container, split 2 phase**: (i) 2 roles từ migration: `app_engine_writer` (existing from N2-1 migration); (ii) 3 roles từ `run-bootstrap-roles.mjs`: `app_user_writer`, `app_user`, `hrp_etl`; (iii) 4 roles từ `create-db-roles.cjs`: `worker_user`, `vendor_user`, `ctv_user`, `sale_user` (NOLOGIN); (iv) 1 role từ `create-public-rpc-role.cjs`: `hrp_public_rpc` (NOLOGIN BYPASSRLS). PRE phase = schema-level + ALL TABLES + DEFAULT PRIVILEGES + USAGE for 4 NOLOGIN roles (11 grants); POST phase = 1 table-level grant cho `portal_timesheets` wrapped in DO $$ IF EXISTS (idempotent nếu table chưa có). | `CHOSEN` |
| `DEC-06` | **`DATABASE_URL` & `DATABASE_URL_ADMIN` env mapping** (vitest.integration.config.ts consumer): `DATABASE_URL_TEST` = `postgresql://app_user_writer:ci@localhost:5432/ci_test`, `DATABASE_URL_ADMIN_TEST` = `postgresql://postgres:ci@localhost:5432/ci_test`. Cùng host, port, db; KHÁC role (writer=RUNTIME, admin=OWNER/SUPERUSER). Preflight sẽ pass guard (same host+port+db, role distinction). | `CHOSEN` |
| `DEC-07` | **Concurrency `hrpartner-dedicated-integration-db` GIỮ NGUYÊN** trong PR này (T0 directive: "đừng gỡ vội"). Container vẫn share latency pattern của secret-based flow → concurrency group vẫn là "no concurrent runs" safety net. Tier 1 sẽ đề xuất follow-up PR để remove concurrency SAU khi verify song song an toàn (EVIDENCE bắt buộc: 2 PR chạy song song không conflict DB). | `CHOSEN` |
| `DEC-08` | **OPTIONAL: `services.postgres` health check** — `options: --health-cmd "pg_isready"` + `interval: 5s` + `timeout: 5s` + `retries: 10`. Đảm bảo step `Wait for postgres` không cần retry manually. | `CHOSEN` |
| `DEC-09` | **Giữ nguyên fork guard + `CI_INTEGRATION_STRICT=1` + fileParallelism: false** (brief invariants #4 #5). | `CHOSEN` |
| `DEC-10` | **Fail-closed vẫn ENFORCED**: nếu role/grant setup fail → script exit nonzero → Integration step fail → job fail → required check FAIL → đỏ như cũ. KHÔNG silently skip. | `CHOSEN` |
| `DEC-11` | **TASK/HANDOFF format giữ chuẩn path-filter** (CRITICAL/LIGHT, baseline evidence, E-01.. gates, RQ/AC table, Risk register). | `CHOSEN` |

---

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `.github/workflows/ci.yml` Integration job thêm `services: postgres: image: postgres:16-alpine env: {POSTGRES_USER: ci, POSTGRES_PASSWORD: ci, POSTGRES_DB: ci_test}` + `options: --health-cmd "pg_isready -U postgres -d ci_test" --health-interval 5s --health-timeout 5s --health-retries 10`. |
| `RQ-02` | Thêm step `Wait for postgres ready` (`pg_isready` loop, exit 0 khi OK, max 30s). |
| `RQ-03` | Thêm 2 step bootstrap để split grants theo phase: `Bootstrap roles + pre-migrate grants` (chạy `node scripts/ci/container-test-db.mjs --phase=pre` tạo 8 roles + 11 schema-level + ALL TABLES + DEFAULT PRIVILEGES grants) sau khi postgres ready; `Bootstrap post-migrate grants` (chạy `node scripts/ci/container-test-db.mjs --phase=post` apply 1 table-level grant cho `portal_timesheets`) sau `prisma migrate status`. Lý do split: (a) migration `20260816210000_s1_rls_worker` GRANT to `app_user_writer` cần role tồn tại trước; (b) `portal_timesheets` GRANT cần table tồn tại. Cả 2 step exit nonzero → fail-closed. |
| `RQ-04` | Thay 2 secret env (`DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST` từ Neon) bằng 2 inline literal env mới: `DATABASE_URL_TEST = postgresql://app_user_writer:ci@localhost:5432/ci_test`, `DATABASE_URL_ADMIN_TEST = postgresql://postgres:ci@localhost:5432/ci_test`. |
| `RQ-05` | Thêm step `prisma migrate deploy` chạy với `DATABASE_URL = DATABASE_URL_ADMIN_TEST` + `DIRECT_URL` (Prisma tự rút từ schema.prisma directUrl) → DDL apply. Chạy TRƯỚC bootstrap để tables có sẵn cho table-level GRANTs. |
| `RQ-06` | Preflight test guard giữ nguyên (cùng host+port+db, khác role, không protected match) — không thay đổi `scripts/ci/integration-preflight.mjs`. |
| `RQ-07` | `CI_INTEGRATION_STRICT=1` + `fileParallelism: false` + Concurrency `hrpartner-dedicated-integration-db` + `cancel-in-progress: false` GIỮ NGUYÊN. |
| `RQ-08` | Fork guard `if:` condition GIỮ NGUYÊN. |
| `RQ-09` | Job name + steps name GIỮ NGUYÊN (Quality + Integration names match branch protection pin). |
| `RQ-10` | Path-filter (PR #13) GIỮ NGUYÊN — step `Detect changed paths` cho docs-only PR short-circuit vẫn hoạt động. Container áp dụng SAU path-filter (vẫn chạy `npm run test:integration` nếu RUN branch). |
| `RQ-11` | `scripts/ci/container-test-db.mjs` tạo roles idempotent: 8 roles (`app_user_writer`, `app_user`, `hrp_etl`, `worker_user`, `vendor_user`, `ctv_user`, `sale_user`, `hrp_public_rpc`); idempotent password set + grants + `prisma/grants-hrp-m12.1.1.sql` apply. Exit 0 + in `READY role_count=N grants_count=M` summary khi xong. |
| `RQ-12` | Self-test script `scripts/ci/container-test-db.test.mjs` chạy với unit-mock Postgres (hoặc thiết kế tương đương) để verify idempotency: chạy 2 lần liên tiếp cùng setup → exit 0 cả 2 lần; chạy với roles đã có + grants đã có → không raise error. Self-test phải pass tại local CI (CI lane `npm run test:unit` MUST tolerate; không được tạo integration test file mới ngoài allowlist). |
| `RQ-13` | KHÔNG đụng path-filter logic, không đụng preflight, không đụng application code, không đụng Prisma schema, không đụng Neon secrets, không đụng local dev `.env`. |

### 4.2 Scope boundaries
- **In:** `.github/workflows/ci.yml`, `scripts/ci/container-test-db.mjs` (NEW), `docs/tasks/hrp-v7-ci-container-db/**` (TASK/HANDOFF/evidence).
- **Out:** `prisma/**`, `src/**`, `app/**`, `tests/**` (chỉ evidence self-test được phép nằm trong `docs/tasks/hrp-v7-ci-container-db/evidence/`), `scripts/**` ngoài `ci/container-test-db.mjs`, `package.json`, `vitest.*.ts`, `.ai-pipeline/**`, Neon secrets, Neon DB schema/data, `.env*` thật, branch protection API, *.test.ts / *.static.test.ts ngoài task folder.

### 4.3 Domain boundaries
- **Data/state:** Container postgres ephemeral — không persist ra ngoài job. Mỗi Integration run có dataset mới (migrate deploy from scratch).
- **Permission/security:** Roles provisioned với NOSUPERUSER NOBYPASSRLS đúng posture. RLS migration apply nguyên trạng. Fail-closed semantics (`CI_INTEGRATION_STRICT=1`, `ENV_BLOCKED`) GIỮ NGUYÊN.
- **Interface/API:** N/A — chỉ CI gate.
- **Migration/rollback:** rollback = `git revert COMMIT_SHA`. Container không tồn tại giữa các run → zero state leak.

---

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `scripts/ci/container-test-db.mjs` (NEW) | Tạo roles idempotent + apply grants + in summary. Idempotent: re-run safe. | self-test `npm run test:unit -- container-test-db.test.mjs` (note: test in evidence folder uses different filename to avoid integration-files allowlist drift) → 3 fixtures PASS | idempotent loop fail |
| `STEP-02` | `.github/workflows/ci.yml` Integration job | Thêm `services: postgres`, thay secrets, thêm 2 steps. | `git diff --check` empty + yaml-check structural 12 assertions (similar to path-filter) | YAML parse error / name đổi |
| `STEP-03` | TASK.md evidence table | Document: (a) full PRE-EXECUTION discovery EV-01..EV-13 (DONE above), (b) per-step post-execution evidence (Quality + Integration xanh; durations; posture match; fail-closed still active) | `verify-task.ps1 PASS`, `verify-handoff.ps1 PASS` | FAIL |
| `STEP-04` | HANDOFF.md | Full gate evidence + before/after duration + RLS test results + migrate status + 2-link mandatory URLs (PR + commits) | `verify-handoff.ps1 PASS` | FAIL |
| `STEP-05` | Delivery | `git diff --check`, verify-task, verify-handoff, commit, push, mở PR, báo T0 với full HEAD/PR/JOB IDs/durations/posture. | PR open, remote HEAD, Quality/Integration job IDs, durations recorded | PR fail |
| `STEP-06` | Concurrency removal (NOT in this PR) | Sau khi verified container ổn định + verify 2 PR chạy song song an toàn → đề xuất follow-up PR. KHÔNG LÀM trong PR này. | (deferred) | — |

---

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `.github/workflows/ci.yml` Integration job có `services: postgres: image: postgres:16-alpine` + healthcheck + env `POSTGRES_USER/PASSWORD/DB`. | `git diff origin/main..HEAD -- .github/workflows/ci.yml` review |
| `AC-02` | Step order đúng trong Integration job: `Wait for postgres` → `Bootstrap roles + pre-migrate grants` → `Prisma migrate deploy` → `Prisma migrate status` → `Bootstrap post-migrate grants` → `Integration tests`. | YAML review + yaml-check assertion `step order is wait -> pre-bootstrap -> migrate deploy -> migrate status -> post-bootstrap -> integration tests`. |
| `AC-03` | 2 step bootstrap đều chạy `node scripts/ci/container-test-db.mjs` với `--phase=pre` / `--phase=post` flag. | YAML review + yaml-check 2 assertions on phase args. |
| `AC-04` | Step `Prisma migrate deploy (directUrl = admin)` chạy với `DATABASE_URL = DATABASE_URL_ADMIN_TEST`. | YAML review + verify không còn secrets expose. |
| `AC-05` | 2 env literals (`DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST`) override Neon secrets — KHÔNG còn `secrets.DATABASE_URL_TEST` / `secrets.DATABASE_URL_ADMIN_TEST` trong Integration env block. | `git diff origin/main..HEAD -- .github/workflows/ci.yml` + `grep -n 'secrets.DATABASE_URL' .github/workflows/ci.yml` returns 0 matches. |
| `AC-06` | Preflight guard (`scripts/ci/integration-preflight.mjs`) KHÔNG thay đổi (cùng host+port+db, khác role). | `git diff origin/main..HEAD --stat -- scripts/ci/integration-preflight.mjs` shows 0 lines changed; `git status --porcelain scripts/ci/integration-preflight.mjs` empty. |
| `AC-07` | Concurrency group `hrpartner-dedicated-integration-db` + `cancel-in-progress: false` GIỮ NGUYÊN. | yaml-check assertion (see `evidence/yaml-check.mjs`) + `git diff origin/main..HEAD -- .github/workflows/ci.yml | grep -E 'group: hrpartner|cancel-in-progress'` shows zero deletion lines. |
| `AC-08` | Fork guard `if:` GIỮ NGUYÊN. | yaml-check assertion + `git diff origin/main..HEAD -- .github/workflows/ci.yml | grep -E 'head.repo.full_name'` shows zero deletion lines. |
| `AC-09` | Job names GIỮ NGUYÊN — `Quality (schema · typecheck · lint · unit · build)`, `Integration (DB tests · fail-closed)`. | yaml-check assertion + `git diff origin/main..HEAD -- .github/workflows/ci.yml | grep -E "name:"` shows zero deletion lines for the two display names. |
| `AC-10` | Path-filter (PR #13) GIỮ NGUYÊN — step `Detect changed paths` còn nguyên. | yaml-check assertion `Path-filter step present (id=path-filter)` + `git diff origin/main..HEAD -- .github/workflows/ci.yml | grep 'Detect changed paths'` shows zero deletion lines. |
| `AC-11` | `scripts/ci/container-test-db.mjs` tạo đủ 8 roles idempotent + apply grants. Self-test `npm run test:unit -- container-test-db.test.mjs` PASS 3/3. | `npm run test:unit` (tolerating new file outside integration-files allowlist). |
| `AC-12` | `git diff --check origin/main..HEAD` empty. | run |
| `AC-13` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v7-ci-container-db/TASK.md` PASS. | run |
| `AC-14` | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v7-ci-container-db/TASK.md` PASS. | run |
| `AC-15` | Diff confined to `.github/workflows/ci.yml`, `scripts/ci/container-test-db.mjs` (NEW), `docs/tasks/hrp-v7-ci-container-db/**`. | `git status --porcelain --untracked-files=normal` (read scope; shows untracked too) + `git diff --stat origin/main..HEAD` (diff list). |
| `AC-16` | **Live CI** trên PR này: Quality `success`; Integration `success`; chạy trên container; `prisma migrate deploy` exit 0; `npx prisma migrate status` (if available) reports `up-to-date`; RLS/role tests m1-06a/m1-07a/E-01..E-17 GREEN; Integration duration decreased đáng kể (concrete number báo T0). | `gh run view RUN_ID` + `gh api actions/jobs/JOB_ID/logs`. |
| `AC-17` | **Live fail-closed smoke**: tạo 1 commit giả có `DATABASE_URL` removed từ Integration env → Integration job reports `INTEGRATION_REFUSED` hoặc `ENV_BLOCKED` (NOT silently green). [Optional, time-permitting — defer otherwise per DEC-10]. | `gh run view RUN_ID` log. |
| `AC-18` | HANDOFF records: full remote HEAD SHA, PR number, Quality/Integration job IDs, before/after Integration durations, RLS test results (m1-06a, m1-07a, E-01..E-17), `prisma migrate status` text, brief posture summary. | HANDOFF.md inspection. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-02` | `AC-05` |
| `RQ-05` | `STEP-02` | `AC-04` |
| `RQ-06` | `STEP-02` | `AC-06` |
| `RQ-07` | `STEP-02` | `AC-07` |
| `RQ-08` | `STEP-02` | `AC-08` |
| `RQ-09` | `STEP-02` | `AC-09` |
| `RQ-10` | `STEP-02` | `AC-10` |
| `RQ-11` | `STEP-01` | `AC-11` |
| `RQ-12` | `STEP-01` | `AC-11` |
| `RQ-13` | `STEP-02`, `STEP-04`, `STEP-05` | `AC-12`, `AC-13`, `AC-14`, `AC-15`, `AC-16`, `AC-17`, `AC-18` |

---

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Container postgres image KHÔNG có extension nào mà migration cần (vd `pgcrypto` cho `gen_random_uuid()`, `pg_stat_statements` cho debug) → `prisma migrate deploy` fail loudly. | Mitigation: dùng `postgres:16-alpine` (giống major version Neon). Nếu thiếu, scripts/ci/container-test-db.mjs sẽ parse lỗi `extension "xxx" is not available` → in chi tiết + exit 1. Tier 3 audit sẽ kiểm log này nếu Integration fail. |
| `RISK-02` | Bootstrap script race condition: `pg_isready` return 0 nhưng DB chưa thật sự ready cho query. | Mitigation: `pg_isready -U postgres -d ci_test` chỉ xác nhận TCP+auth; container-test-db.mjs tự retry `SELECT 1` 10 lần cách 1s. |
| `RISK-03` | Migrations idempotent fail vì role existence check race với concurrent runner. | Không có race vì 1 runner đơn lẻ. Layer idempotent safe. |
| `RISK-04` | Posture drift vì 1 role bị script quên (vd `hrp_public_rpc` GRANT CREATE cho schema — cần exec trước khi GRANT USAGE xảy ra). | Migration `20260823101500_mp2_apply_tracking/migration.sql:238` GRANT CREATE conditional `IF EXISTS pg_roles WHERE rolname='hrp_public_rpc'` → an toàn idempotent. |
| `RISK-05` | Container pull time (~5-10s) + migrate apply (~30s cho 39 migrations) + tests (~1-3 phút cho 20 file) → tổng ~2-4 phút. Nếu tệ hơn Neon, Tier 1 phải lý do rõ trong HANDOFF. | Cộng dồn durations; nếu > Neon, Tier 1 STOP và escalate T0. |
| `RISK-06` | `services.postgres` không expose port ra loopback nếu mạng runner khác. Mặc định là OK (port 5432 → host localhost). | Smoke test STEP-05 sẽ chứng minh; nếu fail → tier 1 escalate. |
| `RISK-07` | `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` vẫn còn trong repo secrets nhưng Integration job BỎ QUA chúng → secret không dùng nhưng vẫn có trong secrets UI. Không leak. | Tier 1 đề xuất follow-up PR để xoá secrets (defer). |
| `RISK-08` | Gỡ concurrency sai lúc (chưa chứng minh 2 PR song song an toàn) → 2 runner cùng đụng 1 container → không xảy ra (mỗi runner có 1 container RIÊNG), nhưng secrets share + path-filter shared cache có thể xung đột. | T0 directive: "đừng gỡ vội". Concurrency giữ. |
| `RISK-09` | Tier 3 audit phát hiện role nào setup TAY ngoài scripts/migrations mà chưa kịp document. | HANDOFF EV-01..EV-13 phải cover tất cả roles. Tier 1 đã khảo sát `grep -n 'CREATE ROLE\|CREATE USER\|ALTER ROLE' prisma/migrations` = 1 hit (N2-1), `ls scripts/*role* scripts/create-*-role*` = 3 files. Nếu Tier 3 phát hiện thêm → STOP, ghi thêm EV, bổ sung trong follow-up PR. |

---

## 8. Open Questions

- Có cần xoá repo secrets `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` trong follow-up PR? (T0 quyết.)
- Concurrency: Tier 1 đề xuất follow-up PR sau khi EVIDENCE 2-PR-parallel-safety hoàn tất. (T0 quyết khi nào bắt đầu.)
- `services.postgres` host mặc định: `localhost` đúng không? GitHub Actions docs confirm `services.X.host = localhost` cho non-cross-job services. Tier 1 verified.

---

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Start implementation | Baseline `df68529` (after PR #13 path-filter merged) verified. Container approach do-able: 8 roles provisioned idempotent trong repo scripts/migrations; grants idempotent; 39 migrations + RLS policies apply trên postgres:16-alpine. Concurrency giữ theo T0. |

---

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-18` | Initial contract | CRITICAL/LIGHT per T0 brief — touching CI gate + DB posture |
