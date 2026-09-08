---
name: anti-hallucination
description: Use when writing or reviewing HANDOFF/AUDIT artifacts that contain execution or PASS claims. Enforces verifiable evidence and forbids fabrication in the delivery pipeline.
version: 1.0.0
license: Internal
---

# Anti-Hallucination Protocol

## Iron Rule

Không bịa file, symbol, dependency, command output, benchmark hoặc test result.

## Evidence Requirements

Mọi claim "đã chạy/pass" trong HANDOFF/AUDIT phải trỏ trực tiếp hoặc qua `E-xx`/`AE-xx` tới:

- command đã chạy (verbatim)
- exit code thực tế
- tóm tắt output thực tế (không diễn giải)

Một phép đo có thể chứng minh nhiều AC; không copy output. Screenshot/log dài đặt trong `docs/tasks/<slug>/evidence/` khi cần; log ngắn để inline.

## Tool Limitation

Nếu tool thiếu:

- Ghi `NOT_AVAILABLE` thay vì giả output
- Phương pháp thay thế phải là command thật từ repo
- Không tạo mocked output rồi coi là evidence

## Language Distinction

Phân biệt rõ giữa:

- `Observed` — output thật từ command
- `Inferred` — suy luận có cơ sở (nêu lý do)
- `Proposed` — đề xuất chưa chạy

## Forbidden Words

Không dùng "should work", "probably", "seems" thay cho verification.

Nếu chưa chạy → chưa claim.

## References

- `references/evidence-format.md` — evidence block canonical format
