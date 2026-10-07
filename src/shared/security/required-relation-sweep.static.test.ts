/**
 * required-relation-sweep.static.test.ts — hrp-v5-go-live-17 / RQ-01..RQ-05 / DEC-01..DEC-09.
 *
 * Đóng `F-05` của `hrp-v5-hotfix-02`: *"quét mọi service khác đang select quan hệ KHÔNG nullable
 * trên bảng bị RLS che"*. Lớp lỗi nằm trong QUERY ENGINE của Prisma, không nằm trong mã JS: select
 * một quan hệ bắt buộc trên bảng mà principal hiện tại không đọc được thì `findMany` ném
 * `Inconsistent query result` TRƯỚC khi mapper chạy — nên optional-chaining trong mapper vô hiệu, và
 * `mockResolvedValue` trên `findMany` KHÔNG BAO GIỜ tái lập được (`EV-07`: sự cố `500` gốc chạy song
 * song với `1418` test xanh).
 *
 * Điểm mù mà tệp này sửa (`EV-04`): hàng rào có sẵn ở `src/domains/job-board/public-select.static.test.ts`
 * ghim CỨNG đúng một tệp nguồn và một allowlist năm khoá — nó liệt kê cái tác giả nó VỪA THÊM, không
 * liệt kê cái nó BẢO VỆ, đúng lớp lỗi `TEXT_PAIRS` của `go-live-08`. Vì vậy tệp này KHÔNG ghim một
 * danh sách bảng hay một danh sách trường nào (`DEC-02`): nó TỰ SUY tập nguy hiểm từ
 * `prisma/migrations/**` cộng `prisma/schema.prisma` ngay lúc chạy, rồi quét cả `src/` và `app/`. Thêm
 * một migration bật RLS, hoặc thêm một vị trí select mới ở bất kỳ tệp nào, đều làm tệp này ĐỎ mà không
 * ai phải nhớ cập nhật một mảng literal.
 *
 * Ba mệnh đề ĐẾM ĐƯỢC:
 *   1. tập bảng bật RLS suy từ migration có ít nhất `34` phần tử;
 *   2. tập trường quan hệ BẮT BUỘC trỏ vào các bảng ấy có ít nhất `21` phần tử;
 *   3. tập vị trí select các trường ấy trong cây nguồn KHỚP CHÍNH XÁC tập ĐÓNG `TÁM` dòng còn lại
 *      sau `STEP-06` — tức mười hai dòng của `DEC-04` TRỪ bốn dòng đã sửa.
 *
 * Tệp này là tệp THỨ HAI (`DEC-01`): `public-select.static.test.ts` không đổi một byte, vì nó còn mang
 * hai assertion của `go-live-14` (`EV-05`). Nó nằm dưới `src/` vì lane unit không thu `app/**` (`EV-08`),
 * dù nó ĐỌC các tệp dưới `app/`. Nó không đọc một `DATABASE_URL` nào (`EV-09`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = 'prisma/migrations';
const SCHEMA_PATH = 'prisma/schema.prisma';
const SCAN_ROOTS = ['src', 'app'] as const;
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

/**
 * Sàn chống rỗng, KHÔNG phải danh sách (`DEC-02`). Ba con số này là ngưỡng của `AC-03`; danh sách bảng
 * và danh sách trường thì tuyệt đối không được dán vào đây, nếu không hàng rào lại mù với migration kế.
 */
const MIN_RLS_TABLES = 34;
const MIN_DANGER_FIELDS = 21;
const MIN_DANGER_MODELS = 20;
const MIN_SCANNED_FILES = 200;

/** Số dòng nhìn lại để xác nhận một khoá đang nằm trong một object `include:`/`select:`. */
const CONTEXT_LOOKBACK = 25;

/**
 * Tập vị trí KỲ VỌNG, và chỉ là kỳ vọng — nó ĐỐI CHIẾU với kết quả quét, nó không THAY cho phép quét.
 * Đây là chỗ khác nhau giữa "ghim cứng" và "khẳng định": tập bảng cùng tập trường vẫn do mã tự suy;
 * riêng tập vị trí thì `RQ-03` đòi khớp CHÍNH XÁC, nên từng dòng phải viết ra.
 *
 * `DEC-04` liệt kê MƯỜI HAI dòng — đó là ảnh chụp TRƯỚC `STEP-06`. Phép phân loại của `STEP-05`
 * (`evidence/s05-policy-classification.txt`) kết luận `8` AN TOÀN và `4` RỦI RO; `STEP-06` sửa đúng bốn
 * dòng RỦI RO theo `DEC-05`, nên bốn dòng ấy KHÔNG còn là một select quan hệ nữa và biến khỏi tập quét:
 *
 *   - `src/domains/reconciliation/margin.service.ts:167 worker`      (đã sửa, `DEC-05`)
 *   - `src/domains/reconciliation/statement.service.ts:403 worker`   (đã sửa, `DEC-05`)
 *   - `src/domains/reconciliation/statement.service.ts:434 worker`   (đã sửa, `DEC-05`)
 *   - `src/domains/staffing/submission.service.ts:248 worker`        (đã sửa, `DEC-05`)
 *
 * TÁM dòng dưới đây là tám vị trí AN TOÀN — chúng CÒN LẠI có chủ ý, không phải sót: `AC-08` đỏ nếu một
 * vị trí AN TOÀN bị sửa. Con số tám không được suy ra bằng phép trừ trên giấy: nó là số ĐO của lượt
 * chạy trong `evidence/s07-barrier-red.txt`, nơi hàng rào tự liệt kê đúng bốn dòng đã mất.
 *
 * 2026-09-13 fix (sửa AV4 UUID→TEXT): AV2 commit `e7ee2c8` (13/09/2026) đã thêm bốn select quan hệ
 * tới `JobOpening` và `StaffingOrder` trong `src/domains/staffing/job-posting-list.service.ts` (dòng 125,
 * 128, 191, 199). Cả hai bảng đều RLS-enabled từ `20260908001_job_opening_posting_split` (V6 Phase 0)
 * và quan hệ là AN TOÀN (read-only admin list/detail, RLS đã cover). EXPECTED_HITS mở rộng từ tám lên
 * mười hai dòng; hai nhánh `app/api` (`3`) và `src/domains/staffing/order.service.ts` + submission
 * service không đổi — tổng còn 5 + 3 + 4 = 12.
 */
const EXPECTED_HITS = [
  'app/api/projects/route.ts:55 clientCompany',
  'app/api/vendor/orders/route.ts:44 project',
  'app/api/vendor/submissions/route.ts:62 project',
  'src/domains/applications/application-queue.service.ts:183 project',
  'src/domains/applications/application-queue.service.ts:216 project',
  // AFF-04 STEP-02: re-read canonical ReferralAttribution via LaborProfile on
  // conversion (server-derived referrer resolution). laborProfile is nullable
  // in schema, but the SELECT shape surfaces it in the RLS sweep.
  // hrp-t1c-intake-worker-link (2026-10-05): line shifted 128 -> 130 because
  // `linkLaborProfileWorker` helper was inserted between `convertApplication`
  // and `findDedupCandidates`, adding two comment lines above the AFF-04
  // select block. Sweep target is unchanged.
  'src/domains/applications/conversion.service.ts:130 laborProfile',
  'src/domains/crm/client-read.service.ts:80 staffingOrder',
  'src/domains/crm/project-read.service.ts:40 clientCompany',
  // T1A PRE-P2 PROJECT MANAGEMENT HOTFIX (2026-10-06): `getProjectForManagement`
  // thêm `clientCompany` select (mirror pattern của `getProjectDetail`) để
  // render tên khách hàng trên header trang quản trị. Line shift từ
  // original `40` (đã có ở getProjectDetail) sang `152` (vị trí mới trong
  // getProjectForManagement, sau khi bổ sung `isPublic` select field). Quan
  // hệ BẮT BUỘC trong schema `Project` — sweep đếm là đúng, an toàn vì RLS
  // `hrp_client_company_visible_for` đã lọc theo role khi đi qua
  // `withDbContext` (ADMIN/HR_MANAGER/HR_STAFF/PM đều thoả).
  'src/domains/crm/project-read.service.ts:152 clientCompany',
  // P1-A0.5 STEP-10 (hrp-p1-a0-5-job-opening-readiness): additive DTO fields
  // (`serviceModel`, `placementCount`, order status/deadline, slot validTo/capacity).
  // Line numbers shifted 41 → 86 and 46 → 94 because the new fields were added
  // between the original `staffingOrder`/`project` selects.
  'src/domains/staffing/job-opening-read.service.ts:86 staffingOrder',
  'src/domains/staffing/job-opening-read.service.ts:94 project',
  // P1-A0 STEP-04 (hrp-p1-a0-jobposting-authoring-publish): publishJobPosting
  // reads the linked JobOpening to gate JobOpening.status = OPEN. RLS-covered.
  // hrp-p1-a0-1 (2026-09-26): line number shifted to 787 because updateDraftContent
  // added `isHot`/`isUrgent` branches, eligibility guard was added, and DTO mapper
  // extended.
  // hrp-f9-hr-staff-jobposting-scope (2026-10-03): F9 STEP-05 extends the
  // `include: { jobOpening: { select: { id, staffingOrderId } } }` shape on
  // FOUR write/read paths so the scoped-recruiter re-check can derive the
  // order anchor. F9 correction batch 1/1 (2026-10-03): four of these
  // paths now also call `acquireOrderAdvisoryLock` BEFORE the guard. The
  // existing `publishJobPosting` entry is preserved; four new entries are
  // added. All five selects are RLS-covered (read-only; `withDbContext`
  // sets the GUC session role; JobOpening is not a recruiter-gated table
  // on its own).
  // hrp-t1c-jobposting-media-youtube (2026-10-05): updateDraftContent +
  // YouTube ID validator (`assertYouTubeVideoId`) + DTO `youtubeVideoId`
  // mapping + `JobPostingModelRow` extension shifted the four F9 lines
  // further: 1007 → 1070, 1119 → 1192, 1246 → 1319, 1315 → 1388. The
  // 5th entry (getJobPostingForAuthoring) is now at 1461 (was 1388).
  'src/domains/staffing/job-posting-authoring.service.ts:1070 jobOpening',
  'src/domains/staffing/job-posting-authoring.service.ts:1192 jobOpening',
  'src/domains/staffing/job-posting-authoring.service.ts:1319 jobOpening',
  'src/domains/staffing/job-posting-authoring.service.ts:1388 jobOpening',
  'src/domains/staffing/job-posting-authoring.service.ts:1461 jobOpening',
  // P1-A0 STEP-03: line numbers in job-posting-list.service.ts shifted because
  // the DTOs grew (added title, salaryDisplay, *Json, contentSchemaVersion,
  // hasContent). The four select-clauses themselves are unchanged.
  // hrp-p1-a0-1 (2026-09-26): line numbers shifted again because DTOs grew
  // (`isHot`, `isUrgent`) and eligibility selector was added.
  // hrp-t1c-jobposting-media-youtube (2026-10-05): `youtubeVideoId` field
  // added to both `JobPostingListItemDto` and `JobPostingDetailDto`, plus
  // `listJobPostingsForAdmin` and `getJobPostingForAdmin` mappings — line
  // numbers shift +6: 149 → 155, 152 → 158, 245 → 259, 253 → 267. The
  // select-clauses themselves are unchanged.
  'src/domains/staffing/job-posting-list.service.ts:155 jobOpening',
  'src/domains/staffing/job-posting-list.service.ts:158 staffingOrder',
  'src/domains/staffing/job-posting-list.service.ts:259 jobOpening',
  'src/domains/staffing/job-posting-list.service.ts:267 staffingOrder',
  // t1a-staffing-order-management (2026-10-05): getStaffingOrderDetail + updateStaffingOrder
  // thêm `slots.jobOpening` / `slots.neoJobOpenings` (qua include include con) để đếm
  // phụ thuộc cho UI. Line number shift từ 153/179 (cũ) do thêm 2 hàm mới.
  // CORRECTION 1/1 (2026-10-05): updateStaffingOrder + deleteStaffingOrder
  // thêm advisory lock + re-read. Hai path mới phát sinh hit sweep:
  //   - `order.service.ts:192` `getStaffingOrder` (detail) — line shift 158
  //     do thêm `acquireOrderAdvisoryLock` helper + 2 hàm mới. 158 → 192.
  //   - `order.service.ts:218` `getStaffingOrder` (detail) — line shift 184 → 218.
  //   - `order.service.ts:331` `getStaffingOrderDetail` — line shift 297 → 331.
  //   - `order.service.ts:336` `getStaffingOrderDetail` — line shift 302 → 336.
  //   - `order.service.ts:428` `updateStaffingOrder` re-read slots — line shift 387 → 428.
  //   - `order.service.ts:459` `updateStaffingOrder` re-read slots.jobOpening
  //     (thêm mới — sweep phát hiện thêm 1 hit).
  'src/domains/staffing/order.service.ts:207 project',
  'src/domains/staffing/order.service.ts:233 project',
  'src/domains/staffing/order.service.ts:346 project',
  'src/domains/staffing/order.service.ts:351 jobOpening',
  'src/domains/staffing/order.service.ts:443 jobOpening',
  'src/domains/staffing/order.service.ts:474 jobOpening',
  'src/domains/staffing/submission.service.ts:204 project',
  // AFF-04 STEP-04: re-read SourceClaim -> Worker.userId under lock for
  // self-referral classification. Worker is required in schema, so the
  // sweep flags it.
  'src/domains/staffing/transfer.service.ts:186 worker',
  // hrp-p1-a1 (2026-09-25): nguồn chuyển từ `Project` sang `JobPosting`; select bám JobOpening →
  // StaffingOrder → Project để đọc `siteAddress`/`clientCompanyName`/`staffingOrder.status`/
  // `staffingOrder.slots`. Cả hai là BẮT BUỘC trong schema (không optional, không list) — sweep phải
  // đếm. An toàn vì đã chặn trước bằng `status: 'PUBLISHED'` (JobPosting) + RLS `hrp_project_visible_for`
  // mà MKT thoả khi `Project.is_public=true` (migration s1_rls_project 2026-08-16).
  // hrp-t1c-jobposting-media-youtube (2026-10-05): added `youtubeVideoId` scalar + the
  // public DTO `gallery`/`PublicJobGalleryItemDto` interface + `toDetailDto` mapping of
  // gallery — `jobOpening.staffingOrder` / `jobOpening.staffingOrder.project` selects
  // shifted from 752/759 → 805/812. The select clauses themselves are unchanged.
  'src/domains/job-board/public.service.ts:805 staffingOrder',
  'src/domains/job-board/public.service.ts:812 project',
  // hrp-p1-e0 (2026-09-26): Recruiter Workbench read-model cần `fullName`/`phone`/`cccdNumber`/
  // `identityVerification`/`completeness` để build `RecruiterWorkbenchRow.candidate` (§4.3 RQ-02).
  // `LaborProfile` là quan hệ BẮT BUỘC trong schema `placement_case` (không optional, không list) — sweep
  // đếm là đúng. An toàn vì query chạy trong `withDbContext(... role=ADMIN | HR_MANAGER | HR_STAFF)`
  // với GUC session-scoped nên RLS `hrp_labor_profile_visible_for` đã lọc theo role/handler pool.
  // PII `phone`/`cccdNumber` được mask khi thiếu `CAN_VIEW_WORKER_SENSITIVE` (DEC-05).
  'src/domains/talent/recruiter-workbench.read-service.ts:676 laborProfile',
  // hrp-p1-e0 STEP-06 (2026-09-26): E0-F05 job context projection cần đọc
  // `placement.jobOpening.posting.title` và `placement.jobOpening.staffingOrder.project.name`/
  // `.clientCompanyName`. `JobOpening` (qua `Placement.jobOpening`) là quan hệ BẮT BUỘC trong schema
  // `placement`; `StaffingOrder` qua `JobOpening`; `Project` qua `StaffingOrder`. Cả ba quan hệ đều
  // không optional, không list, sweep đếm là đúng. RLS: `JobOpening` không có RLS riêng (đọc thoả
  // quyền `ADMIN`/`HR_MANAGER`/`HR_STAFF` theo GUC); `StaffingOrder` qua `Project` có RLS
  // `hrp_project_visible_for` nhưng MKT/HR đã thoả khi JOIN từ `placement_case` đã qua
  // `withDbContext` RLS `placement_case_visible_for`. Test integration T0 CI sẽ xác nhận.
  //
  // hrp-p1-f1 (2026-09-27): Thêm derivePlacementOptionsFromSubmissions — quét
  // `submissions.slot.jobOpening.staffingOrder.project` để phục vụ additive
  // `placementOptions`. `JobOpening` (qua `CandidateSubmission.slot`) là quan hệ
  // không optional trong schema `staffing_order_slot`. RLS JobOpening/StaffingOrder/Project
  // giống chain trên (`hrp_project_visible_for` đã thoả qua placement_case → withDbContext).
  // P1-F1 cũng thêm `status`/`serviceModelSnapshot`/`jobOpeningId` vào `placements` select
  // → line numbers của chain `placements.jobOpening.staffingOrder.project` SHIFTED.
  'src/domains/talent/recruiter-workbench.read-service.ts:706 jobOpening',
  'src/domains/talent/recruiter-workbench.read-service.ts:710 staffingOrder',
  'src/domains/talent/recruiter-workbench.read-service.ts:712 project',
  'src/domains/talent/recruiter-workbench.read-service.ts:739 jobOpening',
  'src/domains/talent/recruiter-workbench.read-service.ts:743 staffingOrder',
  'src/domains/talent/recruiter-workbench.read-service.ts:745 project',
  // hrp-p1-a04 correction batch 1/1 (2026-09-29): `listUnclaimedStaffingOrders` and
  // `listMyActiveStaffingOrders` (the SELF-CLAIM-StaffingOrder surfaces) were DROPPED
  // in favor of `claimCandidateSubmission` (candidate-side claim). The 5 prior hits
  // for these functions were removed from EXPECTED_HITS. The canonical P1-A0.4 path
  // uses `assignRecruiterToOrder` (HR_MANAGER assigns a recruiter) +
  // `claimCandidateSubmission` (assigned recruiter claims a LaborProfile / submission).
  // The latter queries `labor_profile_handling_assignments` (uncovered above — this table
  // has no RLS that targets assignment_id/recruiter as a SELECT-time filter from outside),
  // and `candidate_submissions` (which has RLS but the helper chains through service gates).
  // New danger hits introduced by this batch (necessary for the new flow, all under
  // `withDbContext(role=HR_STAFF)` after the candidate-claim gate):
  //   - claimCandidateSubmission selects submission.placementCase (379) to derive the
  //     LaborProfile anchor required for the ORDER_RECRUITER_CLAIM handling row.
  //   - listMaskedUnclaimedCandidatesForOrder chains submission → placementCase → laborProfile
  //     (617), and slot → jobOpening → staffingOrder (638), for masked projection display.
  //   - Same masked-queue WHERE filter for "not yet claimed" via placementCase.laborProfile
  //     .handlingAssignments.none (721, 722).
  //   - placement.service.ts runTransition preloads jobOpening.staffingOrderId (328) for the
  //     dual-authority assert to fire in the same tx.
  // All safe: RLS chains already cover (placement_case_visible_for, labor_profile_visible_for,
  // hrp_project_visible_for). p1-a04 prior had 25 src hits; this batch adds 6 net (28 src total).
  'src/domains/talent/recruiter-assignment.service.ts:420 placementCase',
  'src/domains/talent/recruiter-assignment.service.ts:706 laborProfile',
  'src/domains/talent/recruiter-assignment.service.ts:727 staffingOrder',
  'src/domains/talent/recruiter-assignment.service.ts:838 placementCase',
  'src/domains/talent/recruiter-assignment.service.ts:839 laborProfile',
  'src/domains/talent/placement.service.ts:334 jobOpening',
  // P1-A04 B-08 (2026-09-29): `recruiterPlacementCreate` /
  // `derivePlacementAnchors` preloads `placement.jobOpening.staffingOrderId` to
  // compute the canonical order advisory lock key for the dual-authority
  // assert. `JobOpening` is required in schema `placement` (không optional,
  // không list) — sweep đếm là đúng. Chạy trong `runRecruiterPlacementCommand`
  // → `withDbContext(role=HR_STAFF)` nên RLS chain đã lọc theo role/handler
  // pool. An toàn.
  'src/domains/talent/recruiter-placement.adapter.ts:279 jobOpening',
  // T1B — PRE-P2 HOTFIX worker management (2026-10-06): worker.service.ts
  // `getWorkerDetail` selects the linked LaborProfile (nullable) and the current
  // ProjectAssignment (list, ordered by startedAt desc) to project the
  // "Phân công dự án hiện hành" section, plus owner/assignedTo/manager user
  // refs for "Quản lý / phụ trách". LaborProfile is RLS-covered via
  // `hrp_labor_profile_visible_for` (ADMIN/HR_MANAGER row scope through
  // `withDbContext`); ProjectAssignment and User are not RLS-gated but the
  // call site already enforces the worker scope (`assignedToId` for
  // HR_STAFF, project.PM for PM, etc.) before reaching the select. PII
  // (`phone`/`cccdNumber`) is masked when caller lacks
  // `CAN_VIEW_WORKER_SENSITIVE` per `projectWorker` projection.
  // T1B-OPS PRE-P2 WORKER OPERATIONS HOTFIX (2026-10-07): line shifts 266→269,
  // 275→278, 283→286 because of pre-existing comments / line edits in
  // `getWorkerDetail`. New entry `:793 project` from `listWorkersForAdmin`
  // (ProjectAssignment.project + Project.pmUserId for the Worker list 6
  // canonical columns — currentProject, currentProjectManager). RLS-covered
  // (Project via `withDbContext` + `hrp_project_visible_for`).
  'src/domains/workforce/worker.service.ts:269 laborProfile',
  'src/domains/workforce/worker.service.ts:278 project',
  'src/domains/workforce/worker.service.ts:286 owner',
  'src/domains/workforce/worker.service.ts:793 project',
  // T1B-OPS PRE-P2 WORKER OPERATIONS HOTFIX (2026-10-07): `getLaborProfilesList`
  // enriches each LaborProfile row with `latestJob` (CandidateSubmission.project),
  // `applicationCount` (CandidateSubmission list), `handler`
  // (LaborProfileHandlingAssignment.assigneeUser), and `intakeSource`
  // (LaborProfileIntake). The 5 new entries below select `project` (RLS-covered
  // via `hrp_project_visible_for`) to expose the latest-job name in the
  // LaborProfile list view. All paths run under `withDbContext` for the
  // LaborProfile caller, so RLS chain already filtered.
  'src/domains/talent/labor-profile.read-service.ts:183 project',
  'src/domains/talent/labor-profile.read-service.ts:198 project',
  'src/domains/talent/labor-profile.read-service.ts:204 project',
  'src/domains/talent/labor-profile.read-service.ts:225 project',
  'src/domains/talent/labor-profile.read-service.ts:231 project',
] as const;

interface SourceEntry {
  readonly path: string;
  readonly source: string;
}

interface DangerField {
  readonly owner: string;
  readonly field: string;
  readonly target: string;
}

function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path) || path.includes('/__tests__/');
}

/**
 * Bỏ comment khối và comment dòng, theo đúng hai mẫu của `src/domains/job-board/public-select.static.test.ts:23`
 * (`RQ-05`, `AC-06`). Khác một điểm CÓ Ý: chỗ bị bỏ được thay bằng khoảng trắng giữ nguyên số dòng, vì
 * kết luận của tệp này là một SỐ DÒNG. Xoá thẳng như tệp kia sẽ làm mọi vị trí lệch đi.
 */
function stripComments(source: string): string {
  const keepLines = (chunk: string): string => chunk.replace(/[^\n]/g, ' ');
  return source.replace(/\/\*[\s\S]*?\*\//g, keepLines).replace(/\/\/[^\n]*/g, keepLines);
}

/** Mọi `migration.sql` dưới `prisma/migrations`, đọc bằng filesystem chứ không bằng một danh sách tay. */
function readMigrationSql(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(process.cwd(), dir, entry.name, 'migration.sql');
    try {
      out.push(readFileSync(file, 'utf8'));
    } catch {
      // Một thư mục migration không có migration.sql là hợp lệ; nó chỉ không góp bảng nào.
    }
  }
  return out;
}

/**
 * Comment của SQL là `--`, không phải `//`, và `--` trong TypeScript là phép giảm nên KHÔNG được dùng
 * chung một hàm. Tách riêng để một `ALTER TABLE` đã bị comment trong migration không bị tính là một bảng
 * đang bật RLS.
 */
function stripSqlComments(sql: string): string {
  const keepLines = (chunk: string): string => chunk.replace(/[^\n]/g, ' ');
  return sql.replace(/\/\*[\s\S]*?\*\//g, keepLines).replace(/--[^\n]*/g, keepLines);
}

/**
 * DETECTOR MỘT (`RQ-01`) — tập bảng bật RLS, suy từ chính văn bản migration. Nhận nguồn qua tham số nên
 * cùng MỘT logic chấm cả migration thật lẫn chuỗi giả của fixture âm: không có bản thứ hai để lệch nhau.
 */
function rlsTablesFrom(sqlTexts: readonly string[]): Set<string> {
  const tables = new Set<string>();
  const re = /ALTER\s+TABLE\s+(?:ONLY\s+)?"?(?:public"?\.)?"?(\w+)"?\s+(?:ENABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY/gi;
  for (const sql of sqlTexts) {
    for (const m of stripSqlComments(sql).matchAll(re)) tables.add(m[1]);
  }
  return tables;
}


/** Model của `schema.prisma` cùng tên bảng vật lý của nó, suy từ `@@map` khi có. */
function parseModels(schema: string): Map<string, { table: string; body: string }> {
  const models = new Map<string, { table: string; body: string }>();
  for (const m of stripComments(schema).matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const body = m[2];
    const mapped = /@@map\("([^"]+)"\)/.exec(body);
    models.set(m[1], { table: mapped ? mapped[1] : m[1], body });
  }
  return models;
}

/**
 * DETECTOR HAI (`RQ-02`) — trường quan hệ BẮT BUỘC (không dấu hỏi, không mảng) mà bảng ĐÍCH nằm trong
 * tập RLS. Đây là tập nguy hiểm đúng nghĩa: nó đổi mỗi lần schema hay migration đổi.
 */
function requiredRelationFields(schema: string, rlsTables: ReadonlySet<string>): DangerField[] {
  const models = parseModels(schema);
  const out: DangerField[] = [];
  for (const [owner, def] of models) {
    for (const raw of def.body.split('\n')) {
      const m = /^(\w+)\s+(\w+)(\?)?(\[\])?\s/.exec(`${raw.trim()} `);
      if (!m) continue;
      const [, field, target, optional, list] = m;
      if (optional || list) continue;
      const targetTable = models.get(target)?.table;
      if (targetTable && rlsTables.has(targetTable)) out.push({ owner, field, target });
    }
  }
  return out;
}

/** Quét đệ quy `src/` và `app/`, trả đường dẫn dùng `/` để assertion không phụ thuộc HĐH. */
function collectSources(roots: readonly string[]): SourceEntry[] {
  const out: SourceEntry[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(rel);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || isTestFile(rel)) continue;
      out.push({ path: rel, source: readFileSync(join(process.cwd(), rel), 'utf8') });
    }
  };

  for (const root of roots) walk(root);
  return out;
}

/**
 * DETECTOR BA (`RQ-03`) — đúng hàm mà fixture âm bắn thẳng vào. Một khoá nguy hiểm được coi là một vị
 * trí khi nó xuất hiện dưới dạng khoá của object (`field: true` hay `field: {`) VÀ trong `CONTEXT_LOOKBACK`
 * dòng trước đó có một `include:`/`select:` mở ngoặc. Comment bị bỏ TRƯỚC khi đếm (`RQ-05`), nên một ví
 * dụ trong docblock không thành finding và một vị trí thật sau hai gạch chéo không thành an toàn.
 */
function selectHits(path: string, source: string, fields: ReadonlySet<string>): string[] {
  const lines = stripComments(source).split('\n');
  const hits: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    for (const field of fields) {
      const key = new RegExp(`(^|[\\s{,])${field}\\s*:\\s*(true|\\{)`);
      if (!key.test(lines[i])) continue;
      const ctx = lines.slice(Math.max(0, i - CONTEXT_LOOKBACK), i + 1).join('\n');
      if (/\b(include|select)\s*:\s*\{/.test(ctx)) hits.push(`${path}:${i + 1} ${field}`);
    }
  }
  return hits;
}

function sweep(entries: readonly SourceEntry[], fields: ReadonlySet<string>): string[] {
  return entries.flatMap((entry) => selectHits(entry.path, entry.source, fields)).sort();
}

describe('quan hệ BẮT BUỘC trên bảng bị RLS che: tập vị trí select là một tập ĐÓNG', () => {
  const rlsTables = rlsTablesFrom(readMigrationSql(MIGRATIONS_DIR));
  const schema = readFileSync(join(process.cwd(), SCHEMA_PATH), 'utf8');
  const danger = requiredRelationFields(schema, rlsTables);
  const fields = new Set(danger.map((d) => d.field));
  const scanned = collectSources(SCAN_ROOTS);

  it('quét được cả hai cây nguồn, không phải một tập rỗng', () => {
    expect(scanned.length).toBeGreaterThanOrEqual(MIN_SCANNED_FILES);
    for (const root of SCAN_ROOTS) {
      expect(scanned.some((entry) => entry.path.startsWith(`${root}/`))).toBe(true);
    }
  });

  it('mệnh đề MỘT: tập bảng bật RLS suy từ migration, không từ một mảng literal (EV-01, AC-03)', () => {
    expect(rlsTables.size).toBeGreaterThanOrEqual(MIN_RLS_TABLES);
  });

  it('mệnh đề HAI: tập trường quan hệ bắt buộc trỏ vào bảng RLS (EV-02, AC-03)', () => {
    expect(danger.length).toBeGreaterThanOrEqual(MIN_DANGER_FIELDS);
    expect(new Set(danger.map((d) => d.owner)).size).toBeGreaterThanOrEqual(MIN_DANGER_MODELS);
    // Mỗi trường nguy hiểm phải trỏ vào một model THẬT có trong schema, không phải một tên rơi rớt.
    for (const d of danger) expect(parseModels(schema).has(d.target)).toBe(true);
  });

  it('mệnh đề BA: tập vị trí select KHỚP CHÍNH XÁC tám dòng còn lại sau STEP-06 (EV-03, AC-04)', () => {
    expect(sweep(scanned, fields)).toEqual([...EXPECTED_HITS].sort());
  });

  /**
   * `AC-04` đòi "phép quét phủ cả `src/` và `app/`, chứng minh bằng chính sự có mặt của BỐN dòng thuộc
   * `app/api/`". Danh sách của `DEC-04` chỉ có BA dòng dưới `app/api/` — `projects/route.ts:65`,
   * `vendor/orders/route.ts:44`, `vendor/submissions/route.ts:62` — và chín dòng dưới `src/`. Số đo lại
   * bằng chính `scratch/f05/usage.py` của Tier 1 cũng ra ba, nên lời văn "bốn" là một lệch của contract,
   * ghi thành finding trong `HANDOFF`.
   *
   * Sau `STEP-06`, cả BỐN dòng đã sửa đều nằm dưới `src/`, nên nhánh `app/` KHÔNG đổi (`3`) còn nhánh
   * `src/` giảm từ `9` xuống `5`. Assertion dưới đây khẳng định SỐ ĐO của lượt chạy hiện tại, không
   * khẳng định con số của lời văn, và cũng không khẳng định một phép trừ chưa chạy.
   */
  it('phép quét phủ cả app/, chứng minh bằng chính ba dòng app/api trong kết quả (AC-04)', () => {
    const hits = sweep(scanned, fields);
    expect(hits.filter((hit) => hit.startsWith('app/api/'))).toHaveLength(3);
    // Sau STEP-06 (4 dòng RỦI RO được sửa): 5 src. Sau AV2 commit e7ee2c8 (2026-09-13):
    // +4 dòng ở src/domains/staffing/job-posting-list.service.ts → 9 src. Tổng 12.
    // +4 dòng ở src/domains/crm và staffing W3 → 13 src. Tổng 16.
    // Sau AFF-04 (2026-09-23): +2 dòng (conversion.service.ts:128 laborProfile,
    // transfer.service.ts:186 worker). Tổng src = 15, tổng all = 18.
    // Sau P1-A0 STEP-04 (2026-09-24): +1 dòng (job-posting-authoring.service.ts:603
    // jobOpening). Tổng src = 16, tổng all = 19. Bốn dòng cũ của
    // job-posting-list.service.ts lệch số dòng do mở rộng DTO (125/128/191/199
    // → 136/139/218/226) — không đếm thêm, không trừ.
    // Sau P1-A1 (2026-09-25): +2 dòng ở public.service.ts (staffingOrder, project) do nguồn
    // chuyển từ Project sang JobPosting chain. Tổng src = 18, tổng all = 21.
    // Sau P1-E0 (2026-09-26): +1 dòng ở recruiter-workbench.read-service.ts:676 (laborProfile) — quan hệ
    // bắt buộc trong schema `placement_case`, cần thiết để project `fullName`/`phone`/`cccdNumber`/
    // `identityVerification`/`completeness` (§4.3 RQ-02). Chạy trong `withDbContext` nên RLS
    // `hrp_labor_profile_visible_for` đã lọc; PII được mask khi thiếu `CAN_VIEW_WORKER_SENSITIVE`.
    // Tổng src = 19, tổng all = 22.
    // Sau P1-E0 STEP-06 (2026-09-26): E0-F05 job context projection. Số dòng recruiter-workbench cũ
    // (475) đã lệch vì E0-F01/E0-F06 chèn thêm composable AND clauses + permissions param; dòng thật
    // bây giờ là 676. Thêm 3 dòng cho JobOpening → StaffingOrder → Project chain
    // (679 jobOpening, 683 staffingOrder, 685 project). Tổng src = 22, tổng all = 25.
    // Sau P1-E0 correction round-2 (2026-09-26): F-10/F-11 không thêm quan hệ, chỉ thay đổi
    // hình thức OR; line numbers shift vì code reorganization. Sweep dùng line literals nên
    // bumped 599 → 649 và 629/633/635 → 679/683/685. Tổng vẫn = 22, không đổi invariant.
    // Sau P1-F1 (2026-09-27): Thêm submissions.slot.jobOpening.staffingOrder.project chain để
    // derive placementOptions. +3 dòng (`682 jobOpening`, `686 staffingOrder`, `688 project`).
    // Plus: thêm status/serviceModelSnapshot/jobOpeningId vào placements.select làm chain
    // `placements.jobOpening.staffingOrder.project` SHIFTED 679/683/685 → 715/719/721 (line shift
    // không thêm dòng). Tổng src = 25, tổng all = 28.
    // Sau C-15 (Round-9.3 final static-integrity repair, 2026-09-29): C-12 (raw-vs-rounded
    // `computeAge`) + C-14 (boundary completion `lte`/`gt` in `buildPlacementCaseWhere`) chèn thêm
    // header comment block trên `buildPlacementCaseWhere` + a new explicit comment block on
    // `computeAge` that explains the raw-vs-display split. KHÔNG thêm quan hệ nguy hiểm; CHỈ line
    // shift cho 7 vị trí `recruiter-workbench.read-service.ts` đã có sẵn: 652→676 laborProfile,
    // 682→706 jobOpening, 686→710 staffingOrder, 688→712 project, 715→739 jobOpening, 719→743
    // staffingOrder, 721→745 project. Tập ĐÓNG vẫn = 35; sweep vẫn chính xác.
    // Sau P1-A04 correction batch 1/1 (2026-09-29): DROPPED `listUnclaimedStaffingOrders`
    // và `listMyActiveStaffingOrders` (self-claim path) → -5 dòng ở recruiter-assignment.service.ts.
    // Thêm 6 dòng mới (claimCandidateSubmission + listMaskedUnclaimedCandidatesForOrder +
    // placement.service.ts runTransition). Tổng src = 25 + 6 = 31, tổng all = 28 + 6 = 34.
    // Sau P1-A04 B-08 (2026-09-29): recruiter-placement.adapter.ts derivePlacementAnchors
    // chọn `placement.jobOpening.staffingOrderId` để compute canonical order advisory lock.
    // +1 dòng ở src/. Tổng src = 31 + 1 = 32, tổng all = 34 + 1 = 35.
    // Sau hrp-f9-hr-staff-jobposting-scope STEP-05/STEP-06 (2026-10-03): F9
    // STEP-05 extends the `include: { jobOpening: { select: { id,
    // staffingOrderId } } }` shape on FOUR additional paths in
    // `job-posting-authoring.service.ts` (updateDraftContent +
    // unpublishJobPosting + archiveJobPosting + getJobPostingForAuthoring)
    // so the scoped-recruiter re-check can derive the order anchor. The
    // pre-existing `publishJobPosting` entry shifts 787 → 955 (F9 added
    // ~168 lines of new code above it: guard re-ordering, advisory lock,
    // INSERT policies migration, NOT_FOUND envelope fix). Net +4
    // entries: 32 → 36 src hits. F9 correction batch 1/1 (2026-10-03)
    // also adds `acquireOrderAdvisoryLock` BEFORE the guard on each
    // path; the lock is re-entrant within the same transaction and does
    // not add a new lock namespace. All five selects are RLS-covered
    // (read-only; `withDbContext` sets the GUC session role; JobOpening
    // is not a recruiter-gated table on its own — the scope is the
    // order, not the opening). t1a-staffing-order-management
    // (2026-10-05): getStaffingOrderDetail + updateStaffingOrder thêm 3
    // entries (project@297, jobOpening@302, jobOpening@387); line shift
    // 153/179 → 158/184. Net +3 entries: 36 → 39 src hits.
    // CORRECTION 1/1 (2026-10-05): updateStaffingOrder re-read thêm 1
    // entry (jobOpening@459); các entries cũ line shift do thêm 2 hàm
    // mới (`acquireOrderAdvisoryLock`/`acquireSlotAdvisoryLock` helpers
    // + 2 hàm delete). Net +1 entry: 39 → 40 src hits.
    // CORRECTION 2/1 (2026-10-05): advisory lock đổi sang canonical
    // `p1a04:order:` / `p1a04:slot:` với bit-masked signature (thêm
    // `(hashtext($1)::bigint) & 9223372036854775807::bigint` so với
    // `hashtext($1::text)` cũ). Body dài hơn ⇒ line shift 6 entries
    // order.service.ts: 192/218/331/336/428/459 → 207/233/346/351/443/474.
    // Tổng entries KHÔNG đổi (40); chỉ line literals shift.
// T1A PRE-P2 PROJECT MANAGEMENT HOTFIX (2026-10-06): `getProjectForManagement`
    // thêm 1 entry mới (`project-read.service.ts:152 clientCompany`). Tổng src = 41.
    // T1B — PRE-P2 WORKER MANAGEMENT HOTFIX (2026-10-06, forward-merge tại đây): `getWorkerDetail`
    // thêm 3 entry mới (`worker.service.ts:266 laborProfile`, `:275 project`, `:283 owner`)
    // để project "Phân công dự án hiện hành" + "Quản lý / phụ trách" sections.
    // LaborProfile qua RLS `hrp_labor_profile_visible_for`; ProjectAssignment/User không
    // RLS-gated nhưng call site đã enforce worker scope (`assignedToId` / project.PM /
    // role) trước khi tới select. PII mask qua `projectWorker`. Tổng src = 44.
    // T1B-OPS PRE-P2 WORKER OPERATIONS HOTFIX (2026-10-07): thêm 6 entry mới
    // (`worker.service.ts:793 project` + 5 entry `labor-profile.read-service.ts:project`
    // cho 6 cột vận hành mới của LaborProfile). Tổng src = 50.
    expect(hits.filter((hit) => hit.startsWith('src/'))).toHaveLength(50);
  });
});

/**
 * FIXTURE ÂM (`RQ-04`, `DEC-07`). Không có khối này thì một detector luôn trả rỗng cũng xanh — đúng bài
 * học `UI_PAIRS` của `go-live-08`. Mọi chuỗi dưới đây là nguồn BỊA với tên bảng BỊA: không một dòng nào
 * của migration thật, và không một tên bảng RLS thật nào bị dán vào tệp test (`AC-02`).
 */
describe('fixture âm: ba detector phải BẮT được nguồn giả', () => {
  const FAKE_SQL = [
    'ALTER TABLE "fake_vault" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE ONLY public."fake_audit" FORCE ROW LEVEL SECURITY;',
    '-- ALTER TABLE "fake_disabled" ENABLE ROW LEVEL SECURITY;',
  ].join('\n');

  const FAKE_SCHEMA = [
    'model FakeVault {',
    '  id String @id',
    '  @@map("fake_vault")',
    '}',
    'model FakeChild {',
    '  id      String    @id',
    '  vault   FakeVault @relation(fields: [vaultId], references: [id])',
    '  spare   FakeVault? @relation("spare", fields: [spareId], references: [id])',
    '  many    FakeVault[]',
    '  @@map("fake_children")',
    '}',
  ].join('\n');

  const FAKE_HIT = ['const rows = await tx.fakeChild.findMany({', '  include: { vault: { select: { id: true } } },', '});'].join('\n');

  it('detector MỘT bắt được bảng bật RLS trong SQL giả, và bỏ dòng đã comment', () => {
    const tables = rlsTablesFrom([FAKE_SQL]);
    expect([...tables].sort()).toEqual(['fake_audit', 'fake_vault']);
  });

  it('detector HAI bắt đúng quan hệ BẮT BUỘC, bỏ quan hệ nullable và bỏ quan hệ mảng', () => {
    const found = requiredRelationFields(FAKE_SCHEMA, new Set(['fake_vault']));
    expect(found.map((d) => `${d.owner}.${d.field}`)).toEqual(['FakeChild.vault']);
  });

  it('detector HAI trả rỗng khi bảng đích KHÔNG bật RLS', () => {
    expect(requiredRelationFields(FAKE_SCHEMA, new Set(['other_table']))).toEqual([]);
  });

  it('detector BA bắt được một vị trí select quan hệ bắt buộc trong nguồn giả', () => {
    expect(selectHits('fake/child.service.ts', FAKE_HIT, new Set(['vault']))).toEqual([
      'fake/child.service.ts:2 vault',
    ]);
  });

  it('detector BA KHÔNG tính một vị trí nằm trong comment dòng, và số dòng không lệch (RQ-05)', () => {
    const commented = FAKE_HIT.split('\n')
      .map((line, i) => (i === 1 ? `// ${line}` : line))
      .join('\n');
    expect(selectHits('fake/child.service.ts', commented, new Set(['vault']))).toEqual([]);
    const shifted = `/* ${'x\n'.repeat(3)} */\n${FAKE_HIT}`;
    expect(selectHits('fake/child.service.ts', shifted, new Set(['vault']))).toEqual([
      'fake/child.service.ts:6 vault',
    ]);
  });

  it('detector BA KHÔNG tính một khoá nằm ngoài mọi object include/select', () => {
    expect(selectHits('fake/x.ts', 'const shape = { vault: true };', new Set(['vault']))).toEqual([]);
  });
});
