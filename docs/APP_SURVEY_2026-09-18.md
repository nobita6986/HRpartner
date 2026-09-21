# Khảo sát tình hình App — 18/09/2026

> **Loại tài liệu:** Khảo sát READ-ONLY (không sửa code). Viết cho Owner (T0) để định vị dự án và ra quyết định.
> **Thời điểm đo:** 2026-09-18, ~21:45 (+0700)
> **Người đo:** T0 advisory (Claude)
> **Nguồn:** `origin/main` @ `4e6d0c1`, cây làm việc `tier1/hrp-v6-w5-handling-assignment-ui`, 21 worktree, schema 61 model / 40 migration.
> **Phạm vi:** chỉ khảo sát + ghi file này. Không sửa/commit/push bất kỳ file code nào.

---

## 1. Snapshot số liệu

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| `origin/main` HEAD | `4e6d0c1` (18/09 21:33) | Merge PR #19 (AFF-05A) |
| Tổng commit `origin/main` | 906 | (sáng nay 867) |
| Migration | 40 | mới nhất `20260918000000_aff05a_labor_profile_handling_assignment` |
| Model schema | 61 | 14 enum |
| Domain (`src/domains`) | 13 | +1 file test lạc chỗ (mục 6.3) |
| Trang admin (`page.tsx`) | 25 | |
| Test file | 180 | trong đó **chỉ 11 integration test** |
| Bảng có RLS enable | 66 | qua các migration |
| Bảng có CREATE POLICY | 47 | |
| CI `main` | **XANH 6 run liên tiếp** | run gần nhất 18/09 14:33Z push |
| PR mở / issue mở | 0 / 0 | |
| Worktree | 21 | (16/09: 11) |

**Các PR đã merge trong 24h qua:** #16 (AFF-02 link capture), #18 (hotfix redirect relative URL), #19 (AFF-05A handling assignment). Lane AFF chạy rất nhanh: N2-1 → N2-2 → AFF-05A trong hai ngày.

---

## 2. Vị trí trên plan

### 2.1. Có BA tầng plan cùng sống, chưa hòa giải

1. **V6 OUTSTANDING (W1–W5)** — tracked trên `main`.
2. **V7** (19 backlog) — tracked.
3. **HRP_EXECUTION_REALIGNMENT_PLAN (P0–P5) + V8 (V8.0–V8.5) + V9 (V9.0–V9.8)** — **UNTRACKED**, mới nhất, tự tuyên là authority thay thế cả hai tầng trên.

`HRP_EXECUTION_REALIGNMENT_PLAN.md` (1.783 dòng), `docs/V8/` (9 file), `docs/V9/` (12 file) **đều chưa từng được commit** — chỉ tồn tại trong cây làm việc hiện hành. Đây đúng cơ chế đã làm mất `TIER0_SHIFT_HANDOVER.md` trước đây. **Tài liệu đang chi phối hướng đi của toàn dự án hiện đang ở ngoài git.**

### 2.2. Vị trí thực tế theo Realignment plan (authority mới nhất)

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| **P0-A Evidence Gateway** | ❌ CHƯA BẮT ĐẦU | grep `EvidenceStorage/EvidenceRecord/EvidenceGateway` trong `src`/`app` = 0 kết quả. CCCD vẫn qua `cccdNumber` + `app/admin/media/**` |
| **P0-B Production boundary (VPS)** | ❌ CHƯA BẮT ĐẦU | Không có `Dockerfile`/`docker-compose`/`nginx.conf`. Vẫn còn `vercel.json` — deploy target vẫn Vercel |
| **P0-C Contract source (HRP↔CRM)** | ❌ CHƯA BẮT ĐẦU | chỉ có tài liệu, `src/domains/crm/` chỉ là read-service của W3 |
| **P0-D S2S / idempotency / outbox** | 🟡 MỘT PHẦN | `outbox`/`idempotency` có ở domain nội bộ, nhưng không phải contract tích hợp; `S2S` = 0 |
| **P0-E CI/process simplification** | ✅ XONG | PR #8/#11/#12/#13/#15: test budget, hygiene, gitignore, path-filter, container DB |
| **§48 Discovery package (6 artifact)** | ❌ **0/6** | `EXECUTION_REALIGNMENT_DISCOVERY`, `EVIDENCE_STORAGE_AUDIT`, `CRM_CONTRACT_GAP_REPORT`, `THIN_SLICE_CAPABILITY_MATRIX`, `CURRENT_CI_COST_REPORT`, `BLOCKER_REGISTER` — tìm khắp `docs/`: cả sáu MISSING |
| **P1-C LaborProfile create-or-match** | 🟡 ĐANG THI CÔNG | W4 workbench + POST route có `createCandidateSubmissionFromIntake`, trả 409 POSSIBLE_MATCH (không auto-merge — đúng luật) |
| **P1 (AFF handling)** | 🟡 vừa merge AFF-05A | nhưng còn khiếm khuyết kỹ thuật nặng (mục 3) |
| **P2 → P5 (V8/V9)** | ❌ CHƯA CHẠM | đúng, vì bị evidence-gate |

**Kết luận vị trí:** App đang ở **"P0-E xong, phần còn lại của P0 chưa bắt đầu, cổng discovery §48 bị đi vòng qua hoàn toàn (0/6)"**. Việc code P1 (thin recruitment slice + AFF) đang chạy trước khi P0 safety foundations có mặt — ngược thứ tự ưu tiên plan tự đặt (`P0 → P1 → ...`). Nếu production thật là VPS với CCCD ngoài source tree như §59 Owner Decision Log, thì đang có khoảng trống an toàn dữ liệu định danh, không chỉ là chậm tiến độ.

---

## 3. Điểm mờ kỹ thuật & lỗi code (xếp nặng trước)

### 🔴 F-1 (CRITICAL tiềm ẩn / HIGH hiện tại) — Bảng `labor_profile_handling_assignments` KHÔNG có RLS

- **Nơi:** `prisma/migrations/20260918000000_aff05a_labor_profile_handling_assignment/migration.sql`
- **Sự việc:** migration tạo bảng + index + FK nhưng **không** `ENABLE ROW LEVEL SECURITY`, **không** `FORCE`, **không** `CREATE POLICY`, **không** GRANT tường minh (dựa vào DEFAULT PRIVILEGES). Bảng này vắng mặt ở cả 66 bảng-có-RLS lẫn 47 bảng-có-policy.
- **Hệ quả:** mọi route đều gọi `withDbContext(prisma, session, ...)` để set GUC `app.role`/`app.user_id` — nhưng **không có policy nào đọc GUC đó cho bảng này**, nên GUC vô nghĩa ở đây. Kết nối `app_user_writer` đọc/ghi **mọi dòng** của mọi hồ sơ. Hiện tại chỉ được chặn bằng kiểm tra role ở tầng app (`ADMIN`/`HR_MANAGER`/`HR_STAFF`). Đây là bảng ownership gắn với commission (`source = AFF_INITIAL`). Khoảnh khắc P3 Affiliate Portal (hoặc bất kỳ path non-admin nào) truy vấn "assignment của tôi", nó sẽ **lộ handling assignment của tất cả mọi người** — không có phòng thủ tầng DB.
- **Vì sao đáng lo:** 66 bảng khác đều có RLS. Một bảng ownership ra đời trần trụi là **lệch chuẩn phòng thủ**, không phải "chưa tới lượt".

### 🔴 F-2 (HIGH) — Lỗi logic: reassign hồ sơ có assignment HẾT HẠN sẽ vỡ (P2002 giả danh "conflict")

- **Nơi:** `src/domains/talent/handling-assignment.service.ts:81-114` (`managerAssign`) + partial unique index `labor_profile_handling_active_idx ... WHERE status = 'ACTIVE'` (migration dòng 28) + `getActiveHandlingAssignment:116-140`.
- **Cơ chế:** `getActiveHandlingAssignment` trả `null` cho một assignment **status vẫn = 'ACTIVE'** nhưng `expiresAt < now` (dòng 135-137). Nhưng trong DB dòng đó **vẫn mang status 'ACTIVE'** → vẫn chiếm slot của partial unique index. `managerAssign` thấy `activeAssignment == null` (dòng 88) nên **bỏ qua nhánh chuyển `TRANSFERRED`**, đi thẳng `create` một dòng ACTIVE mới → **đụng unique index → P2002**.
- **Failure scenario:** hồ sơ X có assignment hết hạn 8 ngày trước (status vẫn ACTIVE vì không có ai "quét"). Manager bấm "Gán". `managerAssign` create ACTIVE mới → P2002 → route trả `409 "Assignment was modified concurrently"` (route dòng 61-62). Người dùng thấy báo lỗi "sửa đồng thời" trong khi **không hề có ai sửa đồng thời** — chỉ là dòng cũ chưa được dọn.
- **Đối chứng:** `createInitialAffiliateAssignment:37-48` **miễn nhiễm** vì nó `updateMany(... status ACTIVE → REVOKED)` trước khi create. `managerAssign` thiếu đúng bước dọn này.
- **Gốc rễ:** **không có cron/sweep** nào chuyển `ACTIVE → EXPIRED` khi hết hạn (grep xác nhận chỉ service này nhắc `EXPIRED`, không có job nền). "Hết hạn" chỉ được suy diễn lúc đọc, không phản ánh vào DB.

### 🟠 F-3 (MEDIUM) — `release` ghi sai enum: dùng `EXPIRED` cho hành vi thu hồi thủ công

- **Nơi:** `src/domains/talent/handling-assignment.service.ts:159-166` (`releaseHandlingAssignment`).
- **Sự việc:** thu hồi về Company Pool ghi `status = EXPIRED` (dòng 162), trong khi enum có sẵn `REVOKED`. Phân biệt "hết hạn tự nhiên" vs "người thu hồi" chỉ còn dựa vào prefix chuỗi `reason` (`[Release by ...]`) — mong manh. Cùng lỗi F-2: `release` cũng gọi `getActiveHandlingAssignment` nên **không thể thu hồi** một assignment đã quá hạn (trả null → no-op).

### 🟠 F-4 (MEDIUM) — Hai cơ chế auth lẫn lộn trong cùng một feature

- **Nơi:**
  - `app/api/admin/labor-profiles/route.ts:16` + `[id]/route.ts:18` dùng `getAuthContext(req)` → `AuthContext` chuẩn.
  - `app/api/admin/handling-assignable-users/route.ts:18` và `[id]/handling-assignments/route.ts:41` dùng `getServerSession()` rồi **`withDbContext(prisma, session as any, ...)`** — ép kiểu `as any` để lọt.
  - `[id]/handling-assignment-history/route.ts:28` dùng `getServerSession()` nhưng truyền `session` **không** `as any`.
- **Hệ quả:** `session as any` **vô hiệu hóa** kiểm tra kiểu của `withDbContext`. Nếu shape của session lệch với `AuthContext` (thiếu `userId`/`role`), `applyRlsContext` sẽ **throw lúc runtime** (`rls-context.ts:49-54`) thay vì fail lúc compile. Ba route AFF dùng session, hai route labor-profile dùng authContext — cùng một tính năng, hai đường xác thực, một trong hai ép `any`. Cần thống nhất một nguồn.

### 🟠 F-5 (MEDIUM) — Schema drift: `onDelete` của `referral_attributions.labor_profile_id` không khớp DB

- **Nơi:** commit `85c0077` ("remove fk constraint") xóa đúng 1 dòng trong migration 0918:
  `ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_labor_profile_id_fkey" ... ON DELETE SET NULL`.
- **Phân tích:** FK trùng **tên** với FK đã tạo ở migration `20260917` (`ON DELETE RESTRICT ... DEFERRABLE INITIALLY DEFERRED`). Việc gỡ là **đúng** — nếu để lại, `prisma migrate deploy` trên DB đã có 0917 sẽ vỡ vì trùng constraint. **Nhưng** nó để lại drift: schema Prisma khai quan hệ optional (`laborProfileId String?`) ngụ ý `SetNull`, còn DB thực thi `RESTRICT`. `prisma migrate status` xanh (chỉ so lịch sử migration, không so hành vi). Xóa một `LaborProfile` sẽ **bị RESTRICT chặn** thay vì set null như schema gợi ý.
- **Mức:** MEDIUM vì delete hồ sơ không phải path thường xuyên, nhưng là bẫy im lặng khi cleanup dữ liệu.

### 🟠 F-6 (MEDIUM — rủi ro khi APPLY PROD) — UNIQUE index mới có thể vỡ nếu prod đã có dòng trùng

- **Nơi:** migration 0918 dòng 31: `CREATE UNIQUE INDEX "referral_attributions_labor_profile_id_key" ON "referral_attributions"("labor_profile_id")`.
- **Sự việc:** migration `20260917` **không** tạo unique trên cột này (đã xác nhận). 0918 mới thêm. CI xanh vì DB container rỗng. **Trên production, nếu đã tồn tại ≥2 `referral_attributions` cùng một `labor_profile_id`, lệnh tạo unique index sẽ FAIL** giữa chừng migrate deploy.
- **Hành động bắt buộc:** trước khi có lệnh GO apply lên prod, phải chạy preflight đếm trùng: `SELECT labor_profile_id, count(*) FROM referral_attributions WHERE labor_profile_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1`.

### 🟡 F-7 (LOW) — `version` là cột trang trí (optimistic-lock không được thực thi)

- **Nơi:** cột `version Int @default(1)` trên `LaborProfileHandlingAssignment` (schema) + `migration.sql:16`. Grep xác nhận `version` **không hề xuất hiện** trong `handling-assignment.service.ts`.
- **Hệ quả:** mọi `update` filter bằng `id` đơn thuần (dòng 91-92, 159), không `where: { id, version }`, không `data: { version: { increment: 1 } }`. Cột tồn tại nhưng **không bảo vệ** khỏi lost-update. Hoặc dùng nó thật, hoặc bỏ đi để khỏi tạo ảo giác đã có optimistic lock.

### 🟡 F-8 (LOW) — `completed_milestone_id` là tham chiếu mềm không FK

- **Nơi:** schema `completedMilestoneId String? @map("completed_milestone_id")` — không có `@relation`, migration không có FK. Đây là tham chiếu lỏng lẻo có chủ đích (có thể milestone table chưa tồn tại), nhưng cần ghi rõ để không ai nhầm là quan hệ được DB bảo vệ.

### 🟡 F-9 (LOW) — Client component: `any`, `alert()`, và fetch history không có state loading rõ ràng

- **Nơi:** `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx`
  - dòng 73 `catch (err: any)` + dòng 74 `alert(err.message)` — UX lỗi bằng `alert()`, và `err.message` có thể là chuỗi kỹ thuật.
  - dòng 89 `useState<Record<string, any>[]>` — history mất kiểu hoàn toàn.
  - dòng 60 `parseInt(days, 10)` không kiểm NaN (input `type=number min=1` chặn ở client nhưng không phải hợp đồng server).
  - dòng 30-32 `isExpired`/`isCompanyPool` tính hoàn toàn phía client dựa `expiresAt` — có thể lệch với phán quyết server (liên quan F-2).

### 🟡 F-10 (LOW) — Import giữa file trong route

- **Nơi:** `app/api/admin/labor-profiles/route.ts:45` — `import { createCandidateSubmissionFromIntake, ... }` nằm **giữa** hàm `GET` và `POST`. Hợp lệ về mặt hoisting nhưng là smell về tổ chức, gây khó đọc và dễ trượt lint sau này.

---

## 4. Nợ kỹ thuật (số liệu toàn repo, đã loại `node_modules`/`.claude`/test)

| Chỉ số | Giá trị | Đánh giá |
|---|---|---|
| Debt markers (TODO/FIXME/HACK/XXX) | **6** (4 TODO, 2 XXX) | Rất thấp — tốt |
| `as any` | 23 | Cần thu hẹp, nhất là ở route/service |
| `: any` | 24 | |
| `@ts-ignore` / `@ts-expect-error` | **0** | Tốt |
| `console.*` trong code production | **107** | Cao — nên thay bằng logger có cấp độ + tương quan request |

**Điểm cần chú ý về `console.*`:** 107 lệnh trong code production, chủ yếu `console.error(err)` thô trong các API route (ví dụ `handling-assignments/route.ts:64`, `handling-assignable-users/route.ts:32`, `labor-profiles/route.ts:40,97`). Không rò rỉ ra client (client chỉ nhận `"Internal Server Error"` — tốt), nhưng trên VPS/production sẽ đổ nguyên error (có thể chứa thông tin nhạy) vào stdout, không có cấu trúc, không có request-id. Đây là món cần chuẩn hóa **trước khi P0-B VPS** (khi không còn Vercel log).

---

## 5. Nghẽn cổ chai

### 5.1. Test coverage — lệch nặng về unit, thiếu integration ở đúng chỗ rủi ro nhất
- 180 test file nhưng **chỉ 11 integration test**. Domain **`talent` có 0 integration test** — trong khi đây là domain RLS-heavy nhất vừa nhận W4/W5/AFF-05A.
- `handling-assignment.service.test.ts` **có tồn tại** nhưng là **unit test (mock)** — **không thể** bắt được F-1 (thiếu RLS) và F-2 (đụng unique index), vì cả hai chỉ lộ ra khi chạy trên Postgres thật có RLS + index. Đây là đúng lớp lỗi "`total: 0` / test xanh song song với vỡ thật" mà pipeline đã vấp nhiều lần.
- **Nghẽn:** feature ownership/commission-adjacent đang lên `main` chỉ với bằng chứng mock. Cần một `handling-assignment.integration.test.ts` chạy qua `withDbContext` trên container DB, khẳng định: (a) role thấp không đọc được assignment của người khác; (b) reassign hồ sơ hết-hạn không vỡ.

### 5.2. Điều phối — 21 worktree, cây làm việc không trung lập
- 21 worktree (gấp đôi 16/09). Có worktree lồng (`.claude/worktrees/worktree-04d-detail-ui-r1` 165408f), có bản sao cây repo `tier1-n2-1/` untracked ngay trong repo, `worktree_link/`, `diff.txt` (968 dòng), `t0_correction.ps1`, `t0_script.ps1` untracked.
- Cây làm việc chính đang đứng trên branch `tier1/hrp-v6-w5-handling-assignment-ui` với **toàn bộ W5 chưa commit** (các file `?? app/api/admin/handling-assignment*`, `?? .../handling-assignment-manager.tsx`, `M .../[id]/page.tsx`). Nếu mất cây này, mất W5.

### 5.3. CI Integration lane vẫn giữ concurrency đơn
- `.github/workflows/ci.yml:69-71`: job `integration` giữ `group: hrpartner-dedicated-integration-db, cancel-in-progress: false` (T0 directive: giữ tới khi chứng minh an toàn 2-PR song song). Với container DB thì mỗi run tự dựng DB riêng, nhưng concurrency group đơn vẫn **tuần tự hóa** các integration run — nghẽn khi nhiều PR cùng lúc. Đây là hạn chế đã biết, có chủ đích, nêu để theo dõi.

---

## 6. Điểm cần refactor

### 6.1. File service quá lớn (god files)
| File | Dòng | Ghi chú |
|---|---|---|
| `src/domains/attendance/ticket.service.ts` | **975** | ứng viên tách nặng nhất |
| `src/domains/staffing/assignment-placement.service.ts` | **947** | |
| `app/admin/media/media-library-client.tsx` | 811 | client component quá lớn |
| `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | 739 | |
| `src/domains/job-board/public.service.ts` | 709 | |
| `src/domains/commission/ledger.service.ts` | 648 | |

Sáu file >600 dòng, hai file >900. Ngưỡng ~400 dòng nên là mốc soát tách. Ưu tiên `ticket.service.ts` và `assignment-placement.service.ts`.

### 6.2. Boilerplate `withDbContext` + auth lặp ở mọi route
Mỗi API route lặp: `getServerSession/getAuthContext` → check role trong `Set` cục bộ → `getPrisma()` → `withDbContext(...)` → `try/catch console.error → 500`. Nên trích một helper `withAuthorizedRoute(roles, handler)` để: (a) thống nhất một cơ chế auth (xử lý F-4); (b) xóa 5 `ALLOWED_ROLES`/`ADMIN_ROLES` set rải rác (hiện `ADMIN_ROLES` ở labor-profiles gồm cả `HR_STAFF`, còn `ALLOWED_ROLES` ở handling chỉ `ADMIN`/`HR_MANAGER` — dễ lệch quyền ngoài ý muốn); (c) chuẩn hóa error → logger thay `console.error`.

### 6.3. File test lạc chỗ trong cây domain
- `src/domains/admin-demand-tree.integration.test.ts` nằm **thẳng trong `src/domains/`** thay vì trong thư mục domain con. `ls src/domains` liệt kê nó như một "domain". Chuyển vào đúng domain (hoặc `src/domains/admin/`).

### 6.4. "Company Pool" tính bằng suy diễn thời gian, rải ở nhiều nơi
Khái niệm "assignment hết hạn = về Company Pool" hiện được tính lại độc lập ở: `getActiveHandlingAssignment` (service), `getLaborProfilesList` view COMPANY_POOL (`labor-profile.read-service.ts:93-102`), và client `handling-assignment-manager.tsx:30-32`. Ba nơi, ba lần logic `expiresAt < now`. Nên tập trung vào một nguồn (lý tưởng là **quét status vào DB** — giải luôn F-2), hoặc ít nhất một hàm dùng chung. Đây là nợ kiến trúc gốc rễ của F-2/F-3.

---

## 7. Bất thường điều phối/governance cần Owner biết

### G-1 (cao nhất, rẻ nhất) — Plan chi phối đang ở NGOÀI git
`HRP_EXECUTION_REALIGNMENT_PLAN.md` + `docs/V8/` + `docs/V9/` (≈22 file) untracked. Mất cây làm việc = mất phương hướng chiến lược. Đã có tiền lệ mất `TIER0_SHIFT_HANDOVER.md`. Commit lên một branch docs rồi merge là việc rẻ và khẩn.

### G-2 — Tier 1 tự phát hành verdict Tier 3 (lặp lại nhiều lần, đã vào `main`)
`git log origin/main` cho thấy hàng loạt commit **author `Tier 1 <tier1@hrp.local>`** với message kiểu `audit(...): record Tier 3 audit verdict ... (PASS)`:
- `audit(admin): record Tier 3 audit verdict for labor profile workbench` (round 1, 2, 3)
- `audit(referrals): record Tier 3 audit verdict for N2-2 link capture (PASS)`
- `audit(ci): record Tier 3 audit verdict for container DB (PASS)`
- AFF-05A: cả `feat`, `fix ... address T3 audit blockers`, và verdict đều do `Tier 1` author trong cùng dải commit (`210a3d3..85c0077`).

Luật: **Tier 1 KHÔNG tự phát hành verdict Tier 3.** Khi bên soạn = bên chấm, LIGHT audit thành nghi thức. Chính các khiếm khuyết F-1 (thiếu RLS trên bảng ownership) và F-2 (reassign vỡ) lọt qua "PASS" là bằng chứng thực nghiệm cho rủi ro này.

### G-3 — Cursor điều phối stale/mâu thuẫn
- `TIER0_HANDOVER.md` (main): vẫn 412 dòng, `Updated: 2026-09-11`, vẫn tự nhận `ACTIVE TIER 0 AUTHORITY` — stale 7 ngày và bị realignment plan vượt mặt về nội dung.
- `PLANNER_HANDOVER.md`: `updated_at 2026-09-17T07:55`, `current_task: hrp-v6-n2-aff-01-attribution-foundation`, `current_gate: T0_REVIEW` — task đó **đã merge**. Cursor đang báo "chờ T0 review" một việc đã lên production, cộng nhiều dòng cursor cũ (`ui-04c1`, `p1-job-opening-status-card`).
- Một agent mới tiếp quản sẽ đọc ba nguồn mâu thuẫn (handover cũ, planner cursor sai, plan ngoài git) và không biết nguồn nào thắng.

### G-4 — P0 bị đi vòng qua ngay ở cổng đầu
Realignment §48 đòi 6 discovery artifact "before coding" + §58 đòi ER-D00..D04; thực tế **0/6 artifact**, và code P1/AFF đã chạy. Nếu production thật là VPS + CCCD ngoài source tree, thì P0-A Evidence Gateway (0 code) và P0-B boundary (0 file) chưa có mà đã xử lý CCCD qua `cccdNumber`/`app/admin/media` trên Vercel là rủi ro định danh.

---

## 8. Khuyến nghị ưu tiên (chờ lệnh Owner — chưa thực hiện gì)

| # | Việc | Vì sao | Chi phí |
|---|---|---|---|
| 1 | Commit realignment + V8 + V9 lên branch docs, merge | Đóng G-1 — plan đang ngoài git | Thấp |
| 2 | Chặn/mở lại AFF-05A: thêm migration RLS + policy cho `labor_profile_handling_assignments`, thêm sweep/dọn ACTIVE→EXPIRED (hoặc để `managerAssign`/`release` revoke trước khi create), thêm integration test RLS | Đóng F-1, F-2, F-3 — lỗi trên `main` | Trung bình |
| 3 | Preflight đếm trùng `referral_attributions.labor_profile_id` **trước** mọi lệnh GO apply prod | Đóng F-6 — migrate deploy có thể vỡ giữa chừng | Thấp |
| 4 | Chọn một `TIER0_HANDOVER.md` duy nhất + sửa cursor `PLANNER_HANDOVER.md` về task thực tế | Đóng G-3 | Thấp |
| 5 | Thiết lập lại quy trình để Tier 3 audit độc lập (khác author, khác workspace) | Đóng G-2 | Quy trình |
| 6 | Thống nhất một cơ chế auth cho route (helper chung), bỏ `session as any` | Đóng F-4 + refactor 6.2 | Trung bình |

---

### Phụ lục — ràng buộc an toàn nhắc lại (không đổi)
- `.env` `neondb`/`hrp-live` = PRODUCTION. `hrp_mp2_test` là branch test canonical duy nhất — cấm cắt branch test mới từ `hrp-live`.
- Cấm apply/re-apply migration lên production khi chưa có lệnh GO riêng kèm preflight.
- Không commit/push lên `main`; mỗi stream một branch/worktree; T0 quyết merge. Không `git add -A`.
- Secrets chỉ ghi `[REDACTED]`; không PII thật vào fixture/log/demo.
- Sự cố credential 14/09: rotate sau khi deploy production (Owner đã quyết giữ hiện trạng).

*Hết. Tài liệu này chỉ khảo sát; không có file code nào bị sửa.*
