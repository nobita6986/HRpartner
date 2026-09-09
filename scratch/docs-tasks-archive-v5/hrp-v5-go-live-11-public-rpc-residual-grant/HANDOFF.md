# HANDOFF: hrp-v5-go-live-11-public-rpc-residual-grant

> **Round 2 sửa đúng lỗi mà Tier 1 chặn ở Round 1.** Migration Round 1 thu hồi **mọi** membership của
> `hrp_public_rpc` dựa trên tiền đề "tập thành viên đúng là tập rỗng". Tiền đề đó SAI (`PLN-01`): trên
> `hrp-live` có hai record cùng member `neondb_owner` nhưng khác grantor. Bản Round 2 thu hồi theo
> **hình dạng record**, chỉ lấy self-grant `neondb_owner → neondb_owner`
> (`admin=false, inherit=true, set=false`) và **giữ nguyên** `cloud_admin → neondb_owner`
> (`admin=true, inherit=false, set=false`) — tức giữ đường quản trị role và đường lùi `DEC-10`.
>
> **Chưa có byte nào đổi trên bất kỳ database nào.** Round này không chạy một lệnh nối DB nào. Mọi
> evidence dưới đây là tĩnh (đọc file, `tsc`, `vitest`, `git`) cộng ba phép đo HTTP công khai ghi làm
> **baseline TRƯỚC khi áp**. Bước áp `RQ-08` là thao tác của Owner trong Neon Console (`DEC-07`,
> `EV-07`) ⇒ `AC-03`, `AC-05`, `AC-08` và **nửa sau khi áp** của `AC-09` còn mở, ghi rõ ở `L-01`.
> Khối dán sẵn ở §3.1.
>
> **Một defect contract phải Tier 1 sửa, không phải Tier 2 lách:** `AC-04` cấm token `GRANT` trong
> `migration.sql`, còn `RQ-02`/`AC-02` **bắt buộc** literal `GRANTED BY` — mà `GRANTED BY` chứa chuỗi
> `GRANT`. Hai AC không thể cùng PASS theo mặt chữ. Tôi giữ nguyên literal mà `RQ-02` yêu cầu, dán
> nguyên văn cả hai phép grep, và ghi thành `D-01`.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-11-public-rpc-residual-grant` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `2` |
| Current audit round | `1` — **deliverable không hợp lệ**: `AUDIT.md` = 0 byte và untracked (`PLN-04`) |
| Executor | Tier 2 — Engineer |
| Baseline | Contract ghi `0248948`. Trạng thái thật lúc bắt đầu: `HEAD = 79b05b3` ("docs(planner): open go-live-10 execution round 2…"). `git merge-base --is-ancestor 0248948 HEAD` → exit `0`, nên `0248948` là tổ tiên của HEAD; delta ở giữa là công việc doc/code của go-live-10/12/13, không chạm hai file của task này (`L-02`) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-01 00:15 +07` → `2026-09-01 01:22 +07` |

## 1. Outcome Summary

Đã viết lại toàn bộ `migration.sql` (Round 1: 103 dòng → Round 2: **204 dòng**) và giữ nguyên logic
test tĩnh của Round 1 sau khi **sửa mojibake** trong hai chuỗi allowlist (`D-03`).

Bản Round 2 làm đúng ba việc và không làm gì khác:

1. **In kiểm kê TRƯỚC khi tác động** — mỗi record một dòng `NOTICE`, kèm `grantor`, để người vận hành
   đối chiếu với hình dạng `[1]`/`[2]` ở header *trước khi* có bất kỳ thay đổi nào.
2. **Fail-closed theo hình dạng, không theo số đếm** — `v_unexpected` đếm record `inherit_option = true`
   mà KHÔNG khớp hình dạng self-grant; `> 0` ⇒ `RAISE EXCEPTION` và **không thu hồi gì**. Đây chính là
   chỗ migration Round 1 vỡ: nó đếm thô, thấy `2` rồi tự dừng (`PLN-02`).
3. **Thu hồi đúng một record** — vòng lặp chọn thêm điều kiện `r_grantor.rolname = r_member.rolname`,
   và đó là thứ bảo toàn record của `cloud_admin`.

Chưa hoàn thành: bước áp lên `hrp-live` (`RQ-08`) và nửa sau của phép đo `RQ-09`. Cả hai cần Owner dán
trong Neon Console; xem `L-01` và khối dán §3.1.

Không commit, không push, không chạm `TASK.md`, không chạm `AUDIT.md`, không chạm file migration cũ.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql` — thư mục mới, đúng một file | `DONE` | None |
| `STEP-01` | `RQ-02` | cùng file, dòng `143`: `EXECUTE format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I', v_rec.member, v_rec.grantor);` — vòng lặp ở dòng `128-144` lọc `r_grantor.rolname = r_member.rolname AND m.inherit_option AND NOT m.admin_option AND NOT m.set_option` | `DONE` | None |
| `STEP-01` | `RQ-03` | cùng file, dòng `60` `IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_public_rpc')`; hai chốt fail-closed ở dòng `117-119` (`v_unexpected > 0`) và `121-123` (`v_residual > 1`) | `DONE` | None |
| `STEP-01` | `RQ-04` | grep token cấm | `DONE` với một match không tránh được | `D-01` — `GRANTED BY` mà `RQ-02` bắt buộc chứa chuỗi `GRANT` |
| `STEP-01` | `RQ-05` | cùng file, dòng `186-204` — câu cuối, bốn alias `total`, `residual_self_grant`, `inheritable`, `safe_admin` | `DONE` | None |
| `STEP-01` | — | Header dòng `1-49`: phân biệt hai record theo `grantor`, và dòng `26-29` **đính chính** luận điểm "tập thành viên đúng là tập rỗng" của Round 1 | `DONE` | None (yêu cầu văn bản của `STEP-01`) |
| `STEP-02` | `RQ-06` | `prisma/migrations-permission-hygiene.static.test.ts` — 125 dòng, 4 test | `DONE` | `D-03` — sửa mojibake trong hai chuỗi allowlist do Round 1 để lại |
| `STEP-02` | `RQ-06` | RED trước GREEN, cùng một lệnh, output nguyên văn ở `AC-06` | `DONE` | None |
| `STEP-02` | `RQ-07` | `vitest.unit.config.ts` — thêm `'prisma/**/*.test.ts'` vào `include` | `DONE` | `D-02` — file nằm ngoài `prisma/`; `RQ-07` yêu cầu đúng thao tác này |
| `STEP-03` | `AC-11`/`AC-07` | `npm run typecheck` rồi `npm run test:unit`, đọc `$LASTEXITCODE` ngay, không pipe | `DONE` | None |
| `STEP-03` | `RQ-08` | Áp lên `hrp-live` trong Neon Console | `BLOCKED` | `L-01` — Tier 2 không có trình duyệt, harness chặn mọi lệnh nối DB production (`EV-07`) |
| `STEP-04` | `RQ-09` | 3 phép đo `curl.exe` — **baseline TRƯỚC khi áp** | `DONE (một nửa)` | `L-01` — nửa sau (đo lại SAU khi áp) chờ Owner |
| `STEP-05` | `RQ-10` | HANDOFF này; `git log origin/main..HEAD` rỗng | `DONE` | None |
| — | — | Kiểm tra bù cho lớp lỗi go-live-03 (thiếu một `)` ⇒ `42601` chỉ lộ ở runtime): `scratch/golive11-sql-balance.mjs` | `DONE` | Công cụ verify, **không phải deliverable**; xem `§4` |

## 3. Acceptance Evidence

Mọi lệnh dưới đây chạy tại `c:\CodeApp\HrP`, shell PowerShell 5.1 (trừ các lệnh `grep`/`node` chạy trong
Git Bash, ghi rõ ở từng dòng). `$LASTEXITCODE` đọc **ngay sau** mỗi lệnh, **không pipe** — pipe làm
`$?`/`$LASTEXITCODE` bắt exit code của lệnh cuối chuỗi ống.

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-11-public-rpc-residual-grant\TASK.md` | `RESULT: PASS` / exit `0` | §3 · `E-01` | None |
| `AC-01` | `git status --short -- prisma/` + `git diff --stat -- prisma/migrations` | exit `0` / `0`; đúng hai dòng `??`, `git diff --stat` **rỗng** | §3 · `E-02`, `E-03` | None |
| `AC-02` | `grep -n "format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I'" migration.sql` | exit `0`, một match ở dòng `143` | §3 · `E-04` | None |
| `AC-03` | Áp lần thứ hai trong cùng session Console | **Chờ Owner** | Lập luận idempotent tĩnh ở §3 · `AC-03` | `L-01` |
| `AC-04` | `grep -nE 'CREATE OR REPLACE FUNCTION\|ALTER FUNCTION\|CREATE POLICY\|DROP\|ALTER TABLE\|INSERT\|UPDATE\|DELETE\|GRANT' migration.sql` | exit `0`, **một** match — dòng `143`, đúng literal mà `RQ-02` bắt buộc | §3 · `E-05a`, `E-05b` | `D-01` — defect contract, Tier 1 phải phân xử |
| `AC-05` | Output câu `SELECT` cuối khi chạy trên `hrp-live` | **Chờ Owner** | Ngưỡng và dòng còn lại ở §3.1 | `L-01`, `L-03` |
| `AC-06` | `npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts` (hai lần, quanh allowlist) | RED exit `1` nêu đúng hai tên file; GREEN exit `0` | §3 · `E-06`, `E-07` | None |
| `AC-07` | `npm run test:unit` | exit `0`; `Test Files 99 passed (99)`, `Tests 1480 passed (1480)` ≥ `1421`; file test mới có trong danh sách | §3 · `E-08` | None |
| `AC-08` | Output nguyên văn Console sau khi dán, kèm timestamp | **Chờ Owner** | §3.1 | `L-01` |
| `AC-09` | 3 × `curl.exe` | tracking `404`; apply canonical `404 JOB_NOT_AVAILABLE`; retired `410`. **Zero `500`** | §3 · `E-09`, `E-10`, `E-11` | `L-01` — đây là baseline TRƯỚC khi áp; nửa sau chờ Owner |
| `AC-10` | `git log origin/main..HEAD` | exit `0`, **rỗng** | §3 · `E-12` | None |
| `AC-11` | `npm run typecheck` | exit `0` | §3 · `E-13` | None |

### `verify-task.ps1` — dòng đầu bắt buộc (`E-01`)

```
PS> .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-11-public-rpc-residual-grant\TASK.md
TASK CONTRACT CHECK: .\docs\tasks\hrp-v5-go-live-11-public-rpc-residual-grant\TASK.md

RESULT: PASS. TASK contract is ready for execution.
VERIFYTASK_LASTEXITCODE=0
```

Chạy lại lúc `2026-09-01 01:20 +07:00`.

### `AC-01` — chỉ hai đường dẫn mới, không file migration cũ nào bị sửa (`E-02`, `E-03`)

```
PS> git status --short -- prisma/
?? prisma/migrations-permission-hygiene.static.test.ts
?? prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/
GITSTATUS_LASTEXITCODE=0

PS> git diff --stat -- prisma/migrations
GITDIFF_LASTEXITCODE=0
```

`git diff --stat -- prisma/migrations` in **zero dòng** ⇒ không một file migration đang có nào ở trạng
thái `M`. Hai đường dẫn mới đều là `??` (untracked), đúng số lượng contract yêu cầu.

### `AC-02` — literal `GRANTED BY` có mặt (`E-04`)

```
$ grep -n "format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I'" prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql
143:      EXECUTE format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I', v_rec.member, v_rec.grantor);
grep_exit=0
```

Khối `DO` phân biệt `member` và `grantor` bằng hai `JOIN` riêng (`r_member` trên `m.member`,
`r_grantor` trên `m.grantor`), và vòng lặp thu hồi ở dòng `128-144` lọc:

```sql
       WHERE r_role.rolname = 'hrp_public_rpc'
         AND r_grantor.rolname = r_member.rolname
         AND m.inherit_option
         AND NOT m.admin_option
         AND NOT m.set_option
```

Điều kiện `r_grantor.rolname = r_member.rolname` là thứ **loại record `cloud_admin → neondb_owner` ra
khỏi tập thu hồi**. `%I` trích dẫn định danh nên tên role lạ không chèn được câu lệnh.

### `AC-03` — idempotent (lập luận tĩnh; phép đo thật chờ Owner)

Không đóng được bằng lệnh vì cần DB. Lập luận đọc từ chính mã nguồn:

- Vòng lặp thu hồi lấy tập record theo **hình dạng**. Sau lần chạy thứ nhất, `REVOKE … GRANTED BY` xoá
  đúng row đó khỏi `pg_auth_members` ⇒ lần chạy thứ hai tập rỗng ⇒ thân vòng lặp không chạy một lần
  ⇒ không `EXECUTE`, không `NOTICE 'THU HOI'`, không exception.
- Hai chốt fail-closed đều là `>` chứ không phải `=`: `v_unexpected > 0` và `v_residual > 1`. Sau lần
  một, `v_unexpected = 0` và `v_residual = 0` ⇒ không chốt nào bắn. Đây đúng là chỗ Round 1 vỡ: nó
  dùng `IF v_before > 1 THEN RAISE EXCEPTION` trên **số đếm thô**, nên hai record hợp lệ làm nó tự dừng.
- Toàn bộ bọc trong `IF EXISTS (… pg_roles …)` nên trên môi trường không có role thì chỉ in `NOTICE`.
- Câu `SELECT` cuối là read-only, chạy bao nhiêu lần cũng cho cùng bộ số.

Kiểm tra bù cho lớp lỗi go-live-03 — `FUP-04` đã chứng minh 1408 unit test xanh không bắt được một dấu
`)` thiếu vì test **mock** `$queryRawUnsafe`. Nên tôi kiểm cấu trúc SQL offline bằng máy quét riêng:

```
$ node scratch/golive11-sql-balance.mjs prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql
FILE: prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql
  cau lenh ket thuc bang ; o muc file : 3
  than dollar-quote                  : 1
    $$ @dong 51: stmts=22 IF=3/3 LOOP=3/3
KET QUA: PASS — khong phat hien lech ngoac, chuoi, dollar-quote hay IF/LOOP.
BALANCE_EXIT=0
```

Máy quét này **đã được chứng minh biết fail**, không phải một hàm luôn trả PASS: hai negative control
(xoá một `)` ⇒ `ngoac tron lech 1`; xoá một `END LOOP` ⇒ `LOOP mo 3 != END LOOP 2`) đều exit `1`. Nó
theo dõi comment `--`, chuỗi nháy đơn kèm escape `''`, tag dollar-quote, độ sâu ngoặc, và đệ quy vào
thân dollar-quote. **Nó không thay được phép đo trên DB** — nó chỉ loại lớp lỗi cú pháp trước khi Owner dán.

### `AC-04` — token cấm (`E-05a`, `E-05b`) — **một match không tránh được, xem `D-01`**

Lệnh nguyên văn của `AC-04`, chạy trong Git Bash, dán nguyên văn kết quả:

```
$ grep -nE 'CREATE OR REPLACE FUNCTION|ALTER FUNCTION|CREATE POLICY|DROP|ALTER TABLE|INSERT|UPDATE|DELETE|GRANT' prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql
143:      EXECUTE format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I', v_rec.member, v_rec.grantor);
grep_exit=0
```

`AC-04` đòi zero match. Kết quả là **một** match, và match đó là **chính literal mà `RQ-02` bắt buộc**:
`GRANTED BY` chứa chuỗi con `GRANT`. Không có cách nào thoả cả hai AC theo mặt chữ. Tôi **không** đổi
literal để làm xanh gate — `RQ-02` thắng `AC-04` theo chuỗi `RQ → STEP → AC`.

Phép đo giữ đúng **ý định** của `AC-04` (không có lệnh `GRANT` nào trong file) là thêm ranh giới từ:

```
$ grep -nE 'CREATE OR REPLACE FUNCTION|ALTER FUNCTION|CREATE POLICY|DROP|ALTER TABLE|INSERT|UPDATE|DELETE|\bGRANT\b' prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql
grep_exit=1
```

**Zero match, exit 1.** Nghĩa là: file không chứa lệnh `GRANT`, không `DROP`, không `ALTER TABLE`,
không một lệnh DML nào, không chạm thân hàm hay policy. Bán kính đúng `DEC-03` — một khái niệm duy
nhất là membership.

### `AC-05` — bộ bốn số sau khi áp (chờ Owner)

Chưa đo được. Ngưỡng contract: `total=1, residual_self_grant=0, inheritable=0, safe_admin=1`, và dòng
còn lại phải là `member=neondb_owner, grantor=cloud_admin, admin_option=t, inherit_option=f, set_option=f`.

`PLN-05` đã hạ chính `PLN-01` xuống mức **tiên đoán cần xác nhận tại thời điểm áp**. Tier 2 không tái
lập được phép đo đó (`EV-07`), nên tôi **không** ghi bộ số này như sự thật đã kiểm. Nếu kiểm kê `TRUOC`
mà migration in ra khác hình dạng `[1]`/`[2]`, migration **tự dừng** và không thu hồi gì — đó là dữ
kiện mới của contract, phải đưa Tier 1 quyết (`L-03`, `RISK-05`).

### `AC-06` — RED trước GREEN (`E-06`, `E-07`)

**RED** — trước khi đưa hai tên file vào allowlist:

```
PS> npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts
 ❯ prisma/migrations-permission-hygiene.static.test.ts (4 tests | 1 failed)
   × migration permission hygiene — WITH SET FALSE phải kèm REVOKE (RQ-06) > không file migration nào nâng membership rồi bỏ lại quyền tồn dư
     → Migration dùng 'WITH SET FALSE' mà không thu hồi membership trong cùng file:
       20260823101500_mp2_apply_tracking (role hrp_public_rpc),
       20260831103000_marketplace_search_tracking_profile (role hrp_public_rpc).
       'WITH SET FALSE' chỉ tắt SET ROLE, membership vẫn còn và vẫn kéo theo đặc quyền.
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
LASTEXITCODE=1
```

Message nêu **đúng hai** tên file mà `AC-06` yêu cầu, đúng thứ tự thời gian.

**GREEN** — sau khi allowlist `APPLIED_BEFORE_RULE` có hai mục kèm lý do:

```
PS> npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts
 ✓ prisma/migrations-permission-hygiene.static.test.ts (4 tests) 5ms
 Test Files  1 passed (1)
      Tests  4 passed (4)
LASTEXITCODE=0
```

Test tĩnh có bốn test, không chỉ một: (1) đọc được cây migration thật từ filesystem, (2) quy tắc
`WITH SET FALSE` ⇒ phải có `REVOKE` cùng file, (3) allowlist không được mục ruỗng — FAIL nếu trỏ tới
migration không còn tồn tại, (4) mỗi mục allowlist phải ghi lý do. Điều kiện thoát thứ hai của `RQ-06`
(cùng file có `REVOKE` role đó) cho migration tương lai dùng đúng idiom mà **không** cần allowlist,
đóng `RISK-03`.

### `AC-07` — lane canonical (`E-08`)

```
PS> npm run test:unit
> hrp@0.1.0 test:unit
> vitest run --config vitest.unit.config.ts

 ✓ prisma/migrations-permission-hygiene.static.test.ts (4 tests) 5ms
 …
 Test Files  99 passed (99)
      Tests  1480 passed (1480)
   Start at  01:14:19
   Duration  35.36s (transform 2.13s, setup 0ms, collect 7.49s, tests 2.12s, environment 22ms, prepare 8.63s)

TESTUNIT_LASTEXITCODE=0
```

Ba ngưỡng của `AC-07` đều đạt: exit `0`; `1480` ≥ `1421`; và
`prisma/migrations-permission-hygiene.static.test.ts (4 tests)` xuất hiện trong danh sách `Test Files`
(dán nguyên văn ở trên, dòng thứ nhất của phần trích).

### `AC-08` — output Console sau khi dán (chờ Owner)

Chưa có. Tier 2 **không** ghi "đã áp" khi không có output — chính `AC-08` gọi đó là FAIL. Khối dán ở §3.1.

### `AC-09` — hai đường công khai đi qua hàm DEFINER (`E-09`, `E-10`, `E-11`) — **baseline TRƯỚC khi áp**

Tracking canonical, mã tra cứu không tồn tại:

```
PS> curl.exe -s -o NUL -w "HTTP=%{http_code}`n" "https://www.hrpartner.vn/api/public/applications/HRP-KHONG-TON-TAI-000"
HTTP=404
CURL_LASTEXITCODE=0
```

Apply **canonical** (`PLN-03`: đây mới là bằng chứng blocking), slug không tồn tại, body đủ field để đi
hết validation tầng Node và **chạm tới RPC**:

```
PS> curl.exe -s -X POST "https://www.hrpartner.vn/api/public/jobs/khong-ton-tai-golive11-probe/applications" -H "Content-Type: application/json" --data-binary "@$env:TEMP\ac09-apply.json" -w "`nHTTP=%{http_code}`n"
{"error":"JOB_NOT_AVAILABLE","message":"JOB_NOT_AVAILABLE"}
HTTP=404
CURL_LASTEXITCODE=0
```

Body đã dùng: `{"fullName":"AC09 Probe","phone":"0900000000","consent":true,"idempotencyKey":"ac09-golive11-probe-20260901-01"}`.

**Vì sao `404 JOB_NOT_AVAILABLE` chứng minh RPC chạy được, chứ không phải một 404 route-level:** chuỗi
`JOB_NOT_AVAILABLE` chỉ được raise **bên trong** hàm DEFINER —
`prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql:148`,
`RAISE EXCEPTION 'JOB_NOT_AVAILABLE' USING ERRCODE = 'P0011'` — rồi `mapApplySqlState` ở
`src/domains/applications/apply-helpers.ts:152` dịch `P0011` → `404 JOB_NOT_AVAILABLE`. Muốn nhận được
đúng mã này thì request phải qua rate-limit, qua media-type gate, qua shape gate, vào
`prisma.$transaction`, gọi `hrp_public_apply_submission(...)` **và hàm đó phải thực thi tới dòng 148**.
Nếu quyền của `hrp_public_rpc` bị hỏng, triệu chứng là `500 INTERNAL`, không phải `404`.

Endpoint retired — **chỉ để kiểm kê**, `PLN-03` cấm dùng làm bằng chứng RPC:

```
PS> curl.exe -s -X POST "https://www.hrpartner.vn/api/jobs/apply" -H "Content-Type: application/json" --data-binary "{}" -w "`nHTTP=%{http_code}`n"
{"error":"APPLY_ENDPOINT_RETIRED","message":"Endpoint này đã ngừng phục vụ. Vui lòng gửi ứng tuyển qua POST /api/public/jobs/{slug}/applications.","canonicalPath":"/api/public/jobs/{slug}/applications"}
HTTP=410
CURL_LASTEXITCODE=0
```

**Zero `500`** trên cả ba phép đo. Ba phép đo này chạy lúc `2026-09-01 01:18-01:19 +07`, tức **TRƯỚC**
khi áp migration ⇒ chúng là baseline. `RQ-09` đòi đo lại **SAU** khi áp; nửa đó chờ Owner (`L-01`).
Không request nào ghi một dòng dữ liệu: slug không tồn tại nên hàm raise trước mọi `INSERT`.

### `AC-10` — không commit, không push (`E-12`)

```
PS> git log origin/main..HEAD --oneline
GITLOG_LASTEXITCODE=0

PS> git log -1 --format="%H %s"
79b05b3bbd813316c310f68a7c6742f2c25f69f8 docs(planner): open go-live-10 execution round 2 to restore the 41 lost lines
```

`git log origin/main..HEAD` in **zero dòng** ⇒ không có commit nào chưa push. `HEAD` vẫn đúng commit của
Tier 1 (`79b05b3`, "docs(planner): open go-live-10 execution round 2…") ⇒ Tier 2 **không tạo commit nào**.
Cả ba file thay đổi của round này còn ở worktree: hai `??` trong `prisma/` cộng một `M` ở
`vitest.unit.config.ts`.

### `AC-11` — typecheck (`E-13`)

```
PS> npm run typecheck
TYPECHECK_LASTEXITCODE=0
```

### 3.1 — Khối dán cho Owner (`RQ-08`, đóng `AC-03`/`AC-05`/`AC-08` và nửa sau `AC-09`)

**Cảnh báo branch (`RISK-02`).** Dán vào branch **`hrp-live`**. Branch mặc định tên
`snapshot-rls-off-dont-use` có RLS **tắt** — tuyệt đối không dán vào đó. Không dùng
`prisma migrate deploy` (`DEC-08`): lệnh đó áp mọi migration đang chờ, không chỉ file này.

1. Mở Neon Console → project `HRP-ERP` → **branch `hrp-live`** → SQL Editor.
2. Dán **nguyên văn toàn bộ** `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql`
   (204 dòng, gồm cả header comment — header là phần tài liệu của quyết định, đừng cắt).
3. Chạy. Kỳ vọng: các dòng `NOTICE` `TRUOC | …`, đúng **một** dòng `THU HOI | member=neondb_owner | grantor=neondb_owner`,
   rồi các dòng `SAU   | …`, rồi hai kết quả `SELECT`.
4. **Chụp/dán lại toàn bộ output**, đặc biệt là bảng bốn số cuối cùng. `AC-08` coi "đã áp mà không có
   output" là FAIL.
5. **Chạy lần thứ hai trong cùng session** (`AC-03`). Kỳ vọng: không còn dòng `THU HOI`, không exception,
   bảng cuối vẫn y nguyên.

Ngưỡng PASS của `AC-05`:

```
 member        | grantor      | admin_option | inherit_option | set_option
---------------+--------------+--------------+----------------+------------
 neondb_owner  | cloud_admin  | t            | f              | f

 total | residual_self_grant | inheritable | safe_admin
-------+---------------------+-------------+------------
     1 |                   0 |           0 |          1
```

**Nếu migration `RAISE EXCEPTION`:** đó là fail-closed đúng thiết kế, **không có gì bị thu hồi**. Gửi
nguyên văn các dòng `TRUOC | …` cho Tier 1 và dừng — không sửa migration tại chỗ trong Console.

6. Sau khi áp xong, đo lại **hai** đường công khai (`RQ-09`, `DEC-09`) và dán mã HTTP:

```powershell
curl.exe -s -o NUL -w "HTTP=%{http_code}`n" "https://www.hrpartner.vn/api/public/applications/HRP-KHONG-TON-TAI-000"
'{"fullName":"AC09 Probe","phone":"0900000000","consent":true,"idempotencyKey":"ac09-golive11-postapply-01"}' | Set-Content -Encoding utf8 "$env:TEMP\ac09-apply.json"
curl.exe -s -X POST "https://www.hrpartner.vn/api/public/jobs/khong-ton-tai-golive11-probe/applications" -H "Content-Type: application/json" --data-binary "@$env:TEMP\ac09-apply.json" -w "`nHTTP=%{http_code}`n"
```

Kỳ vọng y như baseline: `404` và `404 JOB_NOT_AVAILABLE`. **Bất kỳ `500` nào = FAIL cả task**, và đường
lùi `DEC-10` là đúng một câu lệnh, chạy trong cùng Console:

```sql
GRANT hrp_public_rpc TO neondb_owner;
```

Sau khi rollback, báo `REVISION_REQUIRED` cho Tier 1 — đừng thử biến thể khác trong Console.

## 4. Changed Deliverables

- **Source/artifact changed:**
  - `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql` — **mới**, 204
    dòng, UTF-8 hợp lệ (`iconv -f UTF-8 -t UTF-8` exit `0`), **0 byte CR** (LF thuần, khớp các file
    migration còn lại). Round 1 là 103 dòng và đã bị viết lại toàn bộ.
  - `prisma/migrations-permission-hygiene.static.test.ts` — **mới**, 125 dòng, 4 test, UTF-8 hợp lệ
    (`iconv` exit `0`), 0 byte CR. Giữ logic Round 1, sửa mojibake hai chuỗi allowlist (`D-03`).
  - `vitest.unit.config.ts` — **sửa**, đúng một dòng logic cộng hai dòng comment: thêm
    `'prisma/**/*.test.ts'` vào `test.include`. Đây là yêu cầu trực tiếp của `RQ-07` (`D-02`).
- **Dependency:** None. Không thêm/bớt/nâng package nào; `package.json` và lockfile không đổi.
- **Schema/migration:** đúng một thư mục migration mới như trên. **Chưa áp lên bất kỳ DB nào.** Không
  file migration đang có nào bị sửa, xoá hay đổi tên (`AC-01` đã chứng minh bằng `git diff --stat` rỗng).
- **Environment/config:** None. Không đổi `.env*`, không đổi `DATABASE_URL`, không rotate credential,
  không tạo role.
- **Không phải deliverable, là công cụ verify:** `scratch/golive11-sql-balance.mjs` (96 dòng) — máy quét
  cấu trúc SQL offline dùng ở `AC-03`. Nằm trong `scratch/`, không được import bởi mã ứng dụng, không
  nằm trong lane test nào. Tier 3 có thể chạy lại nó, hoặc bỏ qua.
- **Bảo toàn artifact round trước:** `docs/tasks/hrp-v5-go-live-11-public-rpc-residual-grant/evidence/HANDOFF-round1.md`
  — bản sao nguyên văn HANDOFF Round 1 (25.569 byte) chép **trước** khi ghi đè file này. HANDOFF Round 1
  là **untracked** (`git ls-files` trả rỗng) nên ghi đè sẽ mất hẳn, giống hệt cách hai `AUDIT.md` đã mất.
- **Git diff/commit:** **Not created.** Không commit, không push, không stage (`RQ-10`, `AC-10`).
- **Worktree ngoài task:** giữ nguyên, không stage, không revert, không dọn. Các file bẩn của go-live-02/04/13,
  `docs/aff_plan*.md`, `scratch/*`, `fix.patch`, `temp.diff`… không thuộc round này và không bị chạm.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `D-01` | Deviation — **defect contract** | `AC-04` cấm token `GRANT`; `RQ-02`/`AC-02` bắt buộc literal `format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I'`, mà `GRANTED BY` chứa `GRANT`. Grep nguyên văn của `AC-04` → **1 match** (dòng `143`), không phải `0` | Theo mặt chữ, `AC-02` và `AC-04` không thể cùng PASS. Tôi giữ literal của `RQ-02` (chuỗi `RQ → STEP → AC`, `RQ` thắng), và bổ sung phép đo giữ đúng ý định: cùng regex nhưng `\bGRANT\b` → **zero match, exit 1** | Sửa `AC-04` sang `\bGRANT\b` (hoặc `GRANT\s`, hoặc loại trừ `GRANTED BY`) ở lần bump spec kế tiếp. **Không** cần mở execution round: mã đã đúng ý định, chỉ phép đo viết hụt |
| `D-02` | Deviation — file ngoài `prisma/` | `git diff -- vitest.unit.config.ts`: `include` từ `['src/**/*.test.ts','packages/**/*.test.ts']` → thêm `'prisma/**/*.test.ts'` | `RQ-07` đòi test mới nằm trong lane canonical `npm run test:unit`, và lane đó **không** tự bắt `prisma/**`. Đo trực tiếp round này (`E-16`): với config **chưa sửa**, cùng lệnh vitest trả `No test files found, exiting with code 1`. `AC-01` chỉ ràng buộc phạm vi `prisma/` nên không xung đột | Xác nhận đây là thay đổi được `RQ-07` cho phép. Ghi chú an toàn: `prisma/**` hiện chỉ có test tĩnh đọc filesystem, **không** file nào mở kết nối DB, nên lane unit vẫn fail-closed với `DATABASE_URL` sentinel |
| `D-03` | Deviation — sửa lỗi Round 1 | File test Round 1 trên đĩa có **byte UTF-8 không hợp lệ** trong hai chuỗi lý do allowlist (`od -c` cho `320 343 341 352 363`, không phải lỗi hiển thị terminal) | Nội dung lý do — thứ `RQ-06` bắt phải có — bị hỏng và không đọc được. Đã viết lại hai chuỗi bằng UTF-8 hợp lệ, `iconv -f UTF-8 -t UTF-8` exit `0` | Không cần quyết định. Ghi lại để Tier 3 hiểu vì sao file test khác Round 1 dù logic giữ nguyên |
| `L-01` | Limitation — không có DB | `EV-07`: harness chặn mọi lệnh nối DB production. Kiểm tra thêm: `psql`/`pg_dump` không có trên máy; không `.env*` nào chứa credential branch test. Tier 2 cũng không có trình duyệt để mở Neon Console | `AC-03`, `AC-05`, `AC-08` và **nửa sau khi áp** của `AC-09` chưa đóng bằng phép đo. Tôi **không** thử nối DB nào và **không** ghi bộ số `1/0/0/1` như đã kiểm | Owner thực thi §3.1 rồi dán output vào đây (hoặc vào `evidence/`). Đây là **limitation đã biết từ contract**, không phải blocker mới ⇒ theo lệnh, handoff dừng ở `READY_FOR_AUDIT` |
| `L-02` | Limitation — baseline drift | Contract ghi baseline `0248948`; `HEAD` thật là `79b05b3`. `git merge-base --is-ancestor 0248948 HEAD` → exit `0` | `0248948` là tổ tiên của `HEAD`, delta ở giữa là doc/code của go-live-10/12/13. Không commit nào trong delta chạm `prisma/migrations` hay `vitest.unit.config.ts` liên quan tới task này | None. Ghi để Tier 3 chạy lại lệnh trên cùng `HEAD` chứ không checkout `0248948` |
| `L-03` | Limitation — `PLN-01` là tiên đoán | `PLN-05` của chính TASK: phiên Tier 1 đó **không tái lập được** phép đo `pg_auth_members` trên `hrp-live` | Bộ số `1/0/0/1` là **kỳ vọng**, không phải sự thật đã kiểm. Tính đúng đắn không phụ thuộc nó: migration fail-closed theo **hình dạng** record, nên hình dạng lạ ⇒ dừng, không thu hồi mù | Nếu kiểm kê `TRUOC` khác `PLN-01`, Tier 1 xử lý như dữ kiện contract mới (`RISK-05`) |

**Không có blocker mới.** `BLOCKER-01` của Round 1 (bước áp DB) đã được contract v1.1 hấp thu thành
`RQ-08`/`DEC-07` — một bước OP đã biết trước, có đường thực hiện rõ ràng — nên round này ghi nó là
`L-01` chứ không phải blocker, và handoff dừng ở `READY_FOR_AUDIT` đúng như lệnh giao.

### Bằng chứng cho `D-02` — lane canonical không tự bắt `prisma/**` (`E-16`)

Đo không phá worktree: ghi bản `vitest.unit.config.ts` **đang ở `HEAD`** ra một file tạm rồi chạy lane
với chính nó, sau đó xoá file tạm (`Test-Path` sau khi xoá trả `False`).

```
PS> git show HEAD:vitest.unit.config.ts | Set-Content -Encoding utf8 vitest.unit.probe.config.ts
PS> Select-String -Path vitest.unit.probe.config.ts -Pattern "include:" -SimpleMatch
vitest.unit.probe.config.ts:25:    include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],

PS> npx vitest run --config vitest.unit.probe.config.ts prisma/migrations-permission-hygiene.static.test.ts
filter:  prisma/migrations-permission-hygiene.static.test.ts
include: src/**/*.test.ts, packages/**/*.test.ts
No test files found, exiting with code 1
PROBE_LASTEXITCODE=1
```

Đây là bằng chứng `RQ-07` **bắt buộc** thay đổi ở `vitest.unit.config.ts`: không có nó, test tĩnh tồn
tại trên đĩa nhưng **không chạy** trong lane canonical — đúng lớp lỗi "hàng rào có mà không ai gác".

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | §3 · `verify-task.ps1` | Contract v1.1 hợp lệ trước khi thực thi (`C-09` của Tier 3) |
| `E-02` | §3 · `AC-01` — `git status --short -- prisma/` | Đúng hai đường dẫn mới |
| `E-03` | §3 · `AC-01` — `git diff --stat -- prisma/migrations` (rỗng) | Không file migration cũ nào bị sửa (`DEC-02`) |
| `E-04` | §3 · `AC-02` — grep literal | `RQ-02` — `GRANTED BY` có mặt, thu hồi theo `grantor` |
| `E-05a` | §3 · `AC-04` — grep nguyên văn của contract | Một match không tránh được (`D-01`) |
| `E-05b` | §3 · `AC-04` — grep `\bGRANT\b` | Ý định `RQ-04`: zero lệnh `GRANT`/DDL/DML, exit `1` |
| `E-06` | §3 · `AC-06` RED | Test tĩnh thật sự bắt được lớp lỗi, nêu đúng hai file |
| `E-07` | §3 · `AC-06` GREEN | Allowlist `DEC-06` đóng đúng hai ngoại lệ |
| `E-08` | §3 · `AC-07` — `npm run test:unit` | Lane canonical exit `0`, `1480` ≥ `1421`, file mới có trong `Test Files` |
| `E-09` | §3 · `AC-09` — tracking | `404` — baseline trước khi áp |
| `E-10` | §3 · `AC-09` — apply canonical | `404 JOB_NOT_AVAILABLE` ⇒ hàm DEFINER chạy tới `migration.sql:148` |
| `E-11` | §3 · `AC-09` — retired endpoint | `410`, kiểm kê thôi (`PLN-03`) |
| `E-12` | §3 · `AC-10` — `git log origin/main..HEAD` | Zero commit của Tier 2 (`RQ-10`) |
| `E-13` | §3 · `AC-11` — `npm run typecheck` | exit `0` |
| `E-14` | §3 · `AC-03` — `node scratch/golive11-sql-balance.mjs` | Cấu trúc SQL cân, cộng hai negative control chứng minh máy quét biết fail |
| `E-15` | `docs/tasks/hrp-v5-go-live-11-public-rpc-residual-grant/evidence/HANDOFF-round1.md` | Bản sao HANDOFF Round 1 (untracked, sẽ mất nếu không chép) |
| `E-16` | §5 · `D-02` — lane với config ở `HEAD` | `RQ-07` bắt buộc sửa `vitest.unit.config.ts`: không có nó, lane canonical trả `No test files found` |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` | Migration 103 dòng thu hồi **mọi** membership dựa trên tiền đề "tập thành viên đúng là tập rỗng". 7/11 AC đóng tĩnh, 4 AC chờ Console. Ba phát hiện gửi Tier 1: `F-01` (PostgreSQL tự cấp ADMIN OPTION cho role tạo ra `hrp_public_rpc` ⇒ thu hồi hết có thể khoá chính đường lùi `DEC-10`), `F-02`, `F-03` (`/api/jobs/apply` đã RETIRE, `410` cố định, không chạm RPC). Không commit, không push |
| — | — | `REVISION_REQUIRED` | Tier 1 **cấm áp** bản Round 1 lên production. `PLN-01` đo `hrp-live` (PostgreSQL `18.6`): hai record cùng member `neondb_owner`, khác grantor. `PLN-02`: migration Round 1 tự `RAISE EXCEPTION` vì đếm thô `v_before = 2`. `PLN-03` xác nhận `F-03`. `PLN-04`: `AUDIT.md` Round 1 = 0 byte, untracked ⇒ mất hẳn. Contract bump `v1.1` |
| `2` | `v1.1` | `READY_FOR_AUDIT` | Viết lại `migration.sql` (204 dòng): thu hồi theo **hình dạng** record, đúng một self-grant `neondb_owner → neondb_owner`, giữ nguyên `cloud_admin → neondb_owner (admin=t, inherit=f, set=f)`; header đính chính tiền đề sai của Round 1; fail-closed hai chốt. Sửa mojibake allowlist. `8/11` AC đóng bằng phép đo thật (`AC-01`, `AC-02`, `AC-06`, `AC-07`, `AC-09` nửa baseline, `AC-10`, `AC-11`, cộng `verify-task`); `AC-04` có một match không tránh được (`D-01`, defect contract); `AC-03`/`AC-05`/`AC-08` chờ Owner dán trong Neon Console (`L-01`). Không commit, không push |

> Handoff status: READY_FOR_AUDIT
