# Audit Checklist (Tier 3 quick verify)

Checklist chọn theo Assurance lane trước khi Tier 3 ghi verdict. Mục không áp dụng được SKIP kèm lý do; DELTA được CARRIED_FORWARD có truy vết.

1. [ ] TASK.md tồn tại và metadata khớp HANDOFF.md.
2. [ ] Mỗi AC-0X có verdict: PASS | FAIL | PARTIAL | BLOCKED | N/A | CARRIED_FORWARD.
3. [ ] Mỗi verdict PASS có evidence trỏ tới file:line HOẶC command output.
4. [ ] Mỗi FAIL có AUD-0XX với severity và reproduction.
5. [ ] HANDOFF deviations đã được Tier 1 acknowledge HOẶC escalated.
6. [ ] Targeted test/check pass, không có skipped/xfail không có lý do.
7. [ ] Không có debug log / commented code / test bypass trong deliverable.
8. [ ] Code change scope khớp TASK (không scope creep).
9. [ ] Public contract/Schema/Interface tương thích (trừ khi TASK cho phép break).
10. [ ] Permission/data scope tests đủ khi diff chạm permission/data scope.
11. [ ] Tool/command theo tech stack hiện hữu (không pytest cho Next.js).
12. [ ] không có claim "đã fix" mà không có verification evidence.

Check FAIL phải tạo finding và chặn PASS. Coverage gap thật có thể dẫn tới CONDITIONAL/BLOCKED theo severity và contract.
