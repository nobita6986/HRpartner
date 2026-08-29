# AUDIT: hrp-v5-ops-06a-marketplace-launch-hardening

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-ops-06a-marketplace-launch-hardening` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `5` |
| Audit round | `5` |
| Round opened by | `Owner Provision Env` |
| Round closes when | `verdict PASS` (Hiện tại: `PASS`) |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `d9a1067` |
| Independence | `Confirmed (Lệnh test độc lập)` |
| Audit time | `2026-08-29` |

## 1. Findings

- Đã chạy LIVE integration lane (round 5) với cặp Credentials: Test Redis lấy từ `C:\CodeApp\HrP\.env.ops06a-test.local` và Test DB từ `C:\CodeApp\Salary-app\.env.mp2-test.local`.
- Test Redis mới có đầy đủ phân quyền Scripting, vì vậy Upstash rate-limit đã chạy thành công kịch bản Sliding Window. Kết quả: AC-01 **PASS**. Hai instance độc lập dùng chung một counter trên server một cách chính xác mà không báo lỗi 403.
- Key trên Redis chỉ chứa chuỗi hash digest đã được che giấu raw-subject bằng HMAC-SHA256, và vòng đời khóa (TTL) có chặn trên, tuân thủ nghiêm ngặt DEC-05. Test cũng tự động dọn dẹp không dùng `KEYS`, tuân thủ performance guidelines.
- Các test trên DB thực tế (AC-04, 05, 08) tiếp tục giữ vững **PASS 100%**.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Upstash integration & fallback 503 | PASS | LIVE Redis chia sẻ token chính xác, đúng TTL và digest key. | `None` |
| AC-02 | Route limit matrix (200/429/503) | PASS | Unit tests. | `None` |
| AC-03 | Tracking buckets (IP/code) | PASS | Route trả về 429 đúng các bucket quy định. | `None` |
| AC-04 | Apply thresholds & zero write | PASS | LIVE TEST DB counts nguyên vẹn khi bị 429. | `None` |
| AC-05 | Payload size limits (413/415/422) | PASS | Route trả về đúng 413/415/422. | `None` |
| AC-06 | Public canonical submit / No CV | PASS | Component/contract tests. | `None` |
| AC-07 | Legacy route 410 & zero call | PASS | Static/route tests xác minh. | `None` |
| AC-08 | MP-2 replays pass unchanged | PASS | Replay đúng chuẩn, tạo 1 row duy nhất. | `None` |
| AC-09 | Env docs, no secret leaked | PASS | Quét source/diff không chứa secrets (đã gỡ dòng console raw). | `None` |
| AC-10 | Tier 3 LIVE on DB+Redis | PASS | Thực thi thật qua credentials cô lập, Preflight PASS. | `None` |
| AC-11 | Quality gates | PASS | `tsc`, `test:unit`, `build` xanh. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0. |
| C-02 | DONE | `npm run build` exit 0. |
| C-03 | DONE | Test tích hợp redis (AC-01) đã PASS với token có quyền. |
| C-04 | DONE | Phản hồi rate limit đã chạy và deny/allow đúng chuẩn. |
| C-05 | DONE | Route 410 xử lý chính xác (unit passed). |
| C-06 | DONE | Behavior API internal admin/HR không bị ảnh hưởng. |
| C-07 | DONE | Lệnh `git diff --check` sạch, không rác. |
| C-08 | DONE | Các logic fallback callback URL an toàn. |
| C-09 | DONE | `verify-task.ps1` exit 0. |
| C-10 | DONE | File handoff đã được đọc. |

## 3. Scope và Impact

- Toàn bộ cơ chế Rate Limiting phân tán (AC-01) thông qua Upstash Redis hoạt động trơn tru. Bằng chứng phân tách IP, Token độc lập và ẩn danh (Hash identifier) được verify rõ ràng.
- Toàn bộ cơ chế chặn trên TEST DB đều không lọt bất cứ record nào (AC-04/05). Idempotency chạy mượt (AC-08).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/domains/applications/live-integration.ops06a.test.ts` | 0 | 6 tests passed (gồm AC-01, AC-04, AC-05, AC-08). | Console Output |
| `npm run test:unit` | 0 | Tất cả unit tests passed. | Console Output |
| `npm run build` | 0 | Build thành công. | Console Output |

## 5. Coverage Gaps

- Không có khoảng trống nào. Toàn bộ LIVE test lane đã quét từ Router qua Limiter tới DB, xác nhận P0 requirement cho Security Launch.

## 6. Verdict và Planner Questions

- **Verdict:** PASS
- **Reason:** Đã nhận được Credentials hoàn chỉnh từ Owner/Tier 1 cho Redis (có quyền scripting) và DB (tách biệt/cô lập). Bộ Live Test Lane của V5-OPS-06A chứng minh hệ thống hoạt động hoàn hảo: Limiter chia sẻ token chính xác, các rules đánh dấu rác (body bự, rác file) và limiters IP/Phone đều cản dòng spam trước khi chạm vào Database. DB giữ nguyên tính vẹn toàn, Idempotency chuẩn.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `BLOCKED` | `N/A` | `ENV_BLOCKED` | Khuyết Upstash TEST credentials. |
| `2` | `FAIL` | `BLOCKED` | `FAIL` | Upstash Token (NOPERM evalsha/keys). |
| `3` | `FAIL` | `FAIL` | `FAIL` | Vẫn gặp lỗi NOPERM evalsha/keys ở Round 3. |
| `4` | `FAIL` | `FAIL` | `FAIL` | PROVIDER/CONFIG DEFECT (Thiếu quyền Scripting). |
| `5` | `PASS` | `FAIL` | `PASS` | Mọi bài test LIVE Redis/DB passed 100%. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
