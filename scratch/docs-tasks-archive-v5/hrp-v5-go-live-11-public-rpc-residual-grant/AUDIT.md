# AUDIT: hrp-v5-go-live-11-public-rpc-residual-grant

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-11-public-rpc-residual-grant` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `2` |
| Audit round | `2` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` hoặc `BLOCKED` đã hoàn tất đo lường tĩnh |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `708506f` |
| Independence | `Confirmed` |
| Audit time | `2026-09-01` |

## 1. Findings

- Khắc phục lỗi Spec (Round 2): Spec v1.2 đã sửa lỗi mâu thuẫn AC-04 (yêu cầu `\bGRANT\b` thay vì chuỗi con `GRANT`). Lệnh grep đã cho kết quả đúng (zero match).
- Migration mới thu hồi chính xác quyền tồn dư `hrp_public_rpc` cấp bởi chính member đó (hành dáng record do Tier 1 phát hiện trên môi trường thật).
- File test tĩnh mới được xác minh RED-before-GREEN thành công (exit 1 khi xoá 2 file MP-2, exit 0 khi khôi phục).
- Tình trạng Blocked: AC-03, AC-05, AC-08, AC-09 vẫn đang bị chặn vì yêu cầu thao tác từ phía Owner trên Neon Console, không thể thực hiện thông qua automation. 

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra git status | PASS | `git status --short -- prisma/` chỉ hiện file test tĩnh mới và folder migration mới. | Không sửa migration cũ. |
| AC-02 | Đọc file migration | PASS | `cat migration.sql` chứa block `DO`, phân biệt `member` và `grantor` và dùng cú pháp `REVOKE ... GRANTED BY`. | Khắc phục sai sót R1. |
| AC-03 | Chạy trong Neon Console lần 2 | BLOCKED | Owner OP chưa thực hiện. | Blocked by runtime constraints |
| AC-04 | Grep cấm lệnh schema/DML | PASS | Lệnh `grep -nE '\bGRANT\b' migration.sql` và lệnh cấm DDL/DML đều trả về zero match (exit 1). | Đã sửa spec case-sensitive. |
| AC-05 | Output SQL members count trên live | BLOCKED | Owner OP chưa thực hiện. | Blocked by runtime constraints |
| AC-06 | Gate tĩnh vệ sinh permission | PASS | Tự đo `npx vitest`. RED (exit 1, tên đúng 2 file MP-2). GREEN (exit 0). | Bắt đúng lỗi. |
| AC-07 | Test:unit >= 1421 | PASS | `npm run test:unit`, exit `0`, output `1480 passed (1480)`. | Thoả ngưỡng 1421. |
| AC-08 | Dán output console sau áp dụng | BLOCKED | Owner OP chưa thực hiện. | Blocked by runtime constraints |
| AC-09 | Đo HTTP 404/4xx sau khi áp | BLOCKED | Cần Owner áp SQL trước khi đo HTTP. | Blocked by runtime constraints |
| AC-10 | Git log kiểm tra Tier 2 commits | PASS | Lệnh `git log origin/main..HEAD` rỗng (không có commit mới do Tier 2 tạo ra). | Tuân thủ không commit. |
| AC-11 | Typecheck | PASS | Lệnh `npm run typecheck`, exit `0`. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit `0`, `Tests 1480 passed` |
| C-02 | DONE | `npm run typecheck` exit `0` |
| C-03 | SKIP | Task di trú role, không Redis. |
| C-04 | SKIP | Không thay đổi rate limit. |
| C-05 | DONE | Migration file không sửa DB Schema (`AC-04` đã chứng minh). |
| C-06 | SKIP | Không sửa RLS. |
| C-07 | DONE | File `migration.sql` viết đúng chuẩn idempotent (chỉ `DO` revoke). |
| C-08 | DONE | Tự đo RED-before-GREEN thành công cho file `migrations-permission-hygiene.static.test.ts`. |
| C-09 | DONE | Verifier tự động kiểm định `AUDIT.md` (chạy thành công). |
| C-10 | DONE | Đã ghi nhận HANDOFF với các `BLOCKED` limitations đúng thực tế. |

## 3. Scope và Impact
Chỉ bổ sung script `migration.sql` thu hồi quyền tồn dư khi cấp phát role cho hàm `hrp_public_rpc`. Hoàn toàn không sửa ứng dụng Next.js hay ảnh hưởng đến routing hiện tại. Ở Spec v1.2, giới hạn cấm DDL được xác định bằng token `\bGRANT\b` một cách chính xác thay vì chuỗi con. Lỗi tiền đề Round 1 đã được sửa (chỉ revoke bản self-grant). Phạm vi hoàn hảo như yêu cầu từ Spec v1.2.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run --config ... migrations-permission-hygiene.static.test.ts` (RED) | `1` | Failed đúng file | Output: `Migration dùng 'WITH SET FALSE' mà không thu hồi membership...` liệt kê đúng 2 file MP-2. |
| `npx vitest run --config ... migrations-permission-hygiene.static.test.ts` (GREEN) | `0` | Passed | `Tests  4 passed (4)` |
| `grep -nE '\bGRANT\b' migration.sql` | `1` | 0 Matches found | Lệnh grep không cho output. |
| `npm run typecheck` | `0` | Không lỗi | Stdout rỗng, stderr rỗng |
| `npm run test:unit` | `0` | Pass hoàn toàn | `Tests 1480 passed (1480)` |

## 5. Coverage Gaps
Không có. Tier 2 đã nhận diện chính xác 4 ACs bị khoá (`BLOCKED`) do giới hạn thẩm quyền vận hành trên database production `hrp-live` của nhà phát triển.

## 6. Verdict và Planner Questions
- **Verdict:** BLOCKED
- **Reason:** Toàn bộ phần mã hoá và test tĩnh đã thoả mãn 100% tiêu chí theo Spec v1.2, RED-before-GREEN bắt chính xác. Tuy nhiên, luồng thực thi yêu cầu Owner phải dán lệnh SQL vào `Neon Console` và cung cấp bằng chứng thủ công (AC-03, 05, 08, 09) trước khi hợp đồng hoàn toàn kín kẽ.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `BLOCKED` | Tier 1 cấm áp bản Round 1 vì sai tiền đề về tệp thành viên. |
| `2` | `None` | `BLOCKED` | `BLOCKED` | Kiểm chứng thành công các tiêu chí tĩnh theo Spec v1.2. Kịch bản test AC-04 đã chuẩn hóa. Vẫn chờ Owner OP trên môi trường thật (Console). |

Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

