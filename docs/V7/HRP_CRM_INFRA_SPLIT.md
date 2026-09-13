# Quyết định tách HRP và CRM — 13/09/2026

**Trạng thái:** Quyết định Owner, áp dụng cho phần V6/V6+ chưa code và toàn bộ V7.
**Đầu vào:** `C:/Users/Admin/Downloads/Crm-Hrp/Master-Plan.V2.6.md` và [HRP_CRM_CONNECTOR.md](HRP_CRM_CONNECTOR.md).
**Phạm vi:** Ranh giới sản phẩm và thứ tự triển khai; không tuyên bố API hay migration mới đã chạy.

## Quy tắc ưu tiên

Chỉ thị Owner ngày 13/09/2026 tách hạ tầng CRM là quyết định mới nhất. Khi các backlog V7.2, V7.8, V7.9, V7.10 hoặc tài liệu V6 cũ giao Chat/CSKH cho HRP, dùng quyết định này thay thế phần giao việc đó. Master Plan v2.6 mô tả đích CRM, nhưng các route, DTO và enum tương lai trong đó không chứng minh HRP hiện đã triển khai. Hợp đồng tích hợp phải được chốt và kiểm thử ở cả hai repo trước production.

## Ranh giới sở hữu

| HRP — System of Record | Ứng dụng CRM — System of Engagement |
|---|---|
| LaborProfile, PlacementCase, Application, Placement, Worker/Assignment, Handling, Referral/Beneficiary, Availability và các quyết định nghiệp vụ | Chatwoot, Zalo OA/kênh khác, inbox, transcript, chat assignee, mẫu trả lời, chiến dịch liên hệ, CSKH hằng ngày |
| ClientCompany, CrmLead; về sau ClientContact, SalesOpportunity, ClientInteraction, ClientNextAction và trách nhiệm account/project có tính pháp lý/nghiệp vụ | Màn hình quản lý quan hệ khách hàng, sales/CSKH workbench, nhắc việc, lịch sử hội thoại, đề xuất AI cho nhân viên |
| Command/query API có xác thực, phân quyền, audit, idempotency, concurrency; canonical outbox và dữ liệu KPI có định nghĩa | Provider adapter, anti-corruption layer (ACL), mapping contact/conversation, durable receipt, retry/DLQ/reconcile, analytics hội thoại |
| Ticket vận hành nhân sự/nội bộ đã có trong V6 và luồng nhập tay tối thiểu khi CRM mất kết nối | Ticket CSKH, xử lý yêu cầu từ chat và mọi UI điều phối hội thoại |

`InteractionOutcome`/`NextAction` (Talent) và `ClientInteraction`/`ClientNextAction` (B2B) là **bản ghi cấu trúc có thẩm quyền** tại HRP, không phải transcript hay inbox. CRM gửi yêu cầu ghi qua HRP command, không có Prisma/core DB credentials; chat assignee không tự thành Handling hoặc người hưởng hoa hồng. HRP không dựng một CRM CSKH thứ hai. Các trang HRP còn lại chỉ là thao tác nghiệp vụ tối thiểu và đường nhập tay/điện thoại khi CRM lỗi.

## Điều chỉnh phạm vi cũ

| Backlog cũ | Giữ trong HRP | Chuyển sang repo CRM / bỏ khỏi HRP |
|---|---|---|
| V6 Admin/Marketplace | Nền tảng LaborProfile, Worker, JobPosting, Ticket vận hành hiện có; không hồi tố xóa dữ liệu | CRM phone/chat, gọi lại, inbox, chăm sóc khách hàng |
| V6+ N1 và các bước kế tiếp | PlacementCase, one-active-case invariant, identity/profile command, availability/NextAction/outcome và các cầu nối cần thiết | UI chat intake, kênh, queue, CSKH; không để Stage 3 N1 chặn những việc độc lập |
| V7.2 Talent Workbench | Case/handling/interaction outcome/NextAction canonical; thao tác nhập tay tối thiểu, được phép chạy khi CRM down | Inbox, chăm sóc qua chat, routing, SLA hội thoại, nhắc CSKH và dashboard CSKH |
| V7.8 Client CRM | ClientCompany/CrmLead đang có; ClientContact/SalesOpportunity và quan hệ với demand/Placement, business interaction/action commands và read projections khi có nhu cầu thật | `Client CRM Workbench`/commercial engagement UI, pipeline CSKH, liên hệ khách, campaigns; không dựng UI kép trong admin HRP |
| V7.9 Omnichannel | Hợp đồng S2S, auth/permission, canonical command/read APIs, outbox/events, kiểm thử bất biến | Chatwoot, Zalo OA, ACL, ExternalContactLink/ConversationLink/EventReceipt, retry/DLQ, inbox, context panel, delivery/reconciliation dashboard |
| V7.10 Intelligence | Matching/risk trên canonical HRP facts, policy/approval cho command và dữ liệu KPI chuẩn | Tóm tắt chat, draft reply, next-best-action CSKH, trợ lý AI sale/agent, coaching và conversational analytics |

Các mục chuyển sang CRM trong backlog cũ chỉ còn giá trị **tham khảo hợp đồng liên thông**, không phải task thi công ở repo HRP và không nằm trong exit gate HRP. Không xóa mã đang chạy chỉ vì đổi ownership; mọi dời dữ liệu thật về sau cần kế hoạch migration riêng.

## Hiện trạng kiểm chứng tại checkout

- `prisma/schema.prisma` đã có `ClientCompany`, `CrmLead`, `LaborProfile`, `PlacementCase`, `IdempotencyKey`, `OutboxEvent`. Có model `PlacementCase` trong source không đồng nghĩa migration đã triển khai trên production; N1 Stage 3 test branch vẫn chờ credential theo `docs/PLANNER_HANDOVER.md`.
- `PlacementCaseStatus` hiện là `OPEN | IN_PROGRESS | READY_TO_PLACE | CLOSED`. Bộ stage `NEW`…`READY_TO_START`, 9 closeReason, Availability và CurrentRelationship trong CRM Master Plan là **contract đích được Owner chốt**, chưa phải enum/field runtime trong HRP.
- Chưa có `ClientContact`, `SalesOpportunity`, `ClientInteraction`, `ClientNextAction`, `InteractionOutcome`, `NextAction` hay các route `/api/integrations/*` trong checkout tại ngày quyết định. `IdempotencyKey` và `OutboxEvent` đang có không tự chứng minh protocol cross-app/dispatcher đã sẵn sàng.
- AV4 Media Library không phải dịch vụ lưu chứng cứ CCCD nội địa. Không dùng public Vercel Blob/Chatwoot attachment làm kho chứng cứ canonical; residency/gateway cần quyết định và implementation riêng trước khi nhận CCCD production.

## Lộ trình sửa để không làm rồi phá

1. **V6 hiện tại:** hoàn thiện Admin/JobPosting/Media và nghiệp vụ độc lập. Không mở AV6 CMS hay một màn hình CSKH chỉ vì CRM tương lai. N1 Stage 3 vẫn cần chạy trên nhánh Neon test rồi mới xin duyệt migration production; có thể triển khai việc không chạm cùng schema/luồng migration song song.
2. **V6+ bridge:** làm canonical identity/case/handling/placement theo dependency hiện có. Ngay từ đầu, thiết kế command/query/outbox có actor nguồn CRM, permission, idempotency key, expected version và event version; không xây S2S route giả trước khi domain command ổn định.
3. **Gate hợp đồng HRP↔CRM:** pin schemaVersion, command/result/error taxonomy, auth S2S + delegated actor, object-level scope/PII allowlist, receipts và event/outbox semantics bằng fixtures chung. Không cấp CRM quyền DB lõi.
4. **V7.1–V7.7:** tiếp tục Talent Repository → Placement/Workforce → Partner/Beneficiary trong HRP. V7.2 chỉ cần fallback nhập tay và canonical workbench; không chờ Chatwoot. CRM có thể xây UI/mock độc lập, không được ghi canonical bằng mock.
5. **V7.8:** chỉ triển khai business aggregates/commands/projections B2B thật sự cần để nối demand/direct-hire; CRM làm sales/CSKH UI. Giữ `CrmLead != ClientCompany`, `SalesOpportunity != StaffingOrder`.
6. **V7.9:** đây là **integration milestone giữa hai repo**, không phải HRP xây Chatwoot/Zalo. CRM có thể xây UI/adapter/mock song song từ V6+; HRP giao canonical APIs/outbox khi domain sẵn sàng. Gate production tách theo luồng: Talent intake không cần chờ toàn bộ V7.8 B2B hoặc V7.7 Beneficiary; B2B cần contract Client riêng. Chỉ bật luồng tương ứng khi retry, identity review, DNC, outage và reconciliation đã chứng minh được.
7. **V7.10:** HRP tiếp tục matching/operational intelligence dựa trên facts; CRM triển khai AI hội thoại/CSKH trên dữ liệu đã redact, human review và HRP policy gate. AI off vẫn phải vận hành được.

**Điểm cần Owner chốt trước code liên thông:** contract stage/status hiện tại so với target, availability/DNC, actor cho tương tác tự động, Client identity read/resolve, lifecycle của evidence CCCD tại Việt Nam, retention, auth và thứ tự triển khai PR. Không tự suy diễn từ tài liệu CRM thành schema hiện hành.
