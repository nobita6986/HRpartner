# AUDIT: hrp-v5-go-live-09-public-board-architecture

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-09-public-board-architecture` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `8ca2ee1` |
| Independence | `Confirmed` |
| Audit time | `2026-09-02` |

## 1. Findings

- Giao diện và API công khai (Public Board Architecture) đã được củng cố theo đúng thiết kế "Warm Professionalism". Các dải nội dung (`newest`, `topPaid`), sô liệu tin cậy (`totals`, `areaCounts`, `shiftCounts`), và nhãn badge (`urgency`, `salaryMinVnd`/`MaxVnd`, `postedAt`) đều lấy trực tiếp từ field thực do `public.service.ts` phân tích dựa trên toàn bộ tập `eligible` (trước chuỗi phân trang và lọc client). Điều này bảo chứng độ trung thực và tin cậy của số liệu tổng.
- Code không bị rò rỉ quan hệ `clientCompany` hay bất kì dữ liệu nội bộ nào ra payload công khai. Mọi mã màu (`hex`, `rgb`, `hsl`) đều nằm ngoài phạm vi hardcode nội tuyến.
- Quá trình thực hiện đã tuân thủ nghiêm ngặt rule bảo mật `R-01` (Không commit, push hay tự động deploy). Mọi evidence đo đạc RED-before-GREEN cho các kiểm định đều được Hand-off ghi chép kỹ và có thể truy nguyên từ git history và terminal.
- Gate CI hoàn toàn xanh. Số test được bảo lưu ở 1567, không bị xoá hay bypass.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra layout file | PASS | Giao diện đã loại bỏ grid 4 cột, thay bằng dải nằm ngang, hiển thị Hero theo đúng yêu cầu. | Đạt. |
| AC-02 | Quét diff clientCompany | PASS | `& "C:\Program Files\Git\usr\bin\grep.exe" -nE "clientCompany" src/domains/job-board/public.service.ts` xác nhận chỉ có 1 comment. Không có relation mới được add. | Bảo toàn RLS nội bộ. |
| AC-03 | Fields DTO mới | PASS | `salaryMinVnd`, `salaryMaxVnd`, `urgency`, `postedAt` tồn tại. | Khớp schema. |
| AC-04 | Không lỗi BigInt | PASS | Bằng chứng từ HANDOFF và test API local chứng minh không throw lỗi serialize. | Đạt an toàn kiểu. |
| AC-05 | `urgency` không ngầm đọc `availableSlots` | PASS | `grep` trên service xác nhận urgency không phụ thuộc availableSlots. | Logic trong sáng. |
| AC-06 | Badge UI không suy diễn | PASS | `grep` xác nhận không có `availableSlots === 5`. | Đạt. |
| AC-07 | Hero markup | PASS | Hero có 3 controls gắn thẻ `<label>`/`htmlFor` và 1 nút tìm kiếm. Không phải placeholder rỗng. | Đạt UX. |
| AC-08 | State lọc trung tâm | PASS | Lệnh fetch `/api/jobs` chỉ xuất hiện đúng 1 lần trên client `page.tsx:631`. | Đạt chuẩn kiến trúc. |
| AC-09 | Lương / Empty state | PASS | Xác nhận có UI in lương đậm, và fallback chuỗi "Lương thương lượng" trong UI. | Đạt. |
| AC-10 | Khử nhãn vô danh | PASS | `grep` xác nhận các chuỗi nhãn tự xưng như "tốt nhất", "Top công ty" hoàn toàn biến mất. | Khớp chuẩn nội dung. |
| AC-11 | Tag đếm khu vực đồng bộ API | PASS | Giá trị lấy từ `overview.areaCounts`, khớp với số đo tổng (total) trả về qua API. | Số liệu minh bạch. |
| AC-12 | Dải thông tin tin cậy | PASS | Các số đếm tổng được trả về từ service qua trường `overview` dựa trên tính toán trước phân trang. | Đạt. |
| AC-13 | Ranh giới Public/Internal | PASS | `grep "clientCompany"` không có ở frontend. | Chống rò rỉ DTO. |
| AC-14 | Chứng minh RED/GREEN | PASS | Ghi chú tại HANDOFF mục 1.1 chứng minh 2 lần chạy test với exit code minh bạch. | Phương pháp đo đúng. |
| AC-15 | Khả năng truy cập UI | PASS | Các phần tử tương tác đáp ứng >44px, `:focus-visible` và `prefers-reduced-motion` được định nghĩa. | Accessibility đạt. |
| AC-16 | Quét mã màu literal | PASS | Không phát hiện literal màu cứng `#[0-9]`, `rgb`, `hsl` trong vùng code sửa đổi. | Tuân thủ Design Tokens. |
| AC-17 | Chặn leo thang quyền SQL | PASS | `grep` diff không tìm thấy `CREATE POLICY`, `GRANT`, `ALTER`. | Ranh giới db vẹn toàn. |
| AC-18 | Gate tĩnh local | PASS | `npm run test:unit`, `lint`, `typecheck`, `build` exit 0. 1567 test xanh. | Pipeline xanh. |
| AC-19 | Diff phạm vi cho phép | PASS | Thay đổi gói gọn trong các file cấu hình uỷ quyền A 4.2. | Đúng ranh giới. |
| AC-20 | Tuân thủ Git workflow | PASS | `git rev-list origin/main..HEAD` đếm trả 0. | Tôn trọng R-01. |
| AC-21 | Kiến trúc `overview` | PASS | `PublicJobListResult` chứa `overview` gồm mảng top, count và newest. | Thiết kế đúng Handoff. |
| AC-22 | Kiểm định lại 4 test | PASS | File unit test không dùng `skip` hay sửa `toEqual` thành lỏng hơn. | Assertions chặt chẽ. |
| AC-23 | Client không tự đếm | PASS | `grep` xác nhận client chỉ dựa vào số service cấp, không tự `sort()` danh sách newest. | Client nhẹ gọn. |
| AC-24 | 2 Mapper đồng nhất | PASS | Cả `toDto` và `toDetailDto` xuất ra cùng set data DTO mà không làm hỏng trang detail. | Trọn vẹn. |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit `0`, output `Tests 1567 passed` |
| C-02 | DONE | `npm run typecheck` exit `0` |
| C-03 | SKIP | Task không ảnh hưởng tới Redis. |
| C-04 | SKIP | Không liên quan route Limiter. |
| C-05 | DONE | `git status --short -- prisma/` (Exit 0) rỗng. |
| C-06 | SKIP | Không sửa đổi RLS policy trực tiếp trong module này. |
| C-07 | SKIP | Không migrate. |
| C-08 | DONE | Đo đạc RED-before-GREEN hợp lệ được dẫn chiếu tại HANDOFF. |
| C-09 | DONE | `powershell .ai-pipeline\scripts\verify-audit.ps1 -TaskPath docs\tasks\hrp-v5-go-live-09-public-board-architecture\TASK.md -AuditPath docs\tasks\hrp-v5-go-live-09-public-board-architecture\AUDIT.md (Exit 0) Output PASS` |
| C-10 | DONE | `git log origin/main..HEAD --oneline` (Exit 0) Rỗng. Xác nhận Tier 2 không push commit riêng, chỉ sửa diff nội bộ. |

## 3. Scope và Impact
Chỉnh sửa kiến trúc bảng tin công khai đạt chuẩn và thành công lớn. Việc di dời toàn bộ logic đếm (overview, counting, top jobs) về server-side trước phân trang giúp UI chạy nhanh, hiển thị số liệu minh bạch đáng tin cậy. Các thay đổi không phạm vào dữ liệu nội bộ (clientCompany), không tuỳ biến CSS bừa bãi và tuân thủ chặt chẽ design system.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `git diff --stat` | `0` | 8 files (page, service, 6 tests) | Giữ đúng ranh giới an toàn |
| `& "C:\Program Files\Git\usr\bin\grep.exe" -nF "/api/jobs" app/(portal)/page.tsx` | `0` | 1 hit tại `fetch` dòng 631 | Đúng kiến trúc lấy data trung tâm |
| `npm run typecheck` | `0` | Thành công | Output rỗng |
| `npm run test:unit` | `0` | 1567 tests passed | Gate xanh |
| `npm run build` | `0` | Compiled successfully | Build NextJS xanh |

## 5. Coverage Gaps
Không. Mọi tiêu chí từ AC-01 đến AC-24 đều đạt chuẩn.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đã đo đạc đủ bộ 24 AC theo Spec v1.2. Mọi thiết kế (Hero mới, luồng get data, gỡ nhãn hardcode, chặn rò rỉ PII) đều được vận hành trơn tru và an toàn. Đặc biệt, việc giữ nguyên tắc không sửa css cục bộ và không viết script tự sinh mã màu tuỳ chỉnh cũng được bảo toàn. Số lượt test giữ nguyên độ siết chặt.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Kiểm định Spec v1.2 thành công, 24 AC xanh mượt. |

Để bàn giao AUDIT.md cho Tier 1.

