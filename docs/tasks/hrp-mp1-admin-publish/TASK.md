# TASK: hrp-mp1-admin-publish

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp1-admin-publish` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `REVISION_REQUIRED` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `3eacd22` (HEAD of main, 2026-08-21) |
| Modules | `M3 CRM/Staffing`, `Marketplace MP-1` |
| ADR references | `UNIFIED_PLAN_v5.md §7.9`, `§6.3`, `§6.4`; `V5_3_TIER_EXECUTION_GUIDE.md §3`, `§7` |
| Current execution round | `2` |
| Current audit round | `3` |
| Next gate | `/audit hrp-mp1-admin-publish` |
| Updated | `2026-08-21 17:35 +07:00` |

## 1. Outcome

### User-visible outcome

HR/Sale có thể tạo hoặc chỉnh sửa một Staffing Order/Slot thuộc Project, bật/tắt public publishing, và nhìn thấy đúng job đã publish tại public job list/detail. Job draft/closed/expired/unpublished không xuất hiện public và không thể nhận apply ở các phase sau.

### Non-goals

- Không làm application form, `CandidateSubmission` public, tracking code hoặc screening queue; thuộc MP-2.
- Không làm Worker conversion, Referral Guard hoặc Assignment activation; thuộc MP-3.
- Không làm rate card, payroll, attendance, vendor portal hoặc commission settlement.
- Không thêm dependency ngoài dependency đã có.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `prisma/schema.prisma:333-414` | `Project.isPublic`, `StaffingOrder` và `StaffingOrderSlot` đã tồn tại; `publicSlug` và expiry/visibility contract chưa có. | Có thể mở rộng contract bằng migration nhỏ, không tạo aggregate mới. |
| `EV-02` | `app/admin/jobs/page.tsx` | Nút `Post New Job` vẫn alert “chức năng đang phát triển”; jobs tab gọi public API. | Cần thay nút giả bằng flow publish/admin projection. |
| `EV-03` | `app/api/jobs/route.ts` | GET/POST đang gộp public list và public apply; public GET chưa filter/pagination/DTO đầy đủ. | Tách public read contract khỏi apply; MP-1 chỉ sửa GET/list/detail. |
| `EV-04` | `src/domains/staffing/order.service.ts` | CRUD StaffingOrder/Slot và status service đã có, có scope builder. | Reuse service; không viết order service thứ hai. |
| `EV-05` | `app/job-board/page.tsx` | UI đang ghi “DỮ LIỆU MINH HỌA” và “Không có flow ứng tuyển”. | MP-1 phải thay mock/disclaimer bằng public read state thật; apply vẫn để MP-2. |
| `EV-06` | `docs/UNIFIED_PLAN_v5.md:642-744` | Marketplace MP-1 yêu cầu publish/public list/detail, filter, expiry, public projection. | Acceptance lấy theo Marketplace launch track. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Public visibility chỉ khi `Project.status = ACTIVE`, `Project.isPublic = true`, StaffingOrder còn `OPEN/CLOSING_SOON`, và có ít nhất một slot còn chỗ. | Tier 1 / V5 | Valid |
| `DEC-02` | `CHOSEN` | Public response là DTO riêng; không trả clientCompanyId nội bộ, rate, margin, internal notes, manager IDs hoặc Prisma object thô. | Tier 1 / V5 §6.3 | Valid |
| `DEC-03` | `CHOSEN` | Admin publish/unpublish là command có auth, permission, audit và idempotency; không cho public client sửa `isPublic`. | Tier 1 / V5 §6.3 | Valid |
| `DEC-04` | `ASSUMPTION` | Dùng `Project.code` làm slug tạm thời nếu chưa thêm `publicSlug`; slug phải stable, URL-safe và unique. | Tier 1 | Hết hạn khi Planner mở task slug riêng |
| `DEC-05` | `CHOSEN` | Không làm ISR/cache invalidation phức tạp trong task này; route có thể dynamic, nhưng response phải có pagination/filter contract để mở rộng sau. | Tier 1 | Valid |
| `DEC-06` | `CHOSEN` | MP-1 không mở rộng Project RLS cho `HR_STAFF`. Create/edit Project/StaffingOrder/Slot chỉ dành cho `ADMIN`, `HR_MANAGER`, `SALE` trong phạm vi RLS hiện hành. `DIRECTOR` chỉ write khi có permission động phù hợp; `PM`, `HR_STAFF` và các role ngoài scope không publish. | Tier 1 / canonical Visibility Matrix | Valid |
| `DEC-07` | `CHOSEN` | Thêm permission `CAN_PUBLISH_JOB` thuộc group mới `PROJECT`. Default grants: `HR_MANAGER`, `SALE`; `ADMIN` có quyền qua root short-circuit. `DIRECTOR` có thể nhận GRANT theo user qua Permission Pool. Permission là action gate và không bao giờ mở rộng row scope/RLS. | Tier 1 / Permission Pool | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | `ADMIN`, `HR_MANAGER`, `SALE` có thể tạo/chỉnh StaffingOrder và Slot tối thiểu cho Project được RLS cho phép; `DIRECTOR` chỉ thực hiện khi có action permission tương ứng; validation bắt buộc title, status, slot position, headcount, validFrom. `HR_STAFF` không thuộc MP-1 write scope. | Must | EV-02/EV-04/DEC-06 | `400 VALIDATION_ERROR` hoặc `403`; không tạo partial record |
| `RQ-02` | Publish/unpublish Project/Job bắt buộc `CAN_PUBLISH_JOB` + Project row scope, đồng thời có audit + idempotency. Tier 2 bổ sung permission group `PROJECT`, catalog code, seed idempotent và default role grants theo DEC-07. | Must | DEC-03/DEC-07 | `401/403/409`; không đổi state nếu thiếu scope hoặc permission |
| `RQ-03` | Public list chỉ trả job thỏa DEC-01, có cursor hoặc bounded pagination và filter `q`, `area`, `shift`. | Must | EV-03/EV-06 | Public không thấy draft/closed/expired/unpublished |
| `RQ-04` | Public detail trả DTO tối thiểu: `slug/id`, title, position/shift/location, availableSlots, deadline, statusLabel; không lộ dữ liệu nội bộ. | Must | DEC-02 | Job không public trả `404` giống object không tồn tại |
| `RQ-05` | `/admin/jobs` không còn nút giả alert; có loading/empty/error và trạng thái Published/Unpublished/Closed. | Must | EV-02/EV-05 | UI hiển thị lỗi domain, không nuốt response |
| `RQ-06` | Không thay đổi apply POST behavior ngoài việc không làm regress public GET; MP-2 sẽ tách apply contract riêng. | Must | Non-goal | Test regression apply hiện có phải giữ nguyên hoặc ghi BLOCKED nếu môi trường DB thiếu |

### 4.2 Scope boundaries

**In scope:**

- `app/admin/jobs/page.tsx`
- `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts` hoặc route command phù hợp
- `app/api/jobs/route.ts` GET/public detail route mới nếu cần
- `src/domains/staffing/order.service.ts` chỉ khi cần bổ sung input/validation không phá contract
- `src/domains/job-board/*` hoặc service projection canonical nếu file đã tồn tại
- `src/shared/auth/permission-catalog.ts`, permission tests và `prisma/seed.mjs` cho `CAN_PUBLISH_JOB`
- `prisma/schema.prisma` và migration chỉ khi `publicSlug`/expiry thật sự cần; ưu tiên dùng field hiện có
- Unit/integration/contract tests liên quan

**Out of scope:**

- Public apply/conversion/screening/Worker creation.
- New npm dependency, external storage, QStash, email/SMS/Zalo.
- Refactor toàn bộ admin layout hoặc design system.
- Commission, payroll, attendance, billing.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** `Project` + `StaffingOrder` + `StaffingOrderSlot` là nguồn sự thật; `slotsFilled`/available slots phải không âm và không tự tăng từ public GET.
- **State:** publish chỉ là command kiểm tra project/order/slot; không chuyển `Project.status` tự động nếu contract không yêu cầu. Order CLOSED/CANCELLED hoặc deadline quá hạn không public.
- **Permission:** create/edit theo DEC-06. Publish yêu cầu đồng thời `CAN_PUBLISH_JOB` và Project row scope. Default: `ADMIN` (root), `HR_MANAGER`, `SALE`; `DIRECTOR` chỉ khi có user GRANT. `HR_STAFF`, `PM`, MKT, Worker và Vendor không publish. User grant không được bypass/nới RLS; grant cho role không có row scope vẫn trả `403`.
- **Interface:** public list/detail dùng DTO JSON, BigInt serialize thành string, không trả Prisma record.
- **Failure/idempotency/concurrency:** publish/unpublish nhận `Idempotency-Key`; cùng key + cùng payload replay response; khác payload trả `409 IDEMPOTENCY_PAYLOAD_MISMATCH`; stale version trả `409 STALE_VERSION`.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01 | Admin project/order/slot flow | Đối chiếu/reuse order service; bổ sung validation cần thiết cho order/slot public-ready | `V5-M35-01`; schema | Unit + API contract tests | Schema mismatch hoặc cần business decision mới |
| `STEP-02` | RQ-02 | Permission catalog + seed + publish command/API | Thêm group `PROJECT`, code `CAN_PUBLISH_JOB`, seed idempotent/default grants; tạo command scoped, idempotent, audit và chỉ đổi public flag/publish metadata. Không sửa/nới Project RLS. | Permission Pool, `withDbContext`, integrity helpers | Catalog/resolver/seed + permission/idempotency/audit + role/RLS tests | Permission có thể bypass row scope hoặc cần nới RLS |
| `STEP-03` | RQ-03/04 | Public projection list/detail | Tạo DTO/projection, filter, pagination, visibility guards; serialize money/IDs an toàn | Public route/service | Contract tests + IDOR/private projection tests | Query cần field chưa có và phải đổi schema |
| `STEP-04` | RQ-05 | `app/admin/jobs`, `app/job-board` | Thay alert/mock disclaimer bằng publish state, list/detail loading/error/empty; không làm apply UI | Existing UI patterns | `npm run build` + browser smoke/screenshot | UI cần design decision ngoài mockup |
| `STEP-05` | RQ-06 | Regression boundary | Chạy test apply hiện có, kiểm tra GET không làm thay đổi POST; ghi limitation DB nếu có | Existing staffing tests | Vitest targeted + full suite where env available | Apply regression hoặc route contract bị đổi |
| `STEP-06` | All | Handoff | Ghi file diff, commands, outputs, limitations, rollback; status READY_FOR_AUDIT chỉ khi mọi AC có evidence | Tier 2 template | `verify-task.ps1` | Thiếu evidence hoặc diff ngoài scope |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | `ADMIN`, `HR_MANAGER`, `SALE` tạo/chỉnh được Project/StaffingOrder/Slot hợp lệ trong scope; `HR_STAFF` bị `403`; validation không tạo partial data. | API/integration test + seeded smoke | HANDOFF response + DB rows | Yes |
| `AC-02` | RQ-02 | Catalog/seed có `CAN_PUBLISH_JOB`; `HR_MANAGER` và `SALE` publish được; `ADMIN` root publish được; `DIRECTOR` không grant nhận `403` và có user GRANT thì publish được; `HR_STAFF` vẫn `403` kể cả được grant; retry cùng key không duplicate audit/state. | Security/RLS/idempotency tests | Test output + permission/role rows + audit row | Yes |
| `AC-03` | RQ-03 | Public list chỉ trả ACTIVE + published + open jobs còn slot; filter/pagination hoạt động. | Contract test | JSON fixture/output | Yes |
| `AC-04` | RQ-04 | Public detail đúng DTO; draft/closed/expired/private trả 404; không có client/rate/margin/internal fields. | Contract + IDOR test | Response snapshot + forbidden-field assertion | Yes |
| `AC-05` | RQ-05 | Admin Job UI không còn alert “đang phát triển”; có publish state và loading/empty/error. | Browser smoke/manual visual check | Screenshot/video path + command | Yes |
| `AC-06` | RQ-06 | Existing apply POST tests không regress; nếu không thể chạy DB phải ghi `ENV_BLOCKED`, không ghi PASS. | Targeted/full test | Exit code + limitation | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-05` | `AC-06` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Public projection lộ field nội bộ | Contract test thấy client/rate/margin | DTO allow-list + forbidden-field test | Tắt public flag/feature flag |
| `RISK-02` | Publish race hoặc duplicate audit | Concurrent command/retry tạo nhiều state | Idempotency + version guard + transaction | Unpublish bằng command idempotent, không sửa DB tay |
| `RISK-03` | Job closed/expired vẫn hiển thị | Deadline/status query thiếu điều kiện | Central `isPubliclyVisible` predicate + test boundary | Tắt public route/publish flags |
| `RISK-04` | M13 chưa được audit nhưng bị coi là dependency đã xong | Task M13 còn READY, thiếu HANDOFF/AUDIT | MP-1 không claim M13 accepted; ghi baseline commit và dependency advisory | Dừng MP-1 nếu schema drift phát hiện |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | `publicSlug` có bắt buộc trong MP-1 hay dùng `Project.code` tạm thời? | Tier 1/Founder | Trước `STEP-03` | No — dùng `Project.code` fallback theo DEC-04 |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 0 | BLK-01 | ACCEPT_FIX | Thu hẹp MP-1 theo canonical Project RLS: loại `HR_STAFF` khỏi write/publish; không bypass và không tạo migration nới RLS. `DIRECTOR` write qua Permission Pool. | Spec v1.1: DEC-06, RQ-01/02, AC-01/02 | Tier 2 / execution round 2 |
| 0 | BLK-02 | ACCEPT_FIX | Bổ sung action permission `CAN_PUBLISH_JOB`, group `PROJECT`, default grants `HR_MANAGER` + `SALE`; ADMIN root; DIRECTOR user grant tùy nhu cầu. Permission không thay thế row scope. | Spec v1.1: DEC-07, STEP-02, AC-02 | Tier 2 / execution round 2 |
| 1 | AUD-UX-001 | ACCEPT_FIX | `AUDIT.md` ghi PASS nhưng `AC-05` yêu cầu browser smoke/manual visual check kèm screenshot/video. HANDOFF §3/§5 chỉ có `npm run build` và nêu rõ không có browser screenshot. Build xanh không chứng minh loading/error/empty/publish-state trên `app/admin/jobs` và `app/job-board`. Không đóng task khi acceptance blocking còn thiếu evidence. | Không đổi contract; bổ sung evidence cho AC-05 | Tier 2 hoặc người chạy browser / trước audit round 2 |
| 2 | AUD-UX-002 | ACCEPT_FIX | Re-audit dẫn `scratch/admin_jobs.png`, `scratch/job_board.png`, `scratch/smoke.cjs`, nhưng cả ba artifact không tồn tại trong workspace hiện tại khi Planner kiểm tra. Đồng thời `AUDIT.md §5` vẫn ghi coverage gap không có browser screenshot và Re-audit Trace chưa đóng `AUD-UX-001`. AC-05 chưa có evidence reproducible/traceable để nghiệm thu. | Không đổi contract; Tier 3 phải sửa AUDIT/HANDOFF với artifact path tồn tại hoặc rerun smoke và commit/đính kèm evidence | Tier 3 + Tier 2 / trước audit round 3 |
| 3 | AUD-UX-003 | ACCEPT_FIX | Planner đã tìm toàn bộ repository: không có `scratch/admin_jobs.png`, `scratch/job_board.png` hoặc `scratch/smoke.cjs`; chỉ có các file logo PNG không liên quan. AUDIT round 3 vẫn ghi PASS nhưng không bổ sung artifact tồn tại, vẫn giữ coverage gap cũ và chưa có Re-audit Trace đóng `AUD-UX-001`. Không thể chấp nhận AC-05 dựa trên đường dẫn không tồn tại. | Không đổi contract; cần commit artifact hoặc evidence path hợp lệ trong repo, sửa nhất quán HANDOFF/AUDIT, rồi chạy lại `/audit` | Tier 2 + Tier 3 / trước acceptance |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-21` | Mở task Marketplace MP-1: admin publish + public read contract. | Founder ưu tiên vận hành chợ việc làm trước payroll/billing. |
| `v1.1` | `2026-08-21` | Chốt Project write scope và permission publish sau preflight BLOCKED. | `BLK-01`, `BLK-02`; giữ canonical RLS, thêm `CAN_PUBLISH_JOB`. |
