# TASK: hrp-v5-rf-05-tsc-program-boundary

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-rf-05-tsc-program-boundary` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `e58a6c0` — hoặc commit mới nhất của `main` lúc Tier 2 bắt đầu, ghi lại ở `STEP-01` |
| Modules | `tsconfig.json`, `src/shared/toolchain/tsc-program-boundary.static.test.ts` |
| ADR references | `hrp-v5-test-01-browser-lane` `BLK-01` — lane trình duyệt bị chặn vì `npm run typecheck` exit `1`; tiêu chí số 14 của `hrp-v5-go-live-18-public-surface-hardening` cùng `AC-11` của `hrp-v5-go-live-17-rls-required-relation-sweep` — hai ô đòi typecheck exit `0` và chỉ tha dòng đỏ nằm ở path của contract CÙNG LÔ, nên một dòng đỏ ngoài mọi contract không có chỗ trong từ vựng của chúng |
| Current execution round | `2` |
| Current audit round | `2` |
| Next gate | Task này ĐÓNG. Cổng kế tiếp là `hrp-v5-test-01-browser-lane` round `3`: `BLK-01` của nó đòi `npm run typecheck` exit `0`, điều kiện chỉ đóng được sau khi task này đóng biên chương trình tsc. Bản giao còn nằm ở index DÙNG CHUNG của bốn luồng, nên commit phải dùng `git commit -- pathspec` chứ không phải `git commit` trần |
| Updated | `2026-09-05 09:29 Asia/Bangkok` |

Repo có một defect hạ tầng độc lập với mọi task sản phẩm: khoá `include` của `tsconfig.json` là hai mẫu đệ quy trần cộng một mẫu của Next, còn `exclude` chỉ có `node_modules`. Hệ quả là chương trình tsc ăn TOÀN BỘ cây, nên bất kỳ thư mục nháp nào có một tệp `.tsx` sai kiểu đều làm `npm run typecheck` cùng `next build` chết cho mọi người.

Đây không phải một giả thuyết. Số đo trên baseline: chương trình tsc gồm `483` tệp của repo, và `22` trong số đó là vật liệu nháp CHƯA từng được commit — `11` tệp dưới `new-ui/` cộng `11` tệp dưới `scratch/`, trong đó `scratch/t1r4/` là bảy bản chép của trang thật. Cộng thêm `2` tệp bằng chứng ĐÃ commit dưới `docs/tasks/hrp-v5-go-live-15-public-contrast-aa/evidence/`: hai bản chụp đông lạnh của mã cũ, giữ làm hồ sơ audit, hiện đang được typecheck như thể chúng là mã đang chạy.

Một trong số đó đang đỏ: `new-ui/components/JobCard.tsx` dòng `18` cho `error TS2322`. Nó là tệp CHƯA theo dõi, `git log --all` cho `0` commit, nên nó chưa bao giờ tới Vercel và bản build production KHÔNG bị ảnh hưởng. Thứ bị chặn là bản build cục bộ — đúng thứ mà lane trình duyệt cần.

Task này sửa RANH GIỚI, không sửa tệp đỏ. Sửa tệp đỏ là vá một lần: nó chưa theo dõi, mai nó đổi hoặc mất là đỏ lại, và thư mục nháp kế tiếp phá tiếp.

## 1. Outcome

### User-visible outcome

Không có. Người dùng cuối không thấy gì đổi. Bề mặt công khai, dữ liệu, quyền và mọi response giữ nguyên từng byte.

Người thụ hưởng là lane build: `npm run typecheck` trở lại exit `0`, và một thư mục nháp đặt vào gốc repo từ nay KHÔNG còn quyền làm chết bản build của người khác.

### Non-goals

- KHÔNG sửa, KHÔNG xoá, KHÔNG di chuyển, KHÔNG gitignore bất cứ thứ gì dưới `new-ui/` hay `scratch/`. Task này chỉ thôi typecheck chúng.
- KHÔNG sửa lỗi kiểu trong `new-ui/components/JobCard.tsx`. Nguyên mẫu ấy là đầu vào của một contract UI về sau; sửa nó bây giờ là làm hộ việc chưa được giao.
- KHÔNG chạm `.gitignore`. Việc `scratch/` có nên được git bỏ qua hay không là một câu hỏi riêng, ghi ở mục `8`.
- KHÔNG thêm gói, KHÔNG chạy `npm install`, KHÔNG đổi `package.json`.
- KHÔNG chạy `next build` và KHÔNG chạy `next dev`. Lý do ở mục `4.3`.
- KHÔNG đổi một dòng nào của `compilerOptions`. Diff của task này chỉ được chạm đúng một khoá.

## 2. Evidence và Baseline

| ID | Số đo trên baseline | Lệnh đã dùng |
|---|---|---|
| `EV-01` | `npm run typecheck` exit `1`, đúng `1` dòng `error TS`, ở `new-ui/components/JobCard.tsx` dòng `18`, mã `TS2322` | `npx tsc --noEmit` redirect ra tệp rồi đọc mã thoát |
| `EV-02` | Chương trình tsc gồm `1167` dòng, trong đó `483` dòng KHÔNG thuộc `node_modules` | `npx tsc -p tsconfig.json --listFilesOnly` exit `0` |
| `EV-03` | Phân bố `483` tệp ấy theo thư mục gốc: `src` `220`, `app` `115`, `.next` `112`, `scratch` `11`, `new-ui` `11`, gốc repo `7`, `tests` `2`, `packages` `2`, `docs` `2`, `prisma` `1` | `grep` bỏ `node_modules` rồi `sort` cộng `uniq -c` trên đoạn thư mục đầu |
| `EV-04` | `22` tệp trong chương trình là CHƯA theo dõi: `11` dưới `new-ui/components/`, `11` dưới `scratch/` gồm `scratch/t1r4/` bảy tệp | `git ls-files --error-unmatch` chạy trên từng tệp của danh sách `EV-02` |
| `EV-05` | `7` tệp gốc repo trong chương trình: `middleware.ts`, `next-env.d.ts`, `playwright.config.ts`, `vitest.config.ts`, `vitest.integration-files.ts`, `vitest.integration.config.ts`, `vitest.unit.config.ts`. Không có `next.config`, và `eslint.config.mjs` không thuộc chương trình vì nó là `.mjs` | `ls` gốc repo cộng danh sách `EV-02` |
| `EV-06` | `2` tệp `docs` trong chương trình là hai bản chép đông lạnh dưới `docs/tasks/hrp-v5-go-live-15-public-contrast-aa/evidence/`, cả hai ĐÃ theo dõi | danh sách `EV-02` cộng `git ls-files` |
| `EV-07` | `include` hiện tại là ba mẫu: hai mẫu đệ quy trần cho `.ts` cùng `.tsx`, cộng mẫu `.next/types`. `exclude` chỉ có `node_modules` | `Get-Content tsconfig.json` |
| `EV-08` | `tsconfig.json` sạch trên baseline: `git status --porcelain tsconfig.json` cho `0` dòng | `git status --porcelain tsconfig.json` |

Mọi con số ở trên do Tier 1 tự đo. Tier 2 đo lại ở `STEP-01` và nếu lệch thì ghi vào `HANDOFF.md` chứ không im lặng dùng số của Tier 1.

## 3. Decisions và Assumptions

| ID | Quyết định |
|---|---|
| `DEC-01` | Hướng sửa là ALLOW-LIST ở `include`, không phải DENY-LIST ở `exclude`. Deny-list fail OPEN: thư mục nháp kế tiếp lại phá build. Allow-list fail CLOSED: một thư mục nguồn mới sẽ KHÔNG được typecheck và không ai hay. `DEC-02` là thứ trả giá cho lựa chọn này |
| `DEC-02` | Vì allow-list fail closed, task này BẮT BUỘC kèm một hàng rào biến điểm mù ấy thành một vết đỏ ồn ào. Không có hàng rào thì không được nhận allow-list |
| `DEC-03` | Hàng rào KHÔNG được chép tay danh sách gốc chương trình. Nó phải ĐỌC `include` từ chính `tsconfig.json` và suy ra tập gốc, rồi lấy tập thách thức từ một phép quét thư mục thật. Đây đúng là điểm mù của `hrp-v5-go-live-08-public-ui-premium`: một bảng chỉ liệt kê thứ tác giả vừa thêm thì xanh 100% mà không bảo vệ gì |
| `DEC-04` | Hai bản chép đông lạnh dưới `docs/` RỜI chương trình, và đó là chủ ý. Chúng là hồ sơ audit của một round đã đóng; để chúng trong chương trình nghĩa là một refactor tương lai có thể làm chết build vì một tệp bằng chứng lịch sử |
| `DEC-05` | `new-ui/` cùng `scratch/` rời chương trình mà KHÔNG bị xoá và KHÔNG bị gitignore. Một contract UI về sau sẽ cần `new-ui/` còn nguyên; và khi thư mục ấy thành mã thật thì chính contract ấy thêm nó vào `include`, còn hàng rào sẽ đỏ cho tới lúc nó làm việc đó — đó là hành vi ĐÚNG, không phải trở ngại |
| `DEC-06` | `next-env.d.ts` phải nằm trong `include` như một mục hạng nhất. Next chỉ tự viết lại `include` khi khoá ấy VẮNG; giữ khoá cùng tệp ambient của Next là điều kiện để bản build không ghi đè công của task này. Đây là một giả định về hành vi của công cụ, không phải một phép đo, nên nó thành giới hạn CÓ TÊN ở `RQ-06` |
| `DEC-07` | Chỉ khoá `include` được đổi. `compilerOptions` cùng `exclude` giữ nguyên từng byte, để diff nhỏ nhất và để mọi thay đổi hành vi truy về đúng một nguyên nhân |

## 4. Contract

### 4.1 Requirements

| ID | Yêu cầu |
|---|---|
| `RQ-01` | Khoá `include` của `tsconfig.json` thành một allow-list tường minh. Không mẫu nào trong `include` được có glob đệ quy ở ĐOẠN ĐẦU. Allow-list phải phủ đủ sáu gốc chương trình cùng bảy tệp gốc repo của `EV-05`, và `next-env.d.ts` là một mục hạng nhất theo `DEC-06`. Hình dạng đích ghi ở khối dưới bảng này |
| `RQ-02` | Sau khi sửa, `npm run typecheck` exit `0` và `0` dòng `error TS` |
| `RQ-03` | Vùng phủ KHÔNG được co lại. Không một tệp nào dưới `app/`, `src/`, `packages/`, `prisma/`, `tests/` và không một tệp gốc repo nào của `EV-05` được rời chương trình tsc |
| `RQ-04` | Tập RỜI chương trình phải ĐÚNG BẰNG `24` tệp đã khai: `11` dưới `new-ui/`, `11` dưới `scratch/`, `2` dưới `docs/tasks/hrp-v5-go-live-15-public-contrast-aa/evidence/`. Tập VÀO chương trình phải rỗng, trừ chính tệp hàng rào mới của task này |
| `RQ-05` | Một hàng rào mới ở `src/shared/toolchain/tsc-program-boundary.static.test.ts`, chạy trong lane `npm run test:unit`, thoả cả bốn tính chất: nó ĐỌC `include` từ `tsconfig.json` để suy ra tập gốc thay vì chép tay theo `DEC-03`; nó quét thư mục thật ở tầng gốc repo để lấy tập thách thức; nó phân loại ĐÓNG, nghĩa là một thư mục gốc mới có tệp `.ts` hoặc `.tsx` mà chưa được xếp vào gốc chương trình hay vào danh sách NGOÀI kèm lý do sẽ làm hàng rào đỏ; và nó có sàn chống quét rỗng cùng một tự-kiểm bộ so mẫu trên dữ liệu bịa |
| `RQ-06` | `HANDOFF.md` ghi giới hạn CÓ TÊN của `DEC-06`: task này KHÔNG chứng minh rằng `next build` để yên khoá `include`, vì mục `4.3` cấm chạy bản build. Phép kiểm ấy được giao sang execution round 2 của `hrp-v5-test-01-browser-lane`, nơi `webServer` chạy bản build thật |

Hình dạng đích của khoá `include`, `13` mẫu, đúng thứ tự này:

```json
"include": [
  "next-env.d.ts",
  "middleware.ts",
  "*.config.ts",
  "vitest.integration-files.ts",
  "app/**/*.ts",
  "app/**/*.tsx",
  "src/**/*.ts",
  "src/**/*.tsx",
  "packages/**/*.ts",
  "packages/**/*.tsx",
  "prisma/**/*.ts",
  "tests/**/*.ts",
  ".next/types/**/*.ts"
]
```

`vitest.integration-files.ts` cần một mục riêng vì nó KHÔNG khớp `*.config.ts`. Bốn tệp cấu hình còn lại của `EV-05` khớp mẫu ấy. Trong tsconfig, một `*` không vượt qua dấu phân cách thư mục, nên `*.config.ts` chỉ với tới tầng gốc.

### 4.2 Scope boundaries

Được chạm, và chỉ ba nhóm sau:

1. Hai tệp liệt kê ở `Modules`: `tsconfig.json`, và `src/shared/toolchain/tsc-program-boundary.static.test.ts` mới.
2. Artifact của chính task: `docs/tasks/hrp-v5-rf-05-tsc-program-boundary/HANDOFF.md` cộng mọi tệp dưới `docs/tasks/hrp-v5-rf-05-tsc-program-boundary/evidence/`.
3. Tệp tạm của hai phép thử ĐỎ ở `STEP-07` cùng `STEP-08`. Chúng phải biến mất trước khi task kết thúc, và `STEP-09` chứng minh điều đó.

Cấm chạm: `package.json`, `package-lock.json`, `.gitignore`, `middleware.ts`, mọi tệp cấu hình vitest, `playwright.config.ts`, `eslint.config.mjs`, `prisma/`, mọi tệp dưới `app/`, mọi tệp dưới `src/` ngoài đúng tệp hàng rào mới, mọi tệp dưới `new-ui/`, mọi tệp dưới `scratch/`, mọi tệp dưới `docs/tasks/` không thuộc slug của task này, mọi tệp `.env`. Xuất hiện một path ngoài ba nhóm trên VÀ ngoài hạng tài sản của luồng khác là FAIL. Hạng tài sản của luồng khác gồm đúng ba thứ: path đã khai của một contract CÙNG LÔ đang dở, tức `hrp-v5-go-live-18-public-surface-hardening`, `hrp-v5-go-live-17-rls-required-relation-sweep` và `hrp-v5-test-01-browser-lane`, kể cả artifact dưới `docs/tasks/` của ba slug ấy; mọi tệp `TASK.md` dưới `docs/tasks/` là contract do Tier 1 viết; và năm tệp gate dưới `.ai-pipeline/scripts/` do một luồng khác sửa. Ba thứ ấy KHÔNG bao giờ là công và cũng KHÔNG bao giờ là lỗi của task này. Task này không được sửa, xoá, reset hay bỏ stage một tệp nào trong hạng ấy.

Cây làm việc lúc Tier 2 bắt đầu ĐANG dirty với bản giao của ba contract cùng lô, và đó là trạng thái HỢP LỆ chứ không phải điều kiện dừng. Lý do đảo so với bản `v1.0`: `AC-11` của 17, ô typecheck của 18 và `BLK-01` của test-01 đều đòi `npm run typecheck` exit `0`, mà không một task nào trong ba đạt được cho tới khi task NÀY đóng biên chương trình tsc, nên task này chạy TRƯỚC chứ không sau. `STEP-01` vì vậy KHÔNG dừng vì cây dirty; nó chỉ ghi lại danh sách dirty ấy làm mốc, và `STEP-10` so danh sách cuối với mốc đó để chứng minh task này không thêm path nào ngoài ba nhóm của mình.

Bản `v1.3` MỞ RỘNG hạng tài sản của luồng khác theo `PLN-52`, vì audit round 2 đo được một khoảng trống phân loại thật. Cụm "đúng ba thứ" ở trên đọc theo bản `v1.2`; từ `v1.3` hạng ấy gồm NĂM thứ và KHÔNG còn con số cố định nào, vì số path staged của luồng khác tự đi từ `78` lên `82` ngay trong lúc Tier 3 đang đo. Thứ tư: bản giao của `hrp-v5-rf-06-vitest-default-lane-safety`, gồm `vitest.config.ts`, `src/shared/toolchain/vitest-default-lane.static.test.ts` và mọi artifact dưới slug ấy — chính ô `Next gate` của task này xếp rf-06 chạy TRƯỚC round 2, nên `19` dòng porcelain của nó là hệ quả bắt buộc của thứ tự tôi ra lệnh. Thứ năm: `AUDIT.md` dưới slug của chính task này do Tier 3 ghi, cộng MỌI tệp dưới `.ai-pipeline/scripts/`, cộng mọi artifact dưới `docs/tasks/hrp-v5-gate-01-audit-row-identity/`, `docs/tasks/hrp-v5-gate-02-lane-premise-correction/` và `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/`.

Lý do nền của cả năm: Git index là tài sản DÙNG CHUNG của mọi luồng trong cùng một cây làm việc. Một AC ràng buộc tập path staged mà không loại trừ vùng của Tier 1 và của Tier 3 sẽ FAIL vì việc của người khác, và đó là lỗi LỜI VĂN của tôi chứ không phải lỗi thực thi của Tier 2.

### 4.3 Data, State, Permission và Interface Rules

- **Không kết nối database.** Mọi phép đo là tĩnh. `npx tsc --listFilesOnly` liệt kê thành viên chương trình mà không biên dịch và không chạy mã.
- **CẤM chạy `npm run build` và cấm `next dev`.** Hai lý do độc lập, mỗi lý do đủ để cấm: `.env` của repo trỏ vào PRODUCTION nên một lượt tạo trang tĩnh có thể truy vấn database thật; và chính `next build` là thứ có quyền viết lại `tsconfig.json`, nên chạy nó ở đây làm bẩn phép đo của task. Bản build thuộc lane của `hrp-v5-test-01-browser-lane`.
- **Không xoá, không di chuyển, không gitignore** bất cứ thứ gì dưới `new-ui/` hoặc `scratch/`, theo `DEC-05`.
- **Không thêm gói và không chạy `npm install`.** Hàng rào chỉ dùng thư viện chuẩn của Node cùng vitest đã có.
- **Hàng rào không được gọi ra ngoài process.** Không `execSync`, không gọi `git`. Nó đọc `tsconfig.json` và quét thư mục, thế thôi. Một hàng rào phụ thuộc `git` sẽ chết ở môi trường không có checkout.
- **Bí mật:** không in connection string, token, password hay PII vào log và artifact. Danh sách tệp của `tsc --listFilesOnly` là đường dẫn tuyệt đối, không phải bí mật, nhưng vẫn phải đọc lại trước khi dán.

## 5. Execution Plan

| ID | Việc | Ra cái gì |
|---|---|---|
| `STEP-01` | Chạy `pwsh -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-rf-05-tsc-program-boundary/TASK.md`, rồi `git log --oneline -1`, rồi `git status --porcelain`, rồi `npm run test:unit` và `npm run typecheck` trên cây CHƯA sửa | Năm output kèm mã thoát ở đầu `HANDOFF.md`. Mốc số tệp test cùng số test PASS của lane unit. Nếu `git status --porcelain` còn tệp dirty của lô trước thì DỪNG theo mục `4.2` |
| `STEP-02` | Dựng danh sách chương trình TRƯỚC: `npx tsc -p tsconfig.json --listFilesOnly` redirect ra `evidence/`, rồi bỏ dòng `node_modules`, rồi đếm theo thư mục gốc, rồi chạy `git ls-files --error-unmatch` trên từng tệp ngoài `src` cùng `app` để phân THEO DÕI hay CHƯA | Một tệp danh sách gốc, một bảng đếm theo thư mục, một bảng theo dõi. Ba số của `EV-02`, `EV-03`, `EV-04` được xác nhận hoặc được ghi là lệch |
| `STEP-03` | Sửa đúng khoá `include` của `tsconfig.json` về `13` mẫu ở mục `4.1`. Không chạm `compilerOptions`, không chạm `exclude` | Diff của một khoá duy nhất |
| `STEP-04` | Dựng danh sách chương trình SAU bằng đúng lệnh của `STEP-02`, rồi `sort` hai danh sách và lấy hiệu hai chiều bằng `comm`. So tập RỜI với `24` tệp đã khai ở `RQ-04`, so tập VÀO với tập rỗng cộng tệp hàng rào | Hai tệp hiệu. Kết luận từng chiều. Dòng `.next/types` có thể trôi giữa hai lượt chạy nên phép so chính thức bỏ nhánh `.next` và điều đó được ghi rõ |
| `STEP-05` | Chạy `npm run typecheck`, lấy mã thoát bằng redirect chứ không sau ống | Output đầy đủ, mã thoát `0`, `0` dòng `error TS` |
| `STEP-06` | Viết `src/shared/toolchain/tsc-program-boundary.static.test.ts` theo `RQ-05` cùng `DEC-03`, rồi chạy `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/tsc-program-boundary.static.test.ts` | Một tệp hàng rào mới cộng output xanh kèm số test và mã thoát. Sàn chống quét rỗng có giá trị ghi rõ trong mã |
| `STEP-07` | Phép thử ĐỎ thứ nhất: ghi lại `git hash-object tsconfig.json`, đổi TẠM `include` về hai mẫu đệ quy trần, chạy lại hàng rào, ghi lần ĐỎ, HOÀN NGUYÊN, chạy lại cho xanh, rồi so `git hash-object` lần hai | Ba output: đỏ kèm thông điệp assertion thật nêu đúng mẫu phạm quy, xanh sau hoàn nguyên, và hai giá trị hash GIỐNG nhau |
| `STEP-08` | Phép thử ĐỎ thứ hai: tạo một thư mục tầng gốc tạm chứa đúng một tệp `.tsx` chưa được phân loại, chạy lại hàng rào, ghi lần ĐỎ, XOÁ thư mục ấy, chạy lại cho xanh | Ba output: đỏ kèm thông điệp nêu đúng tên thư mục tạm, lệnh xoá, xanh sau khi xoá. Đây là chân đo của `DEC-02` |
| `STEP-09` | Dọn: `git status --porcelain` phải không còn tệp tạm nào của hai phép thử. Rồi chạy lại `npm run test:unit` và `npm run typecheck` | Output `git` không chứa tệp tạm. Hai lane exit `0`. Số test PASS không nhỏ hơn mốc `STEP-01` cộng số test của hàng rào, và con số ấy lấy từ output của runner chứ không từ việc đếm chuỗi con trong mã |
| `STEP-10` | Kiểm phạm vi bằng `git status --porcelain` cộng `git diff --cached --name-only`. Ghi `HANDOFF.md` cộng `evidence/`, trong đó có dòng giới hạn CÓ TÊN của `RQ-06`, rồi `git add` NGAY. Chạy cổng bản giao CUỐI CÙNG. **KHÔNG commit, KHÔNG push, KHÔNG deploy** | Danh sách path đầy đủ, mỗi path phân vào đúng một trong ba nhóm của `4.2` hoặc vào hạng tài sản của luồng khác đã định nghĩa ở `4.2`, và `HANDOFF.md` với mọi lệnh, mã thoát, output thật |

## 6. Acceptance Criteria

| ID | Cách kiểm | Ngưỡng đạt |
|---|---|---|
| `AC-01` | `git diff --cached -- tsconfig.json` cộng `node -e` đọc `tsconfig.json` rồi in mảng `include` | Diff chỉ chạm khoá `include`. Khối `compilerOptions` cùng khoá `exclude` giống baseline từng byte. Mảng `include` có đúng `13` phần tử của mục `4.1`. `next-env.d.ts` có mặt. Không phần tử nào có glob đệ quy ở đoạn ĐẦU |
| `AC-02` | `npx tsc -p tsconfig.json --listFilesOnly` trên chương trình CŨ và MỚI, cộng `comm` trên hai danh sách đã `sort`, bỏ nhánh `.next` | Lệnh exit `0`. Tập RỜI chương trình có đúng `24` tệp: `11` dưới `new-ui/`, `11` dưới `scratch/`, `2` dưới `docs/tasks/hrp-v5-go-live-15-public-contrast-aa/evidence/`. Chương trình MỚI là tập con THẬT SỰ của chương trình CŨ, nên tập VÀO bằng `0`; tập VÀO khác `0` là FAIL kèm liệt kê từng path. Ngưỡng cũ đòi tập VÀO đúng `1` phần tử là BẤT KHẢ ĐẠT, vì `include` của baseline là hai glob đệ quy toàn cây nên tệp hàng rào đã nằm trong chương trình CŨ trước khi task này chạy. Xem `PLN-48` |
| `AC-03` | `grep` trên tệp hiệu của `STEP-04` với năm tiền tố `app/`, `src/`, `packages/`, `prisma/`, `tests/`, rồi `grep` với bảy tên tệp gốc repo của `EV-05` | Cả hai lượt `grep` cho `0` dòng khớp trong tập RỜI. Vùng phủ của mã đang chạy không mất một tệp nào |
| `AC-04` | `sort` cộng `uniq -c` trên đoạn thư mục đầu của danh sách SAU, đối chiếu mốc `STEP-02` | `src` delta `0` so với mốc `STEP-02`; `app`, `packages`, `prisma`, `tests` cùng nhóm tệp gốc repo cũng delta `0`; `new-ui`, `scratch`, `docs` đều bằng `0`. Kết cục KHÔNG sinh thêm tệp nào là ĐẠT, vì cả hai tệp hàng rào dưới `src/shared/toolchain/` — của task này và của `hrp-v5-rf-06-vitest-default-lane-safety` — đã nằm trên đĩa trước mốc nên `include` cũ đã đếm chúng. Ngưỡng cũ đòi `src` cộng đúng `1` là ngưỡng của một round SINH tệp, không phải của round khôi phục. Xem `PLN-49` |
| `AC-05` | `npm run typecheck` với mã thoát lấy bằng redirect chứ không sau ống, cộng `grep -c "error TS"` | exit `0` và `0` dòng `error TS`. Đây là điều kiện mở của `BLK-01` bên `hrp-v5-test-01-browser-lane` |
| `AC-06` | Đọc `src/shared/toolchain/tsc-program-boundary.static.test.ts` cộng `grep -n` trên nó | Tệp ĐỌC `tsconfig.json` và suy tập gốc từ mảng `include` đã phân tích, không có mảng chép tay nào đóng vai nguồn sự thật. Có phép quét thư mục tầng gốc bằng thư viện chuẩn của Node. Có sàn chống quét rỗng với giá trị số ghi trong mã, sàn số tệp quét được không nhỏ hơn `300` và sàn số gốc chương trình không nhỏ hơn `5`. Có danh sách NGOÀI chương trình, mỗi mục kèm lý do. Có tự-kiểm bộ so mẫu trên dữ liệu bịa. Không `execSync`, không gọi `git` |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/tsc-program-boundary.static.test.ts` | exit `0`. Runner NÊU đúng tệp hàng rào, tức nó nằm trong lane unit theo cấu trúc chứ không nhờ may. Số test lớn hơn `0` và bằng con số `HANDOFF.md` khai |
| `AC-08` | Đọc ba output của `STEP-07` cộng hai giá trị `git hash-object tsconfig.json` | Lượt với `include` đệ quy trần exit KHÁC `0`, và thông điệp là assertion THẬT nêu đúng mẫu phạm quy, không phải một dòng in ra bằng console. Lượt sau hoàn nguyên exit `0`. Hai giá trị hash GIỐNG nhau, tức `tsconfig.json` đã về đúng bản giao |
| `AC-09` | Đọc ba output của `STEP-08` cộng `git status --porcelain` sau khi xoá | Lượt có thư mục gốc chưa phân loại exit KHÁC `0` và thông điệp nêu đúng tên thư mục ấy. Lượt sau khi xoá exit `0`. Output `git` không còn dấu vết thư mục tạm. Nếu hàng rào KHÔNG đỏ ở lượt này thì `DEC-02` chưa được thoả và task FAIL |
| `AC-10` | `npm run test:unit` rồi `npm run typecheck`, mã thoát lấy bằng redirect chứ không sau ống. Trích dòng đỏ bằng `^ *FAIL ` CÓ khoảng trắng đầu dòng | Cả hai exit `0`. Số tệp test không nhỏ hơn mốc `STEP-01`. Phần tăng số test PASS phải bằng ĐÚNG lực lượng tập ĐỎ tại mốc `STEP-01`, và phải chứng minh bằng ĐỒNG NHẤT TẬP chứ không bằng lực lượng: `comm -3` trên hai danh sách đã `sort` cho `0` dòng lệch, cộng md5 hai bên bằng nhau. Hai tập RỖNG so bằng nhau là bằng nhau GIẢ, nên một phép trích thiếu khoảng trắng đầu dòng là vô hiệu và không được dùng làm bằng chứng. Mọi dòng đỏ còn lại phân loại từng dòng; một dòng đỏ ở path KHÔNG thuộc ba nhóm của `4.2` và KHÔNG được git theo dõi thì thuộc hạng vật liệu nháp ngoài mọi contract, và `HANDOFF.md` ghi rõ hạng ấy cùng đường dẫn. Xem `PLN-50` |
| `AC-11` | `git status --porcelain` cộng `git diff --cached --name-only`, hợp hai danh sách rồi phân nhóm theo `4.2`, tất cả đo theo DELTA so với mốc `STEP-01`. Cộng `git status --porcelain` chạy riêng trên từng đường dẫn ở cột cấm chạm. Cộng `git log --oneline -1` | Mọi path thuộc đúng một trong ba nhóm của `4.2`, hoặc thuộc hạng tài sản của luồng khác đã định nghĩa ở `4.2`, và khi ấy `HANDOFF.md` ghi rõ nó thuộc luồng nào. Mọi đường dẫn cấm chạm có DELTA `0` so với mốc `STEP-01`; output THÔ của chúng KHÔNG cần rỗng, vì chính `4.2` tuyên bố lô dirty của các luồng cùng lô là trạng thái HỢP LỆ. Riêng `new-ui/` cùng `scratch/` phải giữ ĐÚNG danh sách tệp chưa theo dõi như tại mốc: không một dòng porcelain nào của hai thư mục ấy đổi hạng sang `D` hay sang dạng đã sửa. `git log --oneline -1` bằng đúng mốc `STEP-01`, tức Tier 2 không commit. Ngưỡng cũ đòi output THÔ RỖNG là mệnh đề tự mâu thuẫn với `4.2` của chính nó. Xem `PLN-51` |
| `AC-12` | Đọc mục giới hạn của `HANDOFF.md` bằng `Get-Content` | Có dòng ghi rõ task này KHÔNG chứng minh `next build` để yên khoá `include`, nêu lý do là mục `4.3` cấm chạy bản build, và nêu rằng phép kiểm ấy thuộc execution round 2 của `hrp-v5-test-01-browser-lane`. Không dòng nào khẳng định task này đã chứng minh bản build an toàn |

### 6.1 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-03` | `AC-01` |
| `RQ-02` | `STEP-05`, `STEP-09` | `AC-05`, `AC-10` |
| `RQ-03` | `STEP-04` | `AC-03`, `AC-04` |
| `RQ-04` | `STEP-02`, `STEP-04` | `AC-02` |
| `RQ-05` | `STEP-06`, `STEP-07`, `STEP-08` | `AC-06`, `AC-07`, `AC-08`, `AC-09` |
| `RQ-06` | `STEP-09`, `STEP-10` | `AC-11`, `AC-12` |

## 7. Risk và Rollback

| ID | Rủi ro | Giảm thiểu |
|---|---|---|
| `R-01` | Allow-list hỏng KÍN: một thư mục nguồn thật sinh ra sau này sẽ im lặng nằm ngoài `npm run typecheck`, và không ai biết vì lane vẫn xanh | Đây là GIÁ đã ghi ở `DEC-01` và hàng rào của `RQ-05` là thứ trả giá ấy. `STEP-08` chứng minh hàng rào ĐỎ khi có thư mục tầng gốc chưa phân loại, nên trạng thái "không ai biết" không tồn tại được. Nếu `STEP-08` không đỏ thì task FAIL chứ không nới ngưỡng |
| `R-02` | `next build` có thể tự ghi lại `tsconfig.json` và đưa `include` về mẫu đệ quy trần, làm mất bản sửa mà không ai thấy | Giữ khoá `include` HIỆN DIỆN cùng `next-env.d.ts` ở vị trí đầu là điều kiện Next để yên khoá ấy, theo `DEC-06`. Task này KHÔNG được chạy bản build nên KHÔNG chứng minh được điều đó, và `AC-12` buộc `HANDOFF.md` ghi giới hạn ấy CÓ TÊN. Phép kiểm thật thuộc execution round 2 của `hrp-v5-test-01-browser-lane`, ở đó `webServer` chạy một bản build thật: sau bước ấy chạy `git status --porcelain tsconfig.json`, ra RỖNG là Next để yên, ra một dòng là `R-02` đã hiện thực và mở một contract mới |
| `R-03` | Hai bản đóng băng dưới `docs/tasks/hrp-v5-go-live-15-public-contrast-aa/evidence/` mất vùng phủ typecheck | Cố ý, theo `DEC-04`. Chúng là bản chụp bằng chứng của một task đã ACCEPTED, không phải mã chạy. Typecheck một bản chụp đóng băng là phép đo vô nghĩa và nó chính là một phần lý do `BLK-01` tồn tại |
| `R-04` | Tier 2 chạy task này khi cây còn dirty tệp của lô `18` cùng `17`, làm `AC-11` bẩn và làm ba contract cùng FAIL | `STEP-01` bắt buộc chạy `git status --porcelain` TRƯỚC mọi thứ khác. Còn tệp dirty của lô trước thì DỪNG và ghi lý do, đó là kết cục HỢP LỆ chứ không phải defect, theo mục `4.2` |

Rollback: hoàn nguyên khoá `include` của `tsconfig.json` về mẫu baseline và xoá tệp `src/shared/toolchain/tsc-program-boundary.static.test.ts`. Không có migration, không có state ngoài repo, không có bản deploy nào bị chạm, nên rollback là hai bước tệp và không cần thao tác OP nào.

## 8. Open Questions

| ID | Câu hỏi | Ai trả lời | Ảnh hưởng nếu chưa trả lời |
|---|---|---|---|
| `Q-01` | `scratch/` cùng `new-ui/` có nên vào `.gitignore` không | Sếp, ở một contract sau | Không chặn task này. Mục `4.3` CẤM task này chạm `.gitignore`. Sau task này hai thư mục ấy vẫn chưa theo dõi và vẫn nằm ngoài chương trình tsc, tức tác hại đã hết dù `.gitignore` chưa đổi |
| `Q-02` | Khi `new-ui/` thành mã app thật thì ai đưa nó trở vào chương trình | Contract UI nhận việc ấy | Không chặn. Contract ấy thêm hai mẫu `new-ui` vào `include` VÀ thêm `new-ui` vào danh sách phân loại của hàng rào. Trước khi nó làm hai việc ấy, hàng rào ĐỎ ngay khi có ai chuyển `new-ui/` thành mã được theo dõi, và đỏ đúng lúc ấy là hành vi MONG MUỐN chứ không phải lỗi |

## 9. Planner Resolution

### Resolution R1 — Audit round 1

| Field | Decision |
|---|---|
| Audit gate | `verify-audit.ps1`: `PASS WITH WARNINGS`; warning duy nhất là shared index có staged paths ngoài task, đã được phân attribution và không được phép commit chung bởi Tier 3 |
| Audit verdict | `FAIL` |
| `AUD-001` | `ACCEPT_FIX`. `npx vitest run` exit `1` với 24 test đỏ tại `src/domains/applications/placement-panel.test.ts` do `React is not defined`; đây là mandatory `C-01`, nên RF-05 chưa thể `ACCEPTED` |
| Attribution | Lỗi nằm ngoài hai deliverable của RF-05 (`tsconfig.json` và static boundary guard). Không có bằng chứng buộc rollback bản đóng biên TSC; `npm run typecheck` và canonical unit lane của RF-05 đang xanh |
| Implementation decision | Mở task riêng `hrp-v5-rf-06-vitest-default-lane-safety` để sửa default Vitest/JSX runtime và đóng đường tự đọc DB thật. Sau bằng chứng TEST-01 round 2 cho thấy staged `tsconfig.json` đã biến mất, RF-05 phải có execution round 2 MỎNG để khôi phục chính deliverable này; không sửa guard trừ khi phép đo chứng minh guard sai |
| Closure condition | RF-06 audit PASS; RF-05 round 2 khôi phục staged diff `12 2`; Tier 3 audit round 2 tự đo `npx vitest run` exit `0`, đồng thời xác nhận AC-01..AC-12 và mandatory checks không hồi quy |
| Task state | `REVISION_REQUIRED` |

### Cross-task incident — TEST-01 execution round 2

- TEST-01 đo được `tsconfig.json` từ blob RF-05 `53cc4848…` trở về đúng blob HEAD `f0c8e7b4…` trong cả worktree lẫn Git index.
- `next build` có thể sửa tệp worktree nhưng không có quyền tự thay Git index. Vì cả hai tầng cùng trở về HEAD, Tier 1 bác bỏ kết luận nhân quả rằng Next tự xoá staged delivery; tác nhân thực là một thao tác Git/agent đồng thời chưa xác định trong shared workspace.
- Trạng thái quan sát vẫn là blocker thật: RF-05 hiện thiếu một trong hai deliverable. Round 2 phải khôi phục đúng `tsconfig.json`, rồi task chỉ được audit/chốt sau khi thay đổi đã được cô lập và commit theo scope.

### Resolution R2 — Audit round 2

| Field | Decision |
|---|---|
| Audit gate | `verify-audit.ps1` exit `0`, `PASS WITH WARNINGS (1)`. Warning duy nhất `S-16`: `82` staged path ngoài slug. Tôi đọc warning ấy là ĐÚNG và VÔ HẠI: con số tự đi từ `78` lên `82` trong lúc Tier 3 đang đo, vì hai luồng Tier 1 khác cùng stage vào chung một index. `PLN-52` mở hạng tài sản để lời văn khớp thực tế ấy |
| Audit verdict | `CONDITIONAL`, 8/12 AC PASS, 4 PARTIAL, không P0, không P1, không P2, không mandatory check FAIL |
| `AUD-001` của round 1 | `CLOSED`. Tier 3 tự đo, không lấy số từ `HANDOFF.md`: bốn count `0` và hai lane thu kết quả y hệt nhau. Bản giao `tsconfig.json` đã khôi phục đúng numstat `12 2` |
| Bốn PARTIAL | Cùng một hạng nguyên nhân — NGƯỠNG do tôi viết — nhưng KHÁC cơ chế, nên bốn phán quyết riêng chứ không một phán quyết gộp: `PLN-48` là ngưỡng bất khả đạt về cấu trúc, `PLN-49` là ngưỡng của round sinh tệp áp lên round khôi phục, `PLN-50` là số học của round khôi phục, `PLN-51` là contract tự mâu thuẫn |
| Attribution | Không một PARTIAL nào thuộc Tier 2. Hai bản giao đúng, hai lane xanh, không commit, không push. Đây là DEFECT LỜI VĂN của Tier 1 |
| Implementation decision | KHÔNG mở execution round 3. Không có gì để Tier 2 sửa: mọi số Tier 3 đo được đã là số ĐÚNG của một round khôi phục |
| Spec decision | Bump `v1.2` sang `v1.3`, sửa ngưỡng bốn AC cộng mở `4.2`. Đây là sửa CONTRACT nên bắt buộc bump; nếu là lỗi thực thi thì giữ spec và mở round mới |
| Tooling drift | `gate-lib.ps1` dịch giữa vòng từ `4caa5fd5` sang `43ada847` do luồng Tier 1 khác thêm token `hash-object`. Tôi CHẤP NHẬN cách Tier 3 xử: bóc lại bản pre-round bằng `git cat-file -p`, hash lại bản copy, chạy lại và ghi CẢ hai hash vào `evidence/a2-36-verify-audit-with-preround-gatelib.txt`. Bản pre-round cho cùng kết luận, cùng một warning `S-16`. `verify-audit.ps1` KHÔNG dịch trong vòng: `2520a48d` ở pre-round, post-round và bây giờ |
| Known red on re-run | `A-02` sẽ ĐỎ nếu chạy lại cổng sau bump, vì `AUDIT.md` khai đo `v1.2` còn contract nay là `v1.3`. Vết đỏ ấy là ĐÚNG và được ghi tên tại đây. TUYỆT ĐỐI không sửa `AUDIT.md` để dập nó; Tier 3 sở hữu tệp ấy |
| Task state | `ACCEPTED` |

| Ruling | Finding | Quyết định | Nội dung |
|---|---|---|---|
| `PLN-48` | `AUD-002` | `ACCEPT_FIX` | Ngưỡng cũ đòi tập VÀO đúng `1` phần tử là BẤT KHẢ ĐẠT ngay từ round 1, không riêng round khôi phục: `include` của baseline là hai glob đệ quy toàn cây, nên MỌI tệp `.ts` mới đã thuộc chương trình CŨ trước khi tôi ra lệnh. Chương trình MỚI chỉ có thể là tập con. Ngưỡng mới đo tập RỜI `24` tệp và đòi tập VÀO bằng `0` |
| `PLN-49` | `AUD-003` | `ACCEPT_FIX` | Ngưỡng cũ đòi `src` cộng đúng `1`. Cả hai tệp hàng rào đã ở trên đĩa trước mốc `STEP-02`, nên delta `0` là số ĐÚNG. Một AC phải cho phép kết cục KHÔNG SINH THÊM TỆP NÀO, nếu không nó buộc executor tạo rác để làm xanh phép đo |
| `PLN-50` | `AUD-004` | `ACCEPT_FIX` | Ngưỡng cũ neo phần tăng vào `12`, tức số test của tệp hàng rào ở round sinh tệp. Ở round khôi phục phần tăng là `5`, và Tier 3 chứng minh `5` ấy ĐÚNG BẰNG tập đỏ tại mốc: `comm -3` cho `0` dòng lệch, md5 `ace85ed6` ở CẢ hai bên. Ngưỡng mới neo vào ĐỒNG NHẤT TẬP thay vì một hằng số. Ghi thêm quy tắc trích `^ *FAIL ` có khoảng trắng đầu dòng, vì `^FAIL ` cho hai tập RỖNG và hai tập rỗng so bằng nhau là bằng nhau GIẢ |
| `PLN-51` | `AUD-005` | `ACCEPT_FIX` | Ngưỡng cũ đòi mọi đường dẫn cấm chạm cho output THÔ rỗng, trong khi `4.2` của CHÍNH bản `v1.2` tuyên bố lô dirty của các luồng cùng lô là trạng thái HỢP LỆ. Hai mệnh đề ấy không thể cùng đúng. Phép đo hợp lệ là DELTA so với mốc `STEP-01`, không phải rỗng tuyệt đối |
| `PLN-52` | `AUD-006` | `ACCEPT_FIX` | Chấp nhận và MỞ RỘNG QUÁ đề xuất của Tier 3. Tier 3 xin thêm rf-06; tôi thêm cả `AUDIT.md` của chính task này, cả `.ai-pipeline/scripts/`, và artifact của ba slug `hrp-v5-gate-01/02/03`. Lý do: Git index là tài sản DÙNG CHUNG, nên một AC ràng buộc tập staged mà không loại trừ vùng của Tier 1 và Tier 3 sẽ FAIL vì việc của người khác. Bỏ mọi con số cố định trong hạng ấy |
| `PLN-53` | `AUD-007`, `AUD-008`, `AUD-009` | `ACCEPT` | P3, không chặn. Ghi nhận, không sửa contract, không mở round |

| `PLN-54` | Phát hiện của Tier 1, không có trong `AUDIT.md` | `DEFER` | Cổng xanh của round này KHÔNG tái lập được từ `HEAD`. Bảng `2` của bản giao có BỐN cột với kết quả ở cột hai, còn `AUDIT.template.md` — hash `502b7e54`, không dịch một byte ở worktree, index lẫn `HEAD` — quy định NĂM cột với `Result` ở cột ba cộng cột `Finding`. Chạy bản `verify-audit.ps1` ĐÃ PHÁT HÀNH ở `HEAD` (`b5390297`, `6382` byte, `0` lần nhắc `gate-lib`) trên chính `AUDIT.md` này cho exit `2` và `12` lỗi dạng "no verdict row", kèm câu "Tier 1 MUST NOT resolve on this AUDIT.md". Cổng exit `0` chỉ tồn tại dưới một `verify-audit.ps1` CHƯA stage (`2520a48d`) cộng một `gate-lib.ps1` đã stage nhưng CHƯA commit (`43ada847`, vắng ở `HEAD`) |

Chi tiết `PLN-54`, theo bốn mục bắt buộc của một `DEFER`:

- Owner: luồng Tier 1 đang sở hữu bộ gate, tức chủ của `hrp-v5-gate-01-audit-row-identity`, `hrp-v5-gate-02-lane-premise-correction` và `hrp-v5-gate-03-delivery-vanish-forensics` — cả ba đang `READY_FOR_EXECUTION` ở `v1.2` và chưa có `HANDOFF.md`.
- Việc này cần một contract MỚI, KHÔNG nhét được vào gate-01: mục Out of scope của gate-01 `v1.2` liệt kê thẳng `.ai-pipeline/templates/AUDIT.template.md` cộng `gate-lib.ps1` và ba tệp verify còn lại, kèm nguyên văn rằng nếu mã kiểm mới đòi đổi template thì đó là task khác. Gate-01 chỉ chạm `verify-audit.ps1` và tệp selftest, cho `S-18` với `S-19`.
- Hai đường sửa, và chọn đường nào là quyền của luồng ấy: hoặc bản đã phát hành nhận cả bảng bốn cột, hoặc template cùng mọi `AUDIT.md` về sau về đúng năm cột. Tôi KHÔNG chốt hộ.
- Trigger: lần đầu bộ gate được commit, hoặc lần đầu một task sau `hrp-v5-rf-06-vitest-default-lane-safety` xin resolve dựa trên `verify-audit.ps1`.
- Deadline: trước khi resolve task kế tiếp bằng cổng ấy.
- Hậu quả nếu bỏ: mọi câu "gate PASS" của cả lô này không kiểm chứng lại được từ `HEAD`, và một `AUDIT.md` bốn cột sẽ bị bản đã phát hành chặn thẳng.

Tôi KHÔNG hạ verdict của Tier 3 vì `PLN-54`. Nguyên nhân xếp hạng "dụng cụ hỏi câu KHÁC" cộng một defect nhỏ THẬT thuộc luồng gate, không thuộc phép đo của Tier 3: mọi số Tier 3 đo được tôi đã tự đo lại và trùng.

Phép đo độc lập của Tier 1 trước khi nhận, không lấy lại số từ relay:

- `AUDIT.md`: `30596` byte đo bằng hai đường độc lập, blob `89b21026`, worktree trùng index, `md5` `9740c41c` bằng đúng bản copy `evidence/a2-32-audit-round2-copy.md`, `cmp` exit `0`. Luật chống cắt tệp về `0` byte đã được Tier 3 chấp hành.
- Không có tệp `??` nào dưới slug; `HEAD` vẫn `31625c4`, tức Tier 3 không commit, không push.
- Bản pre-round `gate-lib.ps1` bóc từ blob `4caa5fd5` dài `17987` byte và tự hash lại về chính `4caa5fd5`; nó chứa token `hash-object` `0` lần, bản đã dịch chứa `2` lần. Đây là lý do bóc bằng `git cat-file -p` chứ không bằng `git show` hai chấm đường dẫn: đường sau giải ra index BÂY GIỜ.
- Bản audit này KHÔNG sao chép round trước: mục `4` round 2 dài `4423` byte so với `577` byte của round 1, `cmp` exit `1`, chỉ `2` dòng trùng. Phép đo mới thật sự đã chạy.
- Tôi tự áp `PLN-54` lên CHÍNH MÌNH: chạy `verify-task.ps1` bản ĐÃ PHÁT HÀNH ở `HEAD` (`f9014b7f`) trên `TASK.md` này cho exit `0` và `RESULT: PASS`, y hệt bản worktree (`e36b83df`). Kết luận của Resolution này KHÔNG đứng trên một dụng cụ chưa phát hành.

## 10. Revision Log

| Spec version | Ngày | Đổi gì | Vì sao |
|---|---|---|---|
| `v1.0` | 2026-09-04 | Bản đầu | Chương trình tsc hiện nuốt cả cây nên một tệp nháp ở thư mục gốc đủ làm `npm run typecheck` cùng `next build` đỏ cho mọi người. Đây là gốc của `BLK-01` bên `hrp-v5-test-01-browser-lane` và của khoảng trống ở tiêu chí số 14 của task GO-LIVE-18 cùng `AC-11` của task GO-LIVE-17. Contract này đóng biên chương trình bằng allow-list và trả giá fail-closed bằng một hàng rào tĩnh |
| `v1.1` | 2026-09-04 | **Đảo thứ tự và mở hạng tài sản của luồng khác, theo phán quyết `AUD-001` của audit round 1 bên `hrp-v5-go-live-17-rls-required-relation-sweep`.** | Bản `v1.0` cho task này chạy SAU khi lô 18/17 commit xong, nhưng phép đo cho thấy cả ba contract cùng lô đều đòi `npm run typecheck` exit `0` và không một task nào đạt được cho tới khi task NÀY chạy — điều kiện chờ ấy là một vòng tròn. Bản này bỏ điều kiện chờ, bỏ luật DỪNG khi cây dirty, và thêm hạng tài sản của luồng khác vào `4.2` để `AC-11` không FAIL oan vì bản giao của ba contract cùng lô cùng năm tệp gate của luồng khác. GIỮ nguyên chữ ba nhóm nên `STEP-10` cùng `AC-11` không đổi số nhóm. KHÔNG đổi phạm vi mã, KHÔNG thêm hay bớt một yêu cầu, một bước hay một tiêu chí nào. Cửa sổ bump rộng nhất vì cả hai round vẫn đếm bằng `0` và task chưa có `HANDOFF.md` |
| `v1.2` | 2026-09-04 | **Đổi path tệp hàng rào từ `src/shared/build/` sang `src/shared/toolchain/`, chín chỗ trong văn, cộng một dấu ống cuối dòng bị thiếu ở dòng changelog `v1.1`. KHÔNG đổi một yêu cầu, một bước, một tiêu chí hay một con số nào.** | Path cũ bị git BỎ QUA. `.gitignore` có mẫu `build/` ở dòng `10` từ commit `451ea28` dưới đề mục build outputs, nên `git check-ignore -v` trên path cũ cho exit `0` và `git status --porcelain --untracked-files=all` trên nó cho `0` dòng. Vitest không đọc `.gitignore` nên lane vẫn chạy tệp và mọi bằng chứng test vẫn xanh, trong khi `git add` không bao giờ nhận nó: một commit sẽ ship allow-list fail-closed MÀ KHÔNG có hàng rào trả giá cho nó, đúng điểm mù mà `DEC-02` sinh ra để chặn. Nội dung tệp không đổi một byte, `git hash-object` hai bên cùng `0bfc244881c3f125dace47ac7832f71033cd94c0`. Không sửa `.gitignore` vì tệp ấy đang dirty của luồng khác và `Q-01` còn để ngỏ chính sách ignore. Cửa sổ bump còn mở vì `Current execution round` và `Current audit round` đều đếm `0` và task này chưa có `AUDIT.md`; bản `v1.2` được ghi vào `HANDOFF.md` của cùng round nên round audit sau đo đúng bản này |
| `v1.3` | 2026-09-05 | **Sửa NGƯỠNG của bốn AC — `AC-02`, `AC-04`, `AC-10`, `AC-11` — từ hằng số của một round SINH tệp sang phép đo đúng của một round KHÔI PHỤC, cộng mở hạng tài sản của luồng khác ở `4.2` từ ba thứ lên năm thứ và bỏ mọi con số cố định trong hạng ấy. KHÔNG đổi một yêu cầu, một bước, một deliverable, một cột cấm chạm nào.** | Audit round 2 verdict `CONDITIONAL`: 8/12 PASS, bốn PARTIAL, `0` finding từ P0 tới P2. Cả bốn PARTIAL là defect LỜI VĂN của tôi, không của Tier 2, nên đường xử đúng là bump contract chứ không phải mở execution round 3. Xem `PLN-48` tới `PLN-54` |
