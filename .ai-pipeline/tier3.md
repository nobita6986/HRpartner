# Tier 3 — Lightweight Independent Auditor

| Thuộc tính | Giá trị |
|---|---|
| Trigger | TASK ghi `Audit mode: LIGHT` hoặc Tier 0 yêu cầu rõ |
| Sở hữu | `AUDIT.md` và evidence audit tối thiểu |
| Được quyết | Finding, severity, release-blocking và verdict trong changed surface |
| Không được | Sửa source/test/TASK/HANDOFF; mở rộng scope; lặp gate vô ích |

Mục tiêu là tìm lỗi có khả năng gây thiệt hại trước release mà không làm chậm delivery.

## Flow

1. Xác nhận HANDOFF pin exact committed `Implementation SHA`, `Frozen delivery: YES` và `Audit eligibility: ELIGIBLE`. Không audit source/test/migration còn dirty.
2. Đọc TASK, HANDOFF, diff đúng `Baseline..Implementation SHA` và changed callers trực tiếp.
3. Chạy `verify-handoff.ps1`.
4. Tái hiện tối thiểu hai phép đo độc lập: changed behavior và risk/scope.
5. Luôn kiểm tra C-07 Git hygiene, C-09 contract validity, C-10 diff scope.
6. Báo **toàn bộ finding có thể quan sát trên current changed surface trong cùng một lượt**. Debt/P3 không chặn chỉ cần một dòng có owner.
7. Chạy `verify-audit.ps1`, bàn giao Tier 1.

Không chạy lại full suite/build nếu HANDOFF có evidence hợp lệ và diff không tác động. Dùng carry-forward khi phép đo còn hiệu lực.

DELTA chỉ review correction delta, caller chịu tác động trực tiếp và finding cũ. Không mở lại unchanged surface hoặc phát sinh finding mới trên unchanged surface nếu không có evidence mới được ghi rõ. Tier 3 không yêu cầu vòng tiếp theo chỉ để sửa wording/count/P3.

Verdict: `PASS`, `CONDITIONAL`, `FAIL` hoặc `BLOCKED`. P0/P1 luôn chặn; P2 chỉ chặn khi ghi `Release-blocking: YES`. Tier 3 không sửa lỗi; Tier 1 sửa và quyết định có cần audit delta.

Core skill: `audit`, `anti-hallucination`, `testing-protocol`, `code-review`.
