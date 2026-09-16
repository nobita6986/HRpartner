# TASK: hrp-v6-admin-demand-tree (W3 Planning)

## Control
- **Spec Version:** v1.0 (Discovery & Planning)
- **Status:** PLAN_READY (Đang chờ T0 review)
- **Branch:** `tier1/admin-demand-tree`
- **Baseline:** `origin/main` (at `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`)
- **Lane:** STANDARD
- **Outcome:** Dựng cây điều hướng Admin (Client → Project → JobOpening) sử dụng W2 foundation (Breadcrumb, RelatedObjects, EmptyState, RowLink). Xác định và khóa data contract, service ownership, và RLS matrix trước khi code.
- **Required Gates:** `tsc --noEmit`, `npm run lint`, `npm run test:unit`, `npm run build`
- **Audit:** LIGHT (Bắt buộc Tier 3 độc lập do có domain read services, auth và RLS).

## Architecture Decisions & Rules
1. **Server Components:** Route detail gọi trực tiếp domain read service. Không tạo GET API /api/admin/... nếu không có consumer từ Client Component.
2. **RLS Data Fetching:** Tất cả query vào bảng `FORCE RLS` (như `client_companies`, `outsourcing_projects`, `staffing_orders`, `job_openings`) bắt buộc chạy trong `withDbContext(...)` bằng Supabase RLS để đảm bảo an toàn truy cập. KHÔNG dùng transaction raw trần thay thế.
3. **No Info Leakage (Not Found vs Not Visible):** Không coi list trả về rỗng (`total = 0`) là evidence PASS RLS cho detail page. Detail query (theo ID) bị chặn bởi RLS phải throw `NotFoundError` thay vì trả lỗi quyền truy cập, bảo đảm UI hiển thị chung màn hình 404.
4. **Boundary:** 
   - Không sửa schema, migration hay backfill.
   - Không thay đổi public job-board semantics.
   - Không tạo generic repository framework hay fetch wrapper.
   - Không tạo modal nhiều tầng (dùng URL routing của chi tiết).
   - Không sửa đổi N2 discovery artifacts hay `docs/TIER0_SHIFT_HANDOVER.md`.

## Data Contract & Route Ownership

### 1. Client Company Detail
- **Route:** `/admin/clients/[id]/page.tsx`
- **Owner Service:** `src/domains/crm/client-read.service.ts`
- **Contract:**
  - Client identity (code, name, taxCode, industry, status, etc.).
  - Projects: danh sách các Project thuộc Client (để render `RelatedObjects`).
  - Metrics: đếm số staffing orders, slots, openings và assignments (dựa trên schema relations hiện tại, gom bằng Prisma count).
- **Navigation:** Có deep-link (RowLink) từ hàng trong Client list dẫn vào trang này.

### 2. Project Detail
- **Route:** `/admin/projects/[id]/page.tsx`
- **Owner Service:** `src/domains/crm/project-read.service.ts`
- **Contract:**
  - Project identity (code, name, status, dates, etc.).
  - Parent link: Thông tin rút gọn của Client cha.
  - Relational Data:
    - StaffingOrders → slots → JobOpenings (gom hiển thị).
    - Lịch sử Assignments và Submissions.
- **Navigation:** Deep-link từ thẻ RelatedObjects (ở Client detail) hoặc từ danh sách Projects.

### 3. Job Opening Detail
- **Route:** `/admin/job-openings/[id]/page.tsx`
- **Owner Service:** `src/domains/staffing/job-opening-read.service.ts`
- **Contract:**
  - Identity & Status: Trạng thái tuyển dụng/publish hiển thị dạng text (DRAFT, OPEN, FILLED).
  - Traversal Links: Dẫn ngược lên Project / StaffingOrder / Slot (thông qua W2 Breadcrumb).
  - Preview Public: Chỉ hiển thị thẻ/link tới `job_postings` nếu có record tồn tại.
  - Relational Data: Related submissions và assignments (tuân theo quyền của viewer).

## RLS Role Matrix & Behavior

- **ADMIN / HR_MANAGER / DIRECTOR:** Đọc toàn bộ Client, Project, JobOpening (không bị cản bởi row-level predicate).
- **PM / SUB_PM:** 
  - Chỉ nhìn thấy Client / Project / JobOpening nếu Project có chứa `pm_user_id` / `sub_pm_user_id_1` / `sub_pm_user_id_2` bằng với `session.user.id`.
- **WORKER / CTV / VENDOR / ZALO:** Bị block ở gateway `withAuthScope('ADMIN')` trên UI, nên RLS cho các bảng này ở domain Admin không cần thiết lập cho các roles đó.
- **Fallback Behavior:** Bất kỳ route nào khi bị RLS từ chối truy cập (do cố ý nhập ID lạ hoặc không có quyền) thì Server Action / Service layer bắt buộc ném `NotFoundError()`, UI Next.js bắt lỗi này thành trang `not-found.tsx` chuẩn, tuyệt đối không văng exception 500 hay info-leaking `Forbidden`.

## Acceptance Criteria & Required Evidence
1. **Unit Tests:** Tập trung vào service mapping (`toDto`) và hành vi throw `not-found` khi RLS bị cản.
2. **LIVE Integration Plan:** Tối thiểu 1 bộ test tích hợp RLS matrix bằng DB thực (`test_db`), chứng minh behavior của PM/ADMIN.
3. **Quality Gates:** `Typecheck`, `lint`, `unit`, `build` phải báo `SUCCESS` tại local (và CI sau push).
4. **Browser Smoke:** Verification trên trình duyệt cho 3 detail routes và cây traversal. *(Nếu preview bảo vệ auth thì báo `NOT_RUN/ENV_BLOCKED` và xin waiver từ T0)*.
5. **Audit:** Hoàn tất báo cáo Tier 3 LIGHT Audit (AD2/AD3) trước khi finalize artifact.
