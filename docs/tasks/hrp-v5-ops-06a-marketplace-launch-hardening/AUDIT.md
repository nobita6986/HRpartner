# AUDIT: hrp-v5-ops-06a-marketplace-launch-hardening

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-ops-06a-marketplace-launch-hardening` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `4` |
| Audit round | `4` |
| Round opened by | `Owner` |
| Round closes when | `verdict PASS` (Hiện tại: `FAIL`) |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `d9a1067` |
| Independence | `Confirmed (Lệnh test độc lập)` |
| Audit time | `2026-08-28` |

## 1. Findings

- Đã chạy LIVE integration lane (round 4) với token Upstash do Owner cung cấp từ trước.
- Tuy nhiên, hệ thống vẫn tiếp tục báo lỗi NOPERM. Lần này, theo logic phân loại lỗi (Preflight capability) mới được Tier 2 cập nhật trong file `live-integration.ops06a.test.ts`, lỗi đã được test suite chủ động bắt và phân loại rõ ràng là **PROVIDER/CONFIG DEFECT**, hoàn toàn không phải do lỗi code (Code Defect).
- Do token không có quyền chạy Lua scripting (`EVAL`), test `AC-01` bị FAIL. Các test trên LIVE DB (AC-04, 05, 08) vẫn giữ nguyên trạng thái PASS 100%.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Upstash integration & fallback 503 | FAIL | Error: PROVIDER/CONFIG DEFECT — token Redis TEST KHÔNG có quyền scripting (EVAL/EVALSHA). | `PROVIDER/CONFIG DEFECT` |
| AC-02 | Route limit matrix (200/429/503) | PASS | Unit tests. | `None` |
| AC-03 | Tracking buckets (IP/code) | FAIL | Blocked theo AC-01 (Upstash provider throw). | `Blocked by AC-01` |
| AC-04 | Apply thresholds & zero write | PASS | LIVE TEST DB counts nguyên vẹn. | `None` |
| AC-05 | Payload size limits (413/415/422) | PASS | Route trả về đúng 413/415/422. | `None` |
| AC-06 | Public canonical submit / No CV | PASS | Component/contract tests. | `None` |
| AC-07 | Legacy route 410 & zero call | PASS | Static/route tests xác minh. | `None` |
| AC-08 | MP-2 replays pass unchanged | PASS | Replay đúng chuẩn, tạo 1 row. | `None` |
| AC-09 | Env docs, no secret leaked | PASS | Quét source/diff không chứa secrets. | `None` |
| AC-10 | Tier 3 LIVE on DB+Redis | FAIL | Preflight phân loại: PROVIDER/CONFIG DEFECT. | `NOPERM evalsha/keys` |
| AC-11 | Quality gates | PASS | `tsc`, `test:unit`, `build` xanh. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1291 passed). |
| C-02 | DONE | `npm run build` exit 0. |
| C-03 | FAIL | Test tích hợp redis đã được chạy. (Failed do token - PROVIDER DEFECT). |
| C-04 | FAIL | Phản hồi rate limit đã chạy. (Failed do token - PROVIDER DEFECT). |
| C-05 | DONE | Route 410 xử lý chính xác (unit passed). |
| C-06 | DONE | Behavior API internal admin/HR không ảnh hưởng. |
| C-07 | DONE | Lệnh `git diff --check` sạch, không rác. |
| C-08 | DONE | Các logic fallback callback URL an toàn. |
| C-09 | DONE | `verify-task.ps1` exit 0. |
| C-10 | DONE | File handoff đã được đọc. |

## 3. Scope và Impact

- Code implementation hoàn toàn đáp ứng yêu cầu và ổn định. AC-04/05/08 pass chứng minh DB không bị ảnh hưởng. Khâu dọn dẹp raw provider error trong production code cũng đã được Tier 2 thực hiện.
- Block duy nhất hoàn toàn nằm ở khâu config cơ sở hạ tầng (Test Redis Token).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/domains/applications/live-integration.ops06a.test.ts` | 1 | FAIL ở bước PREFLIGHT của AC-01 do PROVIDER DEFECT (lỗi quyền scripting). | Console Output |
| `npm run test:unit` | 0 | 1291 unit tests passed. | Console Output |

## 5. Coverage Gaps

- Việc xác minh behavior của sliding window phân tán không thể hoàn thành do Upstash Token thiếu quyền Scripting. 

## 6. Verdict và Planner Questions

- **Verdict:** FAIL
- **Reason:** Round 4 xác nhận lỗi là `PROVIDER/CONFIG DEFECT` thông qua cơ chế Preflight Capability mới của Tier 2 (không in raw error, bắt chính xác lỗi `NOPERM EVAL`). Do đây không phải là lỗi code, Tier 3 không thể thay đổi hay can thiệp. Yêu cầu Tier 1 hoặc Owner cung cấp 1 token chuẩn có quyền `EVAL/scripting`.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `BLOCKED` | `N/A` | `ENV_BLOCKED` | Khuyết Upstash TEST credentials. |
| `2` | `FAIL` | `BLOCKED` | `FAIL` | Upstash Token (NOPERM evalsha/keys). |
| `3` | `FAIL` | `FAIL` | `FAIL` | Vẫn gặp lỗi NOPERM evalsha/keys ở Round 3. |
| `4` | `FAIL` | `FAIL` | `FAIL` | PROVIDER/CONFIG DEFECT (Thiếu quyền Scripting). |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
