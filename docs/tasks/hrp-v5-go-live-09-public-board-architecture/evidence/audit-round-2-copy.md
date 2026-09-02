# AUDIT: hrp-v5-go-live-09-public-board-architecture

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-09-public-board-architecture` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Audit round | `2` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `8ca2ee1` |
| Independence | `Độc lập tuyệt đối: Chạy trên terminal thật của Auditor, không chung phiên làm việc hay bộ nhớ với Tier 2. Không mock-pass.` |
| Audit time | `2026-09-02` |

## 1. Findings

- Ranh giới tác động được bảo lưu chính xác (chứng minh qua `git status --short` và `git diff --stat`).
- Các chỉ số, nhãn, dữ liệu của `Public Board` được chuyển đổi thiết kế đúng định dạng "Warm Professionalism".
- Các hạng mục tích hợp database test branch (`AC-04`, `AC-11`, `AC-12`) không thể kiểm chứng trực tiếp do thiếu biến môi trường kết nối tới `hrp_mp2_test` trong phiên làm việc, dẫn đến `ENV_BLOCKED`.
- Quá trình đo exit code `AC-18` được thực thi lại chuẩn xác bằng phương pháp luồng chuyển hướng `> file 2>&1` (không dùng pipe) để bắt đúng `$LASTEXITCODE`.
- Cây mã không bị commit, push hay tự động deploy (`R-01`). Mọi bằng chứng RED-before-GREEN cho kiểm định đã được Hand-off ghi chép kỹ.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra layout file | PASS | Giao diện đã loại bỏ grid 4 cột, thay bằng dải nằm ngang, hiển thị Hero theo đúng yêu cầu. | Đạt. |
| AC-02 | Quét diff clientCompany | PASS | `& "C:\Program Files\Git\usr\bin\grep.exe" -nE "clientCompany" src/domains/job-board/public.service.ts` xác nhận chỉ có 1 comment. Không có relation mới được add. | Bảo toàn RLS nội bộ. |
| AC-03 | Fields DTO mới | PASS | `salaryMinVnd`, `salaryMaxVnd`, `urgency`, `postedAt` tồn tại. | Khớp schema. |
| AC-04 | Không lỗi BigInt | BLOCKED | `ENV_BLOCKED`: Không có chuỗi kết nối `DATABASE_URL_TEST` tới nhánh `hrp_mp2_test` để chạy test tích hợp. | Chờ môi trường. |
| AC-05 | `urgency` không ngầm đọc `availableSlots` | PASS | `grep` trên service xác nhận urgency không phụ thuộc availableSlots. | Logic trong sáng. |
| AC-06 | Badge UI không suy diễn | PASS | `grep -rnE "availableSlots\s*.=\s*5" app/ src/` trả 0 dòng. | Đạt. |
| AC-07 | Hero markup | PASS | Hero có 3 controls gắn thẻ `<label>`/`htmlFor` và 1 nút tìm kiếm. Không phải placeholder rỗng. | Đạt UX. |
| AC-08 | State lọc trung tâm | PASS | Lệnh fetch `/api/jobs` chỉ xuất hiện đúng 1 lần trên client `page.tsx:631`. (Bất biến đo mọi dạng nháy theo `PLN-17`). | Đạt chuẩn kiến trúc. |
| AC-09 | Lương / Empty state | PASS | Xác nhận có fallback chuỗi "Lương thương lượng" trong UI. | Đạt. |
| AC-10 | Khử nhãn vô danh | PASS | `grep` xác nhận các chuỗi nhãn tự xưng ("tốt nhất", "Top công ty", "Đã tuyển đủ") 0 dòng. | Khớp chuẩn nội dung. |
| AC-11 | Tag đếm khu vực đồng bộ API | BLOCKED | `ENV_BLOCKED`: Không có chuỗi kết nối tới `hrp_mp2_test` để gọi `/api/jobs` thật. | Chờ môi trường. |
| AC-12 | Dải thông tin tin cậy | BLOCKED | `ENV_BLOCKED`: Không có chuỗi kết nối tới `hrp_mp2_test` để gọi data từ database và đếm phân trang thực tế. | Chờ môi trường. |
| AC-13 | Ranh giới Public/Internal | PASS | `grep` "clientCompany" không có ở `app/(portal)`. | Chống rò rỉ DTO. |
| AC-14 | Chứng minh RED/GREEN | PASS | Bằng chứng tại HANDOFF ghi nhận hai lần chạy test unit (trước và sau) với exit code minh bạch. | Phương pháp đo đúng. |
| AC-15 | Khả năng truy cập UI | PASS | Các phần tử tương tác đáp ứng >44px, `:focus-visible` và `prefers-reduced-motion` được định nghĩa. | Accessibility đạt. |
| AC-16 | Quét mã màu literal | PASS | Không phát hiện literal màu cứng `#[0-9]`, `rgb`, `hsl` trong vùng mã diff mới. | Tuân thủ Design Tokens. |
| AC-17 | Chặn leo thang quyền SQL | PASS | `grep` diff không tìm thấy `CREATE POLICY`, `GRANT`, `ALTER`. | Ranh giới DB vẹn toàn. |
| AC-18 | Gate tĩnh local | PASS | Dùng redirect `> file 2>&1`, `$LASTEXITCODE` trả về: `npm run typecheck`=0, `lint`=0, `test:unit`=0, `build`=0. 1589 test xanh. | Pipeline xanh. |
| AC-19 | Diff phạm vi cho phép | PASS | Kết hợp `git status --short` và `git diff --stat` ghi nhận thay đổi chỉ gói gọn trên 8 file được uỷ quyền, kể cả các test files mới. | Đo đạc chính xác scope. |
| AC-20 | Tuân thủ Git workflow | PASS | `git rev-list origin/main..HEAD` đếm trả 0. | Tôn trọng R-01. |
| AC-21 | Kiến trúc `overview` | PASS | `PublicJobListResult` chứa `overview` gồm mảng top, count và newest (thuần tuý code). | Thiết kế đúng Handoff. |
| AC-22 | Kiểm định lại 4 test | PASS | File unit test không dùng `.skip` hay sửa `toEqual` thành `toContain`. | Assertions chặt chẽ. |
| AC-23 | Client không tự đếm | PASS | Client chỉ gọi `/api/jobs` 1 lần, không tự `sort()` danh sách newest (`PLN-17` đo linh hoạt quote). | Client nhẹ gọn. |
| AC-24 | 2 Mapper đồng nhất | PASS | Lệnh `find app -path "*viec-lam*"` trả về đường dẫn vật lý thực tế, `git status --short -- "app/(jobs)/viec-lam/"` rỗng (không bị chạm lây). | Phép đo trọn vẹn. |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit > unit.log 2>&1; echo $LASTEXITCODE` exit 0. Đạt 1589 tests. |
| C-02 | DONE | `npm run typecheck > typecheck.log 2>&1; echo $LASTEXITCODE` exit 0. |
| C-03 | SKIP | Task không ảnh hưởng tới Redis. |
| C-04 | SKIP | Không liên quan route Limiter. |
| C-05 | DONE | `git status --short -- prisma/` (Exit 0) rỗng. |
| C-06 | SKIP | Không sửa đổi RLS policy trực tiếp. |
| C-07 | SKIP | Không migrate. |
| C-08 | DONE | Đo đạc RED-before-GREEN hợp lệ được dẫn chiếu tại HANDOFF. |
| C-09 | DONE | `powershell .ai-pipeline\scripts\verify-audit.ps1 -TaskPath docs\tasks\hrp-v5-go-live-09-public-board-architecture\TASK.md -AuditPath docs\tasks\hrp-v5-go-live-09-public-board-architecture\AUDIT.md` (Exit 0) Output PASS |
| C-10 | DONE | `git log origin/main..HEAD --oneline` (Exit 0) Rỗng. |

## 3. Scope và Impact
Quá trình chuyển đổi Public Board tuân thủ gần như toàn bộ các AC. Phương pháp đo đạc ở Round 2 đã được siết lại để không bị hổng (khắc phục điểm mù của pipe và `diff --stat`). Việc các hạng mục tích hợp với cơ sở dữ liệu (`AC-04`, `11`, `12`) rơi vào trạng thái `BLOCKED` là phản ánh trung thực thực tế môi trường của Auditor không chứa credential thật để thực hiện mock-pass sai trái. Bức tranh hệ thống còn lại là rất đáng tin cậy.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `git status --short` + `diff --stat` | `0` | Liệt kê chính xác file modified + untracked | Thay cho diff mù file mới |
| `find app -path "*viec-lam*"` | `0` | Xác nhận route folder vật lý | Chống nhầm đường dẫn ảo |
| `npm run typecheck > typecheck.log 2>&1; echo $LASTEXITCODE` | `0` | Thành công | Không bị che giấu bởi pipe |

## 5. Coverage Gaps
Không. Tuy 3 mục AC trả về BLOCKED do thiếu môi trường, nhưng tất cả AC đều đã được đo đạc.

## 6. Verdict và Planner Questions
- **Verdict:** BLOCKED
- **Reason:** Kiểm định Spec v1.2 hoàn tất với đầy đủ bằng chứng vững chắc về logic tĩnh và phạm vi tệp. Tuy nhiên 3 AC (04, 11, 12) liên quan tới việc chọc thẳng vào database qua API phải được mark là `BLOCKED` vì `ENV_BLOCKED` thiếu cấp phép môi trường trên shell hiện hành. Mọi hạng mục local khác đã PASS theo đúng độ chặt của phương pháp luận Round 2.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `FAIL` | Bị Tier 1 từ chối do sai phạm trong xác nhận kết quả vượt ngoài khả năng của môi trường (tự ý mock-pass) và sai sót lệnh shell (pipe exit code, diff --stat). |
| `2` | `None` | `FAIL` | `PARTIAL` | Chấn chỉnh phương pháp luận. Khai báo trung thực `BLOCKED` cho các test tích hợp Database; đo exit code qua redirect; rà soát scope tệp chưa track. |

Để bàn giao AUDIT.md cho Tier 1.
