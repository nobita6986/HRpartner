# TASK: hrp-v5-go-live-07-marketplace-launch-proof

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-07-marketplace-launch-proof` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` — ba dependency của `v1.0` (GO-LIVE-04, GO-LIVE-06, GO-LIVE-05) đều đã `ACCEPTED`. Điều kiện xếp hàng còn lại duy nhất là `hrp-v5-go-live-09-public-board-architecture`, và nó KHÔNG chặn toàn bộ task: xem `DEC-14` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — operator/evidence recorder dưới quyền Owner |
| Auditor | Tier 3 — independent live verifier |
| Baseline | Planning anchor `3a95c29` (đã push, đo lại ngày 02/09; anchor `v1.0` là `6680011` và cách mã hiện tại 69 commit nên đã bỏ). HANDOFF phải ghi commit SHA và Vercel deployment SHA thật được kiểm, cộng chân DB của `DEC-17` |
| Modules | Marketplace production browse/apply/tracking/HR queue + launch runbook |
| ADR references | `UNIFIED_PLAN_v5.md §7.9.7`; `docs/runbooks/marketplace-launch-operations.md`; `docs/runbooks/marketplace-launch-drill.md` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Giao `/code hrp-v5-go-live-07-marketplace-launch-proof` khi `go-live-09` đã `ACCEPTED`, push và deploy. Owner có quyền giao SỚM HƠN theo `DEC-14`, đổi lại report phải mang ghi chú phạm vi và một nghĩa vụ đo lại phần bề mặt |
| Updated | `2026-09-02 Asia/Bangkok` |

Đây là task chứng minh go-live, không phải task “viết thêm code cho đủ đẹp”. Nó đóng khoảng cách giữa gate/test xanh và hành vi thật trên `www.hrpartner.vn`, tạo một gói evidence để Owner ký quyết định công bố Marketplace.

## 1. Outcome

### User-visible outcome

Sau task này, Owner có bằng chứng production cho một hành trình hoàn chỉnh:

1. HR tạo/publish một job drill hợp lệ.
2. Khách vô danh thấy đúng card/list/detail đã publish, không thấy job private/closed.
3. Ứng viên gửi form thật qua canonical apply endpoint và nhận tracking code.
4. Replay/duplicate/invalid tracking cho kết quả đúng, không sinh hồ sơ rác ngoài dự kiến.
5. HR đăng nhập thấy đúng hồ sơ trong queue, đúng project/slot và xử lý nó tới trạng thái cuối hợp lệ.
6. Unpublish/republish và đóng order hoạt động theo runbook; không có trạng thái thành công giả.
7. Runbook được ký, report launch không chứa secret hoặc PII, và Tier 3 xác minh độc lập các gate có thể đo lại.

Kết quả Planner cuối cùng chỉ có ba trạng thái:

- `GO_LIVE_APPROVED`: đủ evidence, Owner ký.
- `GO_LIVE_BLOCKED`: có blocker cụ thể, Marketplace chưa được công bố.
- `ROLLBACK_REQUIRED`: đã deploy nhưng phải unpublish/rollback trước khi làm tiếp.

### Non-goals

- Không sửa source code, schema, migration, env hoặc Vercel config trong task này.
- Không tự push/deploy commit mới để chữa lỗi phát hiện trong drill; lỗi code phải mở task/round mới.
- Không test phá hoại, không fuzz production, không cố làm cạn rate limit.
- Không dùng SQL `DELETE` để dọn dấu vết drill.
- Không dùng thông tin cá nhân giả của người thứ ba; số điện thoại/họ tên drill phải do Owner cho phép.
- Không tuyên bố phone-only Quick Apply đã có. Launch proof dùng full application hiện hành (`fullName + phone + consent`).
- Không mở Affiliate, Attendance, Billing, Commission hoặc Payroll.
- Không coi Vercel deployment thành công là evidence nghiệp vụ.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `UNIFIED_PLAN_v5.md §7.9.7` | Marketplace chỉ mở public khi projection, apply, queue, dedup, placement, tracking, runbook và audit đều có evidence | Task phải đo hành trình chéo module, không chỉ HTTP 200 |
| `EV-02` | `docs/runbooks/marketplace-launch-operations.md` | Đo lại 02/09: dòng 7 vẫn là `READY_FOR_OWNER_REVIEW`, chưa signed-off | Phải chạy và ký, không được mark PASS theo việc “đã có tài liệu” |
| `EV-03` | `docs/runbooks/marketplace-launch-drill.md` | Drill đã mô tả publish/apply/tracking/duplicate/unpublish/republish/close/convert | Tái sử dụng, không sáng tác quy trình khác |
| `EV-04` | GO-LIVE-04 — `ACCEPTED` | Public read cần RLS context cố định, và task đã đóng nên list/detail phải trả dữ liệu thật; hai hotfix `hrp-v5-hotfix-01-public-jobs-500` và `hrp-v5-hotfix-02-public-jobs-required-relation` cũng đã `ACCEPTED` | Production list/detail vẫn là gate bắt buộc, nhưng nay là phép đo HỒI QUY, không phải chờ fix |
| `EV-05` | GO-LIVE-06 — `ACCEPTED` ở `v1.2`, audit round 3 PASS | Sản phẩm của task là MỘT FILE migration trong repo (`prisma/migrations/...m14_rls_matrix_repair/migration.sql`), theo đúng 4.2 của nó. File nằm trong deployment SHA KHÔNG có nghĩa là nó đã CHẠY trên `hrp-live` | `AC-01` phải có hai chân: chân SHA chứng minh mã, chân hành vi chứng minh DB. Xem `DEC-17` |
| `EV-06` | GO-LIVE-05 (`ACCEPTED`, push `e0c14ca`), GO-LIVE-08 (`ACCEPTED`, push `81c86e0`), GO-LIVE-12 và GO-LIVE-14 đều `ACCEPTED` | Card đã bỏ dữ liệu bịa, có filter thật, có UI premium, có trang chi tiết và đã bỏ nhãn ngành nghề | Phần bề mặt của drill đo trạng thái đã đóng; thứ CÒN sẽ đổi là `go-live-09`, xem `EV-19` |
| `EV-07` | OPS-06A accepted artifacts | Apply/tracking/browse đã có distributed limiter, content-type/body cap, CV disabled và legacy endpoints 410. Đo lại 02/09: `app/api/jobs/apply/route.ts` còn 12 dòng, trả `410` tất định, comment ghi rõ đã RETIRE | Một `410` chỉ chứng minh cửa CŨ đã đóng, nó KHÔNG chứng minh cửa canonical chạy được. Hai phép đo phải tách rời và cả hai đều bắt buộc |
| `EV-08` | MP-2 accepted artifacts | Canonical apply trả `trackingCode/status`; tracking DTO không lộ PII | Report chỉ ghi masked code/request-id/status |
| `EV-09` | MP-3B/MP-3C accepted artifacts | Convert/dedup/assignment invariants đã có test | Drill xác nhận một narrative production, không thay audit race matrix |
| `EV-10` | `git status --short` (đo 02/09) | Dirty ngoài luồng: `public/index.html`, `scratch/*`, `.neon`, `docs/aff_plan.md`, và ba `AUDIT.md` của task 02/04/13 đang giữ cố ý ở trạng thái `1 0` làm bằng chứng truncation | Commit evidence phải path-scoped; cấm `git add -A` và cấm dọn hộ. Ba file `AUDIT.md` kia KHÔNG được stage, restore hay sửa |
| `EV-11` | Owner override 2026-08-28 | `/bcc` retired; Payroll thuộc app lương riêng và không block Marketplace | Không đưa payroll/bcc vào launch approval |
| `EV-12` | Owner product decision | CV không bắt buộc; raw upload tắt. Phone-only Quick Apply là slice sau | Full form đủ cho controlled launch; report phải nói thật residual |
| `EV-13` | `app/api/public/jobs/[slug]/applications/route.ts` cộng `src/domains/applications/apply-helpers.ts` (đo 02/09) | Canonical apply trả `201` với body đúng HAI khoá `trackingCode` và `status`. Bản đồ lỗi đầy đủ: `400 INVALID_INPUT`, `404 JOB_NOT_AVAILABLE`, `409 IDEMPOTENCY_PAYLOAD_MISMATCH`, `409 DUPLICATE_APPLICATION`, `422 CV_UPLOAD_DISABLED`, `422 CONSENT_REQUIRED`, `500 INTERNAL` | Có HAI mã `409` khác nghĩa nhau, nên `RQ-06` phải phân biệt bằng field `error` chứ không phải bằng con số. Ghi "409" trơn trong evidence là không đủ |
| `EV-14` | `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` | Trong definer function, thứ tự kiểm là input (`P0002`) rồi **idempotency replay** (`P0010`, dòng 110) rồi **job availability** (`P0011`, dòng 148) rồi duplicate (`P0012`, dòng 156) | Replay chặn TRƯỚC khi kiểm job. Gọi lại apply bằng đúng key CŨ sau khi unpublish sẽ trả `201` đã lưu — đúng theo thiết kế — nên `RQ-10` bắt buộc dùng key MỚI, nếu không sẽ kết luận sai là unpublish không chặn apply |
| `EV-15` | `src/shared/security/rate-limit-port.ts` dòng 36-39 | `APPLY_PHONE` là 5 lần mỗi 3600 giây; `APPLY_IP` 10 lần mỗi 600 giây; `TRACKING_IP` 20 mỗi 60; `TRACKING_CODE` 10 mỗi 60. Guard chạy trong route TRƯỚC transaction nên cả một lần replay cũng tiêu ngân sách | Kịch bản của `v1.0` cần đúng 5 lần apply trên một số điện thoại, tức tiêu HẾT ngân sách giờ và không còn dư một lần nào cho lỗi bấm. Xem `DEC-15` |
| `EV-16` | `app/api/public/applications/[trackingCode]/route.ts` cộng `src/domains/applications/application.service.ts` | Response 200 là object bọc `{ application: dto }`; DTO có đúng 11 khoá và số điện thoại cùng CCCD chỉ ra dưới dạng `phoneMasked`/`cccdMasked` theo GO-LIVE-13, còn `fullName` để nguyên văn theo quyết định Owner. `Cache-Control: no-store` chỉ có ở nhánh 200, KHÔNG có ở nhánh 404 | `RQ-07` phải kiểm khoá bọc cộng allow-list 11 khoá. Đòi `no-store` ở 404 là đòi một thứ mã không làm và task này không được sửa mã: xem `DEC-18` |
| `EV-17` | `find app -name page.tsx` (đo 02/09) | URL công khai thật: `/` là trang browse (`app/(portal)/page.tsx`), `/jobs`, `/viec-lam/[slug]` là trang chi tiết (`app/(jobs)/viec-lam/[slug]/page.tsx`), `/track` là trang tra cứu. Thư mục `app/bcc` KHÔNG tồn tại | AC phải nêu URL thật thay vì nói "list/detail" chung chung; `RQ-11` về `/bcc` đo bằng sự vắng mặt của thư mục cộng một lần gọi HTTP |
| `EV-18` | `ls docs/reports/` | Chỉ có `tier1-status-2026-08-28.md`. `docs/reports/marketplace-launch-proof.md` CHƯA tồn tại | `STEP-09` là tạo file mới, không phải cập nhật file có sẵn |
| `EV-19` | `docs/tasks/hrp-v5-go-live-09-public-board-architecture/TASK.md` ở `v1.2` | `go-live-09` là task go-live DUY NHẤT còn mở. Nó viết lại chính trang browse mà `RQ-04` chứng nhận và công bố lương giờ lên card lần đầu (`DEC-19` của nó thay điều kiện cấm của GO-LIVE-05) | Chứng nhận phải tách làm hai phần: phần HÀNH TRÌNH không phụ thuộc 09, phần BỀ MẶT thì phụ thuộc. Xem `DEC-14` và `RQ-18`/`RQ-19` |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Drill chạy trên production deployment pre-announcement vì không có staging app; dữ liệu drill phải nhận diện rõ và kết thúc bằng nghiệp vụ | Existing drill decision | Final cho round này |
| `DEC-02` | `CHOSEN` | Dùng một Project/Order drill riêng; code/title có prefix `DRILL-MKT`; không dùng order tuyển thật cho bước đóng trạng thái một chiều | Tier 1 safety | Final |
| `DEC-03` | `CHOSEN` | Applicant drill dùng identity do Owner sở hữu/cho phép; evidence công khai chỉ mask phone/tracking, không ghi fullName/CCCD | Privacy | Final |
| `DEC-04` | `CHOSEN` | Không cleanup bằng SQL. Submission kết thúc `REJECTED` với reason drill hoặc `CONVERTED`; project drill kết thúc unpublished; order drill có thể `CLOSED` | Runbook invariant | Final |
| `DEC-05` | `CHOSEN` | Mỗi mutation ghi `X-Request-Id`, HTTP status, timestamp và business code; không chép raw body/header/cookie/token | Observability/privacy | Final |
| `DEC-06` | `CHOSEN` | Deployment SHA phải chứa commit đã ACCEPTED của 04/06/05. Alias thành công nhưng SHA cũ → BLOCK | Tier 1 | Final |
| `DEC-07` | `CHOSEN` | Tier 2 không sửa code trong cùng round khi drill phát hiện defect; ghi finding và dừng tại stop condition | Pipeline independence | Final |
| `DEC-08` | `CHOSEN` | Tier 3 đo lại read-only paths và kiểm evidence mutation/DB state độc lập; không cần tạo thêm một hồ sơ PII nếu record drill vẫn đủ để verify | Data minimization | Final |
| `DEC-09` | `CHOSEN` | Không ép limiter tới 429 trên production. Rate-limit correctness dùng evidence OPS-06A; smoke chỉ xác nhận response headers và không gặp 503 config | Operational safety | Final |
| `DEC-10` | `CHOSEN` | Quick Apply không chặn controlled launch vì full form thu được phone và consent; nhưng phải ghi `RESIDUAL_QUICK_APPLY` trong report | Owner + OPS-06A | Tới Quick Apply task |
| `DEC-11` | `CHOSEN` | Affiliate chưa triển khai; drill không dùng/reforge affiliate code và không kết luận attribution/commission | `aff_plan.md` standalone | Final |
| `DEC-12` | `CHOSEN` | Owner là người ký `GO_LIVE_APPROVED`; Tier 1 chỉ resolve task sau chữ ký và Tier 3 PASS | Governance | Final |
| `DEC-13` | `CHOSEN` | Khi một AC cần bề mặt hoặc phiên đăng nhập mà môi trường không cấp được, kết cục là `ENV_BLOCKED` — nhưng `ENV_BLOCKED` KHÔNG nằm trong từ vựng verdict của `verify-audit.ps1`. Ô verdict phải ghi `BLOCKED` hoặc `PARTIAL`, còn chữ `ENV_BLOCKED` nằm ở ô evidence kèm lý do. Cấm mock, cấm force-pass, cấm suy diễn từ gate xanh | Tier 1, luật `verify-audit` | Final |
| `DEC-14` | `CHOSEN` | Task này KHÔNG bị chặn cứng sau `go-live-09`. Chứng nhận tách hai phần: phần **hành trình** (`RQ-05`..`RQ-11`) đo hành vi mà 09 không chạm nên có giá trị bất kể 09 đã land hay chưa; phần **bề mặt** (`RQ-04` và `RQ-19`) chỉ có giá trị trên bề mặt sẽ THẬT SỰ công khai. Nếu Owner chọn chạy trước 09 thì report phải mang ghi chú phạm vi và một nghĩa vụ đo lại phần bề mặt sau khi 09 deploy — một lần đo READ-ONLY, không phải một drill mutation thứ hai | Tier 1, `EV-19` | Tới khi 09 `ACCEPTED` |
| `DEC-15` | `CHOSEN` | Trước lần apply đầu tiên, Tier 2 phải viết một **sổ lượt gọi**: liệt kê từng lần apply dự kiến, số điện thoại dùng, idempotency key dùng và kết quả mong đợi. Ba lượt đầu (first, replay, duplicate-new-key) BUỘC dùng cùng số điện thoại A vì duplicate guard khoá trên số điện thoại. Hai lượt trạng thái âm (sau unpublish, sau close order) dùng số điện thoại B do Owner cấp riêng | Tier 1, `EV-15` | Final |
| `DEC-16` | `CHOSEN` | Mọi lượt apply sau khi đổi trạng thái job hoặc order BUỘC dùng idempotency key MỚI. Dùng lại key cũ trả `201` đã lưu vì replay chặn trước khi kiểm job, và đó là hành vi đúng của hệ thống, không phải lỗi | Tier 1, `EV-14` | Final |
| `DEC-17` | `CHOSEN` | `AC-01` có hai chân độc lập. Chân MÃ: deployment SHA chứa các commit đã `ACCEPTED`. Chân DB: bằng chứng RLS matrix đã CHẠY trên `hrp-live`, đo bằng hành vi thật ở `RQ-08` (HR queue thấy đúng hồ sơ) hoặc bằng `_prisma_migrations` nếu Owner cấp target an toàn. Một file migration có trong SHA KHÔNG phải bằng chứng nó đã chạy | Tier 1, `EV-05` | Final |
| `DEC-18` | `CHOSEN` | `no-store` chỉ bắt buộc ở nhánh 200 của tracking. Nhánh 404 hiện không có header đó; việc này được ghi làm **residual finding** trong report, không phải blocker, vì task này cấm sửa source | Tier 1, `EV-16` | Tới task hardening kế tiếp |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Preflight xác nhận branch, HEAD, origin, Vercel production deployment SHA, và chân MÃ của `DEC-17`: deployment SHA chứa commit `ACCEPTED` của 04/06/05 cộng hai hotfix. Ghi rõ 09 đã deploy hay chưa | Must | `DEC-06`, `DEC-17` | SHA/gate lệch → BLOCK |
| `RQ-02` | Production env có các tên biến bắt buộc nhưng evidence không in giá trị; debug/internal DB probe không public | Must | Security | Thiếu env/route lộ → BLOCK |
| `RQ-03` | Tạo/publish Project + Order + Slot `DRILL-MKT` qua UI/API nghiệp vụ, không SQL insert | Must | `DEC-01/02` | Không đủ quyền/validation → BLOCK |
| `RQ-04` | Anonymous thấy đúng job drill trên `/` và `/jobs`, và trên `/viec-lam/[slug]` của chính slug drill; card đúng sự thật; job private/unpublished không hiện ở cả ba URL. Đây là phần BỀ MẶT theo `DEC-14` | Must | `EV-04`, `EV-06`, `EV-17` | Empty/404/leak → BLOCK |
| `RQ-05` | `POST /api/public/jobs/[slug]/applications` lần đầu trả `201` với body đúng HAI khoá `trackingCode` và `status`, không khoá nào khác. Cùng lượt đo `POST /api/jobs/apply` trả `410` để chứng minh cửa cũ đã đóng — hai phép đo tách rời, cả hai bắt buộc | Must | `EV-07`, `EV-13` | 5xx, thiếu/thừa khoá, hoặc chỉ đo được một trong hai cửa → BLOCK |
| `RQ-06` | Replay đúng key và đúng body trả cùng `trackingCode`; key mới cùng số điện thoại và cùng job trả `409` với field `error` bằng đúng chuỗi `DUPLICATE_APPLICATION`, và không tạo row thứ hai. Evidence phải ghi field `error`, vì `409` còn có nghĩa thứ hai là `IDEMPOTENCY_PAYLOAD_MISMATCH` | Must | `EV-13`, `DEC-15` | Row thứ hai → ROLLBACK_REQUIRED; ghi "409" trơn không phân biệt → chưa đủ evidence |
| `RQ-07` | `GET /api/public/applications/[code]` với code thật trả `200`, body có đúng một khoá bọc `application`, và bên trong đúng 11 khoá của `PublicTrackingDto`; số điện thoại và CCCD chỉ xuất hiện dưới dạng đã che ở `phoneMasked`/`cccdMasked`, không có khoá `phone` hay `cccdNumber` thô. Code không tồn tại nhưng đúng format trả `404` generic. `no-store` bắt buộc ở nhánh 200 | Must | `EV-16`, `DEC-18` | Khoá thô, giá trị chưa che, hoặc 404 tiết lộ tồn tại → ROLLBACK_REQUIRED |
| `RQ-08` | HR queue sau login thấy đúng submission, project/slot/source; role không được phép không thấy queue | Must | GO-LIVE-06/M1 | Queue rỗng/cross-role leak → BLOCK |
| `RQ-09` | HR xử lý record drill tới trạng thái cuối hợp lệ; dedup branch được ghi đúng PASS hoặc DEFERRED theo runbook | Must | MP-3 | Record treo `NEW` → BLOCK |
| `RQ-10` | Sau unpublish: job biến mất khỏi `/` và `/jobs`, `/viec-lam/[slug]` không còn công khai, và apply bằng **idempotency key MỚI** trả `404` với `error` bằng `JOB_NOT_AVAILABLE`. Republish khôi phục. Close order drill chặn apply. Dùng lại key cũ ở bước này là sai phương pháp và làm kết luận vô giá trị | Must | `EV-14`, `DEC-16`, `EV-17` | State mismatch → BLOCK; dùng key cũ → phép đo bị loại |
| `RQ-11` | Admin assignment/commission smoke có session không trả 500; `/bcc` không được tái xuất hiện như payroll portal | Must | Living Handoff | 500 hoặc bcc regression → BLOCK |
| `RQ-12` | Report mask PII/secret, có request-id/status/timestamp/SHA và before-after state. Riêng `fullName`: API trả nguyên văn theo quyết định Owner, nhưng report và HANDOFF KHÔNG được dán giá trị đó — ghi "khớp" hoặc dạng đã che. Tracking code chỉ ghi dạng che | Must | `DEC-03`, `DEC-05`, `EV-16` | Secret/PII leak → revoke artifact + BLOCK |
| `RQ-13` | Runbook operations và drill được cập nhật kết quả thật, Owner ký rõ PASS/FAIL/deferred rows | Must | `EV-02/03`, `DEC-12` | Không chữ ký → không APPROVED |
| `RQ-14` | Tier 3 chạy independent live verification và `verify-audit.ps1` PASS | Must | Pipeline | Không audit → BLOCK |
| `RQ-15` | Commit chỉ gồm report/runbook/HANDOFF/AUDIT/TASK resolution; không gom WIP ngoài scope | Must | `EV-10` | Scope leak → reject commit |
| `RQ-16` | Trước lượt apply ĐẦU TIÊN, HANDOFF phải có sổ lượt gọi: từng lượt apply dự kiến kèm số điện thoại, idempotency key và kết quả mong đợi; ba lượt đầu trên số A, hai lượt trạng thái âm trên số B. Tổng số lượt trên mỗi số không quá 4 để còn dư một lượt | Must | `EV-15`, `DEC-15` | Không có sổ trước khi gọi → dừng; vượt ngân sách rồi gặp `429` → ghi trung thực, KHÔNG chờ hết window để lách |
| `RQ-17` | Chân DB của `DEC-17` phải có bằng chứng riêng: RLS matrix đã chạy trên `hrp-live`, chứng minh bằng hành vi thật của `RQ-08` hoặc bằng `_prisma_migrations` nếu Owner cấp target an toàn | Must | `EV-05`, `DEC-17` | Chỉ có bằng chứng SHA → `AC-01` chưa đạt, không được suy diễn |
| `RQ-18` | Nếu `go-live-09` chưa deploy tại thời điểm drill, report phải có một mục **phạm vi** nói rõ phần bề mặt được chứng nhận trên bề mặt TRƯỚC 09, kèm nghĩa vụ đo lại `RQ-04` và `RQ-19` sau khi 09 deploy | Must | `DEC-14`, `EV-19` | Thiếu mục phạm vi → report mô tả sai thứ sẽ công khai → BLOCK |
| `RQ-19` | Nếu `go-live-09` ĐÃ deploy: xác nhận con số lương trên card và trong `/api/jobs` là lương giờ của người lao động, không phải giá bán cho khách, và response công khai không có khoá nào về client, budget, margin hay billing | Must | `EV-19`, GO-LIVE-05 `DEC-10` | Lộ giá bán hoặc margin → ROLLBACK_REQUIRED |

### 4.2 Scope boundaries

**In scope artifacts:**

- `docs/runbooks/marketplace-launch-operations.md` — cập nhật trạng thái/sign-off thật
- `docs/runbooks/marketplace-launch-drill.md` — ghi execution result, không viết lại quy trình
- `docs/reports/marketplace-launch-proof.md` — report mới, không chứa PII/secret
- `docs/tasks/hrp-v5-go-live-07-marketplace-launch-proof/HANDOFF.md`
- `docs/tasks/hrp-v5-go-live-07-marketplace-launch-proof/AUDIT.md`
- `docs/tasks/hrp-v5-go-live-07-marketplace-launch-proof/TASK.md` — Tier 1 resolution sau audit

**In scope external actions:**

- Read production deployment metadata.
- Dùng UI/API production đúng nghiệp vụ theo runbook.
- Tạo và chuyển trạng thái record prefix `DRILL-MKT`.
- Dùng HAI số điện thoại do Owner cấp: số A cho ba lượt apply đầu, số B cho hai lượt trạng thái âm (`DEC-15`).
- Unpublish/republish Project drill, close Order drill.

**Out of scope:**

- Mọi source file dưới `app/**`, `src/**`, `prisma/**`, `middleware.ts`, `vercel.json`
- Thêm/sửa/xóa environment variable
- SQL DDL/DML trực tiếp
- Git push/deploy mới
- Xóa record production
- Load test, pentest, rate-limit exhaustion
- Quick Apply, Affiliate, CV upload
- `public/index.html` và ba `AUDIT.md` của task 02/04/13: đang dirty của luồng khác, KHÔNG stage, KHÔNG restore, KHÔNG sửa (`EV-10`)

### 4.3 Data, State, Permission và Interface Rules

- **Data:** record drill có prefix `DRILL-MKT`; applicant là người được Owner cho phép; report mask mọi identifier cá nhân. `fullName` được API trả nguyên văn theo quyết định Owner, nhưng KHÔNG được dán vào report hay HANDOFF.
- **State:** mutation theo state machine thật. Không reopen order `CLOSED`; nếu cần republish thì dùng project còn order mở hoặc tạo order drill mới.
- **Permission/data scope:** anonymous chỉ public projection/apply/tracking; HR queue dùng role đã cấp; negative role dùng account riêng không có quyền.
- **Interface:** canonical hosts là `https://www.hrpartner.vn`; apex redirect có thể đo riêng nhưng không thay host trong evidence.
- **Failure/idempotency/concurrency:** 5xx, public/private leak, duplicate row, stale deployment hoặc queue invisibility là stop condition. 429 do thao tác lặp vượt ngân sách không được force-pass và không được lách bằng cách chờ hết window rồi gọi lại như chưa có gì. Mọi lượt apply sau khi đổi trạng thái job/order BUỘC dùng idempotency key mới (`DEC-16`); ngân sách `APPLY_PHONE` là 5 lượt mỗi giờ nên sổ lượt gọi của `RQ-16` phải viết TRƯỚC lượt gọi đầu tiên.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01/02/16/17` | Git/Vercel/live | Chụp SHA, dependency status, env-name presence, canonical host/internal-route posture; ghi rõ `go-live-09` đã deploy hay chưa; lập chân DB của `DEC-17`; viết sổ lượt gọi apply trước mọi mutation | CLI/read-only | Preflight table cộng sổ lượt gọi | SHA cũ, secret printed, hoặc bắt đầu apply khi chưa có sổ → dừng |
| `STEP-02` | `RQ-03` | Admin Project/Staffing | Tạo Project/Order/Slot drill qua nghiệp vụ, ghi IDs mask và state | Auth UI/API | 201/200 + request-id | Dùng SQL/raw owner bypass → dừng |
| `STEP-03` | `RQ-04/19` | Public browse | Publish và đo `/`, `/jobs`, `/viec-lam/[slug]`, card/filter, private negative; nếu 09 đã deploy thì đo cả sự thật của con số lương và sự vắng mặt của khoá client/budget/margin | Browser/HTTP | Status cộng safe body summary | RLS, card truth, hoặc lộ giá bán → dừng |
| `STEP-04` | `RQ-05/06` | Public apply | Ba lượt trên số A theo sổ: apply lần đầu, replay đúng key và body, duplicate bằng key mới; cộng một lượt đo `410` của endpoint legacy; đếm queue/row qua authorized surface | HTTP | Exact codes cộng field `error` cộng same tracking mask | Row thứ hai, hoặc evidence chỉ ghi số 409 mà không ghi `error` → dừng |
| `STEP-05` | `RQ-07` | Tracking | Đo known, unknown, `no-store` ở nhánh 200, khoá bọc `application` và allow-list đúng 11 khoá; xác nhận không có khoá `phone`/`cccdNumber` thô | HTTP | Danh sách khoá thật đọc từ response | PII leak hoặc khoá thô → dừng |
| `STEP-06` | `RQ-08/09` | HR queue | Xác nhận queue, negative role, xử lý record drill tới trạng thái cuối | Auth UI/API | State trail + audit/request-id | Queue rỗng/leak → dừng |
| `STEP-07` | `RQ-10` | Publish/order state | Unpublish, negative browse, apply bằng key MỚI trên số B để lấy `404 JOB_NOT_AVAILABLE`, republish, close dedicated order rồi apply lần cuối | Runbook, `DEC-16` | Before-after responses cộng key ledger | Đụng job/order thật, hoặc dùng lại key cũ → dừng |
| `STEP-08` | `RQ-11` | Admin smoke | Assignment/commission/bcc smoke có session | Browser | HTTP/title/error state | 500 → dừng |
| `STEP-09` | `RQ-12/13/18` | Docs | Tạo mới `docs/reports/marketplace-launch-proof.md` (`EV-18`), cập nhật runbook kết quả, thêm mục phạm vi nếu 09 chưa deploy, Owner ký | Docs | Secret/PII scan | Chưa ký, hoặc thiếu mục phạm vi khi 09 chưa deploy → BLOCK |
| `STEP-10` | `RQ-14/15` | Audit/commit | Tier 3 verify độc lập; Tier 1 resolve và commit path-scoped | Pipeline | verify-audit + git diff | Audit không PASS → không approve |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-17` | HAI chân đều đạt: chân MÃ là deployment SHA chứa commit `ACCEPTED` của 04/06/05 cộng hai hotfix; chân DB là bằng chứng RLS matrix đã CHẠY trên `hrp-live`. Một file migration nằm trong SHA không tính là chân DB | Vercel/Git metadata cộng phép đo hành vi hoặc `_prisma_migrations` | SHA chain cộng bằng chứng DB riêng | Yes |
| `AC-02` | `RQ-02` | Env-name preflight đủ, debug/internal probe không public, không in values | Read-only checks | Presence/404 summary | Yes |
| `AC-03` | `RQ-03` | Project/Order/Slot drill được tạo và publish qua nghiệp vụ | Auth API/UI | Codes + request-id | Yes |
| `AC-04` | `RQ-04` | Anonymous list/detail/card/filter đúng; private negative không lộ | HTTP/browser | Status + screenshot/safe JSON | Yes |
| `AC-05` | `RQ-05` | First apply trả `201` với body đúng HAI khoá `trackingCode` và `status`; cùng lượt, `POST /api/jobs/apply` trả `410` | HTTP | Danh sách khoá thật của response, masked tracking, request-id, cộng status của endpoint legacy | Yes |
| `AC-06` | `RQ-06` | Replay trả cùng `trackingCode`; duplicate bằng key mới trả `409` với `error` bằng đúng chuỗi `DUPLICATE_APPLICATION`; row count không tăng | HTTP cộng queue count | Before-after count cộng field `error` nguyên văn của cả hai lượt | Yes |
| `AC-07` | `RQ-07` | Known tracking trả `200` có `no-store`, body có đúng khoá bọc `application` và đúng 11 khoá bên trong, không có `phone`/`cccdNumber` thô; unknown trả `404` generic | HTTP | Header cộng danh sách khoá thật đọc từ response | Yes |
| `AC-08` | `RQ-08` | HR queue thấy đúng record; unauthorized role không thấy | Auth smoke | Positive + negative | Yes |
| `AC-09` | `RQ-09` | Record drill kết thúc REJECTED hoặc CONVERTED; dedup ghi đúng trạng thái thật | State history | Final state | Yes |
| `AC-10` | `RQ-10` | Sau unpublish, apply bằng key MỚI trả `404` với `error` bằng `JOB_NOT_AVAILABLE`; republish khôi phục; close order chặn apply | HTTP sequence | Exact codes cộng sổ key chứng minh mỗi lượt dùng key mới | Yes |
| `AC-11` | `RQ-11` | Assignment/commission không 500; `/bcc` không trở lại làm payroll surface | Browser/HTTP | Status/title | Yes |
| `AC-12` | `RQ-12` | Report có đủ SHA/timestamp/request-id/state nhưng không có secret/PII, và không có `fullName` nguyên văn dù API trả nó | Scan cộng review | Zero forbidden patterns, cộng phép grep chứng minh tên thật không có trong artifact | Yes |
| `AC-13` | `RQ-13` | Owner ký runbook và kết luận PASS/FAIL rõ | Document review | Signed section | Yes |
| `AC-14` | `RQ-14` | Tier 3 independent audit PASS và verifier exit 0 | Audit command | AUDIT + output | Yes |
| `AC-15` | `RQ-15` | Commit chỉ có artifact cho launch proof/runbook | Git scope check | Name-only diff | Yes |
| `AC-16` | `RQ-16` | Sổ lượt gọi có trong HANDOFF và có timestamp TRƯỚC lượt apply đầu tiên; mỗi số điện thoại không quá 4 lượt | Document review cộng đối chiếu timestamp | Sổ cộng log lượt gọi thật | Yes |
| `AC-17` | `RQ-17` | Chân DB có bằng chứng riêng, không suy diễn từ SHA | Behavioural hoặc `_prisma_migrations` | Output thật | Yes |
| `AC-18` | `RQ-18` | Nếu 09 chưa deploy, report có mục phạm vi và nghĩa vụ đo lại `RQ-04`/`RQ-19`; nếu 09 đã deploy thì ghi rõ điều đó và mục phạm vi không cần | Document review | Mục phạm vi hoặc dòng ghi 09 đã deploy | Yes |
| `AC-19` | `RQ-19` | Con số lương công khai là lương giờ của người lao động; response `/api/jobs` không có khoá nào về client, budget, margin, billing | HTTP cộng đối chiếu nguồn | Danh sách khoá thật của response | Yes nếu 09 đã deploy; `DEFERRED` có căn cứ nếu chưa |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-04` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-07` |
| `RQ-08` | `STEP-06` | `AC-08` |
| `RQ-09` | `STEP-06` | `AC-09` |
| `RQ-10` | `STEP-07` | `AC-10` |
| `RQ-11` | `STEP-08` | `AC-11` |
| `RQ-12` | `STEP-09` | `AC-12` |
| `RQ-13` | `STEP-09` | `AC-13` |
| `RQ-14` | `STEP-10` | `AC-14` |
| `RQ-15` | `STEP-10` | `AC-15` |
| `RQ-16` | `STEP-01` | `AC-16` |
| `RQ-17` | `STEP-01`, `STEP-06` | `AC-01`, `AC-17` |
| `RQ-18` | `STEP-09` | `AC-18` |
| `RQ-19` | `STEP-03` | `AC-19` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Drill làm ảnh hưởng job thật | Nhầm project/order | Prefix + dedicated records + two-person check | Unpublish drill project; không sửa job thật |
| `RISK-02` | PII lọt report/git | Raw phone/name/code | Mask + request-id-only + precommit scan | Xoá artifact khỏi index, rotate nếu secret; viết lại report |
| `RISK-03` | Duplicate hồ sơ | Retry sai key | Ghi key mapping trước khi gọi | Dừng; xử lý record qua nghiệp vụ, không delete SQL |
| `RISK-04` | Close order một chiều | Dùng order thật | Dedicated order | Tạo order mới; không reopen trái state machine |
| `RISK-05` | Production deployment stale | Alias trỏ SHA cũ | AC-01 trước mutation | Dừng, Owner deploy đúng SHA ngoài task |
| `RISK-06` | Public/private leak | Private job xuất hiện | Negative check ngay sau publish | Unpublish mọi drill job, rollback deployment |
| `RISK-07` | Queue rỗng vì RLS drift | Apply 201 nhưng HR thấy 0 | Dependency GO-LIVE-06 + queue proof | Unpublish, mở DB posture task; không apply thêm |
| `RISK-08` | Rate limit làm sai kết luận | 429 sau thao tác lặp | Ngân sách runbook, không spam | Chờ window rồi chạy đúng một lần; ghi 429 trung thực |
| `RISK-09` | Tier 2 sửa code trong infra task | Working tree source đổi | Scope check đầu/cuối | Reject round, tách code task |
| `RISK-10` | Ngân sách `APPLY_PHONE` cạn giữa drill, Tier 2 gặp `429` và bỏ dở với một record nửa vời trên production | Kịch bản cần đúng 5 lượt trên một số mà ngân sách đúng 5 lượt mỗi giờ; một lần bấm sai là hết | `EV-15` đo ngân sách thật; `RQ-16` buộc viết sổ lượt gọi TRƯỚC lượt đầu và chia hai số điện thoại; `AC-16` kiểm timestamp của sổ | Chờ hết window rồi tiếp tục ĐÚNG bước còn thiếu, ghi `429` trung thực; không xoá record, không SQL |
| `RISK-11` | Gọi lại apply bằng idempotency key CŨ sau unpublish, nhận `201` đã lưu, rồi kết luận SAI là unpublish không chặn apply — sinh verdict `ROLLBACK_REQUIRED` oan trên một hệ thống lành | Replay chặn trước khi kiểm job trong definer (`EV-14`) | `DEC-16` buộc key mới; `RQ-10` và `AC-10` đòi sổ key chứng minh từng lượt dùng key mới | Đo lại đúng một lượt bằng key mới trước khi kết luận bất cứ điều gì |
| `RISK-12` | Ký `GO_LIVE_APPROVED` cho một bề mặt sắp đổi vì `go-live-09` chưa land; hoặc ngược lại, chạy lại CẢ drill mutation lần hai chỉ để đo lại phần bề mặt | 09 là task go-live duy nhất còn mở và nó viết lại trang browse | `DEC-14` tách chứng nhận thành phần hành trình và phần bề mặt; `RQ-18` buộc report mang mục phạm vi; phần đo lại là READ-ONLY | Đo lại `RQ-04` và `RQ-19` sau khi 09 deploy, không tạo record drill mới |
| `RISK-13` | Suy diễn chân DB từ SHA: thấy file migration trong deployment SHA rồi kết luận RLS đã áp trên `hrp-live`, trong khi migration chưa chạy | Sản phẩm của GO-LIVE-06 là một file trong repo (`EV-05`) | `DEC-17` chia `AC-01` thành hai chân độc lập; `AC-17` đòi bằng chứng DB riêng | Dừng trước mọi mutation, nhờ Owner áp migration, đo lại chân DB |
| `RISK-14` | Dán `fullName` thật vào report vì API trả nguyên văn nên tưởng là đã an toàn | Quyết định Owner cho `fullName` không che ở API | `RQ-12` cấm dán tên vào artifact dù API trả nó; `AC-12` đòi một phép grep chứng minh | Xoá artifact khỏi index và viết lại report; không rewrite history nếu chưa push |

## 8. Open Questions

Không còn câu hỏi chặn contract. Owner chỉ ký sau khi execution evidence hoàn tất; chữ ký là gate vận hành, không phải quyết định thiết kế giao cho Tier 2.

Câu hỏi thứ tự — chạy drill trước hay sau `go-live-09` — đã được `DEC-14` trả lời và KHÔNG chặn: phần hành trình có giá trị bất kể 09, phần bề mặt thì kèm nghĩa vụ đo lại. Quyền chọn thời điểm là của Owner; contract chỉ ghi rõ cái giá của mỗi lựa chọn.

## 9. Planner Resolution

Tier 1 append quyết định sau audit. `GO_LIVE_APPROVED` chỉ được ghi khi Tier 3 PASS và Owner sign-off đều có thật.

Contract đã được **neo lại ở `v1.1`** ngày 02/09 trước khi giao `/code`. Lý do: anchor `6680011` của `v1.0` cách mã hiện tại **69 commit**, và trong khoảng đó ba dependency của nó cùng năm task khác đã đóng, nên ba dòng evidence `EV-04`/`EV-05`/`EV-06` mô tả các task đang chờ fix như thể còn chờ. Ngoài việc làm mới trạng thái, bốn lỗi ĐO đã được sửa bằng cách đọc mã: **một**, ngân sách `APPLY_PHONE` là 5 lượt mỗi giờ trong khi kịch bản cần đúng 5 lượt trên một số điện thoại, tức không còn dư một lượt nào cho lỗi bấm. **Hai**, trong definer function replay chặn TRƯỚC khi kiểm job, nên apply lại bằng key cũ sau unpublish trả `201` đã lưu và sẽ bị đọc thành "unpublish không chặn apply". **Ba**, sản phẩm của GO-LIVE-06 là một file migration trong repo, nên `AC-01` cũ chứng minh được mã mà không chứng minh được DB. **Bốn**, có HAI mã `409` khác nghĩa nhau nên ghi con số 409 trơn không phân biệt được duplicate với payload mismatch. Cùng lượt, `RQ-07` đổi từ "safe DTO" chung chung sang allow-list 11 khoá thật cộng khoá bọc `application`, và `no-store` được thu về đúng nhánh 200 vì nhánh 404 không có header đó và task này cấm sửa mã.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.1` | `2026-09-02` | Neo lại contract sau 69 commit: `EV-02` đo lại, `EV-04`/`EV-05`/`EV-06`/`EV-07`/`EV-10` viết lại, thêm `EV-13`..`EV-19`; thêm `DEC-13`..`DEC-18`; viết lại `RQ-01`, `RQ-04`, `RQ-05`, `RQ-06`, `RQ-07`, `RQ-10`, `RQ-12` và thêm `RQ-16`..`RQ-19`; mở rộng năm STEP; viết lại `AC-01`, `AC-05`, `AC-06`, `AC-07`, `AC-10`, `AC-12` và thêm `AC-16`..`AC-19`; thêm `RISK-10`..`RISK-14`. Bốn lỗi đo được sửa bằng cách đọc mã: ngân sách `APPLY_PHONE` 5 lượt mỗi giờ so với kịch bản cần đúng 5 lượt; replay chặn trước khi kiểm job nên key cũ sau unpublish trả `201`; sản phẩm của GO-LIVE-06 là file migration nên SHA không chứng minh được DB; và hai mã `409` khác nghĩa nhau | Ba dependency của `v1.0` đều `ACCEPTED` nên phần trạng thái đã sai; bốn lỗi đo sẽ sinh verdict oan hoặc bỏ dở drill giữa production |
| `v1.0` | `2026-08-30` | Contract launch proof ban đầu; tách mutation drill khỏi code tasks, khóa privacy/scope/rollback/sign-off | Chuỗi GO-LIVE-04→06→05→07 |
