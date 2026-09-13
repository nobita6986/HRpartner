# hrp-v6-admin-v2-jobposting-editor-shell — vòng độc lập, READ-ONLY

## 1. Bối cảnh

Tier 0 quyết định 13/09/2026 09:20: **hoãn Stage 3 N1 trên `hrp_mp2_test`** (chờ Owner/OP cấp 4 biến qua kênh bảo mật). Không hủy gate. Không áp migration N1 lên hrp-live. Không mở N1 intake writer hay AV6 CMS.

Tier 1 tiếp tục lộ trình V6 với **AV2 JobPosting editor shell** như phần việc độc lập, không schema/migration, không API ghi mới, không publish.

## 2. Khảo sát code (trước khi chốt phạm vi)

- `prisma/schema.prisma:469-485` — `JobPosting` chỉ có `id, jobOpeningId, slug, revision, status, publishedAt, archivedAt, createdAt, updatedAt`. CHƯA có field editorial (title/body/salary/requirements).
- `prisma/schema.prisma:447-465` — `JobOpening` chỉ có `id, staffingOrderId, staffingOrderSlotId, status, openedAt, closedAt, createdAt, updatedAt`.
- `prisma/schema.prisma:356-393` — `Project` (cũ) có `name, code, siteAddress, isPublic`. Public detail hiện đọc qua `Project` ở `src/domains/job-board/public.service.ts:705` (`getPublicJobDetail`).
- `src/domains/job-board/fixtures/detail-sections.fixture.ts` — section content (introduction, requirements, salary, support, apply instructions, footer banner) đang là fixture cứng, KHÔNG có persistence.
- `app/api/admin/job-opening-status/route.ts` — API đếm `JobOpening` theo 4 status (V6 Phase 1). Đây là API JobOpening duy nhất, READ-ONLY.
- KHÔNG có API ghi JobPosting / section content. KHÔNG có UI editor cho JobPosting.
- `app/admin/jobs/page.tsx` đang hiển thị Project (cũ), không phải JobPosting/JobOpening.

## 3. Phạm vi đã chốt

| Hạng mục | Có | Ghi chú |
|---|---|---|
| Service đọc JobPosting + JobOpening liên kết | ✅ `src/domains/staffing/job-posting-list.service.ts` | Read-only, Prisma, DTO serialize Date → ISO. `listJobPostingsForAdmin` (list + filter status + pagination) + `getJobPostingForAdmin` (detail + FK resolve) |
| Page list view | ✅ `app/admin/jobs/job-postings/page.tsx` | Server Component, filter status + pagination, cùng VIEWER_ROLES với `/api/admin/job-opening-status` |
| Page detail view | ✅ `app/admin/jobs/job-postings/[id]/page.tsx` | Server Component, preview pane render bằng component UI04d + fixture DEMO |
| Link từ Admin Jobs | ✅ `app/admin/jobs/page.tsx` | 1 link nhỏ "AV2 — Soạn JobPosting (bản nháp)" |
| Unit test cho service | ✅ `src/domains/staffing/job-posting-list.service.test.ts` | 18 test cases (12 list + 6 detail): clamp take, default, status filter, Date serialize, orphan, Prisma throw bubble-up, id-empty guard |
| Nút Lưu bản nháp | ❌ | CHƯA có API ghi (instruction: không mở API ghi mới) |
| Nút Publish JobPosting | ❌ | CHỜ contract N3 |
| Section content REAL (thay vì DEMO) | ❌ | CHỜ AV2 backend + AV6 CMS |
| Gallery media thật | ❌ | CHỜ AV4 integration |
| Schema/migration mới | ❌ | Instruction: không thêm |

## 4. Gates

| Gate | Trạng thái | Bằng chứng |
|---|---|---|
| `npx tsc --noEmit` | ✅ PASS | không output lỗi |
| `vitest run src/domains/staffing/job-posting-list.service.test.ts` | ✅ 18/18 PASS | (built-in log) |
| `vitest run src/shared/ui/design-tokens.static.test.ts` | ✅ 12/12 PASS | (carry-forward, scan các token var(--…) trong source mới) |
| `vitest run src/domains/staffing/` + `src/domains/job-board/` | ✅ 223/223 PASS | 14 file suite: job-opening-status 5/5, job-opening-status-card 2/2, public-board-architecture 17/17, detail-sections-policy 34/34, … |
| `npx eslint` (5 file liên quan) | ✅ 0 errors, 22 warnings | tất cả warning là `any` trong mock theo pattern cũ (`job-opening-status.test.ts` cũng vậy) |

## 5. Tính năng dùng được

- `/admin/jobs/job-postings` — xem danh sách JobPosting (slug, status, revision, JobOpening liên kết, thời gian cập nhật). Filter theo status DRAFT|PUBLISHED|ARCHIVED, phân trang 25/trang.
- `/admin/jobs/job-postings/[id]` — xem metadata JobPosting + JobOpening (staffing order code, status JobOpening, openedAt/closedAt) + preview bản nháp render bằng component UI04d đã có (introduction, salary/benefits, support, requirements, apply instructions, footer banner).
- Link "Mở trang public ↗" mở `/viec-lam/[slug]` trong tab mới.

## 6. Phần bị khóa (ghi rõ trong UI)

1. **Lưu section content** (giới thiệu, yêu cầu, lương, hỗ trợ, hướng dẫn ứng tuyển, footer banner) → chờ AV2 backend (Postgres persistence + API ghi).
2. **Publish JobPosting** (DRAFT → PUBLISHED) → chờ contract N3.
3. **Section content thật (REAL)** thay vì fixture DEMO → chờ AV2 backend + AV6 CMS.
4. **Gallery media** (chỗ attach ảnh) → chờ AV4 Media Library integration với JobPosting owner.
5. **Sửa slug / revision** → chờ AV2 backend (xử lý `@@unique([slug])` + idempotency).

## 7. Tính đúng đắn của việc "preview dùng fixture DEMO"

Có chủ ý: editor shell vòng này là reader, không có persistence. Render fixture để Admin/Sale THẤY được "khi publish thì giao diện sẽ ra sao" — dùng cùng component UI04d đã có. Khi AV2 backend sẵn sàng, panel này sẽ đọc section content từ DB và có nút Lưu (chưa có).

Banner trong UI ghi rõ: "Preview dùng fixture DEMO. Section content của JobPosting chưa có persistence ở vòng này — render bằng các fixture đã chốt ở UI04d D.A để Admin/Sale thấy được hình dáng khi publish. Khi AV2 backend sẵn sàng, panel này sẽ đọc section content từ DB và có nút Lưu."

## 8. Audit & decision log

- **Audit theo rủi ro**: scope chỉ đọc, đã có gate `job-opening-status` tham chiếu; không cần Tier 3 LIGHT audit (chỉ Tier 0 duyệt push).
- **Không mở sub-agent song song**: task đơn giản (2 page + 1 service + 1 test), không có phần độc lập nào cần sub-agent.
- **Không mở TASK.md scope rộng**: vòng này chỉ là 4 file, handoff đã đủ trong TASK.md + PLANNER §0.

## 9. Không chạm

- Stage 3 N1 evidence prep (commit 03fecc2 trên origin/main) — vẫn on, không touch.
- AV6 CMS — defer (cùng schema/migration luồng với N1).
- N1 intake writer — defer (chờ N1 deploy).
- Migration N1 lên hrp-live — KHÔNG chạy (Tier 0/Owner quyết).
- API ghi mới cho JobPosting/section content — KHÔNG mở.

## 10. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 0.1 | 13/09/2026 09:35 | DRAFT — code + test xong; chờ Tier 0 duyệt push |
