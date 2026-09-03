# TASK: hrp-v5-test-01-browser-lane

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-test-01-browser-lane` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `80f6933` |
| Modules | `playwright.config.ts`, `tests/browser/public-home.spec.ts`, `package.json`, `.gitignore` |
| ADR references | `hrp-v5-go-live-07-marketplace-launch-proof` `DEC-20` — nơi ghi rằng URL gốc đo được bằng DOM sau hydrate HOẶC bằng response của API, tức lane trình duyệt là TUỲ CHỌN cho ra mắt; `hrp-v5-go-live-08-public-ui-premium` — round mà mười hai AC đòi giá trị tính bởi trình duyệt trong một repo không có trình chạy nào |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/code` giao được ngay về mặt kỹ thuật. Nhưng đây là món SAU RA MẮT: nó không chặn go-live và nên xếp sau contract 07. Thứ tự là quyết định của Owner |
| Updated | `2026-09-03 16:00 Asia/Bangkok` |

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

Được chạm, và chỉ ba nhóm sau:

1. Bốn tệp liệt kê ở `Modules`: `playwright.config.ts` mới, `tests/browser/public-home.spec.ts` mới, `package.json`, `.gitignore`.
2. `package-lock.json`, vì bước cài gói bắt buộc đổi nó.
3. Artifact của chính task: `docs/tasks/hrp-v5-test-01-browser-lane/HANDOFF.md` cộng mọi tệp dưới `docs/tasks/hrp-v5-test-01-browser-lane/evidence/`.

Cấm chạm: mọi tệp dưới `app/` và `src/`, `vitest.unit.config.ts`, `vitest.integration-files.ts`, `next.config.*`, `tsconfig.json`, `eslint.config.*`, `prisma/`, `middleware.ts`, mọi tệp `.env`. Xuất hiện một nhóm thứ tư là FAIL.

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
| `STEP-11` | Kiểm phạm vi bằng `git status --porcelain` cộng `git diff --cached --numstat`. Ghi `HANDOFF.md` cộng `evidence/`, trong đó có dòng giới hạn CÓ TÊN của `RQ-08`, rồi `git add` NGAY. **KHÔNG commit, KHÔNG push, KHÔNG deploy** | Danh sách path đầy đủ phân đúng ba nhóm của `4.2`, và `HANDOFF.md` với mọi lệnh, mã thoát, output thật |

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
| `AC-11` | `git status --porcelain app/ src/ vitest.unit.config.ts vitest.integration-files.ts prisma/ middleware.ts` cộng `npm run test:unit` rồi `npm run typecheck`, lấy mã thoát bằng redirect chứ không sau ống | Output `git` RỖNG cho cả sáu đường dẫn. Hai lane exit `0`. Số test PASS của lane unit không nhỏ hơn mốc `STEP-01` |
| `AC-12` | `git status --porcelain` cộng `git diff --cached --name-only`, hợp hai danh sách rồi phân nhóm. Cộng `git log --oneline -1` | Mọi path thuộc đúng một trong ba nhóm của `4.2`: bốn tệp ở `Modules`, `package-lock.json`, và `docs/tasks/hrp-v5-test-01-browser-lane/**`. Xuất hiện nhóm thứ tư là FAIL. `HEAD` bằng baseline |

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

Chưa có. Task chưa được thi hành.

## 10. Revision Log

| Version | Ngày | Đổi gì |
|---|---|---|
| `v1.0` | 2026-09-03 | Bản đầu. Dựng lane trình duyệt với phạm vi hẹp nhất còn có ích: một trình chạy, một cấu hình, một spec khói, một script. Hai quyết định giữ nó an toàn và chạy được ở mọi máy: `DEC-03` ép `DATABASE_URL` về sentinel không tới được vì `.env` là production (`EV-07`), và `DEC-04` chặn `/api/jobs` bằng fixture nên không cần database nào. Phạm vi khẳng định được ghi tên ở `DEC-05` để lane này không bị đọc rộng hơn thật, và `STEP-09` là fixture âm chứng minh spec không phải một test luôn xanh |
