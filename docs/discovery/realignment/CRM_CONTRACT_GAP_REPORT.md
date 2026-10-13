# CRM CONTRACT GAP REPORT

Dựa trên yêu cầu P0-C của `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` (§20 HRP↔CRM contract source of truth) và các tài liệu tham chiếu `docs/V7/HRP_CRM_CONNECTOR.md`, `docs/V7/HRP_CRM_INFRA_SPLIT.md`.

**Refreshed baseline SHA:** `a87784229e8f06369082cfcd0e36ec63352dadb7` (origin/main HEAD verified 2026-10-13).
**Supersede baseline cũ:** `1059f6669482efac5b7956ef25d43996ca59d515` (2026-09-21).

Báo cáo READ-ONLY. Đối chiếu một chiều từ HRP sang CRM (CRM repo không thể truy cập từ workspace HRP).

## 1. Trạng thái repo CRM (cập nhật)

- **Truy cập:** Không thể truy cập repo CRM từ workspace HRP hiện tại. Việc đối chiếu là một chiều — chỉ từ HRP codebase.
- **T0 quyết định chưa chốt (2026-10-13):** contract mechanism (NPM package chung / OpenAPI generator / monorepo) và S2S authentication (mTLS / JWT Service Accounts / Preshared Keys) đều chưa được Tier 0 chốt. Discovery này chỉ mô tả gap, không đề xuất implementation.

## 2. Hợp đồng đã tồn tại trong HRP (Existing Contracts)

- **DTO nền tảng nội bộ:** `src/shared/types/` có các DTO cơ bản (Client/Project/JobOpening qua V5/V6). Đây là internal DTO, CHƯA shared với CRM.
- **Auth nội bộ:** `ServerSession` + RBAC nội bộ đã tồn tại. CHƯA có luồng cấp quyền Service-to-Service (S2S) chuẩn hóa cho CRM.
- **Idempotency nội bộ:** `src/shared/integrity/idempotency.ts` dùng cho placement routes (F0/F1) qua `withIdempotency` wrapper keyed by `(route, actorId, key)`. CHƯA có hợp đồng Idempotency Key chung với CRM.

## 3. Hợp đồng Target-Only (chỉ có trong tài liệu — P0-C03..C06)

| ID | Hợp đồng | Trạng thái trong source HRP | Bằng chứng (hoặc INSUFFICIENT_EVIDENCE) |
|---|---|---|---|
| **C03** | `IntegrationEventEnvelope` (occurredAt, correlationId, payload) | `NOT_STARTED` | không tìm thấy file định nghĩa envelope |
| **C04** | Idempotency S2S semantics | `INSUFFICIENT_EVIDENCE` | internal idempotency có ở `src/shared/integrity/idempotency.ts`; chưa có shared S2S contract |
| **C05** | Error taxonomy (canonical codes) | `INSUFFICIENT_EVIDENCE` | placement routes có `SAFE_CODE_MESSAGES` ở `recruiter-workbench.placement-actions.states.ts`; chỉ local |
| **C06** | Initial shared DTOs (ActorRef, ConversationRef, ClientContactRef) | `INSUFFICIENT_EVIDENCE` | HRP internal DTOs ở `src/shared/types`; chưa shared với CRM |

## 4. Outbox Pattern (P0-D03)

- **Outbox table:** `NOT_STARTED` — chưa thấy outbox table hoặc worker code ở main.
- **Retry/dedupe test (P0-D04):** `NOT_STARTED`.

## 5. Xung đột (Conflicts)

- **Duplication:** Enum (Placement status, LaborProfile status) có nguy cơ copy-paste giữa HRP và CRM. Hiện chưa có source-of-truth authority (C02 `NOT_STARTED`).
- **State machine conflict:** Nếu CRM trực tiếp mutate PlacementCase/JobOpening qua REST API thô (không qua Domain Event), phá vỡ tính toàn vẹn HRP. Cần D03 outbox + D02 idempotent S2S để tránh.

## 6. Quyết định thuộc thẩm quyền Owner (T0 chưa chốt 2026-10-13)

| Quyết định | Trạng thái |
|---|---|
| Kho lưu trữ Contract Authority (NPM package chung / OpenAPI / monorepo) | `TBD` — T0 chưa chốt |
| S2S Authentication (mTLS / JWT / Preshared) | `TBD` — T0 chưa chốt |
| System of Engagement (CRM) vs System of Record (HRP) boundary | `TBD` — cần chốt đặc biệt cho Intake + Referral |

## 7. Delta so với baseline cũ

| Hạng mục | Baseline cũ (2026-09-21) | Refreshed (2026-10-13) |
|---|---|---|
| Internal idempotency | chỉ nói "dùng nội bộ" | chi tiết: `src/shared/integrity/idempotency.ts` + `withIdempotency` wrapper keyed `(route, actorId, key)` |
| Safe code messages | chưa nói | `recruiter-workbench.placement-actions.states.ts` có `SAFE_CODE_MESSAGES` ở placement scope |
| Contract authority | "Owner cần quyết định" | T0 (2026-10-13) vẫn chưa chốt |
| S2S auth | "Owner cần quyết định" | T0 (2026-10-13) vẫn chưa chốt |

## Kết luận

- HRP có internal contracts (DTO, idempotency, error codes) nhưng CHƯA shared với CRM.
- P0-C/D là 2 workstream độc lập với P0-A và P0-B. Có thể chạy song song.
- CHƯA có gì trong P0-C/D đủ điều kiện `M3` (CRM Integration Proof).
- T0 cần chốt 2 quyết định (contract mechanism + S2S auth) trước khi mở implementation task P0-C02.

## Liên kết

- Realignment Plan: [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../HRP_EXECUTION_REALIGNMENT_PLAN.md) §20 (P0-C), §21 (P0-D)
- Source evidence:
  - [`src/shared/integrity/idempotency.ts`](../../src/shared/integrity/idempotency.ts)
  - [`src/shared/types/`](../../src/shared/types/)
  - [`src/domains/talent/recruiter-workbench.placement-actions.states.ts`](../../src/domains/talent/recruiter-workbench.placement-actions.states.ts) (SAFE_CODE_MESSAGES)
  - [`docs/V7/HRP_CRM_CONNECTOR.md`](../../V7/HRP_CRM_CONNECTOR.md)
  - [`docs/V7/HRP_CRM_INFRA_SPLIT.md`](../../V7/HRP_CRM_INFRA_SPLIT.md)
- Discovery đồng hành: [`EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md), [`BLOCKER_REGISTER.md`](./BLOCKER_REGISTER.md)
