# TASK — hrp-v6-credential-rotation-posture

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-credential-rotation-posture` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.2` |
| Status | `READY_FOR_EXECUTION` — bump từ `v1.1` ngày 08/09 09:05 sau khi Tier 1 sửa 4 lỗi EV/EV-04/RQ-05/RQ-06/scope phát hiện ở R1 BLOCKED. Vấn đề: (1) EV-03 sai baseline — `.env.dev`/`.env.preview`/`.env.prod.test` KHÔNG tracked (chỉ là untracked local + `.gitignore` chưa cover), không phải "secret đã lộ qua Vercel Git log"; (2) EV-04 sai — `prisma/seed.mjs` đã được `go-live-21 v1.5` sạch literal password (chỉ còn 3 chỗ bcrypt: 1 import + 2 hash env-based, line 10/60/390), không có worker demo "hash password literal" như EV-04 cũ; (3) AC-05 không khả thi vì `git grep bcrypt|hashSync` hiện = 3 (1 import + 2 hash), không thể ≤ 2 mà không xoá import bcrypt; (4) RQ-06 + STEP-05 + AC-06 vi phạm `R-01` iron rule khi yêu cầu Tier 2 cố connect DB bằng URL cũ; (5) `scripts/auth/*` không có trong "In scope" nhưng STEP-02/05 lại target nó. Tier 1 sửa tất cả. Baseline vẫn `main @ f853a3cfb7ae`. |
| Baseline | `main @ f853a3cfb7ae` (HEAD sau commit `f853a3c chore(planner): Tier 3 audit round 2 BLOCKED cho gl-07 + Tier 1 RESOLUTION`); production `3b15bdeb1d03`. Scope thuộc `PLANNER_HANDOVER.md §13 sổ nợ mục 1..5 + 7`. Sau go-live-21 v1.5 đã sạch literal password trong `prisma/seed.mjs`. KHÔNG xoá branch `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) vì là branch duy nhất đủ ma trận RLS. |
| Modules | Neon DB credential rotation; `DATABASE_URL_ADMIN` chain; production env posture; **`.env*` untracked hygiene** (không phải secret lộ); authenticated session bootstrap cho Tier 2 execution (KHÔNG dùng credential production cũ) |
| ADR references | `PLANNER_HANDOVER.md §13 sổ nợ credential hygiene`; `docs/V6/v6-admin-rebuild.md` §11 (V6-DEC-011/017/026/031 — Phase 1 schema không đụng ở đây); `OWNER_OVERRIDE 2026-09-01` (đang build app, hoãn rotate dồn vào một cửa trước công bố) |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Tier 2 chạy `/code hrp-v6-credential-rotation-posture` R2 với preflight re-run đầy đủ: verify EV-03/EV-04 baseline trên HEAD; KHÔNG tự stage/bump control field Tier 1 |
| Updated | `2026-09-08 09:05 Asia/Bangkok` (Tier 1 sửa 5 lỗi R1 BLOCKED: EV-03 baseline sai, EV-04 sai, AC-05 không khả thi, RQ-06 vi phạm R-01, scope thiếu `scripts/auth/*`) |

## 1. Outcome

### User-visible outcome

Sau task này:

1. Cửa production `hrp-live` Neon có bộ credential MỚI (rotate `neondb_owner` hai lần + `cloud_admin` + `app_user_writer`); các credential cũ không còn hiệu lực; `DATABASE_URL_ADMIN` chain cập nhật theo.
2. Tier 2 / Owner có một quy trình cấp authenticated session (HR positive role + negative-role account) cho gl-07 execution mà KHÔNG đưa token/cookie qua chat/evidence ledger; session tự hết hạn; revoke khi round đóng.
3. `prisma/seed.mjs` không còn password literal; fail-closed env behavior giữ nguyên cho 2 account đầu.
4. Tất cả `.env*` local đã được Owner KEEP/DELETE gắn tag từng file; `.env.dev` / `.env.preview` / `.env.prod.test` đã untrack hoặc rotate xong.
5. `scratch/*` DB probe script + tiện ích một lần có dán connection string đã dọn hoặc chuyển sang path non-tracked an toàn.
6. gl-07 R5 (sau task này ACCEPTED) có thể chạy execution authenticated đầy đủ HR-positive + negative-role matrix.

### Non-goals

- KHÔNG rotate production credential ở task này (Tier 1 / Tier 2 KHÔNG có quyền OP); task chuẩn bị repo hygiene + manifest + dry-run + rollback. Rotation thật thuộc Owner/OP theo `v5-go-live-21-credential-hygiene-closure`.
- KHÔNG xoá Neon branch `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) — branch duy nhất đủ ma trận RLS.
- KHÔNG commit/push/deploy production secret, password mới, token, cookie hay PII.
- KHÔNG sửa source route (chỉ env manifest, seed cleanup, posture bootstrap script nếu cần).
- KHÔNG retry quyền đọc production env cũ sau rotate — mọi attempt cũ phải FAIL để chứng minh rotate có hiệu lực.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `PLANNER_HANDOVER.md §13 sổ nợ mục 1..5 + 7` | 5 hạng mục credential hygiene đang nợ: rotate `neondb_owner` (2 password khác nhau đã lộ), rotate `cloud_admin`, rotate `app_user_writer`, phân loại local env (đo lại 07/09: `.env.local` / `.env.ops06a-test.local` / `.env.production.local` đều ignored; Owner ghi KEEP/DELETE từng file), cập nhật `DATABASE_URL_ADMIN` sau rotate, xoá residual password literal trong `prisma/seed.mjs` | RQ-01..05 cover trực tiếp |
| `EV-02` | AUDIT.md gl-07 round 3 | AUD-001 P1 OPEN: thiếu HR-positive + negative-role authenticated production session. Round 1/2/3 đều safe-probe `307/401/401`. Tier 1 đã đóng gl-07 bằng `GO_LIVE_BLOCKED` | RQ-06 phải giải quyết gốc pre-auth context (KHÔNG dùng credential production cũ — vi phạm R-01) |
| `EV-03` | `git ls-files .env*` + `git ls-files --others --exclude-standard .env*` đo 08/09 09:00 | Tracked: chỉ `.env.example`. Untracked local (KHÔNG qua Vercel Git log): `.env`, `.env.local`, `.env.dev`, `.env.preview`, `.env.prod.test`, `.env.production`, `.env.production.local`, `.env.ops06a-test.local`. `.gitignore` đã cover `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.*.local` NHƯNG CHƯA cover `.env.dev`, `.env.preview`, `.env.prod.test` (3 file này chưa vào `.gitignore` nhưng cũng chưa tracked) | RQ-04 phải ghi KEEP/DELETE từng file untracked + bổ sung `.gitignore` để cover 3 file chưa có |
| `EV-04` | `prisma/seed.mjs` đo 08/09 09:00 | `git grep -nE "hashSync\|bcrypt" prisma/seed.mjs` = 3 chỗ: line 10 (import bcryptjs), line 60 (`bcrypt.hash(password, 10)` trong loop account đầu dùng `process.env[acc.passwordEnv]`), line 390 (`bcrypt.hash(demoPassword, 10)` dùng `process.env.PORTAL_DEMO_PASSWORD` + SKIP fail-closed). 2 account đầu + 1 demo đều dùng explicit env, KHÔNG có password literal nào — go-live-21 v1.5 đã dọn sạch | RQ-05: KHÔNG cần cleanup seed.mjs; AC-05 đổi thành verify "không có literal" bằng `git grep -nE "['\"][a-zA-Z0-9!@#$%^&*]{8,}['\"]"` trong seed.mjs |
| `EV-05` | `scratch/*` (git ls-files) | Chứa script probe DB và tiện ích một lần; vài file có logic nối DB | RQ-07 dọn hoặc gitignore an toàn |
| `EV-06` | `OWNER_OVERRIDE 2026-09-01` trong `PLANNER_HANDOVER.md §13` | Owner đã quyết: đang build app, hoãn rotate dồn vào một cửa trước công bố. Rotation task KHÔNG được blocker các task khác | Task này chính là "cửa" đó |
| `EV-07` | Tier 1 §13 mục 9 | Xoá Neon branch `pre-mp2-remediation-2026-08-28` đã hết vai trò — KHÔNG đụng `hrp_mp2_test` | RQ-08 phân loại branch an toàn |
| `EV-08` | `v5-go-live-21-credential-hygiene-closure` đã CLOSED v1.5 | Repo hygiene + manifest + dry-run + rollback đã có template; task này kế thừa format | RQ-09 reuse template + dry-run |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Task mở từ `GO_LIVE_BLOCKED` của gl-07; Tier 1 take ownership viết DRAFT v1.0 rồi bump READY sau Owner review | AUDIT.md gl-07 r3; PLANNER_HANDOVER §13 | Final |
| `DEC-02` | CHOSEN | Tier 2 CHỈ chuẩn bị repo hygiene + manifest + dry-run + rollback; KHÔNG rotate, KHÔNG commit secret mới, KHÔNG push, KHÔNG deploy. Rotation production thuộc OP Owner | PLANNER_HANDOVER §13; Iron Rule "Tier 2 không tự audit/ACCEPTED" | Final |
| `DEC-03` | CHOSEN | Authenticated session bootstrap KHÔNG qua chat/evidence ledger. Cơ chế: Owner cấp session qua kênh riêng (CLI local / secret manager), Tier 2 đọc từ env runtime nội bộ của worktree riêng, tự hết hạn, revoke khi round đóng | gl-07 AUD-001 evidence ledger guard | Final |
| `DEC-04` | CHOSEN (từ assumption cũ Q-02) | Rotate `neondb_owner` 2 lần + `cloud_admin` + `app_user_writer` chạy theo state order `v5-go-live-21` còn nợ; task này viết manifest + repo hygiene, Tier 2 KHÔNG rotate production. Secret manager mặc định là `.env.runtime` chmod 600 trong worktree riêng của Tier 2, KHÔNG SaaS CLI. Bootstrap script đọc `HRP_HR_BEARER` + `HRP_NEG_BEARER`, auto-revoke khi round đóng | EV-01, OWNER_OVERRIDE 2026-09-01; §8 Q-01 Q-02 | Final |
| `DEC-05` | CHOSEN | `prisma/seed.mjs` đã được `go-live-21 v1.5` dọn sạch literal password (2 account đầu + 1 demo đều dùng `process.env.*`, `bcrypt.hash` ở line 10/60/390 — 1 import + 2 hash env-based). Tier 2 CHỈ verify bằng `git grep` không có literal; KHÔNG sửa nếu đã sạch | EV-04 (đo lại 08/09 09:00) | Final |
| `DEC-06` | CHOSEN | `.env.dev` / `.env.preview` / `.env.prod.test` KHÔNG tracked (chỉ là untracked local). Tier 2 KHÔNG untrack file đã không tracked; thay vào đó bổ sung `.gitignore` để cover 3 file này (cùng pattern `.env.*`) để ngăn future accidentally tracked. Cũng KHÔNG xoá value của file local — Tier 2 không có quyền xoá secret chưa được rotate. Tier 2 ghi classification list với tag `KEEP_LOCAL` (Owner cấp value, file phục vụ dev/preview/test local) + đề xuất `.gitignore` bổ sung | EV-03 (đo lại 08/09 09:00) | Final |
| `DEC-07` | CHOSEN | KHÔNG xoá branch `hrp_mp2_test` (`br-misty-cell-az3nx5l3`). Chỉ xoá `pre-mp2-remediation-2026-08-28` (đã hết vai trò) | PLANNER_HANDOVER §13 mục 9; EV-07 | Final |
| `DEC-08` | CHOSEN | Task KHÔNG chặn gl-07 ACCEPT hoặc 1C R2 (HANDOFF đã PASS exit 0). Mục tiêu là MỞ KHÓA gl-07 round authenticated tiếp theo, không ép tuyến tính | Iron Rule #1 contract; PLANNER_HANDOVER §0 ROADMAP_CURSOR | Final |
| `DEC-09` | CHOSEN | Spec giữ `v1.0 DRAFT` cho tới khi Owner review + ủy quyền rotate; bump `v1.1 READY_FOR_EXECUTION` mới giao Tier 2. Tier 2 không tự AUTHORIZE | Iron Rule #1 | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Tier 2 viết credential rotation manifest (file không có secret value, chỉ key + intent) cho `neondb_owner`, `cloud_admin`, `app_user_writer` | Must P0 | EV-01, DEC-02 | Manifest chứa value → FAIL + revert |
| `RQ-02` | Tier 2 viết `DATABASE_URL_ADMIN` chain update plan: cũ → mới, mọi caller phải đổi trước rotate, dry-run với URL cũ fail-closed | Must P0 | EV-01, DEC-02 | Plan không cover caller nào → FAIL |
| `RQ-03` | Tier 2 dựng authenticated session bootstrap cho Tier 2/Owner (không qua chat/evidence); session tự hết hạn; revoke khi round đóng | Must P0 | EV-02, DEC-03 | Bootstrap đưa token vào chat/evidence → FAIL nghiêm trọng |
| `RQ-04` | Tier 2 liệt kê `.env*` local files với tag `KEEP` / `DELETE` từng file theo Owner quyết; `.env.dev` / `.env.preview` / `.env.prod.test` phải có KEEP/DELETE rõ + untrack nếu DELETE | Must P0 | EV-01, EV-03, DEC-06 | Owner chưa quyết → tier 2 HOLD |
| `RQ-05` | Tier 2 verify `prisma/seed.mjs` không có literal password: `git grep -nE "['\"][a-zA-Z0-9!@#$%^&*_-]{8,}['\"]" prisma/seed.mjs` trả rỗng ở context hash/login/auth; nếu có literal thì mới đề xuất cleanup. Tier 2 KHÔNG tự sửa seed.mjs nếu đã sạch | Must P0 | EV-04 | Sửa lung tung khi đã sạch = FAIL |
| `RQ-06` | Tier 2 viết `scripts/auth/rotation-dryrun.mjs` chỉ chứa URL/credential **REDACTED trong source** (`postgres://[REDACTED]@[REDACTED]/[REDACTED]`); script KHÔNG thật sự connect — chỉ verify mẫu URL có pattern đúng + script exit 0 với output `OK` không có value. KHÔNG yêu cầu Tier 2 đọc/sử dụng credential production cũ (vi phạm R-01 iron rule). Rotation production thuộc OP Owner theo `v5-go-live-21` state order | Must P0 | EV-02, R-01 iron rule | Tier 2 đọc credential thật = FAIL nghiêm trọng |
| `RQ-07` | Tier 2 dọn `scratch/*`: script probe DB + tiện ích một lần có logic nối DB → gitignore an toàn hoặc xoá. KHÔNG commit value mới | Must P0 | EV-05 | Commit value mới → FAIL nghiêm trọng |
| `RQ-08` | Tier 2 phân loại Neon branch: `pre-mp2-remediation-2026-08-28` đã hết vai trò (xoá được); `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) KHÔNG đụng | Must P0 | EV-07, DEC-07 | Đụng `hrp_mp2_test` → FAIL nghiêm trọng |
| `RQ-09` | Tier 2 reuse template + format từ `v5-go-live-21-credential-hygiene-closure` (đã CLOSED v1.5) cho hygiene manifest, dry-run, rollback | Must P2 | EV-08 | Không khớp format → WARN |

### 4.2 Scope boundaries

**In scope:**

- `docs/tasks/hrp-v6-credential-rotation-posture/**` (TASK, HANDOFF, AUDIT, evidence, manifest)
- `prisma/seed.mjs` (chỉ verify không có literal — KHÔNG sửa trừ khi có literal)
- `scripts/auth/` (chỉ `session-bootstrap.mjs`, `rotation-dryrun.mjs`, `README.md` giải thích — KHÔNG value)
- `.env*` classification list (file rỗng hoặc tag; KHÔNG value)
- `.gitignore` (bổ sung cover `.env.dev`, `.env.preview`, `.env.prod.test`)
- `scratch/` cleanup plan
- Neon branch classification list

**Out of scope:**

- Production rotation thật (Owner/OP thuộc `v5-go-live-21-credential-hygiene-closure` state order)
- Source route, schema, test thuộc app domain
- `prisma/schema.prisma`
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- Bất kỳ file nào chứa secret value (KHÔNG commit/push)
- Tier 2 KHÔNG đọc/sử dụng credential production thật (R-01 iron rule)

### 4.3 Data, State, Permission và Interface Rules

- **Data:** manifest chỉ chứa key + intent (KHÔNG value). Rotation giá trị thật thuộc Owner/OP secret manager.
- **State:** bootstrap script có state `pending` / `active` / `revoked`; `revoked` là bắt buộc khi round đóng.
- **Permission/data scope:** Tier 2 KHÔNG có quyền rotate hay đọc production env mới. Chỉ chuẩn bị repo posture.
- **Interface:** bootstrap script là CLI local (KHÔNG HTTP endpoint public); output log chỉ chứa key + status, KHÔNG token/cookie.
- **Failure/idempotency/concurrency:** rotate là thao tác một lần; idempotent ở mức "đã rotate hay chưa" (khôi phục = rollback plan, không phải retry). Concurrent rotate hai role khác nhau được.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01, RQ-02` | `docs/tasks/hrp-v6-credential-rotation-posture/manifest/` | Viết rotation manifest file cho `neondb_owner` / `cloud_admin` / `app_user_writer` + `DATABASE_URL_ADMIN` chain update plan. File KHÔNG chứa value | EV-01, DEC-02 | `git grep -nE "(password\|token\|secret).*=" manifest/` trả rỗng; `git diff --cached --name-only` đúng 3 file mới | Có value trong file = STOP ngay + revert |
| `STEP-02` | `RQ-03` | `scripts/auth/session-bootstrap.mjs` (hoặc `.ps1` cho Windows) | CLI bootstrap session authenticated từ secret manager runtime, KHÔNG qua chat/evidence. Có state `pending/active/revoked`, auto-expire | EV-02, DEC-03 | `git grep -nE "(token\|cookie\|password).*=" scripts/auth/` trả rỗng; script chạy dry-run in `pending` không có value | Token/cookie bị leak → STOP ngay + revert |
| `STEP-03` | `RQ-04` | `docs/tasks/hrp-v6-credential-rotation-posture/manifest/env-classification.md` | Liệt kê từng `.env*` local file với tag KEEP/DELETE từng cái; `.env.dev` / `.env.preview` / `.env.prod.test` có KEEP/DELETE rõ | EV-01, EV-03 | `git ls-files .env*` đối chiếu classification | Owner chưa quyết file nào → HOLD |
| `STEP-04` | `RQ-05` | `prisma/seed.mjs` (chỉ verify, KHÔNG sửa nếu đã sạch) | chạy `git grep -nE "['\"][a-zA-Z0-9!@#$%^&*_-]{8,}['\"]" prisma/seed.mjs`; nếu có literal hash/login → đề xuất; nếu sạch → chỉ ghi evidence "đã sạch từ go-live-21 v1.5" | EV-04 | grep output, `evidence/ac04-seed-clean.txt` | Sửa lung tung khi đã sạch = STOP |
| `STEP-05` | `RQ-06` | `scripts/auth/rotation-dryrun.mjs` (KHÔNG connect DB thật) | Script verify URL pattern có dạng `postgres://[REDACTED]@[REDACTED]/[REDACTED]`; KHÔNG chứa credential thật; exit 0 với output `OK` không có value. Tier 2 KHÔNG đọc credential production cũ | EV-02, R-01 | `node scripts/auth/rotation-dryrun.mjs` exit 0 + grep `['"]postgres://[^@]+@[^/]+/` không match value thật, `evidence/ac05-dryrun.txt` | Có value thật → STOP + revert |
| `STEP-06` | `RQ-07` | `scratch/*` + `.gitignore` | Gitignore an toàn các script có logic nối DB; KHÔNG commit value mới | EV-05 | `git status --porcelain scratch/` đối chiếu | Commit value mới → STOP + revert |
| `STEP-07` | `RQ-08` | `docs/tasks/hrp-v6-credential-rotation-posture/manifest/neon-branch-classification.md` | `pre-mp2-remediation-2026-08-28` xoá được; `hrp_mp2_test` KHÔNG đụng | EV-07, DEC-07 | Đọc classification + đối chiếu Neon console bằng tay (Tier 1 verify read-only) | Đụng `hrp_mp2_test` → STOP ngay |
| `STEP-08` | `RQ-09` | `HANDOFF.md` | Tier 2 viết HANDOFF sau khi STEP-01..07 pass; reuse format `v5-go-live-21-credential-hygiene-closure` | EV-08 | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-credential-rotation-posture` PASS | Không evidence = BLOCKED |

### 5.1 Traceability RQ → STEP → AC

| RQ | STEP | AC |
|----|------|-----|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-05` | `AC-06` |
| `RQ-07` | `STEP-06` | `AC-07` |
| `RQ-08` | `STEP-07` | `AC-08` |
| `RQ-09` | `STEP-08` | `AC-09` |

## 6. Acceptance

Mỗi hàng đo bằng LỆNH thật. Task là INFRA nên phép đo là `git grep` / `node script` / manual checklist + chạy fence thật.

| AC | RQ | Điều kiện | Phương pháp đo | Bằng chứng | Chặn? |
|----|----|-----------|----------------|------------|-------|
| `AC-01` | `RQ-01` | Rotation manifest file không chứa value; chỉ key + intent | `git grep -nEi "(password\|token\|secret).{0,3}=" manifest/` trả rỗng ; đọc từng file verify bằng mắt thường | grep rỗng + checklist, `evidence/ac01-manifest.txt` | Yes |
| `AC-02` | `RQ-02` | `DATABASE_URL_ADMIN` chain update plan liệt kê đủ caller (code path + script + cron) | `Select-String -Path docs/tasks/hrp-v6-credential-rotation-posture/manifest/dburl-chain.md -Pattern "DATABASE_URL_ADMIN"` tìm thấy ≥ 1 caller mỗi môi trường (dev/staging/prod) | đối chiếu callers, `evidence/ac02-dburl.txt` | Yes |
| `AC-03` | `RQ-03` | `session-bootstrap` script không in/commits token/cookie; chạy `--dry-run` in state `pending` không value | `git grep -nEi "(token\|cookie).{0,3}=" scripts/auth/session-bootstrap.*` trả rỗng ; `node scripts/auth/session-bootstrap.mjs --dry-run` exit 0 và output không có chuỗi dài 32+ chars | grep + dry-run output, `evidence/ac03-bootstrap.txt` | Yes |
| `AC-04` | `RQ-04` | Mỗi `.env*` local file (tracked + ignored) có tag KEEP/DELETE; `.env.dev` / `.env.preview` / `.env.prod.test` không để trống tag | đọc `manifest/env-classification.md` đối chiếu `git ls-files .env*` + `git ls-files --others --exclude-standard .env*` | checklist, `evidence/ac04-env-classify.txt` | Yes |
| `AC-05` | `RQ-05` | `prisma/seed.mjs` KHÔNG có password literal trong context hash/login/auth | `git grep -nE "['\"][a-zA-Z0-9!@#$%^&*_-]{8,}['\"]" prisma/seed.mjs` trả rỗng ở line có `bcrypt\|hash\|password` gần; grep output, `evidence/ac04-seed-clean.txt` | Yes |
| `AC-06` | `RQ-06` | `scripts/auth/rotation-dryrun.mjs` chứa URL REDACTED `postgres://[REDACTED]@[REDACTED]/[REDACTED]`; KHÔNG connect DB thật; exit 0 với output không có value | `node scripts/auth/rotation-dryrun.mjs` exit 0 ; `git grep -nE "['\"]postgres://[^@'\"]+@[^/'\"]+/['\"]" scripts/auth/` chỉ match `[REDACTED]` placeholder, `evidence/ac05-dryrun.txt` | Yes |
| `AC-07` | `RQ-07` | `scratch/*` script có logic nối DB đã được gitignore an toàn | `git status --porcelain scratch/` đối chiếu classification list ; `Select-String -Path .gitignore -Pattern "scratch"` tìm thấy | đối chiếu, `evidence/ac07-scratch.txt` | Yes |
| `AC-08` | `RQ-08` | `pre-mp2-remediation-2026-08-28` đã classify là DELETE; `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) classify là KEEP | đọc `manifest/neon-branch-classification.md` ; Tier 1 đối chiếu Neon console bằng tay read-only | checklist + link Neon console, `evidence/ac08-branch.txt` | Yes |
| `AC-09` | `RQ-09` | HANDOFF.md dùng format `v5-go-live-21-credential-hygiene-closure` (8 section, control field, evidence row, deviation block) | đọc HANDOFF section heading ; `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-credential-rotation-posture` PASS | verify output, `evidence/ac09-handoff.txt` | Yes |
| `AC-10` | Tất cả | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-credential-rotation-posture` PASS exit 0 ; KHÔNG commit secret mới | hai lệnh ; `git diff --cached --check` exit 0 | exit codes, `evidence/ac10-gates.txt` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-05` | `AC-06` |
| `RQ-07` | `STEP-06` | `AC-07` |
| `RQ-08` | `STEP-07` | `AC-08` |
| `RQ-09` | `STEP-08` | `AC-09` |
| Tất cả | gate | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Tier 2 vô tình commit secret value mới | `git diff --cached --check` hoặc grep manifest thấy value | DEC-02: manifest KHÔNG có value; AC-01 grep rỗng | `git reset HEAD~1` ngay; xoá khỏi working tree; `git filter-repo` nếu đã push |
| `RISK-02` | Bootstrap script đưa token/cookie vào log/chat/evidence | AC-03 grep thấy value | DEC-03: KHÔNG chat/evidence; auto-revoke khi round đóng | Xoá session ngay; rotate lại credential vừa lộ; mở incident theo `v5-go-live-21` flow |
| `RISK-03` | Rotate `neondb_owner` phá ma trận RLS hiện hữu vì `safe_admin=1` grant phụ thuộc vào role này | Dry-run sau rotate fail | DEC-04: chạy dry-run trước; GO-LIVE-11 đã đo `safe_admin=1`; Owner confirm | Rollback role grant ; re-apply `safe_admin` từ `cloud_admin` mới |
| `RISK-04` | Xoá nhầm `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) — branch duy nhất đủ ma trận RLS | STEP-07 không có classification | DEC-07: classification rõ ràng; Tier 1 đối chiếu read-only | Khôi phục branch từ Neon point-in-time recovery (tốn effort, có thể mất dữ liệu test) |
| `RISK-05` | `.env.dev` / `.env.preview` / `.env.prod.test` chưa được `.gitignore` cover → nếu Tier 2 vô tình `git add` sẽ tracked | STEP-03 classification | DEC-06: bổ sung `.gitignore` rule `.env.dev`/`.env.preview`/`.env.prod.test` để cover; Tier 2 chỉ KEEP_LOCAL + không tự xoá value | Owner rotate Vercel env tương ứng → xoá file local sau khi rotate |
| `RISK-06` | Tier 2 vô tình đụng source route / schema | `git diff --stat` rộng | Scope boundaries mục 4.2 chỉ liệt kê path hẹp; AC-10 gate check | `git checkout -- PATH` revert ; rerun gate |
| `RISK-07` | Dry-run script commit URL cũ vào repo khi test | AC-06 grep thấy `postgres:.*@` | DEC-02: dry-run không cần URL thật trong script, có thể đọc runtime env | Xoá URL khỏi script ngay; untrack nếu đã commit |
| `RISK-08` | Task mở quá sớm trước khi gl-07 R5 sẵn sàng, Tier 2 phí công chuẩn bị posture không dùng tới | Owner chưa cam kết round authenticated gl-07 tiếp theo | DEC-08: task KHÔNG chặn gl-07 ACCEPT/1C R2 ; mục tiêu là mở khóa chứ không ép | Pause task ; resume khi Owner mở gl-07 R5 authenticated |

## 8. Open Questions (đã Tier 1 tự quyết — không chờ Owner chat)

| ID | Quyết định Tier 1 | Lý do / default an toàn | Điều kiện Override của Owner |
|---|---|---|---|
| `Q-01` (cũ) | **Tier 1 assume** rotate `neondb_owner` (2 lần) + `cloud_admin` + `app_user_writer` sẽ chạy **theo đợt `v5-go-live-21` còn nợ** — task này chỉ chuẩn bị repo posture + manifest, KHÔNG block Tier 2 execution vì Tier 2 đã được phép chạy mọi bước TRỪ chính việc rotate giá trị thật. Theo OWNER_OVERRIDE 2026-09-01: "đang build app, hoãn rotate dồn vào một cửa trước công bố" — task này chính là cửa đó, Tier 1 không đợi Owner chọn ngày, Tier 1 viết manifest và tier 2 sẽ update manifest nếu cửa đổi | Owner có thể ghi đè ngày + thứ tự trong chat khi giao `/code v5-go-live-21` | |
| `Q-02` (cũ) | **Tier 1 chọn**: secret manager là **`.env.runtime` không tracked** ở worktree riêng của Tier 2, KHÔNG phụ thuộc SaaS (1Password/Vault/Doppler). Lý do: SaaS CLI thêm attack surface và phụ thuộc Internet trên worktree có token rotation. Bootstrap script chỉ đọc 2 env var `HRP_HR_BEARER` + `HRP_NEG_BEARER` từ `.env.runtime` (chmod 600, chỉ Tier 2 đọc, KHÔNG commit), tự đóng session sau khi round kết thúc (state `revoked`). An toàn hơn SaaS vì zero-egress, zero-deps, idempotent revoke | Owner có thể ghi đè bằng SaaS + cấp role nếu muốn | |
| `Q-03` (cũ) | **Tier 1 chọn** theo EV-03 thực đo 08/09 09:00: `.env.dev` / `.env.preview` / `.env.prod.test` KHÔNG tracked (chỉ là untracked local, không qua Vercel Git log). Plan: (a) bổ sung `.gitignore` cover `.env.dev`, `.env.preview`, `.env.prod.test` để ngăn future accidentally tracked; (b) KHÔNG xoá value file local (Tier 2 không có quyền xoá secret chưa rotate); (c) Tier 2 viết classification list với tag `KEEP_LOCAL` cho 3 file này + đề xuất `.gitignore` rule. Lý do Tier 1 chọn conservative: nếu file đã được `.gitignore` cover thì không cần xoá value (chưa rotate mà xoá = mất khả năng test local). Owner có thể override bằng `Rotate Vercel env + DELETE` sau khi rotate production | Tier 1 tự quyết | |
| `Q-04` (cũ) | **Tier 1 chọn** xoá `pre-mp2-remediation-2026-08-28` **cùng đợt rotate** (không tách), vì branch này chỉ là cứu hộ và vắng giá trị. Classified thành 1 dòng DELETE; STEP-07 reference | Owner có thể giữ lại nếu cần rollback point khác | |
| `Q-05` (cũ) | **Tier 1 chọn**: mở `hrp-v5-go-live-07-marketplace-launch-proof v1.7` authenticated re-spec SAU task này ACCEPTED, không tách trước vì gl-07 v1.6 đã `GO_LIVE_BLOCKED`. Nhiệm vụ: re-scope `AC-04/11/17/19 PARTIAL` → `PASS` dưới authenticated context, thêm AC cho negative-role, thêm Owner sign-off gate | Owner có thể đẩy sớm hoặc bỏ | |

## 9. Planner Resolution

Tier 1 phát hành `v1.0` ngày 08/09 ở status `DRAFT`. Mở từ `GO_LIVE_BLOCKED` của `hrp-v5-go-live-07-marketplace-launch-proof` (audit round 3, AUD-001 P1 OPEN). Chưa có execution round hay audit round. Sau Owner review + authorize rotate, bump `v1.0` → `v1.1 READY_FOR_EXECUTION` và điền resolve vào mục này sau khi Tier 3 audit round 1.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| (exec r1) | Tier 1 sửa 5 lỗi EV/EV-04/RQ-05/RQ-06/scope | **TIER 1 OWNERSHIP — tự sửa, bump v1.2** | Tier 2 R1 preflight BLOCKED báo 4 blocker. Tier 1 verify baseline thực tế: (1) EV-03 sai — `git ls-files` chỉ thấy `.env.example` tracked; 3 file `.env.dev`/`.env.preview`/`.env.prod.test` UNTRACKED (chỉ là local + `.gitignore` chưa cover); không phải "secret đã lộ qua Vercel Git log". (2) EV-04 sai — seed.mjs đã sạch literal password từ go-live-21 v1.5 (`bcrypt.hash` 3 chỗ: 1 import + 2 hash env-based). (3) AC-05 không khả thi — `git grep -nE "hashSync\|bcrypt"` hiện = 3 (1 import + 2 hash), không thể ≤ 2 mà không xoá import bcrypt. (4) RQ-06 + STEP-05 + AC-06 vi phạm R-01 iron rule khi yêu cầu Tier 2 cố connect DB bằng URL cũ. (5) `scripts/auth/*` không có trong "In scope" nhưng STEP-02/05 target nó. Tier 1 sửa EV-03/EV-04, đổi AC-05 sang grep literal pattern, đổi RQ-06 sang REDACTED placeholder (Tier 2 KHÔNG đọc credential production), thêm `scripts/auth/` vào In scope. KHÔNG commit production secret; rotation production vẫn thuộc OP Owner. | Tier 1 sửa contract + bump spec; không sửa source code | Tier 1 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.1` | `2026-09-08 00:30` | Bump `DRAFT` → `READY_FOR_EXECUTION`. Tier 1 take ownership Q-01..Q-05 (mọi Q được Tier 1 tự quyết default an toàn, không chờ Owner chat): Q-01 theo đợt v5-go-live-21, Q-02 secret manager = `.env.runtime` chmod 600, Q-03 3 file `.env*` DELETE (sai — sửa ở v1.2), Q-04 xoá pre-mp2 cùng đợt, Q-05 gl-07 v1.7 SAU task này ACCEPTED. Status mở execution round. | Tier 1 fix Q bị Tier 2 chặn ở Q-02 brand voice (task song song) |
| `v1.2` | `2026-09-08 09:05` | Bump `v1.1` → `v1.2` sau khi Tier 1 sửa 5 lỗi R1 BLOCKED. EV-03 đo baseline thực: chỉ `.env.example` tracked; `.env.dev`/`.env.preview`/`.env.prod.test` UNTRACKED (chỉ local) — không phải secret lộ Vercel. EV-04 đo: seed.mjs đã sạch literal password (go-live-21 v1.5) — `bcrypt.hash` 3 chỗ line 10/60/390. AC-05 đổi sang grep literal pattern thay vì đếm bcrypt. RQ-06 + STEP-05 + AC-06 đổi sang REDACTED placeholder (Tier 2 KHÔNG đọc credential production — vi phạm R-01). Scope bổ sung `scripts/auth/*`. DEC-05, DEC-06, RISK-05, Q-03 rewrite cho khớp baseline. KHÔNG sửa source code; không commit secret. | HANDOFF R1 BLOCKED (4 blocker: EV-03 sai baseline, EV-04 sai, AC-05 không khả thi, RQ-06 vi phạm R-01); Tier 1 verify baseline thực tế rồi sửa contract |
