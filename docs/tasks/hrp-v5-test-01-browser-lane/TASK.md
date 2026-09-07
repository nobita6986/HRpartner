# TASK: hrp-v5-test-01-browser-lane

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-test-01-browser-lane` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.5` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `f9c7bca` |
| Modules | `playwright.config.ts`, `tests/browser/public-home.spec.ts`, `package.json`, `.gitignore` |
| ADR references | `hrp-v5-go-live-07-marketplace-launch-proof` `DEC-20` — nơi ghi rằng URL gốc đo được bằng DOM sau hydrate HOẶC bằng response của API, tức lane trình duyệt là TUỲ CHỌN cho ra mắt; `hrp-v5-go-live-08-public-ui-premium` — round mà mười hai AC đòi giá trị tính bởi trình duyệt trong một repo không có trình chạy nào |
| Current execution round | `4` |
| Current audit round | `2` |
| Next gate | `PHASE_REVIEW` — Tier 1 cập nhật `ROADMAP_CURSOR` §0 của `docs/PLANNER_HANDOVER.md` rồi chọn candidate kế tiếp theo hàng đợi sau TEST-01 |
| Updated | `2026-09-07 Asia/Bangkok` |

Repo hiện KHÔNG có trình chạy test trên trình duyệt: `devDependencies` không có Playwright, không Puppeteer, không jsdom, không `@testing-library`. Đó là lý do `go-live-08` từng có mười hai AC đòi giá trị tính bởi trình duyệt mà không ai đo được, và là lý do mọi hàng rào giao diện từ đó tới nay đều là hàng rào TĨNH đọc mã nguồn.

Task này dựng lane ấy, ĐÚNG một lần, với phạm vi hẹp nhất còn có ích: một trình chạy, một cấu hình, một spec khói. Nó **không** phải một bộ end-to-end, **không** phải visual regression, và **không** phải điều kiện của ra mắt.

Điều quan trọng nhất về thiết kế: spec này **không chạm database nào**. Nó chặn `/api/jobs` ở tầng mạng và trả một fixture, nên nó chứng minh đúng một điều mà mọi test tĩnh hiện có không chứng minh được — rằng trang chủ HYDRATE và VẼ dữ liệu API ra DOM thật. Lý do ở `DEC-03` và `DEC-04`.

## 1. Outcome

### User-visible outcome

1. Lệnh chạy được một lần là có kết luận: trang chủ sau khi hydrate có in tên việc ra DOM hay không. Trước task này, câu đó chỉ trả lời được bằng mắt người.
2. Một hồi quy dạng "trang chủ trắng trơn vì lỗi hydrate" bị bắt bằng máy. Đây đúng lớp lỗi mà test tĩnh mù hoàn toàn, vì mã nguồn vẫn chứa đủ chuỗi cần grep.
3. Không lập trình viên nào phải cài tay: một lệnh trong `package.json` cộng một cấu hình đã ghim là đủ.

### Non-goals

- Không viết end-to-end cho luồng nộp hồ sơ, luồng tra cứu, hay bất kỳ luồng đăng nhập nào. Một spec, một trang.
- Không visual regression, không so ảnh, không snapshot ảnh.
- Không ma trận nhiều trình duyệt. Chỉ Chromium.
- Không nối vào CI. Lane này chạy bằng tay cho tới khi có một contract riêng nối nó vào pipeline.
- Không chạm `vitest.unit.config.ts`, không chạm `vitest.integration-files.ts`, không đổi lane unit đang có.
- Không chạm mã ứng dụng. Không một tệp nào dưới `app/` hay `src/` được sửa.
- Không chạy spec trên production và không trỏ vào một database nào. Lý do ở `DEC-03`.
- Không dùng lane này để đo `RQ-04` của contract 07. `DEC-20` của contract 07 đã cho phép nhánh API, và contract 07 chạy TRƯỚC task này.

## 2. Evidence và Baseline

Mọi phép đo dưới đây chạy trên baseline ghi ở `0. Control` bằng `git show`, không trên worktree.

| ID | Nguồn | Điều đã đo | Vì sao nó quyết định thiết kế |
|---|---|---|---|
| `EV-01` | `package.json` khoá `devDependencies` | Đúng mười bốn gói, và KHÔNG gói nào là trình chạy trình duyệt: không Playwright, không Puppeteer, không jsdom, không `@testing-library`. Trình chạy test duy nhất là `vitest` | Lane này là đất trống. Không có gì để tái dùng, và cũng không có gì để phá |
| `EV-02` | `package.json` khoá `scripts` | Mười một script. `test:unit` là lane canonical. Không script nào tên `test:browser` | Task phải THÊM một script mới. Cho tới lúc nó tồn tại thì mọi tài liệu phải gọi trình chạy trực tiếp, không gọi qua một script chưa có |
| `EV-03` | `app/(portal)/page.tsx:1` | Dòng đầu tệp là `'use client'`. Trang chủ là Client Component | Đây là lý do lane này có giá trị: một Client Component không in dữ liệu vào HTML đầu tiên, nên `curl` không bao giờ thấy tên việc. Chỉ một trình duyệt thật, sau hydrate, thấy được |
| `EV-04` | `app/(portal)/page.tsx:631` | Trang gọi `fetch` tới `/api/jobs` với `cache: 'no-store'` và một `AbortController` | Đây là đúng một điểm chặn: một `page.route` trên `/api/jobs` bao trọn nguồn dữ liệu của trang, nên không cần database |
| `EV-05` | `app/(portal)/page.tsx:962` | Trang in chuỗi `Tìm thấy` cộng tổng số kết quả | Đây là một mốc DOM ổn định và không phải màu, không phải toạ độ. Nó khẳng định trang đã hydrate VÀ đã đọc được `total` từ response |
| `EV-06` | `vitest.unit.config.ts` khoá `env` | Lane unit ép `DATABASE_URL` về một chuỗi sentinel trỏ vào cổng `1` của `127.0.0.1` — cổng không cấp phát được, tức từ chối kết nối ngay. Chuỗi nguyên văn nằm ở hằng `BLOCKED_DB_URL` trong tệp đó và Tier 2 phải CHÉP LẠI từ đó, không tự nghĩ ra chuỗi mới | Đây là mẫu fail-closed đã được kiểm chứng trong repo. Lane trình duyệt phải dùng LẠI đúng mẫu này cho tiến trình server mà nó khởi động |
| `EV-07` | `.env` của repo | `.env` trỏ vào database PRODUCTION | Vì vậy khởi động `next start` mà không ép biến môi trường là trỏ một trình chạy test vào production. `DEC-03` cấm điều đó bằng một cơ chế, không bằng một lời nhắc |
| `EV-08` | `.gitignore`, 72 dòng | Có `.next/`, `out/`, `dist/`, `build/`, `node_modules/`. KHÔNG có `test-results/`, KHÔNG có `playwright-report/` | Trình chạy sinh hai thư mục đó mỗi lần chạy. Không thêm chúng vào `.gitignore` thì lần chạy đầu làm bẩn cây và bẫy chính người chạy nó |
| `EV-09` | `tests/` | Thư mục `tests/` ĐÃ tồn tại ở gốc repo | Spec mới đặt dưới `tests/browser/` là đi theo cấu trúc đang có, không dựng một gốc thứ hai |
| `EV-10` | `vitest.unit.config.ts` khoá `include` | Lane unit chỉ thu `src/**/*.test.ts`, `packages/**/*.test.ts`, `prisma/**/*.test.ts` | `tests/browser/**` KHÔNG nằm trong lane unit, nên spec mới không bao giờ bị vitest thu và hai lane không đụng nhau. Đây là lý do đặt spec dưới `tests/`, không dưới `src/` |

## 3. Decisions và Assumptions

| ID | Quyết định | Lý do |
|---|---|---|
| `DEC-01` | Trình chạy là **Playwright**, gói `@playwright/test`, chỉ Chromium | Nó tự tải và tự ghim nhị phân trình duyệt nên không phụ thuộc trình duyệt của máy; trình chạy của nó trả mã thoát đúng chuẩn nên `AC` đo được; và nó là lựa chọn mặc định của hệ sinh thái Next. Puppeteer thiếu một trình chạy test nên sẽ phải tự dựng phần báo cáo và mã thoát |
| `DEC-02` | Phiên bản ghim CHÍNH XÁC. Cài bằng `npm install --save-dev --save-exact @playwright/test`, và Tier 2 ghi phiên bản đã phân giải vào `HANDOFF.md`. CẤM dải phiên bản mở | Một dải mở làm lane này đổi hành vi giữa hai máy mà không ai đổi mã. Tier 1 không ghim một con số cụ thể ở đây vì con số đúng là con số npm phân giải lúc cài, và bịa một phiên bản không tồn tại sẽ làm bước cài chết |
| `DEC-03` | Cấu hình khởi động server bằng khoá `webServer` của Playwright, và trong `env` của khoá đó **ép** `DATABASE_URL` về đúng sentinel không tới được mà lane unit đang dùng (`EV-06`). CẤM để tiến trình test đọc `DATABASE_URL` từ `.env` | `EV-07`: `.env` là production. Một trình chạy test tự động phải KHÔNG THỂ tới production, và cách duy nhất bảo đảm điều đó là ép biến, không phải nhắc nhau. Fail-closed: nếu có đường nào cố mở kết nối, nó chết ồn ào ở `127.0.0.1:1` |
| `DEC-04` | Spec chặn `/api/jobs` bằng `page.route` và trả một fixture JSON dựng trong chính spec. KHÔNG gọi API thật, KHÔNG cần database | Đây là điều làm `DEC-03` khả thi và làm spec chạy được ở mọi máy. Nó cũng làm phạm vi khẳng định RÕ: spec chứng minh HYDRATE và VẼ, không chứng minh API trả đúng. Hai điều đó do hai lane khác nhau canh |
| `DEC-05` | **Giới hạn CÓ TÊN:** vì `/api/jobs` bị chặn, spec này KHÔNG chứng minh gì về database, về RLS, hay về tính đúng của dữ liệu. Nó chứng minh đúng một điều: trang chủ hydrate và in dữ liệu API ra DOM. Giới hạn ghi nguyên văn vào `HANDOFF.md` | Ghi ra thì một round sau không đọc "lane trình duyệt xanh" thành "bề mặt công khai đã được chứng minh đầu-cuối". Đây đúng lớp lỗi mà `TEXT_PAIRS` của `go-live-08` gây ra: một hàng rào xanh bị đọc rộng hơn phạm vi thật của nó |
| `DEC-06` | Fixture của spec chứa ít nhất hai job, mỗi job có tiêu đề DUY NHẤT và không trùng bất kỳ chuỗi tĩnh nào của trang. Spec khẳng định cả hai tiêu đề có mặt trong DOM, cộng chuỗi `Tìm thấy` với đúng tổng của fixture | Tiêu đề trùng một chuỗi tĩnh sẽ làm assertion xanh cả khi hydrate thất bại — trang vẫn in phần vỏ. Hai job thay vì một chặn một bản render chỉ vẽ phần tử đầu. Tổng số lấy từ fixture chặn việc trang in một số cứng |
| `DEC-07` | Spec chạy trên bản `next build` cộng `next start`, KHÔNG trên `next dev` | `next dev` có overlay lỗi, có Fast Refresh và có thời gian biên dịch lần đầu không xác định — cả ba làm spec chập chờn. Bản build là bản gần production nhất mà vẫn chạy local |
| `DEC-08` | Thêm `test-results/` và `playwright-report/` vào `.gitignore` trong CÙNG bản giao | `EV-08`: không thêm thì lần chạy đầu làm bẩn cây, và một `AC` phạm vi sẽ FAIL vì chính công cụ mà task này dựng |
| `DEC-09` | Thêm đúng MỘT script vào `package.json`, tên `test:browser`. Không đổi, không xoá, không đổi tên mười một script đang có | Một script mới là bề mặt tối thiểu. `test:unit` là lane canonical và không được đụng tới |
| `DEC-10` | Lane này KHÔNG nối vào CI trong task này, và KHÔNG được đưa vào bất kỳ `AC` nào của contract khác | Nối CI cần quyết định về thời gian chạy, về nơi tải nhị phân trình duyệt và về ngân sách. Đó là một contract riêng, sau ra mắt |

## 4. Contract

### 4.1 Requirements

| ID | Yêu cầu | Mức | Nguồn | Dấu hiệu FAIL |
|---|---|---|---|---|
| `RQ-01` | Cài `@playwright/test` vào `devDependencies` với phiên bản ghim CHÍNH XÁC, và ghi phiên bản đã phân giải vào `HANDOFF.md` | Must | `DEC-01`, `DEC-02`, `EV-01` | Phiên bản là một dải mở; hoặc `HANDOFF` không ghi phiên bản; hoặc gói được cài vào `dependencies` thay vì `devDependencies` |
| `RQ-02` | Tạo `playwright.config.ts` ở gốc repo: chỉ Chromium, và khoá `webServer` khởi động bản build theo `DEC-07` | Must | `DEC-01`, `DEC-07` | Cấu hình chạy nhiều trình duyệt; hoặc `webServer` chạy chế độ dev; hoặc không có `webServer` nên spec đòi ai đó khởi động server bằng tay |
| `RQ-03` | Trong `webServer.env` của cấu hình, ÉP `DATABASE_URL` về đúng chuỗi sentinel mà lane unit dùng. Tiến trình test không được đọc `DATABASE_URL` từ `.env` | Must | `DEC-03`, `EV-06`, `EV-07` | `webServer` không có khoá `env`; hoặc `DATABASE_URL` không bị ép; hoặc bị ép về một địa chỉ tới được |
| `RQ-04` | Tạo `tests/browser/public-home.spec.ts`. Nó chặn `/api/jobs` bằng `page.route` và trả fixture JSON dựng trong chính spec | Must | `DEC-04`, `EV-04` | Spec gọi API thật; hoặc fixture đọc từ database; hoặc chặn ở một đường khác `/api/jobs` |
| `RQ-05` | Fixture có ít nhất HAI job với tiêu đề duy nhất, và spec khẳng định cả hai tiêu đề có mặt trong DOM sau hydrate, cộng chuỗi `Tìm thấy` với đúng tổng của fixture | Must | `DEC-06`, `EV-05` | Chỉ một job; hoặc tiêu đề trùng một chuỗi tĩnh của trang; hoặc chỉ khẳng định chuỗi `Tìm thấy` mà không khẳng định tiêu đề nào |
| `RQ-06` | Thêm đúng một script `test:browser` vào `package.json`. Mười một script đang có không đổi | Must | `DEC-09`, `EV-02` | Một script cũ bị đổi hay bị xoá; hoặc thêm nhiều hơn một script |
| `RQ-07` | Thêm `test-results/` và `playwright-report/` vào `.gitignore`. Bảy nhóm mục đang có không đổi | Must | `DEC-08`, `EV-08` | Một dòng cũ của `.gitignore` bị xoá hay bị sửa; hoặc hai thư mục kia không được bỏ qua nên xuất hiện trong danh sách thay đổi |
| `RQ-08` | Giới hạn của `DEC-05` — spec KHÔNG chứng minh gì về database, RLS hay tính đúng của dữ liệu, chỉ chứng minh hydrate và vẽ — ghi nguyên văn vào `HANDOFF.md` như một giới hạn CÓ TÊN | Must | `DEC-05` | `HANDOFF` không có dòng đó; hoặc `HANDOFF` khẳng định lane này chứng minh bề mặt công khai đầu-cuối |
| `RQ-09` | Spec chạy XANH ít nhất hai lần liên tiếp, và `HANDOFF` ghi cả hai lần cùng thời gian chạy của mỗi lần | Must | `DEC-07` | Chỉ một lần chạy được ghi; hoặc hai lần cho kết quả khác nhau mà không giải thích; hoặc spec có `test.skip` hay `test.fixme` |
| `RQ-10` | Không một tệp nào dưới `app/` hay `src/` được sửa. `vitest.unit.config.ts` không đổi. `npm run test:unit` và `npm run typecheck` vẫn exit `0` | Must | `EV-10` | Một tệp mã ứng dụng đổi; hoặc lane unit exit khác `0`; hoặc số test PASS của lane unit tụt so với mốc của `STEP-01` |

### 4.2 Scope boundaries

Được chạm, và chỉ bốn nhóm sau:

1. Bốn tệp liệt kê ở `Modules`: `playwright.config.ts` mới, `tests/browser/public-home.spec.ts` mới, `package.json`, `.gitignore`.
2. `package-lock.json`, vì bước cài gói bắt buộc đổi nó.
3. Artifact của chính task: `docs/tasks/hrp-v5-test-01-browser-lane/HANDOFF.md` cộng mọi tệp dưới `docs/tasks/hrp-v5-test-01-browser-lane/evidence/`.
4. Path đã khai ở `Modules` hoặc ở mục phạm vi của BA contract CÙNG LÔ: `hrp-v5-go-live-18-public-surface-hardening`, `hrp-v5-go-live-17-rls-required-relation-sweep` và `hrp-v5-rf-05-tsc-program-boundary`. Nhóm này vì vậy CHỨA `tsconfig.json` cùng `src/shared/toolchain/tsc-program-boundary.static.test.ts`, hai path thuộc bản giao của `rf-05`. Nhóm này CÓ MẶT trong cây làm việc vì Owner giao ba contract trong MỘT lượt theo quyết định `03/09`, nhưng nó KHÔNG thuộc bản giao của task này: Tier 2 không được sửa chúng khi đang làm task này, và `HANDOFF.md` của task này không được kể chúng là công của mình.

Cấm chạm: mọi tệp dưới `app/` và `src/`, `vitest.unit.config.ts`, `vitest.integration-files.ts`, `next.config.*`, `tsconfig.json`, `eslint.config.*`, `prisma/`, `middleware.ts`, mọi tệp `.env`. Task này KHÔNG sửa một dòng nào dưới `app/` và `src/`, kể cả khi các contract cùng lô đang có tệp dirty ở hai cây đó. `tsconfig.json` nằm ở cột cấm chạm ĐỐI VỚI task này, nhưng nó là bản giao của `hrp-v5-rf-05-tsc-program-boundary` nên sự có mặt của nó trong cây làm việc thuộc nhóm bốn, KHÔNG phải defect của task này; phép kiểm đúng là `git diff --cached -- tsconfig.json` không chứa một dòng nào do task này ghi. Xuất hiện một path ngoài bốn nhóm trên là FAIL.

### 4.3 Data, State, Permission và Interface Rules

- **Trình chạy test KHÔNG được tới database nào.** `RQ-03` ép `DATABASE_URL` về sentinel không tới được. Nếu một bước nào cần một database thật thì bước đó viết sai.
- **Không chạy spec trên production và không trỏ `baseURL` ra một domain thật.** `baseURL` phải là `localhost` do chính `webServer` khởi động.
- **Không dữ liệu thật trong fixture.** Tiêu đề việc, mã việc và mọi giá trị trong fixture là chuỗi bịa và phải mang tiền tố dễ nhận, không được trùng một slug thật đang chạy.
- **Không chạm biến môi trường của repo.** Không tạo, không sửa, không đọc `.env`. Cấu hình ép biến trong chính `playwright.config.ts`, không qua tệp env.
- **Bước cài gói là hành động mạng.** Nó tải cả nhị phân trình duyệt. Tier 2 ghi vào `HANDOFF` đúng lệnh đã chạy cộng phiên bản đã phân giải, và không cài thêm gói nào ngoài `@playwright/test`.
- **Bí mật:** không in connection string, token, password, PII thật vào log hay artifact. Báo cáo của trình chạy có thể chứa URL và header — nếu dán vào `evidence/` thì phải lọc.

## 5. Execution Plan

| ID | Việc | Ra cái gì |
|---|---|---|
| `STEP-01` | Chạy `pwsh -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-test-01-browser-lane/TASK.md`, rồi `npm run test:unit` và `npm run typecheck` trên cây CHƯA sửa | Ba output kèm mã thoát ở đầu `HANDOFF.md`. Mốc số tệp test và số test PASS của lane unit |
| `STEP-02` | Cài trình chạy: `npm install --save-dev --save-exact @playwright/test`, rồi `npx playwright install chromium` | Diff của `package.json` và `package-lock.json`, cộng output hai lệnh kèm mã thoát, cộng phiên bản đã phân giải ghi vào `HANDOFF.md` |
| `STEP-03` | Thêm `test-results/` và `playwright-report/` vào `.gitignore` theo `RQ-07` | Diff hai dòng thêm, không dòng nào bị xoá |
| `STEP-04` | Viết `playwright.config.ts` theo `RQ-02` và `RQ-03`: chỉ Chromium, `webServer` chạy bản build, `webServer.env` ép `DATABASE_URL` về sentinel của lane unit | Một tệp cấu hình mới. Chuỗi sentinel giống hệt chuỗi trong `vitest.unit.config.ts` |
| `STEP-05` | Viết `tests/browser/public-home.spec.ts` theo `RQ-04`, `RQ-05` và `DEC-06`: chặn `/api/jobs`, fixture hai job tiêu đề duy nhất, khẳng định hai tiêu đề cộng chuỗi `Tìm thấy` với đúng tổng của fixture | Một tệp spec mới, không `test.skip`, không `test.fixme` |
| `STEP-06` | Thêm script `test:browser` vào `package.json` theo `RQ-06` | Diff một dòng thêm trong khối `scripts` |
| `STEP-07` | Chạy spec lần một qua script mới, đo thời gian, ghi mã thoát | Output đầy đủ kèm mã thoát và thời gian chạy |
| `STEP-08` | Chạy spec lần hai qua script mới, đo thời gian, ghi mã thoát. Hai lần phải cùng kết quả | Output thứ hai kèm mã thoát và thời gian chạy. Đây là chân đo chống chập chờn |
| `STEP-09` | Chứng minh spec ĐỎ khi hydrate không xảy ra: đổi TẠM fixture thành một mảng rỗng, chạy lại, ghi lại lần đỏ, rồi HOÀN NGUYÊN fixture và chạy lại cho xanh | Ba output: lần đỏ, lệnh hoàn nguyên, lần xanh sau hoàn nguyên. Đây là fixture âm của cả task |
| `STEP-10` | Kiểm `RQ-10`: `git status --porcelain app/ src/ vitest.unit.config.ts`, rồi chạy lại `npm run test:unit` và `npm run typecheck` | Output RỖNG cho ba đường dẫn đầu. Hai lane exit `0`, số test PASS không nhỏ hơn mốc `STEP-01` |
| `STEP-11` | Kiểm phạm vi bằng `git status --porcelain` cộng `git diff --cached --numstat`. Ghi `HANDOFF.md` cộng `evidence/`, trong đó có dòng giới hạn CÓ TÊN của `RQ-08`, rồi `git add` NGAY. **KHÔNG commit, KHÔNG push, KHÔNG deploy** | Danh sách path đầy đủ phân đúng bốn nhóm của `4.2`, và `HANDOFF.md` với mọi lệnh, mã thoát, output thật |

## 6. Acceptance Criteria

| ID | Cách kiểm | Ngưỡng đạt |
|---|---|---|
| `AC-01` | `git diff --cached -- package.json` cộng đọc `HANDOFF.md` mục phiên bản | `@playwright/test` nằm trong `devDependencies` với một phiên bản ghim chính xác, không dấu ngã và không dấu mũ. `HANDOFF` ghi đúng phiên bản đó. Gói không nằm trong `dependencies` |
| `AC-02` | `ls playwright.config.ts` cộng đọc tệp | Tệp tồn tại. Chỉ MỘT project và nó là Chromium. Có khoá `webServer`, và lệnh của nó là bản build cộng khởi động, không phải chế độ dev |
| `AC-03` | `grep -c "127.0.0.1:1" playwright.config.ts` cộng so chuỗi đó với chuỗi trong `vitest.unit.config.ts` | Đếm ít nhất `1`, và chuỗi sentinel GIỐNG HỆT chuỗi của lane unit. `webServer.env` ép `DATABASE_URL`. Không ép về một địa chỉ tới được là FAIL |
| `AC-04` | `grep -n "page.route" tests/browser/public-home.spec.ts` cộng đọc spec | Có `page.route` bắt đường `/api/jobs`, và fixture là một literal dựng trong chính spec. Không lệnh gọi database nào, không đọc tệp env nào |
| `AC-05` | Đọc fixture và đọc các assertion của spec | Ít nhất HAI job, tiêu đề duy nhất và không trùng một chuỗi tĩnh của trang. Spec khẳng định cả hai tiêu đề có mặt trong DOM. Spec khẳng định chuỗi `Tìm thấy` với con số bằng đúng tổng của fixture |
| `AC-06` | `git diff --cached -- package.json` đọc khối `scripts` | Đúng một script mới tên `test:browser`. Mười một script cũ còn nguyên tên và nguyên nội dung |
| `AC-07` | `git diff --cached -- .gitignore` cộng `git status --porcelain test-results playwright-report` | Diff chỉ THÊM dòng, không xoá dòng nào, và có cả `test-results/` cùng `playwright-report/`. Hai thư mục đó không xuất hiện trong danh sách thay đổi |
| `AC-08` | Đọc output của `STEP-07` và `STEP-08` | Hai lần chạy, cả hai exit `0`, cùng số test pass. `HANDOFF` ghi thời gian chạy của từng lần. Spec không chứa `test.skip` và không chứa `test.fixme` |
| `AC-09` | Đọc ba output của `STEP-09` | Lần chạy với fixture rỗng exit KHÁC `0`, tức spec thật sự đo DOM chứ không luôn xanh. Lần chạy sau hoàn nguyên exit `0`. Có lệnh hoàn nguyên trong bằng chứng, và `git status --porcelain tests/browser/public-home.spec.ts` sau đó cho thấy fixture đã về đúng bản giao |
| `AC-10` | Đọc `HANDOFF.md` mục giới hạn | Có dòng ghi rõ spec KHÔNG chứng minh gì về database, RLS hay tính đúng của dữ liệu, và điều nó chứng minh là trang chủ hydrate cùng vẽ dữ liệu API ra DOM. Không có dòng nào khẳng định lane này chứng minh bề mặt công khai đầu-cuối |
| `AC-11` | `git status --porcelain vitest.unit.config.ts vitest.integration-files.ts prisma/ middleware.ts` cộng `git status --porcelain app/ src/` cộng `npm run test:unit` rồi `npm run typecheck`, lấy mã thoát bằng redirect chứ không sau ống | Output `git` RỖNG cho cả bốn đường dẫn đầu. Output `git` của `app/` cộng `src/` chỉ chứa path đã khai của hai contract cùng lô và không một path nào khác. Hai lane exit `0`. Số test PASS của lane unit không nhỏ hơn mốc `STEP-01`. Nếu một dòng đỏ nằm ở path đã khai của một contract cùng lô thì đó là defect của contract ấy, không phải của task này, và `HANDOFF.md` phải nói rõ contract nào |
| `AC-12` | `git status --porcelain` cộng `git diff --cached --name-only`, hợp hai danh sách rồi phân nhóm theo `4.2`. Cộng `git status --porcelain` chạy riêng trên từng đường dẫn ở cột cấm chạm. Cộng `git log --oneline -1` | Mọi path thuộc đúng một trong bốn nhóm của `4.2`, và nhóm bốn KHÔNG chứa tệp nào của nhóm một hay nhóm hai. Mọi đường dẫn cấm chạm cho output RỖNG. `git log --oneline -1` ở cuối task bằng ĐÚNG giá trị mà `STEP-01` đã ghi trên cây chưa sửa, tức task này không tạo thêm một commit nào. Phép so với field `Baseline` KHÔNG dùng ở đây, vì `Baseline` là ảnh của cây TRƯỚC khi contract này tồn tại nên `HEAD` đã hợp lệ khi lệch nó |

### 6.1 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` |
| `RQ-02` | `STEP-04` | `AC-02` |
| `RQ-03` | `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-05` | `AC-04` |
| `RQ-05` | `STEP-05`, `STEP-09` | `AC-05`, `AC-09` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-03` | `AC-07` |
| `RQ-08` | `STEP-11` | `AC-10` |
| `RQ-09` | `STEP-07`, `STEP-08` | `AC-08` |
| `RQ-10` | `STEP-01`, `STEP-10`, `STEP-11` | `AC-11`, `AC-12` |

## 7. Risk và Rollback

| ID | Rủi ro | Xác suất | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | **Trình chạy test trỏ vào production.** `.env` là production (`EV-07`), và cách viết `webServer` tự nhiên nhất là để nó thừa hưởng môi trường của shell. Khi đó một lane test tự động sẽ đọc database thật, và mỗi lần chạy là một vòng truy vấn production | Cao | `RQ-03` ép `DATABASE_URL` về sentinel không tới được, và `AC-03` so chuỗi đó với chuỗi của lane unit. `DEC-04` bỏ hẳn nhu cầu có database bằng cách chặn API ở tầng mạng |
| `RISK-02` | **Spec luôn xanh.** Một assertion chỉ tìm chuỗi tĩnh của trang sẽ xanh cả khi hydrate thất bại hoàn toàn, vì phần vỏ vẫn được vẽ. Đó đúng lớp lỗi của một hàng rào liệt kê cái tác giả vừa thêm | Cao | `DEC-06` buộc tiêu đề fixture không trùng chuỗi tĩnh nào. `STEP-09` và `AC-09` buộc chứng minh spec ĐỎ khi fixture rỗng — một spec luôn xanh không vượt được bước này |
| `RISK-03` | **Chập chờn.** Test trình duyệt hay xanh lần này đỏ lần sau vì thời gian biên dịch, vì animation, hoặc vì chờ mạng | Trung bình | `DEC-07` chạy bản build chứ không chế độ dev. `RQ-09` và `AC-08` đòi hai lần chạy liên tiếp cùng kết quả, kèm thời gian từng lần |
| `RISK-04` | **Cây bị làm bẩn bởi chính công cụ.** Trình chạy sinh `test-results/` và `playwright-report/` mỗi lần chạy, và `.gitignore` chưa có hai mục đó | Cao | `STEP-03` làm việc này TRƯỚC khi chạy lần đầu. `AC-07` đo cả hai chiều: diff chỉ thêm dòng, và hai thư mục không xuất hiện trong danh sách thay đổi |
| `RISK-05` | **Phạm vi phình.** Đã có trình duyệt thì rất dễ viết thêm spec cho luồng nộp hồ sơ, cho tra cứu, cho đăng nhập, hoặc bật thêm Firefox và WebKit | Cao | `1. Non-goals` và `4.2` cấm tường minh. `AC-02` đòi ĐÚNG một project. `AC-12` FAIL nếu có nhóm path thứ tư |
| `RISK-06` | **Nhị phân trình duyệt không tải được.** Bước `npx playwright install` là hành động mạng và có thể bị chặn ở máy hoặc ở proxy | Trung bình | Đây là kết cục `ENV_BLOCKED` hợp lệ CHỈ cho `RQ-09` và `AC-08`. Chín yêu cầu còn lại vẫn phải giao đủ, vì chúng không cần một trình duyệt để đo. `HANDOFF` phải ghi rõ lệnh, mã thoát và thông báo lỗi thật |
| `RISK-07` | **Lane này bị viện dẫn làm bằng chứng cho contract 07.** Một round sau thấy "lane trình duyệt đã có" rồi coi `RQ-04` của 07 đã được chứng minh bằng DOM | Trung bình | `1. Non-goals` và `DEC-10` cấm. `DEC-05` cùng `AC-10` buộc ghi giới hạn thành một dòng có tên, và `DEC-20` của contract 07 đã cho phép nhánh API nên 07 không cần lane này |
| `RISK-08` | **Task bị xếp trước ra mắt.** Nó không chặn go-live nhưng chiếm slot Tier 2 duy nhất, và slot đó đang có ba contract cần hơn | Trung bình | `Next gate` ghi rõ đây là món SAU RA MẮT. Thứ tự là quyết định của Owner, và Tier 1 đề xuất xếp nó cuối |

Rollback: bản giao gồm hai tệp mới cộng ba tệp bị thêm dòng. Hoàn tác bằng `git restore` trên `package.json`, `package-lock.json`, `.gitignore`, rồi `git rm` hai tệp mới, rồi `npm ci` để dựng lại `node_modules` đúng bản khoá. Nhị phân trình duyệt nằm ngoài repo và không cần hoàn; nếu muốn dọn thì xoá thư mục cache của Playwright. Không có trạng thái database nào bị chạm, vì `RQ-03` bảo đảm không kết nối nào mở được.

## 8. Open Questions

| ID | Câu hỏi | Ảnh hưởng | Ai trả lời |
|---|---|---|---|
| `Q-01` | Xếp task này trước hay sau ra mắt? Nó không chặn go-live, nhưng nó chiếm slot Tier 2 duy nhất | Không đổi nội dung contract, chỉ đổi thứ tự. Tier 1 đề xuất xếp SAU contract 07 và sau ba contract hardening | Owner |
| `Q-02` | Sau khi lane chạy được, có nối vào CI không? `DEC-10` cố ý để ngoài task này | Không chặn. Nối CI cần quyết định về thời gian chạy, về nơi tải nhị phân trình duyệt và về ngân sách runner. Đó là một contract riêng | Tier 1 cùng Owner, sau khi có số thời gian chạy thật từ `RQ-09` |
| `Q-03` | Có mở rộng lane sang trang chi tiết việc và trang tra cứu không? Trang chi tiết là Server Component nên `curl` đã thấy dữ liệu, tức nó KHÔNG cần trình duyệt; trang tra cứu là Client Component nên nó CÓ cùng lớp lỗi hydrate với trang chủ | Không chặn. Trang tra cứu là ứng viên hợp lý cho spec thứ hai, nhưng nó cần một mã tra cứu và lệnh cấm dùng mã thật của task 13 buộc phải chặn API bằng fixture y như ở đây | Tier 1, ở một contract sau |

## 9. Planner Resolution

**Round `1` — báo cáo `BLOCKED` của Tier 2: NHẬN. Nguyên nhân chặn nằm ngoài task này và ĐÃ được một contract khác đóng, nên tôi mở execution round `2` MỎNG đúng HAI bước. KHÔNG audit round nào cho round `1`.**

`Current execution round` nâng từ `0` lên `2`, đóng một field trễ hai bậc. Nó trễ vì Tier 2 không có quyền sửa nó, đúng luật, và vì round `1` dừng ở `BLOCKED` nên chưa từng có lệnh nâng.

| Mục round `1` | Trạng thái CUỐI | Căn cứ Tier 1 tự đo |
|---|---|---|
| `BLK-01` | Nguyên nhân ĐÓNG, nhưng bằng chứng cuối chỉ có khi lane chạy | `next build` chết ở pha kiểm kiểu vì cấu hình biên dịch hút cây `new-ui` vào chương trình. `hrp-v5-rf-05-tsc-program-boundary` đã đóng biên ấy bằng một allow-list ở khoá `include`, và tôi đo lại `npm run typecheck` nhận exit `0` với `0` dòng `error TS`. Hai lane đọc CÙNG một tệp cấu hình, nên nguyên nhân đã mất. Tôi KHÔNG khẳng định `next build` sẽ xanh: pha kiểm kiểu là pha ĐẦU, và `LIM-05` bên dưới còn nguyên |
| `LIM-04` | ĐÓNG | Cùng phép đo trên: exit `0`, `0` dòng `error TS`. Giới hạn này sinh ra từ đúng một dòng đỏ ở `new-ui/`, và dòng ấy không còn trong chương trình |
| `LIM-05` | CÒN MỞ, chưa ai đo | Không ai biết `next build` có sống qua pha sinh trang tĩnh hay không, vì round `1` chết TRƯỚC pha ấy. Round `2` là lần đầu câu hỏi này đo được. Nếu nó chết ở pha sinh trang thì đó là một BLOCKER MỚI, không phải `BLK-01` tái phát, và phải khai tên khác |
| `DEV-01` | PHẢI LÀM LẠI ở round `2` | Round `1` chạy vòng đỏ-rồi-xanh của fixture âm qua một cấu hình CHẨN ĐOÁN vì lane bàn giao không khởi động được. `AC-09` đòi lane BÀN GIAO. Round `2` chạy lại `STEP-09` qua lane bàn giao, không qua cấu hình chẩn đoán |

**Phạm vi round `2`: đúng hai bước.** `STEP-08` và `STEP-09`, cả hai qua lane BÀN GIAO. Không chạy lại `STEP-01` tới `STEP-07`. `STEP-10` và `STEP-11` chạy lại vì chúng là bước đo phạm vi và bước ghi bàn giao, và một round không có hai bước ấy thì không kiểm được. Ba AC được đo lại: `AC-08`, `AC-09`, cộng `AC-11` vì mốc test đã dịch.

**`DEC-20` — cho phép `next build`, ĐÚNG một lối, kèm bốn điều kiện.** Đây là quyết định liên contract, không phải việc Tier 2 tự chọn. Mục `4.3` của `hrp-v5-rf-05-tsc-program-boundary` CẤM `npm run build`, vì `.env` của repo trỏ vào database PRODUCTION và vì `next build` có thể GHI LẠI tệp cấu hình biên dịch — mà tệp ấy chính là bản giao của `rf-05`, đang nằm trong index và CHƯA được audit. Lệnh cấm ấy giữ nguyên cho mọi luồng khác. Task này là ngoại lệ DUY NHẤT, dưới bốn điều kiện, thiếu một điều kiện nào thì lượt chạy ấy KHÔNG dùng làm bằng chứng:

1. `next build` chỉ được gọi qua khoá `webServer` của `playwright.config.ts` đã bàn giao, tức qua `npm run test:browser`. Khoá ấy ÉP biến DB về sentinel không tới được và làm rỗng bốn biến DB thật, nên tiến trình build không có đường tới production. CẤM chạy `npm run build` trần trong một shell, và CẤM `next dev`.
2. `git hash-object tsconfig.json` phải được ghi TRƯỚC lượt chạy đầu và SAU lượt chạy cuối. Cả hai giá trị vào `HANDOFF.md` thành một dòng giới hạn CÓ TÊN.
3. Hai giá trị ấy LỆCH nhau thì Tier 2 DỪNG ngay và khai một blocker mới. KHÔNG hoàn nguyên, KHÔNG stage, KHÔNG xoá tệp ấy: nó là bản giao chưa audit của luồng khác, và hoàn nguyên tài sản của luồng khác là việc của Tier 1.
4. Ở cuối round, `git diff --cached --numstat -- tsconfig.json` phải vẫn cho `12 2`, đúng con số bản giao của `rf-05`, và không một path nào dưới `.next/` được stage.

**Một vết đỏ CƠ HỌC đã biết trước.** `HANDOFF.md` của round `1` khai `Spec version` bằng `v1.1` còn contract sau bản này ở `v1.4`, nên `H-03` của cổng bàn giao sẽ đỏ khi ai đó chạy nó trên tài liệu round `1`. Vết ấy ĐÚNG sổ sách: round `1` thật sự thi hành bản `v1.1`. Bàn giao của round `2` phải khai `v1.4`, và không ai được sửa tài liệu round `1` để dập vết đỏ ấy. Cùng lớp với `H-03` bên `hrp-v5-go-live-18-public-surface-hardening`.

### Audit round `1` — execution round `2`

| Item | Planner decision |
|---|---|
| Audit gate | `verify-audit.ps1`: `PASS WITH WARNINGS`; verdict `BLOCKED` |
| `AUD-001` | `ACCEPT_FIX`, hạ severity từ `P0` xuống `P2`. Đây là defect test-toolchain, không phải mất dữ liệu, vượt quyền hay production outage. Owner là task `hrp-v5-rf-06-vitest-default-lane-safety` |
| `BLK-02` observed state | `ACCEPT`: staged delivery `tsconfig.json` của RF-05 thực sự biến mất giữa round; TEST-01 phải dừng vì AC-09 không còn đo đúng nguyên nhân |
| `BLK-02` causal claim | `REJECT`: Next không thể tự sửa Git index. Việc worktree và index cùng trở về đúng blob HEAD chứng minh có thao tác Git/agent đồng thời; chưa đủ evidence quy trách cho `next build` |
| `C-02` audit classification | Auditor ghi `SKIP` theo lệnh cấm cũ, nhưng v1.4 `DEC-20` đã cho phép build qua `npm run test:browser`, và hai lượt đầu đã build thành công. Tier 1 ghi nhận evidence build gián tiếp này; không coi SKIP là bằng chứng Next gây mất index |
| Resolution | Không rollback TEST-01 và không sửa bốn deliverable của nó. Đóng execution round 2 ở `REVISION_REQUIRED`; chờ RF-06, rồi khôi phục/audit/commit RF-05, sau đó mới mở TEST-01 round 3 |
| Closure | Round 3 phải có hai lượt browser GREEN, fixture-empty RED vì assertion DOM, restore GREEN, hash `tsconfig.json` trước/sau ổn định và không có staged `.next/` |

### Planner Resolution — execution round `3` bị chặn ở preflight

Tier 1 **NHẬN** `BLK-03` trong `HANDOFF.md`: tại thời điểm Tier 2 kiểm tra, hai dependency RF-06/RF-05 chưa có commit ổn định trên `main`, field control chưa được nâng round và worktree được nêu trong lệnh giao việc không tồn tại. Tier 2 dừng trước khi sửa code là đúng phạm vi. Round này không có audit độc lập và không được đổi tên thành một round thành công.

Các điều kiện chặn nay đã được đóng bằng bằng chứng mới:

| Điều kiện | Trạng thái | Bằng chứng khóa |
|---|---|---|
| RF-06 trở thành baseline | ĐÓNG | Commit `8f3839d` — default Vitest lane dùng JSX automatic và có guard tĩnh |
| RF-05 trở thành baseline | ĐÓNG | Commit `bb223dd` — `tsconfig.json` và guard TypeScript program boundary đã commit scoped |
| Nested worktree làm RF-05 guard thấy root `.claude` ngoài chương trình | ĐÓNG | Worktree `gl20` đã tích hợp và được remove; `npx vitest run` sau đó đạt `110 files`, `1683/1683` tests |
| Go-live-20 còn ở worktree tách biệt | ĐÓNG | Commit tích hợp trên `main`: `f9c7bca` |
| TypeScript baseline | ĐÓNG | `npm run typecheck` exit `0` trên `f9c7bca` |

**Mở execution round `4` MỎNG.** Tier 2 làm việc ngay trên shared `main` worktree hiện tại; không tạo thêm nested worktree dưới `.claude/`. Bốn deliverable của TEST-01 đang nằm trong index và tiếp tục thuộc task này. Round 4 chỉ được:

1. chạy `STEP-08` hai lần qua đúng `npm run test:browser`;
2. chạy vòng fixture-empty RED → hoàn nguyên → GREEN của `STEP-09` qua đúng lane bàn giao;
3. chạy lại `STEP-10` và `STEP-11` để đo regression, attribution và ghi bàn giao;
4. ghi cả hash blob HEAD, index và worktree của `tsconfig.json` trước/sau; ba lớp không được bị diễn giải lẫn nhau;
5. giữ lịch sử round 3 trong `HANDOFF.md`; không xóa evidence cũ, không dùng config chẩn đoán, không commit/push/deploy.

Nếu `npm run test:browser` vẫn đỏ, Tier 2 phải ghi defect mới với pha lỗi và path cụ thể. Không được quy nguyên nhân cho `next build` nếu chỉ quan sát thấy index thay đổi mà chưa có bằng chứng tác nhân Git.

### Audit round `2` — execution round `4`

`verify-audit.ps1 -TaskPath TASK.md -HandoffPath HANDOFF.md`: `RESULT: PASS WITH WARNINGS`, `EXIT=0`. Verdict §6 = **PASS**. §1 = "Không có finding. Các findings cũ (AUD-001, BLK-02) được Resolve toàn bộ." C-01/07/08/09/10 = DONE; C-02..06 = SKIP có lý do (TASK §4.3 cấm `npm run build` và `rf-05` 4.3 cũng cấm; task không sửa route handler / Prisma / POST-PATCH / migration).

Ba WARN cổng xét riêng, không đổi verdict:

- **S-06** (verdict PASS kèm SKIP): đúng quy tắc chung của Tier 3. `DEC-20` của `v1.5` cho phép `next build` ĐÚNG một lối qua `npm run test:browser`; hai lượt build đã chạy gián tiếp khi Tier 2 round `4` đo `AC-08`/`AC-09`. C-03..06 SKIP vì task này KHÔNG chạm `app/` và `src/` (`AC-11` đo `git status --porcelain app/ src/` chỉ có path của `go-live-19`, không phải của TEST-01).
- **S-10** (chỉ 1 số không trùng TASK/HANDOFF = `15.8`): số mới đo độc lập là chuyện đúng đắn của audit. `AUD-001` đã ACCEPT_FIX ở round `1`, hạ severity P0→P2 và đã đóng bằng `8f3839d` (`rf-06`).
- **S-16** (5 staged path ngoài `docs/tasks/.../`): WARN đúng nguyên tắc "Tier 3 không bao giờ stage source". `package.json`, `package-lock.json`, `playwright.config.ts`, `tests/browser/public-home.spec.ts`, `.gitignore` vẫn ở index từ round `1`; round `4` đo `git diff HEAD -- <4 deliverables>` cho `0` dòng mỗi tệp và Tier 2 không tạo commit nào. WARN mang tính lịch sử, không phải defect của round `4`.

Spot-check rủi ro cao (theo §6): `AUD-001`/`BLK-02`/`BLK-03` đã đóng với closure evidence cụ thể (`npx vitest run` exit 0 với `1683/1683` ở audit round 2 — số khác `1735/1735` của HANDOFF round 4 là do giữa round 2 và round 4 repo đã thêm test; cả hai PASS, không mâu thuẫn). Hai commit mới `772aa68` và `f31d203` đều của Tier 1 vào `docs/PLANNER_HANDOVER.md`, không chạm TEST-01 — HANDOFF đã ghi rõ. `tsconfig.json` ổn định ba tầng `53cc4848…`, điều kiện `2`/`3`/`4` của `DEC-20` thoả.

| Finding ID | Nguồn | Planner decision | Lý do & điều kiện |
|---|---|---|---|
| `AUD-001` (P0→P2, đã hạ ở round `1`) | Cổng S-10 | `ACCEPT_FIX` | Hạ severity xong từ round `1`; đóng bằng `8f3839d` (`rf-06`). Không mở execution round mới cho việc này |
| `BLK-02` | HANDOFF §5 + AUDIT §7 | `ACCEPT` | Đóng bằng commit `bb223dd` (rf-05) đưa `tsconfig.json` lên `HEAD`. Round `4` đo ba tầng WORKTREE/INDEX/HEAD cùng `53cc484886ddf4164f0741739af42e75ad913528` cả trước lẫn sau lượt chạy, điều kiện `2`/`3` `DEC-20` thoả |
| `BLK-03` | HANDOFF §1.1 + AUDIT §7 | `ACCEPT` | Đóng bằng `v1.5`: worktree policy "làm trên main, không nested worktree"; commit `bb223dd` + `8f3839d` trên `main`; TASK bump round `4` ở `0cd84ae` |
| `DEV-04` (Hai lượt `AC-08` chạy liền nhau) | HANDOFF §5 | `ACCEPT` | Không hạ giá trị `AC-08`; hai lượt cách ~80 giây, cùng blob `eb9576be…`, cùng `1 passed`, `0` retry. Ngược lại thứ tự này cứu bằng chứng — kẹp `STEP-09` vào giữa thì `BLK-02` rơi đúng lúc có thể ăn mất lượt XANH thứ hai |
| `DEV-05` (spec bị xoá khỏi worktree giữa RED và REVERT của `STEP-09`) | HANDOFF §5 | `ACCEPT` với điều kiện theo dõi | Blob khôi phục về đúng `eb9576be…`, GREEN exit `0` `1 passed (31.4s)`. Không mở execution round; nếu sự cố tái xuất ở lane khác thì khai blocker mới |
| S-06 / S-10 / S-16 | Cổng `verify-audit.ps1` | `ACCEPT` với điều kiện | Ba WARN đã xét riêng ở trên. Không mở execution round, không tăng spec version |

**Quyết định:** `READY_FOR_EXECUTION` → `ACCEPTED`. Spec version giữ `v1.5` — không có thay đổi contract nào trong execution/audit round `4`. Trạng thái task đã đóng về `ACCEPTED` theo Iron Rule `3`: chỉ Tier 3 PASS + Planner Resolution ACCEPTED mới đạt ACCEPTED.

**Closure evidence cho round `4`:** `npx vitest run` exit 0; `npm run test:browser` XANH hai lượt; `STEP-09` RED → REVERT (`git checkout-index` blob `eb9576be…`) → GREEN; `npm run test:unit` exit 0 với `112/1735`; `npm run typecheck` exit 0 với `0` dòng `error TS`; `tsconfig.json` ba tầng cùng `53cc4848…` cả trước lẫn sau; `git diff HEAD -- <4 deliverables>` cho `0` dòng mỗi tệp; Tier 2 round `4` không tạo commit nào.

**Bước tiếp theo (gate kế):** `PHASE_REVIEW` — task cuối phase browser lane đã ACCEPTED. Tier 1 cập nhật `ROADMAP_CURSOR` của `docs/PLANNER_HANDOVER.md` §0 và chọn candidate kế tiếp theo hàng đợi sau TEST-01: GO-LIVE-21 Credential Hygiene → GO-LIVE-07 Launch Proof → GO-LIVE-19 PII mask → V6-ADMIN-00 → V6 Phase 1A/1B/1C → Phase 2/3/4/5 → AFF-00..04 + AFF-05A → M7 → M8 → M6-01..03 policy → AFF-05B..07 → M6-04..07 → PAY. Hai commit Planner ghi vào `main` đồng thời round `4` chạy (`772aa68`, `f31d203`) cần được kiểm tra trong cursor update để phản ánh đúng trạng thái cây lúc chuyển gate.

## 10. Revision Log

| Version | Ngày | Đổi gì |
|---|---|---|
| `v1.0` | 2026-09-03 | Bản đầu. Dựng lane trình duyệt với phạm vi hẹp nhất còn có ích: một trình chạy, một cấu hình, một spec khói, một script. Hai quyết định giữ nó an toàn và chạy được ở mọi máy: `DEC-03` ép `DATABASE_URL` về sentinel không tới được vì `.env` là production (`EV-07`), và `DEC-04` chặn `/api/jobs` bằng fixture nên không cần database nào. Phạm vi khẳng định được ghi tên ở `DEC-05` để lane này không bị đọc rộng hơn thật, và `STEP-09` là fixture âm chứng minh spec không phải một test luôn xanh |
| `v1.1` | 2026-09-03 | **Mở đường cho lô gộp ba contract theo quyết định `03/09` của Owner.** Hai tiêu chí cũ BẤT KHẢ THOẢ khi 18 và 17 cùng dirty trong một index dùng chung — lỗi ở văn của Tier 1, không ở bản giao: `AC-11` đòi `git status` RỖNG trên `app/` cùng `src/` mà hai contract kia đều ghi vào đó, và `AC-12` đòi mọi path trong index thuộc ba nhóm của riêng task này. Bản này thêm nhóm bốn vào `4.2` cho path đã khai của hai contract cùng lô, tách phép kiểm của `AC-11` thành bốn đường dẫn phải RỖNG cộng `app/` với `src/` chỉ được chứa path đã khai của hai contract kia, đổi `AC-12` sang phép đếm ATTRIBUTION, và ghi luật quy trách một dòng test đỏ cho đúng contract. `AC-01`, `AC-06`, `AC-07` KHÔNG đổi vì `package.json`, `package-lock.json` và `.gitignore` là đất của chính task này. KHÔNG thêm hay bớt một yêu cầu, một bước hay một tiêu chí nào. Cửa sổ bump còn mở vì cả hai round vẫn đếm bằng `0` |
| `v1.2` | 2026-09-04 | **Sửa cùng một AC BẤT KHẢ THOẢ, và nhận `tsconfig.json` của `rf-05` vào nhóm bốn.** Nửa thứ nhất giống `v1.4` của 18: `AC-12` cũ đòi `HEAD` bằng field `Baseline`, mà `80f6933` có TRƯỚC cả commit sinh ra contract này nên AC ấy bất khả thoả từ lúc viết; bản này đổi sang phép so `git log --oneline -1` với giá trị `STEP-01` đã ghi. Nửa thứ hai: `hrp-v5-rf-05-tsc-program-boundary` chạy TRƯỚC task này và nó sửa `tsconfig.json`, một path đang ở cột cấm chạm của task này, nên nếu không nới thì `AC-12` FAIL oan vì việc của contract khác. Bản này đưa `rf-05` vào nhóm bốn và ghi rõ phép kiểm đúng là diff staged của task này không chứa dòng nào của `tsconfig.json`. KHÔNG đổi phạm vi mã, KHÔNG thêm hay bớt một yêu cầu, một bước hay một tiêu chí nào. Cửa sổ bump còn mở vì cả hai round vẫn đếm bằng `0` |
| `v1.3` | 2026-09-04 | **Sửa một path CHẾT mà chính bản `v1.2` vừa đưa vào.** Nhóm bốn ở `v1.2` khai `src/shared/build/tsc-program-boundary.static.test.ts`, nhưng sau đó `rf-05` bump lên `v1.2` của nó và CHUYỂN tệp ấy sang `src/shared/toolchain/` vì `.gitignore` có mẫu `build/` ở dòng `10` nên path cũ bị git BỎ QUA và `git add` không bao giờ nhận. Hệ quả nếu để nguyên: nhóm bốn của task này khai một path KHÔNG tồn tại trong cây, còn tệp thật thì rơi ra ngoài mọi nhóm và `AC-12` FAIL oan. Bản này đổi đúng một chuỗi path, `1` chỗ trong văn. KHÔNG đổi phạm vi, KHÔNG thêm hay bớt một yêu cầu, một bước hay một tiêu chí nào. Cửa sổ bump còn mở vì cả hai round vẫn đếm bằng `0` |
| `v1.4` | 2026-09-04 | **Mở execution round `2` MỎNG và cấp phép `next build` đúng một lối, kèm bốn điều kiện.** Round `1` dừng ở `BLOCKED` vì `next build` chết ở pha kiểm kiểu, và `hrp-v5-rf-05-tsc-program-boundary` đã đóng nguyên nhân ấy: `npm run typecheck` giờ exit `0` với `0` dòng `error TS`. Bản này KHÔNG thêm, KHÔNG bớt một `RQ`, một `STEP` hay một `AC` nào; nó giữa nguyên mặt chữ của mười một bước và ghi phạm vi round `2` cùng `DEC-20` vào mục `9`, vì mục `4.3` của `rf-05` CẤM `npm run build` và muốn chạy lane bàn giao thì phải gỡ lệnh cấm ấy đúng một lối có điều kiện đo được. Cửa sổ bump còn MỞ vì task này chưa có `AUDIT.md` và `Current audit round` đếm bằng `0` |
| `v1.5` | 2026-09-07 | **Nhận execution round `3` bị chặn đúng ở preflight và mở round `4` MỎNG trên baseline thật.** RF-06 (`8f3839d`), RF-05 (`bb223dd`) và go-live-20 (`f9c7bca`) đã nằm trên `main`; nested worktree `gl20` đã được remove; default Vitest đạt `1683/1683` và typecheck exit `0`. Không đổi RQ/STEP/AC hay deliverable; chỉ cập nhật control fields, khóa cách đo ba lớp HEAD/index/worktree và cấm lặp lại causal claim thiếu bằng chứng về `next build` |
| `v1.5+` (resolution append-only, không bump version) | 2026-09-07 | **Đóng execution/audit round `4` ở `ACCEPTED`.** Audit round `2`: `verify-audit.ps1` PASS WITH WARNINGS, verdict §6 PASS, §1 không có finding. `BLK-02`/`BLK-03`/`AUD-001` đóng bằng commit `bb223dd` + `8f3839d` + worktree policy `v1.5`. S-06/S-10/S-16 ACCEPT với điều kiện (xem §9). `DEV-04`/`DEV-05` ACCEPT — không hạ giá trị AC. Closure: `npm run test:browser` XANH hai lượt; `STEP-09` RED → REVERT → GREEN; hai lane unit/typecheck exit `0`; ba tầng `tsconfig.json` cùng `53cc4848…`; `git diff HEAD -- <4 deliverables>` = `0` cho cả bốn. Gate kế: `PHASE_REVIEW` |
