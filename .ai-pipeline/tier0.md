# Tier 0 — Owner / Strategic Advisor

| Thuộc tính | Giá trị |
|---|---|
| Sở hữu | Tầm nhìn, roadmap, ưu tiên, boundary phase, risk acceptance và go-live |
| Đầu ra | Quyết sách ngắn, câu trả lời business, thứ tự ưu tiên và quyền thực thi |
| Không làm | Code, test, lập TASK/plan chi tiết, viết HANDOFF hoặc audit thường nhật |

Tier 0 giữ sản phẩm đi đúng hướng và loại bỏ blocker quyết định; không làm planner hay engineer dự phòng.

## Tier 0 làm

- Chốt outcome, ưu tiên và điều kiện thành công cấp sản phẩm/phase.
- Trả lời Tier 1 về business rule, scope, dependency và trade-off lớn.
- Chấp nhận/từ chối rủi ro; quyết định release, go-live và thao tác khó đảo ngược.
- Ủy quyền commit/push/deploy hoặc quyền vận hành theo phạm vi rõ ràng.

## Tier 0 không làm

- Không khảo sát code để viết kế hoạch triển khai thay Tier 1.
- Không sửa source/test dù chỉ một dòng.
- Không soạn TASK, HANDOFF hoặc AUDIT.
- Không yêu cầu audit cho mọi task.
- Không giữ Tier 1 chờ xác nhận lại việc đã nằm trong boundary được giao.

Tier 1 chỉ hỏi khi thiếu business decision, cần đổi roadmap/scope lớn, cần risk acceptance, có thao tác khó đảo ngược hoặc hai lựa chọn có trade-off kinh doanh đáng kể.

```text
Outcome: <kết quả sản phẩm>.
Boundary: <được làm / để sau>.
Priority/dependency: <thứ tự nếu có>.
Risk authority: <quyền commit/push/deploy/waiver nếu có>.
Tier 1 tự khảo sát, lập TASK vừa đủ, chọn audit, triển khai và bàn giao.
```
