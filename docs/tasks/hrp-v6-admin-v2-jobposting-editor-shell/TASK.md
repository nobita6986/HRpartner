# hrp-v6-admin-v2-jobposting-editor-shell — vòng độc lập, READ-ONLY

> **Spec version:** `v1.0` (DRAFT) — đồng bộ với `AUDIT.md` round 1 + commit `e7ee2c8` đã push `origin/main`.
> **Status (13/09/2026 10:30):** code ACCEPTED_READY_FOR_DEPLOY — gates PASS, Tier 3 LIGHT audit round 1 PASS, build PASS (`next build` 14.4s, 2 routes compile OK), push `e7ee2c8` đã lên `origin/main`. Chờ Tier 0/Owner xác nhận Vercel deploy xong để chốt `ACCEPTED`.

## 1. Bối cảnh

Tier 0 quyết định 13/09/2026 09:20: **hoãn Stage 3 N1 trên `hrp_mp2_test`** (chờ Owner/OP cấp credential qua kênh bảo mật). Không hủy gate. Không áp migration N1 lên hrp-live. Không mở N1 intake writer hay AV6 CMS.

Tier 0 directive 13/09/2026 09:50: **sửa 5 mục của AV2 v1 trước khi phát hành** — wrap read path vào `withDbContext` (RLS), đồng bộ VIEWER_ROLES với `hrp_project_visible_for`, bỏ nút public link, thêm form editor shell thật, clamp `?page=` thành số nguyên dương có giới hạn.

Tier 1 tiếp tục lộ trình V6 với **AV2 JobPosting editor shell v2** như phần việc độc lập, không schema/migration, không API ghi mới, không publish.

## 2. Khảo sát code (trước khi chốt phạm vi)

- `prisma/schema.prisma:469-485` — `JobPosting` chỉ có `id, jobOpeningId, slug, revision, status, publishedAt, archivedAt, createdAt, updatedAt`. CHƯA có field editorial (title/body/salary/requirements).
- `prisma/schema.prisma:447-465` — `JobOpening` chỉ có `id, staffingOrderId, staffingOrderSlotId, status, openedAt, closedAt, createdAt, updatedAt`.
- `prisma/schema.prisma:356-393` — `Project` (cũ) có `name, code, siteAddress, isPublic`. Public detail hiện đọc qua `Project` ở `src/domains/job-board/public.service.ts:705` (`getPublicJobDetail`).
- `prisma/migrations/20260908001_job_opening_posting_split/migration.sql:99-100` — `job_postings` có `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`. SELECT policy `job_postings_select` gọi `hrp_project_visible_for`.
- `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql:6-12` — `hrp_project_visible_for` cho phép: ADMIN/HR_MANAGER/DIRECTOR/SALE (all projects); PM (chỉ projects làm PM); WORKER/MKT/VENDOR/CTV (chỉ `is_public`). **HR_STAFF và ACCOUNTANT không có nhánh → RLS deny.**
- `src/shared/auth/with-db-context.ts:39-42` — helper `withDbContext(prisma, ctx, tx => ...)` set GUC transaction-local qua `applyRlsContext`.
- `src/shared/auth/scopes/index.ts:40-66` — `SCOPE_REGISTRY` chỉ có 19 model; `JobPosting` KHÔNG có builder → L1 `withAuthScope` sẽ throw `DENY_BY_DEFAULT` cho non-root. L2 RLS ở DB là line of defense duy nhất.
- `src/domains/job-board/fixtures/detail-sections.fixture.ts` — section content (introduction, requirements, salary, support, apply instructions, footer banner) đang là fixture cứng, KHÔNG có persistence.
- `app/api/admin/job-opening-status/route.ts` — API đếm `JobOpening` theo 4 status (V6 Phase 1). Đây là API JobOpening duy nhất, READ-ONLY.
- KHÔNG có API ghi JobPosting / section content. KHÔNG có UI editor cho JobPosting (trước v2).
- `app/admin/jobs/page.tsx` đang hiển thị Project (cũ), không phải JobPosting/JobOpening.

## 3. Phạm vi đã chốt (v2)

| Hạng mục | Có | Ghi chú |
|---|---|---|
| Service đọc JobPosting + JobOpening liên kết (read-only) | ✅ `src/domains/staffing/job-posting-list.service.ts` | Nhận `Prisma.TransactionClient` (BẮT BUỘC qua `withDbContext`). DTO serialize Date → ISO. `listJobPostingsForAdmin` (list + filter status + pagination) + `getJobPostingForAdmin` (detail + FK resolve). `clampPositiveInt` export tiện ích (default + max) |
| Page list view (Server Component) | ✅ `app/admin/jobs/job-postings/page.tsx` | `getServerSession` → `withDbContext` → `listJobPostingsForAdmin`. VIEWER_ROLES = `{ADMIN, HR_MANAGER, PM, SALE, DIRECTOR}` đồng bộ RLS HRP matrix. `?page=` clamp về số nguyên dương ≤ 10_000 qua `clampPositiveInt` |
| Page detail view (Server Component) | ✅ `app/admin/jobs/job-postings/[id]/page.tsx` | `withDbContext` → `getJobPostingForAdmin`. Render 8 fact: slug, revision, status, createdAt, updatedAt, publishedAt, archivedAt, JobOpening FK |
| Editor shell (Client Component) | ✅ `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | Form chỉnh 5 section content (intro/requirements/compensation/support/apply-instructions/footer-banner) trong `useState`. Preview phản ánh nội dung vừa nhập qua component UI04d đã có. Banner "Đang có thay đổi CHƯA LƯU — tải lại trang sẽ mất" + nút Huỷ. **KHÔNG** có nút Lưu / Publish / Sửa slug |
| Link từ Admin Jobs | ✅ `app/admin/jobs/page.tsx` | 1 link nhỏ "AV2 — Soạn JobPosting (bản nháp)" |
| Unit test cho service | ✅ `src/domains/staffing/job-posting-list.service.test.ts` | **32 test mới** (11 clampPositiveInt + 12 listJobPostingsForAdmin + 6 getJobPostingForAdmin + 3 misc): clamp NaN/Infinity/0/âm/thực/vượt max; listPage default/clamp/Date/ orphan/throw bubble-up; detail id-empty/null guard/Date mapping/Prisma throw |
| Nút Lưu bản nháp | ❌ | CHƯA có API ghi (instruction: không mở API ghi mới) |
| Nút Publish JobPosting | ❌ | CHỜ contract N3 |
| Section content REAL (thay vì DEMO) | ❌ | CHỜ AV2 backend + AV6 CMS |
| Gallery media thật | ❌ | CHỜ AV4 integration |
| Sửa slug / revision | ❌ | CHỜ AV2 backend |
| Nút "Mở trang public /viec-lam/[slug]" | ❌ (bỏ) | Trang public vẫn tra Project, chưa gắn JobPosting — sẽ khôi phục khi ánh xạ JobPosting.slug → Project.code hợp lệ (chờ AV6) |
| Schema/migration mới | ❌ | Instruction: không thêm |

## 4. Gates

| Gate | Trạng thái | Bằng chứng |
|---|---|---|
| `npx tsc --noEmit` | ✅ PASS | không output lỗi |
| `vitest run src/domains/staffing/job-posting-list.service.test.ts` | ✅ **32/32 PASS** | (built-in log) |
| `vitest run src/shared/ui/design-tokens.static.test.ts` | ✅ 12/12 PASS | (carry-forward, scan các token `var(--…)` trong source mới) |
| `vitest run src/domains/staffing/` + `src/domains/job-board/components/detail/` | ✅ **266/266 PASS** | 15 file suite trong 3.76s (thêm 32 test mới so với v1 18 test) |
| `npx eslint` (6 file liên quan) | ✅ 0 errors, 24 warnings | tất cả warning là `any` trong mock theo pattern cũ (`job-opening-status.test.ts` cũng vậy) |
| **`npx next build`** | ✅ **PASS** | `✓ Compiled successfully in 14.4s`; 2 route AV2 compile OK: `/admin/jobs/job-postings` (172 B, Dynamic) + `/admin/jobs/job-postings/[id]` (6.09 kB, Dynamic); 0 build error; evidence: `evidence/next-build-2026-09-13.txt` (133882 bytes) |
| Tier 3 LIGHT audit round 1 | ✅ **PASS** | sub-agent `16628b3d-e7a4-41d1-9d2b-480f658a2927`; 11/11 điểm PASS (6 read permission + 5 data display); AUDIT.md verdict PASS, 0 blockers, 0 debt, 1 coverage gap |
| `git push origin main` | ✅ PASS | `03fecc2..e7ee2c8  main -> main` (9 file changed, 2042 insertions, 19 deletions) |

## 5. Tính năng dùng được

- `/admin/jobs/job-postings` — xem danh sách JobPosting (slug, status, revision, JobOpening liên kết, thời gian cập nhật). Filter theo status DRAFT|PUBLISHED|ARCHIVED, phân trang 25/trang, `?page=` clamp về `[1, 10000]`. Phân quyền theo 5 role ở trên.
- `/admin/jobs/job-postings/[id]` — xem metadata JobPosting (8 fact) + JobOpening (FK) + **editor shell thật**: 5 form chỉnh nội dung (intro/requirements/compensation/support/apply-instructions/footer-banner) với preview trực tiếp. Banner "chưa lưu" rõ ràng, KHÔNG có nút Lưu/Publish.
- Bỏ link "Mở trang public ↗" (đã giải thích ở §3).

## 6. Phần bị khóa (ghi rõ trong UI)

1. **Lưu section content** (giới thiệu, yêu cầu, lương, hỗ trợ, hướng dẫn ứng tuyển, footer banner) → chờ AV2 backend (Postgres persistence + API ghi).
2. **Publish JobPosting** (DRAFT → PUBLISHED) → chờ contract N3.
3. **Section content thật (REAL)** thay vì fixture DEMO → chờ AV2 backend + AV6 CMS.
4. **Gallery media** (chỗ attach ảnh) → chờ AV4 Media Library integration với JobPosting owner.
5. **Sửa slug / revision** → chờ AV2 backend (xử lý `@@unique([slug])` + idempotency).
6. **Mở JobPosting ở trang public** `/viec-lam/[slug]` → trang public vẫn tra Project, chưa gắn JobPosting. Sẽ khôi phục khi ánh xạ JobPosting.slug → Project.code hợp lệ (chờ AV6 CMS).

## 7. Tính đúng đắn của editor shell

Editor shell là client component (`editor-shell.tsx`) có form local-state (React `useState`) + preview phản ánh nội dung vừa nhập qua đúng component UI04d (`ContentSection` / `BenefitsSection` / `SupportSection` / `FooterBannerSection`). Khi dirty (qua `useMemo(JSON.stringify(draft) !== JSON.stringify(initialDraft()))`), banner đổi sang đỏ + hiện nút "Huỷ thay đổi" reset về `initialDraft()`. KHÔNG có nút Lưu / Publish / Sửa slug — bám sát instruction Tier 0 "không mở API ghi mới".

## 8. Audit & decision log

- **Tier 3 LIGHT audit round 1** (sub-agent `16628b3d-e7a4-41d1-9d2b-480f658a2927`): 11/11 PASS. Đọc đầy đủ 6 file trong scope + 4 file reference (helper DB + RLS migration + scopes). Verdict PASS, 0 blockers, 0 debt, 1 coverage gap (RLS integration test chờ credential).
- **Không mở sub-agent song song**: task đơn giản (2 page + 1 service + 1 test + 1 client component).
- **TASK.md update round 2**: đồng bộ spec version + số test + role + UX shell — sau push, không audit lại (instruction Tier 0: "không cần audit lại nếu chỉ sửa tài liệu").

## 9. Không chạm

- Stage 3 N1 evidence prep (commit 03fecc2 trên origin/main) — vẫn on, không touch.
- AV6 CMS — defer (cùng schema/migration luồng với N1).
- N1 intake writer — defer (chờ N1 deploy).
- Migration N1 lên hrp-live — KHÔNG chạy (Tier 0/Owner quyết).
- API ghi mới cho JobPosting/section content — KHÔNG mở.

## 10. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 0.1 | 13/09/2026 09:35 | DRAFT v1 — code + test xong; chờ Tier 0 duyệt push |
| 1.0 | 13/09/2026 10:30 | **CLOSEOUT** — đồng bộ spec theo commit `e7ee2c8`: bump v0.1→v1.0; số test 18→32; VIEWER_ROLES cũ (HR_STAFF, ACCOUNTANT) → đồng bộ RLS HRP matrix (5 role); editor shell v2 (form local-state + preview + banner "chưa lưu"); bỏ nút public link; clamp `?page=`; thêm gate `next build` PASS (14.4s) + Tier 3 LIGHT audit PASS; push `origin/main` 03fecc2→e7ee2c8 |
