# TIER 1 LIVING HANDOFF v2.1 — HRP V5

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-08-30 Asia/Bangkok
roadmap_source: docs/UNIFIED_PLAN_v5.md
current_lane: V5 go-live surface hardening — làm sạch bề mặt công khai/admin trước khi công bố link
current_task: hrp-v5-go-live-04-public-read-rls-closure
task_path: docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/TASK.md
spec_version: v1.0
task_status: READY_FOR_EXECUTION
current_gate: TIER_2_CODE
next_command: /code hrp-v5-go-live-04-public-read-rls-closure — contract đã verify-task PASS; không điều tra lại root cause §2; không sửa migration hoặc dùng ADMIN elevation; chạy LIVE integration trên hrp_mp2_test, không dùng hrp-live.
previous_accepted: hrp-v5-go-live-03-admin-surface-truth — Audit Round 2 PASS; source commit 7024910; audit correction c0d51e1
next_planner_candidate: hrp-v5-go-live-06-live-rls-matrix-restore — contract v1.0 đã verify-task PASS; chỉ giao /code sau khi GO-LIVE-04 ACCEPTED. Hàng đợi sau đó đã có đủ contract gate PASS: GO-LIVE-05 public card truth rồi GO-LIVE-07 marketplace launch proof. Chuỗi khóa: 04 → 06 → 05 → 07.
blocking_owner: Không chặn Tier 2 go-live-04. Nhưng bước OP "nộp 1 đơn thật để chứng minh hrp_public_apply_submission end-to-end" ĐANG BỊ CHẶN bởi defect P0 ở cursor_note: publish rồi mà /api/jobs vẫn total 0 nên card không hiện ra để bấm Ứng tuyển (form apply là modal ngay trên trang danh sách / và /jobs, không cần trang chi tiết — nên chỉ cần go-live-04 lên là mở khoá). Câu hỏi A-hay-B của phiên 29/08 ĐÃ ĐÓNG: Tier 1 chọn A trong DEC-01 của task 04 vì đó là quyết định kiến trúc thuộc Tier 1 và A ship được không cần migration; phương án B (DB role vô danh riêng cộng 3 policy FOR SELECT) thành Q-02 của task 04 — follow-up bảo mật cần Owner uỷ quyền migration trên hrp-live, KHÔNG chặn execution. Việc Owner cần quyết: (1) Neon branch hrp_mp2_test — ĐÃ XONG 2026-08-30, KHÔNG còn là đường tới hạn: Owner uỷ quyền và Tier 1 đã chạy neon branches set-expiration hrp_mp2_test --project-id proud-lake-83253847 exit 0, neon branches list in Expires At = never; branch id br-misty-cell-az3nx5l3 không đổi nên DATABASE_URL_TEST/DATABASE_URL_ADMIN_TEST giữ nguyên, không luân chuyển credential; RISK-04 của task 04 đã đóng bằng hành động. Từ đây AC-06/07/08/10 của task 04 không còn cớ ENV_BLOCKED vì expiry — round nào còn in ENV_BLOCKED thì phải đo lại credential/preflight, không force-pass. CẤM cắt branch test mới từ hrp-live: đo 30/08 cho thấy hrp_mp2_test là branch DUY NHẤT mang đủ ma trận RLS, cắt từ hrp-live sẽ thừa hưởng đúng cái drift đang cần bắt — xem memory hrp-neon-branch-topology. Ghi chú: branch pre-grant-2026-08-29 hết hạn 2026-09-05, đó là snapshot trước lần fix grant 29/08 và không phải baseline của task 06; task 06 cần snapshot hrp-live chụp NGAY TRƯỚC khi restore, việc này contract 06 phải quy định. (2) Uỷ quyền chạy migration/SQL phục hồi 15 policy RLS trên hrp-live cho task 06 — ĐÃ CẤP 2026-08-30, nguyên văn Owner "OK ỦY QUYỀN CHO MÀY LÀM", trả lời đúng câu Tier 1 hỏi; uỷ quyền giới hạn trong 18 đối tượng ở DEC-03 của task 06 (15 CREATE POLICY cộng 3 cặp ENABLE và FORCE cho ticket family) và KHÔNG mở rộng sang thao tác DB nào khác. Đã ghi vào §0 Control và §9 của TASK 06. Vì vậy mục này KHÔNG còn chặn gì — thứ tự áp là hrp_mp2_test trước rồi hrp-live sau khi audit 06 PASS (DEC-08), snapshot pre-rls-repair-2026-08-30 chụp ngay trước khi ghi live (DEC-09), và phải in danh sách migration pending trên live trước khi deploy vì nếu pending nhiều hơn một cái thì prisma migrate deploy sẽ cuốn theo chính 6 migration cũ kèm bẫy hạ cấp hàm (RISK-06 — gặp thì DỪNG và ghi BLOCKED). (3) SQL dọn dữ liệu DEMO mà Tier 2 dán ở HANDOFF §5 CHƯA chạy dòng nào và chỉ chạy SAU khi Tier 3 ra verdict (Tier 3 cần DA-DEMO-003 và SO-00001..3 còn sống để đo lại AC-05..AC-08); người chạy là Owner trong Neon Console SQL Editor vì policy RESTRICTIVE no_delete chặn DELETE của mọi app role, và phải chạy hai câu SELECT kiểm tra TRƯỚC rồi đọc kết quả rồi mới chạy khối DELETE — dán cả khối BEGIN...COMMIT một lần thì hai SELECT đó không gate được gì. Owner tuyên bố 2026-08-29 hệ thống còn ở giai đoạn dev, chưa cutover production, nên được seed thoải mái rồi xoá sau — đã ghi thành DEC-09 của task 03, và nhờ đó AC-03..AC-08 của task 03 không còn được phép kết ENV_BLOCKED. Seed đã CHẠY THẬT trên branch hrp-live 16:11 ngày 29/08 (1 client CC-DEMO-001, 2 dự án DA-DEMO-001/002 quota 20/15, 2 order SO-DEMO-001/002 OPEN, 2 slot còn 10 và 5 chỗ) và Owner đã Publish cả hai. Việc OP còn lại: chạy drill docs/runbooks/marketplace-launch-drill.md rồi ký runbook §11; admin smoke có đăng nhập (assignment/commission không 500, đo luôn title /admin theo LIM-01); vệ sinh hạ tầng (refresh DATABASE_URL_ADMIN sau rotate neondb_owner, xoá DB_DIAG_TOKEN + app/api/internal/db-target/route.ts, dọn scratch/*.mjs); và trước ngày cutover thật phải xoá hoặc đổi mật khẩu 3 account mà prisma/seed.mjs tạo bằng mật khẩu cố định — domain đã mở ra internet ngay từ bây giờ.
product_override: /bcc retired; production payroll/payslip belongs to the separate salary app; PAY-01..08 = DEFERRED_FINAL and does not block HRP go-live
cursor_note: P0 29/08 ĐÃ CHẨN ĐOÁN TRỌN VẸN, đừng điều tra lại từ đầu: hai route công khai GET /api/jobs (app/api/jobs/route.ts:25) và GET /api/jobs/[slug] (app/api/jobs/[slug]/route.ts:26) gọi prisma.$transaction TRỰC TIẾP, không qua withDbContext, nên không set GUC app.role; hrp_session_role() trả NULL; MỌI nhánh của hrp_project_visible_for (prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql dòng 6-13) đều mở đầu bằng so sánh role nên predicate ra NULL; cả outsourcing_projects, staffing_orders và staffing_order_slots đều ENABLE+FORCE RLS với USING gốc là hàm đó, vậy khách vô danh thấy 0 dòng — count() = 0 nên list total 0, findFirst = null nên slug 404. KHÔNG phải cache (đo được CACHE=MISS AGE=0) và KHÔNG phải dữ liệu (seed đặt status ACTIVE, order OPEN, deadline+30, slot 10 và 5 còn trống, valid_to+120, Owner đã Publish nên is_public TRUE). Chỉ tồn tại 2 RPC public là hrp_public_apply_submission và hrp_public_tracking_projection, KHÔNG có RPC cho browse. Vì sao gate cũ vẫn xanh: go-live-02 đo /api/jobs total 0 lúc chưa publish gì nên số 0 do RLS trùng khít số 0 đúng — đường đọc công khai chưa từng được chứng minh với một dự án đã publish thật, đừng nhận evidence total 0 làm PASS nữa. Ba ngõ chết của go-live-03 (slot.validTo, take chặn 50, bảng /admin/projects không in project.id) đã đóng trong contract v1.0-v1.1, chi tiết ở TASK, đừng mở lại theo cách khác. Bổ sung 30/08 khi viết contract 04, ba thứ chẩn đoán 29/08 chưa thấy: (1) có call site hỏng THỨ BA là app/job-board/page.tsx dòng 9-10 — server component cũng gọi prisma.$transaction trần, và nó hỏng-thành-empty-state "Hiện chưa có việc làm đang tuyển." nên trông như bình thường; (2) ba file test đang neo hoặc hợp thức hoá đúng defect — marketplace-inventory.static.test.ts dòng 128 assert enforceRateLimits phải đứng trước handler.indexOf('$transaction') nên bỏ $transaction là test VỠ, marketplace-browse.routes.test.ts dòng 74/90 lấy {jobs:[],total:0} làm happy path, api-boundary.static.test.ts dòng 18-20 ghi thành văn rằng $transaction trần ở route public là hợp lệ; (3) mọi test chạm DB phải được đăng ký trong vitest.integration-files.ts, vì vitest.unit.config.ts ép DATABASE_URL về sentinel 127.0.0.1:1 và làm rỗng mọi flag LIVE, còn vitest.integration.config.ts chỉ include đúng danh sách đó và chỉ nhận URL từ *_TEST. Giữ nguyên override /bcc + Payroll 2026-08-28 trong mọi lần cập nhật roadmap sau này. Bẫy cũ còn giá trị: chạy copy-static/build là public/index.html dirty lại (tracked dù .gitignore:56 liệt kê) nên đừng stage kèm task nào; git check-ignore trả rỗng cho file đã track nên không dùng nó để kết luận; link demo BoD là /mockup/index.html; host canonical là www.hrpartner.vn, apex 308 về www nên PowerShell 5.1 phải đọc status từ exception. Giữ nguyên override /bcc + Payroll 2026-08-28 trong mọi lần cập nhật roadmap sau này.
```

<!-- ROADMAP_CURSOR_END -->

### Quy tắc của cursor

- Cursor chỉ trả lời: **đang ở đâu, gate nào, artifact nào, lệnh gì tiếp theo**.
- `current_task` tối đa một task. Không mở nhiều task chỉ vì chúng cùng phase.
- Không ghi HEAD, số commit ahead, danh sách file dirty hoặc test count vào cursor; Agent nhận việc phải kiểm tra Git/artifact mới nhất.
- Chi tiết scope, baseline, dependency, AC và quyết định nằm trong `TASK.md`; không nhân bản vào handoff.
- Nếu cursor mâu thuẫn với TASK/HANDOFF/AUDIT, dừng và đối chiếu source of truth theo §2 trước khi làm.

## 1. Vai trò cố định của Tier 1

Tier 1 biến yêu cầu của sếp thành contract đủ chặt để Tier 2 thực thi và Tier 3 audit. Tier 1 sở hữu quyết định product/architecture, scope, acceptance và audit resolution; **không sửa source code**.

| Tier | Artifact sở hữu | Trách nhiệm | Không được làm |
|---|---|---|---|
| Tier 1 — Planner | `TASK.md` | Contract, decision, status, resolution | Không implement; không viết thay HANDOFF/AUDIT |
| Tier 2 — Engineer | `HANDOFF.md` | Implement, test, evidence thực thi | Không đổi contract; không tự audit/ACCEPTED |
| Tier 3 — Auditor | `AUDIT.md` | Audit độc lập, C-01..C-10, verdict | Không sửa source/TASK/HANDOFF |

Chỉ phá ranh giới khi sếp ủy quyền đích danh trong lượt hiện tại. Sau MP-3B, sếp đã nhắc Tier 1 chỉ viết contract/resolve và để đúng Tier 2/Tier 3 thực hiện phần của họ.

**Owner process decision 2026-08-27:** `hrp-v5-ops-04a-observability-foundation` là task song song cuối cùng của Tier 2-B. Sau khi task này được audit/resolve, chỉ duy trì **một Tier 2** và một execution stream tại một thời điểm để tránh code rẽ nhánh và đơn giản hóa bàn giao. Tier 1 không tự mở thêm parallel Tier 2/worktree; chỉ được làm lại khi Owner ủy quyền rõ trong một lượt sau.

## 2. Source of truth và thứ tự đọc khi nhận bàn giao

1. Khối `ROADMAP_CURSOR` ở §0 để biết điểm vào.
2. `.ai-pipeline/tier1.md`.
3. `.ai-pipeline/rules/00-global-rules.md` và `01-planner-rules.md`.
4. `.ai-pipeline/templates/TASK.template.md`.
5. `docs/UNIFIED_PLAN_v5.md` — roadmap/domain canonical.
6. `docs/V5_3_TIER_EXECUTION_GUIDE.md`.
7. `TASK.md`, rồi `HANDOFF.md`/`AUDIT.md` của task trong cursor nếu tồn tại.
8. Git và source/schema/test liên quan ở chế độ read-only để xác minh baseline.

Repo có `.codegraph/`: dùng CodeGraph trước khi `rg`/đọc file khi cần hiểu code. Nếu kết quả thiếu hoặc mâu thuẫn HEAD, ghi limitation và fallback sang `rg --files`, source inspection và Git; không bịa evidence.

Không dùng roadmap V4/Portal legacy để chọn task V5 mới. Không dùng file handover này thay TASK hoặc master plan.

## 3. State machine và current gate

Giá trị hợp lệ cho `current_gate`:

| Gate | Điều kiện quan sát | Tier 1 làm gì |
|---|---|---|
| `PLANNER_CONTRACT` | Chưa có TASK READY | Khảo sát read-only, viết TASK, verify-task |
| `TIER_2_EXECUTION` | TASK `READY_FOR_EXECUTION` | Báo đúng `/code <slug>`, không implement thay |
| `TIER_3_AUDIT` | HANDOFF kết `READY_FOR_AUDIT` | Báo `/audit <slug>`, không audit thay |
| `TIER_1_RESOLVE` | AUDIT đã bàn giao | Chạy resolve protocol §6 |
| `REVISION_EXECUTION` | TASK `REVISION_REQUIRED` có directive | Giao lại `/code <slug>` đúng round |
| `BLOCKED_OWNER` | Cần secret/DB/ADR/quyền OP từ sếp | Ghi owner + điều kiện mở khóa; không force-pass |
| `PHASE_REVIEW` | Task cuối phase đã ACCEPTED | Review exit gate rồi chọn candidate kế tiếp |

Task status hợp lệ: `DRAFT → READY_FOR_EXECUTION → REVISION_REQUIRED | ACCEPTED | CANCELLED`. `READY_FOR_AUDIT` và verdict PASS/CONDITIONAL/BLOCKED thuộc HANDOFF/AUDIT, không phải Tier 1 tự gán vào TASK.

## 4. Vòng lặp vận hành chuẩn

```text
Cursor
  → đọc artifact tại current gate
  → thực hiện đúng quyền Tier 1
  → verify cơ học tương ứng
  → chuyển đúng tier/gate
  → chỉ khi gate thay đổi: cập nhật ROADMAP_CURSOR
```

### Khi tạo contract

1. Khảo sát master plan + source/schema/test read-only; khóa baseline và phương pháp evidence.
2. Viết duy nhất `docs/tasks/<slug>/TASK.md` theo template.
3. Bắt buộc có `RQ-xx → STEP-xx → AC-xx`, scope/out-of-scope, decision, risk, rollback và stop condition.
4. Open Question làm đổi implementation phải rỗng trước `READY_FOR_EXECUTION`.
5. Chạy `verify-task.ps1`; chỉ sau PASS mới đặt cursor thành `TIER_2_EXECUTION`.

### Khi giao việc

- CODE READY: `/code <task-slug>`.
- HANDOFF `READY_FOR_AUDIT`: `/audit <task-slug>`.
- Design dùng Figma Owner và `/audit-design <task-slug>`; không giao `/code`.
- Mỗi lần báo sếp phải nêu: task path, spec version, status và hành động kế tiếp.

## 5. Contract quality gate

TASK chỉ được `READY_FOR_EXECUTION` khi:

- Outcome/non-goal và scope đủ rõ; không có quyết định nghiệp vụ bị đẩy cho Tier 2/3.
- Baseline, dependency và destructive/OP action đã xác định owner.
- Mọi RQ có STEP và AC đo được; evidence yêu cầu là thật, không mock khi contract yêu cầu LIVE.
- Interface/data/state/permission/idempotency/concurrency được khóa đúng mức rủi ro.
- Stop condition buộc Tier 2 dừng nếu cần schema/dependency/secret/quyền ngoài contract.
- Không vi mô hóa private implementation nếu public contract và invariant đã đủ rõ.

Contract thay đổi thì tăng spec version. Chỉ lỗi implementation thì giữ spec và mở execution round mới. Resolution luôn append-only trong TASK.

## 6. Resolve Protocol — Tier 1 gate nhẹ

1. Chạy `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/<slug>/TASK.md`.
2. FAIL: yêu cầu Tier 3 chuẩn hóa/bổ sung AUDIT; không re-audit sâu.
3. PASS: đọc findings P0→P3, Mandatory Checks và verdict.
4. Evidence nhất quán + PASS/CONDITIONAL: ghi resolution; spot-check tối đa ba điểm rủi ro cao nếu cần.
5. Evidence thiếu/mâu thuẫn hoặc P0/P1 chưa đóng: `REVISION_REQUIRED` và directive đo được.
6. Ghi từng finding bằng `ACCEPT_FIX`, `REJECT`, `DEFER` hoặc `NEED_USER_DECISION`.
7. Chỉ đặt `ACCEPTED` sau audit hợp lệ và resolution đầy đủ. Source đổi sau audit phải audit lại.

Waiver không phải test PASS. Phải ghi người quyết định, evidence thiếu, residual risk và follow-up. Tiền lệ MP-3C: founder waived browser evidence AC-08; không được kể lại rằng browser test đã chạy PASS.

## 7. Roadmap là dependency graph, không phải chuỗi kể chuyện

### Gate gần hiện tại

`M1-06b → audit/resolve → M1-06c → audit/resolve`. Không mở M1-07 trước khi M1-06 đủ inventory/exit gate.

### Các lane canonical

- M1 security: hoàn tất M1-07, M1-08, M1-09. Master plan gom M1-05..09; không mặc định chuỗi cứng `M1-07 → M1-08 → M1-09` nếu TASK chưa chứng minh.
- Owner sequencing override 2026-08-28: sau M1-08, chạy `hrp-v5-go-live-01-single-domain-consolidation` để gom Vendor/Worker/CTV về path trên `hrpartner.vn`; ACCEPT task này rồi mới quay lại M1-09.
- M1-09 được tách truthful: `hrp-v5-m1-09a-current-field-projection` đóng các surface hiện có; M1-09B chỉ mở sau M8-06 vì repo chưa có `Payment/PaymentAllocation`. Không mock-pass hoặc tự thêm schema trong M1-09A.
- M35 backbone: `M35-01 → M35-02..05 → M35-06 → M35-07..09`.
- M35-09 giao với GPS/offline/check-in của M7 và PORTAL-06; phải tách dependency trước khi mở.
- OPS-02/04/06 là hardening lane có thể xen kẽ khi dependency thật cho phép; không tự gán quan hệ cứng với M1.
- M7: `M7-01..03 → M7-04..06 → M7-07 → M7-08`.
- M8: `M8-01..04 → M8-05..06 → M8-07..08`.
- Owner override 2026-08-28: `/bcc` đã retire; production payroll/payslip thuộc ứng dụng lương riêng. `PAY-01..08` là lane `DEFERRED_FINAL`, chỉ tái đánh giá sau Marketplace/Affiliate/M7/M8/M6/M9 và core UAT/cutover khi Founder mở lại. Payroll không block HRP go-live.
- M6-01..03 có thể chuẩn bị sau permission baseline; M6-04..07 chờ input canonical từ M7/M8 theo từng task. Không ép thành chuỗi cứng `M7 → M8 → M6 → PAY`.
- M9 là P2, chỉ mở sau khi core ổn định.

Trước mỗi TASK mới, Tier 1 phải lập trong TASK bảng `Dependency | Source | Satisfied evidence | Blocker`. Dependency suy luận phải ghi `ASSUMPTION`, lý do và stop condition. Không bỏ task UI/exit gate cuối chuỗi, đặc biệt M7-08 và M8-07..08.

## 8. Standing architecture và security facts

- HRP là outsourcing marketplace/platform; CTV là referrer/collaborator, không đồng nghĩa Worker.
- Auth hiện hữu là identity-core/JWT riêng dùng `jose`, cookie `hrp_token` và `AuthContext`; **không phải NextAuth** và không được viết lại login/JWT/cookie/register (DEC-11).
- Có 13 `SystemRole`; projection và scope phải test đủ role liên quan, role ngoài scope deny-by-default.
- Target boundary: verified AuthContext → L1 role/action/scoped repository → L2 RLS transaction-local cùng DB transaction. Không tuyên bố mọi route đã đạt trước khi M1-06/07 đóng.
- `withAuthorizedDb`/scoped repository là boundary implementation hiện hành từ M1-06a; không tạo wrapper cạnh tranh chỉ vì master plan dùng tên khái niệm `withAuthScope`.
- Phân biệt **đã triển khai** với **roadmap target**. QStash/R2, EmploymentEpisode và PAY canonical không được mô tả là production-complete nếu TASK tương ứng chưa ACCEPTED.
- Không tạo lại `/bcc`, không dùng `/bcc` làm login fallback và không đưa màn tính/xem lương trở lại HRP nếu chưa có quyết định mới của Founder. HRP chỉ giữ contract tích hợp/dữ liệu nguồn cần thiết cho ứng dụng lương riêng.
- Không log/commit secret, token, password, connection string hoặc PII thật.

DB LIVE test chỉ dùng target an toàn và fail closed. Env từng dùng nằm ngoài repo tại `C:\CodeApp\Salary-app\.env.mp2-test.local`, với `DATABASE_URL_TEST` và `DATABASE_URL_ADMIN_TEST`; không in giá trị. Thiếu target/role hợp lệ là `ENV_BLOCKED`, không mock/force-pass.

## 9. Git, worktree và vùng bảo vệ

- Mỗi Agent nhận việc phải tự chạy read-only `git status --short --branch`, `git log` và kiểm tra diff scope. Không tin snapshot Git trong hội thoại cũ.
- Thay đổi không thuộc task là của người dùng/luồng khác: không reset, restore, overwrite, xóa, stage hoặc commit.
- Cấm `git add -A` và `git add .`; chỉ stage path trong scope.
- Không commit/push/merge nếu sếp hoặc TASK không yêu cầu rõ. Không mặc định push sau resolve.
- Không chạy migration/seed/destructive action trên production. OP action có owner là sếp cần ủy quyền rõ.

## 10. Cách cập nhật Living Handoff khi chuyển Agent

Trong tiến độ bình thường, chỉ sửa khối `ROADMAP_CURSOR` ở §0, từ marker mở có hậu tố `START` đến marker đóng có hậu tố `END`. Toàn file phải luôn chỉ có đúng một cặp marker thật.

Quy trình cập nhật:

1. Đọc TASK/HANDOFF/AUDIT và xác nhận gate thực tế.
2. Cập nhật `updated_at`, lane/task/path/spec/status/gate/command, previous accepted, next candidate, blocker và một cursor note ngắn.
3. Không đưa test count, commit list, chi tiết scope hoặc lịch sử phase vào cursor.
4. Chạy `git diff --check -- docs/PLANNER_HANDOVER.md`.
5. Chỉ sửa section ổn định khi pipeline rule, standing ADR hoặc dependency canonical thực sự thay đổi; khi đó tăng Living Handoff version và ghi revision log.

### Mẫu cursor cho lần sau

```yaml
updated_at: YYYY-MM-DD Asia/Bangkok
roadmap_source: docs/UNIFIED_PLAN_v5.md
current_lane: <phase/lane>
current_task: <slug hoặc none>
task_path: <path hoặc none>
spec_version: <vX.Y hoặc n/a>
task_status: <status hoặc n/a>
current_gate: <giá trị §3>
next_command: <lệnh hoặc hành động Planner>
previous_accepted: <slug gần nhất>
next_planner_candidate: <ID/slug dự kiến, chưa coi là task đã mở>
blocking_owner: <none hoặc owner + điều kiện>
cursor_note: <một câu về exit gate/dependency quan trọng nhất>
```

## 11. Checklist tiếp quản trong 5 phút

- [ ] Đọc cursor và TASK được trỏ tới.
- [ ] Xác minh artifact có status khớp cursor.
- [ ] Kiểm tra Git/worktree mới nhất; bảo vệ thay đổi ngoài scope.
- [ ] Xác định đúng current gate và chỉ làm quyền Tier 1.
- [ ] Nếu giao tier khác, dùng đúng lệnh và không làm thay.
- [ ] Nếu chọn task mới, kiểm tra dependency graph và phase exit gate trước khi viết contract.
- [ ] Sau khi gate đổi, chỉ cập nhật cursor.

## 12. Revision log của Living Handoff

| Version | Ngày | Thay đổi cấu trúc ổn định |
|---|---|---|
| 2.0 | 25/08/2026 | Chuyển từ snapshot handover sang Living Handoff: một ROADMAP_CURSOR mutable; chuẩn hóa role, state/gate, resolve, dependency graph, standing security, Git safety và protocol tiếp quản. |
| 2.1 | 27/08/2026 | Ghi quyết định của Owner: OPS-04a là task Tier 2-B cuối cùng; sau resolve quay về một Tier 2/một execution stream, không tự mở parallel worktree. |
