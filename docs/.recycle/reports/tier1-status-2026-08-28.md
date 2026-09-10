# BÁO CÁO TIER-1 — 2026-08-28

> Tài liệu bàn giao trạng thái do Tier 1 (Planner) lập. Lane: **V5 Marketplace launch gate (§7.9.7)**.
> Source of truth trạng thái: `docs/PLANNER_HANDOVER.md §0 ROADMAP_CURSOR`.

**Bottom line:** Toàn bộ chuỗi code Marketplace MVP đã ACCEPTED+audited, và blocker lớn nhất — prod DB lệch schema — đã được gỡ. Ops runbook §7.9.7(7) đã soạn, hiện chờ Owner drill/sign-off cùng các thao tác go-live. Gate: `PHASE_REVIEW`.

---

## I. Bối cảnh & vai trò

Tier 1 — Planner: chỉ viết contract/resolve, không sửa code; prod OP cần Owner ủy quyền đích danh + tự chạy lệnh write (harness classifier chặn Tier-1 write prod).

## II. Việc đã làm

### A. Chuỗi code Marketplace MVP — ACCEPTED + audited
Đối soát từ `TASK.md` control tables trên disk (28/08):

- **Auth / boundary:** M1-06a, M1-06b, M1-06c, M1-06d; M1-07a (ticket RLS), M1-07b (RLS runtime posture); M1-08 (vendor object scope); M1-09A (current-field projection).
- **Marketplace:** MP-1 (Admin Publish), MP-2 (Apply + Tracking + HR Queue), MP-3A, MP-3B, MP-3C (Assignment Placement — Founder waiver AC-08).
- **Nền tảng:** go-live-01 (single-domain consolidation), OPS-04a (observability foundation).
- **Defer:** M1-09B (Payment/PaymentAllocation projection) → M8-06 (`SCHEMA_NOT_AVAILABLE`).

⇒ Tiêu chí **code** của launch gate §7.9.7 về cơ bản đạt.

### B. Prod DB remediation (đợt này — việc lớn nhất)

- **Phát hiện:** `.env` trỏ PRODUCTION thật, lệch `main` 8 migration + `mp2_apply_tracking` FAILED → Prisma từ chối mọi `migrate deploy`.
- **Root cause:** role `hrp_public_rpc` thiếu trên prod (OP-01 trước đây chạy nhầm trên dev).
- **Soạn runbook:** `docs/runbooks/prod-db-remediation-mp2-plus-pending.md` (STEP 0→6, §9 rollback).
- **Thực thi** (Owner chạy mọi lệnh write; Tier-1 chẩn đoán read-only + soạn lệnh): OP-01 tạo role → mp2 SQL-direct 1 transaction + `resolve --applied` → `g0_schema_reconcile` `resolve --applied` (prod đã có sẵn full target-state out-of-band) → `migrate deploy` 6 migration còn lại.
- **Verify (read-only):** `migrate status` = *"Database schema is up to date!"* (25 migrations); cột mp3c (`project_assignments.submission_id` + `staffing_order_slot_id`) + RLS FORCE trên `candidate_submissions`/`application_status_history`/`project_assignments` OK; **0 unresolved-failed migration**; `commission_rules` MISSING = đúng (không có model trong `schema.prisma`).
- **Smoke:** trang public `/viec-lam` = **HTTP 200 + empty state sạch** → xác nhận vá schema ăn (hết nguy cơ 500). Hiển thị 0 job là đúng: cả 4 `outsourcing_projects` đều `is_public=false`, chưa publish; 2 `staffing_orders` OPEN nhưng thuộc project private.

⇒ **Blocker prod DB (từng là BLOCKED_OWNER) đã gỡ.**

### C. Quản trị pipeline & bẫy đã ghi memory

- Cursor `PLANNER_HANDOVER §0`: `BLOCKED_OWNER → PHASE_REVIEW`.
- Memory cập nhật: `hrp-prod-db-drift-seed-blocker` (remediation DONE + bẫy g0 out-of-band + bẫy migrate-status), `hrp-v5-launch-readiness` (blocker 1 = DONE).
- Bẫy giữ giá trị: (1) `prisma migrate status` KHÔNG báo migration FAILED → dùng `scratch/db-state-check.mjs`; (2) `verify-audit.ps1` xanh chỉ structural — đừng accept trên gate-xanh; (3) `/resolve` phải tự đọc AUDIT thật, relay "đã pass" có thể bịa.
- Dọn 7 script remediation một lần trong `scratch/`.

## III. Việc còn tồn đọng

### A. Vận hành — cần Owner
1. **Rotate password `neondb_owner`** (đã lộ ở chat) → sửa `.env` (`DATABASE_URL_ADMIN` + `DATABASE_URL_DEV`) + kiểm Vercel + redeploy nếu có. *Site KHÔNG sập* — app chạy bằng role `app_user_writer`.
2. **Xoá branch backup** `pre-mp2-remediation-2026-08-28` sau khi ổn định (đang giữ credential đã lộ; Neon role theo branch riêng nên rotate prod không đổi password branch này).
3. **Publish 1 job thật** qua MP-1 Admin Publish để chợ có dữ liệu (KHÔNG seed mock).
4. **Smoke nốt** các trang cần đăng nhập: `/admin` assignment + commission không 500, apply-flow, tracking page.

### B. Deliverable của Tier-1 — đã soạn, chờ Owner review
5. **Ops runbook criterion-7** (§7.9.7): `docs/runbooks/marketplace-launch-operations.md` đã bao phủ hide job, lock intake, duplicate, CV policy và rollback public flag. Chưa tính PASS cho đến khi Owner drill/sign-off.

### C. Nợ kỹ thuật / repo hygiene — cần triage (ngoài scope remediation)
6. **M1-09A đã push:** commit `a49870e` đã có trên `origin/main`.
7. **Working tree shared còn WIP:** có thay đổi retire `/bcc`, Payroll roadmap override, metadata/layout của luồng khác và nhiều untracked docs/scratch. Chỉ commit path-scoped sau khi phân loại; không reset/stash/delete WIP của agent khác.

### D. Ứng viên kế tiếp (single Tier-2 stream) nếu defer ops runbook
OPS-04b (provider + route/job instrumentation), OPS-06 (rate-limit + upload magic-bytes — phục vụ launch-gate criteria 1-2), G0-04b CI.

## IV. Trạng thái gate

`current_gate: PHASE_REVIEW` — code + prod DB đã sẵn sàng cho Marketplace MVP; runbook đã soạn và còn **Owner drill/sign-off + owner ops** để mở go-live thật.

---

## V. Addendum — Tier 1 tiếp quản lại (28/08/2026)

- `hrp-v5-m1-09a-current-field-projection` đã được xác minh `Status = ACCEPTED`, audit `PASS`, `verify-audit.ps1 = PASS`; commit scoped `a49870e` đã push lên `origin/main`.
- Owner retire hoàn toàn route legacy `/bcc`; login fallback nội bộ chuyển sang `/admin`. Bảng công/phiếu lương được mở qua ứng dụng riêng, không tái tạo màn `/bcc` trong HRP.
- Owner tách Payroll/Payslip production khỏi đường găng HRP. `PAY-01..08` chuyển `DEFERRED_FINAL`, không block Marketplace/Affiliate/Attendance/Billing/Commission/HRM core hay core UAT/cutover.
- Tier 1 hiện tại tiếp tục ở `PHASE_REVIEW`. Deliverable Planner gần nhất vẫn là ops runbook criterion-7 của launch gate §7.9.7; owner ops còn lại: smoke có đăng nhập, publish một job thật, rotate credential.
- Working tree là shared tree. Chỉ commit theo path scoped; không reset/stash/delete WIP của luồng khác.

## VI. Tier 1 deliverable §7.9.7(7) — Ops runbook

- Đã soạn `docs/runbooks/marketplace-launch-operations.md`, bám code thật cho: unpublish/republish Project, close/cancel StaffingOrder, duplicate apply, dedup Worker conversion và CV handling.
- Không khai man năng lực: hiện chưa có per-slot lock; CV chỉ là metadata, không có raw object/R2 để xóa. Go-live mặc định CV optional/disabled theo quyết định Owner.
- Trạng thái runbook là `READY_FOR_OWNER_REVIEW`, chưa tính PASS cho đến khi Owner diễn tập trên test/staging và ký checklist.
- Sau khi Owner sign-off runbook, ứng viên code contract tiếp theo là OPS-06 trong **một** Tier 2 stream.
