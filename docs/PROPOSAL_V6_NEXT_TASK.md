# Đề xuất task V6 tiếp theo (chờ Tier 0 duyệt trước khi mở)

> **Trạng thái:** PROPOSAL — chưa mở task. Tier 1 khảo sát theo directive Tier 0 ngày 13/09/2026 10:21.
> **Quyết định cuối thuộc Tier 0.** Khi Tier 0 chốt, mở task mới theo template chuẩn.

## 1. Ràng buộc lọc (tier 0 directive)

1. **Không schema/migration mới** — chỉ dùng model + data đã apply lên hrp-live (Phase 1 schema).
2. **Có giá trị sử dụng thực** — người dùng cuối (Admin/Sale/CTV/Worker/Vendor) dùng được, không phải màn hình DEMO.
3. **Không chạm Stage 3 N1** (chờ credential) và **AV6 CMS** (defer vì cùng schema/migration luồng).
4. **Build on top** các AV đã merge: AV1 HomepageSettings, AV2 JobPosting editor shell, AV4 Media Library.
5. **Tận dụng** được RLS Phase 2 (đã có policy cho `job_openings`, `job_postings`, `project_assignments`, `candidate_submissions`, `tickets`, …).

## 2. Top recommendation

### `hrp-v6-admin-overview-dashboard` — Dashboard tổng quan bằng số liệu thật

| Thuộc tính | Chi tiết |
|---|---|
| **Slug** | `hrp-v6-admin-overview-dashboard` |
| **Mô tả 1 câu** | Thay `/admin` từ trang tĩnh (`app/admin/page.tsx` hiện là render link array cứng, comment rõ "số liệu thật sẽ gắn sau") thành Server Component đọc metrics thật: số JobOpening theo status, số ứng viên mới, số Worker ACTIVE, số Ticket pending, quota vs filled theo project. |
| **Model Prisma (đã có, không migration)** | `JobOpening(status)`, `CandidateSubmission(status)`, `Worker(employmentStatus)`, `Ticket(status)`, `ProjectAssignment(status)`, `StaffingOrderSlot(slotsNeeded, slotsFilled)`. |
| **RLS implication** | Đọc nhiều model đã có RLS policy: `job_openings` (qua `hrp_project_visible_for`), `candidate_submissions` (RLS), `workers` (RLS), `tickets` (RLS). **Không cần policy mới.** Service dùng `withDbContext(prisma, ctx, tx => ...)` giống pattern AV2 v2. |
| **API + page** | Page mới `app/admin/page.tsx` (sửa từ static → dynamic Server Component). Service mới `src/domains/admin/overview-metrics.service.ts`. **Không mở API route** — Server Component đọc trực tiếp. |
| **Giá trị sử dụng thực** | **Admin/Sale dùng hàng ngày** — mở portal thấy ngay số liệu thật, không phải click từng module. Đây là pain point đã ghi rõ trong `app/admin/page.tsx` (current static comment). |
| **Độ phức tạp** | **S** — 1 service tổng hợp + 1 page Server Component; mỗi query là `count()` hoặc `groupBy()` đơn giản. Không schema, không logic nghiệp vụ mới, không scope builder mới (read-only tổng hợp dùng `withDbContext` trực tiếp). |
| **Ước lượng effort** | ~1 ngày (theo gate FAST). |

### Vì sao chọn cái này (không phải 5 ứng viên khác)

- Là việc **duy nhất** nằm trên critical path của trải nghiệm Admin — `/admin` hiện là dead page (static link array với comment "số liệu thật sẽ gắn sau").
- **Blast radius nhỏ nhất** trong 6 ứng viên — chỉ 1 service + 1 page; không cần scope builder mới; không cần RLS policy mới.
- **Tận dụng tối đa** RLS Phase 2 đã có: tất cả 6 model cần đếm đều đã có RLS policy; chỉ cần `withDbContext` (đã có helper).
- **Không che giấu việc còn thiếu**: nếu user không đăng nhập hoặc role không đủ (HR_STAFF, ACCOUNTANT không có nhánh trong `hrp_project_visible_for`), số liệu sẽ là 0 — fail-closed đúng nghĩa, không giả.
- Cho Tier 0/Owner thấy V6 đang dùng được thật trong 1-2 ngày, không cần đụng schema hay chờ N1/AV6.

### Phạm vi ngắn đề xuất (Tier 1 outline, không phải TASK.md đầy đủ)

```
RQ-01: /admin (Server Component) hiển thị 6 ô KPI cards:
  - JobOpening count theo status (DRAFT / OPEN / FILLED / CANCELLED)
  - CandidateSubmission count theo status mới nhất (SUBMITTED / SCREENING / QUALIFIED / REJECTED / CONVERTED)
  - Worker count với employmentStatus = ACTIVE
  - Ticket count với status OPEN
  - StaffingOrderSlot count: slotsFilled / slotsNeeded (tổng)
  - ProjectAssignment count với status = ACTIVE

RQ-02: Mỗi card có link tới module tương ứng (/admin/jobs, /admin/applications, /admin/workers, /admin/tickets, /admin/jobs, /admin/assignments).

RQ-03: RLS qua withDbContext — service nhận tx như AV2 v2. VIEWER_ROLES tạm thời = {ADMIN, HR_MANAGER, PM, SALE, DIRECTOR} (đồng bộ RLS HRP matrix, giống AV2 v2). HR_STAFF/ACCOUNTANT vào thì thấy 0 (fail-closed, không giả).

RQ-04: Mỗi count query qua `count({where: { ... }})` hoặc `groupBy({by: ['status'], _count: true})` — không scan toàn bảng.

RQ-05: Caching nhẹ: 5 phút revalidate (vì dashboard không cần real-time). Tier 1 dùng `export const revalidate = 300` hoặc `unstable_cache`.

AC-01: tsc --noEmit PASS
AC-02: vitest run service mới (mock tx, cover: zero count / multiple status / RLS role không đọc được → 0)
AC-03: next build PASS
AC-04: deploy verify trên Vercel (Tier 0/Owner)
AC-05: npx eslint 0 errors

Non-goals:
- Không làm chart/biểu đồ (chỉ KPI cards đơn giản)
- Không real-time update
- Không drill-down chi tiết (chỉ link tới module tương ứng)
- Không filter theo thời gian / range (giữ đơn giản vòng đầu)
```

### Các ứng viên khác (Tier 1 không khuyến nghị vòng này)

| Ứng viên | Vì sao KHÔNG chọn vòng này |
|---|---|
| `hrp-v6-job-opening-management-ui` (M) | Cần viết scope builder mới cho `JobOpening` (chưa có trong `SCOPE_REGISTRY`); blast radius rộng hơn; AV2 editor shell đã đáp ứng một phần quản lý Posting rồi |
| `hrp-v6-staffing-order-management-ui` (S) | Service đã có nhưng page cần refactor lớn; giá trị "thật" thấp hơn dashboard vì dashboard là entry point |
| `hrp-v6-admin-ticket-management` (S) | API đã có nhưng UI chỉ là bổ sung drawer/panel — không phải entry point mới |
| `hrp-v6-assignment-management-ui` (M) | Cần viết scope builder cho `ProjectAssignment`; PM/HR chỉ dùng khi cần tra cứu, không phải entry point |
| `hrp-v6-worker-management-ui` (S) | Worker page đã có sẵn (chỉ thiếu filter); cải tiến thay vì thêm mới |

## 3. Không chạm (giữ nguyên trạng)

- **Stage 3 N1 evidence prep** (commit 03fecc2 trên origin/main) — vẫn on, không touch.
- **AV6 CMS** — defer (cùng schema/migration luồng N1).
- **N1 intake writer** — defer (chờ N1 deploy).
- **Migration N1 lên hrp-live** — KHÔNG chạy (Tier 0/Owner quyết).
- **AV2 v2 ACCEPTED** — Tier 1 KHÔNG tự đánh dấu; chờ Vercel deploy verification từ Tier 0/Owner.

## 4. Khi có credential cho N1

Theo directive Tier 0: **"Khi có credential, ưu tiên quay lại Stage 3 N1."** Dashboard proposal tạm dừng, mở lại sau khi Stage 3 PASS.
