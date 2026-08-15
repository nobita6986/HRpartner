# PHÂN TÍCH PHƯƠNG ÁN TÁCH MODULE — HRP V4 (v2, bản tổng hợp)

> Ngày viết: **15/08/2026** · Phiên bản: v2 (bản mở rộng của `docs/MODULE_TACH_V1.md`).
>
> **Phạm vi**: khảo sát code thật + tổng hợp toàn bộ tài liệu đã có để đề xuất phương án tách module để **thực thi dần dần** trong monorepo HRP.
>
> **Tài liệu đầu vào** (đã đọc trọng tâm — KHÔNG sửa):
> - `docs/UNIFIED_PLAN_v4.md` (v4.20, 14/08/2026)
> - `docs/HRP_V4_HOLISTIC_REVIEW.md` (60KB)
> - `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md` (51KB)
> - `docs/data-scope-security.md` (27KB)
> - `docs/tasks/hrp-v4-bod-mockup/TASK.md` (61KB)
> - `docs/tasks/hrp-v4-bod-mockup/HANDOFF.md` (21KB)
> - `docs/tasks/hrp-v4-bod-mockup/AUDIT.md` (66KB)
> - `docs/tasks/hrp-v4-bod-mockup/DECISION_LOG.md` (4KB)
> - `docs/design/TIER1_MOCKUP_DAY1_PROMPT.md`
> - `docs/design/FIGMA_OWNER_DAY1_CHECKLIST.md`
> - `docs/competitive-analysis-viec3mien.md`
>
> **Khảo sát code thật** (sub-agent session 15/08/2026): `src/`, `prisma/`, `app/`, `appBCC/`, `package.json`, `vitest.config.ts`, `tsconfig.json`, `vercel.json`.

---

## PHẦN I — THỰC TRẠNG DỰ ÁN

### 1.1. Một câu tóm

HRP đang ở **G0 — Baseline Gate**: stack Next.js 15 + Prisma + Postgres + Vitest đã chạy, chỉ 2 domain service đã code thật (Payroll-Core + Ticket), **0 portal UI**, auth còn stub, migration **chưa đầy đủ**.

### 1.2. Stack thực tế (rút từ `package.json` + `tsconfig.json` + `vitest.config.ts` + `vercel.json`)

| Thành phần | Giá trị | Ghi chú |
|---|---|---|
| Framework | Next.js `15.1.3` (App Router, React 19) | `app/` chỉ có `api/` + `bcc/`, không `src/app/` |
| ORM | Prisma `5.22.0` (`prisma-client-js`) | `new PrismaClient()` trong mỗi route — anti-pattern |
| DB | Postgres (Neon branch main, `.env`) | Chuẩn RLS chưa apply trong migration |
| Test | Vitest `2.1.8` (`src/**/*.test.ts`) | 2 test file (ticket + payroll calc) |
| Styling | Tailwind v4 (`@tailwindcss/postcss ^4.3.3`) | + `clsx` + `tailwind-merge` |
| Forms | `react-hook-form ^7.54` + `zod ^3.24` | zod chưa có schema folder chuẩn |
| Table | `@tanstack/react-table ^8.20.5` | Có library, chưa ai dùng |
| Icons | `lucide-react ^0.468` | |
| Deploy | Vercel (`framework: nextjs`, `next build`) | `scripts/copy-static.mjs` copy `index.html`+`ve-hrp.html`+`docs/` ra `public/` |
| Python ETL | `appBCC/` — PySide6 + pandas + openpyxl + psycopg2 + SQLAlchemy + Deepseek | Chạy ngoài monorepo, ESM không khớp |

### 1.3. Cấu trúc thư mục hiện tại (rút gọn)

```
HrP/
├── app/                                         # Next.js App Router — chỉ 2 sub-dir
│   ├── api/tickets/
│   │   ├── route.ts                             # POST + GET /api/tickets
│   │   └── [id]/
│   │       ├── route.ts                         # GET ticket
│   │       ├── approve/route.ts
│   │       ├── reject/route.ts
│   │       ├── cancel/route.ts
│   │       └── pay/route.ts                     # (file có trong git status đầu phiên)
│   └── bcc/
│       ├── page.tsx                             # Tra cứu Bảng Công
│       └── actions.ts                           # server actions: fetchOptions, fetchPortalTimesheet
├── src/
│   ├── domains/
│   │   ├── attendance/                          # ≠ attendance shell — chỉ Ticket logic
│   │   │   ├── session.ts                       # STUB auth từ Bearer header
│   │   │   ├── ticket.service.ts                # 7×8 state machine + BigInt + idempotency
│   │   │   └── ticket.service.test.ts           # 100% transition rule
│   │   └── payroll/
│   │       ├── calculateVietnameseTaxes.ts      # PURE — BHXH/BHYT/BHTN + TNCN
│   │       ├── calculateVietnameseTaxes.test.ts
│   │       ├── payrollConfigRepo.ts             # Effective-dated snapshot loader
│   │       └── index.ts                         # barrel
│   └── shared/
│       ├── styles/tokens.ts                     # Design tokens HRP
│       ├── utils/
│       │   ├── cn.ts                            # STUB concat — chưa switch sang clsx+twMerge
│       │   └── money.ts                         # BigInt VND helpers
│       └── ui/
│           ├── data-table/{data-table.tsx, use-table-url-state.ts}
│           ├── entity-card/entity-card.tsx
│           ├── role-guard/role-guard-layout.tsx # STUB — chưa mount
│           ├── sheet/slide-out-drawer.tsx
│           └── view-toggle/view-toggle.tsx
├── prisma/
│   ├── schema.prisma                            # 1051 dòng — 38 model, 9 enum (CANONICAL)
│   ├── schema-v3.1-patches.prisma               # DEPRECATED — cần archive
│   ├── schema-m7-tickets.prisma                 # DEPRECATED — cần archive
│   └── migrations/
│       ├── 20260815013341_init/                 # 08/15 08:33
│       └── 20260815084134_g22_security/         # 08/15 08:41 (G22: RBAC + partial unique)
├── appBCC/                                      # Python ETL desktop, chạy song song độc lập
│   ├── app.py / core_pipeline.py / agent_mapper.py / config_manager.py
│   ├── formulas/{base_formula, formula_registry, actro_formula}.py
│   └── requirements.txt (PySide6, pandas, openpyxl, openai, psycopg2, SQLAlchemy)
├── docs/                                        # 67 file — md + 22 frame mockup + design/
├── index.html / ve-hrp.html                     # Static landing cho Vercel
└── scripts/copy-static.mjs
```

### 1.4. Trạng thái từng module nghiệp vụ

| # | Module | Schema | Service | Test | UI/Route | Ghi chú |
|---:|---|:-:|:-:|:-:|:-:|---|
| M0 | Platform Core | ✅ | ❌ | ❌ | ❌ | Singleton Prisma, logging, tracing đều chưa có |
| M1 | Auth & RBAC | ✅ (g22 migration) | ❌ | ❌ | ❌ | Permission seed đang mất |
| M2 | Job Board Public | ⚠️ (`Project.isPublic`) | ❌ | ❌ | ❌ | A-04 chưa có |
| M3 | CRM + Project | ✅ | ❌ | ❌ | ❌ | — |
| M4 | Vendor | ✅ (model) | ❌ | ❌ | ❌ | — |
| M5 | Talent Pool + SourceClaim | ✅ + G14 partial unique | ❌ | ❌ | ❌ | — |
| M6 | CTV | ✅ (`User.role=CTV`) | ❌ | ❌ | ❌ | — |
| M7 | Attendance (Import + Timesheet) | ✅ | ⚠️ (chỉ Ticket) | ⚠️ | ✅ (api) | Có Ticket.service chạy được |
| M8 | Payroll | ✅ | ⚠️ (chỉ pure calc) | ✅ | ❌ | `calculateVietnameseTaxes` đã xanh |
| M9 | HRM | ❌ (chưa schema) | ❌ | ❌ | ❌ | Deferred |
| — | Portal BCC | ✅ (PortalTimesheet) | ✅ | ❌ | ✅ | Tra cứu bảng công, 1 page |
| — | UI Shared | — | ✅ | ❌ | ⚠️ (lib-only) | 9 component, 0 consumer |

**Tổng đếm**: 2 service file thật (`ticket.service.ts` + `calculateVietnameseTaxes.ts`) + 2 test file + 6 route handler + 1 server-action + 1 page + 1 portal xanh.

### 1.5. Nợ kỹ thuật & vi phạm mà plan đã cảnh báo

| # | Vấn đề | Vị trí | Phạm vi sửa |
|---:|---|---|---|
| 1 | **Auth stub** — `Bearer userId:role` không JWT | `src/domains/attendance/session.ts:7-10` | Cấm production |
| 2 | **Singleton Prisma chưa có** — mỗi route `new PrismaClient()` | `app/api/tickets/route.ts:19` | Tạo `src/lib/db.ts` (HOLISTIC_REVIEW §9.3 yêu cầu) |
| 3 | **RoleGuardLayout chưa mount** | `src/shared/ui/role-guard/role-guard-layout.tsx:16-19` | Cần `(portal)` route group + JWT |
| 4 | **`cn()` helper stub** — concat chuỗi | `src/shared/utils/cn.ts:1-14` | Đã cài `clsx+twMerge` nhưng chưa switch |
| 5 | **Idempotency dùng query metadata** | `ticket.service.ts:347-348` | TODO(V4 F24) → bảng `idempotency_keys` ADR-014 |
| 6 | **Notification recipient là placeholder** | `ticket.service.ts:904-907` | `recipientId = 'ROLE:<role>'` |
| 7 | **`AuthIdentity` chưa define** | `prisma/schema.prisma:199` | Enum `SystemRole` 13 role đã có, model `User` chưa link provider |
| 8 | **`app/bcc/actions.ts` không auth, không rate-limit** | `app/bcc/actions.ts` | Server action trực tiếp, không `withAuthScope` |
| 9 | **2 file `schema-*.prisma` patch** còn nằm cùng folder | `schema-v3.1-patches.prisma`, `schema-m7-tickets.prisma` | Move sang `_archive/` |
| 10 | **Migration chưa apply** — nhiều model V4 mới | `prisma/migrations/` (chỉ 2 folder) | Cần kiểm tra lệch DB↔Schema |
| 11 | **Python ETL delete-then-insert** | `appBCC/core_pipeline.py` | UPSERT chưa concurrency-safe với HRP web |
| 12 | **`app/bcc/page.tsx` inline clsx+twMerge**, không qua `cn` | `app/bcc/page.tsx:6-11` | Duplicate logic |

### 1.6. Migration gap — risk khi deploy

Hiện có 2 migration:
- `20260815013341_init` (8h33)
- `20260815084134_g22_security` (8h41, cùng ngày)

Schema hiện tại khai báo **38 model**, nhưng migration `init` chỉ tạo một subset. Nhiều model V4 (Ticket, PayrollConfig, AuditLog, Statement, PortalTimesheet, SourceClaim, ProjectAssignment…) **chưa thấy migration tương ứng**. Trên DB production, có thể schema.prisma đã "thăng" model mới nhưng DDL chưa chạy → cần `prisma migrate dev` an toàn hoặc migration thủ công có audit.

### 1.7. Git log gần đây (HEAD~30)

```
773748e docs(analysis): MODULE_TACH_V1 - phan tich phuong an tach module  ← vừa push
6ac12a8 ... (BCC-related — sub-agent report nói "BCC commit")
35fe554 feat(m7)
451ea28 chore: setup project
02517ff chore(landing): cap nhat index.html theo UNIFIED_PLAN_v4 v4.20
a4327ab chore(deploy): chuyen sang static html, Vercel bo next build
27f1f1d fix(api): pay route cung Next 15 async params (bo sot Vercel build)
bd4d74b fix(api): route handlers Next 15 async params (Promise)
b76a7b7 fix(site): Gantt min-width 1400px de cac cot khong chong nhau
```

→ Dự án đang ở nhịp fix-build nhỏ, chưa thấy commit feature hoàn chỉnh ngoài M7 Ticket.

---

## PHẦN II — RÀNG BUỘC KIẾN TRÚC (KHÔNG ĐƯỢC PHÁ VỠ)

Trích từ `UNIFIED_PLAN_v4.md` §9.7 + `HRP_V4_HOLISTIC_REVIEW.md` §9.1 (Q#22 đã chốt) + `data-scope-security.md`.

### 2.1. RBAC 13 role + Permission Pool v2

**Root ADMIN bất khả tước** (G22, ADR-021):
- `ADMIN => ALL` trong resolver, không cần RolePermission gán trước.
- Permission tạo sau tự thuộc root mà không cần seed.

13 `SystemRole` đã enum:
`ADMIN` (root) · `DIRECTOR` · `HR_MANAGER` · `HR_STAFF` · `PM` · `SALE` · `ACCOUNTANT` · `MKT` · `VENDOR_ADMIN` · `VENDOR_STAFF` · `CTV` · `WORKER` · `PORTAL_VIEWER`

**Q#22 đã chốt** (HOLISTIC_REVIEW §9.1):

| Role | Row scope | Field scope | Write scope |
|---|---|---|---|
| `DIRECTOR` | Global read vận hành | Ẩn CCCD/bank/selfsie/password mặc định → cần `CAN_VIEW_WORKER_SENSITIVE` | **Không write mặc định** — từng command qua Permission Pool |
| `MKT` | Lead own/assigned + project `isPublic=true` | Không đọc Worker/SourceClaim/Assignment detail; funnel aggregate ẩn danh OK | Chỉ command CRM qua Permission Pool |

`DIRECTOR` ≠ `HR_MANAGER` ở feature permission + field projection — chỉ giống row scope. **RLS cắt row**, **field masking qua `select`/DTO ở application layer**.

### 2.2. Two-tier data scope (G25 + G26)

- **L1 — Application**: `withAuthScope(user, fn)` (Prisma Client Extension), deny-by-default.
- **L2 — Postgres RLS**: runtime role **không phải table owner**, không có `BYPASSRLS`; bảng nhạy cảm `FORCE RLS`.
- Mỗi request có user context phải mở transaction ngắn: `withDbContext({ user, scope }, async (tx) => …)`.

### 2.3. Permission catalog bắt buộc (code, không DB)

```
CAN_VIEW_WORKER_SENSITIVE
CAN_EXPORT_WORKER_DATA
CAN_CREATE_WORKER
CAN_UPDATE_WORKER
CAN_MANAGE_PERMISSIONS
CAN_OVERRIDE_INDIVIDUAL_COMMISSION
CAN_FORCE_LOCK_STATEMENT
```

→ Mọi domain service reference 1 trong các permission trên. Không thể tách module nếu bỏ qua catalog này.

### 2.4. DoD 10 tiêu chí cho mọi feature (UNIFIED_PLAN §6.6)

1. state-transition test pass
2. migration chạy trên **DB sạch** + **DB nâng cấp**
3. API authz + data scope integration test
4. idempotent trên retry
5. audit log có `actor` + `reason` + timestamp
6. UI theo loại công việc
7. monitoring / SLO
8. demo scenario thật
9. E2E vertical slice chạy

### 2.5. State machine bắt buộc

- **5 SM trên Worker** (HOLISTIC_REVIEW §1.3 — "không thực sự độc lập"): profile / submission / employment / assignment / risk — phải xem như 1 khối có invariant chéo.
- **Ticket** 7×8 status × action — **đã code**, có test transition table.
- **Statement** 6-state: DRAFT → SENT → CONFIRMED | DISPUTED → LOCKED → PAID.
- **Timesheet** 4-state: PENDING → REVIEWED → APPROVED → LOCKED — có **adjustment path sau khóa**.
- **PayRun** (HOLISTIC_REVIEW §3.2): DRAFT → CALCULATING → CALCULATED → REVIEWED → LOCKED → PAID (có `isDryRun`).
- **SourceClaim**: ACCEPTED có effective-dated + gắn assignment/program, **không boolean toàn đời Worker** (§5).
- **ProjectAssignment**: 1 ACTIVE enforced cả partial unique **lẫn** temporal non-overlap.

### 2.6. ERD 7 tầng phải duy trì

```
ClientCompany
   └─ CrmLead
       └─ OutsourcingProject (n-N CTV qua CampaignLead)
           ├─ StaffingOrder
           │   └─ StaffingOrderSlot
           └─ ProjectAssignment ← Worker (1 ACTIVE enforced)
                                    └─ SourceClaim (≤N accepted, effective-dated)
AttendanceImportBatch
   └─ AttendanceImportRow
       └─ AttendanceEvent / AttendanceException
TimesheetPeriod
   └─ TimesheetLine (từ AttendanceEvent, có adjustment)
       └─ PayRun
           └─ WorkerPayResult
               ├─ StatutoryCalculation (PIT/SI/HI/UI)
               └─ NonStatutoryAdjustment

Vendor
   ├─ VendorRateCard (effective-dated, non-overlap)
   ├─ VendorStatement
   │   └─ VendorStatementLine
   └─ VendorPortalSession

Client
   ├─ ClientRateCard (effective-dated, non-overlap)
   └─ ClientStatement
       └─ ClientStatementLine

AuditLog (chung, có actor + reason + ip + ua)
Notification (outbox pattern)
```

### 2.7. Quy tắc xương sống

- **Idempotency bắt buộc** cho mọi mutation — retry safe.
- **Audit khi thay đổi state** — bắt buộc có lý do.
- **Không sửa data đã LOCKED** — chỉ adjustment/version mới.
- **Effective-dated config** cho mọi rate/tax bracket (WorkerDeduction, VendorRateCard, ClientRateCard, PayrollConfig, TaxBracket).
- **Partial unique + temporal non-overlap** song song (G14: 1 ACTIVE assignment, G22: 1 accepted source).
- **Run-as runtime role** ≠ table owner (R2 RLS).
- **Root identity từ ENV/1-time**, không hard-code (R3).
- **`PayRunStatus` chỉ chuyển sau dry-run verify**: DRAFT → CALCULATED qua preview.

---

## PHẦN III — 5 ĐƯỜNG CẮT MODULE TỪ TÀI LIỆU

Em rút ra **5 cách cắt** đã có nguyên văn trong plan/review. Sếp chọn 1 (hoặc kết hợp).

### A. Cắt theo Epic E0..E11 (UNIFIED_PLAN §6.2, WBS tổng)

| Epic | Module | Wave | MD | Trạng thái |
|---|---|---|---:|---|
| E0 | Platform Core & Observability | 1, 4 | 40 | Mới bắt đầu |
| E1 | Auth & RBAC | 1 | 35 | Schema có, service chưa |
| E2 | Worker Portal + PWA | 3-4 | 70 | Chưa |
| E3 | CRM, Projects & Staffing Order | 1, 3 | 45 | Schema có |
| E4 | Vendor Portal + Confirm/Dispute | 3 | 20 | Schema có |
| E5 | Talent Pool, Source Claims & Dedup | 1-3 | 45 | Schema có |
| E6 | CTV Portal & Commission Ledger | 3-4 | 40 | Schema có |
| E7 | Attendance Import & Timesheet | 2-3 | 50 | 1 service (Ticket) |
| E8 | Payroll, Pay Run & Statements | 2, 4 | 65 | 1 calc service |
| E9 | HRM | Sau core | 40 | Deferred |
| E10 | Sprint 0 (discovery) | 0 | 10 | Done |
| E11 | UAT MVP | UAT | 10 | — |
| | **Tổng** | | **~465 MD** | Horizon ~26-28 tuần cho full MVP |

**Dùng cho**: WBS tổng, budgeting, allocation. **Không nên** dùng làm backbone sprint vì còn lẫn Phase + Discovery.

### B. Cắt theo 11 micro-phase (HOLISTIC_REVIEW §3.1 — Founder chốt) — **BACKBONE KHUYẾN NGHỊ**

| # | Phase | Tuần | Deliverable bắt buộc | KHÔNG làm trong phase |
|---:|---|---:|---|---|
| **0** | **G0 — Baseline Gate** | 1 | Fix build; schema canonical; migration clean/upgrade; DB roles; ADR delta; 20 scenario thật | UI portal, payroll law engine |
| **1** | **S1 — Runtime/Auth/Security** | 2 | Prisma singleton, JWT/session, Permission Pool v2, custom group, `withDbContext`, RLS Worker/Project, audit/outbox | Zalo, device binding nâng cao |
| **2** | S2 — CRM/Staffing Backbone | 2 | Client, Project, StaffingOrder/Slot, Worker, Submission/Claim, transition engine | Dedup AI, vendor portal |
| **3** | S3 — Assignment/Transfer | 2 | Activate/pause/resume/transfer, exclusion/partial index, quota derived, bulk command từng worker transaction | PM PWA |
| **4** | S4 — Attendance Import | 2 | R2 presign, batch, streaming giới hạn MVP, preview/mapping/unmatched, idempotency, job status/DLQ | Máy chấm công, GPS |
| **5** | S5 — Timesheet Lock | 2 | Raw → line → period, approve/lock, correction/adjustment, overnight split data model | Pay run |
| **6** | S6 — Rate & Statements | 2 | Rate version, vendor/client statement lineage, revision/dispute admin workflow, export | Vendor self-service nếu nội bộ chưa ổn |
| **7** | UAT/Cutover | 2 | Hai kỳ dữ liệu shadow, reconciliation Excel, security matrix, load burst, runbook/rollback | Thêm feature mới |
| **8** | P1 — External Portals | 4-6 | Worker PWA, vendor submission/confirm, CTV dashboard, GPS evidence theo metric | Native app/eKYC |
| **9** | P2 — Commission | 2-3 | Group policy, individual override, ledger/reversal, settlement report | Công thức percent phức tạp nếu chưa có nhu cầu |
| **10** | P3 — Gross Payroll Shell | 2-3 | PayRun/result/earning/deduction, manual statutory import, dry-run, snapshot | Engine TNCN/BHXH thật |
| **11** | FINAL — Statutory Engine | 3-5 | Config version, golden cases, parallel run, engine TNCN/BHXH, lock guard, payslip | Ghép với portal release |

**Quy tắc**: mỗi sprint chỉ "done" khi **migration chạy trên DB sạch + DB upgrade + integration test security xanh + audit có actor/reason + vertical slice vẫn chạy**.

**Buffer**: 12 tuần không buffer → MVP nội bộ an toàn là **13-15 tuần** (HOLISTIC_REVIEW §3.1 thừa nhận).

### C. Cắt theo Data Scope / Role (Visibility Matrix, V4 §9.7 + data-scope-security.md)

| Scope package | Role chính | Module wrap |
|---|---|---|
| `hrp-admin` (system scope) | ADMIN/DIRECTOR/HR_MANAGER | Toàn quyền nội bộ |
| `hrp-project` (project scope) | PM/SALE/ACCOUNTANT | RLS theo `project.id` |
| `hrp-vendor` (vendor scope) | VENDOR_ADMIN/VENDOR_STAFF | Chỉ `vendor.id = current.vendorId` |
| `hrp-ctv` (CTV scope) | CTV | SourceClaim/Commission của `ctv.id = current.ctvId` |
| `hrp-portal` (worker scope) | WORKER/PORTAL_VIEWER | `worker.id = current.id` |

→ **Khả thi** nếu `withDbContext` chuẩn ở S1, mỗi scope là 1 package con chia sẻ DB chung.

### D. Cắt theo Vertical Slice / User Flow (4 demo flow trong Mockup exec plan §1.1)

1. **Staffing Fill** (M3+M5) — Control Tower → Staffing → Talent Pool → Transfer. Dài nhất, đầy đủ SM.
2. **Attendance Lock** (M7) — Import → 7 exception taxonomy → Resolve → Lock.
3. **Dual Reconciliation** (M8+M4) — Cùng period, 2 statements, lineage drawer.
4. **Job Board Public** (M2) — Web công cộng, ISR, **không cần auth**.

→ Dùng làm **acceptance scenario** cho mỗi micro-phase.

### E. Cắt theo Mockup Screen ID (V4 mockup inventory §4.5)

22 frame + 12 state + 11 hotspot đã có trong `docs/tasks/hrp-v4-bod-mockup/mockup/`. Đây là **UI acceptance criteria**:

| Slice nghiệp vụ | Screen IDs | Module tương ứng |
|---|---|---|
| Operations Control Tower | S01 (5 state) + F50 + F60_D01-D04 | M3+M5+M7+M8 (read-aggregate) |
| Staffing/Talent | S02 (3 state) + S02A + S02B + F60_D03,D05 | M3+M5 |
| Attendance | S03 (4 state) + S03B + F60_D06,D07 | M7 |
| Reconciliation | S04 (5 state) + S04A + S04B + F60_D08 | M4+M8 |
| Job Board | S05 | M2+M3 |

---

## PHẦN IV — KHẢ THI TÁCH SUB-PACKAGE TRONG MONOREPO

> Em **KHÔNG** đề xuất microservice. HOLISTIC_REVIEW §8 + plan §1.3 đã chốt monolith Next.js. Lý do: 5 dev team, RLS đã giải quyết cross-tenant, Vercel Hobby + Neon Free chỉ chịu 1 monolith.

### 4.1. Ma trận khả thi

| Module | Tách ngay? | Phụ thuộc cứng | Rủi ro tích hợp | Khóa kỹ thuật |
|---|:-:|---|---|---|
| `@hrp/money` | ✅ | 0 | 0 | 0 |
| `@hrp/payroll-core` | ✅ | `money` | Không (đã pure) | Không |
| `@hrp/payroll-config` | ⚠️ | truyền `PrismaClient` qua DI | Idempotent effective-dated load | DI thay vì import global |
| `@hrp/job-board` | ✅ | `Project` + `StaffingOrder` (read-only) | ISR revalidate | SEO + caching |
| `@hrp/ticket-service` | ⚠️ | `withDbContext` (S1) + AuthContext thật | Hard-code role check cũ phải refactor | RLS + audit |
| `@hrp/auth` (AuthContext + permission + withDbContext) | ❌ trước S1 | Phase S1 — 2 tuần, 5 dev | **CẢN** mọi module khác — 13-role test phải xanh | **CRITICAL** |
| `@hrp/talent-pool` | ❌ | `@hrp/auth` + `@hrp/r2` | partial unique + temporal non-overlap | Q#22 |
| `@hrp/attendance-import` | ⚠️ | `@hrp/auth` + `@hrp/r2` | GPS evidence + accuracy gate | E2E tốn test data |
| `@hrp/statement` | ⚠️ | `@hrp/payroll-config` + `@hrp/auth` | Vendor/client lineage xuyên 2 statement | Vendor portal preview |
| `@hrp/payroll-engine` | ❌ FINAL | `@hrp/payroll-core` + config version | Golden case 5 loại NPT | Compliance |

### 4.2. Quy tắc tách bắt buộc (HOLISTIC_REVIEW §9.3)

> **Không import/export `PrismaClient` từ route hoặc domain**. Chỉ `src/lib/db.ts` được tạo PrismaClient. Code có user context đi qua `withDbContext`.

→ Mỗi package phải:

1. **Nhận `PrismaClient` qua DI** (constructor / factory) — không `new PrismaClient()`.
2. **Truy cập DB chỉ qua** `withDbContext({ user, scope }, async (tx) => …)` — không qua global client.
3. **Audit + idempotency nằm trong package**.
4. **Mỗi package có barrel `index.ts`** export rõ: types, service, repository.

### 4.3. Ranh giới trong `src/domains/` — template chuẩn

Hiện ranh giới chỉ áp dụng rời rạc (Ticket gộp service+DB+audit; Payroll có repo riêng). Cần chuẩn hóa:

```
packages/<module>/src/
├── schema.ts          # zod input/output
├── repository.ts      # Truy cập DB qua withDbContext
├── service.ts         # Business logic, transition, idempotency
├── permission.ts      # requirePermission(['CAN_XXX'])
└── index.ts
packages/<module>/test/
├── unit/              # service.test.ts (transition table)
├── integration/       # 13-role matrix
└── e2e/               # vertical slice theo mockup
```

### 4.4. Tách trước security foundation? — **KHÔNG**

`withAuthScope` chưa có thì refactor `ticket.service.ts` rời `src/domains/attendance/` sang `packages/ticket-service` sẽ **giữ lại role-check stub**. Phải chờ S1 (W2–W3).

→ Tách **3 package đầu tiên "rủi ro thấp, độc lập auth"**:

| # | Package | Lý do tách ngay | UI consumer |
|---:|---|---|---|
| 1 | `@hrp/money` | Đã có (`src/shared/utils/money.ts`), BigInt VND helper, 0 dep | Mọi nơi có tiền |
| 2 | `@hrp/payroll-core` | Đã có (`calculateVietnameseTaxes.ts`), pure, đã test, dùng cho commission + payslip + batch | M8 statement + payslip |
| 3 | `@hrp/job-board` | Mới, chỉ đọc `Project.isPublic`, ISR 300s, **không cần auth** | A-04 demo public sớm → nhận test data thật |

---

## PHẦN V — 3 PHƯƠNG ÁN ĐỀ XUẤT

### Phương án A: **Vertical-slice monorepo** (KHUYẾN NGHỊ) ⭐

**Nguyên tắc**:
1. Bám sát HOLISTIC_REVIEW §9.2 — security foundation CHẶN trước mọi domain.
2. Monolith Next.js, không microservice.
3. Tách 3 sub-package "rủi ro thấp" ngay: `money`, `payroll-core`, `job-board`.
4. Mỗi vertical slice đi kèm 4-role integration test tối thiểu (ADMIN/HR_STAFF/VENDOR/WORKER).
5. Migration theo lô — mỗi sprint ship migration của module đó.

**Cây package sau 6 tuần đầu**:

```
package.json  ->  "workspaces": ["packages/*"]
HrP/
├── packages/
│   ├── money/                     ← src/shared/utils/money.ts
│   ├── payroll-core/              ← src/domains/payroll/{calculateVietnameseTaxes, payrollConfigRepo}.ts
│   ├── auth/                      ← NEW: AuthContext, withDbContext, permission-resolver (S1)
│   └── job-board/                 ← NEW (chỉ phụ thuộc Project + StaffingOrder)
├── src/
│   ├── lib/db.ts                  ← singleton (NEW, S0)
│   ├── shared/...                 ← UI giữ nguyên
│   └── domains/
│       ├── ticket/                ← sau S1: refactor thành packages/ticket-service (W3)
│       ├── attendance/
│       └── ...
├── prisma/migrations/
│   ├── 20260815013341_init/
│   ├── 20260815084134_g22_security/
│   ├── <W1>_g0_baseline/          ← NEW: xóa patch, gộp migration
│   ├── <W2>_s1_rls_worker/        ← NEW
│   ├── <W2>_s1_rls_project/       ← NEW
│   └── <W2>_s1_permission_seed/   ← NEW
└── app/
    ├── api/
    │   ├── tickets/               ← giữ, route handler
    │   └── jobs/                  ← NEW cho A-04
    ├── (portal)/
    │   ├── layout.tsx             ← mount RoleGuardLayout
    │   ├── admin/
    │   ├── m/                     ← mobile worker
    │   └── vendor/
    ├── job-board/                 ← ISR public, không (portal)
    └── bcc/                       ← giữ
```

### Phương án B: Microservice (BỊ LOẠI)

| Tiêu chí | Đánh giá |
|---|---|
| 5 dev team | ❌ Tối thiểu 2-3 người/SLO/ops riêng mỗi service |
| Cross-transaction consistency | ❌ Phải chấp nhận eventual → trái "một nguồn sự thật" |
| Postgres RLS | ✅ đã giải quyết multi-tenant |
| Vercel + Neon Free | ❌ Không thể share resource như monolith |
| Time to MVP | ❌ +2-3 sprint cho CI/CD + contract test + monitoring |
| Kết luận | **LOẠI** — HOLISTIC_REVIEW §8 đã chốt |

### Phương án C: Feature flag từng micro-phase

Áp dụng song song với A cho phần cần (vd: `STATUTORY_ENGINE_MODE`, `PAYROLL_GROUP_ENABLED`, `FEATURE_TIMESHEET_AUTOIMPORT`).

**Trade-off**:
- ✅ Cho phép demo sớm từng phần.
- ✅ Giảm blast radius khi off-by-default.
- ❌ Thêm 1 lớp config — tăng complexity sớm, không phù hợp 5-dev team đang chạy nước rút.
- ❌ Feature flag không giải quyết được vấn đề **dependency** giữa module.

→ Em khuyến nghị **A làm backbone, C kết hợp có chọn lọc** (không over-engineer).

---

## PHẦN VI — ĐỐI CHIẾU MOCKUP ↔ MODULE ↔ PACKAGE

22 frame HTML mockup đã có trong `docs/tasks/hrp-v4-bod-mockup/mockup/`. Đối chiếu xem UI nào cần package nào.

| Screen ID | Title | Module | Cần package nào để render | Sprint phụ thuộc |
|---|---|---|---|---|
| `F00_Cover` | Cover | — | tokens | S1 (typography) |
| `F01_Tokens` | Design tokens | — | tokens | S1 |
| `F02_ComponentSet` | 17 component | shared | tokens + UI lib | S1 |
| `S01_ControlTower_Default_1440` | KPI band + queue + project table | M3+M5+M7+M8 | ui/data-table + ui/entity-card | S2-S6 |
| `S01_ControlTower_Loading` | Loading state | — | ui/sheet skeleton | S1 (scaffold) |
| `S01_ControlTower_EmptyQueue` | Empty state | — | ui/empty | S1 |
| `S01_ControlTower_StaleBanner` | Stale data banner | — | ui/banner | S1 |
| `S02_Staffing_Default_1440` | 12 WorkerCard | M3+M5 | ui/entity-card + ui/data-table | S2 (Worker CRUD) |
| `S02_Staffing_NoResult` | NoResult state | — | ui/empty | S2 |
| `S02_CardBlocked` | Card blocked | M5 | ui/entity-card + status language | S3 |
| `S02A_AssignmentConflict_Drawer` | 1-ACTIVE drawer | M3+M5 | ui/sheet + withAuthScope | S3 |
| `S02A_TransferPreview` | Transfer preview | M3 | ui/sheet | S3 |
| `S02B_ReferralGuard_Drawer_Protected` | Referral Guard 7d | M5 | ui/sheet + SourceClaim timeline | S3 |
| `S02B_ReferralGuard_OverrideRequested` | Override form | M5 | permission + audit | S3 + P1 |
| `S02B_ReferralGuard_Expired` | Expired | — | ui/sheet | S3 |
| `S03_Attendance_Exceptions` | 7 exceptions | M7 | ui/data-table + S03 mapping | S4-S5 |
| `S03_ResolveDrawer` | Map AP-QM-1048 → Mai | M7 | ui/sheet + mapping service | S4-S5 |
| `S03_Attendance_Resolved` | Maker-checker | M7 | ui/data-table | S5 |
| `S03_Attendance_Locked_ReadOnly` | Bất biến + adjustment | M7 | ui/data-table + adjustment path | S5 |
| `S03B_LockConfirmation` | Khóa kỳ dialog | M7 | ui/sheet + permission | S5 |
| `S03_ImportProgress` | Import progress | M7 | ui/progress | S4 |
| `S03_ImportFailed` | DLQ | M7 | ui/banner + DLQ component | S4 |
| `S04_Reconciliation_Internal` | Vendor payable / Client receivable | M4+M8 | ui/data-table + S04 split | S6 |
| `S04A_Lineage_Drawer` | Lineage chain | M4+M8 | ui/sheet | S6 |
| `S04B_VendorPreview_Sent` | Vendor portal | M4 | ui/data-table + field masking | S6 + P1 |
| `S04B_VendorPreview_DisputeForm` | Dispute form | M4 | ui/form + audit | S6 + P1 |
| `S04_VendorDisputed` | Vendor disputed | M4 | ui/data-table | S6 |
| `S04_ConfirmedLocked` | Confirmed locked | M4 | ui/data-table | S6 |
| `S04_RevisionV2` | Revision V2 | M4 | ui/data-table + adjustment | S6 |
| `S04_EmptyPayment` | Empty payment | — | ui/empty | S6 |
| `S04_MarginComparison` | 3 projects margin | M4+M8 | ui/data-table | S6 |
| `S05_JobBoard_Public_1440` | Public job board | M2 | ui/data-table + ISR | **A-04 (ngay từ S1)** |

---

## PHẦN VII — LỘ TRÌNH 6 TUẦN ĐẦU (G0 + S1 + slice đầu của S2–S5)

### W1 — G0 Baseline Gate

| Task | Owner | Output |
|---|---|---|
| Xóa `schema-v3.1-*.prisma` → `_archive/` | AI coding | Folder `prisma/_archive/` |
| Tạo `src/lib/db.ts` (singleton Prisma) | AI coding | Mọi route handler dùng từ đây |
| Audit 38 model xem có khớp 2 migration đã apply | AI coding | Doc `MIGRATION_GAP.md` (nếu thiếu) |
| Refactor `app/api/tickets/route.ts` qua `getPrisma()` | AI coding | PASS |
| Tách `@hrp/money` + `@hrp/payroll-core` sang `packages/` | AI coding | Test pass |
| Tạo `@hrp/job-board` (read-only ISR) | AI coding | Route `app/job-board/page.tsx` |
| 20 scenario test fixtures thật từ `data-scope-security.md` | AI coding | `prisma/seed.ts` |
| **Demo A-04** lên Vercel | AI coding + Sếp | Link public |

### W2 — S1-Auth (Permission Pool v2 + L1)

| Task | Owner | Output |
|---|---|---|
| `src/shared/auth/permission-catalog.ts` | AI coding | 7+ permission codes |
| `src/shared/auth/permission-resolver.ts` (ADMIN short-circuit, DENY precedence) | AI coding | Resolve function |
| `src/shared/auth/require-permission.ts` | AI coding | Helper |
| `src/shared/auth/auth-context.ts` (JWT verify) | AI coding | AuthContext type |
| `src/shared/auth/with-auth-scope.ts` (L1 deny-by-default) | AI coding | Extension |
| `prisma/seed.ts` permission seed | AI coding | Idempotent `upsert` |

### W3 — S1-Outbox + RLS (L2)

| Task | Owner | Output |
|---|---|---|
| `src/shared/auth/with-db-context.ts` (tx + GUC) | AI coding | Transaction wrapper |
| `src/shared/auth/rls-context.ts` (set `app.current_*` GUC) | AI coding | |
| `src/shared/auth/scopes/{worker,project}.scope.ts` | AI coding | RLS predicates |
| Migration `<W3>_s1_rls_worker/` + `…_project/` | AI coding | DDL RLS + DB roles |
| `Outbox` pattern + `AuditLog` minimal | AI coding | `prisma/migrations/<W3>_s1_outbox/` |
| 13-role integration test cho Worker + Project | AI coding | PASS cho 4 matrix tối thiểu |
| **Refactor** `ticket.service.ts` rời `src/domains/attendance/` → `packages/ticket-service` | AI coding | Test cũ vẫn pass |

### W4 — S2 slice 1: CRM/Staffing Backbone

| Task | Owner | Output |
|---|---|---|
| `ClientCompany` CRUD service | AI coding | route + page |
| `Project` + `StaffingOrder/Slot` | AI coding | route + page |
| `Worker` CRUD với field masking (CCCD/bank) | AI coding | route + page + auth |
| `CandidateSubmission` + `SourceClaim` | AI coding | partial unique + temporal |
| `S02_Staffing_Default_1440.html` → live từ API | AI coding | E2E first slice |

### W5 — S3 slice 1: Assignment + Transfer

| Task | Owner | Output |
|---|---|---|
| `ProjectAssignment` state machine (PLANNED/ACTIVE/PAUSED/TRANSFERRED/CLOSED) | AI coding | transition test |
| Activate/pause/resume/transfer command | AI coding | 1 ACTIVE enforced |
| Bulk command từng worker transaction | AI coding | test 13-role |
| `S02A_AssignmentConflict_Drawer` + `S02A_TransferPreview` live | AI coding | E2E |

### W6 — S4 + S5: Import + Timesheet Lock

| Task | Owner | Output |
|---|---|---|
| `AttendanceImportBatch/Row` CRUD + idempotency | AI coding | migration W6 |
| `R2` presigned upload (mock S3 nếu chưa có cred) | AI coding | API + UI |
| 1 file thật từ `appBCC/` parse → AttendanceEvent | AI coding | mapping |
| `TimesheetPeriod/Line/Adjustment` + 4-state | AI coding | transition test |
| `S03_Attendance_Exceptions.html` + `S03B_LockConfirmation` live | AI coding | E2E cuối W6 |

### W7+ (tiếp theo, đã ngoài phạm vi 6 tuần)

- **S6**: `RateCard` effective-dated + VendorStatement/ClientStatement + dispute workflow.
- **UAT**: 2 kỳ shadow reconciliation.
- **P1**: Worker PWA + Vendor Portal.
- **P2–P3 + FINAL**: Commission ledger + Gross payroll shell + Statutory engine.

---

## PHẦN VIII — RỦI RO & CÂU HỎI CÒN MỞ

### 8.1. Risks (rút từ §17 V4 + HOLISTIC_REVIEW §6)

| ID | Risk | Mức | Ảnh hưởng tách module |
|---|---|:-:|---|
| R-04 | Auth thật chưa xong → mọi module phải stub | HIGH | **CHẶN** — không thể viết attendance-import trước |
| R-13 | RLS chưa apply trong migration → PII có thể leak | HIGH | Dẹp trong W3 |
| R-15 | Permission seed idempotent không cẩn thận → mất grant | MED | W2 |
| R-19 | PrismaClient per route → socket leak | MED | W1 (`src/lib/db.ts`) |
| R-21 | Python ETL `delete-then-insert` concurrency clash | MED | Tách quy trình, dùng UPSERT trên version |
| R-26 | Mockup screen dùng data minh họa (`An Phát, Yên Phong`) → sếp D12 brand ẩn danh | LOW | Áp dụng đầu |
| R-31 | SourceClaim effective-dated + assignment — sai temporal có thể tính commission sai tiền | HIGH | S3 tỉ mỉ |
| R-39 | Schedule test 5.000 check-in/burst 100 transfer/20 statement song song | HIGH | UAT W7 |

### 8.2. Câu hỏi `[CẦN CHỐT]` (V4 §21 + HOLISTIC_REVIEW §5) ảnh hưởng tách module

| Câu hỏi | Ảnh hưởng | Deadline |
|---|---|---|
| Q#09 `payrollGroupKey` non-null — chốt danh sách nhóm? | E8 (PayRun/Statement) tách thế nào | Trước W11 (S6) |
| Q#14 Tách Vendor pay / Client bill — chốt rate? | E6 (Statement) UI + vendor preview | Trước W11 |
| Q#19 Zalo flag — Phase nào bật? | E2 (Worker Portal) — P1 | Sau MVP |
| D01–D08 (DECISION_LOG) | 8 quyết định mockup, **chờ BoD chốt** | Trước W4 (S2) |
| D09–D12 | Deferred | Sau BoD |
| Statutory engine MOCK vs MANUAL vs ENGINE | E8 cuối FINAL | W10–W14 (P3) |

### 8.3. Câu hỏi SẾP cần trả lời trước khi triển khai

| # | Câu hỏi | Tại sao quan trọng |
|---:|---|---|
| 1 | Có chấp nhận 13–15 tuần MVP nội bộ (thay vì 12 tuần)? | HOLISTIC_REVIEW §3.1 khuyến nghị |
| 2 | Xóa 2 file `schema-*.prisma` patch (chuyển `_archive/`)? | G0 cleanup |
| 3 | `STATUTORY_ENGINE = MOCKED` trong W10–W11 (P3), chỉ ENGINE thật ở FINAL phase? | HOLISTIC_REVIEW §3.2 đề xuất |
| 4 | Tách `@hrp/job-board` **trước** auth (A-04 demo sớm)? | Nhận test data thật → verify Q#23 |
| 5 | `appBCC/` giữ chạy ngoài monorepo hay tích hợp vào web (UI mount ETH)? | Concurrency safety |
| 6 | Có muốn giữ delivery theo mockup sequence (Control Tower → Staffing → Attendance → Reconciliation) **theo thứ tự 4 màn chính**? | Ưu tiên ship |
| 7 | Rate review cho Chuyên viên Lê Thu Hà (maker) và Nguyễn Thanh Huyền (checker) trong S3/S5 — chốt danh sách trước W4? | Maker-checker mapping |
| 8 | Package version policy: `0.1.0` cho mỗi sub-package, sync version với `package.json` root? | Quyết định release |

---

## PHẦN IX — MA TRẬN QUYẾT ĐỊNH

| Quyết định | Option A (Recommended) | Option B | Tác động |
|---|---|---|---|
| Chiến lược tách | Vertical-slice monorepo với 3 sub-package (money + payroll-core + job-board) → tiếp tục từng package theo micro-phase | Microservice | **LOẠI B** — HOLISTIC_REVIEW §8 |
| Tách `@hrp/job-board` | Trước auth (sau W1) | Sau khi có auth | A: nhận test data sớm hơn 3 tuần |
| `STATUTORY_ENGINE` ở W10–W11 | `MOCKED` + provenance | `ENGINE` thật | A: chạy với data thật |
| Migration folder | Per-module (`<W>_feature_name`) | 1 migration khổng lồ | A: dễ rollback, audit |
| Permission seed | Idempotent `upsert`, không reset manual grant | `delete-all + insert` | A: an toàn |
| Phạm vi MVP đầu tiên | M3+M5+M7+M8 demo flow + Job Board public (Q#23) | M1+M2 (no mockup) | A: giữ mockup sequence |
| UI lib consumer | Shared lib trước, mount sau S1 | Mount ngay từng phần | A: tránh refactor sớm |
| `appBCC/` | Song song độc lập, dùng UPSERT versioned | Tích hợp vào web | A: ít công sức W1 |

---

## PHẦN X — ĐỀ XUẤT COMMIT THỨ TỰ

Commit gọn, mỗi commit ≤ 1 concern, dễ cherry-pick/revert:

| # | Commit | PR-style title |
|---:|---|---|
| 1 | `chore(archive): schema-v3.1-patches và schema-m7-tickets vào _archive/` | G0 |
| 2 | `chore(db): src/lib/db.ts singleton + refactor ticket routes` | G0 |
| 3 | `feat(pkgs): tách @hrp/money từ shared/utils/money` | G0 |
| 4 | `feat(pkgs): tách @hrp/payroll-core từ domains/payroll` | G0 |
| 5 | `feat(job-board): API + ISR page (A-04, no auth)` | G0 |
| 6 | `feat(auth): permission-catalog + resolver` | S1-Auth |
| 7 | `feat(auth): auth-context + JWT verify` | S1-Auth |
| 8 | `feat(auth): with-auth-scope (L1 deny-by-default)` | S1-Auth |
| 9 | `feat(auth): with-db-context + rls-context` | S1-RLS |
| 10 | `feat(auth): migration RLS Worker + Project` | S1-RLS |
| 11 | `feat(outbox): Outbox + AuditLog minimal + idempotency_keys table` | S1-Outbox |
| 12 | `refactor(ticket): move src/domains/attendance → packages/ticket-service` | S1-Refactor |
| 13 | `test(auth): 13-role matrix cho Worker + Project + Ticket` | S1-Test |
| 14 | `feat(crm): ClientCompany + Project + StaffingOrder skeleton` | S2 slice 1 |
| 15 | `feat(worker): Worker CRUD với field masking CCCD/bank` | S2 slice 1 |
| 16 | `feat(assign): ProjectAssignment state machine 1-ACTIVE enforced` | S3 slice 1 |
| 17 | `feat(attendance): AttendanceImportBatch API + idempotency + R2 stub` | S4 slice 1 |
| 18 | `feat(timesheet): Period/Line/Adjustment 4-state` | S5 slice 1 |
| 19 | `chore(seed): 20 scenario fixtures thật + maker/checker mapping` | UAT prep |
| 20 | `feat(ui): mount (portal) route group + RoleGuardLayout` | S2–S3 UI scaffold |

---

## PHẦN XI — KIẾN NGHỊ CUỐI

| # | Hành động | Owner | Hạn |
|---:|---|---|---|
| 1 | Duyệt Phương án A (vertical-slice monorepo + 3 sub-package đầu) | Sếp | Cuối tuần này |
| 2 | Bắt đầu G0 ngay: xóa 2 patch → `_archive/`, singleton Prisma, gộp migration | AI coding | W1 |
| 3 | Tách `@hrp/money` + `@hrp/payroll-core` + `@hrp/job-board` ngay đầu W1 | AI coding | W1 |
| 4 | Sau khi `withDbContext` xanh W3 → refactor `ticket.service.ts` → `packages/ticket-service` | AI coding | W2–W3 |
| 5 | Trả lời Q#09 + Q#14 (payroll group + vendor/client rate) trước W11 | Sếp | W11 |
| 6 | Chốt D01–D08 trong buổi BoD trước W4 | Sếp | Trước W4 (S2) |
| 7 | Không microservice; không tách trước 2027-Q4 | Sếp | Hard rule |
| 8 | Theo dõi burndown 13–15 tuần MVP; report weekly | PM | Mỗi thứ 2 |
| 9 | UAT 2 kỳ shadow với data thật trước Go-live | PM + Sếp | Tuần 14–15 |
| 10 | Lập risk register update mỗi sprint (R-04, R-13, R-31, R-39 làm headline) | PM | Mỗi sprint |

---

## PHỤ LỤC — TỪ KHÓA TRA CỨU

```
Plan canonical:           docs/UNIFIED_PLAN_v4.md (v4.20)
Holistic review:          docs/HRP_V4_HOLISTIC_REVIEW.md
Mockup exec:              docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md
Data scope + RBAC:        docs/data-scope-security.md
Task tracker:             docs/tasks/hrp-v4-bod-mockup/TASK.md
Handoff round 3:          docs/tasks/hrp-v4-bod-mockup/HANDOFF.md
Audit rounds 1+2:         docs/tasks/hrp-v4-bod-mockup/AUDIT.md
Decision log D01-D12:     docs/tasks/hrp-v4-bod-mockup/DECISION_LOG.md
Phân tích v1 (rút gọn):  docs/MODULE_TACH_V1.md
Phân tích v2 (file này):  docs/MODULE_TACH_V2.md

Source code liên quan:
  src/lib/db.ts                       (CHƯA CÓ — cần tạo W1)
  src/shared/auth/                    (CHƯA CÓ — cần tạo S1)
  src/domains/attendance/             (Ticket + Stub session — giữ cho tới S1)
  src/domains/payroll/                (Pure calc + Repo — tách W1)
  src/shared/utils/                   (money + cn — money tách W1)
  prisma/schema.prisma                (canonical 1051 dòng)
  prisma/migrations/                  (2 folder — cần consolidation W1)
  app/api/tickets/                    (6 route — refactor qua getPrisma() W1)
  app/bcc/                            (Portal — giữ, thêm auth/rate-limit)
  appBCC/                             (Python ETL — song song, dùng UPSERT versioned)
```

---

> **Nguyên tắc** của file này: **KHÔNG** viết kiến trúc mới, **CHỈ** tổng hợp từ tài liệu đã có + đối chiếu với code thật. Mọi khuyến nghị có trích dẫn §X.Y của plan/review tương ứng.
