# HRP Marketplace — Kịch bản diễn tập go-live (drill §11)

> **Người thực thi:** Owner / HR Manager
> **Soạn:** Tier 1 — 2026-08-29
> **Runbook gốc:** `docs/runbooks/marketplace-launch-operations.md` — mọi thao tác chi tiết, payload và cảnh báo nằm ở đó; file này chỉ là trình tự chạy một lượt.
> **Trạng thái:** `READY_FOR_DRILL`
> **Mục tiêu kép:** ký được checklist §11 **và** chứng minh public apply chạy thật trên production (điều duy nhất chưa ai verify sau khi grant schema USAGE).

## 0. Quyết định: diễn tập ngay trên production, trước khi công bố

Runbook §11 viết "trên DB test/staging". Thực tế **không có staging deployment**: chỉ có `www.hrpartner.vn` trỏ Neon branch `hrp-live`; branch `hrp_mp2_test` không có app đứng trước và **hết hạn 31/08**. Dựng staging chỉ để diễn tập một lần là không đáng.

Quyết định của Tier 1: **drill trên production trước khi công bố link**. Lúc này `GET /api/jobs` còn rỗng, chưa ai biết trang, cửa sổ rủi ro gần bằng 0. Đổi lại phải giữ hai điều kiện:

- Dùng **danh tính drill thật của sếp** (số điện thoại sếp đang dùng), không bịa tên/CCCD người khác.
- Runbook **cấm xoá row bằng SQL** ⇒ mọi vết drill phải kết thúc ở một **trạng thái cuối hợp lệ**, không phải bị xoá. Xem §4.

## 1. Chuẩn bị — ghi ra giấy trước khi bấm gì

| Cần | Giá trị |
|---|---|
| Tài khoản thao tác | role `ADMIN` hoặc `HR_MANAGER`, có `CAN_PUBLISH_JOB` |
| `projectId` | |
| `staffingOrderId` | |
| `slug` job công khai | |
| SĐT drill | |
| Drill ID | `DRILL-20260829-01` |

**Ngân sách rate limit (OPS-06A) — vượt là `429`, không phải bug:**

| Bucket | Hạn |
|---|---|
| apply / IP | 10 lần / 10 phút |
| apply / số điện thoại | 5 lần / 1 giờ |
| tracking / IP | 20 lần / phút |
| tracking / mã | 10 lần / phút |

Kịch bản dưới dùng **3–4 lần apply** nên dư sức, nhưng đừng bấm lại loạn khi thấy lỗi.

## 2. Trình tự chạy

| # | Việc | Kỳ vọng | Ghi lại |
|---|---|---|---|
| 1 | **Publish job thật** qua Admin UI (API: `POST /api/projects/{id}/publish`, kèm `expectedVersion` + `reason`) | `200`; job hiện ở **`/jobs`** và `GET /api/jobs` không còn rỗng | version trước/sau, `slug` |
| 2 | **Apply thật lần 1** — `POST /api/public/jobs/{slug}/applications`, header `Idempotency-Key: DRILL-20260829-01-a1`, body chỉ `fullName` + `phone` + `consent: true` | **`201`** + trả về `trackingCode` dạng `APP-XXXX-YYYY` | `trackingCode` |
| 3 | **Tracking mã thật** — `GET /api/public/applications/{trackingCode}` | `200`, trạng thái khớp bước 2 | trạng thái |
| 4 | **Tracking mã không tồn tại** — `GET /api/public/applications/APP-ZZZZ-ZZZZ` (đúng format, không có thật) | `404 NOT_FOUND` | — |
| 5 | **Duplicate apply** — apply lại **cùng SĐT, cùng job**, `Idempotency-Key` **mới** | **`409 DUPLICATE_APPLICATION`** | code trả về |
| 6 | **CV đã tắt** — apply với `"cv": {...}` khác `null` | **`422 CV_UPLOAD_DISABLED`** | — |
| 7 | **Ẩn khẩn cấp** — unpublish theo runbook §4 | `200`; `/jobs` không còn job; trang detail không cho apply | version |
| 8 | **Republish** — theo runbook §8.2 | `200`; job trở lại `/jobs` | version |
| 9 | **Đóng order** — runbook §5.1 (`PATCH /api/staffing/orders/{id}` `{"status":"CLOSED"}`) | `200`; apply sau đó → **`404 JOB_NOT_AVAILABLE`**, không tạo hồ sơ | code apply |
| 10 | **Xử lý hồ sơ drill** — `screen` → `qualify` → `convert` qua `POST /api/admin/applications/{id}/actions/{...}`; dedup xử lý theo runbook §6.2 | mỗi bước `200`; không sinh hồ sơ trùng | trạng thái cuối |

**Bước 2 là bằng chứng duy nhất cho `hrp_public_apply_submission` trên production.** Nếu nó ra `500` thì dừng drill, báo ngay: nghĩa là grant `USAGE ON SCHEMA public` chưa đủ cho đường apply (tracking đã xanh nhưng apply đi qua RPC ghi, khác function).

**Bước 4 phải dùng mã đúng format** (`APP-` + 2 nhóm) mới thật sự chạm RPC tracking; mã rác kiểu `abc` có thể bị loại sớm ⇒ `404` đó không chứng minh được gì.

**Bước 5 vs replay vs mismatch** — ba kết quả khác nhau, đừng lẫn:

| Gửi lại thế nào | Kết quả |
|---|---|
| key **mới**, cùng SĐT + cùng job | `409 DUPLICATE_APPLICATION` (đây là cái cần drill) |
| **đúng key cũ + đúng body cũ** | trả lại `201` cũ — replay đúng thiết kế, không phải lỗi |
| **đúng key cũ + body đã sửa** | `409 IDEMPOTENCY_PAYLOAD_MISMATCH` |

**Bước 9 là một chiều:** `CLOSED`/`CANCELLED` là trạng thái cuối, **không mở lại được**. Chỉ làm nếu order đó không còn cần tuyển, hoặc tạo riêng một order để drill.

### 2.1 Dedup conversion (bước nặng nhất, có đường thoát trung thực)

`409 DEDUP_REVIEW_REQUIRED` chỉ nổ khi **đã tồn tại Worker trùng SĐT/CCCD** với hồ sơ đang convert.

- Nếu SĐT drill **đã có Worker** trong hệ thống → convert ở bước 10 sẽ ra `409 DEDUP_REVIEW_REQUIRED`; xử lý bằng `existingWorkerId` theo runbook §6 ⇒ ký được dòng dedup.
- Nếu **chưa có** → convert lần đầu tạo Worker mới (đúng), và muốn thấy dedup phải có hồ sơ thứ hai ở **job khác** (duplicate guard chặn cùng job). Nếu không muốn tạo thêm job: ghi `DEDUP_DRILL_DEFERRED` + lý do, dẫn chiếu unit test dedup trong `conversion.service.ts`. **Không được ghi là đã drill PASS.**

## 3. Vết để lại — trạng thái cuối bắt buộc

Runbook cấm `DELETE` bằng SQL, nên drill phải **kết thúc sạch bằng nghiệp vụ**, không bằng dọn database.

| Row drill tạo ra | Trạng thái cuối phải đạt |
|---|---|
| Hồ sơ apply lần 1 | `CONVERTED` (nếu chạy bước 10) **hoặc** `REJECTED` với lý do ghi rõ `DRILL-20260829-01 — drill record, not a real candidate` |
| Lần apply thứ 2 bị `409` | không sinh row ⇒ không cần dọn |
| Worker sinh ra do convert | phải là **người thật** (sếp) hoặc ghi rõ là bản ghi drill; tuyệt đối không xoá bằng SQL |
| Staffing order đã `CLOSED` | tạo order mới nếu vẫn cần tuyển vị trí đó |
| Project / job | để đúng trạng thái muốn có khi công bố (`isPublic` đúng ý) |

Không để một hồ sơ drill nằm im trong hàng đợi screening — người tiếp theo mở queue sẽ tưởng đó là ứng viên thật.

## 4. Bẫy dễ đọc sai

| Thấy | Nghĩa thật |
|---|---|
| `429` | hết ngân sách rate limit §1, **không phải** apply lỗi |
| `422 CV_UPLOAD_DISABLED` | đúng thiết kế go-live: CV chỉ là metadata, raw upload tắt |
| `415` | thiếu `Content-Type: application/json` |
| `413` | body > 16 KiB |
| `400 INVALID_INPUT` "field không được hỗ trợ" | body có field lạ; shape là allowlist chặt |
| `400 IDEMPOTENCY_KEY_REQUIRED` | apply bắt buộc có key (header `Idempotency-Key` / `X-Idempotency-Key`, hoặc `idempotencyKey` trong body) |
| `422 CONSENT_REQUIRED` | quên `consent: true` (hoặc `consentAt`) — không phải lỗi hệ thống |
| `409 IDEMPOTENCY_PAYLOAD_MISMATCH` | dùng lại key cũ với body đã sửa; đổi key mới |
| `404 JOB_NOT_AVAILABLE` | job/order không còn nhận đơn (đã ẩn hoặc order đóng) — đây là kỳ vọng ở bước 9 |
| `409 STALE_VERSION` | có người vừa sửa cùng lúc; đọc lại version rồi làm lại |
| `410` ở `POST /api/jobs` hoặc `/api/jobs/apply` | endpoint legacy đã khai tử — đường đúng là `POST /api/public/jobs/{slug}/applications` |
| `404` ở `/viec-lam` | đường chết sau khi bỏ static rewrite; đường công khai là **`/jobs`** |
| `503` limiter unavailable | thiếu env Upstash, hệ thống fail-closed — dừng drill, gọi engineer |
| `500` bất kỳ | không có trong kịch bản; ghi `X-Request-Id` trong response rồi báo lại |

Mọi response đều có header `X-Request-Id` (OPS-04a) — **chỉ cần ghi id này** là truy được log, không cần chép payload chứa PII.

## 5. Ký duyệt — map sang runbook §11

| Dòng §11 | Thoả bởi | Kết luận |
|---|---|---|
| Ẩn job khẩn cấp + republish | bước 7, 8 | |
| Đóng order + apply bị chặn | bước 9 | |
| Duplicate apply | bước 5 | |
| Dedup Worker conversion | bước 10 / §2.1 | |
| Owner hiểu **chưa có khoá theo từng slot** (chỉ khoá mức order, §5.2) | đọc §5.2 và ghi "đã đọc" | |
| Owner xác nhận CV không bắt buộc, raw upload tắt | bước 6 | |
| Mẫu evidence không chứa secret/PII | §4 (ghi `X-Request-Id`) | |

**Owner sign-off:** tên ______, ngày ______, kết luận drill: `PASS` / `FAIL` (nếu FAIL ghi dòng nào và mã lỗi gặp).

Hai lưu ý khi ký cho khỏi tự mâu thuẫn:

- Dòng đầu §11 viết "trên DB test/staging" — **thay bằng quyết định ở §0** của file này (drill trên production trước khi công bố). Ghi thẳng vào chỗ ký: *"drill chạy trên production, pre-announcement, theo drill doc 2026-08-29"*.
- Nếu dedup phải hoãn (§2.1 nhánh 2) thì ký `PASS` cho 5 dòng và để dòng dedup là `DEDUP_DRILL_DEFERRED` — **không ký PASS cho việc chưa chạy**. Tiền lệ MP-3C: waiver phải ghi người quyết định + residual risk, không được kể lại là đã test.

Sau khi ký: criterion 7 của launch gate `UNIFIED_PLAN_v5.md §7.9.7` đóng, runbook gốc chuyển từ `READY_FOR_OWNER_REVIEW` sang `SIGNED_OFF`, và Tier 1 cập nhật `ROADMAP_CURSOR`.

