# Skill Map

Skill là hướng dẫn **nạp theo nhu cầu**, không phải checklist phải đọc hết. Thứ tự ưu tiên:

```text
quyết sách Owner → TASK contract → role file → global rules → skill
```

Skill không mở rộng quyền của vai trò và không được dùng để vượt boundary của TASK.

## Theo vai trò

| Tier | Core | Nạp khi tình huống yêu cầu |
|---|---|---|
| Tier 0 | — | `reviewcode`, `research`, `problem-solving` chỉ khi cần ra quyết sách |
| Tier 1 | `task-authoring`, `code`, `implementation-mindset`, `testing-protocol` | `planning`, `codegraph-usage`, `debugging-protocol`, `research`, `docs-seeker`, `databases`, `frontend-design`, `refactor`, `python-project`, `problem-solving`, `reviewcode` |
| Tier 3 | `audit`, `anti-hallucination`, `testing-protocol`, `code-review` | `databases`, `frontend-design`, `debugging-protocol`, `codegraph-usage`, `problem-solving` |

## Tín hiệu chọn skill

| Tín hiệu | Skill |
|---|---|
| Viết/chỉnh TASK | `task-authoring` |
| Implement và HANDOFF | `code` |
| Audit và AUDIT | `audit`, `anti-hallucination` |
| Test fail/bug khó tái hiện | `debugging-protocol` |
| Schema/migration/query/data integrity | `databases` |
| UI-heavy/design system | `frontend-design` |
| Refactor giữ nguyên hành vi | `refactor` |
| Caller/callee/blast radius và có `.codegraph/` | `codegraph-usage` |
| Tài liệu framework/library hiện hành | `docs-seeker` hoặc `research` |
| Python là stack/submodule thật | `python-project` |
| Review read-only ngoài audit | `reviewcode` |

## Quy tắc tải

- Đọc toàn bộ `SKILL.md` của skill đã chọn; reference con chỉ đọc khi skill yêu cầu.
- Thường không nạp quá core + 1–2 skill task-specific trong một lượt.
- Tool không tồn tại thì dùng công cụ tương đương và ghi limitation.
- Skill có stack cụ thể chỉ áp dụng khi repository thực sự dùng stack đó.
