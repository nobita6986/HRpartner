# Tier 0 review — TASK A v1.0 và tách plan

Ngày 10/09/2026. Reviewed HEAD: `eea6264`.

**Verdict: REVISION_REQUIRED — sửa contract giới hạn, không mở lại quyết định sản phẩm.** Chấp thuận outcome A1–A16 và lane STANDARD/FOCUSED. Chưa giao Tier 2 từ bản DRAFT hiện tại.

## 1. Sửa ranh giới hai plan

`plan-overview.md` và `skeleton-B-C-D.md` vẫn đưa HomepageSettings/schema/admin write permission vào B của Plan UI, và D.B editor vào chuỗi UI. Chuyển toàn bộ phần này sang Plan Admin V6; UI B chỉ sở hữu controls/view-model, query integration sẵn có và trạng thái INTEGRATION_PENDING cho chức năng backend chưa có. Không mở public service/API mới trong UI chỉ vì quyết định B4 lịch sử.

D của Plan UI chỉ là detail UI; D.B editor phải mapping sang AV tương ứng, không giữ hai task trùng ownership. Bổ sung settings/query vào AV rõ ràng. Không mặc định D.A là điều kiện để **lập plan** Admin V6: có thể khảo sát/khóa contract ngay, thời điểm thi công theo ưu tiên V6 và một stream. Không cần viết full TASK B/C/D ngay; sửa skeleton/mapping đủ rõ là được.

## 2. Đóng mâu thuẫn scope container của A

RQ-01/AC-01 yêu cầu Navbar, Hero, BestJobs, Areas, Recruiting, CTV, Footer đều 1200px nhưng non-goals cấm đổi Hero/Areas/Referral/Footer; OBR-02 thiếu Areas/Referral và hạn chế Hero/page vào A16. Cho phép sửa **container/padding thuần** ở các file tương ứng, đồng bộ §0/§1.2/STEP/OBR-02. Không mở thay nội dung/logic hoặc restyle các section ngoài A. Trace RQ-01 tới bước thực sự bao phủ toàn bộ container, không chỉ STEP-02 Navbar.

## 3. Baseline và artifact ownership

STEP-01 yêu cầu HEAD phải bằng `4d9a633`, nhưng HEAD kiểm tra là `eea6264`. Giữ `4d9a633` làm source reference UI-03, phân biệt authorization commit với execution HEAD thực đo ngay trước sửa source; không checkout ngược hoặc tái tạo baseline sau khi sửa code. Capture unit failure set trước sửa để so cuối round.

Tier 1 đặt contract canonical `docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md` và đồng bộ link; không giao Tier 2 tạo/copy/chỉnh TASK như §4.2/OBR-02 đang ghi. Tier 2 sở hữu HANDOFF/evidence và source/test được phép. Khóa một task root cho evidence. Thu hẹp quyền ghi toàn bộ thư mục plan cha, tránh Tier 2 sửa các plan/approval khác.

OBR-01 không được cấm mọi path mới không nằm baseline-manifest: file evidence/HANDOFF mới hợp lệ sẽ không có ở baseline. So delta tracked + untracked với baseline và allowlist create/edit, giữ nguyên dirty files ngoài task; new path chỉ được tạo đúng allowlist.

## 4. Sửa gate cho chạy thật và đúng scope

Đã chạy `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/TASK-A.md`: exit 1; A-05 FAIL vì RQ-11 không có direct RQ → STEP → AC traceability row (range STEP-02..STEP-08 không được parser nhận). Khai step IDs tường minh; tương tự rà các range khác. T-05 WARN cho AC-03/05/06/07/09/11/17: ghi manual source review rõ file/điểm kiểm/evidence, không chỉ tên phương pháp chung.

Lệnh rg dùng `\|` đang tìm ký tự pipe literal thay vì alternatives. Viết command PowerShell chạy được, dùng pattern quoted với `|` hoặc nhiều `-e`. Chốt exit 1 = không có match, không nhầm thành command failure. AC-10 chỉ quét Recruiting để không bắt nhầm copy CTV ngoài scope; AC-15 không bắt cả repo phải sạch `companyName`, chỉ kiểm changed public surface và asset references thích hợp. Logo `/logo.png` hiện hữu không thuộc pack homepage nhưng vẫn hợp lệ. Sửa số AC được dẫn ở Required gates cho khớp §6.

## 5. Khóa thông số có thể triển khai

RQ-04 vừa đòi monogram 64px vừa đặt trong wrapper 64px border-box có p-2: không thể giữ cả nội dung 64px và outer 64px mà không tràn. Chốt 64px là **outer logo block**, một lớp border/nền, inner mark co theo padding; áp dụng nhất quán AC/DEC, không lồng hai HrMonogram borders.

Typography phải đối chiếu class/token thực có; các tên `font-label-md`/`font-headline-md` từ demo không được mặc định tồn tại trong app. Dùng token hiện hữu hoặc bổ sung scoped class được phép, bảo đảm Inter 14px thực sự áp dụng. Không chỉ grep class để kết luận font đúng.

AC-13 contrast cần evidence tỉ lệ theo cặp foreground/background thực dùng và size/weight, không suy PASS từ tên token. Nếu CTA trắng/cam không đạt ngưỡng thì dùng token tương phản phù hợp, không ép PASS để bám demo. Không bắt cài tool hoặc phục hồi CDP/20 PNG gate. Nêu breakpoint nav đủ rộng cho cụm menu/auth; Owner live review vẫn giữ theo override.

## Authorization sau sửa

Tier 1 sửa đúng năm nhóm trên, bump version, chạy verify-task ở path canonical với trạng thái sẵn sàng để các check READY thật sự có hiệu lực; chỉ giữ READY_FOR_EXECUTION khi gate PASS và contract nhất quán. Sau đó được giao **một Tier 2 `/code hrp-v6-ui-04a-visual-polish`**, không trình Owner contract lần nữa nếu không đổi outcome/scope ngoài closeout này. Không yêu cầu đủ full TASK B/C/D để bắt đầu A. Không cấp thêm quyền commit/push/deploy ngoài quyền hiện hành của task/pipeline.
