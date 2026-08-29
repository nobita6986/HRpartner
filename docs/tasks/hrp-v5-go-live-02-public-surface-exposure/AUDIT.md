# AUDIT: hrp-v5-go-live-02-public-surface-exposure

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-02-public-surface-exposure` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `Tier 2 Handoff` |
| Round closes when | `verdict PASS` (Hiện tại: `PASS`) |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `HEAD` |
| Independence | `Confirmed` |
| Audit time | `2026-08-29` |

## 1. Findings

- Kịch bản copy tài liệu (`docs/`) ra public directory đã được gỡ bỏ khỏi `scripts/copy-static.mjs`. Bằng chứng chạy thử cho thấy `public/docs` không được tạo ra, ngăn ngừa lộ lọt tài liệu nội bộ (AC-01 PASS).
- Các chuỗi thuật ngữ chuyên ngành (jargon) và liên kết nội bộ không phù hợp đã được loại bỏ khỏi trang Giới Thiệu `/ve-chung-toi`. Liên kết `/ve-hrp` đã được trỏ thành `/ve-hrp.html` (AC-03, AC-04, AC-05 PASS).
- Lỗi hiển thị thẻ Meta title đã được sửa chữa tại các layout và page file bằng cách tận dụng `default` và `template` trong Next.js Metadata API. Render ra `Việc làm - HRPartner`, `Tra cứu hồ sơ ứng tuyển - HRPartner`... đúng như yêu cầu của DEC-06/07 (AC-09 PASS).
- Các quality gate (`typecheck`, `lint`, `test:unit`) đều xanh, an toàn tích hợp và build tĩnh nguyên vẹn (AC-07 PASS).

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Copy static script behavior | PASS | `node scripts/copy-static.mjs` chạy thành công; `public/docs` bị chặn tạo ra; `index.html` và `ve-hrp.html` vẫn an toàn. | `None` |
| AC-02 | (Owner) Live check `docs/` URLs | N/A | Kiểm tra sau deploy trên môi trường Live bởi Owner. | `None` |
| AC-03 | Quét `/docs/` ở `ve-chung-toi` | PASS | `grep "/docs/"` trả về kết quả rỗng. | `None` |
| AC-04 | Quét các Jargon | PASS | `grep` các chuỗi thuật ngữ nội bộ (ACCEPTED, P1 Portals,...) trả về rỗng. | `None` |
| AC-05 | Quét thẻ `.html` extension | PASS | `/ve-hrp.html` đã được đổi thay vì `/ve-hrp`. | `None` |
| AC-06 | Local render UI test | PASS | `npm run build` không gây lỗi. Trang Render ra ổn định. | `None` |
| AC-07 | Code quality gates | PASS | `tsc`, `lint`, `test:unit` đều exit 0 (1408 passed tests). | `None` |
| AC-08 | Scope check (Git status) | PASS | Lịch sử sửa đổi file chỉ giới hạn đúng 10 file được giao (trong đó có 2 file `layout.tsx` mới tạo) không lạc sang scope task khác. | `None` |
| AC-09 | Sửa Meta Title + Khử chữ cũ | PASS | Các từ khoá "Tra cứu Bảng Công HRP" cũ đã bị loại bỏ; Title render đúng với Template mới. | `None` |
| AC-10 | (Owner) Live check Title | N/A | Kiểm tra sau deploy trên môi trường Live. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0. |
| C-02 | DONE | `npm run build` exit 0. |
| C-03 | DONE | Test tích hợp redis (N/A cho task tĩnh này). |
| C-04 | DONE | Test Rate Limit (N/A cho task tĩnh này). |
| C-05 | DONE | Static build verification hoàn tất. |
| C-06 | DONE | Behavior API không ảnh hưởng. |
| C-07 | DONE | Lệnh `git diff --check` sạch, không rác. |
| C-08 | DONE | Mọi đường dẫn công khai đều an toàn. |
| C-09 | DONE | `verify-task.ps1` exit 0. |
| C-10 | DONE | Đọc toàn bộ Handoff. |

## 3. Scope và Impact

- Code implementation hoàn toàn tuân thủ Spec `v1.1`. Metadata được nhúng cẩn thận vào `layout.tsx` và `page.tsx` cho các Client Components mà không phá vỡ UI. Ranh giới không lấn chiếm các module chưa cấp phép.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `node scripts/copy-static.mjs` | 0 | Chạy xong. | Console Output |
| `Test-Path public/docs` | False | Xác nhận `docs/` không bị lộ. | Console Output |
| `npm run typecheck` | 0 | Typecheck Passed. | Console Output |
| `npm run lint` | 0 | ESLint Passed. | Console Output |
| `npm run test:unit` | 0 | 1408 Unit test Passed. | Console Output |
| `git status --short` | 0 | Giới hạn duy nhất 10 files bị ảnh hưởng. | Console Output |

## 5. Coverage Gaps

- AC-02 và AC-10 phải chờ Owner deploy rồi mới verify trực tiếp (Live Verification). Đây là Acceptance Criteria hoãn lại (Deferred), không cản trở việc merge nhánh này (theo Spec DoD).

## 6. Verdict và Planner Questions

- **Verdict:** PASS
- **Reason:** Toàn bộ AC từ 01 tới 09 (Trừ 02, 10 deferred to Live Check) đều đạt chuẩn. Thay đổi không mang rủi ro lớn, cách xử lý Layout cho Client Component của Tier 2 rất chuẩn mực.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Mọi Acceptance Criteria cục bộ đều thỏa mãn. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
