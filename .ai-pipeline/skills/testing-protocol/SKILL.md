---
name: testing-protocol
description: Use when tiers run or verify tests in any supported stack. Selects tools from repository manifests and defines retest duties.
version: 1.0.0
license: Internal
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

- Tầng 2 chạy command/check theo Assurance lane và ghi mỗi phép đo một lần trong Evidence Registry của HANDOFF.
- Tầng 3 không tham gia FAST mặc định; STANDARD dùng FOCUSED và chỉ chạy lại behavior/check trọng yếu; CRITICAL dùng DEEP theo critical surface. DELTA không lặp lại phần bất biến.
- Nếu môi trường không chạy được, không ghi PASS; nêu limitation và điều kiện cần để kiểm tra lại.
