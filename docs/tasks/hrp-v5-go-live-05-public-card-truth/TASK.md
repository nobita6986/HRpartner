# TASK: hrp-v5-go-live-05-public-card-truth

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-05-public-card-truth` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` — xếp hàng sau GO-LIVE-04 và GO-LIVE-06 |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent context |
| Baseline | Planning anchor `6680011`; Tier 2 phải khóa lại SHA thật sau khi GO-LIVE-04 và GO-LIVE-06 đã `ACCEPTED` |
| Modules | Marketplace public projection + landing `/` + browse `/api/jobs` |
| ADR references | `UNIFIED_PLAN_v5.md §7.9.7`; MP-1 projection contract; M1-09 field projection |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Chỉ giao `/code hrp-v5-go-live-05-public-card-truth` sau khi GO-LIVE-04 và GO-LIVE-06 đóng |
| Updated | `2026-08-30 Asia/Bangkok` |

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

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Không hiển thị con số lương nếu chưa có field public canonical. Xoá phép tính từ slot; không expose `hourlyRateVnd` | Tier 1 + MP-1/M1-09 | Final |
| `DEC-02` | `CHOSEN` | Card ghi HRPartner là bên tuyển dụng cho đối tác; không công khai Client identity trong task này | Tier 1 / data minimization | Final |
| `DEC-03` | `CHOSEN` | DTO mở rộng theo allow-list với các summary thật: `positions`, `locations`, `shifts`; giữ field đơn hiện hữu để backward compatibility và derive từ phần tử đầu của danh sách đã sort | Tier 1 | Final |
| `DEC-04` | `CHOSEN` | Mọi summary array unique, bỏ chuỗi rỗng, sort ổn định; card hiển thị tối đa ba giá trị và nhãn “+N” nếu còn thêm | Tier 1 | Final |
| `DEC-05` | `CHOSEN` | Tập slot hợp lệ dùng cùng invariant publish: order `OPEN|CLOSING_SOON`, deadline chưa qua; slot `validTo` chưa qua; remaining `max(0, needed-filled)>0` | Existing public projection | Final |
| `DEC-06` | `CHOSEN` | `total` và `nextOffset` được tính trên tập DTO đã qua `DEC-05` và filter, không trên candidate Project thô | Tier 1 / truthful pagination | Final |
| `DEC-07` | `CHOSEN` | UI chỉ hiển thị filter có dữ liệu canonical. `keyword`, `area`, `shift`, `industry` được phép; `job type` bị bỏ vì schema không có; “xoay ca” không được tự suy từ giờ bắt đầu/kết thúc | Tier 1 | Final |
| `DEC-08` | `CHOSEN` | Facet `areas/industries/shifts` nếu thêm phải được derive từ toàn tập public hợp lệ, không từ riêng trang hiện tại; không hardcode danh sách tỉnh/ngành/ca trong UI | Tier 1 | Final |
| `DEC-09` | `CHOSEN` | Submit filter tạo query URL bằng `URLSearchParams`, reset offset về 0, huỷ/ignore response cũ khi request mới thắng; load-more giữ nguyên filter snapshot | Tier 1 | Final |
| `DEC-10` | `CHOSEN` | Response DTO vẫn chỉ trả public allow-list; BigInt không được đi vào JSON. `hourlyRateVnd`, client/budget/margin/billing fields phải vắng | Security baseline | Final |
| `DEC-11` | `CHOSEN` | Quick Apply không được giả bằng placeholder name. Task này giữ form full application hiện tại; residual ghi rõ trong HANDOFF | OPS-06A decision | Final |
| `DEC-12` | `ASSUMPTION` | Số Project public ở giai đoạn Marketplace MVP đủ nhỏ để tính projection/facets chính xác trước tối ưu hoá; nếu measurement cho thấy query vượt ngân sách, Tier 2 dừng và báo số liệu, không tự trả total gần đúng | Tier 1 | Tới OPS-07 |

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
| `RQ-07` | Location/industry/shift filter chỉ hiển thị từ facets canonical; job type và filter không có backing bị loại | Must | `DEC-07/08` | Control trang trí còn lại → FAIL |
| `RQ-08` | Load-more dùng `nextOffset`, append có dedupe theo `job.id`, giữ filter snapshot và stop khi null | Must | `EV-04`, `DEC-09` | Spinner/timer giả hoặc duplicate card → FAIL |
| `RQ-09` | Empty/loading/error/429/503/retry không báo thành công giả và không làm mất dữ liệu đang hiển thị khi refetch lỗi | Must | OPS-06A | Error state che/xoá toàn bộ kết quả cũ → FAIL |
| `RQ-10` | GO-LIVE-04 RLS read context, limiter order và read-only transaction giữ nguyên | Must | `EV-11/12` | `$transaction` trần, ADMIN elevation hoặc DB trước limiter → P0 |
| `RQ-11` | List/detail DTO tương thích additive; apply modal tiếp tục dùng canonical `slug`, idempotency và consent | Must | MP-1/MP-2 | Apply/tracking regression → FAIL |
| `RQ-12` | Test khóa mọi hardcode/salary math/decorative filter và test projection nhiều slot/hết hạn/null | Must | All decisions | Không có regression test → BLOCK |
| `RQ-13` | Full gates và LIVE test trên `hrp_mp2_test` PASS; không fallback `hrp-live`, không mock-pass | Must | Pipeline | ENV thiếu → `ENV_BLOCKED`, không PASS |
| `RQ-14` | HANDOFF ghi residual Quick Apply và performance của facet scan; không kể task này là Affiliate hoặc full search engine | Must | `DEC-11/12` | False completion → BLOCK |

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
| `AC-05` | `RQ-06` | Submit keyword/area/shift/industry tạo query đúng và refetch | UI/route test | Captured URL | Yes |
| `AC-06` | `RQ-07` | Mọi filter hiển thị có tác dụng; không còn job type/filter trang trí | Static + interaction | Before/after rows | Yes |
| `AC-07` | `RQ-08` | Load-more append đúng, không duplicate, dừng khi null | UI state test | Request sequence | Yes |
| `AC-08` | `RQ-09` | 429/503/refetch failure giữ dữ liệu cũ và hiện retry message | UI tests | DOM/state evidence | Yes |
| `AC-09` | `RQ-10` | Limiter chạy trước DB; public read dùng GO-LIVE-04 context, không ADMIN | Existing + updated static tests | Call-order assertions | Yes |
| `AC-10` | `RQ-11` | Apply modal vẫn POST canonical slug, key + consent; success chỉ sau 201 code | Existing route/UI tests | PASS output | Yes |
| `AC-11` | `RQ-12` | Regression tests khóa hardcode, sensitive keys và multi-slot semantics | Focused Vitest | Test list + PASS | Yes |
| `AC-12` | `RQ-13` | LIVE test DB chứng minh list/detail/filter/pagination bằng dữ liệu thật và cleanup | Integration opt-in | Command + exit + masked output | Yes |
| `AC-13` | `RQ-13` | Prisma validate, typecheck, lint, full unit, build, diff-check đều exit 0 | Mandatory gates | Command tails | Yes |
| `AC-14` | `RQ-14` | HANDOFF nói rõ Quick Apply chưa làm và facet performance còn cần OPS-07 đo tải | Document review | Exact section | Yes |

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
