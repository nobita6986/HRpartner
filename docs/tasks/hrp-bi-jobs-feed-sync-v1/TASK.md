# TASK — `hrp-bi-jobs-feed-sync-v1`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-bi-jobs-feed-sync-v1` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `CUSTOM` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Audit reason | Đồng bộ tự động feed việc làm công khai từ BI (`https://bi.hrpartner.vn/feeds/jobs.v1.json`) vào chuỗi `ClientCompany → Project → StaffingOrder → StaffingOrderSlot → JobOpening → JobPosting` dưới RLS và chuẩn hóa biểu mẫu 4 phần trên Admin. |
| Spec version | `v1.0` |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` |
| Baseline | `67b1e3948bffc071f3860cc2ee8562869308fd3e` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/domains/integrations/bi/**`, `app/api/cron/bi-jobs-feed/**`, `app/api/admin/jobs/bi-feed-sync/**`, `app/admin/jobs/job-postings/**`, `deploy/vps-production/**`, `docs/integrations/bi/**`, `docs/tasks/hrp-bi-jobs-feed-sync-v1/**` |
| Forbidden paths | `src/domains/job-board/public.service.ts` (giữ nguyên static fence `publicSelect`), `app/(jobs)/viec-lam/[slug]/page.tsx` (giữ nguyên static fence `public-detail.static.test.ts`), `src/domains/crm/project-read.service.ts` |
| Required gates | `npm run typecheck` · `npm run lint` · `npm run test:unit` · `npm run build` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver → /audit → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

- Toàn bộ tin tuyển dụng đang `PUBLISHED` trên `https://bi.hrpartner.vn/feeds/jobs.v1.json` (hiện tại 18 tin) được đồng bộ và đăng công khai ngay lên `vieclammienbac.com.vn/viec-lam` với đầy đủ 4 phần theo mẫu chuẩn **Phiếu yêu cầu tuyển dụng dự án** (`1. Thông tin chung dự án`, `2. Yêu cầu ứng viên`, `3. Chế độ lương, thưởng, phúc lợi`, `4. Hồ sơ ứng viên cần chuẩn bị`).
- Hệ thống tự động quét làm mới `https://bi.hrpartner.vn/feeds/jobs.v1.json` định kỳ **30 phút/lần** trên VPS HRP (`hrp-bi-jobs-feed.timer`), đồng thời có nút **"Đồng bộ tin từ BI ngay"** trên trang `/admin/jobs/job-postings` cho `ADMIN` và `HR_MANAGER`.
- Khi tin trên BI tăng `version` thì HRP tự động cập nhật nội dung; khi tin trên BI bị gỡ (`WITHDRAWN`, biến mất khỏi `jobs[]`) thì HRP tự động chuyển `JobPosting` sang `ARCHIVED` và đóng `JobOpening`/`StaffingOrder` tương ứng mà vẫn bảo toàn mọi hồ sơ ứng tuyển (`CandidateSubmission`) đã nộp.
- Trang soạn tin `/admin/jobs/job-postings/[id]` có bộ công cụ **Biểu mẫu chuẩn 4 phần (Phiếu yêu cầu tuyển dụng dự án)** giúp HR/Admin nhập liệu theo đúng cấu trúc chuẩn của BI và sinh ra tiêu đề, mức lương hiển thị cùng 4 trường Tiptap JSON (`contentSchemaVersion = 1`) đồng nhất 100%.

### 1.2 Non-goals

- Không sửa đổi `publicSelect` trong `src/domains/job-board/public.service.ts` hay giao diện `app/(jobs)/viec-lam/[slug]/page.tsx`.
- Không ghi ngược dữ liệu tin tuyển dụng từ HRP sang BI.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/integrations/bi/BI-HRP-JOB-POSTING-CONTRACT.md:1` | Nguồn dữ liệu chuẩn (`https://bi.hrpartner.vn/feeds/jobs.v1.json`, `schema_version: 1`, `jobs[]`) gồm 4 nhóm trường `location`, `general`, `candidate`, `compensation`, `documents`. |
| `EV-02` | `src/domains/job-board/public.service.ts:772` và `src/domains/job-board/public-select.static.test.ts:1` | Public job board yêu cầu chuỗi `ClientCompany → Project (ACTIVE, isPublic=true) → StaffingOrder (OPEN) → StaffingOrderSlot → JobOpening (OPEN) → JobPosting (PUBLISHED)` và khóa cứng `publicSelect`. |
| `EV-03` | `src/domains/job-board/public.service.ts:1043` và `src/domains/job-board/public-listing.labels.ts:107` | Bộ lọc khoảng lương (`5-10`, `10-15` triệu) chia `StaffingOrderSlot.hourlyRateVnd` cho `1_000_000`, trong khi thẻ việc ưu tiên hiển thị `JobPosting.salaryDisplay`. |
| `EV-04` | `src/shared/content/job-posting-rich-text/profile.ts:1` | Trình render Tiptap v1 chỉ cho phép các node `doc, paragraph, text, heading (2|3), bulletList, orderedList, listItem` và mark `bold, italic, link`. |
| `EV-05` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx:572` | Trình soạn thảo JobPosting hiện chỉ có 4 ô rich-text tự do, cần bổ sung trợ lý nhập theo mẫu chuẩn 4 phần. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Chuẩn hóa 100% cấu trúc tin tuyển dụng theo 4 phần của **Phiếu yêu cầu tuyển dụng dự án** (`location` + `general`, `candidate`, `compensation`, `documents`) và biên dịch sang 4 trường Tiptap JSON chuẩn (`descriptionJson`, `requirementsJson`, `benefitsJson`, `applicationInstructionsJson`, `contentSchemaVersion = 1`). | `CHOSEN` |
| `DEC-02` | Quy tắc sắp xếp & đối soát vào DB HRP: (1) `ClientCompany` khớp theo tên chuẩn hóa hoặc mã `BICC-{hash12}`; (2) `Project` gộp theo `(ClientCompany, industrial_park_code)` (`BIPRJ-{park}-{hash8}`) hoặc tái sử dụng `Project` đã có của cùng khách hàng tại cùng KCN để dùng chung với luồng đồng bộ dự án/chấm công từ BI Catalog; (3) Mỗi `brief_id` ánh xạ 1-1 với `StaffingOrder` (`code = BIFEED-{brief_id}`) → `StaffingOrderSlot` → `JobOpening` (`OPEN`) → `JobPosting` (`PUBLISHED`). | `CHOSEN` |
| `DEC-03` | Ghi `JobPosting.salaryDisplay` theo thu nhập bình quân/lương cơ bản (ví dụ `9.000.000 – 12.000.000 ₫/tháng (LCB: 4.300.000 ₫)`) và gán `StaffingOrderSlot.hourlyRateVnd = BigInt(average_income_max_vnd ?? average_income_min_vnd ?? base_salary_vnd)` để bộ lọc mức lương theo tháng và danh sách "Việc làm lương cao nhất" hoạt động chính xác. | `CHOSEN` |
| `DEC-04` | Quét định kỳ 30 phút/lần bằng `hrp-bi-jobs-feed.timer` gọi `POST /api/cron/bi-jobs-feed` (`verifyCronSecret`). Chạy dưới `withSystemDb(prisma, SYSTEM_CRON)` kèm Postgres transaction advisory lock. Fail-closed khi lỗi mạng/schema (không bao giờ lưu trữ nhầm tin đang đăng). | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | `fetch`, `Prisma`, `validateAndSanitizeJobPostingRichText` nội bộ đã có | `N/A` | N/A | N/A | N/A | Không thêm dependency mới; tái sử dụng toàn bộ primitive sẵn có trong repo. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Quét feed việc làm BI 30 phút/lần | systemd timer trên VPS HRP | `CUSTOM` | systemd timer trên VPS HRP | Timer gọi `POST /api/cron/bi-jobs-feed` với `x-cron-secret`; mọi quyền RLS, đối soát domain và lưu trạng thái thuộc HRP. | Advisory lock chống chồng lượt; idempotent theo `(brief_id, version)`; fail-closed khi nguồn lỗi. | Trạng thái lưu trong `PayrollConfig` (`bi_jobs_feed_sync_state_v1`), `AuditLog`, và hiển thị trực tiếp trên `/admin/jobs/job-postings`. | `CUSTOM_AUTOMATION_JUSTIFICATION`: Owner yêu cầu quét định kỳ 30 phút/lần trực tiếp trên hạ tầng VPS HRP hiện hữu. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Xây dựng `src/domains/integrations/bi/bi-jobs-feed-contract.ts` và `bi-jobs-feed-mapper.ts`: xác thực chặt payload `RecruitmentPostPublicFeedV1` (`schema_version === 1`, `jobs[]`) và biên dịch 4 phần (`location` + `general`, `candidate`, `compensation`, `documents`) sang `title`, `salaryDisplay`, `StaffingOrderSlot` metadata và 4 trường Tiptap JSON hợp lệ (`validateAndSanitizeJobPostingRichText`). |
| `RQ-02` | Xây dựng `src/domains/integrations/bi/bi-jobs-feed.service.ts`: tải feed `https://bi.hrpartner.vn/feeds/jobs.v1.json`, đồng bộ idempotent dưới `withSystemDb(prisma, SYSTEM_CRON)` và advisory lock vào chuỗi `ClientCompany → Project → StaffingOrder → StaffingOrderSlot → JobOpening → JobPosting`; tự động lưu trữ (`ARCHIVED`) các tin `BIFEED-*` đã rút khỏi feed; ghi nhận trạng thái lần đồng bộ gần nhất. |
| `RQ-03` | Tạo route `GET/POST /api/cron/bi-jobs-feed` (bảo vệ bằng `verifyCronSecret`) và `GET/POST /api/admin/jobs/bi-feed-sync` (cho `ADMIN`, `HR_MANAGER`). |
| `RQ-04` | Tích hợp bảng điều khiển **"Đồng bộ tin tuyển dụng từ BI Feed"** trên `/admin/jobs/job-postings` và bộ công cụ **"Nhập theo Phiếu yêu cầu tuyển dụng chuẩn (4 phần)"** trong `/admin/jobs/job-postings/[id]/editor-shell.tsx`. |
| `RQ-05` | Cung cấp systemd unit `deploy/vps-production/hrp-bi-jobs-feed.{service,timer}` (chu kỳ 30 phút/lần) và cập nhật tài liệu hợp đồng `docs/integrations/bi/BI-HRP-JOB-POSTING-CONTRACT.md`. |

### 4.2 Scope boundaries

- **In:** Toàn bộ đường dẫn trong `In-scope roots`.
- **Out:** Không chạm `src/domains/job-board/public.service.ts` và `app/(jobs)/viec-lam/[slug]/page.tsx`.
- **Allowed task artifacts:** `docs/tasks/hrp-bi-jobs-feed-sync-v1/**`

### 4.3 Domain boundaries

- **Data/state:** Mọi thao tác đồng bộ chạy trong `withSystemDb(prisma, SYSTEM_CRON)`. Không xóa cứng `JobPosting`, `JobOpening`, `StaffingOrder` hay `CandidateSubmission`.
- **Permission/security:** Cron route xác thực qua `verifyCronSecret`; Admin route chỉ cho phép `ADMIN` và `HR_MANAGER`.
- **Interface/API:** Tương thích 100% với luồng hiển thị `/viec-lam`, `/viec-lam/[slug]` và nộp hồ sơ `/api/public/jobs/[slug]/applications`.
- **Migration/rollback:** Không yêu cầu migration schema DB; có thể bật/tắt timer hoặc gỡ tin bất kỳ lúc nào.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/integrations/bi/**` | Xây dựng contract validator, mapper 4 phần → Tiptap JSON v1 và service đồng bộ DB (`RQ-01`, `RQ-02`) | `npm run test:unit` | Lỗi validate Tiptap schema v1 |
| `STEP-02` | `app/api/cron/bi-jobs-feed/**`, `app/api/admin/jobs/bi-feed-sync/**` | Tạo cron endpoint và admin trigger endpoint (`RQ-03`) | Unit tests cho cron/admin routes | — |
| `STEP-03` | `app/admin/jobs/job-postings/**`, `deploy/vps-production/**` | Thêm nút đồng bộ BI trên trang danh sách, biểu mẫu chuẩn 4 phần trong editor, và systemd timer 30 phút/lần (`RQ-04`, `RQ-05`) | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build` | — |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Mapper chuyển đổi chính xác toàn bộ 18 tin thực tế từ `https://bi.hrpartner.vn/feeds/jobs.v1.json` sang `title`, `salaryDisplay`, `StaffingOrderSlot` và 4 trường Tiptap JSON đạt chuẩn `validateAndSanitizeJobPostingRichText` | `npm run test:unit` (`bi-jobs-feed-mapper.test.ts`) |
| `AC-02` | `syncBiJobsPublicFeed` tạo mới khi chưa có, skip khi `version` không đổi, cập nhật khi `version` tăng, chuyển `ARCHIVED` khi `brief_id` rút khỏi feed, và fail-closed khi nguồn lỗi | `npm run test:unit` (`bi-jobs-feed.service.test.ts`) |
| `AC-03` | Route `/api/cron/bi-jobs-feed` chặn request thiếu/sai `x-cron-secret` và thực thi đồng bộ khi hợp lệ; route `/api/admin/jobs/bi-feed-sync` kiểm tra đúng RBAC (`ADMIN`, `HR_MANAGER`) | `npm run test:unit` (`bi-jobs-feed.route.test.ts`) |
| `AC-04` | Toàn bộ canonical gates (`typecheck`, `lint`, `test:unit`, `build`) chạy xanh và các static fence (`public-select.static.test.ts`, `public-detail.static.test.ts`) giữ nguyên 100% | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-04` |
| `RQ-02` | `STEP-01` | `AC-02`, `AC-04` |
| `RQ-03` | `STEP-02` | `AC-03`, `AC-04` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-03` | `AC-04` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Feed BI tạm thời lỗi mạng khiến các tin đang đăng bị gỡ nhầm | Chỉ thực hiện bước đối soát `ARCHIVED` khi fetch HTTP `200` và `parseBiJobsPublicFeedV1` thành công hợp lệ. |
| `RISK-02` | Nhiều phiếu tuyển dụng của cùng 1 nhà máy tại cùng 1 KCN tạo trùng `Project` | Hàm đối soát `Project` tìm theo mã `BIPRJ-{park}-{hash8}` hoặc theo `(clientCompanyId, siteAddress/industrial_park_name)` để gom chung dưới 1 `Project`. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-11-12` | Khởi tạo task đồng bộ feed việc làm BI 30 phút/lần và chuẩn hóa biểu mẫu 4 phần | Thực thi yêu cầu của Owner ngày 2026-11-12 |
