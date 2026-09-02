# TASK: hrp-v5-go-live-14-industry-label-truth

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-14-industry-label-truth` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `be95e7c` |
| Modules | `src/domains/job-board/public.service.ts`, trang chi tiết việc làm công khai, bảy file test đang khoá field |
| ADR references | quyết định bỏ control mất nguồn của `hrp-v5-go-live-05-public-card-truth`; `docs/PLANNER_HANDOVER.md` §0 `next_planner_candidate` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `TIER_2_EXECUTION` |
| Updated | `2026-09-02 Asia/Bangkok` |

Task này bỏ một khẳng định SAI đang in cho người dùng thật trên production. Nó không thêm tính năng, không thêm cột, không thêm quyền đọc.

## 1. Outcome

### User-visible outcome

Khách vô danh không còn thấy, và API công khai không còn trả về, một nhãn ngành nghề do máy đoán từ văn bản tự do.

Cụ thể sau task này:

1. Trang chi tiết việc làm còn đúng một chip loại hình công việc; chip ngành nghề biến mất khỏi HTML.
2. Response của đường đọc công khai không còn khoá `industry` — không phải "có nhưng rỗng", mà là không có khoá đó.
3. Không còn hàm nào trong service suy nhãn ngành từ text.
4. Có hàng rào phủ định trong bộ test: nếu ai đó thêm lại nhãn ngành từ text, test ĐỎ ngay, không im lặng.
5. Đường `ClientCompany.industry` của admin — cột thật, do người nhập, principal nội bộ đọc — giữ nguyên không sứt.

### Non-goals

- Không mở quyền đọc công khai lên `client_companies`. Đường đó cần migration cộng uỷ quyền Owner cộng một quyết định có ý thức về rò rỉ danh tính Client; Tier 1 đã chọn KHÔNG đi đường đó ở round này.
- Không thêm cột `industry` mới cho `projects` hay `staffing_orders`. Nếu Owner muốn trục ngành nghề như một tính năng thật thì đó là task schema riêng, xếp sau go-live.
- Không sửa `classifyJobType`, không sửa chip loại hình công việc. Xem `Q-01`.
- Không sửa ba file admin của `ClientCompany.industry`.
- Không đổi bất kỳ khoá DTO nào khác, không đổi bộ lọc, không đổi facet.
- Không commit, không push, không deploy.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:162` | `inferIndustry` khớp regex `kho`, `may mac`, `thuc pham`, `dien` trên text đã gập dấu, mặc định `Công nghiệp chế tạo` | Nhãn là phỏng đoán, không phải dữ liệu |
| `EV-02` | `src/domains/job-board/public.service.ts:308` và `:363` | Cả `toDto` và `toDetailDto` gọi `inferIndustry(searchableText, null)`; fallback là `null` nên KHÔNG deref quan hệ khách hàng nào | Không có nguồn canonical phía sau, kể cả trên lý thuyết |
| `EV-03` | `src/domains/job-board/public.service.ts:19` | `industry` là khoá bắt buộc kiểu string của projection công khai | Bỏ khoá là đổi hình dạng response công khai |
| `EV-04` | `src/domains/job-board/public.service.ts:257` | Text để suy nhãn gộp `order.description` — trường nội bộ do HR viết | Nhãn công khai phụ thuộc chữ nội bộ, HR sửa mô tả là nhãn đổi |
| `EV-05` | Trang chi tiết việc làm, dòng 138 | Đúng MỘT chỗ render, dùng `label` lấy từ `job.industry` | Bỏ render là một phần tử, không phải một đợt quét |
| `EV-06` | `src/domains/applications/marketplace-inventory.static.test.ts:322` và `:323` | Test khẳng định service PHẢI chứa `function inferIndustry(` và dòng gán `industry` | Bộ test hiện hành BẮT BUỘC defect tồn tại; phải uỷ quyền sửa test rõ ràng |
| `EV-07` | `src/domains/job-board/public-select.static.test.ts:65` | Khẳng định code chứa `inferIndustry(searchableText, null)` | Cùng loại rào như `EV-06` |
| `EV-08` | `src/domains/job-board/public-detail.static.test.ts:111` | Khoá chuỗi `job.industry` có mặt trong nguồn trang | Rào thứ ba, nằm ngay trên chỗ render |
| `EV-09` | `src/domains/job-board/public-card-truth.integration.test.ts:215` và `:250` | Khẳng định giá trị nhãn bằng `Điện tử` và allow-list khoá DTO có `industry` | Sửa allow-list là điểm cốt yếu của hàng rào phủ định |
| `EV-10` | `src/domains/job-board/public-card-truth.test.ts:407` | Allow-list khoá DTO thứ hai cũng có `industry` | Hai allow-list, phải sửa cả hai, sót một là hàng rào hở |
| `EV-11` | `src/domains/job-board/mp1.contract.test.ts:134` | Có một test mang tên nói rằng vẫn dùng ngành của công ty khách khi quan hệ đọc được | Tên đó SAI so với `EV-02`; test chỉ xanh vì fixture chứa chữ khớp regex. Bộ test không chỉ hợp thức hoá defect, nó còn mô tả sai defect |
| `EV-12` | `src/domains/applications/marketplace-browse.routes.test.ts:179` | go-live-05 đã bỏ `industry` khỏi bộ lọc và khỏi opts gửi xuống service | Trục ngành đã rút khỏi danh sách; chỉ còn tàn dư ở DTO và trang chi tiết |
| `EV-13` | `app/admin/clients` và `app/api/clients` | `ClientCompany.industry` là cột thật, có form nhập, principal nội bộ | Đây là field KHÁC; chạm vào là ngoài scope |
| `EV-14` | `docs/PLANNER_HANDOVER.md` §0 | `inferIndustry` có trước baseline `fb993a7`, đã deploy từ `691be38` | Không phải hồi quy của round nào; là nợ cũ |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Bỏ hẳn nhãn ngành nghề khỏi bề mặt công khai, KHÔNG cấp cho nó nguồn canonical ở round này | Tier 1, Owner duyệt kế hoạch 02/09 | Final |
| `DEC-02` | `CHOSEN` | Bỏ tới tận khoá DTO, không chỉ bỏ chỗ render. Lý do: đường đọc công khai đang TRẢ VỀ nhãn bịa cho mọi việc làm, nên bỏ riêng chip vẫn để lại một khẳng định sai trong payload công khai | Tier 1 | Final |
| `DEC-03` | `CHOSEN` | Xoá `inferIndustry` chứ không giữ lại hàm không ai gọi. Hàm còn đó là lời mời gọi tái xuất, và `EV-06`/`EV-07` chứng minh rào tĩnh có thể bị viết theo chiều ngược lại | Tier 1 | Final |
| `DEC-04` | `CHOSEN` | Bảy file test được uỷ quyền sửa RÕ RÀNG trong `§4.2`. Đây là ngoại lệ có chủ ý: bình thường Tier 2 không nới assertion để mã đi qua, nhưng ở đây chính assertion mới là thứ khoá defect | Tier 1 | Final cho round này |
| `DEC-05` | `CHOSEN` | Mỗi assertion bị bỏ phải được thay bằng assertion PHỦ ĐỊNH, không được xoá trắng. Xoá trắng làm bộ test nhỏ đi mà không ai biết vì sao | Tier 1 | Final |
| `DEC-06` | `CHOSEN` | Hàng rào phủ định đặt cùng chỗ với rào cũ, tức trong test tĩnh đọc nguồn service, để lần sau ai thêm lại nhãn suy diễn thì gặp ĐỎ chứ không gặp im lặng | Bài học `EV-06` | Final |
| `DEC-07` | `CHOSEN` | Chip loại hình công việc GIỮ NGUYÊN. Hai trong ba giá trị của nó suy từ `shiftStart`/`shiftEnd` thật, khác hẳn nhãn ngành vốn hoàn toàn là regex trên chữ | Tier 1 | Tới khi `Q-01` được trả lời |
| `DEC-08` | `CHOSEN` | RED trước GREEN là bắt buộc và phải đo trên assertion MỚI, không phải trên assertion cũ | Doctrine sẵn có | Final |
| `DEC-09` | `CHOSEN` | Tier 2 KHÔNG commit, KHÔNG push, KHÔNG deploy. Quyền đó thuộc Owner và Tier 1 | Rule `R-01` | Final |
| `DEC-10` | `ASSUMED` | Không có consumer ngoài repo đang đọc khoá `industry` của API công khai, vì Marketplace chưa công bố | Tier 1 | Đúng tới khi Marketplace public |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Chip ngành nghề bị bỏ khỏi trang chi tiết việc làm; chip loại hình công việc còn nguyên vị trí và nguyên nhãn | Must | `EV-05`, `DEC-07` | Bỏ sai chip, hoặc bỏ cả hai, là FAIL |
| `RQ-02` | Khoá `industry` bị bỏ khỏi projection công khai và khỏi CẢ HAI mapper | Must | `EV-02`, `EV-03`, `DEC-02` | Còn khoá trong response, hoặc chỉ sửa một mapper, là FAIL |
| `RQ-03` | `inferIndustry` không còn tồn tại trong service; không có hàm thay thế nào suy nhãn ngành từ text | Must | `EV-01`, `DEC-03` | Đổi tên hàm rồi giữ hành vi là FAIL |
| `RQ-04` | Bảy file test ở `§4.2` được sửa cho khớp; mọi assertion bị bỏ đều có assertion phủ định thay thế hoặc có lý do ghi tại chỗ | Must | `EV-06` tới `EV-11`, `DEC-04`, `DEC-05` | Nới assertion mà không thay bằng phủ định là FAIL |
| `RQ-05` | Cả HAI allow-list khoá DTO không còn `industry`, và có ít nhất một assertion phủ định chặn `inferIndustry` quay lại | Must | `EV-09`, `EV-10`, `DEC-06` | Sót một allow-list là FAIL |
| `RQ-06` | Chứng minh RED trước GREEN: chạy bộ test với assertion mới trên cây CHƯA sửa mã và dán output đỏ | Must | `DEC-08` | Chỉ dán GREEN là FAIL |
| `RQ-07` | Ba file admin của `ClientCompany.industry` không đổi một byte | Must | `EV-13` | Chạm vào là FAIL |
| `RQ-08` | Bốn gate mã xanh: typecheck, lint không error, `npm run test:unit`, build | Must | Pipeline | Gate đỏ là FAIL |
| `RQ-09` | HANDOFF ghi số byte và `git diff --numstat` TOÀN CÂY không lọc path, cộng danh sách file đã chạm | Must | Bài học truncation | Thiếu numstat toàn cây là FAIL |
| `RQ-10` | Không commit, không push, không deploy | Must | `DEC-09` | Vi phạm là reject cả round |

### 4.2 Scope boundaries

**Được sửa — mã:**

- `src/domains/job-board/public.service.ts` — bỏ khoá DTO, bỏ hai dòng gán, xoá `inferIndustry`, dọn comment đã chết ở vùng mô tả projection
- Trang chi tiết việc làm công khai dưới `app` — bỏ đúng chip ngành nghề

**Được sửa — test, uỷ quyền theo `DEC-04`:**

- `src/domains/applications/marketplace-inventory.static.test.ts`
- `src/domains/job-board/public-select.static.test.ts`
- `src/domains/job-board/public-detail.static.test.ts`
- `src/domains/job-board/public-card-truth.integration.test.ts`
- `src/domains/job-board/public-card-truth.test.ts`
- `src/domains/job-board/mp1.contract.test.ts`
- `src/domains/applications/marketplace-browse.routes.test.ts`

**Cấm chạm:**

- `app/admin/clients`, `app/api/clients` — cột `ClientCompany.industry` thật
- `prisma/**`, mọi migration, mọi env, `vercel.json`, `middleware.ts`
- Mọi khoá DTO khác, mọi bộ lọc, mọi facet, `classifyJobType`, `classifyShift`
- Mọi file dưới `docs/` — HANDOFF là ngoại lệ duy nhất
- Mọi file đang dirty ngoài stream này, kể cả `public/index.html` và ba `AUDIT.md`

### 4.3 Data, State, Permission và Interface Rules

- **Data:** không thêm cột, không seed, không chạy migration. Không cần DB để đo task này.
- **State:** không đổi state machine nào.
- **Permission:** không đổi policy RLS, không đổi grant, không mở rộng quyền đọc của principal công khai.
- **Interface:** hình dạng response công khai MẤT một khoá. Đó là thay đổi có chủ ý và là chính deliverable; phải ghi vào HANDOFF thành một dòng riêng để Tier 1 relock go-live-09 theo.
- **Failure/idempotency:** không có đường ghi nào trong task này; mọi phép đo lặp lại được.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-06` | Bảy file test | Viết assertion MỚI trước, chưa sửa mã: phủ định `inferIndustry`, phủ định khoá `industry` ở hai allow-list, phủ định chuỗi `job.industry` trong nguồn trang | Vitest | `npm run test:unit` ĐỎ đúng ở các assertion mới | Đỏ ở chỗ khác, tức có lỗi ngoài dự kiến |
| `STEP-02` | `RQ-02/03` | `public.service.ts` | Bỏ khoá DTO, bỏ hai dòng gán ở cả hai mapper, xoá `inferIndustry`, dọn comment đã chết | TypeScript | `tsc` exit 0 | Còn một mapper chưa sửa |
| `STEP-03` | `RQ-01` | Trang chi tiết | Bỏ đúng chip ngành nghề, giữ chip loại hình | React | Nguồn còn đúng một chip | Bỏ sai chip |
| `STEP-04` | `RQ-04/05` | Bảy file test | Sửa fixture, sửa hai allow-list, xử lý test mang tên sai của `EV-11`, hoàn tất hàng rào phủ định | Vitest | `npm run test:unit` XANH | Phải nới một assertion không nằm trong `§4.2` |
| `STEP-05` | `RQ-07/08` | Toàn cây | Chạy bốn gate mã và kiểm ba file admin không đổi | CLI | Bốn gate xanh, `git diff` ba file admin rỗng | Bất kỳ gate đỏ |
| `STEP-06` | `RQ-09/10` | HANDOFF | Ghi evidence thật kèm exit code, số byte, numstat toàn cây, và một dòng riêng về khoá DTO đã mất | Docs | HANDOFF tồn tại và không rỗng | Tier 2 commit hoặc push |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Nguồn trang chi tiết còn đúng một chip; grep chuỗi `job.industry` trong `app` trả 0 | grep + đọc diff | Lệnh và output | Yes |
| `AC-02` | `RQ-02` | `PublicJobDto` không còn khoá `industry`; grep `industry:` trong service trả 0 | grep + `tsc` | Lệnh và exit code | Yes |
| `AC-03` | `RQ-03` | grep `inferIndustry` trong `src` và `app` trả 0 | grep | Output rỗng | Yes |
| `AC-04` | `RQ-04` | Bảy file test đã sửa; không file test nào ngoài `§4.2` bị đổi | `git diff --name-only` | Danh sách file | Yes |
| `AC-05` | `RQ-05` | Cả hai allow-list không còn `industry`; tồn tại assertion phủ định chặn `inferIndustry` | Đọc test | Trích dẫn hai chỗ | Yes |
| `AC-06` | `RQ-06` | Có output ĐỎ trên cây chưa sửa mã, và output XANH sau khi sửa | Hai lần chạy `test:unit` | Cả hai output kèm exit code | Yes |
| `AC-07` | `RQ-07` | `git diff` trên ba file admin rỗng | `git diff` | Output rỗng | Yes |
| `AC-08` | `RQ-08` | typecheck exit 0; lint 0 error; `test:unit` exit 0 và số test không giảm ngoài phần đã uỷ quyền; build exit 0 | Bốn lệnh | Bốn exit code cộng số test trước và sau | Yes |
| `AC-09` | `RQ-09` | HANDOFF có `git diff --numstat` TOÀN CÂY không lọc path và số byte của chính HANDOFF | Đọc HANDOFF | Bảng numstat | Yes |
| `AC-10` | `RQ-10` | `git rev-list origin/main..HEAD` bằng 0 và working tree còn nguyên thay đổi chưa commit | `git rev-list` | Số 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-03` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-01, STEP-04` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-01` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-07` |
| `RQ-08` | `STEP-05` | `AC-08` |
| `RQ-09` | `STEP-06` | `AC-09` |
| `RQ-10` | `STEP-06` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Nới assertion thành thói quen: lần sau Tier 2 tự cho phép sửa test để mã đi qua | `DEC-04` bị đọc thành quyền chung | Uỷ quyền liệt kê ĐÚNG bảy file, và `DEC-05` buộc thay bằng phủ định | Tier 3 FAIL round nếu có file test thứ tám bị đổi |
| `RISK-02` | Bỏ khoá DTO làm chết một consumer không ai nghĩ tới | Consumer tự khai interface cục bộ rồi cast, nên `tsc` không bắt | Grep trên toàn `src` và `app` là bắt buộc ở `AC-01` tới `AC-03`, không dựa vào typecheck | Trả lại khoá, mở round mới với danh sách consumer thật |
| `RISK-03` | Sót một allow-list, hàng rào hở, nhãn quay lại trong im lặng | Có HAI allow-list ở hai file khác nhau | `RQ-05` nêu tên cả hai; `AC-05` đòi trích dẫn cả hai | Bổ sung assertion, chạy lại `test:unit` |
| `RISK-04` | Chạm sang cột `ClientCompany.industry` thật của admin vì trùng tên | grep `industry` bắt cả ba file admin | `RQ-07` và `AC-07` đòi diff rỗng trên ba file đó | `git restore` đúng ba file |
| `RISK-05` | Sửa xong nhưng go-live-09 vẫn viết trên khoá đã mất | 09 đang neo baseline cũ và có một yêu cầu dựng cả một dải nội dung trên nhãn ngành nghề | HANDOFF phải có một dòng riêng về khoá DTO đã mất; Tier 1 relock 09 sau task này | Tier 1 bump 09 trước khi giao |
| `RISK-06` | Tier 2 tự commit hoặc push | Đã xảy ra ba lần trong lịch sử dự án | `RQ-10` cộng `AC-10` đo bằng `rev-list` | Owner hoặc Tier 1 revert; round bị reject |

## 8. Open Questions

| ID | Question | Owner | Blocking? |
|---|---|---|---|
| `Q-01` | Chip loại hình công việc có nhánh `thoi_vu` suy từ regex trên text, hai nhánh còn lại suy từ giờ ca thật. Nhánh regex đó có phải cùng loại defect với nhãn ngành nghề, hay giữ được vì `thoi vu` là chữ HR thực sự viết trong mô tả đơn? | Owner cùng Tier 1 | Không chặn task này; `DEC-07` giữ nguyên chip ở round này |
| `Q-02` | Nếu sau này muốn trục ngành nghề thật, đường nào: cột enum trên `staffing_orders` do HR chọn, hay mở policy đọc công khai trên `client_companies`? Tier 1 khuyến nghị đường thứ nhất vì nó không phơi bảng khách hàng | Owner | Không chặn; là task sau go-live |

## 9. Planner Resolution

Tier 1 append quyết định sau khi Tier 3 audit. Không ghi trước.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-02` | Contract ban đầu. Bỏ nhãn ngành nghề suy diễn khỏi toàn bộ bề mặt công khai, tới tận khoá DTO, kèm uỷ quyền sửa đúng bảy file test đang khoá defect và hàng rào phủ định chống tái xuất | Tàn dư của go-live-05; `next_planner_candidate` của `PLANNER_HANDOVER.md` §0 |


