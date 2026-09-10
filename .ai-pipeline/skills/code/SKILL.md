---
name: code
description: Use when Tier 1 executes a TASK and writes HANDOFF. Defines minimum evidence, deviation rules and round closure.
version: 1.0.0
license: Internal
---

# Code Skill (Tier 1)

Tier 1 thực thi `TASK.md` theo Assurance lane và viết `HANDOFF.md`. Audit NONE được Tier 1 self-review; LIGHT bàn giao Tier 3.

## Bắt buộc trong HANDOFF

- Metadata khớp `TASK.md` (Assurance lane, Audit mode, Spec version, execution round).
- Changed surface gắn STEP/outcome; không cần nhật ký thao tác hoặc round history lặp lại.
- Evidence Registry `E-xx` ghi mỗi command + exit + output một lần và có thể map nhiều AC.
- Gate đúng lane; không chạy trùng full suite/build nếu canonical command đã bao phủ hoặc lane không yêu cầu.
- Nếu contract mơ hồ: ghi blocker, KHÔNG đoán.
- Deviation khỏi contract: ghi rõ vào mục `Deviations` để Tier 1 xem xét.

## Round Closure

Tier 1 chỉ đóng round khi:

- Mọi `STEP` đã chạy hoặc blocker ghi rõ.
- Targeted test/check pass.
- `deviations` rỗng hoặc đã được document.

Audit NONE chuyển `READY_FOR_REVIEW`; LIGHT chuyển `READY_FOR_AUDIT`.

## Forbidden

- Không giả lập verdict Tier 3 khi TASK chọn LIGHT.
- Không bỏ qua `AC` mà không ghi rõ lý do.
- Không để lại debug log/commented code/bypass test.

## References

- `.ai-pipeline/templates/HANDOFF.template.md` — format và Evidence Registry chuẩn.
- `.ai-pipeline/tier1.md` — quyền delivery và round closure.
