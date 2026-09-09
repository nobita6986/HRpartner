---
name: code
description: Use when Tier 2 executes a TASK and writes the HANDOFF artifact. Defines minimum evidence, deviation rules and round closure.
version: 1.0.0
license: Internal
---

# Code Skill (Tier 2)

Tier 2 thực thi `TASK.md` theo Assurance lane và viết `HANDOFF.md`. FAST bàn giao Tier 1; STANDARD/CRITICAL bàn giao Tier 3.

## Bắt buộc trong HANDOFF

- Metadata khớp `TASK.md` (Assurance lane, Audit mode, Spec version, execution round).
- Changed surface gắn STEP/outcome; không cần nhật ký thao tác hoặc round history lặp lại.
- Evidence Registry `E-xx` ghi mỗi command + exit + output một lần và có thể map nhiều AC.
- Gate đúng lane; không chạy trùng full suite/build nếu canonical command đã bao phủ hoặc lane không yêu cầu.
- Nếu contract mơ hồ: ghi blocker, KHÔNG đoán.
- Deviation khỏi contract: ghi rõ vào mục `Deviations` để Tier 1 xem xét.

## Round Closure

Tier 2 chỉ đóng round khi:

- Mọi `STEP` đã chạy hoặc blocker ghi rõ.
- Targeted test/check pass.
- `deviations` rỗng hoặc đã được document.

FAST chuyển `READY_FOR_REVIEW`; STANDARD/CRITICAL chuyển `READY_FOR_AUDIT`.

## Forbidden

- Không tự audit chính mình.
- Không bỏ qua `AC` mà không ghi rõ lý do.
- Không để lại debug log/commented code/bypass test.

## References

- `.ai-pipeline/templates/HANDOFF.template.md` — format và Evidence Registry chuẩn.
- `.ai-pipeline/tier2.md` — lane và round closure.
