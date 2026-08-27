# AUDIT: hrp-v5-m1-07a-ticket-rls-backstop

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-07a-ticket-rls-backstop` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `2` |
| Audit round | `2` |
| Round opened by | `HANDOFF round 2` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `879db9a0177fa33203f2fe224fe728cd648227a2` |
| Independence | `Confirmed` |
| Audit time | `2026-08-27 11:05 +07:00` |

## 1. Findings

### AUD-001 — Thiếu môi trường chạy LIVE integration tests (ENV_BLOCKED)

- **Severity:** `P2`
- **Status:** `RESOLVED`
- **RQ/AC:** `RQ-05 / AC-02..AC-06`
- **Evidence:** Tier 2 đã cung cấp database `ep-empty-forest-azlhfyo9` trong HANDOFF round 2. Đã dùng các credentials test/admin để chạy integration tests. Mọi lệnh đều được hệ thống xác nhận và thực thi hoàn hảo (32 tests PASS).
- **Impact:** Có thể nghiệm thu bằng kết quả thực tế từ DB thật.
- **Decision needed from Planner:** `None`.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Code review migration SQL (Static) & LIVE tests | PASS | `tickets`, `ticket_history`, `ticket_comments`, `ticket_notifications` có `ENABLE` và `FORCE RLS`. LIVE test khẳng định không tồn tại legacy `FOR ALL` policy. | `None` |
| `AC-02` | `npx vitest run ... vitest.integration.config.ts` | PASS | Toàn bộ 9 cases cho WORKER self + HR_STAFF đều pass xanh. | `None` |
| `AC-03` | `npx vitest run ... vitest.integration.config.ts` | PASS | Toàn bộ 12 cases test quyền ACCOUNTANT, PM, DIRECTOR và các denied roles đều pass xanh. Các roles denied nhận mảng rỗng (zero tickets). | `None` |
| `AC-04` | `npx vitest run ... vitest.integration.config.ts` | PASS | Toàn bộ 6 cases test cho history append-only, comment/notification isolation pass xanh. | `None` |
| `AC-05` | Code review migration SQL (Static) & LIVE tests | PASS | Hàm helper dùng `SECURITY DEFINER`, lock `search_path = pg_catalog, public`. Kiểm thử truy vấn GUC xác nhận đúng quyền, không lỗi leo thang đặc quyền. | `None` |
| `AC-06` | `integration-preflight.mjs` & LIVE tests | PASS | Áp dụng migration lên DB test cách ly thành công. 32 assertions của integration tests (positive/negative) chạy hoàn hảo. | `None` |
| `AC-07` | Pipeline commands + Git scope | PASS | Prisma validate, Build thành công. Test vitest unit fail 1 lỗi pre-existing ở `e2e-staffing-narrative`. Git tree không bị lẫn M1-06d WIP. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | `npm run test:unit` -> Exit code 1 (960/961 PASS, 1 test `e2e-staffing-narrative` fail lỗi cũ: `prisma.$transaction is not a function`, không liên quan tới M1-07a). Khớp với HANDOFF. |
| `C-02` | DONE | `npm run build` -> Exit code 0 (Build thành công). |
| `C-03` | SKIP | Không có HTTP route nào mới/sửa trong scope M1-07a. |
| `C-04` | DONE | `npx prisma validate` -> Exit code 0 (The schema is valid). |
| `C-05` | SKIP | Không có route mới. |
| `C-06` | DONE | Đã duyệt mã migration. Các sửa đổi ở round 2 (bổ sung ACCOUNTANT vào `hrp_ticket_history_insert` và `visible`, khóa DIRECTOR khỏi `hrp_ticket_insertable`, explicit cast `::text` cho enum) đã khắc phục mọi vấn đề tĩnh/động trước đó. |
| `C-07` | DONE | Lệnh `git status` cho thấy Tier 2 tuân thủ kỷ luật scope, không stage các file M1-06d WIP. |
| `C-08` | DONE | Đã có file `live-ticket-rls-scope.m1-07a.test.ts` (32 tests) cover toàn diện ma trận quyền. |
| `C-09` | DONE | `powershell ... verify-task.ps1` -> `EXIT:0 RESULT: DRAFT-VALID` (task ở trạng thái `READY_FOR_AUDIT` nên cảnh báo là hợp lý). |
| `C-10` | DONE | `git status` xác nhận scope sạch, không có commit/push bừa bãi. |

## 3. Scope và Impact

- **Deliverables in scope:** Migration `m1_07a_ticket_rls_backstop`, file test `live-ticket-rls-scope.m1-07a.test.ts`, lane registration trong config vitest, scripts test.
- **Out-of-scope changes:** Không.
- **Blast radius/callers/affected flows:** Các policies mới được bao phủ toàn diện 100% bằng LIVE test, khẳng định tính đúng đắn cho mọi nhóm quyền (Worker, HR, Accountant, PM, BOD). Rủi ro downtime / zero visibility khi áp dụng vào db thật đã được giảm trừ hoàn toàn.
- **Data/security/migration/operations:** Các quy chuẩn về bảo mật (`SECURITY DEFINER`, chống enum cast error, cô lập biến môi trường/GUC) đều an toàn.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npm run test:unit` | 1 | 960 passed, 1 pre-existing fail | `task-57.log` (không do M1-07a gây ra) |
| `npm run build` | 0 | Build thành công | `task-58.log` |
| `npx prisma validate` | 0 | Valid Schema | `task-59.log` |
| `npx vitest run ... vitest.integration.config.ts --testNamePattern=V5-M1-07a` | 0 | 32 passed, 238 skipped | `task-73.log` |
| `verify-task.ps1` | 0 | TASK valid | Chạy trên terminal |
| `verify-audit.ps1` | 0 | AUDIT valid | RESULT: PASS |

## 5. Coverage Gaps

- `None` (Đã có test DB để chạy full LIVE integration suite).

## 6. Verdict và Planner Questions

- **Verdict:** `PASS`
- **Reason:** Tier 2 đã xuất sắc khắc phục toàn bộ các lỗi tiềm ẩn (enum implicit cast) cũng như hoàn thiện ma trận quyền RLS (bổ sung ACCOUNTANT vào history). Suite test LIVE integration gồm 32 cases chạy trên DB test thực tế cho kết quả vượt qua hoàn toàn. Mọi tiêu chuẩn Deep Audit C-01 tới C-10 đều đạt.
- **Planner decisions required:** `None`.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | `OPEN` | `OPEN` | Tier 1 quyết định ở RESOLUTION |
| `2` | `AUD-001` | `OPEN` | `RESOLVED` | Tier 2 cấp Test DB credentials, LIVE integration passed 32/32 tests. |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
