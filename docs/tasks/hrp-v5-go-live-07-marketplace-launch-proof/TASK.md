# TASK: hrp-v5-go-live-07-marketplace-launch-proof

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-07-marketplace-launch-proof` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` — queued sau GO-LIVE-04, GO-LIVE-06 và GO-LIVE-05 |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — operator/evidence recorder dưới quyền Owner |
| Auditor | Tier 3 — independent live verifier |
| Baseline | Planning anchor `6680011`; HANDOFF phải ghi commit SHA và Vercel deployment SHA thật được kiểm |
| Modules | Marketplace production browse/apply/tracking/HR queue + launch runbook |
| ADR references | `UNIFIED_PLAN_v5.md §7.9.7`; `docs/runbooks/marketplace-launch-operations.md`; `docs/runbooks/marketplace-launch-drill.md` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Chỉ giao `/code hrp-v5-go-live-07-marketplace-launch-proof` khi ba dependency đã `ACCEPTED`, push và deploy |
| Updated | `2026-08-30 Asia/Bangkok` |

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
| `EV-02` | `docs/runbooks/marketplace-launch-operations.md` | Runbook đang `READY_FOR_OWNER_REVIEW`, chưa phải signed-off | Phải chạy và ký, không được mark PASS theo việc “đã có tài liệu” |
| `EV-03` | `docs/runbooks/marketplace-launch-drill.md` | Drill đã mô tả publish/apply/tracking/duplicate/unpublish/republish/close/convert | Tái sử dụng, không sáng tác quy trình khác |
| `EV-04` | GO-LIVE-04 contract | Public read hiện cần RLS context cố định; trước fix list trả 0 và detail 404 dù job đã publish | Production list/detail là gate bắt buộc |
| `EV-05` | GO-LIVE-06 contract | Live thiếu policy cho 15 bảng; candidate queue có thể đọc rỗng dù RPC apply ghi thành công | HR queue proof chỉ hợp lệ sau task 06 |
| `EV-06` | GO-LIVE-05 contract | Card hiện có salary/company/location/schedule bịa và filter giả | Visual browse chỉ được ký sau task 05 |
| `EV-07` | OPS-06A accepted artifacts | Apply/tracking/browse đã có distributed limiter, content-type/body cap, CV disabled và legacy endpoints 410 | Drill kiểm đường canonical, không dùng endpoint cũ |
| `EV-08` | MP-2 accepted artifacts | Canonical apply trả `trackingCode/status`; tracking DTO không lộ PII | Report chỉ ghi masked code/request-id/status |
| `EV-09` | MP-3B/MP-3C accepted artifacts | Convert/dedup/assignment invariants đã có test | Drill xác nhận một narrative production, không thay audit race matrix |
| `EV-10` | Repo state | `public/index.html`, `scratch/*`, `.neon`, aff docs có thể dirty ngoài stream | Commit evidence phải path-scoped, cấm `git add -A` |
| `EV-11` | Owner override 2026-08-28 | `/bcc` retired; Payroll thuộc app lương riêng và không block Marketplace | Không đưa payroll/bcc vào launch approval |
| `EV-12` | Owner product decision | CV không bắt buộc; raw upload tắt. Phone-only Quick Apply là slice sau | Full form đủ cho controlled launch; report phải nói thật residual |

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

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Preflight xác nhận branch, HEAD, origin, Vercel production deployment SHA và ba dependency ACCEPTED | Must | `DEC-06` | SHA/gate lệch → BLOCK |
| `RQ-02` | Production env có các tên biến bắt buộc nhưng evidence không in giá trị; debug/internal DB probe không public | Must | Security | Thiếu env/route lộ → BLOCK |
| `RQ-03` | Tạo/publish Project + Order + Slot `DRILL-MKT` qua UI/API nghiệp vụ, không SQL insert | Must | `DEC-01/02` | Không đủ quyền/validation → BLOCK |
| `RQ-04` | Anonymous list/detail hiển thị đúng job drill và card truth; private/unpublished job không hiện | Must | `EV-04/06` | Empty/404/leak → BLOCK |
| `RQ-05` | Canonical apply lần đầu trả `201` + tracking code; không dùng legacy endpoint | Must | MP-2/OPS-06A | 5xx/410/wrong shape → BLOCK |
| `RQ-06` | Replay cùng key/body trả cùng kết quả; key mới cùng phone/job trả `409 DUPLICATE_APPLICATION` và không tạo row thứ hai | Must | Idempotency | Duplicate row → ROLLBACK_REQUIRED |
| `RQ-07` | Tracking thật trả `200` safe DTO; unknown đúng format trả generic `404`; response `no-store` | Must | MP-2 | PII/existence leak → ROLLBACK_REQUIRED |
| `RQ-08` | HR queue sau login thấy đúng submission, project/slot/source; role không được phép không thấy queue | Must | GO-LIVE-06/M1 | Queue rỗng/cross-role leak → BLOCK |
| `RQ-09` | HR xử lý record drill tới trạng thái cuối hợp lệ; dedup branch được ghi đúng PASS hoặc DEFERRED theo runbook | Must | MP-3 | Record treo `NEW` → BLOCK |
| `RQ-10` | Unpublish làm list/detail/apply biến mất/chặn; republish khôi phục; close order drill chặn apply | Must | Runbook | Public flag/state mismatch → BLOCK |
| `RQ-11` | Admin assignment/commission smoke có session không trả 500; `/bcc` không được tái xuất hiện như payroll portal | Must | Living Handoff | 500 hoặc bcc regression → BLOCK |
| `RQ-12` | Evidence report mask PII/secret, có request-id/status/timestamps/SHA và before-after state | Must | `DEC-03/05` | Secret/PII leak → revoke artifact + BLOCK |
| `RQ-13` | Runbook operations và drill được cập nhật kết quả thật, Owner ký rõ PASS/FAIL/deferred rows | Must | `EV-02/03`, `DEC-12` | Không chữ ký → không APPROVED |
| `RQ-14` | Tier 3 chạy independent live verification và `verify-audit.ps1` PASS | Must | Pipeline | Không audit → BLOCK |
| `RQ-15` | Commit chỉ gồm report/runbook/HANDOFF/AUDIT/TASK resolution; không gom WIP ngoài scope | Must | `EV-10` | Scope leak → reject commit |

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
- Unpublish/republish Project drill, close Order drill.

**Out of scope:**

- Mọi source file dưới `app/**`, `src/**`, `prisma/**`, `middleware.ts`, `vercel.json`
- Thêm/sửa/xóa environment variable
- SQL DDL/DML trực tiếp
- Git push/deploy mới
- Xóa record production
- Load test, pentest, rate-limit exhaustion
- Quick Apply, Affiliate, CV upload

### 4.3 Data, State, Permission và Interface Rules

- **Data:** record drill có prefix `DRILL-MKT`; applicant là người được Owner cho phép; report mask mọi identifier cá nhân.
- **State:** mutation theo state machine thật. Không reopen order `CLOSED`; nếu cần republish thì dùng project còn order mở hoặc tạo order drill mới.
- **Permission/data scope:** anonymous chỉ public projection/apply/tracking; HR queue dùng role đã cấp; negative role dùng account riêng không có quyền.
- **Interface:** canonical hosts là `https://www.hrpartner.vn`; apex redirect có thể đo riêng nhưng không thay host trong evidence.
- **Failure/idempotency/concurrency:** 5xx, public/private leak, duplicate row, stale deployment hoặc queue invisibility là stop condition. 429 do thao tác lặp vượt ngân sách không được force-pass.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01/02` | Git/Vercel/live | Chụp SHA, dependency status, env-name presence, canonical host/internal-route posture | CLI/read-only | Preflight table | SHA cũ/secret printed → dừng |
| `STEP-02` | `RQ-03` | Admin Project/Staffing | Tạo Project/Order/Slot drill qua nghiệp vụ, ghi IDs mask và state | Auth UI/API | 201/200 + request-id | Dùng SQL/raw owner bypass → dừng |
| `STEP-03` | `RQ-04` | Public browse | Publish và đo list/detail/card/filter/private negative | Browser/HTTP | Status + safe body summary | RLS/card truth fail → dừng |
| `STEP-04` | `RQ-05/06` | Public apply | Apply lần đầu, replay, duplicate-new-key; đếm queue/row qua authorized surface | HTTP | Exact codes + same tracking mask | Row thứ hai → dừng |
| `STEP-05` | `RQ-07` | Tracking | Đo known/unknown/no-store/projection keys | HTTP | Response key allow-list | PII leak → dừng |
| `STEP-06` | `RQ-08/09` | HR queue | Xác nhận queue, negative role, xử lý record drill tới trạng thái cuối | Auth UI/API | State trail + audit/request-id | Queue rỗng/leak → dừng |
| `STEP-07` | `RQ-10` | Publish/order state | Unpublish, negative browse/apply, republish, close dedicated order | Runbook | Before-after responses | Đụng job/order thật → dừng |
| `STEP-08` | `RQ-11` | Admin smoke | Assignment/commission/bcc smoke có session | Browser | HTTP/title/error state | 500 → dừng |
| `STEP-09` | `RQ-12/13` | Docs | Viết proof report, cập nhật runbook kết quả, Owner ký | Docs | Secret/PII scan | Chưa ký → BLOCK |
| `STEP-10` | `RQ-14/15` | Audit/commit | Tier 3 verify độc lập; Tier 1 resolve và commit path-scoped | Pipeline | verify-audit + git diff | Audit không PASS → không approve |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Live deployment SHA chứa ba task dependency ACCEPTED | Vercel/Git metadata | SHA chain | Yes |
| `AC-02` | `RQ-02` | Env-name preflight đủ, debug/internal probe không public, không in values | Read-only checks | Presence/404 summary | Yes |
| `AC-03` | `RQ-03` | Project/Order/Slot drill được tạo và publish qua nghiệp vụ | Auth API/UI | Codes + request-id | Yes |
| `AC-04` | `RQ-04` | Anonymous list/detail/card/filter đúng; private negative không lộ | HTTP/browser | Status + screenshot/safe JSON | Yes |
| `AC-05` | `RQ-05` | First apply trả 201 và safe response keys | HTTP | Masked tracking + request-id | Yes |
| `AC-06` | `RQ-06` | Replay same result; duplicate key mới 409; row count không tăng | HTTP + queue count | Before-after count | Yes |
| `AC-07` | `RQ-07` | Known tracking 200/no-store/safe keys; unknown 404 generic | HTTP | Header + key list | Yes |
| `AC-08` | `RQ-08` | HR queue thấy đúng record; unauthorized role không thấy | Auth smoke | Positive + negative | Yes |
| `AC-09` | `RQ-09` | Record drill kết thúc REJECTED hoặc CONVERTED; dedup ghi đúng trạng thái thật | State history | Final state | Yes |
| `AC-10` | `RQ-10` | Unpublish/republish/close order cho đúng browse/apply behavior | HTTP sequence | Exact codes | Yes |
| `AC-11` | `RQ-11` | Assignment/commission không 500; `/bcc` không trở lại làm payroll surface | Browser/HTTP | Status/title | Yes |
| `AC-12` | `RQ-12` | Report có đủ SHA/timestamp/request-id/state nhưng không có secret/PII | Scan + review | Zero forbidden patterns | Yes |
| `AC-13` | `RQ-13` | Owner ký runbook và kết luận PASS/FAIL rõ | Document review | Signed section | Yes |
| `AC-14` | `RQ-14` | Tier 3 independent audit PASS và verifier exit 0 | Audit command | AUDIT + output | Yes |
| `AC-15` | `RQ-15` | Commit chỉ có artifact cho launch proof/runbook | Git scope check | Name-only diff | Yes |

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

## 8. Open Questions

Không còn câu hỏi chặn contract. Owner chỉ ký sau khi execution evidence hoàn tất; chữ ký là gate vận hành, không phải quyết định thiết kế giao cho Tier 2.

## 9. Planner Resolution

Tier 1 append quyết định sau audit. `GO_LIVE_APPROVED` chỉ được ghi khi Tier 3 PASS và Owner sign-off đều có thật.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-30` | Contract launch proof ban đầu; tách mutation drill khỏi code tasks, khóa privacy/scope/rollback/sign-off | Chuỗi GO-LIVE-04→06→05→07 |
