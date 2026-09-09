# HANDOFF: hrp-v5-go-live-11-public-rpc-residual-grant

> **Bước áp lên DB là hành động của Owner, không phải của Tier 2.** Phần mã của contract đã xong và
> xanh, nhưng `RQ-08`/`RQ-09` đòi dán `migration.sql` trong **Neon Console SQL Editor** trên branch
> `hrp-live` (`DEC-07`) — Tier 2 không có trình duyệt, và harness chặn mọi lệnh nối DB production
> (`EV-07`). Vì vậy `AC-03`, `AC-05`, `AC-08`, `AC-09` **chưa đóng được**, và dòng cuối của handoff
> này là `BLOCKED`, không phải `READY_FOR_AUDIT`. §3.1 là khối dán sẵn để Owner thao tác.
>
> **Chưa có byte nào đổi trên bất kỳ database nào.** Không lệnh nào trong round này chạm tới
> `hrp-live`, `hrp_mp2_test` hay branch Neon nào khác. Mọi evidence dưới đây là tĩnh — đọc file,
> `tsc`, `vitest` — cộng ba phép đo HTTP công khai ghi làm **baseline TRƯỚC khi áp**.
>
> **Hai phát hiện Tier 1 phải đọc TRƯỚC khi Owner dán** (chi tiết `F-01`, `F-03` ở §5): (1)
> PostgreSQL 16 tự cấp membership kèm ADMIN OPTION cho role đã tạo ra `hrp_public_rpc`, nên "thu hồi
> mọi thành viên" có thể lấy luôn quyền quản trị role đó và làm chính đường lùi `DEC-10` không chạy
> được; (2) `/api/jobs/apply` mà `STEP-04` chỉ định là endpoint đã RETIRE — trả `410` cố định, không
> import Prisma — nên nó không thể phát hiện `RISK-01`.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-11-public-rpc-residual-grant` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version đã thực thi | `v1.0` (đọc lại tại thời điểm viết handoff) |
| Execution round | `1` |
| Audit round | `0` |
| Baseline contract | `0248948` — `git merge-base --is-ancestor 0248948 HEAD` exit `0` |
| HEAD lúc viết | `799416c` (= `origin/main`, `git rev-list --count origin/main..HEAD` = `0`) |
| Executor | Tier 2 — Engineer |
| Status | `BLOCKED` — chờ Owner dán trong Neon Console (§3.1) |
| AC đã đóng | `AC-01`, `AC-02`, `AC-04`, `AC-06`, `AC-07`, `AC-10`, `AC-11` (7/11) |
| AC chưa đóng | `AC-03`, `AC-05`, `AC-08` (cần Console), `AC-09` (cần đo lại SAU khi áp) |

## 1. Outcome Summary

Hai file mới, không sửa file migration nào đang có:

1. `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql` — thu hồi
   membership của `hrp_public_rpc` khỏi mọi role đang là thành viên, bằng một khối `DO` lặp trên
   `pg_auth_members` join `pg_roles` với `format('REVOKE hrp_public_rpc FROM %I', ...)`. Bọc trong
   `IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_public_rpc')`, idempotent, và kết bằng
   câu `SELECT count(*) AS hrp_public_rpc_members_remaining`. Zero match trên danh sách token cấm.
2. `prisma/migrations-permission-hygiene.static.test.ts` — hàng rào chống tái diễn: đọc mọi
   `migration.sql` bằng filesystem thật, FAIL nếu một file dùng `WITH SET FALSE` mà không thu hồi
   membership trong cùng file và không có tên trong allowlist, và FAIL nếu allowlist có mục ruỗng.

Cộng một file phải sửa để test chạy được ở lane canonical: `vitest.unit.config.ts` (+3/−1, `RQ-07`).

`npm run typecheck` exit `0`. `npm run test:unit` exit `0`, `1476 passed (1476)` trên `99` test file.

## 2. Execution Trace

| STEP | Việc đã làm | Kết quả |
|---|---|---|
| gate | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-11-public-rpc-residual-grant\TASK.md` | `RESULT: PASS`, exit `0` |
| đọc | Đọc TASK v1.0 toàn văn (159 dòng), rồi đọc chính hai file nguồn lỗi tại `:238-258` và `:41-58` để tự xác nhận `EV-01`/`EV-02`/`EV-04` | Idiom `WITH SET FALSE` xác nhận ở đúng 2 file, `Grep` toàn `prisma/` cho đúng 2 hit |
| `STEP-01` | Viết `migration.sql` (103 dòng, 5212 byte) theo `RQ-01..RQ-05`; header ghi nguồn lỗi + lý do "về 0 thành viên" | AC-02/03/04/05 đo tĩnh: PASS |
| `STEP-02` | Viết test tĩnh; chạy RED với allowlist rỗng, rồi GREEN sau khi thêm hai mục có lý do | RED exit `1` nêu đúng 2 file; GREEN exit `0` |
| `STEP-02b` | `RQ-07`: chứng minh lane không tự bắt file, rồi thêm `prisma/**/*.test.ts` vào `include` | Trước: `No test files found, exiting with code 1`. Sau: file xuất hiện trong `Test Files` |
| `STEP-03a` | `npm run typecheck` rồi `npm run test:unit`, đọc `$LASTEXITCODE` ngay, không pipe (`RISK-12`) | `TSC_EXIT=0`, `UNIT_EXIT=0`, `1476 passed (1476)` |
| `STEP-03b` | Áp lên `hrp-live` | **KHÔNG THỰC HIỆN ĐƯỢC** — xem `BLOCKER-01` |
| `STEP-04` | Đo baseline ba đường công khai TRƯỚC khi áp; phát hiện endpoint mà `STEP-04` chỉ định đã retire (`F-03`) | `404` / `404` / `410` — chi tiết ở `AC-09` |
| `STEP-05` | Viết handoff này; không commit, không push, không stage | `git rev-list --count origin/main..HEAD` = `0`, `git diff --cached --stat` = 0 dòng |

## 3. Acceptance Evidence

### AC-01 — đúng hai path mới trong `prisma/`, không file migration cũ nào bị sửa

```
PS> git status --short -- prisma/
?? prisma/migrations-permission-hygiene.static.test.ts
?? prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/

PS> git diff --stat -- prisma/migrations
PS> (git diff --stat -- prisma/migrations | Measure-Object -Line).Lines
0
```

Không dòng nào mang cờ `M` trong scope `prisma/`. Bảng liệt kê đầy đủ ở §4.
**Ghi rõ để Tier 3 không phải đoán:** `vitest.unit.config.ts` nằm NGOÀI `prisma/` nên hai lệnh trên
không thấy nó — nó là file thứ ba tôi sửa trong round này, `RQ-07` yêu cầu, chi tiết ở `D-03`.

### AC-02 — khối `DO` + literal `format('REVOKE hrp_public_rpc FROM %I'`

```
PS> Select-String -Path prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql -Pattern "format\('REVOKE hrp_public_rpc FROM %I'" | % { "$($_.LineNumber): $($_.Line.Trim())" }
81:       EXECUTE format('REVOKE hrp_public_rpc FROM %I', v_member);

PS> Select-String -Path ...\migration.sql -Pattern "pg_auth_members" | Measure-Object | % Count
5
```

Vòng lặp thu hồi ở `:72-82`, đi trên `pg_auth_members` join `pg_roles` hai lần (role và member).

### AC-03 — idempotent (đo tĩnh phần làm được, phần chạy lần hai thuộc Owner)

Tĩnh: mọi câu lệnh tác động đều nằm trong khối `DO` được bọc bởi `IF EXISTS ... rolname =
'hrp_public_rpc'` ở `:39`, và vòng `FOR ... LOOP` chạy trên tập rỗng khi không còn thành viên nên
lần chạy thứ hai không phát lệnh `REVOKE` nào. Câu `SELECT` cuối là read-only.
**Chưa đóng được:** ngưỡng thật của `AC-03` là "chạy lần hai trong Console vẫn trả 0 và không lỗi" —
cần `hrp-live`. Xem `BLOCKER-01`.

### AC-04 — zero match trên danh sách token cấm (`RQ-04`)

```
$ grep -nE 'CREATE OR REPLACE FUNCTION|ALTER FUNCTION|CREATE POLICY|DROP|ALTER TABLE|INSERT|UPDATE|DELETE|GRANT' prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql; echo "AC04_GREP_EXIT=$?"
AC04_GREP_EXIT=1
```

Không dòng output nào; `grep` exit `1` = không tìm thấy = PASS.
**Tự khai (`L-01`):** tôi chạy thêm bản case-insensitive `grep -niE '...'` — nó có **đúng 1 hit**, là
dòng `1`, tên thư mục migration mà chính contract đặt (`..._grant_revoke`) xuất hiện trong comment
header. Đó là tên file trong chú thích, không phải câu lệnh. Tôi không đổi tên vì `RQ-01` chốt tên.

### AC-05 — số thành viên còn lại trên `hrp-live` = 0

**CHƯA ĐO ĐƯỢC.** Câu `SELECT` đáp ứng ngưỡng đã có sẵn ở `:99-103` của migration:

```sql
SELECT count(*) AS hrp_public_rpc_members_remaining
  FROM pg_auth_members m
  JOIN pg_roles r_role   ON r_role.oid   = m.roleid
  JOIN pg_roles r_member ON r_member.oid = m.member
 WHERE r_role.rolname = 'hrp_public_rpc';
```

Nó chỉ trả số khi chạy trên `hrp-live`. Xem `BLOCKER-01`; khối dán ở §3.1.

### AC-06 — RED trước, GREEN sau (`DEC-05`)

RED — allowlist `APPLIED_BEFORE_RULE` để rỗng, mọi thứ khác y nguyên:

```
> npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts
RED_EXIT=1
 ❯ prisma/migrations-permission-hygiene.static.test.ts (4 tests | 1 failed) 6ms
   × migration permission hygiene — WITH SET FALSE phải kèm REVOKE (RQ-06) > không file migration nào nâng membership rồi bỏ lại quyền tồn dư
     → Migration dùng 'WITH SET FALSE' mà không thu hồi membership trong cùng file: 20260823101500_mp2_apply_tracking (role hrp_public_rpc), 20260831103000_marketplace_search_tracking_profile (role hrp_public_rpc). ...
 Tests  1 failed | 3 passed (4)
```

Thông điệp fail nêu **đúng hai file** mà `EV-01`/`EV-02` chỉ ra, kèm tên role — đúng ngưỡng `AC-06`.

GREEN — chỉ khác một thứ: hai mục allowlist kèm lý do đã được thêm vào:

```
> npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts
GREEN_EXIT=0
 ✓ prisma/migrations-permission-hygiene.static.test.ts (4 tests) 4ms
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

### AC-07 — `npm run test:unit` exit 0, tổng ≥ 1421, file mới có mặt

```
PS> cmd /c "npm run test:unit > %TEMP%\gl11-unit.txt 2>&1"
PS> "UNIT_EXIT=$LASTEXITCODE"
UNIT_EXIT=0

 ✓ prisma/migrations-permission-hygiene.static.test.ts (4 tests) 4ms
 Test Files  99 passed (99)
      Tests  1476 passed (1476)
   Duration  20.08s
```

`1476 ≥ 1421`. Trước khi thêm test này lane có `1472`; `1472 + 4 = 1476`, không test nào bị mất.

**Bằng chứng `RQ-07` là bắt buộc, không phải tuỳ ý mở rộng scope.** Trước khi sửa config, lane không
nhìn thấy file dù tôi gọi tên nó tường minh:

```
PS> npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts
No test files found, exiting with code 1
PRELANE_EXIT=1
```

Nguyên nhân: đối số vị trí của Vitest **lọc** trên tập `include`, không mở rộng nó; `include` cũ chỉ
có `src/**` và `packages/**`. Sửa: thêm `prisma/**/*.test.ts` (`D-03`).

### AC-08 — output nguyên văn từ Neon Console

**CHƯA CÓ.** Contract nói thẳng: "Chỉ nói 'đã áp' mà không có output là FAIL". Tôi không dán, nên
tôi không có output, nên tôi không tuyên bố gì. Khối để Owner dán và chỗ để dán output: §3.1.

### AC-09 — hai đường công khai không được `500`

Đây là **baseline TRƯỚC khi áp**, mỗi đường một request, toàn bộ giá trị là giả:

```
$ curl -s -o /dev/null -w '%{http_code}' https://www.hrpartner.vn/api/public/applications/HRP-KHONG-CO-MA-NAY
404

$ curl -s -w '\n%{http_code}' -X POST https://www.hrpartner.vn/api/public/jobs/slug-khong-ton-tai-golive11/applications \
    -H 'Content-Type: application/json' \
    -d '{"idempotencyKey":"golive11-probe-0001","fullName":"Nguyen Van Probe","phone":"0900000001","consent":true,"cv":{"fileName":"probe.pdf","fileSize":1024,"contentType":"application/pdf","storageKey":"probe/golive11"}}'
{"error":"JOB_NOT_AVAILABLE"}
404

$ curl -s -w '\n%{http_code}' -X POST https://www.hrpartner.vn/api/jobs/apply -H 'Content-Type: application/json' -d '{}'
{"error":"APPLY_ENDPOINT_RETIRED","canonicalPath":"/api/public/jobs/{slug}/applications"}
410
```

`0` lần `500`. Đường thứ hai là đường **thật sự** chạy `hrp_public_apply_submission`: `404` đó do
chính hàm DEFINER `RAISE`ra `P0011` rồi service map lại — tức là hàm chạy được ở trạng thái hiện tại.
Đường thứ ba là đường mà `STEP-04` chỉ định, và nó vô dụng cho mục đích này — xem `F-03`.

**`AC-09` vẫn chưa đóng:** ngưỡng của nó là "sau khi áp". Ba lệnh trên phải chạy lại SAU khi Owner
dán, và chỉ khi đó mới so được. Nếu bất kỳ đường nào trả `500` thì theo `DEC-10` phải lùi ngay.

### AC-10 — không commit, không push

```
PS> git log origin/main..HEAD --oneline
PS> "LOG_AHEAD_COUNT=$((git rev-list --count origin/main..HEAD))"
LOG_AHEAD_COUNT=0
PS> "STAGED_LINES=$((git diff --cached --stat | Measure-Object -Line).Lines)"
STAGED_LINES=0
PS> git log -1 --oneline
799416c docs(planner): resolve go-live-12 ... (commit của Tier 1, không phải của tôi)
```

### AC-11 — `npm run typecheck` exit 0

```
PS> cmd /c "npm run typecheck > %TEMP%\gl11-tsc.txt 2>&1"
PS> "TSC_EXIT=$LASTEXITCODE"
TSC_EXIT=0
```

`tsconfig.json` có `include: ["**/*.ts", ...]` nên file test mới trong `prisma/` được tsc phủ.

### 3.1 Khối để Owner thao tác (đóng `AC-03`, `AC-05`, `AC-08`, và nửa sau của `AC-09`)

Neon Console → project `HRP-ERP` → **branch `hrp-live`** → SQL Editor. `RISK-02`: branch mặc định tên
`snapshot-rls-off-dont-use` có RLS tắt — **dán vào đó là dán sai chỗ**, kiểm tên branch trước khi bấm.

**Bước 1 — đọc trước, chưa đổi gì.** Chạy riêng, chụp lại output (`F-01` cần đúng bảng này):

```sql
SELECT r_member.rolname AS member, m.admin_option
  FROM pg_auth_members m
  JOIN pg_roles r_role   ON r_role.oid   = m.roleid
  JOIN pg_roles r_member ON r_member.oid = m.member
 WHERE r_role.rolname = 'hrp_public_rpc'
 ORDER BY 1;
```

Nếu PostgreSQL là 16+, chạy thêm bản này để thấy đúng hai cờ quyết định `F-02`:

```sql
SELECT r_member.rolname AS member, m.admin_option, m.inherit_option, m.set_option
  FROM pg_auth_members m
  JOIN pg_roles r_role   ON r_role.oid   = m.roleid
  JOIN pg_roles r_member ON r_member.oid = m.member
 WHERE r_role.rolname = 'hrp_public_rpc'
 ORDER BY 1;
```

> Nếu bước 1 trả **nhiều hơn một** dòng: **dừng, đừng dán bước 2.** Đó là `RISK-05` — có thành viên
> lạ. Gửi output cho Tier 1. Migration cũng tự chặn: nó `RAISE EXCEPTION` và rollback nguyên khối.

**Bước 2 — áp.** Mở `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql`,
copy **toàn văn** (103 dòng, kể cả comment), dán vào SQL Editor, chạy. Cần giữ lại hai thứ để đóng
`AC-08`: các dòng `NOTICE` (tab Notices/Messages) và bảng kết quả của câu `SELECT` cuối.

**Bước 3 — `AC-03`.** Dán lại **y hệt** lần nữa và chạy. Kỳ vọng: không lỗi, và
`hrp_public_rpc_members_remaining` vẫn `0`.

**Bước 4 — `AC-09` sau khi áp.** Chạy lại đúng ba lệnh `curl` ở mục `AC-09` trên. Kỳ vọng không đổi:
`404`, `404` + `JOB_NOT_AVAILABLE`, `410`. **Bất kỳ `500` nào = task FAIL**, lùi ngay theo bước 5.

**Bước 5 — đường lùi (`DEC-10`), chỉ chạy nếu bước 4 ra `500`.** Thay `<role>` bằng đúng tên mà bước
1 đã in, và mirror đúng các cờ đã đọc được:

```sql
-- PostgreSQL 16 cho phép nêu cả ba cờ; nếu bước 1 in admin_option = t thì giữ ADMIN TRUE.
GRANT hrp_public_rpc TO <role> WITH ADMIN TRUE, INHERIT FALSE, SET FALSE;
```

Nếu bản PostgreSQL không nhận cú pháp ba cờ thì dùng `GRANT hrp_public_rpc TO <role> WITH ADMIN
OPTION;` — lưu ý bản này bật lại inherit theo `rolinherit` của `<role>`, tức là rộng hơn trạng thái
trước khi áp. Sau khi lùi, báo Tier 1 để mở REVISION; đừng để trạng thái lùi trở thành trạng thái ổn
định không ai biết.

## 4. Changed Deliverables

| File | Trạng thái git | Quy mô | Vì sao |
|---|---|---|---|
| `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql` | `??` mới | 103 dòng / 5212 byte | `RQ-01..RQ-05` |
| `prisma/migrations-permission-hygiene.static.test.ts` | `??` mới | 121 dòng, 4 test / 3 describe | `RQ-06`, `DEC-05`, `DEC-06` |
| `vitest.unit.config.ts` | ` M` tracked | +3 / −1 | `RQ-07` — xem `D-03` |

Đúng ba file. Không file migration cũ nào bị chạm (`DEC-02`), không file mã ứng dụng nào bị chạm.

**Worktree còn bẩn từ các stream khác, không phải của round này** — tôi không stage, không revert,
không dọn: 12 file của go-live-10 (`app/**`, `src/**`, `app/globals.css`), 3 `AUDIT.md` và
`public/index.html` của các task trước, cùng thư mục `scratch/` untracked. `git status --short --
prisma/` ở `AC-01` là phép đo có scope nên nó không lẫn những thứ đó vào.

## 5. Deviations, Findings, Limitations

### D-01 — thêm chốt fail-closed mà `RQ-02` không nêu tường minh

`RISK-05` viết: "Nếu số trước lớn hơn 1, Tier 2 dừng và báo, không tự thu hồi mù." Tôi **không đo
được** con số đó (không có DB), và một dòng `NOTICE` thì không chặn được người đang dán. Nên tôi cài
`IF v_before > 1 THEN RAISE EXCEPTION` ở `:67-69`: `RAISE EXCEPTION` rollback nguyên khối `DO`, nên
trường hợp "thành viên lạ" kết thúc bằng **không thu hồi gì**, đúng nghĩa `RISK-05`. Đây là thêm một
câu lệnh điều kiện, không mở bán kính: vẫn chỉ một khái niệm — membership (`DEC-03`).

### D-02 — vòng `NOTICE` kiểm kê trước khi tác động

`:53-65` in mỗi thành viên kèm `admin_option`, `pg_has_role(..., 'USAGE')` và
`pg_has_role(..., 'MEMBER')`. Lý do dùng `pg_has_role` thay vì hai cột `inherit_option`/`set_option`:
hai cột đó chỉ có từ PostgreSQL 16, còn `pg_has_role` chạy trên mọi bản — file không được vỡ vì phiên
bản. Ba giá trị này là dữ liệu duy nhất phân biệt được `F-01`/`F-02`, và nếu không in ra trước khi
`REVOKE` thì mất vĩnh viễn.

### D-03 — sửa `vitest.unit.config.ts`, một file ngoài `prisma/`

`RQ-07` đòi test mới chạy trong lane `npm run test:unit`; lane đó không tự bắt `prisma/**` (bằng
chứng ở `AC-07`: `No test files found, exiting with code 1`). Thay đổi là **một dòng `include`** cộng
hai dòng comment; không sửa `env`, không sửa `exclude`, không sửa `poolOptions`. An toàn về mặt
fail-closed DB: file mới không mở kết nối nào — nó chỉ `readFileSync` — và nó không nằm trong
`vitest.integration-files.ts` (16 file DB-touching), nên nó thuộc đúng lane unit.

### F-01 — PostgreSQL 16 tự cấp ADMIN OPTION cho role tạo ra `hrp_public_rpc` (Tier 1 quyết)

Từ PostgreSQL 16, khi một role `CREATEROLE` không phải superuser tạo role mới, PostgreSQL ghi một
dòng `pg_auth_members` cấp cho **người tạo** membership của role mới **kèm ADMIN OPTION**, với
`INHERIT FALSE, SET FALSE`. Trên `hrp-live`, `hrp_public_rpc` do `OP-01` tạo, nên dòng đó gần như
chắc chắn tồn tại và thuộc `neondb_owner` — và đó chính là "1 thành viên" mà tôi dự đoán bước 1 sẽ in.

Hệ quả: `REVOKE hrp_public_rpc FROM neondb_owner` **cũng lấy luôn ADMIN OPTION**. Sau đó
`neondb_owner` có thể không còn quyền quản trị `hrp_public_rpc`, và hai thứ này có thể không chạy được
nữa: (a) đường lùi `DEC-10` — chính câu `GRANT` ở §3.1 bước 5 đòi admin trên role đích; (b) mọi
migration tương lai muốn `ALTER FUNCTION ... OWNER TO hrp_public_rpc` (chính idiom mà hai file MP-2
đã dùng). Trên Neon, `neondb_owner` không phải superuser, nên "cứ cấp lại" không hiển nhiên.

Tôi **vẫn viết đúng `RQ-02`** (thu hồi mọi thành viên) vì đó là mệnh lệnh contract, không phải chỗ tôi
tự quyết. Nhưng Tier 1 nên biết là có một phương án **hẹp hơn**, đóng đúng lỗ hổng mà không mất quyền
quản trị: `REVOKE INHERIT OPTION FOR hrp_public_rpc FROM <role>;` — nó tắt đường thừa hưởng đặc quyền
(thứ mà `EV-03` mô tả là rủi ro) và giữ nguyên ADMIN OPTION. Đổi sang phương án đó là sửa `RQ-02`/
`DEC-01`, tức là việc của Tier 1.

### F-02 — tiền đề "đang rò rỉ" là có điều kiện, cần output bước 1 mới kết luận được

Đặc quyền chỉ chảy theo membership khi cờ inherit của dòng membership bật. Hai lệnh trong MP-2 chỉ
nêu `WITH SET TRUE`/`WITH SET FALSE`, còn dòng auto-grant của PG16 mang `INHERIT FALSE`. Nếu dòng còn
lại trên live là `INHERIT FALSE` thì quyền tồn dư là **tiềm tàng** (ai đó bật lại inherit, hoặc dùng
`SET ROLE` nếu set_option bật, thì mới thành đường thật), không phải đang chảy. Nếu nó `INHERIT TRUE`
thì `EV-03` đúng nguyên văn: role đó đang thừa hưởng `SELECT, INSERT` trên `candidate_submissions`.

Cả hai nhánh đều dẫn tới cùng một kết luận về việc phải làm — thu hồi là đúng vệ sinh quyền. Tôi ghi
mục này vì mức độ khẩn khác nhau, và vì `AUDIT.md` không nên khẳng định "đang rò rỉ PII" khi bằng
chứng chưa có. Migration in đủ cờ nên output bước 1 sẽ tự phân xử.

### F-03 — `STEP-04` chỉ định một endpoint đã RETIRE, nên phép đo đó không phát hiện được `RISK-01`

`STEP-04` viết `POST /api/jobs/apply`. Đọc `app/api/jobs/apply/route.ts` (13 dòng): nó trả
`retiredApplyEndpointResponse()` cố định — `410 APPLY_ENDPOINT_RETIRED` — và **không import Prisma
hay service nào**, tức là không bao giờ chạm `hrp_public_apply_submission`. Nó thoả mặt chữ "4xx" của
`AC-09` kể cả khi việc thu hồi đã phá đường nộp đơn thật. Dùng nó làm bằng chứng cho `DEC-09` là đo
một đường không tồn tại.

Đường canonical là `POST /api/public/jobs/{slug}/applications`. Tôi đã đo cả hai (`AC-09`), và giữ
đường canonical làm phép đo có ý nghĩa: `404 JOB_NOT_AVAILABLE` ở đó là `P0011` do chính hàm DEFINER
`RAISE` ra, nên nó chứng minh hàm chạy được — đúng thứ `RISK-01` cần. Tôi không sửa `STEP-04`; sửa
contract là việc của Tier 1.

### L-01 — grep của `AC-04` là case-sensitive

Đã khai ở `AC-04`: bản case-insensitive có 1 hit là tên thư mục trong comment dòng 1. Tôi không im
lặng dựa vào case-sensitivity để lấy PASS.

### L-02 — mọi evidence của round này là tĩnh

Không có dòng nào trong handoff này chứng minh trạng thái DB. `_prisma_migrations` trên `hrp-live` sẽ
**không** có bản ghi cho migration này khi Owner dán tay trong Console (`RISK-04`/`Q-01` — ngoài
scope, contract đã ghi là follow-up).

## 6. Blockers

### BLOCKER-01 — bước áp cần Neon Console, Tier 2 không thao tác được

- **Chặn:** `RQ-08`, `RQ-09` (nửa sau) → `AC-03`, `AC-05`, `AC-08`, `AC-09` (nửa sau).
- **Vì sao:** `DEC-07` chốt cách áp là **Neon Console SQL Editor** trên branch `hrp-live`, và `DEC-08`
  cấm `prisma migrate deploy`. Console là giao diện web — Tier 2 không có trình duyệt. Còn mọi đường
  dòng lệnh thay thế đều bị harness chặn: `EV-07` ghi "Harness của mọi Agent trong repo này chặn mọi
  lệnh nối DB production". Đây là ràng buộc môi trường mà contract đã lường trước, không phải điểm
  chờ quyết định.
- **Tôi đã không làm gì để lách:** không `neonctl sql`, không `psql`, không script Node nối DB. Dùng
  `neonctl` sẽ là **cách áp khác** cách contract chốt, và là một thay đổi quyền trên production.
- **Cần ai:** Owner, theo §3.1. Sau khi có output, `AC-03`/`AC-05`/`AC-08`/`AC-09` đủ dữ liệu để Tier 3
  audit; phần mã không phải sửa gì thêm.
- **Đọc `F-01` trước khi dán.** Nếu Tier 1 muốn đổi sang phương án `REVOKE INHERIT OPTION FOR`, thì
  phải đổi contract TRƯỚC khi Owner dán — dán rồi mới đổi thì mất luôn thông tin cờ ban đầu.

## 7. Evidence Index

| ID | Lệnh | Exit | Nơi đọc |
|---|---|---|---|
| E-01 | `verify-task.ps1 -TaskPath ...TASK.md` | `0` | §2 |
| E-02 | `git status --short -- prisma/` | `0` | AC-01 |
| E-03 | `git diff --stat -- prisma/migrations` (0 dòng) | `0` | AC-01 |
| E-04 | `Select-String` literal `format('REVOKE ...` | `0` | AC-02 |
| E-05 | `grep -nE '<danh sách token cấm>' migration.sql` | `1` (no match) | AC-04 |
| E-06 | `npx vitest run --config vitest.unit.config.ts prisma/...` (RED) | `1` | AC-06 |
| E-07 | cùng lệnh, sau khi thêm allowlist (GREEN) | `0` | AC-06 |
| E-08 | cùng lệnh, TRƯỚC khi sửa config | `1` (`No test files found`) | AC-07 |
| E-09 | `npm run test:unit` | `0` | AC-07 |
| E-10 | `npm run typecheck` | `0` | AC-11 |
| E-11 | 3 × `curl` bề mặt công khai (baseline trước khi áp) | `0` | AC-09 |
| E-12 | `git log origin/main..HEAD` / `rev-list --count` / `diff --cached` | `0` | AC-10 |

## 8. Execution Round History

| Round | Spec | Kết cục |
|---|---|---|
| 1 | `v1.0` | `BLOCKED` — 7/11 AC đóng bằng phép đo tĩnh; 4 AC còn lại cần Owner dán trong Neon Console (`BLOCKER-01`). Không commit, không push. Ba phát hiện gửi Tier 1: `F-01`, `F-02`, `F-03`. |

> Handoff status: BLOCKED
