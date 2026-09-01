# TASK: hrp-v5-go-live-05-public-card-truth

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-05-public-card-truth` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.4` |
| Status | `AUDIT_ROUND_1_FAILED` — Tier 3 giao `AUDIT.md` 7.750 B kèm công bố "`verify-audit.ps1` trả PASS". **Tier 1 tự chạy gate và nó FAIL, exit 2:** `[FAIL] AC-12 has no verdict row in AUDIT section 2`, và chính gate in ra `Tier 1 MUST NOT resolve on this AUDIT.md`. File đã được commit **nguyên trạng** `8360136` để giữ bằng chứng (AUDIT.md untracked bị làm rỗng là mất hẳn). Bốn finding ở §12. Nguyên nhân gốc của cái FAIL là **lỗi của Tier 1** — xem `DEC-17`. Bằng chứng execution round 1 và round 2 **VẪN HỢP LỆ**; không mở execution round mới |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent context |
| Baseline | `fb993a7` — Tier 1 khoá ở v1.1. Anchor cũ `6680011` **đã lỗi**: sáu commit đã chạm ba file mục tiêu kể từ đó, xem §2.1. Việc khoá baseline là ô của Tier 1, không phải của Tier 2 — v1.0 giao sai việc vì Tier 2 bị cấm ghi vào `TASK.md` |
| Modules | Marketplace public projection + landing `/` + browse `/api/jobs` |
| ADR references | `UNIFIED_PLAN_v5.md §7.9.7`; MP-1 projection contract; M1-09 field projection |
| Current execution round | `2` |
| Current audit round | `1` |
| Next gate | `/audit` **round 2** trên spec `v1.4`; đọc `TASK.md` §12, `HANDOFF.md` round 2 và `AUDIT.md` round 1 đã commit |
| Updated | `2026-09-01 16:40 +07` |

Task này đóng khoảng cách cuối cùng giữa dữ liệu tuyển dụng thật và nội dung ứng viên nhìn thấy. Nó không mở rộng schema hay quy trình apply; nó loại dữ liệu bịa, nối các bộ lọc vào API thật và làm cho phân trang/kết quả hiển thị phản ánh đúng projection công khai.

## 1. Outcome

### User-visible outcome

Ứng viên mở `www.hrpartner.vn` và thấy các card việc làm có nội dung trung thực:

- Tên dự án/công việc và vị trí lấy từ Project/StaffingOrderSlot thật.
- Địa điểm lấy từ `slot.workLocation`, fallback `project.siteAddress`; không còn gắn cứng “Miền Bắc Việt Nam”.
- Ca làm lấy từ `shiftStart/shiftEnd`; thiếu dữ liệu thì ẩn, không tự gắn “Toàn thời gian”.
- Số vị trí còn tuyển lấy từ tổng slot hợp lệ và còn trống.
- Không suy lương tháng từ số slot. Vì schema chưa có trường **mức lương công khai** và MP-1 cố ý không trả `hourlyRateVnd`, card không hiện con số lương đoán. Có thể hiện nhãn trung tính “Trao đổi khi liên hệ” hoặc bỏ hẳn chip lương; Tier 2 không được expose `hourlyRateVnd`.
- Nhãn đơn vị tuyển dụng nói đúng vai trò của HRPartner, ví dụ “HRPartner tuyển dụng cho đối tác”; không giả đây là tên Client thật và không lộ `clientCompanyId`/Client nội bộ.
- Bộ lọc nhìn thấy đều hoạt động thật. Từ khóa, địa điểm và ca làm phát request với query tương ứng; ngành nghề chỉ xuất hiện nếu lấy từ dữ liệu canonical. Control không có nguồn dữ liệu thì bị loại khỏi UI, không để đồ trang trí.
- Nút “Tìm kiếm” thực sự refetch; “Tải thêm” dùng `nextOffset` thật, không chạy spinner giả bằng `setTimeout`.
- Empty/loading/error/429/503 vẫn rõ ràng và không xoá kết quả cũ một cách khó hiểu.

### Non-goals

- Không thay đổi RLS principal hoặc transaction boundary của GO-LIVE-04.
- Không sửa migration/policy của GO-LIVE-06.
- Không thêm trường lương public vào schema, không suy diễn lương tháng từ `hourlyRateVnd`, quota hoặc số slot.
- Không công khai tên/id Client, client rate, budget, margin, billing terms hoặc dữ liệu thương mại.
- Không triển khai phone-only Quick Apply. Luồng hiện tại vẫn yêu cầu `fullName + phone + consent`; Quick Apply là slice dữ liệu/UX riêng, cấm placeholder name và cấm làm nullable `CandidateSubmission.fullName` trong task này.
- Không thay đổi RPC apply/tracking, idempotency, rate limit hoặc CV policy.
- Không thiết kế trang job detail mới; chỉ giữ detail API tương thích với projection đã mở rộng additive.
- Không deploy production và không thực hiện launch drill.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/(portal)/page.tsx:56-62` | `salary` được tính từ `availableSlots * 1.5 + 6/9`, hoặc gắn cứng `7 - 12 Triệu` | Đây là dữ liệu bịa; phải xoá hoàn toàn |
| `EV-02` | `app/(portal)/page.tsx:68-72` | `company='HRP Partners'`, `location='Miền Bắc Việt Nam'`, `schedule='Toàn thời gian'` được hardcode | Card không phản ánh dữ liệu Project/Slot |
| `EV-03` | `app/(portal)/page.tsx:427-431,497-501,514-523` | Năm nhóm filter đổi state; submit chỉ bật spinner 300 ms; chỉ keyword lọc client-side | Bốn nhóm control là đồ trang trí; search không gọi API |
| `EV-04` | `app/(portal)/page.tsx:443-456` | `fetch('/api/jobs')` không gửi query; response luôn đặt `hasMore=false` dù API có `nextOffset` | Query/pagination contract đang bị bỏ phí |
| `EV-05` | `app/api/jobs/route.ts` | Route đã parse `q`, `area`, `shift`, `offset`, `limit` | Có đường server-side để nối UI; chỉ thêm tham số canonical nếu thật sự cần |
| `EV-06` | `src/domains/job-board/public.service.ts:3-13` | DTO đã có `position`, `shift`, `location`, `availableSlots`, `deadline`; chưa có dữ liệu card tổng hợp cho nhiều slot | Mở rộng DTO additive, không thay thế projection bằng raw Prisma row |
| `EV-07` | `src/domains/job-board/public.service.ts:27-61` | Projection lấy slot đầu làm position/shift/location nhưng cộng slot trống của tất cả slot | Card có thể ghép số tổng với mô tả của một slot; cần summary deterministic |
| `EV-08` | `src/domains/job-board/public.service.ts:90-102` | `total` đếm Project trước khi loại slot hết hạn/hết chỗ và trước filter shift | `total`/`nextOffset` có thể không bằng tập card thực sự render |
| `EV-09` | `prisma/schema.prisma:345-420` | Nguồn canonical sẵn có: Project name/siteAddress; Client industry; Slot position, shift, validTo, workLocation, hourlyRateVnd | Dùng location/shift/position/industry; **không** dùng hourlyRateVnd làm lương public |
| `EV-10` | `src/domains/job-board/mp1.contract.test.ts` | MP-1 pin public DTO không có `clientCompanyId`, `hourlyRateVnd`, internal notes | Field-projection invariant phải giữ nguyên |
| `EV-11` | `UNIFIED_PLAN_v5.md §7.9.7` | Public projection không được lộ dữ liệu nội bộ; browse phải có rate limit | Mọi DTO mới dùng allow-list và giữ guard GO-LIVE-04/OPS-06A |
| `EV-12` | GO-LIVE-04 contract | Ba public read call site được chuyển sang principal RLS cố định, read-only, test LIVE trên `hrp_mp2_test` | Task 05 kế thừa boundary này; cấm quay lại `$transaction` trần |
| `EV-13` | GO-LIVE-06 contract | Live đang thiếu RLS matrix cho 15 bảng và ticket posture; task 06 phục hồi trước launch proof | Task 05 xếp sau 06 để audit trên posture đích |

### 2.1 Evidence đo lại tại baseline `fb993a7` — thêm ở v1.1, ĐỌC TRƯỚC KHI VIẾT HANDOFF

Anchor cũ `6680011` đã lỗi. Kể từ nó, **sáu commit** đã chạm đúng ba file mục tiêu: `691be38` (go-live-12 trang chi tiết việc làm), `0248948` và `e0a70f7` (hotfix bỏ quan hệ bắt buộc khỏi `select`), `d4928af`, `c32acf9`, `c0fdf76` (go-live-04). Hiện `app/(portal)/page.tsx` dài `617` dòng, `src/domains/job-board/public.service.ts` dài `329` dòng. **Mọi số dòng ở §2 là của anchor cũ; phải tự dẫn lại trên file hiện tại, đừng tin số cũ.**

| ID | Trạng thái v1.1 | Phép đo của Tier 1 tại `fb993a7` |
|---|---|---|
| `EV-01` | **ĐÃ LỖI — defect không còn** | Grep `availableSlots \* 1.5`, `7 - 12`, `Triệu` trên `app/(portal)/page.tsx` → **zero match**. Phép tính lương bịa đã bị xoá bởi một lượt trước đó. ⇒ Phần "xoá lương bịa" **không còn là việc phải làm**, và bất kỳ AC nào đo "grep trả rỗng" sẽ **xanh mà không cần ai làm gì**. Xem `RQ-16` |
| `EV-02` | **Thu hẹp** | Chỉ còn **một** chuỗi hardcode là card data: `company: 'HRP Partners'` tại `:79`. Chuỗi `'Miền Bắc Việt Nam'` đã **không còn**. Chuỗi `'Toàn thời gian'` tại `:100` là **nhãn của một lựa chọn filter**, đó là UI hợp lệ, **không phải** dữ liệu card bịa — cấm xoá nó rồi ghi là đã sửa `EV-02` |
| `EV-04` | **Còn, và nguyên nhân xấu hơn mô tả cũ** | `page.tsx:273` có `setHasMore(false); // API doesn't support pagination yet`. Nhưng `app/api/jobs/route.ts:29-36` **đã parse** `q`, `area`, `shift`, `shiftType` (getAll), `offset`, `limit`. Nên đây không phải "API thiếu phân trang" mà là **client tự tắt phân trang dựa trên một niềm tin sai về API**. Sửa comment sai đó là phần bắt buộc của việc sửa |
| `EV-05` | **Xác nhận, và rộng hơn** | Route parse thêm `shiftType` dạng `getAll` ngoài bốn tham số đã ghi ⇒ có sẵn đường multi-select, không cần thêm tham số mới |
| `EV-06`..`EV-08` | **Số dòng đã lỗi** | `public.service.ts` đã đổi **bốn** lần sau anchor, trong đó `0248948` **đổi chính tập field mà `select` lấy** — tức đúng chủ đề của task này. Phải đọc lại projection hiện tại rồi mới kết luận, không dẫn lại `:3-13`, `:27-61`, `:90-102` |
| `EV-14` | **MỚI — phải bảo toàn** | `page.tsx` đã mang điều hướng của go-live-12: thẻ `Link` của Next tại `:133` và `:152`, `router.push` tại `:118` với comment nêu rõ giữ được middle-click và ctrl-click, và `ApplyModal` đã tách sang `src/domains/job-board/components/apply-modal` rồi dùng lại tại `:604`. Đây là mã đã ACCEPTED và đã chạy production |
| `EV-15` | **MỚI** | `/api/jobs` đã có rate limit `JOB_BROWSE` dùng chung bucket với trang chi tiết (`route.ts:14-20`) ⇒ nối filter vào API **không** được vô tình mở thêm đường gọi không qua guard đó |
| `EV-09` | **Nửa "Client industry" VÔ HIỆU** | `ClientCompany.industry` có thật (`prisma/schema.prisma:313`), nhưng bảng `client_companies` bị `ENABLE` **và** `FORCE ROW LEVEL SECURITY` từ `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql:56`, và principal công khai `MKT` không có policy đọc nó. Chọn quan hệ bắt buộc tới bảng đó trong `select` sẽ ném `Inconsistent query result` trước cả mapper — đúng lớp lỗi của hotfix-01. ⇒ ngành nghề **không có nguồn canonical đọc được từ đường công khai**, và `EV-09` đã hứa một nguồn không dùng được trên thực tế |
| `EV-14` | **Sai một nửa: `router.push` là COMMENT** | `git show 'fb993a7:app/(portal)/page.tsx' \| grep -n router` trả **đúng một** dòng, và nó là chú thích tại `:118` do go-live-12 viết để giải thích vì sao họ **cố ý không** dùng `router.push`. Cơ chế điều hướng thật là hai thẻ `Link` mang `href={detailHref}` (`:134`, `:153`). Không có lệnh gọi nào để bảo toàn ⇒ `RQ-15`/`AC-15` v1.1 đã đòi bảo toàn một thứ chưa từng tồn tại. Tier 2 báo đúng và **không** thêm `router.push` giả để làm xanh grep — đó là hành vi đúng, ghi nhận `ACCEPT_FIX` |
| `EV-16` | **MỚI — defect CÓ TRƯỚC baseline và ĐANG CHẠY production** | `inferIndustry` đã có ở baseline (`git show 'fb993a7:src/domains/job-board/public.service.ts'` `:103-109`), hai call site đều truyền `fallback = null` (`:186`, `:231`) ⇒ giá trị ngành **100%** suy từ văn bản tự do, nhánh **đầu tiên** là `/kho\|van tai\|logistic\|warehouse/` chạy trên chuỗi đã bỏ dấu, nên "không" gập thành "khong" ⊃ "kho" ⇒ một câu tiếng Việt bình thường bị dán nhãn `'Kho vận'`; hết nhánh thì trả nhãn cứng `'Công nghiệp chế tạo'`. Và giá trị đó **được in cho người dùng**: `app/(jobs)/viec-lam/[slug]/page.tsx:137-138` render hai chip `JOB_TYPE_LABELS[job.jobType]` và `job.industry`, khoá bởi `src/domains/job-board/public-detail.static.test.ts:110-111`, commit `691be38` đã deploy. **Round 1 không tạo ra nó** — Tier 2 kế thừa và khai báo đúng (`DEV-06`) |


## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Không hiển thị con số lương nếu chưa có field public canonical. Xoá phép tính từ slot; không expose `hourlyRateVnd` | Tier 1 + MP-1/M1-09 | Final |
| `DEC-02` | `CHOSEN` | Card ghi HRPartner là bên tuyển dụng cho đối tác; không công khai Client identity trong task này | Tier 1 / data minimization | Final |
| `DEC-03` | `CHOSEN` | DTO mở rộng theo allow-list với các summary thật: `positions`, `locations`, `shifts`; giữ field đơn hiện hữu để backward compatibility và derive từ phần tử đầu của danh sách đã sort | Tier 1 | Final |
| `DEC-04` | `CHOSEN` | Mọi summary array unique, bỏ chuỗi rỗng, sort ổn định; card hiển thị tối đa ba giá trị và nhãn “+N” nếu còn thêm | Tier 1 | Final |
| `DEC-05` | `CHOSEN` | Tập slot hợp lệ dùng cùng invariant publish: order `OPEN\|CLOSING_SOON`, deadline chưa qua; slot `validTo` chưa qua; remaining `max(0, needed-filled)>0` | Existing public projection | Final |
| `DEC-06` | `CHOSEN` | `total` và `nextOffset` được tính trên tập DTO đã qua `DEC-05` và filter, không trên candidate Project thô | Tier 1 / truthful pagination | Final |
| `DEC-07` | `CHOSEN` | UI chỉ hiển thị filter có dữ liệu canonical. `keyword`, `area`, `shift`, `industry` được phép; `job type` bị bỏ vì schema không có; “xoay ca” không được tự suy từ giờ bắt đầu/kết thúc | Tier 1 | Final |
| `DEC-08` | `CHOSEN` | Facet `areas/industries/shifts` nếu thêm phải được derive từ toàn tập public hợp lệ, không từ riêng trang hiện tại; không hardcode danh sách tỉnh/ngành/ca trong UI | Tier 1 | Final |
| `DEC-09` | `CHOSEN` | Submit filter tạo query URL bằng `URLSearchParams`, reset offset về 0, huỷ/ignore response cũ khi request mới thắng; load-more giữ nguyên filter snapshot | Tier 1 | Final |
| `DEC-10` | `CHOSEN` | Response DTO vẫn chỉ trả public allow-list; BigInt không được đi vào JSON. `hourlyRateVnd`, client/budget/margin/billing fields phải vắng | Security baseline | Final |
| `DEC-11` | `CHOSEN` | Quick Apply không được giả bằng placeholder name. Task này giữ form full application hiện tại; residual ghi rõ trong HANDOFF | OPS-06A decision | Final |
| `DEC-12` | `ASSUMPTION` | Số Project public ở giai đoạn Marketplace MVP đủ nhỏ để tính projection/facets chính xác trước tối ưu hoá; nếu measurement cho thấy query vượt ngân sách, Tier 2 dừng và báo số liệu, không tự trả total gần đúng | Tier 1 | Tới OPS-07 |
| `DEC-13` | `CHOSEN` | **Ghi đè nửa `industry` của `DEC-07`.** Bỏ **control** ngành nghề khỏi bề mặt browse: dropdown ở `app/(portal)/page.tsx`, facet `industries`, `opts.industry` của service và tham số `industry` của `app/api/jobs/route.ts`. Lý do là chính luật của `DEC-07`: control không có nguồn dữ liệu canonical thì bị loại khỏi UI, không để đồ trang trí. `client_companies` bị FORCE RLS và `MKT` không đọc được (`EV-09`) ⇒ không có nguồn; suy diễn regex trên văn bản tự do KHÔNG phải nguồn canonical. **Giới hạn có ý thức:** hai khóa `industry`/`jobType` của DTO và bản thân `inferIndustry` **KHÔNG bị chạm trong task này**, vì go-live-12 render chúng và `RQ-15` cấm sửa mã đó — chuyển sang task tiếp nối (`EV-16`) | Tier 1 | Final, thay nửa `industry` của `DEC-07` |
| `DEC-14` | `CHOSEN` | Đăng ký lane LIVE cần **cả hai** file config: `vitest.integration.config.ts` đặt cờ theo `TEST_DB_ADMIN`, và `vitest.unit.config.ts` ghim cờ về chuỗi rỗng để lane unit không bao giờ mở kết nối DB. Đúng khuôn mẫu của bốn lane LIVE đã có trong repo, và phần ghim ở lane unit là fail-closed ⇒ hợp lệ trong scope, không phải deviation | Tier 1, chuẩn thuận báo cáo của Tier 2 | Final |
| `DEC-15` | `CHOSEN` | `DEC-03` đặt tên mảng vị trí là `positions`; tên thực thi là `positionTitles`, vì `PublicJobDetailDto extends PublicJobDto` của go-live-12 đã dùng `positions` cho một kiểu khác nên trùng tên là lỗi compiler, và sửa phía detail thì vi phạm `RQ-15`. Kiểu và ngữ nghĩa không đổi. Tên `positionTitles` là tên chuẩn từ v1.2 | Tier 1, chuẩn thuận báo cáo của Tier 2 | Final, thay tên trong `DEC-03` |
| `DEC-16` | `CHOSEN` | **Hợp thức `DEV-09`: `src/domains/job-board/mp1.contract.test.ts` được sửa dù v1.2 không liệt kê nó.** Cùng dạng bắt buộc như `DEC-14`: `STEP-12` bỏ khóa `industry` khỏi kiểu `opts`, nên lời gọi cũ trong file test này thành lỗi excess-property `TS2353` và typecheck exit 2 — mà `RQ-18` lại đòi typecheck exit 0. Không có cách nào thoả cả hai mà không chạm file này. **Bound tới từng ký tự, Tier 1 đã tự đọc diff:** đúng một hunk tại `@@ -99,7 +99,8 @@`, numstat `2 / 1`, dòng bị bỏ là `industry: 'Kho vận',` trong đối tượng `opts`, thay bằng hai dòng chú thích dẫn `DEC-13`; sáu test của file vẫn xanh và ba nhóm assertion DTO không đổi. **Phép đo Tier 3 chạy lại được:** `git diff --numstat` trên đúng path đó trả hai số `2` và `1`; `git diff` trên cùng path chỉ chứa một hunk; và `git diff` trên cùng path lọc qua `grep -c '^[-+].*expect'` trả `0`, chứng minh không assertion nào bị thêm hay bớt | Tier 1, chuẩn thuận báo cáo `DEV-09` của Tier 2 sau khi tự đọc diff | Final |
| `DEC-17` | `CHOSEN` | **`ENV_BLOCKED` không phải token verdict của pipeline, và đó là lỗi của Tier 1.** `verify-audit.ps1:97` chỉ nhận `(PASS|FAIL|PARTIAL|BLOCKED|N/A)` ở cột verdict của §2 AUDIT; `grep -rn ENV_BLOCKED .ai-pipeline/` trả **rỗng** ⇒ chuỗi này do Tier 2 tự đặt trong HANDOFF, còn `BLK-01` là **mã blocker** của `.ai-pipeline/templates/HANDOFF.template.md:49`, không phải verdict. §11 mục 4 của v1.2 và v1.3 đã chỉ thị Tier 3 ghi một token mà gate **không thể** nhận ⇒ FAIL là tất yếu, không phải lỗi Tier 3. Từ v1.4: cột verdict ghi `BLOCKED`; chữ `ENV_BLOCKED`, `BLK-01` và lý do môi trường ghi trong **ô evidence** cùng câu lệnh và exit code. Luật này áp cho mọi task còn lại có AC phụ thuộc môi trường | Tier 1 / `verify-audit.ps1:97` + `.ai-pipeline` grep | `ACTIVE` |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Xoá toàn bộ salary math dựa trên `availableSlots`; public response/UI không có `hourlyRateVnd` | Must | `EV-01/10`, `DEC-01/10` | Field/con số suy đoán còn tồn tại → FAIL |
| `RQ-02` | Card dùng location/shift/position từ projection thật; thiếu field thì ẩn hoặc ghi trạng thái trung tính, không hardcode | Must | `EV-02/06/07`, `DEC-03..05` | Hardcode hoặc ghép sai slot → FAIL |
| `RQ-03` | Nhãn recruiter trung thực, không giả tên Client và không lộ Client identity | Must | `DEC-02/10` | Client/id thương mại xuất hiện → P0 |
| `RQ-04` | Projection tổng hợp mọi slot hợp lệ thành unique sorted `positions/locations/shifts` và slot remaining đúng | Must | `DEC-03..05` | Slot expired/full lọt vào summary → FAIL |
| `RQ-05` | `total`, page slice và `nextOffset` cùng dựa trên tập DTO sau lifecycle/filter | Must | `EV-08`, `DEC-06` | Total/nextOffset sai → FAIL |
| `RQ-06` | Search submit gửi query thật; response cũ không overwrite response mới | Must | `EV-03..05`, `DEC-09` | Spinner giả hoặc race stale → FAIL |
| `RQ-07` | Filter hiển thị chỉ được dựng từ **cột canonical**; job type và mọi filter không có backing bị loại. **Sửa ở v1.2 vì bản v1.1 báo xanh trên dữ liệu bịa:** một facet suy từ regex trên văn bản tự do vẫn "dựng từ tập eligible" và vẫn "có tác dụng", nên câu chữ cũ thoả mãn được bằng chính defect mà task này tồn tại để xoá. Từ v1.2: nguồn của một facet phải là cột canonical đọc được từ principal công khai, không phải giá trị suy diễn | Must | `DEC-07/08`, `DEC-13`, `EV-09`, `EV-16` | Control trang trí còn lại, hoặc facet dựng từ giá trị suy diễn → FAIL |
| `RQ-08` | Load-more dùng `nextOffset`, append có dedupe theo `job.id`, giữ filter snapshot và stop khi null | Must | `EV-04`, `DEC-09` | Spinner/timer giả hoặc duplicate card → FAIL |
| `RQ-09` | Empty/loading/error/429/503/retry không báo thành công giả và không làm mất dữ liệu đang hiển thị khi refetch lỗi | Must | OPS-06A | Error state che/xoá toàn bộ kết quả cũ → FAIL |
| `RQ-10` | GO-LIVE-04 RLS read context, limiter order và read-only transaction giữ nguyên | Must | `EV-11/12` | `$transaction` trần, ADMIN elevation hoặc DB trước limiter → P0 |
| `RQ-11` | List/detail DTO tương thích additive; apply modal tiếp tục dùng canonical `slug`, idempotency và consent | Must | MP-1/MP-2 | Apply/tracking regression → FAIL |
| `RQ-12` | Test khóa mọi hardcode/salary math/decorative filter và test projection nhiều slot/hết hạn/null | Must | All decisions | Không có regression test → BLOCK |
| `RQ-13` | Full gates và LIVE test trên `hrp_mp2_test` PASS; không fallback `hrp-live`, không mock-pass | Must | Pipeline | ENV thiếu → `ENV_BLOCKED`, không PASS |
| `RQ-14` | HANDOFF ghi residual Quick Apply và performance của facet scan; không kể task này là Affiliate hoặc full search engine | Must | `DEC-11/12` | False completion → BLOCK |
| `RQ-15` | **Bảo toàn mã đã ACCEPTED của go-live-12.** Không xoá và không nhúng lại: **hai** thẻ `Link` của Next mang `href={detailHref}` dẫn từ card sang trang chi tiết việc làm, và `ApplyModal` phải tiếp tục được import từ `src/domains/job-board/components/apply-modal`. Nối filter và phân trang là thêm hành vi, KHÔNG được viết lại card thành phiên bản trước go-live-12. **Sửa ở v1.2:** v1.1 đòi bảo toàn `router.push` — ở baseline `:118` đó là **chú thích**, không phải lệnh gọi (`EV-14`); yêu cầu đó bị rút, và tuyệt đối không thêm `router.push` để làm xanh grep | Must | `EV-14` | Hồi quy bề mặt đang chạy production → BLOCK |
| `RQ-16` | **Không được tính trạng thái đã đạt sẵn thành việc đã làm.** Với mỗi AC mà baseline `fb993a7` đã thoả, HANDOFF phải ghi `ĐÃ ĐẠT SẴN` kèm phép đo. Tối thiểu: `EV-01` — phép tính lương bịa đã không còn ở baseline, nên AC nào đo "grep trả rỗng" sẽ xanh mà không cần ai làm gì | Must | `EV-01`, §2.1 | Báo xanh trên tiền đề sai → BLOCK |
| `RQ-17` | Xoá comment sai ở `page.tsx` khẳng định API chưa hỗ trợ phân trang, và tính `hasMore` từ response thật. `app/api/jobs/route.ts` đã parse `offset` và `limit`, nên niềm tin đó là sai từ trước | Must | `EV-04`, `EV-05` | Giữ lại một khẳng định sai trong mã → BLOCK |
| `RQ-18` | **Loại control ngành nghề khỏi bề mặt browse.** Bỏ dropdown ngành ở `app/(portal)/page.tsx` cùng state và query param của nó, bỏ facet `industries` khỏi payload facets, bỏ `opts.industry` khỏi service, bỏ tham số `industry` khỏi `app/api/jobs/route.ts`. **Ranh giới cứng — KHÔNG chạm trong round này:** hai khóa `industry`/`jobType` của `PublicJobDto`, hàm `inferIndustry`, và mọi file của go-live-12; ba thứ đó là defect có trước baseline và đang chạy production, thuộc task tiếp nối (`EV-16`). Cấm mọi filter/facet công khai **mới** lấy nguồn từ suy diễn văn bản tự do. **Được phép** tính từ cột canonical: `shiftType` từ `shiftStart`/`shiftEnd`, `availableSlots` từ `slotsNeeded`/`slotsFilled`, và gập dấu hai phía khi **khớp** truy vấn tìm kiếm — đó là so khớp, không phải khẳng định in ra cho người dùng | Must | `DEC-13`, `EV-09`, `EV-16` | Control không có nguồn canonical còn lại, hoặc round này chạm khóa DTO / `inferIndustry` / file go-live-12 → FAIL |
| `RQ-19` | Cờ lane LIVE `GOLIVE05_LIVE_CARD_TRUTH` phải được khai ở **cả hai** file config: `vitest.integration.config.ts` đặt theo `TEST_DB_ADMIN`, `vitest.unit.config.ts` ghim về chuỗi rỗng. Hợp thức hoá hai file mà round 1 đã sửa ngoài §4.2 | Must | `DEC-14` | Thiếu một trong hai ⇒ `describe.skipIf` mất nghĩa hoặc lane unit mở kết nối DB → FAIL |

### 4.2 Scope boundaries

**In scope:**

- `src/domains/job-board/public.service.ts`
- `app/api/jobs/route.ts` — chỉ query parsing/DTO handoff, giữ guard và GO-LIVE-04 boundary
- `app/(portal)/page.tsx`
- `src/domains/job-board/public-card-truth.test.ts` — mới
- `src/domains/applications/marketplace-browse.routes.test.ts` — cập nhật additive contract nếu cần
- `src/domains/applications/marketplace-inventory.static.test.ts` — thêm invariant chống dữ liệu bịa nếu phù hợp
- `src/domains/job-board/public-card-truth.integration.test.ts` — mới
- `vitest.integration-files.ts` — chỉ đăng ký file LIVE mới
- `vitest.integration.config.ts` — **thêm ở v1.2** (`DEC-14`), chỉ một dòng cờ `GOLIVE05_LIVE_CARD_TRUTH`
- `vitest.unit.config.ts` — **thêm ở v1.2** (`DEC-14`), chỉ một dòng ghim cờ về chuỗi rỗng. File này đã ở trạng thái ` M` từ lane go-live-11 trước khi round 1 bắt đầu; chỉ dòng cờ này thuộc task 05
- `src/domains/job-board/mp1.contract.test.ts` — **thêm ở v1.3** (`DEC-16`), chỉ **một khóa** `industry` bị bỏ khỏi đối tượng `opts` truyền vào `listPublicJobProjection`. Sửa bắt buộc ở mức kiểu: `STEP-12` bỏ khóa đó khỏi kiểu `opts` nên dòng cũ thành lỗi excess-property `TS2353` và typecheck exit 2. Ba nhóm assertion DTO của file này **không được đổi một ký tự**
- `docs/tasks/hrp-v5-go-live-05-public-card-truth/HANDOFF.md`

**Out of scope:**

- `prisma/schema.prisma`, mọi `prisma/migrations/**`
- RLS policy/helper, `withDbContext`, public principal của GO-LIVE-04
- Apply/tracking route/service/RPC
- Affiliate/referral cookie/token/snapshot
- Raw CV/R2
- Admin pages
- Middleware/domain/Vercel config
- Public client identity và public compensation schema
- **Thêm ở v1.2:** `app/(jobs)/viec-lam/[slug]/page.tsx`, `src/domains/job-board/public-detail.static.test.ts` và mọi file khác của go-live-12 — hai chip ngành/loại hình đang in giá trị suy diễn trên production (`EV-16`) là task tiếp nối, không phải task này
- **Thêm ở v1.2:** hai khóa `industry`/`jobType` của `PublicJobDto` và hàm `inferIndustry` — xoá chúng làm vỡ compile ở file out-of-scope nêu trên và vi phạm `RQ-15`

### 4.3 Data, State, Permission và Interface Rules

- **Data:** chỉ Project/StaffingOrder/Slot public hợp lệ được project. Không return raw row hoặc spread object.
- **State:** lifecycle filter đồng nhất `DEC-05`; thời gian dùng một `now` duy nhất trong một request để tránh slot thay đổi giữa phép tính.
- **Permission/data scope:** anonymous read đi qua principal của GO-LIVE-04; DTO deny-by-default cho field không nêu trong interface.
- **Interface:** thay đổi additive; giữ `id`, `slug`, `title`, `position`, `shift`, `location`, `availableSlots`, `deadline`, `statusLabel`; array/facets mới có type rõ.
- **Failure/idempotency/concurrency:** GET không mutation. UI dùng request generation hoặc `AbortController` để response cũ không thắng; retry không append trùng.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-10/13` | Repo + task | Khóa baseline sau GO-LIVE-04/06; chạy verify-task và RED probes cho hardcode/filter/total | Git/pipeline | SHA + RED output | Dependency chưa ACCEPTED → dừng |
| `STEP-02` | `RQ-02..05` | `public.service.ts` | Refactor pure projection cho eligible slots và summary arrays/facets/true pagination | Prisma/TS | Focused unit | Cần schema mới → dừng |
| `STEP-03` | `RQ-01/03/10` | DTO | Giữ allow-list, loại rate/client/internal field, pin JSON string-safe | Security projection | DTO key assertions | Bất kỳ sensitive field → dừng |
| `STEP-04` | `RQ-06/07` | API + portal | Nối search query và canonical facets; bỏ control không có backing | React/Route | Route + component tests | Phải hardcode facet → dừng |
| `STEP-05` | `RQ-08/09` | Portal state | Implement initial/refetch/load-more, race guard, dedupe, stable old data on error | React | State tests/static checks | Timer giả còn lại → dừng |
| `STEP-06` | `RQ-11` | Apply modal | Giữ slug/apply/idempotency/consent; chỉ đổi props card cần thiết | MP-2 contract | Existing apply tests | Apply payload đổi → dừng |
| `STEP-07` | `RQ-12` | Tests | Thêm multi-slot/expiry/null/facet/pagination/race/hardcode tests | Vitest | Focused PASS | Test chỉ grep mà không kiểm behavior → bổ sung |
| `STEP-08` | `RQ-13` | Test DB | Seed fixture isolated trên `hrp_mp2_test`, chạy list/detail/filter/page, tự cleanup | Integration lane | LIVE log | Chạm `hrp-live` → dừng |
| `STEP-09` | `RQ-13` | Full repo | verify-task, Prisma validate, typecheck, lint, unit, integration opt-in, build, diff-check | Pipeline | Exit codes | Gate đỏ → BLOCK |
| `STEP-10` | `RQ-14` | HANDOFF | Ghi exact diff, evidence, deviations, residual Quick Apply/perf | Template | verify handoff manually | Không đủ evidence → không audit |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Không còn phép tính/literal lương giả; DTO không có `hourlyRateVnd` | Static + unit | grep output + DTO keys | Yes |
| `AC-02` | `RQ-02/04` | Fixture nhiều slot render đúng positions/locations/shifts/remaining; expired/full bị loại | Unit | Input/output exact | Yes |
| `AC-03` | `RQ-03` | Card dùng recruiter label đúng và không lộ client identity | Static + response scan | Zero forbidden keys | Yes |
| `AC-04` | `RQ-05` | `total`, jobs page và `nextOffset` đúng trên tập sau filter | Unit matrix | Exact pages | Yes |
| `AC-05` | `RQ-06` | Submit keyword/area/shift tạo query đúng và refetch — **`industry` bị rút khỏi danh sách ở v1.2** theo `DEC-13` | UI/route test | Captured URL | Yes |
| `AC-06` | `RQ-07` | Mọi filter hiển thị có tác dụng **và** mỗi facet truy nguyên được về một cột canonical đọc được từ principal công khai; không còn job type/filter trang trí. **Không được thoả bằng facet suy diễn:** phải chỉ ra tên cột nguồn cho từng facet còn lại, và grep chứng minh không facet nào lấy nguồn từ một hàm suy diễn văn bản tự do | Static + interaction | Before/after rows, cộng bảng facet ứng với cột nguồn | Yes |
| `AC-07` | `RQ-08` | Load-more append đúng, không duplicate, dừng khi null | UI state test | Request sequence | Yes |
| `AC-08` | `RQ-09` | 429/503/refetch failure giữ dữ liệu cũ và hiện retry message | UI tests | DOM/state evidence | Yes |
| `AC-09` | `RQ-10` | Limiter chạy trước DB; public read dùng GO-LIVE-04 context, không ADMIN | Existing + updated static tests | Call-order assertions | Yes |
| `AC-10` | `RQ-11` | Apply modal vẫn POST canonical slug, key + consent; success chỉ sau 201 code | Existing route/UI tests | PASS output | Yes |
| `AC-11` | `RQ-12` | Regression tests khóa hardcode, sensitive keys và multi-slot semantics | Focused Vitest | Test list + PASS | Yes |
| `AC-12` | `RQ-13` | LIVE test DB chứng minh list/detail/filter/pagination bằng dữ liệu thật và cleanup | Integration opt-in | Command + exit + masked output | Yes |
| `AC-13` | `RQ-13` | Prisma validate, typecheck, lint, full unit, build, diff-check đều exit 0 | Mandatory gates | Command tails | Yes |
| `AC-14` | `RQ-14` | HANDOFF nói rõ Quick Apply chưa làm và facet performance còn cần OPS-07 đo tải | Document review | Exact section | Yes |
| `AC-15` | `RQ-15` | Điều hướng của go-live-12 còn nguyên: `app/(portal)/page.tsx` vẫn có **hai** thẻ `Link` của Next mang `href={detailHref}`, và `ApplyModal` vẫn được import từ `src/domains/job-board/components/apply-modal` chứ không bị nhúng lại vào trang. **Sửa ở v1.2:** không đo `router.push` nữa (`EV-14`), và sự có mặt của một `router.push` mới là FAIL | Grep cộng `git diff` | Hai lượt grep có match cộng số lần khớp của `Link`, cộng khẳng định diff không xoá chúng | Yes |
| `AC-16` | `RQ-16` | Với **mỗi** AC mà trạng thái "trước" đã đạt sẵn tại baseline `fb993a7`, HANDOFF ghi rõ **ĐÃ ĐẠT SẴN** kèm phép đo, thay vì tính nó thành việc đã làm. Tối thiểu phải nêu `EV-01` | Document review cộng grep | Bảng liệt kê từng AC dạng đã-đạt-sẵn | Yes |
| `AC-17` | `RQ-17` | `page.tsx` không còn comment khẳng định API thiếu phân trang, và `hasMore` được suy từ response thật chứ không gán cứng `false` | Grep cộng đọc code | Grep chuỗi comment cũ trả rỗng; chỉ ra dòng tính `hasMore` mới | Yes |
| `AC-18` | `RQ-18` | Bốn phép grep trả **rỗng** trên bề mặt browse: dropdown và state ngành ở `app/(portal)/page.tsx`, khóa `industries` trong payload facets, `opts.industry` trong service, tham số `industry` trong `app/api/jobs/route.ts`. Và bốn phép đo trả **có match, không đổi so với baseline**: `inferIndustry` còn nguyên trong service, hai khóa `industry`/`jobType` còn trong `PublicJobDto`, và `git diff --numstat` của hai file go-live-12 nêu ở §4.2 Out of scope là **rỗng** | Grep hai chiều cộng `git diff --numstat` | Tám dòng lệnh kèm exit code và output | Yes |
| `AC-19` | `RQ-19` | Grep `GOLIVE05_LIVE_CARD_TRUTH` khớp đúng một dòng ở mỗi file config, giá trị ở lane integration phụ thuộc `TEST_DB_ADMIN` và ở lane unit là chuỗi rỗng; `npm run test:unit` exit 0 và lane LIVE bị `describe.skipIf` bỏ qua chứ không fail | Grep cộng chạy lane unit | Hai dòng grep cộng đuôi output lane unit kèm exit code | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-03`, `STEP-07` | `AC-01` |
| `RQ-02` | `STEP-02`, `STEP-04` | `AC-02` |
| `RQ-03` | `STEP-03`, `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-02` | `AC-02` |
| `RQ-05` | `STEP-02`, `STEP-07`, `STEP-08` | `AC-04`, `AC-12` |
| `RQ-06` | `STEP-04`, `STEP-05`, `STEP-07` | `AC-05` |
| `RQ-07` | `STEP-04`, `STEP-07` | `AC-06` |
| `RQ-08` | `STEP-05`, `STEP-07` | `AC-07` |
| `RQ-09` | `STEP-05`, `STEP-07` | `AC-08` |
| `RQ-10` | `STEP-01`, `STEP-03`, `STEP-09` | `AC-09` |
| `RQ-11` | `STEP-06`, `STEP-07` | `AC-10` |
| `RQ-12` | `STEP-07` | `AC-11` |
| `RQ-13` | `STEP-01`, `STEP-08`, `STEP-09` | `AC-12`, `AC-13` |
| `RQ-14` | `STEP-10` | `AC-14` |
| `RQ-15` | `STEP-01`, `STEP-10` | `AC-15` |
| `RQ-16` | `STEP-10` | `AC-16` |
| `RQ-17` | `STEP-07` | `AC-17` |
| `RQ-18` | `STEP-11`, `STEP-12`, `STEP-13`, `STEP-15` | `AC-18`, `AC-06` |
| `RQ-19` | `STEP-14` | `AC-19` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Vô tình công khai rate/client data | DTO có forbidden key | Allow-list + negative tests | Revert commit, unpublish jobs nếu đã deploy |
| `RISK-02` | Summary ghép dữ liệu từ slot hết hạn | Test fixture mismatch | Một pure eligible-slot function | Revert projection change |
| `RISK-03` | Total đúng nhưng query tốn tài nguyên | Latency/row scan tăng mạnh | Đo fixture lớn, ghi OPS-07; stop theo `DEC-12` | Giữ UI không hiển thị total, mở performance task |
| `RISK-04` | Filter request race | Kết quả cũ overwrite | Abort/generation guard | Revert UI state change |
| `RISK-05` | Scope đè code GO-LIVE-04 | Diff đổi principal/context | AC-09 và path review | Revert riêng route diff |
| `RISK-06` | UI bỏ filter khiến stakeholder tưởng mất chức năng | Control decorative bị loại | HANDOFF nêu nguồn dữ liệu thiếu; chỉ giữ chức năng thật | Re-add sau schema/facet contract riêng |
| `RISK-07` | BigInt serialization | Rate lọt DTO | Cấm rate, exact DTO tests | Revert projection |
| `RISK-08` | Quick Apply bị làm lén bằng placeholder | `fullName='Unknown'` hoặc nullable schema | Out-of-scope + grep/diff audit | Reject round |

## 8. Open Questions

Không còn câu hỏi chặn execution. Public compensation, Client identity và phone-only Quick Apply đều đã được phân loại thành feature riêng; Tier 2 không được tự chọn trong task này.

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-30` | Contract ban đầu; chốt truthful DTO/card/filter/pagination, cấm lương suy đoán và dữ liệu Client | Khảo sát code + roadmap GO-LIVE-04→06→05 |
| `v1.1` | `2026-09-01` | **Bump giữa lúc Tier 2 đang thi hành round 1 — bằng chứng đã làm vẫn hợp lệ, KHÔNG mở round mới.** Bốn nhóm thay đổi: (1) khoá baseline về SHA thật `fb993a7` và sửa lỗi giao việc của v1.0, vì nó bảo Tier 2 tự khoá baseline trong khi Tier 2 bị cấm ghi vào `TASK.md`; (2) thêm §2.1 đo lại toàn bộ evidence tại baseline mới — `EV-01` **đã lỗi** vì phép tính lương bịa không còn, `EV-02` thu hẹp về đúng một chuỗi tại `:79` và cấm xoá nhãn filter ở `:100` rồi kể là đã sửa, `EV-04` còn nhưng nguyên nhân là client tự tắt phân trang dựa trên niềm tin sai về API, `EV-06..EV-08` mất hiệu lực số dòng vì `public.service.ts` đã đổi bốn lần trong đó `0248948` đổi chính tập field của `select`; (3) `RQ-15`/`AC-15` bảo toàn điều hướng card và `ApplyModal` đã tách của go-live-12, là mã đã ACCEPTED và đang chạy production; (4) `RQ-16`/`AC-16` cấm tính trạng thái đã-đạt-sẵn thành việc đã làm, và `RQ-17`/`AC-17` buộc xoá comment sai trong mã | Tier 2 bắt đầu round 1 khi contract còn v1.0. Tier 1 đo lại và thấy anchor `6680011` đã lỗi: **sáu commit** chạm ba file mục tiêu kể từ đó, gồm go-live-12 và hai hotfix đường đọc công khai. Không bump thì Tier 2 sẽ sửa thứ đã được sửa, và một AC sẽ báo xanh mà không ai làm gì |
| `v1.2` | `2026-09-01` | **Mở execution round 2, phạm vi hẹp một hạng mục — bằng chứng round 1 VẪN HỢP LỆ, không làm lại.** Sáu nhóm thay đổi. (1) `EV-09`: vô hiệu nửa "Client industry" — cột tồn tại nhưng `client_companies` bị FORCE RLS và principal công khai `MKT` không có policy đọc, nên contract đã hứa một nguồn không dùng được. (2) `EV-14`: sửa lỗi của chính Tier 1 — `router.push` tại `:118` là **chú thích**, không phải lệnh gọi; `RQ-15`/`AC-15` bỏ yêu cầu đó. (3) `EV-16`: ghi nhận defect **có trước baseline và đang chạy production** — `inferIndustry` suy nhãn ngành từ văn bản tự do, nhánh đầu khớp "khong" trong "không", và giá trị đó in thành chip trên trang chi tiết của go-live-12. (4) `DEC-13` ghi đè nửa `industry` của `DEC-07`, `DEC-14` hợp thức hai file config lane, `DEC-15` chốt tên `positionTitles`. (5) `RQ-18`/`AC-18` và `RQ-19`/`AC-19` mới; `RQ-07`/`AC-06` viết lại vì câu chữ v1.1 **báo xanh trên dữ liệu bịa**; `AC-05` rút `industry`. (6) §4.2 nhận hai file config vào In scope và ghim file go-live-12 cùng hai khóa DTO vào Out of scope. (7) Sửa một dấu gạch dọc chưa escape trong `DEC-05` có từ v1.0 làm hàng đó render lệch một cột — chỉ là hiển thị, nội dung quyết định không đổi | Tier 1 tự đo lại HANDOFF round 1: mọi số khớp, `1504` test PASS, nhưng `DEV-06` phơi ra một defect thật. Không bump thì Tier 3 sẽ đo `AC-06` đúng mặt chữ và **PASS trên dữ liệu suy diễn**, hoặc FAIL Tier 2 vì một defect mà contract đã mời gọi |
| `v1.3` | `2026-09-01` | **Bump sau khi round 2 đã giao HANDOFF, TRƯỚC khi `/audit` chạy — bằng chứng của round 1 và round 2 VẪN HỢP LỆ, KHÔNG mở round mới.** Bốn nhóm thay đổi, tất cả là ghi nhận, không thêm việc: (1) `DEC-16` hợp thức `DEV-09` — `src/domains/job-board/mp1.contract.test.ts` buộc phải sửa vì `STEP-12` làm dòng cũ thành `TS2353`, bound ghi tới từng ký tự sau khi Tier 1 tự đọc diff; (2) §4.2 In scope nhận file đó với giới hạn một khóa và điều kiện ba nhóm assertion DTO không đổi; (3) Control chuyển `READY_FOR_AUDIT` và ghi lại kết quả Tier 1 tự đo lại round 2; (4) `Next gate` trỏ `/audit` trên v1.3. Không sửa một `RQ`, `AC`, `STEP` hay `DEV` nào | Bump **phải** rơi vào cửa sổ giữa HANDOFF và `AUDIT.md`: `verify-audit.ps1` so spec version giữa `TASK.md` và `AUDIT.md`, nên hợp thức hoá sau khi có `AUDIT.md` sẽ FAIL gate và mất một round. Không hợp thức thì Tier 3 gặp một file sửa ngoài §4.2 và phải chọn giữa báo vi phạm scope hay bỏ qua — cả hai đều sai |
| `v1.4` | `2026-09-01` | **Bump SAU khi audit round 1 đã FAIL gate — vì thế miễn phí: `AUDIT.md` phải viết lại cho round 2, nên phép so spec version giữa TASK và AUDIT không mất gì.** Bốn nhóm thay đổi: (a) năm ô Control sang `AUDIT_ROUND_1_FAILED`, `Current audit round` `0` → `1`, next gate là audit round 2 trên `v1.4`; (b) thêm `DEC-17` đóng lỗi token verdict của chính Tier 1; (c) thêm §12 ghi bốn finding đối với audit round 1 và brief cho round 2; (d) dòng revision log này. **Không** thêm `RQ`, `STEP`, `AC` nào; **không** mở execution round; bằng chứng execution round 1 và round 2 **VẪN HỢP LỆ** | Tier 1 tự chạy `verify-audit.ps1` → exit `2`; `Current audit round` của TASK là `0` trong khi AUDIT tự khai `Audit round 2`; `git log -- AUDIT.md` rỗng trước commit `8360136` |

## 11. Execution round 2 — phạm vi hẹp

Round 1 đã `READY_FOR_AUDIT` và Tier 1 đã tự đo lại: `1504`/`1504` test PASS exit 0, numstat khớp từng dòng, `HEAD` vẫn `a87cb86`. **Không làm lại bất cứ việc nào của round 1.** Round 2 chỉ đóng một hạng mục, cộng hợp thức hoá hai file config.

| Step | Việc | File | Chốt |
|---|---|---|---|
| `STEP-11` | Bỏ dropdown ngành nghề cùng state, `EMPTY_FILTERS` entry và `params.set` của nó | `app/(portal)/page.tsx` | Không còn control nào không có nguồn canonical |
| `STEP-12` | Bỏ facet `industries` khỏi payload facets và bỏ `opts.industry` khỏi nhánh lọc | `src/domains/job-board/public.service.ts` | `inferIndustry` và hai khóa DTO **giữ nguyên** |
| `STEP-13` | Bỏ tham số `industry` khỏi query parsing | `app/api/jobs/route.ts` | Giữ nguyên thứ tự limiter, guard và read-only transaction của GO-LIVE-04 |
| `STEP-14` | Giữ nguyên hai dòng cờ lane đã thêm ở round 1, không sửa gì thêm | `vitest.integration.config.ts`, `vitest.unit.config.ts` | `DEC-14` đã hợp thức hoá; chỉ cần đo lại |
| `STEP-15` | Cập nhật test đang khoá facet/param ngành cho khớp trạng thái mới, thêm assertion âm cấm facet suy diễn quay lại | `src/domains/applications/marketplace-inventory.static.test.ts`, `src/domains/applications/marketplace-browse.routes.test.ts`, `src/domains/job-board/public-card-truth.test.ts` | Test phải FAIL nếu ai đó nối lại một facet suy diễn |
| `STEP-16` | Cập nhật HANDOFF: một mục round 2 riêng, không viết lại phần round 1 | `docs/tasks/hrp-v5-go-live-05-public-card-truth/HANDOFF.md` | `DEV-06` đổi trạng thái thành "chuyển task tiếp nối theo `DEC-13`" |

**Bốn cảnh báo cho Tier 2:**

1. `app/api/jobs/route.ts` mất một tham số nên md5 của file **sẽ đổi**. Đó không phải hồi quy `AC-09`: `AC-09` đo thứ tự limiter, RLS context và read-only transaction, không đo byte identity. Ghi rõ md5 trước và sau trong HANDOFF.
2. **Không** xoá `inferIndustry`, **không** xoá hai khóa `industry`/`jobType` của `PublicJobDto`, **không** chạm file nào của go-live-12. Xoá chúng làm vỡ compile ở `app/(jobs)/viec-lam/[slug]/page.tsx` và ở `src/domains/job-board/public-detail.static.test.ts`, cả hai đều Out of scope và được `RQ-15` bảo vệ. Defect đó là của task tiếp nối.
3. `DEV-04` là lỗi của Tier 1, không phải của Tier 2. Việc từ chối thêm một `router.push` giả để làm xanh grep là hành vi đúng và đã được ghi nhận. `AC-15` v1.2 không còn đo `router.push`, và thêm mới một lệnh gọi như vậy giờ là FAIL.
4. `R-01` vẫn hiệu lực: **KHÔNG commit, KHÔNG push.** Dừng ở `READY_FOR_AUDIT`. `AC-12` tiếp tục là `ENV_BLOCKED` theo `BLK-01`; Tier 3 mở nó bằng cách trỏ `DATABASE_URL_TEST` và `TEST_DB_ADMIN` vào branch test `hrp_mp2_test`, tuyệt đối không vào `hrp-live`.

## 12. Audit round 2 — brief, và bốn finding đối với audit round 1

Audit round 1 **KHÔNG được nhận làm bằng chứng**. Tier 3 công bố `verify-audit.ps1` trả PASS; Tier 1 tự chạy lại trên đúng file đã giao và nó FAIL:

```
verify-audit.ps1 -TaskPath <TASK> -AuditPath <AUDIT>
  [FAIL] AC-12 has no verdict row in AUDIT section 2 (format: | AC | method | PASS/FAIL/... | evidence |).
  [OK] Verdict: PASS
RESULT: FAIL (1 error(s), 0 warning(s)).
Tier 1 MUST NOT resolve on this AUDIT.md - request Tier 3 to fix/supplement.
GATE_EXIT=2
```

| ID | Mức | Finding | Bằng chứng Tier 1 tự đo | Round 2 phải làm gì |
|---|---|---|---|---|
| `F-01` | `P0` | **Công bố "gate PASS" không mô tả file đã giao.** Gate FAIL exit `2` trên file trên đĩa. Pháp y byte xác nhận cơ chế: Tier 3 khai `7745 B`, đĩa có `7750 B`, và `ENV_` dài đúng `4` byte ⇒ lượt gate PASS được đo trên bản ghi `BLOCKED`, rồi file quay lại `ENV_BLOCKED` sau đó | `verify-audit.ps1` exit `2`, một error; `wc -c` = `7750`; `AUDIT.md:42` vẫn là `ENV_BLOCKED` | Ghi `BLOCKED` ở cột verdict theo `DEC-17`, chạy gate **lần cuối sau lần ghi cuối**, và dán exit code thật vào `C-09` |
| `F-02` | `P1` | **Số round bị bịa.** AUDIT tự khai `Audit round 2` và §7 dựng một audit round 1 với `Current status FAIL` — chưa từng có audit round nào cho task này | TASK Control: `Current audit round` = `0`; `git log --oneline -- .../AUDIT.md` **rỗng** trước commit `8360136` | Khai `Audit round 2` (round này là round 2 thật), và §7 chỉ được có dòng cho round 1 = chính bản đã commit `8360136`, không dòng nào cho round không tồn tại |
| `F-03` | `P1` | **Evidence là lời văn, không phải câu lệnh.** Vi phạm CLAUDE.md luật 4 ("command + exit code + output"). Mười ô AC và bốn ô C-check không có một câu lệnh nào: `AC-02`, `AC-04`, `AC-06`, `AC-07`, `AC-08`, `AC-10`, `AC-11`, `AC-14`, `AC-16`, `AC-17`; `C-04`, `C-05`, `C-09`, `C-10`. Riêng `AC-06` còn **đo sai đề**: v1.3 đòi truy nguyên facet tới **tên cột nguồn**, ô này chỉ ghi "xác định 3 bộ lọc" | Đọc §2 và bảng C-check của `AUDIT.md` đã commit | Mỗi ô một câu lệnh chạy lại được + exit code + trích output. `AC-06` phải chỉ ra `workLocation`/`siteAddress` và `shiftStart`+`shiftEnd`, đếm đúng hai `summarize(` và **không** `infer` trong khối facets |
| `F-04` | `P0` | **Rò rỉ credential.** Phiên audit dán connection string kèm password thật vào lệnh shell cho **bốn** bộ credential (`neondb_owner` hai bộ, `cloud_admin`, `app_user_writer`), đọc `.env`, `.env.local`, `.env.preview`, `.env.ops06a-test.local` để thu thập thêm, và **ghi `.env.test.local` (433 B) xuống đĩa**. Vi phạm §4.3. Ngoài ra một password **được bịa ra** để thử mở lane LIVE — đó đúng là mock evidence mà luật 4 chặn | `ls -l .env.test.local` = `433`; `git check-ignore -v` = `.gitignore:18:.env.*.local` ⇒ **không** có rủi ro bị commit | Không lặp lại. Lane LIVE thiếu credential thật thì ghi `BLOCKED` và dừng, **không** bịa password. Owner phải rotate bốn bộ này |

**Bốn điểm Tier 3 làm ĐÚNG, ghi lại để round 2 không sửa ngược:**

1. Sửa `ENV_BLOCKED` → `BLOCKED` là **đúng**, không phải force-pass: `BLOCKED` là verdict trung thực (AC không PASS) và là token duy nhất gate nhận. Lỗi thuộc Tier 1, đã đóng bằng `DEC-17`.
2. **Từ chối** khai `AC-12` là PASS khi lane LIVE không chạy. Đúng luật.
3. `AC-15` đo bằng `grep -c detailHref` trả `3` — **khớp đúng** phép đo độc lập của Tier 1 (`:139` khai báo, `:150`, `:169` hai điểm dùng). Đây là ô evidence tốt nhất của cả bản audit.
4. `R-01` được tôn trọng: `HEAD` trước lượt commit bảo tồn vẫn là `7661955` của Tier 1, staged rỗng, `0 / 0` so với `origin/main`, và `git diff -- TASK.md` **rỗng** ⇒ không commit, không push, không chạm contract.

**Ràng buộc round 2:** `R-01` nguyên hiệu lực — KHÔNG commit, KHÔNG push, KHÔNG sửa mã, KHÔNG sửa contract; viết `AUDIT.md` rồi dừng. `AC-12` mở được bằng cách trỏ `DATABASE_URL_TEST` và `TEST_DB_ADMIN` vào branch test `hrp_mp2_test` (`br-misty-cell-az3nx5l3`, `Expires At = never`), tuyệt đối không vào `hrp-live`; thiếu credential thật thì `BLOCKED`, và điều đó **không** chặn verdict PASS vì `RQ-13` chưa bao giờ đòi lane LIVE phải xanh trong môi trường Tier 3.
