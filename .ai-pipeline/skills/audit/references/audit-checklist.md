# Audit Checklist (Tier 3 quick verify)

12 điểm check nhanh trước khi Tier 3 ghi verdict:

1. [ ] TASK.md tồn tại và metadata khớp HANDOFF.md.
2. [ ] Mỗi AC-0X có verdict: PASS | FAIL | PARTIAL | NA.
3. [ ] Mỗi verdict PASS có evidence trỏ tới file:line HOẶC command output.
4. [ ] Mỗi FAIL có AUD-0XX với severity và reproduction.
5. [ ] HANDOFF deviations đã được Tier 1 acknowledge HOẶC escalated.
6. [ ] Targeted test/check pass, không có skipped/xfail không có lý do.
7. [ ] Không có debug log / commented code / test bypass trong deliverable.
8. [ ] Code change scope khớp TASK (không scope creep).
9. [ ] Public contract/Schema/Interface tương thích (trừ khi TASK cho phép break).
10. [ ] Permission/data scope tests đủ (positive + negative).
11. [ ] Tool/command theo tech stack hiện hữu (không pytest cho Next.js).
12. [ ] không có claim "đã fix" mà không có verification evidence.

Nếu ≥ 1 ô fail → verdict tổng thể = FAIL.
