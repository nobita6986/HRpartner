# TASK — hrp-v7-ci-path-filter

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v7-ci-path-filter` |
| Work type | `INFRA` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Changes the CI gate contract itself (`.github/workflows/ci.yml`). Required status checks on `main` are `Quality (schema · typecheck · lint · unit · build)` and `Integration (DB tests · fail-closed)` with `enforce_admins=true`; any bug here can silently drop the Integration safety net for code/schema/RLS PRs or wedge docs-only PRs. Tier 3 must independently verify the path-classifier logic + the short-circuit semantics before merge. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `d646b1e566616e3c40b7967413ce0ada150705b4` |
| In-scope roots | `.github/workflows/ci.yml, docs/tasks/hrp-v7-ci-path-filter/**` |
| Forbidden paths | `src/**, prisma/**, app/**, tests/**, scripts/**, .ai-pipeline/**, *.test.ts, *.static.test.ts, any other workflow file, branch-protection API` |
| Required gates | `verify-task.ps1, verify-handoff.ps1, git diff --check, static diff sanity (no third-party action added; Quality+Integration names unchanged), path-classifier logic unit-test against 4 fixture scenarios` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver -> /audit -> /resolve` |

---

## 1. Outcome

### 1.1 User-visible outcome
- Docs/config-only PR (chỉ đụng `docs/**`, `*.md`, `scratch/**`, `.gitignore`, `README*`, `.env.example`) → Integration job vẫn xuất hiện trong Checks tab, trạng thái **success** với log rõ ràng "docs/config-only — Integration skipped", merge không bị kẹt chờ Integration ~20 phút.
- Code/schema/RLS PR (đụng `prisma/**`, `src/**`, `app/**`, `tests/**`, `package.json`, `package-lock.json`, `vitest.*.ts`, `.github/workflows/**`) → Integration chạy đầy đủ (hành vi y hệt baseline), không bị skip nhầm.
- Quality job luôn chạy mọi PR — không thay đổi.

### 1.2 Non-goals
- KHÔNG dùng `paths-ignore` (sẽ làm required check bị "skipped" → pending chặn merge, vi phạm branch protection).
- KHÔNG đổi tên Quality/Integration jobs (branch protection pin theo name).
- KHÔNG sửa logic Integration, preflight, ENV_BLOCKED semantics hay fail-closed contract.
- KHÔNG đụng concurrency group `hrpartner-dedicated-integration-db` (T0 yêu cầu giữ).
- KHÔNG bump `actions/checkout` hay `actions/setup-node` trong PR này (OPTIONAL, defer).
- KHÔNG xoá/sửa Quality job steps; KHÔNG thêm dependency mới (no third-party action).

---

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `gh api repos/nobita6986/HRpartner/branches/main/protection/required_status_checks` trả `{contexts: ["Quality (schema · typecheck · lint · unit · build)", "Integration (DB tests · fail-closed)"], strict: true, enforce_admins: true}`. | Xác nhận tên hai required check và phải có status `success` (không phải `skipped`/`pending`) để merge pass. |
| `EV-02` | `.github/workflows/ci.yml:13` — `on: pull_request:` (no path filter), `:55-90` — Integration job luôn chạy mọi PR nếu `if` điều kiện fork. | Baseline cần sửa: không có path filter, Integration tốn ~20 phút ngay cả với docs-only PR. |
| `EV-03` | `scripts/ci/integration-preflight.mjs` đã in `ENV_BLOCKED` nếu thiếu `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` (per ci.yml:80 comment). | Đây là lý do Integration thực sự kẹt: nó chạy, fail vì không có test-DB secret, làm required check đỏ → docs-only PR không merge được. Short-circuit success với log rõ ràng là cách giải quyết. |
| `EV-04` | docs-only allowlist (`docs/**`, `**/*.md`, `scratch/**`, `.gitignore`, `README*`, `.env.example`) không giao với code allowlist (`prisma/**`, `src/**`, `app/**`, `tests/**`, `package.json`, `package-lock.json`, `vitest.*.ts`, `.github/workflows/**`): hai tập disjoint → không có file nào "ran" có thể bị skip nhầm. | Đảm bảo allowlist bảo thủ, không có false-skip cho code. |
| `EV-05` | `docs/V6/V6_OUTSTANDING_WORK_PLAN.md` line 220 đã ghi canonical: "`test:unit` canonical" + line 480 (D-5 đã chốt) → repo đã ổn định sau W0.7/W0.8 (PR #12). | Baseline đã merge đầy đủ hygiene + W0.7/W0.8, ready cho path-filter. |

---

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | **Approach: short-circuit success, không paths-ignore** — Integration job vẫn tồn tại, vẫn report `success` status, nhưng bước đầu tiên detect changed paths; nếu docs-only thì exit 0 với log "docs/config-only — Integration skipped" và KHÔNG chạy `npm run test:integration`. | `CHOSEN` |
| `DEC-02` | **Implementation: inline bash + git diff, không thêm third-party action** — git đã có sẵn trong runner; so sánh `git diff --name-only origin/${{ github.base_ref }}...HEAD`; classification bằng `case`-style glob match; no `dorny/paths-filter`, no `tj-actions/changed-files`. | `CHOSEN` |
| `DEC-03` | **Allowlist bảo thủ (T0-prescribed):** SKIP set = `{docs/**, **/*.md, scratch/**, .gitignore, README*, .env.example}`. RUN set (else branch) = `{prisma/**, src/**, app/**, tests/**, package.json, package-lock.json, vitest.*.ts, .github/workflows/**}`. Nếu file đổi không thuộc SKIP, RUN bình thường (an toàn theo fail-safe). | `CHOSEN` |
| `DEC-04` | **Concurrency group giữ nguyên** (`hrpartner-dedicated-integration-db`, `cancel-in-progress: false`). | `CHOSEN` |
| `DEC-05` | **Fork guard giữ nguyên**: `if: github.event_name != 'pull_request' \|\| github.event.pull_request.head.repo.full_name == github.repository` (RQ-07). | `CHOSEN` |
| `DEC-06` | **OPTIONAL bump `actions/checkout@v5` + `actions/setup-node@v4` → giữ nguyên trong PR này** (defer sang task riêng để giữ blast radius nhỏ). | `CHOSEN` |
| `DEC-07` | **Job name giữ nguyên**: `quality` / `integration` (branch protection pins display name). | `CHOSEN` |

---

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `.github/workflows/ci.yml` Integration job có bước đầu detect changed paths từ `origin/main...HEAD`; nếu tất cả file đổi thuộc SKIP allowlist → in log rõ "docs/config-only — Integration skipped" + `exit 0`; ngược lại chạy `npm run test:integration` như cũ. |
| `RQ-02` | Quality job không thay đổi (steps, env, name, concurrency). |
| `RQ-03` | Job name `integration` và `quality` giữ nguyên. |
| `RQ-04` | Concurrency group `hrpartner-dedicated-integration-db` giữ nguyên (`cancel-in-progress: false`). |
| `RQ-05` | Fork guard `if:` condition giữ nguyên. |
| `RQ-06` | CI_INTEGRATION_STRICT=1 + ENV_BLOCKED semantics cho branch RUN giữ nguyên. |
| `RQ-07` | Allowlist SKIP gồm: `docs/**`, `**/*.md`, `scratch/**`, `.gitignore`, `README*`, `.env.example`. Mọi file khác (default RUN). |
| `RQ-08` | PR thuần docs/config-only: GitHub Checks tab hiển thị Integration = `success` (không `skipped`/không `pending`); Quality = `success`; merge được phép nếu Quality pass. |
| `RQ-09` | PR có file ngoài SKIP allowlist: Integration chạy đầy đủ preflight + `npm run test:integration`; nếu thiếu DB secret thì fail-closed đỏ như cũ. |
| `RQ-10` | Không thêm third-party GitHub Action; không bump action version; không thêm npm dependency. |

### 4.2 Scope boundaries

- **In:** `.github/workflows/ci.yml` (sửa Integration job), `docs/tasks/hrp-v7-ci-path-filter/**` (TASK/HANDOFF/evidence + path-classifier self-test script nếu cần).
- **Out:** mọi workflow khác, mọi file dưới `src/**`, `prisma/**`, `app/**`, `tests/**`, `scripts/**`, `.ai-pipeline/**`, `docs/V6/**`, `docs/V7/**`, `docs/V8/**`; mọi `*.test.ts` / `*.static.test.ts`; mọi file `.env*` thật.
- **Allowed task artifacts:** `docs/tasks/hrp-v7-ci-path-filter/**`.

### 4.3 Domain boundaries

- **Data/state:** N/A — chỉ sửa CI YAML.
- **Permission/security:** Fork guard vẫn chặn secrets chạy trên fork PR. Short-circuit exit 0 chỉ chạy sau bước checkout + set-output (no secret exposure vì không cần DB secret cho short-circuit branch).
- **Interface/API:** N/A.
- **Migration/rollback:** rollback = `git revert <commit>` hoặc checkout pre-PR ci.yml.

---

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `.github/workflows/ci.yml` Integration job | Thêm bước `Detect changed paths` ngay sau `actions/setup-node@v4`: dùng `git diff --name-only` với base = `${{ github.base_ref }}` resolve về SHA; classify từng file vào SKIP set; nếu 100% thuộc SKIP → in banner + `exit 0`; else continue `npm run test:integration` | `git diff --check` + `yaml lint` (best-effort) | YAML parse error hoặc name đổi |
| `STEP-02` | Allowlist validation | Verify SKIP và RUN sets disjoint; không có file nào vừa thuộc SKIP vừa thuộc RUN | manual table check trong TASK Section 4 | overlap |
| `STEP-03` | Local path-classifier self-test | Viết 1 bash script reproduce classification logic trong 4 fixture scenarios: (a) only docs/, (b) only .md, (c) only .gitignore, (d) mixed docs + package.json → expect SKIP / SKIP / SKIP / RUN | `bash test-classifier.sh` exit 0 + 4/4 expect match | mismatch |
| `STEP-04` | HANDOFF | Document changed surface + 4 fixture self-test outputs + Quality/Integration job-name unchanged evidence | `verify-handoff.ps1` PASS | FAIL |
| `STEP-05` | Delivery | `git diff --check`, verify-task, verify-handoff, commit, push, mở PR, báo T0 | PR open, remote HEAD, Quality/Integration job IDs | PR fail |

---

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `.github/workflows/ci.yml` Integration job có bước detect changed paths với logic SKIP/RUN đúng | `git diff origin/main..HEAD -- .github/workflows/ci.yml` + inline YAML review |
| `AC-02` | Quality job không thay đổi: tên, steps, env giống baseline | `git diff origin/main..HEAD -- .github/workflows/ci.yml` filtered to `^  quality:` block |
| `AC-03` | Job name `integration` + `quality` giữ nguyên đúng chính tả | `git diff origin/main..HEAD -- .github/workflows/ci.yml \| grep -E 'name: (Quality\|Integration)'` (expect unchanged lines from baseline) |
| `AC-04` | Concurrency group `hrpartner-dedicated-integration-db` + `cancel-in-progress: false` còn nguyên | `git diff origin/main..HEAD -- .github/workflows/ci.yml \| grep -E 'group: hrpartner\|cancel-in-progress'` (expect zero removal lines, only additions) |
| `AC-05` | Fork guard `if:` condition còn nguyên | `git diff origin/main..HEAD -- .github/workflows/ci.yml \| grep -E 'head.repo.full_name == github.repository'` (expect zero removal lines) |
| `AC-06` | Path-classifier self-test: 4 fixture scenarios → 3 SKIP + 1 RUN, exit 0 | `bash scripts/ci/test-path-classifier.sh` (or inline run) |
| `AC-07` | Allowlist SKIP và RUN disjoint (set comparison) | manual table review in TASK Section 4 |
| `AC-08` | Zero third-party action added (no `uses: dorny/`, no `tj-actions/`, no new `uses:` line) | `git diff origin/main..HEAD -- .github/workflows/ci.yml` review `uses:` lines |
| `AC-09` | `git diff --check origin/main..HEAD` empty | run `git diff --check origin/main..HEAD` from worktree root |
| `AC-10` | `verify-task.ps1` PASS | run gate |
| `AC-11` | `verify-handoff.ps1` PASS | run gate |
| `AC-12` | Diff confined to `.github/workflows/ci.yml` + `docs/tasks/hrp-v7-ci-path-filter/**`; không có untracked ngoài task folder | `git status --porcelain --untracked-files=normal` + `git diff --stat origin/main..HEAD` |
| `AC-13` | Docs-only PR simulation: classifier xác nhận SKIP (output ghi trong HANDOFF) | `powershell -NoProfile -ExecutionPolicy Bypass -File docs/tasks/hrp-v7-ci-path-filter/evidence/path-classifier-selftest.ps1` (fixture A — docs-only → SKIP) |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-06`, `AC-13` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-01` | `AC-03` |
| `RQ-04` | `STEP-01` | `AC-04` |
| `RQ-05` | `STEP-01` | `AC-05` |
| `RQ-06` | `STEP-01` | `AC-01` (RUN branch unchanged) |
| `RQ-07` | `STEP-01`, `STEP-02` | `AC-07` |
| `RQ-08` | `STEP-01`, `STEP-03` | `AC-06`, `AC-13` |
| `RQ-09` | `STEP-01` | `AC-01` |
| `RQ-10` | `STEP-01`, `STEP-02` | `AC-08` |
| `RQ-01..10` | `STEP-04` | `AC-10`, `AC-11` |
| `RQ-01..10` | `STEP-05` | `AC-12` |

---

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Bash `case` pattern match nhầm (vd `app` glob ăn `apple.txt`) | Dùng `git diff --name-only` + `case` với leading-slash + suffix glob (`/foo` thay vì `foo`); self-test STEP-03 cover 4 case. |
| `RISK-02` | `${{ github.base_ref }}` empty khi push to main → diff empty → SKIP mọi lúc → nguy hiểm | Step detect phải guard `if [ -z "$BASE_REF" ]` → fallback to "RUN" (fail-safe). |
| `RISK-03` | Workflow reuses runner shell khác nhau (bash vs sh vs dash) | Pin `shell: bash` ở step level; bash có sẵn trên `ubuntu-latest`. |
| `RISK-04` | T0 yêu cầu "stop & báo" nếu required-check semantics không xử lý được | Self-test STEP-06 verify short-circuit vẫn success status (qua reasoning: step exit 0 → step success → job success → check success). Nếu check vẫn pending, dừng. |
| `RISK-05` | Allowlist quá rộng → lỡ tay skip nhầm code change | SKIP set cố ý disjoint với code path: chỉ match `docs/**`, `**/*.md`, `scratch/**`, `.gitignore`, `README*`, `.env.example`. Mọi file khác đều fall-through RUN (fail-safe default). |

---

## 8. Open Questions

- None.

---

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Start implementation | Baseline `d646b1e` (origin/main AFTER PR #11 + PR #12 merge) verified. Branch protection requires both Quality + Integration as `success` (not skipped/pending) → paths-ignore ruled out. DEC-01 chosen: short-circuit success via inline bash. Allowlist SKIP set disjoint from RUN set (fail-safe default = RUN). Self-test STEP-03 will cover 4 scenarios before commit. |

---

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-18` | Initial contract | CRITICAL/LIGHT per T0 brief — touching CI gate contract itself |
