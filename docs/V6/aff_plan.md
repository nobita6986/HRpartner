# HRP UNIVERSAL AFFILIATE — CANONICAL DESIGN & IMPLEMENTATION PLAN

> **BLOCKED FOR REBASE — 2026-09-11:** Không giao implementation từ plan này
> cho đến khi Tier 1 rebase lên `docs/V6/V6_change.md`. Quy tắc cũ bắt đầu
> handling khi create/match LaborProfile đã bị supersede. Attribution thuộc
> LaborProfile; handling thuộc PlacementCase và bắt đầu khi mở case có
> job-seeking intent hợp lệ. Owner còn phải chốt calendar/business days và
> timezone/calendar cho cửa sổ 7 ngày.

## 0. Control và authority

| Field | Value |
|---|---|
| Document | `docs/V6/aff_plan.md` |
| Design version | `v2.4-rebase-pending` |
| Status | `BLOCKED_FOR_REBASE` — chưa tạo TASK implementation |
| Product owner | Founder / sếp |
| Design owner | Tier 1 Plan + Implementation |
| Updated | `2026-09-11 Asia/Bangkok` |
| Authority | Product intent AFF; domain timing/ownership phụ thuộc V6 Native Foundation |
| Relationship | Độc lập với plan Portal; `UNIFIED_PLAN_v5.md` chỉ là nguồn dependency/domain nền |
| Current implementation gate | Chưa mở; phải đạt Definition of Ready §20 |

### 0.1. Cách dùng tài liệu

- File này giữ product intent, canonical terminology, architecture, dependency, rollout và audit strategy cho Affiliate.
- Không gộp Affiliate vào plan Portal, không dùng tên task Portal/M11 legacy để suy ra trạng thái của feature này.
- Tier 1 rebase file này trước, sau đó chia contract `AFF-*`; mỗi contract vẫn nằm trong `docs/tasks/<slug>/TASK.md`.
- Tier 1 không implement trực tiếp từ file này khi chưa có TASK `READY_FOR_EXECUTION`.
- Tier 3 dùng file này làm design authority để phát hiện contract/implementation đi lệch, nhưng verdict phải bám TASK cụ thể.
- Khi design chưa khóa hết decision gate, trạng thái giữ `DESIGN_REVIEW`; không force-ready.

## 1. Product intent

### 1.1. Outcome

Mỗi người có một bản ghi `User` trong HRP đều có thể sở hữu một affiliate link gắn ổn định với `userId`, không phụ thuộc họ là ADMIN, HR, SALE, PM, ACCOUNTANT, CTV, WORKER, EMPLOYEE hay user thuộc Vendor.

Khi ứng viên đi qua link, nguồn giới thiệu phải được giữ xuyên suốt:

```text
Affiliate User
  → share link
  → first valid click / manual fallback
  → trusted attribution cookie/token (30 ngày)
  → public application
  → create/match LaborProfile
  → ReferralAttribution source snapshot
  → open/resolve PlacementCase từ job-seeking intent
  → initial case-scoped Handling Assignment theo Owner clock policy
  → success hoặc hết hạn → Company Pool projection → manager reassignment
  → qualify/match
  → Placement giữ source Application/Proposal và ServiceModel snapshot
  → effective Placement snapshot CommissionBeneficiaryDecision
  → outbox gửi external Python app tính commission
```

Người chia sẻ link có thể theo dõi số click/apply/convert và ledger của chính mình theo permission. Người xin việc không thấy referrer identity, commission policy hoặc dữ liệu nội bộ.

### 1.2. Product principles

1. **Universal identity:** affiliate owner là `User`, không phải một role đặc biệt.
2. **Attribution before analytics:** bảo toàn nguồn ứng tuyển quan trọng hơn dashboard số click.
3. **Server trust:** client không được quyết định `referrerUserId` hay beneficiary.
4. **First valid source wins:** attribution conflict phải deterministic và audit được.
5. **Commission after milestone:** click/apply/convert không mặc nhiên đồng nghĩa được trả tiền.
6. **History is immutable:** code rotation, role change hoặc deactivation không được sửa ngược lịch sử.
7. **No portal coupling:** UI có thể xuất hiện trong nhiều portal, nhưng domain/API là shared Affiliate.
8. **No fake completion:** có mã/copy link nhưng chưa nối apply hoặc ledger thì feature chưa PASS.
9. **Source is not custody:** người đưa NLD vào HRP và người đang được giao tư vấn là hai quan hệ độc lập.
10. **Custody is not payout:** Handling Assignment hợp lệ xác định beneficiary candidate; tiền chỉ sinh khi milestone/policy đạt.

### 1.3. Non-goals của foundation

- Không làm payment gateway hoặc tự chuyển khoản ngân hàng.
- Không triển khai statutory tax engine cho commission trong foundation.
- Không bắt buộc short URL, QR, campaign marketing hoặc leaderboard ở lát đầu.
- Không thay identity-core/JWT/login hiện hữu.
- Không dùng click count làm bằng chứng duy nhất để trả hoa hồng.
- Không sửa plan Portal để chứa roadmap Affiliate.

## 2. Thuật ngữ canonical

| Thuật ngữ | Định nghĩa |
|---|---|
| Affiliate User | Bất kỳ `User` có `userId`; là chủ link |
| Referrer | Affiliate User được attribution ghi nhận là nguồn đã đưa NLD đến HRP; không mặc nhiên là beneficiary vĩnh viễn |
| Handling Assignee | User đang được giao tư vấn/sắp xếp việc cho một LaborProfile trong khoảng thời gian xác định |
| Beneficiary | User được ghi credit vào commission ledger; derive từ Handling Assignment hợp lệ, milestone, policy và case resolution |
| Applicant | Người tìm việc gửi public application; có thể chưa có User |
| LaborProfile | Hồ sơ canonical của một NLD từ lần để lại thông tin hợp lệ đầu tiên; tồn tại trước hoặc độc lập với Worker |
| Company Pool | Projection gồm PlacementCase active không có Handling Assignment hợp lệ |
| Affiliate Code | Mã public opaque, unique, không chứa PII/role |
| Referral Link | URL chứa Affiliate Code, ví dụ `/r/<code>` |
| Attribution | Bản ghi server-side nối một lượt giới thiệu với referrer |
| Attribution Token | Token ký bởi server, trỏ tới attribution; không phải raw userId |
| First-click | Nguồn hợp lệ đầu tiên trong attribution window |
| Attribution window | 30 ngày của signed cookie/token tính từ first valid click |
| Protected handling window | Bắt đầu khi PlacementCase có job-seeking intent hợp lệ được mở; duration/calendar policy chờ Owner |
| Manual fallback | Applicant nhập code khi browser/in-app flow làm mất cookie và chưa có attribution hợp lệ |
| SourceClaim | Nguồn được giữ sau khi submission convert thành Worker |
| Commission milestone | Sự kiện policy-defined làm phát sinh credit, ví dụ ACTIVE đủ N ngày |
| Analytics click | Event phục vụ thống kê; không phải authority cho attribution/payout |

Tên `ctvId` chỉ mô tả legacy CTV flow. Universal Affiliate dùng khái niệm `referrerUserId`/`beneficiaryUserId`; không gọi mọi User là CTV.

## 3. Hiện trạng đã kiểm chứng tại baseline 25/08/2026

### 3.1. Fact inventory

| ID | Evidence | Fact quan sát được | Kết luận thiết kế |
|---|---|---|---|
| `EV-AFF-01` | `prisma/schema.prisma:141` | `User.affCode String? @unique @map("aff_code")` đã tồn tại | Reuse `affCode`; cấm thêm field thứ hai map cùng cột |
| `EV-AFF-02` | `app/ctv/page.tsx:183-237` | CTV dashboard hiển thị/copy raw `affCode` | UI partial; chưa phải referral link end-to-end |
| `EV-AFF-03` | `app/api/ctv/summary/route.ts:39,72` | API self CTV trả `affCode` | API CTV-specific, không dùng làm shared canonical |
| `EV-AFF-04` | `app/(jobs)/jobs/page.tsx:157-164` | Apply form không capture/send referral | Public frontend chưa attribution-aware |
| `EV-AFF-05` | `app/api/public/jobs/[slug]/applications/route.ts` | ApplyBody/PublicApplyInput không có trusted attribution | Không chỉ sửa UI; route/service contract phải đổi |
| `EV-AFF-06` | migration MP-2 `:168-174` | SECURITY DEFINER RPC ghi `vendor_id=NULL, ctv_id=NULL` | RPC/migration/grants/LIVE tests là dependency bắt buộc |
| `EV-AFF-07` | `CandidateSubmission.ctvId` | Submission chỉ có legacy CTV owner, không có generic referrer snapshot | Cần model/data migration additive |
| `EV-AFF-08` | `SourceClaim` tại schema `:534` | Có `ctvId`, `vendorId`, `claimedBy`; thiếu generic User relation | Schema chưa sẵn sàng cho mọi User |
| `EV-AFF-09` | `conversion.service.ts:186-194` | Conversion tạo accepted SourceClaim nếu submission có `ctvId` | Có logic tái dùng nhưng phải generalize |
| `EV-AFF-10` | `assignment-placement.service.ts:782-798` | Placement không gán `ProjectAssignment.referrerId` | Source bị đứt trước commission |
| `EV-AFF-11` | `engine.service.ts:239-257` | Commission engine đọc `assignment.referrerId`, ghi ledger bằng `ctvId` | Engine đang generic nửa đầu, CTV-specific nửa sau |
| `EV-AFF-12` | `ctv.scope.ts` | SourceClaim/Ledger/Debt/User self-scope chỉ mở cho CTV | Universal self-service cần scope/RLS matrix mới |
| `EV-AFF-13` | task legacy `hrp-portal-m9-affiliate-vendor` | Task chỉ làm dashboard/chart/withdrawal | Không được coi là Affiliate foundation |

### 3.2. Kết luận hiện trạng

Các mảnh đã có: `User.affCode`, submission/source-claim skeleton, assignment `referrerId`, commission policy/ledger và CTV UI. Tuy nhiên call path đang đứt ở capture, RPC, generic relation, placement propagation và beneficiary ledger. Vì vậy trạng thái feature là:

```text
PARTIAL_FOUNDATION / NOT_END_TO_END / NOT_READY_FOR_TASK
```

### 3.3. Những giả định cũ bị loại bỏ

- “Chưa có affiliate code trên User” — sai; `affCode` đã tồn tại.
- “SourceClaim đã đủ schema” — sai với universal User.
- “Chỉ cần sửa public route” — sai vì apply chạy qua SECURITY DEFINER RPC.
- “CTV tự accept claim” — sai quyền và xung đột lợi ích.
- “Accept claim tạo credit ngay” — sai; credit phụ thuộc milestone/policy.
- “Affiliate chỉ dành cho CTV/Worker, SALE làm sau” — sai product intent.
- “Body gửi raw affiliateCode là trusted” — sai security boundary.

## 4. Decision register

### 4.1. Đã chốt

| ID | Decision | Owner/Source | Status |
|---|---|---|---|
| `AFF-DEC-001` | Mọi `User` đều thuộc eligibility universe, không filter theo `SystemRole` | Founder 25/08/2026 | `FINAL` |
| `AFF-DEC-002` | `docs/V6/aff_plan.md` là design/roadmap authority riêng; không gộp plan Portal | Founder 25/08/2026 | `FINAL` |
| `AFF-DEC-003` | Reuse `User.affCode`; không tạo `affiliateCode` map cùng DB column | Current schema | `FINAL` |
| `AFF-DEC-004` | Canonical owner dùng generic User identity | Product intent | `FINAL` |
| `AFF-DEC-005` | Public client không được gửi/trust raw userId/beneficiary | Security invariant | `FINAL` |
| `AFF-DEC-006` | Commission chỉ phát sinh qua versioned policy + milestone | M6/ledger invariant | `FINAL` |
| `AFF-DEC-007` | Analytics click và trusted attribution là hai concern riêng | Data integrity | `FINAL` |
| `AFF-DEC-008` | Attribution hợp lệ đi theo NLD; placement sang job/project khác không đổi referrer/provenance. Beneficiary được quyết định riêng từ Handling Assignment + milestone/policy | Founder 04/09/2026 | `FINAL` |
| `AFF-DEC-009` | Tranh chấp attribution phải tạo Ticket/Case để Trưởng phòng/Giám đốc phân xử; không silently overwrite/delete source history | Founder 04/09/2026 | `FINAL` |
| `AFF-DEC-010` | Signed AFF cookie/token có TTL 30 ngày; first-click hợp lệ thắng trong attribution window | Founder / V4 G13-G15 / 04/09/2026 | `FINAL` |
| `AFF-DEC-011` | Attribution ghi khi create/match; handling bắt đầu khi PlacementCase đủ điều kiện được mở | Tier 0 supersession 11/09/2026 | `SUPERSEDED_BY_V6_NATIVE` |
| `AFF-DEC-012` | Hết handling window, active case vào Company Pool projection; duration/calendar policy chờ Owner | Tier 0 supersession 11/09/2026 | `REBASE_PENDING_OWNER_POLICY` |
| `AFF-DEC-013` | User có Handling Assignment hợp lệ tại milestone là beneficiary candidate; referrer không giữ quyền hưởng hoa hồng vô thời hạn | Founder 04/09/2026 | `FINAL` |
| `AFF-DEC-014` | Ticket/Case có thể mở ngay trong cửa sổ 7 ngày; resolution có thể chuyển/thu hồi/gia hạn quyền xử lý nhưng phải giữ immutable history | Founder 04/09/2026 | `FINAL` |
| `AFF-DEC-015` | Nhân viên HRP có quyền được tạo/hoàn thiện LaborProfile trực tiếp; staff-assisted intake phải preserve attribution/handling đã có | Founder 04/09/2026 | `FINAL` |
| `AFF-DEC-016` | Actor tạo/sửa LaborProfile không tự động trở thành referrer, Handling Assignee hoặc beneficiary | Founder 04/09/2026 | `FINAL` |
| `AFF-DEC-017` | Staff-created profile không có AFF/source hợp lệ dùng typed direct channel và vào Company Pool hoặc được giao bằng command riêng; không auto-assign cho creator | Founder 04/09/2026 | `FINAL` |
| `AFF-DEC-018` | `ReferralAttribution` treo trực tiếp trên `LaborProfile` bằng `laborProfileId` nullable + unique, đóng dấu lúc create/match, tối đa một attribution canonical mỗi profile; `CandidateSubmission`/`SourceClaim` là đường đối chiếu chứ không phải mắt xích bắt buộc — đồng bộ `V6-DEC-029` | Owner 05/09/2026 | `FINAL` |

### 4.2. Đề xuất mặc định — cần Founder xác nhận trước TASK liên quan

| ID | Proposed default | Lý do | Blocks |
|---|---|---|---|
| `AFF-PROP-001` | User inactive giữ code/history nhưng link không tạo attribution mới, không nhận credit mới | Bảo toàn audit, chặn abuse | AFF-01/02 |
| `AFF-PROP-002` | Một code stable/user; không self-rotate ở v1; Admin security rotation có reason | Tránh đứt link và attribution | AFF-01 |
| `AFF-PROP-003` | `RESOLVED` bởi `AFF-DEC-010`: token attribution 30 ngày, first valid source wins | Hợp hành vi tuyển dụng dài ngày | AFF-02 |
| `AFF-PROP-004` | Existing unexpired attribution thắng click/code đến sau | Deterministic, chống hijack | AFF-02 |
| `AFF-PROP-005` | Manual code chỉ dùng khi chưa có attribution hợp lệ | Fallback in-app browser, không override first-click | AFF-02/03 |
| `AFF-PROP-006` | Tự giới thiệu chính mình không tạo commission | Chống fraud; vẫn có thể cho apply | AFF-04/05 |
| `AFF-PROP-007` | Conversion do HR thực hiện có thể auto-accept source nếu không conflict | Convert đã là vetted action | AFF-04 |
| `AFF-PROP-008` | Raw IP không lưu; chỉ hash/prefix có rotating salt và retention ngắn | Privacy/minimization | AFF-02/06 |

## 5. Target architecture

### 5.1. Component flow

```text
Authenticated User
  └─ GET /api/me/affiliate-link
       └─ issue/reuse User.affCode
            └─ share https://<host>/r/<affCode>[?job=<slug>]

GET /r/<code>
  ├─ resolve active User by affCode
  ├─ enforce distributed abuse guard
  ├─ create/reuse ReferralAttribution (first-click rule)
  ├─ optionally append AffiliateClickEvent (analytics only)
  ├─ set signed HttpOnly attribution cookie
  └─ 302 to allow-listed /jobs destination

POST /api/public/jobs/<slug>/applications
  ├─ read signed cookie or signed fallback token
  ├─ server resolve ReferralAttribution
  ├─ call SECURITY DEFINER RPC with attributionId only
  ├─ create/match LaborProfile
  ├─ RPC snapshots trusted referrer facts into CandidateSubmission
  ├─ resolve/open PlacementCase from valid job-seeking intent
  └─ policy may create initial HandlingAssignment(referrer)

Staff-assisted intake / completion
  ├─ mandatory dedup → create-or-match same LaborProfile
  ├─ preserve existing ReferralAttribution + active Handling Assignment
  ├─ record IntakeEvent/updatedBy as audit only
  └─ no AFF source → typed direct channel → Company Pool or explicit manager assignment

Handling workflow before employment
  ├─ success in active assignment → beneficiary candidate
  ├─ expiry → Company Pool
  ├─ manager assigns User for a bounded interval
  └─ dispute at any time → Ticket/Case resolution

QUALIFIED → CONVERTED
  ├─ create/link Worker
  ├─ create accepted generic SourceClaim
  └─ preserve attribution audit chain

Placement activation
  └─ copy accepted referrerUserId into ProjectAssignment.referrerId

Milestone engine
  ├─ resolve beneficiary User from valid Handling Assignment/case resolution
  ├─ apply versioned policy
  ├─ create idempotent CommissionLedger credit
  └─ approve/pay/reverse/debt with audit
```

### 5.2. Trust boundaries

| Boundary | Trusted input | Untrusted input | Rule |
|---|---|---|---|
| Link redirect | DB lookup by opaque code | code/path/query/returnTo | Allow-list redirect; never trust role/userId |
| Attribution cookie | Server signature + DB row | raw cookie/body code | Invalid/expired → no attribution, apply vẫn hoạt động |
| Public apply | Valid attribution ID resolved server-side | applicant JSON/token | RPC re-checks attribution row |
| Staff-assisted profile create/update | Existing attribution + scoped actor + dedup result | form-selected referrer/beneficiary | Editing profile preserves source/handling; assignment is a separate authorized command |
| Handling assignment | LaborProfile + server clock + authorized manager/case resolution | client assignee/expiry | At most one active; every handoff time-bounded and audited |
| Conversion | Scoped HR command + submission snapshot | client referrer field | Client cannot override source |
| Placement | Accepted SourceClaim in transaction | request referrerId | Server derives referrer |
| Commission | Handling Assignment + placement + policy/version/milestone | beneficiary/amount from client | Server derives beneficiary and amount; idempotent ledger |

## 6. Canonical data model

### 6.1. Reuse `User.affCode`

Không thêm `affiliateCode`. `affCode` cần được chuẩn hóa bằng migration/backfill riêng:

- Unique, opaque, URL-safe, tối thiểu 96 bits entropy; không dùng 8 ký tự ngắn làm security boundary.
- Không encode phone, userId, role, vendor hoặc timestamp dễ đoán.
- Issuance idempotent: user đã có code thì trả code cũ.
- Collision retry bounded và có metric; không fallback sequence.
- Code rotation tạo audit và trạng thái alias/revocation; không silently reuse code cũ cho user khác.

### 6.2. `ReferralAttribution` — authority cho first-click

Thiết kế đề xuất, tên/enum cuối cùng do TASK khóa:

```prisma
model ReferralAttribution {
  id                    String   @id @default(uuid())
  referrerUserId        String   @map("referrer_user_id")
  affiliateCodeSnapshot String   @map("affiliate_code_snapshot")
  channel               String   @default("AFFILIATE_LINK")
  projectId             String?  @map("project_id")
  jobSlugSnapshot       String?  @map("job_slug_snapshot")
  firstClickedAt        DateTime @map("first_clicked_at")
  expiresAt             DateTime @map("expires_at")
  status                String   @default("ACTIVE")
  requestFingerprintHash String? @map("request_fingerprint_hash")
  laborProfileId        String?  @unique @map("labor_profile_id")
  consumedAt            DateTime? @map("consumed_at")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  referrer     User          @relation("ReferralOwner", fields: [referrerUserId], references: [id])
  laborProfile LaborProfile? @relation(fields: [laborProfileId], references: [id])

  @@index([referrerUserId, firstClickedAt])
  @@index([status, expiresAt])
  @@map("referral_attributions")
}
```

`status` dự kiến: `ACTIVE | CONSUMED | EXPIRED | REVOKED | SUPERSEDED`.

**Tầng của attribution đã chốt `05/09/2026` — `AFF-DEC-018` = `V6-DEC-029`.** Bản `v2.2` để hở đúng chỗ đắt nhất:
model không có `laborProfileId`, trong khi `V6-DEC-018` tính bảo hộ 7 ngày **từ lúc create/match LaborProfile** và
§10.3 lại đặt attribution **dưới** `CandidateSubmission`. Hai cách đọc loại trừ nhau, và chúng gặp nhau ngay ở AFF-01.

Quyết định và hàm ý của nó:

1. Attribution **treo trên `LaborProfile`**, không trên submission. Đường qua submission vỡ ở hai ca có thật: General Interest (`V6-DEC-010`) không có submission nào, và profile do nhân viên tạo trực tiếp (`V6-DEC-022`) cũng không.
2. `laborProfileId` **nullable** vì rò tự nhiên: row sinh lúc click, khi chưa có profile nào. `consumedAt` là mốc đóng dấu, tức mốc `ACTIVE → CONSUMED`.
3. `@unique` trên `laborProfileId` cho **tối đa một attribution canonical mỗi profile** (đúng 0..1 ở `v6-admin-rebuild.md` §4.9/§5.8). Postgres cho nhiều `NULL` trên cột unique, nên ràng buộc này không chặn các row chưa đóng dấu.
4. Link AFF mới tới một profile **đã có** attribution không ghi đè và không khởi động lại đồng hồ 7 ngày (`v6-admin-rebuild.md` §9.6 mục 11). Row thứ hai không được âm thầm biến mất: nó đi vào `SUPERSEDED` — vốn từ này thêm vào `v2.3` chính vì chỗ này. Không có nó thì một cả lớp row sẽ mắc kẹt ở `ACTIVE` và chỉ số attribution sai âm thầm.
5. `AFF-OQ-03` (một attribution → nhiều application) trở thành **đúng về cấu trúc** theo mặc định đã đề xuất: mọi submission của cùng profile chia sẻ cùng một attribution. Founder vẫn giữ quyền tick ô ấy ở §20; quyết định này không tự tick hộ.

TASK vẫn phải khóa tên cột, vốn enum và thứ tự migration; nhưng **cardinality thì đã chốt**, không còn là câu hỏi mở.

### 6.3. CandidateSubmission snapshot

Submission cần snapshot tối thiểu, không chỉ raw code:

```text
referrerUserId          nullable FK User
referralAttributionId   nullable FK ReferralAttribution
referralCodeSnapshot    nullable string
referralCapturedAt      nullable timestamptz
referralChannel         nullable typed value
referrerRoleSnapshot    nullable string (audit only, không dùng authorize)
```

Snapshot không được trả trong public tracking projection. Role snapshot chỉ giải thích lịch sử; commission policy không được resolve lại bằng role hiện tại nếu policy yêu cầu snapshot tại milestone.

### 6.4. SourceClaim generalization

Thêm `referrerUserId` relation generic. Không tái sử dụng `claimedBy` vì field đó không có FK/semantic đủ chặt. Legacy `ctvId`/`vendorId` được giữ additive trong compatibility window.

```text
claimType: USER_REFERRAL | VENDOR_SUPPLIED | HRP_DIRECT
registrationChannel: AFF_USER | MANUAL_USER | ...
referrerUserId: generic User FK
ctvId: legacy mirror only khi referrer role = CTV
accepted: unique accepted source/worker theo backstop hiện hữu
```

### 6.5. Assignment và commission beneficiary

- `ProjectAssignment.referrerId` đã tồn tại; cần relation/index và phải server-derive từ accepted SourceClaim trong placement transaction. Field này giữ **nguồn**, không đủ để quyết định beneficiary sau khi hồ sơ đã được giao lại.
- `CommissionLedger.ctvId`, CommissionDebt và withdrawal hiện CTV-specific. Migration universal dùng additive `beneficiaryUserId`, backfill từ `ctvId`, dual-read/write có thời hạn, rồi chuyển RLS/API/UI.
- Không rename/drop cột trong cùng migration foundation. Removal chỉ ở cleanup task sau khi compatibility evidence PASS.

#### 6.5.1. `HandlingAssignment` — responsibility theo PlacementCase

Tên model cuối cùng do TASK khóa; semantic tối thiểu:

```text
id
placementCaseId
assigneeUserId
assignedByUserId nullable          # null/system cho AFF_INITIAL
source: AFF_INITIAL | MANAGER_ASSIGNMENT | CASE_RESOLUTION
startsAt
expiresAt
status: ACTIVE | COMPLETED | EXPIRED | TRANSFERRED | REVOKED
reason nullable
previousAssignmentId nullable
completedMilestoneId nullable
createdAt / updatedAt / version
```

Bất biến:

- Tối đa một Handling Assignment `ACTIVE` trên một PlacementCase tại một thời điểm, có DB backstop; LaborProfile có thể có nhiều case lịch sử.
- `AFF_INITIAL` bắt đầu khi PlacementCase đủ điều kiện được mở; duration/calendar policy do Owner chốt.
- Hết hạn đưa active case vào Company Pool projection; server-clock query phải coi row quá `expiresAt` là hết hiệu lực ngay cả khi scheduler trễ.
- Giao lại/gia hạn/chuyển/thu hồi tạo transition có actor và audit; không sửa ngược history.
- Beneficiary candidate được snapshot từ assignment hợp lệ tại milestone; client không truyền beneficiary.
- ReferralAttribution gốc không bị xóa hoặc đổi khi Handling Assignment thay đổi.

Operational success cho việc giao xử lý tối thiểu là NLD bắt đầu ProjectAssignment thực tế. User xử lý được snapshot làm beneficiary candidate tại đó; commission policy có thể yêu cầu thêm milestone giữ việc đủ `N` ngày trước khi post ledger credit.

#### 6.5.2. Staff-assisted intake không được chiếm nguồn

- Public self-service và staff-assisted form phải gọi chung một create-or-match LaborProfile/dedup authority.
- Nếu profile đã có ReferralAttribution hoặc Handling Assignment active, nhân viên hoàn thiện dữ liệu chỉ tạo audit/update event; không thay đổi hai relation đó.
- `createdByUserId`/`updatedByUserId` là provenance của thao tác dữ liệu, không phải source hoặc commission fact.
- Nếu profile mới không có AFF/source hợp lệ, tạo typed direct intake (`HRP_DIRECT`, phone, relationship, partner...) và đưa vào Company Pool; muốn giao cho người nhập phải chạy command Handling Assignment riêng có quyền/thời hạn.
- Nếu nhân viên khai một User khác là người giới thiệu, phải resolve qua attribution/manual-source command có evidence và Referral Guard; không nhận raw beneficiary trong profile payload.

### 6.6. Click analytics tách khỏi attribution

`AffiliateClickEvent` là optional analytics table, không quyết định beneficiary:

```text
id, attributionId, referrerUserId, projectId/jobSlug snapshot,
clickedAt, fingerprintHash, userAgentFamily, botDisposition
```

Không lưu raw IP/full user-agent vô thời hạn. Có retention job, bot filtering và aggregate metrics. Foundation có thể chỉ ghi `ReferralAttribution`; click-event chi tiết để AFF Analytics phase.

## 7. Affiliate code issuance và shared self-service

### 7.1. Issuance lifecycle

Recommended flow:

1. Khi tạo User: service cố gắng cấp `affCode` trong cùng hoặc transaction kế tiếp có retry.
2. Existing User chưa có code: lazy issuance khi gọi `/api/me/affiliate-link`, đồng thời có backfill job/admin script cho rollout.
3. API idempotent: gọi nhiều lần trả cùng code/link.
4. User inactive vẫn giữ code để truy vết; link resolution theo `AFF-PROP-001`.
5. Rotation không mở self-service ở v1. Admin rotation cần permission, reason, audit và alias/revocation strategy.

Không dùng seed để cập nhật production users. Seed chỉ tạo fixture giả; production backfill phải là migration-safe script/job có checkpoint, batch size, collision retry và dry-run.

### 7.2. Shared API

Canonical API không mang tên CTV:

#### `GET /api/me/affiliate-link`

Auth: mọi authenticated User. Server lấy `ctx.userId`; không nhận userId từ query/body.

```json
{
  "affiliateCode": "8K4D2M7Q9X3R5T6V8W2Y",
  "link": "https://hrpartner.vn/r/8K4D2M7Q9X3R5T6V8W2Y",
  "status": "ACTIVE"
}
```

Response không trả phone, role, commission rate hoặc beneficiary internals.

#### `POST /api/admin/affiliate/users/:userId/actions/rotate-code` — deferred/controlled

- Chỉ role/permission được TASK cho phép.
- Body bắt buộc `reason` và idempotency key.
- Response không lộ token signing secret.
- Rotation policy phải xử lý link cũ (`ALIAS_UNTIL` hoặc `REVOKED_AT`), không đổi code im lặng.

### 7.3. Shared UI

- Component dùng chung: link, copy, share, trạng thái, hướng dẫn và fallback code.
- Có thể mount trong profile/menu của mọi portal; domain không đặt dưới `app/ctv/**`.
- Copy phải copy full canonical URL, không chỉ code.
- UI có loading/empty/error/inactive/copied/unsupported-share states.
- Web Share API là progressive enhancement; clipboard fallback bắt buộc.
- Không hiển thị commission estimate nếu chưa có ledger/policy thật.

## 8. Redirect, first-click và token protocol

### 8.1. Canonical redirect route

Sử dụng Route Handler GET, không dùng POST hoặc page render để set cookie:

```text
GET /r/:code?job=<public-job-slug>
```

Server steps:

1. Validate syntax/length; constant-shape response cho invalid/not-found/inactive để giảm enumeration signal.
2. Resolve `User.affCode` và trạng thái theo policy.
3. Validate `job`/destination bằng allow-list; cấm arbitrary `returnTo`/open redirect.
4. Đọc existing signed attribution cookie.
5. Nếu existing attribution còn hiệu lực: giữ first source; click mới không overwrite.
6. Nếu chưa có: create `ReferralAttribution`, ký token chứa attribution ID + expiry + key version.
7. Set cookie và redirect 302/303 tới `/jobs` hoặc public job destination thật.
8. Analytics event nếu bật feature flag; lỗi analytics không làm mất attribution chính.

### 8.2. Cookie/token contract

Đề xuất cookie `hrp_aff`:

| Attribute | Value đề xuất |
|---|---|
| Value | Signed opaque token, không phải raw code/userId |
| `HttpOnly` | true |
| `Secure` | true ở deployed env |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Max-Age` | 30 ngày (`2,592,000` giây), theo `AFF-DEC-010` |
| Domain | host-only mặc định; chỉ mở parent domain nếu có ADR cross-subdomain |

Token payload tối thiểu: `attributionId`, `exp`, `iat`, `keyVersion`. Server luôn lookup DB row; chữ ký hợp lệ không đủ nếu row expired/revoked/referrer invalid.

TTL 30 ngày chỉ điều khiển attribution capture trên browser. Khi LaborProfile được tạo/match, protected handling window 7 ngày là đồng hồ server-side riêng và không được gia hạn bởi việc cookie vẫn còn hoặc NLD click/apply lại.

Signing secret/key rotation nằm trong runtime secret manager; không lưu repo, DB log hoặc response.

### 8.3. In-app browser và manual fallback

Fallback precedence đề xuất:

```text
valid existing HttpOnly cookie
  > valid signed referralToken propagated from redirect
  > manually entered affiliate code when no valid attribution exists
  > PUBLIC/no referrer
```

- Body có thể mang `referralToken` đã ký; **không nhận raw `referrerUserId`**.
- Nếu hỗ trợ manual code, server tạo attribution at-apply-time rồi mới gọi public RPC.
- localStorage chỉ được giữ signed public fallback token, không giữ PII/secret/raw identity.
- Click sau không được hijack first-click hiện hữu.

### 8.4. Concurrency và idempotency

- Hai request click đồng thời cần deterministic winner; dùng DB constraint/advisory key hoặc cookie/session strategy được TASK chứng minh.
- Hai apply cùng idempotency key phải replay cùng submission/referrer snapshot.
- Nếu cùng idempotency key nhưng attribution/payload khác, trả mismatch; không silently đổi beneficiary.
- Duplicate application guard vẫn là authority; attribution không tạo submission thứ hai để đổi referrer.

## 9. Public apply và SECURITY DEFINER integration

### 9.1. Không chỉ sửa route

Change surface bắt buộc:

1. Public job UI/fallback token propagation.
2. `ApplyBody` chỉ nhận optional signed `referralToken`, không nhận trusted raw code/userId.
3. `PublicApplyInput` nhận server-resolved `referralAttributionId` hoặc trusted context type.
4. Idempotency payload/hash khóa referral snapshot theo decision.
5. `application.service.ts` validate context.
6. Migration thay `hrp_public_apply_submission` signature/body.
7. Function ACL: revoke/grant/owner least privilege như MP-2.
8. Clean DB + upgrade DB + LIVE RLS/RPC tests.
9. Public tracking DTO tiếp tục loại referral/PII.

### 9.2. Recommended RPC contract

RPC nên nhận `p_referral_attribution_id`, không nhận `p_referrer_user_id` từ public transport.

Trong SECURITY DEFINER function:

1. Lock/lookup attribution row.
2. Re-check `ACTIVE`, expiry, referrer existence/eligibility.
3. Lấy server-side `referrerUserId`, code snapshot, channel, capturedAt.
4. Insert CandidateSubmission với snapshot trong cùng transaction.
5. Mark/relate attribution theo cardinality đã chốt.
6. Idempotent replay trả submission đã lưu; không re-resolve sang referrer mới.

Invalid/expired referral không được làm lộ user tồn tại. Product default đề xuất: application vẫn được nhận như `PUBLIC`, có internal audit reason; forged token không được gắn attribution.

### 9.3. Response/privacy

Public response giữ:

```json
{ "trackingCode": "APP-...", "status": "NEW" }
```

Không trả `submissionId`, attribution ID, referrer name/userId, affiliate code, claim hoặc commission facts.

## 10. Conversion, SourceClaim và Assignment propagation

### 10.1. Conversion invariant

Khi `QUALIFIED → CONVERTED`:

- Server đọc submission snapshot, không nhận referrer override từ client.
- Nếu attribution hợp lệ và không conflict: tạo `SourceClaim` generic trong cùng transaction với Worker link.
- Conversion của HR là vetted action; đề xuất claim `accepted=true` nếu unique accepted-source backstop cho phép.
- Nếu worker đã có accepted source khác: fail/route qua Referral Guard + authorized manual override; không silently steal source.
- Direct/vendor/referral source mapping phải typed và test đủ.
- Audit ghi submission, worker, attribution, old/new source, actor và override reason; không ghi PII dư thừa.

CTV/referrer không tự accept claim của mình. Manual accept/reject chỉ thuộc authorized HR/Admin flow và cần maker/conflict rule theo TASK.

### 10.2. Placement invariant

Khi activate placement:

1. Re-read accepted SourceClaim trong placement transaction.
2. Derive generic `referrerUserId`.
3. Gán `ProjectAssignment.referrerId` server-side cùng create assignment.
4. Không cho request body truyền/override referrer.
5. Assignment replay/idempotent path phải giữ cùng referrer.
6. Đồng thời re-read Handling Assignment hợp lệ của PlacementCase tạo ra Placement để snapshot beneficiary candidate; referrer và beneficiary có thể khác nhau sau khi hết cửa sổ/bàn giao.
7. Nếu referrer hoặc handling assignee inactive trước placement, xử theo policy/case resolution; không tự đoán hoặc tự chuyển beneficiary.

### 10.3. Traceability chain

Mỗi beneficiary decision/outbox phải trace ngược được:

```text
CommissionBeneficiaryDecision
  → effective Placement
  → PlacementCase
  → HandlingAssignment
  → User (beneficiary)
  → LaborProfile
  → ReferralAttribution          (qua ReferralAttribution.laborProfileId — AFF-DEC-018)
  → User (referrer/source)
  → external Python calculation reference (nếu đã xử lý)
```

Đường **đối chiếu**, không bắt buộc, dùng để kiểm tra chéo và để đọc lịch sử theo từng lượt ứng tuyển:

```text
LaborProfile
  → CandidateSubmission / accepted SourceClaim
  → referrer snapshot tại thời điểm apply
```

Sửa `05/09/2026` theo `AFF-DEC-018`: bản `v2.2` đặt `CandidateSubmission / accepted SourceClaim` **trong** chuỗi bắt buộc.
Chuỗi ấy đứt ở hai ca có thật — General Interest không có submission, và profile do nhân viên tạo trực tiếp cũng không —
nên commission engine sẽ skip **oan** đúng những ca mà `V6-DEC-010` và `V6-DEC-022` mở ra.

Nếu một mắt xích **bắt buộc** bị null ngoài trường hợp PUBLIC/direct được định nghĩa, commission engine phải skip có typed reason và metric; không đoán bằng phone hoặc `findFirst()`. Mắt xích trên đường đối chiếu bị null thì **không** phải lý do skip.

### 10.4. Attribution đi theo NLD và cơ chế tranh chấp

- Job/project trên link hoặc application chỉ là điểm vào; attribution hợp lệ gắn với hành trình NLD đến HRP.
- Khi NLD được placement sang một Job/Project khác, server tiếp tục giữ cùng accepted SourceClaim/referrer; không tạo nguồn mới theo Project đích.
- ReferralAttribution giữ provenance; Handling Assignment giữ quyền/trách nhiệm xử lý có thời hạn; Commission Ledger snapshot beneficiary khi milestone đạt. Ba relation không được đồng nhất.
- Khi mở PlacementCase đủ điều kiện, referrer có thể nhận Handling Assignment `AFF_INITIAL` theo policy. Hết hạn thì active case vào Company Pool projection, không xóa attribution.
- Lãnh đạo giao lại bằng Handling Assignment mới có thời hạn; User được giao có thể là referrer cũ hoặc User khác.
- Không route/client nào được phép truyền `referrerUserId`, `assigneeUserId` hoặc `beneficiaryUserId` mới chỉ vì thay đổi placement.
- Nếu có tranh chấp, hệ thống tạo Ticket/Case tham chiếu tối thiểu ReferralAttribution, LaborProfile, CandidateSubmission và Handling Assignment; sau convert có thể tham chiếu thêm Worker/SourceClaim/ProjectAssignment.
- Resolver nghiệp vụ là Trưởng phòng hoặc Giám đốc theo RBAC được task sau khóa cụ thể.
- Ticket phải có claimant, referrer nguồn, assignee/beneficiary hiện tại, assignee/beneficiary được đề nghị, reason, evidence, resolution và append-only history.
- Ticket được mở cả khi protected 7-day window còn hiệu lực; resolution có thể giữ, chuyển, thu hồi hoặc gia hạn quyền xử lý.
- Quyết định không xóa attribution gốc. Nếu đổi beneficiary, tạo resolution/superseding claim có audit chain; nếu đã có credit tài chính thì dùng reversal/compensating entry.
- Ticket schema hiện tại bắt buộc `workerId` và chưa có actor `DIRECTOR`, vì vậy không được mặc định tái dùng `Ticket.type=OTHER`; task AFF phải chọn generalize Case hoặc tạo subtype chuyên biệt.

## 11. Commission, debt và withdrawal generalization

### 11.1. Eligibility vs payout

- Mọi User có thể sở hữu link và trở thành referrer.
- Mọi User được lãnh đạo giao LaborProfile hợp lệ đều có thể trở thành beneficiary, dù không phải referrer ban đầu.
- HRP chỉ snapshot `CommissionBeneficiaryDecision` khi Placement đạt milestone phù hợp; external Python app sở hữu amount/rate/formula/tier calculation.
- HRP policy chỉ quyết định beneficiary context, milestone eligibility, effective period và correction evidence; không tính tiền.
- Không hard-code theo role; nếu business muốn role/group khác rate, đó là policy data có version.
- Click/apply/convert count chỉ là funnel metrics, không trực tiếp là amount.

### 11.2. Additive compatibility migration

Đề xuất rollout dữ liệu:

1. Thêm `beneficiaryUserId` nullable vào CommissionLedger/Debt/Withdrawal liên quan.
2. Backfill từ legacy `ctvId` với FK validation.
3. Dual-write qua một canonical service, không rải `.ctvId ?? beneficiary` ở routes.
4. Migrate scope/RLS/API/DTO/UI sang beneficiary generic.
5. Enforce backstop/index/idempotency trên beneficiary.
6. Chỉ cleanup `ctvId` ở task sau khi production compatibility evidence đủ.

### 11.3. Credit idempotency

Canonical uniqueness cần bao gồm tối thiểu:

```text
beneficiaryUserId + workerId + assignmentId + milestone + policyVersion
```

Month/year có thể là reporting dimensions nhưng không được là lớp chống duplicate duy nhất nếu milestone có thể chạy lại qua kỳ. Reversal tham chiếu original credit; không update amount lịch sử.

### 11.4. Self-service visibility

- `/api/me/affiliate/ledger` self-scope theo `ctx.userId` cho mọi User.
- Dashboard CTV hiện hữu trở thành projection/consumer, không phải canonical API.
- Admin/accounting có scoped list/approve/pay/reverse theo permission.
- Applicant/public không bao giờ thấy ledger.
- Withdrawal/payout destination cần generic user payout profile hoặc manual accounting workflow; không ép mọi user vào CtvWithdrawalRequest vĩnh viễn.

## 12. API surface đề xuất

| Method/Path | Actor | Purpose | Notes |
|---|---|---|---|
| `GET /api/me/affiliate-link` | Authenticated User | issue/reuse self link | server-derived userId |
| `GET /r/:code` | Public | capture attribution + redirect | signed cookie, allow-listed destination |
| `GET /api/me/affiliate/stats` | Authenticated User | self funnel aggregates | no applicant PII |
| `GET /api/me/affiliate/referrals` | Authenticated User | safe self referrals | projection, pagination |
| `GET /api/me/affiliate/ledger` | Authenticated User | self commission ledger | generic beneficiary scope |
| `POST /api/admin/affiliate/users/:id/actions/rotate-code` | Authorized Admin | controlled rotation | reason + idempotency |
| `POST /api/public/jobs/:slug/applications` | Public | apply with trusted attribution | optional signed referralToken only |

Không tạo cặp API cạnh tranh `/api/ctv/affiliate-*` cho cùng nghiệp vụ. Legacy CTV routes có thể delegate shared service trong compatibility window.

## 13. Security, privacy và abuse model

| Risk | Required control | Required evidence |
|---|---|---|
| Guess/enumerate code | ≥96-bit entropy; constant-shape invalid response; distributed rate limit | mutation + load/rate tests |
| Forge referrer | signed token + DB lookup; no raw userId trust | forged/tampered token tests |
| Attribution hijack | first-click precedence; expiry/revoke rules; no late overwrite | two-referrer race matrix |
| Open redirect | allow-list path/slug; reject external URL/scheme | redirect security tests |
| Cookie theft/replay | HttpOnly/Secure/SameSite, expiry, key rotation, DB status | browser/header tests |
| Self-referral | compare canonical identities after conversion; policy deny/override audit | self-referral cases |
| Duplicate applicant | phone normalization + existing duplicate guard + accepted-source unique | LIVE duplicate/race tests |
| Click inflation | analytics idempotency/bot disposition/distributed rate limit | shared-IP/bot tests |
| PII leakage | no referrer facts in public response; hashed/minimized request metadata | response/log scan |
| Cross-user IDOR | generic self RLS/L1 scope for all roles | 13-role DB matrix |
| Commission duplicate | DB unique/idempotency + short transaction | concurrent milestone test |
| Commission theft | beneficiary derived from assignment/source chain | client override negative test |
| Secret exposure | signing key only runtime secret; masked evidence | repo/log scan |

### 13.1. Data retention

- ReferralAttribution giữ theo business/audit retention vì nối tới submission/claim.
- Click analytics giữ ngắn hơn và aggregate trước khi xóa chi tiết.
- Raw IP không lưu mặc định. Nếu compliance yêu cầu, phải có purpose, retention và access policy riêng.
- Token hash/key version có thể giữ; raw signing secret không lưu DB.
- Deletion/anonymization của applicant không được phá financial audit chain; dùng snapshot tối thiểu/pseudonymization.

## 14. Standalone AFF roadmap

> Đây là roadmap riêng của `aff_plan.md`. Các mã dưới đây là design slices, chưa phải TASK slug. Tier 1 chỉ tạo TASK sau khi §20 PASS.

### AFF-00 — Design decisions và baseline freeze (đang thực hiện)

| Deliverable | Nội dung | Exit gate |
|---|---|---|
| Product decisions | TTL, first-click, inactive, self-referral, rotation, project link, manual fallback, payout policy | Không còn open decision làm đổi schema/flow |
| Baseline evidence | Schema/routes/RPC/RLS/commission call path | File:line và method kiểm chứng đầy đủ |
| Data authority | Generic referrer/beneficiary model | Founder/Tier 1 chốt |
| Migration outline | Additive/backfill/compat/cleanup | Không destructive, rollback rõ |
| Test architecture | Unit/LIVE/browser/security/migration | Safe DB prerequisites rõ |

### AFF-01 — Universal identity và data foundation

**Scope dự kiến:**

- Reuse/harden `User.affCode`; issuance service và backfill tool.
- Add `ReferralAttribution` và generic submission/source/assignment relations tối thiểu.
- Additive beneficiary columns cho financial models nếu dependency yêu cầu trong slice; có thể tách AFF-05 nếu blast radius lớn.
- Index/FK/unique constraints, RLS policy skeleton, audit event vocabulary.

**Exit gate:** mọi User fixture có stable code; collision/backfill/re-run idempotent; clean/upgrade DB migration PASS; không đổi public behavior.

### AFF-02 — Link capture và shared self-service

**Scope dự kiến:**

- `GET /api/me/affiliate-link` và shared UI component.
- `GET /r/:code`, signed cookie/token, allow-listed redirect.
- First-click/expiry/inactive/rotation/manual fallback rules.
- Minimal ReferralAttribution persistence; analytics event optional/deferred.

**Exit gate:** hai user cạnh tranh cho một browser cho deterministic winner; forged code/token không đổi owner; mọi role authenticated lấy đúng self link; public invalid link không leak identity.

### AFF-03 — Public apply attribution boundary

**Scope dự kiến:**

- Job board fallback token/manual UI nếu đã chốt.
- Apply route/service/idempotency payload.
- SECURITY DEFINER RPC migration + ACL/owner.
- CandidateSubmission trusted snapshot.
- Staff-assisted create/complete path preserve source and use same LaborProfile dedup authority.
- Public projection/privacy.

**Exit gate:** click → apply tạo đúng referrer snapshot trên LIVE test DB; nhân viên hoàn thiện cùng profile không đổi attribution/handling; staff-created direct profile không auto-credit creator; replay giữ source; invalid/expired/forged token fail safe; anonymous direct apply vẫn PUBLIC; direct INSERT vẫn bị RLS chặn.

### AFF-04 — Conversion, SourceClaim và Assignment propagation

**Scope dự kiến:**

- Generic SourceClaim mapping and accepted-source conflict handling.
- Referral Guard/manual override/audit.
- Placement derives assignment referrer in transaction.
- End-to-end traceability API nội bộ cho auditor/admin nếu cần.

**Exit gate:** apply → qualify → convert → place giữ cùng referrer; duplicate/existing worker không steal claim; request cannot override referrer; audit chain complete.

### AFF-05A — LaborProfile handling, Company Pool và dispute

**Scope dự kiến:**

- Case-scoped `HandlingAssignment` history model + at-most-one-active DB backstop.
- Auto-assign chỉ khi PlacementCase đủ điều kiện được mở, theo Owner clock policy.
- Expiry theo server clock, Company Pool projection, manager assignment có thời hạn và lịch sử giao nhận.
- Ticket/Case cho tranh chấp trong/ngoài 7 ngày; maker/resolver RBAC và immutable resolution.
- Admin UI: người đang phụ trách, thời gian còn lại, nguồn giao, kho chung và hành động phân phối.

**Exit gate:** cookie 30 ngày và handling 7 ngày chạy bằng hai đồng hồ độc lập; expiry đưa đúng profile vào pool; hai manager không thể giao chồng; client không tự gán assignee; case transfer giữ attribution/history; scheduler chậm không làm row quá hạn tiếp tục có hiệu lực.

### AFF-05B — Universal commission beneficiary

**Scope dự kiến:**

- `CommissionBeneficiaryDecision` snapshot theo effective Placement, có source/handler evidence.
- Idempotent beneficiary correction/dispute và transactional outbox sang external Python app.
- RLS/scoped repository/API/DTO chỉ hiển thị entitlement context được phép.
- Existing ledger/amount flow là legacy compatibility; không mở rộng calculation trong HRP.

**Exit gate:** effective Placement tạo đúng beneficiary decision/outbox; referrer
khác beneficiary vẫn trace đủ; retry không duplicate; correction có audit;
cross-user IDOR bị chặn; HRP không tính amount/rate/formula.

### AFF-06 — Analytics, dashboard và abuse hardening

**Scope dự kiến:**

- Click/apply/convert aggregates, safe conversion rate.
- Shared dashboard and portal projections.
- Bot/rate controls, retention/anonymization, observability.
- QR/short link/project campaigns chỉ khi Founder ưu tiên.

**Exit gate:** stats khớp source rows, không ảnh hưởng attribution authority, không lộ applicant PII, retention job và dashboards có evidence.

### AFF-07 — Rollout, operations và cleanup

**Scope dự kiến:** feature flags, dark launch, backfill production-safe runbook, monitoring, incident/rollback, legacy CTV compatibility cleanup.

**Exit gate:** staged rollout metrics ổn định; restore/rollback rehearsal; no legacy dual-write drift; cleanup chỉ sau audit riêng.

### 14.1. Dependency graph

```text
AFF-00
  → AFF-01
      → AFF-02
          → AFF-03          ← cần V6 Native N1 create-or-match + PlacementCase
              → AFF-04
                  → AFF-05A ← cần V6 Native N2 HandlingAssignment
                      → AFF-05B
                          → AFF-06
                              → AFF-07
```

AFF-06 analytics có thể chuẩn bị song song sau AFF-02, nhưng không được gọi complete trước khi apply/convert/commission facts canonical. AFF-05B phụ thuộc AFF-05A và M6 policy decisions nhưng không được nhét roadmap này vào Portal.

**Sửa `05/09/2026` — điểm nhập lại giữa lane AFF và lane V6 là `AFF-03`, không phải `AFF-05A`.** Bản `v2.2` chỉ khai
"AFF-05A phụ thuộc V6 LaborProfile". Nhưng exit gate của **AFF-03** đòi nguyên văn hai câu:
*"nhân viên hoàn thiện cùng profile không đổi attribution/handling"* và
*"staff-created direct profile không auto-credit creator"*.
Cả hai câu đọc/ghi **`LaborProfile`, `PlacementCase` và `HandlingAssignment`**, tức cần V6 Native N1/N2.
Nghĩa là lane AFF chạm lane V6 sớm hơn **hai slice** so với bản đồ cũ. Ba hệ quả không thương lượng:

1. `AFF-03` không mở được trước V6 Native N1; handling workflow không mở trước N2.
2. Hai lane cùng ghi một `prisma/schema.prisma` dưới một thứ tự migration, nên thứ tự merge là ràng buộc thật, không phải sở thích.
3. Nếu chọn tách: hai câu ấy chuyển sang AFF-05A và exit gate AFF-03 phải khai `LIM-*` rõ ràng là nó **chưa** phủ hai ca đó.
   Không được để một exit gate xanh trong khi hai ca nó tên chưa từng chạy.

## 15. Migration, backfill và compatibility strategy

### 15.1. Migration discipline

- Additive-first: add table/nullable columns/index concurrently-compatible; không drop/rename trực tiếp.
- Mỗi schema slice có migration clean DB và upgrade-from-current evidence.
- Prisma schema, raw SQL/RLS/function signature và generated client phải đồng bộ.
- Không dùng `prisma migrate reset`; không apply/seed production từ agent.
- Role provisioning/owner change là OP gate có owner rõ; migration không `CREATE ROLE` nếu contract vận hành tách role.
- DB LIVE test dùng `DATABASE_URL_TEST`/admin test target an toàn; thiếu env là `ENV_BLOCKED`.

### 15.2. Existing User code backfill

Backfill tool phải:

1. Có dry-run và chỉ báo count, không in PII/code đầy đủ.
2. Chọn batch/keyset pagination, restartable checkpoint.
3. Chỉ update `affCode IS NULL`.
4. Generate cryptographic random code với collision retry.
5. Không đổi code đã có, kể cả CTV demo/legacy, trừ conflict invalid được audit.
6. Verify uniqueness/count trước và sau.
7. Có rollback strategy theo inserted code set/audit batch, không xóa lịch sử tùy tiện.

### 15.3. CTV compatibility

- Existing `ctvId` rows backfill sang generic referrer/beneficiary khi FK User hợp lệ.
- Trong compatibility window, một canonical adapter dual-writes; route không tự chọn field.
- Metrics so sánh generic vs legacy counts/amounts; mismatch chặn cleanup.
- `app/ctv` dùng shared `/api/me` services dần; không giữ business logic fork.
- Cleanup legacy columns/routes là task riêng sau production observation window.

### 15.4. RPC versioning

Vì PostgreSQL function overload theo signature:

- Migration phải drop/revoke hoặc version function có chủ đích; tránh để cả signature cũ/mới cùng EXECUTE ngoài ý muốn.
- Re-apply `REVOKE FROM PUBLIC`, owner `hrp_public_rpc`, minimal grants.
- Rollback biết app version nào gọi signature nào.
- Audit test enumerate function overloads và ACL thật.

## 16. Feature flags và rollout

Đề xuất flags độc lập:

| Flag | Tác dụng |
|---|---|
| `AFFILIATE_LINK_ISSUANCE_ENABLED` | Cho User lấy/share link |
| `AFFILIATE_CAPTURE_ENABLED` | Ghi ReferralAttribution/cookie |
| `AFFILIATE_APPLY_ENABLED` | Snapshot attribution vào submission |
| `AFFILIATE_COMMISSION_ENABLED` | Cho engine tạo credit |
| `AFFILIATE_ANALYTICS_ENABLED` | Ghi click events/dashboard |

Rollout stages:

1. **Schema dark:** migration/backfill, flags off.
2. **Internal dogfood:** link/capture cho allow-list test users, payout off.
3. **Attribution dark launch:** capture/apply/source chain on, commission off; so sánh audit.
4. **Commission shadow:** tính expected credit nhưng không post ledger; reconcile.
5. **Controlled payout:** bật credit cho cohort, manual approval.
6. **General availability:** mọi User theo policy.
7. **Cleanup:** sau observation window và audit.

Rollback ưu tiên tắt flag; không xóa attribution/submission/ledger history. Financial credit sai phải reversal, không delete/update amount.

## 17. Test và audit strategy

### 17.1. Unit/contract tests

- Code generation entropy/format/collision retry/idempotency.
- Token sign/verify/expiry/key version/tamper.
- First-click precedence, same/different referrer, expiry/revocation.
- Redirect allow-list và open-redirect payloads.
- Manual fallback precedence.
- Apply payload/idempotency hash với attribution.
- Source mapping and accepted-source conflict.
- Policy/milestone/amount/rounding/idempotency/reversal.
- DTO projection không lộ PII/referrer cho public.

### 17.2. LIVE database integration

Minimum matrix:

1. User ở nhiều role đều có self link; User A không đọc stats/ledger User B.
2. Link A → apply → submission referrer A.
3. Link A rồi link B trong TTL → A thắng.
4. Expired A rồi link B → B thắng nếu decision cho phép.
5. Forged/tampered/unknown/inactive code → no attribution, no identity leak.
6. Same idempotency key replay → one submission, same referrer.
7. Same key + changed referrer/payload → mismatch, no reassignment.
8. Convert race → one Worker/accepted SourceClaim.
9. Existing accepted source → conflict/override path, no steal.
10. Placement copies source once; client referrer override ignored/denied.
11. Concurrent milestone evaluation → one credit.
12. Cross-user ledger/claim/stats IDOR → zero rows/404.
13. Direct runtime-role INSERT/UPDATE bypass → RLS deny.
14. SECURITY DEFINER function ACL/owner/overload đúng.

LIVE evidence không được mock hoặc fallback dev/prod. Fixture phải giả, cleanup trong `finally`, không in credentials/PII.

### 17.3. Browser/E2E

- Copy/share full link trên desktop/mobile.
- Link mở từ new browser session, redirect đúng `/jobs`.
- Apply trong same session giữ attribution.
- In-app browser fallback token/manual code theo decision.
- Cookie blocked/expired/tampered states.
- User dashboard loading/empty/error/inactive/ledger states.
- Applicant success/tracking không hiện referrer.
- Screenshot/accessibility cho shared component.

Không waiver browser evidence bằng cách ghi “PASS”. Nếu Founder chấp nhận thiếu evidence, ghi waiver và residual risk riêng.

### 17.4. Migration/upgrade tests

- Clean schema apply.
- Upgrade từ current schema có legacy affCode/ctv ledger rows.
- Backfill rerun idempotent.
- Constraint validation and index presence.
- Rollback/app-version compatibility rehearsal.
- No orphan referral/beneficiary FK.

### 17.5. Tier 3 mandatory focus

Ngoài checklist C-01..C-10, auditor phải spot-check:

- Client không thể chọn beneficiary.
- RPC hardcodes/ACL cũ không còn đường attribution bypass.
- Generic User scope không vô tình mở toàn bộ User table cho 13 roles.
- Analytics failure không rollback application; attribution failure không gắn sai source.
- Commission chỉ từ canonical assignment/source/policy chain.
- No raw IP/token/aff code leak trong log/evidence.

## 18. Observability và operational metrics

Metrics không chứa PII:

```text
affiliate_link_issue_total{result}
affiliate_redirect_total{result}
affiliate_attribution_total{channel,result}
affiliate_apply_total{attributed}
affiliate_convert_total{attributed}
affiliate_source_conflict_total{reason}
affiliate_credit_total{result,milestone}
affiliate_token_invalid_total{reason}
affiliate_backfill_total{result}
```

Logs có correlation ID/attribution ID rút gọn hoặc hash; không log raw code/token/cookie/phone/IP. Alerts cho token-invalid spike, source conflict spike, dual-write mismatch và duplicate-credit constraint violation.

## 19. File/change impact inventory dự kiến

> Đây là blast-radius guide, không phải quyền cho Tier 2 sửa tất cả trong một task.

| Area | Candidate files/modules |
|---|---|
| Schema/migration | `prisma/schema.prisma`, additive migrations, RLS/function SQL |
| Affiliate domain | `src/domains/affiliate/*` mới: code, attribution, token, projection |
| Auth/scope | `src/shared/auth/scopes/*`, `withAuthorizedDb`, RLS context/policies |
| Shared self API | `app/api/me/affiliate-*` hoặc nested equivalent |
| Redirect | `app/r/[code]/route.ts` |
| Public apply | jobs page, public applications route, application service/helpers, MP-2 RPC |
| Conversion | `conversion.service.ts`, SourceClaim/referral guard |
| Placement | `assignment-placement.service.ts` |
| Commission | engine/policy/ledger/debt/withdrawal services and DTOs |
| UI | shared affiliate component plus portal mounts |
| Tests | unit, route, LIVE DB, migration, browser/security |
| Operations | backfill/runbook/feature flags/metrics |

## 20. Definition of Ready — trước khi Tier 1 tạo TASK đầu tiên

- [ ] Founder chốt hoặc chấp nhận proposed defaults `AFF-PROP-001..008`.
- [ ] `AFF-OQ-03` — Quyết định one attribution → one hay many applications.
- [ ] `AFF-OQ-09` — Quyết định generic withdrawal/payout UX cho non-CTV User.
- [ ] Data model reviewed: no duplicate `aff_code`, generic FK and compatibility path rõ.
- [ ] RPC versioning/migration/role owner strategy khả thi trên test DB.
- [ ] Phase/task boundaries đủ nhỏ; không một TASK ôm schema + RPC + commission + dashboard.
- [ ] Mỗi slice có dependency, stop condition, rollback và LIVE evidence target.
- [ ] Universal role/RLS matrix được xác định; không CTV-only API làm canonical.
- [ ] Self-referral/duplicate/override/policy decisions không giao cho Tier 2.
- [ ] `AFF-OQ-01` — User inactive: giữ history/code, deny attribution và credit mới (Founder; chặn AFF-01/02).
- [ ] `AFF-OQ-04` + `AFF-OQ-05` — hình dạng link (một base link mỗi user, job slug optional không đổi owner) và quyền rotate code (Admin-controlled ở v1) (Founder; chặn AFF-01/02).
- [ ] `AFF-OQ-06` + `AFF-OQ-08` — self-referral apply được nhưng commission ineligible có audit reason, và manual code fallback khi không có valid first-click token (Founder; chặn AFF-02/03/04/05).
- [ ] `AFF-OQ-07` — auto-accept affiliate claim khi convert nếu không conflict (Founder/Tier 1; chặn AFF-04).
- [ ] `AFF-OQ-10` — milestone/rate/cap qua versioned commission policy, không hard-code (Founder/Accounting; chặn AFF-05).
- [ ] `AFF-OQ-11` — analytics retention: detail 30–90 ngày, aggregate dài hơn, không lưu raw IP (Founder/Privacy; chặn AFF-06).
- [ ] `AFF-OQ-12` — thời hạn lượt giao thủ công sau khi profile vào Company Pool, có biên min/max cấu hình, không vô thời hạn (Founder; chặn AFF-05A).
- [ ] `aff_plan.md` chuyển từ `DESIGN_REVIEW` sang `DESIGN_ACCEPTED` bởi Founder/Tier 1.

Mở rộng `05/09/2026`: danh sách tăng từ `10` lên `17` ô. Bản `v2.2` có `10` ô nhưng §22 có `12` hàng `AFF-OQ` với
`1` `RESOLVED` (`AFF-OQ-02`) ⇒ `11` câu còn mở, và checklist chỉ chở `2` trong số đó (`AFF-OQ-03` ở ô hai,
`AFF-OQ-09` ở ô ba). Nghĩa là tick hết `10` ô rồi mở AFF-01 thì **chín câu chưa trả lời vẫn nằm nguyên trong đường đi**,
trong đó `AFF-OQ-12` đúng là thứ chặn AFF-05A.

**Luật tài liệu:** mọi hàng `AFF-OQ` chưa `RESOLVED` phải có ít nhất một ô trong danh sách này. §20 lệch §22 là
**lỗi tài liệu**, không phải chi tiết bỏ qua được — vì §20 là thứ duy nhất chặn cửa Tier 1.

Chỉ sau checklist này Tier 1 mới tạo TASK đầu tiên. Không dùng tên `M11-AFF`; namespace đề xuất `hrp-v5-aff-01-*`, `hrp-v5-aff-02-*` để tránh task Portal legacy.

## 21. Hướng dẫn cho từng tier khi bước vào execution

### Tier 1

- Tạo một contract cho một slice AFF; không copy toàn bộ plan vào một TASK.
- Khóa `RQ → STEP → AC`, migration owner, decision và stop condition.
- Dẫn chiếu section của file này; kiểm tra code baseline mới nhất.
- Không sửa source/HANDOFF/AUDIT.
- Resolve finding theo gate nhẹ; không biến waiver thành evidence PASS.

### Tier 2

- Preflight TASK/baseline/worktree/test DB trước khi sửa.
- Không tự đổi generic model về CTV-only để giảm scope.
- Dừng nếu cần schema/dependency/secret/OP action ngoài contract.
- Evidence thật, secrets masked, HANDOFF kết đúng status.
- Không tự audit hoặc tự ghi ACCEPTED.

### Tier 3

- Audit call path end-to-end, không chỉ UI/copy link.
- Chạy LIVE security/RLS/RPC/concurrency khi TASK yêu cầu.
- Kiểm tra migration clean + upgrade, diff scope, PII/log/secret.
- Viết AUDIT độc lập; không sửa source/TASK/HANDOFF.

## 22. Open decisions

| ID | Question | Recommended default | Owner | Blocks |
|---|---|---|---|---|
| `AFF-OQ-01` | User inactive có giữ link hoạt động không? | Giữ history/code, deny new attribution/credit | Founder | AFF-01/02 |
| `AFF-OQ-02` | `RESOLVED` — Attribution cookie/token TTL bao lâu? | 30 ngày theo `AFF-DEC-010` | Founder | AFF-02 |
| `AFF-OQ-03` | Một attribution dùng cho nhiều application trong TTL? | Có, mỗi submission snapshot cùng referrer; duplicate guard vẫn áp dụng | Founder | AFF-02/03 |
| `AFF-OQ-04` | Link chung hay theo job/project? | Một base link/user; optional job slug không đổi owner | Founder | AFF-02 |
| `AFF-OQ-05` | User tự rotate code được không? | Không ở v1; Admin controlled rotation | Founder | AFF-01 |
| `AFF-OQ-06` | Self-referral xử lý thế nào? | Apply được nhưng commission ineligible, audit reason | Founder | AFF-04/05 |
| `AFF-OQ-07` | Claim affiliate auto-accept khi convert? | Có nếu không conflict; convert là HR-vetted | Founder/Tier 1 | AFF-04 |
| `AFF-OQ-08` | Manual code fallback có mở không? | Có khi không có valid first-click token | Founder | AFF-02/03 |
| `AFF-OQ-09` | Non-CTV rút/nhận tiền bằng UI nào? | Generic payout profile + accounting approval; không dùng tên CTV | Founder/Accounting | AFF-05 |
| `AFF-OQ-10` | Milestone/rate/cap mặc định? | Versioned commission policy; không hard-code trong design | Founder/Accounting | AFF-05 |
| `AFF-OQ-11` | Analytics retention? | Detail 30–90 ngày, aggregate dài hơn; no raw IP | Founder/Privacy | AFF-06 |
| `AFF-OQ-12` | Lượt giao thủ công sau khi profile vào Company Pool dài bao lâu? | Lãnh đạo chọn trong biên min/max cấu hình; không cho vô thời hạn | Founder | AFF-05A |

## 23. Definition of Done toàn feature

Universal Affiliate chỉ được tuyên bố hoàn tất khi:

1. Mọi User đủ điều kiện lấy được stable link self-scope.
2. First-click/manual fallback deterministic, signed và audit được.
3. Public apply snapshot đúng referrer qua SECURITY DEFINER RPC.
4. Conversion tạo đúng accepted SourceClaim, không steal existing source.
5. Placement giữ referrer server-derived.
6. Referrer được giao 7 ngày từ lúc create/match LaborProfile; hết hạn profile về Company Pool và mọi giao lại có thời hạn/audit.
7. Milestone tạo đúng một generic beneficiary credit từ Handling Assignment/case resolution theo versioned policy.
8. Self dashboard/ledger an toàn cho mọi role; cross-user IDOR fail closed.
9. Clean/upgrade migration, backfill, rollback và LIVE DB evidence PASS.
10. Browser path, in-app fallback, token/cookie/privacy/security evidence đủ.
11. Feature flags/metrics/runbook sẵn sàng; không PII/secret trong log.
12. Mọi AFF task `ACCEPTED` theo pipeline và phase review không còn P0/P1.

## 24. Revision log

| Version | Date | Change |
|---|---|---|
| `v2.3` | 2026-09-05 | Chốt tầng của `ReferralAttribution` là `LaborProfile` (`AFF-DEC-018` = `V6-DEC-029`) và sửa traceability chain §10.3 theo nó; sửa dependency graph §14.1 vì AFF-03 phụ thuộc V6 LaborProfile **và** Handling Assignment, không chỉ AFF-05A; mở rộng Definition of Ready §20 từ `10` lên `17` ô để phủ hết `AFF-OQ` còn mở, kể cả `AFF-OQ-12`. |
| `v2.2` | 2026-09-04 | Đổi đường tài liệu sang `docs/V6/aff_plan.md`. |
| `v2.1` | 2026-09-04 | Chốt tách ba semantic: cookie attribution 30 ngày, Handling Assignment bảo vệ 7 ngày từ LaborProfile, và beneficiary theo người xử lý thành công; thêm Company Pool, giao lại có thời hạn và dispute trong cửa sổ bảo vệ. |
| `v2.0` | 2026-08-25 | Viết lại thành canonical standalone Universal Affiliate plan: sửa inventory sai, dùng mọi User, generic referrer/beneficiary, trusted first-click, RPC boundary, propagation, commission, migration, rollout và tier audit gates. |
| `v1.0` | 2026-08-25 | Bản khảo sát ban đầu, CTV-specific; superseded vì sai `affCode`, thiếu generic attribution/RPC/assignment/commission chain. |
