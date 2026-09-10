# CHIA PHASE KHOA HỌC — HRP V4

> Ngày viết: **16/08/2026** · v1
>
> Phương pháp: **chia theo invariant kiến trúc** (lớp nền tảng phải chắc trước khi lớp trên cùng dùng).
>
> Căn cứ: `docs/MODULE_TACH_V2.md` §5–§7 (sau khi đã tổng hợp từ source plan + AC thật), `docs/HRP_V4_HOLISTIC_REVIEW.md` §9.1–9.2 (Q#22 đã chốt), `docs/UNIFIED_PLAN_v4.md` §6.6 (DoD 10 tiêu chí), `docs/data-scope-security.md`.

---

## 1. Tại sao KHÔNG chia theo feature?

Cách chia theo feature (M0→M9, Epic E0→E11) dễ "đẹp" trên slide nhưng có 3 vấn đề thực tế:

1. **Ảo tưởng tiến độ**: viết xong M2 (Job Board) ≠ ship được Job Board — vì thiếu auth, RLS, audit.
2. **Security debt tích lũy**: mỗi module feature phải tự phát minh lại role check; đến khi `withDbContext` xong thì phải refactor toàn bộ.
3. **Test scenario thật bị trì hoãn**: cần AuthContext + RLS + idempotency mới test 13-role matrix → test chỉ chạy khi đã sắp xong code.

→ Đó là lý do `HOLISTIC_REVIEW §9.2` (Founder chốt) DỒN 8 bước security lên trước mọi domain code.

---

## 2. Nguyên tắc "khoa học" để chia phase

Một phase khoa học khi và chỉ khi:

1. **Invariant trước — domain sau**: layer dưới có invariant "không ai phá được" rồi layer trên mới dựa.
2. **Mỗi phase đóng băng 1 tập contract**: phase sau KHÔNG được phép phá contract phase trước; nếu phá → phải làm lại từ đầu phase sau.
3. **Mỗi phase có 1 DoD rõ ràng**: có thể verify bằng command/curl, không phải "cảm tính".
4. **Mỗi phase có 1 demo scenario thật** (acceptance end-to-end), không phải "đã code, chưa test".
5. **Phase cuối phải chạy được với 0 modification** trên phase trước — nếu không, phase trước chưa đóng.

---

## 3. Đề xuất: 6 phase chính + 3 phase mở rộng

```
Phase 0  Foundation          (DB schema + migration + Prisma singleton)
   ↓
Phase 1  Identity             (JWT + 13 role + RBAC + AuthContext)
   ↓
Phase 2  Tenant Scope        (RLS Postgres + withDbContext + field masking)
   ↓
Phase 3  Integrity           (Outbox + Audit + Idempotency + State machine helper)
   ↓
Phase 4  Vertical Slices     (4 luồng nghiệp vụ: Staffing + Attendance + Reconciliation + Job Board)
   ↓
Phase 5  UAT + Cutover       (2 kỳ shadow + load test + runbook + Go-live)
   ↓
P1       External Portals    (Worker PWA + Vendor Portal + CTV dashboard)
   ↓
P2       Commission          (Group policy + individual override + ledger)
   ↓
P3       Payroll Engine      (Statutory TNCN/BHXH thật + payslip)
```

---

## 4. Chi tiết từng phase

### Phase 0 — Foundation ✅ ~1 tuần

**Mục tiêu**: build chạy, DB + schema khớp, mọi mutation gọi qua 1 singleton.

**Invariant khóa**:
- `src/lib/db.ts` — **chỉ 1 chỗ** tạo `PrismaClient` trong toàn bộ codebase.
- Mọi route handler / server action / service **không được** `new PrismaClient()`.
- `prisma/schema.prisma` là file canonical duy nhất (xóa 2 file patch).
- Migration consolidated: `g0_baseline` chứa mọi model V4 chưa có DDL.

**DoD**:
- [ ] `npm run build` exit 0.
- [ ] `prisma migrate dev` chạy trên DB sạch + DB upgrade.
- [ ] Refactor 6 route `/api/tickets/*` qua `getPrisma()`.
- [ ] `vitest run` pass.
- [ ] Tách 3 sub-package "rủi ro thấp":
  - `@hrp/money` (refactor `src/shared/utils/money.ts`)
  - `@hrp/payroll-core` (refactor `src/domains/payroll/calculateVietnameseTaxes.ts`)
  - `@hrp/job-board` (mới, read-only ISR, **không auth** — demo A-04 sớm)
- [ ] **Demo**: link public `app/job-board` lên Vercel — sếp duyệt.

**Exit criteria**: route `/api/tickets/[id]` trả được JSON từ DB sạch. Có thể chưa có auth — vẫn OK ở Phase 0.

---

### Phase 1 — Identity ⛔ **CHẶN mọi phase sau** ~2 tuần

**Mục tiêu**: bất kỳ request nào cũng có `AuthContext` thật trong ctx (không nhận từ body/header tự khai).

**Invariant khóa**:
- Mọi API/route/page phải gọi `withAuthScope(ctx, fn)` (L1 deny-by-default) HOẶC không có user (chỉ accecpted cho public read).
- Token = JWT verify bằng key từ ENV; chứa `userId`, `role`, mã hóa chữ ký.
- `permission-resolver` chạy đúng 13 role với precedence: `ADMIN => ALL` → user DENY → user/group/role ALLOW → validity period.
- Seed permission idempotent (không reset grant manual khi re-run).

**DoD**:
- [ ] `src/shared/auth/permission-catalog.ts` có 7+ permission codes theo HOLISTIC_REVIEW §9.1.
- [ ] `src/shared/auth/permission-resolver.ts` test 13 role × 5 bảng (Worker, Project, Ticket, VendorStatement, ClientStatement) = 65 case PASS.
- [ ] `src/shared/auth/auth-context.ts` decode JWT verify bằng `jose` (hoặc tương đương).
- [ ] `src/shared/auth/require-permission.ts` helper throw 403 với reason.
- [ ] `src/shared/auth/with-auth-scope.ts` Prisma Extension deny-by-default.
- [ ] Migration `seed/permissions` idempotent (re-run không mất grant manual).
- [ ] `next dev` + `curl -H "Authorization: Bearer <JWT>" /api/me` trả `{ userId, role }`.
- [ ] `curl` không có JWT → 401 (không 500).

**Exit criteria**: 1 endpoint công khai (vd `/api/tickets/[id]`) trả 401 khi không JWT, 200 kể cả role yếu (vì RLS chưa bật — chỉ auth), 403 khi thiếu permission.

> ⚠️ **Phase 1 KHÔNG được** xử lý Field masking hay RLS. Đó là Phase 2.

---

### Phase 2 — Tenant Scope ⛔ ~2 tuần

**Mục tiêu**: mỗi query tự động cắt theo row scope của user + ẩn cột nhạy cảm.

**Invariant khóa**:
- `runtime DB role != table owner`; không có `BYPASSRLS`.
- Bảng nhạy cảm (`Worker`, `ProjectAssignment`, `SourceClaim`, `VendorStatement`, `PayRun`, `SalaryVariable`...) **FORCE RLS**.
- `withDbContext` mở transaction ngắn, set `app.current_user_id`, `app.current_role`, `app.current_vendor_id`, `app.current_worker_id` qua `SET LOCAL`.
- Field masking chỉ làm ở application (`select`/DTO); KHÔNG column-level security.

**DoD**:
- [ ] `src/shared/auth/with-db-context.ts` đặt GUC transaction-local.
- [ ] `src/shared/auth/rls-context.ts` set 4 biến GUC.
- [ ] `src/shared/auth/scopes/{worker,project,vendor,ctv}.scope.ts` cho 4 scope khởi đầu.
- [ ] `src/shared/auth/worker-projection.ts` ẩn `cccd`, `bankAccount`, `selfie`, `password/auth data` khi role thiếu `CAN_VIEW_WORKER_SENSITIVE`.
- [ ] Migration `<W>_s1_rls_worker`, `<W>_s1_rls_project`, `<W>_s1_rls_vendor` — DDL RLS + DB roles (read-only `app_user`, write `app_user_writer`).
- [ ] **13-role matrix test** (admin 1 + 12 user role) chạy trên 4 bảng = **52 case**, mỗi case assert row count + masked field.
- [ ] `curl` với JWT role `WORKER` → chỉ thấy row của mình; `cccd` là `***`.
- [ ] `curl` với JWT role `ADMIN` → thấy tất cả + `cccd` plaintext.

**Exit criteria**: 1 query đơn giản (`GET /api/workers/me`) chạy đúng với 13 role theo matrix.

> ⚠️ **Phase 2 KHÔNG ĐƯỢC** viết migration RLS kiểu "set role trên connection" — phải `SET LOCAL` trong transaction. Nếu set trên connection sẽ leak qua request khác.

---

### Phase 3 — Integrity ⛔ ~2 tuần

**Mục tiêu**: mọi mutation thật đều idempotent + audit + retry-safe + có state machine helper.

**Invariant khóa**:
- Mọi mutation có `Idempotency-Key` header → bảng `idempotency_keys` (theo ADR-014).
- Mọi mutation thay đổi state → ghi `AuditLog` với `actor + reason + ip + ua + before/after JSON`.
- Transition không hợp lệ → `IllegalTransitionError` (HTTP 409) — KHÔNG silent fail.
- Outbox pattern: ghi event vào DB trong cùng transaction với state change; worker cron đẩy sang notification/side-effect.

**DoD**:
- [ ] Migration `<W>_s1_outbox` + `idempotency_keys` table.
- [ ] `src/shared/integrity/outbox.ts` enqueue + drain helper.
- [ ] `src/shared/integrity/audit.ts` writer.
- [ ] `src/shared/integrity/idempotency.ts` middleware.
- [ ] `src/shared/integrity/state-machine.ts` helper tổng quát (dùng cho Ticket, Statement, Timesheet, PayRun, WorkerAssignment, SourceClaim).
- [ ] Refactor `ticket.service.ts`:
  - Bỏ `session.ts` Bearer stub → dùng `withAuthScope`.
  - Thay `idempotency` từ query metadata → bảng `idempotency_keys`.
  - State machine dùng helper generic.
- [ ] Test: gọi 1 API transition 2 lần cùng `Idempotency-Key` → chỉ 1 lần transition + 1 audit row.
- [ ] Test: gọi transition sai (`Ticket PENDING → LOCKED`) → 409 với reason.

**Exit criteria**: 1 mutation business thật (`POST /api/tickets/[id]/approve`) idempotent + audit + retry-safe + đúng RLS từ Phase 2.

---

### Phase 4 — Vertical Slices ⛔ ~6 tuần (4 slice × 1.5 tuần)

**Mục tiêu**: đưa 4 luồng nghiệp vụ chính lên người dùng thật, mỗi slice E2E.

**Cấu trúc mỗi slice (1.5 tuần)**:

```
4.1  Schema migration (nếu có model mới)
4.2  Service + repository + permission helper
4.3  Route handler + UI mount trong (portal)
4.4  Integration test 4-role (ADMIN, HR_STAFF, VENDOR, WORKER/CTV)
4.5  E2E test scenario thật (theo mockup click-path)
4.6  Demo với sếp + accept
```

**Không được**:
- Viết slice 4.2 mà không có 4.1 (DB thiếu cột = runtime error).
- Viết slice 4.5 mà không có 4.4 (không có authz là test vô nghĩa).
- Promote slice nếu test 4.4 fail.

**4 slice ưu tiên (theo mockup exec plan §1.1)**:

| Slice | Module | Mockup click-path | Tuần |
|---:|---|---|---:|
| **4A** | Staffing Fill (M3 + M5) | S01 → S02 → S02A → S02B | 1.5 |
| **4B** | Attendance Lock (M7) | S03 → S03B → S03_Resolve | 1.5 |
| **4C** | Dual Reconciliation (M8 + M4) | S04 → S04A → S04B | 1.5 |
| **4D** | Job Board Public (M2) | S05 + A-04 public | 1.0 (đã có skeleton từ Phase 0) |

> **4D đã chạy được ở Phase 0** (vì không auth). Ở Phase 4 chỉ polish + gắn analytics.

**DoD cho toàn Phase 4**:
- [ ] 4 slice pass 4-role integration test.
- [ ] 4 slice pass E2E theo mockup click-path (3 khoảnh khắc bắt buộc: Guided Transfer 02:10–03:10, Exception→Lock 06:20–08:30, Dual Reconciliation 09:30–13:00).
- [ ] Audit log chuẩn theo Phase 3.
- [ ] UI dùng shared component (tokens, sheet, data-table, role-guard).
- [ ] **Demo sếp** 4 slice trong 1 buổi (khoảng 30-45 phút).

**Exit criteria**: 1 nội bộ (HR + PM + Accountant) tạo được 1 statement cuối kỳ và khóa được.

---

### Phase 5 — UAT + Cutover ⛔ ~2 tuần

**Mục tiêu**: VÀO SẢN XUẤT được.

**Invariant khóa**:
- 2 kỳ dữ liệu shadow chạy song song (HRP vs Excel cũ) — sai số ≤ 0.01%.
- Security matrix full 13 role × 8 bảng chính PASS.
- Load burst 5.000 check-in / 100 transfer / 20 statement song song PASS (V4 §17 R-39).
- Runbook + rollback plan có chữ ký sếp.

**DoD**:
- [ ] 2 kỳ shadow reconciliation với data thật (tháng 06 + 07/2026).
- [ ] Security matrix test auto chạy 13 role × 8 bảng = 104 case PASS.
- [ ] Load test kịch bản V4 §17 R-39 PASS.
- [ ] Runbook (deploy, rollback, incident) có chữ ký sếp.
- [ ] **Cutover dry-run** 1 lần trên staging Neon riêng.
- [ ] **Go-live** đợt 1: 1 dự án + 1 vendor + 1 client (giới hạn scope để quan sát).

**Exit criteria**: 1 pay cycle thật chạy thành công với 0 manual workaround.

---

### P1 — External Portals (Worker PWA + Vendor + CTV) ~4-6 tuần

**Mục tiêu**: 3 cổng bên ngoài tương ứng 3 role độc lập.

**Bắt buộc tiền điều kiện**:
- Phase 4 đã có source of truth (Worker CRUD, Vendor Statement, CTV SourceClaim).
- PWA Worker: GPS evidence + offline storage + push notification.
- Vendor Portal: confirm/dispute statement + audit + SLA.
- CTV Dashboard: source claim overview + commission cumulative.

**Không đụng**:
- Native app.
- eKYC (deferred theo V4 §5).

---

### P2 — Commission (Group policy + Individual override + Ledger) ~2-3 tuần

**Mục tiêu**: tính hoa hồng CTV + Worker + Referrer với ledger reversal chuẩn.

**Bắt buộc tiền điều kiện**:
- Phase 4 đã có SourceClaim + ProjectAssignment.
- CommissionGroup policy (placeholder đã có từ Phase 0).
- `CAN_OVERRIDE_INDIVIDUAL_COMMISSION` permission.

---

### P3 — Payroll Engine (TNCN/BHXH thật + Payslip) ~3-5 tuần

**Mục tiêu**: engine thật thay `MOCKED` từ Phase 4.

**Bắt buộc tiền điều kiện**:
- Phase 4 đã có PayRun + WorkerPayResult + StatutoryCalculation (placeholder).
- Golden case 5 loại NPT (người Việt, nước ngoài, có người phụ thuộc, có tạm ứng, có điều chỉnh).
- Parallel run 1 kỳ với engine cũ (Excel/Python) — sai số ≤ 0.01%.
- Lock guard: không cho LOCK PayRun nếu statutory status ≠ `VERIFIED`.

**Không ghép** với portal release (HOLISTIC_REVIEW §3.1).

---

## 5. So sánh với cách chia trước

| Cách chia | Lợi | Hại | Tình huống dùng |
|---|---|---|---|
| **Feature (M0→M9)** | Dễ demo, dễ allocate dev | Security debt tích lũy; phải refactor khi có auth | PoC thuyết trình |
| **Epic (E0→E11)** | WBS chuẩn PM | Vẫn lẫn feature & phase | Plan tổng |
| **11 micro-phase (HOLISTIC_REVIEW)** | Founder chốt; đủ chi tiết | Vẫn là "phase-feature" lẫn lộn; chưa tách invariant | Plan chi tiết |
| **⭐ Invariant (file này)** | Mỗi phase đóng băng 1 invariant; phase sau không phá được phase trước | Phải viết test trước khi code; tốn effort ban đầu | Sản xuất thật |

→ Khuyến nghị: **dùng invariant làm backbone sprint**, Epic & micro-phase dùng làm từ điển cross-check.

---

## 6. Lý do thứ tự 0→1→2→3 KHÔNG được đảo

```
Phase 0 (DB) ──► Phase 1 (Auth) ──► Phase 2 (Scope) ──► Phase 3 (Integrity) ──► Phase 4 (Slice)
```

| Đảo thành | Lý do sai |
|---|---|
| 1 trước 0 | Cần `withAuthScope` reference Prisma Client → không có `db.ts` thì `new PrismaClient()` rải rác → đóng băng singleton không khả thi |
| 2 trước 1 | RLS predicate cần `current_user_id` + `current_role` → không có AuthContext thì GUC đặt cái gì? |
| 3 trước 2 | Audit + idempotency cần transaction (`withDbContext`) → Phase 2 phải xong trước |
| 4 trước 3 | Slice không có idempotency → retry API = double state transition. Lỗi tài chính. |
| 5 trước 4 | Không có dữ liệu thật để shadow reconciliation. |

**Ngoại lệ duy nhất**: `@hrp/job-board` (Phase 4D) được code từ Phase 0 vì **read-only public, không auth**.

---

## 7. Burndown ước lượng

```
Phase 0  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  1 tuần
Phase 1  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  2 tuần
Phase 2  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  2 tuần
Phase 3  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  2 tuần
Phase 4  ████████████████████░░░░░░░░░░░░░░░  6 tuần (4 slice)
Phase 5  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  2 tuần
─────────────────────────────────────────────
MVP nội bộ: 15 tuần (H1 → H2 → H3)
─────────────────────────────────────────────
P1        ████████████████████░░░░░░░░░░░░░░  4-6 tuần
P2        ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  2-3 tuần
P3        ███████████████░░░░░░░░░░░░░░░░░░░░  3-5 tuần
─────────────────────────────────────────────
Full V4: 24-29 tuần (Q1/2027)
```

---

## 8. Kế hoạch thực thi 6 tuần đầu (Phase 0 + 1 + 2 + 3)

| Tuần | Phase | Deliverable |
|---:|---|---|
| **W1** | **0** | singleton Prisma + xóa schema patch + gộp migration + 3 sub-package (money, payroll-core, job-board) |
| **W2** | **1** | permission-catalog + permission-resolver + auth-context (JWT) + with-auth-scope |
| **W3** | **2** | with-db-context + rls-context + DDL RLS + 13-role matrix Worker/Project |
| **W4** | **3** | outbox + audit + idempotency + state-machine helper + refactor ticket |
| **W5** | **3+4** | finish integrity tests + 1 slice đầu tiên (Staffing Fill) — minimal service |
| **W6** | **4** | (tiếp) Staffing slice E2E theo mockup S01→S02→S02A |

---

## 9. Cách verify "phase nào xong" (runbook kiểm tra)

Mỗi phase sếp có thể tự verify bằng command:

| Phase | Command/cách verify |
|---|---|
| 0 | `npm run build` + `prisma migrate dev` + mở `app/job-board` thấy data |
| 1 | `curl -H "Authorization: Bearer <JWT>" /api/me` → 200; không JWT → 401 |
| 2 | `curl` 13 role khác nhau cùng 1 endpoint → khác row + field mask |
| 3 | gọi 1 API mutation 2 lần cùng `Idempotency-Key` → chỉ 1 row + 1 audit |
| 4 | 4 slice pass E2E click-path + 4-role integration test |
| 5 | 2 kỳ shadow reconciliation + load 5.000 check-in + runbook ký sếp |

---

## 10. Đối chiếu với 5 đường cắt của `MODULE_TACH_V2.md`

| Cách cắt (V2) | Phase invariant (file này) |
|---|---|
| Epic E0..E11 (UNIFIED_PLAN §6.2) | WBS tổng — dùng để allocate dev theo phase |
| 11 micro-phase (HOLISTIC_REVIEW §3.1) | Cross-check burndown; phase invariant chi tiết hơn |
| Scope (system/project/vendor/ctv/worker) | Phase 2 chính là giao điểm |
| Vertical slice (4 flow) | Phase 4 |
| Mockup screen ID (22 frame) | Phase 4 DoD |

---

## 11. Kiến nghị quyết định

| # | Câu hỏi | Tại sao quan trọng |
|---:|---|---|
| 1 | Sếp chấp nhận 15 tuần MVP nội bộ (H1→H3) thay vì 12 tuần không? | Phase 4 dài hơn 4 tuần so với micro-phase ban đầu vì 4 slice E2E |
| 2 | `@hrp/job-board` cho phép demo public từ Phase 0 (A-04)? | Nhận test data thật sớm, không phụ thuộc auth |
| 3 | Có chấp nhận "1 phase chỉ xong khi đã demo được scenario thật" không? | Tránh "đã code, chưa test" |
| 4 | 13-role matrix test là điều kiện cứng cho Phase 1 + 2, hay soft target? | Cứng mới đảm bảo backward compat |
| 5 | Khi Phase 2 chạy RLS, có cho phép bypass tạm thời bằng ENV flag `BYPASS_RLS=true` không? | Hỗ trợ dev local; CẨN THẬN production |
| 6 | Phase 3 có dùng outbox pattern thật (worker cron) hay in-process? | Thật = delayed; in-process = đơn giản nhưng fail nếu pod chết |

---

## 12. Tóm một dòng

**Khoa học = mỗi phase đóng băng 1 invariant trước khi layer trên cùng dùng**: 0 DB → 1 Identity → 2 Scope → 3 Integrity → 4 Slice → 5 Cutover. Mỗi phase có 1 demo scenario thật và 1 DoD chạy bằng command. Phase 4 là nơi giao với mockup; phase 0 là nơi giao với `@hrp/job-board` để demo sớm.

---

> **Tài liệu liên quan** (không sửa):
> - `docs/MODULE_TACH_V1.md` · `docs/MODULE_TACH_V2.md` (file phân tích phase-feature tổng hợp)
> - `docs/UNIFIED_PLAN_v4.md` (WBS W12 tuần)
> - `docs/HRP_V4_HOLISTIC_REVIEW.md` §3.1 (11 micro-phase) · §9.1 (Q#22 đã chốt) · §9.2 (8 bước bắt buộc)
> - `docs/data-scope-security.md` (G22 RBAC + G25/L1 + G26/L2)
> - `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md` §1.1 (4 màn demo)
