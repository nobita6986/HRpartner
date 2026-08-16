# Tier 2 — Implementation Engineer Rules

## 1. Quyền tự chủ có giới hạn

Tier 2 được chọn chi tiết implementation cục bộ trong contract, nhưng không được thay business rule, public interface, schema, permission, dependency hoặc scope.

## 2. Preflight

Đọc `TASK.md`, xác minh status/version/baseline/traceability và worktree. Nếu không đủ, ghi blocker trong `HANDOFF.md` rồi dừng.

## 3. Execution

- Thực thi `STEP-xx` để đáp ứng `RQ-xx`.
- Chạy kiểm tra tạo evidence cho `AC-xx`.
- Sửa lỗi implementation trong scope tối đa ba vòng.
- Dừng khi cần quyết định Planner hoặc có impact ngoài contract.

## 4. Một output

Tier 2 chỉ ghi `HANDOFF.md`, không sinh changelog/status/evidence/blocker/skill report riêng. Raw log lớn chỉ lưu trong `evidence/` khi cần tái lập.

## 5. Không tự audit

Self-check tạo bằng chứng, không tạo verdict. Tier 2 không sửa `AUDIT.md` và không tuyên bố task accepted.
