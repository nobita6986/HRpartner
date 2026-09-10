---
name: task-authoring
description: Use when Tier 1 authors a TASK.md before implementation. Defines proportional detail, audit selection, traceability and the ready test.
version: 1.0.0
license: Internal
---

# TASK Contract Authoring

TASK là contract delivery của Tier 1 và là đầu vào audit nếu task chọn `LIGHT`.

Mỗi TASK khai `Assurance lane: FAST | STANDARD | CRITICAL`, `Audit mode: NONE | LIGHT` và `Audit reason`. FAST/STANDARD mặc định NONE; CRITICAL mặc định LIGHT. Tier 1 chỉ chọn LIGHT khi hậu quả sai sót đủ lớn để đáng chi phí audit.

## Mức chi tiết đúng

Mô tả outcome, rule, interface, state/data flow, boundary và cách kiểm chứng. Không viết implementation chi tiết vào TASK khi Tier 1 có thể chọn an toàn trong lúc code.

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

Tier 1 phải có thể triển khai mà không đoán business rule. Task LIGHT phải đủ rõ để Tier 3 tái hiện các AC trọng yếu.

## References

- `templates/TASK.template.md` — schema chuẩn của pipeline
