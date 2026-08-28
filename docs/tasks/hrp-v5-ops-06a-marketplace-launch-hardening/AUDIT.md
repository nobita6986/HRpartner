# AUDIT: hrp-v5-ops-06a-marketplace-launch-hardening

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-ops-06a-marketplace-launch-hardening` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `3` |
| Audit round | `3` |
| Round opened by | `Owner Provision Env (Round 3)` |
| Round closes when | `verdict PASS` (Hiện tại: `FAIL`) |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `d9a1067` |
| Independence | `Confirmed (Lệnh test độc lập)` |
| Audit time | `2026-08-28` |

## 1. Findings

- Đã chạy LIVE integration lane (round 3) với kỳ vọng Owner đã cấp quyền cho Upstash Token mới.
- Tuy nhiên, bằng chứng thực thi thực tế vẫn tiếp tục trả về lỗi phân quyền từ Upstash: `UpstashError: NOPERM this user has no permissions to run the 'evalsha' command or its subcommand` và `NOPERM` cho lệnh `keys`.
- Vì token không có quyền chạy script, module `@upstash/ratelimit` không thể hoạt động, test `AC-01` tiếp tục FAIL. Các test trên LIVE DB (AC-04, 05, 08) vẫn giữ nguyên trạng thái PASS 100%.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Upstash integration & fallback 503 | FAIL | Lỗi thực tế từ Upstash: `UpstashError: NOPERM this user has no permissions to run the 'evalsha' command`. | `Upstash Token Invalid/Restricted` |
| AC-02 | Route limit matrix (200/429/503) | PASS | Unit tests. | `None` |
| AC-03 | Tracking buckets (IP/code) | FAIL | Blocked theo AC-01 (Upstash provider throw). | `Blocked by AC-01` |
| AC-04 | Apply thresholds & zero write | PASS | LIVE TEST DB counts nguyên vẹn. | `None` |
| AC-05 | Payload size limits (413/415/422) | PASS | Route trả về đúng 413/415/422. | `None` |
| AC-06 | Public canonical submit / No CV | PASS | Component/contract tests. | `None` |
| AC-07 | Legacy route 410 & zero call | PASS | Static/route tests xác minh. | `None` |
| AC-08 | MP-2 replays pass unchanged | PASS | Replay đúng chuẩn, tạo 1 row. | `None` |
| AC-09 | Env docs, no secret leaked | PASS | Quét source/diff không chứa secrets. | `None` |
| AC-10 | Tier 3 LIVE on DB+Redis | FAIL | Thực thi thật nhưng Upstash SDK throw do token thiếu quyền (Vẫn bị NOPERM). | `NOPERM evalsha/keys` |
| AC-11 | Quality gates | PASS | `tsc`, `test:unit`, `build` xanh. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1291 passed). |
| C-02 | DONE | `npm run build` exit 0. |
| C-03 | FAIL | Test tích hợp redis đã được chạy. (Failed do token). |
| C-04 | FAIL | Phản hồi rate limit đã chạy. (Failed do token). |
| C-05 | DONE | Route 410 xử lý chính xác (unit passed). |
| C-06 | DONE | Behavior API internal admin/HR không ảnh hưởng. |
| C-07 | DONE | Lệnh `git diff --check` sạch, không rác. |
| C-08 | DONE | Các logic fallback callback URL an toàn. |
| C-09 | DONE | `verify-task.ps1` exit 0. |
| C-10 | DONE | File handoff đã được đọc. |

## 3. Scope và Impact

- Code integration với LIVE TEST DB (AC-04/05/08) vẫn hoàn toàn xanh. Bug của Tier 2 trên route test đã được Tier 3 sửa và không phát sinh lỗi mới.
- Vấn đề hạ tầng Test Redis (NOPERM) vẫn chưa được giải quyết dứt điểm ở lần cung cấp Token này.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/domains/applications/live-integration.ops06a.test.ts` | 1 | FAIL 2 tests ở AC-01 do NOPERM (vẫn bị lỗi quyền). | Console Output |
| `npm run test:unit` | 0 | 1291 unit tests passed. | Console Output |

## 5. Coverage Gaps

- AC-01 tiếp tục bị gián đoạn do `UpstashError: NOPERM`. Việc đánh giá behavior của sliding window phân tán không thể hoàn thành.

## 6. Verdict và Planner Questions

- **Verdict:** FAIL
- **Reason:** Round 3 vẫn gặp lỗi `NOPERM evalsha` từ Upstash Redis. Bằng chứng thực thi xác nhận Token hiện tại (dù đã thay mới hay chưa) vẫn không có quyền `scripting` và `cleanup`. Theo nguyên tắc không mock evidence, test không thể đi tiếp. Yêu cầu Tier 1 (Planner) phân loại lỗi này (Provider/Config defect) và ra quyết định xử lý tiếp theo trước khi cho phép /code.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `BLOCKED` | `N/A` | `ENV_BLOCKED` | Khuyết Upstash TEST credentials. |
| `2` | `FAIL` | `BLOCKED` | `FAIL` | Upstash Token (NOPERM evalsha/keys). |
| `3` | `FAIL` | `FAIL` | `FAIL` | Vẫn gặp lỗi NOPERM evalsha/keys ở Round 3. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
