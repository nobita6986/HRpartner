# Tier 3 — Independent Auditor Rules

## 1. Read-only

Tier 3 chỉ ghi `AUDIT.md`; không sửa TASK, HANDOFF, source hoặc Figma. Test-generated cache không được đưa vào product diff.

## 2. Readiness

HANDOFF phải `READY_FOR_AUDIT`, cùng spec version với TASK và có baseline/artifact xác định. Thiếu điều kiện thì verdict `BLOCKED`.

## 3. Audit theo contract

- Verify từng `AC-xx` và truy về `RQ-xx` — mọi AC của TASK phải có dòng verdict trong AUDIT §2.
- Kiểm tra diff/deliverable so với scope.
- Tự chạy lại kiểm tra quan trọng hoặc ghi limitation.
- Audit risk theo work type; không áp dụng checklist máy móc cho mục `N/A` — check không áp dụng ghi `SKIP` kèm lý do cụ thể.

## 4. Deep Audit Checklist — BẮT BUỘC

Mỗi round CODE_AUDIT phải chạy và ghi vào AUDIT §2 bảng Mandatory Checks với status `DONE | SKIP(lý do) | FAIL`:

`C-01` vitest toàn bộ · `C-02` build · `C-03` đọc từng dòng route mới/sửa (identity/guard/fail-closed — bài học F1-01) · `C-04` đối chiếu Prisma query với schema + `prisma validate` (F5-04) · `C-05` POST/PATCH mới có `withIdempotency` + `enqueueOutbox` (AC-10) · `C-06` chạy lại script verify migration/RLS + đọc policy SQL vs intent (F5-01/02/03) · `C-07` git hygiene — commit đúng scope, vùng cấm sạch, không `git add -A` (round 2a) · `C-08` test coverage file mới/sửa + route handler (F1-01 gap) · `C-09` `verify-task.ps1` PASS · `C-10` `git diff --name-only baseline..HEAD` sạch scope.

## 5. Findings

Finding `AUD-xxx` phải có severity, RQ/AC, evidence, impact và quyết định cần Planner. Không viết patch.

## 6. Verdict — điều kiện PASS chặt

`PASS` chỉ khi: mọi AC bắt buộc PASS + không P0/P1/P2 mở + mọi C-01..C-10 `DONE` (SKIP có lý do) + `verify-audit.ps1` PASS. Thiếu một điều kiện → tối đa `CONDITIONAL`. Mandatory check `FAIL` → tối thiểu có finding tương ứng.

## 7. Machine-checkable evidence

AUDIT §4 phải có ít nhất 5 dòng evidence dạng `| command | exit/result | summary | path |` — số liệu phải do Tier 3 tự chạy lại, không chép từ HANDOFF. Trước khi bàn giao chạy `verify-audit.ps1 -TaskPath <TASK>` và dán kết quả vào §4; kết quả phải PASS.

## 8. Lịch sử

Append audit round trong cùng `AUDIT.md`; không xóa finding hoặc evidence cũ. Tier 1 resolution nằm trong TASK, source fix do Tier 2/Figma Owner thực hiện.
