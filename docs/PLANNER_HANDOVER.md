# CHUYỂN GIAO VAI TRÒ TIER 1 — PLANNER (HRP)

> **Đọc tài liệu này TRƯỚC KHI làm bất kỳ việc gì.** Bạn (Agent mới) tiếp nhận vai trò **Tier 1 — Planner / Product & Architecture Decision Owner** của dự án HRP, kể từ **18/08/2026**.
> Tài liệu đủ để bạn hiểu hệ thống, biết mọi ràng buộc, biết chính xác việc đang dở, và bắt tay vào việc tiếp theo ngay. Mọi quy tắc dưới đây là **bắt buộc**, không phải gợi ý.

---

## 1. Bạn là ai, trong hệ thống nào

HRP chạy **pipeline 3 tầng** (source of truth: `.ai-pipeline`):

| Tầng | Vai trò | Sản phẩm | Quy tắc |
|---|---|---|---|
| **Tier 1 — bạn** | Planner — quyết định scope, nghiệp vụ, kiến trúc | `docs/tasks/<slug>/TASK.md` | **Chỉ viết TASK.md, không bao giờ sửa code** |
| Tier 2 | Engineer (agent ngoài, do SẾP giao — ví dụ Cursor) | `HANDOFF.md` | Thực thi contract; không tự audit |
| Tier 3 | Auditor (agent ngoài, độc lập Tier 2, do SẾP giao) | `AUDIT.md` | Audit độc lập; không sửa code/contract |

**Điểm mấu chốt:** bạn **KHÔNG spawn Tier 2/3**. Sếp giao việc cho các agent ngoài (skill `/code`, `/audit` KHÔNG có trong môi trường của bạn — bạn chỉ báo sếp gõ lệnh). Bạn chỉ:
1. Viết/duy trì `TASK.md` (contract).
2. Khi contract READY → báo sếp giao Tier 2 bằng lệnh `/code <slug>`.
3. Khi Tier 2 xong (`HANDOFF.md` kết `READY_FOR_AUDIT`) → báo sếp giao Tier 3 bằng `/audit <slug>`.
4. Khi Tier 3 xong → bạn `/resolve`: xử lý từng finding trong `TASK.md > Planner Resolution`, **tự chạy lại evidence (Iron Rule 4)** rồi kết luận ACCEPTED / REVISION_REQUIRED.

**Giao tiếp:** tiếng Việt, xưng "tôi", gọi người dùng là **"sếp"**. Lead bằng quyết định và blocker — không kể lại quá trình đọc file. Chỉ nói task hoàn thành khi status `ACCEPTED`. Mỗi lần bàn giao nêu đúng: task path, spec version, status, hành động kế tiếp.

---

## 2. Bộ tài liệu nguồn — đọc theo thứ tự

| # | File | Vì sao phải đọc |
|---|---|---|
| 1 | `.ai-pipeline/tier1.md` | Định nghĩa vai trò, artifact model, trạng thái, xử lý audit — **đọc kỹ nhất** |
| 2 | `.ai-pipeline/rules/00-global-rules.md` + `01-planner-rules.md` | Ràng buộc toàn cục + riêng Planner |
| 3 | `.ai-pipeline/templates/TASK.template.md` | Khuôn 11 section bắt buộc của contract |
| 4 | `docs/PHASE_KHOAHOC_V1.md` | **Roadmap khoa học** 6 phase + 3 phase mở rộng — nền tảng mọi quyết định |
| 5 | `docs/UNIFIED_PLAN_v4.md` | ADR (đặc biệt ADR-013 LOCKED bất biến, ADR-014 audit + idempotency) |
| 6 | `docs/tasks/hrp-phase4-vertical-slices/TASK.md` | **Contract đang chạy — đọc §0 + §9 + §10 trước hết** (v1.7) |
| 7 | `docs/roadmap-hrp-v4.html` | **Roadmap trực quan — bạn PHẢI duy trì** (xem §8) |
| 8 | `.ai-pipeline/SKILL-ECOSYSTEM.md` | Skill map khi cần |

Ngoài ra khi viết contract: **chỉ đọc** source/schema/test để xác minh baseline (`src/`, `prisma/schema.prisma`). Không bịa file, symbol, dependency, trạng thái hoặc tool output — dùng `rg`/`git diff`/CodeGraph rồi ghi rõ phương pháp evidence.

---

## 3. QUY TẮC SẮT (Iron Rules + ràng buộc bảo mật)

### 3.1 Iron Rules (từ CLAUDE.md — không sửa CLAUDE.md, sửa `.ai-pipeline` rồi re-run init)

1. Tier 1 chỉ viết TASK.md contract. **Không bao giờ sửa code** (kể cả khi biết sửa thế nào).
2. Tier 2 thực thi → HANDOFF.md. Không tự audit.
3. Tier 3 audit độc lập → AUDIT.md. Không sửa code, không đổi contract.
4. **Evidence phải REAL** — command + exit code + output thật. **Mock evidence = BLOCK.** Planner tự chạy lại mọi lệnh verify trước khi ACCEPT.

### 3.2 Bảo mật & môi trường (vi phạm = hủy kết quả)

- **`.env` đã gitignore — KHÔNG BAO GIỜ in URL/password/token ra output hoặc ghi vào repo** (mọi chuỗi dạng `npg_`, `postgres://`, password). Khi báo evidence phải **mask**.
- **CẤM `prisma migrate dev/deploy/reset` destructive vào `DATABASE_URL` production** (Neon main chứa dữ liệu thật). Chỉ `prisma validate` / `prisma migrate diff`, hoặc dùng `DATABASE_URL_DEV`. Không bao giờ drop/rename/truncate.
- **CẤM commit dữ liệu thật:** `appBCC/*.xlsx`, `appBCC/db_*.txt`, `appBCC/docs/*` (PII thật).
- **`app/bcc/` + `appBCC/` là khu vực sếp phát triển song song** — không đổi logic, không stage. NGOẠI LỆ duy nhất (đã chốt DEC-09 A): `appBCC/app.py` chỉ được đổi **đúng 1 dòng** env `DATABASE_URL` → `APPBCC_DATABASE_URL`.
- **CẤM `git add -A` / `git add .`** — chỉ add đúng file của task.
- **Phone/password thật KHÔNG BAO GIỜ vào HANDOFF.md/AUDIT.md/repo** (repo public) — evidence luôn masked.

### 3.3 Kỷ luật contract (rút từ tier1.md + kinh nghiệm)

- **Một task = một contract** (một thư mục `docs/tasks/<slug>/`). Tier 1 chỉ tạo/cập nhật `TASK.md` — **KHÔNG tạo tài liệu phụ** (đã từng sai: tạo `PROMPT_TIER2.md` → bị bắt, phải xóa; giao việc chỉ bằng lệnh `/code`).
- **Traceability `RQ → STEP → AC` bắt buộc** — độ chặt đến từ tính truy vết và tiêu chí đo được, không đến từ số trang.
- **Open Questions phải rỗng trước khi READY** nếu câu trả lời làm đổi implementation.
- Contract thay đổi → **tăng Spec version** + ghi Revision Log. Chỉ lỗi thực thi → giữ version, mở execution round mới.
- Audit finding → trả lời ngay trong `TASK.md > Planner Resolution` (không file quyết định khác). Mọi thay đổi sản phẩm/source sau audit phải được audit lại.
- **Không giao quyết định nghiệp vụ/kiến trúc cho Tier 2/3.**
- **Không đổi ADR đã chốt** nếu chưa ghi lý do, tác động, phương án thay thế, và trạng thái cần sếp duyệt.

---

## 4. Quyết định đã chốt — KHÔNG đổi khi chưa trình sếp

| ID | Quyết định | Trạng thái |
|---|---|---|
| **D13** | Backbone theo **invariant-phase** (PHASE_KHOAHOC §3) + monorepo **Phương án A** (`@hrp/money`, `@hrp/payroll-core`, `@hrp/job-board`) | Đã chốt (founder duyệt 16/08) |
| **D14** | **Freeze Mockup Baseline v1** (PM/BoD ký) = trigger Phase 0 | Đã thực hiện |
| **D15** | Rào `/bcc` bằng JWT tối giản tuần đầu Phase 1 | Đã xong (bcc-fence) |
| **D16** | Outbox in-process drain + cron daily lưới an toàn (phương án b) | Đã chốt (b) |
| **DEC-08** | Production RLS **hoãn tới trước Phase 4** — Phase 2 chỉ dev + runbook | Đã chốt |
| **DEC-09 A** | Dev runtime dùng role `app_user_writer`, migrate qua `directUrl = env("DATABASE_URL_ADMIN")`, appBCC dùng `APPBCC_DATABASE_URL` (role `hrp_etl`) | Đã chốt |
| **DEC-11** | 🚫 **CẤM tạo lại bộ login/JWT/cookie/register/endpoint auth** — tái dùng identity-core (`jwt.ts`, `auth-context.ts`, `with-auth-scope.ts`, `app/api/auth/*`, cookie `hrp_token`). Vi phạm = audit BLOCK | Đã chốt |
| **DEC-33** | Bộ thuật ngữ canonical 21 từ EN→VI (DECISION_LOG v0.6) | Đã chốt |
| **DEC-NEW-04/05** | `prisma migrate dev` fail (shadow DB + `portal_timesheets` raw của appBCC) → **apply SQL trực tiếp qua `DATABASE_URL_ADMIN` + `prisma migrate resolve --applied`** (sếp chấp thuận 17/08 08:35) | Đã chốt |
| **DEC-NEW-06** | Round 2 chia 2a/2b/2c theo budget | Đã chốt |
| **DEC-NEW-07..10** | `server-session.ts` tách read-only (không sửa `auth-context.ts`); advisory lock `hashtext($1::text)`; `buildStaffingOrderScope` reuse `buildProjectScope`; Role mở rộng DIRECTOR/SALE | Đã chốt |
| **DEC-NEW-11** | Bulk transfer **skip idempotency** — per-item savepoint (G15) là fail-safe; single transfer vẫn bọc đủ | Đã chốt |
| **DEC-14** | Test dùng **Prisma mock in-memory** + fixtures giả hoàn toàn (không DB thật) — ⚠️ xem §5.2: mock KHÔNG bắt được lỗi Prisma runtime | Đã chốt |
| **DEC-15** | 4B/4C mỗi slice **tự mang migration RLS additive** cho bảng mình dùng (RQ-21) | Đã chốt |

Kho quyết định chi tiết: `docs/tasks/hrp-v4-bod-mockup/DECISION_LOG.md` + `TASK.md` phase-4 §3.

---

## 5. Lịch sử & trạng thái task (18/08/2026)

| Task | Spec | Status | Ghi chú |
|---|---|---|---|
| `hrp-v4-bod-mockup` | v1.15-close | **ACCEPTED** | Mockup Baseline v1 đóng băng (D14) |
| `hrp-phase0-foundation` | — | Đã xong | DB + Prisma + 3 sub-package |
| `hrp-phase1-bcc-fence` | — | **ACCEPTED** | Rào /bcc JWT (D15) |
| `hrp-phase1-identity-core` | v1.1-close | **ACCEPTED** (`dc3e772`) | JWT + 13 role + RBAC |
| `hrp-phase2-tenant-scope` | v1.4-close | **ACCEPTED** (`e963d82`) | RLS + scope + masking 7 trường + runbook production |
| `hrp-phase3-integrity` | v1.2 | **ACCEPTED** (`5488516`, 16/08) | Idempotency (ADR-014, TTL 24h) + outbox + AuditLog 3 cột + 4 helper + 22 tests |
| `hrp-phase4-vertical-slices` | **v1.7** | **REVISION_REQUIRED** | ⬅️ **CONTRACT ĐANG CHẠY** — 4A ✅ PASS (`e3a7977`); 4B core ✅ (`a8f77e3`) + round 5 đóng REVISION (`6eece4a`/`7a462d9`) → **chờ sếp gõ `/code` round 5.1** |

### Vị trí lộ trình hiện tại

```
Mockup ✅ → Phase 0 ✅ → Phase 1 ✅ → Phase 2 ✅ → Phase 3 ✅ → [ Phase 4 ĐANG CHẠY — 4A ✅, 4B 398/398 test nhưng REVISION 5.1 ]
→ Phase 5 (UAT, GO-LIVE) → P1..P3 (Full V4, Q1/2027)
```

Phase 4 = 4 slice tuần tự (contract §5): **4A Staffing Fill** ✅ → **4B Attendance Lock** (đang dứt điểm) → **4C Dual Reconciliation** (S04→S04B, STEP-13..17) → **4D Job Board** (S05, STEP-18/19) → **STEP-20** = regression cuối + HANDOFF runbook tổng. 3 mandatory demo moments (F00A): 4A 02:10–03:10 ✅, 4B 06:20–08:30, 4C 09:30–13:00.

### 5.1 TRẠNG THÁI CHI TIẾT — ROUND 5.1 (phần việc đang dở — đọc kỹ)

Round 5 (đóng 4B) đã chạy: Tier 2 nộp 6 file code (không viết HANDOFF, không có Tier 3 audit — sếp quyết đóng round theo lệnh "398/398 Tests Passed"). Planner (agent tiền nhiệm) **tự verify lại mọi thứ (Iron Rule 4)** — kết quả: vitest **398/398 exit 0**, build exit 0, nhưng phát hiện **6 defect** → verdict **REVISION_REQUIRED**, TASK v1.7 mở **round 5.1** giao Tier 2 đúng 5 việc:

| Defect | Mức | Lỗi | Việc 5.1 tương ứng |
|---|---|---|---|
| **F5-01** | 🔴 HIGH (bảo mật) | Migration RLS `20260817160000_s1_rls_attendance_timesheet`: policy `hrp_attendance_import_batch_scope`/`_row_scope` nhánh PM là `EXISTS(SELECT 1 FROM outsourcing_projects…)` **không tham chiếu row** → PM nào quản bất kỳ project outsourcing nào cũng thấy/ghi TOÀN BỘ batch+rows (PII raw_employee_code), ngược intent comment "batch không có project_id → PM không thấy" | **(1)** Sửa policy batch/rows + thêm WITH CHECK theo pattern Phase 2 |
| **F5-02** | MED | Policy `hrp_attendance_event_scope` nhánh WORKER so `worker_id = hrp_session_user_id()` (uuid `workers.id` vs uuid `app_user.id` → không bao giờ khớp) → WORKER thấy 0 event; phải dùng helper Phase 2 (`hrp_worker_visible_for` / join `workers.user_id`) | **(2)** Sửa nhánh WORKER dùng helper Phase 2 |
| **F5-03** | LOW | Thiếu WITH CHECK (pattern Phase 2 có); header migration ghi nhầm "STEP-14" | **(1)** kèm |
| **F5-04** | 🔴 HIGH (production-breaking) | `src/domains/attendance/resolve-adjustment.service.ts` — `resolveUnmatchedRows` có block `updateMany` chết với data key giả `_p0..` (không phải cột) → `PrismaClientValidationError` → API resolve **luôn 500 khi chạy thật**; mock in-memory (DEC-14) không bắt được | **(3)** Xoá block chết (giữ raw SQL bên dưới) |
| **F5-05** | MED (AC-10) | 2 route mới (`app/api/attendance/adjustments/route.ts` POST, `app/api/attendance/import/[id]/resolve/route.ts` PATCH) chưa bọc `withIdempotency` (POST adjustments không chốt chống double-submit; PATCH resolve có thể châm chước DEC-NEW-11) | **(3)** Bọc `withIdempotency` cho POST adjustments |
| **F5-06** | MED (contract) | **UI Resolve drawer CHƯA có** — `app/admin/attendance/page.tsx` chỉ 2 dòng comment; bước 7 (AP-QM-1048→Mai) là mandatory demo moment 06:20–08:30 → KHÔNG defer | **(5)** UI Resolve drawer + adjustment drawer (S03→S03_Resolve) |

**Việc 5.1 giao Tier 2 (ghi đầy đủ tại TASK v1.7 §9):** (1) sửa policy batch/rows + WITH CHECK; (2) sửa nhánh WORKER; (3) xoá `updateMany` chết + bọc `withIdempotency` POST adjustments; (4) **apply migration dev DB theo DEC-NEW-04/05 + script verify RLS** (PM → 0 batch; WORKER → thấy event của mình; role ngoài scope → 0 row); (5) UI drawer + **HANDOFF-R5.md bắt buộc** (nêu evidence từng việc).

**4B chỉ ACCEPT khi** 5 việc trên đạt + Tier 3 audit round 5.1 + Planner tự verify lại.

### 5.2 Kiến thức kỹ thuật bắt buộc (đã tích luỹ qua 5 round — đừng phát minh lại)

- **RLS pattern Phase 2:** `FORCE ROW LEVEL SECURITY`, policy `TO app_user_writer, app_user`, dùng helper `hrp_session_role()`, `hrp_session_user_id()`, `hrp_project_visible_for(pid)`, `hrp_project_writable(pid)`, `hrp_worker_visible_for(wid)` (SECURITY DEFINER; GUC qua `set_config(..., true)`; **CẤM SET ROLE**). Child table scope qua EXISTS parent FK. **Migration RLS phải additive-only (ENABLE + FORCE + CREATE POLICY, DO-block IF EXISTS) + có script verify** (pattern `scripts/_phase4-verify-slots-rls-strong.cjs`).
- **AC-10 (idempotency + outbox):** mọi route POST/PATCH mới phải bọc `withIdempotency` (header `x-idempotency-key`, TTL 24h, trùng → 409 `IdempotencyConflictError`) + `enqueueOutbox` + `writeAuditLog` trong cùng transaction (pattern `app/api/tickets/*`, `src/shared/integrity/*`). Ngoại lệ đã chốt: bulk per-item (DEC-NEW-11).
- **Timesheet SM:** PENDING → REVIEWED → APPROVED → LOCKED, maker≠checker (MAKER_EQ_CHECKER → 409), reopen version+1, PERIOD_EXISTS idempotent; **ADR-013**: LOCKED bất biến → mọi sửa sau LOCKED qua `TimesheetAdjustment` (period phải reopen trước).
- **Taxonomy G29:** 6 lỗi — FORMAT_ERROR/UNKNOWN_CODE/MISSING_PUNCH → KT; DUPLICATE_CCCD → HR; OUTSIDE_SHIFT/DUPLICATE_SCAN → PM. 3 blockers D07: UNMATCHED_EMPLOYEE, SOURCE_CONFLICT, WRONG_PROJECT. `UNIQUE(source, external_event_id)` cho import idempotent.
- **Testing:** vitest only (KHÔNG Playwright); Prisma mock in-memory; fixture giả (DEC-14). Tiến trình: 325 → 343 → 351 → 367 → 385 → **398**. ⚠️ **Bài học F5-04:** mock không validate Prisma runtime — khi Tier 2 dùng `updateMany`/`$executeRawUnsafe`, Planner phải ĐỌC code kiểm tra tên cột thật trong `prisma/schema.prisma`.
- **4C chuẩn bị (round 6):** Dual Reconciliation — statement kép vendor payable / client receivable + margin; vendor preview (rate+qty+amount, margin ẩn); dispute ≤ 2 vòng + SLA 3 ngày; FORCE LOCK; **bảng `client_statements*` cần migration RLS additive (RQ-21/DEC-15)** — nhắc Tier 2 từ đầu, và đích thân kiểm tra policy SQL trước khi cho apply.

---

## 6. Hàng đợi việc tiếp theo (làm theo đúng thứ tự)

1. **Việc đang chờ duy nhất:** sếp gõ **`/code hrp-phase4-vertical-slices`** trong Cursor để giao Tier 2 **round 5.1** (bạn nhắc sếp nếu sếp chưa làm; bạn KHÔNG tự chạy — skill `/code` không có trong môi trường Planner).
2. Tier 2 xong → **`HANDOFF-R5.md` kết `READY_FOR_AUDIT`** (bắt buộc lần này — round 5 Tier 2 không viết, đừng cho lặp lại) → báo sếp giao Tier 3 `/audit hrp-phase4-vertical-slices`.
3. Tier 3 xong → bạn **`/resolve`**: verify từng việc 5.1 — (a) đọc policy SQL sửa (PM branch, WITH CHECK, WORKER helper); (b) grep `withIdempotency` ở POST adjustments; (c) confirm `updateMany` chết đã xoá; (d) UI drawer tồn tại trong `app/admin/attendance/page.tsx`; (e) chạy lại `npx vitest run` (kỳ vọng ≥ 398), `npm run build`, script verify RLS (PM → 0 batch, role ngoài scope → 0 row), `npx prisma migrate status` = up-to-date (đã apply theo DEC-NEW-04/05). → **ACCEPTED 4B** (điều kiện: AC-03/04/08/09/10/14 phần 4B + RLS verify đạt).
4. **4B ACCEPTED** → TASK **v1.8**: mở **round 6 = Slice 4C** (STEP-13..17) + Resolution ghi nhận 4B đóng; báo sếp `/code`. Nhắc Tier 2: 4C phải tự mang migration RLS `client_statements*` + verify script (RQ-21/DEC-15) — **Planner đọc kỹ policy SQL trước khi cho apply** (bài học F5-01/F5-02).
5. 4C ACCEPT → **4D Job Board polish** (STEP-18/19, S05) → **STEP-20** regression cuối + HANDOFF runbook tổng → Phase 4 ACCEPTED → chuẩn bị Phase 5 (UAT/GO-LIVE).
6. **Sau MỖI task đổi trạng thái → cập nhật đủ bộ dưới §8 rồi PUSH NGAY** (yêu cầu sếp).

---

## 7. Vòng lặp vận hành chuẩn của Planner

```
Sếp giao yêu cầu / chuyển tiếp AUDIT.md
   → đọc plan/domain docs + source/schema (chỉ đọc) để xác minh baseline
   → viết/sửa TASK.md (11 section, traceability RQ→STEP→AC, §9 Resolution append-only)
   → tăng Spec version + Revision Log nếu đổi contract; giữ version nếu chỉ lỗi thực thi
   → chạy .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/<slug>/TASK.md (phải PASS)
   → commit ĐÚNG file (không add -A) + push origin main
   → báo sếp: path + spec + status + lệnh giao Tier 2 (/code <slug>)
   → (Tier 2 chạy) → HANDOFF READY_FOR_AUDIT → báo sếp /audit <slug>
   → (Tier 3 chạy) → bạn /resolve → TỰ CHẠY LẠI evidence (Iron Rule 4) → ACCEPTED / REVISION_REQUIRED
   → cập nhật đủ bộ §8 → push
```

Trạng thái task hợp lệ: `DRAFT` → `READY_FOR_EXECUTION` → `REVISION_REQUIRED` / `ACCEPTED` / `CANCELLED`.

---

## 8. BẮT BUỘC: cập nhật những gì sau MỖI task

**Sau mỗi task đổi trạng thái (mỗi round), cập nhật ĐỦ CÁC MỤC sau trong CÙNG lượt bàn giao rồi commit + `git push origin main`** (yêu cầu sếp 16/08 — mọi người xem kết quả qua GitHub):

### 8.1 `docs/tasks/<slug>/TASK.md` (contract — luôn luôn)

| Chỗ | Sửa gì |
|---|---|
| §0 Control | `Spec version` (+1 nếu đổi contract), `Status`, `Current execution round` (append round đã đóng + round kế), `Current audit round`, `Next gate`, `Updated` (ngày giờ ICT) |
| §9 Planner Resolution | Append 1 dòng cho round vừa đóng: finding IDs, verdict, evidence THẬT (command + exit code + số), defect Planner tự phát hiện, việc giao round sau — **append-only, không sửa dòng cũ** |
| §10 Revision Log | Append 1 dòng v1.x mới |

Sau khi sửa: chạy `powershell.exe -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/<slug>/TASK.md` → kết quả `DRAFT-VALID`/`RESULT: PASS` (warning "not READY_FOR_EXECUTION" là bình thường khi status = REVISION_REQUIRED).

### 8.2 `docs/roadmap-hrp-v4.html` (roadmap trực quan — nếu trạng thái phase/slice đổi)

| Chỗ trong file | Sửa gì |
|---|---|
| `.stat-strip` | Ô mô tả TASK: spec version + status + slice nào ✅ + lệnh chờ sếp (`/code ...` round nào) |
| `.phase-card` | `pc-foot` (tiến độ/exit), `badge-*` khi phase ACCEPT |
| `.pd-hint` / `h4` slices | Trạng thái từng slice 4A/4B/4C/4D (code ✅ ngày nào, REVISION đang chạy…) |
| Metro `.stop` + `.done-part` | Khi PHASE đổi (ví dụ Phase 4 ACCEPT → ga 4 done, ga 5 current, done-part 44.4%) |
| `.burndown-bar` + footer | Khi tuần đổi |

### 8.3 `index.html` (trang chủ)

Card "Roadmap V4": cập nhật dòng mô tả (số phase x/6, phase đang đứng, tuần) + ngày hero-meta/footer — **chỉ khi có ref cũ cần đổi**; card link như cũ, KHÔNG iframe/inline.

### 8.4 Memory của Planner (riêng của bạn, không commit)

`C:\Users\Admin\.claude\projects\c--CodeApp-HrP\memory\hrp-phase0-pipeline-status.md` — append 1 bullet cho round vừa đóng (verdict, SHA, số test, defect) + sửa frontmatter `description` cho khớp trạng thái mới. (File này là auto-memory, không vào repo.)

### 8.5 Commit & push

- **Chỉ `git add` đúng file** (CẤM `-A`/`.`). Chia 2 commit nếu có cả code Tier 2 lẫn docs Planner (tiền lệ: `6eece4a` code + `7a462d9` docs).
- Kiểm tra commit message Tier 2 không bị trôi subject thành trailer `Co-authored-by` (đã xảy ra ở `a8f77e3`) — chỉ báo, không sửa lịch sử đã push.
- `git push origin main` ngay sau commit. Báo sếp trong cùng lượt trả lời.

---

## 9. Sai lầm đã mắc — đừng lặp lại

1. **Tạo tài liệu phụ** (`PROMPT_TIER2.md`) → vi phạm artifact model → đã xóa. Giao việc chỉ bằng `/code`.
2. **Ghi đè TASK.md bằng tóm tắt** thay vì edit có chủ đích → luôn đọc trước khi sửa, dùng Edit, giữ nguyên phần không liên quan.
3. **Tách 1 phase thành 2 task** (tenant-scope-v2) → CANCELLED. Một phase = một contract.
4. **Thiếu traceability RQ→STEP→AC** → viết lại cả contract. Dựng bảng traceability từ bản nháp đầu tiên.
5. **Muốn ACCEPT khi evidence chưa verify** → chặn đúng theo Iron Rule 4. Mọi kết luận phải có command + exit code + output thật (đã mask).
6. **Đóng task chỉ dựa trên xác nhận miệng** → luôn ghi "nguồn: sếp xác nhận ngày X" vào Revision Log. *Ví dụ round 5: sếp báo "398/398 pass", Planner vẫn tự chạy lại và phát hiện 6 defect F5-01..06 — xác nhận miệng ≠ evidence.*
7. **Tier 2 dùng `git add -A` stage nhầm `appBCC/`** (round 2a) — Tier 3 bỏ sót khi chấm AC-16 PASS. Planner phải tự check diff vùng cấm mỗi round, nhắc Tier 2 chỉ add đúng file.
8. **Tier 3 pass AC-10 khi route chưa bọc idempotency** (round 2) và **pass AC-03 khi taxonomy chưa có test** (round 4) — Planner luôn tự grep/đọc lại, không tin kết luận Tier 3 suông.
9. **E2E thiếu bước mandatory demo moment** (round 4) — đối chiếu từng bước F00A trước khi đóng slice.
10. **Tier 2 để work uncommitted + không viết HANDOFF** (round 5) → Planner commit thay theo tiền lệ Phase 3 + ghi rõ trong Resolution; yêu cầu HANDOFF bắt buộc ở round sau.
11. **Test mock in-memory không bắt lỗi Prisma runtime** (F5-04: `updateMany` cột giả) — với code dùng raw SQL/updateMany, Planner phải đối chiếu tên cột với `prisma/schema.prisma`.
12. **RLS policy SQL sai nhưng comment đúng intent** (F5-01/F5-02) — Planner phải tự đọc từng policy, đừng tin comment/header của migration.

---

## 10. Checklist ngày đầu

- [ ] Đọc `.ai-pipeline/tier1.md` + `rules/01-planner-rules.md` + `templates/TASK.template.md`
- [ ] Đọc `docs/tasks/hrp-phase4-vertical-slices/TASK.md` §0 + §9 + §10 (contract v1.7 đang chạy) + `AUDIT.md` (round 4) + `HANDOFF-R4.md`
- [ ] Đọc lại §5.1 tài liệu này (6 defect F5-01..F5-06 + 5 việc round 5.1) — đây là phần việc đang dở
- [ ] Mở `docs/roadmap-hrp-v4.html` bằng trình duyệt (xem cấu trúc §8.2)
- [ ] `git log --oneline -8` + `git status` — lưu ý: 2 file stray `apply-changes.mjs` + `write_script.py` ở repo root là script tạm Tier 2 (KHÔNG commit — hỏi sếp xoá hay giữ); `appBCC/*` nếu dirty là working tree của sếp — không đụng
- [ ] Hỏi sếp: Tier 2/3 hiện là ai? Đã gõ `/code hrp-phase4-vertical-slices` (round 5.1) chưa?
- [ ] Xác nhận lại 2 việc chờ: (1) sếp gõ `/code` round 5.1; (2) sau mỗi task cập nhật đủ bộ §8 rồi push

---

*Tài liệu do Tier 1 Planner (agent tiền nhiệm) viết ngày 18/08/2026 — trạng thái chuẩn tại thời điểm chuyển giao: Phase 4 TASK v1.7 REVISION_REQUIRED, round 5.1 chờ sếp giao `/code`. Mọi số liệu trong `TASK.md` và `PHASE_KHOAHOC_V1.md` là nguồn tin chính xác hơn tài liệu này nếu có mâu thuẫn.*
