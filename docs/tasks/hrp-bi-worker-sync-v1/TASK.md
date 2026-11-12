# TASK — `hrp-bi-worker-sync-v1`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-bi-worker-sync-v1` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `CUSTOM` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Thay đổi luồng đăng nhập CCCD, quyền chấm công GPS, lưu mật khẩu ban đầu mã hóa và đồng bộ dữ liệu PII hàng loạt từ BI dưới RLS. |
| Spec version | `v1.1` |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` |
| Baseline | `67b1e3948bffc071f3860cc2ee8562869308fd3e` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `prisma/**`, `src/domains/integrations/bi/**`, `src/shared/auth/**`, `app/api/auth/**`, `app/api/cron/bi-sync/**`, `app/api/workers/me/**`, `app/api/worker/checkins/route.ts`, `app/api/admin/integrations/bi/**`, `app/admin/integrations/bi/**`, `app/admin/settings/**`, `app/login/**`, `deploy/vps-production/**`, `docs/tasks/hrp-bi-worker-sync-v1/**`, `docs/integrations/bi/**` |
| Forbidden paths | `src/domains/staffing/**` (thuộc task `hrp-bi-job-posting-receiver-v1`) |
| Required gates | `npm run typecheck` · `npm run lint` · `npm run test:unit` · `npm run build` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver → /audit → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

- Mỗi NLĐ trong BI có CCCD hợp lệ tự động có tài khoản HRP (`WORKER`) và đăng nhập web/app bằng **CCCD + mật khẩu**.
- Mật khẩu ban đầu do hệ thống HRP tự sinh; QLDA (`PM` của dự án), `HR_MANAGER` và `ADMIN` xem/xuất Excel để gửi cho NLĐ; NLĐ bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.
- NLĐ chỉ chấm công được tại dự án mình đang làm (`ON`) theo dữ liệu BI, trong bán kính vị trí dự án đã xác nhận từ BI Catalog. Khi dự án chưa có tọa độ đã xác nhận (`location = null` hoặc `confirmedAt = null`), HRP tuyệt đối không tự suy đoán tọa độ và khóa check-in an toàn.
- NLĐ ở trạng thái "Đang chờ việc" (`UNCONFIRMED`), "Đã nghỉ" (`OFF`) hoặc hồ sơ bị xóa/hủy (`tombstone`) không chấm công được nữa, nhưng các tính năng khác của app vẫn hoạt động bình thường và dữ liệu công lịch sử được bảo toàn.
- Dự án, tọa độ dự án, người tuyển (tên + mã nhân sự) và đợt làm việc được đồng bộ từ BI lúc **06:00, 10:00, 14:00, 18:00** mỗi ngày bằng timer trên VPS HRP, tuân thủ chặt `sync_version` đơn điệu, opaque `pageCursor`/`checkpoint` và `tombstone` idempotent.
- NLĐ tự sửa được họ tên và thông tin cá nhân trên HRP; các trường đã tự sửa không bị BI ghi đè và không đồng bộ ngược về BI.
- Admin có trang `/admin/integrations/bi` để cấu hình key BI, xem lịch sử chạy, bấm "Đồng bộ ngay" / "Đối soát từ đầu", theo dõi ngoại lệ (thiếu CCCD, trùng đợt ON, xung đột tài khoản, dự án thiếu tọa độ) và map dự án.

### 1.2 Non-goals

- Không ghi ngược dữ liệu từ HRP sang BI.
- Không tạo tài khoản `User` cho người tuyển ở task này (sẽ làm ở plan riêng).
- Không đồng bộ thông tin ngân hàng, ảnh CCCD hay hợp đồng từ BI.
- Không nhận tin tuyển dụng từ BI (thuộc task riêng `hrp-bi-job-posting-receiver-v1`).
- Không sửa code repo Android trong task này (chỉ xuất bản prompt chuẩn cho T0-Android).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/api/auth/login/route.ts:35` và `src/shared/auth/preauth-db.ts:35` | Login hiện chỉ tra cứu theo `phone`, chưa có rate-limit chống dò CCCD/mật khẩu. |
| `EV-02` | `app/api/worker/checkins/events/route.ts:94` | Endpoint mobile đã chặn khi `employmentStatus != ACTIVE`, thiếu assignment `ACTIVE` hoặc `Site.geoConfirmedAt == null`. |
| `EV-03` | `app/api/worker/checkins/route.ts:91` | Endpoint check-in cũ chưa kiểm tra `employmentStatus` và `validFrom/validTo` — cần vá đồng bộ. |
| `EV-04` | `src/shared/auth/auth-context.ts:66` | `User.isActive = false` chặn toàn bộ API của user; khi NLĐ nghỉ việc chỉ đặt `Worker.employmentStatus = TERMINATED`. |
| `EV-05` | `src/shared/auth/with-system-db.ts:36` | Mẫu gắn principal hệ thống `system:*` dưới `FORCE RLS`. |
| `EV-06` | `src/shared/auth/etrust-credential-vault.ts:1` | Mẫu mã hóa AES-256-GCM + HKDF để bảo vệ API key BI và mật khẩu ban đầu. |
| `EV-07` | `src/domains/admin/worker-onboarding.service.ts:750` | Lõi nghiệp vụ tạo `User` / `Worker` / `LaborProfile` / `SourceClaim` / `ProjectAssignment`. |
| `EV-08` | `prisma/schema.prisma:621` | `Site` có `latitude`, `longitude`, `geoConfirmedAt` đều nullable — khớp tự nhiên với quy tắc không suy đoán tọa độ. |
| `EV-09` | `docs/integrations/bi/BI-HRP-WORKER-SYNC-CONTRACT.md:1` | Hợp đồng tích hợp BI → HRP `v1.1` (khớp `/v1/catalog` PR #211 `mini-bi` + 4 nguyên tắc ngày 2026-11-03). |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | BI là nguồn sự thật nhân sự/dự án; HRP chủ động **pull** qua API M2M `/api/integrations/hrp/v1/*`. | `CHOSEN` |
| `DEC-02` | Lịch kéo định kỳ: **06:00, 10:00, 14:00, 18:00** (`Asia/Ho_Chi_Minh`) bằng systemd timer trên VPS HRP gọi `POST http://127.0.0.1:3001/api/cron/bi-sync` (`x-cron-secret`). Admin có nút "Đồng bộ ngay" (incremental) và "Đối soát từ đầu" (full replay không truyền checkpoint). | `CHOSEN` |
| `DEC-03` | Khóa định danh người = CCCD canonical (`9` hoặc `12` chữ số). Khi `nationalIdState ≠ VALID`: không tạo tài khoản, ghi ngoại lệ `MISSING_OR_INVALID_CCCD` kèm `last_sync_version`, tự xử lý khi BI cập nhật CCCD hợp lệ (`sync_version` tăng). | `CHOSEN` |
| `DEC-04` | Mật khẩu ban đầu: HRP tự sinh 10 ký tự rõ ràng, lưu hash bcrypt trên `users` và bản mã hóa AES-256-GCM trong `worker_initial_credentials`; `PM` dự án / `HR_MANAGER` / `ADMIN` xem & xuất `.xlsx` (có ghi audit); xóa bản mã hóa ngay khi NLĐ đổi mật khẩu; bật `users.must_change_password = true`. | `CHOSEN` |
| `DEC-05` | Đăng nhập: giữ trường body `phone` để tương thích ngược Android; chuỗi `9`/`12` chữ số tra cứu theo CCCD, `0\d{9}` tra cứu theo SĐT; áp dụng rate-limit theo IP + định danh; lỗi chung không lộ sự tồn tại tài khoản. | `CHOSEN` |
| `DEC-06` | Ánh xạ trạng thái đợt sống: `ON → ACTIVE`, `UNCONFIRMED → PLANNED` (không chấm công), `OFF → ENDED` (`validTo = leaveDate`). `Worker.employmentStatus = ACTIVE` nếu còn `>= 1` đợt `ON`, ngược lại `TERMINATED`. Không bao giờ tắt `User.isActive` vì lý do nghỉ việc. | `CHOSEN` |
| `DEC-07` | Nhiều đợt `ON` cùng 1 CCCD: chọn đợt có `firstWorkDate` mới nhất làm `ACTIVE`, các đợt `ON` còn lại đặt `PAUSED` và ghi ngoại lệ `DUPLICATE_ON`. | `CHOSEN` |
| `DEC-08` | NLĐ được tự sửa họ tên và thông tin cá nhân trên HRP (trừ `cccdNumber`, trạng thái, dự án). Ghi tên trường đã sửa vào `workers.self_edited_fields` để BI sync không ghi đè; không đồng bộ ngược về BI. | `CHOSEN` |
| `DEC-09` | Người tuyển: lưu `recruiter_external_id`, `recruiter_name`, `recruiter_code` trực tiếp trên `project_assignments` (kèm dữ liệu danh mục từ `/v1/catalog`), chưa tạo user. | `CHOSEN` |
| `DEC-10` | Gộp tài khoản hiện hữu: trùng `Worker.cccdNumber` thì liên kết; trùng SĐT chuẩn hóa với `User` tự đăng ký chưa gắn `Worker` khác thì liên kết và giữ mật khẩu hiện tại (`must_change_password = false`); trường hợp mơ hồ ghi `ACCOUNT_CONFLICT`, không tự gộp. | `CHOSEN` |
| `DEC-11` | **Quy tắc #1 (`sync_version`):** Lưu `last_sync_version BIGINT` trên `external_entity_links` cho từng `episodeId`. Chỉ bỏ qua bản ghi khi `incoming.sync_version <= stored.last_sync_version`. Tuyệt đối không dùng `direct_entries.version` để skip. | `CHOSEN` |
| `DEC-12` | **Quy tắc #2 (Opaque Cursor & Checkpoint):** Xem `pageCursor`/`nextPageCursor` và `checkpoint` là token opaque hoàn toàn; **không giải mã, không tự lùi 10 phút**. Chỉ lưu `checkpoint` hoàn tất mới sau khi kéo thành công hết mọi trang (`hasMore === false`); nếu lỗi giữa chừng thì giữ nguyên `checkpoint` cũ để lần sau chạy tiếp từ đó. | `CHOSEN` |
| `DEC-13` | **Quy tắc #3 (Tombstone idempotent & giữ lịch sử):** Nhận `tombstone` tường minh từ `/v1/worker-episodes` (kể cả khi mọi trường thông tin hồ sơ đều `null`/vắng mặt do xóa cứng). Xử lý idempotent theo `sync_version`: không xóa cứng `Worker`/`AttendanceEvent`/`TimesheetLine`; chuyển `ProjectAssignment` sang `ENDED` nếu đã có lịch sử công hoặc `CANCELLED` nếu chưa có; tính lại `Worker.employmentStatus`; đóng ngoại lệ mở của đợt đó; ghi mốc tombstone kể cả với `episodeId` chưa từng đồng bộ trước đó. | `CHOSEN` |
| `DEC-14` | **Quy tắc #4 (Tọa độ dự án từ Catalog, không tự suy đoán):** Đọc vị trí duy nhất từ `/v1/catalog`. Khi `location === null` hoặc `location.confirmedAt === null`, không suy đoán tọa độ, đặt `geoConfirmedAt = null` trên `Site` nguồn BI (hoặc tạo `Site` nguồn BI với `latitude = null, longitude = null, geoConfirmedAt = null`) và ghi ngoại lệ `PROJECT_LOCATION_MISSING`. | `CHOSEN` |
| `DEC-15` | Vá `POST /api/worker/checkins` áp dụng đúng gate `employmentStatus === 'ACTIVE'`, `profileStatus === 'VERIFIED'` và hiệu lực `ProjectAssignment` như `POST /api/worker/checkins/events`. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | `crypto`, `bcryptjs`, `jose`, `Prisma`, `xlsx` nội bộ đã có | `N/A` | N/A | N/A | N/A | Không thêm dependency mới; tái sử dụng toàn bộ primitive sẵn có trong repo. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Lịch kéo đồng bộ BI 4h/lần | n8n, GitHub Actions schedule, systemd timer trên VPS HRP | `CUSTOM` | systemd timer trên VPS HRP | Timer chỉ gọi `POST /api/cron/bi-sync` bằng `x-cron-secret`; mọi quyền RLS, chuyển trạng thái domain, idempotency và audit thuộc HRP. | Advisory lock chống chồng lượt; phân trang opaque `pageCursor`; chỉ lưu `checkpoint` khi hoàn tất hết mọi trang; idempotent theo `(episodeId, sync_version)` + tombstone idempotent. | `bi_sync_runs`, `bi_sync_exceptions`, trang `/admin/integrations/bi`, `journalctl`. | `CUSTOM_AUTOMATION_JUSTIFICATION`: Owner chỉ định hẹn giờ trực tiếp trên VPS HRP; đảm bảo tính cục bộ giao dịch với Postgres RLS và loại bỏ phụ thuộc hệ thống trung gian cho lịch chạy cố định 4 lần/ngày. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Migration forward-only, idempotent, bật `ENABLE` + `FORCE ROW LEVEL SECURITY`, `GRANT` cho `app_user_writer, app_user` và khối `DO $$` hậu kiểm cuối file cho: `external_entity_links` (`hrp_id` nullable để lưu cả tombstone chưa từng có bản ghi HRP, `last_sync_version BIGINT NOT NULL DEFAULT 0`, `is_tombstoned BOOLEAN NOT NULL DEFAULT false`), `bi_sync_runs` (`checkpoint_before`, `checkpoint_after`, counters, không chứa PII), `bi_sync_exceptions`, `bi_sync_credentials` (singleton lưu URL, key mã hóa AES-256-GCM và `worker_sync_checkpoint TEXT NULL`), `worker_initial_credentials`; bổ sung cột `users.must_change_password`, `workers.self_edited_fields`, `project_assignments.{source_system, external_ref, recruiter_external_id, recruiter_name, recruiter_code}`, `sites.{source_system, external_ref}`. |
| `RQ-02` | Khai báo `SYSTEM_BI_SYNC` (`userId: 'system:bi-sync'`, `role: 'ADMIN'`) trong `src/shared/auth/with-system-db.ts` và pin RLS policy cho các bảng tích hợp BI. |
| `RQ-03` | `BiSyncClient`: gọi `GET /v1/catalog` (khớp exact schema `HrpSyncCatalogPayload` của `mini-bi` PR #211) và `GET /v1/worker-episodes` (truyền opaque `checkpoint` ở trang 1, opaque `pageCursor` ở các trang kế tiếp, `X-Request-Id` UUID, timeout 30s, retry có giới hạn cho `429`/`5xx` tôn trọng `Retry-After`). Hỗ trợ cả biến thể camelCase/snake_case cho `sync_version`, `isTombstone`, `nextPageCursor`, `checkpoint`. Tuyệt đối không giải mã/chỉnh sửa cursor và không log PII. |
| `RQ-04` | `BiSyncService`: chạy dưới advisory lock; (a) đồng bộ `/v1/catalog` để tạo/cập nhật `Project` + `Site` nguồn BI theo đúng `DEC-14` (`location = null` hoặc `confirmedAt = null` thì không suy đoán tọa độ, đặt `geoConfirmedAt = null` và mở ngoại lệ `PROJECT_LOCATION_MISSING`; có tọa độ xác nhận thì cập nhật geofence và đóng ngoại lệ); (b) duyệt từng trang `/v1/worker-episodes`, chỉ bỏ qua phần tử khi `incoming.sync_version <= stored.last_sync_version` (`DEC-11`), xử lý đợt sống (`DEC-03, 06, 07, 08, 09, 10`) và xử lý `tombstone` idempotent giữ nguyên lịch sử công/hồ sơ (`DEC-13`); (c) **chỉ lưu `checkpoint` mới vào `bi_sync_credentials` sau khi toàn bộ các trang hoàn tất (`hasMore === false`) không lỗi** (`DEC-12`). |
| `RQ-05` | Route `POST /api/cron/bi-sync` (`verifyCronSecret`) và `POST /api/admin/integrations/bi/sync` (cho `ADMIN`, hỗ trợ `INCREMENTAL` từ `checkpoint` hiện hữu và `FULL_RESYNC` đọc lại từ đầu không truyền `checkpoint`). |
| `RQ-06` | Mở rộng đăng nhập CCCD (`DEC-05`): thêm `findUserForLoginByCccd` trong `src/shared/auth/preauth-db.ts`, thêm rate-limit cho `POST /api/auth/login`, trả kèm `mustChangePassword`; thêm `POST /api/auth/change-password` (xác thực mật khẩu hiện tại, tối thiểu 8 ký tự, tắt `must_change_password` và xóa `worker_initial_credentials`); chặn các API `WORKER` khác bằng `403 PASSWORD_CHANGE_REQUIRED` khi chưa đổi mật khẩu lần đầu (trừ `me`, `change-password`, `logout`) và cập nhật UI `/login` trên web. |
| `RQ-07` | Quản lý mật khẩu ban đầu (`DEC-04`): API xem danh sách & xuất `.xlsx` theo dự án cho `ADMIN`, `HR_MANAGER` và `PM` được phân công dự án đó (mỗi thao tác xem/xuất ghi `AuditLog` không chứa plaintext mật khẩu); nút "Cấp lại mật khẩu" cho `ADMIN` / `HR_MANAGER`. |
| `RQ-08` | `PATCH /api/workers/me` (`DEC-08`): chỉ cho phép sửa các cột cá nhân trong allowlist (`fullName`, `dateOfBirth`, `gender`, `maritalStatus`, `permanentAddress`, `currentAddress`, `hometown`, `ethnicGroup`, `religion`, `phone` liên hệ, `bank*`, `taxCode`, `insuranceCode`, `selfieImageUrl`), từ chối sửa `cccdNumber`/status/assignment, và ghi nhận tên trường vào `workers.self_edited_fields`. |
| `RQ-09` | Vá `POST /api/worker/checkins` (`DEC-15`) để kiểm tra `profileStatus === 'VERIFIED'`, `employmentStatus === 'ACTIVE'` và hiệu lực `ProjectAssignment` đồng nhất với `POST /api/worker/checkins/events` và `canCheckIn` trong `GET /api/workers/me`. |
| `RQ-10` | Trang quản trị `/admin/integrations/bi`: cấu hình Base URL + Bearer key (lưu vault), trạng thái `checkpoint` & lịch sử `bi_sync_runs`, nút "Đồng bộ ngay" / "Đối soát từ đầu", danh sách `bi_sync_exceptions` theo loại, bảng ánh xạ dự án BI ↔ Project HRP và khu vực xem/xuất mật khẩu ban đầu. |
| `RQ-11` | Cấu hình hạ tầng hẹn giờ `deploy/vps-production/hrp-bi-sync.{service,timer}` (`OnCalendar=*-*-* 06,10,14,18:00:00`, timezone `Asia/Ho_Chi_Minh`, `Persistent=true`) kèm tài liệu cài đặt một lần trên VPS HRP. |
| `RQ-12` | Bàn giao tài liệu hướng dẫn/prompt cho T0-Android (đổi nhãn ô đăng nhập thành "CCCD hoặc số điện thoại", bỏ ràng buộc regex SĐT cứng phía client, xử lý `mustChangePassword` / `403 PASSWORD_CHANGE_REQUIRED`). |

### 4.2 Scope boundaries

- **In:** Toàn bộ đường dẫn trong `In-scope roots`.
- **Out:** Mã nguồn repo `mini-bi`; luồng nhận tin tuyển dụng (`src/domains/staffing/**`); tạo tài khoản người tuyển; mã nguồn repo Android.
- **Allowed task artifacts:** `docs/tasks/hrp-bi-worker-sync-v1/**`

### 4.3 Domain boundaries

- **Data/state:** Mọi thao tác ghi đồng bộ chạy dưới `withSystemDb(SYSTEM_BI_SYNC)`. Không bao giờ xóa cứng `User`, `Worker`, `ProjectAssignment`, `AttendanceEvent`, `CheckIn`, `TimesheetLine`. Chỉ skip theo `sync_version <= last_sync_version`. Chỉ commit `worker_sync_checkpoint` sau khi toàn bộ trang của lượt chạy thành công.
- **Permission/security:** CCCD, SĐT, mật khẩu và Bearer key BI không bao giờ xuất hiện trong `console.*`, `AuditLog` diff, `bi_sync_runs` hay payload lỗi. Mật khẩu ban đầu và API key BI mã hóa bằng AES-256-GCM với domain-separated HKDF info riêng (`hrp:bi-initial-credentials:v1`, `hrp:bi-sync-credentials:v1`).
- **Interface/API:** `POST /api/auth/login` giữ nguyên tên trường `phone` để tương thích ngược hoàn toàn với Android hiện hữu.
- **Migration/rollback:** Migration chỉ thêm bảng/cột (additive, forward-only). Khi cần ngắt khẩn cấp trên PROD chỉ cần tắt timer hoặc xóa key trong trang cấu hình BI mà không cần rollback schema.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `prisma/**` | Thiết kế schema & migration additive có FORCE RLS + khối hậu kiểm (`RQ-01`) | `npm run test:unit` (migration static checks) | Xung đột policy RLS hoặc unique index hiện hữu |
| `STEP-02` | `src/shared/auth/**`, `app/api/auth/**`, `app/login/**` | Thêm `SYSTEM_BI_SYNC`, login CCCD + rate-limit, đổi mật khẩu bắt buộc lần đầu (`RQ-02`, `RQ-06`) | Unit & route tests cho login CCCD/SĐT, rate-limit, `PASSWORD_CHANGE_REQUIRED` | — |
| `STEP-03` | `src/domains/integrations/bi/**` | Xây dựng vault, `BiSyncClient` và `BiSyncService` tuân thủ `sync_version`, opaque `pageCursor`/`checkpoint`, `tombstone` giữ lịch sử và Catalog `location` fail-closed (`RQ-03`, `RQ-04`) | Unit tests cho client, mapper, pagination/checkpoint recovery, tombstone idempotency, location null | Hợp đồng API BI thay đổi ngoài `v1.1` |
| `STEP-04` | `app/api/cron/bi-sync/**`, `app/api/admin/integrations/bi/**`, `app/admin/integrations/bi/**`, `app/admin/settings/**` | Các endpoint cron/admin, quản lý mật khẩu ban đầu + xuất `.xlsx`, và UI quản trị BI (`RQ-05`, `RQ-07`, `RQ-10`) | Route tests (cron auth, RBAC scope PM/HR/ADMIN, audit credential view) | — |
| `STEP-05` | `app/api/workers/me/**`, `app/api/worker/checkins/route.ts` | Allowlist tự sửa hồ sơ cá nhân (`self_edited_fields`) và vá gate check-in cũ (`RQ-08`, `RQ-09`) | Route tests cho allowlist `PATCH /api/workers/me` và gate check-in `403` | — |
| `STEP-06` | `deploy/vps-production/**`, `docs/tasks/hrp-bi-worker-sync-v1/**` | Unit files systemd timer 4h/lần + prompt tích hợp cho T0-Android + `HANDOFF.md` (`RQ-11`, `RQ-12`) | Kiểm tra cấu hình systemd timer, chạy đủ `Required gates` | — |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Đợt `ON` có CCCD hợp lệ tạo `User` (`must_change_password = true`), `Worker` (`ACTIVE`), `ProjectAssignment` (`ACTIVE`) đúng dự án + người tuyển và `worker_initial_credentials` mã hóa; migration thỏa mãn static/RLS assertions | `npm run test:unit` (unit test `BiSyncService` + migration static test) |
| `AC-02` | `UNCONFIRMED` tạo assignment `PLANNED` (`canCheckIn = false`); `OFF` chuyển assignment `ENDED` và `Worker.employmentStatus = TERMINATED`, bị chặn `403` ở **cả hai** route check-in trong khi login và `GET /api/workers/me` vẫn trả `200` | `npm run test:unit` (service + checkin route tests) |
| `AC-03` | Đợt thiếu/sai CCCD không tạo `User`, ghi `MISSING_OR_INVALID_CCCD` kèm `last_sync_version`; khi BI gửi lại với `sync_version` lớn hơn và CCCD hợp lệ thì tạo tài khoản và chuyển ngoại lệ sang `RESOLVED` | `npm run test:unit` |
| `AC-04` | `PATCH /api/workers/me` chỉ cập nhật trường trong allowlist, chặn sửa `cccdNumber`/status/assignment, ghi `self_edited_fields`; lần sync BI kế tiếp (`sync_version` tăng) giữ nguyên các trường trong `self_edited_fields` và chỉ cập nhật trường khác | `npm run test:unit` (worker me route test + sync mapper test) |
| `AC-05` | `POST /api/auth/login` đăng nhập được bằng cả CCCD (`9`/`12` số) lẫn SĐT cũ, áp dụng rate-limit `429`, trả `mustChangePassword = true`, chặn API `WORKER` bằng `403 PASSWORD_CHANGE_REQUIRED` cho đến khi `POST /api/auth/change-password` thành công | `npm run test:unit` (auth route tests) |
| `AC-06` | `PM` chỉ xem/xuất được mật khẩu ban đầu của NLĐ thuộc dự án mình quản lý (`HR_MANAGER`/`ADMIN` xem toàn cục), mỗi lượt xem/xuất đều ghi `AuditLog`, và mật khẩu ban đầu bị xóa ngay sau khi NLĐ đổi mật khẩu | `npm run test:unit` (credentials route tests) |
| `AC-07` | **Phiên bản & Checkpoint:** Chỉ skip khi `sync_version <= last_sync_version` (kể cả khi `direct_entries.version` không đổi lúc chuyển `ON → OFF`); không bao giờ giải mã hay lùi 10 phút trên `pageCursor`/`checkpoint`; nếu trang 2 lỗi thì `worker_sync_checkpoint` giữ nguyên giá trị cũ và lần chạy lại tiếp tục từ `checkpoint` cũ mà không nhân bản dữ liệu trang 1; 2 lượt chạy đồng thời bị chặn bởi advisory lock | `npm run test:unit` (pagination, failure-recovery & concurrency tests) |
| `AC-08` | Không lộ CCCD, SĐT, mật khẩu hay Bearer key trong `console.*`, `AuditLog`, `bi_sync_runs` hoặc thông báo lỗi API | `npm run test:unit` (console/audit PII spy tests) |
| `AC-09` | Toàn bộ canonical gates chạy xanh (`typecheck`, `lint`, `test:unit`, `build`) và UI/API quản trị `/admin/integrations/bi` + `/api/cron/bi-sync` hoạt động đúng quyền | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build` |
| `AC-10` | **Tombstone idempotent & giữ lịch sử:** Nhận `isTombstone = true` (không có `person`/`status`) với `sync_version` mới hơn sẽ đóng phân công (`ENDED` nếu đã có lịch sử công, `CANCELLED` nếu chưa), cập nhật lại `Worker.employmentStatus`, giữ nguyên toàn bộ `Worker`/`AttendanceEvent`/`TimesheetLine`, đóng ngoại lệ mở; phát lại cùng hoặc nhỏ hơn `sync_version` (kể cả đợt chưa từng xuất hiện trước khi bị xóa) là no-op an toàn | `npm run test:unit` (tombstone lifecycle tests) |
| `AC-11` | **Catalog Location fail-closed & hạ tầng:** Khi `/v1/catalog` trả `location = null` hoặc `confirmedAt = null`, hệ thống không tự suy đoán tọa độ, giữ `Site.geoConfirmedAt = null` (`canCheckIn = false`), ghi `PROJECT_LOCATION_MISSING`, và tự mở khóa khi Catalog có tọa độ xác nhận; đầy đủ file systemd timer 4h/lần và tài liệu prompt T0-Android | `npm run test:unit` + document review `deploy/vps-production/hrp-bi-sync.timer` & `HANDOFF.md` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-09` |
| `RQ-02` | `STEP-02` | `AC-01`, `AC-09` |
| `RQ-03` | `STEP-03` | `AC-07`, `AC-08`, `AC-11` |
| `RQ-04` | `STEP-03` | `AC-01`, `AC-02`, `AC-03`, `AC-04`, `AC-07`, `AC-10`, `AC-11` |
| `RQ-05` | `STEP-04` | `AC-07`, `AC-09` |
| `RQ-06` | `STEP-02` | `AC-05`, `AC-09` |
| `RQ-07` | `STEP-04` | `AC-06`, `AC-08` |
| `RQ-08` | `STEP-05` | `AC-04`, `AC-09` |
| `RQ-09` | `STEP-05` | `AC-02`, `AC-09` |
| `RQ-10` | `STEP-04` | `AC-09`, `AC-11` |
| `RQ-11` | `STEP-06` | `AC-11` |
| `RQ-12` | `STEP-06` | `AC-11` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Dò mật khẩu theo CCCD trên endpoint đăng nhập | Rate-limit theo IP + định danh, bắt đổi mật khẩu ngay lần đầu đăng nhập, thông báo lỗi chung. |
| `RISK-02` | Lộ mật khẩu ban đầu khi phân phối cho NLĐ | Mã hóa AES-256-GCM trong DB, giới hạn xem theo scope dự án của `PM`, ghi `AuditLog` mọi lần xem/xuất, xóa ngay khi NLĐ đổi mật khẩu. |
| `RISK-03` | Lỗi mạng giữa chừng khi kéo nhiều trang làm mất dữ liệu trang sau | Chỉ lưu `worker_sync_checkpoint` sau khi kéo thành công hết mọi trang (`hasMore === false`); lần sau chạy lại từ `checkpoint` cũ, các bản ghi trang đầu được skip an toàn qua `sync_version <= last_sync_version`. |
| `RISK-04` | Xóa cứng hồ sơ bên BI làm mất lịch sử chấm công hoặc sót trạng thái | Xử lý `tombstone` tường minh theo `sync_version`; chỉ chuyển phân công sang `ENDED`/`CANCELLED`, bảo toàn 100% lịch sử `Worker`, `AttendanceEvent`, `TimesheetLine`. |
| `RISK-05` | Dự án BI chưa xác nhận tọa độ khiến check-in sai vị trí | Tuyệt đối không tự suy đoán tọa độ; giữ `geoConfirmedAt = null` (fail-closed) và cảnh báo `PROJECT_LOCATION_MISSING` trên trang Admin. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-29` | Initial contract | Owner chốt phương án tích hợp BI → HRP |
| `v1.1` | `2026-11-03` | Cập nhật 4 quy tắc đồng bộ từ BI T0 (`sync_version`, opaque `pageCursor` & `checkpoint` không lùi 10 phút, `tombstone` idempotent giữ lịch sử, `Catalog.location` fail-closed không suy đoán tọa độ) và khớp `/v1/catalog` với PR #211 `mini-bi` | Thống nhất hợp đồng tích hợp giữa BI và HRP |
