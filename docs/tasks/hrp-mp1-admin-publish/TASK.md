# TASK: hrp-mp1-admin-publish

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp1-admin-publish` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `a8d712c` (HEAD of main, 2026-08-21) |
| Modules | `M3 CRM/Staffing`, `Marketplace MP-1` |
| ADR references | `UNIFIED_PLAN_v5.md §7.9`, `§6.3`, `§6.4`; `V5_3_TIER_EXECUTION_GUIDE.md §3`, `§7` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/code hrp-mp1-admin-publish` |
| Updated | `2026-08-21 +07:00` |

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

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Admin có thể tạo/chỉnh StaffingOrder và Slot tối thiểu cho Project được phép; validation bắt buộc title, status, slot position, headcount, validFrom. | Must | EV-02/EV-04 | `400 VALIDATION_ERROR`; không tạo partial record |
| `RQ-02` | Admin có command publish/unpublish một Project/Job với permission + audit + idempotency. | Must | DEC-03 | `401/403/409`; không đổi state nếu thiếu scope/permission |
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
- **Permission:** ADMIN/HR_MANAGER/HR_STAFF/Sale theo scope được tạo/sửa/publish; public chỉ đọc projection; MKT chỉ đọc public project; Worker/Vendor không publish.
- **Interface:** public list/detail dùng DTO JSON, BigInt serialize thành string, không trả Prisma record.
- **Failure/idempotency/concurrency:** publish/unpublish nhận `Idempotency-Key`; cùng key + cùng payload replay response; khác payload trả `409 IDEMPOTENCY_PAYLOAD_MISMATCH`; stale version trả `409 STALE_VERSION`.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01 | Admin project/order/slot flow | Đối chiếu/reuse order service; bổ sung validation cần thiết cho order/slot public-ready | `V5-M35-01`; schema | Unit + API contract tests | Schema mismatch hoặc cần business decision mới |
| `STEP-02` | RQ-02 | Publish command/API | Tạo command scoped, idempotent, audit; chỉ đổi public flag/publish metadata | `withAuthScope`, integrity helpers | Permission/idempotency/audit tests | Chưa xác định permission hoặc transition |
| `STEP-03` | RQ-03/04 | Public projection list/detail | Tạo DTO/projection, filter, pagination, visibility guards; serialize money/IDs an toàn | Public route/service | Contract tests + IDOR/private projection tests | Query cần field chưa có và phải đổi schema |
| `STEP-04` | RQ-05 | `app/admin/jobs`, `app/job-board` | Thay alert/mock disclaimer bằng publish state, list/detail loading/error/empty; không làm apply UI | Existing UI patterns | `npm run build` + browser smoke/screenshot | UI cần design decision ngoài mockup |
| `STEP-05` | RQ-06 | Regression boundary | Chạy test apply hiện có, kiểm tra GET không làm thay đổi POST; ghi limitation DB nếu có | Existing staffing tests | Vitest targeted + full suite where env available | Apply regression hoặc route contract bị đổi |
| `STEP-06` | All | Handoff | Ghi file diff, commands, outputs, limitations, rollback; status READY_FOR_AUDIT chỉ khi mọi AC có evidence | Tier 2 template | `verify-task.ps1` | Thiếu evidence hoặc diff ngoài scope |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | HR tạo được một Project/StaffingOrder/Slot hợp lệ; validation không tạo partial data. | API/integration test + seeded smoke | HANDOFF response + DB rows | Yes |
| `AC-02` | RQ-02 | User đủ quyền publish/unpublish thành công; user thiếu quyền nhận 403; retry cùng idempotency key không duplicate audit/state. | Security/idempotency tests | Test output + audit row | Yes |
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
| - | - | - | - | - | - |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-21` | Mở task Marketplace MP-1: admin publish + public read contract. | Founder ưu tiên vận hành chợ việc làm trước payroll/billing. |
