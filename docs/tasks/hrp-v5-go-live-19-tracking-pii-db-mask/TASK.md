# TASK: hrp-v5-go-live-19-tracking-pii-db-mask

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-19-tracking-pii-db-mask` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `DRAFT` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `80f6933` |
| Modules | `prisma/migrations/20260903160000_tracking_profile_mask_in_sql/migration.sql` (tệp MỚI), `src/shared/privacy/mask.test.ts`, `src/shared/privacy/sql-mask-parity.static.test.ts` (tệp MỚI) |
| ADR references | `hrp-v5-go-live-13-tracking-pii-mask` `R-02` và `Q-02` — hai món mà task này đóng, cộng `DEC-16` là lý do chúng không nằm trong round đó; `hrp-v5-go-live-18-public-surface-hardening` `DEC-07` — nơi `F-06` được chuyển đi và vì sao |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | CHẶN bởi Owner. Task này cần một migration mới, và trần migration của repo đang đóng theo `DEC-16` của task 13. Chỉ đổi `Status` sang `READY_FOR_EXECUTION` sau khi Owner mở trần và trả lời `Q-01` |
| Updated | `2026-09-03 15:35 Asia/Bangkok` |

Task này đóng `R-02` của `hrp-v5-go-live-13-tracking-pii-mask`: che số điện thoại và CCCD **ngay trong** hàm `hrp_public_tracking_profile`, để giá trị thô không còn ra khỏi database trên đường tra cứu công khai. `Q-02` ở §8 của task 13 đóng cùng lượt.

Hai điều đã đo và chúng làm bản sửa RẺ hơn nhiều so với hình dung ban đầu:

1. Chữ ký của hàm **không cần đổi**, nên `CREATE OR REPLACE` là hợp lệ và không cần một tên hàm thứ hai. Chỉ THÂN hàm đổi. Lý do ở `DEC-01`.
2. Phép che của `src/shared/privacy/mask.ts` là **luỹ đẳng** — che một giá trị đã che ra đúng chính nó. Vì vậy lớp che ở Node trở thành một lượt vô hại chứ không phải che hai lần, và **mã ứng dụng không cần đổi một dòng**. Chứng minh ở `DEC-02` và `EV-05`.

Hệ quả của hai điều đó: thứ tự triển khai an toàn tuyệt đối. Migration chạy TRƯỚC, mã không đổi, nên không có khoảng thời gian nào mà mã gọi một thứ chưa tồn tại.

## 1. Outcome

### User-visible outcome

1. Người giữ mã tra cứu vẫn thấy đúng những gì họ đang thấy hôm nay: tên đầy đủ, số điện thoại che một phần, CCCD che một phần. **Không một ký tự nào trên giao diện đổi.**
2. Giá trị thô của số điện thoại và CCCD không còn đi qua ranh giới database trên đường tra cứu công khai. Một caller tương lai quên gọi `maskPhone` cũng không lộ được gì.
3. Một bộ test mới chứng minh phép che luỹ đẳng và chứng minh SQL cùng Node cho ra chuỗi GIỐNG NHAU trên một bộ fixture có cả các ca biên.

### Non-goals

- Không đổi hình dạng response của `GET /api/public/applications/[trackingCode]`. Không thêm, không xoá, không đổi tên khoá nào.
- Không đổi chữ ký của `hrp_public_tracking_profile`. Không tạo hàm thứ hai. Lý do ở `DEC-01`.
- Không đổi thuật toán che ở `src/shared/privacy/mask.ts`. Hai cửa sổ `3/3` và `0/4` giữ nguyên, quy tắc trả `null` cho giá trị trống giữ nguyên.
- Không xoá lớp che ở Node. Đó là phòng ngự lớp hai, và `DEC-02` chứng minh nó vô hại.
- Không đổi `REVOKE` và `GRANT` hiện có, không đổi owner `hrp_public_rpc`, không đổi `search_path`.
- Không chạy migration trên production. Tier 2 chỉ VIẾT tệp migration; việc áp là OP action của Owner.
- Không chạm `F-06` của task 13: nó đã chuyển sang `hrp-v5-go-live-18-public-surface-hardening` theo `DEC-07` của contract đó.
- Không dùng một mã tra cứu THẬT để thử nghiệm. Lệnh cấm dùng mã tra cứu thật của task 13 còn hiệu lực nguyên vẹn.

## 2. Evidence và Baseline

Mọi phép đo dưới đây chạy trên baseline ghi ở `0. Control` bằng `git show`, không trên worktree.

| ID | Nguồn | Điều đã đo | Vì sao nó quyết định thiết kế |
|---|---|---|---|
| `EV-01` | `prisma/migrations/20260831103000_marketplace_search_tracking_profile/migration.sql:8` tới `:39` | `hrp_public_tracking_profile(p_tracking_code text)` là `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`. Thân hàm trả `cs.full_name`, `cs.phone`, `cs.cccd_number` NGUYÊN GIÁ TRỊ ở `:31` tới `:33` | Đây là kênh raw duy nhất. Vì thân là một `SELECT` thuần, việc bọc hai cột bằng biểu thức che là một thay đổi CỤC BỘ trong hai dòng, không phải viết lại hàm |
| `EV-02` | Cùng tệp, `:9` tới `:19` | `RETURNS TABLE` khai đúng chín cột: `tracking_code`, `status`, `submitted_at`, `job_title`, `job_code`, `position_title`, `full_name`, `phone`, `cccd_number`. Cả `phone` và `cccd_number` đã là `text` | Che một chuỗi ra một chuỗi, nên kiểu KHÔNG đổi và danh sách cột KHÔNG đổi. Đó là điều làm `CREATE OR REPLACE` hợp lệ: Postgres chỉ chặn `CREATE OR REPLACE` khi kiểu trả về đổi |
| `EV-03` | Cùng tệp, `:41`, `:42`, `:52` | `REVOKE ALL ... FROM PUBLIC`, `GRANT EXECUTE ... TO app_user_writer, app_user`, và `ALTER FUNCTION ... OWNER TO hrp_public_rpc` | Vì tên và chữ ký không đổi, ba dòng này KHÔNG cần lặp lại và KHÔNG có grant nào phải revoke sau deploy. So với phương án tạo hàm thứ hai, phương án này bỏ hẳn một dư nợ hậu-deploy |
| `EV-04` | `src/domains/applications/application.service.ts:205` tới `:222` | Caller duy nhất dùng `$queryRawUnsafe` với danh sách cột TƯỜNG MINH, rồi ở `:233` và `:234` gọi `maskPhone(row.phone)` và `maskCccd(row.cccd_number)` | Danh sách cột tường minh nghĩa là: giữ nguyên tên cột thì mã ứng dụng KHÔNG cần đổi một dòng. Đó là điều loại bỏ hoàn toàn nguy cơ "mã chạy trước DB" |
| `EV-05` | `src/shared/privacy/mask.ts:41` tới `:64` | Phép che LUỸ ĐẲNG. `normalize` bỏ `[\s.\-()]` và mọi dấu cộng không dẫn đầu; dấu sao KHÔNG nằm trong tập bị bỏ, nên độ dài sau chuẩn hoá của một chuỗi ĐÃ CHE bằng đúng độ dài của bản thô đã chuẩn hoá, và cửa sổ đầu-cuối lấy lại đúng các ký tự cũ. Kiểm tay trên bốn dạng: `090***123` ra `090***123`; `+84******567` ra `+84******567`; `****5678` ra `****5678`; `***` ra `***` | Đây là dữ kiện quan trọng nhất của cả task. Nó biến lớp che ở Node từ một nguy cơ che-hai-lần thành một lượt vô hại, và nhờ đó mã ứng dụng đứng ngoài phạm vi. Nhưng nó phải được CHỨNG MINH bằng test, không được nhận bằng lời: `RQ-02` làm việc đó |
| `EV-06` | `src/shared/privacy/mask.ts:26` | `SEPARATOR_RE` là `[\s.\-()]`, và `\s` của JavaScript là tập UNICODE, không phải ASCII | Đây là bẫy chính của phần SQL. `[[:space:]]` của Postgres là ASCII, nên một `regexp_replace` với lớp POSIX **không** tương đương. `DEC-04` vì thế cấm regex và buộc dùng `translate` với danh sách ký tự liệt kê tường minh |
| `EV-07` | `src/shared/privacy/mask.ts:42` | `normalize` gọi `.trim()` TRƯỚC khi bỏ dấu phân cách, nhưng vì `SEPARATOR_RE` đã bỏ TOÀN BỘ `\s` trên cả chuỗi, bước `.trim()` không thay đổi kết quả | Phần SQL không cần một bước trim riêng. Bớt một bước là bớt một chỗ lệch |
| `EV-08` | `src/shared/privacy/mask.ts:58` và `:61` | Độ dài dùng để đếm là `String.prototype.length`, tức đếm đơn vị UTF-16. `length()` của Postgres đếm ĐIỂM MÃ | Với chữ số thì hai phép đếm bằng nhau. Chúng chỉ lệch trên ký tự ngoài BMP. `DEC-06` ghi điều này thành một giới hạn CÓ TÊN thay vì bỏ qua |
| `EV-09` | `src/shared/privacy/mask.test.ts` đã tồn tại | Repo đã có một bộ test cho `mask.ts`. Task này CỘNG ca kiểm vào đó, không viết lại | Cộng vào một bộ đang xanh là cách rẻ nhất và cũng chặn hồi quy tốt nhất |
| `EV-10` | `vitest.unit.config.ts` khoá `env`, cộng dư nợ đã ghi của `hrp-v5-go-live-09-public-board-architecture` | Lane unit ép `DATABASE_URL` về sentinel không tới được và làm rỗng `DATABASE_URL_TEST`. Lane integration chưa từng chạy | Không có sẵn một phép chạy SQL thật. Vì vậy phép chứng minh tương đương của `RQ-03` là TĨNH cộng in-process, và giới hạn của nó phải được ghi tên, xem `DEC-07` và `Q-02` |
| `EV-11` | `prisma/migrations/` | Migration mới nhất là `20260831160000_public_rpc_residual_grant_revoke`. Không có tệp nào sau ngày `31/08` | Tệp migration mới của task này phải mang dấu thời gian LỚN HƠN mốc đó. Và tuyệt đối KHÔNG sửa tệp migration cũ: sửa một migration đã áp là đổi checksum của nó |

## 3. Decisions và Assumptions

| ID | Quyết định | Lý do |
|---|---|---|
| `DEC-01` | Dùng `CREATE OR REPLACE FUNCTION hrp_public_tracking_profile(p_tracking_code text)` với chữ ký GIỐNG HỆT bản hiện có, trong một tệp migration MỚI. KHÔNG tạo hàm thứ hai, KHÔNG `DROP` rồi `CREATE`, KHÔNG sửa tệp migration cũ | `EV-02`: danh sách cột và kiểu không đổi nên Postgres cho phép `CREATE OR REPLACE`. `DROP` rồi `CREATE` mở một cửa sổ mà mã đang chạy gọi một hàm không tồn tại. Tạo hàm thứ hai buộc đổi mã ứng dụng, buộc revoke grant cũ sau deploy, và sinh một dư nợ hậu-deploy — cả ba đều bị phương án này loại bỏ (`EV-03`) |
| `DEC-02` | Mã ứng dụng KHÔNG đổi. `src/domains/applications/application.service.ts` giữ nguyên, kể cả hai lệnh gọi `maskPhone` và `maskCccd` | `EV-04` cộng `EV-05`: caller dùng danh sách cột tường minh nên tên cột không đổi thì mã không đổi, và phép che luỹ đẳng nên lượt che thứ hai ở Node không đổi kết quả. Giữ lớp hai là phòng ngự nhiều lớp thật, chứ không phải mã dư |
| `DEC-03` | Thứ tự triển khai: migration áp TRƯỚC, mã không đổi nên không có bước deploy nào phải đồng bộ. Nếu migration chưa áp thì hệ thống chạy y như hôm nay | Đây là hướng an toàn của cặp DB-và-mã: DB trước mã thì vô hại, mã trước DB thì `500`. Ở đây nhánh thứ hai không tồn tại vì mã không đổi |
| `DEC-04` | Biểu thức che trong SQL **CẤM dùng regex**. Bỏ dấu phân cách bằng `translate` với danh sách ký tự liệt kê TƯỜNG MINH, gồm đúng tập `\s` của JavaScript cộng dấu chấm, dấu gạch nối, hai dấu ngoặc | `EV-06`: `\s` của JS là Unicode, `[[:space:]]` của Postgres là ASCII. Một `regexp_replace` sẽ bỏ sót khoảng trắng Unicode và cho ra chuỗi khác Node. `translate` với danh sách tường minh là phép duy nhất có nghĩa xác định ở cả hai phía |
| `DEC-05` | Biểu thức che trong SQL đi đúng năm bước, cùng thứ tự với `src/shared/privacy/mask.ts`: một, `translate` bỏ dấu phân cách; hai, lấy dấu cộng dẫn đầu nếu ký tự đầu là dấu cộng; ba, `replace` bỏ MỌI dấu cộng rồi ghép lại dấu cộng dẫn đầu; bốn, chuỗi rỗng trả `NULL`; năm, độ dài nhỏ hơn hoặc bằng tổng cửa sổ thì trả đúng số dấu sao bằng độ dài, ngược lại ghép đầu, dấu sao, đuôi | Cùng thuật toán, cùng thứ tự, thì mỗi bước đối chiếu được từng bước. Đảo thứ tự bước hai và bước ba sẽ làm một giá trị nhiều dấu cộng ra khác nhau ở hai phía |
| `DEC-06` | **Giới hạn CÓ TÊN:** `length()` của Postgres đếm điểm mã, `String.prototype.length` đếm đơn vị UTF-16. Hai phép bằng nhau trên chữ số và trên mọi ký tự BMP, và chỉ lệch trên ký tự ngoài BMP. Giới hạn này ghi nguyên văn vào `HANDOFF.md`, và fixture KHÔNG chứa ký tự ngoài BMP | Nói ra một chỗ lệch có thật thì tốt hơn là để nó nằm im. Số điện thoại và CCCD Việt Nam là chữ số, nên chỗ lệch không tới được từ dữ liệu thật |
| `DEC-07` | Phép chứng minh tương đương của `RQ-03` là TĨNH cộng in-process, không chạy Postgres. Nó gồm hai nửa: nửa một, một hàm TypeScript trong tệp test mô phỏng ĐÚNG năm bước của `DEC-05` và so từng ca fixture với `mask.ts`; nửa hai, một assertion tĩnh đọc văn bản SQL của migration mới và khẳng định nó chứa đúng năm bước ấy, không chứa `regexp_replace`, và chứa `translate` | `EV-10`: không có DB để chạy. Nửa một bắt lệch THUẬT TOÁN, nửa hai bắt lệch giữa thuật toán đã chứng minh và SQL thật sự được ghi ra. Giới hạn còn lại — Postgres có thể đánh giá khác — là thật và ghi ở `Q-02` |
| `DEC-08` | Bộ fixture bắt buộc gồm ít nhất mười ca: `null`; chuỗi rỗng; chuỗi chỉ có dấu phân cách; số nội địa mười chữ số; số có dấu cách và dấu gạch nối; số bắt đầu bằng dấu cộng; số có dấu cộng ở GIỮA; giá trị ngắn hơn cửa sổ giữ; giá trị dài đúng bằng cửa sổ giữ; và một giá trị chứa khoảng trắng Unicode không phải dấu cách thường | Chín ca đầu phủ mọi nhánh của `maskWindow` và `normalize`. Ca thứ mười là ca DUY NHẤT phân biệt được `translate` liệt kê tường minh với một lớp POSIX, tức nó là ca chứng minh `DEC-04` |
| `DEC-09` | Tier 2 chỉ VIẾT tệp migration. KHÔNG chạy `prisma migrate`, KHÔNG áp lên bất kỳ database nào, KHÔNG deploy | Áp migration là OP action thuộc Owner. Đây cũng là lý do task này đứng `DRAFT` cho tới khi trần migration được mở |

## 4. Contract

### 4.1 Requirements

| ID | Yêu cầu | Mức | Nguồn | Dấu hiệu FAIL |
|---|---|---|---|---|
| `RQ-01` | Viết một tệp migration MỚI dưới `prisma/migrations/`, dấu thời gian lớn hơn `20260831160000`, chứa đúng một `CREATE OR REPLACE FUNCTION hrp_public_tracking_profile(p_tracking_code text)` với chữ ký giống hệt bản hiện có, thân hàm bọc `cs.phone` và `cs.cccd_number` bằng biểu thức che của `DEC-05` | Must | `DEC-01`, `EV-01`, `EV-02` | Tệp migration cũ bị sửa; hoặc có `DROP FUNCTION`; hoặc chữ ký đổi; hoặc một hàm tên khác được tạo; hoặc bảy cột còn lại bị đổi |
| `RQ-02` | Cộng vào `src/shared/privacy/mask.test.ts` các ca chứng minh phép che LUỸ ĐẲNG: với mọi fixture của `DEC-08`, che lần hai trên kết quả lần một ra CHÍNH kết quả lần một, cho cả `maskPhone` và `maskCccd` | Must | `EV-05`, `DEC-02` | Không có ca luỹ đẳng; hoặc ca luỹ đẳng chỉ chạy trên một fixture; hoặc test cũ trong tệp bị xoá hay bị sửa |
| `RQ-03` | Tạo `src/shared/privacy/sql-mask-parity.static.test.ts` thoả cả hai nửa của `DEC-07`: một hàm mô phỏng năm bước so với `mask.ts` trên toàn bộ fixture của `DEC-08`, cộng một assertion tĩnh trên văn bản SQL của tệp migration mới | Must | `DEC-07`, `DEC-04` | Chỉ có một trong hai nửa; hoặc assertion tĩnh không đọc tệp migration bằng filesystem; hoặc assertion tĩnh không kiểm sự VẮNG MẶT của `regexp_replace` |
| `RQ-04` | Biểu thức che trong SQL không chứa `regexp_replace`, không chứa lớp POSIX, và bỏ dấu phân cách bằng `translate` với danh sách ký tự liệt kê tường minh phủ đúng tập `\s` của JavaScript cộng bốn ký tự `.`, `-`, `(`, `)` | Must | `DEC-04`, `EV-06` | Có `regexp_replace`; hoặc danh sách `translate` thiếu một ký tự khoảng trắng Unicode; hoặc danh sách gồm thêm ký tự không có trong `SEPARATOR_RE` |
| `RQ-05` | Bộ fixture đủ ít nhất mười ca của `DEC-08`, trong đó BẮT BUỘC có ca khoảng trắng Unicode và ca dấu cộng ở giữa | Must | `DEC-08` | Thiếu một trong hai ca bắt buộc; hoặc dưới mười ca; hoặc fixture chứa số điện thoại hay CCCD THẬT |
| `RQ-06` | `src/domains/applications/application.service.ts` và `src/shared/privacy/mask.ts` KHÔNG đổi một byte | Must | `DEC-02`, `EV-04` | Một trong hai tệp xuất hiện trong danh sách thay đổi |
| `RQ-07` | Giới hạn của `DEC-06` về `length()` và `String.prototype.length`, cộng giới hạn của `DEC-07` về việc không chạy Postgres thật, ghi nguyên văn vào `HANDOFF.md` như hai giới hạn CÓ TÊN | Must | `DEC-06`, `DEC-07`, `EV-08` | `HANDOFF` không có hai dòng đó; hoặc `HANDOFF` khẳng định phép tương đương đã được chứng minh trên Postgres |
| `RQ-08` | Không chạy `prisma migrate`, không áp migration, không deploy | Must | `DEC-09` | Bất kỳ dấu hiệu nào cho thấy migration đã được áp; hoặc một dòng mới trong `_prisma_migrations` |
| `RQ-09` | `npm run test:unit` và `npm run typecheck` đều exit `0`. Số test PASS không nhỏ hơn mốc mà `STEP-01` ghi | Must | `EV-10` | Một lane exit khác `0`; hoặc số test PASS tụt mà `HANDOFF` không phân loại từng dòng đỏ |

### 4.2 Scope boundaries

Được chạm, và chỉ ba nhóm sau:

1. Một tệp migration MỚI dưới `prisma/migrations/` với dấu thời gian lớn hơn `20260831160000`.
2. `src/shared/privacy/mask.test.ts` và tệp mới `src/shared/privacy/sql-mask-parity.static.test.ts`.
3. Artifact của chính task: `docs/tasks/hrp-v5-go-live-19-tracking-pii-db-mask/HANDOFF.md` cộng mọi tệp dưới `docs/tasks/hrp-v5-go-live-19-tracking-pii-db-mask/evidence/`.

Cấm chạm: mọi tệp migration ĐANG CÓ, `prisma/schema.prisma`, `prisma/migrations/migration_lock.toml`, `src/shared/privacy/mask.ts`, `src/domains/applications/application.service.ts`, `app/api/public/applications/[trackingCode]/route.ts`, `app/(jobs)/track/page.tsx`, `package.json`, mọi cấu hình vitest. Xuất hiện một nhóm thứ tư là FAIL.

### 4.3 Data, State, Permission và Interface Rules

- **Không áp migration, không chạy DDL, không kết nối DB.** Sản phẩm của Tier 2 là một TỆP. Việc áp thuộc Owner.
- **Không nới quyền.** Không thêm `GRANT`, không bỏ `REVOKE`, không đổi owner `hrp_public_rpc`, không đổi `SET search_path`. Hàm giữ `SECURITY DEFINER` và giữ `STABLE`.
- **Không đổi hình dạng response công khai.** Chín cột giữ nguyên tên và nguyên kiểu. DTO công khai giữ nguyên mọi khoá.
- **Không giá trị thật trong fixture.** Mọi số trong fixture là số bịa, và không được là một số điện thoại Việt Nam hợp lệ có thể gọi tới. Không CCCD thật.
- **Bí mật:** không in connection string, token, password, PII thật vào log hay artifact. Không dùng mã tra cứu thật để thử.

## 5. Execution Plan

| ID | Việc | Ra cái gì |
|---|---|---|
| `STEP-01` | Chạy `pwsh -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-19-tracking-pii-db-mask/TASK.md`, rồi `npm run test:unit` và `npm run typecheck` trên cây CHƯA sửa | Ba output kèm mã thoát ở đầu `HANDOFF.md`. Mốc số tệp test và số test PASS |
| `STEP-02` | Đọc `prisma/migrations/20260831103000_marketplace_search_tracking_profile/migration.sql` bằng `git show` trên baseline và ghi lại chín cột của `RETURNS TABLE` cùng ba dòng quyền | Bản trích nguyên văn trong `evidence/`. Đây là bản gốc để chứng minh chữ ký không đổi |
| `STEP-03` | Cộng ca luỹ đẳng vào `src/shared/privacy/mask.test.ts` theo `RQ-02`, rồi chạy `npx vitest run --config vitest.unit.config.ts src/shared/privacy/mask.test.ts` | Diff cộng output kèm mã thoát. Đây là phép chứng minh `EV-05`, và nó phải chạy TRƯỚC khi viết SQL |
| `STEP-04` | Viết tệp migration mới theo `RQ-01` và `RQ-04`. Biểu thức che đi đúng năm bước của `DEC-05`, dùng `translate` với danh sách ký tự tường minh | Một tệp `.sql` mới. Chín cột giống hệt bản gốc của `STEP-02` |
| `STEP-05` | Viết `src/shared/privacy/sql-mask-parity.static.test.ts` theo `RQ-03` và `RQ-05`, rồi chạy `npx vitest run --config vitest.unit.config.ts src/shared/privacy/sql-mask-parity.static.test.ts` | Tệp test mới cộng output kèm mã thoát. Nửa một so hàm mô phỏng với `mask.ts`; nửa hai đọc văn bản SQL bằng filesystem |
| `STEP-06` | Kiểm `RQ-06`: `git status --porcelain src/shared/privacy/mask.ts src/domains/applications/application.service.ts` | Output RỖNG cho cả hai đường dẫn |
| `STEP-07` | Kiểm không migration cũ nào bị sửa: `git status --porcelain prisma/` cộng `git diff --cached --name-only -- prisma/` | Chỉ đúng một đường dẫn mới xuất hiện, và nó là tệp migration mới. `migration_lock.toml` và `schema.prisma` không xuất hiện |
| `STEP-08` | Chạy lại `npm run test:unit` và `npm run typecheck`, so số test PASS với mốc của `STEP-01` | Hai output kèm mã thoát, cả hai `0` |
| `STEP-09` | Kiểm phạm vi bằng `git status --porcelain` cộng `git diff --cached --numstat`. Ghi `HANDOFF.md` cộng `evidence/`, trong đó có hai dòng giới hạn CÓ TÊN của `RQ-07`, rồi `git add` NGAY. **KHÔNG commit, KHÔNG push, KHÔNG chạy migrate, KHÔNG deploy** | Danh sách path đầy đủ phân đúng ba nhóm của `4.2`, và `HANDOFF.md` với mọi lệnh, mã thoát, output thật |

## 6. Acceptance Criteria

| ID | Cách kiểm | Ngưỡng đạt |
|---|---|---|
| `AC-01` | `git status --porcelain prisma/` cộng `git diff --cached --name-only -- prisma/`, hợp hai danh sách | Đúng MỘT đường dẫn, và nó là một tệp `migration.sql` mới dưới một thư mục có dấu thời gian lớn hơn `20260831160000`. Không đường dẫn nào khác thuộc `prisma/` |
| `AC-02` | `grep -c "CREATE OR REPLACE FUNCTION hrp_public_tracking_profile" ` trên tệp migration mới, cộng `grep -c "DROP FUNCTION" ` trên cùng tệp | Đếm thứ nhất bằng `1`. Đếm thứ hai bằng `0`. Một `DROP FUNCTION` là FAIL toàn task |
| `AC-03` | So danh sách cột `RETURNS TABLE` của tệp mới với bản trích nguyên văn ở `STEP-02`, bằng `diff` trên hai đoạn văn bản đã tách ra tệp riêng trong `evidence/` | Chín tên cột và chín kiểu GIỐNG HỆT, cùng thứ tự. Một cột lệch là FAIL |
| `AC-04` | `grep -c "regexp_replace" ` trên tệp migration mới, cộng `grep -c "translate(" ` trên cùng tệp | Đếm `regexp_replace` bằng `0`. Đếm `translate(` ít nhất `1` |
| `AC-05` | Đọc danh sách ký tự trong lệnh `translate` của tệp migration mới, đối chiếu với tập `\s` của JavaScript cộng bốn ký tự `.`, `-`, `(`, `)` | Danh sách phủ ĐỦ tập đó và KHÔNG rộng hơn. Thiếu một ký tự khoảng trắng Unicode là FAIL. Có thêm một ký tự ngoài tập là FAIL |
| `AC-06` | Đọc output của `STEP-03` | Lane con exit `0`. Có ca luỹ đẳng cho cả `maskPhone` và `maskCccd`, chạy trên TOÀN BỘ fixture chứ không một ca |
| `AC-07` | Đọc output của `STEP-05` và đọc mã của `src/shared/privacy/sql-mask-parity.static.test.ts` | Lane con exit `0`. Có nửa một: một hàm mô phỏng năm bước, so với `maskPhone` và `maskCccd` trên toàn bộ fixture. Có nửa hai: một assertion đọc tệp migration bằng filesystem và kiểm cả sự CÓ MẶT của `translate` lẫn sự VẮNG MẶT của `regexp_replace` |
| `AC-08` | Đếm số ca fixture trong `src/shared/privacy/sql-mask-parity.static.test.ts` và đọc từng ca | Ít nhất `10` ca. Có ca `null`, ca chuỗi rỗng, ca chỉ dấu phân cách, ca dấu cộng dẫn đầu, ca dấu cộng ở GIỮA, ca ngắn hơn cửa sổ, ca dài đúng cửa sổ, và ca khoảng trắng UNICODE không phải dấu cách thường. Thiếu ca Unicode là FAIL vì đó là ca duy nhất chứng minh `RQ-04` |
| `AC-09` | `git status --porcelain src/shared/privacy/mask.ts src/domains/applications/application.service.ts app/api/public/applications/[trackingCode]/route.ts app/(jobs)/track/page.tsx` | Output RỖNG. Một dòng bất kỳ là FAIL |
| `AC-10` | Đọc `HANDOFF.md` mục giới hạn | Có dòng nói `length()` của Postgres đếm điểm mã trong khi JavaScript đếm đơn vị UTF-16, và chỗ lệch chỉ tới được bằng ký tự ngoài BMP. Có dòng nói phép tương đương KHÔNG chạy trên Postgres thật và lý do là lane integration không có credential. Không có dòng nào khẳng định đã chứng minh trên Postgres |
| `AC-11` | `npm run test:unit` rồi `npm run typecheck`, lấy mã thoát bằng redirect chứ không sau ống | Cả hai exit `0`. Số test PASS không nhỏ hơn mốc của `STEP-01` |
| `AC-12` | `git status --porcelain` cộng `git diff --cached --name-only`, hợp hai danh sách rồi phân nhóm. Cộng `git log --oneline -1` để chứng minh không có commit mới | Mọi path thuộc đúng một trong ba nhóm của `4.2`: một tệp migration mới, hai tệp test, và `docs/tasks/hrp-v5-go-live-19-tracking-pii-db-mask/**`. Xuất hiện nhóm thứ tư là FAIL. `HEAD` bằng baseline |

### 6.1 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-02`, `STEP-04` | `AC-01`, `AC-02`, `AC-03` |
| `RQ-02` | `STEP-03` | `AC-06` |
| `RQ-03` | `STEP-05` | `AC-07` |
| `RQ-04` | `STEP-04` | `AC-04`, `AC-05` |
| `RQ-05` | `STEP-05` | `AC-08` |
| `RQ-06` | `STEP-06` | `AC-09` |
| `RQ-07` | `STEP-09` | `AC-10` |
| `RQ-08` | `STEP-07`, `STEP-09` | `AC-01`, `AC-12` |
| `RQ-09` | `STEP-01`, `STEP-08` | `AC-11`, `AC-12` |

## 7. Risk và Rollback

| ID | Rủi ro | Xác suất | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | **SQL và Node lệch nhau, và giao diện đổi trong im lặng.** Vì Node che LẦN HAI trên kết quả của SQL, nếu SQL cho ra một chuỗi khác thì lượt che thứ hai chuẩn hoá lại chuỗi đó và ra một kết quả khác hôm nay. Người dùng thấy số điện thoại của mình đổi hình dạng mà không lỗi nào được ném | Cao | `RQ-03` đòi phép tương đương trên toàn bộ fixture. `RQ-02` chứng minh luỹ đẳng. `AC-08` đòi ca khoảng trắng Unicode, là ca duy nhất bóc được lệch do lớp POSIX. `DEC-04` cấm regex, tức cấm đúng nguồn lệch đã biết |
| `RISK-02` | **`DROP` rồi `CREATE` thay vì `CREATE OR REPLACE`.** Đó là phản xạ khi thấy thân hàm đổi, và nó mở một cửa sổ mà mã đang chạy gọi một hàm không tồn tại | Trung bình | `AC-02` đếm `DROP FUNCTION` phải bằng `0`. `EV-02` giải thích vì sao `CREATE OR REPLACE` hợp lệ ở đây |
| `RISK-03` | **Sửa tệp migration cũ thay vì viết tệp mới.** Sửa một migration đã áp làm lệch checksum, và mọi lần `migrate` sau đó báo drift | Trung bình | `AC-01` đòi đúng MỘT đường dẫn mới thuộc `prisma/`. `EV-11` ghi mốc dấu thời gian phải vượt |
| `RISK-04` | **`translate` thiếu ký tự.** Danh sách khoảng trắng Unicode dài và dễ sót một mã | Cao | `AC-05` đối chiếu danh sách với tập `\s` theo cả hai chiều: không thiếu và không rộng hơn. `AC-08` đòi một ca fixture chạm đúng vào chỗ đó |
| `RISK-05` | **Phép tương đương bị làm giả.** Cách nhanh nhất làm `AC-07` xanh là viết hàm mô phỏng bằng cách GỌI LẠI `mask.ts`, khi đó nó tự so với chính nó và luôn xanh | Cao | `RQ-03` và `AC-07` đòi hàm mô phỏng đi đúng năm bước của `DEC-05` bằng mã của chính nó. Tier 3 phải đọc thân hàm mô phỏng và kiểm nó KHÔNG import từ `src/shared/privacy/mask.ts` |
| `RISK-06` | **Migration bị áp trong lúc thi hành.** Một lệnh `prisma migrate dev` theo phản xạ sẽ chạm database thật | Trung bình | `RQ-08`, `DEC-09` và `4.3` cấm tường minh. Lệnh giao `/code` phải kèm câu KHÔNG chạy migrate |
| `RISK-07` | **Giá trị thật lọt vào fixture.** Một số điện thoại có thật trong test là PII trong repo | Trung bình | `4.3` và `RQ-05` cấm. Tier 3 đọc từng ca fixture |
| `RISK-08` | **Task được giao khi trần migration còn đóng.** `Status` là `DRAFT` đúng vì lý do này, và một lượt `/code` sớm sẽ tạo ra một tệp migration không ai áp được | Trung bình | `Status` giữ `DRAFT` và `Next gate` ghi rõ điều kiện. Chỉ Tier 1 đổi `Status`, và chỉ sau khi Owner mở trần cùng trả lời `Q-01` |

Rollback: sản phẩm là một tệp migration MỚI cộng hai tệp test. Chưa áp thì hoàn tác là xoá tệp — không có trạng thái database nào cần hoàn. Nếu đã áp và cần lùi, bản lùi là một migration forward thứ hai gọi lại `CREATE OR REPLACE` với thân gốc ghi ở `evidence/` của `STEP-02`; tuyệt đối không `DROP` hàm và không revert tệp migration đã áp.

## 8. Open Questions

| ID | Câu hỏi | Ảnh hưởng | Ai trả lời |
|---|---|---|---|
| `Q-01` | Trần migration có được mở cho task này chưa? `DEC-16` của task 13 ghi trần đang đóng vì repo khoá số migration chờ. Đây là điều kiện duy nhất chặn task | CHẶN. `Status` giữ `DRAFT` tới khi có câu trả lời. Không có phương án đi đường khác: che ở tầng SQL bắt buộc cần một migration | Owner — `NEED_USER_DECISION` |
| `Q-02` | Có cần chứng minh phép tương đương trên một Postgres THẬT không? `DEC-07` chỉ chứng minh tĩnh cộng in-process, nên nó bắt được lệch thuật toán nhưng không bắt được lệch do chính Postgres đánh giá khác | Không chặn thi hành, nhưng nó là giới hạn CÓ TÊN của kết quả. Nếu Owner muốn phép chứng minh mạnh hơn thì cần `DATABASE_URL_TEST`, thứ `EV-10` cho thấy chưa từng có | Owner, cùng lúc quyết credential cho lane integration |
| `Q-03` | Có một phương án RẺ HƠN mà bỏ hẳn migration: giữ nguyên che ở Node, và thay vào đó thêm một hàng rào tĩnh khẳng định caller duy nhất của `hrp_public_tracking_profile` luôn che cả hai trường, cộng một assertion rằng DTO công khai không có khoá thô. Phương án đó không cần trần migration, làm được ngay, nhưng KHÔNG bịt kênh raw ở tầng database nên nó không thoả `RISK-06` của task 13 | Nếu Owner chọn phương án này thì task này chuyển `CANCELLED` và phần hàng rào nhập vào contract 18. Nếu Owner chọn che ở SQL thì task này chạy như đã viết | Owner — `NEED_USER_DECISION` |

## 9. Planner Resolution

Chưa có. Task chưa được thi hành và đang `DRAFT`.

## 10. Revision Log

| Version | Ngày | Đổi gì |
|---|---|---|
| `v1.0` | 2026-09-03 | Bản đầu, `DRAFT`. Đóng `R-02` và `Q-02` của `hrp-v5-go-live-13-tracking-pii-mask`. Hai phát hiện làm bản sửa rẻ hơn dự kiến: chữ ký hàm không cần đổi nên `CREATE OR REPLACE` hợp lệ và không cần hàm thứ hai (`EV-02`, `DEC-01`), và phép che của `mask.ts` là luỹ đẳng nên mã ứng dụng đứng ngoài phạm vi (`EV-05`, `DEC-02`). Bẫy chính được ghi tên trước: `\s` của JavaScript là Unicode còn lớp POSIX của Postgres là ASCII, nên `DEC-04` cấm regex và buộc `translate` với danh sách tường minh (`EV-06`). `F-06` của task 13 KHÔNG nằm ở đây, nó đã chuyển sang contract 18 kèm lý do |
