# HRP V5 — Hướng dẫn chia phase và thực thi theo mô hình T1/T2/T3

> **Version:** 1.0
> **Nguồn pipeline:** `.ai-pipeline/tier1.md`, `.ai-pipeline/tier2.md`, `.ai-pipeline/tier3.md`
> **Plan canonical:** `docs/UNIFIED_PLAN_v5.md`
> **Mục tiêu kinh doanh đầu tiên:** vận hành được Marketplace HRP: `Tạo việc → Công khai → Ứng tuyển → Sàng lọc → Tạo Worker → Xếp Assignment → Phản hồi trạng thái`.

## 1. Nguyên tắc điều hành

### 1.1. Một nguồn sự thật cho mỗi loại quyết định

- `UNIFIED_PLAN_v5.md`: roadmap, phase, dependency và product priority.
- `TASK.md`: contract duy nhất của một task; do Tier 1 sở hữu.
- `HANDOFF.md`: bằng chứng thực thi; do Tier 2 hoặc Figma Owner sở hữu.
- `AUDIT.md`: kết quả hậu kiểm độc lập; do Tier 3 sở hữu.
- `evidence/`: chỉ chứa log/screenshot/file lớn được hai tài liệu trên dẫn chiếu.

Không tạo báo cáo tiến độ riêng thay thế cho `HANDOFF.md` hoặc `AUDIT.md`. Không chép lại plan vào task; task chỉ dẫn chiếu phần liên quan và khóa contract cần thực thi.

### 1.2. Không dùng “build pass” để kết luận hoàn tất

Một task chỉ được coi là hoàn tất khi có đủ:

1. Contract trong `TASK.md` ở trạng thái `READY_FOR_EXECUTION`.
2. Tất cả `STEP-xx` bắt buộc đã thực thi hoặc được Planner loại khỏi scope.
3. Tất cả `AC-xx` có command/evidence tương ứng.
4. Tier 2 bàn giao `HANDOFF.md` với `READY_FOR_AUDIT`.
5. Tier 3 chạy Deep Audit Checklist C-01..C-10 và ghi `AUDIT.md`.
6. `verify-audit.ps1` trả `RESULT: PASS`.
7. Tier 1 ghi Planner Resolution và chuyển `TASK.md` thành `ACCEPTED`.

`BUILD PASS`, `TEST PASS` hoặc “đã code xong” chỉ là một phần evidence, không phải trạng thái hoàn tất.

## 2. Trạng thái task và quyền chuyển trạng thái

| Trạng thái | Ai được ghi | Ý nghĩa | Điều kiện tối thiểu |
|---|---|---|---|
| `DRAFT` | Tier 1 | Contract đang soạn | Có thể còn open question |
| `READY_FOR_EXECUTION` | Tier 1 | Có thể giao Coding/Figma | Scope, dependency, RQ/STEP/AC và quyết định đã đủ |
| `BLOCKED` | Tier 2/Tier 3 | Không thể tiếp tục an toàn | Có blocker + evidence + decision cần Planner |
| `READY_FOR_AUDIT` | Tier 2/Figma Owner | Đã thực thi, chờ hậu kiểm | Không còn blocker, mọi AC có evidence |
| `REVISION_REQUIRED` | Tier 1 | Phải sửa theo audit | Có finding chưa được resolve |
| `CONDITIONAL` | Tier 3 | Không có P0/P1 nhưng còn risk P2/P3 | Tier 1 phải ghi chấp nhận/defer |
| `ACCEPTED` | Tier 1 sau audit | Đã đóng task | Audit PASS, resolution đầy đủ |
| `CANCELLED` | Tier 1 | Task bị hủy | Ghi lý do và tác động |

**Cấm:** Tier 2 không được ghi `ACCEPTED`; Tier 3 không được tự sửa code/TASK/HANDOFF; Tier 1 không được ghi `ACCEPTED` khi audit chưa PASS.

## 3. Cách chia phase V5

### 3.1. Đường găng Marketplace

| Phase | Task family | Kết quả business | Không chờ |
|---|---|---|---|
| G0 | `V5-G0-*` | DB/CI/fixture có thể lặp | Payroll, attendance, vendor portal |
| M1-min | `V5-M1-01..05` | Auth + role/scope tối thiểu | RLS toàn bộ, OTP nâng cao |
| M35-min | `V5-M35-01..06` | Project/order/slot/worker/submission/assignment | Attendance/payroll |
| MP-1 | `V5-PORTAL-01` | Publish và public job detail | Apply |
| MP-2 | `V5-PORTAL-02` | Applicant apply/tracking + HR queue | Convert |
| MP-3 | `V5-PORTAL-03` + `V5-M35-06` | Screening → Worker → Assignment | Payroll/billing |
| Hardening-1 | `V5-M1-06..09`, `V5-OPS-02/04/06` | Public launch an toàn | M7/M8 |

**Marketplace launch gate:** MP-1/MP-2/MP-3 chưa được gọi là xong nếu chưa test public projection, duplicate apply, IDOR, referral/dedup và conversion race.

### 3.2. Các phase sau Marketplace

1. M7 attendance/import/timesheet lock.
2. M8 rate/statement/reconciliation/payment.
3. M6 commission settlement.
4. PAY shell/payslip.
5. M4 Vendor Portal và M2 Worker/PM PWA nâng cao.
6. PAY statutory/compliance.
7. M9 HRM nội bộ.

Payroll không được kéo lên trước Marketplace chỉ vì đã có calculator/unit test. Tax/BHXH thật chỉ mở khi có phase owner và sign-off riêng.

## 4. Luồng giao việc theo tier

### 4.1. Tier 1 — Planner

Tier 1 không sửa source. Nhiệm vụ là biến một mục tiêu nhỏ thành contract thực thi.

Checklist trước khi chuyển `READY_FOR_EXECUTION`:

- Đọc plan/domain/security và baseline source liên quan.
- Chọn một work type: `CODE`, `DESIGN`, `DOCS`, `DATA` hoặc `INFRA`.
- Xác định `baseline` và vùng file được phép thay đổi.
- Viết outcome người dùng nhìn thấy và non-goals.
- Viết requirements `RQ-xx`.
- Viết execution steps `STEP-xx` có dependency, verify command và stop condition.
- Viết acceptance `AC-xx` đo được.
- Tạo traceability `RQ → STEP → AC`.
- Chốt permission, data scope, state transition, idempotency và rollback.
- Open Questions phải rỗng nếu câu hỏi có thể làm đổi implementation.

**Lệnh giao cho Tier 2:**

```text
/code <task-slug>
```

**Lệnh audit sau khi Tier 2 bàn giao:**

```text
/audit <task-slug>
```

Với Figma:

```text
/audit-design <task-slug>
```

### 4.2. Tier 2 — Coding/Executor

Tier 2 chỉ đọc `TASK.md`, source được dẫn chiếu và rules liên quan.

**Preflight bắt buộc:**

1. TASK là `READY_FOR_EXECUTION` hoặc `REVISION_REQUIRED` có Planner Resolution.
2. Spec version và baseline xác định được.
3. Không còn open question ảnh hưởng implementation.
4. Worktree đã được kiểm tra; thay đổi ngoài task được bảo toàn.
5. Schema/API/permission/acceptance đọc được và không mâu thuẫn.

Nếu preflight fail, Tier 2 ghi `HANDOFF.md` với `BLOCKED` và dừng. Không sửa mò để “làm cho chạy”.

**Trong quá trình code:**

- Bám `STEP-xx`, không mở rộng scope.
- Mỗi thay đổi schema phải có migration/test.
- Mỗi POST/PATCH/command phải có idempotency hoặc ghi lý do `N/A` trong HANDOFF.
- Mỗi route phải có auth/scope/projection/error test.
- Chạy verify sau từng nhóm thay đổi, không dồn toàn bộ đến cuối.
- Tối đa ba vòng tự sửa cho cùng một lỗi; lỗi kiến trúc/nghiệp vụ/security thì dừng và báo BLOCKED.

**HANDOFF bắt buộc có:**

- Task/spec/execution round/baseline.
- Bảng `STEP/RQ → file/artifact`.
- Command, exit code và summary output cho từng AC.
- Migration/schema/env/dependency thay đổi.
- Deviation, limitation, blocker và rollback.
- Dòng cuối chính xác: `Handoff status: READY_FOR_AUDIT` hoặc `Handoff status: BLOCKED`.

### 4.3. Tier 3 — Independent Auditor

Tier 3 không sửa code và không tự yêu cầu trực tiếp Coding. Tier 3 chỉ ghi `AUDIT.md`.

**Readiness gate:** nếu HANDOFF không phải `READY_FOR_AUDIT`, spec/baseline/diff không xác định hoặc artifact không đọc được thì verdict là `BLOCKED`.

**C-01..C-10 bắt buộc:**

| Check | Nội dung |
|---|---|
| C-01 | Tự chạy toàn bộ `npx vitest run`, đối chiếu HANDOFF |
| C-02 | Tự chạy `npm run build` |
| C-03 | Đọc từng route mới/sửa, kiểm tra identity/guard/fail-closed |
| C-04 | Đối chiếu query với schema + `npx prisma validate` |
| C-05 | POST/PATCH có idempotency/outbox theo contract |
| C-06 | Verify migration/RLS và đọc policy SQL |
| C-07 | Kiểm tra git scope/status, không stage nhầm |
| C-08 | File source/route mới có test; test count không giảm |
| C-09 | Chạy `verify-task.ps1` |
| C-10 | Kiểm tra diff name-only không vượt scope |

Mỗi check phải ghi `DONE`, `SKIP(lý do)` hoặc `FAIL`, kèm command, exit code và evidence. Không ghi PASS dựa trên output do Tier 2 cung cấp mà chưa tự chạy lại.

## 5. Ràng buộc chống “chưa xong đã báo cáo xong”

### 5.1. Evidence gate bắt buộc

Một AC không được đánh dấu pass nếu thiếu một trong các cột:

| AC | Expected | Command/visual check | Exit/status | Evidence path | Reviewer |
|---|---|---|---|---|---|

Evidence phải có đường dẫn file hoặc output thật. Câu “đã kiểm tra thủ công” không đủ nếu không mô tả input, thao tác và kết quả.

### 5.2. Không cho phép pass một phần bị gọi là pass toàn task

- Nếu một `STEP` bắt buộc fail: HANDOFF là `BLOCKED`, không phải `READY_FOR_AUDIT`.
- Nếu một `AC` chưa test: ghi `OPEN`, không ghi `PASS`.
- Nếu có limitation ngoài scope: ghi rõ `DEFERRED`, owner, deadline/trigger và hậu quả.
- Nếu có P0/P1 trong audit: verdict `FAIL` và task `REVISION_REQUIRED`.
- Nếu có P2/P3: chỉ được `CONDITIONAL` khi Tier 1 ghi resolution.
- `ACCEPTED` chỉ xuất hiện sau audit PASS và Planner Resolution.

### 5.3. Lock file và vùng trách nhiệm

| File | T1 | T2 | T3 |
|---|---|---|---|
| `TASK.md` | tạo/sửa | đọc | đọc |
| `HANDOFF.md` | đọc | tạo/sửa | đọc |
| `AUDIT.md` | đọc | đọc | tạo/sửa |
| source/schema/test | đọc | sửa trong scope | đọc/chạy |
| `evidence/` | định nghĩa cần gì | tạo evidence thực thi | tạo evidence audit nếu cần |

Nếu Tier 2 sửa `TASK.md`, Tier 3 sửa source hoặc Tier 1 sửa `AUDIT.md`, đó là scope violation phải ghi finding.

### 5.4. Cơ chế revision

1. Tier 3 ghi `AUD-xxx`, severity, AC/RQ liên quan, evidence và impact.
2. Tier 1 đọc findings và ghi `ACCEPT_FIX`, `REJECT`, `DEFER` hoặc `NEED_USER_DECISION` vào `TASK.md > Planner Resolution`.
3. Nếu contract đổi: tăng spec version và cập nhật traceability.
4. Nếu chỉ lỗi thực thi: giữ spec version, tăng execution round.
5. Tier 2 chỉ sửa phần đã được resolution cho phép.
6. Tier 3 re-audit finding cũ và chạy lại mandatory checks liên quan.

Không tạo file quyết định riêng cho audit resolution.

## 6. Template task theo Marketplace

### 6.1. Ví dụ `MP-1` phân rã

| Task | Scope | Không bao gồm | Exit |
|---|---|---|---|
| `hrp-mp1-project-schema` | Project public fields, StaffingOrder/Slot, slug/expiry migration | Apply/UI | Migration + schema/query tests |
| `hrp-mp1-admin-publish-api` | Admin CRUD, publish/unpublish, permission/audit | Public page | API contract/security tests |
| `hrp-mp1-public-jobs-ui` | Job list/detail, filter, loading/error/empty | Apply form | Browser/screenshot/public projection |
| `hrp-mp1-e2e-audit` | Audit whole MP-1 | Code fix | Tier 3 PASS |

### 6.2. Ví dụ acceptance có evidence

```md
- RQ-01: chỉ Project ACTIVE + isPublic=true xuất hiện public.
- STEP-02: thêm query public projection và index.
- AC-01: với 1 project draft và 1 project public, GET /api/public/jobs chỉ trả project public.
- Verify: npx vitest run tests/public-jobs.test.ts
- Evidence: HANDOFF.md §AC-01, output exit 0, response fixture.
```

## 7. Quy trình đóng phase

### 7.1. Phase review trước khi mở phase mới

Planner chỉ mở phase tiếp theo khi:

- Tất cả task P0/P1 của phase trước `ACCEPTED`.
- Không có audit finding unresolved ảnh hưởng dependency.
- Migration/seed/fixture của phase trước reproducible.
- Backend/Frontend delta trong V5 đã có evidence.
- Demo flow của phase chạy được từ đầu đến cuối trên environment được chỉ định.

### 7.2. Phase report tối thiểu

Không tạo báo cáo dài riêng nếu không cần. Planner cập nhật một bảng trong plan hoặc phase handoff:

| Phase | Task accepted | Backend evidence | Frontend evidence | Audit verdict | Residual risk | Next gate |
|---|---|---|---|---|---|---|

Nếu một cột trống, phase status là `PARTIAL`, không phải `DONE`.

### 7.3. Marketplace demo bắt buộc

Mỗi lần review Marketplace phải demo cùng một flow cố định:

1. HR tạo một StaffingOrder/Slot.
2. Publish job.
3. Mở public job detail ở browser không đăng nhập.
4. Submit application với idempotency key.
5. Submit lại cùng key và chứng minh không duplicate.
6. HR mở screening queue.
7. Trigger duplicate/referral guard case.
8. Qualify và convert Worker.
9. Preview/activate assignment.
10. Applicant mở tracking status.
11. Thử IDOR/private projection và chứng minh bị chặn.

Demo không được dùng mock data không ghi rõ; fixture phải có seed version và dữ liệu được ẩn danh.

## 8. Anti-patterns bị cấm

- Ghi `ACCEPTED` trong HANDOFF.
- Ghi `PASS` mà không có command/exit code/evidence.
- Đánh dấu toàn task done vì một route/build pass trong khi UI/state/error chưa làm.
- Dùng `skip`, `todo` hoặc test giả để che regression mà không ghi limitation.
- Tự thêm dependency/migration/env khi TASK chưa cho phép.
- Sửa ngoài scope rồi chỉ ghi “tiện tay refactor”.
- Tier 1 tự chạy lại toàn bộ test để thay audit Tier 3.
- Tier 3 tự sửa code để biến FAIL thành PASS.
- Chia một task lớn thành nhiều file báo cáo nhưng không có một TASK.md canonical.
- Dùng “đã hoàn thiện backend/frontend” khi chưa đối chiếu phase delta và launch gate.

## 9. Checklist nhanh trước mỗi lệnh

### T1 trước `/code`

- [ ] TASK status `READY_FOR_EXECUTION`.
- [ ] Spec version/baseline rõ.
- [ ] RQ/STEP/AC có traceability.
- [ ] Open Questions không còn blocker.
- [ ] Backend/frontend scope và non-goals rõ.

### T2 trước `READY_FOR_AUDIT`

- [ ] Mọi step đã chạy hoặc được resolution loại khỏi scope.
- [ ] Mọi AC có evidence thật.
- [ ] Typecheck/test/build/schema đã chạy phù hợp.
- [ ] Không có diff ngoài scope.
- [ ] HANDOFF dòng cuối đúng trạng thái.

### T3 trước verdict

- [ ] HANDOFF readiness pass.
- [ ] C-01..C-10 có status/evidence.
- [ ] Findings đứng trước summary.
- [ ] Không có P0/P1 mở cho PASS.
- [ ] `verify-audit.ps1` trả `RESULT: PASS`.

### T1 trước `ACCEPTED`

- [ ] Audit verdict PASS hoặc CONDITIONAL đã được resolve.
- [ ] Mọi finding có quyết định.
- [ ] Spec version đúng với round cuối.
- [ ] Backend/frontend delta đã ghi trong V5.
- [ ] Phase exit gate đạt.

## 10. Lệnh vận hành chuẩn

```text
# Planner tạo contract
T1: tạo/cập nhật docs/tasks/<task-slug>/TASK.md

# Coding thực thi
/code <task-slug>

# Coding bàn giao
HANDOFF.md = READY_FOR_AUDIT

# Audit độc lập
/audit <task-slug>

# Planner resolve
cập nhật TASK.md > Planner Resolution

# Re-run cùng task sau fix
/code <task-slug>
/audit <task-slug>
```

Với task thiết kế:

```text
Figma Owner thực hiện DESIGN task
/audit-design <task-slug>
```

## 11. Definition of Done của tài liệu hướng dẫn này

Tài liệu được áp dụng khi:

- Mọi task V5 mới dùng `TASK.md` canonical.
- Marketplace MP-1/MP-2/MP-3 được tách riêng, không giao task “làm toàn bộ marketplace”.
- Không phase nào được đóng chỉ bởi báo cáo của Tier 2.
- Tier 3 luôn có quyền trả `BLOCKED/FAIL` khi thiếu artifact hoặc evidence.
- Tier 1 là nơi duy nhất quyết định `ACCEPTED` và chịu trách nhiệm resolve finding.
- Backend/Frontend delta, launch gate và residual risk xuất hiện trong phase report.
