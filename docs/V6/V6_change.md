# HRP V6 Native Foundation — V7 Compatibility Embedded

> **Status:** Tier 0 architecture directive — `APPROVED_FOR_TIER1_DECOMPOSITION`  
> **Updated:** 2026-09-11  
> **Purpose:** Hoàn tất phần còn lại của V6 trên authority đích của V7 để V7 bắt đầu bằng feature work, không phải sửa lại domain V6.  
> **Stable legacy IDs:** Giữ các mã `V6P-*` trong `V6_PLUS_IMPLEMENTATION_BACKLOG.md` để không gãy tham chiếu. Từ đây chúng thuộc **V6 Native Foundation**, không còn là product release V6+ riêng.

---

## 1. Quyết định Tier 0

HRP bỏ V6+ như một phase phát hành riêng và nhúng toàn bộ compatibility work vào phần còn lại của V6. Việc này không cho phép bỏ migration cho hệ thống đang sống. Mọi thay đổi theo chuỗi:

```text
ADD
-> AUDIT CURRENT DATA
-> ADOPT FOR NEW WRITES
-> BACKFILL WHEN TRUTHFUL
-> COMPATIBILITY READ
-> SWITCH AUTHORITY
-> ENFORCE
-> CLEANUP LATER
```

Mục tiêu cuối V6 là public/admin scope hoàn thành, new writes dùng canonical authority V7, legacy data vẫn trung thực và **V6 Native Compatibility Gate** PASS.

## 2. Thẩm quyền tài liệu

Thứ tự áp dụng:

1. `docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md`
2. `docs/V7/AI_CODING_GUARDRAILS.md`
3. `docs/V7/V6_V7_CONFLICT_CHANGE_REGISTER.md`
4. tài liệu này
5. `docs/V7/V7_ARCHITECTURE.md`
6. `docs/V7/V6_PLUS_PLAN.md`
7. `docs/V7/V6_PLUS_IMPLEMENTATION_BACKLOG.md`

`v6-admin-rebuild.md`, `aff_plan.md` và task cũ chỉ còn hiệu lực ở phần không bị các nguồn trên supersede.

## 3. Baseline hiện tại — không phải greenfield

Đã có và phải giữ tương thích:

- `LaborProfile`, `LaborProfileIntake`, `EmploymentEpisode`;
- `CandidateSubmission.laborProfileId` nullable;
- tối đa một `Worker` canonical trên một `LaborProfile` ở schema hiện hành;
- `JobOpening` tách khỏi `JobPosting`;
- public Application, screening, conversion và direct Assignment flow cũ;
- RLS, permission, audit/outbox và idempotency ở một số bounded context;
- migration V6 Phase 1A đã được ghi nhận áp dụng live.

Chưa có authority V7:

- `PlacementCase` và case-aware Application;
- case-scoped `HandlingAssignment` có lịch sử;
- `Placement` độc lập;
- `JobOpening.serviceModel` và Placement snapshot;
- `ProjectAssignment.placementId`;
- create-or-match canonical được mọi intake path sử dụng;
- `JobProposal`, `InteractionOutcome`, `NextAction`;
- current-state selectors, compatibility reads, authority switch và reconciliation.

Do đó cấm gọi bước tiếp theo là “schema override”.

## 4. Domain constitution

```text
LaborProfile != Worker
Application/CandidateSubmission != Placement
JobProposal != Application
Placement != ProjectAssignment
PlacementCase != JobOpening
PlacementCase != EmploymentEpisode
ReferralAttribution != HandlingAssignment
HandlingAssignment != CommissionBeneficiaryDecision
JobOpening != JobPosting
ServiceModel != WorkClassification
Talent Repository != Company Pool
```

Không thêm shortcut authority như `LaborProfile.currentCompanyId`, `isWorking`, `handlerId`, `ownerId`, `poolStatus`, `Worker.currentProjectId` hoặc `ReferralAttribution.currentHandlerId`. Read projection được cache nếu rebuild được từ authority canonical.

## 5. Target aggregates

### 5.1 LaborProfile và identity

Mọi đường Marketplace, staff-assisted, AFF/CTV/Vendor, import và kênh tương lai hội tụ vào:

```text
createOrMatchLaborProfile(input, actor, source, idempotencyKey)
```

Phone hoặc CCCD riêng lẻ không phải identity authority. Kết quả cần phân biệt `EXACT_MATCH`, `POSSIBLE_MATCH`, `NEW`; possible match không auto-merge.

Không thêm scalar `availability` làm authority. V7.1 sở hữu `AvailabilityObservation` có status, availableFrom, observedAt, source, actor và freshness. Không thêm mutable `currentRelationship`; đây là projection từ Worker/Episode/Assignment, client-managed Placement và external observation.

### 5.2 PlacementCase và Application compatibility

```text
LaborProfile 1 -> N PlacementCase
max 1 active PlacementCase / LaborProfile
```

Minimum persistence gồm id, laborProfileId, status, stage, openedAt, closedAt, closeReason, openedByUserId, source, version, createdAt và updatedAt. Invariant một active case phải concurrency-safe bằng partial unique index hoặc transaction/locking tương đương.

Không tạo model `Application` mới chỉ để đổi tên. Persistence V6 tiếp tục là `CandidateSubmission`, thêm `placementCaseId?`. Legacy row có thể NULL; new writes phải resolve/create active case và bảo đảm cùng LaborProfile. General Interest là case có thể chưa có Application. Recruiter suggestion thuộc `JobProposal`, không tạo Application giả.

### 5.3 HandlingAssignment và AFF

Handling là lịch sử responsibility:

```text
PlacementCase 1 -> N HandlingAssignment
max 1 active HandlingAssignment / PlacementCase
```

Minimum persistence gồm id, placementCaseId, handlerUserId, assignmentSource, assignedAt, expiresAt, endedAt, endReason, assignedByUserId, version và createdAt. Không dùng `placementCaseId @unique`; transfer/release kết thúc row cũ và tạo row mới.

Company Pool là projection:

```text
active PlacementCase AND no valid active HandlingAssignment
```

AFF flow:

```text
ReferralAttribution có thể tồn tại trước job-seeking intent
-> PlacementCase mở từ intent hợp lệ
-> policy đủ điều kiện tạo AFF_INITIAL HandlingAssignment
-> expiresAt tính từ PlacementCase.openedAt
```

Hết handling không đổi attribution. Calendar/business days và timezone/calendar còn là Owner decision; Tier 1 phải cô lập policy boundary.

### 5.4 ServiceModel và Placement

Authority nằm trên `JobOpening`:

```text
STAFFING_SUPPLY     -> HRP_MANAGED
LABOR_LEASING       -> HRP_MANAGED
RECRUITMENT_SERVICE -> CLIENT_MANAGED
REFERRAL_SERVICE    -> CLIENT_MANAGED
```

Không lưu mutable `managementMode` song song. Legacy JobOpening dùng nullable/`UNKNOWN` compatibility cho đến khi phân loại; không gán bừa default nghiệp vụ.

`Placement` là attempt/outcome độc lập, cardinality `PlacementCase 1 -> N Placement`. Minimum persistence:

```text
id, laborProfileId, placementCaseId, clientCompanyId
projectId?, jobOpeningId?, serviceModelSnapshot, status
selectedAt?, confirmedAt?, effectiveAt?, failedAt?, failureReason?
sourceApplicationId?, sourceJobProposalId?
confirmationSource?, confirmationEvidence?
createdByUserId, version, createdAt, updatedAt
```

Lifecycle tối thiểu: `SELECTED`, `CONFIRMED`, `EFFECTIVE`, `FAILED`, `CANCELLED`. Correction/void dùng command và audit riêng. Failed/no-show được giữ lịch sử và case có thể quay lại matching.

### 5.5 Workforce bridge

Client-managed:

```text
markClientManagedPlacementEffective
-> Placement EFFECTIVE
-> close case success
-> no Worker / EmploymentEpisode / ProjectAssignment
```

HRP-managed actual start phải atomic:

```text
startHRPManagedPlacement
-> verify actual-start evidence/effectiveAt
-> create or reuse exactly one Worker
-> create EmploymentEpisode khi cần
-> create ACTIVE PRIMARY ProjectAssignment
-> link Assignment to Placement
-> Placement EFFECTIVE
-> close case success
-> audit + outbox cùng transaction
```

Selection/confirmation không tạo Worker lần đầu. No-show không tạo workforce giả. Rehire dùng cùng Worker và Episode mới; continuous transfer đổi Assignment trong cùng Episode; max một ACTIVE PRIMARY Assignment được enforce concurrency-safe.

## 6. Command, query và security boundary

Critical mutations dùng named commands: `createOrMatchLaborProfile`, `open/closePlacementCase`, `createApplication`, `assign/claim/transfer/releaseHandling`, `create/confirm/fail/cancelPlacement`, `markClientManagedPlacementEffective`, `startHRPManagedPlacement`, `transferWorker`, `leaveWorkforce`.

Mỗi command critical phải có command permission, transaction boundary, idempotency, concurrency control, effectiveAt/recordedAt, actor/source/reason, audit/outbox và RLS/data scope. Không generic PATCH critical lifecycle.

Selectors phải tập trung cho active case, current handler, Company Pool, effective availability, current relationship, effective placement count và current workforce. UI không tự ráp authority bằng query rời.

## 7. Migration và compatibility

### 7.1 Discovery trước mutation

Tier 1 tạo read-only audit runner đo LaborProfile/Worker conflicts, possible duplicates, submissions chưa có profile, multiple active Assignment, source/handler/beneficiary coupling, direct-placement semantics, dữ liệu thiếu căn cứ tạo Case/Placement và JobOpening chưa phân loại ServiceModel.

### 7.2 Backfill không bịa lịch sử

Phân loại `EXACT_SAFE`, `POSSIBLE_DUPLICATE`, `UNRESOLVED`. Chỉ backfill khi evidence đủ mạnh; không suy diễn một Submission bằng một Case; không tạo Placement từ Assignment nếu không có provenance; không overwrite referral. Tooling phải dry-run, idempotent/resumable và báo scanned/created/skipped/unresolved/failed.

### 7.3 Authority switch

Luồng cũ `CONVERTED CandidateSubmission -> Worker -> ProjectAssignment` được giữ làm compatibility trong chuyển đổi nhưng không mở rộng. New writes chuyển theo vertical slice sang Placement commands. Selectors đổi authority và reconciliation chạy trước khi vô hiệu đường cũ. Rename/drop destructive để cleanup sau khi V7 paths ổn định.

## 8. Workstreams

Giữ các task ID `V6P-*`:

```text
N0 Contract + audit:
  V6P-000, V6P-001, V6P-009A
N1 Identity + PlacementCase:
  V6P-007A/B, 008, 021, 001A/B, 003, 002A/B, 025A
N2 Handling + AFF:
  V6P-004A/B, 005, 006, 019
N3 ServiceModel + Placement:
  V6P-014A/B, 010A/B, 011, 026A/B
N4 Workforce bridge:
  V6P-022A/B, 023, 013, 012
N5 Operational + security:
  V6P-020A, 027A/B, 016, 017, 018A/B, 025B/C, 009B
N6 Backfill + selector switch:
  V6P-024A/B/C/D/E, 015A/B, 028A/B
N7 Gate:
  V6P-T01..T08 + reconciliation + V6 Native Compatibility Gate
```

Chỉ chạy song song khi dependency đạt và không có hai agent cùng sở hữu `schema.prisma` hoặc migration authority.

## 9. Quan hệ với roadmap V6

| Work item | Quyết định |
|---|---|
| UI04 section-render | Tiếp tục; không đổi lifecycle authority |
| Job Detail UI D.A | Tiếp tục với public DTO; write-path thay đổi chờ N1 |
| AV1 Homepage Settings | Tiếp tục độc lập |
| AV4 Media | Tiếp tục độc lập |
| AV6 Homepage CMS | Sau section-render + AV4 |
| AV2 JobPosting Editor | Editorial shell được chuẩn bị; publish contract phụ thuộc N3 ServiceModel |
| D.B detail editor | Gộp vào AV2 |
| AFF implementation | Phụ thuộc N1 + N2 và Owner clock policy; không dùng timing V6 cũ |
| Assignment/conversion | Không mở rộng direct Assignment authority; phụ thuộc N3 + N4 |
| Commission trong HRP | Freeze calculation legacy; HRP sở hữu beneficiary context, Python sở hữu amount/rate/formula |

## 10. V6 Native Compatibility Gate

Gate chỉ PASS khi:

- canonical create-or-match dùng cho new intake, possible match an toàn, one Worker/profile và referral protection đạt;
- PlacementCase/Application case-aware, max one active case và General Interest đạt;
- case-scoped handling có lịch sử, AFF timing đúng policy, Company Pool projection và attribution bất biến;
- Placement độc lập, client-managed không tạo Worker, HRP-managed actual start atomic, no-show/rehire/transfer/one-primary đúng;
- permission, RLS, idempotency, concurrency, effective/recorded time, audit/outbox và selectors đạt;
- backfill/reconciliation/permanent fixtures PASS và unresolved data được báo thay vì đoán.

V7.1 chỉ mở sau gate này PASS cho các bounded context liên quan.

## 11. Pipeline và audit

- **Tier 0:** domain/policy/strategy; không viết TASK/code.
- **Tier 1:** khảo sát, lập task, code, test, migration evidence; được gọi sub-agent theo partition an toàn.
- **Tier 3 LIGHT:** chỉ audit task quan trọng.

Tier 3 LIGHT bắt buộc cho schema/migration live, identity merge/dedup, lifecycle command, permission/RLS, backfill/authority switch và Compatibility Gate. Docs-only, fixture/demo, style-only hoặc UI thuần dùng `Audit: NONE`.

## 12. Owner decisions còn mở

1. AFF 7 ngày là calendar hay business days; timezone và holiday calendar.
2. Role/permission/scope matrix chi tiết.
3. PII retention/consent policy.
4. Placement failure reason catalog và confirmation evidence policy.
5. WorkClassification catalog chi tiết.
6. Có cần SECONDARY concurrent Assignment sau V7 MVP hay không.

Tier 1 cô lập chúng sau policy/catalog boundary và không tự phát minh.

## 13. Bàn giao Tier 1

Không code toàn bộ tài liệu trong một task. Tier 1 phải:

1. đồng bộ roadmap/cursor;
2. mở N0 read-only contract + migration audit;
3. dùng output thật của N0 để chia N1 thành vertical slices nhỏ;
4. khai báo `Audit: LIGHT|NONE` ngay khi lập task;
5. giữ UI/CMS lane chạy song song theo §9;
6. không mở AFF implementation hoặc mở rộng direct Assignment trước dependency gate.
