# BÀN GIAO TIER 1 — PLANNER HRP V5

> Snapshot canonical: **25/08/2026 (Asia/Bangkok)**. Agent tiếp nhận phải dùng mục 0 làm trạng thái hiện tại; không suy ra việc đang mở từ tài liệu/roadmap V4 cũ.

## 0. Trạng thái hiện tại và lệnh tiếp tục

| Hạng mục | Giá trị |
|---|---|
| Branch | `main` |
| HEAD | `ec7a0e4` — `docs(m1): define worker vendor cron auth scope` |
| Remote | `main...origin/main [ahead 18]`; **chưa push** |
| Task duy nhất đang mở | `hrp-v5-m1-06b-worker-vendor-cron-auth-scope` |
| TASK | `docs/tasks/hrp-v5-m1-06b-worker-vendor-cron-auth-scope/TASK.md` |
| Spec / status | `v1.0` / `READY_FOR_EXECUTION` |
| Code baseline | `4bb4464` — M1-06a đã ACCEPTED; commit `ec7a0e4` chỉ thêm contract M1-06b |
| Việc kế tiếp | Giao Tier 2: `/code hrp-v5-m1-06b-worker-vendor-cron-auth-scope` |

Không viết lại contract hoặc mở task song song. Tier 2 phải thực thi TASK v1.0, tạo `HANDOFF.md` và dừng ở `READY_FOR_AUDIT`. Sau đó giao Tier 3 bằng `/audit hrp-v5-m1-06b-worker-vendor-cron-auth-scope`; Tier 1 chỉ `/resolve` khi `AUDIT.md` đã hợp lệ.

## 1. Phạm vi contract M1-06b đã khóa

- Đúng **16 route** dưới năm root `worker/**`, `workers/**`, `vendor/**`, `vendors/**`, `cron/**`: 6 Worker, 8 Vendor, 2 cron.
- Worker self-scope lấy từ `ctx.workerId`; Vendor self-scope lấy từ `ctx.vendorId`. Client không được override owner ID.
- User route dùng canonical auth boundary của M1-06a (`withAuthorizedDb`/scoped repository), có L1 + L2 cùng transaction; không tạo wrapper cạnh tranh và không raw Prisma fallback.
- Vendor dedup chỉ trả kết quả opaque, không lộ Worker ID/tên/CCCD/phone hoặc PII nội bộ. Cross-vendor object trả 404 và không có side effect.
- Cron fail closed: thiếu `CRON_SECRET` → 503, secret/header sai → 401, cả hai phải có **zero DB calls**. DB work dùng system boundary riêng với stable actor `SYSTEM_CRON`; không giả user.
- Không schema, migration, dependency, session/JWT/OTP, deploy hoặc push. Nếu cần một trong các thay đổi này, Tier 2 phải dừng và trả Planner.
- Required LIVE evidence phải chạy trên DB test an toàn. Thiếu môi trường là `ENV_BLOCKED`, không được đổi thành PASS hoặc mock.

DB test đã dùng thành công ở các round trước:

- Env ngoài repo: `C:\CodeApp\Salary-app\.env.mp2-test.local`.
- Biến cần dùng: `DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST`.
- Writer role: `app_user_writer`; admin role: `neondb_owner`; phải cùng test target và khác repo dev/prod target.
- Không in connection string, password/token hoặc nội dung `.env` vào terminal evidence, HANDOFF, AUDIT hay repo.

## 2. Các mốc V5 đã đóng

| Chặng | Trạng thái | Commit implementation/resolution chính |
|---|---|---|
| Wave 0 RF-01..04 | `ACCEPTED` | `516956a`, `405f913`, `a79e041`, `d8ba10d` |
| G0 quality/fixtures/migrations/seed/Prisma | `ACCEPTED` | `e6daa27`, `715a58b`, `1982300`, `19100db`, `1b9ed1d` |
| MP-1 Publish + Public Read | `ACCEPTED` | `7831d56` |
| MP-2 Apply + Tracking + HR Queue | `ACCEPTED` | `76096b7` |
| MP-3A Screening | `ACCEPTED` | `58058b2` |
| MP-3B Convert Worker | `ACCEPTED` | `42edc43` |
| MP-3C Assignment Placement | `ACCEPTED` | `299614a` |
| M1-06a Admin/CTV auth scope | `ACCEPTED` | `4bb4464` |
| M1-06b Worker/Vendor/Cron auth scope | `READY_FOR_EXECUTION` | Contract `ec7a0e4` |

MP-3C lưu ý: audit LIVE đã PASS nhưng browser evidence AC-08 **không được chạy**. Founder đã chọn waiver và Tier 1 ghi rõ trong TASK trước khi ACCEPTED. Không được báo lại rằng browser test đã PASS.

## 3. Dependency graph sau M1-06b — không biến thành một chuỗi cứng

> **Quy tắc Planner:** `UNIFIED_PLAN_v5.md` mô tả nhiều lane có thể giao nhau hoặc chạy song song. Chỉ gọi `A → B` khi master plan/TASK có dependency hoặc exit gate rõ ràng. Dependency do Planner suy luận phải ghi `ASSUMPTION`, kèm lý do và stop condition; không trình bày như nguồn canonical.

### 3.1. Gate hiện tại — bắt buộc đi hết trước

```text
M1-06b Tier 2
  → M1-06b Tier 3 audit
  → Tier 1 resolve/ACCEPTED
  → M1-06c: phần route còn lại của RF-10/M1-06
  → audit/resolve M1-06c
```

Không mở M1-07 khi M1-06 chưa đủ inventory/exit gate, và không để Tier 2 tự mở rộng M1-06b sang route của M1-06c.

### 3.2. Security và backbone sau khi M1-06 hoàn tất

- Security lane phải hoàn tất `M1-07` (RLS/FORCE RLS), `M1-08` (vendor IDOR) và `M1-09` (field projection).
- Master plan gom `M1-05..09` trong cùng phase; **không quy định chuỗi cứng** `M1-07 → M1-08 → M1-09`. Planner được chạy M1-08/M1-09 song song hoặc tuần tự sau khi boundary đủ ổn định, nhưng TASK phải nêu dependency thật.
- Backbone lane canonical là `M35-01 → M35-02..05 → M35-06 → M35-07..09`. M35-06 đã được MP-3C đóng; M35-07 và M35-08 có thể được lập contract theo baseline hiện hành.
- M35-09 có giao diện với GPS/offline/check-in của M7 và `PORTAL-06`. Trước khi mở M35-09, Planner phải tách rõ phần backbone/PWA và đối chiếu M7-04/05; không xếp M35-09 hoàn tất trước dependency mà chính contract của nó yêu cầu.
- `OPS-02`, `OPS-04`, `OPS-06` là hardening lane. Chúng có thể xen kẽ với M1/M35 khi contract chứng minh dependency; master plan **không mặc định** `OPS-02 ← M1-08` hoặc `OPS-06 ← M1-09` thành quan hệ cứng.

### 3.3. Chuỗi domain có thứ tự canonical

```text
M7-01..03 → M7-04..06 → M7-07 → M7-08
M8-01..04 → M8-05..06 → M8-07..08
PAY-01..06 chỉ sau M7/M8
PAY-07..08 chỉ sau owner kế toán + golden cases + sign-off
```

Không được bỏ sót `M8-07..08`: master plan yêu cầu hoàn tất `M8-01..08` trước payroll. Với M7, `OPS-01` là owner của QStash contract cho M7-02; không gán toàn bộ M7-01..03 phụ thuộc OPS-01 nếu TASK chưa chứng minh.

### 3.4. M6 Commission và PAY không phải một đường thẳng duy nhất

- `M6-01..03` (policy/group/permission) có thể chuẩn bị khi permission baseline M1 đã ổn định.
- `M6-04..07` phải chờ đúng input canonical mà từng task dùng: hours/assignment từ M7, client billing/revenue từ M8, rồi ledger/reversal/dashboard theo thứ tự nội bộ.
- `PAY-01..06` chạy sau M7/M8 theo §7.7; master plan không bắt toàn bộ M6 phải đóng trước khi mở payroll shell.
- Vì vậy không ghi roadmap thành chuỗi cứng `M7 → M8 → M6 → PAY`. Cách đúng là: M7 trước M8; M8 trước PAY; M6 và PAY phân nhánh/chạy theo dependency dữ liệu thực tế.
- M9 là P2, chỉ mở sau khi core ổn định. Statutory `PAY-07..08` không được force-open hoặc force-pass khi chưa có owner kế toán.

### 3.5. Gate trước khi Tier 1 tạo mỗi TASK mới

1. Đọc lại `UNIFIED_PLAN_v5.md` §4.x, §4.13 và task sequence §7.x liên quan.
2. Đối chiếu HEAD, TASK đã ACCEPTED và phần implementation thật; không chỉ dựa vào tên phase.
3. Lập bảng `Dependency | Source | Satisfied evidence | Blocker`. Dependency suy luận phải ghi `ASSUMPTION`.
4. Không mở nhiều task cùng lúc chỉ vì chúng cùng nằm trong một phase.
5. Không bỏ task UI/exit gate ở cuối chuỗi, đặc biệt `M7-08` và `M8-07..08`.

## 4. Ranh giới vai trò bắt buộc

| Tier | Sở hữu | Không được làm |
|---|---|---|
| Tier 1 — Planner | Quyết định scope/architecture, viết và resolve `TASK.md`, cập nhật bàn giao | Không implement source/test; không viết thay HANDOFF/AUDIT |
| Tier 2 — Engineer | Source, tests, migration nếu contract cho phép, `HANDOFF.md` | Không tự đổi contract hoặc tự audit |
| Tier 3 — Auditor | Audit độc lập, evidence thật, `AUDIT.md` | Không sửa source hoặc TASK |

Founder đã nhắc rõ sau MP-3B: Agent Tier 1 **chỉ viết hợp đồng/resolve**, công việc Tier 2 và Tier 3 để đúng agent thực hiện. Chỉ phá ranh giới khi Founder ủy quyền đích danh trong lượt hiện tại.

Resolve Protocol: chạy `verify-audit.ps1`, đọc verdict/findings/gaps, spot-check tối đa ba điểm rủi ro cao; không re-audit toàn bộ nếu evidence nhất quán. Mọi waiver phải ghi rõ người quyết định, evidence thiếu và residual risk; không biến waiver thành test PASS.

## 5. Nguồn sự thật và cách đọc

1. `.ai-pipeline/tier1.md`.
2. `.ai-pipeline/rules/00-global-rules.md` và `01-planner-rules.md`.
3. `.ai-pipeline/templates/TASK.template.md`.
4. `docs/UNIFIED_PLAN_v5.md` — roadmap canonical.
5. `docs/V5_3_TIER_EXECUTION_GUIDE.md`.
6. TASK đang mở và file bàn giao này.

Repository có `.codegraph/`, nên dùng CodeGraph trước khi `rg`/đọc file. Tuy nhiên khi lập M1-06b, CodeGraph trả inventory thiếu/lẫn route; TASK đã ghi phương pháp fallback bằng `rg --files`, source inspection và Git. Không tin index nếu mâu thuẫn với HEAD.

## 6. Git và worktree: tuyệt đối không dọn hộ

Worktree đang có nhiều thay đổi **không thuộc V5 task hiện tại**:

- Nhiều tracked deletion dưới `appBCC/**`.
- Untracked: `audit_report.md`, `docs/V5_READINESS_ASSESSMENT.md`, một số `AUDIT.md`/`HANDOFF.md` task cũ, `run-test.js`, `scratch/`.

Đây là thay đổi của người dùng/luồng khác. Không reset, restore, xóa, stage hoặc commit. Cấm `git add -A` và `git add .`; chỉ stage file có trong scope contract. Không push nếu Founder chưa yêu cầu rõ.

## 7. Checklist Agent tiếp nhận

- [ ] Xác nhận HEAD `ec7a0e4` và không dọn worktree ngoài scope.
- [ ] Đọc đầy đủ TASK M1-06b v1.0; không dùng snapshot MP-2 cũ.
- [ ] Giao đúng lệnh `/code hrp-v5-m1-06b-worker-vendor-cron-auth-scope`.
- [ ] Khi Tier 2 xong, kiểm tra HANDOFF status rồi giao Tier 3; Tier 1 không chạy thay.
- [ ] Khi Tier 3 bàn giao, dùng `/resolve` và giữ traceability `RQ → STEP → AC`.
- [ ] Sau status change, cập nhật TASK + tài liệu trạng thái cần thiết và commit scoped; chỉ push khi Founder yêu cầu.

## 8. Revision log

| Ngày | Thay đổi |
|---|---|
| 25/08/2026 | Sửa roadmap sau M1-06b thành dependency graph: bổ sung M1-06c gate, lane M1/M35/OPS, đủ M7/M8, quan hệ M6/PAY và quy tắc không tự gán dependency cứng. |
| 25/08/2026 | Thay snapshot MP-2 lỗi thời bằng trạng thái sau MP-3C và M1-06a; đặt M1-06b làm task duy nhất đang mở; bổ sung DB test, waiver MP-3C, queue tiếp theo, tier boundary và cảnh báo worktree/no-push. |
