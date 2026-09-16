# TASK: hrp-v6-admin-demand-tree (W3 Planning)

## Control
- **Spec Version:** v1.1 (Discovery & Planning)
- **Status:** PLAN_READY (Đang chờ T0 review)
- **Branch:** `tier1/admin-demand-tree`
- **Baseline:** `origin/main` (at `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`)
- **Lane:** STANDARD
- **Outcome:** Dựng cây điều hướng Admin (Client → Project → JobOpening) sử dụng W2 foundation (Breadcrumb, RelatedObjects, EmptyState, RowLink). Xác định và khóa data contract, service ownership, và RLS matrix trước khi code.
- **Required Gates:** `tsc --noEmit`, `npm run lint`, `npm run test:unit`, `npm run build`
- **Audit:** LIGHT (Bắt buộc Tier 3 độc lập do có domain read services, auth và RLS). Tiêu chí: Tier 3 audit artifact chỉ do Tier 3 sở hữu.

## Architecture Decisions & Rules
1. **Service Integration & Interfaces:**
   - Server Components gọi domain read service trực tiếp. KHÔNG tạo GET API `/api/admin/...` nếu không có consumer thật ngoài Server Component.
   - Service interfaces phải nhận `Prisma.TransactionClient` (ví dụ `tx`) và `viewer` (ví dụ `AuthContext`), trả về Data Transfer Object (DTO) hoặc `null` (cho missing / invisible).
   - DTO phải được chuẩn hóa: `Date` serialize thành ISO string/timestamp rõ ràng, `BigInt` serialize thành string.
   - Service KHÔNG tự lấy global Prisma instance, KHÔNG tự mở nested transaction.
   - Route chịu trách nhiệm gọi `notFound()` từ Next.js nếu service trả về `null`. KHÔNG dùng exception tự chế để mô tả việc không tìm thấy hay bị từ chối truy cập do RLS.
2. **Auth & RLS Terminology:**
   - **Route Layer:** Có nhiệm vụ lấy `AuthContext`, kiểm tra role được phép vào Admin Demand Tree (xem phần "UI Audience"), sau đó gọi `withDbContext`. `withAuthScope` KHÔNG phải gateway nhận role dạng `withAuthScope('ADMIN')`, nó là Prisma extension nhận `AuthContext`.
   - **DB Layer:** Postgres dùng `FORCE ROW LEVEL SECURITY` và lọc row bằng `app.user_id`/`app.role` thông qua transaction-local GUC.
3. **No Info Leakage (Not Found vs Not Visible):**
   - Không coi `total = 0` là evidence PASS RLS cho chi tiết. Service trả `null` khi ID không tồn tại HOẶC bị RLS cản (hoặc service-level guard cản), và Route gọi `notFound()`. Không phân biệt missing ID và invisible ID.
4. **W3 UI Audience (Locked):**
   - Pilot này CHỈ cho phép các roles: `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `PM`.
   - Không claim hỗ trợ cho `HR_STAFF`, `WORKER`, `CTV`, VENDOR (`VENDOR_ADMIN`, `VENDOR_STAFF`) hoặc `MKT` trong W3 này. 
   - Role `PM` chỉ có quyền truy cập khi họ là `pmUserId`, `subPmUserId1`, hoặc `subPmUserId2` của Project liên quan.

## Data Contract & Route Ownership

### 1. Client Company Detail (`app/admin/clients/[id]/page.tsx`)
- **Owner Service:** `src/domains/crm/client-read.service.ts`
- **Interface:** `getClientDetail(tx: Prisma.TransactionClient, viewer: AuthContext, id: string): Promise<ClientDetailDto | null>`
- **Contract:**
  - Client identity (code, name, taxCode, industry, status).
  - Projects: danh sách rút gọn các Project thuộc Client (để render `RelatedObjects`).
  - Đếm: Count orders, slots, openings, assignments dựa trên schema hiện tại.
- **Service-level RLS Guard:** DB policy hiện cho phép role PM đọc TOÀN BỘ `client_companies`. W3 không sửa DB policy, do đó service phải bổ sung guard bằng code: PM chỉ nhận Client detail nếu Client có ít nhất một Project mà `hrp_project_visible_for(project.id) = true` trong cùng `withDbContext` transaction. Nếu không, service trả `null`.

### 2. Project Detail (`app/admin/projects/[id]/page.tsx`)
- **Owner Service:** `src/domains/crm/project-read.service.ts`
- **Interface:** `getProjectDetail(tx: Prisma.TransactionClient, id: string): Promise<ProjectDetailDto | null>`
- **Contract:**
  - Project identity (code, name, status, dates).
  - Client parent link.
  - StaffingOrders → slots → JobOpenings (dùng `RelatedObjects`).
  - Assignments và Submissions.

### 3. Job Opening Detail (`app/admin/job-openings/[id]/page.tsx`)
- **Owner Service:** `src/domains/staffing/job-opening-read.service.ts`
- **Interface:** `getJobOpeningDetail(tx: Prisma.TransactionClient, id: string): Promise<JobOpeningDetailDto | null>`
- **Contract:**
  - Identity & Status: Trạng thái tuyển dụng bằng text (`DRAFT | OPEN | FILLED | CANCELLED`).
  - Admin JobPosting detail (Navigation link): Khóa chính xác route `/admin/jobs/job-postings/[posting.id]`. Link này chỉ xuất hiện nếu có route mapping thật tới record đủ điều kiện publish. Không gọi là "Public Preview".
  - Traversal: JobOpening → associated `StaffingOrderSlot` rows → `CandidateSubmission` / `ProjectAssignment`. Nếu gom cả `staffingOrderSlot` (trực tiếp) và `slots` (mảng), bắt buộc deduplicate bằng ID.

## File Ownership (Locked)
Phải tuân thủ các file dự kiến tạo/sửa:
1. **Detail Routes:** 
   - `app/admin/clients/[id]/page.tsx`
   - `app/admin/projects/[id]/page.tsx`
   - `app/admin/job-openings/[id]/page.tsx`
2. **Read Services & Unit Tests:** 
   - `src/domains/crm/client-read.service.ts` & test
   - `src/domains/crm/project-read.service.ts` & test
   - `src/domains/staffing/job-opening-read.service.ts` & test
3. **List Pages / W2 Foundations:**
   - Thêm RowLink vào Client list: `app/admin/clients/page.tsx`
   - Thêm RowLink vào Project list: `app/admin/projects/page.tsx`
4. **Integration & Docs:**
   - Integration test: `src/domains/crm/admin-demand-tree.integration.test.ts` (hoặc tên tương đương)
   - `docs/tasks/hrp-v6-admin-demand-tree/HANDOFF.md`

## RLS Acceptance Matrix (Integration Test Plan)
Bài test tích hợp bằng DB thật (không mock) phải bao phủ tối thiểu:
1. `ADMIN` → thấy mọi fixture (trả về chi tiết hợp lệ).
2. `DIRECTOR` → thấy mọi fixture.
3. assigned `PM` → thấy project/client/opening liên quan trực tiếp đến mình.
4. `sub-PM 1` và `sub-PM 2` → thấy project liên quan.
5. unrelated `PM` → nhận `null` (UI sẽ 404).
6. PM nhập Client ID nhưng client đó không có project nào visible với PM → nhận `null` (UI sẽ 404, xác minh Client Guard).
7. missing ID → nhận `null` (UI sẽ 404, không phân biệt với invisible).
8. missing GUC/context (lỗi runtime) → fail closed.
*(Note: `total = 0` từ array relation không được coi là RLS evidence cho chi tiết)*.

## Acceptance Criteria & Required Evidence
1. **Unit Tests:** Kiểm tra DTO serialization (Date/BigInt), mapping logics, traversal logic.
2. **LIVE Integration Test:** Thực thi RLS Acceptance Matrix bằng test_db.
3. **Quality Gates:** `Typecheck`, `lint`, `unit`, `build` phải báo `SUCCESS` tại local (và CI).
4. **Browser Smoke:** Verification trên trình duyệt cho 3 detail routes và cây traversal (bao gồm fallback 404 khi missing ID / role block). Nếu preview bảo vệ auth thì báo `NOT_RUN/ENV_BLOCKED`.
