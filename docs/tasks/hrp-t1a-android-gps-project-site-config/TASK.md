# TASK — `hrp-t1a-android-gps-project-site-config`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1a-android-gps-project-site-config` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Lane CRITICAL (schema/migration, role gate, geofence fail-closed, audit trail) → mặc định LIGHT; T3 audit trên exact frozen SHA. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `51195c3bb3410b49f49531f6cc841a2a2832ada1` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `prisma/schema.prisma`; `prisma/migrations/20261019010000_site_gps_confirmation/**`; `app/api/projects/**/sites/**` (`sites/route.ts`, `[siteId]/route.ts` — mới); `app/api/worker/checkins/route.ts`; `src/domains/crm/site-gps.service.ts` (mới); `src/domains/crm/project-read.service.ts` (thêm sites DTO); `app/admin/projects/[id]/page.tsx`; `app/admin/projects/[id]/project-gps-client.tsx` (mới); tests kèm theo; `docs/tasks/hrp-t1a-android-gps-project-site-config/**` |
| Forbidden paths | Mọi file repo Android `D:\CodeApp\hr-partner` (chỉ tham chiến hợp đồng qua `D:\CodeApp\web-android-contract.md` — chỉ đọc); `.env*`, `cre_hrp2.txt`, credential; `app/api/jobs/apply/route.ts`; chạy `prisma migrate/seed/reset`, bất kỳ lệnh ghi DB; repo Android agent; push/merge/deploy; không sửa `project-detail-client.tsx` (42KB đã ổn định — GPS UI là client component riêng mount từ page.tsx) |
| Required gates | `npx prisma validate` → `npx prisma generate` → `npm run typecheck` → `npm run test:unit` → `git diff --cached --check` → verify-task/verify-handoff |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver` → `/audit` (LIGHT) → `/resolve` |

> Contract đầu vào: `D:\CodeApp\web-android-contract.md` — agent tự tính fingerprint SHA256
> `300c6f107f5c08823aa47b049a560c169393f2d021bfa03b40b2aac90999f57a` (file KHÔNG có fingerprint tự khai;
> đã đối chiếu ngày lập 18/10/2026 + nội dung còn nguyên — báo cáo bàn giao ghi rõ).
> `AGENTS.md` không tồn tại trong repo/worktree (đã `glob **/AGENTS.md` = 0 match); quy trình dẫn từ `.ai-pipeline`.

## 1. Outcome

### 1.1 User-visible outcome

1. Admin/BoD (role thật `ADMIN`/`DIRECTOR` trong code) vào `/admin/projects/[id]` thấy section **"Cấu hình GPS (Geofence)"**: danh sách Site của Project với tên/địa chỉ/tọa độ/bán kính + nhãn trạng thái rõ — **"Đã Admin xác nhận"** / **"Chưa được Admin xác nhận"** (coordinate cũ chưa qua Admin) / **"Chưa có tọa độ"**; chỉnh sửa tọa độ/bán kính/địa chỉ của từng Site; tạo Site mới gắn vào Project hiện hữu. Không tạo Project mới, không seed, không tự mò tọa độ; không có chức năng xoá Site.
2. Sau một lần lưu thành công của Admin/BoD, Site có metadata xác nhận (timestamp + actor) ghi vào DB và một bản ghi `AuditLog` (entity Site, action GPS_CREATE/GPS_UPDATE, diff trước/sau) theo cơ chế `writeAuditLog` hiện hành.
3. Chấm công worker (`POST /api/worker/checkins`) fail-closed khi assignment ACTIVE của worker trỏ tới Project không có Site nào hợp lệ (tọa độ cả lat+lng + đã xác nhận) — không ghi event, không biến `null` thành `(0,0)`, không coi `NONE` là hợp lệ; response lỗi phù hợp contract mobile (`SITE_GEOFENCE_NOT_CONFIGURED`, code contract phủ `HTTP 503`) nhưng **web route dùng HTTP 422** để tránh xung đột hành vi `503 = offline-queue` sẵn có phía page worker web — gap đã ghi vào HANDOFF cho T0 chốt.

### 1.2 Non-goals

- Không triển khai `POST /api/worker/checkins/events` (endpoint mobile riêng theo contract 6.1-3) — task T0 khác.
- Không đổi `POST /api/worker/checkins` response shape thành công của web (`{ ok, id, message, riskFlag, geofenceResult }`).
- Không thêm trường accuracy/time-window policy (T0 mục 11.6 chưa chốt).
- Not deliver ticket của HR import attendance (`/api/attendance/import*` — pipeline HR, không đụng geofence; chỉ rà).
- Không sửa Android; không seed/fix data; không xoá Site.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | `web-android-contract.md` §4.D + §14.3 (`SITE_GEOFENCE_NOT_CONFIGURED`, HTTP 503), §14.5-1; B4: "Admin CRUD cấu hình GPS cho Site khi rà soát xác nhận đang thiếu. Không tạo Project mẫu; không enabled chấm công nếu Site thiếu tọa độ được xác nhận." | Boundary config GPS + fail-closed semantics. |
| EV-02 | `prisma/schema.prisma:606-620` (`Site` có lat/lng nullable + radiusMeters default 200, @@map sites) | Schema baseline đủ; chỉ cần metadata xác nhận. |
| EV-03 | `app/api/worker/checkins/route.ts:56-131` — `checkGeofence` select `latitude/longitude/radiusMeters` của sites theo assignment ACTIVE, haversine, `geofenceResult` `INSIDE/OUTSIDE/NONE`, event ghi cả khi `NONE`/`sites.length===0`; lat/lng null của Site sẽ bị `Number(null)` → khoảng cách tới (0,0) | Lỗi cần fail-closed; điểm chạm duy nhất cho gate. |
| EV-04 | `app/worker/page.tsx:151-172` — web client coi **mọi `503` là offline** (`queueOffline`) | Lý do route web trả 422 cho config gate (giữ hành vi web; contract gap chốt T0). |
| EV-05 | `app/api/projects/[id]/route.ts` + `src/domains/crm/project-management.service.ts` (`PROJECT_UPDATE_ROLES = ['ADMIN','HR_MANAGER','PM']`, `PROJECT_DELETE_ROLES = ['ADMIN']`) + `app/admin/projects/[id]/page.tsx` (VIEW_ROLES + `deriveProjectCapability`, static-guard `project-terminology.test.ts`) | Mapping role thật; unlock chỉ `ADMIN/DIRECTOR` cho GPS write; UI capability mirror. |
| EV-06 | `src/shared/integrity/audit.ts` (`writeAuditLog`, AuditDiff before/after, Audit không RLS) | Cơ chế audit hiện hành dùng cho GPS changes. |
| EV-07 | `src/domains/crm/project-read.service.ts:104-192` (`getProjectForManagement`, DTO không có sites detail) | Điểm mở rộng DTO cho UI (sites + `gpsStatus`). |
| EV-08 | RLS migration `20260816211000_s1_rls_project`: `sites USING hrp_project_visible_for` / `WITH CHECK hrp_project_writable = ENABLED {ADMIN, HR_MANAGER, DIRECTOR, SALE}` | ADMIN/DIRECTOR write dưới GUC pass RLS; không cần migration RLS mới. |
| EV-09 | Migration pattern `20261018120000_mobile_device_token_with_rls` sau correction (idempotent DO-block guard + final assertion introspection) | Áp dụng pattern migration additive mới. |
| EV-10 | `app/api/projects/route.ts` VIEWER/ADMIN role sets + static tests `projects-role-visibility.static.test.ts` | Không được mở rộng role sets khác; capability GPS chỉ là subset `ADMIN/DIRECTOR`. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Service `src/domains/crm/site-gps.service.ts`: `PROJECT_GEO_CONFIG_ROLES = ['ADMIN','DIRECTOR']` cố định tường minh (không reuse `PROJECT_UPDATE_ROLES` để tránh mở cho PM/HR_MANAGER như hiện tại). Service expose `listProjectSites`, `createSiteForProject`, `updateSiteGps`; mọi mutation qua `withDbContext` (L2 GUC theo ctx) + `writeAuditLog` trong cùng tx. | `CHOSEN` |
| DEC-02 | Validation input (`validateSiteGpsPayload`): latitude + longitude phải cùng có hoặc cùng vắng; giá trị number hợp lệ (-90..90 / -180..180), precision ≤ 7 số thập phân (mirror schema Decimal(10,7)); `radiusMeters` integer 1..2000 (positive; sanity cap cao hơn geofence Android 800m); create Site cần `name` (1..200) + `address` optional (≤500); update: chỉ field trong allowlist, không nhận `projectId/siteId` từ body. Clear toạ độ = set cả lat + lng về null trong cùng payload. | `CHOSEN` |
| DEC-03 | Metadata xác nhận: Site thêm `geoConfirmedAt DateTime?` + `geoConfirmedById String?` (+ relation User nullable `SiteGeoConfirmedBy` ON DELETE SET NULL) — additive, ship-only, không áp DB. Lưu thành công của Admin khi toạ độ hợp lệ ⇒ set markers; khi bỏ toạ độ (lat/lng null) ⇒ clear markers. Radius mặc định 200 KHÔNG tính là confirmed khi thiếu marker. | `CHOSEN` |
| DEC-04 | Route mới `POST /api/projects/[id]/sites` (create Site gắn project hiện hữu; idempotency qua `x-idempotency-key` + `withIdempotency`) và `PUT /api/projects/[id]/sites/[siteId]` (update toạ độ/bán kính/địa chỉ; không idempotency — ghi audit). Role gate `PROJECT_GEO_CONFIG_ROLES` từ service; không tin project/siteId từ body; errors: 400 (`VALIDATION`/`INVALID_BODY`), 401, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `IDEMPOTENCY_CONFLICT`; project phải tồn tại (404 khi thiếu/ngoài scope), cho phép tạo Site cho project chưa có Site nào. | `CHOSEN` |
| DEC-05 | Check-in fail-closed (`POST /api/worker/checkins`): config gate chạy TRONG withSystemDb trước `attendanceEvent.create` — sites theo assignment ACTIVE, valid = lat + lng không null && `geoConfirmedAt` không null; không có row hợp lệ ⇒ KHÔNG tạo event, trả `{ error: 'SITE_GEOFENCE_NOT_CONFIGURED', message: <VI> }` với HTTP **422** trên route web (tránh xung đột `503 = offline-queue` của web worker page — gap T0); sau gate, `NONE` không thể phát sinh (sites rỗng đã bị chặn). GPS bỏ trống trong body khi site hợp lệ ⇒ tạo event với `geofenceResult` null (giữ hành vi hiện hành). | `CHOSEN` |
| DEC-06 | Admin UI: `page.tsx` mở rộng (sites qua service + `capability.geoConfig` mirror `PROJECT_GEO_CONFIG_ROLES`); mount `project-gps-client.tsx` (client component mới) — section "Cấu hình GPS (Geofence)" đặt ngay sau Metrics; bảng: tên, địa chỉ, lat, lng, radius, nhãn trạng thái (`Đã Admin xác nhận` / `Chưa được Admin xác nhận` / `Chưa có tọa độ`) + nút Chỉnh sửa (modal) + "Thêm Site mới" (modal) khi `capability.geoConfig`; flash/error/readonly theo phong cách hiện hành; KHÔNG đụng `project-detail-client.tsx` (giữ nguyên static-guard). | `CHOSEN` |
| DEC-07 | Tọa độ chỉ đến từ form Admin submit qua API, được validate theo DEC-02; không tự suy từ tên/địa chỉ (directive "không tự đoán tọa độ"); labels UI tiếng Việt cho mọi operator-facing copy; tests không chạm DB. | `CHOSEN` |
| DEC-08 | `POST /api/projects/[id]/sites` tạo Site gắn đúng `projectId` từ URL (đọc bằng `params`); body KHÔNG nhận projectId; project không tồn tại / ngoài RLS scope ⇒ 404. Không can thiệp vào data hiện có; không tạo Project mới, không seed. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | Không thêm dependency mới: zod/jose/prisma hiện hành đủ; geofence dùng haversine + native comparisons như checkGeofence hiện hành. | `N/A` | N/A | N/A | N/A | Không package install. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | Không tạo connector/scheduler/notification worker. | `N/A` | N/A | N/A | N/A | N/A | Config là CRUD scoped 1 bảng + audit; không automation. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | `Site` metadata xác nhận GPS (migration additive forward-only idempotent ship-only, không áp DB): `geo_confirmed_at`, `geo_confirmed_by_id` FK users SET NULL; Prisma schema mirror. |
| RQ-02 | Admin/BoD (`ADMIN`/`DIRECTOR` theo role thật trong code) xem + cập nhật địa chỉ/tọa độ/bán kính của Site theo Project; tạo Site cho Project hiện hữu dù chưa có site. Không xóa. |
| RQ-03 | API validation: lat/lng cả hai hoặc cả hai null; miền -90..90/-180..180; radius integer 1..2000; name cho create; error messages tiếng Việt; không tin project/siteId từ body; role gate từ service. |
| RQ-04 | Audit: mỗi create/update GPS thành công ghi `AuditLog` (entityType=`Site`, action, diff before/after, actor + ip/ua) trong cùng transaction. |
| RQ-05 | Metadata xác nhận: mọi lưu toạ độ hợp lệ từ Admin ⇒ set markers; xoá toạ độ ⇒ clear markers; UI hiển thị nhãn trạng thái theo marker + toạ độ; `radiusMeters` mặc định 200 chưa được coi là confirmed. |
| RQ-06 | Fail-closed check-in (`POST /api/worker/checkins`): assignment ACTIVE trỏ tới project không có site hợp lệ (lat+lng + confirmed) ⇒ 422 `SITE_GEOFENCE_NOT_CONFIGURED`, không tạo AttendanceEvent; không biến null thành 0,0; `NONE` không phát sinh. Event có GPS + site hợp lệ giữ nguyên behavior INSIDE/OUTSIDE + riskFlag; no-GPS + site hợp lệ giữ behavior null result. |
| RQ-07 | Admin UI section cấu hình GPS trên `/admin/projects/[id]` kết nối API thật; status nhãn rõ; readonly cho vai trò không đủ quyền; tiếng Việt theo static-guard copy. |
| RQ-08 | Contract gaps chốt T0 vào HANDOFF (không tự sửa contract): (a) HTTP status cho `SITE_GEOFENCE_NOT_CONFIGURED` 503 (contract) vs 422 (web offline conflict); (b) error code cho worker không assignment ACTIVE. |

### 4.2 Scope boundaries

- **In:** paths ở In-scope roots; ứng xử mới chỉ trên admin GPS + checkin gate + metadata xác nhận.
- **Out:** repo Android, OTP/referral/feedback (khác chặng), jobs/apply, mọi seed, mọi route mobile events; không tác động DB.
- **Allowed task artifacts:** `docs/tasks/hrp-t1a-android-gps-project-site-config/**`

### 4.3 Domain boundaries

- **Data/state:** Site additive-only; không backfill; không thay đổi RLS hiện hành (policy sites đã phủ ADMIN/DIRECTOR qua hrp_project_writable).
- **Permission/security:** chỉ ADMIN/DIRECTOR được write GPS; UI read cho VIEW_ROLES hiện hành; audit + ip/ua từ request; không log credential.
- **Interface/API:** routes mới theo root response conventions của `/api/projects/**` hiện hành (`{ site }`, error object `VN`); không bọc envelope `ok/data` (route web-admin hiện hành không dùng envelope mới; contract chỉ định envelope mới cho route MOBILE — gap T0 được ghi).
- **Migration/rollback:** forward-only; rollback = DROP column (T0 quyết riêng); migration SHIP-ONLY — không tự chạy lên DB.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | `prisma/schema.prisma` + migration | geo confirm metadata + FK; validate/generate không DB. | prisma validate/generate; static migration review | Diff ngoài 2 cột + relation ⇒ STOP |
| STEP-02 | Service `site-gps.service.ts` | list/create/update + validation + role gate + audit. | unit tests | Lỗi ngoài DEC-01/02/03 ⇒ STOP |
| STEP-03 | Routes `sites/route.ts` + `[siteId]/route.ts` | POST/PUT + idempotency (create) + error mapping. | unit tests | Response shape lỗi ⇒ STOP |
| STEP-04 | `checkins/route.ts` | Fail-closed config gate (422 web) + không `0,0` cho coords null. | unit tests | Đổi response shape hiện hành khi hợp lệ ⇒ STOP. |
| STEP-05 | `project-read.service.ts` + `page.tsx` + `project-gps-client.tsx` | DTO sites; page mount layout GPS section; UI readonly/Modal với labels VI + capability. | unit/static; typecheck | VI copy lock-down static test fail ⇒ STOP |
| STEP-06 | Gates: target tests + full unit + typecheck + prisma + diff --check | Canonical gates pass trước freeze. | exit codes từng gate | Gate fail môi trường ⇒ HANDOFF ghi rõ |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | verify-task.ps1 PASS trên TASK v1.0. | verify-task.ps1 |
| AC-02 | Service role gate: `ADMIN`/`DIRECTOR` cho phép; `HR_MANAGER`/`PM`/`HR_STAFF` bị `FORBIDDEN` (typed). | `npm run test:unit` (service test) |
| AC-03 | Validation: lat/lng cả hai hoặc cả hai null (400 khi chỉ một); trong miền; radius int 1..2000; create cần name 1..200; payload ngoài allowlist bị strip. | `npm run test:unit` |
| AC-04 | `updateSiteGps` hợp lệ: cập nhật `latitude/longitude/radiusMeters/address` + set markers `geoConfirmedAt/geoConfirmedById` khi có toạ độ; clear toạ độ ⇒ columns + markers null; audit `GPS_UPDATE` before/after trong cùng tx (actor + ip/ua). | `npm run test:unit` |
| AC-05 | `createSiteForProject`: tạo Site gắn project hiện hữu, cho phép khi project chưa có Site nào; 404 khi project không tồn tại; idempotency-key trên route create; audit `GPS_CREATE`. | `npm run test:unit` |
| AC-06 | Routes: 401 khi không ctx; 403 role ngoài allowlist; 400 INVALID_BODY / VALIDATION; 404 project/site không tồn tại; success 201/200 `{ site }` shape. | `npm run test:unit` |
| AC-07 | Check-in fail-closed: site có coords + `geoConfirmedAt` ⇒ INSIDE/OUTSIDE behavior giữ nguyên (event tạo, riskFlag đúng); coords thiếu `geoConfirmedAt` ⇒ 422 `SITE_GEOFENCE_NOT_CONFIGURED` **không tạo event**; sites rỗng / worker không có assignment ACTIVE site hợp lệ ⇒ 422 như trên; body không GPS + site hợp lệ ⇒ event tạo với geofenceResult null như cũ. | `npm run test:unit` |
| AC-08 | UI metadata xác nhận: GPS section labels render; capability `geoConfig` chỉ true cho ADMIN/DIRECTOR; banner readonly cho role khác; tiếng Việt; static-guard `project-terminology.test.ts` + `projects-role-visibility.static.test.ts` vẫn pass. | `npm run test:unit` + đọc test file |
| AC-09 | prisma validate + generate exit 0 (offline); `tsc --noEmit` exit 0; full `test:unit` exit 0; `git diff --cached --check` exit 0. | commands + exit codes |
| AC-10 | Migration: idempotent forward-only guard + final assertion (`geo_confirmed_at`/`geo_confirmed_by_id` tồn tại + FK SET NULL), không INSERT/GRANT, không nằm trong seed; **không áp DB**. | static test + đọc lại migration |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-10 |
| RQ-02 | STEP-02, STEP-03, STEP-05 | AC-02, AC-05, AC-06, AC-08 |
| RQ-03 | STEP-02, STEP-03 | AC-03, AC-06 |
| RQ-04 | STEP-02, STEP-03 | AC-04 |
| RQ-05 | STEP-01, STEP-02, STEP-05 | AC-04, AC-08, AC-10 |
| RQ-06 | STEP-04 | AC-07 |
| RQ-07 | STEP-05 | AC-08 |
| RQ-08 | STEP-06 | AC-01 (+HANDOFF) |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | Thứ tự triển khai: migration ship-only chờ T0; check-in bị chặn (422) cho tới khi migration áp + Admin lưu GPS lần đầu. | HANDOFF ghi thứ tự: (1) apply migration; (2) Admin cấu hình GPS; (3) check-in hoạt động; trước đó mọi check-in fail-closed rõ lý do bằng message VI. |
| RISK-02 | Web worker page hiện coi 503 là offline → chọn 422 làm gate không vào queue; nhưng user có thể chưa hiểu lý do. | Message VI rõ: "Site nhà máy chưa được Admin cấu hình GPS..." + ghi gap T0 chốt mapping giữa web (422) và contract mobile (503). |
| RISK-03 | Site có sẵn coordinates (import/manual cũ) nhưng chưa từng được Admin lưu qua form ⇒ chưa confirmed ⇒ check-in bị chặn cho tới khi Admin lưu lần đầu. | Nhãn "Chưa được Admin xác nhận" + cần một lần save để gắn marker; không auto-confirm (directive 5). |
| RISK-04 | Role allowlist `PROJECT_GEO_CONFIG_ROLES` trôi lệch giữa service và UI. | UI import đúng hằng số từ service (không string literal riêng); unit test mirror. |

## 8. Open Questions

- None cản code: các quyết định gap hợp đồng (DEC-04/05 status code, error code assignment-missing) đã chốt quyết định kỹ thuật T1 + ghi BLOCKER T0 chốt final (không chặn implementation; mobile events endpoint là task khác theo contract 6.1-3).

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | Tier 1 tự review: role gate, validation, audit trail, fail-closed semantics, migration safety, UI static guards, diff scope. | LIGHT audit sau freeze; correction budget 1. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-18 | Initial contract | Initial |
