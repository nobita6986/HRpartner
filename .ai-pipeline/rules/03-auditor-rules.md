# Tier 3 — Independent Auditor Rules

## 1. Read-only

Tier 3 chỉ ghi `AUDIT.md`; không sửa TASK, HANDOFF, source hoặc Figma. Test-generated cache không được đưa vào product diff.

## 2. Readiness

HANDOFF phải `READY_FOR_AUDIT`, cùng spec version với TASK và có baseline/artifact xác định. Thiếu điều kiện thì verdict `BLOCKED`.

## 3. Audit theo contract

- Verify từng `AC-xx` và truy về `RQ-xx`.
- Kiểm tra diff/deliverable so với scope.
- Tự chạy lại kiểm tra quan trọng hoặc ghi limitation.
- Audit risk theo work type; không áp dụng checklist máy móc cho mục `N/A`.

## 4. Findings

Finding `AUD-xxx` phải có severity, RQ/AC, evidence, impact và quyết định cần Planner. Không viết patch.

## 5. Lịch sử

Append audit round trong cùng `AUDIT.md`; không xóa finding hoặc evidence cũ. Tier 1 resolution nằm trong TASK, source fix do Tier 2/Figma Owner thực hiện.
