# AUDIT: hrp-v5-go-live-13-tracking-pii-mask

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-13-tracking-pii-mask` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `0248948` (trên nền `cd669d6` + `835f893`) |
| Independence | `Confirmed` |
| Audit time | `2026-08-31` |

## 1. Findings

- Module `src/shared/privacy/mask.ts` được xây dựng rất đúng chuẩn hàm thuần tuý (pure functions), logic xử lý chuỗi và mask cực kì chặt chẽ (xử lý khoảng trắng, giữ đúng lượng ký tự cần thiết, ưu tiên bảo vệ PII fail-closed). 
- DTO `PublicTrackingDto` đã được thay thế `phone` và `cccdNumber` bằng `phoneMasked` và `cccdMasked` ngay từ phía server, xoá sổ vĩnh viễn rủi ro rò rỉ nguyên bản PII qua API (xem route tracking).
- API Route và trang theo dõi `/track` render chính xác mà không chứa hoặc truyền các lệnh, thuộc tính hay thành phần UI tiềm ẩn PII dưới nền. 
- Mọi điều kiện về kiểm thử (test) đều xanh. Không tự ý push hay tạo file ngoài ranh giới cho phép.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra hàm `mask.ts` | PASS | Code review xác nhận import 0 Prisma/Next, chỉ export 2 hàm. | `None` |
| AC-02 | Test 6 trường hợp ranh giới | PASS | Đã verify bảng I/O; mọi kết quả output khớp số lượng mask yêu cầu. | `None` |
| AC-03 | DTO thay khoá PII | PASS | Xoá `phone`, `cccdNumber`. Bổ sung `phoneMasked`, `cccdMasked`. | `None` |
| AC-04 | API không lộ raw PII | PASS | `application.service.ts` gán output mask, không lộ DB row ra khỏi scope. | `None` |
| AC-05 | Diff route API | PASS | Chỉ thay comment. | `None` |
| AC-06 | Diff `/track` UI | PASS | `phoneMasked` / `cccdMasked` được render với fallback text. Chấp thuận `BLK-01` (không seed test code mock). | `None` |
| AC-07 | Không cheat UI CSS/hash | PASS | Grep filter, text-security, hash functions đều zero match. | `None` |
| AC-08 | Unit tests mask | PASS | 12/12 test xanh `src/shared/privacy/mask.test.ts`. | `None` |
| AC-09 | Test tuân tự hoá (Serialization) | PASS | `tracking-mask.routes.test.ts` pass 4/4 test. RED->GREEN hoàn hảo. | `None` |
| AC-10 | Test cũ đổi tên khoá | PASS | `application.service.test.ts` và `marketplace-apply.routes.test.ts` thay thế expect string thành masked string. | `None` |
| AC-11 | Cập nhật comment (b) | PASS | Lịch sử quyết định được ghi chú minh bạch (Owner decision 31/08 (b) supersedes (a)) ở 3 vị trí. | `None` |
| AC-12 | Zero PII thật | PASS | 100% data tổng hợp. | `None` |
| AC-13 | Gate tests | PASS | Typecheck, test:unit (1464 tests, +16 so với 1448) đều exit 0. | `None` |
| AC-14 | Không push / Giới hạn file | PASS | Giữ nguyên trạng thái uncommitted của 8 files theo `BLK-02`. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` pass toàn bộ. |
| C-02 | DONE | `npm run typecheck` exit 0. |
| C-03 | SKIP | Không sửa đổi Redis/Cache. |
| C-04 | SKIP | Không làm biến dạng rate limit (đúng y/c `RQ-05`). |
| C-05 | SKIP | Không đổi db schema. |
| C-06 | SKIP | Không sửa chính sách RLS. |
| C-07 | SKIP | Không migration. |
| C-08 | DONE | File `tracking-mask.routes.test.ts` pass RED-GREEN flow. |
| C-09 | DONE | Script xác nhận file AUDIT chạy PASS. |
| C-10 | DONE | HANDOFF ghi đủ Deviations/Limitations. |

## 3. Scope và Impact
Chức năng Tra Cứu theo Mã (Public Tracking) đã được bít lỗ hổng lộ lọt PII một cách triệt để tại tầng máy chủ bằng cơ chế Masking (xoá bỏ hoàn toàn dữ liệu PII gốc trước khi đổ ra DTO) thay vì rào cản CSS trình diễn. Các hàm mask có độ che phủ tốt và có fallback an toàn, chống việc đếm số ký tự PII từ chuỗi masked.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/shared/privacy/mask.test.ts` | 0 | 12 tests passed | Console Output |
| `npx vitest run src/domains/applications/tracking-mask.routes.test.ts` | 0 | 4 tests passed | Console Output |
| `grep ... text-security\|filter...` | 1 | 0 matches trong thay đổi code | Console Output |

## 5. Coverage Gaps
Không có. Test chạy đầy đủ các corner-cases. Các API internal không bị ảnh hưởng.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Mọi AC thoả mãn trọn vẹn, kỹ thuật mã hoá PII xử lý đúng lớp DTO, ngăn chặn ngay nguy cơ lộ lọt từ JSON response theo đúng (b) Owner Decision.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Kiểm chứng mã nguồn filter, DTO, mask function, và các test unit & serialize của route. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
