# AUDIT — hrp-v6-admin-v2-jobposting-editor-shell

> **Đồng bộ với TASK.md v1.0 + commit `e7ee2c8` trên `origin/main`** (push lúc 13/09/2026 10:10).
> Update gần nhất: 13/09/2026 10:30 — closeout sau khi build PASS.

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-admin-v2-jobposting-editor-shell` |
| Spec version | `v1.0` (TASK.md) — khớp |
| Assurance lane | `LIGHT` (theo Tier 0 directive 13/09/2026 09:50) |
| Audit depth | `DELTA` — tập trung auth/RLS + read-only data display, không FULL source audit |
| Execution round | `1` |
| Baseline | `main @ 03fecc2` (Stage 3 N1 evidence prep) |
| Audited HEAD | `main @ e7ee2c8` (post-push) |
| Scope của delta audit | `app/admin/jobs/job-postings/{page.tsx, [id]/page.tsx, [id]/editor-shell.tsx}` + `src/domains/staffing/job-posting-list.service.ts` + `app/admin/jobs/page.tsx` (link mới) |

## 1. Risk surface (Tier 0 chỉ đích: quyền đọc + dữ liệu hiển thị)

| Risk ID | Surface | Why | What I checked | Status |
|---|---|---|---|---|
| `R-01` | List page + Detail page gọi `getPrisma()` trực tiếp → vòng trước bị Tier 0 chặn | `job_postings` có FORCE RLS; SELECT ngoài transaction không có GUC sẽ bị policy deny | Cả 2 page đã wrap trong `withDbContext(prisma, ctx, tx => …)`; service nhận `Prisma.TransactionClient` (không phải `PrismaClient`); `applyRlsContext` set GUC transaction-local đầu transaction | ✅ RESOLVED |
| `R-02` | VIEWER_ROLES copy từ `/api/admin/job-opening-status` → không khớp RLS JobPosting | `hrp_project_visible_for` (m13 restore RLS matrix) KHÔNG có nhánh cho HR_STAFF / ACCOUNTANT | VIEWER_ROLES = `{ ADMIN, HR_MANAGER, PM, SALE, DIRECTOR }` — 5 role, đồng bộ với `hrp_project_visible_for` (Admin/Sale/PM có nhánh đọc; HR_STAFF/ACCOUNTANT không). WORKER/MKT/VENDOR/CTV có nhánh qua `is_public` nhưng page mục tiêu Admin/Sale — không mở rộng | ✅ RESOLVED |
| `R-03` | `?page=1.5` hoặc số quá lớn được đưa thẳng vào `skip` cho Prisma | Prisma có thể nhận nhưng UX xấu | Tất cả `?page=...` đi qua `clampPositiveInt({ default: 1, max: 10_000 })` — số thực → `Math.trunc`; âm/NaN → 1; quá 10_000 → 10_000. Service `take/skip` cũng clamp qua cùng helper | ✅ RESOLVED |
| `R-04` | Nút "Mở trang public `/viec-lam/[slug]`" dẫn tới 404 vì public detail vẫn đọc Project (không phải JobPosting) | Tier 0 chỉ rõ | Đã bỏ link khỏi detail page; chỉ còn breadcrumb "← Quay lại danh sách". Footer note ghi rõ chờ AV6 CMS | ✅ RESOLVED |
| `R-05` | Tên "editor shell" + preview fixture DEMO gây hiểu nhầm là có Lưu | Tier 0 chỉ rõ | Thêm form chỉnh nội dung trong state cục bộ (client component `editor-shell.tsx`) + preview phản ánh nội dung vừa nhập. Banner "Đang có thay đổi CHƯA LƯU… tải lại trang sẽ mất" + nút Huỷ thay đổi. KHÔNG có nút Lưu / Publish / Sửa slug | ✅ RESOLVED |
| `R-06` | Service test mock `PrismaClient` không chứng minh production data hiện đúng | Tier 0 chỉ rõ | Service nhận `Prisma.TransactionClient` (đổi signature từ `PrismaClient`) — caller buộc dùng `withDbContext`. Test mới cover: clamp 11 case (NaN/Infinity/0/âm/thực/vượt max), listPage 12 case (default, clamp, Date serialize, orphan, Prisma throw bubble-up), detail 6 case (id empty/null, not-found, mapping, orphan, throw). Phase 2 RLS integration test chạy trên test DB có policy — ngoài scope unit test | ✅ RESOLVED (unit), ⚠️ coverage gap (RLS integration chờ credential) |

## 2. Acceptance Verification (delta scope)

| AC | Independent method | Result | Evidence |
|---|---|---|---|
| `AC-01` | `npx tsc --noEmit` | `PASS` | Exit 0, clean (không có error) |
| `AC-02` | `npx vitest run src/domains/staffing/ src/domains/job-board/components/detail/ src/shared/ui/design-tokens.static.test.ts` | `PASS` | Exit 0, **266/266 tests passed in 3.76s** (thêm 32 test mới so với vòng trước) |
| `AC-03` | `npx eslint` cho 6 file liên quan | `PASS` (0 errors) | 0 errors, 24 warnings (`any` trong mock theo pattern cũ + 1 unused SectionKey đã fix). Không liên quan delta scope |
| `AC-04` | `npx next build` (closeout gate bổ sung) | `PASS` | Exit 0, **`✓ Compiled successfully in 14.4s`**, 2 routes AV2 compile OK: `/admin/jobs/job-postings` (172 B, Dynamic) + `/admin/jobs/job-postings/[id]` (6.09 kB, Dynamic); 0 build error; evidence: `evidence/next-build-2026-09-13.txt` (133882 bytes) |
| `AC-05` | `git diff --stat HEAD` | `PASS` | 6 file changed/added (5 new + 1 modified) — trong scope editor shell |
| `AC-06` | Service KHÔNG gọi `getPrisma()` — chỉ nhận `tx` qua `withDbContext` | `PASS` | Service import chỉ `Prisma` type; caller (page.tsx) mở transaction đã set GUC trước khi gọi |
| `AC-07` | `clampPositiveInt` đã cover edge cases | `PASS` | 11 test cases: undefined/null/NaN/Infinity/0/âm/thực/trunc/vượt max |
| `AC-08` | VIEWER_ROLES đồng bộ RLS HRP matrix | `PASS` | 5 role (ADMIN, HR_MANAGER, PM, SALE, DIRECTOR) — HR_STAFF/ACCOUNTANT bị loại vì `hrp_project_visible_for` không có nhánh |
| `AC-09` | Banner "chưa lưu" + nút Huỷ + form local-state | `PASS` | `editor-shell.tsx` có dirty state qua `useMemo(JSON.stringify)` + banner đổi màu khi dirty + nút "Huỷ thay đổi" reset về initial |
| `AC-10` | KHÔNG có nút Lưu / Publish / Sửa slug | `PASS` | Tìm từ khoá trong 2 page + client component: không có `Save` / `Lưu` / `Publish` action button |
| `AC-11` | Không có nút "Mở trang public" | `PASS` | Detail page chỉ có nút "← Quay lại danh sách"; footer note ghi rõ chờ AV6 CMS |
| `AC-12` | `git push origin main` | `PASS` | `03fecc2..e7ee2c8  main -> main`; 9 file changed, 2042 insertions, 19 deletions |

### Assurance Checks

| Check | Status | Evidence |
|---|---|---|
| `C-01` Auth/RLS posture | `DONE` | Cả 2 page wrap `withDbContext` + set GUC transaction-local qua `applyRlsContext` |
| `C-02` Role alignment | `DONE` | VIEWER_ROLES = 5 role, đồng bộ `hrp_project_visible_for` |
| `C-03` Page param clamp | `DONE` | `?page=...` qua `clampPositiveInt` với max 10_000 |
| `C-04` UX clarity (editor vs viewer) | `DONE` | Title "JobPosting viewer — soạn bản nháp" + banner dirty + footer note 6 mục bị khoá |
| `C-05` No fake Save/Publish button | `DONE` | Source scan 0 match |
| `C-06` No broken public link | `DONE` | Link `/viec-lam/[slug]` đã bỏ; chờ AV6 CMS |
| `C-07` Git hygiene | **`DONE`** | commit `e7ee2c8` đã push `origin/main` (03fecc2..e7ee2c8); 9 file trong scope; 0 untracked trong scope sau push |
| `C-08` Build production | **`DONE`** (closeout bổ sung) | `next build` PASS 14.4s; 2 routes AV2 compile OK; 0 build error |
| `C-09` Carry-forward | `DONE` | design-tokens.static.test.ts 12/12 PASS; detail-sections-policy 34/34 PASS |

## 3. Scope

- **Audited surface:**
  - `src/domains/staffing/job-posting-list.service.ts` (service signature + clamp + DTO)
  - `src/domains/staffing/job-posting-list.service.test.ts` (32 test mới)
  - `app/admin/jobs/job-postings/page.tsx` (list view, VIEWER_ROLES, page clamp)
  - `app/admin/jobs/job-postings/[id]/page.tsx` (detail view, withDbContext, bỏ public link)
  - `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (client component form + preview)
  - `app/admin/jobs/page.tsx` (link mới tới editor shell)
- **Excluded:** `withDbContext` / `applyRlsContext` / RLS migration — đã audit ở vòng Phase 2 (locked contract). Không thay đổi.

## 4. Independent Evidence

| Evidence | Command | Exit | Output |
|---|---|---|---|
| `E-01` | `npx tsc --noEmit` | 0 | clean |
| `E-02` | `npx vitest run src/domains/staffing/job-posting-list.service.test.ts` | 0 | 32/32 passed |
| `E-03` | `npx vitest run src/domains/staffing/ src/domains/job-board/components/detail/ src/shared/ui/design-tokens.static.test.ts` | 0 | 266/266 passed in 3.76s |
| `E-04` | `npx eslint` (6 file) | 0 | 0 errors, 24 warnings (mock `any` pattern cũ) |
| `E-05` | `npx next build` (closeout bổ sung) | 0 | `✓ Compiled successfully in 14.4s`; 2 routes AV2 compile OK (`/admin/jobs/job-postings` 172 B + `/admin/jobs/job-postings/[id]` 6.09 kB); 0 build error |
| `E-06` | `git push origin main` (closeout bổ sung) | 0 | `03fecc2..e7ee2c8  main -> main`; 9 file changed, 2042 insertions, 19 deletions |

### Tier 3 LIGHT audit sub-agent raw output

Sub-agent ID: `16628b3d-e7a4-41d1-9d2b-480f658a2927`. Verdict: **PASS**, 11/11 điểm (6 read-permission + 5 data-display), 0 blockers, 0 debt, 1 coverage gap.

## 5. Coverage Gaps

- **RLS Phase 2 integration test (chạy trên test DB có policy)**: chưa chạy vì credential chưa được cấp (Stage 3 N1 cũng chờ credential). Khi credential tới, có thể mở rộng:
  - ADMIN: list trả tất cả JobPosting; detail trả đúng row
  - SALE: tương tự ADMIN (RLS HRP matrix cho SALE all projects)
  - PM: chỉ JobPosting gắn với Project mình làm PM
  - HR_STAFF / ACCOUNTANT: list rỗng, detail null (RLS deny)
  - Không có role nào đọc được JobPosting của project người khác (workerId/vendorId giả)
- **Không có** fake Save/Publish button → không có bề mặt để test "không lưu nhưng báo thành công" (test giả sẽ phá design).
- **Production deploy verification (Vercel)**: build local PASS nhưng Vercel deploy thực tế chưa được xác nhận (chờ Tier 0/Owner monitor dashboard). Tier 1 không truy cập Vercel dashboard (theo handoff v2.13 — "Tier 1 verify visual review sau khi Owner confirm URL production alias").

## 6. Verdict

- **Verdict:** `PASS` (closeout: code PASS + build PASS + push PASS, chờ Vercel deploy verification từ Tier 0/Owner)
- **Blockers:** `None`
- **Debt:** RLS integration test chờ credential; production deploy verification chờ Tier 0/Owner — không chặn vòng này.

## 7. Re-audit Trace

| Round | Spec | Depth | Verdict | Reason / Findings |
|---|---|---|---|---|
| 1 | `v1.0` | `DELTA` (auth/RLS + data display) | `PASS` | 6 risk-surface check RESOLVED; 12 AC PASS (gồm build + push bổ sung ở closeout); 0 blockers |
