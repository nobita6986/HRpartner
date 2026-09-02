# HRP UNIVERSAL AFFILIATE — CANONICAL DESIGN & IMPLEMENTATION PLAN

## 0. Control và authority

| Field | Value |
|---|---|
| Document | `docs/aff_plan.md` |
| Design version | `v2.0` |
| Status | `DESIGN_REVIEW` — chưa tạo TASK, chưa giao Tier 2 |
| Product owner | Founder / sếp |
| Design owner | Tier 1 Planner |
| Updated | `2026-08-25 Asia/Bangkok` |
| Authority | Nguồn thiết kế và roadmap triển khai **chính** của Universal Affiliate |
| Relationship | Độc lập với plan Portal; `UNIFIED_PLAN_v5.md` chỉ là nguồn dependency/domain nền |
| Current implementation gate | Chưa mở; phải đạt Definition of Ready §20 |

### 0.1. Cách dùng tài liệu

- File này giữ product intent, canonical terminology, architecture, dependency, rollout và audit strategy cho Affiliate.
- Không gộp Affiliate vào plan Portal, không dùng tên task Portal/M11 legacy để suy ra trạng thái của feature này.
- Tier 1 đọc file này để chia contract `AFF-*`; mỗi contract vẫn phải nằm trong `docs/tasks/<slug>/TASK.md` theo pipeline.
- Tier 2 không implement trực tiếp từ file này khi chưa có TASK `READY_FOR_EXECUTION`.
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
  → trusted attribution
  → public application
  → CandidateSubmission snapshot
  → qualify/convert
  → accepted SourceClaim
  → ProjectAssignment referrer
  → milestone evaluation
  → CommissionLedger beneficiary
  → approve/pay/reverse có audit
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
| Referrer | Affiliate User được attribution chọn cho một submission |
| Beneficiary | User được ghi credit vào commission ledger; thường bằng referrer nhưng phải snapshot/audit |
| Applicant | Người tìm việc gửi public application; có thể chưa có User |
| Affiliate Code | Mã public opaque, unique, không chứa PII/role |
| Referral Link | URL chứa Affiliate Code, ví dụ `/r/<code>` |
| Attribution | Bản ghi server-side nối một lượt giới thiệu với referrer |
| Attribution Token | Token ký bởi server, trỏ tới attribution; không phải raw userId |
| First-click | Nguồn hợp lệ đầu tiên trong attribution window |
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
| `AFF-DEC-002` | `docs/aff_plan.md` là design/roadmap authority riêng; không gộp plan Portal | Founder 25/08/2026 | `FINAL` |
| `AFF-DEC-003` | Reuse `User.affCode`; không tạo `affiliateCode` map cùng DB column | Current schema | `FINAL` |
| `AFF-DEC-004` | Canonical owner dùng generic User identity | Product intent | `FINAL` |
| `AFF-DEC-005` | Public client không được gửi/trust raw userId/beneficiary | Security invariant | `FINAL` |
| `AFF-DEC-006` | Commission chỉ phát sinh qua versioned policy + milestone | M6/ledger invariant | `FINAL` |
| `AFF-DEC-007` | Analytics click và trusted attribution là hai concern riêng | Data integrity | `FINAL` |

### 4.2. Đề xuất mặc định — cần Founder xác nhận trước TASK liên quan

| ID | Proposed default | Lý do | Blocks |
|---|---|---|---|
| `AFF-PROP-001` | User inactive giữ code/history nhưng link không tạo attribution mới, không nhận credit mới | Bảo toàn audit, chặn abuse | AFF-01/02 |
| `AFF-PROP-002` | Một code stable/user; không self-rotate ở v1; Admin security rotation có reason | Tránh đứt link và attribution | AFF-01 |
| `AFF-PROP-003` | Token attribution 30 ngày, first valid source wins | Hợp hành vi tuyển dụng dài ngày | AFF-02 |
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
  └─ RPC snapshots trusted referrer facts into CandidateSubmission

QUALIFIED → CONVERTED
  ├─ create/link Worker
  ├─ create accepted generic SourceClaim
  └─ preserve attribution audit chain

Placement activation
  └─ copy accepted referrerUserId into ProjectAssignment.referrerId

Milestone engine
  ├─ resolve beneficiary User + versioned policy
  ├─ create idempotent CommissionLedger credit
  └─ approve/pay/reverse/debt with audit
```

### 5.2. Trust boundaries

| Boundary | Trusted input | Untrusted input | Rule |
|---|---|---|---|
| Link redirect | DB lookup by opaque code | code/path/query/returnTo | Allow-list redirect; never trust role/userId |
| Attribution cookie | Server signature + DB row | raw cookie/body code | Invalid/expired → no attribution, apply vẫn hoạt động |
| Public apply | Valid attribution ID resolved server-side | applicant JSON/token | RPC re-checks attribution row |
| Conversion | Scoped HR command + submission snapshot | client referrer field | Client cannot override source |
| Placement | Accepted SourceClaim in transaction | request referrerId | Server derives referrer |
| Commission | Assignment + policy/version/milestone | amount from client | Server calculates; idempotent ledger |

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
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  referrer User @relation("ReferralOwner", fields: [referrerUserId], references: [id])

  @@index([referrerUserId, firstClickedAt])
  @@index([status, expiresAt])
  @@map("referral_attributions")
}
```

`status` dự kiến: `ACTIVE | CONSUMED | EXPIRED | REVOKED`. “Consumed” không nhất thiết ngăn nhiều application nếu product cho phép một lượt chia sẻ dẫn nhiều apply; TASK phải khóa cardinality trước migration.

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

- `ProjectAssignment.referrerId` đã tồn tại; cần relation/index và phải server-derive từ accepted SourceClaim trong placement transaction.
- `CommissionLedger.ctvId`, CommissionDebt và withdrawal hiện CTV-specific. Migration universal dùng additive `beneficiaryUserId`, backfill từ `ctvId`, dual-read/write có thời hạn, rồi chuyển RLS/API/UI.
- Không rename/drop cột trong cùng migration foundation. Removal chỉ ở cleanup task sau khi compatibility evidence PASS.

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
| `Max-Age` | bằng attribution TTL sau khi Founder chốt |
| Domain | host-only mặc định; chỉ mở parent domain nếu có ADR cross-subdomain |

Token payload tối thiểu: `attributionId`, `exp`, `iat`, `keyVersion`. Server luôn lookup DB row; chữ ký hợp lệ không đủ nếu row expired/revoked/referrer invalid.

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
6. Nếu referrer inactive sau attribution nhưng trước placement, xử theo policy snapshot; không tự chuyển người hưởng.

### 10.3. Traceability chain

Mỗi credit phải trace ngược được:

```text
CommissionLedger
  → ProjectAssignment
  → accepted SourceClaim
  → CandidateSubmission
  → ReferralAttribution
  → User (referrer/beneficiary)
```

Nếu một mắt xích bị null ngoài trường hợp PUBLIC/direct được định nghĩa, commission engine phải skip có typed reason và metric; không đoán bằng phone hoặc `findFirst()`.

## 11. Commission, debt và withdrawal generalization

### 11.1. Eligibility vs payout

- Mọi User có thể sở hữu link và trở thành referrer.
- Credit chỉ được tạo khi assignment đạt milestone theo policy active/effective-dated.
- Policy quyết định milestone, amount/formula, cap, eligibility, effective period, approval và reversal.
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
- Public projection/privacy.

**Exit gate:** click → apply tạo đúng referrer snapshot trên LIVE test DB; replay giữ source; invalid/expired/forged token fail safe; anonymous direct apply vẫn PUBLIC; direct INSERT vẫn bị RLS chặn.

### AFF-04 — Conversion, SourceClaim và Assignment propagation

**Scope dự kiến:**

- Generic SourceClaim mapping and accepted-source conflict handling.
- Referral Guard/manual override/audit.
- Placement derives assignment referrer in transaction.
- End-to-end traceability API nội bộ cho auditor/admin nếu cần.

**Exit gate:** apply → qualify → convert → place giữ cùng referrer; duplicate/existing worker không steal claim; request cannot override referrer; audit chain complete.

### AFF-05 — Universal commission beneficiary

**Scope dự kiến:**

- `beneficiaryUserId` additive migration/backfill/compat.
- Generic commission policy resolution, milestone credit, idempotency/reversal/debt.
- RLS/scoped repository/API/DTO self visibility cho mọi User.
- Accounting approve/pay flow; generic withdrawal/payout decision.

**Exit gate:** milestone tạo đúng một credit cho referrer User bất kỳ role; concurrent retry không duplicate; reversal/debt đúng; cross-user ledger IDOR bị chặn; no fake estimate.

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
          → AFF-03
              → AFF-04
                  → AFF-05
                      → AFF-06
                          → AFF-07
```

AFF-06 analytics có thể chuẩn bị song song sau AFF-02, nhưng không được gọi complete trước khi apply/convert/commission facts canonical. AFF-05 phụ thuộc M6 policy decisions nhưng không được nhét roadmap này vào Portal.

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
- [ ] Quyết định one attribution → one hay many applications.
- [ ] Quyết định generic withdrawal/payout UX cho non-CTV User.
- [ ] Data model reviewed: no duplicate `aff_code`, generic FK and compatibility path rõ.
- [ ] RPC versioning/migration/role owner strategy khả thi trên test DB.
- [ ] Phase/task boundaries đủ nhỏ; không một TASK ôm schema + RPC + commission + dashboard.
- [ ] Mỗi slice có dependency, stop condition, rollback và LIVE evidence target.
- [ ] Universal role/RLS matrix được xác định; không CTV-only API làm canonical.
- [ ] Self-referral/duplicate/override/policy decisions không giao cho Tier 2.
- [ ] `aff_plan.md` chuyển từ `DESIGN_REVIEW` sang `DESIGN_ACCEPTED` bởi Founder/Tier 1.

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
| `AFF-OQ-02` | Attribution TTL bao lâu? | 30 ngày | Founder | AFF-02 |
| `AFF-OQ-03` | Một attribution dùng cho nhiều application trong TTL? | Có, mỗi submission snapshot cùng referrer; duplicate guard vẫn áp dụng | Founder | AFF-02/03 |
| `AFF-OQ-04` | Link chung hay theo job/project? | Một base link/user; optional job slug không đổi owner | Founder | AFF-02 |
| `AFF-OQ-05` | User tự rotate code được không? | Không ở v1; Admin controlled rotation | Founder | AFF-01 |
| `AFF-OQ-06` | Self-referral xử lý thế nào? | Apply được nhưng commission ineligible, audit reason | Founder | AFF-04/05 |
| `AFF-OQ-07` | Claim affiliate auto-accept khi convert? | Có nếu không conflict; convert là HR-vetted | Founder/Tier 1 | AFF-04 |
| `AFF-OQ-08` | Manual code fallback có mở không? | Có khi không có valid first-click token | Founder | AFF-02/03 |
| `AFF-OQ-09` | Non-CTV rút/nhận tiền bằng UI nào? | Generic payout profile + accounting approval; không dùng tên CTV | Founder/Accounting | AFF-05 |
| `AFF-OQ-10` | Milestone/rate/cap mặc định? | Versioned commission policy; không hard-code trong design | Founder/Accounting | AFF-05 |
| `AFF-OQ-11` | Analytics retention? | Detail 30–90 ngày, aggregate dài hơn; no raw IP | Founder/Privacy | AFF-06 |

## 23. Definition of Done toàn feature

Universal Affiliate chỉ được tuyên bố hoàn tất khi:

1. Mọi User đủ điều kiện lấy được stable link self-scope.
2. First-click/manual fallback deterministic, signed và audit được.
3. Public apply snapshot đúng referrer qua SECURITY DEFINER RPC.
4. Conversion tạo đúng accepted SourceClaim, không steal existing source.
5. Placement giữ referrer server-derived.
6. Milestone tạo đúng một generic beneficiary credit theo versioned policy.
7. Self dashboard/ledger an toàn cho mọi role; cross-user IDOR fail closed.
8. Clean/upgrade migration, backfill, rollback và LIVE DB evidence PASS.
9. Browser path, in-app fallback, token/cookie/privacy/security evidence đủ.
10. Feature flags/metrics/runbook sẵn sàng; không PII/secret trong log.
11. Mọi AFF task `ACCEPTED` theo pipeline và phase review không còn P0/P1.

## 24. Revision log

| Version | Date | Change |
|---|---|---|
| `v2.0` | 2026-08-25 | Viết lại thành canonical standalone Universal Affiliate plan: sửa inventory sai, dùng mọi User, generic referrer/beneficiary, trusted first-click, RPC boundary, propagation, commission, migration, rollout và tier audit gates. |
| `v1.0` | 2026-08-25 | Bản khảo sát ban đầu, CTV-specific; superseded vì sai `affCode`, thiếu generic attribution/RPC/assignment/commission chain. |
