# TASK — hrp-v6-p1-labor-profile-schema

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-v6-p1-labor-profile-schema` |
| Work type | `SCHEMA` |
| Audit mode | `SCHEMA_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Baseline | `main @ 4758809` — schema.prisma chưa có `LaborProfile` / `LaborProfileIntake` / `EmploymentEpisode`; xác nhận bằng `git grep -nE "model (LaborProfile|LaborProfileIntake|EmploymentEpisode)" -- prisma/schema.prisma` trả rỗng |
| Current execution round | `0` |
| Current audit round | `0` |
| Updated | `2026-09-06 11:00 Asia/Bangkok` |
| Phase | `V6 Phase 1 — nền dữ liệu` |
| Nguồn quyết định | `docs/V6/v6-admin-rebuild.md` mục 11 (V6-DEC-012..027) và mục 4.6 |

## 1. Outcome

Đặt nền dữ liệu cho V6: khái niệm "người lao động" tách khỏi "ứng tuyển". Ba model MỚI, THÊM-thuần, không đổi hành vi chạy:

- `LaborProfile` — hồ sơ người lao động tối thiểu, bền, gắn 0..1 `Worker` canonical (V6-DEC-013); mọi lần ứng tuyển / quan tâm chung của cùng một người là SỰ KIỆN của hồ sơ này (V6-DEC-012). Dedup MỀM: KHÔNG `@unique` trên điện thoại / CCCD (V6-DEC-023, mục 4.4 #12).
- `LaborProfileIntake` — bản ghi mỗi lần "tạo hoặc khớp" hồ sơ theo kênh (công khai tự nộp, nhân sự nhập hộ, AFF, nhập liệu). Đây là model cho MỘT thẩm quyền tạo-hoặc-khớp dùng chung (V6-DEC-023); người nhập ≠ người giới thiệu / thụ hưởng (V6-DEC-024); có mốc hiệu lực để backfill đúng thời điểm (V6-DEC-025).
- `EmploymentEpisode` — chu kỳ làm việc dạng nửa mở [bắt đầu, kết thúc); rời rồi quay lại tạo episode MỚI, không ghi đè lịch sử (V6-DEC-014, V6-DEC-027).

Kèm MỘT móc THÊM-thuần: `CandidateSubmission.laborProfileId` nullable để ứng tuyển gắn về hồ sơ (V6-DEC-012). Hàng cũ để NULL — không backfill dữ liệu sống trong task này.

Ngoài phạm vi (KHÔNG làm ở task này, nêu rõ để chống trôi): mọi UI; mọi service / route; script backfill dữ liệu Worker đang sống (V6-DEC-025 cấm bịa Application, slice backfill là task riêng sau); nới `@unique` của `ProjectAssignment.submissionId` (mục 4.4 #14 — dời sang task đặt lịch episode ở Phase sau, xem mục 8).

## 2. Evidence

Người thực thi PHẢI nộp bằng chứng THẬT (lệnh + mã thoát + output) cho mỗi AC ở mục 6, lưu dưới `docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/`. Không nhận lời văn thay số đo. Không in giá trị secret / connection string / PII.

- Kiểm schema tĩnh (OFFLINE, không chạm DB): `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`.
- Chứng minh THÊM-thuần bằng so hai datamodel OFFLINE: `git show HEAD:prisma/schema.prisma > baseline-head.prisma` rồi `npx prisma migrate diff --from-schema-datamodel baseline-head.prisma --to-schema-datamodel prisma/schema.prisma --script` — SQL sinh ra chỉ được có `CREATE TABLE` / `ADD COLUMN`, KHÔNG được có `DROP`.
- Phạm vi: `git status --porcelain` và `git diff --cached --name-only`.
- CẤM chạy `prisma migrate dev` / `migrate deploy` / `migrate status` trên bất kỳ DB sống nào; áp policy RLS lên live là hành động OP của sếp.

## 3. Decisions

Mọi quyết định dưới đây là "Chốt" trong `docs/V6/v6-admin-rebuild.md` mục 11 — người thực thi KHÔNG mở lại, chỉ hiện thực.

- `DEC-012` — LaborProfile là thực thể trung tâm; Application và Quan-tâm-chung là SỰ KIỆN của nó. Hiện thực: `CandidateSubmission.laborProfileId` nullable trỏ về `LaborProfile`.
- `DEC-013` — một LaborProfile ↔ tối đa MỘT Worker canonical; người quay lại KHÔNG tạo Worker mới. Hiện thực: `LaborProfile.workerId String? @unique` (một-một tuỳ chọn hai chiều) + back-relation `Worker.laborProfile`.
- `DEC-014` — rời rồi quay lại ⇒ EmploymentEpisode MỚI; đổi việc khi đang làm ⇒ Assignment mới trong CÙNG episode; không ghi đè lịch sử. Hiện thực: model `EmploymentEpisode` khoảng nửa mở; việc GẮN `ProjectAssignment` vào episode là task Phase sau (mục 8).
- `DEC-022` / `DEC-023` — nhân sự được tạo LaborProfile trực tiếp; công khai và nhân sự-nhập-hộ DÙNG CHUNG một thẩm quyền tạo-hoặc-khớp, KHÔNG có hồ bơi worker song song. Hiện thực: model `LaborProfileIntake` có cột `channel`; thẩm quyền là code Phase sau, task này chỉ đặt MODEL.
- `DEC-024` — `createdBy` / `updatedBy` ≠ người giới thiệu / xử lý / thụ hưởng. Hiện thực: `LaborProfileIntake.capturedByUserId` chỉ ghi người nhập liệu, tách khỏi trường AFF.
- `DEC-025` — backfill người thật qua Intake + Worker/Episode/Assignment ở thời điểm hiệu lực; CẤM bịa Application. Hiện thực: `LaborProfileIntake.effectiveAt` cho backfill; script backfill là task riêng, KHÔNG nằm ở đây.
- `DEC-026` — độ đầy đủ (completeness) và mức xác minh (verification) là HAI trạng thái độc lập. Hiện thực: `LaborProfile.completeness` và `LaborProfile.identityVerification` là hai cột riêng.
- `DEC-023` (mục 4.4 #12) — LaborProfile KHÔNG lặp `@unique` điện thoại; dedup là MỀM. Hiện thực: `normalizedPhone` / `cccdNumber` chỉ có `@@index`, KHÔNG `@unique`.
- Vựng từ (mục 4.4 #19) — "Application" đã thuộc về `CandidateSubmission` + `ApplicationStatusHistory`; task này KHÔNG tạo model / enum tên `Application`.
- RLS (bài học `hrp-live-rls-drift-15-tables`) — thêm bảng vào DB có FORCE RLS mà thiếu policy là P0 tiềm ẩn (rò hoặc DENY-ALL). Ba bảng mới đều là dữ liệu NỘI BỘ, KHÔNG đọc công khai ⇒ task giao MỘT migration RLS forward-only bật RLS + policy phạm vi nhân sự, KHÔNG có policy cho `anon`/công khai. Áp lên live là OP của sếp; TUYỆT ĐỐI không chạy lại sáu migration RLS cũ.

## 4. Contract

### 4.1 Scope cho phép (chỉ được stage các path này)
- `prisma/schema.prisma`
- `prisma/migrations/**` (migration THÊM-thuần + migration RLS forward-only)
- `docs/tasks/hrp-v6-p1-labor-profile-schema/**` (HANDOFF.md, evidence/)

### 4.2 CẤM chạm
- `src/**`, `app/**`, `tests/**`, mọi UI / service / route / test hiện có.
- `src/domains/job-board/public.service.ts`, `src/domains/job-board/public-card-truth.test.ts` (bề mặt công khai — Phase khác lo).
- `@unique` / cột hiện có của bất kỳ model cũ nào (chỉ THÊM cột nullable và model mới).
- `.env`, `package.json`, `vitest.config.ts`, `tsconfig.json`, `.gitignore`, script gate.
- CẤM `git add -A` / `git add .`; CẤM commit / push / merge; CẤM migrate/seed/destructive trên DB sống (`R-01`).

### 4.3 Đặc tả model (THÊM-thuần, id `String @id @default(uuid())`, snake_case qua `@map`/`@@map`)

`LaborProfile` → `@@map("labor_profiles")`:
- `fullName String?`; `normalizedPhone String?` (chỉ `@@index`, KHÔNG `@unique`); `phone String?`; `cccdNumber String?` (nhạy cảm; chỉ `@@index`, KHÔNG `@unique`).
- `identityVerification String @default("UNVERIFIED")`; `completeness String @default("MINIMAL")` (hai trạng thái độc lập theo `DEC-026`).
- `consentAt DateTime?`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`.
- `workerId String? @unique` + relation `worker Worker?` (0..1 theo `DEC-013`).
- back-relations: `submissions CandidateSubmission[]`, `intakes LaborProfileIntake[]`, `episodes EmploymentEpisode[]`.

`LaborProfileIntake` → `@@map("labor_profile_intakes")`:
- `laborProfileId String` + relation `laborProfile LaborProfile`; `@@index([laborProfileId])`.
- `channel String` (PUBLIC_SELF / STAFF_ASSISTED / AFF / IMPORT theo `DEC-023`/`DEC-025`).
- `sourceSubmissionId String?`; `capturedByUserId String?` (chỉ người nhập, `DEC-024`).
- `consentAt DateTime?`; `effectiveAt DateTime?` (`DEC-025`); `note String?`; `createdAt DateTime @default(now())`.

`EmploymentEpisode` → `@@map("employment_episodes")`:
- `laborProfileId String` + relation; `workerId String?` + relation `worker Worker?`; `@@index([laborProfileId])`.
- `status String @default("ACTIVE")` (ACTIVE / ENDED); `startedAt DateTime`; `endedAt DateTime?` (nửa mở); `endReason String?`; `createdAt DateTime @default(now())`.

Móc trên model cũ (THÊM-thuần): `CandidateSubmission.laborProfileId String?` + relation + `@@index`; `Worker.laborProfile LaborProfile?` (back-relation, KHÔNG thêm cột).

### 4.4 Luật migration
- Migration schema THÊM-thuần: chỉ `CREATE TABLE` ba bảng mới + `ADD COLUMN labor_profile_id` nullable trên `candidate_submissions`. KHÔNG `DROP`, KHÔNG đổi cột/constraint cũ.
- Migration RLS forward-only RIÊNG: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` cho ba bảng mới, policy phạm vi nhân sự theo GUC `app.role` như bảng `workers`; KHÔNG policy `anon`/công khai. KHÔNG `CREATE OR REPLACE` hàm cũ, KHÔNG đụng sáu migration RLS cũ.

## 5. Execution Plan

- `STEP-01` — Thêm ba model `LaborProfile` / `LaborProfileIntake` / `EmploymentEpisode` vào `prisma/schema.prisma` theo mục 4.3, kèm back-relation `Worker.laborProfile`. Không tạo model / enum tên `Application`.
- `STEP-02` — Thêm móc THÊM-thuần `CandidateSubmission.laborProfileId String?` + relation về `LaborProfile` + `@@index`. Hàng cũ để NULL.
- `STEP-03` — Sinh migration THÊM-thuần dưới `prisma/migrations/`; chứng minh không phá bằng so datamodel OFFLINE (`git show HEAD:prisma/schema.prisma > baseline-head.prisma` rồi `npx prisma migrate diff --from-schema-datamodel baseline-head.prisma --to-schema-datamodel prisma/schema.prisma --script`), khẳng định SQL không có `DROP`.
- `STEP-04` — Viết migration RLS forward-only riêng bật + FORCE RLS cho ba bảng mới, policy phạm vi nhân sự, không policy công khai; không đụng migration RLS cũ.
- `STEP-05` — Chạy `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit` (OFFLINE) và đóng phạm vi bằng `git status --porcelain` + `git diff --cached --name-only`. Viết HANDOFF.md, KHÔNG commit/push.

### 5.1 Traceability RQ → STEP → AC

| RQ | STEP | AC |
|----|------|-----|
| RQ-01 | STEP-01, STEP-02 | AC-01, AC-02, AC-03, AC-09 |
| RQ-02 | STEP-01, STEP-02 | AC-01 |
| RQ-03 | STEP-01, STEP-02 | AC-01, AC-04 |
| RQ-04 | STEP-02 | AC-05 |
| RQ-05 | STEP-03 | AC-06 |
| RQ-06 | STEP-04 | AC-07 |
| RQ-07 | STEP-01 | AC-08 |
| RQ-08 | STEP-05 | AC-10 |

Diễn giải RQ (để tra cứu, ràng buộc đo ở mục 6):
- `RQ-01` LaborProfile tối thiểu, 0..1 Worker, dedup mềm, completeness ≠ verification.
- `RQ-02` LaborProfileIntake ghi kênh + đồng ý + mốc hiệu lực (model của thẩm quyền dùng chung).
- `RQ-03` EmploymentEpisode nửa mở, quay lại tạo episode mới.
- `RQ-04` CandidateSubmission gắn về LaborProfile qua cột nullable, backfill-safe.
- `RQ-05` migration THÊM-thuần, không phá cột / constraint cũ.
- `RQ-06` migration RLS forward-only cho ba bảng, không rò công khai.
- `RQ-07` khoá vựng từ "Application" (không tạo model trùng).
- `RQ-08` đóng phạm vi đúng ba nhóm path cho phép.

## 6. Acceptance

Mỗi hàng đo bằng LỆNH thật; tất cả OFFLINE (không chạm DB). Ô "Phương pháp" không dùng ký tự ống để khỏi vỡ cột — các lệnh cách nhau bằng dấu chấm phẩy.

| AC | RQ | Điều kiện | Phương pháp đo | Bằng chứng | Chặn? |
|----|----|-----------|----------------|------------|-------|
| `AC-01` | `RQ-01` | Ba model `LaborProfile`, `LaborProfileIntake`, `EmploymentEpisode` tồn tại với trường ở mục 4.3 và schema hợp lệ | `npx prisma validate` exit 0 ; `git grep -n "model LaborProfile" -- prisma/schema.prisma` (khớp cả `LaborProfileIntake`) ; `git grep -n "model EmploymentEpisode" -- prisma/schema.prisma` | stdout `prisma validate` + ba dòng grep, lưu `evidence/ac01-models.txt` | Yes |
| `AC-02` | `RQ-01` | `LaborProfile` KHÔNG có `@unique` trên `normalizedPhone` / `phone` / `cccdNumber` (dedup mềm) | `git grep -n "@unique" -- prisma/schema.prisma` ; đọc khối `labor_profiles` xác nhận `@unique` chỉ nằm trên `workerId` | grep output + đối chiếu khối model, `evidence/ac02-soft-dedup.txt` | Yes |
| `AC-03` | `RQ-01` | `LaborProfile.workerId` là `String? @unique` (0..1) và có back-relation `Worker.laborProfile` | `git grep -n "workerId String? @unique" -- prisma/schema.prisma` ; `git grep -n "laborProfile LaborProfile?" -- prisma/schema.prisma` | hai dòng grep, `evidence/ac03-worker-link.txt` | Yes |
| `AC-04` | `RQ-03` | `EmploymentEpisode` có `startedAt DateTime` + `endedAt DateTime?` (nửa mở) + `status` (ACTIVE / ENDED) | `git grep -n "startedAt DateTime" -- prisma/schema.prisma` ; `git grep -n "endedAt DateTime?" -- prisma/schema.prisma` | grep output, `evidence/ac04-episode.txt` | Yes |
| `AC-05` | `RQ-04` | `CandidateSubmission` CHỈ thêm `laborProfileId` nullable + relation + index; không xoá trường cũ | `git diff --cached -- prisma/schema.prisma` ; đọc phần `candidate_submissions` chỉ có dòng thêm (đầu `+`), không có dòng `-` xoá trường cũ | diff `--cached`, `evidence/ac05-submission-hook.txt` | Yes |
| `AC-06` | `RQ-05` | Migration THÊM-thuần: SQL sinh ra không có `DROP` | `git show HEAD:prisma/schema.prisma > baseline-head.prisma` ; `npx prisma migrate diff --from-schema-datamodel baseline-head.prisma --to-schema-datamodel prisma/schema.prisma --script` ; `Select-String -Pattern "DROP" -CaseSensitive` trên output trả 0 dòng | SQL diff + kết quả `Select-String` rỗng, `evidence/ac06-additive.txt` | Yes |
| `AC-07` | `RQ-06` | Migration RLS forward-only bật + FORCE RLS ba bảng, có `CREATE POLICY` nhân sự, KHÔNG policy công khai | `Select-String -Pattern "ROW LEVEL SECURITY" -Path prisma/migrations/*rls*/migration.sql` ; `Select-String -Pattern "CREATE POLICY" -Path prisma/migrations/*rls*/migration.sql` ; `Select-String -Pattern "TO PUBLIC" -Path prisma/migrations/*rls*/migration.sql` trả rỗng ; `Select-String -Pattern "anon" -Path prisma/migrations/*rls*/migration.sql` trả rỗng | nội dung file RLS, `evidence/ac07-rls.txt` | Yes |
| `AC-08` | `RQ-07` | Không có model / enum tên `Application`; `CandidateSubmission` còn nguyên là thực thể ứng tuyển | `git grep -nE "^model Application" -- prisma/schema.prisma` trả rỗng (exit 1) ; `git grep -nE "^enum Application" -- prisma/schema.prisma` trả rỗng | hai grep rỗng + mã thoát, `evidence/ac08-vocab.txt` | Yes |
| `AC-09` | `RQ-01` | Sau `prisma generate`, client Prisma + repo typecheck sạch | `npx prisma generate` ; `npx tsc --noEmit` exit 0 | stdout + mã thoát, `evidence/ac09-typecheck.txt` | Yes |
| `AC-10` | `RQ-08` | Tập stage CHỈ gồm `prisma/schema.prisma`, `prisma/migrations/**`, `docs/tasks/hrp-v6-p1-labor-profile-schema/**` | `git status --porcelain` ; `git diff --cached --name-only` — mọi path đều thuộc scope mục 4.1 | hai danh sách file, `evidence/ac10-scope.txt` | Yes |

## 7. Risk và Rollback

- Đụng lane khác trên `prisma/schema.prisma`: lane AFF cũng ghi file này (V6-DEC-029 gắn `ReferralAttribution` lên `LaborProfile`). Thứ tự an toàn: Phase 1 merge TRƯỚC; điểm nhập lại là `AFF-03`/`AFF-05A`. Người thực thi KHÔNG hiện thực `ReferralAttribution` ở task này.
- RLS: bảng mới thiếu policy = rò công khai hoặc DENY-ALL im lặng. AC-07 chặn tại file migration; ÁP lên `hrp-live` là OP của sếp, KHÔNG tự chạy. Không `CREATE OR REPLACE` hàm `visible_for_*` cũ (bài học `hrp-live-rls-drift-15-tables`).
- Tệp nền `baseline-head.prisma` (dùng cho AC-06) là tạm: để dưới `evidence/` hoặc xoá sau khi đo; KHÔNG stage ở gốc repo (AC-10 sẽ bắt nếu lọt).
- Rollback: task THÊM-thuần và CHƯA áp live ⇒ hoàn tác = bỏ stage + xoá file migration mới; không dữ liệu sống nào bị đụng.

## 8. Open Questions

- Nới `@unique` của `ProjectAssignment.submissionId` (mục 4.4 #14): V6-DEC-014 buộc một submission có thể sinh nhiều assignment qua các episode. Việc nới này ĐỔI hành vi và chạm ràng buộc MP-3C ⇒ HOÃN sang task đặt lịch episode/assignment ở Phase sau, KHÔNG làm ở đây. Task này chỉ đặt `EmploymentEpisode` đứng riêng.
- Backfill Worker đang sống vào LaborProfile (V6-DEC-025): là slice riêng cần bản đồ thời điểm hiệu lực; KHÔNG nằm trong hợp đồng này (hàng cũ để `laborProfileId` NULL).
- Tập giá trị cụ thể của `completeness` và `identityVerification`: code Phase sau chốt; task này chỉ cần cột `String` + default, giữ hai trạng thái độc lập (V6-DEC-026).

## 9. Planner Resolution

Phát hành `v1.0` ngày 06/09. Chưa có execution round hay audit round nào chạy (`Current audit round` = `0`), nên chưa có finding nào để resolve; cửa sổ chỉnh spec còn MỞ. Hợp đồng này giao qua roadmap `docs/V6/v6-roadmap.html` (thẻ Phase 1). Khi Tier 3 audit xong, phần resolve ghi vào đây.

## 10. Revision Log

| Spec | Ngày | Thay đổi | Ghi chú |
|------|------|----------|---------|
| `v1.0` | `2026-09-06` | Phát hành hợp đồng V6 Phase 1: ba model `LaborProfile` / `LaborProfileIntake` / `EmploymentEpisode` THÊM-thuần + móc `CandidateSubmission.laborProfileId` + migration RLS forward-only | Mới, chưa audit; nguồn quyết định `docs/V6/v6-admin-rebuild.md` mục 11 |





