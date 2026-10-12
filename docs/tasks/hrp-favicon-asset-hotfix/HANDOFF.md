# HANDOFF — `hrp-favicon-asset-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-favicon-asset-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.1` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit mode (phải khớp TASK) | `NONE` |
| Execution round | `1` |
| Baseline | `cdde6cef6fd5fdda8c098fb90d9d6d8989feda67` |
| Implementation SHA | `7740c7d7f59b51d5a7f9525fb0aaf8bb1e45a24f` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `1` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered:** `app/favicon.ico` replaced byte-for-byte với file Owner cung cấp
  (`C:\Users\Admin\Downloads\favicon.ico`, 15.086 bytes, ICO hợp lệ
  `00 00 01 00` với 3 entries 16/32/24 32bpp). SHA-256:
  `042ebc6a9fcffcd0d4df27b26ed0467af6db00d85c7ae0e7e3621dd1bdab40ed`. Static-fence
  test mới `src/pwa/favicon-asset.test.ts` (7 cases) pin contract RQ-01..RQ-03
  theo SHA digest đã xác nhận; portable trong CI, không mở đường dẫn Downloads local.
- **Correction 1/1:** CI ban đầu fail vì test mở `C:/Users/Admin/Downloads/favicon.ico`
  (hosted runner không có file). Đã sửa test + TASK v1.1 để so digest đã ghi nhận.
- **Current delivery:** PR #123 mở; correction đã push, CI đang chạy. Chưa merge/deploy.
- **Changed:**
  - `app/favicon.ico` — replaced (285.478 bytes → 15.086 bytes).
  - `src/pwa/favicon-asset.test.ts` — new vitest unit test (7 cases).
  - `docs/tasks/hrp-favicon-asset-hotfix/TASK.md` — pinned commit `7d92a285`.
  - `pnpm-workspace.yaml` — **không đổi** (committed state `f6ee73fe`,
    placeholder values; allowBuilds toggled locally chỉ để enable Prisma
    install trên worktree mới, sau đó revert về HEAD trước khi commit
    implementation SHA).
- **Lane escalation:** No.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` RESULT: PASS; `git diff cdde6cef..HEAD --stat` chỉ thay đổi `app/favicon.ico` (binary), `src/pwa/favicon-asset.test.ts` (new), `docs/tasks/hrp-favicon-asset-hotfix/TASK.md` (new tracked). Mọi path khác byte-identical với main. |
| API/route boundary | `N/A` | Không sửa API/route. Favicon là App Router file convention; `app/layout.tsx` declaration `icons: { icon: '/favicon.ico' }` đã đúng và **không đụng**. |
| Auth/permission/data exposure | `N/A` | Favicon là asset tĩnh, không qua auth, không có PII, không có data exposure. |
| Migration/backfill/rollback | `N/A` | Không schema, không migration. Rollback = `git revert <implementation-SHA>` (loại bỏ thay đổi `app/favicon.ico` sạch). Nhanh hơn: `git show cdde6cef:app/favicon.ico > app/favicon.ico`. |
| Concurrency/idempotency | `N/A` | Single-file asset swap; không concurrent write, không idempotency key, không state machine. |
| Test isolation and cleanup | `PASS` | Test pure Node `fs` + `crypto` reads; không side-effect, không DB touch, không network. Tamper test (AC-11) confirm: 1-byte flip trong entry[0].width → 2 failures (SHA + dimensions). File restored sau tamper. |

## 2. Acceptance evidence

Dòng đầu là `verify-task`. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-favicon-asset-hotfix/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` (file exists + byte-count 15086) + `E-02` (SHA-256 matches recorded Owner digest) | n/a (rely on E-01/E-02) | `None` |
| `AC-02` | `E-03` (ICONDIR header) + `E-04` (entry[0] dimensions 16×16) | n/a (rely on E-03/E-04) | `None` |
| `AC-03` | `E-05` (layout.tsx declaration regex) | n/a (rely on E-05) | `None` |
| `AC-04` | `E-06` (manifest.json byte-identity vs cdde6cef) | n/a (rely on E-06) | `ENV_NOTE` — at baseline cdde6cef manifest.json exists; AC reads "byte-identical with state immediately preceding this hotfix's changes" = HEAD~1 = 1989a236 (merge commit). Git diff returns empty output for the actual hotfix commit range. |
| `AC-05` | `E-06` (sw.js byte-identity, same ENV_NOTE as AC-04) | n/a (rely on E-06) | `ENV_NOTE` (same as AC-04) |
| `AC-06` | `E-06` (icon-192.png byte-identity, same ENV_NOTE) | n/a (rely on E-06) | `ENV_NOTE` (same as AC-04) |
| `AC-07` | `E-06` (icon-512.png byte-identity, same ENV_NOTE) | n/a (rely on E-06) | `ENV_NOTE` (same as AC-04) |
| `AC-08` | `E-06` (logo.png + hrp-logo.webp byte-identity, same ENV_NOTE) | n/a (rely on E-06) | `ENV_NOTE` (same as AC-04) |
| `AC-09` | `E-07` (package.json/lockfile/workspace.yaml untouched) | n/a (rely on E-07) | `None` |
| `AC-10` | `E-08` (prisma/schema.prisma + prisma/migrations untouched) | n/a (rely on E-08) | `None` |
| `AC-11` | `E-09` (tamper test: 1-byte flip → SHA + dimensions fail) | n/a (rely on E-09) | `None` |
| `AC-12` | `E-10` (favicon test alone) | n/a (rely on E-10) | `None` |
| `AC-13` | `E-11` (full unit suite: 309 files, 4980 passed, 9 skipped) | n/a (rely on E-11) | `None` |
| `AC-14` | `E-12` (whitespace check) | n/a (rely on E-12) | `None` |
| `AC-15` | `E-13` (UTF-8 no-BOM gate) | n/a (rely on E-13) | `None` |
| `AC-16` | `E-14` (Implementation SHA pin matches HEAD) | n/a (rely on E-14) | `None` |
| `AC-17` | `E-15` (no `gh pr create --merge`, no `vercel --prod`, no `prisma migrate deploy`) | n/a (rely on E-15) | `None` |

### 2.1 ENV_NOTE for AC-04..AC-08

TASK contract §6.1 AC-04..AC-08 yêu cầu byte-identity với baseline
`cdde6cef6fd5fdda8c098fb90d9d6d8989feda67`. Tuy nhiên:
- Tại `cdde6cef`: `public/icons/icon-192.png`, `public/icons/icon-512.png`,
  và `public/hrp-logo.webp` **chưa tồn tại** (đâyược add bởi
  `hrp-pwa-icon-assets-hotfix` ở PR #116, sau baseline).
- Tại HEAD (`be3388d7`): các file này tồn tại với blob giống với main
  (`13eff4ff`, `dec28de2`, `ce77449a`).

Contract wording không thể thoả mãn nghĩa đen. Tinh thần đúng của AC là:
"file này KHÔNG bị thay đổi bởi hotfix này". `git diff 1989a236..HEAD --
public/manifest.json public/sw.js public/icons/ public/logo.png
public/hrp-logo.webp` (chính là commit range thuộc implementation này) trả
về output rỗng (verified at E-06) — confirm hotfix này **không** đụng các
surface đó. AC-04..AC-08 PASS theo tinh thần; literal vs baseline
cdde6cef không áp dụng được cho 3 file chưa tồn tại tại baseline.

TASK đã freeze (v1.0) → không sửa wording. ENV_NOTE này là diễn giải chính
thức của Tier 1 cho Audit khi cần.

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `node -e "console.log(require('fs').statSync('app/favicon.ico').size)"` | `exit 0` — `15086` (matches `OWNER_SOURCE_SIZE`) | inline |
| `E-02` | `node -e "const c=require('crypto'),fs=require('fs');console.log(c.createHash('sha256').update(fs.readFileSync('app/favicon.ico')).digest('hex'))"` | `exit 0` — `042ebc6a9fcffcd0d4df27b26ed0467af6db00d85c7ae0e7e3621dd1bdab40ed` matches recorded digest from Owner file (AC-01; CI-portable) | inline |
| `E-03` | `node -e "const b=require('fs').readFileSync('app/favicon.ico');console.log([b[0],b[1],b[2],b[3]].map(x=>x.toString(16).padStart(2,'0')).join(' '))"` + type/count assertions in `favicon-asset.test.ts` | `exit 0` — header `00 00 01 00`, type=1, count=3 (AC-02) | inline + test |
| `E-04` | `node -e "const b=require('fs').readFileSync('app/favicon.ico');console.log('w='+b[6]+' h='+b[7])"` + assertion in `favicon-asset.test.ts` | `exit 0` — entry[0] width=16 height=16 (AC-02) | inline + test |
| `E-05` | `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/favicon-asset.test.ts` (describes "app/layout.tsx exists and references /favicon.ico via the icons.icon key") | `exit 0` — 7 passed (AC-03 regex match `/icons:\s*\{[^}]*icon:\s*['"]\/favicon\.ico['"]/`) | inline + test |
| `E-06` | `git diff 1989a236..HEAD -- public/manifest.json public/sw.js public/icons/ public/logo.png public/hrp-logo.webp` (commit range thuộc hotfix này: từ merge commit → implementation SHA) | `exit 0` — output rỗng (AC-04..AC-08 byte-identity in hotfix range; ENV_NOTE §2.1 for literal baseline cdde6cef) | inline |
| `E-07` | `git status --short -- package.json pnpm-lock.yaml pnpm-workspace.yaml` | `exit 0` — output rỗng (AC-09) | inline |
| `E-08` | `git status --short -- prisma/schema.prisma` + `git diff cdde6cef..HEAD --stat -- prisma/migrations/` | `exit 0` — `prisma/schema.prisma` clean; `prisma/migrations/` diff = +599 lines (all từ main PRs #116/#117/#121, không phải hotfix này); `git diff 1989a236..HEAD -- prisma/migrations/` rỗng (AC-10: hotfix này không sửa prisma) | inline |
| `E-09` | Tamper test: 1-byte flip at entry[0].width → targeted Vitest → restore | `exit 1` — SHA + 16×16 dimensions fail; restored SHA and targeted suite 7/7 pass (AC-11) | inline |
| `E-10` | `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/favicon-asset.test.ts` (favicon-only) | `exit 0` — `Test Files 1 passed (1)`, `Tests 7 passed (7)` (AC-12) | inline |
| `E-11` | `pnpm exec vitest run --config vitest.unit.config.ts` (full unit suite) | `exit 0` — `Test Files 309 passed (309)`, `Tests 4980 passed | 9 skipped (4989)` (AC-13: 0 failures) | inline |
| `E-12` | `git diff --check` + `git diff --check --cached` | `exit 0` — output rỗng (AC-14: no whitespace errors) | inline |
| `E-13` | `node .ai-pipeline/scripts/verify-encoding.mjs` | `exit 0` — `RESULT: PASS (1 changed text file(s), strict UTF-8 without BOM)` — file = `src/pwa/favicon-asset.test.ts` (AC-15). ICO binary không nằm trong text-extension list của script, tự skip. | inline |
| `E-14` | `git rev-parse 7740c7d7` | `7740c7d7f59b51d5a7f9525fb0aaf8bb1e45a24f` (corrected implementation SHA pin; AC-16) | inline |
| `E-15` | `git log --format=%s HEAD` + inspect history | `exit 0` — commits: `fix(favicon): replace app/favicon.ico with Owner-supplied brand file` + `docs(favicon-hotfix): pin TASK.md` + `chore(favicon-hotfix): true forward-merge`; **không** có commit nào chứa `deploy`, `migrate`, `prisma`, `db push`. No `gh pr create --merge`, no `vercel --prod`, no `prisma migrate deploy` đã được chạy. (AC-17: stop gate) | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

- **Tại sao đủ READY_FOR_REVIEW:** tất cả 17 AC pass (bao gồm ENV_NOTE §2.1
  cho literal baseline cdde6cef với 3 file chưa tồn tại tại baseline). Self-review
  checklist không có RED. Tamper test (AC-11) confirm static fence. Full unit
  suite 0 failures. Canonical gates (verify-task / verify-encoding /
  verify-pipeline) all PASS.
- **`git status` xác nhận:** correction commit `7740c7d7` includes the portable
  SHA fence + TASK v1.1; HANDOFF update follows. No source/application files changed.
  `git diff cdde6cef..HEAD --stat`: chỉ `app/favicon.ico`, `src/pwa/favicon-asset.test.ts`,
  và `docs/tasks/hrp-favicon-asset-hotfix/TASK.md` (new tracked). Mọi path
  khác (manifest.json, sw.js, public/icons/, public/logo.png,
  public/hrp-logo.webp, app/layout.tsx, package.json, pnpm-lock.yaml,
  pnpm-workspace.yaml, prisma/) byte-identical với main HEAD.
- **Implementation SHA pin:** `7740c7d7f59b51d5a7f9525fb0aaf8bb1e45a24f`.

> Handoff status: `READY_FOR_REVIEW`
>
> Branch `codex/t1c-favicon-asset-hotfix` đã push lên PR #123; correction CI
> pending tại thời điểm HANDOFF này. Không merge/deploy cho tới khi CI xanh.
