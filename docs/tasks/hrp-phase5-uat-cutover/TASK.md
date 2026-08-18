# TASK: hrp-phase5-uat-cutover

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase5-uat-cutover` |
| Work type | `CODE + INFRA + OPS` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner (Product & Architecture Decision Owner) |
| Executor | Tier 2 (agent ngoài — sếp giao qua Cursor: `/code hrp-phase5-uat-cutover`) |
| Auditor | Tier 3 (independent context) |
| Baseline | `614dca5` — Phase 4 ACCEPTED (18/08, 437 tests, 4 slice, 7 round) |
| Modules | M2 (Job Board), M3 (CRM/Staffing), M4 (Đối soát), M7 (Chấm công), M9 (Infra) |
| ADR references | ADR-014 (idempotency + outbox), D16-b (outbox in-process + cron), ADR-013 (LOCKED bất biến) |
| Current execution round | 1 (chờ /code: STEP-01..07) |
| Current audit round | 0 (chưa audit) |
| Next gate | `/code` → `/audit` → `/resolve` → `ACCEPTED` |
| Updated | 2026-08-18 14:27 ICT |

## 1. Outcome

### User-visible outcome

Sau Phase 5 (2 tuần), HRP chạy được trên **production Neon** với 1 dự án thật, 1 vendor thật, 1 client thật (go-live đợt 1 giới hạn scope). **Tất cả UI admin không còn dữ liệu mock** — fetch từ API thật. Cron outbox + dispute auto-confirm chạy tự động. Security matrix 13 role × 8 bảng PASS. Runbook deploy/rollback có chữ ký sếp.

### Non-goals

- Không wire UI vendor portal / client portal / worker PWA (P1 — Phase sau).
- Không wire UI public job board với domain thật (Q-04 — P2).
- Không payroll tính lương/thuế thật (P3).
- Không shadow reconciliation data thật (OP-01 — sếp tự làm, DEC-06).
- Không deployment production thật (OP-04 — sếp/người làm, chỉ chuẩn bị runbook).
- Không đụng `appBCC/*`, `docs/consolidation_plan.md`, `docs/tasks/hrp-defectfix-code-review/` (việc riêng).
- Không sửa logic Phase 4 đã ACCEPT (chỉ wire UI, không đổi service/route).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/PHASE_KHOAHOC_V1.md:207-225` | Phase 5 = 2 tuần, 2 kỳ shadow + load test + runbook + go-live; DoD: 104 case security matrix, runbook ký sếp, cutover dry-run, go-live đợt 1 | STEP + OP ánh xạ đúng DoD |
| `EV-02` | `docs/tasks/hrp-phase4-vertical-slices/TASK.md` (v2.0 ACCEPTED) | Phase 4: 437 tests, 17 AC, 21 RQ, 21 STEP, 4 slice ACCEPTED; RLS 25 policy trên 13 migration; outbox in-process + cron handler đã code; dispute auto-confirm handler `dispute.service.ts:289` | Baseline vững — không cần code lại service/route, chỉ wire UI + cron + production apply |
| `EV-03` | `app/admin/jobs/page.tsx` | MockJob (3 dòng), MockSubmission (2 dòng), MockClaim (2 dòng) — 0 fetch API | STEP-01: wire toàn bộ |
| `EV-04` | `app/(jobs)/page.tsx` | MOCK_JOBS (3 job cứng) — không gọi GET `/api/jobs`; form apply gọi API thật | STEP-01: wire listing |
| `EV-05` | `app/admin/reconciliation/page.tsx` | MOCK_STATEMENTS (3 dòng) cho listing — không fetch; margin fetch thật | STEP-01: wire listing |
| `EV-06` | `app/admin/attendance/page.tsx` | MOCK_BATCHES, MOCK_PERIODS, MOCK_UNMATCHED_ROWS cho listing; resolve + adjustments fetch thật | STEP-01: wire listing |
| `EV-07` | `app/admin/staffing/page.tsx` | Đã fetch `/api/staffing/orders` — wire đủ | STEP-01: không cần sửa (xác nhận PASS) |
| `EV-08` | `npx prisma migrate status` (18/08) | 12/13 applied, 1 pending: `20260817160000_s1_rls_attendance_timesheet` | STEP-02: apply production theo DEC-NEW-04/05 |
| `EV-09` | `src/shared/integrity/outbox.ts` + `src/domains/reconciliation/dispute.service.ts:289-340` | `drainOutbox` + `autoConfirmDisputes` đã code, idempotent, actor `system:cron` | STEP-03: wire cron schedule |
| `EV-10` | `prisma/schema.prisma` role enum + `src/shared/auth/permission-catalog.ts` | 13 role × 8 bảng chính: workers, projects, vendors, staffing_orders, attendance_events, timesheet_periods, vendor_statements, client_statements | STEP-04: security matrix 104 case |
| `EV-11` | `prisma/seed.mjs` | Seed Phase 0 dùng mock data chuẩn (An Phat/Yen Phong/Sao Viet), chưa đủ cho demo 3 moment F00A | STEP-05: seed đủ worker, project, vendor, timesheet, statement |
| `EV-12` | `git status` 18/08 | `appBCC/*` dirty (4 file, +597 -111) — việc sếp; `docs/consolidation_plan.md` untracked; `apply-changes.mjs` + `write_script.py` + `do_write.py` stray | Không đụng — ghi rõ trong RISK |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Gom UI wire (Phase 4 4D mockup) vào Phase 5 — không tách task riêng | Sếp chốt 18/08 | Hiệu lực cả task |
| `DEC-02` | CHOSEN | Cron dùng Vercel Cron Jobs (`vercel.json` cron schedule) gọi API route handler `/api/cron/outbox` + `/api/cron/disputes`; mỗi 5 phút, idempotent | Sếp chốt 18/08 / D16-b | Hiệu lực cả task |
| `DEC-03` | CHOSEN | Production RLS apply migration `20260817160000` theo DEC-NEW-04/05: SQL trực tiếp qua `DATABASE_URL_ADMIN` + `prisma migrate resolve --applied` (shadow DB + `portal_timesheets` raw của appBCC) | Planner / DEC-NEW-04/05 (sếp chấp thuận 17/08) | Hiệu lực cả task |
| `DEC-04` | CHOSEN | Security matrix: vitest integration test, 13 role × 8 bảng = 104 case, verify role ngoài scope → 0 row hoặc 403 | Planner / PHASE_KHOAHOC §5 DoD | Hiệu lực cả task |
| `DEC-05` | CHOSEN | Seed script: `prisma/seed.mjs` mở rộng đủ 3 moment F00A (ít nhất 5 worker, 3 project, 2 vendor, 1 timesheet period LOCKED, 1 statement SENT) | Planner | Hiệu lực cả task |
| `DEC-06` | CHOSEN | OP-01 (shadow reconciliation 2 kỳ) — sếp tự làm, không giao Tier 2 | Sếp chốt 18/08 | Hiệu lực cả task |
| `DEC-07` | CHOSEN | OP-02 (load test) — Tier 2 làm: viết 3 k6 script (`scripts/load-test/`) + chạy + báo cáo p95 < 2s (STEP-07) | Sếp chốt 18/08 | Hiệu lực cả task |
| `DEC-08` | CHOSEN | UI wire pattern: dùng React state + `useEffect` fetch API, loading/error state, giữ nguyên CSS class Phase 4 | Planner | Hiệu lực cả task |

## 4. Contract — Requirements

### 4.1 RQ — Requirement

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| `RQ-01` | Wire UI admin jobs + public job board: fetch từ API thật (`GET /api/jobs`, `GET /api/jobs/submissions`, `GET /api/jobs/claims`, `POST /api/jobs/apply`), xóa toàn bộ `MOCK_*` cứng | Must | EV-03, EV-04, DEC-01 | Admin jobs: list jobs/submissions/claims từ API; Public: list jobs từ API |
| `RQ-02` | Wire UI admin reconciliation: fetch listing từ API thật (`GET /api/statements?type=vendor`, `GET /api/statements?type=client`), xóa `MOCK_STATEMENTS` | Must | EV-05, DEC-01 | Bảng statement hiển thị dữ liệu thật từ DB |
| `RQ-03` | Wire UI admin attendance: fetch listing từ API thật (`GET /api/attendance/import`, `GET /api/attendance/timesheet`), xóa `MOCK_BATCHES`, `MOCK_PERIODS`, `MOCK_UNMATCHED_ROWS` | Must | EV-06, DEC-01 | Tab Import/Kỳ công hiển thị dữ liệu thật |
| `RQ-04` | Apply production RLS migration `20260817160000_s1_rls_attendance_timesheet` (6 bảng 4B) theo DEC-NEW-04/05 + verify script: 7 bảng × policy, role ngoài scope → 0 row | Must | EV-08, DEC-03 | `migrate status` up-to-date; verify script exit 0 |
| `RQ-05` | Deploy cron outbox drain: `vercel.json` cron schedule → `GET /api/cron/outbox`, gọi `drainOutbox` idempotent | Must | EV-09, DEC-02, D16-b | Cron route trả 200; outbox events được drain |
| `RQ-06` | Deploy cron dispute auto-confirm: `vercel.json` cron schedule → `GET /api/cron/disputes`, gọi `autoConfirmDisputes` idempotent | Must | EV-09, DEC-02, DEC-07 (Phase 4) | Dispute quá hạn SLA → AUTO-CONFIRMED sau cron |
| `RQ-07` | Security matrix test: 13 role × 8 bảng chính = 104 case, vitest integration, verify role ngoài scope → 0 row / 403 | Must | EV-10, DEC-04, PHASE_KHOAHOC §5 DoD | 104/104 PASS |
| `RQ-08` | Seed script đủ cho demo 3 moment F00A: ít nhất 5 worker, 3 project, 2 vendor, 1 timesheet period LOCKED, 1 statement SENT | Must | EV-11, DEC-05 | `npx prisma db seed` → demo đủ 3 moment |
| `RQ-09` | Runbook production: deploy steps (Vercel + Neon), rollback plan, incident response, env vars checklist, cron schedule | Must | PHASE_KHOAHOC §5 DoD | File `HANDOFF.md` §runbook đủ 5 mục |
| `RQ-10` | Xác nhận UI admin staffing đã wire (EV-07) — không cần sửa, chỉ audit + ghi nhận | Should | EV-07 | Audit PASS |
| `RQ-11` | Load test: k6 script 5.000 check-in / 100 transfer / 20 statement song song, chạy + báo cáo p95 < 2s | Must | PHASE_KHOAHOC §5 DoD, DEC-07 | Report p95 < 2s |

### 4.2 Rules

- **Cấm** sửa logic service/route Phase 4 đã ACCEPT (chỉ wire UI, không đổi backend).
- **Cấm** đụng `appBCC/*`, `docs/consolidation_plan.md`, `docs/tasks/hrp-defectfix-code-review/`.
- **Cấm** `git add -A`/`git add .` — chỉ add đúng file contract.
- **Cấm** `prisma migrate dev/deploy` destructive vào production — chỉ SQL trực tiếp + `migrate resolve --applied`.
- UI wire dùng `useEffect` + `fetch` + `useState` (loading/error/data) — pattern React chuẩn, không cần thư viện mới.
- Cron route phải idempotent (gọi lại nhiều lần không tạo hiệu ứng phụ).
- Seed script dùng fixture giả (DEC-14 Phase 4), dữ liệu mẫu chuẩn (An Phat/Yen Phong/Sao Viet), phone masked `09x****xxx`.

## 5. Execution Plan

| STEP | RQ | Location | What to build | Source | Verify |
|---|---|---|---|---|---|
| `STEP-01` | RQ-01,02,03,10 | `app/(jobs)/page.tsx`, `app/admin/jobs/page.tsx`, `app/admin/reconciliation/page.tsx`, `app/admin/attendance/page.tsx` | Wire UI: xóa `MOCK_*`, thêm `useEffect` fetch API thật, loading/error state; riêng staffing xác nhận PASS (EV-07) | EV-03..07, DEC-08 | Mở browser: admin jobs/reconciliation/attendance hiển thị dữ liệu từ API; public job board fetch từ `/api/jobs` |
| `STEP-02` | RQ-04 | `prisma/migrations/20260817160000*/migration.sql` + `scripts/verify-rls-phase5.cjs` | Apply migration pending lên production + script verify 7 bảng × policy | EV-08, DEC-03 | `migrate status` up-to-date; verify script: role ngoài scope → 0 row |
| `STEP-03` | RQ-05,06 | `vercel.json` + `app/api/cron/outbox/route.ts` + `app/api/cron/disputes/route.ts` | 2 route cron handler + `vercel.json` cron schedule (mỗi 5 phút) | EV-09, DEC-02 | `GET /api/cron/outbox` → 200, events drained; `GET /api/cron/disputes` → 200, SLA-quá-hạn auto-confirmed |
| `STEP-04` | RQ-07 | `src/domains/security/security-matrix.integration.test.ts` | 13 role × 8 bảng = 104 case, dùng mock in-memory (DEC-14) | EV-10, DEC-04 | `npx vitest run` 104/104 PASS |
| `STEP-05` | RQ-08 | `prisma/seed.mjs` | Mở rộng seed: 5 worker, 3 project, 2 vendor, 1 timesheet LOCKED, 1 statement SENT | EV-11, DEC-05 | `npx prisma db seed` → seed thành công; query verify đủ dữ liệu 3 moment |
| `STEP-06` | RQ-09 | `docs/tasks/hrp-phase5-uat-cutover/HANDOFF.md` | Runbook: deploy steps, rollback plan, incident response, env vars checklist, cron schedule | PHASE_KHOAHOC §5 | HANDOFF.md §runbook đủ 5 mục |
| `STEP-07` | RQ-11 | `scripts/load-test/k6-checkin.js` + `scripts/load-test/k6-transfer.js` + `scripts/load-test/k6-statement.js` | 3 k6 script + chạy + báo cáo p95 | PHASE_KHOAHOC §5, DEC-07 | `k6 run` → p95 < 2s |

## 6. Acceptance

| AC | Verify | Evidence | Criteria |
|---|---|---|---|
| `AC-01` | UI wire: admin jobs + public job board fetch API thật, không còn MOCK_* | Browser + `grep -c "MOCK_" app/(jobs)/page.tsx app/admin/jobs/page.tsx` = 0 | PASS |
| `AC-02` | UI wire: admin reconciliation + attendance fetch API thật, không còn MOCK_* | Browser + `grep -c "MOCK_" app/admin/reconciliation/page.tsx app/admin/attendance/page.tsx` = 0 | PASS |
| `AC-03` | UI staffing xác nhận wire (EV-07) — audit PASS | `grep "fetch.*api/staffing" app/admin/staffing/page.tsx` ≥ 2 | PASS |
| `AC-04` | Production RLS applied + verify 7 bảng × policy | `npx prisma migrate status` up-to-date; `node scripts/verify-rls-phase5.cjs` exit 0 | 7/7 PASS |
| `AC-05` | Cron outbox + dispute hoạt động | `GET /api/cron/outbox` → 200; `GET /api/cron/disputes` → 200; dispute quá hạn → AUTO-CONFIRMED | PASS |
| `AC-06` | Security matrix 104/104 PASS | `npx vitest run -- src/domains/security/security-matrix` 104/104 | PASS |
| `AC-07` | Seed script đủ 3 moment F00A | `npx prisma db seed` exit 0; query verify: ≥5 worker, ≥3 project, ≥2 vendor, ≥1 timesheet LOCKED, ≥1 statement SENT | PASS |
| `AC-08` | HANDOFF runbook đủ 5 mục | `HANDOFF.md` có: deploy steps, rollback plan, incident response, env vars, cron schedule | PASS |
| `AC-09` | Regression: vitest toàn bộ + build + vùng cấm | `npx vitest run` ≥ 437 exit 0; `npm run build` exit 0; `git diff --name-only` sạch vùng cấm | PASS |
| `AC-10` | Không regression defectfix (route.ts:28 workerId check) | `grep "body.workerId !== sessionUser.workerId" app/api/tickets/route.ts` = 1 | PASS |
| `AC-11` | Load test k6: 5.000 check-in, 100 transfer, 20 statement → p95 < 2s | `k6 run scripts/load-test/*.js` → p95 < 2s | PASS |

### Traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-01 | AC-02 |
| RQ-03 | STEP-01 | AC-02 |
| RQ-04 | STEP-02 | AC-04 |
| RQ-05 | STEP-03 | AC-05 |
| RQ-06 | STEP-03 | AC-05 |
| RQ-07 | STEP-04 | AC-06 |
| RQ-08 | STEP-05 | AC-07 |
| RQ-09 | STEP-06 | AC-08 |
| RQ-10 | STEP-01 | AC-03 |
| RQ-11 | STEP-07 | AC-11 |

## 7. Risk

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| `RISK-01` | `appBCC/*` dirty (4 file, +597 -111) có thể bị stage nhầm (bài học round 2a) | HIGH | Cấm `git add -A`; Tier 2 chỉ add file trong contract; Planner kiểm tra diff trước ACCEPT |
| `RISK-02` | Migration RLS apply production sai (DEC-NEW-04/05) có thể khóa quyền toàn bộ user | HIGH | Apply SQL trực tiếp + verify script + dry-run trên staging trước production |
| `RISK-03` | Cron route public accessible → spam/DOS | MED | Route handler có rate-limit implicit (Vercel cron gọi nội bộ); thêm secret header nếu cần |
| `RISK-04` | UI wire làm thay đổi layout hiện tại → vỡ giao diện | MED | Giữ nguyên CSS class, chỉ thay data source; không đổi component structure |
| `RISK-05` | `docs/tasks/hrp-defectfix-code-review/` đang REVISION_REQUIRED (round 2) — có thể conflict với Phase 5 | LOW | Task riêng, Planner riêng; không block Phase 5 |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | OP-01 (shadow reconciliation 2 kỳ) — data thật tháng 06+07 ở đâu? Ai chạy? ✅ Đã trả lời 18/08 (DEC-06): sếp tự làm, không giao Tier 2 | Sếp | Trước OP-01 | Không — OP, không phải STEP |
| `Q-02` | OP-02 (load test) — dùng k6 hay artillery? Ai viết script? ✅ Đã trả lời 18/08 (DEC-07): k6, Tier 2 làm — thành STEP-07 | Sếp | Trước OP-02 | Không — đã thành STEP-07 |
| `Q-03` | OP-03 (cutover dry-run) — staging Neon riêng đã có chưa? | Sếp | Trước OP-03 | Không — OP |
| `Q-04` | OP-04 (go-live đợt 1) — chọn dự án/vendor/client nào? | Sếp | Trước OP-04 | Không — OP |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| — | — | — | Chưa có audit | — | — |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-18 | Initial contract — 6 STEP (wire UI + RLS + cron + security matrix + seed + runbook) + 4 OP (shadow + load test + dry-run + go-live). Baseline: Phase 4 ACCEPTED (`614dca5`, 437 tests) | Sếp chốt 18/08: gộp UI wire Phase 4 4D vào Phase 5 UAT/GO-LIVE |
| `v1.1` | 2026-08-18 | Sếp chốt 3 câu: OP-01 sếp tự làm (DEC-06); OP-02 → STEP-07 giao Tier 2 viết k6 (DEC-07, RQ-11, AC-11); Cron = Vercel Cron Jobs (DEC-02). Còn **7 STEP + 3 OP** | Chốt theo câu hỏi Planner (tiếng Việt), 18/08 14:27 |