---
name: debugging-protocol
description: Use when HRP tiers reproduce or fix a bug inside the pipeline. Defines the 7-step debug flow and which tier owns reproduce/verify/retest.
version: 1.0.0
license: HRP-Internal
---

# Debugging Protocol

## Flow

1. Reproduce bằng command/interaction có thể lặp lại.
2. Ghi before evidence.
3. Khoanh vùng file/symbol/state/data.
4. Hình thành giả thuyết nhỏ nhất có thể kiểm tra.
5. Sửa trong TASK contract.
6. Chạy targeted test/check và ghi after evidence.
7. Chạy regression phù hợp.

## Pipeline ownership

- Planner khóa expected behavior và acceptance trong TASK.
- Tier 2 ghi reproduction/fix verification vào HANDOFF.
- Tier 3 tự reproduce/retest và ghi vào AUDIT.

Không tạo debug report riêng. Không giữ temporary logging, commented code hoặc test bypass trong deliverable.

Tool/command phải theo tech stack hiện hữu; không mặc định Python/pytest cho HRP Next.js/TypeScript.

## References

- `references/repro-command-patterns.md` — các command chuẩn theo stack (Next.js/Vitest/Prisma/psql)
