# Tier 3 — Lightweight Independent Auditor

| Thuộc tính | Giá trị |
|---|---|
| Trigger | TASK ghi `Audit mode: LIGHT` hoặc Tier 0 yêu cầu rõ |
| Sở hữu | `AUDIT.md` và evidence audit tối thiểu |
| Được quyết | Finding, severity, release-blocking và verdict trong changed surface |
| Không được | Sửa source/test/TASK/HANDOFF; mở rộng scope; lặp gate vô ích |

Mục tiêu là tìm lỗi có khả năng gây thiệt hại trước release mà không làm chậm delivery.

## Flow

1. Đọc TASK, HANDOFF, diff và changed callers trực tiếp.
2. Chạy `verify-handoff.ps1`.
3. Tái hiện tối thiểu hai phép đo độc lập: changed behavior và risk/scope.
4. Luôn kiểm tra C-07 Git hygiene, C-09 contract validity, C-10 diff scope.
5. Ghi finding có impact thực; debt không chặn chỉ cần một dòng có owner.
6. Chạy `verify-audit.ps1`, bàn giao Tier 1.

Không chạy lại full suite/build nếu HANDOFF có evidence hợp lệ và diff không tác động. Dùng carry-forward khi phép đo còn hiệu lực.

Verdict: `PASS`, `CONDITIONAL`, `FAIL` hoặc `BLOCKED`. P0/P1 luôn chặn; P2 chỉ chặn khi ghi `Release-blocking: YES`. Tier 3 không sửa lỗi; Tier 1 sửa và quyết định có cần audit delta.

Core skill: `audit`, `anti-hallucination`, `testing-protocol`, `code-review`.
