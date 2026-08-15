# Prompt đầu tiên cho Tier 1 — HRP V4 Mockup

Dùng prompt này trong Planner AI đã được cấu hình bằng `TIER1_PROMPT.md`.

---

Hãy khởi tạo task `hrp-v4-bod-mockup` với `Work type: DESIGN` theo pipeline ba artifact mới.

## Outcome

Tạo **một contract duy nhất** để Figma Owner thực hiện toàn bộ roadmap mockup 10 ngày mà không phải tự đoán nghiệp vụ, dữ liệu, frame, click-path hoặc tiêu chí audit.

Output duy nhất của bạn trong lần này:

`docs/tasks/hrp-v4-bod-mockup/TASK.md`

Không tạo HANDOFF/AUDIT trong lần này và không tách bất kỳ section nào thành tài liệu phụ. Không viết code và không sửa Figma.

## Nguồn bắt buộc

Đọc và dẫn chiếu, không sao chép dài:

1. `TIER1_PROMPT.md`.
2. `.ai-pipeline/templates/TASK.template.md`.
3. `docs/UNIFIED_PLAN_v4.md`.
4. `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md`.
5. `docs/HRP_V4_HOLISTIC_REVIEW.md`.
6. `docs/data-scope-security.md`.
7. `prisma/schema.prisma` chỉ để xác minh entity/state; không thiết kế migration.

Nếu nguồn mâu thuẫn, ghi evidence và Planner recommendation trong TASK. Chỉ đánh dấu `NEED_USER_DECISION` khi lựa chọn làm đổi contract; không hỏi lại điều đã có bằng chứng rõ.

## Control bắt buộc

- Task slug: `hrp-v4-bod-mockup`.
- Work type: `DESIGN`.
- Spec version: `v1.0`.
- Executor: `Sếp / Figma Owner`.
- Auditor: `Tier 3 — independent audit context`.
- Status: `READY_FOR_EXECUTION` nếu không còn quyết định chặn việc dựng low-fi; nếu có thì `DRAFT`.
- Baseline: các tài liệu nguồn và ngày kiểm tra thực tế.

## Contract phải khóa

### Story và screen inventory

Một scenario xuyên suốt S01–S04:

- Nhu cầu 50, ACTIVE 47, thiếu 3.
- Một worker vi phạm 1-ACTIVE và được dẫn qua guided transfer.
- Một worker có Referral Guard.
- 7 attendance exceptions trước khi lock.
- Vendor payable `728.460.000 ₫`.
- Client receivable `914.820.000 ₫`.
- Gross margin `186.360.000 ₫`.

Màn hình:

- S01 Operations Control Tower.
- S02 Project Staffing + Talent Pool.
- S03 Attendance Reconciliation Workbench.
- S04 Dual Reconciliation Hub + Vendor Preview.

Không đưa Payroll, TNCN, BHXH, Worker Portal hoặc CRM pipeline vào demo chính.

### Decisions

Đưa D01–D12 vào `TASK.md > Decisions`:

- Giữ recommendation trong PDD làm prototype assumption để Figma Owner có thể bắt đầu.
- Ghi rõ decision nào chặn low-fi, chặn high-fi hoặc chỉ chặn Mockup Baseline.
- Không tự đánh dấu quyết định BoD là final.
- D01–D08 phải được đưa vào demo/feedback; D09–D12 có thể deferred theo PDD.

### Mock data

Đưa canonical mock data vào Contract, không tạo file data riêng:

- Client/project/vendor/period/region.
- Worker ID/name/source/availability/assignment/guard state.
- Shift codes và attendance exceptions.
- Vendor/client rates, quantities và nguyên VND.
- Công thức kiểm tra `914.820.000 - 728.460.000 = 186.360.000`.
- Mapping field/frame và validation rule.

Không dùng PII hoặc thương hiệu khách hàng thật.

### Figma work order

Execution Plan phải có `STEP-xx` cho:

1. Setup file/pages/app shell.
2. Low-fi S01/S02 và hai rule drawers.
3. Low-fi S03/S04 và reconciliation states.
4. Low-fi HANDOFF + audit round 1.
5. Foundations/components/high-fi.
6. Prototype hotspots/loading/empty/error/locked states.
7. High-fi HANDOFF + audit round 2.
8. Dry-run, BoD package và freeze Mockup Baseline.

Mỗi step ghi frame ID, deliverable, dependency/decision, verify và stop condition. Không chỉ dẫn decoration hoặc implementation frontend.

### Acceptance

Tạo AC có ID và map trực tiếp tới RQ/STEP, tối thiểu bao phủ:

- Một story liên tục và back-path hợp lệ.
- Card cho Talent Pool; table cho attendance/financial reconciliation.
- 1-ACTIVE, Referral Guard và exception-to-lock dễ hiểu.
- Dummy data/totals nhất quán.
- Primary action và text không bị che ở 1366 × 768.
- Loading/empty/error/permission/locked states.
- Hotspot chạy đúng click-path và demo tối đa 15 phút.
- Không có feature ngoài scope.

## Quality bar

- Mọi RQ có ít nhất một STEP và AC trong bảng traceability.
- Evidence dùng file/section cụ thể.
- Không còn placeholder/TODO nếu status là `READY_FOR_EXECUTION`.
- Không chép toàn bộ PDD vào TASK.
- Figma Owner đọc riêng TASK vẫn biết việc tiếp theo, dữ liệu dùng và khi nào phải dừng.
- Tier 3 đọc TASK/HANDOFF có thể audit độc lập mà không hỏi lại Planner.

## Validation

Chạy:

```powershell
.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v4-bod-mockup\TASK.md
```

Nếu validator fail, sửa TASK và chạy lại. Không hạ tiêu chuẩn validator.

## Final response

Nêu:

- Path, spec version và status của TASK.
- Ba prototype assumptions quan trọng nhất sếp cần biết.
- Blocker nếu có.
- Hành động kế tiếp của Figma Owner.

Dòng cuối chính xác:

`Task contract: READY_FOR_EXECUTION` hoặc `Task contract: DRAFT`.

---

Dừng sau khi tạo và validate TASK. Không thực hiện Figma và không chuyển sang coding.
