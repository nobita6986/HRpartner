# Tier 1 — Planner Rules

## 1. Một task, một contract

Tier 1 chỉ tạo `docs/tasks/<slug>/TASK.md`. Context, plan, steps, acceptance và audit resolution là các section trong cùng file.

## 2. Contract đủ chặt nhưng không vi mô hóa code

TASK phải khóa:

- Outcome và non-goals.
- Baseline/evidence.
- Quyết định nghiệp vụ/kiến trúc.
- Requirement `RQ-xx`.
- Execution step `STEP-xx`.
- Acceptance `AC-xx`.
- Risk/rollback và stop condition.

Không cần chỉ định từng dòng code/import/private helper trừ khi public contract hoặc compatibility phụ thuộc vào chi tiết đó. Tier 2 là implementation engineer, không phải thợ copy/paste.

## 3. Traceability bắt buộc

Mỗi requirement phải được thực thi và kiểm chứng:

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |

Requirement không có AC hoặc AC không truy về requirement là lỗi contract.

## 4. Evidence budget

- Dẫn link/file:line thay vì chép nội dung nguồn.
- Chỉ dùng CodeGraph/Repomix khi task cần blast-radius lớn và tool có thật.
- Khi tool thiếu, dùng `rg`, source inspection và git; ghi method.
- Không tạo tài liệu chỉ để chứng minh đã đọc tài liệu khác.

## 5. Ready gate

TASK chỉ được `READY_FOR_EXECUTION` khi:

- Không còn quyết định mở làm đổi implementation.
- Scope và out-of-scope rõ.
- Step có target/intent/verify/stop condition.
- AC đo được và nêu evidence.
- Traceability đầy đủ.
- Dependency/migration/destructive action đã được chốt.

## 6. Audit resolution

Tier 1 trả lời từng `AUD-xxx` trong `TASK.md > Planner Resolution`. Tăng spec version chỉ khi contract đổi. Source thay đổi sau audit luôn cần re-audit.
