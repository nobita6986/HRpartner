# HANDOFF — `hrp-bi-jobs-feed-sync-v1`

## 1. Summary

Triển khai đồng bộ tự động feed việc làm công khai của BI (`https://bi.hrpartner.vn/feeds/jobs.v1.json`) sang HRP theo chu kỳ 30 phút/lần và chuẩn hóa biểu mẫu đăng tin 4 phần theo đúng **Phiếu yêu cầu tuyển dụng dự án** (`location` + `general`, `candidate`, `compensation`, `documents`).

## 2. Files Changed

- `src/domains/integrations/bi/bi-jobs-feed-contract.ts`: Định nghĩa type và trình kiểm tra nghiêm ngặt `parseBiJobsPublicFeedV1` khớp 100% với `RecruitmentPostPublicFeedV1` của `mini-bi`.
- `src/domains/integrations/bi/bi-jobs-feed-mapper.ts`: Bộ biên dịch thuần khiết (`compileStandardBriefToJobPosting`) chuyển đổi 4 phần của Phiếu yêu cầu tuyển dụng dự án sang `title`, `salaryDisplay`, metadata `StaffingOrderSlot` (`workLocation`, `shiftStart`, `shiftEnd`, `slotsNeeded`, `hourlyRateVnd` theo mức thu nhập tháng để bộ lọc lương hoạt động chuẩn) và 4 tài liệu Tiptap JSON v1 (`descriptionJson`, `requirementsJson`, `benefitsJson`, `applicationInstructionsJson`).
- `src/domains/integrations/bi/bi-jobs-feed.service.ts`: Dịch vụ `syncBiJobsPublicFeed` chạy dưới `withSystemDb(prisma, SYSTEM_CRON)` kèm Postgres transaction advisory lock (`pg_try_advisory_xact_lock(20261112, 1)`), đối soát chuỗi `ClientCompany → Project → StaffingOrder (BIFEED-{brief_id}) → StaffingOrderSlot → JobOpening (OPEN) → JobPosting (PUBLISHED)`, tự động lưu trữ (`ARCHIVED`) các tin đã rút khỏi feed và ghi nhận trạng thái đồng bộ vào `PayrollConfig` (`bi_jobs_feed_sync_state_v1`) + `AuditLog`.
- `app/api/cron/bi-jobs-feed/route.ts`: Endpoint `GET/POST /api/cron/bi-jobs-feed` bảo vệ bởi `verifyCronSecret`.
- `app/api/admin/jobs/bi-feed-sync/route.ts`: Endpoint `GET/POST /api/admin/jobs/bi-feed-sync` cho `ADMIN` và `HR_MANAGER`.
- `app/admin/jobs/job-postings/bi-feed-sync-panel.tsx` & `app/admin/jobs/job-postings/page.tsx`: Bảng trạng thái đồng bộ BI Feed và nút **"Đồng bộ tin từ BI ngay"** trên trang quản trị danh sách tin tuyển dụng.
- `app/admin/jobs/job-postings/[id]/standard-brief-assistant.tsx` & `app/admin/jobs/job-postings/[id]/editor-shell.tsx`: Biểu mẫu chuẩn 4 phần (**Phiếu yêu cầu tuyển dụng dự án**) tích hợp ngay trong trình soạn thảo tin tuyển dụng.
- `deploy/vps-production/hrp-bi-jobs-feed.{service,timer}`: Cấu hình systemd timer quét định kỳ 30 phút/lần trên VPS HRP.
- `docs/integrations/bi/BI-HRP-JOB-POSTING-CONTRACT.md`: Tài liệu hợp đồng v2.0 mô tả chi tiết chuẩn 4 phần và cơ chế sắp xếp dữ liệu dự án – việc làm.

## 3. Verification Evidence

- Unit tests: `src/domains/integrations/bi/__tests__/bi-jobs-feed-mapper.test.ts`, `src/domains/integrations/bi/__tests__/bi-jobs-feed.service.test.ts` — PASS.
- Static fences: `src/domains/job-board/public-select.static.test.ts`, `src/domains/job-board/public-detail.static.test.ts` — PASS.
