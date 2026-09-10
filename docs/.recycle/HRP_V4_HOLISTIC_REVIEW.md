# Báo cáo rà soát tổng thể kiến trúc và sản phẩm HRP V4

> Vai trò rà soát: Principal System Architect & Lead Product Manager  
> Ngày rà soát: 15/08/2026  
> Phạm vi: `docs/UNIFIED_PLAN_v4.md`, `docs/data-scope-security.md`, `docs/app-big-picture.html`, `prisma/*`, migration và phần code hiện có liên quan.  
> Chủ đích: ưu tiên code, hướng triển khai và tính năng hữu ích. Không thẩm định tính đúng đắn pháp lý của công thức TNCN/BHXH trong báo cáo này.
> Roadmap mockup/BoD demo: `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md`.

## 0. Kết luận điều hành

**Khuyến nghị: GO có điều kiện.** Hướng modular monolith, operations-first, PostgreSQL làm nguồn sự thật, dữ liệu tài chính bất biến và tách vendor payable/client receivable là phù hợp cho công ty nhỏ và team 5 dev. Tuy nhiên, trạng thái hiện tại **chưa đủ điều kiện viết tiếp core logic tài chính** vì plan, Prisma schema, migration và code runtime đang lệch nhau.

| Trục | Điểm | Nhận định |
|---|---:|---|
| Kiến trúc mục tiêu | 7/10 | Stack hợp lý, ADR nhìn chung đúng; ranh giới domain và bất biến tài chính tốt. |
| Khả năng triển khai hiện tại | 5/10 | Migration không khớp schema; build production đang fail; RLS mẫu chưa chạy được. |
| Mô hình sản phẩm/nghiệp vụ | 7/10 | Chuỗi Order → Worker → Assignment → Timesheet → Statement đúng trọng tâm; state machine còn dead-end. |
| Kế hoạch/phasing | 5/10 | Phạm vi 490 MD quá căng; số effort giữa bảng module và epic không đồng nhất; payroll luật định phải lùi cuối. |
| Mức sẵn sàng production | 3/10 | Auth còn stub, mỗi route tạo PrismaClient riêng, chưa có RLS/partial index trong migration, test mới phủ 2 domain. |

Các cổng bắt buộc trước khi code tiếp:

1. Chốt một `schema.prisma` canonical và tạo lại migration baseline có thể tái lập.
2. Làm cho `npm run build` xanh; hiện build lỗi alias `@/shared/utils/money`.
3. Thay auth stub và PrismaClient rải rác bằng runtime foundation chuẩn.
4. Chốt state transition + invariant liên trạng thái, sau đó mới khóa schema.
5. Chạy được vertical slice mỏng trên DB thật: Order → Assignment → Import → Lock → Statement.
6. Hoãn engine TNCN/BHXH thật đến phase cuối; chỉ giữ contract, schema, mock/manual adapter.

---

## 1. Pillar 1 — Holistic Review

### 1.1. Khoảng cách giữa kế hoạch và repo thực tế

| Mức | Phát hiện có bằng chứng | Tác động | Xử lý đề xuất |
|---|---|---|---|
| **P0** | `schema.prisma` đã có `SystemRole`, `Permission`, `RolePermission`, `UserPermissionGrant`, FK scope mới; migration `20260815013341_init` không có các thành phần này. | DB tạo từ migration khác DB mà Prisma Client mong đợi. CI/dev/prod không tái lập được. | Không sửa migration đã chạy ở môi trường thật. Nếu chưa có DB thật, squash thành baseline mới. Nếu đã có, tạo migration G22 nối tiếp và test cả clean DB + upgrade DB. |
| **P0** | Comment schema nói partial index nằm trong migration `g22_security`, nhưng thư mục migration chỉ có `init`; không có `one_active_assignment`, `one_accepted_source`, RLS hay policy. | Có thể có hai assignment ACTIVE và nhiều claim accepted dù plan coi đây là invariant cứng. | Thêm raw SQL migration, rồi integration test race 20 request song song. |
| **P0** | `npm run build` fail tại `calculateVietnameseTaxes.ts` vì import `@/shared/...`, trong khi alias hiện tại và các route dùng `@/src/...`. | Không deploy được. Test unit xanh tạo cảm giác sai rằng repo build được. | Chuẩn hóa alias một lần: ưu tiên `@/* -> ./src/*`, và tách alias `@app/*` nếu cần; thêm build vào CI bắt buộc. |
| **P0** | `docs/data-scope-security.md` mô tả RLS hoàn chỉnh nhưng migration không bật RLS. Hàm SQL mẫu tham chiếu trực tiếp `assigned_to_id`/`workers.id` bên trong function không nhận row argument. | Thiết kế SQL mẫu không tạo được như viết; lớp backstop thực tế chưa tồn tại. | Viết migration executable + pgTAP/integration test trước khi gọi là “đã có”. |
| **P0** | Các model con mà tài liệu muốn scope qua relation `worker` lại thiếu relation/FK: `AttendanceEvent`, `TimesheetLine`, `WorkerDeduction`, statement line và một số import record. | `scopeVia('worker', ...)` không thể compile/không thể enforce; dữ liệu mồ côi và RLS join không đáng tin. | Bổ sung FK + Prisma relation cho mọi bảng mang `workerId/projectId/assignmentId/vendorId/clientId`. |
| **P0** | Auth hiện là `Bearer userId:role`; role do request tự khai. | Bất kỳ ai cũng có thể giả role nếu endpoint được deploy. | Chặn deploy bằng environment assertion; thay bằng access token ký, refresh rotation, revoke và session version. |
| **P0** | Logic TNCN/BHXH thật và 16 test đã tồn tại, trái yêu cầu mới “engine thật chỉ ở phase cuối”. Repo còn fallback sang config luật hard-code khi DB thiếu config. | Logic ngoài phạm vi có thể vô tình được nối vào pay run; thiếu config lại cho ra số có vẻ hợp lệ. | Cách ly khỏi runtime MVP; thay bằng `StatutoryCalculator` interface + `Deferred/Manual` adapter. Production phải fail-closed, không fallback số mặc định. |
| **P1** | Sáu ticket route đều `new PrismaClient()` ở module riêng. | Tăng pool/connection khi serverless scale-out; trái chính plan singleton. | Một `src/lib/db.ts` duy nhất, global singleton ở dev, pooled URL runtime, direct URL chỉ migration. |
| **P1** | Hầu hết status là `String`, không phải enum/check constraint; assignment không có `version`. | Raw SQL/import có thể ghi trạng thái bất kỳ; transition race không bị chặn. | Enum cho từ vựng ổn định + atomic transition `UPDATE ... WHERE status/version`; lưu transition history. |
| **P1** | `TimesheetPeriod.projectId` nullable nhưng unique `(projectId, month, year, version)`. PostgreSQL cho phép nhiều `NULL` trong unique. | Có thể tạo nhiều kỳ “all projects” trùng nhau. | Không dùng nullable làm scope key; dùng `scopeType + scopeIdKey` non-null hoặc unique index `NULLS NOT DISTINCT`. |
| **P1** | Rate card không có FK site, không có slot/shift/day category/currency/rounding/status/approval, không chặn khoảng hiệu lực chồng nhau. | Một giờ công có thể resolve ra nhiều rate hoặc rate sai; statement không replay được. | MVP chỉ hỗ trợ 3 rate type và vài chiều có cấu trúc; exclusion constraint chống overlap; snapshot rate vào line. |
| **P1** | Statement line chỉ có `hours/rate/amount`; thiếu timesheet version, rateCardId, formula version, adjustment link, quantity unit. | Không truy ngược “số này từ đâu”; dispute dễ thành chỉnh tay. | Bổ sung lineage và snapshot trước Wave 2. |
| **P1** | Pay run mẫu tính toàn bộ worker và phát payslip trong một interactive transaction. | Transaction dài, giữ connection, dễ timeout/deadlock; không hợp serverless/QStash. | Job theo worker/chunk, mỗi chunk idempotent; finalize/lock bằng transaction ngắn sau validation. |
| **P1** | QStash được mô tả gần như exactly-once. Tài liệu chính thức xác nhận at-least-once; dedup window chỉ 10 phút. | Duplicate sau 10 phút vẫn có thể tới; side effect tài chính có thể lặp. | DB idempotency key/unique business key là nguồn sự thật; QStash dedup chỉ tối ưu. |
| **P1** | “Resume XLSX bằng row offset” phải mở lại ZIP stream và bỏ qua từ đầu; nhiều continuation có thể thành O(n²). | File lớn càng retry càng chậm, có thể không bao giờ hoàn tất trong serverless. | MVP giới hạn file/row rõ ràng và yêu cầu tách file; nếu vượt ngưỡng, chuyển parser sang worker dài hạn. QStash vẫn orchestration. |
| **P1** | Build/test không đồng cấp: `prisma validate` xanh, 32 unit test xanh, nhưng production build đỏ và chưa có integration DB. | Chất lượng đo không phản ánh khả năng phát hành. | CI tối thiểu: format → generate → validate → migration clean/upgrade → test → build → E2E slice. |

### 1.2. Serverless, Prisma, PostgreSQL và QStash

Các ADR chính được **giữ**: Next.js modular monolith, PostgreSQL/Prisma, QStash cho job nền, R2 cho file, BigInt VND, record tài chính bất biến. Cần sửa cách triển khai:

- **Pooling:** pooler là đúng. `connection_limit=1` chỉ là điểm khởi đầu, không phải chân lý; benchmark theo concurrency và số query/transaction. Với Prisma 5.22 hiện tại, chưa cần nâng major chỉ để dùng driver adapter.
- **Prisma singleton:** mọi route dùng cùng factory. Không khởi tạo client trong từng route file.
- **Transaction:** Prisma hiện hỗ trợ `isolationLevel`; câu “Prisma không hỗ trợ option isolationLevel” ở §14.2 là sai. Với transfer/quota/commission, dùng `Serializable` + retry `P2034` hoặc row lock rõ ràng.
- **Lock:** thay `pg_advisory_xact_lock(hashtext(uuid))` bằng `SELECT ... FOR UPDATE` trên Worker/aggregate row khi có row tự nhiên. `hashtext` là khóa 32-bit, có collision và khó quan sát.
- **Timezone:** không `SET timezone` toàn session trên transaction pool. Dùng `SET LOCAL` trong transaction hoặc biểu thức timezone tường minh; `work_date` là DATE canonical.
- **QStash:** verify signature mọi callback; handler phải idempotent; phân biệt retryable với non-retryable; DLQ có owner và màn vận hành.
- **Check-in burst:** chưa nên mặc định write-behind. Spike với 5.000 request burst: nếu pooled direct insert đạt SLO thì ghi raw event đồng bộ đơn giản hơn. Nếu dùng QStash, trả receiptId và lưu trạng thái ngoài bảng event cho đến khi append thành công.
- **Upload:** presigned R2 và streaming là đúng. Chốt giới hạn MVP, ví dụ 10 MB/20.000 rows/file, thay vì hứa resume vô hạn cho XLSX.

### 1.3. Năm state machine không thực sự độc lập

Chúng là năm trục trạng thái trực giao nhưng có invariant chéo. Nếu chỉ viết năm `TRANSITIONS` riêng, hệ thống vẫn vào trạng thái vô nghĩa.

| State machine | Dead-end/thiếu hiện tại | Transition/invariant cần chốt |
|---|---|---|
| Profile | `REJECTED` không có đường sửa và nộp lại. | `REJECTED -> INCOMPLETE -> PENDING_VERIFY`; lưu lý do/version, không overwrite lịch sử review. |
| Submission | `QUALIFIED/MERGED` chưa bắt buộc `mergedWorkerId`; rút hồ sơ giữa screening chưa rõ. | Cho `NEW/SCREENING -> WITHDRAWN`; `QUALIFIED/MERGED` phải có worker link; không auto-merge chỉ vì 2/3 khóa yếu. |
| Employment | `SUSPENDED` không có resume; `TERMINATED` không hỗ trợ tái tuyển. | `SUSPENDED -> ACTIVE|TERMINATED`; tái tuyển tạo `EmploymentEpisode` mới, không đổi lịch sử terminated cũ. |
| Assignment | `PAUSED` không có resume/end; status và `validTo` có thể lệch. | `PAUSED -> ACTIVE|ENDED|TRANSFERRED`; ACTIVE/PAUSED chiếm chỗ; terminal bắt buộc `validTo`; transition atomic. |
| Risk | `BLOCKED` không có quy trình unblock. | `REVIEW -> NORMAL|BLOCKED`; `BLOCKED -> REVIEW -> NORMAL` cần permission + evidence + audit. |

Invariant chéo bắt buộc:

1. Chỉ activate assignment khi profile `VERIFIED`, risk không `BLOCKED`, employment `ACTIVE`.
2. Chỉ terminate employment sau khi không còn assignment chiếm chỗ, hoặc transaction đóng chúng cùng lúc.
3. Assignment dùng khoảng nửa mở `[validFrom, validTo)` và exclusion constraint để không overlap cho trạng thái chiếm chỗ.
4. Availability là projection suy ra, không lưu thành nguồn sự thật.
5. `Project.filled` không là canonical. Canonical là số assignment chiếm slot; nếu giữ `filled`, coi là cache có job reconciliation.
6. Assignment phải trỏ tới `StaffingOrderSlot`, không chỉ `StaffingOrder`, nếu quota/rate/ca nằm ở slot.

### 1.4. Billing và reconciliation

Quyết định tách vendor payable và client billing là **đúng và phải giữ**. Cần nâng mô hình từ “bảng tổng” thành sub-ledger có lineage:

- `StatementLine` phải snapshot `timesheetPeriodId/version`, `rateCardId/version`, `quantity`, `unit`, `dayCategory`, `formulaVersion`, `inputSnapshot`, `amountVnd`.
- Dispute không sửa version đang gửi. Tạo revision mới với `supersedesId`; version cũ thành `SUPERSEDED`.
- Workflow đề xuất: `DRAFT -> ISSUED -> CONFIRMED|AUTO_CONFIRMED|DISPUTED`; `DISPUTED -> REVISED|RESOLVED`; sau đó `LOCKED -> PAYMENT_PENDING -> PARTIALLY_PAID|PAID`.
- `PAID` không chỉ là status. Cần `Payment` + `PaymentAllocation` để hỗ trợ trả một phần, gộp nhiều statement và hoàn/đảo.
- FORCE LOCK cần permission riêng, maker-checker, reason + attachment. Không mặc định HR_MANAGER và ACCOUNTANT đều có thể tự tạo rồi tự force-lock.
- Vendor portal chỉ mở sau hai kỳ admin reconciliation chạy ổn. Đây là thứ tự product hợp lý nhất cho team nhỏ.

---

## 2. Pillar 2 — RBAC và RLS

### 2.1. Đánh giá mô hình hiện tại

| Thành phần | Đánh giá |
|---|---|
| Permission Pool role → permission | Chuẩn và hữu ích cho baseline quyền. |
| User GRANT/REVOKE | Ý tưởng đúng, schema hiện tại chưa tốt: có thể tồn tại đồng thời một GRANT và một REVOKE; không có FK grantor; audit/effective period chưa chặt. |
| Prisma Client Extension | Phù hợp làm L1 để developer thấy filter và test dễ. Không được coi là security boundary duy nhất. |
| PostgreSQL RLS | Phù hợp làm L2 cho dữ liệu nhạy cảm. Với 5k–20k worker hoàn toàn khả thi nếu policy/index đơn giản. |
| Visibility Matrix | Hợp lý cho Worker, nhưng chưa đầy đủ cho statement, payment, config, audit và field-level PII. |
| Custom group | **Chưa có.** `Permission.group` chỉ là nhãn phân loại permission, không phải nhóm người dùng. |

### 2.2. Lỗi thiết kế cần sửa trước khi triển khai

1. `query` trong Prisma extension callback là function của chính operation; mẫu `query.findFirst(...)` trong `findUnique` không hợp lệ. Với Prisma 5.22, giữ unique field ở top-level và thêm scope qua `AND`, hoặc dùng repository `findFirst` tường minh.
2. `scopeVia()` hiện trả `{}`; mọi model con được liệt kê sau đó thực chất chưa được bảo vệ.
3. L1 route mẫu query ngoài `withRlsSession`, trong khi L2 RLS nếu bật sẽ thấy GUC rỗng và deny. Hai tài liệu đang mô tả hai luồng DB không thống nhất.
4. Không thể cấp `BYPASSRLS` động theo `ctx.role` khi toàn app dùng cùng một DB runtime user. Tuyệt đối không cấp `BYPASSRLS` cho runtime role.
5. DB owner thường bypass RLS. Runtime role phải khác migration/owner role và bảng nhạy cảm phải `FORCE ROW LEVEL SECURITY`.
6. RLS function `SECURITY DEFINER` phải nhận row key rõ ràng, pin `search_path`, và chỉ có quyền đọc bảng scope tối thiểu.
7. Builder có DIRECTOR đọc toàn bộ nhưng SQL policy mẫu không có DIRECTOR: L1 và L2 cho kết quả khác nhau.
8. RLS chỉ lọc row, không che cột. DIRECTOR/MKT/PM cần projection/field policy để không mặc định trả CCCD, bank, selfie.

### 2.3. Kiến trúc production-ready đề xuất

Mọi repository có context phải đi qua đúng một entry point:

```ts
export async function withDbContext<T>(
  ctx: AuthContext,
  work: (db: ScopedTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setRlsContext(tx, ctx); // set_config(..., true) = transaction-local
    const db = extendTransactionWithScopes(tx, ctx);
    return work(db);
  }, { timeout: 5_000 });
}
```

Quy tắc vận hành:

- Transaction chỉ bao DB work; cấm HTTP/SMS/R2/QStash bên trong. Side effect dùng transactional outbox.
- Base `prisma` không export ra domain/route; ESLint boundary cấm import ngoài `src/db`.
- L1 scope và L2 policy dùng cùng một bộ fixture contract test: role × resource × action × expected rows.
- Permission cache có `permissionVersion` trên User/Group. Đổi grant tăng version trong DB; cache key chứa version, không dựa TTL 60 giây để revoke có hiệu lực.
- Deny precedence: `ADMIN => ALL`; user `DENY` đang hiệu lực thắng mọi baseline; user `ALLOW`; group `ALLOW`; role baseline. Custom group MVP chỉ grant, không deny, để giảm xung đột.

Index tối thiểu cho scope nóng:

```sql
CREATE INDEX ix_assignment_scope_pm
  ON project_assignments (worker_id, status, project_id);
CREATE INDEX ix_project_scope_pm
  ON outsourcing_projects (pm_user_id, id) WHERE status <> 'CANCELLED';
CREATE INDEX ix_claim_scope_vendor
  ON source_claims (vendor_id, accepted, worker_id);
CREATE INDEX ix_claim_scope_ctv
  ON source_claims (ctv_id, accepted, worker_id);
CREATE INDEX ix_worker_owner ON workers (owner_id, id);
CREATE INDEX ix_worker_assignee ON workers (assigned_to_id, id);
```

Không materialize toàn bộ visibility ngay từ đầu. Chỉ tạo bảng `ResourceGrant`/projection nếu `EXPLAIN (ANALYZE, BUFFERS)` trên dataset 20k chứng minh relation filter vượt SLO.

---

## 3. Pillar 3 — Execution Strategy và micro-phasing

### 3.1. Lộ trình đề xuất cho team 5 dev

Kế hoạch 12 tuần hiện tại không có buffer cho schema security, dữ liệu thật và migration. Mốc tin cậy hơn cho MVP nội bộ là **13–15 tuần**, vẫn giữ operations-first.

| Micro-phase | Thời lượng | Deliverable bắt buộc | Không làm trong phase |
|---|---:|---|---|
| **G0 — Baseline Gate** | 1 tuần | Fix build; schema canonical; migration clean/upgrade; DB roles; ADR delta; 20 scenario thật. | UI portal, payroll law engine. |
| **S1 — Runtime/Auth/Security** | 2 tuần | Prisma singleton, JWT/session, Permission Pool v2, custom group, `withDbContext`, RLS Worker/Project, audit/outbox. | Zalo, device binding nâng cao. |
| **S2 — CRM/Staffing Backbone** | 2 tuần | Client, Project, StaffingOrder/Slot, Worker, Submission/Claim, transition engine. | Dedup AI, vendor portal. |
| **S3 — Assignment/Transfer** | 2 tuần | Activate/pause/resume/transfer, exclusion/partial index, quota derived, bulk command từng worker transaction. | PM PWA. |
| **S4 — Attendance Import** | 2 tuần | R2 presign, batch, streaming giới hạn MVP, preview/mapping/unmatched, idempotency, job status/DLQ. | Máy chấm công, GPS. |
| **S5 — Timesheet Lock** | 2 tuần | Raw → line → period, approve/lock, correction/adjustment, overnight split data model. | Pay run. |
| **S6 — Rate & Statements** | 2 tuần | Rate version, vendor/client statement lineage, revision/dispute admin workflow, export. | Vendor self-service nếu nội bộ chưa ổn. |
| **UAT/Cutover** | 2 tuần | Hai kỳ dữ liệu shadow, reconciliation Excel, security matrix, load burst, runbook/rollback. | Thêm feature mới. |
| **P1 — External Portals** | 4–6 tuần | Worker PWA, vendor submission/confirm, CTV dashboard, GPS evidence theo metric. | Native app/eKYC. |
| **P2 — Commission** | 2–3 tuần | Group policy, individual override, ledger/reversal, settlement report. | Công thức percent phức tạp nếu chưa có nhu cầu. |
| **P3 — Gross Payroll Shell** | 2–3 tuần | PayRun/result/earning/deduction, manual statutory import, dry-run, snapshot. | Engine TNCN/BHXH thật. |
| **FINAL — Statutory Engine** | 3–5 tuần | Config version, golden cases, parallel run, engine TNCN/BHXH, lock guard, payslip. | Không ghép với portal release. |

Mỗi sprint chỉ được coi là xong khi migration chạy trên DB sạch và DB nâng cấp, integration test security xanh, audit có actor/reason, và vertical slice vẫn chạy.

### 3.2. Prisma placeholder cho TNCN/BHXH ngay bây giờ

Mục tiêu của schema này là giữ hợp đồng tích hợp ổn định nhưng **không chứa công thức luật định**. `MOCK` chỉ dùng dev/test; production không được LOCK nếu statutory status là `DEFERRED/MOCKED`. Nếu cần vận hành payroll trước phase cuối, chỉ cho phép `MANUAL` đã được kế toán verify và có attachment/source snapshot.

```prisma
enum PayRunStatus {
  DRAFT
  CALCULATING
  CALCULATED
  REVIEWED
  LOCKED
  PAID
  CANCELLED
}

enum StatutoryCalcMode {
  MOCK
  MANUAL
  ENGINE
}

enum StatutoryCalcStatus {
  NOT_STARTED
  DEFERRED
  MOCKED
  MANUAL_PENDING
  VERIFIED
  CALCULATED
  FAILED
}

enum StatutoryComponent {
  PIT
  SOCIAL_INSURANCE
  HEALTH_INSURANCE
  UNEMPLOYMENT_INSURANCE
  OTHER
}

model PayRun {
  id              String       @id @default(uuid())
  legalEntityCode String       @map("legal_entity_code")
  payrollGroupKey String       @default("DEFAULT") @map("payroll_group_key")
  periodStart     DateTime     @map("period_start") @db.Date
  periodEnd       DateTime     @map("period_end") @db.Date
  version         Int          @default(1)
  status          PayRunStatus @default(DRAFT)
  isDryRun        Boolean      @default(false) @map("is_dry_run")
  inputCutoffAt   DateTime     @map("input_cutoff_at")
  createdById     String       @map("created_by_id")
  lockedById      String?      @map("locked_by_id")
  lockedAt        DateTime?    @map("locked_at")
  createdAt       DateTime     @default(now()) @map("created_at")

  createdBy User  @relation("PayRunCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  lockedBy  User? @relation("PayRunLockedBy", fields: [lockedById], references: [id], onDelete: Restrict)
  results WorkerPayResult[]

  @@unique([legalEntityCode, payrollGroupKey, periodStart, periodEnd, version])
  @@index([status, periodStart])
  @@map("pay_runs")
}

model WorkerPayResult {
  id                    String              @id @default(uuid())
  payRunId              String              @map("pay_run_id")
  workerId              String              @map("worker_id")
  grossVnd              BigInt              @default(0) @map("gross_vnd")
  nonStatutoryDeductVnd BigInt              @default(0) @map("non_statutory_deduct_vnd")
  statutoryDeductVnd    BigInt              @default(0) @map("statutory_deduct_vnd")
  netPayableVnd         BigInt              @default(0) @map("net_payable_vnd")
  sourceSnapshot        Json                @map("source_snapshot")
  statutoryStatus       StatutoryCalcStatus @default(NOT_STARTED) @map("statutory_status")
  createdAt             DateTime            @default(now()) @map("created_at")

  payRun       PayRun                @relation(fields: [payRunId], references: [id], onDelete: Restrict)
  worker       Worker                @relation(fields: [workerId], references: [id], onDelete: Restrict)
  statutory    StatutoryCalculation?
  statutoryLines StatutoryDeductionLine[]

  @@unique([payRunId, workerId])
  @@index([workerId, payRunId])
  @@map("worker_pay_results")
}

model StatutoryCalculation {
  id              String              @id @default(uuid())
  payResultId     String              @unique @map("pay_result_id")
  mode            StatutoryCalcMode
  status          StatutoryCalcStatus
  contractVersion String              @map("contract_version") // schema contract, không phải luật
  engineVersion   String?             @map("engine_version")   // null đến final phase
  policyVersionId String?             @map("policy_version_id")
  inputSnapshot   Json                @map("input_snapshot")
  outputSnapshot  Json?               @map("output_snapshot")
  sourceFileKey   String?             @map("source_file_key")  // manual import provenance
  reviewedById    String?             @map("reviewed_by_id")
  reviewedAt      DateTime?           @map("reviewed_at")
  errorCode       String?             @map("error_code")
  createdAt       DateTime            @default(now()) @map("created_at")

  payResult WorkerPayResult @relation(fields: [payResultId], references: [id], onDelete: Restrict)
  policy    StatutoryPolicyVersion? @relation(fields: [policyVersionId], references: [id])
  reviewedBy User? @relation("StatutoryCalculationReviewer", fields: [reviewedById], references: [id], onDelete: Restrict)

  @@index([status, mode])
  @@map("statutory_calculations")
}

model StatutoryDeductionLine {
  id          String             @id @default(uuid())
  payResultId String             @map("pay_result_id")
  component   StatutoryComponent
  amountVnd   BigInt             @map("amount_vnd")
  provenance  Json

  payResult WorkerPayResult @relation(fields: [payResultId], references: [id], onDelete: Restrict)

  @@index([payResultId, component])
  @@map("statutory_deduction_lines")
}

model StatutoryPolicyVersion {
  id            String   @id @default(uuid())
  code          String
  version       Int
  effectiveFrom DateTime @map("effective_from") @db.Date
  effectiveTo   DateTime? @map("effective_to") @db.Date
  payloadSchema String   @map("payload_schema")
  payload       Json     // để trống/placeholder đến final phase; không seed rate production
  isPublished   Boolean  @default(false) @map("is_published")
  createdAt     DateTime @default(now()) @map("created_at")

  calculations StatutoryCalculation[]

  @@unique([code, version])
  @@index([code, effectiveFrom, effectiveTo])
  @@map("statutory_policy_versions")
}
```

Delta back-relation vào model hiện hữu:

```prisma
model User {
  payRunsCreated               PayRun[]                 @relation("PayRunCreatedBy")
  payRunsLocked                PayRun[]                 @relation("PayRunLockedBy")
  statutoryCalculationsReviewed StatutoryCalculation[]  @relation("StatutoryCalculationReviewer")
}

model Worker {
  payResults WorkerPayResult[]
}
```

Interface domain nên chốt ngay:

```ts
export interface StatutoryCalculator {
  calculate(input: StatutoryInput): Promise<StatutoryResult>;
}

export class DeferredStatutoryCalculator implements StatutoryCalculator {
  async calculate(input: StatutoryInput): Promise<StatutoryResult> {
    return { status: 'DEFERRED', lines: [], totalDeductionVnd: 0n, input };
  }
}

export function assertPayRunCanLock(result: WorkerPayResult) {
  if (!['VERIFIED', 'CALCULATED'].includes(result.statutoryStatus)) {
    throw new Error('STATUTORY_RESULT_NOT_VERIFIED');
  }
}
```

Điều chỉnh code hiện có:

- Không export `calculateVietnameseTaxes()` từ barrel runtime trước final phase.
- Bỏ fallback `DEFAULT_VN_TAX_CONFIG_2024` trong production. Thiếu config phải `FAILED/MISSING_CONFIG`.
- Giá trị money/config JSON phải serialize bằng string; không `BigInt(valueJson as number)`.
- Không dùng `number` cho rate rồi chia `/ 100`; dùng decimal string/rational integer end-to-end.

---

## 4. Pillar 4 — Commission nhóm và individual override

### 4.1. Quy tắc sản phẩm

MVP commission chỉ nên hỗ trợ `PER_HEAD_MILESTONE`. Không triển khai `PER_HOUR` hay `% salary` cho đến khi có ít nhất hai policy thật yêu cầu.

Thứ tự resolve duy nhất:

1. Override cho cặp **worker + referrer** đang hiệu lực.
2. Override cho **referrer** đang hiệu lực.
3. Policy published của **CommissionGroup** mà referrer thuộc tại ngày milestone.
4. Policy của group `DEFAULT` trong program.

Mọi ledger line phải snapshot `policyId`, `overrideId`, accepted `sourceClaimId`, assignment, milestone evidence và input. Thay policy sau này không tính lại ledger đã approved.

### 4.2. Custom security group và dynamic permission

`Permission.group` hiện tại chỉ nên đổi tên logic thành `category`. Thêm nhóm người dùng thật:

```prisma
enum PermissionEffect {
  ALLOW
  DENY
}

model AccessGroup {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  members     AccessGroupMember[]
  permissions AccessGroupPermission[]

  @@map("access_groups")
}

model AccessGroupMember {
  id        String    @id @default(uuid())
  groupId   String    @map("group_id")
  userId    String    @map("user_id")
  validFrom DateTime  @default(now()) @map("valid_from")
  validTo   DateTime? @map("valid_to")
  addedById String    @map("added_by_id")
  reason    String

  group AccessGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User        @relation("AccessGroupMembers", fields: [userId], references: [id], onDelete: Cascade)
  addedBy User      @relation("AccessGroupMemberAddedBy", fields: [addedById], references: [id], onDelete: Restrict)

  @@index([userId, validFrom, validTo])
  @@index([groupId, validFrom, validTo])
  @@map("access_group_members")
}

model AccessGroupPermission {
  groupId       String   @map("group_id")
  permissionCode String  @map("permission_code")
  grantedById   String   @map("granted_by_id")
  reason        String
  validFrom     DateTime @default(now()) @map("valid_from")
  validTo       DateTime? @map("valid_to")

  group      AccessGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  permission Permission  @relation(fields: [permissionCode], references: [code], onDelete: Cascade)
  grantedBy  User        @relation("AccessGroupPermissionGrantedBy", fields: [grantedById], references: [id], onDelete: Restrict)

  @@id([groupId, permissionCode])
  @@index([permissionCode])
  @@map("access_group_permissions")
}

model UserPermissionOverride {
  userId         String           @map("user_id")
  permissionCode String           @map("permission_code")
  effect         PermissionEffect
  reason         String
  grantedById    String           @map("granted_by_id")
  validFrom      DateTime         @default(now()) @map("valid_from")
  validTo        DateTime?        @map("valid_to")

  user       User       @relation("UserPermissionOverrides", fields: [userId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionCode], references: [code], onDelete: Cascade)
  grantedBy  User       @relation("UserPermissionOverrideGrantedBy", fields: [grantedById], references: [id], onDelete: Restrict)

  @@id([userId, permissionCode])
  @@index([permissionCode, effect])
  @@map("user_permission_overrides")
}

model User {
  accessGroupMemberships       AccessGroupMember[]       @relation("AccessGroupMembers")
  accessGroupMembershipsAdded  AccessGroupMember[]       @relation("AccessGroupMemberAddedBy")
  accessGroupPermissionsGranted AccessGroupPermission[]  @relation("AccessGroupPermissionGrantedBy")
  permissionOverrides          UserPermissionOverride[]  @relation("UserPermissionOverrides")
  permissionOverridesGranted   UserPermissionOverride[]  @relation("UserPermissionOverrideGrantedBy")
}

model Permission {
  accessGroupPermissions AccessGroupPermission[]
  userOverrides          UserPermissionOverride[]
}
```

`UserPermissionOverride` thay thế `UserPermissionGrant` hiện tại; migrate dữ liệu một lần, không để hai resolver cùng tồn tại.

Seed permission:

```ts
await tx.permission.upsert({
  where: { code: 'CAN_OVERRIDE_INDIVIDUAL_COMMISSION' },
  create: {
    code: 'CAN_OVERRIDE_INDIVIDUAL_COMMISSION',
    group: 'COMMISSION',
    description: 'Tạo/sửa override hoa hồng cho referrer hoặc worker cụ thể',
  },
  update: {},
});
```

Cấp cho user bất kỳ bằng `UserPermissionOverride(ALLOW)`. Cấp cho custom group bất kỳ bằng `AccessGroupPermission`; thêm user vào group qua `AccessGroupMember`. Resolver vẫn giữ `ADMIN => ALL`; user `DENY` thắng role/group ALLOW.

### 4.3. Prisma schema commission đề xuất

```prisma
enum CommissionPolicyStatus {
  DRAFT
  PUBLISHED
  RETIRED
}

enum CommissionCalcType {
  PER_HEAD_MILESTONE
  PER_HOUR
  PERCENT_BASE
}

enum CommissionOverrideTarget {
  REFERRER
  WORKER_REFERRER
}

enum CommissionLedgerDirection {
  CREDIT
  REVERSAL
}

enum CommissionLedgerStatus {
  PENDING
  APPROVED
  SETTLED
  VOID
}

model CommissionProgram {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  groups      CommissionGroup[]
  policies    CommissionPolicy[]
  overrides   CommissionOverride[]

  @@map("commission_programs")
}

model CommissionGroup {
  id          String   @id @default(uuid())
  programId   String   @map("program_id")
  code        String
  name        String
  isDefault   Boolean  @default(false) @map("is_default")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  program  CommissionProgram       @relation(fields: [programId], references: [id], onDelete: Restrict)
  members  CommissionGroupMember[]
  policies CommissionPolicy[]

  @@unique([programId, code])
  @@index([programId, isDefault, isActive])
  @@map("commission_groups")
}

model CommissionGroupMember {
  id         String    @id @default(uuid())
  programId  String    @map("program_id") // denormalize để enforce 1 group/program/referrer tại một thời điểm
  groupId    String    @map("group_id")
  referrerId String    @map("referrer_id")
  validFrom  DateTime  @map("valid_from") @db.Date
  validTo    DateTime? @map("valid_to") @db.Date
  createdAt  DateTime  @default(now()) @map("created_at")

  group    CommissionGroup @relation(fields: [groupId], references: [id], onDelete: Restrict)
  referrer User            @relation("CommissionGroupMembers", fields: [referrerId], references: [id], onDelete: Restrict)

  @@index([programId, referrerId, validFrom, validTo])
  @@index([groupId, validFrom, validTo])
  @@map("commission_group_members")
}

model CommissionPolicy {
  id             String                 @id @default(uuid())
  programId      String                 @map("program_id")
  groupId        String                 @map("group_id")
  version        Int
  status         CommissionPolicyStatus @default(DRAFT)
  calcType       CommissionCalcType     @default(PER_HEAD_MILESTONE) @map("calc_type")
  monthlyCapVnd  BigInt?                @map("monthly_cap_vnd")
  effectiveFrom  DateTime               @map("effective_from") @db.Date
  effectiveTo    DateTime?              @map("effective_to") @db.Date
  createdById    String                 @map("created_by_id")
  publishedAt    DateTime?              @map("published_at")
  createdAt      DateTime               @default(now()) @map("created_at")

  program CommissionProgram @relation(fields: [programId], references: [id], onDelete: Restrict)
  group   CommissionGroup   @relation(fields: [groupId], references: [id], onDelete: Restrict)
  createdBy User            @relation("CommissionPoliciesCreated", fields: [createdById], references: [id], onDelete: Restrict)
  rules   CommissionPolicyRule[]
  ledger  CommissionLedgerEntry[]

  @@unique([groupId, version])
  @@index([programId, groupId, status, effectiveFrom, effectiveTo])
  @@map("commission_policies")
}

model CommissionPolicyRule {
  id              String  @id @default(uuid())
  policyId        String  @map("policy_id")
  milestoneCode   String  @map("milestone_code") // STARTED, RETAINED_30_DAYS...
  amountVnd       BigInt  @map("amount_vnd")
  qualifyingDays  Int?    @map("qualifying_days")
  sequence        Int     @default(100)
  evidenceRule    Json?   @map("evidence_rule")

  policy CommissionPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@unique([policyId, milestoneCode])
  @@map("commission_policy_rules")
}

model CommissionOverride {
  id             String                   @id @default(uuid())
  programId      String                   @map("program_id")
  targetType     CommissionOverrideTarget @map("target_type")
  referrerId     String                   @map("referrer_id")
  workerId       String?                  @map("worker_id")
  monthlyCapVnd  BigInt?                  @map("monthly_cap_vnd")
  validFrom      DateTime                 @map("valid_from") @db.Date
  validTo        DateTime?                @map("valid_to") @db.Date
  reason         String
  approvedById   String                   @map("approved_by_id")
  createdById    String                   @map("created_by_id")
  createdAt      DateTime                 @default(now()) @map("created_at")

  program  CommissionProgram @relation(fields: [programId], references: [id], onDelete: Restrict)
  referrer User              @relation("CommissionOverrides", fields: [referrerId], references: [id], onDelete: Restrict)
  worker   Worker?           @relation(fields: [workerId], references: [id], onDelete: Restrict)
  approvedBy User            @relation("CommissionOverridesApproved", fields: [approvedById], references: [id], onDelete: Restrict)
  createdBy  User            @relation("CommissionOverridesCreated", fields: [createdById], references: [id], onDelete: Restrict)
  rules    CommissionOverrideRule[]
  ledger   CommissionLedgerEntry[]

  @@index([programId, referrerId, workerId, validFrom, validTo])
  @@map("commission_overrides")
}

model CommissionOverrideRule {
  overrideId    String  @map("override_id")
  milestoneCode String  @map("milestone_code")
  amountVnd     BigInt? @map("amount_vnd") // null = giữ amount từ group policy
  isEnabled     Boolean @default(true) @map("is_enabled")

  override CommissionOverride @relation(fields: [overrideId], references: [id], onDelete: Cascade)

  @@id([overrideId, milestoneCode])
  @@map("commission_override_rules")
}

model CommissionLedgerEntry {
  id                String                    @id @default(uuid())
  idempotencyKey    String                    @unique @map("idempotency_key")
  payeeReferrerId   String                    @map("payee_referrer_id")
  workerId          String                    @map("worker_id")
  assignmentId      String                    @map("assignment_id")
  sourceClaimId     String                    @map("source_claim_id")
  policyId          String                    @map("policy_id")
  overrideId        String?                   @map("override_id")
  milestoneCode     String                    @map("milestone_code")
  amountVnd         BigInt                    @map("amount_vnd")
  direction         CommissionLedgerDirection
  status            CommissionLedgerStatus   @default(PENDING)
  reversalOfId      String?                   @unique @map("reversal_of_id")
  inputSnapshot     Json                      @map("input_snapshot")
  createdAt         DateTime                  @default(now()) @map("created_at")

  policy     CommissionPolicy    @relation(fields: [policyId], references: [id], onDelete: Restrict)
  override   CommissionOverride? @relation(fields: [overrideId], references: [id], onDelete: Restrict)
  payee      User                @relation("CommissionLedgerPayee", fields: [payeeReferrerId], references: [id], onDelete: Restrict)
  worker     Worker              @relation(fields: [workerId], references: [id], onDelete: Restrict)
  assignment ProjectAssignment   @relation(fields: [assignmentId], references: [id], onDelete: Restrict)
  sourceClaim SourceClaim        @relation(fields: [sourceClaimId], references: [id], onDelete: Restrict)
  reversalOf CommissionLedgerEntry? @relation("CommissionReversal", fields: [reversalOfId], references: [id], onDelete: Restrict)
  reversedBy CommissionLedgerEntry? @relation("CommissionReversal")

  @@index([payeeReferrerId, status, createdAt])
  @@index([workerId, assignmentId, milestoneCode])
  @@map("commission_ledger_entries")
}

model User {
  commissionGroupMembers       CommissionGroupMember[]  @relation("CommissionGroupMembers")
  commissionOverrides         CommissionOverride[]     @relation("CommissionOverrides")
  commissionPoliciesCreated   CommissionPolicy[]       @relation("CommissionPoliciesCreated")
  commissionOverridesApproved CommissionOverride[]     @relation("CommissionOverridesApproved")
  commissionOverridesCreated  CommissionOverride[]     @relation("CommissionOverridesCreated")
  commissionLedgerAsPayee     CommissionLedgerEntry[]  @relation("CommissionLedgerPayee")
}

model Worker {
  commissionOverrides CommissionOverride[]
  commissionLedger    CommissionLedgerEntry[]
}

model ProjectAssignment {
  commissionLedger CommissionLedgerEntry[]
}

model SourceClaim {
  commissionLedger CommissionLedgerEntry[]
}
```

Raw SQL migration phải bổ sung:

- `CHECK` REFERRER có `worker_id IS NULL`; WORKER_REFERRER có `worker_id IS NOT NULL`.
- `CHECK amount_vnd > 0`; REVERSAL bắt buộc có `reversal_of_id`, CREDIT bắt buộc không có.
- Exclusion constraint chống overlap membership theo `(program_id, referrer_id, daterange)`.
- Exclusion constraint chống hai policy `PUBLISHED` overlap cho cùng group.
- Partial unique chỉ một default group active/program.
- Trigger/constraint cấm update/delete ledger đã APPROVED/SETTLED; điều chỉnh bằng REVERSAL.

Service tạo override:

```ts
await requirePermission(ctx, 'CAN_OVERRIDE_INDIVIDUAL_COMMISSION');

return withDbContext(ctx, async (db) => {
  return db.commissionOverride.create({
    data: {
      programId,
      targetType,
      referrerId,
      workerId: targetType === 'WORKER_REFERRER' ? workerId : null,
      reason,
      createdById: ctx.userId,
      approvedById,
      validFrom,
      rules: { create: ruleOverrides },
    },
  });
});
```

Không cho route nhận `createdById`, permission hoặc group từ request body. Chúng luôn lấy từ session/resolver.

---

## 5. Quyết định cho các mục `[CẦN CHỐT]`

| Mục | Quyết định khuyến nghị |
|---|---|
| Protocol máy chấm công | Đóng MVP; chỉ mở adapter khi ít nhất 2 site dùng cùng protocol. |
| Hoa hồng CTV | `PER_HEAD_MILESTONE`, policy mặc định theo CommissionGroup; worker/referrer override có permission riêng; mức tiền nhập config. |
| Rate B2B | Thu file thật trong G0; tách vendor pay/client bill; rate phải effective-dated và không overlap. |
| TNCN/BHXH/phụ cấp | Chỉ dựng placeholder và provenance hiện tại; engine/công thức thật ở final phase. |
| eKYC | Hoãn đến khi manual verify >500 hồ sơ mới/tháng hoặc có SLO không đạt. |
| Quy mô | Thiết kế dataset 5.000 active/20.000 total; test riêng burst 5.000 check-in, không chỉ test 20.000 record tĩnh. |
| Vendor | Với 5–10 vendor, admin reconciliation trước; portal sau 2 kỳ nội bộ ổn định. |
| Tạm ứng | Giữ 2 bước HR xác nhận → Accountant approve/pay; hạn mức là policy versioned. |
| File chấm công | Bắt buộc 3 file thật trước S4; thêm file lỗi/duplicate/ca đêm, không chỉ happy path. |
| Geofence | Default 200m nhưng config theo site; accuracy gate và exception queue bắt buộc. |
| Payslip | Canonical trong app; notification chỉ deep link; PDF on-demand. |
| HR_STAFF scope | MVP theo `assignedToId`; team/branch chỉ thêm khi có OrgUnit + membership effective-dated. Không viết “team/branch” bằng field string. |
| Zalo | Giữ feature flag, không block MVP. |
| SMS | Adapter + POC 2 provider; chọn bằng delivery callback/SLA trước giá. |
| Một ACTIVE assignment | Giữ quyết định founder, nhưng enforce cả partial unique và temporal non-overlap cho trạng thái chiếm chỗ. |
| Source attribution | Lưu toàn bộ claim; accepted attribution phải effective-dated và gắn assignment/program, không là boolean toàn đời Worker. |
| Đơn vị khóa payroll | Legal entity + payroll group + period, `payrollGroupKey` non-null. |
| Vendor settlement vs client billing | Bắt buộc tách như ADR hiện tại. |
| R2 | Giữ ADR; storage interface và lifecycle policy độc lập provider. |
| Referral Guard | Giữ 7 ngày configurable; override có permission/reason/evidence; config không đặt trong `payroll_config`. |
| Affiliate attribution | 30 ngày, first-click; lưu server-side attribution token khi có thể. localStorage/manual code là fallback, không là nguồn duy nhất. |
| DIRECTOR/MKT | **ĐÃ CHỐT Q#22:** DIRECTOR có global row-read trên dữ liệu vận hành nhưng cột nhạy cảm qua permission/projection; không có write mặc định. MKT chỉ CRM owned/assigned + project public, không đọc Worker; chỉ được xem funnel aggregate ẩn danh. |
| Load test | Chốt 20.000 dataset + các scenario concurrency: 5.000 check-in, 100 transfer, 20 statement generation song song. |

---

## 6. Top hành động trước khi viết core logic

1. **Lập Schema Review Gate 2 ngày:** chủ domain ký state/invariant; xóa mâu thuẫn plan/schema/migration; chọn duy nhất `schema.prisma` làm canonical, hai file patch chỉ để archive/reference.
2. **Tạo migration security/baseline thật:** enum/FK/partial index/RLS/DB roles; test clean + upgrade; không dùng comment thay migration.
3. **Sửa foundation build/runtime:** alias, singleton Prisma, auth thật, `withDbContext`, outbox, CI build/E2E. Không mở thêm route trước khi gate xanh.
4. **Đóng contract dữ liệu tiền:** rate lineage, statement revision/payment allocation, commission inheritance, statutory placeholder; tuyệt đối không code công thức TNCN/BHXH trong các sprint core.
5. **Dùng dữ liệu thật làm acceptance:** 3 file chấm công, 2 kỳ statement, 2 rate card, 20 vòng đời worker, 10 dispute/adjustment; shadow-run trước cutover.

---

## 7. Kết quả kiểm chứng và nguồn kỹ thuật

Kết quả repo tại thời điểm rà soát:

- `npx prisma validate`: **pass**.
- `npm test`: **32/32 pass** (16 payroll tax + 16 ticket).
- `npm run build`: **fail** vì alias module trong payroll.
- Migration hiện tại: không có Permission Pool/RLS/partial unique/FK scope mới dù schema đã mô tả.

Nguồn chính thức dùng để kiểm chứng:

- [Prisma Client query extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query): extension có thể bao phủ model operation và raw operation, nhưng phải implement tường minh; callback `query` là operation callback.
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions): hỗ trợ interactive transaction, `isolationLevel`, timeout và retry conflict.
- [Prisma connection pool](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool): serverless cần kiểm soát pool và cân nhắc external pooler.
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): owner/BYPASSRLS có thể bypass; `FORCE ROW LEVEL SECURITY` và policy/index đúng là bắt buộc.
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations): request/response body tối đa 4.5 MB; duration phụ thuộc plan/config, không nên hard-code 300 giây như invariant kiến trúc.
- [QStash retry](https://upstash.com/docs/qstash/features/retry), [deduplication](https://upstash.com/docs/qstash/features/deduplication), [at-least-once delivery](https://upstash.com/docs/qstash/features/at-least-once): mặc định retry 3 lần, dedup window 10 phút, duplicate delivery vẫn có thể xảy ra.

## 8. Phán quyết cuối

HRP V4 không cần đổi stack hay tách microservice. Điều cần làm là **giảm số mô hình “đã thiết kế” nhưng chưa executable**, khóa invariant trong DB, và triển khai từng vertical slice có dữ liệu thật. Sau khi hoàn tất G0–S1, kiến trúc đủ chắc để team 5 dev đi tiếp; trước mốc đó, thêm module sẽ chỉ làm schema drift và security debt lớn hơn.

---

## 9. Chỉ thị triển khai cho AI coding — Q#22 và Security Foundation

Phần này là **execution contract**, không còn là đề xuất mở. AI coding phải thực hiện theo thứ tự bên dưới và không tự mở rộng phạm vi.

### 9.1. Quyết định Q#22 đã chốt

| Role | Row scope | Field scope | Write scope |
|---|---|---|---|
| `DIRECTOR` | Global read trên dữ liệu vận hành | Không mặc định trả CCCD, bank, selfie, password/auth data; cần `CAN_VIEW_WORKER_SENSITIVE` | Không có write mặc định; từng command phải qua Permission Pool |
| `MKT` | Lead do mình own/được assign, client liên quan và project `isPublic=true` | Không đọc Worker/SourceClaim/Assignment detail; được xem funnel aggregate ẩn danh | Chỉ command CRM được cấp qua Permission Pool |

`DIRECTOR` và `HR_MANAGER` chỉ giống nhau ở **row scope toàn cục**, không đồng nghĩa cùng feature permission hoặc cùng field projection. PostgreSQL RLS chỉ cắt row; field masking phải thực hiện bằng Prisma `select`/DTO ở application layer.

Permission bắt buộc bổ sung vào catalog:

```text
CAN_VIEW_WORKER_SENSITIVE
CAN_EXPORT_WORKER_DATA
CAN_CREATE_WORKER
CAN_UPDATE_WORKER
CAN_MANAGE_PERMISSIONS
CAN_OVERRIDE_INDIVIDUAL_COMMISSION
CAN_FORCE_LOCK_STATEMENT
```

### 9.2. Thứ tự triển khai bắt buộc

Không triển khai `withAuthScope` trước khi schema và permission resolver chạy được.

1. **Security schema migration:** `SystemRole`, Permission Pool v2, AccessGroup, membership, user override, FK scope và index.
2. **Root bootstrap + permission seed:** idempotent, version-controlled, không chứa secret trong source.
3. **Permission resolver:** ADMIN short-circuit, user DENY precedence, user/group/role ALLOW, validity period và cache version.
4. **AuthContext thật:** lấy role/user/vendor/worker từ token/session đã verify, không nhận từ body/header tự khai.
5. **Data-scope builders:** implement tường minh cho Worker và Project trước.
6. **`withDbContext`:** mở transaction ngắn, set RLS GUC transaction-local, trả scoped transaction client.
7. **RLS migration:** runtime role không phải table owner, không có BYPASSRLS; bảng nhạy cảm dùng FORCE RLS.
8. **Contract/integration tests đủ 13 role.** Chỉ sau khi xanh mới mở rộng scope sang bảng con.

### 9.3. File AI coding phải tạo hoặc cập nhật

```text
prisma/schema.prisma
prisma/migrations/<timestamp>_security_foundation/migration.sql
prisma/seed.ts

src/lib/db.ts
src/shared/auth/auth-context.ts
src/shared/auth/permission-catalog.ts
src/shared/auth/permission-resolver.ts
src/shared/auth/require-permission.ts
src/shared/auth/with-db-context.ts
src/shared/auth/rls-context.ts
src/shared/auth/scopes/worker.scope.ts
src/shared/auth/scopes/project.scope.ts
src/shared/auth/with-auth-scope.ts
src/shared/auth/worker-projection.ts

src/shared/auth/__tests__/permission-resolver.test.ts
src/shared/auth/__tests__/visibility-matrix.test.ts
src/shared/auth/__tests__/rls.integration.test.ts
src/shared/auth/__tests__/nested-write-security.test.ts
```

Không import/export base PrismaClient từ route hoặc domain. Chỉ `src/lib/db.ts` được tạo PrismaClient; code có user context phải đi qua `withDbContext`.

### 9.4. Root bootstrap và permission seed

Yêu cầu implementation:

- Permission code là catalog do source code quản lý; assignment permission là dữ liệu động trong DB.
- Seed dùng `upsert`, chạy lặp không tạo bản ghi trùng và không thu hồi grant thủ công hiện có.
- `ADMIN` không cần RolePermission để có quyền: resolver luôn `ADMIN => ALL` để permission tạo sau tự thuộc root.
- Root bootstrap đọc identifier/credential hash từ environment hoặc quy trình one-time; không hard-code, không log credential.
- Root phải đổi credential lần đầu; seed không được reset credential khi chạy lại.
- Mọi grant/revoke/group membership bắt buộc có `grantedBy/addedBy`, `reason`, `validFrom/validTo` và AuditLog.
- Không cho non-root cấp `CAN_MANAGE_PERMISSIONS`; người được ủy quyền chỉ cấp permission chính họ đang có.
- Thay `UserPermissionGrant` hiện tại bằng `UserPermissionOverride`; không để hai resolver song song.

Resolver canonical:

```ts
export async function hasPermission(
  ctx: AuthContext,
  code: PermissionCode,
): Promise<boolean> {
  if (ctx.role === 'ADMIN') return true;

  const grants = await loadEffectivePermissionSet(ctx.userId, ctx.role, ctx.permissionVersion);
  if (grants.userDenies.has(code)) return false;
  if (grants.userAllows.has(code)) return true;
  if (grants.groupAllows.has(code)) return true;
  return grants.roleAllows.has(code);
}
```

Cache key phải chứa `permissionVersion`; thay đổi role/grant/group membership phải tăng version trong cùng transaction. Không dùng TTL làm cơ chế revoke chính.

### 9.5. Visibility Matrix executable

Worker row scope canonical:

| Role | Điều kiện Worker |
|---|---|
| ADMIN | Tất cả; root short-circuit |
| HR_MANAGER | Tất cả |
| DIRECTOR | Tất cả row, nhưng projection mặc định không có field nhạy cảm |
| HR_STAFF | `assignedToId = ctx.userId` |
| SALE | `ownerId = ctx.userId OR assignedToId = ctx.userId` |
| PM | Có assignment chiếm chỗ thuộc project `pmUserId = ctx.userId` |
| VENDOR_ADMIN/VENDOR_STAFF | Có source attribution đang hiệu lực thuộc `ctx.vendorId` |
| CTV | Có source attribution đang hiệu lực thuộc `ctx.userId` |
| WORKER | `accountUserId = ctx.userId` |
| MKT | Deny Worker row |
| ACCOUNTANT | Deny Worker list mặc định; lấy WorkerSummary tối thiểu qua financial resource scope |
| EMPLOYEE | Deny Worker row mặc định; HRM nội bộ có resource scope riêng |

Project/CRM scope tối thiểu:

- ADMIN/HR_MANAGER/DIRECTOR: đọc toàn bộ Project.
- PM: `pmUserId = ctx.userId`.
- MKT: chỉ `isPublic = true`; Lead dùng `ownerUserId = ctx.userId`. Client scope cần relation ownership rõ ràng trước khi cho MKT đọc toàn bộ client.
- VENDOR/CTV/WORKER: project public hoặc project có quan hệ nghiệp vụ trực tiếp đã được mô hình hóa.
- Feature permission vẫn phải được kiểm tra riêng trước create/update/export/approve.

Không dùng một `buildWorkerScope()` để suy ra scope cho mọi bảng. Statement, Payment, AuditLog, PayrollConfig và User phải có builder/policy riêng.

### 9.6. Field-level projection bắt buộc

Không trả `include: { worker: true }` hoặc Worker object đầy đủ ra API. Tạo hai projection:

```ts
export const WORKER_OPERATIONAL_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  phone: true,
  profileStatus: true,
  employmentStatus: true,
  riskStatus: true,
} satisfies Prisma.WorkerSelect;

export const WORKER_SENSITIVE_SELECT = {
  ...WORKER_OPERATIONAL_SELECT,
  cccdNumber: true,
  cccdImageUrl: true,
  selfieImageUrl: true,
  bankAccount: true,
  bankName: true,
} satisfies Prisma.WorkerSelect;
```

Chỉ chọn projection nhạy cảm sau `requirePermission(ctx, 'CAN_VIEW_WORKER_SENSITIVE')`. Export phải kiểm tra thêm `CAN_EXPORT_WORKER_DATA` và ghi AuditLog.

### 9.7. Yêu cầu triển khai `withAuthScope`

- Không copy mẫu `query.findFirst()` trong callback `findUnique`; callback `query` chỉ thực thi operation hiện tại.
- Với unique query, giữ unique key ở top-level và thêm scope hợp lệ, hoặc cung cấp repository `findVisibleWorkerById()` dùng `findFirst` tường minh.
- Không dùng `scopeVia()` generic trả `{}`. Viết handler type-safe cho từng model/operation.
- Cover `findMany`, `findFirst`, unique lookup, `count`, `aggregate`, `updateMany`, `deleteMany`, create và nested write.
- Raw query chỉ chạy trong `withDbContext`; RLS là lớp chặn cuối.
- Không tự mở transaction quanh từng relation query bên trong extension. Transaction/RLS context do `withDbContext` sở hữu.
- Cấm network call, R2, SMS hoặc QStash bên trong transaction.

### 9.8. Test matrix — 13 role, không phải 8 role

Test đủ các role:

```text
ADMIN, HR_MANAGER, DIRECTOR, HR_STAFF, SALE, PM, ACCOUNTANT,
MKT, VENDOR_ADMIN, VENDOR_STAFF, CTV, WORKER, EMPLOYEE
```

Acceptance scenarios tối thiểu:

1. `findMany/findFirst/findUnique/count/aggregate` đều trả đúng cùng visibility set.
2. `updateMany/deleteMany` ngoài scope ảnh hưởng 0 row.
3. Create Worker ép owner/assignee từ session; body không giả owner được.
4. Nested `connect/create/update` không gắn Worker/Assignment ngoài scope.
5. `$queryRaw` trong RLS context không đọc được row ngoài scope.
6. Base runtime DB role ngoài context bị default-deny.
7. DIRECTOR thấy mọi Worker row nhưng response mặc định không có field nhạy cảm.
8. DIRECTOR chỉ update khi có permission command tương ứng.
9. MKT query Worker bị deny; MKT query public Project và Lead own được phép.
10. VENDOR_ADMIN và VENDOR_STAFF không nhìn chéo vendor.
11. WORKER chỉ thấy hồ sơ liên kết `accountUserId` của mình.
12. User DENY thắng role/group ALLOW; grant hết hạn không có hiệu lực.
13. ADMIN luôn có permission mới và không bị UserPermissionOverride DENY.
14. Hai session RLS chạy song song không rò GUC qua pooler.

### 9.9. Definition of Done của Security Foundation

Chỉ đánh dấu hoàn tất khi tất cả điều kiện sau đều đạt:

- `npx prisma validate` và `npx prisma generate` xanh.
- Migration chạy được trên DB sạch và DB từ migration `init` hiện tại.
- Có partial unique/exclusion/index/FK thật trong migration, không chỉ comment trong schema.
- `npm test` xanh với test 13-role matrix và RLS integration.
- `npm run build` xanh.
- Không còn `new PrismaClient()` trong route/domain.
- Không còn auth `Bearer userId:role` ở build production.
- Không route nào trả Worker full object hoặc sensitive field khi thiếu permission.
- Không có raw SQL có user context chạy ngoài `withDbContext`.
- Audit ghi đủ actor/reason cho permission change, sensitive view/export và write command.

### 9.10. Ngoài phạm vi của task security này

AI coding **không được** đồng thời triển khai:

- Công thức TNCN/BHXH thật.
- Pay run/commission calculation engine.
- Vendor/Worker portal UI.
- Refactor module không liên quan.
- Nâng Prisma/Next.js major version.

Nếu phát hiện schema hiện hữu không đủ relation để enforce scope, AI phải bổ sung FK/relation và migration trong Security Foundation, không được bỏ scope hoặc trả `{}` để “cho chạy trước”.
