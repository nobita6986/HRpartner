# Hợp đồng tích hợp BI → HRP: Đồng bộ NLĐ, Dự án, Người tuyển (v1.1)

| Mục | Giá trị |
|---|---|
| Phiên bản | `1.1` (2026-11-03) |
| Bên cung cấp API | **mini-bi** (`bi.hrpartner.vn`) |
| Bên tiêu thụ | **HRP / vieclam** (`vieclammienbac.com.vn`) |
| Hướng dữ liệu | Một chiều BI → HRP. **HRP chủ động kéo (pull).** HRP không ghi ngược vào BI. |
| Lịch kéo | 4 lần/ngày lúc **06:00, 10:00, 14:00, 18:00** (Asia/Ho_Chi_Minh), chạy bằng systemd timer trên VPS HRP. Admin HRP có nút "Đồng bộ ngay" và "Đối soát từ đầu". |
| Môi trường nguồn | Supabase PROD chính của BI (project dùng cho `bi.hrpartner.vn`). |

> [!IMPORTANT]
> Bản `v1.1` đồng bộ với `GET /api/integrations/hrp/v1/catalog` đã merge trên `mini-bi` (PR #211, #212) và khóa 4 nguyên tắc tích hợp thống nhất giữa T0 BI & T0 HRP ngày `2026-11-03`:
> 1. **`sync_version` đơn điệu:** HRP chỉ bỏ qua bản ghi khi `sync_version` nhận được **không mới hơn (`<=`)** bản đã lưu; tuyệt đối không dùng `direct_entries.version`.
> 2. **Opaque Cursor & Checkpoint:** HRP xem `pageCursor` và `checkpoint` là chuỗi opaque 100%, **không tự giải mã và không tự lùi 10 phút**. BI xử lý cửa sổ chồng lấn phía server; HRP chỉ lưu `checkpoint` mới sau khi kéo thành công **tất cả các trang**.
> 3. **Tombstone tường minh:** API trả tombstone khi hồ sơ/đợt làm việc bị xóa (kể cả xóa cứng/purge PII) hoặc hủy hiệu lực; HRP xử lý tombstone idempotent, giữ nguyên lịch sử công/hồ sơ cần thiết và không phụ thuộc bản ghi xóa cứng còn nằm trong bảng gốc.
> 4. **Tọa độ dự án từ Catalog:** HRP đọc vị trí dự án duy nhất từ `/v1/catalog`; khi `location = null` hoặc `confirmedAt = null`, HRP **tuyệt đối không tự suy đoán tọa độ** (giữ trạng thái chưa xác nhận GPS để chặn chấm công an toàn).

---

## 1. Trách nhiệm phía BI

1. **Vị trí dự án & `GET /api/integrations/hrp/v1/catalog`** *(Đã hoàn thành trên `mini-bi` PR #211 & #212)*:
   - Cột `location_address`, `location_latitude`, `location_longitude`, `location_radius_meters`, `location_confirmed_at`, `location_confirmed_by_user_id` trên `direct_entry_projects` + lịch sử revision.
   - RPC `public.hrp_sync_catalog(p_auth_subject, p_app_user_id, p_request_id)` và route `GET /api/integrations/hrp/v1/catalog`.
2. **Endpoint đồng bộ đợt làm việc & Tombstone — `GET /api/integrations/hrp/v1/worker-episodes`**:
   - RPC `SECURITY DEFINER` (chỉ grant `service_role`) và route M2M dùng chung `authenticateHrpSyncRequest` (`src/lib/integrations/hrp/auth.ts`).
   - Bảo đảm **`sync_version`** (số nguyên dương đơn điệu tăng) tăng trên **mọi** thay đổi được đồng bộ của một `episodeId`: thông tin hồ sơ (`worker_details`, CCCD), dự án/người tuyển/ngày vào làm/loại hình lao động, sự kiện trạng thái làm việc (`UNCONFIRMED`/`ON`/`OFF`/`leave_date`), và trạng thái hủy/xóa (tombstone). Không dùng `direct_entries.version` làm khóa so sánh phiên bản đồng bộ.
   - Quy định rõ **token tiếp tục trang** (`nextPageCursor` / `pageCursor`) và **checkpoint hoàn tất** (`checkpoint`), đồng thời xử lý phần thời gian chồng lấn (late-commit overlap) phía server BI.
   - Phát **tombstone** cho các đợt bị xóa/thu hồi hiệu lực để HRP cập nhật trạng thái mà không cần truy vấn vào dòng đã xóa cứng. *(Nhờ có `sync_version` + server-side overlap `checkpoint` + `tombstone`, không bắt buộc xây thêm endpoint `/reconcile` riêng).*
3. **Audit an toàn PII:** Ghi request id, số bản ghi trả về; **không ghi CCCD/SĐT** vào log hay bảng audit.

---

## 2. Xác thực & vận chuyển (khớp `mini-bi/src/lib/integrations/hrp/auth.ts`)

| Mục | Quy định |
|---|---|
| Base URL | `https://bi.hrpartner.vn/api/integrations/hrp/v1` |
| Giao thức | HTTPS (TLS ≥ 1.2). Chỉ `GET`. |
| Header bắt buộc | `Authorization: Bearer <HRP_SYNC_API_KEY>` (≥ 32 ký tự) và `X-Request-Id: <uuid>` (HRP sinh UUID v4 hợp lệ). |
| Xoay key | BI hỗ trợ đồng thời `HRP_SYNC_API_KEY` và `HRP_SYNC_API_KEY_NEXT`. HRP lưu key mã hóa AES-256-GCM trong vault. |
| Giới hạn | ≤ 60 request/phút/key (`HRP_SYNC_RATE_LIMIT_MAX_REQUESTS = 60`). Quá ngưỡng trả `429` kèm header `Retry-After`. |
| Định dạng | `application/json; charset=utf-8`. Thời gian chuẩn ISO-8601 (`UTC Z` hoặc offset), ngày dạng `YYYY-MM-DD`. |

**Envelope lỗi chuẩn:**

```json
{ "ok": false, "error": { "code": "MISSING_BEARER_TOKEN", "message": "..." } }
```

| HTTP | `code` (theo `mini-bi` + mở rộng cho `worker-episodes`) | Khi nào |
|---|---|---|
| 400 | `INVALID_REQUEST_ID` / `INVALID_CURSOR` / `INVALID_CHECKPOINT` / `INVALID_LIMIT` | `X-Request-Id` không phải UUID, token hỏng/hết hạn hoặc `limit` ngoài `1..500` |
| 401 | `MISSING_BEARER_TOKEN` / `INVALID_BEARER_TOKEN` | Thiếu hoặc sai Bearer key |
| 403 | `HRP_SYNC_ACTOR_DENIED` | Tài khoản dịch vụ `HRP_SYNC_AUTH_SUBJECT` bị vô hiệu hóa hoặc không có quyền |
| 429 | `RATE_LIMITED` | Vượt giới hạn tần suất (có `Retry-After`) |
| 503 | `SERVICE_DISABLED` / `SERVICE_MISCONFIGURED` / `SERVICE_ACTOR_MISCONFIGURED` / `SERVICE_ACTOR_UNAVAILABLE` / `HRP_SYNC_CATALOG_UNAVAILABLE` / `HRP_SYNC_EPISODES_UNAVAILABLE` | API đang tắt hoặc lỗi cấu hình/truy vấn tạm thời (message không chứa PII) |

---

## 3. Đặc tả Endpoint

### 3.1 `GET /catalog` *(Đã live trên `mini-bi`)*

Trả toàn bộ danh mục dự án, người tuyển và loại hình lao động (khớp chính xác `HrpSyncCatalogPayload` tại `src/lib/integrations/hrp/catalog-contract.ts`):

```json
{
  "ok": true,
  "serverTime": "2026-11-03T06:00:01.120Z",
  "projects": [
    {
      "projectId": "samsung-yen-phong",
      "displayName": "Samsung Yên Phong",
      "active": true,
      "version": 7,
      "updatedAt": "2026-11-02T09:12:00.000Z",
      "location": {
        "address": "KCN Yên Phong, Bắc Ninh",
        "latitude": 21.2001234,
        "longitude": 105.9512345,
        "radiusMeters": 300,
        "confirmedAt": "2026-11-02T09:12:00.000Z"
      }
    }
  ],
  "recruiters": [
    {
      "recruiterId": "6b0c3d90-1234-4a5b-8cde-112233445566",
      "displayName": "Nguyễn Thị Hoa",
      "personnelCode": "NV-0123",
      "personnelPosition": "Chuyên viên tuyển dụng",
      "active": true,
      "providerTypes": ["hrp"],
      "teams": [
        {
          "teamId": "9a8b7c6d-1234-4a5b-8cde-665544332211",
          "code": "TEAM-BN",
          "displayName": "Team Bắc Ninh",
          "active": true
        }
      ]
    }
  ],
  "laborTypes": [
    {
      "key": "TEMPORARY",
      "displayName": "Thời vụ",
      "active": true,
      "sortOrder": 10,
      "version": 1
    }
  ]
}
```

**Quy tắc xử lý `projects[].location` tại HRP (Nguyên tắc #4):**
- HRP đọc vị trí dự án **duy nhất** từ `/catalog`.
- Khi `location === null` **hoặc** `location.confirmedAt === null`:
  - HRP **tuyệt đối không tự suy đoán tọa độ** (không geocode địa chỉ/tên dự án, không gán tọa độ mặc định).
  - Nếu dự án đã có `Site` nguồn BI trước đó, HRP đặt `geoConfirmedAt = null` (và xóa tọa độ nếu `location === null`) để khóa check-in GPS theo cơ chế fail-closed (`SITE_GEOFENCE_NOT_CONFIGURED`), đồng thời ghi cảnh báo `PROJECT_LOCATION_MISSING` cho Admin.
- Chỉ khi `location !== null` và có đủ `latitude`, `longitude`, `radiusMeters`, `confirmedAt !== null`, HRP mới cập nhật `Site` nguồn BI với `geoConfirmedAt = confirmedAt` và đóng cảnh báo `PROJECT_LOCATION_MISSING`.

---

### 3.2 `GET /worker-episodes`

Kéo danh sách các đợt làm việc (`episode`) và `tombstone` thay đổi kể từ `checkpoint` đã hoàn tất trước đó.

**Tham số truy vấn (Query Parameters):**
- Trang đầu tiên của lượt chạy:
  - Lần chạy đầu tiên (chưa có checkpoint): `GET /worker-episodes?limit=500`
  - Các lượt chạy định kỳ tiếp theo: `GET /worker-episodes?checkpoint=<opaque_checkpoint>&limit=500`
- Các trang tiếp theo trong cùng một lượt chạy (khi trang trước trả `hasMore = true`):
  - `GET /worker-episodes?pageCursor=<opaque_next_page_cursor>&limit=500`

*(Lưu ý: `checkpoint` và `pageCursor` là chuỗi opaque do BI phát hành; HRP chỉ truyền nguyên văn qua `encodeURIComponent`, không bao giờ tự giải mã hay chỉnh sửa).*

**Response JSON (ví dụ gồm cả hồ sơ sống và tombstone):**

```json
{
  "ok": true,
  "serverTime": "2026-11-03T06:00:02.004Z",
  "items": [
    {
      "episodeId": "8f3e2c1a-0d4b-4e7a-9a11-2f5b6c7d8e90",
      "sync_version": 18,
      "isTombstone": false,
      "employeeCode": "hrp-2026-000123",
      "nationalId": "001099001122",
      "nationalIdState": "VALID",
      "person": {
        "fullName": "Trần Văn Nam",
        "dateOfBirth": "1999-07-10",
        "dateOfBirthRaw": "10/07/1999",
        "gender": "MALE",
        "phone": "0912 345 678",
        "address": "Xã Bình Tuyền, Phú Thọ",
        "nationalIdIssuedAt": "2021-04-12",
        "nationalIdIssuedPlace": "Cục CS QLHC về TTXH"
      },
      "projectId": "samsung-yen-phong",
      "firstWorkDate": "2026-10-20",
      "laborType": "TEMPORARY",
      "providerType": "hrp",
      "vendor": null,
      "recruiter": {
        "recruiterId": "6b0c3d90-1234-4a5b-8cde-112233445566",
        "personnelCode": "NV-0123",
        "displayName": "Nguyễn Thị Hoa"
      },
      "status": {
        "value": "ON",
        "effectiveDate": "2026-10-20",
        "leaveDate": null,
        "appliedAt": "2026-10-20T08:01:00.000Z"
      }
    },
    {
      "episodeId": "4a1d9b20-7c3e-4f10-8b22-9c8d7e6f5a40",
      "sync_version": 25,
      "isTombstone": true,
      "tombstoneReason": "DELETED",
      "deletedAt": "2026-11-03T03:15:00.000Z"
    }
  ],
  "hasMore": false,
  "nextPageCursor": null,
  "checkpoint": "opaque-checkpoint-token-issued-by-bi"
}
```

> [!TIP]
> **Tương thích tên trường ở parser phía HRP:** Để tránh lệch quy ước đặt tên camelCase / snake_case khi tích hợp, adapter của HRP chấp nhận cả hai biến thể cho các khóa điều khiển: `sync_version` / `syncVersion`, `isTombstone` / `is_tombstone` (hoặc `recordState === "TOMBSTONE"` / `deleted === true` / `voided === true`), `tombstoneReason` / `tombstone_reason`, `deletedAt` / `deleted_at`, `nextPageCursor` / `next_page_cursor`, `checkpoint` / `nextCheckpoint` / `next_checkpoint`.

**Quy tắc từng trường:**

| Trường | Quy tắc |
|---|---|
| `episodeId` | UUID bất biến của đợt làm việc (`entry_id`). Khóa định danh đợt phía HRP. |
| `sync_version` | Số nguyên dương (`>= 1`) đơn điệu tăng cho mọi thay đổi hồ sơ, trạng thái làm việc và trạng thái xóa/tombstone của đợt đó. **Khóa duy nhất để HRP quyết định áp dụng hay bỏ qua.** |
| `isTombstone` | `false` = hồ sơ đang có hiệu lực đồng bộ; `true` = đợt làm việc không còn hiệu lực (bị xóa cứng, xóa mềm, hủy/void hoặc rút bản trùng). |
| `tombstoneReason`, `deletedAt` | Chỉ dùng khi `isTombstone = true`. Mọi trường thông tin cá nhân/dự án/trạng thái khác đều có thể vắng mặt hoặc `null` trên tombstone. |
| `employeeCode` | Mã đợt của BI (`hrp-YYYY-NNNNNN`), bắt buộc khi `isTombstone = false`. |
| `nationalId` | CCCD canonical (`9` hoặc `12` chữ số) khi `nationalIdState = VALID`; `null` nếu `MISSING` hoặc `INVALID`. |
| `nationalIdState` | `VALID` \| `MISSING` \| `INVALID`. Đợt thiếu/sai CCCD vẫn trả (`isTombstone = false`) để HRP ghi nhận ngoại lệ; khi CCCD được bổ sung hợp lệ, `sync_version` tăng và đợt được trả lại. |
| `person.*` | Chỉ trả các trường có giá trị thực; còn lại `null`. Không trả ngân hàng, ảnh CCCD/chân dung, hợp đồng. |
| `status.value` | `UNCONFIRMED` \| `ON` \| `OFF` (khi `isTombstone = false`). Khi `OFF` có `leaveDate`. |
| `hasMore` | `true` nếu còn trang kế tiếp trong lượt chạy hiện tại; `false` khi đã ở trang cuối cùng. |
| `nextPageCursor` | Token opaque để gọi trang tiếp theo (`?pageCursor=...`) khi `hasMore = true`; `null` khi `hasMore = false`. |
| `checkpoint` | Token opaque đánh dấu mốc hoàn tất của toàn bộ lượt đồng bộ (bắt buộc khác `null` ở trang cuối `hasMore = false`). |

---

## 4. Giao thức Phiên bản, Cursor/Checkpoint & Tombstone (4 nguyên tắc cốt lõi)

### 4.1 Phiên bản đồng bộ (`sync_version`)
- Trên bảng `external_entity_links`, HRP lưu `last_sync_version` (`BIGINT`) theo từng `episodeId`.
- Khi nhận một phần tử từ `/worker-episodes` (dù là bản ghi thường hay tombstone):
  - Nếu `incoming.sync_version <= stored.last_sync_version`: **bỏ qua ngay** (idempotent skip).
  - Nếu chưa có link hoặc `incoming.sync_version > stored.last_sync_version`: **áp dụng cập nhật** và ghi `last_sync_version = incoming.sync_version` trong cùng transaction.
- HRP **không sử dụng `direct_entries.version`** để quyết định bỏ qua bản ghi.

### 4.2 Opaque Cursor, Checkpoint & Phục hồi khi lỗi giữa chừng
- HRP coi `pageCursor` / `nextPageCursor` và `checkpoint` là chuỗi **hoàn toàn opaque**: không base64-decode, không đọc timestamp bên trong, **không tự lùi 10 phút**.
- BI chịu trách nhiệm xử lý phần thời gian chồng lấn (late-committing transactions) phía server khi sinh và giải mã `checkpoint`.
- Vòng lặp kéo dữ liệu của HRP trong 1 lượt chạy:
  1. Đọc `savedCheckpoint` từ DB HRP.
  2. Gọi trang 1 với `checkpoint = savedCheckpoint` (hoặc không truyền nếu `savedCheckpoint == null`).
  3. Lặp qua các trang tiếp theo bằng `pageCursor = nextPageCursor` cho tới khi gặp `hasMore === false`.
  4. **Chỉ sau khi toàn bộ các trang của lượt chạy đã được xử lý thành công hết (`hasMore === false`)**, HRP mới lưu `checkpoint` mới vào DB.
  5. Nếu bất kỳ trang nào bị lỗi mạng/HTTP/DB giữa chừng: HRP dừng lượt chạy với trạng thái `FAILED`, **giữ nguyên `savedCheckpoint` cũ**. Ở lượt chạy kế tiếp, HRP bắt đầu lại từ `savedCheckpoint` cũ; các bản ghi thuộc những trang đã ghi thành công trước đó sẽ tự động được bỏ qua an toàn nhờ kiểm tra `sync_version <= last_sync_version`.

### 4.3 Xử lý Tombstone Idempotent & Giữ lịch sử
- HRP không phụ thuộc vào việc bản ghi đã xóa cứng vẫn còn xuất hiện trong bảng `direct_entries`.
- Khi nhận tombstone (`isTombstone = true`) có `sync_version > stored.last_sync_version`:
  - **Trường hợp `episodeId` chưa từng tạo phân công trên HRP:** HRP đóng các `bi_sync_exceptions` đang mở của `episodeId` (nếu có) và lưu dấu mốc tombstone (`last_sync_version`, `is_tombstoned = true`) vào `external_entity_links` để các lần phát lại sau đều idempotent.
  - **Trường hợp `episodeId` đã có `ProjectAssignment` trên HRP:**
    - **Tuyệt đối không xóa cứng** `User`, `Worker`, `ProjectAssignment`, `AttendanceEvent`, `CheckIn` hay `TimesheetLine`.
    - Nếu phân công đó đã phát sinh dữ liệu chấm công/công (`AttendanceEvent` / `TimesheetLine` / `CheckIn`), chuyển `ProjectAssignment.status = 'ENDED'` (`validTo = deletedAt ?? now`) để bảo toàn toàn vẹn lịch sử bảng công; nếu chưa từng phát sinh chấm công, chuyển `ProjectAssignment.status = 'CANCELLED'`.
    - Tính toán lại `Worker.employmentStatus` trên các đợt còn hiệu lực của NLĐ đó: nếu còn đợt `ON` khác (bao gồm việc kích hoạt đợt `PAUSED` do trùng `ON` trước đó) thì giữ `ACTIVE`; nếu không còn đợt `ON` nào thì chuyển `TERMINATED` (chặn chấm công mới nhưng giữ `User.isActive = true` để NLĐ vẫn đăng nhập xem lịch sử công và dùng tính năng khác).
    - Đóng mọi ngoại lệ đang mở gắn với `episodeId` và lưu `last_sync_version = incoming.sync_version`.

---

## 5. Tóm tắt hành vi phía HRP theo dữ liệu BI

| Dữ liệu BI | Hành vi HRP |
|---|---|
| `isTombstone = false` & `nationalIdState ≠ VALID` | Không tạo tài khoản. Ghi ngoại lệ `MISSING_OR_INVALID_CCCD` theo `episodeId`, lưu `last_sync_version`. Tự xử lý tạo tài khoản khi BI cập nhật CCCD hợp lệ (`sync_version` tăng). |
| CCCD hợp lệ, chưa có trên HRP | Tạo tài khoản `WORKER` đăng nhập bằng CCCD + mật khẩu tự sinh (lưu bcrypt + AES-256-GCM cho QLDA/HR/Admin cấp phát; bắt đổi mật khẩu lần đầu). |
| Thông tin cá nhân (`person.*`) | Lấy theo BI khi khởi tạo; cập nhật các trường NLĐ chưa tự chỉnh sửa trên HRP (`self_edited_fields`), không đồng bộ ngược về BI. |
| `status.value = ON` | Phân công `ACTIVE`, được chấm công khi `Project` có `Site` xác nhận tọa độ từ `/catalog`. |
| `status.value = UNCONFIRMED` | Phân công `PLANNED` ("Đang chờ việc") — **không chấm công**. |
| `status.value = OFF` | Phân công `ENDED` từ `leaveDate`; nếu không còn đợt `ON` nào khác thì `Worker.employmentStatus = TERMINATED` (**chặn chấm công**, các tính năng khác hoạt động bình thường). |
| `isTombstone = true` | Đóng phân công (`ENDED` nếu đã có lịch sử công, `CANCELLED` nếu chưa), giữ nguyên lịch sử, tính lại `Worker.employmentStatus`, xử lý idempotent theo `sync_version`. |
| 1 CCCD có nhiều đợt `ON` | Đợt `firstWorkDate` mới nhất là `ACTIVE`; các đợt `ON` còn lại tạm để `PAUSED` và ghi ngoại lệ `DUPLICATE_ON`. |
| Dự án `location = null` hoặc `confirmedAt = null` | Tạo/cập nhật dự án nhưng **không suy đoán tọa độ**, giữ `geoConfirmedAt = null` (chặn check-in an toàn) và ghi `PROJECT_LOCATION_MISSING`. |
| Người tuyển (`recruiter`) | Hiển thị tên + mã nhân sự trên phân công, chưa tạo tài khoản người tuyển ở v1. |

---

## 6. Bảo mật & PII

- CCCD, SĐT, ngày sinh, địa chỉ là PII: **tuyệt đối không ghi log** ở cả hai phía. Log vận hành và audit chỉ ghi `episodeId`, `employeeCode`, `projectId`, `sync_version` và bộ đếm.
- Khuyến nghị giới hạn IP nguồn gọi `/api/integrations/hrp/v1/*` về IP VPS HRP (`103.56.161.201`) nếu hạ tầng BI hỗ trợ.

## 7. Kiểm thử nghiệm thu phía BI (`worker-episodes`)

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| `BI-AC-01` | Gọi thiếu/sai Bearer key hoặc sai `X-Request-Id` | Trả 401/400 đúng mã lỗi, không lộ thông tin |
| `BI-AC-02` | Phân trang 3 trang (`limit=2`) qua `pageCursor` | Không trùng, không sót; trang 1–2 `hasMore=true` có `nextPageCursor`; trang cuối `hasMore=false` có `checkpoint` hoàn tất |
| `BI-AC-03` | Sửa hồ sơ / bổ sung CCCD cho đợt thiếu CCCD | `sync_version` tăng, đợt xuất hiện lại khi kéo từ `checkpoint` trước đó với `nationalIdState=VALID` |
| `BI-AC-04` | Chuyển trạng thái `ON → OFF` (chỉ thêm status event, dù `direct_entries.version` không đổi hoặc có đổi) | `sync_version` **bắt buộc tăng**, đợt xuất hiện lại với `status.value=OFF` và `leaveDate` |
| `BI-AC-05` | Hủy/xóa hồ sơ (bao gồm xóa cứng hoặc rút bản trùng) | Xuất hiện phần tử `isTombstone=true` với `sync_version` lớn hơn bản trước, không phụ thuộc dòng gốc còn trong `direct_entries` |
| `BI-AC-06` | Đợt thuộc submission `DRAFT` / chưa `SUBMITTED` | Không phát hồ sơ sống sang HRP |
| `BI-AC-07` | Dự án chưa xác nhận tọa độ trong `/catalog` | `location = null` hoặc `confirmedAt = null` |
| `BI-AC-08` | Kiểm tra log server & bảng audit BI | Không chứa CCCD / SĐT |

## 8. Lịch sử phiên bản

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| `1.0` | `2026-10-29` | Bản đầu tiên |
| `1.1` | `2026-11-03` | Đồng bộ `/v1/catalog` với PR #211 `mini-bi`; thay `direct_entries.version` bằng `sync_version` đơn điệu; tách opaque `pageCursor` & `checkpoint` (bỏ tự lùi 10 phút phía HRP, chỉ lưu `checkpoint` khi hết mọi trang); bổ sung đặc tả `tombstone` tường minh giữ lịch sử; khóa quy tắc không tự suy đoán tọa độ khi `Catalog.location = null` |
