# TASK: hrp-v5-go-live-17-rls-required-relation-sweep

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-17-rls-required-relation-sweep` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `80f6933` |
| Modules | `src/shared/security/required-relation-sweep.static.test.ts`, `app/api/projects/route.ts`, `app/api/vendor/orders/route.ts`, `app/api/vendor/submissions/route.ts`, `src/domains/applications/application-queue.service.ts`, `src/domains/reconciliation/margin.service.ts`, `src/domains/reconciliation/statement.service.ts`, `src/domains/staffing/order.service.ts`, `src/domains/staffing/submission.service.ts` |
| ADR references | `hrp-v5-hotfix-02-public-detail-required-relation` `F-05` — câu hỏi mở mà task này đóng; `hrp-v5-hotfix-01` — sự cố `500` gốc; `hrp-v5-go-live-08-public-ui-premium` — nguồn của bài học "hàng rào chỉ liệt kê cái tác giả vừa thêm" |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/code` giao GỘP một lượt cùng 18 và test-01 theo quyết định `03/09` của Owner, và task này chạy SAU 18, TRƯỚC test-01 trong lô. Không phụ thuộc DB, không cần Owner quyết gì |
| Updated | `2026-09-03 22:35 Asia/Bangkok` |

Task này đóng `F-05` của `hrp-v5-hotfix-02-public-detail-required-relation`. `F-05` viết là *"quét mọi service khác đang select quan hệ KHÔNG nullable trên bảng bị RLS che"*. Phạm vi thật của phép quét đó đã được đo, không phải phỏng đoán: **34** bảng bật RLS, **21** trường quan hệ bắt buộc trên **20** model trỏ vào các bảng ấy, và **12** vị trí gọi thật trong **8** tệp nguồn. Số liệu ở `EV-01` tới `EV-03`.

Điều quan trọng hơn con số: `F-05` KHÔNG phải một lượt sửa hàng loạt. Mười hai vị trí ấy phần lớn có thể là **an toàn theo policy**, và bản sửa mù sẽ vừa vô ích vừa làm hỏng dữ liệu đang in đúng. `DEC-03` định nghĩa một phép phân loại TĨNH, chạy được mà không cần một kết nối DB nào, cho câu trả lời dứt khoát cho từng vị trí trong mười hai vị trí đó.

## 1. Outcome

### User-visible outcome

1. Không trang nội bộ nào còn trả `500` cứng vì lớp lỗi quan hệ bắt buộc dưới RLS. Mỗi vị trí trong mười hai vị trí đã đo được phân loại có bằng chứng, và chỉ những vị trí mà policy của bảng cha THẬT SỰ có thể từ chối thì mới bị sửa.
2. Một hàng rào tĩnh mới **tự suy ra tập nguy hiểm** từ `prisma/schema.prisma` cộng `prisma/migrations/**` ngay lúc chạy test, rồi quét TOÀN BỘ cây nguồn. Thêm một bảng RLS mới, hoặc thêm một vị trí select quan hệ bắt buộc mới ở bất kỳ tệp nào, đều làm test ĐỎ mà không ai phải nhớ cập nhật một danh sách tay.
3. Người vận hành đọc được, trong `HANDOFF.md`, một bảng mười hai dòng nói rõ vị trí nào an toàn vì sao, vị trí nào đã sửa và sửa bằng cách gì.

### Non-goals

- Không thay, không xoá, không viết lại `src/domains/job-board/public-select.static.test.ts`. Tệp đó vừa canh lớp lỗi này cho bề mặt công khai, vừa mang các assertion của `go-live-14` về nhãn ngành. Lý do ở `EV-05`.
- Không đổi `prisma/schema.prisma`. Không biến một quan hệ bắt buộc thành nullable: đó là một migration ngầm và nó đổi hình dạng của mọi DTO đang đúng.
- Không viết migration, không chạy migration. Trần migration đang đóng.
- Không chứng minh trên DB thật. Lane integration chưa từng chạy được, lý do ở `EV-09`. Mọi phép đo của task này là TĨNH và không đọc `DATABASE_URL` nào.
- Không chạm bề mặt công khai, không chạm `app/globals.css`, không chạm sáu tệp thuộc phạm vi contract 16.
- Không tối ưu truy vấn, không gộp query, không đổi hình dạng response của bất kỳ API nào đang chạy.

## 2. Evidence và Baseline

Mọi con số dưới đây đo trên baseline ghi ở `0. Control`, bằng `git show`, không đo trên worktree. Bốn script đã dùng để đo nằm ở `scratch/f05/` và Tier 2 phải chạy lại chúng chứ không chép số.

| ID | Nguồn | Điều đã đo | Vì sao nó quyết định thiết kế |
|---|---|---|---|
| `EV-01` | `prisma/migrations/**/migration.sql`, quét bằng `scratch/f05/rls.py` | **34** bảng có `ENABLE ROW LEVEL SECURITY` hoặc `FORCE ROW LEVEL SECURITY`. Danh sách đầy đủ ở `scratch/f05/rls.json`, gồm `outsourcing_projects`, `client_companies`, `workers`, `staffing_orders`, `candidate_submissions`, `contracts`, `tickets`, `vendor_statements` | Tập bảng cha nguy hiểm phải được suy ra từ chính migration, không phải từ ký ức. Bật RLS ở đâu là dữ kiện của repo, và nó đổi mỗi lần có migration mới |
| `EV-02` | `prisma/schema.prisma` (1302 dòng), quét bằng `scratch/f05/scan.py` cộng `scratch/f05/cross.py` | **49** model, **36** model có quan hệ. Giao với `EV-01` được **21** trường quan hệ BẮT BUỘC trên **20** model trỏ vào một bảng bật RLS. Kết quả ở `scratch/f05/danger.json` | Đây là tập nguy hiểm ĐÚNG NGHĨA, và nó suy ra được bằng máy. Một hàng rào viết tay không bao giờ đuổi kịp nó |
| `EV-03` | 212 tệp nguồn không phải test, quét bằng `scratch/f05/usage.py` | **12** vị trí gọi trong **8** tệp thật sự select một trường trong tập `EV-02`. Danh sách ở `scratch/f05/hits.json` và ở bảng của `DEC-04` | Mười hai, không phải "mọi service". Con số này biến `F-05` từ một lượt quét mở thành một phạm vi đóng, đếm được, audit được |
| `EV-04` | `src/domains/job-board/public-select.static.test.ts:21` | Hàng rào hiện có ghim CỨNG đúng một tệp: `const SERVICE = 'src/domains/job-board/public.service.ts'`. Nó cũng ghim cứng đúng một tên trường và một allowlist năm khoá | Đây đúng lớp điểm mù của `TEXT_PAIRS` ở `go-live-08`: hàng rào liệt kê cái tác giả nó VỪA THÊM, không liệt kê cái nó BẢO VỆ. Nó xanh `100%` trong khi mười hai vị trí kia chưa từng được đo |
| `EV-05` | `src/domains/job-board/public-select.static.test.ts`, 72 dòng | Cùng tệp còn mang hai assertion của `go-live-14`: một assertion phủ định trên chuỗi `industry`, và một assertion khẳng định `classifyJobType` được gọi với hai tham số | Thay tệp này bằng hàng rào mới sẽ XOÁ hai assertion của một task đã ACCEPTED. Vì vậy hàng rào mới là một tệp THỨ HAI, và `AC-09` đo tệp cũ không đổi một byte |
| `EV-06` | `src/domains/job-board/public.service.ts:520` | Quy ước "cấm select quan hệ bắt buộc trên bảng bị RLS che" hiện chỉ tồn tại dưới dạng một dòng comment ở đúng một tệp | Một quy ước không có test là một quy ước đã chết ở tệp thứ hai. Đó là lý do `RQ-01` đòi một hàng rào chứ không đòi thêm comment |
| `EV-07` | `hrp-v5-hotfix-01`, ghi lại ở docblock của `public-select.static.test.ts` | Sự cố gốc chạy song song với `1418` test xanh. Query engine ném `Inconsistent query result` TRƯỚC khi mapper chạy, nên optional-chaining trong mapper vô hiệu, và `mockResolvedValue` trên `findMany` không bao giờ tái lập được | Đây là lý do hàng rào phải là TĨNH, đọc cây nguồn. Một test có mock ở ranh giới DB không nằm trong đường đo của lớp lỗi này |
| `EV-08` | `vitest.unit.config.ts` khoá `include` | Lane unit chỉ thu `src/**/*.test.ts`, `packages/**/*.test.ts`, `prisma/**/*.test.ts`. **`app/**` KHÔNG nằm trong lane** | Hàng rào phải nằm dưới `src/` để được lane thu, dù nó ĐỌC các tệp dưới `app/`. Đặt nó vào `app/` là viết một test không bao giờ chạy |
| `EV-09` | `vitest.unit.config.ts` khoá `env`, cộng dư nợ đã ghi của `hrp-v5-go-live-09-public-board-architecture` | Lane unit ép `DATABASE_URL` về một sentinel không tới được và **làm rỗng** `DATABASE_URL_TEST`. Lane integration chưa từng chạy vì thiếu credential | Một phép chứng minh trên ma trận RLS thật là KHÔNG có sẵn. Vì vậy phép phân loại của `DEC-03` phải đọc văn bản policy, và `AC` không được gọi tên một database nào |
| `EV-10` | `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql:133` | Policy `SELECT` của `client_companies` là một DANH SÁCH VAI TRÒ thuần: `hrp_session_role()` thuộc bảy vai `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `ACCOUNTANT`, `SALE`, `HR_STAFF`, `PM` | Đây là dạng policy thứ nhất trong hai dạng. Với dạng này, câu hỏi từ chối được trả lời bằng phép so hai tập vai trò, không cần chạy gì |
| `EV-11` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:33` và `:28` | Policy của `outsourcing_projects` là `USING (hrp_project_visible_for(id))`, của `workers` là `USING (hrp_worker_visible_for(id))` — vị từ phụ thuộc TỪNG DÒNG, không phải danh sách vai | Đây là dạng thứ hai. Một vai được phép vẫn có thể bị từ chối đúng dòng đó, nên câu hỏi phải hỏi tiếp: policy của bảng CON có suy ra policy của bảng CHA không |
| `EV-12` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:38` | Policy của `staffing_orders` là `USING (hrp_project_visible_for(project_id))` — tức tầm nhìn của bảng con ĐƯỢC SUY RA TỪ tầm nhìn của bảng cha | Đây là bằng chứng phép phân loại của `DEC-03` cho kết luận dứt khoát: ở cặp này, con thấy được suy ra cha thấy được, nên vị trí gọi là AN TOÀN và **không được sửa** |

## 3. Decisions và Assumptions

| ID | Quyết định | Lý do |
|---|---|---|
| `DEC-01` | Hàng rào mới là một tệp THỨ HAI, đặt ở `src/shared/security/required-relation-sweep.static.test.ts`. Tệp cũ `public-select.static.test.ts` giữ nguyên từng byte | `EV-05`: tệp cũ mang assertion của `go-live-14`. `EV-08`: tệp mới phải nằm dưới `src/` mới được lane unit thu. Đặt ở `src/shared/security/` vì lớp lỗi này là lỗi PHÂN QUYỀN, không phải lỗi của một domain |
| `DEC-02` | Hàng rào **tự suy** tập nguy hiểm lúc chạy: đọc `prisma/migrations/**/migration.sql` để lấy tập bảng RLS, đọc `prisma/schema.prisma` để lấy tập trường quan hệ bắt buộc trỏ vào các bảng ấy, rồi quét cây nguồn. CẤM ghim cứng danh sách 34 bảng hay 21 trường vào tệp test | Đây là điều chỉnh trực tiếp lỗi `EV-04`. Một hàng rào ghim danh sách tay sẽ mù với migration tiếp theo, và sự xanh của nó bị đọc thành sự an toàn của cả cây. Ba con số `34`, `21`, `12` là để ĐỐI CHIẾU trong `HANDOFF`, không phải để dán vào mã |
| `DEC-03` | Phép phân loại TĨNH cho từng vị trí, hai nhánh. Nhánh A — policy `SELECT` của bảng CHA là một danh sách vai trò thuần (`EV-10`): vị trí AN TOÀN nếu và chỉ nếu mọi vai trò tới được đường mã đó đều nằm trong danh sách; ngược lại là RỦI RO. Nhánh B — policy của bảng cha mang một vị từ theo dòng như `hrp_project_visible_for` hay `hrp_worker_visible_for` (`EV-11`): vị trí AN TOÀN nếu và chỉ nếu policy của bảng CON dùng CHÍNH vị từ ấy trên chính khoá ngoại ấy, tức con thấy được suy ra cha thấy được (`EV-12`); ngược lại là RỦI RO | Phép này trả lời dứt khoát, chạy được mà không cần DB (`EV-09`), và bằng chứng của nó là văn bản policy quote nguyên văn cộng số dòng. Nó cũng chặn đúng bản sửa mù: `EV-12` cho thấy có những vị trí mà sửa là làm hỏng |
| `DEC-04` | Mười hai vị trí phải phân loại là đúng mười hai dòng sau, không thêm không bớt: `app/api/projects/route.ts:65` (`clientCompany`), `app/api/vendor/orders/route.ts:44` (`project`), `app/api/vendor/submissions/route.ts:62` (`project`), `src/domains/applications/application-queue.service.ts:178` và `:211` (`project`), `src/domains/reconciliation/margin.service.ts:167` (`worker`), `src/domains/reconciliation/statement.service.ts:403` và `:434` (`worker`), `src/domains/staffing/order.service.ts:153` và `:179` (`project`), `src/domains/staffing/submission.service.ts:204` (`project`) và `:248` (`worker`) | Danh sách đóng, đếm được, audit được. Nếu phép quét của Tier 2 ra một con số khác `12` thì đó là một finding phải ghi vào `HANDOFF`, không phải một lý do im lặng |
| `DEC-05` | Vị trí phân loại RỦI RO được sửa theo ĐÚNG mẫu của `hotfix-02`: bỏ nhánh select quan hệ, thay bằng khoá ngoại vô hướng cộng một truy vấn thứ hai tra tên, và mapper coi sự vắng mặt của tên là hợp lệ. CẤM biến quan hệ thành nullable trong `schema.prisma`. CẤM bọc `try/catch` quanh truy vấn để nuốt lỗi | Đây là mẫu đã được kiểm chứng trên bề mặt công khai. Nuốt lỗi bằng `try/catch` biến một `500` ồn ào thành một trang thiếu dữ liệu im lặng, tệ hơn cho người vận hành |
| `DEC-06` | Nếu phép phân loại cho ra **không** vị trí RỦI RO nào, đó là một kết cục HỢP LỆ và task vẫn PASS, miễn cả mười hai dòng có bằng chứng policy thật. Trong trường hợp đó bảy tệp mã ứng dụng không đổi một byte và bản giao chỉ gồm tệp hàng rào cộng artifact | Ngược lại là bẫy "contract buộc verdict sai": một `AC` đòi "phải có ít nhất một tệp được sửa" sẽ ép Tier 2 sửa một chỗ không cần sửa để cho `AC` xanh |
| `DEC-07` | Hàng rào mang một FIXTURE ÂM: một chuỗi nguồn giả, dựng trong chính test, chứa đúng một vị trí select quan hệ bắt buộc trên bảng RLS, và test khẳng định detector BẮT được nó | Không có fixture âm thì một detector luôn trả rỗng cũng xanh. Đây là cùng một bài học với `UI_PAIRS` của `go-live-08`: xanh không có nghĩa là đang đo thứ thật |
| `DEC-08` | Hàng rào bỏ comment trước khi kết luận, theo đúng cách tệp cũ làm ở `src/domains/job-board/public-select.static.test.ts:23` | Một ví dụ nằm trong docblock không được biến thành một finding, và một vị trí thật nằm sau `//` không được biến thành an toàn |
| `DEC-09` | Tệp `scratch/f05/*` là công cụ đo của Tier 1, KHÔNG phải mã sản phẩm. Tier 2 chạy lại chúng để đối chiếu ba con số, nhưng logic quét của hàng rào phải viết mới bằng TypeScript trong tệp test, không import từ `scratch/` | `scratch/` không nằm trong lane, không được typecheck, và không phải nơi giữ hàng rào lâu dài |

## 4. Contract

### 4.1 Requirements

| ID | Yêu cầu | Mức | Nguồn | Dấu hiệu FAIL |
|---|---|---|---|---|
| `RQ-01` | Tạo `src/shared/security/required-relation-sweep.static.test.ts`. Nó đọc `prisma/migrations` bằng filesystem, suy ra tập bảng bật RLS, và assert tập đó có ít nhất `34` phần tử | Must | `EV-01`, `DEC-02` | Tệp không tồn tại, hoặc danh sách bảng được ghim cứng thành một mảng literal trong test |
| `RQ-02` | Cùng tệp đọc `prisma/schema.prisma`, suy ra mọi trường quan hệ BẮT BUỘC (không có dấu hỏi) trỏ vào một bảng thuộc tập `RQ-01`, và assert tập đó có ít nhất `21` phần tử | Must | `EV-02`, `DEC-02` | Danh sách trường được ghim cứng, hoặc phép suy chỉ đọc một model |
| `RQ-03` | Cùng tệp quét TOÀN BỘ tệp nguồn `.ts` và `.tsx` dưới `src/` và `app/`, trừ tệp test, tìm mọi vị trí select một trường thuộc tập `RQ-02`, và assert tập vị trí tìm được KHỚP CHÍNH XÁC danh sách mười hai dòng của `DEC-04` | Must | `EV-03`, `DEC-04` | Phép quét chỉ đọc một tệp; hoặc kết quả khác `12` mà test vẫn xanh; hoặc `app/` bị bỏ khỏi phép quét |
| `RQ-04` | Cùng tệp mang một fixture ÂM theo `DEC-07`: một chuỗi nguồn giả dựng trong test, và một assertion rằng detector bắt được nó | Must | `DEC-07` | Không có fixture âm, tức một detector luôn trả rỗng cũng xanh |
| `RQ-05` | Cùng tệp bỏ comment trước khi kết luận, theo cách của `src/domains/job-board/public-select.static.test.ts:23` | Must | `DEC-08` | Một vị trí nằm trong docblock bị đếm là finding, hoặc một vị trí nằm sau hai gạch chéo bị đếm là an toàn |
| `RQ-06` | Phân loại cả mười hai vị trí của `DEC-04` theo phép của `DEC-03`. Với MỖI dòng, ghi vào `HANDOFF.md`: đường dẫn và số dòng, tên trường, bảng cha, bảng con, nhánh A hay B, policy của bảng cha quote NGUYÊN VĂN kèm tệp migration và số dòng, policy của bảng con quote nguyên văn khi ở nhánh B, và kết luận AN TOÀN hay RỦI RO | Must | `DEC-03`, `EV-10`, `EV-11`, `EV-12` | Bảng thiếu dòng; hoặc một dòng kết luận mà không quote policy; hoặc policy được diễn giải chứ không quote; hoặc kết luận dựa trên phỏng đoán về vai trò mà không chỉ ra nơi vai trò ấy được chặn trong mã |
| `RQ-07` | Sửa ĐÚNG những vị trí phân loại RỦI RO, theo mẫu của `DEC-05`. Không sửa vị trí phân loại AN TOÀN | Must | `DEC-05`, `DEC-06` | Sửa một vị trí đã kết luận AN TOÀN; hoặc để sót một vị trí đã kết luận RỦI RO; hoặc sửa bằng cách đổi `schema.prisma`; hoặc sửa bằng `try/catch` nuốt lỗi |
| `RQ-08` | `src/domains/job-board/public-select.static.test.ts` không đổi một byte | Must | `EV-05`, `DEC-01` | Tệp đó xuất hiện trong danh sách thay đổi dưới bất kỳ hình thức nào |
| `RQ-09` | Lane `npm run test:unit` và `npm run typecheck` đều exit `0` sau bản sửa. Số test PASS không nhỏ hơn mốc baseline mà `STEP-01` ghi | Must | `EV-07` | Một trong hai lane exit khác `0`; hoặc số test PASS tụt so với mốc mà `HANDOFF` không giải thích từng dòng đỏ là hồi quy hay là test cũ chưa đảo |

### 4.2 Scope boundaries

Được chạm, và chỉ bốn nhóm sau:

1. Tệp hàng rào mới: `src/shared/security/required-relation-sweep.static.test.ts`.
2. Tối đa tám tệp mã ứng dụng liệt kê ở `Modules`, và CHỈ những tệp có vị trí phân loại RỦI RO.
3. Artifact của chính task: `docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/HANDOFF.md` cộng mọi tệp dưới `docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/evidence/`.
4. Path đã khai ở `Modules` hoặc ở mục phạm vi của hai contract CÙNG LÔ: `hrp-v5-go-live-18-public-surface-hardening` và `hrp-v5-test-01-browser-lane`. Nhóm này CÓ MẶT trong cây làm việc vì Owner giao ba contract trong MỘT lượt theo quyết định `03/09`, nhưng nó KHÔNG thuộc bản giao của task này: Tier 2 không được sửa chúng khi đang làm task này, và `HANDOFF.md` của task này không được kể chúng là công của mình.

Cấm chạm: `prisma/schema.prisma`, mọi tệp dưới `prisma/migrations/`, `src/domains/job-board/public-select.static.test.ts`, `app/globals.css`, sáu tệp thuộc phạm vi contract 16, mọi tệp cấu hình vitest, và mọi test khác ngoài tệp hàng rào mới cùng những tệp test đã khai ở `Modules` của hai contract cùng lô. Xuất hiện một path ngoài bốn nhóm trên là FAIL. `package.json` cộng `package-lock.json` thuộc quyền của `hrp-v5-test-01-browser-lane` trong cùng lô: task này vẫn KHÔNG được sửa hai tệp đó, nhưng sự có mặt của chúng trong cây làm việc KHÔNG phải defect của task này.

### 4.3 Data, State, Permission và Interface Rules

- **Không migration, không seed, không lệnh DDL.** Trần migration đang đóng và task này không xin mở.
- **Không kết nối DB.** Mọi phép đo là tĩnh. Nếu một bước nào của Tier 2 cần `DATABASE_URL` thì bước đó viết sai, không phải môi trường thiếu.
- **Không đổi hình dạng response công khai.** Nếu một vị trí RỦI RO nằm trên đường trả API, khoá của response giữ nguyên tên và nguyên kiểu; chỉ nguồn lấy giá trị đổi. Tên bị thiếu vì cha không đọc được thì trả `null`, không trả chuỗi rỗng, không bỏ khoá.
- **Không nới quyền.** Không thêm vai trò vào policy, không đổi cửa chặn `requireRole` của bất kỳ route nào. Nếu phép phân loại cho thấy một route đang mở cho một vai trò không nên có, đó là một finding ghi vào `HANDOFF`, KHÔNG phải một bản sửa của task này.
- **Bí mật:** không in connection string, token, password, PII thật vào log hay artifact. Bảng phân loại chỉ chứa tên bảng, tên trường, tên vai trò và văn bản policy.

## 5. Execution Plan

| ID | Việc | Ra cái gì |
|---|---|---|
| `STEP-01` | Chạy `pwsh -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/TASK.md`, rồi chạy `npm run test:unit` và `npm run typecheck` trên cây CHƯA sửa để ghi mốc | Ba output kèm mã thoát, dán vào đầu `HANDOFF.md`. Mốc số tệp test và số test PASS |
| `STEP-02` | Chạy lại bốn script `scratch/f05/rls.py`, `scratch/f05/scan.py`, `scratch/f05/cross.py`, `scratch/f05/usage.py` và đối chiếu ba con số với `EV-01` tới `EV-03` | Ba con số đo lại. Lệch với `34`, `21`, `12` thì ghi thành finding, không im lặng |
| `STEP-03` | Viết `src/shared/security/required-relation-sweep.static.test.ts` thoả `RQ-01` tới `RQ-05` | Tệp hàng rào, tự suy tập nguy hiểm, quét cả `src/` và `app/`, có fixture âm, bỏ comment trước khi kết luận |
| `STEP-04` | Chạy `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | Output kèm mã thoát. Hàng rào phải XANH trên cây chưa sửa, vì nó khẳng định tập vị trí bằng đúng mười hai dòng của `DEC-04` |
| `STEP-05` | Với mỗi dòng trong mười hai dòng của `DEC-04`, đọc policy của bảng cha và bảng con trong `prisma/migrations/`, áp phép của `DEC-03`, và ghi một dòng bảng đầy đủ theo `RQ-06` | Bảng mười hai dòng trong `HANDOFF.md`, cộng một tệp `evidence/` chứa lệnh grep và output policy nguyên văn |
| `STEP-06` | Sửa ĐÚNG những vị trí kết luận RỦI RO, theo mẫu của `DEC-05`. Nếu không có vị trí nào RỦI RO thì bước này không sửa gì và ghi rõ điều đó | Diff của tối đa tám tệp, hoặc một câu ghi rõ không tệp mã nào cần sửa cộng lý do trỏ vào bảng của `STEP-05` |
| `STEP-07` | Cập nhật hàng rào nếu `STEP-06` đã sửa: tập vị trí đúng phải giảm đúng bằng số vị trí đã sửa, và hàng rào khẳng định tập MỚI. Nếu `STEP-06` không sửa gì thì hàng rào không đổi | Hàng rào và cây nguồn nhất quán, không tệp nào đỏ |
| `STEP-08` | Kiểm `src/domains/job-board/public-select.static.test.ts` không đổi một byte | Output của `git status --porcelain` trên đúng đường dẫn đó, phải RỖNG |
| `STEP-09` | Chạy lại `npm run test:unit` và `npm run typecheck` | Hai output kèm mã thoát, cả hai `0`. So số test PASS với mốc của `STEP-01` |
| `STEP-10` | Kiểm phạm vi bằng `git status --porcelain` cộng `git diff --cached --numstat`, rồi ghi `HANDOFF.md` và `evidence/`, `git add` NGAY sau khi ghi. **KHÔNG commit, KHÔNG push, KHÔNG deploy** | Danh sách path đầy đủ, phân đúng bốn nhóm của `4.2`. `HANDOFF.md` với mọi lệnh, mã thoát và output thật |

## 6. Acceptance Criteria

| ID | Cách kiểm | Ngưỡng đạt |
|---|---|---|
| `AC-01` | `ls src/shared/security/required-relation-sweep.static.test.ts` cộng `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | Tệp tồn tại. Lane con exit `0` |
| `AC-02` | Đọc mã hàng rào: nó phải gọi một hàm đọc filesystem trên `prisma/migrations` và trên `prisma/schema.prisma`. Chạy `grep -c "outsourcing_projects" src/shared/security/required-relation-sweep.static.test.ts` và `grep -c "client_companies" src/shared/security/required-relation-sweep.static.test.ts` | Cả hai đường dẫn được đọc bằng filesystem trong mã. Mỗi tên bảng RLS xuất hiện dưới dạng chuỗi literal trong tệp test nhiều nhất `1` lần, và nếu có thì chỉ nằm trong fixture âm hoặc trong comment. Ghim cả danh sách bảng thành một mảng literal là FAIL |
| `AC-03` | Đọc output của `STEP-04`: assertion về số bảng RLS và số trường nguy hiểm | Tập bảng có ít nhất `34` phần tử. Tập trường quan hệ bắt buộc trỏ vào bảng RLS có ít nhất `21` phần tử. Cả hai đều do mã tự suy, không do literal |
| `AC-04` | Đọc output của `STEP-04`: assertion về tập vị trí gọi | Tập vị trí KHỚP CHÍNH XÁC mười hai dòng của `DEC-04`, cả đường dẫn và số dòng. Phép quét phủ cả `src/` và `app/`, chứng minh bằng chính sự có mặt của bốn dòng thuộc `app/api/` trong tập kết quả |
| `AC-05` | Đọc mã hàng rào: fixture âm của `DEC-07` | Có ít nhất một `it(` chạy detector trên một chuỗi nguồn giả và khẳng định detector BẮT được nó. Không có fixture âm là FAIL |
| `AC-06` | Đọc mã hàng rào: bước bỏ comment | Detector bỏ cả comment khối và comment dòng TRƯỚC khi kết luận, theo cách của `src/domains/job-board/public-select.static.test.ts:23` |
| `AC-07` | Đọc bảng phân loại trong `HANDOFF.md` | Đúng `12` dòng, khớp `DEC-04`. Mỗi dòng có: nhánh A hay B, policy bảng cha quote nguyên văn kèm tệp migration và số dòng, policy bảng con quote nguyên văn ở nhánh B, và kết luận AN TOÀN hay RỦI RO. Một dòng kết luận mà không quote policy là FAIL cho cả `AC` |
| `AC-08` | Đối chiếu tập vị trí đã sửa trong diff với tập vị trí kết luận RỦI RO ở `AC-07`, bằng `git diff --cached --numstat` cộng đọc từng hunk | Hai tập TRÙNG KHÍT. Sửa một vị trí AN TOÀN là FAIL. Bỏ sót một vị trí RỦI RO là FAIL. Tập rỗng cả hai bên là ĐẠT theo `DEC-06` |
| `AC-09` | `git status --porcelain src/domains/job-board/public-select.static.test.ts` | Output RỖNG |
| `AC-10` | `git status --porcelain prisma/` cộng `git diff --cached --name-only -- prisma/` | Cả hai RỖNG. Một dòng thuộc `prisma/` là FAIL toàn task |
| `AC-11` | `npm run test:unit` rồi `npm run typecheck`, lấy mã thoát bằng redirect chứ không sau ống | Cả hai exit `0`. Số test PASS không nhỏ hơn mốc của `STEP-01`. Mọi dòng đỏ, nếu có, được phân loại từng dòng thành hồi quy hay test cũ chưa đảo. Nếu một dòng đỏ nằm ở path đã khai của một contract cùng lô thì đó là defect của contract ấy, không phải của task này, và `HANDOFF.md` phải nói rõ contract nào |
| `AC-12` | `git status --porcelain` cộng `git diff --cached --name-only`, hợp hai danh sách rồi phân nhóm theo `4.2`. Cộng `git status --porcelain` chạy riêng trên từng đường dẫn ở cột cấm chạm. Cộng `git log --oneline -1` | Mọi path thuộc đúng một trong bốn nhóm của `4.2`, và nhóm bốn KHÔNG chứa tệp nào của nhóm một hay nhóm hai. Mọi đường dẫn cấm chạm cho output RỖNG. `HEAD` bằng baseline, tức không có commit mới nào so với baseline |

### 6.1 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-03`, `STEP-04` | `AC-01`, `AC-02`, `AC-03` |
| `RQ-02` | `STEP-03`, `STEP-04` | `AC-02`, `AC-03` |
| `RQ-03` | `STEP-02`, `STEP-03`, `STEP-04` | `AC-04` |
| `RQ-04` | `STEP-03` | `AC-05` |
| `RQ-05` | `STEP-03` | `AC-06` |
| `RQ-06` | `STEP-05` | `AC-07` |
| `RQ-07` | `STEP-06`, `STEP-07` | `AC-08`, `AC-10` |
| `RQ-08` | `STEP-08` | `AC-09` |
| `RQ-09` | `STEP-01`, `STEP-09`, `STEP-10` | `AC-11`, `AC-12` |

## 7. Risk và Rollback

| ID | Rủi ro | Xác suất | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | **Bản sửa mù.** Tier 2 thấy mười hai vị trí rồi sửa cả mười hai cho chắc. Điều đó xoá dữ liệu đang in ĐÚNG ở những chỗ `EV-12` chứng minh là an toàn, và mỗi truy vấn phụ thêm là một vòng DB thật trên đường nội bộ | Cao | `DEC-06` cho phép kết cục "không sửa gì" là PASS. `AC-08` FAIL nếu một vị trí AN TOÀN bị sửa. Bảng của `RQ-06` buộc quote policy TRƯỚC khi được phép sửa |
| `RISK-02` | **Hàng rào ghim danh sách tay.** Cách nhanh nhất để `AC-04` xanh là dán mười hai dòng vào một mảng literal rồi so với chính nó. Test xanh, giá trị bằng không, và điểm mù của `EV-04` được nhân bản | Cao | `AC-02` đếm số tên bảng literal. `AC-03` đòi hai con số do mã tự suy. `AC-05` đòi fixture âm, thứ mà một detector giả không vượt qua được |
| `RISK-03` | **Phép phân loại bị làm cho mềm.** Một dòng ghi "an toàn vì vai trò này chắc chắn thấy dự án" mà không chỉ ra nơi vai trò bị chặn trong mã và không quote policy | Trung bình | `RQ-06` và `AC-07` đòi quote nguyên văn kèm số dòng. Một dòng không quote làm FAIL cả `AC-07`, không phải chỉ dòng đó |
| `RISK-04` | **Số vị trí đo lại khác `12`.** Cây đã nhận contract 16 và có thể nhận thêm luồng khác. Một vị trí mới xuất hiện sau lúc Tier 1 đo | Trung bình | `STEP-02` buộc đo lại và ghi lệch thành finding. Vị trí mới KHÔNG tự động vào phạm vi sửa: nó vào bảng phân loại của `RQ-06`, và nếu RỦI RO mà nằm ngoài tám tệp của `Modules` thì ghi thành dư nợ, không tự nới `4.2` |
| `RISK-05` | **Chạy `npx vitest run` trần.** Lệnh đó đọc `DATABASE_URL` từ `.env`, tức PRODUCTION, và làm fail oan `24` test component | Trung bình | Mọi lệnh trong `STEP-04` bắt buộc mang `--config vitest.unit.config.ts`. Lane canonical là `npm run test:unit` |
| `RISK-06` | **Sửa xong mà hàng rào không cập nhật.** Sửa một vị trí RỦI RO làm tập vị trí thật giảm, nhưng assertion vẫn khẳng định `12`, nên lane ĐỎ vì chính bản sửa đúng | Cao | `STEP-07` là một bước riêng đúng cho việc này. Đây là dạng "test cũ chưa kịp đảo", và `AC-11` buộc phân loại từng dòng đỏ chứ không cho quy hết thành hồi quy |

Rollback: bản giao chỉ gồm một tệp test mới cộng tối đa tám tệp mã. Không migration, không đổi schema, không đổi cấu hình. Hoàn tác bằng `git restore` trên đúng tập path đã liệt kê ở `AC-12`, hoặc `git rm` tệp hàng rào nếu chưa commit. Không có trạng thái DB nào cần hoàn.

## 8. Open Questions

| ID | Câu hỏi | Ảnh hưởng | Ai trả lời |
|---|---|---|---|
| `Q-01` | Nếu phép phân loại của `RQ-06` cho thấy một route đang mở cho một vai trò mà policy bảng cha không cho đọc, thì đó là lỗi của route hay lỗi của policy? Task này ghi nó thành finding và KHÔNG sửa cả hai bên, theo `4.3` | Không chặn thi hành. Đóng bằng một contract sau, sau khi đã có bảng phân loại thật để đọc | Tier 1 sau khi đọc `HANDOFF` |
| `Q-02` | Có nên chứng minh lớp lỗi này một lần trên ma trận RLS thật của `hrp_mp2_test`, thay vì chỉ đọc policy? Phép đó cần `DATABASE_URL_TEST`, thứ `EV-09` cho thấy chưa từng có | Không chặn thi hành: `DEC-03` cố tình không cần DB. Nếu về sau lane integration chạy được thì đây là một test bổ sung, không phải một bản sửa | Owner, cùng lúc quyết credential cho lane integration |

## 9. Planner Resolution

Chưa có. Task chưa được thi hành.

## 10. Revision Log

| Version | Ngày | Đổi gì |
|---|---|---|
| `v1.0` | 2026-09-03 | Bản đầu. Đóng `F-05` của `hrp-v5-hotfix-02-public-detail-required-relation` với phạm vi đã ĐO chứ không phỏng đoán: `34` bảng RLS, `21` trường quan hệ bắt buộc, `12` vị trí gọi trong `8` tệp. Phép phân loại tĩnh hai nhánh ở `DEC-03` để không cần DB, vì `EV-09` cho thấy lane integration chưa từng chạy được |
| `v1.1` | 2026-09-03 | **Mở đường cho lô gộp ba contract theo quyết định `03/09` của Owner.** `AC-12` cũ buộc MỌI path trong index thuộc ba nhóm của riêng task này, nên nó BẤT KHẢ THOẢ khi 18 và test-01 cùng dirty trong một index dùng chung — lỗi ở văn của Tier 1, không ở bản giao. Bản này thêm nhóm bốn vào `4.2` cho path đã khai của hai contract cùng lô, đổi `AC-12` sang phép đếm ATTRIBUTION cộng một phép kiểm danh sách cấm chạm phải sạch, trả `package.json` cộng `package-lock.json` về quyền của test-01, mở cột cấm chạm cho những tệp test đã khai của hai contract cùng lô, và thêm vào `AC-11` luật quy trách một dòng test đỏ cho đúng contract. KHÔNG đổi phạm vi mã, KHÔNG thêm hay bớt một yêu cầu, một bước hay một tiêu chí nào. Cửa sổ bump còn mở vì cả hai round vẫn đếm bằng `0` |
