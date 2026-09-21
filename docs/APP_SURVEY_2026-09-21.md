# Khảo sát tình hình App — 21/09/2026

> **Loại tài liệu:** Khảo sát READ-ONLY tại một thời điểm (đầu vào kỹ thuật, KHÔNG phải roadmap sống). Viết cho Owner (T0).
> **Thời điểm đo:** 2026-09-21 (+0700)
> **Baseline:** `origin/main` @ `1059f66` (commit gần nhất 19/09 13:32, Merge PR #20).
> **Kế thừa:** thay thế ảnh chụp [APP_SURVEY_2026-09-18.md](APP_SURVEY_2026-09-18.md) (baseline `4e6d0c1`).
> **Lưu ý:** Bản 09-18 là snapshot lịch sử; bản này phản ánh các diễn biến mới nhất (như phát hiện RLS blocker từ T0). Các thông tin chưa cập nhật vẫn kế thừa từ 09-18.
> **Phạm vi:** chỉ khảo sát + ghi file này. Không sửa/commit/push file code nào.

---

## 0. Delta kể từ ảnh chụp 09-18 (`4e6d0c1` → `1059f66`)

15 commit mới, **2 PR merge**:

| PR | Nội dung | Ảnh hưởng tới finding |
|---|---|---|
| **#21** (W5 handling assignment UI) | Đưa toàn bộ W5 — trước đây **chưa commit** trong worktree — **lên `main` thật**. Thêm +59 dòng `handling-assignment.service.ts` (validate role assignee), đổi prefix `reason` sang tiếng Việt. | F-1/F-2/F-3 **KHÔNG được fix**, nay nằm trên production branch |
| **#20** (N2-AFF-03 public apply attribution) | Route public `POST /api/public/intake` (301 dòng) + service + **integration test 465 dòng** + migration policy writer trên `referral_attributions`. | Chất lượng cao (mục 3.0); phát sinh N-1, N-2 |

**Số liệu đổi:** commit 906 → **921**; migration 40 → **41**; integration test 11 → **12**; model 61 (không đổi); worktree 21 (không đổi); CI `main` vẫn **xanh**; 0 PR mở.

**Tín hiệu điều phối tích cực (mới):** dải commit AFF-03 cho thấy T0 thực sự soát trước merge — "Tier 0 caught a bug in round-1 proposal" (bắt nhầm enum `NEW`/`CONVERTED` là status của `CandidateSubmission` chứ không phải `ReferralAttribution`), "round-4 T0 ACCEPTED-WITH-GATES", "separate T0/Owner merge gate", "LIM-AFF-03-01/02/03 ACCEPTED ... recorded, not self-claimed green". Đây là cải thiện so với mẫu tự-audit ở G-2.

---

## 1. Snapshot số liệu (21/09, baseline `1059f66`)

| Chỉ số | Giá trị |
|---|---|
| `origin/main` HEAD | `1059f66` (19/09 13:32, Merge PR #20) |
| Tổng commit | 921 |
| Migration | 41 (mới nhất `20260918100000_aff03_writer_select_on_referral_attributions`) |
| Model / enum | 61 / 14 |
| Domain (`src/domains`) | 13 |
| Trang admin | 25 |
| Test file / integration test | 180+ / **12** |
| Bảng có RLS enable / có policy | 66 / 47+ (AFF-03 thêm 2 policy writer) |
| CI `main` | XANH, 0 PR mở |
| Worktree | 21 |

---

## 2. Vị trí trên plan

**Không đổi về cấu trúc** so với 09-18: vẫn ba tầng plan chồng nhau (V6 OUTSTANDING / V7 tracked; **REALIGNMENT P0–P5 + V8 + V9 vẫn UNTRACKED**).

Vị trí thực tế theo Realignment plan: **"P0-E xong; P0-A/B/C/D chưa; discovery §48 = 0/6; code P1/AFF chạy trước P0 safety foundations."**

| Hạng mục | 09-18 | 21/09 | Ghi chú |
|---|---|---|---|
| P0-A Evidence Gateway | ❌ | ❌ | vẫn 0 code; CCCD vẫn qua `cccdNumber` |
| P0-B VPS boundary | ❌ | ❌ | vẫn không Dockerfile/compose/nginx; còn `vercel.json` |
| P0-C CRM contract | ❌ | ❌ | vẫn chỉ tài liệu |
| P0-D S2S/idempotency/outbox | 🟡 | 🟡 | AFF-03 dùng `withIdempotency` + rate-limit tốt, nhưng vẫn là idempotency nội bộ, không phải S2S contract |
| P0-E CI simplification | ✅ | ✅ | |
| §48 discovery (6 artifact) | 0/6 | **0/6** | vẫn MISSING toàn bộ |
| P1 thin recruitment slice | 🟡 | 🟡→ | **AFF-03 hoàn thiện đúng "public apply" của P1-B** — bước tiến thực chất trên P1 |

**Diễn giải:** P1 (thin recruitment slice) đang tiến thật — AFF-03 khép được đường "ứng viên public nộp qua link giới thiệu → gắn attribution → tạo handling assignment ban đầu", đúng tinh thần §60 Final Success Condition. Nhưng vẫn xây **trên** nền P0 chưa có (Evidence Gateway, VPS boundary), tức đang mượn trước rủi ro an toàn để lấy tốc độ giá trị.

---

## 3. Điểm mờ kỹ thuật & lỗi code (tái đo tại `1059f66`)

### 3.0. Ghi nhận tích cực — AFF-03 là chuẩn tham chiếu chất lượng
`app/api/public/intake/route.ts` + `aff03-public-intake.service.ts` làm đúng bài bản, **nên dùng làm khuôn cho W4/W5 sửa lại**:
- Rate-limit APPLY_IP trước parse, APPLY_PHONE trước transaction (route:176, 206).
- Body cap 16 KiB + media-type gate (route:184), shape chặt whitelist field + kiểm kiểu (route:120-142).
- Idempotency-Key UUID bắt buộc + `withIdempotency` (route:216, 231).
- Silent fail-safe cookie giả/hết hạn → 201 chuẩn, **không log phân biệt forged vs missing** (route:11-13, 260 chỉ log boolean `attributionBound`).
- Logger có correlation-id, **không log giá trị cookie** (route:257-261).
- **Có integration test thật 465 dòng** (`tests/db/aff03-public-intake.integration.test.ts`).

### 🔴 F-1 (HIGH — vẫn hở, nay trên `main`) — Bảng `labor_profile_handling_assignments` KHÔNG có RLS
- **Nơi:** `prisma/migrations/20260918000000_.../migration.sql` — không `ENABLE`/`FORCE ROW LEVEL SECURITY`, không `CREATE POLICY`, không GRANT tường minh. Xác nhận lại 21/09: **vẫn không migration nào thêm RLS cho bảng này**.
- **Trạng thái mới:** W5 (PR #21) đã merge → khiếm khuyết nay nằm trên production branch, không còn là "code trong worktree".
- **Hệ quả:** `withDbContext` set GUC nhưng không policy nào đọc → bảng ownership gắn commission chỉ được chặn ở tầng app. Path non-admin đầu tiên chạm vào là lộ chéo.

### 🔴 F-2 (HIGH — vẫn hở) — Reassign hồ sơ có assignment HẾT HẠN vỡ với P2002 giả danh "conflict"
- **Nơi:** `src/domains/talent/handling-assignment.service.ts` `managerAssign` + partial unique index `WHERE status='ACTIVE'` + `getActiveHandlingAssignment` (trả `null` cho dòng ACTIVE đã quá `expiresAt`).
- **Tái đo:** diff PR #21 chỉ **thêm validate role assignee** (P1-4), **không** thêm sweep `ACTIVE→EXPIRED` cũng không revoke-before-create. Gốc rễ nguyên vẹn: không có job nền chuyển status khi hết hạn. `createInitialAffiliateAssignment` vẫn miễn nhiễm (nó `updateMany` revoke trước); `managerAssign` vẫn vỡ.

### 🟠 F-3 (MEDIUM — vẫn hở) — `release` ghi `EXPIRED` cho thu hồi thủ công
- **Nơi:** `releaseHandlingAssignment` — PR #21 đổi `reason` thành `[Thu hồi bởi ${actorName}] ...` nhưng **vẫn** `status = ASSIGNMENT_STATUS.EXPIRED` thay vì `REVOKED`. Phân biệt hết-hạn-tự-nhiên vs thu-hồi-người vẫn chỉ dựa prefix chuỗi. Vẫn phụ thuộc `getActiveHandlingAssignment` → **không thu hồi được** assignment đã quá hạn.

### 🟠 F-4 (MEDIUM — vẫn hở, nay trên `main`) — Hai cơ chế auth lẫn lộn + `session as any`
- `app/api/admin/labor-profiles/**` dùng `getAuthContext(req)`; ba route AFF handling (`handling-assignable-users`, `handling-assignments`, `handling-assignment-history`) dùng `getServerSession()`, hai trong đó ép **`withDbContext(prisma, session as any, ...)`**. `as any` vô hiệu kiểm kiểu; lệch shape → throw runtime thay vì compile-time. Merge as-is qua PR #21.

### 🟠 F-5 (MEDIUM — vẫn đúng) — Schema drift `onDelete` của `referral_attributions.labor_profile_id`
- FK bị gỡ ở `85c0077` là bản `ON DELETE SET NULL` (trùng tên FK đã tạo ở migration `20260917` với `ON DELETE RESTRICT`). Việc gỡ đúng (tránh vỡ migrate deploy), nhưng để lại drift: schema Prisma khai quan hệ optional (ngụ ý SetNull) trong khi DB thực thi RESTRICT. `prisma migrate status` không phát hiện.

### 🟠 F-6 (MEDIUM — rủi ro APPLY PROD, vẫn đúng) — UNIQUE index có thể vỡ giữa migrate deploy
- Migration `20260918000000` tạo `UNIQUE INDEX referral_attributions_labor_profile_id_key`; migration `20260917` không có unique này. **Trên prod nếu đã có ≥2 `referral_attributions` cùng `labor_profile_id`, tạo unique index sẽ FAIL.** Preflight bắt buộc trước GO: `SELECT labor_profile_id, count(*) FROM referral_attributions WHERE labor_profile_id IS NOT NULL GROUP BY 1 HAVING count(*)>1`.

### 🟡 F-7 (LOW — vẫn đúng) — `version` là cột trang trí
- `LaborProfileHandlingAssignment.version` không hề dùng trong service (diff PR #21 xác nhận không thêm `where:{id,version}` hay `increment`). Optimistic-lock không được thực thi.

### 🔴 N-1 (MỚI — P0/HIGH, confirmed) — Public intake dùng `$transaction` TRẦN, không set GUC gặp lỗi RLS 42501
- **Nơi:** `app/api/public/intake/route.ts:238` — `prisma.$transaction(async (tx) => submitPublicIntake(tx, ...))`. Route comment tự khai "Does NOT set `app.role` (writer role default; relies on N2-1 + AFF-03 RLS)". `aff03-public-intake.service.ts` cũng **không** set GUC (grep xác nhận không `set_config`/`applyRls`/engine context).
- **Đánh giá:** T0 đã xác minh bằng smoke test trên DB thật rằng bare writer path này gặp lỗi `42501` (Insufficient Privilege). Đây là regression/blocker thực tế thuộc boundary RLS. Bằng chứng tại: `docs/tasks/hrp-v6-n2-aff-03-apply-attribution/T0_VERIFY_aff-03_STOP_2026-09-19.md`.
- **Lưu ý:** `AFF-03B` đang là lane sửa lỗi hiện hành (đang trên branch `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix`). Không tuyên bố lỗi đã đóng khi T1B chưa có bằng chứng ACCEPTED.

### 🟠 N-2 (MỚI — MEDIUM) — Policy `hrp_ra_select_writer` không scope theo referrer
- **Nơi:** migration `20260918100000` — `CREATE POLICY hrp_ra_select_writer ... FOR SELECT TO app_user_writer USING (status IN ('ACTIVE','CONSUMED'))`.
- **Hệ quả:** role `app_user_writer` nay đọc được **mọi** dòng `referral_attributions` ở trạng thái ACTIVE/CONSUMED, **không giới hạn theo referrer**. Chủ đích là để service tra cứu row theo id, nhưng phạm vi rộng hơn cần thiết: bất kỳ code chạy dưới `app_user_writer` đều có thể liệt kê toàn bộ attribution đang hoạt động. An toàn hiện tại dựa vào giả định "không có path user-facing nào chạy dưới writer role và tự chọn row". Nên siết `USING` (ví dụ theo id được truyền, hoặc scope hẹp hơn) hoặc tách role đọc riêng.

### 🟡 F-8..F-10 (LOW — không đổi)
- F-8 `completed_milestone_id` tham chiếu mềm không FK.
- F-9 client `handling-assignment-manager.tsx`: `catch(err:any)` + `alert()`, `Record<string,any>[]` mất kiểu, `isExpired` tính client-side (liên quan F-2).
- F-10 import giữa file `labor-profiles/route.ts`.

---

## 4. Nợ kỹ thuật (giữ nguyên hướng 09-18; AFF-03 làm mẫu chuẩn logger)
- **107 `console.*`** trong code production (đo 09-18) vẫn là món cần chuẩn hóa trước P0-B VPS. **AFF-03 đã dùng `info()/warn()` có correlation-id** (`src/shared/observability/logger`) — đây là logger nên nhân rộng, thay `console.error` thô ở các route cũ.
- `as any` 23 / `: any` 24 / `@ts-ignore` 0 / debt marker 6 — nền lành mạnh.
- File >900 dòng: `attendance/ticket.service.ts` (975), `staffing/assignment-placement.service.ts` (947) — ứng viên tách hàng đầu.

---

## 5. Nghẽn cổ chai
### 5.1. Test coverage — cải thiện đúng chỗ (AFF-03) nhưng handling assignment vẫn trống
- Integration test 11 → **12**: AFF-03 thêm `tests/db/aff03-public-intake.integration.test.ts` (465 dòng) — đúng bài, chạy qua DB thật.
- **Nhưng handling assignment (F-1/F-2) vẫn KHÔNG có integration test** — chỉ `handling-assignment.service.test.ts` (unit mock, PR #21 thêm 4 dòng). Mock không bắt được thiếu-RLS và đụng-unique-index. Đây vẫn là đúng lớp lỗi "test xanh song song với vỡ thật".
### 5.2. Điều phối — 21 worktree, cây làm việc không trung lập (không đổi).
### 5.3. CI Integration concurrency đơn `hrpartner-dedicated-integration-db` (không đổi, có chủ đích).

---

## 6. Điểm cần refactor (không đổi so với 09-18)
1. Tách god-file `ticket.service.ts` (975), `assignment-placement.service.ts` (947).
2. Trích helper `withAuthorizedRoute(roles, handler)` — thống nhất một cơ chế auth (giải F-4), gộp các `ALLOWED_ROLES`/`ADMIN_ROLES` rải rác, chuẩn hóa error → logger.
3. Chuyển `src/domains/admin-demand-tree.integration.test.ts` vào đúng domain con.
4. Tập trung logic "Company Pool = assignment hết hạn" (3 nơi tính lại) — lý tưởng là **quét status vào DB**, giải luôn F-2.

---

## 7. Governance cần Owner biết
| # | Trạng thái 09-18 | 21/09 |
|---|---|---|
| **G-1** plan chi phối (REALIGNMENT+V8+V9) untracked | hở | **vẫn UNTRACKED** — rủi ro mất phương hướng chưa đóng |
| **G-2** Tier 1 tự phát hành verdict T3 | hở | **cải thiện** — AFF-03 cho thấy T0 soát/bắt bug trước merge, "recorded not self-claimed" |
| **G-3** handover/cursor stale | hở | **tệ hơn** — `TIER0_HANDOVER` vẫn 11/09 (nay stale 10 ngày); `PLANNER_HANDOVER.current_task` vẫn trỏ `n2-aff-01` đã merged, gate `T0_REVIEW` |
| **G-4** P0 bị đi vòng (§48 = 0/6) | hở | **vẫn 0/6**; P1 tiến nhưng nền P0 an toàn vẫn trống |

---

## 8. Khuyến nghị ưu tiên (chờ lệnh — chưa thực hiện gì)
| # | Việc | Đóng | Chi phí |
|---|---|---|---|
| 1 | Commit REALIGNMENT+V8+V9 lên branch docs, merge | G-1 | Thấp |
| 2 | Migration RLS+policy cho `labor_profile_handling_assignments` + sweep/revoke-before-create + integration test RLS | F-1, F-2, F-3 | Trung bình |
| 3 | Preflight đếm trùng `referral_attributions.labor_profile_id` trước mọi GO prod | F-6 | Thấp |
| 4 | Siết `USING` của `hrp_ra_select_writer` hoặc tách role đọc | N-2 | Thấp-TB |
| 5 | Xác minh trên DB thật: mọi bảng RLS trong `submitPublicIntake` có policy phủ bare-writer-no-GUC | N-1 | Thấp |
| 6 | Chọn một `TIER0_HANDOVER` + sửa cursor `PLANNER_HANDOVER` | G-3 | Thấp |
| 7 | Thống nhất auth route (helper chung), bỏ `session as any`; nhân rộng logger correlation-id thay `console.*` | F-4, refactor | Trung bình |

---

### Phụ lục — ràng buộc an toàn (không đổi)
- `.env` `neondb`/`hrp-live` = PRODUCTION; `hrp_mp2_test` là branch test canonical duy nhất — cấm cắt branch test mới từ `hrp-live`.
- Cấm apply/re-apply migration lên production khi chưa có lệnh GO riêng kèm preflight. Migration AFF-03 tự khai "KHONG apply len production — T0/Owner apply qua gate riêng".
- Không commit/push lên `main`; mỗi stream một branch/worktree; T0 quyết merge. Không `git add -A`.
- Secrets chỉ `[REDACTED]`; không PII thật vào fixture/log/demo. Sự cố credential 14/09: rotate sau deploy production.

*Hết. Snapshot 21/09 tại `1059f66`. Không có file code nào bị sửa. Bản 09-18 giữ nguyên làm lịch sử.*
