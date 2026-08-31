# TASK: hrp-v5-hotfix-02-public-jobs-required-relation

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-hotfix-02-public-jobs-required-relation` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `e0a70f7` |
| Modules | `M13 Marketplace public read` |
| ADR references | `go-live-04 DEC-01/DEC-02/DEC-08 (with-public-db); hotfix-01 DEC-01 bị bác bỏ tại đây` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `verify-task rồi /code rồi /audit rồi /resolve` |
| Updated | `2026-08-31 13:55 +07` |

## 1. Outcome

### User-visible outcome

`GET /api/jobs` và `GET /api/jobs/{slug}` trả 200 trên production. Trang `/` hiện danh sách việc làm thay vì hộp lỗi. Điều kiện thành công KHÔNG phải "test xanh" mà là "production trả 200", đo bằng phép đo trực tiếp sau deploy.

Đây là hotfix P0 thứ hai cho cùng một bề mặt. Hotfix-01 sửa đúng một lớp (deref không guard trong `toDto`) nhưng KHÔNG khôi phục dịch vụ, vì exception thật xảy ra SỚM HƠN một tầng: query engine của Prisma từ chối trả kết quả trước khi bất kỳ dòng JavaScript nào của ta chạy.

### Non-goals

- Không cấp quyền RLS hay `GRANT` cho principal công khai trên `client_companies`.
- Không viết migration. Task này có ZERO câu lệnh SQL.
- Không đổi `prisma/schema.prisma`. Đổi quan hệ thành optional đòi cột `client_company_id` nullable, tức migration trên bảng lõi, và nói sai sự thật dữ liệu (dòng CÓ tồn tại, chỉ bị che).
- Không denormalize `industry` xuống `outsourcing_projects`.
- Không đổi hợp đồng JSON của `/api/jobs`: mọi tên field và kiểu của `PublicJobDto` giữ nguyên, kể cả `industry: string`.
- Không thêm `try/catch` vào route hay `withPublicDb`. Che exception là tái lập chế độ hỏng-thành-im-lặng mà go-live-04 vừa xoá.
- Không sửa UI, không chạm `app/(portal)/page.tsx`.
- Không revert `d4928af` hay `e0a70f7`.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `vercel logs` trên deployment production `Ready` 14 phút tuổi, chạy 13:39 tới 13:42 ngày 31/08, kèm 8 bản ghi trùng khít | `Error [PrismaClientUnknownRequestError]: Invalid prisma.project.findMany() invocation: Inconsistent query result: Field clientCompany is required to return data, got null instead. clientVersion 5.22.0` tại `.next/server/app/api/jobs/route.js` | Nguyên nhân THẬT của 500. Đây là invariant của query engine, không phải `TypeError` của JavaScript. Mọi optional-chaining trong `toDto` đều vô hiệu vì `findMany` throw trước khi `toDto` được gọi |
| `EV-02` | `vercel ls` | Deployment production trẻ nhất `Ready`, 14 phút tuổi, build 1m, khớp thời điểm push `e0a70f7` | Loại trừ giả thuyết "deploy chưa kịp". Hotfix-01 ĐÃ chạy trên production và dịch vụ VẪN 500 |
| `EV-03` | Đo live 31/08 13:43 | `/api/jobs` = 500 `Content-Length: 0` `X-Vercel-Cache: MISS`; `/api/jobs?limit=1` = 500; `/api/jobs/DA-DEMO-001` = 500 | Cả hai endpoint công khai vẫn chết sau hotfix-01. Không phải cache |
| `EV-04` | `prisma/schema.prisma:348` và `:365` | `clientCompanyId String @map("client_company_id")` NOT NULL, `clientCompany ClientCompany @relation(...)` KHÔNG dấu hỏi | Quan hệ BẮT BUỘC ở mức schema. Prisma bắt buộc phải tìm được dòng liên quan cho MỌI dòng trả về; không tìm được thì throw, không trả null |
| `EV-05` | `src/domains/job-board/public.service.ts:145` | `publicSelect` chứa `clientCompany: { select: { industry: true } }` | Đúng một dòng này là thứ kéo bảng bị che vào truy vấn. Bỏ nó là bỏ toàn bộ lớp lỗi |
| `EV-06` | `src/domains/job-board/public.service.ts:198` và `:211` | `listPublicJobProjection` và `getPublicJobProjection` dùng CÙNG `publicSelect` | Sửa `publicSelect` sửa cả hai endpoint bằng một chỗ |
| `EV-07` | `src/domains/job-board/mp1.contract.test.ts` sau hotfix-01 | Hai case mới mock `tx.project.findMany` bằng `vi.fn().mockResolvedValue([...])` | Lý do 1418 test xanh mà production sập: mock KHÔNG BAO GIỜ tái lập được invariant của query engine. Bằng chứng RED bằng mock là bằng chứng rỗng cho lớp lỗi này |
| `EV-08` | `src/shared/security/rate-limit-guard.ts:103-140` | `enforceRateLimits` bọc mọi lỗi provider thành 503, comment dòng 101 ghi "KHÔNG throw" | Loại trừ limiter/Upstash khỏi danh sách nghi vấn 500 |
| `EV-09` | `vercel.json` `buildCommand` | `node scripts/copy-static.mjs && npx prisma generate && next build` | Deploy KHÔNG chạy migration. Push không đổi trạng thái DB, nên fix bắt buộc phải là fix mã nguồn |
| `EV-10` | `src/domains/job-board/public.service.ts:73-80` | `inferIndustry(text, fallback)` trả nhánh keyword rồi `fallback?.trim() || 'Công nghiệp chế tạo'` | Truyền `null` là đường đã tồn tại và đã có test xanh của hotfix-01 khẳng định kết quả `Công nghiệp chế tạo` |
| `EV-11` | `vercel` và `neon` đều có trên PATH, `vercel whoami` exit 0, `vercel ls` và `vercel logs` chạy được read-only | Đọc log runtime production KHÔNG cần credential mới và không nối DB | Phép đo live và phép đo log là khả thi cho cả Tier 2 và Tier 3. `ENV_BLOCKED` KHÔNG phải kết cục hợp lệ cho bất kỳ tiêu chí nào của task này |

### Baseline đã khoá

`e0a70f7` trên `main`, đã push, đã deploy, đang 500. Task này tiến lên từ đó, không revert.

## 3. Decisions

| ID | Decision | Rationale | Bound cho Tier 2 |
|---|---|---|---|
| `DEC-01` | Bỏ hoàn toàn `clientCompany` khỏi `publicSelect`. Không select bất kỳ quan hệ nào trên bảng mà principal công khai không đọc được | Đây là điểm duy nhất kéo bảng bị che vào truy vấn. Bỏ nó thì engine không còn gì phải materialize, nên không còn invariant để vi phạm | Sau sửa, `publicSelect` chỉ còn scalar của `Project` cộng nhánh `staffingOrders`. Không thêm quan hệ mới |
| `DEC-02` | Bác bỏ `DEC-01` của hotfix-01 | Câu đó ghi "KHÔNG bỏ join khỏi publicSelect" và chính nó giữ dịch vụ chết. Nó dựa trên giả định sai rằng lỗi là `TypeError` của JavaScript | Tier 2 không cần bảo lưu quyết định cũ. Quyết định tại đây thắng |
| `DEC-03` | `industry` lấy từ `inferIndustry(searchableText, null)` | Nhánh keyword vẫn chạy trên `name`, `code`, `siteAddress` và text của staffing order. Không có keyword thì rơi về `Công nghiệp chế tạo`, đúng chuỗi mà test hotfix-01 đã khẳng định | Không truyền `undefined`, không truyền chuỗi rỗng, truyền đúng `null` |
| `DEC-04` | Kiểu tham số của `toDto` bỏ hẳn field `clientCompany` thay vì để nullable | Field không còn tồn tại trong kết quả truy vấn. Giữ kiểu nullable là mô tả sai dữ liệu và mời một deref khác quay lại | Xoá cả ba dòng comment giải thích nullable ở vị trí đó vì chúng nói về một thế giới không còn |
| `DEC-05` | Hợp đồng JSON không đổi: `industry` vẫn là `string` bắt buộc | Client và test hợp đồng đang dựa vào nó. Đổi thành nullable là breaking change ngoài phạm vi hotfix | Không đổi `PublicJobDto`. Không thêm field mới |
| `DEC-06` | Bằng chứng RED của task này KHÔNG được dùng mock cho `findMany` | `EV-07`: mock không tái lập được invariant engine. Một test mock xanh là bằng chứng rỗng cho đúng lớp lỗi này | RED phải là một trong hai dạng ở `STEP-03`: test tĩnh đọc chính mã nguồn, hoặc phép đo live trên production |
| `DEC-07` | Tiêu chí đóng task là phép đo LIVE sau deploy, không phải gate tĩnh | Bài học đắt của hotfix-01: 1418 test xanh cộng `tsc` exit 0 tồn tại song song với 500 cứng trên production | `AC-08` tới `AC-10` là bắt buộc, không được ghi `ENV_BLOCKED`, không được thay bằng suy luận |
| `DEC-08` | Rò rỉ danh tính khách hàng cuối là lý do độc lập để bỏ join | Kể cả nếu RLS mở, phơi `client_companies` cho khách vô danh là lộ thông tin thương mại. Bỏ join là đúng cả về bảo mật, không chỉ về sửa lỗi | Không mở đường vòng nào để lấy `industry` thật từ bảng khách hàng trong task này |
| `DEC-09` | Nhãn `industry` hiển thị có thể sai nội dung so với ngành thật của khách hàng, và ta chấp nhận trong hotfix | `LIM-03` của hotfix-01 đã ghi nhận. Ưu tiên P0 là dịch vụ sống lại | Ghi vào `HANDOFF.md` như limitation, không tự mở scope để sửa nhãn |

## 4. Contract

### Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `publicSelect` tại `src/domains/job-board/public.service.ts` không còn khoá `clientCompany`, và không select bất kỳ quan hệ nào ngoài `staffingOrders` cùng nhánh `slots` bên trong nó |
| `RQ-02` | Kiểu tham số của `toDto` không còn field `clientCompany`. `industry` được tính bằng `inferIndustry(searchableText, null)` |
| `RQ-03` | Có một test TĨNH đọc chính nội dung `src/domains/job-board/public.service.ts` và fail nếu chuỗi khoá quan hệ `clientCompany` xuất hiện trong khối `publicSelect`. Test này là hàng rào chống hồi quy, không dùng mock Prisma |
| `RQ-04` | Hai case của hotfix-01 trong `src/domains/job-board/mp1.contract.test.ts` được cập nhật theo kiểu mới mà KHÔNG hạ thấp assertion: vẫn khẳng định `typeof industry` là `string` và giá trị fallback là `Công nghiệp chế tạo` |
| `RQ-05` | Không có file `.sql`, không có thư mục dưới `prisma/migrations/`, không có `GRANT`, `REVOKE`, `CREATE POLICY`, `ALTER TABLE`, `set_config` mới trong diff |
| `RQ-06` | Không thêm `try`, `catch` hay `.catch(` vào `app/api/jobs/route.ts`, `app/api/jobs/[slug]/route.ts`, `src/shared/auth/with-public-db.ts` và `src/domains/job-board/public.service.ts` |
| `RQ-07` | Sau khi push và deploy xong, `GET /api/jobs` trên production trả HTTP 200 với body JSON có `total` kiểu số |
| `RQ-08` | Sau khi push và deploy xong, `GET /api/jobs/{slug}` trên production trả 200 hoặc 404 theo dữ liệu thật, KHÔNG trả 500 |
| `RQ-09` | Log runtime của deployment production mới, đọc bằng `vercel logs`, có ZERO lần xuất hiện chuỗi `Inconsistent query result` kể từ mốc thời gian deployment đó `Ready` |
| `RQ-10` | Diff chỉ gồm `src/domains/job-board/public.service.ts`, `src/domains/job-board/mp1.contract.test.ts` và tối đa một file test tĩnh mới dưới `src/domains/job-board/` |

### Interface và data

- Không đổi route, method, query param, tên field, kiểu field.
- Không đổi schema, không đổi RLS, không đổi role, không chạm DB.
- Không đổi `PublicJobDto`.
- Không đổi `withPublicDb` và principal `MKT`.

### Traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-03 | AC-03 |
| RQ-04 | STEP-04 | AC-04 |
| RQ-05 | STEP-05 | AC-05 |
| RQ-06 | STEP-05 | AC-06 |
| RQ-07 | STEP-07 | AC-08 |
| RQ-08 | STEP-07 | AC-09 |
| RQ-09 | STEP-08 | AC-10 |
| RQ-10 | STEP-06 | AC-07 |

## 5. Execution Plan

| ID | Step | Chi tiết bắt buộc |
|---|---|---|
| `STEP-01` | Bỏ quan hệ khỏi `publicSelect` | Xoá đúng khoá `clientCompany: { select: { industry: true } }` ở khoảng dòng 145. Không đụng các khoá scalar, không đụng nhánh `staffingOrders` |
| `STEP-02` | Sửa kiểu và điểm gọi `inferIndustry` | Xoá field `clientCompany` khỏi kiểu tham số của `toDto` ở khoảng dòng 94 cùng ba dòng comment nullable đi kèm. Đổi điểm gọi ở khoảng dòng 131 thành `inferIndustry(searchableText, null)` |
| `STEP-03` | Viết test tĩnh và chụp RED trước GREEN | Test đọc file nguồn bằng `readFileSync`, cắt lấy khối `publicSelect`, assert không chứa `clientCompany`. Chạy test này TRƯỚC `STEP-01` để có RED thật với `LASTEXITCODE` khác 0, dán nguyên văn output vào `HANDOFF.md`, rồi mới làm `STEP-01` và `STEP-02` để có GREEN. Nếu đã sửa code rồi mới viết test thì phải `git stash` phần sửa để tái lập RED, và nói rõ trong `HANDOFF.md` là đã tái lập |
| `STEP-04` | Cập nhật hai case hotfix-01 | Bỏ field `clientCompany` khỏi fixture của hai case đó cho khớp kiểu mới. Giữ nguyên hai assertion về `typeof` và về `Công nghiệp chế tạo`. Không xoá case, không đổi tên case, không nới assertion |
| `STEP-05` | Gate tĩnh và gate cấm | `npm run typecheck` và `npm run test:unit` phải exit 0, đo bằng `$LASTEXITCODE` không qua pipe. Chạy grep trên diff cho `CREATE POLICY`, `GRANT`, `REVOKE`, `ALTER TABLE`, `set_config` và grep `try`, `catch`, `.catch(` trên bốn file ở `RQ-06`, ghi số đếm |
| `STEP-06` | Kiểm phạm vi diff | `git status --short` và `git diff --stat`. Không stage bất kỳ path ngoài `src/domains/job-board/`. Cấm `git add -A` và `git add .`. Các file bẩn khác trong worktree là của luồng khác, không chạm |
| `STEP-07` | Đề nghị deploy rồi đo live | Tier 2 KHÔNG tự push. Bàn giao `HANDOFF.md` ở trạng thái `READY_FOR_AUDIT` kèm đúng một dòng đề nghị Owner cho phép push. Sau khi Owner cho phép và deployment mới `Ready`, đo `/api/jobs` và `/api/jobs/{slug}` bằng lệnh HTTP thật, dán status code và body cắt ngắn vào `HANDOFF.md` |
| `STEP-08` | Đọc log runtime sau deploy | `vercel ls` để lấy URL deployment production trẻ nhất `Ready`, rồi `vercel logs` trên URL đó trong lúc gọi lại `/api/jobs`. Đếm số lần xuất hiện `Inconsistent query result`. Trước khi dán bất cứ output nào vào `HANDOFF.md` phải lọc bỏ chuỗi khớp `postgres://`, `token`, `password`, `secret` |
| `STEP-09` | Chốt limitation | Ghi vào `HANDOFF.md`: nhãn `industry` giờ là suy luận từ text chứ không phải ngành thật của khách hàng; ba migration đang chờ trong repo không được task này áp; và test tĩnh chỉ bảo vệ đúng file `public.service.ts` chứ không phát hiện quan hệ bắt buộc ở các service khác |

### Stop conditions

Tier 2 DỪNG và ghi vào `HANDOFF.md`, không sửa mò tiếp, khi gặp bất kỳ điều sau:

- Sau deploy mà `/api/jobs` vẫn 500. Khi đó `DEC-01` của task này sai và cần Tier 1 chẩn đoán lại, không phải Tier 2 thử tiếp giả thuyết.
- Cần đổi `prisma/schema.prisma`, cần migration, cần `GRANT` hay cần đổi RLS để đạt bất kỳ AC nào.
- Log sau deploy xuất hiện một exception KHÁC `Inconsistent query result` trên cùng đường đọc.
- `npm run test:unit` fail ở một test không thuộc `src/domains/job-board/`.

## 6. Acceptance

| AC | Phép đo độc lập | Ngưỡng PASS |
|---|---|---|
| `AC-01` | Grep `clientCompany` trong `src/domains/job-board/public.service.ts` | Đếm bằng 0 trên toàn file |
| `AC-02` | Grep `inferIndustry(searchableText` trong cùng file | Đúng một dòng và đối số thứ hai là literal `null` |
| `AC-03` | Chạy riêng file test tĩnh mới; rồi tái lập RED bằng cách thêm lại khoá quan hệ vào một bản copy tạm hoặc `git stash` chiều ngược | Bản có quan hệ cho `LASTEXITCODE` khác 0 kèm tên test fail; bản đã sửa cho exit 0. Cả hai output có trong `HANDOFF.md` nguyên văn, không phải lời kể |
| `AC-04` | Chạy `src/domains/job-board/mp1.contract.test.ts` | Exit 0, và grep trong file đó thấy còn nguyên chuỗi `Công nghiệp chế tạo` cùng assertion `typeof` |
| `AC-05` | Trên diff so với `e0a70f7`: grep `CREATE POLICY`, `GRANT`, `REVOKE`, `ALTER TABLE`, `set_config`; và liệt kê file dưới `prisma/` | Mỗi grep đếm 0. Không file nào dưới `prisma/` bị thêm hay sửa |
| `AC-06` | Grep `try`, `catch`, `.catch(` trên bốn file ở `RQ-06`, so với baseline | Số đếm không tăng so với `e0a70f7` |
| `AC-07` | `git diff --stat` so với `e0a70f7` | Chỉ file dưới `src/domains/job-board/`, tối đa 3 file |
| `AC-08` | Gọi HTTP thật tới `https://www.hrpartner.vn/api/jobs` sau khi deployment mới `Ready` | HTTP 200, body là JSON parse được, `total` kiểu số. Không chấp nhận 500, không chấp nhận body rỗng |
| `AC-09` | Gọi HTTP thật tới `https://www.hrpartner.vn/api/jobs/DA-DEMO-001` | Status thuộc tập 200 hoặc 404. 500 là FAIL |
| `AC-10` | `vercel logs` trên deployment production trẻ nhất `Ready`, sampled trong lúc gọi lại `/api/jobs` | ZERO dòng chứa `Inconsistent query result`. Output đã lọc secret trước khi dán |
| `AC-11` | `npm run typecheck` rồi `npm run test:unit`, đo `$LASTEXITCODE`, không pipe | Cả hai exit 0. Số test không giảm so với 1418 của baseline |
| `AC-12` | `git log origin/main..HEAD` tại thời điểm bàn giao `HANDOFF.md` | Rỗng. Tier 2 không tự push; quyền deploy thuộc Owner |

### Quy tắc bằng chứng

- Mọi AC phải có lệnh, exit code và output. Lời kể không tính.
- `ENV_BLOCKED` KHÔNG hợp lệ cho bất kỳ AC nào của task này. `AC-08` tới `AC-10` chỉ cần HTTP công khai và `vercel` read-only, cả hai đã chứng minh chạy được ở `EV-11`.
- Mock `findMany` không được dùng làm bằng chứng cho `AC-03`.
- Nếu `AC-08` FAIL thì task FAIL, dù mọi AC tĩnh đều PASS.

## 7. Risk

| ID | Risk | Mức | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | Bỏ join làm `industry` sai nội dung với một số dự án | Trung bình | Đã chấp nhận ở `DEC-09`. Nhãn vẫn là chuỗi hợp lệ nên UI không vỡ. Sửa nhãn thuộc task nghiệp vụ khác |
| `RISK-02` | Còn service khác cũng select quan hệ bắt buộc trên bảng bị RLS che, và sẽ sập tương tự ở bề mặt khác | Cao | Không mở rộng scope trong hotfix. `STEP-09` bắt ghi thành limitation để Tier 1 mở task quét toàn bộ. Test tĩnh của `RQ-03` chỉ bảo vệ một file |
| `RISK-03` | Test tĩnh dựa trên chuỗi nên dễ bị lách bằng cách đổi cách viết | Thấp | Chấp nhận. Hàng rào rẻ vẫn hơn không có, và `AC-08` mới là phép đo thật |
| `RISK-04` | Deploy để đo `AC-08` là hành động production, vượt quyền task theo `UNIFIED_PLAN` mục 9.1 | Cao | `STEP-07` cấm Tier 2 tự push. Owner là người cho phép. `AC-12` đo rằng Tier 2 đã không tự push |
| `RISK-05` | Ba migration đang chờ trong repo chưa rõ đã áp lên `hrp-live` hay chưa | Trung bình | Ngoài phạm vi. Task này không gọi hàm DB mới nào nên không phụ thuộc trạng thái đó |
| `RISK-06` | Sau fix, endpoint trả 200 nhưng `total` bằng 0 vì lý do RLS khác | Trung bình | `AC-08` chỉ đòi 200 và `total` kiểu số, không đòi lớn hơn 0. Nếu `total` bằng 0 thì đó là defect đọc dữ liệu riêng, ghi vào `HANDOFF.md` để Tier 1 mở task, không sửa trong hotfix này |

### Rollback

- Mức 1: `git checkout e0a70f7 -- src/domains/job-board/public.service.ts src/domains/job-board/mp1.contract.test.ts` rồi xoá file test tĩnh mới. Trả về đúng trạng thái hiện tại, tức vẫn 500.
- Mức 2: nếu đã push và production xấu hơn, revert đúng commit của task này bằng `git revert` rồi push, không `reset --hard` trên `main`.
- Không có rollback DB vì task không chạm DB.

## 8. Open Questions

Không còn câu hỏi mở làm đổi implementation. Hai điểm dưới đây là quyết định của Owner về vận hành, không chặn Tier 2 bắt đầu code:

| ID | Câu hỏi | Owner | Ảnh hưởng |
|---|---|---|---|
| `Q-01` | Cho phép push commit của task này để deploy và đo `AC-08` tới `AC-10` vào lúc nào | Sếp | Không chặn `STEP-01` tới `STEP-06`. Chỉ chặn ba AC live |
| `Q-02` | Có mở task riêng để quét mọi service khác đang select quan hệ bắt buộc trên bảng bị RLS che hay không | Sếp | Không ảnh hưởng task này. Là follow-up của `RISK-02` |

## 9. Planner Resolution

Chưa có. Mục này append-only, Tier 1 ghi sau khi đọc `AUDIT.md`.

Ghi nhận trước cho minh bạch trách nhiệm: `DEC-01` của `hrp-v5-hotfix-01-public-jobs-500` là quyết định của Tier 1 và nó SAI. Nó cấm bỏ join, dựa trên giả định rằng exception là `TypeError` của JavaScript trong `toDto`. Log production ở `EV-01` chứng minh exception nằm trong query engine của Prisma, trước `toDto`. `DEC-05` của task đó viết rằng nếu sau fix mà `/api/jobs` còn 500 thì giả định SAI; phép đo ở `EV-03` đã trả kết quả đó. Tier 2 và Tier 3 của hotfix-01 làm đúng contract được giao; contract mới là chỗ hỏng.

## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| `v1.0` | 2026-08-31 | Tạo contract từ log runtime production. Bác bỏ `DEC-01` của hotfix-01. Chốt phương án bỏ quan hệ khỏi `publicSelect`, cấm mock làm bằng chứng RED, và đưa ba tiêu chí LIVE sau deploy thành điều kiện đóng task |
