# PHÂN TÍCH PHƯƠNG ÁN TÁCH MODULE — HRP V4

> Ngày viết: **15/08/2026**
> Căn cứ: `docs/UNIFIED_PLAN_v4.md` (v4.20) · `docs/HRP_V4_HOLISTIC_REVIEW.md` · `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md` · `docs/tasks/hrp-v4-bod-mockup/{TASK.md, HANDOFF.md, AUDIT.md, DECISION_LOG.md}` · khảo sát code thực tế `src/`, `prisma/`, `app/`, `appBCC/`.
>
> **Không viết mới kiến trúc** — chỉ rút ra **đường cắt** đã có sẵn trong plan/holistic review và đối chiếu với code thật.

---

## 0. Tóm một dòng

HRP đang ở **G0 — Baseline Gate**: chỉ 2 service thật (`payroll-core` + `ticket`), 0 portal UI, stub auth. Theo chỉ thị §9.2 của `HRP_V4_HOLISTIC_REVIEW`, **không thể tách microservice**; cách khả thi là **micro-package trong 1 monorepo** với **vertical-slice theo 11 micro-phase** (G0→S1→…→FINAL), trong đó **security foundation (Q#22) chặn trước mọi domain code**.

---

## 1. Thực trạng code — đầu vào cho quyết định

### 1.1. Đã có (code thật + có test xanh)

| Module | File | Trạng thái |
|---|---|---|
| **M8 Payroll-Core** | `src/domains/payroll/calculateVietnameseTaxes.ts` + `.test.ts` | ✅ Pure function, BigInt, không phụ thuộc Prisma |
| **M8 Payroll-Repo** | `src/domains/payroll/payrollConfigRepo.ts` | ⚠️ Có `ConfigLoader` interface (DI) nhưng chưa dùng |
| **M7 Ticket** | `src/domains/attendance/ticket.service.ts` + `.test.ts` + `app/api/tickets/**` | ✅ State machine 7×8, idempotency, audit; nhận `PrismaClient` qua DI |
| **M8 Portal-BCC** | `app/bcc/{page.tsx, actions.ts}` | ✅ Tra cứu bảng công (read-only) |
| **Shared UI lib** | `src/shared/ui/{data-table, entity-card, role-guard, sheet, view-toggle}` | ⚠️ 9 component, **chưa ai mount** |

### 1.2. Đã có schema, 0 service (chỉ `prisma/schema.prisma`)

- **38 model, 9 enum** (`User, Permission, Worker, ClientCompany, Project, StaffingOrder/Slot, Vendor, SourceClaim, ProjectAssignment, AttendanceImportBatch/Row, TimesheetPeriod/Line/Adjustment, PayrollConfig, TaxBracket, Ticket, AuditLog…`).
- **Migrations**: chỉ 2 migration (`init` + `g22_security`); nhiều model V4 mới (Ticket, PayrollConfig, Statement…) **chưa thấy migration tương ứng** — rủi ro khi `prisma migrate dev` ở DB production.

### 1.3. Đang nợ / anti-pattern

| # | Vấn đề | Nguồn |
|---|---|---|
| 1 | Auth stub — `Bearer userId:role` từ header, không JWT | `src/domains/attendance/session.ts:7-10` |
| 2 | Singleton Prisma **chưa có** — mỗi route `new PrismaClient()` | `app/api/tickets/route.ts:19` |
| 3 | `RoleGuardLayout` component chưa mount vào route group | `src/shared/ui/role-guard/role-guard-layout.tsx:16-19` |
| 4 | `cn()` helper vẫn là stub concat chuỗi | `src/shared/utils/cn.ts:1-14` |
| 5 | `ticket.service.ts:347-348` còn TODO idempotency_keys bảng riêng | ADR-014 |
| 6 | `enqueueNotification()` placeholder `recipientId = 'ROLE:<role>'` | `ticket.service.ts:904-907` |
| 7 | `app/bcc/actions.ts` server-action, **không auth, không rate-limit** | |
| 8 | 2 file schema-prisma patch còn nằm cùng folder, đã merge nhưng nhầm | `schema-v3.1-patches.prisma`, `schema-m7-tickets.prisma` |
| 9 | Python ETL `appBCC/` **chạy ngoài monorepo**, delete-then-insert chưa verify concurrency | §17 Risk |

### 1.4. Không có UI portal

- `app/` chỉ có `api/tickets/**` + `bcc/` — **không** `(portal)/admin`, `(portal)/m`, `(portal)/vendor`, `(portal)/ctv`.
- Toàn bộ design đang ở `docs/tasks/hrp-v4-bod-mockup/mockup/` (22 frame HTML, 4 module demo M3+M5+M7+M8).

---

## 2. Ràng buộc kiến trúc — không được phá vỡ

Từ `UNIFIED_PLAN_v4.md` §9.7 + `HRP_V4_HOLISTIC_REVIEW.md` §9.1 (đã chốt Q#22).

### 2.1. RBAC 13 role + Permission Pool v2

- **Root ADMIN bất khả tước** (G22) — `ADMIN => ALL` trong resolver, không cần RolePermission.
- **2-tier Data Scope**:
  - **L1 application** `withAuthScope` (Prisma Client Extension, deny-by-default).
  - **L2 Postgres RLS** — `runtime role != table owner`, không có `BYPASSRLS`, bảng nhạy cảm `FORCE RLS`.
- **Field masking**: RLS cắt row, **field masking** làm ở application (`select`/DTO) — KHÔNG trông chờ vào column-level security của Postgres.

### 2.2. Permission bắt buộc có (catalog trong code)

```
CAN_VIEW_WORKER_SENSITIVE   CAN_EXPORT_WORKER_DATA
CAN_CREATE_WORKER           CAN_UPDATE_WORKER
CAN_MANAGE_PERMISSIONS      CAN_OVERRIDE_INDIVIDUAL_COMMISSION
CAN_FORCE_LOCK_STATEMENT
```

→ Đây là **dependency cứng** — domain code nào cũng reference, không thể tách module mà bỏ qua.

### 2.3. DoD mọi feature (UNIFIED_PLAN §6.6, nhắc lại trong HOLISTIC_REVIEW §3.1)

- state-transition test ✓
- migration trên **DB sạch** + **DB nâng cấp** ✓
- API authz + data scope integration test ✓
- idempotency ✓
- audit log có actor/reason ✓
- UI theo loại công việc ✓
- monitoring ✓
- demo scenario thật ✓
- E2E vertical slice ✓

### 2.4. State machine bắt buộc

- **5 SM trên Worker** (§9.1): profile / submission / employment / assignment / risk — V4 đã siết "5 SM không thực sự độc lập" (HOLISTIC_REVIEW §1.3).
- **Ticket 7×8** — đã code.
- **Statement 6-state** (DRAFT→SENT→CONFIRMED|DISPUTED→LOCKED→PAID) — chưa code.
- **Timesheet 4-state** (PENDING→REVIEWED→APPROVED→LOCKED) — chưa code.
- **PayRun** (DRAFT→CALCULATED→LOCKED→PAID, có `isDryRun`) — chưa code.

### 2.5. ERD 7 tầng phải duy trì

```
ClientCompany → CrmLead → OutsourcingProject → StaffingOrder → StaffingOrderSlot
                                                              → ProjectAssignment ← Worker
                                                              → TimesheetLine → TimesheetPeriod → PayRun → WorkerPayResult
                                                              → VendorStatement / ClientStatement
```

---

## 3. Các "đường cắt" module có sẵn trong tài liệu

Em rút ra **5 cách cắt** đã được đề cập trong plan/review. Sếp chọn 1 (hoặc kết hợp).

### A. Cắt theo **Epic E0..E11** của WBS (UNIFIED_PLAN §6.2)

| Epic | Module | Wave | MD | Ưu tiên chốt |
|---|---|---|---:|---|
| E0 | Platform Core & Observability | 1, 4 | 40 | Sau Q#22 |
| E1 | Auth & RBAC | 1 | 35 | **CHẶN — trước mọi module** |
| E2 | Worker Portal + PWA | 3-4 | 70 | Sau khi có API `withAuthScope` |
| E3 | CRM, Projects & Staffing Order | 1, 3 | 45 | Sau G0 |
| E4 | Vendor Portal + Confirm/Dispute | 3 | 20 | Sau S5-S6 |
| E5 | Talent Pool, Source Claims & Dedup | 1-3 | 45 | Sau E3 |
| E6 | CTV Portal & Commission Ledger | 3-4 | 40 | Sau E2 |
| E7 | Attendance Import & Timesheet | 2-3 | 50 | Sau G0 |
| E8 | Payroll, Pay Run & Statements | 2, 4 | 65 | **Đã có core, còn wrapper** |
| E9 | HRM | Sau core | 40 | Deferred |
| E10 | Sprint 0 (discovery) | 0 | 10 | |
| E11 | UAT MVP | UAT | 10 | |

**Tổng**: ~465 MD trong horizon. **Khả thi** với team 5 dev ~26–28 tuần cho full M0–M8.

### B. Cắt theo **11 micro-phase của HOLISTIC_REVIEW §3.1** (khuyến nghị chính của Founder)

| # | Micro-phase | Tuần | Deliverable |
|---:|---|---:|---|
| 0 | **G0 — Baseline Gate** | 1 | Fix build, schema canonical, migration clean/upgrade, DB roles, 20 scenario thật |
| 1 | **S1 — Runtime/Auth/Security** | 2 | Prisma singleton, JWT/session, **Permission Pool v2**, `withDbContext`, RLS Worker/Project, audit/outbox |
| 2 | S2 — CRM/Staffing Backbone | 2 | Client, Project, StaffingOrder/Slot, Worker, Submission/Claim, transition engine |
| 3 | S3 — Assignment/Transfer | 2 | Activate/pause/resume/transfer, partial index, bulk command |
| 4 | S4 — Attendance Import | 2 | R2 presign, batch, preview/mapping, idempotency, DLQ |
| 5 | S5 — Timesheet Lock | 2 | Raw → line → period, approve/lock, adjustment |
| 6 | S6 — Rate & Statements | 2 | Rate version, statement lineage, dispute workflow |
| 7 | UAT/Cutover | 2 | Hai kỳ dữ liệu shadow, security matrix, load burst |
| 8 | P1 — External Portals | 4-6 | Worker PWA, vendor submission, CTV dashboard, GPS evidence |
| 9 | P2 — Commission | 2-3 | Group policy, individual override, ledger |
| 10 | P3 — Gross Payroll Shell | 2-3 | PayRun, manual statutory, dry-run, snapshot |
| 11 | FINAL — Statutory Engine | 3-5 | Config version, golden case, engine TNCN/BHXH, payslip |

**Khuyến nghị**: dùng B làm backbone (đã được Founder chốt), A làm từ điển cross-check MD.

### C. Cắt theo **data scope / role**

Dựa trên §9.7 Visibility Matrix:

- **System scope** (ADMIN/DIRECTOR/HR_MANAGER): toàn hệ thống — dùng module `hrp-admin`.
- **Project scope** (PM, SALE): `withDbContext` set RLS theo project — dùng module `hrp-project`.
- **Vendor scope** (VENDOR_ADMIN/STAFF): claim-based — module `hrp-vendor`.
- **CTV scope**: referral attribution — module `hrp-ctv`.
- **Worker scope**: `worker.id = current.id` — module `hrp-portal`.
- **Accountant scope**: financial-only, READ-only nhân bản — module `hrp-finance`.

→ **Khả thi**: nếu `withDbContext` chuẩn ở S1, mỗi scope là 1 package con chia sẻ DB chung.

### D. Cắt theo **vertical slice / user flow** (theo mockup)

4 slice đã có trong mockup (chưa code):

1. **Staffing Fill** (M3 + M5) — Control Tower → Staffing → Talent Pool → Transfer. Dài nhất, đầy đủ state machines.
2. **Attendance Lock** (M7) — Import → 7 exception taxonomy → Resolve → Lock.
3. **Dual Reconciliation** (M8 + M4) — Same period, 2 statements, lineage drawer.
4. **Job Board Public** (M2 + A-04) — Web công cộng, ISR, không cần auth.

**Khuyến nghị**: dùng 4 slice này làm **acceptance scenario** cho các sprint S2–S6.

### E. Cắt theo **mockup screen ID** (S01..S05, F-series, D-series)

Tài liệu mockup exec plan đã có **22 frame + 12 state + 11 hotspot** — đây là **acceptance criteria UI** cho mỗi micro-phase.

| Slice nghiệp vụ | Screen IDs | Module tương ứng |
|---|---|---|
| Operations Control Tower | S01 (5 state) + F50, F60_D01-D04 | M3 + M5 + M7 + M8 (read-aggregate) |
| Staffing/Talent | S02 (3 state) + S02A + S02B + F60_D03,D05 | M3 + M5 (UI đầy đủ) |
| Attendance | S03 (4 state) + S03B + F60_D06,D07 | M7 |
| Reconciliation | S04 (5 state) + S04A + S04B + F60_D08 | M4 + M8 (statement, không phải pay run) |
| Job Board | S05 | M2 + M3 (Project.isPublic) |

---

## 4. Khả thi tách **module con (sub-package)** trong monorepo

> Em KHÔNG đề xuất microservice. Holistic review §8 + plan §1.3 đã chốt: **monolith Next.js**.

### 4.1. Bảng khả thi

| Module | Tách ngay? | Phụ thuộc | Rủi ro tích hợp | Khóa kỹ thuật |
|---|:---:|---|---|---|
| `packages/payroll-core` | ✅ **Có thể** | `src/shared/utils/money` | Không — đã pure | Không |
| `packages/payroll-config` | ⚠️ Sau khi DI xong | truyền `PrismaClient` qua constructor | Idempotent load effective-dated | Di thay vì import global |
| `packages/ticket-service` | ✅ **Có thể** | `packages/security` chưa có → phải hardcode role check cũ | Phụ thuộc `withDbContext` cho RLS | AuthContext stub → real |
| `packages/money` | ✅ Đã là package | 0 | 0 | 0 |
| `packages/auth` (permission + AuthContext + withDbContext) | ❌ **CHƯA** | Phase S1 — 2 tuần, 5 dev | Phải FULL 13-role test xanh mới mở scope khác | **CRITICAL** |
| `packages/talent-pool` | ❌ Sau S1 | packages/auth | partial unique + temporal non-overlap | Q#22 |
| `packages/attendance` (import + timesheet) | ⚠️ Sau S2 | packages/auth + R2 interface | GPS evidence + accuracy gate | E2E tốn test data |
| `packages/payroll-engine` (Statutory TNCN/BHXH thật) | ❌ FINAL phase | packages/payroll-core + config version | Golden case 5 loại NPT | Compliance |
| `packages/job-board` (A-04) | ✅ Có thể tách **độc lập** | 0 schema (chỉ đọc `Project.isPublic`) | ISR revalidate | SEO + caching |

### 4.2. Quy tắc tách (từ HOLISTIC_REVIEW §9.3)

> Không import/export base `PrismaClient` từ route hoặc domain. **Chỉ `src/lib/db.ts` được tạo `PrismaClient`**. Code có user context phải đi qua `withDbContext`.

→ Nghĩa là: nếu tách package, package phải:
1. Nhận `PrismaClient` qua DI (constructor hoặc factory), không `new PrismaClient()`.
2. Truy cập DB chỉ qua `withDbContext({ user, scope }, async (tx) => …)` — không bao giờ qua global.
3. Audit + idempotency nằm trong package.

### 4.3. Ranh giới trong `src/domains/` — phải chuẩn hóa

Hiện tại ranh giới chỉ có ở 2 domain (Ticket đã có service; Payroll có service + repo). Cần áp dụng cho mọi domain mới:

```
packages/<module>/
├── src/
│   ├── schema.ts          # zod input/output
│   ├── repository.ts      # Chỉ truy cập DB qua withDbContext
│   ├── service.ts         # Business logic, transition, idempotency
│   ├── permission.ts      # Helper: requirePermission(['CAN_XXX'])
│   └── index.ts
└── test/
    ├── unit/              # service.test.ts
    ├── integration/       # 13-role matrix
    └── e2e/               # vertical slice
```

### 4.4. Sub-package nào có thể "tách sớm" (FOCUS G0–S1)

Để đạt tiến độ mà không bị security debt, em đề xuất **3 sub-package đầu tiên**:

| # | Package | Lý do tách |
|---:|---|---|
| 1 | `@hrp/money` | Đã có (`src/shared/utils/money.ts`), BigInt VND helpers, 0 phụ thuộc → dùng chung |
| 2 | `@hrp/payroll-core` | Đã có (`calculateVietnameseTaxes.ts`), pure function, golden case đã đối chiếu (§12.5) → dùng lại cho CTV commission, payslip, batch |
| 3 | `@hrp/job-board` | Tách trước cả khi có auth: chỉ đọc `Project.isPublic`, ISR 300s, không cần `withDbContext`. Cho phép **demo public sớm** (Q#23) để nhận test data thật mà không cần auth production |

→ Sau S1 (auth thật xong), tách tiếp: `@hrp/ticket-service` → `@hrp/talent-pool` → `@hrp/attendance-import` → `@hrp/statement` → `@hrp/payroll-engine`.

---

## 5. Phương án đề xuất — **Phương án A: Vertical-slice monorepo với 3 sub-package đầu tiên**

### 5.1. Nguyên tắc

1. **Bám sát HOLISTIC_REVIEW §9.2** — security foundation CHẶN trước mọi domain. Không viết trước `withAuthScope`.
2. **Monolith Next.js**, không microservice (HOLISTIC_REVIEW §8 đã chốt).
3. **Tách 3 sub-package "rủi ro thấp" ngay**: `money`, `payroll-core`, `job-board` (độc lập auth).
4. **Mỗi vertical slice** (Staffing Fill · Attendance Lock · Dual Reconciliation) đi kèm 4-role integration test tối thiểu (ADMIN/HR_STAFF/VENDOR/WORKER).
5. **Migration theo lô** — mỗi sprint chỉ ship migration của module đó (per-module migration folder).

### 5.2. Lộ trình 6 tuần đầu (G0 + S1 + first vertical slice)

| Tuần | Phase | Việc | Đầu ra |
|---:|---|---|---|
| **W1** | **G0** | Fix build (xóa schema patch folder), singleton `src/lib/db.ts`, 1 migration consolidated, ADR delta, 20 scenario dữ liệu thật | Build xanh, DB schema khớp app |
| **W2** | **S1-Auth** | `withAuthScope` (L1), JWT thật, permission catalog seed, **`withDbContext`** + RLS Worker/Project (L2) | 13-role integration test xanh ở 2 bảng |
| **W3** | **S1-Outbox** | Outbox pattern, audit log chuẩn hóa, idempotency keys bảng riêng (refactor `ticket.service.ts:347`) | Audit + idempotent ở mọi mutation |
| **W4** | **S2 slice 1** | Skill đầu tiên: Client/Project/StaffingOrder + SourceClaim (G14 partial unique) | Staffing skeleton + 1 vertical slice test |
| **W5** | **S3 slice 1** | Assignment activate/pause/transfer + bulk command (Q#22) | Worker có 1 ACTIVE enforced |
| **W6** | **S4-S5** | Import attendance stub + 1 file thật + 1 Lock vàng từ file thật | E2E: nhập → chốt 1 kỳ |

### 5.3. Đường găng tiến độ

- **Tuần 4** phải có `withDbContext` chạy đúng 13 role với Worker/Project.
- **Tuần 8** phải có 1 vertical slice (Staffing Fill) chạy E2E với dữ liệu thật.
- **Tuần 12** MVP nội bộ đạt theo V4 plan (điều chỉnh 13–15 tuần theo HOLISTIC_REVIEW §3.1).
- **Tuần 18–22** mở 3 cổng bên ngoài (Worker PWA, Vendor Portal, CTV).
- **Tuần 26–28** Go-live đầy đủ M0–M8 (target 22/02/2027).

### 5.4. Cách áp dụng sub-package

Dùng **npm workspaces** (đã có `package.json` monorepo) — không dùng pnpm/yarn để tránh tool churn.

```
package.json  ->  "workspaces": ["packages/*", "src/domains/*"]
```

Sau khi convert:

```
packages/
├── money/                 ← src/shared/utils/money.ts
├── payroll-core/          ← src/domains/payroll/{calculateVietnameseTaxes,payrollConfigRepo}.ts
├── auth/                  ← NEW: AuthContext, withDbContext, permission-resolver (S1)
└── job-board/             ← NEW (chỉ phụ thuộc Project + StaffingOrder)
src/
├── lib/db.ts              ← singleton
├── shared/...             ← UI giữ nguyên
└── domains/
    ├── ticket/            ← sau S1: refactor thành packages/ticket-service
    ├── attendance/
    └── ...
```

---

## 6. Phương án đối chứng

### Phương án B — Microservice (BỊ LOẠI)

Lý do loại (HOLISTIC_REVIEW §8):
- 5 dev team không đủ để vận hành 3 service trở lên.
- Tách service = tách transaction = lệch lời nguyện vọng "một nguồn sự thật".
- Postgres RLS đã giải quyết cross-tenant — không cần microservice.
- COST Vercel Hobby + Neon Free chỉ chịu được 1 monolith.

### Phương án C — Feature flag từng micro-phase

Có thể áp dụng song song với Phương án A nếu sếp muốn:
- Bật `FEATURE_STAFFING` riêng, `FEATURE_TIMESHEET` riêng.
- Mỗi feature chỉ mount UI khi config + role tương ứng.
- **Trade-off**: thêm 1 lớp config — đẩy complexity lên sớm, không phù hợp 5-dev team.

→ Em **khuyến nghị Phương án A**, kết hợp có chọn lọc Pattern "feature flag" cho các phần cần thiết (vd: `STATUTORY_ENGINE_MODE`, `PAYROLL_GROUP_ENABLED`).

---

## 7. Câu hỏi còn mở ảnh hưởng đến tách module

Từ `UNIFIED_PLAN_v4.md` §21 + `HRP_V4_HOLISTIC_REVIEW.md` §5:

| # | Câu hỏi | Ảnh hưởng |
|---|---|---|
| Q#09 | `payrollGroupKey` non-null — chốt danh sách nhóm? | E8 (PayRun/Statement) tách thế nào |
| Q#14 | Tách Vendor pay / Client bill — chốt rate? | E6 (Statement) UI/vendor preview |
| Q#19 | Zalo flag — Phase nào bật? | E2 (Worker Portal) |

→ Sếp nên trả lời Q#09 + Q#14 trước khi sang S6 (Rate & Statements) ở tuần 12.

`D01–D08` (DECISION_LOG.md) — 8 quyết định **chờ sếp chốt trong buổi BoD** trước khi freeze Mockup Baseline v1. Không ảnh hưởng trực tiếp đến micro-phase, nhưng nếu chọn **Variant B** của D02 (Comfortable 52px) → render test toàn project phải pass lại.

`D09–D12` — Deferred, không chặn.

---

## 8. Kiến nghị cuối

| # | Hành động | Chủ | Hạn |
|---:|---|---|---|
| 1 | Sếp duyệt Phương án A (vertical-slice monorepo) | Sếp | Cuối tuần |
| 2 | Bắt đầu G0 ngay: xóa 2 file `schema-*.prisma` patch, gộp migration, fix singleton Prisma | AI coding | W1 |
| 3 | Tách `packages/money` + `packages/payroll-core` ngay đầu W1 (low risk) | AI coding | W1 |
| 4 | Sau khi `withDbContext` xanh ở W2 → refactor `ticket.service.ts` rời `src/domains/attendance` → `packages/ticket-service` | AI coding | W2–W3 |
| 5 | Trả lời Q#09 + Q#14 trước tuần 11 (S6 bắt đầu) | Sếp | W11 |
| 6 | Chốt D01–D08 trong buổi BoD (mockup baseline v1) | Sếp | Trước W4 (S2) |
| 7 | Không tách microservice; không microservice hóa trước 2027-Q4 | Sếp | — |

---

## 9. Điều chưa chắc (cần sếp quyết)

1. **Có chấp nhận 13–15 tuần thay vì 12 tuần cho MVP nội bộ không?** (HOLISTIC_REVIEW §3.1 vs plan V4 §7)
2. **Có chấp nhận chuyển `schema-v3.1-*.prisma` ra `_archive/` không?** (cleanup G0)
3. **Có chấp nhận tạm thời `STATUTORY_ENGINE = MOCKED`** để S6 chạy với dữ liệu thật mà chưa cần công thức TNCN/BHXH thật? (HOLISTIC_REVIEW §3.2)
4. **Có chấp nhận `@hrp/job-board` tách trước cả khi có auth không?** (để mở A-04 demo sớm theo Q#23)

---

> **Tài liệu tham chiếu không sửa**: `UNIFIED_PLAN_v4.md`, `HRP_V4_HOLISTIC_REVIEW.md`, `HRP_V4_MOCKUP_EXECUTION_PLAN.md`, `tasks/hrp-v4-bod-mockup/{TASK,HANDOFF,AUDIT,DECISION_LOG}.md`, `data-scope-security.md`.
