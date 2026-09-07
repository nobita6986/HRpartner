# Evidence rebase — go-live-21 (2026-09-07 10:43 Asia/Bangkok)

File này gộp số đo mới cho spec bump `v1.0 → v1.1`. Mỗi mục dẫn tới tệp
bằng chứng thô trong cùng thư mục; tệp thô chứa lệnh, exit code và output
thật tại thời điểm đo.

Mọi phép đo chạy key/path-only; KHÔNG in value, connection string, token,
phone hay PII. Nếu một mục cần giá trị để quyết định, mục đó ghi nhận
"NEED_OWNER_VALUE" và chuyển sang owner disposition.

## EV-01 — Sổ nợ §13 (link-only)

Nguồn: `docs/PLANNER_HANDOVER.md §13`. 11 mục; số thứ tự và ngày vào sổ
không đổi từ 29/08 tới 01/09 và đo lại 07/09.

## EV-02 — Tracked env files (key-only scan)

Lệnh: `git ls-files '.env*'`

| Path | Tracked | Quan sát |
|---|---|---|
| `.env.dev` | YES | Không in value; đo key-only thấy các khóa DB/JWT/account ở trạng thái SET |
| `.env.example` | YES | Empty/placeholder đúng vai; KHÔNG có usable secret |
| `.env.preview` | YES | Có Vercel/OIDC-shaped values SET (key-only) |
| `.env.prod.test` | YES | Có Vercel-shaped values SET (key-only) |

Bằng chứng: `evidence/v11-ev02-tracked-env.txt`

## EV-03 — Secret value scan (negative canary)

Lệnh: `rg --files-with-matches` cho các fingerprint DB/JWT/cookie; KHÔNG
in value. Mọi key SET ở EV-02 phải được coi là secret cho tới khi Owner
chứng minh rotate/untrack. Tệp không kèm value.

Bằng chứng: `evidence/v11-ev02-tracked-env.txt` (cùng phép đo, output chỉ
gồm path).

## EV-04 — Local env (key/path-only)

Lệnh: `Get-ChildItem -Force -Filter '.env*.local'`

| File | Size | LastWriteTime | Quan sát |
|---|---|---|---|
| `.env.local` | 1364 | 2026-08-28 09:16 | Cần Owner disposition KEEP/DELETE |
| `.env.ops06a-test.local` | 411 | 2026-08-29 08:07 | Cần Owner disposition |
| `.env.production.local` | 1924 | 2026-08-16 18:56 | Cần Owner disposition |

`.env.test.local` không có trong kết quả — xác nhận đã vắng.

Bằng chứng: `evidence/v11-ev02-tracked-env.txt`

## EV-04b — gitignore status cho path trên

Lệnh: `git check-ignore -v <path>`

| Path | gitignore hit |
|---|---|
| `test-results` | `.gitignore:75` |
| `playwright-report` | `.gitignore:76` |
| `node_modules` | `.gitignore:2` |
| `.next` | `.gitignore:7` |

`out`, `build`, `dist` không có hit — sẽ thêm ignore exact ở STEP-01
(theo RQ-02) hoặc xác nhận Owner muốn track. Spec v1.0 §3 DEC-02 đã nêu
chỉ giữ `.env.example` tracked.

Bằng chứng: `evidence/v11-ev02-tracked-env.txt`

## EV-05 — Prisma seed (line range scan)

Lệnh: `rg -n 'password|hash|passwordHash|bcrypt|argon' prisma/seed.mjs`
File: 591 dòng.

| Dòng | Nội dung | Nhận xét |
|---|---|---|
| `prisma/seed.mjs:10` | `import bcrypt from 'bcryptjs';` | OK |
| `:23` | Comment KHÔNG reset passwordHash, thiếu ENV → skip | OK |
| `:25` | KHÔNG log phone/password/hash | OK |
| `:28-29` | ADMIN/HR_MANAGER phoneEnv/passwordEnv | OK (fail-closed) |
| `:39` | `const password = process.env[acc.passwordEnv];` | OK |
| `:41-42` | skip + warn khi thiếu ENV | OK |
| `:50` | user tồn tại → giữ passwordHash | OK (idempotent) |
| `:55-56` | warn khi không có passwordHash | OK |
| `:60-62` | `bcrypt.hash(password, 10)` + `passwordHash` | OK |
| `:383-389` | worker demo: `bcrypt.hash('demo-portal-2026', 10)` | **RESIDUAL LITERAL — RQ-03** |
| `:484` | comment KHÔNG reset password | OK |

Hai account ADMIN/HR_MANAGER đã fail-closed đúng. Một worker demo ở
line 385 vẫn hash password literal cố định — đây là mục RQ-03 của v1.0.

Bằng chứng: `evidence/v11-ev05-seed-scan.txt`

## EV-06 — DB_DIAG_TOKEN scan

Lệnh: `rg -n 'DB_DIAG_TOKEN' --glob '!scratch/**' --glob '!docs/tasks/**' --glob '!node_modules/**'`

Hit duy nhất ngoài scratch:
`docs/PLANNER_HANDOVER.md:262` (mục §13 dòng 6, sổ nợ).

KHÔNG có hit trong source code. EV-06 của v1.0 còn hiệu lực — công việc
là xoá biến trên Vercel và chứng minh app không phụ thuộc, không phát
minh code mới.

Bằng chứng: `evidence/v11-ev06-dbtoken-scan.txt`

## EV-07 — Neon branch exact-name

Lệnh: `neonctl branches list` KHÔNG chạy trong task này (Owner/OP scope).
Spec v1.0 EV-07 đã ghi tên `pre-mp2-remediation-2026-08-28` cần xoá và
`hrp_mp2_test` (`br-misty-cell-az3nx5l3`) phải giữ. Runbook (STEP-03) sẽ
ghi đúng hai tên và post-check nhánh test còn tồn tại.

## EV-08 — DEMO data exact-ID inventory

Lệnh thậc thi ở STEP-05 (read-only inventory). Spec v1.0 đã ghi 2/5 slug
công khai không mang tiền tố `DEMO` nên dọn bằng prefix là không đủ;
cần exact-ID manifest. Bằng chứng sẽ là `evidence/v11-ev08-demo-manifest.txt`
sau STEP-05.

## EV-09 — Scratch + root one-shot artifacts (path-only)

### scratch/

Có mặt tại `C:\CodeApp\HrP\scratch\` với nhiều artifact phân theo task/agent.
Bao gồm:
- Thư mục `f05`, `t1r4`..`t1r10` chứa script/evidence của các round trước.
- File rời: `apply-migration.log`, `bump-gl14-v11.py`, `check-rpc-schema-usage.mjs`,
  `commit-*.txt`, `cursor-*.py`, `cursor-*.txt`, `db-state-check.mjs`,
  `g-base-*.{css,tsx,ts}`, `git_status_{after,before,final}.txt`,
  `gl05-*`, `gl07-*`, `gl08-*`, `gl09-*`, `gl15-*`, `lint.log`, `unit.log`,
  `seed_*.js`, `temp.diff`, `ve-hrp.html`, `vercel.json`, `vitest.config.ts`,
  `vitest.integration.config.ts`, …
- Thư mục `__pycache__/` chứa `.pyc` của các cursor scripts.

Trạng thái git: scratch/ chưa được gitignore (kiểm tra `git check-ignore
-v scratch` → không có hit). Đây là mục RQ-07 sẽ bổ sung ignore exact ở
STEP-04 (manifest attribution) trước khi dọn.

### Root one-shot files

Phát hiện mới so với spec v1.0:
- `.neon` (38 bytes, 2026-08-28) — untracked, có thể là snippet connection string.
- `tsconfig.tmp.json` (0 bytes) — untracked, tạo ngày 03/09.
- Ba `tsconfig.*probe.tsbuildinfo` (a1probe, t1probe, t1r9probe) — không
  có trong `git ls-files`, không có trong `git status` → có thể đã bị
  gitignore hoặc xoá từ lần scan trước.
- Nhiều file `check_*.{cjs,js,py,sql}`, `fix_*.{cjs,js,py,ps1}`, `update_*.{js,py}`,
  `write_*.{js,py,ps1}`, `mark_handover_m*.js`, `append_handover_m*.ps1`,
  `_m3_msg.txt`, `audit_report.md`, `extract_css.txt`, `build.log`, `lint.log`,
  `tsconfig.tmp.json`, `temp.diff`, `playwright.config.ts` (đã có commit scoped
  từ TEST-01 — KHÔNG thuộc nhóm one-shot), `vitest.config.ts` (committed
  bởi `rf-06`), `vitest.integration.config.ts` (committed trước đó).

Owner phân loại từng path một: KEEP / DELETE / UNKNOWN. Tier 2 không blanket
delete theo RQ-07.

Bằng chứng: `evidence/v11-ev09-scratch.txt` (output lệnh `Get-ChildItem`).

## EV-10 — Phát hiện mới so với v1.0

| ID | Phát hiện | Xử lý trong v1.1 |
|---|---|---|
| EV-10a | `.env.production` KHÔNG còn ở root (sạch so với scan trước 01/09) | Xác nhận trong EV-09 root top-level — không thêm việc |
| EV-10b | `.neon` untracked | Thêm vào RQ-02 ignore exact path hoặc KEEP/DELETE ở STEP-04 |
| EV-10c | `tsconfig.tmp.json` untracked | Thêm ignore exact ở STEP-01 hoặc xoá theo attribution |
| EV-10d | `scratch/` chưa gitignore | STEP-01 ignore exact path `scratch/` |
| EV-10e | `tsconfig.*probe.tsbuildinfo` ba file lạ tên | Xác minh Owner xem đã gitignore ở round trước chưa; nếu chưa thì thêm ignore exact |

## EV-11 — Baseline và state-of-tree

| Mục | Giá trị | Nguồn |
|---|---|---|
| Baseline gốc v1.0 | `7dd576e` | TASK v1.0 §0 |
| `HEAD` hiện tại | (sẽ đo ở STEP-00) | git rev-parse |
| Trạng thái index | (sẽ đo ở STEP-00) | git status --porcelain \| wc -l |
| Porcelain không phải scratch/cursor | (sẽ đo ở STEP-00) | git status --porcelain filter |

Baseline v1.1 giữ `7dd576e` vì đây là ảnh tại thời điểm v1.0 đã đo evidence.
Tier 2 STEP-00 sẽ ghi lại `HEAD` thật và đối chiếu.
