# TASK — `hrp-v6-admin-truth-defects`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-admin-truth-defects` |
| Work type | `CODE` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Audit reason | AD2 sửa filter API đọc `workers` (bảng FORCE RLS) + projection; AD3 join `users`/`workers` trong read service có RLS — Tier 3 kiểm tra không mở rộng data scope, không lộ PII, nhãn "Không có quyền xem" đúng chỗ. AD1/AD4/AD5 là UI reversible đi kèm trong cùng diff nên chịu LIGHT chung |
| Spec version | `v1.0` |
| Status | `READY_FOR_AUDIT_ROUND_1` |
| Planner | `Tier 1` (stream T1-UI, lệnh T0 ngày 15/09) |
| Baseline | `68e184e` (origin/main, verify tại worktree `tier1/admin-truth-defects`, `git status` sạch) |
| In-scope roots | `app/admin/workers/page.tsx`; `app/api/workers/route.ts`; `app/admin/commission/ledger/page.tsx`; `app/api/admin/commission-ledger/route.ts`; `src/domains/commission/ledger.service.ts`; `app/admin/jobs/page.tsx`; `app/admin/page.tsx`; `src/shared/ui/role-guard/role-guard-layout.tsx`; `docs/tasks/hrp-v6-admin-truth-defects/**` |
| Forbidden paths | `prisma/**` (schema + migrations); `src/domains/talent/**`; `src/domains/staffing/**`; `app/(jobs)/**`; `docs/PLANNER_HANDOVER.md`; `package.json`; `.gitignore` |
| Required gates | `npx tsc --noEmit`; `npm run test:unit` (in-scope + carry-forward `design-tokens.static.test.ts`); `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-admin-truth-defects/TASK.md` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/audit` Tier 3 LIGHT ROUND 1 (chỉ AD2/AD3) → `/resolve` |

> Lane STANDARD + audit phân vùng: AD2/AD3 LIGHT vì đụng read scope bảng FORCE RLS; AD1/AD4/AD5 NONE vì UI reversible. Lệnh T0 ngày 15/09 cho phép cấu trúc này.

## 1. Outcome

### 1.1 User-visible outcome

- 5 trang tồn tại nhưng chưa vào được (`users`, `vendors`, `commission/policies`, `commission/ledger`, `jobs/job-postings`) xuất hiện trong nav Admin theo nhóm quy trình.
- Trang Nhân sự hiển thị và lọc đúng 3 state machine thật của `Worker`; không còn badge rỗng, không còn filter hỏng.
- Sổ cái hoa hồng hiển thị **tên người** (CTV/Worker) thay vì 8 ký tự cuối ID; chỗ bị RLS che ghi rõ nhãn chữ.
- Trang "Tin tuyển dụng" nói đúng bản chất dữ liệu; Submissions/Claims tách khỏi tab Jobs.
- Trang `/admin` nhóm card theo quy trình vận hành thay vì danh sách module phẳng.

### 1.2 Non-goals

- Không migration, không schema, không FK mới (FK cho `CommissionLedger` thuộc N2).
- Không dựng beneficiary/handling giả — chỗ chưa có dữ liệu ghi "Chưa có dữ liệu".
- Không mở W2/W3/W4 trong cùng diff. Không denormalize tên hiển thị vào DB.
- Không sửa `src/domains/talent/**` (stream S1 sở hữu), không sửa `docs/PLANNER_HANDOVER.md` (S1 single-writer).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/shared/ui/role-guard/role-guard-layout.tsx:110-124` — `ADMIN_NAV_PHASE4` 13 mục phẳng, thiếu 5 trang | AD1: đích cần thêm |
| `EV-02` | `app/admin/workers/page.tsx:6,24-31,205,244` — type `WorkerStatus` tự khai 4 giá trị + badge; API trả 3 state machine riêng | AD2: UI đọc field không tồn tại |
| `EV-03` | `app/api/workers/route.ts:44,48` — `where.status = status`; `src/shared/auth/worker-projection.ts:98-123` trả `profileStatus/employmentStatus/riskStatus`, không có `status` | AD2: filter hỏng + projection thiếu |
| `EV-04` | `app/api/workers/route.ts:116` — POST body chỉ nhận `userId/fullName/phone/cccdNumber/dateOfBirth/gender`, không nhận `status` | AD2: UI gửi `status` nhưng API bỏ qua — bằng chứng field là giả |
| `EV-05` | `prisma/schema.prisma:257-259` — 3 state machine canonical | AD2: nguồn thật để render/filter |
| `EV-06` | `app/admin/commission/ledger/page.tsx:177,180` — `r.ctvId.slice(-8)`, `r.workerId.slice(-8)` | AD3: đích cần thay bằng tên |
| `EV-07` | `src/domains/commission/ledger.service.ts:545-570` (`listLedger`), `:593-613` (`ledgerToDTO`) — trả ID thô, không enrich | AD3: điểm join tay |
| `EV-08` | `prisma/schema.prisma:1240-1260` — `ctvId/workerId/assignmentId` là `String` trần, không `@relation` | AD3: vì sao phải join tay, không dùng include |
| `EV-09` | `users` không FORCE RLS (grep migration = 0 hit); `workers` FORCE RLS (`20260816210000_s1_rls_worker:77` + restore matrix); `User.name` tại `schema.prisma:142-143` | AD3: join CTV tin cậy được; join Worker phải xử lý che + nhãn |
| `EV-10` | `app/admin/jobs/page.tsx:17,116,145,223,235,325` — 3 tab + fetch `/api/projects?take=50` cho tab jobs | AD4: đích cần sửa |
| `EV-11` | `app/admin/page.tsx:39-76` — `SECTION_CARDS` phẳng theo module | AD5: đích cần nhóm lại |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | AD1: đưa cả 5 trang vào nav, nhóm theo quy trình (Nhu cầu & Tuyển / Con người / Tài chính / Hệ thống), không nối dài danh sách phẳng (D-4) | `CHOSEN` |
| `DEC-02` | AD2: bỏ type `WorkerStatus` tự khai; render/filter theo `employmentStatus` (+ `profileStatus`, `riskStatus` ở detail nếu có); nhãn tiếng Việt bằng chữ | `CHOSEN` |
| `DEC-03` | AD3: join tay ở read service trong `withDbContext` (D-3a); CTV qua `User.name`; Worker bị RLS che → nhãn "Không có quyền xem", cấm fallback `slice(-8)`; cấm denormalize vào DB; FK để N2 (D-3b) | `CHOSEN` |
| `DEC-04` | AD4: trang jobs nói đúng bản chất (Project/danh sách nhu cầu) + tách Submissions/Claims ra khỏi tab Jobs | `CHOSEN` |
| `DEC-05` | AD5: nhóm `SECTION_CARDS` theo quy trình vận hành | `CHOSEN` |
| `DEC-06` | Thứ tự land: AD3 trước hoặc cùng AD1 (AD1 phơi trang commission ra nav) | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` (AD1) | 5 trang `users`, `vendors`, `commission/policies`, `commission/ledger`, `jobs/job-postings` vào được từ nav Admin theo nhóm quy trình; role matrix mỗi item giữ nguyên tắc least-privilege hiện hữu của file nav |
| `RQ-02` (AD2) | Trang `/admin/workers` hiển thị trạng thái từ `employmentStatus` thật (`NONE/ACTIVE/SUSPENDED/TERMINATED` + nhãn Việt); filter `status` trên API map sang `employmentStatus`; không còn đọc/ghi field `status` không tồn tại ở cả UI lẫn API |
| `RQ-03` (AD3) | Sổ ledger hiển thị tên CTV (`User.name` theo `ctvId`) và tên Worker (`Worker.fullName` theo `workerId`); Worker bị RLS che → ô hiển thị đúng chuỗi "Không có quyền xem"; không còn `slice(-8)` ở UI |
| `RQ-04` (AD4) | Trang `/admin/jobs` không còn tự nhận là "Tin tuyển dụng" trong khi đọc từ Project; Submissions/Claims không còn là tab con của Jobs |
| `RQ-05` (AD5) | `SECTION_CARDS` ở `/admin` được nhóm theo quy trình (Nhu cầu → Tuyển → Người → Bố trí → Tiền), giữ nguyên href/description hiện hữu |

### 4.2 Scope boundaries

- **In:** 9 rễ in-scope ở §0 + test cùng surface; docs task riêng.
- **Out:** schema/migration/FK; `src/domains/talent/**`; `src/domains/staffing/**`; `app/(jobs)/**`; W2/W3/W4; beneficiary/handling UI; `docs/PLANNER_HANDOVER.md`; `docs/V6/V6_OUTSTANDING_WORK_PLAN.md` (Tier 1-A được sửa file plan này nhưng làm ở worktree chính, không trong TASK diff).
- **Allowed task artifacts:** `docs/tasks/hrp-v6-admin-truth-defects/**`

### 4.3 Domain boundaries

- **Data/state:** Không migration. Không denormalize tên hiển thị vào `CommissionLedger`. Không thêm scalar shortcut (`isWorking`, `availability`, `currentCompanyId`, `handlerId`, `ownerId`, `poolStatus`). Chỗ chưa có dữ liệu (beneficiary/handling) ghi "Chưa có dữ liệu", không suy diễn từ `ownerId`/`assignedToId`.
- **Permission/security:** Mọi query join nằm trong `withDbContext` đã có (GUC transaction-local). Không mở rộng role matrix. Không lộ PII mới: chỉ `User.name`/`Worker.fullName` đã được phép thấy qua scope hiện hữu. Không log PII. Mọi secret/PII trong artifact chỉ ghi `[REDACTED]`.
- **Interface/API:** GET `/api/workers` đổi param `status`→ map `employmentStatus` (giữ backward-compat: nhận cả `employmentStatus` mới); DTO ledger thêm `ctvName: string | null`, `workerName: string | null` (giữ `ctvId/workerId` cũ). Không đổi contract write.
- **Migration/rollback:** N/A — không migration. Rollback = revert commit branch.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/shared/ui/role-guard/role-guard-layout.tsx` (AD1) | Thêm 5 trang vào nav theo nhóm quy trình, role matrix least-privilege | `DONE` - Render nav đủ item theo role | Role nào chưa rõ -> hỏi T0, không tự đoán mở rộng quyền |
| `STEP-02` | `src/domains/commission/ledger.service.ts` + `app/api/admin/commission-ledger/route.ts` (AD3, service trước) | `listLedger` enrich `ctvName`/`workerName` trong cùng `withDbContext`; Worker bị che -> `null` + UI render nhãn | `DONE` - Unit test service (mock tx): name đúng, che đúng, orphan ID đúng | Join vượt scope -> dừng, báo T0 |
| `STEP-03` | `app/admin/commission/ledger/page.tsx` (AD3, UI sau) | Hiện tên thay `slice(-8)`; nhãn "Không có quyền xem" khi `null`; filter CTV giữ nguyên | `DONE` - Manual + test nếu có | Xong STEP-02 mới làm STEP-03 |
| `STEP-04` | `app/api/workers/route.ts` + `app/admin/workers/page.tsx` (AD2) | API map `status` -> `employmentStatus`; UI bỏ type giả, badge/filter theo giá trị thật | `DONE` - Unit/route test filter + projection | Phát hiện consumer khác dùng `status` giả -> dừng, báo T0 |
| `STEP-05` | `app/admin/jobs/page.tsx` (AD4) + `app/admin/page.tsx` (AD5) | Nhãn đúng bản chất + tách tab; nhóm card theo quy trình | `DONE` - Manual review | Tranh cãi nhãn nghiệp vụ -> hỏi T0 |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Đủ 5 trang vào được từ nav theo role; không còn trang mồ côi | Manual click theo từng role + `tsc --noEmit` exit 0 |
| `AC-02` | `/admin/workers` không còn chuỗi `WorkerStatus` giả, không còn `where.status`/`body.status`; filter trả đúng theo `employmentStatus` | `grep -rn "where\.status\|body\.status\|type WorkerStatus" app/admin/workers app/api/workers` = 0 hit + route test PASS |
| `AC-03` | Ledger hiện tên CTV/Worker; row bị RLS che hiện đúng "Không có quyền xem"; `slice(-8)` còn 0 hit trong trang ledger | `grep -rn "slice(-8)" app/admin/commission/ledger` = 0 hit + service unit test PASS |
| `AC-04` | Trang jobs không còn tab Submissions/Claims con; nhãn đúng nguồn dữ liệu | Manual review |
| `AC-05` | `/admin` nhóm card theo quy trình, giữ nguyên href | Manual review |
| `AC-06` | Không regression: `npm run test:unit` in-scope PASS + `design-tokens.static.test.ts` carry-forward PASS | Command + exit 0 |
| `AC-07` | Diff chỉ chạm rễ in-scope §0; không file forbidden | `git status --porcelain` + `git diff HEAD --stat` review |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-07` |
| `RQ-02` | `STEP-04` | `AC-02`, `AC-06`, `AC-07` |
| `RQ-03` | `STEP-02`, `STEP-03` | `AC-03`, `AC-06`, `AC-07` |
| `RQ-04` | `STEP-05` | `AC-04` |
| `RQ-05` | `STEP-05` | `AC-05` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Join `Worker.fullName` bị RLS che trả rỗng hàng loạt → UI toàn "Không có quyền xem" | Đúng thiết kế (trung thực hơn ID giả); rollback = revert commit |
| `RISK-02` | Đổi filter `status`→`employmentStatus` làm hỏng consumer khác đang dùng param `status` | Giữ backward-compat nhận cả hai param; grep consumer trước khi đổi |
| `RISK-03` | Thêm nav item lộ trang cho role chưa được phép | Role matrix theo least-privilege hiện hữu; Tier 3 LIGHT kiểm tra AD1 trong phạm vi audit |
| `RISK-04` | Orphan `ctvId`/`workerId` (không FK) join ra `null` | Render "Chưa có dữ liệu", không crash; FK + audit mồ côi thuộc N2 |

## 8. Open Questions

| ID | Question | Blocks | Status |
|---|---|---|---|
| `OQ-01` | Không có. Lệnh T0 ngày 15/09 đã trả lời trước toàn bộ: D-3a (join tay ở read service), D-3b (FK để N2), nhãn chữ "Không có quyền xem" khi Worker bị FORCE RLS che, cấm `slice(-8)`, cấm denormalize, D-4 (nav nhóm theo quy trình), AD3 land trước/cùng AD1 | - | `CLOSED` |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Sửa GET /api/workers và test theo T0 review; update ledger UI | Accept precedence `employmentStatus` qua `status`, whitelist 4 enum, 400 invalid, không gọi Prisma khi invalid. Ledger UI thay '-' bằng 'Chưa có dữ liệu'. |

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-15 | Tier 1 (T1-UI) | Tạo TASK từ lệnh T0, baseline `68e184e` | Mở W1 song song S1 |
| `v1.1` | 2026-09-15 | Tier 1 (T1-UI) | Cập nhật ROUND 1: GET /api/workers 400; ledger UI `Chưa có dữ liệu` | Lệnh T0 REVISION REQUIRED |
