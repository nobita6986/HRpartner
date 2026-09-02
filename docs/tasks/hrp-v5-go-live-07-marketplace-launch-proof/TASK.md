# TASK: hrp-v5-go-live-07-marketplace-launch-proof

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-07-marketplace-launch-proof` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.4` |
| Status | `READY_FOR_EXECUTION` — MỌI điều kiện xếp hàng đã đóng: ba dependency của `v1.0` (GO-LIVE-04, GO-LIVE-06, GO-LIVE-05) `ACCEPTED`, và `hrp-v5-go-live-09-public-board-architecture` `ACCEPTED` ngày 02/09. Chân DB của `DEC-17` cũng đã có bằng chứng sổ: xem `EV-21`. Điều kiện DEPLOY 09 cũng đã đóng: mã của 09 lên `main` ở commit `bb8a983` và production đã chạy mã đó. KHÔNG còn cửa chặn nào |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — operator/evidence recorder dưới quyền Owner |
| Auditor | Tier 3 — independent live verifier |
| Baseline | Planning anchor `3a95c29` (đã push, đo lại ngày 02/09; anchor `v1.0` là `6680011` và cách mã hiện tại 69 commit nên đã bỏ). HANDOFF phải ghi commit SHA và Vercel deployment SHA thật được kiểm, cộng chân DB của `DEC-17` |
| Modules | Marketplace production browse/apply/tracking/HR queue + launch runbook |
| ADR references | `UNIFIED_PLAN_v5.md §7.9.7`; `docs/runbooks/marketplace-launch-operations.md`; `docs/runbooks/marketplace-launch-drill.md` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Giao `/code hrp-v5-go-live-07-marketplace-launch-proof` — giao được NGAY, vì 09 đã `ACCEPTED`, đã push và đã deploy ngày 02/09 nên bề mặt LIVE đúng với mã. Owner có quyền giao SỚM HƠN theo `DEC-14`, đổi lại report phải mang ghi chú phạm vi và một nghĩa vụ đo lại phần bề mặt |
| Updated | `2026-09-02 21:55 Asia/Bangkok` |

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
- Không dùng dữ liệu cá nhân của bất kỳ người thứ ba nào. Identity drill là dữ liệu TỔNG HỢP do contract cố định ở `DEC-19`, sau khi Owner uỷ quyền Tier 1 tự sinh ngày 02/09; Tier 2 KHÔNG được thay bằng số hay tên của một người thật, kể cả của chính mình.
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
| `EV-19` | `docs/tasks/hrp-v5-go-live-09-public-board-architecture/TASK.md` ở `v1.2` | `go-live-09` là task go-live DUY NHẤT còn mở. Nó viết lại chính trang browse mà `RQ-04` chứng nhận và công bố lương giờ lên card lần đầu (`DEC-19` của TASK 09 thay điều kiện cấm của GO-LIVE-05) | Chứng nhận phải tách làm hai phần: phần HÀNH TRÌNH không phụ thuộc 09, phần BỀ MẶT thì phụ thuộc. Xem `DEC-14` và `RQ-18`/`RQ-19` |
| `EV-21` | Truy vấn `_prisma_migrations` do Owner chạy trong Neon SQL editor ngày 02/09, sắp theo `migration_name desc limit 6`, cộng `git ls-files prisma/migrations` của Tier 1 | Chân DB của `DEC-17` CÓ bằng chứng sổ: `20260830214139_m14_rls_matrix_repair` có `finished_at` là `2026-08-31 02:41:28.238143+00` và `applied_steps_count` bằng `1`, tức migration ma trận RLS của GO-LIVE-06 đã CHẠY XONG trên `hrp-live` chứ không chỉ nằm trong repo. Năm migration khác cũng có dòng: `20260831103000_marketplace_search_tracking_profile`, `20260829093000_mp2_public_rpc_schema_usage`, `20260827160000_m1_07b_rls_runtime_posture_closure`, `20260826120000_m1_07a_ticket_rls_backstop`, `20260825090000_mp3c_assignment_placement_links`. HAI giới hạn phải ghi nguyên văn vào HANDOFF, không được bỏ: **một**, branch nào được chọn trong editor là LỜI KHAI của Owner, Tier 1 không đo được điều đó, nên nếu đọc được `current_database()` hay tên branch trong cùng một lần chạy thì phải dán kèm; **hai**, `20260831160000_public_rpc_residual_grant_revoke` KHÔNG có dòng nào trong sổ, và điều đó là ĐÚNG THIẾT KẾ chứ không phải khoảng trống: header của chính `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql` ghi "CÁCH ÁP (`DEC-07`/`DEC-08`): Neon Console SQL Editor, branch `hrp-live`, dán nguyên văn toàn bộ file. KHÔNG dùng `prisma migrate deploy`" — một lệnh dán tay không bao giờ ghi dòng vào sổ. Trạng thái quyền của nó đã được đo TRỰC TIẾP bằng `pg_auth_members` chứ không suy từ sổ, và số đo nằm trong `docs/tasks/hrp-v5-go-live-11-public-rpc-residual-grant/TASK.md`: `total=1, residual_self_grant=0, inheritable=0, safe_admin=1`, dòng còn lại là `member=neondb_owner` với `grantor=cloud_admin`, `admin_option=t`, `inherit_option=f`, `set_option=f`; `AC-03` của task đó PASS bằng lần chạy thứ hai ngày 01/09 cho ra bốn số ấy NGAY TỪ ĐẦU và không có dòng `THU HOI` nào, tức REVOKE đã có hiệu lực trước đó. Vậy chỗ này KHÔNG có việc gì phải làm thêm | `RQ-17`, `AC-01`, `AC-17`, `RISK-15` |
| `EV-20` | `src/domains/applications/application.service.ts` dòng 126-129; `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` dòng 97-102; `app/api/public/jobs/[slug]/applications/route.ts` dòng 103-135; grep sáu từ khoá gửi tin trong `app/api/public/jobs/` ra 0 dòng; `src/shared/integrity/outbox.ts` dòng 14 (đo 02/09) | KHÔNG có phép kiểm ĐỊNH DẠNG số điện thoại ở bất kỳ tầng nào: Node chỉ đòi `normalizePhone` ra chuỗi không rỗng, definer chỉ đòi `length` lớn hơn 0 — không kiểm độ dài, không kiểm đầu số. Bucket `APPLY_PHONE` khoá trên `normalizedPhone` nên hai số khác nhau là hai ngân sách khác nhau, còn `APPLY_IP` 10 lượt mỗi 600 giây khoá trên IP nên MỌI lượt apply dùng CHUNG một ngân sách bất kể số nào. Đường apply không gọi kênh gửi tin nào; kênh thật email/SMS/Zalo còn ở Phase 4 | Drill KHÔNG cần số của người thật và cũng không nhắn tin cho ai, nên `DEC-19` cố định hai số TỔNG HỢP thay vì chờ Owner cấp. Đổi lại, sổ lượt gọi của `RQ-16` phải đếm THÊM ngân sách IP, thứ mà việc chia hai số không nới ra |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Drill chạy trên production deployment pre-announcement vì không có staging app; dữ liệu drill phải nhận diện rõ và kết thúc bằng nghiệp vụ | Existing drill decision | Final cho round này |
| `DEC-02` | `CHOSEN` | Dùng một Project/Order drill riêng; code/title có prefix `DRILL-MKT`; không dùng order tuyển thật cho bước đóng trạng thái một chiều | Tier 1 safety | Final |
| `DEC-03` | `CHOSEN` | Applicant drill dùng identity TỔNG HỢP theo `DEC-19` — Owner uỷ quyền Tier 1 sinh giá trị ngày 02/09, thay cho phương án dùng identity của Owner. Evidence luôn che tracking code; vì identity là tổng hợp nên không còn giá trị cá nhân nào phải che, và tuyệt đối không đưa CCCD của người thật vào drill | Privacy | Final |
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
| `DEC-15` | `CHOSEN` | Trước lần apply đầu tiên, Tier 2 phải viết một **sổ lượt gọi**: liệt kê từng lần apply dự kiến, số điện thoại dùng, idempotency key dùng và kết quả mong đợi. Ba lượt đầu (first, replay, duplicate-new-key) BUỘC dùng cùng số điện thoại A vì duplicate guard khoá trên số điện thoại. Hai lượt trạng thái âm (sau unpublish, sau close order) dùng số điện thoại B của `DEC-19`. Sổ còn phải đếm CẢ ngân sách IP: `APPLY_IP` là 10 lượt mỗi 600 giây trên MỘT IP và việc chia hai số KHÔNG nới ngân sách đó | Tier 1, `EV-15`, `EV-20` | Final |
| `DEC-16` | `CHOSEN` | Mọi lượt apply sau khi đổi trạng thái job hoặc order BUỘC dùng idempotency key MỚI. Dùng lại key cũ trả `201` đã lưu vì replay chặn trước khi kiểm job, và đó là hành vi đúng của hệ thống, không phải lỗi | Tier 1, `EV-14` | Final |
| `DEC-17` | `CHOSEN` | `AC-01` có hai chân độc lập. Chân MÃ: deployment SHA chứa các commit đã `ACCEPTED`. Chân DB: bằng chứng RLS matrix đã CHẠY trên `hrp-live`. Chân DB nay đã có bằng chứng sổ ở `EV-21` (`finished_at` không rỗng cộng `applied_steps_count` bằng `1`), nên HANDOFF chỉ cần DẪN LẠI `EV-21` kèm hai giới hạn của nó, KHÔNG phải đi tìm lại. Bằng chứng hành vi ở `RQ-08` vẫn được nhận và MẠNH HƠN sổ, vì sổ chứng minh migration chạy còn hành vi chứng minh policy có hiệu lực. Một file migration có trong SHA KHÔNG phải bằng chứng nó đã chạy | Tier 1, `EV-05`, `EV-21` | Final |
| `DEC-18` | `CHOSEN` | `no-store` chỉ bắt buộc ở nhánh 200 của tracking. Nhánh 404 hiện không có header đó; việc này được ghi làm **residual finding** trong report, không phải blocker, vì task này cấm sửa source | Tier 1, `EV-16` | Tới task hardening kế tiếp |
| `DEC-19` | `CHOSEN` | Identity drill là dữ liệu TỔNG HỢP cố định trong contract, KHÔNG phải của người thật. Số A là `090000000001`, số B là `090000000002`: 12 chữ số, dài hơn mọi số điện thoại Việt Nam nên không thể trùng thuê bao của ai, mà vẫn qua được cả hai tầng kiểm theo `EV-20`. Hai số cho hai dạng che khác nhau, `090******001` và `090******002`, nên evidence phân biệt được A với B. Họ tên là `DRILL-MKT UNG VIEN A` và `DRILL-MKT UNG VIEN B`, giữ prefix `DRILL-MKT` của mục 4.3. Drill KHÔNG gửi CCCD: `cccdNumber` để null nên `cccdMasked` trả null, và đó là kết quả MONG ĐỢI của `RQ-07` chứ không phải thiếu bằng chứng, vì phép che CCCD đã đóng bằng unit test ở GO-LIVE-13. Vì hai identity này không thuộc về ai, chúng ĐƯỢC ghi nguyên văn vào sổ lượt gọi và report — chỉ tracking code là vẫn phải che. Nếu một bề mặt nào từ chối chúng thì đó là FINDING phải ghi, KHÔNG được thay bằng số thật; số 12 chữ số hiển thị lệch định dạng trong panel admin là mong đợi, không phải defect | Tier 1, `EV-20`, uỷ quyền Owner 02/09 | Final |

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
| `RQ-12` | Report mask PII/secret, có request-id/status/timestamp/SHA và before-after state. Riêng `fullName`: API trả nguyên văn, và vì giá trị đó là tên TỔNG HỢP của `DEC-19` nên ghi nguyên văn để tái lập được; điều bị cấm là dán tên hoặc số của một người THẬT. Tracking code vẫn chỉ ghi dạng che vì nó là bearer secret | Must | `DEC-03`, `DEC-05`, `DEC-19`, `EV-16` | Secret/PII leak → revoke artifact + BLOCK |
| `RQ-13` | Runbook operations và drill được cập nhật kết quả thật, Owner ký rõ PASS/FAIL/deferred rows | Must | `EV-02/03`, `DEC-12` | Không chữ ký → không APPROVED |
| `RQ-14` | Tier 3 chạy independent live verification và `verify-audit.ps1` PASS | Must | Pipeline | Không audit → BLOCK |
| `RQ-15` | Commit chỉ gồm report/runbook/HANDOFF/AUDIT/TASK resolution; không gom WIP ngoài scope | Must | `EV-10` | Scope leak → reject commit |
| `RQ-16` | Trước lượt apply ĐẦU TIÊN, HANDOFF phải có sổ lượt gọi: từng lượt apply dự kiến kèm số điện thoại, idempotency key và kết quả mong đợi; ba lượt đầu trên số A, hai lượt trạng thái âm trên số B. Tổng số lượt trên mỗi số không quá 4 để còn dư một lượt, và sổ phải có thêm một dòng tổng số lượt apply trên MỘT IP đối chiếu ngân sách 10 lượt mỗi 600 giây. Ô số điện thoại của mọi dòng bằng đúng một trong hai giá trị của `DEC-19` | Must | `EV-15`, `EV-20`, `DEC-15`, `DEC-19` | Không có sổ trước khi gọi → dừng; vượt ngân sách rồi gặp `429` → ghi trung thực, KHÔNG chờ hết window để lách; dùng một số thứ ba → dừng và báo Owner |
| `RQ-17` | Chân DB của `DEC-17` phải có bằng chứng riêng: RLS matrix đã chạy trên `hrp-live`. Dẫn lại `EV-21` là ĐỦ cho chân này, với điều kiện dán CẢ hai giới hạn của `EV-21`; nếu đo thêm được hành vi ở `RQ-08` thì ghi cả hai. Cùng bước, nếu HANDOFF nhắc tới `20260831160000_public_rpc_residual_grant_revoke` thì phải ghi ĐÚNG hai điều: nó không có dòng trong sổ, VÀ lý do là contract go-live-11 buộc dán tay trong Neon Console và cấm `prisma migrate deploy`, nên trạng thái quyền của nó đã được đo trực tiếp bằng `pg_auth_members` và đã đạt ngưỡng — dẫn lại `EV-21`. Cấm ghi nó thành một câu hỏi còn mở, và cấm kết luận trạng thái grant TỪ SỔ theo cả hai chiều | Must | `EV-05`, `EV-21`, `DEC-17` | Chỉ có bằng chứng SHA → `AC-01` chưa đạt, không được suy diễn; kết luận trạng thái grant từ sổ → BLOCK; ghi dòng thiếu ấy thành nghi vấn còn mở → BLOCK |
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
- Dùng HAI số điện thoại TỔNG HỢP mà `DEC-19` cố định: số A `090000000001` cho ba lượt apply đầu, số B `090000000002` cho hai lượt trạng thái âm (`DEC-15`). Không thay bằng số của người thật.
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

- **Data:** record drill có prefix `DRILL-MKT`; applicant là identity TỔNG HỢP của `DEC-19`, không phải người thật. `fullName` được API trả nguyên văn và vì nó là tên tổng hợp nên ghi được nguyên văn; tracking code thì luôn che, và không một giá trị nào của người thật được dán vào report hay HANDOFF.
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
| `AC-12` | `RQ-12` | Report có đủ SHA/timestamp/request-id/state, không có secret, không có tracking code thô, và không có giá trị cá nhân nào ngoài hai identity tổng hợp của `DEC-19` | Scan cộng review | Zero forbidden patterns, cộng phép grep chứng minh mọi tên và số trong artifact đều thuộc `DEC-19` | Yes |
| `AC-13` | `RQ-13` | Owner ký runbook và kết luận PASS/FAIL rõ | Document review | Signed section | Yes |
| `AC-14` | `RQ-14` | Tier 3 independent audit PASS và verifier exit 0 | Audit command | AUDIT + output | Yes |
| `AC-15` | `RQ-15` | Commit chỉ có artifact cho launch proof/runbook | Git scope check | Name-only diff | Yes |
| `AC-16` | `RQ-16` | Sổ lượt gọi có trong HANDOFF và có timestamp TRƯỚC lượt apply đầu tiên; mỗi số điện thoại không quá 4 lượt | Document review cộng đối chiếu timestamp | Sổ cộng log lượt gọi thật | Yes |
| `AC-17` | `RQ-17` | Chân DB có bằng chứng riêng, không suy diễn từ SHA | Behavioural hoặc `_prisma_migrations` | Output thật | Yes |
| `AC-18` | `RQ-18` | Nếu 09 chưa deploy, report có mục phạm vi và nghĩa vụ đo lại `RQ-04`/`RQ-19`; nếu 09 đã deploy thì ghi rõ điều đó và mục phạm vi không cần | Document review | Mục phạm vi hoặc dòng ghi 09 đã deploy | Yes |
| `AC-19` | `RQ-19` | Con số lương công khai là lương giờ của người lao động; response `/api/jobs` không có khoá nào về client, budget, margin, billing | HTTP cộng đối chiếu nguồn | Danh sách khoá thật của response | Yes nếu 09 đã deploy; `DEFERRED` có căn cứ nếu chưa |
| `AC-20` | `RQ-16` | Mọi ô số điện thoại và họ tên trong sổ lượt gọi cùng trong report bằng đúng các giá trị của `DEC-19`, không có giá trị thứ ba; và sổ có dòng đối chiếu ngân sách IP | Grep cộng đối chiếu sổ | Sổ lượt gọi cộng output grep | Yes |

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
| `RQ-16` | `STEP-01` | `AC-16`, `AC-20` |
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
| `RISK-10` | Ngân sách `APPLY_PHONE` cạn giữa drill, Tier 2 gặp `429` và bỏ dở với một record nửa vời trên production | Kịch bản cần đúng 5 lượt trên một số mà ngân sách đúng 5 lượt mỗi giờ; một lần bấm sai là hết | `EV-15` đo ngân sách thật; `RQ-16` buộc viết sổ lượt gọi TRƯỚC lượt đầu và chia hai số điện thoại; sổ còn phải đếm ngân sách `APPLY_IP` 10 lượt mỗi 600 giây mà việc chia số KHÔNG nới ra; `AC-16` kiểm timestamp của sổ | Chờ hết window rồi tiếp tục ĐÚNG bước còn thiếu, ghi `429` trung thực; không xoá record, không SQL |
| `RISK-11` | Gọi lại apply bằng idempotency key CŨ sau unpublish, nhận `201` đã lưu, rồi kết luận SAI là unpublish không chặn apply — sinh verdict `ROLLBACK_REQUIRED` oan trên một hệ thống lành | Replay chặn trước khi kiểm job trong definer (`EV-14`) | `DEC-16` buộc key mới; `RQ-10` và `AC-10` đòi sổ key chứng minh từng lượt dùng key mới | Đo lại đúng một lượt bằng key mới trước khi kết luận bất cứ điều gì |
| `RISK-12` | Ký `GO_LIVE_APPROVED` cho một bề mặt sắp đổi vì `go-live-09` chưa land; hoặc ngược lại, chạy lại CẢ drill mutation lần hai chỉ để đo lại phần bề mặt | 09 là task go-live duy nhất còn mở và nó viết lại trang browse | `DEC-14` tách chứng nhận thành phần hành trình và phần bề mặt; `RQ-18` buộc report mang mục phạm vi; phần đo lại là READ-ONLY | Đo lại `RQ-04` và `RQ-19` sau khi 09 deploy, không tạo record drill mới |
| `RISK-13` | Suy diễn chân DB từ SHA: thấy file migration trong deployment SHA rồi kết luận RLS đã áp trên `hrp-live`, trong khi migration chưa chạy | Sản phẩm của GO-LIVE-06 là một file trong repo (`EV-05`) | `DEC-17` chia `AC-01` thành hai chân độc lập; `AC-17` đòi bằng chứng DB riêng | Dừng trước mọi mutation, nhờ Owner áp migration, đo lại chân DB |
| `RISK-15` | Đọc sổ `_prisma_migrations` như một bản kê trạng thái quyền. Dạng cụ thể đã xảy ra thật với chính Tier 1: thấy `20260831160000_public_rpc_residual_grant_revoke` không có dòng rồi báo động rằng REVOKE của GO-LIVE-11 có thể chưa có hiệu lực trên production. Chiều ngược cũng sai: thấy có dòng rồi kết luận quyền đã sạch | Sổ chỉ ghi migration mà Prisma CHẠY, và ở đây contract go-live-11 CỐ Ý cấm `prisma migrate deploy` nên vắng dòng là kết quả mong đợi. Một dòng trong sổ cũng không nói quyền hiện tại là gì. Chỉ `pg_auth_members` hay `information_schema` nói được | `RQ-17` cấm kết luận trạng thái grant từ sổ theo cả hai chiều và cấm ghi dòng thiếu ấy thành nghi vấn còn mở; `EV-21` mang sẵn số đo trực tiếp để dẫn lại | Trước khi báo động về một migration vắng dòng, ĐỌC HEADER của chính file migration đó để biết nó được thiết kế áp bằng đường nào — một `grep` là đủ, và ở đây nó biến một cảnh báo thành một sự thật đã đóng |
| `RISK-14` | Tier 2 thay số tổng hợp bằng số của một người thật — của chính mình hoặc của đồng nghiệp — vì thấy 12 chữ số trông như sai, thế là ghi PII thật vào một record production | Số của `DEC-19` dài 12 chữ số nên trông lạ, mà không tầng nào chặn một số 10 chữ số hợp lệ (`EV-20`) | `DEC-19` cấm thay thế và nói rõ vì sao 12 chữ số là CHỦ Ý; `AC-20` đòi grep chứng minh sổ chỉ chứa hai giá trị đó | Dừng drill và báo Owner; record đã tạo bằng số thật thì xử theo runbook, không xoá bằng SQL |

## 8. Open Questions

Không còn câu hỏi chặn contract. Owner chỉ ký sau khi execution evidence hoàn tất; chữ ký là gate vận hành, không phải quyết định thiết kế giao cho Tier 2.

Câu hỏi thứ tự — chạy drill trước hay sau `go-live-09` — đã được `DEC-14` trả lời và KHÔNG chặn: phần hành trình có giá trị bất kể 09, phần bề mặt thì kèm nghĩa vụ đo lại. Quyền chọn thời điểm là của Owner; contract chỉ ghi rõ cái giá của mỗi lựa chọn.

## 9. Planner Resolution

Tier 1 append quyết định sau audit. `GO_LIVE_APPROVED` chỉ được ghi khi Tier 3 PASS và Owner sign-off đều có thật.

Contract đã được **neo lại ở `v1.1`** ngày 02/09 trước khi giao `/code`. Lý do: anchor `6680011` của `v1.0` cách mã hiện tại **69 commit**, và trong khoảng đó ba dependency của nó cùng năm task khác đã đóng, nên ba dòng evidence `EV-04`/`EV-05`/`EV-06` mô tả các task đang chờ fix như thể còn chờ. Ngoài việc làm mới trạng thái, bốn lỗi ĐO đã được sửa bằng cách đọc mã: **một**, ngân sách `APPLY_PHONE` là 5 lượt mỗi giờ trong khi kịch bản cần đúng 5 lượt trên một số điện thoại, tức không còn dư một lượt nào cho lỗi bấm. **Hai**, trong definer function replay chặn TRƯỚC khi kiểm job, nên apply lại bằng key cũ sau unpublish trả `201` đã lưu và sẽ bị đọc thành "unpublish không chặn apply". **Ba**, sản phẩm của GO-LIVE-06 là một file migration trong repo, nên `AC-01` cũ chứng minh được mã mà không chứng minh được DB. **Bốn**, có HAI mã `409` khác nghĩa nhau nên ghi con số 409 trơn không phân biệt được duplicate với payload mismatch. Cùng lượt, `RQ-07` đổi từ "safe DTO" chung chung sang allow-list 11 khoá thật cộng khoá bọc `application`, và `no-store` được thu về đúng nhánh 200 vì nhánh 404 không có header đó và task này cấm sửa mã.

Neo tiếp ở **`v1.3`** ngày 02/09, và lần này contract KHÔNG đổi phép đo nào — nó chỉ ghi lại một bằng chứng vừa có thật. Owner đã chạy truy vấn `_prisma_migrations` trên `hrp-live` mà `DEC-17` xin, và chân DB của `AC-01` đóng được: `20260830214139_m14_rls_matrix_repair` có `finished_at` không rỗng cùng `applied_steps_count` bằng `1`, tức ma trận RLS của GO-LIVE-06 đã CHẠY XONG chứ không chỉ nằm trong repo. Điều đó dựng thành `EV-21` để Tier 2 dẫn lại thay vì đi tìm, và `DEC-17` cùng `RQ-17` được viết lại để trỏ tới nó. Hai giới hạn đi kèm là phần quan trọng hơn cả kết quả: **một**, branch nào được chọn trong Neon SQL editor là LỜI KHAI của Owner chứ không phải thứ Tier 1 đo được, nên nếu đọc được tên branch trong cùng một lần chạy thì phải dán kèm. **Hai**, `20260831160000_public_rpc_residual_grant_revoke` không có dòng nào trong sổ. Ở `v1.3` Tier 1 đã gọi đó là một "khoảng trống nghiêm trọng" với hai cách đọc, và **`v1.4` sửa lại chính câu đó**: nó không phải khoảng trống, nó là đúng thiết kế. Header của chính file migration ghi "CÁCH ÁP: Neon Console SQL Editor, branch `hrp-live`, dán nguyên văn toàn bộ file. KHÔNG dùng `prisma migrate deploy`" — một lệnh dán tay không bao giờ ghi dòng vào sổ, nên vắng dòng là kết quả MONG ĐỢI. Và trạng thái quyền không cần suy từ sổ vì nó đã được đo trực tiếp: `TASK.md` của GO-LIVE-11 lưu output thật của Owner là `total=1, residual_self_grant=0, inheritable=0, safe_admin=1` với dòng còn lại `grantor=cloud_admin, admin_option=t, inherit_option=f, set_option=f`, và `AC-03` PASS bằng lần chạy thứ hai ngày 01/09 cho ra bốn số ấy ngay từ đầu, không có dòng `THU HOI` nào — tức REVOKE đã có hiệu lực. Vì vậy `RISK-15` giữ nguyên luật cấm đọc sổ như bản kê quyền, nhưng đổi ví dụ sang dạng đã xảy ra thật, và thêm một bước rẻ vào phần cách chặn: trước khi báo động về một migration vắng dòng, ĐỌC HEADER của chính file đó để biết nó được thiết kế áp bằng đường nào. Một `grep` biến cảnh báo này thành một sự thật đã đóng, và không có việc gì phải giao cho Owner.

Neo lại ở **`v1.4`** cùng ngày 02/09, và lần này contract sửa chính nó. Cửa sổ bump vẫn MỞ vì `Current audit round` của task này là `0` — chưa bản audit nào chạy trên nó, nên không có gate nào so version để bị FAIL oan. Hai thay đổi. **Một**, điều kiện DEPLOY của 09 đã đóng: mã lên `main` ở `bb8a983` và production chạy mã đó, nên mục 0 không còn cửa chặn nào và task này giao được ngay. **Hai**, `v1.3` đã ghi SAI một cảnh báo, và cái sai đó tự nó là bài học đáng giữ hơn cả nội dung: Tier 1 thấy `20260831160000_public_rpc_residual_grant_revoke` vắng dòng trong `_prisma_migrations` rồi dựng thành "khoảng trống nghiêm trọng" cần Owner đo lại, mà chưa đọc header của chính file migration ấy. Header nói rõ nó được thiết kế để dán tay trong Neon Console và CẤM `prisma migrate deploy`, nên vắng dòng là kết quả mong đợi; còn trạng thái quyền thì GO-LIVE-11 đã đo trực tiếp bằng `pg_auth_members` và lưu số vào `TASK.md` của nó. Một `grep` đủ để biết điều đó. Bài học ghi vào phần cách chặn của `RISK-15`: trước khi báo động về một migration vắng dòng, đọc đường áp mà file đó tự khai.

Neo tiếp ở **`v1.2`** cùng ngày, sau khi Owner uỷ quyền Tier 1 tự sinh hai số điện thoại drill thay vì tự cấp. Việc uỷ quyền buộc phải ĐO trước khi sinh số, và phép đo đổi luôn thiết kế: không tầng nào kiểm định dạng số điện thoại — Node chỉ đòi chuỗi không rỗng, definer chỉ đòi độ dài lớn hơn 0 — mà đường apply cũng không gửi tin nhắn nào, vì kênh thật còn ở Phase 4. Hai điều đó cho phép chọn hai số 12 chữ số KHÔNG THỂ là số của ai, thay vì sinh hai số 10 chữ số trông thật mà rất có thể đang là thuê bao của một người lạ — người lạ đó sẽ nằm trong một record production, và một nhân sự mở panel admin thì rất có thể sẽ gọi. Cùng lượt đo, một khoảng trống của `v1.1` lộ ra: `v1.1` chia hai số điện thoại để cứu ngân sách `APPLY_PHONE`, nhưng `APPLY_IP` là 10 lượt mỗi 600 giây và khoá trên IP, nên việc chia số KHÔNG nới nó ra chút nào; sổ lượt gọi của `RQ-16` giờ phải đếm cả ngân sách đó. Vì identity đã thành dữ liệu tổng hợp, ba chỗ nói ngược nhau được sửa cùng lúc: `DEC-03` bỏ điều kiện dùng identity của Owner, còn `RQ-12` và mục 4.3 thôi cấm ghi `fullName` nguyên văn — cấm một cái tên TỔNG HỢP thì sổ lượt gọi không thể viết ra được, mà thứ đáng cấm là tên hoặc số của người THẬT. Tracking code thì vẫn che, vì nó là bearer secret chứ không phải PII.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.4` | `2026-09-02` | Sửa `EV-21`, `RQ-17`, `RISK-15` cùng đoạn văn của `v1.3`; mục 0 đổi `Status`, `Next gate`, `Spec version`, `Updated` | Hai việc. Điều kiện DEPLOY của 09 đã đóng ở commit `bb8a983` nên task này hết cửa chặn. Và `v1.3` đã ghi sai một cảnh báo: dòng vắng của `20260831160000_public_rpc_residual_grant_revoke` trong `_prisma_migrations` KHÔNG phải khoảng trống mà là đúng thiết kế, vì header file migration cấm `prisma migrate deploy` và buộc dán tay; trạng thái quyền đã được GO-LIVE-11 đo trực tiếp bằng `pg_auth_members` ra `total=1, residual_self_grant=0, inheritable=0, safe_admin=1`. Không có việc nào cần giao cho Owner. Cửa sổ bump còn mở vì `Current audit round` bằng `0` |
| `v1.3` | `2026-09-02` | Thêm `EV-21` và `RISK-15`; viết lại `DEC-17`, `RQ-17`, cộng ba dòng mục 0 (`Status`, `Next gate`, `Spec version`) | Owner đã chạy truy vấn `_prisma_migrations` mà `DEC-17` xin, nên chân DB của `AC-01` có bằng chứng sổ và Tier 2 chỉ cần dẫn lại. Không phép đo nào bị đổi. Cùng kết quả lộ ra `20260831160000_public_rpc_residual_grant_revoke` KHÔNG có dòng trong sổ, nên `RISK-15` cấm đọc sổ như bản kê quyền và `RQ-17` buộc ghi đúng sự thật đó rồi dừng. Điều kiện xếp hàng `go-live-09` cũng đã `ACCEPTED` cùng ngày |
| `v1.2` | `2026-09-02` | Identity drill chuyển sang dữ liệu TỔNG HỢP: thêm `EV-20` và `DEC-19` cố định số A `090000000001`, số B `090000000002` cùng hai họ tên prefix `DRILL-MKT`, và cố định `cccdNumber` là null; viết lại `DEC-03`, `RQ-12`, `AC-12`, một non-goal của mục 3, mục 4.2 và mục 4.3 cho hết ngược nhau; mở rộng `DEC-15` cùng `RQ-16` sang ngân sách `APPLY_IP`; thêm `AC-20`; viết lại `RISK-14` và mitigation của `RISK-10` | Owner uỷ quyền Tier 1 tự sinh số ngày 02/09. Đo trước khi sinh cho thấy không tầng nào kiểm định dạng và đường apply không gửi tin, nên chọn được số không thể trùng thuê bao thật thay vì số 10 chữ số trông thật; cùng lượt lộ ra `APPLY_IP` khoá trên IP nên việc chia hai số của `v1.1` không nới ngân sách đó |
| `v1.1` | `2026-09-02` | Neo lại contract sau 69 commit: `EV-02` đo lại, `EV-04`/`EV-05`/`EV-06`/`EV-07`/`EV-10` viết lại, thêm `EV-13`..`EV-19`; thêm `DEC-13`..`DEC-18`; viết lại `RQ-01`, `RQ-04`, `RQ-05`, `RQ-06`, `RQ-07`, `RQ-10`, `RQ-12` và thêm `RQ-16`..`RQ-19`; mở rộng năm STEP; viết lại `AC-01`, `AC-05`, `AC-06`, `AC-07`, `AC-10`, `AC-12` và thêm `AC-16`..`AC-19`; thêm `RISK-10`..`RISK-14`. Bốn lỗi đo được sửa bằng cách đọc mã: ngân sách `APPLY_PHONE` 5 lượt mỗi giờ so với kịch bản cần đúng 5 lượt; replay chặn trước khi kiểm job nên key cũ sau unpublish trả `201`; sản phẩm của GO-LIVE-06 là file migration nên SHA không chứng minh được DB; và hai mã `409` khác nghĩa nhau | Ba dependency của `v1.0` đều `ACCEPTED` nên phần trạng thái đã sai; bốn lỗi đo sẽ sinh verdict oan hoặc bỏ dở drill giữa production |
| `v1.0` | `2026-08-30` | Contract launch proof ban đầu; tách mutation drill khỏi code tasks, khóa privacy/scope/rollback/sign-off | Chuỗi GO-LIVE-04→06→05→07 |
