# Implementation Plan: HRP V5 — Mockup Gap Analysis & V4 Carry-over Execution Strategy

> **Phiên bản:** V5.3  
> **Vai trò tài liệu:** kế hoạch thực thi cho UI/mockup V5 và toàn bộ backlog còn dang dở từ Unified Plan V4.  
> **Nguyên tắc:** section 1–3 giữ phạm vi mockup S01–S05; section 4–5 là backlog kỹ thuật/nghiệp vụ bắt buộc được mang sang V5.  
> **V5.3 (2026-08-22):** tiếp thu `docs/V5_READINESS_ASSESSMENT.md` — mỗi finding đã được Planner **xác minh lại bằng tool thật** (đọc file:dòng, grep, glob) trước khi nhận; bảng nhận/từ chối và backlog refactor xem §12. Các finding sai/lỗi-thời bị **từ chối có dẫn chứng** (đặc biệt D-01). Revision Log: §13.

> **Ưu tiên kinh doanh số 1:** đưa **Chợ giao dịch việc làm HRP** vào vận hành sớm nhất. Marketplace MVP là đường găng trước payroll, billing đầy đủ, commission nâng cao và M9. Mục tiêu tối thiểu là chạy được vòng `Tạo việc → Công khai → Ứng tuyển → Sàng lọc → Tạo Worker → Xếp Assignment → Phản hồi trạng thái` trên dữ liệu thật đã ẩn danh.

Rà soát và đối chiếu toàn bộ các tính năng được mô tả trong thư mục mockup tĩnh (`C:\CodeApp\HrP\docs\tasks\hrp-v4-bod-mockup\mockup`) so với hiện trạng codebase hiện tại.

## User Review Required
> [!IMPORTANT]
> - Sếp cần review danh sách các tính năng còn thiếu bên dưới. Hiện tại chúng ta mới chỉ làm **Khung chức năng (Data/API)** ở dạng cơ bản cho S02, S03, S04, S05, chứ chưa dựng lên lớp UI/UX tương tác phức tạp như trong bản vẽ.
> - Kế hoạch đề xuất (M13 - M16) sẽ tập trung "thổi hồn" UI/UX cho các module này. Sếp có thể phê duyệt để tiến hành.

## 1. Phân tích Hiện trạng (Gap Analysis)

> **Quy tắc đọc:** Section này chỉ ghi nhận hiện trạng/gap của codebase và mockup. Không tạo task triển khai mới ở đây; task canonical nằm tại Section 4.

Dưới đây là danh sách mapping các mockup (S01 - S05) với codebase hiện tại, những gì đã có và những gì còn thiếu:

### 1.1. S01: BoD Control Tower (`S01_ControlTower_*.html`)
- **Có chưa?** CÓ.
- **Nằm ở đâu?** `app/bod/page.tsx` (Được làm ở M10 và tích hợp API ở M12).
- **Thực trạng:** 
  - Đã lên UI chuẩn TailwindCSS bám sát `S01_ControlTower_Default_1440.html`.
  - Đã có Empty State / Loading / Stale Banner.
- **Còn thiếu / Lệch chuẩn:**
  - Component "Priority Projects" đang lấy tạm data từ `VendorStatement` thay vì các `Project` thật (Lỗi DEV-01). Chúng ta đã có kế hoạch tạo task `hrp-portal-m12.1-bod-projects` để khắc phục lỗi semantic này.

### 1.2. S02: Project Staffing (`S02_Staffing_*.html`, `S02A_*.html`, `S02B_*.html`)
- **Có chưa?** CÓ MỘT PHẦN RẤT NHỎ (CHỈ CÓ DATA TABLE).
- **Nằm ở đâu?** `app/admin/staffing/page.tsx`.
- **Còn thiếu / Lệch chuẩn:**
  - UI hiện tại chỉ là một bảng table thô sơ (Basic layout).
  - Hoàn toàn chưa có giao diện Card lưới (`.s02-grid`, `.s02-card`).
  - Thiếu tính năng Drawer giải quyết xung đột nhân sự (`S02A_AssignmentConflict_Drawer.html`).
  - Thiếu màn hình Preview luân chuyển (`S02A_TransferPreview.html`).
  - Thiếu hệ thống bảo vệ giới thiệu/Referral Guard Drawer (`S02B_ReferralGuard_*.html`).
  - Thiếu trạng thái Card bị khóa (`S02_CardBlocked.html`).

### 1.3. S03: Attendance Exception Workbench (`S03_Attendance_*.html`, `S03_Import*.html`)
- **Có chưa?** CÓ MỘT PHẦN (CHỈ CÓ TABS VÀ TABLE CƠ BẢN).
- **Nằm ở đâu?** `app/admin/attendance/page.tsx`.
- **Còn thiếu / Lệch chuẩn:**
  - Hiện tại mới chỉ hiển thị danh sách Batch/Period/Exception dạng thô.
  - Chưa có giao diện "Exception Workbench" chuyên nghiệp (`S03_Attendance_Exceptions.html`).
  - Chưa có Drawer để Kế toán/HR giải quyết các ngoại lệ (Resolve Drawer) (`S03_ResolveDrawer.html`).
  - Chưa có UI tương tác cho quá trình Import (Progress, Failed) (`S03_ImportProgress.html`).
  - Chưa làm chế độ ReadOnly khi kỳ công đã Locked (`S03_Attendance_Locked_ReadOnly.html`).

### 1.4. S04: Reconciliation & Margin (`S04_Reconciliation_*.html`, `S04A_*.html`, `S04B_*.html`)
- **Có chưa?** CÓ MỘT PHẦN (CƠ BẢN).
- **Nằm ở đâu?** `app/admin/reconciliation/page.tsx` và `app/vendor/statements/page.tsx`.
- **Còn thiếu / Lệch chuẩn:**
  - Chưa có giao diện so sánh tỷ suất lợi nhuận (Margin Comparison) trực quan (`S04_MarginComparison.html`).
  - Chưa có Drawer truy xuất nguồn gốc/Lineage của dòng tiền (`S04A_Lineage_Drawer.html`).
  - Phía Vendor chưa có Form khiếu nại (Dispute Form) chuyên nghiệp (`S04B_VendorPreview_DisputeForm.html`).
  - Chưa có các trạng thái UI đặc thù: `S04_EmptyPayment`, `S04_ConfirmedLocked`, `S04_VendorDisputed`.

### 1.5. S05: Public Job Board (`S05_JobBoard_*.html`)
- **Có chưa?** CÓ (Khá sát UI).
- **Nằm ở đâu?** `app/job-board/page.tsx`.
- **Thực trạng:** 
  - UI khá ổn định và bám sát thiết kế Public.
  - **Chưa được coi là marketplace vận hành:** cần nối Project/StaffingOrder thật, apply funnel, screening queue, dedup/referral guard và assignment handoff.

---

## 2. Đề xuất Kế hoạch Thực thi (Nâng cấp Cấu trúc Backend & UI/UX)

Sau khi rà soát thêm yêu cầu về Backend, Database và Nghiệp vụ (Quản lý dự án, Điều chuyển nhân sự, Chợ việc làm), tôi đề xuất lộ trình mới (M13 - M18) đi từ **lõi dữ liệu/backend lên giao diện người dùng**.

### 2.1. Milestone 13 (M13): Mở rộng Cấu trúc Database & Backend
- **Scope:** Cập nhật `schema.prisma` và các API cơ sở để đáp ứng yêu cầu nghiệp vụ mới.
- **Tasks:**
  - [DB] Bổ sung 2 Quản lý phụ cho Dự án: Thêm `subPmUserId1` và `subPmUserId2` vào model `Project` (bên cạnh `pmUserId` hiện có).
  - [DB] Gắn người lao động với Quản lý: Thêm `managerId` vào model `Worker` (map với User). Cung cấp cơ chế fallback tạo 1 User đại diện công ty nếu không có quản lý.
  - [Integration] Cung cấp input assignment/hours cho commission engine canonical `V5-M6-*`; không tạo commission API riêng tại M13.
  - [Integration] Kết nối UI/API M13 với domain transfer canonical `V5-M35-06`; không triển khai một transfer service thứ hai.

### 2.2. Milestone 14 (M14): Quản lý Chợ Việc Làm (Job Board Backend & Admin UI)
- **Scope:** Xây dựng phần Admin Backend để Thêm/Sửa/Xóa công việc (Dự án) và đồng bộ ra Public Job Board (S05).
- **Tasks:**
  - [API] Hoàn thiện Admin CRUD API cho model `Project` (đóng vai trò là Công việc), bao gồm permission và audit.
  - [UI] Trang Admin quản lý Công việc: Cho phép bật/tắt cờ `isPublic` để đưa công việc lên trang chủ.
  - [Dependency] Bàn giao public read model cho `V5-PORTAL-01`; M14 không tạo một public jobs API thứ hai.

### 2.3. Milestone 15 (M15): Nâng cấp UI Staffing & Điều chuyển nhân sự (Mockup S02)
- **Scope:** Áp dụng toàn bộ `S02_*.html` vào `app/admin/staffing/page.tsx` và tích hợp domain transfer `V5-M35-06`.
- **Tasks:**
  - [UI] Component `StaffingGrid` và `StaffingCard` lưới thẻ chuyên nghiệp.
  - [UI] Component `AssignmentConflictDrawer` xử lý logic tranh chấp nhân sự.
  - [UI] Component `TransferPreview` gọi API/domain transfer canonical; không chứa business rule transfer trong component.
  - [UI] Tích hợp UI hệ thống bảo vệ `ReferralGuard` và trạng thái `CardBlocked`.

### 2.4. Milestone 16 (M16): Attendance Exception Workbench (Mockup S03)
- **Scope:** Áp dụng toàn bộ `S03_*.html` vào `app/admin/attendance/page.tsx`; backend/import contract nằm ở `V5-M7-01..07`.
- **Tasks:**
  - [UI] Giao diện Exception Workbench (Master-Detail view).
  - [UI] Component `ResolveExceptionDrawer` cho phép thao tác duyệt/hủy công ngoại lệ.
  - [UI] Cập nhật UI tiến trình Import (Progress Bar, Errors) và State Management cho trạng thái Locked; không parse/import lại trong M16.

### 2.5. Milestone 17 (M17): Reconciliation Margin & Lineage (Mockup S04)
- **Scope:** Áp dụng toàn bộ `S04_*.html` vào `app/admin/reconciliation/page.tsx`; statement/rate/lineage backend nằm ở `V5-M8-01..06`.
- **Tasks:**
  - [UI] Xây dựng UI Margin Comparison (Biểu đồ / Chỉ số sinh lời).
  - [UI] Component `LineageDrawer` để trace nguồn gốc dòng tiền.
  - [UI] Dispute Form cho phía Vendor Portal và các trạng thái Empty/Locked; không tạo dispute state machine thứ hai.

### 2.6. Milestone 18 (M18): HRP Design System Cleanup
- **Scope:** Xử lý các file `F01_Tokens.html`, `F01_TypeSpacing.html`, `F02_ComponentSet.html`.
- **Tasks:**
  - Map toàn bộ tokens tĩnh này vào cấu hình Tailwind để giữ giao diện đồng nhất tuyệt đối.

## 3. Verification Plan
- Chạy visual review trên localhost cho mỗi Milestone, đối chiếu giao diện 1-1 với file HTML tương ứng trong thư mục `mockup`.
- Kiểm tra integration của UI với domain/API canonical trong Section 4; không tạo business rule mới trong UI milestone.
- DoD hệ thống, migration, security, idempotency, golden test và UAT dùng chung theo Section 4.12.

---

## 4. V4 CARRY-OVER BACKLOG — CÔNG VIỆC CHƯA HOÀN TẤT

### 4.1. Mục đích và nguyên tắc thực thi

Phần này là danh sách công việc còn dang dở hoặc chưa triển khai được phát hiện khi đối chiếu `UNIFIED_PLAN_v4.md`, `HRP_V4_HOLISTIC_REVIEW.md` và codebase hiện tại. Đây là backlog bắt buộc của V5, không phải danh sách ý tưởng mới.

**Quy ước trạng thái:**

- `P0`: chặn an toàn dữ liệu, tính đúng tiền hoặc go-live.
- `P1`: chặn vận hành ổn định nhưng có thể triển khai sau backbone.
- `P2`: nâng chất lượng, UX hoặc mở rộng sau MVP.
- `READY_FOR_T2`: Planner đã chốt scope và acceptance criteria; Coding có thể nhận.
- `READY_FOR_T3`: cần audit độc lập sau khi Coding báo hoàn thành.

**Nguyên tắc không thay đổi từ V4:**

1. Operations-first: Client/Project → Staffing Order → Worker → Assignment → Attendance → Reconciliation.
2. TNCN/BHXH là phase cuối. V5 chỉ dựng schema, interface, snapshot và mock/manual adapter trước; không nối engine pháp lý thật vào đường LOCK payroll sớm.
3. Tiền dùng `BIGINT` VND; giờ công dùng decimal chính xác; không dùng `Number()` để tính tiền.
4. Record đã `LOCKED` không sửa trực tiếp; mọi sửa tạo revision/adjustment có audit.
5. `withAuthScope` là lớp L1, PostgreSQL RLS là lớp L2; không coi một lớp là đủ.

**Canonical ownership:**

- Section 1 là baseline, không sinh task code.
- Section 4 là nguồn sự thật duy nhất cho domain/backend/schema/state machine và acceptance criteria.
- M13–M18 chỉ làm UI, projection và integration; không tạo service/API/state machine song song với Section 4.
- Section 4.14 chỉ traceability; không tạo thêm task ngoài bảng được tham chiếu.
- `V5-OPS-01` là owner của QStash contract/signature/retry/DLQ; các module M7, M8 và PAY chỉ tích hợp contract này.

### 4.2. Gate G0 — Baseline trước khi nhận task code (P0)

| ID | Công việc chi tiết | Phạm vi/artefact | Phụ thuộc | Acceptance criteria | Test bắt buộc |
|---|---|---|---|---|---|
| V5-G0-01 | Chốt schema canonical, loại bỏ schema patch rời và cập nhật ERD từ Prisma | `prisma/schema.prisma`, migration, ERD trong `docs/` | Không | `prisma validate` pass; không còn model chỉ tồn tại trong comment/patch; migration chạy được trên DB sạch và DB nâng cấp | `prisma migrate deploy` trên hai database; schema diff rỗng |
| V5-G0-02 | Dựng DB dev/staging có thể truy cập và seed dữ liệu tối thiểu | `prisma/seed.ts`, `.env.example`, runbook | V5-G0-01 | Seed tạo root, 8 role, permission chuẩn, 2 client, 2 project, 2 vendor, 20 worker, 2 kỳ công | Smoke API + reset/seed lặp lại được |
| V5-G0-03 | Chuẩn hóa Prisma client singleton và connection URL | `src/lib/db.ts`, mọi route/domain import qua một entry point | V5-G0-01 | Không còn `new PrismaClient()` trong route/domain; runtime dùng pooled URL; migration dùng direct URL | grep gate + test concurrent requests |
| V5-G0-04 | Thiết lập CI tối thiểu | `.github/workflows/ci.yml`, scripts `typecheck`, `lint`, `test:unit`, `test:integration`, `build` | V5-G0-01 | Pull request chạy format/check/schema/test/build; failure chặn merge | Chạy CI trên PR thử nghiệm |
| V5-G0-05 | Tạo bộ fixture nghiệp vụ chuẩn từ dữ liệu đã ẩn danh | `tests/fixtures/operations/*` | V5-G0-02 | Có case đủ tháng, chuyển project giữa tháng, ca đêm, OT, correction, dispute, reversal commission | Golden fixture được dùng chung bởi unit/integration |

### 4.3. M1 — Identity, RBAC, Permission Pool và RLS (P0)

| ID | Công việc chi tiết | Phạm vi/artefact | Acceptance criteria |
|---|---|---|---|
| V5-M1-01 | Hoàn thiện `AuthIdentity` và account linking | Model `auth_identities`, liên kết password/OTP/Zalo; không dùng số điện thoại làm primary identity | Một user có nhiều identity; link/unlink có audit; số điện thoại trùng không tạo user thứ hai |
| V5-M1-02 | Hoàn thiện session/refresh rotation — **mở rộng identity-core hiện có theo DEC-11, KHÔNG viết lại bộ auth/login/JWT** | Bảng `sessions` hoặc `refresh_tokens`, revoke, device metadata, session version | Access token ngắn hạn; refresh rotation; revoke một thiết bị/toàn bộ thiết bị; logout vô hiệu hóa token cũ |
| V5-M1-03 | OTP baseline | OTP hash, expiry 5 phút, tối đa 3 lần thử, rate limit phân tán | OTP không lưu plaintext; sai quá ngưỡng bị khóa; không phân biệt user tồn tại trong response |
| V5-M1-04 | Permission Pool v2 | `Permission`, `RolePermission`, `UserPermissionGrant`, custom group, grantor, effective period, deny precedence | `ADMIN/ROOT` bất khả tước; `CAN_OVERRIDE_INDIVIDUAL_COMMISSION` cấp được cho user hoặc group; revoke có hiệu lực ngay sau permission version bump |
| V5-M1-05 | Hoàn thiện Visibility Matrix Q#22 | DIRECTOR đọc toàn bộ như HR_MANAGER; MKT **và SALE** chỉ CRM/project public, không đọc Worker PII (CCCD/bank); PM chỉ project được phân công | **13 role** (đủ `SystemRole`, không phải 8) × resource × action có fixture expected; response dùng projection, không trả PII thừa |
| V5-M1-06 | Bắt buộc route qua auth scope | Audit toàn bộ `app/api/**`; thay `getPrisma()` trực tiếp bằng `withAuthScope` + `withDbContext`/scoped repository | Không có route dữ liệu nghiệp vụ bỏ qua scope; `$queryRaw` chỉ nằm trong repository có RLS context |
| V5-M1-07 | Hoàn thiện RLS policy và FORCE RLS | Worker, Project, Vendor, StaffingOrder/Slot, Assignment, Attendance, Timesheet, Statements, Commission | Runtime role không phải DB owner; policy deny-by-default; `FORCE ROW LEVEL SECURITY`; GUC transaction-local |
| V5-M1-08 | Sửa lỗ hổng vendor scope | Order list/submission/statement chỉ đọc và ghi object thuộc vendor trong context, đúng status | Test IDOR: vendor A không đọc/submit/order/dispute của vendor B |
| V5-M1-09 | Field-level projection | Worker/statement/payment/config có DTO theo role; CCCD, bank, margin, client rate không trả mặc định | Contract test kiểm tra field visibility theo role/action |

### 4.4. M3/M5 — CRM, Staffing Order, Worker và 5 state machine (P0/P1)

| ID | Công việc chi tiết | Phạm vi/artefact | Acceptance criteria |
|---|---|---|---|
| V5-M35-01 | Hoàn thiện `Site` và `StaffingOrderSlot` | Site thuộc Project; slot có vị trí, ca, headcount, rate scope, valid interval | Assignment trỏ tới slot; không còn dùng `Project.siteAddress` làm site canonical |
| V5-M35-02 | Hoàn thiện vòng đời 5 state machine | Typed transition maps + transition history cho profile, submission, employment, assignment, risk | Mỗi transition kiểm tra actor/permission/reason; terminal state không quay ngược tùy ý; optimistic locking chống race |
| V5-M35-03 | Profile lifecycle | Sửa luồng `REJECTED → INCOMPLETE → PENDING_VERIFY`; lưu reason/version reviewer | Không overwrite lịch sử review; card hiển thị thiếu hồ sơ và lý do |
| V5-M35-04 | Submission lifecycle + dedup | Máy trạng thái canonical = `NEW → SCREENING → QUALIFIED → CONVERTED` (+ `REJECTED`/`WITHDRAWN`/`NEEDS_INFO`) theo §7.9.5; `MERGED` là **nhánh dedup riêng** (2 submission trùng), KHÁC `CONVERTED` (tạo/link Worker); `mergedWorkerId` cho MERGED, `workerId` cho CONVERTED | Không auto-merge nếu chỉ trùng một khóa; merge queue yêu cầu HR confirm. **V5.3 (C-04):** schema hiện chỉ có `MERGED`, THIẾU `CONVERTED`/`NEEDS_INFO` → MP-3 phải bổ sung qua enum-hóa (§12 RF-14), không dùng lẫn MERGED↔CONVERTED |
| V5-M35-05 | Referral Guard | Claim source, first-click attribution, guard 7 ngày/hoa hồng active/vendor payroll, override có permission và evidence | Các trường hợp PROTECTED/EXPIRED/OVERRIDE_REQUESTED hiển thị đúng UI; override tạo audit |
| V5-M35-06 | 1-ACTIVE assignment và transfer | Partial unique index, transfer preview, đóng assignment cũ và mở mới trong transaction | Không có hai assignment chiếm chỗ; quota không âm; transfer giữa project trong tháng có lịch sử |
| V5-M35-07 | Employment episode và AWOL | `SUSPENDED` có resume; terminated không sửa lịch sử; vắng ≥3 ngày tạo `AWOL_REVIEW` | Đóng/nhả quota bằng một command có audit; tái tuyển tạo episode mới |
| V5-M35-08 | Dedup/merge workbench | Chuẩn hóa SĐT/CCCD, candidate key, merge queue, undo/audit | Merge ≥2/3 khóa mới auto; trùng một khóa chỉ gợi ý; mọi foreign key được chuyển an toàn |
| V5-M35-09 | PM Field App/PWA | Offline queue, GPS evidence, nút thao tác lớn, bulk transfer; PM scope theo project | Offline event có capturedAt/receivedAt/timezone; retry idempotent; PM không thấy project ngoài scope |

### 4.5. M7 — Attendance import, chấm công hai luồng và chốt kỳ (P0/P1)

| ID | Công việc chi tiết | Phạm vi/artefact | Acceptance criteria |
|---|---|---|---|
| V5-M7-01 | Import qua presigned R2 | Upload trực tiếp R2, magic bytes, size/row cap, file checksum, fileUrl/audit | API không nhận file lớn qua body; file giả mạo bị từ chối; tải lại được file gốc |
| V5-M7-02 | Import job tích hợp QStash contract `V5-OPS-01` | Batch/job state, chunk/continuation, retry tối đa 3, DLQ, watchdog; không triển khai QStash client riêng trong M7 | Trạng thái `QUEUED/RUNNING/PARTIAL/COMPLETED/FAILED`; retry không tạo duplicate |
| V5-M7-03 | Mapping và unmatched workbench | Column mapping theo vendor/site, normalize mã worker, taxonomy lỗi | Mỗi dòng có error code, raw value, suggested fix; HR sửa/retry từng dòng hoặc batch |
| V5-M7-04 | Hai luồng attendance | Luồng file vendor và GPS/PM evidence cùng ghi raw `AttendanceEvent`; precedence/conflict rõ | Không ghi đè raw event; conflict tạo exception; source và confidence được lưu |
| V5-M7-05 | Check-in write path tích hợp queue contract | Spike 5.000 request; nếu dùng QStash trả 202 + receipt/status polling; nếu sync đạt SLO phải ghi ADR đo được | Worker không nhận “thành công giả”; `QUEUED → APPENDED/FAILED`; DLQ có notify |
| V5-M7-06 | Timezone/ca đêm/ngày lễ | `work_date` theo VN; source timezone/site; ca đêm thuộc ngày bắt đầu; split holiday sau 00:00 | Golden tests cho UTC/VN, ca 22:00–06:00, lễ và OT 300% |
| V5-M7-07 | Timesheet approve/lock/correction | Raw → normalized line → period; lock bất biến; correction tạo adjustment | Không update record LOCKED; adjustment liên kết period/version cũ |
| V5-M7-08 | Exception Workbench UI | Master-detail, resolve drawer, locked read-only, import progress/failed | Đối chiếu các mockup S03; thao tác bulk có confirm và audit |

### 4.6. M8 — Rate card, reconciliation, payment state và lineage (P0)

| ID | Công việc chi tiết | Phạm vi/artefact | Acceptance criteria |
|---|---|---|---|
| V5-M8-01 | Rate card effective-dated | Rate theo site/slot/shift/day category, currency, unit, rounding, approval, no-overlap | Resolve duy nhất một rate tại `asOf`; rate được snapshot vào statement line |
| V5-M8-02 | Tách vendor payable và client billing | Hai statement độc lập; không suy vendor bằng `findFirst()` | Vendor resolve qua assignment → order/slot → vendor contract; client qua project contract |
| V5-M8-03 | Statement lineage | Line snapshot timesheet period/version, rate/version, quantity/unit, formulaVersion, inputSnapshot | Drawer trace được raw event → timesheet line → rate → statement line → total |
| V5-M8-04 | Decimal-safe hours và BigInt money | Decimal hours không `Number()`/`Math.round()`; BigInt VND | Case 7.5h, 0.25h, OT hệ số và làm tròn có kết quả định trước |
| V5-M8-05 | Revision/dispute workflow | `DRAFT → ISSUED → CONFIRMED/DISPUTED → REVISED → LOCKED`; revision `supersedesId`. **V5.3 (C-03):** schema hiện là `DRAFT\|SENT\|DISPUTED\|CONFIRMED\|LOCKED\|PAID` — `SENT`≠`ISSUED`, thiếu `REVISED`, và `PAID` bị lẫn vào status statement (phải tách sang payment sub-ledger M8-06). Enum-hóa (§12 RF-14) phải migrate vocab về đúng máy trạng thái này | Dispute không sửa statement đã gửi; tối đa 2 vòng, SLA và FORCE_LOCK có reason/permission |
| V5-M8-06 | Payment sub-ledger | `Payment`, `PaymentAllocation`, partial payment, refund/reversal; tách `LOCKED` khỏi `PAID` | Có `PAYMENT_PENDING/PARTIALLY_PAID/PAID`; phân bổ không vượt outstanding; audit người duyệt |
| V5-M8-07 | Reconciliation UI | Margin comparison, lineage drawer, vendor dispute form, empty/locked states | Khớp S04; không hiển thị margin/client rate cho vendor |
| V5-M8-08 | Client confirmation Q#25 | PDF/link token hết hạn, xác nhận không cần login, manual accounting confirmation có audit | Token one-time/expiry; mọi thay đổi tạo audit; auto-confirm chỉ sau SLA đã chốt |

### 4.7. M6 — Commission dynamic policy và ledger (P0/P1)

| ID | Công việc chi tiết | Phạm vi/artefact | Acceptance criteria |
|---|---|---|---|
| V5-M6-01 | Group-level commission policy | `CommissionGroup`, membership, policy version/effective period, cap, milestone | Policy mặc định resolve theo group, không hard-code trong route |
| V5-M6-02 | Individual override | `CommissionOverride` cho worker/referrer, reason, valid period, createdBy, approvedBy | Override chỉ có hiệu lực khi actor có `CAN_OVERRIDE_INDIVIDUAL_COMMISSION`; có maker-checker nếu giá trị vượt ngưỡng |
| V5-M6-03 | Permission assignment | Gán permission cho bất kỳ user hoặc custom group; deny precedence và version bump | Test user grant, group grant, revoke, expired grant; audit đầy đủ |
| V5-M6-04 | Commission calculation inputs | Hours/assignment/accepted milestone/revenue snapshot; policy id/version trong ledger line | Mỗi ledger line replay được từ input snapshot; không dùng `accepted * 500_000` |
| V5-M6-05 | Revenue commission | Implement `PERCENT_OF_REVENUE` sau khi client billing có canonical revenue | Nếu revenue chưa có, feature flag tắt và response nêu rõ; không trả số giả |
| V5-M6-06 | Reversal/netting/debt | Reversal ledger, `commission_debt`, carry-forward, settlement report | Reversal không làm âm số dư ngầm; cấn trừ kỳ sau có audit và cap |
| V5-M6-07 | CTV dashboard/UI | Ledger theo kỳ, pending/approved/paid, policy explanation, override history | Không hiển thị dữ liệu ngoài scope; hardcoded summary bị loại bỏ |

### 4.8. M8 Payroll shell và phase statutory cuối (P0)

#### 4.8.1. Làm ngay: schema/interface/placeholder, chưa làm engine pháp lý thật

| ID | Công việc chi tiết | Artefact bắt buộc | Acceptance criteria |
|---|---|---|---|
| V5-PAY-01 | Thêm schema pay run | `PayRun`, `WorkerPayResult`, `EarningLine`, `DeductionLine`, `PayslipSnapshot`, `PayrollRule`, `PayRunRuleOverride` | Khóa theo legal entity/payroll group/period; unique một worker/kỳ; trạng thái typed và optimistic lock |
| V5-PAY-02 | Hours breakdown snapshot | 9 nhóm giờ từ timesheet lines, assignment allocation, source version | Replay được input tại thời điểm calculate; sửa timesheet sau LOCK không đổi kết quả |
| V5-PAY-03 | Payroll config effective-dated | `PayrollConfig`, `TaxBracket`, config version, `calcInputSnapshot` | Load config theo `asOfDate`; không fallback silently sang hard-code |
| V5-PAY-04 | Statutory calculator contract | `StatutoryCalculator` interface với adapter `DEFERRED`, `MANUAL`, `MOCK`; production fail-closed | `DEFERRED/MOCKED` không được LOCK payroll production; manual phải có attachment/source snapshot |
| V5-PAY-05 | Gross payroll shell | Calculate gross, allowance, overtime, deduction manual; QStash chunking; dry-run | Job idempotent; retry không nhân đôi line; finalize transaction ngắn |
| V5-PAY-06 | Payslip canonical | Bảng snapshot bất biến + `/api/payslips/:id`; PDF chỉ là projection | Worker chỉ xem payslip của mình; admin scope theo role; không phụ thuộc in-memory cache |
| V5-PAY-07 | Wave cuối: TNCN/BHXH thật | Progressive PIT, BHXH rule, dependent/NPT, 14-day rule, parallel run Excel | ≥10 golden case kế toán; chạy song song 2 kỳ; accountant sign-off trước LOCK |
| V5-PAY-08 | Compliance sau cùng | Mẫu 02/05/07/TK1-TS, quyết toán, báo cáo BHXH, cam kết 02 | Không block MVP/payroll shell; bật bằng feature flag và version pháp lý |

### 4.9. M2/M4/M6 — Marketplace và các portal mở rộng (Marketplace MVP = P0)

> `V5-PORTAL-01..02` và phần apply/screening của `V5-PORTAL-03` thuộc **Marketplace MVP**, được làm trước attendance/payroll. Các phần vendor confirm/dispute, CTV settlement và PWA nâng cao chỉ là phase sau nếu không cần cho vòng giao dịch đầu tiên.

| ID | Công việc chi tiết | Acceptance criteria |
|---|---|---|
| V5-PORTAL-01 | Public job board đọc Project/StaffingOrder thật, ISR 300s, filter ca/khu vực | Không dùng mock; chỉ hiển thị `isPublic`; detail không lộ margin/client nội bộ |
| V5-PORTAL-02 | Marketplace apply funnel | Ứng viên xem detail, nhập thông tin tối thiểu, upload hồ sơ tùy chọn, nhận mã theo dõi và trạng thái | Tạo `CandidateSubmission`, idempotent; không tạo Worker trùng; status page không lộ PII |
| V5-PORTAL-03 | Screening/offer handoff | HR queue sàng lọc, dedup/referral guard, qualify/reject, convert thành Worker và gọi assignment | Chỉ tạo Worker sau bước qualify; mọi conversion có audit; assignment tuân thủ `1-ACTIVE` |
| V5-PORTAL-04 | Vendor portal | Submission, hồ sơ nộp lại một chạm, order status, confirm/dispute statement | Vendor chỉ thấy dữ liệu của mình; dispute giới hạn vòng/SLA |
| V5-PORTAL-05 | CTV portal | Referral link first-click, submission, commission ledger, pending/paid | Attribution có URL/localStorage/manual fallback; không mất nguồn trong in-app browser |
| V5-PORTAL-06 | PM Field PWA | Swipe attendance, offline, bulk transfer, GPS evidence | PM scope theo project; conflict tạo ticket, không overwrite raw evidence |

### 4.10. M9 — HRM nội bộ sau khi core ổn định (P2)

| ID | Công việc chi tiết | Acceptance criteria |
|---|---|---|
| V5-M9-01 | Employee model/actorType EMPLOYEE | Tách employee nội bộ khỏi worker nhưng tái dùng ticket engine | Không ép `Ticket.workerId` cho employee; permission queue đúng 6 role |
| V5-M9-02 | Employee CRUD/org chart | Legal entity, department, manager, position, episode | Org chart và scope PM/HR không lẫn worker outsourcing |
| V5-M9-03 | Nghỉ phép nội bộ | Leave request dùng ticket state machine, balance, 2-step approval nếu cần | Transition/audit/OCC đầy đủ |
| V5-M9-04 | HR profile/performance | Hồ sơ, KPI vận hành, review, attachment | Không đưa KPI “1 giờ = 1 điểm” trở lại; dùng policy/config |

### 4.11. Hardening hạ tầng, bảo mật và vận hành (P0/P1)

| ID | Công việc chi tiết | Acceptance criteria |
|---|---|---|
| V5-OPS-01 | QStash thật cho import, pay run, notification, watchdog | Verify signature; retryable/non-retryable; job state, idempotency, DLQ owner |
| V5-OPS-02 | Distributed cache/rate limit | Upstash Redis hoặc phương án tương đương; không dùng Map in-memory cho security-critical path | Nhiều instance thấy cùng counter/session invalidation |
| V5-OPS-03 | Outbox và notification handlers | Email/SMS/Zalo adapter, transactional outbox, retry/backoff | Không acknowledge job khi chưa có handler; cron 5 phút hoặc queue-triggered |
| V5-OPS-04 | Observability | Sentry/error tracking, structured log, correlation id, job metrics, audit viewer | Có dashboard latency/error/queue depth; PII không lọt log |
| V5-OPS-05 | Backup/restore | Daily Neon → R2, versioning ≥30 ngày, restore branch hàng tháng | RPO ≤24h, RTO mục tiêu ≤4h; checklist restore có checksum/count/smoke query |
| V5-OPS-06 | Security hardening | Headers, CSRF/cookie flags, pagination cap, no Swagger/debug production, signed URL TTL | Security checklist pass; IDOR and bulk dump test pass |
| V5-OPS-07 | Load/performance | Pooler benchmark 5.000 check-in burst, dataset 20k worker, EXPLAIN scope queries | SLO được đo và lưu; quyết định sync/QStash dựa trên số liệu |

### 4.12. Verification/UAT và điều kiện đóng backlog

Mỗi task chỉ được chuyển `DONE` khi có đủ 6 artefact:

1. Migration chạy trên DB sạch và DB nâng cấp.
2. Unit test cho domain rule và state transition.
3. Integration test với database thật cho authorization, idempotency và transaction.
4. Golden test cho tiền/giờ/statement/commission/payroll nếu task có tính toán.
5. Audit evidence: actor, action, reason, before/after hoặc snapshot.
6. Handoff Tier 2 → Tier 3 gồm file đã đổi, command đã chạy, output thật, known limitation và rollback.

**UAT bắt buộc trước MVP:**

- Chạy shadow hai kỳ với Excel kế toán; sai lệch từng worker phải truy được tới lineage.
- Security matrix 8 role × resource × action, gồm DIRECTOR/MKT theo Q#22.
- Test IDOR vendor/client/worker và bulk export.
- Test import file lỗi, retry, duplicate, watchdog và DLQ.
- Test concurrency activate/transfer/lock/reversal.
- Test load burst check-in và pool exhaustion.
- Runbook cutover, rollback, backup restore và owner escalation.

### 4.13. Thứ tự thực hiện dành cho Planner/Coding/Audit

1. `V5-G0-*` phải hoàn tất trước mọi task tính tiền hoặc mở rộng portal.
2. `V5-M1-01..05` và `V5-M35-01..05` là nền tối thiểu cho Marketplace MVP.
3. **Marketplace MVP trước:** `V5-PORTAL-01..03` + `V5-M35-06` + các API screening/conversion; không chờ M7/M8/PAY.
4. Sau khi marketplace chạy được một vòng giao dịch thật, hoàn tất `V5-M1-06..09`, `V5-M35-07..09` và hardening security/observability.
5. `V5-M7-*` hoàn tất trước `V5-M8-*`; `V5-M8-01..08` hoàn tất trước payroll.
6. `V5-PAY-01..06` được làm trước, nhưng `V5-PAY-07..08` chỉ nhận sau khi founder/kế toán mở phase compliance.
7. `V5-M6-*` chỉ bật settlement chính thức sau khi statement/revenue canonical; referral attribution của Marketplace có thể chạy trước settlement.
8. Mỗi task code phải có `TASK.md` một mục tiêu, `HANDOFF.md` một kết quả; Tier 3 viết `AUDIT.md` và chỉ trả về blockers/quyết định cần Planner.

> **V5.3 (C-01/AM-06) — điều kiện dừng đã xác minh:** quy tắc số 1 ("G0 trước portal") **đã bị vi phạm trên thực tế** — MP-1 `ACCEPTED` (`ead9869`) trong khi `V5-G0-04` (CI) và `V5-G0-05` (fixture) = 0% (không có `.github/workflows/`, không có `tests/fixtures/`). Không phá hủy dữ liệu, nhưng mọi evidence hiện là "chạy tay". Để không lặp lại: **`MP-3` KHÔNG được `ACCEPTED` khi `V5-G0-04` và `V5-G0-05` chưa PASS** (launch gate §7.9.7 cần nền cơ khí). MP-2 vẫn được tiếp tục song song (đang giữa vòng), nhưng đóng G0 là điều kiện đóng marketplace track.

### 4.14. Traceability từ nợ V4 sang task V5

| V4 debt/finding | Task V5 |
|---|---|
| TD-01: thiếu Wave 4 schema | V5-PAY-01..06, V5-M6-01..06 |
| TD-02/TD-10: auth/session/refresh chưa production-ready | V5-M1-01..03 |
| TD-03: UI demo/mock | V5-PORTAL-01..06, M15–M18 hiện có ở §2 |
| TD-04/TD-05: thiếu test import/statement/pay run | V5-G0-05, V5-M7-01..08, V5-M8-01..08, V5-PAY-07 |
| TD-06: DB thật/migration baseline | V5-G0-01..02 |
| TD-07/TD-08: ERD/code mẫu không canonical | V5-G0-01, V5-M8-03 |
| TD-09: thiếu Site/rate scope | V5-M35-01, V5-M8-01 |
| R22/R29/R32/R33/R36/R37: import/check-in zombie job | V5-M7-01..05, V5-OPS-01 |
| R25/R31/R35/R38: timezone, ca đêm, BHXH aggregation | V5-M7-06, V5-PAY-07 |
| R26/R39: net âm và commission reversal | V5-M6-06, V5-PAY-05 |
| G22/Q#22: Permission Pool + Visibility Matrix | V5-M1-04..09 |
| G23/Q#23: public job board | V5-PORTAL-01 |
| G16: PM Field App và doanh thu tạm tính | V5-M35-09, V5-PORTAL-06, V5-M8-02 |
| G13: vendor hồ sơ và referral link | V5-M35-05, V5-PORTAL-04..05 |

## 5. Các mục V4 cố ý không đưa vào backlog triển khai hiện tại

- Engine TNCN/BHXH thật trước phase cuối.
- Import PDF và webhook máy chấm công vendor trước khi adapter/nhu cầu thực tế được chốt.
- Multi-tenant SaaS, Capacitor/native app và M10 Assets.
- AI matching/prediction khi chưa có dữ liệu outcome đủ sạch.
- Materialized visibility/resource grant trước khi có `EXPLAIN ANALYZE` chứng minh cần thiết.

Các mục trên chỉ được mở bằng ADR hoặc change request mới, không tự động kéo vào sprint coding hiện tại.

---

## 6. EXECUTION BLUEPRINT — QUY CÁCH ĐỂ TRIỂN KHAI TRIỆT ĐỂ

Phần này biến backlog ở Section 4 thành quy trình giao việc có thể lặp lại cho team 5 dev. Mỗi task Coding phải tuân thủ các contract bên dưới; không tự phát minh format API, status, lỗi hoặc cách lưu tiền riêng.

### 6.1. Vòng đời task T1 → T2 → T3

| Bước | Owner | Đầu ra bắt buộc | Không được chuyển bước khi |
|---|---|---|---|
| T1 — Planning | Planner | `TASK.md` một mục tiêu, scope in/out, file dự kiến, schema/API contract, acceptance, test matrix, rollback | Còn câu “làm cho đầy đủ”, chưa có expected behavior hoặc chưa xác định dependency |
| T2 — Coding | Coding | Code, migration, test, `HANDOFF.md`, command/output thật, known limitations | Build/test đỏ không được che bằng skip; chưa có migration rollback hoặc chưa cập nhật contract |
| T3 — Audit | Audit | `AUDIT.md`: PASS/FAIL, findings theo P0–P3, evidence, regression, residual risk | Chưa chạy test độc lập; chỉ đọc mô tả mà không kiểm tra file/output |
| T1 — Decision | Planner | Quyết định ACCEPT, FIX hoặc SPLIT; cập nhật plan/task status | Có finding P0/P1 chưa có owner hoặc acceptance chưa được sửa |

**Quy tắc kích thước task:** một task T2 tối đa 1–3 ngày công, tối đa một boundary chính (DB, domain, API hoặc UI). Task lớn hơn phải tách `DB → domain → API → UI → test/audit`; không giao một task “làm cả module”.

### 6.2. Mẫu `TASK.md` canonical

Mọi task mới phải dùng cấu trúc sau:

```md
# <TASK-ID> — <Tên ngắn>

## Objective
Một câu mô tả kết quả observable.

## Scope
- In: ...
- Out: ...

## Preconditions
- Task/dependency đã PASS: ...
- Feature flag/config: ...

## Contract
- DB/model/migration: ...
- API/request/response/status code: ...
- Permission/data scope: ...
- State transition/invariant: ...

## Implementation files
- Create: ...
- Modify: ...
- Do not touch: ...

## Acceptance matrix
| Case | Given | When | Then |

## Test commands
...

## Rollback
...
```

`HANDOFF.md` phải ghi hash commit (nếu có), file thay đổi, migration name, seed/fixture, command đã chạy và output; không ghi “đã test” nếu không có output.

### 6.3. Chuẩn API dùng chung

#### 6.3.1. Authentication và scope

- Route private bắt buộc `withAuthScope({ actor, role, permissions, scope })`.
- Route có DB work bắt buộc chạy trong `withDbContext(ctx, work)`; không gọi HTTP/R2/QStash bên trong transaction.
- `ADMIN/ROOT` là short-circuit quyền, nhưng vẫn ghi audit; không bỏ qua pagination hoặc projection.
- `DIRECTOR` đọc toàn bộ projection HR; `MKT` chỉ CRM/project public; `VENDOR` chỉ vendor context; `WORKER` chỉ bản thân.

#### 6.3.2. Request/response

| Loại | Chuẩn |
|---|---|
| Create/command | `POST /api/...`, nhận `Idempotency-Key`, trả `201` hoặc `202` nếu queue |
| Update/transition | `POST /api/.../:id/actions/:action`, không cho client sửa status trực tiếp |
| Read list | `GET`, cursor pagination, filter schema bằng Zod, mặc định tối đa 50 dòng |
| Read detail | Projection DTO theo role, không trả Prisma object thô |
| Async job | `202 { jobId, receiptId, statusUrl }`; status `QUEUED/RUNNING/SUCCEEDED/FAILED` |
| Validation | `400 { code: "VALIDATION_ERROR", fields: [...] }` |
| Auth | `401 AUTH_REQUIRED`, `403 FORBIDDEN`, không tiết lộ object tồn tại trong IDOR |
| Conflict | `409 CONFLICT` hoặc `STALE_VERSION`, trả `currentVersion` nếu được phép |
| Domain | `422 { code: "DOMAIN_*", reason, retryable: false }` |
| Infrastructure | `503 { code: "TEMPORARY_UNAVAILABLE", retryable: true }` |

#### 6.3.3. Idempotency

- Key business là `(actorId, route, idempotencyKey)`; endpoint tài chính thêm `businessScope`.
- Lưu request hash, response status/body, `expiresAt`; cùng key khác payload trả `409 IDEMPOTENCY_PAYLOAD_MISMATCH`.
- QStash dedup chỉ là tối ưu; unique constraint/transaction mới là nguồn sự thật.
- Các command bắt buộc idempotent: activate/transfer, import row, resolve exception, lock period, create statement, calculate pay run, commission reversal, payment allocation.

### 6.4. Chuẩn schema và migration

1. Mọi bảng nghiệp vụ có `id`, `createdAt`, `updatedAt`; record tài chính có `version`/`lockedAt`/`lockedBy` nếu phù hợp.
2. Status ổn định dùng Prisma enum hoặc DB check constraint; không dùng string tự do cho state machine. **V5.3 (C-07/D-03) — đã xác minh vi phạm 100%:** mọi `status` trong `schema.prisma` hiện là `String @default(...)` (Client, Project, StaffingOrder, CandidateSubmission, ProjectAssignment, VendorStatement, TimesheetPeriod...), chỉ ghi giá trị hợp lệ trong comment. Trước V5.3 **không task nào phụ trách enum-hóa** — nay giao cho **§12 RF-14** (`V5-M35-02` phần schema) theo lộ trình expand→migrate→contract.
3. Money dùng `BigInt` và hậu tố `Vnd`; không có field `amount` mơ hồ.
4. Khoảng hiệu lực dùng `[validFrom, validTo)`; `validTo = NULL` nghĩa là vô hạn; không dùng `23:59:59`.
5. Migration phải có: forward SQL, backfill, index, constraint, kiểm tra dữ liệu cũ và kế hoạch rollback.
6. Không drop/rename destructive trong cùng release với code chưa tương thích; dùng expand → migrate → contract.
7. Mọi FK scope phải được khai báo rõ: `workerId`, `projectId`, `assignmentId`, `vendorId`, `clientId`, `actorId`.
8. Index phải phục vụ cả query scope và query nghiệp vụ; kèm `EXPLAIN` trước/sau trên fixture 20k worker.

### 6.5. Chuẩn domain state machine

Mỗi aggregate phải có:

```ts
type TransitionCommand = {
  aggregateId: string;
  action: string;
  expectedVersion: number;
  reason?: string;
  metadata?: Record<string, unknown>;
};

type TransitionResult = {
  id: string;
  from: string;
  to: string;
  version: number;
  auditId: string;
};
```

Service transition phải thực hiện trong một transaction ngắn:

1. Load aggregate + version.
2. Kiểm tra actor/permission/scope.
3. Kiểm tra transition map và invariant liên quan.
4. `UPDATE ... WHERE id AND version`.
5. Ghi transition history/audit.
6. Ghi outbox event nếu có side effect.

Không cho UI gọi `update({ status })` trực tiếp. Mọi transition lỗi phải trả `DOMAIN_INVALID_TRANSITION`, không ném raw Prisma error.

### 6.6. Chuẩn background job/QStash

`V5-OPS-01` cung cấp một job envelope dùng chung:

```ts
type JobEnvelope<T> = {
  jobId: string;
  type: string;
  schemaVersion: 1;
  idempotencyKey: string;
  attempt: number;
  createdAt: string;
  payload: T;
};
```

Handler bắt buộc:

- Verify QStash signature trước parse payload.
- Kiểm tra job state và idempotency trước side effect.
- Phân loại lỗi retryable/non-retryable.
- Cập nhật heartbeat cho job dài.
- Retry tối đa 3; sau đó DLQ có owner, reason và nút requeue có kiểm soát.
- Không gửi email/SMS/R2 trong DB transaction.

### 6.7. Chuẩn tiền, giờ và timezone

- `money.ts` là helper duy nhất cho nhân/chia hệ số, rounding và format VND.
- Giờ công lưu decimal fixed-scale hoặc integer phút; quy định scale trong schema, không dùng float.
- `receivedAt`/`capturedAt` lưu UTC; `workDate` lưu DATE theo lịch VN đã resolve tại ingest.
- Mọi ca đêm phải có test phần trước/sau 00:00 và ngày lễ.
- API không trả BigInt thô; dùng string VND trong JSON (`"12500000"`) và format ở UI.

## 7. PHASE CARDS — CHI TIẾT TRIỂN KHAI THEO THỨ TỰ

### 7.1. Phase G0 — Baseline và khả năng phát hành

**Mục tiêu:** tạo nền có thể build/test/migrate lặp lại trước khi thêm nghiệp vụ.

**Task sequence:** `V5-G0-01 → V5-G0-02 → V5-G0-03 → V5-G0-04 → V5-G0-05`.

**Files chính:** `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`, `src/lib/db.ts`, `package.json`, `.github/workflows/ci.yml`, `tests/fixtures/operations/*`.

**Exit gate:**

- DB sạch và DB nâng cấp đều migrate/seed thành công.
- `npm run typecheck`, `npm test`, `npm run build` có output trong CI.
- Không còn route/domain tạo Prisma client riêng.
- Fixture có thể reset và chạy lặp mà không duplicate.

**Rollback:** migration chỉ được merge khi có down/forward plan; seed dùng upsert business key, không truncate production.

### 7.2. Phase M1 — Identity và security boundary

**Mục tiêu:** không mở rộng endpoint nghiệp vụ khi auth/scope chưa đáng tin cậy.

**Task sequence:** `V5-M1-01..03` → `V5-M1-04` → `V5-M1-05..09`.

**Files chính:** `src/shared/auth/*`, `src/shared/auth/with-auth-scope.ts`, `src/shared/auth/with-db-context.ts`, `src/domains/auth/*`, `app/api/auth/*`, `prisma/schema.prisma`, `prisma/migrations/*`, `tests/security/*`.

**Security matrix tối thiểu — 13 `SystemRole` (đủ theo `prisma/schema.prisma`, không phải 8):**

> V5.3: bảng cũ chỉ liệt kê 8 hàng trong khi enum `SystemRole` có **13 role** (ADMIN, HR_MANAGER, DIRECTOR, HR_STAFF, SALE, PM, ACCOUNTANT, MKT, VENDOR_ADMIN, VENDOR_STAFF, CTV, WORKER, EMPLOYEE — test RLS thật đang chạy 13×N). Mọi role phải có hàng + fixture expected; role ngoài scope = `deny`/0 row, không để mặc định "chưa định nghĩa".

| Role | Worker | Project/CRM | Vendor | Statement | Commission | Payroll |
|---|---|---|---|---|---|---|
| ADMIN | all | all | all | all | all | all |
| HR_MANAGER | read/write scoped | read/write | read | read/write | read | read |
| HR_STAFF | read/write scoped hẹp | assigned project | deny | deny | deny | deny |
| DIRECTOR | read all projection | read all | read all projection | read all | approve/override | read |
| SALE | **projection tối thiểu, không CCCD/bank** | CRM + public project | deny | deny | deny | deny |
| MKT | deny | CRM + public project | deny | deny | deny | deny |
| PM | assigned project workers | assigned project | deny | read project projection | read own KPI | deny |
| ACCOUNTANT | minimum PII | read billing | read vendor statement | read/write reconciliation | read settlement | payroll |
| VENDOR_ADMIN | own submissions/workers/statements | deny | own | own statement | deny | deny |
| VENDOR_STAFF | own scoped (hẹp hơn VENDOR_ADMIN) | deny | own read | own statement read | deny | deny |
| CTV | deny (không PII worker) | public jobs | deny | deny | self referral ledger | deny |
| WORKER | self | public jobs/apply | deny | self payslip/attendance | self referral if applicable | self payslip |
| EMPLOYEE | deny (worker outsourcing) | deny | deny | deny | deny | self payslip/leave (HRM nội bộ) |

> **Application/Submission queue (MP-2/MP-3):** đọc queue = ADMIN, HR_MANAGER, DIRECTOR, SALE theo scope; **HR_STAFF không được mở RLS rộng** cho `candidate_submissions`. Convert/qualify = ADMIN/HR_MANAGER. Chi tiết role×action nằm trong từng TASK marketplace (tránh "scope hiện hành" ngầm định — xem §12 finding "Điểm mơ hồ #5").

**Exit gate:** unit matrix và DB RLS matrix cùng kết quả trên **cả 13 role**; test vendor IDOR (VENDOR_ADMIN↔VENDOR_STAFF↔vendor khác)/MKT+SALE Worker-PII denial/DIRECTOR projection pass.

### 7.3. Phase M3/M5 — Backbone CRM, Worker và Assignment

**Mục tiêu:** tạo nguồn sự thật cho worker/slot/assignment trước attendance.

**Task sequence:** `V5-M35-01` → `V5-M35-02..05` → `V5-M35-06` → `V5-M35-07..09`.

**Domain services canonical:**

| Service | Trách nhiệm | Không được làm |
|---|---|---|
| `worker-lifecycle.service.ts` | Profile/employment/risk transition | Tự sửa assignment |
| `submission.service.ts` | Screening/merge/withdrawal | Tự activate worker |
| `assignment.service.ts` | Activate/pause/resume/end/transfer/quota | Ghi trực tiếp từ UI |
| `referral-guard.service.ts` | Claim/guard/override/evidence | Tự tính commission payout |
| `dedup.service.ts` | Candidate key/merge queue | Auto-merge một khóa |

**Exit gate:** hai PM activate/transfer cùng worker không tạo hai assignment; referral override bị chặn khi thiếu permission; merge không làm mất source history.

### 7.4. Phase M7 — Attendance và timesheet

**Mục tiêu:** raw evidence bất biến, normalized timesheet có thể review, kỳ công lock được.

**Task sequence:** `V5-M7-01..03` → `V5-M7-04..06` → `V5-M7-07` → `V5-M7-08`.

**API tối thiểu:**

| Endpoint | Mục đích | Kết quả |
|---|---|---|
| `POST /api/attendance/imports/presign` | cấp upload URL | `201 { batchId, uploadUrl, expiresAt }` |
| `POST /api/attendance/imports/:batchId/commit` | xác nhận file | `202 { jobId, statusUrl }` |
| `GET /api/attendance/imports/:batchId` | tiến trình/error | projection theo HR/vendor |
| `POST /api/attendance/imports/:batchId/retry` | retry dòng/batch | idempotent |
| `POST /api/m/checkins` | check-in worker/PM | `202` hoặc `201` theo ADR load test |
| `GET /api/m/checkins/:receiptId` | polling receipt | `QUEUED/APPENDED/FAILED` |
| `POST /api/timesheet-periods/:id/actions/approve` | duyệt | transition + audit |
| `POST /api/timesheet-periods/:id/actions/lock` | khóa | bất biến sau lock |

**Exit gate:** import retry không duplicate; ca đêm/ngày lễ đúng; locked period chỉ tạo adjustment; UI S03 phản ánh job state thật.

### 7.5. Phase M8 — Statements, margin và payment

**Mục tiêu:** đối soát được nguồn gốc, dispute/revision không phá số liệu cũ, payment tách khỏi LOCK.

**Task sequence:** `V5-M8-01..04` → `V5-M8-05..06` → `V5-M8-07..08`.

**Calculation pipeline:**

```text
TimesheetPeriod LOCKED
  → resolve assignment/slot/site/contract
  → resolve effective rate
  → snapshot quantity/unit/formula/input
  → generate vendor payable statement
  → generate client receivable statement
  → issue/confirm/dispute/revise
  → lock
  → payment allocation
```

**Exit gate:** statement line trace được ngược tới timesheet; 7.5 giờ không bị round sai; vendor A không thấy client rate/vendor B; partial payment và reversal có số dư đúng.

### 7.6. Phase M6 — Commission

**Mục tiêu:** policy group là default, override cá nhân là exception có quyền và audit.

**Resolve order:**

1. Tìm override cá nhân còn hiệu lực.
2. Nếu có override, kiểm tra `CAN_OVERRIDE_INDIVIDUAL_COMMISSION` của actor tạo/duyệt.
3. Nếu không có, resolve policy group theo effective date.
4. Nếu không có group policy, dùng policy hệ thống đã versioned.
5. Snapshot policy/rate/input vào ledger line.

**Exit gate:** cùng input + cùng policy version cho kết quả replay giống nhau; override hết hạn quay về group default; reversal tạo debt/carry-forward, không âm ngầm.

### 7.7. Phase PAY — Payroll shell trước, statutory engine sau

**Mục tiêu:** hợp đồng dữ liệu payroll ổn định mà không đưa logic pháp lý thật vào sớm.

**PAY-01..06:** được triển khai sau M7/M8; dùng `DEFERRED`, `MANUAL` hoặc `MOCK` adapter; production không LOCK nếu statutory status không hợp lệ.

**PAY-07..08:** chỉ mở khi có owner kế toán, bộ case thật, version luật/config và sign-off. Không gộp vào sprint portal.

**Exit gate payroll shell:** pay run dry-run/retry/chunk/finalize idempotent; payslip snapshot bất biến; worker chỉ xem payslip của mình; mọi input có `calcInputSnapshot`.

### 7.8. Phase Portal/UI — sau khi domain contract ổn định

UI task chỉ được bắt đầu khi API contract và fixture đã có. Mỗi màn hình phải có:

- Loading, empty, error, stale, locked/read-only state.
- Permission-denied state và field projection theo role.
- Optimistic UI chỉ dùng cho thao tác không tài chính; financial command chờ server result.
- Error code domain hiển thị thành copy nghiệp vụ, không hiện raw exception.
- Playwright happy path và screenshot baseline cho mockup tương ứng.

### 7.9. Marketplace-first launch track — đường găng kinh doanh

#### 7.9.1. Mục tiêu MVP

Marketplace MVP không cố trở thành nền tảng job marketplace đa tenant ngay từ đầu. Mục tiêu là giúp HRP vận hành được một chợ việc làm công khai cho các vị trí do HRP quản lý, với dữ liệu và trạng thái đủ để biến ứng viên thành người lao động được xếp vào dự án.

**Vòng giao dịch bắt buộc:**

```text
HR tạo Project
  → tạo StaffingOrder + StaffingOrderSlot
  → bật isPublic
  → ứng viên tìm/lọc/xem Job Detail
  → ứng viên submit CandidateSubmission
  → HR screening queue
  → dedup + Referral Guard
  → QUALIFIED
  → convert Worker
  → tạo/activate ProjectAssignment
  → ứng viên xem trạng thái và nhận hướng dẫn tiếp theo
```

#### 7.9.2. Phạm vi phải có trước lần vận hành đầu tiên

| Nhóm | Bắt buộc | Không cần cho Marketplace MVP |
|---|---|---|
| Job management | Project, StaffingOrder, Slot, ca, khu vực, headcount, public flag, expiry | Margin dashboard, billing client, rate card đầy đủ |
| Public discovery | Job list/detail, filter khu vực/ca, empty/error/loading, SEO/ISR | Recommendation/AI matching |
| Apply | Form tối thiểu, consent, phone/contact, CV/file tùy chọn, idempotency | eKYC, OCR CCCD, native app |
| Screening | Queue theo trạng thái, detail ứng viên, note, qualify/reject/withdraw | Full ATS automation |
| Worker conversion | CandidateSubmission → Worker, source claim, dedup review | Payroll, BHXH, payslip |
| Placement | Assignment preview/activate, 1-ACTIVE guard, quota check | Attendance lock/pay run |
| Feedback | Application tracking code/status page, notification adapter tối thiểu | Zalo automation nâng cao |
| Security | public/private projection, rate limit, anti-spam, audit, signed upload | Multi-tenant SaaS |

#### 7.9.3. Data contract Marketplace

Các object tối thiểu phải có quan hệ và business key rõ ràng:

| Object | Trường bắt buộc | Invariant |
|---|---|---|
| `Project` | `id`, `name`, `clientId`, `status`, `isPublic`, `publicSlug` | Chỉ project active/public mới xuất hiện public |
| `StaffingOrder` | `projectId`, `status`, `openAt`, `closeAt` | Order đóng/expired không nhận apply mới |
| `StaffingOrderSlot` | `orderId`, `position`, `shiftCode`, `headcount`, `filled` projection | `filled` suy ra từ assignment, không phải nguồn sự thật |
| `CandidateSubmission` | `id`, `publicTrackingCode`, `slotId`, `contact`, `status`, `source` | Unique idempotency; không tự tạo Worker khi submit |
| `SourceClaim` | `candidate/submission`, source type, referrer, first/accepted flags | Một accepted source; Referral Guard có audit |
| `Worker` | master data chuẩn hóa, profile status | Chỉ tạo sau qualify/convert hoặc HR add |
| `ProjectAssignment` | worker, slot, valid interval, status | Không có hai assignment chiếm chỗ |
| `ApplicationStatusHistory` | submission, from/to, actor/reason, timestamp | Candidate status page lấy từ history/projection |

> **V5.3 (C-05) — `publicSlug` drift đã xác minh:** `prisma/schema.prisma` **chưa có** trường `publicSlug` (grep = 0); MP-1 (ACCEPTED `ead9869`) đang dùng `Project.code` làm slug URL công khai (`src/domains/job-board/public.service.ts`). Dùng mã nội bộ làm URL public là nợ kỹ thuật: không đổi độc lập được, lộ quy ước mã nội bộ. **Quyết định cần chốt (§12 RF-20):** hoặc (a) thêm trường `publicSlug` + migrate (đúng contract §7.9.3), hoặc (b) ADR chấp nhận `code` làm slug và **sửa contract này** cho khớp thực tế. Không để plan và code mâu thuẫn ngầm.

> **V5.3 (§3.1 mơ hồ #3) — Upload CV MP-2:** contract chỉ ghi "CV/file tùy chọn". Trước khi audit MP-2 phải chốt trong TASK: metadata-only hay R2 presign; whitelist mime/size; hay **out-of-scope đích danh** (MP-2 hiện KHÔNG làm upload — xem TASK mp2 v1.1). Không để Tier 2 tự chế cơ chế storage.

#### 7.9.4. API contract Marketplace MVP

| Endpoint | Actor | Kết quả chính |
|---|---|---|
| `GET /api/public/jobs` | Public | Chỉ public projection, cursor pagination, filter `q/area/shift` |
| `GET /api/public/jobs/:slug` | Public | Job detail, không lộ client rate/margin/internal notes |
| `POST /api/public/jobs/:slug/applications` | Public | `201 { trackingCode, status }`; nhận `Idempotency-Key` |
| `GET /api/public/applications/:trackingCode` | Applicant | Status projection, rate limit, không trả PII đầy đủ |
| `GET /api/admin/applications` | HR/Sale | Queue filter theo slot/status/source/risk |
| `GET /api/admin/applications/:id` | HR/Sale | Detail projection, source claims, dedup candidates |
| `POST /api/admin/applications/:id/actions/screen` | HR/Sale | Ghi note + chuyển `SCREENING` |
| `POST /api/admin/applications/:id/actions/qualify` | HR/Manager | Chuyển `QUALIFIED`, chưa tự activate assignment |
| `POST /api/admin/applications/:id/actions/reject` | HR | Reason bắt buộc, candidate status cập nhật |
| `POST /api/admin/applications/:id/actions/convert` | HR | Transaction tạo/link Worker + accepted source claim |
| `POST /api/admin/assignments/preview` | HR/Manager | Kiểm tra slot/quota/1-active/referral guard |
| `POST /api/admin/assignments` | HR/Manager | Activate assignment canonical `V5-M35-06` |

#### 7.9.5. Marketplace state machine tối thiểu

```text
NEW → SCREENING → QUALIFIED → CONVERTED
  ├──────────────→ REJECTED
  ├──────────────→ WITHDRAWN
  └──────────────→ NEEDS_INFO → SCREENING
```

Quy tắc:

- `CONVERTED` bắt buộc có `workerId` và accepted source claim.
- **V5.3 (C-04):** `status` hiện là string tự do và schema mới có `MERGED`, **chưa có `CONVERTED`/`NEEDS_INFO`**. MP-3 phải bổ sung hai trạng thái này qua enum-hóa (§12 RF-14). `MERGED` (dedup) không được dùng thay `CONVERTED` (convert-to-Worker).
- `QUALIFIED` chưa có nghĩa là đã được xếp việc.
- Tạo assignment là command riêng, có preview và quota check.
- `REJECTED` phải có reason; ứng viên có thể xem trạng thái tổng quát nhưng không xem internal note.
- Apply lại cùng một slot trong thời gian guard phải trả submission hiện hữu hoặc `DUPLICATE_APPLICATION`, không tạo bản ghi mới.

#### 7.9.6. Kế hoạch triển khai Marketplace trong 3 sprint

| Sprint | Phạm vi | Demo/exit gate |
|---|---|---|
| MP-1 | Project/StaffingOrder/Slot public projection, admin create/edit/publish, public job list/detail | Tạo 1 job và thấy đúng trên public URL; job đóng không còn nhận apply |
| MP-2 | Apply funnel, CandidateSubmission, tracking code, application queue, status history, upload giới hạn | Ứng viên submit một lần, HR thấy queue, applicant tra được trạng thái |
| MP-3 | Dedup/referral guard, qualify/reject/convert, Worker link, assignment preview/activate, audit/security | Một ứng viên đi hết vòng tới assignment; duplicate/IDOR/quota conflict bị chặn |

**Không đưa vào MP-1..MP-3:** payroll, tax/insurance, vendor payment, client invoice, commission settlement, GPS attendance và AI matching.

> **V5.3 (AM-01) — một đường apply public duy nhất:** đã xác minh tồn tại **2 route apply** — canonical `POST /api/public/jobs/:slug/applications` và legacy `app/api/jobs/apply/route.ts` (projectId-based). MP-2 **phải deprecate route legacy trong chính task** (410/redirect canonical) và loại side-effect tạo Worker/SourceClaim khi anonymous apply. Ràng buộc này đã nằm trong `docs/tasks/hrp-mp2-apply-tracking/TASK.md` v1.1 (EV-08, STEP-02); ghi vào plan để không tồn dư 2 entry point public.

#### 7.9.7. Marketplace launch gate

Chỉ mở public thật khi đạt đủ:

1. Job public projection không lộ dữ liệu nội bộ và có rate limit.
2. Apply có idempotency, anti-spam cơ bản và upload được kiểm tra magic bytes/size.
3. HR có screening queue và không thể convert trùng Worker.
4. Referral Guard và dedup có thể giải quyết thủ công, có audit.
5. Assignment preview chặn quota âm và vi phạm `1-ACTIVE`.
6. Candidate có tracking/status page không cần login.
7. Có runbook ẩn job, khóa slot, xử lý duplicate, xóa file và rollback public flag.
8. Tier 3 đã test public/private projection, IDOR, spam, duplicate apply và conversion race.

### 7.10. Backend/Frontend delta sau mỗi phase

Bảng này là checklist bắt buộc khi kết thúc phase. “Backend thay đổi” mô tả contract/runtime; “Frontend thay đổi” mô tả màn hình, state và cách người dùng nhận thấy kết quả. Phase không được báo cáo hoàn tất nếu một trong hai cột chưa có evidence hoặc được ghi rõ là `N/A` theo scope.

| Phase | Backend thay đổi | Frontend thay đổi | Kết quả người dùng nhìn thấy |
|---|---|---|---|
| G0 Baseline | Prisma canonical, migration/seed, DB singleton, CI scripts, fixture | Không mở feature mới; chuẩn hóa route/layout/token build nếu cần | Build/test/migrate lặp lại được; chưa coi là feature business |
| M1 Identity/RLS | AuthIdentity, session/refresh, OTP, Permission Pool, custom group, `withDbContext`, RLS, projection DTO | Login/session expiry, role-aware navigation, 401/403/locked states, không render field bị deny | Mỗi role chỉ thấy đúng dữ liệu và thao tác được cấp |
| M3/M5 Backbone | Site, StaffingOrder/Slot, Worker/submission/source claim, 5 state machines, dedup, referral, assignment/quota | Admin Client/Project/Worker/Staffing screens, status badges, conflict/guard drawers, audit timeline | HR tạo được nhu cầu và quản lý worker/assignment không vi phạm invariant |
| MP-1 Publish job | Project/StaffingOrder CRUD, public projection, `publicSlug`, expiry/index/cache policy | Admin Jobs create/edit/publish/unpublish; public job list/detail, filter, empty/loading/error | HR publish 1 việc và ứng viên nhìn thấy đúng việc công khai |
| MP-2 Apply | `CandidateSubmission`, application status history, upload metadata, idempotency, tracking-code query | Public Apply form, validation, upload progress/error, success tracking page; HR application queue | Ứng viên submit một lần; HR thấy hồ sơ; ứng viên tự tra trạng thái |
| MP-3 Convert/Place | Screening/qualify/reject/withdraw commands, dedup/referral guard, Worker conversion, assignment preview/activate | Screening drawer, duplicate/guard warning, conversion confirmation, assignment preview, status update | Một ứng viên đi hết tới Worker/Assignment; duplicate/quota/1-active bị chặn rõ ràng |
| M7 Attendance | R2 presign, import job/QStash, raw events, normalized lines, exceptions, approve/lock/correction | Import wizard/progress/error, Exception Workbench, Resolve Drawer, locked read-only; worker/PM check-in states | HR xử lý được công và biết chính xác job/event đang QUEUED/APPENDED/FAILED |
| M8 Billing/Reconciliation | Site/rate version, statement lineage, vendor/client split, dispute/revision, payment sub-ledger | Margin comparison, lineage drawer, vendor dispute form, locked/payment states, exports | Kế toán truy được từng dòng tiền và không sửa statement đã lock |
| M6 Commission | Group policy, individual override, permission, ledger/reversal/debt/netting, snapshot | Admin policy/override screens, CTV ledger/pending/approved/paid/debt | Hoa hồng thay đổi theo policy thật; không còn hardcode |
| PAY shell | PayRun/results/lines/payslip snapshot, QStash chunk, manual/deferred statutory adapter | Payroll dry-run/status, result review, payslip scope; không mở statutory UI nếu flag tắt | Có thể dry-run và phát snapshot có kiểm soát; chưa tuyên bố compliance hoàn chỉnh |
| PAY statutory | TNCN/BHXH engine, config/rules/dependent/forms, parallel-run evidence | Payroll statutory breakdown, warnings, accountant approval, compliance reports | Chỉ sau sign-off mới được LOCK/phát hành theo luật |
| M4 Vendor | Vendor submission/document vault/confirm-dispute scoped APIs | Vendor order/submission/statement/dispute screens, own-only projection | Vendor tự theo dõi và phản hồi đúng dữ liệu của mình |
| M2 Worker/PM PWA | Offline queue, GPS evidence, receipt polling, worker self-scope | Mobile check-in, application/assignment status, attendance/payslip links, offline/retry | Worker dùng được trên mạng yếu; không hiển thị thành công giả |
| M9 HRM | Employee/actorType, org/leave/ticket reuse, performance records | Employee directory/org chart/leave/performance screens | HR quản lý nhân sự nội bộ tách khỏi worker outsourcing |
| OPS hardening | QStash contract, outbox handlers, Redis rate limit, Sentry, backup/restore, metrics | Stale banner, job retry/DLQ views, operational error states | Team vận hành nhìn thấy lỗi, retry và rollback có kiểm soát |

## 8. TEST STRATEGY CHI TIẾT

### 8.1. Test pyramid

| Tầng | Phạm vi | Tỷ lệ kỳ vọng | Database |
|---|---|---:|---|
| Unit | pure calculator, transition map, parser, money/time | cao | mock/không DB |
| Domain integration | transaction, invariant, idempotency, audit | trung bình | Postgres test DB |
| Security integration | role × resource × action, RLS/IDOR | bắt buộc P0 | Postgres runtime role |
| API contract | status code, DTO, error code, pagination | theo route | Postgres test DB |
| E2E/browser | 1 happy path/critical state/module | thấp nhưng bắt buộc | seeded DB |
| Load | check-in/import/query scope/pay chunk | theo gate | staging |

### 8.2. Test matrix bắt buộc theo domain

| Domain | Case tối thiểu |
|---|---|
| Marketplace | public projection, publish/unpublish, apply idempotency, tracking status, duplicate apply, screening race, conversion race, quota/1-active |
| Auth/RLS | root, DIRECTOR projection, MKT deny Worker, PM scope, vendor IDOR, worker self-only |
| Assignment | activate race, transfer giữa kỳ, pause/resume, quota full, terminal status, stale version |
| Referral | protected, expired, override denied, override granted, first-click, duplicate submission |
| Import | bad magic bytes, oversized file, duplicate row, unmatched worker, retry, DLQ, watchdog |
| Attendance | GPS/file conflict, offline timestamp, timezone, overnight, holiday, locked correction |
| Statement | vendor/client split, rate overlap, 7.5h, revision, dispute max round, partial payment |
| Commission | group default, individual override, permission revoke, cap, reversal/debt/netting |
| Payroll shell | chunk retry, dry-run replace, input snapshot, manual statutory, net negative, payslip scope |

### 8.3. Regression policy

- P0/P1 bug phải có regression test trước khi đóng.
- Không dùng `skip` để che test môi trường; test cần DB phải báo `ENV_BLOCKED` riêng trong CI.
- Golden test thay đổi phải ghi reason/version và được Planner/Audit duyệt.
- Mỗi migration thêm constraint phải có test chứng minh dữ liệu cũ không vi phạm hoặc đã được backfill.
- **V5.3 (T-03/AM-07):** integration test hiện đọc `DATABASE_URL` trỏ **Neon dev chung** (`fileParallelism: false`, ~100s/suite). Khi lên CI phải chuyển sang **`DATABASE_URL_TEST` (DB test riêng)** và đánh `ENV_BLOCKED` cho đến khi có secret; không chạy integration lên DB dev chia sẻ trong CI.
- **V5.3 (C-08):** cập nhật `DEC-14` (cũ: "test mock, không DB thật") thành **hybrid** — unit mock + ~10 file integration dùng Neon dev thật (RLS matrix 13 role, IDOR, idempotency/outbox). Tier mới KHÔNG được bỏ integration test theo handover cũ.

## 9. RELEASE, ROLLBACK VÀ OPERATIONS RUNBOOK

### 9.1. Release checklist

1. CI xanh: format, typecheck, unit, integration, security, build.
2. Migration dry-run trên staging clone.
3. Seed/fixture version khớp code.
4. Feature flag mặc định an toàn (`false` cho portal/commission/statutory mới).
5. Smoke test auth → publish job → apply → screening → convert Worker → assignment; sau đó mới smoke attendance → statement.
6. Kiểm tra queue depth, DB connections, error rate, Sentry và backup gần nhất.
7. Phê duyệt cutover bởi Planner + Coding + Audit; task không được tự deploy production.

### 9.2. Rollback policy

- Code rollback độc lập migration rollback.
- Migration destructive không rollback bằng `down` tự động; dùng forward fix hoặc restore branch.
- Pay run/statement/commission đã LOCK không rollback bằng xóa dữ liệu; dùng reversal/adjustment/revision.
- QStash job đang chạy phải pause/requeue theo `jobId`; không gửi lại bằng cách tạo request mới không idempotency.
- Feature flag tắt trước khi rollback code nếu side effect còn đang phát sinh.

### 9.3. Operational dashboards

Tối thiểu phải quan sát được:

- DB connection usage, transaction latency, slow query theo scope.
- Import queue: queued/running/failed/DLQ/oldest job.
- Check-in: accepted/queued/appended/failed và latency p95.
- Timesheet: unlocked periods, exception count, unmatched count.
- Statements: draft/disputed/locked/payment pending/outstanding.
- Commission: pending/approved/paid/debt/reversal.
- Payroll: dry-run/running/failed/locked và statutory status.
- Authorization denials, IDOR attempts và audit log write failures.

## 10. DECISION REGISTER CẦN DUY TRÌ TRONG V5

| Decision | Owner | Khi nào cần chốt | Nếu chưa chốt |
|---|---|---|---|
| Sync hay QStash cho check-in | Founder + Architect | Sau load spike 5.000 request | Không gọi endpoint production-ready |
| Rate rounding/decimal scale | Accounting + Planner | **ADR interim GẤP (V5.3): trước bất kỳ statement nào chạy thật** | Không lock statement — VÀ xem cảnh báo dưới |

> **V5.3 (A-04/RF-03) — sai tiền đang chạy, đã xác minh:** `src/domains/reconciliation/statement.service.ts:183` và `:308` dùng `BigInt(Math.round(item.totalHours)) * rate` — **làm tròn giờ thành số nguyên TRƯỚC khi nhân rate** (7.5h → 8h). Vi phạm chính exit gate §7.5 ("7.5 giờ không bị round sai") và AC `V5-M8-04`. Đây không phải "chưa chốt thì không làm" mà là **defect đang tồn tại trong code đã merge**. Cần ADR interim rounding (nhân Decimal hours × BigInt rate, làm tròn **sau khi nhân**, qua `money.ts`) + hotfix (§12 RF-03) — không chờ mở phase M8.

> **V5.3 (C-10) — phân biệt "decision gate" vs "open question":** các dòng trong Decision Register này là **decision gate theo phase** (chốt trước khi mở phase tương ứng), KHÔNG phải open-question chặn mọi task. Guide §4.1 chỉ yêu cầu "Open Questions của TASK phải rỗng nếu ảnh hưởng implementation của chính task đó" — không đồng nghĩa phải đóng toàn bộ decision hệ thống trước mỗi `/code`.
| Commission override threshold/maker-checker | Founder + Finance | Trước V5-M6-02 | Chỉ cho group default |
| Payroll shell manual adapter | Accounting | Trước V5-PAY-04 | Chỉ dry-run, không phát payslip chính thức |
| Q#25 client confirmation | Founder + Accounting | Trước V5-M8-08 | Manual confirmation có audit |
| Backup RPO/RTO | Founder + Ops | Trước production | Chỉ MVP demo, không nhận PII thật |

## 11. FINAL DEFINITION OF DONE CHO V5

V5 chỉ được đánh dấu hoàn tất khi tất cả điều kiện sau đạt:

- Marketplace MVP đã vận hành được vòng tạo việc → công khai → ứng tuyển → screening → convert Worker → assignment trên dữ liệu thật đã ẩn danh.
- Public job board và application tracking có projection, rate limit, idempotency, anti-spam và test IDOR.
- HR có screening/convert queue; duplicate application, duplicate Worker và quota/1-ACTIVE conflict đều bị chặn.
- Không còn P0/P1 chưa có owner, deadline hoặc mitigation.
- G0, M1, M3/M5, M7, M8 core có migration/integration/security evidence.
- Mỗi API critical có idempotency, permission, projection, audit và error contract.
- Mỗi state machine có transition test, OCC/version guard và terminal invariant.
- Attendance/reconciliation chạy được trên dữ liệu thật đã ẩn danh trong ít nhất hai kỳ.
- Commission không còn hardcode; group/individual override replay được.
- Payroll shell có schema/interface/payslip snapshot; statutory engine chỉ bật khi đã sign-off phase cuối.
- UI S02/S03/S04 dùng API canonical, có toàn bộ loading/empty/error/locked/permission states.
- CI, backup/restore, observability, rollback và runbook đã được Audit kiểm tra độc lập.
- `AUDIT.md` cuối cùng ghi rõ PASS, residual risks và danh sách việc post-go-live; không dùng trạng thái “đã xong” chỉ dựa trên build pass.

## 12. TECHNICAL DEBT & REFACTORING BACKLOG (tiếp thu V5 Readiness Assessment 2026-08-22)

Nguồn: `docs/V5_READINESS_ASSESSMENT.md`. **Nguyên tắc Planner:** chỉ tiếp thu finding **đã tự xác minh bằng tool thật** (Iron Rule 4). Bảng dưới ghi rõ verdict + bằng chứng; finding sai bị **từ chối có dẫn chứng**.

### 12.1. Bảng phán quyết finding (đã Planner verify)

| Finding | Nội dung | Verdict | Bằng chứng Planner tự kiểm |
|---|---|---|---|
| A-01 | `app/api/debug` không auth, dump PII worker + env | ✅ NHẬN (P0) | `app/api/debug/route.ts`: `GET()` không guard, `findFirst({phone:'0910000002'})` hardcode, trả `workerUser`+`worker` đầy đủ (URL đã mask) |
| A-02 | `withAuthScope` định nghĩa nhưng 0 route dùng | ✅ NHẬN (P0) | grep `withAuthScope` trong `app/` = **0 match** |
| A-03 | GET workers không projection → PII cho SALE/DIRECTOR | ✅ NHẬN (P0, có điều chỉnh) | `app/api/workers/route.ts:53` `findMany` không `select`; `VIEWER_ROLES` gồm SALE, DIRECTOR. **Điều chỉnh:** route ĐÃ có auth (`getAuthContext`) — lỗi thuần là **thiếu field projection**, không phải thiếu auth |
| A-04 | Round giờ → int trước khi nhân rate (sai tiền) | ✅ NHẬN (P0, nghiêm trọng) | `src/domains/reconciliation/statement.service.ts:183` và `:308`: `BigInt(Math.round(item.totalHours)) * rate` — 7.5h→8h |
| A-06 | Commission hardcode `accepted * 500_000` | ✅ NHẬN (P1, có điều chỉnh) | `app/api/ctv/summary/route.ts:44` literal có thật. **Điều chỉnh:** route đã có `note` disclaim + đọc `SourceClaim` (không phải "số giả không cảnh báo") — vẫn sửa để đọc `CommissionLedger` thật |
| C-01 | Vi phạm thứ tự G0-trước-portal | ✅ NHẬN (P1) | §4.13 quy tắc 1 yêu cầu G0 trước; MP-1 ACCEPTED (`ead9869`) khi chưa có `.github/workflows/` và `tests/fixtures/` |
| C-02 | Matrix 8 role vs hệ thống 13 | ✅ NHẬN (P1) | `schema.prisma:106-120` enum `SystemRole` = **13 giá trị**; §7.2 cũ chỉ 8 hàng |
| C-04 | Submission thiếu CONVERTED/NEEDS_INFO, lẫn với MERGED | ✅ NHẬN (P1) | `schema.prisma:461` `status String` comment `NEW\|SCREENING\|QUALIFIED\|REJECTED\|WITHDRAWN\|MERGED` — không có CONVERTED/NEEDS_INFO |
| C-05 | `publicSlug` plan yêu cầu nhưng schema không có | ✅ NHẬN (P2) | grep `publicSlug`/`public_slug` trong schema = **0**; §7.9.3 liệt kê `publicSlug` bắt buộc; MP-1 dùng `Project.code` |
| C-07 | Quy tắc enum §6.4.2 bị vi phạm 100%, không task phụ trách | ✅ NHẬN (P1) | mọi `status` trong schema là `String @default`; chỉ Ticket dùng enum |
| C-03 | Vocab statement SENT vs ISSUED, PAID lẫn status | ✅ NHẬN (schema-only) | `schema.prisma:791` `DRAFT\|SENT\|DISPUTED\|CONFIRMED\|LOCKED\|PAID`. **Điều chỉnh:** plan §4.6 M8-05 ĐÃ đúng vocab (ISSUED/REVISED, tách PAID) — chỉ **schema** lệch → task migrate, KHÔNG sửa plan |
| AM-01 | 2 đường apply public song song | ✅ NHẬN | tồn tại `app/api/jobs/apply/route.ts` (legacy) + canonical `/api/public/jobs/:slug/applications` |
| T-01/02/05 | Không CI, không fixture, seed chưa đạt G0-02 | ✅ NHẬN | không `.github/workflows/`; không `tests/fixtures/`; khớp `V5-G0-04/05` chưa bắt đầu |
| D-05 / D-06 | FK mồ côi + thiếu index; trường song song | ✅ NHẬN (P1/P2) | verify `accountUserId` (:247) + `slotsFilled` (:393) cùng tồn tại; FK/index cần audit từng bảng khi làm RF-15 |
| **D-01** | **"MP-2 migration drift: WIP `20260822030000_mp2_apply_tracking` thêm cột schema chưa có"** | ❌ **TỪ CHỐI (lỗi thời/sai)** | **Glob `prisma/migrations/*mp2*` = No files found.** Không tồn tại migration MP-2 nào; grep `public_tracking_code`/`application_status_history`/`cv_storage_key` trong schema = 0. MP-2 round-1 `BLOCKED`, HANDOFF ghi "no migration retained". Assessment đã khảo sát trên **worktree tạm** không phản ánh commit hiện hành (`0a0bd53`) |

### 12.2. Refactoring backlog theo Wave (map vào task ID V5; mỗi task ≤1–3 ngày, ≤1 boundary — sẵn sàng cho Tier 1 dựng TASK.md)

**Wave 0 — Hotfix an toàn & đúng tiền (P0, chạy song song MP-2, KHÔNG đụng file Tier 2 đang sửa):**

| RF | Map | Việc | Acceptance tối thiểu |
|---|---|---|---|
| RF-01 | OPS-06 rút gọn | Xóa/khóa `app/api/debug` sau auth ADMIN, bỏ PII/env dump | GET không auth → 404/401; không còn findFirst theo phone hardcode |
| RF-02 | M1-09 rút gọn | `workers` + `workers/[id]` dùng projection DTO theo role (`worker-projection.ts`) | Contract test: SALE/MKT không nhận CCCD/bank; HR theo scope |
| RF-03 | M8-04 rút gọn | Sửa `Math.round(totalHours)`: nhân Decimal hours × BigInt rate qua `money.ts`, **làm tròn sau khi nhân** + ADR interim rounding | Golden test 7.5h × rate ra kết quả định trước; statement cũ không đổi |
| RF-04 | M6-04 rút gọn | `ctv/summary` đọc `CommissionLedger` thật; chưa có ledger thì trả `null`+note (fail-closed), không số giả | Không còn literal `500_000`; response có trường nguồn số liệu |

**Wave 1 — Đốt nợ G0 (P0, điều kiện đóng MP-3):**

| RF | Map | Việc |
|---|---|---|
| RF-05 | = G0-04 | CI: script `typecheck`/`lint`/`test:unit`/`test:integration`/`build`; GitHub Actions; integration đánh `ENV_BLOCKED` đến khi có secret test DB |
| RF-06 | = G0-02 | Nâng `seed.mjs` chuẩn G0-02: permission pool, 2 client/2 project/2 vendor/20 worker/2 kỳ công, upsert business key |
| RF-07 | = G0-05 | `tests/fixtures/operations/*` (đủ tháng, chuyển project giữa kỳ, ca đêm, OT, correction, dispute) dùng chung |
| RF-08 | = G0-01 phần còn | Đưa `grants-hrp-m12.1.1.sql` vào migration; runbook hóa "apply tay + migrate resolve" (DEC-NEW-04); thêm `prisma migrate diff` vào CI bắt drift |
| RF-09 | mới (G0-06) | Repo hygiene: xác nhận xóa `appBCC/*` (**khu vực của sếp — chờ sếp chủ trì**); chuyển `check.js`/`seed_*.js` từ root vào `scripts/dev/` |

**Wave 2 — M1-min & L1 wiring (P0/P1, trước public launch):**

| RF | Map | Việc |
|---|---|---|
| RF-10 | = M1-06 | Wire `withAuthScope` vào 38 route thiếu, chia 3 task theo domain; ưu tiên route trả PII/tiền |
| RF-11 | = M1-02 tối thiểu | Session version + bảng session để revoke; **mở rộng identity-core theo DEC-11, KHÔNG viết lại auth** |
| RF-12 | = M1-05 | Visibility matrix đủ **13 role** (§7.2 đã cập nhật) + fixture expected cho 6 role bổ sung |
| RF-13 | = M1-08 | Bộ test IDOR vendor A↔B cho orders/submissions/statements/dispute |

**Wave 3 — Chất lượng đường tiền & marketplace (P1):**

| RF | Map | Việc |
|---|---|---|
| RF-14 | = M8-04 mở rộng | Kiểm toán toàn bộ đường tiền dùng `money.ts` (rate resolve, statement, reconciliation), bỏ mọi `Number()` trên tiền/giờ |
| RF-15 | = M35 series | Marketplace apply/tracking: RPC `SECURITY DEFINER` + role `hrp_public_rpc` (MP-2 v1.1), dedupe theo phone, HR queue |
| RF-16 | = M8-05 | Statement vocab NEW→…→CONFIRMED→LOCKED→PAID; **schema migrate cho `CandidateSubmission` (thêm CONVERTED/NEEDS_INFO nếu M35 cần)** — plan §4.6 đã đúng, đây là việc migrate schema |
| RF-17 | mới (M6-05) | CommissionLedger engine thật thay placeholder MVP (kế thừa RF-04) |

**Wave 4 — Cứng hóa & quan sát (P2, sau go-live đợt 1):**

| RF | Map | Việc |
|---|---|---|
| RF-18 | = OPS-07 | Outbox drain + dispute auto-confirm chạy nền (Vercel cron / GH Actions), có khóa chống chạy chồng, alert khi backlog |
| RF-19 | = OPS-08 | Structured logging + request id + audit coverage cho mọi mutation đường tiền/PII |
| RF-20 | mới (M35-01b) | `publicSlug` cho project public: hoặc thêm cột + backfill + unique, hoặc chốt map slug→id ở layer marketplace (**§7.9.3 đang giả định cột chưa tồn tại — phải chốt trước khi code M35-01**) |

### 12.3. Guardrails khi rút TASK từ backlog này

1. **1 task = 1 boundary.** Không gộp nhiều RF khác domain vào 1 TASK.md.
2. **Wave 0 KHÔNG đụng file Tier 2 đang mở** (statement.service.ts đang có việc M8) — phối hợp thứ tự với pipeline trước khi mở TASK.
3. **RF trùng task đã có** (RF-05=G0-04, RF-06=G0-02, RF-10=M1-06…) → KHÔNG tạo task mới, gộp acceptance vào task gốc.
4. **`appBCC/*` là khu vực của sếp** — RF-09 chỉ động tới sau khi sếp đồng ý đích danh.
5. Mỗi RF khi lên TASK phải kèm **evidence-before** (lệnh + output thật chứng minh vấn đề còn tồn tại tại thời điểm mở task) — tránh lặp lại lỗi D-01 (finding chạy trên worktree bẩn nhất thời).

---

## 13. REVISION LOG

### V5.3 (2026-08-22) — tiếp thu V5_READINESS_ASSESSMENT.md

Nguồn: `docs/V5_READINESS_ASSESSMENT.md`. Nguyên tắc: chỉ nhận finding ĐÚNG sau khi verify bằng tool thật (Iron Rule 4); finding sai bị TỪ CHỐI kèm bằng chứng.

**Sửa mâu thuẫn nội tại của plan (in-place):**
- §7.2 role visibility matrix: 8 → **13 role** (khớp `SystemRole` enum `schema.prisma:106-120`).
- §7.2 M1-02: ghi rõ "mở rộng identity-core" — không vi phạm DEC-11 (không viết lại auth).
- §7.2 M1-05: "8 role" → "13 role".
- §7.9.5 (M35-04): thống nhất trạng thái **MERGED** (khớp `CandidateSubmission.status` enum), bỏ dùng lẫn CONVERTED.
- §7.9.3: ghi chú `publicSlug` **chưa tồn tại trong schema** — phải chốt trước khi code M35-01 (→ RF-20).
- §7.9.6: đánh dấu legacy apply path sẽ deprecate khi RPC public sống.
- §4.13: bổ sung stop-condition cho thứ tự thực thi MP-3.
- §10 Decision Register: thêm ADR rounding tiền (làm tròn SAU khi nhân) + ghi chú C-10.
- §8.3: thêm bullet test DB tách biệt + DEC-14 hybrid test.
- §6.4: thêm luật cấm dùng enum lệch schema.
- §4.6 (M8-05): xác nhận vocab statement trong plan **đã đúng** — chỉ schema cần migrate.

**Thêm mới:**
- **§12** Technical Debt & Refactoring Backlog: bảng verdict §12.1 (CONFIRMED/ADJUSTED/REJECTED cho A/C/D/T/AM findings) + backlog Wave 0–4 §12.2 (RF-01..RF-20 map task V5) + guardrails §12.3.

**TỪ CHỐI (có bằng chứng):**
- **D-01** (WIP migration `20260822030000_mp2_apply_tracking` gây schema drift): **SAI**. `Glob prisma/migrations/**/*mp2*` = No files found; grep xác nhận cột MP-2 không có trong schema; MP-2 round-1 BLOCKED, không giữ lại gì. Assessment chạy trên worktree bẩn nhất thời. Không sửa plan theo D-01.

**Điều chỉnh (nhận nhưng thu hẹp phạm vi so với assessment):**
- **A-03**: route `workers` ĐÃ có auth (getAuthContext + VIEWER_ROLES); vấn đề thật chỉ là **thiếu projection** → RF-02 nhắm DTO theo role, không phải thêm auth.
- **A-06**: `ctv/summary` đã có `note` disclaimer và đọc `SourceClaim` thật; sửa là bỏ literal `500_000` và fail-closed khi chưa có ledger (RF-04), không phải viết lại toàn bộ.
- **C-03**: plan §4.6 vocab **đã đúng**; chỉ schema stale → xử lý bằng task migrate (RF-16), không đổi plan.

