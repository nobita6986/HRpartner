# TASK — hrp-v6-p1-job-opening-posting-split

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-v6-p1-job-opening-posting-split` |
| Work type | `SCHEMA` |
| Audit mode | `SCHEMA_AUDIT` |
| Spec version | `v1.1` |
| Status | `READY_FOR_TIER3_AUDIT` |
| Baseline | `main @ 4758809` — schema.prisma chưa có `JobOpening` / `JobPosting`; xác nhận bằng `git grep -nE "model (JobOpening|JobPosting)" -- prisma/schema.prisma` trả rỗng |
| Current execution round | `1` |
| Current audit round | `0` |
| Updated | `2026-09-08 10:01 Asia/Bangkok` |
| Phase | `V6 Phase 1 — nền dữ liệu` |
| Nguồn quyết định | `docs/V6/v6-admin-rebuild.md` mục 11 (V6-DEC-011, V6-DEC-017, V6-DEC-030, V6-DEC-031) và mục 4.7 / 4.8 |

## 1. Outcome

Tách hai khái niệm đang bị gộp ở tầng `Project`: NHU CẦU tuyển nội bộ và TIN đăng công khai. Hai model MỚI, THÊM-thuần:

- `JobOpening` — đơn vị NHU CẦU nội bộ (loại vị trí cần N người), đặt trên `StaffingOrder` / `StaffingOrderSlot` — persistence chuyển tiếp gần nhất (V6-DEC-017); một opening chứa nhiều slot (V6-DEC-011); có `status` vòng đời (mục 4.7).
- `JobPosting` — HÌNH CHIẾU công khai của đúng MỘT `JobOpening` (V6-DEC-011); một opening tối đa MỘT tin đang PUBLISHED; giữ `slug`, `revision`, lịch sử publish (mục 4.8).

Kèm móc THÊM-thuần `StaffingOrderSlot.jobOpeningId` nullable và một migration BACKFILL idempotent dựng opening/posting từ dữ liệu sống.

RANH GIỚI PHASE (khai TRƯỚC, chống trôi):
- Task này KHÔNG repoint bề mặt công khai. `getPublicJobProjection` / `getPublicJobDetail` vẫn đọc `Project` như cũ tại [public.service.ts:684](src/domains/job-board/public.service.ts#L684) và [public.service.ts:695](src/domains/job-board/public.service.ts#L695). Không gian slug đổi và map cũ→mới + redirect là việc PHASE 3 (V6-DEC-030).
- Hàng rào đóng băng [public-card-truth.test.ts:293](src/domains/job-board/public-card-truth.test.ts#L293) — tập khoá `where` = `isPublic` / `staffingOrders` / `status` — PHẢI giữ NGUYÊN và vẫn XANH ở task này. Việc thêm điều kiện `JobPosting` vào truy vấn công khai (và cập nhật hàng rào trong cùng lượt) là PHASE 3 (V6-DEC-031). Task này CẤM Tier 2 nới lỏng test đó.
- Ngoài phạm vi: mọi UI; mọi service / route; sửa test hiện có.

## 2. Evidence

Bằng chứng THẬT (lệnh + mã thoát + output) cho mỗi AC ở mục 6, lưu dưới `docs/tasks/hrp-v6-p1-job-opening-posting-split/evidence/`. Không nhận lời văn thay số đo. Không in secret / connection string / PII.

- Kiểm schema tĩnh OFFLINE: `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`.
- THÊM-thuần OFFLINE: `git show HEAD:prisma/schema.prisma > baseline-head.prisma` rồi `npx prisma migrate diff --from-schema-datamodel baseline-head.prisma --to-schema-datamodel prisma/schema.prisma --script` — SQL DDL chỉ có `CREATE TABLE` / `ADD COLUMN` / `CREATE INDEX`, KHÔNG có `DROP`.
- Bề mặt công khai KHÔNG đổi: `git diff --cached --name-only` (vắng hai file public) + `npm run test:unit` (hàng rào đóng băng vẫn xanh).
- Phạm vi: `git status --porcelain` và `git diff --cached --name-only`.
- CẤM chạy `prisma migrate dev` / `migrate deploy` / `migrate status` trên DB sống; áp RLS + backfill lên live là OP của sếp.

## 3. Decisions

Mọi quyết định dưới đây là "Chốt" trong `docs/V6/v6-admin-rebuild.md` mục 11 — người thực thi KHÔNG mở lại, chỉ hiện thực.

- `V6-DEC-011` — Opening/Posting tách đôi: một opening chứa nhiều slot, một posting là hình chiếu công khai của đúng một opening; một opening tối đa một posting PUBLISHED cùng lúc.
- `V6-DEC-017` — Persistence chuyển tiếp gần nhất: `StaffingOrderSlot.jobOpeningId` nullable là móc nối opening; `JobOpening.staffingOrderId` / `JobOpening.staffingOrderSlotId` tuỳ theo cấp granularity (task này dùng `StaffingOrderSlot`).
- `V6-DEC-030` — Không gian slug đổi: redirect cũ→mới + map là việc PHASE 3, không phải task này.
- `V6-DEC-031` — Bề mặt công khai repoint sang `JobPosting`: việc cập nhật `getPublicJobProjection` / `getPublicJobDetail` là PHASE 3, KHÔNG làm ở đây.
- Hàng rào đóng băng [public-card-truth.test.ts:293](src/domains/job-board/public-card-truth.test.ts#L293) PHẢI giữ NGUYÊN và vẫn XANH ở task này.

## 4. Contract

### 4.1 Scope cho phép (chỉ được stage các path này)
- `prisma/schema.prisma`
- `prisma/migrations/**` (migration THÊM-thuần)
- `docs/tasks/hrp-v6-p1-job-opening-posting-split/**` (HANDOFF.md, evidence/)

### 4.2 CẤM chạm
- `src/**`, `app/**`, `tests/**`, mọi UI / service / route / test hiện có.
- `src/domains/job-board/public.service.ts`, `src/domains/job-board/public-card-truth.test.ts` (bề mặt công khai — Phase 3 lo).
- `Project.staffingOrders`, `StaffingOrder.slots` hiện có — KHÔNG sửa.
- `.env`, `package.json`, `vitest.config.ts`, `tsconfig.json`, `.gitignore`, script gate.
- CẤM `git add -A` / `git add .`; CẤM commit / push / merge; CẤM migrate/seed/destructive trên DB sống.

### 4.3 Đặc tả model (THÊM-thuần, id `String @id @default(uuid())`, snake_case qua `@map`/`@@map`)

`JobOpening` → `@@map("job_openings")`:
- `staffingOrderId String` + `@@index`; `staffingOrderSlotId String?` + `@@index` (theo V6-DEC-017).
- `status String @default("DRAFT")` (DRAFT / OPEN / FILLED / CANCELLED).
- `slots StaffingOrderSlot[]` (one-to-many ngược).
- `posting JobPosting?` (one-to-zero-or-one).
- `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`.

`JobPosting` → `@@map("job_postings")`:
- `jobOpeningId String @unique` + relation `jobOpening JobOpening @relation(...)` (một opening chỉ một posting PUBLISHED).
- `slug String @unique`; `revision Int @default(1)`; `publishedAt DateTime?`; `archivedAt DateTime?`.
- `status String @default("DRAFT")` (DRAFT / PUBLISHED / ARCHIVED).
- `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`.

Móc trên model cũ (THÊM-thuần): `StaffingOrderSlot.jobOpeningId String?` + `@@index` + relation `jobOpening JobOpening?`; `StaffingOrder.jobOpenings JobOpening[]` (back-relation).

### 4.4 Luật migration
- Migration THÊM-thuần: chỉ `CREATE TABLE` hai bảng mới + `ADD COLUMN job_opening_id` nullable trên `staffing_order_slots` + `CREATE INDEX`. KHÔNG `DROP`, KHÔNG đổi constraint cũ.
- Migration BACKFILL (tùy chọn): idempotent upsert tạo opening/posting từ dữ liệu sống; CẤM chạy trên DB sống trong task này.

## 5. Execution Plan

- `STEP-01` — Thêm `JobOpening` và `JobPosting` vào `prisma/schema.prisma` theo mục 4.3.
- `STEP-02` — Thêm móc THÊM-thuần `StaffingOrderSlot.jobOpeningId String?` + relation + `@@index`; thêm back-relation `StaffingOrder.jobOpenings`.
- `STEP-03` — Sinh migration THÊM-thuần dưới `prisma/migrations/`; chứng minh không phá bằng so datamodel OFFLINE, khẳng định SQL không có `DROP`.
- `STEP-04` — Chạy `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit` (OFFLINE) và đóng phạm vi bằng `git status --porcelain` + `git diff --cached --name-only`.
- `STEP-05` — Chạy hàng rào đóng băng: `npm run test:unit -- public-card-truth` — PHẢI vẫn 23/23 PASS.
- `STEP-06` — Viết HANDOFF.md, KHÔNG commit/push.

### 5.1 Traceability RQ → STEP → AC

| RQ | STEP | AC |
|----|------|-----|
| RQ-01 | STEP-01 | AC-01, AC-02 |
| RQ-02 | STEP-01 | AC-03 |
| RQ-03 | STEP-02 | AC-04, AC-05 |
| RQ-04 | STEP-03 | AC-06 |
| RQ-05 | STEP-04 | AC-07, AC-08 |
| RQ-06 | STEP-05 | AC-09 |

Diễn giải RQ:
- `RQ-01` JobOpening đúng trường + vòng đời DRAFT/OPEN/FILLED/CANCELLED.
- `RQ-02` JobPosting đúng trường + tối đa 1 PUBLISHED qua `@unique` trên `jobOpeningId`.
- `RQ-03` Slot gắn opening qua FK nullable, không phá cột hiện có.
- `RQ-04` Migration THÊM-thuần không `DROP`.
- `RQ-05` Schema hợp lệ + typecheck sạch.
- `RQ-06` Hàng rào công khai không đổi.

## 6. Acceptance

Mỗi hàng đo bằng LỆNH thật; tất cả OFFLINE. Không dùng ký tự ống `|` trong cột Phương pháp.

| AC | RQ | Điều kiện | Phương pháp đo | Bằng chứng | Chặn? |
|----|----|-----------|----------------|------------|-------|
| `AC-01` | `RQ-01` | Model `JobOpening` tồn tại với trường ở mục 4.3 và schema hợp lệ | `npx prisma validate` exit 0 ; `git grep -n "model JobOpening" -- prisma/schema.prisma` | stdout validate + grep line, `evidence/ac01.txt` | Yes |
| `AC-02` | `RQ-01` | `JobOpening.status` có default `DRAFT` và enum vòng đời | `git grep -n "@default.*DRAFT" -- prisma/schema.prisma` ; `git grep -n "FILLED\|CANCELLED" -- prisma/schema.prisma` | grep output, `evidence/ac02.txt` | Yes |
| `AC-03` | `RQ-02` | Model `JobPosting` tồn tại, `jobOpeningId String @unique` | `npx prisma validate` exit 0 ; `git grep -n "jobOpeningId String @unique" -- prisma/schema.prisma` | stdout + grep, `evidence/ac03.txt` | Yes |
| `AC-04` | `RQ-03` | `StaffingOrderSlot` CHỈ thêm `jobOpeningId String?` + relation + `@@index`; không xoá trường cũ | `git diff --cached -- prisma/schema.prisma` ; đọc phần `staffing_order_slots` chỉ có dòng thêm (`+`), không dòng `-` xoá | diff `--cached`, `evidence/ac04.txt` | Yes |
| `AC-05` | `RQ-03` | `StaffingOrder.jobOpenings` back-relation tồn tại | `git grep -n "jobOpenings JobOpening\[\]" -- prisma/schema.prisma` | grep output, `evidence/ac05.txt` | Yes |
| `AC-06` | `RQ-04` | Migration THÊM-thuần: SQL không có `DROP` | `git show HEAD:prisma/schema.prisma > baseline-head.prisma` ; `npx prisma migrate diff --from-schema-datamodel baseline-head.prisma --to-schema-datamodel prisma/schema.prisma --script` ; `Select-String -Pattern "DROP" -CaseSensitive` trả 0 dòng | SQL diff + kết quả Select-String rỗng, `evidence/ac06.txt` | Yes |
| `AC-07` | `RQ-05` | Sau `prisma generate`, client Prisma hợp lệ | `npx prisma generate` exit 0 ; `npx tsc --noEmit` exit 0 | stdout + mã thoát, `evidence/ac07.txt` | Yes |
| `AC-08` | `RQ-05` | Schema hợp lệ hoàn toàn | `npx prisma validate` exit 0 | stdout, `evidence/ac08.txt` | Yes |
| `AC-09` | `RQ-06` | Hàng rào công khai không đổi: `public-card-truth` 23/23 tests vẫn PASS | `npm run test:unit -- public-card-truth` | test output, `evidence/ac09.txt` | Yes |
| `AC-10` | `RQ-06` | Tập stage CHỈ gồm `prisma/schema.prisma`, `prisma/migrations/**`, `docs/tasks/hrp-v6-p1-job-opening-posting-split/**` | `git status --porcelain` ; `git diff --cached --name-only` — mọi path thuộc scope mục 4.1 | hai danh sách file, `evidence/ac10.txt` | Yes |

## 7. Risk và Rollback

- Đụng lane khác trên `prisma/schema.prisma`: lane `1B` (labor-profile-schema) và `1C` (restyling) cũng ghi file này. Thứ tự an toàn: Phase 1 merge theo thứ tự 1A → 1B; điểm nhập lại là commit SHA ghi trong HANDOFF.
- Hàng rào đóng băng: nếu test `public-card-truth` FAIL sau STEP-02, Tier 2 phải REVERT schema changes ngay, KHÔNG push.
- Rollback task THÊM-thuần và CHƯA áp live: bỏ stage + xoá file migration mới; không dữ liệu sống nào bị đụng.

## 8. Open Questions

- Backfill opening/posting từ dữ liệu sống: là slice riêng cần đồng bộ idempotent; KHÔNG nằm trong hợp đồng này (hàng cũ để `jobOpeningId` NULL).
- Không gian slug đổi và redirect cũ→mới: V6-DEC-030, việc PHASE 3.
- Repoint bề mặt công khai sang `JobPosting`: V6-DEC-031, việc PHASE 3.

## 9. Planner Resolution

Phát hành `v1.0` ngày 06/09. R1 Tier 2 execution hoàn thành (commit baseline 4758809 → 2026-09-08); BLOCKED vì TASK.md thiếu sections 3-10. Tier 1 tự fix sections 3-10 ngày 08/09. Hợp đồng này giao qua roadmap `docs/V6/v6-roadmap.html` (thẻ Phase 1).

## 10. Revision Log

| Spec | Ngày | Thay đổi | Ghi chú |
|------|------|----------|---------|
| `v1.0` | `2026-09-06` | Phát hành hợp đồng V6 Phase 1: hai model `JobOpening` / `JobPosting` THÊM-thuần + móc `StaffingOrderSlot.jobOpeningId` | Mới, chưa audit; nguồn quyết định `docs/V6/v6-admin-rebuild.md` mục 11 |
| `v1.1` | `2026-09-08` | Tier 1 tự hoàn thiện sections 3-10 (Decisions, Contract, Execution Plan, Acceptance, Risk, Open Questions, Planner Resolution, Revision Log) để unlock Tier 3 audit | Fix BLK-01 từ R1 Tier 2; bump spec v1.1 |
