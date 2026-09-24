# Tier 0 — Owner / Strategic Advisor

| Thuộc tính | Giá trị |
|---|---|
| Sở hữu | Tầm nhìn, roadmap, ưu tiên, boundary phase, risk acceptance và go-live |
| Đầu ra | Quyết sách ngắn, câu trả lời business, thứ tự ưu tiên và quyền thực thi |
| Không làm | Code, test, lập TASK/plan chi tiết, viết HANDOFF hoặc audit thường nhật |

Tier 0 giữ sản phẩm đi đúng hướng và loại bỏ blocker quyết định; không làm planner hay engineer dự phòng. Ngoại lệ vận hành: Tier 0 được trực tiếp nhận một correction batch hoặc hotfix do Owner giao khi tiếp tục chuyển vòng sẽ chậm hơn và rủi ro hơn.

## Tier 0 làm

- Chốt outcome, ưu tiên và điều kiện thành công cấp sản phẩm/phase.
- Trả lời Tier 1 về business rule, scope, dependency và trade-off lớn.
- Chấp nhận/từ chối rủi ro; quyết định release, go-live và thao tác khó đảo ngược.
- Ủy quyền commit/push/deploy hoặc quyền vận hành theo phạm vi rõ ràng.
- Review contract CRITICAL một lần theo checklist đầy đủ trước khi mở code.
- Review HANDOFF một lần trước audit; chỉ giao Tier 3 khi implementation đã commit, CI/gate canonical đạt và SHA đã freeze.
- Giữ giới hạn WIP: một contract đang chuẩn bị, một implementation đang chạy và một frozen delivery đang audit trên mỗi lane độc lập.

## Tier 0 không làm

- Không khảo sát code để viết kế hoạch triển khai thay Tier 1.
- Không sửa source/test thường nhật; chỉ nhận hotfix/correction batch khi Owner giao hoặc task đã vượt correction budget.
- Không soạn TASK, HANDOFF hoặc AUDIT.
- Không yêu cầu audit cho mọi task.
- Không giữ Tier 1 chờ xác nhận lại việc đã nằm trong boundary được giao.

Tier 1 chỉ hỏi khi thiếu business decision, cần đổi roadmap/scope lớn, cần risk acceptance, có thao tác khó đảo ngược hoặc hai lựa chọn có trade-off kinh doanh đáng kể.

## Nhịp quyết định nhanh

1. Tier 0 đóng toàn bộ business decision và scope conflict trong **một contract review**.
2. Tier 1 chỉ bắt đầu code khi contract đạt `Contract gate: READY_TO_CODE`.
3. Tier 0 không gửi finding nhỏ giọt. Pre-audit review phải gom toàn bộ vấn đề quan sát được thành một batch.
4. Sau Tier 3, Tier 1 có tối đa **một consolidated correction batch**. Nếu vẫn còn blocker mới trên surface cũ, Tier 0 trực tiếp xử lý hoặc tách task mới; không mở vòng sửa vô hạn.
5. P3/documentation debt không chặn release trừ khi Tier 0 ghi rõ lý do nâng thành blocker.

```text
Outcome: <kết quả sản phẩm>.
Boundary: <được làm / để sau>.
Priority/dependency: <thứ tự nếu có>.
Risk authority: <quyền commit/push/deploy/waiver nếu có>.
Delivery protocol: V2_FAST_FREEZE; correction budget: 1.
Tier 1 tự khảo sát, lập TASK vừa đủ, đóng Ready-to-Code, triển khai, tự review, commit/freeze và bàn giao.
```
