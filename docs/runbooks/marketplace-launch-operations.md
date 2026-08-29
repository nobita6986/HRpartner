# HRP Marketplace MVP — Runbook vận hành và rollback

> **Owner:** HRP Operations / HR Manager
> **Planner owner:** Tier 1
> **Áp dụng:** Production `https://www.hrpartner.vn`
> **Cập nhật:** 2026-08-28
> **Trạng thái:** `READY_FOR_OWNER_REVIEW`
> **Nguồn yêu cầu:** `docs/UNIFIED_PLAN_v5.md` §7.9.7, tiêu chí 7

## 1. Mục tiêu

Runbook này mô tả cách xử lý an toàn năm tình huống vận hành của chợ việc làm:

1. Ẩn khẩn cấp một job đang công khai.
2. Khóa nhận hồ sơ khi order/slot không còn nhận người.
3. Xử lý hồ sơ hoặc Worker trùng mà không tạo bản ghi nhân sự thứ hai.
4. Xử lý yêu cầu xóa CV/tệp ứng viên theo khả năng thực tế hiện tại.
5. Rollback cờ công khai và khôi phục job sau sự cố.

Nguyên tắc bắt buộc: dùng UI hoặc API nghiệp vụ đã xác thực; **không sửa trực tiếp DB, không chạy seed/migration và không xóa record bằng SQL trong lúc xử lý sự cố**.

## 2. Phạm vi và giới hạn hiện tại

- Một job chỉ xuất hiện công khai khi Project `ACTIVE`, `isPublic=true`, có StaffingOrder `OPEN|CLOSING_SOON`, còn hạn và còn chỗ.
- API hiện chỉ đổi trạng thái ở **cấp StaffingOrder**. `StaffingOrderSlot` chưa có trạng thái hoặc thao tác khóa riêng.
- `CLOSING_SOON` vẫn nhận hồ sơ; chỉ `CLOSED` hoặc `CANCELLED` mới khóa nhận hồ sơ của order.
- `CLOSED` và `CANCELLED` là trạng thái cuối, không mở lại được bằng state machine hiện tại.
- MP-2 hiện chỉ lưu metadata CV (`fileName`, MIME, size); không có object key, R2 adapter hoặc tệp CV thật để xóa. CV là tùy chọn và mặc định go-live dành cho công nhân là **không yêu cầu CV**.
- Payroll/payslip không thuộc luồng Marketplace này. `/bcc` đã nghỉ; hệ thống lương riêng là nguồn vận hành production.

## 3. Vai trò và dữ liệu cần chuẩn bị

### 3.1 Vai trò

| Thao tác | Vai trò/điều kiện |
|---|---|
| Publish/unpublish Project | `ADMIN`, `HR_MANAGER`, `SALE`, `DIRECTOR` và có `CAN_PUBLISH_JOB` |
| Đổi trạng thái StaffingOrder | `ADMIN`, `HR_MANAGER`, `SALE` |
| Convert hồ sơ sang Worker | `ADMIN`, `HR_MANAGER` |
| Xem/xử lý hàng đợi ứng viên | Theo auth scope hiện hành; escalation về `ADMIN`/`HR_MANAGER` nếu bị chặn |

### 3.2 Checklist trước thao tác

- [ ] Ghi incident/ticket nội bộ, người thao tác và lý do.
- [ ] Xác định đúng `projectId`, `staffingOrderId`, `submissionId`; không dùng tên hiển thị làm khóa.
- [ ] Đọc lại trạng thái/version hiện tại trước khi write.
- [ ] Dùng `reason` cụ thể, không ghi chung chung như “fix”.
- [ ] Với API hỗ trợ idempotency, tạo khóa duy nhất cho **một payload** và tái dùng đúng khóa đó khi retry cùng thao tác.
- [ ] Không đưa cookie, JWT, connection string hoặc mật khẩu vào log/chứng cứ.

## 4. Ẩn khẩn cấp một job

Đây là biện pháp đầu tiên khi nội dung sai, có khiếu nại, nghi lộ dữ liệu, chưa chốt headcount hoặc luồng apply gặp lỗi.

### 4.1 Thao tác chuẩn

Ưu tiên dùng nút Ẩn/Ngừng công khai trong Admin. Nếu phải gọi API:

```http
POST /api/projects/{projectId}/publish
Content-Type: application/json
X-Idempotency-Key: incident-{incidentId}-unpublish-{projectId}

{
  "isPublic": false,
  "expectedVersion": 12,
  "reason": "INC-20260828-001: tam an job de xac minh noi dung"
}
```

`expectedVersion` lấy từ bản Project vừa đọc. Nếu nhận `409 STALE_VERSION`, tải lại Project, xác minh không có người khác vừa đổi trạng thái rồi tạo idempotency key mới cho payload/version mới. Không bỏ optimistic lock chỉ để ép thao tác qua.

### 4.2 Xác minh sau thao tác

- [ ] API trả `200`; `project.isPublic=false` hoặc `changed=false` nếu trước đó đã ẩn.
- [ ] Mở cửa sổ ẩn danh: job không còn trong danh sách công khai `/jobs` (đường dẫn canonical; `/viec-lam` đã không còn resolve sau khi bỏ catch-all static rewrite trong `vercel.json`, nên không dùng nó để xác minh).
- [ ] URL detail công khai không còn cung cấp job để ứng tuyển.
- [ ] Audit log có action `UNPUBLISH`, actor, reason và version trước/sau.
- [ ] Ghi thời điểm, HTTP status và ID liên quan vào incident; không chụp secret.

Nếu UI/API lỗi nhưng job vẫn công khai, coi là sự cố P1: dừng quảng bá link, báo Owner/Engineer; **không fallback sang SQL production**.

## 5. Khóa nhận hồ sơ của order/slot

### 5.1 Khóa toàn bộ StaffingOrder

```http
PATCH /api/staffing/orders/{staffingOrderId}
Content-Type: application/json
X-Idempotency-Key: incident-{incidentId}-close-order-{staffingOrderId}

{
  "status": "CLOSED"
}
```

Chọn trạng thái:

- `CLOSED`: đã đủ người hoặc kết thúc tuyển bình thường.
- `CANCELLED`: yêu cầu tuyển bị hủy; chỉ dùng khi có quyết định hủy rõ ràng.
- Không dùng `CLOSING_SOON` để khóa vì trạng thái này vẫn nhận apply.

Sau khi `CLOSED|CANCELLED`, order không còn thuộc tập nhận hồ sơ công khai. Xác minh bằng GET order, job public và một apply probe hợp lệ trên **test/staging**, không tạo hồ sơ giả trên production.

### 5.2 Muốn khóa riêng một slot trong order nhiều slot

Hiện chưa có API/state machine để khóa riêng `StaffingOrderSlot`. Vì vậy:

1. Nếu rủi ro tức thời, unpublish Project theo §4.
2. Nếu có thể dừng cả order, chuyển order sang `CLOSED` hoặc `CANCELLED` theo §5.1.
3. Nếu các slot khác vẫn phải tuyển, chuyển cho Tier 1 mở task bổ sung “per-slot intake control”; không sửa `slotsNeeded`, `slotsFilled`, hạn hoặc record trực tiếp ở DB để giả trạng thái khóa.

Đây là giới hạn sản phẩm đã biết, không được báo cáo sai rằng hệ thống hiện khóa riêng từng slot.

## 6. Xử lý duplicate

### 6.1 Người lao động nộp lại cùng job

Public apply có duplicate guard và có thể trả `409 DUPLICATE_APPLICATION`. Khi gặp trường hợp này:

- Không tạo hồ sơ thủ công thứ hai và không đổi số điện thoại để né guard.
- Tra cứu hồ sơ đã có theo số điện thoại chuẩn hóa/tracking code trong HR queue.
- Hướng dẫn ứng viên dùng tracking code hiện có; nếu mất code, xác minh danh tính theo quy trình nội bộ trước khi cung cấp thông tin trạng thái.
- Nếu là retry của cùng yêu cầu, dùng lại đúng idempotency key và payload. Không tái dùng key đó cho payload khác.

### 6.2 Trùng Worker lúc convert

Convert chỉ được thực hiện khi hồ sơ `QUALIFIED`, bởi `ADMIN|HR_MANAGER`, với reason không rỗng:

```http
POST /api/admin/applications/{submissionId}/actions/convert
Content-Type: application/json

{
  "reason": "Da doi chieu SDT/CCCD va xac nhan Worker canonical",
  "expectedVersion": 7,
  "existingWorkerId": "worker-canonical-id"
}
```

Quy trình:

1. Gọi convert không truyền `existingWorkerId` hoặc dùng UI.
2. Nếu nhận `409 DEDUP_REVIEW_REQUIRED`, xem danh sách candidates và trường khớp (`PHONE`, `CCCD`, `DEDUP_HINT`).
3. Đối chiếu hồ sơ nghiệp vụ; chọn đúng Worker canonical trên UI rồi gửi lại `existingWorkerId` nằm trong candidates.
4. Nếu `DEDUP_SELECTION_INVALID`, tải lại dữ liệu; không tự gõ một Worker ID ngoài danh sách.
5. Nếu `SOURCE_CLAIM_CONFLICT`, `CONVERSION_CONFLICT` hoặc `STALE_VERSION`, dừng thao tác, tải lại hồ sơ và chuyển HR Manager/Engineer điều tra. Không xóa SourceClaim/Worker để ép convert.

Thành công phải tạo/liên kết đúng một Worker, đúng một accepted SourceClaim, status history và audit log. Không có thao tác “merge bằng xóa row” trong runbook này.

## 7. Xử lý CV và yêu cầu xóa tệp

### 7.1 Trạng thái go-live hiện tại

- Form tuyển công nhân không bắt buộc CV: Quick Apply ưu tiên lấy số điện thoại; form đầy đủ vẫn cho phép thêm thông tin cá nhân.
- Backend hiện chỉ kiểm tra/lưu **metadata CV**, không upload nội dung file lên R2/DB.
- Vì không có file object nên hiện không có tệp vật lý để tải xuống hoặc xóa. Không được tuyên bố đã xóa file từ storage khi storage chưa tồn tại.

### 7.2 Khi nhận yêu cầu xóa

1. Xác định `submissionId` và xác minh người yêu cầu.
2. Kiểm tra dữ liệu hiện có: chỉ metadata hay đã có storage adapter ở phiên bản tương lai.
3. Với phiên bản hiện tại, ghi incident là `METADATA_ONLY / NO STORED OBJECT`; hạn chế hiển thị metadata và chuyển yêu cầu xóa metadata sang task có audit nếu cần. Không UPDATE trực tiếp production.
4. Nếu sau này bật R2/upload thật, runbook phải được revision trước go-live: xóa object theo server-side key, tombstone/clear metadata trong cùng workflow, ghi audit, xác minh object `404`, và có retention/legal-hold rule.

Cho đến khi workflow storage-delete được audit, Owner không được bật tính năng upload file thật trên production. Tiêu chí “xóa file” tại Marketplace MVP được đáp ứng bằng quyết định **CV disabled/optional, không lưu raw file**, không phải bằng một API giả.

## 8. Rollback public flag và khôi phục job

### 8.1 Rollback khi vừa publish nhầm

Thực hiện unpublish theo §4 với `expectedVersion` mới nhất và reason liên kết incident. Đây là rollback canonical của public flag.

### 8.2 Khôi phục sau khi xử lý xong sự cố

Chỉ republish khi toàn bộ điều kiện sau đúng:

- Project vẫn `ACTIVE`.
- Có ít nhất một StaffingOrder `OPEN|CLOSING_SOON`, chưa hết hạn.
- Có ít nhất một slot chưa hết hạn và `slotsNeeded - slotsFilled > 0`.
- Nội dung đã được người có thẩm quyền duyệt.
- Nguyên nhân incident đã được đóng và smoke apply/tracking đã xanh.

```http
POST /api/projects/{projectId}/publish
Content-Type: application/json
X-Idempotency-Key: incident-{incidentId}-republish-{projectId}

{
  "isPublic": true,
  "expectedVersion": 13,
  "reason": "INC-20260828-001 resolved; noi dung va intake da duoc xac minh"
}
```

Không thể mở lại StaffingOrder đã `CLOSED|CANCELLED`. Nếu cần tuyển lại, phải tạo order mới qua luồng nghiệp vụ; không sửa status trực tiếp. `CLOSING_SOON` có thể quay về `OPEN` theo state machine hiện tại.

## 9. Ma trận kiểm tra sau sự cố

| Hạng mục | Kết quả bắt buộc |
|---|---|
| Public list/detail | Chỉ hiện job đủ điều kiện; job đã ẩn/khóa không còn nhận apply |
| Admin | Project/order hiển thị đúng flag/status/version mới |
| Apply | Không tạo duplicate; closed/cancelled/unpublished job fail closed |
| Tracking | Tracking code cũ vẫn tra được trạng thái an toàn |
| Conversion | Không tạo Worker/SourceClaim thứ hai; conflict trả 409 và dừng |
| Audit | Có actor, action, reason, entity ID và diff/version nơi workflow hỗ trợ |
| Secrets/PII | Evidence không có password, token, DB URL, CCCD đầy đủ hoặc CV |

## 10. Evidence bàn giao và escalation

Mỗi incident phải lưu tối thiểu:

- incident ID, thời gian, môi trường, người thao tác;
- project/order/submission ID đã mask nếu chia sẻ ngoài nhóm;
- trạng thái/version trước và sau;
- API action + HTTP status hoặc ảnh UI không chứa secret/PII;
- kết quả public smoke và audit-log check;
- quyết định republish, giữ ẩn hay mở task sửa code.

Escalate cho Tier 1 khi cần thay đổi policy/state machine/scope. Escalate cho Tier 2 bằng một TASK đã verify khi cần code. Mọi lỗi nghi RLS, duplicate race, lộ dữ liệu hay job không thể ẩn là P1; giữ job ẩn cho đến khi Tier 3 có evidence PASS phù hợp.

## 11. Điều kiện Owner ký duyệt runbook

- [ ] Owner/HR Manager đã diễn tập ẩn và republish một job trên DB test/staging.
- [ ] Đã diễn tập đóng order và xác nhận public apply bị chặn.
- [ ] Đã diễn tập một duplicate apply và một dedup Worker conversion.
- [ ] Owner hiểu “khóa slot riêng” chưa tồn tại và chấp nhận phương án fail-safe ở §5.2.
- [ ] Owner xác nhận CV không bắt buộc, raw CV upload tắt ở lần go-live này.
- [ ] Đã lưu mẫu evidence không chứa secret/PII.

Sau khi checklist này được Owner ký, tiêu chí runbook §7.9.7(7) có thể chuyển `PASS`. Việc có tài liệu nhưng chưa diễn tập chỉ được tính là `READY_FOR_OWNER_REVIEW`, không phải go-live approval.
