# TASK: hrp-v5-go-live-04-public-read-rls-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-04-public-read-rls-closure` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — độc lập |
| Baseline | `776a3c1` trên `main`; nếu `hrp-v5-go-live-03-admin-surface-truth` đã commit trước round này thì khoá lại baseline bằng `git log -1` và ghi SHA thật vào HANDOFF |
| Modules | `app/api/jobs` + `src/shared/auth` (principal đọc công khai) + `src/domains/job-board` |
| ADR references | None |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `verify-task.ps1` PASS rồi Tier 1 giao `/code` sau khi round 03 đóng |
| Updated | `2026-08-30 Asia/Bangkok` |

Task này là defect P0: bề mặt việc làm công khai trên live đang CHẾT. Chẩn đoán đã trọn vẹn từ phiên 29/08 và nằm ở §2 — Tier 2 KHÔNG điều tra lại từ đầu.

Quy tắc một execution stream của Owner 27/08 vẫn hiệu lực: task này chỉ được giao `/code` sau khi go-live-03 đóng. Lúc khoá contract, worktree có 7 file source do Tier 2 đang sửa dở go-live-03 cộng `public/index.html` và `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md`. Cấm stage, cấm restore, cấm dọn, cấm commit hộ bất kỳ file nào ngoài scope §4.2.

## 1. Outcome

### User-visible outcome

Khách vô danh — không cookie, không session — mở `www.hrpartner.vn` và thấy đúng những dự án mà Owner đã Publish, mở được trang chi tiết của từng dự án đó, và tới được form nộp đơn. Cụ thể sau khi task này lên `main` và Owner deploy:

- `GET /api/jobs` trả `total` ≥ 1 và mảng `jobs` chứa dự án đã publish.
- `GET /api/jobs/DA-DEMO-001` trả `200` kèm DTO của dự án, không còn `404 NOT_FOUND`.
- Dự án chưa publish, không `ACTIVE`, hết `deadlineDate` hoặc hết `validTo` vẫn KHÔNG xuất hiện — sửa đường đọc, không nới điều kiện hiển thị.
- Bước OP đang bị chặn của Owner (nộp một đơn thật để chứng minh `hrp_public_apply_submission` end-to-end) mở lại được vì trang chi tiết đã tới được.

### Non-goals

- Nội dung card trên trang chủ (salary bịa bằng `availableSlots`, company/location/schedule cứng, 4 trên 5 ô lọc là đồ trang trí) — thuộc `hrp-v5-go-live-05-public-card-truth`.
- Tách `FOR SELECT` khỏi `FOR ALL` trong 3 policy RLS của project — cần migration, là follow-up bảo mật, xem `DEC-03` và `RISK-02`.
- Thêm DB role riêng cho khách vô danh và 3 policy `FOR SELECT` mới (phương án B) — cần migration nên ngoài scope, xem `DEC-01`.
- Gom 4 bề mặt job và 3 hàm list công khai về một đường — follow-up kiến trúc.
- Mọi thay đổi trên đường apply/tracking qua RPC `hrp_public_apply_submission` và `hrp_public_tracking_projection` — đang chạy đúng, không chạm.
- `packages/job-board` mock dùng bởi `/job-board` — không phải đường DB.
- Deploy production. Deploy là push `main` và thuộc Owner; task không tự deploy.
- Sửa rate limit, cache, observability.

## 2. Evidence và Baseline

Chẩn đoán dưới đây đã đọc source thật, không suy đoán. Tier 2 dùng lại, không điều tra lại.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | Đo live 29/08: `GET https://www.hrpartner.vn/api/jobs` | `200` với body `{"jobs":[],"total":0}`, `x-vercel-cache: MISS`, `age: 0` | Triệu chứng 1. Cache bị loại trừ ngay tại đây |
| `EV-02` | Đo live 29/08: `GET https://www.hrpartner.vn/api/jobs/DA-DEMO-001` | `404` `NOT_FOUND` dù `/admin/jobs` có session hiển thị `Published` | Triệu chứng 2. Cùng một cơ chế phải giải thích cả hai |
| `EV-03` | [app/api/jobs/route.ts:25](../../../app/api/jobs/route.ts) | Gọi `prisma.$transaction(...)` TRỰC TIẾP với callback `listPublicJobProjection(tx, ...)`, không qua `withDbContext` | Mắt 1 của chuỗi nhân quả: không có GUC `app.role`. Đây là chỗ phải sửa |
| `EV-04` | [app/api/jobs/[slug]/route.ts:26](../../../app/api/jobs/%5Bslug%5D/route.ts) | Cùng lỗi: `prisma.$transaction(...)` trực tiếp với callback `getPublicJobProjection(tx, slug)` | Mắt 1, đường chi tiết. Chỗ phải sửa thứ hai |
| `EV-05` | [migration.sql:2](../../../prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql) | `hrp_session_role()` là `NULLIF(current_setting('app.role', true), '')` | Mắt 2: GUC chưa set thì hàm trả NULL |
| `EV-06` | [migration.sql:6-13](../../../prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql) | `hrp_project_visible_for(pid)` là chuỗi OR mà MỌI nhánh mở đầu bằng so sánh `hrp_session_role()`; nhánh `MKT` đúng bằng `EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND p.is_public)` | Mắt 3: role NULL thì cả predicate ra NULL. Đồng thời đây là cơ sở của phương án A: `MKT` chính xác bằng "chỉ dự án is_public" |
| `EV-07` | [migration.sql:30-39](../../../prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql) và [migration.sql:30-48](../../../prisma/migrations/20260817080000_s1_rls_staffing_order_slots/migration.sql) | `outsourcing_projects`, `staffing_orders`, `staffing_order_slots` đều ENABLE và FORCE RLS; cả 3 policy là `FOR ALL TO app_user_writer, app_user` với `USING` gốc là `hrp_project_visible_for` | Mắt 4: khách vô danh thấy 0 dòng trên cả 3 bảng. Một principal `MKT` phủ đủ 3 bảng vì order và slot đều gọi lại chính hàm đó |
| `EV-08` | [src/domains/job-board/public.service.ts](../../../src/domains/job-board/public.service.ts) | `listPublicJobProjection` tính `total` bằng `tx.project.count({ where })`; `getPublicJobProjection` dùng `findFirst`; `toDto` trả `null` khi hết slot | `count` bằng 0 chứng minh số 0 sinh ra ở tầng DB, KHÔNG do `toDto` lọc |
| `EV-09` | [scratch/seed-hrp-live-demo.sql](../../../scratch/seed-hrp-live-demo.sql) | Dự án `status='ACTIVE'`, order `OPEN` với `deadline_date = CURRENT_DATE + 30`, slot còn 10 và 5 chỗ, `valid_to = CURRENT_DATE + 120`; Owner đã Publish nên `is_public` TRUE | Giả thuyết dữ liệu bị loại trừ. Dữ liệu thoả đủ mọi điều kiện của `where` và của `toDto`. Không phải seed lại |
| `EV-10` | Khảo sát migration RPC | Chỉ tồn tại 2 RPC công khai `hrp_public_apply_submission` và `hrp_public_tracking_projection`; KHÔNG có RPC nào cho browse | Đường browse chưa từng có lối đi an toàn dưới RLS. Không có sẵn RPC để tái dùng |
| `EV-11` | [src/shared/auth/with-system-db.ts](../../../src/shared/auth/with-system-db.ts) | Pattern principal cố định đã tồn tại: `SYSTEM_CRON`/`SYSTEM_CHECKIN`/`SYSTEM_DEDUP` dạng `{ userId: 'system:...', role, purpose }` cộng `withSystemDb(prisma, principal, cb)`; header ghi rõ `app.role` là mức đặc quyền RLS, tách khỏi identity audit, và DB role riêng tối thiểu quyền thì cần policy mới nên bị defer | Phương án A có pattern sẵn để copy. Không phát minh cơ chế mới |
| `EV-12` | [src/shared/auth/rls-context.ts:45-74](../../../src/shared/auth/rls-context.ts) | `applyRlsContext(tx, ctx)` set đủ 4 GUC bằng `set_config(key, $1, true)`, throw khi thiếu `userId` hoặc `role`, và KHÔNG có allowlist role | Dùng lại được nguyên trạng cho principal mới; fail-closed sẵn |
| `EV-13` | [prisma/schema.prisma:114](../../../prisma/schema.prisma) | `MKT` là giá trị hợp lệ của `enum SystemRole` | `role: 'MKT'` type-check được, không cần đổi enum |
| `EV-14` | [src/shared/auth/live-rls-posture.m1-07b.test.ts:1-48](../../../src/shared/auth/live-rls-posture.m1-07b.test.ts) | Pattern test LIVE RLS đã có: `describe.skipIf` theo env flag; behavioral proof CHỈ qua `DATABASE_URL` (`app_user_writer`, RLS-enforcing); seed qua `DATABASE_URL_ADMIN`; đã có assert đọc `rolbypassrls` từ `pg_roles` | Có sẵn khuôn để viết evidence LIVE trung thực. Không dùng script `scratch/` làm evidence chính |
| `EV-15` | [src/shared/security/rate-limit-guard.ts:103-140](../../../src/shared/security/rate-limit-guard.ts) và [rate-limit-provider.ts:42-56](../../../src/shared/security/rate-limit-provider.ts) cộng [rate-limit-port.ts:97-99](../../../src/shared/security/rate-limit-port.ts) | Rate limit chạy TRƯỚC mọi truy vấn DB và fail closed `503` khi thiếu provider; ngoài production, thiếu env Upstash thì fallback memory provider; `isProductionEnv` bật khi `NODE_ENV` hoặc `VERCEL_ENV` bằng `production` | Đo HTTP local phải chạy `npm run dev`. `next start` đặt `NODE_ENV=production` nên không có Upstash sẽ trả `503` và không bao giờ chạm DB, đo được số 0 vô nghĩa |
| `EV-16` | `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/` | Gate cũ đo `/api/jobs` bằng `total 0` lúc CHƯA publish gì | Số 0 do RLS trùng khít số 0 đúng. Cấm nhận `total: 0` làm evidence PASS cho đường đọc công khai |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Chọn **phương án A**: bọc đường đọc công khai bằng một principal RLS cố định ở mức `MKT`, KHÔNG migration. Lý do: nhánh `MKT` của `hrp_project_visible_for` đúng bằng "chỉ dự án `is_public`" (`EV-06`), phủ đủ 3 bảng vì policy order và slot đều gọi lại hàm đó (`EV-07`), có pattern sẵn (`EV-11`), và ship được bằng push `main`. Phương án B (DB role vô danh riêng cộng 3 policy `FOR SELECT`) ở lại làm follow-up bảo mật, cần Owner uỷ quyền vì `DEC-09` của task 03 đang cấm migration trên `hrp-live` | Tier 1 — quyết định kiến trúc thuộc Tier 1 | CHOSEN 2026-08-30 |
| `DEC-02` | `CHOSEN` | CẤM dùng `app.role = 'ADMIN'` cho bất kỳ đường đọc công khai nào. `ADMIN` khớp nhánh đầu tiên của `hrp_project_visible_for` nên khách vô danh sẽ thấy TOÀN BỘ dự án kể cả chưa publish. Đây là anti-pattern đã ghi trong `src/shared/auth/auth-context.ts` | Tier 1 | CHOSEN — vĩnh viễn |
| `DEC-03` | `CHOSEN` | Transaction đọc công khai phải READ-ONLY ở mức Postgres, đặt cùng lúc với 4 GUC và cũng transaction-local. Lý do: 3 policy là `FOR ALL` và Postgres CHỈ xét `USING` cho DELETE, nên mở rộng tầm nhìn là mở luôn quyền DELETE trên đúng những dòng public. Lỗ này đã có sẵn với role `MKT` thật, không do task này tạo ra, nhưng đường công khai phải tự chặn. Nếu Postgres hoặc Prisma từ chối đặt read-only trong transaction thì Tier 2 DỪNG và báo, KHÔNG âm thầm bỏ | Tier 1 | CHOSEN 2026-08-30 |
| `DEC-04` | `CHOSEN` | Task này KHÔNG có migration, KHÔNG `CREATE ROLE`, KHÔNG đổi policy, KHÔNG đổi function RLS. Gặp việc cần schema thì dừng theo stop condition | Tier 1 cộng `DEC-09` task 03 | CHOSEN 2026-08-30 |
| `DEC-05` | `CHOSEN` | Evidence LIVE chỉ hợp lệ khi thoả cả ba: (a) chạy qua `DATABASE_URL` là DB role KHÔNG BYPASSRLS, chứng minh bằng `pg_roles.rolbypassrls` in ra `false`; (b) có negative control chạy CÙNG kết nối, CÙNG câu truy vấn, KHÔNG set GUC, và phải trả 0 dòng; (c) mọi dòng trả về đều có `is_public = true`. Negative control ra dòng nghĩa là kết nối đang BYPASSRLS hoặc đang trỏ vào branch tắt RLS, và toàn bộ evidence của round đó VÔ GIÁ TRỊ | Tier 1 | CHOSEN — bắt buộc, Tier 3 kiểm lại |
| `DEC-06` | `CHOSEN` | Dữ liệu DEMO đã có sẵn và Owner đã Publish (`EV-09`). Task này KHÔNG seed thêm, KHÔNG publish thêm, và CẤM unpublish dự án DEMO do Owner publish. Chỉ đọc | Tier 1, kế thừa `DEC-10` task 03 | CHOSEN 2026-08-30 |
| `DEC-07` | `CHOSEN` | Đo HTTP end-to-end bằng `npm run dev` ở `NODE_ENV=development`, KHÔNG dùng `next start`. Lý do ở `EV-15`: production mode thiếu Upstash sẽ trả `503` trước khi chạm DB, đo được số 0 nhưng không nói gì về RLS | Tier 1 | CHOSEN 2026-08-30 |
| `DEC-08` | `CHOSEN` | Đúng MỘT helper cho đường đọc công khai, đặt trong `src/shared/auth/`, export một principal cố định và một hàm bọc. CẤM rải `set_config` hoặc `applyRlsContext` lẻ trong route/page/service. Mọi đường đọc vô danh liệt kê ở §4.2 phải đi qua helper đó | Tier 1 | CHOSEN 2026-08-30 |
| `DEC-09` | `ASSUMPTION` | Gate cũ xanh vì ma trận RLS chỉ được áp lên `hrp-live` trong remediation drift 28/08, sau khi MP-1 "public read" đã ACCEPTED trên nhánh chưa enforce. Chưa đo, chỉ để Tier 3 không đi tìm một hồi quy khác. Không cần chứng minh để hoàn thành task | Tier 1 | ASSUMPTION — không blocking |
| `DEC-10` | `CHOSEN` | DTO công khai giữ nguyên shape. CẤM nới `select`, CẤM thêm field, CẤM đổi điều kiện `where` hay logic `toDto` để "cho ra kết quả". Sửa đúng một thứ: principal của transaction | Tier 1 | CHOSEN 2026-08-30 |
| `DEC-11` | `CHOSEN` | Evidence HTTP local chỉ hợp lệ khi có RED TRƯỚC và GREEN SAU, cùng máy, cùng `DATABASE_URL`, cùng câu lệnh. Nếu baseline trước khi sửa đã trả `total` ≥ 1 thì local KHÔNG tái hiện được defect (khả năng cao vì DB role trong `.env` là BYPASSRLS), evidence HTTP local bị loại, và Tier 2 phải ghi rõ điều đó trong HANDOFF kèm output baseline. Lúc đó `RQ-01`/`RQ-02` dựa vào integration lane cộng test route, còn phép đo trên domain thật là OP của Owner sau deploy | Tier 1 | CHOSEN 2026-08-30 |
| `DEC-12` | `CHOSEN` | Test LIVE chạy ở INTEGRATION lane (`npm run test:integration`), tự seed fixture của chính nó qua `DATABASE_URL_ADMIN` rồi dọn sạch trong `finally`. Lý do: `scripts/ci/integration-preflight.mjs` từ chối khi `DATABASE_URL_TEST` trùng URL dev/prod, nên lane này KHÔNG BAO GIỜ trỏ vào `hrp-live` và không thể dùng dữ liệu DEMO của Owner. Fixture phải gồm ít nhất một dự án `is_public = true` đủ điều kiện VÀ một dự án `is_public = false` để chứng minh fail-closed. Thiếu `DATABASE_URL_TEST` thì lane in `ENV_BLOCKED` và exit 0 — đó KHÔNG phải PASS, Tier 2 ghi ENV_BLOCKED thật, cấm force-pass | Tier 1 | CHOSEN 2026-08-30 |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | `GET /api/jobs` gọi KHÔNG cookie, KHÔNG header auth, trả `200` với `total` ≥ 1 và `jobs` chứa dự án đã publish trên DB đang đo | Must | `EV-01`, `EV-08` | Vẫn `total 0` là task CHƯA đạt. Cấm kết PASS bằng lời văn hoặc bằng test mock |
| `RQ-02` | `GET /api/jobs/{slug}` gọi KHÔNG cookie trả `200` kèm `job` cho dự án đã publish, với `slug` là `code` hoặc `id`. Dự án không tồn tại hoặc không publish vẫn `404` | Must | `EV-02` | Còn `404` cho dự án đã publish là CHƯA đạt |
| `RQ-03` | Mọi đường đọc DB vô danh liệt kê ở §4.2 phải đi qua đúng MỘT helper principal công khai. Sau khi sửa, các file đó KHÔNG còn `prisma.$transaction` trần và KHÔNG gọi `prisma.model` trực tiếp | Must | `EV-03`, `EV-04`, `DEC-08` | Static check còn thấy `$transaction` trần trong file thuộc scope thì Tier 3 reject, kể cả khi HTTP đã xanh |
| `RQ-04` | Principal công khai đặt `app.role = 'MKT'` và `app.user_id` dạng `system:` cố định, có tên nói rõ mục đích. TUYỆT ĐỐI không `ADMIN` | Must | `DEC-01`, `DEC-02`, `EV-06`, `EV-13` | Dùng `ADMIN` thì dự án chưa publish lộ ra ngoài. `AC-06` phải fail |
| `RQ-05` | Transaction của principal công khai là READ-ONLY ở mức Postgres, transaction-local. Một lệnh ghi phát ra trong transaction đó phải bị Postgres từ chối bằng SQLSTATE `25006` | Must | `DEC-03`, `EV-07` | Không đặt được read-only thì DỪNG theo stop condition `STEP-01`, không âm thầm bỏ qua |
| `RQ-06` | Fail-closed giữ nguyên: dự án `is_public = false`, dự án không `ACTIVE`, order hết `deadlineDate`, slot hết `validTo` hoặc hết chỗ vẫn KHÔNG xuất hiện trên bề mặt công khai. Thiếu GUC vẫn phải ra 0 dòng | Must | `DEC-05`, `DEC-10`, `EV-09` | Rò một dòng không đủ điều kiện là defect bảo mật, nặng hơn defect đang sửa |
| `RQ-07` | Có test tự động chặn hồi quy: một test đơn vị fail nếu ai đó bỏ GUC hoặc đổi role khỏi đường công khai, cộng một test LIVE chứng minh đọc thật dưới RLS. Cả hai nằm trong worktree VÀ được đăng ký lane, Tier 3 chạy lại được bằng đúng lệnh ghi trong HANDOFF. Khi Owner commit thì test lane phải nằm CÙNG commit với code (bài học OPS-06A) | Must | `EV-14`, `EV-16` | Chỉ sửa route mà không có test là chưa đạt: đúng cơ chế này đã lọt qua mọi gate trước đó |
| `RQ-08` | Evidence LIVE thoả đủ 3 điều kiện của `DEC-05`: role không BYPASSRLS in ra `false`, negative control không GUC trả 0 dòng, mọi dòng trả về có `is_public = true` | Must | `DEC-05`, `EV-16` | Thiếu bất kỳ điều nào thì evidence của round VÔ GIÁ TRỊ và Tier 3 kết `REVISION_REQUIRED` |

### 4.2 Scope boundaries

Kiểm kê đường đọc vô danh đã làm đủ, không còn ẩn số. Có **ba** call site hỏng, không phải hai — call site thứ ba là server component nên không lộ ra khi đo HTTP `/api/jobs`.

**In scope:**

- `src/shared/auth/with-public-db.ts` — file MỚI: principal công khai cố định cộng hàm bọc theo `DEC-08`. Không tái dùng `SystemPrincipal` của `with-system-db.ts` vì field `role` ở đó là literal type `'ADMIN'`, nới ra sẽ mở đường cho `ADMIN` lọt vào chỗ khác.
- [app/api/jobs/route.ts](../../../app/api/jobs/route.ts) — chỉ thân `GET`. `POST` là stub 410, CẤM chạm.
- [app/api/jobs/[slug]/route.ts](../../../app/api/jobs/%5Bslug%5D/route.ts) — thân `GET`.
- [app/job-board/page.tsx](../../../app/job-board/page.tsx) — server component, dòng 9-10 gọi `prisma.$transaction` trần với `listPublicJobProjection`. Đây là call site hỏng thứ ba. Chỉ sửa đường lấy dữ liệu, KHÔNG sửa markup, KHÔNG sửa empty state.
- [src/domains/applications/marketplace-inventory.static.test.ts](../../../src/domains/applications/marketplace-inventory.static.test.ts) — dòng 122-130 đang neo thứ tự limiter bằng `handler.indexOf('$transaction')`. Bỏ `$transaction` khỏi handler thì `indexOf` trả `-1` và assert vỡ. Phải đổi mốc neo sang một mốc bền với refactor, ví dụ `getPrisma`, và giữ nguyên ý nghĩa "limiter chạy trước khi chạm DB". CẤM xoá hoặc làm yếu test này.
- [src/domains/applications/marketplace-browse.routes.test.ts](../../../src/domains/applications/marketplace-browse.routes.test.ts) — fixture happy path hiện là `{ jobs: [], total: 0 }` và assert "thành công" trên danh sách rỗng. Đổi sang fixture có ít nhất một job để test không còn hợp thức hoá đúng cái triệu chứng đang sửa.
- [src/shared/auth/api-boundary.static.test.ts](../../../src/shared/auth/api-boundary.static.test.ts) — header dòng 18-20 đang ghi rằng route public dùng `prisma.$transaction` trần là hợp lệ. Câu đó nay SAI và sẽ mời người sau tái tạo defect. Sửa lời văn cho khớp `DEC-08`.
- Test mới cho `RQ-07`: một test tĩnh chặn hồi quy trên đúng ba call site, một test đơn vị cho helper, một test LIVE theo khuôn `EV-14`.
- [vitest.integration-files.ts](../../../vitest.integration-files.ts) cộng [vitest.integration.config.ts](../../../vitest.integration.config.ts) cộng [vitest.unit.config.ts](../../../vitest.unit.config.ts) — chỉ ĐĂNG KÝ lane cho test LIVE mới: thêm đường dẫn vào `INTEGRATION_TEST_FILES`, thêm một dòng env flag ở integration config theo đúng khuôn `TEST_DB_ADMIN ? '1' : ''`, và làm rỗng flag đó ở unit config. Không đổi gì khác trong ba file này. Bỏ bước này thì test LIVE hoặc không bao giờ chạy, hoặc chạy trong unit lane rồi đâm vào sentinel `127.0.0.1:1`.

**Out of scope:**

- [src/domains/job-board/public.service.ts](../../../src/domains/job-board/public.service.ts) — KHÔNG sửa một dòng nào. `where`, `select`, `toDto` giữ nguyên (`DEC-10`). Nếu Tier 2 thấy cần sửa file này thì DỪNG và báo.
- `app/api/public/jobs/[slug]/applications/route.ts`, `app/api/public/applications/[trackingCode]/route.ts`, `src/domains/applications/application.service.ts` — đường RPC `SECURITY DEFINER`, CỐ Ý không có GUC. `src/domains/applications/security-boundary.mp2.test.ts` dòng 97-109 CẤM xuất hiện `applyRlsContext`, `withDbContext` hay `set_config('app.role'` trong 3 file này. Chạm vào là vỡ gate.
- `app/(portal)/page.tsx` và `app/(jobs)/jobs/page.tsx` — client component, gọi `fetch('/api/jobs')`, không chạm DB. Sửa API là hai trang này tự sống lại. Nội dung card thuộc go-live-05.
- `packages/job-board/**` và `listPublicJobs` trong `src/domains/staffing/submission.service.ts` — cả hai KHÔNG có caller production nào. Dọn dead code là follow-up riêng.
- `middleware.ts`, rate limit, cache, observability, `prisma/schema.prisma`, `prisma/migrations/**`.
- 7 file source Tier 2 đang sửa dở go-live-03, cộng `public/index.html` và `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md`. CẤM stage, CẤM restore, CẤM commit.
- Trang chi tiết job công khai: repo hiện KHÔNG có. `app/job-board/page.tsx` dòng 33 trỏ nút "Xem chi tiết" thẳng vào JSON API. Là defect UI riêng, ghi thành follow-up, KHÔNG sửa trong task này.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** DTO công khai giữ nguyên shape. `total` vẫn lấy từ `count`. Không thêm, không bớt, không đổi tên field. Không có PII trong response.
- **State:** trạng thái publish là READ-ONLY với task này. Không seed, không publish, không unpublish (`DEC-06`).
- **Permission/data scope:** principal công khai có mức đặc quyền RLS `MKT` và chỉ `MKT`, tương đương "chỉ dự án `is_public`". `app.user_id` là hằng dạng `system:` cố định, không phải user thật. Bốn GUC set bằng `set_config(key, value, true)` transaction-local. CẤM `SET ROLE`, CẤM GUC session-global, CẤM `set_config(..., false)`, CẤM `ADMIN`.
- **Interface:** `GET /api/jobs` vẫn trả `{ jobs, total }`; `GET /api/jobs/{slug}` vẫn trả `{ job }` hoặc `404 NOT_FOUND`; `POST /api/jobs` vẫn là 410 tĩnh. `enforceRateLimits` vẫn chạy TRƯỚC mọi truy vấn DB.
- **Failure/idempotency/concurrency:** đọc thuần nên idempotent. Nguyên tắc quan trọng nhất: lỗi khi set GUC hoặc khi set read-only phải NỔI LÊN thành lỗi, TUYỆT ĐỐI không được nuốt thành danh sách rỗng. Chính chế độ hỏng-thành-rỗng-im-lặng là lý do defect này sống sót qua mọi gate trước.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | `RQ-01`, `RQ-02` | worktree cộng dev server | Khoá baseline và tái hiện defect. Ghi `git log -1 --format=%H` vào HANDOFF; chụp `git status --short` để cuối round chứng minh không chạm file ngoài scope. Chạy `npm run dev` (`DEC-07`) rồi đo RED trên `GET /api/jobs` và `GET /api/jobs/DA-DEMO-001`, lưu nguyên status cộng body. RED chính là bằng chứng kết nối này ĐANG bị RLS chặn — không cần truy vấn DB riêng để chứng minh | `npm run dev`, PowerShell `Invoke-WebRequest` | Body list có `"total":0` và detail trả `404` | Baseline đã trả `total` ≥ 1 nghĩa là local không tái hiện: DỪNG nhánh đo local, ghi theo `DEC-11`, chuyển sang đường integration lane. TUYỆT ĐỐI không sửa dữ liệu hay code để "làm cho nó đỏ" |
| `STEP-01` | `RQ-03`, `RQ-04`, `RQ-05` | `src/shared/auth/with-public-db.ts` (mới) | Helper duy nhất của đường đọc công khai: một hằng principal (`userId` dạng `system:` cố định nói rõ mục đích, `role: 'MKT'`, purpose) cộng một hàm bọc mở `prisma.$transaction`, đặt read-only, gọi `applyRlsContext(tx, principal)`, rồi trao `tx` cho callback. Bẫy thứ tự phải xử đúng: `SET TRANSACTION READ ONLY` CHỈ hợp lệ trước câu truy vấn đầu tiên của transaction, chạy sau `applyRlsContext` sẽ lỗi `25001` — nên hoặc phát nó làm câu ĐẦU TIÊN, hoặc dùng `SET LOCAL transaction_read_only = on` / `set_config('transaction_read_only', 'on', true)` vốn không bị ràng buộc thứ tự. CẤM `try/catch` nuốt lỗi thành mảng rỗng | `applyRlsContext` (`EV-12`), khuôn `with-system-db.ts` (`EV-11`) | `npm run typecheck` exit 0 | Postgres hoặc Prisma từ chối đặt read-only bằng MỌI cách đã thử: DỪNG, HANDOFF `BLOCKED` kèm SQLSTATE thật, KHÔNG bỏ read-only rồi đi tiếp (`DEC-03`) |
| `STEP-02` | `RQ-07`, `RQ-04`, `RQ-05` | `src/shared/auth/with-public-db.test.ts` (mới) | Test đơn vị trên `tx` giả: đủ 4 GUC và đều transaction-local; `app.role` đúng `'MKT'` và KHÔNG phải `'ADMIN'`; có câu đặt read-only; callback nhận đúng `tx` của transaction; lỗi phát ra khi set GUC được NÉM RA chứ không bị nuốt. Đây là test làm fail người sau nếu họ bỏ GUC hoặc đổi role | vitest, unit lane không chạm DB | `npm run test:unit` exit 0 | Không spy được trên `tx` vì lý do kỹ thuật thì chuyển test này sang integration lane và ghi rõ lý do; KHÔNG được bỏ |
| `STEP-03` | `RQ-01`, `RQ-03` | [app/api/jobs/route.ts](../../../app/api/jobs/route.ts) | Thay `prisma.$transaction(...)` trong thân `GET` bằng helper `STEP-01`, giữ y nguyên tham số truyền vào `listPublicJobProjection` và giữ `enforceRateLimits` ở vị trí ĐẦU TIÊN. `POST` stub 410 không đổi một ký tự | `STEP-01` | `npm run typecheck` exit 0 | Cần sửa `public.service.ts` để chạy được: DỪNG và báo (`DEC-10`) |
| `STEP-04` | `RQ-02`, `RQ-03` | [app/api/jobs/[slug]/route.ts](../../../app/api/jobs/%5Bslug%5D/route.ts) | Cùng cách thay trong thân `GET`; giữ nguyên nhánh `404 NOT_FOUND` khi projection trả null | `STEP-01` | `npm run typecheck` exit 0 | Như `STEP-03` |
| `STEP-05` | `RQ-03` | [app/job-board/page.tsx](../../../app/job-board/page.tsx) | Thay `prisma.$transaction` ở dòng 9-10 bằng helper. CHỈ đổi đường lấy dữ liệu: markup, empty state dòng 26, và link dòng 33 giữ nguyên | `STEP-01` | `npm run typecheck` exit 0 | Như `STEP-03` |
| `STEP-06` | `RQ-03`, `RQ-07` | `src/shared/auth/public-read-guc.static.test.ts` (mới) | Detector tĩnh đọc cây nguồn thật, chốt đúng cơ chế đã lọt mọi gate trước: cả BA call site không còn `$transaction` trần và đều tham chiếu helper; helper có `'MKT'` và KHÔNG có `'ADMIN'`; helper có marker read-only. Danh sách ba đường dẫn viết cứng để thêm call site mới là phải sửa test có ý thức | khuôn detector ở `marketplace-inventory.static.test.ts` | `npm run test:unit` exit 0 | None |
| `STEP-07` | `RQ-03` | [src/domains/applications/marketplace-inventory.static.test.ts](../../../src/domains/applications/marketplace-inventory.static.test.ts) | Đổi mốc neo thứ tự limiter ở dòng 122-130 từ `handler.indexOf('$transaction')` sang mốc bền với refactor (ví dụ `getPrisma`) cho cả bốn route, giữ nguyên ý nghĩa "limiter chạy trước khi chạm DB". CẤM xoá test, CẤM nới assert thành luôn đúng | `STEP-03`, `STEP-04` | `npm run test:unit` exit 0 và assert vẫn so sánh hai chỉ số thật | Không tìm được mốc chung cho cả bốn file: DỪNG và báo, đừng bỏ file nào ra khỏi vòng lặp |
| `STEP-08` | `RQ-01`, `RQ-07` | [src/domains/applications/marketplace-browse.routes.test.ts](../../../src/domains/applications/marketplace-browse.routes.test.ts) | Fixture happy path đổi từ `{ jobs: [], total: 0 }` sang ít nhất một job, assert handler trả đúng job đó. Thêm assert handler đi qua helper công khai (mock helper và kiểm tra nó được gọi) thay vì `$transaction` trần. Sau bước này bộ test không còn hợp thức hoá danh sách rỗng là "thành công" | `STEP-03`, `STEP-04` | `npm run test:unit` exit 0 | None |
| `STEP-09` | `RQ-03` | [src/shared/auth/api-boundary.static.test.ts](../../../src/shared/auth/api-boundary.static.test.ts) | Sửa lời văn header dòng 18-20 đang tuyên bố `prisma.$transaction` trần ở route public là hợp lệ. Ghi lại theo `DEC-08`: đường đọc công khai phải qua helper principal; `$transaction` trần trên đường đó là defect. Không đổi logic detector của file này | `DEC-08` | `npm run test:unit` exit 0 | None |
| `STEP-10` | `RQ-06`, `RQ-07`, `RQ-08` | test LIVE mới cộng `vitest.integration-files.ts` cộng hai vitest config | Test LIVE theo khuôn `EV-14`, tự seed rồi dọn trong `finally` (`DEC-12`). Bốn chứng minh bắt buộc, cùng một kết nối `DATABASE_URL`: (a) `rolbypassrls` của `current_user` đọc từ `pg_roles` in ra `false`; (b) negative control — gọi `listPublicJobProjection` KHÔNG set GUC trả 0 dòng; (c) gọi qua helper trả ≥ 1 dòng và MỌI dòng có `is_public = true`; (d) dự án `is_public = false` trong fixture KHÔNG xuất hiện. Thêm chứng minh `RQ-05`: một lệnh ghi phát trong transaction của helper bị từ chối với SQLSTATE `25006` — dùng điều kiện `WHERE` không khớp dòng nào để an toàn kể cả khi read-only hỏng. Rồi đăng ký file vào `INTEGRATION_TEST_FILES`, thêm env flag ở integration config, làm rỗng flag ở unit config | `DATABASE_URL_TEST` cộng `DATABASE_URL_ADMIN_TEST`, khuôn `live-rls-posture.m1-07b.test.ts` | `npm run test:integration` exit 0 và log cho thấy test CHẠY, không phải skip | Negative control trả ra dòng: DỪNG — kết nối đang BYPASSRLS hoặc trỏ branch tắt RLS, toàn bộ evidence round vô giá trị (`DEC-05`). Thiếu env test DB: lane in `ENV_BLOCKED` exit 0, ghi đúng `ENV_BLOCKED` vào HANDOFF, CẤM ghi PASS |
| `STEP-11` | tất cả | gates | Chạy đủ và ghi lệnh cộng exit code cộng output thật: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run test:integration` | Node, npm | Tất cả exit 0 | Bất kỳ gate đỏ: sửa trong scope rồi chạy lại; nếu chỉ sửa được bằng cách chạm file out-of-scope thì DỪNG và báo |
| `STEP-12` | `RQ-01`, `RQ-02` | dev server cộng HANDOFF | Đo GREEN đúng hai lệnh của `STEP-00`, cùng máy cùng `DATABASE_URL`, dán cặp RED/GREEN cạnh nhau. Viết HANDOFF: baseline SHA, từng STEP, từng AC kèm evidence thật, deviation nếu có, và `git status --short` cuối round chứng minh không chạm file ngoài scope. KHÔNG commit, KHÔNG push nếu Owner chưa yêu cầu | `STEP-00` | `total` ≥ 1 và detail `200` | `STEP-00` đã xanh sẵn: ghi theo `DEC-11`, KHÔNG trình cặp RED/GREEN giả |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | `GET /api/jobs` không cookie, không header auth: `200` với `total` ≥ 1 và `jobs` chứa dự án đã publish | HTTP local qua `npm run dev` (`DEC-07`), đo hai lần theo `DEC-11` | Cặp RED/GREEN: lệnh, status, body nguyên văn của cả hai lần | Yes |
| `AC-02` | `RQ-02` | `GET /api/jobs/DA-DEMO-001` không cookie trả `200` kèm `job`; một slug không tồn tại vẫn trả `404 NOT_FOUND` | HTTP local | Ba phép đo: RED, GREEN, và slug bịa | Yes |
| `AC-03` | `RQ-03` | Cả ba call site không còn `$transaction` trần và đều đi qua helper công khai | `npm run test:unit` chạy detector `STEP-06`, cộng `git diff` ba file | Output test cộng diff | Yes |
| `AC-04` | `RQ-03` | `marketplace-inventory.static.test.ts` vẫn XANH với mốc neo mới và assert vẫn so sánh hai chỉ số thật của cùng handler cho cả bốn route | `npm run test:unit` cộng đọc diff của chính file đó | Output test cộng diff | Yes |
| `AC-05` | `RQ-04` | Helper đặt `app.role` đúng `'MKT'` và `app.user_id` dạng `system:` cố định; chuỗi `'ADMIN'` KHÔNG xuất hiện ở helper hay ba call site | Unit test `STEP-02` cộng `git grep -n "ADMIN"` trên 4 file đó | Output test cộng output grep | Yes |
| `AC-06` | `RQ-04`, `RQ-06` | Dự án `is_public = false` trong fixture KHÔNG xuất hiện trong kết quả đọc công khai trên DB thật | Test LIVE nhánh (d) | Log test có tên/ID fixture non-public và assert absent | Yes |
| `AC-07` | `RQ-05` | Một lệnh ghi phát ra trong transaction của helper bị Postgres từ chối với SQLSTATE `25006` | Test LIVE | Log test in SQLSTATE thật | Yes |
| `AC-08` | `RQ-06` | Negative control: cùng kết nối, cùng truy vấn, KHÔNG set GUC trả đúng 0 dòng | Test LIVE nhánh (b) | Log test | Yes |
| `AC-09` | `RQ-07` | Test đơn vị THỰC SỰ chặn hồi quy: đột biến tạm `'MKT'` thành `'ADMIN'` làm test ĐỎ, hoàn nguyên thì XANH lại | Chạy `npm run test:unit` hai lần quanh một lần đột biến tạm, rồi `git diff` chứng minh đã hoàn nguyên sạch | Hai output test đối nghịch cộng `git diff` rỗng trên file helper | Yes |
| `AC-10` | `RQ-08` | Ba điều kiện `DEC-05` thoả: `pg_roles.rolbypassrls` của `current_user` in ra `false`; negative control 0 dòng; mọi dòng trả về có `is_public = true` | Test LIVE, `npm run test:integration` | Log lane cho thấy test CHẠY (không skip) cộng ba assert trên | Yes |
| `AC-11` | `RQ-01`, `RQ-07` | `marketplace-browse.routes.test.ts` không còn assert danh sách rỗng là "thành công"; fixture happy path có ít nhất một job | `npm run test:unit` cộng diff file đó | Output test cộng diff | Yes |
| `AC-12` | `RQ-03` | Không chạm file ngoài scope: `git status --short` phần out-of-scope đầu round và cuối round giống nhau; `git diff --stat` chỉ hiện file in-scope §4.2 | `git status --short`, `git diff --stat` | Output cả hai mốc | Yes |
| `AC-13` | `RQ-01`, `RQ-07` | Năm gate exit 0: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run test:integration` | Chạy tuần tự | Lệnh, exit code, dòng kết quả thật của từng gate | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-00`, `STEP-03`, `STEP-08`, `STEP-12` | `AC-01`, `AC-11`, `AC-13` |
| `RQ-02` | `STEP-00`, `STEP-04`, `STEP-12` | `AC-02` |
| `RQ-03` | `STEP-01`, `STEP-03`, `STEP-04`, `STEP-05`, `STEP-06`, `STEP-07`, `STEP-09` | `AC-03`, `AC-04`, `AC-12` |
| `RQ-04` | `STEP-01`, `STEP-02` | `AC-05`, `AC-06` |
| `RQ-05` | `STEP-01`, `STEP-02`, `STEP-10` | `AC-07` |
| `RQ-06` | `STEP-10` | `AC-06`, `AC-08` |
| `RQ-07` | `STEP-02`, `STEP-06`, `STEP-08`, `STEP-10` | `AC-09`, `AC-11`, `AC-13` |
| `RQ-08` | `STEP-10` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Principal `MKT` đúng nhưng vẫn ra 0 dòng vì còn điều kiện RLS khác chưa lộ | Test LIVE nhánh (c) trả 0 dòng dù fixture thoả đủ điều kiện `EV-09` | Fixture dựng đúng theo `EV-09`; nếu vẫn 0 thì đọc lại `hrp_project_visible_for` và policy, TUYỆT ĐỐI không nới `where` hay `toDto` để có kết quả | HANDOFF `BLOCKED` kèm truy vấn và output thật, đề xuất phương án B cho Tier 1 quyết |
| `RISK-02` | Mở tầm nhìn `MKT` cũng mở quyền DELETE trên đúng những dòng public, vì 3 policy là `FOR ALL` và Postgres chỉ xét `USING` cho DELETE | Bất kỳ đường ghi nào dùng helper công khai, hoặc read-only bị bỏ | `RQ-05` bắt read-only transaction-local; `AC-07` chứng minh bằng `25006`; helper chỉ dùng cho đọc; tách `FOR SELECT` là follow-up bảo mật đã đăng ký | Revert diff của round; lỗ này có sẵn với role `MKT` thật nên không cấp cứu migration trong task này |
| `RISK-03` | `DATABASE_URL` trong `.env` local là role BYPASSRLS ⇒ đo local xanh giả, không nói gì về RLS | `STEP-00` baseline đã trả `total` ≥ 1 | `DEC-11` loại evidence local trong trường hợp đó và bắt ghi rõ | Chuyển sang bằng chứng integration lane; phép đo trên domain thật là OP của Owner sau deploy |
| `RISK-04` | ~~Test branch `hrp_mp2_test` hết hạn 31/08/2026~~ **ĐÃ ĐÓNG 2026-08-30**: Owner uỷ quyền, Tier 1 chạy `neon branches set-expiration hrp_mp2_test --project-id proud-lake-83253847` exit 0, `neon branches list` in `Expires At = never`; branch id `br-misty-cell-az3nx5l3` không đổi nên `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` giữ nguyên | Không còn | Đã đóng bằng hành động, không còn cần mitigation | Nếu bất kỳ round nào vẫn in `ENV_BLOCKED` thì nguyên nhân KHÔNG phải expiry — đo lại credential/preflight, CẤM force-pass. CẤM cắt branch test mới từ `hrp-live`: đó là branch bị drift 15 policy RLS, cắt từ nó là đo sai posture |
| `RISK-05` | Sửa hai test tĩnh làm yếu gate mà vẫn xanh | Assert bị đổi thành biểu thức luôn đúng, hoặc bớt file khỏi vòng lặp | `AC-04` buộc assert vẫn so sánh hai chỉ số thật cho đủ bốn route; Tier 3 đọc diff chứ không chỉ đọc kết quả xanh | Hoàn nguyên diff của file test, làm lại đúng cách |
| `RISK-06` | Vô tình stage hoặc commit 7 file dở của go-live-03, `public/index.html`, hay `AUDIT.md` task 02 | `git add` không giới hạn path | Chỉ stage path in-scope; `AC-12` đo hai mốc `git status --short`; cấm `git add -A` và `git add .` | `git restore --staged` đúng path bị stage lẫn; TUYỆT ĐỐI không `git reset --hard`, không `git checkout --` lên file của người khác |
| `RISK-07` | Đúng cơ chế này còn tồn tại ở call site vô danh khác chưa kiểm kê | Grep thấy `$transaction` trần trên một đường đọc vô danh khác | Kiểm kê §4.2 đã quét toàn bộ `app/**`; detector `STEP-06` viết cứng ba đường dẫn nên thêm call site mới là phải sửa test có ý thức | Mở follow-up, không nới scope round này |
| `RISK-08` | Fix nằm trên `main` nhưng chưa deploy, Owner đo domain rồi tưởng vẫn hỏng | Owner mở `www.hrpartner.vn` trước khi push `main` | HANDOFF ghi rõ: task KHÔNG tự deploy, deploy production là push `main` và thuộc Owner | Không cần rollback; chỉ cần nói đúng trạng thái |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. Mọi ẩn số kiến trúc đã đóng thành `DEC-01` đến `DEC-12`; chẩn đoán đã trọn vẹn ở §2 | Tier 1 | `2026-08-30` | No |
| `Q-02` | Có uỷ quyền phương án B (DB role vô danh riêng cộng 3 policy `FOR SELECT`, cần migration trên `hrp-live`) làm follow-up bảo mật sau khi task này đóng? | Owner | Sau khi task này ACCEPTED | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `0` | None | None | Chưa có audit round nào | None | Tier 1 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-30` | Contract khởi tạo: `EV-01` đến `EV-16`, `DEC-01` đến `DEC-12`, `RQ-01` đến `RQ-08`, `STEP-00` đến `STEP-12`, `AC-01` đến `AC-13`, `RISK-01` đến `RISK-08` | Defect P0 phát hiện 29/08/2026 khi Owner publish 2 dự án DEMO mà bề mặt việc làm công khai vẫn chết; chẩn đoán trọn vẹn trong phiên 29-30/08, xem [hrp-public-read-rls-dead](../../PLANNER_HANDOVER.md) |
