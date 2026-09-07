# HRP V6 — Admin Rebuild

> Trạng thái: `BRAINSTORM / LIVING PLAN`
>
> Cập nhật gần nhất: 05/09/2026
>
> Phiên bản brainstorm: `v0.6`
>
> Vai trò: tài liệu nguồn để ghi nhận tư duy tổ chức sản phẩm, các quyết định đã chốt, giả thuyết đang thảo luận và lộ trình tái cấu trúc `/admin`.

## 1. Tuyên bố của V6

V6 không phải một đợt “làm đẹp Admin Panel”. Đây là phase tổ chức lại cách HRP vận hành Marketplace ở hai tầng:

1. Phần mềm tương tác, lưu giữ và liên kết dữ liệu người dùng như thế nào.
2. Người dùng nhìn, hiểu và điều hành công việc qua phần mềm như thế nào.

V5 đã hoàn thiện phần lớn bề mặt Marketplace dành cho người tìm việc và một phần công cụ quản trị. V6 sẽ hoàn chỉnh **Chặng 1 — Marketplace/Chợ việc làm** thành một quy trình vận hành thống nhất, dễ hiểu và có thể dùng thật trong công ty.

Mọi thay đổi giao diện của V6 phải bắt nguồn từ mô hình nghiệp vụ và trách nhiệm dữ liệu. Không đổi tên hoặc di chuyển menu chỉ để giao diện trông gọn hơn.

### 1.1. Phạm vi đã khóa cho lát cắt hiện tại

Lát cắt hiện tại của V6 chỉ giải quyết sự phối hợp giữa:

1. Marketplace/end-user UI mà NLD nhìn thấy.
2. Admin Panel mà nhân viên HRP dùng để tạo, công khai và quản lý các đối tượng của Marketplace.

**Trong phạm vi:**

- Mô hình đối tượng từ Công ty → Dự án → Nhu cầu tuyển → Vị trí → Tin tuyển dụng.
- Quan hệ giữa NLD → lượt ứng tuyển → vị trí quan tâm ban đầu → placement thực tế.
- Điều hướng drill-down hai chiều giữa danh sách và trang chi tiết trên Admin.
- Hợp đồng dữ liệu giữa nội dung Admin nhập và nội dung NLD nhìn thấy.
- Trạng thái publish, số slot và danh sách người đang làm/đã nghỉ ở từng vị trí trên Admin.
- Vòng đời NLD quay lại: hồ sơ chưa được xếp việc, Worker đã nghỉ, tái tuyển, chuyển việc và tạo Assignment mới.
- Bảo toàn nguồn AFF khi NLD được xếp sang một vị trí hoặc dự án khác.
- Luồng giao phụ trách NLD trước khi đi làm: người giới thiệu có cửa sổ bảo vệ 7 ngày; hết hạn thì hồ sơ về kho chung và lãnh đạo có thể giao lại có thời hạn.
- Tách nguồn giới thiệu khỏi người có quyền hưởng hoa hồng khi tư vấn/xếp việc thành công.
- Cho phép nhân viên nội bộ HRP có quyền tạo LaborProfile trực tiếp, hoàn thiện hồ sơ tối thiểu do NLD tự nhập và nhập người đến từ các quan hệ/kênh ngoài Marketplace.
- Dùng HRP làm hồ sơ nhân lực canonical cho toàn bộ NLD/Worker và ghi nhận đầy đủ các lần bố trí, chuyển, nghỉ, quay lại theo thực tế.

**Tạm hoãn, không dùng để mở rộng task trong lát cắt này:**

- Chi tiết kết quả và lịch sử phone/chat cần lưu.
- Quyền chi tiết giữa người phụ trách chính và phụ.
- Ma trận RBAC chi tiết cho từng thao tác giao, nhận, từ chối hoặc gia hạn hồ sơ.
- Mốc kinh doanh cuối cùng để tính Marketplace thành công.
- Trường lương/thưởng nào public và trường nào chỉ dùng nội bộ.
- Quyết định cuối cùng người quản lý hồ sơ hay beneficiary phải chịu trách nhiệm cập nhật từng loại di biến động; V6 trước hết khóa dữ liệu và audit trail cần có.

Các vấn đề tạm hoãn vẫn được giữ trong decision backlog để không thất lạc, nhưng không được làm blocker cho việc hoàn chỉnh mô hình Marketplace và hai bề mặt UI hiện tại.

## 2. Bối cảnh kinh doanh đã xác nhận

HRP đứng giữa hai nhóm khách hàng và tạo doanh thu/hoa hồng từ việc kết nối thành công:

### 2.1. Bên Cty — công ty thuê người lao động

- Một công ty có thể có nhiều dự án.
- Một dự án có thể có nhiều vị trí công việc.
- Mỗi vị trí có các thông tin riêng như thời hạn, số lượng cần tuyển/slot, địa điểm, ca làm, yêu cầu và mức đãi ngộ gồm lương, thưởng, phụ cấp hoặc quyền lợi khác.
- Mỗi dự án thường có một số nhân viên HRP phụ trách, trong đó cần phân biệt người phụ trách chính và người phối hợp/phụ trách phụ.
- Trong Chặng 1, bên Cty chưa phải người dùng trực tiếp của app hoặc chợ việc làm.
- Bên Cty chuyển thông tin dự án và nhu cầu tuyển cho nhân viên HRP bằng quy trình ngoài hệ thống hiện có. Nhân viên HRP là người nhập, chuẩn hóa, cập nhật và đăng thông tin lên Marketplace.

### 2.2. NLD — người lao động

- NLD có thể chủ động ứng tuyển vào một tin/vị trí cụ thể.
- NLD cũng có thể chỉ để lại thông tin để HRP liên hệ tư vấn sau.
- Quá trình trao đổi và thương thảo chủ yếu diễn ra qua điện thoại hoặc chat.
- Nhân viên HRP có thể giới thiệu và sắp xếp NLD vào một dự án khác phù hợp hơn.
- Dự án NLD bấm ứng tuyển ban đầu là **ý định/điểm vào**, không phải một cam kết ràng buộc NLD với dự án đó.
- Đối tượng tuyển dụng chủ yếu là công nhân/người lao động phổ thông; CV không phải dữ liệu bắt buộc của Marketplace.

### 2.3. Nhân viên HRP — người vận hành trung tâm

Trong Chặng 1, nhân viên HRP mới là người dùng chính của Admin Panel. Họ thực hiện các công việc:

- Tiếp nhận thông tin khách hàng và dự án.
- Chuẩn hóa nhu cầu tuyển thành các vị trí có thể vận hành.
- Đăng và quản lý tin tuyển dụng.
- Tiếp nhận thông tin NLD từ form, điện thoại, chat, CTV hoặc nguồn giới thiệu khác.
- Tạo LaborProfile trực tiếp khi NLD chưa tự đăng ký; tìm và hoàn thiện đúng profile đã có khi thông tin public còn sơ sài.
- Liên hệ, ghi nhận nhu cầu và đánh giá mức phù hợp.
- Đề xuất một hoặc nhiều vị trí phù hợp.
- Sắp xếp NLD vào vị trí/dự án thực tế.
- Theo dõi trách nhiệm của nhân viên chính và nhân viên phối hợp trên từng dự án/hồ sơ.
- Cập nhật các biến động thực tế của NLD/Worker như bố trí, chuyển dự án, nghỉ và quay lại; quy tắc ai chịu trách nhiệm cho từng loại cập nhật sẽ được brainstorm riêng.

## 3. Vấn đề hiện tại của `/admin`

### 3.1. Menu phản ánh lịch sử triển khai, chưa phản ánh quy trình vận hành

Các trang `Staffing`, `Job Board`, `Đơn ứng tuyển`, `Nhân sự`, `Dự án` và `Khách hàng` đang đứng ngang hàng nhưng quan hệ nhân quả giữa chúng không được thể hiện. Người dùng phải tự biết trang nào tạo dữ liệu nguồn, trang nào đăng ra công khai và trang nào xử lý kết quả.

### 3.2. Ba khái niệm đang chồng lấn

- `/admin/staffing` quản lý Staffing Order và các slot/vị trí cần người.
- `/admin/jobs` đọc Project, tổng hợp số slot từ Staffing Order và bật/tắt trạng thái công khai của Project.
- `/admin/applications` quản lý hồ sơ ứng tuyển, sàng lọc, chuyển thành Worker và placement.

Trong khi đó `/admin/jobs` còn chứa tab `Submissions` và `Claims`, tạo thêm một đường xem hồ sơ trùng với `/admin/applications` và một đường nguồn giới thiệu giao với kế hoạch AFF.

### 3.3. “Tổng quan” mới chỉ là trang chọn module

Trang `/admin` hiện dùng các thẻ liên kết tĩnh và chưa đọc dữ liệu vận hành. Nó chưa trả lời được các câu hỏi quản trị như có bao nhiêu hồ sơ mới, nhu cầu nào thiếu người, dự án nào chưa có ứng viên hoặc nhân viên nào đang quá tải.

### 3.4. Tên gọi chưa nhất quán

Giao diện đang trộn các từ `Staffing`, `Order`, `Job Board`, `Submissions`, `Claims`, `Publish` với tiếng Việt. Một số nhãn còn làm lẫn thực thể:

- “Nhân sự”/“Nhân viên” đang dùng cho dữ liệu Worker.
- “Tin tuyển dụng” hiện là thao tác publish Project.
- “Đơn ứng tuyển” có thể bị hiểu là NLD đã gắn cố định với dự án đã chọn.

V6 cần một từ điển nghiệp vụ thống nhất bằng tiếng Việt trước khi hoàn thiện kiến trúc thông tin.

### 3.5. Menu và khả năng thật chưa khớp nhau

Code hiện có các trang `/admin/vendors`, `/admin/users`, `/admin/commission/policies` và `/admin/commission/ledger`, nhưng chúng chưa xuất hiện trong menu. Ngược lại, một số module chưa nằm trong Chặng 1 lại đang đứng ngang hàng với Marketplace.

### 3.6. Dữ liệu thử nghiệm làm giảm độ tin cậy

Môi trường vận hành đang hiển thị đơn trùng, dữ liệu `DEMO`, tên `HACKED`, số điện thoại giả, tên viết thường và trạng thái chỉ có màu mà thiếu nhãn. V6 phải phân biệt rõ dữ liệu thật, dữ liệu demo và dữ liệu kiểm thử.

### 3.7. Điều hướng theo vai trò chưa đồng nhất

Sidebar lọc item theo role nhưng trang Tổng quan vẫn render cùng một tập thẻ cho mọi role thuộc Admin Portal. Việc ẩn menu chỉ là điều hướng, không phải authorization; API và RLS vẫn phải là ranh giới quyền thật.

### 3.8. Admin trên màn hình nhỏ chưa có đường điều hướng thay thế

Sidebar admin bị ẩn dưới breakpoint desktop nhưng hiện chưa có menu mobile tương ứng. Đây là vấn đề phải xử lý trong V6 sau khi cấu trúc thông tin được chốt.

## 4. Mô hình nghiệp vụ đề xuất để brainstorm

Phần này là giả thuyết thiết kế, chưa phải quyết định cuối cùng.

```text
Công ty khách hàng
└── Dự án
    ├── Nhân viên HRP phụ trách chính
    ├── Nhân viên HRP phối hợp
    └── Vị trí / Nhu cầu tuyển
        ├── Thời hạn tuyển và thời hạn làm việc
        ├── Số lượng cần / đã nhận / còn thiếu
        ├── Địa điểm và ca làm
        ├── Lương, thưởng, phụ cấp, quyền lợi
        ├── Yêu cầu ứng viên
        └── Tin tuyển dụng công khai
            └── Lượt quan tâm / Đơn ứng tuyển ban đầu

Người lao động
├── Hồ sơ nhận diện dùng chung
├── Nhu cầu và điều kiện mong muốn
├── Lịch sử liên hệ / tư vấn
├── Các lượt ứng tuyển hoặc nguồn giới thiệu
└── Các phương án ghép việc
    └── Placement thực tế vào một vị trí thuộc dự án
```

Điểm quan trọng nhất: **Application không phải Placement**. Application ghi nhận NLD đến từ đâu và lúc đó quan tâm điều gì. Placement mới xác định NLD cuối cùng được bố trí vào dự án/vị trí nào.

### 4.1. Sáu quan hệ nghiệp vụ phải tách biệt

1. **Quan hệ thương mại:** HRP ↔ Công ty khách hàng, được biểu diễn qua ClientCompany và các Project hợp tác.
2. **Quan hệ nhu cầu:** Project ↔ Vị trí cần tuyển, thể hiện công ty đang cần bao nhiêu người, trong thời gian nào và với điều kiện nào.
3. **Quan hệ công khai:** Vị trí cần tuyển ↔ Tin tuyển dụng, xác định NLD được phép nhìn thấy nội dung gì trên Marketplace.
4. **Quan hệ quan tâm:** NLD ↔ Tin/Vị trí ban đầu qua Application. Đây là tín hiệu quan tâm, không phải hợp đồng và không khóa NLD vào Project.
5. **Quan hệ làm việc:** NLD ↔ Vị trí/Project thực tế qua Assignment có hiệu lực theo thời gian.
6. **Quan hệ nguồn:** NLD ↔ người giới thiệu qua Referral Attribution/SourceClaim. Quan hệ này đi theo NLD khi họ được ghép sang việc khác.

Hai bất biến trung tâm:

- NLD không thuộc về một Công ty chỉ vì đã bấm hoặc nộp đơn vào tin của Công ty đó.
- Nguồn AFF không đổi chỉ vì NLD cuối cùng làm ở một Job/Project khác với điểm vào ban đầu.

### 4.2. Đối chiếu mô hình hướng đối tượng với schema hiện tại

| Đối tượng nghiệp vụ | Model hiện có | Vai trò đề xuất | Mức sẵn sàng |
|---|---|---|---|
| Công ty khách hàng | `ClientCompany` | Aggregate root của quan hệ thương mại; mở ra danh sách Project | Đã có quan hệ `projects` |
| Dự án hợp tác | `Project` | Aggregate thuộc một Công ty; chứa sites, nhu cầu tuyển và assignments | Đã có, nhưng UI mới chỉ là bảng phẳng |
| Đợt/yêu cầu tuyển | `StaffingOrder` | Container cho một lần Công ty/Project gửi nhu cầu tuyển | Đã có |
| Vị trí đang tuyển | `StaffingOrderSlot` | Đơn vị nhu cầu thật: chức danh, số lượng, thời hạn, ca, địa điểm, rate | Gần phù hợp nhất với Job Opening |
| Tin tuyển dụng | Chưa có model riêng; hiện dùng `Project.isPublic` | Public projection của một vị trí để NLD xem và ứng tuyển | Khoảng trống lớn; publish ở Project là quá thô |
| Lượt ứng tuyển | `CandidateSubmission` | Sự kiện một NLD bày tỏ quan tâm tại một thời điểm | Đã có `projectId`, `slotId`, tracking và history |
| Hồ sơ NLD trước convert | Chưa có aggregate canonical riêng | Nhận diện cùng một con người qua nhiều lượt ứng tuyển | Đã chốt cần `LaborProfile/CandidateProfile` tối thiểu |
| Sự kiện tiếp nhận hồ sơ | Chưa có `LaborProfileIntake` canonical | Ghi profile đến từ public self-service, nhân viên nhập trực tiếp, AFF, điện thoại, quan hệ hoặc import nào | Khoảng trống cần bổ sung |
| Người lao động canonical | `Worker` | Hồ sơ nghiệp vụ sau khi NLD được convert/xác minh; một người chỉ có một Worker canonical | Đã có |
| Đợt quan hệ lao động | Chưa có `EmploymentEpisode` trong schema hiện tại | Lưu từng lần NLD bắt đầu, nghỉ và quay lại làm việc với HRP | Khoảng trống cần xử lý trong V6 |
| Quan hệ làm việc | `ProjectAssignment` | NLD đang/đã làm ở Project và Position nào, trong khoảng thời gian nào | Đã có liên kết Project/Order/Slot và status |
| Nguồn giới thiệu | `SourceClaim`; `ReferralAttribution` nằm trong AFF plan | Bảo toàn người giới thiệu từ lúc vào chợ đến lúc phát sinh quyền lợi | Cần generalize theo mọi `User` |
| Giao phụ trách NLD | Chưa có model canonical | Lưu người đang tư vấn, nguồn giao, thời hạn 7 ngày/thời hạn do lãnh đạo chọn và lịch sử bàn giao | Cần `LaborProfileHandlingAssignment` hoặc tên tương đương |
| Người hưởng hoa hồng | Ledger hiện còn CTV-centric; AFF plan đề xuất `beneficiaryUserId` | Snapshot User đủ điều kiện khi Handling Assignment đạt milestone | Cần tách khỏi `referrerUserId` |
| Tranh chấp nguồn | `Ticket` hiện có chưa phù hợp hoàn toàn | Case để Trưởng phòng/Giám đốc phân xử attribution | Cần thiết kế subtype hoặc generalize Ticket |

### 4.3. Những gì schema hiện tại đã hỗ trợ cho drill-down

- `ClientCompany.projects` cho phép bấm một Công ty để lấy toàn bộ Dự án.
- `Project.staffingOrders` cho phép bấm một Dự án để lấy các đợt/yêu cầu tuyển.
- `StaffingOrder.slots` cho phép bấm một đợt tuyển để lấy từng vị trí cụ thể.
- `StaffingOrderSlot.assignments` cho phép bấm một vị trí để biết các Assignment liên quan.
- `ProjectAssignment.status`, `validFrom`, `validTo` cho phép tách người đang làm, đã nghỉ, đã chuyển hoặc đã hủy.
- `CandidateSubmission.slotId` lưu được vị trí NLD quan tâm lúc nộp đơn.
- `ProjectAssignment.staffingOrderSlotId` lưu được vị trí NLD thực tế được xếp vào.
- Hai slot trên có thể khác nhau mà không làm mất lịch sử ban đầu.

### 4.4. Những xung đột cần xử lý trong V6

1. `Project.isPublic` chỉ bật/tắt cả Project, trong khi một Project có nhiều vị trí với trạng thái và thời hạn khác nhau.
2. `StaffingOrderSlot` có dữ liệu của Job Opening nhưng chưa có URL, nội dung và vòng đời publish độc lập.
3. `CandidateSubmission` vừa chứa snapshot con người vừa đại diện cho một lượt ứng tuyển; cùng một NLD ứng tuyển nhiều lần có thể trông như nhiều người khác nhau trước khi convert.
4. `CandidateSubmission.projectId` và `slotId` là hai đường tham chiếu; domain phải bảo đảm Project luôn được suy ra/kiểm tra từ Slot, không cho hai giá trị mâu thuẫn.
5. `slotsFilled` là projection/biến đếm; sự thật về ai đang làm phải truy được từ Assignment hợp lệ, không chỉ tin vào counter.
6. `Project` đang có một PM chính và hai PM phụ cố định. Cấu trúc này đủ để hiển thị tạm thời, nhưng quyền/trách nhiệm chi tiết đã được hoãn khỏi lát cắt này.
7. `Ticket` hiện bắt buộc `workerId`, chỉ có các loại công/ứng lương/nghỉ/other và enum actor chưa có `DIRECTOR`; không thể mặc nhiên dùng nguyên trạng cho tranh chấp AFF trước khi NLD thành Worker.
8. `Worker.employmentStatus` chỉ lưu trạng thái hiện tại (`NONE | ACTIVE | SUSPENDED | TERMINATED`), chưa lưu được nhiều chu kỳ nghỉ rồi quay lại.
9. `ProjectAssignment` đủ lưu một lần bố trí vào việc, nhưng unique hiện tại trên `(projectId, employeeCode)` có thể chặn việc một người quay lại cùng Project với cùng mã nhân viên. V6 phải đổi sang bất biến chỉ cấm mã trùng trong các assignment đang hiệu lực, hoặc bổ sung một lớp membership/episode phù hợp; không được giải quyết bằng cách sửa đè assignment cũ.
10. `CandidateSubmission.ctvId`, `SourceClaim` và `ProjectAssignment.referrerId` đang thiên về nguồn giới thiệu; chưa có thực thể time-bound để biểu diễn ai đang phụ trách NLD và ai đủ điều kiện nhận commission sau một lần bàn giao.
11. Route tạo Worker hiện có không thay thế cho staff-assisted LaborProfile intake. Nếu nhân viên tạo Worker ngay khi chỉ có tên/SĐT, hệ thống sẽ làm sai ngữ nghĩa convert và khó phân biệt người mới để lại thông tin với người đã được xác minh/bố trí.

#### 4.4.1. Tám khoản đo thêm ngày `05/09/2026`

Mười một mục trên được viết từ đọc tài liệu. Tám mục dưới đây sinh từ việc đối chiếu **từng mệnh đề cấu trúc
của V6 với `prisma/schema.prisma` thật** (`1302` dòng, `49` model). Chúng **không** nằm trong mười một mục trên.

12. `Worker.phone @unique` và `Worker.cccdNumber @unique` chặn cứng hai trường hợp có thật: hai người dùng lại một số SIM đã thu hồi, và một CCCD được tái cấp. Nguy hơn: Phase 1 sẽ **nhân bản đúng lỗi này** nếu `LaborProfile` lặp `@unique` trên `phone`. LaborProfile phải dùng dedup mềm có authority theo `V6-DEC-023`, không phải unique thô ở tầng cột.
13. `SourceClaim.workerId` là non-nullable, nên nó **không giữ được nguồn "từ lúc vào chợ"** như §4.2 khai — lúc vào chợ chưa có Worker nào.
14. `ProjectAssignment.submissionId String? @unique` cho một submission **đúng một assignment vĩnh viễn**. Điều này đụng §4.11 bước 6 và `V6-DEC-014` (quay lại làm sinh Assignment mới). Unique này phải nới hoặc chuyển lên tầng episode.
15. `StaffingOrderSlot` **không có cột `status`**, nên từ vựng vòng đời JobOpening ở §4.7 không có chỗ lưu — đúng lúc `V6-DEC-017` ghim chính model này là nhà trung chuyển của JobOpening.
16. `CommissionLedger` **không có `beneficiaryUserId`** và cũng không có con trỏ nào tới handling assignment. Snapshot người hưởng mà §7.6 đòi, và chuỗi truy vết mà `aff_plan.md` §10.3 vẽ, hiện **không có chỗ ở**. `aff_plan.md` §11.2 chỉ thêm `beneficiaryUserId` ⇒ chuỗi vẫn đứt ở khúc handling.
17. Index idempotency của ledger `@@index([ctvId, workerId, month, year, milestone])` chứa `workerId` **nullable** ⇒ khóa chống trả trùng hở đúng lúc chưa có Worker, tức đúng lúc AFF hay chạy.
18. `ctvId` trên `CommissionLedger` và `CommissionDebt` **không có FK nào**, trong khi `CandidateSubmission.ctvId` và `SourceClaim.ctvId` đã relate `User` và `registrationChannel` đã có `AFF_CTV`/`AFF_SALE`. Nghĩa là `AFF-DEC-001` ("mọi User đều trong eligibility universe") phần lớn là **đổi tên cộng thêm FK** — **rẻ hơn** kế hoạch ngụ ý, không đắt hơn.
19. Chữ **"Application"** đã bị `ApplicationStatusHistory` chiếm trong schema, còn vật thật là `CandidateSubmission`. V6 dùng chữ "Application" xuyên suốt sẽ đụng tên ở migration đầu tiên; phải chốt từ vựng **trước** Phase 1.

Một khoản V6 khai **nặng hơn thực tế**: hai bộ đếm song song (`Project.quota/filled` và `slot.slotsNeeded/slotsFilled`)
đã có hàng rào sống — `src/domains/applications/live-integration.mp3c.test.ts` khẳng định
`slot?.slotsFilled === await activeForSlot(slotId)` sau cả race lẫn replay. Nợ này nhỏ hơn §4.4 mục 5 ngụ ý.

### 4.5. Aggregate và ranh giới trách nhiệm đề xuất

```text
ClientCompany aggregate
└── Project aggregate
    ├── ProjectStaff references (chỉ hiển thị ở phase này)
    ├── RecruitmentOrder
    │   └── JobOpening / PositionOpening
    └── Assignment history

JobPosting aggregate / public projection
└── tham chiếu đúng một JobOpening trong Chặng 1

LaborProfile aggregate
├── IntakeEvents[] (public self-service / staff-assisted / import)
├── Applications[]
├── ReferralAttribution? (nguồn đã đóng dấu)
├── Worker? (liên kết 0..1 sau convert)
└── EmploymentEpisodes[] / Assignments[]

ReferralAttribution aggregate
├── nguồn User sở hữu link (provenance, không đồng nghĩa người hưởng hoa hồng)
├── snapshot trên Application
├── accepted SourceClaim sau convert
└── AttributionDisputeTicket[]

LaborProfileHandlingAssignment aggregate (tên kỹ thuật tạm)
├── LaborProfile đang được tư vấn
├── User đang phụ trách
├── nguồn giao: AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION
├── startsAt / expiresAt
├── trạng thái và lịch sử giao nhận
└── commission beneficiary candidate khi đạt milestone
```

Quy tắc hướng đối tượng: màn hình chi tiết của một object chỉ điều phối qua service của aggregate đó; UI không tự ghép nhiều bảng rồi suy ra một sự thật nghiệp vụ nếu backend chưa cung cấp projection canonical.

### 4.6. Quyết định “NLD trước khi thành Worker”

Đây là quyết định dữ liệu nền tảng của lát cắt Marketplace, dù CRM phone/chat đã được hoãn.

**Phương án 1 — tiếp tục submission-centric:** mỗi lần nộp đơn là một hồ sơ tạm, đến khi convert mới có Worker. Ít thay đổi nhưng cùng một NLD có thể xuất hiện thành nhiều dòng người khác nhau và khó có trang chi tiết NLD thống nhất.

**Phương án 2 — tạo `LaborProfile/CandidateProfile` tối thiểu:** tạo một identity NLD canonical ngay khi nhận thông tin hợp lệ và có consent; các Application cùng tham chiếu identity này; khi convert thì profile liên kết Worker. Profile phase này chỉ cần nhận diện/dedup và quan hệ, không mở rộng sang CRM phone/chat. **Đây là phương án đã chốt cho V6.**

**Phương án 3 — dùng Worker ngay từ lần để lại thông tin đầu tiên:** đơn giản hóa số model nhưng làm sai ngữ nghĩa “Worker”, vì rất nhiều người để lại thông tin chưa từng được HRP xác minh hoặc bố trí đi làm. Không khuyến nghị.

Nếu phải chia nhỏ migration, UI/API có thể đi qua một `LaborProfileProjection` tạm thời để gom Submission theo identity đã chuẩn hóa. Tuy nhiên projection này chỉ là cầu chuyển tiếp; không được biến `findFirst(phone)` thành identity authority lâu dài.

`LaborProfile` tối thiểu phải có:

- ID nội bộ bất biến.
- Họ tên hiện biết và số điện thoại đã chuẩn hóa.
- CCCD tùy chọn; dữ liệu nhạy cảm vẫn phải đi qua projection/permission hiện có.
- Trạng thái xác minh danh tính ở mức tối thiểu.
- Consent và thời điểm tạo hồ sơ.
- Quan hệ đến mọi `Application`/`General Interest` của cùng người.
- Quan hệ 0..1 đến `Worker`; convert lần đầu mới tạo Worker, các lần quay lại chỉ tái sử dụng liên kết này.
- Quan hệ đến nguồn AFF canonical và lịch sử tranh chấp nếu có.

Số điện thoại là tín hiệu dedup mạnh nhưng có thể đổi hoặc được tái sử dụng; không được tự động merge mù chỉ vì trùng số. Khi có xung đột giữa điện thoại, CCCD và dữ liệu đã xác minh, hệ thống phải đưa vào hàng đợi đối chiếu thay vì tạo thêm Worker hoặc ghi đè hồ sơ cũ.

### 4.7. Vòng đời quan hệ Công ty — HRP — NLD

```text
ClientCompany: PROSPECT → ACTIVE → BLACKLISTED/INACTIVE (cần chuẩn hóa vocabulary)
  └─ Project: DRAFT → ACTIVE → PAUSED → COMPLETED/CANCELLED
       └─ RecruitmentOrder: OPEN → CLOSING_SOON → CLOSED/CANCELLED
            └─ JobOpening: UPCOMING → RECRUITING → FILLED/EXPIRED/CLOSED (domain proposal)
                 ├─ JobPosting: DRAFT → PUBLISHED → UNPUBLISHED/EXPIRED
                 ├─ Applications: lịch sử người từng quan tâm
                 └─ Assignments: PLANNED → ACTIVE → ENDED/TRANSFERRED/CANCELLED
```

Quan hệ lịch sử không được xóa khi một cấp kết thúc. Vì vậy:

- Bấm Công ty thấy cả Project đang hợp tác và đã kết thúc.
- Bấm Project thấy cả vị trí đang tuyển, đã tuyển đủ và đã đóng.
- Bấm Job Opening thấy người đang làm và người đã nghỉ/chuyển.
- Bấm NLD thấy các Application ban đầu và các Assignment thực tế qua thời gian.
- Bấm một Assignment luôn lần ngược được NLD → Job Opening → Project → Công ty.

Các trạng thái `JobOpening` ở trên là vocabulary đề xuất cho UI/domain, chưa phải yêu cầu thêm enum hoặc migration ở bước brainstorm này.

### 4.8. Quyết định về `JobPosting` và `JobOpening`

Trong Chặng 1, quan hệ được chốt như sau:

- Mỗi `JobPosting` bắt buộc tham chiếu **đúng một** `JobOpening`.
- Mỗi `JobOpening` có tối đa **một tin đang active/published** tại cùng một thời điểm.
- Một `JobOpening` là một loại vị trí có nhu cầu `N` người; nó không phải một ghế tuyển dụng đơn lẻ.
- Một trang tổng hợp theo Project hoặc Công ty có thể giới thiệu nhiều vị trí, nhưng nút Ứng tuyển cuối cùng vẫn phải đi vào đúng một `JobPosting`/`JobOpening` cụ thể.
- Chỉnh sửa hoặc đăng lại phải giữ được revision/lịch sử publish; không tạo nhiều tin active trùng nhau để né việc quản lý phiên bản.

Ví dụ một Project có ba nhu cầu “Lắp ráp ca ngày — 50 người”, “Lắp ráp ca đêm — 30 người” và “Kho — 20 người” thì Marketplace phải có ba đơn vị ứng tuyển rõ ràng. Nếu gộp thành một tin Project, hệ thống không thể trả lời trung thực NLD đã quan tâm ca nào, lương nào, còn bao nhiêu slot hoặc tin nào đã hết hạn.

### 4.9. Bốn lớp vòng đời của một NLD

Không được dùng một cột trạng thái duy nhất để biểu diễn toàn bộ hành trình. V6 tách bốn lớp:

```text
LaborProfile (con người, tồn tại lâu dài)
├── Application / General Interest (mỗi lần bày tỏ nhu cầu)
├── Worker 0..1 (hồ sơ sau lần convert đầu tiên)
│   └── EmploymentEpisode 0..n (mỗi đợt làm việc với HRP)
│       └── ProjectAssignment 0..n (mỗi lần được bố trí vào Job/Project)
└── ReferralAttribution 0..1 canonical + lịch sử touch/dispute
```

Ý nghĩa:

- `LaborProfile` trả lời **đây là ai**.
- `Application/General Interest` trả lời **lần này họ đang quan tâm hoặc cần tư vấn điều gì**.
- `Worker` trả lời **người này đã từng được HRP convert/xác minh thành hồ sơ lao động hay chưa**.
- `EmploymentEpisode` trả lời **đây là lần làm việc thứ mấy với HRP, bắt đầu và kết thúc khi nào**.
- `ProjectAssignment` trả lời **trong đợt đó họ làm ở vị trí, dự án và Công ty nào**.
- `ReferralAttribution` trả lời **ai đưa người này vào hệ thống HRP lần đầu theo rule AFF**.

Schema hiện tại chưa có `LaborProfile` và `EmploymentEpisode`; `CandidateSubmission`, `Worker.employmentStatus` và `ProjectAssignment` đang phải gánh nhiều nghĩa. Đây là khoảng trống V6 cần đóng, không phải lý do để sửa đè lịch sử cũ.

### 4.10. Luồng Worker nghỉ việc rồi quay lại xin việc khác

V6 phải phân biệt **chuyển việc khi vẫn đang làm** với **nghỉ rồi được tuyển lại**.

#### A. Khi Worker nghỉ vị trí hiện tại

1. Kết thúc `ProjectAssignment` hiện tại bằng `validTo` thực tế và trạng thái `ENDED`; nếu chuyển thẳng sang việc khác thì dùng `TRANSFERRED` và tạo Assignment mới.
2. Hoàn lại projection slot theo Assignment có hiệu lực; không chỉ trừ một counter mà không có chứng cứ lịch sử.
3. Nếu người đó chấm dứt toàn bộ quan hệ làm việc với HRP, đóng `EmploymentEpisode` hiện tại và cập nhật projection `Worker.employmentStatus` sang trạng thái không còn active phù hợp.
4. Giữ nguyên `LaborProfile`, `Worker`, các Application, nguồn AFF, SourceClaim và Assignment cũ.
5. Không xóa Worker và không đổi hồ sơ thành một người “chưa từng tồn tại”.

#### B. Khi người đó quay lại

1. Form công khai hoặc nhân viên Admin tra cứu/match vào `LaborProfile` cũ bằng dữ liệu đã xác minh. Nếu tín hiệu nhận diện mâu thuẫn, đưa vào review dedup.
2. Tạo một `Application` mới theo Job đang quan tâm hoặc một `General Interest` mới nếu chưa chọn việc. Không sửa Application cũ thành nhu cầu mới.
3. Hệ thống nhận ra profile đã liên kết Worker và chuyển sang nhánh **Tái tuyển/Tái bố trí**, không chạy convert lần hai và không tạo Worker thứ hai.
4. Khi đạt điều kiện nhận việc, tạo `EmploymentEpisode` mới nếu episode cũ đã đóng.
5. Tạo `ProjectAssignment` mới trỏ Job Opening thực tế; Job này có thể khác hoàn toàn Job họ vừa bấm.
6. Nguồn AFF canonical tiếp tục là nguồn lịch sử đã được đóng dấu. Người hưởng hoa hồng ở lần quay lại được xác định riêng từ Handling Assignment hợp lệ và commission policy; không suy ra tự động từ referrer.

Nếu Worker chỉ chuyển từ Job A sang Job B mà không có quãng nghỉ/chấm dứt quan hệ HRP, hai Assignment thuộc cùng một `EmploymentEpisode`: Assignment A kết thúc/`TRANSFERRED`, Assignment B bắt đầu. Nếu đã nghỉ HRP rồi quay lại, đó là episode mới.

#### C. Bất biến dữ liệu

- Một con người: một `LaborProfile` canonical.
- Một LaborProfile: tối đa một `Worker` canonical.
- Mỗi lần quay lại: Application/General Interest mới.
- Mỗi đợt làm việc lại sau khi nghỉ: EmploymentEpisode mới.
- Mỗi lần đổi vị trí thực tế: Assignment mới; không tái kích hoạt hoặc sửa đè Assignment đã kết thúc.
- Lịch sử nguồn và lịch sử Công ty/Project/Job cũ luôn truy được.

### 4.11. Luồng đã để lại thông tin nhưng chưa xếp được việc, sau này quay lại

Trường hợp này không phải “ứng viên mới” nếu hệ thống đã tạo `LaborProfile`:

1. Lần đầu NLD để lại số điện thoại/thông tin hợp lệ và consent, hệ thống tạo hoặc match `LaborProfile`.
2. Nếu họ đến từ một Job, tạo Application gắn Job đó; nếu chỉ để lại thông tin chung, tạo General Interest.
3. Chưa có việc phù hợp thì profile ở trạng thái có thể tìm lại/đang chờ bố trí; chưa bắt buộc tạo Worker.
4. Vài tuần hoặc vài tháng sau, NLD quay lại hoặc nhân viên tìm được Job phù hợp: mở đúng LaborProfile cũ và tạo một Application/đề xuất việc mới.
5. Khi chốt nhận việc, convert thành Worker **một lần duy nhất** nếu chưa có Worker, sau đó tạo EmploymentEpisode và Assignment.
6. Nếu profile vốn đã liên kết Worker từ một lần xử lý trước nhưng chưa có Assignment active, bỏ qua convert và đi thẳng vào tái bố trí.

UI Admin không được hiển thị nhiều dòng người độc lập chỉ vì một NLD đã đăng ký nhiều lần. Danh sách có thể hiển thị nhiều lượt quan tâm, nhưng tất cả phải drill-down về cùng một trang LaborProfile và một timeline thống nhất.

### 4.12. Ba quan hệ độc lập: ref 30 ngày, quyền xử lý 7 ngày và hoa hồng

Phải tách ba khái niệm; không dùng một field `owner/referrer` để gánh cả ba:

1. **AFF cookie/token — 30 ngày:** được tạo khi NLD mở link AFF. Đây là ngữ cảnh first-click trên thiết bị/browser để nhận diện nguồn khi NLD chưa có LaborProfile.
2. **ReferralAttribution — nguồn lịch sử:** nối NLD với User đã đưa họ đến HRP. Nó phục vụ provenance, audit và tranh chấp; Job đích thay đổi không làm mất dấu nguồn.
3. **LaborProfileHandlingAssignment — quyền/trách nhiệm xử lý có thời hạn:** cho biết User nào đang được giao tư vấn và sắp xếp việc cho NLD. Đây là căn cứ nghiệp vụ để xác định ứng viên hưởng hoa hồng khi đạt milestone, không phải cookie.

Hai đồng hồ khác nhau:

```text
Đồng hồ A — attribution capture
Click link AFF ───────────── cookie/token tối đa 30 ngày

Đồng hồ B — protected handling
Tạo/match LaborProfile ───── 7 ngày bảo vệ cho người giới thiệu
```

Nếu NLD click ngày 01/09 nhưng đến ngày 20/09 mới đăng ký, cookie vẫn có thể hợp lệ vì chưa quá 30 ngày. Cửa sổ xử lý 7 ngày bắt đầu từ lúc LaborProfile được tạo/match ngày 20/09, không bắt đầu từ ngày click.

#### 4.12.1. Luồng khởi tạo từ link AFF

```text
Click link của User A
  → tạo/reuse signed attribution cookie/token, TTL 30 ngày, first-click wins
  → NLD nộp Application hoặc General Interest
  → transaction tạo/match LaborProfile
  → gắn ReferralAttribution nguồn A vào profile/application
  → tạo Handling Assignment đầu tiên:
       assignee = User A
       source = AFF_INITIAL
       startsAt = thời điểm tạo/match profile cho lượt đăng ký
       expiresAt = startsAt + 7 ngày
       status = ACTIVE
```

Cookie có thể tiếp tục tồn tại đến hết TTL 30 ngày để hỗ trợ các lần apply trong cùng browser, nhưng không được kéo dài hoặc khởi động lại cửa sổ 7 ngày của một LaborProfile đã tồn tại.

#### 4.12.2. Kết quả trong cửa sổ bảo vệ 7 ngày

- User A có quyền ưu tiên xử lý NLD trong 7 ngày và có trách nhiệm tư vấn/sắp xếp việc.
- Nếu A đưa NLD đến milestone thành công trong thời hạn, Handling Assignment được đánh dấu `COMPLETED`; A là beneficiary candidate để commission engine chốt credit theo policy.
- `ReferralAttribution` chỉ chứng minh A là nguồn; hoa hồng chỉ phát sinh khi có thêm Handling Assignment hợp lệ và milestone thành công.
- Ngay trong 7 ngày, bất kỳ tranh chấp hợp lệ nào vẫn có thể mở Ticket/Case. Lãnh đạo có quyền giữ nguyên, chuyển giao, thu hồi hoặc điều chỉnh thời hạn bằng resolution có lý do và evidence.

#### 4.12.3. Hết 7 ngày mà chưa thành công

```text
Handling Assignment của A hết hạn
  → status = EXPIRED
  → LaborProfile chuyển AVAILABLE_IN_COMPANY_POOL
  → không còn quyền xử lý độc quyền
  → lãnh đạo chọn một User để giao tiếp
```

Lãnh đạo có thể giao lại cho chính A hoặc một nhân viên khác. Mỗi lần giao tạo một Handling Assignment mới với `startsAt`, `expiresAt`, người giao, lý do và trạng thái riêng; không sửa ngày hết hạn của dòng cũ để xóa dấu lịch sử.

Người được giao tiếp tục tư vấn cho đến khi:

- Thành công: assignment xử lý `COMPLETED`, beneficiary được snapshot cho commission milestone.
- Hết hạn: `EXPIRED`, hồ sơ lại về kho chung.
- Bàn giao: dòng cũ `TRANSFERRED/REVOKED`, dòng mới được tạo.
- Có tranh chấp: chờ hoặc thi hành resolution từ Ticket/Case theo policy.

#### 4.12.4. Ai là người hưởng hoa hồng

Không hỏi “ai sở hữu vĩnh viễn hồ sơ”; câu hỏi canonical là:

> Tại thời điểm NLD đạt milestone thành công, User nào có Handling Assignment hợp lệ và được policy/case resolution công nhận là beneficiary?

Quy tắc đã chốt ở mức nghiệp vụ:

- Người giới thiệu qua link AFF được nhận quyền xử lý ưu tiên 7 ngày đầu.
- Nếu chính người đó tư vấn và sắp xếp NLD thành công trong thời hạn, họ là người hưởng hoa hồng theo policy.
- Nếu 7 ngày hết hạn, hồ sơ vào kho chung; nguồn giới thiệu cũ vẫn được giữ để audit nhưng không tạo quyền độc quyền vô thời hạn.
- Người được lãnh đạo giao hồ sơ sau đó—kể cả chính người ban đầu—nếu xử lý thành công trong thời hạn giao hợp lệ thì trở thành beneficiary theo policy.
- `referrerUserId`, `currentAssigneeUserId` và `beneficiaryUserId` có thể trùng nhau nhưng là ba semantic khác nhau; schema/API/UI không được nhập làm một.
- Exact milestone, số tiền, thời gian giữ đủ ngày và payout vẫn do commission policy versioned quyết định. Handling Assignment xác định người đủ điều kiện nhận; nó không tự tạo tiền.

Trong V6, “xử lý thành công” ở tầng vận hành tối thiểu có nghĩa NLD đã được bố trí và bắt đầu Assignment thực tế, không phải chỉ nhấc máy, cập nhật trạng thái hoặc tạo Application. Tại mốc đó hệ thống snapshot beneficiary candidate. Việc credit được tạo ngay hay chỉ sau khi NLD làm đủ `N` ngày vẫn do commission policy/AFF phase quyết định.

#### 4.12.5. Bất biến và chống tranh chấp

- Một LaborProfile chỉ có tối đa một Handling Assignment `ACTIVE` tại cùng thời điểm; DB phải có backstop chống giao chồng.
- Mọi lần giao, hết hạn, chuyển, thu hồi, hoàn thành hoặc gia hạn đều có actor, thời điểm, lý do và history.
- Gia hạn phải là command có quyền và audit; không âm thầm sửa `expiresAt`.
- Link/cookie mới không tự cướp Handling Assignment đang active và không tự đổi beneficiary.
- Ticket/Case được phép mở cả trong lẫn ngoài 7 ngày. Resolution có thể thay đổi quyền xử lý/beneficiary về sau nhưng không xóa ReferralAttribution gốc.
- Nếu đã sinh ledger credit, thay đổi dùng reversal/compensation; không sửa/xóa tiền sử.

#### 4.12.6. Bốn ví dụ chuẩn để Tier 1–3 dùng khi viết contract/test

| Tình huống | Nguồn lịch sử | Người đang phụ trách | Beneficiary nếu thành công | Kết quả |
|---|---|---|---|---|
| A giới thiệu, profile tạo ngày 1, A xếp việc ngày 5 | A | A, `AFF_INITIAL` còn hạn | A | Luồng bình thường |
| A giới thiệu nhưng ngày 8 chưa thành công; ngày 9 sếp giao B đến ngày 20; B xếp việc ngày 12 | A | B, `MANAGER_ASSIGNMENT` còn hạn | B | Attribution A vẫn giữ, B nhận commission theo policy |
| Ngày 3 có tranh chấp; Case quyết định chuyển từ A sang B; B xếp việc ngày 6 | A, kèm case history | B, `CASE_RESOLUTION` | B hoặc theo resolution cụ thể | Không sửa/xóa nguồn A |
| Cookie của A còn trong 30 ngày nhưng LaborProfile đã có assignment xử lý active | A | Giữ assignment đang active | Theo assignment/resolution hiện có | Cookie không reset đồng hồ 7 ngày và không cướp quyền |

### 4.13. Nhân viên HRP tạo và hoàn thiện LaborProfile trực tiếp

V6 chốt hai cổng đưa NLD vào cùng một kho hồ sơ canonical:

```text
Cổng A — NLD tự phục vụ
Marketplace / link AFF / form nhanh / form đầy đủ
  → create-or-match LaborProfile
  → IntakeEvent + Application/General Interest

Cổng B — nhân viên HRP hỗ trợ
Điện thoại / chat / gặp trực tiếp / quan hệ cá nhân / dữ liệu vận hành thực tế
  → tìm trùng bắt buộc
  → create-or-match LaborProfile
  → IntakeEvent + General Interest/Application/ghi nhận hiện trạng phù hợp
```

Hai cổng không tạo hai loại NLD. Chúng chỉ khác `intakeChannel`, actor và mức độ hoàn thiện dữ liệu.

#### 4.13.1. Trường hợp NLD đã đi qua link AFF nhưng chỉ điền sơ sài

1. Form public tối thiểu tạo/match LaborProfile với các trường đủ nhận diện như họ tên, số điện thoại chuẩn hóa và consent.
2. ReferralAttribution cùng Handling Assignment 7 ngày được tạo theo rule §4.12.
3. Nhân viên mở đúng LaborProfile đó và dùng hành động **Hoàn thiện hồ sơ**, không tạo profile hoặc Worker mới.
4. Việc nhân viên bổ sung CCCD, ngày sinh, địa chỉ hoặc nhu cầu không thay đổi referrer, Handling Assignee hoặc beneficiary chỉ vì `updatedBy` khác.
5. Mọi thay đổi field nhạy cảm phải lưu actor/time và đi qua projection/permission; xung đột định danh phải vào review dedup.

#### 4.13.2. Trường hợp NLD đến từ quan hệ/kênh khác

Nhân viên có quyền dùng **Tiếp nhận NLD** để nhập người đến từ gọi điện, gặp trực tiếp, mối quan hệ, đối tác, dữ liệu cũ hoặc hoạt động thực tế ngoài Marketplace.

Luồng:

1. Nhập tín hiệu nhận diện tối thiểu.
2. Hệ thống tìm LaborProfile/Worker có thể trùng trước khi cho tạo mới.
3. Nếu có match chắc chắn: mở profile cũ để bổ sung hoặc tạo lượt Intake/Application mới.
4. Nếu match mâu thuẫn: đưa vào hàng đợi đối chiếu; không merge hoặc tạo Worker tự động.
5. Nếu không có: tạo LaborProfile và `LaborProfileIntake` với channel/reason/evidence phù hợp.
6. Nếu đang quan tâm một Job cụ thể, tạo Application staff-assisted; nếu chưa có Job, tạo General Interest. Không gắn giả một Job để vượt validation.
7. Nếu không có nguồn AFF/người giới thiệu hợp lệ, ghi nguồn `HRP_DIRECT`/channel tương ứng và đưa vào Company Pool hoặc tạo Handling Assignment bằng command giao việc riêng.

Nhân viên bấm nút tạo hồ sơ không mặc nhiên trở thành referrer, người phụ trách hoặc beneficiary. Ba quan hệ đó chỉ phát sinh qua attribution hợp lệ, command giao xử lý hoặc case resolution.

#### 4.13.3. Người đã làm việc ngoài thực tế nhưng chưa tồn tại trong app

Vì HRP là hệ thống quản lý toàn bộ hồ sơ nhân lực, phải hỗ trợ luồng nhập bổ sung cho NLD/Worker đang hoặc đã làm thật:

1. Tạo/match LaborProfile bằng staff-assisted intake.
2. Xác minh đủ điều kiện rồi mới create/link Worker; không tạo CandidateSubmission giả để giả lập một lần apply chưa từng xảy ra.
3. Tạo EmploymentEpisode và ProjectAssignment với ngày hiệu lực thực tế, actor nhập và lý do `OPERATIONAL_BACKFILL` hoặc vocabulary tương đương.
4. Nếu nhập lịch sử đã kết thúc, ghi đúng `validFrom`, `validTo` và trạng thái; không làm người đã nghỉ thành ACTIVE chỉ vì vừa nhập dữ liệu.
5. Dữ liệu backfill phải được phân biệt với event phát sinh real-time và có audit/batch ID nếu nhập hàng loạt.

#### 4.13.4. `LaborProfileIntake` — lịch sử NLD đi vào hệ thống

Tên model cuối cùng do TASK khóa. Event tối thiểu nên có:

```text
id
laborProfileId
channel: PUBLIC_JOB | PUBLIC_GENERAL | AFF_LINK | STAFF_PHONE |
         STAFF_CHAT | STAFF_IN_PERSON | RELATIONSHIP | PARTNER | IMPORT | OTHER
createdByUserId nullable            # null/system cho public
capturedAt
relatedApplicationId nullable
referralAttributionId nullable
sourceNote/evidenceRef nullable
consentMethod / consentAt / lawfulBasisRef (contract sau khóa field cuối)
createdAt
```

`createdByUserId` chỉ trả lời ai nhập dữ liệu. Nó không được dùng thay `referrerUserId`, `assigneeUserId` hoặc `beneficiaryUserId`.

#### 4.13.5. Hai trạng thái độc lập của hồ sơ

UI không được gộp “đủ thông tin” và “đã xác minh” thành một badge:

- **Completeness:** `MINIMAL | INCOMPLETE | COMPLETE` — hồ sơ đã có đủ trường cần thiết cho bước nghiệp vụ hay chưa.
- **Verification:** `UNVERIFIED | PENDING | VERIFIED | REJECTED/CONFLICT` — độ tin cậy danh tính.

Một hồ sơ có thể `COMPLETE` nhưng chưa `VERIFIED`, hoặc mới `MINIMAL` nhưng vẫn đã có ReferralAttribution và Handling Assignment hợp lệ.

#### 4.13.6. Di biến động là timeline bắt buộc

Mỗi LaborProfile phải truy được tối thiểu các event:

- Được tiếp nhận/tạo hồ sơ và qua kênh nào.
- Ai bổ sung hoặc xác minh dữ liệu quan trọng.
- Được giao cho ai tư vấn, từ lúc nào đến lúc nào.
- Ứng tuyển/được đề xuất vào Job nào.
- Convert thành Worker lúc nào.
- Bắt đầu làm, chuyển Job/Project, tạm dừng, nghỉ hoặc quay lại.
- Phát sinh dispute/resolution nào ảnh hưởng nguồn, người phụ trách hoặc beneficiary.

V6 khóa yêu cầu phải có dữ liệu và audit trail này. Quyết định chi tiết **người quản lý hồ sơ hay beneficiary phải cập nhật từng loại event nào** được giữ cho vòng brainstorm tiếp theo; chưa được tự suy ra từ `createdBy` hoặc `currentAssignee`.

## 5. Ba phương án tổ chức dữ liệu tuyển dụng

### Phương án A — Project-centric như hiện tại

Tin công khai đại diện trực tiếp cho Project; các Staffing Order chỉ cung cấp số slot.

Ưu điểm:

- Ít thay đổi code và dữ liệu hiện có.
- Dễ bật/tắt public ở cấp dự án.

Nhược điểm:

- Một dự án có nhiều vị trí, lương, ca và thời hạn khác nhau nhưng chỉ có một tin chung.
- Khó biết NLD thực sự quan tâm vị trí nào.
- Dễ phải tổng hợp hoặc suy diễn dữ liệu từ nhiều order.

### Phương án B — Position-centric

Mỗi vị trí/nhu cầu tuyển là một đơn vị công khai độc lập. Một Project có nhiều tin tương ứng với nhiều vị trí.

Ưu điểm:

- Khớp cách bên Cty cung cấp nhu cầu.
- NLD nhìn thấy rõ công việc, ca, lương và địa điểm.
- Dễ đo số ứng viên và số còn thiếu cho từng vị trí.

Nhược điểm:

- Cần chốt thực thể canonical cho “vị trí”.
- Có thể phải chuyển đổi dữ liệu và API đang publish ở cấp Project.

### Phương án C — Có lớp Recruitment Campaign/Job Post riêng

Project và Position là dữ liệu vận hành; Job Post là nội dung truyền thông công khai. Một Job Post có thể đại diện cho một vị trí hoặc gom nhiều vị trí có liên quan.

Ưu điểm:

- Linh hoạt về nội dung quảng bá, thời gian đăng và kênh phân phối.
- Không làm nội dung public chi phối dữ liệu hợp đồng/nội bộ.
- Phù hợp hơn khi phát triển AFF, chiến dịch tuyển dụng và nhiều kênh đăng tin.

Nhược điểm:

- Thêm một lớp dữ liệu và state machine.
- Có nguy cơ phức tạp quá sớm nếu Chặng 1 chưa cần chiến dịch đa kênh.

### Mô hình đích đã chốt ở mức nghiệp vụ

Nên đi theo mô hình lai có ranh giới rõ:

1. **Project** là khung quan hệ và vận hành nội bộ với bên Cty.
2. **Position/Demand Line** là đơn vị nhu cầu thật: số người, thời hạn, ca, địa điểm, đãi ngộ.
3. **Job Post/Public Projection** là nội dung NLD nhìn thấy. Trong Chặng 1, mỗi Job Post tham chiếu đúng một Position/Job Opening và mỗi Opening chỉ có tối đa một tin active cùng thời điểm.
4. **Application/Lead** ghi lại điểm vào và ý định ban đầu.
5. **LaborProfile** được tạo/match từ lần để lại thông tin hợp lệ đầu tiên; tồn tại độc lập với mọi lần ứng tuyển và liên kết 0..1 đến Worker.
6. **Placement/Assignment** là quyết định ghép người vào vị trí thực tế, có thể khác vị trí NLD đã bấm ban đầu.
7. **EmploymentEpisode** tách từng đợt làm việc của cùng Worker để hỗ trợ đúng việc nghỉ rồi quay lại.
8. **ReferralAttribution** được đóng dấu vào LaborProfile trong cửa sổ ref hợp lệ và không phụ thuộc Job/Assignment cuối cùng.

Các quy tắc trên đã được Owner xác nhận ở mức mô hình nghiệp vụ. Schema, API và thứ tự migration vẫn phải được tách thành các TASK có backfill, compatibility và audit contract riêng trước khi triển khai.

## 6. Trải nghiệm dự kiến sau V6

### 6.1. Đối với lãnh đạo

- Nhìn thấy toàn bộ phễu từ nhu cầu tuyển đến người đã được xếp việc.
- Biết dự án/vị trí nào thiếu người, hồ sơ đang tắc ở đâu và nhân viên nào phụ trách.
- Phân biệt dữ liệu thật với dữ liệu demo/test.
- Đo được kết quả theo khách hàng, dự án, vị trí, nhân viên phụ trách và nguồn ứng viên.

### 6.2. Đối với nhân viên HRP

- Không cần hiểu cấu trúc database để biết bước tiếp theo.
- Có hàng đợi công việc theo trách nhiệm: hồ sơ mới, cần gọi lại, cần bổ sung thông tin, chờ NLD xác nhận, chờ xếp việc.
- Mở một hồ sơ NLD và thấy được lịch sử tương tác, mong muốn, các lần ứng tuyển và các phương án việc phù hợp.
- Có thể chuyển NLD từ nhu cầu ban đầu sang vị trí phù hợp khác mà vẫn giữ nguyên lịch sử nguồn và lý do.
- Nhận biết rõ người “mới”, người “đã có hồ sơ nhưng chưa từng đi làm”, người “đang làm” và “cựu Worker quay lại” mà không tạo hồ sơ trùng.
- Có thể tiếp nhận NLD trực tiếp bằng form nhanh, tìm hồ sơ có sẵn rồi hoàn thiện dần, hoặc nhập đúng hiện trạng người đã làm ngoài thực tế.
- Việc nhập/sửa hồ sơ không tự đổi nguồn AFF, người đang phụ trách hay quyền hưởng hoa hồng.
- Kết thúc một lần làm việc và tái tuyển ở lần sau bằng episode/assignment mới, không sửa đè lịch sử cũ.
- Biết rõ mình là người phụ trách chính hay người phối hợp của dự án/hồ sơ.

### 6.3. Đối với NLD

- Có thể tìm và ứng tuyển nhanh vào một vị trí rõ ràng.
- Có thể chỉ để lại thông tin để được tư vấn, không bắt buộc chọn đúng việc ngay từ đầu.
- Không phải nộp CV trong Chặng 1.
- Có thể tra cứu trạng thái và hiểu HRP đang xử lý hồ sơ tới đâu.
- Khi được tư vấn sang việc khác, lịch sử ứng tuyển ban đầu vẫn được bảo toàn.
- Khi quay lại sau một thời gian, không phải trở thành một người mới trong hệ thống; HRP tiếp tục trên hồ sơ cũ sau bước đối chiếu danh tính phù hợp.

### 6.4. Đối với bên Cty

- Chưa cần sử dụng portal trong Chặng 1.
- Thông tin họ cung cấp được HRP cấu trúc lại thành Project và Position có trách nhiệm quản lý rõ ràng.
- Có thể nhận báo cáo ngoài hệ thống hoặc từ nhân viên HRP dựa trên dữ liệu thống nhất.

## 7. Kiến trúc thông tin Admin — hướng thảo luận

### 7.1. Quyết định tạm thời đã chốt và đã cho phép triển khai

Bốn menu sau được gom vào group **Đang phát triển**:

- Chấm công
- Đối soát
- Phản ánh / Tạm ứng
- Tính lương

Group này là điều hướng thứ cấp, mặc định thu gọn. Route và code nghiệp vụ được giữ nguyên; việc gom menu không có nghĩa là xóa chức năng.

Trạng thái thực thi: **đã cập nhật code điều hướng ngày 04/09/2026**. Group chỉ hiển thị các mục mà role hiện tại vốn đã được phép nhìn thấy và tự mở khi người dùng đang ở một route thuộc group.

### 7.2. Các menu còn lại

Các menu còn lại tiếp tục ở level 1 trong bước hiện tại. Chưa đổi tên, chưa di chuyển và chưa gộp chúng cho đến khi chốt mô hình nghiệp vụ.

### 7.3. Cấu trúc đích đang brainstorm, chưa được phép implement

Một hướng có thể là tổ chức theo công việc thay vì theo bảng dữ liệu:

```text
Tổng quan điều hành

Nhu cầu tuyển
Tin tuyển dụng
Hồ sơ / NLD quan tâm
Ghép việc / Xếp việc
Người lao động

Dự án
Khách hàng
Nguồn ứng viên / AFF

Cài đặt hệ thống

Đang phát triển
├── Chấm công
├── Đối soát
├── Phản ánh / Tạm ứng
└── Tính lương
```

Cấu trúc trên chỉ là vật liệu brainstorm. Không được dùng làm hợp đồng thi công trước khi Owner duyệt.

### 7.4. Cây drill-down Admin đề xuất

```text
/admin/clients
└── /admin/clients/{clientId}
    ├── Tổng quan Công ty
    └── Các dự án đã/đang hợp tác
        └── /admin/projects/{projectId}
            ├── Tổng quan Dự án
            ├── Các đợt/yêu cầu tuyển
            ├── Các vị trí công việc
            │   └── /admin/job-openings/{openingId}
            │       ├── Thông tin vị trí và slot
            │       ├── Trạng thái tuyển/publish
            │       ├── Xem trước đúng nội dung public
            │       ├── NLD đã quan tâm/ứng tuyển
            │       └── Người đang làm / đã nghỉ / đã chuyển
            └── Nhân sự đang làm / đã nghỉ (tổng hợp toàn Project, mọi Opening)
```

Sửa `05/09/2026`: `/admin/job-openings/{openingId}` trước đó bị lắp dưới nhánh "Nhân sự đang làm / đã nghỉ".
Đó là lỗi biên tập, và vì §7.4 là nguồn IA của Phase 2 nên để nguyên sẽ sinh sai cây route.
Job Opening là con của **"Các vị trí công việc"**; "Nhân sự đang làm / đã nghỉ" là view tổng hợp cấp Project.

Mỗi cấp phải có breadcrumb và URL ổn định. Danh sách là cửa vào; trang chi tiết mới là nơi thể hiện quan hệ đối tượng. Không mở modal nhiều tầng cho một chuỗi có từ ba cấp trở lên.

Luồng theo con người chạy song song với cây Công ty/Dự án:

```text
/admin/labor-profiles
├── /admin/labor-profiles/new (Tiếp nhận NLD)
└── /admin/labor-profiles/{laborProfileId}
    ├── Nhận diện và trạng thái hiện tại
    ├── Nguồn AFF canonical
    ├── Các Application / General Interest
    ├── Worker đã liên kết hay chưa
    ├── Các Employment Episode
    └── Lịch sử Assignment theo Job → Project → Công ty
```

Hai cây gặp nhau tại Application và Assignment: từ trang NLD có thể đi đến Job/Project/Công ty; từ trang Job Opening có thể đi đến LaborProfile của người đã quan tâm hoặc đã làm.

### 7.5. Bề mặt end-user tương ứng

```text
Marketplace /
└── Danh sách Job Posting đang hiệu lực
    └── /viec-lam/{jobSlug}
        ├── Nội dung public của đúng một Job Opening
        ├── Số vị trí còn tuyển
        ├── Địa điểm / ca / thời hạn / đãi ngộ được phép hiện
        ├── Ứng tuyển nhanh
        └── Ứng tuyển đầy đủ

/track
└── Tra cứu trạng thái lượt ứng tuyển
```

NLD không được nhìn thấy danh sách người đang làm/đã nghỉ, dữ liệu nội bộ của Công ty, nhân viên phụ trách hoặc nguồn AFF. Những thông tin đó chỉ tồn tại trên projection Admin được phân quyền.

### 7.6. Hợp đồng phối hợp Admin ↔ Marketplace

| Hành động Admin | Kết quả end-user bắt buộc |
|---|---|
| Tạo/sửa Công ty | Không tự xuất hiện public |
| Tạo/sửa Project | Không tự trở thành một tin tuyển dụng |
| Tạo Job Opening | Có dữ liệu nhu cầu nhưng chưa public nếu chưa publish |
| Publish Job Posting | Tin xuất hiện trên danh sách và có trang chi tiết ổn định |
| Sửa nội dung public | Preview Admin và trang end-user dùng cùng một projection |
| Slot hết hoặc hết hạn | Tin không tiếp tục nhận đơn; trạng thái hiển thị phải trung thực |
| NLD nộp đơn | Admin nhận đúng Application gắn Job Posting/Opening ban đầu |
| NLD để lại thông tin chung | Admin nhận General Interest gắn LaborProfile nhưng không gắn giả vào một Job |
| Nhân viên tiếp nhận NLD trực tiếp | Create-or-match LaborProfile qua dedup gate; ghi IntakeEvent và không tự nhận nguồn/quyền xử lý |
| Nhân viên hoàn thiện hồ sơ public sơ sài | Cập nhật cùng LaborProfile; giữ nguyên ReferralAttribution và Handling Assignment hiện hữu |
| Nhập người đang/đã làm ngoài thực tế | Tạo Worker/Episode/Assignment backfill có ngày hiệu lực và audit; không tạo Application giả |
| NLD đã có LaborProfile nộp lại | Tạo lượt Application/Interest mới và nối vào profile cũ; không tạo một “người” mới |
| Cựu Worker quay lại | Đi vào luồng Tái tuyển/Tái bố trí; không convert hoặc tạo Worker lần hai |
| NLD đăng ký qua AFF | Ghi nguồn ReferralAttribution và tự giao profile cho referrer trong cửa sổ bảo vệ 7 ngày |
| Hết 7 ngày chưa xếp việc | Handling Assignment hết hạn; profile về kho chung để lãnh đạo phân phối lại |
| Lãnh đạo giao profile | Tạo lượt giao có người nhận, thời hạn và lịch sử; không đổi/xóa attribution gốc |
| Người phụ trách đạt milestone | Snapshot beneficiary từ Handling Assignment hợp lệ; commission engine áp policy sau |
| Placement sang việc khác | Application gốc giữ nguyên; Assignment trỏ vị trí thực tế mới |
| Worker nghỉ việc | Kết thúc Assignment/EmploymentEpisode có thời điểm; không xóa Worker, LaborProfile hoặc nguồn AFF |
| Cookie AFF hết 30 ngày | Chỉ kết thúc khả năng capture qua browser; không xóa nguồn hoặc lượt giao đã được ghi server-side |
| Unpublish | Ngừng nhận application mới nhưng không xóa lịch sử cũ |

### 7.7. Trang chi tiết Job Opening trên Admin

Đây là màn hình trung tâm nối phía Công ty với phía NLD. Nó nên có các khối:

1. **Danh tính vị trí:** Công ty, Dự án, đợt tuyển, mã vị trí, chức danh.
2. **Nhu cầu:** số cần, số đang làm, số còn thiếu, thời hạn và trạng thái.
3. **Điều kiện làm việc:** địa điểm, ca và đãi ngộ theo dữ liệu được phép dùng trong phase.
4. **Public:** trạng thái publish, slug, lần cập nhật cuối và nút xem trước trang NLD.
5. **Ứng viên quan tâm:** các Application bắt nguồn từ tin này.
6. **Kết quả bố trí:** người đang làm, đã nghỉ, đã chuyển; dữ liệu từ Assignment chứ không từ Application.

Một NLD có thể xuất hiện ở “Ứng viên quan tâm” nhưng không ở “Đang làm”; hoặc đã quan tâm Job A nhưng xuất hiện trong “Đang làm” của Job B. Đó là hành vi đúng, không phải dữ liệu sai.

### 7.8. Trang chi tiết LaborProfile trên Admin

Đây là màn hình trung tâm theo con người, đối xứng với màn hình Job Opening theo nhu cầu. Trang phải cho nhân viên hiểu ngay:

1. **Đây có phải người đã tồn tại không:** dữ liệu nhận diện, độ tin cậy của match và cảnh báo dedup.
2. **Tình trạng quan hệ hiện tại:** chưa từng convert, chưa từng đi làm, đang làm, đã nghỉ/có thể tái bố trí hoặc đang cần review.
3. **Nguồn:** referrer ban đầu, cookie/attribution capture, Application/touch gốc và trạng thái tranh chấp; không cho sửa nhanh nguồn trực tiếp.
4. **Người đang phụ trách:** assignee hiện tại, nguồn giao, thời gian còn lại, trạng thái SLA và lịch sử giao nhận. Hiển thị cảnh báo sắp hết hạn bằng cả chữ và thời gian, không chỉ bằng màu.
5. **Quyền hưởng hoa hồng:** chỉ hiển thị `Chưa đủ điều kiện`, `Ứng viên beneficiary`, `Đã chốt theo milestone` hoặc trạng thái tranh chấp khi có dữ liệu thật; không suy ra chỉ từ referrer.
6. **Nhu cầu qua thời gian:** các Application theo Job và các General Interest độc lập.
7. **Lịch sử làm việc:** từng EmploymentEpisode và từng Assignment, gồm Công ty, Project, Job, thời gian và lý do kết thúc/chuyển.
8. **Hành động phù hợp trạng thái:** hoàn thiện hồ sơ, tạo lượt quan tâm mới, đề xuất Job, convert lần đầu, bố trí, chuyển việc, kết thúc việc hoặc tái tuyển. UI không được hiện nút “Convert” nếu LaborProfile đã có Worker.

Các nhãn tổng hợp như “Đang làm” hoặc “Đã nghỉ” chỉ là projection dễ hiểu từ episode/assignment có hiệu lực. Chúng không được thay thế lịch sử nguồn bên dưới và không được biểu diễn chỉ bằng màu.

### 7.9. Workbench tiếp nhận và quản lý LaborProfile

Danh sách `/admin/labor-profiles` cần trở thành cửa vào chính theo con người, với một CTA rõ **Tiếp nhận NLD**. Không dùng nút `+ Thêm nhân viên` cho người mới chỉ để lại thông tin vì họ chưa phải Worker.

Form chia progressive disclosure:

1. **Tiếp nhận nhanh:** họ tên, điện thoại, consent/method, kênh đến, Job quan tâm nếu có. Khi nhập điện thoại/CCCD, UI gọi dedup preview trước khi cho lưu.
2. **Hoàn thiện hồ sơ:** thông tin định danh, liên hệ, địa chỉ và các trường được phép trong phase; autosave/draft hoặc cảnh báo khi rời form có thay đổi.
3. **Xử lý nghiệp vụ:** giao người tư vấn, đề xuất Job, convert, bố trí. Đây là command riêng, không nằm lẫn trong mutation lưu thông tin cá nhân.

Danh sách cần có các view/filter dựa trên dữ liệu thật:

- Của tôi đang xử lý.
- Sắp hết hạn xử lý.
- Kho chung chưa có người phụ trách.
- Hồ sơ tối thiểu/chưa hoàn thiện.
- Cần đối chiếu trùng.
- Chưa từng đi làm, đang làm, đã nghỉ/có thể tái bố trí.

Mọi row/card phải deep-link vào trang LaborProfile và hiển thị bằng chữ trạng thái nguồn, người phụ trách, thời hạn, completeness và verification; không dùng màu trống hoặc icon không có nhãn.

## 8. Nguyên tắc dữ liệu cho V6

1. Mỗi khái niệm nghiệp vụ phải có một nguồn dữ liệu canonical.
2. Không dựng một control hoặc nhãn UI nếu không có dữ liệu thật chống lưng.
3. Không dùng trạng thái chỉ bằng màu; luôn có nhãn và ý nghĩa hành động.
4. Không để nội dung kỹ thuật như `Staffing`, `Claim`, `Publish` xuất hiện với người dùng nội bộ nếu chưa được định nghĩa trong từ điển nghiệp vụ.
5. Dữ liệu NLD phải tập trung theo con người, không bị chia thành nhiều hồ sơ rời chỉ vì ứng tuyển nhiều lần.
6. Mọi application phải giữ được nguồn, tin/vị trí quan tâm ban đầu và thời điểm phát sinh.
7. Mọi placement phải giữ được ai quyết định, vào vị trí nào, từ khi nào và khác gì so với ý định ban đầu.
8. Mọi Project phải có trách nhiệm phụ trách rõ ràng, tối thiểu một người chính và có thể có nhiều người phối hợp.
9. Lương/đãi ngộ nội bộ và nội dung được phép công khai phải được tách hoặc có projection rõ ràng.
10. Demo/test data không được lẫn với dữ liệu vận hành mà không có nhãn và cơ chế dọn dẹp.
11. Nghỉ việc, chuyển việc và quay lại là các sự kiện lịch sử; không được triển khai bằng xóa record hoặc sửa đè khoảng thời gian cũ.
12. LaborProfile đã có Worker không được chạy convert lần hai; mọi lần quay lại dùng Worker canonical cũ.
13. AFF cookie/token ở client có TTL 30 ngày; nó chỉ capture nguồn và không cấp quyền xử lý hồ sơ vô thời hạn.
14. Kết quả “đang làm/đã nghỉ/còn slot” phải được suy ra từ relation có hiệu lực và có phép reconciliation, không chỉ từ một badge hoặc counter rời.
15. ReferralAttribution, Handling Assignment và Commission Beneficiary là ba sự thật khác nhau; không gộp chung thành `ownerId` hoặc `referrerId` mơ hồ.
16. Quyền xử lý NLD trước khi đi làm luôn có thời hạn và lịch sử; một profile chỉ có tối đa một lượt giao active tại cùng thời điểm.
17. Public self-service và staff-assisted intake phải dùng chung create-or-match LaborProfile service và dedup authority.
18. Người tạo/cập nhật record không tự động trở thành referrer, handling assignee hoặc beneficiary.
19. Không tạo Application giả cho người được nhập từ vận hành thực tế; Intake, Application, Worker, EmploymentEpisode và Assignment phải phản ánh đúng sự kiện đã xảy ra.
20. Mọi di biến động NLD/Worker phải có effective time, actor/source và history; trạng thái hiện tại chỉ là projection từ timeline.

## 9. Decision backlog sau khi thu hẹp scope

### 9.1. Project và vị trí

1. “Dự án” trong HRP là hợp đồng/địa điểm làm việc dài hạn hay một đợt tuyển có ngày kết thúc?
2. Một vị trí có thể xuất hiện trong nhiều Staffing Order hay mỗi order tạo ra các position riêng?
3. Khi số lượng hoặc mức lương thay đổi, cần lưu phiên bản/lịch sử hay chỉ cập nhật giá trị mới?
4. `RESOLVED` — Trong Chặng 1, tin public đại diện đúng một Job Opening/Position; trang Project/Công ty chỉ được dùng để tổng hợp và điều hướng.

### 9.2. Phân công NLD và quyền hưởng hoa hồng

Đã chốt mô hình thay cho khái niệm “sở hữu hồ sơ”:

1. LaborProfile là tài sản dữ liệu của Công ty, không thuộc vĩnh viễn một cá nhân.
2. User giới thiệu NLD bằng link AFF hợp lệ được tự động nhận Handling Assignment bảo vệ 7 ngày tính từ lúc tạo/match LaborProfile.
3. Nếu chưa thành công khi hết hạn, profile về kho chung của Công ty.
4. Lãnh đạo có thể giao profile cho bất kỳ User phù hợp, kể cả người giới thiệu ban đầu, trong một khoảng thời gian xác định.
5. Mỗi lần giao nhận là record riêng, có người giao, người nhận, thời hạn, lý do, trạng thái và lịch sử.
6. User xử lý thành công trong Handling Assignment hợp lệ là beneficiary candidate; payout chỉ được chốt khi commission milestone/policy thỏa mãn.
7. Tranh chấp có thể mở trong cả cửa sổ 7 ngày; lãnh đạo phân xử qua Ticket/Case, không sửa dữ liệu âm thầm.

Còn hoãn, chưa dùng để mở rộng implementation ngay:

1. Mỗi Project có bắt buộc đúng một người phụ trách chính không?
2. Người phụ trách phụ có quyền giống người chính hay chỉ được xem/phối hợp?
3. Ma trận role nào được giao, nhận, từ chối, gia hạn hoặc thu hồi profile.
4. Thời hạn mặc định/tối đa của lượt giao thủ công sau khi profile vào kho chung.

### 9.3. NLD và quá trình tư vấn

Đã chốt: NLD được để lại thông tin chung mà không cần chọn một Job cụ thể. Hệ thống phải phân biệt `General Interest/Đăng ký tư vấn` với Application phát sinh từ một Job Posting.

Đã chốt thêm:

- Lần nhận thông tin hợp lệ và consent đầu tiên tạo/match một LaborProfile tối thiểu.
- Một LaborProfile có thể có nhiều Application/General Interest nhưng tối đa một Worker canonical.
- Người chưa được xếp việc quay lại tiếp tục trên profile cũ.
- Cựu Worker quay lại đi qua luồng tái tuyển/tái bố trí, không convert lần hai.
- Nhân viên nội bộ có quyền được tạo LaborProfile trực tiếp hoặc hoàn thiện profile NLD tự khai sơ sài.
- Mọi cổng public/staff-assisted đều phải tìm trùng và create-or-match cùng aggregate; không có “kho hồ sơ nhân viên nhập” tách khỏi Marketplace.
- Người nhập/sửa dữ liệu không tự nhận attribution, Handling Assignment hoặc commission beneficiary.
- NLD đến từ kênh ngoài Marketplace vẫn được tạo IntakeEvent, rồi đi qua cùng luồng General Interest/Application → Worker → EmploymentEpisode → Assignment theo sự kiện thật.

Các câu hỏi sau được hoãn:

1. `DEFERRED` — Những thông tin nào nhân viên cần ghi sau cuộc gọi: khu vực, ca, lương mong muốn, ngày có thể đi làm, phương tiện, chỗ ở, kinh nghiệm?
2. `DEFERRED` — Có cần lịch hẹn gọi lại, số lần liên hệ và kết quả từng lần không?
3. `DEFERRED` — Một NLD có thể đồng thời được đề xuất cho nhiều vị trí hay chỉ một phương án active?
4. `DEFERRED` — Khi NLD từ chối, cần lưu lý do để lần sau không tư vấn sai nhu cầu không?
5. `DEFERRED` — Role/permission cụ thể nào được tạo mới, sửa field nhạy cảm, xác minh hoặc nhập backfill lịch sử?
6. `DEFERRED` — Consent/lawful-basis evidence tối thiểu cho từng kênh điện thoại, chat, gặp trực tiếp, quan hệ và import là gì?

### 9.4. Trạng thái phễu — `DEFERRED`

1. Bộ trạng thái hiện tại có phản ánh đúng cách nhân viên làm việc qua phone/chat không?
2. Cần phân biệt “không liên lạc được”, “đang cân nhắc”, “không phù hợp”, “đã hẹn phỏng vấn”, “đồng ý nhận việc” và “đã đi làm” không?
3. `RESOLVED` — Chỉ tiêu thành công tối thiểu là NLD **bắt đầu `ProjectAssignment` thực tế**, theo `aff_plan.md` §6.5.1: *"Operational success ... tối thiểu là NLD bắt đầu ProjectAssignment thực tế"*. Nộp đơn và đồng ý nhận việc là mốc phễu trung gian, không phải chỉ tiêu thành công. Câu này **không được quyết lại** ở V6; nếu muốn đổi thì đổi tại aff_plan §6.5.1 rồi dẫn chiếu về đây.

### 9.5. Lương, thưởng và nội dung công khai — `DEFERRED`

1. Trường nào bên Cty cung cấp nhưng chỉ nhân viên HRP được xem?
2. Trường nào được phép công khai cho NLD?
3. Nếu lương gồm nhiều thành phần, public hiển thị khoảng thu nhập hay từng cấu phần?
4. Ai có quyền duyệt nội dung trước khi publish?

### 9.6. Nguồn và hoa hồng

Các điểm đã chốt:

1. Khi NLD đến Marketplace bằng link AFF hợp lệ của User nào, nguồn được ghi nhận cho User đó.
2. Nguồn đi theo hành trình NLD với HRP và được giữ nguyên khi NLD cuối cùng vào Job/Project khác.
3. Cookie/token AFF first-click có thời hạn 30 ngày theo `aff_plan.md`; đây là cửa sổ capture nguồn trước/qua các lần apply, không phải cửa sổ độc quyền xử lý.
4. Khi tạo/match LaborProfile từ attribution hợp lệ, người giới thiệu được giao profile trong 7 ngày để tư vấn và sắp xếp việc.
5. Nếu hết 7 ngày chưa thành công, lượt giao hết hạn và profile về kho chung; attribution gốc vẫn giữ cho audit.
6. Lãnh đạo có thể giao profile từ kho chung cho một User trong thời hạn xác định; có thể giao lại cho chính người ban đầu.
7. Người có lượt giao hợp lệ khi đạt milestone là beneficiary candidate. Referrer ban đầu không mặc nhiên giữ quyền hưởng hoa hồng vô thời hạn.
8. Tranh chấp không được xử bằng cách sửa thẳng/xóa attribution hoặc lịch sử giao nhận.
9. Tranh chấp tạo một Ticket/Case chính thức để Trưởng phòng hoặc Giám đốc phân xử, kể cả khi 7 ngày đầu chưa hết.
10. Quyết định phải có người xử lý, lý do, bằng chứng, thời điểm và lịch sử trước/sau; thay đổi tài chính về sau dùng reversal/compensation, không xóa ledger.
11. Một LaborProfile đã có attribution/Handling Assignment không bị link AFF mới tự động ghi đè hoặc khởi động lại đồng hồ 7 ngày.

Các điểm còn mở nhưng không chặn UI Marketplace hiện tại:

1. Ticket AFF được tạo trước khi NLD thành Worker phải tham chiếu Attribution/Application/Handling Assignment nào?
2. Mốc phát sinh tiền hoa hồng và số tiền được quyết định trong AFF/Commission phase; V6 chỉ khóa beneficiary candidate và lịch sử giao nhận.
3. Thời hạn cụ thể cho từng lượt giao thủ công sau 7 ngày là cấu hình chung hay do lãnh đạo chọn trong một biên min/max?

### 9.7. Tranh chấp AFF và giới hạn của Ticket hiện tại

UI có thể gọi cơ chế này là **Ticket tranh chấp nguồn**, nhưng domain không được nhét dữ liệu vào `Ticket.type=OTHER` một cách mơ hồ.

Đề xuất hai lựa chọn kỹ thuật cho task AFF sau này:

- Generalize Ticket thành Case có `subjectType`, `subjectId`, category và resolver roles; hoặc
- Tạo `AttributionDisputeTicket` riêng nhưng tái sử dụng component/history/state-machine của Ticket.

Trong hai lựa chọn, phương án thứ hai an toàn hơn cho rollout đầu vì Ticket hiện tại bắt buộc `workerId` và policy của nó được thiết kế cho công, tạm ứng, nghỉ phép.

**Đã quyết `05/09/2026` — `V6-DEC-028` chọn phương án thứ hai.** Từ đây `V6-DEC-009` và `V6-DEC-021` phải
đọc kèm `V6-DEC-028`: chữ "Ticket/Case" trong hai mục ấy **không** có nghĩa là model `Ticket` hiện tại.
Lý do không phải sở thích kiến trúc mà là ba phép đo trên `prisma/schema.prisma` ngày `2026-09-05`:

| Đo được ở schema | Vì sao chặn đường tái dùng `Ticket` |
|---|---|
| `Ticket.workerId String` **bắt buộc**, kèm `worker Worker @relation(...)` không nullable | Tranh chấp attribution xảy ra khi **chưa có Worker nào**. Select một quan hệ bắt buộc bị che sẽ throw invariant trước cả mapper, tức optional-chaining vô ích và mock không bao giờ tái lập được |
| `TicketActorRole` có đúng `6` giá trị: `WORKER, HR_STAFF, HR_MANAGER, ACCOUNTANT, PM, ADMIN` — **không có `DIRECTOR`** | `V6-DEC-009` giao quyền phân xử cho Trưởng phòng và **Giám đốc**. `SystemRole` có `DIRECTOR`, nhưng vốn actor của Ticket thì không |
| `TicketStatus` là một máy **duyệt chi tiền** `7` giá trị, đường chính `PENDING → HR_APPROVED → APPROVED → PAID` | Không có một trạng thái phân xử nào để "tái sử dụng state-machine của Ticket" như câu trên ngụ ý. Tái dùng được là **pattern** component/history, không phải vốn từ trạng thái |

Quyết định là **cấm tái dùng model `Ticket`**; tên và enum cuối cùng của entity Case mới do TASK khóa.
UI vẫn được gọi nó là "Ticket tranh chấp nguồn".

### 9.8. Khoảng trống đã đo mà chưa có slice nào — `05/09/2026`

Khác với các mục `DEFERRED` ở trên (đã biết là hoặc chưa cần), năm mục dưới đây là những chỗ tài liệu **đã chốt
một yêu cầu** nhưng **chưa có model, chưa có từ vựng hoặc chưa có phase nào nhận**. Để nguyên thì mỗi Phase sẽ tự
bía ra một cách làm riêng.

1. **General Interest**: `V6-DEC-010` chốt NLD được để lại thông tin mà không chọn Job, nhưng không có model, không có bộ trạng thái và không có slice nào. Đây là cửa vào của **người chưa chọn việc**, tức phần lớn traffic.
2. **RBAC là tiền đề của AFF-05A, không phải việc làm sau**: §10 hoãn ma trận role/permission, nhưng exit gate của AFF-05A trong `aff_plan.md` §14 đòi nguyên văn *"hai manager không thể giao chồng"*. Không có ma trận thì câu ấy không đo được.
3. **Timeline di biến động không có bảng**: `V6-DEC-027` và §8.20 đòi mọi movement có effective time, actor/source và history, và trạng thái hiện tại chỉ là hình chiếu. Schema hiện chỉ có `AuditLog`, `ApplicationStatusHistory` và `TicketHistory` — không cái nào là timeline của NLD. Đây là móng của "đang làm / đã nghỉ" ở §8.14.
4. **`LaborProfile.verification` chồng lấn `Worker.profileStatus`**: theo nguyên tắc §8.1 (một nguồn canonical cho một khái niệm), phải khai rõ cái nào canonical khi một profile đã có Worker.
5. **Không có slice backfill cho Worker đang sống**: `V6-DEC-025` cấm bịa Application và `V6-DEC-026` tách "đầy đủ" khỏi "đã xác minh", nhưng dữ liệu thật hiện có vào `LaborProfile` bằng đường nào thì chưa mục nào nói.

Năm mục này **chưa** có `V6-DEC`. Chúng được ghi ở đây để không thất lạc, không phải để dùng làm cơ sở viết TASK —
§12 vẫn áp dụng: chỉ mục `Chốt` mới làm cơ sở TASK.

## 10. Ngoài phạm vi hiện tại

V6 Admin Rebuild ở thời điểm brainstorm này chưa triển khai sâu các module:

- Chấm công.
- Đối soát.
- Phản ánh / Tạm ứng.
- Tính lương.
- Portal tự phục vụ dành cho bên Cty.
- Payroll engine; phần tính lương tiếp tục để ở chặng sau cùng do HRP đã có app lương riêng.
- CRM chi tiết cho phone/chat và lịch gọi lại.
- Ma trận RBAC chi tiết, thuật toán cân bằng tải kho chung và quyền chính-phụ của nhân viên HRP; mô hình giao nhận có thời hạn đã nằm trong scope.
- KPI/milestone cuối cùng của Marketplace và commission.
- Chính sách phân tách đãi ngộ public/nội bộ.

Các route/code đã tồn tại của những module trên được giữ nguyên để tránh regression, nhưng không chi phối kiến trúc Marketplace của Chặng 1.

## 11. Nhật ký quyết định

| Ngày | Mã | Trạng thái | Quyết định |
|---|---|---|---|
| 04/09/2026 | V6-DEC-001 | Chốt | V6 là phase tổ chức lại mô hình điều hành và kiến trúc thông tin Admin, không phải polish UI. |
| 04/09/2026 | V6-DEC-002 | Chốt | V6 hoàn chỉnh Chặng 1 Marketplace sau khi V5 hoàn thiện end-user và một phần Admin. |
| 04/09/2026 | V6-DEC-003 | Chốt | Bên Cty chưa dùng app trong Chặng 1; nhân viên HRP nhập và vận hành dữ liệu dự án. |
| 04/09/2026 | V6-DEC-004 | Chốt | Application là ý định ban đầu; NLD có thể được placement vào dự án/vị trí khác. |
| 04/09/2026 | V6-DEC-005 | Chốt | Chấm công, Đối soát, Phản ánh/Tạm ứng và Tính lương được gom dưới “Đang phát triển”. |
| 04/09/2026 | V6-DEC-006 | Chốt | Lát cắt hiện tại phối hợp end-user Marketplace với Admin; CRM phone/chat, RBAC chi tiết, KPI và disclosure đãi ngộ được hoãn. |
| 04/09/2026 | V6-DEC-007 | Chốt | NLD chỉ có quan hệ với Công ty qua Assignment vào một Job Opening thuộc Project; Application không tạo quan hệ làm việc. |
| 04/09/2026 | V6-DEC-008 | Chốt | Nguồn AFF/provenance đi theo NLD và không đổi khi placement sang Job/Project khác; nguồn không đồng nghĩa beneficiary hoa hồng vĩnh viễn. |
| 04/09/2026 | V6-DEC-009 | Chốt | Tranh chấp nguồn AFF được giải quyết qua Ticket/Case có lịch sử bởi Trưởng phòng/Giám đốc, không sửa/xóa attribution âm thầm. Hạ tầng Case do `V6-DEC-028` quyết; **không** phải model `Ticket` hiện tại. |
| 04/09/2026 | V6-DEC-010 | Chốt | NLD có thể để lại thông tin chung để được tư vấn mà không cần chọn một Job; General Interest phải phân biệt với Application theo Job. |
| 04/09/2026 | V6-DEC-011 | Chốt | Một JobPosting tham chiếu đúng một JobOpening; một Opening chỉ có tối đa một tin active cùng thời điểm. JobOpening có thể chứa nhiều slot. |
| 04/09/2026 | V6-DEC-012 | Chốt | Tạo/match LaborProfile tối thiểu ngay lần đầu nhận thông tin hợp lệ và consent; Application/General Interest chỉ là các sự kiện của profile đó. |
| 04/09/2026 | V6-DEC-013 | Chốt | Một LaborProfile có tối đa một Worker canonical; người quay lại không được convert hoặc tạo Worker lần hai. |
| 04/09/2026 | V6-DEC-014 | Chốt | Nghỉ rồi quay lại tạo EmploymentEpisode và Assignment mới; chuyển việc khi còn làm tạo Assignment mới trong cùng episode; không sửa đè lịch sử cũ. |
| 04/09/2026 | V6-DEC-015 | Chốt | AFF cookie/token first-click trên thiết bị có TTL 30 ngày theo Affiliate plan. |
| 04/09/2026 | V6-DEC-016 | Chốt | Khi LaborProfile được tạo/match từ attribution hợp lệ, ReferralAttribution được gắn server-side và tồn tại độc lập với Job ban đầu, placement đích và đồng hồ giao xử lý. |
| 04/09/2026 | V6-DEC-017 | Chốt | `StaffingOrderSlot` là persistence chuyển tiếp gần nhất cho JobOpening; V6 bổ sung JobPosting/public projection độc lập thay vì tiếp tục publish cả Project. |
| 04/09/2026 | V6-DEC-018 | Chốt | Người giới thiệu được tự động giao LaborProfile trong cửa sổ bảo vệ 7 ngày tính từ lúc tạo/match profile, không phải từ lúc click link. |
| 04/09/2026 | V6-DEC-019 | Chốt | Hết 7 ngày chưa thành công, lượt giao hết hạn và profile về kho chung; lãnh đạo có thể giao tiếp cho User bất kỳ, kể cả người ban đầu, trong thời hạn xác định. |
| 04/09/2026 | V6-DEC-020 | Chốt | Người có Handling Assignment hợp lệ khi đạt milestone là beneficiary candidate; ReferralAttribution chỉ là nguồn lịch sử và không mặc nhiên cấp hoa hồng vô hạn. |
| 04/09/2026 | V6-DEC-021 | Chốt | Tranh chấp có thể mở ngay trong 7 ngày; mọi chuyển giao/đổi beneficiary phải qua Ticket/Case có actor, reason, evidence và append-only history. Hạ tầng Case do `V6-DEC-028` quyết; **không** phải model `Ticket` hiện tại. |
| 04/09/2026 | V6-DEC-022 | Chốt | Nhân viên nội bộ có quyền được tạo LaborProfile trực tiếp và hoàn thiện profile public còn sơ sài; không bắt buộc NLD tự thao tác trên Marketplace. |
| 04/09/2026 | V6-DEC-023 | Chốt | Public và staff-assisted intake dùng chung create-or-match LaborProfile/dedup authority; không tạo hai kho người lao động song song. |
| 04/09/2026 | V6-DEC-024 | Chốt | `createdBy/updatedBy` không tự động trở thành referrer, Handling Assignee hoặc commission beneficiary. |
| 04/09/2026 | V6-DEC-025 | Chốt | NLD/Worker đang hoặc đã làm ngoài thực tế được backfill bằng Intake + Worker/Episode/Assignment đúng effective time; cấm tạo Application giả để hợp thức hóa. |
| 04/09/2026 | V6-DEC-026 | Chốt | Completeness và verification là hai trạng thái độc lập của LaborProfile; hồ sơ tối thiểu vẫn có thể có attribution/handling hợp lệ. |
| 04/09/2026 | V6-DEC-027 | Chốt | HRP phải giữ timeline di biến động đầy đủ của NLD/Worker; trách nhiệm role cụ thể cho từng event sẽ được chốt ở vòng brainstorm tiếp theo. |
| 05/09/2026 | V6-DEC-028 | Chốt | Tranh chấp AFF dùng một entity Case **mới** (tên/enum do TASK khóa), tái sử dụng pattern component/history của Ticket nhưng **cấm tái dùng model `Ticket` hiện tại**: `workerId` bắt buộc, `TicketActorRole` không có `DIRECTOR`, `TicketStatus` là máy duyệt chi tiền — ba phép đo ở §9.7. |
| 05/09/2026 | V6-DEC-029 | Chốt | `ReferralAttribution` treo trực tiếp trên `LaborProfile` qua `laborProfileId` nullable + unique, đóng dấu lúc create/match, tối đa một attribution canonical mỗi profile. `CandidateSubmission`/`SourceClaim` chỉ là đường đối chiếu, **không** phải mắt xích bắt buộc của traceability chain — đồng bộ `AFF-DEC-018`. |
| 05/09/2026 | V6-DEC-030 | Chốt | JobPosting độc lập theo `V6-DEC-017` **đổi không gian URL công khai đang chạy**: publish hiện ở tầng Project và slug công khai là `project.code`/`project.id`. Phase 3 phải giao kèm map slug cũ → mới và redirect; không được để đứt link đã public và phải khai tác động lên go-live-02/04. |
| 05/09/2026 | V6-DEC-031 | Chốt | Query công khai đang bị `public-card-truth.test.ts` đóng băng tập khóa `where` = `isPublic, staffingOrders, status`. Mọi TASK thêm điều kiện JobPosting phải khai **trước** rằng hàng rào này sẽ ĐỎ và cập nhật nó trong cùng lượt; cấm để Tier 2 tự nới test khi gặp. |

Bốn mục `V6-DEC-028..031` sinh từ vòng rà soát `05/09/2026` giữa Owner và Tier 1: đối chiếu từng mệnh đề
cấu trúc của tài liệu này với `prisma/schema.prisma` và với bề mặt công khai đang sống, thay vì suy từ văn bản.
Ba mục đầu đóng ba mâu thuẫn có thật; `V6-DEC-031` đóng một hàng rào sẽ đỏ **đúng thiết kế**, không phải defect.

## 12. Cách duy trì tài liệu

- Mọi ý kiến mới của Owner được thêm vào phần bối cảnh, câu hỏi hoặc nhật ký quyết định.
- Chỉ các mục có trạng thái `Chốt` mới được dùng làm cơ sở viết TASK.
- Mục `Giả thuyết` hoặc `Đang thảo luận` không được tự động chuyển thành schema/code.
- Sau mỗi vòng brainstorm, cập nhật rõ câu hỏi đã trả lời, quyết định mới và tác động lên roadmap.
- Không gộp tài liệu này vào Portal Plan hoặc AFF Plan; đây là nguồn chính riêng của V6 Admin Rebuild.
