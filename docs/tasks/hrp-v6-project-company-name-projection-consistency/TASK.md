# TASK — HRP V6 Project `clientCompanyName` Projection Consistency

**Ngày:** 11/09/2026
**Tier:** 1
**Lane:** STANDARD
**Audit:** NONE
**Trạng thái:** IMPLEMENTATION IN PROGRESS

## Mục tiêu

Đảm bảo `Project.clientCompanyName` là denormalized read projection nhất quán với `ClientCompany.name`. Projection phải rebuild được và không được chỉnh sửa độc lập trong UI.

## Bối cảnh

- `ClientCompany.name` là canonical authority (N2)
- `Project.clientCompanyName` là public read projection để vượt giới hạn RLS của MKT role
- Migration `20260911001_project_company_name_denorm` đã tạo cột và backfill
- `scripts/seed-public-jobs.mjs` và `prisma/seed-extra-jobs.sql` đúng khi upsert PRJ-2026-*
- **3 write path CHƯA sync:**
  1. `POST /api/projects` — tạo project mới KHÔNG điền `clientCompanyName`
  2. `PUT /api/projects/[id]` — đổi `clientCompanyId` KHÔNG cập nhật `clientCompanyName`
  3. `PUT /api/clients/[id]` — đổi `ClientCompany.name` KHÔNG propagate tới các `Project` liên quan

## Phạm vi

### Đúng làm
1. Khi tạo Project → derive `clientCompanyName` từ `ClientCompany.name` (cùng transaction)
2. Khi đổi `clientCompanyId` trên Project → cập nhật projection theo `ClientCompany` mới
3. Khi đổi `ClientCompany.name` → cập nhật projection của mọi `Project` có `clientCompanyId` đó
4. KHÔNG nhận `clientCompanyName` trực tiếp từ request body
5. Giữ public fallback an toàn cho legacy row (null → dùng `project.name`)

### Không làm
- Không đổi schema
- Không đổi permission/role
- Không tạo migration mới
- Không biến projection thành authority của JobPosting hoặc V7
- Không chạy ghi DB khi `DATABASE_URL_ADMIN` chưa hợp lệ

---

## Implementation Steps

### Step 1: Fix `POST /api/projects` — derive on create

**File:** `app/api/projects/route.ts`

Trước khi `tx.project.create`, fetch `ClientCompany.name` bằng `clientCompanyId`, rồi điền `clientCompanyName` vào data. Nếu `ClientCompany` không tồn tại → vẫn tạo project (FK constraint sẽ reject sau nếu cần), nhưng `clientCompanyName` = null.

### Step 2: Fix `PUT /api/projects/[id]` — sync on client change

**File:** `app/api/projects/[id]/route.ts`

Khi `clientCompanyId` thay đổi, fetch tên từ `ClientCompany` mới và cập nhật `clientCompanyName` trong cùng transaction.

### Step 3: Fix `PUT /api/clients/[id]` — propagate on rename

**File:** `app/api/clients/[id]/route.ts`

Khi `name` thay đổi, cập nhật `clientCompanyName` của mọi `Project` có `clientCompanyId = id` trong cùng transaction.

### Step 4: Update `prisma/seed.mjs`

Khi upsert Project, lookup `ClientCompany.name` và set `clientCompanyName`.

### Step 5: Thêm unit tests

File mới: `src/domains/job-board/client-company-projection.test.ts`

Test cases:
1. Tạo Project → `clientCompanyName` được derive đúng từ `ClientCompany`
2. Đổi `clientCompanyId` → `clientCompanyName` cập nhật theo
3. Đổi `ClientCompany.name` → mọi `Project` liên quan cập nhật
4. Request body không thể spoof `clientCompanyName` (bị strip)
5. Legacy row null → fallback hoạt động

---

## File Changes Summary

| File | Change |
|---|---|
| `app/api/projects/route.ts` | Derive `clientCompanyName` on create |
| `app/api/projects/[id]/route.ts` | Sync `clientCompanyName` when `clientCompanyId` changes |
| `app/api/clients/[id]/route.ts` | Propagate `ClientCompany.name` rename to related Projects |
| `prisma/seed.mjs` | Set `clientCompanyName` when upserting Projects |
| `src/domains/job-board/client-company-projection.test.ts` | New unit tests |
| `docs/tasks/hrp-v6-project-company-name-projection-consistency/TASK.md` | This file |

---

## Gate

- `npx prisma validate` — PASS
- `npx tsc --noEmit` — PASS
- Unit tests — PASS
- Không chạy lint/build vì chỉ thay đổi backend logic nhỏ

---

## Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 11/09/2026 | Tier 1 | Initial task |
