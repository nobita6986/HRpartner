# HANDOFF: hrp-v5-go-live-18-public-surface-hardening

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-18-public-surface-hardening` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | Tier 2 — Engineer |
| Baseline | `80f6933` theo TASK. Cây thực thi thật là `e58a6c0`, chín commit docs của Tier 1 nằm sau baseline và KHÔNG commit nào chạm một path nào của task này — đo ở `LIM-02` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | 2026-09-03 23:40 → 2026-09-04 01:05 Asia/Bangkok |

## 1. Outcome Summary

Bốn lỗ mà contract mô tả đã bịt, và món thứ năm trong hàng đợi đã bị contract bác từ trước nên tôi không sửa gì ở đó.

1. **Trang chi tiết việc đã có limiter.** [app/(jobs)/viec-lam/[slug]/page.tsx](app/(jobs)/viec-lam/[slug]/page.tsx) gọi `evaluateRateLimits` ở dòng `92`, `withPublicDb` ở dòng `102`, và nhánh từ chối `return` sớm ở dòng `100`. Ngân sách là `JOB_BROWSE` dùng chung với API danh sách, không rule mới, không nới `limit`.
2. **Điểm vào chỉ-trả-quyết-định** `evaluateRateLimits` tách ra ở [src/shared/security/rate-limit-guard.ts:119](src/shared/security/rate-limit-guard.ts#L119). `enforceRateLimits` ở dòng `164` giữ nguyên tên, nguyên chữ ký, thân còn `5` dòng và không lặp lại một mảnh logic nào. Bốn route cũ không đổi một byte.
3. **Nhánh `404` của tracking** đã có `Cache-Control: no-store`, diff `1 1`.
4. **Hai hàng rào tĩnh mới**, mỗi cái tự suy tập tệp bằng cách quét `src/` và `app/` chứ không dùng mảng literal, và mỗi cái mang một fixture âm bắn thẳng vào detector của chính nó. Đây là bài học `TEXT_PAIRS` của go-live-08: một hàng rào liệt kê thứ tác giả VỪA THÊM thì bề mặt thứ tư ai đó thêm sáu tháng sau sẽ vô hình.
5. **Hai assertion phủ định** ở `marketplace-inventory.static.test.ts`, cộng thêm `7 0`, không sửa hai dòng khẳng định cũ ở `:353` và `:354`.

Lane canonical `npm run test:unit` đi từ `104` tệp `1611` test lên `106` tệp `1631` test, đúng bằng hai hàng rào mới. Cổng hợp đồng `RESULT: PASS`, `GATE_EXIT = 0`.

**Giới hạn CÓ TÊN của `RQ-04`, ghi đúng chỗ `AC-07` đòi:** khi bị từ chối, trang chi tiết trả HTTP **`200`** kèm một thông báo, vì một Server Component của Next 15.1 KHÔNG đặt được status code. Thứ được bảo đảm là **ZERO truy vấn DB**: nhánh từ chối `return` ở dòng `100`, trước mọi lệnh gọi `withPublicDb` ở dòng `102`. Mã HTTP của họ `4xx` cho trường hợp vượt ngân sách KHÔNG xuất hiện một lần nào trong tài liệu này — chuỗi ba chữ số ấy đếm `0` lần bằng `grep -c`, đo ở `AC-07`, nên không có dòng nào khẳng định trang trả mã đó.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | mốc | `verify-task.ps1` cộng `npm run test:unit` cộng `npm run typecheck` trên cây chưa sửa | Cổng `RESULT: PASS`. Lane `104` tệp `1611` test, exit `0`. Typecheck có `1` dòng đỏ ở `new-ui/components/JobCard.tsx(18,6)` | `DEV-01` — dòng đỏ typecheck có TRƯỚC khi tôi sửa gì |
| `STEP-02` | `RQ-05` | Đo lại `EV-02` và `EV-04` trên baseline `80f6933` | `4` tệp tham chiếu `withPublicDb`, `5` vị trí gọi `enforceRateLimits`. Khớp đúng con số contract ghi. Trang chi tiết là consumer DUY NHẤT đếm `0` limiter | None |
| `STEP-03` | `RQ-01` | [src/shared/security/rate-limit-guard.ts](src/shared/security/rate-limit-guard.ts) — tách `evaluateRateLimits` | Diff `38 9` của đúng một tệp. `enforceRateLimits` nguyên chữ ký, thân còn `5` dòng | None |
| `STEP-04` | `RQ-01` | `npm run test:unit` ngay sau `STEP-03`, TRƯỚC khi sửa trang | `104` tệp `1611` test, exit `0`. Không sửa một tệp route nào mà mọi test của bốn route còn xanh | None |
| `STEP-05` | `RQ-02`, `RQ-03` | [app/(jobs)/viec-lam/[slug]/page.tsx](app/(jobs)/viec-lam/[slug]/page.tsx) | Diff `91 5` của đúng một tệp. Limiter `:92` trước `withPublicDb` `:102`, nhánh từ chối `return` ở `:100` | None |
| `STEP-06` | `RQ-07` | [app/api/public/applications/[trackingCode]/route.ts](app/api/public/applications/[trackingCode]/route.ts) | Diff `1 1`. Nhánh `404` nhận `Cache-Control: no-store`, thân `200` không đổi | None |
| `STEP-07` | `RQ-05`, `RQ-06` | [src/shared/security/public-surface-limiter.static.test.ts](src/shared/security/public-surface-limiter.static.test.ts) — `187` dòng | Lane con `9 passed`, exit `0`. Chạy trên nội dung trang TRƯỚC bản sửa thì `1 failed`, `RED_EXIT=1` | None |
| `STEP-08` | `RQ-08` | [src/domains/applications/marketplace-inventory.static.test.ts](src/domains/applications/marketplace-inventory.static.test.ts) | Cộng `7 0`. Lane con `25 passed`, `S08_EXIT=0` | None |
| `STEP-09` | `RQ-09` | `git status --porcelain` trên `17` đường dẫn cấm chạm, chạy RIÊNG từng path | `FORBID_TOTAL=0`. Cả `17` path đếm `0 0` | None |
| `STEP-11` | `RQ-11` | Đo lại `EV-11` tới `EV-14` trên [src/domains/applications/application.service.ts](src/domains/applications/application.service.ts) | Bốn con số: `1` tệp tham chiếu, `row.phone` `1` lần, `row.cccd_number` `1` lần, `PublicTrackingDto` có `11` khoá và không khoá thô nào | None |
| `STEP-12` | `RQ-11`, `RQ-12` | [src/domains/applications/tracking-pii-containment.static.test.ts](src/domains/applications/tracking-pii-containment.static.test.ts) — `196` dòng | Lane con `11 passed`, `S12_EXIT=0` | None |
| `STEP-10` | tổng | `npm run test:unit`, `npm run typecheck`, phân nhóm phạm vi, ghi `HANDOFF.md` cộng `evidence/`, rồi `git add` | Lane `106` tệp `1631` test, exit `0`. Typecheck `TSC_EXIT=1` với ĐÚNG `1` dòng đỏ, giống byte với mốc `STEP-01`, `DIFF_EXIT=0`. KHÔNG commit, KHÔNG push, KHÔNG deploy | `DEV-01` cộng `LIM-02` cộng `LIM-03` |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-18-public-surface-hardening/TASK.md` | `RESULT: PASS`, `GATE_EXIT = 0` | evidence/s10-gate-task-rerun.txt — mười mã kiểm xanh, `T-05` đọc đủ `18` AC. Bản chạy trước ở evidence/s10-gate-task.txt | None |
| `AC-01` | `git diff --cached -- src/shared/security/rate-limit-guard.ts` cộng một phép đếm bằng `node` trên thân đã bóc comment | `AC01_NODE_EXIT=0`. `evaluateRateLimits` ở `:119`, `enforceRateLimits` ở `:164` nguyên chữ ký, thân `164..169` là `5` dòng | evidence/s10-ac-recheck.txt — `canonicalValueFor` `:132`, `hashRateLimitIdentifier` `:134`, hai `catch` fail-closed `:126` và `:139`, `warn` `:145` cộng `:179`, tất cả nằm trong `evaluateRateLimits` hoặc helper dùng chung `logUnavailable` `:172`. `consumeRateLimit(` đếm `0` lần trong thân `enforceRateLimits` | None |
| `AC-02` | `git status --porcelain app/api/jobs/route.ts app/api/jobs/[slug]/route.ts app/api/public/jobs/[slug]/applications/route.ts` | `AC02_EXIT=0`, `0 dòng` output | evidence/s10-ac-recheck.txt và evidence/s09-forbidden-verified.txt — ba route đếm `0 0` khi chạy riêng từng path | None |
| `AC-03` | Đọc output `STEP-04`, tức `npm run test:unit` chạy ngay sau bản refactor và TRƯỚC khi sửa trang | exit `0`, `104 passed (104)` tệp, `1611 passed (1611)` test | evidence/s04-unit.txt — lane đóng lúc `23:57:42`, không một tệp route nào bị sửa | None |
| `AC-04` | `grep -n` trên [app/(jobs)/viec-lam/[slug]/page.tsx](app/(jobs)/viec-lam/[slug]/page.tsx) so THỨ TỰ dòng của limiter với `withPublicDb` và `getPublicJobDetail` | `AC04_EXIT=0`. Limiter `:92` nhỏ hơn `withPublicDb` `:102`. Nhánh từ chối `return` riêng ở `:100` | evidence/s10-ac-recheck.txt — giữa `:92` và `:100` không có một lệnh gọi `withPublicDb` nào | None |
| `AC-05` | `grep -n "JOB_BROWSE" app/(jobs)/viec-lam/[slug]/page.tsx` cộng `git status --porcelain src/shared/security/rate-limit-port.ts` | `AC05A_EXIT=0` với `RATE_LIMIT_RULES.JOB_BROWSE` ở `:94`. `AC05B_EXIT=0`, `0 dòng` | evidence/s10-ac-recheck.txt — không rule mới, không ngân sách nào bị nới; `rate-limit-port.ts` đếm `0 0` ở evidence/s09-forbidden-verified.txt | None |
| `AC-06` | `grep -n` nhánh từ chối trong trang, tìm mọi lần in giá trị request và mọi lần gọi `notFound()` | `0` lần in slug, `0` lần in IP, `0` lần in giá trị bucket. `notFound()` chỉ ở `:184`, tức nhánh `404` THẬT, không ở nhánh từ chối `:100` | evidence/s10-ac-recheck.txt — nhánh từ chối chạy qua `:110` và `:181`, cả hai chỉ render hằng số tĩnh | None |
| `AC-07` | `grep -c` chuỗi ba chữ số của mã từ chối HTTP trên `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/HANDOFF.md`, cộng đọc mục giới hạn ở §1 và `LIM-01` | Chuỗi ấy đếm `0` dòng. Dòng giới hạn có mặt ở §1 và ở `LIM-01`, ghi rõ trang trả `200` vì Server Component không đặt được status, và điều được bảo đảm là ZERO truy vấn DB | evidence/s10-handoff-denycode.txt — phép đếm chạy trên chính tệp này | None |
| `AC-08` | `ls src/shared/security/public-surface-limiter.static.test.ts` cộng `npx vitest run --config vitest.unit.config.ts src/shared/security/public-surface-limiter.static.test.ts` | Tệp tồn tại, `187` dòng. Lane con `9 passed`, exit `0` | evidence/s07-green.txt và evidence/s07-green2.txt | None |
| `AC-09` | Đọc mã hàng rào cộng `grep -c "viec-lam" src/shared/security/public-surface-limiter.static.test.ts` | Đếm `0`, dưới ngưỡng `1`. Tập consumer TỰ SUY bằng `readdirSync` đệ quy trên `SCAN_ROOTS`, không một mảng literal nào | evidence/s10-ac-recheck.txt cộng [src/shared/security/public-surface-limiter.static.test.ts:30](src/shared/security/public-surface-limiter.static.test.ts#L30) — `SCAN_ROOTS` phủ cả `src` và `app`, và có assertion đòi CẢ HAI cây có tệp tham chiếu | None |
| `AC-10` | Đọc mã tìm fixture âm cộng chạy hàng rào trên nội dung trang TRƯỚC bản sửa bằng `npx vitest run --config vitest.unit.config.ts` | `5` case fixture âm. Trên nội dung baseline: `Tests 1 failed, 8 passed (9)`, `RED_EXIT=1` | evidence/s07-red.txt cộng evidence/s07-page-sha.txt — trang đã phục hồi về `sha256 8e706a2c` sau phép thử ĐỎ | None |
| `AC-11` | `git diff --cached -- app/api/public/applications/[trackingCode]/route.ts` cộng `git diff --cached --numstat` trên đúng tệp đó | Diff `1 1`, tổng `2` dòng đổi, dưới ngưỡng `4`. Nhánh `404` nhận đúng một khoá `Cache-Control` | evidence/s10-ac11-route.diff — thân `404` không nhận khoá nào khác, nhánh `200` không đổi một byte | None |
| `AC-12` | `git diff --cached -- src/domains/applications/marketplace-inventory.static.test.ts` cộng output `STEP-08` bằng `npx vitest run --config vitest.unit.config.ts` | Cộng `7 0`. Hai assertion phủ định mới. Lane con `25 passed`, `S08_EXIT=0` | evidence/s10-ac12-inventory.diff cộng evidence/s08-inventory.txt — hai dòng khẳng định cũ ở `:353` và `:354` còn nguyên byte, assertion phủ định dùng lookahead nên KHÔNG bắt luôn khoá đã che, chứng minh ở evidence/s08-regex-probe.txt | None |
| `AC-13` | `git status --porcelain src/domains/job-board/public.service.ts middleware.ts src/shared/security/rate-limit-identity.ts` cộng `git diff --cached --name-only -- prisma/` | `AC13_A_EXIT=0` và `AC13_B_EXIT=0`, cả bốn cho `0 dòng` | evidence/s10-ac-recheck.txt cộng evidence/s09-forbidden-verified.txt — `17` đường dẫn cấm chạm chạy RIÊNG từng path, mỗi path đếm `0 0`, `FORBID_TOTAL=0` | None |
| `AC-14` | `npm run test:unit` rồi `npm run typecheck`, lấy mã thoát bằng redirect chứ không sau ống. Cộng `diff` giữa tập dòng đỏ của `STEP-10` và của `STEP-01` | Lane exit `0` với `106 passed (106)` tệp và `1631 passed (1631)` test, cao hơn mốc `104` và `1611`. Typecheck `TSC_EXIT=1` với ĐÚNG `1` dòng đỏ `new-ui/components/JobCard.tsx(18,6): error TS2322`. `DIFF_EXIT=0`, tập dòng đỏ giống byte với mốc đo trên baseline `80f6933` bằng cùng lệnh `npm run typecheck` | evidence/s10-unit.txt, evidence/s10-tsc-exit.txt, evidence/s10-tsc-diff.txt, evidence/s01-tsc.txt — `new-ui/` là cây UI chưa có contract, `grep -c "new-ui"` đếm `0` trong CẢ BA TASK.md của lô nên không quy được cho contract nào; chi tiết ở `DEV-01` | Typecheck không exit `0`. Dòng đỏ không thuộc path đã khai của contract nào, xem `DEV-01` |
| `AC-15` | `git status --porcelain` cộng `git diff --cached --name-only` rồi hợp hai danh sách và phân nhóm theo `4.2`. Cộng `git status --porcelain` chạy riêng trên từng đường dẫn cấm chạm. Cộng `git log --oneline -1` | Hợp hai danh sách `205` path. Index có đúng `9` path: `6` của tôi cộng `3` tệp gate của luồng khác. Nhóm một `4` path, nhóm hai `2` path, nhóm ba là `HANDOFF.md` cộng `evidence/`, nhóm bốn `GROUP4_TOTAL=0`. Cấm chạm `FORBID_TOTAL=0`. `git log --oneline -1` cho `e58a6c0`, KHÔNG bằng baseline `80f6933` | evidence/s10-scope-groups.txt, evidence/s09-forbidden-verified.txt, evidence/s10-scope-raw.txt, evidence/s10-ac-recheck.txt — phép quy trách chạy bằng `find -newermt` trên cả `205` path và chỉ `32` tệp bị ghi trong cửa sổ của tôi, gồm `6` path mã cộng `26` tệp trong `evidence/`. Mệnh đề `HEAD` bằng baseline không thoả và lý do nằm ở `LIM-02` | `HEAD` cách baseline `9` commit, cả `9` là của Tier 1, xem `LIM-02`. `~198` path lạ trong porcelain là của luồng khác, xem `LIM-03` |
| `AC-16` | `ls src/domains/applications/tracking-pii-containment.static.test.ts` cộng `npx vitest run --config vitest.unit.config.ts src/domains/applications/tracking-pii-containment.static.test.ts` | Tệp tồn tại, `196` dòng. Lane con `11 passed`, `S12_EXIT=0` | evidence/s12-pii.txt | None |
| `AC-17` | Đọc mã hàng rào mới cộng `grep -c "application.service" src/domains/applications/tracking-pii-containment.static.test.ts` | Đếm `1`, đúng ngưỡng `1`, và lần ấy chỉ ĐỐI CHIẾU kết quả quét. Ba mệnh đề `DEC-11` có mặt: `1` tệp tham chiếu, `row.phone` `1` lần bọc bởi `maskPhone(`, `row.cccd_number` `1` lần bọc bởi `maskCccd(`, `PublicTrackingDto` có `11` khoá và `0` khoá thô | evidence/s10-ac-recheck.txt cộng evidence/s11-pii-baseline.txt — hai lần dùng thô nằm ở `:233` và `:234` của service, cả hai bên trong hàm che. Tập tệp TỰ SUY bằng `readdirSync`, `SCAN_ROOTS` phủ cả `src` và `app` | None |
| `AC-18` | Đọc mã tìm assertion phủ định và fixture âm, cộng output `STEP-12` bằng `npx vitest run --config vitest.unit.config.ts` | Assertion neo vào `row.phone` và `row.cccd_number`, `0` lần neo vào chuỗi `phone` trần. `7` case fixture âm, trong đó `2` case bắt khoá thô TRẦN. Lane con `11 passed`, `S12_EXIT=0` | evidence/s12-pii.txt cộng [src/domains/applications/tracking-pii-containment.static.test.ts:33](src/domains/applications/tracking-pii-containment.static.test.ts#L33) — case ở `:184` chứng minh hàng rào KHÔNG đỏ trên `normalizedPhone` của đường nộp hồ sơ, đúng `DEC-12`; case ở `:180` bắt hồi quy THẬT là một dòng thô thêm BÊN CẠNH dòng đã bọc | None |

## 4. Changed Deliverables

Sáu path mã, phân đúng hai nhóm đầu của `4.2`. Đo bằng `git diff --cached --numstat`.

| Path | Nhóm `4.2` | numstat | Vai trò |
|---|---|---|---|
| [src/shared/security/rate-limit-guard.ts](src/shared/security/rate-limit-guard.ts) | nhóm 1 | `38 9` | Tách `evaluateRateLimits` theo `RQ-01`, `enforceRateLimits` nguyên chữ ký |
| [app/(jobs)/viec-lam/[slug]/page.tsx](app/(jobs)/viec-lam/[slug]/page.tsx) | nhóm 1 | `91 5` | Limiter trước DB theo `RQ-02` và `RQ-03`, nhánh từ chối `return` sớm |
| [app/api/public/applications/[trackingCode]/route.ts](app/api/public/applications/[trackingCode]/route.ts) | nhóm 1 | `1 1` | `Cache-Control: no-store` cho nhánh `404` theo `RQ-07` |
| [src/domains/applications/marketplace-inventory.static.test.ts](src/domains/applications/marketplace-inventory.static.test.ts) | nhóm 1 | `7 0` | Hai assertion phủ định theo `RQ-08` và `DEC-08` |
| [src/shared/security/public-surface-limiter.static.test.ts](src/shared/security/public-surface-limiter.static.test.ts) | nhóm 2 | `187 0` | Hàng rào limiter theo `RQ-05` và `RQ-06` |
| [src/domains/applications/tracking-pii-containment.static.test.ts](src/domains/applications/tracking-pii-containment.static.test.ts) | nhóm 2 | `196 0` | Hàng rào giữ PII theo `RQ-11` và `RQ-12` |

Nhóm 3 là `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/HANDOFF.md` cộng `30` artifact trong `evidence/`. Nhóm 4 đếm `GROUP4_TOTAL=0`: task này chạy TRƯỚC 17 và test-01 trong lô nên `14` path đã khai của hai contract kia còn sạch, kể cả `package.json` và `package-lock.json`. Đây là một số đo, không phải một defect — tiền đề "CÓ MẶT trong cây" của `4.2` mô tả trạng thái SAU khi hai contract kia chạy.

## 5. Deviations

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `LIM-01` | Giới hạn CÓ TÊN của `RQ-04`, contract đã biết trước | evidence/s10-ac-recheck.txt — nhánh từ chối `return` ở `:100`, `withPublicDb` ở `:102` | Trang trả HTTP `200` khi bị từ chối, KHÔNG đặt được status code, vì Next 15.1 không cho một Server Component làm việc đó. Thứ được bảo đảm là ZERO truy vấn DB, và đó đúng là thứ chặn máy quét | Không cần. `DEC-03` đã quyết, `AC-07` chỉ đòi ghi rõ |
| `DEV-01` | Sai lệch so với mặt chữ `AC-14` | `npm run typecheck` cho `TSC_EXIT=1` với `1` dòng đỏ `new-ui/components/JobCard.tsx(18,6): error TS2322`, giống byte với cùng lệnh chạy trên baseline `80f6933`, `DIFF_EXIT=0` ở evidence/s10-tsc-diff.txt | `AC-14` đòi "cả hai exit `0`". Lane test exit `0`, typecheck KHÔNG. Dòng đỏ nằm ở `new-ui/`, cây UI chưa có contract nào sở hữu: `grep -c "new-ui"` đếm `0` trong cả ba TASK.md của lô, nên luật quy trách của `AC-14` không gán được cho 17 hay test-01. Sửa nó đòi chạm `new-ui/`, ngoài bốn nhóm của `4.2`, tức FAIL phạm vi | Tier 1 quyết: coi `DEV-01` là dư nợ của contract `ui-01` chưa viết, hay mở phạm vi cho một task khác. Tôi KHÔNG sửa `new-ui/` và không tự nới phạm vi |
| `LIM-02` | Trạng thái cây, không phải bản giao | `git log --oneline -1` cho `e58a6c0`. `git rev-list --count 80f6933..HEAD` cho `9`. `git diff --name-only 80f6933..HEAD` trên sáu path Modules cho `0 dòng`, `AC15_DRIFT_EXIT=0`. `git reflog -4` cho thấy bốn entry trên cùng đều là commit của Tier 1 | Mệnh đề "`HEAD` bằng baseline" của `AC-15` KHÔNG thoả. Chín commit đó là bảy commit docs cộng hai `fix(a11y)` của go-live-15 và go-live-16, do Tier 1 tạo trước khi lệnh `/code` phát ra. Không commit nào chạm một path nào của task này, nên phép đo của tôi không bị nhiễm, và tôi tạo `0` commit | Tier 1 xác nhận cách đọc `AC-15` theo `v1.2`: revision log ghi rõ `AC-15` đã đổi sang "phép đếm ATTRIBUTION cộng một phép kiểm danh sách cấm chạm phải sạch", còn mệnh đề `HEAD` là câu sót của bản cũ |
| `LIM-03` | Index dùng chung với luồng khác | evidence/s10-scope-groups.txt — `git diff --cached --name-only` cho `9` path, ba trong đó là `.ai-pipeline/scripts/gate-lib.ps1` `434 0`, `.ai-pipeline/scripts/verify-handoff.ps1` `341 0`, `.ai-pipeline/scripts/verify-pipeline.ps1` `12 2`. `git status --porcelain` cho `205` path, trong đó `173` thuộc `scratch/` | Ba tệp gate do một Agent khác của Owner staged, không phải tôi; luật của Owner cấm tôi unstage chúng. Phép quy trách bằng `find -newermt '2026-09-03 23:40'` trên cả `205` path trả `32` tệp và tất cả là của tôi: `6` path mã cộng `26` tệp `evidence/` | **CẢNH BÁO cho người commit:** `git add <path>` rồi `git commit` vẫn commit TOÀN BỘ index, tức sẽ ăn cả ba tệp gate chưa audit. Phải dùng `git commit -- <pathspec>` rồi đọc diffstat của chính commit đó trước khi push |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| Cổng hợp đồng | evidence/s10-gate-task-rerun.txt cộng evidence/s10-gate-task.txt | `RESULT: PASS`, `GATE_EXIT = 0`, mười mã kiểm xanh |
| Mốc `STEP-01` | evidence/s01-unit.txt cộng evidence/s01-tsc.txt | `104` tệp `1611` test exit `0`; `1` dòng đỏ typecheck có TRƯỚC mọi thay đổi của tôi |
| Số đo `STEP-02` | evidence/s02-surface-inventory.txt | `4` tệp `withPublicDb` và `5` vị trí `enforceRateLimits` trên baseline, khớp `EV-02` và `EV-04` |
| Refactor guard | evidence/s05-guard.txt cộng evidence/s03-guard.py | `evaluateRateLimits` tách ra, script sinh diff |
| Hồi quy `STEP-04` | evidence/s04-unit.txt | `104` tệp `1611` test exit `0` NGAY SAU refactor, chưa sửa trang |
| Sửa trang | evidence/s05-page.py cộng evidence/s05-tsc.txt cộng evidence/s05-tsc-pwsh.txt | Bản sửa trang và hai lần đo typecheck |
| Sửa route tracking | evidence/s06-route.py cộng evidence/s10-ac11-route.diff | Diff `1 1`, chỉ nhánh `404` |
| Hàng rào limiter XANH | evidence/s07-green.txt cộng evidence/s07-green2.txt | `9 passed`, exit `0` |
| Hàng rào limiter ĐỎ trên baseline | evidence/s07-red.txt cộng evidence/s07-page-sha.txt cộng evidence/s07-page-current.bak | `1 failed, 8 passed`, `RED_EXIT=1`, rồi trang phục hồi về `sha256 8e706a2c` |
| Assertion phủ định inventory | evidence/s08-inventory.txt cộng evidence/s08-regex-probe.txt cộng evidence/s10-ac12-inventory.diff | `25 passed`, `S08_EXIT=0`, lookahead không bắt oan khoá đã che |
| Cấm chạm | evidence/s09-forbidden-verified.txt | `17` path chạy RIÊNG từng cái, mỗi cái `0 0`, `FORBID_TOTAL=0` |
| Số đo `STEP-11` | evidence/s11-pii-baseline.txt | `1` tệp tham chiếu, `row.phone` `1`, `row.cccd_number` `1`, DTO `11` khoá và `0` khoá thô |
| Hàng rào PII | evidence/s12-pii.txt | `11 passed`, `S12_EXIT=0` |
| Tổng `STEP-10` | evidence/s10-unit.txt cộng evidence/s10-tsc-exit.txt cộng evidence/s10-tsc-diff.txt | `106` tệp `1631` test exit `0`; `TSC_EXIT=1` với tập dòng đỏ giống byte mốc, `DIFF_EXIT=0` |
| Chạy lại từng AC | evidence/s10-ac-recheck.txt | Từng phép kiểm AC chạy lại ở `STEP-10` kèm mã thoát |
| Phạm vi | evidence/s10-scope-groups.txt cộng evidence/s10-scope-raw.txt | `205` path hợp, `9` path index, phân đúng bốn nhóm `4.2`, `GROUP4_TOTAL=0` |
| Giới hạn `RQ-04` | evidence/s10-handoff-denycode.txt | Chuỗi mã từ chối HTTP đếm `0` dòng trong `HANDOFF.md` |
| Cổng HANDOFF | evidence/s10-gate-handoff.txt | Hai lượt chạy `verify-handoff.ps1`: lượt một `RESULT: FAIL` `HANDOFF_GATE_EXIT = 2` ở `H-05`, lượt hai `RESULT: PASS` `HANDOFF_GATE_EXIT = 0` với `14` mã kiểm OK |

Hai ghi chú về chính bộ artifact, ghi ra để Tier 3 không phải tự phát hiện:

- `evidence/s01-gate18.txt` là **`0` byte**. Nó là lần chạy cổng đầu tiên và đã bị thay bằng hai tệp có nội dung ở dòng đầu bảng trên. Một tệp rỗng không phân biệt được "không có gì để in" với "lệnh chưa từng chạy", nên đừng dùng nó làm bằng chứng.
- `evidence/s09-forbidden.txt` cũng là `0` byte, và ở đó `0` byte đúng là kết quả mong đợi vì `git status --porcelain` trả rỗng. Vì cùng lý do trên, tôi viết thêm `evidence/s09-forbidden-verified.txt` in kèm lệnh, số dòng và mã thoát cho từng path. Tệp `0` byte gốc giữ nguyên, không bị ghi đè.
- Cổng HANDOFF lượt một FAIL vì một dòng trắng giữa bảng `§3` cắt bảng làm hai, nên bảy hàng `AC-12`..`AC-18` nằm ở một bảng thứ hai không có dòng tiêu đề và KHÔNG được đếm. Đây là biến thể thứ tư của bẫy ô bảng đã ghi trong TASK: không chỉ dấu ống trần phá số cột, một dòng TRẮNG cũng phá cả bảng mà mắt thường không thấy. Sửa bằng cách xoá đúng một dòng trắng, `25192` byte thành `25191`; không một ô nào đổi nội dung.

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.2` | `READY_FOR_AUDIT` | Bốn lỗ bịt xong, hai hàng rào tĩnh mới `9` cộng `11` test xanh, lane canonical `106` tệp `1631` test exit `0`. Một sai lệch `DEV-01` là dòng đỏ typecheck của `new-ui/` đã có trên baseline `80f6933`, cộng hai giới hạn trạng thái cây `LIM-02` và `LIM-03`. KHÔNG commit, KHÔNG push, KHÔNG deploy |

> Handoff status: `READY_FOR_AUDIT`





