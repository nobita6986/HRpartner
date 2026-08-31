# AUDIT: hrp-v5-hotfix-01-public-jobs-500

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-hotfix-01-public-jobs-500` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `d4928af` |
| Independence | `Confirmed` |
| Audit time | `2026-08-31` |

## 1. Findings

- Đã xác nhận `src/domains/job-board/public.service.ts` được chỉnh sửa đúng chỉ thị: loại bỏ lệnh dereference không guard (`project.clientCompany.industry`), thay bằng optional-chaining và nullish coalescing (`project.clientCompany?.industry ?? null`). Kiểu dữ liệu `clientCompany` ở mức Type Definition cũng được sửa thành nullable.
- Đã xác nhận file `mp1.contract.test.ts` chứa 2 case test bao trọn trạng thái bị chặn và đọc được của `client_companies`. 
- Gate unit test `npm run test:unit` thành công trả về exit code 0 với `1418` bài test (nhiều hơn 1416).
- Gate static `npm run typecheck` báo 0 lỗi (`exit 0`).
- Không có bất cứ file SQL, file migration, hay script grant quyền nào bị sinh thêm hay sửa đổi. Các file ngoài scope như `with-public-db.ts` cũng hoàn toàn nguyên vẹn.
- Baseline của repository chưa có commit nào được tạo ra, chứng minh tuân thủ AC-08 (việc push và deploy thuộc về Owner). 

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra deref `clientCompany` | PASS | Lệnh `Select-String "project.clientCompany.industry"` không trả về dòng nào. | `None` |
| AC-02 | Type definition `clientCompany` | PASS | Đã verify kiểu `clientCompany: { industry: string \| null } \| null;` | `None` |
| AC-03 | RED-before-GREEN | PASS | Đã tái lập trạng thái và nhận được RED, sau đó checkout fix và nhận được GREEN. | `None` |
| AC-04 | Gate tĩnh & test coverage | PASS | `typecheck` exit 0. `test:unit` pass 1418 tests (exit 0). Không pipe. | `None` |
| AC-05 | `clientCompany: null` projection | PASS | Assertion `expect(typeof result.jobs[0].industry).toBe('string')` đã pass xanh. | `None` |
| AC-06 | Diff đúng phạm vi | PASS | `git diff --stat -- src/domains/job-board/` chỉ có đúng 2 file, 49 chèn, 2 xóa. | `None` |
| AC-07 | Không SQL & không sửa quyền | PASS | `git diff` regex `CREATE POLICY\|GRANT...` đếm được `0`. | `None` |
| AC-08 | Không tịnh tiến HEAD | PASS | `git log origin/main..HEAD` trả rỗng và count là `0`. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1418 tests pass). |
| C-02 | DONE | `npm run typecheck` exit 0 (0 error). |
| C-03 | SKIP | Hotfix không đụng Redis. |
| C-04 | SKIP | Hotfix không đụng Rate limit. |
| C-05 | SKIP | Không thay đổi schema. |
| C-06 | SKIP | Không thay đổi RLS. |
| C-07 | SKIP | Không có migration. |
| C-08 | DONE | File test (`mp1.contract.test.ts`) phản hồi chính xác exception lúc RED, sau đó xanh mượt. |
| C-09 | DONE | Verifier script trả về 0 đối chiếu TASK. |
| C-10 | DONE | Đã đối chiếu các Limitation (LIM-01..04) và FUP-01 được ghi nhận hợp lý. |

## 3. Scope và Impact
Chỉ thay đổi code logic map dữ liệu (`toDto`) và thêm case kiểm thử, hoàn toàn tuân thủ chiến lược sửa lỗi ngầm (không báo lỗi lây lan) khi một bảng bị giấu do RLS. Code không có side effect.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npm run typecheck` | 0 | Không lỗi build TS | Console Output |
| `npm run test:unit` | 0 | 1418 tests | Console Output |
| `git diff --stat -- src/domains/job-board/` | 0 | Đúng 2 file bị sửa | Console Output |

## 5. Coverage Gaps
Không có lỗ hổng mới. Các FUP đã được Tier 2 ghi chú kĩ càng, bao gồm LIM-03 (sai số về nhãn 'Ngành' lúc fall-back) đã được vạch ra nhưng thuộc scope của task nghiệp vụ khác.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đã làm đúng và đủ mọi chỉ thị của Hotfix. Giữ nguyên ranh giới của ứng dụng, không vá lỗi bằng cách trao quyền vô tội vạ. Khôi phục được public surface với độ nhiễu thấp nhất có thể.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Kiểm chứng gate tĩnh, unit test và git status/diff. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

