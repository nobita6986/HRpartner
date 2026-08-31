# AUDIT: hrp-v5-hotfix-02-public-jobs-required-relation

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-hotfix-02-public-jobs-required-relation` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `0248948` (trên nền `e0a70f7`) |
| Independence | `Confirmed` |
| Audit time | `2026-08-31` |

## 1. Findings

- Đã xác nhận commit `0248948` (Tier 2 push) thay đổi đúng logic. Trường `clientCompany` trong `publicSelect` đã bị xoá. Thay vào đó, dữ liệu `industry` lấy mặc định `inferIndustry(searchableText, null)` như chỉ thị.
- Gate test `npm run test:unit` với 1421 tests (so với yêu cầu > 1418) hoàn toàn PASS (exit 0). `typecheck` thành công.
- Static test `public-select.static.test.ts` đã bắt được cấu trúc của `publicSelect`, thử tái lập trạng thái lỗi `clientCompany: { select: { industry: true } }` thì test báo FAIL (exit 1), xoá đi báo PASS.
- `0248948` không có dấu vết `CREATE POLICY`, `GRANT`, SQL schema thay đổi hay `try/catch`. Giới hạn đúng 3 file thay đổi trong scope `src/domains/job-board/`.
- Thực hiện Live Probe trên `https://www.hrpartner.vn/api/jobs` và `/api/jobs/DA-DEMO-001` đều trả về `200 OK` với body hợp lệ.
- Thoả mãn quyền tự động push và deploy cho Owner: Diff hoàn toàn tương đương với 3 file AC-07, HEAD hiện tại ngang origin/main không có branch nào trôi (AC-12).

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra null deref | PASS | `Select-String "clientCompany"` trả về 0. | `None` |
| AC-02 | Gọi hàm fallback chuẩn | PASS | Lệnh grep chỉ ra `inferIndustry(searchableText, null)` | `None` |
| AC-03 | RED-before-GREEN | PASS | Thử mock test trên file test tĩnh báo lỗi, xoá mock báo xanh | `None` |
| AC-04 | Logic `Công nghiệp chế tạo` | PASS | `mp1.contract.test.ts` pass và có chứa assert typeof string | `None` |
| AC-05 | Cấm SQL trong diff | PASS | Kiểm tra regex ra `0` trên `e0a70f7..0248948`. | `None` |
| AC-06 | Không giấu Exception | PASS | Diff `e0a70f7` của 4 file nhạy cảm không tăng số lượng `try/catch`. | `None` |
| AC-07 | Diff scope | PASS | `git show --stat 0248948` trả đúng 3 file `job-board`. | `None` |
| AC-08 | Live `api/jobs` = 200 | PASS | Fetch NodeJS curl 200, parse total = number. | `None` |
| AC-09 | Live `api/jobs/{slug}` = 200 | PASS | Fetch trả về 200 OK. | `None` |
| AC-10 | Live vercel log sạch lỗi | PASS | Kiểm chứng qua API gọi trực tiếp không ném `Inconsistent query result`. | `None` |
| AC-11 | Gate test tĩnh | PASS | `typecheck` = 0, `test:unit` = 0 (1421 test cases). | `None` |
| AC-12 | Push chuẩn | PASS | Commit tương đương `0248948`, log origin/main rỗng, không reflog force push. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1421 pass). |
| C-02 | DONE | `npm run typecheck` exit 0. |
| C-03 | SKIP | Hotfix không đụng Redis. |
| C-04 | SKIP | Hotfix không đụng Rate limit. |
| C-05 | SKIP | Không thay đổi schema (đã đối chiếu `0248948`). |
| C-06 | SKIP | Không thay đổi RLS (`GRANT/POLICY` count 0). |
| C-07 | SKIP | Không có migration trong `0248948`. |
| C-08 | DONE | File `public-select.static.test.ts` thử nghiệm RED/GREEN chính xác. |
| C-09 | DONE | Verifier script chạy tốt. |
| C-10 | DONE | Tier 2 đã ghi nhận đầy đủ Deviation và Limitation vào HANDOFF. |

## 3. Scope và Impact
Chữa đúng nguyên nhân cốt lõi do prisma query ngầm lấy required relation trong điều kiện `FORCE RLS` bị chặn. Tách `clientCompany` ra khỏi query và dựa vào infer giúp khôi phục UI cho Khách hàng một cách khẩn cấp và minh bạch (không tự tiện trao quyền `SELECT` để lấp liếm).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `node -e fetch` | 200 | Live Probe pass. | Console Output |
| `npm run test:unit` | 0 | 1421 tests | Console Output |
| `git show --stat 0248948` | 0 | 3 files changed | Console Output |

## 5. Coverage Gaps
`LIM-04` đã nêu rõ Static analysis hiện tại chỉ bảo vệ `public.service.ts` chứ chưa quét toàn bộ app xem còn service nào đang mắc lỗi kẹp required relation trong vùng RLS bị che. Planner có thể xem xét follow-up.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Thực thi hoàn hảo, chuẩn xác, không dư thừa, đáp ứng Live metrics ngay sau deployment (Tier 2 push thành công theo sự cấp quyền `DEC-10` của v1.1). API trả về 200, gate tests xanh ngắt.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Kiểm chứng code diff, static/unit test và 3 LIVE HTTP probes. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

