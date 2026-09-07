# TASK — hrp-v6-p1-job-opening-posting-split

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-v6-p1-job-opening-posting-split` |
| Work type | `SCHEMA` |
| Audit mode | `SCHEMA_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Baseline | `main @ 4758809` — schema.prisma chưa có `JobOpening` / `JobPosting`; xác nhận bằng `git grep -nE "model (JobOpening|JobPosting)" -- prisma/schema.prisma` trả rỗng |
| Current execution round | `0` |
| Current audit round | `0` |
| Updated | `2026-09-06 11:20 Asia/Bangkok` |
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
