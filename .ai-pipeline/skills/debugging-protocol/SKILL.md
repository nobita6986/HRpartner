---
name: debugging-protocol
description: Use when a tier reproduces, fixes or verifies a bug. Defines the debug flow and ownership of reproduction/retest.
version: 1.0.0
license: Internal
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

- Tier 1 khóa expected behavior, sửa lỗi và ghi reproduction/fix verification vào HANDOFF.
- Tier 3 tự reproduce/retest và ghi vào AUDIT.

Không tạo debug report riêng. Không giữ temporary logging, commented code hoặc test bypass trong deliverable.

Tool/command phải theo manifest và tech stack hiện hữu; không mặc định một framework test.

## References

- `references/repro-command-patterns.md` — các command chuẩn theo stack (Next.js/Vitest/Prisma/psql)
