# TASK: hrp-p1-portals

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-portals` |
| Work type | `CODE + INFRA` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner (Product & Architecture Decision Owner) |
| Executor | Tier 2 (agent ngoài — sếp giao qua Cursor: `/code hrp-p1-portals`) |
| Auditor | Tier 3 (independent context) |
| Baseline | `aa57fa2` — Phase 5 ACCEPTED + production deploy 18/08 (548 tests, 11/11 AC, dpl_GjUyqLQdSC2A5HPnTKwx3hB2XS56, hrpartner.vn chạy code mới) |
| Modules | P1 — External Portals: Worker PWA + Vendor Portal + CTV Dashboard (4–6 tuần) |
| ADR references | ADR-013 (LOCKED bất biến), D16-b (outbox + cron), G13 (kho hồ sơ vendor), G17 (dispute SLA), G21-T14 (write-behind check-in), G22 (data isolation), UNIFIED_PLAN §4.2 + §11 |
| Current execution round | 0 (chưa chạy) |
| Current audit round | 0 (chưa mở) |
| Next gate | `/code hrp-p1-portals` (sếp giao Tier 2) |
| Updated | 2026-08-18 ICT |

## 1. Outcome

### User-visible outcome

Ba cổng bên ngoài chạy thật trên production subdomain, đúng PHASE_KHOAHOC §P1:

- **vendor.hrpartner.vn** — vendor đăng nhập → xem nhu cầu tuyển đang mở (vị trí, ca, số lượng còn), nộp ứng viên (kèm dedup hint SĐT/CCCD), theo dõi trạng thái NEW → SCREENING → QUALIFIED / REJECTED (kèm lý do) / MERGED, **kho hồ sơ nộp lại 1 chạm** (G13), xác nhận/phản đối biên bản đối soát (SLA 3 ngày, tối đa 2 vòng — G17), xuất biên bản.
- **worker.hrpartner.vn (PWA)** — worker đăng nhập → chấm công GPS có evidence (geofence theo Site, offline queue IndexedDB đồng bộ khi online), xem lịch sử chấm công của mình, phản ánh/tạm ứng (ticket của mình), nhận push notification.
- **ctv.hrpartner.vn** — CTV đăng nhập → xem danh sách source claim của mình + trạng thái từng claim, tích lũy dự kiến (hiển thị từ dữ liệu claim — engine hoa hồng thật là P2), xem + copy mã giới thiệu (affCode).

Đồng thời **đóng FO-01** (Phase 5): tạo DB roles NOLOGIN thật cho các role ngoài, verify RLS functional không còn vacuous.

### Non-goals

- Không native app, không eKYC (PHASE_KHOAHOC §P1 — deferred V4 §5).
- Không commission engine thật / ledger (P2); CTV chỉ xem "tích lũy dự kiến".
- Không payroll / payslip (P3).
- Không PM Field App (D-07) — tách task sau.
- Không Zalo login/notification (FEATURE_FLAGS `zaloLogin` = false).
- Không wire public job board với domain thật (Q-04 — P2).
- Không đụng `appBCC/*`, `docs/consolidation_plan.md`, `docs/tasks/hrp-defectfix-code-review/`.
- Không sửa logic service/route Phase 0–5 đã ACCEPT — chỉ mở rộng (thêm route mới, thêm cột nullable), không đổi hành vi route cũ.

## 2. Evidence

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/PHASE_KHOAHOC_V1.md:229-242` | P1 = 3 cổng ngoài tương ứng 3 role độc lập, 4–6 tuần. Bắt buộc: Worker PWA (GPS evidence + offline + push), Vendor Portal (confirm/dispute statement + audit + SLA), CTV Dashboard (source claim overview + commission cumulative). Không đụng native app / eKYC | Khung RQ/STEP ánh xạ đúng |
| `EV-02` | `docs/MODULE_TACH_V2.md:309` | P1 — External Portals: Worker PWA, vendor submission/confirm, CTV dashboard, GPS evidence theo metric | Khớp EV-01 |
| `EV-03` | `docs/UNIFIED_PLAN_v4.md:523-560` (§4.2) | URL structure: vendor subdomain `vendor.hrpartner.vn` cùng app qua middleware `ALLOWED_HOSTS` + rewrite; plan cũ để Worker Portal ở root (mobile-first) | DEC-01: subdomain đều cho 3 cổng vì root đang là job board |
| `EV-04` | `docs/UNIFIED_PLAN_v4.md:1883-1908` (§11.1-11.3) | Vendor: cookie domain `hrpartner.vn` dùng chung; integration test hostname BẮT BUỘC; flow 6 bước (login → xem order → nộp ứng viên → trạng thái → confirm/dispute → xuất biên bản); statement workflow DRAFT → SENT → CONFIRMED/DISPUTED → LOCKED → PAID; G17: `dispute_count` tối đa 2 vòng + `confirm_deadline_at` SLA 3 ngày + AUTO-CONFIRMED + FORCE LOCK (HR_MANAGER/ACCOUNTANT) | RQ-06/07; auto-confirm cron Phase 5 đã có — chỉ cần endpoint vendor-scoped |
| `EV-05` | `docs/UNIFIED_PLAN_v4.md:1927-1938` (§11.5) + §5.3 C-07 | Kho hồ sơ vendor (G13): toàn bộ submissions của vendor (mọi trạng thái), nộp lại 1 chạm cho nhu cầu mới, Referral Guard miễn chặn cho chính chủ, đang ACTIVE → hướng dẫn liên hệ HR, chỉ thấy kho của mình; schema đã bỏ UNIQUE(vendor_id, phone) | RQ-08 — schema đã sẵn sàng |
| `EV-06` | `prisma/schema.prisma` | `SystemRole` đủ 13 role (VENDOR_ADMIN, VENDOR_STAFF, CTV, WORKER); `User.vendorId` + `User.affCode`; `Worker.accountUserId`; `CandidateSubmission` đầy đủ (dedup_worker_id, block_code, override_case, index G13); `SourceClaim`; `AttendanceEvent.source` = GPS + status QUEUED/APPENDED/FAILED (G21-T14) + capturedAt/receivedAt; `Site` geofence (latitude/longitude/radiusMeters) | Nền schema gần đủ — chỉ cần cột GPS cho event + bảng push |
| `EV-07` | `middleware.ts` | Chỉ có fence `/bcc` (Phase 1) — chưa multi-domain, chưa subdomain rewrite | STEP-02: mở rộng middleware, giữ nguyên fence bcc |
| `EV-08` | `src/shared/auth/auth-context.ts` | `getAuthContext` ĐÃ có `ctx.vendorId` (từ User.vendorId, dòng 22-23/75-76) + `ctx.workerId` (lookup Worker.accountUserId) | Auth nền đã đủ — STEP-03 chỉ mở rộng login/redirect theo domain |
| `EV-09` | `app/api/jobs/apply/route.ts` + `src/domains/staffing/submission.service.ts` | `applyForJob` service sẵn (tạo CandidateSubmission + dedup/Referral Guard) — public job board đang dùng | RQ-06 tái sử dụng service với ctx vendor |
| `EV-10` | Phase 5 ACCEPTED (TASK.md §9) | Cron outbox + `autoConfirmDisputes` đang chạy production; verify-rls 25/25; FO-01: DB roles `sale_user`/`worker_user` KHÔNG tồn tại → 4 check functional vacuous | RQ-10 đóng FO-01; confirm SLA tự động dựa cron có sẵn |
| `EV-11` | `prisma/schema.prisma` `AttendanceEvent` (615-636) | Event CHƯA có cột GPS lat/long (chỉ `Site` có) — `payloadHash` + `@@unique([source, externalEventId])` idempotent đã có | STEP-01: migration thêm cột GPS nullable |
| `EV-12` | `glob app/**/{manifest,sw,offline}` | KHÔNG có PWA manifest / service worker / push nào trong repo | STEP-04/05: tạo mới toàn bộ |
| `EV-13` | `grep FEATURE_FLAGS src/` | Cơ chế FEATURE_FLAGS (§11.4) chưa tồn tại trong code | STEP tạo `src/shared/feature-flags.ts`; commission luôn false |
| `EV-14` | `prisma/seed.mjs` | Seed hiện có ADMIN + HR_MANAGER + role_permissions nội bộ; chưa có user VENDOR/WORKER/CTV, chưa có worker profile, claims, statement SENT cho demo cổng ngoài | STEP-11: seed mở rộng |
| `EV-15` | `git status` 18/08 | `appBCC/*` dirty (việc sếp) — vùng cấm như Phase 5 | Ghi rõ RISK + Rules |

## 3. Decisions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | 3 subdomain: `vendor.hrpartner.vn`, `worker.hrpartner.vn`, `ctv.hrpartner.vn` — cùng app Next.js, middleware `ALLOWED_HOSTS` + rewrite về `/vendor/*`, `/worker/*`, `/ctv/*`; cookie domain `hrpartner.vn` dùng chung. Khác UNIFIED_PLAN §4.2 (plan cũ để Worker Portal ở root mobile-first): root hiện là job board (Phase 5 đã deploy), chuyển root sẽ phá flow hiện tại — subdomain nhất quán 3 cổng, đổi lại chỉ cần sửa 1 dòng ALLOWED_HOSTS | Planner / UNIFIED_PLAN §4.2, §11.1 | Hiệu lực cả task — sếp xác nhận khi duyệt TASK |
| `DEC-02` | CHOSEN | Middleware mở rộng fail-closed: matcher thêm `/vendor/:path*`, `/worker/:path*`, `/ctv/:path*`; kiểm tra hostname khớp domain; role-domain guard (VENDOR_* chỉ ở vendor domain, WORKER chỉ ở worker domain, CTV chỉ ở ctv domain — sai → redirect domain đúng của role); giữ nguyên fence `/bcc` hiện tại | Planner / EV-04, EV-07 | Hiệu lực cả task |
| `DEC-03` | CHOSEN | GPS evidence: migration thêm cột nullable vào `attendance_events` (gps_latitude/gps_longitude Decimal(10,7), gps_accuracy_meters Int, geofence_result — INSIDE/OUTSIDE/NONE) + `push_subscriptions` (id, userId, endpoint, p256dh, auth, createdAt). Chỉ thêm, không sửa cột cũ; source = GPS; geofence so với `Site.radiusMeters` (mặc định 200m) — ngoài bán kính → risk flag | Planner / EV-06, EV-11 | Hiệu lực cả task |
| `DEC-04` | CHOSEN | Offline-first: PWA lưu check-in vào IndexedDB khi offline → sync batch khi online → `POST /api/worker/checkins` (nhận mảng, idempotent theo payloadHash, status QUEUED → APPENDED — G21-T14). Service worker cache app shell đơn giản, không thư viện mới | Planner / EV-06 | Hiệu lực cả task |
| `DEC-05` | CHOSEN | Push notification: Web Push API + VAPID (env `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`), endpoint `POST /api/push/subscribe` + `public/sw.js`; trigger đầu tiên: ticket của worker đổi trạng thái → push. Thiếu VAPID keys → flag `pushNotify` tự tắt, app vẫn chạy | Planner / PHASE_KHOAHOC §P1 | Hiệu lực cả task |
| `DEC-06` | CHOSEN | Vendor confirm/dispute: endpoint vendor-scoped MỚI `/api/vendor/statements` (GET — chỉ statement của vendorId ctx), `POST /api/vendor/statements/[id]/confirm`, `POST /api/vendor/statements/[id]/dispute` (lý do + bằng chứng); giữ G17 (2 vòng, SLA 3 ngày, AUTO-CONFIRM bởi cron Phase 5); xuất biên bản PDF/Excel tại `/api/vendor/statements/[id]/export`. Không tái dùng `/api/disputes` (admin) | Planner / EV-04, EV-10 | Hiệu lực cả task |
| `DEC-07` | CHOSEN | Kho hồ sơ (G13): kho = `candidate_submissions` của vendor (mọi trạng thái); nút "Nộp cho nhu cầu mới" → chạy Referral Guard (miễn chặn chính chủ — EV-05) → tạo submission mới; người đang ACTIVE → hướng dẫn liên hệ HR (không nộp mới). Reuse `submission.service` | Planner / EV-05, EV-09 | Hiệu lực cả task |
| `DEC-08` | CHOSEN | CTV: `/api/ctv/claims` (claims của ctvId ctx) + `/api/ctv/summary` (đếm theo trạng thái + tích lũy DỰ KIẾN từ claim accepted/merged — KHÔNG tính tiền, engine thật P2) + hiển thị affCode + copy link. Giao diện `/ctv` | Planner / PHASE_KHOAHOC §P1 | Hiệu lực cả task |
| `DEC-09` | CHOSEN | Đóng FO-01: tạo 4 DB roles `NOLOGIN` (`worker_user`, `vendor_user`, `ctv_user`, `sale_user`) — script idempotent `scripts/create-db-roles.cjs` chạy qua `DATABASE_URL_ADMIN`; mở rộng `scripts/verify-rls-phase5.cjs`: role missing → FAIL rõ ràng (không còn nhánh vacuous), functional check thật cho cả 4 role | Planner / EV-10, FO-01 | Hiệu lực cả task — sếp chạy OP-03 (giữ secret) |
| `DEC-10` | CHOSEN | Security matrix mở rộng (vitest integration): 3 role ngoài × bảng scope — WORKER: workers (chính mình), attendance_events, tickets; VENDOR_*: staffing_orders, candidate_submissions, vendor_statements (chỉ vendorId mình); CTV: source_claims, candidate_submissions (chỉ ctvId mình). Role ngoài scope → 0 row / 403. Kèm hostname integration test (EV-04 bắt buộc) | Planner / EV-06, EV-10 | Hiệu lực cả task |
| `DEC-11` | CHOSEN | Feature flags: tạo `src/shared/feature-flags.ts` theo §11.4 (`vendorPortal`, `gpsCheckin`, `pushNotify`, `commission`, `zaloLogin`) — đọc env, default bật cho portal/check-in khi STEP xong, `commission` luôn false (P2), `zaloLogin` false | Planner / EV-13 | Hiệu lực cả task |
| `DEC-12` | CHOSEN | Seed mở rộng (fixture giả, phone masked `09x****xxx` như Phase 5): 1 user VENDOR_ADMIN (+vendorId), 1 WORKER user + Worker profile (accountUserId), 1 CTV user; 2 staffing orders ACTIVE; 1 vendor statement SENT (confirm_deadline_at tương lai); 2-3 source claims ctvId; 1-2 submissions vendor | Planner / EV-14 | Hiệu lực cả task |
| `DEC-13` | CHOSEN | Auth login: `/api/auth/login` giữ nguyên; mở rộng response trả role → client redirect về domain đúng của role (VENDOR_* → vendor.hrpartner.vn, WORKER → worker.hrpartner.vn, CTV → ctv.hrpartner.vn, nội bộ → /admin). Login sai domain → báo lỗi rõ ràng | Planner / DEC-01 | Hiệu lực cả task |

## 4. Contract

### 4.1 RQ — Requirement

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| `RQ-01` | Middleware multi-domain: `ALLOWED_HOSTS` 4 host (hrpartner.vn + 3 subdomain), rewrite `/vendor/*`, `/worker/*`, `/ctv/*`, role-domain guard, fail-closed; fence `/bcc` giữ nguyên; hostname integration test bắt buộc | Must | EV-03, EV-04, EV-07, DEC-01, DEC-02 | Request sai domain-role → redirect/403; hostname test PASS; `/bcc` fence không đổi hành vi |
| `RQ-02` | Auth 3 role ngoài: login phone+password cho VENDOR_ADMIN/VENDOR_STAFF/WORKER/CTV (không tạo user mới qua API — user do admin tạo); ctx vendorId/workerId đã có (EV-08); sau login redirect về domain đúng role | Must | EV-08, DEC-13 | Login test 3 role PASS; ctx đúng vendorId/workerId; redirect đúng domain |
| `RQ-03` | Worker PWA core: manifest + service worker (app shell cache) + UI `/worker` mobile-first (check-in GPS, lịch sử chấm công, ticket của mình) + offline queue IndexedDB | Must | EV-01, EV-12, DEC-04 | Manifest + SW đăng ký được; mở `/worker` trên mobile hiển thị đúng 3 mục; offline → check-in vào queue, online → sync |
| `RQ-04` | GPS check-in: migration cột GPS (EV-11) + `POST /api/worker/checkins` nhận batch idempotent (payloadHash) + geofence vs Site (DEC-03) → ngoài bán kính risk flag | Must | EV-06, EV-11, DEC-03, DEC-04 | `migrate status` up-to-date; check-in ghi event source=GPS + lat/long; gửi lại batch không tạo trùng |
| `RQ-05` | Push notification: `push_subscriptions` + `POST /api/push/subscribe` + `public/sw.js` + trigger ticket-status-change → push; thiếu VAPID keys → flag off không crash | Must | EV-01, EV-12, DEC-05 | Subscribe lưu DB; đổi trạng thái ticket → push gửi được (test với VAPID test keys); thiếu keys → 200 + flag off |
| `RQ-06` | Vendor Portal: UI `/vendor` + `GET /api/vendor/orders` (orders ACTIVE, filter khu vực) + `POST /api/vendor/submissions` (form + dedup hint SĐT/CCCD — reuse `applyForJob` với ctx vendor) + `GET /api/vendor/submissions` (trạng thái NEW/SCREENING/QUALIFIED/REJECTED kèm lý do/MERGED) | Must | EV-04, EV-05, EV-09, DEC-07 | Vendor login xem orders; nộp ứng viên trùng SĐT/CCCD → dedup hint; trạng thái + lý do hiển thị đúng |
| `RQ-07` | Vendor statement confirm/dispute: `GET /api/vendor/statements` (scope vendorId) + confirm + dispute (lý do + bằng chứng, `dispute_count` ≤ 2, `confirm_deadline_at` SLA 3 ngày) + `GET /api/vendor/statements/[id]/export` (PDF hoặc Excel) | Must | EV-04, EV-10, DEC-06 | Vendor xem statement của mình; CONFIRM/DISPUTE đúng G17; quá hạn → AUTO-CONFIRMED (cron có sẵn); export file tải được |
| `RQ-08` | Kho hồ sơ vendor (G13): tab kho (mọi trạng thái) + nộp lại 1 chạm (Referral Guard miễn chặn chính chủ) + đang ACTIVE → hướng dẫn liên hệ HR | Must | EV-05, DEC-07 | Nộp lại thành công; guard không chặn chính chủ, vẫn chặn nguồn khác; ACTIVE → hướng dẫn, không nộp |
| `RQ-09` | CTV Dashboard: UI `/ctv` + `GET /api/ctv/claims` (claims của ctvId) + `GET /api/ctv/summary` (đếm theo trạng thái + tích lũy DỰ KIẾN — không tính tiền) + hiển thị/copy affCode | Must | EV-01, EV-06, DEC-08 | CTV xem đúng claims của mình; summary đúng số liệu; affCode copy được |
| `RQ-10` | Đóng FO-01: script `scripts/create-db-roles.cjs` (idempotent, qua `DATABASE_URL_ADMIN`) tạo 4 role NOLOGIN; `verify-rls-phase5.cjs` mở rộng — role missing = FAIL, functional check THẬT cho 4 role | Must | EV-10, DEC-09 | 4 role tồn tại (`pg_roles`); verify script: functional check chạy thật, exit 0 |
| `RQ-11` | Security matrix mở rộng (DEC-10): 3 role ngoài × bảng scope → role ngoài scope 0 row/403; hostname integration test | Must | EV-04, EV-06, DEC-10 | Matrix mở rộng PASS; hostname test PASS |
| `RQ-12` | Seed mở rộng (DEC-12) đủ demo 3 cổng: vendor/worker/CTV user + orders ACTIVE + statement SENT + claims + submissions | Must | EV-14, DEC-12 | `npx prisma db seed` exit 0; query verify đủ dữ liệu 3 cổng |
| `RQ-13` | Runbook + UAT checklist 3 cổng: DNS subdomain + Vercel domains, VAPID keys, DB roles, UAT từng cổng (login → thao tác → kết quả), rollback | Must | EV-01, PHASE_KHOAHOC §P1 | HANDOFF.md §runbook đủ 5 mục + UAT checklist 3 cổng |
| `RQ-14` | Regression: toàn bộ test Phase 0–5 giữ nguyên xanh (548) + test mới P1 + `next build` + vùng cấm sạch + cron Phase 5 không đổi | Must | EV-10 | `npx vitest run` exit 0 (548 cũ + mới); build exit 0; `git diff` sạch vùng cấm |

### 4.2 Rules

- **Cấm** sửa logic service/route Phase 0–5 đã ACCEPT — chỉ thêm route/cột mới, cột mới phải nullable.
- **Cấm** đụng `appBCC/*`, `docs/consolidation_plan.md`, `docs/tasks/hrp-defectfix-code-review/`.
- **Cấm** `git add -A`/`git add .` — chỉ add đúng file contract.
- **Cấm** `prisma migrate dev/deploy` destructive vào production — chỉ SQL trực tiếp + `migrate resolve --applied` (pattern DEC-03 Phase 5).
- Middleware phải fail-closed (không token → redirect/401) và giữ nguyên hành vi fence `/bcc`.
- Fixture seed là dữ liệu giả, phone masked `09x****xxx`; không dữ liệu thật.
- `commission` feature flag luôn false (P2); `zaloLogin` false.
- Cron Phase 5 (`vercel.json`) giữ nguyên — không sửa (FO-03 đang theo dõi riêng).
- PWA không dùng thư viện mới (pattern React + SW vanilla như DEC-08 Phase 5).

## 5. Execution Plan

Thứ tự slice: **5A nền** (schema + middleware + auth + DB roles) → **5B Worker PWA** → **5C Vendor Portal** → **5D CTV + seed + runbook**. Mỗi slice có thể handoff + audit độc lập nếu sếp muốn cắt round.

| STEP | RQ | Location | What to build | Source | Verify |
|---|---|---|---|---|---|
| `STEP-01` | RQ-04, RQ-05 | `prisma/migrations/*/migration.sql`, `prisma/schema.prisma` | Migration thêm cột GPS nullable vào `attendance_events` + bảng `push_subscriptions` (DEC-03) | EV-06, EV-11, DEC-03 | `npx prisma migrate status` up-to-date (dev + production); cột/bảng tồn tại |
| `STEP-02` | RQ-01 | `middleware.ts` + `src/domains/security/portal-domains.integration.test.ts` | Multi-domain: ALLOWED_HOSTS, rewrite `/vendor|/worker|/ctv`, role-domain guard, fail-closed; hostname integration test | EV-03, EV-07, DEC-01, DEC-02 | Test hostname: sai domain-role → redirect/403; `/bcc` fence nguyên hành vi |
| `STEP-03` | RQ-02 | `app/api/auth/login/route.ts`, `src/shared/auth/*` | Login trả role → client redirect đúng domain (DEC-13); xác nhận ctx vendorId/workerId (EV-08) | EV-08, DEC-13 | Login 3 role ngoài test PASS; redirect đúng |
| `STEP-04` | RQ-03, RQ-04 | `app/worker/**`, `public/manifest.json`, `public/sw.js`, `app/api/worker/checkins/route.ts`, `app/api/worker/attendance/route.ts`, `app/api/worker/tickets/route.ts` | Worker PWA: manifest + SW + UI mobile `/worker` (check-in GPS, lịch sử công, ticket) + offline IndexedDB queue + `POST /api/worker/checkins` batch idempotent + geofence | EV-06, EV-11, EV-12, DEC-03, DEC-04 | Browser mobile: PWA installable; offline queue → online sync; check-in ngoài geofence → risk flag |
| `STEP-05` | RQ-05 | `app/api/push/subscribe/route.ts`, `public/sw.js`, `src/domains/ticketing/*` | Push: subscription endpoint + SW push handler + trigger ticket-status-change; VAPID env, flag off khi thiếu | EV-12, DEC-05 | Subscribe → row DB; ticket đổi trạng thái → push tới device (test VAPID keys); thiếu keys → graceful |
| `STEP-06` | RQ-06, RQ-08 | `app/vendor/**`, `app/api/vendor/orders/route.ts`, `app/api/vendor/submissions/route.ts` | Vendor Portal UI + API: orders ACTIVE (filter khu vực), nộp ứng viên (reuse `applyForJob` ctx vendor, dedup hint), trạng thái + lý do; kho hồ sơ G13 (nộp lại 1 chạm, guard miễn chặn chính chủ, ACTIVE → hướng dẫn HR) | EV-04, EV-05, EV-09, DEC-07 | Vendor login: xem orders, nộp + dedup hint, kho nộp lại 1 chạm đúng G13 |
| `STEP-07` | RQ-07 | `app/api/vendor/statements/route.ts`, `app/api/vendor/statements/[id]/{confirm,dispute,export}/route.ts`, `app/vendor/**` | Confirm/dispute statement vendor-scoped (G17: 2 vòng, SLA 3 ngày) + export PDF/Excel + UI | EV-04, EV-10, DEC-06 | CONFIRM/DISPUTE đúng vòng + SLA; quá hạn AUTO-CONFIRMED (cron); export tải file |
| `STEP-08` | RQ-09 | `app/ctv/**`, `app/api/ctv/claims/route.ts`, `app/api/ctv/summary/route.ts` | CTV Dashboard: claims của mình + trạng thái + summary (tích lũy DỰ KIẾN) + affCode copy | EV-06, DEC-08 | CTV login xem đúng claims; summary đúng; copy affCode |
| `STEP-09` | RQ-10 | `scripts/create-db-roles.cjs`, `scripts/verify-rls-phase5.cjs` | Tạo 4 DB roles NOLOGIN (idempotent) + verify script: role missing = FAIL, functional check thật | EV-10, DEC-09 | `pg_roles` có 4 role; verify exit 0 với check thật |
| `STEP-10` | RQ-11 | `src/domains/security/security-matrix.integration.test.ts` | Matrix mở rộng: 3 role ngoài × bảng scope → 0 row/403 | EV-06, DEC-10 | `npx vitest run` matrix mở rộng PASS |
| `STEP-11` | RQ-12 | `prisma/seed.mjs` | Seed mở rộng: vendor/worker/CTV user + orders ACTIVE + statement SENT + claims + submissions | EV-14, DEC-12 | `npx prisma db seed` exit 0; query verify đủ |
| `STEP-12` | RQ-13 | `docs/tasks/hrp-p1-portals/HANDOFF.md` | Runbook: DNS subdomain + Vercel domains, VAPID keys, DB roles, UAT checklist 3 cổng, rollback | EV-01, PHASE_KHOAHOC §P1 | HANDOFF §runbook đủ 5 mục + UAT 3 cổng |
| `STEP-13` | RQ-14 | toàn repo (test) | Regression: vitest toàn bộ + build + diff vùng cấm + cron không đổi | EV-10 | vitest exit 0 (548 cũ + mới); build exit 0; diff sạch |

## 6. Acceptance

| AC | Verify | Evidence | Criteria |
|---|---|---|---|
| `AC-01` | Middleware multi-domain + fence bcc giữ nguyên | `npx vitest run -- portal-domains` PASS; hostname test PASS | PASS |
| `AC-02` | Auth 3 role ngoài: login + ctx + redirect | Test login VENDOR_ADMIN/WORKER/CTV → ctx đúng vendorId/workerId; redirect đúng domain | PASS |
| `AC-03` | Worker PWA: manifest + SW + UI + offline queue | Browser mobile `/worker` hiển thị check-in/lịch sử/ticket; offline → queue, online → sync; Lighthouse installable | PASS |
| `AC-04` | GPS check-in: migration + batch idempotent + geofence | `migrate status` up-to-date; event source=GPS có lat/long; gửi lại batch → không trùng; ngoài geofence → risk flag | PASS |
| `AC-05` | Push: subscribe + trigger ticket + graceful khi thiếu keys | Subscribe → row DB; ticket đổi trạng thái → push; unset VAPID → flag off, không crash | PASS |
| `AC-06` | Vendor orders + submission + dedup hint + trạng thái | Login vendor → xem orders; nộp trùng SĐT/CCCD → dedup hint; trạng thái + lý do đúng | PASS |
| `AC-07` | Vendor confirm/dispute + export | CONFIRM/DISPUTE ≤ 2 vòng, SLA 3 ngày; quá hạn → AUTO-CONFIRMED; export PDF/Excel tải được | PASS |
| `AC-08` | Kho hồ sơ G13 | Nộp lại 1 chạm OK; guard miễn chặn chính chủ + vẫn chặn nguồn khác; ACTIVE → hướng dẫn HR | PASS |
| `AC-09` | CTV dashboard | Claims đúng ctvId; summary đúng; affCode copy | PASS |
| `AC-10` | DB roles + verify RLS thật (đóng FO-01) | `pg_roles` 4 role; `node scripts/verify-rls-phase5.cjs` exit 0, functional check thật | PASS |
| `AC-11` | Security matrix mở rộng | `npx vitest run -- security-matrix` PASS | PASS |
| `AC-12` | Seed đủ 3 cổng | `npx prisma db seed` exit 0; query verify: ≥1 vendor user, ≥1 worker user + profile, ≥1 CTV user, ≥2 orders ACTIVE, ≥1 statement SENT, ≥2 claims, ≥1 submission | PASS |
| `AC-13` | Runbook + UAT checklist | HANDOFF.md: DNS subdomain, Vercel domains, VAPID, DB roles, UAT 3 cổng, rollback | PASS |
| `AC-14` | Regression toàn bộ | `npx vitest run` exit 0 (548 cũ giữ nguyên + mới); `npm run build` exit 0; `git diff --name-only` sạch vùng cấm | PASS |

### Traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-02 | AC-01 |
| RQ-02 | STEP-03 | AC-02 |
| RQ-03 | STEP-04 | AC-03 |
| RQ-04 | STEP-01, STEP-04 | AC-04 |
| RQ-05 | STEP-01, STEP-05 | AC-05 |
| RQ-06 | STEP-06 | AC-06 |
| RQ-07 | STEP-07 | AC-07 |
| RQ-08 | STEP-06 | AC-08 |
| RQ-09 | STEP-08 | AC-09 |
| RQ-10 | STEP-09 | AC-10 |
| RQ-11 | STEP-10 | AC-11 |
| RQ-12 | STEP-11 | AC-12 |
| RQ-13 | STEP-12 | AC-13 |
| RQ-14 | STEP-13 | AC-14 |

## 7. Risk

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| `RISK-01` | Mở rộng middleware có thể vỡ fence `/bcc` + job board root đang chạy production | HIGH | Hostname integration test bắt buộc (EV-04); giữ nguyên matcher/behavior bcc; deploy P1 phía sau deploy Phase 5 còn nguyên |
| `RISK-02` | RLS FORCE trên production + DB roles NOLOGIN mới có thể khóa login worker/vendor nếu policy chưa đủ | HIGH | STEP-09 verify RLS trước khi bật cổng; matrix mở rộng (STEP-10); thử trên dev/staging trước production |
| `RISK-03` | DNS subdomain chưa trỏ/Vercel chưa gán domain → UAT production bị chặn | MED | OP-01 sớm (việc sếp); Tier 2 test bằng host header local trước |
| `RISK-04` | Web push phụ thuộc VAPID keys + browser support | MED | DEC-05: thiếu keys → flag off graceful; test bằng VAPID keys test |
| `RISK-05` | Offline queue sync có thể tạo event trùng | MED | Idempotent payloadHash + `@@unique([source, externalEventId])` đã có (EV-11) |
| `RISK-06` | Scope 4–6 tuần lớn, 1 round dễ nặng/quá tải audit | MED | Chia 4 slice (5A→5D), mỗi slice handoff độc lập được |
| `RISK-07` | `appBCC/*` dirty có thể bị stage nhầm (bài học Phase 5) | LOW | Cấm `git add -A`; Planner kiểm tra diff trước ACCEPT |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | DEC-01: worker/CTV dùng subdomain (khác UNIFIED_PLAN §4.2 để root cho job board) — sếp xác nhận khi duyệt TASK | Sếp | Khi duyệt TASK | Không — đổi lại chỉ 1 dòng ALLOWED_HOSTS |
| `Q-02` | OP-01: DNS 3 subdomain (vendor/worker/ctv CNAME → Vercel) + gán domain trong Vercel project — ai thao tác? | Sếp/người giữ domain | Trước UAT production | Không — OP, Tier 2 test host header local |
| `Q-03` | OP-02: VAPID keys (`npx web-push generate-vapid-keys`) — sếp tạo + set env Vercel | Sếp | Trước STEP-05 verify push thật | Không — thiếu keys → flag off |
| `Q-04` | OP-03: chạy `scripts/create-db-roles.cjs` với `DATABASE_URL_ADMIN` (secret sếp giữ) | Sếp | Trước bật cổng | Không — STEP-09 viết sẵn script idempotent |
| `Q-05` | OP-04: UAT 3 cổng với user thật (1 vendor thật confirm 1 biên bản) | Sếp | Trước nghiệm thu P1 | Không — OP |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

## 10. Revision Log

| Version | Date | Change | Author |
|---|---|---|---|
| `v1.0` | 2026-08-18 | Planner soạn TASK từ PHASE_KHOAHOC §P1 + UNIFIED_PLAN §4.2/§11 + MODULE_TACH_V2. 14 RQ / 13 STEP / 14 AC / 13 DEC / 7 RISK / 5 Q. verify-task.ps1 PASS exit 0. Commit + push → báo sếp gõ `/code hrp-p1-portals` | Tier 1 — Planner |
