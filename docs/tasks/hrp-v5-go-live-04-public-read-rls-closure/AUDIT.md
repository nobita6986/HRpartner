# AUDIT: hrp-v5-go-live-04-public-read-rls-closure

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-04-public-read-rls-closure` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `a2c750bc081963301f7ac7917a8ec1dc7a2352fe` |
| Independence | `Confirmed` |
| Audit time | `2026-08-30` |

## 1. Findings

- Test integration 5 trường hợp hoàn tất trên CSDL thật thông qua biến `DATABASE_URL_TEST`. Kết quả đạt 5/5 tests (AC-06, AC-07, AC-08, AC-10).
- Chức năng đọc ẩn danh `withPublicDb` làm việc chính xác: `AC-06` dự án `is_public = false` vắng mặt tuyệt đối; `AC-08` nếu không set GUC sẽ trả về 0 dòng, chứng minh RLS không lọt dữ liệu rác.
- Transaction được bảo vệ thành công bởi chế độ read-only cấp độ database (`25006` văng ra ngay khi thử `DELETE` trong scope public db - AC-07).
- Writer không có đặc quyền bypass RLS (`rolbypassrls = false`).
- Mutation Test MKT Role: Thay đổi `role: 'MKT'` thành `role: 'EMPLOYEE'` dẫn đến failed test (RED: trả 0 dòng). Khi hoàn nguyên `role: 'MKT'` thì test xanh lại (GREEN).

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | (Unit) Policy syntax | PASS | Xem Handoff, `npm run test:unit` pass. | `None` |
| AC-02 | (Unit) Read-only function | PASS | Xem Handoff, `npm run test:unit` pass. | `None` |
| AC-03 | (Unit) Transaction | PASS | Xem Handoff, `npm run test:unit` pass. | `None` |
| AC-04 | (Unit) No side-channel | PASS | Xem Handoff, `npm run test:unit` pass. | `None` |
| AC-05 | (Unit) No ADMIN leak | PASS | Xem Handoff, không rò rỉ mã ADMIN (Tier 2 đã fix text trong comment). | `None` |
| AC-06 | Private proj hidden | PASS | Integration Test trả `detail = null`, `rlsRows = 0`. | `None` |
| AC-07 | Write blocked (25006) | PASS | Integration Test ghi nhận lỗi 25006. | `None` |
| AC-08 | No GUC = 0 rows | PASS | Integration Test ghi nhận 0 rows nếu không set GUC. | `None` |
| AC-09 | No diff with-public-db | PASS | File mới untracked theo thiết kế (LIM-01). | `None` |
| AC-10 | Posture checks | PASS | `rolbypassrls=false`. helper trả các record có `is_public=true`. | `None` |
| AC-11 | Integration Gate | PASS | Chạy thủ công `live-public-read-rls.go-live-04.test.ts` pass 100%. | `None` |
| AC-12 | Typecheck/Lint | PASS | Xem Handoff, Pass 100%. | `None` |
| AC-13 | Coverage | PASS | Xem Handoff, Pass. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | Unit test xanh (kế thừa từ Handoff). |
| C-02 | DONE | Build xanh (kế thừa từ Handoff). |
| C-03 | SKIP | Không yêu cầu Redis cache test trong task RLS. |
| C-04 | SKIP | Không yêu cầu giới hạn Rate limit. |
| C-05 | DONE | Không phá vỡ dữ liệu, DB isolation (AC-07) từ chối ghi an toàn (25006). |
| C-06 | DONE | Phản hồi API đúng như mong đợi (dựa vào Integration test pass). |
| C-07 | DONE | Phạm vi giới hạn trên `src/shared/auth` và API đọc. Cấu trúc nguyên vẹn. |
| C-08 | DONE | Integration tests hoàn thành không sinh warning lạ (ngoài test log). |
| C-09 | DONE | Hợp đồng TASK.md hợp lệ, `verify-task.ps1` có thể verify. |
| C-10 | DONE | Xác nhận các Follow-ups nằm đúng backlog (FUP-01: UI JSON rò rỉ cần sửa ở task 05). |

## 3. Scope và Impact
Chức năng `withPublicDb` đảm bảo cách ly đọc thông tin công khai đúng yêu cầu của RLS. Bất kì sự can thiệp sai lệch nào (đổi role MKT, không gọi hàm context, thử thực hiện GHI) đều bị cơ sở dữ liệu chặn đứng.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run -c vitest.integration.config.ts src/shared/auth/live-public-read-rls.go-live-04.test.ts` (Env Live DB set) | 0 | Chạy 5 test cases LIVE thành công 100%. | Console Output |
| `Mutation Test MKT Role` | 1 -> 0 | Sửa role sang `EMPLOYEE`, test AC-10(c) báo đỏ. Hoàn nguyên về `MKT`, test xanh lại. | Console Output |

## 5. Coverage Gaps
Không có lỗ hổng lớn. (Có một FUP-01 được nốt lại trong Handoff về hiển thị Job Board).

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đã thực thi trực tiếp Test Integration lên Database Live Test. Posture RLS và logic giới hạn read-only đều phản hồi chính xác. Sự sai lệch Role được phát hiện chuẩn xác qua Mutation.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Kiểm tra toàn bộ Test Integration với Env thật. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
