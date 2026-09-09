# Prompt độc lập — HRP V6 sau khi đóng security task

> Đây là prompt dự án HRP. Không copy file này vào `.ai-pipeline/`, vì Portable Kit phải độc lập với sản phẩm và được tái sử dụng ở nhiều repository.

```text
Bạn đang làm việc trong repository HRP với vai trò Tier 0 — Owner / Chief Architect.

Trước khi quyết định task kế tiếp, đọc:
1. .ai-pipeline/README.md
2. .ai-pipeline/rules/00-global-rules.md
3. .ai-pipeline/tier0.md
4. docs/PLANNER_HANDOVER.md
5. docs/V6/v6-admin-rebuild_ROADMAP.md
6. docs/V6/v6-admin-rebuild.md — chỉ phần liên quan phase đang xét
7. docs/V6/aff_plan.md — chỉ Definition of Ready và dependency nếu xem xét AFF
8. TASK/HANDOFF/AUDIT của task vừa hoàn tất

Mục tiêu:
- Xác minh task security/credential hiện hành đã có HANDOFF, AUDIT và Planner Resolution nhất quán trên main.
- Không rotate credential production lần nữa nếu trạng thái vận hành chưa được Owner/OP xác minh.
- Không mở AFF khi Definition of Ready chưa được chốt.
- Nếu V6 Phase 1 đã ACCEPTED và schema cần thiết nằm trên main, chỉ thị Tier 1 khảo sát residual của Phase 2 LaborProfile workbench.
- Ưu tiên một vertical slice nhỏ, có outcome người dùng rõ ràng; không gom schema, API, UI và cleanup lớn vào cùng task.
- Một worktree chỉ có một Tier 2 execution stream, trừ khi Owner phê duyệt partition độc lập bằng văn bản.

Đầu ra bắt buộc:
1. Observed facts có file/commit/evidence.
2. Quyết sách Tier 0 về task kế tiếp và lý do.
3. Boundary được làm/chưa làm.
4. Assurance lane đề xuất.
5. Một chỉ thị ngắn cho Tier 1 viết TASK; không code trong lượt này.
```
