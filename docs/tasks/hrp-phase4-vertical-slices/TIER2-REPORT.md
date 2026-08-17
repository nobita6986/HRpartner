# TIER 2 REPORT → Tier 1 (Planner) — `hrp-phase4-vertical-slices` (pre-round 1)

> **Tác giả:** Tier 2 (Engineer), 17/08/2026 08:24 ICT.
> **Mục đích:** Báo cáo 4 rủi ro thực tế phát hiện khi khảo sát baseline trước khi Tier 2 mở round 1 — xin Tier 1 bổ sung/điều chỉnh contract để round 1 có thể chạy đúng nghĩa.
> **Trạng thái task:** TASK v1.0 `READY_FOR_EXECUTION` đã PASS verify (đã chốt 20 RQ + 20 STEP + 16 AC + 14 DEC). Tier 2 **chưa tạo HANDOFF round 1** — chưa execute gì ngoài 4 dir trống `app/admin/{staffing,attendance,reconciliation,jobs}`.

## TL;DR

Slice 4A round 1 gặp 4 blocker nghiêm trọng mà contract v1.0 chưa giải quyết rõ. Tier 2 round 1 chưa đủ info để thi công hết 7 STEP → đề xuất Tier 1 bổ sung 4 specification phụ trước khi mở round 1.

## Baseline đã verify

```text
$ git log --oneline -3
395b7e4 fix(roadmap): section Mo rong - Integrity Done, Vertical Slices dang chay
7f1bc3b feat(phase4): TASK v1.0 vertical slices READY_FOR_EXECUTION (4 slice E2E)
5488516 feat(phase3): Integrity — idempotency + audit + outbox + state-machine; ACCEPTED (verdict PASS, 8/8 AC)

$ ls docs/tasks/hrp-phase4-vertical-slices/
TASK.md

$ git status --short
 (Phase 4 chưa mở commit nào — chỉ TASK.md đã được sếp commit trong 7f1bc3b)
```

OK để Tier 2 mở round 1. Tuy nhiên — 4 vấn đề sau cần Tier 1 chốt:

## Vấn đề 1 — RLS policy cho bảng Phase 4 (RISK-02 thừa nhận nhưng chưa có spec cụ thể)

**Quan sát (Tier 2 verify):**

- `prisma/migrations/2026081621*_s1_rls_{worker,project,vendor}.sql` (Phase 2) phủ các bảng:
  - `workers` + child tables (dependents, source_claims, project_assignments, tickets, ticket_comments, ticket_notifications)
  - `projects` + project_assignments
  - `vendors` + vendor statements
- Bảng mới cần RLS cho slice 4A:
  - `staffing_orders` + `staffing_order_slots` (STEP-02)
  - `candidate_submissions` + `source_claims` (STEP-04 cho guard R1/R2/R3)
- Bảng mới cần RLS cho slice 4B/4C (out of scope round 1):
  - `attendance_import_batches`, `attendance_import_rows`, `attendance_events`
  - `timesheet_periods`, `timesheet_lines`, `timesheet_adjustments`
  - `vendor_statements`, `vendor_statement_lines`, `client_statements`, `client_statement_lines`

**Câu hỏi cho Tier 1 (blocking round 1):**

- (Q1.1) RLS policy cho `staffing_orders` là gì? AI/PM của project đó thấy tất cả OPEN/CLOSING_SOON của project mình? HR thấy tất cả? Vendor không thấy?
- (Q1.2) RLS policy cho `candidate_submissions` + `source_claims`? Vendor chỉ thấy submission của mình? HR thấy tất cả? Worker không thấy?
- (Q1.3) Phase 4 round 1 có **BAO GỒM** migration RLS cho 2 bảng trên không, hay round 1 chỉ viết service + test, để RLS round 2?

TASK §4.2 in-scope có "kế pattern Phase 2" nhưng **không có STEP cụ thể** cho RLS policy này. Theo DEC-08 của Phase 2, RLS production hoãn tới trước Phase 4 — vậy dev RLS cũng hoãn theo? Hay dev RLS làm ngay trong Phase 4?

**Khuyến nghị Tier 2:** Một STEP-01a hoặc STEP-01b riêng, viết RLS cho `staffing_orders` + `candidate_submissions` + `source_claims` (slice 4A thiếu chúng) **trước STEP-02** — hoặc chính thức ghi vào contract "RLS đợi round 2 nếu test 4-role viết bằng unit test không cần RLS thật".

## Vấn đề 2 — Schema fixture giả cho 4-role test + E2E narrative (DEC-14 cấm PII thật, chưa có spec)

**Quan sát:**

- DEC-14: "Fixture giả hoàn toàn — CẤM dữ liệu thật (PII/CCCD/lương thật); nhân vật mockup (Mai, AP-QM-1048, kỳ 08/2026) dùng làm fixture để tái hiện 3 moment."
- TASK §4 AC-09: "E2E click-path: 3 integration test file tái hiện đúng 3 moment (4A 02:10–03:10; 4B 06:20–08:30; 4C 09:30–13:00) theo F00A"
- Theo `EV-02`: `docs/tasks/hrp-v4-bod-mockup/mockup/F00A_DemoNarrative.html` — Tier 2 chưa đọc.

**Câu hỏi cho Tier 1 (blocking round 1):**

- (Q2.1) Có file fixture mẫu (JSON / SQL seed) sẵn cho Tier 2 copy/extend không? Hay Tier 2 tự tạo từ scratch (10 worker Mai, 3 project, 2 vendor, 1 staffing order với 1 slot OPEN, 1 candidate submission đang ở NEW)?

**Khuyến nghị Tier 2:** Cung cấp 1 file `scripts/seed-phase4-fixture.cjs` (hoặc `.sql`) dùng làm seed e2e test. Tier 2 chỉ tham chiếu ID cố định (vd `workerId='seed-mai-001'`, `projectId='seed-prj-ap-qm-1048'`) trong test. Nếu không có fixture sẵn, Tier 2 tự tạo + production lock test ID.

## Vấn đề 3 — UI spec cho 4 trang admin (STEP-06) thiếu tài liệu narrative F00A

**Quan sát:**

- TASK §5 STEP-06: "Route + UI S01→S02→S02A→S02B (Control Tower → Staffing → Guided Transfer drawer → Referral Guard timeline + override)"
- TASK EV-02 reference `mockup/F00A_DemoNarrative.html` — Tier 2 chưa đọc.
- Design "Warm Professionalism" (G27) reference `stitch/warm_professionalism/DESIGN.md` — Tier 2 chưa tồn tại kiểm chứng.

**Câu hỏi cho Tier 1:**

- (Q3.1) F00A_DemoNarrative.html có thật trong repo? Tier 2 chưa thấy ở `ls docs/tasks/hrp-v4-bod-mockup/`. Nếu có, Tier 1 point Tier 2.
- (Q3.2) UI Phase 4 admin có cần "polish" design theo Warm Professionalism (stitch) không, hay dùng shared UI hiện có (data-table + sheet + role-guard) đủ?

**Khuyến nghị Tier 2:** Round 1 chỉ viết UI skeleton với shared/components/admin/staffing, mỗi trang đủ để test 4-role + render đúng narrative (text + button + table). Design polish có thể để round 2.

## Vấn đề 4 — Tier 2 round 1 hiện tại ngắt nhịp giữa Phase 3

**Quan sát:**

- Phase 3 round 1 hoàn tất 16/08 22h ICT (~9h trước Phase 4 round 1).
- Tier 2 liên tục: không có pause verify Phase 3 sản phẩm đã dùng được ở production path.
- Theo `PIPELINE-GUIDE.md §3`: round execution 1 → audit → resolve → ACCEPTED → round mới. Phase 3 đã ACCEPTED rồi nên về mặt pipeline OK.

**Vấn đề phụ:**

- (Q4.1) Tier 2 có nên **tự đánh giá** quality Phase 3 (chạy lại `npm run build`, vitest 325, curl dev 4 route ticket) trước khi mở Phase 4 để đảm bảo helper integrity không có bug ở production path không? Hay Phase 3 đã PASS 8/8 AC + Tier 3 verdict là đủ tin?

**Khuyến nghị Tier 2:** Trước khi viết slice 4A service, Tier 2 chạy 1 sanity check: `npx vitest run src/domains/attendance/ticket.service.test.ts` + `npx next build` để chắc Phase 3 thật sự ổn. Nếu thấy regression Tier 2 sẽ escalate Tier 1 quyết định cách fix.

## Trạng thái hiện tại (do Tier 2)

- **Files ĐÃ tạo (pre-round 1):** 4 dir rỗng:
  - `app/admin/staffing/`
  - `app/admin/attendance/`
  - `app/admin/reconciliation/`
  - `app/admin/jobs/`
- **KHÔNG tạo:** layout, page, service, route, test, migration, schema delta.
- **KHÔNG sửa:** Phase 3 file, schema.prisma, permission catalog, RLS migration.
- **Working tree clean** (chỉ 4 dir untracked).

## Yêu cầu Tier 1 (Planner) phản hồi

**Ưu tiên 1 (Vấn đề 1):** Chốt RLS policy cho `staffing_orders` + `candidate_submissions` + `source_claims`. Hai lựa chọn:
- (a) Viết RLS dev ngay trong Phase 4 round 1 (thêm STEP-01b) — theo pattern Phase 2.
- (b) Hoãn RLS tới round 2, round 1 chỉ test 4-role bằng unit test (fake auth scope).

**Ưu tiên 2 (Vấn đề 2):** Cung cấp fixture spec (JSON / SQL seed) cho 4-role + E2E narrative 4A. Nếu không, Tier 2 tự tạo file fixture JSON + scripts/seed.

**Ưu tiên 3 (Vấn đề 3):** Confirm F00A_DemoNarrative.html tồn tại ở đâu + design Warm Professionalism yêu cầu spec tới đâu.

**Ưu tiên 4 (Vấn đề 4):** Tier 1 có muốn Tier 2 sanity-check Phase 3 trước khi viết Phase 4 không? Tier 2 đề xuất CÓ.

## Phụ lục — Evidence reproducible

```powershell
# Baseline
git log --oneline -3
git status --short

# Schema OK
grep -E "(model (StaffingOrder|ProjectAssignment|SourceClaim))" prisma/schema.prisma

# Permission catalog OK
grep -E "CAN_(VIEW_UNASSIGNED_POOL|OVERRIDE_REFERRAL_GUARD)" src/shared/auth/permission-catalog.ts

# UI shared OK
ls src/shared/ui/

# Helpers Phase 3 OK
ls src/shared/integrity/

# Tier 2 pre-round 1 đã tạo 4 dir
ls app/admin/
```

---

> Hết báo cáo. Tier 2 dừng đợi Tier 1 phản hồi 4 vấn đề trên.
