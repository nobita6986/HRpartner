---
name: testing-protocol
description: Use when HRP tiers need to run/verify tests in a multi-stack project (Next.js, Node, Python). Defines tool selection rule from repo manifest, test matrix, coverage rules and Tier-3 retest duty.
version: 1.0.0
license: HRP-Internal
---

# Testing Protocol (Multi-stack)

## 1. Chọn tool từ repo, không giả định

Trước khi chạy test, đọc manifest và config hiện hữu:

- Node/TypeScript: `package.json`, lockfile, `tsconfig.json`, ESLint config và config của Vitest/Jest/Playwright nếu có.
- Prisma: `prisma/schema.prisma`, migration và scripts liên quan.
- Python: `pyproject.toml`, `requirements.txt`, `pytest.ini` hoặc tương đương.

Ưu tiên script chính thức trong manifest. Không tự cài dependency hoặc tự tạo một test framework khác.

## 2. Ma trận kiểm tra tối thiểu

| Loại thay đổi | Kiểm tra tối thiểu |
|---|---|
| TypeScript/React/Next.js | lint, typecheck, test liên quan, build khi acceptance yêu cầu |
| API/server action | unit/integration test, auth/authz, validation, negative case |
| Prisma/schema | format/validate, migration review, generated client compatibility, data rollback |
| Permission/data scope | positive + negative tests theo role/scope, bypass attempt |
| Job/queue/webhook | retry, duplicate delivery, idempotency, timeout/failure path |
| UI | interaction states, loading/error/empty, keyboard/accessibility và viewport đã chốt |
| Python | lint/type/test theo config hiện hữu |

## 3. Coverage

- Coverage target do `TASK.md > Acceptance` quy định dựa trên rủi ro.
- Không áp đặt một tỷ lệ chung nếu repo chưa có baseline.
- Với logic tiền, permission, state transition và reconciliation: ưu tiên branch/negative-case coverage, không chỉ line coverage.
- Không dùng skipped/xfail/commented test để làm đẹp kết quả nếu không có lý do và Planner chấp thuận.

## 4. Dữ liệu test

- Không gọi production database/API hoặc dùng PII thật.
- Fixture phải deterministic; thời gian, timezone, random và external API cần được kiểm soát.
- Test liên quan BigInt/Decimal phải assert giá trị nguyên/chính xác, không dùng floating-point gây sai tiền.

## 5. Trách nhiệm theo tầng

- Tầng 2 chạy command/check trong `TASK.md > Execution Plan/Acceptance` và ghi evidence vào HANDOFF.
- Tầng 3 tự chạy lại command quan trọng, bổ sung negative/regression checks trong phạm vi audit và ghi output riêng.
- Nếu môi trường không chạy được, không ghi PASS; nêu limitation và điều kiện cần để kiểm tra lại.
