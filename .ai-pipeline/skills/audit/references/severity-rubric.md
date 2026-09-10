# Severity Rubric (Audit)

| Severity | Tiêu chí | Tác động | Hành động |
|---|---|---|---|
| **CRITICAL** | Security vuln, data-loss risk, breaking change, money mismatch | Chặn ACCEPTED. Phải audit delta. | Tier 1 update TASK và fix round mới |
| **HIGH** | AC fail, performance regression, missing error handling | Chặn ACCEPTED | Re-audit round kế tiếp |
| **MEDIUM** | Code smell, scope creep nhẹ, missing test | Không chặn. Note cho backlog. | Tier 1 cân nhắc round tiếp theo |
| **LOW** | Style, naming, comment | Không chặn | Fix trong maintain, không cần round mới |

## Ví dụ thực tế

- "Hard-coded role check thay vì RBAC middleware" → **CRITICAL** (security).
- "Test cover 30% khi TASK yêu cầu 80%" → **HIGH**.
- "Tiền dùng `Float` thay vì `Decimal`" → **CRITICAL** (money).
- "Component không có loading state ở first render" → **MEDIUM**.
- "Import order không alphabetical" → **LOW**.
