# AUDIT: hrp-v5-m1-09a-current-field-projection

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-09a-current-field-projection` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `Tier 2-A HANDOFF` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `70f642f7ebff81d76172851ee727faba6820d8d9` |
| Independence | `Confirmed (Tests run independently)` |
| Audit time | `2026-08-28` |

## 1. Findings

- Khảo sát mã nguồn (bằng `grep/rg`) trên các route `app/api/workers`, `app/api/statements`, `app/api/vendor/statements`, `app/api/webhook/payslip`, `app/api/ctv/withdrawals`, `app/api/payroll` không phát hiện hành vi raw response (không có `NextResponse.json(row)` hoặc spread operator `...row`).
- Khảo sát `prisma/schema.prisma` xác nhận không có khai báo `Payment` hay `PaymentAllocation`.
- Mandatory verification commands đều báo EXIT 0. Full unit suite `npm run test:unit` pass trọn vẹn 1293/1293 tests. Lệnh build pass 100%. Targeted tests chạy ổn định.
- Hành vi projection xử lý chuẩn xác: filter sensitive fields, omit theo role, và lock schema access theo đúng role matrix.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Manifest route/roles map | PASS | `manifest.test.ts` pass | `None` |
| AC-02 | WORKER_LIST masking | PASS | `worker-projection.test.ts` pass | `None` |
| AC-03 | WORKER_SELF fields | PASS | `workers-me.projection.route.test.ts` pass | `None` |
| AC-04 | STATEMENT_LIST margin | PASS | `statements-list.projection.route.test.ts` (17 tests) pass | `None` |
| AC-05 | STATEMENT_GENERATE DTO | PASS | `statements-generate.projection.route.test.ts` pass | `None` |
| AC-06 | Internal surfaces role gate | PASS | Gate kiểm chứng qua unit test pass | `None` |
| AC-07 | Payslip POST strict payload | PASS | `webhook-payslip.route.test.ts` pass | `None` |
| AC-08 | CTV withdrawal omit ctvId | PASS | `ctv-withdrawals.projection.route.test.ts` pass | `None` |
| AC-09 | Payroll config strict DTO | PASS | `payroll.route.test.ts` pass | `None` |
| AC-10 | Enum coverage (13 roles) | PASS | `manifest.test.ts` verify đủ 13 canonical roles | `None` |
| AC-11 | Static negative fixtures | PASS | `response-projection.static.test.ts` pass | `None` |
| AC-12 | PAYMENT defer (SCHEMA_NOT_AVAILABLE) | PASS | Lệnh `rg` xác thực schema không chứa `Payment` | `None` |
| AC-13 | Mandatory quality gates | PASS | `tsc`, `eslint`, `test:unit`, `build` exit 0 | `None` |
| AC-14 | Strict Scope / Diff allowlist | PASS | `git diff --check` / `git status --short` hợp lệ, không lộ rác | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1293 passed). |
| C-02 | DONE | `npm run build` exit 0 (Static pages compiled). |
| C-03 | DONE | Mọi query DB chứng minh DTO projection clean, không rò rỉ dữ liệu ngoài scope. |
| C-04 | DONE | (Không yêu cầu LIVE lane cho task DTO projection này). |
| C-05 | DONE | Raw rows/spread response đã bị loại bỏ thành công. |
| C-06 | DONE | L2 RLS không bị disable, role matrix nguyên vẹn. |
| C-07 | DONE | Lệnh `git diff --name-only` khớp đúng danh sách allowlist. |
| C-08 | DONE | CSV/JSON không rò rỉ BigInt raw (do serializer tự xử lý). |
| C-09 | DONE | `verify-task.ps1` exit 0. |
| C-10 | DONE | HANDOFF trung thực, ranh giới sửa code chính xác như thiết kế. |

## 3. Scope và Impact

- Loại bỏ hoàn toàn raw row response trên các domain `workers`, `statements`, `webhook`, `withdrawals`, `payroll`.
- Định hình lại dữ liệu trả về thông qua DTO chặt chẽ dựa vào Context + Role Matrix, chống Data Exposure rò rỉ các trường nhạy cảm như CCCD, Bank Account, Client Margin.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/shared/auth/worker-projection.test.ts ...` | 0 | 6 Test Files, 89 tests passed. | Console Output |
| `npm run test:unit` | 0 | 1293 unit tests passed. | Console Output |
| `grep_search (rg raw NextResponse.json)` | 0 results | Không rò rỉ `NextResponse.json(row)` ở `app/api/...` | Console Output |

## 5. Coverage Gaps

- Không có. (Payment module đã đẩy đúng tiến độ sang M8-06/M1-09B).

## 6. Verdict và Planner Questions

- **Verdict:** `PASS`
- **Reason:** Tier 2 cung cấp kết quả cực kỳ chi tiết, triển khai đúng DTO/projection pattern cho toàn bộ các surface nằm trong scope, chặn triệt để Data Exposure/IDOR gián tiếp qua raw serialization. Test coverage đầy đủ (bổ sung test `statements-list.projection.route.test.ts`). Các test an ninh tĩnh (`response-projection.static.test.ts`) kiểm soát được các vi phạm raw JSON trong tương lai. Kiểm định bằng `grep` và `test:unit` đều passed 100%.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `NONE` | `N/A` | `FIXED` | (First pass successful). |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

