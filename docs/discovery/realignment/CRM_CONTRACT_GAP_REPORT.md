# CRM CONTRACT GAP REPORT

Dựa trên yêu cầu P0-C của `HRP_EXECUTION_REALIGNMENT_PLAN.md` và các tài liệu tham chiếu (`docs/V7/HRP_CRM_CONNECTOR.md`, `docs/V7/HRP_CRM_INFRA_SPLIT.md`), báo cáo này đối chiếu khoảng trống (gap) giữa hợp đồng lý thuyết và source code HRP hiện hành.

## 1. Trạng thái repo CRM
- **Truy cập:** Không thể truy cập repo CRM từ workspace hiện tại của HRP. Việc đối chiếu được thực hiện một chiều dựa trên các API và DTO hiện có trong codebase HRP.

## 2. Hợp đồng đã tồn tại (Existing Contracts)
- **Cấu trúc DTO cơ bản:** Codebase HRP hiện đã có các interface/DTo nền tảng tại `src/shared/types` và các DTO liên quan đến Client/Project/JobOpening (thông qua V5/V6).
- **Cấu trúc Auth:** Cơ chế ServerSession và phân quyền nội bộ (RBAC) đã tồn tại, nhưng chưa có luồng cấp quyền Service-to-Service (S2S) chuẩn hóa cho CRM.

## 3. Hợp đồng Target-Only (Chỉ có trong tài liệu)
- **IntegrationEventEnvelope:** Chưa tồn tại trong source code. Việc đóng gói event (như `occurredAt`, `correlationId`, `payload`) chỉ mới được tài liệu hóa.
- **IdempotencyKey cho S2S:** Cơ chế Idempotency hiện tại (trong `shared/integrity/idempotency.ts`) được dùng nội bộ cho API route. Chưa có hợp đồng Idempotency Key chung với hệ thống CRM (ví dụ, ingest contact, interaction event).
- **ActorRef / ConversationRef / ClientContactRef:** Chưa được định nghĩa dưới dạng các interface hoặc DTO chia sẻ rõ ràng. Các tham chiếu đến đối tượng CRM vẫn đang sử dụng ID thô hoặc bị nhúng trực tiếp vào entity.
- **Outbox Pattern cho CRM:** Chưa có implementation Outbox Pattern để đồng bộ bất đồng bộ event sang CRM một cách an toàn (tránh partial failure).

## 4. Xung đột (Conflicts)
- **Sự nhân bản (Duplication):** Các Enum (ví dụ: trạng thái Placement, trạng thái Labor Profile) có nguy cơ bị copy-paste thủ công giữa hai repo thay vì được quản lý tập trung qua một source of truth (NPM package hoặc OpenAPI schema).
- **Xung đột State Machine:** Nếu CRM cố gắng trực tiếp thay đổi trạng thái của PlacementCase hoặc JobOpening thông qua REST API thô mà không thông qua Domain Event, nó sẽ phá vỡ tính toàn vẹn của HRP.

## 5. Quyết định thuộc thẩm quyền Owner
- **Kho lưu trữ Contract:** Owner cần quyết định nơi đặt Source-of-Truth cho Contract (ví dụ: tạo repo `hrp-contracts`, cấu hình OpenAPI generator, hay dùng Monorepo package).
- **S2S Authentication:** Quyết định phương thức xác thực giữa HRP và CRM (ví dụ: mTLS, JWT Service Accounts, hay Preshared Keys).
- **Phân định rõ Boundary:** Dữ liệu nào CRM nắm quyền làm chủ (System of Engagement) và dữ liệu nào HRP làm chủ (System of Record) cần được khóa chặt, đặc biệt trong quy trình Intake và Referral.
