---
name: task-authoring
description: Use when Tier 1 (Planner) authors a TASK.md contract. Defines level of detail, ID convention, traceability and the "ready test" that gates handoff to Tier 2.
version: 1.0.0
license: HRP-Internal
---

# TASK Contract Authoring

TASK là contract duy nhất giữa Planner, Executor và Auditor.

## Mức chi tiết đúng

Mô tả outcome, rule, interface, state/data flow, boundary và cách kiểm chứng. Không viết thay implementation khi Tier 2 có thể chọn an toàn theo pattern repo.

## ID và traceability

- Requirement: `RQ-01`.
- Step: `STEP-01`.
- Acceptance: `AC-01`.
- Finding: `AUD-001`.

Mỗi RQ phải map ít nhất một STEP và AC. Step có target, intent, verify và stop condition.

## Khi nào dùng snippet

Chỉ dùng interface/schema/pseudocode ngắn khi cần khóa:

- Public contract.
- Data type/precision.
- State transition.
- Permission semantics.
- Backward compatibility.

Không đưa toàn bộ implementation code vào TASK.

## Ready test

Một implementation engineer hiểu codebase phải thực thi được mà không đoán business rule; một auditor phải xác minh được bằng AC độc lập.

## References

- `templates/TASK.template.md` — schema chuẩn HRP
