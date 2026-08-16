---
name: code
description: Use when Tier 2 (Engineer) executes an HRP HANDOFF and writes the HANDOFF artifact. Defines minimum evidence requirements, deviation rules and round closure contract.
version: 1.0.0
license: HRP-Internal
---

# Code Skill (Tier 2)

Tier 2 thực thi `TASK.md` và viết `HANDOFF.md` để bàn giao cho Tier 3 audit.

## Bắt buộc trong HANDOFF

- Metadata khớp `TASK.md` (Work type, Audit mode, Spec version, Execution round, Current audit round).
- Mỗi `STEP-0X` đã thực thi:
  - file:line diff
  - lệnh kiểm tra (lint/typecheck/test) + exit code
  - tóm tắt output thật
- Nếu contract mơ hồ: ghi blocker, KHÔNG đoán.
- Deviation khỏi contract: ghi rõ vào mục `Deviations` để Tier 1 xem xét.

## Round Closure

Tier 2 chỉ đóng round khi:

- Mọi `STEP` đã chạy hoặc blocker ghi rõ.
- Targeted test/check pass.
- `deviations` rỗng hoặc đã được document.

Sau đó chuyển `Status` → `READY_FOR_AUDIT` để Tier 3 thao tác.

## Forbidden

- Không tự audit chính mình.
- Không bỏ qua `AC` mà không ghi rõ lý do.
- Không để lại debug log/commented code/bypass test.

## References

- `references/evidence-format.md` — block evidence chuẩn
- `references/deviation-examples.md` — ví dụ deviation hợp lệ / không hợp lệ
