# AUDIT: hrp-v5-go-live-17-rls-required-relation-sweep

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-17-rls-required-relation-sweep` |
| Work/Audit type | `CODE/CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `HANDOFF.md` execution round 1, trạng thái `READY_FOR_AUDIT` |
| Round closes when | Verdict `PASS` và Planner Resolution `ACCEPTED` |
| Auditor/context | Tier 3 độc lập; tự đọc TASK/HANDOFF/source/migration, tự chạy lại mọi phép đo; không dùng số PASS của Tier 2 làm bằng chứng |
| Baseline/diff/artifacts | Contract baseline `80f6933`; execution tree `e58a6c0`; staged task source, HANDOFF và `evidence/`; working tree nhiều luồng dùng chung |
| Independence | Confirmed. Tier 3 chỉ tạo `AUDIT.md`; phép đột biến tạm đã hoàn nguyên và xác nhận bằng SHA-1 giống hệt trước/sau |
| Audit time | `2026-09-04 08:39 +07:00` |

## 1. Findings

### AUD-001 — Cổng phát hành AC-11 và build đang đỏ

- **Severity:** `P1`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-09 / AC-11`, Mandatory `C-02`
- **Evidence:** `npm run typecheck` exit `1`; `npx tsc --noEmit --incremental false` exit `2`; `npm run build` exit `1`. Cả ba cùng chỉ ra `new-ui/components/JobCard.tsx:18:6`, `TS2322` vì `href` có thể là `undefined`. `git log --all -- new-ui/` không có kết quả và HANDOFF `LIM-02` đã quy thuộc đây là WIP untracked ngoài task.
- **Impact:** Thay đổi GO-LIVE-17 chưa chứng minh được trên một cây có thể typecheck/build. Dù lỗi không do bốn tệp task tạo ra, ngưỡng AC-11 là mã thoát `0`, không cho phép Tier 3 tự miễn trừ.
- **Decision needed from Planner:** Giao chủ sở hữu luồng `new-ui` sửa hoặc cô lập đúng cách, sau đó mở audit round mới và chạy lại typecheck/build; không đổi kết luận thành PASS chỉ bằng waiver miệng.

### AUD-002 — Hai đường statement lineage đã sửa nhưng không có test hành vi

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-08`, Mandatory `C-08`
- **Evidence:** `src/domains/reconciliation/statement.service.ts:388-427` và `:431-469` sửa cách dựng `worker` qua truy vấn vô hướng + `worker.findMany`. `rg` toàn repo chỉ tìm thấy hai định nghĩa `getVendorStatementLineage` và `getClientStatementLineage`, không có caller hoặc test. Targeted lane chỉ phủ `vendorPreviewStatement`, `listClaims` và hàng rào; 42/42 PASS nhưng không gọi hai hàm lineage.
- **Impact:** Nhánh ghép lại `{ fullName }` hoặc `null`, thứ tự/dedup ID và hành vi khi worker bị RLS ẩn chưa được test. Static guard chỉ chứng minh không còn required-relation select; nó không chứng minh response của hai hàm không hồi quy.
- **Decision needed from Planner:** Bump contract để cho phép test trực tiếp hai hàm lineage, hoặc ghi nhận rủi ro rõ ràng; muốn verdict PASS thì phải bổ sung coverage và audit lại.

### AUD-003 — Mandatory default Vitest lane thất bại

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-09 / AC-11`, Mandatory `C-01`
- **Evidence:** Tier 3 chạy `npx vitest run` với mọi biến LIVE/DB bị xoá và một URL loopback bất khả kết nối để không chạm DB thật: exit `1`; 123 files = 4 failed, 106 passed, 13 skipped; 1992 tests = 40 failed, 1633 passed, 319 skipped. Có 24 lỗi `React is not defined` tại `src/domains/applications/placement-panel.test.ts`; các lỗi còn lại thuộc lane DB/RLS cố kết nối URL bị chặn. Trong khi đó canonical `npm run test:unit` PASS 1642/1642.
- **Impact:** Deep Audit `C-01` bắt buộc chạy default lane và hiện không xanh. Sai khác giữa default Vitest lane và unit lane tạo nguy cơ pipeline cho kết quả tùy câu lệnh.
- **Decision needed from Planner:** Chuẩn hoá default Vitest config/lane và tách test LIVE bằng opt-in fail-closed, hoặc sửa contract/pipeline rule ở một task riêng; sau đó chạy lại C-01.

### AUD-004 — Contract v1.1 tự mâu thuẫn với tập đóng sau sửa và baseline thực thi

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-03 / AC-04`, `RQ-09 / AC-12`, Mandatory `C-10`
- **Evidence:** Chỉ thị audit của Owner xác định hàng rào hậu-fix là tập đóng `8` vị trí; phép đột biến chứng minh điều đó. Nhưng `TASK.md:85,134` vẫn đòi chính xác `12` và nói có `4` vị trí dưới `app/api/`, trong khi danh sách thật có `3` vị trí `app/api/`. `TASK.md:142` còn đòi `HEAD == 80f6933`; thực đo `HEAD=e58a6c0`, cách baseline 9 commit, và chính TASK được tạo sau baseline. `git diff --name-only 80f6933..HEAD` có 71 path, gồm task 16 và các contract 17/18/19/TEST-01.
- **Impact:** Không thể đồng thời đạt lời văn AC-04/AC-12 và trạng thái hậu-fix được Owner yêu cầu. Baseline không cô lập diff thực thi, nên C-10 cũng không thể chứng minh sạch scope bằng phép đo bắt buộc.
- **Decision needed from Planner:** Phát hành spec mới: AC-04 phải tách rõ pre-fix 12 và post-fix tập đóng 8 (3 app + 5 src); AC-12/C-10 phải dùng execution baseline hoặc staged attribution thay vì baseline trước khi contract tồn tại.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Chạy `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | `PASS` | Exit `0`, 1 file, 11/11 tests PASS; tệp tồn tại | None |
| `AC-02` | `rg -n "readFileSync\|readdirSync\|prisma/migrations\|schema.prisma" src/shared/security/required-relation-sweep.static.test.ts` và đọc source | `PASS` | Exit `0`; các detector tại dòng 116-194 đọc migration/schema bằng filesystem; `0` mảng literal ghim tập bảng RLS | None |
| `AC-03` | `powershell -Command "python scratch/f05/rls.py; python scratch/f05/scan.py; python scratch/f05/cross.py; python scratch/f05/usage.py"` | `PASS` | Cả 4 exit `0`: 34 bảng RLS; 49 model/36 có relation; 21 trường required-relation nguy hiểm; 8 hit hậu-fix. Ba JSON nguồn giữ hash; `hits.json` được trả đúng blob HEAD | None |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts`, rồi lặp lại sau mutation và sau restore | `PARTIAL` | Hậu-fix tập đóng đúng 8; xanh 11/11, thêm giả `include: { worker: true }` tại `rate-limit-port.ts:148` làm đỏ 2 test và báo chính xác hit thứ 9, hoàn nguyên xanh 11/11. Nhưng TASK v1.1 vẫn ghi literal 12/4 app | `AUD-004` |
| `AC-05` | `rg -n "fixture âm\|FAKE_" src/shared/security/required-relation-sweep.static.test.ts` cộng lane con AC-01 | `PASS` | Exit `0`; dòng 271-327 dùng cùng detector bắt schema/migration/source giả; lane 11/11 PASS | None |
| `AC-06` | `rg -n "stripComments" src/shared/security/required-relation-sweep.static.test.ts` cộng lane con AC-01 | `PASS` | Exit `0`; dòng 100-113,202 bỏ block comment và line comment trước khi scan; assertions PASS | None |
| `AC-07` | `rg -n "^\\| (1|2|3|4|5|6|7|8|9|10|11|12) \\|" HANDOFF.md`, rồi `Get-Content` policy m13/m14 | `PASS` | Exit `0`; 12/12 dòng: 8 AN TOÀN, 4 RỦI RO; quote cha/con và line provenance đầy đủ; policy nguồn tại m13:6-22 và m14:43-164 | None |
| `AC-08` | `git diff --cached --numstat` và `git diff --cached --` ba service, rồi `git status --porcelain` trên năm tệp an toàn | `PASS` | Exit `0`; đúng 4 risky spots trong 3 service được sửa; 5 tệp chứa 8 safe spots trả 0 dòng | None |
| `AC-09` | `git hash-object src/domains/job-board/public-select.static.test.ts`; `git rev-parse HEAD:src/domains/job-board/public-select.static.test.ts`; `git status --porcelain --` | `PASS` | Cả hai hash = `a8cda720ac6737e4f1869f6be36faa8160dc8428`; status `0` dòng | None |
| `AC-10` | `git status --porcelain -- prisma/`; `git diff --cached --name-only -- prisma/` | `PASS` | Cả hai output `0` dòng; schema, migration, Vitest config, `app/globals.css` và guard cũ đều sạch | None |
| `AC-11` | Chạy `npm run test:unit`, `npm run typecheck`, và cold `tsc --incremental false` | `FAIL` | Unit exit `0`, 107 files, 1642/1642 PASS; typecheck exit `1`; cold tsc exit `2`, cùng lỗi `new-ui/components/JobCard.tsx:18:6` | `AUD-001` |
| `AC-12` | Chạy `git status --porcelain`, staged attribution, forbidden-path status, `git log -1`, `git rev-list --count baseline..HEAD` | `FAIL` | Vùng cấm sạch và task staged có thể quy thuộc; nhưng `HEAD=e58a6c0` khác baseline 9 commit, baseline..HEAD có 71 path; toàn tree có nhiều WIP ngoài bốn nhóm | `AUD-004` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` Regression (`npx vitest run`) | `FAIL` | Exit `1`; 4 file/40 test fail, 106 file/1633 test pass, 13 file/319 test skip. Unit lane riêng PASS 1642/1642; xem `AUD-003` |
| `C-02` Build (`npm run build`) | `FAIL` | Exit `1`; compile xong nhưng typecheck dừng ở `new-ui/components/JobCard.tsx:18:6` TS2322; xem `AUD-001` |
| `C-03` Route handlers đọc từng dòng | `SKIP (task không thêm/sửa route handler)` | Ba tệp source sửa đều là domain service; tám vị trí an toàn trong route không bị chạm |
| `C-04` Prisma query vs schema + `prisma validate` | `DONE` | `npx prisma validate` exit `0`; đối chiếu scalar FK và nullable reconstruction với `schema.prisma`; không đổi schema |
| `C-05` POST/PATCH mới: idempotency + outbox | `SKIP (không có route POST/PATCH mới hoặc sửa)` | Diff task chỉ gồm ba domain service và một static test |
| `C-06` Migration/RLS verify + policy vs intent | `DONE` | `rg -n "CREATE POLICY" prisma/migrations -g migration.sql` và `Get-Content` hai migration m13/m14, exit code `0`, đọc 2 policy source; child `project_assignments` và `source_claims` có khoảng mở rộng so với parent worker predicate; `staffing_orders` dùng đúng parent project predicate |
| `C-07` Git hygiene | `DONE` | `git status --short -- <task paths>` và `git diff --cached --name-only -- <task paths>` exit `0`: 24 task paths staged có chủ đích; forbidden paths 0 dòng; 43 GO-LIVE-18 paths được phép cùng lô và không tính cho task 17 |
| `C-08` Test coverage file mới/sửa + route | `FAIL` | Guard có 11 test; `vendorPreviewStatement` và `listClaims` có test; hai hàm lineage trong `statement.service.ts` không có caller/test; xem `AUD-002` |
| `C-09` `verify-task.ps1` trên TASK | `DONE` | `powershell -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath .../TASK.md` exit `0`, `RESULT: PASS. TASK contract is ready for execution.` |
| `C-10` Diff scope baseline..HEAD | `FAIL` | `git diff --name-only 80f6933..HEAD` trả 71 path và HEAD lệch 9 commit; baseline có trước commit tạo TASK; xem `AUD-004` |

## 3. Scope và Impact

- **Deliverables in scope:** một static guard tự suy migration/schema/source; sửa đúng bốn risky selects trong ba service; HANDOFF và evidence.
- **Out-of-scope changes:** Tree dùng chung có GO-LIVE-18 cùng lô và nhiều WIP khác. Tier 3 không sửa, stage, reset hoặc nhận công các path đó. Chỉ thêm `AUDIT.md`.
- **Blast radius/callers/affected flows:** vendor statement preview, vendor/client statement lineage, admin source-claim list; static guard quét toàn bộ production `.ts/.tsx` dưới `src/` và `app/`.
- **Data/security/migration/operations:** Không schema/migration/DB write. Sửa query tránh Prisma required-relation inconsistency khi child row nhìn thấy nhưng parent row bị RLS che. Policy không được nới.
- **FND-03 independent confirmation:** Tier 3 đọc trực tiếp `TASK.md §4.2`: mọi test ngoài static guard mới và test của contract cùng lô đều thuộc cột cấm chạm. `submission.service.test.ts:114` chỉ fake `worker.findUnique`, không có `findMany`. Vì vậy lựa chọn `findUnique` trong `Promise.all` là tuân thủ contract thật, không dựa vào comment mã; nó vẫn để lại khoản nợ tối đa 50 query cần task sau.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `verify-handoff.ps1 -TaskPath .../TASK.md` | `0` | H-01..H-15 OK; `RESULT: PASS` | Chạy lại sau khi HANDOFF đã staged |
| `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | `0` | Guard baseline 11/11 PASS | Tier 3 tự chạy |
| `apply_patch` mutation + `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | `1` như mong đợi | Thêm tạm `void { include: { worker: true } };` tạo hit `rate-limit-port.ts:148 worker`; 2 test đỏ | Phép đột biến tạm, không stage |
| `git status --short -- src/shared/security/rate-limit-port.ts` + `git hash-object` + guard lane sau restore | `0` | 11/11 PASS; SHA-1 trước/sau đều `3bb7216f6d8037f8d16349ff3ad51a6d8cacd81e`; status rỗng | Hoàn nguyên đầy đủ |
| `npx vitest run --config vitest.unit.config.ts <guard> <reconciliation-unit> <submission.service>` | `0` | 3 files, 42/42 PASS | Targeted source/guard lane |
| `npm run test:unit` | `0` | 107 files, 1642/1642 PASS | Canonical unit lane |
| `npx vitest run` | `1` | 4 files/40 tests failed; 106 files/1633 passed; 13 files/319 skipped | Env LIVE bị xoá; DB URL loopback bất khả kết nối để không chạm DB thật |
| `npm run typecheck` / cold tsc | `1` / `2` | Một TS2322 tại `new-ui/components/JobCard.tsx:18:6` | Ngoài task nhưng AC-11 vẫn không đạt |
| `npm run build` | `1` | Cùng TS2322 sau compile | Mandatory C-02 FAIL |
| `npx prisma validate` | `0` | Prisma schema valid | Không migration/schema change |
| `powershell -Command "python scratch/f05/rls.py; python scratch/f05/scan.py; python scratch/f05/cross.py; python scratch/f05/usage.py"` | `0/0/0/0` | 34 RLS tables, 21 required relation fields, 8 post-fix hits | `hits.json` do phép đo tạm thay đổi đã được trả đúng blob HEAD |
| `verify-task.ps1` | `0` | `RESULT: PASS` | TASK v1.1; semantic contradictions được ghi AUD-004 |
| `powershell -File .ai-pipeline/scripts/verify-audit.ps1 -TaskPath .../TASK.md -AuditPath .../AUDIT.md` | `0` | `RESULT: PASS WITH WARNINGS`; 1 warning S-16 do 77 staged path ngoài task trong shared index | Warning xác nhận Tier 3 không được commit cả index; không che mandatory failures |

## 5. Coverage Gaps

- **Gaps are present.** DB LIVE nằm ngoài phép đo vì task static/source-only và không có migration; policy mismatch được kết luận bằng source/policy provenance.
- Hai hàm statement lineage đã sửa thiếu caller/test, là coverage gap thực và đã nâng thành `AUD-002`.
- Default Vitest lane lẫn unit với integration/LIVE đang đỏ; đã nâng thành `AUD-003`.
- Tree dùng chung quá bẩn để phép `baseline..HEAD` chứng minh riêng task; staged attribution giúp đọc diff nhưng không thay thế được C-10/AC-12 theo lời văn hiện tại.

## 6. Verdict và Planner Questions

- **Verdict:** `FAIL`.
- **Reason:** Phần sửa RLS cốt lõi và hàng rào tập đóng có bằng chứng tốt, kể cả mutation RED/GREEN, nhưng AC-11 và AC-12 fail; Mandatory C-01, C-02, C-08, C-10 fail; còn P1/P2 mở. Theo Tier 3 rules không được hạ các lỗi này thành limitation rồi ghi PASS.
- **Planner decisions required:** `AUD-001` sửa/cô lập `new-ui` để gates xanh; `AUD-002` mở scope test lineage; `AUD-003` chuẩn hoá default Vitest lane; `AUD-004` bump contract cho pre/post-fix count và execution baseline đúng.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | N/A | `OPEN` | Typecheck/build exits `1`; cold tsc exit `2` |
| `1` | `AUD-002` | N/A | `OPEN` | Hai lineage functions không có caller/test |
| `1` | `AUD-003` | N/A | `OPEN` | Default Vitest exit `1`, 40 failed |
| `1` | `AUD-004` | N/A | `OPEN` | TASK literal 12/4 app và baseline `80f6933` không khớp hậu-fix/HEAD |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
