# Path Attribution Manifest — `hrp-v5-go-live-21-credential-hygiene-closure`

> **Mục đích:** Tier 2 prep lập manifest này cho Owner xem xét và quyết định KEEP/DELETE.
> Tier 2 KHÔNG xoá bất kỳ path nào — đó là OP execution, `OWNER_BLOCKED` cho tới khi Owner
> trả lời `Q-02`.
>
> **Quy tắc:** exact path, không glob, không prefix-only delete. UNKNOWN ownership → giữ.

## 1. Local `.env*.local` files

| Path | Size | Status | Owner disposition (Q-02) | Notes |
|---|---|---|---|---|
| `.env.local` | 1364 B | untracked | (chờ Owner) | Có thể chứa credentials local dev |
| `.env.ops06a-test.local` | 411 B | untracked | (chờ Owner) | Tên gợi ý test purpose — Owner xác nhận |
| `.env.production.local` | 1924 B | untracked | (chờ Owner) | Có chữ `production` trong tên — Owner xác nhận |

> `.env.test.local` không có mặt (đã xác nhận ở STEP-00 evidence).

## 2. Root one-shot artifacts (top-level)

| Path | Size | Tracked? | Tier 2 đề xuất | Notes |
|---|---|---|---|---|
| `.neon` | 38 B | untracked | UNKNOWN | Owner xác nhận nội dung; có thể là Neon CLI config |
| `tsconfig.tmp.json` | 0 B | untracked | UNKNOWN | 0 byte, có thể là scratch của TypeScript probe |
| `tsconfig.a1probe.tsbuildinfo` | 198867 B | untracked (gitignored line 11) | KEEP-IGNORE | Đã match `*.tsbuildinfo` ignore |
| `tsconfig.t1probe.tsbuildinfo` | 196798 B | untracked (gitignored line 11) | KEEP-IGNORE | Đã match `*.tsbuildinfo` ignore |
| `tsconfig.t1r9probe.tsbuildinfo` | 196798 B | untracked (gitignored line 11) | KEEP-IGNORE | Đã match `*.tsbuildinfo` ignore |

## 3. `scratch/` subdirs (path-only enumeration)

Mỗi entry: directory + số file trong đó + đề xuất Tier 2. Owner KEEP/DELETE sẽ được ghi vào cột
cuối sau khi trả lời.

| Subdir | Files | Tier 2 đề xuất | Lý do |
|---|---|---|---|
| `scratch/f05/` | 7 | UNKNOWN | Có `danger.json`, `hits.json`, `rls.json` — có vẻ probe rls scan; Owner xác nhận task gốc |
| `scratch/t1r4/` | 17 | UNKNOWN | Tên gợi ý test-01 round 4; Owner xác nhận đã được đóng bởi test-01 round 4 |
| `scratch/t1r5/` | 2 | UNKNOWN | test-01 round 5 |
| `scratch/t1r6/` | 2 | UNKNOWN | test-01 round 6 |
| `scratch/t1r7/` | 2 | UNKNOWN | test-01 round 7 |
| `scratch/t1r8/` | 7 | UNKNOWN | test-01 round 8 |
| `scratch/t1r9/` | 5 | UNKNOWN | test-01 round 9 |
| `scratch/t1r10/` | 2 | UNKNOWN | test-01 round 10 |
| `scratch/__pycache__/` | 5 (.pyc) | UNKNOWN | Python cache; Tier 2 không biết task tạo ra |
| `scratch/*.py` (root scratch) | many | UNKNOWN | Mỗi tên gợi ý task; Owner quyết định từng cái |
| `scratch/*.mjs`, `*.cjs`, `*.txt`, `*.log`, `*.pyc` | many | UNKNOWN | Mixed; từng path cần Owner disposition |

## 4. Owner disposition table (chờ Q-02 + Q-04)

```
LOCAL-01   .env.local                              KEEP | DELETE
LOCAL-02   .env.ops06a-test.local                  KEEP | DELETE
LOCAL-03   .env.production.local                   KEEP | DELETE
ROOT-01    .neon                                   KEEP | DELETE | MOVE
ROOT-02    tsconfig.tmp.json                       KEEP | DELETE
SCRATCH-01 scratch/f05/                            KEEP | DELETE | UNKNOWN
SCRATCH-02 scratch/t1r4/                           KEEP | DELETE | UNKNOWN
SCRATCH-03 scratch/t1r5/                           KEEP | DELETE | UNKNOWN
SCRATCH-04 scratch/t1r6/                           KEEP | DELETE | UNKNOWN
SCRATCH-05 scratch/t1r7/                           KEEP | DELETE | UNKNOWN
SCRATCH-06 scratch/t1r8/                           KEEP | DELETE | UNKNOWN
SCRATCH-07 scratch/t1r9/                           KEEP | DELETE | UNKNOWN
SCRATCH-08 scratch/t1r10/                          KEEP | DELETE | UNKNOWN
SCRATCH-09 scratch/__pycache__/                    KEEP | DELETE | UNKNOWN
SCRATCH-10 scratch/<each top-level file>           KEEP | DELETE | UNKNOWN (path-by-path)
```

## 5. Nguyên tắc xử lý khi nhận disposition

- **KEEP + tracked:** KHÔNG xoá file trong worktree; đã trong `.gitignore` exact-name (STEP-01 đã
  thêm cho `scratch/`, `.neon`, `tsconfig.tmp.json`).
- **KEEP + untracked:** file vẫn ở worktree, Owner quản lý. Tier 2 KHÔNG chạm.
- **DELETE + tracked:** Tier 2 KHÔNG xoá tracked file; Owner cần quyết định có `git rm` hay chuyển
  sang untrack rồi xoá.
- **DELETE + untracked:** Tier 2 KHÔNG xoá; Owner xoá trong OP execution (`STEP-10`).

## 6. Evidence

- STEP-00 baseline (`evidence/go21-s00-baseline.txt`) ghi toàn bộ scratch path và root one-shot paths.
- STEP-01 evidence ghi `git check-ignore -v` cho `.env.dev`, `.env.preview`, `scratch/`, `.neon`, `tsconfig.tmp.json`.

## 7. Cảnh báo

- KHÔNG dùng `git clean -fdx`, `rm -rf`, hay prefix-only delete. Tier 3 sẽ FAIL nếu bất kỳ artifact KEEP/UNKNOWN bị mất.
- KHÔNG rewrite Git history trong task này (DEC-07). Secret còn trong history là finding riêng của `RISK-05`.
