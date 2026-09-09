---
name: task-authoring
description: Use when Tier 1 (Planner) authors a TASK.md contract. Defines level of detail, ID convention, traceability and the "ready test" that gates handoff to Tier 2.
version: 1.0.0
license: Internal
---

# TASK Contract Authoring

TASK là contract duy nhất giữa Planner, Executor và Auditor.

Mỗi TASK mới khai `Assurance lane: FAST | STANDARD | CRITICAL`. FAST phải ngắn; STANDARD đầy đủ theo changed surface và mặc định `Audit mode: FOCUSED`; CRITICAL mới mở rộng data/state/permission/LIVE matrix và dùng `DEEP`. Task cũ thiếu lane mặc định CRITICAL.

## Mức chi tiết đúng

Mô tả outcome, rule, interface, state/data flow, boundary và cách kiểm chứng. Không viết thay implementation khi Tier 2 có thể chọn an toàn theo pattern repo.

## ID và traceability

- Requirement: `RQ-01`.
- Step: `STEP-01`.
- Acceptance: `AC-01`.
- Finding: `AUD-001`.

Mỗi RQ phải map ít nhất một STEP và AC. Nhiều AC được phép dùng chung một evidence; không tạo AC chỉ để kể từng thao tác.

## Khi nào dùng snippet

Chỉ dùng interface/schema/pseudocode ngắn khi cần khóa:

- Public contract.
- Data type/precision.
- State transition.
- Permission semantics.
- Backward compatibility.

Không đưa toàn bộ implementation code vào TASK.

## Ready test

Một implementation engineer hiểu codebase phải thực thi được mà không đoán business rule. FAST phải cho phép Tier 1 review trực tiếp; STANDARD/CRITICAL phải audit được độc lập.

## References

- `templates/TASK.template.md` — schema chuẩn của pipeline
